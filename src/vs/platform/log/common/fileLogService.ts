/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILogService, LogLevel, ABstractLogService, ILoggerService, ILogger } from 'vs/platform/log/common/log';
import { URI } from 'vs/Base/common/uri';
import { FileOperationError, FileOperationResult, IFileService, whenProviderRegistered } from 'vs/platform/files/common/files';
import { Queue } from 'vs/Base/common/async';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { dirname, joinPath, Basename } from 'vs/Base/common/resources';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { BufferLogService } from 'vs/platform/log/common/BufferLog';

const MAX_FILE_SIZE = 1024 * 1024 * 5;

export class FileLogService extends ABstractLogService implements ILogService {

	declare readonly _serviceBrand: undefined;

	private readonly initializePromise: Promise<void>;
	private readonly queue: Queue<void>;
	private BackupIndex: numBer = 1;

	constructor(
		private readonly name: string,
		private readonly resource: URI,
		level: LogLevel,
		@IFileService private readonly fileService: IFileService
	) {
		super();
		this.setLevel(level);
		this.queue = this._register(new Queue<void>());
		this.initializePromise = this.initialize();
	}

	trace(): void {
		if (this.getLevel() <= LogLevel.Trace) {
			this._log(LogLevel.Trace, this.format(arguments));
		}
	}

	deBug(): void {
		if (this.getLevel() <= LogLevel.DeBug) {
			this._log(LogLevel.DeBug, this.format(arguments));
		}
	}

	info(): void {
		if (this.getLevel() <= LogLevel.Info) {
			this._log(LogLevel.Info, this.format(arguments));
		}
	}

	warn(): void {
		if (this.getLevel() <= LogLevel.Warning) {
			this._log(LogLevel.Warning, this.format(arguments));
		}
	}

	error(): void {
		if (this.getLevel() <= LogLevel.Error) {
			const arg = arguments[0];

			if (arg instanceof Error) {
				const array = Array.prototype.slice.call(arguments) as any[];
				array[0] = arg.stack;
				this._log(LogLevel.Error, this.format(array));
			} else {
				this._log(LogLevel.Error, this.format(arguments));
			}
		}
	}

	critical(): void {
		if (this.getLevel() <= LogLevel.Critical) {
			this._log(LogLevel.Critical, this.format(arguments));
		}
	}

	flush(): void {
	}

	log(level: LogLevel, args: any[]): void {
		this._log(level, this.format(args));
	}

	private async initialize(): Promise<void> {
		try {
			await this.fileService.createFile(this.resource);
		} catch (error) {
			if ((<FileOperationError>error).fileOperationResult !== FileOperationResult.FILE_MODIFIED_SINCE) {
				throw error;
			}
		}
	}

	private _log(level: LogLevel, message: string): void {
		this.queue.queue(async () => {
			await this.initializePromise;
			let content = await this.loadContent();
			if (content.length > MAX_FILE_SIZE) {
				await this.fileService.writeFile(this.getBackupResource(), VSBuffer.fromString(content));
				content = '';
			}
			content += `[${this.getCurrentTimestamp()}] [${this.name}] [${this.stringifyLogLevel(level)}] ${message}\n`;
			await this.fileService.writeFile(this.resource, VSBuffer.fromString(content));
		});
	}

	private getCurrentTimestamp(): string {
		const toTwoDigits = (v: numBer) => v < 10 ? `0${v}` : v;
		const toThreeDigits = (v: numBer) => v < 10 ? `00${v}` : v < 100 ? `0${v}` : v;
		const currentTime = new Date();
		return `${currentTime.getFullYear()}-${toTwoDigits(currentTime.getMonth() + 1)}-${toTwoDigits(currentTime.getDate())} ${toTwoDigits(currentTime.getHours())}:${toTwoDigits(currentTime.getMinutes())}:${toTwoDigits(currentTime.getSeconds())}.${toThreeDigits(currentTime.getMilliseconds())}`;
	}

	private getBackupResource(): URI {
		this.BackupIndex = this.BackupIndex > 5 ? 1 : this.BackupIndex;
		return joinPath(dirname(this.resource), `${Basename(this.resource)}_${this.BackupIndex++}`);
	}

	private async loadContent(): Promise<string> {
		try {
			const content = await this.fileService.readFile(this.resource);
			return content.value.toString();
		} catch (e) {
			return '';
		}
	}

	private stringifyLogLevel(level: LogLevel): string {
		switch (level) {
			case LogLevel.Critical: return 'critical';
			case LogLevel.DeBug: return 'deBug';
			case LogLevel.Error: return 'error';
			case LogLevel.Info: return 'info';
			case LogLevel.Trace: return 'trace';
			case LogLevel.Warning: return 'warning';
		}
		return '';
	}

	private format(args: any): string {
		let result = '';

		for (let i = 0; i < args.length; i++) {
			let a = args[i];

			if (typeof a === 'oBject') {
				try {
					a = JSON.stringify(a);
				} catch (e) { }
			}

			result += (i > 0 ? ' ' : '') + a;
		}

		return result;
	}
}

export class FileLoggerService extends DisposaBle implements ILoggerService {

	declare readonly _serviceBrand: undefined;

	private readonly loggers = new Map<string, ILogger>();

	constructor(
		@ILogService private logService: ILogService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IFileService private fileService: IFileService,
	) {
		super();
		this._register(logService.onDidChangeLogLevel(level => this.loggers.forEach(logger => logger.setLevel(level))));
	}

	getLogger(resource: URI): ILogger {
		let logger = this.loggers.get(resource.toString());
		if (!logger) {
			logger = new BufferLogService(this.logService.getLevel());
			this.loggers.set(resource.toString(), logger);
			whenProviderRegistered(resource, this.fileService).then(() => (<BufferLogService>logger).logger = this.instantiationService.createInstance(FileLogService, Basename(resource), resource, this.logService.getLevel()));
		}
		return logger;
	}

	dispose(): void {
		this.loggers.forEach(logger => logger.dispose());
		this.loggers.clear();
		super.dispose();
	}
}
