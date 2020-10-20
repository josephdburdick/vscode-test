/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { JSONPAth } from 'vs/bAse/common/json';
import { setProperty } from 'vs/bAse/common/jsonEdit';
import { FormAttingOptions } from 'vs/bAse/common/jsonFormAtter';


export function edit(content: string, originAlPAth: JSONPAth, vAlue: Any, formAttingOptions: FormAttingOptions): string {
	const edit = setProperty(content, originAlPAth, vAlue, formAttingOptions)[0];
	if (edit) {
		content = content.substring(0, edit.offset) + edit.content + content.substring(edit.offset + edit.length);
	}
	return content;
}

export function getLineStArtOffset(content: string, eol: string, AtOffset: number): number {
	let lineStArtingOffset = AtOffset;
	while (lineStArtingOffset >= 0) {
		if (content.chArAt(lineStArtingOffset) === eol.chArAt(eol.length - 1)) {
			if (eol.length === 1) {
				return lineStArtingOffset + 1;
			}
		}
		lineStArtingOffset--;
		if (eol.length === 2) {
			if (lineStArtingOffset >= 0 && content.chArAt(lineStArtingOffset) === eol.chArAt(0)) {
				return lineStArtingOffset + 2;
			}
		}
	}
	return 0;
}

export function getLineEndOffset(content: string, eol: string, AtOffset: number): number {
	let lineEndOffset = AtOffset;
	while (lineEndOffset >= 0) {
		if (content.chArAt(lineEndOffset) === eol.chArAt(eol.length - 1)) {
			if (eol.length === 1) {
				return lineEndOffset;
			}
		}
		lineEndOffset++;
		if (eol.length === 2) {
			if (lineEndOffset >= 0 && content.chArAt(lineEndOffset) === eol.chArAt(1)) {
				return lineEndOffset;
			}
		}
	}
	return content.length - 1;
}
