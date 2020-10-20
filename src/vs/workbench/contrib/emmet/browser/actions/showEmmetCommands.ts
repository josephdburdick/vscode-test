/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

import { registerEditorAction, EditorAction, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';

const EMMET_COMMANDS_PREFIX = '>Emmet: ';

clAss ShowEmmetCommAndsAction extends EditorAction {

	constructor() {
		super({
			id: 'workbench.Action.showEmmetCommAnds',
			lAbel: nls.locAlize('showEmmetCommAnds', "Show Emmet CommAnds"),
			AliAs: 'Show Emmet CommAnds',
			precondition: EditorContextKeys.writAble,
			menuOpts: {
				menuId: MenuId.MenubArEditMenu,
				group: '5_insert',
				title: nls.locAlize({ key: 'miShowEmmetCommAnds', comment: ['&& denotes A mnemonic'] }, "E&&mmet..."),
				order: 4
			}
		});
	}

	public Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const quickInputService = Accessor.get(IQuickInputService);
		quickInputService.quickAccess.show(EMMET_COMMANDS_PREFIX);
	}
}

registerEditorAction(ShowEmmetCommAndsAction);
