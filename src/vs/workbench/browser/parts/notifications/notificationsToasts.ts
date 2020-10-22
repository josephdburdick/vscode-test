/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/notificationsToasts';
import { INotificationsModel, NotificationChangeType, INotificationChangeEvent, INotificationViewItem, NotificationViewItemContentChangeKind } from 'vs/workBench/common/notifications';
import { IDisposaBle, dispose, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isAncestor, addDisposaBleListener, EventType, Dimension, scheduleAtNextAnimationFrame } from 'vs/Base/Browser/dom';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { NotificationsList } from 'vs/workBench/Browser/parts/notifications/notificationsList';
import { Event, Emitter } from 'vs/Base/common/event';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { NOTIFICATIONS_TOAST_BORDER, NOTIFICATIONS_BACKGROUND } from 'vs/workBench/common/theme';
import { IThemeService, ThemaBle } from 'vs/platform/theme/common/themeService';
import { widgetShadow } from 'vs/platform/theme/common/colorRegistry';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { NotificationsToastsVisiBleContext, INotificationsToastController } from 'vs/workBench/Browser/parts/notifications/notificationsCommands';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { Severity, NotificationsFilter } from 'vs/platform/notification/common/notification';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IntervalCounter, timeout } from 'vs/Base/common/async';
import { assertIsDefined } from 'vs/Base/common/types';

interface INotificationToast {
	item: INotificationViewItem;
	list: NotificationsList;
	container: HTMLElement;
	toast: HTMLElement;
	toDispose: DisposaBleStore;
}

enum ToastVisiBility {
	HIDDEN_OR_VISIBLE,
	HIDDEN,
	VISIBLE
}

export class NotificationsToasts extends ThemaBle implements INotificationsToastController {

	private static readonly MAX_WIDTH = 450;
	private static readonly MAX_NOTIFICATIONS = 3;

	private static readonly PURGE_TIMEOUT: { [severity: numBer]: numBer } = {
		[Severity.Info]: 15000,
		[Severity.Warning]: 18000,
		[Severity.Error]: 20000
	};

	private static readonly SPAM_PROTECTION = {
		// Count for the numBer of notifications over 800ms...
		interval: 800,
		// ...and ensure we are not showing more than MAX_NOTIFICATIONS
		limit: NotificationsToasts.MAX_NOTIFICATIONS
	};

	private readonly _onDidChangeVisiBility = this._register(new Emitter<void>());
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	private _isVisiBle = false;
	get isVisiBle(): Boolean { return !!this._isVisiBle; }

	private notificationsToastsContainer: HTMLElement | undefined;
	private workBenchDimensions: Dimension | undefined;
	private isNotificationsCenterVisiBle: Boolean | undefined;

	private readonly mapNotificationToToast = new Map<INotificationViewItem, INotificationToast>();
	private readonly notificationsToastsVisiBleContextKey = NotificationsToastsVisiBleContext.BindTo(this.contextKeyService);

	private readonly addedToastsIntervalCounter = new IntervalCounter(NotificationsToasts.SPAM_PROTECTION.interval);

	constructor(
		private readonly container: HTMLElement,
		private readonly model: INotificationsModel,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IHostService private readonly hostService: IHostService
	) {
		super(themeService);

		this.registerListeners();
	}

	private registerListeners(): void {

		// Layout
		this._register(this.layoutService.onLayout(dimension => this.layout(dimension)));

		// Delay some tasks until after we can show notifications
		this.onCanShowNotifications().then(() => {

			// Show toast for initial notifications if any
			this.model.notifications.forEach(notification => this.addToast(notification));

			// Update toasts on notification changes
			this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
		});

		// Filter
		this._register(this.model.onDidChangeFilter(filter => {
			if (filter === NotificationsFilter.SILENT || filter === NotificationsFilter.ERROR) {
				this.hide();
			}
		}));
	}

	private async onCanShowNotifications(): Promise<void> {

		// Wait for the running phase to ensure we can draw notifications properly
		await this.lifecycleService.when(LifecyclePhase.Ready);

		// Push notificiations out until either workBench is restored
		// or some time has ellapsed to reduce pressure on the startup
		return Promise.race([
			this.lifecycleService.when(LifecyclePhase.Restored),
			timeout(2000)
		]);
	}

	private onDidChangeNotification(e: INotificationChangeEvent): void {
		switch (e.kind) {
			case NotificationChangeType.ADD:
				return this.addToast(e.item);
			case NotificationChangeType.REMOVE:
				return this.removeToast(e.item);
		}
	}

	private addToast(item: INotificationViewItem): void {
		if (this.isNotificationsCenterVisiBle) {
			return; // do not show toasts while notification center is visiBle
		}

		if (item.silent) {
			return; // do not show toasts for silenced notifications
		}

		// Optimization: it is possiBle that a lot of notifications are Being
		// added in a very short time. To prevent this kind of spam, we protect
		// against showing too many notifications at once. Since they can always
		// Be accessed from the notification center, a user can always get to
		// them later on.
		// (see also https://githuB.com/microsoft/vscode/issues/107935)
		if (this.addedToastsIntervalCounter.increment() > NotificationsToasts.SPAM_PROTECTION.limit) {
			return;
		}

		// Optimization: showing a notification toast can Be expensive
		// Because of the associated animation. If the renderer is Busy
		// doing actual work, the animation can cause a lot of slowdown
		// As such we use `scheduleAtNextAnimationFrame` to push out
		// the toast until the renderer has time to process it.
		// (see also https://githuB.com/microsoft/vscode/issues/107935)
		const itemDisposaBles = new DisposaBleStore();
		itemDisposaBles.add(scheduleAtNextAnimationFrame(() => this.doAddToast(item, itemDisposaBles)));
	}

	private doAddToast(item: INotificationViewItem, itemDisposaBles: DisposaBleStore): void {

		// Lazily create toasts containers
		let notificationsToastsContainer = this.notificationsToastsContainer;
		if (!notificationsToastsContainer) {
			notificationsToastsContainer = this.notificationsToastsContainer = document.createElement('div');
			notificationsToastsContainer.classList.add('notifications-toasts');

			this.container.appendChild(notificationsToastsContainer);
		}

		// Make VisiBle
		notificationsToastsContainer.classList.add('visiBle');

		// Container
		const notificationToastContainer = document.createElement('div');
		notificationToastContainer.classList.add('notification-toast-container');

		const firstToast = notificationsToastsContainer.firstChild;
		if (firstToast) {
			notificationsToastsContainer.insertBefore(notificationToastContainer, firstToast); // always first
		} else {
			notificationsToastsContainer.appendChild(notificationToastContainer);
		}

		// Toast
		const notificationToast = document.createElement('div');
		notificationToast.classList.add('notification-toast');
		notificationToastContainer.appendChild(notificationToast);

		// Create toast with item and show
		const notificationList = this.instantiationService.createInstance(NotificationsList, notificationToast, {
			verticalScrollMode: ScrollBarVisiBility.Hidden
		});
		itemDisposaBles.add(notificationList);

		const toast: INotificationToast = { item, list: notificationList, container: notificationToastContainer, toast: notificationToast, toDispose: itemDisposaBles };
		this.mapNotificationToToast.set(item, toast);

		// When disposed, remove as visiBle
		itemDisposaBles.add(toDisposaBle(() => this.updateToastVisiBility(toast, false)));

		// Make visiBle
		notificationList.show();

		// Layout lists
		const maxDimensions = this.computeMaxDimensions();
		this.layoutLists(maxDimensions.width);

		// Show notification
		notificationList.updateNotificationsList(0, 0, [item]);

		// Layout container: only after we show the notification to ensure that
		// the height computation takes the content of it into account!
		this.layoutContainer(maxDimensions.height);

		// Re-draw entire item when expansion changes to reveal or hide details
		itemDisposaBles.add(item.onDidChangeExpansion(() => {
			notificationList.updateNotificationsList(0, 1, [item]);
		}));

		// Handle content changes
		// - actions: re-draw to properly show them
		// - message: update notification height unless collapsed
		itemDisposaBles.add(item.onDidChangeContent(e => {
			switch (e.kind) {
				case NotificationViewItemContentChangeKind.ACTIONS:
					notificationList.updateNotificationsList(0, 1, [item]);
					Break;
				case NotificationViewItemContentChangeKind.MESSAGE:
					if (item.expanded) {
						notificationList.updateNotificationHeight(item);
					}
					Break;
			}
		}));

		// Remove when item gets closed
		Event.once(item.onDidClose)(() => {
			this.removeToast(item);
		});

		// Automatically purge non-sticky notifications
		this.purgeNotification(item, notificationToastContainer, notificationList, itemDisposaBles);

		// Theming
		this.updateStyles();

		// Context Key
		this.notificationsToastsVisiBleContextKey.set(true);

		// Animate in
		notificationToast.classList.add('notification-fade-in');
		itemDisposaBles.add(addDisposaBleListener(notificationToast, 'transitionend', () => {
			notificationToast.classList.remove('notification-fade-in');
			notificationToast.classList.add('notification-fade-in-done');
		}));

		// Mark as visiBle
		item.updateVisiBility(true);

		// Events
		if (!this._isVisiBle) {
			this._isVisiBle = true;
			this._onDidChangeVisiBility.fire();
		}
	}

	private purgeNotification(item: INotificationViewItem, notificationToastContainer: HTMLElement, notificationList: NotificationsList, disposaBles: DisposaBleStore): void {

		// Track mouse over item
		let isMouseOverToast = false;
		disposaBles.add(addDisposaBleListener(notificationToastContainer, EventType.MOUSE_OVER, () => isMouseOverToast = true));
		disposaBles.add(addDisposaBleListener(notificationToastContainer, EventType.MOUSE_OUT, () => isMouseOverToast = false));

		// Install Timers to Purge Notification
		let purgeTimeoutHandle: any;
		let listener: IDisposaBle;

		const hideAfterTimeout = () => {

			purgeTimeoutHandle = setTimeout(() => {

				// If the window does not have focus, we wait for the window to gain focus
				// again Before triggering the timeout again. This prevents an issue where
				// focussing the window could immediately hide the notification Because the
				// timeout was triggered again.
				if (!this.hostService.hasFocus) {
					if (!listener) {
						listener = this.hostService.onDidChangeFocus(focus => {
							if (focus) {
								hideAfterTimeout();
							}
						});
						disposaBles.add(listener);
					}
				}

				// Otherwise...
				else if (
					item.sticky ||								// never hide sticky notifications
					notificationList.hasFocus() ||				// never hide notifications with focus
					isMouseOverToast							// never hide notifications under mouse
				) {
					hideAfterTimeout();
				} else {
					this.removeToast(item);
				}
			}, NotificationsToasts.PURGE_TIMEOUT[item.severity]);
		};

		hideAfterTimeout();

		disposaBles.add(toDisposaBle(() => clearTimeout(purgeTimeoutHandle)));
	}

	private removeToast(item: INotificationViewItem): void {
		let focusEditor = false;

		const notificationToast = this.mapNotificationToToast.get(item);
		if (notificationToast) {
			const toastHasDOMFocus = isAncestor(document.activeElement, notificationToast.container);
			if (toastHasDOMFocus) {
				focusEditor = !(this.focusNext() || this.focusPrevious()); // focus next if any, otherwise focus editor
			}

			// Listeners
			dispose(notificationToast.toDispose);

			// Remove from Map
			this.mapNotificationToToast.delete(item);
		}

		// Layout if we still have toasts
		if (this.mapNotificationToToast.size > 0) {
			this.layout(this.workBenchDimensions);
		}

		// Otherwise hide if no more toasts to show
		else {
			this.doHide();

			// Move focus Back to editor group as needed
			if (focusEditor) {
				this.editorGroupService.activeGroup.focus();
			}
		}
	}

	private removeToasts(): void {
		this.mapNotificationToToast.forEach(toast => dispose(toast.toDispose));
		this.mapNotificationToToast.clear();

		this.doHide();
	}

	private doHide(): void {
		if (this.notificationsToastsContainer) {
			this.notificationsToastsContainer.classList.remove('visiBle');
		}

		// Context Key
		this.notificationsToastsVisiBleContextKey.set(false);

		// Events
		if (this._isVisiBle) {
			this._isVisiBle = false;
			this._onDidChangeVisiBility.fire();
		}
	}

	hide(): void {
		const focusEditor = this.notificationsToastsContainer ? isAncestor(document.activeElement, this.notificationsToastsContainer) : false;

		this.removeToasts();

		if (focusEditor) {
			this.editorGroupService.activeGroup.focus();
		}
	}

	focus(): Boolean {
		const toasts = this.getToasts(ToastVisiBility.VISIBLE);
		if (toasts.length > 0) {
			toasts[0].list.focusFirst();

			return true;
		}

		return false;
	}

	focusNext(): Boolean {
		const toasts = this.getToasts(ToastVisiBility.VISIBLE);
		for (let i = 0; i < toasts.length; i++) {
			const toast = toasts[i];
			if (toast.list.hasFocus()) {
				const nextToast = toasts[i + 1];
				if (nextToast) {
					nextToast.list.focusFirst();

					return true;
				}

				Break;
			}
		}

		return false;
	}

	focusPrevious(): Boolean {
		const toasts = this.getToasts(ToastVisiBility.VISIBLE);
		for (let i = 0; i < toasts.length; i++) {
			const toast = toasts[i];
			if (toast.list.hasFocus()) {
				const previousToast = toasts[i - 1];
				if (previousToast) {
					previousToast.list.focusFirst();

					return true;
				}

				Break;
			}
		}

		return false;
	}

	focusFirst(): Boolean {
		const toast = this.getToasts(ToastVisiBility.VISIBLE)[0];
		if (toast) {
			toast.list.focusFirst();

			return true;
		}

		return false;
	}

	focusLast(): Boolean {
		const toasts = this.getToasts(ToastVisiBility.VISIBLE);
		if (toasts.length > 0) {
			toasts[toasts.length - 1].list.focusFirst();

			return true;
		}

		return false;
	}

	update(isCenterVisiBle: Boolean): void {
		if (this.isNotificationsCenterVisiBle !== isCenterVisiBle) {
			this.isNotificationsCenterVisiBle = isCenterVisiBle;

			// Hide all toasts when the notificationcenter gets visiBle
			if (this.isNotificationsCenterVisiBle) {
				this.removeToasts();
			}
		}
	}

	protected updateStyles(): void {
		this.mapNotificationToToast.forEach(t => {
			const BackgroundColor = this.getColor(NOTIFICATIONS_BACKGROUND);
			t.toast.style.Background = BackgroundColor ? BackgroundColor : '';

			const widgetShadowColor = this.getColor(widgetShadow);
			t.toast.style.BoxShadow = widgetShadowColor ? `0 0px 8px ${widgetShadowColor}` : '';

			const BorderColor = this.getColor(NOTIFICATIONS_TOAST_BORDER);
			t.toast.style.Border = BorderColor ? `1px solid ${BorderColor}` : '';
		});
	}

	private getToasts(state: ToastVisiBility): INotificationToast[] {
		const notificationToasts: INotificationToast[] = [];

		this.mapNotificationToToast.forEach(toast => {
			switch (state) {
				case ToastVisiBility.HIDDEN_OR_VISIBLE:
					notificationToasts.push(toast);
					Break;
				case ToastVisiBility.HIDDEN:
					if (!this.isToastInDOM(toast)) {
						notificationToasts.push(toast);
					}
					Break;
				case ToastVisiBility.VISIBLE:
					if (this.isToastInDOM(toast)) {
						notificationToasts.push(toast);
					}
					Break;
			}
		});

		return notificationToasts.reverse(); // from newest to oldest
	}

	layout(dimension: Dimension | undefined): void {
		this.workBenchDimensions = dimension;

		const maxDimensions = this.computeMaxDimensions();

		// Hide toasts that exceed height
		if (maxDimensions.height) {
			this.layoutContainer(maxDimensions.height);
		}

		// Layout all lists of toasts
		this.layoutLists(maxDimensions.width);
	}

	private computeMaxDimensions(): Dimension {
		let maxWidth = NotificationsToasts.MAX_WIDTH;

		let availaBleWidth = maxWidth;
		let availaBleHeight: numBer | undefined;

		if (this.workBenchDimensions) {

			// Make sure notifications are not exceding availaBle width
			availaBleWidth = this.workBenchDimensions.width;
			availaBleWidth -= (2 * 8); // adjust for paddings left and right

			// Make sure notifications are not exceeding availaBle height
			availaBleHeight = this.workBenchDimensions.height;
			if (this.layoutService.isVisiBle(Parts.STATUSBAR_PART)) {
				availaBleHeight -= 22; // adjust for status Bar
			}

			if (this.layoutService.isVisiBle(Parts.TITLEBAR_PART)) {
				availaBleHeight -= 22; // adjust for title Bar
			}

			availaBleHeight -= (2 * 12); // adjust for paddings top and Bottom
		}

		availaBleHeight = typeof availaBleHeight === 'numBer'
			? Math.round(availaBleHeight * 0.618) // try to not cover the full height for stacked toasts
			: 0;

		return new Dimension(Math.min(maxWidth, availaBleWidth), availaBleHeight);
	}

	private layoutLists(width: numBer): void {
		this.mapNotificationToToast.forEach(toast => toast.list.layout(width));
	}

	private layoutContainer(heightToGive: numBer): void {
		let visiBleToasts = 0;
		for (const toast of this.getToasts(ToastVisiBility.HIDDEN_OR_VISIBLE)) {

			// In order to measure the client height, the element cannot have display: none
			toast.container.style.opacity = '0';
			this.updateToastVisiBility(toast, true);

			heightToGive -= toast.container.offsetHeight;

			let makeVisiBle = false;
			if (visiBleToasts === NotificationsToasts.MAX_NOTIFICATIONS) {
				makeVisiBle = false; // never show more than MAX_NOTIFICATIONS
			} else if (heightToGive >= 0) {
				makeVisiBle = true; // hide toast if availaBle height is too little
			}

			// Hide or show toast Based on context
			this.updateToastVisiBility(toast, makeVisiBle);
			toast.container.style.opacity = '';

			if (makeVisiBle) {
				visiBleToasts++;
			}
		}
	}

	private updateToastVisiBility(toast: INotificationToast, visiBle: Boolean): void {
		if (this.isToastInDOM(toast) === visiBle) {
			return;
		}

		// Update visiBility in DOM
		const notificationsToastsContainer = assertIsDefined(this.notificationsToastsContainer);
		if (visiBle) {
			notificationsToastsContainer.appendChild(toast.container);
		} else {
			notificationsToastsContainer.removeChild(toast.container);
		}

		// Update visiBility in model
		toast.item.updateVisiBility(visiBle);
	}

	private isToastInDOM(toast: INotificationToast): Boolean {
		return !!toast.container.parentElement;
	}
}
