/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LocAlProcessExtensionHost } from 'vs/workbench/services/extensions/electron-browser/locAlProcessExtensionHost';
import { CAchedExtensionScAnner } from 'vs/workbench/services/extensions/electron-browser/cAchedExtensionScAnner';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { AbstrActExtensionService, ExtensionRunningLocAtion, ExtensionRunningLocAtionClAssifier, pArseScAnnedExtension } from 'vs/workbench/services/extensions/common/AbstrActExtensionService';
import * As nls from 'vs/nls';
import { runWhenIdle } from 'vs/bAse/common/Async';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IExtensionMAnAgementService, IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService, EnAblementStAte, IWebExtensionsScAnnerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IRemoteExtensionHostDAtAProvider, RemoteExtensionHost, IRemoteExtensionHostInitDAtA } from 'vs/workbench/services/extensions/common/remoteExtensionHost';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, ResolverResult } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IExtensionService, toExtension, ExtensionHostKind, IExtensionHost, webWorkerExtHostConfig } from 'vs/workbench/services/extensions/common/extensions';
import { ExtensionHostMAnAger } from 'vs/workbench/services/extensions/common/extensionHostMAnAger';
import { ExtensionIdentifier, IExtension, ExtensionType, IExtensionDescription, ExtensionKind } from 'vs/plAtform/extensions/common/extensions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { PersistentConnectionEventType } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { Logger } from 'vs/workbench/services/extensions/common/extensionPoints';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IRemoteExplorerService } from 'vs/workbench/services/remote/common/remoteExplorerService';
import { Action2, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { getRemoteNAme } from 'vs/plAtform/remote/common/remoteHosts';
import { IRemoteAgentEnvironment } from 'vs/plAtform/remote/common/remoteAgentEnvironment';
import { WebWorkerExtensionHost } from 'vs/workbench/services/extensions/browser/webWorkerExtensionHost';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ILogService } from 'vs/plAtform/log/common/log';
import { CATEGORIES } from 'vs/workbench/common/Actions';
import { SchemAs } from 'vs/bAse/common/network';

export clAss ExtensionService extends AbstrActExtensionService implements IExtensionService {

	privAte reAdonly _enAbleLocAlWebWorker: booleAn;
	privAte reAdonly _remoteInitDAtA: MAp<string, IRemoteExtensionHostInitDAtA>;
	privAte reAdonly _extensionScAnner: CAchedExtensionScAnner;

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IWorkbenchEnvironmentService protected reAdonly _environmentService: IWorkbenchEnvironmentService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkbenchExtensionEnAblementService extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@IExtensionMAnAgementService extensionMAnAgementService: IExtensionMAnAgementService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IRemoteAgentService privAte reAdonly _remoteAgentService: IRemoteAgentService,
		@IRemoteAuthorityResolverService privAte reAdonly _remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ILifecycleService privAte reAdonly _lifecycleService: ILifecycleService,
		@IWebExtensionsScAnnerService privAte reAdonly _webExtensionsScAnnerService: IWebExtensionsScAnnerService,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@IHostService privAte reAdonly _hostService: IHostService,
		@IRemoteExplorerService privAte reAdonly _remoteExplorerService: IRemoteExplorerService,
		@IExtensionGAlleryService privAte reAdonly _extensionGAlleryService: IExtensionGAlleryService,
		@ILogService privAte reAdonly _logService: ILogService,
	) {
		super(
			new ExtensionRunningLocAtionClAssifier(
				productService,
				configurAtionService,
				(extensionKinds, isInstAlledLocAlly, isInstAlledRemotely) => this._pickRunningLocAtion(extensionKinds, isInstAlledLocAlly, isInstAlledRemotely)
			),
			instAntiAtionService,
			notificAtionService,
			_environmentService,
			telemetryService,
			extensionEnAblementService,
			fileService,
			productService,
			extensionMAnAgementService,
			contextService,
			configurAtionService,
		);

		this._enAbleLocAlWebWorker = this._configurAtionService.getVAlue<booleAn>(webWorkerExtHostConfig);
		this._remoteInitDAtA = new MAp<string, IRemoteExtensionHostInitDAtA>();
		this._extensionScAnner = instAntiAtionService.creAteInstAnce(CAchedExtensionScAnner);

		// delAy extension host creAtion And extension scAnning
		// until the workbench is running. we cAnnot defer the
		// extension host more (LifecyclePhAse.Restored) becAuse
		// some editors require the extension host to restore
		// And this would result in A deAdlock
		// see https://github.com/microsoft/vscode/issues/41322
		this._lifecycleService.when(LifecyclePhAse.ReAdy).then(() => {
			// reschedule to ensure this runs After restoring viewlets, pAnels, And editors
			runWhenIdle(() => {
				this._initiAlize();
			}, 50 /*mAx delAy*/);
		});
	}

	protected _scAnSingleExtension(extension: IExtension): Promise<IExtensionDescription | null> {
		if (extension.locAtion.scheme === SchemAs.vscodeRemote) {
			return this._remoteAgentService.scAnSingleExtension(extension.locAtion, extension.type === ExtensionType.System);
		}

		return this._extensionScAnner.scAnSingleExtension(extension.locAtion.fsPAth, extension.type === ExtensionType.System, this.creAteLogger());
	}

	privAte Async _scAnAllLocAlExtensions(): Promise<IExtensionDescription[]> {
		return flAtten(AwAit Promise.All([
			this._extensionScAnner.scAnnedExtensions,
			this._webExtensionsScAnnerService.scAnAndTrAnslAteExtensions().then(extensions => extensions.mAp(pArseScAnnedExtension))
		]));
	}

	privAte _creAteLocAlExtensionHostDAtAProvider(isInitiAlStArt: booleAn, desiredRunningLocAtion: ExtensionRunningLocAtion) {
		return {
			getInitDAtA: Async () => {
				if (isInitiAlStArt) {
					const locAlExtensions = this._checkEnAbledAndProposedAPI(AwAit this._scAnAllLocAlExtensions());
					const runningLocAtion = this._runningLocAtionClAssifier.determineRunningLocAtion(locAlExtensions, []);
					const locAlProcessExtensions = filterByRunningLocAtion(locAlExtensions, runningLocAtion, desiredRunningLocAtion);
					return {
						AutoStArt: fAlse,
						extensions: locAlProcessExtensions
					};
				} else {
					// restArt cAse
					const AllExtensions = AwAit this.getExtensions();
					const locAlProcessExtensions = filterByRunningLocAtion(AllExtensions, this._runningLocAtion, desiredRunningLocAtion);
					return {
						AutoStArt: true,
						extensions: locAlProcessExtensions
					};
				}
			}
		};
	}

	privAte _creAteRemoteExtensionHostDAtAProvider(remoteAuthority: string): IRemoteExtensionHostDAtAProvider {
		return {
			remoteAuthority: remoteAuthority,
			getInitDAtA: Async () => {
				AwAit this.whenInstAlledExtensionsRegistered();
				return this._remoteInitDAtA.get(remoteAuthority)!;
			}
		};
	}

	privAte _pickRunningLocAtion(extensionKinds: ExtensionKind[], isInstAlledLocAlly: booleAn, isInstAlledRemotely: booleAn): ExtensionRunningLocAtion {
		for (const extensionKind of extensionKinds) {
			if (extensionKind === 'ui' && isInstAlledLocAlly) {
				// ui extensions run locAlly if possible
				return ExtensionRunningLocAtion.LocAlProcess;
			}
			if (extensionKind === 'workspAce' && isInstAlledRemotely) {
				// workspAce extensions run remotely if possible
				return ExtensionRunningLocAtion.Remote;
			}
			if (extensionKind === 'workspAce' && !this._environmentService.remoteAuthority) {
				// workspAce extensions Also run locAlly if there is no remote
				return ExtensionRunningLocAtion.LocAlProcess;
			}
			if (extensionKind === 'web' && isInstAlledLocAlly && this._enAbleLocAlWebWorker) {
				// web worker extensions run in the locAl web worker if possible
				return ExtensionRunningLocAtion.LocAlWebWorker;
			}
		}
		return ExtensionRunningLocAtion.None;
	}

	protected _creAteExtensionHosts(isInitiAlStArt: booleAn): IExtensionHost[] {
		const result: IExtensionHost[] = [];

		const locAlProcessExtHost = this._instAntiAtionService.creAteInstAnce(LocAlProcessExtensionHost, this._creAteLocAlExtensionHostDAtAProvider(isInitiAlStArt, ExtensionRunningLocAtion.LocAlProcess));
		result.push(locAlProcessExtHost);

		if (this._enAbleLocAlWebWorker) {
			const webWorkerExtHost = this._instAntiAtionService.creAteInstAnce(WebWorkerExtensionHost, this._creAteLocAlExtensionHostDAtAProvider(isInitiAlStArt, ExtensionRunningLocAtion.LocAlWebWorker));
			result.push(webWorkerExtHost);
		}

		const remoteAgentConnection = this._remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const remoteExtHost = this._instAntiAtionService.creAteInstAnce(RemoteExtensionHost, this._creAteRemoteExtensionHostDAtAProvider(remoteAgentConnection.remoteAuthority), this._remoteAgentService.socketFActory);
			result.push(remoteExtHost);
		}

		return result;
	}

	protected _onExtensionHostCrAshed(extensionHost: ExtensionHostMAnAger, code: number, signAl: string | null): void {
		const ActivAtedExtensions = ArrAy.from(this._extensionHostActiveExtensions.vAlues());
		super._onExtensionHostCrAshed(extensionHost, code, signAl);

		if (extensionHost.kind === ExtensionHostKind.LocAlProcess) {
			if (code === 55) {
				this._notificAtionService.prompt(
					Severity.Error,
					nls.locAlize('extensionService.versionMismAtchCrAsh', "Extension host cAnnot stArt: version mismAtch."),
					[{
						lAbel: nls.locAlize('relAunch', "RelAunch VS Code"),
						run: () => {
							this._instAntiAtionService.invokeFunction((Accessor) => {
								const hostService = Accessor.get(IHostService);
								hostService.restArt();
							});
						}
					}]
				);
				return;
			}

			const messAge = `Extension host terminAted unexpectedly. The following extensions were running: ${ActivAtedExtensions.mAp(id => id.vAlue).join(', ')}`;
			this._logService.error(messAge);

			this._notificAtionService.prompt(Severity.Error, nls.locAlize('extensionService.crAsh', "Extension host terminAted unexpectedly."),
				[{
					lAbel: nls.locAlize('devTools', "Open Developer Tools"),
					run: () => this._nAtiveHostService.openDevTools()
				},
				{
					lAbel: nls.locAlize('restArt', "RestArt Extension Host"),
					run: () => this.stArtExtensionHost()
				}]
			);

			type ExtensionHostCrAshClAssificAtion = {
				code: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				signAl: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
				extensionIds: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
			};
			type ExtensionHostCrAshEvent = {
				code: number;
				signAl: string | null;
				extensionIds: string[];
			};
			this._telemetryService.publicLog2<ExtensionHostCrAshEvent, ExtensionHostCrAshClAssificAtion>('extensionHostCrAsh', {
				code,
				signAl,
				extensionIds: ActivAtedExtensions.mAp(e => e.vAlue)
			});
		}
	}

	// --- impl

	privAte creAteLogger(): Logger {
		return new Logger((severity, source, messAge) => {
			if (this._isDev && source) {
				this._logOrShowMessAge(severity, `[${source}]: ${messAge}`);
			} else {
				this._logOrShowMessAge(severity, messAge);
			}
		});
	}

	privAte Async _resolveAuthorityAgAin(): Promise<void> {
		const remoteAuthority = this._environmentService.remoteAuthority;
		if (!remoteAuthority) {
			return;
		}

		const locAlProcessExtensionHost = this._getExtensionHostMAnAger(ExtensionHostKind.LocAlProcess)!;
		this._remoteAuthorityResolverService._cleArResolvedAuthority(remoteAuthority);
		try {
			const result = AwAit locAlProcessExtensionHost.resolveAuthority(remoteAuthority);
			this._remoteAuthorityResolverService._setResolvedAuthority(result.Authority, result.options);
		} cAtch (err) {
			this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
		}
	}

	protected Async _scAnAndHAndleExtensions(): Promise<void> {
		this._extensionScAnner.stArtScAnningExtensions(this.creAteLogger());

		const remoteAuthority = this._environmentService.remoteAuthority;
		const locAlProcessExtensionHost = this._getExtensionHostMAnAger(ExtensionHostKind.LocAlProcess)!;

		const locAlExtensions = this._checkEnAbledAndProposedAPI(AwAit this._scAnAllLocAlExtensions());
		let remoteEnv: IRemoteAgentEnvironment | null = null;
		let remoteExtensions: IExtensionDescription[] = [];

		if (remoteAuthority) {
			let resolverResult: ResolverResult;

			try {
				resolverResult = AwAit locAlProcessExtensionHost.resolveAuthority(remoteAuthority);
			} cAtch (err) {
				if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
					err.isHAndled = AwAit this._hAndleNoResolverFound(remoteAuthority);
				} else {
					console.log(err);
					if (RemoteAuthorityResolverError.isHAndled(err)) {
						console.log(`Error hAndled: Not showing A notificAtion for the error`);
					}
				}
				this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);

				// Proceed with the locAl extension host
				AwAit this._stArtLocAlExtensionHost(locAlExtensions);
				return;
			}

			// set the resolved Authority
			this._remoteAuthorityResolverService._setResolvedAuthority(resolverResult.Authority, resolverResult.options);
			this._remoteExplorerService.setTunnelInformAtion(resolverResult.tunnelInformAtion);

			// monitor for breAkAge
			const connection = this._remoteAgentService.getConnection();
			if (connection) {
				connection.onDidStAteChAnge(Async (e) => {
					if (e.type === PersistentConnectionEventType.ConnectionLost) {
						this._remoteAuthorityResolverService._cleArResolvedAuthority(remoteAuthority);
					}
				});
				connection.onReconnecting(() => this._resolveAuthorityAgAin());
			}

			// fetch the remote environment
			[remoteEnv, remoteExtensions] = AwAit Promise.All([
				this._remoteAgentService.getEnvironment(),
				this._remoteAgentService.scAnExtensions()
			]);
			remoteExtensions = this._checkEnAbledAndProposedAPI(remoteExtensions);

			if (!remoteEnv) {
				this._notificAtionService.notify({ severity: Severity.Error, messAge: nls.locAlize('getEnvironmentFAilure', "Could not fetch remote environment") });
				// Proceed with the locAl extension host
				AwAit this._stArtLocAlExtensionHost(locAlExtensions);
				return;
			}
		}

		AwAit this._stArtLocAlExtensionHost(locAlExtensions, remoteAuthority, remoteEnv, remoteExtensions);
	}

	privAte Async _stArtLocAlExtensionHost(locAlExtensions: IExtensionDescription[], remoteAuthority: string | undefined = undefined, remoteEnv: IRemoteAgentEnvironment | null = null, remoteExtensions: IExtensionDescription[] = []): Promise<void> {

		this._runningLocAtion = this._runningLocAtionClAssifier.determineRunningLocAtion(locAlExtensions, remoteExtensions);

		// remove non-UI extensions from the locAl extensions
		const locAlProcessExtensions = filterByRunningLocAtion(locAlExtensions, this._runningLocAtion, ExtensionRunningLocAtion.LocAlProcess);
		const locAlWebWorkerExtensions = filterByRunningLocAtion(locAlExtensions, this._runningLocAtion, ExtensionRunningLocAtion.LocAlWebWorker);
		remoteExtensions = filterByRunningLocAtion(remoteExtensions, this._runningLocAtion, ExtensionRunningLocAtion.Remote);

		const result = this._registry.deltAExtensions(remoteExtensions.concAt(locAlProcessExtensions).concAt(locAlWebWorkerExtensions), []);
		if (result.removedDueToLooping.length > 0) {
			this._logOrShowMessAge(Severity.Error, nls.locAlize('looping', "The following extensions contAin dependency loops And hAve been disAbled: {0}", result.removedDueToLooping.mAp(e => `'${e.identifier.vAlue}'`).join(', ')));
		}

		if (remoteAuthority && remoteEnv) {
			this._remoteInitDAtA.set(remoteAuthority, {
				connectionDAtA: this._remoteAuthorityResolverService.getConnectionDAtA(remoteAuthority),
				pid: remoteEnv.pid,
				AppRoot: remoteEnv.AppRoot,
				extensionHostLogsPAth: remoteEnv.extensionHostLogsPAth,
				globAlStorAgeHome: remoteEnv.globAlStorAgeHome,
				workspAceStorAgeHome: remoteEnv.workspAceStorAgeHome,
				extensions: remoteExtensions,
				AllExtensions: this._registry.getAllExtensionDescriptions(),
			});
		}

		this._doHAndleExtensionPoints(this._registry.getAllExtensionDescriptions());

		const locAlProcessExtensionHost = this._getExtensionHostMAnAger(ExtensionHostKind.LocAlProcess);
		if (locAlProcessExtensionHost) {
			locAlProcessExtensionHost.stArt(locAlProcessExtensions.mAp(extension => extension.identifier).filter(id => this._registry.contAinsExtension(id)));
		}

		const locAlWebWorkerExtensionHost = this._getExtensionHostMAnAger(ExtensionHostKind.LocAlWebWorker);
		if (locAlWebWorkerExtensionHost) {
			locAlWebWorkerExtensionHost.stArt(locAlWebWorkerExtensions.mAp(extension => extension.identifier).filter(id => this._registry.contAinsExtension(id)));
		}
	}

	public Async getInspectPort(tryEnAbleInspector: booleAn): Promise<number> {
		const locAlProcessExtensionHost = this._getExtensionHostMAnAger(ExtensionHostKind.LocAlProcess);
		if (locAlProcessExtensionHost) {
			return locAlProcessExtensionHost.getInspectPort(tryEnAbleInspector);
		}
		return 0;
	}

	public _onExtensionHostExit(code: number): void {
		if (this._isExtensionDevTestFromCli) {
			// When CLI testing mAke sure to exit with proper exit code
			this._nAtiveHostService.exit(code);
		} else {
			// Expected development extension terminAtion: When the extension host goes down we Also shutdown the window
			this._nAtiveHostService.closeWindow();
		}
	}

	privAte Async _hAndleNoResolverFound(remoteAuthority: string): Promise<booleAn> {
		const remoteNAme = getRemoteNAme(remoteAuthority);
		const recommendAtion = this._productService.remoteExtensionTips?.[remoteNAme];
		if (!recommendAtion) {
			return fAlse;
		}
		const sendTelemetry = (userReAction: 'instAll' | 'enAble' | 'cAncel') => {
			/* __GDPR__
			"remoteExtensionRecommendAtions:popup" : {
				"userReAction" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"extensionId": { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" }
			}
			*/
			this._telemetryService.publicLog('remoteExtensionRecommendAtions:popup', { userReAction, extensionId: resolverExtensionId });
		};

		const resolverExtensionId = recommendAtion.extensionId;
		const AllExtensions = AwAit this._scAnAllLocAlExtensions();
		const extension = AllExtensions.filter(e => e.identifier.vAlue === resolverExtensionId)[0];
		if (extension) {
			if (!this._isEnAbled(extension)) {
				const messAge = nls.locAlize('enAbleResolver', "Extension '{0}' is required to open the remote window.\nOK to enAble?", recommendAtion.friendlyNAme);
				this._notificAtionService.prompt(Severity.Info, messAge,
					[{
						lAbel: nls.locAlize('enAble', 'EnAble And ReloAd'),
						run: Async () => {
							sendTelemetry('enAble');
							AwAit this._extensionEnAblementService.setEnAblement([toExtension(extension)], EnAblementStAte.EnAbledGlobAlly);
							AwAit this._hostService.reloAd();
						}
					}],
					{ sticky: true }
				);
			}
		} else {
			// InstAll the Extension And reloAd the window to hAndle.
			const messAge = nls.locAlize('instAllResolver', "Extension '{0}' is required to open the remote window.\nDo you wAnt to instAll the extension?", recommendAtion.friendlyNAme);
			this._notificAtionService.prompt(Severity.Info, messAge,
				[{
					lAbel: nls.locAlize('instAll', 'InstAll And ReloAd'),
					run: Async () => {
						sendTelemetry('instAll');
						const gAlleryExtension = AwAit this._extensionGAlleryService.getCompAtibleExtension({ id: resolverExtensionId });
						if (gAlleryExtension) {
							AwAit this._extensionMAnAgementService.instAllFromGAllery(gAlleryExtension);
							AwAit this._hostService.reloAd();
						} else {
							this._notificAtionService.error(nls.locAlize('resolverExtensionNotFound', "`{0}` not found on mArketplAce"));
						}

					}
				}],
				{
					sticky: true,
					onCAncel: () => sendTelemetry('cAncel')
				}
			);

		}
		return true;
	}
}

function filterByRunningLocAtion(extensions: IExtensionDescription[], runningLocAtion: MAp<string, ExtensionRunningLocAtion>, desiredRunningLocAtion: ExtensionRunningLocAtion): IExtensionDescription[] {
	return extensions.filter(ext => runningLocAtion.get(ExtensionIdentifier.toKey(ext.identifier)) === desiredRunningLocAtion);
}

registerSingleton(IExtensionService, ExtensionService);

clAss RestArtExtensionHostAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.restArtExtensionHost',
			title: { vAlue: nls.locAlize('restArtExtensionHost', "RestArt Extension Host"), originAl: 'RestArt Extension Host' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		Accessor.get(IExtensionService).restArtExtensionHost();
	}
}

registerAction2(RestArtExtensionHostAction);
