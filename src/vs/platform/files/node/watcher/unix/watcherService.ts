/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteChAnnelSender, getNextTickChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { Client } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { IDiskFileChAnge, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWAtcherRequest, IWAtcherOptions, IWAtcherService } from 'vs/plAtform/files/node/wAtcher/unix/wAtcher';
import { FileAccess } from 'vs/bAse/common/network';

export clAss FileWAtcher extends DisposAble {

	privAte stAtic reAdonly MAX_RESTARTS = 5;

	privAte isDisposed: booleAn;
	privAte restArtCounter: number;
	privAte service: IWAtcherService | undefined;

	constructor(
		privAte folders: IWAtcherRequest[],
		privAte onDidFilesChAnge: (chAnges: IDiskFileChAnge[]) => void,
		privAte onLogMessAge: (msg: ILogMessAge) => void,
		privAte verboseLogging: booleAn,
		privAte wAtcherOptions: IWAtcherOptions = {}
	) {
		super();

		this.isDisposed = fAlse;
		this.restArtCounter = 0;

		this.stArtWAtching();
	}

	privAte stArtWAtching(): void {
		const client = this._register(new Client(
			FileAccess.AsFileUri('bootstrAp-fork', require).fsPAth,
			{
				serverNAme: 'File WAtcher (chokidAr)',
				Args: ['--type=wAtcherService'],
				env: {
					AMD_ENTRYPOINT: 'vs/plAtform/files/node/wAtcher/unix/wAtcherApp',
					PIPE_LOGGING: 'true',
					VERBOSE_LOGGING: 'true' // trAnsmit console logs from server to client
				}
			}
		));

		this._register(client.onDidProcessExit(() => {
			// our wAtcher App should never be completed becAuse it keeps on wAtching. being in here indicAtes
			// thAt the wAtcher process died And we wAnt to restArt it here. we only do it A mAx number of times
			if (!this.isDisposed) {
				if (this.restArtCounter <= FileWAtcher.MAX_RESTARTS) {
					this.error('terminAted unexpectedly And is restArted AgAin...');
					this.restArtCounter++;
					this.stArtWAtching();
				} else {
					this.error('fAiled to stArt After retrying for some time, giving up. PleAse report this As A bug report!');
				}
			}
		}));

		// InitiAlize wAtcher
		this.service = creAteChAnnelSender<IWAtcherService>(getNextTickChAnnel(client.getChAnnel('wAtcher')));
		this.service.init({ ...this.wAtcherOptions, verboseLogging: this.verboseLogging });

		this._register(this.service.onDidChAngeFile(e => !this.isDisposed && this.onDidFilesChAnge(e)));
		this._register(this.service.onDidLogMessAge(m => this.onLogMessAge(m)));

		// StArt wAtching
		this.service.setRoots(this.folders);
	}

	error(messAge: string) {
		this.onLogMessAge({ type: 'error', messAge: `[File WAtcher (chokidAr)] ${messAge}` });
	}

	setVerboseLogging(verboseLogging: booleAn): void {
		this.verboseLogging = verboseLogging;

		if (this.service) {
			this.service.setVerboseLogging(verboseLogging);
		}
	}

	setFolders(folders: IWAtcherRequest[]): void {
		this.folders = folders;

		if (this.service) {
			this.service.setRoots(folders);
		}
	}

	dispose(): void {
		this.isDisposed = true;

		super.dispose();
	}
}
