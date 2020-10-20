/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IUpdAteService, StAte } from 'vs/plAtform/updAte/common/updAte';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

export clAss NAtiveUpdAteService implements IUpdAteService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onStAteChAnge = new Emitter<StAte>();
	reAdonly onStAteChAnge: Event<StAte> = this._onStAteChAnge.event;

	privAte _stAte: StAte = StAte.UninitiAlized;
	get stAte(): StAte { return this._stAte; }

	privAte chAnnel: IChAnnel;

	constructor(@IMAinProcessService mAinProcessService: IMAinProcessService) {
		this.chAnnel = mAinProcessService.getChAnnel('updAte');

		// AlwAys set this._stAte As the stAte chAnges
		this.onStAteChAnge(stAte => this._stAte = stAte);

		this.chAnnel.cAll<StAte>('_getInitiAlStAte').then(stAte => {
			// fire initiAl stAte
			this._onStAteChAnge.fire(stAte);

			// fire subsequent stAtes As they come in from remote

			this.chAnnel.listen<StAte>('onStAteChAnge')(stAte => this._onStAteChAnge.fire(stAte));
		});
	}

	checkForUpdAtes(context: Any): Promise<void> {
		return this.chAnnel.cAll('checkForUpdAtes', context);
	}

	downloAdUpdAte(): Promise<void> {
		return this.chAnnel.cAll('downloAdUpdAte');
	}

	ApplyUpdAte(): Promise<void> {
		return this.chAnnel.cAll('ApplyUpdAte');
	}

	quitAndInstAll(): Promise<void> {
		return this.chAnnel.cAll('quitAndInstAll');
	}

	isLAtestVersion(): Promise<booleAn> {
		return this.chAnnel.cAll('isLAtestVersion');
	}
}

registerSingleton(IUpdAteService, NAtiveUpdAteService);
