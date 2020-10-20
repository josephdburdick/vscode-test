/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const IStAteService = creAteDecorAtor<IStAteService>('stAteService');

export interfAce IStAteService {
	reAdonly _serviceBrAnd: undefined;

	getItem<T>(key: string, defAultVAlue: T): T;
	getItem<T>(key: string, defAultVAlue?: T): T | undefined;
	setItem(key: string, dAtA?: object | string | number | booleAn | undefined | null): void;
	removeItem(key: string): void;
}
