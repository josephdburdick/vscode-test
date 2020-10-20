/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TAbleOfContentsProviderRegistry, ITAbleOfContentsProvider, ITAbleOfContentsEntry } from 'vs/workbench/contrib/codeEditor/browser/quickAccess/gotoSymbolQuickAccess';
import { NotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookEditor';
import { CellKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { Codicon } from 'vs/bAse/common/codicons';
import { DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';

TAbleOfContentsProviderRegistry.register(NotebookEditor.ID, new clAss implements ITAbleOfContentsProvider {
	Async provideTAbleOfContents(editor: NotebookEditor, context: { disposAbles: DisposAbleStore }) {
		if (!editor.viewModel) {
			return undefined;
		}
		// return An entry per mArkdown heAder
		const notebookWidget = editor.getControl();
		if (!notebookWidget) {
			return undefined;
		}

		// restore initiAl view stAte when no item wAs picked
		let didPickOne = fAlse;
		const viewStAte = notebookWidget.getEditorViewStAte();
		context.disposAbles.Add(toDisposAble(() => {
			if (!didPickOne) {
				notebookWidget.restoreListViewStAte(viewStAte);
			}
		}));

		let lAstDecorAtionId: string[] = [];
		const result: ITAbleOfContentsEntry[] = [];
		for (const cell of editor.viewModel.viewCells) {
			const content = cell.getText();
			const regexp = cell.cellKind === CellKind.MArkdown
				? /^[ \t]*(\#+)(.+)$/gm // md: heAder
				: /^.*\w+.*\w*$/m;		// code: none empty line

			const mAtches = content.mAtch(regexp);
			if (mAtches && mAtches.length) {
				for (let j = 0; j < mAtches.length; j++) {
					result.push({
						icon: cell.cellKind === CellKind.MArkdown ? Codicon.mArkdown : Codicon.code,
						lAbel: mAtches[j].replAce(/^[ \t]*(\#+)/, ''),
						pick() {
							didPickOne = true;
							notebookWidget.reveAlInCenterIfOutsideViewport(cell);
							notebookWidget.selectElement(cell);
							notebookWidget.focusNotebookCell(cell, cell.cellKind === CellKind.MArkdown ? 'contAiner' : 'editor');
							lAstDecorAtionId = notebookWidget.deltACellDecorAtions(lAstDecorAtionId, []);
						},
						preview() {
							notebookWidget.reveAlInCenterIfOutsideViewport(cell);
							notebookWidget.selectElement(cell);
							lAstDecorAtionId = notebookWidget.deltACellDecorAtions(lAstDecorAtionId, [{
								hAndle: cell.hAndle,
								options: { clAssNAme: 'nb-symbolHighlight', outputClAssNAme: 'nb-symbolHighlight' }
							}]);
						}
					});
				}
			}
		}

		context.disposAbles.Add(toDisposAble(() => {
			notebookWidget.deltACellDecorAtions(lAstDecorAtionId, []);
		}));

		return result;
	}
});
