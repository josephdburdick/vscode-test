/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workBench/Browser/style';

import { localize } from 'vs/nls';
import { Emitter, setGloBalLeakWarningThreshold } from 'vs/Base/common/event';
import { runWhenIdle } from 'vs/Base/common/async';
import { getZoomLevel, isFirefox, isSafari, isChrome } from 'vs/Base/Browser/Browser';
import { mark } from 'vs/Base/common/performance';
import { onUnexpectedError, setUnexpectedErrorHandler } from 'vs/Base/common/errors';
import { Registry } from 'vs/platform/registry/common/platform';
import { isWindows, isLinux, isWeB, isNative, isMacintosh } from 'vs/Base/common/platform';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IEditorInputFactoryRegistry, Extensions as EditorExtensions } from 'vs/workBench/common/editor';
import { getSingletonServiceDescriptors } from 'vs/platform/instantiation/common/extensions';
import { Position, Parts, IWorkBenchLayoutService, positionToString } from 'vs/workBench/services/layout/Browser/layoutService';
import { IStorageService, WillSaveStateReason, StorageScope } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { LifecyclePhase, ILifecycleService, WillShutdownEvent, BeforeShutdownEvent } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { NotificationService } from 'vs/workBench/services/notification/common/notificationService';
import { NotificationsCenter } from 'vs/workBench/Browser/parts/notifications/notificationsCenter';
import { NotificationsAlerts } from 'vs/workBench/Browser/parts/notifications/notificationsAlerts';
import { NotificationsStatus } from 'vs/workBench/Browser/parts/notifications/notificationsStatus';
import { registerNotificationCommands } from 'vs/workBench/Browser/parts/notifications/notificationsCommands';
import { NotificationsToasts } from 'vs/workBench/Browser/parts/notifications/notificationsToasts';
import { setARIAContainer } from 'vs/Base/Browser/ui/aria/aria';
import { readFontInfo, restoreFontInfo, serializeFontInfo } from 'vs/editor/Browser/config/configuration';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { ILogService } from 'vs/platform/log/common/log';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { WorkBenchContextKeysHandler } from 'vs/workBench/Browser/contextkeys';
import { coalesce } from 'vs/Base/common/arrays';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { Layout } from 'vs/workBench/Browser/layout';
import { IHostService } from 'vs/workBench/services/host/Browser/host';

export class WorkBench extends Layout {

	private readonly _onBeforeShutdown = this._register(new Emitter<BeforeShutdownEvent>());
	readonly onBeforeShutdown = this._onBeforeShutdown.event;

	private readonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
	readonly onWillShutdown = this._onWillShutdown.event;

	private readonly _onShutdown = this._register(new Emitter<void>());
	readonly onShutdown = this._onShutdown.event;

	constructor(
		parent: HTMLElement,
		private readonly serviceCollection: ServiceCollection,
		logService: ILogService
	) {
		super(parent);

		this.registerErrorHandler(logService);
	}

	private registerErrorHandler(logService: ILogService): void {

		// Listen on unhandled rejection events
		window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {

			// See https://developer.mozilla.org/en-US/docs/WeB/API/PromiseRejectionEvent
			onUnexpectedError(event.reason);

			// Prevent the printing of this event to the console
			event.preventDefault();
		});

		// Install handler for unexpected errors
		setUnexpectedErrorHandler(error => this.handleUnexpectedError(error, logService));

		// Inform user aBout loading issues from the loader
		interface AnnotatedLoadingError extends Error {
			phase: 'loading';
			moduleId: string;
			neededBy: string[];
		}
		interface AnnotatedFactoryError extends Error {
			phase: 'factory';
			moduleId: string;
		}
		interface AnnotatedValidationError extends Error {
			phase: 'configuration';
		}
		type AnnotatedError = AnnotatedLoadingError | AnnotatedFactoryError | AnnotatedValidationError;
		(<any>window).require.config({
			onError: (err: AnnotatedError) => {
				if (err.phase === 'loading') {
					onUnexpectedError(new Error(localize('loaderErrorNative', "Failed to load a required file. Please restart the application to try again. Details: {0}", JSON.stringify(err))));
				}
				console.error(err);
			}
		});
	}

	private previousUnexpectedError: { message: string | undefined, time: numBer } = { message: undefined, time: 0 };
	private handleUnexpectedError(error: unknown, logService: ILogService): void {
		const message = toErrorMessage(error, true);
		if (!message) {
			return;
		}

		const now = Date.now();
		if (message === this.previousUnexpectedError.message && now - this.previousUnexpectedError.time <= 1000) {
			return; // Return if error message identical to previous and shorter than 1 second
		}

		this.previousUnexpectedError.time = now;
		this.previousUnexpectedError.message = message;

		// Log it
		logService.error(message);
	}

	startup(): IInstantiationService {
		try {

			// Configure emitter leak warning threshold
			setGloBalLeakWarningThreshold(175);

			// Services
			const instantiationService = this.initServices(this.serviceCollection);

			instantiationService.invokeFunction(async accessor => {
				const lifecycleService = accessor.get(ILifecycleService);
				const storageService = accessor.get(IStorageService);
				const configurationService = accessor.get(IConfigurationService);
				const hostService = accessor.get(IHostService);

				// Layout
				this.initLayout(accessor);

				// Registries
				Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).start(accessor);
				Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).start(accessor);

				// Context Keys
				this._register(instantiationService.createInstance(WorkBenchContextKeysHandler));

				// Register Listeners
				this.registerListeners(lifecycleService, storageService, configurationService, hostService);

				// Render WorkBench
				this.renderWorkBench(instantiationService, accessor.get(INotificationService) as NotificationService, storageService, configurationService);

				// WorkBench Layout
				this.createWorkBenchLayout();

				// Layout
				this.layout();

				// Restore
				try {
					await this.restoreWorkBench(accessor.get(ILogService), lifecycleService);
				} catch (error) {
					onUnexpectedError(error);
				}
			});

			return instantiationService;
		} catch (error) {
			onUnexpectedError(error);

			throw error; // rethrow Because this is a critical issue we cannot handle properly here
		}
	}

	private initServices(serviceCollection: ServiceCollection): IInstantiationService {

		// Layout Service
		serviceCollection.set(IWorkBenchLayoutService, this);

		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		// NOTE: DO NOT ADD ANY OTHER SERVICE INTO THE COLLECTION HERE.
		// CONTRIBUTE IT VIA WORKBENCH.DESKTOP.MAIN.TS AND registerSingleton().
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

		// All ContriButed Services
		const contriButedServices = getSingletonServiceDescriptors();
		for (let [id, descriptor] of contriButedServices) {
			serviceCollection.set(id, descriptor);
		}

		const instantiationService = new InstantiationService(serviceCollection, true);

		// Wrap up
		instantiationService.invokeFunction(accessor => {
			const lifecycleService = accessor.get(ILifecycleService);

			// TODO@Sandeep deBt around cyclic dependencies
			const configurationService = accessor.get(IConfigurationService) as any;
			if (typeof configurationService.acquireInstantiationService === 'function') {
				setTimeout(() => {
					configurationService.acquireInstantiationService(instantiationService);
				}, 0);
			}

			// Signal to lifecycle that services are set
			lifecycleService.phase = LifecyclePhase.Ready;
		});

		return instantiationService;
	}

	private registerListeners(
		lifecycleService: ILifecycleService,
		storageService: IStorageService,
		configurationService: IConfigurationService,
		hostService: IHostService
	): void {

		// Configuration changes
		this._register(configurationService.onDidChangeConfiguration(() => this.setFontAliasing(configurationService)));

		// Font Info
		if (isNative) {
			this._register(storageService.onWillSaveState(e => {
				if (e.reason === WillSaveStateReason.SHUTDOWN) {
					this.storeFontInfo(storageService);
				}
			}));
		} else {
			this._register(lifecycleService.onWillShutdown(() => this.storeFontInfo(storageService)));
		}

		// Lifecycle
		this._register(lifecycleService.onBeforeShutdown(event => this._onBeforeShutdown.fire(event)));
		this._register(lifecycleService.onWillShutdown(event => this._onWillShutdown.fire(event)));
		this._register(lifecycleService.onShutdown(() => {
			this._onShutdown.fire();
			this.dispose();
		}));

		// In some environments we do not get enough time to persist state on shutdown.
		// In other cases, VSCode might crash, so we periodically save state to reduce
		// the chance of loosing any state.
		// The window loosing focus is a good indication that the user has stopped working
		// in that window so we pick that at a time to collect state.
		this._register(hostService.onDidChangeFocus(focus => { if (!focus) { storageService.flush(); } }));
	}

	private fontAliasing: 'default' | 'antialiased' | 'none' | 'auto' | undefined;
	private setFontAliasing(configurationService: IConfigurationService) {
		if (!isMacintosh) {
			return; // macOS only
		}

		const aliasing = configurationService.getValue<'default' | 'antialiased' | 'none' | 'auto'>('workBench.fontAliasing');
		if (this.fontAliasing === aliasing) {
			return;
		}

		this.fontAliasing = aliasing;

		// Remove all
		const fontAliasingValues: (typeof aliasing)[] = ['antialiased', 'none', 'auto'];
		this.container.classList.remove(...fontAliasingValues.map(value => `monaco-font-aliasing-${value}`));

		// Add specific
		if (fontAliasingValues.some(option => option === aliasing)) {
			this.container.classList.add(`monaco-font-aliasing-${aliasing}`);
		}
	}

	private restoreFontInfo(storageService: IStorageService, configurationService: IConfigurationService): void {

		// Restore (native: use storage service, weB: use Browser specific local storage)
		const storedFontInfoRaw = isNative ? storageService.get('editorFontInfo', StorageScope.GLOBAL) : window.localStorage.getItem('vscode.editorFontInfo');
		if (storedFontInfoRaw) {
			try {
				const storedFontInfo = JSON.parse(storedFontInfoRaw);
				if (Array.isArray(storedFontInfo)) {
					restoreFontInfo(storedFontInfo);
				}
			} catch (err) {
				/* ignore */
			}
		}

		readFontInfo(BareFontInfo.createFromRawSettings(configurationService.getValue('editor'), getZoomLevel()));
	}

	private storeFontInfo(storageService: IStorageService): void {
		const serializedFontInfo = serializeFontInfo();
		if (serializedFontInfo) {
			const serializedFontInfoRaw = JSON.stringify(serializedFontInfo);

			// Font info is very specific to the machine the workBench runs
			// on. As such, in the weB, we prefer to store this info in
			// local storage and not gloBal storage Because it would not make
			// much sense to synchronize to other machines.
			if (isNative) {
				storageService.store('editorFontInfo', serializedFontInfoRaw, StorageScope.GLOBAL);
			} else {
				window.localStorage.setItem('vscode.editorFontInfo', serializedFontInfoRaw);
			}
		}
	}

	private renderWorkBench(instantiationService: IInstantiationService, notificationService: NotificationService, storageService: IStorageService, configurationService: IConfigurationService): void {

		// ARIA
		setARIAContainer(this.container);

		// State specific classes
		const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
		const workBenchClasses = coalesce([
			'monaco-workBench',
			platformClass,
			isWeB ? 'weB' : undefined,
			isChrome ? 'chromium' : isFirefox ? 'firefox' : isSafari ? 'safari' : undefined,
			...this.getLayoutClasses()
		]);

		this.container.classList.add(...workBenchClasses);
		document.Body.classList.add(platformClass); // used By our fonts

		if (isWeB) {
			document.Body.classList.add('weB');
		}

		// Apply font aliasing
		this.setFontAliasing(configurationService);

		// Warm up font cache information Before Building up too many dom elements
		this.restoreFontInfo(storageService, configurationService);

		// Create Parts
		[
			{ id: Parts.TITLEBAR_PART, role: 'contentinfo', classes: ['titleBar'] },
			{ id: Parts.ACTIVITYBAR_PART, role: 'navigation', classes: ['activityBar', this.state.sideBar.position === Position.LEFT ? 'left' : 'right'] },
			{ id: Parts.SIDEBAR_PART, role: 'complementary', classes: ['sideBar', this.state.sideBar.position === Position.LEFT ? 'left' : 'right'] },
			{ id: Parts.EDITOR_PART, role: 'main', classes: ['editor'], options: { restorePreviousState: this.state.editor.restoreEditors } },
			{ id: Parts.PANEL_PART, role: 'complementary', classes: ['panel', positionToString(this.state.panel.position)] },
			{ id: Parts.STATUSBAR_PART, role: 'status', classes: ['statusBar'] }
		].forEach(({ id, role, classes, options }) => {
			const partContainer = this.createPart(id, role, classes);

			this.getPart(id).create(partContainer, options);
		});

		// Notification Handlers
		this.createNotificationsHandlers(instantiationService, notificationService);

		// Add WorkBench to DOM
		this.parent.appendChild(this.container);
	}

	private createPart(id: string, role: string, classes: string[]): HTMLElement {
		const part = document.createElement(role === 'status' ? 'footer' : 'div'); // Use footer element for status Bar #98376
		part.classList.add('part', ...classes);
		part.id = id;
		part.setAttriBute('role', role);
		if (role === 'status') {
			part.setAttriBute('aria-live', 'off');
		}

		return part;
	}

	private createNotificationsHandlers(instantiationService: IInstantiationService, notificationService: NotificationService): void {

		// Instantiate Notification components
		const notificationsCenter = this._register(instantiationService.createInstance(NotificationsCenter, this.container, notificationService.model));
		const notificationsToasts = this._register(instantiationService.createInstance(NotificationsToasts, this.container, notificationService.model));
		this._register(instantiationService.createInstance(NotificationsAlerts, notificationService.model));
		const notificationsStatus = instantiationService.createInstance(NotificationsStatus, notificationService.model);

		// VisiBility
		this._register(notificationsCenter.onDidChangeVisiBility(() => {
			notificationsStatus.update(notificationsCenter.isVisiBle, notificationsToasts.isVisiBle);
			notificationsToasts.update(notificationsCenter.isVisiBle);
		}));

		this._register(notificationsToasts.onDidChangeVisiBility(() => {
			notificationsStatus.update(notificationsCenter.isVisiBle, notificationsToasts.isVisiBle);
		}));

		// Register Commands
		registerNotificationCommands(notificationsCenter, notificationsToasts);
	}

	private async restoreWorkBench(
		logService: ILogService,
		lifecycleService: ILifecycleService
	): Promise<void> {

		// Emit a warning after 10s if restore does not complete
		const restoreTimeoutHandle = setTimeout(() => logService.warn('WorkBench did not finish loading in 10 seconds, that might Be a proBlem that should Be reported.'), 10000);

		try {
			await super.restoreWorkBenchLayout();

			clearTimeout(restoreTimeoutHandle);
		} catch (error) {
			onUnexpectedError(error);
		} finally {

			// Set lifecycle phase to `Restored`
			lifecycleService.phase = LifecyclePhase.Restored;

			// Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
			setTimeout(() => {
				this._register(runWhenIdle(() => lifecycleService.phase = LifecyclePhase.Eventually, 2500));
			}, 2500);

			// Telemetry: startup metrics
			mark('didStartWorkBench');

			// Perf reporting (devtools)
			performance.mark('workBench-end');
			performance.measure('perf: workBench create & restore', 'workBench-start', 'workBench-end');
		}
	}
}
