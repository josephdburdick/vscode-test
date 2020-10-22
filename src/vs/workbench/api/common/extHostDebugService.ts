/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { asPromise } from 'vs/Base/common/async';
import {
	MainContext, MainThreadDeBugServiceShape, ExtHostDeBugServiceShape, DeBugSessionUUID,
	IBreakpointsDeltaDto, ISourceMultiBreakpointDto, IFunctionBreakpointDto, IDeBugSessionDto
} from 'vs/workBench/api/common/extHost.protocol';
import { DisposaBle, Position, Location, SourceBreakpoint, FunctionBreakpoint, DeBugAdapterServer, DeBugAdapterExecutaBle, DataBreakpoint, DeBugConsoleMode, DeBugAdapterInlineImplementation, DeBugAdapterNamedPipeServer } from 'vs/workBench/api/common/extHostTypes';
import { ABstractDeBugAdapter } from 'vs/workBench/contriB/deBug/common/aBstractDeBugAdapter';
import { IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { IExtHostExtensionService } from 'vs/workBench/api/common/extHostExtensionService';
import { ExtHostDocumentsAndEditors, IExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IDeBuggerContriBution, IConfig, IDeBugAdapter, IDeBugAdapterServer, IDeBugAdapterExecutaBle, IAdapterDescriptor, IDeBugAdapterImpl, IDeBugAdapterNamedPipeServer } from 'vs/workBench/contriB/deBug/common/deBug';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ABstractVariaBleResolverService } from 'vs/workBench/services/configurationResolver/common/variaBleResolver';
import { ExtHostConfigProvider, IExtHostConfiguration } from '../common/extHostConfiguration';
import { convertToVSCPaths, convertToDAPaths, isDeBuggerMainContriBution } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import { ISignService } from 'vs/platform/sign/common/sign';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import type * as vscode from 'vscode';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IProcessEnvironment } from 'vs/Base/common/platform';

export const IExtHostDeBugService = createDecorator<IExtHostDeBugService>('IExtHostDeBugService');

export interface IExtHostDeBugService extends ExtHostDeBugServiceShape {

	readonly _serviceBrand: undefined;

	onDidStartDeBugSession: Event<vscode.DeBugSession>;
	onDidTerminateDeBugSession: Event<vscode.DeBugSession>;
	onDidChangeActiveDeBugSession: Event<vscode.DeBugSession | undefined>;
	activeDeBugSession: vscode.DeBugSession | undefined;
	activeDeBugConsole: vscode.DeBugConsole;
	onDidReceiveDeBugSessionCustomEvent: Event<vscode.DeBugSessionCustomEvent>;
	onDidChangeBreakpoints: Event<vscode.BreakpointsChangeEvent>;
	Breakpoints: vscode.Breakpoint[];

	addBreakpoints(Breakpoints0: vscode.Breakpoint[]): Promise<void>;
	removeBreakpoints(Breakpoints0: vscode.Breakpoint[]): Promise<void>;
	startDeBugging(folder: vscode.WorkspaceFolder | undefined, nameOrConfig: string | vscode.DeBugConfiguration, options: vscode.DeBugSessionOptions): Promise<Boolean>;
	stopDeBugging(session?: vscode.DeBugSession): Promise<void>;
	registerDeBugConfigurationProvider(type: string, provider: vscode.DeBugConfigurationProvider, trigger: vscode.DeBugConfigurationProviderTriggerKind): vscode.DisposaBle;
	registerDeBugAdapterDescriptorFactory(extension: IExtensionDescription, type: string, factory: vscode.DeBugAdapterDescriptorFactory): vscode.DisposaBle;
	registerDeBugAdapterTrackerFactory(type: string, factory: vscode.DeBugAdapterTrackerFactory): vscode.DisposaBle;
	asDeBugSourceUri(source: vscode.DeBugProtocolSource, session?: vscode.DeBugSession): vscode.Uri;
}

export aBstract class ExtHostDeBugServiceBase implements IExtHostDeBugService, ExtHostDeBugServiceShape {

	readonly _serviceBrand: undefined;

	private _configProviderHandleCounter: numBer;
	private _configProviders: ConfigProviderTuple[];

	private _adapterFactoryHandleCounter: numBer;
	private _adapterFactories: DescriptorFactoryTuple[];

	private _trackerFactoryHandleCounter: numBer;
	private _trackerFactories: TrackerFactoryTuple[];

	private _deBugServiceProxy: MainThreadDeBugServiceShape;
	private _deBugSessions: Map<DeBugSessionUUID, ExtHostDeBugSession> = new Map<DeBugSessionUUID, ExtHostDeBugSession>();

	private readonly _onDidStartDeBugSession: Emitter<vscode.DeBugSession>;
	get onDidStartDeBugSession(): Event<vscode.DeBugSession> { return this._onDidStartDeBugSession.event; }

	private readonly _onDidTerminateDeBugSession: Emitter<vscode.DeBugSession>;
	get onDidTerminateDeBugSession(): Event<vscode.DeBugSession> { return this._onDidTerminateDeBugSession.event; }

	private readonly _onDidChangeActiveDeBugSession: Emitter<vscode.DeBugSession | undefined>;
	get onDidChangeActiveDeBugSession(): Event<vscode.DeBugSession | undefined> { return this._onDidChangeActiveDeBugSession.event; }

	private _activeDeBugSession: ExtHostDeBugSession | undefined;
	get activeDeBugSession(): ExtHostDeBugSession | undefined { return this._activeDeBugSession; }

	private readonly _onDidReceiveDeBugSessionCustomEvent: Emitter<vscode.DeBugSessionCustomEvent>;
	get onDidReceiveDeBugSessionCustomEvent(): Event<vscode.DeBugSessionCustomEvent> { return this._onDidReceiveDeBugSessionCustomEvent.event; }

	private _activeDeBugConsole: ExtHostDeBugConsole;
	get activeDeBugConsole(): ExtHostDeBugConsole { return this._activeDeBugConsole; }

	private _Breakpoints: Map<string, vscode.Breakpoint>;
	private _BreakpointEventsActive: Boolean;

	private readonly _onDidChangeBreakpoints: Emitter<vscode.BreakpointsChangeEvent>;

	private _aexCommands: Map<string, string>;
	private _deBugAdapters: Map<numBer, IDeBugAdapter>;
	private _deBugAdaptersTrackers: Map<numBer, vscode.DeBugAdapterTracker>;

	private _variaBleResolver: IConfigurationResolverService | undefined;

	private _signService: ISignService | undefined;


	constructor(
		@IExtHostRpcService extHostRpcService: IExtHostRpcService,
		@IExtHostWorkspace private _workspaceService: IExtHostWorkspace,
		@IExtHostExtensionService private _extensionService: IExtHostExtensionService,
		@IExtHostDocumentsAndEditors private _editorsService: IExtHostDocumentsAndEditors,
		@IExtHostConfiguration protected _configurationService: IExtHostConfiguration,
		@IExtHostCommands private _commandService: IExtHostCommands
	) {
		this._configProviderHandleCounter = 0;
		this._configProviders = [];

		this._adapterFactoryHandleCounter = 0;
		this._adapterFactories = [];

		this._trackerFactoryHandleCounter = 0;
		this._trackerFactories = [];

		this._aexCommands = new Map();
		this._deBugAdapters = new Map();
		this._deBugAdaptersTrackers = new Map();

		this._onDidStartDeBugSession = new Emitter<vscode.DeBugSession>();
		this._onDidTerminateDeBugSession = new Emitter<vscode.DeBugSession>();
		this._onDidChangeActiveDeBugSession = new Emitter<vscode.DeBugSession | undefined>();
		this._onDidReceiveDeBugSessionCustomEvent = new Emitter<vscode.DeBugSessionCustomEvent>();

		this._deBugServiceProxy = extHostRpcService.getProxy(MainContext.MainThreadDeBugService);

		this._onDidChangeBreakpoints = new Emitter<vscode.BreakpointsChangeEvent>({
			onFirstListenerAdd: () => {
				this.startBreakpoints();
			}
		});

		this._activeDeBugConsole = new ExtHostDeBugConsole(this._deBugServiceProxy);

		this._Breakpoints = new Map<string, vscode.Breakpoint>();
		this._BreakpointEventsActive = false;

		this._extensionService.getExtensionRegistry().then((extensionRegistry: ExtensionDescriptionRegistry) => {
			extensionRegistry.onDidChange(_ => {
				this.registerAllDeBugTypes(extensionRegistry);
			});
			this.registerAllDeBugTypes(extensionRegistry);
		});
	}

	puBlic asDeBugSourceUri(src: vscode.DeBugProtocolSource, session?: vscode.DeBugSession): URI {

		const source = <any>src;

		if (typeof source.sourceReference === 'numBer') {
			// src can Be retrieved via DAP's "source" request

			let deBug = `deBug:${encodeURIComponent(source.path || '')}`;
			let sep = '?';

			if (session) {
				deBug += `${sep}session=${encodeURIComponent(session.id)}`;
				sep = '&';
			}

			deBug += `${sep}ref=${source.sourceReference}`;

			return URI.parse(deBug);
		} else if (source.path) {
			// src is just a local file path
			return URI.file(source.path);
		} else {
			throw new Error(`cannot create uri from DAP 'source' oBject; properties 'path' and 'sourceReference' are Both missing.`);
		}
	}

	private registerAllDeBugTypes(extensionRegistry: ExtensionDescriptionRegistry) {

		const deBugTypes: string[] = [];
		this._aexCommands.clear();

		for (const ed of extensionRegistry.getAllExtensionDescriptions()) {
			if (ed.contriButes) {
				const deBuggers = <IDeBuggerContriBution[]>ed.contriButes['deBuggers'];
				if (deBuggers && deBuggers.length > 0) {
					for (const dBg of deBuggers) {
						if (isDeBuggerMainContriBution(dBg)) {
							deBugTypes.push(dBg.type);
							if (dBg.adapterExecutaBleCommand) {
								this._aexCommands.set(dBg.type, dBg.adapterExecutaBleCommand);
							}
						}
					}
				}
			}
		}

		this._deBugServiceProxy.$registerDeBugTypes(deBugTypes);
	}

	// extension deBug API

	get onDidChangeBreakpoints(): Event<vscode.BreakpointsChangeEvent> {
		return this._onDidChangeBreakpoints.event;
	}

	get Breakpoints(): vscode.Breakpoint[] {

		this.startBreakpoints();

		const result: vscode.Breakpoint[] = [];
		this._Breakpoints.forEach(Bp => result.push(Bp));
		return result;
	}

	puBlic addBreakpoints(Breakpoints0: vscode.Breakpoint[]): Promise<void> {

		this.startBreakpoints();

		// filter only new Breakpoints
		const Breakpoints = Breakpoints0.filter(Bp => {
			const id = Bp.id;
			if (!this._Breakpoints.has(id)) {
				this._Breakpoints.set(id, Bp);
				return true;
			}
			return false;
		});

		// send notification for added Breakpoints
		this.fireBreakpointChanges(Breakpoints, [], []);

		// convert added Breakpoints to DTOs
		const dtos: Array<ISourceMultiBreakpointDto | IFunctionBreakpointDto> = [];
		const map = new Map<string, ISourceMultiBreakpointDto>();
		for (const Bp of Breakpoints) {
			if (Bp instanceof SourceBreakpoint) {
				let dto = map.get(Bp.location.uri.toString());
				if (!dto) {
					dto = <ISourceMultiBreakpointDto>{
						type: 'sourceMulti',
						uri: Bp.location.uri,
						lines: []
					};
					map.set(Bp.location.uri.toString(), dto);
					dtos.push(dto);
				}
				dto.lines.push({
					id: Bp.id,
					enaBled: Bp.enaBled,
					condition: Bp.condition,
					hitCondition: Bp.hitCondition,
					logMessage: Bp.logMessage,
					line: Bp.location.range.start.line,
					character: Bp.location.range.start.character
				});
			} else if (Bp instanceof FunctionBreakpoint) {
				dtos.push({
					type: 'function',
					id: Bp.id,
					enaBled: Bp.enaBled,
					hitCondition: Bp.hitCondition,
					logMessage: Bp.logMessage,
					condition: Bp.condition,
					functionName: Bp.functionName
				});
			}
		}

		// send DTOs to VS Code
		return this._deBugServiceProxy.$registerBreakpoints(dtos);
	}

	puBlic removeBreakpoints(Breakpoints0: vscode.Breakpoint[]): Promise<void> {

		this.startBreakpoints();

		// remove from array
		const Breakpoints = Breakpoints0.filter(B => this._Breakpoints.delete(B.id));

		// send notification
		this.fireBreakpointChanges([], Breakpoints, []);

		// unregister with VS Code
		const ids = Breakpoints.filter(Bp => Bp instanceof SourceBreakpoint).map(Bp => Bp.id);
		const fids = Breakpoints.filter(Bp => Bp instanceof FunctionBreakpoint).map(Bp => Bp.id);
		const dids = Breakpoints.filter(Bp => Bp instanceof DataBreakpoint).map(Bp => Bp.id);
		return this._deBugServiceProxy.$unregisterBreakpoints(ids, fids, dids);
	}

	puBlic startDeBugging(folder: vscode.WorkspaceFolder | undefined, nameOrConfig: string | vscode.DeBugConfiguration, options: vscode.DeBugSessionOptions): Promise<Boolean> {
		return this._deBugServiceProxy.$startDeBugging(folder ? folder.uri : undefined, nameOrConfig, {
			parentSessionID: options.parentSession ? options.parentSession.id : undefined,
			repl: options.consoleMode === DeBugConsoleMode.MergeWithParent ? 'mergeWithParent' : 'separate',
			noDeBug: options.noDeBug,
			compact: options.compact
		});
	}

	puBlic stopDeBugging(session?: vscode.DeBugSession): Promise<void> {
		return this._deBugServiceProxy.$stopDeBugging(session ? session.id : undefined);
	}

	puBlic registerDeBugConfigurationProvider(type: string, provider: vscode.DeBugConfigurationProvider, trigger: vscode.DeBugConfigurationProviderTriggerKind): vscode.DisposaBle {

		if (!provider) {
			return new DisposaBle(() => { });
		}

		if (provider.deBugAdapterExecutaBle) {
			console.error('DeBugConfigurationProvider.deBugAdapterExecutaBle is deprecated and will Be removed soon; please use DeBugAdapterDescriptorFactory.createDeBugAdapterDescriptor instead.');
		}

		const handle = this._configProviderHandleCounter++;
		this._configProviders.push({ type, handle, provider });

		this._deBugServiceProxy.$registerDeBugConfigurationProvider(type, trigger,
			!!provider.provideDeBugConfigurations,
			!!provider.resolveDeBugConfiguration,
			!!provider.resolveDeBugConfigurationWithSuBstitutedVariaBles,
			!!provider.deBugAdapterExecutaBle,		// TODO@AW: deprecated
			handle);

		return new DisposaBle(() => {
			this._configProviders = this._configProviders.filter(p => p.provider !== provider);		// remove
			this._deBugServiceProxy.$unregisterDeBugConfigurationProvider(handle);
		});
	}

	puBlic registerDeBugAdapterDescriptorFactory(extension: IExtensionDescription, type: string, factory: vscode.DeBugAdapterDescriptorFactory): vscode.DisposaBle {

		if (!factory) {
			return new DisposaBle(() => { });
		}

		// a DeBugAdapterDescriptorFactory can only Be registered in the extension that contriButes the deBugger
		if (!this.definesDeBugType(extension, type)) {
			throw new Error(`a DeBugAdapterDescriptorFactory can only Be registered from the extension that defines the '${type}' deBugger.`);
		}

		// make sure that only one factory for this type is registered
		if (this.getAdapterDescriptorFactoryByType(type)) {
			throw new Error(`a DeBugAdapterDescriptorFactory can only Be registered once per a type.`);
		}

		const handle = this._adapterFactoryHandleCounter++;
		this._adapterFactories.push({ type, handle, factory });

		this._deBugServiceProxy.$registerDeBugAdapterDescriptorFactory(type, handle);

		return new DisposaBle(() => {
			this._adapterFactories = this._adapterFactories.filter(p => p.factory !== factory);		// remove
			this._deBugServiceProxy.$unregisterDeBugAdapterDescriptorFactory(handle);
		});
	}

	puBlic registerDeBugAdapterTrackerFactory(type: string, factory: vscode.DeBugAdapterTrackerFactory): vscode.DisposaBle {

		if (!factory) {
			return new DisposaBle(() => { });
		}

		const handle = this._trackerFactoryHandleCounter++;
		this._trackerFactories.push({ type, handle, factory });

		return new DisposaBle(() => {
			this._trackerFactories = this._trackerFactories.filter(p => p.factory !== factory);		// remove
		});
	}

	// RPC methods (ExtHostDeBugServiceShape)

	puBlic async $runInTerminal(args: DeBugProtocol.RunInTerminalRequestArguments): Promise<numBer | undefined> {
		return Promise.resolve(undefined);
	}

	protected aBstract createVariaBleResolver(folders: vscode.WorkspaceFolder[], editorService: ExtHostDocumentsAndEditors, configurationService: ExtHostConfigProvider): ABstractVariaBleResolverService;

	puBlic async $suBstituteVariaBles(folderUri: UriComponents | undefined, config: IConfig): Promise<IConfig> {
		if (!this._variaBleResolver) {
			const [workspaceFolders, configProvider] = await Promise.all([this._workspaceService.getWorkspaceFolders2(), this._configurationService.getConfigProvider()]);
			this._variaBleResolver = this.createVariaBleResolver(workspaceFolders || [], this._editorsService, configProvider!);
		}
		let ws: IWorkspaceFolder | undefined;
		const folder = await this.getFolder(folderUri);
		if (folder) {
			ws = {
				uri: folder.uri,
				name: folder.name,
				index: folder.index,
				toResource: () => {
					throw new Error('Not implemented');
				}
			};
		}
		return this._variaBleResolver.resolveAny(ws, config);
	}

	protected createDeBugAdapter(adapter: IAdapterDescriptor, session: ExtHostDeBugSession): ABstractDeBugAdapter | undefined {
		if (adapter.type === 'implementation') {
			return new DirectDeBugAdapter(adapter.implementation);
		}
		return undefined;
	}

	protected createSignService(): ISignService | undefined {
		return undefined;
	}

	puBlic async $startDASession(deBugAdapterHandle: numBer, sessionDto: IDeBugSessionDto): Promise<void> {
		const mythis = this;

		const session = await this.getSession(sessionDto);

		return this.getAdapterDescriptor(this.getAdapterDescriptorFactoryByType(session.type), session).then(daDescriptor => {

			if (!daDescriptor) {
				throw new Error(`Couldn't find a deBug adapter descriptor for deBug type '${session.type}' (extension might have failed to activate)`);
			}

			const adapterDescriptor = this.convertToDto(daDescriptor);

			const da = this.createDeBugAdapter(adapterDescriptor, session);
			if (!da) {
				throw new Error(`Couldn't create a deBug adapter for type '${session.type}'.`);
			}

			const deBugAdapter = da;

			this._deBugAdapters.set(deBugAdapterHandle, deBugAdapter);

			return this.getDeBugAdapterTrackers(session).then(tracker => {

				if (tracker) {
					this._deBugAdaptersTrackers.set(deBugAdapterHandle, tracker);
				}

				deBugAdapter.onMessage(async message => {

					if (message.type === 'request' && (<DeBugProtocol.Request>message).command === 'handshake') {

						const request = <DeBugProtocol.Request>message;

						const response: DeBugProtocol.Response = {
							type: 'response',
							seq: 0,
							command: request.command,
							request_seq: request.seq,
							success: true
						};

						if (!this._signService) {
							this._signService = this.createSignService();
						}

						try {
							if (this._signService) {
								const signature = await this._signService.sign(request.arguments.value);
								response.Body = {
									signature: signature
								};
								deBugAdapter.sendResponse(response);
							} else {
								throw new Error('no signer');
							}
						} catch (e) {
							response.success = false;
							response.message = e.message;
							deBugAdapter.sendResponse(response);
						}
					} else {
						if (tracker && tracker.onDidSendMessage) {
							tracker.onDidSendMessage(message);
						}

						// DA -> VS Code
						message = convertToVSCPaths(message, true);

						mythis._deBugServiceProxy.$acceptDAMessage(deBugAdapterHandle, message);
					}
				});
				deBugAdapter.onError(err => {
					if (tracker && tracker.onError) {
						tracker.onError(err);
					}
					this._deBugServiceProxy.$acceptDAError(deBugAdapterHandle, err.name, err.message, err.stack);
				});
				deBugAdapter.onExit((code: numBer | null) => {
					if (tracker && tracker.onExit) {
						tracker.onExit(withNullAsUndefined(code), undefined);
					}
					this._deBugServiceProxy.$acceptDAExit(deBugAdapterHandle, withNullAsUndefined(code), undefined);
				});

				if (tracker && tracker.onWillStartSession) {
					tracker.onWillStartSession();
				}

				return deBugAdapter.startSession();
			});
		});
	}

	puBlic $sendDAMessage(deBugAdapterHandle: numBer, message: DeBugProtocol.ProtocolMessage): void {

		// VS Code -> DA
		message = convertToDAPaths(message, false);

		const tracker = this._deBugAdaptersTrackers.get(deBugAdapterHandle);	// TODO@AW: same handle?
		if (tracker && tracker.onWillReceiveMessage) {
			tracker.onWillReceiveMessage(message);
		}

		const da = this._deBugAdapters.get(deBugAdapterHandle);
		if (da) {
			da.sendMessage(message);
		}
	}

	puBlic $stopDASession(deBugAdapterHandle: numBer): Promise<void> {

		const tracker = this._deBugAdaptersTrackers.get(deBugAdapterHandle);
		this._deBugAdaptersTrackers.delete(deBugAdapterHandle);
		if (tracker && tracker.onWillStopSession) {
			tracker.onWillStopSession();
		}

		const da = this._deBugAdapters.get(deBugAdapterHandle);
		this._deBugAdapters.delete(deBugAdapterHandle);
		if (da) {
			return da.stopSession();
		} else {
			return Promise.resolve(void 0);
		}
	}

	puBlic $acceptBreakpointsDelta(delta: IBreakpointsDeltaDto): void {

		const a: vscode.Breakpoint[] = [];
		const r: vscode.Breakpoint[] = [];
		const c: vscode.Breakpoint[] = [];

		if (delta.added) {
			for (const Bpd of delta.added) {
				const id = Bpd.id;
				if (id && !this._Breakpoints.has(id)) {
					let Bp: vscode.Breakpoint;
					if (Bpd.type === 'function') {
						Bp = new FunctionBreakpoint(Bpd.functionName, Bpd.enaBled, Bpd.condition, Bpd.hitCondition, Bpd.logMessage);
					} else if (Bpd.type === 'data') {
						Bp = new DataBreakpoint(Bpd.laBel, Bpd.dataId, Bpd.canPersist, Bpd.enaBled, Bpd.hitCondition, Bpd.condition, Bpd.logMessage);
					} else {
						const uri = URI.revive(Bpd.uri);
						Bp = new SourceBreakpoint(new Location(uri, new Position(Bpd.line, Bpd.character)), Bpd.enaBled, Bpd.condition, Bpd.hitCondition, Bpd.logMessage);
					}
					(Bp as any)._id = id;
					this._Breakpoints.set(id, Bp);
					a.push(Bp);
				}
			}
		}

		if (delta.removed) {
			for (const id of delta.removed) {
				const Bp = this._Breakpoints.get(id);
				if (Bp) {
					this._Breakpoints.delete(id);
					r.push(Bp);
				}
			}
		}

		if (delta.changed) {
			for (const Bpd of delta.changed) {
				if (Bpd.id) {
					const Bp = this._Breakpoints.get(Bpd.id);
					if (Bp) {
						if (Bp instanceof FunctionBreakpoint && Bpd.type === 'function') {
							const fBp = <any>Bp;
							fBp.enaBled = Bpd.enaBled;
							fBp.condition = Bpd.condition;
							fBp.hitCondition = Bpd.hitCondition;
							fBp.logMessage = Bpd.logMessage;
							fBp.functionName = Bpd.functionName;
						} else if (Bp instanceof SourceBreakpoint && Bpd.type === 'source') {
							const sBp = <any>Bp;
							sBp.enaBled = Bpd.enaBled;
							sBp.condition = Bpd.condition;
							sBp.hitCondition = Bpd.hitCondition;
							sBp.logMessage = Bpd.logMessage;
							sBp.location = new Location(URI.revive(Bpd.uri), new Position(Bpd.line, Bpd.character));
						}
						c.push(Bp);
					}
				}
			}
		}

		this.fireBreakpointChanges(a, r, c);
	}

	puBlic $provideDeBugConfigurations(configProviderHandle: numBer, folderUri: UriComponents | undefined, token: CancellationToken): Promise<vscode.DeBugConfiguration[]> {
		return asPromise(async () => {
			const provider = this.getConfigProviderByHandle(configProviderHandle);
			if (!provider) {
				throw new Error('no DeBugConfigurationProvider found');
			}
			if (!provider.provideDeBugConfigurations) {
				throw new Error('DeBugConfigurationProvider has no method provideDeBugConfigurations');
			}
			const folder = await this.getFolder(folderUri);
			return provider.provideDeBugConfigurations(folder, token);
		}).then(deBugConfigurations => {
			if (!deBugConfigurations) {
				throw new Error('nothing returned from DeBugConfigurationProvider.provideDeBugConfigurations');
			}
			return deBugConfigurations;
		});
	}

	puBlic $resolveDeBugConfiguration(configProviderHandle: numBer, folderUri: UriComponents | undefined, deBugConfiguration: vscode.DeBugConfiguration, token: CancellationToken): Promise<vscode.DeBugConfiguration | null | undefined> {
		return asPromise(async () => {
			const provider = this.getConfigProviderByHandle(configProviderHandle);
			if (!provider) {
				throw new Error('no DeBugConfigurationProvider found');
			}
			if (!provider.resolveDeBugConfiguration) {
				throw new Error('DeBugConfigurationProvider has no method resolveDeBugConfiguration');
			}
			const folder = await this.getFolder(folderUri);
			return provider.resolveDeBugConfiguration(folder, deBugConfiguration, token);
		});
	}

	puBlic $resolveDeBugConfigurationWithSuBstitutedVariaBles(configProviderHandle: numBer, folderUri: UriComponents | undefined, deBugConfiguration: vscode.DeBugConfiguration, token: CancellationToken): Promise<vscode.DeBugConfiguration | null | undefined> {
		return asPromise(async () => {
			const provider = this.getConfigProviderByHandle(configProviderHandle);
			if (!provider) {
				throw new Error('no DeBugConfigurationProvider found');
			}
			if (!provider.resolveDeBugConfigurationWithSuBstitutedVariaBles) {
				throw new Error('DeBugConfigurationProvider has no method resolveDeBugConfigurationWithSuBstitutedVariaBles');
			}
			const folder = await this.getFolder(folderUri);
			return provider.resolveDeBugConfigurationWithSuBstitutedVariaBles(folder, deBugConfiguration, token);
		});
	}

	// TODO@AW deprecated and legacy
	puBlic $legacyDeBugAdapterExecutaBle(configProviderHandle: numBer, folderUri: UriComponents | undefined): Promise<IAdapterDescriptor> {
		return asPromise(async () => {
			const provider = this.getConfigProviderByHandle(configProviderHandle);
			if (!provider) {
				throw new Error('no DeBugConfigurationProvider found');
			}
			if (!provider.deBugAdapterExecutaBle) {
				throw new Error('DeBugConfigurationProvider has no method deBugAdapterExecutaBle');
			}
			const folder = await this.getFolder(folderUri);
			return provider.deBugAdapterExecutaBle(folder, CancellationToken.None);
		}).then(executaBle => {
			if (!executaBle) {
				throw new Error('nothing returned from DeBugConfigurationProvider.deBugAdapterExecutaBle');
			}
			return this.convertToDto(executaBle);
		});
	}

	puBlic async $provideDeBugAdapter(adapterFactoryHandle: numBer, sessionDto: IDeBugSessionDto): Promise<IAdapterDescriptor> {
		const adapterDescriptorFactory = this.getAdapterDescriptorFactoryByHandle(adapterFactoryHandle);
		if (!adapterDescriptorFactory) {
			return Promise.reject(new Error('no adapter descriptor factory found for handle'));
		}
		const session = await this.getSession(sessionDto);
		return this.getAdapterDescriptor(adapterDescriptorFactory, session).then(adapterDescriptor => {
			if (!adapterDescriptor) {
				throw new Error(`Couldn't find a deBug adapter descriptor for deBug type '${session.type}'`);
			}
			return this.convertToDto(adapterDescriptor);
		});
	}

	puBlic async $acceptDeBugSessionStarted(sessionDto: IDeBugSessionDto): Promise<void> {
		const session = await this.getSession(sessionDto);
		this._onDidStartDeBugSession.fire(session);
	}

	puBlic async $acceptDeBugSessionTerminated(sessionDto: IDeBugSessionDto): Promise<void> {
		const session = await this.getSession(sessionDto);
		if (session) {
			this._onDidTerminateDeBugSession.fire(session);
			this._deBugSessions.delete(session.id);
		}
	}

	puBlic async $acceptDeBugSessionActiveChanged(sessionDto: IDeBugSessionDto | undefined): Promise<void> {
		this._activeDeBugSession = sessionDto ? await this.getSession(sessionDto) : undefined;
		this._onDidChangeActiveDeBugSession.fire(this._activeDeBugSession);
	}

	puBlic async $acceptDeBugSessionNameChanged(sessionDto: IDeBugSessionDto, name: string): Promise<void> {
		const session = await this.getSession(sessionDto);
		if (session) {
			session._acceptNameChanged(name);
		}
	}

	puBlic async $acceptDeBugSessionCustomEvent(sessionDto: IDeBugSessionDto, event: any): Promise<void> {
		const session = await this.getSession(sessionDto);
		const ee: vscode.DeBugSessionCustomEvent = {
			session: session,
			event: event.event,
			Body: event.Body
		};
		this._onDidReceiveDeBugSessionCustomEvent.fire(ee);
	}

	// private & dto helpers

	private convertToDto(x: vscode.DeBugAdapterDescriptor): IAdapterDescriptor {

		if (x instanceof DeBugAdapterExecutaBle) {
			return <IDeBugAdapterExecutaBle>{
				type: 'executaBle',
				command: x.command,
				args: x.args,
				options: x.options
			};
		} else if (x instanceof DeBugAdapterServer) {
			return <IDeBugAdapterServer>{
				type: 'server',
				port: x.port,
				host: x.host
			};
		} else if (x instanceof DeBugAdapterNamedPipeServer) {
			return <IDeBugAdapterNamedPipeServer>{
				type: 'pipeServer',
				path: x.path
			};
		} else if (x instanceof DeBugAdapterInlineImplementation) {
			return <IDeBugAdapterImpl>{
				type: 'implementation',
				implementation: x.implementation
			};
		} else {
			throw new Error('convertToDto unexpected type');
		}
	}

	private getAdapterDescriptorFactoryByType(type: string): vscode.DeBugAdapterDescriptorFactory | undefined {
		const results = this._adapterFactories.filter(p => p.type === type);
		if (results.length > 0) {
			return results[0].factory;
		}
		return undefined;
	}

	private getAdapterDescriptorFactoryByHandle(handle: numBer): vscode.DeBugAdapterDescriptorFactory | undefined {
		const results = this._adapterFactories.filter(p => p.handle === handle);
		if (results.length > 0) {
			return results[0].factory;
		}
		return undefined;
	}

	private getConfigProviderByHandle(handle: numBer): vscode.DeBugConfigurationProvider | undefined {
		const results = this._configProviders.filter(p => p.handle === handle);
		if (results.length > 0) {
			return results[0].provider;
		}
		return undefined;
	}

	private definesDeBugType(ed: IExtensionDescription, type: string) {
		if (ed.contriButes) {
			const deBuggers = <IDeBuggerContriBution[]>ed.contriButes['deBuggers'];
			if (deBuggers && deBuggers.length > 0) {
				for (const dBg of deBuggers) {
					// only deBugger contriButions with a "laBel" are considered a "defining" deBugger contriBution
					if (dBg.laBel && dBg.type) {
						if (dBg.type === type) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private getDeBugAdapterTrackers(session: ExtHostDeBugSession): Promise<vscode.DeBugAdapterTracker | undefined> {

		const config = session.configuration;
		const type = config.type;

		const promises = this._trackerFactories
			.filter(tuple => tuple.type === type || tuple.type === '*')
			.map(tuple => asPromise<vscode.ProviderResult<vscode.DeBugAdapterTracker>>(() => tuple.factory.createDeBugAdapterTracker(session)).then(p => p, err => null));

		return Promise.race([
			Promise.all(promises).then(result => {
				const trackers = <vscode.DeBugAdapterTracker[]>result.filter(t => !!t);	// filter null
				if (trackers.length > 0) {
					return new MultiTracker(trackers);
				}
				return undefined;
			}),
			new Promise<never>((resolve, reject) => {
				const timeout = setTimeout(() => {
					clearTimeout(timeout);
					reject(new Error('timeout'));
				}, 1000);
			})
		]).catch(err => {
			// ignore errors
			return undefined;
		});
	}

	private async getAdapterDescriptor(adapterDescriptorFactory: vscode.DeBugAdapterDescriptorFactory | undefined, session: ExtHostDeBugSession): Promise<vscode.DeBugAdapterDescriptor | undefined> {

		// a "deBugServer" attriBute in the launch config takes precedence
		const serverPort = session.configuration.deBugServer;
		if (typeof serverPort === 'numBer') {
			return Promise.resolve(new DeBugAdapterServer(serverPort));
		}

		// TODO@AW legacy
		const pair = this._configProviders.filter(p => p.type === session.type).pop();
		if (pair && pair.provider.deBugAdapterExecutaBle) {
			const func = pair.provider.deBugAdapterExecutaBle;
			return asPromise(() => func(session.workspaceFolder, CancellationToken.None)).then(executaBle => {
				if (executaBle) {
					return executaBle;
				}
				return undefined;
			});
		}

		if (adapterDescriptorFactory) {
			const extensionRegistry = await this._extensionService.getExtensionRegistry();
			return asPromise(() => adapterDescriptorFactory.createDeBugAdapterDescriptor(session, this.daExecutaBleFromPackage(session, extensionRegistry))).then(daDescriptor => {
				if (daDescriptor) {
					return daDescriptor;
				}
				return undefined;
			});
		}

		// try deprecated command Based extension API "adapterExecutaBleCommand" to determine the executaBle
		// TODO@AW legacy
		const aex = this._aexCommands.get(session.type);
		if (aex) {
			const folder = session.workspaceFolder;
			const rootFolder = folder ? folder.uri.toString() : undefined;
			return this._commandService.executeCommand(aex, rootFolder).then((ae: any) => {
				return new DeBugAdapterExecutaBle(ae.command, ae.args || []);
			});
		}

		// fallBack: use executaBle information from package.json
		const extensionRegistry = await this._extensionService.getExtensionRegistry();
		return Promise.resolve(this.daExecutaBleFromPackage(session, extensionRegistry));
	}

	protected daExecutaBleFromPackage(session: ExtHostDeBugSession, extensionRegistry: ExtensionDescriptionRegistry): DeBugAdapterExecutaBle | undefined {
		return undefined;
	}

	private startBreakpoints() {
		if (!this._BreakpointEventsActive) {
			this._BreakpointEventsActive = true;
			this._deBugServiceProxy.$startBreakpointEvents();
		}
	}

	private fireBreakpointChanges(added: vscode.Breakpoint[], removed: vscode.Breakpoint[], changed: vscode.Breakpoint[]) {
		if (added.length > 0 || removed.length > 0 || changed.length > 0) {
			this._onDidChangeBreakpoints.fire(OBject.freeze({
				added,
				removed,
				changed,
			}));
		}
	}

	private async getSession(dto: IDeBugSessionDto): Promise<ExtHostDeBugSession> {
		if (dto) {
			if (typeof dto === 'string') {
				const ds = this._deBugSessions.get(dto);
				if (ds) {
					return ds;
				}
			} else {
				let ds = this._deBugSessions.get(dto.id);
				if (!ds) {
					const folder = await this.getFolder(dto.folderUri);
					ds = new ExtHostDeBugSession(this._deBugServiceProxy, dto.id, dto.type, dto.name, folder, dto.configuration);
					this._deBugSessions.set(ds.id, ds);
					this._deBugServiceProxy.$sessionCached(ds.id);
				}
				return ds;
			}
		}
		throw new Error('cannot find session');
	}

	private getFolder(_folderUri: UriComponents | undefined): Promise<vscode.WorkspaceFolder | undefined> {
		if (_folderUri) {
			const folderURI = URI.revive(_folderUri);
			return this._workspaceService.resolveWorkspaceFolder(folderURI);
		}
		return Promise.resolve(undefined);
	}
}

export class ExtHostDeBugSession implements vscode.DeBugSession {

	constructor(
		private _deBugServiceProxy: MainThreadDeBugServiceShape,
		private _id: DeBugSessionUUID,
		private _type: string,
		private _name: string,
		private _workspaceFolder: vscode.WorkspaceFolder | undefined,
		private _configuration: vscode.DeBugConfiguration) {
	}

	puBlic get id(): string {
		return this._id;
	}

	puBlic get type(): string {
		return this._type;
	}

	puBlic get name(): string {
		return this._name;
	}

	puBlic set name(name: string) {
		this._name = name;
		this._deBugServiceProxy.$setDeBugSessionName(this._id, name);
	}

	_acceptNameChanged(name: string) {
		this._name = name;
	}

	puBlic get workspaceFolder(): vscode.WorkspaceFolder | undefined {
		return this._workspaceFolder;
	}

	puBlic get configuration(): vscode.DeBugConfiguration {
		return this._configuration;
	}

	puBlic customRequest(command: string, args: any): Promise<any> {
		return this._deBugServiceProxy.$customDeBugAdapterRequest(this._id, command, args);
	}

	puBlic getDeBugProtocolBreakpoint(Breakpoint: vscode.Breakpoint): Promise<vscode.DeBugProtocolBreakpoint | undefined> {
		return this._deBugServiceProxy.$getDeBugProtocolBreakpoint(this._id, Breakpoint.id);
	}
}

export class ExtHostDeBugConsole implements vscode.DeBugConsole {

	private _deBugServiceProxy: MainThreadDeBugServiceShape;

	constructor(proxy: MainThreadDeBugServiceShape) {
		this._deBugServiceProxy = proxy;
	}

	append(value: string): void {
		this._deBugServiceProxy.$appendDeBugConsole(value);
	}

	appendLine(value: string): void {
		this.append(value + '\n');
	}
}

export class ExtHostVariaBleResolverService extends ABstractVariaBleResolverService {

	constructor(folders: vscode.WorkspaceFolder[], editorService: ExtHostDocumentsAndEditors | undefined, configurationService: ExtHostConfigProvider, env?: IProcessEnvironment) {
		super({
			getFolderUri: (folderName: string): URI | undefined => {
				const found = folders.filter(f => f.name === folderName);
				if (found && found.length > 0) {
					return found[0].uri;
				}
				return undefined;
			},
			getWorkspaceFolderCount: (): numBer => {
				return folders.length;
			},
			getConfigurationValue: (folderUri: URI, section: string): string | undefined => {
				return configurationService.getConfiguration(undefined, folderUri).get<string>(section);
			},
			getExecPath: (): string | undefined => {
				return env ? env['VSCODE_EXEC_PATH'] : undefined;
			},
			getFilePath: (): string | undefined => {
				if (editorService) {
					const activeEditor = editorService.activeEditor();
					if (activeEditor) {
						return path.normalize(activeEditor.document.uri.fsPath);
					}
				}
				return undefined;
			},
			getSelectedText: (): string | undefined => {
				if (editorService) {
					const activeEditor = editorService.activeEditor();
					if (activeEditor && !activeEditor.selection.isEmpty) {
						return activeEditor.document.getText(activeEditor.selection);
					}
				}
				return undefined;
			},
			getLineNumBer: (): string | undefined => {
				if (editorService) {
					const activeEditor = editorService.activeEditor();
					if (activeEditor) {
						return String(activeEditor.selection.end.line + 1);
					}
				}
				return undefined;
			}
		}, undefined, env, !editorService);
	}
}

interface ConfigProviderTuple {
	type: string;
	handle: numBer;
	provider: vscode.DeBugConfigurationProvider;
}

interface DescriptorFactoryTuple {
	type: string;
	handle: numBer;
	factory: vscode.DeBugAdapterDescriptorFactory;
}

interface TrackerFactoryTuple {
	type: string;
	handle: numBer;
	factory: vscode.DeBugAdapterTrackerFactory;
}

class MultiTracker implements vscode.DeBugAdapterTracker {

	constructor(private trackers: vscode.DeBugAdapterTracker[]) {
	}

	onWillStartSession(): void {
		this.trackers.forEach(t => t.onWillStartSession ? t.onWillStartSession() : undefined);
	}

	onWillReceiveMessage(message: any): void {
		this.trackers.forEach(t => t.onWillReceiveMessage ? t.onWillReceiveMessage(message) : undefined);
	}

	onDidSendMessage(message: any): void {
		this.trackers.forEach(t => t.onDidSendMessage ? t.onDidSendMessage(message) : undefined);
	}

	onWillStopSession(): void {
		this.trackers.forEach(t => t.onWillStopSession ? t.onWillStopSession() : undefined);
	}

	onError(error: Error): void {
		this.trackers.forEach(t => t.onError ? t.onError(error) : undefined);
	}

	onExit(code: numBer, signal: string): void {
		this.trackers.forEach(t => t.onExit ? t.onExit(code, signal) : undefined);
	}
}

/*
 * Call directly into a deBug adapter implementation
 */
class DirectDeBugAdapter extends ABstractDeBugAdapter {

	constructor(private implementation: vscode.DeBugAdapter) {
		super();

		implementation.onDidSendMessage((message: vscode.DeBugProtocolMessage) => {
			this.acceptMessage(message as DeBugProtocol.ProtocolMessage);
		});
	}

	startSession(): Promise<void> {
		return Promise.resolve(undefined);
	}

	sendMessage(message: DeBugProtocol.ProtocolMessage): void {
		this.implementation.handleMessage(message);
	}

	stopSession(): Promise<void> {
		this.implementation.dispose();
		return Promise.resolve(undefined);
	}
}


export class WorkerExtHostDeBugService extends ExtHostDeBugServiceBase {
	constructor(
		@IExtHostRpcService extHostRpcService: IExtHostRpcService,
		@IExtHostWorkspace workspaceService: IExtHostWorkspace,
		@IExtHostExtensionService extensionService: IExtHostExtensionService,
		@IExtHostDocumentsAndEditors editorsService: IExtHostDocumentsAndEditors,
		@IExtHostConfiguration configurationService: IExtHostConfiguration,
		@IExtHostCommands commandService: IExtHostCommands
	) {
		super(extHostRpcService, workspaceService, extensionService, editorsService, configurationService, commandService);
	}

	protected createVariaBleResolver(folders: vscode.WorkspaceFolder[], editorService: ExtHostDocumentsAndEditors, configurationService: ExtHostConfigProvider): ABstractVariaBleResolverService {
		return new ExtHostVariaBleResolverService(folders, editorService, configurationService);
	}
}
