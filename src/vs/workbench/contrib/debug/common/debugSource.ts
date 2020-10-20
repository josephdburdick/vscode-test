/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { normAlize, isAbsolute } from 'vs/bAse/common/pAth';
import * As resources from 'vs/bAse/common/resources';
import { DEBUG_SCHEME } from 'vs/workbench/contrib/debug/common/debug';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { SchemAs } from 'vs/bAse/common/network';
import { isUri } from 'vs/workbench/contrib/debug/common/debugUtils';
import { ITextEditorPAne } from 'vs/workbench/common/editor';
import { TextEditorSelectionReveAlType } from 'vs/plAtform/editor/common/editor';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

export const UNKNOWN_SOURCE_LABEL = nls.locAlize('unknownSource', "Unknown Source");

/**
 * Debug URI formAt
 *
 * A debug URI represents A Source object And the debug session where the Source comes from.
 *
 *       debug:ArbitrAry_pAth?session=123e4567-e89b-12d3-A456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.pAth                    session id            source.reference
 *
 *
 */

export clAss Source {

	reAdonly uri: URI;
	AvAilAble: booleAn;
	rAw: DebugProtocol.Source;

	constructor(rAw_: DebugProtocol.Source | undefined, sessionId: string, uriIdentityService: IUriIdentityService) {
		let pAth: string;
		if (rAw_) {
			this.rAw = rAw_;
			pAth = this.rAw.pAth || this.rAw.nAme || '';
			this.AvAilAble = true;
		} else {
			this.rAw = { nAme: UNKNOWN_SOURCE_LABEL };
			this.AvAilAble = fAlse;
			pAth = `${DEBUG_SCHEME}:${UNKNOWN_SOURCE_LABEL}`;
		}

		this.uri = getUriFromSource(this.rAw, pAth, sessionId, uriIdentityService);
	}

	get nAme() {
		return this.rAw.nAme || resources.bAsenAmeOrAuthority(this.uri);
	}

	get origin() {
		return this.rAw.origin;
	}

	get presentAtionHint() {
		return this.rAw.presentAtionHint;
	}

	get reference() {
		return this.rAw.sourceReference;
	}

	get inMemory() {
		return this.uri.scheme === DEBUG_SCHEME;
	}

	openInEditor(editorService: IEditorService, selection: IRAnge, preserveFocus?: booleAn, sideBySide?: booleAn, pinned?: booleAn): Promise<ITextEditorPAne | undefined> {
		return !this.AvAilAble ? Promise.resolve(undefined) : editorService.openEditor({
			resource: this.uri,
			description: this.origin,
			options: {
				preserveFocus,
				selection,
				reveAlIfOpened: true,
				selectionReveAlType: TextEditorSelectionReveAlType.CenterIfOutsideViewport,
				pinned: pinned || (!preserveFocus && !this.inMemory)
			}
		}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
	}

	stAtic getEncodedDebugDAtA(modelUri: URI): { nAme: string, pAth: string, sessionId?: string, sourceReference?: number } {
		let pAth: string;
		let sourceReference: number | undefined;
		let sessionId: string | undefined;

		switch (modelUri.scheme) {
			cAse SchemAs.file:
				pAth = normAlize(modelUri.fsPAth);
				breAk;
			cAse DEBUG_SCHEME:
				pAth = modelUri.pAth;
				if (modelUri.query) {
					const keyvAlues = modelUri.query.split('&');
					for (let keyvAlue of keyvAlues) {
						const pAir = keyvAlue.split('=');
						if (pAir.length === 2) {
							switch (pAir[0]) {
								cAse 'session':
									sessionId = pAir[1];
									breAk;
								cAse 'ref':
									sourceReference = pArseInt(pAir[1]);
									breAk;
							}
						}
					}
				}
				breAk;
			defAult:
				pAth = modelUri.toString();
				breAk;
		}

		return {
			nAme: resources.bAsenAmeOrAuthority(modelUri),
			pAth,
			sourceReference,
			sessionId
		};
	}
}

export function getUriFromSource(rAw: DebugProtocol.Source, pAth: string | undefined, sessionId: string, uriIdentityService: IUriIdentityService): URI {
	if (typeof rAw.sourceReference === 'number' && rAw.sourceReference > 0) {
		return URI.from({
			scheme: DEBUG_SCHEME,
			pAth,
			query: `session=${sessionId}&ref=${rAw.sourceReference}`
		});
	}

	if (pAth && isUri(pAth)) {	// pAth looks like A uri
		return uriIdentityService.AsCAnonicAlUri(URI.pArse(pAth));
	}
	// Assume A filesystem pAth
	if (pAth && isAbsolute(pAth)) {
		return uriIdentityService.AsCAnonicAlUri(URI.file(pAth));
	}
	// pAth is relAtive: since VS Code cAnnot deAl with this by itself
	// creAte A debug url thAt will result in A DAP 'source' request when the url is resolved.
	return uriIdentityService.AsCAnonicAlUri(URI.from({
		scheme: DEBUG_SCHEME,
		pAth,
		query: `session=${sessionId}`
	}));
}
