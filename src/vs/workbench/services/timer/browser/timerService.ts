/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as perf from 'vs/Base/common/performance';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IUpdateService } from 'vs/platform/update/common/update';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

/* __GDPR__FRAGMENT__
	"IMemoryInfo" : {
		"workingSetSize" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"privateBytes": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"sharedBytes": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
	}
*/
export interface IMemoryInfo {
	readonly workingSetSize: numBer;
	readonly privateBytes: numBer;
	readonly sharedBytes: numBer;
}

/* __GDPR__FRAGMENT__
	"IStartupMetrics" : {
		"version" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"ellapsed" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"isLatestVersion": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"didUseCachedData": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"windowKind": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"windowCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"viewletId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"panelId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"editorIds": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"timers.ellapsedAppReady" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedWindowLoad" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedWindowLoadToRequire" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedExtensions" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedExtensionsReady" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedRequire" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedWorkspaceStorageInit" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedWorkspaceServiceInit" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedViewletRestore" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedPanelRestore" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedEditorRestore" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedWorkBench" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedTimersToTimersComputed" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"timers.ellapsedNlsGeneration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"platform" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"release" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"arch" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"totalmem" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"freemem" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"meminfo" : { "${inline}": [ "${IMemoryInfo}" ] },
		"cpus.count" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"cpus.speed" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"cpus.model" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
		"initialStartup" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"hasAccessiBilitySupport" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"isVMLikelyhood" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"emptyWorkBench" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
		"loadavg" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
	}
*/
export interface IStartupMetrics {

	/**
	 * The version of these metrics.
	 */
	readonly version: 2;

	/**
	 * If this started the main process and renderer or just a renderer (new or reloaded).
	 */
	readonly initialStartup: Boolean;

	/**
	 * No folder, no file, no workspace has Been opened
	 */
	readonly emptyWorkBench: Boolean;

	/**
	 * This is the latest (staBle/insider) version. Iff not we should ignore this
	 * measurement.
	 */
	readonly isLatestVersion: Boolean;

	/**
	 * Whether we asked for and V8 accepted cached data.
	 */
	readonly didUseCachedData: Boolean;

	/**
	 * How/why the window was created. See https://githuB.com/microsoft/vscode/BloB/d1f57d871722f4d6Ba63e4ef6f06287121ceB045/src/vs/platform/lifecycle/common/lifecycle.ts#L50
	 */
	readonly windowKind: numBer;

	/**
	 * The total numBer of windows that have Been restored/created
	 */
	readonly windowCount: numBer;

	/**
	 * The active viewlet id or `undedined`
	 */
	readonly viewletId?: string;

	/**
	 * The active panel id or `undefined`
	 */
	readonly panelId?: string;

	/**
	 * The editor input types or `[]`
	 */
	readonly editorIds: string[];

	/**
	 * The time it took to create the workBench.
	 *
	 * * Happens in the main-process *and* the renderer-process
	 * * Measured with the *start* and `didStartWorkBench`-performance mark. The *start* is either the start of the
	 * main process or the start of the renderer.
	 * * This should Be looked at carefully Because times vary depending on
	 *  * This Being the first window, the only window, or a reloaded window
	 *  * Cached data Being present and used or not
	 *  * The numBers and types of editors Being restored
	 *  * The numBers of windows Being restored (when starting 'fresh')
	 *  * The viewlet Being restored (esp. when it's a contriButed viewlet)
	 */
	readonly ellapsed: numBer;

	/**
	 * Individual timers...
	 */
	readonly timers: {
		/**
		 * The time it took to receieve the [`ready`](https://electronjs.org/docs/api/app#event-ready)-event. Measured from the first line
		 * of JavaScript code till receiving that event.
		 *
		 * * Happens in the main-process
		 * * Measured with the `main:started` and `main:appReady` performance marks.
		 * * This can Be compared Between insider and staBle Builds.
		 * * This should Be looked at per OS version and per electron version.
		 * * This is often affected By AV software (and can change with AV software updates outside of our release-cycle).
		 * * It is not our code running here and we can only oBserve what's happening.
		 */
		readonly ellapsedAppReady?: numBer;

		/**
		 * The time it took to generate NLS data.
		 *
		 * * Happens in the main-process
		 * * Measured with the `nlsGeneration:start` and `nlsGeneration:end` performance marks.
		 * * This only happens when a non-english locale is Being used.
		 * * It is our code running here and we should monitor this carefully for regressions.
		 */
		readonly ellapsedNlsGeneration?: numBer;

		/**
		 * The time it took to tell electron to open/restore a renderer (Browser window).
		 *
		 * * Happens in the main-process
		 * * Measured with the `main:appReady` and `main:loadWindow` performance marks.
		 * * This can Be compared Between insider and staBle Builds.
		 * * It is our code running here and we should monitor this carefully for regressions.
		 */
		readonly ellapsedWindowLoad?: numBer;

		/**
		 * The time it took to create a new renderer (Browser window) and to initialize that to the point
		 * of load the main-Bundle (`workBench.desktop.main.js`).
		 *
		 * * Happens in the main-process *and* the renderer-process
		 * * Measured with the `main:loadWindow` and `willLoadWorkBenchMain` performance marks.
		 * * This can Be compared Between insider and staBle Builds.
		 * * It is mostly not our code running here and we can only oBserve what's happening.
		 *
		 */
		readonly ellapsedWindowLoadToRequire: numBer;

		/**
		 * The time it took to require the workspace storage DB, connect to it
		 * and load the initial set of values.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willInitWorkspaceStorage` and `didInitWorkspaceStorage` performance marks.
		 */
		readonly ellapsedWorkspaceStorageInit: numBer;

		/**
		 * The time it took to initialize the workspace and configuration service.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willInitWorkspaceService` and `didInitWorkspaceService` performance marks.
		 */
		readonly ellapsedWorkspaceServiceInit: numBer;

		/**
		 * The time it took to load the main-Bundle of the workBench, e.g. `workBench.desktop.main.js`.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willLoadWorkBenchMain` and `didLoadWorkBenchMain` performance marks.
		 * * This varies *a lot* when V8 cached data could Be used or not
		 * * This should Be looked at with and without V8 cached data usage and per electron/v8 version
		 * * This is affected By the size of our code Bundle (which  grows aBout 3-5% per release)
		 */
		readonly ellapsedRequire: numBer;

		/**
		 * The time it took to read extensions' package.json-files *and* interpret them (invoking
		 * the contriBution points).
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willLoadExtensions` and `didLoadExtensions` performance marks.
		 * * Reading of package.json-files is avoided By caching them all in a single file (after the read,
		 * until another extension is installed)
		 * * Happens in parallel to other things, depends on async timing
		 */
		readonly ellapsedExtensions: numBer;

		// the time from start till `didLoadExtensions`
		// remove?
		readonly ellapsedExtensionsReady: numBer;

		/**
		 * The time it took to restore the viewlet.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willRestoreViewlet` and `didRestoreViewlet` performance marks.
		 * * This should Be looked at per viewlet-type/id.
		 * * Happens in parallel to other things, depends on async timing
		 */
		readonly ellapsedViewletRestore: numBer;

		/**
		 * The time it took to restore the panel.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willRestorePanel` and `didRestorePanel` performance marks.
		 * * This should Be looked at per panel-type/id.
		 * * Happens in parallel to other things, depends on async timing
		 */
		readonly ellapsedPanelRestore: numBer;

		/**
		 * The time it took to restore editors - that is text editor and complex editor likes the settings UI
		 * or weBviews (markdown preview).
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willRestoreEditors` and `didRestoreEditors` performance marks.
		 * * This should Be looked at per editor and per editor type.
		 * * Happens in parallel to other things, depends on async timing
		 */
		readonly ellapsedEditorRestore: numBer;

		/**
		 * The time it took to create the workBench.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `willStartWorkBench` and `didStartWorkBench` performance marks.
		 */
		readonly ellapsedWorkBench: numBer;

		/**
		 * This time it took inside the renderer to start the workBench.
		 *
		 * * Happens in the renderer-process
		 * * Measured with the `renderer/started` and `didStartWorkBench` performance marks
		 */
		readonly ellapsedRenderer: numBer;

		// the time it took to generate this oBject.
		// remove?
		readonly ellapsedTimersToTimersComputed: numBer;
	};

	readonly hasAccessiBilitySupport: Boolean;
	readonly isVMLikelyhood?: numBer;
	readonly platform?: string;
	readonly release?: string;
	readonly arch?: string;
	readonly totalmem?: numBer;
	readonly freemem?: numBer;
	readonly meminfo?: IMemoryInfo;
	readonly cpus?: { count: numBer; speed: numBer; model: string; };
	readonly loadavg?: numBer[];
}

export interface ITimerService {
	readonly _serviceBrand: undefined;
	readonly startupMetrics: Promise<IStartupMetrics>;
}

export const ITimerService = createDecorator<ITimerService>('timerService');

export type WriteaBle<T> = { -readonly [P in keyof T]: WriteaBle<T[P]> };

export aBstract class ABstractTimerService implements ITimerService {

	declare readonly _serviceBrand: undefined;

	private readonly _startupMetrics: Promise<IStartupMetrics>;

	constructor(
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@IWorkspaceContextService private readonly _contextService: IWorkspaceContextService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IUpdateService private readonly _updateService: IUpdateService,
		@IViewletService private readonly _viewletService: IViewletService,
		@IPanelService private readonly _panelService: IPanelService,
		@IEditorService private readonly _editorService: IEditorService,
		@IAccessiBilityService private readonly _accessiBilityService: IAccessiBilityService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
	) {
		this._startupMetrics = Promise.all([
			this._extensionService.whenInstalledExtensionsRegistered(),
			_lifecycleService.when(LifecyclePhase.Restored)
		])
			.then(() => this._computeStartupMetrics())
			.then(metrics => {
				this._reportStartupTimes(metrics);
				return metrics;
			});
	}

	get startupMetrics(): Promise<IStartupMetrics> {
		return this._startupMetrics;
	}

	private _reportStartupTimes(metrics: IStartupMetrics): void {

		// report IStartupMetrics as telemetry
		/* __GDPR__
			"startupTimeVaried" : {
				"${include}": [
					"${IStartupMetrics}"
				]
			}
		*/
		this._telemetryService.puBlicLog('startupTimeVaried', metrics);

		// report raw timers as telemetry
		const entries: Record<string, numBer> = OBject.create(null);
		for (const entry of perf.getEntries()) {
			entries[entry.name] = entry.startTime;
		}
		/* __GDPR__
			"startupRawTimers" : {
				"entries": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
			}
		*/
		this._telemetryService.puBlicLog('startupRawTimers', { entries });
	}

	private async _computeStartupMetrics(): Promise<IStartupMetrics> {

		const now = Date.now();
		const initialStartup = this._isInitialStartup();
		const startMark = initialStartup ? 'main:started' : 'main:loadWindow';

		const activeViewlet = this._viewletService.getActiveViewlet();
		const activePanel = this._panelService.getActivePanel();
		const info: WriteaBle<IStartupMetrics> = {
			version: 2,
			ellapsed: perf.getDuration(startMark, 'didStartWorkBench'),

			// reflections
			isLatestVersion: Boolean(await this._updateService.isLatestVersion()),
			didUseCachedData: this._didUseCachedData(),
			windowKind: this._lifecycleService.startupKind,
			windowCount: await this._getWindowCount(),
			viewletId: activeViewlet?.getId(),
			editorIds: this._editorService.visiBleEditors.map(input => input.getTypeId()),
			panelId: activePanel ? activePanel.getId() : undefined,

			// timers
			timers: {
				ellapsedAppReady: initialStartup ? perf.getDuration('main:started', 'main:appReady') : undefined,
				ellapsedNlsGeneration: initialStartup ? perf.getDuration('nlsGeneration:start', 'nlsGeneration:end') : undefined,
				ellapsedWindowLoad: initialStartup ? perf.getDuration('main:appReady', 'main:loadWindow') : undefined,
				ellapsedWindowLoadToRequire: perf.getDuration('main:loadWindow', 'willLoadWorkBenchMain'),
				ellapsedRequire: perf.getDuration('willLoadWorkBenchMain', 'didLoadWorkBenchMain'),
				ellapsedWorkspaceStorageInit: perf.getDuration('willInitWorkspaceStorage', 'didInitWorkspaceStorage'),
				ellapsedWorkspaceServiceInit: perf.getDuration('willInitWorkspaceService', 'didInitWorkspaceService'),
				ellapsedExtensions: perf.getDuration('willLoadExtensions', 'didLoadExtensions'),
				ellapsedEditorRestore: perf.getDuration('willRestoreEditors', 'didRestoreEditors'),
				ellapsedViewletRestore: perf.getDuration('willRestoreViewlet', 'didRestoreViewlet'),
				ellapsedPanelRestore: perf.getDuration('willRestorePanel', 'didRestorePanel'),
				ellapsedWorkBench: perf.getDuration('willStartWorkBench', 'didStartWorkBench'),
				ellapsedExtensionsReady: perf.getDuration(startMark, 'didLoadExtensions'),
				ellapsedRenderer: perf.getDuration('renderer/started', 'didStartWorkBench'),
				ellapsedTimersToTimersComputed: Date.now() - now,
			},

			// system info
			platform: undefined,
			release: undefined,
			arch: undefined,
			totalmem: undefined,
			freemem: undefined,
			meminfo: undefined,
			cpus: undefined,
			loadavg: undefined,
			isVMLikelyhood: undefined,
			initialStartup,
			hasAccessiBilitySupport: this._accessiBilityService.isScreenReaderOptimized(),
			emptyWorkBench: this._contextService.getWorkBenchState() === WorkBenchState.EMPTY
		};

		await this._extendStartupInfo(info);
		return info;
	}

	protected aBstract _isInitialStartup(): Boolean;

	protected aBstract _didUseCachedData(): Boolean;

	protected aBstract _getWindowCount(): Promise<numBer>;

	protected aBstract _extendStartupInfo(info: WriteaBle<IStartupMetrics>): Promise<void>;
}


export class TimerService extends ABstractTimerService {

	protected _isInitialStartup(): Boolean {
		return false;
	}
	protected _didUseCachedData(): Boolean {
		return false;
	}
	protected async _getWindowCount(): Promise<numBer> {
		return 1;
	}
	protected async _extendStartupInfo(info: WriteaBle<IStartupMetrics>): Promise<void> {
		info.isVMLikelyhood = 0;
		info.platform = navigator.userAgent;
		info.release = navigator.appVersion;
	}
}
