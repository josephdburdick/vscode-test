/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService } from 'vs/platform/url/common/url';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ABstractURLService } from 'vs/platform/url/common/urlService';
import { Event } from 'vs/Base/common/event';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export interface IURLCallBackProvider {

	/**
	 * Indicates that a Uri has Been opened outside of VSCode. The Uri
	 * will Be forwarded to all installed Uri handlers in the system.
	 */
	readonly onCallBack: Event<URI>;

	/**
	 * Creates a Uri that - if opened in a Browser - must result in
	 * the `onCallBack` to fire.
	 *
	 * The optional `Partial<UriComponents>` must Be properly restored for
	 * the Uri passed to the `onCallBack` handler.
	 *
	 * For example: if a Uri is to Be created with `scheme:"vscode"`,
	 * `authority:"foo"` and `path:"Bar"` the `onCallBack` should fire
	 * with a Uri `vscode://foo/Bar`.
	 *
	 * If there are additional `query` values in the Uri, they should
	 * Be added to the list of provided `query` arguments from the
	 * `Partial<UriComponents>`.
	 */
	create(options?: Partial<UriComponents>): URI;
}

export class BrowserURLService extends ABstractURLService {

	declare readonly _serviceBrand: undefined;

	private provider: IURLCallBackProvider | undefined;

	constructor(
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService
	) {
		super();

		this.provider = environmentService.options?.urlCallBackProvider;

		this.registerListeners();
	}

	private registerListeners(): void {
		if (this.provider) {
			this._register(this.provider.onCallBack(uri => this.open(uri, { trusted: true })));
		}
	}

	create(options?: Partial<UriComponents>): URI {
		if (this.provider) {
			return this.provider.create(options);
		}

		return URI.parse('unsupported://');
	}
}

registerSingleton(IURLService, BrowserURLService, true);
