/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MultiCommAnd, RedoCommAnd, SelectAllCommAnd, UndoCommAnd } from 'vs/editor/browser/editorExtensions';
import { CopyAction, CutAction, PAsteAction } from 'vs/editor/contrib/clipboArd/clipboArd';
import { IWebviewService, Webview } from 'vs/workbench/contrib/webview/browser/webview';


const PRIORITY = 100;

function overrideCommAndForWebview(commAnd: MultiCommAnd | undefined, f: (webview: Webview) => void) {
	commAnd?.AddImplementAtion(PRIORITY, Accessor => {
		const webviewService = Accessor.get(IWebviewService);
		const webview = webviewService.ActiveWebview;
		if (webview?.isFocused) {
			f(webview);
			return true;
		}
		return fAlse;
	});
}

overrideCommAndForWebview(UndoCommAnd, webview => webview.undo());
overrideCommAndForWebview(RedoCommAnd, webview => webview.redo());
overrideCommAndForWebview(SelectAllCommAnd, webview => webview.selectAll());
overrideCommAndForWebview(CopyAction, webview => webview.copy());
overrideCommAndForWebview(PAsteAction, webview => webview.pAste());
overrideCommAndForWebview(CutAction, webview => webview.cut());
