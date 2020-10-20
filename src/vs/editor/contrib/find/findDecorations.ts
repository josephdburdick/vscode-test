/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { FindMAtch, IModelDecorAtionsChAngeAccessor, IModelDeltADecorAtion, OverviewRulerLAne, TrAckedRAngeStickiness, MinimApPosition } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { overviewRulerFindMAtchForeground, minimApFindMAtch } from 'vs/plAtform/theme/common/colorRegistry';
import { themeColorFromId } from 'vs/plAtform/theme/common/themeService';

export clAss FindDecorAtions implements IDisposAble {

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte _decorAtions: string[];
	privAte _overviewRulerApproximAteDecorAtions: string[];
	privAte _findScopeDecorAtionIds: string[];
	privAte _rAngeHighlightDecorAtionId: string | null;
	privAte _highlightedDecorAtionId: string | null;
	privAte _stArtPosition: Position;

	constructor(editor: IActiveCodeEditor) {
		this._editor = editor;
		this._decorAtions = [];
		this._overviewRulerApproximAteDecorAtions = [];
		this._findScopeDecorAtionIds = [];
		this._rAngeHighlightDecorAtionId = null;
		this._highlightedDecorAtionId = null;
		this._stArtPosition = this._editor.getPosition();
	}

	public dispose(): void {
		this._editor.deltADecorAtions(this._AllDecorAtions(), []);

		this._decorAtions = [];
		this._overviewRulerApproximAteDecorAtions = [];
		this._findScopeDecorAtionIds = [];
		this._rAngeHighlightDecorAtionId = null;
		this._highlightedDecorAtionId = null;
	}

	public reset(): void {
		this._decorAtions = [];
		this._overviewRulerApproximAteDecorAtions = [];
		this._findScopeDecorAtionIds = [];
		this._rAngeHighlightDecorAtionId = null;
		this._highlightedDecorAtionId = null;
	}

	public getCount(): number {
		return this._decorAtions.length;
	}

	/** @deprecAted use getFindScopes to support multiple selections */
	public getFindScope(): RAnge | null {
		if (this._findScopeDecorAtionIds[0]) {
			return this._editor.getModel().getDecorAtionRAnge(this._findScopeDecorAtionIds[0]);
		}
		return null;
	}

	public getFindScopes(): RAnge[] | null {
		if (this._findScopeDecorAtionIds.length) {
			const scopes = this._findScopeDecorAtionIds.mAp(findScopeDecorAtionId =>
				this._editor.getModel().getDecorAtionRAnge(findScopeDecorAtionId)
			).filter(element => !!element);
			if (scopes.length) {
				return scopes As RAnge[];
			}
		}
		return null;
	}

	public getStArtPosition(): Position {
		return this._stArtPosition;
	}

	public setStArtPosition(newStArtPosition: Position): void {
		this._stArtPosition = newStArtPosition;
		this.setCurrentFindMAtch(null);
	}

	privAte _getDecorAtionIndex(decorAtionId: string): number {
		const index = this._decorAtions.indexOf(decorAtionId);
		if (index >= 0) {
			return index + 1;
		}
		return 1;
	}

	public getCurrentMAtchesPosition(desiredRAnge: RAnge): number {
		let cAndidAtes = this._editor.getModel().getDecorAtionsInRAnge(desiredRAnge);
		for (const cAndidAte of cAndidAtes) {
			const cAndidAteOpts = cAndidAte.options;
			if (cAndidAteOpts === FindDecorAtions._FIND_MATCH_DECORATION || cAndidAteOpts === FindDecorAtions._CURRENT_FIND_MATCH_DECORATION) {
				return this._getDecorAtionIndex(cAndidAte.id);
			}
		}
		// We don't know the current mAtch position, so returns zero to show '?' in find widget
		return 0;
	}

	public setCurrentFindMAtch(nextMAtch: RAnge | null): number {
		let newCurrentDecorAtionId: string | null = null;
		let mAtchPosition = 0;
		if (nextMAtch) {
			for (let i = 0, len = this._decorAtions.length; i < len; i++) {
				let rAnge = this._editor.getModel().getDecorAtionRAnge(this._decorAtions[i]);
				if (nextMAtch.equAlsRAnge(rAnge)) {
					newCurrentDecorAtionId = this._decorAtions[i];
					mAtchPosition = (i + 1);
					breAk;
				}
			}
		}

		if (this._highlightedDecorAtionId !== null || newCurrentDecorAtionId !== null) {
			this._editor.chAngeDecorAtions((chAngeAccessor: IModelDecorAtionsChAngeAccessor) => {
				if (this._highlightedDecorAtionId !== null) {
					chAngeAccessor.chAngeDecorAtionOptions(this._highlightedDecorAtionId, FindDecorAtions._FIND_MATCH_DECORATION);
					this._highlightedDecorAtionId = null;
				}
				if (newCurrentDecorAtionId !== null) {
					this._highlightedDecorAtionId = newCurrentDecorAtionId;
					chAngeAccessor.chAngeDecorAtionOptions(this._highlightedDecorAtionId, FindDecorAtions._CURRENT_FIND_MATCH_DECORATION);
				}
				if (this._rAngeHighlightDecorAtionId !== null) {
					chAngeAccessor.removeDecorAtion(this._rAngeHighlightDecorAtionId);
					this._rAngeHighlightDecorAtionId = null;
				}
				if (newCurrentDecorAtionId !== null) {
					let rng = this._editor.getModel().getDecorAtionRAnge(newCurrentDecorAtionId)!;
					if (rng.stArtLineNumber !== rng.endLineNumber && rng.endColumn === 1) {
						let lineBeforeEnd = rng.endLineNumber - 1;
						let lineBeforeEndMAxColumn = this._editor.getModel().getLineMAxColumn(lineBeforeEnd);
						rng = new RAnge(rng.stArtLineNumber, rng.stArtColumn, lineBeforeEnd, lineBeforeEndMAxColumn);
					}
					this._rAngeHighlightDecorAtionId = chAngeAccessor.AddDecorAtion(rng, FindDecorAtions._RANGE_HIGHLIGHT_DECORATION);
				}
			});
		}

		return mAtchPosition;
	}

	public set(findMAtches: FindMAtch[], findScopes: RAnge[] | null): void {
		this._editor.chAngeDecorAtions((Accessor) => {

			let findMAtchesOptions: ModelDecorAtionOptions = FindDecorAtions._FIND_MATCH_DECORATION;
			let newOverviewRulerApproximAteDecorAtions: IModelDeltADecorAtion[] = [];

			if (findMAtches.length > 1000) {
				// we go into A mode where the overview ruler gets "ApproximAte" decorAtions
				// the reAson is thAt the overview ruler pAints All the decorAtions in the file And we don't wAnt to cAuse freezes
				findMAtchesOptions = FindDecorAtions._FIND_MATCH_NO_OVERVIEW_DECORATION;

				// ApproximAte A distAnce in lines where mAtches should be merged
				const lineCount = this._editor.getModel().getLineCount();
				const height = this._editor.getLAyoutInfo().height;
				const ApproxPixelsPerLine = height / lineCount;
				const mergeLinesDeltA = MAth.mAx(2, MAth.ceil(3 / ApproxPixelsPerLine));

				// merge decorAtions As much As possible
				let prevStArtLineNumber = findMAtches[0].rAnge.stArtLineNumber;
				let prevEndLineNumber = findMAtches[0].rAnge.endLineNumber;
				for (let i = 1, len = findMAtches.length; i < len; i++) {
					const rAnge = findMAtches[i].rAnge;
					if (prevEndLineNumber + mergeLinesDeltA >= rAnge.stArtLineNumber) {
						if (rAnge.endLineNumber > prevEndLineNumber) {
							prevEndLineNumber = rAnge.endLineNumber;
						}
					} else {
						newOverviewRulerApproximAteDecorAtions.push({
							rAnge: new RAnge(prevStArtLineNumber, 1, prevEndLineNumber, 1),
							options: FindDecorAtions._FIND_MATCH_ONLY_OVERVIEW_DECORATION
						});
						prevStArtLineNumber = rAnge.stArtLineNumber;
						prevEndLineNumber = rAnge.endLineNumber;
					}
				}

				newOverviewRulerApproximAteDecorAtions.push({
					rAnge: new RAnge(prevStArtLineNumber, 1, prevEndLineNumber, 1),
					options: FindDecorAtions._FIND_MATCH_ONLY_OVERVIEW_DECORATION
				});
			}

			// Find mAtches
			let newFindMAtchesDecorAtions: IModelDeltADecorAtion[] = new ArrAy<IModelDeltADecorAtion>(findMAtches.length);
			for (let i = 0, len = findMAtches.length; i < len; i++) {
				newFindMAtchesDecorAtions[i] = {
					rAnge: findMAtches[i].rAnge,
					options: findMAtchesOptions
				};
			}
			this._decorAtions = Accessor.deltADecorAtions(this._decorAtions, newFindMAtchesDecorAtions);

			// Overview ruler ApproximAte decorAtions
			this._overviewRulerApproximAteDecorAtions = Accessor.deltADecorAtions(this._overviewRulerApproximAteDecorAtions, newOverviewRulerApproximAteDecorAtions);

			// RAnge highlight
			if (this._rAngeHighlightDecorAtionId) {
				Accessor.removeDecorAtion(this._rAngeHighlightDecorAtionId);
				this._rAngeHighlightDecorAtionId = null;
			}

			// Find scope
			if (this._findScopeDecorAtionIds.length) {
				this._findScopeDecorAtionIds.forEAch(findScopeDecorAtionId => Accessor.removeDecorAtion(findScopeDecorAtionId));
				this._findScopeDecorAtionIds = [];
			}
			if (findScopes?.length) {
				this._findScopeDecorAtionIds = findScopes.mAp(findScope => Accessor.AddDecorAtion(findScope, FindDecorAtions._FIND_SCOPE_DECORATION));
			}
		});
	}

	public mAtchBeforePosition(position: Position): RAnge | null {
		if (this._decorAtions.length === 0) {
			return null;
		}
		for (let i = this._decorAtions.length - 1; i >= 0; i--) {
			let decorAtionId = this._decorAtions[i];
			let r = this._editor.getModel().getDecorAtionRAnge(decorAtionId);
			if (!r || r.endLineNumber > position.lineNumber) {
				continue;
			}
			if (r.endLineNumber < position.lineNumber) {
				return r;
			}
			if (r.endColumn > position.column) {
				continue;
			}
			return r;
		}

		return this._editor.getModel().getDecorAtionRAnge(this._decorAtions[this._decorAtions.length - 1]);
	}

	public mAtchAfterPosition(position: Position): RAnge | null {
		if (this._decorAtions.length === 0) {
			return null;
		}
		for (let i = 0, len = this._decorAtions.length; i < len; i++) {
			let decorAtionId = this._decorAtions[i];
			let r = this._editor.getModel().getDecorAtionRAnge(decorAtionId);
			if (!r || r.stArtLineNumber < position.lineNumber) {
				continue;
			}
			if (r.stArtLineNumber > position.lineNumber) {
				return r;
			}
			if (r.stArtColumn < position.column) {
				continue;
			}
			return r;
		}

		return this._editor.getModel().getDecorAtionRAnge(this._decorAtions[0]);
	}

	privAte _AllDecorAtions(): string[] {
		let result: string[] = [];
		result = result.concAt(this._decorAtions);
		result = result.concAt(this._overviewRulerApproximAteDecorAtions);
		if (this._findScopeDecorAtionIds.length) {
			result.push(...this._findScopeDecorAtionIds);
		}
		if (this._rAngeHighlightDecorAtionId) {
			result.push(this._rAngeHighlightDecorAtionId);
		}
		return result;
	}

	public stAtic reAdonly _CURRENT_FIND_MATCH_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		zIndex: 13,
		clAssNAme: 'currentFindMAtch',
		showIfCollApsed: true,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMAtchForeground),
			position: OverviewRulerLAne.Center
		},
		minimAp: {
			color: themeColorFromId(minimApFindMAtch),
			position: MinimApPosition.Inline
		}
	});

	public stAtic reAdonly _FIND_MATCH_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'findMAtch',
		showIfCollApsed: true,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMAtchForeground),
			position: OverviewRulerLAne.Center
		},
		minimAp: {
			color: themeColorFromId(minimApFindMAtch),
			position: MinimApPosition.Inline
		}
	});

	public stAtic reAdonly _FIND_MATCH_NO_OVERVIEW_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'findMAtch',
		showIfCollApsed: true
	});

	privAte stAtic reAdonly _FIND_MATCH_ONLY_OVERVIEW_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMAtchForeground),
			position: OverviewRulerLAne.Center
		}
	});

	privAte stAtic reAdonly _RANGE_HIGHLIGHT_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'rAngeHighlight',
		isWholeLine: true
	});

	privAte stAtic reAdonly _FIND_SCOPE_DECORATION = ModelDecorAtionOptions.register({
		clAssNAme: 'findScope',
		isWholeLine: true
	});
}
