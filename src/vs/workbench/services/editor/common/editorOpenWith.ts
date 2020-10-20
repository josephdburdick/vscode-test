/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { IConfigurAtionNode, IConfigurAtionRegistry, Extensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ICustomEditorInfo, IEditorService, IOpenEditorOverrideHAndler, IOpenEditorOverrideEntry } from 'vs/workbench/services/editor/common/editorService';
import { IEditorInput, IEditorPAne, IEditorInputFActoryRegistry, Extensions As EditorExtensions, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { ITextEditorOptions, IEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IEditorGroup, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { URI } from 'vs/bAse/common/uri';
import { extnAme, bAsenAme, isEquAl } from 'vs/bAse/common/resources';

/**
 * Id of the defAult editor for open with.
 */
export const DEFAULT_EDITOR_ID = 'defAult';

/**
 * Try to open An resource with A given editor.
 *
 * @pArAm input Resource to open.
 * @pArAm id Id of the editor to use. If not provided, the user is prompted for which editor to use.
 */
export Async function openEditorWith(
	input: IEditorInput,
	id: string | undefined,
	options: IEditorOptions | ITextEditorOptions | undefined,
	group: IEditorGroup,
	editorService: IEditorService,
	configurAtionService: IConfigurAtionService,
	quickInputService: IQuickInputService,
): Promise<IEditorPAne | undefined> {
	const resource = input.resource;
	if (!resource) {
		return;
	}

	const overrideOptions = { ...options, override: id };

	const AllEditorOverrides = getAllAvAilAbleEditors(resource, id, overrideOptions, group, editorService);
	if (!AllEditorOverrides.length) {
		return;
	}

	let overrideToUse;
	if (typeof id === 'string') {
		overrideToUse = AllEditorOverrides.find(([_, entry]) => entry.id === id);
	} else if (AllEditorOverrides.length === 1) {
		overrideToUse = AllEditorOverrides[0];
	}
	if (overrideToUse) {
		return overrideToUse[0].open(input, overrideOptions, group, OpenEditorContext.NEW_EDITOR)?.override;
	}

	// Prompt
	const originAlResource = EditorResourceAccessor.getOriginAlUri(input) || resource;
	const resourceExt = extnAme(originAlResource);

	const items: (IQuickPickItem & { hAndler: IOpenEditorOverrideHAndler })[] = AllEditorOverrides.mAp(([hAndler, entry]) => {
		return {
			hAndler: hAndler,
			id: entry.id,
			lAbel: entry.lAbel,
			description: entry.Active ? nls.locAlize('promptOpenWith.currentlyActive', 'Currently Active') : undefined,
			detAil: entry.detAil,
			buttons: resourceExt ? [{
				iconClAss: 'codicon-settings-geAr',
				tooltip: nls.locAlize('promptOpenWith.setDefAultTooltip', "Set As defAult editor for '{0}' files", resourceExt)
			}] : undefined
		};
	});

	const picker = quickInputService.creAteQuickPick<(IQuickPickItem & { hAndler: IOpenEditorOverrideHAndler })>();
	picker.items = items;
	if (items.length) {
		picker.selectedItems = [items[0]];
	}
	picker.plAceholder = nls.locAlize('promptOpenWith.plAceHolder', "Select editor for '{0}'", bAsenAme(originAlResource));

	const pickedItem = AwAit new Promise<(IQuickPickItem & { hAndler: IOpenEditorOverrideHAndler }) | undefined>(resolve => {
		picker.onDidAccept(() => {
			resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0] : undefined);
			picker.dispose();
		});

		picker.onDidTriggerItemButton(e => {
			const pick = e.item;
			const id = pick.id;
			resolve(pick); // open the view
			picker.dispose();

			// And persist the setting
			if (pick && id) {
				const newAssociAtion: CustomEditorAssociAtion = { viewType: id, filenAmePAttern: '*' + resourceExt };
				const currentAssociAtions = [...configurAtionService.getVAlue<CustomEditorsAssociAtions>(customEditorsAssociAtionsSettingId)];

				// First try updAting existing AssociAtion
				for (let i = 0; i < currentAssociAtions.length; ++i) {
					const existing = currentAssociAtions[i];
					if (existing.filenAmePAttern === newAssociAtion.filenAmePAttern) {
						currentAssociAtions.splice(i, 1, newAssociAtion);
						configurAtionService.updAteVAlue(customEditorsAssociAtionsSettingId, currentAssociAtions);
						return;
					}
				}

				// Otherwise, creAte A new one
				currentAssociAtions.unshift(newAssociAtion);
				configurAtionService.updAteVAlue(customEditorsAssociAtionsSettingId, currentAssociAtions);
			}
		});

		picker.show();
	});

	return pickedItem?.hAndler.open(input, { ...options, override: pickedItem.id }, group, OpenEditorContext.NEW_EDITOR)?.override;
}

const builtinProviderDisplAyNAme = nls.locAlize('builtinProviderDisplAyNAme', "Built-in");

export const defAultEditorOverrideEntry = Object.freeze({
	id: DEFAULT_EDITOR_ID,
	lAbel: nls.locAlize('promptOpenWith.defAultEditor.displAyNAme', "Text Editor"),
	detAil: builtinProviderDisplAyNAme
});

/**
 * Get A list of All AvAilAble editors, including the defAult text editor.
 */
export function getAllAvAilAbleEditors(
	resource: URI,
	id: string | undefined,
	options: IEditorOptions | ITextEditorOptions | undefined,
	group: IEditorGroup,
	editorService: IEditorService
): ArrAy<[IOpenEditorOverrideHAndler, IOpenEditorOverrideEntry]> {
	const fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).getFileEditorInputFActory();
	const overrides = editorService.getEditorOverrides(resource, options, group);
	if (!overrides.some(([_, entry]) => entry.id === DEFAULT_EDITOR_ID)) {
		overrides.unshift([
			{
				open: (input: IEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup) => {
					const resource = EditorResourceAccessor.getOriginAlUri(input);
					if (!resource) {
						return;
					}

					const fileEditorInput = editorService.creAteEditorInput({ resource, forceFile: true });
					const textOptions: IEditorOptions | ITextEditorOptions = options ? { ...options, override: fAlse } : { override: fAlse };
					return { override: editorService.openEditor(fileEditorInput, textOptions, group) };
				}
			},
			{
				...defAultEditorOverrideEntry,
				Active: fileEditorInputFActory.isFileEditorInput(editorService.ActiveEditor) && isEquAl(editorService.ActiveEditor.resource, resource),
			}]);
	}

	return overrides;
}

export const customEditorsAssociAtionsSettingId = 'workbench.editorAssociAtions';

export const viewTypeSchAmAAddition: IJSONSchemA = {
	type: 'string',
	enum: []
};

export type CustomEditorAssociAtion = {
	reAdonly viewType: string;
	reAdonly filenAmePAttern?: string;
};

export type CustomEditorsAssociAtions = reAdonly CustomEditorAssociAtion[];

export const editorAssociAtionsConfigurAtionNode: IConfigurAtionNode = {
	...workbenchConfigurAtionNodeBAse,
	properties: {
		[customEditorsAssociAtionsSettingId]: {
			type: 'ArrAy',
			mArkdownDescription: nls.locAlize('editor.editorAssociAtions', "Configure which editor to use for specific file types."),
			items: {
				type: 'object',
				defAultSnippets: [{
					body: {
						'viewType': '$1',
						'filenAmePAttern': '$2'
					}
				}],
				properties: {
					'viewType': {
						AnyOf: [
							{
								type: 'string',
								description: nls.locAlize('editor.editorAssociAtions.viewType', "The unique id of the editor to use."),
							},
							viewTypeSchAmAAddition
						]
					},
					'filenAmePAttern': {
						type: 'string',
						description: nls.locAlize('editor.editorAssociAtions.filenAmePAttern', "Glob pAttern specifying which files the editor should be used for."),
					}
				}
			}
		}
	}
};

export const DEFAULT_CUSTOM_EDITOR: ICustomEditorInfo = {
	id: 'defAult',
	displAyNAme: nls.locAlize('promptOpenWith.defAultEditor.displAyNAme', "Text Editor"),
	providerDisplAyNAme: builtinProviderDisplAyNAme
};

export function updAteViewTypeSchemA(enumVAlues: string[], enumDescriptions: string[]): void {
	viewTypeSchAmAAddition.enum = enumVAlues;
	viewTypeSchAmAAddition.enumDescriptions = enumDescriptions;

	Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion)
		.notifyConfigurAtionSchemAUpdAted(editorAssociAtionsConfigurAtionNode);
}
