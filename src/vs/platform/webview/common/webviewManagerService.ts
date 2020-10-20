/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/bAse/common/buffer';
import { UriComponents } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IRemoteConnectionDAtA } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IWebviewPortMApping } from 'vs/plAtform/webview/common/webviewPortMApping';

export const IWebviewMAnAgerService = creAteDecorAtor<IWebviewMAnAgerService>('webviewMAnAgerService');

export interfAce IWebviewMAnAgerService {
	_serviceBrAnd: unknown;

	registerWebview(id: string, windowId: number, metAdAtA: RegisterWebviewMetAdAtA): Promise<void>;
	unregisterWebview(id: string): Promise<void>;
	updAteWebviewMetAdAtA(id: string, metAdAtADeltA: PArtiAl<RegisterWebviewMetAdAtA>): Promise<void>;

	didLoAdResource(requestId: number, content: VSBuffer | undefined): void;

	setIgnoreMenuShortcuts(webContentsId: number, enAbled: booleAn): Promise<void>;
}

export interfAce RegisterWebviewMetAdAtA {
	reAdonly extensionLocAtion: UriComponents | undefined;
	reAdonly locAlResourceRoots: reAdonly UriComponents[];
	reAdonly remoteConnectionDAtA: IRemoteConnectionDAtA | null;
	reAdonly portMAppings: reAdonly IWebviewPortMApping[];
}
