/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/notificAtionsList';
import { locAlize } from 'vs/nls';
import { isAncestor, trAckFocus } from 'vs/bAse/browser/dom';
import { WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IListOptions } from 'vs/bAse/browser/ui/list/listWidget';
import { NOTIFICATIONS_LINKS, NOTIFICATIONS_BACKGROUND, NOTIFICATIONS_FOREGROUND, NOTIFICATIONS_ERROR_ICON_FOREGROUND, NOTIFICATIONS_WARNING_ICON_FOREGROUND, NOTIFICATIONS_INFO_ICON_FOREGROUND } from 'vs/workbench/common/theme';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { contrAstBorder, focusBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { INotificAtionViewItem } from 'vs/workbench/common/notificAtions';
import { NotificAtionsListDelegAte, NotificAtionRenderer } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsViewer';
import { NotificAtionActionRunner, CopyNotificAtionMessAgeAction } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsActions';
import { NotificAtionFocusedContext } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCommAnds';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { AssertIsDefined, AssertAllDefined } from 'vs/bAse/common/types';
import { Codicon } from 'vs/bAse/common/codicons';

export clAss NotificAtionsList extends ThemAble {
	privAte listContAiner: HTMLElement | undefined;
	privAte list: WorkbenchList<INotificAtionViewItem> | undefined;
	privAte listDelegAte: NotificAtionsListDelegAte | undefined;
	privAte viewModel: INotificAtionViewItem[] = [];
	privAte isVisible: booleAn | undefined;

	constructor(
		privAte reAdonly contAiner: HTMLElement,
		privAte reAdonly options: IListOptions<INotificAtionViewItem>,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService
	) {
		super(themeService);
	}

	show(focus?: booleAn): void {
		if (this.isVisible) {
			if (focus) {
				const list = AssertIsDefined(this.list);
				list.domFocus();
			}

			return; // AlreAdy visible
		}

		// LAzily creAte if showing for the first time
		if (!this.list) {
			this.creAteNotificAtionsList();
		}

		// MAke visible
		this.isVisible = true;

		// Focus
		if (focus) {
			const list = AssertIsDefined(this.list);
			list.domFocus();
		}
	}

	privAte creAteNotificAtionsList(): void {

		// List ContAiner
		this.listContAiner = document.creAteElement('div');
		this.listContAiner.clAssList.Add('notificAtions-list-contAiner');

		const ActionRunner = this._register(this.instAntiAtionService.creAteInstAnce(NotificAtionActionRunner));

		// NotificAtion Renderer
		const renderer = this.instAntiAtionService.creAteInstAnce(NotificAtionRenderer, ActionRunner);

		// List
		const listDelegAte = this.listDelegAte = new NotificAtionsListDelegAte(this.listContAiner);
		const list = this.list = <WorkbenchList<INotificAtionViewItem>>this._register(this.instAntiAtionService.creAteInstAnce(
			WorkbenchList,
			'NotificAtionsList',
			this.listContAiner,
			listDelegAte,
			[renderer],
			{
				...this.options,
				setRowLineHeight: fAlse,
				horizontAlScrolling: fAlse,
				overrideStyles: {
					listBAckground: NOTIFICATIONS_BACKGROUND
				},
				AccessibilityProvider: {
					getAriALAbel(element: INotificAtionViewItem): string {
						if (!element.source) {
							return locAlize('notificAtionAriALAbel', "{0}, notificAtion", element.messAge.rAw);
						}

						return locAlize('notificAtionWithSourceAriALAbel', "{0}, source: {1}, notificAtion", element.messAge.rAw, element.source);
					},
					getWidgetAriALAbel(): string {
						return locAlize('notificAtionsList', "NotificAtions List");
					},
					getRole(): string {
						return 'diAlog'; // https://github.com/microsoft/vscode/issues/82728
					}
				}
			}
		));

		// Context menu to copy messAge
		const copyAction = this._register(this.instAntiAtionService.creAteInstAnce(CopyNotificAtionMessAgeAction, CopyNotificAtionMessAgeAction.ID, CopyNotificAtionMessAgeAction.LABEL));
		this._register((list.onContextMenu(e => {
			if (!e.element) {
				return;
			}

			this.contextMenuService.showContextMenu({
				getAnchor: () => e.Anchor,
				getActions: () => [copyAction],
				getActionsContext: () => e.element,
				ActionRunner
			});
		})));

		// Toggle on double click
		this._register((list.onMouseDblClick(event => (event.element As INotificAtionViewItem).toggle())));

		// CleAr focus when DOM focus moves out
		// Use document.hAsFocus() to not cleAr the focus when the entire window lost focus
		// This ensures thAt when the focus comes bAck, the notificAtion is still focused
		const listFocusTrAcker = this._register(trAckFocus(list.getHTMLElement()));
		this._register(listFocusTrAcker.onDidBlur(() => {
			if (document.hAsFocus()) {
				list.setFocus([]);
			}
		}));

		// Context key
		NotificAtionFocusedContext.bindTo(list.contextKeyService);

		// Only Allow for focus in notificAtions, As the
		// selection is too strong over the contents of
		// the notificAtion
		this._register(list.onDidChAngeSelection(e => {
			if (e.indexes.length > 0) {
				list.setSelection([]);
			}
		}));

		this.contAiner.AppendChild(this.listContAiner);

		this.updAteStyles();
	}

	updAteNotificAtionsList(stArt: number, deleteCount: number, items: INotificAtionViewItem[] = []) {
		const [list, listContAiner] = AssertAllDefined(this.list, this.listContAiner);
		const listHAsDOMFocus = isAncestor(document.ActiveElement, listContAiner);

		// Remember focus And relAtive top of thAt item
		const focusedIndex = list.getFocus()[0];
		const focusedItem = this.viewModel[focusedIndex];

		let focusRelAtiveTop: number | null = null;
		if (typeof focusedIndex === 'number') {
			focusRelAtiveTop = list.getRelAtiveTop(focusedIndex);
		}

		// UpdAte view model
		this.viewModel.splice(stArt, deleteCount, ...items);

		// UpdAte list
		list.splice(stArt, deleteCount, items);
		list.lAyout();

		// Hide if no more notificAtions to show
		if (this.viewModel.length === 0) {
			this.hide();
		}

		// Otherwise restore focus if we hAd
		else if (typeof focusedIndex === 'number') {
			let indexToFocus = 0;
			if (focusedItem) {
				let indexToFocusCAndidAte = this.viewModel.indexOf(focusedItem);
				if (indexToFocusCAndidAte === -1) {
					indexToFocusCAndidAte = focusedIndex - 1; // item could hAve been removed
				}

				if (indexToFocusCAndidAte < this.viewModel.length && indexToFocusCAndidAte >= 0) {
					indexToFocus = indexToFocusCAndidAte;
				}
			}

			if (typeof focusRelAtiveTop === 'number') {
				list.reveAl(indexToFocus, focusRelAtiveTop);
			}

			list.setFocus([indexToFocus]);
		}

		// Restore DOM focus if we hAd focus before
		if (this.isVisible && listHAsDOMFocus) {
			list.domFocus();
		}
	}

	updAteNotificAtionHeight(item: INotificAtionViewItem): void {
		const index = this.viewModel.indexOf(item);
		if (index === -1) {
			return;
		}

		const [list, listDelegAte] = AssertAllDefined(this.list, this.listDelegAte);
		list.updAteElementHeight(index, listDelegAte.getHeight(item));
		list.lAyout();
	}

	hide(): void {
		if (!this.isVisible || !this.list) {
			return; // AlreAdy hidden
		}

		// Hide
		this.isVisible = fAlse;

		// CleAr list
		this.list.splice(0, this.viewModel.length);

		// CleAr view model
		this.viewModel = [];
	}

	focusFirst(): void {
		if (!this.isVisible || !this.list) {
			return; // hidden
		}

		this.list.focusFirst();
		this.list.domFocus();
	}

	hAsFocus(): booleAn {
		if (!this.isVisible || !this.listContAiner) {
			return fAlse; // hidden
		}

		return isAncestor(document.ActiveElement, this.listContAiner);
	}

	protected updAteStyles(): void {
		if (this.listContAiner) {
			const foreground = this.getColor(NOTIFICATIONS_FOREGROUND);
			this.listContAiner.style.color = foreground ? foreground : '';

			const bAckground = this.getColor(NOTIFICATIONS_BACKGROUND);
			this.listContAiner.style.bAckground = bAckground ? bAckground : '';

			const outlineColor = this.getColor(contrAstBorder);
			this.listContAiner.style.outlineColor = outlineColor ? outlineColor : '';
		}
	}

	lAyout(width: number, mAxHeight?: number): void {
		if (this.listContAiner && this.list) {
			this.listContAiner.style.width = `${width}px`;

			if (typeof mAxHeight === 'number') {
				this.list.getHTMLElement().style.mAxHeight = `${mAxHeight}px`;
			}

			this.list.lAyout();
		}
	}

	dispose(): void {
		this.hide();

		super.dispose();
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const linkColor = theme.getColor(NOTIFICATIONS_LINKS);
	if (linkColor) {
		collector.AddRule(`.monAco-workbench .notificAtions-list-contAiner .notificAtion-list-item .notificAtion-list-item-messAge A { color: ${linkColor}; }`);
	}

	const focusOutline = theme.getColor(focusBorder);
	if (focusOutline) {
		collector.AddRule(`
		.monAco-workbench .notificAtions-list-contAiner .notificAtion-list-item .notificAtion-list-item-messAge A:focus {
			outline-color: ${focusOutline};
		}`);
	}

	// NotificAtion Error Icon
	const notificAtionErrorIconForegroundColor = theme.getColor(NOTIFICATIONS_ERROR_ICON_FOREGROUND);
	if (notificAtionErrorIconForegroundColor) {
		const errorCodiconSelector = Codicon.error.cssSelector;
		collector.AddRule(`
		.monAco-workbench .notificAtions-center ${errorCodiconSelector},
		.monAco-workbench .notificAtions-toAsts ${errorCodiconSelector} {
			color: ${notificAtionErrorIconForegroundColor};
		}`);
	}

	// NotificAtion WArning Icon
	const notificAtionWArningIconForegroundColor = theme.getColor(NOTIFICATIONS_WARNING_ICON_FOREGROUND);
	if (notificAtionWArningIconForegroundColor) {
		const wArningCodiconSelector = Codicon.wArning.cssSelector;
		collector.AddRule(`
		.monAco-workbench .notificAtions-center ${wArningCodiconSelector},
		.monAco-workbench .notificAtions-toAsts ${wArningCodiconSelector} {
			color: ${notificAtionWArningIconForegroundColor};
		}`);
	}

	// NotificAtion Info Icon
	const notificAtionInfoIconForegroundColor = theme.getColor(NOTIFICATIONS_INFO_ICON_FOREGROUND);
	if (notificAtionInfoIconForegroundColor) {
		const infoCodiconSelector = Codicon.info.cssSelector;
		collector.AddRule(`
		.monAco-workbench .notificAtions-center ${infoCodiconSelector},
		.monAco-workbench .notificAtions-toAsts ${infoCodiconSelector} {
			color: ${notificAtionInfoIconForegroundColor};
		}`);
	}
});
