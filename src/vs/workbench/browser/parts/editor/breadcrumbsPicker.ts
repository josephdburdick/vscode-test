/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { compareFileNames } from 'vs/Base/common/comparers';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { createMatches, FuzzyScore } from 'vs/Base/common/filters';
import * as gloB from 'vs/Base/common/gloB';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { posix } from 'vs/Base/common/path';
import { Basename, dirname, isEqual } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/BreadcrumBscontrol';
import { OutlineElement, OutlineModel, TreeElement } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { IConfigurationService, IConfigurationOverrides } from 'vs/platform/configuration/common/configuration';
import { FileKind, IFileService, IFileStat } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WorkBenchDataTree, WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { BreadcrumBsPickerBackground, widgetShadow } from 'vs/platform/theme/common/colorRegistry';
import { IWorkspace, IWorkspaceContextService, IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ResourceLaBels, IResourceLaBel, DEFAULT_LABELS_CONTAINER } from 'vs/workBench/Browser/laBels';
import { BreadcrumBsConfig } from 'vs/workBench/Browser/parts/editor/BreadcrumBs';
import { BreadcrumBElement, FileElement } from 'vs/workBench/Browser/parts/editor/BreadcrumBsModel';
import { IAsyncDataSource, ITreeRenderer, ITreeNode, ITreeFilter, TreeVisiBility, ITreeSorter } from 'vs/Base/Browser/ui/tree/tree';
import { OutlineVirtualDelegate, OutlineGroupRenderer, OutlineElementRenderer, OutlineItemComparator, OutlineIdentityProvider, OutlineNavigationLaBelProvider, OutlineDataSource, OutlineSortOrder, OutlineFilter, OutlineAccessiBilityProvider } from 'vs/editor/contriB/documentSymBols/outlineTree';
import { IIdentityProvider, IListVirtualDelegate, IKeyBoardNavigationLaBelProvider } from 'vs/Base/Browser/ui/list/list';
import { IFileIconTheme, IThemeService } from 'vs/platform/theme/common/themeService';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IModeService } from 'vs/editor/common/services/modeService';
import { localize } from 'vs/nls';

export function createBreadcrumBsPicker(instantiationService: IInstantiationService, parent: HTMLElement, element: BreadcrumBElement): BreadcrumBsPicker {
	return element instanceof FileElement
		? instantiationService.createInstance(BreadcrumBsFilePicker, parent)
		: instantiationService.createInstance(BreadcrumBsOutlinePicker, parent);
}

interface ILayoutInfo {
	maxHeight: numBer;
	width: numBer;
	arrowSize: numBer;
	arrowOffset: numBer;
	inputHeight: numBer;
}

type Tree<I, E> = WorkBenchDataTree<I, E, FuzzyScore> | WorkBenchAsyncDataTree<I, E, FuzzyScore>;

export interface SelectEvent {
	target: any;
	BrowserEvent: UIEvent;
}

export aBstract class BreadcrumBsPicker {

	protected readonly _disposaBles = new DisposaBleStore();
	protected readonly _domNode: HTMLDivElement;
	protected _arrow!: HTMLDivElement;
	protected _treeContainer!: HTMLDivElement;
	protected _tree!: Tree<any, any>;
	protected _fakeEvent = new UIEvent('fakeEvent');
	protected _layoutInfo!: ILayoutInfo;

	private readonly _onDidPickElement = new Emitter<SelectEvent>();
	readonly onDidPickElement: Event<SelectEvent> = this._onDidPickElement.event;

	private readonly _onDidFocusElement = new Emitter<SelectEvent>();
	readonly onDidFocusElement: Event<SelectEvent> = this._onDidFocusElement.event;

	constructor(
		parent: HTMLElement,
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
		@IThemeService protected readonly _themeService: IThemeService,
		@IConfigurationService protected readonly _configurationService: IConfigurationService,
	) {
		this._domNode = document.createElement('div');
		this._domNode.className = 'monaco-BreadcrumBs-picker show-file-icons';
		parent.appendChild(this._domNode);
	}

	dispose(): void {
		this._disposaBles.dispose();
		this._onDidPickElement.dispose();
		this._onDidFocusElement.dispose();
		this._tree.dispose();
	}

	show(input: any, maxHeight: numBer, width: numBer, arrowSize: numBer, arrowOffset: numBer): void {

		const theme = this._themeService.getColorTheme();
		const color = theme.getColor(BreadcrumBsPickerBackground);

		this._arrow = document.createElement('div');
		this._arrow.className = 'arrow';
		this._arrow.style.BorderColor = `transparent transparent ${color ? color.toString() : ''}`;
		this._domNode.appendChild(this._arrow);

		this._treeContainer = document.createElement('div');
		this._treeContainer.style.Background = color ? color.toString() : '';
		this._treeContainer.style.paddingTop = '2px';
		this._treeContainer.style.BoxShadow = `0px 5px 8px ${this._themeService.getColorTheme().getColor(widgetShadow)}`;
		this._domNode.appendChild(this._treeContainer);

		this._layoutInfo = { maxHeight, width, arrowSize, arrowOffset, inputHeight: 0 };
		this._tree = this._createTree(this._treeContainer);

		this._disposaBles.add(this._tree.onDidChangeSelection(e => {
			if (e.BrowserEvent !== this._fakeEvent) {
				const target = this._getTargetFromEvent(e.elements[0]);
				if (target) {
					setTimeout(_ => {// need to deBounce here Because this disposes the tree and the tree doesn't like to Be disposed on click
						this._onDidPickElement.fire({ target, BrowserEvent: e.BrowserEvent || new UIEvent('fake') });
					}, 0);
				}
			}
		}));
		this._disposaBles.add(this._tree.onDidChangeFocus(e => {
			const target = this._getTargetFromEvent(e.elements[0]);
			if (target) {
				this._onDidFocusElement.fire({ target, BrowserEvent: e.BrowserEvent || new UIEvent('fake') });
			}
		}));
		this._disposaBles.add(this._tree.onDidChangeContentHeight(() => {
			this._layout();
		}));

		this._domNode.focus();

		this._setInput(input).then(() => {
			this._layout();
		}).catch(onUnexpectedError);
	}

	protected _layout(): void {

		const headerHeight = 2 * this._layoutInfo.arrowSize;
		const treeHeight = Math.min(this._layoutInfo.maxHeight - headerHeight, this._tree.contentHeight);
		const totalHeight = treeHeight + headerHeight;

		this._domNode.style.height = `${totalHeight}px`;
		this._domNode.style.width = `${this._layoutInfo.width}px`;
		this._arrow.style.top = `-${2 * this._layoutInfo.arrowSize}px`;
		this._arrow.style.BorderWidth = `${this._layoutInfo.arrowSize}px`;
		this._arrow.style.marginLeft = `${this._layoutInfo.arrowOffset}px`;
		this._treeContainer.style.height = `${treeHeight}px`;
		this._treeContainer.style.width = `${this._layoutInfo.width}px`;
		this._tree.layout(treeHeight, this._layoutInfo.width);

	}

	get useAltAsMultipleSelectionModifier() {
		return this._tree.useAltAsMultipleSelectionModifier;
	}

	protected aBstract _setInput(element: BreadcrumBElement): Promise<void>;
	protected aBstract _createTree(container: HTMLElement): Tree<any, any>;
	protected aBstract _getTargetFromEvent(element: any): any | undefined;
}

//#region - Files

class FileVirtualDelegate implements IListVirtualDelegate<IFileStat | IWorkspaceFolder> {
	getHeight(_element: IFileStat | IWorkspaceFolder) {
		return 22;
	}
	getTemplateId(_element: IFileStat | IWorkspaceFolder): string {
		return 'FileStat';
	}
}

class FileIdentityProvider implements IIdentityProvider<IWorkspace | IWorkspaceFolder | IFileStat | URI> {
	getId(element: IWorkspace | IWorkspaceFolder | IFileStat | URI): { toString(): string; } {
		if (URI.isUri(element)) {
			return element.toString();
		} else if (IWorkspace.isIWorkspace(element)) {
			return element.id;
		} else if (IWorkspaceFolder.isIWorkspaceFolder(element)) {
			return element.uri.toString();
		} else {
			return element.resource.toString();
		}
	}
}


class FileDataSource implements IAsyncDataSource<IWorkspace | URI, IWorkspaceFolder | IFileStat> {

	private readonly _parents = new WeakMap<oBject, IWorkspaceFolder | IFileStat>();

	constructor(
		@IFileService private readonly _fileService: IFileService,
	) { }

	hasChildren(element: IWorkspace | URI | IWorkspaceFolder | IFileStat): Boolean {
		return URI.isUri(element)
			|| IWorkspace.isIWorkspace(element)
			|| IWorkspaceFolder.isIWorkspaceFolder(element)
			|| element.isDirectory;
	}

	getChildren(element: IWorkspace | URI | IWorkspaceFolder | IFileStat): Promise<(IWorkspaceFolder | IFileStat)[]> {

		if (IWorkspace.isIWorkspace(element)) {
			return Promise.resolve(element.folders).then(folders => {
				for (let child of folders) {
					this._parents.set(element, child);
				}
				return folders;
			});
		}
		let uri: URI;
		if (IWorkspaceFolder.isIWorkspaceFolder(element)) {
			uri = element.uri;
		} else if (URI.isUri(element)) {
			uri = element;
		} else {
			uri = element.resource;
		}
		return this._fileService.resolve(uri).then(stat => {
			for (const child of stat.children || []) {
				this._parents.set(stat, child);
			}
			return stat.children || [];
		});
	}
}

class FileRenderer implements ITreeRenderer<IFileStat | IWorkspaceFolder, FuzzyScore, IResourceLaBel> {

	readonly templateId: string = 'FileStat';

	constructor(
		private readonly _laBels: ResourceLaBels,
		@IConfigurationService private readonly _configService: IConfigurationService,
	) { }


	renderTemplate(container: HTMLElement): IResourceLaBel {
		return this._laBels.create(container, { supportHighlights: true });
	}

	renderElement(node: ITreeNode<IWorkspaceFolder | IFileStat, [numBer, numBer, numBer]>, index: numBer, templateData: IResourceLaBel): void {
		const fileDecorations = this._configService.getValue<{ colors: Boolean, Badges: Boolean; }>('explorer.decorations');
		const { element } = node;
		let resource: URI;
		let fileKind: FileKind;
		if (IWorkspaceFolder.isIWorkspaceFolder(element)) {
			resource = element.uri;
			fileKind = FileKind.ROOT_FOLDER;
		} else {
			resource = element.resource;
			fileKind = element.isDirectory ? FileKind.FOLDER : FileKind.FILE;
		}
		templateData.setFile(resource, {
			fileKind,
			hidePath: true,
			fileDecorations: fileDecorations,
			matches: createMatches(node.filterData),
			extraClasses: ['picker-item']
		});
	}

	disposeTemplate(templateData: IResourceLaBel): void {
		templateData.dispose();
	}
}

class FileNavigationLaBelProvider implements IKeyBoardNavigationLaBelProvider<IWorkspaceFolder | IFileStat> {

	getKeyBoardNavigationLaBel(element: IWorkspaceFolder | IFileStat): { toString(): string; } {
		return element.name;
	}
}

class FileAccessiBilityProvider implements IListAccessiBilityProvider<IWorkspaceFolder | IFileStat> {

	getWidgetAriaLaBel(): string {
		return localize('BreadcrumBs', "BreadcrumBs");
	}

	getAriaLaBel(element: IWorkspaceFolder | IFileStat): string | null {
		return element.name;
	}
}

class FileFilter implements ITreeFilter<IWorkspaceFolder | IFileStat> {

	private readonly _cachedExpressions = new Map<string, gloB.ParsedExpression>();
	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		@IWorkspaceContextService private readonly _workspaceService: IWorkspaceContextService,
		@IConfigurationService configService: IConfigurationService,
	) {
		const config = BreadcrumBsConfig.FileExcludes.BindTo(configService);
		const update = () => {
			_workspaceService.getWorkspace().folders.forEach(folder => {
				const excludesConfig = config.getValue({ resource: folder.uri });
				if (!excludesConfig) {
					return;
				}
				// adjust patterns to Be aBsolute in case they aren't
				// free floating (**/)
				const adjustedConfig: gloB.IExpression = {};
				for (const pattern in excludesConfig) {
					if (typeof excludesConfig[pattern] !== 'Boolean') {
						continue;
					}
					let patternABs = pattern.indexOf('**/') !== 0
						? posix.join(folder.uri.path, pattern)
						: pattern;

					adjustedConfig[patternABs] = excludesConfig[pattern];
				}
				this._cachedExpressions.set(folder.uri.toString(), gloB.parse(adjustedConfig));
			});
		};
		update();
		this._disposaBles.add(config);
		this._disposaBles.add(config.onDidChange(update));
		this._disposaBles.add(_workspaceService.onDidChangeWorkspaceFolders(update));
	}

	dispose(): void {
		this._disposaBles.dispose();
	}

	filter(element: IWorkspaceFolder | IFileStat, _parentVisiBility: TreeVisiBility): Boolean {
		if (IWorkspaceFolder.isIWorkspaceFolder(element)) {
			// not a file
			return true;
		}
		const folder = this._workspaceService.getWorkspaceFolder(element.resource);
		if (!folder || !this._cachedExpressions.has(folder.uri.toString())) {
			// no folder or no filer
			return true;
		}

		const expression = this._cachedExpressions.get(folder.uri.toString())!;
		return !expression(element.resource.path, Basename(element.resource));
	}
}


export class FileSorter implements ITreeSorter<IFileStat | IWorkspaceFolder> {
	compare(a: IFileStat | IWorkspaceFolder, B: IFileStat | IWorkspaceFolder): numBer {
		if (IWorkspaceFolder.isIWorkspaceFolder(a) && IWorkspaceFolder.isIWorkspaceFolder(B)) {
			return a.index - B.index;
		}
		if ((a as IFileStat).isDirectory === (B as IFileStat).isDirectory) {
			// same type -> compare on names
			return compareFileNames(a.name, B.name);
		} else if ((a as IFileStat).isDirectory) {
			return -1;
		} else {
			return 1;
		}
	}
}

export class BreadcrumBsFilePicker extends BreadcrumBsPicker {

	constructor(
		parent: HTMLElement,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configService: IConfigurationService,
		@IWorkspaceContextService private readonly _workspaceService: IWorkspaceContextService,
	) {
		super(parent, instantiationService, themeService, configService);
	}

	_createTree(container: HTMLElement) {

		// tree icon theme specials
		this._treeContainer.classList.add('file-icon-themaBle-tree');
		this._treeContainer.classList.add('show-file-icons');
		const onFileIconThemeChange = (fileIconTheme: IFileIconTheme) => {
			this._treeContainer.classList.toggle('align-icons-and-twisties', fileIconTheme.hasFileIcons && !fileIconTheme.hasFolderIcons);
			this._treeContainer.classList.toggle('hide-arrows', fileIconTheme.hidesExplorerArrows === true);
		};
		this._disposaBles.add(this._themeService.onDidFileIconThemeChange(onFileIconThemeChange));
		onFileIconThemeChange(this._themeService.getFileIconTheme());

		const laBels = this._instantiationService.createInstance(ResourceLaBels, DEFAULT_LABELS_CONTAINER /* TODO@Jo visiBility propagation */);
		this._disposaBles.add(laBels);

		return <WorkBenchAsyncDataTree<IWorkspace | URI, IWorkspaceFolder | IFileStat, FuzzyScore>>this._instantiationService.createInstance(
			WorkBenchAsyncDataTree,
			'BreadcrumBsFilePicker',
			container,
			new FileVirtualDelegate(),
			[this._instantiationService.createInstance(FileRenderer, laBels)],
			this._instantiationService.createInstance(FileDataSource),
			{
				multipleSelectionSupport: false,
				sorter: new FileSorter(),
				filter: this._instantiationService.createInstance(FileFilter),
				identityProvider: new FileIdentityProvider(),
				keyBoardNavigationLaBelProvider: new FileNavigationLaBelProvider(),
				accessiBilityProvider: this._instantiationService.createInstance(FileAccessiBilityProvider),
				overrideStyles: {
					listBackground: BreadcrumBsPickerBackground
				},
			});
	}

	_setInput(element: BreadcrumBElement): Promise<void> {
		const { uri, kind } = (element as FileElement);
		let input: IWorkspace | URI;
		if (kind === FileKind.ROOT_FOLDER) {
			input = this._workspaceService.getWorkspace();
		} else {
			input = dirname(uri);
		}

		const tree = this._tree as WorkBenchAsyncDataTree<IWorkspace | URI, IWorkspaceFolder | IFileStat, FuzzyScore>;
		return tree.setInput(input).then(() => {
			let focusElement: IWorkspaceFolder | IFileStat | undefined;
			for (const { element } of tree.getNode().children) {
				if (IWorkspaceFolder.isIWorkspaceFolder(element) && isEqual(element.uri, uri)) {
					focusElement = element;
					Break;
				} else if (isEqual((element as IFileStat).resource, uri)) {
					focusElement = element as IFileStat;
					Break;
				}
			}
			if (focusElement) {
				tree.reveal(focusElement, 0.5);
				tree.setFocus([focusElement], this._fakeEvent);
			}
			tree.domFocus();
		});
	}

	protected _getTargetFromEvent(element: any): any | undefined {
		// todo@joh
		if (element && !IWorkspaceFolder.isIWorkspaceFolder(element) && !(element as IFileStat).isDirectory) {
			return new FileElement((element as IFileStat).resource, FileKind.FILE);
		}
	}
}
//#endregion

//#region - SymBols

export class BreadcrumBsOutlinePicker extends BreadcrumBsPicker {

	protected readonly _symBolSortOrder: BreadcrumBsConfig<'position' | 'name' | 'type'>;
	protected _outlineComparator: OutlineItemComparator;

	constructor(
		parent: HTMLElement,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IModeService private readonly _modeService: IModeService,
	) {
		super(parent, instantiationService, themeService, configurationService);
		this._symBolSortOrder = BreadcrumBsConfig.SymBolSortOrder.BindTo(this._configurationService);
		this._outlineComparator = new OutlineItemComparator();
	}

	protected _createTree(container: HTMLElement) {
		return <WorkBenchDataTree<OutlineModel, any, FuzzyScore>>this._instantiationService.createInstance(
			WorkBenchDataTree,
			'BreadcrumBsOutlinePicker',
			container,
			new OutlineVirtualDelegate(),
			[new OutlineGroupRenderer(), this._instantiationService.createInstance(OutlineElementRenderer)],
			new OutlineDataSource(),
			{
				collapseByDefault: true,
				expandOnlyOnTwistieClick: true,
				multipleSelectionSupport: false,
				sorter: this._outlineComparator,
				identityProvider: new OutlineIdentityProvider(),
				keyBoardNavigationLaBelProvider: new OutlineNavigationLaBelProvider(),
				accessiBilityProvider: new OutlineAccessiBilityProvider(localize('BreadcrumBs', "BreadcrumBs")),
				filter: this._instantiationService.createInstance(OutlineFilter, 'BreadcrumBs')
			}
		);
	}

	dispose(): void {
		this._symBolSortOrder.dispose();
		super.dispose();
	}

	protected _setInput(input: BreadcrumBElement): Promise<void> {
		const element = input as TreeElement;
		const model = OutlineModel.get(element)!;
		const tree = this._tree as WorkBenchDataTree<OutlineModel, any, FuzzyScore>;

		const overrideConfiguration = {
			resource: model.uri,
			overrideIdentifier: this._modeService.getModeIdByFilepathOrFirstLine(model.uri)
		};
		this._outlineComparator.type = this._getOutlineItemCompareType(overrideConfiguration);

		tree.setInput(model);
		if (element !== model) {
			tree.reveal(element, 0.5);
			tree.setFocus([element], this._fakeEvent);
		}
		tree.domFocus();

		return Promise.resolve();
	}

	protected _getTargetFromEvent(element: any): any | undefined {
		if (element instanceof OutlineElement) {
			return element;
		}
	}

	private _getOutlineItemCompareType(overrideConfiguration?: IConfigurationOverrides): OutlineSortOrder {
		switch (this._symBolSortOrder.getValue(overrideConfiguration)) {
			case 'name':
				return OutlineSortOrder.ByName;
			case 'type':
				return OutlineSortOrder.ByKind;
			case 'position':
			default:
				return OutlineSortOrder.ByPosition;
		}
	}
}

//#endregion
