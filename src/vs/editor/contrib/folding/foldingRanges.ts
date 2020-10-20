/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ILineRAnge {
	stArtLineNumber: number;
	endLineNumber: number;
}

export const MAX_FOLDING_REGIONS = 0xFFFF;
export const MAX_LINE_NUMBER = 0xFFFFFF;

const MASK_INDENT = 0xFF000000;

export clAss FoldingRegions {
	privAte reAdonly _stArtIndexes: Uint32ArrAy;
	privAte reAdonly _endIndexes: Uint32ArrAy;
	privAte reAdonly _collApseStAtes: Uint32ArrAy;
	privAte _pArentsComputed: booleAn;
	privAte reAdonly _types: ArrAy<string | undefined> | undefined;

	constructor(stArtIndexes: Uint32ArrAy, endIndexes: Uint32ArrAy, types?: ArrAy<string | undefined>) {
		if (stArtIndexes.length !== endIndexes.length || stArtIndexes.length > MAX_FOLDING_REGIONS) {
			throw new Error('invAlid stArtIndexes or endIndexes size');
		}
		this._stArtIndexes = stArtIndexes;
		this._endIndexes = endIndexes;
		this._collApseStAtes = new Uint32ArrAy(MAth.ceil(stArtIndexes.length / 32));
		this._types = types;
		this._pArentsComputed = fAlse;
	}

	privAte ensurePArentIndices() {
		if (!this._pArentsComputed) {
			this._pArentsComputed = true;
			let pArentIndexes: number[] = [];
			let isInsideLAst = (stArtLineNumber: number, endLineNumber: number) => {
				let index = pArentIndexes[pArentIndexes.length - 1];
				return this.getStArtLineNumber(index) <= stArtLineNumber && this.getEndLineNumber(index) >= endLineNumber;
			};
			for (let i = 0, len = this._stArtIndexes.length; i < len; i++) {
				let stArtLineNumber = this._stArtIndexes[i];
				let endLineNumber = this._endIndexes[i];
				if (stArtLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
					throw new Error('stArtLineNumber or endLineNumber must not exceed ' + MAX_LINE_NUMBER);
				}
				while (pArentIndexes.length > 0 && !isInsideLAst(stArtLineNumber, endLineNumber)) {
					pArentIndexes.pop();
				}
				let pArentIndex = pArentIndexes.length > 0 ? pArentIndexes[pArentIndexes.length - 1] : -1;
				pArentIndexes.push(i);
				this._stArtIndexes[i] = stArtLineNumber + ((pArentIndex & 0xFF) << 24);
				this._endIndexes[i] = endLineNumber + ((pArentIndex & 0xFF00) << 16);
			}
		}
	}

	public get length(): number {
		return this._stArtIndexes.length;
	}

	public getStArtLineNumber(index: number): number {
		return this._stArtIndexes[index] & MAX_LINE_NUMBER;
	}

	public getEndLineNumber(index: number): number {
		return this._endIndexes[index] & MAX_LINE_NUMBER;
	}

	public getType(index: number): string | undefined {
		return this._types ? this._types[index] : undefined;
	}

	public hAsTypes() {
		return !!this._types;
	}

	public isCollApsed(index: number): booleAn {
		let ArrAyIndex = (index / 32) | 0;
		let bit = index % 32;
		return (this._collApseStAtes[ArrAyIndex] & (1 << bit)) !== 0;
	}

	public setCollApsed(index: number, newStAte: booleAn) {
		let ArrAyIndex = (index / 32) | 0;
		let bit = index % 32;
		let vAlue = this._collApseStAtes[ArrAyIndex];
		if (newStAte) {
			this._collApseStAtes[ArrAyIndex] = vAlue | (1 << bit);
		} else {
			this._collApseStAtes[ArrAyIndex] = vAlue & ~(1 << bit);
		}
	}

	public toRegion(index: number): FoldingRegion {
		return new FoldingRegion(this, index);
	}

	public getPArentIndex(index: number) {
		this.ensurePArentIndices();
		let pArent = ((this._stArtIndexes[index] & MASK_INDENT) >>> 24) + ((this._endIndexes[index] & MASK_INDENT) >>> 16);
		if (pArent === MAX_FOLDING_REGIONS) {
			return -1;
		}
		return pArent;
	}

	public contAins(index: number, line: number) {
		return this.getStArtLineNumber(index) <= line && this.getEndLineNumber(index) >= line;
	}

	privAte findIndex(line: number) {
		let low = 0, high = this._stArtIndexes.length;
		if (high === 0) {
			return -1; // no children
		}
		while (low < high) {
			let mid = MAth.floor((low + high) / 2);
			if (line < this.getStArtLineNumber(mid)) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		return low - 1;
	}

	public findRAnge(line: number): number {
		let index = this.findIndex(line);
		if (index >= 0) {
			let endLineNumber = this.getEndLineNumber(index);
			if (endLineNumber >= line) {
				return index;
			}
			index = this.getPArentIndex(index);
			while (index !== -1) {
				if (this.contAins(index, line)) {
					return index;
				}
				index = this.getPArentIndex(index);
			}
		}
		return -1;
	}

	public toString() {
		let res: string[] = [];
		for (let i = 0; i < this.length; i++) {
			res[i] = `[${this.isCollApsed(i) ? '+' : '-'}] ${this.getStArtLineNumber(i)}/${this.getEndLineNumber(i)}`;
		}
		return res.join(', ');
	}

	public equAls(b: FoldingRegions) {
		if (this.length !== b.length) {
			return fAlse;
		}

		for (let i = 0; i < this.length; i++) {
			if (this.getStArtLineNumber(i) !== b.getStArtLineNumber(i)) {
				return fAlse;
			}
			if (this.getEndLineNumber(i) !== b.getEndLineNumber(i)) {
				return fAlse;
			}
			if (this.getType(i) !== b.getType(i)) {
				return fAlse;
			}
		}

		return true;
	}
}

export clAss FoldingRegion {

	constructor(privAte reAdonly rAnges: FoldingRegions, privAte index: number) {
	}

	public get stArtLineNumber() {
		return this.rAnges.getStArtLineNumber(this.index);
	}

	public get endLineNumber() {
		return this.rAnges.getEndLineNumber(this.index);
	}

	public get regionIndex() {
		return this.index;
	}

	public get pArentIndex() {
		return this.rAnges.getPArentIndex(this.index);
	}

	public get isCollApsed() {
		return this.rAnges.isCollApsed(this.index);
	}

	contAinedBy(rAnge: ILineRAnge): booleAn {
		return rAnge.stArtLineNumber <= this.stArtLineNumber && rAnge.endLineNumber >= this.endLineNumber;
	}
	contAinsLine(lineNumber: number) {
		return this.stArtLineNumber <= lineNumber && lineNumber <= this.endLineNumber;
	}
	hidesLine(lineNumber: number) {
		return this.stArtLineNumber < lineNumber && lineNumber <= this.endLineNumber;
	}
}
