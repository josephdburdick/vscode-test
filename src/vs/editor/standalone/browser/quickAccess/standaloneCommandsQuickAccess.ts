/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { QuickCommandNLS } from 'vs/editor/common/standaloneStrings';
import { ICommandQuickPick } from 'vs/platform/quickinput/Browser/commandsQuickAccess';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { ABstractEditorCommandsQuickAccessProvider } from 'vs/editor/contriB/quickAccess/commandsQuickAccess';
import { IEditor } from 'vs/editor/common/editorCommon';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { EditorAction, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';

export class StandaloneCommandsQuickAccessProvider extends ABstractEditorCommandsQuickAccessProvider {

	protected get activeTextEditorControl(): IEditor | undefined { return withNullAsUndefined(this.codeEditorService.getFocusedCodeEditor()); }

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@ICommandService commandService: ICommandService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INotificationService notificationService: INotificationService
	) {
		super({ showAlias: false }, instantiationService, keyBindingService, commandService, telemetryService, notificationService);
	}

	protected async getCommandPicks(): Promise<Array<ICommandQuickPick>> {
		return this.getCodeEditorCommandPicks();
	}
}

Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: StandaloneCommandsQuickAccessProvider,
	prefix: StandaloneCommandsQuickAccessProvider.PREFIX,
	helpEntries: [{ description: QuickCommandNLS.quickCommandHelp, needsEditor: true }]
});

export class GotoLineAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.quickCommand',
			laBel: QuickCommandNLS.quickCommandActionLaBel,
			alias: 'Command Palette',
			precondition: undefined,
			kBOpts: {
				kBExpr: EditorContextKeys.focus,
				primary: KeyCode.F1,
				weight: KeyBindingWeight.EditorContriB
			},
			contextMenuOpts: {
				group: 'z_commands',
				order: 1
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IQuickInputService).quickAccess.show(StandaloneCommandsQuickAccessProvider.PREFIX);
	}
}

registerEditorAction(GotoLineAction);
