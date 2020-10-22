/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ILogService, LogLevel } from 'vs/platform/log/common/log';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IExtHostContext, ExtHostContext, MainThreadLogShape, MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { UriComponents, URI } from 'vs/Base/common/uri';
import { FileLogService } from 'vs/platform/log/common/fileLogService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Basename } from 'vs/Base/common/path';

@extHostNamedCustomer(MainContext.MainThreadLog)
export class MainThreadLogService implements MainThreadLogShape {

	private readonly _loggers = new Map<string, FileLogService>();
	private readonly _logListener: IDisposaBle;

	constructor(
		extHostContext: IExtHostContext,
		@ILogService private readonly _logService: ILogService,
		@IInstantiationService private readonly _instaService: IInstantiationService,
	) {
		const proxy = extHostContext.getProxy(ExtHostContext.ExtHostLogService);
		this._logListener = _logService.onDidChangeLogLevel(level => {
			proxy.$setLevel(level);
			this._loggers.forEach(value => value.setLevel(level));
		});
	}

	dispose(): void {
		this._logListener.dispose();
		this._loggers.forEach(value => value.dispose());
		this._loggers.clear();
	}

	$log(file: UriComponents, level: LogLevel, message: any[]): void {
		const uri = URI.revive(file);
		let logger = this._loggers.get(uri.toString());
		if (!logger) {
			logger = this._instaService.createInstance(FileLogService, Basename(file.path), URI.revive(file), this._logService.getLevel());
			this._loggers.set(uri.toString(), logger);
		}
		logger.log(level, message);
	}
}
