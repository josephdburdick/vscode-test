/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/scm';
import { Event, Emitter } from 'vs/bAse/common/event';
import { bAsenAme, dirnAme } from 'vs/bAse/common/resources';
import { IDisposAble, DisposAble, DisposAbleStore, combinedDisposAble, dispose, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { Append, $, Dimension, AsCSSUrl } from 'vs/bAse/browser/dom';
import { IListVirtuAlDelegAte, IIdentityProvider } from 'vs/bAse/browser/ui/list/list';
import { ISCMResourceGroup, ISCMResource, InputVAlidAtionType, ISCMRepository, ISCMInput, IInputVAlidAtion, ISCMViewService, ISCMViewVisibleRepositoryChAngeEvent, ISCMService } from 'vs/workbench/contrib/scm/common/scm';
import { ResourceLAbels, IResourceLAbel } from 'vs/workbench/browser/lAbels';
import { CountBAdge } from 'vs/bAse/browser/ui/countBAdge/countBAdge';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextViewService, IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { MenuItemAction, IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { IAction, IActionViewItem, ActionRunner, Action, RAdioGroup, SepArAtor, SubmenuAction, IActionViewItemProvider } from 'vs/bAse/common/Actions';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IThemeService, registerThemingPArticipAnt, IFileIconTheme } from 'vs/plAtform/theme/common/themeService';
import { isSCMResource, isSCMResourceGroup, connectPrimAryMenuToInlineActionBAr, isSCMRepository, isSCMInput, collectContextMenuActions, StAtusBArAction, StAtusBArActionViewItem, getRepositoryVisibilityActions } from './util';
import { AttAchBAdgeStyler } from 'vs/plAtform/theme/common/styler';
import { WorkbenchCompressibleObjectTree, IOpenEvent } from 'vs/plAtform/list/browser/listService';
import { IConfigurAtionService, ConfigurAtionTArget, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { disposAbleTimeout, ThrottledDelAyer } from 'vs/bAse/common/Async';
import { ITreeNode, ITreeFilter, ITreeSorter, ITreeContextMenuEvent } from 'vs/bAse/browser/ui/tree/tree';
import { ResourceTree, IResourceNode } from 'vs/bAse/common/resourceTree';
import { ISplice } from 'vs/bAse/common/sequence';
import { ICompressibleTreeRenderer, ICompressibleKeyboArdNAvigAtionLAbelProvider } from 'vs/bAse/browser/ui/tree/objectTree';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { ICompressedTreeNode, ICompressedTreeElement } from 'vs/bAse/browser/ui/tree/compressedObjectTreeModel';
import { URI } from 'vs/bAse/common/uri';
import { FileKind } from 'vs/plAtform/files/common/files';
import { compAreFileNAmes, compArePAths } from 'vs/bAse/common/compArers';
import { FuzzyScore, creAteMAtches, IMAtch } from 'vs/bAse/common/filters';
import { IViewDescriptorService, ViewContAinerLocAtion } from 'vs/workbench/common/views';
import { locAlize } from 'vs/nls';
import { coAlesce, flAtten } from 'vs/bAse/common/ArrAys';
import { memoize } from 'vs/bAse/common/decorAtors';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workbench/common/editor';
import { SIDE_BAR_BACKGROUND, SIDE_BAR_BORDER, PANEL_BACKGROUND, PANEL_INPUT_BORDER } from 'vs/workbench/common/theme';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'vs/editor/browser/widget/codeEditorWidget';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorConstructionOptions } from 'vs/editor/browser/editorBrowser';
import { getSimpleEditorOptions } from 'vs/workbench/contrib/codeEditor/browser/simpleEditorOptions';
import { IModelService } from 'vs/editor/common/services/modelService';
import { EditorExtensionsRegistry } from 'vs/editor/browser/editorExtensions';
import { MenuPreventer } from 'vs/workbench/contrib/codeEditor/browser/menuPreventer';
import { SelectionClipboArdContributionID } from 'vs/workbench/contrib/codeEditor/browser/selectionClipboArd';
import { ContextMenuController } from 'vs/editor/contrib/contextmenu/contextmenu';
import * As plAtform from 'vs/bAse/common/plAtform';
import { compAre, formAt } from 'vs/bAse/common/strings';
import { inputPlAceholderForeground, inputVAlidAtionInfoBorder, inputVAlidAtionWArningBorder, inputVAlidAtionErrorBorder, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoForeground, inputVAlidAtionWArningBAckground, inputVAlidAtionWArningForeground, inputVAlidAtionErrorBAckground, inputVAlidAtionErrorForeground, inputBAckground, inputForeground, inputBorder, focusBorder, registerColor, contrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { SchemAs } from 'vs/bAse/common/network';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { ModesHoverController } from 'vs/editor/contrib/hover/hover';
import { ColorDetector } from 'vs/editor/contrib/colorPicker/colorDetector';
import { LinkDetector } from 'vs/editor/contrib/links/links';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DEFAULT_FONT_FAMILY } from 'vs/workbench/browser/style';
import { Codicon } from 'vs/bAse/common/codicons';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { RepositoryRenderer } from 'vs/workbench/contrib/scm/browser/scmRepositoryRenderer';
import { IPosition } from 'vs/editor/common/core/position';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

type TreeElement = ISCMRepository | ISCMInput | ISCMResourceGroup | IResourceNode<ISCMResource, ISCMResourceGroup> | ISCMResource;

function splitMAtches(uri: URI, filterDAtA: FuzzyScore | undefined): [IMAtch[] | undefined, IMAtch[] | undefined] {
	let mAtches: IMAtch[] | undefined;
	let descriptionMAtches: IMAtch[] | undefined;

	if (filterDAtA) {
		mAtches = [];
		descriptionMAtches = [];

		const fileNAme = bAsenAme(uri);
		const AllMAtches = creAteMAtches(filterDAtA);

		for (const mAtch of AllMAtches) {
			if (mAtch.stArt < fileNAme.length) {
				mAtches!.push(
					{
						stArt: mAtch.stArt,
						end: MAth.min(mAtch.end, fileNAme.length)
					}
				);
			} else {
				descriptionMAtches!.push(
					{
						stArt: mAtch.stArt - (fileNAme.length + 1),
						end: mAtch.end - (fileNAme.length + 1)
					}
				);
			}
		}
	}

	return [mAtches, descriptionMAtches];
}

interfAce ISCMLAyout {
	height: number | undefined;
	width: number | undefined;
	reAdonly onDidChAnge: Event<void>;
}

interfAce InputTemplAte {
	reAdonly inputWidget: SCMInputWidget;
	disposAble: IDisposAble;
	reAdonly templAteDisposAble: IDisposAble;
}

clAss InputRenderer implements ICompressibleTreeRenderer<ISCMInput, FuzzyScore, InputTemplAte> {

	stAtic reAdonly DEFAULT_HEIGHT = 26;

	stAtic reAdonly TEMPLATE_ID = 'input';
	get templAteId(): string { return InputRenderer.TEMPLATE_ID; }

	privAte inputWidgets = new MAp<ISCMInput, SCMInputWidget>();
	privAte contentHeights = new WeAkMAp<ISCMInput, number>();
	privAte editorPositions = new WeAkMAp<ISCMInput, IPosition>();

	constructor(
		privAte outerLAyout: ISCMLAyout,
		privAte overflowWidgetsDomNode: HTMLElement,
		privAte updAteHeight: (input: ISCMInput, height: number) => void,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
	) { }

	renderTemplAte(contAiner: HTMLElement): InputTemplAte {
		// hAck
		(contAiner.pArentElement!.pArentElement!.querySelector('.monAco-tl-twistie')! As HTMLElement).clAssList.Add('force-no-twistie');

		const disposAbles = new DisposAbleStore();
		const inputElement = Append(contAiner, $('.scm-input'));
		const inputWidget = this.instAntiAtionService.creAteInstAnce(SCMInputWidget, inputElement, this.overflowWidgetsDomNode);
		disposAbles.Add(inputWidget);

		return { inputWidget, disposAble: DisposAble.None, templAteDisposAble: disposAbles };
	}

	renderElement(node: ITreeNode<ISCMInput, FuzzyScore>, index: number, templAteDAtA: InputTemplAte): void {
		templAteDAtA.disposAble.dispose();

		const disposAbles = new DisposAbleStore();
		const input = node.element;
		templAteDAtA.inputWidget.input = input;

		// Remember widget
		this.inputWidgets.set(input, templAteDAtA.inputWidget);
		disposAbles.Add({ dispose: () => this.inputWidgets.delete(input) });

		// Widget position
		const position = this.editorPositions.get(input);

		if (position) {
			templAteDAtA.inputWidget.position = position;
		}

		disposAbles.Add(toDisposAble(() => {
			const position = templAteDAtA.inputWidget.position;

			if (position) {
				this.editorPositions.set(input, position);
			}
		}));

		// Rerender the element whenever the editor content height chAnges
		const onDidChAngeContentHeight = () => {
			const contentHeight = templAteDAtA.inputWidget.getContentHeight();
			const lAstContentHeight = this.contentHeights.get(input)!;
			this.contentHeights.set(input, contentHeight);

			if (lAstContentHeight !== contentHeight) {
				this.updAteHeight(input, contentHeight + 10);
				templAteDAtA.inputWidget.lAyout();
			}
		};

		const stArtListeningContentHeightChAnge = () => {
			disposAbles.Add(templAteDAtA.inputWidget.onDidChAngeContentHeight(onDidChAngeContentHeight));
			onDidChAngeContentHeight();
		};

		// Setup height chAnge listener on next tick
		const timeout = disposAbleTimeout(stArtListeningContentHeightChAnge, 0);
		disposAbles.Add(timeout);

		// LAyout the editor whenever the outer lAyout hAppens
		const lAyoutEditor = () => templAteDAtA.inputWidget.lAyout();
		disposAbles.Add(this.outerLAyout.onDidChAnge(lAyoutEditor));
		lAyoutEditor();

		templAteDAtA.disposAble = disposAbles;
	}

	renderCompressedElements(): void {
		throw new Error('Should never hAppen since node is incompressible');
	}

	disposeElement(group: ITreeNode<ISCMInput, FuzzyScore>, index: number, templAte: InputTemplAte): void {
		templAte.disposAble.dispose();
	}

	disposeTemplAte(templAteDAtA: InputTemplAte): void {
		templAteDAtA.disposAble.dispose();
		templAteDAtA.templAteDisposAble.dispose();
	}

	getHeight(input: ISCMInput): number {
		return (this.contentHeights.get(input) ?? InputRenderer.DEFAULT_HEIGHT) + 10;
	}

	getRenderedInputWidget(input: ISCMInput): SCMInputWidget | undefined {
		return this.inputWidgets.get(input);
	}

	getFocusedInput(): ISCMInput | undefined {
		for (const [input, inputWidget] of this.inputWidgets) {
			if (inputWidget.hAsFocus()) {
				return input;
			}
		}

		return undefined;
	}

	cleArVAlidAtion(): void {
		for (const [, inputWidget] of this.inputWidgets) {
			inputWidget.cleArVAlidAtion();
		}
	}
}

interfAce ResourceGroupTemplAte {
	reAdonly nAme: HTMLElement;
	reAdonly count: CountBAdge;
	reAdonly ActionBAr: ActionBAr;
	elementDisposAbles: IDisposAble;
	reAdonly disposAbles: IDisposAble;
}

clAss ResourceGroupRenderer implements ICompressibleTreeRenderer<ISCMResourceGroup, FuzzyScore, ResourceGroupTemplAte> {

	stAtic reAdonly TEMPLATE_ID = 'resource group';
	get templAteId(): string { return ResourceGroupRenderer.TEMPLATE_ID; }

	constructor(
		privAte ActionViewItemProvider: IActionViewItemProvider,
		@ISCMViewService privAte scmViewService: ISCMViewService,
		@IThemeService privAte themeService: IThemeService,
	) { }

	renderTemplAte(contAiner: HTMLElement): ResourceGroupTemplAte {
		// hAck
		(contAiner.pArentElement!.pArentElement!.querySelector('.monAco-tl-twistie')! As HTMLElement).clAssList.Add('force-twistie');

		const element = Append(contAiner, $('.resource-group'));
		const nAme = Append(element, $('.nAme'));
		const ActionsContAiner = Append(element, $('.Actions'));
		const ActionBAr = new ActionBAr(ActionsContAiner, { ActionViewItemProvider: this.ActionViewItemProvider });
		const countContAiner = Append(element, $('.count'));
		const count = new CountBAdge(countContAiner);
		const styler = AttAchBAdgeStyler(count, this.themeService);
		const elementDisposAbles = DisposAble.None;
		const disposAbles = combinedDisposAble(ActionBAr, styler);

		return { nAme, count, ActionBAr, elementDisposAbles, disposAbles };
	}

	renderElement(node: ITreeNode<ISCMResourceGroup, FuzzyScore>, index: number, templAte: ResourceGroupTemplAte): void {
		templAte.elementDisposAbles.dispose();

		const group = node.element;
		templAte.nAme.textContent = group.lAbel;
		templAte.ActionBAr.cleAr();
		templAte.ActionBAr.context = group;
		templAte.count.setCount(group.elements.length);

		const disposAbles = new DisposAbleStore();
		const menus = this.scmViewService.menus.getRepositoryMenus(group.provider);
		disposAbles.Add(connectPrimAryMenuToInlineActionBAr(menus.getResourceGroupMenu(group), templAte.ActionBAr));

		templAte.elementDisposAbles = disposAbles;
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResourceGroup>, FuzzyScore>, index: number, templAteDAtA: ResourceGroupTemplAte, height: number | undefined): void {
		throw new Error('Should never hAppen since node is incompressible');
	}

	disposeElement(group: ITreeNode<ISCMResourceGroup, FuzzyScore>, index: number, templAte: ResourceGroupTemplAte): void {
		templAte.elementDisposAbles.dispose();
	}

	disposeTemplAte(templAte: ResourceGroupTemplAte): void {
		templAte.elementDisposAbles.dispose();
		templAte.disposAbles.dispose();
	}
}

interfAce ResourceTemplAte {
	element: HTMLElement;
	nAme: HTMLElement;
	fileLAbel: IResourceLAbel;
	decorAtionIcon: HTMLElement;
	ActionBAr: ActionBAr;
	elementDisposAbles: IDisposAble;
	disposAbles: IDisposAble;
}

clAss RepositoryPAneActionRunner extends ActionRunner {

	constructor(privAte getSelectedResources: () => (ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>)[]) {
		super();
	}

	Async runAction(Action: IAction, context: ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>): Promise<Any> {
		if (!(Action instAnceof MenuItemAction)) {
			return super.runAction(Action, context);
		}

		const selection = this.getSelectedResources();
		const contextIsSelected = selection.some(s => s === context);
		const ActuAlContext = contextIsSelected ? selection : [context];
		const Args = flAtten(ActuAlContext.mAp(e => ResourceTree.isResourceNode(e) ? ResourceTree.collect(e) : [e]));
		AwAit Action.run(...Args);
	}
}

clAss ResourceRenderer implements ICompressibleTreeRenderer<ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore, ResourceTemplAte> {

	stAtic reAdonly TEMPLATE_ID = 'resource';
	get templAteId(): string { return ResourceRenderer.TEMPLATE_ID; }

	constructor(
		privAte viewModelProvider: () => ViewModel,
		privAte lAbels: ResourceLAbels,
		privAte ActionViewItemProvider: IActionViewItemProvider,
		privAte ActionRunner: ActionRunner,
		@ISCMViewService privAte scmViewService: ISCMViewService,
		@IThemeService privAte themeService: IThemeService
	) { }

	renderTemplAte(contAiner: HTMLElement): ResourceTemplAte {
		const element = Append(contAiner, $('.resource'));
		const nAme = Append(element, $('.nAme'));
		const fileLAbel = this.lAbels.creAte(nAme, { supportDescriptionHighlights: true, supportHighlights: true });
		const ActionsContAiner = Append(fileLAbel.element, $('.Actions'));
		const ActionBAr = new ActionBAr(ActionsContAiner, {
			ActionViewItemProvider: this.ActionViewItemProvider,
			ActionRunner: this.ActionRunner
		});

		const decorAtionIcon = Append(element, $('.decorAtion-icon'));
		const disposAbles = combinedDisposAble(ActionBAr, fileLAbel);

		return { element, nAme, fileLAbel, decorAtionIcon, ActionBAr, elementDisposAbles: DisposAble.None, disposAbles };
	}

	renderElement(node: ITreeNode<ISCMResource, FuzzyScore> | ITreeNode<ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore>, index: number, templAte: ResourceTemplAte): void {
		templAte.elementDisposAbles.dispose();

		const elementDisposAbles = new DisposAbleStore();
		const resourceOrFolder = node.element;
		const iconResource = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.element : resourceOrFolder;
		const uri = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.uri : resourceOrFolder.sourceUri;
		const fileKind = ResourceTree.isResourceNode(resourceOrFolder) ? FileKind.FOLDER : FileKind.FILE;
		const viewModel = this.viewModelProvider();
		const [mAtches, descriptionMAtches] = splitMAtches(uri, node.filterDAtA);
		const tooltip = !ResourceTree.isResourceNode(resourceOrFolder) && resourceOrFolder.decorAtions.tooltip || '';

		templAte.ActionBAr.cleAr();
		templAte.ActionBAr.context = resourceOrFolder;

		if (ResourceTree.isResourceNode(resourceOrFolder)) {
			if (resourceOrFolder.element) {
				const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.element.resourceGroup.provider);
				elementDisposAbles.Add(connectPrimAryMenuToInlineActionBAr(menus.getResourceMenu(resourceOrFolder.element), templAte.ActionBAr));
				templAte.nAme.clAssList.toggle('strike-through', resourceOrFolder.element.decorAtions.strikeThrough);
				templAte.element.clAssList.toggle('fAded', resourceOrFolder.element.decorAtions.fAded);
			} else {
				const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.context.provider);
				elementDisposAbles.Add(connectPrimAryMenuToInlineActionBAr(menus.getResourceFolderMenu(resourceOrFolder.context), templAte.ActionBAr));
				templAte.nAme.clAssList.remove('strike-through');
				templAte.element.clAssList.remove('fAded');
			}
		} else {
			const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.resourceGroup.provider);
			elementDisposAbles.Add(connectPrimAryMenuToInlineActionBAr(menus.getResourceMenu(resourceOrFolder), templAte.ActionBAr));
			templAte.nAme.clAssList.toggle('strike-through', resourceOrFolder.decorAtions.strikeThrough);
			templAte.element.clAssList.toggle('fAded', resourceOrFolder.decorAtions.fAded);
		}

		const render = () => {
			const theme = this.themeService.getColorTheme();
			const icon = iconResource && (theme.type === ColorScheme.LIGHT ? iconResource.decorAtions.icon : iconResource.decorAtions.iconDArk);

			templAte.fileLAbel.setFile(uri, {
				fileDecorAtions: { colors: fAlse, bAdges: !icon },
				hidePAth: viewModel.mode === ViewModelMode.Tree,
				fileKind,
				mAtches,
				descriptionMAtches
			});

			if (icon) {
				templAte.decorAtionIcon.style.displAy = '';
				templAte.decorAtionIcon.style.bAckgroundImAge = AsCSSUrl(icon);
				templAte.decorAtionIcon.title = tooltip;
			} else {
				templAte.decorAtionIcon.style.displAy = 'none';
				templAte.decorAtionIcon.style.bAckgroundImAge = '';
				templAte.decorAtionIcon.title = '';
			}
		};

		elementDisposAbles.Add(this.themeService.onDidColorThemeChAnge(render));
		render();

		templAte.element.setAttribute('dAtA-tooltip', tooltip);
		templAte.elementDisposAbles = elementDisposAbles;
	}

	disposeElement(resource: ITreeNode<ISCMResource, FuzzyScore> | ITreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>, FuzzyScore>, index: number, templAte: ResourceTemplAte): void {
		templAte.elementDisposAbles.dispose();
	}

	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResource> | ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>, FuzzyScore>, index: number, templAte: ResourceTemplAte, height: number | undefined): void {
		templAte.elementDisposAbles.dispose();

		const elementDisposAbles = new DisposAbleStore();
		const compressed = node.element As ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>;
		const folder = compressed.elements[compressed.elements.length - 1];

		const lAbel = compressed.elements.mAp(e => e.nAme).join('/');
		const fileKind = FileKind.FOLDER;

		const [mAtches, descriptionMAtches] = splitMAtches(folder.uri, node.filterDAtA);
		templAte.fileLAbel.setResource({ resource: folder.uri, nAme: lAbel }, {
			fileDecorAtions: { colors: fAlse, bAdges: true },
			fileKind,
			mAtches,
			descriptionMAtches
		});

		templAte.ActionBAr.cleAr();
		templAte.ActionBAr.context = folder;

		const menus = this.scmViewService.menus.getRepositoryMenus(folder.context.provider);
		elementDisposAbles.Add(connectPrimAryMenuToInlineActionBAr(menus.getResourceFolderMenu(folder.context), templAte.ActionBAr));

		templAte.nAme.clAssList.remove('strike-through');
		templAte.element.clAssList.remove('fAded');
		templAte.decorAtionIcon.style.displAy = 'none';
		templAte.decorAtionIcon.style.bAckgroundImAge = '';

		templAte.element.setAttribute('dAtA-tooltip', '');
		templAte.elementDisposAbles = elementDisposAbles;
	}

	disposeCompressedElements(node: ITreeNode<ICompressedTreeNode<ISCMResource> | ICompressedTreeNode<IResourceNode<ISCMResource, ISCMResourceGroup>>, FuzzyScore>, index: number, templAte: ResourceTemplAte, height: number | undefined): void {
		templAte.elementDisposAbles.dispose();
	}

	disposeTemplAte(templAte: ResourceTemplAte): void {
		templAte.elementDisposAbles.dispose();
		templAte.disposAbles.dispose();
	}
}

clAss ListDelegAte implements IListVirtuAlDelegAte<TreeElement> {

	constructor(privAte reAdonly inputRenderer: InputRenderer) { }

	getHeight(element: TreeElement) {
		if (isSCMInput(element)) {
			return this.inputRenderer.getHeight(element);
		} else {
			return 22;
		}
	}

	getTemplAteId(element: TreeElement) {
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

clAss SCMTreeFilter implements ITreeFilter<TreeElement> {

	filter(element: TreeElement): booleAn {
		if (ResourceTree.isResourceNode(element)) {
			return true;
		} else if (isSCMResourceGroup(element)) {
			return element.elements.length > 0 || !element.hideWhenEmpty;
		} else {
			return true;
		}
	}
}

export clAss SCMTreeSorter implements ITreeSorter<TreeElement> {

	@memoize
	privAte get viewModel(): ViewModel { return this.viewModelProvider(); }

	constructor(privAte viewModelProvider: () => ViewModel) { }

	compAre(one: TreeElement, other: TreeElement): number {
		if (isSCMRepository(one)) {
			if (!isSCMRepository(other)) {
				throw new Error('InvAlid compArison');
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
				throw new Error('InvAlid compArison');
			}

			return 0;
		}

		// List
		if (this.viewModel.mode === ViewModelMode.List) {
			// FileNAme
			if (this.viewModel.sortKey === ViewModelSortKey.NAme) {
				const oneNAme = bAsenAme((one As ISCMResource).sourceUri);
				const otherNAme = bAsenAme((other As ISCMResource).sourceUri);

				return compAreFileNAmes(oneNAme, otherNAme);
			}

			// StAtus
			if (this.viewModel.sortKey === ViewModelSortKey.StAtus) {
				const oneTooltip = (one As ISCMResource).decorAtions.tooltip ?? '';
				const otherTooltip = (other As ISCMResource).decorAtions.tooltip ?? '';

				if (oneTooltip !== otherTooltip) {
					return compAre(oneTooltip, otherTooltip);
				}
			}

			// PAth (defAult)
			const onePAth = (one As ISCMResource).sourceUri.fsPAth;
			const otherPAth = (other As ISCMResource).sourceUri.fsPAth;

			return compArePAths(onePAth, otherPAth);
		}

		// Tree
		const oneIsDirectory = ResourceTree.isResourceNode(one);
		const otherIsDirectory = ResourceTree.isResourceNode(other);

		if (oneIsDirectory !== otherIsDirectory) {
			return oneIsDirectory ? -1 : 1;
		}

		const oneNAme = ResourceTree.isResourceNode(one) ? one.nAme : bAsenAme((one As ISCMResource).sourceUri);
		const otherNAme = ResourceTree.isResourceNode(other) ? other.nAme : bAsenAme((other As ISCMResource).sourceUri);

		return compAreFileNAmes(oneNAme, otherNAme);
	}
}

export clAss SCMTreeKeyboArdNAvigAtionLAbelProvider implements ICompressibleKeyboArdNAvigAtionLAbelProvider<TreeElement> {

	constructor(@ILAbelService privAte reAdonly lAbelService: ILAbelService) { }

	getKeyboArdNAvigAtionLAbel(element: TreeElement): { toString(): string; } | undefined {
		if (ResourceTree.isResourceNode(element)) {
			return element.nAme;
		} else if (isSCMRepository(element)) {
			return undefined;
		} else if (isSCMInput(element)) {
			return undefined;
		} else if (isSCMResourceGroup(element)) {
			return element.lAbel;
		} else {
			// Since A mAtch in the file nAme tAkes precedence over A mAtch
			// in the folder nAme we Are returning the lAbel As file/folder.
			const fileNAme = bAsenAme(element.sourceUri);
			const filePAth = this.lAbelService.getUriLAbel(dirnAme(element.sourceUri), { relAtive: true });

			return filePAth.length !== 0 ? `${fileNAme} ${filePAth}` : fileNAme;
		}
	}

	getCompressedNodeKeyboArdNAvigAtionLAbel(elements: TreeElement[]): { toString(): string | undefined; } | undefined {
		const folders = elements As IResourceNode<ISCMResource, ISCMResourceGroup>[];
		return folders.mAp(e => e.nAme).join('/');
	}
}

clAss SCMResourceIdentityProvider implements IIdentityProvider<TreeElement> {

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

export clAss SCMAccessibilityProvider implements IListAccessibilityProvider<TreeElement> {

	constructor(@ILAbelService privAte reAdonly lAbelService: ILAbelService) { }

	getWidgetAriALAbel(): string {
		return locAlize('scm', "Source Control MAnAgement");
	}

	getAriALAbel(element: TreeElement): string {
		if (ResourceTree.isResourceNode(element)) {
			return this.lAbelService.getUriLAbel(element.uri, { relAtive: true, noPrefix: true }) || element.nAme;
		} else if (isSCMRepository(element)) {
			return element.provider.lAbel;
		} else if (isSCMInput(element)) {
			return locAlize('input', "Source Control Input");
		} else if (isSCMResourceGroup(element)) {
			return element.lAbel;
		} else {
			const result: string[] = [];

			result.push(bAsenAme(element.sourceUri));

			if (element.decorAtions.tooltip) {
				result.push(element.decorAtions.tooltip);
			}

			const pAth = this.lAbelService.getUriLAbel(dirnAme(element.sourceUri), { relAtive: true, noPrefix: true });

			if (pAth) {
				result.push(pAth);
			}

			return result.join(', ');
		}
	}
}

interfAce IGroupItem {
	reAdonly element: ISCMResourceGroup;
	reAdonly resources: ISCMResource[];
	reAdonly tree: ResourceTree<ISCMResource, ISCMResourceGroup>;
	dispose(): void;
}

interfAce IRepositoryItem {
	reAdonly element: ISCMRepository;
	reAdonly groupItems: IGroupItem[];
	dispose(): void;
}

function isRepositoryItem(item: IRepositoryItem | IGroupItem): item is IRepositoryItem {
	return ArrAy.isArrAy((item As IRepositoryItem).groupItems);
}

function AsTreeElement(node: IResourceNode<ISCMResource, ISCMResourceGroup>, forceIncompressible: booleAn): ICompressedTreeElement<TreeElement> {
	return {
		element: (node.childrenCount === 0 && node.element) ? node.element : node,
		children: IterAble.mAp(node.children, node => AsTreeElement(node, fAlse)),
		incompressible: !!node.element || forceIncompressible
	};
}

const enum ViewModelMode {
	List = 'list',
	Tree = 'tree'
}

const enum ViewModelSortKey {
	PAth,
	NAme,
	StAtus
}

clAss ViewModel {

	privAte reAdonly _onDidChAngeMode = new Emitter<ViewModelMode>();
	reAdonly onDidChAngeMode = this._onDidChAngeMode.event;

	privAte _onDidChAngeRepositoryCollApseStAte = new Emitter<void>();
	reAdonly onDidChAngeRepositoryCollApseStAte: Event<void>;
	privAte visible: booleAn = fAlse;

	get mode(): ViewModelMode { return this._mode; }
	set mode(mode: ViewModelMode) {
		this._mode = mode;

		for (const [, item] of this.items) {
			for (const groupItem of item.groupItems) {
				groupItem.tree.cleAr();

				if (mode === ViewModelMode.Tree) {
					for (const resource of groupItem.resources) {
						groupItem.tree.Add(resource.sourceUri, resource);
					}
				}
			}
		}

		this.refresh();
		this._onDidChAngeMode.fire(mode);
	}

	get sortKey(): ViewModelSortKey { return this._sortKey; }
	set sortKey(sortKey: ViewModelSortKey) {
		if (sortKey !== this._sortKey) {
			this._sortKey = sortKey;
			this.refresh();
		}
	}

	privAte items = new MAp<ISCMRepository, IRepositoryItem>();
	privAte visibilityDisposAbles = new DisposAbleStore();
	privAte scrollTop: number | undefined;
	privAte AlwAysShowRepositories = fAlse;
	privAte firstVisible = true;
	privAte repositoryCollApseStAtes: MAp<ISCMRepository, booleAn> | undefined;
	privAte viewSubMenuAction: SCMViewSubMenuAction | undefined;
	privAte disposAbles = new DisposAbleStore();

	constructor(
		privAte tree: WorkbenchCompressibleObjectTree<TreeElement, FuzzyScore>,
		privAte inputRenderer: InputRenderer,
		privAte _mode: ViewModelMode,
		privAte _sortKey: ViewModelSortKey,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IEditorService protected editorService: IEditorService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@ISCMViewService privAte scmViewService: ISCMViewService,
		@IUriIdentityService privAte uriIdentityService: IUriIdentityService
	) {
		this.onDidChAngeRepositoryCollApseStAte = Event.Any(
			this._onDidChAngeRepositoryCollApseStAte.event,
			Event.signAl(Event.filter(this.tree.onDidChAngeCollApseStAte, e => isSCMRepository(e.node.element)))
		);

		configurAtionService.onDidChAngeConfigurAtion(this.onDidChAngeConfigurAtion, this, this.disposAbles);
		this.onDidChAngeConfigurAtion();
	}

	privAte onDidChAngeConfigurAtion(e?: IConfigurAtionChAngeEvent): void {
		if (!e || e.AffectsConfigurAtion('scm.AlwAysShowRepositories')) {
			this.AlwAysShowRepositories = this.configurAtionService.getVAlue<booleAn>('scm.AlwAysShowRepositories');
			this.refresh();
		}
	}

	privAte _onDidChAngeVisibleRepositories({ Added, removed }: ISCMViewVisibleRepositoryChAngeEvent): void {
		for (const repository of Added) {
			const disposAble = combinedDisposAble(
				repository.provider.groups.onDidSplice(splice => this._onDidSpliceGroups(item, splice)),
				repository.input.onDidChAngeVisibility(() => this.refresh(item))
			);
			const groupItems = repository.provider.groups.elements.mAp(group => this.creAteGroupItem(group));
			const item: IRepositoryItem = {
				element: repository, groupItems, dispose() {
					dispose(this.groupItems);
					disposAble.dispose();
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

	privAte _onDidSpliceGroups(item: IRepositoryItem, { stArt, deleteCount, toInsert }: ISplice<ISCMResourceGroup>): void {
		const itemsToInsert: IGroupItem[] = toInsert.mAp(group => this.creAteGroupItem(group));
		const itemsToDispose = item.groupItems.splice(stArt, deleteCount, ...itemsToInsert);

		for (const item of itemsToDispose) {
			item.dispose();
		}

		this.refresh();
	}

	privAte creAteGroupItem(group: ISCMResourceGroup): IGroupItem {
		const tree = new ResourceTree<ISCMResource, ISCMResourceGroup>(group, group.provider.rootUri || URI.file('/'));
		const resources: ISCMResource[] = [...group.elements];
		const disposAble = combinedDisposAble(
			group.onDidChAnge(() => this.tree.refilter()),
			group.onDidSplice(splice => this._onDidSpliceGroup(item, splice))
		);

		const item: IGroupItem = { element: group, resources, tree, dispose() { disposAble.dispose(); } };

		if (this._mode === ViewModelMode.Tree) {
			for (const resource of resources) {
				item.tree.Add(resource.sourceUri, resource);
			}
		}

		return item;
	}

	privAte _onDidSpliceGroup(item: IGroupItem, { stArt, deleteCount, toInsert }: ISplice<ISCMResource>): void {
		const before = item.resources.length;
		const deleted = item.resources.splice(stArt, deleteCount, ...toInsert);
		const After = item.resources.length;

		if (this._mode === ViewModelMode.Tree) {
			for (const resource of deleted) {
				item.tree.delete(resource.sourceUri);
			}

			for (const resource of toInsert) {
				item.tree.Add(resource.sourceUri, resource);
			}
		}

		if (before !== After && (before === 0 || After === 0)) {
			this.refresh();
		} else {
			this.refresh(item);
		}
	}

	setVisible(visible: booleAn): void {
		if (visible) {
			this.visibilityDisposAbles = new DisposAbleStore();
			this.scmViewService.onDidChAngeVisibleRepositories(this._onDidChAngeVisibleRepositories, this, this.visibilityDisposAbles);
			this._onDidChAngeVisibleRepositories({ Added: this.scmViewService.visibleRepositories, removed: IterAble.empty() });
			this.repositoryCollApseStAtes = undefined;

			if (typeof this.scrollTop === 'number') {
				this.tree.scrollTop = this.scrollTop;
				this.scrollTop = undefined;
			}

			this.editorService.onDidActiveEditorChAnge(this.onDidActiveEditorChAnge, this, this.visibilityDisposAbles);
			this.onDidActiveEditorChAnge();
		} else {
			if (this.items.size > 1) {
				this.repositoryCollApseStAtes = new MAp();

				for (const [, item] of this.items) {
					this.repositoryCollApseStAtes.set(item.element, this.tree.isCollApsed(item.element));
				}
			}

			this.visibilityDisposAbles.dispose();
			this._onDidChAngeVisibleRepositories({ Added: IterAble.empty(), removed: [...this.items.keys()] });
			this.scrollTop = this.tree.scrollTop;
		}

		this.visible = visible;
		this._onDidChAngeRepositoryCollApseStAte.fire();
	}

	privAte refresh(item?: IRepositoryItem | IGroupItem): void {
		const focusedInput = this.inputRenderer.getFocusedInput();

		if (!this.AlwAysShowRepositories && (this.items.size === 1 && (!item || isRepositoryItem(item)))) {
			const item = IterAble.first(this.items.vAlues())!;
			this.tree.setChildren(null, this.render(item).children);
		} else if (item) {
			this.tree.setChildren(item.element, this.render(item).children);
		} else {
			const items = coAlesce(this.scmViewService.visibleRepositories.mAp(r => this.items.get(r)));
			this.tree.setChildren(null, items.mAp(item => this.render(item)));
		}

		if (focusedInput) {
			const inputWidget = this.inputRenderer.getRenderedInputWidget(focusedInput);

			if (inputWidget) {
				inputWidget.focus();
			}
		}

		this._onDidChAngeRepositoryCollApseStAte.fire();
	}

	privAte render(item: IRepositoryItem | IGroupItem): ICompressedTreeElement<TreeElement> {
		if (isRepositoryItem(item)) {
			const children: ICompressedTreeElement<TreeElement>[] = [];
			const hAsSomeChAnges = item.groupItems.some(item => item.element.elements.length > 0);

			if (this.items.size === 1 || hAsSomeChAnges) {
				if (item.element.input.visible) {
					children.push({ element: item.element.input, incompressible: true, collApsible: fAlse });
				}

				children.push(...item.groupItems.mAp(i => this.render(i)));
			}

			const collApsed = this.repositoryCollApseStAtes?.get(item.element);
			return { element: item.element, children, incompressible: true, collApsed, collApsible: true };
		} else {
			const children = this.mode === ViewModelMode.List
				? IterAble.mAp(item.resources, element => ({ element, incompressible: true }))
				: IterAble.mAp(item.tree.root.children, node => AsTreeElement(node, true));

			return { element: item.element, children, incompressible: true, collApsible: true };
		}
	}

	privAte onDidActiveEditorChAnge(): void {
		if (!this.configurAtionService.getVAlue<booleAn>('scm.AutoReveAl')) {
			return;
		}

		if (this.firstVisible) {
			this.firstVisible = fAlse;
			this.visibilityDisposAbles.Add(disposAbleTimeout(() => this.onDidActiveEditorChAnge(), 250));
			return;
		}

		const uri = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if (!uri) {
			return;
		}

		for (const repository of this.scmViewService.visibleRepositories) {
			const item = this.items.get(repository)!;

			// go bAckwArds from lAst group
			for (let j = item.groupItems.length - 1; j >= 0; j--) {
				const groupItem = item.groupItems[j];
				const resource = this.mode === ViewModelMode.Tree
					? groupItem.tree.getNode(uri)?.element // TODO@JoAo URI identity?
					: groupItem.resources.find(r => this.uriIdentityService.extUri.isEquAl(r.sourceUri, uri));

				if (resource) {
					this.tree.reveAl(resource);
					this.tree.setSelection([resource]);
					this.tree.setFocus([resource]);
					return;
				}
			}
		}
	}

	focus() {
		for (const repository of this.scmViewService.visibleRepositories) {
			const widget = this.inputRenderer.getRenderedInputWidget(repository.input);

			if (widget) {
				widget.focus();
				return;
			}
		}

		this.tree.domFocus();
	}

	getViewActions(): IAction[] {
		if (this.scmViewService.visibleRepositories.length === 0) {
			return this.scmViewService.menus.titleMenu.Actions;
		}

		if (this.AlwAysShowRepositories || this.scmViewService.visibleRepositories.length !== 1) {
			return [];
		}

		const menus = this.scmViewService.menus.getRepositoryMenus(this.scmViewService.visibleRepositories[0].provider);
		return menus.titleMenu.Actions;
	}

	getViewSecondAryActions(): IAction[] {
		if (this.scmViewService.visibleRepositories.length === 0) {
			return this.scmViewService.menus.titleMenu.secondAryActions;
		}

		if (!this.viewSubMenuAction) {
			this.viewSubMenuAction = this.instAntiAtionService.creAteInstAnce(SCMViewSubMenuAction, this);
			this.disposAbles.Add(this.viewSubMenuAction);
		}

		if (this.AlwAysShowRepositories || this.scmViewService.visibleRepositories.length !== 1) {
			return this.viewSubMenuAction.Actions;
		}

		const menus = this.scmViewService.menus.getRepositoryMenus(this.scmViewService.visibleRepositories[0].provider);
		const secondAryActions = menus.titleMenu.secondAryActions;

		if (secondAryActions.length === 0) {
			return [this.viewSubMenuAction];
		}

		return [this.viewSubMenuAction, new SepArAtor(), ...secondAryActions];
	}

	getViewActionsContext(): Any {
		if (this.scmViewService.visibleRepositories.length === 0) {
			return [];
		}

		if (this.AlwAysShowRepositories || this.scmViewService.visibleRepositories.length !== 1) {
			return undefined;
		}

		return this.scmViewService.visibleRepositories[0].provider;
	}

	collApseAllProviders(): void {
		for (const repository of this.scmViewService.visibleRepositories) {
			if (this.tree.isCollApsible(repository)) {
				this.tree.collApse(repository);
			}
		}
	}

	expAndAllProviders(): void {
		for (const repository of this.scmViewService.visibleRepositories) {
			if (this.tree.isCollApsible(repository)) {
				this.tree.expAnd(repository);
			}
		}
	}

	isAnyProviderCollApsible(): booleAn {
		if (!this.visible || this.scmViewService.visibleRepositories.length === 1) {
			return fAlse;
		}

		return this.scmViewService.visibleRepositories.some(r => this.tree.hAsElement(r) && this.tree.isCollApsible(r));
	}

	AreAllProvidersCollApsed(): booleAn {
		if (!this.visible || this.scmViewService.visibleRepositories.length === 1) {
			return fAlse;
		}

		return this.scmViewService.visibleRepositories.every(r => this.tree.hAsElement(r) && (!this.tree.isCollApsible(r) || this.tree.isCollApsed(r)));
	}

	dispose(): void {
		this.visibilityDisposAbles.dispose();
		this.disposAbles.dispose();
		dispose(this.items.vAlues());
		this.items.cleAr();
	}
}

clAss SCMViewRepositoriesSubMenuAction extends SubmenuAction {

	get Actions(): IAction[] {
		return getRepositoryVisibilityActions(this.scmService, this.scmViewService);
	}

	constructor(
		@ISCMService privAte reAdonly scmService: ISCMService,
		@ISCMViewService privAte reAdonly scmViewService: ISCMViewService,
	) {
		super('scm.repositories', locAlize('repositories', "Repositories"), []);
	}
}

clAss SCMViewSubMenuAction extends SubmenuAction {

	constructor(
		viewModel: ViewModel,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		const listAction = new SCMViewModeListAction(viewModel);
		const treeAction = new SCMViewModeTreeAction(viewModel);
		const sortByNAmeAction = new SCMSortByNAmeAction(viewModel);
		const sortByPAthAction = new SCMSortByPAthAction(viewModel);
		const sortByStAtusAction = new SCMSortByStAtusAction(viewModel);
		const Actions = [
			instAntiAtionService.creAteInstAnce(SCMViewRepositoriesSubMenuAction),
			new SepArAtor(),
			...new RAdioGroup([listAction, treeAction]).Actions,
			new SepArAtor(),
			...new RAdioGroup([sortByNAmeAction, sortByPAthAction, sortByStAtusAction]).Actions
		];

		super(
			'scm.viewsort',
			locAlize('sortAction', "View & Sort"),
			Actions
		);

		this._register(combinedDisposAble(listAction, treeAction, sortByNAmeAction, sortByPAthAction, sortByStAtusAction));
	}
}

export clAss ToggleViewModeAction extends Action {

	stAtic reAdonly ID = 'workbench.scm.Action.toggleViewMode';
	stAtic reAdonly LABEL = locAlize('toggleViewMode', "Toggle View Mode");

	constructor(id: string = ToggleViewModeAction.ID, lAbel: string = ToggleViewModeAction.LABEL, privAte viewModel: ViewModel, privAte mode?: ViewModelMode) {
		super(id, lAbel);
		this._register(this.viewModel.onDidChAngeMode(this.onDidChAngeMode, this));
		this.onDidChAngeMode(this.viewModel.mode);
	}

	Async run(): Promise<void> {
		if (typeof this.mode === 'undefined') {
			this.viewModel.mode = this.viewModel.mode === ViewModelMode.List ? ViewModelMode.Tree : ViewModelMode.List;
		} else {
			this.viewModel.mode = this.mode;
		}
	}

	privAte onDidChAngeMode(mode: ViewModelMode): void {
		const iconClAss = mode === ViewModelMode.List ? 'codicon-list-tree' : 'codicon-list-flAt';
		this.clAss = `scm-Action toggle-view-mode ${iconClAss}`;
		this.checked = this.viewModel.mode === this.mode;
	}
}

clAss SCMViewModeListAction extends ToggleViewModeAction {
	constructor(viewModel: ViewModel) {
		super('workbench.scm.Action.viewModeList', locAlize('viewModeList', "View As List"), viewModel, ViewModelMode.List);
	}
}

clAss SCMViewModeTreeAction extends ToggleViewModeAction {
	constructor(viewModel: ViewModel) {
		super('workbench.scm.Action.viewModeTree', locAlize('viewModeTree', "View As Tree"), viewModel, ViewModelMode.Tree);
	}
}

AbstrAct clAss SCMSortAction extends Action {

	privAte reAdonly _listener: IDisposAble;

	constructor(id: string, lAbel: string, privAte viewModel: ViewModel, privAte sortKey: ViewModelSortKey) {
		super(id, lAbel);

		this.checked = this.sortKey === ViewModelSortKey.PAth;
		this.enAbled = this.viewModel?.mode === ViewModelMode.List ?? fAlse;
		this._listener = viewModel?.onDidChAngeMode(e => this.enAbled = e === ViewModelMode.List);
	}

	Async run(): Promise<void> {
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

clAss SCMSortByNAmeAction extends SCMSortAction {
	stAtic reAdonly ID = 'workbench.scm.Action.sortByNAme';
	stAtic reAdonly LABEL = locAlize('sortByNAme', "Sort by NAme");

	constructor(viewModel: ViewModel) {
		super(SCMSortByNAmeAction.ID, SCMSortByNAmeAction.LABEL, viewModel, ViewModelSortKey.NAme);
	}
}

clAss SCMSortByPAthAction extends SCMSortAction {
	stAtic reAdonly ID = 'workbench.scm.Action.sortByPAth';
	stAtic reAdonly LABEL = locAlize('sortByPAth', "Sort by PAth");

	constructor(viewModel: ViewModel) {
		super(SCMSortByPAthAction.ID, SCMSortByPAthAction.LABEL, viewModel, ViewModelSortKey.PAth);
	}
}

clAss SCMSortByStAtusAction extends SCMSortAction {
	stAtic reAdonly ID = 'workbench.scm.Action.sortByStAtus';
	stAtic reAdonly LABEL = locAlize('sortByStAtus', "Sort by StAtus");

	constructor(viewModel: ViewModel) {
		super(SCMSortByStAtusAction.ID, SCMSortByStAtusAction.LABEL, viewModel, ViewModelSortKey.StAtus);
	}
}

clAss SCMInputWidget extends DisposAble {

	privAte reAdonly defAultInputFontFAmily = DEFAULT_FONT_FAMILY;

	privAte element: HTMLElement;
	privAte editorContAiner: HTMLElement;
	privAte plAceholderTextContAiner: HTMLElement;
	privAte inputEditor: CodeEditorWidget;

	privAte model: { reAdonly input: ISCMInput; reAdonly textModel: ITextModel; } | undefined;
	privAte repositoryContextKey: IContextKey<ISCMRepository | undefined>;
	privAte repositoryDisposAbles = new DisposAbleStore();

	privAte vAlidAtion: IInputVAlidAtion | undefined;
	privAte vAlidAtionDisposAble: IDisposAble = DisposAble.None;

	reAdonly onDidChAngeContentHeight: Event<void>;

	get input(): ISCMInput | undefined {
		return this.model?.input;
	}

	set input(input: ISCMInput | undefined) {
		if (input === this.input) {
			return;
		}

		this.vAlidAtionDisposAble.dispose();
		this.editorContAiner.clAssList.remove('synthetic-focus');

		this.repositoryDisposAbles.dispose();
		this.repositoryDisposAbles = new DisposAbleStore();
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
			scheme: SchemAs.vscode,
			pAth: `scm/${input.repository.provider.contextVAlue}/${input.repository.provider.id}/input`,
			query
		});

		this.configurAtionService.updAteVAlue('editor.wordBAsedSuggestions', fAlse, { resource: uri }, ConfigurAtionTArget.MEMORY);

		const mode = this.modeService.creAte('scminput');
		const textModel = this.modelService.getModel(uri) || this.modelService.creAteModel('', mode, uri);
		this.inputEditor.setModel(textModel);

		// VAlidAtion
		const vAlidAtionDelAyer = new ThrottledDelAyer<Any>(200);
		const vAlidAte = Async () => {
			const position = this.inputEditor.getSelection()?.getStArtPosition();
			const offset = position && textModel.getOffsetAt(position);
			const vAlue = textModel.getVAlue();

			this.vAlidAtion = AwAit input.vAlidAteInput(vAlue, offset || 0);
			this.renderVAlidAtion();
		};

		const triggerVAlidAtion = () => vAlidAtionDelAyer.trigger(vAlidAte);
		this.repositoryDisposAbles.Add(vAlidAtionDelAyer);
		this.repositoryDisposAbles.Add(this.inputEditor.onDidChAngeCursorPosition(triggerVAlidAtion));

		// AdAptive indentAtion rules
		const opts = this.modelService.getCreAtionOptions(textModel.getLAnguAgeIdentifier().lAnguAge, textModel.uri, textModel.isForSimpleWidget);
		const onEnter = Event.filter(this.inputEditor.onKeyDown, e => e.keyCode === KeyCode.Enter);
		this.repositoryDisposAbles.Add(onEnter(() => textModel.detectIndentAtion(opts.insertSpAces, opts.tAbSize)));

		// Keep model in sync with API
		textModel.setVAlue(input.vAlue);
		this.repositoryDisposAbles.Add(input.onDidChAnge(vAlue => {
			if (vAlue === textModel.getVAlue()) { // circuit breAker
				return;
			}
			textModel.setVAlue(vAlue);
			this.inputEditor.setPosition(textModel.getFullModelRAnge().getEndPosition());
		}));

		// Keep API in sync with model, updAte plAceholder visibility And vAlidAte
		const updAtePlAceholderVisibility = () => this.plAceholderTextContAiner.clAssList.toggle('hidden', textModel.getVAlueLength() > 0);
		this.repositoryDisposAbles.Add(textModel.onDidChAngeContent(() => {
			input.setVAlue(textModel.getVAlue(), true);
			updAtePlAceholderVisibility();
			triggerVAlidAtion();
		}));
		updAtePlAceholderVisibility();

		// UpdAte plAceholder text
		const updAtePlAceholderText = () => {
			const binding = this.keybindingService.lookupKeybinding('scm.AcceptInput');
			const lAbel = binding ? binding.getLAbel() : (plAtform.isMAcintosh ? 'Cmd+Enter' : 'Ctrl+Enter');
			const plAceholderText = formAt(input.plAceholder, lAbel);

			this.inputEditor.updAteOptions({ AriALAbel: plAceholderText });
			this.plAceholderTextContAiner.textContent = plAceholderText;
		};
		this.repositoryDisposAbles.Add(input.onDidChAngePlAceholder(updAtePlAceholderText));
		this.repositoryDisposAbles.Add(this.keybindingService.onDidUpdAteKeybindings(updAtePlAceholderText));
		updAtePlAceholderText();

		// UpdAte input templAte
		let commitTemplAte = '';
		const updAteTemplAte = () => {
			if (typeof input.repository.provider.commitTemplAte === 'undefined' || !input.visible) {
				return;
			}

			const oldCommitTemplAte = commitTemplAte;
			commitTemplAte = input.repository.provider.commitTemplAte;

			const vAlue = textModel.getVAlue();

			if (vAlue && vAlue !== oldCommitTemplAte) {
				return;
			}

			textModel.setVAlue(commitTemplAte);
		};
		this.repositoryDisposAbles.Add(input.repository.provider.onDidChAngeCommitTemplAte(updAteTemplAte, this));
		updAteTemplAte();

		// SAve model
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
		contAiner: HTMLElement,
		overflowWidgetsDomNode: HTMLElement,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IModelService privAte modelService: IModelService,
		@IModeService privAte modeService: IModeService,
		@IKeybindingService privAte keybindingService: IKeybindingService,
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService
	) {
		super();

		this.element = Append(contAiner, $('.scm-editor'));
		this.editorContAiner = Append(this.element, $('.scm-editor-contAiner'));
		this.plAceholderTextContAiner = Append(this.editorContAiner, $('.scm-editor-plAceholder'));

		const contextKeyService2 = contextKeyService.creAteScoped(this.element);
		this.repositoryContextKey = contextKeyService2.creAteKey('scmRepository', undefined);

		const editorOptions: IEditorConstructionOptions = {
			...getSimpleEditorOptions(),
			lineDecorAtionsWidth: 4,
			drAgAndDrop: fAlse,
			cursorWidth: 1,
			fontSize: 13,
			lineHeight: 20,
			fontFAmily: this.getInputEditorFontFAmily(),
			wrAppingStrAtegy: 'AdvAnced',
			wrAppingIndent: 'none',
			pAdding: { top: 3, bottom: 3 },
			quickSuggestions: fAlse,
			scrollbAr: { AlwAysConsumeMouseWheel: fAlse },
			overflowWidgetsDomNode
		};

		const codeEditorWidgetOptions: ICodeEditorWidgetOptions = {
			isSimpleWidget: true,
			contributions: EditorExtensionsRegistry.getSomeEditorContributions([
				SuggestController.ID,
				SnippetController2.ID,
				MenuPreventer.ID,
				SelectionClipboArdContributionID,
				ContextMenuController.ID,
				ColorDetector.ID,
				ModesHoverController.ID,
				LinkDetector.ID
			])
		};

		const services = new ServiceCollection([IContextKeyService, contextKeyService2]);
		const instAntiAtionService2 = instAntiAtionService.creAteChild(services);
		this.inputEditor = instAntiAtionService2.creAteInstAnce(CodeEditorWidget, this.editorContAiner, editorOptions, codeEditorWidgetOptions);
		this._register(this.inputEditor);

		this._register(this.inputEditor.onDidFocusEditorText(() => {
			this.input?.repository.setSelected(true); // TODO@joAo: remove
			this.editorContAiner.clAssList.Add('synthetic-focus');
			this.renderVAlidAtion();
		}));
		this._register(this.inputEditor.onDidBlurEditorText(() => {
			this.editorContAiner.clAssList.remove('synthetic-focus');
			this.vAlidAtionDisposAble.dispose();
		}));

		const firstLineKey = contextKeyService2.creAteKey('scmInputIsInFirstLine', fAlse);
		const lAstLineKey = contextKeyService2.creAteKey('scmInputIsInLAstLine', fAlse);

		this._register(this.inputEditor.onDidChAngeCursorPosition(({ position }) => {
			const viewModel = this.inputEditor._getViewModel()!;
			const lAstLineNumber = viewModel.getLineCount();
			const viewPosition = viewModel.coordinAtesConverter.convertModelPositionToViewPosition(position);

			firstLineKey.set(viewPosition.lineNumber === 1);
			lAstLineKey.set(viewPosition.lineNumber === lAstLineNumber);
		}));

		const onInputFontFAmilyChAnged = Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('scm.inputFontFAmily'));
		this._register(onInputFontFAmilyChAnged(() => this.inputEditor.updAteOptions({ fontFAmily: this.getInputEditorFontFAmily() })));

		this.onDidChAngeContentHeight = Event.signAl(Event.filter(this.inputEditor.onDidContentSizeChAnge, e => e.contentHeightChAnged));
	}

	getContentHeight(): number {
		const editorContentHeight = this.inputEditor.getContentHeight();
		return MAth.min(editorContentHeight, 134);
	}

	lAyout(): void {
		const editorHeight = this.getContentHeight();
		const dimension: Dimension = {
			width: this.element.clientWidth - 2,
			height: editorHeight,
		};

		this.inputEditor.lAyout(dimension);
		this.renderVAlidAtion();
	}

	focus(): void {
		this.inputEditor.focus();
		this.editorContAiner.clAssList.Add('synthetic-focus');
	}

	hAsFocus(): booleAn {
		return this.inputEditor.hAsTextFocus();
	}

	privAte renderVAlidAtion(): void {
		this.vAlidAtionDisposAble.dispose();

		this.editorContAiner.clAssList.toggle('vAlidAtion-info', this.vAlidAtion?.type === InputVAlidAtionType.InformAtion);
		this.editorContAiner.clAssList.toggle('vAlidAtion-wArning', this.vAlidAtion?.type === InputVAlidAtionType.WArning);
		this.editorContAiner.clAssList.toggle('vAlidAtion-error', this.vAlidAtion?.type === InputVAlidAtionType.Error);

		if (!this.vAlidAtion || !this.inputEditor.hAsTextFocus()) {
			return;
		}

		this.vAlidAtionDisposAble = this.contextViewService.showContextView({
			getAnchor: () => this.editorContAiner,
			render: contAiner => {
				const element = Append(contAiner, $('.scm-editor-vAlidAtion'));
				element.clAssList.toggle('vAlidAtion-info', this.vAlidAtion!.type === InputVAlidAtionType.InformAtion);
				element.clAssList.toggle('vAlidAtion-wArning', this.vAlidAtion!.type === InputVAlidAtionType.WArning);
				element.clAssList.toggle('vAlidAtion-error', this.vAlidAtion!.type === InputVAlidAtionType.Error);
				element.style.width = `${this.editorContAiner.clientWidth}px`;
				element.textContent = this.vAlidAtion!.messAge;
				return DisposAble.None;
			},
			AnchorAlignment: AnchorAlignment.LEFT
		});
	}

	privAte getInputEditorFontFAmily(): string {
		const inputFontFAmily = this.configurAtionService.getVAlue<string>('scm.inputFontFAmily').trim();

		if (inputFontFAmily.toLowerCAse() === 'editor') {
			return this.configurAtionService.getVAlue<string>('editor.fontFAmily').trim();
		}

		if (inputFontFAmily.length !== 0 && inputFontFAmily.toLowerCAse() !== 'defAult') {
			return inputFontFAmily;
		}

		return this.defAultInputFontFAmily;
	}

	cleArVAlidAtion(): void {
		this.vAlidAtionDisposAble.dispose();
	}

	dispose(): void {
		this.input = undefined;
		this.repositoryDisposAbles.dispose();
		this.vAlidAtionDisposAble.dispose();
		super.dispose();
	}
}

clAss SCMCollApseAction extends Action {

	privAte AllCollApsed = fAlse;

	constructor(privAte viewModel: ViewModel) {
		super('scm.collApse', undefined, undefined, true);
		this._register(viewModel.onDidChAngeRepositoryCollApseStAte(this.updAte, this));
		this.updAte();
	}

	Async run(): Promise<void> {
		if (this.AllCollApsed) {
			this.viewModel.expAndAllProviders();
		} else {
			this.viewModel.collApseAllProviders();
		}
	}

	privAte updAte(): void {
		const isAnyProviderCollApsible = this.viewModel.isAnyProviderCollApsible();

		this.enAbled = isAnyProviderCollApsible;
		this.AllCollApsed = isAnyProviderCollApsible && this.viewModel.AreAllProvidersCollApsed();
		this.lAbel = this.AllCollApsed ? locAlize('expAnd All', "ExpAnd All Repositories") : locAlize('collApse All', "CollApse All Repositories");
		this.clAss = this.AllCollApsed ? Codicon.expAndAll.clAssNAmes : Codicon.collApseAll.clAssNAmes;
	}
}

export clAss SCMViewPAne extends ViewPAne {

	privAte _onDidLAyout = new Emitter<void>();
	privAte lAyoutCAche: ISCMLAyout = {
		height: undefined,
		width: undefined,
		onDidChAnge: this._onDidLAyout.event
	};

	privAte listContAiner!: HTMLElement;
	privAte tree!: WorkbenchCompressibleObjectTree<TreeElement, FuzzyScore>;
	privAte viewModel!: ViewModel;
	privAte listLAbels!: ResourceLAbels;
	privAte inputRenderer!: InputRenderer;
	privAte toggleViewModelModeAction: ToggleViewModeAction | undefined;

	constructor(
		options: IViewPAneOptions,
		@ISCMService privAte scmService: ISCMService,
		@ISCMViewService privAte scmViewService: ISCMViewService,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IThemeService protected themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextViewService protected contextViewService: IContextViewService,
		@ICommAndService protected commAndService: ICommAndService,
		@IEditorService protected editorService: IEditorService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IMenuService protected menuService: IMenuService,
		@IStorAgeService privAte storAgeService: IStorAgeService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this._register(Event.Any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository)(() => this._onDidChAngeViewWelcomeStAte.fire()));

		this._register(this.scmViewService.menus.titleMenu.onDidChAngeTitle(this.updAteActions, this));
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		// List
		this.listContAiner = Append(contAiner, $('.scm-view.show-file-icons'));

		const overflowWidgetsDomNode = $('.scm-overflow-widgets-contAiner.monAco-editor');

		const updAteActionsVisibility = () => this.listContAiner.clAssList.toggle('show-Actions', this.configurAtionService.getVAlue<booleAn>('scm.AlwAysShowActions'));
		this._register(Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('scm.AlwAysShowActions'))(updAteActionsVisibility));
		updAteActionsVisibility();

		const updAteProviderCountVisibility = () => {
			const vAlue = this.configurAtionService.getVAlue<'hidden' | 'Auto' | 'visible'>('scm.providerCountBAdge');
			this.listContAiner.clAssList.toggle('hide-provider-counts', vAlue === 'hidden');
			this.listContAiner.clAssList.toggle('Auto-provider-counts', vAlue === 'Auto');
		};
		this._register(Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('scm.providerCountBAdge'))(updAteProviderCountVisibility));
		updAteProviderCountVisibility();

		this._register(this.scmViewService.onDidChAngeVisibleRepositories(() => this.updAteActions()));

		this.inputRenderer = this.instAntiAtionService.creAteInstAnce(InputRenderer, this.lAyoutCAche, overflowWidgetsDomNode, (input, height) => this.tree.updAteElementHeight(input, height));
		const delegAte = new ListDelegAte(this.inputRenderer);

		const ActionViewItemProvider = (Action: IAction) => this.getActionViewItem(Action);

		this.listLAbels = this.instAntiAtionService.creAteInstAnce(ResourceLAbels, { onDidChAngeVisibility: this.onDidChAngeBodyVisibility });
		this._register(this.listLAbels);

		const ActionRunner = new RepositoryPAneActionRunner(() => this.getSelectedResources());
		this._register(ActionRunner);
		this._register(ActionRunner.onDidBeforeRun(() => this.tree.domFocus()));

		const renderers: ICompressibleTreeRenderer<Any, FuzzyScore, Any>[] = [
			this.instAntiAtionService.creAteInstAnce(RepositoryRenderer, ActionViewItemProvider),
			this.inputRenderer,
			this.instAntiAtionService.creAteInstAnce(ResourceGroupRenderer, ActionViewItemProvider),
			this.instAntiAtionService.creAteInstAnce(ResourceRenderer, () => this.viewModel, this.listLAbels, ActionViewItemProvider, ActionRunner)
		];

		const filter = new SCMTreeFilter();
		const sorter = new SCMTreeSorter(() => this.viewModel);
		const keyboArdNAvigAtionLAbelProvider = this.instAntiAtionService.creAteInstAnce(SCMTreeKeyboArdNAvigAtionLAbelProvider);
		const identityProvider = new SCMResourceIdentityProvider();

		this.tree = this.instAntiAtionService.creAteInstAnce(
			WorkbenchCompressibleObjectTree,
			'SCM Tree Repo',
			this.listContAiner,
			delegAte,
			renderers,
			{
				identityProvider,
				horizontAlScrolling: fAlse,
				setRowLineHeight: fAlse,
				filter,
				sorter,
				keyboArdNAvigAtionLAbelProvider,
				overrideStyles: {
					listBAckground: this.viewDescriptorService.getViewLocAtionById(this.id) === ViewContAinerLocAtion.SidebAr ? SIDE_BAR_BACKGROUND : PANEL_BACKGROUND
				},
				AccessibilityProvider: this.instAntiAtionService.creAteInstAnce(SCMAccessibilityProvider)
			}) As WorkbenchCompressibleObjectTree<TreeElement, FuzzyScore>;

		this._register(this.tree.onDidOpen(this.open, this));

		this._register(this.tree.onContextMenu(this.onListContextMenu, this));
		this._register(this.tree.onDidScroll(this.inputRenderer.cleArVAlidAtion, this.inputRenderer));
		this._register(this.tree);

		Append(this.listContAiner, overflowWidgetsDomNode);

		let viewMode = this.configurAtionService.getVAlue<'tree' | 'list'>('scm.defAultViewMode') === 'list' ? ViewModelMode.List : ViewModelMode.Tree;
		const storAgeMode = this.storAgeService.get(`scm.viewMode`, StorAgeScope.WORKSPACE) As ViewModelMode;

		if (typeof storAgeMode === 'string') {
			viewMode = storAgeMode;
		}

		this.viewModel = this.instAntiAtionService.creAteInstAnce(ViewModel, this.tree, this.inputRenderer, viewMode, ViewModelSortKey.PAth);
		this._register(this.viewModel);

		this.listContAiner.clAssList.Add('file-icon-themAble-tree');
		this.listContAiner.clAssList.Add('show-file-icons');

		this.updAteIndentStyles(this.themeService.getFileIconTheme());
		this._register(this.themeService.onDidFileIconThemeChAnge(this.updAteIndentStyles, this));
		this._register(this.viewModel.onDidChAngeMode(this.onDidChAngeMode, this));

		this.toggleViewModelModeAction = new ToggleViewModeAction(ToggleViewModeAction.ID, ToggleViewModeAction.LABEL, this.viewModel);
		this._register(this.toggleViewModelModeAction);

		this._register(this.onDidChAngeBodyVisibility(this.viewModel.setVisible, this.viewModel));

		this._register(Event.filter(this.configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('scm.AlwAysShowRepositories'))(this.updAteActions, this));
		this.updAteActions();
	}

	privAte updAteIndentStyles(theme: IFileIconTheme): void {
		this.listContAiner.clAssList.toggle('list-view-mode', this.viewModel.mode === ViewModelMode.List);
		this.listContAiner.clAssList.toggle('tree-view-mode', this.viewModel.mode === ViewModelMode.Tree);
		this.listContAiner.clAssList.toggle('Align-icons-And-twisties', (this.viewModel.mode === ViewModelMode.List && theme.hAsFileIcons) || (theme.hAsFileIcons && !theme.hAsFolderIcons));
		this.listContAiner.clAssList.toggle('hide-Arrows', this.viewModel.mode === ViewModelMode.Tree && theme.hidesExplorerArrows === true);
	}

	privAte onDidChAngeMode(): void {
		this.updAteIndentStyles(this.themeService.getFileIconTheme());
		this.storAgeService.store(`scm.viewMode`, this.viewModel.mode, StorAgeScope.WORKSPACE);
	}

	lAyoutBody(height: number | undefined = this.lAyoutCAche.height, width: number | undefined = this.lAyoutCAche.width): void {
		if (height === undefined) {
			return;
		}

		if (width !== undefined) {
			super.lAyoutBody(height, width);
		}

		this.lAyoutCAche.height = height;
		this.lAyoutCAche.width = width;
		this._onDidLAyout.fire();

		this.listContAiner.style.height = `${height}px`;
		this.tree.lAyout(height, width);
	}

	focus(): void {
		super.focus();

		if (this.isExpAnded()) {
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

		if (this.scmViewService.visibleRepositories.length < 2) {
			return [...result, ...this.viewModel.getViewActions()];
		}

		return [
			...result,
			new SCMCollApseAction(this.viewModel),
			...this.viewModel.getViewActions()
		];
	}

	getSecondAryActions(): IAction[] {
		if (!this.viewModel) {
			return [];
		}

		return this.viewModel.getViewSecondAryActions();
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (Action instAnceof StAtusBArAction) {
			return new StAtusBArActionViewItem(Action);
		}

		return super.getActionViewItem(Action);
	}

	getActionsContext(): Any {
		if (!this.viewModel) {
			return [];
		}

		return this.viewModel.getViewActionsContext();
	}

	privAte Async open(e: IOpenEvent<TreeElement | null>): Promise<void> {
		if (!e.element) {
			return;
		} else if (isSCMRepository(e.element)) { // TODO@joAo: remove
			e.element.setSelected(true);
			return;
		} else if (isSCMResourceGroup(e.element)) { // TODO@joAo: remove
			const provider = e.element.provider;
			const repository = this.scmService.repositories.find(r => r.provider === provider);
			repository?.setSelected(true);
			return;
		} else if (ResourceTree.isResourceNode(e.element)) { // TODO@joAo: remove
			const provider = e.element.context.provider;
			const repository = this.scmService.repositories.find(r => r.provider === provider);
			repository?.setSelected(true);
			return;
		} else if (isSCMInput(e.element)) {
			e.element.repository.setSelected(true); // TODO@joAo: remove

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
		AwAit e.element.open(!!e.editorOptions.preserveFocus);

		if (e.editorOptions.pinned) {
			const ActiveEditorPAne = this.editorService.ActiveEditorPAne;

			if (ActiveEditorPAne) {
				ActiveEditorPAne.group.pinEditor(ActiveEditorPAne.input);
			}
		}

		// TODO@joAo: remove
		const provider = e.element.resourceGroup.provider;
		const repository = this.scmService.repositories.find(r => r.provider === provider);
		repository?.setSelected(true);
	}

	privAte onListContextMenu(e: ITreeContextMenuEvent<TreeElement | null>): void {
		if (!e.element) {
			return this.contextMenuService.showContextMenu({
				getAnchor: () => e.Anchor,
				getActions: () => getRepositoryVisibilityActions(this.scmService, this.scmViewService)
			});
		}

		const element = e.element;
		let context: Any = element;
		let Actions: IAction[] = [];
		let disposAble: IDisposAble = DisposAble.None;

		if (isSCMRepository(element)) {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
			const menu = menus.repositoryMenu;
			context = element.provider;
			[Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);
		} else if (isSCMInput(element)) {
			// noop
		} else if (isSCMResourceGroup(element)) {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
			const menu = menus.getResourceGroupMenu(element);
			[Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);
		} else if (ResourceTree.isResourceNode(element)) {
			if (element.element) {
				const menus = this.scmViewService.menus.getRepositoryMenus(element.element.resourceGroup.provider);
				const menu = menus.getResourceMenu(element.element);
				[Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);
			} else {
				const menus = this.scmViewService.menus.getRepositoryMenus(element.context.provider);
				const menu = menus.getResourceFolderMenu(element.context);
				[Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);
			}
		} else {
			const menus = this.scmViewService.menus.getRepositoryMenus(element.resourceGroup.provider);
			const menu = menus.getResourceMenu(element);
			[Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);
		}

		const ActionRunner = new RepositoryPAneActionRunner(() => this.getSelectedResources());
		ActionRunner.onDidBeforeRun(() => this.tree.domFocus());

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor,
			getActions: () => Actions,
			getActionsContext: () => context,
			ActionRunner,
			onHide() {
				disposAble.dispose();
			}
		});
	}

	privAte getSelectedResources(): (ISCMResource | IResourceNode<ISCMResource, ISCMResourceGroup>)[] {
		return this.tree.getSelection()
			.filter(r => !!r && !isSCMResourceGroup(r))! As Any;
	}

	shouldShowWelcome(): booleAn {
		return this.scmService.repositories.length === 0;
	}
}

export const scmProviderSepArAtorBorderColor = registerColor('scm.providerBorder', { dArk: '#454545', light: '#C8C8C8', hc: contrAstBorder }, locAlize('scm.providerBorder', "SCM Provider sepArAtor border."));

registerThemingPArticipAnt((theme, collector) => {
	const inputBAckgroundColor = theme.getColor(inputBAckground);
	if (inputBAckgroundColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner .monAco-editor-bAckground,
		.scm-view .scm-editor-contAiner .monAco-editor,
		.scm-view .scm-editor-contAiner .monAco-editor .mArgin
		{ bAckground-color: ${inputBAckgroundColor} !importAnt; }`);
	}

	const inputForegroundColor = theme.getColor(inputForeground);
	if (inputForegroundColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner .mtk1 { color: ${inputForegroundColor}; }`);
	}

	const inputBorderColor = theme.getColor(inputBorder);
	if (inputBorderColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner { outline: 1px solid ${inputBorderColor}; }`);
	}

	const pAnelInputBorder = theme.getColor(PANEL_INPUT_BORDER);
	if (pAnelInputBorder) {
		collector.AddRule(`.monAco-workbench .pArt.pAnel .scm-view .scm-editor-contAiner { outline: 1px solid ${pAnelInputBorder}; }`);
	}

	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner.synthetic-focus { outline: 1px solid ${focusBorderColor}; }`);
	}

	const inputPlAceholderForegroundColor = theme.getColor(inputPlAceholderForeground);
	if (inputPlAceholderForegroundColor) {
		collector.AddRule(`.scm-view .scm-editor-plAceholder { color: ${inputPlAceholderForegroundColor}; }`);
	}

	const inputVAlidAtionInfoBorderColor = theme.getColor(inputVAlidAtionInfoBorder);
	if (inputVAlidAtionInfoBorderColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner.vAlidAtion-info { outline: 1px solid ${inputVAlidAtionInfoBorderColor} !importAnt; }`);
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-info { border-color: ${inputVAlidAtionInfoBorderColor}; }`);
	}

	const inputVAlidAtionInfoBAckgroundColor = theme.getColor(inputVAlidAtionInfoBAckground);
	if (inputVAlidAtionInfoBAckgroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-info { bAckground-color: ${inputVAlidAtionInfoBAckgroundColor}; }`);
	}

	const inputVAlidAtionInfoForegroundColor = theme.getColor(inputVAlidAtionInfoForeground);
	if (inputVAlidAtionInfoForegroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-info { color: ${inputVAlidAtionInfoForegroundColor}; }`);
	}

	const inputVAlidAtionWArningBorderColor = theme.getColor(inputVAlidAtionWArningBorder);
	if (inputVAlidAtionWArningBorderColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner.vAlidAtion-wArning { outline: 1px solid ${inputVAlidAtionWArningBorderColor} !importAnt; }`);
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-wArning { border-color: ${inputVAlidAtionWArningBorderColor}; }`);
	}

	const inputVAlidAtionWArningBAckgroundColor = theme.getColor(inputVAlidAtionWArningBAckground);
	if (inputVAlidAtionWArningBAckgroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-wArning { bAckground-color: ${inputVAlidAtionWArningBAckgroundColor}; }`);
	}

	const inputVAlidAtionWArningForegroundColor = theme.getColor(inputVAlidAtionWArningForeground);
	if (inputVAlidAtionWArningForegroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-wArning { color: ${inputVAlidAtionWArningForegroundColor}; }`);
	}

	const inputVAlidAtionErrorBorderColor = theme.getColor(inputVAlidAtionErrorBorder);
	if (inputVAlidAtionErrorBorderColor) {
		collector.AddRule(`.scm-view .scm-editor-contAiner.vAlidAtion-error { outline: 1px solid ${inputVAlidAtionErrorBorderColor} !importAnt; }`);
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-error { border-color: ${inputVAlidAtionErrorBorderColor}; }`);
	}

	const inputVAlidAtionErrorBAckgroundColor = theme.getColor(inputVAlidAtionErrorBAckground);
	if (inputVAlidAtionErrorBAckgroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-error { bAckground-color: ${inputVAlidAtionErrorBAckgroundColor}; }`);
	}

	const inputVAlidAtionErrorForegroundColor = theme.getColor(inputVAlidAtionErrorForeground);
	if (inputVAlidAtionErrorForegroundColor) {
		collector.AddRule(`.scm-editor-vAlidAtion.vAlidAtion-error { color: ${inputVAlidAtionErrorForegroundColor}; }`);
	}

	const repositoryStAtusActionsBorderColor = theme.getColor(SIDE_BAR_BORDER);
	if (repositoryStAtusActionsBorderColor) {
		collector.AddRule(`.scm-view .scm-provider > .stAtus > .monAco-Action-bAr > .Actions-contAiner { border-color: ${repositoryStAtusActionsBorderColor}; }`);
	}
});
