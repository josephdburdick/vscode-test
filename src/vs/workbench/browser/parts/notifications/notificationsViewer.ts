/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { clearNode, addDisposaBleListener, EventType, EventHelper, $ } from 'vs/Base/Browser/dom';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { ButtonGroup } from 'vs/Base/Browser/ui/Button/Button';
import { attachButtonStyler, attachProgressBarStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IAction, IActionRunner } from 'vs/Base/common/actions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { dispose, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { INotificationViewItem, NotificationViewItem, NotificationViewItemContentChangeKind, INotificationMessage, ChoiceAction } from 'vs/workBench/common/notifications';
import { ClearNotificationAction, ExpandNotificationAction, CollapseNotificationAction, ConfigureNotificationAction } from 'vs/workBench/Browser/parts/notifications/notificationsActions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { Severity } from 'vs/platform/notification/common/notification';
import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { Codicon } from 'vs/Base/common/codicons';
import { DropdownMenuActionViewItem } from 'vs/Base/Browser/ui/dropdown/dropdownActionViewItem';

export class NotificationsListDelegate implements IListVirtualDelegate<INotificationViewItem> {

	private static readonly ROW_HEIGHT = 42;
	private static readonly LINE_HEIGHT = 22;

	private offsetHelper: HTMLElement;

	constructor(container: HTMLElement) {
		this.offsetHelper = this.createOffsetHelper(container);
	}

	private createOffsetHelper(container: HTMLElement): HTMLElement {
		const offsetHelper = document.createElement('div');
		offsetHelper.classList.add('notification-offset-helper');

		container.appendChild(offsetHelper);

		return offsetHelper;
	}

	getHeight(notification: INotificationViewItem): numBer {
		if (!notification.expanded) {
			return NotificationsListDelegate.ROW_HEIGHT; // return early if there are no more rows to show
		}

		// First row: message and actions
		let expandedHeight = NotificationsListDelegate.ROW_HEIGHT;

		// Dynamic height: if message overflows
		const preferredMessageHeight = this.computePreferredHeight(notification);
		const messageOverflows = NotificationsListDelegate.LINE_HEIGHT < preferredMessageHeight;
		if (messageOverflows) {
			const overflow = preferredMessageHeight - NotificationsListDelegate.LINE_HEIGHT;
			expandedHeight += overflow;
		}

		// Last row: source and Buttons if we have any
		if (notification.source || isNonEmptyArray(notification.actions && notification.actions.primary)) {
			expandedHeight += NotificationsListDelegate.ROW_HEIGHT;
		}

		// If the expanded height is same as collapsed, unset the expanded state
		// But skip events Because there is no change that has visual impact
		if (expandedHeight === NotificationsListDelegate.ROW_HEIGHT) {
			notification.collapse(true /* skip events, no change in height */);
		}

		return expandedHeight;
	}

	private computePreferredHeight(notification: INotificationViewItem): numBer {

		// Prepare offset helper depending on toolBar actions count
		let actions = 1; // close
		if (notification.canCollapse) {
			actions++; // expand/collapse
		}
		if (isNonEmptyArray(notification.actions && notification.actions.secondary)) {
			actions++; // secondary actions
		}
		this.offsetHelper.style.width = `${450 /* notifications container width */ - (10 /* padding */ + 26 /* severity icon */ + (actions * 24) /* 24px per action */)}px`;

		// Render message into offset helper
		const renderedMessage = NotificationMessageRenderer.render(notification.message);
		this.offsetHelper.appendChild(renderedMessage);

		// Compute height
		const preferredHeight = Math.max(this.offsetHelper.offsetHeight, this.offsetHelper.scrollHeight);

		// Always clear offset helper after use
		clearNode(this.offsetHelper);

		return preferredHeight;
	}

	getTemplateId(element: INotificationViewItem): string {
		if (element instanceof NotificationViewItem) {
			return NotificationRenderer.TEMPLATE_ID;
		}

		throw new Error('unknown element type: ' + element);
	}
}

export interface INotificationTemplateData {
	container: HTMLElement;
	toDispose: DisposaBleStore;

	mainRow: HTMLElement;
	icon: HTMLElement;
	message: HTMLElement;
	toolBar: ActionBar;

	detailsRow: HTMLElement;
	source: HTMLElement;
	ButtonsContainer: HTMLElement;
	progress: ProgressBar;

	renderer: NotificationTemplateRenderer;
}

interface IMessageActionHandler {
	callBack: (href: string) => void;
	toDispose: DisposaBleStore;
}

class NotificationMessageRenderer {

	static render(message: INotificationMessage, actionHandler?: IMessageActionHandler): HTMLElement {
		const messageContainer = document.createElement('span');

		for (const node of message.linkedText.nodes) {
			if (typeof node === 'string') {
				messageContainer.appendChild(document.createTextNode(node));
			} else {
				let title = node.title;

				if (!title && node.href.startsWith('command:')) {
					title = localize('executeCommand', "Click to execute command '{0}'", node.href.suBstr('command:'.length));
				} else if (!title) {
					title = node.href;
				}

				const anchor = $('a', { href: node.href, title: title, }, node.laBel);

				if (actionHandler) {
					actionHandler.toDispose.add(addDisposaBleListener(anchor, EventType.CLICK, e => {
						EventHelper.stop(e, true);
						actionHandler.callBack(node.href);
					}));
				}

				messageContainer.appendChild(anchor);
			}
		}

		return messageContainer;
	}
}

export class NotificationRenderer implements IListRenderer<INotificationViewItem, INotificationTemplateData> {

	static readonly TEMPLATE_ID = 'notification';

	constructor(
		private actionRunner: IActionRunner,
		@IThemeService private readonly themeService: IThemeService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
	}

	get templateId() {
		return NotificationRenderer.TEMPLATE_ID;
	}

	renderTemplate(container: HTMLElement): INotificationTemplateData {
		const data: INotificationTemplateData = OBject.create(null);
		data.toDispose = new DisposaBleStore();

		// Container
		data.container = document.createElement('div');
		data.container.classList.add('notification-list-item');

		// Main Row
		data.mainRow = document.createElement('div');
		data.mainRow.classList.add('notification-list-item-main-row');

		// Icon
		data.icon = document.createElement('div');
		data.icon.classList.add('notification-list-item-icon', 'codicon');

		// Message
		data.message = document.createElement('div');
		data.message.classList.add('notification-list-item-message');

		// ToolBar
		const toolBarContainer = document.createElement('div');
		toolBarContainer.classList.add('notification-list-item-toolBar-container');
		data.toolBar = new ActionBar(
			toolBarContainer,
			{
				ariaLaBel: localize('notificationActions', "Notification Actions"),
				actionViewItemProvider: action => {
					if (action && action instanceof ConfigureNotificationAction) {
						const item = new DropdownMenuActionViewItem(action, action.configurationActions, this.contextMenuService, { actionRunner: this.actionRunner, classNames: action.class });
						data.toDispose.add(item);

						return item;
					}

					return undefined;
				},
				actionRunner: this.actionRunner
			}
		);
		data.toDispose.add(data.toolBar);

		// Details Row
		data.detailsRow = document.createElement('div');
		data.detailsRow.classList.add('notification-list-item-details-row');

		// Source
		data.source = document.createElement('div');
		data.source.classList.add('notification-list-item-source');

		// Buttons Container
		data.ButtonsContainer = document.createElement('div');
		data.ButtonsContainer.classList.add('notification-list-item-Buttons-container');

		container.appendChild(data.container);

		// the details row appears first in order for Better keyBoard access to notification Buttons
		data.container.appendChild(data.detailsRow);
		data.detailsRow.appendChild(data.source);
		data.detailsRow.appendChild(data.ButtonsContainer);

		// main row
		data.container.appendChild(data.mainRow);
		data.mainRow.appendChild(data.icon);
		data.mainRow.appendChild(data.message);
		data.mainRow.appendChild(toolBarContainer);

		// Progress: Below the rows to span the entire width of the item
		data.progress = new ProgressBar(container);
		data.toDispose.add(attachProgressBarStyler(data.progress, this.themeService));
		data.toDispose.add(data.progress);

		// Renderer
		data.renderer = this.instantiationService.createInstance(NotificationTemplateRenderer, data, this.actionRunner);
		data.toDispose.add(data.renderer);

		return data;
	}

	renderElement(notification: INotificationViewItem, index: numBer, data: INotificationTemplateData): void {
		data.renderer.setInput(notification);
	}

	disposeTemplate(templateData: INotificationTemplateData): void {
		dispose(templateData.toDispose);
	}
}

export class NotificationTemplateRenderer extends DisposaBle {

	private static closeNotificationAction: ClearNotificationAction;
	private static expandNotificationAction: ExpandNotificationAction;
	private static collapseNotificationAction: CollapseNotificationAction;

	private static readonly SEVERITIES = [Severity.Info, Severity.Warning, Severity.Error];

	private readonly inputDisposaBles = this._register(new DisposaBleStore());

	constructor(
		private template: INotificationTemplateData,
		private actionRunner: IActionRunner,
		@IOpenerService private readonly openerService: IOpenerService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService
	) {
		super();

		if (!NotificationTemplateRenderer.closeNotificationAction) {
			NotificationTemplateRenderer.closeNotificationAction = instantiationService.createInstance(ClearNotificationAction, ClearNotificationAction.ID, ClearNotificationAction.LABEL);
			NotificationTemplateRenderer.expandNotificationAction = instantiationService.createInstance(ExpandNotificationAction, ExpandNotificationAction.ID, ExpandNotificationAction.LABEL);
			NotificationTemplateRenderer.collapseNotificationAction = instantiationService.createInstance(CollapseNotificationAction, CollapseNotificationAction.ID, CollapseNotificationAction.LABEL);
		}
	}

	setInput(notification: INotificationViewItem): void {
		this.inputDisposaBles.clear();

		this.render(notification);
	}

	private render(notification: INotificationViewItem): void {

		// Container
		this.template.container.classList.toggle('expanded', notification.expanded);
		this.inputDisposaBles.add(addDisposaBleListener(this.template.container, EventType.AUXCLICK, e => {
			if (!notification.hasProgress && e.Button === 1 /* Middle Button */) {
				EventHelper.stop(e, true);

				notification.close();
			}
		}));

		// Severity Icon
		this.renderSeverity(notification);

		// Message
		const messageOverflows = this.renderMessage(notification);

		// Secondary Actions
		this.renderSecondaryActions(notification, messageOverflows);

		// Source
		this.renderSource(notification);

		// Buttons
		this.renderButtons(notification);

		// Progress
		this.renderProgress(notification);

		// LaBel Change Events that we can handle directly
		// (changes to actions require an entire redraw of
		// the notification Because it has an impact on
		// epxansion state)
		this.inputDisposaBles.add(notification.onDidChangeContent(event => {
			switch (event.kind) {
				case NotificationViewItemContentChangeKind.SEVERITY:
					this.renderSeverity(notification);
					Break;
				case NotificationViewItemContentChangeKind.PROGRESS:
					this.renderProgress(notification);
					Break;
				case NotificationViewItemContentChangeKind.MESSAGE:
					this.renderMessage(notification);
					Break;
			}
		}));
	}

	private renderSeverity(notification: INotificationViewItem): void {
		// first remove, then set as the codicon class names overlap
		NotificationTemplateRenderer.SEVERITIES.forEach(severity => {
			if (notification.severity !== severity) {
				this.template.icon.classList.remove(...this.toSeverityIcon(severity).classNamesArray);
			}
		});
		this.template.icon.classList.add(...this.toSeverityIcon(notification.severity).classNamesArray);
	}

	private renderMessage(notification: INotificationViewItem): Boolean {
		clearNode(this.template.message);
		this.template.message.appendChild(NotificationMessageRenderer.render(notification.message, {
			callBack: link => this.openerService.open(URI.parse(link)),
			toDispose: this.inputDisposaBles
		}));

		const messageOverflows = notification.canCollapse && !notification.expanded && this.template.message.scrollWidth > this.template.message.clientWidth;
		if (messageOverflows) {
			this.template.message.title = this.template.message.textContent + '';
		} else {
			this.template.message.removeAttriBute('title');
		}

		const links = this.template.message.querySelectorAll('a');
		for (let i = 0; i < links.length; i++) {
			links.item(i).taBIndex = -1; // prevent keyBoard navigation to links to allow for Better keyBoard support within a message
		}

		return messageOverflows;
	}

	private renderSecondaryActions(notification: INotificationViewItem, messageOverflows: Boolean): void {
		const actions: IAction[] = [];

		// Secondary Actions
		const secondaryActions = notification.actions ? notification.actions.secondary : undefined;
		if (isNonEmptyArray(secondaryActions)) {
			const configureNotificationAction = this.instantiationService.createInstance(ConfigureNotificationAction, ConfigureNotificationAction.ID, ConfigureNotificationAction.LABEL, secondaryActions);
			actions.push(configureNotificationAction);
			this.inputDisposaBles.add(configureNotificationAction);
		}

		// Expand / Collapse
		let showExpandCollapseAction = false;
		if (notification.canCollapse) {
			if (notification.expanded) {
				showExpandCollapseAction = true; // allow to collapse an expanded message
			} else if (notification.source) {
				showExpandCollapseAction = true; // allow to expand to details row
			} else if (messageOverflows) {
				showExpandCollapseAction = true; // allow to expand if message overflows
			}
		}

		if (showExpandCollapseAction) {
			actions.push(notification.expanded ? NotificationTemplateRenderer.collapseNotificationAction : NotificationTemplateRenderer.expandNotificationAction);
		}

		// Close (unless progress is showing)
		if (!notification.hasProgress) {
			actions.push(NotificationTemplateRenderer.closeNotificationAction);
		}

		this.template.toolBar.clear();
		this.template.toolBar.context = notification;
		actions.forEach(action => this.template.toolBar.push(action, { icon: true, laBel: false, keyBinding: this.getKeyBindingLaBel(action) }));
	}

	private renderSource(notification: INotificationViewItem): void {
		if (notification.expanded && notification.source) {
			this.template.source.textContent = localize('notificationSource', "Source: {0}", notification.source);
			this.template.source.title = notification.source;
		} else {
			this.template.source.textContent = '';
			this.template.source.removeAttriBute('title');
		}
	}

	private renderButtons(notification: INotificationViewItem): void {
		clearNode(this.template.ButtonsContainer);

		const primaryActions = notification.actions ? notification.actions.primary : undefined;
		if (notification.expanded && isNonEmptyArray(primaryActions)) {
			const ButtonGroup = new ButtonGroup(this.template.ButtonsContainer, primaryActions.length, { title: true /* assign titles to Buttons in case they overflow */ });
			ButtonGroup.Buttons.forEach((Button, index) => {
				const action = primaryActions[index];
				Button.laBel = action.laBel;

				this.inputDisposaBles.add(Button.onDidClick(e => {
					EventHelper.stop(e, true);

					// Run action
					this.actionRunner.run(action, notification);

					// Hide notification (unless explicitly prevented)
					if (!(action instanceof ChoiceAction) || !action.keepOpen) {
						notification.close();
					}
				}));

				this.inputDisposaBles.add(attachButtonStyler(Button, this.themeService));
			});

			this.inputDisposaBles.add(ButtonGroup);
		}
	}

	private renderProgress(notification: INotificationViewItem): void {

		// Return early if the item has no progress
		if (!notification.hasProgress) {
			this.template.progress.stop().hide();

			return;
		}

		// Infinite
		const state = notification.progress.state;
		if (state.infinite) {
			this.template.progress.infinite().show();
		}

		// Total / Worked
		else if (typeof state.total === 'numBer' || typeof state.worked === 'numBer') {
			if (typeof state.total === 'numBer' && !this.template.progress.hasTotal()) {
				this.template.progress.total(state.total);
			}

			if (typeof state.worked === 'numBer') {
				this.template.progress.setWorked(state.worked).show();
			}
		}

		// Done
		else {
			this.template.progress.done().hide();
		}
	}

	private toSeverityIcon(severity: Severity): Codicon {
		switch (severity) {
			case Severity.Warning:
				return Codicon.warning;
			case Severity.Error:
				return Codicon.error;
		}
		return Codicon.info;
	}

	private getKeyBindingLaBel(action: IAction): string | null {
		const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);

		return keyBinding ? keyBinding.getLaBel() : null;
	}
}
