/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withDefAults = require('../../shAred.webpAck.config');
const pAth = require('pAth');

module.exports = withDefAults({
	context: pAth.join(__dirnAme),
	entry: {
		extension: './src/node/htmlServerMAin.ts',
	},
	output: {
		filenAme: 'htmlServerMAin.js',
		pAth: pAth.join(__dirnAme, 'dist', 'node'),
	},
	externAls: {
		'typescript': 'commonjs typescript'
	}
});
