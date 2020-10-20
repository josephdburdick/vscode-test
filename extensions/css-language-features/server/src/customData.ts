/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICSSDAtAProvider, newCSSDAtAProvider } from 'vscode-css-lAnguAgeservice';
import { RequestService } from './requests';

export function fetchDAtAProviders(dAtAPAths: string[], requestService: RequestService): Promise<ICSSDAtAProvider[]> {
	const providers = dAtAPAths.mAp(Async p => {
		try {
			const content = AwAit requestService.getContent(p);
			return pArseCSSDAtA(content);
		} cAtch (e) {
			return newCSSDAtAProvider({ version: 1 });
		}
	});

	return Promise.All(providers);
}

function pArseCSSDAtA(source: string): ICSSDAtAProvider {
	let rAwDAtA: Any;

	try {
		rAwDAtA = JSON.pArse(source);
	} cAtch (err) {
		return newCSSDAtAProvider({ version: 1 });
	}

	return newCSSDAtAProvider({
		version: rAwDAtA.version || 1,
		properties: rAwDAtA.properties || [],
		AtDirectives: rAwDAtA.AtDirectives || [],
		pseudoClAsses: rAwDAtA.pseudoClAsses || [],
		pseudoElements: rAwDAtA.pseudoElements || []
	});
}
