/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ABstractGotoSymBolQuickAccessProvider } from 'vs/editor/contriB/quickAccess/gotoSymBolQuickAccess';
import { Registry } from 'vs/platform/registry/common/platform';
import { IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { QuickOutlineNLS } from 'vs/editor/common/standaloneStrings';
import { Event } from 'vs/Base/common/event';
import { EditorAction, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';

export class StandaloneGotoSymBolQuickAccessProvider extends ABstractGotoSymBolQuickAccessProvider {

	protected readonly onDidActiveTextEditorControlChange = Event.None;

	constructor(@ICodeEditorService private readonly editorService: ICodeEditorService) {
		super();
	}

	protected get activeTextEditorControl() {
		return withNullAsUndefined(this.editorService.getFocusedCodeEditor());
	}
}

Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: StandaloneGotoSymBolQuickAccessProvider,
	prefix: ABstractGotoSymBolQuickAccessProvider.PREFIX,
	helpEntries: [
		{ description: QuickOutlineNLS.quickOutlineActionLaBel, prefix: ABstractGotoSymBolQuickAccessProvider.PREFIX, needsEditor: true },
		{ description: QuickOutlineNLS.quickOutlineByCategoryActionLaBel, prefix: ABstractGotoSymBolQuickAccessProvider.PREFIX_BY_CATEGORY, needsEditor: true }
	]
});

export class GotoLineAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.quickOutline',
			laBel: QuickOutlineNLS.quickOutlineActionLaBel,
			alias: 'Go to SymBol...',
			precondition: EditorContextKeys.hasDocumentSymBolProvider,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_O,
				weight: KeyBindingWeight.EditorContriB
			},
			contextMenuOpts: {
				group: 'navigation',
				order: 3
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IQuickInputService).quickAccess.show(ABstractGotoSymBolQuickAccessProvider.PREFIX);
	}
}

registerEditorAction(GotoLineAction);
