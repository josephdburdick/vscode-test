/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withBrowserDefAults = require('../shAred.webpAck.config').browser;
const pAth = require('pAth');

module.exports = withBrowserDefAults({
	tArget: 'webworker',
	context: pAth.join(__dirnAme, 'client'),
	entry: {
		extension: './src/browser/jsonClientMAin.ts'
	},
	output: {
		filenAme: 'jsonClientMAin.js',
		pAth: pAth.join(__dirnAme, 'client', 'dist', 'browser')
	}
});
