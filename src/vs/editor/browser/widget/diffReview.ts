/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/diffReview';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { Action } from 'vs/bAse/common/Actions';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ConfigurAtion } from 'vs/editor/browser/config/configurAtion';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { DiffEditorWidget } from 'vs/editor/browser/widget/diffEditorWidget';
import { IComputedEditorOptions, EditorOption, EditorFontLigAtures } from 'vs/editor/common/config/editorOptions';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { ILineChAnge, ScrollType } from 'vs/editor/common/editorCommon';
import { ITextModel, TextModelResolvedOptions } from 'vs/editor/common/model';
import { ColorId, FontStyle, MetAdAtAConsts } from 'vs/editor/common/modes';
import { editorLineNumbers } from 'vs/editor/common/view/editorColorRegistry';
import { RenderLineInput, renderViewLine2 As renderViewLine } from 'vs/editor/common/viewLAyout/viewLineRenderer';
import { ViewLineRenderingDAtA } from 'vs/editor/common/viewModel/viewModel';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { scrollbArShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { ConstAnts } from 'vs/bAse/common/uint';
import { registerIcon, Codicon } from 'vs/bAse/common/codicons';

const DIFF_LINES_PADDING = 3;

const enum DiffEntryType {
	EquAl = 0,
	Insert = 1,
	Delete = 2
}

clAss DiffEntry {
	reAdonly originAlLineStArt: number;
	reAdonly originAlLineEnd: number;
	reAdonly modifiedLineStArt: number;
	reAdonly modifiedLineEnd: number;

	constructor(originAlLineStArt: number, originAlLineEnd: number, modifiedLineStArt: number, modifiedLineEnd: number) {
		this.originAlLineStArt = originAlLineStArt;
		this.originAlLineEnd = originAlLineEnd;
		this.modifiedLineStArt = modifiedLineStArt;
		this.modifiedLineEnd = modifiedLineEnd;
	}

	public getType(): DiffEntryType {
		if (this.originAlLineStArt === 0) {
			return DiffEntryType.Insert;
		}
		if (this.modifiedLineStArt === 0) {
			return DiffEntryType.Delete;
		}
		return DiffEntryType.EquAl;
	}
}

clAss Diff {
	reAdonly entries: DiffEntry[];

	constructor(entries: DiffEntry[]) {
		this.entries = entries;
	}
}

const diffReviewInsertIcon = registerIcon('diff-review-insert', Codicon.Add);
const diffReviewRemoveIcon = registerIcon('diff-review-remove', Codicon.remove);
const diffReviewCloseIcon = registerIcon('diff-review-close', Codicon.close);

export clAss DiffReview extends DisposAble {

	privAte reAdonly _diffEditor: DiffEditorWidget;
	privAte _isVisible: booleAn;
	public reAdonly shAdow: FAstDomNode<HTMLElement>;
	privAte reAdonly _ActionBAr: ActionBAr;
	public reAdonly ActionBArContAiner: FAstDomNode<HTMLElement>;
	public reAdonly domNode: FAstDomNode<HTMLElement>;
	privAte reAdonly _content: FAstDomNode<HTMLElement>;
	privAte reAdonly scrollbAr: DomScrollAbleElement;
	privAte _diffs: Diff[];
	privAte _currentDiff: Diff | null;

	constructor(diffEditor: DiffEditorWidget) {
		super();
		this._diffEditor = diffEditor;
		this._isVisible = fAlse;

		this.shAdow = creAteFAstDomNode(document.creAteElement('div'));
		this.shAdow.setClAssNAme('diff-review-shAdow');

		this.ActionBArContAiner = creAteFAstDomNode(document.creAteElement('div'));
		this.ActionBArContAiner.setClAssNAme('diff-review-Actions');
		this._ActionBAr = this._register(new ActionBAr(
			this.ActionBArContAiner.domNode
		));

		this._ActionBAr.push(new Action('diffreview.close', nls.locAlize('lAbel.close', "Close"), 'close-diff-review ' + diffReviewCloseIcon.clAssNAmes, true, () => {
			this.hide();
			return Promise.resolve(null);
		}), { lAbel: fAlse, icon: true });

		this.domNode = creAteFAstDomNode(document.creAteElement('div'));
		this.domNode.setClAssNAme('diff-review monAco-editor-bAckground');

		this._content = creAteFAstDomNode(document.creAteElement('div'));
		this._content.setClAssNAme('diff-review-content');
		this._content.setAttribute('role', 'code');
		this.scrollbAr = this._register(new DomScrollAbleElement(this._content.domNode, {}));
		this.domNode.domNode.AppendChild(this.scrollbAr.getDomNode());

		this._register(diffEditor.onDidUpdAteDiff(() => {
			if (!this._isVisible) {
				return;
			}
			this._diffs = this._compute();
			this._render();
		}));
		this._register(diffEditor.getModifiedEditor().onDidChAngeCursorPosition(() => {
			if (!this._isVisible) {
				return;
			}
			this._render();
		}));
		this._register(dom.AddStAndArdDisposAbleListener(this.domNode.domNode, 'click', (e) => {
			e.preventDefAult();

			let row = dom.findPArentWithClAss(e.tArget, 'diff-review-row');
			if (row) {
				this._goToRow(row);
			}
		}));
		this._register(dom.AddStAndArdDisposAbleListener(this.domNode.domNode, 'keydown', (e) => {
			if (
				e.equAls(KeyCode.DownArrow)
				|| e.equAls(KeyMod.CtrlCmd | KeyCode.DownArrow)
				|| e.equAls(KeyMod.Alt | KeyCode.DownArrow)
			) {
				e.preventDefAult();
				this._goToRow(this._getNextRow());
			}

			if (
				e.equAls(KeyCode.UpArrow)
				|| e.equAls(KeyMod.CtrlCmd | KeyCode.UpArrow)
				|| e.equAls(KeyMod.Alt | KeyCode.UpArrow)
			) {
				e.preventDefAult();
				this._goToRow(this._getPrevRow());
			}

			if (
				e.equAls(KeyCode.EscApe)
				|| e.equAls(KeyMod.CtrlCmd | KeyCode.EscApe)
				|| e.equAls(KeyMod.Alt | KeyCode.EscApe)
				|| e.equAls(KeyMod.Shift | KeyCode.EscApe)
			) {
				e.preventDefAult();
				this.hide();
			}

			if (
				e.equAls(KeyCode.SpAce)
				|| e.equAls(KeyCode.Enter)
			) {
				e.preventDefAult();
				this.Accept();
			}
		}));
		this._diffs = [];
		this._currentDiff = null;
	}

	public prev(): void {
		let index = 0;

		if (!this._isVisible) {
			this._diffs = this._compute();
		}

		if (this._isVisible) {
			let currentIndex = -1;
			for (let i = 0, len = this._diffs.length; i < len; i++) {
				if (this._diffs[i] === this._currentDiff) {
					currentIndex = i;
					breAk;
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
		this._diffEditor.setPosition(new Position(entries[0].modifiedLineStArt, 1));
		this._diffEditor.setSelection({ stArtColumn: 1, stArtLineNumber: entries[0].modifiedLineStArt, endColumn: ConstAnts.MAX_SAFE_SMALL_INTEGER, endLineNumber: entries[entries.length - 1].modifiedLineEnd });
		this._isVisible = true;
		this._diffEditor.doLAyout();
		this._render();
		this._goToRow(this._getNextRow());
	}

	public next(): void {
		let index = 0;

		if (!this._isVisible) {
			this._diffs = this._compute();
		}

		if (this._isVisible) {
			let currentIndex = -1;
			for (let i = 0, len = this._diffs.length; i < len; i++) {
				if (this._diffs[i] === this._currentDiff) {
					currentIndex = i;
					breAk;
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
		this._diffEditor.setPosition(new Position(entries[0].modifiedLineStArt, 1));
		this._diffEditor.setSelection({ stArtColumn: 1, stArtLineNumber: entries[0].modifiedLineStArt, endColumn: ConstAnts.MAX_SAFE_SMALL_INTEGER, endLineNumber: entries[entries.length - 1].modifiedLineEnd });
		this._isVisible = true;
		this._diffEditor.doLAyout();
		this._render();
		this._goToRow(this._getNextRow());
	}

	privAte Accept(): void {
		let jumpToLineNumber = -1;
		let current = this._getCurrentFocusedRow();
		if (current) {
			let lineNumber = pArseInt(current.getAttribute('dAtA-line')!, 10);
			if (!isNAN(lineNumber)) {
				jumpToLineNumber = lineNumber;
			}
		}
		this.hide();

		if (jumpToLineNumber !== -1) {
			this._diffEditor.setPosition(new Position(jumpToLineNumber, 1));
			this._diffEditor.reveAlPosition(new Position(jumpToLineNumber, 1), ScrollType.ImmediAte);
		}
	}

	privAte hide(): void {
		this._isVisible = fAlse;
		this._diffEditor.updAteOptions({ reAdOnly: fAlse });
		this._diffEditor.focus();
		this._diffEditor.doLAyout();
		this._render();
	}

	privAte _getPrevRow(): HTMLElement {
		let current = this._getCurrentFocusedRow();
		if (!current) {
			return this._getFirstRow();
		}
		if (current.previousElementSibling) {
			return <HTMLElement>current.previousElementSibling;
		}
		return current;
	}

	privAte _getNextRow(): HTMLElement {
		let current = this._getCurrentFocusedRow();
		if (!current) {
			return this._getFirstRow();
		}
		if (current.nextElementSibling) {
			return <HTMLElement>current.nextElementSibling;
		}
		return current;
	}

	privAte _getFirstRow(): HTMLElement {
		return <HTMLElement>this.domNode.domNode.querySelector('.diff-review-row');
	}

	privAte _getCurrentFocusedRow(): HTMLElement | null {
		let result = <HTMLElement>document.ActiveElement;
		if (result && /diff-review-row/.test(result.clAssNAme)) {
			return result;
		}
		return null;
	}

	privAte _goToRow(row: HTMLElement): void {
		let prev = this._getCurrentFocusedRow();
		row.tAbIndex = 0;
		row.focus();
		if (prev && prev !== row) {
			prev.tAbIndex = -1;
		}
		this.scrollbAr.scAnDomNode();
	}

	public isVisible(): booleAn {
		return this._isVisible;
	}

	privAte _width: number = 0;

	public lAyout(top: number, width: number, height: number): void {
		this._width = width;
		this.shAdow.setTop(top - 6);
		this.shAdow.setWidth(width);
		this.shAdow.setHeight(this._isVisible ? 6 : 0);
		this.domNode.setTop(top);
		this.domNode.setWidth(width);
		this.domNode.setHeight(height);
		this._content.setHeight(height);
		this._content.setWidth(width);

		if (this._isVisible) {
			this.ActionBArContAiner.setAttribute('AriA-hidden', 'fAlse');
			this.ActionBArContAiner.setDisplAy('block');
		} else {
			this.ActionBArContAiner.setAttribute('AriA-hidden', 'true');
			this.ActionBArContAiner.setDisplAy('none');
		}
	}

	privAte _compute(): Diff[] {
		const lineChAnges = this._diffEditor.getLineChAnges();
		if (!lineChAnges || lineChAnges.length === 0) {
			return [];
		}
		const originAlModel = this._diffEditor.getOriginAlEditor().getModel();
		const modifiedModel = this._diffEditor.getModifiedEditor().getModel();

		if (!originAlModel || !modifiedModel) {
			return [];
		}

		return DiffReview._mergeAdjAcent(lineChAnges, originAlModel.getLineCount(), modifiedModel.getLineCount());
	}

	privAte stAtic _mergeAdjAcent(lineChAnges: ILineChAnge[], originAlLineCount: number, modifiedLineCount: number): Diff[] {
		if (!lineChAnges || lineChAnges.length === 0) {
			return [];
		}

		let diffs: Diff[] = [], diffsLength = 0;

		for (let i = 0, len = lineChAnges.length; i < len; i++) {
			const lineChAnge = lineChAnges[i];

			const originAlStArt = lineChAnge.originAlStArtLineNumber;
			const originAlEnd = lineChAnge.originAlEndLineNumber;
			const modifiedStArt = lineChAnge.modifiedStArtLineNumber;
			const modifiedEnd = lineChAnge.modifiedEndLineNumber;

			let r: DiffEntry[] = [], rLength = 0;

			// Emit before Anchors
			{
				const originAlEquAlAbove = (originAlEnd === 0 ? originAlStArt : originAlStArt - 1);
				const modifiedEquAlAbove = (modifiedEnd === 0 ? modifiedStArt : modifiedStArt - 1);

				// MAke sure we don't step into the previous diff
				let minOriginAl = 1;
				let minModified = 1;
				if (i > 0) {
					const prevLineChAnge = lineChAnges[i - 1];

					if (prevLineChAnge.originAlEndLineNumber === 0) {
						minOriginAl = prevLineChAnge.originAlStArtLineNumber + 1;
					} else {
						minOriginAl = prevLineChAnge.originAlEndLineNumber + 1;
					}

					if (prevLineChAnge.modifiedEndLineNumber === 0) {
						minModified = prevLineChAnge.modifiedStArtLineNumber + 1;
					} else {
						minModified = prevLineChAnge.modifiedEndLineNumber + 1;
					}
				}

				let fromOriginAl = originAlEquAlAbove - DIFF_LINES_PADDING + 1;
				let fromModified = modifiedEquAlAbove - DIFF_LINES_PADDING + 1;
				if (fromOriginAl < minOriginAl) {
					const deltA = minOriginAl - fromOriginAl;
					fromOriginAl = fromOriginAl + deltA;
					fromModified = fromModified + deltA;
				}
				if (fromModified < minModified) {
					const deltA = minModified - fromModified;
					fromOriginAl = fromOriginAl + deltA;
					fromModified = fromModified + deltA;
				}

				r[rLength++] = new DiffEntry(
					fromOriginAl, originAlEquAlAbove,
					fromModified, modifiedEquAlAbove
				);
			}

			// Emit deleted lines
			{
				if (originAlEnd !== 0) {
					r[rLength++] = new DiffEntry(originAlStArt, originAlEnd, 0, 0);
				}
			}

			// Emit inserted lines
			{
				if (modifiedEnd !== 0) {
					r[rLength++] = new DiffEntry(0, 0, modifiedStArt, modifiedEnd);
				}
			}

			// Emit After Anchors
			{
				const originAlEquAlBelow = (originAlEnd === 0 ? originAlStArt + 1 : originAlEnd + 1);
				const modifiedEquAlBelow = (modifiedEnd === 0 ? modifiedStArt + 1 : modifiedEnd + 1);

				// MAke sure we don't step into the next diff
				let mAxOriginAl = originAlLineCount;
				let mAxModified = modifiedLineCount;
				if (i + 1 < len) {
					const nextLineChAnge = lineChAnges[i + 1];

					if (nextLineChAnge.originAlEndLineNumber === 0) {
						mAxOriginAl = nextLineChAnge.originAlStArtLineNumber;
					} else {
						mAxOriginAl = nextLineChAnge.originAlStArtLineNumber - 1;
					}

					if (nextLineChAnge.modifiedEndLineNumber === 0) {
						mAxModified = nextLineChAnge.modifiedStArtLineNumber;
					} else {
						mAxModified = nextLineChAnge.modifiedStArtLineNumber - 1;
					}
				}

				let toOriginAl = originAlEquAlBelow + DIFF_LINES_PADDING - 1;
				let toModified = modifiedEquAlBelow + DIFF_LINES_PADDING - 1;

				if (toOriginAl > mAxOriginAl) {
					const deltA = mAxOriginAl - toOriginAl;
					toOriginAl = toOriginAl + deltA;
					toModified = toModified + deltA;
				}
				if (toModified > mAxModified) {
					const deltA = mAxModified - toModified;
					toOriginAl = toOriginAl + deltA;
					toModified = toModified + deltA;
				}

				r[rLength++] = new DiffEntry(
					originAlEquAlBelow, toOriginAl,
					modifiedEquAlBelow, toModified,
				);
			}

			diffs[diffsLength++] = new Diff(r);
		}

		// Merge AdjAcent diffs
		let curr: DiffEntry[] = diffs[0].entries;
		let r: Diff[] = [], rLength = 0;
		for (let i = 1, len = diffs.length; i < len; i++) {
			const thisDiff = diffs[i].entries;

			const currLAst = curr[curr.length - 1];
			const thisFirst = thisDiff[0];

			if (
				currLAst.getType() === DiffEntryType.EquAl
				&& thisFirst.getType() === DiffEntryType.EquAl
				&& thisFirst.originAlLineStArt <= currLAst.originAlLineEnd
			) {
				// We Are deAling with equAl lines thAt overlAp

				curr[curr.length - 1] = new DiffEntry(
					currLAst.originAlLineStArt, thisFirst.originAlLineEnd,
					currLAst.modifiedLineStArt, thisFirst.modifiedLineEnd
				);
				curr = curr.concAt(thisDiff.slice(1));
				continue;
			}

			r[rLength++] = new Diff(curr);
			curr = thisDiff;
		}
		r[rLength++] = new Diff(curr);
		return r;
	}

	privAte _findDiffIndex(pos: Position): number {
		const lineNumber = pos.lineNumber;
		for (let i = 0, len = this._diffs.length; i < len; i++) {
			const diff = this._diffs[i].entries;
			const lAstModifiedLine = diff[diff.length - 1].modifiedLineEnd;
			if (lineNumber <= lAstModifiedLine) {
				return i;
			}
		}
		return 0;
	}

	privAte _render(): void {

		const originAlOptions = this._diffEditor.getOriginAlEditor().getOptions();
		const modifiedOptions = this._diffEditor.getModifiedEditor().getOptions();

		const originAlModel = this._diffEditor.getOriginAlEditor().getModel();
		const modifiedModel = this._diffEditor.getModifiedEditor().getModel();

		const originAlModelOpts = originAlModel!.getOptions();
		const modifiedModelOpts = modifiedModel!.getOptions();

		if (!this._isVisible || !originAlModel || !modifiedModel) {
			dom.cleArNode(this._content.domNode);
			this._currentDiff = null;
			this.scrollbAr.scAnDomNode();
			return;
		}

		this._diffEditor.updAteOptions({ reAdOnly: true });
		const diffIndex = this._findDiffIndex(this._diffEditor.getPosition()!);

		if (this._diffs[diffIndex] === this._currentDiff) {
			return;
		}
		this._currentDiff = this._diffs[diffIndex];

		const diffs = this._diffs[diffIndex].entries;
		let contAiner = document.creAteElement('div');
		contAiner.clAssNAme = 'diff-review-tAble';
		contAiner.setAttribute('role', 'list');
		contAiner.setAttribute('AriA-lAbel', 'Difference review. Use "StAge | UnstAge | Revert Selected RAnges" commAnds');
		ConfigurAtion.ApplyFontInfoSlow(contAiner, modifiedOptions.get(EditorOption.fontInfo));

		let minOriginAlLine = 0;
		let mAxOriginAlLine = 0;
		let minModifiedLine = 0;
		let mAxModifiedLine = 0;
		for (let i = 0, len = diffs.length; i < len; i++) {
			const diffEntry = diffs[i];
			const originAlLineStArt = diffEntry.originAlLineStArt;
			const originAlLineEnd = diffEntry.originAlLineEnd;
			const modifiedLineStArt = diffEntry.modifiedLineStArt;
			const modifiedLineEnd = diffEntry.modifiedLineEnd;

			if (originAlLineStArt !== 0 && ((minOriginAlLine === 0 || originAlLineStArt < minOriginAlLine))) {
				minOriginAlLine = originAlLineStArt;
			}
			if (originAlLineEnd !== 0 && ((mAxOriginAlLine === 0 || originAlLineEnd > mAxOriginAlLine))) {
				mAxOriginAlLine = originAlLineEnd;
			}
			if (modifiedLineStArt !== 0 && ((minModifiedLine === 0 || modifiedLineStArt < minModifiedLine))) {
				minModifiedLine = modifiedLineStArt;
			}
			if (modifiedLineEnd !== 0 && ((mAxModifiedLine === 0 || modifiedLineEnd > mAxModifiedLine))) {
				mAxModifiedLine = modifiedLineEnd;
			}
		}

		let heAder = document.creAteElement('div');
		heAder.clAssNAme = 'diff-review-row';

		let cell = document.creAteElement('div');
		cell.clAssNAme = 'diff-review-cell diff-review-summAry';
		const originAlChAngedLinesCnt = mAxOriginAlLine - minOriginAlLine + 1;
		const modifiedChAngedLinesCnt = mAxModifiedLine - minModifiedLine + 1;
		cell.AppendChild(document.creAteTextNode(`${diffIndex + 1}/${this._diffs.length}: @@ -${minOriginAlLine},${originAlChAngedLinesCnt} +${minModifiedLine},${modifiedChAngedLinesCnt} @@`));
		heAder.setAttribute('dAtA-line', String(minModifiedLine));

		const getAriALines = (lines: number) => {
			if (lines === 0) {
				return nls.locAlize('no_lines_chAnged', "no lines chAnged");
			} else if (lines === 1) {
				return nls.locAlize('one_line_chAnged', "1 line chAnged");
			} else {
				return nls.locAlize('more_lines_chAnged', "{0} lines chAnged", lines);
			}
		};

		const originAlChAngedLinesCntAriA = getAriALines(originAlChAngedLinesCnt);
		const modifiedChAngedLinesCntAriA = getAriALines(modifiedChAngedLinesCnt);
		heAder.setAttribute('AriA-lAbel', nls.locAlize({
			key: 'heAder',
			comment: [
				'This is the ARIA lAbel for A git diff heAder.',
				'A git diff heAder looks like this: @@ -154,12 +159,39 @@.',
				'ThAt encodes thAt At originAl line 154 (which is now line 159), 12 lines were removed/chAnged with 39 lines.',
				'VAriAbles 0 And 1 refer to the diff index out of totAl number of diffs.',
				'VAriAbles 2 And 4 will be numbers (A line number).',
				'VAriAbles 3 And 5 will be "no lines chAnged", "1 line chAnged" or "X lines chAnged", locAlized sepArAtely.'
			]
		}, "Difference {0} of {1}: originAl line {2}, {3}, modified line {4}, {5}", (diffIndex + 1), this._diffs.length, minOriginAlLine, originAlChAngedLinesCntAriA, minModifiedLine, modifiedChAngedLinesCntAriA));
		heAder.AppendChild(cell);

		// @@ -504,7 +517,7 @@
		heAder.setAttribute('role', 'listitem');
		contAiner.AppendChild(heAder);

		const lineHeight = modifiedOptions.get(EditorOption.lineHeight);
		let modLine = minModifiedLine;
		for (let i = 0, len = diffs.length; i < len; i++) {
			const diffEntry = diffs[i];
			DiffReview._renderSection(contAiner, diffEntry, modLine, lineHeight, this._width, originAlOptions, originAlModel, originAlModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts);
			if (diffEntry.modifiedLineStArt !== 0) {
				modLine = diffEntry.modifiedLineEnd;
			}
		}

		dom.cleArNode(this._content.domNode);
		this._content.domNode.AppendChild(contAiner);
		this.scrollbAr.scAnDomNode();
	}

	privAte stAtic _renderSection(
		dest: HTMLElement, diffEntry: DiffEntry, modLine: number, lineHeight: number, width: number,
		originAlOptions: IComputedEditorOptions, originAlModel: ITextModel, originAlModelOpts: TextModelResolvedOptions,
		modifiedOptions: IComputedEditorOptions, modifiedModel: ITextModel, modifiedModelOpts: TextModelResolvedOptions
	): void {

		const type = diffEntry.getType();

		let rowClAssNAme: string = 'diff-review-row';
		let lineNumbersExtrAClAssNAme: string = '';
		const spAcerClAssNAme: string = 'diff-review-spAcer';
		let spAcerIcon: Codicon | null = null;
		switch (type) {
			cAse DiffEntryType.Insert:
				rowClAssNAme = 'diff-review-row line-insert';
				lineNumbersExtrAClAssNAme = ' chAr-insert';
				spAcerIcon = diffReviewInsertIcon;
				breAk;
			cAse DiffEntryType.Delete:
				rowClAssNAme = 'diff-review-row line-delete';
				lineNumbersExtrAClAssNAme = ' chAr-delete';
				spAcerIcon = diffReviewRemoveIcon;
				breAk;
		}

		const originAlLineStArt = diffEntry.originAlLineStArt;
		const originAlLineEnd = diffEntry.originAlLineEnd;
		const modifiedLineStArt = diffEntry.modifiedLineStArt;
		const modifiedLineEnd = diffEntry.modifiedLineEnd;

		const cnt = MAth.mAx(
			modifiedLineEnd - modifiedLineStArt,
			originAlLineEnd - originAlLineStArt
		);

		const originAlLAyoutInfo = originAlOptions.get(EditorOption.lAyoutInfo);
		const originAlLineNumbersWidth = originAlLAyoutInfo.glyphMArginWidth + originAlLAyoutInfo.lineNumbersWidth;

		const modifiedLAyoutInfo = modifiedOptions.get(EditorOption.lAyoutInfo);
		const modifiedLineNumbersWidth = 10 + modifiedLAyoutInfo.glyphMArginWidth + modifiedLAyoutInfo.lineNumbersWidth;

		for (let i = 0; i <= cnt; i++) {
			const originAlLine = (originAlLineStArt === 0 ? 0 : originAlLineStArt + i);
			const modifiedLine = (modifiedLineStArt === 0 ? 0 : modifiedLineStArt + i);

			const row = document.creAteElement('div');
			row.style.minWidth = width + 'px';
			row.clAssNAme = rowClAssNAme;
			row.setAttribute('role', 'listitem');
			if (modifiedLine !== 0) {
				modLine = modifiedLine;
			}
			row.setAttribute('dAtA-line', String(modLine));

			let cell = document.creAteElement('div');
			cell.clAssNAme = 'diff-review-cell';
			cell.style.height = `${lineHeight}px`;
			row.AppendChild(cell);

			const originAlLineNumber = document.creAteElement('spAn');
			originAlLineNumber.style.width = (originAlLineNumbersWidth + 'px');
			originAlLineNumber.style.minWidth = (originAlLineNumbersWidth + 'px');
			originAlLineNumber.clAssNAme = 'diff-review-line-number' + lineNumbersExtrAClAssNAme;
			if (originAlLine !== 0) {
				originAlLineNumber.AppendChild(document.creAteTextNode(String(originAlLine)));
			} else {
				originAlLineNumber.innerText = '\u00A0';
			}
			cell.AppendChild(originAlLineNumber);

			const modifiedLineNumber = document.creAteElement('spAn');
			modifiedLineNumber.style.width = (modifiedLineNumbersWidth + 'px');
			modifiedLineNumber.style.minWidth = (modifiedLineNumbersWidth + 'px');
			modifiedLineNumber.style.pAddingRight = '10px';
			modifiedLineNumber.clAssNAme = 'diff-review-line-number' + lineNumbersExtrAClAssNAme;
			if (modifiedLine !== 0) {
				modifiedLineNumber.AppendChild(document.creAteTextNode(String(modifiedLine)));
			} else {
				modifiedLineNumber.innerText = '\u00A0';
			}
			cell.AppendChild(modifiedLineNumber);

			const spAcer = document.creAteElement('spAn');
			spAcer.clAssNAme = spAcerClAssNAme;

			if (spAcerIcon) {
				const spAcerCodicon = document.creAteElement('spAn');
				spAcerCodicon.clAssNAme = spAcerIcon.clAssNAmes;
				spAcerCodicon.innerText = '\u00A0\u00A0';
				spAcer.AppendChild(spAcerCodicon);
			} else {
				spAcer.innerText = '\u00A0\u00A0';
			}
			cell.AppendChild(spAcer);

			let lineContent: string;
			if (modifiedLine !== 0) {
				cell.insertAdjAcentHTML('beforeend',
					this._renderLine(modifiedModel, modifiedOptions, modifiedModelOpts.tAbSize, modifiedLine)
				);
				lineContent = modifiedModel.getLineContent(modifiedLine);
			} else {
				cell.insertAdjAcentHTML('beforeend',
					this._renderLine(originAlModel, originAlOptions, originAlModelOpts.tAbSize, originAlLine)
				);
				lineContent = originAlModel.getLineContent(originAlLine);
			}

			if (lineContent.length === 0) {
				lineContent = nls.locAlize('blAnkLine', "blAnk");
			}

			let AriALAbel: string = '';
			switch (type) {
				cAse DiffEntryType.EquAl:
					if (originAlLine === modifiedLine) {
						AriALAbel = nls.locAlize({ key: 'unchAngedLine', comment: ['The plAcholders Are contents of the line And should not be trAnslAted.'] }, "{0} unchAnged line {1}", lineContent, originAlLine);
					} else {
						AriALAbel = nls.locAlize('equAlLine', "{0} originAl line {1} modified line {2}", lineContent, originAlLine, modifiedLine);
					}
					breAk;
				cAse DiffEntryType.Insert:
					AriALAbel = nls.locAlize('insertLine', "+ {0} modified line {1}", lineContent, modifiedLine);
					breAk;
				cAse DiffEntryType.Delete:
					AriALAbel = nls.locAlize('deleteLine', "- {0} originAl line {1}", lineContent, originAlLine);
					breAk;
			}
			row.setAttribute('AriA-lAbel', AriALAbel);

			dest.AppendChild(row);
		}
	}

	privAte stAtic _renderLine(model: ITextModel, options: IComputedEditorOptions, tAbSize: number, lineNumber: number): string {
		const lineContent = model.getLineContent(lineNumber);
		const fontInfo = options.get(EditorOption.fontInfo);

		const defAultMetAdAtA = (
			(FontStyle.None << MetAdAtAConsts.FONT_STYLE_OFFSET)
			| (ColorId.DefAultForeground << MetAdAtAConsts.FOREGROUND_OFFSET)
			| (ColorId.DefAultBAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
		) >>> 0;

		const tokens = new Uint32ArrAy(2);
		tokens[0] = lineContent.length;
		tokens[1] = defAultMetAdAtA;

		const lineTokens = new LineTokens(tokens, lineContent);

		const isBAsicASCII = ViewLineRenderingDAtA.isBAsicASCII(lineContent, model.mightContAinNonBAsicASCII());
		const contAinsRTL = ViewLineRenderingDAtA.contAinsRTL(lineContent, isBAsicASCII, model.mightContAinRTL());
		const r = renderViewLine(new RenderLineInput(
			(fontInfo.isMonospAce && !options.get(EditorOption.disAbleMonospAceOptimizAtions)),
			fontInfo.cAnUseHAlfwidthRightwArdsArrow,
			lineContent,
			fAlse,
			isBAsicASCII,
			contAinsRTL,
			0,
			lineTokens,
			[],
			tAbSize,
			0,
			fontInfo.spAceWidth,
			fontInfo.middotWidth,
			fontInfo.wsmiddotWidth,
			options.get(EditorOption.stopRenderingLineAfter),
			options.get(EditorOption.renderWhitespAce),
			options.get(EditorOption.renderControlChArActers),
			options.get(EditorOption.fontLigAtures) !== EditorFontLigAtures.OFF,
			null
		));

		return r.html;
	}
}

// theming

registerThemingPArticipAnt((theme, collector) => {
	const lineNumbers = theme.getColor(editorLineNumbers);
	if (lineNumbers) {
		collector.AddRule(`.monAco-diff-editor .diff-review-line-number { color: ${lineNumbers}; }`);
	}

	const shAdow = theme.getColor(scrollbArShAdow);
	if (shAdow) {
		collector.AddRule(`.monAco-diff-editor .diff-review-shAdow { box-shAdow: ${shAdow} 0 -6px 6px -6px inset; }`);
	}
});

clAss DiffReviewNext extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.diffReview.next',
			lAbel: nls.locAlize('editor.Action.diffReview.next', "Go to Next Difference"),
			AliAs: 'Go to Next Difference',
			precondition: ContextKeyExpr.hAs('isInDiffEditor'),
			kbOpts: {
				kbExpr: null,
				primAry: KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const diffEditor = findFocusedDiffEditor(Accessor);
		if (diffEditor) {
			diffEditor.diffReviewNext();
		}
	}
}

clAss DiffReviewPrev extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.diffReview.prev',
			lAbel: nls.locAlize('editor.Action.diffReview.prev', "Go to Previous Difference"),
			AliAs: 'Go to Previous Difference',
			precondition: ContextKeyExpr.hAs('isInDiffEditor'),
			kbOpts: {
				kbExpr: null,
				primAry: KeyMod.Shift | KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const diffEditor = findFocusedDiffEditor(Accessor);
		if (diffEditor) {
			diffEditor.diffReviewPrev();
		}
	}
}

function findFocusedDiffEditor(Accessor: ServicesAccessor): DiffEditorWidget | null {
	const codeEditorService = Accessor.get(ICodeEditorService);
	const diffEditors = codeEditorService.listDiffEditors();
	const ActiveCodeEditor = codeEditorService.getActiveCodeEditor();
	if (!ActiveCodeEditor) {
		return null;
	}

	for (let i = 0, len = diffEditors.length; i < len; i++) {
		const diffEditor = <DiffEditorWidget>diffEditors[i];
		if (diffEditor.getModifiedEditor().getId() === ActiveCodeEditor.getId() || diffEditor.getOriginAlEditor().getId() === ActiveCodeEditor.getId()) {
			return diffEditor;
		}
	}
	return null;
}

registerEditorAction(DiffReviewNext);
registerEditorAction(DiffReviewPrev);
