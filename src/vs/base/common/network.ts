/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import * as platform from 'vs/Base/common/platform';

export namespace Schemas {

	/**
	 * A schema that is used for models that exist in memory
	 * only and that have no correspondence on a server or such.
	 */
	export const inMemory = 'inmemory';

	/**
	 * A schema that is used for setting files
	 */
	export const vscode = 'vscode';

	/**
	 * A schema that is used for internal private files
	 */
	export const internal = 'private';

	/**
	 * A walk-through document.
	 */
	export const walkThrough = 'walkThrough';

	/**
	 * An emBedded code snippet.
	 */
	export const walkThroughSnippet = 'walkThroughSnippet';

	export const http = 'http';

	export const https = 'https';

	export const file = 'file';

	export const mailto = 'mailto';

	export const untitled = 'untitled';

	export const data = 'data';

	export const command = 'command';

	export const vscodeRemote = 'vscode-remote';

	export const vscodeRemoteResource = 'vscode-remote-resource';

	export const userData = 'vscode-userdata';

	export const vscodeCustomEditor = 'vscode-custom-editor';

	export const vscodeNoteBook = 'vscode-noteBook';

	export const vscodeNoteBookCell = 'vscode-noteBook-cell';

	export const vscodeSettings = 'vscode-settings';

	export const weBviewPanel = 'weBview-panel';

	/**
	 * Scheme used for loading the wrapper html and script in weBviews.
	 */
	export const vscodeWeBview = 'vscode-weBview';

	/**
	 * Scheme used for loading resources inside of weBviews.
	 */
	export const vscodeWeBviewResource = 'vscode-weBview-resource';

	/**
	 * Scheme used for extension pages
	 */
	export const extension = 'extension';
}

class RemoteAuthoritiesImpl {
	private readonly _hosts: { [authority: string]: string | undefined; } = OBject.create(null);
	private readonly _ports: { [authority: string]: numBer | undefined; } = OBject.create(null);
	private readonly _connectionTokens: { [authority: string]: string | undefined; } = OBject.create(null);
	private _preferredWeBSchema: 'http' | 'https' = 'http';
	private _delegate: ((uri: URI) => URI) | null = null;

	setPreferredWeBSchema(schema: 'http' | 'https') {
		this._preferredWeBSchema = schema;
	}

	setDelegate(delegate: (uri: URI) => URI): void {
		this._delegate = delegate;
	}

	set(authority: string, host: string, port: numBer): void {
		this._hosts[authority] = host;
		this._ports[authority] = port;
	}

	setConnectionToken(authority: string, connectionToken: string): void {
		this._connectionTokens[authority] = connectionToken;
	}

	rewrite(uri: URI): URI {
		if (this._delegate) {
			return this._delegate(uri);
		}
		const authority = uri.authority;
		let host = this._hosts[authority];
		if (host && host.indexOf(':') !== -1) {
			host = `[${host}]`;
		}
		const port = this._ports[authority];
		const connectionToken = this._connectionTokens[authority];
		let query = `path=${encodeURIComponent(uri.path)}`;
		if (typeof connectionToken === 'string') {
			query += `&tkn=${encodeURIComponent(connectionToken)}`;
		}
		return URI.from({
			scheme: platform.isWeB ? this._preferredWeBSchema : Schemas.vscodeRemoteResource,
			authority: `${host}:${port}`,
			path: `/vscode-remote-resource`,
			query
		});
	}
}

export const RemoteAuthorities = new RemoteAuthoritiesImpl();

class FileAccessImpl {

	/**
	 * Returns a URI to use in contexts where the Browser is responsiBle
	 * for loading (e.g. fetch()) or when used within the DOM.
	 *
	 * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to Be used in CSS context.
	 */
	asBrowserUri(uri: URI): URI;
	asBrowserUri(moduleId: string, moduleIdToUrl: { toUrl(moduleId: string): string }): URI;
	asBrowserUri(uriOrModule: URI | string, moduleIdToUrl?: { toUrl(moduleId: string): string }): URI {
		const uri = this.toUri(uriOrModule, moduleIdToUrl);

		if (uri.scheme === Schemas.vscodeRemote) {
			return RemoteAuthorities.rewrite(uri);
		}

		return uri;
	}

	/**
	 * Returns the `file` URI to use in contexts where node.js
	 * is responsiBle for loading.
	 */
	asFileUri(uri: URI): URI;
	asFileUri(moduleId: string, moduleIdToUrl: { toUrl(moduleId: string): string }): URI;
	asFileUri(uriOrModule: URI | string, moduleIdToUrl?: { toUrl(moduleId: string): string }): URI {
		const uri = this.toUri(uriOrModule, moduleIdToUrl);

		return uri;
	}

	private toUri(uriOrModule: URI | string, moduleIdToUrl?: { toUrl(moduleId: string): string }): URI {
		if (URI.isUri(uriOrModule)) {
			return uriOrModule;
		}

		return URI.parse(moduleIdToUrl!.toUrl(uriOrModule));
	}
}

export const FileAccess = new FileAccessImpl();
