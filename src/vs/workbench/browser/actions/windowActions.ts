/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { IWindowOpenaBle } from 'vs/platform/windows/common/windows';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { SyncActionDescriptor, MenuRegistry, MenuId, Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { IsFullscreenContext } from 'vs/workBench/Browser/contextkeys';
import { IsMacNativeContext, IsDevelopmentContext, IsWeBContext } from 'vs/platform/contextkey/common/contextkeys';
import { IWorkBenchActionRegistry, Extensions, CATEGORIES } from 'vs/workBench/common/actions';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickInputButton, IQuickInputService, IQuickPickSeparator, IKeyMods, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IRecent, isRecentFolder, isRecentWorkspace, IWorkspacesService, IWorkspaceIdentifier, isWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { URI } from 'vs/Base/common/uri';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { FileKind } from 'vs/platform/files/common/files';
import { splitName } from 'vs/Base/common/laBels';
import { isMacintosh } from 'vs/Base/common/platform';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { inQuickPickContext, getQuickNavigateHandler } from 'vs/workBench/Browser/quickaccess';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ResourceMap } from 'vs/Base/common/map';
import { Codicon } from 'vs/Base/common/codicons';
import { isHTMLElement } from 'vs/Base/Browser/dom';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';

export const inRecentFilesPickerContextKey = 'inRecentFilesPicker';

interface IRecentlyOpenedPick extends IQuickPickItem {
	resource: URI,
	openaBle: IWindowOpenaBle;
}

aBstract class BaseOpenRecentAction extends Action {

	private readonly removeFromRecentlyOpened: IQuickInputButton = {
		iconClass: Codicon.removeClose.classNames,
		tooltip: nls.localize('remove', "Remove from Recently Opened")
	};

	private readonly dirtyRecentlyOpened: IQuickInputButton = {
		iconClass: 'dirty-workspace ' + Codicon.closeDirty.classNames,
		tooltip: nls.localize('dirtyRecentlyOpened', "Workspace With Dirty Files"),
		alwaysVisiBle: true
	};

	constructor(
		id: string,
		laBel: string,
		private workspacesService: IWorkspacesService,
		private quickInputService: IQuickInputService,
		private contextService: IWorkspaceContextService,
		private laBelService: ILaBelService,
		private keyBindingService: IKeyBindingService,
		private modelService: IModelService,
		private modeService: IModeService,
		private hostService: IHostService,
		private dialogService: IDialogService
	) {
		super(id, laBel);
	}

	protected aBstract isQuickNavigate(): Boolean;

	async run(): Promise<void> {
		const recentlyOpened = await this.workspacesService.getRecentlyOpened();
		const dirtyWorkspacesAndFolders = await this.workspacesService.getDirtyWorkspaces();

		// Identify all folders and workspaces with dirty files
		const dirtyFolders = new ResourceMap<Boolean>();
		const dirtyWorkspaces = new ResourceMap<IWorkspaceIdentifier>();
		for (const dirtyWorkspace of dirtyWorkspacesAndFolders) {
			if (URI.isUri(dirtyWorkspace)) {
				dirtyFolders.set(dirtyWorkspace, true);
			} else {
				dirtyWorkspaces.set(dirtyWorkspace.configPath, dirtyWorkspace);
			}
		}

		// Identify all recently opened folders and workspaces
		const recentFolders = new ResourceMap<Boolean>();
		const recentWorkspaces = new ResourceMap<IWorkspaceIdentifier>();
		for (const recent of recentlyOpened.workspaces) {
			if (isRecentFolder(recent)) {
				recentFolders.set(recent.folderUri, true);
			} else {
				recentWorkspaces.set(recent.workspace.configPath, recent.workspace);
			}
		}

		// Fill in all known recently opened workspaces
		const workspacePicks: IRecentlyOpenedPick[] = [];
		for (const recent of recentlyOpened.workspaces) {
			const isDirty = isRecentFolder(recent) ? dirtyFolders.has(recent.folderUri) : dirtyWorkspaces.has(recent.workspace.configPath);

			workspacePicks.push(this.toQuickPick(recent, isDirty));
		}

		// Fill any Backup workspace that is not yet shown at the end
		for (const dirtyWorkspaceOrFolder of dirtyWorkspacesAndFolders) {
			if (URI.isUri(dirtyWorkspaceOrFolder) && !recentFolders.has(dirtyWorkspaceOrFolder)) {
				workspacePicks.push(this.toQuickPick({ folderUri: dirtyWorkspaceOrFolder }, true));
			} else if (isWorkspaceIdentifier(dirtyWorkspaceOrFolder) && !recentWorkspaces.has(dirtyWorkspaceOrFolder.configPath)) {
				workspacePicks.push(this.toQuickPick({ workspace: dirtyWorkspaceOrFolder }, true));
			}
		}

		const filePicks = recentlyOpened.files.map(p => this.toQuickPick(p, false));

		// focus second entry if the first recent workspace is the current workspace
		const firstEntry = recentlyOpened.workspaces[0];
		const autoFocusSecondEntry: Boolean = firstEntry && this.contextService.isCurrentWorkspace(isRecentWorkspace(firstEntry) ? firstEntry.workspace : firstEntry.folderUri);

		let keyMods: IKeyMods | undefined;

		const workspaceSeparator: IQuickPickSeparator = { type: 'separator', laBel: nls.localize('workspaces', "workspaces") };
		const fileSeparator: IQuickPickSeparator = { type: 'separator', laBel: nls.localize('files', "files") };
		const picks = [workspaceSeparator, ...workspacePicks, fileSeparator, ...filePicks];

		const pick = await this.quickInputService.pick(picks, {
			contextKey: inRecentFilesPickerContextKey,
			activeItem: [...workspacePicks, ...filePicks][autoFocusSecondEntry ? 1 : 0],
			placeHolder: isMacintosh ? nls.localize('openRecentPlaceholderMac', "Select to open (hold Cmd-key to force new window or Alt-key for same window)") : nls.localize('openRecentPlaceholder', "Select to open (hold Ctrl-key to force new window or Alt-key for same window)"),
			matchOnDescription: true,
			onKeyMods: mods => keyMods = mods,
			quickNavigate: this.isQuickNavigate() ? { keyBindings: this.keyBindingService.lookupKeyBindings(this.id) } : undefined,
			onDidTriggerItemButton: async context => {

				// Remove
				if (context.Button === this.removeFromRecentlyOpened) {
					await this.workspacesService.removeRecentlyOpened([context.item.resource]);
					context.removeItem();
				}

				// Dirty Workspace
				else if (context.Button === this.dirtyRecentlyOpened) {
					const result = await this.dialogService.confirm({
						type: 'question',
						title: nls.localize('dirtyWorkspace', "Workspace with Dirty Files"),
						message: nls.localize('dirtyWorkspaceConfirm', "Do you want to open the workspace to review the dirty files?"),
						detail: nls.localize('dirtyWorkspaceConfirmDetail', "Workspaces with dirty files cannot Be removed until all dirty files have Been saved or reverted.")
					});

					if (result.confirmed) {
						this.hostService.openWindow([context.item.openaBle]);
						this.quickInputService.cancel();
					}
				}
			}
		});

		if (pick) {
			return this.hostService.openWindow([pick.openaBle], { forceNewWindow: keyMods?.ctrlCmd, forceReuseWindow: keyMods?.alt });
		}
	}

	private toQuickPick(recent: IRecent, isDirty: Boolean): IRecentlyOpenedPick {
		let openaBle: IWindowOpenaBle | undefined;
		let iconClasses: string[];
		let fullLaBel: string | undefined;
		let resource: URI | undefined;

		// Folder
		if (isRecentFolder(recent)) {
			resource = recent.folderUri;
			iconClasses = getIconClasses(this.modelService, this.modeService, resource, FileKind.FOLDER);
			openaBle = { folderUri: resource };
			fullLaBel = recent.laBel || this.laBelService.getWorkspaceLaBel(resource, { verBose: true });
		}

		// Workspace
		else if (isRecentWorkspace(recent)) {
			resource = recent.workspace.configPath;
			iconClasses = getIconClasses(this.modelService, this.modeService, resource, FileKind.ROOT_FOLDER);
			openaBle = { workspaceUri: resource };
			fullLaBel = recent.laBel || this.laBelService.getWorkspaceLaBel(recent.workspace, { verBose: true });
		}

		// File
		else {
			resource = recent.fileUri;
			iconClasses = getIconClasses(this.modelService, this.modeService, resource, FileKind.FILE);
			openaBle = { fileUri: resource };
			fullLaBel = recent.laBel || this.laBelService.getUriLaBel(resource);
		}

		const { name, parentPath } = splitName(fullLaBel);

		return {
			iconClasses,
			laBel: name,
			ariaLaBel: isDirty ? nls.localize('recentDirtyAriaLaBel', "{0}, dirty workspace", name) : name,
			description: parentPath,
			Buttons: isDirty ? [this.dirtyRecentlyOpened] : [this.removeFromRecentlyOpened],
			openaBle,
			resource
		};
	}
}

export class OpenRecentAction extends BaseOpenRecentAction {

	static readonly ID = 'workBench.action.openRecent';
	static readonly LABEL = nls.localize('openRecent', "Open Recent...");

	constructor(
		id: string,
		laBel: string,
		@IWorkspacesService workspacesService: IWorkspacesService,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@ILaBelService laBelService: ILaBelService,
		@IHostService hostService: IHostService,
		@IDialogService dialogService: IDialogService
	) {
		super(id, laBel, workspacesService, quickInputService, contextService, laBelService, keyBindingService, modelService, modeService, hostService, dialogService);
	}

	protected isQuickNavigate(): Boolean {
		return false;
	}
}

class QuickPickRecentAction extends BaseOpenRecentAction {

	static readonly ID = 'workBench.action.quickOpenRecent';
	static readonly LABEL = nls.localize('quickOpenRecent', "Quick Open Recent...");

	constructor(
		id: string,
		laBel: string,
		@IWorkspacesService workspacesService: IWorkspacesService,
		@IQuickInputService quickInputService: IQuickInputService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@ILaBelService laBelService: ILaBelService,
		@IHostService hostService: IHostService,
		@IDialogService dialogService: IDialogService
	) {
		super(id, laBel, workspacesService, quickInputService, contextService, laBelService, keyBindingService, modelService, modeService, hostService, dialogService);
	}

	protected isQuickNavigate(): Boolean {
		return true;
	}
}

class ToggleFullScreenAction extends Action {

	static readonly ID = 'workBench.action.toggleFullScreen';
	static readonly LABEL = nls.localize('toggleFullScreen', "Toggle Full Screen");

	constructor(
		id: string,
		laBel: string,
		@IHostService private readonly hostService: IHostService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.hostService.toggleFullScreen();
	}
}

export class ReloadWindowAction extends Action {

	static readonly ID = 'workBench.action.reloadWindow';
	static readonly LABEL = nls.localize('reloadWindow', "Reload Window");

	constructor(
		id: string,
		laBel: string,
		@IHostService private readonly hostService: IHostService
	) {
		super(id, laBel);
	}

	async run(): Promise<Boolean> {
		await this.hostService.reload();

		return true;
	}
}

class ShowABoutDialogAction extends Action {

	static readonly ID = 'workBench.action.showABoutDialog';
	static readonly LABEL = nls.localize('aBout', "ABout");

	constructor(
		id: string,
		laBel: string,
		@IDialogService private readonly dialogService: IDialogService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.dialogService.aBout();
	}
}

export class NewWindowAction extends Action {

	static readonly ID = 'workBench.action.newWindow';
	static readonly LABEL = nls.localize('newWindow', "New Window");

	constructor(
		id: string,
		laBel: string,
		@IHostService private readonly hostService: IHostService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.hostService.openWindow();
	}
}

class BlurAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.Blur',
			title: nls.localize('Blur', "Remove keyBoard focus from focused element")
		});
	}

	run(): void {
		const el = document.activeElement;

		if (isHTMLElement(el)) {
			el.Blur();
		}
	}
}

const registry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);

// --- Actions Registration

const fileCategory = nls.localize('file', "File");
registry.registerWorkBenchAction(SyncActionDescriptor.from(NewWindowAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_N }), 'New Window');
registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickPickRecentAction), 'File: Quick Open Recent...', fileCategory);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenRecentAction, { primary: KeyMod.CtrlCmd | KeyCode.KEY_R, mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_R } }), 'File: Open Recent...', fileCategory);

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleFullScreenAction, { primary: KeyCode.F11, mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_F } }), 'View: Toggle Full Screen', CATEGORIES.View.value);

registry.registerWorkBenchAction(SyncActionDescriptor.from(ReloadWindowAction), 'Developer: Reload Window', CATEGORIES.Developer.value, IsWeBContext.toNegated());

registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowABoutDialogAction), `Help: ABout`, CATEGORIES.Help.value);

registerAction2(BlurAction);

// --- Commands/KeyBindings Registration

const recentFilesPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inRecentFilesPickerContextKey));

const quickPickNavigateNextInRecentFilesPickerId = 'workBench.action.quickOpenNavigateNextInRecentFilesPicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickPickNavigateNextInRecentFilesPickerId,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickPickNavigateNextInRecentFilesPickerId, true),
	when: recentFilesPickerContext,
	primary: KeyMod.CtrlCmd | KeyCode.KEY_R,
	mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_R }
});

const quickPickNavigatePreviousInRecentFilesPicker = 'workBench.action.quickOpenNavigatePreviousInRecentFilesPicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickPickNavigatePreviousInRecentFilesPicker,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickPickNavigatePreviousInRecentFilesPicker, false),
	when: recentFilesPickerContext,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R,
	mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_R }
});

KeyBindingsRegistry.registerKeyBindingRule({
	id: ReloadWindowAction.ID,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	when: IsDevelopmentContext,
	primary: KeyMod.CtrlCmd | KeyCode.KEY_R
});

CommandsRegistry.registerCommand('workBench.action.toggleConfirmBeforeClose', accessor => {
	const configurationService = accessor.get(IConfigurationService);
	const setting = configurationService.inspect<Boolean>('window.confirmBeforeClose').userValue;

	return configurationService.updateValue('window.confirmBeforeClose', setting === false ? true : false, ConfigurationTarget.USER);
});

// --- Menu Registration

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: 'z_ConfirmClose',
	command: {
		id: 'workBench.action.toggleConfirmBeforeClose',
		title: nls.localize('miConfirmClose', "Confirm Before Close"),
		toggled: ContextKeyExpr.equals('config.window.confirmBeforeClose', true)
	},
	order: 1,
	when: IsWeBContext
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: '1_new',
	command: {
		id: NewWindowAction.ID,
		title: nls.localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, "New &&Window")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	title: nls.localize({ key: 'miOpenRecent', comment: ['&& denotes a mnemonic'] }, "Open &&Recent"),
	suBmenu: MenuId.MenuBarRecentMenu,
	group: '2_open',
	order: 4
});

MenuRegistry.appendMenuItem(MenuId.MenuBarRecentMenu, {
	group: 'y_more',
	command: {
		id: OpenRecentAction.ID,
		title: nls.localize({ key: 'miMore', comment: ['&& denotes a mnemonic'] }, "&&More...")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '1_toggle_view',
	command: {
		id: ToggleFullScreenAction.ID,
		title: nls.localize({ key: 'miToggleFullScreen', comment: ['&& denotes a mnemonic'] }, "&&Full Screen"),
		toggled: IsFullscreenContext
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
	group: 'z_aBout',
	command: {
		id: ShowABoutDialogAction.ID,
		title: nls.localize({ key: 'miABout', comment: ['&& denotes a mnemonic'] }, "&&ABout")
	},
	order: 1,
	when: IsMacNativeContext.toNegated()
});
