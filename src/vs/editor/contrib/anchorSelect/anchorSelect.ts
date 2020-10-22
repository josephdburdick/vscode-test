/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./anchorSelect';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { localize } from 'vs/nls';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { Selection } from 'vs/editor/common/core/selection';
import { KeyMod, KeyCode, KeyChord } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { TrackedRangeStickiness } from 'vs/editor/common/model';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { alert } from 'vs/Base/Browser/ui/aria/aria';

export const SelectionAnchorSet = new RawContextKey('selectionAnchorSet', false);

class SelectionAnchorController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.selectionAnchorController';

	static get(editor: ICodeEditor): SelectionAnchorController {
		return editor.getContriBution<SelectionAnchorController>(SelectionAnchorController.ID);
	}

	private decorationId: string | undefined;
	private selectionAnchorSetContextKey: IContextKey<Boolean>;
	private modelChangeListener: IDisposaBle;

	constructor(
		private editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this.selectionAnchorSetContextKey = SelectionAnchorSet.BindTo(contextKeyService);
		this.modelChangeListener = editor.onDidChangeModel(() => this.selectionAnchorSetContextKey.reset());
	}

	setSelectionAnchor(): void {
		if (this.editor.hasModel()) {
			const position = this.editor.getPosition();
			const previousDecorations = this.decorationId ? [this.decorationId] : [];
			const newDecorationId = this.editor.deltaDecorations(previousDecorations, [{
				range: Selection.fromPositions(position, position),
				options: {
					stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
					hoverMessage: new MarkdownString().appendText(localize('selectionAnchor', "Selection Anchor")),
					className: 'selection-anchor'
				}
			}]);
			this.decorationId = newDecorationId[0];
			this.selectionAnchorSetContextKey.set(!!this.decorationId);
			alert(localize('anchorSet', "Anchor set at {0}:{1}", position.lineNumBer, position.column));
		}
	}

	goToSelectionAnchor(): void {
		if (this.editor.hasModel() && this.decorationId) {
			const anchorPosition = this.editor.getModel().getDecorationRange(this.decorationId);
			if (anchorPosition) {
				this.editor.setPosition(anchorPosition.getStartPosition());
			}
		}
	}

	selectFromAnchorToCursor(): void {
		if (this.editor.hasModel() && this.decorationId) {
			const start = this.editor.getModel().getDecorationRange(this.decorationId);
			if (start) {
				const end = this.editor.getPosition();
				this.editor.setSelection(Selection.fromPositions(start.getStartPosition(), end));
				this.cancelSelectionAnchor();
			}
		}
	}

	cancelSelectionAnchor(): void {
		if (this.decorationId) {
			this.editor.deltaDecorations([this.decorationId], []);
			this.decorationId = undefined;
			this.selectionAnchorSetContextKey.set(false);
		}
	}

	dispose(): void {
		this.cancelSelectionAnchor();
		this.modelChangeListener.dispose();
	}
}

class SetSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.setSelectionAnchor',
			laBel: localize('setSelectionAnchor', "Set Selection Anchor"),
			alias: 'Set Selection Anchor',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_B),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.setSelectionAnchor();
	}
}

class GoToSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.goToSelectionAnchor',
			laBel: localize('goToSelectionAnchor', "Go to Selection Anchor"),
			alias: 'Go to Selection Anchor',
			precondition: SelectionAnchorSet,
		});
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.goToSelectionAnchor();
	}
}

class SelectFromAnchorToCursor extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.selectFromAnchorToCursor',
			laBel: localize('selectFromAnchorToCursor', "Select from Anchor to Cursor"),
			alias: 'Select from Anchor to Cursor',
			precondition: SelectionAnchorSet,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.selectFromAnchorToCursor();
	}
}

class CancelSelectionAnchor extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.cancelSelectionAnchor',
			laBel: localize('cancelSelectionAnchor', "Cancel Selection Anchor"),
			alias: 'Cancel Selection Anchor',
			precondition: SelectionAnchorSet,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyCode.Escape,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = SelectionAnchorController.get(editor);
		controller.cancelSelectionAnchor();
	}
}

registerEditorContriBution(SelectionAnchorController.ID, SelectionAnchorController);
registerEditorAction(SetSelectionAnchor);
registerEditorAction(GoToSelectionAnchor);
registerEditorAction(SelectFromAnchorToCursor);
registerEditorAction(CancelSelectionAnchor);
