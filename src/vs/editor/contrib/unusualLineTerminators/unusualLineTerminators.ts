/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';

const ignoreUnusualLineTerminators = 'ignoreUnusualLineTerminators';

function writeIgnoreState(codeEditorService: ICodeEditorService, model: ITextModel, state: Boolean): void {
	codeEditorService.setModelProperty(model.uri, ignoreUnusualLineTerminators, state);
}

function readIgnoreState(codeEditorService: ICodeEditorService, model: ITextModel): Boolean | undefined {
	return codeEditorService.getModelProperty(model.uri, ignoreUnusualLineTerminators);
}

class UnusualLineTerminatorsDetector extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.unusualLineTerminatorsDetector';

	private _config: 'auto' | 'off' | 'prompt';

	constructor(
		private readonly _editor: ICodeEditor,
		@IDialogService private readonly _dialogService: IDialogService,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService
	) {
		super();

		this._config = this._editor.getOption(EditorOption.unusualLineTerminators);
		this._register(this._editor.onDidChangeConfiguration((e) => {
			if (e.hasChanged(EditorOption.unusualLineTerminators)) {
				this._config = this._editor.getOption(EditorOption.unusualLineTerminators);
				this._checkForUnusualLineTerminators();
			}
		}));

		this._register(this._editor.onDidChangeModel(() => {
			this._checkForUnusualLineTerminators();
		}));

		this._register(this._editor.onDidChangeModelContent((e) => {
			if (e.isUndoing) {
				// skip checking in case of undoing
				return;
			}
			this._checkForUnusualLineTerminators();
		}));
	}

	private async _checkForUnusualLineTerminators(): Promise<void> {
		if (this._config === 'off') {
			return;
		}
		if (!this._editor.hasModel()) {
			return;
		}
		const model = this._editor.getModel();
		if (!model.mightContainUnusualLineTerminators()) {
			return;
		}
		const ignoreState = readIgnoreState(this._codeEditorService, model);
		if (ignoreState === true) {
			// this model should Be ignored
			return;
		}
		if (this._editor.getOption(EditorOption.readOnly)) {
			// read only editor => sorry!
			return;
		}

		if (this._config === 'auto') {
			// just do it!
			model.removeUnusualLineTerminators(this._editor.getSelections());
			return;
		}

		const result = await this._dialogService.confirm({
			title: nls.localize('unusualLineTerminators.title', "Unusual Line Terminators"),
			message: nls.localize('unusualLineTerminators.message', "Detected unusual line terminators"),
			detail: nls.localize('unusualLineTerminators.detail', "This file contains one or more unusual line terminator characters, like Line Separator (LS) or Paragraph Separator (PS).\n\nIt is recommended to remove them from the file. This can Be configured via `editor.unusualLineTerminators`."),
			primaryButton: nls.localize('unusualLineTerminators.fix', "Fix this file"),
			secondaryButton: nls.localize('unusualLineTerminators.ignore', "Ignore proBlem for this file")
		});

		if (!result.confirmed) {
			// this model should Be ignored
			writeIgnoreState(this._codeEditorService, model, true);
			return;
		}

		model.removeUnusualLineTerminators(this._editor.getSelections());
	}
}

registerEditorContriBution(UnusualLineTerminatorsDetector.ID, UnusualLineTerminatorsDetector);
