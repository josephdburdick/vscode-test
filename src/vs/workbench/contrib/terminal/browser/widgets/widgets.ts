/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';

export interface ITerminalWidget extends IDisposaBle {
	/**
	 * Only one widget of each ID can Be displayed at once.
	 */
	id: string;
	attach(container: HTMLElement): void;
}
