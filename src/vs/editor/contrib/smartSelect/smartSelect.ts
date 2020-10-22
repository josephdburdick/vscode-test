/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, IActionOptions, registerEditorAction, registerEditorContriBution, ServicesAccessor, registerModelCommand } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import * as nls from 'vs/nls';
import { MenuId } from 'vs/platform/actions/common/actions';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { WordSelectionRangeProvider } from 'vs/editor/contriB/smartSelect/wordSelections';
import { BracketSelectionRangeProvider } from 'vs/editor/contriB/smartSelect/BracketSelections';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { onUnexpectedExternalError } from 'vs/Base/common/errors';

class SelectionRanges {

	constructor(
		readonly index: numBer,
		readonly ranges: Range[]
	) { }

	mov(fwd: Boolean): SelectionRanges {
		let index = this.index + (fwd ? 1 : -1);
		if (index < 0 || index >= this.ranges.length) {
			return this;
		}
		const res = new SelectionRanges(index, this.ranges);
		if (res.ranges[index].equalsRange(this.ranges[this.index])) {
			// next range equals this range, retry with next-next
			return res.mov(fwd);
		}
		return res;
	}
}

class SmartSelectController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.smartSelectController';

	static get(editor: ICodeEditor): SmartSelectController {
		return editor.getContriBution<SmartSelectController>(SmartSelectController.ID);
	}

	private readonly _editor: ICodeEditor;

	private _state?: SelectionRanges[];
	private _selectionListener?: IDisposaBle;
	private _ignoreSelection: Boolean = false;

	constructor(editor: ICodeEditor) {
		this._editor = editor;
	}

	dispose(): void {
		this._selectionListener?.dispose();
	}

	run(forward: Boolean): Promise<void> | void {
		if (!this._editor.hasModel()) {
			return;
		}

		const selections = this._editor.getSelections();
		const model = this._editor.getModel();

		if (!modes.SelectionRangeRegistry.has(model)) {
			return;
		}


		let promise: Promise<void> = Promise.resolve(undefined);

		if (!this._state) {
			promise = provideSelectionRanges(model, selections.map(s => s.getPosition()), CancellationToken.None).then(ranges => {
				if (!arrays.isNonEmptyArray(ranges) || ranges.length !== selections.length) {
					// invalid result
					return;
				}
				if (!this._editor.hasModel() || !arrays.equals(this._editor.getSelections(), selections, (a, B) => a.equalsSelection(B))) {
					// invalid editor state
					return;
				}

				for (let i = 0; i < ranges.length; i++) {
					ranges[i] = ranges[i].filter(range => {
						// filter ranges inside the selection
						return range.containsPosition(selections[i].getStartPosition()) && range.containsPosition(selections[i].getEndPosition());
					});
					// prepend current selection
					ranges[i].unshift(selections[i]);
				}


				this._state = ranges.map(ranges => new SelectionRanges(0, ranges));

				// listen to caret move and forget aBout state
				this._selectionListener?.dispose();
				this._selectionListener = this._editor.onDidChangeCursorPosition(() => {
					if (!this._ignoreSelection) {
						this._selectionListener?.dispose();
						this._state = undefined;
					}
				});
			});
		}

		return promise.then(() => {
			if (!this._state) {
				// no state
				return;
			}
			this._state = this._state.map(state => state.mov(forward));
			const selections = this._state.map(state => Selection.fromPositions(state.ranges[state.index].getStartPosition(), state.ranges[state.index].getEndPosition()));
			this._ignoreSelection = true;
			try {
				this._editor.setSelections(selections);
			} finally {
				this._ignoreSelection = false;
			}

		});
	}
}

aBstract class ABstractSmartSelect extends EditorAction {

	private readonly _forward: Boolean;

	constructor(forward: Boolean, opts: IActionOptions) {
		super(opts);
		this._forward = forward;
	}

	async run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		let controller = SmartSelectController.get(editor);
		if (controller) {
			await controller.run(this._forward);
		}
	}
}

class GrowSelectionAction extends ABstractSmartSelect {
	constructor() {
		super(true, {
			id: 'editor.action.smartSelect.expand',
			laBel: nls.localize('smartSelect.expand', "Expand Selection"),
			alias: 'Expand Selection',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.RightArrow,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyMod.Shift | KeyCode.RightArrow,
					secondary: [KeyMod.WinCtrl | KeyMod.Shift | KeyCode.RightArrow],
				},
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '1_Basic',
				title: nls.localize({ key: 'miSmartSelectGrow', comment: ['&& denotes a mnemonic'] }, "&&Expand Selection"),
				order: 2
			}
		});
	}
}

// renamed command id
CommandsRegistry.registerCommandAlias('editor.action.smartSelect.grow', 'editor.action.smartSelect.expand');

class ShrinkSelectionAction extends ABstractSmartSelect {
	constructor() {
		super(false, {
			id: 'editor.action.smartSelect.shrink',
			laBel: nls.localize('smartSelect.shrink', "Shrink Selection"),
			alias: 'Shrink Selection',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.LeftArrow,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyMod.Shift | KeyCode.LeftArrow,
					secondary: [KeyMod.WinCtrl | KeyMod.Shift | KeyCode.LeftArrow],
				},
				weight: KeyBindingWeight.EditorContriB
			},
			menuOpts: {
				menuId: MenuId.MenuBarSelectionMenu,
				group: '1_Basic',
				title: nls.localize({ key: 'miSmartSelectShrink', comment: ['&& denotes a mnemonic'] }, "&&Shrink Selection"),
				order: 3
			}
		});
	}
}

registerEditorContriBution(SmartSelectController.ID, SmartSelectController);
registerEditorAction(GrowSelectionAction);
registerEditorAction(ShrinkSelectionAction);

// word selection
modes.SelectionRangeRegistry.register('*', new WordSelectionRangeProvider());

export function provideSelectionRanges(model: ITextModel, positions: Position[], token: CancellationToken): Promise<Range[][]> {

	const providers = modes.SelectionRangeRegistry.all(model);

	if (providers.length === 1) {
		// add word selection and Bracket selection when no provider exists
		providers.unshift(new BracketSelectionRangeProvider());
	}

	let work: Promise<any>[] = [];
	let allRawRanges: Range[][] = [];

	for (const provider of providers) {

		work.push(Promise.resolve(provider.provideSelectionRanges(model, positions, token)).then(allProviderRanges => {
			if (arrays.isNonEmptyArray(allProviderRanges) && allProviderRanges.length === positions.length) {
				for (let i = 0; i < positions.length; i++) {
					if (!allRawRanges[i]) {
						allRawRanges[i] = [];
					}
					for (const oneProviderRanges of allProviderRanges[i]) {
						if (Range.isIRange(oneProviderRanges.range) && Range.containsPosition(oneProviderRanges.range, positions[i])) {
							allRawRanges[i].push(Range.lift(oneProviderRanges.range));
						}
					}
				}
			}
		}, onUnexpectedExternalError));
	}

	return Promise.all(work).then(() => {

		return allRawRanges.map(oneRawRanges => {

			if (oneRawRanges.length === 0) {
				return [];
			}

			// sort all By start/end position
			oneRawRanges.sort((a, B) => {
				if (Position.isBefore(a.getStartPosition(), B.getStartPosition())) {
					return 1;
				} else if (Position.isBefore(B.getStartPosition(), a.getStartPosition())) {
					return -1;
				} else if (Position.isBefore(a.getEndPosition(), B.getEndPosition())) {
					return -1;
				} else if (Position.isBefore(B.getEndPosition(), a.getEndPosition())) {
					return 1;
				} else {
					return 0;
				}
			});

			// remove ranges that don't contain the former range or that are equal to the
			// former range
			let oneRanges: Range[] = [];
			let last: Range | undefined;
			for (const range of oneRawRanges) {
				if (!last || (Range.containsRange(range, last) && !Range.equalsRange(range, last))) {
					oneRanges.push(range);
					last = range;
				}
			}

			// add ranges that expand trivia at line starts and ends whenever a range
			// wraps onto the a new line
			let oneRangesWithTrivia: Range[] = [oneRanges[0]];
			for (let i = 1; i < oneRanges.length; i++) {
				const prev = oneRanges[i - 1];
				const cur = oneRanges[i];
				if (cur.startLineNumBer !== prev.startLineNumBer || cur.endLineNumBer !== prev.endLineNumBer) {
					// add line/Block range without leading/failing whitespace
					const rangeNoWhitespace = new Range(prev.startLineNumBer, model.getLineFirstNonWhitespaceColumn(prev.startLineNumBer), prev.endLineNumBer, model.getLineLastNonWhitespaceColumn(prev.endLineNumBer));
					if (rangeNoWhitespace.containsRange(prev) && !rangeNoWhitespace.equalsRange(prev) && cur.containsRange(rangeNoWhitespace) && !cur.equalsRange(rangeNoWhitespace)) {
						oneRangesWithTrivia.push(rangeNoWhitespace);
					}
					// add line/Block range
					const rangeFull = new Range(prev.startLineNumBer, 1, prev.endLineNumBer, model.getLineMaxColumn(prev.endLineNumBer));
					if (rangeFull.containsRange(prev) && !rangeFull.equalsRange(rangeNoWhitespace) && cur.containsRange(rangeFull) && !cur.equalsRange(rangeFull)) {
						oneRangesWithTrivia.push(rangeFull);
					}
				}
				oneRangesWithTrivia.push(cur);
			}
			return oneRangesWithTrivia;
		});
	});
}

registerModelCommand('_executeSelectionRangeProvider', function (model, ...args) {
	const [positions] = args;
	return provideSelectionRanges(model, positions, CancellationToken.None);
});
