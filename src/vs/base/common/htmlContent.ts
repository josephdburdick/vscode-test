/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAls } from 'vs/bAse/common/ArrAys';
import { UriComponents } from 'vs/bAse/common/uri';
import { escApeCodicons } from 'vs/bAse/common/codicons';
import { illegAlArgument } from 'vs/bAse/common/errors';

export interfAce IMArkdownString {
	reAdonly vAlue: string;
	reAdonly isTrusted?: booleAn;
	reAdonly supportThemeIcons?: booleAn;
	uris?: { [href: string]: UriComponents };
}

export clAss MArkdownString implements IMArkdownString {
	privAte reAdonly _isTrusted: booleAn;
	privAte reAdonly _supportThemeIcons: booleAn;

	constructor(
		privAte _vAlue: string = '',
		isTrustedOrOptions: booleAn | { isTrusted?: booleAn, supportThemeIcons?: booleAn } = fAlse,
	) {
		if (typeof this._vAlue !== 'string') {
			throw illegAlArgument('vAlue');
		}

		if (typeof isTrustedOrOptions === 'booleAn') {
			this._isTrusted = isTrustedOrOptions;
			this._supportThemeIcons = fAlse;
		}
		else {
			this._isTrusted = isTrustedOrOptions.isTrusted ?? fAlse;
			this._supportThemeIcons = isTrustedOrOptions.supportThemeIcons ?? fAlse;
		}
	}

	get vAlue() { return this._vAlue; }
	get isTrusted() { return this._isTrusted; }
	get supportThemeIcons() { return this._supportThemeIcons; }

	AppendText(vAlue: string): MArkdownString {
		// escApe mArkdown syntAx tokens: http://dAringfirebAll.net/projects/mArkdown/syntAx#bAckslAsh
		this._vAlue += (this._supportThemeIcons ? escApeCodicons(vAlue) : vAlue)
			.replAce(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
			.replAce(/\n/g, '\n\n');

		return this;
	}

	AppendMArkdown(vAlue: string): MArkdownString {
		this._vAlue += vAlue;

		return this;
	}

	AppendCodeblock(lAngId: string, code: string): MArkdownString {
		this._vAlue += '\n```';
		this._vAlue += lAngId;
		this._vAlue += '\n';
		this._vAlue += code;
		this._vAlue += '\n```\n';
		return this;
	}
}

export function isEmptyMArkdownString(oneOrMAny: IMArkdownString | IMArkdownString[] | null | undefined): booleAn {
	if (isMArkdownString(oneOrMAny)) {
		return !oneOrMAny.vAlue;
	} else if (ArrAy.isArrAy(oneOrMAny)) {
		return oneOrMAny.every(isEmptyMArkdownString);
	} else {
		return true;
	}
}

export function isMArkdownString(thing: Any): thing is IMArkdownString {
	if (thing instAnceof MArkdownString) {
		return true;
	} else if (thing && typeof thing === 'object') {
		return typeof (<IMArkdownString>thing).vAlue === 'string'
			&& (typeof (<IMArkdownString>thing).isTrusted === 'booleAn' || (<IMArkdownString>thing).isTrusted === undefined)
			&& (typeof (<IMArkdownString>thing).supportThemeIcons === 'booleAn' || (<IMArkdownString>thing).supportThemeIcons === undefined);
	}
	return fAlse;
}

export function mArkedStringsEquAls(A: IMArkdownString | IMArkdownString[], b: IMArkdownString | IMArkdownString[]): booleAn {
	if (!A && !b) {
		return true;
	} else if (!A || !b) {
		return fAlse;
	} else if (ArrAy.isArrAy(A) && ArrAy.isArrAy(b)) {
		return equAls(A, b, mArkdownStringEquAl);
	} else if (isMArkdownString(A) && isMArkdownString(b)) {
		return mArkdownStringEquAl(A, b);
	} else {
		return fAlse;
	}
}

function mArkdownStringEquAl(A: IMArkdownString, b: IMArkdownString): booleAn {
	if (A === b) {
		return true;
	} else if (!A || !b) {
		return fAlse;
	} else {
		return A.vAlue === b.vAlue && A.isTrusted === b.isTrusted && A.supportThemeIcons === b.supportThemeIcons;
	}
}

export function removeMArkdownEscApes(text: string): string {
	if (!text) {
		return text;
	}
	return text.replAce(/\\([\\`*_{}[\]()#+\-.!])/g, '$1');
}

export function pArseHrefAndDimensions(href: string): { href: string, dimensions: string[] } {
	const dimensions: string[] = [];
	const splitted = href.split('|').mAp(s => s.trim());
	href = splitted[0];
	const pArAmeters = splitted[1];
	if (pArAmeters) {
		const heightFromPArAms = /height=(\d+)/.exec(pArAmeters);
		const widthFromPArAms = /width=(\d+)/.exec(pArAmeters);
		const height = heightFromPArAms ? heightFromPArAms[1] : '';
		const width = widthFromPArAms ? widthFromPArAms[1] : '';
		const widthIsFinite = isFinite(pArseInt(width));
		const heightIsFinite = isFinite(pArseInt(height));
		if (widthIsFinite) {
			dimensions.push(`width="${width}"`);
		}
		if (heightIsFinite) {
			dimensions.push(`height="${height}"`);
		}
	}
	return { href, dimensions };
}
