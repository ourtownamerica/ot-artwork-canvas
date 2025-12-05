const path = require('path');

const config = {
    entry: './main.jsx',
    output: {
        path: path.resolve(__dirname, '..'),
        filename: 'main.js'
    },
	mode: "development", // "production" or "development"
	module: {
		rules: [{
			test: /\.jsx?$/,
			exclude: [/node_modules/],
			use: {
				loader: "babel-loader",
				options: {
					presets: ['@babel/preset-env', ['@babel/preset-react', { "runtime": "automatic" }]]
				}
			}
		}]
	}
};

module.exports = config;
