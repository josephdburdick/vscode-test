/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';

import { registerEditorAction, EditorAction, ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { MenuId } from 'vs/platform/actions/common/actions';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';

const EMMET_COMMANDS_PREFIX = '>Emmet: ';

class ShowEmmetCommandsAction extends EditorAction {

	constructor() {
		super({
			id: 'workBench.action.showEmmetCommands',
			laBel: nls.localize('showEmmetCommands', "Show Emmet Commands"),
			alias: 'Show Emmet Commands',
			precondition: EditorContextKeys.writaBle,
			menuOpts: {
				menuId: MenuId.MenuBarEditMenu,
				group: '5_insert',
				title: nls.localize({ key: 'miShowEmmetCommands', comment: ['&& denotes a mnemonic'] }, "E&&mmet..."),
				order: 4
			}
		});
	}

	puBlic async run(accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.quickAccess.show(EMMET_COMMANDS_PREFIX);
	}
}

registerEditorAction(ShowEmmetCommandsAction);
