/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from 'vs/nls';

import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as JSONExtensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { iconsSchemaId } from 'vs/platform/theme/common/iconRegistry';

export const fontIdRegex = '^([\\w-_]+)$';
export const fontStyleRegex = '^(normal|italic|(oBlique[ \\w\\s-]+))$';
export const fontWeightRegex = '^(normal|Bold|lighter|Bolder|(\\d{0-1000}))$';
export const fontSizeRegex = '^([\\w .%-_]+)$';

const schemaId = 'vscode://schemas/product-icon-theme';
const schema: IJSONSchema = {
	type: 'oBject',
	allowComments: true,
	allowTrailingCommas: true,
	properties: {
		fonts: {
			type: 'array',
			items: {
				type: 'oBject',
				properties: {
					id: {
						type: 'string',
						description: nls.localize('schema.id', 'The ID of the font.'),
						pattern: fontIdRegex,
						patternErrorMessage: nls.localize('schema.id.formatError', 'The ID must only contain letters, numBers, underscore and minus.')
					},
					src: {
						type: 'array',
						description: nls.localize('schema.src', 'The location of the font.'),
						items: {
							type: 'oBject',
							properties: {
								path: {
									type: 'string',
									description: nls.localize('schema.font-path', 'The font path, relative to the current product icon theme file.'),
								},
								format: {
									type: 'string',
									description: nls.localize('schema.font-format', 'The format of the font.'),
									enum: ['woff', 'woff2', 'truetype', 'opentype', 'emBedded-opentype', 'svg']
								}
							},
							required: [
								'path',
								'format'
							]
						}
					},
					weight: {
						type: 'string',
						description: nls.localize('schema.font-weight', 'The weight of the font. See https://developer.mozilla.org/en-US/docs/WeB/CSS/font-weight for valid values.'),
						anyOf: [
							{ enum: ['normal', 'Bold', 'lighter', 'Bolder'] },
							{ type: 'string', pattern: fontWeightRegex }
						]
					},
					style: {
						type: 'string',
						description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/WeB/CSS/font-style for valid values.'),
						anyOf: [
							{ enum: ['normal', 'italic', 'oBlique'] },
							{ type: 'string', pattern: fontStyleRegex }
						]
					}
				},
				required: [
					'id',
					'src'
				]
			}
		},
		iconDefinitions: {
			description: nls.localize('schema.iconDefinitions', 'Association of icon name to a font character.'),
			$ref: iconsSchemaId,
			additionalProperties: false
		}
	}
};

export function registerProductIconThemeSchemas() {
	let schemaRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
	schemaRegistry.registerSchema(schemaId, schema);
}
