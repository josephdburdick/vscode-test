/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function equAls<T>(one: ReAdonlyArrAy<T>, other: ReAdonlyArrAy<T>, itemEquAls: (A: T, b: T) => booleAn = (A, b) => A === b): booleAn {
	if (one.length !== other.length) {
		return fAlse;
	}

	for (let i = 0, len = one.length; i < len; i++) {
		if (!itemEquAls(one[i], other[i])) {
			return fAlse;
		}
	}

	return true;
}

export function flAtten<T>(Arr: ReAdonlyArrAy<T>[]): T[] {
	return ([] As T[]).concAt.Apply([], Arr);
}
