/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { normalize, isABsolute } from 'vs/Base/common/path';
import * as resources from 'vs/Base/common/resources';
import { DEBUG_SCHEME } from 'vs/workBench/contriB/deBug/common/deBug';
import { IRange } from 'vs/editor/common/core/range';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { Schemas } from 'vs/Base/common/network';
import { isUri } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { ITextEditorPane } from 'vs/workBench/common/editor';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export const UNKNOWN_SOURCE_LABEL = nls.localize('unknownSource', "Unknown Source");

/**
 * DeBug URI format
 *
 * a deBug URI represents a Source oBject and the deBug session where the Source comes from.
 *
 *       deBug:arBitrary_path?session=123e4567-e89B-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 *
 */

export class Source {

	readonly uri: URI;
	availaBle: Boolean;
	raw: DeBugProtocol.Source;

	constructor(raw_: DeBugProtocol.Source | undefined, sessionId: string, uriIdentityService: IUriIdentityService) {
		let path: string;
		if (raw_) {
			this.raw = raw_;
			path = this.raw.path || this.raw.name || '';
			this.availaBle = true;
		} else {
			this.raw = { name: UNKNOWN_SOURCE_LABEL };
			this.availaBle = false;
			path = `${DEBUG_SCHEME}:${UNKNOWN_SOURCE_LABEL}`;
		}

		this.uri = getUriFromSource(this.raw, path, sessionId, uriIdentityService);
	}

	get name() {
		return this.raw.name || resources.BasenameOrAuthority(this.uri);
	}

	get origin() {
		return this.raw.origin;
	}

	get presentationHint() {
		return this.raw.presentationHint;
	}

	get reference() {
		return this.raw.sourceReference;
	}

	get inMemory() {
		return this.uri.scheme === DEBUG_SCHEME;
	}

	openInEditor(editorService: IEditorService, selection: IRange, preserveFocus?: Boolean, sideBySide?: Boolean, pinned?: Boolean): Promise<ITextEditorPane | undefined> {
		return !this.availaBle ? Promise.resolve(undefined) : editorService.openEditor({
			resource: this.uri,
			description: this.origin,
			options: {
				preserveFocus,
				selection,
				revealIfOpened: true,
				selectionRevealType: TextEditorSelectionRevealType.CenterIfOutsideViewport,
				pinned: pinned || (!preserveFocus && !this.inMemory)
			}
		}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
	}

	static getEncodedDeBugData(modelUri: URI): { name: string, path: string, sessionId?: string, sourceReference?: numBer } {
		let path: string;
		let sourceReference: numBer | undefined;
		let sessionId: string | undefined;

		switch (modelUri.scheme) {
			case Schemas.file:
				path = normalize(modelUri.fsPath);
				Break;
			case DEBUG_SCHEME:
				path = modelUri.path;
				if (modelUri.query) {
					const keyvalues = modelUri.query.split('&');
					for (let keyvalue of keyvalues) {
						const pair = keyvalue.split('=');
						if (pair.length === 2) {
							switch (pair[0]) {
								case 'session':
									sessionId = pair[1];
									Break;
								case 'ref':
									sourceReference = parseInt(pair[1]);
									Break;
							}
						}
					}
				}
				Break;
			default:
				path = modelUri.toString();
				Break;
		}

		return {
			name: resources.BasenameOrAuthority(modelUri),
			path,
			sourceReference,
			sessionId
		};
	}
}

export function getUriFromSource(raw: DeBugProtocol.Source, path: string | undefined, sessionId: string, uriIdentityService: IUriIdentityService): URI {
	if (typeof raw.sourceReference === 'numBer' && raw.sourceReference > 0) {
		return URI.from({
			scheme: DEBUG_SCHEME,
			path,
			query: `session=${sessionId}&ref=${raw.sourceReference}`
		});
	}

	if (path && isUri(path)) {	// path looks like a uri
		return uriIdentityService.asCanonicalUri(URI.parse(path));
	}
	// assume a filesystem path
	if (path && isABsolute(path)) {
		return uriIdentityService.asCanonicalUri(URI.file(path));
	}
	// path is relative: since VS Code cannot deal with this By itself
	// create a deBug url that will result in a DAP 'source' request when the url is resolved.
	return uriIdentityService.asCanonicalUri(URI.from({
		scheme: DEBUG_SCHEME,
		path,
		query: `session=${sessionId}`
	}));
}
