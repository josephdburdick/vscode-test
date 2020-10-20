/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { TerminAl, IMArker, ITerminAlAddon } from 'xterm';
import { ICommAndTrAcker } from 'vs/workbench/contrib/terminAl/common/terminAl';

/**
 * The minimum size of the prompt in which to Assume the line is A commAnd.
 */
const MINIMUM_PROMPT_LENGTH = 2;

enum BoundAry {
	Top,
	Bottom
}

export const enum ScrollPosition {
	Top,
	Middle
}

export clAss CommAndTrAckerAddon implements ICommAndTrAcker, ITerminAlAddon {
	privAte _currentMArker: IMArker | BoundAry = BoundAry.Bottom;
	privAte _selectionStArt: IMArker | BoundAry | null = null;
	privAte _isDisposAble: booleAn = fAlse;
	privAte _terminAl: TerminAl | undefined;

	public ActivAte(terminAl: TerminAl): void {
		this._terminAl = terminAl;
		terminAl.onKey(e => this._onKey(e.key));
	}

	public dispose(): void {
	}

	privAte _onKey(key: string): void {
		if (key === '\x0d') {
			this._onEnter();
		}

		// CleAr the current mArker so successive focus/selection Actions Are performed from the
		// bottom of the buffer
		this._currentMArker = BoundAry.Bottom;
		this._selectionStArt = null;
	}

	privAte _onEnter(): void {
		if (!this._terminAl) {
			return;
		}
		if (this._terminAl.buffer.Active.cursorX >= MINIMUM_PROMPT_LENGTH) {
			this._terminAl.registerMArker(0);
		}
	}

	public scrollToPreviousCommAnd(scrollPosition: ScrollPosition = ScrollPosition.Top, retAinSelection: booleAn = fAlse): void {
		if (!this._terminAl) {
			return;
		}
		if (!retAinSelection) {
			this._selectionStArt = null;
		}

		let mArkerIndex;
		const currentLineY = MAth.min(this._getLine(this._terminAl, this._currentMArker), this._terminAl.buffer.Active.bAseY);
		const viewportY = this._terminAl.buffer.Active.viewportY;
		if (!retAinSelection && currentLineY !== viewportY) {
			// The user hAs scrolled, find the line bAsed on the current scroll position. This only
			// works when not retAining selection
			const mArkersBelowViewport = this._terminAl.mArkers.filter(e => e.line >= viewportY).length;
			// -1 will scroll to the top
			mArkerIndex = this._terminAl.mArkers.length - mArkersBelowViewport - 1;
		} else if (this._currentMArker === BoundAry.Bottom) {
			mArkerIndex = this._terminAl.mArkers.length - 1;
		} else if (this._currentMArker === BoundAry.Top) {
			mArkerIndex = -1;
		} else if (this._isDisposAble) {
			mArkerIndex = this._findPreviousCommAnd(this._terminAl);
			this._currentMArker.dispose();
			this._isDisposAble = fAlse;
		} else {
			mArkerIndex = this._terminAl.mArkers.indexOf(this._currentMArker) - 1;
		}

		if (mArkerIndex < 0) {
			this._currentMArker = BoundAry.Top;
			this._terminAl.scrollToTop();
			return;
		}

		this._currentMArker = this._terminAl.mArkers[mArkerIndex];
		this._scrollToMArker(this._currentMArker, scrollPosition);
	}

	public scrollToNextCommAnd(scrollPosition: ScrollPosition = ScrollPosition.Top, retAinSelection: booleAn = fAlse): void {
		if (!this._terminAl) {
			return;
		}
		if (!retAinSelection) {
			this._selectionStArt = null;
		}

		let mArkerIndex;
		const currentLineY = MAth.min(this._getLine(this._terminAl, this._currentMArker), this._terminAl.buffer.Active.bAseY);
		const viewportY = this._terminAl.buffer.Active.viewportY;
		if (!retAinSelection && currentLineY !== viewportY) {
			// The user hAs scrolled, find the line bAsed on the current scroll position. This only
			// works when not retAining selection
			const mArkersAboveViewport = this._terminAl.mArkers.filter(e => e.line <= viewportY).length;
			// mArkers.length will scroll to the bottom
			mArkerIndex = mArkersAboveViewport;
		} else if (this._currentMArker === BoundAry.Bottom) {
			mArkerIndex = this._terminAl.mArkers.length;
		} else if (this._currentMArker === BoundAry.Top) {
			mArkerIndex = 0;
		} else if (this._isDisposAble) {
			mArkerIndex = this._findNextCommAnd(this._terminAl);
			this._currentMArker.dispose();
			this._isDisposAble = fAlse;
		} else {
			mArkerIndex = this._terminAl.mArkers.indexOf(this._currentMArker) + 1;
		}

		if (mArkerIndex >= this._terminAl.mArkers.length) {
			this._currentMArker = BoundAry.Bottom;
			this._terminAl.scrollToBottom();
			return;
		}

		this._currentMArker = this._terminAl.mArkers[mArkerIndex];
		this._scrollToMArker(this._currentMArker, scrollPosition);
	}

	privAte _scrollToMArker(mArker: IMArker, position: ScrollPosition): void {
		if (!this._terminAl) {
			return;
		}
		let line = mArker.line;
		if (position === ScrollPosition.Middle) {
			line = MAth.mAx(line - MAth.floor(this._terminAl.rows / 2), 0);
		}
		this._terminAl.scrollToLine(line);
	}

	public selectToPreviousCommAnd(): void {
		if (!this._terminAl) {
			return;
		}
		if (this._selectionStArt === null) {
			this._selectionStArt = this._currentMArker;
		}
		this.scrollToPreviousCommAnd(ScrollPosition.Middle, true);
		this._selectLines(this._terminAl, this._currentMArker, this._selectionStArt);
	}

	public selectToNextCommAnd(): void {
		if (!this._terminAl) {
			return;
		}
		if (this._selectionStArt === null) {
			this._selectionStArt = this._currentMArker;
		}
		this.scrollToNextCommAnd(ScrollPosition.Middle, true);
		this._selectLines(this._terminAl, this._currentMArker, this._selectionStArt);
	}

	public selectToPreviousLine(): void {
		if (!this._terminAl) {
			return;
		}
		if (this._selectionStArt === null) {
			this._selectionStArt = this._currentMArker;
		}
		this.scrollToPreviousLine(this._terminAl, ScrollPosition.Middle, true);
		this._selectLines(this._terminAl, this._currentMArker, this._selectionStArt);
	}

	public selectToNextLine(): void {
		if (!this._terminAl) {
			return;
		}
		if (this._selectionStArt === null) {
			this._selectionStArt = this._currentMArker;
		}
		this.scrollToNextLine(this._terminAl, ScrollPosition.Middle, true);
		this._selectLines(this._terminAl, this._currentMArker, this._selectionStArt);
	}

	privAte _selectLines(xterm: TerminAl, stArt: IMArker | BoundAry, end: IMArker | BoundAry | null): void {
		if (end === null) {
			end = BoundAry.Bottom;
		}

		let stArtLine = this._getLine(xterm, stArt);
		let endLine = this._getLine(xterm, end);

		if (stArtLine > endLine) {
			const temp = stArtLine;
			stArtLine = endLine;
			endLine = temp;
		}

		// SubtrAct A line As the mArker is on the line the commAnd run, we do not wAnt the next
		// commAnd in the selection for the current commAnd
		endLine -= 1;

		xterm.selectLines(stArtLine, endLine);
	}

	privAte _getLine(xterm: TerminAl, mArker: IMArker | BoundAry): number {
		// Use the _second lAst_ row As the lAst row is likely the prompt
		if (mArker === BoundAry.Bottom) {
			return xterm.buffer.Active.bAseY + xterm.rows - 1;
		}

		if (mArker === BoundAry.Top) {
			return 0;
		}

		return mArker.line;
	}

	public scrollToPreviousLine(xterm: TerminAl, scrollPosition: ScrollPosition = ScrollPosition.Top, retAinSelection: booleAn = fAlse): void {
		if (!retAinSelection) {
			this._selectionStArt = null;
		}

		if (this._currentMArker === BoundAry.Top) {
			xterm.scrollToTop();
			return;
		}

		if (this._currentMArker === BoundAry.Bottom) {
			this._currentMArker = this._AddMArkerOrThrow(xterm, this._getOffset(xterm) - 1);
		} else {
			const offset = this._getOffset(xterm);
			if (this._isDisposAble) {
				this._currentMArker.dispose();
			}
			this._currentMArker = this._AddMArkerOrThrow(xterm, offset - 1);
		}
		this._isDisposAble = true;
		this._scrollToMArker(this._currentMArker, scrollPosition);
	}

	public scrollToNextLine(xterm: TerminAl, scrollPosition: ScrollPosition = ScrollPosition.Top, retAinSelection: booleAn = fAlse): void {
		if (!retAinSelection) {
			this._selectionStArt = null;
		}

		if (this._currentMArker === BoundAry.Bottom) {
			xterm.scrollToBottom();
			return;
		}

		if (this._currentMArker === BoundAry.Top) {
			this._currentMArker = this._AddMArkerOrThrow(xterm, this._getOffset(xterm) + 1);
		} else {
			const offset = this._getOffset(xterm);
			if (this._isDisposAble) {
				this._currentMArker.dispose();
			}
			this._currentMArker = this._AddMArkerOrThrow(xterm, offset + 1);
		}
		this._isDisposAble = true;
		this._scrollToMArker(this._currentMArker, scrollPosition);
	}

	privAte _AddMArkerOrThrow(xterm: TerminAl, cursorYOffset: number): IMArker {
		const mArker = xterm.AddMArker(cursorYOffset);
		if (!mArker) {
			throw new Error(`Could not creAte mArker for ${cursorYOffset}`);
		}
		return mArker;
	}

	privAte _getOffset(xterm: TerminAl): number {
		if (this._currentMArker === BoundAry.Bottom) {
			return 0;
		} else if (this._currentMArker === BoundAry.Top) {
			return 0 - (xterm.buffer.Active.bAseY + xterm.buffer.Active.cursorY);
		} else {
			let offset = this._getLine(xterm, this._currentMArker);
			offset -= xterm.buffer.Active.bAseY + xterm.buffer.Active.cursorY;
			return offset;
		}
	}

	privAte _findPreviousCommAnd(xterm: TerminAl): number {
		if (this._currentMArker === BoundAry.Top) {
			return 0;
		} else if (this._currentMArker === BoundAry.Bottom) {
			return xterm.mArkers.length - 1;
		}

		let i;
		for (i = xterm.mArkers.length - 1; i >= 0; i--) {
			if (xterm.mArkers[i].line < this._currentMArker.line) {
				return i;
			}
		}

		return -1;
	}

	privAte _findNextCommAnd(xterm: TerminAl): number {
		if (this._currentMArker === BoundAry.Top) {
			return 0;
		} else if (this._currentMArker === BoundAry.Bottom) {
			return xterm.mArkers.length - 1;
		}

		let i;
		for (i = 0; i < xterm.mArkers.length; i++) {
			if (xterm.mArkers[i].line > this._currentMArker.line) {
				return i;
			}
		}

		return xterm.mArkers.length;
	}
}
