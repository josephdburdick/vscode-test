/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import * As nls from 'vs/nls';
import { CustomEditorPriority, CustomEditorSelector } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { lAnguAgesExtPoint } from 'vs/workbench/services/mode/common/workbenchModeService';

nAmespAce Fields {
	export const viewType = 'viewType';
	export const displAyNAme = 'displAyNAme';
	export const selector = 'selector';
	export const priority = 'priority';
}

export interfAce ICustomEditorsExtensionPoint {
	reAdonly [Fields.viewType]: string;
	reAdonly [Fields.displAyNAme]: string;
	reAdonly [Fields.selector]?: reAdonly CustomEditorSelector[];
	reAdonly [Fields.priority]?: string;
}

const CustomEditorsContribution: IJSONSchemA = {
	description: nls.locAlize('contributes.customEditors', 'Contributed custom editors.'),
	type: 'ArrAy',
	defAultSnippets: [{
		body: [{
			[Fields.viewType]: '$1',
			[Fields.displAyNAme]: '$2',
			[Fields.selector]: [{
				filenAmePAttern: '$3'
			}],
		}]
	}],
	items: {
		type: 'object',
		required: [
			Fields.viewType,
			Fields.displAyNAme,
			Fields.selector,
		],
		properties: {
			[Fields.viewType]: {
				type: 'string',
				mArkdownDescription: nls.locAlize('contributes.viewType', 'Identifier for the custom editor. This must be unique Across All custom editors, so we recommend including your extension id As pArt of `viewType`. The `viewType` is used when registering custom editors with `vscode.registerCustomEditorProvider` And in the `onCustomEditor:${id}` [ActivAtion event](https://code.visuAlstudio.com/Api/references/ActivAtion-events).'),
			},
			[Fields.displAyNAme]: {
				type: 'string',
				description: nls.locAlize('contributes.displAyNAme', 'HumAn reAdAble nAme of the custom editor. This is displAyed to users when selecting which editor to use.'),
			},
			[Fields.selector]: {
				type: 'ArrAy',
				description: nls.locAlize('contributes.selector', 'Set of globs thAt the custom editor is enAbled for.'),
				items: {
					type: 'object',
					defAultSnippets: [{
						body: {
							filenAmePAttern: '$1',
						}
					}],
					properties: {
						filenAmePAttern: {
							type: 'string',
							description: nls.locAlize('contributes.selector.filenAmePAttern', 'Glob thAt the custom editor is enAbled for.'),
						},
					}
				}
			},
			[Fields.priority]: {
				type: 'string',
				mArkdownDeprecAtionMessAge: nls.locAlize('contributes.priority', 'Controls if the custom editor is enAbled AutomAticAlly when the user opens A file. This mAy be overridden by users using the `workbench.editorAssociAtions` setting.'),
				enum: [
					CustomEditorPriority.defAult,
					CustomEditorPriority.option,
				],
				mArkdownEnumDescriptions: [
					nls.locAlize('contributes.priority.defAult', 'The editor is AutomAticAlly used when the user opens A resource, provided thAt no other defAult custom editors Are registered for thAt resource.'),
					nls.locAlize('contributes.priority.option', 'The editor is not AutomAticAlly used when the user opens A resource, but A user cAn switch to the editor using the `Reopen With` commAnd.'),
				],
				defAult: 'defAult'
			}
		}
	}
};

export const customEditorsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<ICustomEditorsExtensionPoint[]>({
	extensionPoint: 'customEditors',
	deps: [lAnguAgesExtPoint],
	jsonSchemA: CustomEditorsContribution
});
