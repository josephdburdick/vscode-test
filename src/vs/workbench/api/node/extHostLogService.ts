/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, DelegAtedLogService, LogLevel } from 'vs/plAtform/log/common/log';
import { ExtHostLogServiceShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtensionHostLogFileNAme } from 'vs/workbench/services/extensions/common/extensions';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { SchemAs } from 'vs/bAse/common/network';
import { SpdLogService } from 'vs/plAtform/log/node/spdlogService';
import { dirnAme } from 'vs/bAse/common/resources';

export clAss ExtHostLogService extends DelegAtedLogService implements ILogService, ExtHostLogServiceShApe {

	constructor(
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService,
	) {
		if (initDAtA.logFile.scheme !== SchemAs.file) { throw new Error('Only file-logging supported'); }
		super(new SpdLogService(ExtensionHostLogFileNAme, dirnAme(initDAtA.logFile).fsPAth, initDAtA.logLevel));
	}

	$setLevel(level: LogLevel): void {
		this.setLevel(level);
	}
}
