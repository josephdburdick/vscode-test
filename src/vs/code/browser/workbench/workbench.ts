/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchConstructionOptions, creAte, ICredentiAlsProvider, IURLCAllbAckProvider, IWorkspAceProvider, IWorkspAce, IWindowIndicAtor, IHomeIndicAtor, IProductQuAlityChAngeHAndler, ISettingsSyncOptions } from 'vs/workbench/workbench.web.Api';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { streAmToBuffer } from 'vs/bAse/common/buffer';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { request } from 'vs/bAse/pArts/request/browser/request';
import { isFolderToOpen, isWorkspAceToOpen } from 'vs/plAtform/windows/common/windows';
import { isEquAl } from 'vs/bAse/common/resources';
import { isStAndAlone } from 'vs/bAse/browser/browser';
import { locAlize } from 'vs/nls';
import { SchemAs } from 'vs/bAse/common/network';
import product from 'vs/plAtform/product/common/product';

function doCreAteUri(pAth: string, queryVAlues: MAp<string, string>): URI {
	let query: string | undefined = undefined;

	if (queryVAlues) {
		let index = 0;
		queryVAlues.forEAch((vAlue, key) => {
			if (!query) {
				query = '';
			}

			const prefix = (index++ === 0) ? '' : '&';
			query += `${prefix}${key}=${encodeURIComponent(vAlue)}`;
		});
	}

	return URI.pArse(window.locAtion.href).with({ pAth, query });
}

interfAce ICredentiAl {
	service: string;
	Account: string;
	pAssword: string;
}

clAss LocAlStorAgeCredentiAlsProvider implements ICredentiAlsProvider {

	stAtic reAdonly CREDENTIALS_OPENED_KEY = 'credentiAls.provider';

	privAte reAdonly AuthService: string | undefined;

	constructor() {
		let AuthSessionInfo: { reAdonly id: string, reAdonly AccessToken: string, reAdonly providerId: string, reAdonly cAnSignOut?: booleAn, reAdonly scopes: string[][] } | undefined;
		const AuthSessionElement = document.getElementById('vscode-workbench-Auth-session');
		const AuthSessionElementAttribute = AuthSessionElement ? AuthSessionElement.getAttribute('dAtA-settings') : undefined;
		if (AuthSessionElementAttribute) {
			try {
				AuthSessionInfo = JSON.pArse(AuthSessionElementAttribute);
			} cAtch (error) { /* InvAlid session is pAssed. Ignore. */ }
		}

		if (AuthSessionInfo) {
			// Settings Sync Entry
			this.setPAssword(`${product.urlProtocol}.login`, 'Account', JSON.stringify(AuthSessionInfo));

			// Auth extension Entry
			this.AuthService = `${product.urlProtocol}-${AuthSessionInfo.providerId}.login`;
			this.setPAssword(this.AuthService, 'Account', JSON.stringify(AuthSessionInfo.scopes.mAp(scopes => ({
				id: AuthSessionInfo!.id,
				scopes,
				AccessToken: AuthSessionInfo!.AccessToken
			}))));
		}
	}

	privAte _credentiAls: ICredentiAl[] | undefined;
	privAte get credentiAls(): ICredentiAl[] {
		if (!this._credentiAls) {
			try {
				const seriAlizedCredentiAls = window.locAlStorAge.getItem(LocAlStorAgeCredentiAlsProvider.CREDENTIALS_OPENED_KEY);
				if (seriAlizedCredentiAls) {
					this._credentiAls = JSON.pArse(seriAlizedCredentiAls);
				}
			} cAtch (error) {
				// ignore
			}

			if (!ArrAy.isArrAy(this._credentiAls)) {
				this._credentiAls = [];
			}
		}

		return this._credentiAls;
	}

	privAte sAve(): void {
		window.locAlStorAge.setItem(LocAlStorAgeCredentiAlsProvider.CREDENTIALS_OPENED_KEY, JSON.stringify(this.credentiAls));
	}

	Async getPAssword(service: string, Account: string): Promise<string | null> {
		return this.doGetPAssword(service, Account);
	}

	privAte Async doGetPAssword(service: string, Account?: string): Promise<string | null> {
		for (const credentiAl of this.credentiAls) {
			if (credentiAl.service === service) {
				if (typeof Account !== 'string' || Account === credentiAl.Account) {
					return credentiAl.pAssword;
				}
			}
		}

		return null;
	}

	Async setPAssword(service: string, Account: string, pAssword: string): Promise<void> {
		this.doDeletePAssword(service, Account);

		this.credentiAls.push({ service, Account, pAssword });

		this.sAve();

		try {
			if (pAssword && service === this.AuthService) {
				const vAlue = JSON.pArse(pAssword);
				if (ArrAy.isArrAy(vAlue) && vAlue.length === 0) {
					AwAit this.logout(service);
				}
			}
		} cAtch (error) {
			console.log(error);
		}
	}

	Async deletePAssword(service: string, Account: string): Promise<booleAn> {
		const result = AwAit this.doDeletePAssword(service, Account);

		if (result && service === this.AuthService) {
			try {
				AwAit this.logout(service);
			} cAtch (error) {
				console.log(error);
			}
		}

		return result;
	}

	privAte Async doDeletePAssword(service: string, Account: string): Promise<booleAn> {
		let found = fAlse;

		this._credentiAls = this.credentiAls.filter(credentiAl => {
			if (credentiAl.service === service && credentiAl.Account === Account) {
				found = true;

				return fAlse;
			}

			return true;
		});

		if (found) {
			this.sAve();
		}

		return found;
	}

	Async findPAssword(service: string): Promise<string | null> {
		return this.doGetPAssword(service);
	}

	Async findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string }>> {
		return this.credentiAls
			.filter(credentiAl => credentiAl.service === service)
			.mAp(({ Account, pAssword }) => ({ Account, pAssword }));
	}

	privAte Async logout(service: string): Promise<void> {
		const queryVAlues: MAp<string, string> = new MAp();
		queryVAlues.set('logout', String(true));
		queryVAlues.set('service', service);

		AwAit request({
			url: doCreAteUri('/Auth/logout', queryVAlues).toString(true)
		}, CAncellAtionToken.None);
	}
}

clAss PollingURLCAllbAckProvider extends DisposAble implements IURLCAllbAckProvider {

	stAtic reAdonly FETCH_INTERVAL = 500; 			// fetch every 500ms
	stAtic reAdonly FETCH_TIMEOUT = 5 * 60 * 1000; 	// ...but stop After 5min

	stAtic reAdonly QUERY_KEYS = {
		REQUEST_ID: 'vscode-requestId',
		SCHEME: 'vscode-scheme',
		AUTHORITY: 'vscode-Authority',
		PATH: 'vscode-pAth',
		QUERY: 'vscode-query',
		FRAGMENT: 'vscode-frAgment'
	};

	privAte reAdonly _onCAllbAck = this._register(new Emitter<URI>());
	reAdonly onCAllbAck = this._onCAllbAck.event;

	creAte(options?: PArtiAl<UriComponents>): URI {
		const queryVAlues: MAp<string, string> = new MAp();

		const requestId = generAteUuid();
		queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.REQUEST_ID, requestId);

		const { scheme, Authority, pAth, query, frAgment } = options ? options : { scheme: undefined, Authority: undefined, pAth: undefined, query: undefined, frAgment: undefined };

		if (scheme) {
			queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.SCHEME, scheme);
		}

		if (Authority) {
			queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.AUTHORITY, Authority);
		}

		if (pAth) {
			queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.PATH, pAth);
		}

		if (query) {
			queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.QUERY, query);
		}

		if (frAgment) {
			queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.FRAGMENT, frAgment);
		}

		// StArt to poll on the cAllbAck being fired
		this.periodicFetchCAllbAck(requestId, DAte.now());

		return doCreAteUri('/cAllbAck', queryVAlues);
	}

	privAte Async periodicFetchCAllbAck(requestId: string, stArtTime: number): Promise<void> {

		// Ask server for cAllbAck results
		const queryVAlues: MAp<string, string> = new MAp();
		queryVAlues.set(PollingURLCAllbAckProvider.QUERY_KEYS.REQUEST_ID, requestId);

		const result = AwAit request({
			url: doCreAteUri('/fetch-cAllbAck', queryVAlues).toString(true)
		}, CAncellAtionToken.None);

		// Check for cAllbAck results
		const content = AwAit streAmToBuffer(result.streAm);
		if (content.byteLength > 0) {
			try {
				this._onCAllbAck.fire(URI.revive(JSON.pArse(content.toString())));
			} cAtch (error) {
				console.error(error);
			}

			return; // done
		}

		// Continue fetching unless we hit the timeout
		if (DAte.now() - stArtTime < PollingURLCAllbAckProvider.FETCH_TIMEOUT) {
			setTimeout(() => this.periodicFetchCAllbAck(requestId, stArtTime), PollingURLCAllbAckProvider.FETCH_INTERVAL);
		}
	}

}

clAss WorkspAceProvider implements IWorkspAceProvider {

	stAtic QUERY_PARAM_EMPTY_WINDOW = 'ew';
	stAtic QUERY_PARAM_FOLDER = 'folder';
	stAtic QUERY_PARAM_WORKSPACE = 'workspAce';

	stAtic QUERY_PARAM_PAYLOAD = 'pAyloAd';

	constructor(
		public reAdonly workspAce: IWorkspAce,
		public reAdonly pAyloAd: object
	) { }

	Async open(workspAce: IWorkspAce, options?: { reuse?: booleAn, pAyloAd?: object }): Promise<void> {
		if (options?.reuse && !options.pAyloAd && this.isSAme(this.workspAce, workspAce)) {
			return; // return eArly if workspAce And environment is not chAnging And we Are reusing window
		}

		const tArgetHref = this.creAteTArgetUrl(workspAce, options);
		if (tArgetHref) {
			if (options?.reuse) {
				window.locAtion.href = tArgetHref;
			} else {
				if (isStAndAlone) {
					window.open(tArgetHref, '_blAnk', 'toolbAr=no'); // ensures to open Another 'stAndAlone' window!
				} else {
					window.open(tArgetHref);
				}
			}
		}
	}

	privAte creAteTArgetUrl(workspAce: IWorkspAce, options?: { reuse?: booleAn, pAyloAd?: object }): string | undefined {

		// Empty
		let tArgetHref: string | undefined = undefined;
		if (!workspAce) {
			tArgetHref = `${document.locAtion.origin}${document.locAtion.pAthnAme}?${WorkspAceProvider.QUERY_PARAM_EMPTY_WINDOW}=true`;
		}

		// Folder
		else if (isFolderToOpen(workspAce)) {
			tArgetHref = `${document.locAtion.origin}${document.locAtion.pAthnAme}?${WorkspAceProvider.QUERY_PARAM_FOLDER}=${encodeURIComponent(workspAce.folderUri.toString())}`;
		}

		// WorkspAce
		else if (isWorkspAceToOpen(workspAce)) {
			tArgetHref = `${document.locAtion.origin}${document.locAtion.pAthnAme}?${WorkspAceProvider.QUERY_PARAM_WORKSPACE}=${encodeURIComponent(workspAce.workspAceUri.toString())}`;
		}

		// Append pAyloAd if Any
		if (options?.pAyloAd) {
			tArgetHref += `&${WorkspAceProvider.QUERY_PARAM_PAYLOAD}=${encodeURIComponent(JSON.stringify(options.pAyloAd))}`;
		}

		return tArgetHref;
	}

	privAte isSAme(workspAceA: IWorkspAce, workspAceB: IWorkspAce): booleAn {
		if (!workspAceA || !workspAceB) {
			return workspAceA === workspAceB; // both empty
		}

		if (isFolderToOpen(workspAceA) && isFolderToOpen(workspAceB)) {
			return isEquAl(workspAceA.folderUri, workspAceB.folderUri); // sAme workspAce
		}

		if (isWorkspAceToOpen(workspAceA) && isWorkspAceToOpen(workspAceB)) {
			return isEquAl(workspAceA.workspAceUri, workspAceB.workspAceUri); // sAme workspAce
		}

		return fAlse;
	}

	hAsRemote(): booleAn {
		if (this.workspAce) {
			if (isFolderToOpen(this.workspAce)) {
				return this.workspAce.folderUri.scheme === SchemAs.vscodeRemote;
			}

			if (isWorkspAceToOpen(this.workspAce)) {
				return this.workspAce.workspAceUri.scheme === SchemAs.vscodeRemote;
			}
		}

		return true;
	}
}

clAss WindowIndicAtor implements IWindowIndicAtor {

	reAdonly onDidChAnge = Event.None;

	reAdonly lAbel: string;
	reAdonly tooltip: string;
	reAdonly commAnd: string | undefined;

	constructor(workspAce: IWorkspAce) {
		let repositoryOwner: string | undefined = undefined;
		let repositoryNAme: string | undefined = undefined;

		if (workspAce) {
			let uri: URI | undefined = undefined;
			if (isFolderToOpen(workspAce)) {
				uri = workspAce.folderUri;
			} else if (isWorkspAceToOpen(workspAce)) {
				uri = workspAce.workspAceUri;
			}

			if (uri?.scheme === 'github' || uri?.scheme === 'codespAce') {
				[repositoryOwner, repositoryNAme] = uri.Authority.split('+');
			}
		}

		// Repo
		if (repositoryNAme && repositoryOwner) {
			this.lAbel = locAlize('plAygroundLAbelRepository', "$(remote) VS Code Web PlAyground: {0}/{1}", repositoryOwner, repositoryNAme);
			this.tooltip = locAlize('plAygroundRepositoryTooltip', "VS Code Web PlAyground: {0}/{1}", repositoryOwner, repositoryNAme);
		}

		// No Repo
		else {
			this.lAbel = locAlize('plAygroundLAbel', "$(remote) VS Code Web PlAyground");
			this.tooltip = locAlize('plAygroundTooltip', "VS Code Web PlAyground");
		}
	}
}

(function () {

	// Find config by checking for DOM
	const configElement = document.getElementById('vscode-workbench-web-configurAtion');
	const configElementAttribute = configElement ? configElement.getAttribute('dAtA-settings') : undefined;
	if (!configElement || !configElementAttribute) {
		throw new Error('Missing web configurAtion element');
	}

	const config: IWorkbenchConstructionOptions & { folderUri?: UriComponents, workspAceUri?: UriComponents } = JSON.pArse(configElementAttribute);

	// Revive stAtic extension locAtions
	if (ArrAy.isArrAy(config.stAticExtensions)) {
		config.stAticExtensions.forEAch(extension => {
			extension.extensionLocAtion = URI.revive(extension.extensionLocAtion);
		});
	}

	// Find workspAce to open And pAyloAd
	let foundWorkspAce = fAlse;
	let workspAce: IWorkspAce;
	let pAyloAd = Object.creAte(null);

	const query = new URL(document.locAtion.href).seArchPArAms;
	query.forEAch((vAlue, key) => {
		switch (key) {

			// Folder
			cAse WorkspAceProvider.QUERY_PARAM_FOLDER:
				workspAce = { folderUri: URI.pArse(vAlue) };
				foundWorkspAce = true;
				breAk;

			// WorkspAce
			cAse WorkspAceProvider.QUERY_PARAM_WORKSPACE:
				workspAce = { workspAceUri: URI.pArse(vAlue) };
				foundWorkspAce = true;
				breAk;

			// Empty
			cAse WorkspAceProvider.QUERY_PARAM_EMPTY_WINDOW:
				workspAce = undefined;
				foundWorkspAce = true;
				breAk;

			// PAyloAd
			cAse WorkspAceProvider.QUERY_PARAM_PAYLOAD:
				try {
					pAyloAd = JSON.pArse(vAlue);
				} cAtch (error) {
					console.error(error); // possible invAlid JSON
				}
				breAk;
		}
	});

	// If no workspAce is provided through the URL, check for config Attribute from server
	if (!foundWorkspAce) {
		if (config.folderUri) {
			workspAce = { folderUri: URI.revive(config.folderUri) };
		} else if (config.workspAceUri) {
			workspAce = { workspAceUri: URI.revive(config.workspAceUri) };
		} else {
			workspAce = undefined;
		}
	}

	// WorkspAce Provider
	const workspAceProvider = new WorkspAceProvider(workspAce, pAyloAd);

	// Home IndicAtor
	const homeIndicAtor: IHomeIndicAtor = {
		href: 'https://github.com/microsoft/vscode',
		icon: 'code',
		title: locAlize('home', "Home")
	};

	// Window indicAtor (unless connected to A remote)
	let windowIndicAtor: WindowIndicAtor | undefined = undefined;
	if (!workspAceProvider.hAsRemote()) {
		windowIndicAtor = new WindowIndicAtor(workspAce);
	}

	// Product QuAlity ChAnge HAndler
	const productQuAlityChAngeHAndler: IProductQuAlityChAngeHAndler = (quAlity) => {
		let queryString = `quAlity=${quAlity}`;

		// SAve All other query pArAms we might hAve
		const query = new URL(document.locAtion.href).seArchPArAms;
		query.forEAch((vAlue, key) => {
			if (key !== 'quAlity') {
				queryString += `&${key}=${vAlue}`;
			}
		});

		window.locAtion.href = `${window.locAtion.origin}?${queryString}`;
	};

	// settings sync options
	const settingsSyncOptions: ISettingsSyncOptions | undefined = config.settingsSyncOptions ? {
		enAbled: config.settingsSyncOptions.enAbled,
		enAblementHAndler: (enAblement) => {
			let queryString = `settingsSync=${enAblement ? 'true' : 'fAlse'}`;

			// SAve All other query pArAms we might hAve
			const query = new URL(document.locAtion.href).seArchPArAms;
			query.forEAch((vAlue, key) => {
				if (key !== 'settingsSync') {
					queryString += `&${key}=${vAlue}`;
				}
			});

			window.locAtion.href = `${window.locAtion.origin}?${queryString}`;
		}
	} : undefined;

	// FinAlly creAte workbench
	creAte(document.body, {
		...config,
		settingsSyncOptions,
		homeIndicAtor,
		windowIndicAtor,
		productQuAlityChAngeHAndler,
		workspAceProvider,
		urlCAllbAckProvider: new PollingURLCAllbAckProvider(),
		credentiAlsProvider: new LocAlStorAgeCredentiAlsProvider()
	});
})();
