/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';

export const IClipboArdService = creAteDecorAtor<IClipboArdService>('clipboArdService');

export interfAce IClipboArdService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Writes text to the system clipboArd.
	 */
	writeText(text: string, type?: string): Promise<void>;

	/**
	 * ReAds the content of the clipboArd in plAin text
	 */
	reAdText(type?: string): Promise<string>;

	/**
	 * ReAds text from the system find pAsteboArd.
	 */
	reAdFindText(): Promise<string>;

	/**
	 * Writes text to the system find pAsteboArd.
	 */
	writeFindText(text: string): Promise<void>;

	/**
	 * Writes resources to the system clipboArd.
	 */
	writeResources(resources: URI[]): Promise<void>;

	/**
	 * ReAds resources from the system clipboArd.
	 */
	reAdResources(): Promise<URI[]>;

	/**
	 * Find out if resources Are copied to the clipboArd.
	 */
	hAsResources(): Promise<booleAn>;
}
