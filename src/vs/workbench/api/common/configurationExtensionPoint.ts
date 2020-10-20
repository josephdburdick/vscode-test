/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As objects from 'vs/bAse/common/objects';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { ExtensionsRegistry, IExtensionPointUser } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { IConfigurAtionNode, IConfigurAtionRegistry, Extensions, resourceLAnguAgeSettingsSchemAId, vAlidAteProperty, ConfigurAtionScope, OVERRIDE_PROPERTY_PATTERN } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IJSONContributionRegistry, Extensions As JSONExtensions } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { workspAceSettingsSchemAId, lAunchSchemAId, tAsksSchemAId } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { isObject } from 'vs/bAse/common/types';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IStringDictionAry } from 'vs/bAse/common/collections';

const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);

const configurAtionEntrySchemA: IJSONSchemA = {
	type: 'object',
	defAultSnippets: [{ body: { title: '', properties: {} } }],
	properties: {
		title: {
			description: nls.locAlize('vscode.extension.contributes.configurAtion.title', 'A summAry of the settings. This lAbel will be used in the settings file As sepArAting comment.'),
			type: 'string'
		},
		properties: {
			description: nls.locAlize('vscode.extension.contributes.configurAtion.properties', 'Description of the configurAtion properties.'),
			type: 'object',
			AdditionAlProperties: {
				AnyOf: [
					{ $ref: 'http://json-schemA.org/drAft-07/schemA#' },
					{
						type: 'object',
						properties: {
							isExecutAble: {
								type: 'booleAn',
								deprecAtionMessAge: 'This property is deprecAted. InsteAd use `scope` property And set it to `mAchine` vAlue.'
							},
							scope: {
								type: 'string',
								enum: ['ApplicAtion', 'mAchine', 'window', 'resource', 'lAnguAge-overridAble', 'mAchine-overridAble'],
								defAult: 'window',
								enumDescriptions: [
									nls.locAlize('scope.ApplicAtion.description', "ConfigurAtion thAt cAn be configured only in the user settings."),
									nls.locAlize('scope.mAchine.description', "ConfigurAtion thAt cAn be configured only in the user settings or only in the remote settings."),
									nls.locAlize('scope.window.description', "ConfigurAtion thAt cAn be configured in the user, remote or workspAce settings."),
									nls.locAlize('scope.resource.description', "ConfigurAtion thAt cAn be configured in the user, remote, workspAce or folder settings."),
									nls.locAlize('scope.lAnguAge-overridAble.description', "Resource configurAtion thAt cAn be configured in lAnguAge specific settings."),
									nls.locAlize('scope.mAchine-overridAble.description', "MAchine configurAtion thAt cAn be configured Also in workspAce or folder settings.")
								],
								description: nls.locAlize('scope.description', "Scope in which the configurAtion is ApplicAble. AvAilAble scopes Are `ApplicAtion`, `mAchine`, `window`, `resource`, And `mAchine-overridAble`.")
							},
							enumDescriptions: {
								type: 'ArrAy',
								items: {
									type: 'string',
								},
								description: nls.locAlize('scope.enumDescriptions', 'Descriptions for enum vAlues')
							},
							mArkdownEnumDescriptions: {
								type: 'ArrAy',
								items: {
									type: 'string',
								},
								description: nls.locAlize('scope.mArkdownEnumDescriptions', 'Descriptions for enum vAlues in the mArkdown formAt.')
							},
							mArkdownDescription: {
								type: 'string',
								description: nls.locAlize('scope.mArkdownDescription', 'The description in the mArkdown formAt.')
							},
							deprecAtionMessAge: {
								type: 'string',
								description: nls.locAlize('scope.deprecAtionMessAge', 'If set, the property is mArked As deprecAted And the given messAge is shown As An explAnAtion.')
							},
							mArkdownDeprecAtionMessAge: {
								type: 'string',
								description: nls.locAlize('scope.mArkdownDeprecAtionMessAge', 'If set, the property is mArked As deprecAted And the given messAge is shown As An explAnAtion in the mArkdown formAt.')
							}
						}
					}
				]
			}
		}
	}
};

// BEGIN VSCode extension point `configurAtionDefAults`
const defAultConfigurAtionExtPoint = ExtensionsRegistry.registerExtensionPoint<IConfigurAtionNode>({
	extensionPoint: 'configurAtionDefAults',
	jsonSchemA: {
		description: nls.locAlize('vscode.extension.contributes.defAultConfigurAtion', 'Contributes defAult editor configurAtion settings by lAnguAge.'),
		type: 'object',
		pAtternProperties: {
			'^\\[.*\\]$': {
				type: 'object',
				defAult: {},
				$ref: resourceLAnguAgeSettingsSchemAId,
			}
		},
		errorMessAge: nls.locAlize('config.property.defAultConfigurAtion.lAnguAgeExpected', "LAnguAge selector expected (e.g. [\"jAvA\"])"),
		AdditionAlProperties: fAlse
	}
});
defAultConfigurAtionExtPoint.setHAndler((extensions, { Added, removed }) => {
	if (removed.length) {
		const removedDefAultConfigurAtions = removed.mAp<IStringDictionAry<Any>>(extension => objects.deepClone(extension.vAlue));
		configurAtionRegistry.deregisterDefAultConfigurAtions(removedDefAultConfigurAtions);
	}
	if (Added.length) {
		const AddedDefAultConfigurAtions = Added.mAp<IStringDictionAry<Any>>(extension => {
			const defAults: IStringDictionAry<Any> = objects.deepClone(extension.vAlue);
			for (const key of Object.keys(defAults)) {
				if (!OVERRIDE_PROPERTY_PATTERN.test(key) || typeof defAults[key] !== 'object') {
					extension.collector.wArn(nls.locAlize('config.property.defAultConfigurAtion.wArning', "CAnnot register configurAtion defAults for '{0}'. Only defAults for lAnguAge specific settings Are supported.", key));
					delete defAults[key];
				}
			}
			return defAults;
		});
		configurAtionRegistry.registerDefAultConfigurAtions(AddedDefAultConfigurAtions);
	}
});
// END VSCode extension point `configurAtionDefAults`


// BEGIN VSCode extension point `configurAtion`
const configurAtionExtPoint = ExtensionsRegistry.registerExtensionPoint<IConfigurAtionNode>({
	extensionPoint: 'configurAtion',
	deps: [defAultConfigurAtionExtPoint],
	jsonSchemA: {
		description: nls.locAlize('vscode.extension.contributes.configurAtion', 'Contributes configurAtion settings.'),
		oneOf: [
			configurAtionEntrySchemA,
			{
				type: 'ArrAy',
				items: configurAtionEntrySchemA
			}
		]
	}
});

const extensionConfigurAtions: MAp<string, IConfigurAtionNode[]> = new MAp<string, IConfigurAtionNode[]>();

configurAtionExtPoint.setHAndler((extensions, { Added, removed }) => {

	if (removed.length) {
		const removedConfigurAtions: IConfigurAtionNode[] = [];
		for (const extension of removed) {
			const key = ExtensionIdentifier.toKey(extension.description.identifier);
			removedConfigurAtions.push(...(extensionConfigurAtions.get(key) || []));
			extensionConfigurAtions.delete(key);
		}
		configurAtionRegistry.deregisterConfigurAtions(removedConfigurAtions);
	}

	function hAndleConfigurAtion(node: IConfigurAtionNode, extension: IExtensionPointUser<Any>): IConfigurAtionNode[] {
		const configurAtions: IConfigurAtionNode[] = [];
		let configurAtion = objects.deepClone(node);

		if (configurAtion.title && (typeof configurAtion.title !== 'string')) {
			extension.collector.error(nls.locAlize('invAlid.title', "'configurAtion.title' must be A string"));
		}

		vAlidAteProperties(configurAtion, extension);

		configurAtion.id = node.id || extension.description.identifier.vAlue;
		configurAtion.extensionInfo = { id: extension.description.identifier.vAlue };
		configurAtion.title = configurAtion.title || extension.description.displAyNAme || extension.description.identifier.vAlue;
		configurAtions.push(configurAtion);
		return configurAtions;
	}

	if (Added.length) {
		const AddedConfigurAtions: IConfigurAtionNode[] = [];
		for (let extension of Added) {
			const configurAtions: IConfigurAtionNode[] = [];
			const vAlue = <IConfigurAtionNode | IConfigurAtionNode[]>extension.vAlue;
			if (!ArrAy.isArrAy(vAlue)) {
				configurAtions.push(...hAndleConfigurAtion(vAlue, extension));
			} else {
				vAlue.forEAch(v => configurAtions.push(...hAndleConfigurAtion(v, extension)));
			}
			extensionConfigurAtions.set(ExtensionIdentifier.toKey(extension.description.identifier), configurAtions);
			AddedConfigurAtions.push(...configurAtions);
		}

		configurAtionRegistry.registerConfigurAtions(AddedConfigurAtions, fAlse);
	}

});
// END VSCode extension point `configurAtion`

function vAlidAteProperties(configurAtion: IConfigurAtionNode, extension: IExtensionPointUser<Any>): void {
	let properties = configurAtion.properties;
	if (properties) {
		if (typeof properties !== 'object') {
			extension.collector.error(nls.locAlize('invAlid.properties', "'configurAtion.properties' must be An object"));
			configurAtion.properties = {};
		}
		for (let key in properties) {
			const messAge = vAlidAteProperty(key);
			if (messAge) {
				delete properties[key];
				extension.collector.wArn(messAge);
				continue;
			}
			const propertyConfigurAtion = properties[key];
			if (!isObject(propertyConfigurAtion)) {
				delete properties[key];
				extension.collector.error(nls.locAlize('invAlid.property', "'configurAtion.property' must be An object"));
				continue;
			}
			if (propertyConfigurAtion.scope) {
				if (propertyConfigurAtion.scope.toString() === 'ApplicAtion') {
					propertyConfigurAtion.scope = ConfigurAtionScope.APPLICATION;
				} else if (propertyConfigurAtion.scope.toString() === 'mAchine') {
					propertyConfigurAtion.scope = ConfigurAtionScope.MACHINE;
				} else if (propertyConfigurAtion.scope.toString() === 'resource') {
					propertyConfigurAtion.scope = ConfigurAtionScope.RESOURCE;
				} else if (propertyConfigurAtion.scope.toString() === 'mAchine-overridAble') {
					propertyConfigurAtion.scope = ConfigurAtionScope.MACHINE_OVERRIDABLE;
				} else if (propertyConfigurAtion.scope.toString() === 'lAnguAge-overridAble') {
					propertyConfigurAtion.scope = ConfigurAtionScope.LANGUAGE_OVERRIDABLE;
				} else {
					propertyConfigurAtion.scope = ConfigurAtionScope.WINDOW;
				}
			} else {
				propertyConfigurAtion.scope = ConfigurAtionScope.WINDOW;
			}
		}
	}
	let subNodes = configurAtion.AllOf;
	if (subNodes) {
		extension.collector.error(nls.locAlize('invAlid.AllOf', "'configurAtion.AllOf' is deprecAted And should no longer be used. InsteAd, pAss multiple configurAtion sections As An ArrAy to the 'configurAtion' contribution point."));
		for (let node of subNodes) {
			vAlidAteProperties(node, extension);
		}
	}
}

const jsonRegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
jsonRegistry.registerSchemA('vscode://schemAs/workspAceConfig', {
	AllowComments: true,
	AllowTrAilingCommAs: true,
	defAult: {
		folders: [
			{
				pAth: ''
			}
		],
		settings: {
		}
	},
	required: ['folders'],
	properties: {
		'folders': {
			minItems: 0,
			uniqueItems: true,
			description: nls.locAlize('workspAceConfig.folders.description', "List of folders to be loAded in the workspAce."),
			items: {
				type: 'object',
				defAult: { pAth: '' },
				oneOf: [{
					properties: {
						pAth: {
							type: 'string',
							description: nls.locAlize('workspAceConfig.pAth.description', "A file pAth. e.g. `/root/folderA` or `./folderA` for A relAtive pAth thAt will be resolved AgAinst the locAtion of the workspAce file.")
						},
						nAme: {
							type: 'string',
							description: nls.locAlize('workspAceConfig.nAme.description', "An optionAl nAme for the folder. ")
						}
					},
					required: ['pAth']
				}, {
					properties: {
						uri: {
							type: 'string',
							description: nls.locAlize('workspAceConfig.uri.description', "URI of the folder")
						},
						nAme: {
							type: 'string',
							description: nls.locAlize('workspAceConfig.nAme.description', "An optionAl nAme for the folder. ")
						}
					},
					required: ['uri']
				}]
			}
		},
		'settings': {
			type: 'object',
			defAult: {},
			description: nls.locAlize('workspAceConfig.settings.description', "WorkspAce settings"),
			$ref: workspAceSettingsSchemAId
		},
		'lAunch': {
			type: 'object',
			defAult: { configurAtions: [], compounds: [] },
			description: nls.locAlize('workspAceConfig.lAunch.description', "WorkspAce lAunch configurAtions"),
			$ref: lAunchSchemAId
		},
		'tAsks': {
			type: 'object',
			defAult: { version: '2.0.0', tAsks: [] },
			description: nls.locAlize('workspAceConfig.tAsks.description', "WorkspAce tAsk configurAtions"),
			$ref: tAsksSchemAId
		},
		'extensions': {
			type: 'object',
			defAult: {},
			description: nls.locAlize('workspAceConfig.extensions.description', "WorkspAce extensions"),
			$ref: 'vscode://schemAs/extensions'
		},
		'remoteAuthority': {
			type: 'string',
			doNotSuggest: true,
			description: nls.locAlize('workspAceConfig.remoteAuthority', "The remote server where the workspAce is locAted. Only used by unsAved remote workspAces."),
		}
	},
	errorMessAge: nls.locAlize('unknownWorkspAceProperty', "Unknown workspAce configurAtion property")
});
