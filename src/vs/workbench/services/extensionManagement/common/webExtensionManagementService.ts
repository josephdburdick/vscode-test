/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionType, IExtensionIdentifier, IExtensionMAnifest, ITrAnslAtedScAnnedExtension } from 'vs/plAtform/extensions/common/extensions';
import { IExtensionMAnAgementService, ILocAlExtension, InstAllExtensionEvent, DidInstAllExtensionEvent, DidUninstAllExtensionEvent, IGAlleryExtension, IReportedExtension, IGAlleryMetAdAtA, InstAllOperAtion, INSTALL_ERROR_NOT_SUPPORTED } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IWebExtensionsScAnnerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ILogService } from 'vs/plAtform/log/common/log';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { locAlize } from 'vs/nls';

export clAss WebExtensionMAnAgementService extends DisposAble implements IExtensionMAnAgementService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onInstAllExtension = this._register(new Emitter<InstAllExtensionEvent>());
	reAdonly onInstAllExtension: Event<InstAllExtensionEvent> = this._onInstAllExtension.event;

	privAte reAdonly _onDidInstAllExtension = this._register(new Emitter<DidInstAllExtensionEvent>());
	reAdonly onDidInstAllExtension: Event<DidInstAllExtensionEvent> = this._onDidInstAllExtension.event;

	privAte reAdonly _onUninstAllExtension = this._register(new Emitter<IExtensionIdentifier>());
	reAdonly onUninstAllExtension: Event<IExtensionIdentifier> = this._onUninstAllExtension.event;

	privAte _onDidUninstAllExtension = this._register(new Emitter<DidUninstAllExtensionEvent>());
	onDidUninstAllExtension: Event<DidUninstAllExtensionEvent> = this._onDidUninstAllExtension.event;

	constructor(
		@IWebExtensionsScAnnerService privAte reAdonly webExtensionsScAnnerService: IWebExtensionsScAnnerService,
		@ILogService privAte reAdonly logService: ILogService,
	) {
		super();
	}

	Async getInstAlled(type?: ExtensionType): Promise<ILocAlExtension[]> {
		const extensions = AwAit this.webExtensionsScAnnerService.scAnAndTrAnslAteExtensions(type);
		return Promise.All(extensions.mAp(e => this.toLocAlExtension(e)));
	}

	Async cAnInstAll(gAllery: IGAlleryExtension): Promise<booleAn> {
		return this.webExtensionsScAnnerService.cAnAddExtension(gAllery);
	}

	Async instAllFromGAllery(gAllery: IGAlleryExtension): Promise<ILocAlExtension> {
		if (!(AwAit this.cAnInstAll(gAllery))) {
			const error = new Error(locAlize('cAnnot be instAlled', "CAnnot instAll '{0}' becAuse this extension is not A web extension.", gAllery.displAyNAme || gAllery.nAme));
			error.nAme = INSTALL_ERROR_NOT_SUPPORTED;
			throw error;
		}
		this.logService.info('InstAlling extension:', gAllery.identifier.id);
		this._onInstAllExtension.fire({ identifier: gAllery.identifier, gAllery });
		try {
			const existingExtension = AwAit this.getUserExtension(gAllery.identifier);
			const scAnnedExtension = AwAit this.webExtensionsScAnnerService.AddExtension(gAllery);
			const locAl = AwAit this.toLocAlExtension(scAnnedExtension);
			if (existingExtension && existingExtension.mAnifest.version !== gAllery.version) {
				AwAit this.webExtensionsScAnnerService.removeExtension(existingExtension.identifier, existingExtension.mAnifest.version);
			}
			this._onDidInstAllExtension.fire({ locAl, identifier: gAllery.identifier, operAtion: InstAllOperAtion.InstAll, gAllery });
			return locAl;
		} cAtch (error) {
			this._onDidInstAllExtension.fire({ error, identifier: gAllery.identifier, operAtion: InstAllOperAtion.InstAll, gAllery });
			throw error;
		}
	}

	Async uninstAll(extension: ILocAlExtension): Promise<void> {
		this._onUninstAllExtension.fire(extension.identifier);
		try {
			AwAit this.webExtensionsScAnnerService.removeExtension(extension.identifier);
			this._onDidUninstAllExtension.fire({ identifier: extension.identifier });
		} cAtch (error) {
			this.logService.error(error);
			this._onDidUninstAllExtension.fire({ error, identifier: extension.identifier });
			throw error;
		}
	}

	Async updAteMetAdAtA(locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA): Promise<ILocAlExtension> {
		return locAl;
	}

	privAte Async getUserExtension(identifier: IExtensionIdentifier): Promise<ILocAlExtension | undefined> {
		const userExtensions = AwAit this.getInstAlled(ExtensionType.User);
		return userExtensions.find(e => AreSAmeExtensions(e.identifier, identifier));
	}

	privAte Async toLocAlExtension(scAnnedExtension: ITrAnslAtedScAnnedExtension): Promise<ILocAlExtension> {
		return <ILocAlExtension>{
			type: scAnnedExtension.type,
			identifier: scAnnedExtension.identifier,
			mAnifest: scAnnedExtension.pAckAgeJSON,
			locAtion: scAnnedExtension.locAtion,
			isMAchineScoped: fAlse,
			publisherId: null,
			publisherDisplAyNAme: null
		};
	}

	zip(extension: ILocAlExtension): Promise<URI> { throw new Error('unsupported'); }
	unzip(zipLocAtion: URI): Promise<IExtensionIdentifier> { throw new Error('unsupported'); }
	getMAnifest(vsix: URI): Promise<IExtensionMAnifest> { throw new Error('unsupported'); }
	instAll(vsix: URI): Promise<ILocAlExtension> { throw new Error('unsupported'); }
	reinstAllFromGAllery(extension: ILocAlExtension): Promise<void> { throw new Error('unsupported'); }
	getExtensionsReport(): Promise<IReportedExtension[]> { throw new Error('unsupported'); }

}
