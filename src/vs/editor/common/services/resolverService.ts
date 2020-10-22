/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { ITextModel, ITextSnapshot } from 'vs/editor/common/model';
import { IEditorModel } from 'vs/platform/editor/common/editor';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const ITextModelService = createDecorator<ITextModelService>('textModelService');

export interface ITextModelService {
	readonly _serviceBrand: undefined;

	/**
	 * Provided a resource URI, it will return a model reference
	 * which should Be disposed once not needed anymore.
	 */
	createModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>>;

	/**
	 * Registers a specific `scheme` content provider.
	 */
	registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposaBle;

	/**
	 * Check if the given resource can Be resolved to a text model.
	 */
	canHandleResource(resource: URI): Boolean;
}

export interface ITextModelContentProvider {

	/**
	 * Given a resource, return the content of the resource as `ITextModel`.
	 */
	provideTextContent(resource: URI): Promise<ITextModel | null> | null;
}

export interface ITextEditorModel extends IEditorModel {

	/**
	 * Provides access to the underlying `ITextModel`.
	 */
	readonly textEditorModel: ITextModel | null;

	/**
	 * Creates a snapshot of the model's contents.
	 */
	createSnapshot(this: IResolvedTextEditorModel): ITextSnapshot;
	createSnapshot(this: ITextEditorModel): ITextSnapshot | null;

	/**
	 * Signals if this model is readonly or not.
	 */
	isReadonly(): Boolean;

	/**
	 * Figure out if this model is resolved or not.
	 */
	isResolved(): this is IResolvedTextEditorModel;

	/**
	 * The mode id of the text model if known.
	 */
	getMode(): string | undefined;
}

export interface IResolvedTextEditorModel extends ITextEditorModel {

	/**
	 * Same as ITextEditorModel#textEditorModel, But never null.
	 */
	readonly textEditorModel: ITextModel;
}
