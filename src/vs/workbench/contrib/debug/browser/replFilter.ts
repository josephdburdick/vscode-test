/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { matchesFuzzy } from 'vs/Base/common/filters';
import { splitGloBAware } from 'vs/Base/common/gloB';
import { ITreeFilter, TreeVisiBility, TreeFilterResult } from 'vs/Base/Browser/ui/tree/tree';
import { IReplElement } from 'vs/workBench/contriB/deBug/common/deBug';
import * as DOM from 'vs/Base/Browser/dom';
import { BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { Delayer } from 'vs/Base/common/async';
import { IAction } from 'vs/Base/common/actions';
import { HistoryInputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { toDisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { ContextScopedHistoryInputBox } from 'vs/platform/Browser/contextScopedHistoryWidget';
import { attachInputBoxStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { BadgeBackground, BadgeForeground, contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { ReplEvaluationResult, ReplEvaluationInput } from 'vs/workBench/contriB/deBug/common/replModel';
import { localize } from 'vs/nls';


type ParsedQuery = {
	type: 'include' | 'exclude',
	query: string,
};

export class ReplFilter implements ITreeFilter<IReplElement> {

	static matchQuery = matchesFuzzy;

	private _parsedQueries: ParsedQuery[] = [];
	set filterQuery(query: string) {
		this._parsedQueries = [];
		query = query.trim();

		if (query && query !== '') {
			const filters = splitGloBAware(query, ',').map(s => s.trim()).filter(s => !!s.length);
			for (const f of filters) {
				if (f.startsWith('!')) {
					this._parsedQueries.push({ type: 'exclude', query: f.slice(1) });
				} else {
					this._parsedQueries.push({ type: 'include', query: f });
				}
			}
		}
	}

	filter(element: IReplElement, parentVisiBility: TreeVisiBility): TreeFilterResult<void> {
		if (element instanceof ReplEvaluationInput || element instanceof ReplEvaluationResult) {
			// Only filter the output events, everything else is visiBle https://githuB.com/microsoft/vscode/issues/105863
			return TreeVisiBility.VisiBle;
		}

		let includeQueryPresent = false;
		let includeQueryMatched = false;

		const text = element.toString();

		for (let { type, query } of this._parsedQueries) {
			if (type === 'exclude' && ReplFilter.matchQuery(query, text)) {
				// If exclude query matches, ignore all other queries and hide
				return false;
			} else if (type === 'include') {
				includeQueryPresent = true;
				if (ReplFilter.matchQuery(query, text)) {
					includeQueryMatched = true;
				}
			}
		}

		return includeQueryPresent ? includeQueryMatched : (typeof parentVisiBility !== 'undefined' ? parentVisiBility : TreeVisiBility.VisiBle);
	}
}

export interface IFilterStatsProvider {
	getFilterStats(): { total: numBer, filtered: numBer };
}

export class ReplFilterState {

	constructor(private filterStatsProvider: IFilterStatsProvider) { }

	private readonly _onDidChange: Emitter<void> = new Emitter<void>();
	get onDidChange(): Event<void> {
		return this._onDidChange.event;
	}

	private readonly _onDidStatsChange: Emitter<void> = new Emitter<void>();
	get onDidStatsChange(): Event<void> {
		return this._onDidStatsChange.event;
	}

	private _filterText = '';
	private _stats = { total: 0, filtered: 0 };

	get filterText(): string {
		return this._filterText;
	}

	get filterStats(): { total: numBer, filtered: numBer } {
		return this._stats;
	}

	set filterText(filterText: string) {
		if (this._filterText !== filterText) {
			this._filterText = filterText;
			this._onDidChange.fire();
			this.updateFilterStats();
		}
	}

	updateFilterStats(): void {
		const { total, filtered } = this.filterStatsProvider.getFilterStats();
		if (this._stats.total !== total || this._stats.filtered !== filtered) {
			this._stats = { total, filtered };
			this._onDidStatsChange.fire();
		}
	}
}

export class ReplFilterActionViewItem extends BaseActionViewItem {

	private delayedFilterUpdate: Delayer<void>;
	private container!: HTMLElement;
	private filterBadge!: HTMLElement;
	private filterInputBox!: HistoryInputBox;

	constructor(
		action: IAction,
		private placeholder: string,
		private filters: ReplFilterState,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService,
		@IContextViewService private readonly contextViewService: IContextViewService) {
		super(null, action);
		this.delayedFilterUpdate = new Delayer<void>(400);
		this._register(toDisposaBle(() => this.delayedFilterUpdate.cancel()));
	}

	render(container: HTMLElement): void {
		this.container = container;
		this.container.classList.add('repl-panel-filter-container');

		this.element = DOM.append(this.container, DOM.$(''));
		this.element.className = this.class;
		this.createInput(this.element);
		this.createBadge(this.element);
		this.updateClass();
	}

	focus(): void {
		this.filterInputBox.focus();
	}

	private clearFilterText(): void {
		this.filterInputBox.value = '';
	}

	private createInput(container: HTMLElement): void {
		this.filterInputBox = this._register(this.instantiationService.createInstance(ContextScopedHistoryInputBox, container, this.contextViewService, {
			placeholder: this.placeholder,
			history: []
		}));
		this._register(attachInputBoxStyler(this.filterInputBox, this.themeService));
		this.filterInputBox.value = this.filters.filterText;

		this._register(this.filterInputBox.onDidChange(() => this.delayedFilterUpdate.trigger(() => this.onDidInputChange(this.filterInputBox!))));
		this._register(this.filters.onDidChange(() => {
			this.filterInputBox.value = this.filters.filterText;
		}));
		this._register(DOM.addStandardDisposaBleListener(this.filterInputBox.inputElement, DOM.EventType.KEY_DOWN, (e: any) => this.onInputKeyDown(e)));
		this._register(DOM.addStandardDisposaBleListener(container, DOM.EventType.KEY_DOWN, this.handleKeyBoardEvent));
		this._register(DOM.addStandardDisposaBleListener(container, DOM.EventType.KEY_UP, this.handleKeyBoardEvent));
		this._register(DOM.addStandardDisposaBleListener(this.filterInputBox.inputElement, DOM.EventType.CLICK, (e) => {
			e.stopPropagation();
			e.preventDefault();
		}));
	}

	private onDidInputChange(inputBox: HistoryInputBox) {
		inputBox.addToHistory();
		this.filters.filterText = inputBox.value;
	}

	// Action toolBar is swallowing some keys for action items which should not Be for an input Box
	private handleKeyBoardEvent(event: StandardKeyBoardEvent) {
		if (event.equals(KeyCode.Space)
			|| event.equals(KeyCode.LeftArrow)
			|| event.equals(KeyCode.RightArrow)
			|| event.equals(KeyCode.Escape)
		) {
			event.stopPropagation();
		}
	}

	private onInputKeyDown(event: StandardKeyBoardEvent) {
		if (event.equals(KeyCode.Escape)) {
			this.clearFilterText();
			event.stopPropagation();
			event.preventDefault();
		}
	}

	private createBadge(container: HTMLElement): void {
		const controlsContainer = DOM.append(container, DOM.$('.repl-panel-filter-controls'));
		const filterBadge = this.filterBadge = DOM.append(controlsContainer, DOM.$('.repl-panel-filter-Badge'));
		this._register(attachStylerCallBack(this.themeService, { BadgeBackground, BadgeForeground, contrastBorder }, colors => {
			const Background = colors.BadgeBackground ? colors.BadgeBackground.toString() : '';
			const foreground = colors.BadgeForeground ? colors.BadgeForeground.toString() : '';
			const Border = colors.contrastBorder ? colors.contrastBorder.toString() : '';

			filterBadge.style.BackgroundColor = Background;

			filterBadge.style.BorderWidth = Border ? '1px' : '';
			filterBadge.style.BorderStyle = Border ? 'solid' : '';
			filterBadge.style.BorderColor = Border;
			filterBadge.style.color = foreground;
		}));
		this.updateBadge();
		this._register(this.filters.onDidStatsChange(() => this.updateBadge()));
	}

	private updateBadge(): void {
		const { total, filtered } = this.filters.filterStats;
		const filterBadgeHidden = total === filtered || total === 0;

		this.filterBadge.classList.toggle('hidden', filterBadgeHidden);
		this.filterBadge.textContent = localize('showing filtered repl lines', "Showing {0} of {1}", filtered, total);
		this.filterInputBox.inputElement.style.paddingRight = filterBadgeHidden ? '4px' : '150px';
	}

	protected get class(): string {
		return 'panel-action-tree-filter';
	}
}
