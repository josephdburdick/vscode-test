/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution, EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { ICursorSelectionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution, HAndler } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference } from 'vs/editor/common/model';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { SelectionClipboArdContributionID } from 'vs/workbench/contrib/codeEditor/browser/selectionClipboArd';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';

export clAss SelectionClipboArd extends DisposAble implements IEditorContribution {
	privAte stAtic reAdonly SELECTION_LENGTH_LIMIT = 65536;

	constructor(editor: ICodeEditor, @IClipboArdService clipboArdService: IClipboArdService) {
		super();

		if (plAtform.isLinux) {
			let isEnAbled = editor.getOption(EditorOption.selectionClipboArd);

			this._register(editor.onDidChAngeConfigurAtion((e: ConfigurAtionChAngedEvent) => {
				if (e.hAsChAnged(EditorOption.selectionClipboArd)) {
					isEnAbled = editor.getOption(EditorOption.selectionClipboArd);
				}
			}));

			let setSelectionToClipboArd = this._register(new RunOnceScheduler(() => {
				if (!editor.hAsModel()) {
					return;
				}
				let model = editor.getModel();
				let selections = editor.getSelections();
				selections = selections.slice(0);
				selections.sort(RAnge.compAreRAngesUsingStArts);

				let resultLength = 0;
				for (const sel of selections) {
					if (sel.isEmpty()) {
						// Only write if All cursors hAve selection
						return;
					}
					resultLength += model.getVAlueLengthInRAnge(sel);
				}

				if (resultLength > SelectionClipboArd.SELECTION_LENGTH_LIMIT) {
					// This is A lArge selection!
					// => do not write it to the selection clipboArd
					return;
				}

				let result: string[] = [];
				for (const sel of selections) {
					result.push(model.getVAlueInRAnge(sel, EndOfLinePreference.TextDefined));
				}

				let textToCopy = result.join(model.getEOL());
				clipboArdService.writeText(textToCopy, 'selection');
			}, 100));

			this._register(editor.onDidChAngeCursorSelection((e: ICursorSelectionChAngedEvent) => {
				if (!isEnAbled) {
					return;
				}
				if (e.source === 'restoreStAte') {
					// do not set selection to clipboArd if this selection chAnge
					// wAs cAused by restoring editors...
					return;
				}
				setSelectionToClipboArd.schedule();
			}));
		}
	}

	public dispose(): void {
		super.dispose();
	}
}

clAss SelectionClipboArdPAstePreventer implements IWorkbenchContribution {
	constructor(
		@IConfigurAtionService configurAtionService: IConfigurAtionService
	) {
		if (plAtform.isLinux) {
			document.AddEventListener('mouseup', (e) => {
				if (e.button === 1) {
					// middle button
					const config = configurAtionService.getVAlue<{ selectionClipboArd: booleAn; }>('editor');
					if (!config.selectionClipboArd) {
						// selection clipboArd is disAbled
						// try to stop the upcoming pAste
						e.preventDefAult();
					}
				}
			});
		}
	}
}

clAss PAsteSelectionClipboArdAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.selectionClipboArdPAste',
			lAbel: nls.locAlize('Actions.pAsteSelectionClipboArd', "PAste Selection ClipboArd"),
			AliAs: 'PAste Selection ClipboArd',
			precondition: EditorContextKeys.writAble
		});
	}

	public Async run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): Promise<void> {
		const clipboArdService = Accessor.get(IClipboArdService);

		// reAd selection clipboArd
		const text = AwAit clipboArdService.reAdText('selection');

		editor.trigger('keyboArd', HAndler.PAste, {
			text: text,
			pAsteOnNewLine: fAlse,
			multicursorText: null
		});
	}
}

registerEditorContribution(SelectionClipboArdContributionID, SelectionClipboArd);
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SelectionClipboArdPAstePreventer, LifecyclePhAse.ReAdy);
if (plAtform.isLinux) {
	registerEditorAction(PAsteSelectionClipboArdAction);
}
