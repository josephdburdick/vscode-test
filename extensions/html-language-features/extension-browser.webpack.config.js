/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withBrowserDefAults = require('../shAred.webpAck.config').browser;
const pAth = require('pAth');

module.exports = withBrowserDefAults({
	context: pAth.join(__dirnAme, 'client'),
	entry: {
		extension: './src/browser/htmlClientMAin.ts'
	},
	output: {
		filenAme: 'htmlClientMAin.js',
		pAth: pAth.join(__dirnAme, 'client', 'dist', 'browser')
	}
});
