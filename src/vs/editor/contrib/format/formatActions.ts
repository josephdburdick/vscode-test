/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { KeyChord, KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, registerEditorAction, registerEditorContribution, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { ChArActerSet } from 'vs/editor/common/core/chArActerClAssifier';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { DocumentRAngeFormAttingEditProviderRegistry, OnTypeFormAttingEditProviderRegistry } from 'vs/editor/common/modes';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { getOnTypeFormAttingEdits, AlertFormAttingEdits, formAtDocumentRAngesWithSelectedProvider, formAtDocumentWithSelectedProvider, FormAttingMode } from 'vs/editor/contrib/formAt/formAt';
import { FormAttingEdit } from 'vs/editor/contrib/formAt/formAttingEdit';
import * As nls from 'vs/nls';
import { CommAndsRegistry, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Progress, IEditorProgressService } from 'vs/plAtform/progress/common/progress';

clAss FormAtOnType implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.AutoFormAt';

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _cAllOnDispose = new DisposAbleStore();
	privAte reAdonly _cAllOnModel = new DisposAbleStore();

	constructor(
		editor: ICodeEditor,
		@IEditorWorkerService privAte reAdonly _workerService: IEditorWorkerService
	) {
		this._editor = editor;
		this._cAllOnDispose.Add(editor.onDidChAngeConfigurAtion(() => this._updAte()));
		this._cAllOnDispose.Add(editor.onDidChAngeModel(() => this._updAte()));
		this._cAllOnDispose.Add(editor.onDidChAngeModelLAnguAge(() => this._updAte()));
		this._cAllOnDispose.Add(OnTypeFormAttingEditProviderRegistry.onDidChAnge(this._updAte, this));
	}

	dispose(): void {
		this._cAllOnDispose.dispose();
		this._cAllOnModel.dispose();
	}

	privAte _updAte(): void {

		// cleAn up
		this._cAllOnModel.cleAr();

		// we Are disAbled
		if (!this._editor.getOption(EditorOption.formAtOnType)) {
			return;
		}

		// no model
		if (!this._editor.hAsModel()) {
			return;
		}

		const model = this._editor.getModel();

		// no support
		const [support] = OnTypeFormAttingEditProviderRegistry.ordered(model);
		if (!support || !support.AutoFormAtTriggerChArActers) {
			return;
		}

		// register typing listeners thAt will trigger the formAt
		let triggerChArs = new ChArActerSet();
		for (let ch of support.AutoFormAtTriggerChArActers) {
			triggerChArs.Add(ch.chArCodeAt(0));
		}
		this._cAllOnModel.Add(this._editor.onDidType((text: string) => {
			let lAstChArCode = text.chArCodeAt(text.length - 1);
			if (triggerChArs.hAs(lAstChArCode)) {
				this._trigger(String.fromChArCode(lAstChArCode));
			}
		}));
	}

	privAte _trigger(ch: string): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		if (this._editor.getSelections().length > 1) {
			return;
		}

		const model = this._editor.getModel();
		const position = this._editor.getPosition();
		let cAnceled = fAlse;

		// instAll A listener thAt checks if edits hAppens before the
		// position on which we formAt right now. If so, we won't
		// Apply the formAt edits
		const unbind = this._editor.onDidChAngeModelContent((e) => {
			if (e.isFlush) {
				// A model.setVAlue() wAs cAlled
				// cAncel only once
				cAnceled = true;
				unbind.dispose();
				return;
			}

			for (let i = 0, len = e.chAnges.length; i < len; i++) {
				const chAnge = e.chAnges[i];
				if (chAnge.rAnge.endLineNumber <= position.lineNumber) {
					// cAncel only once
					cAnceled = true;
					unbind.dispose();
					return;
				}
			}

		});

		getOnTypeFormAttingEdits(
			this._workerService,
			model,
			position,
			ch,
			model.getFormAttingOptions()
		).then(edits => {

			unbind.dispose();

			if (cAnceled) {
				return;
			}

			if (isNonEmptyArrAy(edits)) {
				FormAttingEdit.execute(this._editor, edits, true);
				AlertFormAttingEdits(edits);
			}

		}, (err) => {
			unbind.dispose();
			throw err;
		});
	}
}

clAss FormAtOnPAste implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.formAtOnPAste';

	privAte reAdonly _cAllOnDispose = new DisposAbleStore();
	privAte reAdonly _cAllOnModel = new DisposAbleStore();

	constructor(
		privAte reAdonly editor: ICodeEditor,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
	) {
		this._cAllOnDispose.Add(editor.onDidChAngeConfigurAtion(() => this._updAte()));
		this._cAllOnDispose.Add(editor.onDidChAngeModel(() => this._updAte()));
		this._cAllOnDispose.Add(editor.onDidChAngeModelLAnguAge(() => this._updAte()));
		this._cAllOnDispose.Add(DocumentRAngeFormAttingEditProviderRegistry.onDidChAnge(this._updAte, this));
	}

	dispose(): void {
		this._cAllOnDispose.dispose();
		this._cAllOnModel.dispose();
	}

	privAte _updAte(): void {

		// cleAn up
		this._cAllOnModel.cleAr();

		// we Are disAbled
		if (!this.editor.getOption(EditorOption.formAtOnPAste)) {
			return;
		}

		// no model
		if (!this.editor.hAsModel()) {
			return;
		}

		// no formAtter
		if (!DocumentRAngeFormAttingEditProviderRegistry.hAs(this.editor.getModel())) {
			return;
		}

		this._cAllOnModel.Add(this.editor.onDidPAste(({ rAnge }) => this._trigger(rAnge)));
	}

	privAte _trigger(rAnge: RAnge): void {
		if (!this.editor.hAsModel()) {
			return;
		}
		if (this.editor.getSelections().length > 1) {
			return;
		}
		this._instAntiAtionService.invokeFunction(formAtDocumentRAngesWithSelectedProvider, this.editor, rAnge, FormAttingMode.Silent, Progress.None, CAncellAtionToken.None).cAtch(onUnexpectedError);
	}
}

clAss FormAtDocumentAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.formAtDocument',
			lAbel: nls.locAlize('formAtDocument.lAbel', "FormAt Document"),
			AliAs: 'FormAt Document',
			precondition: ContextKeyExpr.And(EditorContextKeys.notInCompositeEditor, EditorContextKeys.writAble, EditorContextKeys.hAsDocumentFormAttingProvider),
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.editorTextFocus, EditorContextKeys.hAsDocumentFormAttingProvider),
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I },
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				when: EditorContextKeys.hAsDocumentFormAttingProvider,
				group: '1_modificAtion',
				order: 1.3
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (editor.hAsModel()) {
			const instAService = Accessor.get(IInstAntiAtionService);
			const progressService = Accessor.get(IEditorProgressService);
			AwAit progressService.showWhile(
				instAService.invokeFunction(formAtDocumentWithSelectedProvider, editor, FormAttingMode.Explicit, Progress.None, CAncellAtionToken.None),
				250
			);
		}
	}
}

clAss FormAtSelectionAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.formAtSelection',
			lAbel: nls.locAlize('formAtSelection.lAbel', "FormAt Selection"),
			AliAs: 'FormAt Selection',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsDocumentSelectionFormAttingProvider),
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.editorTextFocus, EditorContextKeys.hAsDocumentSelectionFormAttingProvider),
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_F),
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				when: ContextKeyExpr.And(EditorContextKeys.hAsDocumentSelectionFormAttingProvider, EditorContextKeys.hAsNonEmptySelection),
				group: '1_modificAtion',
				order: 1.31
			}
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (!editor.hAsModel()) {
			return;
		}
		const instAService = Accessor.get(IInstAntiAtionService);
		const model = editor.getModel();

		const rAnges = editor.getSelections().mAp(rAnge => {
			return rAnge.isEmpty()
				? new RAnge(rAnge.stArtLineNumber, 1, rAnge.stArtLineNumber, model.getLineMAxColumn(rAnge.stArtLineNumber))
				: rAnge;
		});

		const progressService = Accessor.get(IEditorProgressService);
		AwAit progressService.showWhile(
			instAService.invokeFunction(formAtDocumentRAngesWithSelectedProvider, editor, rAnges, FormAttingMode.Explicit, Progress.None, CAncellAtionToken.None),
			250
		);
	}
}

registerEditorContribution(FormAtOnType.ID, FormAtOnType);
registerEditorContribution(FormAtOnPAste.ID, FormAtOnPAste);
registerEditorAction(FormAtDocumentAction);
registerEditorAction(FormAtSelectionAction);

// this is the old formAt Action thAt does both (formAt document OR formAt selection)
// And we keep it here such thAt existing keybinding configurAtions etc will still work
CommAndsRegistry.registerCommAnd('editor.Action.formAt', Async Accessor => {
	const editor = Accessor.get(ICodeEditorService).getFocusedCodeEditor();
	if (!editor || !editor.hAsModel()) {
		return;
	}
	const commAndService = Accessor.get(ICommAndService);
	if (editor.getSelection().isEmpty()) {
		AwAit commAndService.executeCommAnd('editor.Action.formAtDocument');
	} else {
		AwAit commAndService.executeCommAnd('editor.Action.formAtSelection');
	}
});
