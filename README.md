# OT Artwork Canvas

A simple component that allows the user to drag and drop a file into a canvas to ensure it's the correct size for a given print product.

##### Dependencies:

`Canvas Layers` must be version 2.1.x and `File Input` must be version 2.1.x.

- [Pamblam/file-input](https://github.com/Pamblam/file-input)
- [Pamblam/canvas-layers](https://github.com/Pamblam/canvas-layers)

##### Demo:

See the demo [here](https://ourtownamerica.github.io/ot-artwork-canvas/demo/).

##### Usage:

Just copy the `ot-artwork-canvas.jsx` file and update the paths to dependencies. 

```jsx
<OTArtCanvas 

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
```