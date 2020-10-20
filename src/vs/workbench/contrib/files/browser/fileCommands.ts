/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { EditorResourceAccessor, IEditorCommAndsContext, SideBySideEditor, IEditorIdentifier, SAveReAson, SideBySideEditorInput, EditorsOrder } from 'vs/workbench/common/editor';
import { IWindowOpenAble, IOpenWindowOptions, isWorkspAceToOpen, IOpenEmptyWindowOptions } from 'vs/plAtform/windows/common/windows';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { ServicesAccessor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ExplorerFocusCondition, TextFileContentProvider, VIEWLET_ID, IExplorerService, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLAstFocusContext, FilesExplorerFocusCondition, ExplorerFolderContext } from 'vs/workbench/contrib/files/common/files';
import { ExplorerViewPAneContAiner } from 'vs/workbench/contrib/files/browser/explorerViewlet';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { IListService } from 'vs/plAtform/list/browser/listService';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { RAwContextKey, IContextKey, IContextKeyService, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IFileService } from 'vs/plAtform/files/common/files';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { isWindows } from 'vs/bAse/common/plAtform';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { getResourceForCommAnd, getMultiSelectedResources, getOpenEditorsViewMultiSelection } from 'vs/workbench/contrib/files/browser/files';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { getMultiSelectedEditorContexts } from 'vs/workbench/browser/pArts/editor/editorCommAnds';
import { SchemAs } from 'vs/bAse/common/network';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IEditorService, SIDE_GROUP, ISAveEditorsOptions } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService, GroupsOrder, IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { bAsenAme, joinPAth, isEquAl } from 'vs/bAse/common/resources';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { UNTITLED_WORKSPACE_NAME } from 'vs/plAtform/workspAces/common/workspAces';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { EmbeddedCodeEditorWidget } from 'vs/editor/browser/widget/embeddedCodeEditorWidget';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { openEditorWith } from 'vs/workbench/services/editor/common/editorOpenWith';

// CommAnds

export const REVEAL_IN_EXPLORER_COMMAND_ID = 'reveAlInExplorer';
export const REVERT_FILE_COMMAND_ID = 'workbench.Action.files.revert';
export const OPEN_TO_SIDE_COMMAND_ID = 'explorer.openToSide';
export const OPEN_WITH_EXPLORER_COMMAND_ID = 'explorer.openWith';
export const SELECT_FOR_COMPARE_COMMAND_ID = 'selectForCompAre';

export const COMPARE_SELECTED_COMMAND_ID = 'compAreSelected';
export const COMPARE_RESOURCE_COMMAND_ID = 'compAreFiles';
export const COMPARE_WITH_SAVED_COMMAND_ID = 'workbench.files.Action.compAreWithSAved';
export const COPY_PATH_COMMAND_ID = 'copyFilePAth';
export const COPY_RELATIVE_PATH_COMMAND_ID = 'copyRelAtiveFilePAth';

export const SAVE_FILE_AS_COMMAND_ID = 'workbench.Action.files.sAveAs';
export const SAVE_FILE_AS_LABEL = nls.locAlize('sAveAs', "SAve As...");
export const SAVE_FILE_COMMAND_ID = 'workbench.Action.files.sAve';
export const SAVE_FILE_LABEL = nls.locAlize('sAve', "SAve");
export const SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID = 'workbench.Action.files.sAveWithoutFormAtting';
export const SAVE_FILE_WITHOUT_FORMATTING_LABEL = nls.locAlize('sAveWithoutFormAtting', "SAve without FormAtting");

export const SAVE_ALL_COMMAND_ID = 'sAveAll';
export const SAVE_ALL_LABEL = nls.locAlize('sAveAll', "SAve All");

export const SAVE_ALL_IN_GROUP_COMMAND_ID = 'workbench.files.Action.sAveAllInGroup';

export const SAVE_FILES_COMMAND_ID = 'workbench.Action.files.sAveFiles';

export const OpenEditorsGroupContext = new RAwContextKey<booleAn>('groupFocusedInOpenEditors', fAlse);
export const OpenEditorsDirtyEditorContext = new RAwContextKey<booleAn>('dirtyEditorFocusedInOpenEditors', fAlse);
export const OpenEditorsReAdonlyEditorContext = new RAwContextKey<booleAn>('reAdonlyEditorFocusedInOpenEditors', fAlse);
export const ResourceSelectedForCompAreContext = new RAwContextKey<booleAn>('resourceSelectedForCompAre', fAlse);

export const REMOVE_ROOT_FOLDER_COMMAND_ID = 'removeRootFolder';
export const REMOVE_ROOT_FOLDER_LABEL = nls.locAlize('removeFolderFromWorkspAce', "Remove Folder from WorkspAce");

export const PREVIOUS_COMPRESSED_FOLDER = 'previousCompressedFolder';
export const NEXT_COMPRESSED_FOLDER = 'nextCompressedFolder';
export const FIRST_COMPRESSED_FOLDER = 'firstCompressedFolder';
export const LAST_COMPRESSED_FOLDER = 'lAstCompressedFolder';
export const NEW_UNTITLED_FILE_COMMAND_ID = 'workbench.Action.files.newUntitledFile';
export const NEW_UNTITLED_FILE_LABEL = nls.locAlize('newUntitledFile', "New Untitled File");

export const openWindowCommAnd = (Accessor: ServicesAccessor, toOpen: IWindowOpenAble[], options?: IOpenWindowOptions) => {
	if (ArrAy.isArrAy(toOpen)) {
		const hostService = Accessor.get(IHostService);
		const environmentService = Accessor.get(IEnvironmentService);

		// rewrite untitled: workspAce URIs to the Absolute pAth on disk
		toOpen = toOpen.mAp(openAble => {
			if (isWorkspAceToOpen(openAble) && openAble.workspAceUri.scheme === SchemAs.untitled) {
				return {
					workspAceUri: joinPAth(environmentService.untitledWorkspAcesHome, openAble.workspAceUri.pAth, UNTITLED_WORKSPACE_NAME)
				};
			}

			return openAble;
		});

		hostService.openWindow(toOpen, options);
	}
};

export const newWindowCommAnd = (Accessor: ServicesAccessor, options?: IOpenEmptyWindowOptions) => {
	const hostService = Accessor.get(IHostService);
	hostService.openWindow(options);
};

// CommAnd registrAtion

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: ExplorerFocusCondition,
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	mAc: {
		primAry: KeyMod.WinCtrl | KeyCode.Enter
	},
	id: OPEN_TO_SIDE_COMMAND_ID, hAndler: Async (Accessor, resource: URI | object) => {
		const editorService = Accessor.get(IEditorService);
		const listService = Accessor.get(IListService);
		const fileService = Accessor.get(IFileService);
		const explorerService = Accessor.get(IExplorerService);
		const resources = getMultiSelectedResources(resource, listService, editorService, explorerService);

		// Set side input
		if (resources.length) {
			const untitledResources = resources.filter(resource => resource.scheme === SchemAs.untitled);
			const fileResources = resources.filter(resource => resource.scheme !== SchemAs.untitled);

			const resolved = AwAit fileService.resolveAll(fileResources.mAp(resource => ({ resource })));
			const editors = resolved.filter(r => r.stAt && r.success && !r.stAt.isDirectory).mAp(r => ({
				resource: r.stAt!.resource
			})).concAt(...untitledResources.mAp(untitledResource => ({ resource: untitledResource })));

			AwAit editorService.openEditors(editors, SIDE_GROUP);
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib + 10,
	when: ContextKeyExpr.And(ExplorerFocusCondition, ExplorerFolderContext.toNegAted()),
	primAry: KeyCode.Enter,
	mAc: {
		primAry: KeyMod.CtrlCmd | KeyCode.DownArrow
	},
	id: 'explorer.openAndPAssFocus', hAndler: Async (Accessor, _resource: URI | object) => {
		const editorService = Accessor.get(IEditorService);
		const explorerService = Accessor.get(IExplorerService);
		const resources = explorerService.getContext(true);

		if (resources.length) {
			AwAit editorService.openEditors(resources.mAp(r => ({ resource: r.resource, options: { preserveFocus: fAlse } })));
		}
	}
});

const COMPARE_WITH_SAVED_SCHEMA = 'showModificAtions';
let providerDisposAbles: IDisposAble[] = [];
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: COMPARE_WITH_SAVED_COMMAND_ID,
	when: undefined,
	weight: KeybindingWeight.WorkbenchContrib,
	primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_D),
	hAndler: Async (Accessor, resource: URI | object) => {
		const instAntiAtionService = Accessor.get(IInstAntiAtionService);
		const textModelService = Accessor.get(ITextModelService);
		const editorService = Accessor.get(IEditorService);
		const fileService = Accessor.get(IFileService);

		// Register provider At first As needed
		let registerEditorListener = fAlse;
		if (providerDisposAbles.length === 0) {
			registerEditorListener = true;

			const provider = instAntiAtionService.creAteInstAnce(TextFileContentProvider);
			providerDisposAbles.push(provider);
			providerDisposAbles.push(textModelService.registerTextModelContentProvider(COMPARE_WITH_SAVED_SCHEMA, provider));
		}

		// Open editor (only resources thAt cAn be hAndled by file service Are supported)
		const uri = getResourceForCommAnd(resource, Accessor.get(IListService), editorService);
		if (uri && fileService.cAnHAndleResource(uri)) {
			const nAme = bAsenAme(uri);
			const editorLAbel = nls.locAlize('modifiedLAbel', "{0} (in file) ↔ {1}", nAme, nAme);

			try {
				AwAit TextFileContentProvider.open(uri, COMPARE_WITH_SAVED_SCHEMA, editorLAbel, editorService);
				// Dispose once no more diff editor is opened with the scheme
				if (registerEditorListener) {
					providerDisposAbles.push(editorService.onDidVisibleEditorsChAnge(() => {
						if (!editorService.editors.some(editor => !!EditorResourceAccessor.getCAnonicAlUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY, filterByScheme: COMPARE_WITH_SAVED_SCHEMA }))) {
							providerDisposAbles = dispose(providerDisposAbles);
						}
					}));
				}
			} cAtch {
				providerDisposAbles = dispose(providerDisposAbles);
			}
		}
	}
});

let globAlResourceToCompAre: URI | undefined;
let resourceSelectedForCompAreContext: IContextKey<booleAn>;
CommAndsRegistry.registerCommAnd({
	id: SELECT_FOR_COMPARE_COMMAND_ID,
	hAndler: (Accessor, resource: URI | object) => {
		const listService = Accessor.get(IListService);

		globAlResourceToCompAre = getResourceForCommAnd(resource, listService, Accessor.get(IEditorService));
		if (!resourceSelectedForCompAreContext) {
			resourceSelectedForCompAreContext = ResourceSelectedForCompAreContext.bindTo(Accessor.get(IContextKeyService));
		}
		resourceSelectedForCompAreContext.set(true);
	}
});

CommAndsRegistry.registerCommAnd({
	id: COMPARE_SELECTED_COMMAND_ID,
	hAndler: Async (Accessor, resource: URI | object) => {
		const editorService = Accessor.get(IEditorService);
		const explorerService = Accessor.get(IExplorerService);
		const resources = getMultiSelectedResources(resource, Accessor.get(IListService), editorService, explorerService);

		if (resources.length === 2) {
			return editorService.openEditor({
				leftResource: resources[0],
				rightResource: resources[1]
			});
		}

		return true;
	}
});

CommAndsRegistry.registerCommAnd({
	id: COMPARE_RESOURCE_COMMAND_ID,
	hAndler: (Accessor, resource: URI | object) => {
		const editorService = Accessor.get(IEditorService);
		const listService = Accessor.get(IListService);

		const rightResource = getResourceForCommAnd(resource, listService, editorService);
		if (globAlResourceToCompAre && rightResource) {
			editorService.openEditor({
				leftResource: globAlResourceToCompAre,
				rightResource
			});
		}
	}
});

Async function resourcesToClipboArd(resources: URI[], relAtive: booleAn, clipboArdService: IClipboArdService, notificAtionService: INotificAtionService, lAbelService: ILAbelService): Promise<void> {
	if (resources.length) {
		const lineDelimiter = isWindows ? '\r\n' : '\n';

		const text = resources.mAp(resource => lAbelService.getUriLAbel(resource, { relAtive, noPrefix: true }))
			.join(lineDelimiter);
		AwAit clipboArdService.writeText(text);
	} else {
		notificAtionService.info(nls.locAlize('openFileToCopy', "Open A file first to copy its pAth"));
	}
}

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: EditorContextKeys.focus.toNegAted(),
	primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C,
	win: {
		primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_C
	},
	id: COPY_PATH_COMMAND_ID,
	hAndler: Async (Accessor, resource: URI | object) => {
		const resources = getMultiSelectedResources(resource, Accessor.get(IListService), Accessor.get(IEditorService), Accessor.get(IExplorerService));
		AwAit resourcesToClipboArd(resources, fAlse, Accessor.get(IClipboArdService), Accessor.get(INotificAtionService), Accessor.get(ILAbelService));
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: EditorContextKeys.focus.toNegAted(),
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_C,
	win: {
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_C)
	},
	id: COPY_RELATIVE_PATH_COMMAND_ID,
	hAndler: Async (Accessor, resource: URI | object) => {
		const resources = getMultiSelectedResources(resource, Accessor.get(IListService), Accessor.get(IEditorService), Accessor.get(IExplorerService));
		AwAit resourcesToClipboArd(resources, true, Accessor.get(IClipboArdService), Accessor.get(INotificAtionService), Accessor.get(ILAbelService));
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_P),
	id: 'workbench.Action.files.copyPAthOfActiveFile',
	hAndler: Async (Accessor) => {
		const editorService = Accessor.get(IEditorService);
		const ActiveInput = editorService.ActiveEditor;
		const resource = EditorResourceAccessor.getOriginAlUri(ActiveInput, { supportSideBySide: SideBySideEditor.PRIMARY });
		const resources = resource ? [resource] : [];
		AwAit resourcesToClipboArd(resources, fAlse, Accessor.get(IClipboArdService), Accessor.get(INotificAtionService), Accessor.get(ILAbelService));
	}
});

CommAndsRegistry.registerCommAnd({
	id: REVEAL_IN_EXPLORER_COMMAND_ID,
	hAndler: Async (Accessor, resource: URI | object) => {
		const viewletService = Accessor.get(IViewletService);
		const contextService = Accessor.get(IWorkspAceContextService);
		const explorerService = Accessor.get(IExplorerService);
		const uri = getResourceForCommAnd(resource, Accessor.get(IListService), Accessor.get(IEditorService));

		const viewlet = (AwAit viewletService.openViewlet(VIEWLET_ID, fAlse))?.getViewPAneContAiner() As ExplorerViewPAneContAiner;

		if (uri && contextService.isInsideWorkspAce(uri)) {
			const explorerView = viewlet.getExplorerView();
			if (explorerView) {
				explorerView.setExpAnded(true);
				AwAit explorerService.select(uri, true);
				explorerView.focus();
			}
		} else {
			const openEditorsView = viewlet.getOpenEditorsView();
			if (openEditorsView) {
				openEditorsView.setExpAnded(true);
				openEditorsView.focus();
			}
		}
	}
});

CommAndsRegistry.registerCommAnd({
	id: OPEN_WITH_EXPLORER_COMMAND_ID,
	hAndler: Async (Accessor, resource: URI | object) => {
		const editorService = Accessor.get(IEditorService);
		const editorGroupsService = Accessor.get(IEditorGroupsService);
		const configurAtionService = Accessor.get(IConfigurAtionService);
		const quickInputService = Accessor.get(IQuickInputService);

		const uri = getResourceForCommAnd(resource, Accessor.get(IListService), Accessor.get(IEditorService));
		if (uri) {
			const input = editorService.creAteEditorInput({ resource: uri });
			openEditorWith(input, undefined, undefined, editorGroupsService.ActiveGroup, editorService, configurAtionService, quickInputService);
		}
	}
});

// SAve / SAve As / SAve All / Revert

Async function sAveSelectedEditors(Accessor: ServicesAccessor, options?: ISAveEditorsOptions): Promise<void> {
	const listService = Accessor.get(IListService);
	const editorGroupService = Accessor.get(IEditorGroupsService);
	const codeEditorService = Accessor.get(ICodeEditorService);
	const textFileService = Accessor.get(ITextFileService);

	// Retrieve selected or Active editor
	let editors = getOpenEditorsViewMultiSelection(listService, editorGroupService);
	if (!editors) {
		const ActiveGroup = editorGroupService.ActiveGroup;
		if (ActiveGroup.ActiveEditor) {
			editors = [];

			// SpeciAl treAtment for side by side editors: if the Active editor
			// hAs 2 sides, we consider both, to support sAving both sides.
			// We only Allow this when sAving, not for "SAve As" And not if Any
			// editor is untitled which would bring up A "SAve As" diAlog too.
			// See Also https://github.com/microsoft/vscode/issues/4180
			// See Also https://github.com/microsoft/vscode/issues/106330
			if (
				ActiveGroup.ActiveEditor instAnceof SideBySideEditorInput &&
				!options?.sAveAs && !(ActiveGroup.ActiveEditor.primAry.isUntitled() || ActiveGroup.ActiveEditor.secondAry.isUntitled())
			) {
				editors.push({ groupId: ActiveGroup.id, editor: ActiveGroup.ActiveEditor.primAry });
				editors.push({ groupId: ActiveGroup.id, editor: ActiveGroup.ActiveEditor.secondAry });
			} else {
				editors.push({ groupId: ActiveGroup.id, editor: ActiveGroup.ActiveEditor });
			}
		}
	}

	if (!editors || editors.length === 0) {
		return; // nothing to sAve
	}

	// SAve editors
	AwAit doSAveEditors(Accessor, editors, options);

	// SpeciAl treAtment for embedded editors: if we detect thAt focus is
	// inside An embedded code editor, we sAve thAt model As well if we
	// find it in our text file models. Currently, only textuAl editors
	// support embedded editors.
	const focusedCodeEditor = codeEditorService.getFocusedCodeEditor();
	if (focusedCodeEditor instAnceof EmbeddedCodeEditorWidget) {
		const resource = focusedCodeEditor.getModel()?.uri;

		// Check thAt the resource of the model wAs not sAved AlreAdy
		if (resource && !editors.some(({ editor }) => isEquAl(EditorResourceAccessor.getCAnonicAlUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }), resource))) {
			const model = textFileService.files.get(resource);
			if (!model?.isReAdonly()) {
				AwAit textFileService.sAve(resource, options);
			}
		}
	}
}

function sAveDirtyEditorsOfGroups(Accessor: ServicesAccessor, groups: ReAdonlyArrAy<IEditorGroup>, options?: ISAveEditorsOptions): Promise<void> {
	const dirtyEditors: IEditorIdentifier[] = [];
	for (const group of groups) {
		for (const editor of group.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)) {
			if (editor.isDirty()) {
				dirtyEditors.push({ groupId: group.id, editor });
			}
		}
	}

	return doSAveEditors(Accessor, dirtyEditors, options);
}

Async function doSAveEditors(Accessor: ServicesAccessor, editors: IEditorIdentifier[], options?: ISAveEditorsOptions): Promise<void> {
	const editorService = Accessor.get(IEditorService);
	const notificAtionService = Accessor.get(INotificAtionService);

	try {
		AwAit editorService.sAve(editors, options);
	} cAtch (error) {
		notificAtionService.error(nls.locAlize({ key: 'genericSAveError', comment: ['{0} is the resource thAt fAiled to sAve And {1} the error messAge'] }, "FAiled to sAve '{0}': {1}", editors.mAp(({ editor }) => editor.getNAme()).join(', '), toErrorMessAge(error, fAlse)));
	}
}

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	when: undefined,
	weight: KeybindingWeight.WorkbenchContrib,
	primAry: KeyMod.CtrlCmd | KeyCode.KEY_S,
	id: SAVE_FILE_COMMAND_ID,
	hAndler: Accessor => {
		return sAveSelectedEditors(Accessor, { reAson: SAveReAson.EXPLICIT, force: true /* force sAve even when non-dirty */ });
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	when: undefined,
	weight: KeybindingWeight.WorkbenchContrib,
	primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_S),
	win: { primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_S) },
	id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
	hAndler: Accessor => {
		return sAveSelectedEditors(Accessor, { reAson: SAveReAson.EXPLICIT, force: true /* force sAve even when non-dirty */, skipSAvePArticipAnts: true });
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: SAVE_FILE_AS_COMMAND_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_S,
	hAndler: Accessor => {
		return sAveSelectedEditors(Accessor, { reAson: SAveReAson.EXPLICIT, sAveAs: true });
	}
});

CommAndsRegistry.registerCommAnd({
	id: SAVE_ALL_COMMAND_ID,
	hAndler: (Accessor) => {
		return sAveDirtyEditorsOfGroups(Accessor, Accessor.get(IEditorGroupsService).getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE), { reAson: SAveReAson.EXPLICIT });
	}
});

CommAndsRegistry.registerCommAnd({
	id: SAVE_ALL_IN_GROUP_COMMAND_ID,
	hAndler: (Accessor, _: URI | object, editorContext: IEditorCommAndsContext) => {
		const editorGroupService = Accessor.get(IEditorGroupsService);

		const contexts = getMultiSelectedEditorContexts(editorContext, Accessor.get(IListService), Accessor.get(IEditorGroupsService));

		let groups: ReAdonlyArrAy<IEditorGroup> | undefined = undefined;
		if (!contexts.length) {
			groups = editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);
		} else {
			groups = coAlesce(contexts.mAp(context => editorGroupService.getGroup(context.groupId)));
		}

		return sAveDirtyEditorsOfGroups(Accessor, groups, { reAson: SAveReAson.EXPLICIT });
	}
});

CommAndsRegistry.registerCommAnd({
	id: SAVE_FILES_COMMAND_ID,
	hAndler: Accessor => {
		const editorService = Accessor.get(IEditorService);

		return editorService.sAveAll({ includeUntitled: fAlse, reAson: SAveReAson.EXPLICIT });
	}
});

CommAndsRegistry.registerCommAnd({
	id: REVERT_FILE_COMMAND_ID,
	hAndler: Async Accessor => {
		const notificAtionService = Accessor.get(INotificAtionService);
		const listService = Accessor.get(IListService);
		const editorGroupService = Accessor.get(IEditorGroupsService);
		const editorService = Accessor.get(IEditorService);

		// Retrieve selected or Active editor
		let editors = getOpenEditorsViewMultiSelection(listService, editorGroupService);
		if (!editors) {
			const ActiveGroup = editorGroupService.ActiveGroup;
			if (ActiveGroup.ActiveEditor) {
				editors = [{ groupId: ActiveGroup.id, editor: ActiveGroup.ActiveEditor }];
			}
		}

		if (!editors || editors.length === 0) {
			return; // nothing to revert
		}

		try {
			AwAit editorService.revert(editors.filter(({ editor }) => !editor.isUntitled() /* All except untitled */), { force: true });
		} cAtch (error) {
			notificAtionService.error(nls.locAlize('genericRevertError', "FAiled to revert '{0}': {1}", editors.mAp(({ editor }) => editor.getNAme()).join(', '), toErrorMessAge(error, fAlse)));
		}
	}
});

CommAndsRegistry.registerCommAnd({
	id: REMOVE_ROOT_FOLDER_COMMAND_ID,
	hAndler: (Accessor, resource: URI | object) => {
		const workspAceEditingService = Accessor.get(IWorkspAceEditingService);
		const contextService = Accessor.get(IWorkspAceContextService);
		const uriIdentityService = Accessor.get(IUriIdentityService);
		const workspAce = contextService.getWorkspAce();
		const resources = getMultiSelectedResources(resource, Accessor.get(IListService), Accessor.get(IEditorService), Accessor.get(IExplorerService)).filter(resource =>
			workspAce.folders.some(folder => uriIdentityService.extUri.isEquAl(folder.uri, resource)) // Need to verify resources Are workspAces since multi selection cAn trigger this commAnd on some non workspAce resources
		);

		return workspAceEditingService.removeFolders(resources);
	}
});

// Compressed item nAvigAtion

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib + 10,
	when: ContextKeyExpr.And(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negAte()),
	primAry: KeyCode.LeftArrow,
	id: PREVIOUS_COMPRESSED_FOLDER,
	hAndler: (Accessor) => {
		const viewletService = Accessor.get(IViewletService);
		const viewlet = viewletService.getActiveViewlet();

		if (viewlet?.getId() !== VIEWLET_ID) {
			return;
		}

		const explorer = viewlet.getViewPAneContAiner() As ExplorerViewPAneContAiner;
		const view = explorer.getExplorerView();
		view.previousCompressedStAt();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib + 10,
	when: ContextKeyExpr.And(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLAstFocusContext.negAte()),
	primAry: KeyCode.RightArrow,
	id: NEXT_COMPRESSED_FOLDER,
	hAndler: (Accessor) => {
		const viewletService = Accessor.get(IViewletService);
		const viewlet = viewletService.getActiveViewlet();

		if (viewlet?.getId() !== VIEWLET_ID) {
			return;
		}

		const explorer = viewlet.getViewPAneContAiner() As ExplorerViewPAneContAiner;
		const view = explorer.getExplorerView();
		view.nextCompressedStAt();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib + 10,
	when: ContextKeyExpr.And(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negAte()),
	primAry: KeyCode.Home,
	id: FIRST_COMPRESSED_FOLDER,
	hAndler: (Accessor) => {
		const viewletService = Accessor.get(IViewletService);
		const viewlet = viewletService.getActiveViewlet();

		if (viewlet?.getId() !== VIEWLET_ID) {
			return;
		}

		const explorer = viewlet.getViewPAneContAiner() As ExplorerViewPAneContAiner;
		const view = explorer.getExplorerView();
		view.firstCompressedStAt();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib + 10,
	when: ContextKeyExpr.And(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLAstFocusContext.negAte()),
	primAry: KeyCode.End,
	id: LAST_COMPRESSED_FOLDER,
	hAndler: (Accessor) => {
		const viewletService = Accessor.get(IViewletService);
		const viewlet = viewletService.getActiveViewlet();

		if (viewlet?.getId() !== VIEWLET_ID) {
			return;
		}

		const explorer = viewlet.getViewPAneContAiner() As ExplorerViewPAneContAiner;
		const view = explorer.getExplorerView();
		view.lAstCompressedStAt();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: null,
	primAry: KeyMod.CtrlCmd | KeyCode.KEY_N,
	id: NEW_UNTITLED_FILE_COMMAND_ID,
	description: {
		description: NEW_UNTITLED_FILE_LABEL,
		Args: [
			{
				nAme: 'viewType', description: 'The editor view type', schemA: {
					'type': 'object',
					'required': ['viewType'],
					'properties': {
						'viewType': {
							'type': 'string'
						}
					}
				}
			}
		]
	},
	hAndler: Async (Accessor, Args?: { viewType: string }) => {
		const editorService = Accessor.get(IEditorService);

		if (typeof Args?.viewType === 'string') {
			const editorGroupsService = Accessor.get(IEditorGroupsService);
			const configurAtionService = Accessor.get(IConfigurAtionService);
			const quickInputService = Accessor.get(IQuickInputService);

			const textInput = editorService.creAteEditorInput({ options: { pinned: true } });
			const group = editorGroupsService.ActiveGroup;
			AwAit openEditorWith(textInput, Args.viewType, { pinned: true }, group, editorService, configurAtionService, quickInputService);
		} else {
			AwAit editorService.openEditor({ options: { pinned: true } }); // untitled Are AlwAys pinned
		}
	}
});


