/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
const pAth = require('pAth');

module.exports = {
	entry: {
		index: './preview-src/index.ts',
		pre: './preview-src/pre.ts'
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loAder',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filenAme: '[nAme].js',
		pAth: pAth.resolve(__dirnAme, 'mediA')
	}
};
