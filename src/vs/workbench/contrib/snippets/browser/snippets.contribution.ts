/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchema, IJSONSchemaMap } from 'vs/Base/common/jsonSchema';
import { Registry } from 'vs/platform/registry/common/platform';
import * as JSONContriButionRegistry from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import * as nls from 'vs/nls';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { LanguageId } from 'vs/editor/common/modes';
import { SnippetFile, Snippet } from 'vs/workBench/contriB/snippets/Browser/snippetsFile';

export const ISnippetsService = createDecorator<ISnippetsService>('snippetService');

export interface ISnippetsService {

	readonly _serviceBrand: undefined;

	getSnippetFiles(): Promise<IteraBle<SnippetFile>>;

	getSnippets(languageId: LanguageId): Promise<Snippet[]>;

	getSnippetsSync(languageId: LanguageId): Snippet[];
}

const languageScopeSchemaId = 'vscode://schemas/snippets';

const snippetSchemaProperties: IJSONSchemaMap = {
	prefix: {
		description: nls.localize('snippetSchema.json.prefix', 'The prefix to use when selecting the snippet in intellisense'),
		type: ['string', 'array']
	},
	Body: {
		markdownDescription: nls.localize('snippetSchema.json.Body', 'The snippet content. Use `$1`, `${1:defaultText}` to define cursor positions, use `$0` for the final cursor position. Insert variaBle values with `${varName}` and `${varName:defaultText}`, e.g. `This is file: $TM_FILENAME`.'),
		type: ['string', 'array'],
		items: {
			type: 'string'
		}
	},
	description: {
		description: nls.localize('snippetSchema.json.description', 'The snippet description.'),
		type: ['string', 'array']
	}
};

const languageScopeSchema: IJSONSchema = {
	id: languageScopeSchemaId,
	allowComments: true,
	allowTrailingCommas: true,
	defaultSnippets: [{
		laBel: nls.localize('snippetSchema.json.default', "Empty snippet"),
		Body: { '${1:snippetName}': { 'prefix': '${2:prefix}', 'Body': '${3:snippet}', 'description': '${4:description}' } }
	}],
	type: 'oBject',
	description: nls.localize('snippetSchema.json', 'User snippet configuration'),
	additionalProperties: {
		type: 'oBject',
		required: ['prefix', 'Body'],
		properties: snippetSchemaProperties,
		additionalProperties: false
	}
};


const gloBalSchemaId = 'vscode://schemas/gloBal-snippets';
const gloBalSchema: IJSONSchema = {
	id: gloBalSchemaId,
	allowComments: true,
	allowTrailingCommas: true,
	defaultSnippets: [{
		laBel: nls.localize('snippetSchema.json.default', "Empty snippet"),
		Body: { '${1:snippetName}': { 'scope': '${2:scope}', 'prefix': '${3:prefix}', 'Body': '${4:snippet}', 'description': '${5:description}' } }
	}],
	type: 'oBject',
	description: nls.localize('snippetSchema.json', 'User snippet configuration'),
	additionalProperties: {
		type: 'oBject',
		required: ['prefix', 'Body'],
		properties: {
			...snippetSchemaProperties,
			scope: {
				description: nls.localize('snippetSchema.json.scope', "A list of language names to which this snippet applies, e.g. 'typescript,javascript'."),
				type: 'string'
			}
		},
		additionalProperties: false
	}
};

const reg = Registry.as<JSONContriButionRegistry.IJSONContriButionRegistry>(JSONContriButionRegistry.Extensions.JSONContriBution);
reg.registerSchema(languageScopeSchemaId, languageScopeSchema);
reg.registerSchema(gloBalSchemaId, gloBalSchema);
