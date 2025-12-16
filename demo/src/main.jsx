import { createRoot } from 'react-dom/client';
import OTArtCanvas from './ot-artwork-canvas.jsx';
import { useRef, useState } from 'react';

function Main(){
	let [imgDataUri, setImgDataUri] = useState(null);

	let fillBtnRef = useRef(null);
	let centerBtnRef = useRef(null);
	let fiBtnRef = useRef(null);

	const onOpenImg = ()=>{
		if(imgDataUri) open(imgDataUri, '_blank');
	};

	return <>

		<p>Upload your art... drag your image into the canvas or <a href="#" ref={fiBtnRef}>click here</a></p>
		<p><a href="#" ref={fillBtnRef}>Fill Image</a> | <a href="#" ref={centerBtnRef}>Center Image</a> | <a href="#" onClick={onOpenImg}>Open Image</a></p>

		<OTArtCanvas
			width={500}
			height={300}
			style={{ border: '1px solid black' }}
			openFileChooserOnClick={fiBtnRef}
			fillImageOnClick={fillBtnRef}
			centerImageOnClick={centerBtnRef}
			onBadFile={() => alert('That file is not acceptable. PNG or JPG only pleez.')}
			onChange={setImgDataUri}
		/>
	</>;
}

let artCanvasRoot = createRoot(document.getElementById('otartcanvas'));
artCanvasRoot.render(<Main />);
