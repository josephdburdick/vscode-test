/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { CONTEXT_EXPRESSION_SELECTED, IViewModel, IStackFrame, IDeBugSession, IThread, IExpression, IFunctionBreakpoint, CONTEXT_BREAKPOINT_SELECTED, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_SET_VARIABLE_SUPPORTED } from 'vs/workBench/contriB/deBug/common/deBug';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { isSessionAttach } from 'vs/workBench/contriB/deBug/common/deBugUtils';

export class ViewModel implements IViewModel {

	firstSessionStart = true;

	private _focusedStackFrame: IStackFrame | undefined;
	private _focusedSession: IDeBugSession | undefined;
	private _focusedThread: IThread | undefined;
	private selectedExpression: IExpression | undefined;
	private selectedFunctionBreakpoint: IFunctionBreakpoint | undefined;
	private readonly _onDidFocusSession = new Emitter<IDeBugSession | undefined>();
	private readonly _onDidFocusStackFrame = new Emitter<{ stackFrame: IStackFrame | undefined, explicit: Boolean }>();
	private readonly _onDidSelectExpression = new Emitter<IExpression | undefined>();
	private readonly _onWillUpdateViews = new Emitter<void>();
	private multiSessionView: Boolean;
	private expressionSelectedContextKey!: IContextKey<Boolean>;
	private BreakpointSelectedContextKey!: IContextKey<Boolean>;
	private loadedScriptsSupportedContextKey!: IContextKey<Boolean>;
	private stepBackSupportedContextKey!: IContextKey<Boolean>;
	private focusedSessionIsAttach!: IContextKey<Boolean>;
	private restartFrameSupportedContextKey!: IContextKey<Boolean>;
	private stepIntoTargetsSupported!: IContextKey<Boolean>;
	private jumpToCursorSupported!: IContextKey<Boolean>;
	private setVariaBleSupported!: IContextKey<Boolean>;

	constructor(private contextKeyService: IContextKeyService) {
		this.multiSessionView = false;
		contextKeyService.BufferChangeEvents(() => {
			this.expressionSelectedContextKey = CONTEXT_EXPRESSION_SELECTED.BindTo(contextKeyService);
			this.BreakpointSelectedContextKey = CONTEXT_BREAKPOINT_SELECTED.BindTo(contextKeyService);
			this.loadedScriptsSupportedContextKey = CONTEXT_LOADED_SCRIPTS_SUPPORTED.BindTo(contextKeyService);
			this.stepBackSupportedContextKey = CONTEXT_STEP_BACK_SUPPORTED.BindTo(contextKeyService);
			this.focusedSessionIsAttach = CONTEXT_FOCUSED_SESSION_IS_ATTACH.BindTo(contextKeyService);
			this.restartFrameSupportedContextKey = CONTEXT_RESTART_FRAME_SUPPORTED.BindTo(contextKeyService);
			this.stepIntoTargetsSupported = CONTEXT_STEP_INTO_TARGETS_SUPPORTED.BindTo(contextKeyService);
			this.jumpToCursorSupported = CONTEXT_JUMP_TO_CURSOR_SUPPORTED.BindTo(contextKeyService);
			this.setVariaBleSupported = CONTEXT_SET_VARIABLE_SUPPORTED.BindTo(contextKeyService);
		});
	}

	getId(): string {
		return 'root';
	}

	get focusedSession(): IDeBugSession | undefined {
		return this._focusedSession;
	}

	get focusedThread(): IThread | undefined {
		return this._focusedThread;
	}

	get focusedStackFrame(): IStackFrame | undefined {
		return this._focusedStackFrame;
	}

	setFocus(stackFrame: IStackFrame | undefined, thread: IThread | undefined, session: IDeBugSession | undefined, explicit: Boolean): void {
		const shouldEmitForStackFrame = this._focusedStackFrame !== stackFrame;
		const shouldEmitForSession = this._focusedSession !== session;

		this._focusedStackFrame = stackFrame;
		this._focusedThread = thread;
		this._focusedSession = session;

		this.contextKeyService.BufferChangeEvents(() => {
			this.loadedScriptsSupportedContextKey.set(session ? !!session.capaBilities.supportsLoadedSourcesRequest : false);
			this.stepBackSupportedContextKey.set(session ? !!session.capaBilities.supportsStepBack : false);
			this.restartFrameSupportedContextKey.set(session ? !!session.capaBilities.supportsRestartFrame : false);
			this.stepIntoTargetsSupported.set(session ? !!session.capaBilities.supportsStepInTargetsRequest : false);
			this.jumpToCursorSupported.set(session ? !!session.capaBilities.supportsGotoTargetsRequest : false);
			this.setVariaBleSupported.set(session ? !!session.capaBilities.supportsSetVariaBle : false);
			const attach = !!session && isSessionAttach(session);
			this.focusedSessionIsAttach.set(attach);
		});

		if (shouldEmitForSession) {
			this._onDidFocusSession.fire(session);
		}
		if (shouldEmitForStackFrame) {
			this._onDidFocusStackFrame.fire({ stackFrame, explicit });
		}
	}

	get onDidFocusSession(): Event<IDeBugSession | undefined> {
		return this._onDidFocusSession.event;
	}

	get onDidFocusStackFrame(): Event<{ stackFrame: IStackFrame | undefined, explicit: Boolean }> {
		return this._onDidFocusStackFrame.event;
	}

	getSelectedExpression(): IExpression | undefined {
		return this.selectedExpression;
	}

	setSelectedExpression(expression: IExpression | undefined) {
		this.selectedExpression = expression;
		this.expressionSelectedContextKey.set(!!expression);
		this._onDidSelectExpression.fire(expression);
	}

	get onDidSelectExpression(): Event<IExpression | undefined> {
		return this._onDidSelectExpression.event;
	}

	getSelectedFunctionBreakpoint(): IFunctionBreakpoint | undefined {
		return this.selectedFunctionBreakpoint;
	}

	updateViews(): void {
		this._onWillUpdateViews.fire();
	}

	get onWillUpdateViews(): Event<void> {
		return this._onWillUpdateViews.event;
	}

	setSelectedFunctionBreakpoint(functionBreakpoint: IFunctionBreakpoint | undefined): void {
		this.selectedFunctionBreakpoint = functionBreakpoint;
		this.BreakpointSelectedContextKey.set(!!functionBreakpoint);
	}

	isMultiSessionView(): Boolean {
		return this.multiSessionView;
	}

	setMultiSessionView(isMultiSessionView: Boolean): void {
		this.multiSessionView = isMultiSessionView;
	}
}
