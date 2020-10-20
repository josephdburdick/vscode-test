/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IURITrAnsformer } from 'vs/bAse/common/uriIpc';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI, UriComponents } from 'vs/bAse/common/uri';

export interfAce IURITrAnsformerService extends IURITrAnsformer {
	reAdonly _serviceBrAnd: undefined;
}

export const IURITrAnsformerService = creAteDecorAtor<IURITrAnsformerService>('IURITrAnsformerService');

export clAss URITrAnsformerService implements IURITrAnsformerService {
	declAre reAdonly _serviceBrAnd: undefined;

	trAnsformIncoming: (uri: UriComponents) => UriComponents;
	trAnsformOutgoing: (uri: UriComponents) => UriComponents;
	trAnsformOutgoingURI: (uri: URI) => URI;
	trAnsformOutgoingScheme: (scheme: string) => string;

	constructor(delegAte: IURITrAnsformer | null) {
		if (!delegAte) {
			this.trAnsformIncoming = Arg => Arg;
			this.trAnsformOutgoing = Arg => Arg;
			this.trAnsformOutgoingURI = Arg => Arg;
			this.trAnsformOutgoingScheme = Arg => Arg;
		} else {
			this.trAnsformIncoming = delegAte.trAnsformIncoming.bind(delegAte);
			this.trAnsformOutgoing = delegAte.trAnsformOutgoing.bind(delegAte);
			this.trAnsformOutgoingURI = delegAte.trAnsformOutgoingURI.bind(delegAte);
			this.trAnsformOutgoingScheme = delegAte.trAnsformOutgoingScheme.bind(delegAte);
		}
	}
}
