/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { CONTEXT_EXPRESSION_SELECTED, IViewModel, IStAckFrAme, IDebugSession, IThreAd, IExpression, IFunctionBreAkpoint, CONTEXT_BREAKPOINT_SELECTED, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_SET_VARIABLE_SUPPORTED } from 'vs/workbench/contrib/debug/common/debug';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { isSessionAttAch } from 'vs/workbench/contrib/debug/common/debugUtils';

export clAss ViewModel implements IViewModel {

	firstSessionStArt = true;

	privAte _focusedStAckFrAme: IStAckFrAme | undefined;
	privAte _focusedSession: IDebugSession | undefined;
	privAte _focusedThreAd: IThreAd | undefined;
	privAte selectedExpression: IExpression | undefined;
	privAte selectedFunctionBreAkpoint: IFunctionBreAkpoint | undefined;
	privAte reAdonly _onDidFocusSession = new Emitter<IDebugSession | undefined>();
	privAte reAdonly _onDidFocusStAckFrAme = new Emitter<{ stAckFrAme: IStAckFrAme | undefined, explicit: booleAn }>();
	privAte reAdonly _onDidSelectExpression = new Emitter<IExpression | undefined>();
	privAte reAdonly _onWillUpdAteViews = new Emitter<void>();
	privAte multiSessionView: booleAn;
	privAte expressionSelectedContextKey!: IContextKey<booleAn>;
	privAte breAkpointSelectedContextKey!: IContextKey<booleAn>;
	privAte loAdedScriptsSupportedContextKey!: IContextKey<booleAn>;
	privAte stepBAckSupportedContextKey!: IContextKey<booleAn>;
	privAte focusedSessionIsAttAch!: IContextKey<booleAn>;
	privAte restArtFrAmeSupportedContextKey!: IContextKey<booleAn>;
	privAte stepIntoTArgetsSupported!: IContextKey<booleAn>;
	privAte jumpToCursorSupported!: IContextKey<booleAn>;
	privAte setVAriAbleSupported!: IContextKey<booleAn>;

	constructor(privAte contextKeyService: IContextKeyService) {
		this.multiSessionView = fAlse;
		contextKeyService.bufferChAngeEvents(() => {
			this.expressionSelectedContextKey = CONTEXT_EXPRESSION_SELECTED.bindTo(contextKeyService);
			this.breAkpointSelectedContextKey = CONTEXT_BREAKPOINT_SELECTED.bindTo(contextKeyService);
			this.loAdedScriptsSupportedContextKey = CONTEXT_LOADED_SCRIPTS_SUPPORTED.bindTo(contextKeyService);
			this.stepBAckSupportedContextKey = CONTEXT_STEP_BACK_SUPPORTED.bindTo(contextKeyService);
			this.focusedSessionIsAttAch = CONTEXT_FOCUSED_SESSION_IS_ATTACH.bindTo(contextKeyService);
			this.restArtFrAmeSupportedContextKey = CONTEXT_RESTART_FRAME_SUPPORTED.bindTo(contextKeyService);
			this.stepIntoTArgetsSupported = CONTEXT_STEP_INTO_TARGETS_SUPPORTED.bindTo(contextKeyService);
			this.jumpToCursorSupported = CONTEXT_JUMP_TO_CURSOR_SUPPORTED.bindTo(contextKeyService);
			this.setVAriAbleSupported = CONTEXT_SET_VARIABLE_SUPPORTED.bindTo(contextKeyService);
		});
	}

	getId(): string {
		return 'root';
	}

	get focusedSession(): IDebugSession | undefined {
		return this._focusedSession;
	}

	get focusedThreAd(): IThreAd | undefined {
		return this._focusedThreAd;
	}

	get focusedStAckFrAme(): IStAckFrAme | undefined {
		return this._focusedStAckFrAme;
	}

	setFocus(stAckFrAme: IStAckFrAme | undefined, threAd: IThreAd | undefined, session: IDebugSession | undefined, explicit: booleAn): void {
		const shouldEmitForStAckFrAme = this._focusedStAckFrAme !== stAckFrAme;
		const shouldEmitForSession = this._focusedSession !== session;

		this._focusedStAckFrAme = stAckFrAme;
		this._focusedThreAd = threAd;
		this._focusedSession = session;

		this.contextKeyService.bufferChAngeEvents(() => {
			this.loAdedScriptsSupportedContextKey.set(session ? !!session.cApAbilities.supportsLoAdedSourcesRequest : fAlse);
			this.stepBAckSupportedContextKey.set(session ? !!session.cApAbilities.supportsStepBAck : fAlse);
			this.restArtFrAmeSupportedContextKey.set(session ? !!session.cApAbilities.supportsRestArtFrAme : fAlse);
			this.stepIntoTArgetsSupported.set(session ? !!session.cApAbilities.supportsStepInTArgetsRequest : fAlse);
			this.jumpToCursorSupported.set(session ? !!session.cApAbilities.supportsGotoTArgetsRequest : fAlse);
			this.setVAriAbleSupported.set(session ? !!session.cApAbilities.supportsSetVAriAble : fAlse);
			const AttAch = !!session && isSessionAttAch(session);
			this.focusedSessionIsAttAch.set(AttAch);
		});

		if (shouldEmitForSession) {
			this._onDidFocusSession.fire(session);
		}
		if (shouldEmitForStAckFrAme) {
			this._onDidFocusStAckFrAme.fire({ stAckFrAme, explicit });
		}
	}

	get onDidFocusSession(): Event<IDebugSession | undefined> {
		return this._onDidFocusSession.event;
	}

	get onDidFocusStAckFrAme(): Event<{ stAckFrAme: IStAckFrAme | undefined, explicit: booleAn }> {
		return this._onDidFocusStAckFrAme.event;
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

	getSelectedFunctionBreAkpoint(): IFunctionBreAkpoint | undefined {
		return this.selectedFunctionBreAkpoint;
	}

	updAteViews(): void {
		this._onWillUpdAteViews.fire();
	}

	get onWillUpdAteViews(): Event<void> {
		return this._onWillUpdAteViews.event;
	}

	setSelectedFunctionBreAkpoint(functionBreAkpoint: IFunctionBreAkpoint | undefined): void {
		this.selectedFunctionBreAkpoint = functionBreAkpoint;
		this.breAkpointSelectedContextKey.set(!!functionBreAkpoint);
	}

	isMultiSessionView(): booleAn {
		return this.multiSessionView;
	}

	setMultiSessionView(isMultiSessionView: booleAn): void {
		this.multiSessionView = isMultiSessionView;
	}
}
