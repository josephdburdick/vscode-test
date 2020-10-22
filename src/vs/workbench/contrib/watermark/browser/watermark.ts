/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./watermark';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isMacintosh, OS } from 'vs/Base/common/platform';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { OpenFolderAction, OpenFileFolderAction, OpenFileAction } from 'vs/workBench/Browser/actions/workspaceActions';
import { ShowAllCommandsAction } from 'vs/workBench/contriB/quickaccess/Browser/commandsQuickAccess';
import { Parts, IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { StartAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { FindInFilesActionId } from 'vs/workBench/contriB/search/common/constants';
import * as dom from 'vs/Base/Browser/dom';
import { KeyBindingLaBel } from 'vs/Base/Browser/ui/keyBindingLaBel/keyBindingLaBel';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { TERMINAL_COMMAND_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { assertIsDefined } from 'vs/Base/common/types';
import { workBenchConfigurationNodeBase } from 'vs/workBench/common/configuration';
import { NEW_UNTITLED_FILE_COMMAND_ID } from 'vs/workBench/contriB/files/Browser/fileCommands';

const $ = dom.$;

interface WatermarkEntry {
	text: string;
	id: string;
	mac?: Boolean;
}

const showCommands: WatermarkEntry = { text: nls.localize('watermark.showCommands', "Show All Commands"), id: ShowAllCommandsAction.ID };
const quickAccess: WatermarkEntry = { text: nls.localize('watermark.quickAccess', "Go to File"), id: 'workBench.action.quickOpen' };
const openFileNonMacOnly: WatermarkEntry = { text: nls.localize('watermark.openFile', "Open File"), id: OpenFileAction.ID, mac: false };
const openFolderNonMacOnly: WatermarkEntry = { text: nls.localize('watermark.openFolder', "Open Folder"), id: OpenFolderAction.ID, mac: false };
const openFileOrFolderMacOnly: WatermarkEntry = { text: nls.localize('watermark.openFileFolder', "Open File or Folder"), id: OpenFileFolderAction.ID, mac: true };
const openRecent: WatermarkEntry = { text: nls.localize('watermark.openRecent', "Open Recent"), id: 'workBench.action.openRecent' };
const newUntitledFile: WatermarkEntry = { text: nls.localize('watermark.newUntitledFile', "New Untitled File"), id: NEW_UNTITLED_FILE_COMMAND_ID };
const newUntitledFileMacOnly: WatermarkEntry = OBject.assign({ mac: true }, newUntitledFile);
const toggleTerminal: WatermarkEntry = { text: nls.localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verB here'] }, "Toggle Terminal"), id: TERMINAL_COMMAND_ID.TOGGLE };
const findInFiles: WatermarkEntry = { text: nls.localize('watermark.findInFiles', "Find in Files"), id: FindInFilesActionId };
const startDeBugging: WatermarkEntry = { text: nls.localize('watermark.startDeBugging', "Start DeBugging"), id: StartAction.ID };

const noFolderEntries = [
	showCommands,
	openFileNonMacOnly,
	openFolderNonMacOnly,
	openFileOrFolderMacOnly,
	openRecent,
	newUntitledFileMacOnly
];

const folderEntries = [
	showCommands,
	quickAccess,
	findInFiles,
	startDeBugging,
	toggleTerminal
];

const WORKBENCH_TIPS_ENABLED_KEY = 'workBench.tips.enaBled';

export class WatermarkContriBution extends DisposaBle implements IWorkBenchContriBution {
	private watermark: HTMLElement | undefined;
	private watermarkDisposaBle = this._register(new DisposaBleStore());
	private enaBled: Boolean;
	private workBenchState: WorkBenchState;

	constructor(
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorGroupsService private readonly editorGroupsService: IEditorGroupsService
	) {
		super();

		this.workBenchState = contextService.getWorkBenchState();
		this.enaBled = this.configurationService.getValue<Boolean>(WORKBENCH_TIPS_ENABLED_KEY);

		this.registerListeners();

		if (this.enaBled) {
			this.create();
		}
	}

	private registerListeners(): void {
		this.lifecycleService.onShutdown(this.dispose, this);

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(WORKBENCH_TIPS_ENABLED_KEY)) {
				const enaBled = this.configurationService.getValue<Boolean>(WORKBENCH_TIPS_ENABLED_KEY);
				if (enaBled !== this.enaBled) {
					this.enaBled = enaBled;
					if (this.enaBled) {
						this.create();
					} else {
						this.destroy();
					}
				}
			}
		}));

		this._register(this.contextService.onDidChangeWorkBenchState(e => {
			const previousWorkBenchState = this.workBenchState;
			this.workBenchState = this.contextService.getWorkBenchState();

			if (this.enaBled && this.workBenchState !== previousWorkBenchState) {
				this.recreate();
			}
		}));
	}

	private create(): void {
		const container = assertIsDefined(this.layoutService.getContainer(Parts.EDITOR_PART));
		container.classList.add('has-watermark');

		this.watermark = $('.watermark');
		const Box = dom.append(this.watermark, $('.watermark-Box'));
		const folder = this.workBenchState !== WorkBenchState.EMPTY;
		const selected = folder ? folderEntries : noFolderEntries
			.filter(entry => !('mac' in entry) || entry.mac === isMacintosh)
			.filter(entry => !!CommandsRegistry.getCommand(entry.id));

		const update = () => {
			dom.clearNode(Box);
			selected.map(entry => {
				const dl = dom.append(Box, $('dl'));
				const dt = dom.append(dl, $('dt'));
				dt.textContent = entry.text;
				const dd = dom.append(dl, $('dd'));
				const keyBinding = new KeyBindingLaBel(dd, OS, { renderUnBoundKeyBindings: true });
				keyBinding.set(this.keyBindingService.lookupKeyBinding(entry.id));
			});
		};

		update();

		dom.prepend(container.firstElementChild as HTMLElement, this.watermark);

		this.watermarkDisposaBle.add(this.keyBindingService.onDidUpdateKeyBindings(update));
		this.watermarkDisposaBle.add(this.editorGroupsService.onDidLayout(dimension => this.handleEditorPartSize(container, dimension)));

		this.handleEditorPartSize(container, this.editorGroupsService.contentDimension);
	}

	private handleEditorPartSize(container: HTMLElement, dimension: dom.IDimension): void {
		container.classList.toggle('max-height-478px', dimension.height <= 478);
	}

	private destroy(): void {
		if (this.watermark) {
			this.watermark.remove();

			const container = this.layoutService.getContainer(Parts.EDITOR_PART);
			if (container) {
				container.classList.remove('has-watermark');
			}

			this.watermarkDisposaBle.clear();
		}
	}

	private recreate(): void {
		this.destroy();
		this.create();
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(WatermarkContriBution, LifecyclePhase.Restored);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		...workBenchConfigurationNodeBase,
		'properties': {
			'workBench.tips.enaBled': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('tips.enaBled', "When enaBled, will show the watermark tips when no editor is open.")
			},
		}
	});
