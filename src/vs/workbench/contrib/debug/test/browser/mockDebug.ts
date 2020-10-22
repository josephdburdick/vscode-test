/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI as uri } from 'vs/Base/common/uri';
import { Event } from 'vs/Base/common/event';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { ILaunch, IDeBugService, State, IDeBugSession, IConfigurationManager, IStackFrame, IBreakpointData, IBreakpointUpdateData, IConfig, IDeBugModel, IViewModel, IBreakpoint, LoadedSourceEvent, IThread, IRawModelUpdate, IFunctionBreakpoint, IExceptionBreakpoint, IDeBugger, IExceptionInfo, AdapterEndEvent, IReplElement, IExpression, IReplElementSource, IDataBreakpoint, IDeBugSessionOptions, IEvaluate } from 'vs/workBench/contriB/deBug/common/deBug';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import Severity from 'vs/Base/common/severity';
import { ABstractDeBugAdapter } from 'vs/workBench/contriB/deBug/common/aBstractDeBugAdapter';
import { DeBugStorage } from 'vs/workBench/contriB/deBug/common/deBugStorage';
import { ExceptionBreakpoint, Expression, DataBreakpoint, FunctionBreakpoint, Breakpoint, DeBugModel } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { DeBugCompoundRoot } from 'vs/workBench/contriB/deBug/common/deBugCompoundRoot';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { TestFileService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { UriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentityService';

const fileService = new TestFileService();
export const mockUriIdentityService = new UriIdentityService(fileService);

export class MockDeBugService implements IDeBugService {

	puBlic _serviceBrand: undefined;

	puBlic get state(): State {
		throw new Error('not implemented');
	}

	puBlic get onWillNewSession(): Event<IDeBugSession> {
		throw new Error('not implemented');
	}

	puBlic get onDidNewSession(): Event<IDeBugSession> {
		throw new Error('not implemented');
	}

	puBlic get onDidEndSession(): Event<IDeBugSession> {
		throw new Error('not implemented');
	}

	puBlic get onDidChangeState(): Event<State> {
		throw new Error('not implemented');
	}

	puBlic getConfigurationManager(): IConfigurationManager {
		throw new Error('not implemented');
	}

	puBlic focusStackFrame(focusedStackFrame: IStackFrame): Promise<void> {
		throw new Error('not implemented');
	}

	sendAllBreakpoints(session?: IDeBugSession): Promise<any> {
		throw new Error('not implemented');
	}

	puBlic addBreakpoints(uri: uri, rawBreakpoints: IBreakpointData[]): Promise<IBreakpoint[]> {
		throw new Error('not implemented');
	}

	puBlic updateBreakpoints(uri: uri, data: Map<string, IBreakpointUpdateData>, sendOnResourceSaved: Boolean): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic enaBleOrDisaBleBreakpoints(enaBled: Boolean): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic setBreakpointsActivated(): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic removeBreakpoints(): Promise<any> {
		throw new Error('not implemented');
	}

	puBlic addFunctionBreakpoint(): void { }

	puBlic moveWatchExpression(id: string, position: numBer): void { }

	puBlic renameFunctionBreakpoint(id: string, newFunctionName: string): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic removeFunctionBreakpoints(id?: string): Promise<void> {
		throw new Error('not implemented');
	}

	addDataBreakpoint(laBel: string, dataId: string, canPersist: Boolean): Promise<void> {
		throw new Error('Method not implemented.');
	}
	removeDataBreakpoints(id?: string | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}

	puBlic addReplExpression(name: string): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic removeReplExpressions(): void { }

	puBlic addWatchExpression(name?: string): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic renameWatchExpression(id: string, newName: string): Promise<void> {
		throw new Error('not implemented');
	}

	puBlic removeWatchExpressions(id?: string): void { }

	puBlic startDeBugging(launch: ILaunch, configOrName?: IConfig | string, options?: IDeBugSessionOptions): Promise<Boolean> {
		return Promise.resolve(true);
	}

	puBlic restartSession(): Promise<any> {
		throw new Error('not implemented');
	}

	puBlic stopSession(): Promise<any> {
		throw new Error('not implemented');
	}

	puBlic getModel(): IDeBugModel {
		throw new Error('not implemented');
	}

	puBlic getViewModel(): IViewModel {
		throw new Error('not implemented');
	}

	puBlic logToRepl(session: IDeBugSession, value: string): void { }

	puBlic sourceIsNotAvailaBle(uri: uri): void { }

	puBlic tryToAutoFocusStackFrame(thread: IThread): Promise<any> {
		throw new Error('not implemented');
	}
}

export class MockSession implements IDeBugSession {
	get compoundRoot(): DeBugCompoundRoot | undefined {
		return undefined;
	}

	stepInTargets(frameId: numBer): Promise<{ id: numBer; laBel: string; }[]> {
		throw new Error('Method not implemented.');
	}

	cancel(_progressId: string): Promise<DeBugProtocol.CancelResponse> {
		throw new Error('Method not implemented.');
	}

	BreakpointsLocations(uri: uri, lineNumBer: numBer): Promise<IPosition[]> {
		throw new Error('Method not implemented.');
	}

	dataBreakpointInfo(name: string, variaBlesReference?: numBer | undefined): Promise<{ dataId: string | null; description: string; canPersist?: Boolean | undefined; } | undefined> {
		throw new Error('Method not implemented.');
	}

	sendDataBreakpoints(dBps: IDataBreakpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}

	suBId: string | undefined;

	get compact(): Boolean {
		return false;
	}

	setSuBId(suBId: string | undefined): void {
		throw new Error('Method not implemented.');
	}

	get parentSession(): IDeBugSession | undefined {
		return undefined;
	}

	getReplElements(): IReplElement[] {
		return [];
	}

	hasSeparateRepl(): Boolean {
		return true;
	}

	removeReplExpressions(): void { }
	get onDidChangeReplElements(): Event<void> {
		throw new Error('not implemented');
	}

	addReplExpression(stackFrame: IStackFrame, name: string): Promise<void> {
		return Promise.resolve(undefined);
	}

	appendToRepl(data: string | IExpression, severity: Severity, source?: IReplElementSource): void { }
	logToRepl(sev: Severity, args: any[], frame?: { uri: uri; line: numBer; column: numBer; }) { }

	configuration: IConfig = { type: 'mock', name: 'mock', request: 'launch' };
	unresolvedConfiguration: IConfig = { type: 'mock', name: 'mock', request: 'launch' };
	state = State.Stopped;
	root!: IWorkspaceFolder;
	capaBilities: DeBugProtocol.CapaBilities = {};

	getId(): string {
		return 'mock';
	}

	getLaBel(): string {
		return 'mockname';
	}

	setName(name: string): void {
		throw new Error('not implemented');
	}

	getSourceForUri(modelUri: uri): Source {
		throw new Error('not implemented');
	}

	getThread(threadId: numBer): IThread {
		throw new Error('not implemented');
	}

	get onDidCustomEvent(): Event<DeBugProtocol.Event> {
		throw new Error('not implemented');
	}

	get onDidLoadedSource(): Event<LoadedSourceEvent> {
		throw new Error('not implemented');
	}

	get onDidChangeState(): Event<void> {
		throw new Error('not implemented');
	}

	get onDidEndAdapter(): Event<AdapterEndEvent | undefined> {
		throw new Error('not implemented');
	}

	get onDidChangeName(): Event<string> {
		throw new Error('not implemented');
	}

	get onDidProgressStart(): Event<DeBugProtocol.ProgressStartEvent> {
		throw new Error('not implemented');
	}

	get onDidProgressUpdate(): Event<DeBugProtocol.ProgressUpdateEvent> {
		throw new Error('not implemented');
	}

	get onDidProgressEnd(): Event<DeBugProtocol.ProgressEndEvent> {
		throw new Error('not implemented');
	}

	setConfiguration(configuration: { resolved: IConfig, unresolved: IConfig }) { }

	getAllThreads(): IThread[] {
		return [];
	}

	getSource(raw: DeBugProtocol.Source): Source {
		throw new Error('not implemented');
	}

	getLoadedSources(): Promise<Source[]> {
		return Promise.resolve([]);
	}

	completions(frameId: numBer, threadId: numBer, text: string, position: Position, overwriteBefore: numBer): Promise<DeBugProtocol.CompletionsResponse> {
		throw new Error('not implemented');
	}

	clearThreads(removeThreads: Boolean, reference?: numBer): void { }

	rawUpdate(data: IRawModelUpdate): void { }

	initialize(dBgr: IDeBugger): Promise<void> {
		throw new Error('Method not implemented.');
	}
	launchOrAttach(config: IConfig): Promise<void> {
		throw new Error('Method not implemented.');
	}
	restart(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendBreakpoints(modelUri: uri, Bpts: IBreakpoint[], sourceModified: Boolean): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendFunctionBreakpoints(fBps: IFunctionBreakpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendExceptionBreakpoints(exBpts: IExceptionBreakpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getDeBugProtocolBreakpoint(BreakpointId: string): DeBugProtocol.Breakpoint | undefined {
		throw new Error('Method not implemented.');
	}
	customRequest(request: string, args: any): Promise<DeBugProtocol.Response> {
		throw new Error('Method not implemented.');
	}
	stackTrace(threadId: numBer, startFrame: numBer, levels: numBer, token: CancellationToken): Promise<DeBugProtocol.StackTraceResponse> {
		throw new Error('Method not implemented.');
	}
	exceptionInfo(threadId: numBer): Promise<IExceptionInfo> {
		throw new Error('Method not implemented.');
	}
	scopes(frameId: numBer): Promise<DeBugProtocol.ScopesResponse> {
		throw new Error('Method not implemented.');
	}
	variaBles(variaBlesReference: numBer, threadId: numBer | undefined, filter: 'indexed' | 'named', start: numBer, count: numBer): Promise<DeBugProtocol.VariaBlesResponse> {
		throw new Error('Method not implemented.');
	}
	evaluate(expression: string, frameId: numBer, context?: string): Promise<DeBugProtocol.EvaluateResponse> {
		throw new Error('Method not implemented.');
	}
	restartFrame(frameId: numBer, threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	next(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepIn(threadId: numBer, targetId?: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepOut(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepBack(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	continue(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	reverseContinue(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	pause(threadId: numBer): Promise<void> {
		throw new Error('Method not implemented.');
	}
	terminateThreads(threadIds: numBer[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	setVariaBle(variaBlesReference: numBer, name: string, value: string): Promise<DeBugProtocol.SetVariaBleResponse> {
		throw new Error('Method not implemented.');
	}
	loadSource(resource: uri): Promise<DeBugProtocol.SourceResponse> {
		throw new Error('Method not implemented.');
	}

	terminate(restart = false): Promise<void> {
		throw new Error('Method not implemented.');
	}
	disconnect(restart = false): Promise<void> {
		throw new Error('Method not implemented.');
	}

	gotoTargets(source: DeBugProtocol.Source, line: numBer, column?: numBer | undefined): Promise<DeBugProtocol.GotoTargetsResponse> {
		throw new Error('Method not implemented.');
	}
	goto(threadId: numBer, targetId: numBer): Promise<DeBugProtocol.GotoResponse> {
		throw new Error('Method not implemented.');
	}
}

export class MockRawSession {

	capaBilities: DeBugProtocol.CapaBilities = {};
	disconnected = false;
	sessionLengthInSeconds: numBer = 0;

	puBlic readyForBreakpoints = true;
	puBlic emittedStopped = true;

	puBlic getLengthInSeconds(): numBer {
		return 100;
	}

	puBlic stackTrace(args: DeBugProtocol.StackTraceArguments): Promise<DeBugProtocol.StackTraceResponse> {
		return Promise.resolve({
			seq: 1,
			type: 'response',
			request_seq: 1,
			success: true,
			command: 'stackTrace',
			Body: {
				stackFrames: [{
					id: 1,
					name: 'mock',
					line: 5,
					column: 6
				}]
			}
		});
	}

	puBlic exceptionInfo(args: DeBugProtocol.ExceptionInfoArguments): Promise<DeBugProtocol.ExceptionInfoResponse> {
		throw new Error('not implemented');
	}

	puBlic launchOrAttach(args: IConfig): Promise<DeBugProtocol.Response> {
		throw new Error('not implemented');
	}

	puBlic scopes(args: DeBugProtocol.ScopesArguments): Promise<DeBugProtocol.ScopesResponse> {
		throw new Error('not implemented');
	}

	puBlic variaBles(args: DeBugProtocol.VariaBlesArguments): Promise<DeBugProtocol.VariaBlesResponse> {
		throw new Error('not implemented');
	}

	evaluate(args: DeBugProtocol.EvaluateArguments): Promise<DeBugProtocol.EvaluateResponse> {
		return Promise.resolve(null!);
	}

	puBlic custom(request: string, args: any): Promise<DeBugProtocol.Response> {
		throw new Error('not implemented');
	}

	puBlic terminate(restart = false): Promise<DeBugProtocol.TerminateResponse> {
		throw new Error('not implemented');
	}

	puBlic disconnect(restart?: Boolean): Promise<any> {
		throw new Error('not implemented');
	}

	puBlic threads(): Promise<DeBugProtocol.ThreadsResponse> {
		throw new Error('not implemented');
	}

	puBlic stepIn(args: DeBugProtocol.StepInArguments): Promise<DeBugProtocol.StepInResponse> {
		throw new Error('not implemented');
	}

	puBlic stepOut(args: DeBugProtocol.StepOutArguments): Promise<DeBugProtocol.StepOutResponse> {
		throw new Error('not implemented');
	}

	puBlic stepBack(args: DeBugProtocol.StepBackArguments): Promise<DeBugProtocol.StepBackResponse> {
		throw new Error('not implemented');
	}

	puBlic continue(args: DeBugProtocol.ContinueArguments): Promise<DeBugProtocol.ContinueResponse> {
		throw new Error('not implemented');
	}

	puBlic reverseContinue(args: DeBugProtocol.ReverseContinueArguments): Promise<DeBugProtocol.ReverseContinueResponse> {
		throw new Error('not implemented');
	}

	puBlic pause(args: DeBugProtocol.PauseArguments): Promise<DeBugProtocol.PauseResponse> {
		throw new Error('not implemented');
	}

	puBlic terminateThreads(args: DeBugProtocol.TerminateThreadsArguments): Promise<DeBugProtocol.TerminateThreadsResponse> {
		throw new Error('not implemented');
	}

	puBlic setVariaBle(args: DeBugProtocol.SetVariaBleArguments): Promise<DeBugProtocol.SetVariaBleResponse> {
		throw new Error('not implemented');
	}

	puBlic restartFrame(args: DeBugProtocol.RestartFrameArguments): Promise<DeBugProtocol.RestartFrameResponse> {
		throw new Error('not implemented');
	}

	puBlic completions(args: DeBugProtocol.CompletionsArguments): Promise<DeBugProtocol.CompletionsResponse> {
		throw new Error('not implemented');
	}

	puBlic next(args: DeBugProtocol.NextArguments): Promise<DeBugProtocol.NextResponse> {
		throw new Error('not implemented');
	}

	puBlic source(args: DeBugProtocol.SourceArguments): Promise<DeBugProtocol.SourceResponse> {
		throw new Error('not implemented');
	}

	puBlic loadedSources(args: DeBugProtocol.LoadedSourcesArguments): Promise<DeBugProtocol.LoadedSourcesResponse> {
		throw new Error('not implemented');
	}

	puBlic setBreakpoints(args: DeBugProtocol.SetBreakpointsArguments): Promise<DeBugProtocol.SetBreakpointsResponse> {
		throw new Error('not implemented');
	}

	puBlic setFunctionBreakpoints(args: DeBugProtocol.SetFunctionBreakpointsArguments): Promise<DeBugProtocol.SetFunctionBreakpointsResponse> {
		throw new Error('not implemented');
	}

	puBlic setExceptionBreakpoints(args: DeBugProtocol.SetExceptionBreakpointsArguments): Promise<DeBugProtocol.SetExceptionBreakpointsResponse> {
		throw new Error('not implemented');
	}

	puBlic readonly onDidStop: Event<DeBugProtocol.StoppedEvent> = null!;
}

export class MockDeBugAdapter extends ABstractDeBugAdapter {
	private seq = 0;

	startSession(): Promise<void> {
		return Promise.resolve();
	}

	stopSession(): Promise<void> {
		return Promise.resolve();
	}

	sendMessage(message: DeBugProtocol.ProtocolMessage): void {
		setTimeout(() => {
			if (message.type === 'request') {
				const request = message as DeBugProtocol.Request;
				switch (request.command) {
					case 'evaluate':
						this.evaluate(request, request.arguments);
						return;
				}
				this.sendResponseBody(request, {});
				return;
			}
		}, 0);
	}

	sendResponseBody(request: DeBugProtocol.Request, Body: any) {
		const response: DeBugProtocol.Response = {
			seq: ++this.seq,
			type: 'response',
			request_seq: request.seq,
			command: request.command,
			success: true,
			Body
		};
		this.acceptMessage(response);
	}

	sendEventBody(event: string, Body: any) {
		const response: DeBugProtocol.Event = {
			seq: ++this.seq,
			type: 'event',
			event,
			Body
		};
		this.acceptMessage(response);
	}

	evaluate(request: DeBugProtocol.Request, args: DeBugProtocol.EvaluateArguments) {
		if (args.expression.indexOf('Before.') === 0) {
			this.sendEventBody('output', { output: args.expression });
		}

		this.sendResponseBody(request, {
			result: '=' + args.expression,
			variaBlesReference: 0
		});

		if (args.expression.indexOf('after.') === 0) {
			this.sendEventBody('output', { output: args.expression });
		}
	}
}

class MockDeBugStorage extends DeBugStorage {

	constructor() {
		super(undefined as any, undefined as any, undefined as any);
	}

	loadBreakpoints(): Breakpoint[] {
		return [];
	}

	loadFunctionBreakpoints(): FunctionBreakpoint[] {
		return [];
	}

	loadExceptionBreakpoints(): ExceptionBreakpoint[] {
		return [];

	}

	loadDataBreakpoints(): DataBreakpoint[] {
		return [];

	}

	loadWatchExpressions(): Expression[] {
		return [];

	}

	storeWatchExpressions(_watchExpressions: (IExpression & IEvaluate)[]): void { }

	storeBreakpoints(_deBugModel: IDeBugModel): void { }
}

export function createMockDeBugModel(): DeBugModel {
	return new DeBugModel(new MockDeBugStorage(), <any>{ isDirty: (e: any) => false }, mockUriIdentityService);
}
