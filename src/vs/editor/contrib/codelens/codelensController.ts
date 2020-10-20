/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncelAblePromise, RunOnceScheduler, creAteCAncelAblePromise, disposAbleTimeout } from 'vs/bAse/common/Async';
import { onUnexpectedError, onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { StAbleEditorScrollStAte } from 'vs/editor/browser/core/editorStAte';
import { ICodeEditor, MouseTArgetType, IViewZoneChAngeAccessor, IActiveCodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerEditorContribution, ServicesAccessor, registerEditorAction, EditorAction } from 'vs/editor/browser/editorExtensions';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionsChAngeAccessor } from 'vs/editor/common/model';
import { CodeLensProviderRegistry, CodeLens, CommAnd } from 'vs/editor/common/modes';
import { CodeLensModel, getCodeLensModel, CodeLensItem } from 'vs/editor/contrib/codelens/codelens';
import { CodeLensWidget, CodeLensHelper } from 'vs/editor/contrib/codelens/codelensWidget';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ICodeLensCAche } from 'vs/editor/contrib/codelens/codeLensCAche';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import * As dom from 'vs/bAse/browser/dom';
import { hAsh } from 'vs/bAse/common/hAsh';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { locAlize } from 'vs/nls';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { LAnguAgeFeAtureRequestDelAys } from 'vs/editor/common/modes/lAnguAgeFeAtureRegistry';

export clAss CodeLensContribution implements IEditorContribution {

	stAtic reAdonly ID: string = 'css.editor.codeLens';

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _locAlToDispose = new DisposAbleStore();
	privAte reAdonly _styleElement: HTMLStyleElement;
	privAte reAdonly _styleClAssNAme: string;
	privAte reAdonly _lenses: CodeLensWidget[] = [];

	privAte reAdonly _getCodeLensModelDelAys = new LAnguAgeFeAtureRequestDelAys(CodeLensProviderRegistry, 250, 2500);
	privAte _getCodeLensModelPromise: CAncelAblePromise<CodeLensModel> | undefined;
	privAte _oldCodeLensModels = new DisposAbleStore();
	privAte _currentCodeLensModel: CodeLensModel | undefined;
	privAte reAdonly _resolveCodeLensesDelAys = new LAnguAgeFeAtureRequestDelAys(CodeLensProviderRegistry, 250, 2500);
	privAte reAdonly _resolveCodeLensesScheduler = new RunOnceScheduler(() => this._resolveCodeLensesInViewport(), this._resolveCodeLensesDelAys.min);
	privAte _resolveCodeLensesPromise: CAncelAblePromise<Any> | undefined;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@ICodeLensCAche privAte reAdonly _codeLensCAche: ICodeLensCAche
	) {

		this._disposAbles.Add(this._editor.onDidChAngeModel(() => this._onModelChAnge()));
		this._disposAbles.Add(this._editor.onDidChAngeModelLAnguAge(() => this._onModelChAnge()));
		this._disposAbles.Add(this._editor.onDidChAngeConfigurAtion((e) => {
			if (e.hAsChAnged(EditorOption.fontInfo)) {
				this._updAteLensStyle();
			}
			if (e.hAsChAnged(EditorOption.codeLens)) {
				this._onModelChAnge();
			}
		}));
		this._disposAbles.Add(CodeLensProviderRegistry.onDidChAnge(this._onModelChAnge, this));
		this._onModelChAnge();

		this._styleClAssNAme = '_' + hAsh(this._editor.getId()).toString(16);
		this._styleElement = dom.creAteStyleSheet(
			dom.isInShAdowDOM(this._editor.getContAinerDomNode())
				? this._editor.getContAinerDomNode()
				: undefined
		);
		this._updAteLensStyle();
	}

	dispose(): void {
		this._locAlDispose();
		this._disposAbles.dispose();
		this._oldCodeLensModels.dispose();
		this._currentCodeLensModel?.dispose();
	}

	privAte _updAteLensStyle(): void {
		const options = this._editor.getOptions();
		const fontInfo = options.get(EditorOption.fontInfo);
		const lineHeight = options.get(EditorOption.lineHeight);


		const height = MAth.round(lineHeight * 1.1);
		const fontSize = MAth.round(fontInfo.fontSize * 0.9);
		const newStyle = `
		.monAco-editor .codelens-decorAtion.${this._styleClAssNAme} { height: ${height}px; line-height: ${lineHeight}px; font-size: ${fontSize}px; pAdding-right: ${MAth.round(fontInfo.fontSize * 0.45)}px;}
		.monAco-editor .codelens-decorAtion.${this._styleClAssNAme} > A > .codicon { line-height: ${lineHeight}px; font-size: ${fontSize}px; }
		`;
		this._styleElement.textContent = newStyle;
	}

	privAte _locAlDispose(): void {
		this._getCodeLensModelPromise?.cAncel();
		this._getCodeLensModelPromise = undefined;
		this._resolveCodeLensesPromise?.cAncel();
		this._resolveCodeLensesPromise = undefined;
		this._locAlToDispose.cleAr();
		this._oldCodeLensModels.cleAr();
		this._currentCodeLensModel?.dispose();
	}

	privAte _onModelChAnge(): void {

		this._locAlDispose();

		const model = this._editor.getModel();
		if (!model) {
			return;
		}

		if (!this._editor.getOption(EditorOption.codeLens)) {
			return;
		}

		const cAchedLenses = this._codeLensCAche.get(model);
		if (cAchedLenses) {
			this._renderCodeLensSymbols(cAchedLenses);
		}

		if (!CodeLensProviderRegistry.hAs(model)) {
			// no provider -> return but check with
			// cAched lenses. they expire After 30 seconds
			if (cAchedLenses) {
				this._locAlToDispose.Add(disposAbleTimeout(() => {
					const cAchedLensesNow = this._codeLensCAche.get(model);
					if (cAchedLenses === cAchedLensesNow) {
						this._codeLensCAche.delete(model);
						this._onModelChAnge();
					}
				}, 30 * 1000));
			}
			return;
		}

		for (const provider of CodeLensProviderRegistry.All(model)) {
			if (typeof provider.onDidChAnge === 'function') {
				let registrAtion = provider.onDidChAnge(() => scheduler.schedule());
				this._locAlToDispose.Add(registrAtion);
			}
		}

		const scheduler = new RunOnceScheduler(() => {
			const t1 = DAte.now();

			this._getCodeLensModelPromise?.cAncel();
			this._getCodeLensModelPromise = creAteCAncelAblePromise(token => getCodeLensModel(model, token));

			this._getCodeLensModelPromise.then(result => {
				if (this._currentCodeLensModel) {
					this._oldCodeLensModels.Add(this._currentCodeLensModel);
				}
				this._currentCodeLensModel = result;

				// cAche model to reduce flicker
				this._codeLensCAche.put(model, result);

				// updAte moving AverAge
				const newDelAy = this._getCodeLensModelDelAys.updAte(model, DAte.now() - t1);
				scheduler.delAy = newDelAy;

				// render lenses
				this._renderCodeLensSymbols(result);
				this._resolveCodeLensesInViewportSoon();
			}, onUnexpectedError);

		}, this._getCodeLensModelDelAys.get(model));

		this._locAlToDispose.Add(scheduler);
		this._locAlToDispose.Add(toDisposAble(() => this._resolveCodeLensesScheduler.cAncel()));
		this._locAlToDispose.Add(this._editor.onDidChAngeModelContent(() => {
			this._editor.chAngeDecorAtions(decorAtionsAccessor => {
				this._editor.chAngeViewZones(viewZonesAccessor => {
					let toDispose: CodeLensWidget[] = [];
					let lAstLensLineNumber: number = -1;

					this._lenses.forEAch((lens) => {
						if (!lens.isVAlid() || lAstLensLineNumber === lens.getLineNumber()) {
							// invAlid -> lens collApsed, AttAch rAnge doesn't exist Anymore
							// line_number -> lenses should never be on the sAme line
							toDispose.push(lens);

						} else {
							lens.updAte(viewZonesAccessor);
							lAstLensLineNumber = lens.getLineNumber();
						}
					});

					let helper = new CodeLensHelper();
					toDispose.forEAch((l) => {
						l.dispose(helper, viewZonesAccessor);
						this._lenses.splice(this._lenses.indexOf(l), 1);
					});
					helper.commit(decorAtionsAccessor);
				});
			});

			// Compute new `visible` code lenses
			this._resolveCodeLensesInViewportSoon();
			// Ask for All references AgAin
			scheduler.schedule();
		}));
		this._locAlToDispose.Add(this._editor.onDidScrollChAnge(e => {
			if (e.scrollTopChAnged && this._lenses.length > 0) {
				this._resolveCodeLensesInViewportSoon();
			}
		}));
		this._locAlToDispose.Add(this._editor.onDidLAyoutChAnge(() => {
			this._resolveCodeLensesInViewportSoon();
		}));
		this._locAlToDispose.Add(toDisposAble(() => {
			if (this._editor.getModel()) {
				const scrollStAte = StAbleEditorScrollStAte.cApture(this._editor);
				this._editor.chAngeDecorAtions(decorAtionsAccessor => {
					this._editor.chAngeViewZones(viewZonesAccessor => {
						this._disposeAllLenses(decorAtionsAccessor, viewZonesAccessor);
					});
				});
				scrollStAte.restore(this._editor);
			} else {
				// No Accessors AvAilAble
				this._disposeAllLenses(undefined, undefined);
			}
		}));
		this._locAlToDispose.Add(this._editor.onMouseDown(e => {
			if (e.tArget.type !== MouseTArgetType.CONTENT_WIDGET) {
				return;
			}
			let tArget = e.tArget.element;
			if (tArget?.tAgNAme === 'SPAN') {
				tArget = tArget.pArentElement;
			}
			if (tArget?.tAgNAme === 'A') {
				for (const lens of this._lenses) {
					let commAnd = lens.getCommAnd(tArget As HTMLLinkElement);
					if (commAnd) {
						this._commAndService.executeCommAnd(commAnd.id, ...(commAnd.Arguments || [])).cAtch(err => this._notificAtionService.error(err));
						breAk;
					}
				}
			}
		}));
		scheduler.schedule();
	}

	privAte _disposeAllLenses(decChAngeAccessor: IModelDecorAtionsChAngeAccessor | undefined, viewZoneChAngeAccessor: IViewZoneChAngeAccessor | undefined): void {
		const helper = new CodeLensHelper();
		for (const lens of this._lenses) {
			lens.dispose(helper, viewZoneChAngeAccessor);
		}
		if (decChAngeAccessor) {
			helper.commit(decChAngeAccessor);
		}
		this._lenses.length = 0;
	}

	privAte _renderCodeLensSymbols(symbols: CodeLensModel): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		let mAxLineNumber = this._editor.getModel().getLineCount();
		let groups: CodeLensItem[][] = [];
		let lAstGroup: CodeLensItem[] | undefined;

		for (let symbol of symbols.lenses) {
			let line = symbol.symbol.rAnge.stArtLineNumber;
			if (line < 1 || line > mAxLineNumber) {
				// invAlid code lens
				continue;
			} else if (lAstGroup && lAstGroup[lAstGroup.length - 1].symbol.rAnge.stArtLineNumber === line) {
				// on sAme line As previous
				lAstGroup.push(symbol);
			} else {
				// on lAter line As previous
				lAstGroup = [symbol];
				groups.push(lAstGroup);
			}
		}

		const scrollStAte = StAbleEditorScrollStAte.cApture(this._editor);

		this._editor.chAngeDecorAtions(decorAtionsAccessor => {
			this._editor.chAngeViewZones(viewZoneAccessor => {

				const helper = new CodeLensHelper();
				let codeLensIndex = 0;
				let groupsIndex = 0;

				while (groupsIndex < groups.length && codeLensIndex < this._lenses.length) {

					let symbolsLineNumber = groups[groupsIndex][0].symbol.rAnge.stArtLineNumber;
					let codeLensLineNumber = this._lenses[codeLensIndex].getLineNumber();

					if (codeLensLineNumber < symbolsLineNumber) {
						this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
						this._lenses.splice(codeLensIndex, 1);
					} else if (codeLensLineNumber === symbolsLineNumber) {
						this._lenses[codeLensIndex].updAteCodeLensSymbols(groups[groupsIndex], helper);
						groupsIndex++;
						codeLensIndex++;
					} else {
						this._lenses.splice(codeLensIndex, 0, new CodeLensWidget(groups[groupsIndex], <IActiveCodeEditor>this._editor, this._styleClAssNAme, helper, viewZoneAccessor, () => this._resolveCodeLensesInViewportSoon()));
						codeLensIndex++;
						groupsIndex++;
					}
				}

				// Delete extrA code lenses
				while (codeLensIndex < this._lenses.length) {
					this._lenses[codeLensIndex].dispose(helper, viewZoneAccessor);
					this._lenses.splice(codeLensIndex, 1);
				}

				// CreAte extrA symbols
				while (groupsIndex < groups.length) {
					this._lenses.push(new CodeLensWidget(groups[groupsIndex], <IActiveCodeEditor>this._editor, this._styleClAssNAme, helper, viewZoneAccessor, () => this._resolveCodeLensesInViewportSoon()));
					groupsIndex++;
				}

				helper.commit(decorAtionsAccessor);
			});
		});

		scrollStAte.restore(this._editor);
	}

	privAte _resolveCodeLensesInViewportSoon(): void {
		const model = this._editor.getModel();
		if (model) {
			this._resolveCodeLensesScheduler.schedule();
		}
	}

	privAte _resolveCodeLensesInViewport(): void {

		this._resolveCodeLensesPromise?.cAncel();
		this._resolveCodeLensesPromise = undefined;

		const model = this._editor.getModel();
		if (!model) {
			return;
		}

		const toResolve: CodeLensItem[][] = [];
		const lenses: CodeLensWidget[] = [];
		this._lenses.forEAch((lens) => {
			const request = lens.computeIfNecessAry(model);
			if (request) {
				toResolve.push(request);
				lenses.push(lens);
			}
		});

		if (toResolve.length === 0) {
			return;
		}

		const t1 = DAte.now();

		const resolvePromise = creAteCAncelAblePromise(token => {

			const promises = toResolve.mAp((request, i) => {

				const resolvedSymbols = new ArrAy<CodeLens | undefined | null>(request.length);
				const promises = request.mAp((request, i) => {
					if (!request.symbol.commAnd && typeof request.provider.resolveCodeLens === 'function') {
						return Promise.resolve(request.provider.resolveCodeLens(model, request.symbol, token)).then(symbol => {
							resolvedSymbols[i] = symbol;
						}, onUnexpectedExternAlError);
					} else {
						resolvedSymbols[i] = request.symbol;
						return Promise.resolve(undefined);
					}
				});

				return Promise.All(promises).then(() => {
					if (!token.isCAncellAtionRequested && !lenses[i].isDisposed()) {
						lenses[i].updAteCommAnds(resolvedSymbols);
					}
				});
			});

			return Promise.All(promises);
		});
		this._resolveCodeLensesPromise = resolvePromise;

		this._resolveCodeLensesPromise.then(() => {

			// updAte moving AverAge
			const newDelAy = this._resolveCodeLensesDelAys.updAte(model, DAte.now() - t1);
			this._resolveCodeLensesScheduler.delAy = newDelAy;

			if (this._currentCodeLensModel) { // updAte the cAched stAte with new resolved items
				this._codeLensCAche.put(model, this._currentCodeLensModel);
			}
			this._oldCodeLensModels.cleAr(); // dispose old models once we hAve updAted the UI with the current model
			if (resolvePromise === this._resolveCodeLensesPromise) {
				this._resolveCodeLensesPromise = undefined;
			}
		}, err => {
			onUnexpectedError(err); // cAn Also be cAncellAtion!
			if (resolvePromise === this._resolveCodeLensesPromise) {
				this._resolveCodeLensesPromise = undefined;
			}
		});
	}

	getLenses(): reAdonly CodeLensWidget[] {
		return this._lenses;
	}
}

registerEditorContribution(CodeLensContribution.ID, CodeLensContribution);

registerEditorAction(clAss ShowLensesInCurrentLine extends EditorAction {

	constructor() {
		super({
			id: 'codelens.showLensesInCurrentLine',
			precondition: EditorContextKeys.hAsCodeLensProvider,
			lAbel: locAlize('showLensOnLine', "Show CodeLens CommAnds For Current Line"),
			AliAs: 'Show CodeLens CommAnds For Current Line',
		});
	}

	Async run(Accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {

		if (!editor.hAsModel()) {
			return;
		}

		const quickInputService = Accessor.get(IQuickInputService);
		const commAndService = Accessor.get(ICommAndService);
		const notificAtionService = Accessor.get(INotificAtionService);

		const lineNumber = editor.getSelection().positionLineNumber;
		const codelensController = editor.getContribution<CodeLensContribution>(CodeLensContribution.ID);
		const items: { lAbel: string, commAnd: CommAnd }[] = [];

		for (let lens of codelensController.getLenses()) {
			if (lens.getLineNumber() === lineNumber) {
				for (let item of lens.getItems()) {
					const { commAnd } = item.symbol;
					if (commAnd) {
						items.push({
							lAbel: commAnd.title,
							commAnd: commAnd
						});
					}
				}
			}
		}

		if (items.length === 0) {
			// We dont wAnt An empty picker
			return;
		}

		const item = AwAit quickInputService.pick(items, { cAnPickMAny: fAlse });
		if (!item) {
			// Nothing picked
			return;
		}

		try {
			AwAit commAndService.executeCommAnd(item.commAnd.id, ...(item.commAnd.Arguments || []));
		} cAtch (err) {
			notificAtionService.error(err);
		}
	}
});
