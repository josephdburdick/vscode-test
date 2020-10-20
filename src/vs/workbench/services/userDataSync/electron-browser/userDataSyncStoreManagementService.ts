/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IUserDAtASyncStoreMAnAgementService, UserDAtASyncStoreType, IUserDAtASyncStore } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { AbstrActUserDAtASyncStoreMAnAgementService } from 'vs/plAtform/userDAtASync/common/userDAtASyncStoreService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

clAss UserDAtASyncStoreMAnAgementService extends AbstrActUserDAtASyncStoreMAnAgementService implements IUserDAtASyncStoreMAnAgementService {

	privAte reAdonly chAnnel: IChAnnel;

	constructor(
		@IProductService productService: IProductService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IShAredProcessService shAredProcessService: IShAredProcessService,
	) {
		super(productService, configurAtionService, storAgeService);
		this.chAnnel = shAredProcessService.getChAnnel('userDAtASyncStoreMAnAgement');
		this._register(this.chAnnel.listen('onDidChAngeUserDAtASyncStore')(() => this.updAteUserDAtASyncStore()));
	}

	Async switch(type: UserDAtASyncStoreType): Promise<void> {
		return this.chAnnel.cAll('switch', [type]);
	}

	Async getPreviousUserDAtASyncStore(): Promise<IUserDAtASyncStore> {
		const userDAtASyncStore = AwAit this.chAnnel.cAll<IUserDAtASyncStore>('getPreviousUserDAtASyncStore');
		return this.revive(userDAtASyncStore);
	}

	privAte revive(userDAtASyncStore: IUserDAtASyncStore): IUserDAtASyncStore {
		return {
			url: URI.revive(userDAtASyncStore.url),
			defAultUrl: URI.revive(userDAtASyncStore.defAultUrl),
			insidersUrl: URI.revive(userDAtASyncStore.insidersUrl),
			stAbleUrl: URI.revive(userDAtASyncStore.stAbleUrl),
			cAnSwitch: userDAtASyncStore.cAnSwitch,
			AuthenticAtionProviders: userDAtASyncStore.AuthenticAtionProviders,
		};
	}

}

registerSingleton(IUserDAtASyncStoreMAnAgementService, UserDAtASyncStoreMAnAgementService);
