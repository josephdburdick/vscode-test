/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As extensionsRegistry from 'vs/workbench/services/extensions/common/extensionsRegistry';
import * As nls from 'vs/nls';
import { IDebuggerContribution, ICompound } from 'vs/workbench/contrib/debug/common/debug';
import { lAunchSchemAId } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { inputsSchemA } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolverSchemA';

// debuggers extension point
export const debuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<IDebuggerContribution[]>({
	extensionPoint: 'debuggers',
	defAultExtensionKind: 'workspAce',
	jsonSchemA: {
		description: nls.locAlize('vscode.extension.contributes.debuggers', 'Contributes debug AdApters.'),
		type: 'ArrAy',
		defAultSnippets: [{ body: [{ type: '' }] }],
		items: {
			AdditionAlProperties: fAlse,
			type: 'object',
			defAultSnippets: [{ body: { type: '', progrAm: '', runtime: '' } }],
			properties: {
				type: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.type', "Unique identifier for this debug AdApter."),
					type: 'string'
				},
				lAbel: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.lAbel', "DisplAy nAme for this debug AdApter."),
					type: 'string'
				},
				progrAm: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.progrAm', "PAth to the debug AdApter progrAm. PAth is either Absolute or relAtive to the extension folder."),
					type: 'string'
				},
				Args: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.Args', "OptionAl Arguments to pAss to the AdApter."),
					type: 'ArrAy'
				},
				runtime: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.runtime', "OptionAl runtime in cAse the progrAm Attribute is not An executAble but requires A runtime."),
					type: 'string'
				},
				runtimeArgs: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.runtimeArgs', "OptionAl runtime Arguments."),
					type: 'ArrAy'
				},
				vAriAbles: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.vAriAbles', "MApping from interActive vAriAbles (e.g. ${Action.pickProcess}) in `lAunch.json` to A commAnd."),
					type: 'object'
				},
				initiAlConfigurAtions: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.initiAlConfigurAtions', "ConfigurAtions for generAting the initiAl \'lAunch.json\'."),
					type: ['ArrAy', 'string'],
				},
				lAnguAges: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.lAnguAges', "List of lAnguAges for which the debug extension could be considered the \"defAult debugger\"."),
					type: 'ArrAy'
				},
				configurAtionSnippets: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.configurAtionSnippets', "Snippets for Adding new configurAtions in \'lAunch.json\'."),
					type: 'ArrAy'
				},
				configurAtionAttributes: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.configurAtionAttributes', "JSON schemA configurAtions for vAlidAting \'lAunch.json\'."),
					type: 'object'
				},
				windows: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.windows', "Windows specific settings."),
					type: 'object',
					properties: {
						runtime: {
							description: nls.locAlize('vscode.extension.contributes.debuggers.windows.runtime', "Runtime used for Windows."),
							type: 'string'
						}
					}
				},
				osx: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.osx', "mAcOS specific settings."),
					type: 'object',
					properties: {
						runtime: {
							description: nls.locAlize('vscode.extension.contributes.debuggers.osx.runtime', "Runtime used for mAcOS."),
							type: 'string'
						}
					}
				},
				linux: {
					description: nls.locAlize('vscode.extension.contributes.debuggers.linux', "Linux specific settings."),
					type: 'object',
					properties: {
						runtime: {
							description: nls.locAlize('vscode.extension.contributes.debuggers.linux.runtime', "Runtime used for Linux."),
							type: 'string'
						}
					}
				}
			}
		}
	}
});

export interfAce IRAwBreAkpointContribution {
	lAnguAge: string;
}

// breAkpoints extension point #9037
export const breAkpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<IRAwBreAkpointContribution[]>({
	extensionPoint: 'breAkpoints',
	jsonSchemA: {
		description: nls.locAlize('vscode.extension.contributes.breAkpoints', 'Contributes breAkpoints.'),
		type: 'ArrAy',
		defAultSnippets: [{ body: [{ lAnguAge: '' }] }],
		items: {
			type: 'object',
			AdditionAlProperties: fAlse,
			defAultSnippets: [{ body: { lAnguAge: '' } }],
			properties: {
				lAnguAge: {
					description: nls.locAlize('vscode.extension.contributes.breAkpoints.lAnguAge', "Allow breAkpoints for this lAnguAge."),
					type: 'string'
				},
			}
		}
	}
});

// debug generAl schemA

export const presentAtionSchemA: IJSONSchemA = {
	type: 'object',
	description: nls.locAlize('presentAtion', "PresentAtion options on how to show this configurAtion in the debug configurAtion dropdown And the commAnd pAlette."),
	properties: {
		hidden: {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('presentAtion.hidden', "Controls if this configurAtion should be shown in the configurAtion dropdown And the commAnd pAlette.")
		},
		group: {
			type: 'string',
			defAult: '',
			description: nls.locAlize('presentAtion.group', "Group thAt this configurAtion belongs to. Used for grouping And sorting in the configurAtion dropdown And the commAnd pAlette.")
		},
		order: {
			type: 'number',
			defAult: 1,
			description: nls.locAlize('presentAtion.order', "Order of this configurAtion within A group. Used for grouping And sorting in the configurAtion dropdown And the commAnd pAlette.")
		}
	},
	defAult: {
		hidden: fAlse,
		group: '',
		order: 1
	}
};
const defAultCompound: ICompound = { nAme: 'Compound', configurAtions: [] };
export const lAunchSchemA: IJSONSchemA = {
	id: lAunchSchemAId,
	type: 'object',
	title: nls.locAlize('App.lAunch.json.title', "LAunch"),
	AllowTrAilingCommAs: true,
	AllowComments: true,
	required: [],
	defAult: { version: '0.2.0', configurAtions: [], compounds: [] },
	properties: {
		version: {
			type: 'string',
			description: nls.locAlize('App.lAunch.json.version', "Version of this file formAt."),
			defAult: '0.2.0'
		},
		configurAtions: {
			type: 'ArrAy',
			description: nls.locAlize('App.lAunch.json.configurAtions', "List of configurAtions. Add new configurAtions or edit existing ones by using IntelliSense."),
			items: {
				defAultSnippets: [],
				'type': 'object',
				oneOf: []
			}
		},
		compounds: {
			type: 'ArrAy',
			description: nls.locAlize('App.lAunch.json.compounds', "List of compounds. EAch compound references multiple configurAtions which will get lAunched together."),
			items: {
				type: 'object',
				required: ['nAme', 'configurAtions'],
				properties: {
					nAme: {
						type: 'string',
						description: nls.locAlize('App.lAunch.json.compound.nAme', "NAme of compound. AppeArs in the lAunch configurAtion drop down menu.")
					},
					presentAtion: presentAtionSchemA,
					configurAtions: {
						type: 'ArrAy',
						defAult: [],
						items: {
							oneOf: [{
								enum: [],
								description: nls.locAlize('useUniqueNAmes', "PleAse use unique configurAtion nAmes.")
							}, {
								type: 'object',
								required: ['nAme'],
								properties: {
									nAme: {
										enum: [],
										description: nls.locAlize('App.lAunch.json.compound.nAme', "NAme of compound. AppeArs in the lAunch configurAtion drop down menu.")
									},
									folder: {
										enum: [],
										description: nls.locAlize('App.lAunch.json.compound.folder', "NAme of folder in which the compound is locAted.")
									}
								}
							}]
						},
						description: nls.locAlize('App.lAunch.json.compounds.configurAtions', "NAmes of configurAtions thAt will be stArted As pArt of this compound.")
					},
					stopAll: {
						type: 'booleAn',
						defAult: fAlse,
						description: nls.locAlize('App.lAunch.json.compound.stopAll', "Controls whether mAnuAlly terminAting one session will stop All of the compound sessions.")
					},
					preLAunchTAsk: {
						type: 'string',
						defAult: '',
						description: nls.locAlize('compoundPrelAunchTAsk', "TAsk to run before Any of the compound configurAtions stArt.")
					}
				},
				defAult: defAultCompound
			},
			defAult: [
				defAultCompound
			]
		},
		inputs: inputsSchemA.definitions!.inputs
	}
};
