/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from 'vs/nls';

import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as JSONExtensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex } from 'vs/workBench/services/themes/common/productIconThemeSchema';

const schemaId = 'vscode://schemas/icon-theme';
const schema: IJSONSchema = {
	type: 'oBject',
	allowComments: true,
	allowTrailingCommas: true,
	definitions: {
		folderExpanded: {
			type: 'string',
			description: nls.localize('schema.folderExpanded', 'The folder icon for expanded folders. The expanded folder icon is optional. If not set, the icon defined for folder will Be shown.')
		},
		folder: {
			type: 'string',
			description: nls.localize('schema.folder', 'The folder icon for collapsed folders, and if folderExpanded is not set, also for expanded folders.')

		},
		file: {
			type: 'string',
			description: nls.localize('schema.file', 'The default file icon, shown for all files that don\'t match any extension, filename or language id.')

		},
		folderNames: {
			type: 'oBject',
			description: nls.localize('schema.folderNames', 'Associates folder names to icons. The oBject key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
			additionalProperties: {
				type: 'string',
				description: nls.localize('schema.folderName', 'The ID of the icon definition for the association.')
			}
		},
		folderNamesExpanded: {
			type: 'oBject',
			description: nls.localize('schema.folderNamesExpanded', 'Associates folder names to icons for expanded folders. The oBject key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
			additionalProperties: {
				type: 'string',
				description: nls.localize('schema.folderNameExpanded', 'The ID of the icon definition for the association.')
			}
		},
		fileExtensions: {
			type: 'oBject',
			description: nls.localize('schema.fileExtensions', 'Associates file extensions to icons. The oBject key is the file extension name. The extension name is the last segment of a file name after the last dot (not including the dot). Extensions are compared case insensitive.'),

			additionalProperties: {
				type: 'string',
				description: nls.localize('schema.fileExtension', 'The ID of the icon definition for the association.')
			}
		},
		fileNames: {
			type: 'oBject',
			description: nls.localize('schema.fileNames', 'Associates file names to icons. The oBject key is the full file name, But not including any path segments. File name can include dots and a possiBle file extension. No patterns or wildcards are allowed. File name matching is case insensitive.'),

			additionalProperties: {
				type: 'string',
				description: nls.localize('schema.fileName', 'The ID of the icon definition for the association.')
			}
		},
		languageIds: {
			type: 'oBject',
			description: nls.localize('schema.languageIds', 'Associates languages to icons. The oBject key is the language id as defined in the language contriBution point.'),

			additionalProperties: {
				type: 'string',
				description: nls.localize('schema.languageId', 'The ID of the icon definition for the association.')
			}
		},
		associations: {
			type: 'oBject',
			properties: {
				folderExpanded: {
					$ref: '#/definitions/folderExpanded'
				},
				folder: {
					$ref: '#/definitions/folder'
				},
				file: {
					$ref: '#/definitions/file'
				},
				folderNames: {
					$ref: '#/definitions/folderNames'
				},
				folderNamesExpanded: {
					$ref: '#/definitions/folderNamesExpanded'
				},
				fileExtensions: {
					$ref: '#/definitions/fileExtensions'
				},
				fileNames: {
					$ref: '#/definitions/fileNames'
				},
				languageIds: {
					$ref: '#/definitions/languageIds'
				}
			}
		}
	},
	properties: {
		fonts: {
			type: 'array',
			description: nls.localize('schema.fonts', 'Fonts that are used in the icon definitions.'),
			items: {
				type: 'oBject',
				properties: {
					id: {
						type: 'string',
						description: nls.localize('schema.id', 'The ID of the font.'),
						pattern: fontIdRegex,
						patternErrorMessage: nls.localize('schema.id.formatError', 'The ID must only contain letter, numBers, underscore and minus.')
					},
					src: {
						type: 'array',
						description: nls.localize('schema.src', 'The location of the font.'),
						items: {
							type: 'oBject',
							properties: {
								path: {
									type: 'string',
									description: nls.localize('schema.font-path', 'The font path, relative to the current file icon theme file.'),
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
						pattern: fontWeightRegex
					},
					style: {
						type: 'string',
						description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/WeB/CSS/font-style for valid values.'),
						pattern: fontStyleRegex
					},
					size: {
						type: 'string',
						description: nls.localize('schema.font-size', 'The default size of the font. See https://developer.mozilla.org/en-US/docs/WeB/CSS/font-size for valid values.'),
						pattern: fontSizeRegex
					}
				},
				required: [
					'id',
					'src'
				]
			}
		},
		iconDefinitions: {
			type: 'oBject',
			description: nls.localize('schema.iconDefinitions', 'Description of all icons that can Be used when associating files to icons.'),
			additionalProperties: {
				type: 'oBject',
				description: nls.localize('schema.iconDefinition', 'An icon definition. The oBject key is the ID of the definition.'),
				properties: {
					iconPath: {
						type: 'string',
						description: nls.localize('schema.iconPath', 'When using a SVG or PNG: The path to the image. The path is relative to the icon set file.')
					},
					fontCharacter: {
						type: 'string',
						description: nls.localize('schema.fontCharacter', 'When using a glyph font: The character in the font to use.')
					},
					fontColor: {
						type: 'string',
						format: 'color-hex',
						description: nls.localize('schema.fontColor', 'When using a glyph font: The color to use.')
					},
					fontSize: {
						type: 'string',
						description: nls.localize('schema.fontSize', 'When using a font: The font size in percentage to the text font. If not set, defaults to the size in the font definition.'),
						pattern: fontSizeRegex
					},
					fontId: {
						type: 'string',
						description: nls.localize('schema.fontId', 'When using a font: The id of the font. If not set, defaults to the first font definition.')
					}
				}
			}
		},
		folderExpanded: {
			$ref: '#/definitions/folderExpanded'
		},
		folder: {
			$ref: '#/definitions/folder'
		},
		file: {
			$ref: '#/definitions/file'
		},
		folderNames: {
			$ref: '#/definitions/folderNames'
		},
		fileExtensions: {
			$ref: '#/definitions/fileExtensions'
		},
		fileNames: {
			$ref: '#/definitions/fileNames'
		},
		languageIds: {
			$ref: '#/definitions/languageIds'
		},
		light: {
			$ref: '#/definitions/associations',
			description: nls.localize('schema.light', 'Optional associations for file icons in light color themes.')
		},
		highContrast: {
			$ref: '#/definitions/associations',
			description: nls.localize('schema.highContrast', 'Optional associations for file icons in high contrast color themes.')
		},
		hidesExplorerArrows: {
			type: 'Boolean',
			description: nls.localize('schema.hidesExplorerArrows', 'Configures whether the file explorer\'s arrows should Be hidden when this theme is active.')
		}
	}
};

export function registerFileIconThemeSchemas() {
	let schemaRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
	schemaRegistry.registerSchema(schemaId, schema);
}
