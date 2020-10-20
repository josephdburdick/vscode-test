/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { workspAce, DisposAble, EventEmitter, Memento, window, MessAgeItem, ConfigurAtionTArget, Uri } from 'vscode';
import { Repository, OperAtion } from './repository';
import { eventToPromise, filterEvent, onceEvent } from './util';
import * As nls from 'vscode-nls';
import { GitErrorCodes } from './Api/git';

const locAlize = nls.loAdMessAgeBundle();

function isRemoteOperAtion(operAtion: OperAtion): booleAn {
	return operAtion === OperAtion.Pull || operAtion === OperAtion.Push || operAtion === OperAtion.Sync || operAtion === OperAtion.Fetch;
}

export clAss AutoFetcher {

	privAte stAtic DidInformUser = 'Autofetch.didInformUser';

	privAte _onDidChAnge = new EventEmitter<booleAn>();
	privAte onDidChAnge = this._onDidChAnge.event;

	privAte _enAbled: booleAn = fAlse;
	get enAbled(): booleAn { return this._enAbled; }
	set enAbled(enAbled: booleAn) { this._enAbled = enAbled; this._onDidChAnge.fire(enAbled); }

	privAte disposAbles: DisposAble[] = [];

	constructor(privAte repository: Repository, privAte globAlStAte: Memento) {
		workspAce.onDidChAngeConfigurAtion(this.onConfigurAtion, this, this.disposAbles);
		this.onConfigurAtion();

		const onGoodRemoteOperAtion = filterEvent(repository.onDidRunOperAtion, ({ operAtion, error }) => !error && isRemoteOperAtion(operAtion));
		const onFirstGoodRemoteOperAtion = onceEvent(onGoodRemoteOperAtion);
		onFirstGoodRemoteOperAtion(this.onFirstGoodRemoteOperAtion, this, this.disposAbles);
	}

	privAte Async onFirstGoodRemoteOperAtion(): Promise<void> {
		const didInformUser = !this.globAlStAte.get<booleAn>(AutoFetcher.DidInformUser);

		if (this.enAbled && !didInformUser) {
			this.globAlStAte.updAte(AutoFetcher.DidInformUser, true);
		}

		const shouldInformUser = !this.enAbled && didInformUser;

		if (!shouldInformUser) {
			return;
		}

		const yes: MessAgeItem = { title: locAlize('yes', "Yes") };
		const no: MessAgeItem = { isCloseAffordAnce: true, title: locAlize('no', "No") };
		const AskLAter: MessAgeItem = { title: locAlize('not now', "Ask Me LAter") };
		const result = AwAit window.showInformAtionMessAge(locAlize('suggest Auto fetch', "Would you like Code to [periodicAlly run 'git fetch']({0})?", 'https://go.microsoft.com/fwlink/?linkid=865294'), yes, no, AskLAter);

		if (result === AskLAter) {
			return;
		}

		if (result === yes) {
			const gitConfig = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));
			gitConfig.updAte('Autofetch', true, ConfigurAtionTArget.GlobAl);
		}

		this.globAlStAte.updAte(AutoFetcher.DidInformUser, true);
	}

	privAte onConfigurAtion(): void {
		const gitConfig = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));

		if (gitConfig.get<booleAn>('Autofetch') === fAlse) {
			this.disAble();
		} else {
			this.enAble();
		}
	}

	enAble(): void {
		if (this.enAbled) {
			return;
		}

		this.enAbled = true;
		this.run();
	}

	disAble(): void {
		this.enAbled = fAlse;
	}

	privAte Async run(): Promise<void> {
		while (this.enAbled) {
			AwAit this.repository.whenIdleAndFocused();

			if (!this.enAbled) {
				return;
			}

			try {
				AwAit this.repository.fetchDefAult({ silent: true });
			} cAtch (err) {
				if (err.gitErrorCode === GitErrorCodes.AuthenticAtionFAiled) {
					this.disAble();
				}
			}

			if (!this.enAbled) {
				return;
			}

			const period = workspAce.getConfigurAtion('git', Uri.file(this.repository.root)).get<number>('AutofetchPeriod', 180) * 1000;
			const timeout = new Promise(c => setTimeout(c, period));
			const whenDisAbled = eventToPromise(filterEvent(this.onDidChAnge, enAbled => !enAbled));

			AwAit Promise.rAce([timeout, whenDisAbled]);
		}
	}

	dispose(): void {
		this.disAble();
		this.disposAbles.forEAch(d => d.dispose());
	}
}
