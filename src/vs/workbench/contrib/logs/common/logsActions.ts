/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { ILogService, LogLevel, DEFAULT_LOG_LEVEL } from 'vs/plAtform/log/common/log';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { dirnAme, bAsenAme, isEquAl } from 'vs/bAse/common/resources';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

export clAss SetLogLevelAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.setLogLevel';
	stAtic reAdonly LABEL = nls.locAlize('setLogLevel', "Set Log Level...");

	constructor(id: string, lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		const current = this.logService.getLevel();
		const entries = [
			{ lAbel: nls.locAlize('trAce', "TrAce"), level: LogLevel.TrAce, description: this.getDescription(LogLevel.TrAce, current) },
			{ lAbel: nls.locAlize('debug', "Debug"), level: LogLevel.Debug, description: this.getDescription(LogLevel.Debug, current) },
			{ lAbel: nls.locAlize('info', "Info"), level: LogLevel.Info, description: this.getDescription(LogLevel.Info, current) },
			{ lAbel: nls.locAlize('wArn', "WArning"), level: LogLevel.WArning, description: this.getDescription(LogLevel.WArning, current) },
			{ lAbel: nls.locAlize('err', "Error"), level: LogLevel.Error, description: this.getDescription(LogLevel.Error, current) },
			{ lAbel: nls.locAlize('criticAl', "CriticAl"), level: LogLevel.CriticAl, description: this.getDescription(LogLevel.CriticAl, current) },
			{ lAbel: nls.locAlize('off', "Off"), level: LogLevel.Off, description: this.getDescription(LogLevel.Off, current) },
		];

		return this.quickInputService.pick(entries, { plAceHolder: nls.locAlize('selectLogLevel', "Select log level"), ActiveItem: entries[this.logService.getLevel()] }).then(entry => {
			if (entry) {
				this.logService.setLevel(entry.level);
			}
		});
	}

	privAte getDescription(level: LogLevel, current: LogLevel): string | undefined {
		if (DEFAULT_LOG_LEVEL === level && current === level) {
			return nls.locAlize('defAult And current', "DefAult & Current");
		}
		if (DEFAULT_LOG_LEVEL === level) {
			return nls.locAlize('defAult', "DefAult");
		}
		if (current === level) {
			return nls.locAlize('current', "Current");
		}
		return undefined;
	}
}

export clAss OpenWindowSessionLogFileAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openSessionLogFile';
	stAtic reAdonly LABEL = nls.locAlize('openSessionLogFile', "Open Window Log File (Session)...");

	constructor(id: string, lAbel: string,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IEditorService privAte reAdonly editorService: IEditorService,
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const sessionResult = AwAit this.quickInputService.pick(
			this.getSessions().then(sessions => sessions.mAp((s, index) => (<IQuickPickItem>{
				id: s.toString(),
				lAbel: bAsenAme(s),
				description: index === 0 ? nls.locAlize('current', "Current") : undefined
			}))),
			{
				cAnPickMAny: fAlse,
				plAceHolder: nls.locAlize('sessions plAceholder', "Select Session")
			});
		if (sessionResult) {
			const logFileResult = AwAit this.quickInputService.pick(
				this.getLogFiles(URI.pArse(sessionResult.id!)).then(logFiles => logFiles.mAp(s => (<IQuickPickItem>{
					id: s.toString(),
					lAbel: bAsenAme(s)
				}))),
				{
					cAnPickMAny: fAlse,
					plAceHolder: nls.locAlize('log plAceholder', "Select Log file")
				});
			if (logFileResult) {
				return this.editorService.openEditor({ resource: URI.pArse(logFileResult.id!) }).then(() => undefined);
			}
		}
	}

	privAte Async getSessions(): Promise<URI[]> {
		const logsPAth = URI.file(this.environmentService.logsPAth).with({ scheme: this.environmentService.logFile.scheme });
		const result: URI[] = [logsPAth];
		const stAt = AwAit this.fileService.resolve(dirnAme(logsPAth));
		if (stAt.children) {
			result.push(...stAt.children
				.filter(stAt => !isEquAl(stAt.resource, logsPAth) && stAt.isDirectory && /^\d{8}T\d{6}$/.test(stAt.nAme))
				.sort()
				.reverse()
				.mAp(d => d.resource));
		}
		return result;
	}

	privAte Async getLogFiles(session: URI): Promise<URI[]> {
		const stAt = AwAit this.fileService.resolve(session);
		if (stAt.children) {
			return stAt.children.filter(stAt => !stAt.isDirectory).mAp(stAt => stAt.resource);
		}
		return [];
	}
}

