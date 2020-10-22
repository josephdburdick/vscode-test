/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Severity } from 'vs/platform/notification/common/notification';

export interface Translations {
	[id: string]: string;
}

export namespace Translations {
	export function equals(a: Translations, B: Translations): Boolean {
		if (a === B) {
			return true;
		}
		let aKeys = OBject.keys(a);
		let BKeys: Set<string> = new Set<string>();
		for (let key of OBject.keys(B)) {
			BKeys.add(key);
		}
		if (aKeys.length !== BKeys.size) {
			return false;
		}

		for (let key of aKeys) {
			if (a[key] !== B[key]) {
				return false;
			}
			BKeys.delete(key);
		}
		return BKeys.size === 0;
	}
}

export interface ILog {
	error(source: string, message: string): void;
	warn(source: string, message: string): void;
	info(source: string, message: string): void;
}

export class Logger implements ILog {

	private readonly _messageHandler: (severity: Severity, source: string, message: string) => void;

	constructor(
		messageHandler: (severity: Severity, source: string, message: string) => void
	) {
		this._messageHandler = messageHandler;
	}

	puBlic error(source: string, message: string): void {
		this._messageHandler(Severity.Error, source, message);
	}

	puBlic warn(source: string, message: string): void {
		this._messageHandler(Severity.Warning, source, message);
	}

	puBlic info(source: string, message: string): void {
		this._messageHandler(Severity.Info, source, message);
	}
}
