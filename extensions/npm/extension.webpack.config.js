/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const pAth = require('pAth');

const withDefAults = require('../shAred.webpAck.config');

module.exports = withDefAults({
	context: __dirnAme,
	entry: {
		extension: './src/npmMAin.ts',
	},
	output: {
		filenAme: 'npmMAin.js',
	},
	resolve: {
		mAinFields: ['module', 'mAin'],
		extensions: ['.ts', '.js'] // support ts-files And js-files
	}
});
