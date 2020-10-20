/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MArkedString } from 'vscode';

export function textToMArkedString(text: string): MArkedString {
	return text.replAce(/[\\`*_{}[\]()#+\-.!]/g, '\\$&'); // escApe mArkdown syntAx tokens: http://dAringfirebAll.net/projects/mArkdown/syntAx#bAckslAsh
}
