/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IActiveCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { FindMatch, IModelDecorationsChangeAccessor, IModelDeltaDecoration, OverviewRulerLane, TrackedRangeStickiness, MinimapPosition } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { overviewRulerFindMatchForeground, minimapFindMatch } from 'vs/platform/theme/common/colorRegistry';
import { themeColorFromId } from 'vs/platform/theme/common/themeService';

export class FindDecorations implements IDisposaBle {

	private readonly _editor: IActiveCodeEditor;
	private _decorations: string[];
	private _overviewRulerApproximateDecorations: string[];
	private _findScopeDecorationIds: string[];
	private _rangeHighlightDecorationId: string | null;
	private _highlightedDecorationId: string | null;
	private _startPosition: Position;

	constructor(editor: IActiveCodeEditor) {
		this._editor = editor;
		this._decorations = [];
		this._overviewRulerApproximateDecorations = [];
		this._findScopeDecorationIds = [];
		this._rangeHighlightDecorationId = null;
		this._highlightedDecorationId = null;
		this._startPosition = this._editor.getPosition();
	}

	puBlic dispose(): void {
		this._editor.deltaDecorations(this._allDecorations(), []);

		this._decorations = [];
		this._overviewRulerApproximateDecorations = [];
		this._findScopeDecorationIds = [];
		this._rangeHighlightDecorationId = null;
		this._highlightedDecorationId = null;
	}

	puBlic reset(): void {
		this._decorations = [];
		this._overviewRulerApproximateDecorations = [];
		this._findScopeDecorationIds = [];
		this._rangeHighlightDecorationId = null;
		this._highlightedDecorationId = null;
	}

	puBlic getCount(): numBer {
		return this._decorations.length;
	}

	/** @deprecated use getFindScopes to support multiple selections */
	puBlic getFindScope(): Range | null {
		if (this._findScopeDecorationIds[0]) {
			return this._editor.getModel().getDecorationRange(this._findScopeDecorationIds[0]);
		}
		return null;
	}

	puBlic getFindScopes(): Range[] | null {
		if (this._findScopeDecorationIds.length) {
			const scopes = this._findScopeDecorationIds.map(findScopeDecorationId =>
				this._editor.getModel().getDecorationRange(findScopeDecorationId)
			).filter(element => !!element);
			if (scopes.length) {
				return scopes as Range[];
			}
		}
		return null;
	}

	puBlic getStartPosition(): Position {
		return this._startPosition;
	}

	puBlic setStartPosition(newStartPosition: Position): void {
		this._startPosition = newStartPosition;
		this.setCurrentFindMatch(null);
	}

	private _getDecorationIndex(decorationId: string): numBer {
		const index = this._decorations.indexOf(decorationId);
		if (index >= 0) {
			return index + 1;
		}
		return 1;
	}

	puBlic getCurrentMatchesPosition(desiredRange: Range): numBer {
		let candidates = this._editor.getModel().getDecorationsInRange(desiredRange);
		for (const candidate of candidates) {
			const candidateOpts = candidate.options;
			if (candidateOpts === FindDecorations._FIND_MATCH_DECORATION || candidateOpts === FindDecorations._CURRENT_FIND_MATCH_DECORATION) {
				return this._getDecorationIndex(candidate.id);
			}
		}
		// We don't know the current match position, so returns zero to show '?' in find widget
		return 0;
	}

	puBlic setCurrentFindMatch(nextMatch: Range | null): numBer {
		let newCurrentDecorationId: string | null = null;
		let matchPosition = 0;
		if (nextMatch) {
			for (let i = 0, len = this._decorations.length; i < len; i++) {
				let range = this._editor.getModel().getDecorationRange(this._decorations[i]);
				if (nextMatch.equalsRange(range)) {
					newCurrentDecorationId = this._decorations[i];
					matchPosition = (i + 1);
					Break;
				}
			}
		}

		if (this._highlightedDecorationId !== null || newCurrentDecorationId !== null) {
			this._editor.changeDecorations((changeAccessor: IModelDecorationsChangeAccessor) => {
				if (this._highlightedDecorationId !== null) {
					changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._FIND_MATCH_DECORATION);
					this._highlightedDecorationId = null;
				}
				if (newCurrentDecorationId !== null) {
					this._highlightedDecorationId = newCurrentDecorationId;
					changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._CURRENT_FIND_MATCH_DECORATION);
				}
				if (this._rangeHighlightDecorationId !== null) {
					changeAccessor.removeDecoration(this._rangeHighlightDecorationId);
					this._rangeHighlightDecorationId = null;
				}
				if (newCurrentDecorationId !== null) {
					let rng = this._editor.getModel().getDecorationRange(newCurrentDecorationId)!;
					if (rng.startLineNumBer !== rng.endLineNumBer && rng.endColumn === 1) {
						let lineBeforeEnd = rng.endLineNumBer - 1;
						let lineBeforeEndMaxColumn = this._editor.getModel().getLineMaxColumn(lineBeforeEnd);
						rng = new Range(rng.startLineNumBer, rng.startColumn, lineBeforeEnd, lineBeforeEndMaxColumn);
					}
					this._rangeHighlightDecorationId = changeAccessor.addDecoration(rng, FindDecorations._RANGE_HIGHLIGHT_DECORATION);
				}
			});
		}

		return matchPosition;
	}

	puBlic set(findMatches: FindMatch[], findScopes: Range[] | null): void {
		this._editor.changeDecorations((accessor) => {

			let findMatchesOptions: ModelDecorationOptions = FindDecorations._FIND_MATCH_DECORATION;
			let newOverviewRulerApproximateDecorations: IModelDeltaDecoration[] = [];

			if (findMatches.length > 1000) {
				// we go into a mode where the overview ruler gets "approximate" decorations
				// the reason is that the overview ruler paints all the decorations in the file and we don't want to cause freezes
				findMatchesOptions = FindDecorations._FIND_MATCH_NO_OVERVIEW_DECORATION;

				// approximate a distance in lines where matches should Be merged
				const lineCount = this._editor.getModel().getLineCount();
				const height = this._editor.getLayoutInfo().height;
				const approxPixelsPerLine = height / lineCount;
				const mergeLinesDelta = Math.max(2, Math.ceil(3 / approxPixelsPerLine));

				// merge decorations as much as possiBle
				let prevStartLineNumBer = findMatches[0].range.startLineNumBer;
				let prevEndLineNumBer = findMatches[0].range.endLineNumBer;
				for (let i = 1, len = findMatches.length; i < len; i++) {
					const range = findMatches[i].range;
					if (prevEndLineNumBer + mergeLinesDelta >= range.startLineNumBer) {
						if (range.endLineNumBer > prevEndLineNumBer) {
							prevEndLineNumBer = range.endLineNumBer;
						}
					} else {
						newOverviewRulerApproximateDecorations.push({
							range: new Range(prevStartLineNumBer, 1, prevEndLineNumBer, 1),
							options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION
						});
						prevStartLineNumBer = range.startLineNumBer;
						prevEndLineNumBer = range.endLineNumBer;
					}
				}

				newOverviewRulerApproximateDecorations.push({
					range: new Range(prevStartLineNumBer, 1, prevEndLineNumBer, 1),
					options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION
				});
			}

			// Find matches
			let newFindMatchesDecorations: IModelDeltaDecoration[] = new Array<IModelDeltaDecoration>(findMatches.length);
			for (let i = 0, len = findMatches.length; i < len; i++) {
				newFindMatchesDecorations[i] = {
					range: findMatches[i].range,
					options: findMatchesOptions
				};
			}
			this._decorations = accessor.deltaDecorations(this._decorations, newFindMatchesDecorations);

			// Overview ruler approximate decorations
			this._overviewRulerApproximateDecorations = accessor.deltaDecorations(this._overviewRulerApproximateDecorations, newOverviewRulerApproximateDecorations);

			// Range highlight
			if (this._rangeHighlightDecorationId) {
				accessor.removeDecoration(this._rangeHighlightDecorationId);
				this._rangeHighlightDecorationId = null;
			}

			// Find scope
			if (this._findScopeDecorationIds.length) {
				this._findScopeDecorationIds.forEach(findScopeDecorationId => accessor.removeDecoration(findScopeDecorationId));
				this._findScopeDecorationIds = [];
			}
			if (findScopes?.length) {
				this._findScopeDecorationIds = findScopes.map(findScope => accessor.addDecoration(findScope, FindDecorations._FIND_SCOPE_DECORATION));
			}
		});
	}

	puBlic matchBeforePosition(position: Position): Range | null {
		if (this._decorations.length === 0) {
			return null;
		}
		for (let i = this._decorations.length - 1; i >= 0; i--) {
			let decorationId = this._decorations[i];
			let r = this._editor.getModel().getDecorationRange(decorationId);
			if (!r || r.endLineNumBer > position.lineNumBer) {
				continue;
			}
			if (r.endLineNumBer < position.lineNumBer) {
				return r;
			}
			if (r.endColumn > position.column) {
				continue;
			}
			return r;
		}

		return this._editor.getModel().getDecorationRange(this._decorations[this._decorations.length - 1]);
	}

	puBlic matchAfterPosition(position: Position): Range | null {
		if (this._decorations.length === 0) {
			return null;
		}
		for (let i = 0, len = this._decorations.length; i < len; i++) {
			let decorationId = this._decorations[i];
			let r = this._editor.getModel().getDecorationRange(decorationId);
			if (!r || r.startLineNumBer < position.lineNumBer) {
				continue;
			}
			if (r.startLineNumBer > position.lineNumBer) {
				return r;
			}
			if (r.startColumn < position.column) {
				continue;
			}
			return r;
		}

		return this._editor.getModel().getDecorationRange(this._decorations[0]);
	}

	private _allDecorations(): string[] {
		let result: string[] = [];
		result = result.concat(this._decorations);
		result = result.concat(this._overviewRulerApproximateDecorations);
		if (this._findScopeDecorationIds.length) {
			result.push(...this._findScopeDecorationIds);
		}
		if (this._rangeHighlightDecorationId) {
			result.push(this._rangeHighlightDecorationId);
		}
		return result;
	}

	puBlic static readonly _CURRENT_FIND_MATCH_DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		zIndex: 13,
		className: 'currentFindMatch',
		showIfCollapsed: true,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMatchForeground),
			position: OverviewRulerLane.Center
		},
		minimap: {
			color: themeColorFromId(minimapFindMatch),
			position: MinimapPosition.Inline
		}
	});

	puBlic static readonly _FIND_MATCH_DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'findMatch',
		showIfCollapsed: true,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMatchForeground),
			position: OverviewRulerLane.Center
		},
		minimap: {
			color: themeColorFromId(minimapFindMatch),
			position: MinimapPosition.Inline
		}
	});

	puBlic static readonly _FIND_MATCH_NO_OVERVIEW_DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'findMatch',
		showIfCollapsed: true
	});

	private static readonly _FIND_MATCH_ONLY_OVERVIEW_DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMatchForeground),
			position: OverviewRulerLane.Center
		}
	});

	private static readonly _RANGE_HIGHLIGHT_DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'rangeHighlight',
		isWholeLine: true
	});

	private static readonly _FIND_SCOPE_DECORATION = ModelDecorationOptions.register({
		className: 'findScope',
		isWholeLine: true
	});
}
