/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI As uri } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { ILAunch, IDebugService, StAte, IDebugSession, IConfigurAtionMAnAger, IStAckFrAme, IBreAkpointDAtA, IBreAkpointUpdAteDAtA, IConfig, IDebugModel, IViewModel, IBreAkpoint, LoAdedSourceEvent, IThreAd, IRAwModelUpdAte, IFunctionBreAkpoint, IExceptionBreAkpoint, IDebugger, IExceptionInfo, AdApterEndEvent, IReplElement, IExpression, IReplElementSource, IDAtABreAkpoint, IDebugSessionOptions, IEvAluAte } from 'vs/workbench/contrib/debug/common/debug';
import { Source } from 'vs/workbench/contrib/debug/common/debugSource';
import Severity from 'vs/bAse/common/severity';
import { AbstrActDebugAdApter } from 'vs/workbench/contrib/debug/common/AbstrActDebugAdApter';
import { DebugStorAge } from 'vs/workbench/contrib/debug/common/debugStorAge';
import { ExceptionBreAkpoint, Expression, DAtABreAkpoint, FunctionBreAkpoint, BreAkpoint, DebugModel } from 'vs/workbench/contrib/debug/common/debugModel';
import { DebugCompoundRoot } from 'vs/workbench/contrib/debug/common/debugCompoundRoot';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { TestFileService } from 'vs/workbench/test/browser/workbenchTestServices';
import { UriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentityService';

const fileService = new TestFileService();
export const mockUriIdentityService = new UriIdentityService(fileService);

export clAss MockDebugService implements IDebugService {

	public _serviceBrAnd: undefined;

	public get stAte(): StAte {
		throw new Error('not implemented');
	}

	public get onWillNewSession(): Event<IDebugSession> {
		throw new Error('not implemented');
	}

	public get onDidNewSession(): Event<IDebugSession> {
		throw new Error('not implemented');
	}

	public get onDidEndSession(): Event<IDebugSession> {
		throw new Error('not implemented');
	}

	public get onDidChAngeStAte(): Event<StAte> {
		throw new Error('not implemented');
	}

	public getConfigurAtionMAnAger(): IConfigurAtionMAnAger {
		throw new Error('not implemented');
	}

	public focusStAckFrAme(focusedStAckFrAme: IStAckFrAme): Promise<void> {
		throw new Error('not implemented');
	}

	sendAllBreAkpoints(session?: IDebugSession): Promise<Any> {
		throw new Error('not implemented');
	}

	public AddBreAkpoints(uri: uri, rAwBreAkpoints: IBreAkpointDAtA[]): Promise<IBreAkpoint[]> {
		throw new Error('not implemented');
	}

	public updAteBreAkpoints(uri: uri, dAtA: MAp<string, IBreAkpointUpdAteDAtA>, sendOnResourceSAved: booleAn): Promise<void> {
		throw new Error('not implemented');
	}

	public enAbleOrDisAbleBreAkpoints(enAbled: booleAn): Promise<void> {
		throw new Error('not implemented');
	}

	public setBreAkpointsActivAted(): Promise<void> {
		throw new Error('not implemented');
	}

	public removeBreAkpoints(): Promise<Any> {
		throw new Error('not implemented');
	}

	public AddFunctionBreAkpoint(): void { }

	public moveWAtchExpression(id: string, position: number): void { }

	public renAmeFunctionBreAkpoint(id: string, newFunctionNAme: string): Promise<void> {
		throw new Error('not implemented');
	}

	public removeFunctionBreAkpoints(id?: string): Promise<void> {
		throw new Error('not implemented');
	}

	AddDAtABreAkpoint(lAbel: string, dAtAId: string, cAnPersist: booleAn): Promise<void> {
		throw new Error('Method not implemented.');
	}
	removeDAtABreAkpoints(id?: string | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}

	public AddReplExpression(nAme: string): Promise<void> {
		throw new Error('not implemented');
	}

	public removeReplExpressions(): void { }

	public AddWAtchExpression(nAme?: string): Promise<void> {
		throw new Error('not implemented');
	}

	public renAmeWAtchExpression(id: string, newNAme: string): Promise<void> {
		throw new Error('not implemented');
	}

	public removeWAtchExpressions(id?: string): void { }

	public stArtDebugging(lAunch: ILAunch, configOrNAme?: IConfig | string, options?: IDebugSessionOptions): Promise<booleAn> {
		return Promise.resolve(true);
	}

	public restArtSession(): Promise<Any> {
		throw new Error('not implemented');
	}

	public stopSession(): Promise<Any> {
		throw new Error('not implemented');
	}

	public getModel(): IDebugModel {
		throw new Error('not implemented');
	}

	public getViewModel(): IViewModel {
		throw new Error('not implemented');
	}

	public logToRepl(session: IDebugSession, vAlue: string): void { }

	public sourceIsNotAvAilAble(uri: uri): void { }

	public tryToAutoFocusStAckFrAme(threAd: IThreAd): Promise<Any> {
		throw new Error('not implemented');
	}
}

export clAss MockSession implements IDebugSession {
	get compoundRoot(): DebugCompoundRoot | undefined {
		return undefined;
	}

	stepInTArgets(frAmeId: number): Promise<{ id: number; lAbel: string; }[]> {
		throw new Error('Method not implemented.');
	}

	cAncel(_progressId: string): Promise<DebugProtocol.CAncelResponse> {
		throw new Error('Method not implemented.');
	}

	breAkpointsLocAtions(uri: uri, lineNumber: number): Promise<IPosition[]> {
		throw new Error('Method not implemented.');
	}

	dAtABreAkpointInfo(nAme: string, vAriAblesReference?: number | undefined): Promise<{ dAtAId: string | null; description: string; cAnPersist?: booleAn | undefined; } | undefined> {
		throw new Error('Method not implemented.');
	}

	sendDAtABreAkpoints(dbps: IDAtABreAkpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}

	subId: string | undefined;

	get compAct(): booleAn {
		return fAlse;
	}

	setSubId(subId: string | undefined): void {
		throw new Error('Method not implemented.');
	}

	get pArentSession(): IDebugSession | undefined {
		return undefined;
	}

	getReplElements(): IReplElement[] {
		return [];
	}

	hAsSepArAteRepl(): booleAn {
		return true;
	}

	removeReplExpressions(): void { }
	get onDidChAngeReplElements(): Event<void> {
		throw new Error('not implemented');
	}

	AddReplExpression(stAckFrAme: IStAckFrAme, nAme: string): Promise<void> {
		return Promise.resolve(undefined);
	}

	AppendToRepl(dAtA: string | IExpression, severity: Severity, source?: IReplElementSource): void { }
	logToRepl(sev: Severity, Args: Any[], frAme?: { uri: uri; line: number; column: number; }) { }

	configurAtion: IConfig = { type: 'mock', nAme: 'mock', request: 'lAunch' };
	unresolvedConfigurAtion: IConfig = { type: 'mock', nAme: 'mock', request: 'lAunch' };
	stAte = StAte.Stopped;
	root!: IWorkspAceFolder;
	cApAbilities: DebugProtocol.CApAbilities = {};

	getId(): string {
		return 'mock';
	}

	getLAbel(): string {
		return 'mocknAme';
	}

	setNAme(nAme: string): void {
		throw new Error('not implemented');
	}

	getSourceForUri(modelUri: uri): Source {
		throw new Error('not implemented');
	}

	getThreAd(threAdId: number): IThreAd {
		throw new Error('not implemented');
	}

	get onDidCustomEvent(): Event<DebugProtocol.Event> {
		throw new Error('not implemented');
	}

	get onDidLoAdedSource(): Event<LoAdedSourceEvent> {
		throw new Error('not implemented');
	}

	get onDidChAngeStAte(): Event<void> {
		throw new Error('not implemented');
	}

	get onDidEndAdApter(): Event<AdApterEndEvent | undefined> {
		throw new Error('not implemented');
	}

	get onDidChAngeNAme(): Event<string> {
		throw new Error('not implemented');
	}

	get onDidProgressStArt(): Event<DebugProtocol.ProgressStArtEvent> {
		throw new Error('not implemented');
	}

	get onDidProgressUpdAte(): Event<DebugProtocol.ProgressUpdAteEvent> {
		throw new Error('not implemented');
	}

	get onDidProgressEnd(): Event<DebugProtocol.ProgressEndEvent> {
		throw new Error('not implemented');
	}

	setConfigurAtion(configurAtion: { resolved: IConfig, unresolved: IConfig }) { }

	getAllThreAds(): IThreAd[] {
		return [];
	}

	getSource(rAw: DebugProtocol.Source): Source {
		throw new Error('not implemented');
	}

	getLoAdedSources(): Promise<Source[]> {
		return Promise.resolve([]);
	}

	completions(frAmeId: number, threAdId: number, text: string, position: Position, overwriteBefore: number): Promise<DebugProtocol.CompletionsResponse> {
		throw new Error('not implemented');
	}

	cleArThreAds(removeThreAds: booleAn, reference?: number): void { }

	rAwUpdAte(dAtA: IRAwModelUpdAte): void { }

	initiAlize(dbgr: IDebugger): Promise<void> {
		throw new Error('Method not implemented.');
	}
	lAunchOrAttAch(config: IConfig): Promise<void> {
		throw new Error('Method not implemented.');
	}
	restArt(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendBreAkpoints(modelUri: uri, bpts: IBreAkpoint[], sourceModified: booleAn): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendFunctionBreAkpoints(fbps: IFunctionBreAkpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	sendExceptionBreAkpoints(exbpts: IExceptionBreAkpoint[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getDebugProtocolBreAkpoint(breAkpointId: string): DebugProtocol.BreAkpoint | undefined {
		throw new Error('Method not implemented.');
	}
	customRequest(request: string, Args: Any): Promise<DebugProtocol.Response> {
		throw new Error('Method not implemented.');
	}
	stAckTrAce(threAdId: number, stArtFrAme: number, levels: number, token: CAncellAtionToken): Promise<DebugProtocol.StAckTrAceResponse> {
		throw new Error('Method not implemented.');
	}
	exceptionInfo(threAdId: number): Promise<IExceptionInfo> {
		throw new Error('Method not implemented.');
	}
	scopes(frAmeId: number): Promise<DebugProtocol.ScopesResponse> {
		throw new Error('Method not implemented.');
	}
	vAriAbles(vAriAblesReference: number, threAdId: number | undefined, filter: 'indexed' | 'nAmed', stArt: number, count: number): Promise<DebugProtocol.VAriAblesResponse> {
		throw new Error('Method not implemented.');
	}
	evAluAte(expression: string, frAmeId: number, context?: string): Promise<DebugProtocol.EvAluAteResponse> {
		throw new Error('Method not implemented.');
	}
	restArtFrAme(frAmeId: number, threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	next(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepIn(threAdId: number, tArgetId?: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepOut(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	stepBAck(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	continue(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	reverseContinue(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	pAuse(threAdId: number): Promise<void> {
		throw new Error('Method not implemented.');
	}
	terminAteThreAds(threAdIds: number[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	setVAriAble(vAriAblesReference: number, nAme: string, vAlue: string): Promise<DebugProtocol.SetVAriAbleResponse> {
		throw new Error('Method not implemented.');
	}
	loAdSource(resource: uri): Promise<DebugProtocol.SourceResponse> {
		throw new Error('Method not implemented.');
	}

	terminAte(restArt = fAlse): Promise<void> {
		throw new Error('Method not implemented.');
	}
	disconnect(restArt = fAlse): Promise<void> {
		throw new Error('Method not implemented.');
	}

	gotoTArgets(source: DebugProtocol.Source, line: number, column?: number | undefined): Promise<DebugProtocol.GotoTArgetsResponse> {
		throw new Error('Method not implemented.');
	}
	goto(threAdId: number, tArgetId: number): Promise<DebugProtocol.GotoResponse> {
		throw new Error('Method not implemented.');
	}
}

export clAss MockRAwSession {

	cApAbilities: DebugProtocol.CApAbilities = {};
	disconnected = fAlse;
	sessionLengthInSeconds: number = 0;

	public reAdyForBreAkpoints = true;
	public emittedStopped = true;

	public getLengthInSeconds(): number {
		return 100;
	}

	public stAckTrAce(Args: DebugProtocol.StAckTrAceArguments): Promise<DebugProtocol.StAckTrAceResponse> {
		return Promise.resolve({
			seq: 1,
			type: 'response',
			request_seq: 1,
			success: true,
			commAnd: 'stAckTrAce',
			body: {
				stAckFrAmes: [{
					id: 1,
					nAme: 'mock',
					line: 5,
					column: 6
				}]
			}
		});
	}

	public exceptionInfo(Args: DebugProtocol.ExceptionInfoArguments): Promise<DebugProtocol.ExceptionInfoResponse> {
		throw new Error('not implemented');
	}

	public lAunchOrAttAch(Args: IConfig): Promise<DebugProtocol.Response> {
		throw new Error('not implemented');
	}

	public scopes(Args: DebugProtocol.ScopesArguments): Promise<DebugProtocol.ScopesResponse> {
		throw new Error('not implemented');
	}

	public vAriAbles(Args: DebugProtocol.VAriAblesArguments): Promise<DebugProtocol.VAriAblesResponse> {
		throw new Error('not implemented');
	}

	evAluAte(Args: DebugProtocol.EvAluAteArguments): Promise<DebugProtocol.EvAluAteResponse> {
		return Promise.resolve(null!);
	}

	public custom(request: string, Args: Any): Promise<DebugProtocol.Response> {
		throw new Error('not implemented');
	}

	public terminAte(restArt = fAlse): Promise<DebugProtocol.TerminAteResponse> {
		throw new Error('not implemented');
	}

	public disconnect(restArt?: booleAn): Promise<Any> {
		throw new Error('not implemented');
	}

	public threAds(): Promise<DebugProtocol.ThreAdsResponse> {
		throw new Error('not implemented');
	}

	public stepIn(Args: DebugProtocol.StepInArguments): Promise<DebugProtocol.StepInResponse> {
		throw new Error('not implemented');
	}

	public stepOut(Args: DebugProtocol.StepOutArguments): Promise<DebugProtocol.StepOutResponse> {
		throw new Error('not implemented');
	}

	public stepBAck(Args: DebugProtocol.StepBAckArguments): Promise<DebugProtocol.StepBAckResponse> {
		throw new Error('not implemented');
	}

	public continue(Args: DebugProtocol.ContinueArguments): Promise<DebugProtocol.ContinueResponse> {
		throw new Error('not implemented');
	}

	public reverseContinue(Args: DebugProtocol.ReverseContinueArguments): Promise<DebugProtocol.ReverseContinueResponse> {
		throw new Error('not implemented');
	}

	public pAuse(Args: DebugProtocol.PAuseArguments): Promise<DebugProtocol.PAuseResponse> {
		throw new Error('not implemented');
	}

	public terminAteThreAds(Args: DebugProtocol.TerminAteThreAdsArguments): Promise<DebugProtocol.TerminAteThreAdsResponse> {
		throw new Error('not implemented');
	}

	public setVAriAble(Args: DebugProtocol.SetVAriAbleArguments): Promise<DebugProtocol.SetVAriAbleResponse> {
		throw new Error('not implemented');
	}

	public restArtFrAme(Args: DebugProtocol.RestArtFrAmeArguments): Promise<DebugProtocol.RestArtFrAmeResponse> {
		throw new Error('not implemented');
	}

	public completions(Args: DebugProtocol.CompletionsArguments): Promise<DebugProtocol.CompletionsResponse> {
		throw new Error('not implemented');
	}

	public next(Args: DebugProtocol.NextArguments): Promise<DebugProtocol.NextResponse> {
		throw new Error('not implemented');
	}

	public source(Args: DebugProtocol.SourceArguments): Promise<DebugProtocol.SourceResponse> {
		throw new Error('not implemented');
	}

	public loAdedSources(Args: DebugProtocol.LoAdedSourcesArguments): Promise<DebugProtocol.LoAdedSourcesResponse> {
		throw new Error('not implemented');
	}

	public setBreAkpoints(Args: DebugProtocol.SetBreAkpointsArguments): Promise<DebugProtocol.SetBreAkpointsResponse> {
		throw new Error('not implemented');
	}

	public setFunctionBreAkpoints(Args: DebugProtocol.SetFunctionBreAkpointsArguments): Promise<DebugProtocol.SetFunctionBreAkpointsResponse> {
		throw new Error('not implemented');
	}

	public setExceptionBreAkpoints(Args: DebugProtocol.SetExceptionBreAkpointsArguments): Promise<DebugProtocol.SetExceptionBreAkpointsResponse> {
		throw new Error('not implemented');
	}

	public reAdonly onDidStop: Event<DebugProtocol.StoppedEvent> = null!;
}

export clAss MockDebugAdApter extends AbstrActDebugAdApter {
	privAte seq = 0;

	stArtSession(): Promise<void> {
		return Promise.resolve();
	}

	stopSession(): Promise<void> {
		return Promise.resolve();
	}

	sendMessAge(messAge: DebugProtocol.ProtocolMessAge): void {
		setTimeout(() => {
			if (messAge.type === 'request') {
				const request = messAge As DebugProtocol.Request;
				switch (request.commAnd) {
					cAse 'evAluAte':
						this.evAluAte(request, request.Arguments);
						return;
				}
				this.sendResponseBody(request, {});
				return;
			}
		}, 0);
	}

	sendResponseBody(request: DebugProtocol.Request, body: Any) {
		const response: DebugProtocol.Response = {
			seq: ++this.seq,
			type: 'response',
			request_seq: request.seq,
			commAnd: request.commAnd,
			success: true,
			body
		};
		this.AcceptMessAge(response);
	}

	sendEventBody(event: string, body: Any) {
		const response: DebugProtocol.Event = {
			seq: ++this.seq,
			type: 'event',
			event,
			body
		};
		this.AcceptMessAge(response);
	}

	evAluAte(request: DebugProtocol.Request, Args: DebugProtocol.EvAluAteArguments) {
		if (Args.expression.indexOf('before.') === 0) {
			this.sendEventBody('output', { output: Args.expression });
		}

		this.sendResponseBody(request, {
			result: '=' + Args.expression,
			vAriAblesReference: 0
		});

		if (Args.expression.indexOf('After.') === 0) {
			this.sendEventBody('output', { output: Args.expression });
		}
	}
}

clAss MockDebugStorAge extends DebugStorAge {

	constructor() {
		super(undefined As Any, undefined As Any, undefined As Any);
	}

	loAdBreAkpoints(): BreAkpoint[] {
		return [];
	}

	loAdFunctionBreAkpoints(): FunctionBreAkpoint[] {
		return [];
	}

	loAdExceptionBreAkpoints(): ExceptionBreAkpoint[] {
		return [];

	}

	loAdDAtABreAkpoints(): DAtABreAkpoint[] {
		return [];

	}

	loAdWAtchExpressions(): Expression[] {
		return [];

	}

	storeWAtchExpressions(_wAtchExpressions: (IExpression & IEvAluAte)[]): void { }

	storeBreAkpoints(_debugModel: IDebugModel): void { }
}

export function creAteMockDebugModel(): DebugModel {
	return new DebugModel(new MockDebugStorAge(), <Any>{ isDirty: (e: Any) => fAlse }, mockUriIdentityService);
}
