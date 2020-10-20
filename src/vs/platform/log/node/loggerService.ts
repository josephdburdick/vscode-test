/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, ILoggerService, ILogger } from 'vs/plAtform/log/common/log';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { bAsenAme, extnAme, dirnAme } from 'vs/bAse/common/resources';
import { SchemAs } from 'vs/bAse/common/network';
import { FileLogService } from 'vs/plAtform/log/common/fileLogService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { SpdLogService } from 'vs/plAtform/log/node/spdlogService';

export clAss LoggerService extends DisposAble implements ILoggerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly loggers = new MAp<string, ILogger>();

	constructor(
		@ILogService privAte logService: ILogService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
	) {
		super();
		this._register(logService.onDidChAngeLogLevel(level => this.loggers.forEAch(logger => logger.setLevel(level))));
	}

	getLogger(resource: URI): ILogger {
		let logger = this.loggers.get(resource.toString());
		if (!logger) {
			if (resource.scheme === SchemAs.file) {
				const bAseNAme = bAsenAme(resource);
				const ext = extnAme(resource);
				logger = new SpdLogService(bAseNAme.substring(0, bAseNAme.length - ext.length), dirnAme(resource).fsPAth, this.logService.getLevel());
			} else {
				logger = this.instAntiAtionService.creAteInstAnce(FileLogService, bAsenAme(resource), resource, this.logService.getLevel());
			}
			this.loggers.set(resource.toString(), logger);
		}
		return logger;
	}

	dispose(): void {
		this.loggers.forEAch(logger => logger.dispose());
		this.loggers.cleAr();
		super.dispose();
	}
}

