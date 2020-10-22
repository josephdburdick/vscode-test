/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { ILogService, LogLevel, DEFAULT_LOG_LEVEL } from 'vs/platform/log/common/log';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { dirname, Basename, isEqual } from 'vs/Base/common/resources';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

export class SetLogLevelAction extends Action {

	static readonly ID = 'workBench.action.setLogLevel';
	static readonly LABEL = nls.localize('setLogLevel', "Set Log Level...");

	constructor(id: string, laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@ILogService private readonly logService: ILogService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		const current = this.logService.getLevel();
		const entries = [
			{ laBel: nls.localize('trace', "Trace"), level: LogLevel.Trace, description: this.getDescription(LogLevel.Trace, current) },
			{ laBel: nls.localize('deBug', "DeBug"), level: LogLevel.DeBug, description: this.getDescription(LogLevel.DeBug, current) },
			{ laBel: nls.localize('info', "Info"), level: LogLevel.Info, description: this.getDescription(LogLevel.Info, current) },
			{ laBel: nls.localize('warn', "Warning"), level: LogLevel.Warning, description: this.getDescription(LogLevel.Warning, current) },
			{ laBel: nls.localize('err', "Error"), level: LogLevel.Error, description: this.getDescription(LogLevel.Error, current) },
			{ laBel: nls.localize('critical', "Critical"), level: LogLevel.Critical, description: this.getDescription(LogLevel.Critical, current) },
			{ laBel: nls.localize('off', "Off"), level: LogLevel.Off, description: this.getDescription(LogLevel.Off, current) },
		];

		return this.quickInputService.pick(entries, { placeHolder: nls.localize('selectLogLevel', "Select log level"), activeItem: entries[this.logService.getLevel()] }).then(entry => {
			if (entry) {
				this.logService.setLevel(entry.level);
			}
		});
	}

	private getDescription(level: LogLevel, current: LogLevel): string | undefined {
		if (DEFAULT_LOG_LEVEL === level && current === level) {
			return nls.localize('default and current', "Default & Current");
		}
		if (DEFAULT_LOG_LEVEL === level) {
			return nls.localize('default', "Default");
		}
		if (current === level) {
			return nls.localize('current', "Current");
		}
		return undefined;
	}
}

export class OpenWindowSessionLogFileAction extends Action {

	static readonly ID = 'workBench.action.openSessionLogFile';
	static readonly LABEL = nls.localize('openSessionLogFile', "Open Window Log File (Session)...");

	constructor(id: string, laBel: string,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const sessionResult = await this.quickInputService.pick(
			this.getSessions().then(sessions => sessions.map((s, index) => (<IQuickPickItem>{
				id: s.toString(),
				laBel: Basename(s),
				description: index === 0 ? nls.localize('current', "Current") : undefined
			}))),
			{
				canPickMany: false,
				placeHolder: nls.localize('sessions placeholder', "Select Session")
			});
		if (sessionResult) {
			const logFileResult = await this.quickInputService.pick(
				this.getLogFiles(URI.parse(sessionResult.id!)).then(logFiles => logFiles.map(s => (<IQuickPickItem>{
					id: s.toString(),
					laBel: Basename(s)
				}))),
				{
					canPickMany: false,
					placeHolder: nls.localize('log placeholder', "Select Log file")
				});
			if (logFileResult) {
				return this.editorService.openEditor({ resource: URI.parse(logFileResult.id!) }).then(() => undefined);
			}
		}
	}

	private async getSessions(): Promise<URI[]> {
		const logsPath = URI.file(this.environmentService.logsPath).with({ scheme: this.environmentService.logFile.scheme });
		const result: URI[] = [logsPath];
		const stat = await this.fileService.resolve(dirname(logsPath));
		if (stat.children) {
			result.push(...stat.children
				.filter(stat => !isEqual(stat.resource, logsPath) && stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name))
				.sort()
				.reverse()
				.map(d => d.resource));
		}
		return result;
	}

	private async getLogFiles(session: URI): Promise<URI[]> {
		const stat = await this.fileService.resolve(session);
		if (stat.children) {
			return stat.children.filter(stat => !stat.isDirectory).map(stat => stat.resource);
		}
		return [];
	}
}

