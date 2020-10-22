/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { coalesce, distinct } from 'vs/Base/common/arrays';
import { Schemas } from 'vs/Base/common/network';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { parse } from 'vs/Base/common/marshalling';
import { isEqual } from 'vs/Base/common/resources';
import { assertType } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { ITextModel, ITextBufferFactory, DefaultEndOfLine, ITextBuffer } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { IEditorOptions, ITextEditorOptions, IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workBench/Browser/editor';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { EditorInput, Extensions as EditorInputExtensions, IEditorInput, IEditorInputFactory, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { NoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditor';
import { NoteBookEditorInput } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditorInput';
import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { NoteBookService } from 'vs/workBench/contriB/noteBook/Browser/noteBookServiceImpl';
import { CellKind, CellToolBarLocKey, CellUri, DisplayOrderKey, getCellUndoRedoComparisonKey, NoteBookDocumentBackupData, NoteBookEditorPriority, NoteBookTextDiffEditorPreview, ShowCellStatusBarKey } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverride } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { CustomEditorsAssociations, customEditorsAssociationsSettingId } from 'vs/workBench/services/editor/common/editorOpenWith';
import { CustomEditorInfo } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { INoteBookEditor, NoteBookEditorOptions } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { INoteBookEditorModelResolverService, NoteBookModelResolverService } from 'vs/workBench/contriB/noteBook/common/noteBookEditorModelResolverService';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { NoteBookDiffEditorInput } from 'vs/workBench/contriB/noteBook/Browser/noteBookDiffEditorInput';
import { NoteBookTextDiffEditor } from 'vs/workBench/contriB/noteBook/Browser/diff/noteBookTextDiffEditor';
import { INoteBookEditorWorkerService } from 'vs/workBench/contriB/noteBook/common/services/noteBookWorkerService';
import { NoteBookEditorWorkerServiceImpl } from 'vs/workBench/contriB/noteBook/common/services/noteBookWorkerServiceImpl';
import { INoteBookCellStatusBarService } from 'vs/workBench/contriB/noteBook/common/noteBookCellStatusBarService';
import { NoteBookCellStatusBarService } from 'vs/workBench/contriB/noteBook/Browser/noteBookCellStatusBarServiceImpl';
import { IJSONContriButionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { Event } from 'vs/Base/common/event';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';

// Editor ContriBution

import 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import 'vs/workBench/contriB/noteBook/Browser/contriB/find/findController';
import 'vs/workBench/contriB/noteBook/Browser/contriB/fold/folding';
import 'vs/workBench/contriB/noteBook/Browser/contriB/format/formatting';
import 'vs/workBench/contriB/noteBook/Browser/contriB/toc/tocProvider';
import 'vs/workBench/contriB/noteBook/Browser/contriB/marker/markerProvider';
import 'vs/workBench/contriB/noteBook/Browser/contriB/status/editorStatus';
// import 'vs/workBench/contriB/noteBook/Browser/contriB/scm/scm';

// Diff Editor ContriBution
import 'vs/workBench/contriB/noteBook/Browser/diff/noteBookDiffActions';

// Output renderers registration

import 'vs/workBench/contriB/noteBook/Browser/view/output/transforms/streamTransform';
import 'vs/workBench/contriB/noteBook/Browser/view/output/transforms/errorTransform';
import 'vs/workBench/contriB/noteBook/Browser/view/output/transforms/richTransform';

/*--------------------------------------------------------------------------------------------- */

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		NoteBookEditor,
		NoteBookEditor.ID,
		'NoteBook Editor'
	),
	[
		new SyncDescriptor(NoteBookEditorInput)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		NoteBookTextDiffEditor,
		NoteBookTextDiffEditor.ID,
		'NoteBook Diff Editor'
	),
	[
		new SyncDescriptor(NoteBookDiffEditorInput)
	]
);

class NoteBookDiffEditorFactory implements IEditorInputFactory {
	canSerialize(): Boolean {
		return true;
	}

	serialize(input: EditorInput): string {
		assertType(input instanceof NoteBookDiffEditorInput);
		return JSON.stringify({
			resource: input.resource,
			originalResource: input.originalResource,
			name: input.name,
			originalName: input.originalName,
			textDiffName: input.textDiffName,
			viewType: input.viewType,
		});
	}

	deserialize(instantiationService: IInstantiationService, raw: string) {
		type Data = { resource: URI, originalResource: URI, name: string, originalName: string, viewType: string, textDiffName: string | undefined, group: numBer };
		const data = <Data>parse(raw);
		if (!data) {
			return undefined;
		}
		const { resource, originalResource, name, originalName, textDiffName, viewType } = data;
		if (!data || !URI.isUri(resource) || !URI.isUri(originalResource) || typeof name !== 'string' || typeof originalName !== 'string' || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NoteBookDiffEditorInput.create(instantiationService, resource, name, originalResource, originalName,
			textDiffName || nls.localize('diffLeftRightLaBel', "{0} ⟷ {1}", originalResource.toString(true), resource.toString(true)),
			viewType);
		return input;
	}

	static canResolveBackup(editorInput: IEditorInput, BackupResource: URI): Boolean {
		return false;
	}

}
class NoteBookEditorFactory implements IEditorInputFactory {
	canSerialize(): Boolean {
		return true;
	}
	serialize(input: EditorInput): string {
		assertType(input instanceof NoteBookEditorInput);
		return JSON.stringify({
			resource: input.resource,
			name: input.name,
			viewType: input.viewType,
		});
	}
	deserialize(instantiationService: IInstantiationService, raw: string) {
		type Data = { resource: URI, name: string, viewType: string, group: numBer };
		const data = <Data>parse(raw);
		if (!data) {
			return undefined;
		}
		const { resource, name, viewType } = data;
		if (!data || !URI.isUri(resource) || typeof name !== 'string' || typeof viewType !== 'string') {
			return undefined;
		}

		const input = NoteBookEditorInput.create(instantiationService, resource, name, viewType);
		return input;
	}

	static async createCustomEditorInput(resource: URI, instantiationService: IInstantiationService): Promise<NoteBookEditorInput> {
		return instantiationService.invokeFunction(async accessor => {
			const BackupFileService = accessor.get<IBackupFileService>(IBackupFileService);

			const Backup = await BackupFileService.resolve<NoteBookDocumentBackupData>(resource);
			if (!Backup?.meta) {
				throw new Error(`No Backup found for NoteBook editor: ${resource}`);
			}

			const input = NoteBookEditorInput.create(instantiationService, resource, Backup.meta.name, Backup.meta.viewType, { startDirty: true });
			return input;
		});
	}

	static canResolveBackup(editorInput: IEditorInput, BackupResource: URI): Boolean {
		if (editorInput instanceof NoteBookEditorInput) {
			if (isEqual(editorInput.resource.with({ scheme: Schemas.vscodeNoteBook }), BackupResource)) {
				return true;
			}
		}

		return false;
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(
	NoteBookEditorInput.ID,
	NoteBookEditorFactory
);

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerCustomEditorInputFactory(
	Schemas.vscodeNoteBook,
	NoteBookEditorFactory
);

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(
	NoteBookDiffEditorInput.ID,
	NoteBookDiffEditorFactory
);

export class NoteBookContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@INoteBookService private readonly noteBookService: INoteBookService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IAccessiBilityService private readonly _accessiBilityService: IAccessiBilityService,
		@IUndoRedoService undoRedoService: IUndoRedoService,
	) {
		super();

		this._register(undoRedoService.registerUriComparisonKeyComputer(CellUri.scheme, {
			getComparisonKey: (uri: URI): string => {
				return getCellUndoRedoComparisonKey(uri);
			}
		}));

		this._register(this.editorService.overrideOpenEditor({
			getEditorOverrides: (resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined) => {

				const currentEditorForResource = group?.editors.find(editor => isEqual(editor.resource, resource));

				const associatedEditors = distinct([
					...this.getUserAssociatedNoteBookEditors(resource),
					...this.getContriButedEditors(resource)
				], editor => editor.id);

				return associatedEditors.map(info => {
					return {
						laBel: info.displayName,
						id: info.id,
						active: currentEditorForResource instanceof NoteBookEditorInput && currentEditorForResource.viewType === info.id,
						detail: info.providerDisplayName
					};
				});
			},
			open: (editor, options, group) => {
				return this.onEditorOpening2(editor, options, group);
			}
		}));

		this._register(this.editorService.onDidVisiBleEditorsChange(() => {
			const visiBleNoteBookEditors = editorService.visiBleEditorPanes
				.filter(pane => (pane as unknown as { isNoteBookEditor?: Boolean }).isNoteBookEditor)
				.map(pane => pane.getControl() as INoteBookEditor)
				.filter(control => !!control)
				.map(editor => editor.getId());

			this.noteBookService.updateVisiBleNoteBookEditor(visiBleNoteBookEditors);
		}));

		this._register(this.editorService.onDidActiveEditorChange(() => {
			const activeEditorPane = editorService.activeEditorPane as { isNoteBookEditor?: Boolean } | undefined;
			const noteBookEditor = activeEditorPane?.isNoteBookEditor ? (editorService.activeEditorPane?.getControl() as INoteBookEditor) : undefined;
			if (noteBookEditor) {
				this.noteBookService.updateActiveNoteBookEditor(noteBookEditor);
			} else {
				this.noteBookService.updateActiveNoteBookEditor(null);
			}
		}));
	}

	getUserAssociatedEditors(resource: URI) {
		const rawAssociations = this.configurationService.getValue<CustomEditorsAssociations>(customEditorsAssociationsSettingId) || [];

		return coalesce(rawAssociations
			.filter(association => CustomEditorInfo.selectorMatches(association, resource)));
	}

	getUserAssociatedNoteBookEditors(resource: URI) {
		const rawAssociations = this.configurationService.getValue<CustomEditorsAssociations>(customEditorsAssociationsSettingId) || [];

		return coalesce(rawAssociations
			.filter(association => CustomEditorInfo.selectorMatches(association, resource))
			.map(association => this.noteBookService.getContriButedNoteBookProvider(association.viewType)));
	}

	getContriButedEditors(resource: URI) {
		return this.noteBookService.getContriButedNoteBookProviders(resource);
	}

	private onEditorOpening2(originalInput: IEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {

		let id = typeof options?.override === 'string' ? options.override : undefined;
		if (id === undefined && originalInput.resource?.scheme === Schemas.untitled) {
			return undefined;
		}

		if (originalInput instanceof DiffEditorInput && this.configurationService.getValue(NoteBookTextDiffEditorPreview) && !this._accessiBilityService.isScreenReaderOptimized()) {
			return this._handleDiffEditorInput(originalInput, options, group);
		}

		if (!originalInput.resource) {
			return undefined;
		}

		if (originalInput instanceof NoteBookEditorInput) {
			return undefined;
		}

		let noteBookUri: URI = originalInput.resource;
		let cellOptions: IResourceEditorInput | undefined;

		const data = CellUri.parse(originalInput.resource);
		if (data) {
			noteBookUri = data.noteBook;
			cellOptions = { resource: originalInput.resource, options };
		}

		if (id === undefined && originalInput instanceof ResourceEditorInput) {
			const exitingNoteBookEditor = <NoteBookEditorInput | undefined>group.editors.find(editor => editor instanceof NoteBookEditorInput && isEqual(editor.resource, noteBookUri));
			id = exitingNoteBookEditor?.viewType;
		}

		if (id === undefined) {
			const existingEditors = group.editors.filter(editor => editor.resource && isEqual(editor.resource, noteBookUri) && !(editor instanceof NoteBookEditorInput));

			if (existingEditors.length) {
				return undefined;
			}

			const userAssociatedEditors = this.getUserAssociatedEditors(noteBookUri);
			const noteBookEditor = userAssociatedEditors.filter(association => this.noteBookService.getContriButedNoteBookProvider(association.viewType));

			if (userAssociatedEditors.length && !noteBookEditor.length) {
				// user pick a non-noteBook editor for this resource
				return undefined;
			}

			// user might pick a noteBook editor

			const associatedEditors = distinct([
				...this.getUserAssociatedNoteBookEditors(noteBookUri),
				...(this.getContriButedEditors(noteBookUri).filter(editor => editor.priority === NoteBookEditorPriority.default))
			], editor => editor.id);

			if (!associatedEditors.length) {
				// there is no noteBook editor contriBution which is enaBled By default
				return undefined;
			}
		}

		const infos = this.noteBookService.getContriButedNoteBookProviders(noteBookUri);
		let info = infos.find(info => (!id || info.id === id) && info.exclusive) || infos.find(info => !id || info.id === id);

		if (!info && id !== undefined) {
			info = this.noteBookService.getContriButedNoteBookProvider(id);
		}

		if (!info) {
			return undefined;
		}


		/**
		 * Scenario: we are reopening a file editor input which is pinned, we should open in a new editor taB.
		 */
		let index = undefined;
		if (group.activeEditor === originalInput && isEqual(originalInput.resource, noteBookUri)) {
			const originalEditorIndex = group.getIndexOfEditor(originalInput);
			index = group.isPinned(originalInput) ? originalEditorIndex + 1 : originalEditorIndex;
		}

		const noteBookInput = NoteBookEditorInput.create(this.instantiationService, noteBookUri, originalInput.getName(), info.id);
		const noteBookOptions = new NoteBookEditorOptions({ ...options, cellOptions, override: false, index });
		return { override: this.editorService.openEditor(noteBookInput, noteBookOptions, group) };
	}

	private _handleDiffEditorInput(diffEditorInput: DiffEditorInput, options: IEditorOptions | ITextEditorOptions | undefined, group: IEditorGroup): IOpenEditorOverride | undefined {
		const modifiedInput = diffEditorInput.modifiedInput;
		const originalInput = diffEditorInput.originalInput;
		const noteBookUri = modifiedInput.resource;
		const originalNoteBookUri = originalInput.resource;

		if (!noteBookUri || !originalNoteBookUri) {
			return undefined;
		}

		const existingEditors = group.editors.filter(editor => editor.resource && isEqual(editor.resource, noteBookUri) && !(editor instanceof NoteBookEditorInput));

		if (existingEditors.length) {
			return undefined;
		}

		const userAssociatedEditors = this.getUserAssociatedEditors(noteBookUri);
		const noteBookEditor = userAssociatedEditors.filter(association => this.noteBookService.getContriButedNoteBookProvider(association.viewType));

		if (userAssociatedEditors.length && !noteBookEditor.length) {
			// user pick a non-noteBook editor for this resource
			return undefined;
		}

		// user might pick a noteBook editor

		const associatedEditors = distinct([
			...this.getUserAssociatedNoteBookEditors(noteBookUri),
			...(this.getContriButedEditors(noteBookUri).filter(editor => editor.priority === NoteBookEditorPriority.default))
		], editor => editor.id);

		if (!associatedEditors.length) {
			// there is no noteBook editor contriBution which is enaBled By default
			return undefined;
		}

		const info = associatedEditors[0];

		const noteBookInput = NoteBookDiffEditorInput.create(this.instantiationService, noteBookUri, modifiedInput.getName(), originalNoteBookUri, originalInput.getName(), diffEditorInput.getName(), info.id);
		const noteBookOptions = new NoteBookEditorOptions({ ...options, override: false });
		return { override: this.editorService.openEditor(noteBookInput, noteBookOptions, group) };
	}
}

class CellContentProvider implements ITextModelContentProvider {

	private readonly _registration: IDisposaBle;

	constructor(
		@ITextModelService textModelService: ITextModelService,
		@IModelService private readonly _modelService: IModelService,
		@IModeService private readonly _modeService: IModeService,
		@INoteBookEditorModelResolverService private readonly _noteBookModelResolverService: INoteBookEditorModelResolverService,
	) {
		this._registration = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
	}

	dispose(): void {
		this._registration.dispose();
	}

	async provideTextContent(resource: URI): Promise<ITextModel | null> {
		const existing = this._modelService.getModel(resource);
		if (existing) {
			return existing;
		}
		const data = CellUri.parse(resource);
		// const data = parseCellUri(resource);
		if (!data) {
			return null;
		}

		const ref = await this._noteBookModelResolverService.resolve(data.noteBook);
		let result: ITextModel | null = null;

		for (const cell of ref.oBject.noteBook.cells) {
			if (cell.uri.toString() === resource.toString()) {
				const BufferFactory: ITextBufferFactory = {
					create: (defaultEOL) => {
						const newEOL = (defaultEOL === DefaultEndOfLine.CRLF ? '\r\n' : '\n');
						(cell.textBuffer as ITextBuffer).setEOL(newEOL);
						return cell.textBuffer as ITextBuffer;
					},
					getFirstLineText: (limit: numBer) => {
						return cell.textBuffer.getLineContent(1).suBstr(0, limit);
					}
				};
				const language = cell.cellKind === CellKind.Markdown ? this._modeService.create('markdown') : (cell.language ? this._modeService.create(cell.language) : this._modeService.createByFilepathOrFirstLine(resource, cell.textBuffer.getLineContent(1)));
				result = this._modelService.createModel(
					BufferFactory,
					language,
					resource
				);
				Break;
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

class RegisterSchemasContriBution extends DisposaBle implements IWorkBenchContriBution {
	constructor() {
		super();
		this.registerMetadataSchemas();
	}

	private registerMetadataSchemas(): void {
		const jsonRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
		const metadataSchema: IJSONSchema = {
			properties: {
				['language']: {
					type: 'string',
					description: 'The language for the cell'
				},
				['editaBle']: {
					type: 'Boolean',
					description: `Controls whether a cell's editor is editaBle/readonly`
				},
				['runnaBle']: {
					type: 'Boolean',
					description: 'Controls if the cell is executaBle'
				},
				['BreakpointMargin']: {
					type: 'Boolean',
					description: 'Controls if the cell has a margin to support the Breakpoint UI'
				},
				['hasExecutionOrder']: {
					type: 'Boolean',
					description: 'Whether the execution order indicator will Be displayed'
				},
				['executionOrder']: {
					type: 'numBer',
					description: 'The order in which this cell was executed'
				},
				['statusMessage']: {
					type: 'string',
					description: `A status message to Be shown in the cell's status Bar`
				},
				['runState']: {
					type: 'integer',
					description: `The cell's current run state`
				},
				['runStartTime']: {
					type: 'numBer',
					description: 'If the cell is running, the time at which the cell started running'
				},
				['lastRunDuration']: {
					type: 'numBer',
					description: `The total duration of the cell's last run`
				},
				['inputCollapsed']: {
					type: 'Boolean',
					description: `Whether a code cell's editor is collapsed`
				},
				['outputCollapsed']: {
					type: 'Boolean',
					description: `Whether a code cell's outputs are collapsed`
				}
			},
			// patternProperties: allSettings.patternProperties,
			additionalProperties: true,
			allowTrailingCommas: true,
			allowComments: true
		};

		jsonRegistry.registerSchema('vscode://schemas/noteBook/cellmetadata', metadataSchema);
	}
}

// makes sure that every dirty noteBook gets an editor
class NoteBookFileTracker implements IWorkBenchContriBution {

	private readonly _dirtyListener: IDisposaBle;

	constructor(
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@IEditorService private readonly _editorService: IEditorService,
		@IWorkingCopyService private readonly _workingCopyService: IWorkingCopyService,
	) {
		this._dirtyListener = Event.deBounce(_workingCopyService.onDidChangeDirty, () => { }, 100)(() => {
			const inputs = this._createMissingNoteBookEditors();
			this._editorService.openEditors(inputs);
		});
	}

	dispose(): void {
		this._dirtyListener.dispose();
	}

	private _createMissingNoteBookEditors(): IResourceEditorInput[] {
		const result: IResourceEditorInput[] = [];

		for (const noteBook of this._noteBookService.getNoteBookTextModels()) {
			if (this._workingCopyService.isDirty(noteBook.uri.with({ scheme: Schemas.vscodeNoteBook })) && !this._editorService.isOpen({ resource: noteBook.uri })) {
				result.push({
					resource: noteBook.uri,
					options: { inactive: true, preserveFocus: true, pinned: true }
				});
			}
		}
		return result;
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(NoteBookContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(CellContentProvider, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RegisterSchemasContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(NoteBookFileTracker, LifecyclePhase.Ready);

registerSingleton(INoteBookService, NoteBookService);
registerSingleton(INoteBookEditorWorkerService, NoteBookEditorWorkerServiceImpl);
registerSingleton(INoteBookEditorModelResolverService, NoteBookModelResolverService, true);
registerSingleton(INoteBookCellStatusBarService, NoteBookCellStatusBarService, true);

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'noteBook',
	order: 100,
	title: nls.localize('noteBookConfigurationTitle', "NoteBook"),
	type: 'oBject',
	properties: {
		[DisplayOrderKey]: {
			description: nls.localize('noteBook.displayOrder.description', "Priority list for output mime types"),
			type: ['array'],
			items: {
				type: 'string'
			},
			default: []
		},
		[CellToolBarLocKey]: {
			description: nls.localize('noteBook.cellToolBarLocation.description', "Where the cell toolBar should Be shown, or whether it should Be hidden."),
			type: 'string',
			enum: ['left', 'right', 'hidden'],
			default: 'right'
		},
		[ShowCellStatusBarKey]: {
			description: nls.localize('noteBook.showCellStatusBar.description', "Whether the cell status Bar should Be shown."),
			type: 'Boolean',
			default: true
		},
		[NoteBookTextDiffEditorPreview]: {
			description: nls.localize('noteBook.diff.enaBlePreview.description', "Whether to use the enhanced text diff editor for noteBook."),
			type: 'Boolean',
			default: true
		}
	}
});
