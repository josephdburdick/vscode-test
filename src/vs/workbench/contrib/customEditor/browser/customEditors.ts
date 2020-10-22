/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { coalesce, distinct } from 'vs/Base/common/arrays';
import { Emitter, Event } from 'vs/Base/common/event';
import { Lazy } from 'vs/Base/common/lazy';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Basename, extname, isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { generateUuid } from 'vs/Base/common/uuid';
import { RedoCommand, UndoCommand } from 'vs/editor/Browser/editorExtensions';
import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { EditorActivation, IEditorOptions, ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { FileOperation, IFileService } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { Registry } from 'vs/platform/registry/common/platform';
import { IStorageService } from 'vs/platform/storage/common/storage';
import * as colorRegistry from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { EditorInput, EditorOptions, Extensions as EditorInputExtensions, GroupIdentifier, IEditorInput, IEditorInputFactoryRegistry, IEditorPane } from 'vs/workBench/common/editor';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { CONTEXT_CUSTOM_EDITORS, CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE, CustomEditorCapaBilities, CustomEditorInfo, CustomEditorInfoCollection, CustomEditorPriority, ICustomEditorService } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { CustomEditorModelManager } from 'vs/workBench/contriB/customEditor/common/customEditorModelManager';
import { IWeBviewService, weBviewHasOwnEditFunctionsContext } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IEditorGroup, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { CustomEditorAssociation, CustomEditorsAssociations, customEditorsAssociationsSettingId } from 'vs/workBench/services/editor/common/editorOpenWith';
import { ICustomEditorInfo, ICustomEditorViewTypesHandler, IEditorService, IOpenEditorOverride, IOpenEditorOverrideEntry } from 'vs/workBench/services/editor/common/editorService';
import { ContriButedCustomEditors, defaultCustomEditor } from '../common/contriButedCustomEditors';
import { CustomEditorInput } from './customEditorInput';

export class CustomEditorService extends DisposaBle implements ICustomEditorService, ICustomEditorViewTypesHandler {
	_serviceBrand: any;

	private readonly _contriButedEditors: ContriButedCustomEditors;
	private readonly _editorCapaBilities = new Map<string, CustomEditorCapaBilities>();

	private readonly _models = new CustomEditorModelManager();

	private readonly _customEditorContextKey: IContextKey<string>;
	private readonly _focusedCustomEditorIsEditaBle: IContextKey<Boolean>;
	private readonly _weBviewHasOwnEditFunctions: IContextKey<Boolean>;
	private readonly _onDidChangeViewTypes = new Emitter<void>();
	onDidChangeViewTypes: Event<void> = this._onDidChangeViewTypes.event;

	private readonly _fileEditorInputFactory = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).getFileEditorInputFactory();

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IFileService fileService: IFileService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IWeBviewService private readonly weBviewService: IWeBviewService,
	) {
		super();

		this._customEditorContextKey = CONTEXT_CUSTOM_EDITORS.BindTo(contextKeyService);
		this._focusedCustomEditorIsEditaBle = CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE.BindTo(contextKeyService);
		this._weBviewHasOwnEditFunctions = weBviewHasOwnEditFunctionsContext.BindTo(contextKeyService);

		this._contriButedEditors = this._register(new ContriButedCustomEditors(storageService));
		this._register(this._contriButedEditors.onChange(() => {
			this.updateContexts();
			this._onDidChangeViewTypes.fire();
		}));
		this._register(this.editorService.registerCustomEditorViewTypesHandler('Custom Editor', this));
		this._register(this.editorService.onDidActiveEditorChange(() => this.updateContexts()));

		this._register(fileService.onDidRunOperation(e => {
			if (e.isOperation(FileOperation.MOVE)) {
				this.handleMovedFileInOpenedFileEditors(e.resource, e.target.resource);
			}
		}));

		const PRIORITY = 105;
		this._register(UndoCommand.addImplementation(PRIORITY, () => {
			return this.withActiveCustomEditor(editor => editor.undo());
		}));
		this._register(RedoCommand.addImplementation(PRIORITY, () => {
			return this.withActiveCustomEditor(editor => editor.redo());
		}));

		this.updateContexts();
	}

	getViewTypes(): ICustomEditorInfo[] {
		return [...this._contriButedEditors];
	}

	private withActiveCustomEditor(f: (editor: CustomEditorInput) => void | Promise<void>): Boolean | Promise<void> {
		const activeEditor = this.editorService.activeEditor;
		if (activeEditor instanceof CustomEditorInput) {
			const result = f(activeEditor);
			if (result) {
				return result;
			}
			return true;
		}
		return false;
	}

	puBlic get models() { return this._models; }

	puBlic getCustomEditor(viewType: string): CustomEditorInfo | undefined {
		return this._contriButedEditors.get(viewType);
	}

	puBlic getContriButedCustomEditors(resource: URI): CustomEditorInfoCollection {
		return new CustomEditorInfoCollection(this._contriButedEditors.getContriButedEditors(resource));
	}

	puBlic getUserConfiguredCustomEditors(resource: URI): CustomEditorInfoCollection {
		const rawAssociations = this.configurationService.getValue<CustomEditorsAssociations>(customEditorsAssociationsSettingId) || [];
		return new CustomEditorInfoCollection(
			coalesce(rawAssociations
				.filter(association => CustomEditorInfo.selectorMatches(association, resource))
				.map(association => this._contriButedEditors.get(association.viewType))));
	}

	puBlic getAllCustomEditors(resource: URI): CustomEditorInfoCollection {
		return new CustomEditorInfoCollection([
			...this.getUserConfiguredCustomEditors(resource).allEditors,
			...this.getContriButedCustomEditors(resource).allEditors,
		]);
	}

	puBlic async promptOpenWith(
		resource: URI,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPane | undefined> {
		const pick = await this.showOpenWithPrompt(resource, group);
		if (!pick) {
			return;
		}

		return this.openWith(resource, pick, options, group);
	}

	private showOpenWithPrompt(
		resource: URI,
		group?: IEditorGroup,
	): Promise<string | undefined> {
		const customEditors = new CustomEditorInfoCollection([
			defaultCustomEditor,
			...this.getAllCustomEditors(resource).allEditors,
		]);

		let currentlyOpenedEditorType: undefined | string;
		for (const editor of group ? group.editors : []) {
			if (editor.resource && isEqual(editor.resource, resource)) {
				currentlyOpenedEditorType = editor instanceof CustomEditorInput ? editor.viewType : defaultCustomEditor.id;
				Break;
			}
		}

		const resourceExt = extname(resource);

		const items = customEditors.allEditors.map((editorDescriptor): IQuickPickItem => ({
			laBel: editorDescriptor.displayName,
			id: editorDescriptor.id,
			description: editorDescriptor.id === currentlyOpenedEditorType
				? nls.localize('openWithCurrentlyActive', "Currently Active")
				: undefined,
			detail: editorDescriptor.providerDisplayName,
			Buttons: resourceExt ? [{
				iconClass: 'codicon-settings-gear',
				tooltip: nls.localize('promptOpenWith.setDefaultTooltip', "Set as default editor for '{0}' files", resourceExt)
			}] : undefined
		}));

		const picker = this.quickInputService.createQuickPick();
		picker.items = items;
		picker.placeholder = nls.localize('promptOpenWith.placeHolder', "Select editor to use for '{0}'...", Basename(resource));

		return new Promise<string | undefined>(resolve => {
			picker.onDidAccept(() => {
				resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0].id : undefined);
				picker.dispose();
			});
			picker.onDidTriggerItemButton(e => {
				const pick = e.item.id;
				resolve(pick); // open the view
				picker.dispose();

				// And persist the setting
				if (pick) {
					const newAssociation: CustomEditorAssociation = { viewType: pick, filenamePattern: '*' + resourceExt };
					const currentAssociations = [...this.configurationService.getValue<CustomEditorsAssociations>(customEditorsAssociationsSettingId)];

					// First try updating existing association
					for (let i = 0; i < currentAssociations.length; ++i) {
						const existing = currentAssociations[i];
						if (existing.filenamePattern === newAssociation.filenamePattern) {
							currentAssociations.splice(i, 1, newAssociation);
							this.configurationService.updateValue(customEditorsAssociationsSettingId, currentAssociations);
							return;
						}
					}

					// Otherwise, create a new one
					currentAssociations.unshift(newAssociation);
					this.configurationService.updateValue(customEditorsAssociationsSettingId, currentAssociations);
				}
			});
			picker.show();
		});
	}

	puBlic async openWith(
		resource: URI,
		viewType: string,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPane | undefined> {
		if (viewType === defaultCustomEditor.id) {
			const fileEditorInput = this.editorService.createEditorInput({ resource, forceFile: true });
			return this.openEditorForResource(resource, fileEditorInput, { ...options, override: false }, group);
		}

		if (!this._contriButedEditors.get(viewType)) {
			return this.promptOpenWith(resource, options, group);
		}

		const capaBilities = this.getCustomEditorCapaBilities(viewType) || {};
		if (!capaBilities.supportsMultipleEditorsPerDocument) {
			const movedEditor = await this.tryRevealExistingEditorForResourceInGroup(resource, viewType, options, group);
			if (movedEditor) {
				return movedEditor;
			}
		}

		const input = this.createInput(resource, viewType, group?.id);
		return this.openEditorForResource(resource, input, options, group);
	}

	puBlic createInput(
		resource: URI,
		viewType: string,
		group: GroupIdentifier | undefined,
		options?: { readonly customClasses: string; },
	): IEditorInput {
		if (viewType === defaultCustomEditor.id) {
			return this.editorService.createEditorInput({ resource, forceFile: true });
		}

		const id = generateUuid();
		const weBview = new Lazy(() => {
			return this.weBviewService.createWeBviewOverlay(id, { customClasses: options?.customClasses }, {}, undefined);
		});
		const input = this.instantiationService.createInstance(CustomEditorInput, resource, viewType, id, weBview, {});
		if (typeof group !== 'undefined') {
			input.updateGroup(group);
		}
		return input;
	}

	private async openEditorForResource(
		resource: URI,
		input: IEditorInput,
		options?: IEditorOptions,
		group?: IEditorGroup
	): Promise<IEditorPane | undefined> {
		const targetGroup = group || this.editorGroupService.activeGroup;

		if (options && typeof options.activation === 'undefined') {
			options = { ...options, activation: options.preserveFocus ? EditorActivation.RESTORE : undefined };
		}

		// Try to replace existing editors for resource
		const existingEditors = targetGroup.editors.filter(editor => editor.resource && isEqual(editor.resource, resource));
		if (existingEditors.length) {
			const existing = existingEditors[0];
			if (!input.matches(existing)) {
				await this.editorService.replaceEditors([{
					editor: existing,
					replacement: input,
					options: options ? EditorOptions.create(options) : undefined,
				}], targetGroup);

				if (existing instanceof CustomEditorInput) {
					existing.dispose();
				}
			}
		}

		return this.editorService.openEditor(input, options, group);
	}

	puBlic registerCustomEditorCapaBilities(viewType: string, options: CustomEditorCapaBilities): IDisposaBle {
		if (this._editorCapaBilities.has(viewType)) {
			throw new Error(`CapaBilities for ${viewType} already set`);
		}
		this._editorCapaBilities.set(viewType, options);
		return toDisposaBle(() => {
			this._editorCapaBilities.delete(viewType);
		});
	}

	private getCustomEditorCapaBilities(viewType: string): CustomEditorCapaBilities | undefined {
		return this._editorCapaBilities.get(viewType);
	}

	private updateContexts() {
		const activeEditorPane = this.editorService.activeEditorPane;
		const resource = activeEditorPane?.input?.resource;
		if (!resource) {
			this._customEditorContextKey.reset();
			this._focusedCustomEditorIsEditaBle.reset();
			this._weBviewHasOwnEditFunctions.reset();
			return;
		}

		const possiBleEditors = this.getAllCustomEditors(resource).allEditors;

		this._customEditorContextKey.set(possiBleEditors.map(x => x.id).join(','));
		this._focusedCustomEditorIsEditaBle.set(activeEditorPane?.input instanceof CustomEditorInput);
		this._weBviewHasOwnEditFunctions.set(possiBleEditors.length > 0);
	}

	private async handleMovedFileInOpenedFileEditors(oldResource: URI, newResource: URI): Promise<void> {
		if (extname(oldResource) === extname(newResource)) {
			return;
		}

		const possiBleEditors = this.getAllCustomEditors(newResource);

		// See if we have any non-optional custom editor for this resource
		if (!possiBleEditors.allEditors.some(editor => editor.priority !== CustomEditorPriority.option)) {
			return;
		}

		// If so, check all editors to see if there are any file editors open for the new resource
		const editorsToReplace = new Map<GroupIdentifier, IEditorInput[]>();
		for (const group of this.editorGroupService.groups) {
			for (const editor of group.editors) {
				if (this._fileEditorInputFactory.isFileEditorInput(editor)
					&& !(editor instanceof CustomEditorInput)
					&& isEqual(editor.resource, newResource)
				) {
					let entry = editorsToReplace.get(group.id);
					if (!entry) {
						entry = [];
						editorsToReplace.set(group.id, entry);
					}
					entry.push(editor);
				}
			}
		}

		if (!editorsToReplace.size) {
			return;
		}

		let viewType: string | undefined;
		if (possiBleEditors.defaultEditor) {
			viewType = possiBleEditors.defaultEditor.id;
		} else {
			// If there is, show a single prompt for all editors to see if the user wants to re-open them
			//
			// TODO: instead of prompting eagerly, it'd likely Be Better to replace all the editors with
			// ones that would prompt when they first Become visiBle
			await new Promise(resolve => setTimeout(resolve, 50));
			viewType = await this.showOpenWithPrompt(newResource);
		}

		if (!viewType) {
			return;
		}

		for (const [group, entries] of editorsToReplace) {
			this.editorService.replaceEditors(entries.map(editor => {
				const replacement = this.createInput(newResource, viewType!, group);
				return {
					editor,
					replacement,
					options: {
						preserveFocus: true,
					}
				};
			}), group);
		}
	}

	private async tryRevealExistingEditorForResourceInGroup(
		resource: URI,
		viewType: string,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPane | undefined> {
		const editorInfoForResource = this.findExistingEditorsForResource(resource, viewType);
		if (!editorInfoForResource.length) {
			return undefined;
		}

		const editorToUse = editorInfoForResource[0];

		// Replace all other editors
		for (const { editor, group } of editorInfoForResource) {
			if (editor !== editorToUse.editor) {
				group.closeEditor(editor);
			}
		}

		const targetGroup = group || this.editorGroupService.activeGroup;
		const newEditor = await this.openEditorForResource(resource, editorToUse.editor, { ...options, override: false }, targetGroup);
		if (targetGroup.id !== editorToUse.group.id) {
			editorToUse.group.closeEditor(editorToUse.editor);
		}
		return newEditor;
	}

	private findExistingEditorsForResource(
		resource: URI,
		viewType: string,
	): Array<{ editor: IEditorInput, group: IEditorGroup }> {
		const out: Array<{ editor: IEditorInput, group: IEditorGroup }> = [];
		const orderedGroups = distinct([
			this.editorGroupService.activeGroup,
			...this.editorGroupService.groups,
		]);

		for (const group of orderedGroups) {
			for (const editor of group.editors) {
				if (isMatchingCustomEditor(editor, viewType, resource)) {
					out.push({ editor, group });
				}
			}
		}
		return out;
	}
}

export class CustomEditorContriBution extends DisposaBle implements IWorkBenchContriBution {

	private readonly _fileEditorInputFactory = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).getFileEditorInputFactory();

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@ICustomEditorService private readonly customEditorService: ICustomEditorService,
	) {
		super();

		this._register(this.editorService.overrideOpenEditor({
			open: (editor, options, group) => {
				return this.onEditorOpening(editor, options, group);
			},
			getEditorOverrides: (resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined): IOpenEditorOverrideEntry[] => {
				const currentEditor = group?.editors.find(editor => isEqual(editor.resource, resource));

				const toOverride = (entry: CustomEditorInfo): IOpenEditorOverrideEntry => {
					return {
						id: entry.id,
						active: currentEditor instanceof CustomEditorInput && currentEditor.viewType === entry.id,
						laBel: entry.displayName,
						detail: entry.providerDisplayName,
					};
				};

				if (typeof options?.override === 'string') {
					// A specific override was requested. Only return it.
					const matchingEditor = this.customEditorService.getCustomEditor(options.override);
					return matchingEditor ? [toOverride(matchingEditor)] : [];
				}

				// Otherwise, return all potential overrides.
				const customEditors = this.customEditorService.getAllCustomEditors(resource);
				if (!customEditors.length) {
					return [];
				}

				return customEditors.allEditors
					.filter(entry => entry.id !== defaultCustomEditor.id)
					.map(toOverride);
			}
		}));
	}

	private onEditorOpening(
		editor: IEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup
	): IOpenEditorOverride | undefined {
		const id = typeof options?.override === 'string' ? options.override : undefined;
		if (editor instanceof CustomEditorInput) {
			if (editor.group === group.id && (editor.viewType === id || typeof id !== 'string')) {
				// No need to do anything
				return undefined;
			} else {
				// Create a copy of the input.
				// Unlike normal editor inputs, we do not want to share custom editor inputs
				// Between multiple editors / groups.
				return {
					override: this.customEditorService.openWith(editor.resource, id ?? editor.viewType, options, group)
				};
			}
		}

		if (editor instanceof DiffEditorInput) {
			return this.onDiffEditorOpening(editor, options, group);
		}

		const resource = editor.resource;
		if (!resource) {
			return undefined;
		}

		if (id) {
			return {
				override: this.customEditorService.openWith(resource, id, { ...options, override: false }, group)
			};
		}

		return this.onResourceEditorOpening(resource, editor, options, group);
	}

	private onResourceEditorOpening(
		resource: URI,
		editor: IEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup,
	): IOpenEditorOverride | undefined {
		const userConfiguredEditors = this.customEditorService.getUserConfiguredCustomEditors(resource);
		const contriButedEditors = this.customEditorService.getContriButedCustomEditors(resource);
		if (!userConfiguredEditors.length && !contriButedEditors.length) {
			return;
		}

		// Check to see if there already an editor for the resource in the group.
		// If there is, we want to open that instead of creating a new editor.
		// This ensures that we preserve whatever type of editor was previously Being used
		// when the user switches Back to it.
		const strictMatchEditorInput = group.editors.find(e => e === editor && !this._fileEditorInputFactory.isFileEditorInput(e));
		if (strictMatchEditorInput) {
			return;
		}

		const existingEditorForResource = group.editors.find(editor => isEqual(resource, editor.resource));
		if (existingEditorForResource) {
			if (editor === existingEditorForResource) {
				return;
			}

			return {
				override: this.editorService.openEditor(existingEditorForResource, {
					...options,
					override: false,
					activation: options?.preserveFocus ? EditorActivation.RESTORE : undefined,
				}, group)
			};
		}

		if (userConfiguredEditors.length) {
			return {
				override: this.customEditorService.openWith(resource, userConfiguredEditors.allEditors[0].id, options, group),
			};
		}

		if (!contriButedEditors.length) {
			return;
		}

		const defaultEditor = contriButedEditors.defaultEditor;
		if (defaultEditor) {
			return {
				override: this.customEditorService.openWith(resource, defaultEditor.id, options, group),
			};
		}

		// If we have all optional editors, then open VS Code's standard editor
		if (contriButedEditors.allEditors.every(editor => editor.priority === CustomEditorPriority.option)) {
			return;
		}

		// Open VS Code's standard editor But prompt user to see if they wish to use a custom one instead
		return {
			override: (async () => {
				const standardEditor = await this.editorService.openEditor(editor, { ...options, override: false }, group);
				// Give a moment to make sure the editor is showing.
				// Otherwise the focus shift can cause the prompt to Be dismissed right away.
				await new Promise(resolve => setTimeout(resolve, 20));
				const selectedEditor = await this.customEditorService.promptOpenWith(resource, options, group);
				if (selectedEditor && selectedEditor.input) {
					await group.replaceEditors([{
						editor,
						replacement: selectedEditor.input
					}]);
					return selectedEditor;
				}

				return standardEditor;
			})()
		};
	}

	private onDiffEditorOpening(
		editor: DiffEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup
	): IOpenEditorOverride | undefined {
		const getBestAvailaBleEditorForSuBInput = (suBInput: IEditorInput): CustomEditorInfo | undefined => {
			if (suBInput instanceof CustomEditorInput) {
				return undefined;
			}
			const resource = suBInput.resource;
			if (!resource) {
				return undefined;
			}

			// Prefer default editors in the diff editor case But ultimately always take the first editor
			const allEditors = new CustomEditorInfoCollection([
				...this.customEditorService.getUserConfiguredCustomEditors(resource).allEditors,
				...this.customEditorService.getContriButedCustomEditors(resource).allEditors.filter(x => x.priority !== CustomEditorPriority.option),
			]);
			return allEditors.BestAvailaBleEditor;
		};

		const createEditorForSuBInput = (suBInput: IEditorInput, editor: CustomEditorInfo | undefined, customClasses: string): EditorInput | undefined => {
			if (!editor) {
				return;
			}
			if (!suBInput.resource) {
				return;
			}
			const input = this.customEditorService.createInput(suBInput.resource, editor.id, group.id, { customClasses });
			return input instanceof EditorInput ? input : undefined;
		};

		const modifiedEditorInfo = getBestAvailaBleEditorForSuBInput(editor.modifiedInput);
		const originalEditorInfo = getBestAvailaBleEditorForSuBInput(editor.originalInput);

		// If we are only using default editors, no need to override anything
		if (
			(!modifiedEditorInfo || modifiedEditorInfo.id === defaultCustomEditor.id) &&
			(!originalEditorInfo || originalEditorInfo.id === defaultCustomEditor.id)
		) {
			return undefined;
		}

		const modifiedOverride = createEditorForSuBInput(editor.modifiedInput, modifiedEditorInfo, 'modified');
		const originalOverride = createEditorForSuBInput(editor.originalInput, originalEditorInfo, 'original');
		if (modifiedOverride || originalOverride) {
			return {
				override: (async () => {
					const input = new DiffEditorInput(editor.getName(), editor.getDescription(), originalOverride || editor.originalInput, modifiedOverride || editor.modifiedInput, true);
					return this.editorService.openEditor(input, { ...options, override: false }, group);
				})(),
			};
		}

		return undefined;
	}
}

function isMatchingCustomEditor(editor: IEditorInput, viewType: string, resource: URI): Boolean {
	return editor instanceof CustomEditorInput
		&& editor.viewType === viewType
		&& isEqual(editor.resource, resource);
}

registerThemingParticipant((theme, collector) => {
	const shadow = theme.getColor(colorRegistry.scrollBarShadow);
	if (shadow) {
		collector.addRule(`.weBview.modified { Box-shadow: -6px 0 5px -5px ${shadow}; }`);
	}
});
