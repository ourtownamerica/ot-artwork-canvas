import { useRef, useEffect, useState } from "react";
import { Canvas } from "./dependencies/canvas-layers.js";
import FI from "./dependencies/file-input.js";

export default function OTArtCanvas({
	width,
	height,
	padding = 25,
	style = {},
	imgDataUri = null,
	openFileChooserOnClick = null,
	onBadFile = null,
	fillImageOnClick = null,
	centerImageOnClick = null,
	onChange = null
}){
	let canvasEleRef = useRef(null);

	let canvasRef = useRef(null);
	let fiRef = useRef(null);
	let imgRef = useRef(null);
	let uriRef = useRef(null);
	let aliveRef = useRef(false);

	let onChangeRef = useRef(onChange);
	let onBadFileRef = useRef(onBadFile);

	let [layerUri, setLayerUri] = useState(null);
	let [layerPos, setLayerPos] = useState(null);

	// Keeps the latest onChange callback in a ref so Canvas event handlers always call the newest function without re-initializing the Canvas instance.
	useEffect(()=>{
		onChangeRef.current = onChange;
	}, [onChange]);

	// Keeps the latest onBadFile callback in a ref so the FI handler always calls the newest function without re-initializing the Canvas instance.
	useEffect(()=>{
		onBadFileRef.current = onBadFile;
	}, [onBadFile]);

	// Helper: safe extract -> onChange
	let emitExtract = () => {
		let canvas = canvasRef.current;
		if(!aliveRef.current) return;
		if(!canvas || !canvas.canvas) return;

		// Don’t extract until images exist
		for(let i=0; i<canvas.layers.length; i++){
			if(!canvas.layers[i].image) return;
		}

		canvas.extractPortion(padding + width / 2, padding + height / 2, width, height, 0, false)
			.then((duri)=>{
				if(!aliveRef.current) return;
				if(typeof onChangeRef.current === "function"){
					onChangeRef.current(duri);
				}
			});
	};

	// Initializes the Canvas + FI instances once, wires up internal canvas event listeners, border overlay drawing, drag/drop upload, and cleans everything up on unmount.
	useEffect(()=>{
		aliveRef.current = true;

		const canvasEle = canvasEleRef.current;
		if(!canvasEle) return;

		let canvas = new Canvas(canvasEle, {
			anchorRadius: 4,
			strokeStyle: "#ce2500",
			fillStyle: "#ce2500",
			lineWidth: 2
		});
		canvasRef.current = canvas;

		let debouncer = null;

		const drawBorder = () => {
			canvas.ctx.save();
			const cw = canvas.canvas.width;
			const ch = canvas.canvas.height;
			const safeX = padding;
			const safeY = padding;
			const safeW = width - 2;
			const safeH = height - 2;

			canvas.ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
			canvas.ctx.fillRect(0, 0, cw, safeY);
			canvas.ctx.fillRect(0, safeY + safeH, cw, ch - (safeY + safeH));
			canvas.ctx.fillRect(0, safeY, safeX, safeH);
			canvas.ctx.fillRect(safeX + safeW, safeY, cw - (safeX + safeW), safeH);

			// Scale line width so it renders as ~2 CSS pixels even if the canvas is CSS-scaled (max-width: 100%, etc.)
			const rect = canvas.canvas.getBoundingClientRect();
			const sx = canvas.canvas.width / rect.width;
			const linePx = 2;
			canvas.ctx.lineWidth = linePx * sx;
			const dashOn = 4 * sx;
			const dashOff = 2 * sx;
			canvas.ctx.setLineDash([dashOn, dashOff]);

			canvas.ctx.strokeStyle = "black";
			canvas.ctx.strokeRect(padding, padding, width - 2, height - 2);
			canvas.ctx.restore();

			// Save latest layer pos (use activeLayer if present) with a short debounce
			let layer = canvas.activeLayer || canvas.layers[0];
			if(layer){
				if(debouncer) clearTimeout(debouncer);
				debouncer = setTimeout(()=>{
					if(!aliveRef.current) return;
					setLayerPos({
						width: layer.width,
						height: layer.height,
						x: layer.x,
						y: layer.y,
						rotation: layer.rotation
					});
				}, 250);
			}
		};

		const centerImg = (e) => {
			e?.preventDefault?.();
			if(!aliveRef.current) return;

			let img = imgRef.current;
			let uri = uriRef.current;
			if(!img || !uri) return;

			canvas.removeAllLayers();

			const scale = Math.min(width / img.width, height / img.height);
			const pos = {
				width: img.width * scale,
				height: img.height * scale,
				x: padding + width / 2,
				y: padding + height / 2
			};

			setLayerPos(pos);

			let layer = canvas.addLayer(uri, pos);

			layer.onload(()=>{
				if(!aliveRef.current) return;
				emitExtract();
			});
		};

		const fillImg = (e) => {
			e?.preventDefault?.();
			if(!aliveRef.current) return;

			let img = imgRef.current;
			let uri = uriRef.current;
			if(!img || !uri) return;

			canvas.removeAllLayers();

			const pos = {
				width,
				height,
				x: padding + width / 2,
				y: padding + height / 2
			};

			setLayerPos(pos);

			let layer = canvas.addLayer(uri, pos);

			layer.onload(()=>{
				if(!aliveRef.current) return;
				emitExtract();
			});
		};

		const clearSelection = (e) => {
			if(e.target !== canvas.canvas){
				canvas.deSelectLayer();
			}
		};

		// Persists the current layer transform to React state (so you can re-add it later) and emits an updated cropped preview.
		const onLayerChange = () => {
			let layer = canvas.activeLayer || canvas.layers[0];
			if(layer){
				setLayerPos({
					width: layer.width,
					height: layer.height,
					x: layer.x,
					y: layer.y,
					rotation: layer.rotation
				});
			}
			emitExtract();
		};

		["layer-rotate", "layer-drag", "layer-resize"].forEach((evt)=>{
			canvasEle.addEventListener(evt, onLayerChange);
		});

		let fi = new FI({ accept: ["png", "jpg"] })
			.attachToDragarea(canvas.canvas, "ddupload-hover")
			.onFileSelect(async function(){
				const file = this.getFile();
				this.clearFiles();

				const uri = await FI.getFileDataURI(file);
				if(!aliveRef.current) return;

				uriRef.current = uri;
				setLayerUri(uri);

				let img = new Image();
				imgRef.current = img;
				img.onload = centerImg;
				img.src = uri;
			})
			.onBadFileDrop(()=>{
				if(typeof onBadFileRef.current === "function"){
					onBadFileRef.current();
				}
			});

		fiRef.current = fi;

		canvas.canvas.addEventListener("canvas-drawn", drawBorder);
		document.addEventListener("click", clearSelection);

		// Expose handlers for the external button-binding effect
		canvasRef.current._centerImg = centerImg;
		canvasRef.current._fillImg = fillImg;

		drawBorder();

		return ()=>{
			aliveRef.current = false;
			if(debouncer) clearTimeout(debouncer);

			canvas.canvas.removeEventListener("canvas-drawn", drawBorder);
			document.removeEventListener("click", clearSelection);

			["layer-rotate", "layer-drag", "layer-resize"].forEach((evt)=>{
				canvasEle.removeEventListener(evt, onLayerChange);
			});

			if(imgRef.current) imgRef.current.onload = null;

			if(fiRef.current){
				fiRef.current.destroy();
				fiRef.current = null;
			}

			if(canvasRef.current){
				canvasRef.current.destroy();
				canvasRef.current = null;
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // <-- INIT ONCE

	// Preloads imgDataUri onto the canvas when the prop is provided (or changes). It loads the image to get natural dimensions, computes a centered "fit" position, stores uri+pos in state, then adds the layer and emits the cropped preview only after the layer finishes loading.
	useEffect(()=>{
		if(!imgDataUri) return;
		if(layerUri === imgDataUri) return;

		let canvas = canvasRef.current;
		if(!aliveRef.current) return;
		if(!canvas || !canvas.canvas) return;

		uriRef.current = imgDataUri;
		setLayerUri(imgDataUri);

		let img = new Image();
		imgRef.current = img;

		img.onload = ()=>{
			if(!aliveRef.current) return;

			const scale = Math.min(width / img.width, height / img.height);
			const pos = {
				width: img.width * scale,
				height: img.height * scale,
				x: padding + width / 2,
				y: padding + height / 2,
				rotation: 0
			};

			setLayerPos(pos);

			canvas.removeAllLayers();

			let layer = canvas.addLayer(imgDataUri, pos);
			layer.onload(()=>{
				if(!aliveRef.current) return;
				emitExtract();
			});
		};

		img.src = imgDataUri;

		return ()=>{
			img.onload = null;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imgDataUri]); // intentionally not depending on layerUri to avoid loop

	// Re-adds the saved image layer when layerUri changes (upload or preload). If we already have a saved position, it uses it; otherwise it falls back to centering the image. Extraction is delayed until the layer has fully loaded to avoid drawImage(null) errors.
	useEffect(()=>{
		let canvas = canvasRef.current;
		if(!aliveRef.current) return;
		if(!canvas || !canvas.canvas) return;
		if(!layerUri) return;

		uriRef.current = layerUri;

		// Ensure we have an Image() in imgRef so center/fill buttons have dimensions.
		if(!imgRef.current || imgRef.current.src !== layerUri){
			let img = new Image();
			imgRef.current = img;

			img.onload = ()=>{
				if(!aliveRef.current) return;

				// If position exists, just add it. Otherwise center it.
				if(layerPos){
					canvas.removeAllLayers();
					let layer = canvas.addLayer(layerUri, layerPos);
					layer.onload(()=>{
						if(!aliveRef.current) return;
						emitExtract();
					});
				}else{
					canvasRef.current?._centerImg?.();
				}
			};

			img.src = layerUri;
			return;
		}

		if(layerPos){
			canvas.removeAllLayers();
			let layer = canvas.addLayer(layerUri, layerPos);
			layer.onload(()=>{
				if(!aliveRef.current) return;
				emitExtract();
			});
		}else{
			canvasRef.current?._centerImg?.();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layerUri]);

	// Binds external control elements (open/center/fill) to the internal FI/canvas handlers without reinitializing the canvas; also cleans up old listeners when the refs/elements change.
	useEffect(()=>{
		let fi = fiRef.current;
		let canvas = canvasRef.current;
		if(!aliveRef.current) return;
		if(!canvas) return;

		let centerImg = canvas._centerImg;
		let fillImg = canvas._fillImg;

		if(openFileChooserOnClick?.current && fi){
			fi.openOnClick(openFileChooserOnClick.current);
		}
		if(centerImageOnClick?.current && centerImg){
			centerImageOnClick.current.addEventListener("click", centerImg);
		}
		if(fillImageOnClick?.current && fillImg){
			fillImageOnClick.current.addEventListener("click", fillImg);
		}

		return ()=>{
			if(centerImageOnClick?.current && centerImg){
				centerImageOnClick.current.removeEventListener("click", centerImg);
			}
			if(fillImageOnClick?.current && fillImg){
				fillImageOnClick.current.removeEventListener("click", fillImg);
			}
		};
	}, [openFileChooserOnClick, fillImageOnClick, centerImageOnClick]);

	return (
		<canvas
			ref={canvasEleRef}
			style={style}
			width={width + (padding * 2)}
			height={height + (padding * 2)}
		/>
	);
}
