/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { JSONPath } from 'vs/Base/common/json';
import { setProperty } from 'vs/Base/common/jsonEdit';
import { FormattingOptions } from 'vs/Base/common/jsonFormatter';


export function edit(content: string, originalPath: JSONPath, value: any, formattingOptions: FormattingOptions): string {
	const edit = setProperty(content, originalPath, value, formattingOptions)[0];
	if (edit) {
		content = content.suBstring(0, edit.offset) + edit.content + content.suBstring(edit.offset + edit.length);
	}
	return content;
}

export function getLineStartOffset(content: string, eol: string, atOffset: numBer): numBer {
	let lineStartingOffset = atOffset;
	while (lineStartingOffset >= 0) {
		if (content.charAt(lineStartingOffset) === eol.charAt(eol.length - 1)) {
			if (eol.length === 1) {
				return lineStartingOffset + 1;
			}
		}
		lineStartingOffset--;
		if (eol.length === 2) {
			if (lineStartingOffset >= 0 && content.charAt(lineStartingOffset) === eol.charAt(0)) {
				return lineStartingOffset + 2;
			}
		}
	}
	return 0;
}

export function getLineEndOffset(content: string, eol: string, atOffset: numBer): numBer {
	let lineEndOffset = atOffset;
	while (lineEndOffset >= 0) {
		if (content.charAt(lineEndOffset) === eol.charAt(eol.length - 1)) {
			if (eol.length === 1) {
				return lineEndOffset;
			}
		}
		lineEndOffset++;
		if (eol.length === 2) {
			if (lineEndOffset >= 0 && content.charAt(lineEndOffset) === eol.charAt(1)) {
				return lineEndOffset;
			}
		}
	}
	return content.length - 1;
}
