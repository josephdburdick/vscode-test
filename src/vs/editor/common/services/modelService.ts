/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { ITextBufferFactory, ITextModel, ITextModelCreationOptions } from 'vs/editor/common/model';
import { ILanguageSelection } from 'vs/editor/common/services/modeService';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { DocumentSemanticTokensProvider, DocumentRangeSemanticTokensProvider } from 'vs/editor/common/modes';
import { SemanticTokensProviderStyling } from 'vs/editor/common/services/semanticTokensProviderStyling';

export const IModelService = createDecorator<IModelService>('modelService');

export type DocumentTokensProvider = DocumentSemanticTokensProvider | DocumentRangeSemanticTokensProvider;

export interface IModelService {
	readonly _serviceBrand: undefined;

	createModel(value: string | ITextBufferFactory, languageSelection: ILanguageSelection | null, resource?: URI, isForSimpleWidget?: Boolean): ITextModel;

	updateModel(model: ITextModel, value: string | ITextBufferFactory): void;

	setMode(model: ITextModel, languageSelection: ILanguageSelection): void;

	destroyModel(resource: URI): void;

	getModels(): ITextModel[];

	getCreationOptions(language: string, resource: URI, isForSimpleWidget: Boolean): ITextModelCreationOptions;

	getModel(resource: URI): ITextModel | null;

	getSemanticTokensProviderStyling(provider: DocumentTokensProvider): SemanticTokensProviderStyling;

	onModelAdded: Event<ITextModel>;

	onModelRemoved: Event<ITextModel>;

	onModelModeChanged: Event<{ model: ITextModel; oldModeId: string; }>;
}

export function shouldSynchronizeModel(model: ITextModel): Boolean {
	return (
		!model.isTooLargeForSyncing() && !model.isForSimpleWidget
	);
}
