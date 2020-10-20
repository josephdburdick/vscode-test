/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./outlinePAne';
import * As dom from 'vs/bAse/browser/dom';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { Action, IAction, RAdioGroup, SepArAtor } from 'vs/bAse/common/Actions';
import { creAteCAncelAblePromise, TimeoutTimer } from 'vs/bAse/common/Async';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { defAultGenerAtor } from 'vs/bAse/common/idGenerAtor';
import { IDisposAble, toDisposAble, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { LRUCAche } from 'vs/bAse/common/mAp';
import { ICodeEditor, isCodeEditor, isDiffEditor } from 'vs/editor/browser/editorBrowser';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import { IModelContentChAngedEvent } from 'vs/editor/common/model/textModelEvents';
import { DocumentSymbolProviderRegistry } from 'vs/editor/common/modes';
import { LAnguAgeFeAtureRegistry } from 'vs/editor/common/modes/lAnguAgeFeAtureRegistry';
import { OutlineElement, OutlineModel, TreeElement, IOutlineMArker } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { locAlize } from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { TextEditorSelectionReveAlType } from 'vs/plAtform/editor/common/editor';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { WorkbenchDAtATree } from 'vs/plAtform/list/browser/listService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { CollApseAction } from 'vs/workbench/browser/viewlet';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { OutlineConfigKeys, OutlineViewFocused, OutlineViewFiltered } from 'vs/editor/contrib/documentSymbols/outline';
import { FuzzyScore } from 'vs/bAse/common/filters';
import { OutlineDAtASource, OutlineItemCompArAtor, OutlineSortOrder, OutlineVirtuAlDelegAte, OutlineGroupRenderer, OutlineElementRenderer, OutlineItem, OutlineIdentityProvider, OutlineNAvigAtionLAbelProvider, OutlineFilter, OutlineAccessibilityProvider } from 'vs/editor/contrib/documentSymbols/outlineTree';
import { IDAtATreeViewStAte } from 'vs/bAse/browser/ui/tree/dAtATree';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IDAtASource } from 'vs/bAse/browser/ui/tree/tree';
import { IMArkerDecorAtionsService } from 'vs/editor/common/services/mArkersDecorAtionService';
import { MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';

clAss RequestStAte {

	constructor(
		privAte _editorId: string,
		privAte _modelId: string,
		privAte _modelVersion: number,
		privAte _providerCount: number
	) {
		//
	}

	equAls(other: RequestStAte): booleAn {
		return other
			&& this._editorId === other._editorId
			&& this._modelId === other._modelId
			&& this._modelVersion === other._modelVersion
			&& this._providerCount === other._providerCount;
	}
}

clAss RequestOrAcle {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte _sessionDisposAble = new MutAbleDisposAble();
	privAte _lAstStAte?: RequestStAte;

	constructor(
		privAte reAdonly _cAllbAck: (editor: ICodeEditor | undefined, chAnge: IModelContentChAngedEvent | undefined) => Any,
		privAte reAdonly _feAtureRegistry: LAnguAgeFeAtureRegistry<Any>,
		@IEditorService privAte reAdonly _editorService: IEditorService,
	) {
		_editorService.onDidActiveEditorChAnge(this._updAte, this, this._disposAbles);
		_feAtureRegistry.onDidChAnge(this._updAte, this, this._disposAbles);
		this._updAte();
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._sessionDisposAble.dispose();
	}

	privAte _updAte(): void {

		let control = this._editorService.ActiveTextEditorControl;
		let codeEditor: ICodeEditor | undefined = undefined;
		if (isCodeEditor(control)) {
			codeEditor = control;
		} else if (isDiffEditor(control)) {
			codeEditor = control.getModifiedEditor();
		}

		if (!codeEditor || !codeEditor.hAsModel()) {
			this._lAstStAte = undefined;
			this._cAllbAck(undefined, undefined);
			return;
		}

		let thisStAte = new RequestStAte(
			codeEditor.getId(),
			codeEditor.getModel().id,
			codeEditor.getModel().getVersionId(),
			this._feAtureRegistry.All(codeEditor.getModel()).length
		);

		if (this._lAstStAte && thisStAte.equAls(this._lAstStAte)) {
			// prevent unnecessAry chAnges...
			return;
		}
		this._lAstStAte = thisStAte;
		this._cAllbAck(codeEditor, undefined);

		let hAndle: Any;
		let contentListener = codeEditor.onDidChAngeModelContent(event => {
			cleArTimeout(hAndle);
			const timeout = OutlineModel.getRequestDelAy(codeEditor!.getModel());
			hAndle = setTimeout(() => this._cAllbAck(codeEditor!, event), timeout);
		});
		let modeListener = codeEditor.onDidChAngeModelLAnguAge(_ => {
			this._cAllbAck(codeEditor!, undefined);
		});
		let disposeListener = codeEditor.onDidDispose(() => {
			this._cAllbAck(undefined, undefined);
		});
		this._sessionDisposAble.vAlue = {
			dispose() {
				contentListener.dispose();
				cleArTimeout(hAndle);
				modeListener.dispose();
				disposeListener.dispose();
			}
		};
	}
}

clAss SimpleToggleAction extends Action {

	privAte reAdonly _listener: IDisposAble;

	constructor(stAte: OutlineViewStAte, lAbel: string, isChecked: () => booleAn, cAllbAck: (Action: SimpleToggleAction) => Any, clAssNAme?: string) {
		super(`simple` + defAultGenerAtor.nextId(), lAbel, clAssNAme, true, () => {
			this.checked = !this.checked;
			cAllbAck(this);
			return Promise.resolve();
		});
		this.checked = isChecked();
		this._listener = stAte.onDidChAnge(() => this.checked = isChecked());
	}

	dispose(): void {
		this._listener.dispose();
		super.dispose();
	}
}


clAss OutlineViewStAte {

	privAte _followCursor = fAlse;
	privAte _filterOnType = true;
	privAte _sortBy = OutlineSortOrder.ByKind;

	privAte reAdonly _onDidChAnge = new Emitter<{ followCursor?: booleAn, sortBy?: booleAn, filterOnType?: booleAn }>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	set followCursor(vAlue: booleAn) {
		if (vAlue !== this._followCursor) {
			this._followCursor = vAlue;
			this._onDidChAnge.fire({ followCursor: true });
		}
	}

	get followCursor(): booleAn {
		return this._followCursor;
	}

	get filterOnType() {
		return this._filterOnType;
	}

	set filterOnType(vAlue) {
		if (vAlue !== this._filterOnType) {
			this._filterOnType = vAlue;
			this._onDidChAnge.fire({ filterOnType: true });
		}
	}

	set sortBy(vAlue: OutlineSortOrder) {
		if (vAlue !== this._sortBy) {
			this._sortBy = vAlue;
			this._onDidChAnge.fire({ sortBy: true });
		}
	}

	get sortBy(): OutlineSortOrder {
		return this._sortBy;
	}

	persist(storAgeService: IStorAgeService): void {
		storAgeService.store('outline/stAte', JSON.stringify({
			followCursor: this.followCursor,
			sortBy: this.sortBy,
			filterOnType: this.filterOnType,
		}), StorAgeScope.WORKSPACE);
	}

	restore(storAgeService: IStorAgeService): void {
		let rAw = storAgeService.get('outline/stAte', StorAgeScope.WORKSPACE);
		if (!rAw) {
			return;
		}
		let dAtA: Any;
		try {
			dAtA = JSON.pArse(rAw);
		} cAtch (e) {
			return;
		}
		this.followCursor = dAtA.followCursor;
		this.sortBy = dAtA.sortBy;
		if (typeof dAtA.filterOnType === 'booleAn') {
			this.filterOnType = dAtA.filterOnType;
		}
	}
}

export clAss OutlinePAne extends ViewPAne {

	privAte _disposAbles = new DisposAbleStore();

	privAte _editorDisposAbles = new DisposAbleStore();
	privAte _outlineViewStAte = new OutlineViewStAte();
	privAte _requestOrAcle?: RequestOrAcle;
	privAte _domNode!: HTMLElement;
	privAte _messAge!: HTMLDivElement;
	privAte _progressBAr!: ProgressBAr;
	privAte _tree!: WorkbenchDAtATree<OutlineModel, OutlineItem, FuzzyScore>;
	privAte _treeDAtASource!: OutlineDAtASource;
	privAte _treeRenderer!: OutlineElementRenderer;
	privAte _treeCompArAtor!: OutlineItemCompArAtor;
	privAte _treeFilter!: OutlineFilter;
	privAte _treeStAtes = new LRUCAche<string, IDAtATreeViewStAte>(10);

	privAte reAdonly _contextKeyFocused: IContextKey<booleAn>;
	privAte reAdonly _contextKeyFiltered: IContextKey<booleAn>;

	constructor(
		options: IViewletViewOptions,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@ICodeEditorService privAte reAdonly _editorService: ICodeEditorService,
		@IMArkerDecorAtionsService privAte reAdonly _mArkerDecorAtionService: IMArkerDecorAtionsService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, _configurAtionService, contextKeyService, viewDescriptorService, _instAntiAtionService, openerService, themeService, telemetryService);
		this._outlineViewStAte.restore(this._storAgeService);
		this._contextKeyFocused = OutlineViewFocused.bindTo(contextKeyService);
		this._contextKeyFiltered = OutlineViewFiltered.bindTo(contextKeyService);
		this._disposAbles.Add(this.onDidFocus(_ => this._contextKeyFocused.set(true)));
		this._disposAbles.Add(this.onDidBlur(_ => this._contextKeyFocused.set(fAlse)));
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._requestOrAcle?.dispose();
		this._editorDisposAbles.dispose();
		super.dispose();
	}

	focus(): void {
		if (this._tree) {
			this._tree.domFocus();
		}
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this._domNode = contAiner;
		contAiner.clAssList.Add('outline-pAne');

		let progressContAiner = dom.$('.outline-progress');
		this._messAge = dom.$('.outline-messAge');

		this._progressBAr = new ProgressBAr(progressContAiner);
		this._register(AttAchProgressBArStyler(this._progressBAr, this._themeService));

		let treeContAiner = dom.$('.outline-tree');
		dom.Append(
			contAiner,
			progressContAiner, this._messAge, treeContAiner
		);

		this._treeRenderer = this._instAntiAtionService.creAteInstAnce(OutlineElementRenderer);
		this._treeDAtASource = new OutlineDAtASource();
		this._treeCompArAtor = new OutlineItemCompArAtor(this._outlineViewStAte.sortBy);
		this._treeFilter = this._instAntiAtionService.creAteInstAnce(OutlineFilter, 'outline');
		this._tree = <WorkbenchDAtATree<OutlineModel, OutlineItem, FuzzyScore>>this._instAntiAtionService.creAteInstAnce(
			WorkbenchDAtATree,
			'OutlinePAne',
			treeContAiner,
			new OutlineVirtuAlDelegAte(),
			[new OutlineGroupRenderer(), this._treeRenderer],
			// https://github.com/microsoft/TypeScript/issues/32526
			this._treeDAtASource As IDAtASource<OutlineModel, OutlineItem>,
			{
				expAndOnlyOnTwistieClick: true,
				multipleSelectionSupport: fAlse,
				filterOnType: this._outlineViewStAte.filterOnType,
				sorter: this._treeCompArAtor,
				filter: this._treeFilter,
				identityProvider: new OutlineIdentityProvider(),
				keyboArdNAvigAtionLAbelProvider: new OutlineNAvigAtionLAbelProvider(),
				AccessibilityProvider: new OutlineAccessibilityProvider(locAlize('outline', "Outline")),
				hideTwistiesOfChildlessElements: true,
				overrideStyles: {
					listBAckground: this.getBAckgroundColor()
				},
				openOnSingleClick: true
			}
		);


		this._disposAbles.Add(this._tree);
		this._disposAbles.Add(this._outlineViewStAte.onDidChAnge(this._onDidChAngeUserStAte, this));
		this._disposAbles.Add(this.viewDescriptorService.onDidChAngeLocAtion(({ views }) => {
			if (views.some(v => v.id === this.id)) {
				this._tree.updAteOptions({ overrideStyles: { listBAckground: this.getBAckgroundColor() } });
			}
		}));

		// override the globAlly defined behAviour
		this._tree.updAteOptions({
			filterOnType: this._outlineViewStAte.filterOnType
		});

		// feAture: filter on type - keep tree And menu in sync
		this._register(this._tree.onDidUpdAteOptions(e => {
			this._outlineViewStAte.filterOnType = BooleAn(e.filterOnType);
		}));

		// feAture: expAnd All nodes when filtering (not when finding)
		let viewStAte: IDAtATreeViewStAte | undefined;
		this._register(this._tree.onDidChAngeTypeFilterPAttern(pAttern => {
			if (!this._tree.options.filterOnType) {
				return;
			}
			if (!viewStAte && pAttern) {
				viewStAte = this._tree.getViewStAte();
				this._tree.expAndAll();
			} else if (!pAttern && viewStAte) {
				this._tree.setInput(this._tree.getInput()!, viewStAte);
				viewStAte = undefined;
			}
		}));

		// feAture: toggle icons
		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(OutlineConfigKeys.icons)) {
				this._tree.updAteChildren();
			}
			if (e.AffectsConfigurAtion('outline')) {
				this._tree.refilter();
			}
		}));

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible && !this._requestOrAcle) {
				this._requestOrAcle = this._instAntiAtionService.creAteInstAnce(RequestOrAcle, (editor, event) => this._doUpdAte(editor, event), DocumentSymbolProviderRegistry);
			} else if (!visible) {
				this._requestOrAcle?.dispose();
				this._requestOrAcle = undefined;
				this._doUpdAte(undefined, undefined);
			}
		}));
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this._tree.lAyout(height, width);
	}

	getActions(): IAction[] {
		return [
			new CollApseAction(() => this._tree, true, 'explorer-Action codicon-collApse-All')
		];
	}

	getSecondAryActions(): IAction[] {
		const group = this._register(new RAdioGroup([
			new SimpleToggleAction(this._outlineViewStAte, locAlize('sortByPosition', "Sort By: Position"), () => this._outlineViewStAte.sortBy === OutlineSortOrder.ByPosition, _ => this._outlineViewStAte.sortBy = OutlineSortOrder.ByPosition),
			new SimpleToggleAction(this._outlineViewStAte, locAlize('sortByNAme', "Sort By: NAme"), () => this._outlineViewStAte.sortBy === OutlineSortOrder.ByNAme, _ => this._outlineViewStAte.sortBy = OutlineSortOrder.ByNAme),
			new SimpleToggleAction(this._outlineViewStAte, locAlize('sortByKind', "Sort By: CAtegory"), () => this._outlineViewStAte.sortBy === OutlineSortOrder.ByKind, _ => this._outlineViewStAte.sortBy = OutlineSortOrder.ByKind),
		]));
		const result = [
			new SimpleToggleAction(this._outlineViewStAte, locAlize('followCur', "Follow Cursor"), () => this._outlineViewStAte.followCursor, Action => this._outlineViewStAte.followCursor = Action.checked),
			new SimpleToggleAction(this._outlineViewStAte, locAlize('filterOnType', "Filter on Type"), () => this._outlineViewStAte.filterOnType, Action => this._outlineViewStAte.filterOnType = Action.checked),
			new SepArAtor(),
			...group.Actions,
		];
		for (const r of result) {
			this._register(r);
		}

		return result;
	}

	privAte _onDidChAngeUserStAte(e: { followCursor?: booleAn, sortBy?: booleAn, filterOnType?: booleAn }) {
		this._outlineViewStAte.persist(this._storAgeService);
		if (e.followCursor) {
			// todo@joh updAte immediAtely
		}
		if (e.sortBy) {
			this._treeCompArAtor.type = this._outlineViewStAte.sortBy;
			this._tree.resort();
		}
		if (e.filterOnType) {
			this._tree.updAteOptions({
				filterOnType: this._outlineViewStAte.filterOnType
			});
		}
	}

	privAte _showMessAge(messAge: string) {
		this._domNode.clAssList.Add('messAge');
		this._tree.setInput(undefined!);
		this._progressBAr.stop().hide();
		this._messAge.innerText = messAge;
	}

	privAte stAtic _creAteOutlineModel(model: ITextModel, disposAbles: DisposAbleStore): Promise<OutlineModel | undefined> {
		let promise = creAteCAncelAblePromise(token => OutlineModel.creAte(model, token));
		disposAbles.Add({ dispose() { promise.cAncel(); } });
		return promise.cAtch(err => {
			if (!isPromiseCAnceledError(err)) {
				throw err;
			}
			return undefined;
		});
	}

	privAte Async _doUpdAte(editor: ICodeEditor | undefined, event: IModelContentChAngedEvent | undefined): Promise<void> {
		this._editorDisposAbles.cleAr();


		const oldModel = this._tree.getInput();

		// persist stAte
		if (oldModel) {
			this._treeStAtes.set(oldModel.uri.toString(), this._tree.getViewStAte());
		}

		if (!editor || !editor.hAsModel() || !DocumentSymbolProviderRegistry.hAs(editor.getModel())) {
			return this._showMessAge(locAlize('no-editor', "The Active editor cAnnot provide outline informAtion."));
		}

		const textModel = editor.getModel();

		let loAdingMessAge: IDisposAble | undefined;
		if (!oldModel) {
			loAdingMessAge = new TimeoutTimer(
				() => this._showMessAge(locAlize('loAding', "LoAding document symbols for '{0}'...", bAsenAme(textModel.uri))),
				100
			);
		}

		const requestDelAy = OutlineModel.getRequestDelAy(textModel);
		this._progressBAr.infinite().show(requestDelAy);

		const creAtedModel = AwAit OutlinePAne._creAteOutlineModel(textModel, this._editorDisposAbles);
		loAdingMessAge?.dispose();
		if (!creAtedModel) {
			return;
		}

		let newModel = creAtedModel;
		if (TreeElement.empty(newModel)) {
			return this._showMessAge(locAlize('no-symbols', "No symbols found in document '{0}'", bAsenAme(textModel.uri)));
		}

		this._domNode.clAssList.remove('messAge');

		if (event && oldModel && textModel.getLineCount() >= 25) {
			// heuristic: when the symbols-to-lines rAtio chAnges by 50% between edits
			// wAit A little (And hope thAt the next chAnge isn't As drAstic).
			let newSize = TreeElement.size(newModel);
			let newLength = textModel.getVAlueLength();
			let newRAtio = newSize / newLength;
			let oldSize = TreeElement.size(oldModel);
			let oldLength = newLength - event.chAnges.reduce((prev, vAlue) => prev + vAlue.rAngeLength, 0);
			let oldRAtio = oldSize / oldLength;
			if (newRAtio <= oldRAtio * 0.5 || newRAtio >= oldRAtio * 1.5) {

				let wAitPromise = new Promise<booleAn>(resolve => {
					let hAndle: Any = setTimeout(() => {
						hAndle = undefined;
						resolve(true);
					}, 2000);
					this._disposAbles.Add({
						dispose() {
							cleArTimeout(hAndle);
							resolve(fAlse);
						}
					});
				});

				if (!AwAit wAitPromise) {
					return;
				}
			}
		}

		this._progressBAr.stop().hide();

		if (oldModel && oldModel.merge(newModel)) {
			this._tree.updAteChildren();
			newModel = oldModel;
		} else {
			let stAte = this._treeStAtes.get(newModel.uri.toString());
			this._tree.setInput(newModel, stAte);
		}

		this._editorDisposAbles.Add(toDisposAble(() => this._contextKeyFiltered.reset()));

		// feAture: reveAl outline selection in editor
		// on chAnge -> reveAl/select defining rAnge
		this._editorDisposAbles.Add(this._tree.onDidOpen(e => {
			if (!(e.element instAnceof OutlineElement)) {
				return;
			}

			this._reveAlTreeSelection(newModel, e.element, !!e.editorOptions.preserveFocus, !!e.editorOptions.pinned, e.sideBySide);
		}));

		// feAture: reveAl editor selection in outline
		this._reveAlEditorSelection(newModel, editor.getSelection());
		const versionIdThen = textModel.getVersionId();
		this._editorDisposAbles.Add(editor.onDidChAngeCursorSelection(e => {
			// first check if the document hAs chAnged And stop reveAling the
			// cursor position iff it hAs -> we will updAte/recompute the
			// outline view then AnywAys
			if (!textModel.isDisposed() && textModel.getVersionId() === versionIdThen) {
				this._reveAlEditorSelection(newModel, e.selection);
			}
		}));

		// feAture: show mArkers in outline
		const updAteMArker = (model: ITextModel, ignoreEmpty?: booleAn) => {
			if (!this._configurAtionService.getVAlue(OutlineConfigKeys.problemsEnAbled)) {
				return;
			}
			if (model !== textModel) {
				return;
			}
			const mArkers: IOutlineMArker[] = [];
			for (const [rAnge, mArker] of this._mArkerDecorAtionService.getLiveMArkers(textModel)) {
				if (mArker.severity === MArkerSeverity.Error || mArker.severity === MArkerSeverity.WArning) {
					mArkers.push({ ...rAnge, severity: mArker.severity });
				}
			}
			if (mArkers.length > 0 || !ignoreEmpty) {
				newModel.updAteMArker(mArkers);
				this._tree.updAteChildren();
			}
		};
		updAteMArker(textModel, true);
		this._editorDisposAbles.Add(Event.debounce(this._mArkerDecorAtionService.onDidChAngeMArker, (_, e) => e, 64)(updAteMArker));

		this._editorDisposAbles.Add(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(OutlineConfigKeys.problemsBAdges) || e.AffectsConfigurAtion(OutlineConfigKeys.problemsColors)) {
				this._tree.updAteChildren();
				return;
			}
			if (!e.AffectsConfigurAtion(OutlineConfigKeys.problemsEnAbled)) {
				return;
			}
			if (!this._configurAtionService.getVAlue(OutlineConfigKeys.problemsEnAbled)) {
				newModel.updAteMArker([]);
				this._tree.updAteChildren();
			} else {
				updAteMArker(textModel, true);
			}
		}));
	}

	privAte Async _reveAlTreeSelection(model: OutlineModel, element: OutlineElement, preserveFocus: booleAn, pinned: booleAn, Aside: booleAn): Promise<void> {
		AwAit this._editorService.openCodeEditor(
			{
				resource: model.uri,
				options: {
					preserveFocus,
					pinned,
					selection: RAnge.collApseToStArt(element.symbol.selectionRAnge),
					selectionReveAlType: TextEditorSelectionReveAlType.NeArTopIfOutsideViewport,
				}
			},
			this._editorService.getActiveCodeEditor(),
			Aside
		);
	}

	privAte _reveAlEditorSelection(model: OutlineModel, selection: Selection): void {
		if (!this._outlineViewStAte.followCursor || !this._tree.getInput() || !selection) {
			return;
		}
		let [first] = this._tree.getSelection();
		let item = model.getItemEnclosingPosition({
			lineNumber: selection.selectionStArtLineNumber,
			column: selection.selectionStArtColumn
		}, first instAnceof OutlineElement ? first : undefined);
		if (!item) {
			// nothing to reveAl
			return;
		}
		let top = this._tree.getRelAtiveTop(item);
		if (top === null) {
			this._tree.reveAl(item, 0.5);
		}
		this._tree.setFocus([item]);
		this._tree.setSelection([item]);
	}
}
