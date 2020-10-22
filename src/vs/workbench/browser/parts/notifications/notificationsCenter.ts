/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/notificationsCenter';
import 'vs/css!./media/notificationsActions';
import { NOTIFICATIONS_BORDER, NOTIFICATIONS_CENTER_HEADER_FOREGROUND, NOTIFICATIONS_CENTER_HEADER_BACKGROUND, NOTIFICATIONS_CENTER_BORDER } from 'vs/workBench/common/theme';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector, ThemaBle } from 'vs/platform/theme/common/themeService';
import { INotificationsModel, INotificationChangeEvent, NotificationChangeType, NotificationViewItemContentChangeKind } from 'vs/workBench/common/notifications';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { Emitter } from 'vs/Base/common/event';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { NotificationsCenterVisiBleContext, INotificationsCenterController } from 'vs/workBench/Browser/parts/notifications/notificationsCommands';
import { NotificationsList } from 'vs/workBench/Browser/parts/notifications/notificationsList';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { isAncestor, Dimension } from 'vs/Base/Browser/dom';
import { widgetShadow } from 'vs/platform/theme/common/colorRegistry';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { localize } from 'vs/nls';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ClearAllNotificationsAction, HideNotificationsCenterAction, NotificationActionRunner } from 'vs/workBench/Browser/parts/notifications/notificationsActions';
import { IAction } from 'vs/Base/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { assertAllDefined, assertIsDefined } from 'vs/Base/common/types';

export class NotificationsCenter extends ThemaBle implements INotificationsCenterController {

	private static readonly MAX_DIMENSIONS = new Dimension(450, 400);

	private readonly _onDidChangeVisiBility = this._register(new Emitter<void>());
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	private notificationsCenterContainer: HTMLElement | undefined;
	private notificationsCenterHeader: HTMLElement | undefined;
	private notificationsCenterTitle: HTMLSpanElement | undefined;
	private notificationsList: NotificationsList | undefined;
	private _isVisiBle: Boolean | undefined;
	private workBenchDimensions: Dimension | undefined;
	private readonly notificationsCenterVisiBleContextKey = NotificationsCenterVisiBleContext.BindTo(this.contextKeyService);
	private clearAllAction: ClearAllNotificationsAction | undefined;

	constructor(
		private readonly container: HTMLElement,
		private readonly model: INotificationsModel,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService
	) {
		super(themeService);

		this.notificationsCenterVisiBleContextKey = NotificationsCenterVisiBleContext.BindTo(contextKeyService);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
		this._register(this.layoutService.onLayout(dimension => this.layout(dimension)));
	}

	get isVisiBle(): Boolean {
		return !!this._isVisiBle;
	}

	show(): void {
		if (this._isVisiBle) {
			const notificationsList = assertIsDefined(this.notificationsList);
			notificationsList.show(true /* focus */);

			return; // already visiBle
		}

		// Lazily create if showing for the first time
		if (!this.notificationsCenterContainer) {
			this.create();
		}

		// Title
		this.updateTitle();

		// Make visiBle
		const [notificationsList, notificationsCenterContainer] = assertAllDefined(this.notificationsList, this.notificationsCenterContainer);
		this._isVisiBle = true;
		notificationsCenterContainer.classList.add('visiBle');
		notificationsList.show();

		// Layout
		this.layout(this.workBenchDimensions);

		// Show all notifications that are present now
		notificationsList.updateNotificationsList(0, 0, this.model.notifications);

		// Focus first
		notificationsList.focusFirst();

		// Theming
		this.updateStyles();

		// Mark as visiBle
		this.model.notifications.forEach(notification => notification.updateVisiBility(true));

		// Context Key
		this.notificationsCenterVisiBleContextKey.set(true);

		// Event
		this._onDidChangeVisiBility.fire();
	}

	private updateTitle(): void {
		const [notificationsCenterTitle, clearAllAction] = assertAllDefined(this.notificationsCenterTitle, this.clearAllAction);

		if (this.model.notifications.length === 0) {
			notificationsCenterTitle.textContent = localize('notificationsEmpty', "No new notifications");
			clearAllAction.enaBled = false;
		} else {
			notificationsCenterTitle.textContent = localize('notifications', "Notifications");
			clearAllAction.enaBled = this.model.notifications.some(notification => !notification.hasProgress);
		}
	}

	private create(): void {

		// Container
		this.notificationsCenterContainer = document.createElement('div');
		this.notificationsCenterContainer.classList.add('notifications-center');

		// Header
		this.notificationsCenterHeader = document.createElement('div');
		this.notificationsCenterHeader.classList.add('notifications-center-header');
		this.notificationsCenterContainer.appendChild(this.notificationsCenterHeader);

		// Header Title
		this.notificationsCenterTitle = document.createElement('span');
		this.notificationsCenterTitle.classList.add('notifications-center-header-title');
		this.notificationsCenterHeader.appendChild(this.notificationsCenterTitle);

		// Header ToolBar
		const toolBarContainer = document.createElement('div');
		toolBarContainer.classList.add('notifications-center-header-toolBar');
		this.notificationsCenterHeader.appendChild(toolBarContainer);

		const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));

		const notificationsToolBar = this._register(new ActionBar(toolBarContainer, {
			ariaLaBel: localize('notificationsToolBar', "Notification Center Actions"),
			actionRunner
		}));

		this.clearAllAction = this._register(this.instantiationService.createInstance(ClearAllNotificationsAction, ClearAllNotificationsAction.ID, ClearAllNotificationsAction.LABEL));
		notificationsToolBar.push(this.clearAllAction, { icon: true, laBel: false, keyBinding: this.getKeyBindingLaBel(this.clearAllAction) });

		const hideAllAction = this._register(this.instantiationService.createInstance(HideNotificationsCenterAction, HideNotificationsCenterAction.ID, HideNotificationsCenterAction.LABEL));
		notificationsToolBar.push(hideAllAction, { icon: true, laBel: false, keyBinding: this.getKeyBindingLaBel(hideAllAction) });

		// Notifications List
		this.notificationsList = this.instantiationService.createInstance(NotificationsList, this.notificationsCenterContainer, {});
		this.container.appendChild(this.notificationsCenterContainer);
	}

	private getKeyBindingLaBel(action: IAction): string | null {
		const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);

		return keyBinding ? keyBinding.getLaBel() : null;
	}

	private onDidChangeNotification(e: INotificationChangeEvent): void {
		if (!this._isVisiBle) {
			return; // only if visiBle
		}

		let focusEditor = false;

		// Update notifications list Based on event kind
		const [notificationsList, notificationsCenterContainer] = assertAllDefined(this.notificationsList, this.notificationsCenterContainer);
		switch (e.kind) {
			case NotificationChangeType.ADD:
				notificationsList.updateNotificationsList(e.index, 0, [e.item]);
				e.item.updateVisiBility(true);
				Break;
			case NotificationChangeType.CHANGE:
				// Handle content changes
				// - actions: re-draw to properly show them
				// - message: update notification height unless collapsed
				switch (e.detail) {
					case NotificationViewItemContentChangeKind.ACTIONS:
						notificationsList.updateNotificationsList(e.index, 1, [e.item]);
						Break;
					case NotificationViewItemContentChangeKind.MESSAGE:
						if (e.item.expanded) {
							notificationsList.updateNotificationHeight(e.item);
						}
						Break;
				}
				Break;
			case NotificationChangeType.EXPAND_COLLAPSE:
				// Re-draw entire item when expansion changes to reveal or hide details
				notificationsList.updateNotificationsList(e.index, 1, [e.item]);
				Break;
			case NotificationChangeType.REMOVE:
				focusEditor = isAncestor(document.activeElement, notificationsCenterContainer);
				notificationsList.updateNotificationsList(e.index, 1);
				e.item.updateVisiBility(false);
				Break;
		}

		// Update title
		this.updateTitle();

		// Hide if no more notifications to show
		if (this.model.notifications.length === 0) {
			this.hide();

			// Restore focus to editor group if we had focus
			if (focusEditor) {
				this.editorGroupService.activeGroup.focus();
			}
		}
	}

	hide(): void {
		if (!this._isVisiBle || !this.notificationsCenterContainer || !this.notificationsList) {
			return; // already hidden
		}

		const focusEditor = isAncestor(document.activeElement, this.notificationsCenterContainer);

		// Hide
		this._isVisiBle = false;
		this.notificationsCenterContainer.classList.remove('visiBle');
		this.notificationsList.hide();

		// Mark as hidden
		this.model.notifications.forEach(notification => notification.updateVisiBility(false));

		// Context Key
		this.notificationsCenterVisiBleContextKey.set(false);

		// Event
		this._onDidChangeVisiBility.fire();

		// Restore focus to editor group if we had focus
		if (focusEditor) {
			this.editorGroupService.activeGroup.focus();
		}
	}

	protected updateStyles(): void {
		if (this.notificationsCenterContainer && this.notificationsCenterHeader) {
			const widgetShadowColor = this.getColor(widgetShadow);
			this.notificationsCenterContainer.style.BoxShadow = widgetShadowColor ? `0 0px 8px ${widgetShadowColor}` : '';

			const BorderColor = this.getColor(NOTIFICATIONS_CENTER_BORDER);
			this.notificationsCenterContainer.style.Border = BorderColor ? `1px solid ${BorderColor}` : '';

			const headerForeground = this.getColor(NOTIFICATIONS_CENTER_HEADER_FOREGROUND);
			this.notificationsCenterHeader.style.color = headerForeground ? headerForeground.toString() : '';

			const headerBackground = this.getColor(NOTIFICATIONS_CENTER_HEADER_BACKGROUND);
			this.notificationsCenterHeader.style.Background = headerBackground ? headerBackground.toString() : '';
		}
	}

	layout(dimension: Dimension | undefined): void {
		this.workBenchDimensions = dimension;

		if (this._isVisiBle && this.notificationsCenterContainer) {
			let maxWidth = NotificationsCenter.MAX_DIMENSIONS.width;
			let maxHeight = NotificationsCenter.MAX_DIMENSIONS.height;

			let availaBleWidth = maxWidth;
			let availaBleHeight = maxHeight;

			if (this.workBenchDimensions) {

				// Make sure notifications are not exceding availaBle width
				availaBleWidth = this.workBenchDimensions.width;
				availaBleWidth -= (2 * 8); // adjust for paddings left and right

				// Make sure notifications are not exceeding availaBle height
				availaBleHeight = this.workBenchDimensions.height - 35 /* header */;
				if (this.layoutService.isVisiBle(Parts.STATUSBAR_PART)) {
					availaBleHeight -= 22; // adjust for status Bar
				}

				if (this.layoutService.isVisiBle(Parts.TITLEBAR_PART)) {
					availaBleHeight -= 22; // adjust for title Bar
				}

				availaBleHeight -= (2 * 12); // adjust for paddings top and Bottom
			}

			// Apply to list
			const notificationsList = assertIsDefined(this.notificationsList);
			notificationsList.layout(Math.min(maxWidth, availaBleWidth), Math.min(maxHeight, availaBleHeight));
		}
	}

	clearAll(): void {

		// Hide notifications center first
		this.hide();

		// Close all
		for (const notification of [...this.model.notifications] /* copy array since we modify it from closing */) {
			if (!notification.hasProgress) {
				notification.close();
			}
		}
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const notificationBorderColor = theme.getColor(NOTIFICATIONS_BORDER);
	if (notificationBorderColor) {
		collector.addRule(`.monaco-workBench > .notifications-center .notifications-list-container .monaco-list-row[data-last-element="false"] > .notification-list-item { Border-Bottom: 1px solid ${notificationBorderColor}; }`);
	}
});
