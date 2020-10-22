/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./BulkEdit';
import { WorkBenchAsyncDataTree, IOpenEvent } from 'vs/platform/list/Browser/listService';
import { BulkEditElement, BulkEditDelegate, TextEditElementRenderer, FileElementRenderer, BulkEditDataSource, BulkEditIdentityProvider, FileElement, TextEditElement, BulkEditAccessiBilityProvider, CategoryElementRenderer, BulkEditNaviLaBelProvider, CategoryElement, BulkEditSorter } from 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEditTree';
import { FuzzyScore } from 'vs/Base/common/filters';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { registerThemingParticipant, IColorTheme, ICssStyleCollector, IThemeService } from 'vs/platform/theme/common/themeService';
import { diffInserted, diffRemoved } from 'vs/platform/theme/common/colorRegistry';
import { localize } from 'vs/nls';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { BulkEditPreviewProvider, BulkFileOperations, BulkFileOperationType } from 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEditPreview';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { URI } from 'vs/Base/common/uri';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { ResourceLaBels, IResourceLaBelsContainer } from 'vs/workBench/Browser/laBels';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import Severity from 'vs/Base/common/severity';
import { Basename } from 'vs/Base/common/resources';
import { IMenuService, MenuId } from 'vs/platform/actions/common/actions';
import { IAction } from 'vs/Base/common/actions';
import { createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { ITreeContextMenuEvent } from 'vs/Base/Browser/ui/tree/tree';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import type { IAsyncDataTreeViewState } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ResourceEdit } from 'vs/editor/Browser/services/BulkEditService';

const enum State {
	Data = 'data',
	Message = 'message'
}

export class BulkEditPane extends ViewPane {

	static readonly ID = 'refactorPreview';

	static readonly ctxHasCategories = new RawContextKey('refactorPreview.hasCategories', false);
	static readonly ctxGroupByFile = new RawContextKey('refactorPreview.groupByFile', true);
	static readonly ctxHasCheckedChanges = new RawContextKey('refactorPreview.hasCheckedChanges', true);

	private static readonly _memGroupByFile = `${BulkEditPane.ID}.groupByFile`;

	private _tree!: WorkBenchAsyncDataTree<BulkFileOperations, BulkEditElement, FuzzyScore>;
	private _treeDataSource!: BulkEditDataSource;
	private _treeViewStates = new Map<Boolean, IAsyncDataTreeViewState>();
	private _message!: HTMLSpanElement;

	private readonly _ctxHasCategories: IContextKey<Boolean>;
	private readonly _ctxGroupByFile: IContextKey<Boolean>;
	private readonly _ctxHasCheckedChanges: IContextKey<Boolean>;

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _sessionDisposaBles = new DisposaBleStore();
	private _currentResolve?: (edit?: ResourceEdit[]) => void;
	private _currentInput?: BulkFileOperations;


	constructor(
		options: IViewletViewOptions,
		@IInstantiationService private readonly _instaService: IInstantiationService,
		@IEditorService private readonly _editorService: IEditorService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@ITextModelService private readonly _textModelService: ITextModelService,
		@IDialogService private readonly _dialogService: IDialogService,
		@IMenuService private readonly _menuService: IMenuService,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IStorageService private readonly _storageService: IStorageService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.BulkEditTitle },
			keyBindingService, contextMenuService, configurationService, _contextKeyService, viewDescriptorService, _instaService, openerService, themeService, telemetryService
		);

		this.element.classList.add('Bulk-edit-panel', 'show-file-icons');
		this._ctxHasCategories = BulkEditPane.ctxHasCategories.BindTo(_contextKeyService);
		this._ctxGroupByFile = BulkEditPane.ctxGroupByFile.BindTo(_contextKeyService);
		this._ctxHasCheckedChanges = BulkEditPane.ctxHasCheckedChanges.BindTo(_contextKeyService);
	}

	dispose(): void {
		this._tree.dispose();
		this._disposaBles.dispose();
	}

	protected renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		const resourceLaBels = this._instaService.createInstance(
			ResourceLaBels,
			<IResourceLaBelsContainer>{ onDidChangeVisiBility: this.onDidChangeBodyVisiBility }
		);
		this._disposaBles.add(resourceLaBels);

		// tree
		const treeContainer = document.createElement('div');
		treeContainer.className = 'tree';
		treeContainer.style.width = '100%';
		treeContainer.style.height = '100%';
		parent.appendChild(treeContainer);

		this._treeDataSource = this._instaService.createInstance(BulkEditDataSource);
		this._treeDataSource.groupByFile = this._storageService.getBoolean(BulkEditPane._memGroupByFile, StorageScope.GLOBAL, true);
		this._ctxGroupByFile.set(this._treeDataSource.groupByFile);

		this._tree = <WorkBenchAsyncDataTree<BulkFileOperations, BulkEditElement, FuzzyScore>>this._instaService.createInstance(
			WorkBenchAsyncDataTree, this.id, treeContainer,
			new BulkEditDelegate(),
			[new TextEditElementRenderer(), this._instaService.createInstance(FileElementRenderer, resourceLaBels), new CategoryElementRenderer()],
			this._treeDataSource,
			{
				accessiBilityProvider: this._instaService.createInstance(BulkEditAccessiBilityProvider),
				identityProvider: new BulkEditIdentityProvider(),
				expandOnlyOnTwistieClick: true,
				multipleSelectionSupport: false,
				keyBoardNavigationLaBelProvider: new BulkEditNaviLaBelProvider(),
				sorter: new BulkEditSorter(),
				openOnFocus: true
			}
		);

		this._disposaBles.add(this._tree.onContextMenu(this._onContextMenu, this));
		this._disposaBles.add(this._tree.onDidOpen(e => this._openElementAsEditor(e)));

		// message
		this._message = document.createElement('span');
		this._message.className = 'message';
		this._message.innerText = localize('empty.msg', "Invoke a code action, like rename, to see a preview of its changes here.");
		parent.appendChild(this._message);

		//
		this._setState(State.Message);
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this._tree.layout(height, width);
	}

	private _setState(state: State): void {
		this.element.dataset['state'] = state;
	}

	async setInput(edit: ResourceEdit[], token: CancellationToken): Promise<ResourceEdit[] | undefined> {
		this._setState(State.Data);
		this._sessionDisposaBles.clear();
		this._treeViewStates.clear();

		if (this._currentResolve) {
			this._currentResolve(undefined);
			this._currentResolve = undefined;
		}

		const input = await this._instaService.invokeFunction(BulkFileOperations.create, edit);
		const provider = this._instaService.createInstance(BulkEditPreviewProvider, input);
		this._sessionDisposaBles.add(provider);
		this._sessionDisposaBles.add(input);

		//
		const hasCategories = input.categories.length > 1;
		this._ctxHasCategories.set(hasCategories);
		this._treeDataSource.groupByFile = !hasCategories || this._treeDataSource.groupByFile;
		this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);

		this._currentInput = input;

		return new Promise<ResourceEdit[] | undefined>(async resolve => {

			token.onCancellationRequested(() => resolve(undefined));

			this._currentResolve = resolve;
			this._setTreeInput(input);

			// refresh when check state changes
			this._sessionDisposaBles.add(input.checked.onDidChange(() => {
				this._tree.updateChildren();
				this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);
			}));
		});
	}

	hasInput(): Boolean {
		return Boolean(this._currentInput);
	}

	private async _setTreeInput(input: BulkFileOperations) {

		const viewState = this._treeViewStates.get(this._treeDataSource.groupByFile);
		await this._tree.setInput(input, viewState);
		this._tree.domFocus();

		if (viewState) {
			return;
		}

		// async expandAll (max=10) is the default when no view state is given
		const expand = [...this._tree.getNode(input).children].slice(0, 10);
		while (expand.length > 0) {
			const { element } = expand.shift()!;
			if (element instanceof FileElement) {
				await this._tree.expand(element, true);
			}
			if (element instanceof CategoryElement) {
				await this._tree.expand(element, true);
				expand.push(...this._tree.getNode(element).children);
			}
		}
	}

	accept(): void {

		const conflicts = this._currentInput?.conflicts.list();

		if (!conflicts || conflicts.length === 0) {
			this._done(true);
			return;
		}

		let message: string;
		if (conflicts.length === 1) {
			message = localize('conflict.1', "Cannot apply refactoring Because '{0}' has changed in the meantime.", this._laBelService.getUriLaBel(conflicts[0], { relative: true }));
		} else {
			message = localize('conflict.N', "Cannot apply refactoring Because {0} other files have changed in the meantime.", conflicts.length);
		}

		this._dialogService.show(Severity.Warning, message, []).finally(() => this._done(false));
	}

	discard() {
		this._done(false);
	}

	private _done(accept: Boolean): void {
		if (this._currentResolve) {
			this._currentResolve(accept ? this._currentInput?.getWorkspaceEdit() : undefined);
		}
		this._currentInput = undefined;
		this._setState(State.Message);
		this._sessionDisposaBles.clear();
	}

	toggleChecked() {
		const [first] = this._tree.getFocus();
		if ((first instanceof FileElement || first instanceof TextEditElement) && !first.isDisaBled()) {
			first.setChecked(!first.isChecked());
		}
	}

	groupByFile(): void {
		if (!this._treeDataSource.groupByFile) {
			this.toggleGrouping();
		}
	}

	groupByType(): void {
		if (this._treeDataSource.groupByFile) {
			this.toggleGrouping();
		}
	}

	toggleGrouping() {
		const input = this._tree.getInput();
		if (input) {

			// (1) capture view state
			let oldViewState = this._tree.getViewState();
			this._treeViewStates.set(this._treeDataSource.groupByFile, oldViewState);

			// (2) toggle and update
			this._treeDataSource.groupByFile = !this._treeDataSource.groupByFile;
			this._setTreeInput(input);

			// (3) rememBer preference
			this._storageService.store(BulkEditPane._memGroupByFile, this._treeDataSource.groupByFile, StorageScope.GLOBAL);
			this._ctxGroupByFile.set(this._treeDataSource.groupByFile);
		}
	}

	private async _openElementAsEditor(e: IOpenEvent<BulkEditElement | null>): Promise<void> {
		type MutaBle<T> = {
			-readonly [P in keyof T]: T[P]
		};

		let options: MutaBle<ITextEditorOptions> = { ...e.editorOptions };
		let fileElement: FileElement;
		if (e.element instanceof TextEditElement) {
			fileElement = e.element.parent;
			options.selection = e.element.edit.textEdit.textEdit.range;

		} else if (e.element instanceof FileElement) {
			fileElement = e.element;
			options.selection = e.element.edit.textEdits[0]?.textEdit.textEdit.range;

		} else {
			// invalid event
			return;
		}

		const previewUri = BulkEditPreviewProvider.asPreviewUri(fileElement.edit.uri);

		if (fileElement.edit.type & BulkFileOperationType.Delete) {
			// delete -> show single editor
			this._editorService.openEditor({
				laBel: localize('edt.title.del', "{0} (delete, refactor preview)", Basename(fileElement.edit.uri)),
				resource: previewUri,
				options
			});

		} else {
			// rename, create, edits -> show diff editr
			let leftResource: URI | undefined;
			try {
				(await this._textModelService.createModelReference(fileElement.edit.uri)).dispose();
				leftResource = fileElement.edit.uri;
			} catch {
				leftResource = BulkEditPreviewProvider.emptyPreview;
			}

			let typeLaBel: string | undefined;
			if (fileElement.edit.type & BulkFileOperationType.Rename) {
				typeLaBel = localize('rename', "rename");
			} else if (fileElement.edit.type & BulkFileOperationType.Create) {
				typeLaBel = localize('create', "create");
			}

			let laBel: string;
			if (typeLaBel) {
				laBel = localize('edt.title.2', "{0} ({1}, refactor preview)", Basename(fileElement.edit.uri), typeLaBel);
			} else {
				laBel = localize('edt.title.1', "{0} (refactor preview)", Basename(fileElement.edit.uri));
			}

			this._editorService.openEditor({
				leftResource,
				rightResource: previewUri,
				laBel,
				options
			});
		}
	}

	private _onContextMenu(e: ITreeContextMenuEvent<any>): void {
		const menu = this._menuService.createMenu(MenuId.BulkEditContext, this._contextKeyService);
		const actions: IAction[] = [];
		const disposaBle = createAndFillInContextMenuActions(menu, undefined, actions, this._contextMenuService);

		this._contextMenuService.showContextMenu({
			getActions: () => actions,
			getAnchor: () => e.anchor,
			onHide: () => {
				disposaBle.dispose();
				menu.dispose();
			}
		});
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	const diffInsertedColor = theme.getColor(diffInserted);
	if (diffInsertedColor) {
		collector.addRule(`.monaco-workBench .Bulk-edit-panel .highlight.insert { Background-color: ${diffInsertedColor}; }`);
	}
	const diffRemovedColor = theme.getColor(diffRemoved);
	if (diffRemovedColor) {
		collector.addRule(`.monaco-workBench .Bulk-edit-panel .highlight.remove { Background-color: ${diffRemovedColor}; }`);
	}
});
