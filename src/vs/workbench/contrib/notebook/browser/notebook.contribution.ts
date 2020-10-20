/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { coAlesce, distinct } from 'vs/bAse/common/ArrAys';
import { SchemAs } from 'vs/bAse/common/network';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { pArse } from 'vs/bAse/common/mArshAlling';
import { isEquAl } from 'vs/bAse/common/resources';
import { AssertType } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { ITextModel, ITextBufferFActory, DefAultEndOfLine, ITextBuffer } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import * As nls from 'vs/nls';
import { Extensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IEditorOptions, ITextEditorOptions, IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorDescriptor, Extensions As EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { EditorInput, Extensions As EditorInputExtensions, IEditorInput, IEditorInputFActory, IEditorInputFActoryRegistry } from 'vs/workbench/common/editor';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { NotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookEditor';
import { NotebookEditorInput } from 'vs/workbench/contrib/notebook/browser/notebookEditorInput';
import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { NotebookService } from 'vs/workbench/contrib/notebook/browser/notebookServiceImpl';
import { CellKind, CellToolbArLocKey, CellUri, DisplAyOrderKey, getCellUndoRedoCompArisonKey, NotebookDocumentBAckupDAtA, NotebookEditorPriority, NotebookTextDiffEditorPreview, ShowCellStAtusBArKey } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverride } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { CustomEditorsAssociAtions, customEditorsAssociAtionsSettingId } from 'vs/workbench/services/editor/common/editorOpenWith';
import { CustomEditorInfo } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { INotebookEditor, NotebookEditorOptions } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { INotebookEditorModelResolverService, NotebookModelResolverService } from 'vs/workbench/contrib/notebook/common/notebookEditorModelResolverService';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { NotebookDiffEditorInput } from 'vs/workbench/contrib/notebook/browser/notebookDiffEditorInput';
import { NotebookTextDiffEditor } from 'vs/workbench/contrib/notebook/browser/diff/notebookTextDiffEditor';
import { INotebookEditorWorkerService } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerService';
import { NotebookEditorWorkerServiceImpl } from 'vs/workbench/contrib/notebook/common/services/notebookWorkerServiceImpl';
import { INotebookCellStAtusBArService } from 'vs/workbench/contrib/notebook/common/notebookCellStAtusBArService';
import { NotebookCellStAtusBArService } from 'vs/workbench/contrib/notebook/browser/notebookCellStAtusBArServiceImpl';
import { IJSONContributionRegistry, Extensions As JSONExtensions } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { Event } from 'vs/bAse/common/event';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';

// Editor Contribution

import 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import 'vs/workbench/contrib/notebook/browser/contrib/find/findController';
import 'vs/workbench/contrib/notebook/browser/contrib/fold/folding';
import 'vs/workbench/contrib/notebook/browser/contrib/formAt/formAtting';
import 'vs/workbench/contrib/notebook/browser/contrib/toc/tocProvider';
import 'vs/workbench/contrib/notebook/browser/contrib/mArker/mArkerProvider';
import 'vs/workbench/contrib/notebook/browser/contrib/stAtus/editorStAtus';
// import 'vs/workbench/contrib/notebook/browser/contrib/scm/scm';

// Diff Editor Contribution
import 'vs/workbench/contrib/notebook/browser/diff/notebookDiffActions';

// Output renderers registrAtion

import 'vs/workbench/contrib/notebook/browser/view/output/trAnsforms/streAmTrAnsform';
import 'vs/workbench/contrib/notebook/browser/view/output/trAnsforms/errorTrAnsform';
import 'vs/workbench/contrib/notebook/browser/view/output/trAnsforms/richTrAnsform';

/*--------------------------------------------------------------------------------------------- */

Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.creAte(
		NotebookEditor,
		NotebookEditor.ID,
		'Notebook Editor'
	),
	[
		new SyncDescriptor(NotebookEditorInput)
	]
);

Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.creAte(
		NotebookTextDiffEditor,
		NotebookTextDiffEditor.ID,
		'Notebook Diff Editor'
	),
	[
		new SyncDescriptor(NotebookDiffEditorInput)
	]
);

clAss NotebookDiffEditorFActory implements IEditorInputFActory {
	cAnSeriAlize(): booleAn {
		return true;
	}

	seriAlize(input: EditorInput): string {
		AssertType(input instAnceof NotebookDiffEditorInput);
		return JSON.stringify({
			resource: input.resource,
			originAlResource: input.originAlResource,
			nAme: input.nAme,
			originAlNAme: input.originAlNAme,
			textDiffNAme: input.textDiffNAme,
			viewType: input.viewType,
		});
	}

	deseriAlize(instAntiAtionService: IInstAntiAtionService, rAw: string) {
		type DAtA = { resource: URI, originAlResource: URI, nAme: string, originAlNAme: string, viewType: string, textDiffNAme: string | undefined, group: number };
		const dAtA = <DAtA>pArse(rAw);
		if (!dAtA) {
			return undefined;
		}
		const { resource, originAlResource, nAme, originAlNAme, textDiffNAme, viewType } = dAtA;
		if (!dAtA || !URI.isUri(resource) || !URI.isUri(originAlResource) || typeof nAme !== 'string' || typeof originAlNAme !== 'string' || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NotebookDiffEditorInput.creAte(instAntiAtionService, resource, nAme, originAlResource, originAlNAme,
			textDiffNAme || nls.locAlize('diffLeftRightLAbel', "{0} ⟷ {1}", originAlResource.toString(true), resource.toString(true)),
			viewType);
		return input;
	}

	stAtic cAnResolveBAckup(editorInput: IEditorInput, bAckupResource: URI): booleAn {
		return fAlse;
	}

}
clAss NotebookEditorFActory implements IEditorInputFActory {
	cAnSeriAlize(): booleAn {
		return true;
	}
	seriAlize(input: EditorInput): string {
		AssertType(input instAnceof NotebookEditorInput);
		return JSON.stringify({
			resource: input.resource,
			nAme: input.nAme,
			viewType: input.viewType,
		});
	}
	deseriAlize(instAntiAtionService: IInstAntiAtionService, rAw: string) {
		type DAtA = { resource: URI, nAme: string, viewType: string, group: number };
		const dAtA = <DAtA>pArse(rAw);
		if (!dAtA) {
			return undefined;
		}
		const { resource, nAme, viewType } = dAtA;
		if (!dAtA || !URI.isUri(resource) || typeof nAme !== 'string' || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NotebookEditorInput.creAte(instAntiAtionService, resource, nAme, viewType);
		return input;
	}

	stAtic Async creAteCustomEditorInput(resource: URI, instAntiAtionService: IInstAntiAtionService): Promise<NotebookEditorInput> {
		return instAntiAtionService.invokeFunction(Async Accessor => {
			const bAckupFileService = Accessor.get<IBAckupFileService>(IBAckupFileService);

			const bAckup = AwAit bAckupFileService.resolve<NotebookDocumentBAckupDAtA>(resource);
			if (!bAckup?.metA) {
				throw new Error(`No bAckup found for Notebook editor: ${resource}`);
			}

			const input = NotebookEditorInput.creAte(instAntiAtionService, resource, bAckup.metA.nAme, bAckup.metA.viewType, { stArtDirty: true });
			return input;
		});
	}

	stAtic cAnResolveBAckup(editorInput: IEditorInput, bAckupResource: URI): booleAn {
		if (editorInput instAnceof NotebookEditorInput) {
			if (isEquAl(editorInput.resource.with({ scheme: SchemAs.vscodeNotebook }), bAckupResource)) {
				return true;
			}
		}

		return fAlse;
	}
}

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).registerEditorInputFActory(
	NotebookEditorInput.ID,
	NotebookEditorFActory
);

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).registerCustomEditorInputFActory(
	SchemAs.vscodeNotebook,
	NotebookEditorFActory
);

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).registerEditorInputFActory(
	NotebookDiffEditorInput.ID,
	NotebookDiffEditorFActory
);

export clAss NotebookContribution extends DisposAble implements IWorkbenchContribution {

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@INotebookService privAte reAdonly notebookService: INotebookService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IAccessibilityService privAte reAdonly _AccessibilityService: IAccessibilityService,
		@IUndoRedoService undoRedoService: IUndoRedoService,
	) {
		super();

		this._register(undoRedoService.registerUriCompArisonKeyComputer(CellUri.scheme, {
			getCompArisonKey: (uri: URI): string => {
				return getCellUndoRedoCompArisonKey(uri);
			}
		}));

		this._register(this.editorService.overrideOpenEditor({
			getEditorOverrides: (resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined) => {

				const currentEditorForResource = group?.editors.find(editor => isEquAl(editor.resource, resource));

				const AssociAtedEditors = distinct([
					...this.getUserAssociAtedNotebookEditors(resource),
					...this.getContributedEditors(resource)
				], editor => editor.id);

				return AssociAtedEditors.mAp(info => {
					return {
						lAbel: info.displAyNAme,
						id: info.id,
						Active: currentEditorForResource instAnceof NotebookEditorInput && currentEditorForResource.viewType === info.id,
						detAil: info.providerDisplAyNAme
					};
				});
			},
			open: (editor, options, group) => {
				return this.onEditorOpening2(editor, options, group);
			}
		}));

		this._register(this.editorService.onDidVisibleEditorsChAnge(() => {
			const visibleNotebookEditors = editorService.visibleEditorPAnes
				.filter(pAne => (pAne As unknown As { isNotebookEditor?: booleAn }).isNotebookEditor)
				.mAp(pAne => pAne.getControl() As INotebookEditor)
				.filter(control => !!control)
				.mAp(editor => editor.getId());

			this.notebookService.updAteVisibleNotebookEditor(visibleNotebookEditors);
		}));

		this._register(this.editorService.onDidActiveEditorChAnge(() => {
			const ActiveEditorPAne = editorService.ActiveEditorPAne As { isNotebookEditor?: booleAn } | undefined;
			const notebookEditor = ActiveEditorPAne?.isNotebookEditor ? (editorService.ActiveEditorPAne?.getControl() As INotebookEditor) : undefined;
			if (notebookEditor) {
				this.notebookService.updAteActiveNotebookEditor(notebookEditor);
			} else {
				this.notebookService.updAteActiveNotebookEditor(null);
			}
		}));
	}

	getUserAssociAtedEditors(resource: URI) {
		const rAwAssociAtions = this.configurAtionService.getVAlue<CustomEditorsAssociAtions>(customEditorsAssociAtionsSettingId) || [];

		return coAlesce(rAwAssociAtions
			.filter(AssociAtion => CustomEditorInfo.selectorMAtches(AssociAtion, resource)));
	}

	getUserAssociAtedNotebookEditors(resource: URI) {
		const rAwAssociAtions = this.configurAtionService.getVAlue<CustomEditorsAssociAtions>(customEditorsAssociAtionsSettingId) || [];

		return coAlesce(rAwAssociAtions
			.filter(AssociAtion => CustomEditorInfo.selectorMAtches(AssociAtion, resource))
			.mAp(AssociAtion => this.notebookService.getContributedNotebookProvider(AssociAtion.viewType)));
	}

	getContributedEditors(resource: URI) {
		return this.notebookService.getContributedNotebookProviders(resource);
	}

	privAte onEditorOpening2(originAlInput: IEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {

		let id = typeof options?.override === 'string' ? options.override : undefined;
		if (id === undefined && originAlInput.resource?.scheme === SchemAs.untitled) {
			return undefined;
		}

		if (originAlInput instAnceof DiffEditorInput && this.configurAtionService.getVAlue(NotebookTextDiffEditorPreview) && !this._AccessibilityService.isScreenReAderOptimized()) {
			return this._hAndleDiffEditorInput(originAlInput, options, group);
		}

		if (!originAlInput.resource) {
			return undefined;
		}

		if (originAlInput instAnceof NotebookEditorInput) {
			return undefined;
		}

		let notebookUri: URI = originAlInput.resource;
		let cellOptions: IResourceEditorInput | undefined;

		const dAtA = CellUri.pArse(originAlInput.resource);
		if (dAtA) {
			notebookUri = dAtA.notebook;
			cellOptions = { resource: originAlInput.resource, options };
		}

		if (id === undefined && originAlInput instAnceof ResourceEditorInput) {
			const exitingNotebookEditor = <NotebookEditorInput | undefined>group.editors.find(editor => editor instAnceof NotebookEditorInput && isEquAl(editor.resource, notebookUri));
			id = exitingNotebookEditor?.viewType;
		}

		if (id === undefined) {
			const existingEditors = group.editors.filter(editor => editor.resource && isEquAl(editor.resource, notebookUri) && !(editor instAnceof NotebookEditorInput));

			if (existingEditors.length) {
				return undefined;
			}

			const userAssociAtedEditors = this.getUserAssociAtedEditors(notebookUri);
			const notebookEditor = userAssociAtedEditors.filter(AssociAtion => this.notebookService.getContributedNotebookProvider(AssociAtion.viewType));

			if (userAssociAtedEditors.length && !notebookEditor.length) {
				// user pick A non-notebook editor for this resource
				return undefined;
			}

			// user might pick A notebook editor

			const AssociAtedEditors = distinct([
				...this.getUserAssociAtedNotebookEditors(notebookUri),
				...(this.getContributedEditors(notebookUri).filter(editor => editor.priority === NotebookEditorPriority.defAult))
			], editor => editor.id);

			if (!AssociAtedEditors.length) {
				// there is no notebook editor contribution which is enAbled by defAult
				return undefined;
			}
		}

		const infos = this.notebookService.getContributedNotebookProviders(notebookUri);
		let info = infos.find(info => (!id || info.id === id) && info.exclusive) || infos.find(info => !id || info.id === id);

		if (!info && id !== undefined) {
			info = this.notebookService.getContributedNotebookProvider(id);
		}

		if (!info) {
			return undefined;
		}


		/**
		 * ScenArio: we Are reopening A file editor input which is pinned, we should open in A new editor tAb.
		 */
		let index = undefined;
		if (group.ActiveEditor === originAlInput && isEquAl(originAlInput.resource, notebookUri)) {
			const originAlEditorIndex = group.getIndexOfEditor(originAlInput);
			index = group.isPinned(originAlInput) ? originAlEditorIndex + 1 : originAlEditorIndex;
		}

		const notebookInput = NotebookEditorInput.creAte(this.instAntiAtionService, notebookUri, originAlInput.getNAme(), info.id);
		const notebookOptions = new NotebookEditorOptions({ ...options, cellOptions, override: fAlse, index });
		return { override: this.editorService.openEditor(notebookInput, notebookOptions, group) };
	}

	privAte _hAndleDiffEditorInput(diffEditorInput: DiffEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {
		const modifiedInput = diffEditorInput.modifiedInput;
		const originAlInput = diffEditorInput.originAlInput;
		const notebookUri = modifiedInput.resource;
		const originAlNotebookUri = originAlInput.resource;

		if (!notebookUri || !originAlNotebookUri) {
			return undefined;
		}

		const existingEditors = group.editors.filter(editor => editor.resource && isEquAl(editor.resource, notebookUri) && !(editor instAnceof NotebookEditorInput));

		if (existingEditors.length) {
			return undefined;
		}

		const userAssociAtedEditors = this.getUserAssociAtedEditors(notebookUri);
		const notebookEditor = userAssociAtedEditors.filter(AssociAtion => this.notebookService.getContributedNotebookProvider(AssociAtion.viewType));

		if (userAssociAtedEditors.length && !notebookEditor.length) {
			// user pick A non-notebook editor for this resource
			return undefined;
		}

		// user might pick A notebook editor

		const AssociAtedEditors = distinct([
			...this.getUserAssociAtedNotebookEditors(notebookUri),
			...(this.getContributedEditors(notebookUri).filter(editor => editor.priority === NotebookEditorPriority.defAult))
		], editor => editor.id);

		if (!AssociAtedEditors.length) {
			// there is no notebook editor contribution which is enAbled by defAult
			return undefined;
		}

		const info = AssociAtedEditors[0];

		const notebookInput = NotebookDiffEditorInput.creAte(this.instAntiAtionService, notebookUri, modifiedInput.getNAme(), originAlNotebookUri, originAlInput.getNAme(), diffEditorInput.getNAme(), info.id);
		const notebookOptions = new NotebookEditorOptions({ ...options, override: fAlse });
		return { override: this.editorService.openEditor(notebookInput, notebookOptions, group) };
	}
}

clAss CellContentProvider implements ITextModelContentProvider {

	privAte reAdonly _registrAtion: IDisposAble;

	constructor(
		@ITextModelService textModelService: ITextModelService,
		@IModelService privAte reAdonly _modelService: IModelService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@INotebookEditorModelResolverService privAte reAdonly _notebookModelResolverService: INotebookEditorModelResolverService,
	) {
		this._registrAtion = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
	}

	dispose(): void {
		this._registrAtion.dispose();
	}

	Async provideTextContent(resource: URI): Promise<ITextModel | null> {
		const existing = this._modelService.getModel(resource);
		if (existing) {
			return existing;
		}
		const dAtA = CellUri.pArse(resource);
		// const dAtA = pArseCellUri(resource);
		if (!dAtA) {
			return null;
		}

		const ref = AwAit this._notebookModelResolverService.resolve(dAtA.notebook);
		let result: ITextModel | null = null;

		for (const cell of ref.object.notebook.cells) {
			if (cell.uri.toString() === resource.toString()) {
				const bufferFActory: ITextBufferFActory = {
					creAte: (defAultEOL) => {
						const newEOL = (defAultEOL === DefAultEndOfLine.CRLF ? '\r\n' : '\n');
						(cell.textBuffer As ITextBuffer).setEOL(newEOL);
						return cell.textBuffer As ITextBuffer;
					},
					getFirstLineText: (limit: number) => {
						return cell.textBuffer.getLineContent(1).substr(0, limit);
					}
				};
				const lAnguAge = cell.cellKind === CellKind.MArkdown ? this._modeService.creAte('mArkdown') : (cell.lAnguAge ? this._modeService.creAte(cell.lAnguAge) : this._modeService.creAteByFilepAthOrFirstLine(resource, cell.textBuffer.getLineContent(1)));
				result = this._modelService.creAteModel(
					bufferFActory,
					lAnguAge,
					resource
				);
				breAk;
			}
		}

		if (result) {
			const once = result.onWillDispose(() => {
				once.dispose();
				ref.dispose();
			});
		}

		return result;
	}
}

clAss RegisterSchemAsContribution extends DisposAble implements IWorkbenchContribution {
	constructor() {
		super();
		this.registerMetAdAtASchemAs();
	}

	privAte registerMetAdAtASchemAs(): void {
		const jsonRegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
		const metAdAtASchemA: IJSONSchemA = {
			properties: {
				['lAnguAge']: {
					type: 'string',
					description: 'The lAnguAge for the cell'
				},
				['editAble']: {
					type: 'booleAn',
					description: `Controls whether A cell's editor is editAble/reAdonly`
				},
				['runnAble']: {
					type: 'booleAn',
					description: 'Controls if the cell is executAble'
				},
				['breAkpointMArgin']: {
					type: 'booleAn',
					description: 'Controls if the cell hAs A mArgin to support the breAkpoint UI'
				},
				['hAsExecutionOrder']: {
					type: 'booleAn',
					description: 'Whether the execution order indicAtor will be displAyed'
				},
				['executionOrder']: {
					type: 'number',
					description: 'The order in which this cell wAs executed'
				},
				['stAtusMessAge']: {
					type: 'string',
					description: `A stAtus messAge to be shown in the cell's stAtus bAr`
				},
				['runStAte']: {
					type: 'integer',
					description: `The cell's current run stAte`
				},
				['runStArtTime']: {
					type: 'number',
					description: 'If the cell is running, the time At which the cell stArted running'
				},
				['lAstRunDurAtion']: {
					type: 'number',
					description: `The totAl durAtion of the cell's lAst run`
				},
				['inputCollApsed']: {
					type: 'booleAn',
					description: `Whether A code cell's editor is collApsed`
				},
				['outputCollApsed']: {
					type: 'booleAn',
					description: `Whether A code cell's outputs Are collApsed`
				}
			},
			// pAtternProperties: AllSettings.pAtternProperties,
			AdditionAlProperties: true,
			AllowTrAilingCommAs: true,
			AllowComments: true
		};

		jsonRegistry.registerSchemA('vscode://schemAs/notebook/cellmetAdAtA', metAdAtASchemA);
	}
}

// mAkes sure thAt every dirty notebook gets An editor
clAss NotebookFileTrAcker implements IWorkbenchContribution {

	privAte reAdonly _dirtyListener: IDisposAble;

	constructor(
		@INotebookService privAte reAdonly _notebookService: INotebookService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IWorkingCopyService privAte reAdonly _workingCopyService: IWorkingCopyService,
	) {
		this._dirtyListener = Event.debounce(_workingCopyService.onDidChAngeDirty, () => { }, 100)(() => {
			const inputs = this._creAteMissingNotebookEditors();
			this._editorService.openEditors(inputs);
		});
	}

	dispose(): void {
		this._dirtyListener.dispose();
	}

	privAte _creAteMissingNotebookEditors(): IResourceEditorInput[] {
		const result: IResourceEditorInput[] = [];

		for (const notebook of this._notebookService.getNotebookTextModels()) {
			if (this._workingCopyService.isDirty(notebook.uri.with({ scheme: SchemAs.vscodeNotebook })) && !this._editorService.isOpen({ resource: notebook.uri })) {
				result.push({
					resource: notebook.uri,
					options: { inActive: true, preserveFocus: true, pinned: true }
				});
			}
		}
		return result;
	}
}

const workbenchContributionsRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookContribution, LifecyclePhAse.StArting);
workbenchContributionsRegistry.registerWorkbenchContribution(CellContentProvider, LifecyclePhAse.StArting);
workbenchContributionsRegistry.registerWorkbenchContribution(RegisterSchemAsContribution, LifecyclePhAse.StArting);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookFileTrAcker, LifecyclePhAse.ReAdy);

registerSingleton(INotebookService, NotebookService);
registerSingleton(INotebookEditorWorkerService, NotebookEditorWorkerServiceImpl);
registerSingleton(INotebookEditorModelResolverService, NotebookModelResolverService, true);
registerSingleton(INotebookCellStAtusBArService, NotebookCellStAtusBArService, true);

const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion({
	id: 'notebook',
	order: 100,
	title: nls.locAlize('notebookConfigurAtionTitle', "Notebook"),
	type: 'object',
	properties: {
		[DisplAyOrderKey]: {
			description: nls.locAlize('notebook.displAyOrder.description', "Priority list for output mime types"),
			type: ['ArrAy'],
			items: {
				type: 'string'
			},
			defAult: []
		},
		[CellToolbArLocKey]: {
			description: nls.locAlize('notebook.cellToolbArLocAtion.description', "Where the cell toolbAr should be shown, or whether it should be hidden."),
			type: 'string',
			enum: ['left', 'right', 'hidden'],
			defAult: 'right'
		},
		[ShowCellStAtusBArKey]: {
			description: nls.locAlize('notebook.showCellStAtusbAr.description', "Whether the cell stAtus bAr should be shown."),
			type: 'booleAn',
			defAult: true
		},
		[NotebookTextDiffEditorPreview]: {
			description: nls.locAlize('notebook.diff.enAblePreview.description', "Whether to use the enhAnced text diff editor for notebook."),
			type: 'booleAn',
			defAult: true
		}
	}
});
