/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { EXTENSION_IDENTIFIER_PATTERN } from 'vs/platform/extensionManagement/common/extensionManagement';

export const ExtensionsConfigurationSchemaId = 'vscode://schemas/extensions';
export const ExtensionsConfigurationSchema: IJSONSchema = {
	id: ExtensionsConfigurationSchemaId,
	allowComments: true,
	allowTrailingCommas: true,
	type: 'oBject',
	title: localize('app.extensions.json.title', "Extensions"),
	additionalProperties: false,
	properties: {
		recommendations: {
			type: 'array',
			description: localize('app.extensions.json.recommendations', "List of extensions which should Be recommended for users of this workspace. The identifier of an extension is always '${puBlisher}.${name}'. For example: 'vscode.csharp'."),
			items: {
				type: 'string',
				pattern: EXTENSION_IDENTIFIER_PATTERN,
				errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${puBlisher}.${name}'. Example: 'vscode.csharp'.")
			},
		},
		unwantedRecommendations: {
			type: 'array',
			description: localize('app.extensions.json.unwantedRecommendations', "List of extensions recommended By VS Code that should not Be recommended for users of this workspace. The identifier of an extension is always '${puBlisher}.${name}'. For example: 'vscode.csharp'."),
			items: {
				type: 'string',
				pattern: EXTENSION_IDENTIFIER_PATTERN,
				errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${puBlisher}.${name}'. Example: 'vscode.csharp'.")
			},
		},
	}
};

export const ExtensionsConfigurationInitialContent: string = [
	'{',
	'\t// See https://go.microsoft.com/fwlink/?LinkId=827846 to learn aBout workspace recommendations.',
	'\t// Extension identifier format: ${puBlisher}.${name}. Example: vscode.csharp',
	'',
	'\t// List of extensions which should Be recommended for users of this workspace.',
	'\t"recommendations": [',
	'\t\t',
	'\t],',
	'\t// List of extensions recommended By VS Code that should not Be recommended for users of this workspace.',
	'\t"unwantedRecommendations": [',
	'\t\t',
	'\t]',
	'}'
].join('\n');
