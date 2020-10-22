/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CopyAction, CutAction, PasteAction } from 'vs/editor/contriB/clipBoard/clipBoard';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { getActiveNoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { ElectronWeBviewBasedWeBview } from 'vs/workBench/contriB/weBview/electron-Browser/weBviewElement';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { UndoCommand, RedoCommand } from 'vs/editor/Browser/editorExtensions';

function getFocusedElectronBasedWeBviewDelegate(accessor: ServicesAccessor): ElectronWeBviewBasedWeBview | undefined {
	const editorService = accessor.get(IEditorService);
	const editor = getActiveNoteBookEditor(editorService);
	if (!editor?.hasFocus()) {
		return;
	}

	if (!editor?.hasWeBviewFocus()) {
		return;
	}

	const weBview = editor?.getInnerWeBview();
	if (weBview && weBview instanceof ElectronWeBviewBasedWeBview) {
		return weBview;
	}
	return;
}

function withWeBview(accessor: ServicesAccessor, f: (weBviewe: ElectronWeBviewBasedWeBview) => void) {
	const weBview = getFocusedElectronBasedWeBviewDelegate(accessor);
	if (weBview) {
		f(weBview);
		return true;
	}
	return false;
}

const PRIORITY = 100;

UndoCommand.addImplementation(PRIORITY, accessor => {
	return withWeBview(accessor, weBview => weBview.undo());
});

RedoCommand.addImplementation(PRIORITY, accessor => {
	return withWeBview(accessor, weBview => weBview.redo());
});

CopyAction?.addImplementation(PRIORITY, accessor => {
	return withWeBview(accessor, weBview => weBview.copy());
});

PasteAction?.addImplementation(PRIORITY, accessor => {
	return withWeBview(accessor, weBview => weBview.paste());
});

CutAction?.addImplementation(PRIORITY, accessor => {
	return withWeBview(accessor, weBview => weBview.cut());
});

