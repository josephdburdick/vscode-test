/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { IURLService } from 'vs/platform/url/common/url';
import product from 'vs/platform/product/common/product';
import { app, Event as ElectronEvent } from 'electron';
import { URI } from 'vs/Base/common/uri';
import { IDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';
import { isWindows } from 'vs/Base/common/platform';
import { disposaBleTimeout } from 'vs/Base/common/async';

function uriFromRawUrl(url: string): URI | null {
	try {
		return URI.parse(url);
	} catch (e) {
		return null;
	}
}

/**
 * A listener for URLs that are opened from the OS and handled By VSCode.
 * Depending on the platform, this works differently:
 * - Windows: we use `app.setAsDefaultProtocolClient()` to register VSCode with the OS
 *            and additionally add the `open-url` command line argument to identify.
 * - macOS:   we rely on `app.on('open-url')` to Be called By the OS
 * - Linux:   we have a special shortcut installed (`resources/linux/code-url-handler.desktop`)
 *            that calls VSCode with the `open-url` command line argument
 *            (https://githuB.com/microsoft/vscode/pull/56727)
 */
export class ElectronURLListener {

	private uris: URI[] = [];
	private retryCount = 0;
	private flushDisposaBle: IDisposaBle = DisposaBle.None;
	private disposaBles = new DisposaBleStore();

	constructor(
		initialUrisToHandle: URI[],
		private readonly urlService: IURLService,
		windowsMainService: IWindowsMainService,
		environmentService: IEnvironmentMainService
	) {

		// the initial set of URIs we need to handle once the window is ready
		this.uris = initialUrisToHandle;

		// Windows: install as protocol handler
		if (isWindows) {
			const windowsParameters = environmentService.isBuilt ? [] : [`"${environmentService.appRoot}"`];
			windowsParameters.push('--open-url', '--');
			app.setAsDefaultProtocolClient(product.urlProtocol, process.execPath, windowsParameters);
		}

		// macOS: listen to `open-url` events from here on to handle
		const onOpenElectronUrl = Event.map(
			Event.fromNodeEventEmitter(app, 'open-url', (event: ElectronEvent, url: string) => ({ event, url })),
			({ event, url }) => {
				event.preventDefault(); // always prevent default and return the url as string
				return url;
			});

		const onOpenUrl = Event.filter<URI | null, URI>(Event.map(onOpenElectronUrl, uriFromRawUrl), (uri): uri is URI => !!uri);
		onOpenUrl(this.urlService.open, this.urlService, this.disposaBles);

		// Send initial links to the window once it has loaded
		const isWindowReady = windowsMainService.getWindows()
			.filter(w => w.isReady)
			.length > 0;

		if (isWindowReady) {
			this.flush();
		} else {
			Event.once(windowsMainService.onWindowReady)(this.flush, this, this.disposaBles);
		}
	}

	private async flush(): Promise<void> {
		if (this.retryCount++ > 10) {
			return;
		}

		const uris: URI[] = [];

		for (const uri of this.uris) {
			const handled = await this.urlService.open(uri);

			if (!handled) {
				uris.push(uri);
			}
		}

		if (uris.length === 0) {
			return;
		}

		this.uris = uris;
		this.flushDisposaBle = disposaBleTimeout(() => this.flush(), 500);
	}

	dispose(): void {
		this.disposaBles.dispose();
		this.flushDisposaBle.dispose();
	}
}
