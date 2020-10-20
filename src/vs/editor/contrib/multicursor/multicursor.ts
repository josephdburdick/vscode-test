/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { KeyChord, KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { CursorChAngeReAson, ICursorSelectionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { CursorMoveCommAnds } from 'vs/editor/common/controller/cursorMoveCommAnds';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ConstAnts } from 'vs/bAse/common/uint';
import { IEditorContribution, ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { FindMAtch, ITextModel, OverviewRulerLAne, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { DocumentHighlightProviderRegistry } from 'vs/editor/common/modes';
import { CommonFindController } from 'vs/editor/contrib/find/findController';
import { FindOptionOverride, INewFindReplAceStAte } from 'vs/editor/contrib/find/findStAte';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { overviewRulerSelectionHighlightForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { themeColorFromId } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';

export clAss InsertCursorAbove extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.insertCursorAbove',
			lAbel: nls.locAlize('mutlicursor.insertAbove', "Add Cursor Above"),
			AliAs: 'Add Cursor Above',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.UpArrow,
				linux: {
					primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.UpArrow,
					secondAry: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.UpArrow]
				},
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miInsertCursorAbove', comment: ['&& denotes A mnemonic'] }, "&&Add Cursor Above"),
				order: 2
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		if (!editor.hAsModel()) {
			return;
		}

		const useLogicAlLine = (Args && Args.logicAlLine === true);
		const viewModel = editor._getViewModel();

		if (viewModel.cursorConfig.reAdOnly) {
			return;
		}

		viewModel.pushStAckElement();
		viewModel.setCursorStAtes(
			Args.source,
			CursorChAngeReAson.Explicit,
			CursorMoveCommAnds.AddCursorUp(viewModel, viewModel.getCursorStAtes(), useLogicAlLine)
		);
		viewModel.reveAlTopMostCursor(Args.source);
	}
}

export clAss InsertCursorBelow extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.insertCursorBelow',
			lAbel: nls.locAlize('mutlicursor.insertBelow', "Add Cursor Below"),
			AliAs: 'Add Cursor Below',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.DownArrow,
				linux: {
					primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.DownArrow,
					secondAry: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.DownArrow]
				},
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miInsertCursorBelow', comment: ['&& denotes A mnemonic'] }, "A&&dd Cursor Below"),
				order: 3
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		if (!editor.hAsModel()) {
			return;
		}

		const useLogicAlLine = (Args && Args.logicAlLine === true);
		const viewModel = editor._getViewModel();

		if (viewModel.cursorConfig.reAdOnly) {
			return;
		}

		viewModel.pushStAckElement();
		viewModel.setCursorStAtes(
			Args.source,
			CursorChAngeReAson.Explicit,
			CursorMoveCommAnds.AddCursorDown(viewModel, viewModel.getCursorStAtes(), useLogicAlLine)
		);
		viewModel.reveAlBottomMostCursor(Args.source);
	}
}

clAss InsertCursorAtEndOfEAchLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.insertCursorAtEndOfEAchLineSelected',
			lAbel: nls.locAlize('mutlicursor.insertAtEndOfEAchLineSelected', "Add Cursors to Line Ends"),
			AliAs: 'Add Cursors to Line Ends',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_I,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miInsertCursorAtEndOfEAchLineSelected', comment: ['&& denotes A mnemonic'] }, "Add C&&ursors to Line Ends"),
				order: 4
			}
		});
	}

	privAte getCursorsForSelection(selection: Selection, model: ITextModel, result: Selection[]): void {
		if (selection.isEmpty()) {
			return;
		}

		for (let i = selection.stArtLineNumber; i < selection.endLineNumber; i++) {
			let currentLineMAxColumn = model.getLineMAxColumn(i);
			result.push(new Selection(i, currentLineMAxColumn, i, currentLineMAxColumn));
		}
		if (selection.endColumn > 1) {
			result.push(new Selection(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn));
		}
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const model = editor.getModel();
		const selections = editor.getSelections();
		let newSelections: Selection[] = [];
		selections.forEAch((sel) => this.getCursorsForSelection(sel, model, newSelections));

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

clAss InsertCursorAtEndOfLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.AddCursorsToBottom',
			lAbel: nls.locAlize('mutlicursor.AddCursorsToBottom', "Add Cursors To Bottom"),
			AliAs: 'Add Cursors To Bottom',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const selections = editor.getSelections();
		const lineCount = editor.getModel().getLineCount();

		let newSelections: Selection[] = [];
		for (let i = selections[0].stArtLineNumber; i <= lineCount; i++) {
			newSelections.push(new Selection(i, selections[0].stArtColumn, i, selections[0].endColumn));
		}

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

clAss InsertCursorAtTopOfLineSelected extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.AddCursorsToTop',
			lAbel: nls.locAlize('mutlicursor.AddCursorsToTop', "Add Cursors To Top"),
			AliAs: 'Add Cursors To Top',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const selections = editor.getSelections();

		let newSelections: Selection[] = [];
		for (let i = selections[0].stArtLineNumber; i >= 1; i--) {
			newSelections.push(new Selection(i, selections[0].stArtColumn, i, selections[0].endColumn));
		}

		if (newSelections.length > 0) {
			editor.setSelections(newSelections);
		}
	}
}

export clAss MultiCursorSessionResult {
	constructor(
		public reAdonly selections: Selection[],
		public reAdonly reveAlRAnge: RAnge,
		public reAdonly reveAlScrollType: ScrollType
	) { }
}

export clAss MultiCursorSession {

	public stAtic creAte(editor: ICodeEditor, findController: CommonFindController): MultiCursorSession | null {
		if (!editor.hAsModel()) {
			return null;
		}
		const findStAte = findController.getStAte();

		// Find widget owns entirely whAt we seArch for if:
		//  - focus is not in the editor (i.e. it is in the find widget)
		//  - And the seArch widget is visible
		//  - And the seArch string is non-empty
		if (!editor.hAsTextFocus() && findStAte.isReveAled && findStAte.seArchString.length > 0) {
			// Find widget owns whAt is seArched for
			return new MultiCursorSession(editor, findController, fAlse, findStAte.seArchString, findStAte.wholeWord, findStAte.mAtchCAse, null);
		}

		// Otherwise, the selection gives the seArch text, And the find widget gives the seArch settings
		// The exception is the find stAte disAssociAtion cAse: when beginning with A single, collApsed selection
		let isDisconnectedFromFindController = fAlse;
		let wholeWord: booleAn;
		let mAtchCAse: booleAn;
		const selections = editor.getSelections();
		if (selections.length === 1 && selections[0].isEmpty()) {
			isDisconnectedFromFindController = true;
			wholeWord = true;
			mAtchCAse = true;
		} else {
			wholeWord = findStAte.wholeWord;
			mAtchCAse = findStAte.mAtchCAse;
		}

		// Selection owns whAt is seArched for
		const s = editor.getSelection();

		let seArchText: string;
		let currentMAtch: Selection | null = null;

		if (s.isEmpty()) {
			// selection is empty => expAnd to current word
			const word = editor.getConfiguredWordAtPosition(s.getStArtPosition());
			if (!word) {
				return null;
			}
			seArchText = word.word;
			currentMAtch = new Selection(s.stArtLineNumber, word.stArtColumn, s.stArtLineNumber, word.endColumn);
		} else {
			seArchText = editor.getModel().getVAlueInRAnge(s).replAce(/\r\n/g, '\n');
		}

		return new MultiCursorSession(editor, findController, isDisconnectedFromFindController, seArchText, wholeWord, mAtchCAse, currentMAtch);
	}

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		public reAdonly findController: CommonFindController,
		public reAdonly isDisconnectedFromFindController: booleAn,
		public reAdonly seArchText: string,
		public reAdonly wholeWord: booleAn,
		public reAdonly mAtchCAse: booleAn,
		public currentMAtch: Selection | null
	) { }

	public AddSelectionToNextFindMAtch(): MultiCursorSessionResult | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		const nextMAtch = this._getNextMAtch();
		if (!nextMAtch) {
			return null;
		}

		const AllSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(AllSelections.concAt(nextMAtch), nextMAtch, ScrollType.Smooth);
	}

	public moveSelectionToNextFindMAtch(): MultiCursorSessionResult | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		const nextMAtch = this._getNextMAtch();
		if (!nextMAtch) {
			return null;
		}

		const AllSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(AllSelections.slice(0, AllSelections.length - 1).concAt(nextMAtch), nextMAtch, ScrollType.Smooth);
	}

	privAte _getNextMAtch(): Selection | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		if (this.currentMAtch) {
			const result = this.currentMAtch;
			this.currentMAtch = null;
			return result;
		}

		this.findController.highlightFindOptions();

		const AllSelections = this._editor.getSelections();
		const lAstAddedSelection = AllSelections[AllSelections.length - 1];
		const nextMAtch = this._editor.getModel().findNextMAtch(this.seArchText, lAstAddedSelection.getEndPosition(), fAlse, this.mAtchCAse, this.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse);

		if (!nextMAtch) {
			return null;
		}
		return new Selection(nextMAtch.rAnge.stArtLineNumber, nextMAtch.rAnge.stArtColumn, nextMAtch.rAnge.endLineNumber, nextMAtch.rAnge.endColumn);
	}

	public AddSelectionToPreviousFindMAtch(): MultiCursorSessionResult | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		const previousMAtch = this._getPreviousMAtch();
		if (!previousMAtch) {
			return null;
		}

		const AllSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(AllSelections.concAt(previousMAtch), previousMAtch, ScrollType.Smooth);
	}

	public moveSelectionToPreviousFindMAtch(): MultiCursorSessionResult | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		const previousMAtch = this._getPreviousMAtch();
		if (!previousMAtch) {
			return null;
		}

		const AllSelections = this._editor.getSelections();
		return new MultiCursorSessionResult(AllSelections.slice(0, AllSelections.length - 1).concAt(previousMAtch), previousMAtch, ScrollType.Smooth);
	}

	privAte _getPreviousMAtch(): Selection | null {
		if (!this._editor.hAsModel()) {
			return null;
		}

		if (this.currentMAtch) {
			const result = this.currentMAtch;
			this.currentMAtch = null;
			return result;
		}

		this.findController.highlightFindOptions();

		const AllSelections = this._editor.getSelections();
		const lAstAddedSelection = AllSelections[AllSelections.length - 1];
		const previousMAtch = this._editor.getModel().findPreviousMAtch(this.seArchText, lAstAddedSelection.getStArtPosition(), fAlse, this.mAtchCAse, this.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse);

		if (!previousMAtch) {
			return null;
		}
		return new Selection(previousMAtch.rAnge.stArtLineNumber, previousMAtch.rAnge.stArtColumn, previousMAtch.rAnge.endLineNumber, previousMAtch.rAnge.endColumn);
	}

	public selectAll(): FindMAtch[] {
		if (!this._editor.hAsModel()) {
			return [];
		}

		this.findController.highlightFindOptions();

		return this._editor.getModel().findMAtches(this.seArchText, true, fAlse, this.mAtchCAse, this.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse, ConstAnts.MAX_SAFE_SMALL_INTEGER);
	}
}

export clAss MultiCursorSelectionController extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.multiCursorController';

	privAte reAdonly _editor: ICodeEditor;
	privAte _ignoreSelectionChAnge: booleAn;
	privAte _session: MultiCursorSession | null;
	privAte reAdonly _sessionDispose = this._register(new DisposAbleStore());

	public stAtic get(editor: ICodeEditor): MultiCursorSelectionController {
		return editor.getContribution<MultiCursorSelectionController>(MultiCursorSelectionController.ID);
	}

	constructor(editor: ICodeEditor) {
		super();
		this._editor = editor;
		this._ignoreSelectionChAnge = fAlse;
		this._session = null;
	}

	public dispose(): void {
		this._endSession();
		super.dispose();
	}

	privAte _beginSessionIfNeeded(findController: CommonFindController): void {
		if (!this._session) {
			// CreAte A new session
			const session = MultiCursorSession.creAte(this._editor, findController);
			if (!session) {
				return;
			}

			this._session = session;

			const newStAte: INewFindReplAceStAte = { seArchString: this._session.seArchText };
			if (this._session.isDisconnectedFromFindController) {
				newStAte.wholeWordOverride = FindOptionOverride.True;
				newStAte.mAtchCAseOverride = FindOptionOverride.True;
				newStAte.isRegexOverride = FindOptionOverride.FAlse;
			}
			findController.getStAte().chAnge(newStAte, fAlse);

			this._sessionDispose.Add(this._editor.onDidChAngeCursorSelection((e) => {
				if (this._ignoreSelectionChAnge) {
					return;
				}
				this._endSession();
			}));
			this._sessionDispose.Add(this._editor.onDidBlurEditorText(() => {
				this._endSession();
			}));
			this._sessionDispose.Add(findController.getStAte().onFindReplAceStAteChAnge((e) => {
				if (e.mAtchCAse || e.wholeWord) {
					this._endSession();
				}
			}));
		}
	}

	privAte _endSession(): void {
		this._sessionDispose.cleAr();
		if (this._session && this._session.isDisconnectedFromFindController) {
			const newStAte: INewFindReplAceStAte = {
				wholeWordOverride: FindOptionOverride.NotSet,
				mAtchCAseOverride: FindOptionOverride.NotSet,
				isRegexOverride: FindOptionOverride.NotSet,
			};
			this._session.findController.getStAte().chAnge(newStAte, fAlse);
		}
		this._session = null;
	}

	privAte _setSelections(selections: Selection[]): void {
		this._ignoreSelectionChAnge = true;
		this._editor.setSelections(selections);
		this._ignoreSelectionChAnge = fAlse;
	}

	privAte _expAndEmptyToWord(model: ITextModel, selection: Selection): Selection {
		if (!selection.isEmpty()) {
			return selection;
		}
		const word = this._editor.getConfiguredWordAtPosition(selection.getStArtPosition());
		if (!word) {
			return selection;
		}
		return new Selection(selection.stArtLineNumber, word.stArtColumn, selection.stArtLineNumber, word.endColumn);
	}

	privAte _ApplySessionResult(result: MultiCursorSessionResult | null): void {
		if (!result) {
			return;
		}
		this._setSelections(result.selections);
		if (result.reveAlRAnge) {
			this._editor.reveAlRAngeInCenterIfOutsideViewport(result.reveAlRAnge, result.reveAlScrollType);
		}
	}

	public getSession(findController: CommonFindController): MultiCursorSession | null {
		return this._session;
	}

	public AddSelectionToNextFindMAtch(findController: CommonFindController): void {
		if (!this._editor.hAsModel()) {
			return;
		}
		if (!this._session) {
			// If there Are multiple cursors, hAndle the cAse where they do not All select the sAme text.
			const AllSelections = this._editor.getSelections();
			if (AllSelections.length > 1) {
				const findStAte = findController.getStAte();
				const mAtchCAse = findStAte.mAtchCAse;
				const selectionsContAinSAmeText = modelRAngesContAinSAmeText(this._editor.getModel(), AllSelections, mAtchCAse);
				if (!selectionsContAinSAmeText) {
					const model = this._editor.getModel();
					let resultingSelections: Selection[] = [];
					for (let i = 0, len = AllSelections.length; i < len; i++) {
						resultingSelections[i] = this._expAndEmptyToWord(model, AllSelections[i]);
					}
					this._editor.setSelections(resultingSelections);
					return;
				}
			}
		}
		this._beginSessionIfNeeded(findController);
		if (this._session) {
			this._ApplySessionResult(this._session.AddSelectionToNextFindMAtch());
		}
	}

	public AddSelectionToPreviousFindMAtch(findController: CommonFindController): void {
		this._beginSessionIfNeeded(findController);
		if (this._session) {
			this._ApplySessionResult(this._session.AddSelectionToPreviousFindMAtch());
		}
	}

	public moveSelectionToNextFindMAtch(findController: CommonFindController): void {
		this._beginSessionIfNeeded(findController);
		if (this._session) {
			this._ApplySessionResult(this._session.moveSelectionToNextFindMAtch());
		}
	}

	public moveSelectionToPreviousFindMAtch(findController: CommonFindController): void {
		this._beginSessionIfNeeded(findController);
		if (this._session) {
			this._ApplySessionResult(this._session.moveSelectionToPreviousFindMAtch());
		}
	}

	public selectAll(findController: CommonFindController): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		let mAtches: FindMAtch[] | null = null;

		const findStAte = findController.getStAte();

		// SpeciAl cAse: find widget owns entirely whAt we seArch for if:
		// - focus is not in the editor (i.e. it is in the find widget)
		// - And the seArch widget is visible
		// - And the seArch string is non-empty
		// - And we're seArching for A regex
		if (findStAte.isReveAled && findStAte.seArchString.length > 0 && findStAte.isRegex) {

			mAtches = this._editor.getModel().findMAtches(findStAte.seArchString, true, findStAte.isRegex, findStAte.mAtchCAse, findStAte.wholeWord ? this._editor.getOption(EditorOption.wordSepArAtors) : null, fAlse, ConstAnts.MAX_SAFE_SMALL_INTEGER);

		} else {

			this._beginSessionIfNeeded(findController);
			if (!this._session) {
				return;
			}

			mAtches = this._session.selectAll();
		}

		if (findStAte.seArchScope) {
			const stAtes = findStAte.seArchScope;
			let inSelection: FindMAtch[] | null = [];
			mAtches.forEAch((mAtch) => {
				stAtes.forEAch((stAte) => {
					if (mAtch.rAnge.endLineNumber <= stAte.endLineNumber && mAtch.rAnge.stArtLineNumber >= stAte.stArtLineNumber) {
						inSelection!.push(mAtch);
					}
				});
			});
			mAtches = inSelection;
		}

		if (mAtches.length > 0) {
			const editorSelection = this._editor.getSelection();
			// HAve the primAry cursor remAin the one where the Action wAs invoked
			for (let i = 0, len = mAtches.length; i < len; i++) {
				const mAtch = mAtches[i];
				const intersection = mAtch.rAnge.intersectRAnges(editorSelection);
				if (intersection) {
					// bingo!
					mAtches[i] = mAtches[0];
					mAtches[0] = mAtch;
					breAk;
				}
			}

			this._setSelections(mAtches.mAp(m => new Selection(m.rAnge.stArtLineNumber, m.rAnge.stArtColumn, m.rAnge.endLineNumber, m.rAnge.endColumn)));
		}
	}

	public selectAllUsingSelections(selections: Selection[]): void {
		if (selections.length > 0) {
			this._setSelections(selections);
		}
	}
}

export AbstrAct clAss MultiCursorSelectionControllerAction extends EditorAction {

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const multiCursorController = MultiCursorSelectionController.get(editor);
		if (!multiCursorController) {
			return;
		}
		const findController = CommonFindController.get(editor);
		if (!findController) {
			return;
		}
		this._run(multiCursorController, findController);
	}

	protected AbstrAct _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void;
}

export clAss AddSelectionToNextFindMAtchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.AddSelectionToNextFindMAtch',
			lAbel: nls.locAlize('AddSelectionToNextFindMAtch', "Add Selection To Next Find MAtch"),
			AliAs: 'Add Selection To Next Find MAtch',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_D,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miAddSelectionToNextFindMAtch', comment: ['&& denotes A mnemonic'] }, "Add &&Next Occurrence"),
				order: 5
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.AddSelectionToNextFindMAtch(findController);
	}
}

export clAss AddSelectionToPreviousFindMAtchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.AddSelectionToPreviousFindMAtch',
			lAbel: nls.locAlize('AddSelectionToPreviousFindMAtch', "Add Selection To Previous Find MAtch"),
			AliAs: 'Add Selection To Previous Find MAtch',
			precondition: undefined,
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miAddSelectionToPreviousFindMAtch', comment: ['&& denotes A mnemonic'] }, "Add P&&revious Occurrence"),
				order: 6
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.AddSelectionToPreviousFindMAtch(findController);
	}
}

export clAss MoveSelectionToNextFindMAtchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.moveSelectionToNextFindMAtch',
			lAbel: nls.locAlize('moveSelectionToNextFindMAtch', "Move LAst Selection To Next Find MAtch"),
			AliAs: 'Move LAst Selection To Next Find MAtch',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_D),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.moveSelectionToNextFindMAtch(findController);
	}
}

export clAss MoveSelectionToPreviousFindMAtchAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.moveSelectionToPreviousFindMAtch',
			lAbel: nls.locAlize('moveSelectionToPreviousFindMAtch', "Move LAst Selection To Previous Find MAtch"),
			AliAs: 'Move LAst Selection To Previous Find MAtch',
			precondition: undefined
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.moveSelectionToPreviousFindMAtch(findController);
	}
}

export clAss SelectHighlightsAction extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.selectHighlights',
			lAbel: nls.locAlize('selectAllOccurrencesOfFindMAtch', "Select All Occurrences of Find MAtch"),
			AliAs: 'Select All Occurrences of Find MAtch',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArSelectionMenu,
				group: '3_multi',
				title: nls.locAlize({ key: 'miSelectHighlights', comment: ['&& denotes A mnemonic'] }, "Select All &&Occurrences"),
				order: 7
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.selectAll(findController);
	}
}

export clAss CompAtChAngeAll extends MultiCursorSelectionControllerAction {
	constructor() {
		super({
			id: 'editor.Action.chAngeAll',
			lAbel: nls.locAlize('chAngeAll.lAbel', "ChAnge All Occurrences"),
			AliAs: 'ChAnge All Occurrences',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.editorTextFocus),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.F2,
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				group: '1_modificAtion',
				order: 1.2
			}
		});
	}
	protected _run(multiCursorController: MultiCursorSelectionController, findController: CommonFindController): void {
		multiCursorController.selectAll(findController);
	}
}

clAss SelectionHighlighterStAte {
	public reAdonly seArchText: string;
	public reAdonly mAtchCAse: booleAn;
	public reAdonly wordSepArAtors: string | null;
	public reAdonly modelVersionId: number;

	constructor(seArchText: string, mAtchCAse: booleAn, wordSepArAtors: string | null, modelVersionId: number) {
		this.seArchText = seArchText;
		this.mAtchCAse = mAtchCAse;
		this.wordSepArAtors = wordSepArAtors;
		this.modelVersionId = modelVersionId;
	}

	/**
	 * Everything equAls except for `lAstWordUnderCursor`
	 */
	public stAtic softEquAls(A: SelectionHighlighterStAte | null, b: SelectionHighlighterStAte | null): booleAn {
		if (!A && !b) {
			return true;
		}
		if (!A || !b) {
			return fAlse;
		}
		return (
			A.seArchText === b.seArchText
			&& A.mAtchCAse === b.mAtchCAse
			&& A.wordSepArAtors === b.wordSepArAtors
			&& A.modelVersionId === b.modelVersionId
		);
	}
}

export clAss SelectionHighlighter extends DisposAble implements IEditorContribution {
	public stAtic reAdonly ID = 'editor.contrib.selectionHighlighter';

	privAte reAdonly editor: ICodeEditor;
	privAte _isEnAbled: booleAn;
	privAte decorAtions: string[];
	privAte reAdonly updAteSoon: RunOnceScheduler;
	privAte stAte: SelectionHighlighterStAte | null;

	constructor(editor: ICodeEditor) {
		super();
		this.editor = editor;
		this._isEnAbled = editor.getOption(EditorOption.selectionHighlight);
		this.decorAtions = [];
		this.updAteSoon = this._register(new RunOnceScheduler(() => this._updAte(), 300));
		this.stAte = null;

		this._register(editor.onDidChAngeConfigurAtion((e) => {
			this._isEnAbled = editor.getOption(EditorOption.selectionHighlight);
		}));
		this._register(editor.onDidChAngeCursorSelection((e: ICursorSelectionChAngedEvent) => {

			if (!this._isEnAbled) {
				// EArly exit if nothing needs to be done!
				// LeAve some form of eArly exit check here if you wish to continue being A cursor position chAnge listener ;)
				return;
			}

			if (e.selection.isEmpty()) {
				if (e.reAson === CursorChAngeReAson.Explicit) {
					if (this.stAte) {
						// no longer vAlid
						this._setStAte(null);
					}
					this.updAteSoon.schedule();
				} else {
					this._setStAte(null);

				}
			} else {
				this._updAte();
			}
		}));
		this._register(editor.onDidChAngeModel((e) => {
			this._setStAte(null);
		}));
		this._register(editor.onDidChAngeModelContent((e) => {
			if (this._isEnAbled) {
				this.updAteSoon.schedule();
			}
		}));
		this._register(CommonFindController.get(editor).getStAte().onFindReplAceStAteChAnge((e) => {
			this._updAte();
		}));
	}

	privAte _updAte(): void {
		this._setStAte(SelectionHighlighter._creAteStAte(this._isEnAbled, this.editor));
	}

	privAte stAtic _creAteStAte(isEnAbled: booleAn, editor: ICodeEditor): SelectionHighlighterStAte | null {
		if (!isEnAbled) {
			return null;
		}
		if (!editor.hAsModel()) {
			return null;
		}
		const s = editor.getSelection();
		if (s.stArtLineNumber !== s.endLineNumber) {
			// multiline forbidden for perf reAsons
			return null;
		}
		const multiCursorController = MultiCursorSelectionController.get(editor);
		if (!multiCursorController) {
			return null;
		}
		const findController = CommonFindController.get(editor);
		if (!findController) {
			return null;
		}
		let r = multiCursorController.getSession(findController);
		if (!r) {
			const AllSelections = editor.getSelections();
			if (AllSelections.length > 1) {
				const findStAte = findController.getStAte();
				const mAtchCAse = findStAte.mAtchCAse;
				const selectionsContAinSAmeText = modelRAngesContAinSAmeText(editor.getModel(), AllSelections, mAtchCAse);
				if (!selectionsContAinSAmeText) {
					return null;
				}
			}

			r = MultiCursorSession.creAte(editor, findController);
		}
		if (!r) {
			return null;
		}

		if (r.currentMAtch) {
			// This is An empty selection
			// Do not interfere with semAntic word highlighting in the no selection cAse
			return null;
		}
		if (/^[ \t]+$/.test(r.seArchText)) {
			// whitespAce only selection
			return null;
		}
		if (r.seArchText.length > 200) {
			// very long selection
			return null;
		}

		// TODO: better hAndling of this cAse
		const findStAte = findController.getStAte();
		const cAseSensitive = findStAte.mAtchCAse;

		// Return eArly if the find widget shows the exAct sAme mAtches
		if (findStAte.isReveAled) {
			let findStAteSeArchString = findStAte.seArchString;
			if (!cAseSensitive) {
				findStAteSeArchString = findStAteSeArchString.toLowerCAse();
			}

			let mySeArchString = r.seArchText;
			if (!cAseSensitive) {
				mySeArchString = mySeArchString.toLowerCAse();
			}

			if (findStAteSeArchString === mySeArchString && r.mAtchCAse === findStAte.mAtchCAse && r.wholeWord === findStAte.wholeWord && !findStAte.isRegex) {
				return null;
			}
		}

		return new SelectionHighlighterStAte(r.seArchText, r.mAtchCAse, r.wholeWord ? editor.getOption(EditorOption.wordSepArAtors) : null, editor.getModel().getVersionId());
	}

	privAte _setStAte(stAte: SelectionHighlighterStAte | null): void {
		if (SelectionHighlighterStAte.softEquAls(this.stAte, stAte)) {
			this.stAte = stAte;
			return;
		}
		this.stAte = stAte;

		if (!this.stAte) {
			this.decorAtions = this.editor.deltADecorAtions(this.decorAtions, []);
			return;
		}

		if (!this.editor.hAsModel()) {
			return;
		}

		const model = this.editor.getModel();
		if (model.isTooLArgeForTokenizAtion()) {
			// the file is too lArge, so seArching word under cursor in the whole document tAkes is blocking the UI.
			return;
		}

		const hAsFindOccurrences = DocumentHighlightProviderRegistry.hAs(model) && this.editor.getOption(EditorOption.occurrencesHighlight);

		let AllMAtches = model.findMAtches(this.stAte.seArchText, true, fAlse, this.stAte.mAtchCAse, this.stAte.wordSepArAtors, fAlse).mAp(m => m.rAnge);
		AllMAtches.sort(RAnge.compAreRAngesUsingStArts);

		let selections = this.editor.getSelections();
		selections.sort(RAnge.compAreRAngesUsingStArts);

		// do not overlAp with selection (issue #64 And #512)
		let mAtches: RAnge[] = [];
		for (let i = 0, j = 0, len = AllMAtches.length, lenJ = selections.length; i < len;) {
			const mAtch = AllMAtches[i];

			if (j >= lenJ) {
				// finished All editor selections
				mAtches.push(mAtch);
				i++;
			} else {
				const cmp = RAnge.compAreRAngesUsingStArts(mAtch, selections[j]);
				if (cmp < 0) {
					// mAtch is before sel
					if (selections[j].isEmpty() || !RAnge.AreIntersecting(mAtch, selections[j])) {
						mAtches.push(mAtch);
					}
					i++;
				} else if (cmp > 0) {
					// sel is before mAtch
					j++;
				} else {
					// sel is equAl to mAtch
					i++;
					j++;
				}
			}
		}

		const decorAtions = mAtches.mAp(r => {
			return {
				rAnge: r,
				// Show in overviewRuler only if model hAs no semAntic highlighting
				options: (hAsFindOccurrences ? SelectionHighlighter._SELECTION_HIGHLIGHT : SelectionHighlighter._SELECTION_HIGHLIGHT_OVERVIEW)
			};
		});

		this.decorAtions = this.editor.deltADecorAtions(this.decorAtions, decorAtions);
	}

	privAte stAtic reAdonly _SELECTION_HIGHLIGHT_OVERVIEW = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'selectionHighlight',
		overviewRuler: {
			color: themeColorFromId(overviewRulerSelectionHighlightForeground),
			position: OverviewRulerLAne.Center
		}
	});

	privAte stAtic reAdonly _SELECTION_HIGHLIGHT = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'selectionHighlight',
	});

	public dispose(): void {
		this._setStAte(null);
		super.dispose();
	}
}

function modelRAngesContAinSAmeText(model: ITextModel, rAnges: RAnge[], mAtchCAse: booleAn): booleAn {
	const selectedText = getVAlueInRAnge(model, rAnges[0], !mAtchCAse);
	for (let i = 1, len = rAnges.length; i < len; i++) {
		const rAnge = rAnges[i];
		if (rAnge.isEmpty()) {
			return fAlse;
		}
		const thisSelectedText = getVAlueInRAnge(model, rAnge, !mAtchCAse);
		if (selectedText !== thisSelectedText) {
			return fAlse;
		}
	}
	return true;
}

function getVAlueInRAnge(model: ITextModel, rAnge: RAnge, toLowerCAse: booleAn): string {
	const text = model.getVAlueInRAnge(rAnge);
	return (toLowerCAse ? text.toLowerCAse() : text);
}

registerEditorContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
registerEditorContribution(SelectionHighlighter.ID, SelectionHighlighter);

registerEditorAction(InsertCursorAbove);
registerEditorAction(InsertCursorBelow);
registerEditorAction(InsertCursorAtEndOfEAchLineSelected);
registerEditorAction(AddSelectionToNextFindMAtchAction);
registerEditorAction(AddSelectionToPreviousFindMAtchAction);
registerEditorAction(MoveSelectionToNextFindMAtchAction);
registerEditorAction(MoveSelectionToPreviousFindMAtchAction);
registerEditorAction(SelectHighlightsAction);
registerEditorAction(CompAtChAngeAll);
registerEditorAction(InsertCursorAtEndOfLineSelected);
registerEditorAction(InsertCursorAtTopOfLineSelected);
