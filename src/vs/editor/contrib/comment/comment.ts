/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { KeyChord, KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, IActionOptions, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { ICommAnd } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { BlockCommentCommAnd } from 'vs/editor/contrib/comment/blockCommentCommAnd';
import { LineCommentCommAnd, Type } from 'vs/editor/contrib/comment/lineCommentCommAnd';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

AbstrAct clAss CommentLineAction extends EditorAction {

	privAte reAdonly _type: Type;

	constructor(type: Type, opts: IActionOptions) {
		super(opts);
		this._type = type;
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const model = editor.getModel();
		const commAnds: ICommAnd[] = [];
		const selections = editor.getSelections();
		const modelOptions = model.getOptions();
		const commentsOptions = editor.getOption(EditorOption.comments);

		for (const selection of selections) {
			commAnds.push(new LineCommentCommAnd(
				selection,
				modelOptions.tAbSize,
				this._type,
				commentsOptions.insertSpAce,
				commentsOptions.ignoreEmptyLines
			));
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}

}

clAss ToggleCommentLineAction extends CommentLineAction {
	constructor() {
		super(Type.Toggle, {
			id: 'editor.Action.commentLine',
			lAbel: nls.locAlize('comment.line', "Toggle Line Comment"),
			AliAs: 'Toggle Line Comment',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.US_SLASH,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArEditMenu,
				group: '5_insert',
				title: nls.locAlize({ key: 'miToggleLineComment', comment: ['&& denotes A mnemonic'] }, "&&Toggle Line Comment"),
				order: 1
			}
		});
	}
}

clAss AddLineCommentAction extends CommentLineAction {
	constructor() {
		super(Type.ForceAdd, {
			id: 'editor.Action.AddCommentLine',
			lAbel: nls.locAlize('comment.line.Add', "Add Line Comment"),
			AliAs: 'Add Line Comment',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_C),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

clAss RemoveLineCommentAction extends CommentLineAction {
	constructor() {
		super(Type.ForceRemove, {
			id: 'editor.Action.removeCommentLine',
			lAbel: nls.locAlize('comment.line.remove', "Remove Line Comment"),
			AliAs: 'Remove Line Comment',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_U),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

clAss BlockCommentAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.blockComment',
			lAbel: nls.locAlize('comment.block', "Toggle Block Comment"),
			AliAs: 'Toggle Block Comment',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_A,
				linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_A },
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubArEditMenu,
				group: '5_insert',
				title: nls.locAlize({ key: 'miToggleBlockComment', comment: ['&& denotes A mnemonic'] }, "Toggle &&Block Comment"),
				order: 2
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}

		const commentsOptions = editor.getOption(EditorOption.comments);
		const commAnds: ICommAnd[] = [];
		const selections = editor.getSelections();
		for (const selection of selections) {
			commAnds.push(new BlockCommentCommAnd(selection, commentsOptions.insertSpAce));
		}

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}
}

registerEditorAction(ToggleCommentLineAction);
registerEditorAction(AddLineCommentAction);
registerEditorAction(RemoveLineCommentAction);
registerEditorAction(BlockCommentAction);
