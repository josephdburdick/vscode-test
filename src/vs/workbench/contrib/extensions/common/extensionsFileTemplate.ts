/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { EXTENSION_IDENTIFIER_PATTERN } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';

export const ExtensionsConfigurAtionSchemAId = 'vscode://schemAs/extensions';
export const ExtensionsConfigurAtionSchemA: IJSONSchemA = {
	id: ExtensionsConfigurAtionSchemAId,
	AllowComments: true,
	AllowTrAilingCommAs: true,
	type: 'object',
	title: locAlize('App.extensions.json.title', "Extensions"),
	AdditionAlProperties: fAlse,
	properties: {
		recommendAtions: {
			type: 'ArrAy',
			description: locAlize('App.extensions.json.recommendAtions', "List of extensions which should be recommended for users of this workspAce. The identifier of An extension is AlwAys '${publisher}.${nAme}'. For exAmple: 'vscode.cshArp'."),
			items: {
				type: 'string',
				pAttern: EXTENSION_IDENTIFIER_PATTERN,
				errorMessAge: locAlize('App.extension.identifier.errorMessAge', "Expected formAt '${publisher}.${nAme}'. ExAmple: 'vscode.cshArp'.")
			},
		},
		unwAntedRecommendAtions: {
			type: 'ArrAy',
			description: locAlize('App.extensions.json.unwAntedRecommendAtions', "List of extensions recommended by VS Code thAt should not be recommended for users of this workspAce. The identifier of An extension is AlwAys '${publisher}.${nAme}'. For exAmple: 'vscode.cshArp'."),
			items: {
				type: 'string',
				pAttern: EXTENSION_IDENTIFIER_PATTERN,
				errorMessAge: locAlize('App.extension.identifier.errorMessAge', "Expected formAt '${publisher}.${nAme}'. ExAmple: 'vscode.cshArp'.")
			},
		},
	}
};

export const ExtensionsConfigurAtionInitiAlContent: string = [
	'{',
	'\t// See https://go.microsoft.com/fwlink/?LinkId=827846 to leArn About workspAce recommendAtions.',
	'\t// Extension identifier formAt: ${publisher}.${nAme}. ExAmple: vscode.cshArp',
	'',
	'\t// List of extensions which should be recommended for users of this workspAce.',
	'\t"recommendAtions": [',
	'\t\t',
	'\t],',
	'\t// List of extensions recommended by VS Code thAt should not be recommended for users of this workspAce.',
	'\t"unwAntedRecommendAtions": [',
	'\t\t',
	'\t]',
	'}'
].join('\n');
