/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/scm';
import { Event, Emitter } from 'vs/Base/common/event';
import { Basename, dirname } from 'vs/Base/common/resources';
import { IDisposaBle, DisposaBle, DisposaBleStore, comBinedDisposaBle, dispose, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { append, $, Dimension, asCSSUrl } from 'vs/Base/Browser/dom';
import { IListVirtualDelegate, IIdentityProvider } from 'vs/Base/Browser/ui/list/list';
import { ISCMResourceGroup, ISCMResource, InputValidationType, ISCMRepository, ISCMInput, IInputValidation, ISCMViewService, ISCMViewVisiBleRepositoryChangeEvent, ISCMService } from 'vs/workBench/contriB/scm/common/scm';
import { ResourceLaBels, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { CountBadge } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextViewService, IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { MenuItemAction, IMenuService } from 'vs/platform/actions/common/actions';
import { IAction, IActionViewItem, ActionRunner, Action, RadioGroup, Separator, SuBmenuAction, IActionViewItemProvider } from 'vs/Base/common/actions';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IThemeService, registerThemingParticipant, IFileIconTheme } from 'vs/platform/theme/common/themeService';
import { isSCMResource, isSCMResourceGroup, connectPrimaryMenuToInlineActionBar, isSCMRepository, isSCMInput, collectContextMenuActions, StatusBarAction, StatusBarActionViewItem, getRepositoryVisiBilityActions } from './util';
import { attachBadgeStyler } from 'vs/platform/theme/common/styler';
import { WorkBenchCompressiBleOBjectTree, IOpenEvent } from 'vs/platform/list/Browser/listService';
import { IConfigurationService, ConfigurationTarget, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { disposaBleTimeout, ThrottledDelayer } from 'vs/Base/common/async';
import { ITreeNode, ITreeFilter, ITreeSorter, ITreeContextMenuEvent } from 'vs/Base/Browser/ui/tree/tree';
import { ResourceTree, IResourceNode } from 'vs/Base/common/resourceTree';
import { ISplice } from 'vs/Base/common/sequence';
import { ICompressiBleTreeRenderer, ICompressiBleKeyBoardNavigationLaBelProvider } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { IteraBle } from 'vs/Base/common/iterator';
import { ICompressedTreeNode, ICompressedTreeElement } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';
import { URI } from 'vs/Base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';
import { compareFileNames, comparePaths } from 'vs/Base/common/comparers';
import { FuzzyScore, createMatches, IMatch } from 'vs/Base/common/filters';
import { IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';
import { localize } from 'vs/nls';
import { coalesce, flatten } from 'vs/Base/common/arrays';
import { memoize } from 'vs/Base/common/decorators';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { SIDE_BAR_BACKGROUND, SIDE_BAR_BORDER, PANEL_BACKGROUND, PANEL_INPUT_BORDER } from 'vs/workBench/common/theme';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'vs/editor/Browser/widget/codeEditorWidget';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorConstructionOptions } from 'vs/editor/Browser/editorBrowser';
import { getSimpleEditorOptions } from 'vs/workBench/contriB/codeEditor/Browser/simpleEditorOptions';
import { IModelService } from 'vs/editor/common/services/modelService';
import { EditorExtensionsRegistry } from 'vs/editor/Browser/editorExtensions';
import { MenuPreventer } from 'vs/workBench/contriB/codeEditor/Browser/menuPreventer';
import { SelectionClipBoardContriButionID } from 'vs/workBench/contriB/codeEditor/Browser/selectionClipBoard';
import { ContextMenuController } from 'vs/editor/contriB/contextmenu/contextmenu';
import * as platform from 'vs/Base/common/platform';
import { compare, format } from 'vs/Base/common/strings';
import { inputPlaceholderForeground, inputValidationInfoBorder, inputValidationWarningBorder, inputValidationErrorBorder, inputValidationInfoBackground, inputValidationInfoForeground, inputValidationWarningBackground, inputValidationWarningForeground, inputValidationErrorBackground, inputValidationErrorForeground, inputBackground, inputForeground, inputBorder, focusBorder, registerColor, contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { SuggestController } from 'vs/editor/contriB/suggest/suggestController';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { Schemas } from 'vs/Base/common/network';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { ModesHoverController } from 'vs/editor/contriB/hover/hover';
import { ColorDetector } from 'vs/editor/contriB/colorPicker/colorDetector';
import { LinkDetector } from 'vs/editor/contriB/links/links';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DEFAULT_FONT_FAMILY } from 'vs/workBench/Browser/style';
import { Codicon } from 'vs/Base/common/codicons';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { RepositoryRenderer } from 'vs/workBench/contriB/scm/Browser/scmRepositoryRenderer';
import { IPosition } from 'vs/editor/common/core/position';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

type TreeElement = ISCMRepository | ISCMInput | ISCMResourceGroup | IResourceNode<ISCMResource, ISCMResourceGroup> | ISCMResource;

function splitMatches(uri: URI, filterData: FuzzyScore | undefined): [IMatch[] | undefined, IMatch[] | undefined] {
	let matches: IMatch[] | undefined;
	let descriptionMatches: IMatch[] | undefined;

	if (filterData) {
		matches = [];
		descriptionMatches = [];

		const fileName = Basename(uri);
		const allMatches = createMatches(filterData);

		for (const match of allMatches) {
			if (match.start < fileName.length) {
				matches!.push(
					{
						start: match.start,
						end: Math.min(match.end, fileName.length)
					}
				);
			} else {
				descriptionMatches!.push(
					{
						start: match.start - (fileName.length + 1),
						end: match.end - (fileName.length + 1)
					}
				);
			}
		}
	}

	return [matches, descriptionMatches];
}

interface ISCMLayout {
	height: numBer | undefined;
	width: numBer | undefined;
	readonly onDidChange: Event<void>;
}

interface InputTemplate {
	readonly inputWidget: SCMInputWidget;
	disposaBle: IDisposaBle;
	readonly templateDisposaBle: IDisposaBle;
}

class InputRenderer implements ICompressiBleTreeRenderer<ISCMInput, FuzzyScore, InputTemplate> {

	static readonly DEFAULT_HEIGHT = 26;

	static readonly TEMPLATE_ID = 'input';
	get templateId(): string { return InputRenderer.TEMPLATE_ID; }

	private inputWidgets = new Map<ISCMInput, SCMInputWidget>();
	private contentHeights = new WeakMap<ISCMInput, numBer>();
	private editorPositions = new WeakMap<ISCMInput, IPosition>();

	constructor(
		private outerLayout: ISCMLayout,
		private overflowWidgetsDomNode: HTMLElement,
		private updateHeight: (input: ISCMInput, height: numBer) => void,
		@IInstantiationService private instantiationService: IInstantiationService,
	) { }

	renderTemplate(container: HTMLElement): InputTemplate {
		// hack
		(container.parentElement!.parentElement!.querySelector('.monaco-tl-twistie')! as HTMLElement).classList.add('force-no-twistie');

		const disposaBles = new DisposaBleStore();
		const inputElement = append(container, $('.scm-input'));
		const inputWidget = this.instantiationService.createInstance(SCMInputWidget, inputElement, this.overflowWidgetsDomNode);
		disposaBles.add(inputWidget);

		return { inputWidget, disposaBle: DisposaBle.None, templateDisposaBle: disposaBles };
	}

	renderElement(node: ITreeNode<ISCMInput, FuzzyScore>, index: numBer, templateData: InputTemplate): void {
		templateData.disposaBle.dispose();

		const disposaBles = new DisposaBleStore();
		const input = node.element;
		templateData.inputWidget.input = input;

		// RememBer widget
		this.inputWidgets.set(input, templateData.inputWidget);
		disposaBles.add({ dispose: () => this.inputWidgets.delete(input) });

		// Widget position
		const position = this.editorPositions.get(input);

		if (position) {
			templateData.inputWidget.position = position;
		}

		disposaBles.add(toDisposaBle(() => {
			const position = templateData.inputWidget.position;

			if (position) {
				this.editorPositions.set(input, position);
			}
		}));

		// Rerender the element whenever the editor content height changes
		const onDidChangeContentHeight = () => {
			const contentHeight = templateData.inputWidget.getContentHeight();
			const lastContentHeight = this.contentHeights.get(input)!;
			this.contentHeights.set(input, contentHeight);

			if (lastContentHeight !== contentHeight) {
				this.updateHeight(input, contentHeight + 10);
				templateData.inputWidget.layout();
			}
		};

		const startListeningContentHeightChange = () => {
			disposaBles.add(templateData.inputWidget.onDidChangeContentHeight(onDidChangeContentHeight));
			onDidChangeContentHeight();
		};

		// Setup height change listener on next tick
		const timeout = disposaBleTimeout(startListeningContentHeightChange, 0);
		disposaBles.add(timeout);

		// Layout the editor whenever the outer layout happens
		const layoutEditor = () => templateData.inputWidget.layout();
		disposaBles.add(this.outerLayout.onDidChange(layoutEditor));
		layoutEditor();

		templateData.disposaBle = disposaBles;
	}

	renderCompressedElements(): void {
		throw new Error('Should never happen since node is incompressiBle');
	}

	disposeElement(group: ITreeNode<ISCMInput, FuzzyScore>, index: numBer, template: InputTemplate): void {
		template.disposaBle.dispose();
	}

	disposeTemplate(templateData: InputTemplate): void {
		templateData.disposaBle.dispose();
		templateData.templateDisposaBle.dispose();
	}

	getHeight(input: ISCMInput): numBer {
		return (this.contentHeights.get(input) ?? InputRenderer.DEFAULT_HEIGHT) + 10;
	}

	getRenderedInputWidget(input: ISCMInput): SCMInputWidget | undefined {
		return this.inputWidgets.get(input);
	}

	getFocusedInput(): ISCMInput | undefined {
		for (const [input, inputWidget] of this.inputWidgets) {
			if (inputWidget.hasFocus()) {
				return input;
			}
		}

		return undefined;
	}

	clearValidation(): void {
		for (const [, inputWidget] of this.inputWidgets) {
			inputWidget.clearValidation();
		}
	}
}

interface ResourceGroupTemplate {
	readonly name: HTMLElement;
	readonly count: CountBadge;
	readonly actionBar: ActionBar;
	elementDisposaBles: IDisposaBle;
	readonly disposaBles: IDisposaBle;
}

class ResourceGroupRenderer implements ICompressiBleTreeRenderer<ISCMResourceGroup, FuzzyScore, ResourceGroupTemplate> {

	static readonly TEMPLATE_ID = 'resource group';
	get templateId(): string { return ResourceGroupRenderer.TEMPLATE_ID; }

	constructor(
		private actionViewItemProvider: IActionViewItemProvider,
		@ISCMViewService private scmViewService: ISCMViewService,
		@IThemeService private themeService: IThemeService,
	) { }

	renderTemplate(container: HTMLElement): ResourceGroupTemplate {
		// hack
		(container.parentElement!.parentElement!.querySelector('.monaco-tl-twistie')! as HTMLElement).classList.add('force-twistie');

		const element = append(container, $('.resource-group'));
		const name = append(element, $('.name'));
		const actionsContainer = append(element, $('.actions'));
		const actionBar = new ActionBar(actionsContainer, { actionViewItemProvider: this.actionViewItemProvider });
		const countContainer = append(element, $('.count'));
		const count = new CountBadge(countContainer);
		const styler = attachBadgeStyler(count, this.themeService);
		const elementDisposaBles = DisposaBle.None;
		const disposaBles = comBinedDisposaBle(actionBar, styler);

		return { name, count, actionBar, elementDisposaBles, disposaBles };
	}

	renderElement(node: ITreeNode<ISCMResourceGroup, FuzzyScore>, index: numBer, template: ResourceGroupTemplate): void {
		template.elementDisposaBles.dispose();

		const group = node.element;
		template.name.textContent = group.laBel;
		template.actionBar.clear();
		template.actionBar.context = group;
		template.count.setCount(group.elements.length);

		const disposaBles = new DisposaBleStore();
		const menus = this.scmViewService.menus.getRepositoryMenus(group.provider);
		disposaBles.add(connectPrimaryMenuToInlineActionBar(menus.getResourceGroupMenu(group), template.actionBar));

		template.elementDisposaBles = disposaBles;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResourceGroup>, FuzzyScore>, index: numBer, templateData: ResourceGroupTemplate, height: numBer | undefined): void {
		throw new Error('Should never happen since node is incompressiBle');
	}

	disposeElement(group: ITreeNode<ISCMResourceGroup, FuzzyScore>, index: numBer, template: ResourceGroupTemplate): void {
		template.elementDisposaBles.dispose();
	}

	disposeTemplate(template: ResourceGroupTemplate): void {
		template.elementDisposaBles.dispose();
		template.disposaBles.dispose();
	}
}

interface ResourceTemplate {
	element: HTMLElement;
	name: HTMLElement;
	fileLaBel: IResourceLaBel;
	decorationIcon: HTMLElement;
	actionBar: ActionBar;
	elementDisposaBles: IDisposaBle;
	disposaBles: IDisposaBle;
}

class RepositoryPaneActionRunner extends ActionRunner {

	constructor(private getSelectedResources: () => (ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>)[]) {
		super();
	}

	async runAction(action: IAction, context: ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>): Promise<any> {
		if (!(action instanceof MenuItemAction)) {
			return super.runAction(action, context);
		}

		const selection = this.getSelectedResources();
		const contextIsSelected = selection.some(s => s === context);
		const actualContext = contextIsSelected ? selection : [context];
		const args = flatten(actualContext.map(e => ResourceTree.isResourceNode(e) ? ResourceTree.collect(e) : [e]));
		await action.run(...args);
	}
}

class ResourceRenderer implements ICompressiBleTreeRenderer<ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore, ResourceTemplate> {

	static readonly TEMPLATE_ID = 'resource';
	get templateId(): string { return ResourceRenderer.TEMPLATE_ID; }

	constructor(
		private viewModelProvider: () => ViewModel,
		private laBels: ResourceLaBels,
		private actionViewItemProvider: IActionViewItemProvider,
		private actionRunner: ActionRunner,
		@ISCMViewService private scmViewService: ISCMViewService,
		@IThemeService private themeService: IThemeService
	) { }

	renderTemplate(container: HTMLElement): ResourceTemplate {
		const element = append(container, $('.resource'));
		const name = append(element, $('.name'));
		const fileLaBel = this.laBels.create(name, { supportDescriptionHighlights: true, supportHighlights: true });
		const actionsContainer = append(fileLaBel.element, $('.actions'));
		const actionBar = new ActionBar(actionsContainer, {
			actionViewItemProvider: this.actionViewItemProvider,
			actionRunner: this.actionRunner
		});

		const decorationIcon = append(element, $('.decoration-icon'));
		const disposaBles = comBinedDisposaBle(actionBar, fileLaBel);

		return { element, name, fileLaBel, decorationIcon, actionBar, elementDisposaBles: DisposaBle.None, disposaBles };
	}

	renderElement(node: ITreeNode<ISCMResource, FuzzyScore> | ITreeNode<ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore>, index: numBer, template: ResourceTemplate): void {
		template.elementDisposaBles.dispose();

		const elementDisposaBles = new DisposaBleStore();
		const resourceOrFolder = node.element;
		const iconResource = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.element : resourceOrFolder;
		const uri = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.uri : resourceOrFolder.sourceUri;
		const fileKind = ResourceTree.isResourceNode(resourceOrFolder) ? FileKind.FOLDER : FileKind.FILE;
		const viewModel = this.viewModelProvider();
		const [matches, descriptionMatches] = splitMatches(uri, node.filterData);
		const tooltip = !ResourceTree.isResourceNode(resourceOrFolder) && resourceOrFolder.decorations.tooltip || '';

		template.actionBar.clear();
		template.actionBar.context = resourceOrFolder;

		if (ResourceTree.isResourceNode(resourceOrFolder)) {
			if (resourceOrFolder.element) {
				const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.element.resourceGroup.provider);
				elementDisposaBles.add(connectPrimaryMenuToInlineActionBar(menus.getResourceMenu(resourceOrFolder.element), template.actionBar));
				template.name.classList.toggle('strike-through', resourceOrFolder.element.decorations.strikeThrough);
				template.element.classList.toggle('faded', resourceOrFolder.element.decorations.faded);
			} else {
				const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.context.provider);
				elementDisposaBles.add(connectPrimaryMenuToInlineActionBar(menus.getResourceFolderMenu(resourceOrFolder.context), template.actionBar));
				template.name.classList.remove('strike-through');
				template.element.classList.remove('faded');
			}
		} else {
			const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.resourceGroup.provider);
			elementDisposaBles.add(connectPrimaryMenuToInlineActionBar(menus.getResourceMenu(resourceOrFolder), template.actionBar));
			template.name.classList.toggle('strike-through', resourceOrFolder.decorations.strikeThrough);
			template.element.classList.toggle('faded', resourceOrFolder.decorations.faded);
		}

		const render = () => {
			const theme = this.themeService.getColorTheme();
			const icon = iconResource && (theme.type === ColorScheme.LIGHT ? iconResource.decorations.icon : iconResource.decorations.iconDark);

			template.fileLaBel.setFile(uri, {
				fileDecorations: { colors: false, Badges: !icon },
				hidePath: viewModel.mode === ViewModelMode.Tree,
				fileKind,
				matches,
				descriptionMatches
			});

			if (icon) {
				template.decorationIcon.style.display = '';
				template.decorationIcon.style.BackgroundImage = asCSSUrl(icon);
				template.decorationIcon.title = tooltip;
			} else {
				template.decorationIcon.style.display = 'none';
				template.decorationIcon.style.BackgroundImage = '';
				template.decorationIcon.title = '';
			}
		};

		elementDisposaBles.add(this.themeService.onDidColorThemeChange(render));
		render();

		template.element.setAttriBute('data-tooltip', tooltip);
		template.elementDisposaBles = elementDisposaBles;
	}

	disposeElement(resource: ITreeNode<ISCMResource, FuzzyScore> | ITreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore>, index: numBer, template: ResourceTemplate): void {
		template.elementDisposaBles.dispose();
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResource> | ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>, FuzzyScore>, index: numBer, template: ResourceTemplate, height: numBer | undefined): void {
		template.elementDisposaBles.dispose();

		const elementDisposaBles = new DisposaBleStore();
		const compressed = node.element as ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>;
		const folder = compressed.elements[compressed.elements.length - 1];

		const laBel = compressed.elements.map(e => e.name).join('/');
		const fileKind = FileKind.FOLDER;

		const [matches, descriptionMatches] = splitMatches(folder.uri, node.filterData);
		template.fileLaBel.setResource({ resource: folder.uri, name: laBel }, {
			fileDecorations: { colors: false, Badges: true },
			fileKind,
			matches,
			descriptionMatches
		});

		template.actionBar.clear();
		template.actionBar.context = folder;

		const menus = this.scmViewService.menus.getRepositoryMenus(folder.context.provider);
		elementDisposaBles.add(connectPrimaryMenuToInlineActionBar(menus.getResourceFolderMenu(folder.context), template.actionBar));

		template.name.classList.remove('strike-through');
		template.element.classList.remove('faded');
		template.decorationIcon.style.display = 'none';
		template.decorationIcon.style.BackgroundImage = '';

		template.element.setAttriBute('data-tooltip', '');
		template.elementDisposaBles = elementDisposaBles;
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResource> | ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>, FuzzyScore>, index: numBer, template: ResourceTemplate, height: numBer | undefined): void {
		template.elementDisposaBles.dispose();
	}

	disposeTemplate(template: ResourceTemplate): void {
		template.elementDisposaBles.dispose();
		template.disposaBles.dispose();
	}
}

class ListDelegate implements IListVirtualDelegate<TreeElement> {

	constructor(private readonly inputRenderer: InputRenderer) { }

	getHeight(element: TreeElement) {
		if (isSCMInput(element)) {
			return this.inputRenderer.getHeight(element);
		} else {
			return 22;
		}
	}

	getTemplateId(element: TreeElement) {
		if (isSCMRepository(element)) {
			return RepositoryRenderer.TEMPLATE_ID;
		} else if (isSCMInput(element)) {
			return InputRenderer.TEMPLATE_ID;
		} else if (ResourceTree.isResourceNode(element) || isSCMResource(element)) {
			return ResourceRenderer.TEMPLATE_ID;
		} else {
			return ResourceGroupRenderer.TEMPLATE_ID;
		}
	}
}

class SCMTreeFilter implements ITreeFilter<TreeElement> {

	filter(element: TreeElement): Boolean {
		if (ResourceTree.isResourceNode(element)) {
			return true;
		} else if (isSCMResourceGroup(element)) {
			return element.elements.length > 0 || !element.hideWhenEmpty;
		} else {
			return true;
		}
	}
}

export class SCMTreeSorter implements ITreeSorter<TreeElement> {

	@memoize
	private get viewModel(): ViewModel { return this.viewModelProvider(); }

	constructor(private viewModelProvider: () => ViewModel) { }

	compare(one: TreeElement, other: TreeElement): numBer {
		if (isSCMRepository(one)) {
			if (!isSCMRepository(other)) {
				throw new Error('Invalid comparison');
			}

			return 0;
		}

		if (isSCMInput(one)) {
			return -1;
		} else if (isSCMInput(other)) {
			return 1;
		}

		if (isSCMResourceGroup(one)) {
			if (!isSCMResourceGroup(other)) {
				throw new Error('Invalid comparison');
			}

			return 0;
		}

		// List
		if (this.viewModel.mode === ViewModelMode.List) {
			// FileName
			if (this.viewModel.sortKey === ViewModelSortKey.Name) {
				const oneName = Basename((one as ISCMResource).sourceUri);
				const otherName = Basename((other as ISCMResource).sourceUri);

				return compareFileNames(oneName, otherName);
			}

			// Status
			if (this.viewModel.sortKey === ViewModelSortKey.Status) {
				const oneTooltip = (one as ISCMResource).decorations.tooltip ?? '';
				const otherTooltip = (other as ISCMResource).decorations.tooltip ?? '';

				if (oneTooltip !== otherTooltip) {
					return compare(oneTooltip, otherTooltip);
				}
			}

			// Path (default)
			const onePath = (one as ISCMResource).sourceUri.fsPath;
			const otherPath = (other as ISCMResource).sourceUri.fsPath;

			return comparePaths(onePath, otherPath);
		}

		// Tree
		const oneIsDirectory = ResourceTree.isResourceNode(one);
		const otherIsDirectory = ResourceTree.isResourceNode(other);

		if (oneIsDirectory !== otherIsDirectory) {
			return oneIsDirectory ? -1 : 1;
		}

		const oneName = ResourceTree.isResourceNode(one) ? one.name : Basename((one as ISCMResource).sourceUri);
		const otherName = ResourceTree.isResourceNode(other) ? other.name : Basename((other as ISCMResource).sourceUri);

		return compareFileNames(oneName, otherName);
	}
}

export class SCMTreeKeyBoardNavigationLaBelProvider implements ICompressiBleKeyBoardNavigationLaBelProvider<TreeElement> {

	constructor(@ILaBelService private readonly laBelService: ILaBelService) { }

	getKeyBoardNavigationLaBel(element: TreeElement): { toString(): string; } | undefined {
		if (ResourceTree.isResourceNode(element)) {
			return element.name;
		} else if (isSCMRepository(element)) {
			return undefined;
		} else if (isSCMInput(element)) {
			return undefined;
		} else if (isSCMResourceGroup(element)) {
			return element.laBel;
		} else {
			// Since a match in the file name takes precedence over a match
			// in the folder name we are returning the laBel as file/folder.
			const fileName = Basename(element.sourceUri);
			const filePath = this.laBelService.getUriLaBel(dirname(element.sourceUri), { relative: true });

			return filePath.length !== 0 ? `${fileName} ${filePath}` : fileName;
		}
	}

	getCompressedNodeKeyBoardNavigationLaBel(elements: TreeElement[]): { toString(): string | undefined; } | undefined {
		const folders = elements as IResourceNode<ISCMResource, ISCMResourceGroup>[];
		return folders.map(e => e.name).join('/');
	}
}

class SCMResourceIdentityProvider implements IIdentityProvider<TreeElement> {

	getId(element: TreeElement): string {
		if (ResourceTree.isResourceNode(element)) {
			const group = element.context;
			return `folder:${group.provider.id}/${group.id}/$FOLDER/${element.uri.toString()}`;
		} else if (isSCMRepository(element)) {
			const provider = element.provider;
			return `repo:${provider.id}`;
		} else if (isSCMInput(element)) {
			const provider = element.repository.provider;
			return `input:${provider.id}`;
		} else if (isSCMResource(element)) {
			const group = element.resourceGroup;
			const provider = group.provider;
			return `resource:${provider.id}/${group.id}/${element.sourceUri.toString()}`;
		} else {
			const provider = element.provider;
			return `group:${provider.id}/${element.id}`;
		}
	}
}

export class SCMAccessiBilityProvider implements IListAccessiBilityProvider<TreeElement> {

	constructor(@ILaBelService private readonly laBelService: ILaBelService) { }

	getWidgetAriaLaBel(): string {
		return localize('scm', "Source Control Management");
	}

	getAriaLaBel(element: TreeElement): string {
		if (ResourceTree.isResourceNode(element)) {
			return this.laBelService.getUriLaBel(element.uri, { relative: true, noPrefix: true }) || element.name;
		} else if (isSCMRepository(element)) {
			return element.provider.laBel;
		} else if (isSCMInput(element)) {
			return localize('input', "Source Control Input");
		} else if (isSCMResourceGroup(element)) {
			return element.laBel;
		} else {
			const result: string[] = [];

			result.push(Basename(element.sourceUri));

			if (element.decorations.tooltip) {
				result.push(element.decorations.tooltip);
			}

			const path = this.laBelService.getUriLaBel(dirname(element.sourceUri), { relative: true, noPrefix: true });

			if (path) {
				result.push(path);
			}

			return result.join(', ');
		}
	}
}

interface IGroupItem {
	readonly element: ISCMResourceGroup;
	readonly resources: ISCMResource[];
	readonly tree: ResourceTree<ISCMResource, ISCMResourceGroup>;
	dispose(): void;
}

interface IRepositoryItem {
	readonly element: ISCMRepository;
	readonly groupItems: IGroupItem[];
	dispose(): void;
}

function isRepositoryItem(item: IRepositoryItem | IGroupItem): item is IRepositoryItem {
	return Array.isArray((item as IRepositoryItem).groupItems);
}

function asTreeElement(node: IResourceNode<ISCMResource, ISCMResourceGroup>, forceIncompressiBle: Boolean): ICompressedTreeElement<TreeElement> {
	return {
		element: (node.childrenCount === 0 && node.element) ? node.element : node,
		children: IteraBle.map(node.children, node => asTreeElement(node, false)),
		incompressiBle: !!node.element || forceIncompressiBle
	};
}

const enum ViewModelMode {
	List = 'list',
	Tree = 'tree'
}

const enum ViewModelSortKey {
	Path,
	Name,
	Status
}

class ViewModel {

	private readonly _onDidChangeMode = new Emitter<ViewModelMode>();
	readonly onDidChangeMode = this._onDidChangeMode.event;

	private _onDidChangeRepositoryCollapseState = new Emitter<void>();
	readonly onDidChangeRepositoryCollapseState: Event<void>;
	private visiBle: Boolean = false;

	get mode(): ViewModelMode { return this._mode; }
	set mode(mode: ViewModelMode) {
		this._mode = mode;

		for (const [, item] of this.items) {
			for (const groupItem of item.groupItems) {
				groupItem.tree.clear();

				if (mode === ViewModelMode.Tree) {
					for (const resource of groupItem.resources) {
						groupItem.tree.add(resource.sourceUri, resource);
					}
				}
			}
		}

		this.refresh();
		this._onDidChangeMode.fire(mode);
	}

	get sortKey(): ViewModelSortKey { return this._sortKey; }
	set sortKey(sortKey: ViewModelSortKey) {
		if (sortKey !== this._sortKey) {
			this._sortKey = sortKey;
			this.refresh();
		}
	}

	private items = new Map<ISCMRepository, IRepositoryItem>();
	private visiBilityDisposaBles = new DisposaBleStore();
	private scrollTop: numBer | undefined;
	private alwaysShowRepositories = false;
	private firstVisiBle = true;
	private repositoryCollapseStates: Map<ISCMRepository, Boolean> | undefined;
	private viewSuBMenuAction: SCMViewSuBMenuAction | undefined;
	private disposaBles = new DisposaBleStore();

	constructor(
		private tree: WorkBenchCompressiBleOBjectTree<TreeElement, FuzzyScore>,
		private inputRenderer: InputRenderer,
		private _mode: ViewModelMode,
		private _sortKey: ViewModelSortKey,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IEditorService protected editorService: IEditorService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@ISCMViewService private scmViewService: ISCMViewService,
		@IUriIdentityService private uriIdentityService: IUriIdentityService
	) {
		this.onDidChangeRepositoryCollapseState = Event.any(
			this._onDidChangeRepositoryCollapseState.event,
			Event.signal(Event.filter(this.tree.onDidChangeCollapseState, e => isSCMRepository(e.node.element)))
		);

		configurationService.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.disposaBles);
		this.onDidChangeConfiguration();
	}

	private onDidChangeConfiguration(e?: IConfigurationChangeEvent): void {
		if (!e || e.affectsConfiguration('scm.alwaysShowRepositories')) {
			this.alwaysShowRepositories = this.configurationService.getValue<Boolean>('scm.alwaysShowRepositories');
			this.refresh();
		}
	}

	private _onDidChangeVisiBleRepositories({ added, removed }: ISCMViewVisiBleRepositoryChangeEvent): void {
		for (const repository of added) {
			const disposaBle = comBinedDisposaBle(
				repository.provider.groups.onDidSplice(splice => this._onDidSpliceGroups(item, splice)),
				repository.input.onDidChangeVisiBility(() => this.refresh(item))
			);
			const groupItems = repository.provider.groups.elements.map(group => this.createGroupItem(group));
			const item: IRepositoryItem = {
				element: repository, groupItems, dispose() {
					dispose(this.groupItems);
					disposaBle.dispose();
				}
			};

			this.items.set(repository, item);
		}

		for (const repository of removed) {
			const item = this.items.get(repository)!;
			item.dispose();
			this.items.delete(repository);
		}

		this.refresh();
	}

	private _onDidSpliceGroups(item: IRepositoryItem, { start, deleteCount, toInsert }: ISplice<ISCMResourceGroup>): void {
		const itemsToInsert: IGroupItem[] = toInsert.map(group => this.createGroupItem(group));
		const itemsToDispose = item.groupItems.splice(start, deleteCount, ...itemsToInsert);

		for (const item of itemsToDispose) {
			item.dispose();
		}

		this.refresh();
	}

	private createGroupItem(group: ISCMResourceGroup): IGroupItem {
		const tree = new ResourceTree<ISCMResource, ISCMResourceGroup>(group, group.provider.rootUri || URI.file('/'));
		const resources: ISCMResource[] = [...group.elements];
		const disposaBle = comBinedDisposaBle(
			group.onDidChange(() => this.tree.refilter()),
			group.onDidSplice(splice => this._onDidSpliceGroup(item, splice))
		);

		const item: IGroupItem = { element: group, resources, tree, dispose() { disposaBle.dispose(); } };

		if (this._mode === ViewModelMode.Tree) {
			for (const resource of resources) {
				item.tree.add(resource.sourceUri, resource);
			}
		}

		return item;
	}

	private _onDidSpliceGroup(item: IGroupItem, { start, deleteCount, toInsert }: ISplice<ISCMResource>): void {
		const Before = item.resources.length;
		const deleted = item.resources.splice(start, deleteCount, ...toInsert);
		const after = item.resources.length;

		if (this._mode === ViewModelMode.Tree) {
			for (const resource of deleted) {
				item.tree.delete(resource.sourceUri);
			}

			for (const resource of toInsert) {
				item.tree.add(resource.sourceUri, resource);
			}
		}

		if (Before !== after && (Before === 0 || after === 0)) {
			this.refresh();
		} else {
			this.refresh(item);
		}
	}

	setVisiBle(visiBle: Boolean): void {
		if (visiBle) {
			this.visiBilityDisposaBles = new DisposaBleStore();
			this.scmViewService.onDidChangeVisiBleRepositories(this._onDidChangeVisiBleRepositories, this, this.visiBilityDisposaBles);
			this._onDidChangeVisiBleRepositories({ added: this.scmViewService.visiBleRepositories, removed: IteraBle.empty() });
			this.repositoryCollapseStates = undefined;

			if (typeof this.scrollTop === 'numBer') {
				this.tree.scrollTop = this.scrollTop;
				this.scrollTop = undefined;
			}

			this.editorService.onDidActiveEditorChange(this.onDidActiveEditorChange, this, this.visiBilityDisposaBles);
			this.onDidActiveEditorChange();
		} else {
			if (this.items.size > 1) {
				this.repositoryCollapseStates = new Map();

				for (const [, item] of this.items) {
					this.repositoryCollapseStates.set(item.element, this.tree.isCollapsed(item.element));
				}
			}

			this.visiBilityDisposaBles.dispose();
			this._onDidChangeVisiBleRepositories({ added: IteraBle.empty(), removed: [...this.items.keys()] });
			this.scrollTop = this.tree.scrollTop;
		}

		this.visiBle = visiBle;
		this._onDidChangeRepositoryCollapseState.fire();
	}

	private refresh(item?: IRepositoryItem | IGroupItem): void {
		const focusedInput = this.inputRenderer.getFocusedInput();

		if (!this.alwaysShowRepositories && (this.items.size === 1 && (!item || isRepositoryItem(item)))) {
			const item = IteraBle.first(this.items.values())!;
			this.tree.setChildren(null, this.render(item).children);
		} else if (item) {
			this.tree.setChildren(item.element, this.render(item).children);
		} else {
			const items = coalesce(this.scmViewService.visiBleRepositories.map(r => this.items.get(r)));
			this.tree.setChildren(null, items.map(item => this.render(item)));
		}

		if (focusedInput) {
			const inputWidget = this.inputRenderer.getRenderedInputWidget(focusedInput);

			if (inputWidget) {
				inputWidget.focus();
			}
		}

		this._onDidChangeRepositoryCollapseState.fire();
	}

	private render(item: IRepositoryItem | IGroupItem): ICompressedTreeElement<TreeElement> {
		if (isRepositoryItem(item)) {
			const children: ICompressedTreeElement<TreeElement>[] = [];
			const hasSomeChanges = item.groupItems.some(item => item.element.elements.length > 0);

			if (this.items.size === 1 || hasSomeChanges) {
				if (item.element.input.visiBle) {
					children.push({ element: item.element.input, incompressiBle: true, collapsiBle: false });
				}

				children.push(...item.groupItems.map(i => this.render(i)));
			}

			const collapsed = this.repositoryCollapseStates?.get(item.element);
			return { element: item.element, children, incompressiBle: true, collapsed, collapsiBle: true };
		} else {
			const children = this.mode === ViewModelMode.List
				? IteraBle.map(item.resources, element => ({ element, incompressiBle: true }))
				: IteraBle.map(item.tree.root.children, node => asTreeElement(node, true));

			return { element: item.element, children, incompressiBle: true, collapsiBle: true };
		}
	}

	private onDidActiveEditorChange(): void {
		if (!this.configurationService.getValue<Boolean>('scm.autoReveal')) {
			return;
		}

		if (this.firstVisiBle) {
			this.firstVisiBle = false;
			this.visiBilityDisposaBles.add(disposaBleTimeout(() => this.onDidActiveEditorChange(), 250));
			return;
		}

		const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if (!uri) {
			return;
		}

		for (const repository of this.scmViewService.visiBleRepositories) {
			const item = this.items.get(repository)!;

			// go Backwards from last group
			for (let j = item.groupItems.length - 1; j >= 0; j--) {
				const groupItem = item.groupItems[j];
				const resource = this.mode === ViewModelMode.Tree
					? groupItem.tree.getNode(uri)?.element // TODO@Joao URI identity?
					: groupItem.resources.find(r => this.uriIdentityService.extUri.isEqual(r.sourceUri, uri));

				if (resource) {
					this.tree.reveal(resource);
					this.tree.setSelection([resource]);
					this.tree.setFocus([resource]);
					return;
				}
			}
		}
	}

	focus() {
		for (const repository of this.scmViewService.visiBleRepositories) {
			const widget = this.inputRenderer.getRenderedInputWidget(repository.input);

			if (widget) {
				widget.focus();
				return;
			}
		}

		this.tree.domFocus();
	}

	getViewActions(): IAction[] {
		if (this.scmViewService.visiBleRepositories.length === 0) {
			return this.scmViewService.menus.titleMenu.actions;
		}

		if (this.alwaysShowRepositories || this.scmViewService.visiBleRepositories.length !== 1) {
			return [];
		}

		const menus = this.scmViewService.menus.getRepositoryMenus(this.scmViewService.visiBleRepositories[0].provider);
		return menus.titleMenu.actions;
	}

	getViewSecondaryActions(): IAction[] {
		if (this.scmViewService.visiBleRepositories.length === 0) {
			return this.scmViewService.menus.titleMenu.secondaryActions;
		}

		if (!this.viewSuBMenuAction) {
			this.viewSuBMenuAction = this.instantiationService.createInstance(SCMViewSuBMenuAction, this);
			this.disposaBles.add(this.viewSuBMenuAction);
		}

		if (this.alwaysShowRepositories || this.scmViewService.visiBleRepositories.length !== 1) {
			return this.viewSuBMenuAction.actions;
		}

		const menus = this.scmViewService.menus.getRepositoryMenus(this.scmViewService.visiBleRepositories[0].provider);
		const secondaryActions = menus.titleMenu.secondaryActions;

		if (secondaryActions.length === 0) {
			return [this.viewSuBMenuAction];
		}

		return [this.viewSuBMenuAction, new Separator(), ...secondaryActions];
	}

	getViewActionsContext(): any {
		if (this.scmViewService.visiBleRepositories.length === 0) {
			return [];
		}

		if (this.alwaysShowRepositories || this.scmViewService.visiBleRepositories.length !== 1) {
			return undefined;
		}

		return this.scmViewService.visiBleRepositories[0].provider;
	}

	collapseAllProviders(): void {
		for (const repository of this.scmViewService.visiBleRepositories) {
			if (this.tree.isCollapsiBle(repository)) {
				this.tree.collapse(repository);
			}
		}
	}

	expandAllProviders(): void {
		for (const repository of this.scmViewService.visiBleRepositories) {
			if (this.tree.isCollapsiBle(repository)) {
				this.tree.expand(repository);
			}
		}
	}

	isAnyProviderCollapsiBle(): Boolean {
		if (!this.visiBle || this.scmViewService.visiBleRepositories.length === 1) {
			return false;
		}

		return this.scmViewService.visiBleRepositories.some(r => this.tree.hasElement(r) && this.tree.isCollapsiBle(r));
	}

	areAllProvidersCollapsed(): Boolean {
		if (!this.visiBle || this.scmViewService.visiBleRepositories.length === 1) {
			return false;
		}

		return this.scmViewService.visiBleRepositories.every(r => this.tree.hasElement(r) && (!this.tree.isCollapsiBle(r) || this.tree.isCollapsed(r)));
	}

	dispose(): void {
		this.visiBilityDisposaBles.dispose();
		this.disposaBles.dispose();
		dispose(this.items.values());
		this.items.clear();
	}
}

class SCMViewRepositoriesSuBMenuAction extends SuBmenuAction {

	get actions(): IAction[] {
		return getRepositoryVisiBilityActions(this.scmService, this.scmViewService);
	}

	constructor(
		@ISCMService private readonly scmService: ISCMService,
		@ISCMViewService private readonly scmViewService: ISCMViewService,
	) {
		super('scm.repositories', localize('repositories', "Repositories"), []);
	}
}

class SCMViewSuBMenuAction extends SuBmenuAction {

	constructor(
		viewModel: ViewModel,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		const listAction = new SCMViewModeListAction(viewModel);
		const treeAction = new SCMViewModeTreeAction(viewModel);
		const sortByNameAction = new SCMSortByNameAction(viewModel);
		const sortByPathAction = new SCMSortByPathAction(viewModel);
		const sortByStatusAction = new SCMSortByStatusAction(viewModel);
		const actions = [
			instantiationService.createInstance(SCMViewRepositoriesSuBMenuAction),
			new Separator(),
			...new RadioGroup([listAction, treeAction]).actions,
			new Separator(),
			...new RadioGroup([sortByNameAction, sortByPathAction, sortByStatusAction]).actions
		];

		super(
			'scm.viewsort',
			localize('sortAction', "View & Sort"),
			actions
		);

		this._register(comBinedDisposaBle(listAction, treeAction, sortByNameAction, sortByPathAction, sortByStatusAction));
	}
}

export class ToggleViewModeAction extends Action {

	static readonly ID = 'workBench.scm.action.toggleViewMode';
	static readonly LABEL = localize('toggleViewMode', "Toggle View Mode");

	constructor(id: string = ToggleViewModeAction.ID, laBel: string = ToggleViewModeAction.LABEL, private viewModel: ViewModel, private mode?: ViewModelMode) {
		super(id, laBel);
		this._register(this.viewModel.onDidChangeMode(this.onDidChangeMode, this));
		this.onDidChangeMode(this.viewModel.mode);
	}

	async run(): Promise<void> {
		if (typeof this.mode === 'undefined') {
			this.viewModel.mode = this.viewModel.mode === ViewModelMode.List ? ViewModelMode.Tree : ViewModelMode.List;
		} else {
			this.viewModel.mode = this.mode;
		}
	}

	private onDidChangeMode(mode: ViewModelMode): void {
		const iconClass = mode === ViewModelMode.List ? 'codicon-list-tree' : 'codicon-list-flat';
		this.class = `scm-action toggle-view-mode ${iconClass}`;
		this.checked = this.viewModel.mode === this.mode;
	}
}

class SCMViewModeListAction extends ToggleViewModeAction {
	constructor(viewModel: ViewModel) {
		super('workBench.scm.action.viewModeList', localize('viewModeList', "View as List"), viewModel, ViewModelMode.List);
	}
}

class SCMViewModeTreeAction extends ToggleViewModeAction {
	constructor(viewModel: ViewModel) {
		super('workBench.scm.action.viewModeTree', localize('viewModeTree', "View as Tree"), viewModel, ViewModelMode.Tree);
	}
}

aBstract class SCMSortAction extends Action {

	private readonly _listener: IDisposaBle;

	constructor(id: string, laBel: string, private viewModel: ViewModel, private sortKey: ViewModelSortKey) {
		super(id, laBel);

		this.checked = this.sortKey === ViewModelSortKey.Path;
		this.enaBled = this.viewModel?.mode === ViewModelMode.List ?? false;
		this._listener = viewModel?.onDidChangeMode(e => this.enaBled = e === ViewModelMode.List);
	}

	async run(): Promise<void> {
		if (this.sortKey !== this.viewModel.sortKey) {
			this.checked = !this.checked;
			this.viewModel.sortKey = this.sortKey;
		}
	}

	dispose(): void {
		this._listener.dispose();
		super.dispose();
	}
}

class SCMSortByNameAction extends SCMSortAction {
	static readonly ID = 'workBench.scm.action.sortByName';
	static readonly LABEL = localize('sortByName', "Sort By Name");

	constructor(viewModel: ViewModel) {
		super(SCMSortByNameAction.ID, SCMSortByNameAction.LABEL, viewModel, ViewModelSortKey.Name);
	}
}

class SCMSortByPathAction extends SCMSortAction {
	static readonly ID = 'workBench.scm.action.sortByPath';
	static readonly LABEL = localize('sortByPath', "Sort By Path");

	constructor(viewModel: ViewModel) {
		super(SCMSortByPathAction.ID, SCMSortByPathAction.LABEL, viewModel, ViewModelSortKey.Path);
	}
}

class SCMSortByStatusAction extends SCMSortAction {
	static readonly ID = 'workBench.scm.action.sortByStatus';
	static readonly LABEL = localize('sortByStatus', "Sort By Status");

	constructor(viewModel: ViewModel) {
		super(SCMSortByStatusAction.ID, SCMSortByStatusAction.LABEL, viewModel, ViewModelSortKey.Status);
	}
}

class SCMInputWidget extends DisposaBle {

	private readonly defaultInputFontFamily = DEFAULT_FONT_FAMILY;

	private element: HTMLElement;
	private editorContainer: HTMLElement;
	private placeholderTextContainer: HTMLElement;
	private inputEditor: CodeEditorWidget;

	private model: { readonly input: ISCMInput; readonly textModel: ITextModel; } | undefined;
	private repositoryContextKey: IContextKey<ISCMRepository | undefined>;
	private repositoryDisposaBles = new DisposaBleStore();

	private validation: IInputValidation | undefined;
	private validationDisposaBle: IDisposaBle = DisposaBle.None;

	readonly onDidChangeContentHeight: Event<void>;

	get input(): ISCMInput | undefined {
		return this.model?.input;
	}

	set input(input: ISCMInput | undefined) {
		if (input === this.input) {
			return;
		}

		this.validationDisposaBle.dispose();
		this.editorContainer.classList.remove('synthetic-focus');

		this.repositoryDisposaBles.dispose();
		this.repositoryDisposaBles = new DisposaBleStore();
		this.repositoryContextKey.set(input?.repository);

		if (!input) {
			this.model?.textModel.dispose();
			this.inputEditor.setModel(undefined);
			this.model = undefined;
			return;
		}

		let query: string | undefined;

		if (input.repository.provider.rootUri) {
			query = `rootUri=${encodeURIComponent(input.repository.provider.rootUri.toString())}`;
		}

		const uri = URI.from({
			scheme: Schemas.vscode,
			path: `scm/${input.repository.provider.contextValue}/${input.repository.provider.id}/input`,
			query
		});

		this.configurationService.updateValue('editor.wordBasedSuggestions', false, { resource: uri }, ConfigurationTarget.MEMORY);

		const mode = this.modeService.create('scminput');
		const textModel = this.modelService.getModel(uri) || this.modelService.createModel('', mode, uri);
		this.inputEditor.setModel(textModel);

		// Validation
		const validationDelayer = new ThrottledDelayer<any>(200);
		const validate = async () => {
			const position = this.inputEditor.getSelection()?.getStartPosition();
			const offset = position && textModel.getOffsetAt(position);
			const value = textModel.getValue();

			this.validation = await input.validateInput(value, offset || 0);
			this.renderValidation();
		};

		const triggerValidation = () => validationDelayer.trigger(validate);
		this.repositoryDisposaBles.add(validationDelayer);
		this.repositoryDisposaBles.add(this.inputEditor.onDidChangeCursorPosition(triggerValidation));

		// Adaptive indentation rules
		const opts = this.modelService.getCreationOptions(textModel.getLanguageIdentifier().language, textModel.uri, textModel.isForSimpleWidget);
		const onEnter = Event.filter(this.inputEditor.onKeyDown, e => e.keyCode === KeyCode.Enter);
		this.repositoryDisposaBles.add(onEnter(() => textModel.detectIndentation(opts.insertSpaces, opts.taBSize)));

		// Keep model in sync with API
		textModel.setValue(input.value);
		this.repositoryDisposaBles.add(input.onDidChange(value => {
			if (value === textModel.getValue()) { // circuit Breaker
				return;
			}
			textModel.setValue(value);
			this.inputEditor.setPosition(textModel.getFullModelRange().getEndPosition());
		}));

		// Keep API in sync with model, update placeholder visiBility and validate
		const updatePlaceholderVisiBility = () => this.placeholderTextContainer.classList.toggle('hidden', textModel.getValueLength() > 0);
		this.repositoryDisposaBles.add(textModel.onDidChangeContent(() => {
			input.setValue(textModel.getValue(), true);
			updatePlaceholderVisiBility();
			triggerValidation();
		}));
		updatePlaceholderVisiBility();

		// Update placeholder text
		const updatePlaceholderText = () => {
			const Binding = this.keyBindingService.lookupKeyBinding('scm.acceptInput');
			const laBel = Binding ? Binding.getLaBel() : (platform.isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter');
			const placeholderText = format(input.placeholder, laBel);

			this.inputEditor.updateOptions({ ariaLaBel: placeholderText });
			this.placeholderTextContainer.textContent = placeholderText;
		};
		this.repositoryDisposaBles.add(input.onDidChangePlaceholder(updatePlaceholderText));
		this.repositoryDisposaBles.add(this.keyBindingService.onDidUpdateKeyBindings(updatePlaceholderText));
		updatePlaceholderText();

		// Update input template
		let commitTemplate = '';
		const updateTemplate = () => {
			if (typeof input.repository.provider.commitTemplate === 'undefined' || !input.visiBle) {
				return;
			}

			const oldCommitTemplate = commitTemplate;
			commitTemplate = input.repository.provider.commitTemplate;

			const value = textModel.getValue();

			if (value && value !== oldCommitTemplate) {
				return;
			}

			textModel.setValue(commitTemplate);
		};
		this.repositoryDisposaBles.add(input.repository.provider.onDidChangeCommitTemplate(updateTemplate, this));
		updateTemplate();

		// Save model
		this.model = { input, textModel };
	}

	get position(): IPosition | null {
		return this.inputEditor.getPosition();
	}

	set position(position: IPosition | null) {
		if (position) {
			this.inputEditor.setPosition(position);
		}
	}

	constructor(
		container: HTMLElement,
		overflowWidgetsDomNode: HTMLElement,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IModelService private modelService: IModelService,
		@IModeService private modeService: IModeService,
		@IKeyBindingService private keyBindingService: IKeyBindingService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextViewService private readonly contextViewService: IContextViewService
	) {
		super();

		this.element = append(container, $('.scm-editor'));
		this.editorContainer = append(this.element, $('.scm-editor-container'));
		this.placeholderTextContainer = append(this.editorContainer, $('.scm-editor-placeholder'));

		const contextKeyService2 = contextKeyService.createScoped(this.element);
		this.repositoryContextKey = contextKeyService2.createKey('scmRepository', undefined);

		const editorOptions: IEditorConstructionOptions = {
			...getSimpleEditorOptions(),
			lineDecorationsWidth: 4,
			dragAndDrop: false,
			cursorWidth: 1,
			fontSize: 13,
			lineHeight: 20,
			fontFamily: this.getInputEditorFontFamily(),
			wrappingStrategy: 'advanced',
			wrappingIndent: 'none',
			padding: { top: 3, Bottom: 3 },
			quickSuggestions: false,
			scrollBar: { alwaysConsumeMouseWheel: false },
			overflowWidgetsDomNode
		};

		const codeEditorWidgetOptions: ICodeEditorWidgetOptions = {
			isSimpleWidget: true,
			contriButions: EditorExtensionsRegistry.getSomeEditorContriButions([
				SuggestController.ID,
				SnippetController2.ID,
				MenuPreventer.ID,
				SelectionClipBoardContriButionID,
				ContextMenuController.ID,
				ColorDetector.ID,
				ModesHoverController.ID,
				LinkDetector.ID
			])
		};

		const services = new ServiceCollection([IContextKeyService, contextKeyService2]);
		const instantiationService2 = instantiationService.createChild(services);
		this.inputEditor = instantiationService2.createInstance(CodeEditorWidget, this.editorContainer, editorOptions, codeEditorWidgetOptions);
		this._register(this.inputEditor);

		this._register(this.inputEditor.onDidFocusEditorText(() => {
			this.input?.repository.setSelected(true); // TODO@joao: remove
			this.editorContainer.classList.add('synthetic-focus');
			this.renderValidation();
		}));
		this._register(this.inputEditor.onDidBlurEditorText(() => {
			this.editorContainer.classList.remove('synthetic-focus');
			this.validationDisposaBle.dispose();
		}));

		const firstLineKey = contextKeyService2.createKey('scmInputIsInFirstLine', false);
		const lastLineKey = contextKeyService2.createKey('scmInputIsInLastLine', false);

		this._register(this.inputEditor.onDidChangeCursorPosition(({ position }) => {
			const viewModel = this.inputEditor._getViewModel()!;
			const lastLineNumBer = viewModel.getLineCount();
			const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);

			firstLineKey.set(viewPosition.lineNumBer === 1);
			lastLineKey.set(viewPosition.lineNumBer === lastLineNumBer);
		}));

		const onInputFontFamilyChanged = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.inputFontFamily'));
		this._register(onInputFontFamilyChanged(() => this.inputEditor.updateOptions({ fontFamily: this.getInputEditorFontFamily() })));

		this.onDidChangeContentHeight = Event.signal(Event.filter(this.inputEditor.onDidContentSizeChange, e => e.contentHeightChanged));
	}

	getContentHeight(): numBer {
		const editorContentHeight = this.inputEditor.getContentHeight();
		return Math.min(editorContentHeight, 134);
	}

	layout(): void {
		const editorHeight = this.getContentHeight();
		const dimension: Dimension = {
			width: this.element.clientWidth - 2,
			height: editorHeight,
		};

		this.inputEditor.layout(dimension);
		this.renderValidation();
	}

	focus(): void {
		this.inputEditor.focus();
		this.editorContainer.classList.add('synthetic-focus');
	}

	hasFocus(): Boolean {
		return this.inputEditor.hasTextFocus();
	}

	private renderValidation(): void {
		this.validationDisposaBle.dispose();

		this.editorContainer.classList.toggle('validation-info', this.validation?.type === InputValidationType.Information);
		this.editorContainer.classList.toggle('validation-warning', this.validation?.type === InputValidationType.Warning);
		this.editorContainer.classList.toggle('validation-error', this.validation?.type === InputValidationType.Error);

		if (!this.validation || !this.inputEditor.hasTextFocus()) {
			return;
		}

		this.validationDisposaBle = this.contextViewService.showContextView({
			getAnchor: () => this.editorContainer,
			render: container => {
				const element = append(container, $('.scm-editor-validation'));
				element.classList.toggle('validation-info', this.validation!.type === InputValidationType.Information);
				element.classList.toggle('validation-warning', this.validation!.type === InputValidationType.Warning);
				element.classList.toggle('validation-error', this.validation!.type === InputValidationType.Error);
				element.style.width = `${this.editorContainer.clientWidth}px`;
				element.textContent = this.validation!.message;
				return DisposaBle.None;
			},
			anchorAlignment: AnchorAlignment.LEFT
		});
	}

	private getInputEditorFontFamily(): string {
		const inputFontFamily = this.configurationService.getValue<string>('scm.inputFontFamily').trim();

		if (inputFontFamily.toLowerCase() === 'editor') {
			return this.configurationService.getValue<string>('editor.fontFamily').trim();
		}

		if (inputFontFamily.length !== 0 && inputFontFamily.toLowerCase() !== 'default') {
			return inputFontFamily;
		}

		return this.defaultInputFontFamily;
	}

	clearValidation(): void {
		this.validationDisposaBle.dispose();
	}

	dispose(): void {
		this.input = undefined;
		this.repositoryDisposaBles.dispose();
		this.validationDisposaBle.dispose();
		super.dispose();
	}
}

class SCMCollapseAction extends Action {

	private allCollapsed = false;

	constructor(private viewModel: ViewModel) {
		super('scm.collapse', undefined, undefined, true);
		this._register(viewModel.onDidChangeRepositoryCollapseState(this.update, this));
		this.update();
	}

	async run(): Promise<void> {
		if (this.allCollapsed) {
			this.viewModel.expandAllProviders();
		} else {
			this.viewModel.collapseAllProviders();
		}
	}

	private update(): void {
		const isAnyProviderCollapsiBle = this.viewModel.isAnyProviderCollapsiBle();

		this.enaBled = isAnyProviderCollapsiBle;
		this.allCollapsed = isAnyProviderCollapsiBle && this.viewModel.areAllProvidersCollapsed();
		this.laBel = this.allCollapsed ? localize('expand all', "Expand All Repositories") : localize('collapse all', "Collapse All Repositories");
		this.class = this.allCollapsed ? Codicon.expandAll.classNames : Codicon.collapseAll.classNames;
	}
}

export class SCMViewPane extends ViewPane {

	private _onDidLayout = new Emitter<void>();
	private layoutCache: ISCMLayout = {
		height: undefined,
		width: undefined,
		onDidChange: this._onDidLayout.event
	};

	private listContainer!: HTMLElement;
	private tree!: WorkBenchCompressiBleOBjectTree<TreeElement, FuzzyScore>;
	private viewModel!: ViewModel;
	private listLaBels!: ResourceLaBels;
	private inputRenderer!: InputRenderer;
	private toggleViewModelModeAction: ToggleViewModeAction | undefined;

	constructor(
		options: IViewPaneOptions,
		@ISCMService private scmService: ISCMService,
		@ISCMViewService private scmViewService: ISCMViewService,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
		@IThemeService protected themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextViewService protected contextViewService: IContextViewService,
		@ICommandService protected commandService: ICommandService,
		@IEditorService protected editorService: IEditorService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IMenuService protected menuService: IMenuService,
		@IStorageService private storageService: IStorageService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this._register(Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository)(() => this._onDidChangeViewWelcomeState.fire()));

		this._register(this.scmViewService.menus.titleMenu.onDidChangeTitle(this.updateActions, this));
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		// List
		this.listContainer = append(container, $('.scm-view.show-file-icons'));

		const overflowWidgetsDomNode = $('.scm-overflow-widgets-container.monaco-editor');

		const updateActionsVisiBility = () => this.listContainer.classList.toggle('show-actions', this.configurationService.getValue<Boolean>('scm.alwaysShowActions'));
		this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowActions'))(updateActionsVisiBility));
		updateActionsVisiBility();

		const updateProviderCountVisiBility = () => {
			const value = this.configurationService.getValue<'hidden' | 'auto' | 'visiBle'>('scm.providerCountBadge');
			this.listContainer.classList.toggle('hide-provider-counts', value === 'hidden');
			this.listContainer.classList.toggle('auto-provider-counts', value === 'auto');
		};
		this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.providerCountBadge'))(updateProviderCountVisiBility));
		updateProviderCountVisiBility();

		this._register(this.scmViewService.onDidChangeVisiBleRepositories(() => this.updateActions()));

		this.inputRenderer = this.instantiationService.createInstance(InputRenderer, this.layoutCache, overflowWidgetsDomNode, (input, height) => this.tree.updateElementHeight(input, height));
		const delegate = new ListDelegate(this.inputRenderer);

		const actionViewItemProvider = (action: IAction) => this.getActionViewItem(action);

		this.listLaBels = this.instantiationService.createInstance(ResourceLaBels, { onDidChangeVisiBility: this.onDidChangeBodyVisiBility });
		this._register(this.listLaBels);

		const actionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
		this._register(actionRunner);
		this._register(actionRunner.onDidBeforeRun(() => this.tree.domFocus()));

		const renderers: ICompressiBleTreeRenderer<any, FuzzyScore, any>[] = [
			this.instantiationService.createInstance(RepositoryRenderer, actionViewItemProvider),
			this.inputRenderer,
			this.instantiationService.createInstance(ResourceGroupRenderer, actionViewItemProvider),
			this.instantiationService.createInstance(ResourceRenderer, () => this.viewModel, this.listLaBels, actionViewItemProvider, actionRunner)
		];

		const filter = new SCMTreeFilter();
		const sorter = new SCMTreeSorter(() => this.viewModel);
		const keyBoardNavigationLaBelProvider = this.instantiationService.createInstance(SCMTreeKeyBoardNavigationLaBelProvider);
		const identityProvider = new SCMResourceIdentityProvider();

		this.tree = this.instantiationService.createInstance(
			WorkBenchCompressiBleOBjectTree,
			'SCM Tree Repo',
			this.listContainer,
			delegate,
			renderers,
			{
				identityProvider,
				horizontalScrolling: false,
				setRowLineHeight: false,
				filter,
				sorter,
				keyBoardNavigationLaBelProvider,
				overrideStyles: {
					listBackground: this.viewDescriptorService.getViewLocationById(this.id) === ViewContainerLocation.SideBar ? SIDE_BAR_BACKGROUND : PANEL_BACKGROUND
				},
				accessiBilityProvider: this.instantiationService.createInstance(SCMAccessiBilityProvider)
			}) as WorkBenchCompressiBleOBjectTree<TreeElement, FuzzyScore>;

		this._register(this.tree.onDidOpen(this.open, this));

		this._register(this.tree.onContextMenu(this.onListContextMenu, this));
		this._register(this.tree.onDidScroll(this.inputRenderer.clearValidation, this.inputRenderer));
		this._register(this.tree);

		append(this.listContainer, overflowWidgetsDomNode);

		let viewMode = this.configurationService.getValue<'tree' | 'list'>('scm.defaultViewMode') === 'list' ? ViewModelMode.List : ViewModelMode.Tree;
		const storageMode = this.storageService.get(`scm.viewMode`, StorageScope.WORKSPACE) as ViewModelMode;

		if (typeof storageMode === 'string') {
			viewMode = storageMode;
		}

		this.viewModel = this.instantiationService.createInstance(ViewModel, this.tree, this.inputRenderer, viewMode, ViewModelSortKey.Path);
		this._register(this.viewModel);

		this.listContainer.classList.add('file-icon-themaBle-tree');
		this.listContainer.classList.add('show-file-icons');

		this.updateIndentStyles(this.themeService.getFileIconTheme());
		this._register(this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this));
		this._register(this.viewModel.onDidChangeMode(this.onDidChangeMode, this));

		this.toggleViewModelModeAction = new ToggleViewModeAction(ToggleViewModeAction.ID, ToggleViewModeAction.LABEL, this.viewModel);
		this._register(this.toggleViewModelModeAction);

		this._register(this.onDidChangeBodyVisiBility(this.viewModel.setVisiBle, this.viewModel));

		this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowRepositories'))(this.updateActions, this));
		this.updateActions();
	}

	private updateIndentStyles(theme: IFileIconTheme): void {
		this.listContainer.classList.toggle('list-view-mode', this.viewModel.mode === ViewModelMode.List);
		this.listContainer.classList.toggle('tree-view-mode', this.viewModel.mode === ViewModelMode.Tree);
		this.listContainer.classList.toggle('align-icons-and-twisties', (this.viewModel.mode === ViewModelMode.List && theme.hasFileIcons) || (theme.hasFileIcons && !theme.hasFolderIcons));
		this.listContainer.classList.toggle('hide-arrows', this.viewModel.mode === ViewModelMode.Tree && theme.hidesExplorerArrows === true);
	}

	private onDidChangeMode(): void {
		this.updateIndentStyles(this.themeService.getFileIconTheme());
		this.storageService.store(`scm.viewMode`, this.viewModel.mode, StorageScope.WORKSPACE);
	}

	layoutBody(height: numBer | undefined = this.layoutCache.height, width: numBer | undefined = this.layoutCache.width): void {
		if (height === undefined) {
			return;
		}

		if (width !== undefined) {
			super.layoutBody(height, width);
		}

		this.layoutCache.height = height;
		this.layoutCache.width = width;
		this._onDidLayout.fire();

		this.listContainer.style.height = `${height}px`;
		this.tree.layout(height, width);
	}

	focus(): void {
		super.focus();

		if (this.isExpanded()) {
			this.viewModel.focus();
		}
	}

	getActions(): IAction[] {
		const result = [];

		if (this.toggleViewModelModeAction) {
			result.push(this.toggleViewModelModeAction);
		}

		if (!this.viewModel) {
			return result;
		}

		if (this.scmViewService.visiBleRepositories.length < 2) {
			return [...result, ...this.viewModel.getViewActions()];
		}

		return [
			...result,
			new SCMCollapseAction(this.viewModel),
			...this.viewModel.getViewActions()
		];
	}

	getSecondaryActions(): IAction[] {
		if (!this.viewModel) {
			return [];
		}

		return this.viewModel.getViewSecondaryActions();
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action instanceof StatusBarAction) {
			return new StatusBarActionViewItem(action);
		}

		return super.getActionViewItem(action);
	}

	getActionsContext(): any {
		if (!this.viewModel) {
			return [];
		}

		return this.viewModel.getViewActionsContext();
	}

	private async open(e: IOpenEvent<TreeElement | null>): Promise<void> {
		if (!e.element) {
			return;
		} else if (isSCMRepository(e.element)) { // TODO@joao: remove
			e.element.setSelected(true);
			return;
		} else if (isSCMResourceGroup(e.element)) { // TODO@joao: remove
			const provider = e.element.provider;
			const repository = this.scmService.repositories.find(r => r.provider === provider);
			repository?.setSelected(true);
			return;
		} else if (ResourceTree.isResourceNode(e.element)) { // TODO@joao: remove
			const provider = e.element.context.provider;
			const repository = this.scmService.repositories.find(r => r.provider === provider);
			repository?.setSelected(true);
			return;
		} else if (isSCMInput(e.element)) {
			e.element.repository.setSelected(true); // TODO@joao: remove

			const widget = this.inputRenderer.getRenderedInputWidget(e.element);

			if (widget) {
				widget.focus();

				const selection = this.tree.getSelection();

				if (selection.length === 1 && selection[0] === e.element) {
					setTimeout(() => this.tree.setSelection([]));
				}
			}

			return;
		}

		// ISCMResource
		await e.element.open(!!e.editorOptions.preserveFocus);

		if (e.editorOptions.pinned) {
			const activeEditorPane = this.editorService.activeEditorPane;

			if (activeEditorPane) {
				activeEditorPane.group.pinEditor(activeEditorPane.input);
			}
		}

		// TODO@joao: remove
		const provider = e.element.resourceGroup.provider;
		const repository = this.scmService.repositories.find(r => r.provider === provider);
		repository?.setSelected(true);
	}

	private onListContextMenu(e: ITreeContextMenuEvent<TreeElement | null>): void {
		if (!e.element) {
			return this.contextMenuService.showContextMenu({
				getAnchor: () => e.anchor,
				getActions: () => getRepositoryVisiBilityActions(this.scmService, this.scmViewService)
			});
		}

		const element = e.element;
		let context: any = element;
		let actions: IAction[] = [];
		let disposaBle: IDisposaBle = DisposaBle.None;

		if (isSCMRepository(element)) {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
			const menu = menus.repositoryMenu;
			context = element.provider;
			[actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);
		} else if (isSCMInput(element)) {
			// noop
		} else if (isSCMResourceGroup(element)) {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
			const menu = menus.getResourceGroupMenu(element);
			[actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);
		} else if (ResourceTree.isResourceNode(element)) {
			if (element.element) {
				const menus = this.scmViewService.menus.getRepositoryMenus(element.element.resourceGroup.provider);
				const menu = menus.getResourceMenu(element.element);
				[actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);
			} else {
				const menus = this.scmViewService.menus.getRepositoryMenus(element.context.provider);
				const menu = menus.getResourceFolderMenu(element.context);
				[actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);
			}
		} else {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.resourceGroup.provider);
			const menu = menus.getResourceMenu(element);
			[actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);
		}

		const actionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
		actionRunner.onDidBeforeRun(() => this.tree.domFocus());

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor,
			getActions: () => actions,
			getActionsContext: () => context,
			actionRunner,
			onHide() {
				disposaBle.dispose();
			}
		});
	}

	private getSelectedResources(): (ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>)[] {
		return this.tree.getSelection()
			.filter(r => !!r && !isSCMResourceGroup(r))! as any;
	}

	shouldShowWelcome(): Boolean {
		return this.scmService.repositories.length === 0;
	}
}

export const scmProviderSeparatorBorderColor = registerColor('scm.providerBorder', { dark: '#454545', light: '#C8C8C8', hc: contrastBorder }, localize('scm.providerBorder', "SCM Provider separator Border."));

registerThemingParticipant((theme, collector) => {
	const inputBackgroundColor = theme.getColor(inputBackground);
	if (inputBackgroundColor) {
		collector.addRule(`.scm-view .scm-editor-container .monaco-editor-Background,
		.scm-view .scm-editor-container .monaco-editor,
		.scm-view .scm-editor-container .monaco-editor .margin
		{ Background-color: ${inputBackgroundColor} !important; }`);
	}

	const inputForegroundColor = theme.getColor(inputForeground);
	if (inputForegroundColor) {
		collector.addRule(`.scm-view .scm-editor-container .mtk1 { color: ${inputForegroundColor}; }`);
	}

	const inputBorderColor = theme.getColor(inputBorder);
	if (inputBorderColor) {
		collector.addRule(`.scm-view .scm-editor-container { outline: 1px solid ${inputBorderColor}; }`);
	}

	const panelInputBorder = theme.getColor(PANEL_INPUT_BORDER);
	if (panelInputBorder) {
		collector.addRule(`.monaco-workBench .part.panel .scm-view .scm-editor-container { outline: 1px solid ${panelInputBorder}; }`);
	}

	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.addRule(`.scm-view .scm-editor-container.synthetic-focus { outline: 1px solid ${focusBorderColor}; }`);
	}

	const inputPlaceholderForegroundColor = theme.getColor(inputPlaceholderForeground);
	if (inputPlaceholderForegroundColor) {
		collector.addRule(`.scm-view .scm-editor-placeholder { color: ${inputPlaceholderForegroundColor}; }`);
	}

	const inputValidationInfoBorderColor = theme.getColor(inputValidationInfoBorder);
	if (inputValidationInfoBorderColor) {
		collector.addRule(`.scm-view .scm-editor-container.validation-info { outline: 1px solid ${inputValidationInfoBorderColor} !important; }`);
		collector.addRule(`.scm-editor-validation.validation-info { Border-color: ${inputValidationInfoBorderColor}; }`);
	}

	const inputValidationInfoBackgroundColor = theme.getColor(inputValidationInfoBackground);
	if (inputValidationInfoBackgroundColor) {
		collector.addRule(`.scm-editor-validation.validation-info { Background-color: ${inputValidationInfoBackgroundColor}; }`);
	}

	const inputValidationInfoForegroundColor = theme.getColor(inputValidationInfoForeground);
	if (inputValidationInfoForegroundColor) {
		collector.addRule(`.scm-editor-validation.validation-info { color: ${inputValidationInfoForegroundColor}; }`);
	}

	const inputValidationWarningBorderColor = theme.getColor(inputValidationWarningBorder);
	if (inputValidationWarningBorderColor) {
		collector.addRule(`.scm-view .scm-editor-container.validation-warning { outline: 1px solid ${inputValidationWarningBorderColor} !important; }`);
		collector.addRule(`.scm-editor-validation.validation-warning { Border-color: ${inputValidationWarningBorderColor}; }`);
	}

	const inputValidationWarningBackgroundColor = theme.getColor(inputValidationWarningBackground);
	if (inputValidationWarningBackgroundColor) {
		collector.addRule(`.scm-editor-validation.validation-warning { Background-color: ${inputValidationWarningBackgroundColor}; }`);
	}

	const inputValidationWarningForegroundColor = theme.getColor(inputValidationWarningForeground);
	if (inputValidationWarningForegroundColor) {
		collector.addRule(`.scm-editor-validation.validation-warning { color: ${inputValidationWarningForegroundColor}; }`);
	}

	const inputValidationErrorBorderColor = theme.getColor(inputValidationErrorBorder);
	if (inputValidationErrorBorderColor) {
		collector.addRule(`.scm-view .scm-editor-container.validation-error { outline: 1px solid ${inputValidationErrorBorderColor} !important; }`);
		collector.addRule(`.scm-editor-validation.validation-error { Border-color: ${inputValidationErrorBorderColor}; }`);
	}

	const inputValidationErrorBackgroundColor = theme.getColor(inputValidationErrorBackground);
	if (inputValidationErrorBackgroundColor) {
		collector.addRule(`.scm-editor-validation.validation-error { Background-color: ${inputValidationErrorBackgroundColor}; }`);
	}

	const inputValidationErrorForegroundColor = theme.getColor(inputValidationErrorForeground);
	if (inputValidationErrorForegroundColor) {
		collector.addRule(`.scm-editor-validation.validation-error { color: ${inputValidationErrorForegroundColor}; }`);
	}

	const repositoryStatusActionsBorderColor = theme.getColor(SIDE_BAR_BORDER);
	if (repositoryStatusActionsBorderColor) {
		collector.addRule(`.scm-view .scm-provider > .status > .monaco-action-Bar > .actions-container { Border-color: ${repositoryStatusActionsBorderColor}; }`);
	}
});
