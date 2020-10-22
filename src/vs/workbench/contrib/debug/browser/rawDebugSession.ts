/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import * as oBjects from 'vs/Base/common/oBjects';
import { Action } from 'vs/Base/common/actions';
import * as errors from 'vs/Base/common/errors';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { formatPII, isUri } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { IDeBugAdapter, IConfig, AdapterEndEvent, IDeBugger } from 'vs/workBench/contriB/deBug/common/deBug';
import { createErrorWithActions } from 'vs/Base/common/errorsWithActions';
import { IExtensionHostDeBugService, IOpenExtensionWindowResult } from 'vs/platform/deBug/common/extensionHostDeBug';
import { URI } from 'vs/Base/common/uri';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { env as processEnv } from 'vs/Base/common/process';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { INotificationService } from 'vs/platform/notification/common/notification';

/**
 * This interface represents a single command line argument split into a "prefix" and a "path" half.
 * The optional "prefix" contains arBitrary text and the optional "path" contains a file system path.
 * Concatenating Both results in the original command line argument.
 */
interface ILaunchVSCodeArgument {
	prefix?: string;
	path?: string;
}

interface ILaunchVSCodeArguments {
	args: ILaunchVSCodeArgument[];
	deBugRenderer?: Boolean;
	env?: { [key: string]: string | null; };
}

/**
 * Encapsulates the DeBugAdapter lifecycle and some idiosyncrasies of the DeBug Adapter Protocol.
 */
export class RawDeBugSession implements IDisposaBle {

	private allThreadsContinued = true;
	private _readyForBreakpoints = false;
	private _capaBilities: DeBugProtocol.CapaBilities;

	// shutdown
	private deBugAdapterStopped = false;
	private inShutdown = false;
	private terminated = false;
	private firedAdapterExitEvent = false;

	// telemetry
	private startTime = 0;
	private didReceiveStoppedEvent = false;

	// DAP events
	private readonly _onDidInitialize = new Emitter<DeBugProtocol.InitializedEvent>();
	private readonly _onDidStop = new Emitter<DeBugProtocol.StoppedEvent>();
	private readonly _onDidContinued = new Emitter<DeBugProtocol.ContinuedEvent>();
	private readonly _onDidTerminateDeBugee = new Emitter<DeBugProtocol.TerminatedEvent>();
	private readonly _onDidExitDeBugee = new Emitter<DeBugProtocol.ExitedEvent>();
	private readonly _onDidThread = new Emitter<DeBugProtocol.ThreadEvent>();
	private readonly _onDidOutput = new Emitter<DeBugProtocol.OutputEvent>();
	private readonly _onDidBreakpoint = new Emitter<DeBugProtocol.BreakpointEvent>();
	private readonly _onDidLoadedSource = new Emitter<DeBugProtocol.LoadedSourceEvent>();
	private readonly _onDidProgressStart = new Emitter<DeBugProtocol.ProgressStartEvent>();
	private readonly _onDidProgressUpdate = new Emitter<DeBugProtocol.ProgressUpdateEvent>();
	private readonly _onDidProgressEnd = new Emitter<DeBugProtocol.ProgressEndEvent>();
	private readonly _onDidInvalidated = new Emitter<DeBugProtocol.InvalidatedEvent>();
	private readonly _onDidCustomEvent = new Emitter<DeBugProtocol.Event>();
	private readonly _onDidEvent = new Emitter<DeBugProtocol.Event>();

	// DA events
	private readonly _onDidExitAdapter = new Emitter<AdapterEndEvent>();
	private deBugAdapter: IDeBugAdapter | null;

	private toDispose: IDisposaBle[] = [];

	constructor(
		deBugAdapter: IDeBugAdapter,
		dBgr: IDeBugger,
		private readonly telemetryService: ITelemetryService,
		puBlic readonly customTelemetryService: ITelemetryService | undefined,
		private readonly extensionHostDeBugService: IExtensionHostDeBugService,
		private readonly openerService: IOpenerService,
		private readonly notificationService: INotificationService
	) {
		this.deBugAdapter = deBugAdapter;
		this._capaBilities = OBject.create(null);

		this.toDispose.push(this.deBugAdapter.onError(err => {
			this.shutdown(err);
		}));

		this.toDispose.push(this.deBugAdapter.onExit(code => {
			if (code !== 0) {
				this.shutdown(new Error(`exit code: ${code}`));
			} else {
				// normal exit
				this.shutdown();
			}
		}));

		this.deBugAdapter.onEvent(event => {
			switch (event.event) {
				case 'initialized':
					this._readyForBreakpoints = true;
					this._onDidInitialize.fire(event);
					Break;
				case 'loadedSource':
					this._onDidLoadedSource.fire(<DeBugProtocol.LoadedSourceEvent>event);
					Break;
				case 'capaBilities':
					if (event.Body) {
						const capaBilities = (<DeBugProtocol.CapaBilitiesEvent>event).Body.capaBilities;
						this.mergeCapaBilities(capaBilities);
					}
					Break;
				case 'stopped':
					this.didReceiveStoppedEvent = true;		// telemetry: rememBer that deBugger stopped successfully
					this._onDidStop.fire(<DeBugProtocol.StoppedEvent>event);
					Break;
				case 'continued':
					this.allThreadsContinued = (<DeBugProtocol.ContinuedEvent>event).Body.allThreadsContinued === false ? false : true;
					this._onDidContinued.fire(<DeBugProtocol.ContinuedEvent>event);
					Break;
				case 'thread':
					this._onDidThread.fire(<DeBugProtocol.ThreadEvent>event);
					Break;
				case 'output':
					this._onDidOutput.fire(<DeBugProtocol.OutputEvent>event);
					Break;
				case 'Breakpoint':
					this._onDidBreakpoint.fire(<DeBugProtocol.BreakpointEvent>event);
					Break;
				case 'terminated':
					this._onDidTerminateDeBugee.fire(<DeBugProtocol.TerminatedEvent>event);
					Break;
				case 'exit':
					this._onDidExitDeBugee.fire(<DeBugProtocol.ExitedEvent>event);
					Break;
				case 'progressStart':
					this._onDidProgressStart.fire(event as DeBugProtocol.ProgressStartEvent);
					Break;
				case 'progressUpdate':
					this._onDidProgressUpdate.fire(event as DeBugProtocol.ProgressUpdateEvent);
					Break;
				case 'progressEnd':
					this._onDidProgressEnd.fire(event as DeBugProtocol.ProgressEndEvent);
					Break;
				case 'invalidated':
					this._onDidInvalidated.fire(event as DeBugProtocol.InvalidatedEvent);
					Break;
				default:
					this._onDidCustomEvent.fire(event);
					Break;
			}
			this._onDidEvent.fire(event);
		});

		this.deBugAdapter.onRequest(request => this.dispatchRequest(request, dBgr));
	}

	get onDidExitAdapter(): Event<AdapterEndEvent> {
		return this._onDidExitAdapter.event;
	}

	get capaBilities(): DeBugProtocol.CapaBilities {
		return this._capaBilities;
	}

	/**
	 * DA is ready to accepts setBreakpoint requests.
	 * Becomes true after "initialized" events has Been received.
	 */
	get readyForBreakpoints(): Boolean {
		return this._readyForBreakpoints;
	}

	//---- DAP events

	get onDidInitialize(): Event<DeBugProtocol.InitializedEvent> {
		return this._onDidInitialize.event;
	}

	get onDidStop(): Event<DeBugProtocol.StoppedEvent> {
		return this._onDidStop.event;
	}

	get onDidContinued(): Event<DeBugProtocol.ContinuedEvent> {
		return this._onDidContinued.event;
	}

	get onDidTerminateDeBugee(): Event<DeBugProtocol.TerminatedEvent> {
		return this._onDidTerminateDeBugee.event;
	}

	get onDidExitDeBugee(): Event<DeBugProtocol.ExitedEvent> {
		return this._onDidExitDeBugee.event;
	}

	get onDidThread(): Event<DeBugProtocol.ThreadEvent> {
		return this._onDidThread.event;
	}

	get onDidOutput(): Event<DeBugProtocol.OutputEvent> {
		return this._onDidOutput.event;
	}

	get onDidBreakpoint(): Event<DeBugProtocol.BreakpointEvent> {
		return this._onDidBreakpoint.event;
	}

	get onDidLoadedSource(): Event<DeBugProtocol.LoadedSourceEvent> {
		return this._onDidLoadedSource.event;
	}

	get onDidCustomEvent(): Event<DeBugProtocol.Event> {
		return this._onDidCustomEvent.event;
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

	get onDidInvalidated(): Event<DeBugProtocol.InvalidatedEvent> {
		return this._onDidInvalidated.event;
	}

	get onDidEvent(): Event<DeBugProtocol.Event> {
		return this._onDidEvent.event;
	}

	//---- DeBugAdapter lifecycle

	/**
	 * Starts the underlying deBug adapter and tracks the session time for telemetry.
	 */
	async start(): Promise<void> {
		if (!this.deBugAdapter) {
			return Promise.reject(new Error(nls.localize('noDeBugAdapterStart', "No deBug adapter, can not start deBug session.")));
		}

		await this.deBugAdapter.startSession();
		this.startTime = new Date().getTime();
	}

	/**
	 * Send client capaBilities to the deBug adapter and receive DA capaBilities in return.
	 */
	async initialize(args: DeBugProtocol.InitializeRequestArguments): Promise<DeBugProtocol.InitializeResponse | undefined> {
		const response = await this.send('initialize', args);
		if (response) {
			this.mergeCapaBilities(response.Body);
		}

		return response;
	}

	/**
	 * Terminate the deBuggee and shutdown the adapter
	 */
	disconnect(restart = false): Promise<any> {
		return this.shutdown(undefined, restart);
	}

	//---- DAP requests

	async launchOrAttach(config: IConfig): Promise<DeBugProtocol.Response | undefined> {
		const response = await this.send(config.request, config);
		if (response) {
			this.mergeCapaBilities(response.Body);
		}

		return response;
	}

	/**
	 * Try killing the deBuggee softly...
	 */
	terminate(restart = false): Promise<DeBugProtocol.TerminateResponse | undefined> {
		if (this.capaBilities.supportsTerminateRequest) {
			if (!this.terminated) {
				this.terminated = true;
				return this.send('terminate', { restart }, undefined, 2000);
			}
			return this.disconnect(restart);
		}
		return Promise.reject(new Error('terminated not supported'));
	}

	restart(): Promise<DeBugProtocol.RestartResponse | undefined> {
		if (this.capaBilities.supportsRestartRequest) {
			return this.send('restart', null);
		}
		return Promise.reject(new Error('restart not supported'));
	}

	async next(args: DeBugProtocol.NextArguments): Promise<DeBugProtocol.NextResponse | undefined> {
		const response = await this.send('next', args);
		this.fireSimulatedContinuedEvent(args.threadId);
		return response;
	}

	async stepIn(args: DeBugProtocol.StepInArguments): Promise<DeBugProtocol.StepInResponse | undefined> {
		const response = await this.send('stepIn', args);
		this.fireSimulatedContinuedEvent(args.threadId);
		return response;
	}

	async stepOut(args: DeBugProtocol.StepOutArguments): Promise<DeBugProtocol.StepOutResponse | undefined> {
		const response = await this.send('stepOut', args);
		this.fireSimulatedContinuedEvent(args.threadId);
		return response;
	}

	async continue(args: DeBugProtocol.ContinueArguments): Promise<DeBugProtocol.ContinueResponse | undefined> {
		const response = await this.send<DeBugProtocol.ContinueResponse>('continue', args);
		if (response && response.Body && response.Body.allThreadsContinued !== undefined) {
			this.allThreadsContinued = response.Body.allThreadsContinued;
		}
		this.fireSimulatedContinuedEvent(args.threadId, this.allThreadsContinued);

		return response;
	}

	pause(args: DeBugProtocol.PauseArguments): Promise<DeBugProtocol.PauseResponse | undefined> {
		return this.send('pause', args);
	}

	terminateThreads(args: DeBugProtocol.TerminateThreadsArguments): Promise<DeBugProtocol.TerminateThreadsResponse | undefined> {
		if (this.capaBilities.supportsTerminateThreadsRequest) {
			return this.send('terminateThreads', args);
		}
		return Promise.reject(new Error('terminateThreads not supported'));
	}

	setVariaBle(args: DeBugProtocol.SetVariaBleArguments): Promise<DeBugProtocol.SetVariaBleResponse | undefined> {
		if (this.capaBilities.supportsSetVariaBle) {
			return this.send<DeBugProtocol.SetVariaBleResponse>('setVariaBle', args);
		}
		return Promise.reject(new Error('setVariaBle not supported'));
	}

	async restartFrame(args: DeBugProtocol.RestartFrameArguments, threadId: numBer): Promise<DeBugProtocol.RestartFrameResponse | undefined> {
		if (this.capaBilities.supportsRestartFrame) {
			const response = await this.send('restartFrame', args);
			this.fireSimulatedContinuedEvent(threadId);
			return response;
		}
		return Promise.reject(new Error('restartFrame not supported'));
	}

	stepInTargets(args: DeBugProtocol.StepInTargetsArguments): Promise<DeBugProtocol.StepInTargetsResponse | undefined> {
		if (this.capaBilities.supportsStepInTargetsRequest) {
			return this.send('stepInTargets', args);
		}
		return Promise.reject(new Error('stepInTargets not supported'));
	}

	completions(args: DeBugProtocol.CompletionsArguments, token: CancellationToken): Promise<DeBugProtocol.CompletionsResponse | undefined> {
		if (this.capaBilities.supportsCompletionsRequest) {
			return this.send<DeBugProtocol.CompletionsResponse>('completions', args, token);
		}
		return Promise.reject(new Error('completions not supported'));
	}

	setBreakpoints(args: DeBugProtocol.SetBreakpointsArguments): Promise<DeBugProtocol.SetBreakpointsResponse | undefined> {
		return this.send<DeBugProtocol.SetBreakpointsResponse>('setBreakpoints', args);
	}

	setFunctionBreakpoints(args: DeBugProtocol.SetFunctionBreakpointsArguments): Promise<DeBugProtocol.SetFunctionBreakpointsResponse | undefined> {
		if (this.capaBilities.supportsFunctionBreakpoints) {
			return this.send<DeBugProtocol.SetFunctionBreakpointsResponse>('setFunctionBreakpoints', args);
		}
		return Promise.reject(new Error('setFunctionBreakpoints not supported'));
	}

	dataBreakpointInfo(args: DeBugProtocol.DataBreakpointInfoArguments): Promise<DeBugProtocol.DataBreakpointInfoResponse | undefined> {
		if (this.capaBilities.supportsDataBreakpoints) {
			return this.send<DeBugProtocol.DataBreakpointInfoResponse>('dataBreakpointInfo', args);
		}
		return Promise.reject(new Error('dataBreakpointInfo not supported'));
	}

	setDataBreakpoints(args: DeBugProtocol.SetDataBreakpointsArguments): Promise<DeBugProtocol.SetDataBreakpointsResponse | undefined> {
		if (this.capaBilities.supportsDataBreakpoints) {
			return this.send<DeBugProtocol.SetDataBreakpointsResponse>('setDataBreakpoints', args);
		}
		return Promise.reject(new Error('setDataBreakpoints not supported'));
	}

	setExceptionBreakpoints(args: DeBugProtocol.SetExceptionBreakpointsArguments): Promise<DeBugProtocol.SetExceptionBreakpointsResponse | undefined> {
		return this.send<DeBugProtocol.SetExceptionBreakpointsResponse>('setExceptionBreakpoints', args);
	}

	BreakpointLocations(args: DeBugProtocol.BreakpointLocationsArguments): Promise<DeBugProtocol.BreakpointLocationsResponse | undefined> {
		if (this.capaBilities.supportsBreakpointLocationsRequest) {
			return this.send('BreakpointLocations', args);
		}
		return Promise.reject(new Error('BreakpointLocations is not supported'));
	}

	configurationDone(): Promise<DeBugProtocol.ConfigurationDoneResponse | undefined> {
		if (this.capaBilities.supportsConfigurationDoneRequest) {
			return this.send('configurationDone', null);
		}
		return Promise.reject(new Error('configurationDone not supported'));
	}

	stackTrace(args: DeBugProtocol.StackTraceArguments, token: CancellationToken): Promise<DeBugProtocol.StackTraceResponse | undefined> {
		return this.send<DeBugProtocol.StackTraceResponse>('stackTrace', args, token);
	}

	exceptionInfo(args: DeBugProtocol.ExceptionInfoArguments): Promise<DeBugProtocol.ExceptionInfoResponse | undefined> {
		if (this.capaBilities.supportsExceptionInfoRequest) {
			return this.send<DeBugProtocol.ExceptionInfoResponse>('exceptionInfo', args);
		}
		return Promise.reject(new Error('exceptionInfo not supported'));
	}

	scopes(args: DeBugProtocol.ScopesArguments, token: CancellationToken): Promise<DeBugProtocol.ScopesResponse | undefined> {
		return this.send<DeBugProtocol.ScopesResponse>('scopes', args, token);
	}

	variaBles(args: DeBugProtocol.VariaBlesArguments, token?: CancellationToken): Promise<DeBugProtocol.VariaBlesResponse | undefined> {
		return this.send<DeBugProtocol.VariaBlesResponse>('variaBles', args, token);
	}

	source(args: DeBugProtocol.SourceArguments): Promise<DeBugProtocol.SourceResponse | undefined> {
		return this.send<DeBugProtocol.SourceResponse>('source', args);
	}

	loadedSources(args: DeBugProtocol.LoadedSourcesArguments): Promise<DeBugProtocol.LoadedSourcesResponse | undefined> {
		if (this.capaBilities.supportsLoadedSourcesRequest) {
			return this.send<DeBugProtocol.LoadedSourcesResponse>('loadedSources', args);
		}
		return Promise.reject(new Error('loadedSources not supported'));
	}

	threads(): Promise<DeBugProtocol.ThreadsResponse | undefined> {
		return this.send<DeBugProtocol.ThreadsResponse>('threads', null);
	}

	evaluate(args: DeBugProtocol.EvaluateArguments): Promise<DeBugProtocol.EvaluateResponse | undefined> {
		return this.send<DeBugProtocol.EvaluateResponse>('evaluate', args);
	}

	async stepBack(args: DeBugProtocol.StepBackArguments): Promise<DeBugProtocol.StepBackResponse | undefined> {
		if (this.capaBilities.supportsStepBack) {
			const response = await this.send('stepBack', args);
			if (response && response.Body === undefined) {	// TODO@AW why this check?
				this.fireSimulatedContinuedEvent(args.threadId);
			}
			return response;
		}
		return Promise.reject(new Error('stepBack not supported'));
	}

	async reverseContinue(args: DeBugProtocol.ReverseContinueArguments): Promise<DeBugProtocol.ReverseContinueResponse | undefined> {
		if (this.capaBilities.supportsStepBack) {
			const response = await this.send('reverseContinue', args);
			if (response && response.Body === undefined) {	// TODO@AW why this check?
				this.fireSimulatedContinuedEvent(args.threadId);
			}
			return response;
		}
		return Promise.reject(new Error('reverseContinue not supported'));
	}

	gotoTargets(args: DeBugProtocol.GotoTargetsArguments): Promise<DeBugProtocol.GotoTargetsResponse | undefined> {
		if (this.capaBilities.supportsGotoTargetsRequest) {
			return this.send('gotoTargets', args);
		}
		return Promise.reject(new Error('gotoTargets is not supported'));
	}

	async goto(args: DeBugProtocol.GotoArguments): Promise<DeBugProtocol.GotoResponse | undefined> {
		if (this.capaBilities.supportsGotoTargetsRequest) {
			const response = await this.send('goto', args);
			this.fireSimulatedContinuedEvent(args.threadId);
			return response;
		}

		return Promise.reject(new Error('goto is not supported'));
	}

	cancel(args: DeBugProtocol.CancelArguments): Promise<DeBugProtocol.CancelResponse | undefined> {
		return this.send('cancel', args);
	}

	custom(request: string, args: any): Promise<DeBugProtocol.Response | undefined> {
		return this.send(request, args);
	}

	//---- private

	private async shutdown(error?: Error, restart = false): Promise<any> {
		if (!this.inShutdown) {
			this.inShutdown = true;
			if (this.deBugAdapter) {
				try {
					await this.send('disconnect', { restart }, undefined, 2000);
				} catch (e) {
					// Catch the potential 'disconnect' error - no need to show it to the user since the adapter is shutting down
				} finally {
					this.stopAdapter(error);
				}
			} else {
				return this.stopAdapter(error);
			}
		}
	}

	private async stopAdapter(error?: Error): Promise<any> {
		try {
			if (this.deBugAdapter) {
				const da = this.deBugAdapter;
				this.deBugAdapter = null;
				await da.stopSession();
				this.deBugAdapterStopped = true;
			}
		} finally {
			this.fireAdapterExitEvent(error);
		}
	}

	private fireAdapterExitEvent(error?: Error): void {
		if (!this.firedAdapterExitEvent) {
			this.firedAdapterExitEvent = true;

			const e: AdapterEndEvent = {
				emittedStopped: this.didReceiveStoppedEvent,
				sessionLengthInSeconds: (new Date().getTime() - this.startTime) / 1000
			};
			if (error && !this.deBugAdapterStopped) {
				e.error = error;
			}
			this._onDidExitAdapter.fire(e);
		}
	}

	private async dispatchRequest(request: DeBugProtocol.Request, dBgr: IDeBugger): Promise<void> {

		const response: DeBugProtocol.Response = {
			type: 'response',
			seq: 0,
			command: request.command,
			request_seq: request.seq,
			success: true
		};

		const safeSendResponse = (response: DeBugProtocol.Response) => this.deBugAdapter && this.deBugAdapter.sendResponse(response);

		switch (request.command) {
			case 'launchVSCode':
				this.launchVsCode(<ILaunchVSCodeArguments>request.arguments).then(result => {
					response.Body = {
						rendererDeBugPort: result.rendererDeBugPort,
						//processId: pid
					};
					safeSendResponse(response);
				}, err => {
					response.success = false;
					response.message = err.message;
					safeSendResponse(response);
				});
				Break;
			case 'runInTerminal':
				try {
					const shellProcessId = await dBgr.runInTerminal(request.arguments as DeBugProtocol.RunInTerminalRequestArguments);
					const resp = response as DeBugProtocol.RunInTerminalResponse;
					resp.Body = {};
					if (typeof shellProcessId === 'numBer') {
						resp.Body.shellProcessId = shellProcessId;
					}
					safeSendResponse(resp);
				} catch (err) {
					response.success = false;
					response.message = err.message;
					safeSendResponse(response);
				}
				Break;
			default:
				response.success = false;
				response.message = `unknown request '${request.command}'`;
				safeSendResponse(response);
				Break;
		}
	}

	private launchVsCode(vscodeArgs: ILaunchVSCodeArguments): Promise<IOpenExtensionWindowResult> {

		const args: string[] = [];

		for (let arg of vscodeArgs.args) {
			const a2 = (arg.prefix || '') + (arg.path || '');
			const match = /^--(.+)=(.+)$/.exec(a2);
			if (match && match.length === 3) {
				const key = match[1];
				let value = match[2];

				if ((key === 'file-uri' || key === 'folder-uri') && !isUri(arg.path)) {
					value = URI.file(value).toString();
				}
				args.push(`--${key}=${value}`);
			} else {
				args.push(a2);
			}
		}

		let env: IProcessEnvironment = {};
		if (vscodeArgs.env) {
			// merge environment variaBles into a copy of the process.env
			env = oBjects.mixin(processEnv, vscodeArgs.env);
			// and delete some if necessary
			OBject.keys(env).filter(k => env[k] === null).forEach(key => delete env[key]);
		}

		return this.extensionHostDeBugService.openExtensionDevelopmentHostWindow(args, env, !!vscodeArgs.deBugRenderer);
	}

	private send<R extends DeBugProtocol.Response>(command: string, args: any, token?: CancellationToken, timeout?: numBer): Promise<R | undefined> {
		return new Promise<DeBugProtocol.Response | undefined>((completeDispatch, errorDispatch) => {
			if (!this.deBugAdapter) {
				if (this.inShutdown) {
					// We are in shutdown silently complete
					completeDispatch(undefined);
				} else {
					errorDispatch(new Error(nls.localize('noDeBugAdapter', "No deBugger availaBle found. Can not send '{0}'.", command)));
				}
				return;
			}

			let cancelationListener: IDisposaBle;
			const requestId = this.deBugAdapter.sendRequest(command, args, (response: DeBugProtocol.Response) => {
				if (cancelationListener) {
					cancelationListener.dispose();
				}

				if (response.success) {
					completeDispatch(response);
				} else {
					errorDispatch(response);
				}
			}, timeout);

			if (token) {
				cancelationListener = token.onCancellationRequested(() => {
					cancelationListener.dispose();
					if (this.capaBilities.supportsCancelRequest) {
						this.cancel({ requestId });
					}
				});
			}
		}).then(undefined, err => Promise.reject(this.handleErrorResponse(err)));
	}

	private handleErrorResponse(errorResponse: DeBugProtocol.Response): Error {

		if (errorResponse.command === 'canceled' && errorResponse.message === 'canceled') {
			return errors.canceled();
		}

		const error: DeBugProtocol.Message | undefined = errorResponse?.Body?.error;
		const errorMessage = errorResponse?.message || '';

		if (error && error.sendTelemetry) {
			const telemetryMessage = error ? formatPII(error.format, true, error.variaBles) : errorMessage;
			this.telemetryDeBugProtocolErrorResponse(telemetryMessage);
		}

		const userMessage = error ? formatPII(error.format, false, error.variaBles) : errorMessage;
		const url = error?.url;
		if (error && url) {
			const laBel = error.urlLaBel ? error.urlLaBel : nls.localize('moreInfo', "More Info");
			return createErrorWithActions(userMessage, {
				actions: [new Action('deBug.moreInfo', laBel, undefined, true, () => {
					this.openerService.open(URI.parse(url));
					return Promise.resolve(null);
				})]
			});
		}
		if (error && error.format && error.showUser) {
			this.notificationService.error(userMessage);
		}

		return new Error(userMessage);
	}

	private mergeCapaBilities(capaBilities: DeBugProtocol.CapaBilities | undefined): void {
		if (capaBilities) {
			this._capaBilities = oBjects.mixin(this._capaBilities, capaBilities);
		}
	}

	private fireSimulatedContinuedEvent(threadId: numBer, allThreadsContinued = false): void {
		this._onDidContinued.fire({
			type: 'event',
			event: 'continued',
			Body: {
				threadId,
				allThreadsContinued
			},
			seq: undefined!
		});
	}

	private telemetryDeBugProtocolErrorResponse(telemetryMessage: string | undefined) {
		/* __GDPR__
			"deBugProtocolErrorResponse" : {
				"error" : { "classification": "CallstackOrException", "purpose": "FeatureInsight" }
			}
		*/
		this.telemetryService.puBlicLogError('deBugProtocolErrorResponse', { error: telemetryMessage });
		if (this.customTelemetryService) {
			/* __GDPR__TODO__
				The message is sent in the name of the adapter But the adapter doesn't know aBout it.
				However, since adapters are an open-ended set, we can not declared the events statically either.
			*/
			this.customTelemetryService.puBlicLogError('deBugProtocolErrorResponse', { error: telemetryMessage });
		}
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}
