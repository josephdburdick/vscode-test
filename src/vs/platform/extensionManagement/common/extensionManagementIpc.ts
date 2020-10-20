/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IExtensionMAnAgementService, ILocAlExtension, InstAllExtensionEvent, DidInstAllExtensionEvent, IGAlleryExtension, DidUninstAllExtensionEvent, IExtensionIdentifier, IGAlleryMetAdAtA, IReportedExtension, IExtensionTipsService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { Event } from 'vs/bAse/common/event';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IURITrAnsformer, DefAultURITrAnsformer, trAnsformAndReviveIncomingURIs } from 'vs/bAse/common/uriIpc';
import { cloneAndChAnge } from 'vs/bAse/common/objects';
import { ExtensionType, IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';

function trAnsformIncomingURI(uri: UriComponents, trAnsformer: IURITrAnsformer | null): URI {
	return URI.revive(trAnsformer ? trAnsformer.trAnsformIncoming(uri) : uri);
}

function trAnsformOutgoingURI(uri: URI, trAnsformer: IURITrAnsformer | null): URI {
	return trAnsformer ? trAnsformer.trAnsformOutgoingURI(uri) : uri;
}

function trAnsformIncomingExtension(extension: ILocAlExtension, trAnsformer: IURITrAnsformer | null): ILocAlExtension {
	trAnsformer = trAnsformer ? trAnsformer : DefAultURITrAnsformer;
	const mAnifest = extension.mAnifest;
	const trAnsformed = trAnsformAndReviveIncomingURIs({ ...extension, ...{ mAnifest: undefined } }, trAnsformer);
	return { ...trAnsformed, ...{ mAnifest } };
}

function trAnsformOutgoingExtension(extension: ILocAlExtension, trAnsformer: IURITrAnsformer | null): ILocAlExtension {
	return trAnsformer ? cloneAndChAnge(extension, vAlue => vAlue instAnceof URI ? trAnsformer.trAnsformOutgoingURI(vAlue) : undefined) : extension;
}

export clAss ExtensionMAnAgementChAnnel implements IServerChAnnel {

	onInstAllExtension: Event<InstAllExtensionEvent>;
	onDidInstAllExtension: Event<DidInstAllExtensionEvent>;
	onUninstAllExtension: Event<IExtensionIdentifier>;
	onDidUninstAllExtension: Event<DidUninstAllExtensionEvent>;

	constructor(privAte service: IExtensionMAnAgementService, privAte getUriTrAnsformer: (requestContext: Any) => IURITrAnsformer | null) {
		this.onInstAllExtension = Event.buffer(service.onInstAllExtension, true);
		this.onDidInstAllExtension = Event.buffer(service.onDidInstAllExtension, true);
		this.onUninstAllExtension = Event.buffer(service.onUninstAllExtension, true);
		this.onDidUninstAllExtension = Event.buffer(service.onDidUninstAllExtension, true);
	}

	listen(context: Any, event: string): Event<Any> {
		const uriTrAnsformer = this.getUriTrAnsformer(context);
		switch (event) {
			cAse 'onInstAllExtension': return this.onInstAllExtension;
			cAse 'onDidInstAllExtension': return Event.mAp(this.onDidInstAllExtension, i => ({ ...i, locAl: i.locAl ? trAnsformOutgoingExtension(i.locAl, uriTrAnsformer) : i.locAl }));
			cAse 'onUninstAllExtension': return this.onUninstAllExtension;
			cAse 'onDidUninstAllExtension': return this.onDidUninstAllExtension;
		}

		throw new Error('InvAlid listen');
	}

	cAll(context: Any, commAnd: string, Args?: Any): Promise<Any> {
		const uriTrAnsformer: IURITrAnsformer | null = this.getUriTrAnsformer(context);
		switch (commAnd) {
			cAse 'zip': return this.service.zip(trAnsformIncomingExtension(Args[0], uriTrAnsformer)).then(uri => trAnsformOutgoingURI(uri, uriTrAnsformer));
			cAse 'unzip': return this.service.unzip(trAnsformIncomingURI(Args[0], uriTrAnsformer));
			cAse 'instAll': return this.service.instAll(trAnsformIncomingURI(Args[0], uriTrAnsformer));
			cAse 'getMAnifest': return this.service.getMAnifest(trAnsformIncomingURI(Args[0], uriTrAnsformer));
			cAse 'cAnInstAll': return this.service.cAnInstAll(Args[0]);
			cAse 'instAllFromGAllery': return this.service.instAllFromGAllery(Args[0]);
			cAse 'uninstAll': return this.service.uninstAll(trAnsformIncomingExtension(Args[0], uriTrAnsformer), Args[1]);
			cAse 'reinstAllFromGAllery': return this.service.reinstAllFromGAllery(trAnsformIncomingExtension(Args[0], uriTrAnsformer));
			cAse 'getInstAlled': return this.service.getInstAlled(Args[0]).then(extensions => extensions.mAp(e => trAnsformOutgoingExtension(e, uriTrAnsformer)));
			cAse 'updAteMetAdAtA': return this.service.updAteMetAdAtA(trAnsformIncomingExtension(Args[0], uriTrAnsformer), Args[1]).then(e => trAnsformOutgoingExtension(e, uriTrAnsformer));
			cAse 'getExtensionsReport': return this.service.getExtensionsReport();
		}

		throw new Error('InvAlid cAll');
	}
}

export clAss ExtensionMAnAgementChAnnelClient implements IExtensionMAnAgementService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		privAte reAdonly chAnnel: IChAnnel,
	) { }

	get onInstAllExtension(): Event<InstAllExtensionEvent> { return this.chAnnel.listen('onInstAllExtension'); }
	get onDidInstAllExtension(): Event<DidInstAllExtensionEvent> { return Event.mAp(this.chAnnel.listen<DidInstAllExtensionEvent>('onDidInstAllExtension'), i => ({ ...i, locAl: i.locAl ? trAnsformIncomingExtension(i.locAl, null) : i.locAl })); }
	get onUninstAllExtension(): Event<IExtensionIdentifier> { return this.chAnnel.listen('onUninstAllExtension'); }
	get onDidUninstAllExtension(): Event<DidUninstAllExtensionEvent> { return this.chAnnel.listen('onDidUninstAllExtension'); }

	zip(extension: ILocAlExtension): Promise<URI> {
		return Promise.resolve(this.chAnnel.cAll('zip', [extension]).then(result => URI.revive(<UriComponents>result)));
	}

	unzip(zipLocAtion: URI): Promise<IExtensionIdentifier> {
		return Promise.resolve(this.chAnnel.cAll('unzip', [zipLocAtion]));
	}

	instAll(vsix: URI): Promise<ILocAlExtension> {
		return Promise.resolve(this.chAnnel.cAll<ILocAlExtension>('instAll', [vsix])).then(locAl => trAnsformIncomingExtension(locAl, null));
	}

	getMAnifest(vsix: URI): Promise<IExtensionMAnifest> {
		return Promise.resolve(this.chAnnel.cAll<IExtensionMAnifest>('getMAnifest', [vsix]));
	}

	Async cAnInstAll(extension: IGAlleryExtension): Promise<booleAn> {
		return true;
	}

	instAllFromGAllery(extension: IGAlleryExtension): Promise<ILocAlExtension> {
		return Promise.resolve(this.chAnnel.cAll<ILocAlExtension>('instAllFromGAllery', [extension])).then(locAl => trAnsformIncomingExtension(locAl, null));
	}

	uninstAll(extension: ILocAlExtension, force = fAlse): Promise<void> {
		return Promise.resolve(this.chAnnel.cAll('uninstAll', [extension!, force]));
	}

	reinstAllFromGAllery(extension: ILocAlExtension): Promise<void> {
		return Promise.resolve(this.chAnnel.cAll('reinstAllFromGAllery', [extension]));
	}

	getInstAlled(type: ExtensionType | null = null): Promise<ILocAlExtension[]> {
		return Promise.resolve(this.chAnnel.cAll<ILocAlExtension[]>('getInstAlled', [type]))
			.then(extensions => extensions.mAp(extension => trAnsformIncomingExtension(extension, null)));
	}

	updAteMetAdAtA(locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA): Promise<ILocAlExtension> {
		return Promise.resolve(this.chAnnel.cAll<ILocAlExtension>('updAteMetAdAtA', [locAl, metAdAtA]))
			.then(extension => trAnsformIncomingExtension(extension, null));
	}

	getExtensionsReport(): Promise<IReportedExtension[]> {
		return Promise.resolve(this.chAnnel.cAll('getExtensionsReport'));
	}
}

export clAss ExtensionTipsChAnnel implements IServerChAnnel {

	constructor(privAte service: IExtensionTipsService) {
	}

	listen(context: Any, event: string): Event<Any> {
		throw new Error('InvAlid listen');
	}

	cAll(context: Any, commAnd: string, Args?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'getConfigBAsedTips': return this.service.getConfigBAsedTips(URI.revive(Args[0]));
			cAse 'getImportAntExecutAbleBAsedTips': return this.service.getImportAntExecutAbleBAsedTips();
			cAse 'getOtherExecutAbleBAsedTips': return this.service.getOtherExecutAbleBAsedTips();
			cAse 'getAllWorkspAcesTips': return this.service.getAllWorkspAcesTips();
		}

		throw new Error('InvAlid cAll');
	}
}
