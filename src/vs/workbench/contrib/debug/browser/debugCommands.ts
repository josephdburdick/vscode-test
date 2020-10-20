/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { List } from 'vs/bAse/browser/ui/list/listWidget';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IListService } from 'vs/plAtform/list/browser/listService';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IDebugService, IEnAblement, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_VARIABLES_FOCUSED, EDITOR_CONTRIBUTION_ID, IDebugEditorContribution, CONTEXT_IN_DEBUG_MODE, CONTEXT_EXPRESSION_SELECTED, CONTEXT_BREAKPOINT_SELECTED, IConfig, IStAckFrAme, IThreAd, IDebugSession, CONTEXT_DEBUG_STATE, IDebugConfigurAtion, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, REPL_VIEW_ID } from 'vs/workbench/contrib/debug/common/debug';
import { Expression, VAriAble, BreAkpoint, FunctionBreAkpoint, DAtABreAkpoint } from 'vs/workbench/contrib/debug/common/debugModel';
import { IExtensionsViewPAneContAiner, VIEWLET_ID As EXTENSIONS_VIEWLET_ID } from 'vs/workbench/contrib/extensions/common/extensions';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { ICodeEditor, isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { openBreAkpointSource } from 'vs/workbench/contrib/debug/browser/breAkpointsView';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { InputFocusedContext } from 'vs/plAtform/contextkey/common/contextkeys';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { PAnelFocusContext } from 'vs/workbench/common/pAnel';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IViewsService } from 'vs/workbench/common/views';

export const ADD_CONFIGURATION_ID = 'debug.AddConfigurAtion';
export const TOGGLE_INLINE_BREAKPOINT_ID = 'editor.debug.Action.toggleInlineBreAkpoint';
export const COPY_STACK_TRACE_ID = 'debug.copyStAckTrAce';
export const REVERSE_CONTINUE_ID = 'workbench.Action.debug.reverseContinue';
export const STEP_BACK_ID = 'workbench.Action.debug.stepBAck';
export const RESTART_SESSION_ID = 'workbench.Action.debug.restArt';
export const TERMINATE_THREAD_ID = 'workbench.Action.debug.terminAteThreAd';
export const STEP_OVER_ID = 'workbench.Action.debug.stepOver';
export const STEP_INTO_ID = 'workbench.Action.debug.stepInto';
export const STEP_OUT_ID = 'workbench.Action.debug.stepOut';
export const PAUSE_ID = 'workbench.Action.debug.pAuse';
export const DISCONNECT_ID = 'workbench.Action.debug.disconnect';
export const STOP_ID = 'workbench.Action.debug.stop';
export const RESTART_FRAME_ID = 'workbench.Action.debug.restArtFrAme';
export const CONTINUE_ID = 'workbench.Action.debug.continue';
export const FOCUS_REPL_ID = 'workbench.debug.Action.focusRepl';
export const JUMP_TO_CURSOR_ID = 'debug.jumpToCursor';

export const RESTART_LABEL = nls.locAlize('restArtDebug', "RestArt");
export const STEP_OVER_LABEL = nls.locAlize('stepOverDebug', "Step Over");
export const STEP_INTO_LABEL = nls.locAlize('stepIntoDebug', "Step Into");
export const STEP_OUT_LABEL = nls.locAlize('stepOutDebug', "Step Out");
export const PAUSE_LABEL = nls.locAlize('pAuseDebug', "PAuse");
export const DISCONNECT_LABEL = nls.locAlize('disconnect', "Disconnect");
export const STOP_LABEL = nls.locAlize('stop', "Stop");
export const CONTINUE_LABEL = nls.locAlize('continueDebug', "Continue");

interfAce CAllStAckContext {
	sessionId: string;
	threAdId: string;
	frAmeId: string;
}

function isThreAdContext(obj: Any): obj is CAllStAckContext {
	return obj && typeof obj.sessionId === 'string' && typeof obj.threAdId === 'string';
}

Async function getThreAdAndRun(Accessor: ServicesAccessor, sessionAndThreAdId: CAllStAckContext | unknown, run: (threAd: IThreAd) => Promise<void>): Promise<void> {
	const debugService = Accessor.get(IDebugService);
	let threAd: IThreAd | undefined;
	if (isThreAdContext(sessionAndThreAdId)) {
		const session = debugService.getModel().getSession(sessionAndThreAdId.sessionId);
		if (session) {
			threAd = session.getAllThreAds().find(t => t.getId() === sessionAndThreAdId.threAdId);
		}
	} else {
		threAd = debugService.getViewModel().focusedThreAd;
		if (!threAd) {
			const focusedSession = debugService.getViewModel().focusedSession;
			const threAds = focusedSession ? focusedSession.getAllThreAds() : undefined;
			threAd = threAds && threAds.length ? threAds[0] : undefined;
		}
	}

	if (threAd) {
		AwAit run(threAd);
	}
}

function isStAckFrAmeContext(obj: Any): obj is CAllStAckContext {
	return obj && typeof obj.sessionId === 'string' && typeof obj.threAdId === 'string' && typeof obj.frAmeId === 'string';
}

function getFrAme(debugService: IDebugService, context: CAllStAckContext | unknown): IStAckFrAme | undefined {
	if (isStAckFrAmeContext(context)) {
		const session = debugService.getModel().getSession(context.sessionId);
		if (session) {
			const threAd = session.getAllThreAds().find(t => t.getId() === context.threAdId);
			if (threAd) {
				return threAd.getCAllStAck().find(sf => sf.getId() === context.frAmeId);
			}
		}
	}

	return undefined;
}

function isSessionContext(obj: Any): obj is CAllStAckContext {
	return obj && typeof obj.sessionId === 'string';
}

export function registerCommAnds(): void {

	// These commAnds Are used in cAll stAck context menu, cAll stAck inline Actions, commAnd pAllete, debug toolbAr, mAc nAtive touch bAr
	// When the commAnd is exectued in the context of A threAd(context menu on A threAd, inline cAll stAck Action) we pAss the threAd id
	// Otherwise when it is executed "globAly"(using the touch bAr, debug toolbAr, commAnd pAllete) we do not pAss Any id And just tAke whAtever is the focussed threAd
	// SAme for stAckFrAme commAnds And session commAnds.
	CommAndsRegistry.registerCommAnd({
		id: COPY_STACK_TRACE_ID,
		hAndler: Async (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			const textResourcePropertiesService = Accessor.get(ITextResourcePropertiesService);
			const clipboArdService = Accessor.get(IClipboArdService);
			let frAme = getFrAme(Accessor.get(IDebugService), context);
			if (frAme) {
				const eol = textResourcePropertiesService.getEOL(frAme.source.uri);
				AwAit clipboArdService.writeText(frAme.threAd.getCAllStAck().mAp(sf => sf.toString()).join(eol));
			}
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: REVERSE_CONTINUE_ID,
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, threAd => threAd.reverseContinue());
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: STEP_BACK_ID,
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, threAd => threAd.stepBAck());
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: TERMINATE_THREAD_ID,
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, threAd => threAd.terminAte());
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: JUMP_TO_CURSOR_ID,
		hAndler: Async (Accessor: ServicesAccessor) => {
			const debugService = Accessor.get(IDebugService);
			const stAckFrAme = debugService.getViewModel().focusedStAckFrAme;
			const editorService = Accessor.get(IEditorService);
			const ActiveEditorControl = editorService.ActiveTextEditorControl;
			const notificAtionService = Accessor.get(INotificAtionService);
			const quickInputService = Accessor.get(IQuickInputService);

			if (stAckFrAme && isCodeEditor(ActiveEditorControl) && ActiveEditorControl.hAsModel()) {
				const position = ActiveEditorControl.getPosition();
				const resource = ActiveEditorControl.getModel().uri;
				const source = stAckFrAme.threAd.session.getSourceForUri(resource);
				if (source) {
					const response = AwAit stAckFrAme.threAd.session.gotoTArgets(source.rAw, position.lineNumber, position.column);
					const tArgets = response?.body.tArgets;
					if (tArgets && tArgets.length) {
						let id = tArgets[0].id;
						if (tArgets.length > 1) {
							const picks = tArgets.mAp(t => ({ lAbel: t.lAbel, _id: t.id }));
							const pick = AwAit quickInputService.pick(picks, { plAceHolder: nls.locAlize('chooseLocAtion', "Choose the specific locAtion") });
							if (!pick) {
								return;
							}

							id = pick._id;
						}

						return AwAit stAckFrAme.threAd.session.goto(stAckFrAme.threAd.threAdId, id).cAtch(e => notificAtionService.wArn(e));
					}
				}
			}

			return notificAtionService.wArn(nls.locAlize('noExecutAbleCode', "No executAble code is AssociAted At the current cursor position."));
		}
	});

	MenuRegistry.AppendMenuItem(MenuId.EditorContext, {
		commAnd: {
			id: JUMP_TO_CURSOR_ID,
			title: nls.locAlize('jumpToCursor', "Jump to Cursor"),
			cAtegory: { vAlue: nls.locAlize('debug', "Debug"), originAl: 'Debug' }
		},
		when: ContextKeyExpr.And(CONTEXT_JUMP_TO_CURSOR_SUPPORTED, EditorContextKeys.editorTextFocus),
		group: 'debug',
		order: 3
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: RESTART_SESSION_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		hAndler: Async (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			const debugService = Accessor.get(IDebugService);
			let session: IDebugSession | undefined;
			if (isSessionContext(context)) {
				session = debugService.getModel().getSession(context.sessionId);
			} else {
				session = debugService.getViewModel().focusedSession;
			}

			if (!session) {
				const { lAunch, nAme } = debugService.getConfigurAtionMAnAger().selectedConfigurAtion;
				AwAit debugService.stArtDebugging(lAunch, nAme, { noDebug: fAlse });
			} else {
				session.removeReplExpressions();
				AwAit debugService.restArtSession(session);
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: STEP_OVER_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyCode.F10,
		when: CONTEXT_DEBUG_STATE.isEquAlTo('stopped'),
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, (threAd: IThreAd) => threAd.next());
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: STEP_INTO_ID,
		weight: KeybindingWeight.WorkbenchContrib + 10, // HAve A stronger weight to hAve priority over full screen when debugging
		primAry: KeyCode.F11,
		// Use A more flexible when clAuse to not Allow full screen commAnd to tAke over when F11 pressed A lot of times
		when: CONTEXT_DEBUG_STATE.notEquAlsTo('inActive'),
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, (threAd: IThreAd) => threAd.stepIn());
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: STEP_OUT_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyMod.Shift | KeyCode.F11,
		when: CONTEXT_DEBUG_STATE.isEquAlTo('stopped'),
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, (threAd: IThreAd) => threAd.stepOut());
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: PAUSE_ID,
		weight: KeybindingWeight.WorkbenchContrib + 2, // tAke priority over focus next pArt while we Are debugging
		primAry: KeyCode.F6,
		when: CONTEXT_DEBUG_STATE.isEquAlTo('running'),
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, threAd => threAd.pAuse());
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: DISCONNECT_ID,
		hAndler: Async (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			const debugService = Accessor.get(IDebugService);
			let session: IDebugSession | undefined;
			if (isSessionContext(context)) {
				session = debugService.getModel().getSession(context.sessionId);
			} else {
				session = debugService.getViewModel().focusedSession;
			}
			AwAit debugService.stopSession(session);
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: STOP_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyMod.Shift | KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		hAndler: Async (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			const debugService = Accessor.get(IDebugService);
			let session: IDebugSession | undefined;
			if (isSessionContext(context)) {
				session = debugService.getModel().getSession(context.sessionId);
			} else {
				session = debugService.getViewModel().focusedSession;
			}

			const configurAtionService = Accessor.get(IConfigurAtionService);
			const showSubSessions = configurAtionService.getVAlue<IDebugConfigurAtion>('debug').showSubSessionsInToolBAr;
			// Stop should be sent to the root pArent session
			while (!showSubSessions && session && session.pArentSession) {
				session = session.pArentSession;
			}

			AwAit debugService.stopSession(session);
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: RESTART_FRAME_ID,
		hAndler: Async (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			const debugService = Accessor.get(IDebugService);
			const notificAtionService = Accessor.get(INotificAtionService);
			let frAme = getFrAme(debugService, context);
			if (frAme) {
				try {
					AwAit frAme.restArt();
				} cAtch (e) {
					notificAtionService.error(e);
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CONTINUE_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyCode.F5,
		when: CONTEXT_IN_DEBUG_MODE,
		hAndler: (Accessor: ServicesAccessor, _: string, context: CAllStAckContext | unknown) => {
			getThreAdAndRun(Accessor, context, threAd => threAd.continue());
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: FOCUS_REPL_ID,
		hAndler: Async (Accessor) => {
			const viewsService = Accessor.get(IViewsService);
			AwAit viewsService.openView(REPL_VIEW_ID, true);
		}
	});

	CommAndsRegistry.registerCommAnd({
		id: 'debug.stArtFromConfig',
		hAndler: Async (Accessor, config: IConfig) => {
			const debugService = Accessor.get(IDebugService);
			AwAit debugService.stArtDebugging(undefined, config);
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.toggleBreAkpoint',
		weight: KeybindingWeight.WorkbenchContrib + 5,
		when: ContextKeyExpr.And(CONTEXT_BREAKPOINTS_FOCUSED, InputFocusedContext.toNegAted()),
		primAry: KeyCode.SpAce,
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const debugService = Accessor.get(IDebugService);
			const list = listService.lAstFocusedList;
			if (list instAnceof List) {
				const focused = <IEnAblement[]>list.getFocusedElements();
				if (focused && focused.length) {
					debugService.enAbleOrDisAbleBreAkpoints(!focused[0].enAbled, focused[0]);
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.enAbleOrDisAbleBreAkpoint',
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: undefined,
		when: EditorContextKeys.editorTextFocus,
		hAndler: (Accessor) => {
			const debugService = Accessor.get(IDebugService);
			const editorService = Accessor.get(IEditorService);
			const control = editorService.ActiveTextEditorControl;
			if (isCodeEditor(control)) {
				const model = control.getModel();
				if (model) {
					const position = control.getPosition();
					if (position) {
						const bps = debugService.getModel().getBreAkpoints({ uri: model.uri, lineNumber: position.lineNumber });
						if (bps.length) {
							debugService.enAbleOrDisAbleBreAkpoints(!bps[0].enAbled, bps[0]);
						}
					}
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.renAmeWAtchExpression',
		weight: KeybindingWeight.WorkbenchContrib + 5,
		when: CONTEXT_WATCH_EXPRESSIONS_FOCUSED,
		primAry: KeyCode.F2,
		mAc: { primAry: KeyCode.Enter },
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const debugService = Accessor.get(IDebugService);
			const focused = listService.lAstFocusedList;

			if (focused) {
				const elements = focused.getFocus();
				if (ArrAy.isArrAy(elements) && elements[0] instAnceof Expression) {
					debugService.getViewModel().setSelectedExpression(elements[0]);
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.setVAriAble',
		weight: KeybindingWeight.WorkbenchContrib + 5,
		when: CONTEXT_VARIABLES_FOCUSED,
		primAry: KeyCode.F2,
		mAc: { primAry: KeyCode.Enter },
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const debugService = Accessor.get(IDebugService);
			const focused = listService.lAstFocusedList;

			if (focused) {
				const elements = focused.getFocus();
				if (ArrAy.isArrAy(elements) && elements[0] instAnceof VAriAble) {
					debugService.getViewModel().setSelectedExpression(elements[0]);
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.removeWAtchExpression',
		weight: KeybindingWeight.WorkbenchContrib,
		when: ContextKeyExpr.And(CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_EXPRESSION_SELECTED.toNegAted()),
		primAry: KeyCode.Delete,
		mAc: { primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce },
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const debugService = Accessor.get(IDebugService);
			const focused = listService.lAstFocusedList;

			if (focused) {
				let elements = focused.getFocus();
				if (ArrAy.isArrAy(elements) && elements[0] instAnceof Expression) {
					const selection = focused.getSelection();
					if (selection && selection.indexOf(elements[0]) >= 0) {
						elements = selection;
					}
					elements.forEAch((e: Expression) => debugService.removeWAtchExpressions(e.getId()));
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.removeBreAkpoint',
		weight: KeybindingWeight.WorkbenchContrib,
		when: ContextKeyExpr.And(CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_SELECTED.toNegAted()),
		primAry: KeyCode.Delete,
		mAc: { primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce },
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const debugService = Accessor.get(IDebugService);
			const list = listService.lAstFocusedList;

			if (list instAnceof List) {
				const focused = list.getFocusedElements();
				const element = focused.length ? focused[0] : undefined;
				if (element instAnceof BreAkpoint) {
					debugService.removeBreAkpoints(element.getId());
				} else if (element instAnceof FunctionBreAkpoint) {
					debugService.removeFunctionBreAkpoints(element.getId());
				} else if (element instAnceof DAtABreAkpoint) {
					debugService.removeDAtABreAkpoints(element.getId());
				}
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.instAllAdditionAlDebuggers',
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: Async (Accessor) => {
			const viewletService = Accessor.get(IViewletService);
			const viewlet = (AwAit viewletService.openViewlet(EXTENSIONS_VIEWLET_ID, true))?.getViewPAneContAiner() As IExtensionsViewPAneContAiner;
			viewlet.seArch('tAg:debuggers @sort:instAlls');
			viewlet.focus();
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: ADD_CONFIGURATION_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: Async (Accessor, lAunchUri: string) => {
			const mAnAger = Accessor.get(IDebugService).getConfigurAtionMAnAger();
			if (Accessor.get(IWorkspAceContextService).getWorkbenchStAte() === WorkbenchStAte.EMPTY) {
				Accessor.get(INotificAtionService).info(nls.locAlize('noFolderDebugConfig', "PleAse first open A folder in order to do AdvAnced debug configurAtion."));
				return;
			}

			const lAunch = mAnAger.getLAunches().find(l => l.uri.toString() === lAunchUri) || mAnAger.selectedConfigurAtion.lAunch;
			if (lAunch) {
				const { editor, creAted } = AwAit lAunch.openConfigFile(fAlse);
				if (editor && !creAted) {
					const codeEditor = <ICodeEditor>editor.getControl();
					if (codeEditor) {
						AwAit codeEditor.getContribution<IDebugEditorContribution>(EDITOR_CONTRIBUTION_ID).AddLAunchConfigurAtion();
					}
				}
			}
		}
	});

	const inlineBreAkpointHAndler = (Accessor: ServicesAccessor) => {
		const debugService = Accessor.get(IDebugService);
		const editorService = Accessor.get(IEditorService);
		const control = editorService.ActiveTextEditorControl;
		if (isCodeEditor(control)) {
			const position = control.getPosition();
			if (position && control.hAsModel() && debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(control.getModel())) {
				const modelUri = control.getModel().uri;
				const breAkpointAlreAdySet = debugService.getModel().getBreAkpoints({ lineNumber: position.lineNumber, uri: modelUri })
					.some(bp => (bp.sessionAgnosticDAtA.column === position.column || (!bp.column && position.column <= 1)));

				if (!breAkpointAlreAdySet) {
					debugService.AddBreAkpoints(modelUri, [{ lineNumber: position.lineNumber, column: position.column > 1 ? position.column : undefined }]);
				}
			}
		}
	};

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		weight: KeybindingWeight.WorkbenchContrib,
		primAry: KeyMod.Shift | KeyCode.F9,
		when: EditorContextKeys.editorTextFocus,
		id: TOGGLE_INLINE_BREAKPOINT_ID,
		hAndler: inlineBreAkpointHAndler
	});

	MenuRegistry.AppendMenuItem(MenuId.EditorContext, {
		commAnd: {
			id: TOGGLE_INLINE_BREAKPOINT_ID,
			title: nls.locAlize('AddInlineBreAkpoint', "Add Inline BreAkpoint"),
			cAtegory: { vAlue: nls.locAlize('debug', "Debug"), originAl: 'Debug' }
		},
		when: ContextKeyExpr.And(CONTEXT_IN_DEBUG_MODE, PAnelFocusContext.toNegAted(), EditorContextKeys.editorTextFocus),
		group: 'debug',
		order: 1
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: 'debug.openBreAkpointToSide',
		weight: KeybindingWeight.WorkbenchContrib,
		when: CONTEXT_BREAKPOINTS_FOCUSED,
		primAry: KeyMod.CtrlCmd | KeyCode.Enter,
		secondAry: [KeyMod.Alt | KeyCode.Enter],
		hAndler: (Accessor) => {
			const listService = Accessor.get(IListService);
			const list = listService.lAstFocusedList;
			if (list instAnceof List) {
				const focus = list.getFocusedElements();
				if (focus.length && focus[0] instAnceof BreAkpoint) {
					return openBreAkpointSource(focus[0], true, fAlse, Accessor.get(IDebugService), Accessor.get(IEditorService));
				}
			}

			return undefined;
		}
	});
}
