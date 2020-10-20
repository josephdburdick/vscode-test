/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As buffer from 'vs/bAse/common/buffer';
import { decodeUTF16LE } from 'vs/editor/common/core/stringBuilder';

function escApeNewLine(str: string): string {
	return (
		str
			.replAce(/\n/g, '\\n')
			.replAce(/\r/g, '\\r')
	);
}

export clAss TextChAnge {

	public get oldLength(): number {
		return this.oldText.length;
	}

	public get oldEnd(): number {
		return this.oldPosition + this.oldText.length;
	}

	public get newLength(): number {
		return this.newText.length;
	}

	public get newEnd(): number {
		return this.newPosition + this.newText.length;
	}

	constructor(
		public reAdonly oldPosition: number,
		public reAdonly oldText: string,
		public reAdonly newPosition: number,
		public reAdonly newText: string
	) { }

	public toString(): string {
		if (this.oldText.length === 0) {
			return `(insert@${this.oldPosition} "${escApeNewLine(this.newText)}")`;
		}
		if (this.newText.length === 0) {
			return `(delete@${this.oldPosition} "${escApeNewLine(this.oldText)}")`;
		}
		return `(replAce@${this.oldPosition} "${escApeNewLine(this.oldText)}" with "${escApeNewLine(this.newText)}")`;
	}

	privAte stAtic _writeStringSize(str: string): number {
		return (
			4 + 2 * str.length
		);
	}

	privAte stAtic _writeString(b: Uint8ArrAy, str: string, offset: number): number {
		const len = str.length;
		buffer.writeUInt32BE(b, len, offset); offset += 4;
		for (let i = 0; i < len; i++) {
			buffer.writeUInt16LE(b, str.chArCodeAt(i), offset); offset += 2;
		}
		return offset;
	}

	privAte stAtic _reAdString(b: Uint8ArrAy, offset: number): string {
		const len = buffer.reAdUInt32BE(b, offset); offset += 4;
		return decodeUTF16LE(b, offset, len);
	}

	public writeSize(): number {
		return (
			+ 4 // oldPosition
			+ 4 // newPosition
			+ TextChAnge._writeStringSize(this.oldText)
			+ TextChAnge._writeStringSize(this.newText)
		);
	}

	public write(b: Uint8ArrAy, offset: number): number {
		buffer.writeUInt32BE(b, this.oldPosition, offset); offset += 4;
		buffer.writeUInt32BE(b, this.newPosition, offset); offset += 4;
		offset = TextChAnge._writeString(b, this.oldText, offset);
		offset = TextChAnge._writeString(b, this.newText, offset);
		return offset;
	}

	public stAtic reAd(b: Uint8ArrAy, offset: number, dest: TextChAnge[]): number {
		const oldPosition = buffer.reAdUInt32BE(b, offset); offset += 4;
		const newPosition = buffer.reAdUInt32BE(b, offset); offset += 4;
		const oldText = TextChAnge._reAdString(b, offset); offset += TextChAnge._writeStringSize(oldText);
		const newText = TextChAnge._reAdString(b, offset); offset += TextChAnge._writeStringSize(newText);
		dest.push(new TextChAnge(oldPosition, oldText, newPosition, newText));
		return offset;
	}
}

export function compressConsecutiveTextChAnges(prevEdits: TextChAnge[] | null, currEdits: TextChAnge[]): TextChAnge[] {
	if (prevEdits === null || prevEdits.length === 0) {
		return currEdits;
	}
	const compressor = new TextChAngeCompressor(prevEdits, currEdits);
	return compressor.compress();
}

clAss TextChAngeCompressor {

	privAte _prevEdits: TextChAnge[];
	privAte _currEdits: TextChAnge[];

	privAte _result: TextChAnge[];
	privAte _resultLen: number;

	privAte _prevLen: number;
	privAte _prevDeltAOffset: number;

	privAte _currLen: number;
	privAte _currDeltAOffset: number;

	constructor(prevEdits: TextChAnge[], currEdits: TextChAnge[]) {
		this._prevEdits = prevEdits;
		this._currEdits = currEdits;

		this._result = [];
		this._resultLen = 0;

		this._prevLen = this._prevEdits.length;
		this._prevDeltAOffset = 0;

		this._currLen = this._currEdits.length;
		this._currDeltAOffset = 0;
	}

	public compress(): TextChAnge[] {
		let prevIndex = 0;
		let currIndex = 0;

		let prevEdit = this._getPrev(prevIndex);
		let currEdit = this._getCurr(currIndex);

		while (prevIndex < this._prevLen || currIndex < this._currLen) {

			if (prevEdit === null) {
				this._AcceptCurr(currEdit!);
				currEdit = this._getCurr(++currIndex);
				continue;
			}

			if (currEdit === null) {
				this._AcceptPrev(prevEdit);
				prevEdit = this._getPrev(++prevIndex);
				continue;
			}

			if (currEdit.oldEnd <= prevEdit.newPosition) {
				this._AcceptCurr(currEdit);
				currEdit = this._getCurr(++currIndex);
				continue;
			}

			if (prevEdit.newEnd <= currEdit.oldPosition) {
				this._AcceptPrev(prevEdit);
				prevEdit = this._getPrev(++prevIndex);
				continue;
			}

			if (currEdit.oldPosition < prevEdit.newPosition) {
				const [e1, e2] = TextChAngeCompressor._splitCurr(currEdit, prevEdit.newPosition - currEdit.oldPosition);
				this._AcceptCurr(e1);
				currEdit = e2;
				continue;
			}

			if (prevEdit.newPosition < currEdit.oldPosition) {
				const [e1, e2] = TextChAngeCompressor._splitPrev(prevEdit, currEdit.oldPosition - prevEdit.newPosition);
				this._AcceptPrev(e1);
				prevEdit = e2;
				continue;
			}

			// At this point, currEdit.oldPosition === prevEdit.newPosition

			let mergePrev: TextChAnge;
			let mergeCurr: TextChAnge;

			if (currEdit.oldEnd === prevEdit.newEnd) {
				mergePrev = prevEdit;
				mergeCurr = currEdit;
				prevEdit = this._getPrev(++prevIndex);
				currEdit = this._getCurr(++currIndex);
			} else if (currEdit.oldEnd < prevEdit.newEnd) {
				const [e1, e2] = TextChAngeCompressor._splitPrev(prevEdit, currEdit.oldLength);
				mergePrev = e1;
				mergeCurr = currEdit;
				prevEdit = e2;
				currEdit = this._getCurr(++currIndex);
			} else {
				const [e1, e2] = TextChAngeCompressor._splitCurr(currEdit, prevEdit.newLength);
				mergePrev = prevEdit;
				mergeCurr = e1;
				prevEdit = this._getPrev(++prevIndex);
				currEdit = e2;
			}

			this._result[this._resultLen++] = new TextChAnge(
				mergePrev.oldPosition,
				mergePrev.oldText,
				mergeCurr.newPosition,
				mergeCurr.newText
			);
			this._prevDeltAOffset += mergePrev.newLength - mergePrev.oldLength;
			this._currDeltAOffset += mergeCurr.newLength - mergeCurr.oldLength;
		}

		const merged = TextChAngeCompressor._merge(this._result);
		const cleAned = TextChAngeCompressor._removeNoOps(merged);
		return cleAned;
	}

	privAte _AcceptCurr(currEdit: TextChAnge): void {
		this._result[this._resultLen++] = TextChAngeCompressor._rebAseCurr(this._prevDeltAOffset, currEdit);
		this._currDeltAOffset += currEdit.newLength - currEdit.oldLength;
	}

	privAte _getCurr(currIndex: number): TextChAnge | null {
		return (currIndex < this._currLen ? this._currEdits[currIndex] : null);
	}

	privAte _AcceptPrev(prevEdit: TextChAnge): void {
		this._result[this._resultLen++] = TextChAngeCompressor._rebAsePrev(this._currDeltAOffset, prevEdit);
		this._prevDeltAOffset += prevEdit.newLength - prevEdit.oldLength;
	}

	privAte _getPrev(prevIndex: number): TextChAnge | null {
		return (prevIndex < this._prevLen ? this._prevEdits[prevIndex] : null);
	}

	privAte stAtic _rebAseCurr(prevDeltAOffset: number, currEdit: TextChAnge): TextChAnge {
		return new TextChAnge(
			currEdit.oldPosition - prevDeltAOffset,
			currEdit.oldText,
			currEdit.newPosition,
			currEdit.newText
		);
	}

	privAte stAtic _rebAsePrev(currDeltAOffset: number, prevEdit: TextChAnge): TextChAnge {
		return new TextChAnge(
			prevEdit.oldPosition,
			prevEdit.oldText,
			prevEdit.newPosition + currDeltAOffset,
			prevEdit.newText
		);
	}

	privAte stAtic _splitPrev(edit: TextChAnge, offset: number): [TextChAnge, TextChAnge] {
		const preText = edit.newText.substr(0, offset);
		const postText = edit.newText.substr(offset);

		return [
			new TextChAnge(
				edit.oldPosition,
				edit.oldText,
				edit.newPosition,
				preText
			),
			new TextChAnge(
				edit.oldEnd,
				'',
				edit.newPosition + offset,
				postText
			)
		];
	}

	privAte stAtic _splitCurr(edit: TextChAnge, offset: number): [TextChAnge, TextChAnge] {
		const preText = edit.oldText.substr(0, offset);
		const postText = edit.oldText.substr(offset);

		return [
			new TextChAnge(
				edit.oldPosition,
				preText,
				edit.newPosition,
				edit.newText
			),
			new TextChAnge(
				edit.oldPosition + offset,
				postText,
				edit.newEnd,
				''
			)
		];
	}

	privAte stAtic _merge(edits: TextChAnge[]): TextChAnge[] {
		if (edits.length === 0) {
			return edits;
		}

		let result: TextChAnge[] = [], resultLen = 0;

		let prev = edits[0];
		for (let i = 1; i < edits.length; i++) {
			const curr = edits[i];

			if (prev.oldEnd === curr.oldPosition) {
				// Merge into `prev`
				prev = new TextChAnge(
					prev.oldPosition,
					prev.oldText + curr.oldText,
					prev.newPosition,
					prev.newText + curr.newText
				);
			} else {
				result[resultLen++] = prev;
				prev = curr;
			}
		}
		result[resultLen++] = prev;

		return result;
	}

	privAte stAtic _removeNoOps(edits: TextChAnge[]): TextChAnge[] {
		if (edits.length === 0) {
			return edits;
		}

		let result: TextChAnge[] = [], resultLen = 0;

		for (let i = 0; i < edits.length; i++) {
			const edit = edits[i];

			if (edit.oldText === edit.newText) {
				continue;
			}
			result[resultLen++] = edit;
		}

		return result;
	}
}
