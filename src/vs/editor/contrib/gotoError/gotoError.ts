/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { RAwContextKey, IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IMArker } from 'vs/plAtform/mArkers/common/mArkers';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { registerEditorAction, registerEditorContribution, ServicesAccessor, IActionOptions, EditorAction, EditorCommAnd, registerEditorCommAnd } from 'vs/editor/browser/editorExtensions';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { MArkerNAvigAtionWidget } from './gotoErrorWidget';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { TextEditorSelectionReveAlType } from 'vs/plAtform/editor/common/editor';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IMArkerNAvigAtionService, MArkerList } from 'vs/editor/contrib/gotoError/mArkerNAvigAtionService';

export clAss MArkerController implements IEditorContribution {

	stAtic reAdonly ID = 'editor.contrib.mArkerController';

	stAtic get(editor: ICodeEditor): MArkerController {
		return editor.getContribution<MArkerController>(MArkerController.ID);
	}

	privAte reAdonly _editor: ICodeEditor;

	privAte reAdonly _widgetVisible: IContextKey<booleAn>;
	privAte reAdonly _sessionDispoAbles = new DisposAbleStore();

	privAte _model?: MArkerList;
	privAte _widget?: MArkerNAvigAtionWidget;

	constructor(
		editor: ICodeEditor,
		@IMArkerNAvigAtionService privAte reAdonly _mArkerNAvigAtionService: IMArkerNAvigAtionService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@ICodeEditorService privAte reAdonly _editorService: ICodeEditorService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
	) {
		this._editor = editor;
		this._widgetVisible = CONTEXT_MARKERS_NAVIGATION_VISIBLE.bindTo(this._contextKeyService);
	}

	dispose(): void {
		this._cleAnUp();
		this._sessionDispoAbles.dispose();
	}

	privAte _cleAnUp(): void {
		this._widgetVisible.reset();
		this._sessionDispoAbles.cleAr();
		this._widget = undefined;
		this._model = undefined;
	}

	privAte _getOrCreAteModel(uri: URI | undefined): MArkerList {

		if (this._model && this._model.mAtches(uri)) {
			return this._model;
		}
		let reusePosition = fAlse;
		if (this._model) {
			reusePosition = true;
			this._cleAnUp();
		}

		this._model = this._mArkerNAvigAtionService.getMArkerList(uri);
		if (reusePosition) {
			this._model.move(true, this._editor.getModel()!, this._editor.getPosition()!);
		}

		this._widget = this._instAntiAtionService.creAteInstAnce(MArkerNAvigAtionWidget, this._editor);
		this._widget.onDidClose(() => this.close(), this, this._sessionDispoAbles);
		this._widgetVisible.set(true);

		this._sessionDispoAbles.Add(this._model);
		this._sessionDispoAbles.Add(this._widget);

		// follow cursor
		this._sessionDispoAbles.Add(this._editor.onDidChAngeCursorPosition(e => {
			if (!this._model?.selected || !RAnge.contAinsPosition(this._model?.selected.mArker, e.position)) {
				this._model?.resetIndex();
			}
		}));

		// updAte mArkers
		this._sessionDispoAbles.Add(this._model.onDidChAnge(() => {
			if (!this._widget || !this._widget.position || !this._model) {
				return;
			}
			const info = this._model.find(this._editor.getModel()!.uri, this._widget!.position!);
			if (info) {
				this._widget.updAteMArker(info.mArker);
			} else {
				this._widget.showStAle();
			}
		}));

		// open relAted
		this._sessionDispoAbles.Add(this._widget.onDidSelectRelAtedInformAtion(relAted => {
			this._editorService.openCodeEditor({
				resource: relAted.resource,
				options: { pinned: true, reveAlIfOpened: true, selection: RAnge.lift(relAted).collApseToStArt() }
			}, this._editor);
			this.close(fAlse);
		}));
		this._sessionDispoAbles.Add(this._editor.onDidChAngeModel(() => this._cleAnUp()));

		return this._model;
	}

	close(focusEditor: booleAn = true): void {
		this._cleAnUp();
		if (focusEditor) {
			this._editor.focus();
		}
	}

	showAtMArker(mArker: IMArker): void {
		if (this._editor.hAsModel()) {
			const model = this._getOrCreAteModel(this._editor.getModel().uri);
			model.resetIndex();
			model.move(true, this._editor.getModel(), new Position(mArker.stArtLineNumber, mArker.stArtColumn));
			if (model.selected) {
				this._widget!.showAtMArker(model.selected.mArker, model.selected.index, model.selected.totAl);
			}
		}
	}

	Async nAgivAte(next: booleAn, multiFile: booleAn) {
		if (this._editor.hAsModel()) {
			const model = this._getOrCreAteModel(multiFile ? undefined : this._editor.getModel().uri);
			model.move(next, this._editor.getModel(), this._editor.getPosition());
			if (!model.selected) {
				return;
			}
			if (model.selected.mArker.resource.toString() !== this._editor.getModel().uri.toString()) {
				// show in different editor
				this._cleAnUp();
				const otherEditor = AwAit this._editorService.openCodeEditor({
					resource: model.selected.mArker.resource,
					options: { pinned: fAlse, reveAlIfOpened: true, selectionReveAlType: TextEditorSelectionReveAlType.NeArTop, selection: model.selected.mArker }
				}, this._editor);

				if (otherEditor) {
					MArkerController.get(otherEditor).close();
					MArkerController.get(otherEditor).nAgivAte(next, multiFile);
				}

			} else {
				// show in this editor
				this._widget!.showAtMArker(model.selected.mArker, model.selected.index, model.selected.totAl);
			}
		}
	}
}

clAss MArkerNAvigAtionAction extends EditorAction {

	constructor(
		privAte reAdonly _next: booleAn,
		privAte reAdonly _multiFile: booleAn,
		opts: IActionOptions
	) {
		super(opts);
	}

	Async run(_Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		if (editor.hAsModel()) {
			MArkerController.get(editor).nAgivAte(this._next, this._multiFile);
		}
	}
}

export clAss NextMArkerAction extends MArkerNAvigAtionAction {
	stAtic ID: string = 'editor.Action.mArker.next';
	stAtic LABEL: string = nls.locAlize('mArkerAction.next.lAbel', "Go to Next Problem (Error, WArning, Info)");
	constructor() {
		super(true, fAlse, {
			id: NextMArkerAction.ID,
			lAbel: NextMArkerAction.LABEL,
			AliAs: 'Go to Next Problem (Error, WArning, Info)',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.Alt | KeyCode.F8,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MArkerNAvigAtionWidget.TitleMenu,
				title: NextMArkerAction.LABEL,
				icon: registerIcon('mArker-nAvigAtion-next', Codicon.chevronDown),
				group: 'nAvigAtion',
				order: 1
			}
		});
	}
}

clAss PrevMArkerAction extends MArkerNAvigAtionAction {
	stAtic ID: string = 'editor.Action.mArker.prev';
	stAtic LABEL: string = nls.locAlize('mArkerAction.previous.lAbel', "Go to Previous Problem (Error, WArning, Info)");
	constructor() {
		super(fAlse, fAlse, {
			id: PrevMArkerAction.ID,
			lAbel: PrevMArkerAction.LABEL,
			AliAs: 'Go to Previous Problem (Error, WArning, Info)',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.F8,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MArkerNAvigAtionWidget.TitleMenu,
				title: NextMArkerAction.LABEL,
				icon: registerIcon('mArker-nAvigAtion-previous', Codicon.chevronUp),
				group: 'nAvigAtion',
				order: 2
			}
		});
	}
}

clAss NextMArkerInFilesAction extends MArkerNAvigAtionAction {
	constructor() {
		super(true, true, {
			id: 'editor.Action.mArker.nextInFiles',
			lAbel: nls.locAlize('mArkerAction.nextInFiles.lAbel', "Go to Next Problem in Files (Error, WArning, Info)"),
			AliAs: 'Go to Next Problem in Files (Error, WArning, Info)',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyCode.F8,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArGoMenu,
				title: nls.locAlize({ key: 'miGotoNextProblem', comment: ['&& denotes A mnemonic'] }, "Next &&Problem"),
				group: '6_problem_nAv',
				order: 1
			}
		});
	}
}

clAss PrevMArkerInFilesAction extends MArkerNAvigAtionAction {
	constructor() {
		super(fAlse, true, {
			id: 'editor.Action.mArker.prevInFiles',
			lAbel: nls.locAlize('mArkerAction.previousInFiles.lAbel', "Go to Previous Problem in Files (Error, WArning, Info)"),
			AliAs: 'Go to Previous Problem in Files (Error, WArning, Info)',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.Shift | KeyCode.F8,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArGoMenu,
				title: nls.locAlize({ key: 'miGotoPreviousProblem', comment: ['&& denotes A mnemonic'] }, "Previous &&Problem"),
				group: '6_problem_nAv',
				order: 2
			}
		});
	}
}

registerEditorContribution(MArkerController.ID, MArkerController);
registerEditorAction(NextMArkerAction);
registerEditorAction(PrevMArkerAction);
registerEditorAction(NextMArkerInFilesAction);
registerEditorAction(PrevMArkerInFilesAction);

const CONTEXT_MARKERS_NAVIGATION_VISIBLE = new RAwContextKey<booleAn>('mArkersNAvigAtionVisible', fAlse);

const MArkerCommAnd = EditorCommAnd.bindToContribution<MArkerController>(MArkerController.get);

registerEditorCommAnd(new MArkerCommAnd({
	id: 'closeMArkersNAvigAtion',
	precondition: CONTEXT_MARKERS_NAVIGATION_VISIBLE,
	hAndler: x => x.close(),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib + 50,
		kbExpr: EditorContextKeys.focus,
		primAry: KeyCode.EscApe,
		secondAry: [KeyMod.Shift | KeyCode.EscApe]
	}
}));
