/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/Base/common/color';

export type styleFn = (colors: { [name: string]: Color | undefined }) => void;

export interface IThemaBle {
	style: styleFn;
}
