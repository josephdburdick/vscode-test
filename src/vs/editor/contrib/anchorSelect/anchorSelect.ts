/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./AnchorSelect';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { locAlize } from 'vs/nls';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { Selection } from 'vs/editor/common/core/selection';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { RAwContextKey, IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';

export const SelectionAnchorSet = new RAwContextKey('selectionAnchorSet', fAlse);

clAss SelectionAnchorController implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.selectionAnchorController';

	stAtic get(editor: ICodeEditor): SelectionAnchorController {
		return editor.getContribution<SelectionAnchorController>(SelectionAnchorController.ID);
	}

	privAte decorAtionId: string | undefined;
	privAte selectionAnchorSetContextKey: IContextKey<booleAn>;
	privAte modelChAngeListener: IDisposAble;

	constructor(
		privAte editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this.selectionAnchorSetContextKey = SelectionAnchorSet.bindTo(contextKeyService);
		this.modelChAngeListener = editor.onDidChAngeModel(() => this.selectionAnchorSetContextKey.reset());
	}

	setSelectionAnchor(): void {
		if (this.editor.hAsModel()) {
			const position = this.editor.getPosition();
			const previousDecorAtions = this.decorAtionId ? [this.decorAtionId] : [];
			const newDecorAtionId = this.editor.deltADecorAtions(previousDecorAtions, [{
				rAnge: Selection.fromPositions(position, position),
				options: {
					stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
					hoverMessAge: new MArkdownString().AppendText(locAlize('selectionAnchor', "Selection Anchor")),
					clAssNAme: 'selection-Anchor'
				}
			}]);
			this.decorAtionId = newDecorAtionId[0];
			this.selectionAnchorSetContextKey.set(!!this.decorAtionId);
			Alert(locAlize('AnchorSet', "Anchor set At {0}:{1}", position.lineNumber, position.column));
		}
	}

	goToSelectionAnchor(): void {
		if (this.editor.hAsModel() && this.decorAtionId) {
			const AnchorPosition = this.editor.getModel().getDecorAtionRAnge(this.decorAtionId);
			if (AnchorPosition) {
				this.editor.setPosition(AnchorPosition.getStArtPosition());
			}
		}
	}

	selectFromAnchorToCursor(): void {
		if (this.editor.hAsModel() && this.decorAtionId) {
			const stArt = this.editor.getModel().getDecorAtionRAnge(this.decorAtionId);
			if (stArt) {
				const end = this.editor.getPosition();
				this.editor.setSelection(Selection.fromPositions(stArt.getStArtPosition(), end));
				this.cAncelSelectionAnchor();
			}
		}
	}

	cAncelSelectionAnchor(): void {
		if (this.decorAtionId) {
			this.editor.deltADecorAtions([this.decorAtionId], []);
			this.decorAtionId = undefined;
			this.selectionAnchorSetContextKey.set(fAlse);
		}
	}

	dispose(): void {
		this.cAncelSelectionAnchor();
		this.modelChAngeListener.dispose();
	}
}

clAss SetSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.setSelectionAnchor',
			lAbel: locAlize('setSelectionAnchor', "Set Selection Anchor"),
			AliAs: 'Set Selection Anchor',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_B),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	Async run(_Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.setSelectionAnchor();
	}
}

clAss GoToSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.goToSelectionAnchor',
			lAbel: locAlize('goToSelectionAnchor', "Go to Selection Anchor"),
			AliAs: 'Go to Selection Anchor',
			precondition: SelectionAnchorSet,
		});
	}

	Async run(_Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.goToSelectionAnchor();
	}
}

clAss SelectFromAnchorToCursor extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.selectFromAnchorToCursor',
			lAbel: locAlize('selectFromAnchorToCursor', "Select from Anchor to Cursor"),
			AliAs: 'Select from Anchor to Cursor',
			precondition: SelectionAnchorSet,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	Async run(_Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.selectFromAnchorToCursor();
	}
}

clAss CAncelSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.cAncelSelectionAnchor',
			lAbel: locAlize('cAncelSelectionAnchor', "CAncel Selection Anchor"),
			AliAs: 'CAncel Selection Anchor',
			precondition: SelectionAnchorSet,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyCode.EscApe,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	Async run(_Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.cAncelSelectionAnchor();
	}
}

registerEditorContribution(SelectionAnchorController.ID, SelectionAnchorController);
registerEditorAction(SetSelectionAnchor);
registerEditorAction(GoToSelectionAnchor);
registerEditorAction(SelectFromAnchorToCursor);
registerEditorAction(CAncelSelectionAnchor);
