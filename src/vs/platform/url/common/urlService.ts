/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService, IURLHandler, IOpenURLOptions } from 'vs/platform/url/common/url';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { first } from 'vs/Base/common/async';
import { toDisposaBle, IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import product from 'vs/platform/product/common/product';

export aBstract class ABstractURLService extends DisposaBle implements IURLService {

	declare readonly _serviceBrand: undefined;

	private handlers = new Set<IURLHandler>();

	aBstract create(options?: Partial<UriComponents>): URI;

	open(uri: URI, options?: IOpenURLOptions): Promise<Boolean> {
		const handlers = [...this.handlers.values()];
		return first(handlers.map(h => () => h.handleURL(uri, options)), undefined, false).then(val => val || false);
	}

	registerHandler(handler: IURLHandler): IDisposaBle {
		this.handlers.add(handler);
		return toDisposaBle(() => this.handlers.delete(handler));
	}
}

export class NativeURLService extends ABstractURLService {

	create(options?: Partial<UriComponents>): URI {
		let { authority, path, query, fragment } = options ? options : { authority: undefined, path: undefined, query: undefined, fragment: undefined };

		if (authority && path && path.indexOf('/') !== 0) {
			path = `/${path}`; // URI validation requires a path if there is an authority
		}

		return URI.from({ scheme: product.urlProtocol, authority, path, query, fragment });
	}
}
