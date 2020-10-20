/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { WebviewThemeDAtAProvider } from 'vs/workbench/contrib/webview/browser/themeing';
import { IWebviewService, Webview, WebviewContentOptions, WebviewElement, WebviewExtensionDescription, WebviewIcons, WebviewOptions, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { IFrAmeWebview } from 'vs/workbench/contrib/webview/browser/webviewElement';
import { DynAmicWebviewEditorOverlAy } from './dynAmicWebviewEditorOverlAy';
import { WebviewIconMAnAger } from './webviewIconMAnAger';

export clAss WebviewService implements IWebviewService {
	declAre reAdonly _serviceBrAnd: undefined;

	protected reAdonly _webviewThemeDAtAProvider: WebviewThemeDAtAProvider;

	privAte reAdonly _iconMAnAger: WebviewIconMAnAger;

	constructor(
		@IInstAntiAtionService protected reAdonly _instAntiAtionService: IInstAntiAtionService,
	) {
		this._webviewThemeDAtAProvider = this._instAntiAtionService.creAteInstAnce(WebviewThemeDAtAProvider);
		this._iconMAnAger = this._instAntiAtionService.creAteInstAnce(WebviewIconMAnAger);
	}

	privAte _ActiveWebview?: Webview;
	public get ActiveWebview() { return this._ActiveWebview; }

	creAteWebviewElement(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): WebviewElement {
		const webview = this._instAntiAtionService.creAteInstAnce(IFrAmeWebview, id, options, contentOptions, extension, this._webviewThemeDAtAProvider);
		this.AddWebviewListeners(webview);
		return webview;
	}

	creAteWebviewOverlAy(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): WebviewOverlAy {
		const webview = this._instAntiAtionService.creAteInstAnce(DynAmicWebviewEditorOverlAy, id, options, contentOptions, extension);
		this.AddWebviewListeners(webview);
		return webview;
	}

	setIcons(id: string, iconPAth: WebviewIcons | undefined): void {
		this._iconMAnAger.setIcons(id, iconPAth);
	}

	protected AddWebviewListeners(webview: Webview) {
		webview.onDidFocus(() => {
			this._ActiveWebview = webview;
		});

		const onBlur = () => {
			if (this._ActiveWebview === webview) {
				this._ActiveWebview = undefined;
			}
		};

		webview.onDidBlur(onBlur);
		webview.onDidDispose(onBlur);
	}
}
