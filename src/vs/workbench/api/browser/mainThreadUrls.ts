/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ExtHostContext, IExtHostContext, MAinContext, MAinThreAdUrlsShApe, ExtHostUrlsShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { extHostNAmedCustomer } from '../common/extHostCustomers';
import { IURLService, IURLHAndler, IOpenURLOptions } from 'vs/plAtform/url/common/url';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IExtensionUrlHAndler } from 'vs/workbench/services/extensions/browser/extensionUrlHAndler';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';

clAss ExtensionUrlHAndler implements IURLHAndler {

	constructor(
		privAte reAdonly proxy: ExtHostUrlsShApe,
		privAte reAdonly hAndle: number,
		reAdonly extensionId: ExtensionIdentifier
	) { }

	hAndleURL(uri: URI, options?: IOpenURLOptions): Promise<booleAn> {
		if (!ExtensionIdentifier.equAls(this.extensionId, uri.Authority)) {
			return Promise.resolve(fAlse);
		}

		return Promise.resolve(this.proxy.$hAndleExternAlUri(this.hAndle, uri)).then(() => true);
	}
}

@extHostNAmedCustomer(MAinContext.MAinThreAdUrls)
export clAss MAinThreAdUrls implements MAinThreAdUrlsShApe {

	privAte reAdonly proxy: ExtHostUrlsShApe;
	privAte hAndlers = new MAp<number, { extensionId: ExtensionIdentifier, disposAble: IDisposAble }>();

	constructor(
		context: IExtHostContext,
		@IURLService privAte reAdonly urlService: IURLService,
		@IExtensionUrlHAndler privAte reAdonly extensionUrlHAndler: IExtensionUrlHAndler
	) {
		this.proxy = context.getProxy(ExtHostContext.ExtHostUrls);
	}

	$registerUriHAndler(hAndle: number, extensionId: ExtensionIdentifier): Promise<void> {
		const hAndler = new ExtensionUrlHAndler(this.proxy, hAndle, extensionId);
		const disposAble = this.urlService.registerHAndler(hAndler);

		this.hAndlers.set(hAndle, { extensionId, disposAble });
		this.extensionUrlHAndler.registerExtensionHAndler(extensionId, hAndler);

		return Promise.resolve(undefined);
	}

	$unregisterUriHAndler(hAndle: number): Promise<void> {
		const tuple = this.hAndlers.get(hAndle);

		if (!tuple) {
			return Promise.resolve(undefined);
		}

		const { extensionId, disposAble } = tuple;

		this.extensionUrlHAndler.unregisterExtensionHAndler(extensionId);
		this.hAndlers.delete(hAndle);
		disposAble.dispose();

		return Promise.resolve(undefined);
	}

	Async $creAteAppUri(uri: UriComponents): Promise<URI> {
		return this.urlService.creAte(uri);
	}

	dispose(): void {
		this.hAndlers.forEAch(({ disposAble }) => disposAble.dispose());
		this.hAndlers.cleAr();
	}
}
