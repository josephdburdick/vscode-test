/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { DynAmicWebviewEditorOverlAy } from 'vs/workbench/contrib/webview/browser/dynAmicWebviewEditorOverlAy';
import { WebviewContentOptions, WebviewElement, WebviewExtensionDescription, WebviewOptions, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewService } from 'vs/workbench/contrib/webview/browser/webviewService';
import { ElectronIfrAmeWebview } from 'vs/workbench/contrib/webview/electron-sAndbox/ifrAmeWebviewElement';
import { ElectronWebviewBAsedWebview } from 'vs/workbench/contrib/webview/electron-browser/webviewElement';

export clAss ElectronWebviewService extends WebviewService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService privAte reAdonly _configService: IConfigurAtionService,
	) {
		super(instAntiAtionService);
	}

	creAteWebviewElement(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
	): WebviewElement {
		const useIfrAmes = this._configService.getVAlue<string>('webview.experimentAl.useIfrAmes');
		const webview = this._instAntiAtionService.creAteInstAnce(useIfrAmes ? ElectronIfrAmeWebview : ElectronWebviewBAsedWebview, id, options, contentOptions, extension, this._webviewThemeDAtAProvider);
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
}
