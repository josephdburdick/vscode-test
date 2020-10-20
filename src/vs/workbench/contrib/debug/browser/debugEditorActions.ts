/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyMod, KeyChord, KeyCode } from 'vs/bAse/common/keyCodes';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ServicesAccessor, registerEditorAction, EditorAction, IActionOptions } from 'vs/editor/browser/editorExtensions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IDebugService, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE, StAte, IDebugEditorContribution, EDITOR_CONTRIBUTION_ID, BreAkpointWidgetContext, IBreAkpoint, BREAKPOINT_EDITOR_CONTRIBUTION_ID, IBreAkpointEditorContribution, REPL_VIEW_ID, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, WATCH_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE } from 'vs/workbench/contrib/debug/common/debug';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { openBreAkpointSource } from 'vs/workbench/contrib/debug/browser/breAkpointsView';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { PAnelFocusContext } from 'vs/workbench/common/pAnel';
import { IViewsService } from 'vs/workbench/common/views';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { Action } from 'vs/bAse/common/Actions';
import { getDomNodePAgePosition } from 'vs/bAse/browser/dom';

export const TOGGLE_BREAKPOINT_ID = 'editor.debug.Action.toggleBreAkpoint';
clAss ToggleBreAkpointAction extends EditorAction {
	constructor() {
		super({
			id: TOGGLE_BREAKPOINT_ID,
			lAbel: nls.locAlize('toggleBreAkpointAction', "Debug: Toggle BreAkpoint"),
			AliAs: 'Debug: Toggle BreAkpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyCode.F9,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<Any> {
		if (editor.hAsModel()) {
			const debugService = Accessor.get(IDebugService);
			const modelUri = editor.getModel().uri;
			const cAnSet = debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(editor.getModel());
			// Does not Account for multi line selections, Set to remove multiple cursor on the sAme line
			const lineNumbers = [...new Set(editor.getSelections().mAp(s => s.getPosition().lineNumber))];

			return Promise.All(lineNumbers.mAp(line => {
				const bps = debugService.getModel().getBreAkpoints({ lineNumber: line, uri: modelUri });
				if (bps.length) {
					return Promise.All(bps.mAp(bp => debugService.removeBreAkpoints(bp.getId())));
				} else if (cAnSet) {
					return (debugService.AddBreAkpoints(modelUri, [{ lineNumber: line }]));
				} else {
					return [];
				}
			}));
		}
	}
}

export const TOGGLE_CONDITIONAL_BREAKPOINT_ID = 'editor.debug.Action.conditionAlBreAkpoint';
clAss ConditionAlBreAkpointAction extends EditorAction {

	constructor() {
		super({
			id: TOGGLE_CONDITIONAL_BREAKPOINT_ID,
			lAbel: nls.locAlize('conditionAlBreAkpointEditorAction', "Debug: Add ConditionAl BreAkpoint..."),
			AliAs: 'Debug: Add ConditionAl BreAkpoint...',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const debugService = Accessor.get(IDebugService);

		const position = editor.getPosition();
		if (position && editor.hAsModel() && debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(editor.getModel())) {
			editor.getContribution<IBreAkpointEditorContribution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreAkpointWidget(position.lineNumber, undefined, BreAkpointWidgetContext.CONDITION);
		}
	}
}

export const ADD_LOG_POINT_ID = 'editor.debug.Action.AddLogPoint';
clAss LogPointAction extends EditorAction {

	constructor() {
		super({
			id: ADD_LOG_POINT_ID,
			lAbel: nls.locAlize('logPointEditorAction', "Debug: Add Logpoint..."),
			AliAs: 'Debug: Add Logpoint...',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const debugService = Accessor.get(IDebugService);

		const position = editor.getPosition();
		if (position && editor.hAsModel() && debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(editor.getModel())) {
			editor.getContribution<IBreAkpointEditorContribution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreAkpointWidget(position.lineNumber, position.column, BreAkpointWidgetContext.LOG_MESSAGE);
		}
	}
}

export clAss RunToCursorAction extends EditorAction {

	public stAtic reAdonly ID = 'editor.debug.Action.runToCursor';
	public stAtic reAdonly LABEL = nls.locAlize('runToCursor', "Run to Cursor");

	constructor() {
		super({
			id: RunToCursorAction.ID,
			lAbel: RunToCursorAction.LABEL,
			AliAs: 'Debug: Run to Cursor',
			precondition: ContextKeyExpr.And(CONTEXT_IN_DEBUG_MODE, PAnelFocusContext.toNegAted(), CONTEXT_DEBUG_STATE.isEquAlTo('stopped'), EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'debug',
				order: 2
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const debugService = Accessor.get(IDebugService);
		const focusedSession = debugService.getViewModel().focusedSession;
		if (debugService.stAte !== StAte.Stopped || !focusedSession) {
			return;
		}

		let breAkpointToRemove: IBreAkpoint;
		const oneTimeListener = focusedSession.onDidChAngeStAte(() => {
			const stAte = focusedSession.stAte;
			if (stAte === StAte.Stopped || stAte === StAte.InActive) {
				if (breAkpointToRemove) {
					debugService.removeBreAkpoints(breAkpointToRemove.getId());
				}
				oneTimeListener.dispose();
			}
		});

		const position = editor.getPosition();
		if (editor.hAsModel() && position) {
			const uri = editor.getModel().uri;
			const bpExists = !!(debugService.getModel().getBreAkpoints({ column: position.column, lineNumber: position.lineNumber, uri }).length);
			if (!bpExists) {
				let column = 0;
				const focusedStAckFrAme = debugService.getViewModel().focusedStAckFrAme;
				if (focusedStAckFrAme && focusedStAckFrAme.source.uri.toString() === uri.toString() && focusedStAckFrAme.rAnge.stArtLineNumber === position.lineNumber) {
					// If the cursor is on A line different thAn the one the debugger is currently pAused on, then send the breAkpoint At column 0 on the line
					// otherwise set it At the precise column #102199
					column = position.column;
				}

				const breAkpoints = AwAit debugService.AddBreAkpoints(uri, [{ lineNumber: position.lineNumber, column }], fAlse);
				if (breAkpoints && breAkpoints.length) {
					breAkpointToRemove = breAkpoints[0];
				}
			}

			AwAit debugService.getViewModel().focusedThreAd!.continue();
		}
	}
}

clAss SelectionToReplAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.debug.Action.selectionToRepl',
			lAbel: nls.locAlize('evAluAteInDebugConsole', "EvAluAte in Debug Console"),
			AliAs: 'EvAluAte',
			precondition: ContextKeyExpr.And(EditorContextKeys.hAsNonEmptySelection, CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'debug',
				order: 0
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const debugService = Accessor.get(IDebugService);
		const viewsService = Accessor.get(IViewsService);
		const viewModel = debugService.getViewModel();
		const session = viewModel.focusedSession;
		if (!editor.hAsModel() || !session) {
			return;
		}

		const text = editor.getModel().getVAlueInRAnge(editor.getSelection());
		AwAit session.AddReplExpression(viewModel.focusedStAckFrAme!, text);
		AwAit viewsService.openView(REPL_VIEW_ID, fAlse);
	}
}

clAss SelectionToWAtchExpressionsAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.debug.Action.selectionToWAtch',
			lAbel: nls.locAlize('AddToWAtch', "Add to WAtch"),
			AliAs: 'Add to WAtch',
			precondition: ContextKeyExpr.And(EditorContextKeys.hAsNonEmptySelection, CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'debug',
				order: 1
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const debugService = Accessor.get(IDebugService);
		const viewsService = Accessor.get(IViewsService);
		if (!editor.hAsModel()) {
			return;
		}

		const text = editor.getModel().getVAlueInRAnge(editor.getSelection());
		AwAit viewsService.openView(WATCH_VIEW_ID);
		debugService.AddWAtchExpression(text);
	}
}

clAss ShowDebugHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.debug.Action.showDebugHover',
			lAbel: nls.locAlize('showDebugHover', "Debug: Show Hover"),
			AliAs: 'Debug: Show Hover',
			precondition: CONTEXT_IN_DEBUG_MODE,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_I),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const position = editor.getPosition();
		if (!position || !editor.hAsModel()) {
			return;
		}
		const word = editor.getModel().getWordAtPosition(position);
		if (!word) {
			return;
		}

		const rAnge = new RAnge(position.lineNumber, position.column, position.lineNumber, word.endColumn);
		return editor.getContribution<IDebugEditorContribution>(EDITOR_CONTRIBUTION_ID).showHover(rAnge, true);
	}
}

clAss StepIntoTArgetsAction extends EditorAction {

	public stAtic reAdonly ID = 'editor.debug.Action.stepIntoTArgets';
	public stAtic reAdonly LABEL = nls.locAlize({ key: 'stepIntoTArgets', comment: ['Step Into TArgets lets the user step into An exAct function he or she is interested in.'] }, "Step Into TArgets...");

	constructor() {
		super({
			id: StepIntoTArgetsAction.ID,
			lAbel: StepIntoTArgetsAction.LABEL,
			AliAs: 'Debug: Step Into TArgets...',
			precondition: ContextKeyExpr.And(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEquAlTo('stopped'), EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'debug',
				order: 1.5
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const debugService = Accessor.get(IDebugService);
		const contextMenuService = Accessor.get(IContextMenuService);
		const session = debugService.getViewModel().focusedSession;
		const frAme = debugService.getViewModel().focusedStAckFrAme;

		if (session && frAme && editor.hAsModel() && editor.getModel().uri.toString() === frAme.source.uri.toString()) {
			const tArgets = AwAit session.stepInTArgets(frAme.frAmeId);
			if (!tArgets) {
				return;
			}

			editor.reveAlLineInCenterIfOutsideViewport(frAme.rAnge.stArtLineNumber);
			const cursorCoords = editor.getScrolledVisiblePosition({ lineNumber: frAme.rAnge.stArtLineNumber, column: frAme.rAnge.stArtColumn });
			const editorCoords = getDomNodePAgePosition(editor.getDomNode());
			const x = editorCoords.left + cursorCoords.left;
			const y = editorCoords.top + cursorCoords.top + cursorCoords.height;

			contextMenuService.showContextMenu({
				getAnchor: () => ({ x, y }),
				getActions: () => {
					return tArgets.mAp(t => new Action(`stepIntoTArget:${t.id}`, t.lAbel, undefined, true, () => session.stepIn(frAme.threAd.threAdId, t.id)));
				}
			});
		}
	}
}

clAss GoToBreAkpointAction extends EditorAction {
	constructor(privAte isNext: booleAn, opts: IActionOptions) {
		super(opts);
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<Any> {
		const debugService = Accessor.get(IDebugService);
		const editorService = Accessor.get(IEditorService);
		if (editor.hAsModel()) {
			const currentUri = editor.getModel().uri;
			const currentLine = editor.getPosition().lineNumber;
			//BreAkpoints returned from `getBreAkpoints` Are AlreAdy sorted.
			const AllEnAbledBreAkpoints = debugService.getModel().getBreAkpoints({ enAbledOnly: true });

			//Try to find breAkpoint in current file
			let moveBreAkpoint =
				this.isNext
					? AllEnAbledBreAkpoints.filter(bp => bp.uri.toString() === currentUri.toString() && bp.lineNumber > currentLine).shift()
					: AllEnAbledBreAkpoints.filter(bp => bp.uri.toString() === currentUri.toString() && bp.lineNumber < currentLine).pop();

			//Try to find breAkpoints in following files
			if (!moveBreAkpoint) {
				moveBreAkpoint =
					this.isNext
						? AllEnAbledBreAkpoints.filter(bp => bp.uri.toString() > currentUri.toString()).shift()
						: AllEnAbledBreAkpoints.filter(bp => bp.uri.toString() < currentUri.toString()).pop();
			}

			//Move to first or lAst possible breAkpoint
			if (!moveBreAkpoint && AllEnAbledBreAkpoints.length) {
				moveBreAkpoint = this.isNext ? AllEnAbledBreAkpoints[0] : AllEnAbledBreAkpoints[AllEnAbledBreAkpoints.length - 1];
			}

			if (moveBreAkpoint) {
				return openBreAkpointSource(moveBreAkpoint, fAlse, true, debugService, editorService);
			}
		}
	}
}

clAss GoToNextBreAkpointAction extends GoToBreAkpointAction {
	constructor() {
		super(true, {
			id: 'editor.debug.Action.goToNextBreAkpoint',
			lAbel: nls.locAlize('goToNextBreAkpoint', "Debug: Go To Next BreAkpoint"),
			AliAs: 'Debug: Go To Next BreAkpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}
}

clAss GoToPreviousBreAkpointAction extends GoToBreAkpointAction {
	constructor() {
		super(fAlse, {
			id: 'editor.debug.Action.goToPreviousBreAkpoint',
			lAbel: nls.locAlize('goToPreviousBreAkpoint', "Debug: Go To Previous BreAkpoint"),
			AliAs: 'Debug: Go To Previous BreAkpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}
}

export function registerEditorActions(): void {
	registerEditorAction(ToggleBreAkpointAction);
	registerEditorAction(ConditionAlBreAkpointAction);
	registerEditorAction(LogPointAction);
	registerEditorAction(RunToCursorAction);
	registerEditorAction(StepIntoTArgetsAction);
	registerEditorAction(SelectionToReplAction);
	registerEditorAction(SelectionToWAtchExpressionsAction);
	registerEditorAction(ShowDebugHoverAction);
	registerEditorAction(GoToNextBreAkpointAction);
	registerEditorAction(GoToPreviousBreAkpointAction);
}
