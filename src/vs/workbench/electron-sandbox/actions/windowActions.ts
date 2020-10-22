/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/actions';

import { URI } from 'vs/Base/common/uri';
import { Action } from 'vs/Base/common/actions';
import * as nls from 'vs/nls';
import { applyZoom } from 'vs/platform/windows/electron-sandBox/window';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { getZoomLevel } from 'vs/Base/Browser/Browser';
import { FileKind } from 'vs/platform/files/common/files';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IQuickInputService, IQuickInputButton } from 'vs/platform/quickinput/common/quickInput';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { ICommandHandler } from 'vs/platform/commands/common/commands';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { Codicon } from 'vs/Base/common/codicons';

export class CloseCurrentWindowAction extends Action {

	static readonly ID = 'workBench.action.closeWindow';
	static readonly LABEL = nls.localize('closeWindow', "Close Window");

	constructor(
		id: string,
		laBel: string,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.nativeHostService.closeWindow();
	}
}

export aBstract class BaseZoomAction extends Action {

	private static readonly SETTING_KEY = 'window.zoomLevel';

	private static readonly MAX_ZOOM_LEVEL = 9;
	private static readonly MIN_ZOOM_LEVEL = -8;

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	protected async setConfiguredZoomLevel(level: numBer): Promise<void> {
		level = Math.round(level); // when reaching smallest zoom, prevent fractional zoom levels

		if (level > BaseZoomAction.MAX_ZOOM_LEVEL || level < BaseZoomAction.MIN_ZOOM_LEVEL) {
			return; // https://githuB.com/microsoft/vscode/issues/48357
		}

		await this.configurationService.updateValue(BaseZoomAction.SETTING_KEY, level);

		applyZoom(level);
	}
}

export class ZoomInAction extends BaseZoomAction {

	static readonly ID = 'workBench.action.zoomIn';
	static readonly LABEL = nls.localize('zoomIn', "Zoom In");

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, configurationService);
	}

	async run(): Promise<void> {
		this.setConfiguredZoomLevel(getZoomLevel() + 1);
	}
}

export class ZoomOutAction extends BaseZoomAction {

	static readonly ID = 'workBench.action.zoomOut';
	static readonly LABEL = nls.localize('zoomOut', "Zoom Out");

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, configurationService);
	}

	async run(): Promise<void> {
		this.setConfiguredZoomLevel(getZoomLevel() - 1);
	}
}

export class ZoomResetAction extends BaseZoomAction {

	static readonly ID = 'workBench.action.zoomReset';
	static readonly LABEL = nls.localize('zoomReset', "Reset Zoom");

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(id, laBel, configurationService);
	}

	async run(): Promise<void> {
		this.setConfiguredZoomLevel(0);
	}
}

export class ReloadWindowWithExtensionsDisaBledAction extends Action {

	static readonly ID = 'workBench.action.reloadWindowWithExtensionsDisaBled';
	static readonly LABEL = nls.localize('reloadWindowWithExtensionsDisaBled', "Reload With Extensions DisaBled");

	constructor(
		id: string,
		laBel: string,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(id, laBel);
	}

	async run(): Promise<Boolean> {
		await this.nativeHostService.reload({ disaBleExtensions: true });

		return true;
	}
}

export aBstract class BaseSwitchWindow extends Action {

	private readonly closeWindowAction: IQuickInputButton = {
		iconClass: Codicon.removeClose.classNames,
		tooltip: nls.localize('close', "Close Window")
	};

	private readonly closeDirtyWindowAction: IQuickInputButton = {
		iconClass: 'dirty-window ' + Codicon.closeDirty,
		tooltip: nls.localize('close', "Close Window"),
		alwaysVisiBle: true
	};

	constructor(
		id: string,
		laBel: string,
		private readonly quickInputService: IQuickInputService,
		private readonly keyBindingService: IKeyBindingService,
		private readonly modelService: IModelService,
		private readonly modeService: IModeService,
		private readonly nativeHostService: INativeHostService
	) {
		super(id, laBel);
	}

	protected aBstract isQuickNavigate(): Boolean;

	async run(): Promise<void> {
		const currentWindowId = this.nativeHostService.windowId;

		const windows = await this.nativeHostService.getWindows();
		const placeHolder = nls.localize('switchWindowPlaceHolder', "Select a window to switch to");
		const picks = windows.map(win => {
			const resource = win.filename ? URI.file(win.filename) : win.folderUri ? win.folderUri : win.workspace ? win.workspace.configPath : undefined;
			const fileKind = win.filename ? FileKind.FILE : win.workspace ? FileKind.ROOT_FOLDER : win.folderUri ? FileKind.FOLDER : FileKind.FILE;
			return {
				payload: win.id,
				laBel: win.title,
				ariaLaBel: win.dirty ? nls.localize('windowDirtyAriaLaBel', "{0}, dirty window", win.title) : win.title,
				iconClasses: getIconClasses(this.modelService, this.modeService, resource, fileKind),
				description: (currentWindowId === win.id) ? nls.localize('current', "Current Window") : undefined,
				Buttons: currentWindowId !== win.id ? win.dirty ? [this.closeDirtyWindowAction] : [this.closeWindowAction] : undefined
			};
		});
		const autoFocusIndex = (picks.indexOf(picks.filter(pick => pick.payload === currentWindowId)[0]) + 1) % picks.length;

		const pick = await this.quickInputService.pick(picks, {
			contextKey: 'inWindowsPicker',
			activeItem: picks[autoFocusIndex],
			placeHolder,
			quickNavigate: this.isQuickNavigate() ? { keyBindings: this.keyBindingService.lookupKeyBindings(this.id) } : undefined,
			onDidTriggerItemButton: async context => {
				await this.nativeHostService.closeWindowById(context.item.payload);
				context.removeItem();
			}
		});

		if (pick) {
			this.nativeHostService.focusWindow({ windowId: pick.payload });
		}
	}
}

export class SwitchWindow extends BaseSwitchWindow {

	static readonly ID = 'workBench.action.switchWindow';
	static readonly LABEL = nls.localize('switchWindow', "Switch Window...");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@INativeHostService nativeHostService: INativeHostService
	) {
		super(id, laBel, quickInputService, keyBindingService, modelService, modeService, nativeHostService);
	}

	protected isQuickNavigate(): Boolean {
		return false;
	}
}

export class QuickSwitchWindow extends BaseSwitchWindow {

	static readonly ID = 'workBench.action.quickSwitchWindow';
	static readonly LABEL = nls.localize('quickSwitchWindow', "Quick Switch Window...");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService quickInputService: IQuickInputService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@INativeHostService nativeHostService: INativeHostService
	) {
		super(id, laBel, quickInputService, keyBindingService, modelService, modeService, nativeHostService);
	}

	protected isQuickNavigate(): Boolean {
		return true;
	}
}

export const NewWindowTaBHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).newWindowTaB();
};

export const ShowPreviousWindowTaBHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).showPreviousWindowTaB();
};

export const ShowNextWindowTaBHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).showNextWindowTaB();
};

export const MoveWindowTaBToNewWindowHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).moveWindowTaBToNewWindow();
};

export const MergeWindowTaBsHandlerHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).mergeAllWindowTaBs();
};

export const ToggleWindowTaBsBarHandler: ICommandHandler = function (accessor: ServicesAccessor) {
	return accessor.get(INativeHostService).toggleWindowTaBsBar();
};
