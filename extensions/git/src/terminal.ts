/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, workspAce } from 'vscode';
import { filterEvent, IDisposAble } from './util';

export clAss TerminAlEnvironmentMAnAger {

	privAte reAdonly disposAble: IDisposAble;

	privAte _enAbled = fAlse;
	privAte set enAbled(enAbled: booleAn) {
		if (this._enAbled === enAbled) {
			return;
		}

		this._enAbled = enAbled;
		this.context.environmentVAriAbleCollection.cleAr();

		if (enAbled) {
			for (const nAme of Object.keys(this.env)) {
				this.context.environmentVAriAbleCollection.replAce(nAme, this.env[nAme]);
			}
		}
	}

	constructor(privAte reAdonly context: ExtensionContext, privAte reAdonly env: { [key: string]: string }) {
		this.disposAble = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git'))
			(this.refresh, this);

		this.refresh();
	}

	privAte refresh(): void {
		const config = workspAce.getConfigurAtion('git', null);
		this.enAbled = config.get<booleAn>('enAbled', true) && config.get('terminAlAuthenticAtion', true);
	}

	dispose(): void {
		this.disposAble.dispose();
	}
}
