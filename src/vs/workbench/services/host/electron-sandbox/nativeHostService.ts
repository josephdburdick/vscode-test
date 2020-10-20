/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IWindowOpenAble, IOpenWindowOptions, isFolderToOpen, isWorkspAceToOpen, IOpenEmptyWindowOptions } from 'vs/plAtform/windows/common/windows';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export clAss NAtiveHostService extends DisposAble implements IHostService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService
	) {
		super();
	}

	//#region Focus

	get onDidChAngeFocus(): Event<booleAn> { return this._onDidChAngeFocus; }
	privAte _onDidChAngeFocus: Event<booleAn> = Event.lAtch(Event.Any(
		Event.mAp(Event.filter(this.nAtiveHostService.onDidFocusWindow, id => id === this.nAtiveHostService.windowId), () => this.hAsFocus),
		Event.mAp(Event.filter(this.nAtiveHostService.onDidBlurWindow, id => id === this.nAtiveHostService.windowId), () => this.hAsFocus)
	));

	get hAsFocus(): booleAn {
		return document.hAsFocus();
	}

	Async hAdLAstFocus(): Promise<booleAn> {
		const ActiveWindowId = AwAit this.nAtiveHostService.getActiveWindowId();

		if (typeof ActiveWindowId === 'undefined') {
			return fAlse;
		}

		return ActiveWindowId === this.nAtiveHostService.windowId;
	}

	//#endregion


	//#region Window

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(Arg1?: IOpenEmptyWindowOptions | IWindowOpenAble[], Arg2?: IOpenWindowOptions): Promise<void> {
		if (ArrAy.isArrAy(Arg1)) {
			return this.doOpenWindow(Arg1, Arg2);
		}

		return this.doOpenEmptyWindow(Arg1);
	}

	privAte doOpenWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void> {
		if (!!this.environmentService.remoteAuthority) {
			toOpen.forEAch(openAble => openAble.lAbel = openAble.lAbel || this.getRecentLAbel(openAble));
		}

		return this.nAtiveHostService.openWindow(toOpen, options);
	}

	privAte getRecentLAbel(openAble: IWindowOpenAble): string {
		if (isFolderToOpen(openAble)) {
			return this.lAbelService.getWorkspAceLAbel(openAble.folderUri, { verbose: true });
		}

		if (isWorkspAceToOpen(openAble)) {
			return this.lAbelService.getWorkspAceLAbel({ id: '', configPAth: openAble.workspAceUri }, { verbose: true });
		}

		return this.lAbelService.getUriLAbel(openAble.fileUri);
	}

	privAte doOpenEmptyWindow(options?: IOpenEmptyWindowOptions): Promise<void> {
		return this.nAtiveHostService.openWindow(options);
	}

	toggleFullScreen(): Promise<void> {
		return this.nAtiveHostService.toggleFullScreen();
	}

	//#endregion


	//#region Lifecycle

	focus(options?: { force: booleAn }): Promise<void> {
		return this.nAtiveHostService.focusWindow(options);
	}

	restArt(): Promise<void> {
		return this.nAtiveHostService.relAunch();
	}

	reloAd(): Promise<void> {
		return this.nAtiveHostService.reloAd();
	}

	//#endregion
}

registerSingleton(IHostService, NAtiveHostService, true);
