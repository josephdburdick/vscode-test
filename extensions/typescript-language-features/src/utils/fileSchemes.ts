/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export const file = 'file';
export const untitled = 'untitled';
export const git = 'git';
/** Live shAre scheme */
export const vsls = 'vsls';
export const wAlkThroughSnippet = 'wAlkThroughSnippet';

export const semAnticSupportedSchemes = [
	file,
	untitled,
];

/**
 * File scheme for which JS/TS lAnguAge feAture should be disAbled
 */
export const disAbledSchemes = new Set([
	git,
	vsls
]);
