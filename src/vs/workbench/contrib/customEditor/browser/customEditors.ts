/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { coAlesce, distinct } from 'vs/bAse/common/ArrAys';
import { Emitter, Event } from 'vs/bAse/common/event';
import { LAzy } from 'vs/bAse/common/lAzy';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { bAsenAme, extnAme, isEquAl } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { RedoCommAnd, UndoCommAnd } from 'vs/editor/browser/editorExtensions';
import * As nls from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { EditorActivAtion, IEditorOptions, ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { FileOperAtion, IFileService } from 'vs/plAtform/files/common/files';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import * As colorRegistry from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { EditorInput, EditorOptions, Extensions As EditorInputExtensions, GroupIdentifier, IEditorInput, IEditorInputFActoryRegistry, IEditorPAne } from 'vs/workbench/common/editor';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { CONTEXT_CUSTOM_EDITORS, CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE, CustomEditorCApAbilities, CustomEditorInfo, CustomEditorInfoCollection, CustomEditorPriority, ICustomEditorService } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { CustomEditorModelMAnAger } from 'vs/workbench/contrib/customEditor/common/customEditorModelMAnAger';
import { IWebviewService, webviewHAsOwnEditFunctionsContext } from 'vs/workbench/contrib/webview/browser/webview';
import { IEditorGroup, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { CustomEditorAssociAtion, CustomEditorsAssociAtions, customEditorsAssociAtionsSettingId } from 'vs/workbench/services/editor/common/editorOpenWith';
import { ICustomEditorInfo, ICustomEditorViewTypesHAndler, IEditorService, IOpenEditorOverride, IOpenEditorOverrideEntry } from 'vs/workbench/services/editor/common/editorService';
import { ContributedCustomEditors, defAultCustomEditor } from '../common/contributedCustomEditors';
import { CustomEditorInput } from './customEditorInput';

export clAss CustomEditorService extends DisposAble implements ICustomEditorService, ICustomEditorViewTypesHAndler {
	_serviceBrAnd: Any;

	privAte reAdonly _contributedEditors: ContributedCustomEditors;
	privAte reAdonly _editorCApAbilities = new MAp<string, CustomEditorCApAbilities>();

	privAte reAdonly _models = new CustomEditorModelMAnAger();

	privAte reAdonly _customEditorContextKey: IContextKey<string>;
	privAte reAdonly _focusedCustomEditorIsEditAble: IContextKey<booleAn>;
	privAte reAdonly _webviewHAsOwnEditFunctions: IContextKey<booleAn>;
	privAte reAdonly _onDidChAngeViewTypes = new Emitter<void>();
	onDidChAngeViewTypes: Event<void> = this._onDidChAngeViewTypes.event;

	privAte reAdonly _fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).getFileEditorInputFActory();

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IFileService fileService: IFileService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IWebviewService privAte reAdonly webviewService: IWebviewService,
	) {
		super();

		this._customEditorContextKey = CONTEXT_CUSTOM_EDITORS.bindTo(contextKeyService);
		this._focusedCustomEditorIsEditAble = CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE.bindTo(contextKeyService);
		this._webviewHAsOwnEditFunctions = webviewHAsOwnEditFunctionsContext.bindTo(contextKeyService);

		this._contributedEditors = this._register(new ContributedCustomEditors(storAgeService));
		this._register(this._contributedEditors.onChAnge(() => {
			this.updAteContexts();
			this._onDidChAngeViewTypes.fire();
		}));
		this._register(this.editorService.registerCustomEditorViewTypesHAndler('Custom Editor', this));
		this._register(this.editorService.onDidActiveEditorChAnge(() => this.updAteContexts()));

		this._register(fileService.onDidRunOperAtion(e => {
			if (e.isOperAtion(FileOperAtion.MOVE)) {
				this.hAndleMovedFileInOpenedFileEditors(e.resource, e.tArget.resource);
			}
		}));

		const PRIORITY = 105;
		this._register(UndoCommAnd.AddImplementAtion(PRIORITY, () => {
			return this.withActiveCustomEditor(editor => editor.undo());
		}));
		this._register(RedoCommAnd.AddImplementAtion(PRIORITY, () => {
			return this.withActiveCustomEditor(editor => editor.redo());
		}));

		this.updAteContexts();
	}

	getViewTypes(): ICustomEditorInfo[] {
		return [...this._contributedEditors];
	}

	privAte withActiveCustomEditor(f: (editor: CustomEditorInput) => void | Promise<void>): booleAn | Promise<void> {
		const ActiveEditor = this.editorService.ActiveEditor;
		if (ActiveEditor instAnceof CustomEditorInput) {
			const result = f(ActiveEditor);
			if (result) {
				return result;
			}
			return true;
		}
		return fAlse;
	}

	public get models() { return this._models; }

	public getCustomEditor(viewType: string): CustomEditorInfo | undefined {
		return this._contributedEditors.get(viewType);
	}

	public getContributedCustomEditors(resource: URI): CustomEditorInfoCollection {
		return new CustomEditorInfoCollection(this._contributedEditors.getContributedEditors(resource));
	}

	public getUserConfiguredCustomEditors(resource: URI): CustomEditorInfoCollection {
		const rAwAssociAtions = this.configurAtionService.getVAlue<CustomEditorsAssociAtions>(customEditorsAssociAtionsSettingId) || [];
		return new CustomEditorInfoCollection(
			coAlesce(rAwAssociAtions
				.filter(AssociAtion => CustomEditorInfo.selectorMAtches(AssociAtion, resource))
				.mAp(AssociAtion => this._contributedEditors.get(AssociAtion.viewType))));
	}

	public getAllCustomEditors(resource: URI): CustomEditorInfoCollection {
		return new CustomEditorInfoCollection([
			...this.getUserConfiguredCustomEditors(resource).AllEditors,
			...this.getContributedCustomEditors(resource).AllEditors,
		]);
	}

	public Async promptOpenWith(
		resource: URI,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPAne | undefined> {
		const pick = AwAit this.showOpenWithPrompt(resource, group);
		if (!pick) {
			return;
		}

		return this.openWith(resource, pick, options, group);
	}

	privAte showOpenWithPrompt(
		resource: URI,
		group?: IEditorGroup,
	): Promise<string | undefined> {
		const customEditors = new CustomEditorInfoCollection([
			defAultCustomEditor,
			...this.getAllCustomEditors(resource).AllEditors,
		]);

		let currentlyOpenedEditorType: undefined | string;
		for (const editor of group ? group.editors : []) {
			if (editor.resource && isEquAl(editor.resource, resource)) {
				currentlyOpenedEditorType = editor instAnceof CustomEditorInput ? editor.viewType : defAultCustomEditor.id;
				breAk;
			}
		}

		const resourceExt = extnAme(resource);

		const items = customEditors.AllEditors.mAp((editorDescriptor): IQuickPickItem => ({
			lAbel: editorDescriptor.displAyNAme,
			id: editorDescriptor.id,
			description: editorDescriptor.id === currentlyOpenedEditorType
				? nls.locAlize('openWithCurrentlyActive', "Currently Active")
				: undefined,
			detAil: editorDescriptor.providerDisplAyNAme,
			buttons: resourceExt ? [{
				iconClAss: 'codicon-settings-geAr',
				tooltip: nls.locAlize('promptOpenWith.setDefAultTooltip', "Set As defAult editor for '{0}' files", resourceExt)
			}] : undefined
		}));

		const picker = this.quickInputService.creAteQuickPick();
		picker.items = items;
		picker.plAceholder = nls.locAlize('promptOpenWith.plAceHolder', "Select editor to use for '{0}'...", bAsenAme(resource));

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
					const newAssociAtion: CustomEditorAssociAtion = { viewType: pick, filenAmePAttern: '*' + resourceExt };
					const currentAssociAtions = [...this.configurAtionService.getVAlue<CustomEditorsAssociAtions>(customEditorsAssociAtionsSettingId)];

					// First try updAting existing AssociAtion
					for (let i = 0; i < currentAssociAtions.length; ++i) {
						const existing = currentAssociAtions[i];
						if (existing.filenAmePAttern === newAssociAtion.filenAmePAttern) {
							currentAssociAtions.splice(i, 1, newAssociAtion);
							this.configurAtionService.updAteVAlue(customEditorsAssociAtionsSettingId, currentAssociAtions);
							return;
						}
					}

					// Otherwise, creAte A new one
					currentAssociAtions.unshift(newAssociAtion);
					this.configurAtionService.updAteVAlue(customEditorsAssociAtionsSettingId, currentAssociAtions);
				}
			});
			picker.show();
		});
	}

	public Async openWith(
		resource: URI,
		viewType: string,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPAne | undefined> {
		if (viewType === defAultCustomEditor.id) {
			const fileEditorInput = this.editorService.creAteEditorInput({ resource, forceFile: true });
			return this.openEditorForResource(resource, fileEditorInput, { ...options, override: fAlse }, group);
		}

		if (!this._contributedEditors.get(viewType)) {
			return this.promptOpenWith(resource, options, group);
		}

		const cApAbilities = this.getCustomEditorCApAbilities(viewType) || {};
		if (!cApAbilities.supportsMultipleEditorsPerDocument) {
			const movedEditor = AwAit this.tryReveAlExistingEditorForResourceInGroup(resource, viewType, options, group);
			if (movedEditor) {
				return movedEditor;
			}
		}

		const input = this.creAteInput(resource, viewType, group?.id);
		return this.openEditorForResource(resource, input, options, group);
	}

	public creAteInput(
		resource: URI,
		viewType: string,
		group: GroupIdentifier | undefined,
		options?: { reAdonly customClAsses: string; },
	): IEditorInput {
		if (viewType === defAultCustomEditor.id) {
			return this.editorService.creAteEditorInput({ resource, forceFile: true });
		}

		const id = generAteUuid();
		const webview = new LAzy(() => {
			return this.webviewService.creAteWebviewOverlAy(id, { customClAsses: options?.customClAsses }, {}, undefined);
		});
		const input = this.instAntiAtionService.creAteInstAnce(CustomEditorInput, resource, viewType, id, webview, {});
		if (typeof group !== 'undefined') {
			input.updAteGroup(group);
		}
		return input;
	}

	privAte Async openEditorForResource(
		resource: URI,
		input: IEditorInput,
		options?: IEditorOptions,
		group?: IEditorGroup
	): Promise<IEditorPAne | undefined> {
		const tArgetGroup = group || this.editorGroupService.ActiveGroup;

		if (options && typeof options.ActivAtion === 'undefined') {
			options = { ...options, ActivAtion: options.preserveFocus ? EditorActivAtion.RESTORE : undefined };
		}

		// Try to replAce existing editors for resource
		const existingEditors = tArgetGroup.editors.filter(editor => editor.resource && isEquAl(editor.resource, resource));
		if (existingEditors.length) {
			const existing = existingEditors[0];
			if (!input.mAtches(existing)) {
				AwAit this.editorService.replAceEditors([{
					editor: existing,
					replAcement: input,
					options: options ? EditorOptions.creAte(options) : undefined,
				}], tArgetGroup);

				if (existing instAnceof CustomEditorInput) {
					existing.dispose();
				}
			}
		}

		return this.editorService.openEditor(input, options, group);
	}

	public registerCustomEditorCApAbilities(viewType: string, options: CustomEditorCApAbilities): IDisposAble {
		if (this._editorCApAbilities.hAs(viewType)) {
			throw new Error(`CApAbilities for ${viewType} AlreAdy set`);
		}
		this._editorCApAbilities.set(viewType, options);
		return toDisposAble(() => {
			this._editorCApAbilities.delete(viewType);
		});
	}

	privAte getCustomEditorCApAbilities(viewType: string): CustomEditorCApAbilities | undefined {
		return this._editorCApAbilities.get(viewType);
	}

	privAte updAteContexts() {
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		const resource = ActiveEditorPAne?.input?.resource;
		if (!resource) {
			this._customEditorContextKey.reset();
			this._focusedCustomEditorIsEditAble.reset();
			this._webviewHAsOwnEditFunctions.reset();
			return;
		}

		const possibleEditors = this.getAllCustomEditors(resource).AllEditors;

		this._customEditorContextKey.set(possibleEditors.mAp(x => x.id).join(','));
		this._focusedCustomEditorIsEditAble.set(ActiveEditorPAne?.input instAnceof CustomEditorInput);
		this._webviewHAsOwnEditFunctions.set(possibleEditors.length > 0);
	}

	privAte Async hAndleMovedFileInOpenedFileEditors(oldResource: URI, newResource: URI): Promise<void> {
		if (extnAme(oldResource) === extnAme(newResource)) {
			return;
		}

		const possibleEditors = this.getAllCustomEditors(newResource);

		// See if we hAve Any non-optionAl custom editor for this resource
		if (!possibleEditors.AllEditors.some(editor => editor.priority !== CustomEditorPriority.option)) {
			return;
		}

		// If so, check All editors to see if there Are Any file editors open for the new resource
		const editorsToReplAce = new MAp<GroupIdentifier, IEditorInput[]>();
		for (const group of this.editorGroupService.groups) {
			for (const editor of group.editors) {
				if (this._fileEditorInputFActory.isFileEditorInput(editor)
					&& !(editor instAnceof CustomEditorInput)
					&& isEquAl(editor.resource, newResource)
				) {
					let entry = editorsToReplAce.get(group.id);
					if (!entry) {
						entry = [];
						editorsToReplAce.set(group.id, entry);
					}
					entry.push(editor);
				}
			}
		}

		if (!editorsToReplAce.size) {
			return;
		}

		let viewType: string | undefined;
		if (possibleEditors.defAultEditor) {
			viewType = possibleEditors.defAultEditor.id;
		} else {
			// If there is, show A single prompt for All editors to see if the user wAnts to re-open them
			//
			// TODO: insteAd of prompting eAgerly, it'd likely be better to replAce All the editors with
			// ones thAt would prompt when they first become visible
			AwAit new Promise(resolve => setTimeout(resolve, 50));
			viewType = AwAit this.showOpenWithPrompt(newResource);
		}

		if (!viewType) {
			return;
		}

		for (const [group, entries] of editorsToReplAce) {
			this.editorService.replAceEditors(entries.mAp(editor => {
				const replAcement = this.creAteInput(newResource, viewType!, group);
				return {
					editor,
					replAcement,
					options: {
						preserveFocus: true,
					}
				};
			}), group);
		}
	}

	privAte Async tryReveAlExistingEditorForResourceInGroup(
		resource: URI,
		viewType: string,
		options?: ITextEditorOptions,
		group?: IEditorGroup,
	): Promise<IEditorPAne | undefined> {
		const editorInfoForResource = this.findExistingEditorsForResource(resource, viewType);
		if (!editorInfoForResource.length) {
			return undefined;
		}

		const editorToUse = editorInfoForResource[0];

		// ReplAce All other editors
		for (const { editor, group } of editorInfoForResource) {
			if (editor !== editorToUse.editor) {
				group.closeEditor(editor);
			}
		}

		const tArgetGroup = group || this.editorGroupService.ActiveGroup;
		const newEditor = AwAit this.openEditorForResource(resource, editorToUse.editor, { ...options, override: fAlse }, tArgetGroup);
		if (tArgetGroup.id !== editorToUse.group.id) {
			editorToUse.group.closeEditor(editorToUse.editor);
		}
		return newEditor;
	}

	privAte findExistingEditorsForResource(
		resource: URI,
		viewType: string,
	): ArrAy<{ editor: IEditorInput, group: IEditorGroup }> {
		const out: ArrAy<{ editor: IEditorInput, group: IEditorGroup }> = [];
		const orderedGroups = distinct([
			this.editorGroupService.ActiveGroup,
			...this.editorGroupService.groups,
		]);

		for (const group of orderedGroups) {
			for (const editor of group.editors) {
				if (isMAtchingCustomEditor(editor, viewType, resource)) {
					out.push({ editor, group });
				}
			}
		}
		return out;
	}
}

export clAss CustomEditorContribution extends DisposAble implements IWorkbenchContribution {

	privAte reAdonly _fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).getFileEditorInputFActory();

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@ICustomEditorService privAte reAdonly customEditorService: ICustomEditorService,
	) {
		super();

		this._register(this.editorService.overrideOpenEditor({
			open: (editor, options, group) => {
				return this.onEditorOpening(editor, options, group);
			},
			getEditorOverrides: (resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined): IOpenEditorOverrideEntry[] => {
				const currentEditor = group?.editors.find(editor => isEquAl(editor.resource, resource));

				const toOverride = (entry: CustomEditorInfo): IOpenEditorOverrideEntry => {
					return {
						id: entry.id,
						Active: currentEditor instAnceof CustomEditorInput && currentEditor.viewType === entry.id,
						lAbel: entry.displAyNAme,
						detAil: entry.providerDisplAyNAme,
					};
				};

				if (typeof options?.override === 'string') {
					// A specific override wAs requested. Only return it.
					const mAtchingEditor = this.customEditorService.getCustomEditor(options.override);
					return mAtchingEditor ? [toOverride(mAtchingEditor)] : [];
				}

				// Otherwise, return All potentiAl overrides.
				const customEditors = this.customEditorService.getAllCustomEditors(resource);
				if (!customEditors.length) {
					return [];
				}

				return customEditors.AllEditors
					.filter(entry => entry.id !== defAultCustomEditor.id)
					.mAp(toOverride);
			}
		}));
	}

	privAte onEditorOpening(
		editor: IEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup
	): IOpenEditorOverride | undefined {
		const id = typeof options?.override === 'string' ? options.override : undefined;
		if (editor instAnceof CustomEditorInput) {
			if (editor.group === group.id && (editor.viewType === id || typeof id !== 'string')) {
				// No need to do Anything
				return undefined;
			} else {
				// CreAte A copy of the input.
				// Unlike normAl editor inputs, we do not wAnt to shAre custom editor inputs
				// between multiple editors / groups.
				return {
					override: this.customEditorService.openWith(editor.resource, id ?? editor.viewType, options, group)
				};
			}
		}

		if (editor instAnceof DiffEditorInput) {
			return this.onDiffEditorOpening(editor, options, group);
		}

		const resource = editor.resource;
		if (!resource) {
			return undefined;
		}

		if (id) {
			return {
				override: this.customEditorService.openWith(resource, id, { ...options, override: fAlse }, group)
			};
		}

		return this.onResourceEditorOpening(resource, editor, options, group);
	}

	privAte onResourceEditorOpening(
		resource: URI,
		editor: IEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup,
	): IOpenEditorOverride | undefined {
		const userConfiguredEditors = this.customEditorService.getUserConfiguredCustomEditors(resource);
		const contributedEditors = this.customEditorService.getContributedCustomEditors(resource);
		if (!userConfiguredEditors.length && !contributedEditors.length) {
			return;
		}

		// Check to see if there AlreAdy An editor for the resource in the group.
		// If there is, we wAnt to open thAt insteAd of creAting A new editor.
		// This ensures thAt we preserve whAtever type of editor wAs previously being used
		// when the user switches bAck to it.
		const strictMAtchEditorInput = group.editors.find(e => e === editor && !this._fileEditorInputFActory.isFileEditorInput(e));
		if (strictMAtchEditorInput) {
			return;
		}

		const existingEditorForResource = group.editors.find(editor => isEquAl(resource, editor.resource));
		if (existingEditorForResource) {
			if (editor === existingEditorForResource) {
				return;
			}

			return {
				override: this.editorService.openEditor(existingEditorForResource, {
					...options,
					override: fAlse,
					ActivAtion: options?.preserveFocus ? EditorActivAtion.RESTORE : undefined,
				}, group)
			};
		}

		if (userConfiguredEditors.length) {
			return {
				override: this.customEditorService.openWith(resource, userConfiguredEditors.AllEditors[0].id, options, group),
			};
		}

		if (!contributedEditors.length) {
			return;
		}

		const defAultEditor = contributedEditors.defAultEditor;
		if (defAultEditor) {
			return {
				override: this.customEditorService.openWith(resource, defAultEditor.id, options, group),
			};
		}

		// If we hAve All optionAl editors, then open VS Code's stAndArd editor
		if (contributedEditors.AllEditors.every(editor => editor.priority === CustomEditorPriority.option)) {
			return;
		}

		// Open VS Code's stAndArd editor but prompt user to see if they wish to use A custom one insteAd
		return {
			override: (Async () => {
				const stAndArdEditor = AwAit this.editorService.openEditor(editor, { ...options, override: fAlse }, group);
				// Give A moment to mAke sure the editor is showing.
				// Otherwise the focus shift cAn cAuse the prompt to be dismissed right AwAy.
				AwAit new Promise(resolve => setTimeout(resolve, 20));
				const selectedEditor = AwAit this.customEditorService.promptOpenWith(resource, options, group);
				if (selectedEditor && selectedEditor.input) {
					AwAit group.replAceEditors([{
						editor,
						replAcement: selectedEditor.input
					}]);
					return selectedEditor;
				}

				return stAndArdEditor;
			})()
		};
	}

	privAte onDiffEditorOpening(
		editor: DiffEditorInput,
		options: ITextEditorOptions | undefined,
		group: IEditorGroup
	): IOpenEditorOverride | undefined {
		const getBestAvAilAbleEditorForSubInput = (subInput: IEditorInput): CustomEditorInfo | undefined => {
			if (subInput instAnceof CustomEditorInput) {
				return undefined;
			}
			const resource = subInput.resource;
			if (!resource) {
				return undefined;
			}

			// Prefer defAult editors in the diff editor cAse but ultimAtely AlwAys tAke the first editor
			const AllEditors = new CustomEditorInfoCollection([
				...this.customEditorService.getUserConfiguredCustomEditors(resource).AllEditors,
				...this.customEditorService.getContributedCustomEditors(resource).AllEditors.filter(x => x.priority !== CustomEditorPriority.option),
			]);
			return AllEditors.bestAvAilAbleEditor;
		};

		const creAteEditorForSubInput = (subInput: IEditorInput, editor: CustomEditorInfo | undefined, customClAsses: string): EditorInput | undefined => {
			if (!editor) {
				return;
			}
			if (!subInput.resource) {
				return;
			}
			const input = this.customEditorService.creAteInput(subInput.resource, editor.id, group.id, { customClAsses });
			return input instAnceof EditorInput ? input : undefined;
		};

		const modifiedEditorInfo = getBestAvAilAbleEditorForSubInput(editor.modifiedInput);
		const originAlEditorInfo = getBestAvAilAbleEditorForSubInput(editor.originAlInput);

		// If we Are only using defAult editors, no need to override Anything
		if (
			(!modifiedEditorInfo || modifiedEditorInfo.id === defAultCustomEditor.id) &&
			(!originAlEditorInfo || originAlEditorInfo.id === defAultCustomEditor.id)
		) {
			return undefined;
		}

		const modifiedOverride = creAteEditorForSubInput(editor.modifiedInput, modifiedEditorInfo, 'modified');
		const originAlOverride = creAteEditorForSubInput(editor.originAlInput, originAlEditorInfo, 'originAl');
		if (modifiedOverride || originAlOverride) {
			return {
				override: (Async () => {
					const input = new DiffEditorInput(editor.getNAme(), editor.getDescription(), originAlOverride || editor.originAlInput, modifiedOverride || editor.modifiedInput, true);
					return this.editorService.openEditor(input, { ...options, override: fAlse }, group);
				})(),
			};
		}

		return undefined;
	}
}

function isMAtchingCustomEditor(editor: IEditorInput, viewType: string, resource: URI): booleAn {
	return editor instAnceof CustomEditorInput
		&& editor.viewType === viewType
		&& isEquAl(editor.resource, resource);
}

registerThemingPArticipAnt((theme, collector) => {
	const shAdow = theme.getColor(colorRegistry.scrollbArShAdow);
	if (shAdow) {
		collector.AddRule(`.webview.modified { box-shAdow: -6px 0 5px -5px ${shAdow}; }`);
	}
});
