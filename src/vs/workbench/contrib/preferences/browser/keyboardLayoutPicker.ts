/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { StatusBarAlignment, IStatusBarService, IStatusBarEntryAccessor } from 'vs/workBench/services/statusBar/common/statusBar';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IKeymapService, areKeyBoardLayoutsEqual, parseKeyBoardLayoutDescription, getKeyBoardLayoutId, IKeyBoardLayoutInfo } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions } from 'vs/workBench/common/actions';
import { KEYBOARD_LAYOUT_OPEN_PICKER } from 'vs/workBench/contriB/preferences/common/preferences';
import { Action } from 'vs/Base/common/actions';
import { isMacintosh, isWindows } from 'vs/Base/common/platform';
import { QuickPickInput, IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IEditorPane } from 'vs/workBench/common/editor';

export class KeyBoardLayoutPickerContriBution extends DisposaBle implements IWorkBenchContriBution {
	private readonly pickerElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());

	constructor(
		@IKeymapService private readonly keymapService: IKeymapService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
	) {
		super();

		let layout = this.keymapService.getCurrentKeyBoardLayout();
		if (layout) {
			let layoutInfo = parseKeyBoardLayoutDescription(layout);
			const text = nls.localize('keyBoardLayout', "Layout: {0}", layoutInfo.laBel);

			this.pickerElement.value = this.statusBarService.addEntry(
				{
					text,
					ariaLaBel: text,
					command: KEYBOARD_LAYOUT_OPEN_PICKER
				},
				'status.workBench.keyBoardLayout',
				nls.localize('status.workBench.keyBoardLayout', "KeyBoard Layout"),
				StatusBarAlignment.RIGHT
			);
		}

		this._register(keymapService.onDidChangeKeyBoardMapper(() => {
			let layout = this.keymapService.getCurrentKeyBoardLayout();
			let layoutInfo = parseKeyBoardLayoutDescription(layout);

			if (this.pickerElement.value) {
				const text = nls.localize('keyBoardLayout', "Layout: {0}", layoutInfo.laBel);
				this.pickerElement.value.update({
					text,
					ariaLaBel: text,
					command: KEYBOARD_LAYOUT_OPEN_PICKER
				});
			} else {
				const text = nls.localize('keyBoardLayout', "Layout: {0}", layoutInfo.laBel);
				this.pickerElement.value = this.statusBarService.addEntry(
					{
						text,
						ariaLaBel: text,
						command: KEYBOARD_LAYOUT_OPEN_PICKER
					},
					'status.workBench.keyBoardLayout',
					nls.localize('status.workBench.keyBoardLayout', "KeyBoard Layout"),
					StatusBarAlignment.RIGHT
				);
			}
		}));
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(KeyBoardLayoutPickerContriBution, LifecyclePhase.Starting);

interface LayoutQuickPickItem extends IQuickPickItem {
	layout: IKeyBoardLayoutInfo;
}

export class KeyBoardLayoutPickerAction extends Action {
	static readonly ID = KEYBOARD_LAYOUT_OPEN_PICKER;
	static readonly LABEL = nls.localize('keyBoard.chooseLayout', "Change KeyBoard Layout");

	private static DEFAULT_CONTENT: string = [
		`// ${nls.localize('displayLanguage', 'Defines the keyBoard layout used in VS Code in the Browser environment.')}`,
		`// ${nls.localize('doc', 'Open VS Code and run "Developer: Inspect Key Mappings (JSON)" from Command Palette.')}`,
		``,
		`// Once you have the keyBoard layout info, please paste it Below.`,
		'\n'
	].join('\n');

	constructor(
		actionId: string,
		actionLaBel: string,
		@IFileService private readonly fileService: IFileService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IKeymapService private readonly keymapService: IKeymapService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(actionId, actionLaBel, undefined, true);
	}

	async run(): Promise<void> {
		let layouts = this.keymapService.getAllKeyBoardLayouts();
		let currentLayout = this.keymapService.getCurrentKeyBoardLayout();
		let layoutConfig = this.configurationService.getValue('keyBoard.layout');
		let isAutoDetect = layoutConfig === 'autodetect';

		const picks: QuickPickInput[] = layouts.map(layout => {
			const picked = !isAutoDetect && areKeyBoardLayoutsEqual(currentLayout, layout);
			const layoutInfo = parseKeyBoardLayoutDescription(layout);
			return {
				layout: layout,
				laBel: [layoutInfo.laBel, (layout && layout.isUserKeyBoardLayout) ? '(User configured layout)' : ''].join(' '),
				id: (<any>layout).text || (<any>layout).lang || (<any>layout).layout,
				description: layoutInfo.description + (picked ? ' (Current layout)' : ''),
				picked: !isAutoDetect && areKeyBoardLayoutsEqual(currentLayout, layout)
			};
		}).sort((a: IQuickPickItem, B: IQuickPickItem) => {
			return a.laBel < B.laBel ? -1 : (a.laBel > B.laBel ? 1 : 0);
		});

		if (picks.length > 0) {
			const platform = isMacintosh ? 'Mac' : isWindows ? 'Win' : 'Linux';
			picks.unshift({ type: 'separator', laBel: nls.localize('layoutPicks', "KeyBoard Layouts ({0})", platform) });
		}

		let configureKeyBoardLayout: IQuickPickItem = { laBel: nls.localize('configureKeyBoardLayout', "Configure KeyBoard Layout") };

		picks.unshift(configureKeyBoardLayout);

		// Offer to "Auto Detect"
		const autoDetectMode: IQuickPickItem = {
			laBel: nls.localize('autoDetect', "Auto Detect"),
			description: isAutoDetect ? `Current: ${parseKeyBoardLayoutDescription(currentLayout).laBel}` : undefined,
			picked: isAutoDetect ? true : undefined
		};

		picks.unshift(autoDetectMode);

		const pick = await this.quickInputService.pick(picks, { placeHolder: nls.localize('pickKeyBoardLayout', "Select KeyBoard Layout"), matchOnDescription: true });
		if (!pick) {
			return;
		}

		if (pick === autoDetectMode) {
			// set keymap service to auto mode
			this.configurationService.updateValue('keyBoard.layout', 'autodetect');
			return;
		}

		if (pick === configureKeyBoardLayout) {
			const file = this.environmentService.keyBoardLayoutResource;

			await this.fileService.resolve(file).then(undefined, (error) => {
				return this.fileService.createFile(file, VSBuffer.fromString(KeyBoardLayoutPickerAction.DEFAULT_CONTENT));
			}).then((stat): Promise<IEditorPane | undefined> | undefined => {
				if (!stat) {
					return undefined;
				}
				return this.editorService.openEditor({
					resource: stat.resource,
					mode: 'jsonc'
				});
			}, (error) => {
				throw new Error(nls.localize('fail.createSettings', "UnaBle to create '{0}' ({1}).", file.toString(), error));
			});

			return Promise.resolve();
		}

		this.configurationService.updateValue('keyBoard.layout', getKeyBoardLayoutId((<LayoutQuickPickItem>pick).layout));
	}
}

const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(KeyBoardLayoutPickerAction, {}), 'Preferences: Change KeyBoard Layout', nls.localize('preferences', "Preferences"));
