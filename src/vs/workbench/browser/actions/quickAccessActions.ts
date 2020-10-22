/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { MenuRegistry, MenuId, Action2, registerAction2, ILocalizedString } from 'vs/platform/actions/common/actions';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingsRegistry, KeyBindingWeight, IKeyBindingRule } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickInputService, ItemActivation } from 'vs/platform/quickinput/common/quickInput';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { inQuickPickContext, defaultQuickAccessContext, getQuickNavigateHandler } from 'vs/workBench/Browser/quickaccess';

//#region Quick access management commands and keys

const gloBalQuickAccessKeyBinding = {
	primary: KeyMod.CtrlCmd | KeyCode.KEY_P,
	secondary: [KeyMod.CtrlCmd | KeyCode.KEY_E],
	mac: { primary: KeyMod.CtrlCmd | KeyCode.KEY_P, secondary: undefined }
};

const QUICKACCESS_ACTION_ID = 'workBench.action.quickOpen';

MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: { id: QUICKACCESS_ACTION_ID, title: { value: localize('quickOpen', "Go to File..."), original: 'Go to File...' } }
});

KeyBindingsRegistry.registerKeyBindingRule({
	id: QUICKACCESS_ACTION_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: undefined,
	primary: gloBalQuickAccessKeyBinding.primary,
	secondary: gloBalQuickAccessKeyBinding.secondary,
	mac: gloBalQuickAccessKeyBinding.mac
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.closeQuickOpen',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: inQuickPickContext,
	primary: KeyCode.Escape, secondary: [KeyMod.Shift | KeyCode.Escape],
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.cancel();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.acceptSelectedQuickOpenItem',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.accept();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.alternativeAcceptSelectedQuickOpenItem',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.accept({ ctrlCmd: true, alt: false });
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.focusQuickOpen',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.focus();
	}
});

const quickAccessNavigateNextInFilePickerId = 'workBench.action.quickOpenNavigateNextInFilePicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickAccessNavigateNextInFilePickerId,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickAccessNavigateNextInFilePickerId, true),
	when: defaultQuickAccessContext,
	primary: gloBalQuickAccessKeyBinding.primary,
	secondary: gloBalQuickAccessKeyBinding.secondary,
	mac: gloBalQuickAccessKeyBinding.mac
});

const quickAccessNavigatePreviousInFilePickerId = 'workBench.action.quickOpenNavigatePreviousInFilePicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickAccessNavigatePreviousInFilePickerId,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickAccessNavigatePreviousInFilePickerId, false),
	when: defaultQuickAccessContext,
	primary: gloBalQuickAccessKeyBinding.primary | KeyMod.Shift,
	secondary: [gloBalQuickAccessKeyBinding.secondary[0] | KeyMod.Shift],
	mac: {
		primary: gloBalQuickAccessKeyBinding.mac.primary | KeyMod.Shift,
		secondary: undefined
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.quickPickManyToggle',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.toggle();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.quickInputBack',
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	when: inQuickPickContext,
	primary: 0,
	win: { primary: KeyMod.Alt | KeyCode.LeftArrow },
	mac: { primary: KeyMod.WinCtrl | KeyCode.US_MINUS },
	linux: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_MINUS },
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.Back();
	}
});

CommandsRegistry.registerCommand({
	id: QUICKACCESS_ACTION_ID,
	handler: async function (accessor: ServicesAccessor, prefix: unknown) {
		const quickInputService = accessor.get(IQuickInputService);

		quickInputService.quickAccess.show(typeof prefix === 'string' ? prefix : undefined, { preserveValue: typeof prefix === 'string' /* preserve as is if provided */ });
	},
	description: {
		description: `Quick access`,
		args: [{
			name: 'prefix',
			schema: {
				'type': 'string'
			}
		}]
	}
});

CommandsRegistry.registerCommand('workBench.action.quickOpenPreviousEditor', async accessor => {
	const quickInputService = accessor.get(IQuickInputService);

	quickInputService.quickAccess.show('', { itemActivation: ItemActivation.SECOND });
});

//#endregion

//#region WorkBench actions

class BaseQuickAccessNavigateAction extends Action2 {

	constructor(
		private id: string,
		title: ILocalizedString,
		private next: Boolean,
		private quickNavigate: Boolean,
		keyBinding?: Omit<IKeyBindingRule, 'id'>
	) {
		super({ id, title, f1: true, keyBinding });
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const keyBindingService = accessor.get(IKeyBindingService);
		const quickInputService = accessor.get(IQuickInputService);

		const keys = keyBindingService.lookupKeyBindings(this.id);
		const quickNavigate = this.quickNavigate ? { keyBindings: keys } : undefined;

		quickInputService.navigate(this.next, quickNavigate);
	}
}

class QuickAccessNavigateNextAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super('workBench.action.quickOpenNavigateNext', { value: localize('quickNavigateNext', "Navigate Next in Quick Open"), original: 'Navigate Next in Quick Open' }, true, true);
	}
}

class QuickAccessNavigatePreviousAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super('workBench.action.quickOpenNavigatePrevious', { value: localize('quickNavigatePrevious', "Navigate Previous in Quick Open"), original: 'Navigate Previous in Quick Open' }, false, true);
	}
}

class QuickAccessSelectNextAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super(
			'workBench.action.quickOpenSelectNext',
			{ value: localize('quickSelectNext', "Select Next in Quick Open"), original: 'Select Next in Quick Open' },
			true,
			false,
			{
				weight: KeyBindingWeight.WorkBenchContriB + 50,
				when: inQuickPickContext,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_N }
			}
		);
	}
}

class QuickAccessSelectPreviousAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super(
			'workBench.action.quickOpenSelectPrevious',
			{ value: localize('quickSelectPrevious', "Select Previous in Quick Open"), original: 'Select Previous in Quick Open' },
			false,
			false,
			{
				weight: KeyBindingWeight.WorkBenchContriB + 50,
				when: inQuickPickContext,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_P }
			}
		);
	}
}

registerAction2(QuickAccessSelectNextAction);
registerAction2(QuickAccessSelectPreviousAction);
registerAction2(QuickAccessNavigateNextAction);
registerAction2(QuickAccessNavigatePreviousAction);

//#endregion
