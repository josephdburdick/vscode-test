/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./outlinePane';
import * as dom from 'vs/Base/Browser/dom';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { Action, IAction, RadioGroup, Separator } from 'vs/Base/common/actions';
import { createCancelaBlePromise, TimeoutTimer } from 'vs/Base/common/async';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { defaultGenerator } from 'vs/Base/common/idGenerator';
import { IDisposaBle, toDisposaBle, DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { LRUCache } from 'vs/Base/common/map';
import { ICodeEditor, isCodeEditor, isDiffEditor } from 'vs/editor/Browser/editorBrowser';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import { IModelContentChangedEvent } from 'vs/editor/common/model/textModelEvents';
import { DocumentSymBolProviderRegistry } from 'vs/editor/common/modes';
import { LanguageFeatureRegistry } from 'vs/editor/common/modes/languageFeatureRegistry';
import { OutlineElement, OutlineModel, TreeElement, IOutlineMarker } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { WorkBenchDataTree } from 'vs/platform/list/Browser/listService';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { attachProgressBarStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { CollapseAction } from 'vs/workBench/Browser/viewlet';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { OutlineConfigKeys, OutlineViewFocused, OutlineViewFiltered } from 'vs/editor/contriB/documentSymBols/outline';
import { FuzzyScore } from 'vs/Base/common/filters';
import { OutlineDataSource, OutlineItemComparator, OutlineSortOrder, OutlineVirtualDelegate, OutlineGroupRenderer, OutlineElementRenderer, OutlineItem, OutlineIdentityProvider, OutlineNavigationLaBelProvider, OutlineFilter, OutlineAccessiBilityProvider } from 'vs/editor/contriB/documentSymBols/outlineTree';
import { IDataTreeViewState } from 'vs/Base/Browser/ui/tree/dataTree';
import { Basename } from 'vs/Base/common/resources';
import { IDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { IMarkerDecorationsService } from 'vs/editor/common/services/markersDecorationService';
import { MarkerSeverity } from 'vs/platform/markers/common/markers';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

class RequestState {

	constructor(
		private _editorId: string,
		private _modelId: string,
		private _modelVersion: numBer,
		private _providerCount: numBer
	) {
		//
	}

	equals(other: RequestState): Boolean {
		return other
			&& this._editorId === other._editorId
			&& this._modelId === other._modelId
			&& this._modelVersion === other._modelVersion
			&& this._providerCount === other._providerCount;
	}
}

class RequestOracle {

	private readonly _disposaBles = new DisposaBleStore();
	private _sessionDisposaBle = new MutaBleDisposaBle();
	private _lastState?: RequestState;

	constructor(
		private readonly _callBack: (editor: ICodeEditor | undefined, change: IModelContentChangedEvent | undefined) => any,
		private readonly _featureRegistry: LanguageFeatureRegistry<any>,
		@IEditorService private readonly _editorService: IEditorService,
	) {
		_editorService.onDidActiveEditorChange(this._update, this, this._disposaBles);
		_featureRegistry.onDidChange(this._update, this, this._disposaBles);
		this._update();
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._sessionDisposaBle.dispose();
	}

	private _update(): void {

		let control = this._editorService.activeTextEditorControl;
		let codeEditor: ICodeEditor | undefined = undefined;
		if (isCodeEditor(control)) {
			codeEditor = control;
		} else if (isDiffEditor(control)) {
			codeEditor = control.getModifiedEditor();
		}

		if (!codeEditor || !codeEditor.hasModel()) {
			this._lastState = undefined;
			this._callBack(undefined, undefined);
			return;
		}

		let thisState = new RequestState(
			codeEditor.getId(),
			codeEditor.getModel().id,
			codeEditor.getModel().getVersionId(),
			this._featureRegistry.all(codeEditor.getModel()).length
		);

		if (this._lastState && thisState.equals(this._lastState)) {
			// prevent unnecessary changes...
			return;
		}
		this._lastState = thisState;
		this._callBack(codeEditor, undefined);

		let handle: any;
		let contentListener = codeEditor.onDidChangeModelContent(event => {
			clearTimeout(handle);
			const timeout = OutlineModel.getRequestDelay(codeEditor!.getModel());
			handle = setTimeout(() => this._callBack(codeEditor!, event), timeout);
		});
		let modeListener = codeEditor.onDidChangeModelLanguage(_ => {
			this._callBack(codeEditor!, undefined);
		});
		let disposeListener = codeEditor.onDidDispose(() => {
			this._callBack(undefined, undefined);
		});
		this._sessionDisposaBle.value = {
			dispose() {
				contentListener.dispose();
				clearTimeout(handle);
				modeListener.dispose();
				disposeListener.dispose();
			}
		};
	}
}

class SimpleToggleAction extends Action {

	private readonly _listener: IDisposaBle;

	constructor(state: OutlineViewState, laBel: string, isChecked: () => Boolean, callBack: (action: SimpleToggleAction) => any, className?: string) {
		super(`simple` + defaultGenerator.nextId(), laBel, className, true, () => {
			this.checked = !this.checked;
			callBack(this);
			return Promise.resolve();
		});
		this.checked = isChecked();
		this._listener = state.onDidChange(() => this.checked = isChecked());
	}

	dispose(): void {
		this._listener.dispose();
		super.dispose();
	}
}


class OutlineViewState {

	private _followCursor = false;
	private _filterOnType = true;
	private _sortBy = OutlineSortOrder.ByKind;

	private readonly _onDidChange = new Emitter<{ followCursor?: Boolean, sortBy?: Boolean, filterOnType?: Boolean }>();
	readonly onDidChange = this._onDidChange.event;

	set followCursor(value: Boolean) {
		if (value !== this._followCursor) {
			this._followCursor = value;
			this._onDidChange.fire({ followCursor: true });
		}
	}

	get followCursor(): Boolean {
		return this._followCursor;
	}

	get filterOnType() {
		return this._filterOnType;
	}

	set filterOnType(value) {
		if (value !== this._filterOnType) {
			this._filterOnType = value;
			this._onDidChange.fire({ filterOnType: true });
		}
	}

	set sortBy(value: OutlineSortOrder) {
		if (value !== this._sortBy) {
			this._sortBy = value;
			this._onDidChange.fire({ sortBy: true });
		}
	}

	get sortBy(): OutlineSortOrder {
		return this._sortBy;
	}

	persist(storageService: IStorageService): void {
		storageService.store('outline/state', JSON.stringify({
			followCursor: this.followCursor,
			sortBy: this.sortBy,
			filterOnType: this.filterOnType,
		}), StorageScope.WORKSPACE);
	}

	restore(storageService: IStorageService): void {
		let raw = storageService.get('outline/state', StorageScope.WORKSPACE);
		if (!raw) {
			return;
		}
		let data: any;
		try {
			data = JSON.parse(raw);
		} catch (e) {
			return;
		}
		this.followCursor = data.followCursor;
		this.sortBy = data.sortBy;
		if (typeof data.filterOnType === 'Boolean') {
			this.filterOnType = data.filterOnType;
		}
	}
}

export class OutlinePane extends ViewPane {

	private _disposaBles = new DisposaBleStore();

	private _editorDisposaBles = new DisposaBleStore();
	private _outlineViewState = new OutlineViewState();
	private _requestOracle?: RequestOracle;
	private _domNode!: HTMLElement;
	private _message!: HTMLDivElement;
	private _progressBar!: ProgressBar;
	private _tree!: WorkBenchDataTree<OutlineModel, OutlineItem, FuzzyScore>;
	private _treeDataSource!: OutlineDataSource;
	private _treeRenderer!: OutlineElementRenderer;
	private _treeComparator!: OutlineItemComparator;
	private _treeFilter!: OutlineFilter;
	private _treeStates = new LRUCache<string, IDataTreeViewState>(10);

	private readonly _contextKeyFocused: IContextKey<Boolean>;
	private readonly _contextKeyFiltered: IContextKey<Boolean>;

	constructor(
		options: IViewletViewOptions,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IThemeService private readonly _themeService: IThemeService,
		@IStorageService private readonly _storageService: IStorageService,
		@ICodeEditorService private readonly _editorService: ICodeEditorService,
		@IMarkerDecorationsService private readonly _markerDecorationService: IMarkerDecorationsService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, _configurationService, contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, telemetryService);
		this._outlineViewState.restore(this._storageService);
		this._contextKeyFocused = OutlineViewFocused.BindTo(contextKeyService);
		this._contextKeyFiltered = OutlineViewFiltered.BindTo(contextKeyService);
		this._disposaBles.add(this.onDidFocus(_ => this._contextKeyFocused.set(true)));
		this._disposaBles.add(this.onDidBlur(_ => this._contextKeyFocused.set(false)));
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._requestOracle?.dispose();
		this._editorDisposaBles.dispose();
		super.dispose();
	}

	focus(): void {
		if (this._tree) {
			this._tree.domFocus();
		}
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this._domNode = container;
		container.classList.add('outline-pane');

		let progressContainer = dom.$('.outline-progress');
		this._message = dom.$('.outline-message');

		this._progressBar = new ProgressBar(progressContainer);
		this._register(attachProgressBarStyler(this._progressBar, this._themeService));

		let treeContainer = dom.$('.outline-tree');
		dom.append(
			container,
			progressContainer, this._message, treeContainer
		);

		this._treeRenderer = this._instantiationService.createInstance(OutlineElementRenderer);
		this._treeDataSource = new OutlineDataSource();
		this._treeComparator = new OutlineItemComparator(this._outlineViewState.sortBy);
		this._treeFilter = this._instantiationService.createInstance(OutlineFilter, 'outline');
		this._tree = <WorkBenchDataTree<OutlineModel, OutlineItem, FuzzyScore>>this._instantiationService.createInstance(
			WorkBenchDataTree,
			'OutlinePane',
			treeContainer,
			new OutlineVirtualDelegate(),
			[new OutlineGroupRenderer(), this._treeRenderer],
			// https://githuB.com/microsoft/TypeScript/issues/32526
			this._treeDataSource as IDataSource<OutlineModel, OutlineItem>,
			{
				expandOnlyOnTwistieClick: true,
				multipleSelectionSupport: false,
				filterOnType: this._outlineViewState.filterOnType,
				sorter: this._treeComparator,
				filter: this._treeFilter,
				identityProvider: new OutlineIdentityProvider(),
				keyBoardNavigationLaBelProvider: new OutlineNavigationLaBelProvider(),
				accessiBilityProvider: new OutlineAccessiBilityProvider(localize('outline', "Outline")),
				hideTwistiesOfChildlessElements: true,
				overrideStyles: {
					listBackground: this.getBackgroundColor()
				},
				openOnSingleClick: true
			}
		);


		this._disposaBles.add(this._tree);
		this._disposaBles.add(this._outlineViewState.onDidChange(this._onDidChangeUserState, this));
		this._disposaBles.add(this.viewDescriptorService.onDidChangeLocation(({ views }) => {
			if (views.some(v => v.id === this.id)) {
				this._tree.updateOptions({ overrideStyles: { listBackground: this.getBackgroundColor() } });
			}
		}));

		// override the gloBally defined Behaviour
		this._tree.updateOptions({
			filterOnType: this._outlineViewState.filterOnType
		});

		// feature: filter on type - keep tree and menu in sync
		this._register(this._tree.onDidUpdateOptions(e => {
			this._outlineViewState.filterOnType = Boolean(e.filterOnType);
		}));

		// feature: expand all nodes when filtering (not when finding)
		let viewState: IDataTreeViewState | undefined;
		this._register(this._tree.onDidChangeTypeFilterPattern(pattern => {
			if (!this._tree.options.filterOnType) {
				return;
			}
			if (!viewState && pattern) {
				viewState = this._tree.getViewState();
				this._tree.expandAll();
			} else if (!pattern && viewState) {
				this._tree.setInput(this._tree.getInput()!, viewState);
				viewState = undefined;
			}
		}));

		// feature: toggle icons
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(OutlineConfigKeys.icons)) {
				this._tree.updateChildren();
			}
			if (e.affectsConfiguration('outline')) {
				this._tree.refilter();
			}
		}));

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && !this._requestOracle) {
				this._requestOracle = this._instantiationService.createInstance(RequestOracle, (editor, event) => this._doUpdate(editor, event), DocumentSymBolProviderRegistry);
			} else if (!visiBle) {
				this._requestOracle?.dispose();
				this._requestOracle = undefined;
				this._doUpdate(undefined, undefined);
			}
		}));
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this._tree.layout(height, width);
	}

	getActions(): IAction[] {
		return [
			new CollapseAction(() => this._tree, true, 'explorer-action codicon-collapse-all')
		];
	}

	getSecondaryActions(): IAction[] {
		const group = this._register(new RadioGroup([
			new SimpleToggleAction(this._outlineViewState, localize('sortByPosition', "Sort By: Position"), () => this._outlineViewState.sortBy === OutlineSortOrder.ByPosition, _ => this._outlineViewState.sortBy = OutlineSortOrder.ByPosition),
			new SimpleToggleAction(this._outlineViewState, localize('sortByName', "Sort By: Name"), () => this._outlineViewState.sortBy === OutlineSortOrder.ByName, _ => this._outlineViewState.sortBy = OutlineSortOrder.ByName),
			new SimpleToggleAction(this._outlineViewState, localize('sortByKind', "Sort By: Category"), () => this._outlineViewState.sortBy === OutlineSortOrder.ByKind, _ => this._outlineViewState.sortBy = OutlineSortOrder.ByKind),
		]));
		const result = [
			new SimpleToggleAction(this._outlineViewState, localize('followCur', "Follow Cursor"), () => this._outlineViewState.followCursor, action => this._outlineViewState.followCursor = action.checked),
			new SimpleToggleAction(this._outlineViewState, localize('filterOnType', "Filter on Type"), () => this._outlineViewState.filterOnType, action => this._outlineViewState.filterOnType = action.checked),
			new Separator(),
			...group.actions,
		];
		for (const r of result) {
			this._register(r);
		}

		return result;
	}

	private _onDidChangeUserState(e: { followCursor?: Boolean, sortBy?: Boolean, filterOnType?: Boolean }) {
		this._outlineViewState.persist(this._storageService);
		if (e.followCursor) {
			// todo@joh update immediately
		}
		if (e.sortBy) {
			this._treeComparator.type = this._outlineViewState.sortBy;
			this._tree.resort();
		}
		if (e.filterOnType) {
			this._tree.updateOptions({
				filterOnType: this._outlineViewState.filterOnType
			});
		}
	}

	private _showMessage(message: string) {
		this._domNode.classList.add('message');
		this._tree.setInput(undefined!);
		this._progressBar.stop().hide();
		this._message.innerText = message;
	}

	private static _createOutlineModel(model: ITextModel, disposaBles: DisposaBleStore): Promise<OutlineModel | undefined> {
		let promise = createCancelaBlePromise(token => OutlineModel.create(model, token));
		disposaBles.add({ dispose() { promise.cancel(); } });
		return promise.catch(err => {
			if (!isPromiseCanceledError(err)) {
				throw err;
			}
			return undefined;
		});
	}

	private async _doUpdate(editor: ICodeEditor | undefined, event: IModelContentChangedEvent | undefined): Promise<void> {
		this._editorDisposaBles.clear();


		const oldModel = this._tree.getInput();

		// persist state
		if (oldModel) {
			this._treeStates.set(oldModel.uri.toString(), this._tree.getViewState());
		}

		if (!editor || !editor.hasModel() || !DocumentSymBolProviderRegistry.has(editor.getModel())) {
			return this._showMessage(localize('no-editor', "The active editor cannot provide outline information."));
		}

		const textModel = editor.getModel();

		let loadingMessage: IDisposaBle | undefined;
		if (!oldModel) {
			loadingMessage = new TimeoutTimer(
				() => this._showMessage(localize('loading', "Loading document symBols for '{0}'...", Basename(textModel.uri))),
				100
			);
		}

		const requestDelay = OutlineModel.getRequestDelay(textModel);
		this._progressBar.infinite().show(requestDelay);

		const createdModel = await OutlinePane._createOutlineModel(textModel, this._editorDisposaBles);
		loadingMessage?.dispose();
		if (!createdModel) {
			return;
		}

		let newModel = createdModel;
		if (TreeElement.empty(newModel)) {
			return this._showMessage(localize('no-symBols', "No symBols found in document '{0}'", Basename(textModel.uri)));
		}

		this._domNode.classList.remove('message');

		if (event && oldModel && textModel.getLineCount() >= 25) {
			// heuristic: when the symBols-to-lines ratio changes By 50% Between edits
			// wait a little (and hope that the next change isn't as drastic).
			let newSize = TreeElement.size(newModel);
			let newLength = textModel.getValueLength();
			let newRatio = newSize / newLength;
			let oldSize = TreeElement.size(oldModel);
			let oldLength = newLength - event.changes.reduce((prev, value) => prev + value.rangeLength, 0);
			let oldRatio = oldSize / oldLength;
			if (newRatio <= oldRatio * 0.5 || newRatio >= oldRatio * 1.5) {

				let waitPromise = new Promise<Boolean>(resolve => {
					let handle: any = setTimeout(() => {
						handle = undefined;
						resolve(true);
					}, 2000);
					this._disposaBles.add({
						dispose() {
							clearTimeout(handle);
							resolve(false);
						}
					});
				});

				if (!await waitPromise) {
					return;
				}
			}
		}

		this._progressBar.stop().hide();

		if (oldModel && oldModel.merge(newModel)) {
			this._tree.updateChildren();
			newModel = oldModel;
		} else {
			let state = this._treeStates.get(newModel.uri.toString());
			this._tree.setInput(newModel, state);
		}

		this._editorDisposaBles.add(toDisposaBle(() => this._contextKeyFiltered.reset()));

		// feature: reveal outline selection in editor
		// on change -> reveal/select defining range
		this._editorDisposaBles.add(this._tree.onDidOpen(e => {
			if (!(e.element instanceof OutlineElement)) {
				return;
			}

			this._revealTreeSelection(newModel, e.element, !!e.editorOptions.preserveFocus, !!e.editorOptions.pinned, e.sideBySide);
		}));

		// feature: reveal editor selection in outline
		this._revealEditorSelection(newModel, editor.getSelection());
		const versionIdThen = textModel.getVersionId();
		this._editorDisposaBles.add(editor.onDidChangeCursorSelection(e => {
			// first check if the document has changed and stop revealing the
			// cursor position iff it has -> we will update/recompute the
			// outline view then anyways
			if (!textModel.isDisposed() && textModel.getVersionId() === versionIdThen) {
				this._revealEditorSelection(newModel, e.selection);
			}
		}));

		// feature: show markers in outline
		const updateMarker = (model: ITextModel, ignoreEmpty?: Boolean) => {
			if (!this._configurationService.getValue(OutlineConfigKeys.proBlemsEnaBled)) {
				return;
			}
			if (model !== textModel) {
				return;
			}
			const markers: IOutlineMarker[] = [];
			for (const [range, marker] of this._markerDecorationService.getLiveMarkers(textModel)) {
				if (marker.severity === MarkerSeverity.Error || marker.severity === MarkerSeverity.Warning) {
					markers.push({ ...range, severity: marker.severity });
				}
			}
			if (markers.length > 0 || !ignoreEmpty) {
				newModel.updateMarker(markers);
				this._tree.updateChildren();
			}
		};
		updateMarker(textModel, true);
		this._editorDisposaBles.add(Event.deBounce(this._markerDecorationService.onDidChangeMarker, (_, e) => e, 64)(updateMarker));

		this._editorDisposaBles.add(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(OutlineConfigKeys.proBlemsBadges) || e.affectsConfiguration(OutlineConfigKeys.proBlemsColors)) {
				this._tree.updateChildren();
				return;
			}
			if (!e.affectsConfiguration(OutlineConfigKeys.proBlemsEnaBled)) {
				return;
			}
			if (!this._configurationService.getValue(OutlineConfigKeys.proBlemsEnaBled)) {
				newModel.updateMarker([]);
				this._tree.updateChildren();
			} else {
				updateMarker(textModel, true);
			}
		}));
	}

	private async _revealTreeSelection(model: OutlineModel, element: OutlineElement, preserveFocus: Boolean, pinned: Boolean, aside: Boolean): Promise<void> {
		await this._editorService.openCodeEditor(
			{
				resource: model.uri,
				options: {
					preserveFocus,
					pinned,
					selection: Range.collapseToStart(element.symBol.selectionRange),
					selectionRevealType: TextEditorSelectionRevealType.NearTopIfOutsideViewport,
				}
			},
			this._editorService.getActiveCodeEditor(),
			aside
		);
	}

	private _revealEditorSelection(model: OutlineModel, selection: Selection): void {
		if (!this._outlineViewState.followCursor || !this._tree.getInput() || !selection) {
			return;
		}
		let [first] = this._tree.getSelection();
		let item = model.getItemEnclosingPosition({
			lineNumBer: selection.selectionStartLineNumBer,
			column: selection.selectionStartColumn
		}, first instanceof OutlineElement ? first : undefined);
		if (!item) {
			// nothing to reveal
			return;
		}
		let top = this._tree.getRelativeTop(item);
		if (top === null) {
			this._tree.reveal(item, 0.5);
		}
		this._tree.setFocus([item]);
		this._tree.setSelection([item]);
	}
}
