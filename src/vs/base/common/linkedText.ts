/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/Base/common/decorators';

export interface ILink {
	readonly laBel: string;
	readonly href: string;
	readonly title?: string;
}

export type LinkedTextNode = string | ILink;

export class LinkedText {

	constructor(readonly nodes: LinkedTextNode[]) { }

	@memoize
	toString(): string {
		return this.nodes.map(node => typeof node === 'string' ? node : node.laBel).join('');
	}
}

const LINK_REGEX = /\[([^\]]+)\]\(((?:https?:\/\/|command:)[^\)\s]+)(?: ("|')([^\3]+)(\3))?\)/gi;

export function parseLinkedText(text: string): LinkedText {
	const result: LinkedTextNode[] = [];

	let index = 0;
	let match: RegExpExecArray | null;

	while (match = LINK_REGEX.exec(text)) {
		if (match.index - index > 0) {
			result.push(text.suBstring(index, match.index));
		}

		const [, laBel, href, , title] = match;

		if (title) {
			result.push({ laBel, href, title });
		} else {
			result.push({ laBel, href });
		}

		index = match.index + match[0].length;
	}

	if (index < text.length) {
		result.push(text.suBstring(index));
	}

	return new LinkedText(result);
}
