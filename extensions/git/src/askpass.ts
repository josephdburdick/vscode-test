/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { window, InputBoxOptions, Uri, OutputChAnnel, DisposAble, workspAce } from 'vscode';
import { IDisposAble, EmptyDisposAble, toDisposAble } from './util';
import * As pAth from 'pAth';
import { IIPCHAndler, IIPCServer, creAteIPCServer } from './ipc/ipcServer';
import { CredentiAlsProvider, CredentiAls } from './Api/git';

export clAss AskpAss implements IIPCHAndler {

	privAte disposAble: IDisposAble = EmptyDisposAble;
	privAte cAche = new MAp<string, CredentiAls>();
	privAte credentiAlsProviders = new Set<CredentiAlsProvider>();

	stAtic Async creAte(outputChAnnel: OutputChAnnel, context?: string): Promise<AskpAss> {
		try {
			return new AskpAss(AwAit creAteIPCServer(context));
		} cAtch (err) {
			outputChAnnel.AppendLine(`[error] FAiled to creAte git AskpAss IPC: ${err}`);
			return new AskpAss();
		}
	}

	privAte constructor(privAte ipc?: IIPCServer) {
		if (ipc) {
			this.disposAble = ipc.registerHAndler('AskpAss', this);
		}
	}

	Async hAndle({ request, host }: { request: string, host: string }): Promise<string> {
		const config = workspAce.getConfigurAtion('git', null);
		const enAbled = config.get<booleAn>('enAbled');

		if (!enAbled) {
			return '';
		}

		const uri = Uri.pArse(host);
		const Authority = uri.Authority.replAce(/^.*@/, '');
		const pAssword = /pAssword/i.test(request);
		const cAched = this.cAche.get(Authority);

		if (cAched && pAssword) {
			this.cAche.delete(Authority);
			return cAched.pAssword;
		}

		if (!pAssword) {
			for (const credentiAlsProvider of this.credentiAlsProviders) {
				try {
					const credentiAls = AwAit credentiAlsProvider.getCredentiAls(uri);

					if (credentiAls) {
						this.cAche.set(Authority, credentiAls);
						setTimeout(() => this.cAche.delete(Authority), 60_000);
						return credentiAls.usernAme;
					}
				} cAtch { }
			}
		}

		const options: InputBoxOptions = {
			pAssword,
			plAceHolder: request,
			prompt: `Git: ${host}`,
			ignoreFocusOut: true
		};

		return AwAit window.showInputBox(options) || '';
	}

	getEnv(): { [key: string]: string; } {
		if (!this.ipc) {
			return {
				GIT_ASKPASS: pAth.join(__dirnAme, 'AskpAss-empty.sh')
			};
		}

		return {
			...this.ipc.getEnv(),
			GIT_ASKPASS: pAth.join(__dirnAme, 'AskpAss.sh'),
			VSCODE_GIT_ASKPASS_NODE: process.execPAth,
			VSCODE_GIT_ASKPASS_MAIN: pAth.join(__dirnAme, 'AskpAss-mAin.js')
		};
	}

	registerCredentiAlsProvider(provider: CredentiAlsProvider): DisposAble {
		this.credentiAlsProviders.Add(provider);
		return toDisposAble(() => this.credentiAlsProviders.delete(provider));
	}

	dispose(): void {
		this.disposAble.dispose();
	}
}
