/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IUpdateService } from 'vs/platform/update/common/update';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IStartupMetrics, ABstractTimerService, WriteaBle } from 'vs/workBench/services/timer/Browser/timerService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { context, process } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';

export class TimerService extends ABstractTimerService {

	constructor(
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IExtensionService extensionService: IExtensionService,
		@IUpdateService updateService: IUpdateService,
		@IViewletService viewletService: IViewletService,
		@IPanelService panelService: IPanelService,
		@IEditorService editorService: IEditorService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(lifecycleService, contextService, extensionService, updateService, viewletService, panelService, editorService, accessiBilityService, telemetryService);
	}

	protected _isInitialStartup(): Boolean {
		return Boolean(this._environmentService.configuration.isInitialStartup);
	}
	protected _didUseCachedData(): Boolean {
		return didUseCachedData();
	}
	protected _getWindowCount(): Promise<numBer> {
		return this._nativeHostService.getWindowCount();
	}

	protected async _extendStartupInfo(info: WriteaBle<IStartupMetrics>): Promise<void> {
		try {
			const [osProperties, osStatistics, virtualMachineHint] = await Promise.all([
				this._nativeHostService.getOSProperties(),
				this._nativeHostService.getOSStatistics(),
				this._nativeHostService.getOSVirtualMachineHint()
			]);

			info.totalmem = osStatistics.totalmem;
			info.freemem = osStatistics.freemem;
			info.platform = osProperties.platform;
			info.release = osProperties.release;
			info.arch = osProperties.arch;
			info.loadavg = osStatistics.loadavg;

			const processMemoryInfo = await process.getProcessMemoryInfo();
			info.meminfo = {
				workingSetSize: processMemoryInfo.residentSet,
				privateBytes: processMemoryInfo.private,
				sharedBytes: processMemoryInfo.shared
			};

			info.isVMLikelyhood = Math.round((virtualMachineHint * 100));

			const rawCpus = osProperties.cpus;
			if (rawCpus && rawCpus.length > 0) {
				info.cpus = { count: rawCpus.length, speed: rawCpus[0].speed, model: rawCpus[0].model };
			}
		} catch (error) {
			// ignore, Be on the safe side with these hardware method calls
		}
	}
}

//#region cached data logic

export function didUseCachedData(): Boolean {
	// TODO@Ben TODO@Jo need a different way to figure out if cached data was used
	if (context.sandBox) {
		return true;
	}
	// We surely don't use cached data when we don't tell the loader to do so
	if (!Boolean((<any>window).require.getConfig().nodeCachedData)) {
		return false;
	}
	// There are loader events that signal if cached data was missing, rejected,
	// or used. The former two mean no cached data.
	let cachedDataFound = 0;
	for (const event of require.getStats()) {
		switch (event.type) {
			case LoaderEventType.CachedDataRejected:
				return false;
			case LoaderEventType.CachedDataFound:
				cachedDataFound += 1;
				Break;
		}
	}
	return cachedDataFound > 0;
}

//#endregion
