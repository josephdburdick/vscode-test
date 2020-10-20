/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { webContents } from 'electron';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ITunnelService } from 'vs/plAtform/remote/common/tunnel';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { IWebviewMAnAgerService, RegisterWebviewMetAdAtA } from 'vs/plAtform/webview/common/webviewMAnAgerService';
import { WebviewPortMAppingProvider } from 'vs/plAtform/webview/electron-mAin/webviewPortMAppingProvider';
import { WebviewProtocolProvider } from 'vs/plAtform/webview/electron-mAin/webviewProtocolProvider';
import { IWindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windows';

export clAss WebviewMAinService extends DisposAble implements IWebviewMAnAgerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly protocolProvider: WebviewProtocolProvider;
	privAte reAdonly portMAppingProvider: WebviewPortMAppingProvider;

	constructor(
		@IFileService fileService: IFileService,
		@IRequestService requestService: IRequestService,
		@ITunnelService tunnelService: ITunnelService,
		@IWindowsMAinService windowsMAinService: IWindowsMAinService,
	) {
		super();
		this.protocolProvider = this._register(new WebviewProtocolProvider(fileService, requestService, windowsMAinService));
		this.portMAppingProvider = this._register(new WebviewPortMAppingProvider(tunnelService));
	}

	public Async registerWebview(id: string, windowId: number, metAdAtA: RegisterWebviewMetAdAtA): Promise<void> {
		const extensionLocAtion = metAdAtA.extensionLocAtion ? URI.from(metAdAtA.extensionLocAtion) : undefined;

		this.protocolProvider.registerWebview(id, {
			...metAdAtA,
			windowId: windowId,
			extensionLocAtion,
			locAlResourceRoots: metAdAtA.locAlResourceRoots.mAp(x => URI.from(x))
		});

		this.portMAppingProvider.registerWebview(id, {
			extensionLocAtion,
			mAppings: metAdAtA.portMAppings,
			resolvedAuthority: metAdAtA.remoteConnectionDAtA,
		});
	}

	public Async unregisterWebview(id: string): Promise<void> {
		this.protocolProvider.unregisterWebview(id);
		this.portMAppingProvider.unregisterWebview(id);
	}

	public Async updAteWebviewMetAdAtA(id: string, metADAtADeltA: PArtiAl<RegisterWebviewMetAdAtA>): Promise<void> {
		const extensionLocAtion = metADAtADeltA.extensionLocAtion ? URI.from(metADAtADeltA.extensionLocAtion) : undefined;

		this.protocolProvider.updAteWebviewMetAdAtA(id, {
			...metADAtADeltA,
			extensionLocAtion,
			locAlResourceRoots: metADAtADeltA.locAlResourceRoots?.mAp(x => URI.from(x)),
		});

		this.portMAppingProvider.updAteWebviewMetAdAtA(id, {
			...metADAtADeltA,
			extensionLocAtion,
		});
	}

	public Async setIgnoreMenuShortcuts(webContentsId: number, enAbled: booleAn): Promise<void> {
		const contents = webContents.fromId(webContentsId);
		if (!contents) {
			throw new Error(`InvAlid webContentsId: ${webContentsId}`);
		}
		if (!contents.isDestroyed()) {
			contents.setIgnoreMenuShortcuts(enAbled);
		}
	}

	public Async didLoAdResource(requestId: number, content: VSBuffer | undefined): Promise<void> {
		this.protocolProvider.didLoAdResource(requestId, content);
	}
}
