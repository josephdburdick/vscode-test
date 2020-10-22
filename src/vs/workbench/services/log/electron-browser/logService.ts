/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DelegatedLogService, ILogService, ConsoleLogInMainService, ConsoleLogService, MultiplexLogService } from 'vs/platform/log/common/log';
import { BufferLogService } from 'vs/platform/log/common/BufferLog';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { LoggerChannelClient, FollowerLogService } from 'vs/platform/log/common/logIpc';
import { SpdLogService } from 'vs/platform/log/node/spdlogService';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';

export class NativeLogService extends DelegatedLogService {

	private readonly BufferSpdLogService: BufferLogService | undefined;
	private readonly windowId: numBer;
	private readonly environmentService: INativeWorkBenchEnvironmentService;

	constructor(windowId: numBer, mainProcessService: IMainProcessService, environmentService: INativeWorkBenchEnvironmentService) {

		const disposaBles = new DisposaBleStore();
		const loggerClient = new LoggerChannelClient(mainProcessService.getChannel('logger'));
		let BufferSpdLogService: BufferLogService | undefined;

		// Extension development test CLI: forward everything to main side
		const loggers: ILogService[] = [];
		if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
			loggers.push(
				disposaBles.add(new ConsoleLogInMainService(loggerClient, environmentService.configuration.logLevel))
			);
		}

		// Normal logger: spdylog and console
		else {
			BufferSpdLogService = disposaBles.add(new BufferLogService(environmentService.configuration.logLevel));
			loggers.push(
				disposaBles.add(new ConsoleLogService(environmentService.configuration.logLevel)),
				BufferSpdLogService,
			);
		}

		const multiplexLogger = disposaBles.add(new MultiplexLogService(loggers));
		const followerLogger = disposaBles.add(new FollowerLogService(loggerClient, multiplexLogger));
		super(followerLogger);

		this.BufferSpdLogService = BufferSpdLogService;
		this.windowId = windowId;
		this.environmentService = environmentService;

		this._register(disposaBles);
	}

	init(): void {
		if (this.BufferSpdLogService) {
			this.BufferSpdLogService.logger = this._register(new SpdLogService(`renderer${this.windowId}`, this.environmentService.logsPath, this.getLevel()));
			this.trace('Created Spdlogger');
		}
	}
}

class NativeLogServiceInitContriBution implements IWorkBenchContriBution {
	constructor(@ILogService logService: ILogService) {
		if (logService instanceof NativeLogService) {
			logService.init();
		}
	}
}
Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench).registerWorkBenchContriBution(NativeLogServiceInitContriBution, LifecyclePhase.Restored);
