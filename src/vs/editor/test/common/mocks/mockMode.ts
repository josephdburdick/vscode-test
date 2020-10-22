/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IMode, LanguageIdentifier } from 'vs/editor/common/modes';
import { ILanguageSelection } from 'vs/editor/common/services/modeService';

export class MockMode extends DisposaBle implements IMode {
	private readonly _languageIdentifier: LanguageIdentifier;

	constructor(languageIdentifier: LanguageIdentifier) {
		super();
		this._languageIdentifier = languageIdentifier;
	}

	puBlic getId(): string {
		return this._languageIdentifier.language;
	}

	puBlic getLanguageIdentifier(): LanguageIdentifier {
		return this._languageIdentifier;
	}
}

export class StaticLanguageSelector implements ILanguageSelection {
	readonly onDidChange: Event<LanguageIdentifier> = Event.None;
	constructor(puBlic readonly languageIdentifier: LanguageIdentifier) { }
	puBlic dispose(): void { }
}
