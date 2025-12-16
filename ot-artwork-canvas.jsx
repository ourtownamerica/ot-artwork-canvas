import { useRef, useEffect, useState } from "react";
import { Canvas } from "./dependencies/canvas-layers.js";
import FI from "./dependencies/file-input.js";

export default function OTArtCanvas({
	width,
	height,
	padding = 25,
	style = {},
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

	// Keep latest callbacks without re-running init
	useEffect(()=>{
		onChangeRef.current = onChange;
	}, [onChange]);

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

	// INIT ONCE
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

			canvas.ctx.strokeStyle = "black";
			canvas.ctx.lineWidth = 2;
			canvas.ctx.setLineDash([4, 2]);
			canvas.ctx.strokeRect(padding, padding, width - 2, height - 2);
			canvas.ctx.restore();

			// Save latest layer pos (use activeLayer if present)
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

		// Save pos frequently during manipulation (better than drawBorder)
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

		// Expose handlers for binding effect
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

	// Re-add layer on mount / when saved state changes
	useEffect(()=>{
		let canvas = canvasRef.current;
		if(!aliveRef.current) return;
		if(!canvas || !canvas.canvas) return;
		if(!layerUri) return;

		// Keep uriRef/imgRef synced
		uriRef.current = layerUri;

		if(!imgRef.current || imgRef.current.src !== layerUri){
			let img = new Image();
			imgRef.current = img;
			img.onload = ()=>{
				if(!aliveRef.current) return;
				if(layerPos){
					canvas.addLayer(layerUri, layerPos);
				}else{
					canvasRef.current?._centerImg?.();
				}
			};
			img.src = layerUri;
			return;
		}

		if(layerPos){
			canvas.addLayer(layerUri, layerPos);
		}else{
			canvasRef.current?._centerImg?.();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layerUri]); // runs when you setLayerUri (upload)

	// Bind external controls WITHOUT reinitializing Canvas
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
