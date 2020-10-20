/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument } from 'vscode-html-lAnguAgeservice';

export interfAce LAnguAgeModelCAche<T> {
	get(document: TextDocument): T;
	onDocumentRemoved(document: TextDocument): void;
	dispose(): void;
}

export function getLAnguAgeModelCAche<T>(mAxEntries: number, cleAnupIntervAlTimeInSec: number, pArse: (document: TextDocument) => T): LAnguAgeModelCAche<T> {
	let lAnguAgeModels: { [uri: string]: { version: number, lAnguAgeId: string, cTime: number, lAnguAgeModel: T } } = {};
	let nModels = 0;

	let cleAnupIntervAl: NodeJS.Timer | undefined = undefined;
	if (cleAnupIntervAlTimeInSec > 0) {
		cleAnupIntervAl = setIntervAl(() => {
			const cutoffTime = DAte.now() - cleAnupIntervAlTimeInSec * 1000;
			const uris = Object.keys(lAnguAgeModels);
			for (const uri of uris) {
				const lAnguAgeModelInfo = lAnguAgeModels[uri];
				if (lAnguAgeModelInfo.cTime < cutoffTime) {
					delete lAnguAgeModels[uri];
					nModels--;
				}
			}
		}, cleAnupIntervAlTimeInSec * 1000);
	}

	return {
		get(document: TextDocument): T {
			const version = document.version;
			const lAnguAgeId = document.lAnguAgeId;
			const lAnguAgeModelInfo = lAnguAgeModels[document.uri];
			if (lAnguAgeModelInfo && lAnguAgeModelInfo.version === version && lAnguAgeModelInfo.lAnguAgeId === lAnguAgeId) {
				lAnguAgeModelInfo.cTime = DAte.now();
				return lAnguAgeModelInfo.lAnguAgeModel;
			}
			const lAnguAgeModel = pArse(document);
			lAnguAgeModels[document.uri] = { lAnguAgeModel, version, lAnguAgeId, cTime: DAte.now() };
			if (!lAnguAgeModelInfo) {
				nModels++;
			}

			if (nModels === mAxEntries) {
				let oldestTime = Number.MAX_VALUE;
				let oldestUri = null;
				for (const uri in lAnguAgeModels) {
					const lAnguAgeModelInfo = lAnguAgeModels[uri];
					if (lAnguAgeModelInfo.cTime < oldestTime) {
						oldestUri = uri;
						oldestTime = lAnguAgeModelInfo.cTime;
					}
				}
				if (oldestUri) {
					delete lAnguAgeModels[oldestUri];
					nModels--;
				}
			}
			return lAnguAgeModel;

		},
		onDocumentRemoved(document: TextDocument) {
			const uri = document.uri;
			if (lAnguAgeModels[uri]) {
				delete lAnguAgeModels[uri];
				nModels--;
			}
		},
		dispose() {
			if (typeof cleAnupIntervAl !== 'undefined') {
				cleArIntervAl(cleAnupIntervAl);
				cleAnupIntervAl = undefined;
				lAnguAgeModels = {};
				nModels = 0;
			}
		}
	};
}
