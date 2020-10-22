/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import { Range } from 'vs/editor/common/core/range';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ServicesAccessor, registerEditorAction, EditorAction, IActionOptions } from 'vs/editor/Browser/editorExtensions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IDeBugService, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE, State, IDeBugEditorContriBution, EDITOR_CONTRIBUTION_ID, BreakpointWidgetContext, IBreakpoint, BREAKPOINT_EDITOR_CONTRIBUTION_ID, IBreakpointEditorContriBution, REPL_VIEW_ID, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, WATCH_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE } from 'vs/workBench/contriB/deBug/common/deBug';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { openBreakpointSource } from 'vs/workBench/contriB/deBug/Browser/BreakpointsView';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { PanelFocusContext } from 'vs/workBench/common/panel';
import { IViewsService } from 'vs/workBench/common/views';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { Action } from 'vs/Base/common/actions';
import { getDomNodePagePosition } from 'vs/Base/Browser/dom';

export const TOGGLE_BREAKPOINT_ID = 'editor.deBug.action.toggleBreakpoint';
class ToggleBreakpointAction extends EditorAction {
	constructor() {
		super({
			id: TOGGLE_BREAKPOINT_ID,
			laBel: nls.localize('toggleBreakpointAction', "DeBug: Toggle Breakpoint"),
			alias: 'DeBug: Toggle Breakpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyCode.F9,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<any> {
		if (editor.hasModel()) {
			const deBugService = accessor.get(IDeBugService);
			const modelUri = editor.getModel().uri;
			const canSet = deBugService.getConfigurationManager().canSetBreakpointsIn(editor.getModel());
			// Does not account for multi line selections, Set to remove multiple cursor on the same line
			const lineNumBers = [...new Set(editor.getSelections().map(s => s.getPosition().lineNumBer))];

			return Promise.all(lineNumBers.map(line => {
				const Bps = deBugService.getModel().getBreakpoints({ lineNumBer: line, uri: modelUri });
				if (Bps.length) {
					return Promise.all(Bps.map(Bp => deBugService.removeBreakpoints(Bp.getId())));
				} else if (canSet) {
					return (deBugService.addBreakpoints(modelUri, [{ lineNumBer: line }]));
				} else {
					return [];
				}
			}));
		}
	}
}

export const TOGGLE_CONDITIONAL_BREAKPOINT_ID = 'editor.deBug.action.conditionalBreakpoint';
class ConditionalBreakpointAction extends EditorAction {

	constructor() {
		super({
			id: TOGGLE_CONDITIONAL_BREAKPOINT_ID,
			laBel: nls.localize('conditionalBreakpointEditorAction', "DeBug: Add Conditional Breakpoint..."),
			alias: 'DeBug: Add Conditional Breakpoint...',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const deBugService = accessor.get(IDeBugService);

		const position = editor.getPosition();
		if (position && editor.hasModel() && deBugService.getConfigurationManager().canSetBreakpointsIn(editor.getModel())) {
			editor.getContriBution<IBreakpointEditorContriBution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreakpointWidget(position.lineNumBer, undefined, BreakpointWidgetContext.CONDITION);
		}
	}
}

export const ADD_LOG_POINT_ID = 'editor.deBug.action.addLogPoint';
class LogPointAction extends EditorAction {

	constructor() {
		super({
			id: ADD_LOG_POINT_ID,
			laBel: nls.localize('logPointEditorAction', "DeBug: Add Logpoint..."),
			alias: 'DeBug: Add Logpoint...',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const deBugService = accessor.get(IDeBugService);

		const position = editor.getPosition();
		if (position && editor.hasModel() && deBugService.getConfigurationManager().canSetBreakpointsIn(editor.getModel())) {
			editor.getContriBution<IBreakpointEditorContriBution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID).showBreakpointWidget(position.lineNumBer, position.column, BreakpointWidgetContext.LOG_MESSAGE);
		}
	}
}

export class RunToCursorAction extends EditorAction {

	puBlic static readonly ID = 'editor.deBug.action.runToCursor';
	puBlic static readonly LABEL = nls.localize('runToCursor', "Run to Cursor");

	constructor() {
		super({
			id: RunToCursorAction.ID,
			laBel: RunToCursorAction.LABEL,
			alias: 'DeBug: Run to Cursor',
			precondition: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'deBug',
				order: 2
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const deBugService = accessor.get(IDeBugService);
		const focusedSession = deBugService.getViewModel().focusedSession;
		if (deBugService.state !== State.Stopped || !focusedSession) {
			return;
		}

		let BreakpointToRemove: IBreakpoint;
		const oneTimeListener = focusedSession.onDidChangeState(() => {
			const state = focusedSession.state;
			if (state === State.Stopped || state === State.Inactive) {
				if (BreakpointToRemove) {
					deBugService.removeBreakpoints(BreakpointToRemove.getId());
				}
				oneTimeListener.dispose();
			}
		});

		const position = editor.getPosition();
		if (editor.hasModel() && position) {
			const uri = editor.getModel().uri;
			const BpExists = !!(deBugService.getModel().getBreakpoints({ column: position.column, lineNumBer: position.lineNumBer, uri }).length);
			if (!BpExists) {
				let column = 0;
				const focusedStackFrame = deBugService.getViewModel().focusedStackFrame;
				if (focusedStackFrame && focusedStackFrame.source.uri.toString() === uri.toString() && focusedStackFrame.range.startLineNumBer === position.lineNumBer) {
					// If the cursor is on a line different than the one the deBugger is currently paused on, then send the Breakpoint at column 0 on the line
					// otherwise set it at the precise column #102199
					column = position.column;
				}

				const Breakpoints = await deBugService.addBreakpoints(uri, [{ lineNumBer: position.lineNumBer, column }], false);
				if (Breakpoints && Breakpoints.length) {
					BreakpointToRemove = Breakpoints[0];
				}
			}

			await deBugService.getViewModel().focusedThread!.continue();
		}
	}
}

class SelectionToReplAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.deBug.action.selectionToRepl',
			laBel: nls.localize('evaluateInDeBugConsole', "Evaluate in DeBug Console"),
			alias: 'Evaluate',
			precondition: ContextKeyExpr.and(EditorContextKeys.hasNonEmptySelection, CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'deBug',
				order: 0
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const deBugService = accessor.get(IDeBugService);
		const viewsService = accessor.get(IViewsService);
		const viewModel = deBugService.getViewModel();
		const session = viewModel.focusedSession;
		if (!editor.hasModel() || !session) {
			return;
		}

		const text = editor.getModel().getValueInRange(editor.getSelection());
		await session.addReplExpression(viewModel.focusedStackFrame!, text);
		await viewsService.openView(REPL_VIEW_ID, false);
	}
}

class SelectionToWatchExpressionsAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.deBug.action.selectionToWatch',
			laBel: nls.localize('addToWatch', "Add to Watch"),
			alias: 'Add to Watch',
			precondition: ContextKeyExpr.and(EditorContextKeys.hasNonEmptySelection, CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'deBug',
				order: 1
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const deBugService = accessor.get(IDeBugService);
		const viewsService = accessor.get(IViewsService);
		if (!editor.hasModel()) {
			return;
		}

		const text = editor.getModel().getValueInRange(editor.getSelection());
		await viewsService.openView(WATCH_VIEW_ID);
		deBugService.addWatchExpression(text);
	}
}

class ShowDeBugHoverAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.deBug.action.showDeBugHover',
			laBel: nls.localize('showDeBugHover', "DeBug: Show Hover"),
			alias: 'DeBug: Show Hover',
			precondition: CONTEXT_IN_DEBUG_MODE,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_I),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const position = editor.getPosition();
		if (!position || !editor.hasModel()) {
			return;
		}
		const word = editor.getModel().getWordAtPosition(position);
		if (!word) {
			return;
		}

		const range = new Range(position.lineNumBer, position.column, position.lineNumBer, word.endColumn);
		return editor.getContriBution<IDeBugEditorContriBution>(EDITOR_CONTRIBUTION_ID).showHover(range, true);
	}
}

class StepIntoTargetsAction extends EditorAction {

	puBlic static readonly ID = 'editor.deBug.action.stepIntoTargets';
	puBlic static readonly LABEL = nls.localize({ key: 'stepIntoTargets', comment: ['Step Into Targets lets the user step into an exact function he or she is interested in.'] }, "Step Into Targets...");

	constructor() {
		super({
			id: StepIntoTargetsAction.ID,
			laBel: StepIntoTargetsAction.LABEL,
			alias: 'DeBug: Step Into Targets...',
			precondition: ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus),
			contextMenuOpts: {
				group: 'deBug',
				order: 1.5
			}
		});
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const deBugService = accessor.get(IDeBugService);
		const contextMenuService = accessor.get(IContextMenuService);
		const session = deBugService.getViewModel().focusedSession;
		const frame = deBugService.getViewModel().focusedStackFrame;

		if (session && frame && editor.hasModel() && editor.getModel().uri.toString() === frame.source.uri.toString()) {
			const targets = await session.stepInTargets(frame.frameId);
			if (!targets) {
				return;
			}

			editor.revealLineInCenterIfOutsideViewport(frame.range.startLineNumBer);
			const cursorCoords = editor.getScrolledVisiBlePosition({ lineNumBer: frame.range.startLineNumBer, column: frame.range.startColumn });
			const editorCoords = getDomNodePagePosition(editor.getDomNode());
			const x = editorCoords.left + cursorCoords.left;
			const y = editorCoords.top + cursorCoords.top + cursorCoords.height;

			contextMenuService.showContextMenu({
				getAnchor: () => ({ x, y }),
				getActions: () => {
					return targets.map(t => new Action(`stepIntoTarget:${t.id}`, t.laBel, undefined, true, () => session.stepIn(frame.thread.threadId, t.id)));
				}
			});
		}
	}
}

class GoToBreakpointAction extends EditorAction {
	constructor(private isNext: Boolean, opts: IActionOptions) {
		super(opts);
	}

	async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<any> {
		const deBugService = accessor.get(IDeBugService);
		const editorService = accessor.get(IEditorService);
		if (editor.hasModel()) {
			const currentUri = editor.getModel().uri;
			const currentLine = editor.getPosition().lineNumBer;
			//Breakpoints returned from `getBreakpoints` are already sorted.
			const allEnaBledBreakpoints = deBugService.getModel().getBreakpoints({ enaBledOnly: true });

			//Try to find Breakpoint in current file
			let moveBreakpoint =
				this.isNext
					? allEnaBledBreakpoints.filter(Bp => Bp.uri.toString() === currentUri.toString() && Bp.lineNumBer > currentLine).shift()
					: allEnaBledBreakpoints.filter(Bp => Bp.uri.toString() === currentUri.toString() && Bp.lineNumBer < currentLine).pop();

			//Try to find Breakpoints in following files
			if (!moveBreakpoint) {
				moveBreakpoint =
					this.isNext
						? allEnaBledBreakpoints.filter(Bp => Bp.uri.toString() > currentUri.toString()).shift()
						: allEnaBledBreakpoints.filter(Bp => Bp.uri.toString() < currentUri.toString()).pop();
			}

			//Move to first or last possiBle Breakpoint
			if (!moveBreakpoint && allEnaBledBreakpoints.length) {
				moveBreakpoint = this.isNext ? allEnaBledBreakpoints[0] : allEnaBledBreakpoints[allEnaBledBreakpoints.length - 1];
			}

			if (moveBreakpoint) {
				return openBreakpointSource(moveBreakpoint, false, true, deBugService, editorService);
			}
		}
	}
}

class GoToNextBreakpointAction extends GoToBreakpointAction {
	constructor() {
		super(true, {
			id: 'editor.deBug.action.goToNextBreakpoint',
			laBel: nls.localize('goToNextBreakpoint', "DeBug: Go To Next Breakpoint"),
			alias: 'DeBug: Go To Next Breakpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}
}

class GoToPreviousBreakpointAction extends GoToBreakpointAction {
	constructor() {
		super(false, {
			id: 'editor.deBug.action.goToPreviousBreakpoint',
			laBel: nls.localize('goToPreviousBreakpoint', "DeBug: Go To Previous Breakpoint"),
			alias: 'DeBug: Go To Previous Breakpoint',
			precondition: CONTEXT_DEBUGGERS_AVAILABLE
		});
	}
}

export function registerEditorActions(): void {
	registerEditorAction(ToggleBreakpointAction);
	registerEditorAction(ConditionalBreakpointAction);
	registerEditorAction(LogPointAction);
	registerEditorAction(RunToCursorAction);
	registerEditorAction(StepIntoTargetsAction);
	registerEditorAction(SelectionToReplAction);
	registerEditorAction(SelectionToWatchExpressionsAction);
	registerEditorAction(ShowDeBugHoverAction);
	registerEditorAction(GoToNextBreakpointAction);
	registerEditorAction(GoToPreviousBreakpointAction);
}
