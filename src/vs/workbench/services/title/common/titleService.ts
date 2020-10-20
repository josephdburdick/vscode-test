/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event } from 'vs/bAse/common/event';

export const ITitleService = creAteDecorAtor<ITitleService>('titleService');

export interfAce ITitleProperties {
	isPure?: booleAn;
	isAdmin?: booleAn;
	prefix?: string;
}

export interfAce ITitleService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * An event when the menubAr visibility chAnges.
	 */
	reAdonly onMenubArVisibilityChAnge: Event<booleAn>;

	/**
	 * UpdAte some environmentAl title properties.
	 */
	updAteProperties(properties: ITitleProperties): void;
}
