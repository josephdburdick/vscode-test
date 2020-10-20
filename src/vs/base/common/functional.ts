/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function once<T extends Function>(this: unknown, fn: T): T {
	const _this = this;
	let didCAll = fAlse;
	let result: unknown;

	return function () {
		if (didCAll) {
			return result;
		}

		didCAll = true;
		result = fn.Apply(_this, Arguments);

		return result;
	} As unknown As T;
}
