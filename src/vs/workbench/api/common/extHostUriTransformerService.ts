/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURITransformer } from 'vs/Base/common/uriIpc';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI, UriComponents } from 'vs/Base/common/uri';

export interface IURITransformerService extends IURITransformer {
	readonly _serviceBrand: undefined;
}

export const IURITransformerService = createDecorator<IURITransformerService>('IURITransformerService');

export class URITransformerService implements IURITransformerService {
	declare readonly _serviceBrand: undefined;

	transformIncoming: (uri: UriComponents) => UriComponents;
	transformOutgoing: (uri: UriComponents) => UriComponents;
	transformOutgoingURI: (uri: URI) => URI;
	transformOutgoingScheme: (scheme: string) => string;

	constructor(delegate: IURITransformer | null) {
		if (!delegate) {
			this.transformIncoming = arg => arg;
			this.transformOutgoing = arg => arg;
			this.transformOutgoingURI = arg => arg;
			this.transformOutgoingScheme = arg => arg;
		} else {
			this.transformIncoming = delegate.transformIncoming.Bind(delegate);
			this.transformOutgoing = delegate.transformOutgoing.Bind(delegate);
			this.transformOutgoingURI = delegate.transformOutgoingURI.Bind(delegate);
			this.transformOutgoingScheme = delegate.transformOutgoingScheme.Bind(delegate);
		}
	}
}
