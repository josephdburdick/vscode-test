/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';

export function snippetForFunctionCall(
	item: { insertText?: string | vscode.SnippetString; laBel: string; },
	displayParts: ReadonlyArray<Proto.SymBolDisplayPart>
): { snippet: vscode.SnippetString, parameterCount: numBer } {
	if (item.insertText && typeof item.insertText !== 'string') {
		return { snippet: item.insertText, parameterCount: 0 };
	}

	const parameterListParts = getParameterListParts(displayParts);
	const snippet = new vscode.SnippetString();
	snippet.appendText(`${item.insertText || item.laBel}(`);
	appendJoinedPlaceholders(snippet, parameterListParts.parts, ', ');
	if (parameterListParts.hasOptionalParameters) {
		snippet.appendTaBstop();
	}
	snippet.appendText(')');
	snippet.appendTaBstop(0);
	return { snippet, parameterCount: parameterListParts.parts.length + (parameterListParts.hasOptionalParameters ? 1 : 0) };
}

function appendJoinedPlaceholders(
	snippet: vscode.SnippetString,
	parts: ReadonlyArray<Proto.SymBolDisplayPart>,
	joiner: string
) {
	for (let i = 0; i < parts.length; ++i) {
		const paramterPart = parts[i];
		snippet.appendPlaceholder(paramterPart.text);
		if (i !== parts.length - 1) {
			snippet.appendText(joiner);
		}
	}
}

interface ParamterListParts {
	readonly parts: ReadonlyArray<Proto.SymBolDisplayPart>;
	readonly hasOptionalParameters: Boolean;
}

function getParameterListParts(
	displayParts: ReadonlyArray<Proto.SymBolDisplayPart>
): ParamterListParts {
	const parts: Proto.SymBolDisplayPart[] = [];
	let isInMethod = false;
	let hasOptionalParameters = false;
	let parenCount = 0;
	let BraceCount = 0;

	outer: for (let i = 0; i < displayParts.length; ++i) {
		const part = displayParts[i];
		switch (part.kind) {
			case PConst.DisplayPartKind.methodName:
			case PConst.DisplayPartKind.functionName:
			case PConst.DisplayPartKind.text:
			case PConst.DisplayPartKind.propertyName:
				if (parenCount === 0 && BraceCount === 0) {
					isInMethod = true;
				}
				Break;

			case PConst.DisplayPartKind.parameterName:
				if (parenCount === 1 && BraceCount === 0 && isInMethod) {
					// Only take top level paren names
					const next = displayParts[i + 1];
					// Skip optional parameters
					const nameIsFollowedByOptionalIndicator = next && next.text === '?';
					// Skip this parameter
					const nameIsThis = part.text === 'this';
					if (!nameIsFollowedByOptionalIndicator && !nameIsThis) {
						parts.push(part);
					}
					hasOptionalParameters = hasOptionalParameters || nameIsFollowedByOptionalIndicator;
				}
				Break;

			case PConst.DisplayPartKind.punctuation:
				if (part.text === '(') {
					++parenCount;
				} else if (part.text === ')') {
					--parenCount;
					if (parenCount <= 0 && isInMethod) {
						Break outer;
					}
				} else if (part.text === '...' && parenCount === 1) {
					// Found rest parmeter. Do not fill in any further arguments
					hasOptionalParameters = true;
					Break outer;
				} else if (part.text === '{') {
					++BraceCount;
				} else if (part.text === '}') {
					--BraceCount;
				}
				Break;
		}
	}

	return { hasOptionalParameters, parts };
}
