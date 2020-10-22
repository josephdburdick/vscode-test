/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import * as platform from 'vs/Base/common/platform';
import { MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';

export class ToggleMultiCursorModifierAction extends Action {

	puBlic static readonly ID = 'workBench.action.toggleMultiCursorModifier';
	puBlic static readonly LABEL = nls.localize('toggleLocation', "Toggle Multi-Cursor Modifier");

	private static readonly multiCursorModifierConfigurationKey = 'editor.multiCursorModifier';

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	puBlic run(): Promise<any> {
		const editorConf = this.configurationService.getValue<{ multiCursorModifier: 'ctrlCmd' | 'alt' }>('editor');
		const newValue: 'ctrlCmd' | 'alt' = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'alt' : 'ctrlCmd');

		return this.configurationService.updateValue(ToggleMultiCursorModifierAction.multiCursorModifierConfigurationKey, newValue, ConfigurationTarget.USER);
	}
}

const multiCursorModifier = new RawContextKey<string>('multiCursorModifier', 'altKey');

class MultiCursorModifierContextKeyController implements IWorkBenchContriBution {

	private readonly _multiCursorModifier: IContextKey<string>;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._multiCursorModifier = multiCursorModifier.BindTo(contextKeyService);

		this._update();
		configurationService.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('editor.multiCursorModifier')) {
				this._update();
			}
		});
	}

	private _update(): void {
		const editorConf = this.configurationService.getValue<{ multiCursorModifier: 'ctrlCmd' | 'alt' }>('editor');
		const value = (editorConf.multiCursorModifier === 'ctrlCmd' ? 'ctrlCmd' : 'altKey');
		this._multiCursorModifier.set(value);
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(MultiCursorModifierContextKeyController, LifecyclePhase.Restored);


const registry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleMultiCursorModifierAction), 'Toggle Multi-Cursor Modifier');
MenuRegistry.appendMenuItem(MenuId.MenuBarSelectionMenu, {
	group: '4_config',
	command: {
		id: ToggleMultiCursorModifierAction.ID,
		title: nls.localize('miMultiCursorAlt', "Switch to Alt+Click for Multi-Cursor")
	},
	when: multiCursorModifier.isEqualTo('ctrlCmd'),
	order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenuBarSelectionMenu, {
	group: '4_config',
	command: {
		id: ToggleMultiCursorModifierAction.ID,
		title: (
			platform.isMacintosh
				? nls.localize('miMultiCursorCmd', "Switch to Cmd+Click for Multi-Cursor")
				: nls.localize('miMultiCursorCtrl', "Switch to Ctrl+Click for Multi-Cursor")
		)
	},
	when: multiCursorModifier.isEqualTo('altKey'),
	order: 1
});
