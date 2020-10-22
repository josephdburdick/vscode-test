/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { INoteBookEditorContriBution, INoteBookEditor } from '../../noteBookBrowser';
import { registerNoteBookContriBution } from '../../noteBookEditorExtensions';
import { ISCMService } from 'vs/workBench/contriB/scm/common/scm';
import { createProviderComparer } from 'vs/workBench/contriB/scm/Browser/dirtydiffDecorator';
import { first, ThrottledDelayer } from 'vs/Base/common/async';
import { INoteBookService } from '../../../common/noteBookService';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { FileService } from 'vs/platform/files/common/fileService';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';

export class SCMController extends DisposaBle implements INoteBookEditorContriBution {
	static id: string = 'workBench.noteBook.findController';
	private _lastDecorationId: string[] = [];
	private _localDisposaBle = new DisposaBleStore();
	private _originalDocument: NoteBookTextModel | undefined = undefined;
	private _originalResourceDisposaBleStore = new DisposaBleStore();
	private _diffDelayer = new ThrottledDelayer<void>(200);

	private _lastVersion = -1;


	constructor(
		private readonly _noteBookEditor: INoteBookEditor,
		@IFileService private readonly _fileService: FileService,
		@ISCMService private readonly _scmService: ISCMService,
		@INoteBookService private readonly _noteBookService: INoteBookService

	) {
		super();

		if (!this._noteBookEditor.isEmBedded) {
			this._register(this._noteBookEditor.onDidChangeModel(() => {
				this._localDisposaBle.clear();
				this._originalResourceDisposaBleStore.clear();
				this._diffDelayer.cancel();
				this.update();

				if (this._noteBookEditor.textModel) {
					this._localDisposaBle.add(this._noteBookEditor.textModel.onDidChangeContent((e) => {
						this.update();
					}));
				}
			}));

			this._register(this._noteBookEditor.onWillDispose(() => {
				this._localDisposaBle.clear();
				this._originalResourceDisposaBleStore.clear();
			}));

			this.update();
		}
	}

	private async _resolveNoteBookDocument(uri: URI, viewType: string) {
		const providers = this._scmService.repositories.map(r => r.provider);
		const rootedProviders = providers.filter(p => !!p.rootUri);

		rootedProviders.sort(createProviderComparer(uri));

		const result = await first(rootedProviders.map(p => () => p.getOriginalResource(uri)));

		if (!result) {
			this._originalDocument = undefined;
			this._originalResourceDisposaBleStore.clear();
			return;
		}

		if (result.toString() === this._originalDocument?.uri.toString()) {
			// original document not changed
			return;
		}

		this._originalResourceDisposaBleStore.add(this._fileService.watch(result));
		this._originalResourceDisposaBleStore.add(this._fileService.onDidFilesChange(e => {
			if (e.contains(result)) {
				this._originalDocument = undefined;
				this._originalResourceDisposaBleStore.clear();
				this.update();
			}
		}));

		const originalDocument = await this._noteBookService.resolveNoteBook(viewType, result, false);
		this._originalResourceDisposaBleStore.add({
			dispose: () => {
				this._originalDocument?.dispose();
				this._originalDocument = undefined;
			}
		});

		this._originalDocument = originalDocument;
	}

	async update() {
		if (!this._diffDelayer) {
			return;
		}

		await this._diffDelayer
			.trigger(async () => {
				const modifiedDocument = this._noteBookEditor.textModel;
				if (!modifiedDocument) {
					return;
				}

				if (this._lastVersion >= modifiedDocument.versionId) {
					return;
				}

				this._lastVersion = modifiedDocument.versionId;
				await this._resolveNoteBookDocument(modifiedDocument.uri, modifiedDocument.viewType);

				if (!this._originalDocument) {
					this._clear();
					return;
				}

				// const diff = new LcsDiff(new CellSequence(this._originalDocument), new CellSequence(modifiedDocument));
				// const diffResult = diff.ComputeDiff(false);

				// const decorations: INoteBookDeltaDecoration[] = [];
				// diffResult.changes.forEach(change => {
				// 	if (change.originalLength === 0) {
				// 		// doesn't exist in original
				// 		for (let i = 0; i < change.modifiedLength; i++) {
				// 			decorations.push({
				// 				handle: modifiedDocument.cells[change.modifiedStart + i].handle,
				// 				options: { gutterClassName: 'nB-gutter-cell-inserted' }
				// 			});
				// 		}
				// 	} else {
				// 		if (change.modifiedLength === 0) {
				// 			// diff.deleteCount
				// 			// removed from original
				// 		} else {
				// 			// modification
				// 			for (let i = 0; i < change.modifiedLength; i++) {
				// 				decorations.push({
				// 					handle: modifiedDocument.cells[change.modifiedStart + i].handle,
				// 					options: { gutterClassName: 'nB-gutter-cell-changed' }
				// 				});
				// 			}
				// 		}
				// 	}
				// });


				// this._lastDecorationId = this._noteBookEditor.deltaCellDecorations(this._lastDecorationId, decorations);
			});
	}

	private _clear() {
		this._lastDecorationId = this._noteBookEditor.deltaCellDecorations(this._lastDecorationId, []);
	}
}

registerNoteBookContriBution(SCMController.id, SCMController);
