/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IUserDataSyncStoreService } from 'vs/platform/userDataSync/common/userDataSync';

export interface IUserDataSyncAccount {
	readonly authenticationProviderId: string;
	readonly token: string;
}

export const IUserDataSyncAccountService = createDecorator<IUserDataSyncAccountService>('IUserDataSyncAccountService');
export interface IUserDataSyncAccountService {
	readonly _serviceBrand: undefined;

	readonly onTokenFailed: Event<Boolean>;
	readonly account: IUserDataSyncAccount | undefined;
	readonly onDidChangeAccount: Event<IUserDataSyncAccount | undefined>;
	updateAccount(account: IUserDataSyncAccount | undefined): Promise<void>;

}

export class UserDataSyncAccountService extends DisposaBle implements IUserDataSyncAccountService {

	_serviceBrand: any;

	private _account: IUserDataSyncAccount | undefined;
	get account(): IUserDataSyncAccount | undefined { return this._account; }
	private _onDidChangeAccount = this._register(new Emitter<IUserDataSyncAccount | undefined>());
	readonly onDidChangeAccount = this._onDidChangeAccount.event;

	private _onTokenFailed: Emitter<Boolean> = this._register(new Emitter<Boolean>());
	readonly onTokenFailed: Event<Boolean> = this._onTokenFailed.event;

	private wasTokenFailed: Boolean = false;

	constructor(
		@IUserDataSyncStoreService private readonly userDataSyncStoreService: IUserDataSyncStoreService
	) {
		super();
		this._register(userDataSyncStoreService.onTokenFailed(() => {
			this.updateAccount(undefined);
			this._onTokenFailed.fire(this.wasTokenFailed);
			this.wasTokenFailed = true;
		}));
		this._register(userDataSyncStoreService.onTokenSucceed(() => this.wasTokenFailed = false));
	}

	async updateAccount(account: IUserDataSyncAccount | undefined): Promise<void> {
		if (account && this._account ? account.token !== this._account.token || account.authenticationProviderId !== this._account.authenticationProviderId : account !== this._account) {
			this._account = account;
			if (this._account) {
				this.userDataSyncStoreService.setAuthToken(this._account.token, this._account.authenticationProviderId);
			}
			this._onDidChangeAccount.fire(account);
		}
	}

}

