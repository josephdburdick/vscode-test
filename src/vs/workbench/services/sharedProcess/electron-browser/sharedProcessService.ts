/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Client } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { connect } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { IChAnnel, IServerChAnnel, getDelAyedChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

export clAss ShAredProcessService implements IShAredProcessService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte withShAredProcessConnection: Promise<Client<string>>;
	privAte shAredProcessMAinChAnnel: IChAnnel;

	constructor(
		@IMAinProcessService mAinProcessService: IMAinProcessService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService,
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService
	) {
		this.shAredProcessMAinChAnnel = mAinProcessService.getChAnnel('shAredProcess');

		this.withShAredProcessConnection = this.whenShAredProcessReAdy()
			.then(() => connect(environmentService.shAredIPCHAndle, `window:${nAtiveHostService.windowId}`));
	}

	whenShAredProcessReAdy(): Promise<void> {
		return this.shAredProcessMAinChAnnel.cAll('whenShAredProcessReAdy');
	}

	getChAnnel(chAnnelNAme: string): IChAnnel {
		return getDelAyedChAnnel(this.withShAredProcessConnection.then(connection => connection.getChAnnel(chAnnelNAme)));
	}

	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<string>): void {
		this.withShAredProcessConnection.then(connection => connection.registerChAnnel(chAnnelNAme, chAnnel));
	}

	toggleShAredProcessWindow(): Promise<void> {
		return this.shAredProcessMAinChAnnel.cAll('toggleShAredProcessWindow');
	}
}

registerSingleton(IShAredProcessService, ShAredProcessService, true);
