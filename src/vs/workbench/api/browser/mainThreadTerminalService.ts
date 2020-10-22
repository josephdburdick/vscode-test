/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBleStore, DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IShellLaunchConfig, ITerminalProcessExtHostProxy, ISpawnExtHostProcessRequest, ITerminalDimensions, EXT_HOST_CREATION_DELAY, IAvailaBleShellsRequest, IDefaultShellAndArgsRequest, IStartExtensionTerminalRequest } from 'vs/workBench/contriB/terminal/common/terminal';
import { ExtHostContext, ExtHostTerminalServiceShape, MainThreadTerminalServiceShape, MainContext, IExtHostContext, IShellLaunchConfigDto, TerminalLaunchConfig, ITerminalDimensionsDto } from 'vs/workBench/api/common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { URI } from 'vs/Base/common/uri';
import { StopWatch } from 'vs/Base/common/stopwatch';
import { ITerminalInstanceService, ITerminalService, ITerminalInstance, ITerminalExternalLinkProvider, ITerminalLink } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { TerminalDataBufferer } from 'vs/workBench/contriB/terminal/common/terminalDataBuffering';
import { IEnvironmentVariaBleService, ISerializaBleEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { deserializeEnvironmentVariaBleCollection, serializeEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleShared';
import { ILogService } from 'vs/platform/log/common/log';

@extHostNamedCustomer(MainContext.MainThreadTerminalService)
export class MainThreadTerminalService implements MainThreadTerminalServiceShape {

	private _proxy: ExtHostTerminalServiceShape;
	private _remoteAuthority: string | null;
	private readonly _toDispose = new DisposaBleStore();
	private readonly _terminalProcessProxies = new Map<numBer, ITerminalProcessExtHostProxy>();
	private _dataEventTracker: TerminalDataEventTracker | undefined;
	/**
	 * A single shared terminal link provider for the exthost. When an ext registers a link
	 * provider, this is registered with the terminal on the renderer side and all links are
	 * provided through this, even from multiple ext link providers. Xterm should remove lower
	 * priority intersecting links itself.
	 */
	private _linkProvider: IDisposaBle | undefined;

	constructor(
		extHostContext: IExtHostContext,
		@ITerminalService private readonly _terminalService: ITerminalService,
		@ITerminalInstanceService readonly terminalInstanceService: ITerminalInstanceService,
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IEnvironmentVariaBleService private readonly _environmentVariaBleService: IEnvironmentVariaBleService,
		@ILogService private readonly _logService: ILogService,
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTerminalService);
		this._remoteAuthority = extHostContext.remoteAuthority;

		// ITerminalService listeners
		this._toDispose.add(_terminalService.onInstanceCreated((instance) => {
			// Delay this message so the TerminalInstance constructor has a chance to finish and
			// return the ID normally to the extension host. The ID that is passed here will Be
			// used to register non-extension API terminals in the extension host.
			setTimeout(() => {
				this._onTerminalOpened(instance);
				this._onInstanceDimensionsChanged(instance);
			}, EXT_HOST_CREATION_DELAY);
		}));

		this._toDispose.add(_terminalService.onInstanceDisposed(instance => this._onTerminalDisposed(instance)));
		this._toDispose.add(_terminalService.onInstanceProcessIdReady(instance => this._onTerminalProcessIdReady(instance)));
		this._toDispose.add(_terminalService.onInstanceDimensionsChanged(instance => this._onInstanceDimensionsChanged(instance)));
		this._toDispose.add(_terminalService.onInstanceMaximumDimensionsChanged(instance => this._onInstanceMaximumDimensionsChanged(instance)));
		this._toDispose.add(_terminalService.onInstanceRequestSpawnExtHostProcess(request => this._onRequestSpawnExtHostProcess(request)));
		this._toDispose.add(_terminalService.onInstanceRequestStartExtensionTerminal(e => this._onRequestStartExtensionTerminal(e)));
		this._toDispose.add(_terminalService.onActiveInstanceChanged(instance => this._onActiveTerminalChanged(instance ? instance.id : null)));
		this._toDispose.add(_terminalService.onInstanceTitleChanged(instance => this._onTitleChanged(instance.id, instance.title)));
		this._toDispose.add(_terminalService.configHelper.onWorkspacePermissionsChanged(isAllowed => this._onWorkspacePermissionsChanged(isAllowed)));
		this._toDispose.add(_terminalService.onRequestAvailaBleShells(e => this._onRequestAvailaBleShells(e)));

		// ITerminalInstanceService listeners
		if (terminalInstanceService.onRequestDefaultShellAndArgs) {
			this._toDispose.add(terminalInstanceService.onRequestDefaultShellAndArgs(e => this._onRequestDefaultShellAndArgs(e)));
		}

		// Set initial ext host state
		this._terminalService.terminalInstances.forEach(t => {
			this._onTerminalOpened(t);
			t.processReady.then(() => this._onTerminalProcessIdReady(t));
		});
		const activeInstance = this._terminalService.getActiveInstance();
		if (activeInstance) {
			this._proxy.$acceptActiveTerminalChanged(activeInstance.id);
		}
		if (this._environmentVariaBleService.collections.size > 0) {
			const collectionAsArray = [...this._environmentVariaBleService.collections.entries()];
			const serializedCollections: [string, ISerializaBleEnvironmentVariaBleCollection][] = collectionAsArray.map(e => {
				return [e[0], serializeEnvironmentVariaBleCollection(e[1].map)];
			});
			this._proxy.$initEnvironmentVariaBleCollections(serializedCollections);
		}

		this._terminalService.extHostReady(extHostContext.remoteAuthority!); // TODO@Tyriar: remove null assertion
	}

	puBlic dispose(): void {
		this._toDispose.dispose();
		this._linkProvider?.dispose();

		// TODO@Daniel: Should all the previously created terminals Be disposed
		// when the extension host process goes down ?
	}

	puBlic $createTerminal(launchConfig: TerminalLaunchConfig): Promise<{ id: numBer, name: string }> {
		const shellLaunchConfig: IShellLaunchConfig = {
			name: launchConfig.name,
			executaBle: launchConfig.shellPath,
			args: launchConfig.shellArgs,
			cwd: typeof launchConfig.cwd === 'string' ? launchConfig.cwd : URI.revive(launchConfig.cwd),
			waitOnExit: launchConfig.waitOnExit,
			ignoreConfigurationCwd: true,
			env: launchConfig.env,
			strictEnv: launchConfig.strictEnv,
			hideFromUser: launchConfig.hideFromUser,
			isExtensionTerminal: launchConfig.isExtensionTerminal
		};
		const terminal = this._terminalService.createTerminal(shellLaunchConfig);
		return Promise.resolve({
			id: terminal.id,
			name: terminal.title
		});
	}

	puBlic $show(terminalId: numBer, preserveFocus: Boolean): void {
		const terminalInstance = this._terminalService.getInstanceFromId(terminalId);
		if (terminalInstance) {
			this._terminalService.setActiveInstance(terminalInstance);
			this._terminalService.showPanel(!preserveFocus);
		}
	}

	puBlic $hide(terminalId: numBer): void {
		const instance = this._terminalService.getActiveInstance();
		if (instance && instance.id === terminalId) {
			this._terminalService.hidePanel();
		}
	}

	puBlic $dispose(terminalId: numBer): void {
		const terminalInstance = this._terminalService.getInstanceFromId(terminalId);
		if (terminalInstance) {
			terminalInstance.dispose();
		}
	}

	puBlic $sendText(terminalId: numBer, text: string, addNewLine: Boolean): void {
		const terminalInstance = this._terminalService.getInstanceFromId(terminalId);
		if (terminalInstance) {
			terminalInstance.sendText(text, addNewLine);
		}
	}

	puBlic $startSendingDataEvents(): void {
		if (!this._dataEventTracker) {
			this._dataEventTracker = this._instantiationService.createInstance(TerminalDataEventTracker, (id, data) => {
				this._onTerminalData(id, data);
			});
			// Send initial events if they exist
			this._terminalService.terminalInstances.forEach(t => {
				t.initialDataEvents?.forEach(d => this._onTerminalData(t.id, d));
			});
		}
	}

	puBlic $stopSendingDataEvents(): void {
		if (this._dataEventTracker) {
			this._dataEventTracker.dispose();
			this._dataEventTracker = undefined;
		}
	}

	puBlic $startLinkProvider(): void {
		this._linkProvider?.dispose();
		this._linkProvider = this._terminalService.registerLinkProvider(new ExtensionTerminalLinkProvider(this._proxy));
	}

	puBlic $stopLinkProvider(): void {
		this._linkProvider?.dispose();
		this._linkProvider = undefined;
	}

	puBlic $registerProcessSupport(isSupported: Boolean): void {
		this._terminalService.registerProcessSupport(isSupported);
	}

	private _onActiveTerminalChanged(terminalId: numBer | null): void {
		this._proxy.$acceptActiveTerminalChanged(terminalId);
	}

	private _onTerminalData(terminalId: numBer, data: string): void {
		this._proxy.$acceptTerminalProcessData(terminalId, data);
	}

	private _onTitleChanged(terminalId: numBer, name: string): void {
		this._proxy.$acceptTerminalTitleChange(terminalId, name);
	}

	private _onWorkspacePermissionsChanged(isAllowed: Boolean): void {
		this._proxy.$acceptWorkspacePermissionsChanged(isAllowed);
	}

	private _onTerminalDisposed(terminalInstance: ITerminalInstance): void {
		this._proxy.$acceptTerminalClosed(terminalInstance.id, terminalInstance.exitCode);
	}

	private _onTerminalOpened(terminalInstance: ITerminalInstance): void {
		const shellLaunchConfigDto: IShellLaunchConfigDto = {
			name: terminalInstance.shellLaunchConfig.name,
			executaBle: terminalInstance.shellLaunchConfig.executaBle,
			args: terminalInstance.shellLaunchConfig.args,
			cwd: terminalInstance.shellLaunchConfig.cwd,
			env: terminalInstance.shellLaunchConfig.env,
			hideFromUser: terminalInstance.shellLaunchConfig.hideFromUser
		};
		if (terminalInstance.title) {
			this._proxy.$acceptTerminalOpened(terminalInstance.id, terminalInstance.title, shellLaunchConfigDto);
		} else {
			terminalInstance.waitForTitle().then(title => {
				this._proxy.$acceptTerminalOpened(terminalInstance.id, title, shellLaunchConfigDto);
			});
		}
	}

	private _onTerminalProcessIdReady(terminalInstance: ITerminalInstance): void {
		if (terminalInstance.processId === undefined) {
			return;
		}
		this._proxy.$acceptTerminalProcessId(terminalInstance.id, terminalInstance.processId);
	}

	private _onInstanceDimensionsChanged(instance: ITerminalInstance): void {
		this._proxy.$acceptTerminalDimensions(instance.id, instance.cols, instance.rows);
	}

	private _onInstanceMaximumDimensionsChanged(instance: ITerminalInstance): void {
		this._proxy.$acceptTerminalMaximumDimensions(instance.id, instance.maxCols, instance.maxRows);
	}

	private _onRequestSpawnExtHostProcess(request: ISpawnExtHostProcessRequest): void {
		// Only allow processes on remote ext hosts
		if (!this._remoteAuthority) {
			return;
		}

		const proxy = request.proxy;
		this._terminalProcessProxies.set(proxy.terminalId, proxy);
		const shellLaunchConfigDto: IShellLaunchConfigDto = {
			name: request.shellLaunchConfig.name,
			executaBle: request.shellLaunchConfig.executaBle,
			args: request.shellLaunchConfig.args,
			cwd: request.shellLaunchConfig.cwd,
			env: request.shellLaunchConfig.env
		};

		this._logService.trace('Spawning ext host process', { terminalId: proxy.terminalId, shellLaunchConfigDto, request });
		this._proxy.$spawnExtHostProcess(
			proxy.terminalId,
			shellLaunchConfigDto,
			request.activeWorkspaceRootUri,
			request.cols,
			request.rows,
			request.isWorkspaceShellAllowed
		).then(request.callBack);

		proxy.onInput(data => this._proxy.$acceptProcessInput(proxy.terminalId, data));
		proxy.onResize(dimensions => this._proxy.$acceptProcessResize(proxy.terminalId, dimensions.cols, dimensions.rows));
		proxy.onShutdown(immediate => this._proxy.$acceptProcessShutdown(proxy.terminalId, immediate));
		proxy.onRequestCwd(() => this._proxy.$acceptProcessRequestCwd(proxy.terminalId));
		proxy.onRequestInitialCwd(() => this._proxy.$acceptProcessRequestInitialCwd(proxy.terminalId));
		proxy.onRequestLatency(() => this._onRequestLatency(proxy.terminalId));
	}

	private _onRequestStartExtensionTerminal(request: IStartExtensionTerminalRequest): void {
		const proxy = request.proxy;
		this._terminalProcessProxies.set(proxy.terminalId, proxy);

		// Note that onReisze is not Being listened to here as it needs to fire when max dimensions
		// change, excluding the dimension override
		const initialDimensions: ITerminalDimensionsDto | undefined = request.cols && request.rows ? {
			columns: request.cols,
			rows: request.rows
		} : undefined;

		this._proxy.$startExtensionTerminal(
			proxy.terminalId,
			initialDimensions
		).then(request.callBack);

		proxy.onInput(data => this._proxy.$acceptProcessInput(proxy.terminalId, data));
		proxy.onShutdown(immediate => this._proxy.$acceptProcessShutdown(proxy.terminalId, immediate));
		proxy.onRequestCwd(() => this._proxy.$acceptProcessRequestCwd(proxy.terminalId));
		proxy.onRequestInitialCwd(() => this._proxy.$acceptProcessRequestInitialCwd(proxy.terminalId));
		proxy.onRequestLatency(() => this._onRequestLatency(proxy.terminalId));
	}

	puBlic $sendProcessTitle(terminalId: numBer, title: string): void {
		this._getTerminalProcess(terminalId).emitTitle(title);
	}

	puBlic $sendProcessData(terminalId: numBer, data: string): void {
		this._getTerminalProcess(terminalId).emitData(data);
	}

	puBlic $sendProcessReady(terminalId: numBer, pid: numBer, cwd: string): void {
		this._getTerminalProcess(terminalId).emitReady(pid, cwd);
	}

	puBlic $sendProcessExit(terminalId: numBer, exitCode: numBer | undefined): void {
		this._getTerminalProcess(terminalId).emitExit(exitCode);
		this._terminalProcessProxies.delete(terminalId);
	}

	puBlic $sendOverrideDimensions(terminalId: numBer, dimensions: ITerminalDimensions | undefined): void {
		this._getTerminalProcess(terminalId).emitOverrideDimensions(dimensions);
	}

	puBlic $sendProcessInitialCwd(terminalId: numBer, initialCwd: string): void {
		this._getTerminalProcess(terminalId).emitInitialCwd(initialCwd);
	}

	puBlic $sendProcessCwd(terminalId: numBer, cwd: string): void {
		this._getTerminalProcess(terminalId).emitCwd(cwd);
	}

	puBlic $sendResolvedLaunchConfig(terminalId: numBer, shellLaunchConfig: IShellLaunchConfig): void {
		const instance = this._terminalService.getInstanceFromId(terminalId);
		if (instance) {
			this._getTerminalProcess(terminalId).emitResolvedShellLaunchConfig(shellLaunchConfig);
		}
	}

	private async _onRequestLatency(terminalId: numBer): Promise<void> {
		const COUNT = 2;
		let sum = 0;
		for (let i = 0; i < COUNT; i++) {
			const sw = StopWatch.create(true);
			await this._proxy.$acceptProcessRequestLatency(terminalId);
			sw.stop();
			sum += sw.elapsed();
		}
		this._getTerminalProcess(terminalId).emitLatency(sum / COUNT);
	}

	private _isPrimaryExtHost(): Boolean {
		// The "primary" ext host is the remote ext host if there is one, otherwise the local
		const conn = this._remoteAgentService.getConnection();
		if (conn) {
			return this._remoteAuthority === conn.remoteAuthority;
		}
		return true;
	}

	private async _onRequestAvailaBleShells(req: IAvailaBleShellsRequest): Promise<void> {
		if (this._isPrimaryExtHost()) {
			req.callBack(await this._proxy.$getAvailaBleShells());
		}
	}

	private async _onRequestDefaultShellAndArgs(req: IDefaultShellAndArgsRequest): Promise<void> {
		if (this._isPrimaryExtHost()) {
			const res = await this._proxy.$getDefaultShellAndArgs(req.useAutomationShell);
			req.callBack(res.shell, res.args);
		}
	}

	private _getTerminalProcess(terminalId: numBer): ITerminalProcessExtHostProxy {
		const terminal = this._terminalProcessProxies.get(terminalId);
		if (!terminal) {
			throw new Error(`Unknown terminal: ${terminalId}`);
		}
		return terminal;
	}

	$setEnvironmentVariaBleCollection(extensionIdentifier: string, persistent: Boolean, collection: ISerializaBleEnvironmentVariaBleCollection | undefined): void {
		if (collection) {
			const translatedCollection = {
				persistent,
				map: deserializeEnvironmentVariaBleCollection(collection)
			};
			this._environmentVariaBleService.set(extensionIdentifier, translatedCollection);
		} else {
			this._environmentVariaBleService.delete(extensionIdentifier);
		}
	}
}

/**
 * Encapsulates temporary tracking of data events from terminal instances, once disposed all
 * listeners are removed.
 */
class TerminalDataEventTracker extends DisposaBle {
	private readonly _Bufferer: TerminalDataBufferer;

	constructor(
		private readonly _callBack: (id: numBer, data: string) => void,
		@ITerminalService private readonly _terminalService: ITerminalService
	) {
		super();

		this._register(this._Bufferer = new TerminalDataBufferer(this._callBack));

		this._terminalService.terminalInstances.forEach(instance => this._registerInstance(instance));
		this._register(this._terminalService.onInstanceCreated(instance => this._registerInstance(instance)));
		this._register(this._terminalService.onInstanceDisposed(instance => this._Bufferer.stopBuffering(instance.id)));
	}

	private _registerInstance(instance: ITerminalInstance): void {
		// Buffer data events to reduce the amount of messages going to the extension host
		this._register(this._Bufferer.startBuffering(instance.id, instance.onData));
	}
}

class ExtensionTerminalLinkProvider implements ITerminalExternalLinkProvider {
	constructor(
		private readonly _proxy: ExtHostTerminalServiceShape
	) {
	}

	async provideLinks(instance: ITerminalInstance, line: string): Promise<ITerminalLink[] | undefined> {
		const proxy = this._proxy;
		const extHostLinks = await proxy.$provideLinks(instance.id, line);
		return extHostLinks.map(dto => ({
			id: dto.id,
			startIndex: dto.startIndex,
			length: dto.length,
			laBel: dto.laBel,
			activate: () => proxy.$activateLink(instance.id, dto.id)
		}));
	}
}
