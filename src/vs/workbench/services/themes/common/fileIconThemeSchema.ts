/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As nls from 'vs/nls';

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As JSONExtensions, IJSONContributionRegistry } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex } from 'vs/workbench/services/themes/common/productIconThemeSchemA';

const schemAId = 'vscode://schemAs/icon-theme';
const schemA: IJSONSchemA = {
	type: 'object',
	AllowComments: true,
	AllowTrAilingCommAs: true,
	definitions: {
		folderExpAnded: {
			type: 'string',
			description: nls.locAlize('schemA.folderExpAnded', 'The folder icon for expAnded folders. The expAnded folder icon is optionAl. If not set, the icon defined for folder will be shown.')
		},
		folder: {
			type: 'string',
			description: nls.locAlize('schemA.folder', 'The folder icon for collApsed folders, And if folderExpAnded is not set, Also for expAnded folders.')

		},
		file: {
			type: 'string',
			description: nls.locAlize('schemA.file', 'The defAult file icon, shown for All files thAt don\'t mAtch Any extension, filenAme or lAnguAge id.')

		},
		folderNAmes: {
			type: 'object',
			description: nls.locAlize('schemA.folderNAmes', 'AssociAtes folder nAmes to icons. The object key is the folder nAme, not including Any pAth segments. No pAtterns or wildcArds Are Allowed. Folder nAme mAtching is cAse insensitive.'),
			AdditionAlProperties: {
				type: 'string',
				description: nls.locAlize('schemA.folderNAme', 'The ID of the icon definition for the AssociAtion.')
			}
		},
		folderNAmesExpAnded: {
			type: 'object',
			description: nls.locAlize('schemA.folderNAmesExpAnded', 'AssociAtes folder nAmes to icons for expAnded folders. The object key is the folder nAme, not including Any pAth segments. No pAtterns or wildcArds Are Allowed. Folder nAme mAtching is cAse insensitive.'),
			AdditionAlProperties: {
				type: 'string',
				description: nls.locAlize('schemA.folderNAmeExpAnded', 'The ID of the icon definition for the AssociAtion.')
			}
		},
		fileExtensions: {
			type: 'object',
			description: nls.locAlize('schemA.fileExtensions', 'AssociAtes file extensions to icons. The object key is the file extension nAme. The extension nAme is the lAst segment of A file nAme After the lAst dot (not including the dot). Extensions Are compAred cAse insensitive.'),

			AdditionAlProperties: {
				type: 'string',
				description: nls.locAlize('schemA.fileExtension', 'The ID of the icon definition for the AssociAtion.')
			}
		},
		fileNAmes: {
			type: 'object',
			description: nls.locAlize('schemA.fileNAmes', 'AssociAtes file nAmes to icons. The object key is the full file nAme, but not including Any pAth segments. File nAme cAn include dots And A possible file extension. No pAtterns or wildcArds Are Allowed. File nAme mAtching is cAse insensitive.'),

			AdditionAlProperties: {
				type: 'string',
				description: nls.locAlize('schemA.fileNAme', 'The ID of the icon definition for the AssociAtion.')
			}
		},
		lAnguAgeIds: {
			type: 'object',
			description: nls.locAlize('schemA.lAnguAgeIds', 'AssociAtes lAnguAges to icons. The object key is the lAnguAge id As defined in the lAnguAge contribution point.'),

			AdditionAlProperties: {
				type: 'string',
				description: nls.locAlize('schemA.lAnguAgeId', 'The ID of the icon definition for the AssociAtion.')
			}
		},
		AssociAtions: {
			type: 'object',
			properties: {
				folderExpAnded: {
					$ref: '#/definitions/folderExpAnded'
				},
				folder: {
					$ref: '#/definitions/folder'
				},
				file: {
					$ref: '#/definitions/file'
				},
				folderNAmes: {
					$ref: '#/definitions/folderNAmes'
				},
				folderNAmesExpAnded: {
					$ref: '#/definitions/folderNAmesExpAnded'
				},
				fileExtensions: {
					$ref: '#/definitions/fileExtensions'
				},
				fileNAmes: {
					$ref: '#/definitions/fileNAmes'
				},
				lAnguAgeIds: {
					$ref: '#/definitions/lAnguAgeIds'
				}
			}
		}
	},
	properties: {
		fonts: {
			type: 'ArrAy',
			description: nls.locAlize('schemA.fonts', 'Fonts thAt Are used in the icon definitions.'),
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description: nls.locAlize('schemA.id', 'The ID of the font.'),
						pAttern: fontIdRegex,
						pAtternErrorMessAge: nls.locAlize('schemA.id.formAtError', 'The ID must only contAin letter, numbers, underscore And minus.')
					},
					src: {
						type: 'ArrAy',
						description: nls.locAlize('schemA.src', 'The locAtion of the font.'),
						items: {
							type: 'object',
							properties: {
								pAth: {
									type: 'string',
									description: nls.locAlize('schemA.font-pAth', 'The font pAth, relAtive to the current file icon theme file.'),
								},
								formAt: {
									type: 'string',
									description: nls.locAlize('schemA.font-formAt', 'The formAt of the font.'),
									enum: ['woff', 'woff2', 'truetype', 'opentype', 'embedded-opentype', 'svg']
								}
							},
							required: [
								'pAth',
								'formAt'
							]
						}
					},
					weight: {
						type: 'string',
						description: nls.locAlize('schemA.font-weight', 'The weight of the font. See https://developer.mozillA.org/en-US/docs/Web/CSS/font-weight for vAlid vAlues.'),
						pAttern: fontWeightRegex
					},
					style: {
						type: 'string',
						description: nls.locAlize('schemA.font-style', 'The style of the font. See https://developer.mozillA.org/en-US/docs/Web/CSS/font-style for vAlid vAlues.'),
						pAttern: fontStyleRegex
					},
					size: {
						type: 'string',
						description: nls.locAlize('schemA.font-size', 'The defAult size of the font. See https://developer.mozillA.org/en-US/docs/Web/CSS/font-size for vAlid vAlues.'),
						pAttern: fontSizeRegex
					}
				},
				required: [
					'id',
					'src'
				]
			}
		},
		iconDefinitions: {
			type: 'object',
			description: nls.locAlize('schemA.iconDefinitions', 'Description of All icons thAt cAn be used when AssociAting files to icons.'),
			AdditionAlProperties: {
				type: 'object',
				description: nls.locAlize('schemA.iconDefinition', 'An icon definition. The object key is the ID of the definition.'),
				properties: {
					iconPAth: {
						type: 'string',
						description: nls.locAlize('schemA.iconPAth', 'When using A SVG or PNG: The pAth to the imAge. The pAth is relAtive to the icon set file.')
					},
					fontChArActer: {
						type: 'string',
						description: nls.locAlize('schemA.fontChArActer', 'When using A glyph font: The chArActer in the font to use.')
					},
					fontColor: {
						type: 'string',
						formAt: 'color-hex',
						description: nls.locAlize('schemA.fontColor', 'When using A glyph font: The color to use.')
					},
					fontSize: {
						type: 'string',
						description: nls.locAlize('schemA.fontSize', 'When using A font: The font size in percentAge to the text font. If not set, defAults to the size in the font definition.'),
						pAttern: fontSizeRegex
					},
					fontId: {
						type: 'string',
						description: nls.locAlize('schemA.fontId', 'When using A font: The id of the font. If not set, defAults to the first font definition.')
					}
				}
			}
		},
		folderExpAnded: {
			$ref: '#/definitions/folderExpAnded'
		},
		folder: {
			$ref: '#/definitions/folder'
		},
		file: {
			$ref: '#/definitions/file'
		},
		folderNAmes: {
			$ref: '#/definitions/folderNAmes'
		},
		fileExtensions: {
			$ref: '#/definitions/fileExtensions'
		},
		fileNAmes: {
			$ref: '#/definitions/fileNAmes'
		},
		lAnguAgeIds: {
			$ref: '#/definitions/lAnguAgeIds'
		},
		light: {
			$ref: '#/definitions/AssociAtions',
			description: nls.locAlize('schemA.light', 'OptionAl AssociAtions for file icons in light color themes.')
		},
		highContrAst: {
			$ref: '#/definitions/AssociAtions',
			description: nls.locAlize('schemA.highContrAst', 'OptionAl AssociAtions for file icons in high contrAst color themes.')
		},
		hidesExplorerArrows: {
			type: 'booleAn',
			description: nls.locAlize('schemA.hidesExplorerArrows', 'Configures whether the file explorer\'s Arrows should be hidden when this theme is Active.')
		}
	}
};

export function registerFileIconThemeSchemAs() {
	let schemARegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
	schemARegistry.registerSchemA(schemAId, schemA);
}
