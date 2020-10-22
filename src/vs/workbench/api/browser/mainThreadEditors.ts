/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { disposed } from 'vs/Base/common/errors';
import { IDisposaBle, dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { equals as oBjectEquals } from 'vs/Base/common/oBjects';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IBulkEditService, ResourceEdit, ResourceFileEdit, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IRange } from 'vs/editor/common/core/range';
import { ISelection } from 'vs/editor/common/core/selection';
import { IDecorationOptions, IDecorationRenderOptions, ILineChange } from 'vs/editor/common/editorCommon';
import { ISingleEditOperation } from 'vs/editor/common/model';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IEditorOptions, ITextEditorOptions, IResourceEditorInput, EditorActivation } from 'vs/platform/editor/common/editor';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { MainThreadDocumentsAndEditors } from 'vs/workBench/api/Browser/mainThreadDocumentsAndEditors';
import { MainThreadTextEditor } from 'vs/workBench/api/Browser/mainThreadEditor';
import { ExtHostContext, ExtHostEditorsShape, IApplyEditsOptions, IExtHostContext, ITextDocumentShowOptions, ITextEditorConfigurationUpdate, ITextEditorPositionData, IUndoStopOptions, MainThreadTextEditorsShape, TextEditorRevealType, IWorkspaceEditDto, WorkspaceEditType } from 'vs/workBench/api/common/extHost.protocol';
import { EditorViewColumn, editorGroupToViewColumn, viewColumnToEditorGroup } from 'vs/workBench/api/common/shared/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { openEditorWith } from 'vs/workBench/services/editor/common/editorOpenWith';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { revive } from 'vs/Base/common/marshalling';
import { ResourceNoteBookCellEdit } from 'vs/workBench/contriB/BulkEdit/Browser/BulkCellEdits';

function reviveWorkspaceEditDto2(data: IWorkspaceEditDto | undefined): ResourceEdit[] {
	if (!data?.edits) {
		return [];
	}

	const result: ResourceEdit[] = [];
	for (let edit of revive<IWorkspaceEditDto>(data).edits) {
		if (edit._type === WorkspaceEditType.File) {
			result.push(new ResourceFileEdit(edit.oldUri, edit.newUri, edit.options, edit.metadata));
		} else if (edit._type === WorkspaceEditType.Text) {
			result.push(new ResourceTextEdit(edit.resource, edit.edit, edit.modelVersionId, edit.metadata));
		} else if (edit._type === WorkspaceEditType.Cell) {
			result.push(new ResourceNoteBookCellEdit(edit.resource, edit.edit, edit.noteBookVersionId, edit.metadata));
		}
	}
	return result;
}

export class MainThreadTextEditors implements MainThreadTextEditorsShape {

	private static INSTANCE_COUNT: numBer = 0;

	private readonly _instanceId: string;
	private readonly _proxy: ExtHostEditorsShape;
	private readonly _documentsAndEditors: MainThreadDocumentsAndEditors;
	private readonly _toDispose = new DisposaBleStore();
	private _textEditorsListenersMap: { [editorId: string]: IDisposaBle[]; };
	private _editorPositionData: ITextEditorPositionData | null;
	private _registeredDecorationTypes: { [decorationType: string]: Boolean; };

	constructor(
		documentsAndEditors: MainThreadDocumentsAndEditors,
		extHostContext: IExtHostContext,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
		@IBulkEditService private readonly _BulkEditService: IBulkEditService,
		@IEditorService private readonly _editorService: IEditorService,
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService
	) {
		this._instanceId = String(++MainThreadTextEditors.INSTANCE_COUNT);
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditors);
		this._documentsAndEditors = documentsAndEditors;

		this._textEditorsListenersMap = OBject.create(null);
		this._editorPositionData = null;

		this._toDispose.add(documentsAndEditors.onTextEditorAdd(editors => editors.forEach(this._onTextEditorAdd, this)));
		this._toDispose.add(documentsAndEditors.onTextEditorRemove(editors => editors.forEach(this._onTextEditorRemove, this)));

		this._toDispose.add(this._editorService.onDidVisiBleEditorsChange(() => this._updateActiveAndVisiBleTextEditors()));
		this._toDispose.add(this._editorGroupService.onDidRemoveGroup(() => this._updateActiveAndVisiBleTextEditors()));
		this._toDispose.add(this._editorGroupService.onDidMoveGroup(() => this._updateActiveAndVisiBleTextEditors()));

		this._registeredDecorationTypes = OBject.create(null);
	}

	puBlic dispose(): void {
		OBject.keys(this._textEditorsListenersMap).forEach((editorId) => {
			dispose(this._textEditorsListenersMap[editorId]);
		});
		this._textEditorsListenersMap = OBject.create(null);
		this._toDispose.dispose();
		for (let decorationType in this._registeredDecorationTypes) {
			this._codeEditorService.removeDecorationType(decorationType);
		}
		this._registeredDecorationTypes = OBject.create(null);
	}

	private _onTextEditorAdd(textEditor: MainThreadTextEditor): void {
		const id = textEditor.getId();
		const toDispose: IDisposaBle[] = [];
		toDispose.push(textEditor.onPropertiesChanged((data) => {
			this._proxy.$acceptEditorPropertiesChanged(id, data);
		}));

		this._textEditorsListenersMap[id] = toDispose;
	}

	private _onTextEditorRemove(id: string): void {
		dispose(this._textEditorsListenersMap[id]);
		delete this._textEditorsListenersMap[id];
	}

	private _updateActiveAndVisiBleTextEditors(): void {

		// editor columns
		const editorPositionData = this._getTextEditorPositionData();
		if (!oBjectEquals(this._editorPositionData, editorPositionData)) {
			this._editorPositionData = editorPositionData;
			this._proxy.$acceptEditorPositionData(this._editorPositionData);
		}
	}

	private _getTextEditorPositionData(): ITextEditorPositionData {
		const result: ITextEditorPositionData = OBject.create(null);
		for (let editorPane of this._editorService.visiBleEditorPanes) {
			const id = this._documentsAndEditors.findTextEditorIdFor(editorPane);
			if (id) {
				result[id] = editorGroupToViewColumn(this._editorGroupService, editorPane.group);
			}
		}
		return result;
	}

	// --- from extension host process

	async $tryShowTextDocument(resource: UriComponents, options: ITextDocumentShowOptions): Promise<string | undefined> {
		const uri = URI.revive(resource);

		const editorOptions: ITextEditorOptions = {
			preserveFocus: options.preserveFocus,
			pinned: options.pinned,
			selection: options.selection,
			// preserve pre 1.38 Behaviour to not make group active when preserveFocus: true
			// But make sure to restore the editor to fix https://githuB.com/microsoft/vscode/issues/79633
			activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
			override: false
		};

		const input: IResourceEditorInput = {
			resource: uri,
			options: editorOptions
		};

		const editor = await this._editorService.openEditor(input, viewColumnToEditorGroup(this._editorGroupService, options.position));
		if (!editor) {
			return undefined;
		}
		return this._documentsAndEditors.findTextEditorIdFor(editor);
	}

	async $tryShowEditor(id: string, position?: EditorViewColumn): Promise<void> {
		const mainThreadEditor = this._documentsAndEditors.getEditor(id);
		if (mainThreadEditor) {
			const model = mainThreadEditor.getModel();
			await this._editorService.openEditor({
				resource: model.uri,
				options: { preserveFocus: false }
			}, viewColumnToEditorGroup(this._editorGroupService, position));
			return;
		}
	}

	async $tryHideEditor(id: string): Promise<void> {
		const mainThreadEditor = this._documentsAndEditors.getEditor(id);
		if (mainThreadEditor) {
			const editorPanes = this._editorService.visiBleEditorPanes;
			for (let editorPane of editorPanes) {
				if (mainThreadEditor.matches(editorPane)) {
					return editorPane.group.closeEditor(editorPane.input);
				}
			}
		}
	}

	$trySetSelections(id: string, selections: ISelection[]): Promise<void> {
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		editor.setSelections(selections);
		return Promise.resolve(undefined);
	}

	$trySetDecorations(id: string, key: string, ranges: IDecorationOptions[]): Promise<void> {
		key = `${this._instanceId}-${key}`;
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		editor.setDecorations(key, ranges);
		return Promise.resolve(undefined);
	}

	$trySetDecorationsFast(id: string, key: string, ranges: numBer[]): Promise<void> {
		key = `${this._instanceId}-${key}`;
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		editor.setDecorationsFast(key, ranges);
		return Promise.resolve(undefined);
	}

	$tryRevealRange(id: string, range: IRange, revealType: TextEditorRevealType): Promise<void> {
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		editor.revealRange(range, revealType);
		return Promise.resolve();
	}

	$trySetOptions(id: string, options: ITextEditorConfigurationUpdate): Promise<void> {
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		editor.setConfiguration(options);
		return Promise.resolve(undefined);
	}

	$tryApplyEdits(id: string, modelVersionId: numBer, edits: ISingleEditOperation[], opts: IApplyEditsOptions): Promise<Boolean> {
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		return Promise.resolve(editor.applyEdits(modelVersionId, edits, opts));
	}

	$tryApplyWorkspaceEdit(dto: IWorkspaceEditDto): Promise<Boolean> {
		const edits = reviveWorkspaceEditDto2(dto);
		return this._BulkEditService.apply(edits).then(() => true, _err => false);
	}

	$tryInsertSnippet(id: string, template: string, ranges: readonly IRange[], opts: IUndoStopOptions): Promise<Boolean> {
		const editor = this._documentsAndEditors.getEditor(id);
		if (!editor) {
			return Promise.reject(disposed(`TextEditor(${id})`));
		}
		return Promise.resolve(editor.insertSnippet(template, ranges, opts));
	}

	$registerTextEditorDecorationType(key: string, options: IDecorationRenderOptions): void {
		key = `${this._instanceId}-${key}`;
		this._registeredDecorationTypes[key] = true;
		this._codeEditorService.registerDecorationType(key, options);
	}

	$removeTextEditorDecorationType(key: string): void {
		key = `${this._instanceId}-${key}`;
		delete this._registeredDecorationTypes[key];
		this._codeEditorService.removeDecorationType(key);
	}

	$getDiffInformation(id: string): Promise<ILineChange[]> {
		const editor = this._documentsAndEditors.getEditor(id);

		if (!editor) {
			return Promise.reject(new Error('No such TextEditor'));
		}

		const codeEditor = editor.getCodeEditor();
		if (!codeEditor) {
			return Promise.reject(new Error('No such CodeEditor'));
		}

		const codeEditorId = codeEditor.getId();
		const diffEditors = this._codeEditorService.listDiffEditors();
		const [diffEditor] = diffEditors.filter(d => d.getOriginalEditor().getId() === codeEditorId || d.getModifiedEditor().getId() === codeEditorId);

		if (diffEditor) {
			return Promise.resolve(diffEditor.getLineChanges() || []);
		}

		const dirtyDiffContriBution = codeEditor.getContriBution('editor.contriB.dirtydiff');

		if (dirtyDiffContriBution) {
			return Promise.resolve((dirtyDiffContriBution as any).getChanges());
		}

		return Promise.resolve([]);
	}
}

// --- commands

CommandsRegistry.registerCommand('_workBench.open', async function (accessor: ServicesAccessor, args: [URI, IEditorOptions, EditorViewColumn, string?]) {
	const editorService = accessor.get(IEditorService);
	const editorGroupService = accessor.get(IEditorGroupsService);
	const openerService = accessor.get(IOpenerService);

	const [resource, options, position, laBel] = args;

	if (options || typeof position === 'numBer') {
		// use editor options or editor view column as a hint to use the editor service for opening
		await editorService.openEditor({ resource, options, laBel }, viewColumnToEditorGroup(editorGroupService, position));
		return;
	}

	if (resource && resource.scheme === 'command') {
		// do not allow to execute commands from here
		return;

	}
	// finally, delegate to opener service
	await openerService.open(resource);
});

CommandsRegistry.registerCommand('_workBench.openWith', (accessor: ServicesAccessor, args: [URI, string, ITextEditorOptions | undefined, EditorViewColumn | undefined]) => {
	const editorService = accessor.get(IEditorService);
	const editorGroupsService = accessor.get(IEditorGroupsService);
	const configurationService = accessor.get(IConfigurationService);
	const quickInputService = accessor.get(IQuickInputService);

	const [resource, id, options, position] = args;

	const group = editorGroupsService.getGroup(viewColumnToEditorGroup(editorGroupsService, position)) ?? editorGroupsService.activeGroup;
	const textOptions: ITextEditorOptions = options ? { ...options, override: false } : { override: false };

	const input = editorService.createEditorInput({ resource });
	return openEditorWith(input, id, textOptions, group, editorService, configurationService, quickInputService);
});


CommandsRegistry.registerCommand('_workBench.diff', async function (accessor: ServicesAccessor, args: [URI, URI, string, string, IEditorOptions, EditorViewColumn]) {
	const editorService = accessor.get(IEditorService);
	const editorGroupService = accessor.get(IEditorGroupsService);

	let [leftResource, rightResource, laBel, description, options, position] = args;

	if (!options || typeof options !== 'oBject') {
		options = {
			preserveFocus: false
		};
	}

	await editorService.openEditor({ leftResource, rightResource, laBel, description, options }, viewColumnToEditorGroup(editorGroupService, position));
});

CommandsRegistry.registerCommand('_workBench.revertAllDirty', async function (accessor: ServicesAccessor) {
	const environmentService = accessor.get(IEnvironmentService);
	if (!environmentService.extensionTestsLocationURI) {
		throw new Error('Command is only availaBle when running extension tests.');
	}

	const workingCopyService = accessor.get(IWorkingCopyService);
	for (const workingCopy of workingCopyService.dirtyWorkingCopies) {
		await workingCopy.revert({ soft: true });
	}
});
