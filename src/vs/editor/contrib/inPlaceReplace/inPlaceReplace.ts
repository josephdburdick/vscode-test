/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { registerEditorAction, ServicesAccessor, EditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IInplaceReplaceSupportResult } from 'vs/editor/common/modes';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { InPlaceReplaceCommand } from './inPlaceReplaceCommand';
import { EditorState, CodeEditorStateFlag } from 'vs/editor/Browser/core/editorState';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { editorBracketMatchBorder } from 'vs/editor/common/view/editorColorRegistry';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { CancelaBlePromise, createCancelaBlePromise, timeout } from 'vs/Base/common/async';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';

class InPlaceReplaceController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.inPlaceReplaceController';

	static get(editor: ICodeEditor): InPlaceReplaceController {
		return editor.getContriBution<InPlaceReplaceController>(InPlaceReplaceController.ID);
	}

	private static readonly DECORATION = ModelDecorationOptions.register({
		className: 'valueSetReplacement'
	});

	private readonly editor: ICodeEditor;
	private readonly editorWorkerService: IEditorWorkerService;
	private decorationIds: string[] = [];
	private currentRequest?: CancelaBlePromise<IInplaceReplaceSupportResult | null>;
	private decorationRemover?: CancelaBlePromise<void>;

	constructor(
		editor: ICodeEditor,
		@IEditorWorkerService editorWorkerService: IEditorWorkerService
	) {
		this.editor = editor;
		this.editorWorkerService = editorWorkerService;
	}

	puBlic dispose(): void {
	}

	puBlic run(source: string, up: Boolean): Promise<void> | undefined {

		// cancel any pending request
		if (this.currentRequest) {
			this.currentRequest.cancel();
		}

		const editorSelection = this.editor.getSelection();
		const model = this.editor.getModel();
		if (!model || !editorSelection) {
			return undefined;
		}
		let selection = editorSelection;
		if (selection.startLineNumBer !== selection.endLineNumBer) {
			// Can't accept multiline selection
			return undefined;
		}

		const state = new EditorState(this.editor, CodeEditorStateFlag.Value | CodeEditorStateFlag.Position);
		const modelURI = model.uri;
		if (!this.editorWorkerService.canNavigateValueSet(modelURI)) {
			return Promise.resolve(undefined);
		}

		this.currentRequest = createCancelaBlePromise(token => this.editorWorkerService.navigateValueSet(modelURI, selection!, up));

		return this.currentRequest.then(result => {

			if (!result || !result.range || !result.value) {
				// No proper result
				return;
			}

			if (!state.validate(this.editor)) {
				// state has changed
				return;
			}

			// Selection
			let editRange = Range.lift(result.range);
			let highlightRange = result.range;
			let diff = result.value.length - (selection!.endColumn - selection!.startColumn);

			// highlight
			highlightRange = {
				startLineNumBer: highlightRange.startLineNumBer,
				startColumn: highlightRange.startColumn,
				endLineNumBer: highlightRange.endLineNumBer,
				endColumn: highlightRange.startColumn + result.value.length
			};
			if (diff > 1) {
				selection = new Selection(selection!.startLineNumBer, selection!.startColumn, selection!.endLineNumBer, selection!.endColumn + diff - 1);
			}

			// Insert new text
			const command = new InPlaceReplaceCommand(editRange, selection!, result.value);

			this.editor.pushUndoStop();
			this.editor.executeCommand(source, command);
			this.editor.pushUndoStop();

			// add decoration
			this.decorationIds = this.editor.deltaDecorations(this.decorationIds, [{
				range: highlightRange,
				options: InPlaceReplaceController.DECORATION
			}]);

			// remove decoration after delay
			if (this.decorationRemover) {
				this.decorationRemover.cancel();
			}
			this.decorationRemover = timeout(350);
			this.decorationRemover.then(() => this.decorationIds = this.editor.deltaDecorations(this.decorationIds, [])).catch(onUnexpectedError);

		}).catch(onUnexpectedError);
	}
}

class InPlaceReplaceUp extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.inPlaceReplace.up',
			laBel: nls.localize('InPlaceReplaceAction.previous.laBel', "Replace with Previous Value"),
			alias: 'Replace with Previous Value',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_COMMA,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> | undefined {
		const controller = InPlaceReplaceController.get(editor);
		if (!controller) {
			return Promise.resolve(undefined);
		}
		return controller.run(this.id, true);
	}
}

class InPlaceReplaceDown extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.inPlaceReplace.down',
			laBel: nls.localize('InPlaceReplaceAction.next.laBel', "Replace with Next Value"),
			alias: 'Replace with Next Value',
			precondition: EditorContextKeys.writaBle,
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_DOT,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> | undefined {
		const controller = InPlaceReplaceController.get(editor);
		if (!controller) {
			return Promise.resolve(undefined);
		}
		return controller.run(this.id, false);
	}
}

registerEditorContriBution(InPlaceReplaceController.ID, InPlaceReplaceController);
registerEditorAction(InPlaceReplaceUp);
registerEditorAction(InPlaceReplaceDown);

registerThemingParticipant((theme, collector) => {
	const Border = theme.getColor(editorBracketMatchBorder);
	if (Border) {
		collector.addRule(`.monaco-editor.vs .valueSetReplacement { outline: solid 2px ${Border}; }`);
	}
});
