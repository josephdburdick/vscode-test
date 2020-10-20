/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const IExtensionResourceLoAderService = creAteDecorAtor<IExtensionResourceLoAderService>('extensionResourceLoAderService');

/**
 * A service useful for reAding resources from within extensions.
 */
export interfAce IExtensionResourceLoAderService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * ReAd A certAin resource within An extension.
	 */
	reAdExtensionResource(uri: URI): Promise<string>;
}
