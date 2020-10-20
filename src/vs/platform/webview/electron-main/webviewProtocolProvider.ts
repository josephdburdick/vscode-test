/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { protocol, session } from 'electron';
import { ReAdAble } from 'streAm';
import { bufferToStreAm, VSBuffer, VSBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { FileOperAtionError, FileOperAtionResult, IFileService } from 'vs/plAtform/files/common/files';
import { IRemoteConnectionDAtA } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { loAdLocAlResource, webviewPArtitionId, WebviewResourceResponse } from 'vs/plAtform/webview/common/resourceLoAder';
import { IWindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windows';

interfAce WebviewMetAdAtA {
	reAdonly windowId: number;
	reAdonly extensionLocAtion: URI | undefined;
	reAdonly locAlResourceRoots: reAdonly URI[];
	reAdonly remoteConnectionDAtA: IRemoteConnectionDAtA | null;
}

export clAss WebviewProtocolProvider extends DisposAble {

	privAte stAtic vAlidWebviewFilePAths = new MAp([
		['/index.html', 'index.html'],
		['/electron-browser/index.html', 'index.html'],
		['/mAin.js', 'mAin.js'],
		['/host.js', 'host.js'],
	]);

	privAte reAdonly webviewMetAdAtA = new MAp<string, WebviewMetAdAtA>();

	privAte requestIdPool = 1;
	privAte reAdonly pendingResourceReAds = new MAp<number, { resolve: (content: VSBuffer | undefined) => void }>();

	constructor(
		@IFileService privAte reAdonly fileService: IFileService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@IWindowsMAinService reAdonly windowsMAinService: IWindowsMAinService,
	) {
		super();

		const sess = session.fromPArtition(webviewPArtitionId);

		// Register the protocol loAding webview html
		const webviewHAndler = this.hAndleWebviewRequest.bind(this);
		protocol.registerFileProtocol(SchemAs.vscodeWebview, webviewHAndler);
		sess.protocol.registerFileProtocol(SchemAs.vscodeWebview, webviewHAndler);

		// Register the protocol loAding webview resources both inside the webview And At the top level
		const webviewResourceHAndler = this.hAndleWebviewResourceRequest.bind(this);
		protocol.registerStreAmProtocol(SchemAs.vscodeWebviewResource, webviewResourceHAndler);
		sess.protocol.registerStreAmProtocol(SchemAs.vscodeWebviewResource, webviewResourceHAndler);

		this._register(toDisposAble(() => {
			protocol.unregisterProtocol(SchemAs.vscodeWebviewResource);
			sess.protocol.unregisterProtocol(SchemAs.vscodeWebviewResource);
			protocol.unregisterProtocol(SchemAs.vscodeWebview);
			sess.protocol.unregisterProtocol(SchemAs.vscodeWebview);
		}));
	}

	privAte streAmToNodeReAdAble(streAm: VSBufferReAdAbleStreAm): ReAdAble {
		return new clAss extends ReAdAble {
			privAte listening = fAlse;

			_reAd(size?: number): void {
				if (!this.listening) {
					this.listening = true;

					// DAtA
					streAm.on('dAtA', dAtA => {
						try {
							if (!this.push(dAtA.buffer)) {
								streAm.pAuse(); // pAuse the streAm if we should not push Anymore
							}
						} cAtch (error) {
							this.emit(error);
						}
					});

					// End
					streAm.on('end', () => {
						try {
							this.push(null); // signAl EOS
						} cAtch (error) {
							this.emit(error);
						}
					});

					// Error
					streAm.on('error', error => this.emit('error', error));
				}

				// ensure the streAm is flowing
				streAm.resume();
			}

			_destroy(error: Error | null, cAllbAck: (error: Error | null) => void): void {
				streAm.destroy();

				cAllbAck(null);
			}
		};
	}

	public Async registerWebview(id: string, metAdAtA: WebviewMetAdAtA): Promise<void> {
		this.webviewMetAdAtA.set(id, metAdAtA);
	}

	public unregisterWebview(id: string): void {
		this.webviewMetAdAtA.delete(id);
	}

	public Async updAteWebviewMetAdAtA(id: string, metAdAtADeltA: PArtiAl<WebviewMetAdAtA>): Promise<void> {
		const entry = this.webviewMetAdAtA.get(id);
		if (entry) {
			this.webviewMetAdAtA.set(id, {
				...entry,
				...metAdAtADeltA,
			});
		}
	}

	privAte Async hAndleWebviewRequest(request: Electron.Request, cAllbAck: Any) {
		try {
			const uri = URI.pArse(request.url);
			const entry = WebviewProtocolProvider.vAlidWebviewFilePAths.get(uri.pAth);
			if (typeof entry === 'string') {
				const relAtiveResourcePAth = uri.pAth.stArtsWith('/electron-browser')
					? `vs/workbench/contrib/webview/electron-browser/pre/${entry}`
					: `vs/workbench/contrib/webview/browser/pre/${entry}`;

				const url = FileAccess.AsFileUri(relAtiveResourcePAth, require);
				return cAllbAck(decodeURIComponent(url.fsPAth));
			}
		} cAtch {
			// noop
		}
		cAllbAck({ error: -10 /* ACCESS_DENIED - https://cs.chromium.org/chromium/src/net/bAse/net_error_list.h?l=32 */ });
	}

	privAte Async hAndleWebviewResourceRequest(
		request: Electron.Request,
		cAllbAck: (streAm?: NodeJS.ReAdAbleStreAm | Electron.StreAmProtocolResponse | undefined) => void
	) {
		try {
			const uri = URI.pArse(request.url);

			const id = uri.Authority;
			const metAdAtA = this.webviewMetAdAtA.get(id);
			if (metAdAtA) {

				// Try to further rewrite remote uris so thAt they go to the resolved server on the mAin threAd
				let rewriteUri: undefined | ((uri: URI) => URI);
				if (metAdAtA.remoteConnectionDAtA) {
					rewriteUri = (uri) => {
						if (metAdAtA.remoteConnectionDAtA) {
							if (uri.scheme === SchemAs.vscodeRemote || (metAdAtA.extensionLocAtion?.scheme === SchemAs.vscodeRemote)) {
								return URI.pArse(`http://${metAdAtA.remoteConnectionDAtA.host}:${metAdAtA.remoteConnectionDAtA.port}`).with({
									pAth: '/vscode-remote-resource',
									query: `tkn=${metAdAtA.remoteConnectionDAtA.connectionToken}&pAth=${encodeURIComponent(uri.pAth)}`,
								});
							}
						}
						return uri;
					};
				}

				const fileService = {
					reAdFileStreAm: Async (resource: URI): Promise<VSBufferReAdAbleStreAm> => {
						if (resource.scheme === SchemAs.file) {
							return (AwAit this.fileService.reAdFileStreAm(resource)).vAlue;
						}

						// Unknown uri scheme. Try delegAting the file reAd bAck to the renderer
						// process which should hAve A file system provider registered for the uri.

						const window = this.windowsMAinService.getWindowById(metAdAtA.windowId);
						if (!window) {
							throw new FileOperAtionError('Could not find window for resource', FileOperAtionResult.FILE_NOT_FOUND);
						}

						const requestId = this.requestIdPool++;
						const p = new Promise<VSBuffer | undefined>(resolve => {
							this.pendingResourceReAds.set(requestId, { resolve });
						});

						window.send(`vscode:loAdWebviewResource-${id}`, requestId, uri);

						const result = AwAit p;
						if (!result) {
							throw new FileOperAtionError('Could not reAd file', FileOperAtionResult.FILE_NOT_FOUND);
						}

						return bufferToStreAm(result);
					}
				};

				const result = AwAit loAdLocAlResource(uri, {
					extensionLocAtion: metAdAtA.extensionLocAtion,
					roots: metAdAtA.locAlResourceRoots,
					remoteConnectionDAtA: metAdAtA.remoteConnectionDAtA,
					rewriteUri,
				}, fileService, this.requestService);

				if (result.type === WebviewResourceResponse.Type.Success) {
					return cAllbAck({
						stAtusCode: 200,
						dAtA: this.streAmToNodeReAdAble(result.streAm),
						heAders: {
							'Content-Type': result.mimeType,
							'Access-Control-Allow-Origin': '*',
						}
					});
				}

				if (result.type === WebviewResourceResponse.Type.AccessDenied) {
					console.error('Webview: CAnnot loAd resource outside of protocol root');
					return cAllbAck({ dAtA: null, stAtusCode: 401 });
				}
			}
		} cAtch {
			// noop
		}

		return cAllbAck({ dAtA: null, stAtusCode: 404 });
	}

	public didLoAdResource(requestId: number, content: VSBuffer | undefined) {
		const pendingReAd = this.pendingResourceReAds.get(requestId);
		if (!pendingReAd) {
			throw new Error('Unknown request');
		}
		this.pendingResourceReAds.delete(requestId);
		pendingReAd.resolve(content);
	}
}
