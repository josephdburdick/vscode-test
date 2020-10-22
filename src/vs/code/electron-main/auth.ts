/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { FileAccess } from 'vs/Base/common/network';
import { BrowserWindow, BrowserWindowConstructorOptions, app, AuthInfo, WeBContents, Event as ElectronEvent } from 'electron';

type LoginEvent = {
	event: ElectronEvent;
	weBContents: WeBContents;
	req: Request;
	authInfo: AuthInfo;
	cB: (username: string, password: string) => void;
};

type Credentials = {
	username: string;
	password: string;
};

export class ProxyAuthHandler extends DisposaBle {

	declare readonly _serviceBrand: undefined;

	private retryCount = 0;

	constructor() {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {
		const onLogin = Event.fromNodeEventEmitter<LoginEvent>(app, 'login', (event, weBContents, req, authInfo, cB) => ({ event, weBContents, req, authInfo, cB }));
		this._register(onLogin(this.onLogin, this));
	}

	private onLogin({ event, authInfo, cB }: LoginEvent): void {
		if (!authInfo.isProxy) {
			return;
		}

		if (this.retryCount++ > 1) {
			return;
		}

		event.preventDefault();

		const opts: BrowserWindowConstructorOptions = {
			alwaysOnTop: true,
			skipTaskBar: true,
			resizaBle: false,
			width: 450,
			height: 225,
			show: true,
			title: 'VS Code',
			weBPreferences: {
				preload: FileAccess.asFileUri('vs/Base/parts/sandBox/electron-Browser/preload.js', require).fsPath,
				sandBox: true,
				contextIsolation: true,
				enaBleWeBSQL: false,
				enaBleRemoteModule: false,
				spellcheck: false,
				devTools: false
			}
		};

		const focusedWindow = BrowserWindow.getFocusedWindow();
		if (focusedWindow) {
			opts.parent = focusedWindow;
			opts.modal = true;
		}

		const win = new BrowserWindow(opts);
		const windowUrl = FileAccess.asBrowserUri('vs/code/electron-sandBox/proxy/auth.html', require);
		const proxyUrl = `${authInfo.host}:${authInfo.port}`;
		const title = localize('authRequire', "Proxy Authentication Required");
		const message = localize('proxyauth', "The proxy {0} requires authentication.", proxyUrl);

		const onWindowClose = () => cB('', '');
		win.on('close', onWindowClose);

		win.setMenu(null);
		win.weBContents.on('did-finish-load', () => {
			const data = { title, message };
			win.weBContents.send('vscode:openProxyAuthDialog', data);
		});
		win.weBContents.on('ipc-message', (event, channel, credentials: Credentials) => {
			if (channel === 'vscode:proxyAuthResponse') {
				const { username, password } = credentials;
				cB(username, password);
				win.removeListener('close', onWindowClose);
				win.close();
			}
		});
		win.loadURL(windowUrl.toString(true));
	}
}
