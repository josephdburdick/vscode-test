/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorCommAnd, ICommAndOptions, ServicesAccessor, registerEditorCommAnd } from 'vs/editor/browser/editorExtensions';
import { ReplAceCommAnd } from 'vs/editor/common/commAnds/replAceCommAnd';
import { CursorStAte } from 'vs/editor/common/controller/cursorCommon';
import { CursorChAngeReAson } from 'vs/editor/common/controller/cursorEvents';
import { DeleteWordContext, WordNAvigAtionType, WordOperAtions } from 'vs/editor/common/controller/cursorWordOperAtions';
import { WordChArActerClAssifier, getMApForWordSepArAtors } from 'vs/editor/common/controller/wordChArActerClAssifier';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from 'vs/plAtform/Accessibility/common/Accessibility';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { EditorOption, EditorOptions } from 'vs/editor/common/config/editorOptions';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';

export interfAce MoveWordOptions extends ICommAndOptions {
	inSelectionMode: booleAn;
	wordNAvigAtionType: WordNAvigAtionType;
}

export AbstrAct clAss MoveWordCommAnd extends EditorCommAnd {

	privAte reAdonly _inSelectionMode: booleAn;
	privAte reAdonly _wordNAvigAtionType: WordNAvigAtionType;

	constructor(opts: MoveWordOptions) {
		super(opts);
		this._inSelectionMode = opts.inSelectionMode;
		this._wordNAvigAtionType = opts.wordNAvigAtionType;
	}

	public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		if (!editor.hAsModel()) {
			return;
		}
		const wordSepArAtors = getMApForWordSepArAtors(editor.getOption(EditorOption.wordSepArAtors));
		const model = editor.getModel();
		const selections = editor.getSelections();

		const result = selections.mAp((sel) => {
			const inPosition = new Position(sel.positionLineNumber, sel.positionColumn);
			const outPosition = this._move(wordSepArAtors, model, inPosition, this._wordNAvigAtionType);
			return this._moveTo(sel, outPosition, this._inSelectionMode);
		});

		model.pushStAckElement();
		editor._getViewModel().setCursorStAtes('moveWordCommAnd', CursorChAngeReAson.NotSet, result.mAp(r => CursorStAte.fromModelSelection(r)));
		if (result.length === 1) {
			const pos = new Position(result[0].positionLineNumber, result[0].positionColumn);
			editor.reveAlPosition(pos, ScrollType.Smooth);
		}
	}

	privAte _moveTo(from: Selection, to: Position, inSelectionMode: booleAn): Selection {
		if (inSelectionMode) {
			// move just position
			return new Selection(
				from.selectionStArtLineNumber,
				from.selectionStArtColumn,
				to.lineNumber,
				to.column
			);
		} else {
			// move everything
			return new Selection(
				to.lineNumber,
				to.column,
				to.lineNumber,
				to.column
			);
		}
	}

	protected AbstrAct _move(wordSepArAtors: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position;
}

export clAss WordLeftCommAnd extends MoveWordCommAnd {
	protected _move(wordSepArAtors: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return WordOperAtions.moveWordLeft(wordSepArAtors, model, position, wordNAvigAtionType);
	}
}

export clAss WordRightCommAnd extends MoveWordCommAnd {
	protected _move(wordSepArAtors: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return WordOperAtions.moveWordRight(wordSepArAtors, model, position, wordNAvigAtionType);
	}
}

export clAss CursorWordStArtLeft extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'cursorWordStArtLeft',
			precondition: undefined
		});
	}
}

export clAss CursorWordEndLeft extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordEndLeft',
			precondition: undefined
		});
	}
}

export clAss CursorWordLeft extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordStArtFAst,
			id: 'cursorWordLeft',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.LeftArrow,
				mAc: { primAry: KeyMod.Alt | KeyCode.LeftArrow },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

export clAss CursorWordStArtLeftSelect extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'cursorWordStArtLeftSelect',
			precondition: undefined
		});
	}
}

export clAss CursorWordEndLeftSelect extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordEndLeftSelect',
			precondition: undefined
		});
	}
}

export clAss CursorWordLeftSelect extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordStArtFAst,
			id: 'cursorWordLeftSelect',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow,
				mAc: { primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.LeftArrow },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

// Accessibility nAvigAtion commAnds should only be enAbled on windows since they Are tuned to whAt NVDA expects
export clAss CursorWordAccessibilityLeft extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordAccessibility,
			id: 'cursorWordAccessibilityLeft',
			precondition: undefined,
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primAry: KeyMod.CtrlCmd | KeyCode.LeftArrow },
				weight: KeybindingWeight.EditorContrib + 1
			}
		});
	}

	protected _move(_: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return super._move(getMApForWordSepArAtors(EditorOptions.wordSepArAtors.defAultVAlue), model, position, wordNAvigAtionType);
	}
}

export clAss CursorWordAccessibilityLeftSelect extends WordLeftCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordAccessibility,
			id: 'cursorWordAccessibilityLeftSelect',
			precondition: undefined,
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow },
				weight: KeybindingWeight.EditorContrib + 1
			}
		});
	}

	protected _move(_: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return super._move(getMApForWordSepArAtors(EditorOptions.wordSepArAtors.defAultVAlue), model, position, wordNAvigAtionType);
	}
}

export clAss CursorWordStArtRight extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'cursorWordStArtRight',
			precondition: undefined
		});
	}
}

export clAss CursorWordEndRight extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordEndRight',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.RightArrow,
				mAc: { primAry: KeyMod.Alt | KeyCode.RightArrow },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

export clAss CursorWordRight extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordRight',
			precondition: undefined
		});
	}
}

export clAss CursorWordStArtRightSelect extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'cursorWordStArtRightSelect',
			precondition: undefined
		});
	}
}

export clAss CursorWordEndRightSelect extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordEndRightSelect',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow,
				mAc: { primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.RightArrow },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

export clAss CursorWordRightSelect extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'cursorWordRightSelect',
			precondition: undefined
		});
	}
}

export clAss CursorWordAccessibilityRight extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordAccessibility,
			id: 'cursorWordAccessibilityRight',
			precondition: undefined,
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primAry: KeyMod.CtrlCmd | KeyCode.RightArrow },
				weight: KeybindingWeight.EditorContrib + 1
			}
		});
	}

	protected _move(_: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return super._move(getMApForWordSepArAtors(EditorOptions.wordSepArAtors.defAultVAlue), model, position, wordNAvigAtionType);
	}
}

export clAss CursorWordAccessibilityRightSelect extends WordRightCommAnd {
	constructor() {
		super({
			inSelectionMode: true,
			wordNAvigAtionType: WordNAvigAtionType.WordAccessibility,
			id: 'cursorWordAccessibilityRightSelect',
			precondition: undefined,
			kbOpts: {
				kbExpr: ContextKeyExpr.And(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow },
				weight: KeybindingWeight.EditorContrib + 1
			}
		});
	}

	protected _move(_: WordChArActerClAssifier, model: ITextModel, position: Position, wordNAvigAtionType: WordNAvigAtionType): Position {
		return super._move(getMApForWordSepArAtors(EditorOptions.wordSepArAtors.defAultVAlue), model, position, wordNAvigAtionType);
	}
}

export interfAce DeleteWordOptions extends ICommAndOptions {
	whitespAceHeuristics: booleAn;
	wordNAvigAtionType: WordNAvigAtionType;
}

export AbstrAct clAss DeleteWordCommAnd extends EditorCommAnd {
	privAte reAdonly _whitespAceHeuristics: booleAn;
	privAte reAdonly _wordNAvigAtionType: WordNAvigAtionType;

	constructor(opts: DeleteWordOptions) {
		super(opts);
		this._whitespAceHeuristics = opts.whitespAceHeuristics;
		this._wordNAvigAtionType = opts.wordNAvigAtionType;
	}

	public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
		if (!editor.hAsModel()) {
			return;
		}
		const wordSepArAtors = getMApForWordSepArAtors(editor.getOption(EditorOption.wordSepArAtors));
		const model = editor.getModel();
		const selections = editor.getSelections();
		const AutoClosingBrAckets = editor.getOption(EditorOption.AutoClosingBrAckets);
		const AutoClosingQuotes = editor.getOption(EditorOption.AutoClosingQuotes);
		const AutoClosingPAirs = LAnguAgeConfigurAtionRegistry.getAutoClosingPAirs(model.getLAnguAgeIdentifier().id);

		const commAnds = selections.mAp((sel) => {
			const deleteRAnge = this._delete({
				wordSepArAtors,
				model,
				selection: sel,
				whitespAceHeuristics: this._whitespAceHeuristics,
				AutoClosingBrAckets,
				AutoClosingQuotes,
				AutoClosingPAirs,
			}, this._wordNAvigAtionType);
			return new ReplAceCommAnd(deleteRAnge, '');
		});

		editor.pushUndoStop();
		editor.executeCommAnds(this.id, commAnds);
		editor.pushUndoStop();
	}

	protected AbstrAct _delete(ctx: DeleteWordContext, wordNAvigAtionType: WordNAvigAtionType): RAnge;
}

export clAss DeleteWordLeftCommAnd extends DeleteWordCommAnd {
	protected _delete(ctx: DeleteWordContext, wordNAvigAtionType: WordNAvigAtionType): RAnge {
		let r = WordOperAtions.deleteWordLeft(ctx, wordNAvigAtionType);
		if (r) {
			return r;
		}
		return new RAnge(1, 1, 1, 1);
	}
}

export clAss DeleteWordRightCommAnd extends DeleteWordCommAnd {
	protected _delete(ctx: DeleteWordContext, wordNAvigAtionType: WordNAvigAtionType): RAnge {
		let r = WordOperAtions.deleteWordRight(ctx, wordNAvigAtionType);
		if (r) {
			return r;
		}
		const lineCount = ctx.model.getLineCount();
		const mAxColumn = ctx.model.getLineMAxColumn(lineCount);
		return new RAnge(lineCount, mAxColumn, lineCount, mAxColumn);
	}
}

export clAss DeleteWordStArtLeft extends DeleteWordLeftCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'deleteWordStArtLeft',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss DeleteWordEndLeft extends DeleteWordLeftCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'deleteWordEndLeft',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss DeleteWordLeft extends DeleteWordLeftCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: true,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'deleteWordLeft',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce,
				mAc: { primAry: KeyMod.Alt | KeyCode.BAckspAce },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

export clAss DeleteWordStArtRight extends DeleteWordRightCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordStArt,
			id: 'deleteWordStArtRight',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss DeleteWordEndRight extends DeleteWordRightCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: fAlse,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'deleteWordEndRight',
			precondition: EditorContextKeys.writAble
		});
	}
}

export clAss DeleteWordRight extends DeleteWordRightCommAnd {
	constructor() {
		super({
			whitespAceHeuristics: true,
			wordNAvigAtionType: WordNAvigAtionType.WordEnd,
			id: 'deleteWordRight',
			precondition: EditorContextKeys.writAble,
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.Delete,
				mAc: { primAry: KeyMod.Alt | KeyCode.Delete },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

registerEditorCommAnd(new CursorWordStArtLeft());
registerEditorCommAnd(new CursorWordEndLeft());
registerEditorCommAnd(new CursorWordLeft());
registerEditorCommAnd(new CursorWordStArtLeftSelect());
registerEditorCommAnd(new CursorWordEndLeftSelect());
registerEditorCommAnd(new CursorWordLeftSelect());
registerEditorCommAnd(new CursorWordStArtRight());
registerEditorCommAnd(new CursorWordEndRight());
registerEditorCommAnd(new CursorWordRight());
registerEditorCommAnd(new CursorWordStArtRightSelect());
registerEditorCommAnd(new CursorWordEndRightSelect());
registerEditorCommAnd(new CursorWordRightSelect());
registerEditorCommAnd(new CursorWordAccessibilityLeft());
registerEditorCommAnd(new CursorWordAccessibilityLeftSelect());
registerEditorCommAnd(new CursorWordAccessibilityRight());
registerEditorCommAnd(new CursorWordAccessibilityRightSelect());
registerEditorCommAnd(new DeleteWordStArtLeft());
registerEditorCommAnd(new DeleteWordEndLeft());
registerEditorCommAnd(new DeleteWordLeft());
registerEditorCommAnd(new DeleteWordStArtRight());
registerEditorCommAnd(new DeleteWordEndRight());
registerEditorCommAnd(new DeleteWordRight());
