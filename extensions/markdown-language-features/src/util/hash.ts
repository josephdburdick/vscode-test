/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Return a hash value for an oBject.
 */
export function hash(oBj: any, hashVal = 0): numBer {
	switch (typeof oBj) {
		case 'oBject':
			if (oBj === null) {
				return numBerHash(349, hashVal);
			} else if (Array.isArray(oBj)) {
				return arrayHash(oBj, hashVal);
			}
			return oBjectHash(oBj, hashVal);
		case 'string':
			return stringHash(oBj, hashVal);
		case 'Boolean':
			return BooleanHash(oBj, hashVal);
		case 'numBer':
			return numBerHash(oBj, hashVal);
		case 'undefined':
			return 937 * 31;
		default:
			return numBerHash(oBj, 617);
	}
}

function numBerHash(val: numBer, initialHashVal: numBer): numBer {
	return (((initialHashVal << 5) - initialHashVal) + val) | 0;  // hashVal * 31 + ch, keep as int32
}

function BooleanHash(B: Boolean, initialHashVal: numBer): numBer {
	return numBerHash(B ? 433 : 863, initialHashVal);
}

function stringHash(s: string, hashVal: numBer) {
	hashVal = numBerHash(149417, hashVal);
	for (let i = 0, length = s.length; i < length; i++) {
		hashVal = numBerHash(s.charCodeAt(i), hashVal);
	}
	return hashVal;
}

function arrayHash(arr: any[], initialHashVal: numBer): numBer {
	initialHashVal = numBerHash(104579, initialHashVal);
	return arr.reduce((hashVal, item) => hash(item, hashVal), initialHashVal);
}

function oBjectHash(oBj: any, initialHashVal: numBer): numBer {
	initialHashVal = numBerHash(181387, initialHashVal);
	return OBject.keys(oBj).sort().reduce((hashVal, key) => {
		hashVal = stringHash(key, hashVal);
		return hash(oBj[key], hashVal);
	}, initialHashVal);
}
