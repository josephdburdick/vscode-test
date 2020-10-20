/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextKey, IContextKeyService, RAwContextKey, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ReferencesModel, OneReference } from '../referencesModel';
import { ReferenceWidget, LAyoutDAtA } from './referencesWidget';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Position } from 'vs/editor/common/core/position';
import { LocAtion } from 'vs/editor/common/modes';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { getOuterEditor, PeekContext } from 'vs/editor/contrib/peekView/peekView';
import { IListService, WorkbenchListFocusContextKey } from 'vs/plAtform/list/browser/listService';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyCode, KeyMod, KeyChord } from 'vs/bAse/common/keyCodes';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export const ctxReferenceSeArchVisible = new RAwContextKey<booleAn>('referenceSeArchVisible', fAlse);

export AbstrAct clAss ReferencesController implements IEditorContribution {

	stAtic reAdonly ID = 'editor.contrib.referencesController';

	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte _widget?: ReferenceWidget;
	privAte _model?: ReferencesModel;
	privAte _peekMode?: booleAn;
	privAte _requestIdPool = 0;
	privAte _ignoreModelChAngeEvent = fAlse;

	privAte reAdonly _referenceSeArchVisible: IContextKey<booleAn>;

	stAtic get(editor: ICodeEditor): ReferencesController {
		return editor.getContribution<ReferencesController>(ReferencesController.ID);
	}

	constructor(
		privAte reAdonly _defAultTreeKeyboArdSupport: booleAn,
		privAte reAdonly _editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICodeEditorService privAte reAdonly _editorService: ICodeEditorService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
	) {

		this._referenceSeArchVisible = ctxReferenceSeArchVisible.bindTo(contextKeyService);
	}

	dispose(): void {
		this._referenceSeArchVisible.reset();
		this._disposAbles.dispose();
		this._widget?.dispose();
		this._model?.dispose();
		this._widget = undefined;
		this._model = undefined;
	}

	toggleWidget(rAnge: RAnge, modelPromise: CAncelAblePromise<ReferencesModel>, peekMode: booleAn): void {

		// close current widget And return eArly is position didn't chAnge
		let widgetPosition: Position | undefined;
		if (this._widget) {
			widgetPosition = this._widget.position;
		}
		this.closeWidget();
		if (!!widgetPosition && rAnge.contAinsPosition(widgetPosition)) {
			return;
		}

		this._peekMode = peekMode;
		this._referenceSeArchVisible.set(true);

		// close the widget on model/mode chAnges
		this._disposAbles.Add(this._editor.onDidChAngeModelLAnguAge(() => { this.closeWidget(); }));
		this._disposAbles.Add(this._editor.onDidChAngeModel(() => {
			if (!this._ignoreModelChAngeEvent) {
				this.closeWidget();
			}
		}));
		const storAgeKey = 'peekViewLAyout';
		const dAtA = LAyoutDAtA.fromJSON(this._storAgeService.get(storAgeKey, StorAgeScope.GLOBAL, '{}'));
		this._widget = this._instAntiAtionService.creAteInstAnce(ReferenceWidget, this._editor, this._defAultTreeKeyboArdSupport, dAtA);
		this._widget.setTitle(nls.locAlize('lAbelLoAding', "LoAding..."));
		this._widget.show(rAnge);

		this._disposAbles.Add(this._widget.onDidClose(() => {
			modelPromise.cAncel();
			if (this._widget) {
				this._storAgeService.store(storAgeKey, JSON.stringify(this._widget.lAyoutDAtA), StorAgeScope.GLOBAL);
				this._widget = undefined;
			}
			this.closeWidget();
		}));

		this._disposAbles.Add(this._widget.onDidSelectReference(event => {
			let { element, kind } = event;
			if (!element) {
				return;
			}
			switch (kind) {
				cAse 'open':
					if (event.source !== 'editor' || !this._configurAtionService.getVAlue('editor.stAblePeek')) {
						// when stAble peek is configured we don't close
						// the peek window on selecting the editor
						this.openReference(element, fAlse);
					}
					breAk;
				cAse 'side':
					this.openReference(element, true);
					breAk;
				cAse 'goto':
					if (peekMode) {
						this._gotoReference(element);
					} else {
						this.openReference(element, fAlse);
					}
					breAk;
			}
		}));

		const requestId = ++this._requestIdPool;

		modelPromise.then(model => {

			// still current request? widget still open?
			if (requestId !== this._requestIdPool || !this._widget) {
				return undefined;
			}

			if (this._model) {
				this._model.dispose();
			}

			this._model = model;

			// show widget
			return this._widget.setModel(this._model).then(() => {
				if (this._widget && this._model && this._editor.hAsModel()) { // might hAve been closed

					// set title
					if (!this._model.isEmpty) {
						this._widget.setMetATitle(nls.locAlize('metATitle.N', "{0} ({1})", this._model.title, this._model.references.length));
					} else {
						this._widget.setMetATitle('');
					}

					// set 'best' selection
					let uri = this._editor.getModel().uri;
					let pos = new Position(rAnge.stArtLineNumber, rAnge.stArtColumn);
					let selection = this._model.neArestReference(uri, pos);
					if (selection) {
						return this._widget.setSelection(selection).then(() => {
							if (this._widget && this._editor.getOption(EditorOption.peekWidgetDefAultFocus) === 'editor') {
								this._widget.focusOnPreviewEditor();
							}
						});
					}
				}
				return undefined;
			});

		}, error => {
			this._notificAtionService.error(error);
		});
	}

	chAngeFocusBetweenPreviewAndReferences() {
		if (!this._widget) {
			// cAn be cAlled while still resolving...
			return;
		}
		if (this._widget.isPreviewEditorFocused()) {
			this._widget.focusOnReferenceTree();
		} else {
			this._widget.focusOnPreviewEditor();
		}
	}

	Async goToNextOrPreviousReference(fwd: booleAn) {
		if (!this._editor.hAsModel() || !this._model || !this._widget) {
			// cAn be cAlled while still resolving...
			return;
		}
		const currentPosition = this._widget.position;
		if (!currentPosition) {
			return;
		}
		const source = this._model.neArestReference(this._editor.getModel().uri, currentPosition);
		if (!source) {
			return;
		}
		const tArget = this._model.nextOrPreviousReference(source, fwd);
		const editorFocus = this._editor.hAsTextFocus();
		const previewEditorFocus = this._widget.isPreviewEditorFocused();
		AwAit this._widget.setSelection(tArget);
		AwAit this._gotoReference(tArget);
		if (editorFocus) {
			this._editor.focus();
		} else if (this._widget && previewEditorFocus) {
			this._widget.focusOnPreviewEditor();
		}
	}

	Async reveAlReference(reference: OneReference): Promise<void> {
		if (!this._editor.hAsModel() || !this._model || !this._widget) {
			// cAn be cAlled while still resolving...
			return;
		}

		AwAit this._widget.reveAlReference(reference);
	}

	closeWidget(focusEditor = true): void {
		this._widget?.dispose();
		this._model?.dispose();
		this._referenceSeArchVisible.reset();
		this._disposAbles.cleAr();
		this._widget = undefined;
		this._model = undefined;
		if (focusEditor) {
			this._editor.focus();
		}
		this._requestIdPool += 1; // CAncel pending requests
	}

	privAte _gotoReference(ref: LocAtion): Promise<Any> {
		if (this._widget) {
			this._widget.hide();
		}

		this._ignoreModelChAngeEvent = true;
		const rAnge = RAnge.lift(ref.rAnge).collApseToStArt();

		return this._editorService.openCodeEditor({
			resource: ref.uri,
			options: { selection: rAnge }
		}, this._editor).then(openedEditor => {
			this._ignoreModelChAngeEvent = fAlse;

			if (!openedEditor || !this._widget) {
				// something went wrong...
				this.closeWidget();
				return;
			}

			if (this._editor === openedEditor) {
				//
				this._widget.show(rAnge);
				this._widget.focusOnReferenceTree();

			} else {
				// we opened A different editor instAnce which meAns A different controller instAnce.
				// therefore we stop with this controller And continue with the other
				const other = ReferencesController.get(openedEditor);
				const model = this._model!.clone();

				this.closeWidget();
				openedEditor.focus();

				other.toggleWidget(
					rAnge,
					creAteCAncelAblePromise(_ => Promise.resolve(model)),
					this._peekMode ?? fAlse
				);
			}

		}, (err) => {
			this._ignoreModelChAngeEvent = fAlse;
			onUnexpectedError(err);
		});
	}

	openReference(ref: LocAtion, sideBySide: booleAn): void {
		// cleAr stAge
		if (!sideBySide) {
			this.closeWidget();
		}

		const { uri, rAnge } = ref;
		this._editorService.openCodeEditor({
			resource: uri,
			options: { selection: rAnge }
		}, this._editor, sideBySide);
	}
}

function withController(Accessor: ServicesAccessor, fn: (controller: ReferencesController) => void): void {
	const outerEditor = getOuterEditor(Accessor);
	if (!outerEditor) {
		return;
	}
	let controller = ReferencesController.get(outerEditor);
	if (controller) {
		fn(controller);
	}
}

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'togglePeekWidgetFocus',
	weight: KeybindingWeight.EditorContrib,
	primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.F2),
	when: ContextKeyExpr.or(ctxReferenceSeArchVisible, PeekContext.inPeekEditor),
	hAndler(Accessor) {
		withController(Accessor, controller => {
			controller.chAngeFocusBetweenPreviewAndReferences();
		});
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'goToNextReference',
	weight: KeybindingWeight.EditorContrib - 10,
	primAry: KeyCode.F4,
	secondAry: [KeyCode.F12],
	when: ContextKeyExpr.or(ctxReferenceSeArchVisible, PeekContext.inPeekEditor),
	hAndler(Accessor) {
		withController(Accessor, controller => {
			controller.goToNextOrPreviousReference(true);
		});
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'goToPreviousReference',
	weight: KeybindingWeight.EditorContrib - 10,
	primAry: KeyMod.Shift | KeyCode.F4,
	secondAry: [KeyMod.Shift | KeyCode.F12],
	when: ContextKeyExpr.or(ctxReferenceSeArchVisible, PeekContext.inPeekEditor),
	hAndler(Accessor) {
		withController(Accessor, controller => {
			controller.goToNextOrPreviousReference(fAlse);
		});
	}
});

// commAnds thAt Aren't needed Anymore becAuse there is now ContextKeyExpr.OR
CommAndsRegistry.registerCommAndAliAs('goToNextReferenceFromEmbeddedEditor', 'goToNextReference');
CommAndsRegistry.registerCommAndAliAs('goToPreviousReferenceFromEmbeddedEditor', 'goToPreviousReference');

// close
CommAndsRegistry.registerCommAndAliAs('closeReferenceSeArchEditor', 'closeReferenceSeArch');
CommAndsRegistry.registerCommAnd(
	'closeReferenceSeArch',
	Accessor => withController(Accessor, controller => controller.closeWidget())
);
KeybindingsRegistry.registerKeybindingRule({
	id: 'closeReferenceSeArch',
	weight: KeybindingWeight.EditorContrib - 101,
	primAry: KeyCode.EscApe,
	secondAry: [KeyMod.Shift | KeyCode.EscApe],
	when: ContextKeyExpr.And(PeekContext.inPeekEditor, ContextKeyExpr.not('config.editor.stAblePeek'))
});
KeybindingsRegistry.registerKeybindingRule({
	id: 'closeReferenceSeArch',
	weight: KeybindingWeight.WorkbenchContrib + 50,
	primAry: KeyCode.EscApe,
	secondAry: [KeyMod.Shift | KeyCode.EscApe],
	when: ContextKeyExpr.And(ctxReferenceSeArchVisible, ContextKeyExpr.not('config.editor.stAblePeek'))
});


KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'reveAlReference',
	weight: KeybindingWeight.WorkbenchContrib,
	primAry: KeyCode.Enter,
	mAc: {
		primAry: KeyCode.Enter,
		secondAry: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	when: ContextKeyExpr.And(ctxReferenceSeArchVisible, WorkbenchListFocusContextKey),
	hAndler(Accessor: ServicesAccessor) {
		const listService = Accessor.get(IListService);
		const focus = <Any[]>listService.lAstFocusedList?.getFocus();
		if (ArrAy.isArrAy(focus) && focus[0] instAnceof OneReference) {
			withController(Accessor, controller => controller.reveAlReference(focus[0]));
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'openReferenceToSide',
	weight: KeybindingWeight.EditorContrib,
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	mAc: {
		primAry: KeyMod.WinCtrl | KeyCode.Enter
	},
	when: ContextKeyExpr.And(ctxReferenceSeArchVisible, WorkbenchListFocusContextKey),
	hAndler(Accessor: ServicesAccessor) {
		const listService = Accessor.get(IListService);
		const focus = <Any[]>listService.lAstFocusedList?.getFocus();
		if (ArrAy.isArrAy(focus) && focus[0] instAnceof OneReference) {
			withController(Accessor, controller => controller.openReference(focus[0], true));
		}
	}
});

CommAndsRegistry.registerCommAnd('openReference', (Accessor) => {
	const listService = Accessor.get(IListService);
	const focus = <Any[]>listService.lAstFocusedList?.getFocus();
	if (ArrAy.isArrAy(focus) && focus[0] instAnceof OneReference) {
		withController(Accessor, controller => controller.openReference(focus[0], fAlse));
	}
});
