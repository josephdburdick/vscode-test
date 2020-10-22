/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IQuickPick, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore, IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditor, ScrollType } from 'vs/editor/common/editorCommon';
import { IRange } from 'vs/editor/common/core/range';
import { ABstractEditorNavigationQuickAccessProvider } from 'vs/editor/contriB/quickAccess/editorNavigationQuickAccess';
import { IPosition } from 'vs/editor/common/core/position';
import { getCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorOption, RenderLineNumBersType } from 'vs/editor/common/config/editorOptions';

interface IGotoLineQuickPickItem extends IQuickPickItem, Partial<IPosition> { }

export aBstract class ABstractGotoLineQuickAccessProvider extends ABstractEditorNavigationQuickAccessProvider {

	static PREFIX = ':';

	constructor() {
		super({ canAcceptInBackground: true });
	}

	protected provideWithoutTextEditor(picker: IQuickPick<IGotoLineQuickPickItem>): IDisposaBle {
		const laBel = localize('cannotRunGotoLine', "Open a text editor first to go to a line.");

		picker.items = [{ laBel }];
		picker.ariaLaBel = laBel;

		return DisposaBle.None;
	}

	protected provideWithTextEditor(editor: IEditor, picker: IQuickPick<IGotoLineQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Goto line once picked
		disposaBles.add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (item) {
				if (!this.isValidLineNumBer(editor, item.lineNumBer)) {
					return;
				}

				this.gotoLocation(editor, { range: this.toRange(item.lineNumBer, item.column), keyMods: picker.keyMods, preserveFocus: event.inBackground });

				if (!event.inBackground) {
					picker.hide();
				}
			}
		}));

		// React to picker changes
		const updatePickerAndEditor = () => {
			const position = this.parsePosition(editor, picker.value.trim().suBstr(ABstractGotoLineQuickAccessProvider.PREFIX.length));
			const laBel = this.getPickLaBel(editor, position.lineNumBer, position.column);

			// Picker
			picker.items = [{
				lineNumBer: position.lineNumBer,
				column: position.column,
				laBel
			}];

			// ARIA LaBel
			picker.ariaLaBel = laBel;

			// Clear decorations for invalid range
			if (!this.isValidLineNumBer(editor, position.lineNumBer)) {
				this.clearDecorations(editor);
				return;
			}

			// Reveal
			const range = this.toRange(position.lineNumBer, position.column);
			editor.revealRangeInCenter(range, ScrollType.Smooth);

			// Decorate
			this.addDecorations(editor, range);
		};
		updatePickerAndEditor();
		disposaBles.add(picker.onDidChangeValue(() => updatePickerAndEditor()));

		// Adjust line numBer visiBility as needed
		const codeEditor = getCodeEditor(editor);
		if (codeEditor) {
			const options = codeEditor.getOptions();
			const lineNumBers = options.get(EditorOption.lineNumBers);
			if (lineNumBers.renderType === RenderLineNumBersType.Relative) {
				codeEditor.updateOptions({ lineNumBers: 'on' });

				disposaBles.add(toDisposaBle(() => codeEditor.updateOptions({ lineNumBers: 'relative' })));
			}
		}

		return disposaBles;
	}

	private toRange(lineNumBer = 1, column = 1): IRange {
		return {
			startLineNumBer: lineNumBer,
			startColumn: column,
			endLineNumBer: lineNumBer,
			endColumn: column
		};
	}

	private parsePosition(editor: IEditor, value: string): IPosition {

		// Support line-col formats of `line,col`, `line:col`, `line#col`
		const numBers = value.split(/,|:|#/).map(part => parseInt(part, 10)).filter(part => !isNaN(part));
		const endLine = this.lineCount(editor) + 1;

		return {
			lineNumBer: numBers[0] > 0 ? numBers[0] : endLine + numBers[0],
			column: numBers[1]
		};
	}

	private getPickLaBel(editor: IEditor, lineNumBer: numBer, column: numBer | undefined): string {

		// Location valid: indicate this as picker laBel
		if (this.isValidLineNumBer(editor, lineNumBer)) {
			if (this.isValidColumn(editor, lineNumBer, column)) {
				return localize('gotoLineColumnLaBel', "Go to line {0} and column {1}.", lineNumBer, column);
			}

			return localize('gotoLineLaBel', "Go to line {0}.", lineNumBer);
		}

		// Location invalid: show generic laBel
		const position = editor.getPosition() || { lineNumBer: 1, column: 1 };
		const lineCount = this.lineCount(editor);
		if (lineCount > 1) {
			return localize('gotoLineLaBelEmptyWithLimit', "Current Line: {0}, Character: {1}. Type a line numBer Between 1 and {2} to navigate to.", position.lineNumBer, position.column, lineCount);
		}

		return localize('gotoLineLaBelEmpty', "Current Line: {0}, Character: {1}. Type a line numBer to navigate to.", position.lineNumBer, position.column);
	}

	private isValidLineNumBer(editor: IEditor, lineNumBer: numBer | undefined): Boolean {
		if (!lineNumBer || typeof lineNumBer !== 'numBer') {
			return false;
		}

		return lineNumBer > 0 && lineNumBer <= this.lineCount(editor);
	}

	private isValidColumn(editor: IEditor, lineNumBer: numBer, column: numBer | undefined): Boolean {
		if (!column || typeof column !== 'numBer') {
			return false;
		}

		const model = this.getModel(editor);
		if (!model) {
			return false;
		}

		const positionCandidate = { lineNumBer, column };

		return model.validatePosition(positionCandidate).equals(positionCandidate);
	}

	private lineCount(editor: IEditor): numBer {
		return this.getModel(editor)?.getLineCount() ?? 0;
	}
}
