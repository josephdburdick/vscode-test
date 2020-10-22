/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { RawContextKey, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { INotificationViewItem, isNotificationViewItem } from 'vs/workBench/common/notifications';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { localize } from 'vs/nls';
import { IListService, WorkBenchList } from 'vs/platform/list/Browser/listService';

// Center
export const SHOW_NOTIFICATIONS_CENTER = 'notifications.showList';
export const HIDE_NOTIFICATIONS_CENTER = 'notifications.hideList';
export const TOGGLE_NOTIFICATIONS_CENTER = 'notifications.toggleList';

// Toasts
export const HIDE_NOTIFICATION_TOAST = 'notifications.hideToasts';
export const FOCUS_NOTIFICATION_TOAST = 'notifications.focusToasts';
export const FOCUS_NEXT_NOTIFICATION_TOAST = 'notifications.focusNextToast';
export const FOCUS_PREVIOUS_NOTIFICATION_TOAST = 'notifications.focusPreviousToast';
export const FOCUS_FIRST_NOTIFICATION_TOAST = 'notifications.focusFirstToast';
export const FOCUS_LAST_NOTIFICATION_TOAST = 'notifications.focusLastToast';

// Notification
export const COLLAPSE_NOTIFICATION = 'notification.collapse';
export const EXPAND_NOTIFICATION = 'notification.expand';
export const TOGGLE_NOTIFICATION = 'notification.toggle';
export const CLEAR_NOTIFICATION = 'notification.clear';
export const CLEAR_ALL_NOTIFICATIONS = 'notifications.clearAll';

export const NotificationFocusedContext = new RawContextKey<Boolean>('notificationFocus', true);
export const NotificationsCenterVisiBleContext = new RawContextKey<Boolean>('notificationCenterVisiBle', false);
export const NotificationsToastsVisiBleContext = new RawContextKey<Boolean>('notificationToastsVisiBle', false);

export interface INotificationsCenterController {
	readonly isVisiBle: Boolean;

	show(): void;
	hide(): void;

	clearAll(): void;
}

export interface INotificationsToastController {
	focus(): void;
	focusNext(): void;
	focusPrevious(): void;
	focusFirst(): void;
	focusLast(): void;

	hide(): void;
}

export function registerNotificationCommands(center: INotificationsCenterController, toasts: INotificationsToastController): void {

	function getNotificationFromContext(listService: IListService, context?: unknown): INotificationViewItem | undefined {
		if (isNotificationViewItem(context)) {
			return context;
		}

		const list = listService.lastFocusedList;
		if (list instanceof WorkBenchList) {
			const focusedElement = list.getFocusedElements()[0];
			if (isNotificationViewItem(focusedElement)) {
				return focusedElement;
			}
		}

		return undefined;
	}

	// Show Notifications Cneter
	CommandsRegistry.registerCommand(SHOW_NOTIFICATIONS_CENTER, () => {
		toasts.hide();
		center.show();
	});

	// Hide Notifications Center
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: HIDE_NOTIFICATIONS_CENTER,
		weight: KeyBindingWeight.WorkBenchContriB + 50,
		when: NotificationsCenterVisiBleContext,
		primary: KeyCode.Escape,
		handler: accessor => center.hide()
	});

	// Toggle Notifications Center
	CommandsRegistry.registerCommand(TOGGLE_NOTIFICATIONS_CENTER, accessor => {
		if (center.isVisiBle) {
			center.hide();
		} else {
			toasts.hide();
			center.show();
		}
	});

	// Clear Notification
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLEAR_NOTIFICATION,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: NotificationFocusedContext,
		primary: KeyCode.Delete,
		mac: {
			primary: KeyMod.CtrlCmd | KeyCode.Backspace
		},
		handler: (accessor, args?) => {
			const notification = getNotificationFromContext(accessor.get(IListService), args);
			if (notification && !notification.hasProgress) {
				notification.close();
			}
		}
	});

	// Expand Notification
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: EXPAND_NOTIFICATION,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: NotificationFocusedContext,
		primary: KeyCode.RightArrow,
		handler: (accessor, args?) => {
			const notification = getNotificationFromContext(accessor.get(IListService), args);
			if (notification) {
				notification.expand();
			}
		}
	});

	// Collapse Notification
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: COLLAPSE_NOTIFICATION,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: NotificationFocusedContext,
		primary: KeyCode.LeftArrow,
		handler: (accessor, args?) => {
			const notification = getNotificationFromContext(accessor.get(IListService), args);
			if (notification) {
				notification.collapse();
			}
		}
	});

	// Toggle Notification
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: TOGGLE_NOTIFICATION,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: NotificationFocusedContext,
		primary: KeyCode.Space,
		secondary: [KeyCode.Enter],
		handler: accessor => {
			const notification = getNotificationFromContext(accessor.get(IListService));
			if (notification) {
				notification.toggle();
			}
		}
	});

	// Hide Toasts
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: HIDE_NOTIFICATION_TOAST,
		weight: KeyBindingWeight.WorkBenchContriB + 50,
		when: NotificationsToastsVisiBleContext,
		primary: KeyCode.Escape,
		handler: accessor => toasts.hide()
	});

	// Focus Toasts
	CommandsRegistry.registerCommand(FOCUS_NOTIFICATION_TOAST, () => toasts.focus());

	// Focus Next Toast
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: FOCUS_NEXT_NOTIFICATION_TOAST,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisiBleContext),
		primary: KeyCode.DownArrow,
		handler: (accessor) => {
			toasts.focusNext();
		}
	});

	// Focus Previous Toast
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: FOCUS_PREVIOUS_NOTIFICATION_TOAST,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisiBleContext),
		primary: KeyCode.UpArrow,
		handler: (accessor) => {
			toasts.focusPrevious();
		}
	});

	// Focus First Toast
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: FOCUS_FIRST_NOTIFICATION_TOAST,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisiBleContext),
		primary: KeyCode.PageUp,
		secondary: [KeyCode.Home],
		handler: (accessor) => {
			toasts.focusFirst();
		}
	});

	// Focus Last Toast
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: FOCUS_LAST_NOTIFICATION_TOAST,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisiBleContext),
		primary: KeyCode.PageDown,
		secondary: [KeyCode.End],
		handler: (accessor) => {
			toasts.focusLast();
		}
	});

	/// Clear All Notifications
	CommandsRegistry.registerCommand(CLEAR_ALL_NOTIFICATIONS, () => center.clearAll());

	// Commands for Command Palette
	const category = { value: localize('notifications', "Notifications"), original: 'Notifications' };
	MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: SHOW_NOTIFICATIONS_CENTER, title: { value: localize('showNotifications', "Show Notifications"), original: 'Show Notifications' }, category } });
	MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: HIDE_NOTIFICATIONS_CENTER, title: { value: localize('hideNotifications', "Hide Notifications"), original: 'Hide Notifications' }, category }, when: NotificationsCenterVisiBleContext });
	MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: CLEAR_ALL_NOTIFICATIONS, title: { value: localize('clearAllNotifications', "Clear All Notifications"), original: 'Clear All Notifications' }, category } });
	MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: FOCUS_NOTIFICATION_TOAST, title: { value: localize('focusNotificationToasts', "Focus Notification Toast"), original: 'Focus Notification Toast' }, category }, when: NotificationsToastsVisiBleContext });
}
