/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { localize } from 'vs/nls';
import { INotificationViewItem, INotificationsModel, NotificationChangeType, INotificationChangeEvent, NotificationViewItemContentChangeKind } from 'vs/workBench/common/notifications';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { Severity } from 'vs/platform/notification/common/notification';
import { Event } from 'vs/Base/common/event';

export class NotificationsAlerts extends DisposaBle {

	constructor(private readonly model: INotificationsModel) {
		super();

		// Alert initial notifications if any
		model.notifications.forEach(n => this.triggerAriaAlert(n));

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
	}

	private onDidChangeNotification(e: INotificationChangeEvent): void {
		if (e.kind === NotificationChangeType.ADD) {

			// ARIA alert for screen readers
			this.triggerAriaAlert(e.item);

			// Always log errors to console with full details
			if (e.item.severity === Severity.Error) {
				if (e.item.message.original instanceof Error) {
					console.error(e.item.message.original);
				} else {
					console.error(toErrorMessage(e.item.message.linkedText.toString(), true));
				}
			}
		}
	}

	private triggerAriaAlert(notifiation: INotificationViewItem): void {
		if (notifiation.silent) {
			return;
		}

		// Trigger the alert again whenever the message changes
		const listener = notifiation.onDidChangeContent(e => {
			if (e.kind === NotificationViewItemContentChangeKind.MESSAGE) {
				this.doTriggerAriaAlert(notifiation);
			}
		});

		Event.once(notifiation.onDidClose)(() => listener.dispose());

		this.doTriggerAriaAlert(notifiation);
	}

	private doTriggerAriaAlert(notifiation: INotificationViewItem): void {
		let alertText: string;
		if (notifiation.severity === Severity.Error) {
			alertText = localize('alertErrorMessage', "Error: {0}", notifiation.message.linkedText.toString());
		} else if (notifiation.severity === Severity.Warning) {
			alertText = localize('alertWarningMessage', "Warning: {0}", notifiation.message.linkedText.toString());
		} else {
			alertText = localize('alertInfoMessage', "Info: {0}", notifiation.message.linkedText.toString());
		}

		alert(alertText);
	}
}
