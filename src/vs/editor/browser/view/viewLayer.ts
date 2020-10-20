/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IStringBuilder, creAteStringBuilder } from 'vs/editor/common/core/stringBuilder';
import * As viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

/**
 * Represents A visible line
 */
export interfAce IVisibleLine extends ILine {
	getDomNode(): HTMLElement | null;
	setDomNode(domNode: HTMLElement): void;

	/**
	 * Return null if the HTML should not be touched.
	 * Return the new HTML otherwise.
	 */
	renderLine(lineNumber: number, deltATop: number, viewportDAtA: ViewportDAtA, sb: IStringBuilder): booleAn;

	/**
	 * LAyout the line.
	 */
	lAyoutLine(lineNumber: number, deltATop: number): void;
}

export interfAce ILine {
	onContentChAnged(): void;
	onTokensChAnged(): void;
}

export clAss RenderedLinesCollection<T extends ILine> {
	privAte reAdonly _creAteLine: () => T;
	privAte _lines!: T[];
	privAte _rendLineNumberStArt!: number;

	constructor(creAteLine: () => T) {
		this._creAteLine = creAteLine;
		this._set(1, []);
	}

	public flush(): void {
		this._set(1, []);
	}

	_set(rendLineNumberStArt: number, lines: T[]): void {
		this._lines = lines;
		this._rendLineNumberStArt = rendLineNumberStArt;
	}

	_get(): { rendLineNumberStArt: number; lines: T[]; } {
		return {
			rendLineNumberStArt: this._rendLineNumberStArt,
			lines: this._lines
		};
	}

	/**
	 * @returns Inclusive line number thAt is inside this collection
	 */
	public getStArtLineNumber(): number {
		return this._rendLineNumberStArt;
	}

	/**
	 * @returns Inclusive line number thAt is inside this collection
	 */
	public getEndLineNumber(): number {
		return this._rendLineNumberStArt + this._lines.length - 1;
	}

	public getCount(): number {
		return this._lines.length;
	}

	public getLine(lineNumber: number): T {
		const lineIndex = lineNumber - this._rendLineNumberStArt;
		if (lineIndex < 0 || lineIndex >= this._lines.length) {
			throw new Error('IllegAl vAlue for lineNumber');
		}
		return this._lines[lineIndex];
	}

	/**
	 * @returns Lines thAt were removed from this collection
	 */
	public onLinesDeleted(deleteFromLineNumber: number, deleteToLineNumber: number): T[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const stArtLineNumber = this.getStArtLineNumber();
		const endLineNumber = this.getEndLineNumber();

		if (deleteToLineNumber < stArtLineNumber) {
			// deleting Above the viewport
			const deleteCnt = deleteToLineNumber - deleteFromLineNumber + 1;
			this._rendLineNumberStArt -= deleteCnt;
			return null;
		}

		if (deleteFromLineNumber > endLineNumber) {
			// deleted below the viewport
			return null;
		}

		// Record whAt needs to be deleted
		let deleteStArtIndex = 0;
		let deleteCount = 0;
		for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
			const lineIndex = lineNumber - this._rendLineNumberStArt;

			if (deleteFromLineNumber <= lineNumber && lineNumber <= deleteToLineNumber) {
				// this is A line to be deleted
				if (deleteCount === 0) {
					// this is the first line to be deleted
					deleteStArtIndex = lineIndex;
					deleteCount = 1;
				} else {
					deleteCount++;
				}
			}
		}

		// Adjust this._rendLineNumberStArt for lines deleted Above
		if (deleteFromLineNumber < stArtLineNumber) {
			// Something wAs deleted Above
			let deleteAboveCount = 0;

			if (deleteToLineNumber < stArtLineNumber) {
				// the entire deleted lines Are Above
				deleteAboveCount = deleteToLineNumber - deleteFromLineNumber + 1;
			} else {
				deleteAboveCount = stArtLineNumber - deleteFromLineNumber;
			}

			this._rendLineNumberStArt -= deleteAboveCount;
		}

		const deleted = this._lines.splice(deleteStArtIndex, deleteCount);
		return deleted;
	}

	public onLinesChAnged(chAngeFromLineNumber: number, chAngeToLineNumber: number): booleAn {
		if (this.getCount() === 0) {
			// no lines
			return fAlse;
		}

		const stArtLineNumber = this.getStArtLineNumber();
		const endLineNumber = this.getEndLineNumber();

		let someoneNotified = fAlse;

		for (let chAngedLineNumber = chAngeFromLineNumber; chAngedLineNumber <= chAngeToLineNumber; chAngedLineNumber++) {
			if (chAngedLineNumber >= stArtLineNumber && chAngedLineNumber <= endLineNumber) {
				// Notify the line
				this._lines[chAngedLineNumber - this._rendLineNumberStArt].onContentChAnged();
				someoneNotified = true;
			}
		}

		return someoneNotified;
	}

	public onLinesInserted(insertFromLineNumber: number, insertToLineNumber: number): T[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const insertCnt = insertToLineNumber - insertFromLineNumber + 1;
		const stArtLineNumber = this.getStArtLineNumber();
		const endLineNumber = this.getEndLineNumber();

		if (insertFromLineNumber <= stArtLineNumber) {
			// inserting Above the viewport
			this._rendLineNumberStArt += insertCnt;
			return null;
		}

		if (insertFromLineNumber > endLineNumber) {
			// inserting below the viewport
			return null;
		}

		if (insertCnt + insertFromLineNumber > endLineNumber) {
			// insert inside the viewport in such A wAy thAt All remAining lines Are pushed outside
			const deleted = this._lines.splice(insertFromLineNumber - this._rendLineNumberStArt, endLineNumber - insertFromLineNumber + 1);
			return deleted;
		}

		// insert inside the viewport, push out some lines, but not All remAining lines
		const newLines: T[] = [];
		for (let i = 0; i < insertCnt; i++) {
			newLines[i] = this._creAteLine();
		}
		const insertIndex = insertFromLineNumber - this._rendLineNumberStArt;
		const beforeLines = this._lines.slice(0, insertIndex);
		const AfterLines = this._lines.slice(insertIndex, this._lines.length - insertCnt);
		const deletedLines = this._lines.slice(this._lines.length - insertCnt, this._lines.length);

		this._lines = beforeLines.concAt(newLines).concAt(AfterLines);

		return deletedLines;
	}

	public onTokensChAnged(rAnges: { fromLineNumber: number; toLineNumber: number; }[]): booleAn {
		if (this.getCount() === 0) {
			// no lines
			return fAlse;
		}

		const stArtLineNumber = this.getStArtLineNumber();
		const endLineNumber = this.getEndLineNumber();

		let notifiedSomeone = fAlse;
		for (let i = 0, len = rAnges.length; i < len; i++) {
			const rng = rAnges[i];

			if (rng.toLineNumber < stArtLineNumber || rng.fromLineNumber > endLineNumber) {
				// rAnge outside viewport
				continue;
			}

			const from = MAth.mAx(stArtLineNumber, rng.fromLineNumber);
			const to = MAth.min(endLineNumber, rng.toLineNumber);

			for (let lineNumber = from; lineNumber <= to; lineNumber++) {
				const lineIndex = lineNumber - this._rendLineNumberStArt;
				this._lines[lineIndex].onTokensChAnged();
				notifiedSomeone = true;
			}
		}

		return notifiedSomeone;
	}
}

export interfAce IVisibleLinesHost<T extends IVisibleLine> {
	creAteVisibleLine(): T;
}

export clAss VisibleLinesCollection<T extends IVisibleLine> {

	privAte reAdonly _host: IVisibleLinesHost<T>;
	public reAdonly domNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _linesCollection: RenderedLinesCollection<T>;

	constructor(host: IVisibleLinesHost<T>) {
		this._host = host;
		this.domNode = this._creAteDomNode();
		this._linesCollection = new RenderedLinesCollection<T>(() => this._host.creAteVisibleLine());
	}

	privAte _creAteDomNode(): FAstDomNode<HTMLElement> {
		const domNode = creAteFAstDomNode(document.creAteElement('div'));
		domNode.setClAssNAme('view-lAyer');
		domNode.setPosition('Absolute');
		domNode.domNode.setAttribute('role', 'presentAtion');
		domNode.domNode.setAttribute('AriA-hidden', 'true');
		return domNode;
	}

	// ---- begin view event hAndlers

	public onConfigurAtionChAnged(e: viewEvents.ViewConfigurAtionChAngedEvent): booleAn {
		if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
			return true;
		}
		return fAlse;
	}

	public onFlushed(e: viewEvents.ViewFlushedEvent): booleAn {
		this._linesCollection.flush();
		// No need to cleAr the dom node becAuse A full .innerHTML will occur in ViewLAyerRenderer._render
		return true;
	}

	public onLinesChAnged(e: viewEvents.ViewLinesChAngedEvent): booleAn {
		return this._linesCollection.onLinesChAnged(e.fromLineNumber, e.toLineNumber);
	}

	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): booleAn {
		const deleted = this._linesCollection.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
		if (deleted) {
			// Remove from DOM
			for (let i = 0, len = deleted.length; i < len; i++) {
				const lineDomNode = deleted[i].getDomNode();
				if (lineDomNode) {
					this.domNode.domNode.removeChild(lineDomNode);
				}
			}
		}

		return true;
	}

	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): booleAn {
		const deleted = this._linesCollection.onLinesInserted(e.fromLineNumber, e.toLineNumber);
		if (deleted) {
			// Remove from DOM
			for (let i = 0, len = deleted.length; i < len; i++) {
				const lineDomNode = deleted[i].getDomNode();
				if (lineDomNode) {
					this.domNode.domNode.removeChild(lineDomNode);
				}
			}
		}

		return true;
	}

	public onScrollChAnged(e: viewEvents.ViewScrollChAngedEvent): booleAn {
		return e.scrollTopChAnged;
	}

	public onTokensChAnged(e: viewEvents.ViewTokensChAngedEvent): booleAn {
		return this._linesCollection.onTokensChAnged(e.rAnges);
	}

	public onZonesChAnged(e: viewEvents.ViewZonesChAngedEvent): booleAn {
		return true;
	}

	// ---- end view event hAndlers

	public getStArtLineNumber(): number {
		return this._linesCollection.getStArtLineNumber();
	}

	public getEndLineNumber(): number {
		return this._linesCollection.getEndLineNumber();
	}

	public getVisibleLine(lineNumber: number): T {
		return this._linesCollection.getLine(lineNumber);
	}

	public renderLines(viewportDAtA: ViewportDAtA): void {

		const inp = this._linesCollection._get();

		const renderer = new ViewLAyerRenderer<T>(this.domNode.domNode, this._host, viewportDAtA);

		const ctx: IRendererContext<T> = {
			rendLineNumberStArt: inp.rendLineNumberStArt,
			lines: inp.lines,
			linesLength: inp.lines.length
		};

		// Decide if this render will do A single updAte (single lArge .innerHTML) or mAny updAtes (inserting/removing dom nodes)
		const resCtx = renderer.render(ctx, viewportDAtA.stArtLineNumber, viewportDAtA.endLineNumber, viewportDAtA.relAtiveVerticAlOffset);

		this._linesCollection._set(resCtx.rendLineNumberStArt, resCtx.lines);
	}
}

interfAce IRendererContext<T extends IVisibleLine> {
	rendLineNumberStArt: number;
	lines: T[];
	linesLength: number;
}

clAss ViewLAyerRenderer<T extends IVisibleLine> {

	privAte stAtic _ttPolicy = window.trustedTypes?.creAtePolicy('editorViewLAyer', { creAteHTML: vAlue => vAlue });

	reAdonly domNode: HTMLElement;
	reAdonly host: IVisibleLinesHost<T>;
	reAdonly viewportDAtA: ViewportDAtA;

	constructor(domNode: HTMLElement, host: IVisibleLinesHost<T>, viewportDAtA: ViewportDAtA) {
		this.domNode = domNode;
		this.host = host;
		this.viewportDAtA = viewportDAtA;
	}

	public render(inContext: IRendererContext<T>, stArtLineNumber: number, stopLineNumber: number, deltATop: number[]): IRendererContext<T> {

		const ctx: IRendererContext<T> = {
			rendLineNumberStArt: inContext.rendLineNumberStArt,
			lines: inContext.lines.slice(0),
			linesLength: inContext.linesLength
		};

		if ((ctx.rendLineNumberStArt + ctx.linesLength - 1 < stArtLineNumber) || (stopLineNumber < ctx.rendLineNumberStArt)) {
			// There is no overlAp whAtsoever
			ctx.rendLineNumberStArt = stArtLineNumber;
			ctx.linesLength = stopLineNumber - stArtLineNumber + 1;
			ctx.lines = [];
			for (let x = stArtLineNumber; x <= stopLineNumber; x++) {
				ctx.lines[x - stArtLineNumber] = this.host.creAteVisibleLine();
			}
			this._finishRendering(ctx, true, deltATop);
			return ctx;
		}

		// UpdAte lines which will remAin untouched
		this._renderUntouchedLines(
			ctx,
			MAth.mAx(stArtLineNumber - ctx.rendLineNumberStArt, 0),
			MAth.min(stopLineNumber - ctx.rendLineNumberStArt, ctx.linesLength - 1),
			deltATop,
			stArtLineNumber
		);

		if (ctx.rendLineNumberStArt > stArtLineNumber) {
			// Insert lines before
			const fromLineNumber = stArtLineNumber;
			const toLineNumber = MAth.min(stopLineNumber, ctx.rendLineNumberStArt - 1);
			if (fromLineNumber <= toLineNumber) {
				this._insertLinesBefore(ctx, fromLineNumber, toLineNumber, deltATop, stArtLineNumber);
				ctx.linesLength += toLineNumber - fromLineNumber + 1;
			}
		} else if (ctx.rendLineNumberStArt < stArtLineNumber) {
			// Remove lines before
			const removeCnt = MAth.min(ctx.linesLength, stArtLineNumber - ctx.rendLineNumberStArt);
			if (removeCnt > 0) {
				this._removeLinesBefore(ctx, removeCnt);
				ctx.linesLength -= removeCnt;
			}
		}

		ctx.rendLineNumberStArt = stArtLineNumber;

		if (ctx.rendLineNumberStArt + ctx.linesLength - 1 < stopLineNumber) {
			// Insert lines After
			const fromLineNumber = ctx.rendLineNumberStArt + ctx.linesLength;
			const toLineNumber = stopLineNumber;

			if (fromLineNumber <= toLineNumber) {
				this._insertLinesAfter(ctx, fromLineNumber, toLineNumber, deltATop, stArtLineNumber);
				ctx.linesLength += toLineNumber - fromLineNumber + 1;
			}

		} else if (ctx.rendLineNumberStArt + ctx.linesLength - 1 > stopLineNumber) {
			// Remove lines After
			const fromLineNumber = MAth.mAx(0, stopLineNumber - ctx.rendLineNumberStArt + 1);
			const toLineNumber = ctx.linesLength - 1;
			const removeCnt = toLineNumber - fromLineNumber + 1;

			if (removeCnt > 0) {
				this._removeLinesAfter(ctx, removeCnt);
				ctx.linesLength -= removeCnt;
			}
		}

		this._finishRendering(ctx, fAlse, deltATop);

		return ctx;
	}

	privAte _renderUntouchedLines(ctx: IRendererContext<T>, stArtIndex: number, endIndex: number, deltATop: number[], deltALN: number): void {
		const rendLineNumberStArt = ctx.rendLineNumberStArt;
		const lines = ctx.lines;

		for (let i = stArtIndex; i <= endIndex; i++) {
			const lineNumber = rendLineNumberStArt + i;
			lines[i].lAyoutLine(lineNumber, deltATop[lineNumber - deltALN]);
		}
	}

	privAte _insertLinesBefore(ctx: IRendererContext<T>, fromLineNumber: number, toLineNumber: number, deltATop: number[], deltALN: number): void {
		const newLines: T[] = [];
		let newLinesLen = 0;
		for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
			newLines[newLinesLen++] = this.host.creAteVisibleLine();
		}
		ctx.lines = newLines.concAt(ctx.lines);
	}

	privAte _removeLinesBefore(ctx: IRendererContext<T>, removeCount: number): void {
		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(0, removeCount);
	}

	privAte _insertLinesAfter(ctx: IRendererContext<T>, fromLineNumber: number, toLineNumber: number, deltATop: number[], deltALN: number): void {
		const newLines: T[] = [];
		let newLinesLen = 0;
		for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
			newLines[newLinesLen++] = this.host.creAteVisibleLine();
		}
		ctx.lines = ctx.lines.concAt(newLines);
	}

	privAte _removeLinesAfter(ctx: IRendererContext<T>, removeCount: number): void {
		const removeIndex = ctx.linesLength - removeCount;

		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[removeIndex + i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(removeIndex, removeCount);
	}

	privAte _finishRenderingNewLines(ctx: IRendererContext<T>, domNodeIsEmpty: booleAn, newLinesHTML: string, wAsNew: booleAn[]): void {
		if (ViewLAyerRenderer._ttPolicy) {
			newLinesHTML = ViewLAyerRenderer._ttPolicy.creAteHTML(newLinesHTML) As unknown As string; // explAins the ugly cAsts -> https://github.com/microsoft/vscode/issues/106396#issuecomment-692625393
		}
		const lAstChild = <HTMLElement>this.domNode.lAstChild;
		if (domNodeIsEmpty || !lAstChild) {
			this.domNode.innerHTML = newLinesHTML;
		} else {
			lAstChild.insertAdjAcentHTML('Afterend', newLinesHTML);
		}

		let currChild = <HTMLElement>this.domNode.lAstChild;
		for (let i = ctx.linesLength - 1; i >= 0; i--) {
			const line = ctx.lines[i];
			if (wAsNew[i]) {
				line.setDomNode(currChild);
				currChild = <HTMLElement>currChild.previousSibling;
			}
		}
	}

	privAte _finishRenderingInvAlidLines(ctx: IRendererContext<T>, invAlidLinesHTML: string, wAsInvAlid: booleAn[]): void {
		const hugeDomNode = document.creAteElement('div');

		if (ViewLAyerRenderer._ttPolicy) {
			invAlidLinesHTML = ViewLAyerRenderer._ttPolicy.creAteHTML(invAlidLinesHTML) As unknown As string;
		}
		hugeDomNode.innerHTML = invAlidLinesHTML;

		for (let i = 0; i < ctx.linesLength; i++) {
			const line = ctx.lines[i];
			if (wAsInvAlid[i]) {
				const source = <HTMLElement>hugeDomNode.firstChild;
				const lineDomNode = line.getDomNode()!;
				lineDomNode.pArentNode!.replAceChild(source, lineDomNode);
				line.setDomNode(source);
			}
		}
	}

	privAte stAtic reAdonly _sb = creAteStringBuilder(100000);

	privAte _finishRendering(ctx: IRendererContext<T>, domNodeIsEmpty: booleAn, deltATop: number[]): void {

		const sb = ViewLAyerRenderer._sb;
		const linesLength = ctx.linesLength;
		const lines = ctx.lines;
		const rendLineNumberStArt = ctx.rendLineNumberStArt;

		const wAsNew: booleAn[] = [];
		{
			sb.reset();
			let hAdNewLine = fAlse;

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wAsNew[i] = fAlse;

				const lineDomNode = line.getDomNode();
				if (lineDomNode) {
					// line is not new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumberStArt, deltATop[i], this.viewportDAtA, sb);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wAsNew[i] = true;
				hAdNewLine = true;
			}

			if (hAdNewLine) {
				this._finishRenderingNewLines(ctx, domNodeIsEmpty, sb.build(), wAsNew);
			}
		}

		{
			sb.reset();

			let hAdInvAlidLine = fAlse;
			const wAsInvAlid: booleAn[] = [];

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wAsInvAlid[i] = fAlse;

				if (wAsNew[i]) {
					// line wAs new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumberStArt, deltATop[i], this.viewportDAtA, sb);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wAsInvAlid[i] = true;
				hAdInvAlidLine = true;
			}

			if (hAdInvAlidLine) {
				this._finishRenderingInvAlidLines(ctx, sb.build(), wAsInvAlid);
			}
		}
	}
}
