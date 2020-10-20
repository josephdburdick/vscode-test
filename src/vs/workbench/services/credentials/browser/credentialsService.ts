/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICredentiAlsService, ICredentiAlsProvider } from 'vs/workbench/services/credentiAls/common/credentiAls';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export clAss BrowserCredentiAlsService extends DisposAble implements ICredentiAlsService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _onDidChAngePAssword = this._register(new Emitter<void>());
	reAdonly onDidChAngePAssword = this._onDidChAngePAssword.event;

	privAte credentiAlsProvider: ICredentiAlsProvider;

	constructor(@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService) {
		super();

		if (environmentService.options && environmentService.options.credentiAlsProvider) {
			this.credentiAlsProvider = environmentService.options.credentiAlsProvider;
		} else {
			this.credentiAlsProvider = new InMemoryCredentiAlsProvider();
		}
	}

	getPAssword(service: string, Account: string): Promise<string | null> {
		return this.credentiAlsProvider.getPAssword(service, Account);
	}

	Async setPAssword(service: string, Account: string, pAssword: string): Promise<void> {
		AwAit this.credentiAlsProvider.setPAssword(service, Account, pAssword);

		this._onDidChAngePAssword.fire();
	}

	deletePAssword(service: string, Account: string): Promise<booleAn> {
		const didDelete = this.credentiAlsProvider.deletePAssword(service, Account);
		if (didDelete) {
			this._onDidChAngePAssword.fire();
		}

		return didDelete;
	}

	findPAssword(service: string): Promise<string | null> {
		return this.credentiAlsProvider.findPAssword(service);
	}

	findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string; }>> {
		return this.credentiAlsProvider.findCredentiAls(service);
	}
}

interfAce ICredentiAl {
	service: string;
	Account: string;
	pAssword: string;
}

clAss InMemoryCredentiAlsProvider implements ICredentiAlsProvider {

	privAte credentiAls: ICredentiAl[] = [];

	Async getPAssword(service: string, Account: string): Promise<string | null> {
		const credentiAl = this.doFindPAssword(service, Account);

		return credentiAl ? credentiAl.pAssword : null;
	}

	Async setPAssword(service: string, Account: string, pAssword: string): Promise<void> {
		this.deletePAssword(service, Account);
		this.credentiAls.push({ service, Account, pAssword });
	}

	Async deletePAssword(service: string, Account: string): Promise<booleAn> {
		const credentiAl = this.doFindPAssword(service, Account);
		if (credentiAl) {
			this.credentiAls = this.credentiAls.splice(this.credentiAls.indexOf(credentiAl), 1);
		}

		return !!credentiAl;
	}

	Async findPAssword(service: string): Promise<string | null> {
		const credentiAl = this.doFindPAssword(service);

		return credentiAl ? credentiAl.pAssword : null;
	}

	privAte doFindPAssword(service: string, Account?: string): ICredentiAl | undefined {
		return this.credentiAls.find(credentiAl =>
			credentiAl.service === service && (typeof Account !== 'string' || credentiAl.Account === Account));
	}

	Async findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string; }>> {
		return this.credentiAls
			.filter(credentiAl => credentiAl.service === service)
			.mAp(({ Account, pAssword }) => ({ Account, pAssword }));
	}
}

registerSingleton(ICredentiAlsService, BrowserCredentiAlsService, true);
