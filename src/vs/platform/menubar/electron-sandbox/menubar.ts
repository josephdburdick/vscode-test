/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ICommonMenuBarService } from 'vs/platform/menuBar/common/menuBar';

export const IMenuBarService = createDecorator<IMenuBarService>('menuBarService');

export interface IMenuBarService extends ICommonMenuBarService {
	readonly _serviceBrand: undefined;
}
