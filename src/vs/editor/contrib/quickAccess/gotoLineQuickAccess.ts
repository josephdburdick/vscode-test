/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IQuickPick, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore, IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IEditor, ScrollType } from 'vs/editor/common/editorCommon';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { AbstrActEditorNAvigAtionQuickAccessProvider } from 'vs/editor/contrib/quickAccess/editorNAvigAtionQuickAccess';
import { IPosition } from 'vs/editor/common/core/position';
import { getCodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorOption, RenderLineNumbersType } from 'vs/editor/common/config/editorOptions';

interfAce IGotoLineQuickPickItem extends IQuickPickItem, PArtiAl<IPosition> { }

export AbstrAct clAss AbstrActGotoLineQuickAccessProvider extends AbstrActEditorNAvigAtionQuickAccessProvider {

	stAtic PREFIX = ':';

	constructor() {
		super({ cAnAcceptInBAckground: true });
	}

	protected provideWithoutTextEditor(picker: IQuickPick<IGotoLineQuickPickItem>): IDisposAble {
		const lAbel = locAlize('cAnnotRunGotoLine', "Open A text editor first to go to A line.");

		picker.items = [{ lAbel }];
		picker.AriALAbel = lAbel;

		return DisposAble.None;
	}

	protected provideWithTextEditor(editor: IEditor, picker: IQuickPick<IGotoLineQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		const disposAbles = new DisposAbleStore();

		// Goto line once picked
		disposAbles.Add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (item) {
				if (!this.isVAlidLineNumber(editor, item.lineNumber)) {
					return;
				}

				this.gotoLocAtion(editor, { rAnge: this.toRAnge(item.lineNumber, item.column), keyMods: picker.keyMods, preserveFocus: event.inBAckground });

				if (!event.inBAckground) {
					picker.hide();
				}
			}
		}));

		// ReAct to picker chAnges
		const updAtePickerAndEditor = () => {
			const position = this.pArsePosition(editor, picker.vAlue.trim().substr(AbstrActGotoLineQuickAccessProvider.PREFIX.length));
			const lAbel = this.getPickLAbel(editor, position.lineNumber, position.column);

			// Picker
			picker.items = [{
				lineNumber: position.lineNumber,
				column: position.column,
				lAbel
			}];

			// ARIA LAbel
			picker.AriALAbel = lAbel;

			// CleAr decorAtions for invAlid rAnge
			if (!this.isVAlidLineNumber(editor, position.lineNumber)) {
				this.cleArDecorAtions(editor);
				return;
			}

			// ReveAl
			const rAnge = this.toRAnge(position.lineNumber, position.column);
			editor.reveAlRAngeInCenter(rAnge, ScrollType.Smooth);

			// DecorAte
			this.AddDecorAtions(editor, rAnge);
		};
		updAtePickerAndEditor();
		disposAbles.Add(picker.onDidChAngeVAlue(() => updAtePickerAndEditor()));

		// Adjust line number visibility As needed
		const codeEditor = getCodeEditor(editor);
		if (codeEditor) {
			const options = codeEditor.getOptions();
			const lineNumbers = options.get(EditorOption.lineNumbers);
			if (lineNumbers.renderType === RenderLineNumbersType.RelAtive) {
				codeEditor.updAteOptions({ lineNumbers: 'on' });

				disposAbles.Add(toDisposAble(() => codeEditor.updAteOptions({ lineNumbers: 'relAtive' })));
			}
		}

		return disposAbles;
	}

	privAte toRAnge(lineNumber = 1, column = 1): IRAnge {
		return {
			stArtLineNumber: lineNumber,
			stArtColumn: column,
			endLineNumber: lineNumber,
			endColumn: column
		};
	}

	privAte pArsePosition(editor: IEditor, vAlue: string): IPosition {

		// Support line-col formAts of `line,col`, `line:col`, `line#col`
		const numbers = vAlue.split(/,|:|#/).mAp(pArt => pArseInt(pArt, 10)).filter(pArt => !isNAN(pArt));
		const endLine = this.lineCount(editor) + 1;

		return {
			lineNumber: numbers[0] > 0 ? numbers[0] : endLine + numbers[0],
			column: numbers[1]
		};
	}

	privAte getPickLAbel(editor: IEditor, lineNumber: number, column: number | undefined): string {

		// LocAtion vAlid: indicAte this As picker lAbel
		if (this.isVAlidLineNumber(editor, lineNumber)) {
			if (this.isVAlidColumn(editor, lineNumber, column)) {
				return locAlize('gotoLineColumnLAbel', "Go to line {0} And column {1}.", lineNumber, column);
			}

			return locAlize('gotoLineLAbel', "Go to line {0}.", lineNumber);
		}

		// LocAtion invAlid: show generic lAbel
		const position = editor.getPosition() || { lineNumber: 1, column: 1 };
		const lineCount = this.lineCount(editor);
		if (lineCount > 1) {
			return locAlize('gotoLineLAbelEmptyWithLimit', "Current Line: {0}, ChArActer: {1}. Type A line number between 1 And {2} to nAvigAte to.", position.lineNumber, position.column, lineCount);
		}

		return locAlize('gotoLineLAbelEmpty', "Current Line: {0}, ChArActer: {1}. Type A line number to nAvigAte to.", position.lineNumber, position.column);
	}

	privAte isVAlidLineNumber(editor: IEditor, lineNumber: number | undefined): booleAn {
		if (!lineNumber || typeof lineNumber !== 'number') {
			return fAlse;
		}

		return lineNumber > 0 && lineNumber <= this.lineCount(editor);
	}

	privAte isVAlidColumn(editor: IEditor, lineNumber: number, column: number | undefined): booleAn {
		if (!column || typeof column !== 'number') {
			return fAlse;
		}

		const model = this.getModel(editor);
		if (!model) {
			return fAlse;
		}

		const positionCAndidAte = { lineNumber, column };

		return model.vAlidAtePosition(positionCAndidAte).equAls(positionCAndidAte);
	}

	privAte lineCount(editor: IEditor): number {
		return this.getModel(editor)?.getLineCount() ?? 0;
	}
}
