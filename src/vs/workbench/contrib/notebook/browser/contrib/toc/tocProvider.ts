/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TaBleOfContentsProviderRegistry, ITaBleOfContentsProvider, ITaBleOfContentsEntry } from 'vs/workBench/contriB/codeEditor/Browser/quickaccess/gotoSymBolQuickAccess';
import { NoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookEditor';
import { CellKind } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { Codicon } from 'vs/Base/common/codicons';
import { DisposaBleStore, toDisposaBle } from 'vs/Base/common/lifecycle';

TaBleOfContentsProviderRegistry.register(NoteBookEditor.ID, new class implements ITaBleOfContentsProvider {
	async provideTaBleOfContents(editor: NoteBookEditor, context: { disposaBles: DisposaBleStore }) {
		if (!editor.viewModel) {
			return undefined;
		}
		// return an entry per markdown header
		const noteBookWidget = editor.getControl();
		if (!noteBookWidget) {
			return undefined;
		}

		// restore initial view state when no item was picked
		let didPickOne = false;
		const viewState = noteBookWidget.getEditorViewState();
		context.disposaBles.add(toDisposaBle(() => {
			if (!didPickOne) {
				noteBookWidget.restoreListViewState(viewState);
			}
		}));

		let lastDecorationId: string[] = [];
		const result: ITaBleOfContentsEntry[] = [];
		for (const cell of editor.viewModel.viewCells) {
			const content = cell.getText();
			const regexp = cell.cellKind === CellKind.Markdown
				? /^[ \t]*(\#+)(.+)$/gm // md: header
				: /^.*\w+.*\w*$/m;		// code: none empty line

			const matches = content.match(regexp);
			if (matches && matches.length) {
				for (let j = 0; j < matches.length; j++) {
					result.push({
						icon: cell.cellKind === CellKind.Markdown ? Codicon.markdown : Codicon.code,
						laBel: matches[j].replace(/^[ \t]*(\#+)/, ''),
						pick() {
							didPickOne = true;
							noteBookWidget.revealInCenterIfOutsideViewport(cell);
							noteBookWidget.selectElement(cell);
							noteBookWidget.focusNoteBookCell(cell, cell.cellKind === CellKind.Markdown ? 'container' : 'editor');
							lastDecorationId = noteBookWidget.deltaCellDecorations(lastDecorationId, []);
						},
						preview() {
							noteBookWidget.revealInCenterIfOutsideViewport(cell);
							noteBookWidget.selectElement(cell);
							lastDecorationId = noteBookWidget.deltaCellDecorations(lastDecorationId, [{
								handle: cell.handle,
								options: { className: 'nB-symBolHighlight', outputClassName: 'nB-symBolHighlight' }
							}]);
						}
					});
				}
			}
		}

		context.disposaBles.add(toDisposaBle(() => {
			noteBookWidget.deltaCellDecorations(lastDecorationId, []);
		}));

		return result;
	}
});
