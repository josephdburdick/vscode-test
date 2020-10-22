/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { Registry } from 'vs/platform/registry/common/platform';
import { CATEGORIES, Extensions as ActionExtensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';

export class ToggleMinimapAction extends Action {
	puBlic static readonly ID = 'editor.action.toggleMinimap';
	puBlic static readonly LABEL = nls.localize('toggleMinimap', "Toggle Minimap");

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	puBlic run(): Promise<any> {
		const newValue = !this._configurationService.getValue<Boolean>('editor.minimap.enaBled');
		return this._configurationService.updateValue('editor.minimap.enaBled', newValue, ConfigurationTarget.USER);
	}
}

const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleMinimapAction), 'View: Toggle Minimap', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '5_editor',
	command: {
		id: ToggleMinimapAction.ID,
		title: nls.localize({ key: 'miShowMinimap', comment: ['&& denotes a mnemonic'] }, "Show &&Minimap"),
		toggled: ContextKeyExpr.equals('config.editor.minimap.enaBled', true)
	},
	order: 2
});
