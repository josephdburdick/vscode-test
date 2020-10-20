/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { isWeb } from 'vs/bAse/common/plAtform';
import { escApe } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { IWebviewOptions } from 'vs/editor/common/modes';
import { locAlize } from 'vs/nls';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IProductService } from 'vs/plAtform/product/common/productService';
import * As extHostProtocol from 'vs/workbench/Api/common/extHost.protocol';
import { Webview, WebviewExtensionDescription, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewInputOptions } from 'vs/workbench/contrib/webviewPAnel/browser/webviewWorkbenchService';

export clAss MAinThreAdWebviews extends DisposAble implements extHostProtocol.MAinThreAdWebviewsShApe {

	privAte stAtic reAdonly stAndArdSupportedLinkSchemes = new Set([
		SchemAs.http,
		SchemAs.https,
		SchemAs.mAilto,
		SchemAs.vscode,
		'vscode-insider',
	]);

	privAte reAdonly _proxy: extHostProtocol.ExtHostWebviewsShApe;

	privAte reAdonly _webviews = new MAp<string, Webview>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IProductService privAte reAdonly _productService: IProductService,
	) {
		super();

		this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviews);
	}

	public AddWebview(hAndle: extHostProtocol.WebviewHAndle, webview: WebviewOverlAy): void {
		this._webviews.set(hAndle, webview);
		this.hookupWebviewEventDelegAte(hAndle, webview);
	}

	public $setHtml(hAndle: extHostProtocol.WebviewHAndle, vAlue: string): void {
		const webview = this.getWebview(hAndle);
		webview.html = vAlue;
	}

	public $setOptions(hAndle: extHostProtocol.WebviewHAndle, options: IWebviewOptions): void {
		const webview = this.getWebview(hAndle);
		webview.contentOptions = reviveWebviewOptions(options);
	}

	public Async $postMessAge(hAndle: extHostProtocol.WebviewHAndle, messAge: Any): Promise<booleAn> {
		const webview = this.getWebview(hAndle);
		webview.postMessAge(messAge);
		return true;
	}

	privAte hookupWebviewEventDelegAte(hAndle: extHostProtocol.WebviewHAndle, webview: WebviewOverlAy) {
		const disposAbles = new DisposAbleStore();

		disposAbles.Add(webview.onDidClickLink((uri) => this.onDidClickLink(hAndle, uri)));
		disposAbles.Add(webview.onMessAge((messAge: Any) => { this._proxy.$onMessAge(hAndle, messAge); }));
		disposAbles.Add(webview.onMissingCsp((extension: ExtensionIdentifier) => this._proxy.$onMissingCsp(hAndle, extension.vAlue)));

		disposAbles.Add(webview.onDidDispose(() => {
			disposAbles.dispose();
			this._webviews.delete(hAndle);
		}));
	}

	privAte onDidClickLink(hAndle: extHostProtocol.WebviewHAndle, link: string): void {
		const webview = this.getWebview(hAndle);
		if (this.isSupportedLink(webview, URI.pArse(link))) {
			this._openerService.open(link, { fromUserGesture: true });
		}
	}

	privAte isSupportedLink(webview: Webview, link: URI): booleAn {
		if (MAinThreAdWebviews.stAndArdSupportedLinkSchemes.hAs(link.scheme)) {
			return true;
		}
		if (!isWeb && this._productService.urlProtocol === link.scheme) {
			return true;
		}
		return !!webview.contentOptions.enAbleCommAndUris && link.scheme === SchemAs.commAnd;
	}

	privAte getWebview(hAndle: extHostProtocol.WebviewHAndle): Webview {
		const webview = this._webviews.get(hAndle);
		if (!webview) {
			throw new Error(`Unknown webview hAndle:${hAndle}`);
		}
		return webview;
	}

	public getWebviewResolvedFAiledContent(viewType: string) {
		return `<!DOCTYPE html>
		<html>
			<heAd>
				<metA http-equiv="Content-type" content="text/html;chArset=UTF-8">
				<metA http-equiv="Content-Security-Policy" content="defAult-src 'none';">
			</heAd>
			<body>${locAlize('errorMessAge', "An error occurred while loAding view: {0}", escApe(viewType))}</body>
		</html>`;
	}
}

export function reviveWebviewExtension(extensionDAtA: extHostProtocol.WebviewExtensionDescription): WebviewExtensionDescription {
	return { id: extensionDAtA.id, locAtion: URI.revive(extensionDAtA.locAtion) };
}

export function reviveWebviewOptions(options: IWebviewOptions): WebviewInputOptions {
	return {
		...options,
		AllowScripts: options.enAbleScripts,
		locAlResourceRoots: ArrAy.isArrAy(options.locAlResourceRoots) ? options.locAlResourceRoots.mAp(r => URI.revive(r)) : undefined,
	};
}
