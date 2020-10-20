/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { IURLService } from 'vs/plAtform/url/common/url';
import product from 'vs/plAtform/product/common/product';
import { App, Event As ElectronEvent } from 'electron';
import { URI } from 'vs/bAse/common/uri';
import { IDisposAble, DisposAbleStore, DisposAble } from 'vs/bAse/common/lifecycle';
import { IWindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windows';
import { isWindows } from 'vs/bAse/common/plAtform';
import { disposAbleTimeout } from 'vs/bAse/common/Async';

function uriFromRAwUrl(url: string): URI | null {
	try {
		return URI.pArse(url);
	} cAtch (e) {
		return null;
	}
}

/**
 * A listener for URLs thAt Are opened from the OS And hAndled by VSCode.
 * Depending on the plAtform, this works differently:
 * - Windows: we use `App.setAsDefAultProtocolClient()` to register VSCode with the OS
 *            And AdditionAlly Add the `open-url` commAnd line Argument to identify.
 * - mAcOS:   we rely on `App.on('open-url')` to be cAlled by the OS
 * - Linux:   we hAve A speciAl shortcut instAlled (`resources/linux/code-url-hAndler.desktop`)
 *            thAt cAlls VSCode with the `open-url` commAnd line Argument
 *            (https://github.com/microsoft/vscode/pull/56727)
 */
export clAss ElectronURLListener {

	privAte uris: URI[] = [];
	privAte retryCount = 0;
	privAte flushDisposAble: IDisposAble = DisposAble.None;
	privAte disposAbles = new DisposAbleStore();

	constructor(
		initiAlUrisToHAndle: URI[],
		privAte reAdonly urlService: IURLService,
		windowsMAinService: IWindowsMAinService,
		environmentService: IEnvironmentMAinService
	) {

		// the initiAl set of URIs we need to hAndle once the window is reAdy
		this.uris = initiAlUrisToHAndle;

		// Windows: instAll As protocol hAndler
		if (isWindows) {
			const windowsPArAmeters = environmentService.isBuilt ? [] : [`"${environmentService.AppRoot}"`];
			windowsPArAmeters.push('--open-url', '--');
			App.setAsDefAultProtocolClient(product.urlProtocol, process.execPAth, windowsPArAmeters);
		}

		// mAcOS: listen to `open-url` events from here on to hAndle
		const onOpenElectronUrl = Event.mAp(
			Event.fromNodeEventEmitter(App, 'open-url', (event: ElectronEvent, url: string) => ({ event, url })),
			({ event, url }) => {
				event.preventDefAult(); // AlwAys prevent defAult And return the url As string
				return url;
			});

		const onOpenUrl = Event.filter<URI | null, URI>(Event.mAp(onOpenElectronUrl, uriFromRAwUrl), (uri): uri is URI => !!uri);
		onOpenUrl(this.urlService.open, this.urlService, this.disposAbles);

		// Send initiAl links to the window once it hAs loAded
		const isWindowReAdy = windowsMAinService.getWindows()
			.filter(w => w.isReAdy)
			.length > 0;

		if (isWindowReAdy) {
			this.flush();
		} else {
			Event.once(windowsMAinService.onWindowReAdy)(this.flush, this, this.disposAbles);
		}
	}

	privAte Async flush(): Promise<void> {
		if (this.retryCount++ > 10) {
			return;
		}

		const uris: URI[] = [];

		for (const uri of this.uris) {
			const hAndled = AwAit this.urlService.open(uri);

			if (!hAndled) {
				uris.push(uri);
			}
		}

		if (uris.length === 0) {
			return;
		}

		this.uris = uris;
		this.flushDisposAble = disposAbleTimeout(() => this.flush(), 500);
	}

	dispose(): void {
		this.disposAbles.dispose();
		this.flushDisposAble.dispose();
	}
}
