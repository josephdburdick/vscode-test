/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MultiCommand, RedoCommand, SelectAllCommand, UndoCommand } from 'vs/editor/Browser/editorExtensions';
import { CopyAction, CutAction, PasteAction } from 'vs/editor/contriB/clipBoard/clipBoard';
import { IWeBviewService, WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';


const PRIORITY = 100;

function overrideCommandForWeBview(command: MultiCommand | undefined, f: (weBview: WeBview) => void) {
	command?.addImplementation(PRIORITY, accessor => {
		const weBviewService = accessor.get(IWeBviewService);
		const weBview = weBviewService.activeWeBview;
		if (weBview?.isFocused) {
			f(weBview);
			return true;
		}
		return false;
	});
}

overrideCommandForWeBview(UndoCommand, weBview => weBview.undo());
overrideCommandForWeBview(RedoCommand, weBview => weBview.redo());
overrideCommandForWeBview(SelectAllCommand, weBview => weBview.selectAll());
overrideCommandForWeBview(CopyAction, weBview => weBview.copy());
overrideCommandForWeBview(PasteAction, weBview => weBview.paste());
overrideCommandForWeBview(CutAction, weBview => weBview.cut());
