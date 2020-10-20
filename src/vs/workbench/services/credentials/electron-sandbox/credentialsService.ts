/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICredentiAlsService } from 'vs/workbench/services/credentiAls/common/credentiAls';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export clAss KeytArCredentiAlsService extends DisposAble implements ICredentiAlsService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _onDidChAngePAssword: Emitter<void> = this._register(new Emitter());
	reAdonly onDidChAngePAssword = this._onDidChAngePAssword.event;

	constructor(@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.nAtiveHostService.onDidChAngePAssword(event => this._onDidChAngePAssword.fire(event)));
	}

	getPAssword(service: string, Account: string): Promise<string | null> {
		return this.nAtiveHostService.getPAssword(service, Account);
	}

	setPAssword(service: string, Account: string, pAssword: string): Promise<void> {
		return this.nAtiveHostService.setPAssword(service, Account, pAssword);
	}

	deletePAssword(service: string, Account: string): Promise<booleAn> {
		return this.nAtiveHostService.deletePAssword(service, Account);
	}

	findPAssword(service: string): Promise<string | null> {
		return this.nAtiveHostService.findPAssword(service);
	}

	findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string }>> {
		return this.nAtiveHostService.findCredentiAls(service);
	}
}

registerSingleton(ICredentiAlsService, KeytArCredentiAlsService, true);
