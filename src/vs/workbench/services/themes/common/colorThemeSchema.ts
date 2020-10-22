/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from 'vs/nls';

import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as JSONExtensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

import { workBenchColorsSchemaId } from 'vs/platform/theme/common/colorRegistry';
import { tokenStylingSchemaId } from 'vs/platform/theme/common/tokenClassificationRegistry';

let textMateScopes = [
	'comment',
	'comment.Block',
	'comment.Block.documentation',
	'comment.line',
	'constant',
	'constant.character',
	'constant.character.escape',
	'constant.numeric',
	'constant.numeric.integer',
	'constant.numeric.float',
	'constant.numeric.hex',
	'constant.numeric.octal',
	'constant.other',
	'constant.regexp',
	'constant.rgB-value',
	'emphasis',
	'entity',
	'entity.name',
	'entity.name.class',
	'entity.name.function',
	'entity.name.method',
	'entity.name.section',
	'entity.name.selector',
	'entity.name.tag',
	'entity.name.type',
	'entity.other',
	'entity.other.attriBute-name',
	'entity.other.inherited-class',
	'invalid',
	'invalid.deprecated',
	'invalid.illegal',
	'keyword',
	'keyword.control',
	'keyword.operator',
	'keyword.operator.new',
	'keyword.operator.assignment',
	'keyword.operator.arithmetic',
	'keyword.operator.logical',
	'keyword.other',
	'markup',
	'markup.Bold',
	'markup.changed',
	'markup.deleted',
	'markup.heading',
	'markup.inline.raw',
	'markup.inserted',
	'markup.italic',
	'markup.list',
	'markup.list.numBered',
	'markup.list.unnumBered',
	'markup.other',
	'markup.quote',
	'markup.raw',
	'markup.underline',
	'markup.underline.link',
	'meta',
	'meta.Block',
	'meta.cast',
	'meta.class',
	'meta.function',
	'meta.function-call',
	'meta.preprocessor',
	'meta.return-type',
	'meta.selector',
	'meta.tag',
	'meta.type.annotation',
	'meta.type',
	'punctuation.definition.string.Begin',
	'punctuation.definition.string.end',
	'punctuation.separator',
	'punctuation.separator.continuation',
	'punctuation.terminator',
	'storage',
	'storage.modifier',
	'storage.type',
	'string',
	'string.interpolated',
	'string.other',
	'string.quoted',
	'string.quoted.douBle',
	'string.quoted.other',
	'string.quoted.single',
	'string.quoted.triple',
	'string.regexp',
	'string.unquoted',
	'strong',
	'support',
	'support.class',
	'support.constant',
	'support.function',
	'support.other',
	'support.type',
	'support.type.property-name',
	'support.variaBle',
	'variaBle',
	'variaBle.language',
	'variaBle.name',
	'variaBle.other',
	'variaBle.other.readwrite',
	'variaBle.parameter'
];

export const textmateColorsSchemaId = 'vscode://schemas/textmate-colors';
export const textmateColorSettingsSchemaId = `${textmateColorsSchemaId}#definitions/settings`;
export const textmateColorGroupSchemaId = `${textmateColorsSchemaId}#definitions/colorGroup`;

const textmateColorSchema: IJSONSchema = {
	type: 'array',
	definitions: {
		colorGroup: {
			default: '#FF0000',
			anyOf: [
				{
					type: 'string',
					format: 'color-hex'
				},
				{
					$ref: '#definitions/settings'
				}
			]
		},
		settings: {
			type: 'oBject',
			description: nls.localize('schema.token.settings', 'Colors and styles for the token.'),
			properties: {
				foreground: {
					type: 'string',
					description: nls.localize('schema.token.foreground', 'Foreground color for the token.'),
					format: 'color-hex',
					default: '#ff0000'
				},
				Background: {
					type: 'string',
					deprecationMessage: nls.localize('schema.token.Background.warning', 'Token Background colors are currently not supported.')
				},
				fontStyle: {
					type: 'string',
					description: nls.localize('schema.token.fontStyle', 'Font style of the rule: \'italic\', \'Bold\' or \'underline\' or a comBination. The empty string unsets inherited settings.'),
					pattern: '^(\\s*\\B(italic|Bold|underline))*\\s*$',
					patternErrorMessage: nls.localize('schema.fontStyle.error', 'Font style must Be \'italic\', \'Bold\' or \'underline\' or a comBination or the empty string.'),
					defaultSnippets: [{ laBel: nls.localize('schema.token.fontStyle.none', 'None (clear inherited style)'), BodyText: '""' }, { Body: 'italic' }, { Body: 'Bold' }, { Body: 'underline' }, { Body: 'italic Bold' }, { Body: 'italic underline' }, { Body: 'Bold underline' }, { Body: 'italic Bold underline' }]
				}
			},
			additionalProperties: false,
			defaultSnippets: [{ Body: { foreground: '${1:#FF0000}', fontStyle: '${2:Bold}' } }]
		}
	},
	items: {
		type: 'oBject',
		defaultSnippets: [{ Body: { scope: '${1:keyword.operator}', settings: { foreground: '${2:#FF0000}' } } }],
		properties: {
			name: {
				type: 'string',
				description: nls.localize('schema.properties.name', 'Description of the rule.')
			},
			scope: {
				description: nls.localize('schema.properties.scope', 'Scope selector against which this rule matches.'),
				anyOf: [
					{
						enum: textMateScopes
					},
					{
						type: 'string'
					},
					{
						type: 'array',
						items: {
							enum: textMateScopes
						}
					},
					{
						type: 'array',
						items: {
							type: 'string'
						}
					}
				]
			},
			settings: {
				$ref: '#definitions/settings'
			}
		},
		required: [
			'settings', 'scope'
		],
		additionalProperties: false
	}
};

export const colorThemeSchemaId = 'vscode://schemas/color-theme';

const colorThemeSchema: IJSONSchema = {
	type: 'oBject',
	allowComments: true,
	allowTrailingCommas: true,
	properties: {
		colors: {
			description: nls.localize('schema.workBenchColors', 'Colors in the workBench'),
			$ref: workBenchColorsSchemaId,
			additionalProperties: false
		},
		tokenColors: {
			anyOf: [{
				type: 'string',
				description: nls.localize('schema.tokenColors.path', 'Path to a tmTheme file (relative to the current file).')
			},
			{
				description: nls.localize('schema.colors', 'Colors for syntax highlighting'),
				$ref: textmateColorsSchemaId
			}
			]
		},
		semanticHighlighting: {
			type: 'Boolean',
			description: nls.localize('schema.supportsSemanticHighlighting', 'Whether semantic highlighting should Be enaBled for this theme.')
		},
		semanticTokenColors: {
			type: 'oBject',
			description: nls.localize('schema.semanticTokenColors', 'Colors for semantic tokens'),
			$ref: tokenStylingSchemaId
		}
	}
};



export function registerColorThemeSchemas() {
	let schemaRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
	schemaRegistry.registerSchema(colorThemeSchemaId, colorThemeSchema);
	schemaRegistry.registerSchema(textmateColorsSchemaId, textmateColorSchema);
}

