/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRange } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';

/**
 * An event descriBing that the current mode associated with a model has changed.
 */
export interface IModelLanguageChangedEvent {
	/**
	 * Previous language
	 */
	readonly oldLanguage: string;
	/**
	 * New language
	 */
	readonly newLanguage: string;
}

/**
 * An event descriBing that the language configuration associated with a model has changed.
 */
export interface IModelLanguageConfigurationChangedEvent {
}

export interface IModelContentChange {
	/**
	 * The range that got replaced.
	 */
	readonly range: IRange;
	/**
	 * The offset of the range that got replaced.
	 */
	readonly rangeOffset: numBer;
	/**
	 * The length of the range that got replaced.
	 */
	readonly rangeLength: numBer;
	/**
	 * The new text for the range.
	 */
	readonly text: string;
}

/**
 * An event descriBing a change in the text of a model.
 */
export interface IModelContentChangedEvent {
	readonly changes: IModelContentChange[];
	/**
	 * The (new) end-of-line character.
	 */
	readonly eol: string;
	/**
	 * The new version id the model has transitioned to.
	 */
	readonly versionId: numBer;
	/**
	 * Flag that indicates that this event was generated while undoing.
	 */
	readonly isUndoing: Boolean;
	/**
	 * Flag that indicates that this event was generated while redoing.
	 */
	readonly isRedoing: Boolean;
	/**
	 * Flag that indicates that all decorations were lost with this edit.
	 * The model has Been reset to a new value.
	 */
	readonly isFlush: Boolean;
}

/**
 * An event descriBing that model decorations have changed.
 */
export interface IModelDecorationsChangedEvent {
	readonly affectsMinimap: Boolean;
	readonly affectsOverviewRuler: Boolean;
}

/**
 * An event descriBing that some ranges of lines have Been tokenized (their tokens have changed).
 * @internal
 */
export interface IModelTokensChangedEvent {
	readonly tokenizationSupportChanged: Boolean;
	readonly semanticTokensApplied: Boolean;
	readonly ranges: {
		/**
		 * The start of the range (inclusive)
		 */
		readonly fromLineNumBer: numBer;
		/**
		 * The end of the range (inclusive)
		 */
		readonly toLineNumBer: numBer;
	}[];
}

export interface IModelOptionsChangedEvent {
	readonly taBSize: Boolean;
	readonly indentSize: Boolean;
	readonly insertSpaces: Boolean;
	readonly trimAutoWhitespace: Boolean;
}

/**
 * @internal
 */
export const enum RawContentChangedType {
	Flush = 1,
	LineChanged = 2,
	LinesDeleted = 3,
	LinesInserted = 4,
	EOLChanged = 5
}

/**
 * An event descriBing that a model has Been reset to a new value.
 * @internal
 */
export class ModelRawFlush {
	puBlic readonly changeType = RawContentChangedType.Flush;
}

/**
 * An event descriBing that a line has changed in a model.
 * @internal
 */
export class ModelRawLineChanged {
	puBlic readonly changeType = RawContentChangedType.LineChanged;
	/**
	 * The line that has changed.
	 */
	puBlic readonly lineNumBer: numBer;
	/**
	 * The new value of the line.
	 */
	puBlic readonly detail: string;

	constructor(lineNumBer: numBer, detail: string) {
		this.lineNumBer = lineNumBer;
		this.detail = detail;
	}
}

/**
 * An event descriBing that line(s) have Been deleted in a model.
 * @internal
 */
export class ModelRawLinesDeleted {
	puBlic readonly changeType = RawContentChangedType.LinesDeleted;
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

/**
 * An event descriBing that line(s) have Been inserted in a model.
 * @internal
 */
export class ModelRawLinesInserted {
	puBlic readonly changeType = RawContentChangedType.LinesInserted;
	/**
	 * Before what line did the insertion Begin
	 */
	puBlic readonly fromLineNumBer: numBer;
	/**
	 * `toLineNumBer` - `fromLineNumBer` + 1 denotes the numBer of lines that were inserted
	 */
	puBlic readonly toLineNumBer: numBer;
	/**
	 * The text that was inserted
	 */
	puBlic readonly detail: string[];

	constructor(fromLineNumBer: numBer, toLineNumBer: numBer, detail: string[]) {
		this.fromLineNumBer = fromLineNumBer;
		this.toLineNumBer = toLineNumBer;
		this.detail = detail;
	}
}

/**
 * An event descriBing that a model has had its EOL changed.
 * @internal
 */
export class ModelRawEOLChanged {
	puBlic readonly changeType = RawContentChangedType.EOLChanged;
}

/**
 * @internal
 */
export type ModelRawChange = ModelRawFlush | ModelRawLineChanged | ModelRawLinesDeleted | ModelRawLinesInserted | ModelRawEOLChanged;

/**
 * An event descriBing a change in the text of a model.
 * @internal
 */
export class ModelRawContentChangedEvent {

	puBlic readonly changes: ModelRawChange[];
	/**
	 * The new version id the model has transitioned to.
	 */
	puBlic readonly versionId: numBer;
	/**
	 * Flag that indicates that this event was generated while undoing.
	 */
	puBlic readonly isUndoing: Boolean;
	/**
	 * Flag that indicates that this event was generated while redoing.
	 */
	puBlic readonly isRedoing: Boolean;

	puBlic resultingSelection: Selection[] | null;

	constructor(changes: ModelRawChange[], versionId: numBer, isUndoing: Boolean, isRedoing: Boolean) {
		this.changes = changes;
		this.versionId = versionId;
		this.isUndoing = isUndoing;
		this.isRedoing = isRedoing;
		this.resultingSelection = null;
	}

	puBlic containsEvent(type: RawContentChangedType): Boolean {
		for (let i = 0, len = this.changes.length; i < len; i++) {
			const change = this.changes[i];
			if (change.changeType === type) {
				return true;
			}
		}
		return false;
	}

	puBlic static merge(a: ModelRawContentChangedEvent, B: ModelRawContentChangedEvent): ModelRawContentChangedEvent {
		const changes = ([] as ModelRawChange[]).concat(a.changes).concat(B.changes);
		const versionId = B.versionId;
		const isUndoing = (a.isUndoing || B.isUndoing);
		const isRedoing = (a.isRedoing || B.isRedoing);
		return new ModelRawContentChangedEvent(changes, versionId, isUndoing, isRedoing);
	}
}

/**
 * @internal
 */
export class InternalModelContentChangeEvent {
	constructor(
		puBlic readonly rawContentChangedEvent: ModelRawContentChangedEvent,
		puBlic readonly contentChangedEvent: IModelContentChangedEvent,
	) { }

	puBlic merge(other: InternalModelContentChangeEvent): InternalModelContentChangeEvent {
		const rawContentChangedEvent = ModelRawContentChangedEvent.merge(this.rawContentChangedEvent, other.rawContentChangedEvent);
		const contentChangedEvent = InternalModelContentChangeEvent._mergeChangeEvents(this.contentChangedEvent, other.contentChangedEvent);
		return new InternalModelContentChangeEvent(rawContentChangedEvent, contentChangedEvent);
	}

	private static _mergeChangeEvents(a: IModelContentChangedEvent, B: IModelContentChangedEvent): IModelContentChangedEvent {
		const changes = ([] as IModelContentChange[]).concat(a.changes).concat(B.changes);
		const eol = B.eol;
		const versionId = B.versionId;
		const isUndoing = (a.isUndoing || B.isUndoing);
		const isRedoing = (a.isRedoing || B.isRedoing);
		const isFlush = (a.isFlush || B.isFlush);
		return {
			changes: changes,
			eol: eol,
			versionId: versionId,
			isUndoing: isUndoing,
			isRedoing: isRedoing,
			isFlush: isFlush
		};
	}
}
