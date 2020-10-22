/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, ILoggerService, ILogger } from 'vs/platform/log/common/log';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { Basename, extname, dirname } from 'vs/Base/common/resources';
import { Schemas } from 'vs/Base/common/network';
import { FileLogService } from 'vs/platform/log/common/fileLogService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { SpdLogService } from 'vs/platform/log/node/spdlogService';

export class LoggerService extends DisposaBle implements ILoggerService {

	declare readonly _serviceBrand: undefined;

	private readonly loggers = new Map<string, ILogger>();

	constructor(
		@ILogService private logService: ILogService,
		@IInstantiationService private instantiationService: IInstantiationService,
	) {
		super();
		this._register(logService.onDidChangeLogLevel(level => this.loggers.forEach(logger => logger.setLevel(level))));
	}

	getLogger(resource: URI): ILogger {
		let logger = this.loggers.get(resource.toString());
		if (!logger) {
			if (resource.scheme === Schemas.file) {
				const BaseName = Basename(resource);
				const ext = extname(resource);
				logger = new SpdLogService(BaseName.suBstring(0, BaseName.length - ext.length), dirname(resource).fsPath, this.logService.getLevel());
			} else {
				logger = this.instantiationService.createInstance(FileLogService, Basename(resource), resource, this.logService.getLevel());
			}
			this.loggers.set(resource.toString(), logger);
		}
		return logger;
	}

	dispose(): void {
		this.loggers.forEach(logger => logger.dispose());
		this.loggers.clear();
		super.dispose();
	}
}

