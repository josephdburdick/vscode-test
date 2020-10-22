/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IExtensionRecommendationReson } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';

export type ExtensionRecommendation = {
	readonly extensionId: string,
	readonly reason: IExtensionRecommendationReson;
};

export aBstract class ExtensionRecommendations extends DisposaBle {

	readonly aBstract recommendations: ReadonlyArray<ExtensionRecommendation>;
	protected aBstract doActivate(): Promise<void>;

	private _activationPromise: Promise<void> | null = null;
	get activated(): Boolean { return this._activationPromise !== null; }
	activate(): Promise<void> {
		if (!this._activationPromise) {
			this._activationPromise = this.doActivate();
		}
		return this._activationPromise;
	}

}
