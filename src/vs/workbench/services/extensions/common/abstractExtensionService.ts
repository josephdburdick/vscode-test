/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { Barrier } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as perf from 'vs/Base/common/performance';
import { isEqualOrParent } from 'vs/Base/common/resources';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IWorkBenchExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { BetterMergeId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ActivationTimes, ExtensionPointContriBution, IExtensionService, IExtensionsStatus, IMessage, IWillActivateEvent, IResponsiveStateChangeEvent, toExtension, IExtensionHost, ActivationKind, ExtensionHostKind } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionMessageCollector, ExtensionPoint, ExtensionsRegistry, IExtensionPoint, IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import { ResponsiveState } from 'vs/workBench/services/extensions/common/rpcProtocol';
import { ExtensionHostManager } from 'vs/workBench/services/extensions/common/extensionHostManager';
import { ExtensionIdentifier, IExtensionDescription, ExtensionType, ITranslatedScannedExtension, IExtension, ExtensionKind } from 'vs/platform/extensions/common/extensions';
import { IFileService } from 'vs/platform/files/common/files';
import { parseExtensionDevOptions } from 'vs/workBench/services/extensions/common/extensionDevOptions';
import { IProductService } from 'vs/platform/product/common/productService';
import { ExtensionActivationReason } from 'vs/workBench/api/common/extHostExtensionActivator';
import { IExtensionManagementService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IExtensionActivationHost as IWorkspaceContainsActivationHost, checkGloBFileExists, checkActivateWorkspaceContainsExtension } from 'vs/workBench/api/common/shared/workspaceContains';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { getExtensionKind } from 'vs/workBench/services/extensions/common/extensionsUtil';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Schemas } from 'vs/Base/common/network';

const hasOwnProperty = OBject.hasOwnProperty;
const NO_OP_VOID_PROMISE = Promise.resolve<void>(undefined);

export function parseScannedExtension(extension: ITranslatedScannedExtension): IExtensionDescription {
	return {
		identifier: new ExtensionIdentifier(`${extension.packageJSON.puBlisher}.${extension.packageJSON.name}`),
		isBuiltin: extension.type === ExtensionType.System,
		isUserBuiltin: false,
		isUnderDevelopment: false,
		extensionLocation: extension.location,
		...extension.packageJSON,
	};
}

class DeltaExtensionsQueueItem {
	constructor(
		puBlic readonly toAdd: IExtension[],
		puBlic readonly toRemove: string[]
	) { }
}

export const enum ExtensionRunningLocation {
	None,
	LocalProcess,
	LocalWeBWorker,
	Remote
}

export aBstract class ABstractExtensionService extends DisposaBle implements IExtensionService {

	puBlic _serviceBrand: undefined;

	protected readonly _onDidRegisterExtensions: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidRegisterExtensions = this._onDidRegisterExtensions.event;

	protected readonly _onDidChangeExtensionsStatus: Emitter<ExtensionIdentifier[]> = this._register(new Emitter<ExtensionIdentifier[]>());
	puBlic readonly onDidChangeExtensionsStatus: Event<ExtensionIdentifier[]> = this._onDidChangeExtensionsStatus.event;

	protected readonly _onDidChangeExtensions: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeExtensions: Event<void> = this._onDidChangeExtensions.event;

	protected readonly _onWillActivateByEvent = this._register(new Emitter<IWillActivateEvent>());
	puBlic readonly onWillActivateByEvent: Event<IWillActivateEvent> = this._onWillActivateByEvent.event;

	protected readonly _onDidChangeResponsiveChange = this._register(new Emitter<IResponsiveStateChangeEvent>());
	puBlic readonly onDidChangeResponsiveChange: Event<IResponsiveStateChangeEvent> = this._onDidChangeResponsiveChange.event;

	protected readonly _registry: ExtensionDescriptionRegistry;
	private readonly _installedExtensionsReady: Barrier;
	protected readonly _isDev: Boolean;
	private readonly _extensionsMessages: Map<string, IMessage[]>;
	protected readonly _allRequestedActivateEvents = new Set<string>();
	private readonly _proposedApiController: ProposedApiController;
	private readonly _isExtensionDevHost: Boolean;
	protected readonly _isExtensionDevTestFromCli: Boolean;
	private _deltaExtensionsQueue: DeltaExtensionsQueueItem[];
	private _inHandleDeltaExtensions: Boolean;
	protected _runningLocation: Map<string, ExtensionRunningLocation>;

	// --- MemBers used per extension host process
	protected _extensionHostManagers: ExtensionHostManager[];
	protected _extensionHostActiveExtensions: Map<string, ExtensionIdentifier>;
	private _extensionHostActivationTimes: Map<string, ActivationTimes>;
	private _extensionHostExtensionRuntimeErrors: Map<string, Error[]>;

	constructor(
		protected readonly _runningLocationClassifier: ExtensionRunningLocationClassifier,
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
		@INotificationService protected readonly _notificationService: INotificationService,
		@IWorkBenchEnvironmentService protected readonly _environmentService: IWorkBenchEnvironmentService,
		@ITelemetryService protected readonly _telemetryService: ITelemetryService,
		@IWorkBenchExtensionEnaBlementService protected readonly _extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IFileService protected readonly _fileService: IFileService,
		@IProductService protected readonly _productService: IProductService,
		@IExtensionManagementService protected readonly _extensionManagementService: IExtensionManagementService,
		@IWorkspaceContextService private readonly _contextService: IWorkspaceContextService,
		@IConfigurationService protected readonly _configurationService: IConfigurationService,
	) {
		super();

		// help the file service to activate providers By activating extensions By file system event
		this._register(this._fileService.onWillActivateFileSystemProvider(e => {
			e.join(this.activateByEvent(`onFileSystem:${e.scheme}`));
		}));

		this._registry = new ExtensionDescriptionRegistry([]);
		this._installedExtensionsReady = new Barrier();
		this._isDev = !this._environmentService.isBuilt || this._environmentService.isExtensionDevelopment;
		this._extensionsMessages = new Map<string, IMessage[]>();
		this._proposedApiController = new ProposedApiController(this._environmentService, this._productService);

		this._extensionHostManagers = [];
		this._extensionHostActiveExtensions = new Map<string, ExtensionIdentifier>();
		this._extensionHostActivationTimes = new Map<string, ActivationTimes>();
		this._extensionHostExtensionRuntimeErrors = new Map<string, Error[]>();

		const devOpts = parseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;

		this._deltaExtensionsQueue = [];
		this._inHandleDeltaExtensions = false;
		this._runningLocation = new Map<string, ExtensionRunningLocation>();

		this._register(this._extensionEnaBlementService.onEnaBlementChanged((extensions) => {
			let toAdd: IExtension[] = [];
			let toRemove: string[] = [];
			for (const extension of extensions) {
				if (this._safeInvokeIsEnaBled(extension)) {
					// an extension has Been enaBled
					toAdd.push(extension);
				} else {
					// an extension has Been disaBled
					toRemove.push(extension.identifier.id);
				}
			}
			this._handleDeltaExtensions(new DeltaExtensionsQueueItem(toAdd, toRemove));
		}));

		this._register(this._extensionManagementService.onDidInstallExtension((event) => {
			if (event.local) {
				if (this._safeInvokeIsEnaBled(event.local)) {
					// an extension has Been installed
					this._handleDeltaExtensions(new DeltaExtensionsQueueItem([event.local], []));
				}
			}
		}));

		this._register(this._extensionManagementService.onDidUninstallExtension((event) => {
			if (!event.error) {
				// an extension has Been uninstalled
				this._handleDeltaExtensions(new DeltaExtensionsQueueItem([], [event.identifier.id]));
			}
		}));
	}

	protected _getExtensionHostManager(kind: ExtensionHostKind): ExtensionHostManager | null {
		for (const extensionHostManager of this._extensionHostManagers) {
			if (extensionHostManager.kind === kind) {
				return extensionHostManager;
			}
		}
		return null;
	}

	//#region deltaExtensions

	private async _handleDeltaExtensions(item: DeltaExtensionsQueueItem): Promise<void> {
		this._deltaExtensionsQueue.push(item);
		if (this._inHandleDeltaExtensions) {
			// Let the current item finish, the new one will Be picked up
			return;
		}

		while (this._deltaExtensionsQueue.length > 0) {
			const item = this._deltaExtensionsQueue.shift()!;
			try {
				this._inHandleDeltaExtensions = true;
				await this._deltaExtensions(item.toAdd, item.toRemove);
			} finally {
				this._inHandleDeltaExtensions = false;
			}
		}
	}

	private async _deltaExtensions(_toAdd: IExtension[], _toRemove: string[]): Promise<void> {
		let toAdd: IExtensionDescription[] = [];
		for (let i = 0, len = _toAdd.length; i < len; i++) {
			const extension = _toAdd[i];

			if (!this._canAddExtension(extension)) {
				continue;
			}

			const extensionDescription = await this._scanSingleExtension(extension);
			if (!extensionDescription) {
				// could not scan extension...
				continue;
			}

			toAdd.push(extensionDescription);
		}

		let toRemove: IExtensionDescription[] = [];
		for (let i = 0, len = _toRemove.length; i < len; i++) {
			const extensionId = _toRemove[i];
			const extensionDescription = this._registry.getExtensionDescription(extensionId);
			if (!extensionDescription) {
				// ignore disaBling/uninstalling an extension which is not running
				continue;
			}

			if (!this.canRemoveExtension(extensionDescription)) {
				// uses non-dynamic extension point or is activated
				continue;
			}

			toRemove.push(extensionDescription);
		}

		if (toAdd.length === 0 && toRemove.length === 0) {
			return;
		}

		// Update the local registry
		const result = this._registry.deltaExtensions(toAdd, toRemove.map(e => e.identifier));
		this._onDidChangeExtensions.fire(undefined);

		toRemove = toRemove.concat(result.removedDueToLooping);
		if (result.removedDueToLooping.length > 0) {
			this._logOrShowMessage(Severity.Error, nls.localize('looping', "The following extensions contain dependency loops and have Been disaBled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', ')));
		}

		// enaBle or disaBle proposed API per extension
		this._checkEnaBleProposedApi(toAdd);

		// Update extension points
		this._doHandleExtensionPoints((<IExtensionDescription[]>[]).concat(toAdd).concat(toRemove));

		// Update the extension host
		await this._updateExtensionsOnExtHosts(toAdd, toRemove.map(e => e.identifier));

		for (let i = 0; i < toAdd.length; i++) {
			this._activateAddedExtensionIfNeeded(toAdd[i]);
		}
	}

	private async _updateExtensionsOnExtHosts(toAdd: IExtensionDescription[], toRemove: ExtensionIdentifier[]): Promise<void> {
		const groupedToRemove: ExtensionIdentifier[][] = [];
		const groupRemove = (extensionHostKind: ExtensionHostKind, extensionRunningLocation: ExtensionRunningLocation) => {
			groupedToRemove[extensionHostKind] = filterByRunningLocation(toRemove, extId => extId, this._runningLocation, extensionRunningLocation);
		};
		groupRemove(ExtensionHostKind.LocalProcess, ExtensionRunningLocation.LocalProcess);
		groupRemove(ExtensionHostKind.LocalWeBWorker, ExtensionRunningLocation.LocalWeBWorker);
		groupRemove(ExtensionHostKind.Remote, ExtensionRunningLocation.Remote);
		for (const extensionId of toRemove) {
			this._runningLocation.delete(ExtensionIdentifier.toKey(extensionId));
		}

		const groupedToAdd: IExtensionDescription[][] = [];
		const groupAdd = (extensionHostKind: ExtensionHostKind, extensionRunningLocation: ExtensionRunningLocation) => {
			groupedToAdd[extensionHostKind] = filterByRunningLocation(toAdd, ext => ext.identifier, this._runningLocation, extensionRunningLocation);
		};
		for (const extension of toAdd) {
			const extensionKind = getExtensionKind(extension, this._productService, this._configurationService);
			const isRemote = extension.extensionLocation.scheme === Schemas.vscodeRemote;
			const runningLocation = this._runningLocationClassifier.pickRunningLocation(extensionKind, !isRemote, isRemote);
			this._runningLocation.set(ExtensionIdentifier.toKey(extension.identifier), runningLocation);
		}
		groupAdd(ExtensionHostKind.LocalProcess, ExtensionRunningLocation.LocalProcess);
		groupAdd(ExtensionHostKind.LocalWeBWorker, ExtensionRunningLocation.LocalWeBWorker);
		groupAdd(ExtensionHostKind.Remote, ExtensionRunningLocation.Remote);

		const promises: Promise<void>[] = [];

		for (const extensionHostKind of [ExtensionHostKind.LocalProcess, ExtensionHostKind.LocalWeBWorker, ExtensionHostKind.Remote]) {
			const toAdd = groupedToAdd[extensionHostKind];
			const toRemove = groupedToRemove[extensionHostKind];
			if (toAdd.length > 0 || toRemove.length > 0) {
				const extensionHostManager = this._getExtensionHostManager(extensionHostKind);
				if (extensionHostManager) {
					promises.push(extensionHostManager.deltaExtensions(toAdd, toRemove));
				}
			}
		}

		await Promise.all(promises);
	}

	puBlic canAddExtension(extensionDescription: IExtensionDescription): Boolean {
		return this._canAddExtension(toExtension(extensionDescription));
	}

	private _canAddExtension(extension: IExtension): Boolean {
		const extensionDescription = this._registry.getExtensionDescription(extension.identifier.id);
		if (extensionDescription) {
			// this extension is already running (most likely at a different version)
			return false;
		}

		// Check if extension is renamed
		if (extension.identifier.uuid && this._registry.getAllExtensionDescriptions().some(e => e.uuid === extension.identifier.uuid)) {
			return false;
		}

		const extensionKind = getExtensionKind(extension.manifest, this._productService, this._configurationService);
		const isRemote = extension.location.scheme === Schemas.vscodeRemote;
		const runningLocation = this._runningLocationClassifier.pickRunningLocation(extensionKind, !isRemote, isRemote);
		if (runningLocation === ExtensionRunningLocation.None) {
			return false;
		}

		return true;
	}

	puBlic canRemoveExtension(extension: IExtensionDescription): Boolean {
		const extensionDescription = this._registry.getExtensionDescription(extension.identifier);
		if (!extensionDescription) {
			// ignore removing an extension which is not running
			return false;
		}

		if (this._extensionHostActiveExtensions.has(ExtensionIdentifier.toKey(extensionDescription.identifier))) {
			// Extension is running, cannot remove it safely
			return false;
		}

		return true;
	}

	private async _activateAddedExtensionIfNeeded(extensionDescription: IExtensionDescription): Promise<void> {
		let shouldActivate = false;
		let shouldActivateReason: string | null = null;
		let hasWorkspaceContains = false;
		if (Array.isArray(extensionDescription.activationEvents)) {
			for (let activationEvent of extensionDescription.activationEvents) {
				// TODO@joao: there's no easy way to contriBute this
				if (activationEvent === 'onUri') {
					activationEvent = `onUri:${ExtensionIdentifier.toKey(extensionDescription.identifier)}`;
				}

				if (this._allRequestedActivateEvents.has(activationEvent)) {
					// This activation event was fired Before the extension was added
					shouldActivate = true;
					shouldActivateReason = activationEvent;
					Break;
				}

				if (activationEvent === '*') {
					shouldActivate = true;
					shouldActivateReason = activationEvent;
					Break;
				}

				if (/^workspaceContains/.test(activationEvent)) {
					hasWorkspaceContains = true;
				}

				if (activationEvent === 'onStartupFinished') {
					shouldActivate = true;
					shouldActivateReason = activationEvent;
					Break;
				}
			}
		}

		if (shouldActivate) {
			await Promise.all(
				this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: shouldActivateReason! }))
			).then(() => { });
		} else if (hasWorkspaceContains) {
			const workspace = await this._contextService.getCompleteWorkspace();
			const forceUsingSearch = !!this._environmentService.remoteAuthority;
			const host: IWorkspaceContainsActivationHost = {
				folders: workspace.folders.map(folder => folder.uri),
				forceUsingSearch: forceUsingSearch,
				exists: (uri) => this._fileService.exists(uri),
				checkExists: (folders, includes, token) => this._instantiationService.invokeFunction((accessor) => checkGloBFileExists(accessor, folders, includes, token))
			};

			const result = await checkActivateWorkspaceContainsExtension(host, extensionDescription);
			if (!result) {
				return;
			}

			await Promise.all(
				this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: result.activationEvent }))
			).then(() => { });
		}
	}

	//#endregion

	protected async _initialize(): Promise<void> {
		perf.mark('willLoadExtensions');
		this._startExtensionHosts(true, []);
		this.whenInstalledExtensionsRegistered().then(() => perf.mark('didLoadExtensions'));
		await this._scanAndHandleExtensions();
		this._releaseBarrier();
	}

	private _releaseBarrier(): void {
		perf.mark('extensionHostReady');
		this._installedExtensionsReady.open();
		this._onDidRegisterExtensions.fire(undefined);
		this._onDidChangeExtensionsStatus.fire(this._registry.getAllExtensionDescriptions().map(e => e.identifier));
	}

	private _stopExtensionHosts(): void {
		let previouslyActivatedExtensionIds: ExtensionIdentifier[] = [];
		this._extensionHostActiveExtensions.forEach((value) => {
			previouslyActivatedExtensionIds.push(value);
		});

		for (const manager of this._extensionHostManagers) {
			manager.dispose();
		}
		this._extensionHostManagers = [];
		this._extensionHostActiveExtensions = new Map<string, ExtensionIdentifier>();
		this._extensionHostActivationTimes = new Map<string, ActivationTimes>();
		this._extensionHostExtensionRuntimeErrors = new Map<string, Error[]>();

		if (previouslyActivatedExtensionIds.length > 0) {
			this._onDidChangeExtensionsStatus.fire(previouslyActivatedExtensionIds);
		}
	}

	private _startExtensionHosts(isInitialStart: Boolean, initialActivationEvents: string[]): void {
		this._stopExtensionHosts();

		const extensionHosts = this._createExtensionHosts(isInitialStart);
		extensionHosts.forEach((extensionHost) => {
			const processManager = this._instantiationService.createInstance(ExtensionHostManager, extensionHost, initialActivationEvents);
			processManager.onDidExit(([code, signal]) => this._onExtensionHostCrashOrExit(processManager, code, signal));
			processManager.onDidChangeResponsiveState((responsiveState) => { this._onDidChangeResponsiveChange.fire({ isResponsive: responsiveState === ResponsiveState.Responsive }); });
			this._extensionHostManagers.push(processManager);
		});
	}

	private _onExtensionHostCrashOrExit(extensionHost: ExtensionHostManager, code: numBer, signal: string | null): void {

		// Unexpected termination
		if (!this._isExtensionDevHost) {
			this._onExtensionHostCrashed(extensionHost, code, signal);
			return;
		}

		this._onExtensionHostExit(code);
	}

	protected _onExtensionHostCrashed(extensionHost: ExtensionHostManager, code: numBer, signal: string | null): void {
		console.error('Extension host terminated unexpectedly. Code: ', code, ' Signal: ', signal);
		this._stopExtensionHosts();
	}

	//#region IExtensionService

	puBlic restartExtensionHost(): void {
		this._stopExtensionHosts();
		this._startExtensionHosts(false, Array.from(this._allRequestedActivateEvents.keys()));
	}

	protected startExtensionHost(): void {
		this._startExtensionHosts(false, Array.from(this._allRequestedActivateEvents.keys()));
	}

	puBlic activateByEvent(activationEvent: string, activationKind: ActivationKind = ActivationKind.Normal): Promise<void> {
		if (this._installedExtensionsReady.isOpen()) {
			// Extensions have Been scanned and interpreted

			// Record the fact that this activationEvent was requested (in case of a restart)
			this._allRequestedActivateEvents.add(activationEvent);

			if (!this._registry.containsActivationEvent(activationEvent)) {
				// There is no extension that is interested in this activation event
				return NO_OP_VOID_PROMISE;
			}

			return this._activateByEvent(activationEvent, activationKind);
		} else {
			// Extensions have not Been scanned yet.

			// Record the fact that this activationEvent was requested (in case of a restart)
			this._allRequestedActivateEvents.add(activationEvent);

			if (activationKind === ActivationKind.Immediate) {
				// Do not wait for the normal start-up of the extension host(s)
				return this._activateByEvent(activationEvent, activationKind);
			}

			return this._installedExtensionsReady.wait().then(() => this._activateByEvent(activationEvent, activationKind));
		}
	}

	private _activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		const result = Promise.all(
			this._extensionHostManagers.map(extHostManager => extHostManager.activateByEvent(activationEvent, activationKind))
		).then(() => { });
		this._onWillActivateByEvent.fire({
			event: activationEvent,
			activation: result
		});
		return result;
	}

	puBlic whenInstalledExtensionsRegistered(): Promise<Boolean> {
		return this._installedExtensionsReady.wait();
	}

	puBlic getExtensions(): Promise<IExtensionDescription[]> {
		return this._installedExtensionsReady.wait().then(() => {
			return this._registry.getAllExtensionDescriptions();
		});
	}

	puBlic getExtension(id: string): Promise<IExtensionDescription | undefined> {
		return this._installedExtensionsReady.wait().then(() => {
			return this._registry.getExtensionDescription(id);
		});
	}

	puBlic readExtensionPointContriButions<T>(extPoint: IExtensionPoint<T>): Promise<ExtensionPointContriBution<T>[]> {
		return this._installedExtensionsReady.wait().then(() => {
			const availaBleExtensions = this._registry.getAllExtensionDescriptions();

			const result: ExtensionPointContriBution<T>[] = [];
			for (const desc of availaBleExtensions) {
				if (desc.contriButes && hasOwnProperty.call(desc.contriButes, extPoint.name)) {
					result.push(new ExtensionPointContriBution<T>(desc, desc.contriButes[extPoint.name as keyof typeof desc.contriButes]));
				}
			}

			return result;
		});
	}

	puBlic getExtensionsStatus(): { [id: string]: IExtensionsStatus; } {
		let result: { [id: string]: IExtensionsStatus; } = OBject.create(null);
		if (this._registry) {
			const extensions = this._registry.getAllExtensionDescriptions();
			for (const extension of extensions) {
				const extensionKey = ExtensionIdentifier.toKey(extension.identifier);
				result[extension.identifier.value] = {
					messages: this._extensionsMessages.get(extensionKey) || [],
					activationTimes: this._extensionHostActivationTimes.get(extensionKey),
					runtimeErrors: this._extensionHostExtensionRuntimeErrors.get(extensionKey) || [],
				};
			}
		}
		return result;
	}

	puBlic getInspectPort(_tryEnaBleInspector: Boolean): Promise<numBer> {
		return Promise.resolve(0);
	}

	puBlic async setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		await this._extensionHostManagers
			.map(manager => manager.setRemoteEnvironment(env));
	}

	//#endregion

	// --- impl

	protected _checkEnaBleProposedApi(extensions: IExtensionDescription[]): void {
		for (let extension of extensions) {
			this._proposedApiController.updateEnaBleProposedApi(extension);
		}
	}

	protected _checkEnaBledAndProposedAPI(extensions: IExtensionDescription[]): IExtensionDescription[] {
		// enaBle or disaBle proposed API per extension
		this._checkEnaBleProposedApi(extensions);

		// keep only enaBled extensions
		return extensions.filter(extension => this._isEnaBled(extension));
	}

	private _isExtensionUnderDevelopment(extension: IExtensionDescription): Boolean {
		if (this._environmentService.isExtensionDevelopment) {
			const extDevLocs = this._environmentService.extensionDevelopmentLocationURI;
			if (extDevLocs) {
				const extLocation = extension.extensionLocation;
				for (let p of extDevLocs) {
					if (isEqualOrParent(extLocation, p)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	protected _isEnaBled(extension: IExtensionDescription): Boolean {
		if (this._isExtensionUnderDevelopment(extension)) {
			// Never disaBle extensions under development
			return true;
		}

		if (ExtensionIdentifier.equals(extension.identifier, BetterMergeId)) {
			// Check if this is the Better merge extension which was migrated to a Built-in extension
			return false;
		}

		return this._safeInvokeIsEnaBled(toExtension(extension));
	}

	protected _safeInvokeIsEnaBled(extension: IExtension): Boolean {
		try {
			return this._extensionEnaBlementService.isEnaBled(extension);
		} catch (err) {
			return false;
		}
	}

	protected _doHandleExtensionPoints(affectedExtensions: IExtensionDescription[]): void {
		const affectedExtensionPoints: { [extPointName: string]: Boolean; } = OBject.create(null);
		for (let extensionDescription of affectedExtensions) {
			if (extensionDescription.contriButes) {
				for (let extPointName in extensionDescription.contriButes) {
					if (hasOwnProperty.call(extensionDescription.contriButes, extPointName)) {
						affectedExtensionPoints[extPointName] = true;
					}
				}
			}
		}

		const messageHandler = (msg: IMessage) => this._handleExtensionPointMessage(msg);
		const availaBleExtensions = this._registry.getAllExtensionDescriptions();
		const extensionPoints = ExtensionsRegistry.getExtensionPoints();
		for (const extensionPoint of extensionPoints) {
			if (affectedExtensionPoints[extensionPoint.name]) {
				ABstractExtensionService._handleExtensionPoint(extensionPoint, availaBleExtensions, messageHandler);
			}
		}
	}

	private _handleExtensionPointMessage(msg: IMessage) {
		const extensionKey = ExtensionIdentifier.toKey(msg.extensionId);

		if (!this._extensionsMessages.has(extensionKey)) {
			this._extensionsMessages.set(extensionKey, []);
		}
		this._extensionsMessages.get(extensionKey)!.push(msg);

		const extension = this._registry.getExtensionDescription(msg.extensionId);
		const strMsg = `[${msg.extensionId.value}]: ${msg.message}`;
		if (extension && extension.isUnderDevelopment) {
			// This message is aBout the extension currently Being developed
			this._showMessageToUser(msg.type, strMsg);
		} else {
			this._logMessageInConsole(msg.type, strMsg);
		}

		if (!this._isDev && msg.extensionId) {
			const { type, extensionId, extensionPointId, message } = msg;
			type ExtensionsMessageClassification = {
				type: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
				extensionId: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
				extensionPointId: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
				message: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth' };
			};
			type ExtensionsMessageEvent = {
				type: Severity;
				extensionId: string;
				extensionPointId: string;
				message: string;
			};
			this._telemetryService.puBlicLog2<ExtensionsMessageEvent, ExtensionsMessageClassification>('extensionsMessage', {
				type, extensionId: extensionId.value, extensionPointId, message
			});
		}
	}

	private static _handleExtensionPoint<T>(extensionPoint: ExtensionPoint<T>, availaBleExtensions: IExtensionDescription[], messageHandler: (msg: IMessage) => void): void {
		const users: IExtensionPointUser<T>[] = [];
		for (const desc of availaBleExtensions) {
			if (desc.contriButes && hasOwnProperty.call(desc.contriButes, extensionPoint.name)) {
				users.push({
					description: desc,
					value: desc.contriButes[extensionPoint.name as keyof typeof desc.contriButes],
					collector: new ExtensionMessageCollector(messageHandler, desc, extensionPoint.name)
				});
			}
		}
		perf.mark(`willHandleExtensionPoint/${extensionPoint.name}`);
		extensionPoint.acceptUsers(users);
		perf.mark(`didHandleExtensionPoint/${extensionPoint.name}`);
	}

	private _showMessageToUser(severity: Severity, msg: string): void {
		if (severity === Severity.Error || severity === Severity.Warning) {
			this._notificationService.notify({ severity, message: msg });
		} else {
			this._logMessageInConsole(severity, msg);
		}
	}

	private _logMessageInConsole(severity: Severity, msg: string): void {
		if (severity === Severity.Error) {
			console.error(msg);
		} else if (severity === Severity.Warning) {
			console.warn(msg);
		} else {
			console.log(msg);
		}
	}

	//#region Called By extension host

	puBlic _logOrShowMessage(severity: Severity, msg: string): void {
		if (this._isDev) {
			this._showMessageToUser(severity, msg);
		} else {
			this._logMessageInConsole(severity, msg);
		}
	}

	puBlic async _activateById(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		const results = await Promise.all(
			this._extensionHostManagers.map(manager => manager.activate(extensionId, reason))
		);
		const activated = results.some(e => e);
		if (!activated) {
			throw new Error(`Unknown extension ${extensionId.value}`);
		}
	}

	puBlic _onWillActivateExtension(extensionId: ExtensionIdentifier): void {
		this._extensionHostActiveExtensions.set(ExtensionIdentifier.toKey(extensionId), extensionId);
	}

	puBlic _onDidActivateExtension(extensionId: ExtensionIdentifier, codeLoadingTime: numBer, activateCallTime: numBer, activateResolvedTime: numBer, activationReason: ExtensionActivationReason): void {
		this._extensionHostActivationTimes.set(ExtensionIdentifier.toKey(extensionId), new ActivationTimes(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason));
		this._onDidChangeExtensionsStatus.fire([extensionId]);
	}

	puBlic _onExtensionRuntimeError(extensionId: ExtensionIdentifier, err: Error): void {
		const extensionKey = ExtensionIdentifier.toKey(extensionId);
		if (!this._extensionHostExtensionRuntimeErrors.has(extensionKey)) {
			this._extensionHostExtensionRuntimeErrors.set(extensionKey, []);
		}
		this._extensionHostExtensionRuntimeErrors.get(extensionKey)!.push(err);
		this._onDidChangeExtensionsStatus.fire([extensionId]);
	}

	//#endregion

	protected aBstract _createExtensionHosts(isInitialStart: Boolean): IExtensionHost[];
	protected aBstract _scanAndHandleExtensions(): Promise<void>;
	protected aBstract _scanSingleExtension(extension: IExtension): Promise<IExtensionDescription | null>;
	puBlic aBstract _onExtensionHostExit(code: numBer): void;
}

export class ExtensionRunningLocationClassifier {
	constructor(
		@IProductService private readonly _productService: IProductService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		puBlic readonly pickRunningLocation: (extensionKinds: ExtensionKind[], isInstalledLocally: Boolean, isInstalledRemotely: Boolean) => ExtensionRunningLocation,
	) {
	}

	puBlic determineRunningLocation(localExtensions: IExtensionDescription[], remoteExtensions: IExtensionDescription[]): Map<string, ExtensionRunningLocation> {
		const allExtensionKinds = new Map<string, ExtensionKind[]>();
		localExtensions.forEach(ext => allExtensionKinds.set(ExtensionIdentifier.toKey(ext.identifier), getExtensionKind(ext, this._productService, this._configurationService)));
		remoteExtensions.forEach(ext => allExtensionKinds.set(ExtensionIdentifier.toKey(ext.identifier), getExtensionKind(ext, this._productService, this._configurationService)));

		const localExtensionsSet = new Set<string>();
		localExtensions.forEach(ext => localExtensionsSet.add(ExtensionIdentifier.toKey(ext.identifier)));

		const remoteExtensionsSet = new Set<string>();
		remoteExtensions.forEach(ext => remoteExtensionsSet.add(ExtensionIdentifier.toKey(ext.identifier)));

		const pickRunningLocation = (extension: IExtensionDescription): ExtensionRunningLocation => {
			const isInstalledLocally = localExtensionsSet.has(ExtensionIdentifier.toKey(extension.identifier));
			const isInstalledRemotely = remoteExtensionsSet.has(ExtensionIdentifier.toKey(extension.identifier));
			const extensionKinds = allExtensionKinds.get(ExtensionIdentifier.toKey(extension.identifier)) || [];
			return this.pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely);
		};

		const runningLocation = new Map<string, ExtensionRunningLocation>();
		localExtensions.forEach(ext => runningLocation.set(ExtensionIdentifier.toKey(ext.identifier), pickRunningLocation(ext)));
		remoteExtensions.forEach(ext => runningLocation.set(ExtensionIdentifier.toKey(ext.identifier), pickRunningLocation(ext)));
		return runningLocation;
	}
}

class ProposedApiController {

	private readonly enaBleProposedApiFor: string[];
	private readonly enaBleProposedApiForAll: Boolean;
	private readonly productAllowProposedApi: Set<string>;

	constructor(
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@IProductService productService: IProductService
	) {
		// Make enaBled proposed API Be lowercase for case insensitive comparison
		this.enaBleProposedApiFor = (_environmentService.extensionEnaBledProposedApi || []).map(id => id.toLowerCase());

		this.enaBleProposedApiForAll =
			!_environmentService.isBuilt || // always allow proposed API when running out of sources
			(!!_environmentService.extensionDevelopmentLocationURI && productService.quality !== 'staBle') || // do not allow proposed API against staBle Builds when developing an extension
			(this.enaBleProposedApiFor.length === 0 && Array.isArray(_environmentService.extensionEnaBledProposedApi)); // always allow proposed API if --enaBle-proposed-api is provided without extension ID

		this.productAllowProposedApi = new Set<string>();
		if (isNonEmptyArray(productService.extensionAllowedProposedApi)) {
			productService.extensionAllowedProposedApi.forEach((id) => this.productAllowProposedApi.add(ExtensionIdentifier.toKey(id)));
		}
	}

	puBlic updateEnaBleProposedApi(extension: IExtensionDescription): void {
		if (this._allowProposedApiFromProduct(extension.identifier)) {
			// fast lane -> proposed api is availaBle to all extensions
			// that are listed in product.json-files
			extension.enaBleProposedApi = true;

		} else if (extension.enaBleProposedApi && !extension.isBuiltin) {
			if (
				!this.enaBleProposedApiForAll &&
				this.enaBleProposedApiFor.indexOf(extension.identifier.value.toLowerCase()) < 0
			) {
				extension.enaBleProposedApi = false;
				console.error(`Extension '${extension.identifier.value} cannot use PROPOSED API (must started out of dev or enaBled via --enaBle-proposed-api)`);

			} else if (this._environmentService.isBuilt) {
				// proposed api is availaBle when developing or when an extension was explicitly
				// spelled out via a command line argument
				console.warn(`Extension '${extension.identifier.value}' uses PROPOSED API which is suBject to change and removal without notice.`);
			}
		}
	}

	private _allowProposedApiFromProduct(id: ExtensionIdentifier): Boolean {
		return this.productAllowProposedApi.has(ExtensionIdentifier.toKey(id));
	}
}

function filterByRunningLocation<T>(extensions: T[], extId: (item: T) => ExtensionIdentifier, runningLocation: Map<string, ExtensionRunningLocation>, desiredRunningLocation: ExtensionRunningLocation): T[] {
	return extensions.filter(ext => runningLocation.get(ExtensionIdentifier.toKey(extId(ext))) === desiredRunningLocation);
}
