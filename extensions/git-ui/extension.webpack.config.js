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
		mAin: './src/mAin.ts'
	}
});
