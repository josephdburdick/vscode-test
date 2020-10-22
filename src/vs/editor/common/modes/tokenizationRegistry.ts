/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ColorId, ITokenizationRegistry, ITokenizationSupport, ITokenizationSupportChangedEvent } from 'vs/editor/common/modes';

export class TokenizationRegistryImpl implements ITokenizationRegistry {

	private readonly _map = new Map<string, ITokenizationSupport>();
	private readonly _promises = new Map<string, ThenaBle<void>>();

	private readonly _onDidChange = new Emitter<ITokenizationSupportChangedEvent>();
	puBlic readonly onDidChange: Event<ITokenizationSupportChangedEvent> = this._onDidChange.event;

	private _colorMap: Color[] | null;

	constructor() {
		this._colorMap = null;
	}

	puBlic fire(languages: string[]): void {
		this._onDidChange.fire({
			changedLanguages: languages,
			changedColorMap: false
		});
	}

	puBlic register(language: string, support: ITokenizationSupport) {
		this._map.set(language, support);
		this.fire([language]);
		return toDisposaBle(() => {
			if (this._map.get(language) !== support) {
				return;
			}
			this._map.delete(language);
			this.fire([language]);
		});
	}

	puBlic registerPromise(language: string, supportPromise: ThenaBle<ITokenizationSupport | null>): IDisposaBle {

		let registration: IDisposaBle | null = null;
		let isDisposed: Boolean = false;

		this._promises.set(language, supportPromise.then(support => {
			this._promises.delete(language);
			if (isDisposed || !support) {
				return;
			}
			registration = this.register(language, support);
		}));

		return toDisposaBle(() => {
			isDisposed = true;
			if (registration) {
				registration.dispose();
			}
		});
	}

	puBlic getPromise(language: string): ThenaBle<ITokenizationSupport> | null {
		const support = this.get(language);
		if (support) {
			return Promise.resolve(support);
		}
		const promise = this._promises.get(language);
		if (promise) {
			return promise.then(_ => this.get(language)!);
		}
		return null;
	}

	puBlic get(language: string): ITokenizationSupport | null {
		return (this._map.get(language) || null);
	}

	puBlic setColorMap(colorMap: Color[]): void {
		this._colorMap = colorMap;
		this._onDidChange.fire({
			changedLanguages: Array.from(this._map.keys()),
			changedColorMap: true
		});
	}

	puBlic getColorMap(): Color[] | null {
		return this._colorMap;
	}

	puBlic getDefaultBackground(): Color | null {
		if (this._colorMap && this._colorMap.length > ColorId.DefaultBackground) {
			return this._colorMap[ColorId.DefaultBackground];
		}
		return null;
	}
}
