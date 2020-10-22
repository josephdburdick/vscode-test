/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorCommand, ICommandOptions, ServicesAccessor, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { ReplaceCommand } from 'vs/editor/common/commands/replaceCommand';
import { CursorState } from 'vs/editor/common/controller/cursorCommon';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';
import { DeleteWordContext, WordNavigationType, WordOperations } from 'vs/editor/common/controller/cursorWordOperations';
import { WordCharacterClassifier, getMapForWordSeparators } from 'vs/editor/common/controller/wordCharacterClassifier';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from 'vs/platform/accessiBility/common/accessiBility';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { EditorOption, EditorOptions } from 'vs/editor/common/config/editorOptions';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';

export interface MoveWordOptions extends ICommandOptions {
	inSelectionMode: Boolean;
	wordNavigationType: WordNavigationType;
}

export aBstract class MoveWordCommand extends EditorCommand {

	private readonly _inSelectionMode: Boolean;
	private readonly _wordNavigationType: WordNavigationType;

	constructor(opts: MoveWordOptions) {
		super(opts);
		this._inSelectionMode = opts.inSelectionMode;
		this._wordNavigationType = opts.wordNavigationType;
	}

	puBlic runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		if (!editor.hasModel()) {
			return;
		}
		const wordSeparators = getMapForWordSeparators(editor.getOption(EditorOption.wordSeparators));
		const model = editor.getModel();
		const selections = editor.getSelections();

		const result = selections.map((sel) => {
			const inPosition = new Position(sel.positionLineNumBer, sel.positionColumn);
			const outPosition = this._move(wordSeparators, model, inPosition, this._wordNavigationType);
			return this._moveTo(sel, outPosition, this._inSelectionMode);
		});

		model.pushStackElement();
		editor._getViewModel().setCursorStates('moveWordCommand', CursorChangeReason.NotSet, result.map(r => CursorState.fromModelSelection(r)));
		if (result.length === 1) {
			const pos = new Position(result[0].positionLineNumBer, result[0].positionColumn);
			editor.revealPosition(pos, ScrollType.Smooth);
		}
	}

	private _moveTo(from: Selection, to: Position, inSelectionMode: Boolean): Selection {
		if (inSelectionMode) {
			// move just position
			return new Selection(
				from.selectionStartLineNumBer,
				from.selectionStartColumn,
				to.lineNumBer,
				to.column
			);
		} else {
			// move everything
			return new Selection(
				to.lineNumBer,
				to.column,
				to.lineNumBer,
				to.column
			);
		}
	}

	protected aBstract _move(wordSeparators: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position;
}

export class WordLeftCommand extends MoveWordCommand {
	protected _move(wordSeparators: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return WordOperations.moveWordLeft(wordSeparators, model, position, wordNavigationType);
	}
}

export class WordRightCommand extends MoveWordCommand {
	protected _move(wordSeparators: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return WordOperations.moveWordRight(wordSeparators, model, position, wordNavigationType);
	}
}

export class CursorWordStartLeft extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'cursorWordStartLeft',
			precondition: undefined
		});
	}
}

export class CursorWordEndLeft extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordEndLeft',
			precondition: undefined
		});
	}
}

export class CursorWordLeft extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordStartFast,
			id: 'cursorWordLeft',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyCode.LeftArrow,
				mac: { primary: KeyMod.Alt | KeyCode.LeftArrow },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

export class CursorWordStartLeftSelect extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'cursorWordStartLeftSelect',
			precondition: undefined
		});
	}
}

export class CursorWordEndLeftSelect extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordEndLeftSelect',
			precondition: undefined
		});
	}
}

export class CursorWordLeftSelect extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordStartFast,
			id: 'cursorWordLeftSelect',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow,
				mac: { primary: KeyMod.Alt | KeyMod.Shift | KeyCode.LeftArrow },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

// AccessiBility navigation commands should only Be enaBled on windows since they are tuned to what NVDA expects
export class CursorWordAccessiBilityLeft extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordAccessiBility,
			id: 'cursorWordAccessiBilityLeft',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primary: KeyMod.CtrlCmd | KeyCode.LeftArrow },
				weight: KeyBindingWeight.EditorContriB + 1
			}
		});
	}

	protected _move(_: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue), model, position, wordNavigationType);
	}
}

export class CursorWordAccessiBilityLeftSelect extends WordLeftCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordAccessiBility,
			id: 'cursorWordAccessiBilityLeftSelect',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow },
				weight: KeyBindingWeight.EditorContriB + 1
			}
		});
	}

	protected _move(_: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue), model, position, wordNavigationType);
	}
}

export class CursorWordStartRight extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'cursorWordStartRight',
			precondition: undefined
		});
	}
}

export class CursorWordEndRight extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordEndRight',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyCode.RightArrow,
				mac: { primary: KeyMod.Alt | KeyCode.RightArrow },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

export class CursorWordRight extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordRight',
			precondition: undefined
		});
	}
}

export class CursorWordStartRightSelect extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'cursorWordStartRightSelect',
			precondition: undefined
		});
	}
}

export class CursorWordEndRightSelect extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordEndRightSelect',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow,
				mac: { primary: KeyMod.Alt | KeyMod.Shift | KeyCode.RightArrow },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

export class CursorWordRightSelect extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'cursorWordRightSelect',
			precondition: undefined
		});
	}
}

export class CursorWordAccessiBilityRight extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: false,
			wordNavigationType: WordNavigationType.WordAccessiBility,
			id: 'cursorWordAccessiBilityRight',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primary: KeyMod.CtrlCmd | KeyCode.RightArrow },
				weight: KeyBindingWeight.EditorContriB + 1
			}
		});
	}

	protected _move(_: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue), model, position, wordNavigationType);
	}
}

export class CursorWordAccessiBilityRightSelect extends WordRightCommand {
	constructor() {
		super({
			inSelectionMode: true,
			wordNavigationType: WordNavigationType.WordAccessiBility,
			id: 'cursorWordAccessiBilityRightSelect',
			precondition: undefined,
			kBOpts: {
				kBExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
				win: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow },
				weight: KeyBindingWeight.EditorContriB + 1
			}
		});
	}

	protected _move(_: WordCharacterClassifier, model: ITextModel, position: Position, wordNavigationType: WordNavigationType): Position {
		return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue), model, position, wordNavigationType);
	}
}

export interface DeleteWordOptions extends ICommandOptions {
	whitespaceHeuristics: Boolean;
	wordNavigationType: WordNavigationType;
}

export aBstract class DeleteWordCommand extends EditorCommand {
	private readonly _whitespaceHeuristics: Boolean;
	private readonly _wordNavigationType: WordNavigationType;

	constructor(opts: DeleteWordOptions) {
		super(opts);
		this._whitespaceHeuristics = opts.whitespaceHeuristics;
		this._wordNavigationType = opts.wordNavigationType;
	}

	puBlic runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		if (!editor.hasModel()) {
			return;
		}
		const wordSeparators = getMapForWordSeparators(editor.getOption(EditorOption.wordSeparators));
		const model = editor.getModel();
		const selections = editor.getSelections();
		const autoClosingBrackets = editor.getOption(EditorOption.autoClosingBrackets);
		const autoClosingQuotes = editor.getOption(EditorOption.autoClosingQuotes);
		const autoClosingPairs = LanguageConfigurationRegistry.getAutoClosingPairs(model.getLanguageIdentifier().id);

		const commands = selections.map((sel) => {
			const deleteRange = this._delete({
				wordSeparators,
				model,
				selection: sel,
				whitespaceHeuristics: this._whitespaceHeuristics,
				autoClosingBrackets,
				autoClosingQuotes,
				autoClosingPairs,
			}, this._wordNavigationType);
			return new ReplaceCommand(deleteRange, '');
		});

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}

	protected aBstract _delete(ctx: DeleteWordContext, wordNavigationType: WordNavigationType): Range;
}

export class DeleteWordLeftCommand extends DeleteWordCommand {
	protected _delete(ctx: DeleteWordContext, wordNavigationType: WordNavigationType): Range {
		let r = WordOperations.deleteWordLeft(ctx, wordNavigationType);
		if (r) {
			return r;
		}
		return new Range(1, 1, 1, 1);
	}
}

export class DeleteWordRightCommand extends DeleteWordCommand {
	protected _delete(ctx: DeleteWordContext, wordNavigationType: WordNavigationType): Range {
		let r = WordOperations.deleteWordRight(ctx, wordNavigationType);
		if (r) {
			return r;
		}
		const lineCount = ctx.model.getLineCount();
		const maxColumn = ctx.model.getLineMaxColumn(lineCount);
		return new Range(lineCount, maxColumn, lineCount, maxColumn);
	}
}

export class DeleteWordStartLeft extends DeleteWordLeftCommand {
	constructor() {
		super({
			whitespaceHeuristics: false,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'deleteWordStartLeft',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class DeleteWordEndLeft extends DeleteWordLeftCommand {
	constructor() {
		super({
			whitespaceHeuristics: false,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'deleteWordEndLeft',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class DeleteWordLeft extends DeleteWordLeftCommand {
	constructor() {
		super({
			whitespaceHeuristics: true,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'deleteWordLeft',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyCode.Backspace,
				mac: { primary: KeyMod.Alt | KeyCode.Backspace },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

export class DeleteWordStartRight extends DeleteWordRightCommand {
	constructor() {
		super({
			whitespaceHeuristics: false,
			wordNavigationType: WordNavigationType.WordStart,
			id: 'deleteWordStartRight',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class DeleteWordEndRight extends DeleteWordRightCommand {
	constructor() {
		super({
			whitespaceHeuristics: false,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'deleteWordEndRight',
			precondition: EditorContextKeys.writaBle
		});
	}
}

export class DeleteWordRight extends DeleteWordRightCommand {
	constructor() {
		super({
			whitespaceHeuristics: true,
			wordNavigationType: WordNavigationType.WordEnd,
			id: 'deleteWordRight',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyMod.CtrlCmd | KeyCode.Delete,
				mac: { primary: KeyMod.Alt | KeyCode.Delete },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
}

registerEditorCommand(new CursorWordStartLeft());
registerEditorCommand(new CursorWordEndLeft());
registerEditorCommand(new CursorWordLeft());
registerEditorCommand(new CursorWordStartLeftSelect());
registerEditorCommand(new CursorWordEndLeftSelect());
registerEditorCommand(new CursorWordLeftSelect());
registerEditorCommand(new CursorWordStartRight());
registerEditorCommand(new CursorWordEndRight());
registerEditorCommand(new CursorWordRight());
registerEditorCommand(new CursorWordStartRightSelect());
registerEditorCommand(new CursorWordEndRightSelect());
registerEditorCommand(new CursorWordRightSelect());
registerEditorCommand(new CursorWordAccessiBilityLeft());
registerEditorCommand(new CursorWordAccessiBilityLeftSelect());
registerEditorCommand(new CursorWordAccessiBilityRight());
registerEditorCommand(new CursorWordAccessiBilityRightSelect());
registerEditorCommand(new DeleteWordStartLeft());
registerEditorCommand(new DeleteWordEndLeft());
registerEditorCommand(new DeleteWordLeft());
registerEditorCommand(new DeleteWordStartRight());
registerEditorCommand(new DeleteWordEndRight());
registerEditorCommand(new DeleteWordRight());
