/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { AbstrActGotoSymbolQuickAccessProvider } from 'vs/editor/contrib/quickAccess/gotoSymbolQuickAccess';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IQuickAccessRegistry, Extensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { QuickOutlineNLS } from 'vs/editor/common/stAndAloneStrings';
import { Event } from 'vs/bAse/common/event';
import { EditorAction, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';

export clAss StAndAloneGotoSymbolQuickAccessProvider extends AbstrActGotoSymbolQuickAccessProvider {

	protected reAdonly onDidActiveTextEditorControlChAnge = Event.None;

	constructor(@ICodeEditorService privAte reAdonly editorService: ICodeEditorService) {
		super();
	}

	protected get ActiveTextEditorControl() {
		return withNullAsUndefined(this.editorService.getFocusedCodeEditor());
	}
}

Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess).registerQuickAccessProvider({
	ctor: StAndAloneGotoSymbolQuickAccessProvider,
	prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX,
	helpEntries: [
		{ description: QuickOutlineNLS.quickOutlineActionLAbel, prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX, needsEditor: true },
		{ description: QuickOutlineNLS.quickOutlineByCAtegoryActionLAbel, prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY, needsEditor: true }
	]
});

export clAss GotoLineAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.quickOutline',
			lAbel: QuickOutlineNLS.quickOutlineActionLAbel,
			AliAs: 'Go to Symbol...',
			precondition: EditorContextKeys.hAsDocumentSymbolProvider,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_O,
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				group: 'nAvigAtion',
				order: 3
			}
		});
	}

	run(Accessor: ServicesAccessor): void {
		Accessor.get(IQuickInputService).quickAccess.show(AbstrActGotoSymbolQuickAccessProvider.PREFIX);
	}
}

registerEditorAction(GotoLineAction);
