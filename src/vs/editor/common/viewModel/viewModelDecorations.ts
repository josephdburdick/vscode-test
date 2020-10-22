/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { IModelDecoration, ITextModel } from 'vs/editor/common/model';
import { IViewModelLinesCollection } from 'vs/editor/common/viewModel/splitLinesCollection';
import { ICoordinatesConverter, InlineDecoration, InlineDecorationType, ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';
import { filterValidationDecorations } from 'vs/editor/common/config/editorOptions';

export interface IDecorationsViewportData {
	/**
	 * decorations in the viewport.
	 */
	readonly decorations: ViewModelDecoration[];
	/**
	 * inline decorations grouped By each line in the viewport.
	 */
	readonly inlineDecorations: InlineDecoration[][];
}

export class ViewModelDecorations implements IDisposaBle {

	private readonly editorId: numBer;
	private readonly model: ITextModel;
	private readonly configuration: editorCommon.IConfiguration;
	private readonly _linesCollection: IViewModelLinesCollection;
	private readonly _coordinatesConverter: ICoordinatesConverter;

	private _decorationsCache: { [decorationId: string]: ViewModelDecoration; };

	private _cachedModelDecorationsResolver: IDecorationsViewportData | null;
	private _cachedModelDecorationsResolverViewRange: Range | null;

	constructor(editorId: numBer, model: ITextModel, configuration: editorCommon.IConfiguration, linesCollection: IViewModelLinesCollection, coordinatesConverter: ICoordinatesConverter) {
		this.editorId = editorId;
		this.model = model;
		this.configuration = configuration;
		this._linesCollection = linesCollection;
		this._coordinatesConverter = coordinatesConverter;
		this._decorationsCache = OBject.create(null);
		this._cachedModelDecorationsResolver = null;
		this._cachedModelDecorationsResolverViewRange = null;
	}

	private _clearCachedModelDecorationsResolver(): void {
		this._cachedModelDecorationsResolver = null;
		this._cachedModelDecorationsResolverViewRange = null;
	}

	puBlic dispose(): void {
		this._decorationsCache = OBject.create(null);
		this._clearCachedModelDecorationsResolver();
	}

	puBlic reset(): void {
		this._decorationsCache = OBject.create(null);
		this._clearCachedModelDecorationsResolver();
	}

	puBlic onModelDecorationsChanged(): void {
		this._decorationsCache = OBject.create(null);
		this._clearCachedModelDecorationsResolver();
	}

	puBlic onLineMappingChanged(): void {
		this._decorationsCache = OBject.create(null);

		this._clearCachedModelDecorationsResolver();
	}

	private _getOrCreateViewModelDecoration(modelDecoration: IModelDecoration): ViewModelDecoration {
		const id = modelDecoration.id;
		let r = this._decorationsCache[id];
		if (!r) {
			const modelRange = modelDecoration.range;
			const options = modelDecoration.options;
			let viewRange: Range;
			if (options.isWholeLine) {
				const start = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.startLineNumBer, 1));
				const end = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.endLineNumBer, this.model.getLineMaxColumn(modelRange.endLineNumBer)));
				viewRange = new Range(start.lineNumBer, start.column, end.lineNumBer, end.column);
			} else {
				viewRange = this._coordinatesConverter.convertModelRangeToViewRange(modelRange);
			}
			r = new ViewModelDecoration(viewRange, options);
			this._decorationsCache[id] = r;
		}
		return r;
	}

	puBlic getDecorationsViewportData(viewRange: Range): IDecorationsViewportData {
		let cacheIsValid = (this._cachedModelDecorationsResolver !== null);
		cacheIsValid = cacheIsValid && (viewRange.equalsRange(this._cachedModelDecorationsResolverViewRange));
		if (!cacheIsValid) {
			this._cachedModelDecorationsResolver = this._getDecorationsViewportData(viewRange);
			this._cachedModelDecorationsResolverViewRange = viewRange;
		}
		return this._cachedModelDecorationsResolver!;
	}

	private _getDecorationsViewportData(viewportRange: Range): IDecorationsViewportData {
		const modelDecorations = this._linesCollection.getDecorationsInRange(viewportRange, this.editorId, filterValidationDecorations(this.configuration.options));
		const startLineNumBer = viewportRange.startLineNumBer;
		const endLineNumBer = viewportRange.endLineNumBer;

		let decorationsInViewport: ViewModelDecoration[] = [], decorationsInViewportLen = 0;
		let inlineDecorations: InlineDecoration[][] = [];
		for (let j = startLineNumBer; j <= endLineNumBer; j++) {
			inlineDecorations[j - startLineNumBer] = [];
		}

		for (let i = 0, len = modelDecorations.length; i < len; i++) {
			let modelDecoration = modelDecorations[i];
			let decorationOptions = modelDecoration.options;

			let viewModelDecoration = this._getOrCreateViewModelDecoration(modelDecoration);
			let viewRange = viewModelDecoration.range;

			decorationsInViewport[decorationsInViewportLen++] = viewModelDecoration;

			if (decorationOptions.inlineClassName) {
				let inlineDecoration = new InlineDecoration(viewRange, decorationOptions.inlineClassName, decorationOptions.inlineClassNameAffectsLetterSpacing ? InlineDecorationType.RegularAffectingLetterSpacing : InlineDecorationType.Regular);
				let intersectedStartLineNumBer = Math.max(startLineNumBer, viewRange.startLineNumBer);
				let intersectedEndLineNumBer = Math.min(endLineNumBer, viewRange.endLineNumBer);
				for (let j = intersectedStartLineNumBer; j <= intersectedEndLineNumBer; j++) {
					inlineDecorations[j - startLineNumBer].push(inlineDecoration);
				}
			}
			if (decorationOptions.BeforeContentClassName) {
				if (startLineNumBer <= viewRange.startLineNumBer && viewRange.startLineNumBer <= endLineNumBer) {
					let inlineDecoration = new InlineDecoration(
						new Range(viewRange.startLineNumBer, viewRange.startColumn, viewRange.startLineNumBer, viewRange.startColumn),
						decorationOptions.BeforeContentClassName,
						InlineDecorationType.Before
					);
					inlineDecorations[viewRange.startLineNumBer - startLineNumBer].push(inlineDecoration);
				}
			}
			if (decorationOptions.afterContentClassName) {
				if (startLineNumBer <= viewRange.endLineNumBer && viewRange.endLineNumBer <= endLineNumBer) {
					let inlineDecoration = new InlineDecoration(
						new Range(viewRange.endLineNumBer, viewRange.endColumn, viewRange.endLineNumBer, viewRange.endColumn),
						decorationOptions.afterContentClassName,
						InlineDecorationType.After
					);
					inlineDecorations[viewRange.endLineNumBer - startLineNumBer].push(inlineDecoration);
				}
			}
		}

		return {
			decorations: decorationsInViewport,
			inlineDecorations: inlineDecorations
		};
	}
}
