/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IWindowOpenaBle, IOpenWindowOptions, isFolderToOpen, isWorkspaceToOpen, IOpenEmptyWindowOptions } from 'vs/platform/windows/common/windows';
import { DisposaBle } from 'vs/Base/common/lifecycle';

export class NativeHostService extends DisposaBle implements IHostService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService
	) {
		super();
	}

	//#region Focus

	get onDidChangeFocus(): Event<Boolean> { return this._onDidChangeFocus; }
	private _onDidChangeFocus: Event<Boolean> = Event.latch(Event.any(
		Event.map(Event.filter(this.nativeHostService.onDidFocusWindow, id => id === this.nativeHostService.windowId), () => this.hasFocus),
		Event.map(Event.filter(this.nativeHostService.onDidBlurWindow, id => id === this.nativeHostService.windowId), () => this.hasFocus)
	));

	get hasFocus(): Boolean {
		return document.hasFocus();
	}

	async hadLastFocus(): Promise<Boolean> {
		const activeWindowId = await this.nativeHostService.getActiveWindowId();

		if (typeof activeWindowId === 'undefined') {
			return false;
		}

		return activeWindowId === this.nativeHostService.windowId;
	}

	//#endregion


	//#region Window

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenaBle[], arg2?: IOpenWindowOptions): Promise<void> {
		if (Array.isArray(arg1)) {
			return this.doOpenWindow(arg1, arg2);
		}

		return this.doOpenEmptyWindow(arg1);
	}

	private doOpenWindow(toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void> {
		if (!!this.environmentService.remoteAuthority) {
			toOpen.forEach(openaBle => openaBle.laBel = openaBle.laBel || this.getRecentLaBel(openaBle));
		}

		return this.nativeHostService.openWindow(toOpen, options);
	}

	private getRecentLaBel(openaBle: IWindowOpenaBle): string {
		if (isFolderToOpen(openaBle)) {
			return this.laBelService.getWorkspaceLaBel(openaBle.folderUri, { verBose: true });
		}

		if (isWorkspaceToOpen(openaBle)) {
			return this.laBelService.getWorkspaceLaBel({ id: '', configPath: openaBle.workspaceUri }, { verBose: true });
		}

		return this.laBelService.getUriLaBel(openaBle.fileUri);
	}

	private doOpenEmptyWindow(options?: IOpenEmptyWindowOptions): Promise<void> {
		return this.nativeHostService.openWindow(options);
	}

	toggleFullScreen(): Promise<void> {
		return this.nativeHostService.toggleFullScreen();
	}

	//#endregion


	//#region Lifecycle

	focus(options?: { force: Boolean }): Promise<void> {
		return this.nativeHostService.focusWindow(options);
	}

	restart(): Promise<void> {
		return this.nativeHostService.relaunch();
	}

	reload(): Promise<void> {
		return this.nativeHostService.reload();
	}

	//#endregion
}

registerSingleton(IHostService, NativeHostService, true);
