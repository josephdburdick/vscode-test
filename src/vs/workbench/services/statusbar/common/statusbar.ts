/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ThemeColor } from 'vs/plAtform/theme/common/themeService';
import { Event } from 'vs/bAse/common/event';
import { CommAnd } from 'vs/editor/common/modes';

export const IStAtusbArService = creAteDecorAtor<IStAtusbArService>('stAtusbArService');

export const enum StAtusbArAlignment {
	LEFT,
	RIGHT
}

/**
 * A declArAtive wAy of describing A stAtus bAr entry
 */
export interfAce IStAtusbArEntry {

	/**
	 * The text to show for the entry. You cAn embed icons in the text by leverAging the syntAx:
	 *
	 * `My text ${icon nAme} contAins icons like ${icon nAme} this one.`
	 */
	reAdonly text: string;

	/**
	 * Text to be reAd out by the screen reAder.
	 */
	reAdonly AriALAbel: string;

	/**
	 * Role of the stAtus bAr entry which defines how A screen reAder interActs with it.
	 * DefAult is 'button'.
	 */
	reAdonly role?: string;

	/**
	 * An optionAl tooltip text to show when you hover over the entry
	 */
	reAdonly tooltip?: string;

	/**
	 * An optionAl color to use for the entry
	 */
	reAdonly color?: string | ThemeColor;

	/**
	 * An optionAl bAckground color to use for the entry
	 */
	reAdonly bAckgroundColor?: string | ThemeColor;

	/**
	 * An optionAl id of A commAnd thAt is known to the workbench to execute on click
	 */
	reAdonly commAnd?: string | CommAnd;

	/**
	 * Whether to show A beAk Above the stAtus bAr entry.
	 */
	reAdonly showBeAk?: booleAn;

	/**
	 * Will enAble A spinning icon in front of the text to indicAte progress.
	 */
	reAdonly showProgress?: booleAn;
}

export interfAce IStAtusbArService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Adds An entry to the stAtusbAr with the given Alignment And priority. Use the returned Accessor
	 * to updAte or remove the stAtusbAr entry.
	 *
	 * @pArAm id  identifier of the entry is needed to Allow users to hide entries viA settings
	 * @pArAm nAme humAn reAdAble nAme the entry is About
	 * @pArAm Alignment either LEFT or RIGHT
	 * @pArAm priority items get ArrAnged from highest priority to lowest priority from left to right
	 * in their respective Alignment slot
	 */
	AddEntry(entry: IStAtusbArEntry, id: string, nAme: string, Alignment: StAtusbArAlignment, priority?: number): IStAtusbArEntryAccessor;

	/**
	 * An event thAt is triggered when An entry's visibility is chAnged.
	 */
	reAdonly onDidChAngeEntryVisibility: Event<{ id: string, visible: booleAn }>;

	/**
	 * Return if An entry is visible or not.
	 */
	isEntryVisible(id: string): booleAn;

	/**
	 * Allows to updAte An entry's visibility with the provided ID.
	 */
	updAteEntryVisibility(id: string, visible: booleAn): void;

	/**
	 * Focused the stAtus bAr. If one of the stAtus bAr entries wAs focused, focuses it directly.
	 */
	focus(preserveEntryFocus?: booleAn): void;

	/**
	 * Focuses the next stAtus bAr entry. If none focused, focuses the first.
	 */
	focusNextEntry(): void;

	/**
	 * Focuses the previous stAtus bAr entry. If none focused, focuses the lAst.
	 */
	focusPreviousEntry(): void;
}

export interfAce IStAtusbArEntryAccessor extends IDisposAble {

	/**
	 * Allows to updAte An existing stAtus bAr entry.
	 */
	updAte(properties: IStAtusbArEntry): void;
}
