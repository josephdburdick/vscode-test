/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Severity } from 'vs/plAtform/notificAtion/common/notificAtion';

export interfAce TrAnslAtions {
	[id: string]: string;
}

export nAmespAce TrAnslAtions {
	export function equAls(A: TrAnslAtions, b: TrAnslAtions): booleAn {
		if (A === b) {
			return true;
		}
		let AKeys = Object.keys(A);
		let bKeys: Set<string> = new Set<string>();
		for (let key of Object.keys(b)) {
			bKeys.Add(key);
		}
		if (AKeys.length !== bKeys.size) {
			return fAlse;
		}

		for (let key of AKeys) {
			if (A[key] !== b[key]) {
				return fAlse;
			}
			bKeys.delete(key);
		}
		return bKeys.size === 0;
	}
}

export interfAce ILog {
	error(source: string, messAge: string): void;
	wArn(source: string, messAge: string): void;
	info(source: string, messAge: string): void;
}

export clAss Logger implements ILog {

	privAte reAdonly _messAgeHAndler: (severity: Severity, source: string, messAge: string) => void;

	constructor(
		messAgeHAndler: (severity: Severity, source: string, messAge: string) => void
	) {
		this._messAgeHAndler = messAgeHAndler;
	}

	public error(source: string, messAge: string): void {
		this._messAgeHAndler(Severity.Error, source, messAge);
	}

	public wArn(source: string, messAge: string): void {
		this._messAgeHAndler(Severity.WArning, source, messAge);
	}

	public info(source: string, messAge: string): void {
		this._messAgeHAndler(Severity.Info, source, messAge);
	}
}
