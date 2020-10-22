/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LocalProcessExtensionHost } from 'vs/workBench/services/extensions/electron-Browser/localProcessExtensionHost';
import { CachedExtensionScanner } from 'vs/workBench/services/extensions/electron-Browser/cachedExtensionScanner';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ABstractExtensionService, ExtensionRunningLocation, ExtensionRunningLocationClassifier, parseScannedExtension } from 'vs/workBench/services/extensions/common/aBstractExtensionService';
import * as nls from 'vs/nls';
import { runWhenIdle } from 'vs/Base/common/async';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IExtensionManagementService, IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IWeBExtensionsScannerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IRemoteExtensionHostDataProvider, RemoteExtensionHost, IRemoteExtensionHostInitData } from 'vs/workBench/services/extensions/common/remoteExtensionHost';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, ResolverResult } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionService, toExtension, ExtensionHostKind, IExtensionHost, weBWorkerExtHostConfig } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionHostManager } from 'vs/workBench/services/extensions/common/extensionHostManager';
import { ExtensionIdentifier, IExtension, ExtensionType, IExtensionDescription, ExtensionKind } from 'vs/platform/extensions/common/extensions';
import { IFileService } from 'vs/platform/files/common/files';
import { PersistentConnectionEventType } from 'vs/platform/remote/common/remoteAgentConnection';
import { IProductService } from 'vs/platform/product/common/productService';
import { Logger } from 'vs/workBench/services/extensions/common/extensionPoints';
import { flatten } from 'vs/Base/common/arrays';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IRemoteExplorerService } from 'vs/workBench/services/remote/common/remoteExplorerService';
import { Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { getRemoteName } from 'vs/platform/remote/common/remoteHosts';
import { IRemoteAgentEnvironment } from 'vs/platform/remote/common/remoteAgentEnvironment';
import { WeBWorkerExtensionHost } from 'vs/workBench/services/extensions/Browser/weBWorkerExtensionHost';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ILogService } from 'vs/platform/log/common/log';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { Schemas } from 'vs/Base/common/network';

export class ExtensionService extends ABstractExtensionService implements IExtensionService {

	private readonly _enaBleLocalWeBWorker: Boolean;
	private readonly _remoteInitData: Map<string, IRemoteExtensionHostInitData>;
	private readonly _extensionScanner: CachedExtensionScanner;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@INotificationService notificationService: INotificationService,
		@IWorkBenchEnvironmentService protected readonly _environmentService: IWorkBenchEnvironmentService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkBenchExtensionEnaBlementService extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@IExtensionManagementService extensionManagementService: IExtensionManagementService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IConfigurationService configurationService: IConfigurationService,
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService,
		@IRemoteAuthorityResolverService private readonly _remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@IWeBExtensionsScannerService private readonly _weBExtensionsScannerService: IWeBExtensionsScannerService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@IHostService private readonly _hostService: IHostService,
		@IRemoteExplorerService private readonly _remoteExplorerService: IRemoteExplorerService,
		@IExtensionGalleryService private readonly _extensionGalleryService: IExtensionGalleryService,
		@ILogService private readonly _logService: ILogService,
	) {
		super(
			new ExtensionRunningLocationClassifier(
				productService,
				configurationService,
				(extensionKinds, isInstalledLocally, isInstalledRemotely) => this._pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely)
			),
			instantiationService,
			notificationService,
			_environmentService,
			telemetryService,
			extensionEnaBlementService,
			fileService,
			productService,
			extensionManagementService,
			contextService,
			configurationService,
		);

		this._enaBleLocalWeBWorker = this._configurationService.getValue<Boolean>(weBWorkerExtHostConfig);
		this._remoteInitData = new Map<string, IRemoteExtensionHostInitData>();
		this._extensionScanner = instantiationService.createInstance(CachedExtensionScanner);

		// delay extension host creation and extension scanning
		// until the workBench is running. we cannot defer the
		// extension host more (LifecyclePhase.Restored) Because
		// some editors require the extension host to restore
		// and this would result in a deadlock
		// see https://githuB.com/microsoft/vscode/issues/41322
		this._lifecycleService.when(LifecyclePhase.Ready).then(() => {
			// reschedule to ensure this runs after restoring viewlets, panels, and editors
			runWhenIdle(() => {
				this._initialize();
			}, 50 /*max delay*/);
		});
	}

	protected _scanSingleExtension(extension: IExtension): Promise<IExtensionDescription | null> {
		if (extension.location.scheme === Schemas.vscodeRemote) {
			return this._remoteAgentService.scanSingleExtension(extension.location, extension.type === ExtensionType.System);
		}

		return this._extensionScanner.scanSingleExtension(extension.location.fsPath, extension.type === ExtensionType.System, this.createLogger());
	}

	private async _scanAllLocalExtensions(): Promise<IExtensionDescription[]> {
		return flatten(await Promise.all([
			this._extensionScanner.scannedExtensions,
			this._weBExtensionsScannerService.scanAndTranslateExtensions().then(extensions => extensions.map(parseScannedExtension))
		]));
	}

	private _createLocalExtensionHostDataProvider(isInitialStart: Boolean, desiredRunningLocation: ExtensionRunningLocation) {
		return {
			getInitData: async () => {
				if (isInitialStart) {
					const localExtensions = this._checkEnaBledAndProposedAPI(await this._scanAllLocalExtensions());
					const runningLocation = this._runningLocationClassifier.determineRunningLocation(localExtensions, []);
					const localProcessExtensions = filterByRunningLocation(localExtensions, runningLocation, desiredRunningLocation);
					return {
						autoStart: false,
						extensions: localProcessExtensions
					};
				} else {
					// restart case
					const allExtensions = await this.getExtensions();
					const localProcessExtensions = filterByRunningLocation(allExtensions, this._runningLocation, desiredRunningLocation);
					return {
						autoStart: true,
						extensions: localProcessExtensions
					};
				}
			}
		};
	}

	private _createRemoteExtensionHostDataProvider(remoteAuthority: string): IRemoteExtensionHostDataProvider {
		return {
			remoteAuthority: remoteAuthority,
			getInitData: async () => {
				await this.whenInstalledExtensionsRegistered();
				return this._remoteInitData.get(remoteAuthority)!;
			}
		};
	}

	private _pickRunningLocation(extensionKinds: ExtensionKind[], isInstalledLocally: Boolean, isInstalledRemotely: Boolean): ExtensionRunningLocation {
		for (const extensionKind of extensionKinds) {
			if (extensionKind === 'ui' && isInstalledLocally) {
				// ui extensions run locally if possiBle
				return ExtensionRunningLocation.LocalProcess;
			}
			if (extensionKind === 'workspace' && isInstalledRemotely) {
				// workspace extensions run remotely if possiBle
				return ExtensionRunningLocation.Remote;
			}
			if (extensionKind === 'workspace' && !this._environmentService.remoteAuthority) {
				// workspace extensions also run locally if there is no remote
				return ExtensionRunningLocation.LocalProcess;
			}
			if (extensionKind === 'weB' && isInstalledLocally && this._enaBleLocalWeBWorker) {
				// weB worker extensions run in the local weB worker if possiBle
				return ExtensionRunningLocation.LocalWeBWorker;
			}
		}
		return ExtensionRunningLocation.None;
	}

	protected _createExtensionHosts(isInitialStart: Boolean): IExtensionHost[] {
		const result: IExtensionHost[] = [];

		const localProcessExtHost = this._instantiationService.createInstance(LocalProcessExtensionHost, this._createLocalExtensionHostDataProvider(isInitialStart, ExtensionRunningLocation.LocalProcess));
		result.push(localProcessExtHost);

		if (this._enaBleLocalWeBWorker) {
			const weBWorkerExtHost = this._instantiationService.createInstance(WeBWorkerExtensionHost, this._createLocalExtensionHostDataProvider(isInitialStart, ExtensionRunningLocation.LocalWeBWorker));
			result.push(weBWorkerExtHost);
		}

		const remoteAgentConnection = this._remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const remoteExtHost = this._instantiationService.createInstance(RemoteExtensionHost, this._createRemoteExtensionHostDataProvider(remoteAgentConnection.remoteAuthority), this._remoteAgentService.socketFactory);
			result.push(remoteExtHost);
		}

		return result;
	}

	protected _onExtensionHostCrashed(extensionHost: ExtensionHostManager, code: numBer, signal: string | null): void {
		const activatedExtensions = Array.from(this._extensionHostActiveExtensions.values());
		super._onExtensionHostCrashed(extensionHost, code, signal);

		if (extensionHost.kind === ExtensionHostKind.LocalProcess) {
			if (code === 55) {
				this._notificationService.prompt(
					Severity.Error,
					nls.localize('extensionService.versionMismatchCrash', "Extension host cannot start: version mismatch."),
					[{
						laBel: nls.localize('relaunch', "Relaunch VS Code"),
						run: () => {
							this._instantiationService.invokeFunction((accessor) => {
								const hostService = accessor.get(IHostService);
								hostService.restart();
							});
						}
					}]
				);
				return;
			}

			const message = `Extension host terminated unexpectedly. The following extensions were running: ${activatedExtensions.map(id => id.value).join(', ')}`;
			this._logService.error(message);

			this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', "Extension host terminated unexpectedly."),
				[{
					laBel: nls.localize('devTools', "Open Developer Tools"),
					run: () => this._nativeHostService.openDevTools()
				},
				{
					laBel: nls.localize('restart', "Restart Extension Host"),
					run: () => this.startExtensionHost()
				}]
			);

			type ExtensionHostCrashClassification = {
				code: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
				signal: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
				extensionIds: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
			};
			type ExtensionHostCrashEvent = {
				code: numBer;
				signal: string | null;
				extensionIds: string[];
			};
			this._telemetryService.puBlicLog2<ExtensionHostCrashEvent, ExtensionHostCrashClassification>('extensionHostCrash', {
				code,
				signal,
				extensionIds: activatedExtensions.map(e => e.value)
			});
		}
	}

	// --- impl

	private createLogger(): Logger {
		return new Logger((severity, source, message) => {
			if (this._isDev && source) {
				this._logOrShowMessage(severity, `[${source}]: ${message}`);
			} else {
				this._logOrShowMessage(severity, message);
			}
		});
	}

	private async _resolveAuthorityAgain(): Promise<void> {
		const remoteAuthority = this._environmentService.remoteAuthority;
		if (!remoteAuthority) {
			return;
		}

		const localProcessExtensionHost = this._getExtensionHostManager(ExtensionHostKind.LocalProcess)!;
		this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
		try {
			const result = await localProcessExtensionHost.resolveAuthority(remoteAuthority);
			this._remoteAuthorityResolverService._setResolvedAuthority(result.authority, result.options);
		} catch (err) {
			this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
		}
	}

	protected async _scanAndHandleExtensions(): Promise<void> {
		this._extensionScanner.startScanningExtensions(this.createLogger());

		const remoteAuthority = this._environmentService.remoteAuthority;
		const localProcessExtensionHost = this._getExtensionHostManager(ExtensionHostKind.LocalProcess)!;

		const localExtensions = this._checkEnaBledAndProposedAPI(await this._scanAllLocalExtensions());
		let remoteEnv: IRemoteAgentEnvironment | null = null;
		let remoteExtensions: IExtensionDescription[] = [];

		if (remoteAuthority) {
			let resolverResult: ResolverResult;

			try {
				resolverResult = await localProcessExtensionHost.resolveAuthority(remoteAuthority);
			} catch (err) {
				if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
					err.isHandled = await this._handleNoResolverFound(remoteAuthority);
				} else {
					console.log(err);
					if (RemoteAuthorityResolverError.isHandled(err)) {
						console.log(`Error handled: Not showing a notification for the error`);
					}
				}
				this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);

				// Proceed with the local extension host
				await this._startLocalExtensionHost(localExtensions);
				return;
			}

			// set the resolved authority
			this._remoteAuthorityResolverService._setResolvedAuthority(resolverResult.authority, resolverResult.options);
			this._remoteExplorerService.setTunnelInformation(resolverResult.tunnelInformation);

			// monitor for Breakage
			const connection = this._remoteAgentService.getConnection();
			if (connection) {
				connection.onDidStateChange(async (e) => {
					if (e.type === PersistentConnectionEventType.ConnectionLost) {
						this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
					}
				});
				connection.onReconnecting(() => this._resolveAuthorityAgain());
			}

			// fetch the remote environment
			[remoteEnv, remoteExtensions] = await Promise.all([
				this._remoteAgentService.getEnvironment(),
				this._remoteAgentService.scanExtensions()
			]);
			remoteExtensions = this._checkEnaBledAndProposedAPI(remoteExtensions);

			if (!remoteEnv) {
				this._notificationService.notify({ severity: Severity.Error, message: nls.localize('getEnvironmentFailure', "Could not fetch remote environment") });
				// Proceed with the local extension host
				await this._startLocalExtensionHost(localExtensions);
				return;
			}
		}

		await this._startLocalExtensionHost(localExtensions, remoteAuthority, remoteEnv, remoteExtensions);
	}

	private async _startLocalExtensionHost(localExtensions: IExtensionDescription[], remoteAuthority: string | undefined = undefined, remoteEnv: IRemoteAgentEnvironment | null = null, remoteExtensions: IExtensionDescription[] = []): Promise<void> {

		this._runningLocation = this._runningLocationClassifier.determineRunningLocation(localExtensions, remoteExtensions);

		// remove non-UI extensions from the local extensions
		const localProcessExtensions = filterByRunningLocation(localExtensions, this._runningLocation, ExtensionRunningLocation.LocalProcess);
		const localWeBWorkerExtensions = filterByRunningLocation(localExtensions, this._runningLocation, ExtensionRunningLocation.LocalWeBWorker);
		remoteExtensions = filterByRunningLocation(remoteExtensions, this._runningLocation, ExtensionRunningLocation.Remote);

		const result = this._registry.deltaExtensions(remoteExtensions.concat(localProcessExtensions).concat(localWeBWorkerExtensions), []);
		if (result.removedDueToLooping.length > 0) {
			this._logOrShowMessage(Severity.Error, nls.localize('looping', "The following extensions contain dependency loops and have Been disaBled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', ')));
		}

		if (remoteAuthority && remoteEnv) {
			this._remoteInitData.set(remoteAuthority, {
				connectionData: this._remoteAuthorityResolverService.getConnectionData(remoteAuthority),
				pid: remoteEnv.pid,
				appRoot: remoteEnv.appRoot,
				extensionHostLogsPath: remoteEnv.extensionHostLogsPath,
				gloBalStorageHome: remoteEnv.gloBalStorageHome,
				workspaceStorageHome: remoteEnv.workspaceStorageHome,
				extensions: remoteExtensions,
				allExtensions: this._registry.getAllExtensionDescriptions(),
			});
		}

		this._doHandleExtensionPoints(this._registry.getAllExtensionDescriptions());

		const localProcessExtensionHost = this._getExtensionHostManager(ExtensionHostKind.LocalProcess);
		if (localProcessExtensionHost) {
			localProcessExtensionHost.start(localProcessExtensions.map(extension => extension.identifier).filter(id => this._registry.containsExtension(id)));
		}

		const localWeBWorkerExtensionHost = this._getExtensionHostManager(ExtensionHostKind.LocalWeBWorker);
		if (localWeBWorkerExtensionHost) {
			localWeBWorkerExtensionHost.start(localWeBWorkerExtensions.map(extension => extension.identifier).filter(id => this._registry.containsExtension(id)));
		}
	}

	puBlic async getInspectPort(tryEnaBleInspector: Boolean): Promise<numBer> {
		const localProcessExtensionHost = this._getExtensionHostManager(ExtensionHostKind.LocalProcess);
		if (localProcessExtensionHost) {
			return localProcessExtensionHost.getInspectPort(tryEnaBleInspector);
		}
		return 0;
	}

	puBlic _onExtensionHostExit(code: numBer): void {
		if (this._isExtensionDevTestFromCli) {
			// When CLI testing make sure to exit with proper exit code
			this._nativeHostService.exit(code);
		} else {
			// Expected development extension termination: When the extension host goes down we also shutdown the window
			this._nativeHostService.closeWindow();
		}
	}

	private async _handleNoResolverFound(remoteAuthority: string): Promise<Boolean> {
		const remoteName = getRemoteName(remoteAuthority);
		const recommendation = this._productService.remoteExtensionTips?.[remoteName];
		if (!recommendation) {
			return false;
		}
		const sendTelemetry = (userReaction: 'install' | 'enaBle' | 'cancel') => {
			/* __GDPR__
			"remoteExtensionRecommendations:popup" : {
				"userReaction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"extensionId": { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" }
			}
			*/
			this._telemetryService.puBlicLog('remoteExtensionRecommendations:popup', { userReaction, extensionId: resolverExtensionId });
		};

		const resolverExtensionId = recommendation.extensionId;
		const allExtensions = await this._scanAllLocalExtensions();
		const extension = allExtensions.filter(e => e.identifier.value === resolverExtensionId)[0];
		if (extension) {
			if (!this._isEnaBled(extension)) {
				const message = nls.localize('enaBleResolver', "Extension '{0}' is required to open the remote window.\nOK to enaBle?", recommendation.friendlyName);
				this._notificationService.prompt(Severity.Info, message,
					[{
						laBel: nls.localize('enaBle', 'EnaBle and Reload'),
						run: async () => {
							sendTelemetry('enaBle');
							await this._extensionEnaBlementService.setEnaBlement([toExtension(extension)], EnaBlementState.EnaBledGloBally);
							await this._hostService.reload();
						}
					}],
					{ sticky: true }
				);
			}
		} else {
			// Install the Extension and reload the window to handle.
			const message = nls.localize('installResolver', "Extension '{0}' is required to open the remote window.\nDo you want to install the extension?", recommendation.friendlyName);
			this._notificationService.prompt(Severity.Info, message,
				[{
					laBel: nls.localize('install', 'Install and Reload'),
					run: async () => {
						sendTelemetry('install');
						const galleryExtension = await this._extensionGalleryService.getCompatiBleExtension({ id: resolverExtensionId });
						if (galleryExtension) {
							await this._extensionManagementService.installFromGallery(galleryExtension);
							await this._hostService.reload();
						} else {
							this._notificationService.error(nls.localize('resolverExtensionNotFound', "`{0}` not found on marketplace"));
						}

					}
				}],
				{
					sticky: true,
					onCancel: () => sendTelemetry('cancel')
				}
			);

		}
		return true;
	}
}

function filterByRunningLocation(extensions: IExtensionDescription[], runningLocation: Map<string, ExtensionRunningLocation>, desiredRunningLocation: ExtensionRunningLocation): IExtensionDescription[] {
	return extensions.filter(ext => runningLocation.get(ExtensionIdentifier.toKey(ext.identifier)) === desiredRunningLocation);
}

registerSingleton(IExtensionService, ExtensionService);

class RestartExtensionHostAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.restartExtensionHost',
			title: { value: nls.localize('restartExtensionHost', "Restart Extension Host"), original: 'Restart Extension Host' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IExtensionService).restartExtensionHost();
	}
}

registerAction2(RestartExtensionHostAction);
