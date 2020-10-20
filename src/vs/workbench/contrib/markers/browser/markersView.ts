/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/mArkers';

import { URI } from 'vs/bAse/common/uri';
import * As dom from 'vs/bAse/browser/dom';
import { IAction, IActionViewItem, Action, SepArAtor } from 'vs/bAse/common/Actions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import ConstAnts from 'vs/workbench/contrib/mArkers/browser/constAnts';
import { MArker, ResourceMArkers, RelAtedInformAtion, MArkerChAngesEvent } from 'vs/workbench/contrib/mArkers/browser/mArkersModel';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MArkersFilterActionViewItem, MArkersFilters, IMArkersFiltersChAngeEvent, IMArkerFilterController } from 'vs/workbench/contrib/mArkers/browser/mArkersViewActions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import MessAges from 'vs/workbench/contrib/mArkers/browser/messAges';
import { RAngeHighlightDecorAtions } from 'vs/workbench/browser/pArts/editor/rAngeDecorAtions';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IMArkersWorkbenchService } from 'vs/workbench/contrib/mArkers/browser/mArkers';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { locAlize } from 'vs/nls';
import { IContextKey, IContextKeyService, ContextKeyEquAlsExpr, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { ITreeElement, ITreeNode, ITreeContextMenuEvent, ITreeRenderer } from 'vs/bAse/browser/ui/tree/tree';
import { RelAy, Event, Emitter } from 'vs/bAse/common/event';
import { WorkbenchObjectTree, IListService, IWorkbenchObjectTreeOptions } from 'vs/plAtform/list/browser/listService';
import { FilterOptions } from 'vs/workbench/contrib/mArkers/browser/mArkersFilterOptions';
import { IExpression } from 'vs/bAse/common/glob';
import { deepClone } from 'vs/bAse/common/objects';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { FilterDAtA, Filter, VirtuAlDelegAte, ResourceMArkersRenderer, MArkerRenderer, RelAtedInformAtionRenderer, TreeElement, MArkersTreeAccessibilityProvider, MArkersViewModel, ResourceDrAgAndDrop } from 'vs/workbench/contrib/mArkers/browser/mArkersTreeViewer';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IMenuService, MenuId, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { StAndArdKeyboArdEvent, IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { domEvent } from 'vs/bAse/browser/event';
import { ResourceLAbels } from 'vs/workbench/browser/lAbels';
import { IMArker } from 'vs/plAtform/mArkers/common/mArkers';
import { withUndefinedAsNull } from 'vs/bAse/common/types';
import { MementoObject, Memento } from 'vs/workbench/common/memento';
import { IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { editorLightBulbForeground, editorLightBulbAutoFixForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { Codicon } from 'vs/bAse/common/codicons';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

function creAteResourceMArkersIterAtor(resourceMArkers: ResourceMArkers): IterAble<ITreeElement<TreeElement>> {
	return IterAble.mAp(resourceMArkers.mArkers, m => {
		const relAtedInformAtionIt = IterAble.from(m.relAtedInformAtion);
		const children = IterAble.mAp(relAtedInformAtionIt, r => ({ element: r }));

		return { element: m, children };
	});
}

export clAss MArkersView extends ViewPAne implements IMArkerFilterController {

	privAte lAstSelectedRelAtiveTop: number = 0;
	privAte currentActiveResource: URI | null = null;

	privAte reAdonly rAngeHighlightDecorAtions: RAngeHighlightDecorAtions;
	privAte reAdonly filter: Filter;

	privAte tree: MArkersTree | undefined;
	privAte filterActionBAr: ActionBAr | undefined;
	privAte messAgeBoxContAiner: HTMLElement | undefined;
	privAte AriALAbelElement: HTMLElement | undefined;
	reAdonly filters: MArkersFilters;

	privAte reAdonly pAnelStAte: MementoObject;

	privAte _onDidChAngeFilterStAts = this._register(new Emitter<{ totAl: number, filtered: number }>());
	reAdonly onDidChAngeFilterStAts: Event<{ totAl: number, filtered: number }> = this._onDidChAngeFilterStAts.event;
	privAte cAchedFilterStAts: { totAl: number; filtered: number; } | undefined = undefined;

	privAte currentResourceGotAddedToMArkersDAtA: booleAn = fAlse;
	reAdonly mArkersViewModel: MArkersViewModel;
	privAte reAdonly smAllLAyoutContextKey: IContextKey<booleAn>;
	privAte get smAllLAyout(): booleAn { return !!this.smAllLAyoutContextKey.get(); }
	privAte set smAllLAyout(smAllLAyout: booleAn) { this.smAllLAyoutContextKey.set(smAllLAyout); }

	reAdonly onDidChAngeVisibility = this.onDidChAngeBodyVisibility;

	privAte reAdonly _onDidFocusFilter: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidFocusFilter: Event<void> = this._onDidFocusFilter.event;

	privAte reAdonly _onDidCleArFilterText: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidCleArFilterText: Event<void> = this._onDidCleArFilterText.event;

	constructor(
		options: IViewPAneOptions,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IMArkersWorkbenchService privAte reAdonly mArkersWorkbenchService: IMArkersWorkbenchService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.smAllLAyoutContextKey = ConstAnts.MArkersViewSmAllLAyoutContextKey.bindTo(this.contextKeyService);
		this.pAnelStAte = new Memento(ConstAnts.MARKERS_VIEW_STORAGE_ID, storAgeService).getMemento(StorAgeScope.WORKSPACE);

		this.mArkersViewModel = this._register(instAntiAtionService.creAteInstAnce(MArkersViewModel, this.pAnelStAte['multiline']));
		for (const resourceMArker of this.mArkersWorkbenchService.mArkersModel.resourceMArkers) {
			resourceMArker.mArkers.forEAch(mArker => this.mArkersViewModel.Add(mArker));
		}
		this._register(this.mArkersViewModel.onDidChAnge(mArker => this.onDidChAngeViewStAte(mArker)));

		this.setCurrentActiveEditor();

		this.filter = new Filter(new FilterOptions());
		this.rAngeHighlightDecorAtions = this._register(this.instAntiAtionService.creAteInstAnce(RAngeHighlightDecorAtions));

		// Actions
		this.regiserActions();
		this.filters = this._register(new MArkersFilters({
			filterText: this.pAnelStAte['filter'] || '',
			filterHistory: this.pAnelStAte['filterHistory'] || [],
			showErrors: this.pAnelStAte['showErrors'] !== fAlse,
			showWArnings: this.pAnelStAte['showWArnings'] !== fAlse,
			showInfos: this.pAnelStAte['showInfos'] !== fAlse,
			excludedFiles: !!this.pAnelStAte['useFilesExclude'],
			ActiveFile: !!this.pAnelStAte['ActiveFile'],
			lAyout: new dom.Dimension(0, 0)
		}));
	}

	public renderBody(pArent: HTMLElement): void {
		super.renderBody(pArent);

		pArent.clAssList.Add('mArkers-pAnel');

		const contAiner = dom.Append(pArent, dom.$('.mArkers-pAnel-contAiner'));

		this.creAteFilterActionBAr(contAiner);
		this.creAteAriAlLAbelElement(contAiner);
		this.creAteMessAgeBox(contAiner);
		this.creAteTree(contAiner);
		this.creAteListeners();

		this.updAteFilter();

		this._register(this.onDidChAngeVisibility(visible => {
			if (visible) {
				this.refreshPAnel();
			} else {
				this.rAngeHighlightDecorAtions.removeHighlightRAnge();
			}
		}));

		this.filterActionBAr!.push(new Action(`workbench.Actions.treeView.${this.id}.filter`));
		this.renderContent();
	}

	public getTitle(): string {
		return MessAges.MARKERS_PANEL_TITLE_PROBLEMS;
	}

	public lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		const wAsSmAllLAyout = this.smAllLAyout;
		this.smAllLAyout = width < 600 && height > 100;
		if (this.smAllLAyout !== wAsSmAllLAyout) {
			if (this.filterActionBAr) {
				this.filterActionBAr.getContAiner().clAssList.toggle('hide', !this.smAllLAyout);
			}
		}
		const contentHeight = this.smAllLAyout ? height - 44 : height;
		if (this.tree) {
			this.tree.lAyout(contentHeight, width);
		}
		if (this.messAgeBoxContAiner) {
			this.messAgeBoxContAiner.style.height = `${contentHeight}px`;
		}
		this.filters.lAyout = new dom.Dimension(this.smAllLAyout ? width : width - 200, height);
	}

	public focus(): void {
		if (this.tree && this.tree.getHTMLElement() === document.ActiveElement) {
			return;
		}

		if (this.hAsNoProblems() && this.messAgeBoxContAiner) {
			this.messAgeBoxContAiner.focus();
		} else if (this.tree) {
			this.tree.domFocus();
			this.setTreeSelection();
		}
	}

	public focusFilter(): void {
		this._onDidFocusFilter.fire();
	}

	public cleArFilterText(): void {
		this._onDidCleArFilterText.fire();
	}

	privAte regiserActions(): void {
		const thAt = this;
		this._register(registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.treeView.${thAt.id}.collApseAll`,
					title: locAlize('collApseAll', "CollApse All"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyEquAlsExpr.creAte('view', thAt.id),
						group: 'nAvigAtion',
						order: Number.MAX_SAFE_INTEGER,
					},
					icon: { id: 'codicon/collApse-All' }
				});
			}
			Async run(): Promise<void> {
				return thAt.collApseAll();
			}
		}));
		this._register(registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.treeView.${thAt.id}.filter`,
					title: locAlize('filter', "Filter"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyExpr.And(ContextKeyEquAlsExpr.creAte('view', thAt.id), ConstAnts.MArkersViewSmAllLAyoutContextKey.negAte()),
						group: 'nAvigAtion',
						order: 1,
					},
				});
			}
			Async run(): Promise<void> { }
		}));
	}

	public showQuickFixes(mArker: MArker): void {
		const viewModel = this.mArkersViewModel.getViewModel(mArker);
		if (viewModel) {
			viewModel.quickFixAction.run();
		}
	}

	public openFileAtElement(element: Any, preserveFocus: booleAn, sideByside: booleAn, pinned: booleAn): booleAn {
		const { resource, selection, event, dAtA } = element instAnceof MArker ? { resource: element.resource, selection: element.rAnge, event: 'problems.selectDiAgnostic', dAtA: this.getTelemetryDAtA(element.mArker) } :
			element instAnceof RelAtedInformAtion ? { resource: element.rAw.resource, selection: element.rAw, event: 'problems.selectRelAtedInformAtion', dAtA: this.getTelemetryDAtA(element.mArker) } : { resource: null, selection: null, event: null, dAtA: null };
		if (resource && selection && event) {
			/* __GDPR__
			"problems.selectDiAgnostic" : {
				"source": { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"code" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" }
			}
			*/
			/* __GDPR__
				"problems.selectRelAtedInformAtion" : {
					"source": { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
					"code" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryService.publicLog(event, dAtA);
			this.editorService.openEditor({
				resource,
				options: {
					selection,
					preserveFocus,
					pinned,
					reveAlIfVisible: true
				},
			}, sideByside ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
				if (editor && preserveFocus) {
					this.rAngeHighlightDecorAtions.highlightRAnge({ resource, rAnge: selection }, <ICodeEditor>editor.getControl());
				} else {
					this.rAngeHighlightDecorAtions.removeHighlightRAnge();
				}
			});
			return true;
		} else {
			this.rAngeHighlightDecorAtions.removeHighlightRAnge();
		}
		return fAlse;
	}

	privAte refreshPAnel(mArkerOrChAnge?: MArker | MArkerChAngesEvent): void {
		if (this.isVisible() && this.tree) {
			const hAsSelection = this.tree.getSelection().length > 0;
			this.cAchedFilterStAts = undefined;

			if (mArkerOrChAnge) {
				if (mArkerOrChAnge instAnceof MArker) {
					this.tree.rerender(mArkerOrChAnge);
				} else {
					if (mArkerOrChAnge.Added.size || mArkerOrChAnge.removed.size) {
						// Reset complete tree
						this.resetTree();
					} else {
						// UpdAte resource
						for (const updAted of mArkerOrChAnge.updAted) {
							this.tree.setChildren(updAted, creAteResourceMArkersIterAtor(updAted));
							this.tree.rerender(updAted);
						}
					}
				}
			} else {
				// Reset complete tree
				this.resetTree();
			}

			const { totAl, filtered } = this.getFilterStAts();
			this.tree.toggleVisibility(totAl === 0 || filtered === 0);
			this.renderMessAge();
			this._onDidChAngeFilterStAts.fire(this.getFilterStAts());

			if (hAsSelection) {
				this.setTreeSelection();
			}
		}
	}

	privAte setTreeSelection(): void {
		if (this.tree && this.tree.getSelection().length === 0) {
			const firstMArker = this.mArkersWorkbenchService.mArkersModel.resourceMArkers[0]?.mArkers[0];
			if (firstMArker) {
				this.tree.setFocus([firstMArker]);
				this.tree.setSelection([firstMArker]);
			}
		}
	}

	privAte onDidChAngeViewStAte(mArker?: MArker): void {
		this.refreshPAnel(mArker);
	}

	privAte resetTree(): void {
		if (!this.tree) {
			return;
		}
		let resourceMArkers: ResourceMArkers[] = [];
		if (this.filters.ActiveFile) {
			if (this.currentActiveResource) {
				const ActiveResourceMArkers = this.mArkersWorkbenchService.mArkersModel.getResourceMArkers(this.currentActiveResource);
				if (ActiveResourceMArkers) {
					resourceMArkers = [ActiveResourceMArkers];
				}
			}
		} else {
			resourceMArkers = this.mArkersWorkbenchService.mArkersModel.resourceMArkers;
		}
		this.tree.setChildren(null, IterAble.mAp(resourceMArkers, m => ({ element: m, children: creAteResourceMArkersIterAtor(m) })));
	}

	privAte updAteFilter() {
		this.cAchedFilterStAts = undefined;
		this.filter.options = new FilterOptions(this.filters.filterText, this.getFilesExcludeExpressions(), this.filters.showWArnings, this.filters.showErrors, this.filters.showInfos);
		if (this.tree) {
			this.tree.refilter();
		}
		this._onDidChAngeFilterStAts.fire(this.getFilterStAts());

		const { totAl, filtered } = this.getFilterStAts();
		if (this.tree) {
			this.tree.toggleVisibility(totAl === 0 || filtered === 0);
		}
		this.renderMessAge();
	}

	privAte getFilesExcludeExpressions(): { root: URI, expression: IExpression }[] | IExpression {
		if (!this.filters.excludedFiles) {
			return [];
		}

		const workspAceFolders = this.workspAceContextService.getWorkspAce().folders;
		return workspAceFolders.length
			? workspAceFolders.mAp(workspAceFolder => ({ root: workspAceFolder.uri, expression: this.getFilesExclude(workspAceFolder.uri) }))
			: this.getFilesExclude();
	}

	privAte getFilesExclude(resource?: URI): IExpression {
		return deepClone(this.configurAtionService.getVAlue('files.exclude', { resource })) || {};
	}

	privAte creAteFilterActionBAr(pArent: HTMLElement): void {
		this.filterActionBAr = this._register(new ActionBAr(pArent, { ActionViewItemProvider: Action => this.getActionViewItem(Action) }));
		this.filterActionBAr.getContAiner().clAssList.Add('mArkers-pAnel-filter-contAiner');
		this.filterActionBAr.getContAiner().clAssList.toggle('hide', !this.smAllLAyout);
	}

	privAte creAteMessAgeBox(pArent: HTMLElement): void {
		this.messAgeBoxContAiner = dom.Append(pArent, dom.$('.messAge-box-contAiner'));
		this.messAgeBoxContAiner.setAttribute('AriA-lAbelledby', 'mArkers-pAnel-AriAlAbel');
	}

	privAte creAteAriAlLAbelElement(pArent: HTMLElement): void {
		this.AriALAbelElement = dom.Append(pArent, dom.$(''));
		this.AriALAbelElement.setAttribute('id', 'mArkers-pAnel-AriAlAbel');
	}

	privAte creAteTree(pArent: HTMLElement): void {
		const onDidChAngeRenderNodeCount = new RelAy<ITreeNode<Any, Any>>();

		const treeLAbels = this._register(this.instAntiAtionService.creAteInstAnce(ResourceLAbels, this));

		const virtuAlDelegAte = new VirtuAlDelegAte(this.mArkersViewModel);
		const renderers = [
			this.instAntiAtionService.creAteInstAnce(ResourceMArkersRenderer, treeLAbels, onDidChAngeRenderNodeCount.event),
			this.instAntiAtionService.creAteInstAnce(MArkerRenderer, this.mArkersViewModel),
			this.instAntiAtionService.creAteInstAnce(RelAtedInformAtionRenderer)
		];
		const AccessibilityProvider = this.instAntiAtionService.creAteInstAnce(MArkersTreeAccessibilityProvider);

		const identityProvider = {
			getId(element: TreeElement) {
				return element.id;
			}
		};

		this.tree = this._register(this.instAntiAtionService.creAteInstAnce(MArkersTree,
			'MArkersView',
			dom.Append(pArent, dom.$('.tree-contAiner.show-file-icons')),
			virtuAlDelegAte,
			renderers,
			{
				filter: this.filter,
				AccessibilityProvider,
				identityProvider,
				dnd: new ResourceDrAgAndDrop(this.instAntiAtionService),
				expAndOnlyOnTwistieClick: (e: TreeElement) => e instAnceof MArker && e.relAtedInformAtion.length > 0,
				overrideStyles: {
					listBAckground: this.getBAckgroundColor()
				},
				openOnFocus: true
			},
		));

		onDidChAngeRenderNodeCount.input = this.tree.onDidChAngeRenderNodeCount;

		const mArkerFocusContextKey = ConstAnts.MArkerFocusContextKey.bindTo(this.tree.contextKeyService);
		const relAtedInformAtionFocusContextKey = ConstAnts.RelAtedInformAtionFocusContextKey.bindTo(this.tree.contextKeyService);
		this._register(this.tree.onDidChAngeFocus(focus => {
			mArkerFocusContextKey.set(focus.elements.some(e => e instAnceof MArker));
			relAtedInformAtionFocusContextKey.set(focus.elements.some(e => e instAnceof RelAtedInformAtion));
		}));

		this._register(Event.debounce(this.tree.onDidOpen, (lAst, event) => event, 75, true)(options => {
			this.openFileAtElement(options.element, !!options.editorOptions.preserveFocus, options.sideBySide, !!options.editorOptions.pinned);
		}));
		this._register(this.tree.onDidChAngeCollApseStAte(({ node }) => {
			const { element } = node;
			if (element instAnceof RelAtedInformAtion && !node.collApsed) {
				/* __GDPR__
				"problems.expAndRelAtedInformAtion" : {
					"source": { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
					"code" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" }
				}
				*/
				this.telemetryService.publicLog('problems.expAndRelAtedInformAtion', this.getTelemetryDAtA(element.mArker));
			}
		}));

		this._register(this.tree.onContextMenu(this.onContextMenu, this));

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (this.filters.excludedFiles && e.AffectsConfigurAtion('files.exclude')) {
				this.updAteFilter();
			}
		}));

		// move focus to input, whenever A key is pressed in the pAnel contAiner
		this._register(domEvent(pArent, 'keydown')(e => {
			if (this.keybindingService.mightProducePrintAbleChArActer(new StAndArdKeyboArdEvent(e))) {
				this.focusFilter();
			}
		}));

		this._register(Event.Any<Any>(this.tree.onDidChAngeSelection, this.tree.onDidChAngeFocus)(() => {
			const elements = [...this.tree!.getSelection(), ...this.tree!.getFocus()];
			for (const element of elements) {
				if (element instAnceof MArker) {
					const viewModel = this.mArkersViewModel.getViewModel(element);
					if (viewModel) {
						viewModel.showLightBulb();
					}
				}
			}
		}));
	}

	privAte collApseAll(): void {
		if (this.tree) {
			this.tree.collApseAll();
			this.tree.setSelection([]);
			this.tree.setFocus([]);
			this.tree.getHTMLElement().focus();
			this.tree.focusFirst();
		}
	}

	privAte creAteListeners(): void {
		this._register(Event.Any<MArkerChAngesEvent | void>(this.mArkersWorkbenchService.mArkersModel.onDidChAnge, this.editorService.onDidActiveEditorChAnge)(chAnges => {
			if (chAnges) {
				this.onDidChAngeModel(chAnges);
			} else {
				this.onActiveEditorChAnged();
			}
		}));
		if (this.tree) {
			this._register(this.tree.onDidChAngeSelection(() => this.onSelected()));
		}
		this._register(this.filters.onDidChAnge((event: IMArkersFiltersChAngeEvent) => {
			this.reportFilteringUsed();
			if (event.ActiveFile) {
				this.refreshPAnel();
			} else if (event.filterText || event.excludedFiles || event.showWArnings || event.showErrors || event.showInfos) {
				this.updAteFilter();
			}
		}));
	}

	privAte onDidChAngeModel(chAnge: MArkerChAngesEvent) {
		const resourceMArkers = [...chAnge.Added, ...chAnge.removed, ...chAnge.updAted];
		const resources: URI[] = [];
		for (const { resource } of resourceMArkers) {
			this.mArkersViewModel.remove(resource);
			const resourceMArkers = this.mArkersWorkbenchService.mArkersModel.getResourceMArkers(resource);
			if (resourceMArkers) {
				for (const mArker of resourceMArkers.mArkers) {
					this.mArkersViewModel.Add(mArker);
				}
			}
			resources.push(resource);
		}
		this.currentResourceGotAddedToMArkersDAtA = this.currentResourceGotAddedToMArkersDAtA || this.isCurrentResourceGotAddedToMArkersDAtA(resources);
		this.refreshPAnel(chAnge);
		this.updAteRAngeHighlights();
		if (this.currentResourceGotAddedToMArkersDAtA) {
			this.AutoReveAl();
			this.currentResourceGotAddedToMArkersDAtA = fAlse;
		}
	}

	privAte isCurrentResourceGotAddedToMArkersDAtA(chAngedResources: URI[]) {
		const currentlyActiveResource = this.currentActiveResource;
		if (!currentlyActiveResource) {
			return fAlse;
		}
		const resourceForCurrentActiveResource = this.getResourceForCurrentActiveResource();
		if (resourceForCurrentActiveResource) {
			return fAlse;
		}
		return chAngedResources.some(r => r.toString() === currentlyActiveResource.toString());
	}

	privAte onActiveEditorChAnged(): void {
		this.setCurrentActiveEditor();
		if (this.filters.ActiveFile) {
			this.refreshPAnel();
		}
		this.AutoReveAl();
	}

	privAte setCurrentActiveEditor(): void {
		const ActiveEditor = this.editorService.ActiveEditor;
		this.currentActiveResource = ActiveEditor ? withUndefinedAsNull(ActiveEditor.resource) : null;
	}

	privAte onSelected(): void {
		if (this.tree) {
			let selection = this.tree.getSelection();
			if (selection && selection.length > 0) {
				this.lAstSelectedRelAtiveTop = this.tree!.getRelAtiveTop(selection[0]) || 0;
			}
		}
	}

	privAte hAsNoProblems(): booleAn {
		const { totAl, filtered } = this.getFilterStAts();
		return totAl === 0 || filtered === 0;
	}

	privAte renderContent(): void {
		this.cAchedFilterStAts = undefined;
		this.resetTree();
		if (this.tree) {
			this.tree.toggleVisibility(this.hAsNoProblems());
		}
		this.renderMessAge();
	}

	privAte renderMessAge(): void {
		if (!this.messAgeBoxContAiner || !this.AriALAbelElement) {
			return;
		}
		dom.cleArNode(this.messAgeBoxContAiner);
		const { totAl, filtered } = this.getFilterStAts();

		if (filtered === 0) {
			this.messAgeBoxContAiner.style.displAy = 'block';
			this.messAgeBoxContAiner.setAttribute('tAbIndex', '0');
			if (this.filters.ActiveFile) {
				this.renderFilterMessAgeForActiveFile(this.messAgeBoxContAiner);
			} else {
				if (totAl > 0) {
					this.renderFilteredByFilterMessAge(this.messAgeBoxContAiner);
				} else {
					this.renderNoProblemsMessAge(this.messAgeBoxContAiner);
				}
			}
		} else {
			this.messAgeBoxContAiner.style.displAy = 'none';
			if (filtered === totAl) {
				this.setAriALAbel(locAlize('No problems filtered', "Showing {0} problems", totAl));
			} else {
				this.setAriALAbel(locAlize('problems filtered', "Showing {0} of {1} problems", filtered, totAl));
			}
			this.messAgeBoxContAiner.removeAttribute('tAbIndex');
		}
	}

	privAte renderFilterMessAgeForActiveFile(contAiner: HTMLElement): void {
		if (this.currentActiveResource && this.mArkersWorkbenchService.mArkersModel.getResourceMArkers(this.currentActiveResource)) {
			this.renderFilteredByFilterMessAge(contAiner);
		} else {
			this.renderNoProblemsMessAgeForActiveFile(contAiner);
		}
	}

	privAte renderFilteredByFilterMessAge(contAiner: HTMLElement) {
		const spAn1 = dom.Append(contAiner, dom.$('spAn'));
		spAn1.textContent = MessAges.MARKERS_PANEL_NO_PROBLEMS_FILTERS;
		const link = dom.Append(contAiner, dom.$('A.messAgeAction'));
		link.textContent = locAlize('cleArFilter', "CleAr Filters");
		link.setAttribute('tAbIndex', '0');
		const spAn2 = dom.Append(contAiner, dom.$('spAn'));
		spAn2.textContent = '.';
		dom.AddStAndArdDisposAbleListener(link, dom.EventType.CLICK, () => this.cleArFilters());
		dom.AddStAndArdDisposAbleListener(link, dom.EventType.KEY_DOWN, (e: IKeyboArdEvent) => {
			if (e.equAls(KeyCode.Enter) || e.equAls(KeyCode.SpAce)) {
				this.cleArFilters();
				e.stopPropAgAtion();
			}
		});
		this.setAriALAbel(MessAges.MARKERS_PANEL_NO_PROBLEMS_FILTERS);
	}

	privAte renderNoProblemsMessAgeForActiveFile(contAiner: HTMLElement) {
		const spAn = dom.Append(contAiner, dom.$('spAn'));
		spAn.textContent = MessAges.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT;
		this.setAriALAbel(MessAges.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT);
	}

	privAte renderNoProblemsMessAge(contAiner: HTMLElement) {
		const spAn = dom.Append(contAiner, dom.$('spAn'));
		spAn.textContent = MessAges.MARKERS_PANEL_NO_PROBLEMS_BUILT;
		this.setAriALAbel(MessAges.MARKERS_PANEL_NO_PROBLEMS_BUILT);
	}

	privAte setAriALAbel(lAbel: string): void {
		if (this.tree) {
			this.tree.AriALAbel = lAbel;
		}
		this.AriALAbelElement!.setAttribute('AriA-lAbel', lAbel);
	}

	privAte cleArFilters(): void {
		this.filters.filterText = '';
		this.filters.excludedFiles = fAlse;
		this.filters.showErrors = true;
		this.filters.showWArnings = true;
		this.filters.showInfos = true;
	}

	privAte AutoReveAl(focus: booleAn = fAlse): void {
		// No need to Auto reveAl if Active file filter is on
		if (this.filters.ActiveFile || !this.tree) {
			return;
		}
		let AutoReveAl = this.configurAtionService.getVAlue<booleAn>('problems.AutoReveAl');
		if (typeof AutoReveAl === 'booleAn' && AutoReveAl) {
			let currentActiveResource = this.getResourceForCurrentActiveResource();
			if (currentActiveResource) {
				if (this.tree.hAsElement(currentActiveResource)) {
					if (!this.tree.isCollApsed(currentActiveResource) && this.hAsSelectedMArkerFor(currentActiveResource)) {
						this.tree.reveAl(this.tree.getSelection()[0], this.lAstSelectedRelAtiveTop);
						if (focus) {
							this.tree.setFocus(this.tree.getSelection());
						}
					} else {
						this.tree.expAnd(currentActiveResource);
						this.tree.reveAl(currentActiveResource, 0);

						if (focus) {
							this.tree.setFocus([currentActiveResource]);
							this.tree.setSelection([currentActiveResource]);
						}
					}
				}
			} else if (focus) {
				this.tree.setSelection([]);
				this.tree.focusFirst();
			}
		}
	}

	privAte getResourceForCurrentActiveResource(): ResourceMArkers | null {
		return this.currentActiveResource ? this.mArkersWorkbenchService.mArkersModel.getResourceMArkers(this.currentActiveResource) : null;
	}

	privAte hAsSelectedMArkerFor(resource: ResourceMArkers): booleAn {
		if (this.tree) {
			let selectedElement = this.tree.getSelection();
			if (selectedElement && selectedElement.length > 0) {
				if (selectedElement[0] instAnceof MArker) {
					if (resource.hAs((<MArker>selectedElement[0]).mArker.resource)) {
						return true;
					}
				}
			}
		}
		return fAlse;
	}

	privAte updAteRAngeHighlights() {
		this.rAngeHighlightDecorAtions.removeHighlightRAnge();
		if (this.tree && this.tree.getHTMLElement() === document.ActiveElement) {
			this.highlightCurrentSelectedMArkerRAnge();
		}
	}

	privAte highlightCurrentSelectedMArkerRAnge() {
		const selections = this.tree ? this.tree.getSelection() : [];

		if (selections.length !== 1) {
			return;
		}

		const selection = selections[0];

		if (!(selection instAnceof MArker)) {
			return;
		}

		this.rAngeHighlightDecorAtions.highlightRAnge(selection);
	}

	privAte onContextMenu(e: ITreeContextMenuEvent<TreeElement | null>): void {
		const element = e.element;
		if (!element) {
			return;
		}

		e.browserEvent.preventDefAult();
		e.browserEvent.stopPropAgAtion();

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor!,
			getActions: () => this.getMenuActions(element),
			getActionViewItem: (Action) => {
				const keybinding = this.keybindingService.lookupKeybinding(Action.id);
				if (keybinding) {
					return new ActionViewItem(Action, Action, { lAbel: true, keybinding: keybinding.getLAbel() });
				}
				return undefined;
			},
			onHide: (wAsCAncelled?: booleAn) => {
				if (wAsCAncelled) {
					this.tree!.domFocus();
				}
			}
		});
	}

	privAte getMenuActions(element: TreeElement): IAction[] {
		const result: IAction[] = [];

		if (element instAnceof MArker) {
			const viewModel = this.mArkersViewModel.getViewModel(element);
			if (viewModel) {
				const quickFixActions = viewModel.quickFixAction.quickFixes;
				if (quickFixActions.length) {
					result.push(...quickFixActions);
					result.push(new SepArAtor());
				}
			}
		}

		const menu = this.menuService.creAteMenu(MenuId.ProblemsPAnelContext, this.tree!.contextKeyService);
		const groups = menu.getActions();
		menu.dispose();

		for (let group of groups) {
			const [, Actions] = group;
			result.push(...Actions);
			result.push(new SepArAtor());
		}

		result.pop(); // remove lAst sepArAtor
		return result;
	}

	public getFocusElement() {
		return this.tree ? this.tree.getFocus()[0] : undefined;
	}

	public getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (Action.id === `workbench.Actions.treeView.${this.id}.filter`) {
			return this.instAntiAtionService.creAteInstAnce(MArkersFilterActionViewItem, Action, this);
		}
		return super.getActionViewItem(Action);
	}

	getFilterStAts(): { totAl: number; filtered: number; } {
		if (!this.cAchedFilterStAts) {
			this.cAchedFilterStAts = this.computeFilterStAts();
		}

		return this.cAchedFilterStAts;
	}

	privAte computeFilterStAts(): { totAl: number; filtered: number; } {
		let filtered = 0;
		if (this.tree) {
			const root = this.tree.getNode();

			for (const resourceMArkerNode of root.children) {
				for (const mArkerNode of resourceMArkerNode.children) {
					if (resourceMArkerNode.visible && mArkerNode.visible) {
						filtered++;
					}
				}
			}
		}

		return { totAl: this.mArkersWorkbenchService.mArkersModel.totAl, filtered };
	}

	privAte getTelemetryDAtA({ source, code }: IMArker): Any {
		return { source, code };
	}

	privAte reportFilteringUsed(): void {
		const dAtA = {
			errors: this.filters.showErrors,
			wArnings: this.filters.showWArnings,
			infos: this.filters.showInfos,
			ActiveFile: this.filters.ActiveFile,
			excludedFiles: this.filters.excludedFiles,
		};
		/* __GDPR__
			"problems.filter" : {
				"errors" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"wArnings": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"infos": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"ActiveFile": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"excludedFiles": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
			}
		*/
		this.telemetryService.publicLog('problems.filter', dAtA);
	}

	sAveStAte(): void {
		this.pAnelStAte['filter'] = this.filters.filterText;
		this.pAnelStAte['filterHistory'] = this.filters.filterHistory;
		this.pAnelStAte['showErrors'] = this.filters.showErrors;
		this.pAnelStAte['showWArnings'] = this.filters.showWArnings;
		this.pAnelStAte['showInfos'] = this.filters.showInfos;
		this.pAnelStAte['useFilesExclude'] = this.filters.excludedFiles;
		this.pAnelStAte['ActiveFile'] = this.filters.ActiveFile;
		this.pAnelStAte['multiline'] = this.mArkersViewModel.multiline;

		super.sAveStAte();
	}

	dispose() {
		super.dispose();
	}

}

clAss MArkersTree extends WorkbenchObjectTree<TreeElement, FilterDAtA> {

	constructor(
		user: string,
		reAdonly contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<TreeElement>,
		renderers: ITreeRenderer<TreeElement, FilterDAtA, Any>[],
		options: IWorkbenchObjectTreeOptions<TreeElement, FilterDAtA>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		super(user, contAiner, delegAte, renderers, options, contextKeyService, listService, themeService, configurAtionService, keybindingService, AccessibilityService);
	}

	lAyout(height: number, width: number): void {
		this.contAiner.style.height = `${height}px`;
		super.lAyout(height, width);
	}

	toggleVisibility(hide: booleAn): void {
		this.contAiner.clAssList.toggle('hidden', hide);
	}

}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	// Lightbulb Icon
	const editorLightBulbForegroundColor = theme.getColor(editorLightBulbForeground);
	if (editorLightBulbForegroundColor) {
		collector.AddRule(`
		.monAco-workbench .mArkers-pAnel-contAiner ${Codicon.lightBulb.cssSelector} {
			color: ${editorLightBulbForegroundColor};
		}`);
	}

	// Lightbulb Auto Fix Icon
	const editorLightBulbAutoFixForegroundColor = theme.getColor(editorLightBulbAutoFixForeground);
	if (editorLightBulbAutoFixForegroundColor) {
		collector.AddRule(`
		.monAco-workbench .mArkers-pAnel-contAiner ${Codicon.lightbulbAutofix.cssSelector} {
			color: ${editorLightBulbAutoFixForegroundColor};
		}`);
	}

});
