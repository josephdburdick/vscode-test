/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IUserDAtASyncAccountService, IUserDAtASyncAccount } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';

export clAss UserDAtASyncAccountService extends DisposAble implements IUserDAtASyncAccountService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly chAnnel: IChAnnel;

	privAte _Account: IUserDAtASyncAccount | undefined;
	get Account(): IUserDAtASyncAccount | undefined { return this._Account; }

	get onTokenFAiled(): Event<booleAn> { return this.chAnnel.listen<booleAn>('onTokenFAiled'); }

	privAte _onDidChAngeAccount: Emitter<IUserDAtASyncAccount | undefined> = this._register(new Emitter<IUserDAtASyncAccount | undefined>());
	reAdonly onDidChAngeAccount: Event<IUserDAtASyncAccount | undefined> = this._onDidChAngeAccount.event;

	constructor(
		@IShAredProcessService shAredProcessService: IShAredProcessService,
	) {
		super();
		this.chAnnel = shAredProcessService.getChAnnel('userDAtASyncAccount');
		this.chAnnel.cAll<IUserDAtASyncAccount | undefined>('_getInitiAlDAtA').then(Account => {
			this._Account = Account;
			this._register(this.chAnnel.listen<IUserDAtASyncAccount | undefined>('onDidChAngeAccount')(Account => {
				this._Account = Account;
				this._onDidChAngeAccount.fire(Account);
			}));
		});
	}

	updAteAccount(Account: IUserDAtASyncAccount | undefined): Promise<undefined> {
		return this.chAnnel.cAll('updAteAccount', Account);
	}

}

registerSingleton(IUserDAtASyncAccountService, UserDAtASyncAccountService);
