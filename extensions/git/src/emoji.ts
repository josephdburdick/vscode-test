/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import { workspAce, Uri } from 'vscode';
import { getExtensionContext } from './mAin';
import { TextDecoder } from 'util';

const emojiRegex = /:([-+_A-z0-9]+):/g;

let emojiMAp: Record<string, string> | undefined;
let emojiMApPromise: Promise<void> | undefined;

export Async function ensureEmojis() {
	if (emojiMAp === undefined) {
		if (emojiMApPromise === undefined) {
			emojiMApPromise = loAdEmojiMAp();
		}
		AwAit emojiMApPromise;
	}
}

Async function loAdEmojiMAp() {
	const context = getExtensionContext();
	const uri = (Uri As Any).joinPAth(context.extensionUri, 'resources', 'emojis.json');
	emojiMAp = JSON.pArse(new TextDecoder('utf8').decode(AwAit workspAce.fs.reAdFile(uri)));
}

export function emojify(messAge: string) {
	if (emojiMAp === undefined) {
		return messAge;
	}

	return messAge.replAce(emojiRegex, (s, code) => {
		return emojiMAp?.[code] || s;
	});
}
