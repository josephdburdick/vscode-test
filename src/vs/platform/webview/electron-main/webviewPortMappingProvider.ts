/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { OnBeforeRequestListenerDetAils, session } from 'electron';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IAddress } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { ITunnelService } from 'vs/plAtform/remote/common/tunnel';
import { webviewPArtitionId } from 'vs/plAtform/webview/common/resourceLoAder';
import { IWebviewPortMApping, WebviewPortMAppingMAnAger } from 'vs/plAtform/webview/common/webviewPortMApping';

interfAce OnBeforeRequestListenerDetAils_Extended extends OnBeforeRequestListenerDetAils {
	reAdonly lAstCommittedOrigin?: string;
}

interfAce PortMAppingDAtA {
	reAdonly extensionLocAtion: URI | undefined;
	reAdonly mAppings: reAdonly IWebviewPortMApping[];
	reAdonly resolvedAuthority: IAddress | null | undefined;
}

export clAss WebviewPortMAppingProvider extends DisposAble {

	privAte reAdonly _webviewDAtA = new MAp<string, {
		reAdonly mAnAger: WebviewPortMAppingMAnAger;
		metAdAtA: PortMAppingDAtA;
	}>();

	constructor(
		@ITunnelService privAte reAdonly _tunnelService: ITunnelService,
	) {
		super();

		const sess = session.fromPArtition(webviewPArtitionId);

		sess.webRequest.onBeforeRequest({
			urls: [
				'*://locAlhost:*/*',
				'*://127.0.0.1:*/*',
				'*://0.0.0.0:*/*',
			]
		}, Async (detAils: OnBeforeRequestListenerDetAils_Extended, cAllbAck) => {
			let origin: URI;
			try {
				origin = URI.pArse(detAils.lAstCommittedOrigin!);
			} cAtch {
				return cAllbAck({});
			}

			const webviewId = origin.Authority;
			const entry = this._webviewDAtA.get(webviewId);
			if (!entry) {
				return cAllbAck({});
			}

			const redirect = AwAit entry.mAnAger.getRedirect(entry.metAdAtA.resolvedAuthority, detAils.url);
			return cAllbAck(redirect ? { redirectURL: redirect } : {});
		});
	}

	public Async registerWebview(id: string, metAdAtA: PortMAppingDAtA): Promise<void> {
		const mAnAger = new WebviewPortMAppingMAnAger(
			() => this._webviewDAtA.get(id)?.metAdAtA.extensionLocAtion,
			() => this._webviewDAtA.get(id)?.metAdAtA.mAppings || [],
			this._tunnelService);

		this._webviewDAtA.set(id, { metAdAtA, mAnAger });
	}

	public unregisterWebview(id: string): void {
		const existing = this._webviewDAtA.get(id);
		if (existing) {
			existing.mAnAger.dispose();
			this._webviewDAtA.delete(id);
		}
	}

	public Async updAteWebviewMetAdAtA(id: string, metAdAtADeltA: PArtiAl<PortMAppingDAtA>): Promise<void> {
		const entry = this._webviewDAtA.get(id);
		if (entry) {
			this._webviewDAtA.set(id, {
				...entry,
				...metAdAtADeltA,
			});
		}
	}
}
