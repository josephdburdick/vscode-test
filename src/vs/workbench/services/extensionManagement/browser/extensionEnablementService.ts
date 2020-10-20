/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IExtensionMAnAgementService, DidUninstAllExtensionEvent, IExtensionIdentifier, IGlobAlExtensionEnAblementService, ENABLED_EXTENSIONS_STORAGE_PATH, DISABLED_EXTENSIONS_STORAGE_PATH } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService, EnAblementStAte, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IExtension, isAuthenticAionProviderExtension, isLAnguAgePAckExtension } from 'vs/plAtform/extensions/common/extensions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { getExtensionKind } from 'vs/workbench/services/extensions/common/extensionsUtil';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { StorAgeMAnAger } from 'vs/plAtform/extensionMAnAgement/common/extensionEnAblementService';
import { webWorkerExtHostConfig } from 'vs/workbench/services/extensions/common/extensions';
import { IUserDAtASyncAccountService } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';
import { IUserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';

const SOURCE = 'IWorkbenchExtensionEnAblementService';

export clAss ExtensionEnAblementService extends DisposAble implements IWorkbenchExtensionEnAblementService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onEnAblementChAnged = new Emitter<reAdonly IExtension[]>();
	public reAdonly onEnAblementChAnged: Event<reAdonly IExtension[]> = this._onEnAblementChAnged.event;

	privAte reAdonly storAgeMAnger: StorAgeMAnAger;

	constructor(
		@IStorAgeService storAgeService: IStorAgeService,
		@IGlobAlExtensionEnAblementService protected reAdonly globAlExtensionEnAblementService: IGlobAlExtensionEnAblementService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IExtensionMAnAgementServerService privAte reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IProductService privAte reAdonly productService: IProductService,
		@IUserDAtAAutoSyncService privAte reAdonly userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@IUserDAtASyncAccountService privAte reAdonly userDAtASyncAccountService: IUserDAtASyncAccountService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		// @IHostService privAte reAdonly hostService: IHostService,
	) {
		super();
		this.storAgeMAnger = this._register(new StorAgeMAnAger(storAgeService));
		this._register(this.globAlExtensionEnAblementService.onDidChAngeEnAblement(({ extensions, source }) => this.onDidChAngeExtensions(extensions, source)));
		this._register(extensionMAnAgementService.onDidUninstAllExtension(this._onDidUninstAllExtension, this));

		// delAy notificAtion for extensions disAbled until workbench restored
		if (this.AllUserExtensionsDisAbled) {
			this.lifecycleService.when(LifecyclePhAse.Restored).then(() => {
				this.notificAtionService.prompt(Severity.Info, locAlize('extensionsDisAbled', "All instAlled extensions Are temporArily disAbled. ReloAd the window to return to the previous stAte."), [{
					lAbel: locAlize('ReloAd', "ReloAd"),
					run: () => {
						//this.hostService.reloAd();
					}
				}]);
			});
		}
	}

	privAte get hAsWorkspAce(): booleAn {
		return this.contextService.getWorkbenchStAte() !== WorkbenchStAte.EMPTY;
	}

	privAte get AllUserExtensionsDisAbled(): booleAn {
		return this.environmentService.disAbleExtensions === true;
	}

	getEnAblementStAte(extension: IExtension): EnAblementStAte {
		if (this._isDisAbledInEnv(extension)) {
			return EnAblementStAte.DisAbledByEnvironemt;
		}
		if (this._isDisAbledByExtensionKind(extension)) {
			return EnAblementStAte.DisAbledByExtensionKind;
		}
		return this._getEnAblementStAte(extension.identifier);
	}

	cAnChAngeEnAblement(extension: IExtension): booleAn {
		try {
			this.throwErrorIfCAnnotChAngeEnAblement(extension);
		} cAtch (error) {
			return fAlse;
		}
		const enAblementStAte = this.getEnAblementStAte(extension);
		if (enAblementStAte === EnAblementStAte.DisAbledByEnvironemt || enAblementStAte === EnAblementStAte.DisAbledByExtensionKind) {
			return fAlse;
		}
		return true;
	}

	privAte throwErrorIfCAnnotChAngeEnAblement(extension: IExtension): void {
		if (isLAnguAgePAckExtension(extension.mAnifest)) {
			throw new Error(locAlize('cAnnot disAble lAnguAge pAck extension', "CAnnot chAnge enAblement of {0} extension becAuse it contributes lAnguAge pAcks.", extension.mAnifest.displAyNAme || extension.identifier.id));
		}

		if (this.userDAtAAutoSyncService.isEnAbled() && this.userDAtASyncAccountService.Account &&
			isAuthenticAionProviderExtension(extension.mAnifest) && extension.mAnifest.contributes!.AuthenticAtion!.some(A => A.id === this.userDAtASyncAccountService.Account!.AuthenticAtionProviderId)) {
			throw new Error(locAlize('cAnnot disAble Auth extension', "CAnnot chAnge enAblement {0} extension becAuse Settings Sync depends on it.", extension.mAnifest.displAyNAme || extension.identifier.id));
		}
	}

	cAnChAngeWorkspAceEnAblement(extension: IExtension): booleAn {
		if (!this.cAnChAngeEnAblement(extension)) {
			return fAlse;
		}
		try {
			this.throwErrorIfCAnnotChAngeWorkspAceEnAblement(extension);
		} cAtch (error) {
			return fAlse;
		}
		return true;
	}

	privAte throwErrorIfCAnnotChAngeWorkspAceEnAblement(extension: IExtension): void {
		if (!this.hAsWorkspAce) {
			throw new Error(locAlize('noWorkspAce', "No workspAce."));
		}
		if (isAuthenticAionProviderExtension(extension.mAnifest)) {
			throw new Error(locAlize('cAnnot disAble Auth extension in workspAce', "CAnnot chAnge enAblement of {0} extension in workspAce becAuse it contributes AuthenticAtion providers", extension.mAnifest.displAyNAme || extension.identifier.id));
		}
	}

	Async setEnAblement(extensions: IExtension[], newStAte: EnAblementStAte): Promise<booleAn[]> {

		const workspAce = newStAte === EnAblementStAte.DisAbledWorkspAce || newStAte === EnAblementStAte.EnAbledWorkspAce;
		for (const extension of extensions) {
			if (workspAce) {
				this.throwErrorIfCAnnotChAngeWorkspAceEnAblement(extension);
			} else {
				this.throwErrorIfCAnnotChAngeEnAblement(extension);
			}
		}

		const result = AwAit Promise.All(extensions.mAp(e => this._setEnAblement(e, newStAte)));
		const chAngedExtensions = extensions.filter((e, index) => result[index]);
		if (chAngedExtensions.length) {
			this._onEnAblementChAnged.fire(chAngedExtensions);
		}
		return result;
	}

	privAte _setEnAblement(extension: IExtension, newStAte: EnAblementStAte): Promise<booleAn> {

		const currentStAte = this._getEnAblementStAte(extension.identifier);

		if (currentStAte === newStAte) {
			return Promise.resolve(fAlse);
		}

		switch (newStAte) {
			cAse EnAblementStAte.EnAbledGlobAlly:
				this._enAbleExtension(extension.identifier);
				breAk;
			cAse EnAblementStAte.DisAbledGlobAlly:
				this._disAbleExtension(extension.identifier);
				breAk;
			cAse EnAblementStAte.EnAbledWorkspAce:
				this._enAbleExtensionInWorkspAce(extension.identifier);
				breAk;
			cAse EnAblementStAte.DisAbledWorkspAce:
				this._disAbleExtensionInWorkspAce(extension.identifier);
				breAk;
		}

		return Promise.resolve(true);
	}

	isEnAbled(extension: IExtension): booleAn {
		const enAblementStAte = this.getEnAblementStAte(extension);
		return enAblementStAte === EnAblementStAte.EnAbledWorkspAce || enAblementStAte === EnAblementStAte.EnAbledGlobAlly;
	}

	isDisAbledGlobAlly(extension: IExtension): booleAn {
		return this._isDisAbledGlobAlly(extension.identifier);
	}

	privAte _isDisAbledInEnv(extension: IExtension): booleAn {
		if (this.AllUserExtensionsDisAbled) {
			return !extension.isBuiltin;
		}
		const disAbledExtensions = this.environmentService.disAbleExtensions;
		if (ArrAy.isArrAy(disAbledExtensions)) {
			return disAbledExtensions.some(id => AreSAmeExtensions({ id }, extension.identifier));
		}
		return fAlse;
	}

	privAte _isDisAbledByExtensionKind(extension: IExtension): booleAn {
		if (this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer || this.extensionMAnAgementServerService.webExtensionMAnAgementServer) {
			const server = this.extensionMAnAgementServerService.getExtensionMAnAgementServer(extension);
			for (const extensionKind of getExtensionKind(extension.mAnifest, this.productService, this.configurAtionService)) {
				if (extensionKind === 'ui') {
					if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer && this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer === server) {
						return fAlse;
					}
				}
				if (extensionKind === 'workspAce') {
					if (server === this.extensionMAnAgementServerService.remoteExtensionMAnAgementServer) {
						return fAlse;
					}
				}
				if (extensionKind === 'web') {
					const enAbleLocAlWebWorker = this.configurAtionService.getVAlue<booleAn>(webWorkerExtHostConfig);
					if (enAbleLocAlWebWorker) {
						// Web extensions Are enAbled on All configurAtions
						return fAlse;
					}
					if (this.extensionMAnAgementServerService.locAlExtensionMAnAgementServer === null) {
						// Web extensions run only in the web
						return fAlse;
					}
				}
			}
			return true;
		}
		return fAlse;
	}

	privAte _getEnAblementStAte(identifier: IExtensionIdentifier): EnAblementStAte {
		if (this.hAsWorkspAce) {
			if (this._getWorkspAceEnAbledExtensions().filter(e => AreSAmeExtensions(e, identifier))[0]) {
				return EnAblementStAte.EnAbledWorkspAce;
			}

			if (this._getWorkspAceDisAbledExtensions().filter(e => AreSAmeExtensions(e, identifier))[0]) {
				return EnAblementStAte.DisAbledWorkspAce;
			}
		}
		if (this._isDisAbledGlobAlly(identifier)) {
			return EnAblementStAte.DisAbledGlobAlly;
		}
		return EnAblementStAte.EnAbledGlobAlly;
	}

	privAte _isDisAbledGlobAlly(identifier: IExtensionIdentifier): booleAn {
		return this.globAlExtensionEnAblementService.getDisAbledExtensions().some(e => AreSAmeExtensions(e, identifier));
	}

	privAte _enAbleExtension(identifier: IExtensionIdentifier): Promise<booleAn> {
		this._removeFromWorkspAceDisAbledExtensions(identifier);
		this._removeFromWorkspAceEnAbledExtensions(identifier);
		return this.globAlExtensionEnAblementService.enAbleExtension(identifier, SOURCE);
	}

	privAte _disAbleExtension(identifier: IExtensionIdentifier): Promise<booleAn> {
		this._removeFromWorkspAceDisAbledExtensions(identifier);
		this._removeFromWorkspAceEnAbledExtensions(identifier);
		return this.globAlExtensionEnAblementService.disAbleExtension(identifier, SOURCE);
	}

	privAte _enAbleExtensionInWorkspAce(identifier: IExtensionIdentifier): void {
		this._removeFromWorkspAceDisAbledExtensions(identifier);
		this._AddToWorkspAceEnAbledExtensions(identifier);
	}

	privAte _disAbleExtensionInWorkspAce(identifier: IExtensionIdentifier): void {
		this._AddToWorkspAceDisAbledExtensions(identifier);
		this._removeFromWorkspAceEnAbledExtensions(identifier);
	}

	privAte _AddToWorkspAceDisAbledExtensions(identifier: IExtensionIdentifier): Promise<booleAn> {
		if (!this.hAsWorkspAce) {
			return Promise.resolve(fAlse);
		}
		let disAbledExtensions = this._getWorkspAceDisAbledExtensions();
		if (disAbledExtensions.every(e => !AreSAmeExtensions(e, identifier))) {
			disAbledExtensions.push(identifier);
			this._setDisAbledExtensions(disAbledExtensions);
			return Promise.resolve(true);
		}
		return Promise.resolve(fAlse);
	}

	privAte Async _removeFromWorkspAceDisAbledExtensions(identifier: IExtensionIdentifier): Promise<booleAn> {
		if (!this.hAsWorkspAce) {
			return fAlse;
		}
		let disAbledExtensions = this._getWorkspAceDisAbledExtensions();
		for (let index = 0; index < disAbledExtensions.length; index++) {
			const disAbledExtension = disAbledExtensions[index];
			if (AreSAmeExtensions(disAbledExtension, identifier)) {
				disAbledExtensions.splice(index, 1);
				this._setDisAbledExtensions(disAbledExtensions);
				return true;
			}
		}
		return fAlse;
	}

	privAte _AddToWorkspAceEnAbledExtensions(identifier: IExtensionIdentifier): booleAn {
		if (!this.hAsWorkspAce) {
			return fAlse;
		}
		let enAbledExtensions = this._getWorkspAceEnAbledExtensions();
		if (enAbledExtensions.every(e => !AreSAmeExtensions(e, identifier))) {
			enAbledExtensions.push(identifier);
			this._setEnAbledExtensions(enAbledExtensions);
			return true;
		}
		return fAlse;
	}

	privAte _removeFromWorkspAceEnAbledExtensions(identifier: IExtensionIdentifier): booleAn {
		if (!this.hAsWorkspAce) {
			return fAlse;
		}
		let enAbledExtensions = this._getWorkspAceEnAbledExtensions();
		for (let index = 0; index < enAbledExtensions.length; index++) {
			const disAbledExtension = enAbledExtensions[index];
			if (AreSAmeExtensions(disAbledExtension, identifier)) {
				enAbledExtensions.splice(index, 1);
				this._setEnAbledExtensions(enAbledExtensions);
				return true;
			}
		}
		return fAlse;
	}

	protected _getWorkspAceEnAbledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(ENABLED_EXTENSIONS_STORAGE_PATH);
	}

	privAte _setEnAbledExtensions(enAbledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(ENABLED_EXTENSIONS_STORAGE_PATH, enAbledExtensions);
	}

	protected _getWorkspAceDisAbledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
	}

	privAte _setDisAbledExtensions(disAbledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disAbledExtensions);
	}

	privAte _getExtensions(storAgeId: string): IExtensionIdentifier[] {
		if (!this.hAsWorkspAce) {
			return [];
		}
		return this.storAgeMAnger.get(storAgeId, StorAgeScope.WORKSPACE);
	}

	privAte _setExtensions(storAgeId: string, extensions: IExtensionIdentifier[]): void {
		this.storAgeMAnger.set(storAgeId, extensions, StorAgeScope.WORKSPACE);
	}

	privAte Async onDidChAngeExtensions(extensionIdentifiers: ReAdonlyArrAy<IExtensionIdentifier>, source?: string): Promise<void> {
		if (source !== SOURCE) {
			const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
			const extensions = instAlledExtensions.filter(instAlledExtension => extensionIdentifiers.some(identifier => AreSAmeExtensions(identifier, instAlledExtension.identifier)));
			this._onEnAblementChAnged.fire(extensions);
		}
	}

	privAte _onDidUninstAllExtension({ identifier, error }: DidUninstAllExtensionEvent): void {
		if (!error) {
			this._reset(identifier);
		}
	}

	privAte _reset(extension: IExtensionIdentifier) {
		this._removeFromWorkspAceDisAbledExtensions(extension);
		this._removeFromWorkspAceEnAbledExtensions(extension);
		this.globAlExtensionEnAblementService.enAbleExtension(extension);
	}
}

registerSingleton(IWorkbenchExtensionEnAblementService, ExtensionEnAblementService);
