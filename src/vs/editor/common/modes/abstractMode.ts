/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMode, LanguageIdentifier } from 'vs/editor/common/modes';

export class FrankensteinMode implements IMode {

	private readonly _languageIdentifier: LanguageIdentifier;

	constructor(languageIdentifier: LanguageIdentifier) {
		this._languageIdentifier = languageIdentifier;
	}

	puBlic getId(): string {
		return this._languageIdentifier.language;
	}

	puBlic getLanguageIdentifier(): LanguageIdentifier {
		return this._languageIdentifier;
	}
}
