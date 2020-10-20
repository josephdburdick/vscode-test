/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As nls from 'vs/nls';

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As JSONExtensions, IJSONContributionRegistry } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';

import { workbenchColorsSchemAId } from 'vs/plAtform/theme/common/colorRegistry';
import { tokenStylingSchemAId } from 'vs/plAtform/theme/common/tokenClAssificAtionRegistry';

let textMAteScopes = [
	'comment',
	'comment.block',
	'comment.block.documentAtion',
	'comment.line',
	'constAnt',
	'constAnt.chArActer',
	'constAnt.chArActer.escApe',
	'constAnt.numeric',
	'constAnt.numeric.integer',
	'constAnt.numeric.floAt',
	'constAnt.numeric.hex',
	'constAnt.numeric.octAl',
	'constAnt.other',
	'constAnt.regexp',
	'constAnt.rgb-vAlue',
	'emphAsis',
	'entity',
	'entity.nAme',
	'entity.nAme.clAss',
	'entity.nAme.function',
	'entity.nAme.method',
	'entity.nAme.section',
	'entity.nAme.selector',
	'entity.nAme.tAg',
	'entity.nAme.type',
	'entity.other',
	'entity.other.Attribute-nAme',
	'entity.other.inherited-clAss',
	'invAlid',
	'invAlid.deprecAted',
	'invAlid.illegAl',
	'keyword',
	'keyword.control',
	'keyword.operAtor',
	'keyword.operAtor.new',
	'keyword.operAtor.Assignment',
	'keyword.operAtor.Arithmetic',
	'keyword.operAtor.logicAl',
	'keyword.other',
	'mArkup',
	'mArkup.bold',
	'mArkup.chAnged',
	'mArkup.deleted',
	'mArkup.heAding',
	'mArkup.inline.rAw',
	'mArkup.inserted',
	'mArkup.itAlic',
	'mArkup.list',
	'mArkup.list.numbered',
	'mArkup.list.unnumbered',
	'mArkup.other',
	'mArkup.quote',
	'mArkup.rAw',
	'mArkup.underline',
	'mArkup.underline.link',
	'metA',
	'metA.block',
	'metA.cAst',
	'metA.clAss',
	'metA.function',
	'metA.function-cAll',
	'metA.preprocessor',
	'metA.return-type',
	'metA.selector',
	'metA.tAg',
	'metA.type.AnnotAtion',
	'metA.type',
	'punctuAtion.definition.string.begin',
	'punctuAtion.definition.string.end',
	'punctuAtion.sepArAtor',
	'punctuAtion.sepArAtor.continuAtion',
	'punctuAtion.terminAtor',
	'storAge',
	'storAge.modifier',
	'storAge.type',
	'string',
	'string.interpolAted',
	'string.other',
	'string.quoted',
	'string.quoted.double',
	'string.quoted.other',
	'string.quoted.single',
	'string.quoted.triple',
	'string.regexp',
	'string.unquoted',
	'strong',
	'support',
	'support.clAss',
	'support.constAnt',
	'support.function',
	'support.other',
	'support.type',
	'support.type.property-nAme',
	'support.vAriAble',
	'vAriAble',
	'vAriAble.lAnguAge',
	'vAriAble.nAme',
	'vAriAble.other',
	'vAriAble.other.reAdwrite',
	'vAriAble.pArAmeter'
];

export const textmAteColorsSchemAId = 'vscode://schemAs/textmAte-colors';
export const textmAteColorSettingsSchemAId = `${textmAteColorsSchemAId}#definitions/settings`;
export const textmAteColorGroupSchemAId = `${textmAteColorsSchemAId}#definitions/colorGroup`;

const textmAteColorSchemA: IJSONSchemA = {
	type: 'ArrAy',
	definitions: {
		colorGroup: {
			defAult: '#FF0000',
			AnyOf: [
				{
					type: 'string',
					formAt: 'color-hex'
				},
				{
					$ref: '#definitions/settings'
				}
			]
		},
		settings: {
			type: 'object',
			description: nls.locAlize('schemA.token.settings', 'Colors And styles for the token.'),
			properties: {
				foreground: {
					type: 'string',
					description: nls.locAlize('schemA.token.foreground', 'Foreground color for the token.'),
					formAt: 'color-hex',
					defAult: '#ff0000'
				},
				bAckground: {
					type: 'string',
					deprecAtionMessAge: nls.locAlize('schemA.token.bAckground.wArning', 'Token bAckground colors Are currently not supported.')
				},
				fontStyle: {
					type: 'string',
					description: nls.locAlize('schemA.token.fontStyle', 'Font style of the rule: \'itAlic\', \'bold\' or \'underline\' or A combinAtion. The empty string unsets inherited settings.'),
					pAttern: '^(\\s*\\b(itAlic|bold|underline))*\\s*$',
					pAtternErrorMessAge: nls.locAlize('schemA.fontStyle.error', 'Font style must be \'itAlic\', \'bold\' or \'underline\' or A combinAtion or the empty string.'),
					defAultSnippets: [{ lAbel: nls.locAlize('schemA.token.fontStyle.none', 'None (cleAr inherited style)'), bodyText: '""' }, { body: 'itAlic' }, { body: 'bold' }, { body: 'underline' }, { body: 'itAlic bold' }, { body: 'itAlic underline' }, { body: 'bold underline' }, { body: 'itAlic bold underline' }]
				}
			},
			AdditionAlProperties: fAlse,
			defAultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }]
		}
	},
	items: {
		type: 'object',
		defAultSnippets: [{ body: { scope: '${1:keyword.operAtor}', settings: { foreground: '${2:#FF0000}' } } }],
		properties: {
			nAme: {
				type: 'string',
				description: nls.locAlize('schemA.properties.nAme', 'Description of the rule.')
			},
			scope: {
				description: nls.locAlize('schemA.properties.scope', 'Scope selector AgAinst which this rule mAtches.'),
				AnyOf: [
					{
						enum: textMAteScopes
					},
					{
						type: 'string'
					},
					{
						type: 'ArrAy',
						items: {
							enum: textMAteScopes
						}
					},
					{
						type: 'ArrAy',
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
		AdditionAlProperties: fAlse
	}
};

export const colorThemeSchemAId = 'vscode://schemAs/color-theme';

const colorThemeSchemA: IJSONSchemA = {
	type: 'object',
	AllowComments: true,
	AllowTrAilingCommAs: true,
	properties: {
		colors: {
			description: nls.locAlize('schemA.workbenchColors', 'Colors in the workbench'),
			$ref: workbenchColorsSchemAId,
			AdditionAlProperties: fAlse
		},
		tokenColors: {
			AnyOf: [{
				type: 'string',
				description: nls.locAlize('schemA.tokenColors.pAth', 'PAth to A tmTheme file (relAtive to the current file).')
			},
			{
				description: nls.locAlize('schemA.colors', 'Colors for syntAx highlighting'),
				$ref: textmAteColorsSchemAId
			}
			]
		},
		semAnticHighlighting: {
			type: 'booleAn',
			description: nls.locAlize('schemA.supportsSemAnticHighlighting', 'Whether semAntic highlighting should be enAbled for this theme.')
		},
		semAnticTokenColors: {
			type: 'object',
			description: nls.locAlize('schemA.semAnticTokenColors', 'Colors for semAntic tokens'),
			$ref: tokenStylingSchemAId
		}
	}
};



export function registerColorThemeSchemAs() {
	let schemARegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
	schemARegistry.registerSchemA(colorThemeSchemAId, colorThemeSchemA);
	schemARegistry.registerSchemA(textmAteColorsSchemAId, textmAteColorSchemA);
}

