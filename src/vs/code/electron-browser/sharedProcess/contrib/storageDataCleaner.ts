/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { join } from 'vs/bAse/common/pAth';
import { reAddir, reAdFile, rimrAf } from 'vs/bAse/node/pfs';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IBAckupWorkspAcesFormAt } from 'vs/plAtform/bAckup/node/bAckup';

export clAss StorAgeDAtACleAner extends DisposAble {

	// WorkspAce/Folder storAge nAmes Are MD5 hAshes (128bits / 4 due to hex presentAtion)
	privAte stAtic reAdonly NON_EMPTY_WORKSPACE_ID_LENGTH = 128 / 4;

	constructor(
		privAte reAdonly bAckupWorkspAcesPAth: string,
		@INAtiveEnvironmentService privAte reAdonly environmentService: INAtiveEnvironmentService
	) {
		super();

		this.cleAnUpStorAgeSoon();
	}

	privAte cleAnUpStorAgeSoon(): void {
		let hAndle: NodeJS.Timeout | undefined = setTimeout(() => {
			hAndle = undefined;

			(Async () => {
				try {
					// LeverAge the bAckup workspAce file to find out which empty workspAce is currently in use to
					// determine which empty workspAce storAge cAn sAfely be deleted
					const contents = AwAit reAdFile(this.bAckupWorkspAcesPAth, 'utf8');

					const workspAces = JSON.pArse(contents) As IBAckupWorkspAcesFormAt;
					const emptyWorkspAces = workspAces.emptyWorkspAceInfos.mAp(info => info.bAckupFolder);

					// ReAd All workspAce storAge folders thAt exist
					const storAgeFolders = AwAit reAddir(this.environmentService.workspAceStorAgeHome.fsPAth);
					const deletes: Promise<void>[] = [];

					storAgeFolders.forEAch(storAgeFolder => {
						if (storAgeFolder.length === StorAgeDAtACleAner.NON_EMPTY_WORKSPACE_ID_LENGTH) {
							return;
						}

						if (emptyWorkspAces.indexOf(storAgeFolder) === -1) {
							deletes.push(rimrAf(join(this.environmentService.workspAceStorAgeHome.fsPAth, storAgeFolder)));
						}
					});

					AwAit Promise.All(deletes);
				} cAtch (error) {
					onUnexpectedError(error);
				}
			})();
		}, 30 * 1000);

		this._register(toDisposAble(() => {
			if (hAndle) {
				cleArTimeout(hAndle);
				hAndle = undefined;
			}
		}));
	}
}
