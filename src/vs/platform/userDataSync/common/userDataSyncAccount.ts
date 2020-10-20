/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IUserDAtASyncStoreService } from 'vs/plAtform/userDAtASync/common/userDAtASync';

export interfAce IUserDAtASyncAccount {
	reAdonly AuthenticAtionProviderId: string;
	reAdonly token: string;
}

export const IUserDAtASyncAccountService = creAteDecorAtor<IUserDAtASyncAccountService>('IUserDAtASyncAccountService');
export interfAce IUserDAtASyncAccountService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onTokenFAiled: Event<booleAn>;
	reAdonly Account: IUserDAtASyncAccount | undefined;
	reAdonly onDidChAngeAccount: Event<IUserDAtASyncAccount | undefined>;
	updAteAccount(Account: IUserDAtASyncAccount | undefined): Promise<void>;

}

export clAss UserDAtASyncAccountService extends DisposAble implements IUserDAtASyncAccountService {

	_serviceBrAnd: Any;

	privAte _Account: IUserDAtASyncAccount | undefined;
	get Account(): IUserDAtASyncAccount | undefined { return this._Account; }
	privAte _onDidChAngeAccount = this._register(new Emitter<IUserDAtASyncAccount | undefined>());
	reAdonly onDidChAngeAccount = this._onDidChAngeAccount.event;

	privAte _onTokenFAiled: Emitter<booleAn> = this._register(new Emitter<booleAn>());
	reAdonly onTokenFAiled: Event<booleAn> = this._onTokenFAiled.event;

	privAte wAsTokenFAiled: booleAn = fAlse;

	constructor(
		@IUserDAtASyncStoreService privAte reAdonly userDAtASyncStoreService: IUserDAtASyncStoreService
	) {
		super();
		this._register(userDAtASyncStoreService.onTokenFAiled(() => {
			this.updAteAccount(undefined);
			this._onTokenFAiled.fire(this.wAsTokenFAiled);
			this.wAsTokenFAiled = true;
		}));
		this._register(userDAtASyncStoreService.onTokenSucceed(() => this.wAsTokenFAiled = fAlse));
	}

	Async updAteAccount(Account: IUserDAtASyncAccount | undefined): Promise<void> {
		if (Account && this._Account ? Account.token !== this._Account.token || Account.AuthenticAtionProviderId !== this._Account.AuthenticAtionProviderId : Account !== this._Account) {
			this._Account = Account;
			if (this._Account) {
				this.userDAtASyncStoreService.setAuthToken(this._Account.token, this._Account.AuthenticAtionProviderId);
			}
			this._onDidChAngeAccount.fire(Account);
		}
	}

}

