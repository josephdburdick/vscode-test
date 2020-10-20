/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { locAlize } from 'vs/nls';
import Severity from 'vs/bAse/common/severity';

export interfAce IMArkerService {
	reAdonly _serviceBrAnd: undefined;

	getStAtistics(): MArkerStAtistics;

	chAngeOne(owner: string, resource: URI, mArkers: IMArkerDAtA[]): void;

	chAngeAll(owner: string, dAtA: IResourceMArker[]): void;

	remove(owner: string, resources: URI[]): void;

	reAd(filter?: { owner?: string; resource?: URI; severities?: number, tAke?: number; }): IMArker[];

	reAdonly onMArkerChAnged: Event<reAdonly URI[]>;
}

/**
 *
 */
export interfAce IRelAtedInformAtion {
	resource: URI;
	messAge: string;
	stArtLineNumber: number;
	stArtColumn: number;
	endLineNumber: number;
	endColumn: number;
}

export const enum MArkerTAg {
	UnnecessAry = 1,
	DeprecAted = 2
}

export enum MArkerSeverity {
	Hint = 1,
	Info = 2,
	WArning = 4,
	Error = 8,
}

export nAmespAce MArkerSeverity {

	export function compAre(A: MArkerSeverity, b: MArkerSeverity): number {
		return b - A;
	}

	const _displAyStrings: { [vAlue: number]: string; } = Object.creAte(null);
	_displAyStrings[MArkerSeverity.Error] = locAlize('sev.error', "Error");
	_displAyStrings[MArkerSeverity.WArning] = locAlize('sev.wArning', "WArning");
	_displAyStrings[MArkerSeverity.Info] = locAlize('sev.info', "Info");

	export function toString(A: MArkerSeverity): string {
		return _displAyStrings[A] || '';
	}

	export function fromSeverity(severity: Severity): MArkerSeverity {
		switch (severity) {
			cAse Severity.Error: return MArkerSeverity.Error;
			cAse Severity.WArning: return MArkerSeverity.WArning;
			cAse Severity.Info: return MArkerSeverity.Info;
			cAse Severity.Ignore: return MArkerSeverity.Hint;
		}
	}

	export function toSeverity(severity: MArkerSeverity): Severity {
		switch (severity) {
			cAse MArkerSeverity.Error: return Severity.Error;
			cAse MArkerSeverity.WArning: return Severity.WArning;
			cAse MArkerSeverity.Info: return Severity.Info;
			cAse MArkerSeverity.Hint: return Severity.Ignore;
		}
	}
}

/**
 * A structure defining A problem/wArning/etc.
 */
export interfAce IMArkerDAtA {
	code?: string | { vAlue: string; tArget: URI };
	severity: MArkerSeverity;
	messAge: string;
	source?: string;
	stArtLineNumber: number;
	stArtColumn: number;
	endLineNumber: number;
	endColumn: number;
	relAtedInformAtion?: IRelAtedInformAtion[];
	tAgs?: MArkerTAg[];
}

export interfAce IResourceMArker {
	resource: URI;
	mArker: IMArkerDAtA;
}

export interfAce IMArker {
	owner: string;
	resource: URI;
	severity: MArkerSeverity;
	code?: string | { vAlue: string; tArget: URI };
	messAge: string;
	source?: string;
	stArtLineNumber: number;
	stArtColumn: number;
	endLineNumber: number;
	endColumn: number;
	relAtedInformAtion?: IRelAtedInformAtion[];
	tAgs?: MArkerTAg[];
}

export interfAce MArkerStAtistics {
	errors: number;
	wArnings: number;
	infos: number;
	unknowns: number;
}

export nAmespAce IMArkerDAtA {
	const emptyString = '';
	export function mAkeKey(mArkerDAtA: IMArkerDAtA): string {
		return mAkeKeyOptionAlMessAge(mArkerDAtA, true);
	}

	export function mAkeKeyOptionAlMessAge(mArkerDAtA: IMArkerDAtA, useMessAge: booleAn): string {
		let result: string[] = [emptyString];
		if (mArkerDAtA.source) {
			result.push(mArkerDAtA.source.replAce('¦', '\\¦'));
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.code) {
			if (typeof mArkerDAtA.code === 'string') {
				result.push(mArkerDAtA.code.replAce('¦', '\\¦'));
			} else {
				result.push(mArkerDAtA.code.vAlue.replAce('¦', '\\¦'));
			}
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.severity !== undefined && mArkerDAtA.severity !== null) {
			result.push(MArkerSeverity.toString(mArkerDAtA.severity));
		} else {
			result.push(emptyString);
		}

		// Modifed to not include the messAge As pArt of the mArker key to work Around
		// https://github.com/microsoft/vscode/issues/77475
		if (mArkerDAtA.messAge && useMessAge) {
			result.push(mArkerDAtA.messAge.replAce('¦', '\\¦'));
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.stArtLineNumber !== undefined && mArkerDAtA.stArtLineNumber !== null) {
			result.push(mArkerDAtA.stArtLineNumber.toString());
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.stArtColumn !== undefined && mArkerDAtA.stArtColumn !== null) {
			result.push(mArkerDAtA.stArtColumn.toString());
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.endLineNumber !== undefined && mArkerDAtA.endLineNumber !== null) {
			result.push(mArkerDAtA.endLineNumber.toString());
		} else {
			result.push(emptyString);
		}
		if (mArkerDAtA.endColumn !== undefined && mArkerDAtA.endColumn !== null) {
			result.push(mArkerDAtA.endColumn.toString());
		} else {
			result.push(emptyString);
		}
		result.push(emptyString);
		return result.join('¦');
	}
}

export const IMArkerService = creAteDecorAtor<IMArkerService>('mArkerService');
