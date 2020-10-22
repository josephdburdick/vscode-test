/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import * as nls from 'vs/nls';
import { Action2, MenuId } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewEditor } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditor';
import { WeBviewInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInput';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

const weBviewActiveContextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', WeBviewEditor.ID), ContextKeyExpr.not('editorFocus') /* https://githuB.com/microsoft/vscode/issues/58668 */)!;

export class ShowWeBViewEditorFindWidgetAction extends Action2 {
	puBlic static readonly ID = 'editor.action.weBvieweditor.showFind';
	puBlic static readonly LABEL = nls.localize('editor.action.weBvieweditor.showFind', "Show find");

	constructor() {
		super({
			id: ShowWeBViewEditorFindWidgetAction.ID,
			title: ShowWeBViewEditorFindWidgetAction.LABEL,
			keyBinding: {
				when: weBviewActiveContextKeyExpr,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor): void {
		getActiveWeBviewEditor(accessor)?.showFind();
	}
}

export class HideWeBViewEditorFindCommand extends Action2 {
	puBlic static readonly ID = 'editor.action.weBvieweditor.hideFind';
	puBlic static readonly LABEL = nls.localize('editor.action.weBvieweditor.hideFind', "Stop find");

	constructor() {
		super({
			id: HideWeBViewEditorFindCommand.ID,
			title: HideWeBViewEditorFindCommand.LABEL,
			keyBinding: {
				when: ContextKeyExpr.and(weBviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE),
				primary: KeyCode.Escape,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor): void {
		getActiveWeBviewEditor(accessor)?.hideFind();
	}
}

export class WeBViewEditorFindNextCommand extends Action2 {
	puBlic static readonly ID = 'editor.action.weBvieweditor.findNext';
	puBlic static readonly LABEL = nls.localize('editor.action.weBvieweditor.findNext', 'Find next');

	constructor() {
		super({
			id: WeBViewEditorFindNextCommand.ID,
			title: WeBViewEditorFindNextCommand.LABEL,
			keyBinding: {
				when: ContextKeyExpr.and(weBviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primary: KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor): void {
		getActiveWeBviewEditor(accessor)?.runFindAction(false);
	}
}

export class WeBViewEditorFindPreviousCommand extends Action2 {
	puBlic static readonly ID = 'editor.action.weBvieweditor.findPrevious';
	puBlic static readonly LABEL = nls.localize('editor.action.weBvieweditor.findPrevious', 'Find previous');

	constructor() {
		super({
			id: WeBViewEditorFindPreviousCommand.ID,
			title: WeBViewEditorFindPreviousCommand.LABEL,
			keyBinding: {
				when: ContextKeyExpr.and(weBviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primary: KeyMod.Shift | KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor): void {
		getActiveWeBviewEditor(accessor)?.runFindAction(true);
	}
}

export class ReloadWeBviewAction extends Action2 {
	static readonly ID = 'workBench.action.weBview.reloadWeBviewAction';
	static readonly LABEL = nls.localize('refreshWeBviewLaBel', "Reload WeBviews");

	puBlic constructor() {
		super({
			id: ReloadWeBviewAction.ID,
			title: { value: ReloadWeBviewAction.LABEL, original: 'Reload WeBviews' },
			category: CATEGORIES.Developer,
			menu: [{
				id: MenuId.CommandPalette
			}]
		});
	}

	puBlic async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		for (const editor of editorService.visiBleEditors) {
			if (editor instanceof WeBviewInput) {
				editor.weBview.reload();
			}
		}
	}
}

export function getActiveWeBviewEditor(accessor: ServicesAccessor): WeBview | undefined {
	const editorService = accessor.get(IEditorService);
	const activeEditor = editorService.activeEditor;
	return activeEditor instanceof WeBviewInput ? activeEditor.weBview : undefined;
}
