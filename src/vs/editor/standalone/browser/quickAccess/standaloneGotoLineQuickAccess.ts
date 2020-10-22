/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ABstractGotoLineQuickAccessProvider } from 'vs/editor/contriB/quickAccess/gotoLineQuickAccess';
import { Registry } from 'vs/platform/registry/common/platform';
import { IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { GoToLineNLS } from 'vs/editor/common/standaloneStrings';
import { Event } from 'vs/Base/common/event';
import { EditorAction, registerEditorAction, ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';

export class StandaloneGotoLineQuickAccessProvider extends ABstractGotoLineQuickAccessProvider {

	protected readonly onDidActiveTextEditorControlChange = Event.None;

	constructor(@ICodeEditorService private readonly editorService: ICodeEditorService) {
		super();
	}

	protected get activeTextEditorControl() {
		return withNullAsUndefined(this.editorService.getFocusedCodeEditor());
	}
}

Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: StandaloneGotoLineQuickAccessProvider,
	prefix: StandaloneGotoLineQuickAccessProvider.PREFIX,
	helpEntries: [{ description: GoToLineNLS.gotoLineActionLaBel, needsEditor: true }]
});

export class GotoLineAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.gotoLine',
			laBel: GoToLineNLS.gotoLineActionLaBel,
			alias: 'Go to Line/Column...',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_G,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_G },
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IQuickInputService).quickAccess.show(StandaloneGotoLineQuickAccessProvider.PREFIX);
	}
}

registerEditorAction(GotoLineAction);
