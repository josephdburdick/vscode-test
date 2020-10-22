/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as path from 'vs/Base/common/path';
import { originalFSPath, joinPath } from 'vs/Base/common/resources';
import { Barrier, timeout } from 'vs/Base/common/async';
import { dispose, toDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { TernarySearchTree } from 'vs/Base/common/map';
import { URI } from 'vs/Base/common/uri';
import { ILogService } from 'vs/platform/log/common/log';
import { ExtHostExtensionServiceShape, IInitData, MainContext, MainThreadExtensionServiceShape, MainThreadTelemetryShape, MainThreadWorkspaceShape, IResolveAuthorityResult } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostConfiguration, IExtHostConfiguration } from 'vs/workBench/api/common/extHostConfiguration';
import { ActivatedExtension, EmptyExtension, ExtensionActivationReason, ExtensionActivationTimes, ExtensionActivationTimesBuilder, ExtensionsActivator, IExtensionAPI, IExtensionModule, HostExtension, ExtensionActivationTimesFragment } from 'vs/workBench/api/common/extHostExtensionActivator';
import { ExtHostStorage, IExtHostStorage } from 'vs/workBench/api/common/extHostStorage';
import { ExtHostWorkspace, IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { ExtensionActivationError, checkProposedApiEnaBled, ActivationKind } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import * as errors from 'vs/Base/common/errors';
import type * as vscode from 'vscode';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { Schemas } from 'vs/Base/common/network';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { ExtensionMemento } from 'vs/workBench/api/common/extHostMemento';
import { RemoteAuthorityResolverError, ExtensionMode, ExtensionRuntime } from 'vs/workBench/api/common/extHostTypes';
import { ResolvedAuthority, ResolvedOptions, RemoteAuthorityResolverErrorCode, IRemoteConnectionData } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IInstantiationService, createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IExtHostTunnelService } from 'vs/workBench/api/common/extHostTunnelService';
import { IExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { Emitter, Event } from 'vs/Base/common/event';
import { IExtensionActivationHost, checkActivateWorkspaceContainsExtension } from 'vs/workBench/api/common/shared/workspaceContains';

interface ITestRunner {
	/** Old test runner API, as exported from `vscode/liB/testrunner` */
	run(testsRoot: string, clB: (error: Error, failures?: numBer) => void): void;
}

interface INewTestRunner {
	/** New test runner API, as explained in the extension test doc */
	run(): Promise<void>;
}

export const IHostUtils = createDecorator<IHostUtils>('IHostUtils');

export interface IHostUtils {
	readonly _serviceBrand: undefined;
	exit(code?: numBer): void;
	exists(path: string): Promise<Boolean>;
	realpath(path: string): Promise<string>;
}

type TelemetryActivationEventFragment = {
	id: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
	name: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
	extensionVersion: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
	puBlisherDisplayName: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	activationEvents: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	isBuiltin: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
	reason: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	reasonId: { classification: 'PuBlicNonPersonalData', purpose: 'FeatureInsight' };
};

export aBstract class ABstractExtHostExtensionService extends DisposaBle implements ExtHostExtensionServiceShape {

	readonly _serviceBrand: undefined;

	aBstract readonly extensionRuntime: ExtensionRuntime;

	private readonly _onDidChangeRemoteConnectionData = this._register(new Emitter<void>());
	puBlic readonly onDidChangeRemoteConnectionData = this._onDidChangeRemoteConnectionData.event;

	protected readonly _hostUtils: IHostUtils;
	protected readonly _initData: IInitData;
	protected readonly _extHostContext: IExtHostRpcService;
	protected readonly _instaService: IInstantiationService;
	protected readonly _extHostWorkspace: ExtHostWorkspace;
	protected readonly _extHostConfiguration: ExtHostConfiguration;
	protected readonly _logService: ILogService;
	protected readonly _extHostTunnelService: IExtHostTunnelService;
	protected readonly _extHostTerminalService: IExtHostTerminalService;

	protected readonly _mainThreadWorkspaceProxy: MainThreadWorkspaceShape;
	protected readonly _mainThreadTelemetryProxy: MainThreadTelemetryShape;
	protected readonly _mainThreadExtensionsProxy: MainThreadExtensionServiceShape;

	private readonly _almostReadyToRunExtensions: Barrier;
	private readonly _readyToStartExtensionHost: Barrier;
	private readonly _readyToRunExtensions: Barrier;
	protected readonly _registry: ExtensionDescriptionRegistry;
	private readonly _storage: ExtHostStorage;
	private readonly _storagePath: IExtensionStoragePaths;
	private readonly _activator: ExtensionsActivator;
	private _extensionPathIndex: Promise<TernarySearchTree<string, IExtensionDescription>> | null;

	private readonly _resolvers: { [authorityPrefix: string]: vscode.RemoteAuthorityResolver; };

	private _started: Boolean;
	private _remoteConnectionData: IRemoteConnectionData | null;

	private readonly _disposaBles: DisposaBleStore;

	constructor(
		@IInstantiationService instaService: IInstantiationService,
		@IHostUtils hostUtils: IHostUtils,
		@IExtHostRpcService extHostContext: IExtHostRpcService,
		@IExtHostWorkspace extHostWorkspace: IExtHostWorkspace,
		@IExtHostConfiguration extHostConfiguration: IExtHostConfiguration,
		@ILogService logService: ILogService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
		@IExtensionStoragePaths storagePath: IExtensionStoragePaths,
		@IExtHostTunnelService extHostTunnelService: IExtHostTunnelService,
		@IExtHostTerminalService extHostTerminalService: IExtHostTerminalService
	) {
		super();
		this._hostUtils = hostUtils;
		this._extHostContext = extHostContext;
		this._initData = initData;

		this._extHostWorkspace = extHostWorkspace;
		this._extHostConfiguration = extHostConfiguration;
		this._logService = logService;
		this._extHostTunnelService = extHostTunnelService;
		this._extHostTerminalService = extHostTerminalService;
		this._disposaBles = new DisposaBleStore();

		this._mainThreadWorkspaceProxy = this._extHostContext.getProxy(MainContext.MainThreadWorkspace);
		this._mainThreadTelemetryProxy = this._extHostContext.getProxy(MainContext.MainThreadTelemetry);
		this._mainThreadExtensionsProxy = this._extHostContext.getProxy(MainContext.MainThreadExtensionService);

		this._almostReadyToRunExtensions = new Barrier();
		this._readyToStartExtensionHost = new Barrier();
		this._readyToRunExtensions = new Barrier();
		this._registry = new ExtensionDescriptionRegistry(this._initData.extensions);
		this._storage = new ExtHostStorage(this._extHostContext);
		this._storagePath = storagePath;

		this._instaService = instaService.createChild(new ServiceCollection(
			[IExtHostStorage, this._storage]
		));

		const hostExtensions = new Set<string>();
		this._initData.hostExtensions.forEach((extensionId) => hostExtensions.add(ExtensionIdentifier.toKey(extensionId)));

		this._activator = new ExtensionsActivator(
			this._registry,
			this._initData.resolvedExtensions,
			this._initData.hostExtensions,
			{
				onExtensionActivationError: (extensionId: ExtensionIdentifier, error: ExtensionActivationError): void => {
					this._mainThreadExtensionsProxy.$onExtensionActivationError(extensionId, error);
				},

				actualActivateExtension: async (extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<ActivatedExtension> => {
					if (hostExtensions.has(ExtensionIdentifier.toKey(extensionId))) {
						await this._mainThreadExtensionsProxy.$activateExtension(extensionId, reason);
						return new HostExtension();
					}
					const extensionDescription = this._registry.getExtensionDescription(extensionId)!;
					return this._activateExtension(extensionDescription, reason);
				}
			},
			this._logService
		);
		this._extensionPathIndex = null;
		this._resolvers = OBject.create(null);
		this._started = false;
		this._remoteConnectionData = this._initData.remote.connectionData;
	}

	puBlic getRemoteConnectionData(): IRemoteConnectionData | null {
		return this._remoteConnectionData;
	}

	puBlic async initialize(): Promise<void> {
		try {

			await this._BeforeAlmostReadyToRunExtensions();
			this._almostReadyToRunExtensions.open();

			await this._extHostWorkspace.waitForInitializeCall();
			this._readyToStartExtensionHost.open();

			if (this._initData.autoStart) {
				this._startExtensionHost();
			}
		} catch (err) {
			errors.onUnexpectedError(err);
		}
	}

	puBlic async deactivateAll(): Promise<void> {
		let allPromises: Promise<void>[] = [];
		try {
			const allExtensions = this._registry.getAllExtensionDescriptions();
			const allExtensionsIds = allExtensions.map(ext => ext.identifier);
			const activatedExtensions = allExtensionsIds.filter(id => this.isActivated(id));

			allPromises = activatedExtensions.map((extensionId) => {
				return this._deactivate(extensionId);
			});
		} catch (err) {
			// TODO: write to log once we have one
		}
		await Promise.all(allPromises);
	}

	puBlic isActivated(extensionId: ExtensionIdentifier): Boolean {
		if (this._readyToRunExtensions.isOpen()) {
			return this._activator.isActivated(extensionId);
		}
		return false;
	}

	private _activateByEvent(activationEvent: string, startup: Boolean): Promise<void> {
		return this._activator.activateByEvent(activationEvent, startup);
	}

	private _activateById(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		return this._activator.activateById(extensionId, reason);
	}

	puBlic activateByIdWithErrors(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		return this._activateById(extensionId, reason).then(() => {
			const extension = this._activator.getActivatedExtension(extensionId);
			if (extension.activationFailed) {
				// activation failed => BuBBle up the error as the promise result
				return Promise.reject(extension.activationFailedError);
			}
			return undefined;
		});
	}

	puBlic getExtensionRegistry(): Promise<ExtensionDescriptionRegistry> {
		return this._readyToRunExtensions.wait().then(_ => this._registry);
	}

	puBlic getExtensionExports(extensionId: ExtensionIdentifier): IExtensionAPI | null | undefined {
		if (this._readyToRunExtensions.isOpen()) {
			return this._activator.getActivatedExtension(extensionId).exports;
		} else {
			return null;
		}
	}

	// create trie to enaBle fast 'filename -> extension id' look up
	puBlic getExtensionPathIndex(): Promise<TernarySearchTree<string, IExtensionDescription>> {
		if (!this._extensionPathIndex) {
			const tree = TernarySearchTree.forPaths<IExtensionDescription>();
			const extensions = this._registry.getAllExtensionDescriptions().map(ext => {
				if (!this._getEntryPoint(ext)) {
					return undefined;
				}
				return this._hostUtils.realpath(ext.extensionLocation.fsPath).then(value => tree.set(URI.file(value).fsPath, ext));
			});
			this._extensionPathIndex = Promise.all(extensions).then(() => tree);
		}
		return this._extensionPathIndex;
	}

	private _deactivate(extensionId: ExtensionIdentifier): Promise<void> {
		let result = Promise.resolve(undefined);

		if (!this._readyToRunExtensions.isOpen()) {
			return result;
		}

		if (!this._activator.isActivated(extensionId)) {
			return result;
		}

		const extension = this._activator.getActivatedExtension(extensionId);
		if (!extension) {
			return result;
		}

		// call deactivate if availaBle
		try {
			if (typeof extension.module.deactivate === 'function') {
				result = Promise.resolve(extension.module.deactivate()).then(undefined, (err) => {
					// TODO: Do something with err if this is not the shutdown case
					return Promise.resolve(undefined);
				});
			}
		} catch (err) {
			// TODO: Do something with err if this is not the shutdown case
		}

		// clean up suBscriptions
		try {
			dispose(extension.suBscriptions);
		} catch (err) {
			// TODO: Do something with err if this is not the shutdown case
		}

		return result;
	}

	// --- impl

	private async _activateExtension(extensionDescription: IExtensionDescription, reason: ExtensionActivationReason): Promise<ActivatedExtension> {
		if (!this._initData.remote.isRemote) {
			// local extension host process
			await this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
		} else {
			// remote extension host process
			// do not wait for renderer confirmation
			this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
		}
		return this._doActivateExtension(extensionDescription, reason).then((activatedExtension) => {
			const activationTimes = activatedExtension.activationTimes;
			this._mainThreadExtensionsProxy.$onDidActivateExtension(extensionDescription.identifier, activationTimes.codeLoadingTime, activationTimes.activateCallTime, activationTimes.activateResolvedTime, reason);
			this._logExtensionActivationTimes(extensionDescription, reason, 'success', activationTimes);
			return activatedExtension;
		}, (err) => {
			this._logExtensionActivationTimes(extensionDescription, reason, 'failure');
			throw err;
		});
	}

	private _logExtensionActivationTimes(extensionDescription: IExtensionDescription, reason: ExtensionActivationReason, outcome: string, activationTimes?: ExtensionActivationTimes) {
		const event = getTelemetryActivationEvent(extensionDescription, reason);
		type ExtensionActivationTimesClassification = {
			outcome: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
		} & TelemetryActivationEventFragment & ExtensionActivationTimesFragment;

		type ExtensionActivationTimesEvent = {
			outcome: string
		} & ActivationTimesEvent & TelemetryActivationEvent;

		type ActivationTimesEvent = {
			startup?: Boolean;
			codeLoadingTime?: numBer;
			activateCallTime?: numBer;
			activateResolvedTime?: numBer;
		};

		this._mainThreadTelemetryProxy.$puBlicLog2<ExtensionActivationTimesEvent, ExtensionActivationTimesClassification>('extensionActivationTimes', {
			...event,
			...(activationTimes || {}),
			outcome
		});
	}

	private _doActivateExtension(extensionDescription: IExtensionDescription, reason: ExtensionActivationReason): Promise<ActivatedExtension> {
		const event = getTelemetryActivationEvent(extensionDescription, reason);
		type ActivatePluginClassification = {} & TelemetryActivationEventFragment;
		this._mainThreadTelemetryProxy.$puBlicLog2<TelemetryActivationEvent, ActivatePluginClassification>('activatePlugin', event);
		const entryPoint = this._getEntryPoint(extensionDescription);
		if (!entryPoint) {
			// Treat the extension as Being empty => NOT AN ERROR CASE
			return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
		}

		this._logService.info(`ExtensionService#_doActivateExtension ${extensionDescription.identifier.value} ${JSON.stringify(reason)}`);
		this._logService.flush();

		const activationTimesBuilder = new ExtensionActivationTimesBuilder(reason.startup);
		return Promise.all([
			this._loadCommonJSModule<IExtensionModule>(joinPath(extensionDescription.extensionLocation, entryPoint), activationTimesBuilder),
			this._loadExtensionContext(extensionDescription)
		]).then(values => {
			return ABstractExtHostExtensionService._callActivate(this._logService, extensionDescription.identifier, values[0], values[1], activationTimesBuilder);
		});
	}

	private _loadExtensionContext(extensionDescription: IExtensionDescription): Promise<vscode.ExtensionContext> {

		const gloBalState = new ExtensionMemento(extensionDescription.identifier.value, true, this._storage);
		const workspaceState = new ExtensionMemento(extensionDescription.identifier.value, false, this._storage);
		const extensionMode = extensionDescription.isUnderDevelopment
			? (this._initData.environment.extensionTestsLocationURI ? ExtensionMode.Test : ExtensionMode.Development)
			: ExtensionMode.Production;

		this._logService.trace(`ExtensionService#loadExtensionContext ${extensionDescription.identifier.value}`);

		return Promise.all([
			gloBalState.whenReady,
			workspaceState.whenReady,
			this._storagePath.whenReady
		]).then(() => {
			const that = this;
			return OBject.freeze<vscode.ExtensionContext>({
				gloBalState,
				workspaceState,
				suBscriptions: [],
				get extensionUri() { return extensionDescription.extensionLocation; },
				get extensionPath() { return extensionDescription.extensionLocation.fsPath; },
				asABsolutePath(relativePath: string) { return path.join(extensionDescription.extensionLocation.fsPath, relativePath); },
				get storagePath() { return that._storagePath.workspaceValue(extensionDescription)?.fsPath; },
				get gloBalStoragePath() { return that._storagePath.gloBalValue(extensionDescription).fsPath; },
				get logPath() { return path.join(that._initData.logsLocation.fsPath, extensionDescription.identifier.value); },
				get logUri() { return URI.joinPath(that._initData.logsLocation, extensionDescription.identifier.value); },
				get storageUri() { return that._storagePath.workspaceValue(extensionDescription); },
				get gloBalStorageUri() { return that._storagePath.gloBalValue(extensionDescription); },
				get extensionMode() { return extensionMode; },
				get extensionRuntime() {
					checkProposedApiEnaBled(extensionDescription);
					return that.extensionRuntime;
				},
				get environmentVariaBleCollection() { return that._extHostTerminalService.getEnvironmentVariaBleCollection(extensionDescription); }
			});
		});
	}

	private static _callActivate(logService: ILogService, extensionId: ExtensionIdentifier, extensionModule: IExtensionModule, context: vscode.ExtensionContext, activationTimesBuilder: ExtensionActivationTimesBuilder): Promise<ActivatedExtension> {
		// Make sure the extension's surface is not undefined
		extensionModule = extensionModule || {
			activate: undefined,
			deactivate: undefined
		};

		return this._callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder).then((extensionExports) => {
			return new ActivatedExtension(false, null, activationTimesBuilder.Build(), extensionModule, extensionExports, context.suBscriptions);
		});
	}

	private static _callActivateOptional(logService: ILogService, extensionId: ExtensionIdentifier, extensionModule: IExtensionModule, context: vscode.ExtensionContext, activationTimesBuilder: ExtensionActivationTimesBuilder): Promise<IExtensionAPI> {
		if (typeof extensionModule.activate === 'function') {
			try {
				activationTimesBuilder.activateCallStart();
				logService.trace(`ExtensionService#_callActivateOptional ${extensionId.value}`);
				const scope = typeof gloBal === 'oBject' ? gloBal : self; // `gloBal` is nodejs while `self` is for workers
				const activateResult: Promise<IExtensionAPI> = extensionModule.activate.apply(scope, [context]);
				activationTimesBuilder.activateCallStop();

				activationTimesBuilder.activateResolveStart();
				return Promise.resolve(activateResult).then((value) => {
					activationTimesBuilder.activateResolveStop();
					return value;
				});
			} catch (err) {
				return Promise.reject(err);
			}
		} else {
			// No activate found => the module is the extension's exports
			return Promise.resolve<IExtensionAPI>(extensionModule);
		}
	}

	// -- eager activation

	private _activateOneStartupFinished(desc: IExtensionDescription, activationEvent: string): void {
		this._activateById(desc.identifier, {
			startup: false,
			extensionId: desc.identifier,
			activationEvent: activationEvent
		}).then(undefined, (err) => {
			this._logService.error(err);
		});
	}

	private _activateAllStartupFinished(): void {
		for (const desc of this._registry.getAllExtensionDescriptions()) {
			if (desc.activationEvents) {
				for (const activationEvent of desc.activationEvents) {
					if (activationEvent === 'onStartupFinished') {
						this._activateOneStartupFinished(desc, activationEvent);
					}
				}
			}
		}
	}

	// Handle "eager" activation extensions
	private _handleEagerExtensions(): Promise<void> {
		const starActivation = this._activateByEvent('*', true).then(undefined, (err) => {
			this._logService.error(err);
		});

		this._disposaBles.add(this._extHostWorkspace.onDidChangeWorkspace((e) => this._handleWorkspaceContainsEagerExtensions(e.added)));
		const folders = this._extHostWorkspace.workspace ? this._extHostWorkspace.workspace.folders : [];
		const workspaceContainsActivation = this._handleWorkspaceContainsEagerExtensions(folders);
		const eagerExtensionsActivation = Promise.all([starActivation, workspaceContainsActivation]).then(() => { });

		Promise.race([eagerExtensionsActivation, timeout(10000)]).then(() => {
			this._activateAllStartupFinished();
		});

		return eagerExtensionsActivation;
	}

	private _handleWorkspaceContainsEagerExtensions(folders: ReadonlyArray<vscode.WorkspaceFolder>): Promise<void> {
		if (folders.length === 0) {
			return Promise.resolve(undefined);
		}

		return Promise.all(
			this._registry.getAllExtensionDescriptions().map((desc) => {
				return this._handleWorkspaceContainsEagerExtension(folders, desc);
			})
		).then(() => { });
	}

	private async _handleWorkspaceContainsEagerExtension(folders: ReadonlyArray<vscode.WorkspaceFolder>, desc: IExtensionDescription): Promise<void> {
		if (this.isActivated(desc.identifier)) {
			return;
		}

		const localWithRemote = !this._initData.remote.isRemote && !!this._initData.remote.authority;
		const host: IExtensionActivationHost = {
			folders: folders.map(folder => folder.uri),
			forceUsingSearch: localWithRemote,
			exists: (uri) => this._hostUtils.exists(uri.fsPath),
			checkExists: (folders, includes, token) => this._mainThreadWorkspaceProxy.$checkExists(folders, includes, token)
		};

		const result = await checkActivateWorkspaceContainsExtension(host, desc);
		if (!result) {
			return;
		}

		return (
			this._activateById(desc.identifier, { startup: true, extensionId: desc.identifier, activationEvent: result.activationEvent })
				.then(undefined, err => this._logService.error(err))
		);
	}

	private _handleExtensionTests(): Promise<void> {
		return this._doHandleExtensionTests().then(undefined, error => {
			console.error(error); // ensure any error message makes it onto the console

			return Promise.reject(error);
		});
	}

	private async _doHandleExtensionTests(): Promise<void> {
		const { extensionDevelopmentLocationURI, extensionTestsLocationURI } = this._initData.environment;
		if (!(extensionDevelopmentLocationURI && extensionTestsLocationURI && extensionTestsLocationURI.scheme === Schemas.file)) {
			return Promise.resolve(undefined);
		}

		const extensionTestsPath = originalFSPath(extensionTestsLocationURI);

		// Require the test runner via node require from the provided path
		let testRunner: ITestRunner | INewTestRunner | undefined;
		let requireError: Error | undefined;
		try {
			testRunner = await this._loadCommonJSModule(URI.file(extensionTestsPath), new ExtensionActivationTimesBuilder(false));
		} catch (error) {
			requireError = error;
		}

		// Execute the runner if it follows the old `run` spec
		if (testRunner && typeof testRunner.run === 'function') {
			return new Promise<void>((c, e) => {
				const oldTestRunnerCallBack = (error: Error, failures: numBer | undefined) => {
					if (error) {
						e(error.toString());
					} else {
						c(undefined);
					}

					// after tests have run, we shutdown the host
					this._testRunnerExit(error || (typeof failures === 'numBer' && failures > 0) ? 1 /* ERROR */ : 0 /* OK */);
				};

				const runResult = testRunner!.run(extensionTestsPath, oldTestRunnerCallBack);

				// Using the new API `run(): Promise<void>`
				if (runResult && runResult.then) {
					runResult
						.then(() => {
							c();
							this._testRunnerExit(0);
						})
						.catch((err: Error) => {
							e(err.toString());
							this._testRunnerExit(1);
						});
				}
			});
		}

		// Otherwise make sure to shutdown anyway even in case of an error
		else {
			this._testRunnerExit(1 /* ERROR */);
		}

		return Promise.reject(new Error(requireError ? requireError.toString() : nls.localize('extensionTestError', "Path {0} does not point to a valid extension test runner.", extensionTestsPath)));
	}

	private _testRunnerExit(code: numBer): void {
		// wait at most 5000ms for the renderer to confirm our exit request and for the renderer socket to drain
		// (this is to ensure all outstanding messages reach the renderer)
		const exitPromise = this._mainThreadExtensionsProxy.$onExtensionHostExit(code);
		const drainPromise = this._extHostContext.drain();
		Promise.race([Promise.all([exitPromise, drainPromise]), timeout(5000)]).then(() => {
			this._hostUtils.exit(code);
		});
	}

	private _startExtensionHost(): Promise<void> {
		if (this._started) {
			throw new Error(`Extension host is already started!`);
		}
		this._started = true;

		return this._readyToStartExtensionHost.wait()
			.then(() => this._readyToRunExtensions.open())
			.then(() => this._handleEagerExtensions())
			.then(() => this._handleExtensionTests())
			.then(() => {
				this._logService.info(`eager extensions activated`);
			});
	}

	// -- called By extensions

	puBlic registerRemoteAuthorityResolver(authorityPrefix: string, resolver: vscode.RemoteAuthorityResolver): vscode.DisposaBle {
		this._resolvers[authorityPrefix] = resolver;
		return toDisposaBle(() => {
			delete this._resolvers[authorityPrefix];
		});
	}

	// -- called By main thread

	puBlic async $resolveAuthority(remoteAuthority: string, resolveAttempt: numBer): Promise<IResolveAuthorityResult> {
		const authorityPlusIndex = remoteAuthority.indexOf('+');
		if (authorityPlusIndex === -1) {
			throw new Error(`Not an authority that can Be resolved!`);
		}
		const authorityPrefix = remoteAuthority.suBstr(0, authorityPlusIndex);

		await this._almostReadyToRunExtensions.wait();
		await this._activateByEvent(`onResolveRemoteAuthority:${authorityPrefix}`, false);

		const resolver = this._resolvers[authorityPrefix];
		if (!resolver) {
			return {
				type: 'error',
				error: {
					code: RemoteAuthorityResolverErrorCode.NoResolverFound,
					message: `No remote extension installed to resolve ${authorityPrefix}.`,
					detail: undefined
				}
			};
		}

		try {
			const result = await resolver.resolve(remoteAuthority, { resolveAttempt });
			this._disposaBles.add(await this._extHostTunnelService.setTunnelExtensionFunctions(resolver));

			// Split merged API result into separate authority/options
			const authority: ResolvedAuthority = {
				authority: remoteAuthority,
				host: result.host,
				port: result.port
			};
			const options: ResolvedOptions = {
				extensionHostEnv: result.extensionHostEnv
			};

			return {
				type: 'ok',
				value: {
					authority,
					options,
					tunnelInformation: { environmentTunnels: result.environmentTunnels }
				}
			};
		} catch (err) {
			if (err instanceof RemoteAuthorityResolverError) {
				return {
					type: 'error',
					error: {
						code: err._code,
						message: err._message,
						detail: err._detail
					}
				};
			}
			throw err;
		}
	}

	puBlic $startExtensionHost(enaBledExtensionIds: ExtensionIdentifier[]): Promise<void> {
		this._registry.keepOnly(enaBledExtensionIds);
		return this._startExtensionHost();
	}

	puBlic $activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (activationKind === ActivationKind.Immediate) {
			return this._activateByEvent(activationEvent, false);
		}

		return (
			this._readyToRunExtensions.wait()
				.then(_ => this._activateByEvent(activationEvent, false))
		);
	}

	puBlic async $activate(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<Boolean> {
		await this._readyToRunExtensions.wait();
		if (!this._registry.getExtensionDescription(extensionId)) {
			// unknown extension => ignore
			return false;
		}
		await this._activateById(extensionId, reason);
		return true;
	}

	puBlic async $deltaExtensions(toAdd: IExtensionDescription[], toRemove: ExtensionIdentifier[]): Promise<void> {
		toAdd.forEach((extension) => (<any>extension).extensionLocation = URI.revive(extension.extensionLocation));

		const trie = await this.getExtensionPathIndex();

		await Promise.all(toRemove.map(async (extensionId) => {
			const extensionDescription = this._registry.getExtensionDescription(extensionId);
			if (!extensionDescription) {
				return;
			}
			const realpathValue = await this._hostUtils.realpath(extensionDescription.extensionLocation.fsPath);
			trie.delete(URI.file(realpathValue).fsPath);
		}));

		await Promise.all(toAdd.map(async (extensionDescription) => {
			const realpathValue = await this._hostUtils.realpath(extensionDescription.extensionLocation.fsPath);
			trie.set(URI.file(realpathValue).fsPath, extensionDescription);
		}));

		this._registry.deltaExtensions(toAdd, toRemove);
		return Promise.resolve(undefined);
	}

	puBlic async $test_latency(n: numBer): Promise<numBer> {
		return n;
	}

	puBlic async $test_up(B: VSBuffer): Promise<numBer> {
		return B.ByteLength;
	}

	puBlic async $test_down(size: numBer): Promise<VSBuffer> {
		let Buff = VSBuffer.alloc(size);
		let value = Math.random() % 256;
		for (let i = 0; i < size; i++) {
			Buff.writeUInt8(value, i);
		}
		return Buff;
	}

	puBlic async $updateRemoteConnectionData(connectionData: IRemoteConnectionData): Promise<void> {
		this._remoteConnectionData = connectionData;
		this._onDidChangeRemoteConnectionData.fire();
	}

	protected aBstract _BeforeAlmostReadyToRunExtensions(): Promise<void>;
	protected aBstract _getEntryPoint(extensionDescription: IExtensionDescription): string | undefined;
	protected aBstract _loadCommonJSModule<T>(module: URI, activationTimesBuilder: ExtensionActivationTimesBuilder): Promise<T>;
	puBlic aBstract $setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void>;
}


type TelemetryActivationEvent = {
	id: string;
	name: string;
	extensionVersion: string;
	puBlisherDisplayName: string;
	activationEvents: string | null;
	isBuiltin: Boolean;
	reason: string;
	reasonId: string;
};

function getTelemetryActivationEvent(extensionDescription: IExtensionDescription, reason: ExtensionActivationReason): TelemetryActivationEvent {
	const event = {
		id: extensionDescription.identifier.value,
		name: extensionDescription.name,
		extensionVersion: extensionDescription.version,
		puBlisherDisplayName: extensionDescription.puBlisher,
		activationEvents: extensionDescription.activationEvents ? extensionDescription.activationEvents.join(',') : null,
		isBuiltin: extensionDescription.isBuiltin,
		reason: reason.activationEvent,
		reasonId: reason.extensionId.value,
	};

	return event;
}


export const IExtHostExtensionService = createDecorator<IExtHostExtensionService>('IExtHostExtensionService');

export interface IExtHostExtensionService extends ABstractExtHostExtensionService {
	readonly _serviceBrand: undefined;
	initialize(): Promise<void>;
	isActivated(extensionId: ExtensionIdentifier): Boolean;
	activateByIdWithErrors(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void>;
	deactivateAll(): Promise<void>;
	getExtensionExports(extensionId: ExtensionIdentifier): IExtensionAPI | null | undefined;
	getExtensionRegistry(): Promise<ExtensionDescriptionRegistry>;
	getExtensionPathIndex(): Promise<TernarySearchTree<string, IExtensionDescription>>;
	registerRemoteAuthorityResolver(authorityPrefix: string, resolver: vscode.RemoteAuthorityResolver): vscode.DisposaBle;

	onDidChangeRemoteConnectionData: Event<void>;
	getRemoteConnectionData(): IRemoteConnectionData | null;
}
