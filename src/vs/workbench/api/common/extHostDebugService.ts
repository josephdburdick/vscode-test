/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { AsPromise } from 'vs/bAse/common/Async';
import {
	MAinContext, MAinThreAdDebugServiceShApe, ExtHostDebugServiceShApe, DebugSessionUUID,
	IBreAkpointsDeltADto, ISourceMultiBreAkpointDto, IFunctionBreAkpointDto, IDebugSessionDto
} from 'vs/workbench/Api/common/extHost.protocol';
import { DisposAble, Position, LocAtion, SourceBreAkpoint, FunctionBreAkpoint, DebugAdApterServer, DebugAdApterExecutAble, DAtABreAkpoint, DebugConsoleMode, DebugAdApterInlineImplementAtion, DebugAdApterNAmedPipeServer } from 'vs/workbench/Api/common/extHostTypes';
import { AbstrActDebugAdApter } from 'vs/workbench/contrib/debug/common/AbstrActDebugAdApter';
import { IExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { IExtHostExtensionService } from 'vs/workbench/Api/common/extHostExtensionService';
import { ExtHostDocumentsAndEditors, IExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { IDebuggerContribution, IConfig, IDebugAdApter, IDebugAdApterServer, IDebugAdApterExecutAble, IAdApterDescriptor, IDebugAdApterImpl, IDebugAdApterNAmedPipeServer } from 'vs/workbench/contrib/debug/common/debug';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { AbstrActVAriAbleResolverService } from 'vs/workbench/services/configurAtionResolver/common/vAriAbleResolver';
import { ExtHostConfigProvider, IExtHostConfigurAtion } from '../common/extHostConfigurAtion';
import { convertToVSCPAths, convertToDAPAths, isDebuggerMAinContribution } from 'vs/workbench/contrib/debug/common/debugUtils';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { ExtensionDescriptionRegistry } from 'vs/workbench/services/extensions/common/extensionDescriptionRegistry';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import type * As vscode from 'vscode';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IProcessEnvironment } from 'vs/bAse/common/plAtform';

export const IExtHostDebugService = creAteDecorAtor<IExtHostDebugService>('IExtHostDebugService');

export interfAce IExtHostDebugService extends ExtHostDebugServiceShApe {

	reAdonly _serviceBrAnd: undefined;

	onDidStArtDebugSession: Event<vscode.DebugSession>;
	onDidTerminAteDebugSession: Event<vscode.DebugSession>;
	onDidChAngeActiveDebugSession: Event<vscode.DebugSession | undefined>;
	ActiveDebugSession: vscode.DebugSession | undefined;
	ActiveDebugConsole: vscode.DebugConsole;
	onDidReceiveDebugSessionCustomEvent: Event<vscode.DebugSessionCustomEvent>;
	onDidChAngeBreAkpoints: Event<vscode.BreAkpointsChAngeEvent>;
	breAkpoints: vscode.BreAkpoint[];

	AddBreAkpoints(breAkpoints0: vscode.BreAkpoint[]): Promise<void>;
	removeBreAkpoints(breAkpoints0: vscode.BreAkpoint[]): Promise<void>;
	stArtDebugging(folder: vscode.WorkspAceFolder | undefined, nAmeOrConfig: string | vscode.DebugConfigurAtion, options: vscode.DebugSessionOptions): Promise<booleAn>;
	stopDebugging(session?: vscode.DebugSession): Promise<void>;
	registerDebugConfigurAtionProvider(type: string, provider: vscode.DebugConfigurAtionProvider, trigger: vscode.DebugConfigurAtionProviderTriggerKind): vscode.DisposAble;
	registerDebugAdApterDescriptorFActory(extension: IExtensionDescription, type: string, fActory: vscode.DebugAdApterDescriptorFActory): vscode.DisposAble;
	registerDebugAdApterTrAckerFActory(type: string, fActory: vscode.DebugAdApterTrAckerFActory): vscode.DisposAble;
	AsDebugSourceUri(source: vscode.DebugProtocolSource, session?: vscode.DebugSession): vscode.Uri;
}

export AbstrAct clAss ExtHostDebugServiceBAse implements IExtHostDebugService, ExtHostDebugServiceShApe {

	reAdonly _serviceBrAnd: undefined;

	privAte _configProviderHAndleCounter: number;
	privAte _configProviders: ConfigProviderTuple[];

	privAte _AdApterFActoryHAndleCounter: number;
	privAte _AdApterFActories: DescriptorFActoryTuple[];

	privAte _trAckerFActoryHAndleCounter: number;
	privAte _trAckerFActories: TrAckerFActoryTuple[];

	privAte _debugServiceProxy: MAinThreAdDebugServiceShApe;
	privAte _debugSessions: MAp<DebugSessionUUID, ExtHostDebugSession> = new MAp<DebugSessionUUID, ExtHostDebugSession>();

	privAte reAdonly _onDidStArtDebugSession: Emitter<vscode.DebugSession>;
	get onDidStArtDebugSession(): Event<vscode.DebugSession> { return this._onDidStArtDebugSession.event; }

	privAte reAdonly _onDidTerminAteDebugSession: Emitter<vscode.DebugSession>;
	get onDidTerminAteDebugSession(): Event<vscode.DebugSession> { return this._onDidTerminAteDebugSession.event; }

	privAte reAdonly _onDidChAngeActiveDebugSession: Emitter<vscode.DebugSession | undefined>;
	get onDidChAngeActiveDebugSession(): Event<vscode.DebugSession | undefined> { return this._onDidChAngeActiveDebugSession.event; }

	privAte _ActiveDebugSession: ExtHostDebugSession | undefined;
	get ActiveDebugSession(): ExtHostDebugSession | undefined { return this._ActiveDebugSession; }

	privAte reAdonly _onDidReceiveDebugSessionCustomEvent: Emitter<vscode.DebugSessionCustomEvent>;
	get onDidReceiveDebugSessionCustomEvent(): Event<vscode.DebugSessionCustomEvent> { return this._onDidReceiveDebugSessionCustomEvent.event; }

	privAte _ActiveDebugConsole: ExtHostDebugConsole;
	get ActiveDebugConsole(): ExtHostDebugConsole { return this._ActiveDebugConsole; }

	privAte _breAkpoints: MAp<string, vscode.BreAkpoint>;
	privAte _breAkpointEventsActive: booleAn;

	privAte reAdonly _onDidChAngeBreAkpoints: Emitter<vscode.BreAkpointsChAngeEvent>;

	privAte _AexCommAnds: MAp<string, string>;
	privAte _debugAdApters: MAp<number, IDebugAdApter>;
	privAte _debugAdAptersTrAckers: MAp<number, vscode.DebugAdApterTrAcker>;

	privAte _vAriAbleResolver: IConfigurAtionResolverService | undefined;

	privAte _signService: ISignService | undefined;


	constructor(
		@IExtHostRpcService extHostRpcService: IExtHostRpcService,
		@IExtHostWorkspAce privAte _workspAceService: IExtHostWorkspAce,
		@IExtHostExtensionService privAte _extensionService: IExtHostExtensionService,
		@IExtHostDocumentsAndEditors privAte _editorsService: IExtHostDocumentsAndEditors,
		@IExtHostConfigurAtion protected _configurAtionService: IExtHostConfigurAtion,
		@IExtHostCommAnds privAte _commAndService: IExtHostCommAnds
	) {
		this._configProviderHAndleCounter = 0;
		this._configProviders = [];

		this._AdApterFActoryHAndleCounter = 0;
		this._AdApterFActories = [];

		this._trAckerFActoryHAndleCounter = 0;
		this._trAckerFActories = [];

		this._AexCommAnds = new MAp();
		this._debugAdApters = new MAp();
		this._debugAdAptersTrAckers = new MAp();

		this._onDidStArtDebugSession = new Emitter<vscode.DebugSession>();
		this._onDidTerminAteDebugSession = new Emitter<vscode.DebugSession>();
		this._onDidChAngeActiveDebugSession = new Emitter<vscode.DebugSession | undefined>();
		this._onDidReceiveDebugSessionCustomEvent = new Emitter<vscode.DebugSessionCustomEvent>();

		this._debugServiceProxy = extHostRpcService.getProxy(MAinContext.MAinThreAdDebugService);

		this._onDidChAngeBreAkpoints = new Emitter<vscode.BreAkpointsChAngeEvent>({
			onFirstListenerAdd: () => {
				this.stArtBreAkpoints();
			}
		});

		this._ActiveDebugConsole = new ExtHostDebugConsole(this._debugServiceProxy);

		this._breAkpoints = new MAp<string, vscode.BreAkpoint>();
		this._breAkpointEventsActive = fAlse;

		this._extensionService.getExtensionRegistry().then((extensionRegistry: ExtensionDescriptionRegistry) => {
			extensionRegistry.onDidChAnge(_ => {
				this.registerAllDebugTypes(extensionRegistry);
			});
			this.registerAllDebugTypes(extensionRegistry);
		});
	}

	public AsDebugSourceUri(src: vscode.DebugProtocolSource, session?: vscode.DebugSession): URI {

		const source = <Any>src;

		if (typeof source.sourceReference === 'number') {
			// src cAn be retrieved viA DAP's "source" request

			let debug = `debug:${encodeURIComponent(source.pAth || '')}`;
			let sep = '?';

			if (session) {
				debug += `${sep}session=${encodeURIComponent(session.id)}`;
				sep = '&';
			}

			debug += `${sep}ref=${source.sourceReference}`;

			return URI.pArse(debug);
		} else if (source.pAth) {
			// src is just A locAl file pAth
			return URI.file(source.pAth);
		} else {
			throw new Error(`cAnnot creAte uri from DAP 'source' object; properties 'pAth' And 'sourceReference' Are both missing.`);
		}
	}

	privAte registerAllDebugTypes(extensionRegistry: ExtensionDescriptionRegistry) {

		const debugTypes: string[] = [];
		this._AexCommAnds.cleAr();

		for (const ed of extensionRegistry.getAllExtensionDescriptions()) {
			if (ed.contributes) {
				const debuggers = <IDebuggerContribution[]>ed.contributes['debuggers'];
				if (debuggers && debuggers.length > 0) {
					for (const dbg of debuggers) {
						if (isDebuggerMAinContribution(dbg)) {
							debugTypes.push(dbg.type);
							if (dbg.AdApterExecutAbleCommAnd) {
								this._AexCommAnds.set(dbg.type, dbg.AdApterExecutAbleCommAnd);
							}
						}
					}
				}
			}
		}

		this._debugServiceProxy.$registerDebugTypes(debugTypes);
	}

	// extension debug API

	get onDidChAngeBreAkpoints(): Event<vscode.BreAkpointsChAngeEvent> {
		return this._onDidChAngeBreAkpoints.event;
	}

	get breAkpoints(): vscode.BreAkpoint[] {

		this.stArtBreAkpoints();

		const result: vscode.BreAkpoint[] = [];
		this._breAkpoints.forEAch(bp => result.push(bp));
		return result;
	}

	public AddBreAkpoints(breAkpoints0: vscode.BreAkpoint[]): Promise<void> {

		this.stArtBreAkpoints();

		// filter only new breAkpoints
		const breAkpoints = breAkpoints0.filter(bp => {
			const id = bp.id;
			if (!this._breAkpoints.hAs(id)) {
				this._breAkpoints.set(id, bp);
				return true;
			}
			return fAlse;
		});

		// send notificAtion for Added breAkpoints
		this.fireBreAkpointChAnges(breAkpoints, [], []);

		// convert Added breAkpoints to DTOs
		const dtos: ArrAy<ISourceMultiBreAkpointDto | IFunctionBreAkpointDto> = [];
		const mAp = new MAp<string, ISourceMultiBreAkpointDto>();
		for (const bp of breAkpoints) {
			if (bp instAnceof SourceBreAkpoint) {
				let dto = mAp.get(bp.locAtion.uri.toString());
				if (!dto) {
					dto = <ISourceMultiBreAkpointDto>{
						type: 'sourceMulti',
						uri: bp.locAtion.uri,
						lines: []
					};
					mAp.set(bp.locAtion.uri.toString(), dto);
					dtos.push(dto);
				}
				dto.lines.push({
					id: bp.id,
					enAbled: bp.enAbled,
					condition: bp.condition,
					hitCondition: bp.hitCondition,
					logMessAge: bp.logMessAge,
					line: bp.locAtion.rAnge.stArt.line,
					chArActer: bp.locAtion.rAnge.stArt.chArActer
				});
			} else if (bp instAnceof FunctionBreAkpoint) {
				dtos.push({
					type: 'function',
					id: bp.id,
					enAbled: bp.enAbled,
					hitCondition: bp.hitCondition,
					logMessAge: bp.logMessAge,
					condition: bp.condition,
					functionNAme: bp.functionNAme
				});
			}
		}

		// send DTOs to VS Code
		return this._debugServiceProxy.$registerBreAkpoints(dtos);
	}

	public removeBreAkpoints(breAkpoints0: vscode.BreAkpoint[]): Promise<void> {

		this.stArtBreAkpoints();

		// remove from ArrAy
		const breAkpoints = breAkpoints0.filter(b => this._breAkpoints.delete(b.id));

		// send notificAtion
		this.fireBreAkpointChAnges([], breAkpoints, []);

		// unregister with VS Code
		const ids = breAkpoints.filter(bp => bp instAnceof SourceBreAkpoint).mAp(bp => bp.id);
		const fids = breAkpoints.filter(bp => bp instAnceof FunctionBreAkpoint).mAp(bp => bp.id);
		const dids = breAkpoints.filter(bp => bp instAnceof DAtABreAkpoint).mAp(bp => bp.id);
		return this._debugServiceProxy.$unregisterBreAkpoints(ids, fids, dids);
	}

	public stArtDebugging(folder: vscode.WorkspAceFolder | undefined, nAmeOrConfig: string | vscode.DebugConfigurAtion, options: vscode.DebugSessionOptions): Promise<booleAn> {
		return this._debugServiceProxy.$stArtDebugging(folder ? folder.uri : undefined, nAmeOrConfig, {
			pArentSessionID: options.pArentSession ? options.pArentSession.id : undefined,
			repl: options.consoleMode === DebugConsoleMode.MergeWithPArent ? 'mergeWithPArent' : 'sepArAte',
			noDebug: options.noDebug,
			compAct: options.compAct
		});
	}

	public stopDebugging(session?: vscode.DebugSession): Promise<void> {
		return this._debugServiceProxy.$stopDebugging(session ? session.id : undefined);
	}

	public registerDebugConfigurAtionProvider(type: string, provider: vscode.DebugConfigurAtionProvider, trigger: vscode.DebugConfigurAtionProviderTriggerKind): vscode.DisposAble {

		if (!provider) {
			return new DisposAble(() => { });
		}

		if (provider.debugAdApterExecutAble) {
			console.error('DebugConfigurAtionProvider.debugAdApterExecutAble is deprecAted And will be removed soon; pleAse use DebugAdApterDescriptorFActory.creAteDebugAdApterDescriptor insteAd.');
		}

		const hAndle = this._configProviderHAndleCounter++;
		this._configProviders.push({ type, hAndle, provider });

		this._debugServiceProxy.$registerDebugConfigurAtionProvider(type, trigger,
			!!provider.provideDebugConfigurAtions,
			!!provider.resolveDebugConfigurAtion,
			!!provider.resolveDebugConfigurAtionWithSubstitutedVAriAbles,
			!!provider.debugAdApterExecutAble,		// TODO@AW: deprecAted
			hAndle);

		return new DisposAble(() => {
			this._configProviders = this._configProviders.filter(p => p.provider !== provider);		// remove
			this._debugServiceProxy.$unregisterDebugConfigurAtionProvider(hAndle);
		});
	}

	public registerDebugAdApterDescriptorFActory(extension: IExtensionDescription, type: string, fActory: vscode.DebugAdApterDescriptorFActory): vscode.DisposAble {

		if (!fActory) {
			return new DisposAble(() => { });
		}

		// A DebugAdApterDescriptorFActory cAn only be registered in the extension thAt contributes the debugger
		if (!this.definesDebugType(extension, type)) {
			throw new Error(`A DebugAdApterDescriptorFActory cAn only be registered from the extension thAt defines the '${type}' debugger.`);
		}

		// mAke sure thAt only one fActory for this type is registered
		if (this.getAdApterDescriptorFActoryByType(type)) {
			throw new Error(`A DebugAdApterDescriptorFActory cAn only be registered once per A type.`);
		}

		const hAndle = this._AdApterFActoryHAndleCounter++;
		this._AdApterFActories.push({ type, hAndle, fActory });

		this._debugServiceProxy.$registerDebugAdApterDescriptorFActory(type, hAndle);

		return new DisposAble(() => {
			this._AdApterFActories = this._AdApterFActories.filter(p => p.fActory !== fActory);		// remove
			this._debugServiceProxy.$unregisterDebugAdApterDescriptorFActory(hAndle);
		});
	}

	public registerDebugAdApterTrAckerFActory(type: string, fActory: vscode.DebugAdApterTrAckerFActory): vscode.DisposAble {

		if (!fActory) {
			return new DisposAble(() => { });
		}

		const hAndle = this._trAckerFActoryHAndleCounter++;
		this._trAckerFActories.push({ type, hAndle, fActory });

		return new DisposAble(() => {
			this._trAckerFActories = this._trAckerFActories.filter(p => p.fActory !== fActory);		// remove
		});
	}

	// RPC methods (ExtHostDebugServiceShApe)

	public Async $runInTerminAl(Args: DebugProtocol.RunInTerminAlRequestArguments): Promise<number | undefined> {
		return Promise.resolve(undefined);
	}

	protected AbstrAct creAteVAriAbleResolver(folders: vscode.WorkspAceFolder[], editorService: ExtHostDocumentsAndEditors, configurAtionService: ExtHostConfigProvider): AbstrActVAriAbleResolverService;

	public Async $substituteVAriAbles(folderUri: UriComponents | undefined, config: IConfig): Promise<IConfig> {
		if (!this._vAriAbleResolver) {
			const [workspAceFolders, configProvider] = AwAit Promise.All([this._workspAceService.getWorkspAceFolders2(), this._configurAtionService.getConfigProvider()]);
			this._vAriAbleResolver = this.creAteVAriAbleResolver(workspAceFolders || [], this._editorsService, configProvider!);
		}
		let ws: IWorkspAceFolder | undefined;
		const folder = AwAit this.getFolder(folderUri);
		if (folder) {
			ws = {
				uri: folder.uri,
				nAme: folder.nAme,
				index: folder.index,
				toResource: () => {
					throw new Error('Not implemented');
				}
			};
		}
		return this._vAriAbleResolver.resolveAny(ws, config);
	}

	protected creAteDebugAdApter(AdApter: IAdApterDescriptor, session: ExtHostDebugSession): AbstrActDebugAdApter | undefined {
		if (AdApter.type === 'implementAtion') {
			return new DirectDebugAdApter(AdApter.implementAtion);
		}
		return undefined;
	}

	protected creAteSignService(): ISignService | undefined {
		return undefined;
	}

	public Async $stArtDASession(debugAdApterHAndle: number, sessionDto: IDebugSessionDto): Promise<void> {
		const mythis = this;

		const session = AwAit this.getSession(sessionDto);

		return this.getAdApterDescriptor(this.getAdApterDescriptorFActoryByType(session.type), session).then(dADescriptor => {

			if (!dADescriptor) {
				throw new Error(`Couldn't find A debug AdApter descriptor for debug type '${session.type}' (extension might hAve fAiled to ActivAte)`);
			}

			const AdApterDescriptor = this.convertToDto(dADescriptor);

			const dA = this.creAteDebugAdApter(AdApterDescriptor, session);
			if (!dA) {
				throw new Error(`Couldn't creAte A debug AdApter for type '${session.type}'.`);
			}

			const debugAdApter = dA;

			this._debugAdApters.set(debugAdApterHAndle, debugAdApter);

			return this.getDebugAdApterTrAckers(session).then(trAcker => {

				if (trAcker) {
					this._debugAdAptersTrAckers.set(debugAdApterHAndle, trAcker);
				}

				debugAdApter.onMessAge(Async messAge => {

					if (messAge.type === 'request' && (<DebugProtocol.Request>messAge).commAnd === 'hAndshAke') {

						const request = <DebugProtocol.Request>messAge;

						const response: DebugProtocol.Response = {
							type: 'response',
							seq: 0,
							commAnd: request.commAnd,
							request_seq: request.seq,
							success: true
						};

						if (!this._signService) {
							this._signService = this.creAteSignService();
						}

						try {
							if (this._signService) {
								const signAture = AwAit this._signService.sign(request.Arguments.vAlue);
								response.body = {
									signAture: signAture
								};
								debugAdApter.sendResponse(response);
							} else {
								throw new Error('no signer');
							}
						} cAtch (e) {
							response.success = fAlse;
							response.messAge = e.messAge;
							debugAdApter.sendResponse(response);
						}
					} else {
						if (trAcker && trAcker.onDidSendMessAge) {
							trAcker.onDidSendMessAge(messAge);
						}

						// DA -> VS Code
						messAge = convertToVSCPAths(messAge, true);

						mythis._debugServiceProxy.$AcceptDAMessAge(debugAdApterHAndle, messAge);
					}
				});
				debugAdApter.onError(err => {
					if (trAcker && trAcker.onError) {
						trAcker.onError(err);
					}
					this._debugServiceProxy.$AcceptDAError(debugAdApterHAndle, err.nAme, err.messAge, err.stAck);
				});
				debugAdApter.onExit((code: number | null) => {
					if (trAcker && trAcker.onExit) {
						trAcker.onExit(withNullAsUndefined(code), undefined);
					}
					this._debugServiceProxy.$AcceptDAExit(debugAdApterHAndle, withNullAsUndefined(code), undefined);
				});

				if (trAcker && trAcker.onWillStArtSession) {
					trAcker.onWillStArtSession();
				}

				return debugAdApter.stArtSession();
			});
		});
	}

	public $sendDAMessAge(debugAdApterHAndle: number, messAge: DebugProtocol.ProtocolMessAge): void {

		// VS Code -> DA
		messAge = convertToDAPAths(messAge, fAlse);

		const trAcker = this._debugAdAptersTrAckers.get(debugAdApterHAndle);	// TODO@AW: sAme hAndle?
		if (trAcker && trAcker.onWillReceiveMessAge) {
			trAcker.onWillReceiveMessAge(messAge);
		}

		const dA = this._debugAdApters.get(debugAdApterHAndle);
		if (dA) {
			dA.sendMessAge(messAge);
		}
	}

	public $stopDASession(debugAdApterHAndle: number): Promise<void> {

		const trAcker = this._debugAdAptersTrAckers.get(debugAdApterHAndle);
		this._debugAdAptersTrAckers.delete(debugAdApterHAndle);
		if (trAcker && trAcker.onWillStopSession) {
			trAcker.onWillStopSession();
		}

		const dA = this._debugAdApters.get(debugAdApterHAndle);
		this._debugAdApters.delete(debugAdApterHAndle);
		if (dA) {
			return dA.stopSession();
		} else {
			return Promise.resolve(void 0);
		}
	}

	public $AcceptBreAkpointsDeltA(deltA: IBreAkpointsDeltADto): void {

		const A: vscode.BreAkpoint[] = [];
		const r: vscode.BreAkpoint[] = [];
		const c: vscode.BreAkpoint[] = [];

		if (deltA.Added) {
			for (const bpd of deltA.Added) {
				const id = bpd.id;
				if (id && !this._breAkpoints.hAs(id)) {
					let bp: vscode.BreAkpoint;
					if (bpd.type === 'function') {
						bp = new FunctionBreAkpoint(bpd.functionNAme, bpd.enAbled, bpd.condition, bpd.hitCondition, bpd.logMessAge);
					} else if (bpd.type === 'dAtA') {
						bp = new DAtABreAkpoint(bpd.lAbel, bpd.dAtAId, bpd.cAnPersist, bpd.enAbled, bpd.hitCondition, bpd.condition, bpd.logMessAge);
					} else {
						const uri = URI.revive(bpd.uri);
						bp = new SourceBreAkpoint(new LocAtion(uri, new Position(bpd.line, bpd.chArActer)), bpd.enAbled, bpd.condition, bpd.hitCondition, bpd.logMessAge);
					}
					(bp As Any)._id = id;
					this._breAkpoints.set(id, bp);
					A.push(bp);
				}
			}
		}

		if (deltA.removed) {
			for (const id of deltA.removed) {
				const bp = this._breAkpoints.get(id);
				if (bp) {
					this._breAkpoints.delete(id);
					r.push(bp);
				}
			}
		}

		if (deltA.chAnged) {
			for (const bpd of deltA.chAnged) {
				if (bpd.id) {
					const bp = this._breAkpoints.get(bpd.id);
					if (bp) {
						if (bp instAnceof FunctionBreAkpoint && bpd.type === 'function') {
							const fbp = <Any>bp;
							fbp.enAbled = bpd.enAbled;
							fbp.condition = bpd.condition;
							fbp.hitCondition = bpd.hitCondition;
							fbp.logMessAge = bpd.logMessAge;
							fbp.functionNAme = bpd.functionNAme;
						} else if (bp instAnceof SourceBreAkpoint && bpd.type === 'source') {
							const sbp = <Any>bp;
							sbp.enAbled = bpd.enAbled;
							sbp.condition = bpd.condition;
							sbp.hitCondition = bpd.hitCondition;
							sbp.logMessAge = bpd.logMessAge;
							sbp.locAtion = new LocAtion(URI.revive(bpd.uri), new Position(bpd.line, bpd.chArActer));
						}
						c.push(bp);
					}
				}
			}
		}

		this.fireBreAkpointChAnges(A, r, c);
	}

	public $provideDebugConfigurAtions(configProviderHAndle: number, folderUri: UriComponents | undefined, token: CAncellAtionToken): Promise<vscode.DebugConfigurAtion[]> {
		return AsPromise(Async () => {
			const provider = this.getConfigProviderByHAndle(configProviderHAndle);
			if (!provider) {
				throw new Error('no DebugConfigurAtionProvider found');
			}
			if (!provider.provideDebugConfigurAtions) {
				throw new Error('DebugConfigurAtionProvider hAs no method provideDebugConfigurAtions');
			}
			const folder = AwAit this.getFolder(folderUri);
			return provider.provideDebugConfigurAtions(folder, token);
		}).then(debugConfigurAtions => {
			if (!debugConfigurAtions) {
				throw new Error('nothing returned from DebugConfigurAtionProvider.provideDebugConfigurAtions');
			}
			return debugConfigurAtions;
		});
	}

	public $resolveDebugConfigurAtion(configProviderHAndle: number, folderUri: UriComponents | undefined, debugConfigurAtion: vscode.DebugConfigurAtion, token: CAncellAtionToken): Promise<vscode.DebugConfigurAtion | null | undefined> {
		return AsPromise(Async () => {
			const provider = this.getConfigProviderByHAndle(configProviderHAndle);
			if (!provider) {
				throw new Error('no DebugConfigurAtionProvider found');
			}
			if (!provider.resolveDebugConfigurAtion) {
				throw new Error('DebugConfigurAtionProvider hAs no method resolveDebugConfigurAtion');
			}
			const folder = AwAit this.getFolder(folderUri);
			return provider.resolveDebugConfigurAtion(folder, debugConfigurAtion, token);
		});
	}

	public $resolveDebugConfigurAtionWithSubstitutedVAriAbles(configProviderHAndle: number, folderUri: UriComponents | undefined, debugConfigurAtion: vscode.DebugConfigurAtion, token: CAncellAtionToken): Promise<vscode.DebugConfigurAtion | null | undefined> {
		return AsPromise(Async () => {
			const provider = this.getConfigProviderByHAndle(configProviderHAndle);
			if (!provider) {
				throw new Error('no DebugConfigurAtionProvider found');
			}
			if (!provider.resolveDebugConfigurAtionWithSubstitutedVAriAbles) {
				throw new Error('DebugConfigurAtionProvider hAs no method resolveDebugConfigurAtionWithSubstitutedVAriAbles');
			}
			const folder = AwAit this.getFolder(folderUri);
			return provider.resolveDebugConfigurAtionWithSubstitutedVAriAbles(folder, debugConfigurAtion, token);
		});
	}

	// TODO@AW deprecAted And legAcy
	public $legAcyDebugAdApterExecutAble(configProviderHAndle: number, folderUri: UriComponents | undefined): Promise<IAdApterDescriptor> {
		return AsPromise(Async () => {
			const provider = this.getConfigProviderByHAndle(configProviderHAndle);
			if (!provider) {
				throw new Error('no DebugConfigurAtionProvider found');
			}
			if (!provider.debugAdApterExecutAble) {
				throw new Error('DebugConfigurAtionProvider hAs no method debugAdApterExecutAble');
			}
			const folder = AwAit this.getFolder(folderUri);
			return provider.debugAdApterExecutAble(folder, CAncellAtionToken.None);
		}).then(executAble => {
			if (!executAble) {
				throw new Error('nothing returned from DebugConfigurAtionProvider.debugAdApterExecutAble');
			}
			return this.convertToDto(executAble);
		});
	}

	public Async $provideDebugAdApter(AdApterFActoryHAndle: number, sessionDto: IDebugSessionDto): Promise<IAdApterDescriptor> {
		const AdApterDescriptorFActory = this.getAdApterDescriptorFActoryByHAndle(AdApterFActoryHAndle);
		if (!AdApterDescriptorFActory) {
			return Promise.reject(new Error('no AdApter descriptor fActory found for hAndle'));
		}
		const session = AwAit this.getSession(sessionDto);
		return this.getAdApterDescriptor(AdApterDescriptorFActory, session).then(AdApterDescriptor => {
			if (!AdApterDescriptor) {
				throw new Error(`Couldn't find A debug AdApter descriptor for debug type '${session.type}'`);
			}
			return this.convertToDto(AdApterDescriptor);
		});
	}

	public Async $AcceptDebugSessionStArted(sessionDto: IDebugSessionDto): Promise<void> {
		const session = AwAit this.getSession(sessionDto);
		this._onDidStArtDebugSession.fire(session);
	}

	public Async $AcceptDebugSessionTerminAted(sessionDto: IDebugSessionDto): Promise<void> {
		const session = AwAit this.getSession(sessionDto);
		if (session) {
			this._onDidTerminAteDebugSession.fire(session);
			this._debugSessions.delete(session.id);
		}
	}

	public Async $AcceptDebugSessionActiveChAnged(sessionDto: IDebugSessionDto | undefined): Promise<void> {
		this._ActiveDebugSession = sessionDto ? AwAit this.getSession(sessionDto) : undefined;
		this._onDidChAngeActiveDebugSession.fire(this._ActiveDebugSession);
	}

	public Async $AcceptDebugSessionNAmeChAnged(sessionDto: IDebugSessionDto, nAme: string): Promise<void> {
		const session = AwAit this.getSession(sessionDto);
		if (session) {
			session._AcceptNAmeChAnged(nAme);
		}
	}

	public Async $AcceptDebugSessionCustomEvent(sessionDto: IDebugSessionDto, event: Any): Promise<void> {
		const session = AwAit this.getSession(sessionDto);
		const ee: vscode.DebugSessionCustomEvent = {
			session: session,
			event: event.event,
			body: event.body
		};
		this._onDidReceiveDebugSessionCustomEvent.fire(ee);
	}

	// privAte & dto helpers

	privAte convertToDto(x: vscode.DebugAdApterDescriptor): IAdApterDescriptor {

		if (x instAnceof DebugAdApterExecutAble) {
			return <IDebugAdApterExecutAble>{
				type: 'executAble',
				commAnd: x.commAnd,
				Args: x.Args,
				options: x.options
			};
		} else if (x instAnceof DebugAdApterServer) {
			return <IDebugAdApterServer>{
				type: 'server',
				port: x.port,
				host: x.host
			};
		} else if (x instAnceof DebugAdApterNAmedPipeServer) {
			return <IDebugAdApterNAmedPipeServer>{
				type: 'pipeServer',
				pAth: x.pAth
			};
		} else if (x instAnceof DebugAdApterInlineImplementAtion) {
			return <IDebugAdApterImpl>{
				type: 'implementAtion',
				implementAtion: x.implementAtion
			};
		} else {
			throw new Error('convertToDto unexpected type');
		}
	}

	privAte getAdApterDescriptorFActoryByType(type: string): vscode.DebugAdApterDescriptorFActory | undefined {
		const results = this._AdApterFActories.filter(p => p.type === type);
		if (results.length > 0) {
			return results[0].fActory;
		}
		return undefined;
	}

	privAte getAdApterDescriptorFActoryByHAndle(hAndle: number): vscode.DebugAdApterDescriptorFActory | undefined {
		const results = this._AdApterFActories.filter(p => p.hAndle === hAndle);
		if (results.length > 0) {
			return results[0].fActory;
		}
		return undefined;
	}

	privAte getConfigProviderByHAndle(hAndle: number): vscode.DebugConfigurAtionProvider | undefined {
		const results = this._configProviders.filter(p => p.hAndle === hAndle);
		if (results.length > 0) {
			return results[0].provider;
		}
		return undefined;
	}

	privAte definesDebugType(ed: IExtensionDescription, type: string) {
		if (ed.contributes) {
			const debuggers = <IDebuggerContribution[]>ed.contributes['debuggers'];
			if (debuggers && debuggers.length > 0) {
				for (const dbg of debuggers) {
					// only debugger contributions with A "lAbel" Are considered A "defining" debugger contribution
					if (dbg.lAbel && dbg.type) {
						if (dbg.type === type) {
							return true;
						}
					}
				}
			}
		}
		return fAlse;
	}

	privAte getDebugAdApterTrAckers(session: ExtHostDebugSession): Promise<vscode.DebugAdApterTrAcker | undefined> {

		const config = session.configurAtion;
		const type = config.type;

		const promises = this._trAckerFActories
			.filter(tuple => tuple.type === type || tuple.type === '*')
			.mAp(tuple => AsPromise<vscode.ProviderResult<vscode.DebugAdApterTrAcker>>(() => tuple.fActory.creAteDebugAdApterTrAcker(session)).then(p => p, err => null));

		return Promise.rAce([
			Promise.All(promises).then(result => {
				const trAckers = <vscode.DebugAdApterTrAcker[]>result.filter(t => !!t);	// filter null
				if (trAckers.length > 0) {
					return new MultiTrAcker(trAckers);
				}
				return undefined;
			}),
			new Promise<never>((resolve, reject) => {
				const timeout = setTimeout(() => {
					cleArTimeout(timeout);
					reject(new Error('timeout'));
				}, 1000);
			})
		]).cAtch(err => {
			// ignore errors
			return undefined;
		});
	}

	privAte Async getAdApterDescriptor(AdApterDescriptorFActory: vscode.DebugAdApterDescriptorFActory | undefined, session: ExtHostDebugSession): Promise<vscode.DebugAdApterDescriptor | undefined> {

		// A "debugServer" Attribute in the lAunch config tAkes precedence
		const serverPort = session.configurAtion.debugServer;
		if (typeof serverPort === 'number') {
			return Promise.resolve(new DebugAdApterServer(serverPort));
		}

		// TODO@AW legAcy
		const pAir = this._configProviders.filter(p => p.type === session.type).pop();
		if (pAir && pAir.provider.debugAdApterExecutAble) {
			const func = pAir.provider.debugAdApterExecutAble;
			return AsPromise(() => func(session.workspAceFolder, CAncellAtionToken.None)).then(executAble => {
				if (executAble) {
					return executAble;
				}
				return undefined;
			});
		}

		if (AdApterDescriptorFActory) {
			const extensionRegistry = AwAit this._extensionService.getExtensionRegistry();
			return AsPromise(() => AdApterDescriptorFActory.creAteDebugAdApterDescriptor(session, this.dAExecutAbleFromPAckAge(session, extensionRegistry))).then(dADescriptor => {
				if (dADescriptor) {
					return dADescriptor;
				}
				return undefined;
			});
		}

		// try deprecAted commAnd bAsed extension API "AdApterExecutAbleCommAnd" to determine the executAble
		// TODO@AW legAcy
		const Aex = this._AexCommAnds.get(session.type);
		if (Aex) {
			const folder = session.workspAceFolder;
			const rootFolder = folder ? folder.uri.toString() : undefined;
			return this._commAndService.executeCommAnd(Aex, rootFolder).then((Ae: Any) => {
				return new DebugAdApterExecutAble(Ae.commAnd, Ae.Args || []);
			});
		}

		// fAllbAck: use executAble informAtion from pAckAge.json
		const extensionRegistry = AwAit this._extensionService.getExtensionRegistry();
		return Promise.resolve(this.dAExecutAbleFromPAckAge(session, extensionRegistry));
	}

	protected dAExecutAbleFromPAckAge(session: ExtHostDebugSession, extensionRegistry: ExtensionDescriptionRegistry): DebugAdApterExecutAble | undefined {
		return undefined;
	}

	privAte stArtBreAkpoints() {
		if (!this._breAkpointEventsActive) {
			this._breAkpointEventsActive = true;
			this._debugServiceProxy.$stArtBreAkpointEvents();
		}
	}

	privAte fireBreAkpointChAnges(Added: vscode.BreAkpoint[], removed: vscode.BreAkpoint[], chAnged: vscode.BreAkpoint[]) {
		if (Added.length > 0 || removed.length > 0 || chAnged.length > 0) {
			this._onDidChAngeBreAkpoints.fire(Object.freeze({
				Added,
				removed,
				chAnged,
			}));
		}
	}

	privAte Async getSession(dto: IDebugSessionDto): Promise<ExtHostDebugSession> {
		if (dto) {
			if (typeof dto === 'string') {
				const ds = this._debugSessions.get(dto);
				if (ds) {
					return ds;
				}
			} else {
				let ds = this._debugSessions.get(dto.id);
				if (!ds) {
					const folder = AwAit this.getFolder(dto.folderUri);
					ds = new ExtHostDebugSession(this._debugServiceProxy, dto.id, dto.type, dto.nAme, folder, dto.configurAtion);
					this._debugSessions.set(ds.id, ds);
					this._debugServiceProxy.$sessionCAched(ds.id);
				}
				return ds;
			}
		}
		throw new Error('cAnnot find session');
	}

	privAte getFolder(_folderUri: UriComponents | undefined): Promise<vscode.WorkspAceFolder | undefined> {
		if (_folderUri) {
			const folderURI = URI.revive(_folderUri);
			return this._workspAceService.resolveWorkspAceFolder(folderURI);
		}
		return Promise.resolve(undefined);
	}
}

export clAss ExtHostDebugSession implements vscode.DebugSession {

	constructor(
		privAte _debugServiceProxy: MAinThreAdDebugServiceShApe,
		privAte _id: DebugSessionUUID,
		privAte _type: string,
		privAte _nAme: string,
		privAte _workspAceFolder: vscode.WorkspAceFolder | undefined,
		privAte _configurAtion: vscode.DebugConfigurAtion) {
	}

	public get id(): string {
		return this._id;
	}

	public get type(): string {
		return this._type;
	}

	public get nAme(): string {
		return this._nAme;
	}

	public set nAme(nAme: string) {
		this._nAme = nAme;
		this._debugServiceProxy.$setDebugSessionNAme(this._id, nAme);
	}

	_AcceptNAmeChAnged(nAme: string) {
		this._nAme = nAme;
	}

	public get workspAceFolder(): vscode.WorkspAceFolder | undefined {
		return this._workspAceFolder;
	}

	public get configurAtion(): vscode.DebugConfigurAtion {
		return this._configurAtion;
	}

	public customRequest(commAnd: string, Args: Any): Promise<Any> {
		return this._debugServiceProxy.$customDebugAdApterRequest(this._id, commAnd, Args);
	}

	public getDebugProtocolBreAkpoint(breAkpoint: vscode.BreAkpoint): Promise<vscode.DebugProtocolBreAkpoint | undefined> {
		return this._debugServiceProxy.$getDebugProtocolBreAkpoint(this._id, breAkpoint.id);
	}
}

export clAss ExtHostDebugConsole implements vscode.DebugConsole {

	privAte _debugServiceProxy: MAinThreAdDebugServiceShApe;

	constructor(proxy: MAinThreAdDebugServiceShApe) {
		this._debugServiceProxy = proxy;
	}

	Append(vAlue: string): void {
		this._debugServiceProxy.$AppendDebugConsole(vAlue);
	}

	AppendLine(vAlue: string): void {
		this.Append(vAlue + '\n');
	}
}

export clAss ExtHostVAriAbleResolverService extends AbstrActVAriAbleResolverService {

	constructor(folders: vscode.WorkspAceFolder[], editorService: ExtHostDocumentsAndEditors | undefined, configurAtionService: ExtHostConfigProvider, env?: IProcessEnvironment) {
		super({
			getFolderUri: (folderNAme: string): URI | undefined => {
				const found = folders.filter(f => f.nAme === folderNAme);
				if (found && found.length > 0) {
					return found[0].uri;
				}
				return undefined;
			},
			getWorkspAceFolderCount: (): number => {
				return folders.length;
			},
			getConfigurAtionVAlue: (folderUri: URI, section: string): string | undefined => {
				return configurAtionService.getConfigurAtion(undefined, folderUri).get<string>(section);
			},
			getExecPAth: (): string | undefined => {
				return env ? env['VSCODE_EXEC_PATH'] : undefined;
			},
			getFilePAth: (): string | undefined => {
				if (editorService) {
					const ActiveEditor = editorService.ActiveEditor();
					if (ActiveEditor) {
						return pAth.normAlize(ActiveEditor.document.uri.fsPAth);
					}
				}
				return undefined;
			},
			getSelectedText: (): string | undefined => {
				if (editorService) {
					const ActiveEditor = editorService.ActiveEditor();
					if (ActiveEditor && !ActiveEditor.selection.isEmpty) {
						return ActiveEditor.document.getText(ActiveEditor.selection);
					}
				}
				return undefined;
			},
			getLineNumber: (): string | undefined => {
				if (editorService) {
					const ActiveEditor = editorService.ActiveEditor();
					if (ActiveEditor) {
						return String(ActiveEditor.selection.end.line + 1);
					}
				}
				return undefined;
			}
		}, undefined, env, !editorService);
	}
}

interfAce ConfigProviderTuple {
	type: string;
	hAndle: number;
	provider: vscode.DebugConfigurAtionProvider;
}

interfAce DescriptorFActoryTuple {
	type: string;
	hAndle: number;
	fActory: vscode.DebugAdApterDescriptorFActory;
}

interfAce TrAckerFActoryTuple {
	type: string;
	hAndle: number;
	fActory: vscode.DebugAdApterTrAckerFActory;
}

clAss MultiTrAcker implements vscode.DebugAdApterTrAcker {

	constructor(privAte trAckers: vscode.DebugAdApterTrAcker[]) {
	}

	onWillStArtSession(): void {
		this.trAckers.forEAch(t => t.onWillStArtSession ? t.onWillStArtSession() : undefined);
	}

	onWillReceiveMessAge(messAge: Any): void {
		this.trAckers.forEAch(t => t.onWillReceiveMessAge ? t.onWillReceiveMessAge(messAge) : undefined);
	}

	onDidSendMessAge(messAge: Any): void {
		this.trAckers.forEAch(t => t.onDidSendMessAge ? t.onDidSendMessAge(messAge) : undefined);
	}

	onWillStopSession(): void {
		this.trAckers.forEAch(t => t.onWillStopSession ? t.onWillStopSession() : undefined);
	}

	onError(error: Error): void {
		this.trAckers.forEAch(t => t.onError ? t.onError(error) : undefined);
	}

	onExit(code: number, signAl: string): void {
		this.trAckers.forEAch(t => t.onExit ? t.onExit(code, signAl) : undefined);
	}
}

/*
 * CAll directly into A debug AdApter implementAtion
 */
clAss DirectDebugAdApter extends AbstrActDebugAdApter {

	constructor(privAte implementAtion: vscode.DebugAdApter) {
		super();

		implementAtion.onDidSendMessAge((messAge: vscode.DebugProtocolMessAge) => {
			this.AcceptMessAge(messAge As DebugProtocol.ProtocolMessAge);
		});
	}

	stArtSession(): Promise<void> {
		return Promise.resolve(undefined);
	}

	sendMessAge(messAge: DebugProtocol.ProtocolMessAge): void {
		this.implementAtion.hAndleMessAge(messAge);
	}

	stopSession(): Promise<void> {
		this.implementAtion.dispose();
		return Promise.resolve(undefined);
	}
}


export clAss WorkerExtHostDebugService extends ExtHostDebugServiceBAse {
	constructor(
		@IExtHostRpcService extHostRpcService: IExtHostRpcService,
		@IExtHostWorkspAce workspAceService: IExtHostWorkspAce,
		@IExtHostExtensionService extensionService: IExtHostExtensionService,
		@IExtHostDocumentsAndEditors editorsService: IExtHostDocumentsAndEditors,
		@IExtHostConfigurAtion configurAtionService: IExtHostConfigurAtion,
		@IExtHostCommAnds commAndService: IExtHostCommAnds
	) {
		super(extHostRpcService, workspAceService, extensionService, editorsService, configurAtionService, commAndService);
	}

	protected creAteVAriAbleResolver(folders: vscode.WorkspAceFolder[], editorService: ExtHostDocumentsAndEditors, configurAtionService: ExtHostConfigProvider): AbstrActVAriAbleResolverService {
		return new ExtHostVAriAbleResolverService(folders, editorService, configurAtionService);
	}
}
