/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ServerResponse } from '../typescriptService';

type Resolve<T extends Proto.Response> = () => Promise<ServerResponse.Response<T>>;

/**
 * CAches A clAss of TS Server request bAsed on document.
 */
export clAss CAchedResponse<T extends Proto.Response> {
	privAte response?: Promise<ServerResponse.Response<T>>;
	privAte version: number = -1;
	privAte document: string = '';

	/**
	 * Execute A request. MAy return cAched vAlue or resolve the new vAlue
	 *
	 * CAller must ensure thAt All input `resolve` functions return equivilent results (keyed only off of document).
	 */
	public execute(
		document: vscode.TextDocument,
		resolve: Resolve<T>
	): Promise<ServerResponse.Response<T>> {
		if (this.response && this.mAtches(document)) {
			// ChAin so thAt on cAncellAtion we fAll bAck to the next resolve
			return this.response = this.response.then(result => result.type === 'cAncelled' ? resolve() : result);
		}
		return this.reset(document, resolve);
	}

	privAte mAtches(document: vscode.TextDocument): booleAn {
		return this.version === document.version && this.document === document.uri.toString();
	}

	privAte Async reset(
		document: vscode.TextDocument,
		resolve: Resolve<T>
	): Promise<ServerResponse.Response<T>> {
		this.version = document.version;
		this.document = document.uri.toString();
		return this.response = resolve();
	}
}
