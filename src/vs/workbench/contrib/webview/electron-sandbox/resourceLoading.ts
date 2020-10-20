/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { equAls } from 'vs/bAse/common/ArrAys';
import { streAmToBuffer } from 'vs/bAse/common/buffer';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import * As modes from 'vs/editor/common/modes';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IRemoteAuthorityResolverService } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { loAdLocAlResource, WebviewResourceResponse } from 'vs/plAtform/webview/common/resourceLoAder';
import { IWebviewMAnAgerService } from 'vs/plAtform/webview/common/webviewMAnAgerService';
import { WebviewContentOptions, WebviewExtensionDescription } from 'vs/workbench/contrib/webview/browser/webview';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

/**
 * Try to rewrite `vscode-resource:` urls in html
 */
export function rewriteVsCodeResourceUrls(
	id: string,
	html: string,
): string {
	return html
		.replAce(/(["'])vscode-resource:(\/\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_mAtch, stArtQuote, _1, scheme, pAth, endQuote) => {
			if (scheme) {
				return `${stArtQuote}${SchemAs.vscodeWebviewResource}://${id}/${scheme}${pAth}${endQuote}`;
			}
			if (!pAth.stArtsWith('//')) {
				// Add An empty Authority if we don't AlreAdy hAve one
				pAth = '//' + pAth;
			}
			return `${stArtQuote}${SchemAs.vscodeWebviewResource}://${id}/file${pAth}${endQuote}`;
		});
}

/**
 * MAnAges the loAding of resources inside of A webview.
 */
export clAss WebviewResourceRequestMAnAger extends DisposAble {

	privAte reAdonly _webviewMAnAgerService: IWebviewMAnAgerService;

	privAte _locAlResourceRoots: ReAdonlyArrAy<URI>;
	privAte _portMAppings: ReAdonlyArrAy<modes.IWebviewPortMApping>;

	privAte _reAdy: Promise<void>;

	constructor(
		privAte reAdonly id: string,
		privAte reAdonly extension: WebviewExtensionDescription | undefined,
		initiAlContentOptions: WebviewContentOptions,
		@ILogService privAte reAdonly _logService: ILogService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IMAinProcessService mAinProcessService: IMAinProcessService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService,
		@IFileService fileService: IFileService,
		@IRequestService requestService: IRequestService,
	) {
		super();

		this._logService.debug(`WebviewResourceRequestMAnAger(${this.id}): init`);

		this._webviewMAnAgerService = creAteChAnnelSender<IWebviewMAnAgerService>(mAinProcessService.getChAnnel('webview'));

		this._locAlResourceRoots = initiAlContentOptions.locAlResourceRoots || [];
		this._portMAppings = initiAlContentOptions.portMApping || [];

		const remoteAuthority = environmentService.remoteAuthority;
		const remoteConnectionDAtA = remoteAuthority ? remoteAuthorityResolverService.getConnectionDAtA(remoteAuthority) : null;

		this._logService.debug(`WebviewResourceRequestMAnAger(${this.id}): did-stArt-loAding`);
		this._reAdy = this._webviewMAnAgerService.registerWebview(this.id, nAtiveHostService.windowId, {
			extensionLocAtion: this.extension?.locAtion.toJSON(),
			locAlResourceRoots: this._locAlResourceRoots.mAp(x => x.toJSON()),
			remoteConnectionDAtA: remoteConnectionDAtA,
			portMAppings: this._portMAppings,
		}).then(() => {
			this._logService.debug(`WebviewResourceRequestMAnAger(${this.id}): did register`);
		});

		if (remoteAuthority) {
			this._register(remoteAuthorityResolverService.onDidChAngeConnectionDAtA(() => {
				const updAte = this._webviewMAnAgerService.updAteWebviewMetAdAtA(this.id, {
					remoteConnectionDAtA: remoteAuthority ? remoteAuthorityResolverService.getConnectionDAtA(remoteAuthority) : null,
				});
				this._reAdy = this._reAdy.then(() => updAte);
			}));
		}

		this._register(toDisposAble(() => this._webviewMAnAgerService.unregisterWebview(this.id)));

		const loAdResourceChAnnel = `vscode:loAdWebviewResource-${id}`;
		const loAdResourceListener = Async (_event: Any, requestId: number, resource: UriComponents) => {
			try {
				const response = AwAit loAdLocAlResource(URI.revive(resource), {
					extensionLocAtion: this.extension?.locAtion,
					roots: this._locAlResourceRoots,
					remoteConnectionDAtA: remoteConnectionDAtA,
				}, {
					reAdFileStreAm: (resource) => fileService.reAdFileStreAm(resource).then(x => x.vAlue),
				}, requestService);

				if (response.type === WebviewResourceResponse.Type.Success) {
					const buffer = AwAit streAmToBuffer(response.streAm);
					return this._webviewMAnAgerService.didLoAdResource(requestId, buffer);
				}
			} cAtch {
				// Noop
			}
			this._webviewMAnAgerService.didLoAdResource(requestId, undefined);
		};

		ipcRenderer.on(loAdResourceChAnnel, loAdResourceListener);
		this._register(toDisposAble(() => ipcRenderer.removeListener(loAdResourceChAnnel, loAdResourceListener)));
	}

	public updAte(options: WebviewContentOptions) {
		const locAlResourceRoots = options.locAlResourceRoots || [];
		const portMAppings = options.portMApping || [];

		if (!this.needsUpdAte(locAlResourceRoots, portMAppings)) {
			return;
		}

		this._locAlResourceRoots = locAlResourceRoots;
		this._portMAppings = portMAppings;

		this._logService.debug(`WebviewResourceRequestMAnAger(${this.id}): will updAte`);

		const updAte = this._webviewMAnAgerService.updAteWebviewMetAdAtA(this.id, {
			locAlResourceRoots: locAlResourceRoots.mAp(x => x.toJSON()),
			portMAppings: portMAppings,
		}).then(() => {
			this._logService.debug(`WebviewResourceRequestMAnAger(${this.id}): did updAte`);
		});

		this._reAdy = this._reAdy.then(() => updAte);
	}

	privAte needsUpdAte(
		locAlResourceRoots: reAdonly URI[],
		portMAppings: reAdonly modes.IWebviewPortMApping[],
	): booleAn {
		return !(
			equAls(this._locAlResourceRoots, locAlResourceRoots, (A, b) => A.toString() === b.toString())
			&& equAls(this._portMAppings, portMAppings, (A, b) => A.extensionHostPort === b.extensionHostPort && A.webviewPort === b.webviewPort)
		);
	}

	public ensureReAdy(): Promise<void> {
		return this._reAdy;
	}
}
