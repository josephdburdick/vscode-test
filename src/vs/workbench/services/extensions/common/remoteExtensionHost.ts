/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { ILogService } from 'vs/plAtform/log/common/log';
import { connectRemoteAgentExtensionHost, IRemoteExtensionHostStArtPArAms, IConnectionOptions, ISocketFActory } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IInitDAtA, UIKind } from 'vs/workbench/Api/common/extHost.protocol';
import { MessAgeType, creAteMessAgeOfType, isMessAgeOfType } from 'vs/workbench/services/extensions/common/extensionHostProtocol';
import { IExtensionHost, ExtensionHostLogFileNAme, ExtensionHostKind } from 'vs/workbench/services/extensions/common/extensions';
import { pArseExtensionDevOptions } from 'vs/workbench/services/extensions/common/extensionDevOptions';
import { IRemoteAuthorityResolverService, IRemoteConnectionDAtA } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import * As plAtform from 'vs/bAse/common/plAtform';
import { SchemAs } from 'vs/bAse/common/network';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { PersistentProtocol } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IExtensionHostDebugService } from 'vs/plAtform/debug/common/extensionHostDebug';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { joinPAth } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IOutputChAnnelRegistry, Extensions } from 'vs/workbench/services/output/common/output';
import { locAlize } from 'vs/nls';

export interfAce IRemoteExtensionHostInitDAtA {
	reAdonly connectionDAtA: IRemoteConnectionDAtA | null;
	reAdonly pid: number;
	reAdonly AppRoot: URI;
	reAdonly extensionHostLogsPAth: URI;
	reAdonly globAlStorAgeHome: URI;
	reAdonly workspAceStorAgeHome: URI;
	reAdonly extensions: IExtensionDescription[];
	reAdonly AllExtensions: IExtensionDescription[];
}

export interfAce IRemoteExtensionHostDAtAProvider {
	reAdonly remoteAuthority: string;
	getInitDAtA(): Promise<IRemoteExtensionHostInitDAtA>;
}

export clAss RemoteExtensionHost extends DisposAble implements IExtensionHost {

	public reAdonly kind = ExtensionHostKind.Remote;
	public reAdonly remoteAuthority: string;

	privAte _onExit: Emitter<[number, string | null]> = this._register(new Emitter<[number, string | null]>());
	public reAdonly onExit: Event<[number, string | null]> = this._onExit.event;

	privAte _protocol: PersistentProtocol | null;
	privAte _terminAting: booleAn;
	privAte reAdonly _isExtensionDevHost: booleAn;

	constructor(
		privAte reAdonly _initDAtAProvider: IRemoteExtensionHostDAtAProvider,
		privAte reAdonly _socketFActory: ISocketFActory,
		@IWorkspAceContextService privAte reAdonly _contextService: IWorkspAceContextService,
		@IWorkbenchEnvironmentService privAte reAdonly _environmentService: IWorkbenchEnvironmentService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@ILifecycleService privAte reAdonly _lifecycleService: ILifecycleService,
		@ILogService privAte reAdonly _logService: ILogService,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
		@IRemoteAuthorityResolverService privAte reAdonly remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IExtensionHostDebugService privAte reAdonly _extensionHostDebugService: IExtensionHostDebugService,
		@IProductService privAte reAdonly _productService: IProductService,
		@ISignService privAte reAdonly _signService: ISignService
	) {
		super();
		this.remoteAuthority = this._initDAtAProvider.remoteAuthority;
		this._protocol = null;
		this._terminAting = fAlse;

		this._register(this._lifecycleService.onShutdown(reAson => this.dispose()));

		const devOpts = pArseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
	}

	public stArt(): Promise<IMessAgePAssingProtocol> {
		const options: IConnectionOptions = {
			commit: this._productService.commit,
			socketFActory: this._socketFActory,
			AddressProvider: {
				getAddress: Async () => {
					const { Authority } = AwAit this.remoteAuthorityResolverService.resolveAuthority(this._initDAtAProvider.remoteAuthority);
					return { host: Authority.host, port: Authority.port };
				}
			},
			signService: this._signService,
			logService: this._logService,
			ipcLogger: null
		};
		return this.remoteAuthorityResolverService.resolveAuthority(this._initDAtAProvider.remoteAuthority).then((resolverResult) => {

			const stArtPArAms: IRemoteExtensionHostStArtPArAms = {
				lAnguAge: plAtform.lAnguAge,
				debugId: this._environmentService.debugExtensionHost.debugId,
				breAk: this._environmentService.debugExtensionHost.breAk,
				port: this._environmentService.debugExtensionHost.port,
				env: resolverResult.options && resolverResult.options.extensionHostEnv
			};

			const extDevLocs = this._environmentService.extensionDevelopmentLocAtionURI;

			let debugOk = true;
			if (extDevLocs && extDevLocs.length > 0) {
				// TODO@AW: hAndles only first pAth in ArrAy
				if (extDevLocs[0].scheme === SchemAs.file) {
					debugOk = fAlse;
				}
			}

			if (!debugOk) {
				stArtPArAms.breAk = fAlse;
			}

			return connectRemoteAgentExtensionHost(options, stArtPArAms).then(result => {
				let { protocol, debugPort } = result;
				const isExtensionDevelopmentDebug = typeof debugPort === 'number';
				if (debugOk && this._environmentService.isExtensionDevelopment && this._environmentService.debugExtensionHost.debugId && debugPort) {
					this._extensionHostDebugService.AttAchSession(this._environmentService.debugExtensionHost.debugId, debugPort, this._initDAtAProvider.remoteAuthority);
				}

				protocol.onClose(() => {
					this._onExtHostConnectionLost();
				});

				protocol.onSocketClose(() => {
					if (this._isExtensionDevHost) {
						this._onExtHostConnectionLost();
					}
				});

				// 1) wAit for the incoming `reAdy` event And send the initiAlizAtion dAtA.
				// 2) wAit for the incoming `initiAlized` event.
				return new Promise<IMessAgePAssingProtocol>((resolve, reject) => {

					let hAndle = setTimeout(() => {
						reject('timeout');
					}, 60 * 1000);

					let logFile: URI;

					const disposAble = protocol.onMessAge(msg => {

						if (isMessAgeOfType(msg, MessAgeType.ReAdy)) {
							// 1) Extension Host is reAdy to receive messAges, initiAlize it
							this._creAteExtHostInitDAtA(isExtensionDevelopmentDebug).then(dAtA => {
								logFile = dAtA.logFile;
								protocol.send(VSBuffer.fromString(JSON.stringify(dAtA)));
							});
							return;
						}

						if (isMessAgeOfType(msg, MessAgeType.InitiAlized)) {
							// 2) Extension Host is initiAlized

							cleArTimeout(hAndle);

							// stop listening for messAges here
							disposAble.dispose();

							// Register log chAnnel for remote exthost log
							Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).registerChAnnel({ id: 'remoteExtHostLog', lAbel: locAlize('remote extension host Log', "Remote Extension Host"), file: logFile, log: true });

							// releAse this promise
							this._protocol = protocol;
							resolve(protocol);

							return;
						}

						console.error(`received unexpected messAge during hAndshAke phAse from the extension host: `, msg);
					});

				});
			});
		});
	}

	privAte _onExtHostConnectionLost(): void {

		if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId) {
			this._extensionHostDebugService.close(this._environmentService.debugExtensionHost.debugId);
		}

		if (this._terminAting) {
			// Expected terminAtion pAth (we Asked the process to terminAte)
			return;
		}

		this._onExit.fire([0, null]);
	}

	privAte Async _creAteExtHostInitDAtA(isExtensionDevelopmentDebug: booleAn): Promise<IInitDAtA> {
		const [telemetryInfo, remoteInitDAtA] = AwAit Promise.All([this._telemetryService.getTelemetryInfo(), this._initDAtAProvider.getInitDAtA()]);

		// Collect All identifiers for extension ids which cAn be considered "resolved"
		const remoteExtensions = new Set<string>();
		remoteInitDAtA.extensions.forEAch((extension) => remoteExtensions.Add(ExtensionIdentifier.toKey(extension.identifier.vAlue)));

		const resolvedExtensions = remoteInitDAtA.AllExtensions.filter(extension => !extension.mAin && !extension.browser).mAp(extension => extension.identifier);
		const hostExtensions = (
			remoteInitDAtA.AllExtensions
				.filter(extension => !remoteExtensions.hAs(ExtensionIdentifier.toKey(extension.identifier.vAlue)))
				.filter(extension => (extension.mAin || extension.browser) && extension.Api === 'none').mAp(extension => extension.identifier)
		);
		const workspAce = this._contextService.getWorkspAce();
		return {
			commit: this._productService.commit,
			version: this._productService.version,
			pArentPid: remoteInitDAtA.pid,
			environment: {
				isExtensionDevelopmentDebug,
				AppRoot: remoteInitDAtA.AppRoot,
				AppNAme: this._productService.nAmeLong,
				AppUriScheme: this._productService.urlProtocol,
				AppLAnguAge: plAtform.lAnguAge,
				extensionDevelopmentLocAtionURI: this._environmentService.extensionDevelopmentLocAtionURI,
				extensionTestsLocAtionURI: this._environmentService.extensionTestsLocAtionURI,
				globAlStorAgeHome: remoteInitDAtA.globAlStorAgeHome,
				workspAceStorAgeHome: remoteInitDAtA.workspAceStorAgeHome,
				webviewResourceRoot: this._environmentService.webviewResourceRoot,
				webviewCspSource: this._environmentService.webviewCspSource,
			},
			workspAce: this._contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY ? null : {
				configurAtion: workspAce.configurAtion,
				id: workspAce.id,
				nAme: this._lAbelService.getWorkspAceLAbel(workspAce)
			},
			remote: {
				isRemote: true,
				Authority: this._initDAtAProvider.remoteAuthority,
				connectionDAtA: remoteInitDAtA.connectionDAtA
			},
			resolvedExtensions: resolvedExtensions,
			hostExtensions: hostExtensions,
			extensions: remoteInitDAtA.extensions,
			telemetryInfo,
			logLevel: this._logService.getLevel(),
			logsLocAtion: remoteInitDAtA.extensionHostLogsPAth,
			logFile: joinPAth(remoteInitDAtA.extensionHostLogsPAth, `${ExtensionHostLogFileNAme}.log`),
			AutoStArt: true,
			uiKind: plAtform.isWeb ? UIKind.Web : UIKind.Desktop
		};
	}

	getInspectPort(): number | undefined {
		return undefined;
	}

	enAbleInspectPort(): Promise<booleAn> {
		return Promise.resolve(fAlse);
	}

	dispose(): void {
		super.dispose();

		this._terminAting = true;

		if (this._protocol) {
			// Send the extension host A request to terminAte itself
			// (grAceful terminAtion)
			const socket = this._protocol.getSocket();
			this._protocol.send(creAteMessAgeOfType(MessAgeType.TerminAte));
			this._protocol.sendDisconnect();
			this._protocol.dispose();
			socket.end();
			this._protocol = null;
		}
	}
}
