/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI as uri, UriComponents } from 'vs/Base/common/uri';
import { IDeBugService, IConfig, IDeBugConfigurationProvider, IBreakpoint, IFunctionBreakpoint, IBreakpointData, IDeBugAdapter, IDeBugAdapterDescriptorFactory, IDeBugSession, IDeBugAdapterFactory, IDataBreakpoint, IDeBugSessionOptions } from 'vs/workBench/contriB/deBug/common/deBug';
import {
	ExtHostContext, ExtHostDeBugServiceShape, MainThreadDeBugServiceShape, DeBugSessionUUID, MainContext,
	IExtHostContext, IBreakpointsDeltaDto, ISourceMultiBreakpointDto, ISourceBreakpointDto, IFunctionBreakpointDto, IDeBugSessionDto, IDataBreakpointDto, IStartDeBuggingOptions, IDeBugConfiguration
} from 'vs/workBench/api/common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import severity from 'vs/Base/common/severity';
import { ABstractDeBugAdapter } from 'vs/workBench/contriB/deBug/common/aBstractDeBugAdapter';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { convertToVSCPaths, convertToDAPaths } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { DeBugConfigurationProviderTriggerKind } from 'vs/workBench/api/common/extHostTypes';

@extHostNamedCustomer(MainContext.MainThreadDeBugService)
export class MainThreadDeBugService implements MainThreadDeBugServiceShape, IDeBugAdapterFactory {

	private readonly _proxy: ExtHostDeBugServiceShape;
	private readonly _toDispose = new DisposaBleStore();
	private _BreakpointEventsActive: Boolean | undefined;
	private readonly _deBugAdapters: Map<numBer, ExtensionHostDeBugAdapter>;
	private _deBugAdaptersHandleCounter = 1;
	private readonly _deBugConfigurationProviders: Map<numBer, IDeBugConfigurationProvider>;
	private readonly _deBugAdapterDescriptorFactories: Map<numBer, IDeBugAdapterDescriptorFactory>;
	private readonly _sessions: Set<DeBugSessionUUID>;

	constructor(
		extHostContext: IExtHostContext,
		@IDeBugService private readonly deBugService: IDeBugService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDeBugService);
		this._toDispose.add(deBugService.onDidNewSession(session => {
			this._proxy.$acceptDeBugSessionStarted(this.getSessionDto(session));
			this._toDispose.add(session.onDidChangeName(name => {
				this._proxy.$acceptDeBugSessionNameChanged(this.getSessionDto(session), name);
			}));
		}));
		// Need to start listening early to new session events Because a custom event can come while a session is initialising
		this._toDispose.add(deBugService.onWillNewSession(session => {
			this._toDispose.add(session.onDidCustomEvent(event => this._proxy.$acceptDeBugSessionCustomEvent(this.getSessionDto(session), event)));
		}));
		this._toDispose.add(deBugService.onDidEndSession(session => {
			this._proxy.$acceptDeBugSessionTerminated(this.getSessionDto(session));
			this._sessions.delete(session.getId());
		}));
		this._toDispose.add(deBugService.getViewModel().onDidFocusSession(session => {
			this._proxy.$acceptDeBugSessionActiveChanged(this.getSessionDto(session));
		}));

		this._deBugAdapters = new Map();
		this._deBugConfigurationProviders = new Map();
		this._deBugAdapterDescriptorFactories = new Map();
		this._sessions = new Set();
	}

	puBlic dispose(): void {
		this._toDispose.dispose();
	}

	// interface IDeBugAdapterProvider

	createDeBugAdapter(session: IDeBugSession): IDeBugAdapter {
		const handle = this._deBugAdaptersHandleCounter++;
		const da = new ExtensionHostDeBugAdapter(this, handle, this._proxy, session);
		this._deBugAdapters.set(handle, da);
		return da;
	}

	suBstituteVariaBles(folder: IWorkspaceFolder | undefined, config: IConfig): Promise<IConfig> {
		return Promise.resolve(this._proxy.$suBstituteVariaBles(folder ? folder.uri : undefined, config));
	}

	runInTerminal(args: DeBugProtocol.RunInTerminalRequestArguments): Promise<numBer | undefined> {
		return this._proxy.$runInTerminal(args);
	}

	// RPC methods (MainThreadDeBugServiceShape)

	puBlic $registerDeBugTypes(deBugTypes: string[]) {
		this._toDispose.add(this.deBugService.getConfigurationManager().registerDeBugAdapterFactory(deBugTypes, this));
	}

	puBlic $startBreakpointEvents(): void {

		if (!this._BreakpointEventsActive) {
			this._BreakpointEventsActive = true;

			// set up a handler to send more
			this._toDispose.add(this.deBugService.getModel().onDidChangeBreakpoints(e => {
				// Ignore session only Breakpoint events since they should only reflect in the UI
				if (e && !e.sessionOnly) {
					const delta: IBreakpointsDeltaDto = {};
					if (e.added) {
						delta.added = this.convertToDto(e.added);
					}
					if (e.removed) {
						delta.removed = e.removed.map(x => x.getId());
					}
					if (e.changed) {
						delta.changed = this.convertToDto(e.changed);
					}

					if (delta.added || delta.removed || delta.changed) {
						this._proxy.$acceptBreakpointsDelta(delta);
					}
				}
			}));

			// send all Breakpoints
			const Bps = this.deBugService.getModel().getBreakpoints();
			const fBps = this.deBugService.getModel().getFunctionBreakpoints();
			const dBps = this.deBugService.getModel().getDataBreakpoints();
			if (Bps.length > 0 || fBps.length > 0) {
				this._proxy.$acceptBreakpointsDelta({
					added: this.convertToDto(Bps).concat(this.convertToDto(fBps)).concat(this.convertToDto(dBps))
				});
			}
		}
	}

	puBlic $registerBreakpoints(DTOs: Array<ISourceMultiBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto>): Promise<void> {

		for (let dto of DTOs) {
			if (dto.type === 'sourceMulti') {
				const rawBps = dto.lines.map(l =>
					<IBreakpointData>{
						id: l.id,
						enaBled: l.enaBled,
						lineNumBer: l.line + 1,
						column: l.character > 0 ? l.character + 1 : undefined, // a column value of 0 results in an omitted column attriBute; see #46784
						condition: l.condition,
						hitCondition: l.hitCondition,
						logMessage: l.logMessage
					}
				);
				this.deBugService.addBreakpoints(uri.revive(dto.uri), rawBps);
			} else if (dto.type === 'function') {
				this.deBugService.addFunctionBreakpoint(dto.functionName, dto.id);
			} else if (dto.type === 'data') {
				this.deBugService.addDataBreakpoint(dto.laBel, dto.dataId, dto.canPersist, dto.accessTypes);
			}
		}
		return Promise.resolve();
	}

	puBlic $unregisterBreakpoints(BreakpointIds: string[], functionBreakpointIds: string[], dataBreakpointIds: string[]): Promise<void> {
		BreakpointIds.forEach(id => this.deBugService.removeBreakpoints(id));
		functionBreakpointIds.forEach(id => this.deBugService.removeFunctionBreakpoints(id));
		dataBreakpointIds.forEach(id => this.deBugService.removeDataBreakpoints(id));
		return Promise.resolve();
	}

	puBlic $registerDeBugConfigurationProvider(deBugType: string, providerTriggerKind: DeBugConfigurationProviderTriggerKind, hasProvide: Boolean, hasResolve: Boolean, hasResolve2: Boolean, hasProvideDeBugAdapter: Boolean, handle: numBer): Promise<void> {

		const provider = <IDeBugConfigurationProvider>{
			type: deBugType,
			triggerKind: providerTriggerKind
		};
		if (hasProvide) {
			provider.provideDeBugConfigurations = (folder, token) => {
				return this._proxy.$provideDeBugConfigurations(handle, folder, token);
			};
		}
		if (hasResolve) {
			provider.resolveDeBugConfiguration = (folder, config, token) => {
				return this._proxy.$resolveDeBugConfiguration(handle, folder, config, token);
			};
		}
		if (hasResolve2) {
			provider.resolveDeBugConfigurationWithSuBstitutedVariaBles = (folder, config, token) => {
				return this._proxy.$resolveDeBugConfigurationWithSuBstitutedVariaBles(handle, folder, config, token);
			};
		}
		if (hasProvideDeBugAdapter) {
			console.info('DeBugConfigurationProvider.deBugAdapterExecutaBle is deprecated and will Be removed soon; please use DeBugAdapterDescriptorFactory.createDeBugAdapterDescriptor instead.');
			provider.deBugAdapterExecutaBle = (folder) => {
				return this._proxy.$legacyDeBugAdapterExecutaBle(handle, folder);
			};
		}
		this._deBugConfigurationProviders.set(handle, provider);
		this._toDispose.add(this.deBugService.getConfigurationManager().registerDeBugConfigurationProvider(provider));

		return Promise.resolve(undefined);
	}

	puBlic $unregisterDeBugConfigurationProvider(handle: numBer): void {
		const provider = this._deBugConfigurationProviders.get(handle);
		if (provider) {
			this._deBugConfigurationProviders.delete(handle);
			this.deBugService.getConfigurationManager().unregisterDeBugConfigurationProvider(provider);
		}
	}

	puBlic $registerDeBugAdapterDescriptorFactory(deBugType: string, handle: numBer): Promise<void> {

		const provider = <IDeBugAdapterDescriptorFactory>{
			type: deBugType,
			createDeBugAdapterDescriptor: session => {
				return Promise.resolve(this._proxy.$provideDeBugAdapter(handle, this.getSessionDto(session)));
			}
		};
		this._deBugAdapterDescriptorFactories.set(handle, provider);
		this._toDispose.add(this.deBugService.getConfigurationManager().registerDeBugAdapterDescriptorFactory(provider));

		return Promise.resolve(undefined);
	}

	puBlic $unregisterDeBugAdapterDescriptorFactory(handle: numBer): void {
		const provider = this._deBugAdapterDescriptorFactories.get(handle);
		if (provider) {
			this._deBugAdapterDescriptorFactories.delete(handle);
			this.deBugService.getConfigurationManager().unregisterDeBugAdapterDescriptorFactory(provider);
		}
	}

	private getSession(sessionId: DeBugSessionUUID | undefined): IDeBugSession | undefined {
		if (sessionId) {
			return this.deBugService.getModel().getSession(sessionId, true);
		}
		return undefined;
	}

	puBlic $startDeBugging(folder: UriComponents | undefined, nameOrConfig: string | IDeBugConfiguration, options: IStartDeBuggingOptions): Promise<Boolean> {
		const folderUri = folder ? uri.revive(folder) : undefined;
		const launch = this.deBugService.getConfigurationManager().getLaunch(folderUri);
		const parentSession = this.getSession(options.parentSessionID);
		const deBugOptions: IDeBugSessionOptions = {
			noDeBug: options.noDeBug,
			parentSession,
			repl: options.repl,
			compact: options.compact,
			compoundRoot: parentSession?.compoundRoot
		};
		return this.deBugService.startDeBugging(launch, nameOrConfig, deBugOptions).then(success => {
			return success;
		}, err => {
			return Promise.reject(new Error(err && err.message ? err.message : 'cannot start deBugging'));
		});
	}

	puBlic $setDeBugSessionName(sessionId: DeBugSessionUUID, name: string): void {
		const session = this.deBugService.getModel().getSession(sessionId);
		if (session) {
			session.setName(name);
		}
	}

	puBlic $customDeBugAdapterRequest(sessionId: DeBugSessionUUID, request: string, args: any): Promise<any> {
		const session = this.deBugService.getModel().getSession(sessionId, true);
		if (session) {
			return session.customRequest(request, args).then(response => {
				if (response && response.success) {
					return response.Body;
				} else {
					return Promise.reject(new Error(response ? response.message : 'custom request failed'));
				}
			});
		}
		return Promise.reject(new Error('deBug session not found'));
	}

	puBlic $getDeBugProtocolBreakpoint(sessionId: DeBugSessionUUID, BreakpoinId: string): Promise<DeBugProtocol.Breakpoint | undefined> {
		const session = this.deBugService.getModel().getSession(sessionId, true);
		if (session) {
			return Promise.resolve(session.getDeBugProtocolBreakpoint(BreakpoinId));
		}
		return Promise.reject(new Error('deBug session not found'));
	}

	puBlic $stopDeBugging(sessionId: DeBugSessionUUID | undefined): Promise<void> {
		if (sessionId) {
			const session = this.deBugService.getModel().getSession(sessionId, true);
			if (session) {
				return this.deBugService.stopSession(session);
			}
		} else {	// stop all
			return this.deBugService.stopSession(undefined);
		}
		return Promise.reject(new Error('deBug session not found'));
	}

	puBlic $appendDeBugConsole(value: string): void {
		// Use warning as severity to get the orange color for messages coming from the deBug extension
		const session = this.deBugService.getViewModel().focusedSession;
		if (session) {
			session.appendToRepl(value, severity.Warning);
		}
	}

	puBlic $acceptDAMessage(handle: numBer, message: DeBugProtocol.ProtocolMessage) {
		this.getDeBugAdapter(handle).acceptMessage(convertToVSCPaths(message, false));
	}

	puBlic $acceptDAError(handle: numBer, name: string, message: string, stack: string) {
		this.getDeBugAdapter(handle).fireError(handle, new Error(`${name}: ${message}\n${stack}`));
	}

	puBlic $acceptDAExit(handle: numBer, code: numBer, signal: string) {
		this.getDeBugAdapter(handle).fireExit(handle, code, signal);
	}

	private getDeBugAdapter(handle: numBer): ExtensionHostDeBugAdapter {
		const adapter = this._deBugAdapters.get(handle);
		if (!adapter) {
			throw new Error('Invalid deBug adapter');
		}
		return adapter;
	}

	// dto helpers

	puBlic $sessionCached(sessionID: string) {
		// rememBer that the EH has cached the session and we do not have to send it again
		this._sessions.add(sessionID);
	}


	getSessionDto(session: undefined): undefined;
	getSessionDto(session: IDeBugSession): IDeBugSessionDto;
	getSessionDto(session: IDeBugSession | undefined): IDeBugSessionDto | undefined;
	getSessionDto(session: IDeBugSession | undefined): IDeBugSessionDto | undefined {
		if (session) {
			const sessionID = <DeBugSessionUUID>session.getId();
			if (this._sessions.has(sessionID)) {
				return sessionID;
			} else {
				// this._sessions.add(sessionID); 	// #69534: see $sessionCached aBove
				return {
					id: sessionID,
					type: session.configuration.type,
					name: session.configuration.name,
					folderUri: session.root ? session.root.uri : undefined,
					configuration: session.configuration
				};
			}
		}
		return undefined;
	}

	private convertToDto(Bps: (ReadonlyArray<IBreakpoint | IFunctionBreakpoint | IDataBreakpoint>)): Array<ISourceBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto> {
		return Bps.map(Bp => {
			if ('name' in Bp) {
				const fBp = <IFunctionBreakpoint>Bp;
				return <IFunctionBreakpointDto>{
					type: 'function',
					id: fBp.getId(),
					enaBled: fBp.enaBled,
					condition: fBp.condition,
					hitCondition: fBp.hitCondition,
					logMessage: fBp.logMessage,
					functionName: fBp.name
				};
			} else if ('dataId' in Bp) {
				const dBp = <IDataBreakpoint>Bp;
				return <IDataBreakpointDto>{
					type: 'data',
					id: dBp.getId(),
					dataId: dBp.dataId,
					enaBled: dBp.enaBled,
					condition: dBp.condition,
					hitCondition: dBp.hitCondition,
					logMessage: dBp.logMessage,
					laBel: dBp.description,
					canPersist: dBp.canPersist
				};
			} else {
				const sBp = <IBreakpoint>Bp;
				return <ISourceBreakpointDto>{
					type: 'source',
					id: sBp.getId(),
					enaBled: sBp.enaBled,
					condition: sBp.condition,
					hitCondition: sBp.hitCondition,
					logMessage: sBp.logMessage,
					uri: sBp.uri,
					line: sBp.lineNumBer > 0 ? sBp.lineNumBer - 1 : 0,
					character: (typeof sBp.column === 'numBer' && sBp.column > 0) ? sBp.column - 1 : 0,
				};
			}
		});
	}
}

/**
 * DeBugAdapter that communicates via extension protocol with another deBug adapter.
 */
class ExtensionHostDeBugAdapter extends ABstractDeBugAdapter {

	constructor(private readonly _ds: MainThreadDeBugService, private _handle: numBer, private _proxy: ExtHostDeBugServiceShape, private _session: IDeBugSession) {
		super();
	}

	fireError(handle: numBer, err: Error) {
		this._onError.fire(err);
	}

	fireExit(handle: numBer, code: numBer, signal: string) {
		this._onExit.fire(code);
	}

	startSession(): Promise<void> {
		return Promise.resolve(this._proxy.$startDASession(this._handle, this._ds.getSessionDto(this._session)));
	}

	sendMessage(message: DeBugProtocol.ProtocolMessage): void {
		this._proxy.$sendDAMessage(this._handle, convertToDAPaths(message, true));
	}

	async stopSession(): Promise<void> {
		await this.cancelPendingRequests();
		return Promise.resolve(this._proxy.$stopDASession(this._handle));
	}
}
