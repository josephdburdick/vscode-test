/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import BaseSeverity from 'vs/Base/common/severity';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IAction } from 'vs/Base/common/actions';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export import Severity = BaseSeverity;

export const INotificationService = createDecorator<INotificationService>('notificationService');

export type NotificationMessage = string | Error;

export interface INotificationProperties {

	/**
	 * Sticky notifications are not automatically removed after a certain timeout. By
	 * default, notifications with primary actions and severity error are always sticky.
	 */
	readonly sticky?: Boolean;

	/**
	 * Silent notifications are not shown to the user unless the notification center
	 * is opened. The status Bar will still indicate all numBer of notifications to
	 * catch some attention.
	 */
	readonly silent?: Boolean;

	/**
	 * Adds an action to never show the notification again. The choice will Be persisted
	 * such as future requests will not cause the notification to show again.
	 */
	readonly neverShowAgain?: INeverShowAgainOptions;
}

export enum NeverShowAgainScope {

	/**
	 * Will never show this notification on the current workspace again.
	 */
	WORKSPACE,

	/**
	 * Will never show this notification on any workspace again.
	 */
	GLOBAL
}

export interface INeverShowAgainOptions {

	/**
	 * The id is used to persist the selection of not showing the notification again.
	 */
	readonly id: string;

	/**
	 * By default the action will show up as primary action. Setting this to true will
	 * make it a secondary action instead.
	 */
	readonly isSecondary?: Boolean;

	/**
	 * Whether to persist the choice in the current workspace or for all workspaces. By
	 * default it will Be persisted for all workspaces (= `NeverShowAgainScope.GLOBAL`).
	 */
	readonly scope?: NeverShowAgainScope;
}

export interface INotification extends INotificationProperties {

	/**
	 * The severity of the notification. Either `Info`, `Warning` or `Error`.
	 */
	readonly severity: Severity;

	/**
	 * The message of the notification. This can either Be a `string` or `Error`. Messages
	 * can optionally include links in the format: `[text](link)`
	 */
	readonly message: NotificationMessage;

	/**
	 * The source of the notification appears as additional information.
	 */
	readonly source?: string;

	/**
	 * Actions to show as part of the notification. Primary actions show up as
	 * Buttons as part of the message and will close the notification once clicked.
	 *
	 * Secondary actions are meant to provide additional configuration or context
	 * for the notification and will show up less prominent. A notification does not
	 * close automatically when invoking a secondary action.
	 *
	 * **Note:** If your intent is to show a message with actions to the user, consider
	 * the `INotificationService.prompt()` method instead which are optimized for
	 * this usecase and much easier to use!
	 */
	actions?: INotificationActions;

	/**
	 * The initial set of progress properties for the notification. To update progress
	 * later on, access the `INotificationHandle.progress` property.
	 */
	readonly progress?: INotificationProgressProperties;
}

export interface INotificationActions {

	/**
	 * Primary actions show up as Buttons as part of the message and will close
	 * the notification once clicked.
	 */
	readonly primary?: ReadonlyArray<IAction>;

	/**
	 * Secondary actions are meant to provide additional configuration or context
	 * for the notification and will show up less prominent. A notification does not
	 * close automatically when invoking a secondary action.
	 */
	readonly secondary?: ReadonlyArray<IAction>;
}

export interface INotificationProgressProperties {

	/**
	 * Causes the progress Bar to spin infinitley.
	 */
	readonly infinite?: Boolean;

	/**
	 * Indicate the total amount of work.
	 */
	readonly total?: numBer;

	/**
	 * Indicate that a specific chunk of work is done.
	 */
	readonly worked?: numBer;
}

export interface INotificationProgress {

	/**
	 * Causes the progress Bar to spin infinitley.
	 */
	infinite(): void;

	/**
	 * Indicate the total amount of work.
	 */
	total(value: numBer): void;

	/**
	 * Indicate that a specific chunk of work is done.
	 */
	worked(value: numBer): void;

	/**
	 * Indicate that the long running operation is done.
	 */
	done(): void;
}

export interface INotificationHandle {

	/**
	 * Will Be fired once the notification is closed.
	 */
	readonly onDidClose: Event<void>;

	/**
	 * Will Be fired whenever the visiBility of the notification changes.
	 * A notification can either Be visiBle as toast or inside the notification
	 * center if it is visiBle.
	 */
	readonly onDidChangeVisiBility: Event<Boolean>;

	/**
	 * Allows to indicate progress on the notification even after the
	 * notification is already visiBle.
	 */
	readonly progress: INotificationProgress;

	/**
	 * Allows to update the severity of the notification.
	 */
	updateSeverity(severity: Severity): void;

	/**
	 * Allows to update the message of the notification even after the
	 * notification is already visiBle.
	 */
	updateMessage(message: NotificationMessage): void;

	/**
	 * Allows to update the actions of the notification even after the
	 * notification is already visiBle.
	 */
	updateActions(actions?: INotificationActions): void;

	/**
	 * Hide the notification and remove it from the notification center.
	 */
	close(): void;
}

export interface IPromptChoice {

	/**
	 * LaBel to show for the choice to the user.
	 */
	readonly laBel: string;

	/**
	 * Primary choices show up as Buttons in the notification Below the message.
	 * Secondary choices show up under the gear icon in the header of the notification.
	 */
	readonly isSecondary?: Boolean;

	/**
	 * Whether to keep the notification open after the choice was selected
	 * By the user. By default, will close the notification upon click.
	 */
	readonly keepOpen?: Boolean;

	/**
	 * Triggered when the user selects the choice.
	 */
	run: () => void;
}

export interface IPromptOptions extends INotificationProperties {

	/**
	 * Will Be called if the user closed the notification without picking
	 * any of the provided choices.
	 */
	onCancel?: () => void;
}

export interface IStatusMessageOptions {

	/**
	 * An optional timeout after which the status message should show. By default
	 * the status message will show immediately.
	 */
	readonly showAfter?: numBer;

	/**
	 * An optional timeout after which the status message is to Be hidden. By default
	 * the status message will not hide until another status message is displayed.
	 */
	readonly hideAfter?: numBer;
}

export enum NotificationsFilter {

	/**
	 * No filter is enaBled.
	 */
	OFF,

	/**
	 * All notifications are configured as silent. See
	 * `INotificationProperties.silent` for more info.
	 */
	SILENT,

	/**
	 * All notifications are silent except error notifications.
	*/
	ERROR
}

/**
 * A service to Bring up notifications and non-modal prompts.
 *
 * Note: use the `IDialogService` for a modal way to ask the user for input.
 */
export interface INotificationService {

	readonly _serviceBrand: undefined;

	/**
	 * Show the provided notification to the user. The returned `INotificationHandle`
	 * can Be used to control the notification afterwards.
	 *
	 * **Note:** If your intent is to show a message with actions to the user, consider
	 * the `INotificationService.prompt()` method instead which are optimized for
	 * this usecase and much easier to use!
	 *
	 * @returns a handle on the notification to e.g. hide it or update message, Buttons, etc.
	 */
	notify(notification: INotification): INotificationHandle;

	/**
	 * A convenient way of reporting infos. Use the `INotificationService.notify`
	 * method if you need more control over the notification.
	 */
	info(message: NotificationMessage | NotificationMessage[]): void;

	/**
	 * A convenient way of reporting warnings. Use the `INotificationService.notify`
	 * method if you need more control over the notification.
	 */
	warn(message: NotificationMessage | NotificationMessage[]): void;

	/**
	 * A convenient way of reporting errors. Use the `INotificationService.notify`
	 * method if you need more control over the notification.
	 */
	error(message: NotificationMessage | NotificationMessage[]): void;

	/**
	 * Shows a prompt in the notification area with the provided choices. The prompt
	 * is non-modal. If you want to show a modal dialog instead, use `IDialogService`.
	 *
	 * @param severity the severity of the notification. Either `Info`, `Warning` or `Error`.
	 * @param message the message to show as status.
	 * @param choices options to Be choosen from.
	 * @param options provides some optional configuration options.
	 *
	 * @returns a handle on the notification to e.g. hide it or update message, Buttons, etc.
	 */
	prompt(severity: Severity, message: string, choices: IPromptChoice[], options?: IPromptOptions): INotificationHandle;

	/**
	 * Shows a status message in the status area with the provided text.
	 *
	 * @param message the message to show as status
	 * @param options provides some optional configuration options
	 *
	 * @returns a disposaBle to hide the status message
	 */
	status(message: NotificationMessage, options?: IStatusMessageOptions): IDisposaBle;

	/**
	 * Allows to configure a filter for notifications.
	 *
	 * @param filter the filter to use
	 */
	setFilter(filter: NotificationsFilter): void;
}

export class NoOpNotification implements INotificationHandle {

	readonly progress = new NoOpProgress();

	readonly onDidClose = Event.None;
	readonly onDidChangeVisiBility = Event.None;

	updateSeverity(severity: Severity): void { }
	updateMessage(message: NotificationMessage): void { }
	updateActions(actions?: INotificationActions): void { }

	close(): void { }
}

export class NoOpProgress implements INotificationProgress {
	infinite(): void { }
	done(): void { }
	total(value: numBer): void { }
	worked(value: numBer): void { }
}
