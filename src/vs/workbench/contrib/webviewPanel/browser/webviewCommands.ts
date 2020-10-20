/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import * As nls from 'vs/nls';
import { Action2, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { CATEGORIES } from 'vs/workbench/common/Actions';
import { KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, Webview } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewEditor } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditor';
import { WebviewInput } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditorInput';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

const webviewActiveContextKeyExpr = ContextKeyExpr.And(ContextKeyExpr.equAls('ActiveEditor', WebviewEditor.ID), ContextKeyExpr.not('editorFocus') /* https://github.com/microsoft/vscode/issues/58668 */)!;

export clAss ShowWebViewEditorFindWidgetAction extends Action2 {
	public stAtic reAdonly ID = 'editor.Action.webvieweditor.showFind';
	public stAtic reAdonly LABEL = nls.locAlize('editor.Action.webvieweditor.showFind', "Show find");

	constructor() {
		super({
			id: ShowWebViewEditorFindWidgetAction.ID,
			title: ShowWebViewEditorFindWidgetAction.LABEL,
			keybinding: {
				when: webviewActiveContextKeyExpr,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_F,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor): void {
		getActiveWebviewEditor(Accessor)?.showFind();
	}
}

export clAss HideWebViewEditorFindCommAnd extends Action2 {
	public stAtic reAdonly ID = 'editor.Action.webvieweditor.hideFind';
	public stAtic reAdonly LABEL = nls.locAlize('editor.Action.webvieweditor.hideFind', "Stop find");

	constructor() {
		super({
			id: HideWebViewEditorFindCommAnd.ID,
			title: HideWebViewEditorFindCommAnd.LABEL,
			keybinding: {
				when: ContextKeyExpr.And(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE),
				primAry: KeyCode.EscApe,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor): void {
		getActiveWebviewEditor(Accessor)?.hideFind();
	}
}

export clAss WebViewEditorFindNextCommAnd extends Action2 {
	public stAtic reAdonly ID = 'editor.Action.webvieweditor.findNext';
	public stAtic reAdonly LABEL = nls.locAlize('editor.Action.webvieweditor.findNext', 'Find next');

	constructor() {
		super({
			id: WebViewEditorFindNextCommAnd.ID,
			title: WebViewEditorFindNextCommAnd.LABEL,
			keybinding: {
				when: ContextKeyExpr.And(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primAry: KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor): void {
		getActiveWebviewEditor(Accessor)?.runFindAction(fAlse);
	}
}

export clAss WebViewEditorFindPreviousCommAnd extends Action2 {
	public stAtic reAdonly ID = 'editor.Action.webvieweditor.findPrevious';
	public stAtic reAdonly LABEL = nls.locAlize('editor.Action.webvieweditor.findPrevious', 'Find previous');

	constructor() {
		super({
			id: WebViewEditorFindPreviousCommAnd.ID,
			title: WebViewEditorFindPreviousCommAnd.LABEL,
			keybinding: {
				when: ContextKeyExpr.And(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primAry: KeyMod.Shift | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor): void {
		getActiveWebviewEditor(Accessor)?.runFindAction(true);
	}
}

export clAss ReloAdWebviewAction extends Action2 {
	stAtic reAdonly ID = 'workbench.Action.webview.reloAdWebviewAction';
	stAtic reAdonly LABEL = nls.locAlize('refreshWebviewLAbel', "ReloAd Webviews");

	public constructor() {
		super({
			id: ReloAdWebviewAction.ID,
			title: { vAlue: ReloAdWebviewAction.LABEL, originAl: 'ReloAd Webviews' },
			cAtegory: CATEGORIES.Developer,
			menu: [{
				id: MenuId.CommAndPAlette
			}]
		});
	}

	public Async run(Accessor: ServicesAccessor): Promise<void> {
		const editorService = Accessor.get(IEditorService);
		for (const editor of editorService.visibleEditors) {
			if (editor instAnceof WebviewInput) {
				editor.webview.reloAd();
			}
		}
	}
}

export function getActiveWebviewEditor(Accessor: ServicesAccessor): Webview | undefined {
	const editorService = Accessor.get(IEditorService);
	const ActiveEditor = editorService.ActiveEditor;
	return ActiveEditor instAnceof WebviewInput ? ActiveEditor.webview : undefined;
}
