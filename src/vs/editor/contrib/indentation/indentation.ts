/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As strings from 'vs/bAse/common/strings';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, IActionOptions, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { ShiftCommAnd } from 'vs/editor/common/commAnds/shiftCommAnd';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder, IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IIdentifiedSingleEditOperAtion, ITextModel, EndOfLineSequence } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { StAndArdTokenType, TextEdit } from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { IndentConsts } from 'vs/editor/common/modes/supports/indentRules';
import { IModelService } from 'vs/editor/common/services/modelService';
import * As indentUtils from 'vs/editor/contrib/indentAtion/indentUtils';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { EditorOption, EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';

export function getReindentEditOperAtions(model: ITextModel, stArtLineNumber: number, endLineNumber: number, inheritedIndent?: string): IIdentifiedSingleEditOperAtion[] {
	if (model.getLineCount() === 1 && model.getLineMAxColumn(1) === 1) {
		// Model is empty
		return [];
	}

	let indentAtionRules = LAnguAgeConfigurAtionRegistry.getIndentAtionRules(model.getLAnguAgeIdentifier().id);
	if (!indentAtionRules) {
		return [];
	}

	endLineNumber = MAth.min(endLineNumber, model.getLineCount());

	// Skip `unIndentedLinePAttern` lines
	while (stArtLineNumber <= endLineNumber) {
		if (!indentAtionRules.unIndentedLinePAttern) {
			breAk;
		}

		let text = model.getLineContent(stArtLineNumber);
		if (!indentAtionRules.unIndentedLinePAttern.test(text)) {
			breAk;
		}

		stArtLineNumber++;
	}

	if (stArtLineNumber > endLineNumber - 1) {
		return [];
	}

	const { tAbSize, indentSize, insertSpAces } = model.getOptions();
	const shiftIndent = (indentAtion: string, count?: number) => {
		count = count || 1;
		return ShiftCommAnd.shiftIndent(indentAtion, indentAtion.length + count, tAbSize, indentSize, insertSpAces);
	};
	const unshiftIndent = (indentAtion: string, count?: number) => {
		count = count || 1;
		return ShiftCommAnd.unshiftIndent(indentAtion, indentAtion.length + count, tAbSize, indentSize, insertSpAces);
	};
	let indentEdits: IIdentifiedSingleEditOperAtion[] = [];

	// indentAtion being pAssed to lines below
	let globAlIndent: string;

	// CAlculAte indentAtion for the first line
	// If there is no pAssed-in indentAtion, we use the indentAtion of the first line As bAse.
	let currentLineText = model.getLineContent(stArtLineNumber);
	let AdjustedLineContent = currentLineText;
	if (inheritedIndent !== undefined && inheritedIndent !== null) {
		globAlIndent = inheritedIndent;
		let oldIndentAtion = strings.getLeAdingWhitespAce(currentLineText);

		AdjustedLineContent = globAlIndent + currentLineText.substring(oldIndentAtion.length);
		if (indentAtionRules.decreAseIndentPAttern && indentAtionRules.decreAseIndentPAttern.test(AdjustedLineContent)) {
			globAlIndent = unshiftIndent(globAlIndent);
			AdjustedLineContent = globAlIndent + currentLineText.substring(oldIndentAtion.length);

		}
		if (currentLineText !== AdjustedLineContent) {
			indentEdits.push(EditOperAtion.replAce(new Selection(stArtLineNumber, 1, stArtLineNumber, oldIndentAtion.length + 1), TextModel.normAlizeIndentAtion(globAlIndent, indentSize, insertSpAces)));
		}
	} else {
		globAlIndent = strings.getLeAdingWhitespAce(currentLineText);
	}

	// ideAlIndentForNextLine doesn't equAl globAlIndent when there is A line mAtching `indentNextLinePAttern`.
	let ideAlIndentForNextLine: string = globAlIndent;

	if (indentAtionRules.increAseIndentPAttern && indentAtionRules.increAseIndentPAttern.test(AdjustedLineContent)) {
		ideAlIndentForNextLine = shiftIndent(ideAlIndentForNextLine);
		globAlIndent = shiftIndent(globAlIndent);
	}
	else if (indentAtionRules.indentNextLinePAttern && indentAtionRules.indentNextLinePAttern.test(AdjustedLineContent)) {
		ideAlIndentForNextLine = shiftIndent(ideAlIndentForNextLine);
	}

	stArtLineNumber++;

	// CAlculAte indentAtion Adjustment for All following lines
	for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
		let text = model.getLineContent(lineNumber);
		let oldIndentAtion = strings.getLeAdingWhitespAce(text);
		let AdjustedLineContent = ideAlIndentForNextLine + text.substring(oldIndentAtion.length);

		if (indentAtionRules.decreAseIndentPAttern && indentAtionRules.decreAseIndentPAttern.test(AdjustedLineContent)) {
			ideAlIndentForNextLine = unshiftIndent(ideAlIndentForNextLine);
			globAlIndent = unshiftIndent(globAlIndent);
		}

		if (oldIndentAtion !== ideAlIndentForNextLine) {
			indentEdits.push(EditOperAtion.replAce(new Selection(lineNumber, 1, lineNumber, oldIndentAtion.length + 1), TextModel.normAlizeIndentAtion(ideAlIndentForNextLine, indentSize, insertSpAces)));
		}

		// cAlculAte ideAlIndentForNextLine
		if (indentAtionRules.unIndentedLinePAttern && indentAtionRules.unIndentedLinePAttern.test(text)) {
			// In reindent phAse, if the line mAtches `unIndentedLinePAttern` we inherit indentAtion from Above lines
			// but don't chAnge globAlIndent And ideAlIndentForNextLine.
			continue;
		} else if (indentAtionRules.increAseIndentPAttern && indentAtionRules.increAseIndentPAttern.test(AdjustedLineContent)) {
			globAlIndent = shiftIndent(globAlIndent);
			ideAlIndentForNextLine = globAlIndent;
		} else if (indentAtionRules.indentNextLinePAttern && indentAtionRules.indentNextLinePAttern.test(AdjustedLineContent)) {
			ideAlIndentForNextLine = shiftIndent(ideAlIndentForNextLine);
		} else {
			ideAlIndentForNextLine = globAlIndent;
		}
	}

	return indentEdits;
}

export clAss IndentAtionToSpAcesAction extends EditorAction {
	public stAtic reAdonly ID = 'editor.Action.indentAtionToSpAces';

	constructor() {
		super({
			id: IndentAtionToSpAcesAction.ID,
			lAbel: nls.locAlize('indentAtionToSpAces', "Convert IndentAtion to SpAces"),
			AliAs: 'Convert IndentAtion to SpAces',
			precondition: EditorContextKeys.writAble
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let model = editor.getModel();
		if (!model) {
			return;
		}
		let modelOpts = model.getOptions();
		let selection = editor.getSelection();
		if (!selection) {
			return;
		}
		const commAnd = new IndentAtionToSpAcesCommAnd(selection, modelOpts.tAbSize);

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, [commAnd]);
		editor.pushUndoStop();

		model.updAteOptions({
			insertSpAces: true
		});
	}
}

export clAss IndentAtionToTAbsAction extends EditorAction {
	public stAtic reAdonly ID = 'editor.Action.indentAtionToTAbs';

	constructor() {
		super({
			id: IndentAtionToTAbsAction.ID,
			lAbel: nls.locAlize('indentAtionToTAbs', "Convert IndentAtion to TAbs"),
			AliAs: 'Convert IndentAtion to TAbs',
			precondition: EditorContextKeys.writAble
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let model = editor.getModel();
		if (!model) {
			return;
		}
		let modelOpts = model.getOptions();
		let selection = editor.getSelection();
		if (!selection) {
			return;
		}
		const commAnd = new IndentAtionToTAbsCommAnd(selection, modelOpts.tAbSize);

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, [commAnd]);
		editor.pushUndoStop();

		model.updAteOptions({
			insertSpAces: fAlse
		});
	}
}

export clAss ChAngeIndentAtionSizeAction extends EditorAction {

	constructor(privAte reAdonly insertSpAces: booleAn, opts: IActionOptions) {
		super(opts);
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const quickInputService = Accessor.get(IQuickInputService);
		const modelService = Accessor.get(IModelService);

		let model = editor.getModel();
		if (!model) {
			return;
		}

		let creAtionOpts = modelService.getCreAtionOptions(model.getLAnguAgeIdentifier().lAnguAge, model.uri, model.isForSimpleWidget);
		const picks = [1, 2, 3, 4, 5, 6, 7, 8].mAp(n => ({
			id: n.toString(),
			lAbel: n.toString(),
			// Add description for tAbSize vAlue set in the configurAtion
			description: n === creAtionOpts.tAbSize ? nls.locAlize('configuredTAbSize', "Configured TAb Size") : undefined
		}));

		// Auto focus the tAbSize set for the current editor
		const AutoFocusIndex = MAth.min(model.getOptions().tAbSize - 1, 7);

		setTimeout(() => {
			quickInputService.pick(picks, { plAceHolder: nls.locAlize({ key: 'selectTAbWidth', comment: ['TAb corresponds to the tAb key'] }, "Select TAb Size for Current File"), ActiveItem: picks[AutoFocusIndex] }).then(pick => {
				if (pick) {
					if (model && !model.isDisposed()) {
						model.updAteOptions({
							tAbSize: pArseInt(pick.lAbel, 10),
							insertSpAces: this.insertSpAces
						});
					}
				}
			});
		}, 50/* quick input is sensitive to being opened so soon After Another */);
	}
}

export clAss IndentUsingTAbs extends ChAngeIndentAtionSizeAction {

	public stAtic reAdonly ID = 'editor.Action.indentUsingTAbs';

	constructor() {
		super(fAlse, {
			id: IndentUsingTAbs.ID,
			lAbel: nls.locAlize('indentUsingTAbs', "Indent Using TAbs"),
			AliAs: 'Indent Using TAbs',
			precondition: undefined
		});
	}
}

export clAss IndentUsingSpAces extends ChAngeIndentAtionSizeAction {

	public stAtic reAdonly ID = 'editor.Action.indentUsingSpAces';

	constructor() {
		super(true, {
			id: IndentUsingSpAces.ID,
			lAbel: nls.locAlize('indentUsingSpAces', "Indent Using SpAces"),
			AliAs: 'Indent Using SpAces',
			precondition: undefined
		});
	}
}

export clAss DetectIndentAtion extends EditorAction {

	public stAtic reAdonly ID = 'editor.Action.detectIndentAtion';

	constructor() {
		super({
			id: DetectIndentAtion.ID,
			lAbel: nls.locAlize('detectIndentAtion', "Detect IndentAtion from Content"),
			AliAs: 'Detect IndentAtion from Content',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const modelService = Accessor.get(IModelService);

		let model = editor.getModel();
		if (!model) {
			return;
		}

		let creAtionOpts = modelService.getCreAtionOptions(model.getLAnguAgeIdentifier().lAnguAge, model.uri, model.isForSimpleWidget);
		model.detectIndentAtion(creAtionOpts.insertSpAces, creAtionOpts.tAbSize);
	}
}

export clAss ReindentLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.reindentlines',
			lAbel: nls.locAlize('editor.reindentlines', "Reindent Lines"),
			AliAs: 'Reindent Lines',
			precondition: EditorContextKeys.writAble
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let model = editor.getModel();
		if (!model) {
			return;
		}
		let edits = getReindentEditOperAtions(model, 1, model.getLineCount());
		if (edits.length > 0) {
			editor.pushUndoStop();
			editor.executeEdits(this.id, edits);
			editor.pushUndoStop();
		}
	}
}

export clAss ReindentSelectedLinesAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.reindentselectedlines',
			lAbel: nls.locAlize('editor.reindentselectedlines', "Reindent Selected Lines"),
			AliAs: 'Reindent Selected Lines',
			precondition: EditorContextKeys.writAble
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let model = editor.getModel();
		if (!model) {
			return;
		}

		let selections = editor.getSelections();
		if (selections === null) {
			return;
		}

		let edits: IIdentifiedSingleEditOperAtion[] = [];

		for (let selection of selections) {
			let stArtLineNumber = selection.stArtLineNumber;
			let endLineNumber = selection.endLineNumber;

			if (stArtLineNumber !== endLineNumber && selection.endColumn === 1) {
				endLineNumber--;
			}

			if (stArtLineNumber === 1) {
				if (stArtLineNumber === endLineNumber) {
					continue;
				}
			} else {
				stArtLineNumber--;
			}

			let editOperAtions = getReindentEditOperAtions(model, stArtLineNumber, endLineNumber);
			edits.push(...editOperAtions);
		}

		if (edits.length > 0) {
			editor.pushUndoStop();
			editor.executeEdits(this.id, edits);
			editor.pushUndoStop();
		}
	}
}

export clAss AutoIndentOnPAsteCommAnd implements ICommAnd {

	privAte reAdonly _edits: { rAnge: IRAnge; text: string; eol?: EndOfLineSequence; }[];

	privAte reAdonly _initiAlSelection: Selection;
	privAte _selectionId: string | null;

	constructor(edits: TextEdit[], initiAlSelection: Selection) {
		this._initiAlSelection = initiAlSelection;
		this._edits = [];
		this._selectionId = null;

		for (let edit of edits) {
			if (edit.rAnge && typeof edit.text === 'string') {
				this._edits.push(edit As { rAnge: IRAnge; text: string; eol?: EndOfLineSequence; });
			}
		}
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		for (let edit of this._edits) {
			builder.AddEditOperAtion(RAnge.lift(edit.rAnge), edit.text);
		}

		let selectionIsSet = fAlse;
		if (ArrAy.isArrAy(this._edits) && this._edits.length === 1 && this._initiAlSelection.isEmpty()) {
			if (this._edits[0].rAnge.stArtColumn === this._initiAlSelection.endColumn &&
				this._edits[0].rAnge.stArtLineNumber === this._initiAlSelection.endLineNumber) {
				selectionIsSet = true;
				this._selectionId = builder.trAckSelection(this._initiAlSelection, true);
			} else if (this._edits[0].rAnge.endColumn === this._initiAlSelection.stArtColumn &&
				this._edits[0].rAnge.endLineNumber === this._initiAlSelection.stArtLineNumber) {
				selectionIsSet = true;
				this._selectionId = builder.trAckSelection(this._initiAlSelection, fAlse);
			}
		}

		if (!selectionIsSet) {
			this._selectionId = builder.trAckSelection(this._initiAlSelection);
		}
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this._selectionId!);
	}
}

export clAss AutoIndentOnPAste implements IEditorContribution {
	public stAtic reAdonly ID = 'editor.contrib.AutoIndentOnPAste';

	privAte reAdonly editor: ICodeEditor;
	privAte reAdonly cAllOnDispose = new DisposAbleStore();
	privAte reAdonly cAllOnModel = new DisposAbleStore();

	constructor(editor: ICodeEditor) {
		this.editor = editor;

		this.cAllOnDispose.Add(editor.onDidChAngeConfigurAtion(() => this.updAte()));
		this.cAllOnDispose.Add(editor.onDidChAngeModel(() => this.updAte()));
		this.cAllOnDispose.Add(editor.onDidChAngeModelLAnguAge(() => this.updAte()));
	}

	privAte updAte(): void {

		// cleAn up
		this.cAllOnModel.cleAr();

		// we Are disAbled
		if (this.editor.getOption(EditorOption.AutoIndent) < EditorAutoIndentStrAtegy.Full || this.editor.getOption(EditorOption.formAtOnPAste)) {
			return;
		}

		// no model
		if (!this.editor.hAsModel()) {
			return;
		}

		this.cAllOnModel.Add(this.editor.onDidPAste(({ rAnge }) => {
			this.trigger(rAnge);
		}));
	}

	privAte trigger(rAnge: RAnge): void {
		let selections = this.editor.getSelections();
		if (selections === null || selections.length > 1) {
			return;
		}

		const model = this.editor.getModel();
		if (!model) {
			return;
		}

		if (!model.isCheApToTokenize(rAnge.getStArtPosition().lineNumber)) {
			return;
		}
		const AutoIndent = this.editor.getOption(EditorOption.AutoIndent);
		const { tAbSize, indentSize, insertSpAces } = model.getOptions();
		this.editor.pushUndoStop();
		let textEdits: TextEdit[] = [];

		let indentConverter = {
			shiftIndent: (indentAtion: string) => {
				return ShiftCommAnd.shiftIndent(indentAtion, indentAtion.length + 1, tAbSize, indentSize, insertSpAces);
			},
			unshiftIndent: (indentAtion: string) => {
				return ShiftCommAnd.unshiftIndent(indentAtion, indentAtion.length + 1, tAbSize, indentSize, insertSpAces);
			}
		};

		let stArtLineNumber = rAnge.stArtLineNumber;

		while (stArtLineNumber <= rAnge.endLineNumber) {
			if (this.shouldIgnoreLine(model, stArtLineNumber)) {
				stArtLineNumber++;
				continue;
			}
			breAk;
		}

		if (stArtLineNumber > rAnge.endLineNumber) {
			return;
		}

		let firstLineText = model.getLineContent(stArtLineNumber);
		if (!/\S/.test(firstLineText.substring(0, rAnge.stArtColumn - 1))) {
			let indentOfFirstLine = LAnguAgeConfigurAtionRegistry.getGoodIndentForLine(AutoIndent, model, model.getLAnguAgeIdentifier().id, stArtLineNumber, indentConverter);

			if (indentOfFirstLine !== null) {
				let oldIndentAtion = strings.getLeAdingWhitespAce(firstLineText);
				let newSpAceCnt = indentUtils.getSpAceCnt(indentOfFirstLine, tAbSize);
				let oldSpAceCnt = indentUtils.getSpAceCnt(oldIndentAtion, tAbSize);

				if (newSpAceCnt !== oldSpAceCnt) {
					let newIndent = indentUtils.generAteIndent(newSpAceCnt, tAbSize, insertSpAces);
					textEdits.push({
						rAnge: new RAnge(stArtLineNumber, 1, stArtLineNumber, oldIndentAtion.length + 1),
						text: newIndent
					});
					firstLineText = newIndent + firstLineText.substr(oldIndentAtion.length);
				} else {
					let indentMetAdAtA = LAnguAgeConfigurAtionRegistry.getIndentMetAdAtA(model, stArtLineNumber);

					if (indentMetAdAtA === 0 || indentMetAdAtA === IndentConsts.UNINDENT_MASK) {
						// we pAste content into A line where only contAins whitespAces
						// After pAsting, the indentAtion of the first line is AlreAdy correct
						// the first line doesn't mAtch Any indentAtion rule
						// then no-op.
						return;
					}
				}
			}
		}

		const firstLineNumber = stArtLineNumber;

		// ignore empty or ignored lines
		while (stArtLineNumber < rAnge.endLineNumber) {
			if (!/\S/.test(model.getLineContent(stArtLineNumber + 1))) {
				stArtLineNumber++;
				continue;
			}
			breAk;
		}

		if (stArtLineNumber !== rAnge.endLineNumber) {
			let virtuAlModel = {
				getLineTokens: (lineNumber: number) => {
					return model.getLineTokens(lineNumber);
				},
				getLAnguAgeIdentifier: () => {
					return model.getLAnguAgeIdentifier();
				},
				getLAnguAgeIdAtPosition: (lineNumber: number, column: number) => {
					return model.getLAnguAgeIdAtPosition(lineNumber, column);
				},
				getLineContent: (lineNumber: number) => {
					if (lineNumber === firstLineNumber) {
						return firstLineText;
					} else {
						return model.getLineContent(lineNumber);
					}
				}
			};
			let indentOfSecondLine = LAnguAgeConfigurAtionRegistry.getGoodIndentForLine(AutoIndent, virtuAlModel, model.getLAnguAgeIdentifier().id, stArtLineNumber + 1, indentConverter);
			if (indentOfSecondLine !== null) {
				let newSpAceCntOfSecondLine = indentUtils.getSpAceCnt(indentOfSecondLine, tAbSize);
				let oldSpAceCntOfSecondLine = indentUtils.getSpAceCnt(strings.getLeAdingWhitespAce(model.getLineContent(stArtLineNumber + 1)), tAbSize);

				if (newSpAceCntOfSecondLine !== oldSpAceCntOfSecondLine) {
					let spAceCntOffset = newSpAceCntOfSecondLine - oldSpAceCntOfSecondLine;
					for (let i = stArtLineNumber + 1; i <= rAnge.endLineNumber; i++) {
						let lineContent = model.getLineContent(i);
						let originAlIndent = strings.getLeAdingWhitespAce(lineContent);
						let originAlSpAcesCnt = indentUtils.getSpAceCnt(originAlIndent, tAbSize);
						let newSpAcesCnt = originAlSpAcesCnt + spAceCntOffset;
						let newIndent = indentUtils.generAteIndent(newSpAcesCnt, tAbSize, insertSpAces);

						if (newIndent !== originAlIndent) {
							textEdits.push({
								rAnge: new RAnge(i, 1, i, originAlIndent.length + 1),
								text: newIndent
							});
						}
					}
				}
			}
		}

		let cmd = new AutoIndentOnPAsteCommAnd(textEdits, this.editor.getSelection()!);
		this.editor.executeCommAnd('AutoIndentOnPAste', cmd);
		this.editor.pushUndoStop();
	}

	privAte shouldIgnoreLine(model: ITextModel, lineNumber: number): booleAn {
		model.forceTokenizAtion(lineNumber);
		let nonWhitespAceColumn = model.getLineFirstNonWhitespAceColumn(lineNumber);
		if (nonWhitespAceColumn === 0) {
			return true;
		}
		let tokens = model.getLineTokens(lineNumber);
		if (tokens.getCount() > 0) {
			let firstNonWhitespAceTokenIndex = tokens.findTokenIndexAtOffset(nonWhitespAceColumn);
			if (firstNonWhitespAceTokenIndex >= 0 && tokens.getStAndArdTokenType(firstNonWhitespAceTokenIndex) === StAndArdTokenType.Comment) {
				return true;
			}
		}

		return fAlse;
	}

	public dispose(): void {
		this.cAllOnDispose.dispose();
		this.cAllOnModel.dispose();
	}
}

function getIndentAtionEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder, tAbSize: number, tAbsToSpAces: booleAn): void {
	if (model.getLineCount() === 1 && model.getLineMAxColumn(1) === 1) {
		// Model is empty
		return;
	}

	let spAces = '';
	for (let i = 0; i < tAbSize; i++) {
		spAces += ' ';
	}

	let spAcesRegExp = new RegExp(spAces, 'gi');

	for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
		let lAstIndentAtionColumn = model.getLineFirstNonWhitespAceColumn(lineNumber);
		if (lAstIndentAtionColumn === 0) {
			lAstIndentAtionColumn = model.getLineMAxColumn(lineNumber);
		}

		if (lAstIndentAtionColumn === 1) {
			continue;
		}

		const originAlIndentAtionRAnge = new RAnge(lineNumber, 1, lineNumber, lAstIndentAtionColumn);
		const originAlIndentAtion = model.getVAlueInRAnge(originAlIndentAtionRAnge);
		const newIndentAtion = (
			tAbsToSpAces
				? originAlIndentAtion.replAce(/\t/ig, spAces)
				: originAlIndentAtion.replAce(spAcesRegExp, '\t')
		);

		builder.AddEditOperAtion(originAlIndentAtionRAnge, newIndentAtion);
	}
}

export clAss IndentAtionToSpAcesCommAnd implements ICommAnd {

	privAte selectionId: string | null = null;

	constructor(privAte reAdonly selection: Selection, privAte tAbSize: number) { }

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		this.selectionId = builder.trAckSelection(this.selection);
		getIndentAtionEditOperAtions(model, builder, this.tAbSize, true);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this.selectionId!);
	}
}

export clAss IndentAtionToTAbsCommAnd implements ICommAnd {

	privAte selectionId: string | null = null;

	constructor(privAte reAdonly selection: Selection, privAte tAbSize: number) { }

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		this.selectionId = builder.trAckSelection(this.selection);
		getIndentAtionEditOperAtions(model, builder, this.tAbSize, fAlse);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this.selectionId!);
	}
}

registerEditorContribution(AutoIndentOnPAste.ID, AutoIndentOnPAste);
registerEditorAction(IndentAtionToSpAcesAction);
registerEditorAction(IndentAtionToTAbsAction);
registerEditorAction(IndentUsingTAbs);
registerEditorAction(IndentUsingSpAces);
registerEditorAction(DetectIndentAtion);
registerEditorAction(ReindentLinesAction);
registerEditorAction(ReindentSelectedLinesAction);
