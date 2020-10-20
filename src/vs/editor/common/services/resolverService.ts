/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, IReference } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { ITextModel, ITextSnApshot } from 'vs/editor/common/model';
import { IEditorModel } from 'vs/plAtform/editor/common/editor';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const ITextModelService = creAteDecorAtor<ITextModelService>('textModelService');

export interfAce ITextModelService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * Provided A resource URI, it will return A model reference
	 * which should be disposed once not needed Anymore.
	 */
	creAteModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>>;

	/**
	 * Registers A specific `scheme` content provider.
	 */
	registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposAble;

	/**
	 * Check if the given resource cAn be resolved to A text model.
	 */
	cAnHAndleResource(resource: URI): booleAn;
}

export interfAce ITextModelContentProvider {

	/**
	 * Given A resource, return the content of the resource As `ITextModel`.
	 */
	provideTextContent(resource: URI): Promise<ITextModel | null> | null;
}

export interfAce ITextEditorModel extends IEditorModel {

	/**
	 * Provides Access to the underlying `ITextModel`.
	 */
	reAdonly textEditorModel: ITextModel | null;

	/**
	 * CreAtes A snApshot of the model's contents.
	 */
	creAteSnApshot(this: IResolvedTextEditorModel): ITextSnApshot;
	creAteSnApshot(this: ITextEditorModel): ITextSnApshot | null;

	/**
	 * SignAls if this model is reAdonly or not.
	 */
	isReAdonly(): booleAn;

	/**
	 * Figure out if this model is resolved or not.
	 */
	isResolved(): this is IResolvedTextEditorModel;

	/**
	 * The mode id of the text model if known.
	 */
	getMode(): string | undefined;
}

export interfAce IResolvedTextEditorModel extends ITextEditorModel {

	/**
	 * SAme As ITextEditorModel#textEditorModel, but never null.
	 */
	reAdonly textEditorModel: ITextModel;
}
