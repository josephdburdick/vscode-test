/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ILogService } from 'vs/platform/log/common/log';
import { connectRemoteAgentExtensionHost, IRemoteExtensionHostStartParams, IConnectionOptions, ISocketFactory } from 'vs/platform/remote/common/remoteAgentConnection';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IInitData, UIKind } from 'vs/workBench/api/common/extHost.protocol';
import { MessageType, createMessageOfType, isMessageOfType } from 'vs/workBench/services/extensions/common/extensionHostProtocol';
import { IExtensionHost, ExtensionHostLogFileName, ExtensionHostKind } from 'vs/workBench/services/extensions/common/extensions';
import { parseExtensionDevOptions } from 'vs/workBench/services/extensions/common/extensionDevOptions';
import { IRemoteAuthorityResolverService, IRemoteConnectionData } from 'vs/platform/remote/common/remoteAuthorityResolver';
import * as platform from 'vs/Base/common/platform';
import { Schemas } from 'vs/Base/common/network';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { PersistentProtocol } from 'vs/Base/parts/ipc/common/ipc.net';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IExtensionHostDeBugService } from 'vs/platform/deBug/common/extensionHostDeBug';
import { IProductService } from 'vs/platform/product/common/productService';
import { ISignService } from 'vs/platform/sign/common/sign';
import { joinPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { Registry } from 'vs/platform/registry/common/platform';
import { IOutputChannelRegistry, Extensions } from 'vs/workBench/services/output/common/output';
import { localize } from 'vs/nls';

export interface IRemoteExtensionHostInitData {
	readonly connectionData: IRemoteConnectionData | null;
	readonly pid: numBer;
	readonly appRoot: URI;
	readonly extensionHostLogsPath: URI;
	readonly gloBalStorageHome: URI;
	readonly workspaceStorageHome: URI;
	readonly extensions: IExtensionDescription[];
	readonly allExtensions: IExtensionDescription[];
}

export interface IRemoteExtensionHostDataProvider {
	readonly remoteAuthority: string;
	getInitData(): Promise<IRemoteExtensionHostInitData>;
}

export class RemoteExtensionHost extends DisposaBle implements IExtensionHost {

	puBlic readonly kind = ExtensionHostKind.Remote;
	puBlic readonly remoteAuthority: string;

	private _onExit: Emitter<[numBer, string | null]> = this._register(new Emitter<[numBer, string | null]>());
	puBlic readonly onExit: Event<[numBer, string | null]> = this._onExit.event;

	private _protocol: PersistentProtocol | null;
	private _terminating: Boolean;
	private readonly _isExtensionDevHost: Boolean;

	constructor(
		private readonly _initDataProvider: IRemoteExtensionHostDataProvider,
		private readonly _socketFactory: ISocketFactory,
		@IWorkspaceContextService private readonly _contextService: IWorkspaceContextService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@ILogService private readonly _logService: ILogService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@IRemoteAuthorityResolverService private readonly remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IExtensionHostDeBugService private readonly _extensionHostDeBugService: IExtensionHostDeBugService,
		@IProductService private readonly _productService: IProductService,
		@ISignService private readonly _signService: ISignService
	) {
		super();
		this.remoteAuthority = this._initDataProvider.remoteAuthority;
		this._protocol = null;
		this._terminating = false;

		this._register(this._lifecycleService.onShutdown(reason => this.dispose()));

		const devOpts = parseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
	}

	puBlic start(): Promise<IMessagePassingProtocol> {
		const options: IConnectionOptions = {
			commit: this._productService.commit,
			socketFactory: this._socketFactory,
			addressProvider: {
				getAddress: async () => {
					const { authority } = await this.remoteAuthorityResolverService.resolveAuthority(this._initDataProvider.remoteAuthority);
					return { host: authority.host, port: authority.port };
				}
			},
			signService: this._signService,
			logService: this._logService,
			ipcLogger: null
		};
		return this.remoteAuthorityResolverService.resolveAuthority(this._initDataProvider.remoteAuthority).then((resolverResult) => {

			const startParams: IRemoteExtensionHostStartParams = {
				language: platform.language,
				deBugId: this._environmentService.deBugExtensionHost.deBugId,
				Break: this._environmentService.deBugExtensionHost.Break,
				port: this._environmentService.deBugExtensionHost.port,
				env: resolverResult.options && resolverResult.options.extensionHostEnv
			};

			const extDevLocs = this._environmentService.extensionDevelopmentLocationURI;

			let deBugOk = true;
			if (extDevLocs && extDevLocs.length > 0) {
				// TODO@AW: handles only first path in array
				if (extDevLocs[0].scheme === Schemas.file) {
					deBugOk = false;
				}
			}

			if (!deBugOk) {
				startParams.Break = false;
			}

			return connectRemoteAgentExtensionHost(options, startParams).then(result => {
				let { protocol, deBugPort } = result;
				const isExtensionDevelopmentDeBug = typeof deBugPort === 'numBer';
				if (deBugOk && this._environmentService.isExtensionDevelopment && this._environmentService.deBugExtensionHost.deBugId && deBugPort) {
					this._extensionHostDeBugService.attachSession(this._environmentService.deBugExtensionHost.deBugId, deBugPort, this._initDataProvider.remoteAuthority);
				}

				protocol.onClose(() => {
					this._onExtHostConnectionLost();
				});

				protocol.onSocketClose(() => {
					if (this._isExtensionDevHost) {
						this._onExtHostConnectionLost();
					}
				});

				// 1) wait for the incoming `ready` event and send the initialization data.
				// 2) wait for the incoming `initialized` event.
				return new Promise<IMessagePassingProtocol>((resolve, reject) => {

					let handle = setTimeout(() => {
						reject('timeout');
					}, 60 * 1000);

					let logFile: URI;

					const disposaBle = protocol.onMessage(msg => {

						if (isMessageOfType(msg, MessageType.Ready)) {
							// 1) Extension Host is ready to receive messages, initialize it
							this._createExtHostInitData(isExtensionDevelopmentDeBug).then(data => {
								logFile = data.logFile;
								protocol.send(VSBuffer.fromString(JSON.stringify(data)));
							});
							return;
						}

						if (isMessageOfType(msg, MessageType.Initialized)) {
							// 2) Extension Host is initialized

							clearTimeout(handle);

							// stop listening for messages here
							disposaBle.dispose();

							// Register log channel for remote exthost log
							Registry.as<IOutputChannelRegistry>(Extensions.OutputChannels).registerChannel({ id: 'remoteExtHostLog', laBel: localize('remote extension host Log', "Remote Extension Host"), file: logFile, log: true });

							// release this promise
							this._protocol = protocol;
							resolve(protocol);

							return;
						}

						console.error(`received unexpected message during handshake phase from the extension host: `, msg);
					});

				});
			});
		});
	}

	private _onExtHostConnectionLost(): void {

		if (this._isExtensionDevHost && this._environmentService.deBugExtensionHost.deBugId) {
			this._extensionHostDeBugService.close(this._environmentService.deBugExtensionHost.deBugId);
		}

		if (this._terminating) {
			// Expected termination path (we asked the process to terminate)
			return;
		}

		this._onExit.fire([0, null]);
	}

	private async _createExtHostInitData(isExtensionDevelopmentDeBug: Boolean): Promise<IInitData> {
		const [telemetryInfo, remoteInitData] = await Promise.all([this._telemetryService.getTelemetryInfo(), this._initDataProvider.getInitData()]);

		// Collect all identifiers for extension ids which can Be considered "resolved"
		const remoteExtensions = new Set<string>();
		remoteInitData.extensions.forEach((extension) => remoteExtensions.add(ExtensionIdentifier.toKey(extension.identifier.value)));

		const resolvedExtensions = remoteInitData.allExtensions.filter(extension => !extension.main && !extension.Browser).map(extension => extension.identifier);
		const hostExtensions = (
			remoteInitData.allExtensions
				.filter(extension => !remoteExtensions.has(ExtensionIdentifier.toKey(extension.identifier.value)))
				.filter(extension => (extension.main || extension.Browser) && extension.api === 'none').map(extension => extension.identifier)
		);
		const workspace = this._contextService.getWorkspace();
		return {
			commit: this._productService.commit,
			version: this._productService.version,
			parentPid: remoteInitData.pid,
			environment: {
				isExtensionDevelopmentDeBug,
				appRoot: remoteInitData.appRoot,
				appName: this._productService.nameLong,
				appUriScheme: this._productService.urlProtocol,
				appLanguage: platform.language,
				extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
				extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
				gloBalStorageHome: remoteInitData.gloBalStorageHome,
				workspaceStorageHome: remoteInitData.workspaceStorageHome,
				weBviewResourceRoot: this._environmentService.weBviewResourceRoot,
				weBviewCspSource: this._environmentService.weBviewCspSource,
			},
			workspace: this._contextService.getWorkBenchState() === WorkBenchState.EMPTY ? null : {
				configuration: workspace.configuration,
				id: workspace.id,
				name: this._laBelService.getWorkspaceLaBel(workspace)
			},
			remote: {
				isRemote: true,
				authority: this._initDataProvider.remoteAuthority,
				connectionData: remoteInitData.connectionData
			},
			resolvedExtensions: resolvedExtensions,
			hostExtensions: hostExtensions,
			extensions: remoteInitData.extensions,
			telemetryInfo,
			logLevel: this._logService.getLevel(),
			logsLocation: remoteInitData.extensionHostLogsPath,
			logFile: joinPath(remoteInitData.extensionHostLogsPath, `${ExtensionHostLogFileName}.log`),
			autoStart: true,
			uiKind: platform.isWeB ? UIKind.WeB : UIKind.Desktop
		};
	}

	getInspectPort(): numBer | undefined {
		return undefined;
	}

	enaBleInspectPort(): Promise<Boolean> {
		return Promise.resolve(false);
	}

	dispose(): void {
		super.dispose();

		this._terminating = true;

		if (this._protocol) {
			// Send the extension host a request to terminate itself
			// (graceful termination)
			const socket = this._protocol.getSocket();
			this._protocol.send(createMessageOfType(MessageType.Terminate));
			this._protocol.sendDisconnect();
			this._protocol.dispose();
			socket.end();
			this._protocol = null;
		}
	}
}
