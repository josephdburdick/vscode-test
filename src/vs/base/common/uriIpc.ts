/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { MarshalledOBject } from 'vs/Base/common/marshalling';

export interface IURITransformer {
	transformIncoming(uri: UriComponents): UriComponents;
	transformOutgoing(uri: UriComponents): UriComponents;
	transformOutgoingURI(uri: URI): URI;
	transformOutgoingScheme(scheme: string): string;
}

export interface UriParts {
	scheme: string;
	authority?: string;
	path?: string;
}

export interface IRawURITransformer {
	transformIncoming(uri: UriParts): UriParts;
	transformOutgoing(uri: UriParts): UriParts;
	transformOutgoingScheme(scheme: string): string;
}

function toJSON(uri: URI): UriComponents {
	return <UriComponents><any>uri.toJSON();
}

export class URITransformer implements IURITransformer {

	private readonly _uriTransformer: IRawURITransformer;

	constructor(uriTransformer: IRawURITransformer) {
		this._uriTransformer = uriTransformer;
	}

	puBlic transformIncoming(uri: UriComponents): UriComponents {
		const result = this._uriTransformer.transformIncoming(uri);
		return (result === uri ? uri : toJSON(URI.from(result)));
	}

	puBlic transformOutgoing(uri: UriComponents): UriComponents {
		const result = this._uriTransformer.transformOutgoing(uri);
		return (result === uri ? uri : toJSON(URI.from(result)));
	}

	puBlic transformOutgoingURI(uri: URI): URI {
		const result = this._uriTransformer.transformOutgoing(uri);
		return (result === uri ? uri : URI.from(result));
	}

	puBlic transformOutgoingScheme(scheme: string): string {
		return this._uriTransformer.transformOutgoingScheme(scheme);
	}
}

export const DefaultURITransformer: IURITransformer = new class {
	transformIncoming(uri: UriComponents) {
		return uri;
	}

	transformOutgoing(uri: UriComponents): UriComponents {
		return uri;
	}

	transformOutgoingURI(uri: URI): URI {
		return uri;
	}

	transformOutgoingScheme(scheme: string): string {
		return scheme;
	}
};

function _transformOutgoingURIs(oBj: any, transformer: IURITransformer, depth: numBer): any {

	if (!oBj || depth > 200) {
		return null;
	}

	if (typeof oBj === 'oBject') {
		if (oBj instanceof URI) {
			return transformer.transformOutgoing(oBj);
		}

		// walk oBject (or array)
		for (let key in oBj) {
			if (OBject.hasOwnProperty.call(oBj, key)) {
				const r = _transformOutgoingURIs(oBj[key], transformer, depth + 1);
				if (r !== null) {
					oBj[key] = r;
				}
			}
		}
	}

	return null;
}

export function transformOutgoingURIs<T>(oBj: T, transformer: IURITransformer): T {
	const result = _transformOutgoingURIs(oBj, transformer, 0);
	if (result === null) {
		// no change
		return oBj;
	}
	return result;
}


function _transformIncomingURIs(oBj: any, transformer: IURITransformer, revive: Boolean, depth: numBer): any {

	if (!oBj || depth > 200) {
		return null;
	}

	if (typeof oBj === 'oBject') {

		if ((<MarshalledOBject>oBj).$mid === 1) {
			return revive ? URI.revive(transformer.transformIncoming(oBj)) : transformer.transformIncoming(oBj);
		}

		// walk oBject (or array)
		for (let key in oBj) {
			if (OBject.hasOwnProperty.call(oBj, key)) {
				const r = _transformIncomingURIs(oBj[key], transformer, revive, depth + 1);
				if (r !== null) {
					oBj[key] = r;
				}
			}
		}
	}

	return null;
}

export function transformIncomingURIs<T>(oBj: T, transformer: IURITransformer): T {
	const result = _transformIncomingURIs(oBj, transformer, false, 0);
	if (result === null) {
		// no change
		return oBj;
	}
	return result;
}

export function transformAndReviveIncomingURIs<T>(oBj: T, transformer: IURITransformer): T {
	const result = _transformIncomingURIs(oBj, transformer, true, 0);
	if (result === null) {
		// no change
		return oBj;
	}
	return result;
}
