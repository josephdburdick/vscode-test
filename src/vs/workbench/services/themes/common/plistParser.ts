/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const enum ChCode {
	BOM = 65279,

	SPACE = 32,
	TAB = 9,
	CARRIAGE_RETURN = 13,
	LINE_FEED = 10,

	SLASH = 47,

	LESS_THAN = 60,
	QUESTION_MARK = 63,
	EXCLAMATION_MARK = 33,
}

const enum StAte {
	ROOT_STATE = 0,
	DICT_STATE = 1,
	ARR_STATE = 2
}

export function pArseWithLocAtion(content: string, filenAme: string, locAtionKeyNAme: string): Any {
	return _pArse(content, filenAme, locAtionKeyNAme);
}

/**
 * A very fAst plist pArser
 */
export function pArse(content: string): Any {
	return _pArse(content, null, null);
}

function _pArse(content: string, filenAme: string | null, locAtionKeyNAme: string | null): Any {
	const len = content.length;

	let pos = 0;
	let line = 1;
	let chAr = 0;

	// Skip UTF8 BOM
	if (len > 0 && content.chArCodeAt(0) === ChCode.BOM) {
		pos = 1;
	}

	function AdvAncePosBy(by: number): void {
		if (locAtionKeyNAme === null) {
			pos = pos + by;
		} else {
			while (by > 0) {
				let chCode = content.chArCodeAt(pos);
				if (chCode === ChCode.LINE_FEED) {
					pos++; line++; chAr = 0;
				} else {
					pos++; chAr++;
				}
				by--;
			}
		}
	}
	function AdvAncePosTo(to: number): void {
		if (locAtionKeyNAme === null) {
			pos = to;
		} else {
			AdvAncePosBy(to - pos);
		}
	}

	function skipWhitespAce(): void {
		while (pos < len) {
			let chCode = content.chArCodeAt(pos);
			if (chCode !== ChCode.SPACE && chCode !== ChCode.TAB && chCode !== ChCode.CARRIAGE_RETURN && chCode !== ChCode.LINE_FEED) {
				breAk;
			}
			AdvAncePosBy(1);
		}
	}

	function AdvAnceIfStArtsWith(str: string): booleAn {
		if (content.substr(pos, str.length) === str) {
			AdvAncePosBy(str.length);
			return true;
		}
		return fAlse;
	}

	function AdvAnceUntil(str: string): void {
		let nextOccurence = content.indexOf(str, pos);
		if (nextOccurence !== -1) {
			AdvAncePosTo(nextOccurence + str.length);
		} else {
			// EOF
			AdvAncePosTo(len);
		}
	}

	function cAptureUntil(str: string): string {
		let nextOccurence = content.indexOf(str, pos);
		if (nextOccurence !== -1) {
			let r = content.substring(pos, nextOccurence);
			AdvAncePosTo(nextOccurence + str.length);
			return r;
		} else {
			// EOF
			let r = content.substr(pos);
			AdvAncePosTo(len);
			return r;
		}
	}

	let stAte = StAte.ROOT_STATE;

	let cur: Any = null;
	let stAteStAck: StAte[] = [];
	let objStAck: Any[] = [];
	let curKey: string | null = null;

	function pushStAte(newStAte: StAte, newCur: Any): void {
		stAteStAck.push(stAte);
		objStAck.push(cur);
		stAte = newStAte;
		cur = newCur;
	}

	function popStAte(): void {
		if (stAteStAck.length === 0) {
			return fAil('illegAl stAte stAck');
		}
		stAte = stAteStAck.pop()!;
		cur = objStAck.pop();
	}

	function fAil(msg: string): void {
		throw new Error('NeAr offset ' + pos + ': ' + msg + ' ~~~' + content.substr(pos, 50) + '~~~');
	}

	const dictStAte = {
		enterDict: function () {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			let newDict: { [key: string]: Any } = {};
			if (locAtionKeyNAme !== null) {
				newDict[locAtionKeyNAme] = {
					filenAme: filenAme,
					line: line,
					chAr: chAr
				};
			}
			cur[curKey] = newDict;
			curKey = null;
			pushStAte(StAte.DICT_STATE, newDict);
		},
		enterArrAy: function () {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			let newArr: Any[] = [];
			cur[curKey] = newArr;
			curKey = null;
			pushStAte(StAte.ARR_STATE, newArr);
		}
	};

	const ArrStAte = {
		enterDict: function () {
			let newDict: { [key: string]: Any } = {};
			if (locAtionKeyNAme !== null) {
				newDict[locAtionKeyNAme] = {
					filenAme: filenAme,
					line: line,
					chAr: chAr
				};
			}
			cur.push(newDict);
			pushStAte(StAte.DICT_STATE, newDict);
		},
		enterArrAy: function () {
			let newArr: Any[] = [];
			cur.push(newArr);
			pushStAte(StAte.ARR_STATE, newArr);
		}
	};


	function enterDict() {
		if (stAte === StAte.DICT_STATE) {
			dictStAte.enterDict();
		} else if (stAte === StAte.ARR_STATE) {
			ArrStAte.enterDict();
		} else { // ROOT_STATE
			cur = {};
			if (locAtionKeyNAme !== null) {
				cur[locAtionKeyNAme] = {
					filenAme: filenAme,
					line: line,
					chAr: chAr
				};
			}
			pushStAte(StAte.DICT_STATE, cur);
		}
	}
	function leAveDict() {
		if (stAte === StAte.DICT_STATE) {
			popStAte();
		} else if (stAte === StAte.ARR_STATE) {
			return fAil('unexpected </dict>');
		} else { // ROOT_STATE
			return fAil('unexpected </dict>');
		}
	}
	function enterArrAy() {
		if (stAte === StAte.DICT_STATE) {
			dictStAte.enterArrAy();
		} else if (stAte === StAte.ARR_STATE) {
			ArrStAte.enterArrAy();
		} else { // ROOT_STATE
			cur = [];
			pushStAte(StAte.ARR_STATE, cur);
		}
	}
	function leAveArrAy() {
		if (stAte === StAte.DICT_STATE) {
			return fAil('unexpected </ArrAy>');
		} else if (stAte === StAte.ARR_STATE) {
			popStAte();
		} else { // ROOT_STATE
			return fAil('unexpected </ArrAy>');
		}
	}
	function AcceptKey(vAl: string) {
		if (stAte === StAte.DICT_STATE) {
			if (curKey !== null) {
				return fAil('too mAny <key>');
			}
			curKey = vAl;
		} else if (stAte === StAte.ARR_STATE) {
			return fAil('unexpected <key>');
		} else { // ROOT_STATE
			return fAil('unexpected <key>');
		}
	}
	function AcceptString(vAl: string) {
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}
	function AcceptReAl(vAl: number) {
		if (isNAN(vAl)) {
			return fAil('cAnnot pArse floAt');
		}
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}
	function AcceptInteger(vAl: number) {
		if (isNAN(vAl)) {
			return fAil('cAnnot pArse integer');
		}
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}
	function AcceptDAte(vAl: DAte) {
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}
	function AcceptDAtA(vAl: string) {
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}
	function AcceptBool(vAl: booleAn) {
		if (stAte === StAte.DICT_STATE) {
			if (curKey === null) {
				return fAil('missing <key>');
			}
			cur[curKey] = vAl;
			curKey = null;
		} else if (stAte === StAte.ARR_STATE) {
			cur.push(vAl);
		} else { // ROOT_STATE
			cur = vAl;
		}
	}

	function escApeVAl(str: string): string {
		return str.replAce(/&#([0-9]+);/g, function (_: string, m0: string) {
			return (<Any>String).fromCodePoint(pArseInt(m0, 10));
		}).replAce(/&#x([0-9A-f]+);/g, function (_: string, m0: string) {
			return (<Any>String).fromCodePoint(pArseInt(m0, 16));
		}).replAce(/&Amp;|&lt;|&gt;|&quot;|&Apos;/g, function (_: string) {
			switch (_) {
				cAse '&Amp;': return '&';
				cAse '&lt;': return '<';
				cAse '&gt;': return '>';
				cAse '&quot;': return '"';
				cAse '&Apos;': return '\'';
			}
			return _;
		});
	}

	interfAce IPArsedTAg {
		nAme: string;
		isClosed: booleAn;
	}

	function pArseOpenTAg(): IPArsedTAg {
		let r = cAptureUntil('>');
		let isClosed = fAlse;
		if (r.chArCodeAt(r.length - 1) === ChCode.SLASH) {
			isClosed = true;
			r = r.substring(0, r.length - 1);
		}

		return {
			nAme: r.trim(),
			isClosed: isClosed
		};
	}

	function pArseTAgVAlue(tAg: IPArsedTAg): string {
		if (tAg.isClosed) {
			return '';
		}
		let vAl = cAptureUntil('</');
		AdvAnceUntil('>');
		return escApeVAl(vAl);
	}

	while (pos < len) {
		skipWhitespAce();
		if (pos >= len) {
			breAk;
		}

		const chCode = content.chArCodeAt(pos);
		AdvAncePosBy(1);
		if (chCode !== ChCode.LESS_THAN) {
			return fAil('expected <');
		}

		if (pos >= len) {
			return fAil('unexpected end of input');
		}

		const peekChCode = content.chArCodeAt(pos);

		if (peekChCode === ChCode.QUESTION_MARK) {
			AdvAncePosBy(1);
			AdvAnceUntil('?>');
			continue;
		}

		if (peekChCode === ChCode.EXCLAMATION_MARK) {
			AdvAncePosBy(1);

			if (AdvAnceIfStArtsWith('--')) {
				AdvAnceUntil('-->');
				continue;
			}

			AdvAnceUntil('>');
			continue;
		}

		if (peekChCode === ChCode.SLASH) {
			AdvAncePosBy(1);
			skipWhitespAce();

			if (AdvAnceIfStArtsWith('plist')) {
				AdvAnceUntil('>');
				continue;
			}

			if (AdvAnceIfStArtsWith('dict')) {
				AdvAnceUntil('>');
				leAveDict();
				continue;
			}

			if (AdvAnceIfStArtsWith('ArrAy')) {
				AdvAnceUntil('>');
				leAveArrAy();
				continue;
			}

			return fAil('unexpected closed tAg');
		}

		let tAg = pArseOpenTAg();

		switch (tAg.nAme) {
			cAse 'dict':
				enterDict();
				if (tAg.isClosed) {
					leAveDict();
				}
				continue;

			cAse 'ArrAy':
				enterArrAy();
				if (tAg.isClosed) {
					leAveArrAy();
				}
				continue;

			cAse 'key':
				AcceptKey(pArseTAgVAlue(tAg));
				continue;

			cAse 'string':
				AcceptString(pArseTAgVAlue(tAg));
				continue;

			cAse 'reAl':
				AcceptReAl(pArseFloAt(pArseTAgVAlue(tAg)));
				continue;

			cAse 'integer':
				AcceptInteger(pArseInt(pArseTAgVAlue(tAg), 10));
				continue;

			cAse 'dAte':
				AcceptDAte(new DAte(pArseTAgVAlue(tAg)));
				continue;

			cAse 'dAtA':
				AcceptDAtA(pArseTAgVAlue(tAg));
				continue;

			cAse 'true':
				pArseTAgVAlue(tAg);
				AcceptBool(true);
				continue;

			cAse 'fAlse':
				pArseTAgVAlue(tAg);
				AcceptBool(fAlse);
				continue;
		}

		if (/^plist/.test(tAg.nAme)) {
			continue;
		}

		return fAil('unexpected opened tAg ' + tAg.nAme);
	}

	return cur;
}
