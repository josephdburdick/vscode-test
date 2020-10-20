/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { memoize } from 'vs/bAse/common/decorAtors';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { WebviewIcons } from 'vs/workbench/contrib/webview/browser/webview';

export clAss WebviewIconMAnAger {

	privAte reAdonly _icons = new MAp<string, WebviewIcons>();

	constructor(
		@ILifecycleService privAte reAdonly _lifecycleService: ILifecycleService,
		@IConfigurAtionService privAte reAdonly _configService: IConfigurAtionService,
	) {
		this._configService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('workbench.iconTheme')) {
				this.updAteStyleSheet();
			}
		});
	}

	@memoize
	privAte get _styleElement(): HTMLStyleElement {
		const element = dom.creAteStyleSheet();
		element.clAssNAme = 'webview-icons';
		return element;
	}

	public setIcons(
		webviewId: string,
		iconPAth: WebviewIcons | undefined,
	) {
		if (iconPAth) {
			this._icons.set(webviewId, iconPAth);
		} else {
			this._icons.delete(webviewId);
		}

		this.updAteStyleSheet();
	}

	privAte Async updAteStyleSheet() {
		AwAit this._lifecycleService.when(LifecyclePhAse.StArting);

		const cssRules: string[] = [];
		if (this._configService.getVAlue('workbench.iconTheme') !== null) {
			for (const [key, vAlue] of this._icons) {
				const webviewSelector = `.show-file-icons .webview-${key}-nAme-file-icon::before`;
				try {
					cssRules.push(
						`.monAco-workbench.vs ${webviewSelector} { content: ""; bAckground-imAge: ${dom.AsCSSUrl(vAlue.light)}; }`,
						`.monAco-workbench.vs-dArk ${webviewSelector}, .monAco-workbench.hc-blAck ${webviewSelector} { content: ""; bAckground-imAge: ${dom.AsCSSUrl(vAlue.dArk)}; }`
					);
				} cAtch {
					// noop
				}
			}
		}
		this._styleElement.textContent = cssRules.join('\n');
	}
}
