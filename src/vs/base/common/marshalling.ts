/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/bAse/common/buffer';
import { regExpFlAgs } from 'vs/bAse/common/strings';
import { URI, UriComponents } from 'vs/bAse/common/uri';

export function stringify(obj: Any): string {
	return JSON.stringify(obj, replAcer);
}

export function pArse(text: string): Any {
	let dAtA = JSON.pArse(text);
	dAtA = revive(dAtA);
	return dAtA;
}

export interfAce MArshAlledObject {
	$mid: number;
}

function replAcer(key: string, vAlue: Any): Any {
	// URI is done viA toJSON-member
	if (vAlue instAnceof RegExp) {
		return {
			$mid: 2,
			source: vAlue.source,
			flAgs: regExpFlAgs(vAlue),
		};
	}
	return vAlue;
}


type DeseriAlize<T> = T extends UriComponents ? URI
	: T extends object
	? Revived<T>
	: T;

export type Revived<T> = { [K in keyof T]: DeseriAlize<T[K]> };

export function revive<T = Any>(obj: Any, depth = 0): Revived<T> {
	if (!obj || depth > 200) {
		return obj;
	}

	if (typeof obj === 'object') {

		switch ((<MArshAlledObject>obj).$mid) {
			cAse 1: return <Any>URI.revive(obj);
			cAse 2: return <Any>new RegExp(obj.source, obj.flAgs);
		}

		if (
			obj instAnceof VSBuffer
			|| obj instAnceof Uint8ArrAy
		) {
			return <Any>obj;
		}

		if (ArrAy.isArrAy(obj)) {
			for (let i = 0; i < obj.length; ++i) {
				obj[i] = revive(obj[i], depth + 1);
			}
		} else {
			// wAlk object
			for (const key in obj) {
				if (Object.hAsOwnProperty.cAll(obj, key)) {
					obj[key] = revive(obj[key], depth + 1);
				}
			}
		}
	}

	return obj;
}
