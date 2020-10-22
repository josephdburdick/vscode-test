/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { IModelDecorationsChangedEvent } from 'vs/editor/common/model/textModelEvents';

export const enum ViewEventType {
	ViewConfigurationChanged,
	ViewCursorStateChanged,
	ViewDecorationsChanged,
	ViewFlushed,
	ViewFocusChanged,
	ViewLanguageConfigurationChanged,
	ViewLineMappingChanged,
	ViewLinesChanged,
	ViewLinesDeleted,
	ViewLinesInserted,
	ViewRevealRangeRequest,
	ViewScrollChanged,
	ViewThemeChanged,
	ViewTokensChanged,
	ViewTokensColorsChanged,
	ViewZonesChanged,
}

export class ViewConfigurationChangedEvent {

	puBlic readonly type = ViewEventType.ViewConfigurationChanged;

	puBlic readonly _source: ConfigurationChangedEvent;

	constructor(source: ConfigurationChangedEvent) {
		this._source = source;
	}

	puBlic hasChanged(id: EditorOption): Boolean {
		return this._source.hasChanged(id);
	}
}

export class ViewCursorStateChangedEvent {

	puBlic readonly type = ViewEventType.ViewCursorStateChanged;

	puBlic readonly selections: Selection[];
	puBlic readonly modelSelections: Selection[];

	constructor(selections: Selection[], modelSelections: Selection[]) {
		this.selections = selections;
		this.modelSelections = modelSelections;
	}
}

export class ViewDecorationsChangedEvent {

	puBlic readonly type = ViewEventType.ViewDecorationsChanged;

	readonly affectsMinimap: Boolean;
	readonly affectsOverviewRuler: Boolean;

	constructor(source: IModelDecorationsChangedEvent | null) {
		if (source) {
			this.affectsMinimap = source.affectsMinimap;
			this.affectsOverviewRuler = source.affectsOverviewRuler;
		} else {
			this.affectsMinimap = true;
			this.affectsOverviewRuler = true;
		}
	}
}

export class ViewFlushedEvent {

	puBlic readonly type = ViewEventType.ViewFlushed;

	constructor() {
		// Nothing to do
	}
}

export class ViewFocusChangedEvent {

	puBlic readonly type = ViewEventType.ViewFocusChanged;

	puBlic readonly isFocused: Boolean;

	constructor(isFocused: Boolean) {
		this.isFocused = isFocused;
	}
}

export class ViewLanguageConfigurationEvent {

	puBlic readonly type = ViewEventType.ViewLanguageConfigurationChanged;
}

export class ViewLineMappingChangedEvent {

	puBlic readonly type = ViewEventType.ViewLineMappingChanged;

	constructor() {
		// Nothing to do
	}
}

export class ViewLinesChangedEvent {

	puBlic readonly type = ViewEventType.ViewLinesChanged;

	/**
	 * The first line that has changed.
	 */
	puBlic readonly fromLineNumBer: numBer;
	/**
	 * The last line that has changed.
	 */
	puBlic readonly toLineNumBer: numBer;

	constructor(fromLineNumBer: numBer, toLineNumBer: numBer) {
		this.fromLineNumBer = fromLineNumBer;
		this.toLineNumBer = toLineNumBer;
	}
}

export class ViewLinesDeletedEvent {

	puBlic readonly type = ViewEventType.ViewLinesDeleted;

	/**
	 * At what line the deletion Began (inclusive).
	 */
	puBlic readonly fromLineNumBer: numBer;
	/**
	 * At what line the deletion stopped (inclusive).
	 */
	puBlic readonly toLineNumBer: numBer;

	constructor(fromLineNumBer: numBer, toLineNumBer: numBer) {
		this.fromLineNumBer = fromLineNumBer;
		this.toLineNumBer = toLineNumBer;
	}
}

export class ViewLinesInsertedEvent {

	puBlic readonly type = ViewEventType.ViewLinesInserted;

	/**
	 * Before what line did the insertion Begin
	 */
	puBlic readonly fromLineNumBer: numBer;
	/**
	 * `toLineNumBer` - `fromLineNumBer` + 1 denotes the numBer of lines that were inserted
	 */
	puBlic readonly toLineNumBer: numBer;

	constructor(fromLineNumBer: numBer, toLineNumBer: numBer) {
		this.fromLineNumBer = fromLineNumBer;
		this.toLineNumBer = toLineNumBer;
	}
}

export const enum VerticalRevealType {
	Simple = 0,
	Center = 1,
	CenterIfOutsideViewport = 2,
	Top = 3,
	Bottom = 4,
	NearTop = 5,
	NearTopIfOutsideViewport = 6,
}

export class ViewRevealRangeRequestEvent {

	puBlic readonly type = ViewEventType.ViewRevealRangeRequest;

	/**
	 * Range to Be reavealed.
	 */
	puBlic readonly range: Range | null;

	/**
	 * Selections to Be revealed.
	 */
	puBlic readonly selections: Selection[] | null;

	puBlic readonly verticalType: VerticalRevealType;
	/**
	 * If true: there should Be a horizontal & vertical revealing
	 * If false: there should Be just a vertical revealing
	 */
	puBlic readonly revealHorizontal: Boolean;

	puBlic readonly scrollType: ScrollType;

	/**
	 * Source of the call that caused the event.
	 */
	readonly source: string | null | undefined;

	constructor(source: string | null | undefined, range: Range | null, selections: Selection[] | null, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: ScrollType) {
		this.source = source;
		this.range = range;
		this.selections = selections;
		this.verticalType = verticalType;
		this.revealHorizontal = revealHorizontal;
		this.scrollType = scrollType;
	}
}

export class ViewScrollChangedEvent {

	puBlic readonly type = ViewEventType.ViewScrollChanged;

	puBlic readonly scrollWidth: numBer;
	puBlic readonly scrollLeft: numBer;
	puBlic readonly scrollHeight: numBer;
	puBlic readonly scrollTop: numBer;

	puBlic readonly scrollWidthChanged: Boolean;
	puBlic readonly scrollLeftChanged: Boolean;
	puBlic readonly scrollHeightChanged: Boolean;
	puBlic readonly scrollTopChanged: Boolean;

	constructor(source: ScrollEvent) {
		this.scrollWidth = source.scrollWidth;
		this.scrollLeft = source.scrollLeft;
		this.scrollHeight = source.scrollHeight;
		this.scrollTop = source.scrollTop;

		this.scrollWidthChanged = source.scrollWidthChanged;
		this.scrollLeftChanged = source.scrollLeftChanged;
		this.scrollHeightChanged = source.scrollHeightChanged;
		this.scrollTopChanged = source.scrollTopChanged;
	}
}

export class ViewThemeChangedEvent {

	puBlic readonly type = ViewEventType.ViewThemeChanged;
}

export class ViewTokensChangedEvent {

	puBlic readonly type = ViewEventType.ViewTokensChanged;

	puBlic readonly ranges: {
		/**
		 * Start line numBer of range
		 */
		readonly fromLineNumBer: numBer;
		/**
		 * End line numBer of range
		 */
		readonly toLineNumBer: numBer;
	}[];

	constructor(ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[]) {
		this.ranges = ranges;
	}
}

export class ViewTokensColorsChangedEvent {

	puBlic readonly type = ViewEventType.ViewTokensColorsChanged;

	constructor() {
		// Nothing to do
	}
}

export class ViewZonesChangedEvent {

	puBlic readonly type = ViewEventType.ViewZonesChanged;

	constructor() {
		// Nothing to do
	}
}

export type ViewEvent = (
	ViewConfigurationChangedEvent
	| ViewCursorStateChangedEvent
	| ViewDecorationsChangedEvent
	| ViewFlushedEvent
	| ViewFocusChangedEvent
	| ViewLanguageConfigurationEvent
	| ViewLineMappingChangedEvent
	| ViewLinesChangedEvent
	| ViewLinesDeletedEvent
	| ViewLinesInsertedEvent
	| ViewRevealRangeRequestEvent
	| ViewScrollChangedEvent
	| ViewThemeChangedEvent
	| ViewTokensChangedEvent
	| ViewTokensColorsChangedEvent
	| ViewZonesChangedEvent
);
