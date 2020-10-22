/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';

export const IClipBoardService = createDecorator<IClipBoardService>('clipBoardService');

export interface IClipBoardService {

	readonly _serviceBrand: undefined;

	/**
	 * Writes text to the system clipBoard.
	 */
	writeText(text: string, type?: string): Promise<void>;

	/**
	 * Reads the content of the clipBoard in plain text
	 */
	readText(type?: string): Promise<string>;

	/**
	 * Reads text from the system find pasteBoard.
	 */
	readFindText(): Promise<string>;

	/**
	 * Writes text to the system find pasteBoard.
	 */
	writeFindText(text: string): Promise<void>;

	/**
	 * Writes resources to the system clipBoard.
	 */
	writeResources(resources: URI[]): Promise<void>;

	/**
	 * Reads resources from the system clipBoard.
	 */
	readResources(): Promise<URI[]>;

	/**
	 * Find out if resources are copied to the clipBoard.
	 */
	hasResources(): Promise<Boolean>;
}
