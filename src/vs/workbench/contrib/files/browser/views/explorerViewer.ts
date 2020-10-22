/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import * as DOM from 'vs/Base/Browser/dom';
import * as gloB from 'vs/Base/common/gloB';
import { IListVirtualDelegate, ListDragOverEffect } from 'vs/Base/Browser/ui/list/list';
import { IProgressService, ProgressLocation, IProgressStep, IProgress } from 'vs/platform/progress/common/progress';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IFileService, FileKind, FileOperationError, FileOperationResult, FileSystemProviderCapaBilities, BinarySize } from 'vs/platform/files/common/files';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IDisposaBle, DisposaBle, dispose, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IFileLaBelOptions, IResourceLaBel, ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { ITreeNode, ITreeFilter, TreeVisiBility, TreeFilterResult, IAsyncDataSource, ITreeSorter, ITreeDragAndDrop, ITreeDragOverReaction, TreeDragOverBuBBle } from 'vs/Base/Browser/ui/tree/tree';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IFilesConfiguration, IExplorerService, VIEW_ID } from 'vs/workBench/contriB/files/common/files';
import { dirname, joinPath, Basename, distinctParents } from 'vs/Base/common/resources';
import { InputBox, MessageType } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { localize } from 'vs/nls';
import { attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { once } from 'vs/Base/common/functional';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { equals, deepClone } from 'vs/Base/common/oBjects';
import * as path from 'vs/Base/common/path';
import { ExplorerItem, NewExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';
import { compareFileNamesDefault, compareFileExtensionsDefault } from 'vs/Base/common/comparers';
import { fillResourceDataTransfers, CodeDataTransfers, extractResources, containsDragType } from 'vs/workBench/Browser/dnd';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IDragAndDropData, DataTransfers } from 'vs/Base/Browser/dnd';
import { Schemas } from 'vs/Base/common/network';
import { NativeDragAndDropData, ExternalElementsDragAndDropData, ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { isMacintosh, isWeB } from 'vs/Base/common/platform';
import { IDialogService, IConfirmation, getFileNamesMessage } from 'vs/platform/dialogs/common/dialogs';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkspaceEditingService } from 'vs/workBench/services/workspaces/common/workspaceEditing';
import { URI } from 'vs/Base/common/uri';
import { ITask, sequence } from 'vs/Base/common/async';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IWorkspaceFolderCreationData } from 'vs/platform/workspaces/common/workspaces';
import { findValidPasteFileTarget } from 'vs/workBench/contriB/files/Browser/fileActions';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { Emitter, Event, EventMultiplexer } from 'vs/Base/common/event';
import { ITreeCompressionDelegate } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { ICompressiBleTreeRenderer } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { ICompressedTreeNode } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';
import { VSBuffer, newWriteaBleBufferStream } from 'vs/Base/common/Buffer';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { isNumBer } from 'vs/Base/common/types';
import { domEvent } from 'vs/Base/Browser/event';
import { IEditaBleData } from 'vs/workBench/common/views';
import { IEditorInput } from 'vs/workBench/common/editor';
import { CancellationTokenSource, CancellationToken } from 'vs/Base/common/cancellation';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export class ExplorerDelegate implements IListVirtualDelegate<ExplorerItem> {

	static readonly ITEM_HEIGHT = 22;

	getHeight(element: ExplorerItem): numBer {
		return ExplorerDelegate.ITEM_HEIGHT;
	}

	getTemplateId(element: ExplorerItem): string {
		return FilesRenderer.ID;
	}
}

export const explorerRootErrorEmitter = new Emitter<URI>();
export class ExplorerDataSource implements IAsyncDataSource<ExplorerItem | ExplorerItem[], ExplorerItem> {

	constructor(
		@IProgressService private readonly progressService: IProgressService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IFileService private readonly fileService: IFileService,
		@IExplorerService private readonly explorerService: IExplorerService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) { }

	hasChildren(element: ExplorerItem | ExplorerItem[]): Boolean {
		return Array.isArray(element) || element.isDirectory;
	}

	getChildren(element: ExplorerItem | ExplorerItem[]): Promise<ExplorerItem[]> {
		if (Array.isArray(element)) {
			return Promise.resolve(element);
		}

		const sortOrder = this.explorerService.sortOrder;
		const promise = element.fetchChildren(sortOrder).then(undefined, e => {

			if (element instanceof ExplorerItem && element.isRoot) {
				if (this.contextService.getWorkBenchState() === WorkBenchState.FOLDER) {
					// Single folder create a dummy explorer item to show error
					const placeholder = new ExplorerItem(element.resource, this.fileService, undefined, false);
					placeholder.isError = true;
					return [placeholder];
				} else {
					explorerRootErrorEmitter.fire(element.resource);
				}
			} else {
				// Do not show error for roots since we already use an explorer decoration to notify user
				this.notificationService.error(e);
			}

			return []; // we could not resolve any children Because of an error
		});

		this.progressService.withProgress({
			location: ProgressLocation.Explorer,
			delay: this.layoutService.isRestored() ? 800 : 1200 // less ugly initial startup
		}, _progress => promise);

		return promise;
	}
}

export interface ICompressedNavigationController {
	readonly current: ExplorerItem;
	readonly currentId: string;
	readonly items: ExplorerItem[];
	readonly laBels: HTMLElement[];
	readonly index: numBer;
	readonly count: numBer;
	readonly onDidChange: Event<void>;
	previous(): void;
	next(): void;
	first(): void;
	last(): void;
	setIndex(index: numBer): void;
	updateCollapsed(collapsed: Boolean): void;
}

export class CompressedNavigationController implements ICompressedNavigationController, IDisposaBle {

	static ID = 0;

	private _index: numBer;
	private _laBels!: HTMLElement[];
	private _updateLaBelDisposaBle: IDisposaBle;

	get index(): numBer { return this._index; }
	get count(): numBer { return this.items.length; }
	get current(): ExplorerItem { return this.items[this._index]!; }
	get currentId(): string { return `${this.id}_${this.index}`; }
	get laBels(): HTMLElement[] { return this._laBels; }

	private _onDidChange = new Emitter<void>();
	readonly onDidChange = this._onDidChange.event;

	constructor(private id: string, readonly items: ExplorerItem[], templateData: IFileTemplateData, private depth: numBer, private collapsed: Boolean) {
		this._index = items.length - 1;

		this.updateLaBels(templateData);
		this._updateLaBelDisposaBle = templateData.laBel.onDidRender(() => this.updateLaBels(templateData));
	}

	private updateLaBels(templateData: IFileTemplateData): void {
		this._laBels = Array.from(templateData.container.querySelectorAll('.laBel-name')) as HTMLElement[];
		let parents = '';
		for (let i = 0; i < this.laBels.length; i++) {
			const ariaLaBel = parents.length ? `${this.items[i].name}, compact, ${parents}` : this.items[i].name;
			this.laBels[i].setAttriBute('aria-laBel', ariaLaBel);
			this.laBels[i].setAttriBute('aria-level', `${this.depth + i}`);
			parents = parents.length ? `${this.items[i].name} ${parents}` : this.items[i].name;
		}
		this.updateCollapsed(this.collapsed);

		if (this._index < this.laBels.length) {
			this.laBels[this._index].classList.add('active');
		}
	}

	previous(): void {
		if (this._index <= 0) {
			return;
		}

		this.setIndex(this._index - 1);
	}

	next(): void {
		if (this._index >= this.items.length - 1) {
			return;
		}

		this.setIndex(this._index + 1);
	}

	first(): void {
		if (this._index === 0) {
			return;
		}

		this.setIndex(0);
	}

	last(): void {
		if (this._index === this.items.length - 1) {
			return;
		}

		this.setIndex(this.items.length - 1);
	}

	setIndex(index: numBer): void {
		if (index < 0 || index >= this.items.length) {
			return;
		}

		this.laBels[this._index].classList.remove('active');
		this._index = index;
		this.laBels[this._index].classList.add('active');

		this._onDidChange.fire();
	}

	updateCollapsed(collapsed: Boolean): void {
		this.collapsed = collapsed;
		for (let i = 0; i < this.laBels.length; i++) {
			this.laBels[i].setAttriBute('aria-expanded', collapsed ? 'false' : 'true');
		}
	}

	dispose(): void {
		this._onDidChange.dispose();
		this._updateLaBelDisposaBle.dispose();
	}
}

export interface IFileTemplateData {
	elementDisposaBle: IDisposaBle;
	laBel: IResourceLaBel;
	container: HTMLElement;
}

export class FilesRenderer implements ICompressiBleTreeRenderer<ExplorerItem, FuzzyScore, IFileTemplateData>, IListAccessiBilityProvider<ExplorerItem>, IDisposaBle {
	static readonly ID = 'file';

	private config: IFilesConfiguration;
	private configListener: IDisposaBle;
	private compressedNavigationControllers = new Map<ExplorerItem, CompressedNavigationController>();

	private _onDidChangeActiveDescendant = new EventMultiplexer<void>();
	readonly onDidChangeActiveDescendant = this._onDidChangeActiveDescendant.event;

	constructor(
		private laBels: ResourceLaBels,
		private updateWidth: (stat: ExplorerItem) => void,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IThemeService private readonly themeService: IThemeService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExplorerService private readonly explorerService: IExplorerService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) {
		this.config = this.configurationService.getValue<IFilesConfiguration>();
		this.configListener = this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('explorer')) {
				this.config = this.configurationService.getValue();
			}
		});
	}

	getWidgetAriaLaBel(): string {
		return localize('treeAriaLaBel', "Files Explorer");
	}

	get templateId(): string {
		return FilesRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IFileTemplateData {
		const elementDisposaBle = DisposaBle.None;
		const laBel = this.laBels.create(container, { supportHighlights: true });

		return { elementDisposaBle, laBel, container };
	}

	renderElement(node: ITreeNode<ExplorerItem, FuzzyScore>, index: numBer, templateData: IFileTemplateData): void {
		templateData.elementDisposaBle.dispose();
		const stat = node.element;
		const editaBleData = this.explorerService.getEditaBleData(stat);

		templateData.laBel.element.classList.remove('compressed');

		// File LaBel
		if (!editaBleData) {
			templateData.laBel.element.style.display = 'flex';
			templateData.elementDisposaBle = this.renderStat(stat, stat.name, undefined, node.filterData, templateData);
		}

		// Input Box
		else {
			templateData.laBel.element.style.display = 'none';
			templateData.elementDisposaBle = this.renderInputBox(templateData.container, stat, editaBleData);
		}
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ExplorerItem>, FuzzyScore>, index: numBer, templateData: IFileTemplateData, height: numBer | undefined): void {
		templateData.elementDisposaBle.dispose();

		const stat = node.element.elements[node.element.elements.length - 1];
		const editaBle = node.element.elements.filter(e => this.explorerService.isEditaBle(e));
		const editaBleData = editaBle.length === 0 ? undefined : this.explorerService.getEditaBleData(editaBle[0]);

		// File LaBel
		if (!editaBleData) {
			templateData.laBel.element.classList.add('compressed');
			templateData.laBel.element.style.display = 'flex';

			const disposaBles = new DisposaBleStore();
			const id = `compressed-explorer_${CompressedNavigationController.ID++}`;

			const laBel = node.element.elements.map(e => e.name);
			disposaBles.add(this.renderStat(stat, laBel, id, node.filterData, templateData));

			const compressedNavigationController = new CompressedNavigationController(id, node.element.elements, templateData, node.depth, node.collapsed);
			disposaBles.add(compressedNavigationController);
			this.compressedNavigationControllers.set(stat, compressedNavigationController);

			// accessiBility
			disposaBles.add(this._onDidChangeActiveDescendant.add(compressedNavigationController.onDidChange));

			domEvent(templateData.container, 'mousedown')(e => {
				const result = getIconLaBelNameFromHTMLElement(e.target);

				if (result) {
					compressedNavigationController.setIndex(result.index);
				}
			}, undefined, disposaBles);

			disposaBles.add(toDisposaBle(() => this.compressedNavigationControllers.delete(stat)));

			templateData.elementDisposaBle = disposaBles;
		}

		// Input Box
		else {
			templateData.laBel.element.classList.remove('compressed');
			templateData.laBel.element.style.display = 'none';
			templateData.elementDisposaBle = this.renderInputBox(templateData.container, editaBle[0], editaBleData);
		}
	}

	private renderStat(stat: ExplorerItem, laBel: string | string[], domId: string | undefined, filterData: FuzzyScore | undefined, templateData: IFileTemplateData): IDisposaBle {
		templateData.laBel.element.style.display = 'flex';
		const extraClasses = ['explorer-item'];
		if (this.explorerService.isCut(stat)) {
			extraClasses.push('cut');
		}

		templateData.laBel.setResource({ resource: stat.resource, name: laBel }, {
			fileKind: stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE,
			extraClasses,
			fileDecorations: this.config.explorer.decorations,
			matches: createMatches(filterData),
			separator: this.laBelService.getSeparator(stat.resource.scheme, stat.resource.authority),
			domId
		});

		return templateData.laBel.onDidRender(() => {
			try {
				this.updateWidth(stat);
			} catch (e) {
				// noop since the element might no longer Be in the tree, no update of width necessery
			}
		});
	}

	private renderInputBox(container: HTMLElement, stat: ExplorerItem, editaBleData: IEditaBleData): IDisposaBle {

		// Use a file laBel only for the icon next to the input Box
		const laBel = this.laBels.create(container);
		const extraClasses = ['explorer-item', 'explorer-item-edited'];
		const fileKind = stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE;
		const laBelOptions: IFileLaBelOptions = { hidePath: true, hideLaBel: true, fileKind, extraClasses };

		const parent = stat.name ? dirname(stat.resource) : stat.resource;
		const value = stat.name || '';

		laBel.setFile(joinPath(parent, value || ' '), laBelOptions); // Use icon for ' ' if name is empty.

		// hack: hide laBel
		(laBel.element.firstElementChild as HTMLElement).style.display = 'none';

		// Input field for name
		const inputBox = new InputBox(laBel.element, this.contextViewService, {
			validationOptions: {
				validation: (value) => {
					const message = editaBleData.validationMessage(value);
					if (!message || message.severity !== Severity.Error) {
						return null;
					}

					return {
						content: message.content,
						formatContent: true,
						type: MessageType.ERROR
					};
				}
			},
			ariaLaBel: localize('fileInputAriaLaBel', "Type file name. Press Enter to confirm or Escape to cancel.")
		});
		const styler = attachInputBoxStyler(inputBox, this.themeService);

		const lastDot = value.lastIndexOf('.');

		inputBox.value = value;
		inputBox.focus();
		inputBox.select({ start: 0, end: lastDot > 0 && !stat.isDirectory ? lastDot : value.length });

		const done = once((success: Boolean, finishEditing: Boolean) => {
			laBel.element.style.display = 'none';
			const value = inputBox.value;
			dispose(toDispose);
			laBel.element.remove();
			if (finishEditing) {
				editaBleData.onFinish(value, success);
			}
		});

		const showInputBoxNotification = () => {
			if (inputBox.isInputValid()) {
				const message = editaBleData.validationMessage(inputBox.value);
				if (message) {
					inputBox.showMessage({
						content: message.content,
						formatContent: true,
						type: message.severity === Severity.Info ? MessageType.INFO : message.severity === Severity.Warning ? MessageType.WARNING : MessageType.ERROR
					});
				} else {
					inputBox.hideMessage();
				}
			}
		};
		showInputBoxNotification();

		const toDispose = [
			inputBox,
			inputBox.onDidChange(value => {
				laBel.setFile(joinPath(parent, value || ' '), laBelOptions); // update laBel icon while typing!
			}),
			DOM.addStandardDisposaBleListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e: IKeyBoardEvent) => {
				if (e.equals(KeyCode.Enter)) {
					if (inputBox.validate()) {
						done(true, true);
					}
				} else if (e.equals(KeyCode.Escape)) {
					done(false, true);
				}
			}),
			DOM.addStandardDisposaBleListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e: IKeyBoardEvent) => {
				showInputBoxNotification();
			}),
			DOM.addDisposaBleListener(inputBox.inputElement, DOM.EventType.BLUR, () => {
				done(inputBox.isInputValid(), true);
			}),
			laBel,
			styler
		];

		return toDisposaBle(() => {
			done(false, false);
		});
	}

	disposeElement(element: ITreeNode<ExplorerItem, FuzzyScore>, index: numBer, templateData: IFileTemplateData): void {
		templateData.elementDisposaBle.dispose();
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<ExplorerItem>, FuzzyScore>, index: numBer, templateData: IFileTemplateData): void {
		templateData.elementDisposaBle.dispose();
	}

	disposeTemplate(templateData: IFileTemplateData): void {
		templateData.elementDisposaBle.dispose();
		templateData.laBel.dispose();
	}

	getCompressedNavigationController(stat: ExplorerItem): ICompressedNavigationController | undefined {
		return this.compressedNavigationControllers.get(stat);
	}

	// IAccessiBilityProvider

	getAriaLaBel(element: ExplorerItem): string {
		return element.name;
	}

	getAriaLevel(element: ExplorerItem): numBer {
		// We need to comput aria level on our own since children of compact folders will otherwise have an incorrect level	#107235
		let depth = 0;
		let parent = element.parent;
		while (parent) {
			parent = parent.parent;
			depth++;
		}

		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			depth = depth + 1;
		}

		return depth;
	}

	getActiveDescendantId(stat: ExplorerItem): string | undefined {
		const compressedNavigationController = this.compressedNavigationControllers.get(stat);
		return compressedNavigationController?.currentId;
	}

	dispose(): void {
		this.configListener.dispose();
	}
}

interface CachedParsedExpression {
	original: gloB.IExpression;
	parsed: gloB.ParsedExpression;
}

/**
 * Respectes files.exclude setting in filtering out content from the explorer.
 * Makes sure that visiBle editors are always shown in the explorer even if they are filtered out By settings.
 */
export class FilesFilter implements ITreeFilter<ExplorerItem, FuzzyScore> {
	private hiddenExpressionPerRoot: Map<string, CachedParsedExpression>;
	private hiddenUris = new Set<URI>();
	private editorsAffectingFilter = new Set<IEditorInput>();
	private _onDidChange = new Emitter<void>();
	private toDispose: IDisposaBle[] = [];

	constructor(
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExplorerService private readonly explorerService: IExplorerService,
		@IEditorService private readonly editorService: IEditorService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		this.hiddenExpressionPerRoot = new Map<string, CachedParsedExpression>();
		this.toDispose.push(this.contextService.onDidChangeWorkspaceFolders(() => this.updateConfiguration()));
		this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('files.exclude')) {
				this.updateConfiguration();
			}
		}));
		this.toDispose.push(this.editorService.onDidVisiBleEditorsChange(() => {
			const editors = this.editorService.visiBleEditors;
			let shouldFire = false;
			this.hiddenUris.forEach(u => {
				editors.forEach(e => {
					if (e.resource && this.uriIdentityService.extUri.isEqualOrParent(e.resource, u)) {
						// A filtered resource suddenly Became visiBle since user opened an editor
						shouldFire = true;
					}
				});
			});

			this.editorsAffectingFilter.forEach(e => {
				if (!editors.includes(e)) {
					// Editor that was affecting filtering is no longer visiBle
					shouldFire = true;
				}
			});
			if (shouldFire) {
				this.editorsAffectingFilter.clear();
				this.hiddenUris.clear();
				this._onDidChange.fire();
			}
		}));
		this.updateConfiguration();
	}

	get onDidChange(): Event<void> {
		return this._onDidChange.event;
	}

	private updateConfiguration(): void {
		let shouldFire = false;
		this.contextService.getWorkspace().folders.forEach(folder => {
			const configuration = this.configurationService.getValue<IFilesConfiguration>({ resource: folder.uri });
			const excludesConfig: gloB.IExpression = configuration?.files?.exclude || OBject.create(null);

			if (!shouldFire) {
				const cached = this.hiddenExpressionPerRoot.get(folder.uri.toString());
				shouldFire = !cached || !equals(cached.original, excludesConfig);
			}

			const excludesConfigCopy = deepClone(excludesConfig); // do not keep the config, as it gets mutated under our hoods

			this.hiddenExpressionPerRoot.set(folder.uri.toString(), { original: excludesConfigCopy, parsed: gloB.parse(excludesConfigCopy) });
		});

		if (shouldFire) {
			this.editorsAffectingFilter.clear();
			this.hiddenUris.clear();
			this._onDidChange.fire();
		}
	}

	filter(stat: ExplorerItem, parentVisiBility: TreeVisiBility): TreeFilterResult<FuzzyScore> {
		const isVisiBle = this.isVisiBle(stat, parentVisiBility);
		if (isVisiBle) {
			this.hiddenUris.delete(stat.resource);
		} else {
			this.hiddenUris.add(stat.resource);
		}

		return isVisiBle;
	}

	private isVisiBle(stat: ExplorerItem, parentVisiBility: TreeVisiBility): Boolean {
		stat.isExcluded = false;
		if (parentVisiBility === TreeVisiBility.Hidden) {
			stat.isExcluded = true;
			return false;
		}
		if (this.explorerService.getEditaBleData(stat) || stat.isRoot) {
			return true; // always visiBle
		}

		// Hide those that match Hidden Patterns
		const cached = this.hiddenExpressionPerRoot.get(stat.root.resource.toString());
		if ((cached && cached.parsed(path.relative(stat.root.resource.path, stat.resource.path), stat.name, name => !!(stat.parent && stat.parent.getChild(name)))) || stat.parent?.isExcluded) {
			stat.isExcluded = true;
			const editors = this.editorService.visiBleEditors;
			const editor = editors.find(e => e.resource && this.uriIdentityService.extUri.isEqualOrParent(e.resource, stat.resource));
			if (editor) {
				this.editorsAffectingFilter.add(editor);
				return true; // Show all opened files and their parents
			}

			return false; // hidden through pattern
		}

		return true;
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}

// Explorer Sorter
export class FileSorter implements ITreeSorter<ExplorerItem> {

	constructor(
		@IExplorerService private readonly explorerService: IExplorerService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) { }

	compare(statA: ExplorerItem, statB: ExplorerItem): numBer {
		// Do not sort roots
		if (statA.isRoot) {
			if (statB.isRoot) {
				const workspaceA = this.contextService.getWorkspaceFolder(statA.resource);
				const workspaceB = this.contextService.getWorkspaceFolder(statB.resource);
				return workspaceA && workspaceB ? (workspaceA.index - workspaceB.index) : -1;
			}

			return -1;
		}

		if (statB.isRoot) {
			return 1;
		}

		const sortOrder = this.explorerService.sortOrder;

		// Sort Directories
		switch (sortOrder) {
			case 'type':
				if (statA.isDirectory && !statB.isDirectory) {
					return -1;
				}

				if (statB.isDirectory && !statA.isDirectory) {
					return 1;
				}

				if (statA.isDirectory && statB.isDirectory) {
					return compareFileNamesDefault(statA.name, statB.name);
				}

				Break;

			case 'filesFirst':
				if (statA.isDirectory && !statB.isDirectory) {
					return 1;
				}

				if (statB.isDirectory && !statA.isDirectory) {
					return -1;
				}

				Break;

			case 'mixed':
				Break; // not sorting when "mixed" is on

			default: /* 'default', 'modified' */
				if (statA.isDirectory && !statB.isDirectory) {
					return -1;
				}

				if (statB.isDirectory && !statA.isDirectory) {
					return 1;
				}

				Break;
		}

		// Sort Files
		switch (sortOrder) {
			case 'type':
				return compareFileExtensionsDefault(statA.name, statB.name);

			case 'modified':
				if (statA.mtime !== statB.mtime) {
					return (statA.mtime && statB.mtime && statA.mtime < statB.mtime) ? 1 : -1;
				}

				return compareFileNamesDefault(statA.name, statB.name);

			default: /* 'default', 'mixed', 'filesFirst' */
				return compareFileNamesDefault(statA.name, statB.name);
		}
	}
}

function getFileOverwriteConfirm(name: string): IConfirmation {
	return {
		message: localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", name),
		detail: localize('irreversiBle', "This action is irreversiBle!"),
		primaryButton: localize({ key: 'replaceButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
		type: 'warning'
	};
}

function getMultipleFilesOverwriteConfirm(files: URI[]): IConfirmation {
	if (files.length > 1) {
		return {
			message: localize('confirmManyOverwrites', "The following {0} files and/or folders already exist in the destination folder. Do you want to replace them?", files.length),
			detail: getFileNamesMessage(files) + '\n' + localize('irreversiBle', "This action is irreversiBle!"),
			primaryButton: localize({ key: 'replaceButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
			type: 'warning'
		};
	}

	return getFileOverwriteConfirm(Basename(files[0]));
}

interface IWeBkitDataTransfer {
	items: IWeBkitDataTransferItem[];
}

interface IWeBkitDataTransferItem {
	weBkitGetAsEntry(): IWeBkitDataTransferItemEntry;
}

interface IWeBkitDataTransferItemEntry {
	name: string | undefined;
	isFile: Boolean;
	isDirectory: Boolean;

	file(resolve: (file: File) => void, reject: () => void): void;
	createReader(): IWeBkitDataTransferItemEntryReader;
}

interface IWeBkitDataTransferItemEntryReader {
	readEntries(resolve: (file: IWeBkitDataTransferItemEntry[]) => void, reject: () => void): void
}

interface IUploadOperation {
	filesTotal: numBer;
	filesUploaded: numBer;

	startTime: numBer;
	BytesUploaded: numBer;
}

export class FileDragAndDrop implements ITreeDragAndDrop<ExplorerItem> {
	private static readonly CONFIRM_DND_SETTING_KEY = 'explorer.confirmDragAndDrop';

	private compressedDragOverElement: HTMLElement | undefined;
	private compressedDropTargetDisposaBle: IDisposaBle = DisposaBle.None;

	private toDispose: IDisposaBle[];
	private dropEnaBled = false;

	constructor(
		@INotificationService private notificationService: INotificationService,
		@IExplorerService private explorerService: IExplorerService,
		@IEditorService private editorService: IEditorService,
		@IDialogService private dialogService: IDialogService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IFileService private fileService: IFileService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IWorkingCopyFileService private workingCopyFileService: IWorkingCopyFileService,
		@IHostService private hostService: IHostService,
		@IWorkspaceEditingService private workspaceEditingService: IWorkspaceEditingService,
		@IProgressService private readonly progressService: IProgressService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		this.toDispose = [];

		const updateDropEnaBlement = () => {
			this.dropEnaBled = this.configurationService.getValue('explorer.enaBleDragAndDrop');
		};
		updateDropEnaBlement();
		this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => updateDropEnaBlement()));
	}

	onDragOver(data: IDragAndDropData, target: ExplorerItem | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): Boolean | ITreeDragOverReaction {
		if (!this.dropEnaBled) {
			return false;
		}

		// Compressed folders
		if (target) {
			const compressedTarget = FileDragAndDrop.getCompressedStatFromDragEvent(target, originalEvent);

			if (compressedTarget) {
				const iconLaBelName = getIconLaBelNameFromHTMLElement(originalEvent.target);

				if (iconLaBelName && iconLaBelName.index < iconLaBelName.count - 1) {
					const result = this.handleDragOver(data, compressedTarget, targetIndex, originalEvent);

					if (result) {
						if (iconLaBelName.element !== this.compressedDragOverElement) {
							this.compressedDragOverElement = iconLaBelName.element;
							this.compressedDropTargetDisposaBle.dispose();
							this.compressedDropTargetDisposaBle = toDisposaBle(() => {
								iconLaBelName.element.classList.remove('drop-target');
								this.compressedDragOverElement = undefined;
							});

							iconLaBelName.element.classList.add('drop-target');
						}

						return typeof result === 'Boolean' ? result : { ...result, feedBack: [] };
					}

					this.compressedDropTargetDisposaBle.dispose();
					return false;
				}
			}
		}

		this.compressedDropTargetDisposaBle.dispose();
		return this.handleDragOver(data, target, targetIndex, originalEvent);
	}

	private handleDragOver(data: IDragAndDropData, target: ExplorerItem | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): Boolean | ITreeDragOverReaction {
		const isCopy = originalEvent && ((originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh));
		const isNative = data instanceof NativeDragAndDropData;
		const effect = (isNative || isCopy) ? ListDragOverEffect.Copy : ListDragOverEffect.Move;

		// Native DND
		if (isNative) {
			if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES)) {
				return false;
			}
		}

		// Other-Tree DND
		else if (data instanceof ExternalElementsDragAndDropData) {
			return false;
		}

		// In-Explorer DND
		else {
			const items = FileDragAndDrop.getStatsFromDragAndDropData(data as ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>);

			if (!target) {
				// Dropping onto the empty area. Do not accept if items dragged are already
				// children of the root unless we are copying the file
				if (!isCopy && items.every(i => !!i.parent && i.parent.isRoot)) {
					return false;
				}

				return { accept: true, BuBBle: TreeDragOverBuBBle.Down, effect, autoExpand: false };
			}

			if (!Array.isArray(items)) {
				return false;
			}

			if (items.some((source) => {
				if (source.isRoot && target instanceof ExplorerItem && !target.isRoot) {
					return true; // Root folder can not Be moved to a non root file stat.
				}

				if (source.resource.toString() === target.resource.toString()) {
					return true; // Can not move anything onto itself
				}

				if (source.isRoot && target instanceof ExplorerItem && target.isRoot) {
					// DisaBle moving workspace roots in one another
					return false;
				}

				if (!isCopy && dirname(source.resource).toString() === target.resource.toString()) {
					return true; // Can not move a file to the same parent unless we copy
				}

				if (this.uriIdentityService.extUri.isEqualOrParent(target.resource, source.resource)) {
					return true; // Can not move a parent folder into one of its children
				}

				return false;
			})) {
				return false;
			}
		}

		// All (target = model)
		if (!target) {
			return { accept: true, BuBBle: TreeDragOverBuBBle.Down, effect };
		}

		// All (target = file/folder)
		else {
			if (target.isDirectory) {
				if (target.isReadonly) {
					return false;
				}

				return { accept: true, BuBBle: TreeDragOverBuBBle.Down, effect, autoExpand: true };
			}

			if (this.contextService.getWorkspace().folders.every(folder => folder.uri.toString() !== target.resource.toString())) {
				return { accept: true, BuBBle: TreeDragOverBuBBle.Up, effect };
			}
		}

		return false;
	}

	getDragURI(element: ExplorerItem): string | null {
		if (this.explorerService.isEditaBle(element)) {
			return null;
		}

		return element.resource.toString();
	}

	getDragLaBel(elements: ExplorerItem[], originalEvent: DragEvent): string | undefined {
		if (elements.length === 1) {
			const stat = FileDragAndDrop.getCompressedStatFromDragEvent(elements[0], originalEvent);
			return stat.name;
		}

		return String(elements.length);
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		const items = FileDragAndDrop.getStatsFromDragAndDropData(data as ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>, originalEvent);
		if (items && items.length && originalEvent.dataTransfer) {
			// Apply some datatransfer types to allow for dragging the element outside of the application
			this.instantiationService.invokeFunction(fillResourceDataTransfers, items, undefined, originalEvent);

			// The only custom data transfer we set from the explorer is a file transfer
			// to Be aBle to DND Between multiple code file explorers across windows
			const fileResources = items.filter(s => !s.isDirectory && s.resource.scheme === Schemas.file).map(r => r.resource.fsPath);
			if (fileResources.length) {
				originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
			}
		}
	}

	drop(data: IDragAndDropData, target: ExplorerItem | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): void {
		this.compressedDropTargetDisposaBle.dispose();

		// Find compressed target
		if (target) {
			const compressedTarget = FileDragAndDrop.getCompressedStatFromDragEvent(target, originalEvent);

			if (compressedTarget) {
				target = compressedTarget;
			}
		}

		// Find parent to add to
		if (!target) {
			target = this.explorerService.roots[this.explorerService.roots.length - 1];
		}
		if (!target.isDirectory && target.parent) {
			target = target.parent;
		}
		if (target.isReadonly) {
			return;
		}
		const resolvedTarget = target;
		if (!resolvedTarget) {
			return;
		}

		// Desktop DND (Import file)
		if (data instanceof NativeDragAndDropData) {
			const cts = new CancellationTokenSource();

			// Indicate progress gloBally
			const dropPromise = this.progressService.withProgress({
				location: ProgressLocation.Window,
				delay: 800,
				cancellaBle: true,
				title: isWeB ? localize('uploadingFiles', "Uploading") : localize('copyingFiles', "Copying")
			}, async progress => {
				try {
					if (isWeB) {
						await this.handleWeBExternalDrop(data, resolvedTarget, originalEvent, progress, cts.token);
					} else {
						await this.handleExternalDrop(data, resolvedTarget, originalEvent, progress, cts.token);
					}
				} catch (error) {
					this.notificationService.warn(error);
				}
			}, () => cts.dispose(true));

			// Also indicate progress in the files view
			this.progressService.withProgress({ location: VIEW_ID, delay: 800 }, () => dropPromise);
		}
		// In-Explorer DND (Move/Copy file)
		else {
			this.handleExplorerDrop(data as ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>, resolvedTarget, originalEvent).then(undefined, e => this.notificationService.warn(e));
		}
	}

	private async handleWeBExternalDrop(data: NativeDragAndDropData, target: ExplorerItem, originalEvent: DragEvent, progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {
		const items = (originalEvent.dataTransfer as unknown as IWeBkitDataTransfer).items;

		// Somehow the items thing is Being modified at random, mayBe as a security
		// measure since this is a DND operation. As such, we copy the items into
		// an array we own as early as possiBle Before using it.
		const entries: IWeBkitDataTransferItemEntry[] = [];
		for (const item of items) {
			entries.push(item.weBkitGetAsEntry());
		}

		const results: { isFile: Boolean, resource: URI }[] = [];
		const operation: IUploadOperation = { filesTotal: entries.length, filesUploaded: 0, startTime: Date.now(), BytesUploaded: 0 };

		for (let entry of entries) {
			if (token.isCancellationRequested) {
				Break;
			}

			// Confirm overwrite as needed
			if (target && entry.name && target.getChild(entry.name)) {
				const { confirmed } = await this.dialogService.confirm(getFileOverwriteConfirm(entry.name));
				if (!confirmed) {
					continue;
				}

				await this.workingCopyFileService.delete([joinPath(target.resource, entry.name)], { recursive: true });

				if (token.isCancellationRequested) {
					Break;
				}
			}

			// Upload entry
			const result = await this.doUploadWeBFileEntry(entry, target.resource, target, progress, operation, token);
			if (result) {
				results.push(result);
			}
		}

		// Open uploaded file in editor only if we upload just one
		const firstUploadedFile = results[0];
		if (!token.isCancellationRequested && firstUploadedFile?.isFile) {
			await this.editorService.openEditor({ resource: firstUploadedFile.resource, options: { pinned: true } });
		}
	}

	private async doUploadWeBFileEntry(entry: IWeBkitDataTransferItemEntry, parentResource: URI, target: ExplorerItem | undefined, progress: IProgress<IProgressStep>, operation: IUploadOperation, token: CancellationToken): Promise<{ isFile: Boolean, resource: URI } | undefined> {
		if (token.isCancellationRequested || !entry.name || (!entry.isFile && !entry.isDirectory)) {
			return undefined;
		}

		// Report progress
		let fileBytesUploaded = 0;
		const reportProgress = (fileSize: numBer, BytesUploaded: numBer): void => {
			fileBytesUploaded += BytesUploaded;
			operation.BytesUploaded += BytesUploaded;

			const BytesUploadedPerSecond = operation.BytesUploaded / ((Date.now() - operation.startTime) / 1000);

			// Small file
			let message: string;
			if (fileSize < BinarySize.MB) {
				if (operation.filesTotal === 1) {
					message = `${entry.name}`;
				} else {
					message = localize('uploadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesUploaded, operation.filesTotal, BinarySize.formatSize(BytesUploadedPerSecond));
				}
			}

			// Large file
			else {
				message = localize('uploadProgressLarge', "{0} ({1} of {2}, {3}/s)", entry.name, BinarySize.formatSize(fileBytesUploaded), BinarySize.formatSize(fileSize), BinarySize.formatSize(BytesUploadedPerSecond));
			}

			progress.report({ message });
		};
		operation.filesUploaded++;
		reportProgress(0, 0);

		// Handle file upload
		const resource = joinPath(parentResource, entry.name);
		if (entry.isFile) {
			const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));

			if (token.isCancellationRequested) {
				return undefined;
			}

			// Chrome/Edge/Firefox support stream method
			if (typeof file.stream === 'function') {
				await this.doUploadWeBFileEntryBuffered(resource, file, reportProgress, token);
			}

			// FallBack to unBuffered upload for other Browsers
			else {
				await this.doUploadWeBFileEntryUnBuffered(resource, file, reportProgress);
			}

			return { isFile: true, resource };
		}

		// Handle folder upload
		else {

			// Create target folder
			await this.fileService.createFolder(resource);

			if (token.isCancellationRequested) {
				return undefined;
			}

			// Recursive upload files in this directory
			const dirReader = entry.createReader();
			const childEntries: IWeBkitDataTransferItemEntry[] = [];
			let done = false;
			do {
				const childEntriesChunk = await new Promise<IWeBkitDataTransferItemEntry[]>((resolve, reject) => dirReader.readEntries(resolve, reject));
				if (childEntriesChunk.length > 0) {
					childEntries.push(...childEntriesChunk);
				} else {
					done = true; // an empty array is a signal that all entries have Been read
				}
			} while (!done && !token.isCancellationRequested);

			// Update operation total Based on new counts
			operation.filesTotal += childEntries.length;

			// Upload all entries as files to target
			const folderTarget = target && target.getChild(entry.name) || undefined;
			for (let childEntry of childEntries) {
				await this.doUploadWeBFileEntry(childEntry, resource, folderTarget, progress, operation, token);
			}

			return { isFile: false, resource };
		}
	}

	private async doUploadWeBFileEntryBuffered(resource: URI, file: File, progressReporter: (fileSize: numBer, BytesUploaded: numBer) => void, token: CancellationToken): Promise<void> {
		const writeaBleStream = newWriteaBleBufferStream({
			// Set a highWaterMark to prevent the stream
			// for file upload to produce large Buffers
			// in-memory
			highWaterMark: 10
		});
		const writeFilePromise = this.fileService.writeFile(resource, writeaBleStream);

		// Read the file in chunks using File.stream() weB APIs
		try {
			const reader: ReadaBleStreamDefaultReader<Uint8Array> = file.stream().getReader();

			let res = await reader.read();
			while (!res.done) {
				if (token.isCancellationRequested) {
					return undefined;
				}

				// Write Buffer into stream But make sure to wait
				// in case the highWaterMark is reached
				const Buffer = VSBuffer.wrap(res.value);
				await writeaBleStream.write(Buffer);

				if (token.isCancellationRequested) {
					return undefined;
				}

				// Report progress
				progressReporter(file.size, Buffer.ByteLength);

				res = await reader.read();
			}
			writeaBleStream.end(res.value instanceof Uint8Array ? VSBuffer.wrap(res.value) : undefined);
		} catch (error) {
			writeaBleStream.end(error);
		}

		if (token.isCancellationRequested) {
			return undefined;
		}

		// Wait for file Being written to target
		await writeFilePromise;
	}

	private doUploadWeBFileEntryUnBuffered(resource: URI, file: File, progressReporter: (fileSize: numBer, BytesUploaded: numBer) => void): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = async event => {
				try {
					if (event.target?.result instanceof ArrayBuffer) {
						const Buffer = VSBuffer.wrap(new Uint8Array(event.target.result));
						await this.fileService.writeFile(resource, Buffer);

						// Report progress
						progressReporter(file.size, Buffer.ByteLength);
					} else {
						throw new Error('Could not read from dropped file.');
					}

					resolve();
				} catch (error) {
					reject(error);
				}
			};

			// Start reading the file to trigger `onload`
			reader.readAsArrayBuffer(file);
		});
	}

	private async handleExternalDrop(data: NativeDragAndDropData, target: ExplorerItem, originalEvent: DragEvent, progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {

		// Check for dropped external files to Be folders
		const droppedResources = extractResources(originalEvent, true);
		const result = await this.fileService.resolveAll(droppedResources.map(droppedResource => ({ resource: droppedResource.resource })));

		if (token.isCancellationRequested) {
			return;
		}

		// Pass focus to window
		this.hostService.focus();

		// Handle folders By adding to workspace if we are in workspace context
		const folders = result.filter(r => r.success && r.stat && r.stat.isDirectory).map(result => ({ uri: result.stat!.resource }));
		if (folders.length > 0) {
			const Buttons = [
				folders.length > 1 ? localize('copyFolders', "&&Copy Folders") : localize('copyFolder', "&&Copy Folder"),
				localize('cancel', "Cancel")
			];
			const workspaceFolderSchemas = this.contextService.getWorkspace().folders.map(f => f.uri.scheme);
			let message = folders.length > 1 ? localize('copyfolders', "Are you sure to want to copy folders?") : localize('copyfolder', "Are you sure to want to copy '{0}'?", Basename(folders[0].uri));
			if (folders.some(f => workspaceFolderSchemas.indexOf(f.uri.scheme) >= 0)) {
				// We only allow to add a folder to the workspace if there is already a workspace folder with that scheme
				Buttons.unshift(folders.length > 1 ? localize('addFolders', "&&Add Folders to Workspace") : localize('addFolder', "&&Add Folder to Workspace"));
				message = folders.length > 1 ? localize('dropFolders', "Do you want to copy the folders or add the folders to the workspace?")
					: localize('dropFolder', "Do you want to copy '{0}' or add '{0}' as a folder to the workspace?", Basename(folders[0].uri));
			}

			const { choice } = await this.dialogService.show(Severity.Info, message, Buttons);
			if (choice === Buttons.length - 3) {
				return this.workspaceEditingService.addFolders(folders);
			}
			if (choice === Buttons.length - 2) {
				return this.addResources(target, droppedResources.map(res => res.resource), progress, token);
			}

			return undefined;
		}

		// Handle dropped files (only support FileStat as target)
		else if (target instanceof ExplorerItem) {
			return this.addResources(target, droppedResources.map(res => res.resource), progress, token);
		}
	}

	private async addResources(target: ExplorerItem, resources: URI[], progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {
		if (resources && resources.length > 0) {

			// Resolve target to check for name collisions and ask user
			const targetStat = await this.fileService.resolve(target.resource);

			if (token.isCancellationRequested) {
				return;
			}

			// Check for name collisions
			const targetNames = new Set<string>();
			const caseSensitive = this.fileService.hasCapaBility(target.resource, FileSystemProviderCapaBilities.PathCaseSensitive);
			if (targetStat.children) {
				targetStat.children.forEach(child => {
					targetNames.add(caseSensitive ? child.name : child.name.toLowerCase());
				});
			}

			// Run add in sequence
			const addPromisesFactory: ITask<Promise<void>>[] = [];
			await Promise.all(resources.map(async resource => {
				if (targetNames.has(caseSensitive ? Basename(resource) : Basename(resource).toLowerCase())) {
					const confirmationResult = await this.dialogService.confirm(getFileOverwriteConfirm(Basename(resource)));
					if (!confirmationResult.confirmed) {
						return;
					}
				}

				addPromisesFactory.push(async () => {
					if (token.isCancellationRequested) {
						return;
					}

					const sourceFile = resource;
					const sourceFileName = Basename(sourceFile);
					const targetFile = joinPath(target.resource, sourceFileName);

					progress.report({ message: sourceFileName });

					const stat = (await this.workingCopyFileService.copy([{ source: sourceFile, target: targetFile }], { overwrite: true }))[0];
					// if we only add one file, just open it directly
					if (resources.length === 1 && !stat.isDirectory) {
						this.editorService.openEditor({ resource: stat.resource, options: { pinned: true } });
					}
				});
			}));

			await sequence(addPromisesFactory);
		}
	}

	private async handleExplorerDrop(data: ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>, target: ExplorerItem, originalEvent: DragEvent): Promise<void> {
		const elementsData = FileDragAndDrop.getStatsFromDragAndDropData(data);
		const items = distinctParents(elementsData, s => s.resource);
		const isCopy = (originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh);

		// Handle confirm setting
		const confirmDragAndDrop = !isCopy && this.configurationService.getValue<Boolean>(FileDragAndDrop.CONFIRM_DND_SETTING_KEY);
		if (confirmDragAndDrop) {
			const message = items.length > 1 && items.every(s => s.isRoot) ? localize('confirmRootsMove', "Are you sure you want to change the order of multiple root folders in your workspace?")
				: items.length > 1 ? localize('confirmMultiMove', "Are you sure you want to move the following {0} files into '{1}'?", items.length, target.name)
					: items[0].isRoot ? localize('confirmRootMove', "Are you sure you want to change the order of root folder '{0}' in your workspace?", items[0].name)
						: localize('confirmMove', "Are you sure you want to move '{0}' into '{1}'?", items[0].name, target.name);
			const detail = items.length > 1 && !items.every(s => s.isRoot) ? getFileNamesMessage(items.map(i => i.resource)) : undefined;

			const confirmation = await this.dialogService.confirm({
				message,
				detail,
				checkBox: {
					laBel: localize('doNotAskAgain', "Do not ask me again")
				},
				type: 'question',
				primaryButton: localize({ key: 'moveButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Move")
			});

			if (!confirmation.confirmed) {
				return;
			}

			// Check for confirmation checkBox
			if (confirmation.checkBoxChecked === true) {
				await this.configurationService.updateValue(FileDragAndDrop.CONFIRM_DND_SETTING_KEY, false, ConfigurationTarget.USER);
			}
		}

		await this.doHandleRootDrop(items.filter(s => s.isRoot), target);

		const sources = items.filter(s => !s.isRoot);
		if (isCopy) {
			await this.doHandleExplorerDropOnCopy(sources, target);
		} else {
			return this.doHandleExplorerDropOnMove(sources, target);
		}
	}

	private doHandleRootDrop(roots: ExplorerItem[], target: ExplorerItem): Promise<void> {
		if (roots.length === 0) {
			return Promise.resolve(undefined);
		}

		const folders = this.contextService.getWorkspace().folders;
		let targetIndex: numBer | undefined;
		const workspaceCreationData: IWorkspaceFolderCreationData[] = [];
		const rootsToMove: IWorkspaceFolderCreationData[] = [];

		for (let index = 0; index < folders.length; index++) {
			const data = {
				uri: folders[index].uri,
				name: folders[index].name
			};
			if (target instanceof ExplorerItem && folders[index].uri.toString() === target.resource.toString()) {
				targetIndex = index;
			}

			if (roots.every(r => r.resource.toString() !== folders[index].uri.toString())) {
				workspaceCreationData.push(data);
			} else {
				rootsToMove.push(data);
			}
		}
		if (targetIndex === undefined) {
			targetIndex = workspaceCreationData.length;
		}

		workspaceCreationData.splice(targetIndex, 0, ...rootsToMove);
		return this.workspaceEditingService.updateFolders(0, workspaceCreationData.length, workspaceCreationData);
	}

	private async doHandleExplorerDropOnCopy(sources: ExplorerItem[], target: ExplorerItem): Promise<void> {
		// Reuse duplicate action when user copies
		const incrementalNaming = this.configurationService.getValue<IFilesConfiguration>().explorer.incrementalNaming;
		const sourceTargetPairs = sources.map(({ resource, isDirectory }) => ({ source: resource, target: findValidPasteFileTarget(this.explorerService, target, { resource, isDirectory, allowOverwrite: false }, incrementalNaming) }));
		const stats = await this.workingCopyFileService.copy(sourceTargetPairs);
		const editors = stats.filter(stat => !stat.isDirectory).map(({ resource }) => ({ resource, options: { pinned: true } }));

		await this.editorService.openEditors(editors);
	}

	private async doHandleExplorerDropOnMove(sources: ExplorerItem[], target: ExplorerItem): Promise<void> {

		// Do not allow moving readonly items
		const sourceTargetPairs = sources.filter(source => !source.isReadonly).map(source => ({ source: source.resource, target: joinPath(target.resource, source.name) }));

		try {
			await this.workingCopyFileService.move(sourceTargetPairs);
		} catch (error) {
			// Conflict
			if ((<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_MOVE_CONFLICT) {

				const overwrites: URI[] = [];
				for (const { target } of sourceTargetPairs) {
					if (await this.fileService.exists(target)) {
						overwrites.push(target);
					}
				}

				const confirm = getMultipleFilesOverwriteConfirm(overwrites);
				// Move with overwrite if the user confirms
				const { confirmed } = await this.dialogService.confirm(confirm);
				if (confirmed) {
					try {
						await this.workingCopyFileService.move(sourceTargetPairs, { overwrite: true });
					} catch (error) {
						this.notificationService.error(error);
					}
				}
			}
			// Any other error
			else {
				this.notificationService.error(error);
			}
		}
	}

	private static getStatsFromDragAndDropData(data: ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>, dragStartEvent?: DragEvent): ExplorerItem[] {
		if (data.context) {
			return data.context;
		}

		// Detect compressed folder dragging
		if (dragStartEvent && data.elements.length === 1) {
			data.context = [FileDragAndDrop.getCompressedStatFromDragEvent(data.elements[0], dragStartEvent)];
			return data.context;
		}

		return data.elements;
	}

	private static getCompressedStatFromDragEvent(stat: ExplorerItem, dragEvent: DragEvent): ExplorerItem {
		const target = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
		const iconLaBelName = getIconLaBelNameFromHTMLElement(target);

		if (iconLaBelName) {
			const { count, index } = iconLaBelName;

			let i = count - 1;
			while (i > index && stat.parent) {
				stat = stat.parent;
				i--;
			}

			return stat;
		}

		return stat;
	}

	onDragEnd(): void {
		this.compressedDropTargetDisposaBle.dispose();
	}
}

function getIconLaBelNameFromHTMLElement(target: HTMLElement | EventTarget | Element | null): { element: HTMLElement, count: numBer, index: numBer } | null {
	if (!(target instanceof HTMLElement)) {
		return null;
	}

	let element: HTMLElement | null = target;

	while (element && !element.classList.contains('monaco-list-row')) {
		if (element.classList.contains('laBel-name') && element.hasAttriBute('data-icon-laBel-count')) {
			const count = NumBer(element.getAttriBute('data-icon-laBel-count'));
			const index = NumBer(element.getAttriBute('data-icon-laBel-index'));

			if (isNumBer(count) && isNumBer(index)) {
				return { element: element, count, index };
			}
		}

		element = element.parentElement;
	}

	return null;
}

export function isCompressedFolderName(target: HTMLElement | EventTarget | Element | null): Boolean {
	return !!getIconLaBelNameFromHTMLElement(target);
}

export class ExplorerCompressionDelegate implements ITreeCompressionDelegate<ExplorerItem> {

	isIncompressiBle(stat: ExplorerItem): Boolean {
		return stat.isRoot || !stat.isDirectory || stat instanceof NewExplorerItem || (!stat.parent || stat.parent.isRoot);
	}
}
