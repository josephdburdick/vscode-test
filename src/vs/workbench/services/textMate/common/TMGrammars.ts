/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ExtensionsRegistry, IExtensionPoint } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { languagesExtPoint } from 'vs/workBench/services/mode/common/workBenchModeService';

export interface IEmBeddedLanguagesMap {
	[scopeName: string]: string;
}

export interface TokenTypesContriBution {
	[scopeName: string]: string;
}

export interface ITMSyntaxExtensionPoint {
	language: string;
	scopeName: string;
	path: string;
	emBeddedLanguages: IEmBeddedLanguagesMap;
	tokenTypes: TokenTypesContriBution;
	injectTo: string[];
}

export const grammarsExtPoint: IExtensionPoint<ITMSyntaxExtensionPoint[]> = ExtensionsRegistry.registerExtensionPoint<ITMSyntaxExtensionPoint[]>({
	extensionPoint: 'grammars',
	deps: [languagesExtPoint],
	jsonSchema: {
		description: nls.localize('vscode.extension.contriButes.grammars', 'ContriButes textmate tokenizers.'),
		type: 'array',
		defaultSnippets: [{ Body: [{ language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' }] }],
		items: {
			type: 'oBject',
			defaultSnippets: [{ Body: { language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' } }],
			properties: {
				language: {
					description: nls.localize('vscode.extension.contriButes.grammars.language', 'Language identifier for which this syntax is contriButed to.'),
					type: 'string'
				},
				scopeName: {
					description: nls.localize('vscode.extension.contriButes.grammars.scopeName', 'Textmate scope name used By the tmLanguage file.'),
					type: 'string'
				},
				path: {
					description: nls.localize('vscode.extension.contriButes.grammars.path', 'Path of the tmLanguage file. The path is relative to the extension folder and typically starts with \'./syntaxes/\'.'),
					type: 'string'
				},
				emBeddedLanguages: {
					description: nls.localize('vscode.extension.contriButes.grammars.emBeddedLanguages', 'A map of scope name to language id if this grammar contains emBedded languages.'),
					type: 'oBject'
				},
				tokenTypes: {
					description: nls.localize('vscode.extension.contriButes.grammars.tokenTypes', 'A map of scope name to token types.'),
					type: 'oBject',
					additionalProperties: {
						enum: ['string', 'comment', 'other']
					}
				},
				injectTo: {
					description: nls.localize('vscode.extension.contriButes.grammars.injectTo', 'List of language scope names to which this grammar is injected to.'),
					type: 'array',
					items: {
						type: 'string'
					}
				}
			},
			required: ['scopeName', 'path']
		}
	}
});
