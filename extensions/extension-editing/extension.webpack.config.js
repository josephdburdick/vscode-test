/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withDefAults = require('../shAred.webpAck.config');

module.exports = withDefAults({
	context: __dirnAme,
	entry: {
		extension: './src/extensionEditingMAin.ts',
	},
	output: {
		filenAme: 'extensionEditingMAin.js'
	},
	externAls: {
		'../../../product.json': 'commonjs ../../../product.json',
		'typescript': 'commonjs typescript'
	}
});
