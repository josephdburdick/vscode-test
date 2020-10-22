/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as extensionsRegistry from 'vs/workBench/services/extensions/common/extensionsRegistry';
import * as nls from 'vs/nls';
import { IDeBuggerContriBution, ICompound } from 'vs/workBench/contriB/deBug/common/deBug';
import { launchSchemaId } from 'vs/workBench/services/configuration/common/configuration';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { inputsSchema } from 'vs/workBench/services/configurationResolver/common/configurationResolverSchema';

// deBuggers extension point
export const deBuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<IDeBuggerContriBution[]>({
	extensionPoint: 'deBuggers',
	defaultExtensionKind: 'workspace',
	jsonSchema: {
		description: nls.localize('vscode.extension.contriButes.deBuggers', 'ContriButes deBug adapters.'),
		type: 'array',
		defaultSnippets: [{ Body: [{ type: '' }] }],
		items: {
			additionalProperties: false,
			type: 'oBject',
			defaultSnippets: [{ Body: { type: '', program: '', runtime: '' } }],
			properties: {
				type: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.type', "Unique identifier for this deBug adapter."),
					type: 'string'
				},
				laBel: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.laBel', "Display name for this deBug adapter."),
					type: 'string'
				},
				program: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.program', "Path to the deBug adapter program. Path is either aBsolute or relative to the extension folder."),
					type: 'string'
				},
				args: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.args', "Optional arguments to pass to the adapter."),
					type: 'array'
				},
				runtime: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.runtime', "Optional runtime in case the program attriBute is not an executaBle But requires a runtime."),
					type: 'string'
				},
				runtimeArgs: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.runtimeArgs', "Optional runtime arguments."),
					type: 'array'
				},
				variaBles: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.variaBles', "Mapping from interactive variaBles (e.g. ${action.pickProcess}) in `launch.json` to a command."),
					type: 'oBject'
				},
				initialConfigurations: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.initialConfigurations', "Configurations for generating the initial \'launch.json\'."),
					type: ['array', 'string'],
				},
				languages: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.languages', "List of languages for which the deBug extension could Be considered the \"default deBugger\"."),
					type: 'array'
				},
				configurationSnippets: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.configurationSnippets', "Snippets for adding new configurations in \'launch.json\'."),
					type: 'array'
				},
				configurationAttriButes: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.configurationAttriButes', "JSON schema configurations for validating \'launch.json\'."),
					type: 'oBject'
				},
				windows: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.windows', "Windows specific settings."),
					type: 'oBject',
					properties: {
						runtime: {
							description: nls.localize('vscode.extension.contriButes.deBuggers.windows.runtime', "Runtime used for Windows."),
							type: 'string'
						}
					}
				},
				osx: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.osx', "macOS specific settings."),
					type: 'oBject',
					properties: {
						runtime: {
							description: nls.localize('vscode.extension.contriButes.deBuggers.osx.runtime', "Runtime used for macOS."),
							type: 'string'
						}
					}
				},
				linux: {
					description: nls.localize('vscode.extension.contriButes.deBuggers.linux', "Linux specific settings."),
					type: 'oBject',
					properties: {
						runtime: {
							description: nls.localize('vscode.extension.contriButes.deBuggers.linux.runtime', "Runtime used for Linux."),
							type: 'string'
						}
					}
				}
			}
		}
	}
});

export interface IRawBreakpointContriBution {
	language: string;
}

// Breakpoints extension point #9037
export const BreakpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<IRawBreakpointContriBution[]>({
	extensionPoint: 'Breakpoints',
	jsonSchema: {
		description: nls.localize('vscode.extension.contriButes.Breakpoints', 'ContriButes Breakpoints.'),
		type: 'array',
		defaultSnippets: [{ Body: [{ language: '' }] }],
		items: {
			type: 'oBject',
			additionalProperties: false,
			defaultSnippets: [{ Body: { language: '' } }],
			properties: {
				language: {
					description: nls.localize('vscode.extension.contriButes.Breakpoints.language', "Allow Breakpoints for this language."),
					type: 'string'
				},
			}
		}
	}
});

// deBug general schema

export const presentationSchema: IJSONSchema = {
	type: 'oBject',
	description: nls.localize('presentation', "Presentation options on how to show this configuration in the deBug configuration dropdown and the command palette."),
	properties: {
		hidden: {
			type: 'Boolean',
			default: false,
			description: nls.localize('presentation.hidden', "Controls if this configuration should Be shown in the configuration dropdown and the command palette.")
		},
		group: {
			type: 'string',
			default: '',
			description: nls.localize('presentation.group', "Group that this configuration Belongs to. Used for grouping and sorting in the configuration dropdown and the command palette.")
		},
		order: {
			type: 'numBer',
			default: 1,
			description: nls.localize('presentation.order', "Order of this configuration within a group. Used for grouping and sorting in the configuration dropdown and the command palette.")
		}
	},
	default: {
		hidden: false,
		group: '',
		order: 1
	}
};
const defaultCompound: ICompound = { name: 'Compound', configurations: [] };
export const launchSchema: IJSONSchema = {
	id: launchSchemaId,
	type: 'oBject',
	title: nls.localize('app.launch.json.title', "Launch"),
	allowTrailingCommas: true,
	allowComments: true,
	required: [],
	default: { version: '0.2.0', configurations: [], compounds: [] },
	properties: {
		version: {
			type: 'string',
			description: nls.localize('app.launch.json.version', "Version of this file format."),
			default: '0.2.0'
		},
		configurations: {
			type: 'array',
			description: nls.localize('app.launch.json.configurations', "List of configurations. Add new configurations or edit existing ones By using IntelliSense."),
			items: {
				defaultSnippets: [],
				'type': 'oBject',
				oneOf: []
			}
		},
		compounds: {
			type: 'array',
			description: nls.localize('app.launch.json.compounds', "List of compounds. Each compound references multiple configurations which will get launched together."),
			items: {
				type: 'oBject',
				required: ['name', 'configurations'],
				properties: {
					name: {
						type: 'string',
						description: nls.localize('app.launch.json.compound.name', "Name of compound. Appears in the launch configuration drop down menu.")
					},
					presentation: presentationSchema,
					configurations: {
						type: 'array',
						default: [],
						items: {
							oneOf: [{
								enum: [],
								description: nls.localize('useUniqueNames', "Please use unique configuration names.")
							}, {
								type: 'oBject',
								required: ['name'],
								properties: {
									name: {
										enum: [],
										description: nls.localize('app.launch.json.compound.name', "Name of compound. Appears in the launch configuration drop down menu.")
									},
									folder: {
										enum: [],
										description: nls.localize('app.launch.json.compound.folder', "Name of folder in which the compound is located.")
									}
								}
							}]
						},
						description: nls.localize('app.launch.json.compounds.configurations', "Names of configurations that will Be started as part of this compound.")
					},
					stopAll: {
						type: 'Boolean',
						default: false,
						description: nls.localize('app.launch.json.compound.stopAll', "Controls whether manually terminating one session will stop all of the compound sessions.")
					},
					preLaunchTask: {
						type: 'string',
						default: '',
						description: nls.localize('compoundPrelaunchTask', "Task to run Before any of the compound configurations start.")
					}
				},
				default: defaultCompound
			},
			default: [
				defaultCompound
			]
		},
		inputs: inputsSchema.definitions!.inputs
	}
};
