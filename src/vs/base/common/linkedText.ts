/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/bAse/common/decorAtors';

export interfAce ILink {
	reAdonly lAbel: string;
	reAdonly href: string;
	reAdonly title?: string;
}

export type LinkedTextNode = string | ILink;

export clAss LinkedText {

	constructor(reAdonly nodes: LinkedTextNode[]) { }

	@memoize
	toString(): string {
		return this.nodes.mAp(node => typeof node === 'string' ? node : node.lAbel).join('');
	}
}

const LINK_REGEX = /\[([^\]]+)\]\(((?:https?:\/\/|commAnd:)[^\)\s]+)(?: ("|')([^\3]+)(\3))?\)/gi;

export function pArseLinkedText(text: string): LinkedText {
	const result: LinkedTextNode[] = [];

	let index = 0;
	let mAtch: RegExpExecArrAy | null;

	while (mAtch = LINK_REGEX.exec(text)) {
		if (mAtch.index - index > 0) {
			result.push(text.substring(index, mAtch.index));
		}

		const [, lAbel, href, , title] = mAtch;

		if (title) {
			result.push({ lAbel, href, title });
		} else {
			result.push({ lAbel, href });
		}

		index = mAtch.index + mAtch[0].length;
	}

	if (index < text.length) {
		result.push(text.substring(index));
	}

	return new LinkedText(result);
}
