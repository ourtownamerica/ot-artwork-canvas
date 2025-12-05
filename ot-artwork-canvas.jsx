import { useRef, useEffect } from "react"
import { Canvas } from "./dependencies/canvas-layers.js";
import FI from "./dependencies/file-input.js";

export default function OTArtCanvas({width, height, padding=25, style={}, openFileChooserOnClick=[], onBadFile=null, fillImageOnClick=[], centerImageOnClick=[], onChange=null}){
	if(!openFileChooserOnClick.forEach) openFileChooserOnClick = [openFileChooserOnClick];
	if(!fillImageOnClick.forEach) fillImageOnClick = [fillImageOnClick];
	if(!centerImageOnClick.forEach) centerImageOnClick = [centerImageOnClick];

	let canvasEleRef = useRef(null);

	useEffect(()=>{
		const canvasEle = canvasEleRef.current;
		if(!canvasEle) return;
		
		var canvas = new Canvas(canvasEle, {
			anchorRadius: 4,
			strokeStyle: '#ce2500',
			fillStyle: '#ce2500',
			lineWidth: 2
		});

		['layer-rotate','layer-drag','layer-resize'].forEach(evt=>canvasEle.addEventListener(evt, function(e){
			canvas.extractPortion(padding + width / 2, padding + height / 2, width, height, 0, false).then(onChange);
		}));

		const drawBorder = () => {
			canvas.ctx.save();
			const cw = canvas.canvas.width;
			const ch = canvas.canvas.height;
			const safeX = padding;
			const safeY = padding;
			const safeW = width - 2;
			const safeH = height - 2;
			canvas.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
			canvas.ctx.fillRect(0, 0, cw, safeY);
			canvas.ctx.fillRect(0, safeY + safeH, cw, ch - (safeY + safeH));
			canvas.ctx.fillRect(0, safeY, safeX, safeH);
			canvas.ctx.fillRect(safeX + safeW, safeY, cw - (safeX + safeW), safeH);
			canvas.ctx.strokeStyle = 'black';
			canvas.ctx.lineWidth = 2;
			canvas.ctx.setLineDash([4, 2]);
			canvas.ctx.strokeRect(padding, padding, width - 2, height - 2);
			canvas.ctx.restore();
		};

		let img, uri;

		let centerImg = e=>{
			e?.preventDefault();
			if(!img) return;
			canvas.removeAllLayers();
			const scale = Math.min(width / img.width, height / img.height);
			canvas.addLayer(uri, {
				width: img.width * scale,
				height: img.height * scale,
				x: padding + width / 2,
				y: padding + height / 2
			});
			canvas.extractPortion(padding + width / 2, padding + height / 2, width, height, 0, false).then(onChange);
		};

		let fillImg = e=>{
			e?.preventDefault();
			if(!img) return;
			canvas.removeAllLayers();
			canvas.addLayer(uri, {
				width, height,
				x: padding + width / 2,
				y: padding + height / 2
			});
			canvas.extractPortion(padding + width / 2, padding + height / 2, width, height, 0, false).then(onChange);
		};

		let clearSelection = (e) => {
			if (e.target !== canvas.canvas) {
				canvas.deSelectLayer();
			}
		};

		let fi = new FI({accept: ["png", "jpg"]})
			.attachToDragarea(canvas.canvas, 'ddupload-hover')
			.onFileSelect(async function(){ 
				const file = this.getFile();
				this.clearFiles();
				uri = await FI.getFileDataURI(file);
				img = new Image();
				img.onload = centerImg;
				img.src = uri;
			})
			.onBadFileDrop(()=>onBadFile?onBadFile():null);
		
		openFileChooserOnClick.forEach(btn=>fi.openOnClick(btn));
		centerImageOnClick.forEach(btn=>btn.addEventListener('click', centerImg));
		fillImageOnClick.forEach(btn=>btn.addEventListener('click', fillImg));

		drawBorder();
		canvas.canvas.addEventListener('canvas-drawn', drawBorder);
		document.addEventListener('click', clearSelection);

		return ()=>{
			canvas.canvas.removeEventListener('canvas-drawn', drawBorder);
			centerImageOnClick.forEach(btn=>btn.removeEventListener('click', centerImg));
			fillImageOnClick.forEach(btn=>btn.removeEventListener('click', fillImg));
			document.removeEventListener('click', clearSelection);
			fi.destroy();
			canvas.destroy();
		}
	}, [canvasEleRef]);

	return <canvas ref={canvasEleRef} style={style} width={width+(padding*2)} height={height+(padding*2)}></canvas>
}