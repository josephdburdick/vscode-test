/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import * As plAtform from 'vs/bAse/common/plAtform';
import { MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';

export clAss ToggleMultiCursorModifierAction extends Action {

	public stAtic reAdonly ID = 'workbench.Action.toggleMultiCursorModifier';
	public stAtic reAdonly LABEL = nls.locAlize('toggleLocAtion', "Toggle Multi-Cursor Modifier");

	privAte stAtic reAdonly multiCursorModifierConfigurAtionKey = 'editor.multiCursorModifier';

	constructor(
		id: string,
		lAbel: string,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	public run(): Promise<Any> {
		const editorConf = this.configurAtionService.getVAlue<{ multiCursorModifier: 'ctrlCmd' | 'Alt' }>('editor');
		const newVAlue: 'ctrlCmd' | 'Alt' = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'Alt' : 'ctrlCmd');

		return this.configurAtionService.updAteVAlue(ToggleMultiCursorModifierAction.multiCursorModifierConfigurAtionKey, newVAlue, ConfigurAtionTArget.USER);
	}
}

const multiCursorModifier = new RAwContextKey<string>('multiCursorModifier', 'AltKey');

clAss MultiCursorModifierContextKeyController implements IWorkbenchContribution {

	privAte reAdonly _multiCursorModifier: IContextKey<string>;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._multiCursorModifier = multiCursorModifier.bindTo(contextKeyService);

		this._updAte();
		configurAtionService.onDidChAngeConfigurAtion((e) => {
			if (e.AffectsConfigurAtion('editor.multiCursorModifier')) {
				this._updAte();
			}
		});
	}

	privAte _updAte(): void {
		const editorConf = this.configurAtionService.getVAlue<{ multiCursorModifier: 'ctrlCmd' | 'Alt' }>('editor');
		const vAlue = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'ctrlCmd' : 'AltKey');
		this._multiCursorModifier.set(vAlue);
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(MultiCursorModifierContextKeyController, LifecyclePhAse.Restored);


const registry = Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleMultiCursorModifierAction), 'Toggle Multi-Cursor Modifier');
MenuRegistry.AppendMenuItem(MenuId.MenubArSelectionMenu, {
	group: '4_config',
	commAnd: {
		id: ToggleMultiCursorModifierAction.ID,
		title: nls.locAlize('miMultiCursorAlt', "Switch to Alt+Click for Multi-Cursor")
	},
	when: multiCursorModifier.isEquAlTo('ctrlCmd'),
	order: 1
});
MenuRegistry.AppendMenuItem(MenuId.MenubArSelectionMenu, {
	group: '4_config',
	commAnd: {
		id: ToggleMultiCursorModifierAction.ID,
		title: (
			plAtform.isMAcintosh
				? nls.locAlize('miMultiCursorCmd', "Switch to Cmd+Click for Multi-Cursor")
				: nls.locAlize('miMultiCursorCtrl', "Switch to Ctrl+Click for Multi-Cursor")
		)
	},
	when: multiCursorModifier.isEquAlTo('AltKey'),
	order: 1
});
