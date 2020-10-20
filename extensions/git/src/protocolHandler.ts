/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { UriHAndler, Uri, window, DisposAble, commAnds } from 'vscode';
import { dispose } from './util';
import * As querystring from 'querystring';

export clAss GitProtocolHAndler implements UriHAndler {

	privAte disposAbles: DisposAble[] = [];

	constructor() {
		this.disposAbles.push(window.registerUriHAndler(this));
	}

	hAndleUri(uri: Uri): void {
		switch (uri.pAth) {
			cAse '/clone': this.clone(uri);
		}
	}

	privAte clone(uri: Uri): void {
		const dAtA = querystring.pArse(uri.query);

		if (!dAtA.url) {
			console.wArn('FAiled to open URI:', uri);
		}

		commAnds.executeCommAnd('git.clone', dAtA.url);
	}

	dispose(): void {
		this.disposAbles = dispose(this.disposAbles);
	}
}
