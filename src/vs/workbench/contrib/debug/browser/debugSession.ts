/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import * as platform from 'vs/Base/common/platform';
import severity from 'vs/Base/common/severity';
import { Event, Emitter } from 'vs/Base/common/event';
import { Position, IPosition } from 'vs/editor/common/core/position';
import * as aria from 'vs/Base/Browser/ui/aria/aria';
import { IDeBugSession, IConfig, IThread, IRawModelUpdate, IDeBugService, IRawStoppedDetails, State, LoadedSourceEvent, IFunctionBreakpoint, IExceptionBreakpoint, IBreakpoint, IExceptionInfo, AdapterEndEvent, IDeBugger, VIEWLET_ID, IDeBugConfiguration, IReplElement, IStackFrame, IExpression, IReplElementSource, IDataBreakpoint, IDeBugSessionOptions } from 'vs/workBench/contriB/deBug/common/deBug';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { mixin } from 'vs/Base/common/oBjects';
import { Thread, ExpressionContainer, DeBugModel } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { RawDeBugSession } from 'vs/workBench/contriB/deBug/Browser/rawDeBugSession';
import { IProductService } from 'vs/platform/product/common/productService';
import { IWorkspaceFolder, IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { RunOnceScheduler, Queue } from 'vs/Base/common/async';
import { generateUuid } from 'vs/Base/common/uuid';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionHostDeBugService } from 'vs/platform/deBug/common/extensionHostDeBug';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { normalizeDriveLetter } from 'vs/Base/common/laBels';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ReplModel } from 'vs/workBench/contriB/deBug/common/replModel';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { CancellationTokenSource, CancellationToken } from 'vs/Base/common/cancellation';
import { distinct } from 'vs/Base/common/arrays';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { localize } from 'vs/nls';
import { canceled } from 'vs/Base/common/errors';
import { filterExceptionsFromTelemetry } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { DeBugCompoundRoot } from 'vs/workBench/contriB/deBug/common/deBugCompoundRoot';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export class DeBugSession implements IDeBugSession {

	private _suBId: string | undefined;
	private raw: RawDeBugSession | undefined;
	private initialized = false;
	private _options: IDeBugSessionOptions;

	private sources = new Map<string, Source>();
	private threads = new Map<numBer, Thread>();
	private cancellationMap = new Map<numBer, CancellationTokenSource[]>();
	private rawListeners: IDisposaBle[] = [];
	private fetchThreadsScheduler: RunOnceScheduler | undefined;
	private repl: ReplModel;
	private stoppedDetails: IRawStoppedDetails | undefined;

	private readonly _onDidChangeState = new Emitter<void>();
	private readonly _onDidEndAdapter = new Emitter<AdapterEndEvent | undefined>();

	private readonly _onDidLoadedSource = new Emitter<LoadedSourceEvent>();
	private readonly _onDidCustomEvent = new Emitter<DeBugProtocol.Event>();
	private readonly _onDidProgressStart = new Emitter<DeBugProtocol.ProgressStartEvent>();
	private readonly _onDidProgressUpdate = new Emitter<DeBugProtocol.ProgressUpdateEvent>();
	private readonly _onDidProgressEnd = new Emitter<DeBugProtocol.ProgressEndEvent>();

	private readonly _onDidChangeREPLElements = new Emitter<void>();

	private name: string | undefined;
	private readonly _onDidChangeName = new Emitter<string>();

	constructor(
		private id: string,
		private _configuration: { resolved: IConfig, unresolved: IConfig | undefined },
		puBlic root: IWorkspaceFolder | undefined,
		private model: DeBugModel,
		options: IDeBugSessionOptions | undefined,
		@IDeBugService private readonly deBugService: IDeBugService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IHostService private readonly hostService: IHostService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IViewletService private readonly viewletService: IViewletService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IProductService private readonly productService: IProductService,
		@IExtensionHostDeBugService private readonly extensionHostDeBugService: IExtensionHostDeBugService,
		@IOpenerService private readonly openerService: IOpenerService,
		@INotificationService private readonly notificationService: INotificationService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		this._options = options || {};
		if (this.hasSeparateRepl()) {
			this.repl = new ReplModel();
		} else {
			this.repl = (this.parentSession as DeBugSession).repl;
		}

		const toDispose: IDisposaBle[] = [];
		toDispose.push(this.repl.onDidChangeElements(() => this._onDidChangeREPLElements.fire()));
		if (lifecycleService) {
			toDispose.push(lifecycleService.onShutdown(() => {
				this.shutdown();
				dispose(toDispose);
			}));
		}

		const compoundRoot = this._options.compoundRoot;
		if (compoundRoot) {
			toDispose.push(compoundRoot.onDidSessionStop(() => this.terminate()));
		}
	}

	getId(): string {
		return this.id;
	}

	setSuBId(suBId: string | undefined) {
		this._suBId = suBId;
	}

	get suBId(): string | undefined {
		return this._suBId;
	}

	get configuration(): IConfig {
		return this._configuration.resolved;
	}

	get unresolvedConfiguration(): IConfig | undefined {
		return this._configuration.unresolved;
	}

	get parentSession(): IDeBugSession | undefined {
		return this._options.parentSession;
	}

	get compact(): Boolean {
		return !!this._options.compact;
	}

	get compoundRoot(): DeBugCompoundRoot | undefined {
		return this._options.compoundRoot;
	}

	setConfiguration(configuration: { resolved: IConfig, unresolved: IConfig | undefined }) {
		this._configuration = configuration;
	}

	getLaBel(): string {
		const includeRoot = this.workspaceContextService.getWorkspace().folders.length > 1;
		const name = this.name || this.configuration.name;
		return includeRoot && this.root ? `${name} (${resources.BasenameOrAuthority(this.root.uri)})` : name;
	}

	setName(name: string): void {
		this.name = name;
		this._onDidChangeName.fire(name);
	}

	get state(): State {
		if (!this.initialized) {
			return State.Initializing;
		}
		if (!this.raw) {
			return State.Inactive;
		}

		const focusedThread = this.deBugService.getViewModel().focusedThread;
		if (focusedThread && focusedThread.session === this) {
			return focusedThread.stopped ? State.Stopped : State.Running;
		}
		if (this.getAllThreads().some(t => t.stopped)) {
			return State.Stopped;
		}

		return State.Running;
	}

	get capaBilities(): DeBugProtocol.CapaBilities {
		return this.raw ? this.raw.capaBilities : OBject.create(null);
	}

	//---- events
	get onDidChangeState(): Event<void> {
		return this._onDidChangeState.event;
	}

	get onDidEndAdapter(): Event<AdapterEndEvent | undefined> {
		return this._onDidEndAdapter.event;
	}

	get onDidChangeReplElements(): Event<void> {
		return this._onDidChangeREPLElements.event;
	}

	get onDidChangeName(): Event<string> {
		return this._onDidChangeName.event;
	}

	//---- DAP events

	get onDidCustomEvent(): Event<DeBugProtocol.Event> {
		return this._onDidCustomEvent.event;
	}

	get onDidLoadedSource(): Event<LoadedSourceEvent> {
		return this._onDidLoadedSource.event;
	}

	get onDidProgressStart(): Event<DeBugProtocol.ProgressStartEvent> {
		return this._onDidProgressStart.event;
	}

	get onDidProgressUpdate(): Event<DeBugProtocol.ProgressUpdateEvent> {
		return this._onDidProgressUpdate.event;
	}

	get onDidProgressEnd(): Event<DeBugProtocol.ProgressEndEvent> {
		return this._onDidProgressEnd.event;
	}

	//---- DAP requests

	/**
	 * create and initialize a new deBug adapter for this session
	 */
	async initialize(dBgr: IDeBugger): Promise<void> {

		if (this.raw) {
			// if there was already a connection make sure to remove old listeners
			this.shutdown();
		}

		try {
			const customTelemetryService = await dBgr.getCustomTelemetryService();
			const deBugAdapter = await dBgr.createDeBugAdapter(this);
			this.raw = new RawDeBugSession(deBugAdapter, dBgr, this.telemetryService, customTelemetryService, this.extensionHostDeBugService, this.openerService, this.notificationService);

			await this.raw.start();
			this.registerListeners();
			await this.raw!.initialize({
				clientID: 'vscode',
				clientName: this.productService.nameLong,
				adapterID: this.configuration.type,
				pathFormat: 'path',
				linesStartAt1: true,
				columnsStartAt1: true,
				supportsVariaBleType: true, // #8858
				supportsVariaBlePaging: true, // #9537
				supportsRunInTerminalRequest: true, // #10574
				locale: platform.locale,
				supportsProgressReporting: true, // #92253
				supportsInvalidatedEvent: true // #106745
			});

			this.initialized = true;
			this._onDidChangeState.fire();
			this.model.setExceptionBreakpoints((this.raw && this.raw.capaBilities.exceptionBreakpointFilters) || []);
		} catch (err) {
			this.initialized = true;
			this._onDidChangeState.fire();
			this.shutdown();
			throw err;
		}
	}

	/**
	 * launch or attach to the deBuggee
	 */
	async launchOrAttach(config: IConfig): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'launch or attach'));
		}
		if (this.parentSession && this.parentSession.state === State.Inactive) {
			throw canceled();
		}

		// __sessionID only used for EH deBugging (But we add it always for now...)
		config.__sessionId = this.getId();
		try {
			await this.raw.launchOrAttach(config);
		} catch (err) {
			this.shutdown();
			throw err;
		}
	}

	/**
	 * end the current deBug adapter session
	 */
	async terminate(restart = false): Promise<void> {
		if (!this.raw) {
			// Adapter went down But it did not send a 'terminated' event, simulate like the event has Been sent
			this.onDidExitAdapter();
		}

		this.cancelAllRequests();
		if (this.raw) {
			if (this.raw.capaBilities.supportsTerminateRequest && this._configuration.resolved.request === 'launch') {
				await this.raw.terminate(restart);
			} else {
				await this.raw.disconnect(restart);
			}
		}

		if (!restart) {
			this._options.compoundRoot?.sessionStopped();
		}
	}

	/**
	 * end the current deBug adapter session
	 */
	async disconnect(restart = false): Promise<void> {
		if (!this.raw) {
			// Adapter went down But it did not send a 'terminated' event, simulate like the event has Been sent
			this.onDidExitAdapter();
		}

		this.cancelAllRequests();
		if (this.raw) {
			await this.raw.disconnect(restart);
		}

		if (!restart) {
			this._options.compoundRoot?.sessionStopped();
		}
	}

	/**
	 * restart deBug adapter session
	 */
	async restart(): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'restart'));
		}

		this.cancelAllRequests();
		await this.raw.restart();
	}

	async sendBreakpoints(modelUri: URI, BreakpointsToSend: IBreakpoint[], sourceModified: Boolean): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'Breakpoints'));
		}

		if (!this.raw.readyForBreakpoints) {
			return Promise.resolve(undefined);
		}

		const rawSource = this.getRawSource(modelUri);
		if (BreakpointsToSend.length && !rawSource.adapterData) {
			rawSource.adapterData = BreakpointsToSend[0].adapterData;
		}
		// Normalize all drive letters going out from vscode to deBug adapters so we are consistent with our resolving #43959
		if (rawSource.path) {
			rawSource.path = normalizeDriveLetter(rawSource.path);
		}

		const response = await this.raw.setBreakpoints({
			source: rawSource,
			lines: BreakpointsToSend.map(Bp => Bp.sessionAgnosticData.lineNumBer),
			Breakpoints: BreakpointsToSend.map(Bp => ({ line: Bp.sessionAgnosticData.lineNumBer, column: Bp.sessionAgnosticData.column, condition: Bp.condition, hitCondition: Bp.hitCondition, logMessage: Bp.logMessage })),
			sourceModified
		});
		if (response && response.Body) {
			const data = new Map<string, DeBugProtocol.Breakpoint>();
			for (let i = 0; i < BreakpointsToSend.length; i++) {
				data.set(BreakpointsToSend[i].getId(), response.Body.Breakpoints[i]);
			}

			this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
		}
	}

	async sendFunctionBreakpoints(fBpts: IFunctionBreakpoint[]): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'function Breakpoints'));
		}

		if (this.raw.readyForBreakpoints) {
			const response = await this.raw.setFunctionBreakpoints({ Breakpoints: fBpts });
			if (response && response.Body) {
				const data = new Map<string, DeBugProtocol.Breakpoint>();
				for (let i = 0; i < fBpts.length; i++) {
					data.set(fBpts[i].getId(), response.Body.Breakpoints[i]);
				}
				this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
			}
		}
	}

	async sendExceptionBreakpoints(exBpts: IExceptionBreakpoint[]): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'exception Breakpoints'));
		}

		if (this.raw.readyForBreakpoints) {
			await this.raw.setExceptionBreakpoints({ filters: exBpts.map(exB => exB.filter) });
		}
	}

	async dataBreakpointInfo(name: string, variaBlesReference?: numBer): Promise<{ dataId: string | null, description: string, canPersist?: Boolean } | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'data Breakpoints info'));
		}
		if (!this.raw.readyForBreakpoints) {
			throw new Error(localize('sessionNotReadyForBreakpoints', "Session is not ready for Breakpoints"));
		}

		const response = await this.raw.dataBreakpointInfo({ name, variaBlesReference });
		return response?.Body;
	}

	async sendDataBreakpoints(dataBreakpoints: IDataBreakpoint[]): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'data Breakpoints'));
		}

		if (this.raw.readyForBreakpoints) {
			const response = await this.raw.setDataBreakpoints({ Breakpoints: dataBreakpoints });
			if (response && response.Body) {
				const data = new Map<string, DeBugProtocol.Breakpoint>();
				for (let i = 0; i < dataBreakpoints.length; i++) {
					data.set(dataBreakpoints[i].getId(), response.Body.Breakpoints[i]);
				}
				this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
			}
		}
	}

	async BreakpointsLocations(uri: URI, lineNumBer: numBer): Promise<IPosition[]> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'Breakpoints locations'));
		}

		const source = this.getRawSource(uri);
		const response = await this.raw.BreakpointLocations({ source, line: lineNumBer });
		if (!response || !response.Body || !response.Body.Breakpoints) {
			return [];
		}

		const positions = response.Body.Breakpoints.map(Bp => ({ lineNumBer: Bp.line, column: Bp.column || 1 }));

		return distinct(positions, p => `${p.lineNumBer}:${p.column}`);
	}

	getDeBugProtocolBreakpoint(BreakpointId: string): DeBugProtocol.Breakpoint | undefined {
		return this.model.getDeBugProtocolBreakpoint(BreakpointId, this.getId());
	}

	customRequest(request: string, args: any): Promise<DeBugProtocol.Response | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", request));
		}

		return this.raw.custom(request, args);
	}

	stackTrace(threadId: numBer, startFrame: numBer, levels: numBer, token: CancellationToken): Promise<DeBugProtocol.StackTraceResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'stackTrace'));
		}

		const sessionToken = this.getNewCancellationToken(threadId, token);
		return this.raw.stackTrace({ threadId, startFrame, levels }, sessionToken);
	}

	async exceptionInfo(threadId: numBer): Promise<IExceptionInfo | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'exceptionInfo'));
		}

		const response = await this.raw.exceptionInfo({ threadId });
		if (response) {
			return {
				id: response.Body.exceptionId,
				description: response.Body.description,
				BreakMode: response.Body.BreakMode,
				details: response.Body.details
			};
		}

		return undefined;
	}

	scopes(frameId: numBer, threadId: numBer): Promise<DeBugProtocol.ScopesResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'scopes'));
		}

		const token = this.getNewCancellationToken(threadId);
		return this.raw.scopes({ frameId }, token);
	}

	variaBles(variaBlesReference: numBer, threadId: numBer | undefined, filter: 'indexed' | 'named' | undefined, start: numBer | undefined, count: numBer | undefined): Promise<DeBugProtocol.VariaBlesResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'variaBles'));
		}

		const token = threadId ? this.getNewCancellationToken(threadId) : undefined;
		return this.raw.variaBles({ variaBlesReference, filter, start, count }, token);
	}

	evaluate(expression: string, frameId: numBer, context?: string): Promise<DeBugProtocol.EvaluateResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'evaluate'));
		}

		return this.raw.evaluate({ expression, frameId, context });
	}

	async restartFrame(frameId: numBer, threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'restartFrame'));
		}

		await this.raw.restartFrame({ frameId }, threadId);
	}

	async next(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'next'));
		}

		await this.raw.next({ threadId });
	}

	async stepIn(threadId: numBer, targetId?: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'stepIn'));
		}

		await this.raw.stepIn({ threadId, targetId });
	}

	async stepOut(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'stepOut'));
		}

		await this.raw.stepOut({ threadId });
	}

	async stepBack(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'stepBack'));
		}

		await this.raw.stepBack({ threadId });
	}

	async continue(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'continue'));
		}

		await this.raw.continue({ threadId });
	}

	async reverseContinue(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'reverse continue'));
		}

		await this.raw.reverseContinue({ threadId });
	}

	async pause(threadId: numBer): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'pause'));
		}

		await this.raw.pause({ threadId });
	}

	async terminateThreads(threadIds?: numBer[]): Promise<void> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'terminateThreads'));
		}

		await this.raw.terminateThreads({ threadIds });
	}

	setVariaBle(variaBlesReference: numBer, name: string, value: string): Promise<DeBugProtocol.SetVariaBleResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'setVariaBle'));
		}

		return this.raw.setVariaBle({ variaBlesReference, name, value });
	}

	gotoTargets(source: DeBugProtocol.Source, line: numBer, column?: numBer): Promise<DeBugProtocol.GotoTargetsResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'gotoTargets'));
		}

		return this.raw.gotoTargets({ source, line, column });
	}

	goto(threadId: numBer, targetId: numBer): Promise<DeBugProtocol.GotoResponse | undefined> {
		if (!this.raw) {
			throw new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'goto'));
		}

		return this.raw.goto({ threadId, targetId });
	}

	loadSource(resource: URI): Promise<DeBugProtocol.SourceResponse | undefined> {
		if (!this.raw) {
			return Promise.reject(new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'loadSource')));
		}

		const source = this.getSourceForUri(resource);
		let rawSource: DeBugProtocol.Source;
		if (source) {
			rawSource = source.raw;
		} else {
			// create a Source
			const data = Source.getEncodedDeBugData(resource);
			rawSource = { path: data.path, sourceReference: data.sourceReference };
		}

		return this.raw.source({ sourceReference: rawSource.sourceReference || 0, source: rawSource });
	}

	async getLoadedSources(): Promise<Source[]> {
		if (!this.raw) {
			return Promise.reject(new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'getLoadedSources')));
		}

		const response = await this.raw.loadedSources({});
		if (response && response.Body && response.Body.sources) {
			return response.Body.sources.map(src => this.getSource(src));
		} else {
			return [];
		}
	}

	async completions(frameId: numBer | undefined, threadId: numBer, text: string, position: Position, overwriteBefore: numBer, token: CancellationToken): Promise<DeBugProtocol.CompletionsResponse | undefined> {
		if (!this.raw) {
			return Promise.reject(new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'completions')));
		}
		const sessionCancelationToken = this.getNewCancellationToken(threadId, token);

		return this.raw.completions({
			frameId,
			text,
			column: position.column,
			line: position.lineNumBer,
		}, sessionCancelationToken);
	}

	async stepInTargets(frameId: numBer): Promise<{ id: numBer, laBel: string }[] | undefined> {
		if (!this.raw) {
			return Promise.reject(new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'stepInTargets')));
		}

		const response = await this.raw.stepInTargets({ frameId });
		return response?.Body.targets;
	}

	async cancel(progressId: string): Promise<DeBugProtocol.CancelResponse | undefined> {
		if (!this.raw) {
			return Promise.reject(new Error(localize('noDeBugAdapter', "No deBugger availaBle, can not send '{0}'", 'cancel')));
		}

		return this.raw.cancel({ progressId });
	}

	//---- threads

	getThread(threadId: numBer): Thread | undefined {
		return this.threads.get(threadId);
	}

	getAllThreads(): IThread[] {
		const result: IThread[] = [];
		this.threads.forEach(t => result.push(t));
		return result;
	}

	clearThreads(removeThreads: Boolean, reference: numBer | undefined = undefined): void {
		if (reference !== undefined && reference !== null) {
			const thread = this.threads.get(reference);
			if (thread) {
				thread.clearCallStack();
				thread.stoppedDetails = undefined;
				thread.stopped = false;

				if (removeThreads) {
					this.threads.delete(reference);
				}
			}
		} else {
			this.threads.forEach(thread => {
				thread.clearCallStack();
				thread.stoppedDetails = undefined;
				thread.stopped = false;
			});

			if (removeThreads) {
				this.threads.clear();
				ExpressionContainer.allValues.clear();
			}
		}
	}

	rawUpdate(data: IRawModelUpdate): void {
		const threadIds: numBer[] = [];
		data.threads.forEach(thread => {
			threadIds.push(thread.id);
			if (!this.threads.has(thread.id)) {
				// A new thread came in, initialize it.
				this.threads.set(thread.id, new Thread(this, thread.name, thread.id));
			} else if (thread.name) {
				// Just the thread name got updated #18244
				const oldThread = this.threads.get(thread.id);
				if (oldThread) {
					oldThread.name = thread.name;
				}
			}
		});
		this.threads.forEach(t => {
			// Remove all old threads which are no longer part of the update #75980
			if (threadIds.indexOf(t.threadId) === -1) {
				this.threads.delete(t.threadId);
			}
		});

		const stoppedDetails = data.stoppedDetails;
		if (stoppedDetails) {
			// Set the availaBility of the threads' callstacks depending on
			// whether the thread is stopped or not
			if (stoppedDetails.allThreadsStopped) {
				this.threads.forEach(thread => {
					thread.stoppedDetails = thread.threadId === stoppedDetails.threadId ? stoppedDetails : { reason: undefined };
					thread.stopped = true;
					thread.clearCallStack();
				});
			} else {
				const thread = typeof stoppedDetails.threadId === 'numBer' ? this.threads.get(stoppedDetails.threadId) : undefined;
				if (thread) {
					// One thread is stopped, only update that thread.
					thread.stoppedDetails = stoppedDetails;
					thread.clearCallStack();
					thread.stopped = true;
				}
			}
		}
	}

	private async fetchThreads(stoppedDetails?: IRawStoppedDetails): Promise<void> {
		if (this.raw) {
			const response = await this.raw.threads();
			if (response && response.Body && response.Body.threads) {
				this.model.rawUpdate({
					sessionId: this.getId(),
					threads: response.Body.threads,
					stoppedDetails
				});
			}
		}
	}

	initializeForTest(raw: RawDeBugSession): void {
		this.raw = raw;
		this.registerListeners();
	}

	//---- private

	private registerListeners(): void {
		if (!this.raw) {
			return;
		}

		this.rawListeners.push(this.raw.onDidInitialize(async () => {
			aria.status(localize('deBuggingStarted', "DeBugging started."));
			const sendConfigurationDone = async () => {
				if (this.raw && this.raw.capaBilities.supportsConfigurationDoneRequest) {
					try {
						await this.raw.configurationDone();
					} catch (e) {
						// Disconnect the deBug session on configuration done error #10596
						this.notificationService.error(e);
						if (this.raw) {
							this.raw.disconnect();
						}
					}
				}

				return undefined;
			};

			// Send all Breakpoints
			try {
				await this.deBugService.sendAllBreakpoints(this);
			} finally {
				await sendConfigurationDone();
				await this.fetchThreads();
			}
		}));

		this.rawListeners.push(this.raw.onDidStop(async event => {
			this.stoppedDetails = event.Body;
			await this.fetchThreads(event.Body);
			const thread = typeof event.Body.threadId === 'numBer' ? this.getThread(event.Body.threadId) : undefined;
			if (thread) {
				// Call fetch call stack twice, the first only return the top stack frame.
				// Second retrieves the rest of the call stack. For performance reasons #25605
				const promises = this.model.fetchCallStack(<Thread>thread);
				const focus = async () => {
					if (!event.Body.preserveFocusHint && thread.getCallStack().length) {
						await this.deBugService.focusStackFrame(undefined, thread);
						if (thread.stoppedDetails) {
							if (this.configurationService.getValue<IDeBugConfiguration>('deBug').openDeBug === 'openOnDeBugBreak') {
								this.viewletService.openViewlet(VIEWLET_ID);
							}

							if (this.configurationService.getValue<IDeBugConfiguration>('deBug').focusWindowOnBreak) {
								this.hostService.focus({ force: true /* Application may not Be active */ });
							}
						}
					}
				};

				await promises.topCallStack;
				focus();
				await promises.wholeCallStack;
				if (!this.deBugService.getViewModel().focusedStackFrame) {
					// The top stack frame can Be deemphesized so try to focus again #68616
					focus();
				}
			}
			this._onDidChangeState.fire();
		}));

		this.rawListeners.push(this.raw.onDidThread(event => {
			if (event.Body.reason === 'started') {
				// deBounce to reduce threadsRequest frequency and improve performance
				if (!this.fetchThreadsScheduler) {
					this.fetchThreadsScheduler = new RunOnceScheduler(() => {
						this.fetchThreads();
					}, 100);
					this.rawListeners.push(this.fetchThreadsScheduler);
				}
				if (!this.fetchThreadsScheduler.isScheduled()) {
					this.fetchThreadsScheduler.schedule();
				}
			} else if (event.Body.reason === 'exited') {
				this.model.clearThreads(this.getId(), true, event.Body.threadId);
				const viewModel = this.deBugService.getViewModel();
				const focusedThread = viewModel.focusedThread;
				if (focusedThread && event.Body.threadId === focusedThread.threadId) {
					// De-focus the thread in case it was focused
					this.deBugService.focusStackFrame(undefined, undefined, viewModel.focusedSession, false);
				}
			}
		}));

		this.rawListeners.push(this.raw.onDidTerminateDeBugee(async event => {
			aria.status(localize('deBuggingStopped', "DeBugging stopped."));
			if (event.Body && event.Body.restart) {
				await this.deBugService.restartSession(this, event.Body.restart);
			} else if (this.raw) {
				await this.raw.disconnect();
			}
		}));

		this.rawListeners.push(this.raw.onDidContinued(event => {
			const threadId = event.Body.allThreadsContinued !== false ? undefined : event.Body.threadId;
			if (threadId) {
				const tokens = this.cancellationMap.get(threadId);
				this.cancellationMap.delete(threadId);
				if (tokens) {
					tokens.forEach(t => t.cancel());
				}
			} else {
				this.cancelAllRequests();
			}

			this.model.clearThreads(this.getId(), false, threadId);
			this._onDidChangeState.fire();
		}));

		const outputQueue = new Queue<void>();
		this.rawListeners.push(this.raw.onDidOutput(async event => {
			outputQueue.queue(async () => {
				if (!event.Body || !this.raw) {
					return;
				}

				const outputSeverity = event.Body.category === 'stderr' ? severity.Error : event.Body.category === 'console' ? severity.Warning : severity.Info;
				if (event.Body.category === 'telemetry') {
					// only log telemetry events from deBug adapter if the deBug extension provided the telemetry key
					// and the user opted in telemetry
					if (this.raw.customTelemetryService && this.telemetryService.isOptedIn) {
						// __GDPR__TODO__ We're sending events in the name of the deBug extension and we can not ensure that those are declared correctly.
						let data = event.Body.data;
						if (!this.raw.customTelemetryService.sendErrorTelemetry && event.Body.data) {
							data = filterExceptionsFromTelemetry(event.Body.data);
						}

						this.raw.customTelemetryService.puBlicLog(event.Body.output, data);
					}

					return;
				}

				// Make sure to append output in the correct order By properly waiting on preivous promises #33822
				const source = event.Body.source && event.Body.line ? {
					lineNumBer: event.Body.line,
					column: event.Body.column ? event.Body.column : 1,
					source: this.getSource(event.Body.source)
				} : undefined;

				if (event.Body.group === 'start' || event.Body.group === 'startCollapsed') {
					const expanded = event.Body.group === 'start';
					this.repl.startGroup(event.Body.output || '', expanded, source);
					return;
				}
				if (event.Body.group === 'end') {
					this.repl.endGroup();
					if (!event.Body.output) {
						// Only return if the end event does not have additional output in it
						return;
					}
				}

				if (event.Body.variaBlesReference) {
					const container = new ExpressionContainer(this, undefined, event.Body.variaBlesReference, generateUuid());
					await container.getChildren().then(children => {
						children.forEach(child => {
							// Since we can not display multiple trees in a row, we are displaying these variaBles one after the other (ignoring their names)
							(<any>child).name = null;
							this.appendToRepl(child, outputSeverity, source);
						});
					});
				} else if (typeof event.Body.output === 'string') {
					this.appendToRepl(event.Body.output, outputSeverity, source);
				}
			});
		}));

		this.rawListeners.push(this.raw.onDidBreakpoint(event => {
			const id = event.Body && event.Body.Breakpoint ? event.Body.Breakpoint.id : undefined;
			const Breakpoint = this.model.getBreakpoints().find(Bp => Bp.getIdFromAdapter(this.getId()) === id);
			const functionBreakpoint = this.model.getFunctionBreakpoints().find(Bp => Bp.getIdFromAdapter(this.getId()) === id);

			if (event.Body.reason === 'new' && event.Body.Breakpoint.source && event.Body.Breakpoint.line) {
				const source = this.getSource(event.Body.Breakpoint.source);
				const Bps = this.model.addBreakpoints(source.uri, [{
					column: event.Body.Breakpoint.column,
					enaBled: true,
					lineNumBer: event.Body.Breakpoint.line,
				}], false);
				if (Bps.length === 1) {
					const data = new Map<string, DeBugProtocol.Breakpoint>([[Bps[0].getId(), event.Body.Breakpoint]]);
					this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
				}
			}

			if (event.Body.reason === 'removed') {
				if (Breakpoint) {
					this.model.removeBreakpoints([Breakpoint]);
				}
				if (functionBreakpoint) {
					this.model.removeFunctionBreakpoints(functionBreakpoint.getId());
				}
			}

			if (event.Body.reason === 'changed') {
				if (Breakpoint) {
					if (!Breakpoint.column) {
						event.Body.Breakpoint.column = undefined;
					}
					const data = new Map<string, DeBugProtocol.Breakpoint>([[Breakpoint.getId(), event.Body.Breakpoint]]);
					this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
				}
				if (functionBreakpoint) {
					const data = new Map<string, DeBugProtocol.Breakpoint>([[functionBreakpoint.getId(), event.Body.Breakpoint]]);
					this.model.setBreakpointSessionData(this.getId(), this.capaBilities, data);
				}
			}
		}));

		this.rawListeners.push(this.raw.onDidLoadedSource(event => {
			this._onDidLoadedSource.fire({
				reason: event.Body.reason,
				source: this.getSource(event.Body.source)
			});
		}));

		this.rawListeners.push(this.raw.onDidCustomEvent(event => {
			this._onDidCustomEvent.fire(event);
		}));

		this.rawListeners.push(this.raw.onDidProgressStart(event => {
			this._onDidProgressStart.fire(event);
		}));
		this.rawListeners.push(this.raw.onDidProgressUpdate(event => {
			this._onDidProgressUpdate.fire(event);
		}));
		this.rawListeners.push(this.raw.onDidProgressEnd(event => {
			this._onDidProgressEnd.fire(event);
		}));
		this.rawListeners.push(this.raw.onDidInvalidated(async event => {
			if (!(event.Body.areas && event.Body.areas.length === 1 && event.Body.areas[0] === 'variaBles')) {
				// If invalidated event only requires to update variaBles, do that, otherwise refatch threads https://githuB.com/microsoft/vscode/issues/106745
				this.cancelAllRequests();
				this.model.clearThreads(this.getId(), true);
				await this.fetchThreads(this.stoppedDetails);
			}

			const viewModel = this.deBugService.getViewModel();
			if (viewModel.focusedSession === this) {
				viewModel.updateViews();
			}
		}));

		this.rawListeners.push(this.raw.onDidExitAdapter(event => this.onDidExitAdapter(event)));
	}

	private onDidExitAdapter(event?: AdapterEndEvent): void {
		this.initialized = true;
		this.model.setBreakpointSessionData(this.getId(), this.capaBilities, undefined);
		this.shutdown();
		this._onDidEndAdapter.fire(event);
	}

	// Disconnects and clears state. Session can Be initialized again for a new connection.
	private shutdown(): void {
		dispose(this.rawListeners);
		if (this.raw) {
			this.raw.disconnect();
			this.raw.dispose();
			this.raw = undefined;
		}
		this.fetchThreadsScheduler = undefined;
		this.model.clearThreads(this.getId(), true);
		this._onDidChangeState.fire();
	}

	//---- sources

	getSourceForUri(uri: URI): Source | undefined {
		return this.sources.get(this.uriIdentityService.asCanonicalUri(uri).toString());
	}

	getSource(raw?: DeBugProtocol.Source): Source {
		let source = new Source(raw, this.getId(), this.uriIdentityService);
		const uriKey = source.uri.toString();
		const found = this.sources.get(uriKey);
		if (found) {
			source = found;
			// merge attriButes of new into existing
			source.raw = mixin(source.raw, raw);
			if (source.raw && raw) {
				// Always take the latest presentation hint from adapter #42139
				source.raw.presentationHint = raw.presentationHint;
			}
		} else {
			this.sources.set(uriKey, source);
		}

		return source;
	}

	private getRawSource(uri: URI): DeBugProtocol.Source {
		const source = this.getSourceForUri(uri);
		if (source) {
			return source.raw;
		} else {
			const data = Source.getEncodedDeBugData(uri);
			return { name: data.name, path: data.path, sourceReference: data.sourceReference };
		}
	}

	private getNewCancellationToken(threadId: numBer, token?: CancellationToken): CancellationToken {
		const tokenSource = new CancellationTokenSource(token);
		const tokens = this.cancellationMap.get(threadId) || [];
		tokens.push(tokenSource);
		this.cancellationMap.set(threadId, tokens);

		return tokenSource.token;
	}

	private cancelAllRequests(): void {
		this.cancellationMap.forEach(tokens => tokens.forEach(t => t.cancel()));
		this.cancellationMap.clear();
	}

	// REPL

	getReplElements(): IReplElement[] {
		return this.repl.getReplElements();
	}

	hasSeparateRepl(): Boolean {
		return !this.parentSession || this._options.repl !== 'mergeWithParent';
	}

	removeReplExpressions(): void {
		this.repl.removeReplExpressions();
	}

	async addReplExpression(stackFrame: IStackFrame | undefined, name: string): Promise<void> {
		await this.repl.addReplExpression(this, stackFrame, name);
		// Evaluate all watch expressions and fetch variaBles again since repl evaluation might have changed some.
		this.deBugService.getViewModel().updateViews();
	}

	appendToRepl(data: string | IExpression, severity: severity, source?: IReplElementSource): void {
		this.repl.appendToRepl(this, data, severity, source);
	}

	logToRepl(sev: severity, args: any[], frame?: { uri: URI, line: numBer, column: numBer }) {
		this.repl.logToRepl(this, sev, args, frame);
	}
}
