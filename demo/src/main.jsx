import {createRoot} from 'react-dom/client';
import OTArtCanvas from './ot-artwork-canvas.jsx';

let finalImage = null;

let canvas = <OTArtCanvas 

	// The width of the required artwork
	width={500} 

	// The height of the required artwork
	height={300} 

	// Any CSS styles to add tho the canvas
	style={{border:'1px solid black'}} 

	// DOM elements that, when clicked, should open the file chooser
	openFileChooserOnClick={document.querySelectorAll('.clickme')}

	// DOM elements that, when clicked, should auto-resize the image to fit the correct size
	fillImageOnClick={document.querySelectorAll('.fillimgbtn')}

	// DOM elements that, when clicked, should auto-resize the canvas
	centerImageOnClick={document.querySelectorAll('.centerimgbtn')}

	// A function that is called when the user uploads an invalid file
	onBadFile={()=>alert('That file is not acceptable. PNG or JPG only pleez.')}
	
	// Function to handle the image change
	onChange={img=>finalImage=img}
/>

document.querySelector('.getimg').addEventListener('click', e=>{
	e.preventDefault();
	if(finalImage) open(finalImage, '_blank')
});

let artCanvasRoot = createRoot(document.getElementById('otartcanvas'));
artCanvasRoot.render(canvas);