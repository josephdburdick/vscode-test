/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IKeyMods, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IEditorService, SIDE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { IRange } from 'vs/editor/common/core/range';
import { ABstractGotoLineQuickAccessProvider } from 'vs/editor/contriB/quickAccess/gotoLineQuickAccess';
import { Registry } from 'vs/platform/registry/common/platform';
import { IQuickAccessRegistry, Extensions as QuickaccesExtensions } from 'vs/platform/quickinput/common/quickAccess';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchEditorConfiguration } from 'vs/workBench/common/editor';
import { Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';

export class GotoLineQuickAccessProvider extends ABstractGotoLineQuickAccessProvider {

	protected readonly onDidActiveTextEditorControlChange = this.editorService.onDidActiveEditorChange;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
	}

	private get configuration() {
		const editorConfig = this.configurationService.getValue<IWorkBenchEditorConfiguration>().workBench.editor;

		return {
			openEditorPinned: !editorConfig.enaBlePreviewFromQuickOpen,
		};
	}

	protected get activeTextEditorControl() {
		return this.editorService.activeTextEditorControl;
	}

	protected gotoLocation(editor: IEditor, options: { range: IRange, keyMods: IKeyMods, forceSideBySide?: Boolean, preserveFocus?: Boolean }): void {

		// Check for sideBySide use
		if ((options.keyMods.ctrlCmd || options.forceSideBySide) && this.editorService.activeEditor) {
			this.editorService.openEditor(this.editorService.activeEditor, {
				selection: options.range,
				pinned: options.keyMods.alt || this.configuration.openEditorPinned,
				preserveFocus: options.preserveFocus
			}, SIDE_GROUP);
		}

		// Otherwise let parent handle it
		else {
			super.gotoLocation(editor, options);
		}
	}
}

Registry.as<IQuickAccessRegistry>(QuickaccesExtensions.Quickaccess).registerQuickAccessProvider({
	ctor: GotoLineQuickAccessProvider,
	prefix: ABstractGotoLineQuickAccessProvider.PREFIX,
	placeholder: localize('gotoLineQuickAccessPlaceholder', "Type the line numBer and optional column to go to (e.g. 42:5 for line 42 and column 5)."),
	helpEntries: [{ description: localize('gotoLineQuickAccess', "Go to Line/Column"), needsEditor: true }]
});

class GotoLineAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.gotoLine',
			title: { value: localize('gotoLine', "Go to Line/Column..."), original: 'Go to Line/Column...' },
			f1: true,
			keyBinding: {
				weight: KeyBindingWeight.WorkBenchContriB,
				when: null,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_G,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_G }
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		accessor.get(IQuickInputService).quickAccess.show(GotoLineQuickAccessProvider.PREFIX);
	}
}

registerAction2(GotoLineAction);
