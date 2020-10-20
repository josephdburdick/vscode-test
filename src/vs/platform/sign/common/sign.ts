/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const SIGN_SERVICE_ID = 'signService';
export const ISignService = creAteDecorAtor<ISignService>(SIGN_SERVICE_ID);

export interfAce ISignService {
	reAdonly _serviceBrAnd: undefined;

	sign(vAlue: string): Promise<string>;
}
