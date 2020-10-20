/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler, creAteCAncelAblePromise, CAncelAblePromise } from 'vs/bAse/common/Async';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentRAngeSemAnticTokensProviderRegistry, DocumentRAngeSemAnticTokensProvider, SemAnticTokens } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { toMultilineTokens2, SemAnticTokensProviderStyling } from 'vs/editor/common/services/semAnticTokensProviderStyling';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { isSemAnticColoringEnAbled, SEMANTIC_HIGHLIGHTING_SETTING_ID } from 'vs/editor/common/services/modelServiceImpl';

clAss ViewportSemAnticTokensContribution extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.viewportSemAnticTokens';

	public stAtic get(editor: ICodeEditor): ViewportSemAnticTokensContribution {
		return editor.getContribution<ViewportSemAnticTokensContribution>(ViewportSemAnticTokensContribution.ID);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _tokenizeViewport: RunOnceScheduler;
	privAte _outstAndingRequests: CAncelAblePromise<SemAnticTokens | null | undefined>[];

	constructor(
		editor: ICodeEditor,
		@IModelService privAte reAdonly _modelService: IModelService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService
	) {
		super();
		this._editor = editor;
		this._tokenizeViewport = new RunOnceScheduler(() => this._tokenizeViewportNow(), 100);
		this._outstAndingRequests = [];
		this._register(this._editor.onDidScrollChAnge(() => {
			this._tokenizeViewport.schedule();
		}));
		this._register(this._editor.onDidChAngeModel(() => {
			this._cAncelAll();
			this._tokenizeViewport.schedule();
		}));
		this._register(this._editor.onDidChAngeModelContent((e) => {
			this._cAncelAll();
			this._tokenizeViewport.schedule();
		}));
		this._register(DocumentRAngeSemAnticTokensProviderRegistry.onDidChAnge(() => {
			this._cAncelAll();
			this._tokenizeViewport.schedule();
		}));
		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(SEMANTIC_HIGHLIGHTING_SETTING_ID)) {
				this._cAncelAll();
				this._tokenizeViewport.schedule();
			}
		}));
		this._register(this._themeService.onDidColorThemeChAnge(() => {
			this._cAncelAll();
			this._tokenizeViewport.schedule();
		}));
	}

	privAte stAtic _getSemAnticColoringProvider(model: ITextModel): DocumentRAngeSemAnticTokensProvider | null {
		const result = DocumentRAngeSemAnticTokensProviderRegistry.ordered(model);
		return (result.length > 0 ? result[0] : null);
	}

	privAte _cAncelAll(): void {
		for (const request of this._outstAndingRequests) {
			request.cAncel();
		}
		this._outstAndingRequests = [];
	}

	privAte _removeOutstAndingRequest(req: CAncelAblePromise<SemAnticTokens | null | undefined>): void {
		for (let i = 0, len = this._outstAndingRequests.length; i < len; i++) {
			if (this._outstAndingRequests[i] === req) {
				this._outstAndingRequests.splice(i, 1);
				return;
			}
		}
	}

	privAte _tokenizeViewportNow(): void {
		if (!this._editor.hAsModel()) {
			return;
		}
		const model = this._editor.getModel();
		if (model.hAsSemAnticTokens()) {
			return;
		}
		if (!isSemAnticColoringEnAbled(model, this._themeService, this._configurAtionService)) {
			return;
		}
		const provider = ViewportSemAnticTokensContribution._getSemAnticColoringProvider(model);
		if (!provider) {
			return;
		}
		const styling = this._modelService.getSemAnticTokensProviderStyling(provider);
		const visibleRAnges = this._editor.getVisibleRAngesPlusViewportAboveBelow();

		this._outstAndingRequests = this._outstAndingRequests.concAt(visibleRAnges.mAp(rAnge => this._requestRAnge(model, rAnge, provider, styling)));
	}

	privAte _requestRAnge(model: ITextModel, rAnge: RAnge, provider: DocumentRAngeSemAnticTokensProvider, styling: SemAnticTokensProviderStyling): CAncelAblePromise<SemAnticTokens | null | undefined> {
		const requestVersionId = model.getVersionId();
		const request = creAteCAncelAblePromise(token => Promise.resolve(provider.provideDocumentRAngeSemAnticTokens(model, rAnge, token)));
		request.then((r) => {
			if (!r || model.isDisposed() || model.getVersionId() !== requestVersionId) {
				return;
			}
			model.setPArtiAlSemAnticTokens(rAnge, toMultilineTokens2(r, styling, model.getLAnguAgeIdentifier()));
		}).then(() => this._removeOutstAndingRequest(request), () => this._removeOutstAndingRequest(request));
		return request;
	}
}

registerEditorContribution(ViewportSemAnticTokensContribution.ID, ViewportSemAnticTokensContribution);
