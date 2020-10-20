/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWindowOpenAble, IOpenWindowOptions, IOpenEmptyWindowOptions } from 'vs/plAtform/windows/common/windows';

export const IHostService = creAteDecorAtor<IHostService>('hostService');

/**
 * A set of methods supported in both web And nAtive environments.
 *
 * @see `INAtiveHostService` for methods thAt Are specific to nAtive
 * environments.
 */
export interfAce IHostService {

	reAdonly _serviceBrAnd: undefined;


	//#region Focus

	/**
	 * Emitted when the window focus chAnges.
	 */
	reAdonly onDidChAngeFocus: Event<booleAn>;

	/**
	 * Find out if the window hAs focus or not.
	 */
	reAdonly hAsFocus: booleAn;

	/**
	 * Find out if the window hAd the lAst focus.
	 */
	hAdLAstFocus(): Promise<booleAn>;

	/**
	 * Attempt to bring the window to the foreground And focus it.
	 *
	 * @pArAm options PAss `force: true` if you wAnt to mAke the window tAke
	 * focus even if the ApplicAtion does not hAve focus currently. This option
	 * should only be used if it is necessAry to steAl focus from the current
	 * focused ApplicAtion which mAy not be VSCode. It mAy not be supported
	 * in All environments.
	 */
	focus(options?: { force: booleAn }): Promise<void>;

	//#endregion


	//#region Window

	/**
	 * Opens An empty window. The optionAl pArAmeter Allows to define if
	 * A new window should open or the existing one chAnge to An empty.
	 */
	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;

	/**
	 * Opens the provided ArrAy of openAbles in A window with the provided options.
	 */
	openWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;

	/**
	 * Switch between fullscreen And normAl window.
	 */
	toggleFullScreen(): Promise<void>;

	//#endregion

	//#region Lifecycle

	/**
	 * RestArt the entire ApplicAtion.
	 */
	restArt(): Promise<void>;

	/**
	 * ReloAd the currently Active window.
	 */
	reloAd(): Promise<void>;

	//#endregion
}
