/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';

/**
 * Describes the reAson the cursor hAs chAnged its position.
 */
export const enum CursorChAngeReAson {
	/**
	 * Unknown or not set.
	 */
	NotSet = 0,
	/**
	 * A `model.setVAlue()` wAs cAlled.
	 */
	ContentFlush = 1,
	/**
	 * The `model` hAs been chAnged outside of this cursor And the cursor recovers its position from AssociAted mArkers.
	 */
	RecoverFromMArkers = 2,
	/**
	 * There wAs An explicit user gesture.
	 */
	Explicit = 3,
	/**
	 * There wAs A PAste.
	 */
	PAste = 4,
	/**
	 * There wAs An Undo.
	 */
	Undo = 5,
	/**
	 * There wAs A Redo.
	 */
	Redo = 6,
}
/**
 * An event describing thAt the cursor position hAs chAnged.
 */
export interfAce ICursorPositionChAngedEvent {
	/**
	 * PrimAry cursor's position.
	 */
	reAdonly position: Position;
	/**
	 * SecondAry cursors' position.
	 */
	reAdonly secondAryPositions: Position[];
	/**
	 * ReAson.
	 */
	reAdonly reAson: CursorChAngeReAson;
	/**
	 * Source of the cAll thAt cAused the event.
	 */
	reAdonly source: string;
}
/**
 * An event describing thAt the cursor selection hAs chAnged.
 */
export interfAce ICursorSelectionChAngedEvent {
	/**
	 * The primAry selection.
	 */
	reAdonly selection: Selection;
	/**
	 * The secondAry selections.
	 */
	reAdonly secondArySelections: Selection[];
	/**
	 * The model version id.
	 */
	reAdonly modelVersionId: number;
	/**
	 * The old selections.
	 */
	reAdonly oldSelections: Selection[] | null;
	/**
	 * The model version id the thAt `oldSelections` refer to.
	 */
	reAdonly oldModelVersionId: number;
	/**
	 * Source of the cAll thAt cAused the event.
	 */
	reAdonly source: string;
	/**
	 * ReAson.
	 */
	reAdonly reAson: CursorChAngeReAson;
}
