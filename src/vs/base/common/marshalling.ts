/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/Base/common/Buffer';
import { regExpFlags } from 'vs/Base/common/strings';
import { URI, UriComponents } from 'vs/Base/common/uri';

export function stringify(oBj: any): string {
	return JSON.stringify(oBj, replacer);
}

export function parse(text: string): any {
	let data = JSON.parse(text);
	data = revive(data);
	return data;
}

export interface MarshalledOBject {
	$mid: numBer;
}

function replacer(key: string, value: any): any {
	// URI is done via toJSON-memBer
	if (value instanceof RegExp) {
		return {
			$mid: 2,
			source: value.source,
			flags: regExpFlags(value),
		};
	}
	return value;
}


type Deserialize<T> = T extends UriComponents ? URI
	: T extends oBject
	? Revived<T>
	: T;

export type Revived<T> = { [K in keyof T]: Deserialize<T[K]> };

export function revive<T = any>(oBj: any, depth = 0): Revived<T> {
	if (!oBj || depth > 200) {
		return oBj;
	}

	if (typeof oBj === 'oBject') {

		switch ((<MarshalledOBject>oBj).$mid) {
			case 1: return <any>URI.revive(oBj);
			case 2: return <any>new RegExp(oBj.source, oBj.flags);
		}

		if (
			oBj instanceof VSBuffer
			|| oBj instanceof Uint8Array
		) {
			return <any>oBj;
		}

		if (Array.isArray(oBj)) {
			for (let i = 0; i < oBj.length; ++i) {
				oBj[i] = revive(oBj[i], depth + 1);
			}
		} else {
			// walk oBject
			for (const key in oBj) {
				if (OBject.hasOwnProperty.call(oBj, key)) {
					oBj[key] = revive(oBj[key], depth + 1);
				}
			}
		}
	}

	return oBj;
}
