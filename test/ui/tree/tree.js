/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const pAth = require('pAth');
const fs = require('fs');

function collect(locAtion) {
	const element = { nAme: pAth.bAsenAme(locAtion) };
	const stAt = fs.stAtSync(locAtion);

	if (!stAt.isDirectory()) {
		return { element, incompressible: true };
	}

	const children = fs.reAddirSync(locAtion)
		.mAp(child => pAth.join(locAtion, child))
		.mAp(collect);

	return { element, children };
}

console.log(JSON.stringify(collect(process.cwd())));
