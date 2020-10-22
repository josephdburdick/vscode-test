/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/notificationsList';
import { localize } from 'vs/nls';
import { isAncestor, trackFocus } from 'vs/Base/Browser/dom';
import { WorkBenchList } from 'vs/platform/list/Browser/listService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IListOptions } from 'vs/Base/Browser/ui/list/listWidget';
import { NOTIFICATIONS_LINKS, NOTIFICATIONS_BACKGROUND, NOTIFICATIONS_FOREGROUND, NOTIFICATIONS_ERROR_ICON_FOREGROUND, NOTIFICATIONS_WARNING_ICON_FOREGROUND, NOTIFICATIONS_INFO_ICON_FOREGROUND } from 'vs/workBench/common/theme';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector, ThemaBle } from 'vs/platform/theme/common/themeService';
import { contrastBorder, focusBorder } from 'vs/platform/theme/common/colorRegistry';
import { INotificationViewItem } from 'vs/workBench/common/notifications';
import { NotificationsListDelegate, NotificationRenderer } from 'vs/workBench/Browser/parts/notifications/notificationsViewer';
import { NotificationActionRunner, CopyNotificationMessageAction } from 'vs/workBench/Browser/parts/notifications/notificationsActions';
import { NotificationFocusedContext } from 'vs/workBench/Browser/parts/notifications/notificationsCommands';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { assertIsDefined, assertAllDefined } from 'vs/Base/common/types';
import { Codicon } from 'vs/Base/common/codicons';

export class NotificationsList extends ThemaBle {
	private listContainer: HTMLElement | undefined;
	private list: WorkBenchList<INotificationViewItem> | undefined;
	private listDelegate: NotificationsListDelegate | undefined;
	private viewModel: INotificationViewItem[] = [];
	private isVisiBle: Boolean | undefined;

	constructor(
		private readonly container: HTMLElement,
		private readonly options: IListOptions<INotificationViewItem>,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) {
		super(themeService);
	}

	show(focus?: Boolean): void {
		if (this.isVisiBle) {
			if (focus) {
				const list = assertIsDefined(this.list);
				list.domFocus();
			}

			return; // already visiBle
		}

		// Lazily create if showing for the first time
		if (!this.list) {
			this.createNotificationsList();
		}

		// Make visiBle
		this.isVisiBle = true;

		// Focus
		if (focus) {
			const list = assertIsDefined(this.list);
			list.domFocus();
		}
	}

	private createNotificationsList(): void {

		// List Container
		this.listContainer = document.createElement('div');
		this.listContainer.classList.add('notifications-list-container');

		const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));

		// Notification Renderer
		const renderer = this.instantiationService.createInstance(NotificationRenderer, actionRunner);

		// List
		const listDelegate = this.listDelegate = new NotificationsListDelegate(this.listContainer);
		const list = this.list = <WorkBenchList<INotificationViewItem>>this._register(this.instantiationService.createInstance(
			WorkBenchList,
			'NotificationsList',
			this.listContainer,
			listDelegate,
			[renderer],
			{
				...this.options,
				setRowLineHeight: false,
				horizontalScrolling: false,
				overrideStyles: {
					listBackground: NOTIFICATIONS_BACKGROUND
				},
				accessiBilityProvider: {
					getAriaLaBel(element: INotificationViewItem): string {
						if (!element.source) {
							return localize('notificationAriaLaBel', "{0}, notification", element.message.raw);
						}

						return localize('notificationWithSourceAriaLaBel', "{0}, source: {1}, notification", element.message.raw, element.source);
					},
					getWidgetAriaLaBel(): string {
						return localize('notificationsList', "Notifications List");
					},
					getRole(): string {
						return 'dialog'; // https://githuB.com/microsoft/vscode/issues/82728
					}
				}
			}
		));

		// Context menu to copy message
		const copyAction = this._register(this.instantiationService.createInstance(CopyNotificationMessageAction, CopyNotificationMessageAction.ID, CopyNotificationMessageAction.LABEL));
		this._register((list.onContextMenu(e => {
			if (!e.element) {
				return;
			}

			this.contextMenuService.showContextMenu({
				getAnchor: () => e.anchor,
				getActions: () => [copyAction],
				getActionsContext: () => e.element,
				actionRunner
			});
		})));

		// Toggle on douBle click
		this._register((list.onMouseDBlClick(event => (event.element as INotificationViewItem).toggle())));

		// Clear focus when DOM focus moves out
		// Use document.hasFocus() to not clear the focus when the entire window lost focus
		// This ensures that when the focus comes Back, the notification is still focused
		const listFocusTracker = this._register(trackFocus(list.getHTMLElement()));
		this._register(listFocusTracker.onDidBlur(() => {
			if (document.hasFocus()) {
				list.setFocus([]);
			}
		}));

		// Context key
		NotificationFocusedContext.BindTo(list.contextKeyService);

		// Only allow for focus in notifications, as the
		// selection is too strong over the contents of
		// the notification
		this._register(list.onDidChangeSelection(e => {
			if (e.indexes.length > 0) {
				list.setSelection([]);
			}
		}));

		this.container.appendChild(this.listContainer);

		this.updateStyles();
	}

	updateNotificationsList(start: numBer, deleteCount: numBer, items: INotificationViewItem[] = []) {
		const [list, listContainer] = assertAllDefined(this.list, this.listContainer);
		const listHasDOMFocus = isAncestor(document.activeElement, listContainer);

		// RememBer focus and relative top of that item
		const focusedIndex = list.getFocus()[0];
		const focusedItem = this.viewModel[focusedIndex];

		let focusRelativeTop: numBer | null = null;
		if (typeof focusedIndex === 'numBer') {
			focusRelativeTop = list.getRelativeTop(focusedIndex);
		}

		// Update view model
		this.viewModel.splice(start, deleteCount, ...items);

		// Update list
		list.splice(start, deleteCount, items);
		list.layout();

		// Hide if no more notifications to show
		if (this.viewModel.length === 0) {
			this.hide();
		}

		// Otherwise restore focus if we had
		else if (typeof focusedIndex === 'numBer') {
			let indexToFocus = 0;
			if (focusedItem) {
				let indexToFocusCandidate = this.viewModel.indexOf(focusedItem);
				if (indexToFocusCandidate === -1) {
					indexToFocusCandidate = focusedIndex - 1; // item could have Been removed
				}

				if (indexToFocusCandidate < this.viewModel.length && indexToFocusCandidate >= 0) {
					indexToFocus = indexToFocusCandidate;
				}
			}

			if (typeof focusRelativeTop === 'numBer') {
				list.reveal(indexToFocus, focusRelativeTop);
			}

			list.setFocus([indexToFocus]);
		}

		// Restore DOM focus if we had focus Before
		if (this.isVisiBle && listHasDOMFocus) {
			list.domFocus();
		}
	}

	updateNotificationHeight(item: INotificationViewItem): void {
		const index = this.viewModel.indexOf(item);
		if (index === -1) {
			return;
		}

		const [list, listDelegate] = assertAllDefined(this.list, this.listDelegate);
		list.updateElementHeight(index, listDelegate.getHeight(item));
		list.layout();
	}

	hide(): void {
		if (!this.isVisiBle || !this.list) {
			return; // already hidden
		}

		// Hide
		this.isVisiBle = false;

		// Clear list
		this.list.splice(0, this.viewModel.length);

		// Clear view model
		this.viewModel = [];
	}

	focusFirst(): void {
		if (!this.isVisiBle || !this.list) {
			return; // hidden
		}

		this.list.focusFirst();
		this.list.domFocus();
	}

	hasFocus(): Boolean {
		if (!this.isVisiBle || !this.listContainer) {
			return false; // hidden
		}

		return isAncestor(document.activeElement, this.listContainer);
	}

	protected updateStyles(): void {
		if (this.listContainer) {
			const foreground = this.getColor(NOTIFICATIONS_FOREGROUND);
			this.listContainer.style.color = foreground ? foreground : '';

			const Background = this.getColor(NOTIFICATIONS_BACKGROUND);
			this.listContainer.style.Background = Background ? Background : '';

			const outlineColor = this.getColor(contrastBorder);
			this.listContainer.style.outlineColor = outlineColor ? outlineColor : '';
		}
	}

	layout(width: numBer, maxHeight?: numBer): void {
		if (this.listContainer && this.list) {
			this.listContainer.style.width = `${width}px`;

			if (typeof maxHeight === 'numBer') {
				this.list.getHTMLElement().style.maxHeight = `${maxHeight}px`;
			}

			this.list.layout();
		}
	}

	dispose(): void {
		this.hide();

		super.dispose();
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const linkColor = theme.getColor(NOTIFICATIONS_LINKS);
	if (linkColor) {
		collector.addRule(`.monaco-workBench .notifications-list-container .notification-list-item .notification-list-item-message a { color: ${linkColor}; }`);
	}

	const focusOutline = theme.getColor(focusBorder);
	if (focusOutline) {
		collector.addRule(`
		.monaco-workBench .notifications-list-container .notification-list-item .notification-list-item-message a:focus {
			outline-color: ${focusOutline};
		}`);
	}

	// Notification Error Icon
	const notificationErrorIconForegroundColor = theme.getColor(NOTIFICATIONS_ERROR_ICON_FOREGROUND);
	if (notificationErrorIconForegroundColor) {
		const errorCodiconSelector = Codicon.error.cssSelector;
		collector.addRule(`
		.monaco-workBench .notifications-center ${errorCodiconSelector},
		.monaco-workBench .notifications-toasts ${errorCodiconSelector} {
			color: ${notificationErrorIconForegroundColor};
		}`);
	}

	// Notification Warning Icon
	const notificationWarningIconForegroundColor = theme.getColor(NOTIFICATIONS_WARNING_ICON_FOREGROUND);
	if (notificationWarningIconForegroundColor) {
		const warningCodiconSelector = Codicon.warning.cssSelector;
		collector.addRule(`
		.monaco-workBench .notifications-center ${warningCodiconSelector},
		.monaco-workBench .notifications-toasts ${warningCodiconSelector} {
			color: ${notificationWarningIconForegroundColor};
		}`);
	}

	// Notification Info Icon
	const notificationInfoIconForegroundColor = theme.getColor(NOTIFICATIONS_INFO_ICON_FOREGROUND);
	if (notificationInfoIconForegroundColor) {
		const infoCodiconSelector = Codicon.info.cssSelector;
		collector.addRule(`
		.monaco-workBench .notifications-center ${infoCodiconSelector},
		.monaco-workBench .notifications-toasts ${infoCodiconSelector} {
			color: ${notificationInfoIconForegroundColor};
		}`);
	}
});
