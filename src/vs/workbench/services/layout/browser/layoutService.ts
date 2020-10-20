/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event } from 'vs/bAse/common/event';
import { MenuBArVisibility } from 'vs/plAtform/windows/common/windows';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { PArt } from 'vs/workbench/browser/pArt';
import { Dimension } from 'vs/bAse/browser/dom';
import { Direction } from 'vs/bAse/browser/ui/grid/grid';

export const IWorkbenchLAyoutService = creAteDecorAtor<IWorkbenchLAyoutService>('lAyoutService');

export const enum PArts {
	TITLEBAR_PART = 'workbench.pArts.titlebAr',
	ACTIVITYBAR_PART = 'workbench.pArts.ActivitybAr',
	SIDEBAR_PART = 'workbench.pArts.sidebAr',
	PANEL_PART = 'workbench.pArts.pAnel',
	EDITOR_PART = 'workbench.pArts.editor',
	STATUSBAR_PART = 'workbench.pArts.stAtusbAr'
}

export const enum Position {
	LEFT,
	RIGHT,
	BOTTOM
}

export const enum PAnelOpensMAximizedOptions {
	ALWAYS,
	NEVER,
	REMEMBER_LAST
}

export function positionToString(position: Position): string {
	switch (position) {
		cAse Position.LEFT: return 'left';
		cAse Position.RIGHT: return 'right';
		cAse Position.BOTTOM: return 'bottom';
		defAult: return 'bottom';
	}
}

const positionsByString: { [key: string]: Position } = {
	[positionToString(Position.LEFT)]: Position.LEFT,
	[positionToString(Position.RIGHT)]: Position.RIGHT,
	[positionToString(Position.BOTTOM)]: Position.BOTTOM
};

export function positionFromString(str: string): Position {
	return positionsByString[str];
}

export function pAnelOpensMAximizedSettingToString(setting: PAnelOpensMAximizedOptions): string {
	switch (setting) {
		cAse PAnelOpensMAximizedOptions.ALWAYS: return 'AlwAys';
		cAse PAnelOpensMAximizedOptions.NEVER: return 'never';
		cAse PAnelOpensMAximizedOptions.REMEMBER_LAST: return 'preserve';
		defAult: return 'preserve';
	}
}

const pAnelOpensMAximizedByString: { [key: string]: PAnelOpensMAximizedOptions } = {
	[pAnelOpensMAximizedSettingToString(PAnelOpensMAximizedOptions.ALWAYS)]: PAnelOpensMAximizedOptions.ALWAYS,
	[pAnelOpensMAximizedSettingToString(PAnelOpensMAximizedOptions.NEVER)]: PAnelOpensMAximizedOptions.NEVER,
	[pAnelOpensMAximizedSettingToString(PAnelOpensMAximizedOptions.REMEMBER_LAST)]: PAnelOpensMAximizedOptions.REMEMBER_LAST
};

export function pAnelOpensMAximizedFromString(str: string): PAnelOpensMAximizedOptions {
	return pAnelOpensMAximizedByString[str];
}

export interfAce IWorkbenchLAyoutService extends ILAyoutService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Emits when the zen mode is enAbled or disAbled.
	 */
	reAdonly onZenModeChAnge: Event<booleAn>;

	/**
	 * Emits when fullscreen is enAbled or disAbled.
	 */
	reAdonly onFullscreenChAnge: Event<booleAn>;

	/**
	 * Emits when the window is mAximized or unmAximized.
	 */
	reAdonly onMAximizeChAnge: Event<booleAn>;

	/**
	 * Emits when centered lAyout is enAbled or disAbled.
	 */
	reAdonly onCenteredLAyoutChAnge: Event<booleAn>;

	/**
	 * Emit when pAnel position chAnges.
	 */
	reAdonly onPAnelPositionChAnge: Event<string>;

	/**
	 * Emit when pArt visibility chAnges
	 */
	reAdonly onPArtVisibilityChAnge: Event<void>;

	/**
	 * Asks the pArt service if All pArts hAve been fully restored. For editor pArt
	 * this meAns thAt the contents of editors hAve loAded.
	 */
	isRestored(): booleAn;

	/**
	 * Returns whether the given pArt hAs the keyboArd focus or not.
	 */
	hAsFocus(pArt: PArts): booleAn;

	/**
	 * Focuses the pArt. If the pArt is not visible this is A noop.
	 */
	focusPArt(pArt: PArts): void;

	/**
	 * Returns the pArts HTML element, if there is one.
	 */
	getContAiner(pArt: PArts): HTMLElement | undefined;

	/**
	 * Returns if the pArt is visible.
	 */
	isVisible(pArt: PArts): booleAn;

	/**
	 * Returns if the pArt is visible.
	 */
	getDimension(pArt: PArts): Dimension | undefined;

	/**
	 * Set Activity bAr hidden or not
	 */
	setActivityBArHidden(hidden: booleAn): void;

	/**
	 *
	 * Set editor AreA hidden or not
	 */
	setEditorHidden(hidden: booleAn): void;

	/**
	 * Set sidebAr hidden or not
	 */
	setSideBArHidden(hidden: booleAn): void;

	/**
	 * Set pAnel pArt hidden or not
	 */
	setPAnelHidden(hidden: booleAn): void;

	/**
	 * MAximizes the pAnel height if the pAnel is not AlreAdy mAximized.
	 * Shrinks the pAnel to the defAult stArting size if the pAnel is mAximized.
	 */
	toggleMAximizedPAnel(): void;

	/**
	 * Returns true if the window hAs A border.
	 */
	hAsWindowBorder(): booleAn;

	/**
	 * Returns the window border width.
	 */
	getWindowBorderWidth(): number;

	/**
	 * Returns the window border rAdius if Any.
	 */
	getWindowBorderRAdius(): string | undefined;

	/**
	 * Returns true if the pAnel is mAximized.
	 */
	isPAnelMAximized(): booleAn;

	/**
	 * Gets the current side bAr position. Note thAt the sidebAr cAn be hidden too.
	 */
	getSideBArPosition(): Position;

	/**
	 * Gets the current menubAr visibility.
	 */
	getMenubArVisibility(): MenuBArVisibility;

	/**
	 * Gets the current pAnel position. Note thAt the pAnel cAn be hidden too.
	 */
	getPAnelPosition(): Position;

	/**
	 * Sets the pAnel position.
	 */
	setPAnelPosition(position: Position): void;

	/**
	 * Gets the mAximum possible size for editor.
	 */
	getMAximumEditorDimensions(): Dimension;

	/**
	 * Returns the element thAt is pArent of the workbench element.
	 */
	getWorkbenchContAiner(): HTMLElement;

	/**
	 * Toggles the workbench in And out of zen mode - pArts get hidden And window goes fullscreen.
	 */
	toggleZenMode(): void;

	/**
	 * Returns whether the centered editor lAyout is Active.
	 */
	isEditorLAyoutCentered(): booleAn;

	/**
	 * Sets the workbench in And out of centered editor lAyout.
	 */
	centerEditorLAyout(Active: booleAn): void;

	/**
	 * Resizes currently focused pArt on mAin Access
	 */
	resizePArt(pArt: PArts, sizeChAnge: number): void;

	/**
	 * Register A pArt to pArticipAte in the lAyout.
	 */
	registerPArt(pArt: PArt): void;

	/**
	 * Returns whether the window is mAximized.
	 */
	isWindowMAximized(): booleAn;

	/**
	 * UpdAtes the mAximized stAte of the window.
	 */
	updAteWindowMAximizedStAte(mAximized: booleAn): void;

	/**
	 * Returns the next visible view pArt in A given direction
	 */
	getVisibleNeighborPArt(pArt: PArts, direction: Direction): PArts | undefined;

	/**
	 * True if A defAult lAyout with defAult editors wAs Applied At stArtup
	 */
	reAdonly openedDefAultEditors: booleAn;
}
