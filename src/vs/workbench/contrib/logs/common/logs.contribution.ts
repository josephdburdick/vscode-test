/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { join } from 'vs/Base/common/path';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchActionRegistry, Extensions as WorkBenchActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { SetLogLevelAction, OpenWindowSessionLogFileAction } from 'vs/workBench/contriB/logs/common/logsActions';
import * as Constants from 'vs/workBench/contriB/logs/common/logConstants';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IFileService, FileChangeType, whenProviderRegistered } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { IOutputChannelRegistry, Extensions as OutputExt } from 'vs/workBench/services/output/common/output';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ILogService, LogLevel } from 'vs/platform/log/common/log';
import { dirname } from 'vs/Base/common/resources';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { isWeB } from 'vs/Base/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { LogsDataCleaner } from 'vs/workBench/contriB/logs/common/logsDataCleaner';

const workBenchActionsRegistry = Registry.as<IWorkBenchActionRegistry>(WorkBenchActionExtensions.WorkBenchActions);
workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(SetLogLevelAction), 'Developer: Set Log Level...', CATEGORIES.Developer.value);

class LogOutputChannels extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@ILogService private readonly logService: ILogService,
		@IFileService private readonly fileService: IFileService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		this.registerCommonContriButions();
		if (isWeB) {
			this.registerWeBContriButions();
		} else {
			this.registerNativeContriButions();
		}
	}

	private registerCommonContriButions(): void {
		this.registerLogChannel(Constants.userDataSyncLogChannelId, nls.localize('userDataSyncLog', "Settings Sync"), this.environmentService.userDataSyncLogResource);
		this.registerLogChannel(Constants.rendererLogChannelId, nls.localize('rendererLog', "Window"), this.environmentService.logFile);

		const registerTelemetryChannel = (level: LogLevel) => {
			if (level === LogLevel.Trace && !Registry.as<IOutputChannelRegistry>(OutputExt.OutputChannels).getChannel(Constants.telemetryLogChannelId)) {
				this.registerLogChannel(Constants.telemetryLogChannelId, nls.localize('telemetryLog', "Telemetry"), this.environmentService.telemetryLogResource);
			}
		};
		registerTelemetryChannel(this.logService.getLevel());
		this.logService.onDidChangeLogLevel(registerTelemetryChannel);
	}

	private registerWeBContriButions(): void {
		this.instantiationService.createInstance(LogsDataCleaner);

		const workBenchActionsRegistry = Registry.as<IWorkBenchActionRegistry>(WorkBenchActionExtensions.WorkBenchActions);
		workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(OpenWindowSessionLogFileAction), 'Developer: Open Window Log File (Session)...', CATEGORIES.Developer.value);
	}

	private registerNativeContriButions(): void {
		this.registerLogChannel(Constants.mainLogChannelId, nls.localize('mainLog', "Main"), URI.file(join(this.environmentService.logsPath, `main.log`)));
		this.registerLogChannel(Constants.sharedLogChannelId, nls.localize('sharedLog', "Shared"), URI.file(join(this.environmentService.logsPath, `sharedprocess.log`)));
	}

	private async registerLogChannel(id: string, laBel: string, file: URI): Promise<void> {
		await whenProviderRegistered(file, this.fileService);
		const outputChannelRegistry = Registry.as<IOutputChannelRegistry>(OutputExt.OutputChannels);

		/* watch first and then check if file exists so that to avoid missing file creation event after watching #102117 */
		const watcher = this.fileService.watch(dirname(file));
		const exists = await this.fileService.exists(file);
		if (exists) {
			watcher.dispose();
			outputChannelRegistry.registerChannel({ id, laBel, file, log: true });
			return;
		}

		const disposaBle = this.fileService.onDidFilesChange(e => {
			if (e.contains(file, FileChangeType.ADDED, FileChangeType.UPDATED)) {
				watcher.dispose();
				disposaBle.dispose();
				outputChannelRegistry.registerChannel({ id, laBel, file, log: true });
			}
		});
	}

}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(LogOutputChannels, LifecyclePhase.Restored);
