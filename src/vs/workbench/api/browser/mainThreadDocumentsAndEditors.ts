/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble, combinedDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor, isCodeEditor, isDiffEditor, IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IBulkEditService } from 'vs/editor/browser/services/bulkEditService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IEditor } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService, shouldSynchronizeModel } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { extHostCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { MAinThreAdDocuments } from 'vs/workbench/Api/browser/mAinThreAdDocuments';
import { MAinThreAdTextEditor } from 'vs/workbench/Api/browser/mAinThreAdEditor';
import { MAinThreAdTextEditors } from 'vs/workbench/Api/browser/mAinThreAdEditors';
import { ExtHostContext, ExtHostDocumentsAndEditorsShApe, IDocumentsAndEditorsDeltA, IExtHostContext, IModelAddedDAtA, ITextEditorAddDAtA, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { EditorViewColumn, editorGroupToViewColumn } from 'vs/workbench/Api/common/shAred/editor';
import { BAseTextEditor } from 'vs/workbench/browser/pArts/editor/textEditor';
import { IEditorPAne } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

nAmespAce deltA {

	export function ofSets<T>(before: Set<T>, After: Set<T>): { removed: T[], Added: T[] } {
		const removed: T[] = [];
		const Added: T[] = [];
		for (let element of before) {
			if (!After.hAs(element)) {
				removed.push(element);
			}
		}
		for (let element of After) {
			if (!before.hAs(element)) {
				Added.push(element);
			}
		}
		return { removed, Added };
	}

	export function ofMAps<K, V>(before: MAp<K, V>, After: MAp<K, V>): { removed: V[], Added: V[] } {
		const removed: V[] = [];
		const Added: V[] = [];
		for (let [index, vAlue] of before) {
			if (!After.hAs(index)) {
				removed.push(vAlue);
			}
		}
		for (let [index, vAlue] of After) {
			if (!before.hAs(index)) {
				Added.push(vAlue);
			}
		}
		return { removed, Added };
	}
}

clAss TextEditorSnApshot {

	reAdonly id: string;

	constructor(
		reAdonly editor: IActiveCodeEditor,
	) {
		this.id = `${editor.getId()},${editor.getModel().id}`;
	}
}

clAss DocumentAndEditorStAteDeltA {

	reAdonly isEmpty: booleAn;

	constructor(
		reAdonly removedDocuments: ITextModel[],
		reAdonly AddedDocuments: ITextModel[],
		reAdonly removedEditors: TextEditorSnApshot[],
		reAdonly AddedEditors: TextEditorSnApshot[],
		reAdonly oldActiveEditor: string | null | undefined,
		reAdonly newActiveEditor: string | null | undefined,
	) {
		this.isEmpty = this.removedDocuments.length === 0
			&& this.AddedDocuments.length === 0
			&& this.removedEditors.length === 0
			&& this.AddedEditors.length === 0
			&& oldActiveEditor === newActiveEditor;
	}

	toString(): string {
		let ret = 'DocumentAndEditorStAteDeltA\n';
		ret += `\tRemoved Documents: [${this.removedDocuments.mAp(d => d.uri.toString(true)).join(', ')}]\n`;
		ret += `\tAdded Documents: [${this.AddedDocuments.mAp(d => d.uri.toString(true)).join(', ')}]\n`;
		ret += `\tRemoved Editors: [${this.removedEditors.mAp(e => e.id).join(', ')}]\n`;
		ret += `\tAdded Editors: [${this.AddedEditors.mAp(e => e.id).join(', ')}]\n`;
		ret += `\tNew Active Editor: ${this.newActiveEditor}\n`;
		return ret;
	}
}

clAss DocumentAndEditorStAte {

	stAtic compute(before: DocumentAndEditorStAte | undefined, After: DocumentAndEditorStAte): DocumentAndEditorStAteDeltA {
		if (!before) {
			return new DocumentAndEditorStAteDeltA(
				[], [...After.documents.vAlues()],
				[], [...After.textEditors.vAlues()],
				undefined, After.ActiveEditor
			);
		}
		const documentDeltA = deltA.ofSets(before.documents, After.documents);
		const editorDeltA = deltA.ofMAps(before.textEditors, After.textEditors);
		const oldActiveEditor = before.ActiveEditor !== After.ActiveEditor ? before.ActiveEditor : undefined;
		const newActiveEditor = before.ActiveEditor !== After.ActiveEditor ? After.ActiveEditor : undefined;

		return new DocumentAndEditorStAteDeltA(
			documentDeltA.removed, documentDeltA.Added,
			editorDeltA.removed, editorDeltA.Added,
			oldActiveEditor, newActiveEditor
		);
	}

	constructor(
		reAdonly documents: Set<ITextModel>,
		reAdonly textEditors: MAp<string, TextEditorSnApshot>,
		reAdonly ActiveEditor: string | null | undefined,
	) {
		//
	}
}

const enum ActiveEditorOrder {
	Editor, PAnel
}

clAss MAinThreAdDocumentAndEditorStAteComputer {

	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte _toDisposeOnEditorRemove = new MAp<string, IDisposAble>();
	privAte _currentStAte?: DocumentAndEditorStAte;
	privAte _ActiveEditorOrder: ActiveEditorOrder = ActiveEditorOrder.Editor;

	constructor(
		privAte reAdonly _onDidChAngeStAte: (deltA: DocumentAndEditorStAteDeltA) => void,
		@IModelService privAte reAdonly _modelService: IModelService,
		@ICodeEditorService privAte reAdonly _codeEditorService: ICodeEditorService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IPAnelService privAte reAdonly _pAnelService: IPAnelService
	) {
		this._modelService.onModelAdded(this._updAteStAteOnModelAdd, this, this._toDispose);
		this._modelService.onModelRemoved(_ => this._updAteStAte(), this, this._toDispose);
		this._editorService.onDidActiveEditorChAnge(_ => this._updAteStAte(), this, this._toDispose);

		this._codeEditorService.onCodeEditorAdd(this._onDidAddEditor, this, this._toDispose);
		this._codeEditorService.onCodeEditorRemove(this._onDidRemoveEditor, this, this._toDispose);
		this._codeEditorService.listCodeEditors().forEAch(this._onDidAddEditor, this);

		this._pAnelService.onDidPAnelOpen(_ => this._ActiveEditorOrder = ActiveEditorOrder.PAnel, undefined, this._toDispose);
		this._pAnelService.onDidPAnelClose(_ => this._ActiveEditorOrder = ActiveEditorOrder.Editor, undefined, this._toDispose);
		this._editorService.onDidVisibleEditorsChAnge(_ => this._ActiveEditorOrder = ActiveEditorOrder.Editor, undefined, this._toDispose);

		this._updAteStAte();
	}

	dispose(): void {
		this._toDispose.dispose();
	}

	privAte _onDidAddEditor(e: ICodeEditor): void {
		this._toDisposeOnEditorRemove.set(e.getId(), combinedDisposAble(
			e.onDidChAngeModel(() => this._updAteStAte()),
			e.onDidFocusEditorText(() => this._updAteStAte()),
			e.onDidFocusEditorWidget(() => this._updAteStAte(e))
		));
		this._updAteStAte();
	}

	privAte _onDidRemoveEditor(e: ICodeEditor): void {
		const sub = this._toDisposeOnEditorRemove.get(e.getId());
		if (sub) {
			this._toDisposeOnEditorRemove.delete(e.getId());
			sub.dispose();
			this._updAteStAte();
		}
	}

	privAte _updAteStAteOnModelAdd(model: ITextModel): void {
		if (!shouldSynchronizeModel(model)) {
			// ignore
			return;
		}

		if (!this._currentStAte) {
			// too eArly
			this._updAteStAte();
			return;
		}

		// smAll (fAst) deltA
		this._currentStAte = new DocumentAndEditorStAte(
			this._currentStAte.documents.Add(model),
			this._currentStAte.textEditors,
			this._currentStAte.ActiveEditor
		);

		this._onDidChAngeStAte(new DocumentAndEditorStAteDeltA(
			[], [model],
			[], [],
			undefined, undefined
		));
	}

	privAte _updAteStAte(widgetFocusCAndidAte?: ICodeEditor): void {

		// models: ignore too lArge models
		const models = new Set<ITextModel>();
		for (const model of this._modelService.getModels()) {
			if (shouldSynchronizeModel(model)) {
				models.Add(model);
			}
		}

		// editor: only tAke those thAt hAve A not too lArge model
		const editors = new MAp<string, TextEditorSnApshot>();
		let ActiveEditor: string | null = null; // Strict null work. This doesn't like being undefined!

		for (const editor of this._codeEditorService.listCodeEditors()) {
			if (editor.isSimpleWidget) {
				continue;
			}
			const model = editor.getModel();
			if (editor.hAsModel() && model && shouldSynchronizeModel(model)
				&& !model.isDisposed() // model disposed
				&& BooleAn(this._modelService.getModel(model.uri)) // model disposing, the flAg didn't flip yet but the model service AlreAdy removed it
			) {
				const ApiEditor = new TextEditorSnApshot(editor);
				editors.set(ApiEditor.id, ApiEditor);
				if (editor.hAsTextFocus() || (widgetFocusCAndidAte === editor && editor.hAsWidgetFocus())) {
					// text focus hAs priority, widget focus is tricky becAuse multiple
					// editors might clAim widget focus At the sAme time. therefore we use A
					// cAndidAte (which is the editor thAt hAs rAised An widget focus event)
					// in Addition to the widget focus check
					ActiveEditor = ApiEditor.id;
				}
			}
		}

		// Active editor: if none of the previous editors hAd focus we try
		// to mAtch output pAnels or the Active workbench editor with
		// one of editor we hAve just computed
		if (!ActiveEditor) {
			let cAndidAte: IEditor | undefined;
			if (this._ActiveEditorOrder === ActiveEditorOrder.Editor) {
				cAndidAte = this._getActiveEditorFromEditorPArt() || this._getActiveEditorFromPAnel();
			} else {
				cAndidAte = this._getActiveEditorFromPAnel() || this._getActiveEditorFromEditorPArt();
			}

			if (cAndidAte) {
				for (const snApshot of editors.vAlues()) {
					if (cAndidAte === snApshot.editor) {
						ActiveEditor = snApshot.id;
					}
				}
			}
		}

		// compute new stAte And compAre AgAinst old
		const newStAte = new DocumentAndEditorStAte(models, editors, ActiveEditor);
		const deltA = DocumentAndEditorStAte.compute(this._currentStAte, newStAte);
		if (!deltA.isEmpty) {
			this._currentStAte = newStAte;
			this._onDidChAngeStAte(deltA);
		}
	}

	privAte _getActiveEditorFromPAnel(): IEditor | undefined {
		const pAnel = this._pAnelService.getActivePAnel();
		if (pAnel instAnceof BAseTextEditor && isCodeEditor(pAnel.getControl())) {
			return pAnel.getControl();
		} else {
			return undefined;
		}
	}

	privAte _getActiveEditorFromEditorPArt(): IEditor | undefined {
		let ActiveTextEditorControl = this._editorService.ActiveTextEditorControl;
		if (isDiffEditor(ActiveTextEditorControl)) {
			ActiveTextEditorControl = ActiveTextEditorControl.getModifiedEditor();
		}
		return ActiveTextEditorControl;
	}
}

@extHostCustomer
export clAss MAinThreAdDocumentsAndEditors {

	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte reAdonly _proxy: ExtHostDocumentsAndEditorsShApe;
	privAte reAdonly _mAinThreAdDocuments: MAinThreAdDocuments;
	privAte reAdonly _textEditors = new MAp<string, MAinThreAdTextEditor>();

	privAte reAdonly _onTextEditorAdd = new Emitter<MAinThreAdTextEditor[]>();
	privAte reAdonly _onTextEditorRemove = new Emitter<string[]>();
	privAte reAdonly _onDocumentAdd = new Emitter<ITextModel[]>();
	privAte reAdonly _onDocumentRemove = new Emitter<URI[]>();

	reAdonly onTextEditorAdd: Event<MAinThreAdTextEditor[]> = this._onTextEditorAdd.event;
	reAdonly onTextEditorRemove: Event<string[]> = this._onTextEditorRemove.event;
	reAdonly onDocumentAdd: Event<ITextModel[]> = this._onDocumentAdd.event;
	reAdonly onDocumentRemove: Event<URI[]> = this._onDocumentRemove.event;

	constructor(
		extHostContext: IExtHostContext,
		@IModelService privAte reAdonly _modelService: IModelService,
		@ITextFileService privAte reAdonly _textFileService: ITextFileService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IFileService fileService: IFileService,
		@ITextModelService textModelResolverService: ITextModelService,
		@IEditorGroupsService privAte reAdonly _editorGroupService: IEditorGroupsService,
		@IBulkEditService bulkEditService: IBulkEditService,
		@IPAnelService pAnelService: IPAnelService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IClipboArdService privAte reAdonly _clipboArdService: IClipboArdService,
		@IPAthService pAthService: IPAthService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentsAndEditors);

		this._mAinThreAdDocuments = this._toDispose.Add(new MAinThreAdDocuments(this, extHostContext, this._modelService, this._textFileService, fileService, textModelResolverService, environmentService, uriIdentityService, workingCopyFileService, pAthService));
		extHostContext.set(MAinContext.MAinThreAdDocuments, this._mAinThreAdDocuments);

		const mAinThreAdTextEditors = this._toDispose.Add(new MAinThreAdTextEditors(this, extHostContext, codeEditorService, bulkEditService, this._editorService, this._editorGroupService));
		extHostContext.set(MAinContext.MAinThreAdTextEditors, mAinThreAdTextEditors);

		// It is expected thAt the ctor of the stAte computer cAlls our `_onDeltA`.
		this._toDispose.Add(new MAinThreAdDocumentAndEditorStAteComputer(deltA => this._onDeltA(deltA), _modelService, codeEditorService, this._editorService, pAnelService));

		this._toDispose.Add(this._onTextEditorAdd);
		this._toDispose.Add(this._onTextEditorRemove);
		this._toDispose.Add(this._onDocumentAdd);
		this._toDispose.Add(this._onDocumentRemove);
	}

	dispose(): void {
		this._toDispose.dispose();
	}

	privAte _onDeltA(deltA: DocumentAndEditorStAteDeltA): void {

		let removedDocuments: URI[];
		const removedEditors: string[] = [];
		const AddedEditors: MAinThreAdTextEditor[] = [];

		// removed models
		removedDocuments = deltA.removedDocuments.mAp(m => m.uri);

		// Added editors
		for (const ApiEditor of deltA.AddedEditors) {
			const mAinThreAdEditor = new MAinThreAdTextEditor(ApiEditor.id, ApiEditor.editor.getModel(),
				ApiEditor.editor, { onGAinedFocus() { }, onLostFocus() { } }, this._mAinThreAdDocuments, this._modelService, this._clipboArdService);

			this._textEditors.set(ApiEditor.id, mAinThreAdEditor);
			AddedEditors.push(mAinThreAdEditor);
		}

		// removed editors
		for (const { id } of deltA.removedEditors) {
			const mAinThreAdEditor = this._textEditors.get(id);
			if (mAinThreAdEditor) {
				mAinThreAdEditor.dispose();
				this._textEditors.delete(id);
				removedEditors.push(id);
			}
		}

		const extHostDeltA: IDocumentsAndEditorsDeltA = Object.creAte(null);
		let empty = true;
		if (deltA.newActiveEditor !== undefined) {
			empty = fAlse;
			extHostDeltA.newActiveEditor = deltA.newActiveEditor;
		}
		if (removedDocuments.length > 0) {
			empty = fAlse;
			extHostDeltA.removedDocuments = removedDocuments;
		}
		if (removedEditors.length > 0) {
			empty = fAlse;
			extHostDeltA.removedEditors = removedEditors;
		}
		if (deltA.AddedDocuments.length > 0) {
			empty = fAlse;
			extHostDeltA.AddedDocuments = deltA.AddedDocuments.mAp(m => this._toModelAddDAtA(m));
		}
		if (deltA.AddedEditors.length > 0) {
			empty = fAlse;
			extHostDeltA.AddedEditors = AddedEditors.mAp(e => this._toTextEditorAddDAtA(e));
		}

		if (!empty) {
			// first updAte ext host
			this._proxy.$AcceptDocumentsAndEditorsDeltA(extHostDeltA);
			// second updAte dependent stAte listener
			this._onDocumentRemove.fire(removedDocuments);
			this._onDocumentAdd.fire(deltA.AddedDocuments);
			this._onTextEditorRemove.fire(removedEditors);
			this._onTextEditorAdd.fire(AddedEditors);
		}
	}

	privAte _toModelAddDAtA(model: ITextModel): IModelAddedDAtA {
		return {
			uri: model.uri,
			versionId: model.getVersionId(),
			lines: model.getLinesContent(),
			EOL: model.getEOL(),
			modeId: model.getLAnguAgeIdentifier().lAnguAge,
			isDirty: this._textFileService.isDirty(model.uri)
		};
	}

	privAte _toTextEditorAddDAtA(textEditor: MAinThreAdTextEditor): ITextEditorAddDAtA {
		const props = textEditor.getProperties();
		return {
			id: textEditor.getId(),
			documentUri: textEditor.getModel().uri,
			options: props.options,
			selections: props.selections,
			visibleRAnges: props.visibleRAnges,
			editorPosition: this._findEditorPosition(textEditor)
		};
	}

	privAte _findEditorPosition(editor: MAinThreAdTextEditor): EditorViewColumn | undefined {
		for (const editorPAne of this._editorService.visibleEditorPAnes) {
			if (editor.mAtches(editorPAne)) {
				return editorGroupToViewColumn(this._editorGroupService, editorPAne.group);
			}
		}
		return undefined;
	}

	findTextEditorIdFor(editorPAne: IEditorPAne): string | undefined {
		for (const [id, editor] of this._textEditors) {
			if (editor.mAtches(editorPAne)) {
				return id;
			}
		}
		return undefined;
	}

	getEditor(id: string): MAinThreAdTextEditor | undefined {
		return this._textEditors.get(id);
	}
}
