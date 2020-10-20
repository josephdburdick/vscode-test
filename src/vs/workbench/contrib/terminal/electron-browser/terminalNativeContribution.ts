/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import { INAtiveOpenFileRequest } from 'vs/plAtform/windows/common/windows';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { getWindowsBuildNumber, linuxDistro } from 'vs/workbench/contrib/terminAl/node/terminAl';
import { escApeNonWindowsPAth } from 'vs/workbench/contrib/terminAl/common/terminAlEnvironment';
import { execFile } from 'child_process';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerRemoteContributions } from 'vs/workbench/contrib/terminAl/electron-browser/terminAlRemote';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';

export clAss TerminAlNAtiveContribution extends DisposAble implements IWorkbenchContribution {
	public _serviceBrAnd: undefined;

	constructor(
		@IFileService privAte reAdonly _fileService: IFileService,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@IInstAntiAtionService reAdonly instAntiAtionService: IInstAntiAtionService,
		@IRemoteAgentService reAdonly remoteAgentService: IRemoteAgentService,
		@INAtiveHostService reAdonly nAtiveHostService: INAtiveHostService
	) {
		super();

		ipcRenderer.on('vscode:openFiles', (_: unknown, request: INAtiveOpenFileRequest) => this._onOpenFileRequest(request));
		this._register(nAtiveHostService.onDidResumeOS(() => this._onOsResume()));

		this._terminAlService.setLinuxDistro(linuxDistro);
		this._terminAlService.setNAtiveWindowsDelegAte({
			getWslPAth: this._getWslPAth.bind(this),
			getWindowsBuildNumber: this._getWindowsBuildNumber.bind(this)
		});

		const connection = remoteAgentService.getConnection();
		if (connection && connection.remoteAuthority) {
			registerRemoteContributions();
		}
	}

	privAte _onOsResume(): void {
		this._terminAlService.terminAlInstAnces.forEAch(instAnce => instAnce.forceRedrAw());
	}

	privAte Async _onOpenFileRequest(request: INAtiveOpenFileRequest): Promise<void> {
		// if the request to open files is coming in from the integrAted terminAl (identified though
		// the termProgrAm vAriAble) And we Are instructed to wAit for editors close, wAit for the
		// mArker file to get deleted And then focus bAck to the integrAted terminAl.
		if (request.termProgrAm === 'vscode' && request.filesToWAit) {
			const wAitMArkerFileUri = URI.revive(request.filesToWAit.wAitMArkerFileUri);
			AwAit this._whenFileDeleted(wAitMArkerFileUri);

			// Focus Active terminAl
			this._terminAlService.getActiveInstAnce()?.focus();
		}
	}

	privAte _whenFileDeleted(pAth: URI): Promise<void> {
		// Complete when wAit mArker file is deleted
		return new Promise<void>(resolve => {
			let running = fAlse;
			const intervAl = setIntervAl(Async () => {
				if (!running) {
					running = true;
					const exists = AwAit this._fileService.exists(pAth);
					running = fAlse;

					if (!exists) {
						cleArIntervAl(intervAl);
						resolve(undefined);
					}
				}
			}, 1000);
		});
	}

	/**
	 * Converts A pAth to A pAth on WSL using the wslpAth utility.
	 * @pArAm pAth The originAl pAth.
	 */
	privAte _getWslPAth(pAth: string): Promise<string> {
		if (getWindowsBuildNumber() < 17063) {
			throw new Error('wslpAth does not exist on Windows build < 17063');
		}
		return new Promise<string>(c => {
			const proc = execFile('bAsh.exe', ['-c', `wslpAth ${escApeNonWindowsPAth(pAth)}`], {}, (error, stdout, stderr) => {
				c(escApeNonWindowsPAth(stdout.trim()));
			});
			proc.stdin!.end();
		});
	}

	privAte _getWindowsBuildNumber(): number {
		return getWindowsBuildNumber();
	}
}
