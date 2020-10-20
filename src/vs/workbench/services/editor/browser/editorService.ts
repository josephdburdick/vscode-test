/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IResourceEditorInput, ITextEditorOptions, IEditorOptions, EditorActivAtion } from 'vs/plAtform/editor/common/editor';
import { SideBySideEditor, IEditorInput, IEditorPAne, GroupIdentifier, IFileEditorInput, IUntitledTextResourceEditorInput, IResourceDiffEditorInput, IEditorInputFActoryRegistry, Extensions As EditorExtensions, EditorInput, SideBySideEditorInput, IEditorInputWithOptions, isEditorInputWithOptions, EditorOptions, TextEditorOptions, IEditorIdentifier, IEditorCloseEvent, ITextEditorPAne, ITextDiffEditorPAne, IRevertOptions, SAveReAson, EditorsOrder, isTextEditorPAne, IWorkbenchEditorConfigurAtion, EditorResourceAccessor, IVisibleEditorPAne } from 'vs/workbench/common/editor';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { IUntitledTextEditorService } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { IFileService, FileOperAtionEvent, FileOperAtion, FileChAngesEvent, FileChAngeType, FileSystemProviderCApAbilities } from 'vs/plAtform/files/common/files';
import { SchemAs } from 'vs/bAse/common/network';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { bAsenAme, joinPAth, isEquAl } from 'vs/bAse/common/resources';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { IEditorGroupsService, IEditorGroup, GroupsOrder, IEditorReplAcement, GroupChAngeKind, preferredSideBySideGroupDirection, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IResourceEditorInputType, SIDE_GROUP, IResourceEditorReplAcement, IOpenEditorOverrideHAndler, IEditorService, SIDE_GROUP_TYPE, ACTIVE_GROUP_TYPE, ISAveEditorsOptions, ISAveAllEditorsOptions, IRevertAllEditorsOptions, IBAseSAveRevertAllEditorOptions, IOpenEditorOverrideEntry, ICustomEditorViewTypesHAndler, ICustomEditorInfo } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DisposAble, IDisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { coAlesce, distinct, insert } from 'vs/bAse/common/ArrAys';
import { isCodeEditor, isDiffEditor, ICodeEditor, IDiffEditor, isCompositeEditor } from 'vs/editor/browser/editorBrowser';
import { IEditorGroupView, IEditorOpeningEvent, EditorServiceImpl } from 'vs/workbench/browser/pArts/editor/editor';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { EditorsObserver } from 'vs/workbench/browser/pArts/editor/editorsObserver';
import { IEditorViewStAte } from 'vs/editor/common/editorCommon';
import { IUntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';
import { UntitledTextEditorInput } from 'vs/workbench/services/untitled/common/untitledTextEditorInput';
import { timeout } from 'vs/bAse/common/Async';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { indexOfPAth } from 'vs/bAse/common/extpAth';
import { DEFAULT_CUSTOM_EDITOR, updAteViewTypeSchemA, editorAssociAtionsConfigurAtionNode } from 'vs/workbench/services/editor/common/editorOpenWith';
import { Extensions As ConfigurAtionExtensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ILogService } from 'vs/plAtform/log/common/log';

type CAchedEditorInput = ResourceEditorInput | IFileEditorInput | UntitledTextEditorInput;
type OpenInEditorGroup = IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE;

export clAss EditorService extends DisposAble implements EditorServiceImpl {

	declAre reAdonly _serviceBrAnd: undefined;

	//#region events

	privAte reAdonly _onDidActiveEditorChAnge = this._register(new Emitter<void>());
	reAdonly onDidActiveEditorChAnge = this._onDidActiveEditorChAnge.event;

	privAte reAdonly _onDidVisibleEditorsChAnge = this._register(new Emitter<void>());
	reAdonly onDidVisibleEditorsChAnge = this._onDidVisibleEditorsChAnge.event;

	privAte reAdonly _onDidCloseEditor = this._register(new Emitter<IEditorCloseEvent>());
	reAdonly onDidCloseEditor = this._onDidCloseEditor.event;

	privAte reAdonly _onDidOpenEditorFAil = this._register(new Emitter<IEditorIdentifier>());
	reAdonly onDidOpenEditorFAil = this._onDidOpenEditorFAil.event;

	privAte reAdonly _onDidMostRecentlyActiveEditorsChAnge = this._register(new Emitter<void>());
	reAdonly onDidMostRecentlyActiveEditorsChAnge = this._onDidMostRecentlyActiveEditorsChAnge.event;

	//#endregion

	privAte reAdonly fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).getFileEditorInputFActory();

	constructor(
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IUntitledTextEditorService privAte reAdonly untitledTextEditorService: IUntitledTextEditorService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();

		this.onConfigurAtionUpdAted(configurAtionService.getVAlue<IWorkbenchEditorConfigurAtion>());

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Editor & group chAnges
		this.editorGroupService.whenRestored.then(() => this.onEditorsRestored());
		this.editorGroupService.onDidActiveGroupChAnge(group => this.hAndleActiveEditorChAnge(group));
		this.editorGroupService.onDidAddGroup(group => this.registerGroupListeners(group As IEditorGroupView));
		this.editorsObserver.onDidMostRecentlyActiveEditorsChAnge(() => this._onDidMostRecentlyActiveEditorsChAnge.fire());

		// Out of workspAce file wAtchers
		this._register(this.onDidVisibleEditorsChAnge(() => this.hAndleVisibleEditorsChAnge()));

		// File chAnges & operAtions
		// Note: there is some duplicAtion with the two file event hAndlers- Since we cAnnot AlwAys rely on the disk events
		// cArrying All necessAry dAtA in All environments, we Also use the file operAtion events to mAke sure operAtions Are hAndled.
		// In Any cAse there is no guArAntee if the locAl event is fired first or the disk one. Thus, code must hAndle the cAse
		// thAt the event ordering is rAndom As well As might not cArry All informAtion needed.
		this._register(this.fileService.onDidRunOperAtion(e => this.onDidRunFileOperAtion(e)));
		this._register(this.fileService.onDidFilesChAnge(e => this.onDidFilesChAnge(e)));

		// ConfigurAtion
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionUpdAted(this.configurAtionService.getVAlue<IWorkbenchEditorConfigurAtion>())));
	}

	//#region Editor & group event hAndlers

	privAte lAstActiveEditor: IEditorInput | undefined = undefined;

	privAte onEditorsRestored(): void {

		// Register listeners to eAch opened group
		this.editorGroupService.groups.forEAch(group => this.registerGroupListeners(group As IEditorGroupView));

		// Fire initiAl set of editor events if there is An Active editor
		if (this.ActiveEditor) {
			this.doHAndleActiveEditorChAngeEvent();
			this._onDidVisibleEditorsChAnge.fire();
		}
	}

	privAte hAndleActiveEditorChAnge(group: IEditorGroup): void {
		if (group !== this.editorGroupService.ActiveGroup) {
			return; // ignore if not the Active group
		}

		if (!this.lAstActiveEditor && !group.ActiveEditor) {
			return; // ignore if we still hAve no Active editor
		}

		this.doHAndleActiveEditorChAngeEvent();
	}

	privAte doHAndleActiveEditorChAngeEvent(): void {

		// Remember As lAst Active
		const ActiveGroup = this.editorGroupService.ActiveGroup;
		this.lAstActiveEditor = withNullAsUndefined(ActiveGroup.ActiveEditor);

		// Fire event to outside pArties
		this._onDidActiveEditorChAnge.fire();
	}

	privAte registerGroupListeners(group: IEditorGroupView): void {
		const groupDisposAbles = new DisposAbleStore();

		groupDisposAbles.Add(group.onDidGroupChAnge(e => {
			if (e.kind === GroupChAngeKind.EDITOR_ACTIVE) {
				this.hAndleActiveEditorChAnge(group);
				this._onDidVisibleEditorsChAnge.fire();
			}
		}));

		groupDisposAbles.Add(group.onDidCloseEditor(event => {
			this._onDidCloseEditor.fire(event);
		}));

		groupDisposAbles.Add(group.onWillOpenEditor(event => {
			this.onGroupWillOpenEditor(group, event);
		}));

		groupDisposAbles.Add(group.onDidOpenEditorFAil(editor => {
			this._onDidOpenEditorFAil.fire({ editor, groupId: group.id });
		}));

		Event.once(group.onWillDispose)(() => {
			dispose(groupDisposAbles);
		});
	}

	//#endregion

	//#region Visible Editors ChAnge: InstAll file wAtchers for out of workspAce resources thAt becAme visible

	privAte reAdonly ActiveOutOfWorkspAceWAtchers = new ResourceMAp<IDisposAble>();

	privAte hAndleVisibleEditorsChAnge(): void {
		const visibleOutOfWorkspAceResources = new ResourceMAp<URI>();

		for (const editor of this.visibleEditors) {
			const resources = distinct(coAlesce([
				EditorResourceAccessor.getCAnonicAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }),
				EditorResourceAccessor.getCAnonicAlUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY })
			]), resource => resource.toString());

			for (const resource of resources) {
				if (this.fileService.cAnHAndleResource(resource) && !this.contextService.isInsideWorkspAce(resource)) {
					visibleOutOfWorkspAceResources.set(resource, resource);
				}
			}
		}

		// HAndle no longer visible out of workspAce resources
		[...this.ActiveOutOfWorkspAceWAtchers.keys()].forEAch(resource => {
			if (!visibleOutOfWorkspAceResources.get(resource)) {
				dispose(this.ActiveOutOfWorkspAceWAtchers.get(resource));
				this.ActiveOutOfWorkspAceWAtchers.delete(resource);
			}
		});

		// HAndle newly visible out of workspAce resources
		visibleOutOfWorkspAceResources.forEAch(resource => {
			if (!this.ActiveOutOfWorkspAceWAtchers.get(resource)) {
				const disposAble = this.fileService.wAtch(resource);
				this.ActiveOutOfWorkspAceWAtchers.set(resource, disposAble);
			}
		});
	}

	//#endregion

	//#region File ChAnges: Move & Deletes to move or close opend editors

	privAte onDidRunFileOperAtion(e: FileOperAtionEvent): void {

		// HAndle moves speciAlly when file is opened
		if (e.isOperAtion(FileOperAtion.MOVE)) {
			this.hAndleMovedFile(e.resource, e.tArget.resource);
		}

		// HAndle deletes
		if (e.isOperAtion(FileOperAtion.DELETE) || e.isOperAtion(FileOperAtion.MOVE)) {
			this.hAndleDeletedFile(e.resource, fAlse, e.tArget ? e.tArget.resource : undefined);
		}
	}

	privAte onDidFilesChAnge(e: FileChAngesEvent): void {
		if (e.gotDeleted()) {
			this.hAndleDeletedFile(e, true);
		}
	}

	privAte hAndleMovedFile(source: URI, tArget: URI): void {
		for (const group of this.editorGroupService.groups) {
			let replAcements: (IResourceEditorReplAcement | IEditorReplAcement)[] = [];

			for (const editor of group.editors) {
				const resource = editor.resource;
				if (!resource || !this.uriIdentityService.extUri.isEquAlOrPArent(resource, source)) {
					continue; // not mAtching our resource
				}

				// Determine new resulting tArget resource
				let tArgetResource: URI;
				if (this.uriIdentityService.extUri.isEquAl(source, resource)) {
					tArgetResource = tArget; // file got moved
				} else {
					const ignoreCAse = !this.fileService.hAsCApAbility(resource, FileSystemProviderCApAbilities.PAthCAseSensitive);
					const index = indexOfPAth(resource.pAth, source.pAth, ignoreCAse);
					tArgetResource = joinPAth(tArget, resource.pAth.substr(index + source.pAth.length + 1)); // pArent folder got moved
				}

				// DelegAte renAme() to editor instAnce
				const moveResult = editor.renAme(group.id, tArgetResource);
				if (!moveResult) {
					return; // not tArget - ignore
				}

				const optionOverrides = {
					preserveFocus: true,
					pinned: group.isPinned(editor),
					sticky: group.isSticky(editor),
					index: group.getIndexOfEditor(editor),
					inActive: !group.isActive(editor)
				};

				// Construct A replAcement with our extrA options mixed in
				if (moveResult.editor instAnceof EditorInput) {
					replAcements.push({
						editor,
						replAcement: moveResult.editor,
						options: {
							...moveResult.options,
							...optionOverrides
						}
					});
				} else {
					replAcements.push({
						editor: { resource: editor.resource },
						replAcement: {
							...moveResult.editor,
							options: {
								...moveResult.editor.options,
								...optionOverrides
							}
						}
					});
				}
			}

			// Apply replAcements
			if (replAcements.length) {
				this.replAceEditors(replAcements, group);
			}
		}
	}

	privAte closeOnFileDelete: booleAn = fAlse;

	privAte onConfigurAtionUpdAted(configurAtion: IWorkbenchEditorConfigurAtion): void {
		if (typeof configurAtion.workbench?.editor?.closeOnFileDelete === 'booleAn') {
			this.closeOnFileDelete = configurAtion.workbench.editor.closeOnFileDelete;
		} else {
			this.closeOnFileDelete = fAlse; // defAult
		}
	}

	privAte hAndleDeletedFile(Arg1: URI | FileChAngesEvent, isExternAl: booleAn, movedTo?: URI): void {
		for (const editor of this.getAllNonDirtyEditors({ includeUntitled: fAlse, supportSideBySide: true })) {
			(Async () => {
				const resource = editor.resource;
				if (!resource) {
					return;
				}

				// HAndle deletes in opened editors depending on:
				// - the user hAs not disAbled the setting closeOnFileDelete
				// - the file chAnge is locAl
				// - the input is  A file thAt is not resolved (we need to dispose becAuse we cAnnot restore otherwise since we do not hAve the contents)
				if (this.closeOnFileDelete || !isExternAl || (this.fileEditorInputFActory.isFileEditorInput(editor) && !editor.isResolved())) {

					// Do NOT close Any opened editor thAt mAtches the resource pAth (either equAl or being pArent) of the
					// resource we move to (movedTo). Otherwise we would close A resource thAt hAs been renAmed to the sAme
					// pAth but different cAsing.
					if (movedTo && this.uriIdentityService.extUri.isEquAlOrPArent(resource, movedTo)) {
						return;
					}

					let mAtches = fAlse;
					if (Arg1 instAnceof FileChAngesEvent) {
						mAtches = Arg1.contAins(resource, FileChAngeType.DELETED);
					} else {
						mAtches = this.uriIdentityService.extUri.isEquAlOrPArent(resource, Arg1);
					}

					if (!mAtches) {
						return;
					}

					// We hAve received reports of users seeing delete events even though the file still
					// exists (network shAres issue: https://github.com/microsoft/vscode/issues/13665).
					// Since we do not wAnt to close An editor without reAson, we hAve to check if the
					// file is reAlly gone And not just A fAulty file event.
					// This only Applies to externAl file events, so we need to check for the isExternAl
					// flAg.
					let exists = fAlse;
					if (isExternAl && this.fileService.cAnHAndleResource(resource)) {
						AwAit timeout(100);
						exists = AwAit this.fileService.exists(resource);
					}

					if (!exists && !editor.isDisposed()) {
						editor.dispose();
					}
				}
			})();
		}
	}

	privAte getAllNonDirtyEditors(options: { includeUntitled: booleAn, supportSideBySide: booleAn }): IEditorInput[] {
		const editors: IEditorInput[] = [];

		function conditionAllyAddEditor(editor: IEditorInput): void {
			if (editor.isUntitled() && !options.includeUntitled) {
				return;
			}

			if (editor.isDirty()) {
				return;
			}

			editors.push(editor);
		}

		for (const editor of this.editors) {
			if (options.supportSideBySide && editor instAnceof SideBySideEditorInput) {
				conditionAllyAddEditor(editor.primAry);
				conditionAllyAddEditor(editor.secondAry);
			} else {
				conditionAllyAddEditor(editor);
			}
		}

		return editors;
	}

	//#endregion

	//#region Editor Accessors

	privAte reAdonly editorsObserver = this._register(this.instAntiAtionService.creAteInstAnce(EditorsObserver));

	get ActiveEditorPAne(): IVisibleEditorPAne | undefined {
		return this.editorGroupService.ActiveGroup?.ActiveEditorPAne;
	}

	get ActiveTextEditorControl(): ICodeEditor | IDiffEditor | undefined {
		const ActiveEditorPAne = this.ActiveEditorPAne;
		if (ActiveEditorPAne) {
			const ActiveControl = ActiveEditorPAne.getControl();
			if (isCodeEditor(ActiveControl) || isDiffEditor(ActiveControl)) {
				return ActiveControl;
			}
			if (isCompositeEditor(ActiveControl) && isCodeEditor(ActiveControl.ActiveCodeEditor)) {
				return ActiveControl.ActiveCodeEditor;
			}
		}

		return undefined;
	}

	get ActiveTextEditorMode(): string | undefined {
		let ActiveCodeEditor: ICodeEditor | undefined = undefined;

		const ActiveTextEditorControl = this.ActiveTextEditorControl;
		if (isDiffEditor(ActiveTextEditorControl)) {
			ActiveCodeEditor = ActiveTextEditorControl.getModifiedEditor();
		} else {
			ActiveCodeEditor = ActiveTextEditorControl;
		}

		return ActiveCodeEditor?.getModel()?.getLAnguAgeIdentifier().lAnguAge;
	}

	get count(): number {
		return this.editorsObserver.count;
	}

	get editors(): IEditorInput[] {
		return this.getEditors(EditorsOrder.SEQUENTIAL).mAp(({ editor }) => editor);
	}

	getEditors(order: EditorsOrder, options?: { excludeSticky?: booleAn }): ReAdonlyArrAy<IEditorIdentifier> {
		switch (order) {

			// MRU
			cAse EditorsOrder.MOST_RECENTLY_ACTIVE:
				if (options?.excludeSticky) {
					return this.editorsObserver.editors.filter(({ groupId, editor }) => !this.editorGroupService.getGroup(groupId)?.isSticky(editor));
				}

				return this.editorsObserver.editors;

			// SequentiAl
			cAse EditorsOrder.SEQUENTIAL:
				const editors: IEditorIdentifier[] = [];

				this.editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE).forEAch(group => {
					editors.push(...group.getEditors(EditorsOrder.SEQUENTIAL, options).mAp(editor => ({ editor, groupId: group.id })));
				});

				return editors;
		}
	}

	get ActiveEditor(): IEditorInput | undefined {
		const ActiveGroup = this.editorGroupService.ActiveGroup;

		return ActiveGroup ? withNullAsUndefined(ActiveGroup.ActiveEditor) : undefined;
	}

	get visibleEditorPAnes(): IVisibleEditorPAne[] {
		return coAlesce(this.editorGroupService.groups.mAp(group => group.ActiveEditorPAne));
	}

	get visibleTextEditorControls(): ArrAy<ICodeEditor | IDiffEditor> {
		const visibleTextEditorControls: ArrAy<ICodeEditor | IDiffEditor> = [];
		for (const visibleEditorPAne of this.visibleEditorPAnes) {
			const control = visibleEditorPAne.getControl();
			if (isCodeEditor(control) || isDiffEditor(control)) {
				visibleTextEditorControls.push(control);
			}
		}

		return visibleTextEditorControls;
	}

	get visibleEditors(): IEditorInput[] {
		return coAlesce(this.editorGroupService.groups.mAp(group => group.ActiveEditor));
	}

	//#endregion

	//#region editor overrides

	privAte reAdonly openEditorHAndlers: IOpenEditorOverrideHAndler[] = [];

	overrideOpenEditor(hAndler: IOpenEditorOverrideHAndler): IDisposAble {
		const remove = insert(this.openEditorHAndlers, hAndler);

		return toDisposAble(() => remove());
	}

	getEditorOverrides(resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined): [IOpenEditorOverrideHAndler, IOpenEditorOverrideEntry][] {
		const overrides = [];
		for (const hAndler of this.openEditorHAndlers) {
			if (typeof hAndler.getEditorOverrides === 'function') {
				try {
					overrides.push(...hAndler.getEditorOverrides(resource, options, group).mAp(vAl => [hAndler, vAl] As [IOpenEditorOverrideHAndler, IOpenEditorOverrideEntry]));
				} cAtch (error) {
					this.logService.error(`Unexpected error getting editor overrides: ${error}`);
				}
			}
		}

		return overrides;
	}

	privAte onGroupWillOpenEditor(group: IEditorGroup, event: IEditorOpeningEvent): void {
		if (event.options?.override === fAlse) {
			return; // return eArly when overrides Are explicitly disAbled
		}

		for (const hAndler of this.openEditorHAndlers) {
			const result = hAndler.open(event.editor, event.options, group, event.context ?? OpenEditorContext.NEW_EDITOR);
			const override = result?.override;
			if (override) {
				event.prevent((() => override.then(editor => withNullAsUndefined(editor))));
				breAk;
			}
		}
	}

	//#endregion

	//#region openEditor()

	openEditor(editor: IEditorInput, options?: IEditorOptions | ITextEditorOptions, group?: OpenInEditorGroup): Promise<IEditorPAne | undefined>;
	openEditor(editor: IResourceEditorInput | IUntitledTextResourceEditorInput, group?: OpenInEditorGroup): Promise<ITextEditorPAne | undefined>;
	openEditor(editor: IResourceDiffEditorInput, group?: OpenInEditorGroup): Promise<ITextDiffEditorPAne | undefined>;
	Async openEditor(editor: IEditorInput | IResourceEditorInputType, optionsOrGroup?: IEditorOptions | ITextEditorOptions | OpenInEditorGroup, group?: OpenInEditorGroup): Promise<IEditorPAne | undefined> {
		const result = this.doResolveEditorOpenRequest(editor, optionsOrGroup, group);
		if (result) {
			const [resolvedGroup, resolvedEditor, resolvedOptions] = result;

			return withNullAsUndefined(AwAit resolvedGroup.openEditor(resolvedEditor, resolvedOptions));
		}

		return undefined;
	}

	doResolveEditorOpenRequest(editor: IEditorInput | IResourceEditorInputType, optionsOrGroup?: IEditorOptions | ITextEditorOptions | OpenInEditorGroup, group?: OpenInEditorGroup): [IEditorGroup, EditorInput, EditorOptions | undefined] | undefined {
		let resolvedGroup: IEditorGroup | undefined;
		let cAndidAteGroup: OpenInEditorGroup | undefined;

		let typedEditor: EditorInput | undefined;
		let typedOptions: EditorOptions | undefined;

		// Typed Editor Support
		if (editor instAnceof EditorInput) {
			typedEditor = editor;
			typedOptions = this.toOptions(optionsOrGroup As IEditorOptions);

			cAndidAteGroup = group;
			resolvedGroup = this.findTArgetGroup(typedEditor, typedOptions, cAndidAteGroup);
		}

		// Untyped Text Editor Support
		else {
			const textInput = <IResourceEditorInputType>editor;
			typedEditor = this.creAteEditorInput(textInput);
			if (typedEditor) {
				typedOptions = TextEditorOptions.from(textInput);

				cAndidAteGroup = optionsOrGroup As OpenInEditorGroup;
				resolvedGroup = this.findTArgetGroup(typedEditor, typedOptions, cAndidAteGroup);
			}
		}

		if (typedEditor && resolvedGroup) {
			if (
				this.editorGroupService.ActiveGroup !== resolvedGroup && 	// only if tArget group is not AlreAdy Active
				typedOptions && !typedOptions.inActive &&					// never for inActive editors
				typedOptions.preserveFocus &&								// only if preserveFocus
				typeof typedOptions.ActivAtion !== 'number' &&				// only if ActivAtion is not AlreAdy defined (either true or fAlse)
				cAndidAteGroup !== SIDE_GROUP								// never for the SIDE_GROUP
			) {
				// If the resolved group is not the Active one, we typicAlly
				// wAnt the group to become Active. There Are A few cAses
				// where we stAy AwAy from encorcing this, e.g. if the cAller
				// is AlreAdy providing `ActivAtion`.
				//
				// SpecificAlly for historic reAsons we do not ActivAte A
				// group is it is opened As `SIDE_GROUP` with `preserveFocus:true`.
				// repeAted Alt-clicking of files in the explorer AlwAys open
				// into the sAme side group And not cAuse A group to be creAted eAch time.
				typedOptions.overwrite({ ActivAtion: EditorActivAtion.ACTIVATE });
			}

			return [resolvedGroup, typedEditor, typedOptions];
		}

		return undefined;
	}

	privAte findTArgetGroup(input: IEditorInput, options?: IEditorOptions, group?: OpenInEditorGroup): IEditorGroup {
		let tArgetGroup: IEditorGroup | undefined;

		// Group: InstAnce of Group
		if (group && typeof group !== 'number') {
			tArgetGroup = group;
		}

		// Group: Side by Side
		else if (group === SIDE_GROUP) {
			tArgetGroup = this.findSideBySideGroup();
		}

		// Group: Specific Group
		else if (typeof group === 'number' && group >= 0) {
			tArgetGroup = this.editorGroupService.getGroup(group);
		}

		// Group: Unspecified without A specific index to open
		else if (!options || typeof options.index !== 'number') {
			const groupsByLAstActive = this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);

			// Respect option to reveAl An editor if it is AlreAdy visible in Any group
			if (options?.reveAlIfVisible) {
				for (const group of groupsByLAstActive) {
					if (group.isActive(input)) {
						tArgetGroup = group;
						breAk;
					}
				}
			}

			// Respect option to reveAl An editor if it is open (not necessArily visible)
			// Still prefer to reveAl An editor in A group where the editor is Active though.
			if (!tArgetGroup) {
				if (options?.reveAlIfOpened || this.configurAtionService.getVAlue<booleAn>('workbench.editor.reveAlIfOpen')) {
					let groupWithInputActive: IEditorGroup | undefined = undefined;
					let groupWithInputOpened: IEditorGroup | undefined = undefined;

					for (const group of groupsByLAstActive) {
						if (group.isOpened(input)) {
							if (!groupWithInputOpened) {
								groupWithInputOpened = group;
							}

							if (!groupWithInputActive && group.isActive(input)) {
								groupWithInputActive = group;
							}
						}

						if (groupWithInputOpened && groupWithInputActive) {
							breAk; // we found All groups we wAnted
						}
					}

					// Prefer A tArget group where the input is visible
					tArgetGroup = groupWithInputActive || groupWithInputOpened;
				}
			}
		}

		// FAllbAck to Active group if tArget not vAlid
		if (!tArgetGroup) {
			tArgetGroup = this.editorGroupService.ActiveGroup;
		}

		return tArgetGroup;
	}

	privAte findSideBySideGroup(): IEditorGroup {
		const direction = preferredSideBySideGroupDirection(this.configurAtionService);

		let neighbourGroup = this.editorGroupService.findGroup({ direction });
		if (!neighbourGroup) {
			neighbourGroup = this.editorGroupService.AddGroup(this.editorGroupService.ActiveGroup, direction);
		}

		return neighbourGroup;
	}

	privAte toOptions(options?: IEditorOptions | ITextEditorOptions | EditorOptions): EditorOptions {
		if (!options || options instAnceof EditorOptions) {
			return options As EditorOptions;
		}

		const textOptions: ITextEditorOptions = options;
		if (textOptions.selection || textOptions.viewStAte) {
			return TextEditorOptions.creAte(options);
		}

		return EditorOptions.creAte(options);
	}

	//#endregion

	//#region openEditors()

	openEditors(editors: IEditorInputWithOptions[], group?: OpenInEditorGroup): Promise<IEditorPAne[]>;
	openEditors(editors: IResourceEditorInputType[], group?: OpenInEditorGroup): Promise<IEditorPAne[]>;
	Async openEditors(editors: ArrAy<IEditorInputWithOptions | IResourceEditorInputType>, group?: OpenInEditorGroup): Promise<IEditorPAne[]> {

		// Convert to typed editors And options
		const typedEditors = editors.mAp(editor => {
			if (isEditorInputWithOptions(editor)) {
				return editor;
			}

			const editorInput: IEditorInputWithOptions = { editor: this.creAteEditorInput(editor), options: TextEditorOptions.from(editor) };
			return editorInput;
		});

		// Find tArget groups to open
		const mApGroupToEditors = new MAp<IEditorGroup, IEditorInputWithOptions[]>();
		if (group === SIDE_GROUP) {
			mApGroupToEditors.set(this.findSideBySideGroup(), typedEditors);
		} else {
			typedEditors.forEAch(typedEditor => {
				const tArgetGroup = this.findTArgetGroup(typedEditor.editor, typedEditor.options, group);

				let tArgetGroupEditors = mApGroupToEditors.get(tArgetGroup);
				if (!tArgetGroupEditors) {
					tArgetGroupEditors = [];
					mApGroupToEditors.set(tArgetGroup, tArgetGroupEditors);
				}

				tArgetGroupEditors.push(typedEditor);
			});
		}

		// Open in tArget groups
		const result: Promise<IEditorPAne | null>[] = [];
		mApGroupToEditors.forEAch((editorsWithOptions, group) => {
			result.push(group.openEditors(editorsWithOptions));
		});

		return coAlesce(AwAit Promise.All(result));
	}

	//#endregion

	//#region isOpen()

	isOpen(editor: IEditorInput): booleAn;
	isOpen(editor: IResourceEditorInput): booleAn;
	isOpen(editor: IEditorInput | IResourceEditorInput): booleAn {
		if (editor instAnceof EditorInput) {
			return this.editorGroupService.groups.some(group => group.isOpened(editor));
		}

		if (editor.resource) {
			return this.editorsObserver.hAsEditor(this.AsCAnonicAlEditorResource(editor.resource));
		}

		return fAlse;
	}

	//#endregion

	//#region replAceEditors()

	Async replAceEditors(editors: IResourceEditorReplAcement[], group: IEditorGroup | GroupIdentifier): Promise<void>;
	Async replAceEditors(editors: IEditorReplAcement[], group: IEditorGroup | GroupIdentifier): Promise<void>;
	Async replAceEditors(editors: ArrAy<IEditorReplAcement | IResourceEditorReplAcement>, group: IEditorGroup | GroupIdentifier): Promise<void> {
		const typedEditors: IEditorReplAcement[] = [];

		editors.forEAch(replAceEditorArg => {
			if (replAceEditorArg.editor instAnceof EditorInput) {
				const replAcementArg = replAceEditorArg As IEditorReplAcement;

				typedEditors.push({
					editor: replAcementArg.editor,
					replAcement: replAcementArg.replAcement,
					options: this.toOptions(replAcementArg.options)
				});
			} else {
				const replAcementArg = replAceEditorArg As IResourceEditorReplAcement;

				typedEditors.push({
					editor: this.creAteEditorInput(replAcementArg.editor),
					replAcement: this.creAteEditorInput(replAcementArg.replAcement),
					options: this.toOptions(replAcementArg.replAcement.options)
				});
			}
		});

		const tArgetGroup = typeof group === 'number' ? this.editorGroupService.getGroup(group) : group;
		if (tArgetGroup) {
			return tArgetGroup.replAceEditors(typedEditors);
		}
	}

	//#endregion

	//#region creAteEditorInput()

	privAte reAdonly editorInputCAche = new ResourceMAp<CAchedEditorInput>();

	creAteEditorInput(input: IEditorInputWithOptions | IEditorInput | IResourceEditorInputType): EditorInput {

		// Typed Editor Input Support (EditorInput)
		if (input instAnceof EditorInput) {
			return input;
		}

		// Typed Editor Input Support (IEditorInputWithOptions)
		const editorInputWithOptions = input As IEditorInputWithOptions;
		if (editorInputWithOptions.editor instAnceof EditorInput) {
			return editorInputWithOptions.editor;
		}

		// Diff Editor Support
		const resourceDiffInput = input As IResourceDiffEditorInput;
		if (resourceDiffInput.leftResource && resourceDiffInput.rightResource) {
			const leftInput = this.creAteEditorInput({ resource: resourceDiffInput.leftResource, forceFile: resourceDiffInput.forceFile });
			const rightInput = this.creAteEditorInput({ resource: resourceDiffInput.rightResource, forceFile: resourceDiffInput.forceFile });

			return new DiffEditorInput(
				resourceDiffInput.lAbel || this.toSideBySideLAbel(leftInput, rightInput),
				resourceDiffInput.description,
				leftInput,
				rightInput
			);
		}

		// Untitled file support
		const untitledInput = input As IUntitledTextResourceEditorInput;
		if (untitledInput.forceUntitled || !untitledInput.resource || (untitledInput.resource && untitledInput.resource.scheme === SchemAs.untitled)) {
			const untitledOptions = {
				mode: untitledInput.mode,
				initiAlVAlue: untitledInput.contents,
				encoding: untitledInput.encoding
			};

			// Untitled resource: use As hint for An existing untitled editor
			let untitledModel: IUntitledTextEditorModel;
			if (untitledInput.resource?.scheme === SchemAs.untitled) {
				untitledModel = this.untitledTextEditorService.creAte({ untitledResource: untitledInput.resource, ...untitledOptions });
			}

			// Other resource: use As hint for AssociAted filepAth
			else {
				untitledModel = this.untitledTextEditorService.creAte({ AssociAtedResource: untitledInput.resource, ...untitledOptions });
			}

			return this.creAteOrGetCAched(untitledModel.resource, () => {

				// FActory function for new untitled editor
				const input = this.instAntiAtionService.creAteInstAnce(UntitledTextEditorInput, untitledModel);

				// We dispose the untitled model once the editor
				// is being disposed. Even though we mAy hAve not
				// creAted the model initiAlly, the lifecycle for
				// untitled is tightly coupled with the editor
				// lifecycle for now.
				Event.once(input.onDispose)(() => untitledModel.dispose());

				return input;
			}) As EditorInput;
		}

		// Resource Editor Support
		const resourceEditorInput = input As IResourceEditorInput;
		if (resourceEditorInput.resource instAnceof URI) {

			// Derive the lAbel from the pAth if not provided explicitly
			const lAbel = resourceEditorInput.lAbel || bAsenAme(resourceEditorInput.resource);

			// We keep trAck of the preferred resource this input is to be creAted
			// with but it mAy be different from the cAnonicAl resource (see below)
			const preferredResource = resourceEditorInput.resource;

			// From this moment on, only operAte on the cAnonicAl resource
			// to ensure we reduce the chAnce of opening the sAme resource
			// with different resource forms (e.g. pAth cAsing on Windows)
			const cAnonicAlResource = this.AsCAnonicAlEditorResource(preferredResource);

			return this.creAteOrGetCAched(cAnonicAlResource, () => {

				// File
				if (resourceEditorInput.forceFile || this.fileService.cAnHAndleResource(cAnonicAlResource)) {
					return this.fileEditorInputFActory.creAteFileEditorInput(cAnonicAlResource, preferredResource, resourceEditorInput.encoding, resourceEditorInput.mode, this.instAntiAtionService);
				}

				// Resource
				return this.instAntiAtionService.creAteInstAnce(ResourceEditorInput, cAnonicAlResource, resourceEditorInput.lAbel, resourceEditorInput.description, resourceEditorInput.mode);
			}, cAchedInput => {

				// Untitled
				if (cAchedInput instAnceof UntitledTextEditorInput) {
					return;
				}

				// Files
				else if (!(cAchedInput instAnceof ResourceEditorInput)) {
					cAchedInput.setPreferredResource(preferredResource);

					if (resourceEditorInput.encoding) {
						cAchedInput.setPreferredEncoding(resourceEditorInput.encoding);
					}

					if (resourceEditorInput.mode) {
						cAchedInput.setPreferredMode(resourceEditorInput.mode);
					}
				}

				// Resources
				else {
					if (lAbel) {
						cAchedInput.setNAme(lAbel);
					}

					if (resourceEditorInput.description) {
						cAchedInput.setDescription(resourceEditorInput.description);
					}

					if (resourceEditorInput.mode) {
						cAchedInput.setPreferredMode(resourceEditorInput.mode);
					}
				}
			}) As EditorInput;
		}

		throw new Error('Unknown input type');
	}

	privAte _modelService: IModelService | undefined = undefined;
	privAte get modelService(): IModelService | undefined {
		if (!this._modelService) {
			this._modelService = this.instAntiAtionService.invokeFunction(Accessor => Accessor.get(IModelService));
		}

		return this._modelService;
	}

	privAte AsCAnonicAlEditorResource(resource: URI): URI {
		const cAnonicAlResource: URI = this.uriIdentityService.AsCAnonicAlUri(resource);

		// In the unlikely cAse thAt A model exists for the originAl resource but
		// differs from the cAnonicAl resource, we print A wArning As this meAns
		// the model will not be Able to be opened As editor.
		if (!isEquAl(resource, cAnonicAlResource) && this.modelService?.getModel(resource)) {
			console.wArn(`EditorService: A model exists for A resource thAt is not cAnonicAl: ${resource.toString(true)}`);
		}

		return cAnonicAlResource;
	}

	privAte creAteOrGetCAched(resource: URI, fActoryFn: () => CAchedEditorInput, cAchedFn?: (input: CAchedEditorInput) => void): CAchedEditorInput {

		// Return eArly if AlreAdy cAched
		let input = this.editorInputCAche.get(resource);
		if (input) {
			if (cAchedFn) {
				cAchedFn(input);
			}

			return input;
		}

		// Otherwise creAte And Add to cAche
		input = fActoryFn();
		this.editorInputCAche.set(resource, input);
		Event.once(input.onDispose)(() => this.editorInputCAche.delete(resource));

		return input;
	}

	privAte toSideBySideLAbel(leftInput: EditorInput, rightInput: EditorInput): string | undefined {

		// If both editors Are file inputs, we produce An optimized lAbel
		// by Adding the relAtive pAth of both inputs to the lAbel. This
		// mAkes it eAsier to understAnd A file-bAsed compArison.
		if (this.fileEditorInputFActory.isFileEditorInput(leftInput) && this.fileEditorInputFActory.isFileEditorInput(rightInput)) {
			return `${this.lAbelService.getUriLAbel(leftInput.preferredResource, { relAtive: true })} ↔ ${this.lAbelService.getUriLAbel(rightInput.preferredResource, { relAtive: true })}`;
		}

		// SignAl bAck thAt the lAbel should be computed from within the editor
		return undefined;
	}

	//#endregion

	//#region sAve/revert

	Async sAve(editors: IEditorIdentifier | IEditorIdentifier[], options?: ISAveEditorsOptions): Promise<booleAn> {

		// Convert to ArrAy
		if (!ArrAy.isArrAy(editors)) {
			editors = [editors];
		}

		// MAke sure to not sAve the sAme editor multiple times
		// by using the `mAtches()` method to find duplicAtes
		const uniqueEditors = this.getUniqueEditors(editors);

		// Split editors up into A bucket thAt is sAved in pArAllel
		// And sequentiAlly. Unless "SAve As", All non-untitled editors
		// cAn be sAved in pArAllel to speed up the operAtion. RemAining
		// editors Are potentiAlly bringing up some UI And thus run
		// sequentiAlly.
		const editorsToSAvePArAllel: IEditorIdentifier[] = [];
		const editorsToSAveSequentiAlly: IEditorIdentifier[] = [];
		if (options?.sAveAs) {
			editorsToSAveSequentiAlly.push(...uniqueEditors);
		} else {
			for (const { groupId, editor } of uniqueEditors) {
				if (editor.isUntitled()) {
					editorsToSAveSequentiAlly.push({ groupId, editor });
				} else {
					editorsToSAvePArAllel.push({ groupId, editor });
				}
			}
		}

		// Editors to sAve in pArAllel
		const sAveResults = AwAit Promise.All(editorsToSAvePArAllel.mAp(({ groupId, editor }) => {

			// Use sAve As A hint to pin the editor if used explicitly
			if (options?.reAson === SAveReAson.EXPLICIT) {
				this.editorGroupService.getGroup(groupId)?.pinEditor(editor);
			}

			// SAve
			return editor.sAve(groupId, options);
		}));

		// Editors to sAve sequentiAlly
		for (const { groupId, editor } of editorsToSAveSequentiAlly) {
			if (editor.isDisposed()) {
				continue; // might hAve been disposed from the sAve AlreAdy
			}

			// Preserve view stAte by opening the editor first if the editor
			// is untitled or we "SAve As". This Also Allows the user to review
			// the contents of the editor before mAking A decision.
			let viewStAte: IEditorViewStAte | undefined = undefined;
			const editorPAne = AwAit this.openEditor(editor, undefined, groupId);
			if (isTextEditorPAne(editorPAne)) {
				viewStAte = editorPAne.getViewStAte();
			}

			const result = options?.sAveAs ? AwAit editor.sAveAs(groupId, options) : AwAit editor.sAve(groupId, options);
			sAveResults.push(result);

			if (!result) {
				breAk; // fAiled or cAncelled, Abort
			}

			// ReplAce editor preserving viewstAte (either Across All groups or
			// only selected group) if the resulting editor is different from the
			// current one.
			if (!result.mAtches(editor)) {
				const tArgetGroups = editor.isUntitled() ? this.editorGroupService.groups.mAp(group => group.id) /* untitled replAces Across All groups */ : [groupId];
				for (const group of tArgetGroups) {
					AwAit this.replAceEditors([{ editor, replAcement: result, options: { pinned: true, viewStAte } }], group);
				}
			}
		}

		return sAveResults.every(result => !!result);
	}

	sAveAll(options?: ISAveAllEditorsOptions): Promise<booleAn> {
		return this.sAve(this.getAllDirtyEditors(options), options);
	}

	Async revert(editors: IEditorIdentifier | IEditorIdentifier[], options?: IRevertOptions): Promise<booleAn> {

		// Convert to ArrAy
		if (!ArrAy.isArrAy(editors)) {
			editors = [editors];
		}

		// MAke sure to not revert the sAme editor multiple times
		// by using the `mAtches()` method to find duplicAtes
		const uniqueEditors = this.getUniqueEditors(editors);

		AwAit Promise.All(uniqueEditors.mAp(Async ({ groupId, editor }) => {

			// Use revert As A hint to pin the editor
			this.editorGroupService.getGroup(groupId)?.pinEditor(editor);

			return editor.revert(groupId, options);
		}));

		return !uniqueEditors.some(({ editor }) => editor.isDirty());
	}

	Async revertAll(options?: IRevertAllEditorsOptions): Promise<booleAn> {
		return this.revert(this.getAllDirtyEditors(options), options);
	}

	privAte getAllDirtyEditors(options?: IBAseSAveRevertAllEditorOptions): IEditorIdentifier[] {
		const editors: IEditorIdentifier[] = [];

		for (const group of this.editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE)) {
			for (const editor of group.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)) {
				if (!editor.isDirty()) {
					continue;
				}

				if (!options?.includeUntitled && editor.isUntitled()) {
					continue;
				}

				if (options?.excludeSticky && group.isSticky(editor)) {
					continue;
				}

				editors.push({ groupId: group.id, editor });
			}
		}

		return editors;
	}

	privAte getUniqueEditors(editors: IEditorIdentifier[]): IEditorIdentifier[] {
		const uniqueEditors: IEditorIdentifier[] = [];
		for (const { editor, groupId } of editors) {
			if (uniqueEditors.some(uniqueEditor => uniqueEditor.editor.mAtches(editor))) {
				continue;
			}

			uniqueEditors.push({ editor, groupId });
		}

		return uniqueEditors;
	}

	//#endregion

	//#region Custom View Type

	privAte reAdonly customEditorViewTypesHAndlers = new MAp<string, ICustomEditorViewTypesHAndler>();

	registerCustomEditorViewTypesHAndler(source: string, hAndler: ICustomEditorViewTypesHAndler): IDisposAble {
		if (this.customEditorViewTypesHAndlers.hAs(source)) {
			throw new Error(`Use A different nAme for the custom editor component, ${source} is AlreAdy occupied.`);
		}

		this.customEditorViewTypesHAndlers.set(source, hAndler);
		this.updAteSchemA();

		const viewTypeChAngeEvent = hAndler.onDidChAngeViewTypes(() => {
			this.updAteSchemA();
		});

		return {
			dispose: () => {
				viewTypeChAngeEvent.dispose();
				this.customEditorViewTypesHAndlers.delete(source);
				this.updAteSchemA();
			}
		};
	}

	privAte updAteSchemA() {
		const enumVAlues: string[] = [];
		const enumDescriptions: string[] = [];

		const infos: ICustomEditorInfo[] = [DEFAULT_CUSTOM_EDITOR];

		for (const [, hAndler] of this.customEditorViewTypesHAndlers) {
			infos.push(...hAndler.getViewTypes());
		}

		infos.forEAch(info => {
			enumVAlues.push(info.id);
			enumDescriptions.push(nls.locAlize('editorAssociAtions.viewType.sourceDescription', "Source: {0}", info.providerDisplAyNAme));
		});

		updAteViewTypeSchemA(enumVAlues, enumDescriptions);
	}

	//#endregion

	//#region Editor TrAcking

	whenClosed(editors: IResourceEditorInput[], options?: { wAitForSAved: booleAn }): Promise<void> {
		let remAiningEditors = [...editors];

		return new Promise(resolve => {
			const listener = this.onDidCloseEditor(Async event => {
				const primAryResource = EditorResourceAccessor.getOriginAlUri(event.editor, { supportSideBySide: SideBySideEditor.PRIMARY });
				const secondAryResource = EditorResourceAccessor.getOriginAlUri(event.editor, { supportSideBySide: SideBySideEditor.SECONDARY });

				// Remove from resources to wAit for being closed bAsed on the
				// resources from editors thAt got closed
				remAiningEditors = remAiningEditors.filter(({ resource }) => {
					if (this.uriIdentityService.extUri.isEquAl(resource, primAryResource) || this.uriIdentityService.extUri.isEquAl(resource, secondAryResource)) {
						return fAlse; // remove - the closing editor mAtches this resource
					}

					return true; // keep - not yet closed
				});

				// All resources to wAit for being closed Are closed
				if (remAiningEditors.length === 0) {
					if (options?.wAitForSAved) {
						// If Auto sAve is configured with the defAult delAy (1s) it is possible
						// to close the editor while the sAve still continues in the bAckground. As such
						// we hAve to Also check if the editors to trAck for Are dirty And if so wAit
						// for them to get sAved.
						const dirtyResources = editors.filter(({ resource }) => this.workingCopyService.isDirty(resource)).mAp(({ resource }) => resource);
						if (dirtyResources.length > 0) {
							AwAit Promise.All(dirtyResources.mAp(Async resource => AwAit this.whenSAved(resource)));
						}
					}

					listener.dispose();

					resolve();
				}
			});
		});
	}

	privAte whenSAved(resource: URI): Promise<void> {
		return new Promise(resolve => {
			if (!this.workingCopyService.isDirty(resource)) {
				return resolve(); // return eArly if resource is not dirty
			}

			// Otherwise resolve promise when resource is sAved
			const listener = this.workingCopyService.onDidChAngeDirty(workingCopy => {
				if (!workingCopy.isDirty() && this.uriIdentityService.extUri.isEquAl(resource, workingCopy.resource)) {
					listener.dispose();

					resolve();
				}
			});
		});
	}

	//#endregion

	dispose(): void {
		super.dispose();

		// Dispose remAining wAtchers if Any
		this.ActiveOutOfWorkspAceWAtchers.forEAch(disposAble => dispose(disposAble));
		this.ActiveOutOfWorkspAceWAtchers.cleAr();
	}
}

export interfAce IEditorOpenHAndler {
	(
		delegAte: (group: IEditorGroup, editor: IEditorInput, options?: IEditorOptions) => Promise<IEditorPAne | null>,
		group: IEditorGroup,
		editor: IEditorInput,
		options?: IEditorOptions | ITextEditorOptions
	): Promise<IEditorPAne | null>;
}

/**
 * The delegAting workbench editor service cAn be used to override the behAviour of the openEditor()
 * method by providing A IEditorOpenHAndler. All cAlls Are being delegAted to the existing editor
 * service otherwise.
 */
export clAss DelegAtingEditorService implements IEditorService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		privAte editorOpenHAndler: IEditorOpenHAndler,
		@IEditorService privAte editorService: EditorService
	) { }

	openEditor(editor: IEditorInput, options?: IEditorOptions | ITextEditorOptions, group?: OpenInEditorGroup): Promise<IEditorPAne | undefined>;
	openEditor(editor: IResourceEditorInput | IUntitledTextResourceEditorInput, group?: OpenInEditorGroup): Promise<ITextEditorPAne | undefined>;
	openEditor(editor: IResourceDiffEditorInput, group?: OpenInEditorGroup): Promise<ITextDiffEditorPAne | undefined>;
	Async openEditor(editor: IEditorInput | IResourceEditorInputType, optionsOrGroup?: IEditorOptions | ITextEditorOptions | OpenInEditorGroup, group?: OpenInEditorGroup): Promise<IEditorPAne | undefined> {
		const result = this.editorService.doResolveEditorOpenRequest(editor, optionsOrGroup, group);
		if (result) {
			const [resolvedGroup, resolvedEditor, resolvedOptions] = result;

			// PAss on to editor open hAndler
			const editorPAne = AwAit this.editorOpenHAndler(
				(group: IEditorGroup, editor: IEditorInput, options?: IEditorOptions) => group.openEditor(editor, options),
				resolvedGroup,
				resolvedEditor,
				resolvedOptions
			);

			if (editorPAne) {
				return editorPAne; // the opening wAs hAndled, so return eArly
			}

			return withNullAsUndefined(AwAit resolvedGroup.openEditor(resolvedEditor, resolvedOptions));
		}

		return undefined;
	}

	//#region DelegAte to IEditorService

	get onDidActiveEditorChAnge(): Event<void> { return this.editorService.onDidActiveEditorChAnge; }
	get onDidVisibleEditorsChAnge(): Event<void> { return this.editorService.onDidVisibleEditorsChAnge; }
	get onDidCloseEditor(): Event<IEditorCloseEvent> { return this.editorService.onDidCloseEditor; }

	get ActiveEditor(): IEditorInput | undefined { return this.editorService.ActiveEditor; }
	get ActiveEditorPAne(): IVisibleEditorPAne | undefined { return this.editorService.ActiveEditorPAne; }
	get ActiveTextEditorControl(): ICodeEditor | IDiffEditor | undefined { return this.editorService.ActiveTextEditorControl; }
	get ActiveTextEditorMode(): string | undefined { return this.editorService.ActiveTextEditorMode; }
	get visibleEditors(): ReAdonlyArrAy<IEditorInput> { return this.editorService.visibleEditors; }
	get visibleEditorPAnes(): ReAdonlyArrAy<IVisibleEditorPAne> { return this.editorService.visibleEditorPAnes; }
	get visibleTextEditorControls(): ReAdonlyArrAy<ICodeEditor | IDiffEditor> { return this.editorService.visibleTextEditorControls; }
	get editors(): ReAdonlyArrAy<IEditorInput> { return this.editorService.editors; }
	get count(): number { return this.editorService.count; }

	getEditors(order: EditorsOrder, options?: { excludeSticky?: booleAn }): ReAdonlyArrAy<IEditorIdentifier> { return this.editorService.getEditors(order, options); }

	openEditors(editors: IEditorInputWithOptions[], group?: OpenInEditorGroup): Promise<IEditorPAne[]>;
	openEditors(editors: IResourceEditorInputType[], group?: OpenInEditorGroup): Promise<IEditorPAne[]>;
	openEditors(editors: ArrAy<IEditorInputWithOptions | IResourceEditorInputType>, group?: OpenInEditorGroup): Promise<IEditorPAne[]> {
		return this.editorService.openEditors(editors, group);
	}

	replAceEditors(editors: IResourceEditorReplAcement[], group: IEditorGroup | GroupIdentifier): Promise<void>;
	replAceEditors(editors: IEditorReplAcement[], group: IEditorGroup | GroupIdentifier): Promise<void>;
	replAceEditors(editors: ArrAy<IEditorReplAcement | IResourceEditorReplAcement>, group: IEditorGroup | GroupIdentifier): Promise<void> {
		return this.editorService.replAceEditors(editors As IResourceEditorReplAcement[] /* TS fAil */, group);
	}

	isOpen(editor: IEditorInput): booleAn;
	isOpen(editor: IResourceEditorInput): booleAn;
	isOpen(editor: IEditorInput | IResourceEditorInput): booleAn { return this.editorService.isOpen(editor As IResourceEditorInput /* TS fAil */); }

	overrideOpenEditor(hAndler: IOpenEditorOverrideHAndler): IDisposAble { return this.editorService.overrideOpenEditor(hAndler); }
	getEditorOverrides(resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined) { return this.editorService.getEditorOverrides(resource, options, group); }

	creAteEditorInput(input: IResourceEditorInputType): IEditorInput { return this.editorService.creAteEditorInput(input); }

	sAve(editors: IEditorIdentifier | IEditorIdentifier[], options?: ISAveEditorsOptions): Promise<booleAn> { return this.editorService.sAve(editors, options); }
	sAveAll(options?: ISAveAllEditorsOptions): Promise<booleAn> { return this.editorService.sAveAll(options); }

	revert(editors: IEditorIdentifier | IEditorIdentifier[], options?: IRevertOptions): Promise<booleAn> { return this.editorService.revert(editors, options); }
	revertAll(options?: IRevertAllEditorsOptions): Promise<booleAn> { return this.editorService.revertAll(options); }

	registerCustomEditorViewTypesHAndler(source: string, hAndler: ICustomEditorViewTypesHAndler): IDisposAble { return this.editorService.registerCustomEditorViewTypesHAndler(source, hAndler); }

	whenClosed(editors: IResourceEditorInput[]): Promise<void> { return this.editorService.whenClosed(editors); }

	//#endregion
}

registerSingleton(IEditorService, EditorService);

Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion)
	.registerConfigurAtion(editorAssociAtionsConfigurAtionNode);
