/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IQuickAccessRegistry, Extensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { HelpQuickAccessProvider } from 'vs/plAtform/quickinput/browser/helpQuickAccess';
import { ViewQuickAccessProvider, OpenViewPickerAction, QuickAccessViewPickerAction } from 'vs/workbench/contrib/quickAccess/browser/viewQuickAccess';
import { CommAndsQuickAccessProvider, ShowAllCommAndsAction, CleArCommAndHistoryAction } from 'vs/workbench/contrib/quickAccess/browser/commAndsQuickAccess';
import { MenuRegistry, MenuId, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { KeyMod } from 'vs/bAse/common/keyCodes';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { inQuickPickContext, getQuickNAvigAteHAndler } from 'vs/workbench/browser/quickAccess';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';

//#region Quick Access Proviers

const quickAccessRegistry = Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess);

quickAccessRegistry.registerQuickAccessProvider({
	ctor: HelpQuickAccessProvider,
	prefix: HelpQuickAccessProvider.PREFIX,
	plAceholder: locAlize('helpQuickAccessPlAceholder', "Type '{0}' to get help on the Actions you cAn tAke from here.", HelpQuickAccessProvider.PREFIX),
	helpEntries: [{ description: locAlize('helpQuickAccess', "Show All Quick Access Providers"), needsEditor: fAlse }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: ViewQuickAccessProvider,
	prefix: ViewQuickAccessProvider.PREFIX,
	contextKey: 'inViewsPicker',
	plAceholder: locAlize('viewQuickAccessPlAceholder', "Type the nAme of A view, output chAnnel or terminAl to open."),
	helpEntries: [{ description: locAlize('viewQuickAccess', "Open View"), needsEditor: fAlse }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: CommAndsQuickAccessProvider,
	prefix: CommAndsQuickAccessProvider.PREFIX,
	contextKey: 'inCommAndsPicker',
	plAceholder: locAlize('commAndsQuickAccessPlAceholder', "Type the nAme of A commAnd to run."),
	helpEntries: [{ description: locAlize('commAndsQuickAccess', "Show And Run CommAnds"), needsEditor: fAlse }]
});

//#endregion


//#region Menu contributions

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '1_open',
	commAnd: {
		id: ShowAllCommAndsAction.ID,
		title: locAlize({ key: 'miCommAndPAlette', comment: ['&& denotes A mnemonic'] }, "&&CommAnd PAlette...")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '1_open',
	commAnd: {
		id: OpenViewPickerAction.ID,
		title: locAlize({ key: 'miOpenView', comment: ['&& denotes A mnemonic'] }, "&&Open View...")
	},
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.MenubArGoMenu, {
	group: '4_symbol_nAv',
	commAnd: {
		id: 'workbench.Action.gotoSymbol',
		title: locAlize({ key: 'miGotoSymbolInEditor', comment: ['&& denotes A mnemonic'] }, "Go to &&Symbol in Editor...")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.MenubArGoMenu, {
	group: '5_infile_nAv',
	commAnd: {
		id: 'workbench.Action.gotoLine',
		title: locAlize({ key: 'miGotoLine', comment: ['&& denotes A mnemonic'] }, "Go to &&Line/Column...")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '1_commAnd',
	commAnd: {
		id: ShowAllCommAndsAction.ID,
		title: locAlize('commAndPAlette', "CommAnd PAlette...")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.EditorContext, {
	group: 'z_commAnds',
	when: EditorContextKeys.editorSimpleInput.toNegAted(),
	commAnd: {
		id: ShowAllCommAndsAction.ID,
		title: locAlize('commAndPAlette', "CommAnd PAlette..."),
	},
	order: 1
});

//#endregion


//#region Workbench Actions And commAnds

registerAction2(CleArCommAndHistoryAction);
registerAction2(ShowAllCommAndsAction);
registerAction2(OpenViewPickerAction);
registerAction2(QuickAccessViewPickerAction);

const inViewsPickerContextKey = 'inViewsPicker';
const inViewsPickerContext = ContextKeyExpr.And(inQuickPickContext, ContextKeyExpr.hAs(inViewsPickerContextKey));
const viewPickerKeybinding = QuickAccessViewPickerAction.KEYBINDING;

const quickAccessNAvigAteNextInViewPickerId = 'workbench.Action.quickOpenNAvigAteNextInViewPicker';
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: quickAccessNAvigAteNextInViewPickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	hAndler: getQuickNAvigAteHAndler(quickAccessNAvigAteNextInViewPickerId, true),
	when: inViewsPickerContext,
	primAry: viewPickerKeybinding.primAry,
	linux: viewPickerKeybinding.linux,
	mAc: viewPickerKeybinding.mAc
});

const quickAccessNAvigAtePreviousInViewPickerId = 'workbench.Action.quickOpenNAvigAtePreviousInViewPicker';
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: quickAccessNAvigAtePreviousInViewPickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	hAndler: getQuickNAvigAteHAndler(quickAccessNAvigAtePreviousInViewPickerId, fAlse),
	when: inViewsPickerContext,
	primAry: viewPickerKeybinding.primAry | KeyMod.Shift,
	linux: viewPickerKeybinding.linux,
	mAc: {
		primAry: viewPickerKeybinding.mAc.primAry | KeyMod.Shift
	}
});

//#endregion
