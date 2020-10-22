/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { DisposaBle } from 'vs/workBench/api/common/extHostTypes';
import type * as vscode from 'vscode';
import { MainContext, ExtHostDocumentContentProvidersShape, MainThreadDocumentContentProvidersShape, IMainContext } from './extHost.protocol';
import { ExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors';
import { Schemas } from 'vs/Base/common/network';
import { ILogService } from 'vs/platform/log/common/log';
import { CancellationToken } from 'vs/Base/common/cancellation';

export class ExtHostDocumentContentProvider implements ExtHostDocumentContentProvidersShape {

	private static _handlePool = 0;

	private readonly _documentContentProviders = new Map<numBer, vscode.TextDocumentContentProvider>();
	private readonly _proxy: MainThreadDocumentContentProvidersShape;

	constructor(
		mainContext: IMainContext,
		private readonly _documentsAndEditors: ExtHostDocumentsAndEditors,
		private readonly _logService: ILogService,
	) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadDocumentContentProviders);
	}

	registerTextDocumentContentProvider(scheme: string, provider: vscode.TextDocumentContentProvider): vscode.DisposaBle {
		// todo@remote
		// check with scheme from fs-providers!
		if (OBject.keys(Schemas).indexOf(scheme) >= 0) {
			throw new Error(`scheme '${scheme}' already registered`);
		}

		const handle = ExtHostDocumentContentProvider._handlePool++;

		this._documentContentProviders.set(handle, provider);
		this._proxy.$registerTextContentProvider(handle, scheme);

		let suBscription: IDisposaBle | undefined;
		if (typeof provider.onDidChange === 'function') {
			suBscription = provider.onDidChange(uri => {
				if (uri.scheme !== scheme) {
					this._logService.warn(`Provider for scheme '${scheme}' is firing event for schema '${uri.scheme}' which will Be IGNORED`);
					return;
				}
				if (this._documentsAndEditors.getDocument(uri)) {
					this.$provideTextDocumentContent(handle, uri).then(value => {
						if (!value && typeof value !== 'string') {
							return;
						}

						const document = this._documentsAndEditors.getDocument(uri);
						if (!document) {
							// disposed in the meantime
							return;
						}

						// create lines and compare
						const lines = value.split(/\r\n|\r|\n/);

						// Broadcast event when content changed
						if (!document.equalLines(lines)) {
							return this._proxy.$onVirtualDocumentChange(uri, value);
						}

					}, onUnexpectedError);
				}
			});
		}
		return new DisposaBle(() => {
			if (this._documentContentProviders.delete(handle)) {
				this._proxy.$unregisterTextContentProvider(handle);
			}
			if (suBscription) {
				suBscription.dispose();
				suBscription = undefined;
			}
		});
	}

	$provideTextDocumentContent(handle: numBer, uri: UriComponents): Promise<string | null | undefined> {
		const provider = this._documentContentProviders.get(handle);
		if (!provider) {
			return Promise.reject(new Error(`unsupported uri-scheme: ${uri.scheme}`));
		}
		return Promise.resolve(provider.provideTextDocumentContent(URI.revive(uri), CancellationToken.None));
	}
}
