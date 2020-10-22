/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IStringBuilder, createStringBuilder } from 'vs/editor/common/core/stringBuilder';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

/**
 * Represents a visiBle line
 */
export interface IVisiBleLine extends ILine {
	getDomNode(): HTMLElement | null;
	setDomNode(domNode: HTMLElement): void;

	/**
	 * Return null if the HTML should not Be touched.
	 * Return the new HTML otherwise.
	 */
	renderLine(lineNumBer: numBer, deltaTop: numBer, viewportData: ViewportData, sB: IStringBuilder): Boolean;

	/**
	 * Layout the line.
	 */
	layoutLine(lineNumBer: numBer, deltaTop: numBer): void;
}

export interface ILine {
	onContentChanged(): void;
	onTokensChanged(): void;
}

export class RenderedLinesCollection<T extends ILine> {
	private readonly _createLine: () => T;
	private _lines!: T[];
	private _rendLineNumBerStart!: numBer;

	constructor(createLine: () => T) {
		this._createLine = createLine;
		this._set(1, []);
	}

	puBlic flush(): void {
		this._set(1, []);
	}

	_set(rendLineNumBerStart: numBer, lines: T[]): void {
		this._lines = lines;
		this._rendLineNumBerStart = rendLineNumBerStart;
	}

	_get(): { rendLineNumBerStart: numBer; lines: T[]; } {
		return {
			rendLineNumBerStart: this._rendLineNumBerStart,
			lines: this._lines
		};
	}

	/**
	 * @returns Inclusive line numBer that is inside this collection
	 */
	puBlic getStartLineNumBer(): numBer {
		return this._rendLineNumBerStart;
	}

	/**
	 * @returns Inclusive line numBer that is inside this collection
	 */
	puBlic getEndLineNumBer(): numBer {
		return this._rendLineNumBerStart + this._lines.length - 1;
	}

	puBlic getCount(): numBer {
		return this._lines.length;
	}

	puBlic getLine(lineNumBer: numBer): T {
		const lineIndex = lineNumBer - this._rendLineNumBerStart;
		if (lineIndex < 0 || lineIndex >= this._lines.length) {
			throw new Error('Illegal value for lineNumBer');
		}
		return this._lines[lineIndex];
	}

	/**
	 * @returns Lines that were removed from this collection
	 */
	puBlic onLinesDeleted(deleteFromLineNumBer: numBer, deleteToLineNumBer: numBer): T[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const startLineNumBer = this.getStartLineNumBer();
		const endLineNumBer = this.getEndLineNumBer();

		if (deleteToLineNumBer < startLineNumBer) {
			// deleting aBove the viewport
			const deleteCnt = deleteToLineNumBer - deleteFromLineNumBer + 1;
			this._rendLineNumBerStart -= deleteCnt;
			return null;
		}

		if (deleteFromLineNumBer > endLineNumBer) {
			// deleted Below the viewport
			return null;
		}

		// Record what needs to Be deleted
		let deleteStartIndex = 0;
		let deleteCount = 0;
		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - this._rendLineNumBerStart;

			if (deleteFromLineNumBer <= lineNumBer && lineNumBer <= deleteToLineNumBer) {
				// this is a line to Be deleted
				if (deleteCount === 0) {
					// this is the first line to Be deleted
					deleteStartIndex = lineIndex;
					deleteCount = 1;
				} else {
					deleteCount++;
				}
			}
		}

		// Adjust this._rendLineNumBerStart for lines deleted aBove
		if (deleteFromLineNumBer < startLineNumBer) {
			// Something was deleted aBove
			let deleteABoveCount = 0;

			if (deleteToLineNumBer < startLineNumBer) {
				// the entire deleted lines are aBove
				deleteABoveCount = deleteToLineNumBer - deleteFromLineNumBer + 1;
			} else {
				deleteABoveCount = startLineNumBer - deleteFromLineNumBer;
			}

			this._rendLineNumBerStart -= deleteABoveCount;
		}

		const deleted = this._lines.splice(deleteStartIndex, deleteCount);
		return deleted;
	}

	puBlic onLinesChanged(changeFromLineNumBer: numBer, changeToLineNumBer: numBer): Boolean {
		if (this.getCount() === 0) {
			// no lines
			return false;
		}

		const startLineNumBer = this.getStartLineNumBer();
		const endLineNumBer = this.getEndLineNumBer();

		let someoneNotified = false;

		for (let changedLineNumBer = changeFromLineNumBer; changedLineNumBer <= changeToLineNumBer; changedLineNumBer++) {
			if (changedLineNumBer >= startLineNumBer && changedLineNumBer <= endLineNumBer) {
				// Notify the line
				this._lines[changedLineNumBer - this._rendLineNumBerStart].onContentChanged();
				someoneNotified = true;
			}
		}

		return someoneNotified;
	}

	puBlic onLinesInserted(insertFromLineNumBer: numBer, insertToLineNumBer: numBer): T[] | null {
		if (this.getCount() === 0) {
			// no lines
			return null;
		}

		const insertCnt = insertToLineNumBer - insertFromLineNumBer + 1;
		const startLineNumBer = this.getStartLineNumBer();
		const endLineNumBer = this.getEndLineNumBer();

		if (insertFromLineNumBer <= startLineNumBer) {
			// inserting aBove the viewport
			this._rendLineNumBerStart += insertCnt;
			return null;
		}

		if (insertFromLineNumBer > endLineNumBer) {
			// inserting Below the viewport
			return null;
		}

		if (insertCnt + insertFromLineNumBer > endLineNumBer) {
			// insert inside the viewport in such a way that all remaining lines are pushed outside
			const deleted = this._lines.splice(insertFromLineNumBer - this._rendLineNumBerStart, endLineNumBer - insertFromLineNumBer + 1);
			return deleted;
		}

		// insert inside the viewport, push out some lines, But not all remaining lines
		const newLines: T[] = [];
		for (let i = 0; i < insertCnt; i++) {
			newLines[i] = this._createLine();
		}
		const insertIndex = insertFromLineNumBer - this._rendLineNumBerStart;
		const BeforeLines = this._lines.slice(0, insertIndex);
		const afterLines = this._lines.slice(insertIndex, this._lines.length - insertCnt);
		const deletedLines = this._lines.slice(this._lines.length - insertCnt, this._lines.length);

		this._lines = BeforeLines.concat(newLines).concat(afterLines);

		return deletedLines;
	}

	puBlic onTokensChanged(ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[]): Boolean {
		if (this.getCount() === 0) {
			// no lines
			return false;
		}

		const startLineNumBer = this.getStartLineNumBer();
		const endLineNumBer = this.getEndLineNumBer();

		let notifiedSomeone = false;
		for (let i = 0, len = ranges.length; i < len; i++) {
			const rng = ranges[i];

			if (rng.toLineNumBer < startLineNumBer || rng.fromLineNumBer > endLineNumBer) {
				// range outside viewport
				continue;
			}

			const from = Math.max(startLineNumBer, rng.fromLineNumBer);
			const to = Math.min(endLineNumBer, rng.toLineNumBer);

			for (let lineNumBer = from; lineNumBer <= to; lineNumBer++) {
				const lineIndex = lineNumBer - this._rendLineNumBerStart;
				this._lines[lineIndex].onTokensChanged();
				notifiedSomeone = true;
			}
		}

		return notifiedSomeone;
	}
}

export interface IVisiBleLinesHost<T extends IVisiBleLine> {
	createVisiBleLine(): T;
}

export class VisiBleLinesCollection<T extends IVisiBleLine> {

	private readonly _host: IVisiBleLinesHost<T>;
	puBlic readonly domNode: FastDomNode<HTMLElement>;
	private readonly _linesCollection: RenderedLinesCollection<T>;

	constructor(host: IVisiBleLinesHost<T>) {
		this._host = host;
		this.domNode = this._createDomNode();
		this._linesCollection = new RenderedLinesCollection<T>(() => this._host.createVisiBleLine());
	}

	private _createDomNode(): FastDomNode<HTMLElement> {
		const domNode = createFastDomNode(document.createElement('div'));
		domNode.setClassName('view-layer');
		domNode.setPosition('aBsolute');
		domNode.domNode.setAttriBute('role', 'presentation');
		domNode.domNode.setAttriBute('aria-hidden', 'true');
		return domNode;
	}

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		if (e.hasChanged(EditorOption.layoutInfo)) {
			return true;
		}
		return false;
	}

	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		this._linesCollection.flush();
		// No need to clear the dom node Because a full .innerHTML will occur in ViewLayerRenderer._render
		return true;
	}

	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return this._linesCollection.onLinesChanged(e.fromLineNumBer, e.toLineNumBer);
	}

	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		const deleted = this._linesCollection.onLinesDeleted(e.fromLineNumBer, e.toLineNumBer);
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

	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		const deleted = this._linesCollection.onLinesInserted(e.fromLineNumBer, e.toLineNumBer);
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

	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return e.scrollTopChanged;
	}

	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		return this._linesCollection.onTokensChanged(e.ranges);
	}

	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// ---- end view event handlers

	puBlic getStartLineNumBer(): numBer {
		return this._linesCollection.getStartLineNumBer();
	}

	puBlic getEndLineNumBer(): numBer {
		return this._linesCollection.getEndLineNumBer();
	}

	puBlic getVisiBleLine(lineNumBer: numBer): T {
		return this._linesCollection.getLine(lineNumBer);
	}

	puBlic renderLines(viewportData: ViewportData): void {

		const inp = this._linesCollection._get();

		const renderer = new ViewLayerRenderer<T>(this.domNode.domNode, this._host, viewportData);

		const ctx: IRendererContext<T> = {
			rendLineNumBerStart: inp.rendLineNumBerStart,
			lines: inp.lines,
			linesLength: inp.lines.length
		};

		// Decide if this render will do a single update (single large .innerHTML) or many updates (inserting/removing dom nodes)
		const resCtx = renderer.render(ctx, viewportData.startLineNumBer, viewportData.endLineNumBer, viewportData.relativeVerticalOffset);

		this._linesCollection._set(resCtx.rendLineNumBerStart, resCtx.lines);
	}
}

interface IRendererContext<T extends IVisiBleLine> {
	rendLineNumBerStart: numBer;
	lines: T[];
	linesLength: numBer;
}

class ViewLayerRenderer<T extends IVisiBleLine> {

	private static _ttPolicy = window.trustedTypes?.createPolicy('editorViewLayer', { createHTML: value => value });

	readonly domNode: HTMLElement;
	readonly host: IVisiBleLinesHost<T>;
	readonly viewportData: ViewportData;

	constructor(domNode: HTMLElement, host: IVisiBleLinesHost<T>, viewportData: ViewportData) {
		this.domNode = domNode;
		this.host = host;
		this.viewportData = viewportData;
	}

	puBlic render(inContext: IRendererContext<T>, startLineNumBer: numBer, stopLineNumBer: numBer, deltaTop: numBer[]): IRendererContext<T> {

		const ctx: IRendererContext<T> = {
			rendLineNumBerStart: inContext.rendLineNumBerStart,
			lines: inContext.lines.slice(0),
			linesLength: inContext.linesLength
		};

		if ((ctx.rendLineNumBerStart + ctx.linesLength - 1 < startLineNumBer) || (stopLineNumBer < ctx.rendLineNumBerStart)) {
			// There is no overlap whatsoever
			ctx.rendLineNumBerStart = startLineNumBer;
			ctx.linesLength = stopLineNumBer - startLineNumBer + 1;
			ctx.lines = [];
			for (let x = startLineNumBer; x <= stopLineNumBer; x++) {
				ctx.lines[x - startLineNumBer] = this.host.createVisiBleLine();
			}
			this._finishRendering(ctx, true, deltaTop);
			return ctx;
		}

		// Update lines which will remain untouched
		this._renderUntouchedLines(
			ctx,
			Math.max(startLineNumBer - ctx.rendLineNumBerStart, 0),
			Math.min(stopLineNumBer - ctx.rendLineNumBerStart, ctx.linesLength - 1),
			deltaTop,
			startLineNumBer
		);

		if (ctx.rendLineNumBerStart > startLineNumBer) {
			// Insert lines Before
			const fromLineNumBer = startLineNumBer;
			const toLineNumBer = Math.min(stopLineNumBer, ctx.rendLineNumBerStart - 1);
			if (fromLineNumBer <= toLineNumBer) {
				this._insertLinesBefore(ctx, fromLineNumBer, toLineNumBer, deltaTop, startLineNumBer);
				ctx.linesLength += toLineNumBer - fromLineNumBer + 1;
			}
		} else if (ctx.rendLineNumBerStart < startLineNumBer) {
			// Remove lines Before
			const removeCnt = Math.min(ctx.linesLength, startLineNumBer - ctx.rendLineNumBerStart);
			if (removeCnt > 0) {
				this._removeLinesBefore(ctx, removeCnt);
				ctx.linesLength -= removeCnt;
			}
		}

		ctx.rendLineNumBerStart = startLineNumBer;

		if (ctx.rendLineNumBerStart + ctx.linesLength - 1 < stopLineNumBer) {
			// Insert lines after
			const fromLineNumBer = ctx.rendLineNumBerStart + ctx.linesLength;
			const toLineNumBer = stopLineNumBer;

			if (fromLineNumBer <= toLineNumBer) {
				this._insertLinesAfter(ctx, fromLineNumBer, toLineNumBer, deltaTop, startLineNumBer);
				ctx.linesLength += toLineNumBer - fromLineNumBer + 1;
			}

		} else if (ctx.rendLineNumBerStart + ctx.linesLength - 1 > stopLineNumBer) {
			// Remove lines after
			const fromLineNumBer = Math.max(0, stopLineNumBer - ctx.rendLineNumBerStart + 1);
			const toLineNumBer = ctx.linesLength - 1;
			const removeCnt = toLineNumBer - fromLineNumBer + 1;

			if (removeCnt > 0) {
				this._removeLinesAfter(ctx, removeCnt);
				ctx.linesLength -= removeCnt;
			}
		}

		this._finishRendering(ctx, false, deltaTop);

		return ctx;
	}

	private _renderUntouchedLines(ctx: IRendererContext<T>, startIndex: numBer, endIndex: numBer, deltaTop: numBer[], deltaLN: numBer): void {
		const rendLineNumBerStart = ctx.rendLineNumBerStart;
		const lines = ctx.lines;

		for (let i = startIndex; i <= endIndex; i++) {
			const lineNumBer = rendLineNumBerStart + i;
			lines[i].layoutLine(lineNumBer, deltaTop[lineNumBer - deltaLN]);
		}
	}

	private _insertLinesBefore(ctx: IRendererContext<T>, fromLineNumBer: numBer, toLineNumBer: numBer, deltaTop: numBer[], deltaLN: numBer): void {
		const newLines: T[] = [];
		let newLinesLen = 0;
		for (let lineNumBer = fromLineNumBer; lineNumBer <= toLineNumBer; lineNumBer++) {
			newLines[newLinesLen++] = this.host.createVisiBleLine();
		}
		ctx.lines = newLines.concat(ctx.lines);
	}

	private _removeLinesBefore(ctx: IRendererContext<T>, removeCount: numBer): void {
		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(0, removeCount);
	}

	private _insertLinesAfter(ctx: IRendererContext<T>, fromLineNumBer: numBer, toLineNumBer: numBer, deltaTop: numBer[], deltaLN: numBer): void {
		const newLines: T[] = [];
		let newLinesLen = 0;
		for (let lineNumBer = fromLineNumBer; lineNumBer <= toLineNumBer; lineNumBer++) {
			newLines[newLinesLen++] = this.host.createVisiBleLine();
		}
		ctx.lines = ctx.lines.concat(newLines);
	}

	private _removeLinesAfter(ctx: IRendererContext<T>, removeCount: numBer): void {
		const removeIndex = ctx.linesLength - removeCount;

		for (let i = 0; i < removeCount; i++) {
			const lineDomNode = ctx.lines[removeIndex + i].getDomNode();
			if (lineDomNode) {
				this.domNode.removeChild(lineDomNode);
			}
		}
		ctx.lines.splice(removeIndex, removeCount);
	}

	private _finishRenderingNewLines(ctx: IRendererContext<T>, domNodeIsEmpty: Boolean, newLinesHTML: string, wasNew: Boolean[]): void {
		if (ViewLayerRenderer._ttPolicy) {
			newLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(newLinesHTML) as unknown as string; // explains the ugly casts -> https://githuB.com/microsoft/vscode/issues/106396#issuecomment-692625393
		}
		const lastChild = <HTMLElement>this.domNode.lastChild;
		if (domNodeIsEmpty || !lastChild) {
			this.domNode.innerHTML = newLinesHTML;
		} else {
			lastChild.insertAdjacentHTML('afterend', newLinesHTML);
		}

		let currChild = <HTMLElement>this.domNode.lastChild;
		for (let i = ctx.linesLength - 1; i >= 0; i--) {
			const line = ctx.lines[i];
			if (wasNew[i]) {
				line.setDomNode(currChild);
				currChild = <HTMLElement>currChild.previousSiBling;
			}
		}
	}

	private _finishRenderingInvalidLines(ctx: IRendererContext<T>, invalidLinesHTML: string, wasInvalid: Boolean[]): void {
		const hugeDomNode = document.createElement('div');

		if (ViewLayerRenderer._ttPolicy) {
			invalidLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(invalidLinesHTML) as unknown as string;
		}
		hugeDomNode.innerHTML = invalidLinesHTML;

		for (let i = 0; i < ctx.linesLength; i++) {
			const line = ctx.lines[i];
			if (wasInvalid[i]) {
				const source = <HTMLElement>hugeDomNode.firstChild;
				const lineDomNode = line.getDomNode()!;
				lineDomNode.parentNode!.replaceChild(source, lineDomNode);
				line.setDomNode(source);
			}
		}
	}

	private static readonly _sB = createStringBuilder(100000);

	private _finishRendering(ctx: IRendererContext<T>, domNodeIsEmpty: Boolean, deltaTop: numBer[]): void {

		const sB = ViewLayerRenderer._sB;
		const linesLength = ctx.linesLength;
		const lines = ctx.lines;
		const rendLineNumBerStart = ctx.rendLineNumBerStart;

		const wasNew: Boolean[] = [];
		{
			sB.reset();
			let hadNewLine = false;

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wasNew[i] = false;

				const lineDomNode = line.getDomNode();
				if (lineDomNode) {
					// line is not new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumBerStart, deltaTop[i], this.viewportData, sB);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wasNew[i] = true;
				hadNewLine = true;
			}

			if (hadNewLine) {
				this._finishRenderingNewLines(ctx, domNodeIsEmpty, sB.Build(), wasNew);
			}
		}

		{
			sB.reset();

			let hadInvalidLine = false;
			const wasInvalid: Boolean[] = [];

			for (let i = 0; i < linesLength; i++) {
				const line = lines[i];
				wasInvalid[i] = false;

				if (wasNew[i]) {
					// line was new
					continue;
				}

				const renderResult = line.renderLine(i + rendLineNumBerStart, deltaTop[i], this.viewportData, sB);
				if (!renderResult) {
					// line does not need rendering
					continue;
				}

				wasInvalid[i] = true;
				hadInvalidLine = true;
			}

			if (hadInvalidLine) {
				this._finishRenderingInvalidLines(ctx, sB.Build(), wasInvalid);
			}
		}
	}
}
