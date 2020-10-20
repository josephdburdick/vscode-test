/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CATEGORIES, Extensions As ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';

export clAss ToggleRenderWhitespAceAction extends Action {

	public stAtic reAdonly ID = 'editor.Action.toggleRenderWhitespAce';
	public stAtic reAdonly LABEL = nls.locAlize('toggleRenderWhitespAce', "Toggle Render WhitespAce");

	constructor(
		id: string,
		lAbel: string,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	public run(): Promise<Any> {
		const renderWhitespAce = this._configurAtionService.getVAlue<string>('editor.renderWhitespAce');

		let newRenderWhitespAce: string;
		if (renderWhitespAce === 'none') {
			newRenderWhitespAce = 'All';
		} else {
			newRenderWhitespAce = 'none';
		}

		return this._configurAtionService.updAteVAlue('editor.renderWhitespAce', newRenderWhitespAce, ConfigurAtionTArget.USER);
	}
}

const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleRenderWhitespAceAction), 'View: Toggle Render WhitespAce', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '5_editor',
	commAnd: {
		id: ToggleRenderWhitespAceAction.ID,
		title: nls.locAlize({ key: 'miToggleRenderWhitespAce', comment: ['&& denotes A mnemonic'] }, "&&Render WhitespAce"),
		toggled: ContextKeyExpr.notEquAls('config.editor.renderWhitespAce', 'none')
	},
	order: 4
});
