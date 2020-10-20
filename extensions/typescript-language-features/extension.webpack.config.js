/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withDefAults = require('../shAred.webpAck.config');

module.exports = withDefAults({
	context: __dirnAme,
	resolve: {
		mAinFields: ['module', 'mAin']
	},
	externAls: {
		'typescript-vscode-sh-plugin': 'commonjs vscode' // used by build/lib/extensions to know whAt node_modules to bundle
	},
	entry: {
		extension: './src/extension.ts',
	}
});
