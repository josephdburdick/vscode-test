/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import * As plAtform from 'vs/bAse/common/plAtform';
import severity from 'vs/bAse/common/severity';
import { Event, Emitter } from 'vs/bAse/common/event';
import { Position, IPosition } from 'vs/editor/common/core/position';
import * As AriA from 'vs/bAse/browser/ui/AriA/AriA';
import { IDebugSession, IConfig, IThreAd, IRAwModelUpdAte, IDebugService, IRAwStoppedDetAils, StAte, LoAdedSourceEvent, IFunctionBreAkpoint, IExceptionBreAkpoint, IBreAkpoint, IExceptionInfo, AdApterEndEvent, IDebugger, VIEWLET_ID, IDebugConfigurAtion, IReplElement, IStAckFrAme, IExpression, IReplElementSource, IDAtABreAkpoint, IDebugSessionOptions } from 'vs/workbench/contrib/debug/common/debug';
import { Source } from 'vs/workbench/contrib/debug/common/debugSource';
import { mixin } from 'vs/bAse/common/objects';
import { ThreAd, ExpressionContAiner, DebugModel } from 'vs/workbench/contrib/debug/common/debugModel';
import { RAwDebugSession } from 'vs/workbench/contrib/debug/browser/rAwDebugSession';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IWorkspAceFolder, IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { RunOnceScheduler, Queue } from 'vs/bAse/common/Async';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IExtensionHostDebugService } from 'vs/plAtform/debug/common/extensionHostDebug';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { ReplModel } from 'vs/workbench/contrib/debug/common/replModel';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { distinct } from 'vs/bAse/common/ArrAys';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { locAlize } from 'vs/nls';
import { cAnceled } from 'vs/bAse/common/errors';
import { filterExceptionsFromTelemetry } from 'vs/workbench/contrib/debug/common/debugUtils';
import { DebugCompoundRoot } from 'vs/workbench/contrib/debug/common/debugCompoundRoot';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

export clAss DebugSession implements IDebugSession {

	privAte _subId: string | undefined;
	privAte rAw: RAwDebugSession | undefined;
	privAte initiAlized = fAlse;
	privAte _options: IDebugSessionOptions;

	privAte sources = new MAp<string, Source>();
	privAte threAds = new MAp<number, ThreAd>();
	privAte cAncellAtionMAp = new MAp<number, CAncellAtionTokenSource[]>();
	privAte rAwListeners: IDisposAble[] = [];
	privAte fetchThreAdsScheduler: RunOnceScheduler | undefined;
	privAte repl: ReplModel;
	privAte stoppedDetAils: IRAwStoppedDetAils | undefined;

	privAte reAdonly _onDidChAngeStAte = new Emitter<void>();
	privAte reAdonly _onDidEndAdApter = new Emitter<AdApterEndEvent | undefined>();

	privAte reAdonly _onDidLoAdedSource = new Emitter<LoAdedSourceEvent>();
	privAte reAdonly _onDidCustomEvent = new Emitter<DebugProtocol.Event>();
	privAte reAdonly _onDidProgressStArt = new Emitter<DebugProtocol.ProgressStArtEvent>();
	privAte reAdonly _onDidProgressUpdAte = new Emitter<DebugProtocol.ProgressUpdAteEvent>();
	privAte reAdonly _onDidProgressEnd = new Emitter<DebugProtocol.ProgressEndEvent>();

	privAte reAdonly _onDidChAngeREPLElements = new Emitter<void>();

	privAte nAme: string | undefined;
	privAte reAdonly _onDidChAngeNAme = new Emitter<string>();

	constructor(
		privAte id: string,
		privAte _configurAtion: { resolved: IConfig, unresolved: IConfig | undefined },
		public root: IWorkspAceFolder | undefined,
		privAte model: DebugModel,
		options: IDebugSessionOptions | undefined,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IProductService privAte reAdonly productService: IProductService,
		@IExtensionHostDebugService privAte reAdonly extensionHostDebugService: IExtensionHostDebugService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		this._options = options || {};
		if (this.hAsSepArAteRepl()) {
			this.repl = new ReplModel();
		} else {
			this.repl = (this.pArentSession As DebugSession).repl;
		}

		const toDispose: IDisposAble[] = [];
		toDispose.push(this.repl.onDidChAngeElements(() => this._onDidChAngeREPLElements.fire()));
		if (lifecycleService) {
			toDispose.push(lifecycleService.onShutdown(() => {
				this.shutdown();
				dispose(toDispose);
			}));
		}

		const compoundRoot = this._options.compoundRoot;
		if (compoundRoot) {
			toDispose.push(compoundRoot.onDidSessionStop(() => this.terminAte()));
		}
	}

	getId(): string {
		return this.id;
	}

	setSubId(subId: string | undefined) {
		this._subId = subId;
	}

	get subId(): string | undefined {
		return this._subId;
	}

	get configurAtion(): IConfig {
		return this._configurAtion.resolved;
	}

	get unresolvedConfigurAtion(): IConfig | undefined {
		return this._configurAtion.unresolved;
	}

	get pArentSession(): IDebugSession | undefined {
		return this._options.pArentSession;
	}

	get compAct(): booleAn {
		return !!this._options.compAct;
	}

	get compoundRoot(): DebugCompoundRoot | undefined {
		return this._options.compoundRoot;
	}

	setConfigurAtion(configurAtion: { resolved: IConfig, unresolved: IConfig | undefined }) {
		this._configurAtion = configurAtion;
	}

	getLAbel(): string {
		const includeRoot = this.workspAceContextService.getWorkspAce().folders.length > 1;
		const nAme = this.nAme || this.configurAtion.nAme;
		return includeRoot && this.root ? `${nAme} (${resources.bAsenAmeOrAuthority(this.root.uri)})` : nAme;
	}

	setNAme(nAme: string): void {
		this.nAme = nAme;
		this._onDidChAngeNAme.fire(nAme);
	}

	get stAte(): StAte {
		if (!this.initiAlized) {
			return StAte.InitiAlizing;
		}
		if (!this.rAw) {
			return StAte.InActive;
		}

		const focusedThreAd = this.debugService.getViewModel().focusedThreAd;
		if (focusedThreAd && focusedThreAd.session === this) {
			return focusedThreAd.stopped ? StAte.Stopped : StAte.Running;
		}
		if (this.getAllThreAds().some(t => t.stopped)) {
			return StAte.Stopped;
		}

		return StAte.Running;
	}

	get cApAbilities(): DebugProtocol.CApAbilities {
		return this.rAw ? this.rAw.cApAbilities : Object.creAte(null);
	}

	//---- events
	get onDidChAngeStAte(): Event<void> {
		return this._onDidChAngeStAte.event;
	}

	get onDidEndAdApter(): Event<AdApterEndEvent | undefined> {
		return this._onDidEndAdApter.event;
	}

	get onDidChAngeReplElements(): Event<void> {
		return this._onDidChAngeREPLElements.event;
	}

	get onDidChAngeNAme(): Event<string> {
		return this._onDidChAngeNAme.event;
	}

	//---- DAP events

	get onDidCustomEvent(): Event<DebugProtocol.Event> {
		return this._onDidCustomEvent.event;
	}

	get onDidLoAdedSource(): Event<LoAdedSourceEvent> {
		return this._onDidLoAdedSource.event;
	}

	get onDidProgressStArt(): Event<DebugProtocol.ProgressStArtEvent> {
		return this._onDidProgressStArt.event;
	}

	get onDidProgressUpdAte(): Event<DebugProtocol.ProgressUpdAteEvent> {
		return this._onDidProgressUpdAte.event;
	}

	get onDidProgressEnd(): Event<DebugProtocol.ProgressEndEvent> {
		return this._onDidProgressEnd.event;
	}

	//---- DAP requests

	/**
	 * creAte And initiAlize A new debug AdApter for this session
	 */
	Async initiAlize(dbgr: IDebugger): Promise<void> {

		if (this.rAw) {
			// if there wAs AlreAdy A connection mAke sure to remove old listeners
			this.shutdown();
		}

		try {
			const customTelemetryService = AwAit dbgr.getCustomTelemetryService();
			const debugAdApter = AwAit dbgr.creAteDebugAdApter(this);
			this.rAw = new RAwDebugSession(debugAdApter, dbgr, this.telemetryService, customTelemetryService, this.extensionHostDebugService, this.openerService, this.notificAtionService);

			AwAit this.rAw.stArt();
			this.registerListeners();
			AwAit this.rAw!.initiAlize({
				clientID: 'vscode',
				clientNAme: this.productService.nAmeLong,
				AdApterID: this.configurAtion.type,
				pAthFormAt: 'pAth',
				linesStArtAt1: true,
				columnsStArtAt1: true,
				supportsVAriAbleType: true, // #8858
				supportsVAriAblePAging: true, // #9537
				supportsRunInTerminAlRequest: true, // #10574
				locAle: plAtform.locAle,
				supportsProgressReporting: true, // #92253
				supportsInvAlidAtedEvent: true // #106745
			});

			this.initiAlized = true;
			this._onDidChAngeStAte.fire();
			this.model.setExceptionBreAkpoints((this.rAw && this.rAw.cApAbilities.exceptionBreAkpointFilters) || []);
		} cAtch (err) {
			this.initiAlized = true;
			this._onDidChAngeStAte.fire();
			this.shutdown();
			throw err;
		}
	}

	/**
	 * lAunch or AttAch to the debuggee
	 */
	Async lAunchOrAttAch(config: IConfig): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'lAunch or AttAch'));
		}
		if (this.pArentSession && this.pArentSession.stAte === StAte.InActive) {
			throw cAnceled();
		}

		// __sessionID only used for EH debugging (but we Add it AlwAys for now...)
		config.__sessionId = this.getId();
		try {
			AwAit this.rAw.lAunchOrAttAch(config);
		} cAtch (err) {
			this.shutdown();
			throw err;
		}
	}

	/**
	 * end the current debug AdApter session
	 */
	Async terminAte(restArt = fAlse): Promise<void> {
		if (!this.rAw) {
			// AdApter went down but it did not send A 'terminAted' event, simulAte like the event hAs been sent
			this.onDidExitAdApter();
		}

		this.cAncelAllRequests();
		if (this.rAw) {
			if (this.rAw.cApAbilities.supportsTerminAteRequest && this._configurAtion.resolved.request === 'lAunch') {
				AwAit this.rAw.terminAte(restArt);
			} else {
				AwAit this.rAw.disconnect(restArt);
			}
		}

		if (!restArt) {
			this._options.compoundRoot?.sessionStopped();
		}
	}

	/**
	 * end the current debug AdApter session
	 */
	Async disconnect(restArt = fAlse): Promise<void> {
		if (!this.rAw) {
			// AdApter went down but it did not send A 'terminAted' event, simulAte like the event hAs been sent
			this.onDidExitAdApter();
		}

		this.cAncelAllRequests();
		if (this.rAw) {
			AwAit this.rAw.disconnect(restArt);
		}

		if (!restArt) {
			this._options.compoundRoot?.sessionStopped();
		}
	}

	/**
	 * restArt debug AdApter session
	 */
	Async restArt(): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'restArt'));
		}

		this.cAncelAllRequests();
		AwAit this.rAw.restArt();
	}

	Async sendBreAkpoints(modelUri: URI, breAkpointsToSend: IBreAkpoint[], sourceModified: booleAn): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'breAkpoints'));
		}

		if (!this.rAw.reAdyForBreAkpoints) {
			return Promise.resolve(undefined);
		}

		const rAwSource = this.getRAwSource(modelUri);
		if (breAkpointsToSend.length && !rAwSource.AdApterDAtA) {
			rAwSource.AdApterDAtA = breAkpointsToSend[0].AdApterDAtA;
		}
		// NormAlize All drive letters going out from vscode to debug AdApters so we Are consistent with our resolving #43959
		if (rAwSource.pAth) {
			rAwSource.pAth = normAlizeDriveLetter(rAwSource.pAth);
		}

		const response = AwAit this.rAw.setBreAkpoints({
			source: rAwSource,
			lines: breAkpointsToSend.mAp(bp => bp.sessionAgnosticDAtA.lineNumber),
			breAkpoints: breAkpointsToSend.mAp(bp => ({ line: bp.sessionAgnosticDAtA.lineNumber, column: bp.sessionAgnosticDAtA.column, condition: bp.condition, hitCondition: bp.hitCondition, logMessAge: bp.logMessAge })),
			sourceModified
		});
		if (response && response.body) {
			const dAtA = new MAp<string, DebugProtocol.BreAkpoint>();
			for (let i = 0; i < breAkpointsToSend.length; i++) {
				dAtA.set(breAkpointsToSend[i].getId(), response.body.breAkpoints[i]);
			}

			this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
		}
	}

	Async sendFunctionBreAkpoints(fbpts: IFunctionBreAkpoint[]): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'function breAkpoints'));
		}

		if (this.rAw.reAdyForBreAkpoints) {
			const response = AwAit this.rAw.setFunctionBreAkpoints({ breAkpoints: fbpts });
			if (response && response.body) {
				const dAtA = new MAp<string, DebugProtocol.BreAkpoint>();
				for (let i = 0; i < fbpts.length; i++) {
					dAtA.set(fbpts[i].getId(), response.body.breAkpoints[i]);
				}
				this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
			}
		}
	}

	Async sendExceptionBreAkpoints(exbpts: IExceptionBreAkpoint[]): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'exception breAkpoints'));
		}

		if (this.rAw.reAdyForBreAkpoints) {
			AwAit this.rAw.setExceptionBreAkpoints({ filters: exbpts.mAp(exb => exb.filter) });
		}
	}

	Async dAtABreAkpointInfo(nAme: string, vAriAblesReference?: number): Promise<{ dAtAId: string | null, description: string, cAnPersist?: booleAn } | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'dAtA breAkpoints info'));
		}
		if (!this.rAw.reAdyForBreAkpoints) {
			throw new Error(locAlize('sessionNotReAdyForBreAkpoints', "Session is not reAdy for breAkpoints"));
		}

		const response = AwAit this.rAw.dAtABreAkpointInfo({ nAme, vAriAblesReference });
		return response?.body;
	}

	Async sendDAtABreAkpoints(dAtABreAkpoints: IDAtABreAkpoint[]): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'dAtA breAkpoints'));
		}

		if (this.rAw.reAdyForBreAkpoints) {
			const response = AwAit this.rAw.setDAtABreAkpoints({ breAkpoints: dAtABreAkpoints });
			if (response && response.body) {
				const dAtA = new MAp<string, DebugProtocol.BreAkpoint>();
				for (let i = 0; i < dAtABreAkpoints.length; i++) {
					dAtA.set(dAtABreAkpoints[i].getId(), response.body.breAkpoints[i]);
				}
				this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
			}
		}
	}

	Async breAkpointsLocAtions(uri: URI, lineNumber: number): Promise<IPosition[]> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'breAkpoints locAtions'));
		}

		const source = this.getRAwSource(uri);
		const response = AwAit this.rAw.breAkpointLocAtions({ source, line: lineNumber });
		if (!response || !response.body || !response.body.breAkpoints) {
			return [];
		}

		const positions = response.body.breAkpoints.mAp(bp => ({ lineNumber: bp.line, column: bp.column || 1 }));

		return distinct(positions, p => `${p.lineNumber}:${p.column}`);
	}

	getDebugProtocolBreAkpoint(breAkpointId: string): DebugProtocol.BreAkpoint | undefined {
		return this.model.getDebugProtocolBreAkpoint(breAkpointId, this.getId());
	}

	customRequest(request: string, Args: Any): Promise<DebugProtocol.Response | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", request));
		}

		return this.rAw.custom(request, Args);
	}

	stAckTrAce(threAdId: number, stArtFrAme: number, levels: number, token: CAncellAtionToken): Promise<DebugProtocol.StAckTrAceResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'stAckTrAce'));
		}

		const sessionToken = this.getNewCAncellAtionToken(threAdId, token);
		return this.rAw.stAckTrAce({ threAdId, stArtFrAme, levels }, sessionToken);
	}

	Async exceptionInfo(threAdId: number): Promise<IExceptionInfo | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'exceptionInfo'));
		}

		const response = AwAit this.rAw.exceptionInfo({ threAdId });
		if (response) {
			return {
				id: response.body.exceptionId,
				description: response.body.description,
				breAkMode: response.body.breAkMode,
				detAils: response.body.detAils
			};
		}

		return undefined;
	}

	scopes(frAmeId: number, threAdId: number): Promise<DebugProtocol.ScopesResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'scopes'));
		}

		const token = this.getNewCAncellAtionToken(threAdId);
		return this.rAw.scopes({ frAmeId }, token);
	}

	vAriAbles(vAriAblesReference: number, threAdId: number | undefined, filter: 'indexed' | 'nAmed' | undefined, stArt: number | undefined, count: number | undefined): Promise<DebugProtocol.VAriAblesResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'vAriAbles'));
		}

		const token = threAdId ? this.getNewCAncellAtionToken(threAdId) : undefined;
		return this.rAw.vAriAbles({ vAriAblesReference, filter, stArt, count }, token);
	}

	evAluAte(expression: string, frAmeId: number, context?: string): Promise<DebugProtocol.EvAluAteResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'evAluAte'));
		}

		return this.rAw.evAluAte({ expression, frAmeId, context });
	}

	Async restArtFrAme(frAmeId: number, threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'restArtFrAme'));
		}

		AwAit this.rAw.restArtFrAme({ frAmeId }, threAdId);
	}

	Async next(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'next'));
		}

		AwAit this.rAw.next({ threAdId });
	}

	Async stepIn(threAdId: number, tArgetId?: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'stepIn'));
		}

		AwAit this.rAw.stepIn({ threAdId, tArgetId });
	}

	Async stepOut(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'stepOut'));
		}

		AwAit this.rAw.stepOut({ threAdId });
	}

	Async stepBAck(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'stepBAck'));
		}

		AwAit this.rAw.stepBAck({ threAdId });
	}

	Async continue(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'continue'));
		}

		AwAit this.rAw.continue({ threAdId });
	}

	Async reverseContinue(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'reverse continue'));
		}

		AwAit this.rAw.reverseContinue({ threAdId });
	}

	Async pAuse(threAdId: number): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'pAuse'));
		}

		AwAit this.rAw.pAuse({ threAdId });
	}

	Async terminAteThreAds(threAdIds?: number[]): Promise<void> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'terminAteThreAds'));
		}

		AwAit this.rAw.terminAteThreAds({ threAdIds });
	}

	setVAriAble(vAriAblesReference: number, nAme: string, vAlue: string): Promise<DebugProtocol.SetVAriAbleResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'setVAriAble'));
		}

		return this.rAw.setVAriAble({ vAriAblesReference, nAme, vAlue });
	}

	gotoTArgets(source: DebugProtocol.Source, line: number, column?: number): Promise<DebugProtocol.GotoTArgetsResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'gotoTArgets'));
		}

		return this.rAw.gotoTArgets({ source, line, column });
	}

	goto(threAdId: number, tArgetId: number): Promise<DebugProtocol.GotoResponse | undefined> {
		if (!this.rAw) {
			throw new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'goto'));
		}

		return this.rAw.goto({ threAdId, tArgetId });
	}

	loAdSource(resource: URI): Promise<DebugProtocol.SourceResponse | undefined> {
		if (!this.rAw) {
			return Promise.reject(new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'loAdSource')));
		}

		const source = this.getSourceForUri(resource);
		let rAwSource: DebugProtocol.Source;
		if (source) {
			rAwSource = source.rAw;
		} else {
			// creAte A Source
			const dAtA = Source.getEncodedDebugDAtA(resource);
			rAwSource = { pAth: dAtA.pAth, sourceReference: dAtA.sourceReference };
		}

		return this.rAw.source({ sourceReference: rAwSource.sourceReference || 0, source: rAwSource });
	}

	Async getLoAdedSources(): Promise<Source[]> {
		if (!this.rAw) {
			return Promise.reject(new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'getLoAdedSources')));
		}

		const response = AwAit this.rAw.loAdedSources({});
		if (response && response.body && response.body.sources) {
			return response.body.sources.mAp(src => this.getSource(src));
		} else {
			return [];
		}
	}

	Async completions(frAmeId: number | undefined, threAdId: number, text: string, position: Position, overwriteBefore: number, token: CAncellAtionToken): Promise<DebugProtocol.CompletionsResponse | undefined> {
		if (!this.rAw) {
			return Promise.reject(new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'completions')));
		}
		const sessionCAncelAtionToken = this.getNewCAncellAtionToken(threAdId, token);

		return this.rAw.completions({
			frAmeId,
			text,
			column: position.column,
			line: position.lineNumber,
		}, sessionCAncelAtionToken);
	}

	Async stepInTArgets(frAmeId: number): Promise<{ id: number, lAbel: string }[] | undefined> {
		if (!this.rAw) {
			return Promise.reject(new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'stepInTArgets')));
		}

		const response = AwAit this.rAw.stepInTArgets({ frAmeId });
		return response?.body.tArgets;
	}

	Async cAncel(progressId: string): Promise<DebugProtocol.CAncelResponse | undefined> {
		if (!this.rAw) {
			return Promise.reject(new Error(locAlize('noDebugAdApter', "No debugger AvAilAble, cAn not send '{0}'", 'cAncel')));
		}

		return this.rAw.cAncel({ progressId });
	}

	//---- threAds

	getThreAd(threAdId: number): ThreAd | undefined {
		return this.threAds.get(threAdId);
	}

	getAllThreAds(): IThreAd[] {
		const result: IThreAd[] = [];
		this.threAds.forEAch(t => result.push(t));
		return result;
	}

	cleArThreAds(removeThreAds: booleAn, reference: number | undefined = undefined): void {
		if (reference !== undefined && reference !== null) {
			const threAd = this.threAds.get(reference);
			if (threAd) {
				threAd.cleArCAllStAck();
				threAd.stoppedDetAils = undefined;
				threAd.stopped = fAlse;

				if (removeThreAds) {
					this.threAds.delete(reference);
				}
			}
		} else {
			this.threAds.forEAch(threAd => {
				threAd.cleArCAllStAck();
				threAd.stoppedDetAils = undefined;
				threAd.stopped = fAlse;
			});

			if (removeThreAds) {
				this.threAds.cleAr();
				ExpressionContAiner.AllVAlues.cleAr();
			}
		}
	}

	rAwUpdAte(dAtA: IRAwModelUpdAte): void {
		const threAdIds: number[] = [];
		dAtA.threAds.forEAch(threAd => {
			threAdIds.push(threAd.id);
			if (!this.threAds.hAs(threAd.id)) {
				// A new threAd cAme in, initiAlize it.
				this.threAds.set(threAd.id, new ThreAd(this, threAd.nAme, threAd.id));
			} else if (threAd.nAme) {
				// Just the threAd nAme got updAted #18244
				const oldThreAd = this.threAds.get(threAd.id);
				if (oldThreAd) {
					oldThreAd.nAme = threAd.nAme;
				}
			}
		});
		this.threAds.forEAch(t => {
			// Remove All old threAds which Are no longer pArt of the updAte #75980
			if (threAdIds.indexOf(t.threAdId) === -1) {
				this.threAds.delete(t.threAdId);
			}
		});

		const stoppedDetAils = dAtA.stoppedDetAils;
		if (stoppedDetAils) {
			// Set the AvAilAbility of the threAds' cAllstAcks depending on
			// whether the threAd is stopped or not
			if (stoppedDetAils.AllThreAdsStopped) {
				this.threAds.forEAch(threAd => {
					threAd.stoppedDetAils = threAd.threAdId === stoppedDetAils.threAdId ? stoppedDetAils : { reAson: undefined };
					threAd.stopped = true;
					threAd.cleArCAllStAck();
				});
			} else {
				const threAd = typeof stoppedDetAils.threAdId === 'number' ? this.threAds.get(stoppedDetAils.threAdId) : undefined;
				if (threAd) {
					// One threAd is stopped, only updAte thAt threAd.
					threAd.stoppedDetAils = stoppedDetAils;
					threAd.cleArCAllStAck();
					threAd.stopped = true;
				}
			}
		}
	}

	privAte Async fetchThreAds(stoppedDetAils?: IRAwStoppedDetAils): Promise<void> {
		if (this.rAw) {
			const response = AwAit this.rAw.threAds();
			if (response && response.body && response.body.threAds) {
				this.model.rAwUpdAte({
					sessionId: this.getId(),
					threAds: response.body.threAds,
					stoppedDetAils
				});
			}
		}
	}

	initiAlizeForTest(rAw: RAwDebugSession): void {
		this.rAw = rAw;
		this.registerListeners();
	}

	//---- privAte

	privAte registerListeners(): void {
		if (!this.rAw) {
			return;
		}

		this.rAwListeners.push(this.rAw.onDidInitiAlize(Async () => {
			AriA.stAtus(locAlize('debuggingStArted', "Debugging stArted."));
			const sendConfigurAtionDone = Async () => {
				if (this.rAw && this.rAw.cApAbilities.supportsConfigurAtionDoneRequest) {
					try {
						AwAit this.rAw.configurAtionDone();
					} cAtch (e) {
						// Disconnect the debug session on configurAtion done error #10596
						this.notificAtionService.error(e);
						if (this.rAw) {
							this.rAw.disconnect();
						}
					}
				}

				return undefined;
			};

			// Send All breAkpoints
			try {
				AwAit this.debugService.sendAllBreAkpoints(this);
			} finAlly {
				AwAit sendConfigurAtionDone();
				AwAit this.fetchThreAds();
			}
		}));

		this.rAwListeners.push(this.rAw.onDidStop(Async event => {
			this.stoppedDetAils = event.body;
			AwAit this.fetchThreAds(event.body);
			const threAd = typeof event.body.threAdId === 'number' ? this.getThreAd(event.body.threAdId) : undefined;
			if (threAd) {
				// CAll fetch cAll stAck twice, the first only return the top stAck frAme.
				// Second retrieves the rest of the cAll stAck. For performAnce reAsons #25605
				const promises = this.model.fetchCAllStAck(<ThreAd>threAd);
				const focus = Async () => {
					if (!event.body.preserveFocusHint && threAd.getCAllStAck().length) {
						AwAit this.debugService.focusStAckFrAme(undefined, threAd);
						if (threAd.stoppedDetAils) {
							if (this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').openDebug === 'openOnDebugBreAk') {
								this.viewletService.openViewlet(VIEWLET_ID);
							}

							if (this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').focusWindowOnBreAk) {
								this.hostService.focus({ force: true /* ApplicAtion mAy not be Active */ });
							}
						}
					}
				};

				AwAit promises.topCAllStAck;
				focus();
				AwAit promises.wholeCAllStAck;
				if (!this.debugService.getViewModel().focusedStAckFrAme) {
					// The top stAck frAme cAn be deemphesized so try to focus AgAin #68616
					focus();
				}
			}
			this._onDidChAngeStAte.fire();
		}));

		this.rAwListeners.push(this.rAw.onDidThreAd(event => {
			if (event.body.reAson === 'stArted') {
				// debounce to reduce threAdsRequest frequency And improve performAnce
				if (!this.fetchThreAdsScheduler) {
					this.fetchThreAdsScheduler = new RunOnceScheduler(() => {
						this.fetchThreAds();
					}, 100);
					this.rAwListeners.push(this.fetchThreAdsScheduler);
				}
				if (!this.fetchThreAdsScheduler.isScheduled()) {
					this.fetchThreAdsScheduler.schedule();
				}
			} else if (event.body.reAson === 'exited') {
				this.model.cleArThreAds(this.getId(), true, event.body.threAdId);
				const viewModel = this.debugService.getViewModel();
				const focusedThreAd = viewModel.focusedThreAd;
				if (focusedThreAd && event.body.threAdId === focusedThreAd.threAdId) {
					// De-focus the threAd in cAse it wAs focused
					this.debugService.focusStAckFrAme(undefined, undefined, viewModel.focusedSession, fAlse);
				}
			}
		}));

		this.rAwListeners.push(this.rAw.onDidTerminAteDebugee(Async event => {
			AriA.stAtus(locAlize('debuggingStopped', "Debugging stopped."));
			if (event.body && event.body.restArt) {
				AwAit this.debugService.restArtSession(this, event.body.restArt);
			} else if (this.rAw) {
				AwAit this.rAw.disconnect();
			}
		}));

		this.rAwListeners.push(this.rAw.onDidContinued(event => {
			const threAdId = event.body.AllThreAdsContinued !== fAlse ? undefined : event.body.threAdId;
			if (threAdId) {
				const tokens = this.cAncellAtionMAp.get(threAdId);
				this.cAncellAtionMAp.delete(threAdId);
				if (tokens) {
					tokens.forEAch(t => t.cAncel());
				}
			} else {
				this.cAncelAllRequests();
			}

			this.model.cleArThreAds(this.getId(), fAlse, threAdId);
			this._onDidChAngeStAte.fire();
		}));

		const outputQueue = new Queue<void>();
		this.rAwListeners.push(this.rAw.onDidOutput(Async event => {
			outputQueue.queue(Async () => {
				if (!event.body || !this.rAw) {
					return;
				}

				const outputSeverity = event.body.cAtegory === 'stderr' ? severity.Error : event.body.cAtegory === 'console' ? severity.WArning : severity.Info;
				if (event.body.cAtegory === 'telemetry') {
					// only log telemetry events from debug AdApter if the debug extension provided the telemetry key
					// And the user opted in telemetry
					if (this.rAw.customTelemetryService && this.telemetryService.isOptedIn) {
						// __GDPR__TODO__ We're sending events in the nAme of the debug extension And we cAn not ensure thAt those Are declAred correctly.
						let dAtA = event.body.dAtA;
						if (!this.rAw.customTelemetryService.sendErrorTelemetry && event.body.dAtA) {
							dAtA = filterExceptionsFromTelemetry(event.body.dAtA);
						}

						this.rAw.customTelemetryService.publicLog(event.body.output, dAtA);
					}

					return;
				}

				// MAke sure to Append output in the correct order by properly wAiting on preivous promises #33822
				const source = event.body.source && event.body.line ? {
					lineNumber: event.body.line,
					column: event.body.column ? event.body.column : 1,
					source: this.getSource(event.body.source)
				} : undefined;

				if (event.body.group === 'stArt' || event.body.group === 'stArtCollApsed') {
					const expAnded = event.body.group === 'stArt';
					this.repl.stArtGroup(event.body.output || '', expAnded, source);
					return;
				}
				if (event.body.group === 'end') {
					this.repl.endGroup();
					if (!event.body.output) {
						// Only return if the end event does not hAve AdditionAl output in it
						return;
					}
				}

				if (event.body.vAriAblesReference) {
					const contAiner = new ExpressionContAiner(this, undefined, event.body.vAriAblesReference, generAteUuid());
					AwAit contAiner.getChildren().then(children => {
						children.forEAch(child => {
							// Since we cAn not displAy multiple trees in A row, we Are displAying these vAriAbles one After the other (ignoring their nAmes)
							(<Any>child).nAme = null;
							this.AppendToRepl(child, outputSeverity, source);
						});
					});
				} else if (typeof event.body.output === 'string') {
					this.AppendToRepl(event.body.output, outputSeverity, source);
				}
			});
		}));

		this.rAwListeners.push(this.rAw.onDidBreAkpoint(event => {
			const id = event.body && event.body.breAkpoint ? event.body.breAkpoint.id : undefined;
			const breAkpoint = this.model.getBreAkpoints().find(bp => bp.getIdFromAdApter(this.getId()) === id);
			const functionBreAkpoint = this.model.getFunctionBreAkpoints().find(bp => bp.getIdFromAdApter(this.getId()) === id);

			if (event.body.reAson === 'new' && event.body.breAkpoint.source && event.body.breAkpoint.line) {
				const source = this.getSource(event.body.breAkpoint.source);
				const bps = this.model.AddBreAkpoints(source.uri, [{
					column: event.body.breAkpoint.column,
					enAbled: true,
					lineNumber: event.body.breAkpoint.line,
				}], fAlse);
				if (bps.length === 1) {
					const dAtA = new MAp<string, DebugProtocol.BreAkpoint>([[bps[0].getId(), event.body.breAkpoint]]);
					this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
				}
			}

			if (event.body.reAson === 'removed') {
				if (breAkpoint) {
					this.model.removeBreAkpoints([breAkpoint]);
				}
				if (functionBreAkpoint) {
					this.model.removeFunctionBreAkpoints(functionBreAkpoint.getId());
				}
			}

			if (event.body.reAson === 'chAnged') {
				if (breAkpoint) {
					if (!breAkpoint.column) {
						event.body.breAkpoint.column = undefined;
					}
					const dAtA = new MAp<string, DebugProtocol.BreAkpoint>([[breAkpoint.getId(), event.body.breAkpoint]]);
					this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
				}
				if (functionBreAkpoint) {
					const dAtA = new MAp<string, DebugProtocol.BreAkpoint>([[functionBreAkpoint.getId(), event.body.breAkpoint]]);
					this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, dAtA);
				}
			}
		}));

		this.rAwListeners.push(this.rAw.onDidLoAdedSource(event => {
			this._onDidLoAdedSource.fire({
				reAson: event.body.reAson,
				source: this.getSource(event.body.source)
			});
		}));

		this.rAwListeners.push(this.rAw.onDidCustomEvent(event => {
			this._onDidCustomEvent.fire(event);
		}));

		this.rAwListeners.push(this.rAw.onDidProgressStArt(event => {
			this._onDidProgressStArt.fire(event);
		}));
		this.rAwListeners.push(this.rAw.onDidProgressUpdAte(event => {
			this._onDidProgressUpdAte.fire(event);
		}));
		this.rAwListeners.push(this.rAw.onDidProgressEnd(event => {
			this._onDidProgressEnd.fire(event);
		}));
		this.rAwListeners.push(this.rAw.onDidInvAlidAted(Async event => {
			if (!(event.body.AreAs && event.body.AreAs.length === 1 && event.body.AreAs[0] === 'vAriAbles')) {
				// If invAlidAted event only requires to updAte vAriAbles, do thAt, otherwise refAtch threAds https://github.com/microsoft/vscode/issues/106745
				this.cAncelAllRequests();
				this.model.cleArThreAds(this.getId(), true);
				AwAit this.fetchThreAds(this.stoppedDetAils);
			}

			const viewModel = this.debugService.getViewModel();
			if (viewModel.focusedSession === this) {
				viewModel.updAteViews();
			}
		}));

		this.rAwListeners.push(this.rAw.onDidExitAdApter(event => this.onDidExitAdApter(event)));
	}

	privAte onDidExitAdApter(event?: AdApterEndEvent): void {
		this.initiAlized = true;
		this.model.setBreAkpointSessionDAtA(this.getId(), this.cApAbilities, undefined);
		this.shutdown();
		this._onDidEndAdApter.fire(event);
	}

	// Disconnects And cleArs stAte. Session cAn be initiAlized AgAin for A new connection.
	privAte shutdown(): void {
		dispose(this.rAwListeners);
		if (this.rAw) {
			this.rAw.disconnect();
			this.rAw.dispose();
			this.rAw = undefined;
		}
		this.fetchThreAdsScheduler = undefined;
		this.model.cleArThreAds(this.getId(), true);
		this._onDidChAngeStAte.fire();
	}

	//---- sources

	getSourceForUri(uri: URI): Source | undefined {
		return this.sources.get(this.uriIdentityService.AsCAnonicAlUri(uri).toString());
	}

	getSource(rAw?: DebugProtocol.Source): Source {
		let source = new Source(rAw, this.getId(), this.uriIdentityService);
		const uriKey = source.uri.toString();
		const found = this.sources.get(uriKey);
		if (found) {
			source = found;
			// merge Attributes of new into existing
			source.rAw = mixin(source.rAw, rAw);
			if (source.rAw && rAw) {
				// AlwAys tAke the lAtest presentAtion hint from AdApter #42139
				source.rAw.presentAtionHint = rAw.presentAtionHint;
			}
		} else {
			this.sources.set(uriKey, source);
		}

		return source;
	}

	privAte getRAwSource(uri: URI): DebugProtocol.Source {
		const source = this.getSourceForUri(uri);
		if (source) {
			return source.rAw;
		} else {
			const dAtA = Source.getEncodedDebugDAtA(uri);
			return { nAme: dAtA.nAme, pAth: dAtA.pAth, sourceReference: dAtA.sourceReference };
		}
	}

	privAte getNewCAncellAtionToken(threAdId: number, token?: CAncellAtionToken): CAncellAtionToken {
		const tokenSource = new CAncellAtionTokenSource(token);
		const tokens = this.cAncellAtionMAp.get(threAdId) || [];
		tokens.push(tokenSource);
		this.cAncellAtionMAp.set(threAdId, tokens);

		return tokenSource.token;
	}

	privAte cAncelAllRequests(): void {
		this.cAncellAtionMAp.forEAch(tokens => tokens.forEAch(t => t.cAncel()));
		this.cAncellAtionMAp.cleAr();
	}

	// REPL

	getReplElements(): IReplElement[] {
		return this.repl.getReplElements();
	}

	hAsSepArAteRepl(): booleAn {
		return !this.pArentSession || this._options.repl !== 'mergeWithPArent';
	}

	removeReplExpressions(): void {
		this.repl.removeReplExpressions();
	}

	Async AddReplExpression(stAckFrAme: IStAckFrAme | undefined, nAme: string): Promise<void> {
		AwAit this.repl.AddReplExpression(this, stAckFrAme, nAme);
		// EvAluAte All wAtch expressions And fetch vAriAbles AgAin since repl evAluAtion might hAve chAnged some.
		this.debugService.getViewModel().updAteViews();
	}

	AppendToRepl(dAtA: string | IExpression, severity: severity, source?: IReplElementSource): void {
		this.repl.AppendToRepl(this, dAtA, severity, source);
	}

	logToRepl(sev: severity, Args: Any[], frAme?: { uri: URI, line: number, column: number }) {
		this.repl.logToRepl(this, sev, Args, frAme);
	}
}
