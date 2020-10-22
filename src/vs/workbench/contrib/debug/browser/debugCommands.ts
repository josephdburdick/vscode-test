/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IListService } from 'vs/platform/list/Browser/listService';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IDeBugService, IEnaBlement, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_VARIABLES_FOCUSED, EDITOR_CONTRIBUTION_ID, IDeBugEditorContriBution, CONTEXT_IN_DEBUG_MODE, CONTEXT_EXPRESSION_SELECTED, CONTEXT_BREAKPOINT_SELECTED, IConfig, IStackFrame, IThread, IDeBugSession, CONTEXT_DEBUG_STATE, IDeBugConfiguration, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, REPL_VIEW_ID } from 'vs/workBench/contriB/deBug/common/deBug';
import { Expression, VariaBle, Breakpoint, FunctionBreakpoint, DataBreakpoint } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IExtensionsViewPaneContainer, VIEWLET_ID as EXTENSIONS_VIEWLET_ID } from 'vs/workBench/contriB/extensions/common/extensions';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ICodeEditor, isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { openBreakpointSource } from 'vs/workBench/contriB/deBug/Browser/BreakpointsView';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { InputFocusedContext } from 'vs/platform/contextkey/common/contextkeys';
import { ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { PanelFocusContext } from 'vs/workBench/common/panel';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IViewsService } from 'vs/workBench/common/views';

export const ADD_CONFIGURATION_ID = 'deBug.addConfiguration';
export const TOGGLE_INLINE_BREAKPOINT_ID = 'editor.deBug.action.toggleInlineBreakpoint';
export const COPY_STACK_TRACE_ID = 'deBug.copyStackTrace';
export const REVERSE_CONTINUE_ID = 'workBench.action.deBug.reverseContinue';
export const STEP_BACK_ID = 'workBench.action.deBug.stepBack';
export const RESTART_SESSION_ID = 'workBench.action.deBug.restart';
export const TERMINATE_THREAD_ID = 'workBench.action.deBug.terminateThread';
export const STEP_OVER_ID = 'workBench.action.deBug.stepOver';
export const STEP_INTO_ID = 'workBench.action.deBug.stepInto';
export const STEP_OUT_ID = 'workBench.action.deBug.stepOut';
export const PAUSE_ID = 'workBench.action.deBug.pause';
export const DISCONNECT_ID = 'workBench.action.deBug.disconnect';
export const STOP_ID = 'workBench.action.deBug.stop';
export const RESTART_FRAME_ID = 'workBench.action.deBug.restartFrame';
export const CONTINUE_ID = 'workBench.action.deBug.continue';
export const FOCUS_REPL_ID = 'workBench.deBug.action.focusRepl';
export const JUMP_TO_CURSOR_ID = 'deBug.jumpToCursor';

export const RESTART_LABEL = nls.localize('restartDeBug', "Restart");
export const STEP_OVER_LABEL = nls.localize('stepOverDeBug', "Step Over");
export const STEP_INTO_LABEL = nls.localize('stepIntoDeBug', "Step Into");
export const STEP_OUT_LABEL = nls.localize('stepOutDeBug', "Step Out");
export const PAUSE_LABEL = nls.localize('pauseDeBug', "Pause");
export const DISCONNECT_LABEL = nls.localize('disconnect', "Disconnect");
export const STOP_LABEL = nls.localize('stop', "Stop");
export const CONTINUE_LABEL = nls.localize('continueDeBug', "Continue");

interface CallStackContext {
	sessionId: string;
	threadId: string;
	frameId: string;
}

function isThreadContext(oBj: any): oBj is CallStackContext {
	return oBj && typeof oBj.sessionId === 'string' && typeof oBj.threadId === 'string';
}

async function getThreadAndRun(accessor: ServicesAccessor, sessionAndThreadId: CallStackContext | unknown, run: (thread: IThread) => Promise<void>): Promise<void> {
	const deBugService = accessor.get(IDeBugService);
	let thread: IThread | undefined;
	if (isThreadContext(sessionAndThreadId)) {
		const session = deBugService.getModel().getSession(sessionAndThreadId.sessionId);
		if (session) {
			thread = session.getAllThreads().find(t => t.getId() === sessionAndThreadId.threadId);
		}
	} else {
		thread = deBugService.getViewModel().focusedThread;
		if (!thread) {
			const focusedSession = deBugService.getViewModel().focusedSession;
			const threads = focusedSession ? focusedSession.getAllThreads() : undefined;
			thread = threads && threads.length ? threads[0] : undefined;
		}
	}

	if (thread) {
		await run(thread);
	}
}

function isStackFrameContext(oBj: any): oBj is CallStackContext {
	return oBj && typeof oBj.sessionId === 'string' && typeof oBj.threadId === 'string' && typeof oBj.frameId === 'string';
}

function getFrame(deBugService: IDeBugService, context: CallStackContext | unknown): IStackFrame | undefined {
	if (isStackFrameContext(context)) {
		const session = deBugService.getModel().getSession(context.sessionId);
		if (session) {
			const thread = session.getAllThreads().find(t => t.getId() === context.threadId);
			if (thread) {
				return thread.getCallStack().find(sf => sf.getId() === context.frameId);
			}
		}
	}

	return undefined;
}

function isSessionContext(oBj: any): oBj is CallStackContext {
	return oBj && typeof oBj.sessionId === 'string';
}

export function registerCommands(): void {

	// These commands are used in call stack context menu, call stack inline actions, command pallete, deBug toolBar, mac native touch Bar
	// When the command is exectued in the context of a thread(context menu on a thread, inline call stack action) we pass the thread id
	// Otherwise when it is executed "gloBaly"(using the touch Bar, deBug toolBar, command pallete) we do not pass any id and just take whatever is the focussed thread
	// Same for stackFrame commands and session commands.
	CommandsRegistry.registerCommand({
		id: COPY_STACK_TRACE_ID,
		handler: async (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			const textResourcePropertiesService = accessor.get(ITextResourcePropertiesService);
			const clipBoardService = accessor.get(IClipBoardService);
			let frame = getFrame(accessor.get(IDeBugService), context);
			if (frame) {
				const eol = textResourcePropertiesService.getEOL(frame.source.uri);
				await clipBoardService.writeText(frame.thread.getCallStack().map(sf => sf.toString()).join(eol));
			}
		}
	});

	CommandsRegistry.registerCommand({
		id: REVERSE_CONTINUE_ID,
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, thread => thread.reverseContinue());
		}
	});

	CommandsRegistry.registerCommand({
		id: STEP_BACK_ID,
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, thread => thread.stepBack());
		}
	});

	CommandsRegistry.registerCommand({
		id: TERMINATE_THREAD_ID,
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, thread => thread.terminate());
		}
	});

	CommandsRegistry.registerCommand({
		id: JUMP_TO_CURSOR_ID,
		handler: async (accessor: ServicesAccessor) => {
			const deBugService = accessor.get(IDeBugService);
			const stackFrame = deBugService.getViewModel().focusedStackFrame;
			const editorService = accessor.get(IEditorService);
			const activeEditorControl = editorService.activeTextEditorControl;
			const notificationService = accessor.get(INotificationService);
			const quickInputService = accessor.get(IQuickInputService);

			if (stackFrame && isCodeEditor(activeEditorControl) && activeEditorControl.hasModel()) {
				const position = activeEditorControl.getPosition();
				const resource = activeEditorControl.getModel().uri;
				const source = stackFrame.thread.session.getSourceForUri(resource);
				if (source) {
					const response = await stackFrame.thread.session.gotoTargets(source.raw, position.lineNumBer, position.column);
					const targets = response?.Body.targets;
					if (targets && targets.length) {
						let id = targets[0].id;
						if (targets.length > 1) {
							const picks = targets.map(t => ({ laBel: t.laBel, _id: t.id }));
							const pick = await quickInputService.pick(picks, { placeHolder: nls.localize('chooseLocation', "Choose the specific location") });
							if (!pick) {
								return;
							}

							id = pick._id;
						}

						return await stackFrame.thread.session.goto(stackFrame.thread.threadId, id).catch(e => notificationService.warn(e));
					}
				}
			}

			return notificationService.warn(nls.localize('noExecutaBleCode', "No executaBle code is associated at the current cursor position."));
		}
	});

	MenuRegistry.appendMenuItem(MenuId.EditorContext, {
		command: {
			id: JUMP_TO_CURSOR_ID,
			title: nls.localize('jumpToCursor', "Jump to Cursor"),
			category: { value: nls.localize('deBug', "DeBug"), original: 'DeBug' }
		},
		when: ContextKeyExpr.and(CONTEXT_JUMP_TO_CURSOR_SUPPORTED, EditorContextKeys.editorTextFocus),
		group: 'deBug',
		order: 3
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: RESTART_SESSION_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		handler: async (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			const deBugService = accessor.get(IDeBugService);
			let session: IDeBugSession | undefined;
			if (isSessionContext(context)) {
				session = deBugService.getModel().getSession(context.sessionId);
			} else {
				session = deBugService.getViewModel().focusedSession;
			}

			if (!session) {
				const { launch, name } = deBugService.getConfigurationManager().selectedConfiguration;
				await deBugService.startDeBugging(launch, name, { noDeBug: false });
			} else {
				session.removeReplExpressions();
				await deBugService.restartSession(session);
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: STEP_OVER_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyCode.F10,
		when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, (thread: IThread) => thread.next());
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: STEP_INTO_ID,
		weight: KeyBindingWeight.WorkBenchContriB + 10, // Have a stronger weight to have priority over full screen when deBugging
		primary: KeyCode.F11,
		// Use a more flexiBle when clause to not allow full screen command to take over when F11 pressed a lot of times
		when: CONTEXT_DEBUG_STATE.notEqualsTo('inactive'),
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, (thread: IThread) => thread.stepIn());
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: STEP_OUT_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.Shift | KeyCode.F11,
		when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, (thread: IThread) => thread.stepOut());
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: PAUSE_ID,
		weight: KeyBindingWeight.WorkBenchContriB + 2, // take priority over focus next part while we are deBugging
		primary: KeyCode.F6,
		when: CONTEXT_DEBUG_STATE.isEqualTo('running'),
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, thread => thread.pause());
		}
	});

	CommandsRegistry.registerCommand({
		id: DISCONNECT_ID,
		handler: async (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			const deBugService = accessor.get(IDeBugService);
			let session: IDeBugSession | undefined;
			if (isSessionContext(context)) {
				session = deBugService.getModel().getSession(context.sessionId);
			} else {
				session = deBugService.getViewModel().focusedSession;
			}
			await deBugService.stopSession(session);
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: STOP_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.Shift | KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		handler: async (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			const deBugService = accessor.get(IDeBugService);
			let session: IDeBugSession | undefined;
			if (isSessionContext(context)) {
				session = deBugService.getModel().getSession(context.sessionId);
			} else {
				session = deBugService.getViewModel().focusedSession;
			}

			const configurationService = accessor.get(IConfigurationService);
			const showSuBSessions = configurationService.getValue<IDeBugConfiguration>('deBug').showSuBSessionsInToolBar;
			// Stop should Be sent to the root parent session
			while (!showSuBSessions && session && session.parentSession) {
				session = session.parentSession;
			}

			await deBugService.stopSession(session);
		}
	});

	CommandsRegistry.registerCommand({
		id: RESTART_FRAME_ID,
		handler: async (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			const deBugService = accessor.get(IDeBugService);
			const notificationService = accessor.get(INotificationService);
			let frame = getFrame(deBugService, context);
			if (frame) {
				try {
					await frame.restart();
				} catch (e) {
					notificationService.error(e);
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CONTINUE_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		handler: (accessor: ServicesAccessor, _: string, context: CallStackContext | unknown) => {
			getThreadAndRun(accessor, context, thread => thread.continue());
		}
	});

	CommandsRegistry.registerCommand({
		id: FOCUS_REPL_ID,
		handler: async (accessor) => {
			const viewsService = accessor.get(IViewsService);
			await viewsService.openView(REPL_VIEW_ID, true);
		}
	});

	CommandsRegistry.registerCommand({
		id: 'deBug.startFromConfig',
		handler: async (accessor, config: IConfig) => {
			const deBugService = accessor.get(IDeBugService);
			await deBugService.startDeBugging(undefined, config);
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.toggleBreakpoint',
		weight: KeyBindingWeight.WorkBenchContriB + 5,
		when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, InputFocusedContext.toNegated()),
		primary: KeyCode.Space,
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const deBugService = accessor.get(IDeBugService);
			const list = listService.lastFocusedList;
			if (list instanceof List) {
				const focused = <IEnaBlement[]>list.getFocusedElements();
				if (focused && focused.length) {
					deBugService.enaBleOrDisaBleBreakpoints(!focused[0].enaBled, focused[0]);
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.enaBleOrDisaBleBreakpoint',
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: undefined,
		when: EditorContextKeys.editorTextFocus,
		handler: (accessor) => {
			const deBugService = accessor.get(IDeBugService);
			const editorService = accessor.get(IEditorService);
			const control = editorService.activeTextEditorControl;
			if (isCodeEditor(control)) {
				const model = control.getModel();
				if (model) {
					const position = control.getPosition();
					if (position) {
						const Bps = deBugService.getModel().getBreakpoints({ uri: model.uri, lineNumBer: position.lineNumBer });
						if (Bps.length) {
							deBugService.enaBleOrDisaBleBreakpoints(!Bps[0].enaBled, Bps[0]);
						}
					}
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.renameWatchExpression',
		weight: KeyBindingWeight.WorkBenchContriB + 5,
		when: CONTEXT_WATCH_EXPRESSIONS_FOCUSED,
		primary: KeyCode.F2,
		mac: { primary: KeyCode.Enter },
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const deBugService = accessor.get(IDeBugService);
			const focused = listService.lastFocusedList;

			if (focused) {
				const elements = focused.getFocus();
				if (Array.isArray(elements) && elements[0] instanceof Expression) {
					deBugService.getViewModel().setSelectedExpression(elements[0]);
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.setVariaBle',
		weight: KeyBindingWeight.WorkBenchContriB + 5,
		when: CONTEXT_VARIABLES_FOCUSED,
		primary: KeyCode.F2,
		mac: { primary: KeyCode.Enter },
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const deBugService = accessor.get(IDeBugService);
			const focused = listService.lastFocusedList;

			if (focused) {
				const elements = focused.getFocus();
				if (Array.isArray(elements) && elements[0] instanceof VariaBle) {
					deBugService.getViewModel().setSelectedExpression(elements[0]);
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.removeWatchExpression',
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_EXPRESSION_SELECTED.toNegated()),
		primary: KeyCode.Delete,
		mac: { primary: KeyMod.CtrlCmd | KeyCode.Backspace },
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const deBugService = accessor.get(IDeBugService);
			const focused = listService.lastFocusedList;

			if (focused) {
				let elements = focused.getFocus();
				if (Array.isArray(elements) && elements[0] instanceof Expression) {
					const selection = focused.getSelection();
					if (selection && selection.indexOf(elements[0]) >= 0) {
						elements = selection;
					}
					elements.forEach((e: Expression) => deBugService.removeWatchExpressions(e.getId()));
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.removeBreakpoint',
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_SELECTED.toNegated()),
		primary: KeyCode.Delete,
		mac: { primary: KeyMod.CtrlCmd | KeyCode.Backspace },
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const deBugService = accessor.get(IDeBugService);
			const list = listService.lastFocusedList;

			if (list instanceof List) {
				const focused = list.getFocusedElements();
				const element = focused.length ? focused[0] : undefined;
				if (element instanceof Breakpoint) {
					deBugService.removeBreakpoints(element.getId());
				} else if (element instanceof FunctionBreakpoint) {
					deBugService.removeFunctionBreakpoints(element.getId());
				} else if (element instanceof DataBreakpoint) {
					deBugService.removeDataBreakpoints(element.getId());
				}
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.installAdditionalDeBuggers',
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: async (accessor) => {
			const viewletService = accessor.get(IViewletService);
			const viewlet = (await viewletService.openViewlet(EXTENSIONS_VIEWLET_ID, true))?.getViewPaneContainer() as IExtensionsViewPaneContainer;
			viewlet.search('tag:deBuggers @sort:installs');
			viewlet.focus();
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: ADD_CONFIGURATION_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: async (accessor, launchUri: string) => {
			const manager = accessor.get(IDeBugService).getConfigurationManager();
			if (accessor.get(IWorkspaceContextService).getWorkBenchState() === WorkBenchState.EMPTY) {
				accessor.get(INotificationService).info(nls.localize('noFolderDeBugConfig', "Please first open a folder in order to do advanced deBug configuration."));
				return;
			}

			const launch = manager.getLaunches().find(l => l.uri.toString() === launchUri) || manager.selectedConfiguration.launch;
			if (launch) {
				const { editor, created } = await launch.openConfigFile(false);
				if (editor && !created) {
					const codeEditor = <ICodeEditor>editor.getControl();
					if (codeEditor) {
						await codeEditor.getContriBution<IDeBugEditorContriBution>(EDITOR_CONTRIBUTION_ID).addLaunchConfiguration();
					}
				}
			}
		}
	});

	const inlineBreakpointHandler = (accessor: ServicesAccessor) => {
		const deBugService = accessor.get(IDeBugService);
		const editorService = accessor.get(IEditorService);
		const control = editorService.activeTextEditorControl;
		if (isCodeEditor(control)) {
			const position = control.getPosition();
			if (position && control.hasModel() && deBugService.getConfigurationManager().canSetBreakpointsIn(control.getModel())) {
				const modelUri = control.getModel().uri;
				const BreakpointAlreadySet = deBugService.getModel().getBreakpoints({ lineNumBer: position.lineNumBer, uri: modelUri })
					.some(Bp => (Bp.sessionAgnosticData.column === position.column || (!Bp.column && position.column <= 1)));

				if (!BreakpointAlreadySet) {
					deBugService.addBreakpoints(modelUri, [{ lineNumBer: position.lineNumBer, column: position.column > 1 ? position.column : undefined }]);
				}
			}
		}
	};

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		weight: KeyBindingWeight.WorkBenchContriB,
		primary: KeyMod.Shift | KeyCode.F9,
		when: EditorContextKeys.editorTextFocus,
		id: TOGGLE_INLINE_BREAKPOINT_ID,
		handler: inlineBreakpointHandler
	});

	MenuRegistry.appendMenuItem(MenuId.EditorContext, {
		command: {
			id: TOGGLE_INLINE_BREAKPOINT_ID,
			title: nls.localize('addInlineBreakpoint', "Add Inline Breakpoint"),
			category: { value: nls.localize('deBug', "DeBug"), original: 'DeBug' }
		},
		when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), EditorContextKeys.editorTextFocus),
		group: 'deBug',
		order: 1
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: 'deBug.openBreakpointToSide',
		weight: KeyBindingWeight.WorkBenchContriB,
		when: CONTEXT_BREAKPOINTS_FOCUSED,
		primary: KeyMod.CtrlCmd | KeyCode.Enter,
		secondary: [KeyMod.Alt | KeyCode.Enter],
		handler: (accessor) => {
			const listService = accessor.get(IListService);
			const list = listService.lastFocusedList;
			if (list instanceof List) {
				const focus = list.getFocusedElements();
				if (focus.length && focus[0] instanceof Breakpoint) {
					return openBreakpointSource(focus[0], true, false, accessor.get(IDeBugService), accessor.get(IEditorService));
				}
			}

			return undefined;
		}
	});
}
