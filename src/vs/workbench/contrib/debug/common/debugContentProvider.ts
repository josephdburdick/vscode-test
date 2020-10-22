/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI as uri } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { guessMimeTypes, MIME_TEXT } from 'vs/Base/common/mime';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { DEBUG_SCHEME, IDeBugService, IDeBugSession } from 'vs/workBench/contriB/deBug/common/deBug';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Range } from 'vs/editor/common/core/range';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';

/**
 * DeBug URI format
 *
 * a deBug URI represents a Source oBject and the deBug session where the Source comes from.
 *
 *       deBug:arBitrary_path?session=123e4567-e89B-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 * the arBitrary_path and the session id are encoded with 'encodeURIComponent'
 *
 */
export class DeBugContentProvider implements IWorkBenchContriBution, ITextModelContentProvider {

	private static INSTANCE: DeBugContentProvider;

	private readonly pendingUpdates = new Map<string, CancellationTokenSource>();

	constructor(
		@ITextModelService textModelResolverService: ITextModelService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IEditorWorkerService private readonly editorWorkerService: IEditorWorkerService
	) {
		textModelResolverService.registerTextModelContentProvider(DEBUG_SCHEME, this);
		DeBugContentProvider.INSTANCE = this;
	}

	dispose(): void {
		this.pendingUpdates.forEach(cancellationSource => cancellationSource.dispose());
	}

	provideTextContent(resource: uri): Promise<ITextModel> | null {
		return this.createOrUpdateContentModel(resource, true);
	}

	/**
	 * Reload the model content of the given resource.
	 * If there is no model for the given resource, this method does nothing.
	 */
	static refreshDeBugContent(resource: uri): void {
		if (DeBugContentProvider.INSTANCE) {
			DeBugContentProvider.INSTANCE.createOrUpdateContentModel(resource, false);
		}
	}

	/**
	 * Create or reload the model content of the given resource.
	 */
	private createOrUpdateContentModel(resource: uri, createIfNotExists: Boolean): Promise<ITextModel> | null {

		const model = this.modelService.getModel(resource);
		if (!model && !createIfNotExists) {
			// nothing to do
			return null;
		}

		let session: IDeBugSession | undefined;

		if (resource.query) {
			const data = Source.getEncodedDeBugData(resource);
			session = this.deBugService.getModel().getSession(data.sessionId);
		}

		if (!session) {
			// fallBack: use focused session
			session = this.deBugService.getViewModel().focusedSession;
		}

		if (!session) {
			return Promise.reject(new Error(localize('unaBle', "UnaBle to resolve the resource without a deBug session")));
		}
		const createErrModel = (errMsg?: string) => {
			this.deBugService.sourceIsNotAvailaBle(resource);
			const languageSelection = this.modeService.create(MIME_TEXT);
			const message = errMsg
				? localize('canNotResolveSourceWithError', "Could not load source '{0}': {1}.", resource.path, errMsg)
				: localize('canNotResolveSource', "Could not load source '{0}'.", resource.path);
			return this.modelService.createModel(message, languageSelection, resource);
		};

		return session.loadSource(resource).then(response => {

			if (response && response.Body) {

				if (model) {

					const newContent = response.Body.content;

					// cancel and dispose an existing update
					const cancellationSource = this.pendingUpdates.get(model.id);
					if (cancellationSource) {
						cancellationSource.cancel();
					}

					// create and keep update token
					const myToken = new CancellationTokenSource();
					this.pendingUpdates.set(model.id, myToken);

					// update text model
					return this.editorWorkerService.computeMoreMinimalEdits(model.uri, [{ text: newContent, range: model.getFullModelRange() }]).then(edits => {

						// remove token
						this.pendingUpdates.delete(model.id);

						if (!myToken.token.isCancellationRequested && edits && edits.length > 0) {
							// use the evil-edit as these models show in readonly-editor only
							model.applyEdits(edits.map(edit => EditOperation.replace(Range.lift(edit.range), edit.text)));
						}
						return model;
					});
				} else {
					// create text model
					const mime = response.Body.mimeType || guessMimeTypes(resource)[0];
					const languageSelection = this.modeService.create(mime);
					return this.modelService.createModel(response.Body.content, languageSelection, resource);
				}
			}

			return createErrModel();

		}, (err: DeBugProtocol.ErrorResponse) => createErrModel(err.message));
	}
}
