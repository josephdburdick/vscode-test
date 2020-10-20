/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { IModelDecorAtion, ITextModel } from 'vs/editor/common/model';
import { IViewModelLinesCollection } from 'vs/editor/common/viewModel/splitLinesCollection';
import { ICoordinAtesConverter, InlineDecorAtion, InlineDecorAtionType, ViewModelDecorAtion } from 'vs/editor/common/viewModel/viewModel';
import { filterVAlidAtionDecorAtions } from 'vs/editor/common/config/editorOptions';

export interfAce IDecorAtionsViewportDAtA {
	/**
	 * decorAtions in the viewport.
	 */
	reAdonly decorAtions: ViewModelDecorAtion[];
	/**
	 * inline decorAtions grouped by eAch line in the viewport.
	 */
	reAdonly inlineDecorAtions: InlineDecorAtion[][];
}

export clAss ViewModelDecorAtions implements IDisposAble {

	privAte reAdonly editorId: number;
	privAte reAdonly model: ITextModel;
	privAte reAdonly configurAtion: editorCommon.IConfigurAtion;
	privAte reAdonly _linesCollection: IViewModelLinesCollection;
	privAte reAdonly _coordinAtesConverter: ICoordinAtesConverter;

	privAte _decorAtionsCAche: { [decorAtionId: string]: ViewModelDecorAtion; };

	privAte _cAchedModelDecorAtionsResolver: IDecorAtionsViewportDAtA | null;
	privAte _cAchedModelDecorAtionsResolverViewRAnge: RAnge | null;

	constructor(editorId: number, model: ITextModel, configurAtion: editorCommon.IConfigurAtion, linesCollection: IViewModelLinesCollection, coordinAtesConverter: ICoordinAtesConverter) {
		this.editorId = editorId;
		this.model = model;
		this.configurAtion = configurAtion;
		this._linesCollection = linesCollection;
		this._coordinAtesConverter = coordinAtesConverter;
		this._decorAtionsCAche = Object.creAte(null);
		this._cAchedModelDecorAtionsResolver = null;
		this._cAchedModelDecorAtionsResolverViewRAnge = null;
	}

	privAte _cleArCAchedModelDecorAtionsResolver(): void {
		this._cAchedModelDecorAtionsResolver = null;
		this._cAchedModelDecorAtionsResolverViewRAnge = null;
	}

	public dispose(): void {
		this._decorAtionsCAche = Object.creAte(null);
		this._cleArCAchedModelDecorAtionsResolver();
	}

	public reset(): void {
		this._decorAtionsCAche = Object.creAte(null);
		this._cleArCAchedModelDecorAtionsResolver();
	}

	public onModelDecorAtionsChAnged(): void {
		this._decorAtionsCAche = Object.creAte(null);
		this._cleArCAchedModelDecorAtionsResolver();
	}

	public onLineMAppingChAnged(): void {
		this._decorAtionsCAche = Object.creAte(null);

		this._cleArCAchedModelDecorAtionsResolver();
	}

	privAte _getOrCreAteViewModelDecorAtion(modelDecorAtion: IModelDecorAtion): ViewModelDecorAtion {
		const id = modelDecorAtion.id;
		let r = this._decorAtionsCAche[id];
		if (!r) {
			const modelRAnge = modelDecorAtion.rAnge;
			const options = modelDecorAtion.options;
			let viewRAnge: RAnge;
			if (options.isWholeLine) {
				const stArt = this._coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelRAnge.stArtLineNumber, 1));
				const end = this._coordinAtesConverter.convertModelPositionToViewPosition(new Position(modelRAnge.endLineNumber, this.model.getLineMAxColumn(modelRAnge.endLineNumber)));
				viewRAnge = new RAnge(stArt.lineNumber, stArt.column, end.lineNumber, end.column);
			} else {
				viewRAnge = this._coordinAtesConverter.convertModelRAngeToViewRAnge(modelRAnge);
			}
			r = new ViewModelDecorAtion(viewRAnge, options);
			this._decorAtionsCAche[id] = r;
		}
		return r;
	}

	public getDecorAtionsViewportDAtA(viewRAnge: RAnge): IDecorAtionsViewportDAtA {
		let cAcheIsVAlid = (this._cAchedModelDecorAtionsResolver !== null);
		cAcheIsVAlid = cAcheIsVAlid && (viewRAnge.equAlsRAnge(this._cAchedModelDecorAtionsResolverViewRAnge));
		if (!cAcheIsVAlid) {
			this._cAchedModelDecorAtionsResolver = this._getDecorAtionsViewportDAtA(viewRAnge);
			this._cAchedModelDecorAtionsResolverViewRAnge = viewRAnge;
		}
		return this._cAchedModelDecorAtionsResolver!;
	}

	privAte _getDecorAtionsViewportDAtA(viewportRAnge: RAnge): IDecorAtionsViewportDAtA {
		const modelDecorAtions = this._linesCollection.getDecorAtionsInRAnge(viewportRAnge, this.editorId, filterVAlidAtionDecorAtions(this.configurAtion.options));
		const stArtLineNumber = viewportRAnge.stArtLineNumber;
		const endLineNumber = viewportRAnge.endLineNumber;

		let decorAtionsInViewport: ViewModelDecorAtion[] = [], decorAtionsInViewportLen = 0;
		let inlineDecorAtions: InlineDecorAtion[][] = [];
		for (let j = stArtLineNumber; j <= endLineNumber; j++) {
			inlineDecorAtions[j - stArtLineNumber] = [];
		}

		for (let i = 0, len = modelDecorAtions.length; i < len; i++) {
			let modelDecorAtion = modelDecorAtions[i];
			let decorAtionOptions = modelDecorAtion.options;

			let viewModelDecorAtion = this._getOrCreAteViewModelDecorAtion(modelDecorAtion);
			let viewRAnge = viewModelDecorAtion.rAnge;

			decorAtionsInViewport[decorAtionsInViewportLen++] = viewModelDecorAtion;

			if (decorAtionOptions.inlineClAssNAme) {
				let inlineDecorAtion = new InlineDecorAtion(viewRAnge, decorAtionOptions.inlineClAssNAme, decorAtionOptions.inlineClAssNAmeAffectsLetterSpAcing ? InlineDecorAtionType.RegulArAffectingLetterSpAcing : InlineDecorAtionType.RegulAr);
				let intersectedStArtLineNumber = MAth.mAx(stArtLineNumber, viewRAnge.stArtLineNumber);
				let intersectedEndLineNumber = MAth.min(endLineNumber, viewRAnge.endLineNumber);
				for (let j = intersectedStArtLineNumber; j <= intersectedEndLineNumber; j++) {
					inlineDecorAtions[j - stArtLineNumber].push(inlineDecorAtion);
				}
			}
			if (decorAtionOptions.beforeContentClAssNAme) {
				if (stArtLineNumber <= viewRAnge.stArtLineNumber && viewRAnge.stArtLineNumber <= endLineNumber) {
					let inlineDecorAtion = new InlineDecorAtion(
						new RAnge(viewRAnge.stArtLineNumber, viewRAnge.stArtColumn, viewRAnge.stArtLineNumber, viewRAnge.stArtColumn),
						decorAtionOptions.beforeContentClAssNAme,
						InlineDecorAtionType.Before
					);
					inlineDecorAtions[viewRAnge.stArtLineNumber - stArtLineNumber].push(inlineDecorAtion);
				}
			}
			if (decorAtionOptions.AfterContentClAssNAme) {
				if (stArtLineNumber <= viewRAnge.endLineNumber && viewRAnge.endLineNumber <= endLineNumber) {
					let inlineDecorAtion = new InlineDecorAtion(
						new RAnge(viewRAnge.endLineNumber, viewRAnge.endColumn, viewRAnge.endLineNumber, viewRAnge.endColumn),
						decorAtionOptions.AfterContentClAssNAme,
						InlineDecorAtionType.After
					);
					inlineDecorAtions[viewRAnge.endLineNumber - stArtLineNumber].push(inlineDecorAtion);
				}
			}
		}

		return {
			decorAtions: decorAtionsInViewport,
			inlineDecorAtions: inlineDecorAtions
		};
	}
}
