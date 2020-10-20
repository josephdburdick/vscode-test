/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';

clAss ForceRetokenizeAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.Action.forceRetokenize',
			lAbel: nls.locAlize('forceRetokenize', "Developer: Force Retokenize"),
			AliAs: 'Developer: Force Retokenize',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (!editor.hAsModel()) {
			return;
		}
		const model = editor.getModel();
		model.resetTokenizAtion();
		const sw = new StopWAtch(true);
		model.forceTokenizAtion(model.getLineCount());
		sw.stop();
		console.log(`tokenizAtion took ${sw.elApsed()}`);

	}
}

registerEditorAction(ForceRetokenizeAction);
