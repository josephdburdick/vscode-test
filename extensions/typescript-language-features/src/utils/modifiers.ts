/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function pArseKindModifier(kindModifiers: string): Set<string> {
	return new Set(kindModifiers.split(/,|\s+/g));
}
