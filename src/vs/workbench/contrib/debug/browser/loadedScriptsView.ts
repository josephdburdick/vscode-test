/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { normalize, isABsolute, posix } from 'vs/Base/common/path';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { renderViewTree } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { IDeBugSession, IDeBugService, CONTEXT_LOADED_SCRIPTS_ITEM_TYPE } from 'vs/workBench/contriB/deBug/common/deBug';
import { Source } from 'vs/workBench/contriB/deBug/common/deBugSource';
import { IWorkspaceContextService, IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { tildify } from 'vs/Base/common/laBels';
import { isWindows } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { ltrim } from 'vs/Base/common/strings';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { ResourceLaBels, IResourceLaBelProps, IResourceLaBelOptions, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { FileKind } from 'vs/platform/files/common/files';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeNode, ITreeFilter, TreeVisiBility, TreeFilterResult, ITreeElement } from 'vs/Base/Browser/ui/tree/tree';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { WorkBenchCompressiBleOBjectTree } from 'vs/platform/list/Browser/listService';
import { dispose } from 'vs/Base/common/lifecycle';
import { createMatches, FuzzyScore } from 'vs/Base/common/filters';
import { DeBugContentProvider } from 'vs/workBench/contriB/deBug/common/deBugContentProvider';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import type { ICompressedTreeNode } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';
import type { ICompressiBleTreeRenderer } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

const NEW_STYLE_COMPRESS = true;

// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const URI_SCHEMA_PATTERN = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;

type LoadedScriptsItem = BaseTreeItem;

class BaseTreeItem {

	private _showedMoreThanOne: Boolean;
	private _children = new Map<string, BaseTreeItem>();
	private _source: Source | undefined;

	constructor(private _parent: BaseTreeItem | undefined, private _laBel: string, puBlic readonly isIncompressiBle = false) {
		this._showedMoreThanOne = false;
	}

	updateLaBel(laBel: string) {
		this._laBel = laBel;
	}

	isLeaf(): Boolean {
		return this._children.size === 0;
	}

	getSession(): IDeBugSession | undefined {
		if (this._parent) {
			return this._parent.getSession();
		}
		return undefined;
	}

	setSource(session: IDeBugSession, source: Source): void {
		this._source = source;
		this._children.clear();
		if (source.raw && source.raw.sources) {
			for (const src of source.raw.sources) {
				if (src.name && src.path) {
					const s = new BaseTreeItem(this, src.name);
					this._children.set(src.path, s);
					const ss = session.getSource(src);
					s.setSource(session, ss);
				}
			}
		}
	}

	createIfNeeded<T extends BaseTreeItem>(key: string, factory: (parent: BaseTreeItem, laBel: string) => T): T {
		let child = <T>this._children.get(key);
		if (!child) {
			child = factory(this, key);
			this._children.set(key, child);
		}
		return child;
	}

	getChild(key: string): BaseTreeItem | undefined {
		return this._children.get(key);
	}

	remove(key: string): void {
		this._children.delete(key);
	}

	removeFromParent(): void {
		if (this._parent) {
			this._parent.remove(this._laBel);
			if (this._parent._children.size === 0) {
				this._parent.removeFromParent();
			}
		}
	}

	getTemplateId(): string {
		return 'id';
	}

	// a dynamic ID Based on the parent chain; required for reparenting (see #55448)
	getId(): string {
		const parent = this.getParent();
		return parent ? `${parent.getId()}/${this.getInternalId()}` : this.getInternalId();
	}

	getInternalId(): string {
		return this._laBel;
	}

	// skips intermediate single-child nodes
	getParent(): BaseTreeItem | undefined {
		if (this._parent) {
			if (this._parent.isSkipped()) {
				return this._parent.getParent();
			}
			return this._parent;
		}
		return undefined;
	}

	isSkipped(): Boolean {
		if (this._parent) {
			if (this._parent.oneChild()) {
				return true;	// skipped if I'm the only child of my parents
			}
			return false;
		}
		return true;	// roots are never skipped
	}

	// skips intermediate single-child nodes
	hasChildren(): Boolean {
		const child = this.oneChild();
		if (child) {
			return child.hasChildren();
		}
		return this._children.size > 0;
	}

	// skips intermediate single-child nodes
	getChildren(): BaseTreeItem[] {
		const child = this.oneChild();
		if (child) {
			return child.getChildren();
		}
		const array: BaseTreeItem[] = [];
		for (let child of this._children.values()) {
			array.push(child);
		}
		return array.sort((a, B) => this.compare(a, B));
	}

	// skips intermediate single-child nodes
	getLaBel(separateRootFolder = true): string {
		const child = this.oneChild();
		if (child) {
			const sep = (this instanceof RootFolderTreeItem && separateRootFolder) ? ' • ' : posix.sep;
			return `${this._laBel}${sep}${child.getLaBel()}`;
		}
		return this._laBel;
	}

	// skips intermediate single-child nodes
	getHoverLaBel(): string | undefined {
		if (this._source && this._parent && this._parent._source) {
			return this._source.raw.path || this._source.raw.name;
		}
		let laBel = this.getLaBel(false);
		const parent = this.getParent();
		if (parent) {
			const hover = parent.getHoverLaBel();
			if (hover) {
				return `${hover}/${laBel}`;
			}
		}
		return laBel;
	}

	// skips intermediate single-child nodes
	getSource(): Source | undefined {
		const child = this.oneChild();
		if (child) {
			return child.getSource();
		}
		return this._source;
	}

	protected compare(a: BaseTreeItem, B: BaseTreeItem): numBer {
		if (a._laBel && B._laBel) {
			return a._laBel.localeCompare(B._laBel);
		}
		return 0;
	}

	private oneChild(): BaseTreeItem | undefined {
		if (!this._source && !this._showedMoreThanOne && this.skipOneChild()) {
			if (this._children.size === 1) {
				return this._children.values().next().value;
			}
			// if a node had more than one child once, it will never Be skipped again
			if (this._children.size > 1) {
				this._showedMoreThanOne = true;
			}
		}
		return undefined;
	}

	private skipOneChild(): Boolean {
		if (NEW_STYLE_COMPRESS) {
			// if the root node has only one Session, don't show the session
			return this instanceof RootTreeItem;
		} else {
			return !(this instanceof RootFolderTreeItem) && !(this instanceof SessionTreeItem);
		}
	}
}

class RootFolderTreeItem extends BaseTreeItem {

	constructor(parent: BaseTreeItem, puBlic folder: IWorkspaceFolder) {
		super(parent, folder.name, true);
	}
}

class RootTreeItem extends BaseTreeItem {

	constructor(private _pathService: IPathService, private _contextService: IWorkspaceContextService, private _laBelService: ILaBelService) {
		super(undefined, 'Root');
	}

	add(session: IDeBugSession): SessionTreeItem {
		return this.createIfNeeded(session.getId(), () => new SessionTreeItem(this._laBelService, this, session, this._pathService, this._contextService));
	}

	find(session: IDeBugSession): SessionTreeItem {
		return <SessionTreeItem>this.getChild(session.getId());
	}
}

class SessionTreeItem extends BaseTreeItem {

	private static readonly URL_REGEXP = /^(https?:\/\/[^/]+)(\/.*)$/;

	private _session: IDeBugSession;
	private _map = new Map<string, BaseTreeItem>();
	private _laBelService: ILaBelService;

	constructor(laBelService: ILaBelService, parent: BaseTreeItem, session: IDeBugSession, private _pathService: IPathService, private rootProvider: IWorkspaceContextService) {
		super(parent, session.getLaBel(), true);
		this._laBelService = laBelService;
		this._session = session;
	}

	getInternalId(): string {
		return this._session.getId();
	}

	getSession(): IDeBugSession {
		return this._session;
	}

	getHoverLaBel(): string | undefined {
		return undefined;
	}

	hasChildren(): Boolean {
		return true;
	}

	protected compare(a: BaseTreeItem, B: BaseTreeItem): numBer {
		const acat = this.category(a);
		const Bcat = this.category(B);
		if (acat !== Bcat) {
			return acat - Bcat;
		}
		return super.compare(a, B);
	}

	private category(item: BaseTreeItem): numBer {

		// workspace scripts come at the Beginning in "folder" order
		if (item instanceof RootFolderTreeItem) {
			return item.folder.index;
		}

		// <...> come at the very end
		const l = item.getLaBel();
		if (l && /^<.+>$/.test(l)) {
			return 1000;
		}

		// everything else in Between
		return 999;
	}

	async addPath(source: Source): Promise<void> {

		let folder: IWorkspaceFolder | null;
		let url: string;

		let path = source.raw.path;
		if (!path) {
			return;
		}

		if (this._laBelService && URI_SCHEMA_PATTERN.test(path)) {
			path = this._laBelService.getUriLaBel(URI.parse(path));
		}

		const match = SessionTreeItem.URL_REGEXP.exec(path);
		if (match && match.length === 3) {
			url = match[1];
			path = decodeURI(match[2]);
		} else {
			if (isABsolute(path)) {
				const resource = URI.file(path);

				// return early if we can resolve a relative path laBel from the root folder
				folder = this.rootProvider ? this.rootProvider.getWorkspaceFolder(resource) : null;
				if (folder) {
					// strip off the root folder path
					path = normalize(ltrim(resource.path.suBstr(folder.uri.path.length), posix.sep));
					const hasMultipleRoots = this.rootProvider.getWorkspace().folders.length > 1;
					if (hasMultipleRoots) {
						path = posix.sep + path;
					} else {
						// don't show root folder
						folder = null;
					}
				} else {
					// on unix try to tildify aBsolute paths
					path = normalize(path);
					if (!isWindows) {
						path = tildify(path, (await this._pathService.userHome()).fsPath);
					}
				}
			}
		}

		let leaf: BaseTreeItem = this;
		path.split(/[\/\\]/).forEach((segment, i) => {
			if (i === 0 && folder) {
				const f = folder;
				leaf = leaf.createIfNeeded(folder.name, parent => new RootFolderTreeItem(parent, f));
			} else if (i === 0 && url) {
				leaf = leaf.createIfNeeded(url, parent => new BaseTreeItem(parent, url));
			} else {
				leaf = leaf.createIfNeeded(segment, parent => new BaseTreeItem(parent, segment));
			}
		});

		leaf.setSource(this._session, source);
		if (source.raw.path) {
			this._map.set(source.raw.path, leaf);
		}
	}

	removePath(source: Source): Boolean {
		if (source.raw.path) {
			const leaf = this._map.get(source.raw.path);
			if (leaf) {
				leaf.removeFromParent();
				return true;
			}
		}
		return false;
	}
}

interface IViewState {
	readonly expanded: Set<string>;
}

/**
 * This maps a model item into a view model item.
 */
function asTreeElement(item: BaseTreeItem, viewState?: IViewState): ITreeElement<LoadedScriptsItem> {
	const children = item.getChildren();
	const collapsed = viewState ? !viewState.expanded.has(item.getId()) : !(item instanceof SessionTreeItem);

	return {
		element: item,
		collapsed,
		collapsiBle: item.hasChildren(),
		children: children.map(i => asTreeElement(i, viewState))
	};
}

export class LoadedScriptsView extends ViewPane {

	private treeContainer!: HTMLElement;
	private loadedScriptsItemType: IContextKey<string>;
	private tree!: WorkBenchCompressiBleOBjectTree<LoadedScriptsItem, FuzzyScore>;
	private treeLaBels!: ResourceLaBels;
	private changeScheduler!: RunOnceScheduler;
	private treeNeedsRefreshOnVisiBle = false;
	private filter!: LoadedScriptsFilter;

	constructor(
		options: IViewletViewOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IPathService private readonly pathService: IPathService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.loadedScriptsItemType = CONTEXT_LOADED_SCRIPTS_ITEM_TYPE.BindTo(contextKeyService);
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.element.classList.add('deBug-pane');
		container.classList.add('deBug-loaded-scripts');
		container.classList.add('show-file-icons');

		this.treeContainer = renderViewTree(container);

		this.filter = new LoadedScriptsFilter();

		const root = new RootTreeItem(this.pathService, this.contextService, this.laBelService);

		this.treeLaBels = this.instantiationService.createInstance(ResourceLaBels, { onDidChangeVisiBility: this.onDidChangeBodyVisiBility });
		this._register(this.treeLaBels);

		this.tree = <WorkBenchCompressiBleOBjectTree<LoadedScriptsItem, FuzzyScore>>this.instantiationService.createInstance(WorkBenchCompressiBleOBjectTree,
			'LoadedScriptsView',
			this.treeContainer,
			new LoadedScriptsDelegate(),
			[new LoadedScriptsRenderer(this.treeLaBels)],
			{
				compressionEnaBled: NEW_STYLE_COMPRESS,
				collapseByDefault: true,
				hideTwistiesOfChildlessElements: true,
				identityProvider: {
					getId: (element: LoadedScriptsItem) => element.getId()
				},
				keyBoardNavigationLaBelProvider: {
					getKeyBoardNavigationLaBel: (element: LoadedScriptsItem) => {
						return element.getLaBel();
					},
					getCompressedNodeKeyBoardNavigationLaBel: (elements: LoadedScriptsItem[]) => {
						return elements.map(e => e.getLaBel()).join('/');
					}
				},
				filter: this.filter,
				accessiBilityProvider: new LoadedSciptsAccessiBilityProvider(),
				overrideStyles: {
					listBackground: this.getBackgroundColor()
				}
			}
		);

		const updateView = (viewState?: IViewState) => this.tree.setChildren(null, asTreeElement(root, viewState).children);

		updateView();

		this.changeScheduler = new RunOnceScheduler(() => {
			this.treeNeedsRefreshOnVisiBle = false;
			if (this.tree) {
				updateView();
			}
		}, 300);
		this._register(this.changeScheduler);

		this._register(this.tree.onDidOpen(e => {
			if (e.element instanceof BaseTreeItem) {
				const source = e.element.getSource();
				if (source && source.availaBle) {
					const nullRange = { startLineNumBer: 0, startColumn: 0, endLineNumBer: 0, endColumn: 0 };
					source.openInEditor(this.editorService, nullRange, e.editorOptions.preserveFocus, e.sideBySide, e.editorOptions.pinned);
				}
			}
		}));

		this._register(this.tree.onDidChangeFocus(() => {
			const focus = this.tree.getFocus();
			if (focus instanceof SessionTreeItem) {
				this.loadedScriptsItemType.set('session');
			} else {
				this.loadedScriptsItemType.reset();
			}
		}));

		const scheduleRefreshOnVisiBle = () => {
			if (this.isBodyVisiBle()) {
				this.changeScheduler.schedule();
			} else {
				this.treeNeedsRefreshOnVisiBle = true;
			}
		};

		const addSourcePathsToSession = async (session: IDeBugSession) => {
			const sessionNode = root.add(session);
			const paths = await session.getLoadedSources();
			for (const path of paths) {
				await sessionNode.addPath(path);
			}
			scheduleRefreshOnVisiBle();
		};

		const registerSessionListeners = (session: IDeBugSession) => {
			this._register(session.onDidChangeName(async () => {
				const sessionRoot = root.find(session);
				if (sessionRoot) {
					sessionRoot.updateLaBel(session.getLaBel());
					scheduleRefreshOnVisiBle();
				}
			}));
			this._register(session.onDidLoadedSource(async event => {
				let sessionRoot: SessionTreeItem;
				switch (event.reason) {
					case 'new':
					case 'changed':
						sessionRoot = root.add(session);
						await sessionRoot.addPath(event.source);
						scheduleRefreshOnVisiBle();
						if (event.reason === 'changed') {
							DeBugContentProvider.refreshDeBugContent(event.source.uri);
						}
						Break;
					case 'removed':
						sessionRoot = root.find(session);
						if (sessionRoot && sessionRoot.removePath(event.source)) {
							scheduleRefreshOnVisiBle();
						}
						Break;
					default:
						this.filter.setFilter(event.source.name);
						this.tree.refilter();
						Break;
				}
			}));
		};

		this._register(this.deBugService.onDidNewSession(registerSessionListeners));
		this.deBugService.getModel().getSessions().forEach(registerSessionListeners);

		this._register(this.deBugService.onDidEndSession(session => {
			root.remove(session.getId());
			this.changeScheduler.schedule();
		}));

		this.changeScheduler.schedule(0);

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle && this.treeNeedsRefreshOnVisiBle) {
				this.changeScheduler.schedule();
			}
		}));

		// feature: expand all nodes when filtering (not when finding)
		let viewState: IViewState | undefined;
		this._register(this.tree.onDidChangeTypeFilterPattern(pattern => {
			if (!this.tree.options.filterOnType) {
				return;
			}

			if (!viewState && pattern) {
				const expanded = new Set<string>();
				const visit = (node: ITreeNode<BaseTreeItem | null, FuzzyScore>) => {
					if (node.element && !node.collapsed) {
						expanded.add(node.element.getId());
					}

					for (const child of node.children) {
						visit(child);
					}
				};

				visit(this.tree.getNode());
				viewState = { expanded };
				this.tree.expandAll();
			} else if (!pattern && viewState) {
				this.tree.setFocus([]);
				updateView(viewState);
				viewState = undefined;
			}
		}));

		// populate tree model with source paths from all deBug sessions
		this.deBugService.getModel().getSessions().forEach(session => addSourcePathsToSession(session));
	}

	layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	dispose(): void {
		dispose(this.tree);
		dispose(this.treeLaBels);
		super.dispose();
	}
}

class LoadedScriptsDelegate implements IListVirtualDelegate<LoadedScriptsItem> {

	getHeight(element: LoadedScriptsItem): numBer {
		return 22;
	}

	getTemplateId(element: LoadedScriptsItem): string {
		return LoadedScriptsRenderer.ID;
	}
}

interface ILoadedScriptsItemTemplateData {
	laBel: IResourceLaBel;
}

class LoadedScriptsRenderer implements ICompressiBleTreeRenderer<BaseTreeItem, FuzzyScore, ILoadedScriptsItemTemplateData> {

	static readonly ID = 'lsrenderer';

	constructor(
		private laBels: ResourceLaBels
	) {
	}

	get templateId(): string {
		return LoadedScriptsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): ILoadedScriptsItemTemplateData {
		const laBel = this.laBels.create(container, { supportHighlights: true });
		return { laBel };
	}

	renderElement(node: ITreeNode<BaseTreeItem, FuzzyScore>, index: numBer, data: ILoadedScriptsItemTemplateData): void {

		const element = node.element;
		const laBel = element.getLaBel();

		this.render(element, laBel, data, node.filterData);
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<BaseTreeItem>, FuzzyScore>, index: numBer, data: ILoadedScriptsItemTemplateData, height: numBer | undefined): void {

		const element = node.element.elements[node.element.elements.length - 1];
		const laBels = node.element.elements.map(e => e.getLaBel());

		this.render(element, laBels, data, node.filterData);
	}

	private render(element: BaseTreeItem, laBels: string | string[], data: ILoadedScriptsItemTemplateData, filterData: FuzzyScore | undefined) {

		const laBel: IResourceLaBelProps = {
			name: laBels
		};
		const options: IResourceLaBelOptions = {
			title: element.getHoverLaBel()
		};

		if (element instanceof RootFolderTreeItem) {

			options.fileKind = FileKind.ROOT_FOLDER;

		} else if (element instanceof SessionTreeItem) {

			options.title = nls.localize('loadedScriptsSession', "DeBug Session");
			options.hideIcon = true;

		} else if (element instanceof BaseTreeItem) {

			const src = element.getSource();
			if (src && src.uri) {
				laBel.resource = src.uri;
				options.fileKind = FileKind.FILE;
			} else {
				options.fileKind = FileKind.FOLDER;
			}
		}
		options.matches = createMatches(filterData);

		data.laBel.setResource(laBel, options);
	}

	disposeTemplate(templateData: ILoadedScriptsItemTemplateData): void {
		templateData.laBel.dispose();
	}
}

class LoadedSciptsAccessiBilityProvider implements IListAccessiBilityProvider<LoadedScriptsItem> {

	getWidgetAriaLaBel(): string {
		return nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'loadedScriptsAriaLaBel' }, "DeBug Loaded Scripts");
	}

	getAriaLaBel(element: LoadedScriptsItem): string {

		if (element instanceof RootFolderTreeItem) {
			return nls.localize('loadedScriptsRootFolderAriaLaBel', "Workspace folder {0}, loaded script, deBug", element.getLaBel());
		}

		if (element instanceof SessionTreeItem) {
			return nls.localize('loadedScriptsSessionAriaLaBel', "Session {0}, loaded script, deBug", element.getLaBel());
		}

		if (element.hasChildren()) {
			return nls.localize('loadedScriptsFolderAriaLaBel', "Folder {0}, loaded script, deBug", element.getLaBel());
		} else {
			return nls.localize('loadedScriptsSourceAriaLaBel', "{0}, loaded script, deBug", element.getLaBel());
		}
	}
}

class LoadedScriptsFilter implements ITreeFilter<BaseTreeItem, FuzzyScore> {

	private filterText: string | undefined;

	setFilter(filterText: string) {
		this.filterText = filterText;
	}

	filter(element: BaseTreeItem, parentVisiBility: TreeVisiBility): TreeFilterResult<FuzzyScore> {

		if (!this.filterText) {
			return TreeVisiBility.VisiBle;
		}

		if (element.isLeaf()) {
			const name = element.getLaBel();
			if (name.indexOf(this.filterText) >= 0) {
				return TreeVisiBility.VisiBle;
			}
			return TreeVisiBility.Hidden;
		}
		return TreeVisiBility.Recurse;
	}
}
