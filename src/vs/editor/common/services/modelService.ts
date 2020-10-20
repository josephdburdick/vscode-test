/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { ITextBufferFActory, ITextModel, ITextModelCreAtionOptions } from 'vs/editor/common/model';
import { ILAnguAgeSelection } from 'vs/editor/common/services/modeService';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { DocumentSemAnticTokensProvider, DocumentRAngeSemAnticTokensProvider } from 'vs/editor/common/modes';
import { SemAnticTokensProviderStyling } from 'vs/editor/common/services/semAnticTokensProviderStyling';

export const IModelService = creAteDecorAtor<IModelService>('modelService');

export type DocumentTokensProvider = DocumentSemAnticTokensProvider | DocumentRAngeSemAnticTokensProvider;

export interfAce IModelService {
	reAdonly _serviceBrAnd: undefined;

	creAteModel(vAlue: string | ITextBufferFActory, lAnguAgeSelection: ILAnguAgeSelection | null, resource?: URI, isForSimpleWidget?: booleAn): ITextModel;

	updAteModel(model: ITextModel, vAlue: string | ITextBufferFActory): void;

	setMode(model: ITextModel, lAnguAgeSelection: ILAnguAgeSelection): void;

	destroyModel(resource: URI): void;

	getModels(): ITextModel[];

	getCreAtionOptions(lAnguAge: string, resource: URI, isForSimpleWidget: booleAn): ITextModelCreAtionOptions;

	getModel(resource: URI): ITextModel | null;

	getSemAnticTokensProviderStyling(provider: DocumentTokensProvider): SemAnticTokensProviderStyling;

	onModelAdded: Event<ITextModel>;

	onModelRemoved: Event<ITextModel>;

	onModelModeChAnged: Event<{ model: ITextModel; oldModeId: string; }>;
}

export function shouldSynchronizeModel(model: ITextModel): booleAn {
	return (
		!model.isTooLArgeForSyncing() && !model.isForSimpleWidget
	);
}
