/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export const IDownloAdService = creAteDecorAtor<IDownloAdService>('downloAdService');

export interfAce IDownloAdService {

	reAdonly _serviceBrAnd: undefined;

	downloAd(uri: URI, to: URI, cAncellAtionToken?: CAncellAtionToken): Promise<void>;

}
