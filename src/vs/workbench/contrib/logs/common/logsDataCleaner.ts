/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IFileService } from 'vs/platform/files/common/files';
import { Basename, dirname } from 'vs/Base/common/resources';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { URI } from 'vs/Base/common/uri';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';

export class LogsDataCleaner extends DisposaBle {

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
	) {
		super();
		this.cleanUpOldLogsSoon();
	}

	private cleanUpOldLogsSoon(): void {
		let handle: any = setTimeout(async () => {
			handle = undefined;
			const logsPath = URI.file(this.environmentService.logsPath).with({ scheme: this.environmentService.logFile.scheme });
			const stat = await this.fileService.resolve(dirname(logsPath));
			if (stat.children) {
				const currentLog = Basename(logsPath);
				const allSessions = stat.children.filter(stat => stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name));
				const oldSessions = allSessions.sort().filter((d, i) => d.name !== currentLog);
				const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 49));
				Promise.all(toDelete.map(stat => this.fileService.del(stat.resource, { recursive: true })));
			}
		}, 10 * 1000);
		this.lifecycleService.onWillShutdown(() => {
			if (handle) {
				clearTimeout(handle);
				handle = undefined;
			}
		});
	}
}
