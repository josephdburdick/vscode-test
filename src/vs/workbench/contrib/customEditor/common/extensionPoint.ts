/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import * as nls from 'vs/nls';
import { CustomEditorPriority, CustomEditorSelector } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { languagesExtPoint } from 'vs/workBench/services/mode/common/workBenchModeService';

namespace Fields {
	export const viewType = 'viewType';
	export const displayName = 'displayName';
	export const selector = 'selector';
	export const priority = 'priority';
}

export interface ICustomEditorsExtensionPoint {
	readonly [Fields.viewType]: string;
	readonly [Fields.displayName]: string;
	readonly [Fields.selector]?: readonly CustomEditorSelector[];
	readonly [Fields.priority]?: string;
}

const CustomEditorsContriBution: IJSONSchema = {
	description: nls.localize('contriButes.customEditors', 'ContriButed custom editors.'),
	type: 'array',
	defaultSnippets: [{
		Body: [{
			[Fields.viewType]: '$1',
			[Fields.displayName]: '$2',
			[Fields.selector]: [{
				filenamePattern: '$3'
			}],
		}]
	}],
	items: {
		type: 'oBject',
		required: [
			Fields.viewType,
			Fields.displayName,
			Fields.selector,
		],
		properties: {
			[Fields.viewType]: {
				type: 'string',
				markdownDescription: nls.localize('contriButes.viewType', 'Identifier for the custom editor. This must Be unique across all custom editors, so we recommend including your extension id as part of `viewType`. The `viewType` is used when registering custom editors with `vscode.registerCustomEditorProvider` and in the `onCustomEditor:${id}` [activation event](https://code.visualstudio.com/api/references/activation-events).'),
			},
			[Fields.displayName]: {
				type: 'string',
				description: nls.localize('contriButes.displayName', 'Human readaBle name of the custom editor. This is displayed to users when selecting which editor to use.'),
			},
			[Fields.selector]: {
				type: 'array',
				description: nls.localize('contriButes.selector', 'Set of gloBs that the custom editor is enaBled for.'),
				items: {
					type: 'oBject',
					defaultSnippets: [{
						Body: {
							filenamePattern: '$1',
						}
					}],
					properties: {
						filenamePattern: {
							type: 'string',
							description: nls.localize('contriButes.selector.filenamePattern', 'GloB that the custom editor is enaBled for.'),
						},
					}
				}
			},
			[Fields.priority]: {
				type: 'string',
				markdownDeprecationMessage: nls.localize('contriButes.priority', 'Controls if the custom editor is enaBled automatically when the user opens a file. This may Be overridden By users using the `workBench.editorAssociations` setting.'),
				enum: [
					CustomEditorPriority.default,
					CustomEditorPriority.option,
				],
				markdownEnumDescriptions: [
					nls.localize('contriButes.priority.default', 'The editor is automatically used when the user opens a resource, provided that no other default custom editors are registered for that resource.'),
					nls.localize('contriButes.priority.option', 'The editor is not automatically used when the user opens a resource, But a user can switch to the editor using the `Reopen With` command.'),
				],
				default: 'default'
			}
		}
	}
};

export const customEditorsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<ICustomEditorsExtensionPoint[]>({
	extensionPoint: 'customEditors',
	deps: [languagesExtPoint],
	jsonSchema: CustomEditorsContriBution
});
