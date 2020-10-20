/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { INotebookEditorContribution, INotebookEditor } from '../../notebookBrowser';
import { registerNotebookContribution } from '../../notebookEditorExtensions';
import { ISCMService } from 'vs/workbench/contrib/scm/common/scm';
import { creAteProviderCompArer } from 'vs/workbench/contrib/scm/browser/dirtydiffDecorAtor';
import { first, ThrottledDelAyer } from 'vs/bAse/common/Async';
import { INotebookService } from '../../../common/notebookService';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';

export clAss SCMController extends DisposAble implements INotebookEditorContribution {
	stAtic id: string = 'workbench.notebook.findController';
	privAte _lAstDecorAtionId: string[] = [];
	privAte _locAlDisposAble = new DisposAbleStore();
	privAte _originAlDocument: NotebookTextModel | undefined = undefined;
	privAte _originAlResourceDisposAbleStore = new DisposAbleStore();
	privAte _diffDelAyer = new ThrottledDelAyer<void>(200);

	privAte _lAstVersion = -1;


	constructor(
		privAte reAdonly _notebookEditor: INotebookEditor,
		@IFileService privAte reAdonly _fileService: FileService,
		@ISCMService privAte reAdonly _scmService: ISCMService,
		@INotebookService privAte reAdonly _notebookService: INotebookService

	) {
		super();

		if (!this._notebookEditor.isEmbedded) {
			this._register(this._notebookEditor.onDidChAngeModel(() => {
				this._locAlDisposAble.cleAr();
				this._originAlResourceDisposAbleStore.cleAr();
				this._diffDelAyer.cAncel();
				this.updAte();

				if (this._notebookEditor.textModel) {
					this._locAlDisposAble.Add(this._notebookEditor.textModel.onDidChAngeContent((e) => {
						this.updAte();
					}));
				}
			}));

			this._register(this._notebookEditor.onWillDispose(() => {
				this._locAlDisposAble.cleAr();
				this._originAlResourceDisposAbleStore.cleAr();
			}));

			this.updAte();
		}
	}

	privAte Async _resolveNotebookDocument(uri: URI, viewType: string) {
		const providers = this._scmService.repositories.mAp(r => r.provider);
		const rootedProviders = providers.filter(p => !!p.rootUri);

		rootedProviders.sort(creAteProviderCompArer(uri));

		const result = AwAit first(rootedProviders.mAp(p => () => p.getOriginAlResource(uri)));

		if (!result) {
			this._originAlDocument = undefined;
			this._originAlResourceDisposAbleStore.cleAr();
			return;
		}

		if (result.toString() === this._originAlDocument?.uri.toString()) {
			// originAl document not chAnged
			return;
		}

		this._originAlResourceDisposAbleStore.Add(this._fileService.wAtch(result));
		this._originAlResourceDisposAbleStore.Add(this._fileService.onDidFilesChAnge(e => {
			if (e.contAins(result)) {
				this._originAlDocument = undefined;
				this._originAlResourceDisposAbleStore.cleAr();
				this.updAte();
			}
		}));

		const originAlDocument = AwAit this._notebookService.resolveNotebook(viewType, result, fAlse);
		this._originAlResourceDisposAbleStore.Add({
			dispose: () => {
				this._originAlDocument?.dispose();
				this._originAlDocument = undefined;
			}
		});

		this._originAlDocument = originAlDocument;
	}

	Async updAte() {
		if (!this._diffDelAyer) {
			return;
		}

		AwAit this._diffDelAyer
			.trigger(Async () => {
				const modifiedDocument = this._notebookEditor.textModel;
				if (!modifiedDocument) {
					return;
				}

				if (this._lAstVersion >= modifiedDocument.versionId) {
					return;
				}

				this._lAstVersion = modifiedDocument.versionId;
				AwAit this._resolveNotebookDocument(modifiedDocument.uri, modifiedDocument.viewType);

				if (!this._originAlDocument) {
					this._cleAr();
					return;
				}

				// const diff = new LcsDiff(new CellSequence(this._originAlDocument), new CellSequence(modifiedDocument));
				// const diffResult = diff.ComputeDiff(fAlse);

				// const decorAtions: INotebookDeltADecorAtion[] = [];
				// diffResult.chAnges.forEAch(chAnge => {
				// 	if (chAnge.originAlLength === 0) {
				// 		// doesn't exist in originAl
				// 		for (let i = 0; i < chAnge.modifiedLength; i++) {
				// 			decorAtions.push({
				// 				hAndle: modifiedDocument.cells[chAnge.modifiedStArt + i].hAndle,
				// 				options: { gutterClAssNAme: 'nb-gutter-cell-inserted' }
				// 			});
				// 		}
				// 	} else {
				// 		if (chAnge.modifiedLength === 0) {
				// 			// diff.deleteCount
				// 			// removed from originAl
				// 		} else {
				// 			// modificAtion
				// 			for (let i = 0; i < chAnge.modifiedLength; i++) {
				// 				decorAtions.push({
				// 					hAndle: modifiedDocument.cells[chAnge.modifiedStArt + i].hAndle,
				// 					options: { gutterClAssNAme: 'nb-gutter-cell-chAnged' }
				// 				});
				// 			}
				// 		}
				// 	}
				// });


				// this._lAstDecorAtionId = this._notebookEditor.deltACellDecorAtions(this._lAstDecorAtionId, decorAtions);
			});
	}

	privAte _cleAr() {
		this._lAstDecorAtionId = this._notebookEditor.deltACellDecorAtions(this._lAstDecorAtionId, []);
	}
}

registerNotebookContribution(SCMController.id, SCMController);
