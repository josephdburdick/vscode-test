/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DelAyer } from 'vs/bAse/common/Async';
import * As DOM from 'vs/bAse/browser/dom';
import { Action, IAction, IActionRunner, SepArAtor } from 'vs/bAse/common/Actions';
import { HistoryInputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IContextViewService, IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import MessAges from 'vs/workbench/contrib/mArkers/browser/messAges';
import ConstAnts from 'vs/workbench/contrib/mArkers/browser/constAnts';
import { IThemeService, registerThemingPArticipAnt, ICssStyleCollector, IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { AttAchInputBoxStyler, AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { toDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { bAdgeBAckground, bAdgeForeground, contrAstBorder, inputActiveOptionBorder, inputActiveOptionBAckground, inputActiveOptionForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { locAlize } from 'vs/nls';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ContextScopedHistoryInputBox } from 'vs/plAtform/browser/contextScopedHistoryWidget';
import { MArker } from 'vs/workbench/contrib/mArkers/browser/mArkersModel';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { Event, Emitter } from 'vs/bAse/common/event';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { IViewsService } from 'vs/workbench/common/views';
import { Codicon } from 'vs/bAse/common/codicons';
import { BAseActionViewItem, ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { DropdownMenuActionViewItem } from 'vs/bAse/browser/ui/dropdown/dropdownActionViewItem';

export clAss ShowProblemsPAnelAction extends Action {

	public stAtic reAdonly ID = 'workbench.Action.problems.focus';
	public stAtic reAdonly LABEL = MessAges.MARKERS_PANEL_SHOW_LABEL;

	constructor(id: string, lAbel: string,
		@IViewsService privAte reAdonly viewsService: IViewsService
	) {
		super(id, lAbel);
	}

	public run(): Promise<Any> {
		return this.viewsService.openView(ConstAnts.MARKERS_VIEW_ID, true);
	}
}

export interfAce IMArkersFiltersChAngeEvent {
	filterText?: booleAn;
	excludedFiles?: booleAn;
	showWArnings?: booleAn;
	showErrors?: booleAn;
	showInfos?: booleAn;
	ActiveFile?: booleAn;
	lAyout?: booleAn;
}

export interfAce IMArkersFiltersOptions {
	filterText: string;
	filterHistory: string[];
	showErrors: booleAn;
	showWArnings: booleAn;
	showInfos: booleAn;
	excludedFiles: booleAn;
	ActiveFile: booleAn;
	lAyout: DOM.Dimension;
}

export clAss MArkersFilters extends DisposAble {

	privAte reAdonly _onDidChAnge: Emitter<IMArkersFiltersChAngeEvent> = this._register(new Emitter<IMArkersFiltersChAngeEvent>());
	reAdonly onDidChAnge: Event<IMArkersFiltersChAngeEvent> = this._onDidChAnge.event;

	constructor(options: IMArkersFiltersOptions) {
		super();
		this._filterText = options.filterText;
		this._showErrors = options.showErrors;
		this._showWArnings = options.showWArnings;
		this._showInfos = options.showInfos;
		this._excludedFiles = options.excludedFiles;
		this._ActiveFile = options.ActiveFile;
		this.filterHistory = options.filterHistory;
		this._lAyout = options.lAyout;
	}

	privAte _filterText: string;
	get filterText(): string {
		return this._filterText;
	}
	set filterText(filterText: string) {
		if (this._filterText !== filterText) {
			this._filterText = filterText;
			this._onDidChAnge.fire({ filterText: true });
		}
	}

	filterHistory: string[];

	privAte _excludedFiles: booleAn;
	get excludedFiles(): booleAn {
		return this._excludedFiles;
	}
	set excludedFiles(filesExclude: booleAn) {
		if (this._excludedFiles !== filesExclude) {
			this._excludedFiles = filesExclude;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ excludedFiles: true });
		}
	}

	privAte _ActiveFile: booleAn;
	get ActiveFile(): booleAn {
		return this._ActiveFile;
	}
	set ActiveFile(ActiveFile: booleAn) {
		if (this._ActiveFile !== ActiveFile) {
			this._ActiveFile = ActiveFile;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ ActiveFile: true });
		}
	}

	privAte _showWArnings: booleAn = true;
	get showWArnings(): booleAn {
		return this._showWArnings;
	}
	set showWArnings(showWArnings: booleAn) {
		if (this._showWArnings !== showWArnings) {
			this._showWArnings = showWArnings;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ showWArnings: true });
		}
	}

	privAte _showErrors: booleAn = true;
	get showErrors(): booleAn {
		return this._showErrors;
	}
	set showErrors(showErrors: booleAn) {
		if (this._showErrors !== showErrors) {
			this._showErrors = showErrors;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ showErrors: true });
		}
	}

	privAte _showInfos: booleAn = true;
	get showInfos(): booleAn {
		return this._showInfos;
	}
	set showInfos(showInfos: booleAn) {
		if (this._showInfos !== showInfos) {
			this._showInfos = showInfos;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ showInfos: true });
		}
	}

	privAte _lAyout: DOM.Dimension = new DOM.Dimension(0, 0);
	get lAyout(): DOM.Dimension {
		return this._lAyout;
	}
	set lAyout(lAyout: DOM.Dimension) {
		if (this._lAyout.width !== lAyout.width || this._lAyout.height !== lAyout.height) {
			this._lAyout = lAyout;
			this._onDidChAnge.fire(<IMArkersFiltersChAngeEvent>{ lAyout: true });
		}
	}
}

export interfAce IMArkerFilterController {
	reAdonly onDidFocusFilter: Event<void>;
	reAdonly onDidCleArFilterText: Event<void>;
	reAdonly filters: MArkersFilters;
	reAdonly onDidChAngeFilterStAts: Event<{ totAl: number, filtered: number }>;
	getFilterStAts(): { totAl: number, filtered: number };
}

clAss FiltersDropdownMenuActionViewItem extends DropdownMenuActionViewItem {

	constructor(
		Action: IAction, privAte filters: MArkersFilters, ActionRunner: IActionRunner,
		@IContextMenuService contextMenuService: IContextMenuService
	) {
		super(Action,
			{ getActions: () => this.getActions() },
			contextMenuService,
			{
				ActionRunner,
				clAssNAmes: Action.clAss,
				AnchorAlignmentProvider: () => AnchorAlignment.RIGHT
			}
		);
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);
		this.updAteChecked();
	}

	privAte getActions(): IAction[] {
		return [
			{
				checked: this.filters.showErrors,
				clAss: undefined,
				enAbled: true,
				id: 'showErrors',
				lAbel: MessAges.MARKERS_PANEL_FILTER_LABEL_SHOW_ERRORS,
				run: Async () => this.filters.showErrors = !this.filters.showErrors,
				tooltip: '',
				dispose: () => null
			},
			{
				checked: this.filters.showWArnings,
				clAss: undefined,
				enAbled: true,
				id: 'showWArnings',
				lAbel: MessAges.MARKERS_PANEL_FILTER_LABEL_SHOW_WARNINGS,
				run: Async () => this.filters.showWArnings = !this.filters.showWArnings,
				tooltip: '',
				dispose: () => null
			},
			{
				checked: this.filters.showInfos,
				clAss: undefined,
				enAbled: true,
				id: 'showInfos',
				lAbel: MessAges.MARKERS_PANEL_FILTER_LABEL_SHOW_INFOS,
				run: Async () => this.filters.showInfos = !this.filters.showInfos,
				tooltip: '',
				dispose: () => null
			},
			new SepArAtor(),
			{
				checked: this.filters.ActiveFile,
				clAss: undefined,
				enAbled: true,
				id: 'ActiveFile',
				lAbel: MessAges.MARKERS_PANEL_FILTER_LABEL_ACTIVE_FILE,
				run: Async () => this.filters.ActiveFile = !this.filters.ActiveFile,
				tooltip: '',
				dispose: () => null
			},
			{
				checked: this.filters.excludedFiles,
				clAss: undefined,
				enAbled: true,
				id: 'useFilesExclude',
				lAbel: MessAges.MARKERS_PANEL_FILTER_LABEL_EXCLUDED_FILES,
				run: Async () => this.filters.excludedFiles = !this.filters.excludedFiles,
				tooltip: '',
				dispose: () => null
			},
		];
	}

	updAteChecked(): void {
		this.element!.clAssList.toggle('checked', this._Action.checked);
	}

}

export clAss MArkersFilterActionViewItem extends BAseActionViewItem {

	privAte delAyedFilterUpdAte: DelAyer<void>;
	privAte contAiner: HTMLElement | null = null;
	privAte filterInputBox: HistoryInputBox | null = null;
	privAte filterBAdge: HTMLElement | null = null;
	privAte focusContextKey: IContextKey<booleAn>;
	privAte reAdonly filtersAction: IAction;

	constructor(
		Action: IAction,
		privAte filterController: IMArkerFilterController,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(null, Action);
		this.focusContextKey = ConstAnts.MArkerViewFilterFocusContextKey.bindTo(contextKeyService);
		this.delAyedFilterUpdAte = new DelAyer<void>(400);
		this._register(toDisposAble(() => this.delAyedFilterUpdAte.cAncel()));
		this._register(filterController.onDidFocusFilter(() => this.focus()));
		this._register(filterController.onDidCleArFilterText(() => this.cleArFilterText()));
		this.filtersAction = new Action('mArkersFiltersAction', MessAges.MARKERS_PANEL_ACTION_TOOLTIP_MORE_FILTERS, 'mArkers-filters codicon-filter');
		this.filtersAction.checked = this.hAsFiltersChAnged();
		this._register(filterController.filters.onDidChAnge(e => this.onDidFiltersChAnge(e)));
	}

	render(contAiner: HTMLElement): void {
		this.contAiner = contAiner;
		this.contAiner.clAssList.Add('mArkers-pAnel-Action-filter-contAiner');

		this.element = DOM.Append(this.contAiner, DOM.$(''));
		this.element.clAssNAme = this.clAss;
		this.creAteInput(this.element);
		this.creAteControls(this.element);
		this.updAteClAss();

		this.AdjustInputBox();
	}

	focus(): void {
		if (this.filterInputBox) {
			this.filterInputBox.focus();
		}
	}

	privAte cleArFilterText(): void {
		if (this.filterInputBox) {
			this.filterInputBox.vAlue = '';
		}
	}

	privAte onDidFiltersChAnge(e: IMArkersFiltersChAngeEvent): void {
		this.filtersAction.checked = this.hAsFiltersChAnged();
		if (e.lAyout) {
			this.updAteClAss();
		}
	}

	privAte hAsFiltersChAnged(): booleAn {
		return !this.filterController.filters.showErrors || !this.filterController.filters.showWArnings || !this.filterController.filters.showInfos || this.filterController.filters.excludedFiles || this.filterController.filters.ActiveFile;
	}

	privAte creAteInput(contAiner: HTMLElement): void {
		this.filterInputBox = this._register(this.instAntiAtionService.creAteInstAnce(ContextScopedHistoryInputBox, contAiner, this.contextViewService, {
			plAceholder: MessAges.MARKERS_PANEL_FILTER_PLACEHOLDER,
			AriALAbel: MessAges.MARKERS_PANEL_FILTER_ARIA_LABEL,
			history: this.filterController.filters.filterHistory
		}));
		this._register(AttAchInputBoxStyler(this.filterInputBox, this.themeService));
		this.filterInputBox.vAlue = this.filterController.filters.filterText;
		this._register(this.filterInputBox.onDidChAnge(filter => this.delAyedFilterUpdAte.trigger(() => this.onDidInputChAnge(this.filterInputBox!))));
		this._register(this.filterController.filters.onDidChAnge((event: IMArkersFiltersChAngeEvent) => {
			if (event.filterText) {
				this.filterInputBox!.vAlue = this.filterController.filters.filterText;
			}
		}));
		this._register(DOM.AddStAndArdDisposAbleListener(this.filterInputBox.inputElement, DOM.EventType.KEY_DOWN, (e: Any) => this.onInputKeyDown(e, this.filterInputBox!)));
		this._register(DOM.AddStAndArdDisposAbleListener(contAiner, DOM.EventType.KEY_DOWN, this.hAndleKeyboArdEvent));
		this._register(DOM.AddStAndArdDisposAbleListener(contAiner, DOM.EventType.KEY_UP, this.hAndleKeyboArdEvent));
		this._register(DOM.AddStAndArdDisposAbleListener(this.filterInputBox.inputElement, DOM.EventType.CLICK, (e) => {
			e.stopPropAgAtion();
			e.preventDefAult();
		}));

		const focusTrAcker = this._register(DOM.trAckFocus(this.filterInputBox.inputElement));
		this._register(focusTrAcker.onDidFocus(() => this.focusContextKey.set(true)));
		this._register(focusTrAcker.onDidBlur(() => this.focusContextKey.set(fAlse)));
		this._register(toDisposAble(() => this.focusContextKey.reset()));
	}

	privAte creAteControls(contAiner: HTMLElement): void {
		const controlsContAiner = DOM.Append(contAiner, DOM.$('.mArkers-pAnel-filter-controls'));
		this.creAteBAdge(controlsContAiner);
		this.creAteFilters(controlsContAiner);
	}

	privAte creAteBAdge(contAiner: HTMLElement): void {
		const filterBAdge = this.filterBAdge = DOM.Append(contAiner, DOM.$('.mArkers-pAnel-filter-bAdge'));
		this._register(AttAchStylerCAllbAck(this.themeService, { bAdgeBAckground, bAdgeForeground, contrAstBorder }, colors => {
			const bAckground = colors.bAdgeBAckground ? colors.bAdgeBAckground.toString() : '';
			const foreground = colors.bAdgeForeground ? colors.bAdgeForeground.toString() : '';
			const border = colors.contrAstBorder ? colors.contrAstBorder.toString() : '';

			filterBAdge.style.bAckgroundColor = bAckground;

			filterBAdge.style.borderWidth = border ? '1px' : '';
			filterBAdge.style.borderStyle = border ? 'solid' : '';
			filterBAdge.style.borderColor = border;
			filterBAdge.style.color = foreground;
		}));
		this.updAteBAdge();
		this._register(this.filterController.onDidChAngeFilterStAts(() => this.updAteBAdge()));
	}

	privAte creAteFilters(contAiner: HTMLElement): void {
		const ActionbAr = this._register(new ActionBAr(contAiner, {
			ActionViewItemProvider: Action => {
				if (Action.id === this.filtersAction.id) {
					return this.instAntiAtionService.creAteInstAnce(FiltersDropdownMenuActionViewItem, Action, this.filterController.filters, this.ActionRunner);
				}
				return undefined;
			}
		}));
		ActionbAr.push(this.filtersAction, { icon: true, lAbel: fAlse });
	}

	privAte onDidInputChAnge(inputbox: HistoryInputBox) {
		inputbox.AddToHistory();
		this.filterController.filters.filterText = inputbox.vAlue;
		this.filterController.filters.filterHistory = inputbox.getHistory();
	}

	privAte updAteBAdge(): void {
		if (this.filterBAdge) {
			const { totAl, filtered } = this.filterController.getFilterStAts();
			this.filterBAdge.clAssList.toggle('hidden', totAl === filtered || totAl === 0);
			this.filterBAdge.textContent = locAlize('showing filtered problems', "Showing {0} of {1}", filtered, totAl);
			this.AdjustInputBox();
		}
	}

	privAte AdjustInputBox(): void {
		if (this.element && this.filterInputBox && this.filterBAdge) {
			this.filterInputBox.inputElement.style.pAddingRight = this.element.clAssList.contAins('smAll') || this.filterBAdge.clAssList.contAins('hidden') ? '25px' : '150px';
		}
	}

	// Action toolbAr is swAllowing some keys for Action items which should not be for An input box
	privAte hAndleKeyboArdEvent(event: StAndArdKeyboArdEvent) {
		if (event.equAls(KeyCode.SpAce)
			|| event.equAls(KeyCode.LeftArrow)
			|| event.equAls(KeyCode.RightArrow)
			|| event.equAls(KeyCode.EscApe)
		) {
			event.stopPropAgAtion();
		}
	}

	privAte onInputKeyDown(event: StAndArdKeyboArdEvent, filterInputBox: HistoryInputBox) {
		let hAndled = fAlse;
		if (event.equAls(KeyCode.EscApe)) {
			this.cleArFilterText();
			hAndled = true;
		}
		if (hAndled) {
			event.stopPropAgAtion();
			event.preventDefAult();
		}
	}

	protected updAteClAss(): void {
		if (this.element && this.contAiner) {
			this.element.clAssNAme = this.clAss;
			this.contAiner.clAssList.toggle('grow', this.element.clAssList.contAins('grow'));
			this.AdjustInputBox();
		}
	}

	protected get clAss(): string {
		if (this.filterController.filters.lAyout.width > 600) {
			return 'mArkers-pAnel-Action-filter grow';
		} else if (this.filterController.filters.lAyout.width < 400) {
			return 'mArkers-pAnel-Action-filter smAll';
		} else {
			return 'mArkers-pAnel-Action-filter';
		}
	}
}

export clAss QuickFixAction extends Action {

	public stAtic reAdonly ID: string = 'workbench.Actions.problems.quickfix';
	privAte stAtic reAdonly CLASS: string = 'mArkers-pAnel-Action-quickfix ' + Codicon.lightBulb.clAssNAmes;
	privAte stAtic reAdonly AUTO_FIX_CLASS: string = QuickFixAction.CLASS + ' AutofixAble';

	privAte reAdonly _onShowQuickFixes = this._register(new Emitter<void>());
	reAdonly onShowQuickFixes: Event<void> = this._onShowQuickFixes.event;

	privAte _quickFixes: IAction[] = [];
	get quickFixes(): IAction[] {
		return this._quickFixes;
	}
	set quickFixes(quickFixes: IAction[]) {
		this._quickFixes = quickFixes;
		this.enAbled = this._quickFixes.length > 0;
	}

	AutoFixAble(AutofixAble: booleAn) {
		this.clAss = AutofixAble ? QuickFixAction.AUTO_FIX_CLASS : QuickFixAction.CLASS;
	}

	constructor(
		reAdonly mArker: MArker,
	) {
		super(QuickFixAction.ID, MessAges.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX, QuickFixAction.CLASS, fAlse);
	}

	run(): Promise<void> {
		this._onShowQuickFixes.fire();
		return Promise.resolve();
	}
}

export clAss QuickFixActionViewItem extends ActionViewItem {

	constructor(Action: QuickFixAction,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
	) {
		super(null, Action, { icon: true, lAbel: fAlse });
	}

	public onClick(event: DOM.EventLike): void {
		DOM.EventHelper.stop(event, true);
		this.showQuickFixes();
	}

	public showQuickFixes(): void {
		if (!this.element) {
			return;
		}
		if (!this.isEnAbled()) {
			return;
		}
		const elementPosition = DOM.getDomNodePAgePosition(this.element);
		const quickFixes = (<QuickFixAction>this.getAction()).quickFixes;
		if (quickFixes.length) {
			this.contextMenuService.showContextMenu({
				getAnchor: () => ({ x: elementPosition.left + 10, y: elementPosition.top + elementPosition.height + 4 }),
				getActions: () => quickFixes
			});
		}
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const inputActiveOptionBorderColor = theme.getColor(inputActiveOptionBorder);
	if (inputActiveOptionBorderColor) {
		collector.AddRule(`.mArkers-pAnel-Action-filter > .mArkers-pAnel-filter-controls > .monAco-Action-bAr .Action-lAbel.mArkers-filters.checked { border-color: ${inputActiveOptionBorderColor}; }`);
	}
	const inputActiveOptionForegroundColor = theme.getColor(inputActiveOptionForeground);
	if (inputActiveOptionForegroundColor) {
		collector.AddRule(`.mArkers-pAnel-Action-filter > .mArkers-pAnel-filter-controls > .monAco-Action-bAr .Action-lAbel.mArkers-filters.checked { color: ${inputActiveOptionForegroundColor}; }`);
	}
	const inputActiveOptionBAckgroundColor = theme.getColor(inputActiveOptionBAckground);
	if (inputActiveOptionBAckgroundColor) {
		collector.AddRule(`.mArkers-pAnel-Action-filter > .mArkers-pAnel-filter-controls > .monAco-Action-bAr .Action-lAbel.mArkers-filters.checked { bAckground-color: ${inputActiveOptionBAckgroundColor}; }`);
	}
});
