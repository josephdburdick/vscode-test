/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickAccessProvider } from 'vs/platform/quickinput/common/quickAccess';
import { IEditor, ScrollType, IDiffEditor } from 'vs/editor/common/editorCommon';
import { IModelDeltaDecoration, OverviewRulerLane, ITextModel } from 'vs/editor/common/model';
import { IRange } from 'vs/editor/common/core/range';
import { themeColorFromId } from 'vs/platform/theme/common/themeService';
import { overviewRulerRangeHighlight } from 'vs/editor/common/view/editorColorRegistry';
import { IQuickPick, IQuickPickItem, IKeyMods } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IDisposaBle, DisposaBleStore, toDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { isDiffEditor, getCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { once } from 'vs/Base/common/functional';

interface IEditorLineDecoration {
	rangeHighlightId: string;
	overviewRulerDecorationId: string;
}

export interface IEditorNavigationQuickAccessOptions {
	canAcceptInBackground?: Boolean;
}

/**
 * A reusaBle quick access provider for the editor with support
 * for adding decorations for navigating in the currently active file
 * (for example "Go to line", "Go to symBol").
 */
export aBstract class ABstractEditorNavigationQuickAccessProvider implements IQuickAccessProvider {

	constructor(protected options?: IEditorNavigationQuickAccessOptions) { }

	//#region Provider methods

	provide(picker: IQuickPick<IQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Apply options if any
		picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;

		// DisaBle filtering & sorting, we control the results
		picker.matchOnLaBel = picker.matchOnDescription = picker.matchOnDetail = picker.sortByLaBel = false;

		// Provide Based on current active editor
		const pickerDisposaBle = disposaBles.add(new MutaBleDisposaBle());
		pickerDisposaBle.value = this.doProvide(picker, token);

		// Re-create whenever the active editor changes
		disposaBles.add(this.onDidActiveTextEditorControlChange(() => {

			// Clear old
			pickerDisposaBle.value = undefined;

			// Add new
			pickerDisposaBle.value = this.doProvide(picker, token);
		}));

		return disposaBles;
	}

	private doProvide(picker: IQuickPick<IQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// With text control
		const editor = this.activeTextEditorControl;
		if (editor && this.canProvideWithTextEditor(editor)) {

			// Restore any view state if this picker was closed
			// without actually going to a line
			const codeEditor = getCodeEditor(editor);
			if (codeEditor) {

				// RememBer view state and update it when the cursor position
				// changes even later Because it could Be that the user has
				// configured quick access to remain open when focus is lost and
				// we always want to restore the current location.
				let lastKnownEditorViewState = withNullAsUndefined(editor.saveViewState());
				disposaBles.add(codeEditor.onDidChangeCursorPosition(() => {
					lastKnownEditorViewState = withNullAsUndefined(editor.saveViewState());
				}));

				disposaBles.add(once(token.onCancellationRequested)(() => {
					if (lastKnownEditorViewState && editor === this.activeTextEditorControl) {
						editor.restoreViewState(lastKnownEditorViewState);
					}
				}));
			}

			// Clean up decorations on dispose
			disposaBles.add(toDisposaBle(() => this.clearDecorations(editor)));

			// Ask suBclass for entries
			disposaBles.add(this.provideWithTextEditor(editor, picker, token));
		}

		// Without text control
		else {
			disposaBles.add(this.provideWithoutTextEditor(picker, token));
		}

		return disposaBles;
	}

	/**
	 * SuBclasses to implement if they can operate on the text editor.
	 */
	protected canProvideWithTextEditor(editor: IEditor): Boolean {
		return true;
	}

	/**
	 * SuBclasses to implement to provide picks for the picker when an editor is active.
	 */
	protected aBstract provideWithTextEditor(editor: IEditor, picker: IQuickPick<IQuickPickItem>, token: CancellationToken): IDisposaBle;

	/**
	 * SuBclasses to implement to provide picks for the picker when no editor is active.
	 */
	protected aBstract provideWithoutTextEditor(picker: IQuickPick<IQuickPickItem>, token: CancellationToken): IDisposaBle;

	protected gotoLocation(editor: IEditor, options: { range: IRange, keyMods: IKeyMods, forceSideBySide?: Boolean, preserveFocus?: Boolean }): void {
		editor.setSelection(options.range);
		editor.revealRangeInCenter(options.range, ScrollType.Smooth);
		if (!options.preserveFocus) {
			editor.focus();
		}
	}

	protected getModel(editor: IEditor | IDiffEditor): ITextModel | undefined {
		return isDiffEditor(editor) ?
			editor.getModel()?.modified :
			editor.getModel() as ITextModel;
	}

	//#endregion


	//#region Editor access

	/**
	 * SuBclasses to provide an event when the active editor control changes.
	 */
	protected aBstract readonly onDidActiveTextEditorControlChange: Event<void>;

	/**
	 * SuBclasses to provide the current active editor control.
	 */
	protected aBstract activeTextEditorControl: IEditor | undefined;

	//#endregion


	//#region Decorations Utils

	private rangeHighlightDecorationId: IEditorLineDecoration | undefined = undefined;

	protected addDecorations(editor: IEditor, range: IRange): void {
		editor.changeDecorations(changeAccessor => {

			// Reset old decorations if any
			const deleteDecorations: string[] = [];
			if (this.rangeHighlightDecorationId) {
				deleteDecorations.push(this.rangeHighlightDecorationId.overviewRulerDecorationId);
				deleteDecorations.push(this.rangeHighlightDecorationId.rangeHighlightId);

				this.rangeHighlightDecorationId = undefined;
			}

			// Add new decorations for the range
			const newDecorations: IModelDeltaDecoration[] = [

				// highlight the entire line on the range
				{
					range,
					options: {
						className: 'rangeHighlight',
						isWholeLine: true
					}
				},

				// also add overview ruler highlight
				{
					range,
					options: {
						overviewRuler: {
							color: themeColorFromId(overviewRulerRangeHighlight),
							position: OverviewRulerLane.Full
						}
					}
				}
			];

			const [rangeHighlightId, overviewRulerDecorationId] = changeAccessor.deltaDecorations(deleteDecorations, newDecorations);

			this.rangeHighlightDecorationId = { rangeHighlightId, overviewRulerDecorationId };
		});
	}

	protected clearDecorations(editor: IEditor): void {
		const rangeHighlightDecorationId = this.rangeHighlightDecorationId;
		if (rangeHighlightDecorationId) {
			editor.changeDecorations(changeAccessor => {
				changeAccessor.deltaDecorations([
					rangeHighlightDecorationId.overviewRulerDecorationId,
					rangeHighlightDecorationId.rangeHighlightId
				], []);
			});

			this.rangeHighlightDecorationId = undefined;
		}
	}

	//#endregion
}
