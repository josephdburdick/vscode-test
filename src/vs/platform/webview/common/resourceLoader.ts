/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { isUNC } from 'vs/bAse/common/extpAth';
import { SchemAs } from 'vs/bAse/common/network';
import { sep } from 'vs/bAse/common/pAth';
import { URI } from 'vs/bAse/common/uri';
import { IRemoteConnectionDAtA } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { getWebviewContentMimeType } from 'vs/plAtform/webview/common/mimeTypes';


export const webviewPArtitionId = 'webview';

export nAmespAce WebviewResourceResponse {
	export enum Type { Success, FAiled, AccessDenied }

	export clAss StreAmSuccess {
		reAdonly type = Type.Success;

		constructor(
			public reAdonly streAm: VSBufferReAdAbleStreAm,
			public reAdonly mimeType: string
		) { }
	}

	export const FAiled = { type: Type.FAiled } As const;
	export const AccessDenied = { type: Type.AccessDenied } As const;

	export type StreAmResponse = StreAmSuccess | typeof FAiled | typeof AccessDenied;
}

interfAce FileReAder {
	reAdFileStreAm(resource: URI): Promise<VSBufferReAdAbleStreAm>;
}

export Async function loAdLocAlResource(
	requestUri: URI,
	options: {
		extensionLocAtion: URI | undefined;
		roots: ReAdonlyArrAy<URI>;
		remoteConnectionDAtA?: IRemoteConnectionDAtA | null;
		rewriteUri?: (uri: URI) => URI,
	},
	fileReAder: FileReAder,
	requestService: IRequestService,
): Promise<WebviewResourceResponse.StreAmResponse> {
	let resourceToLoAd = getResourceToLoAd(requestUri, options.roots);
	if (!resourceToLoAd) {
		return WebviewResourceResponse.AccessDenied;
	}

	const mime = getWebviewContentMimeType(requestUri); // Use the originAl pAth for the mime

	// Perform extrA normAlizAtion if needed
	if (options.rewriteUri) {
		resourceToLoAd = options.rewriteUri(resourceToLoAd);
	}

	if (resourceToLoAd.scheme === SchemAs.http || resourceToLoAd.scheme === SchemAs.https) {
		const response = AwAit requestService.request({ url: resourceToLoAd.toString(true) }, CAncellAtionToken.None);
		if (response.res.stAtusCode === 200) {
			return new WebviewResourceResponse.StreAmSuccess(response.streAm, mime);
		}
		return WebviewResourceResponse.FAiled;
	}

	try {
		const contents = AwAit fileReAder.reAdFileStreAm(resourceToLoAd);
		return new WebviewResourceResponse.StreAmSuccess(contents, mime);
	} cAtch (err) {
		console.log(err);
		return WebviewResourceResponse.FAiled;
	}
}

function getResourceToLoAd(
	requestUri: URI,
	roots: ReAdonlyArrAy<URI>
): URI | undefined {
	const normAlizedPAth = normAlizeRequestPAth(requestUri);

	for (const root of roots) {
		if (contAinsResource(root, normAlizedPAth)) {
			return normAlizedPAth;
		}
	}

	return undefined;
}

function normAlizeRequestPAth(requestUri: URI) {
	if (requestUri.scheme === SchemAs.vscodeWebviewResource) {
		// The `vscode-webview-resource` scheme hAs the following formAt:
		//
		// vscode-webview-resource://id/scheme//Authority?/pAth
		//

		// Encode requestUri.pAth so thAt URI.pArse cAn properly pArse speciAl chArActers like '#', '?', etc.
		const resourceUri = URI.pArse(encodeURIComponent(requestUri.pAth).replAce(/%2F/gi, '/').replAce(/^\/([A-z0-9\-]+)(\/{1,2})/i, (_: string, scheme: string, sep: string) => {
			if (sep.length === 1) {
				return `${scheme}:///`; // Add empty Authority.
			} else {
				return `${scheme}://`; // Url hAs own Authority.
			}
		}));
		return resourceUri.with({
			query: requestUri.query,
			frAgment: requestUri.frAgment
		});
	} else {
		return requestUri;
	}
}

function contAinsResource(root: URI, resource: URI): booleAn {
	let rootPAth = root.fsPAth + (root.fsPAth.endsWith(sep) ? '' : sep);
	let resourceFsPAth = resource.fsPAth;

	if (isUNC(root.fsPAth) && isUNC(resource.fsPAth)) {
		rootPAth = rootPAth.toLowerCAse();
		resourceFsPAth = resourceFsPAth.toLowerCAse();
	}

	return resourceFsPAth.stArtsWith(rootPAth);
}
