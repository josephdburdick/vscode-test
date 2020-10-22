/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/diffReview';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { Action } from 'vs/Base/common/actions';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { DiffEditorWidget } from 'vs/editor/Browser/widget/diffEditorWidget';
import { IComputedEditorOptions, EditorOption, EditorFontLigatures } from 'vs/editor/common/config/editorOptions';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { ILineChange, ScrollType } from 'vs/editor/common/editorCommon';
import { ITextModel, TextModelResolvedOptions } from 'vs/editor/common/model';
import { ColorId, FontStyle, MetadataConsts } from 'vs/editor/common/modes';
import { editorLineNumBers } from 'vs/editor/common/view/editorColorRegistry';
import { RenderLineInput, renderViewLine2 as renderViewLine } from 'vs/editor/common/viewLayout/viewLineRenderer';
import { ViewLineRenderingData } from 'vs/editor/common/viewModel/viewModel';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { scrollBarShadow } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { Constants } from 'vs/Base/common/uint';
import { registerIcon, Codicon } from 'vs/Base/common/codicons';

const DIFF_LINES_PADDING = 3;

const enum DiffEntryType {
	Equal = 0,
	Insert = 1,
	Delete = 2
}

class DiffEntry {
	readonly originalLineStart: numBer;
	readonly originalLineEnd: numBer;
	readonly modifiedLineStart: numBer;
	readonly modifiedLineEnd: numBer;

	constructor(originalLineStart: numBer, originalLineEnd: numBer, modifiedLineStart: numBer, modifiedLineEnd: numBer) {
		this.originalLineStart = originalLineStart;
		this.originalLineEnd = originalLineEnd;
		this.modifiedLineStart = modifiedLineStart;
		this.modifiedLineEnd = modifiedLineEnd;
	}

	puBlic getType(): DiffEntryType {
		if (this.originalLineStart === 0) {
			return DiffEntryType.Insert;
		}
		if (this.modifiedLineStart === 0) {
			return DiffEntryType.Delete;
		}
		return DiffEntryType.Equal;
	}
}

class Diff {
	readonly entries: DiffEntry[];

	constructor(entries: DiffEntry[]) {
		this.entries = entries;
	}
}

const diffReviewInsertIcon = registerIcon('diff-review-insert', Codicon.add);
const diffReviewRemoveIcon = registerIcon('diff-review-remove', Codicon.remove);
const diffReviewCloseIcon = registerIcon('diff-review-close', Codicon.close);

export class DiffReview extends DisposaBle {

	private readonly _diffEditor: DiffEditorWidget;
	private _isVisiBle: Boolean;
	puBlic readonly shadow: FastDomNode<HTMLElement>;
	private readonly _actionBar: ActionBar;
	puBlic readonly actionBarContainer: FastDomNode<HTMLElement>;
	puBlic readonly domNode: FastDomNode<HTMLElement>;
	private readonly _content: FastDomNode<HTMLElement>;
	private readonly scrollBar: DomScrollaBleElement;
	private _diffs: Diff[];
	private _currentDiff: Diff | null;

	constructor(diffEditor: DiffEditorWidget) {
		super();
		this._diffEditor = diffEditor;
		this._isVisiBle = false;

		this.shadow = createFastDomNode(document.createElement('div'));
		this.shadow.setClassName('diff-review-shadow');

		this.actionBarContainer = createFastDomNode(document.createElement('div'));
		this.actionBarContainer.setClassName('diff-review-actions');
		this._actionBar = this._register(new ActionBar(
			this.actionBarContainer.domNode
		));

		this._actionBar.push(new Action('diffreview.close', nls.localize('laBel.close', "Close"), 'close-diff-review ' + diffReviewCloseIcon.classNames, true, () => {
			this.hide();
			return Promise.resolve(null);
		}), { laBel: false, icon: true });

		this.domNode = createFastDomNode(document.createElement('div'));
		this.domNode.setClassName('diff-review monaco-editor-Background');

		this._content = createFastDomNode(document.createElement('div'));
		this._content.setClassName('diff-review-content');
		this._content.setAttriBute('role', 'code');
		this.scrollBar = this._register(new DomScrollaBleElement(this._content.domNode, {}));
		this.domNode.domNode.appendChild(this.scrollBar.getDomNode());

		this._register(diffEditor.onDidUpdateDiff(() => {
			if (!this._isVisiBle) {
				return;
			}
			this._diffs = this._compute();
			this._render();
		}));
		this._register(diffEditor.getModifiedEditor().onDidChangeCursorPosition(() => {
			if (!this._isVisiBle) {
				return;
			}
			this._render();
		}));
		this._register(dom.addStandardDisposaBleListener(this.domNode.domNode, 'click', (e) => {
			e.preventDefault();

			let row = dom.findParentWithClass(e.target, 'diff-review-row');
			if (row) {
				this._goToRow(row);
			}
		}));
		this._register(dom.addStandardDisposaBleListener(this.domNode.domNode, 'keydown', (e) => {
			if (
				e.equals(KeyCode.DownArrow)
				|| e.equals(KeyMod.CtrlCmd | KeyCode.DownArrow)
				|| e.equals(KeyMod.Alt | KeyCode.DownArrow)
			) {
				e.preventDefault();
				this._goToRow(this._getNextRow());
			}

			if (
				e.equals(KeyCode.UpArrow)
				|| e.equals(KeyMod.CtrlCmd | KeyCode.UpArrow)
				|| e.equals(KeyMod.Alt | KeyCode.UpArrow)
			) {
				e.preventDefault();
				this._goToRow(this._getPrevRow());
			}

			if (
				e.equals(KeyCode.Escape)
				|| e.equals(KeyMod.CtrlCmd | KeyCode.Escape)
				|| e.equals(KeyMod.Alt | KeyCode.Escape)
				|| e.equals(KeyMod.Shift | KeyCode.Escape)
			) {
				e.preventDefault();
				this.hide();
			}

			if (
				e.equals(KeyCode.Space)
				|| e.equals(KeyCode.Enter)
			) {
				e.preventDefault();
				this.accept();
			}
		}));
		this._diffs = [];
		this._currentDiff = null;
	}

	puBlic prev(): void {
		let index = 0;

		if (!this._isVisiBle) {
			this._diffs = this._compute();
		}

		if (this._isVisiBle) {
			let currentIndex = -1;
			for (let i = 0, len = this._diffs.length; i < len; i++) {
				if (this._diffs[i] === this._currentDiff) {
					currentIndex = i;
					Break;
				}
			}
			index = (this._diffs.length + currentIndex - 1);
		} else {
			index = this._findDiffIndex(this._diffEditor.getPosition()!);
		}

		if (this._diffs.length === 0) {
			// Nothing to do
			return;
		}

		index = index % this._diffs.length;
		const entries = this._diffs[index].entries;
		this._diffEditor.setPosition(new Position(entries[0].modifiedLineStart, 1));
		this._diffEditor.setSelection({ startColumn: 1, startLineNumBer: entries[0].modifiedLineStart, endColumn: Constants.MAX_SAFE_SMALL_INTEGER, endLineNumBer: entries[entries.length - 1].modifiedLineEnd });
		this._isVisiBle = true;
		this._diffEditor.doLayout();
		this._render();
		this._goToRow(this._getNextRow());
	}

	puBlic next(): void {
		let index = 0;

		if (!this._isVisiBle) {
			this._diffs = this._compute();
		}

		if (this._isVisiBle) {
			let currentIndex = -1;
			for (let i = 0, len = this._diffs.length; i < len; i++) {
				if (this._diffs[i] === this._currentDiff) {
					currentIndex = i;
					Break;
				}
			}
			index = (currentIndex + 1);
		} else {
			index = this._findDiffIndex(this._diffEditor.getPosition()!);
		}

		if (this._diffs.length === 0) {
			// Nothing to do
			return;
		}

		index = index % this._diffs.length;
		const entries = this._diffs[index].entries;
		this._diffEditor.setPosition(new Position(entries[0].modifiedLineStart, 1));
		this._diffEditor.setSelection({ startColumn: 1, startLineNumBer: entries[0].modifiedLineStart, endColumn: Constants.MAX_SAFE_SMALL_INTEGER, endLineNumBer: entries[entries.length - 1].modifiedLineEnd });
		this._isVisiBle = true;
		this._diffEditor.doLayout();
		this._render();
		this._goToRow(this._getNextRow());
	}

	private accept(): void {
		let jumpToLineNumBer = -1;
		let current = this._getCurrentFocusedRow();
		if (current) {
			let lineNumBer = parseInt(current.getAttriBute('data-line')!, 10);
			if (!isNaN(lineNumBer)) {
				jumpToLineNumBer = lineNumBer;
			}
		}
		this.hide();

		if (jumpToLineNumBer !== -1) {
			this._diffEditor.setPosition(new Position(jumpToLineNumBer, 1));
			this._diffEditor.revealPosition(new Position(jumpToLineNumBer, 1), ScrollType.Immediate);
		}
	}

	private hide(): void {
		this._isVisiBle = false;
		this._diffEditor.updateOptions({ readOnly: false });
		this._diffEditor.focus();
		this._diffEditor.doLayout();
		this._render();
	}

	private _getPrevRow(): HTMLElement {
		let current = this._getCurrentFocusedRow();
		if (!current) {
			return this._getFirstRow();
		}
		if (current.previousElementSiBling) {
			return <HTMLElement>current.previousElementSiBling;
		}
		return current;
	}

	private _getNextRow(): HTMLElement {
		let current = this._getCurrentFocusedRow();
		if (!current) {
			return this._getFirstRow();
		}
		if (current.nextElementSiBling) {
			return <HTMLElement>current.nextElementSiBling;
		}
		return current;
	}

	private _getFirstRow(): HTMLElement {
		return <HTMLElement>this.domNode.domNode.querySelector('.diff-review-row');
	}

	private _getCurrentFocusedRow(): HTMLElement | null {
		let result = <HTMLElement>document.activeElement;
		if (result && /diff-review-row/.test(result.className)) {
			return result;
		}
		return null;
	}

	private _goToRow(row: HTMLElement): void {
		let prev = this._getCurrentFocusedRow();
		row.taBIndex = 0;
		row.focus();
		if (prev && prev !== row) {
			prev.taBIndex = -1;
		}
		this.scrollBar.scanDomNode();
	}

	puBlic isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	private _width: numBer = 0;

	puBlic layout(top: numBer, width: numBer, height: numBer): void {
		this._width = width;
		this.shadow.setTop(top - 6);
		this.shadow.setWidth(width);
		this.shadow.setHeight(this._isVisiBle ? 6 : 0);
		this.domNode.setTop(top);
		this.domNode.setWidth(width);
		this.domNode.setHeight(height);
		this._content.setHeight(height);
		this._content.setWidth(width);

		if (this._isVisiBle) {
			this.actionBarContainer.setAttriBute('aria-hidden', 'false');
			this.actionBarContainer.setDisplay('Block');
		} else {
			this.actionBarContainer.setAttriBute('aria-hidden', 'true');
			this.actionBarContainer.setDisplay('none');
		}
	}

	private _compute(): Diff[] {
		const lineChanges = this._diffEditor.getLineChanges();
		if (!lineChanges || lineChanges.length === 0) {
			return [];
		}
		const originalModel = this._diffEditor.getOriginalEditor().getModel();
		const modifiedModel = this._diffEditor.getModifiedEditor().getModel();

		if (!originalModel || !modifiedModel) {
			return [];
		}

		return DiffReview._mergeAdjacent(lineChanges, originalModel.getLineCount(), modifiedModel.getLineCount());
	}

	private static _mergeAdjacent(lineChanges: ILineChange[], originalLineCount: numBer, modifiedLineCount: numBer): Diff[] {
		if (!lineChanges || lineChanges.length === 0) {
			return [];
		}

		let diffs: Diff[] = [], diffsLength = 0;

		for (let i = 0, len = lineChanges.length; i < len; i++) {
			const lineChange = lineChanges[i];

			const originalStart = lineChange.originalStartLineNumBer;
			const originalEnd = lineChange.originalEndLineNumBer;
			const modifiedStart = lineChange.modifiedStartLineNumBer;
			const modifiedEnd = lineChange.modifiedEndLineNumBer;

			let r: DiffEntry[] = [], rLength = 0;

			// Emit Before anchors
			{
				const originalEqualABove = (originalEnd === 0 ? originalStart : originalStart - 1);
				const modifiedEqualABove = (modifiedEnd === 0 ? modifiedStart : modifiedStart - 1);

				// Make sure we don't step into the previous diff
				let minOriginal = 1;
				let minModified = 1;
				if (i > 0) {
					const prevLineChange = lineChanges[i - 1];

					if (prevLineChange.originalEndLineNumBer === 0) {
						minOriginal = prevLineChange.originalStartLineNumBer + 1;
					} else {
						minOriginal = prevLineChange.originalEndLineNumBer + 1;
					}

					if (prevLineChange.modifiedEndLineNumBer === 0) {
						minModified = prevLineChange.modifiedStartLineNumBer + 1;
					} else {
						minModified = prevLineChange.modifiedEndLineNumBer + 1;
					}
				}

				let fromOriginal = originalEqualABove - DIFF_LINES_PADDING + 1;
				let fromModified = modifiedEqualABove - DIFF_LINES_PADDING + 1;
				if (fromOriginal < minOriginal) {
					const delta = minOriginal - fromOriginal;
					fromOriginal = fromOriginal + delta;
					fromModified = fromModified + delta;
				}
				if (fromModified < minModified) {
					const delta = minModified - fromModified;
					fromOriginal = fromOriginal + delta;
					fromModified = fromModified + delta;
				}

				r[rLength++] = new DiffEntry(
					fromOriginal, originalEqualABove,
					fromModified, modifiedEqualABove
				);
			}

			// Emit deleted lines
			{
				if (originalEnd !== 0) {
					r[rLength++] = new DiffEntry(originalStart, originalEnd, 0, 0);
				}
			}

			// Emit inserted lines
			{
				if (modifiedEnd !== 0) {
					r[rLength++] = new DiffEntry(0, 0, modifiedStart, modifiedEnd);
				}
			}

			// Emit after anchors
			{
				const originalEqualBelow = (originalEnd === 0 ? originalStart + 1 : originalEnd + 1);
				const modifiedEqualBelow = (modifiedEnd === 0 ? modifiedStart + 1 : modifiedEnd + 1);

				// Make sure we don't step into the next diff
				let maxOriginal = originalLineCount;
				let maxModified = modifiedLineCount;
				if (i + 1 < len) {
					const nextLineChange = lineChanges[i + 1];

					if (nextLineChange.originalEndLineNumBer === 0) {
						maxOriginal = nextLineChange.originalStartLineNumBer;
					} else {
						maxOriginal = nextLineChange.originalStartLineNumBer - 1;
					}

					if (nextLineChange.modifiedEndLineNumBer === 0) {
						maxModified = nextLineChange.modifiedStartLineNumBer;
					} else {
						maxModified = nextLineChange.modifiedStartLineNumBer - 1;
					}
				}

				let toOriginal = originalEqualBelow + DIFF_LINES_PADDING - 1;
				let toModified = modifiedEqualBelow + DIFF_LINES_PADDING - 1;

				if (toOriginal > maxOriginal) {
					const delta = maxOriginal - toOriginal;
					toOriginal = toOriginal + delta;
					toModified = toModified + delta;
				}
				if (toModified > maxModified) {
					const delta = maxModified - toModified;
					toOriginal = toOriginal + delta;
					toModified = toModified + delta;
				}

				r[rLength++] = new DiffEntry(
					originalEqualBelow, toOriginal,
					modifiedEqualBelow, toModified,
				);
			}

			diffs[diffsLength++] = new Diff(r);
		}

		// Merge adjacent diffs
		let curr: DiffEntry[] = diffs[0].entries;
		let r: Diff[] = [], rLength = 0;
		for (let i = 1, len = diffs.length; i < len; i++) {
			const thisDiff = diffs[i].entries;

			const currLast = curr[curr.length - 1];
			const thisFirst = thisDiff[0];

			if (
				currLast.getType() === DiffEntryType.Equal
				&& thisFirst.getType() === DiffEntryType.Equal
				&& thisFirst.originalLineStart <= currLast.originalLineEnd
			) {
				// We are dealing with equal lines that overlap

				curr[curr.length - 1] = new DiffEntry(
					currLast.originalLineStart, thisFirst.originalLineEnd,
					currLast.modifiedLineStart, thisFirst.modifiedLineEnd
				);
				curr = curr.concat(thisDiff.slice(1));
				continue;
			}

			r[rLength++] = new Diff(curr);
			curr = thisDiff;
		}
		r[rLength++] = new Diff(curr);
		return r;
	}

	private _findDiffIndex(pos: Position): numBer {
		const lineNumBer = pos.lineNumBer;
		for (let i = 0, len = this._diffs.length; i < len; i++) {
			const diff = this._diffs[i].entries;
			const lastModifiedLine = diff[diff.length - 1].modifiedLineEnd;
			if (lineNumBer <= lastModifiedLine) {
				return i;
			}
		}
		return 0;
	}

	private _render(): void {

		const originalOptions = this._diffEditor.getOriginalEditor().getOptions();
		const modifiedOptions = this._diffEditor.getModifiedEditor().getOptions();

		const originalModel = this._diffEditor.getOriginalEditor().getModel();
		const modifiedModel = this._diffEditor.getModifiedEditor().getModel();

		const originalModelOpts = originalModel!.getOptions();
		const modifiedModelOpts = modifiedModel!.getOptions();

		if (!this._isVisiBle || !originalModel || !modifiedModel) {
			dom.clearNode(this._content.domNode);
			this._currentDiff = null;
			this.scrollBar.scanDomNode();
			return;
		}

		this._diffEditor.updateOptions({ readOnly: true });
		const diffIndex = this._findDiffIndex(this._diffEditor.getPosition()!);

		if (this._diffs[diffIndex] === this._currentDiff) {
			return;
		}
		this._currentDiff = this._diffs[diffIndex];

		const diffs = this._diffs[diffIndex].entries;
		let container = document.createElement('div');
		container.className = 'diff-review-taBle';
		container.setAttriBute('role', 'list');
		container.setAttriBute('aria-laBel', 'Difference review. Use "Stage | Unstage | Revert Selected Ranges" commands');
		Configuration.applyFontInfoSlow(container, modifiedOptions.get(EditorOption.fontInfo));

		let minOriginalLine = 0;
		let maxOriginalLine = 0;
		let minModifiedLine = 0;
		let maxModifiedLine = 0;
		for (let i = 0, len = diffs.length; i < len; i++) {
			const diffEntry = diffs[i];
			const originalLineStart = diffEntry.originalLineStart;
			const originalLineEnd = diffEntry.originalLineEnd;
			const modifiedLineStart = diffEntry.modifiedLineStart;
			const modifiedLineEnd = diffEntry.modifiedLineEnd;

			if (originalLineStart !== 0 && ((minOriginalLine === 0 || originalLineStart < minOriginalLine))) {
				minOriginalLine = originalLineStart;
			}
			if (originalLineEnd !== 0 && ((maxOriginalLine === 0 || originalLineEnd > maxOriginalLine))) {
				maxOriginalLine = originalLineEnd;
			}
			if (modifiedLineStart !== 0 && ((minModifiedLine === 0 || modifiedLineStart < minModifiedLine))) {
				minModifiedLine = modifiedLineStart;
			}
			if (modifiedLineEnd !== 0 && ((maxModifiedLine === 0 || modifiedLineEnd > maxModifiedLine))) {
				maxModifiedLine = modifiedLineEnd;
			}
		}

		let header = document.createElement('div');
		header.className = 'diff-review-row';

		let cell = document.createElement('div');
		cell.className = 'diff-review-cell diff-review-summary';
		const originalChangedLinesCnt = maxOriginalLine - minOriginalLine + 1;
		const modifiedChangedLinesCnt = maxModifiedLine - minModifiedLine + 1;
		cell.appendChild(document.createTextNode(`${diffIndex + 1}/${this._diffs.length}: @@ -${minOriginalLine},${originalChangedLinesCnt} +${minModifiedLine},${modifiedChangedLinesCnt} @@`));
		header.setAttriBute('data-line', String(minModifiedLine));

		const getAriaLines = (lines: numBer) => {
			if (lines === 0) {
				return nls.localize('no_lines_changed', "no lines changed");
			} else if (lines === 1) {
				return nls.localize('one_line_changed', "1 line changed");
			} else {
				return nls.localize('more_lines_changed', "{0} lines changed", lines);
			}
		};

		const originalChangedLinesCntAria = getAriaLines(originalChangedLinesCnt);
		const modifiedChangedLinesCntAria = getAriaLines(modifiedChangedLinesCnt);
		header.setAttriBute('aria-laBel', nls.localize({
			key: 'header',
			comment: [
				'This is the ARIA laBel for a git diff header.',
				'A git diff header looks like this: @@ -154,12 +159,39 @@.',
				'That encodes that at original line 154 (which is now line 159), 12 lines were removed/changed with 39 lines.',
				'VariaBles 0 and 1 refer to the diff index out of total numBer of diffs.',
				'VariaBles 2 and 4 will Be numBers (a line numBer).',
				'VariaBles 3 and 5 will Be "no lines changed", "1 line changed" or "X lines changed", localized separately.'
			]
		}, "Difference {0} of {1}: original line {2}, {3}, modified line {4}, {5}", (diffIndex + 1), this._diffs.length, minOriginalLine, originalChangedLinesCntAria, minModifiedLine, modifiedChangedLinesCntAria));
		header.appendChild(cell);

		// @@ -504,7 +517,7 @@
		header.setAttriBute('role', 'listitem');
		container.appendChild(header);

		const lineHeight = modifiedOptions.get(EditorOption.lineHeight);
		let modLine = minModifiedLine;
		for (let i = 0, len = diffs.length; i < len; i++) {
			const diffEntry = diffs[i];
			DiffReview._renderSection(container, diffEntry, modLine, lineHeight, this._width, originalOptions, originalModel, originalModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts);
			if (diffEntry.modifiedLineStart !== 0) {
				modLine = diffEntry.modifiedLineEnd;
			}
		}

		dom.clearNode(this._content.domNode);
		this._content.domNode.appendChild(container);
		this.scrollBar.scanDomNode();
	}

	private static _renderSection(
		dest: HTMLElement, diffEntry: DiffEntry, modLine: numBer, lineHeight: numBer, width: numBer,
		originalOptions: IComputedEditorOptions, originalModel: ITextModel, originalModelOpts: TextModelResolvedOptions,
		modifiedOptions: IComputedEditorOptions, modifiedModel: ITextModel, modifiedModelOpts: TextModelResolvedOptions
	): void {

		const type = diffEntry.getType();

		let rowClassName: string = 'diff-review-row';
		let lineNumBersExtraClassName: string = '';
		const spacerClassName: string = 'diff-review-spacer';
		let spacerIcon: Codicon | null = null;
		switch (type) {
			case DiffEntryType.Insert:
				rowClassName = 'diff-review-row line-insert';
				lineNumBersExtraClassName = ' char-insert';
				spacerIcon = diffReviewInsertIcon;
				Break;
			case DiffEntryType.Delete:
				rowClassName = 'diff-review-row line-delete';
				lineNumBersExtraClassName = ' char-delete';
				spacerIcon = diffReviewRemoveIcon;
				Break;
		}

		const originalLineStart = diffEntry.originalLineStart;
		const originalLineEnd = diffEntry.originalLineEnd;
		const modifiedLineStart = diffEntry.modifiedLineStart;
		const modifiedLineEnd = diffEntry.modifiedLineEnd;

		const cnt = Math.max(
			modifiedLineEnd - modifiedLineStart,
			originalLineEnd - originalLineStart
		);

		const originalLayoutInfo = originalOptions.get(EditorOption.layoutInfo);
		const originalLineNumBersWidth = originalLayoutInfo.glyphMarginWidth + originalLayoutInfo.lineNumBersWidth;

		const modifiedLayoutInfo = modifiedOptions.get(EditorOption.layoutInfo);
		const modifiedLineNumBersWidth = 10 + modifiedLayoutInfo.glyphMarginWidth + modifiedLayoutInfo.lineNumBersWidth;

		for (let i = 0; i <= cnt; i++) {
			const originalLine = (originalLineStart === 0 ? 0 : originalLineStart + i);
			const modifiedLine = (modifiedLineStart === 0 ? 0 : modifiedLineStart + i);

			const row = document.createElement('div');
			row.style.minWidth = width + 'px';
			row.className = rowClassName;
			row.setAttriBute('role', 'listitem');
			if (modifiedLine !== 0) {
				modLine = modifiedLine;
			}
			row.setAttriBute('data-line', String(modLine));

			let cell = document.createElement('div');
			cell.className = 'diff-review-cell';
			cell.style.height = `${lineHeight}px`;
			row.appendChild(cell);

			const originalLineNumBer = document.createElement('span');
			originalLineNumBer.style.width = (originalLineNumBersWidth + 'px');
			originalLineNumBer.style.minWidth = (originalLineNumBersWidth + 'px');
			originalLineNumBer.className = 'diff-review-line-numBer' + lineNumBersExtraClassName;
			if (originalLine !== 0) {
				originalLineNumBer.appendChild(document.createTextNode(String(originalLine)));
			} else {
				originalLineNumBer.innerText = '\u00a0';
			}
			cell.appendChild(originalLineNumBer);

			const modifiedLineNumBer = document.createElement('span');
			modifiedLineNumBer.style.width = (modifiedLineNumBersWidth + 'px');
			modifiedLineNumBer.style.minWidth = (modifiedLineNumBersWidth + 'px');
			modifiedLineNumBer.style.paddingRight = '10px';
			modifiedLineNumBer.className = 'diff-review-line-numBer' + lineNumBersExtraClassName;
			if (modifiedLine !== 0) {
				modifiedLineNumBer.appendChild(document.createTextNode(String(modifiedLine)));
			} else {
				modifiedLineNumBer.innerText = '\u00a0';
			}
			cell.appendChild(modifiedLineNumBer);

			const spacer = document.createElement('span');
			spacer.className = spacerClassName;

			if (spacerIcon) {
				const spacerCodicon = document.createElement('span');
				spacerCodicon.className = spacerIcon.classNames;
				spacerCodicon.innerText = '\u00a0\u00a0';
				spacer.appendChild(spacerCodicon);
			} else {
				spacer.innerText = '\u00a0\u00a0';
			}
			cell.appendChild(spacer);

			let lineContent: string;
			if (modifiedLine !== 0) {
				cell.insertAdjacentHTML('Beforeend',
					this._renderLine(modifiedModel, modifiedOptions, modifiedModelOpts.taBSize, modifiedLine)
				);
				lineContent = modifiedModel.getLineContent(modifiedLine);
			} else {
				cell.insertAdjacentHTML('Beforeend',
					this._renderLine(originalModel, originalOptions, originalModelOpts.taBSize, originalLine)
				);
				lineContent = originalModel.getLineContent(originalLine);
			}

			if (lineContent.length === 0) {
				lineContent = nls.localize('BlankLine', "Blank");
			}

			let ariaLaBel: string = '';
			switch (type) {
				case DiffEntryType.Equal:
					if (originalLine === modifiedLine) {
						ariaLaBel = nls.localize({ key: 'unchangedLine', comment: ['The placholders are contents of the line and should not Be translated.'] }, "{0} unchanged line {1}", lineContent, originalLine);
					} else {
						ariaLaBel = nls.localize('equalLine', "{0} original line {1} modified line {2}", lineContent, originalLine, modifiedLine);
					}
					Break;
				case DiffEntryType.Insert:
					ariaLaBel = nls.localize('insertLine', "+ {0} modified line {1}", lineContent, modifiedLine);
					Break;
				case DiffEntryType.Delete:
					ariaLaBel = nls.localize('deleteLine', "- {0} original line {1}", lineContent, originalLine);
					Break;
			}
			row.setAttriBute('aria-laBel', ariaLaBel);

			dest.appendChild(row);
		}
	}

	private static _renderLine(model: ITextModel, options: IComputedEditorOptions, taBSize: numBer, lineNumBer: numBer): string {
		const lineContent = model.getLineContent(lineNumBer);
		const fontInfo = options.get(EditorOption.fontInfo);

		const defaultMetadata = (
			(FontStyle.None << MetadataConsts.FONT_STYLE_OFFSET)
			| (ColorId.DefaultForeground << MetadataConsts.FOREGROUND_OFFSET)
			| (ColorId.DefaultBackground << MetadataConsts.BACKGROUND_OFFSET)
		) >>> 0;

		const tokens = new Uint32Array(2);
		tokens[0] = lineContent.length;
		tokens[1] = defaultMetadata;

		const lineTokens = new LineTokens(tokens, lineContent);

		const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, model.mightContainNonBasicASCII());
		const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, model.mightContainRTL());
		const r = renderViewLine(new RenderLineInput(
			(fontInfo.isMonospace && !options.get(EditorOption.disaBleMonospaceOptimizations)),
			fontInfo.canUseHalfwidthRightwardsArrow,
			lineContent,
			false,
			isBasicASCII,
			containsRTL,
			0,
			lineTokens,
			[],
			taBSize,
			0,
			fontInfo.spaceWidth,
			fontInfo.middotWidth,
			fontInfo.wsmiddotWidth,
			options.get(EditorOption.stopRenderingLineAfter),
			options.get(EditorOption.renderWhitespace),
			options.get(EditorOption.renderControlCharacters),
			options.get(EditorOption.fontLigatures) !== EditorFontLigatures.OFF,
			null
		));

		return r.html;
	}
}

// theming

registerThemingParticipant((theme, collector) => {
	const lineNumBers = theme.getColor(editorLineNumBers);
	if (lineNumBers) {
		collector.addRule(`.monaco-diff-editor .diff-review-line-numBer { color: ${lineNumBers}; }`);
	}

	const shadow = theme.getColor(scrollBarShadow);
	if (shadow) {
		collector.addRule(`.monaco-diff-editor .diff-review-shadow { Box-shadow: ${shadow} 0 -6px 6px -6px inset; }`);
	}
});

class DiffReviewNext extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.diffReview.next',
			laBel: nls.localize('editor.action.diffReview.next', "Go to Next Difference"),
			alias: 'Go to Next Difference',
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			kBOpts: {
				kBExpr: null,
				primary: KeyCode.F7,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor) {
			diffEditor.diffReviewNext();
		}
	}
}

class DiffReviewPrev extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.diffReview.prev',
			laBel: nls.localize('editor.action.diffReview.prev', "Go to Previous Difference"),
			alias: 'Go to Previous Difference',
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			kBOpts: {
				kBExpr: null,
				primary: KeyMod.Shift | KeyCode.F7,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor) {
			diffEditor.diffReviewPrev();
		}
	}
}

function findFocusedDiffEditor(accessor: ServicesAccessor): DiffEditorWidget | null {
	const codeEditorService = accessor.get(ICodeEditorService);
	const diffEditors = codeEditorService.listDiffEditors();
	const activeCodeEditor = codeEditorService.getActiveCodeEditor();
	if (!activeCodeEditor) {
		return null;
	}

	for (let i = 0, len = diffEditors.length; i < len; i++) {
		const diffEditor = <DiffEditorWidget>diffEditors[i];
		if (diffEditor.getModifiedEditor().getId() === activeCodeEditor.getId() || diffEditor.getOriginalEditor().getId() === activeCodeEditor.getId()) {
			return diffEditor;
		}
	}
	return null;
}

registerEditorAction(DiffReviewNext);
registerEditorAction(DiffReviewPrev);
