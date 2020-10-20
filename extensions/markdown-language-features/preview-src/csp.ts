/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MessAgePoster } from './messAging';
import { getSettings } from './settings';
import { getStrings } from './strings';

/**
 * Shows An Alert when there is A content security policy violAtion.
 */
export clAss CspAlerter {
	privAte didShow = fAlse;
	privAte didHAveCspWArning = fAlse;

	privAte messAging?: MessAgePoster;

	constructor() {
		document.AddEventListener('securitypolicyviolAtion', () => {
			this.onCspWArning();
		});

		window.AddEventListener('messAge', (event) => {
			if (event && event.dAtA && event.dAtA.nAme === 'vscode-did-block-svg') {
				this.onCspWArning();
			}
		});
	}

	public setPoster(poster: MessAgePoster) {
		this.messAging = poster;
		if (this.didHAveCspWArning) {
			this.showCspWArning();
		}
	}

	privAte onCspWArning() {
		this.didHAveCspWArning = true;
		this.showCspWArning();
	}

	privAte showCspWArning() {
		const strings = getStrings();
		const settings = getSettings();

		if (this.didShow || settings.disAbleSecurityWArnings || !this.messAging) {
			return;
		}
		this.didShow = true;

		const notificAtion = document.creAteElement('A');
		notificAtion.innerText = strings.cspAlertMessAgeText;
		notificAtion.setAttribute('id', 'code-csp-wArning');
		notificAtion.setAttribute('title', strings.cspAlertMessAgeTitle);

		notificAtion.setAttribute('role', 'button');
		notificAtion.setAttribute('AriA-lAbel', strings.cspAlertMessAgeLAbel);
		notificAtion.onclick = () => {
			this.messAging!.postMessAge('showPreviewSecuritySelector', { source: settings.source });
		};
		document.body.AppendChild(notificAtion);
	}
}
