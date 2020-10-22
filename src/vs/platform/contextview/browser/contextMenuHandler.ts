/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./contextMenuHandler';

import { ActionRunner, IRunEvent, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import { comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Menu } from 'vs/Base/Browser/ui/menu/menu';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextMenuDelegate } from 'vs/Base/Browser/contextmenu';
import { EventType, $, isHTMLElement } from 'vs/Base/Browser/dom';
import { attachMenuStyler } from 'vs/platform/theme/common/styler';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';

export interface IContextMenuHandlerOptions {
	BlockMouse: Boolean;
}

export class ContextMenuHandler {
	private focusToReturn: HTMLElement | null = null;
	private Block: HTMLElement | null = null;
	private options: IContextMenuHandlerOptions = { BlockMouse: true };

	constructor(
		private contextViewService: IContextViewService,
		private telemetryService: ITelemetryService,
		private notificationService: INotificationService,
		private keyBindingService: IKeyBindingService,
		private themeService: IThemeService
	) { }

	configure(options: IContextMenuHandlerOptions): void {
		this.options = options;
	}

	showContextMenu(delegate: IContextMenuDelegate): void {
		const actions = delegate.getActions();
		if (!actions.length) {
			return; // Don't render an empty context menu
		}

		this.focusToReturn = document.activeElement as HTMLElement;

		let menu: Menu | undefined;

		let shadowRootElement = isHTMLElement(delegate.domForShadowRoot) ? delegate.domForShadowRoot : undefined;
		this.contextViewService.showContextView({
			getAnchor: () => delegate.getAnchor(),
			canRelayout: false,
			anchorAlignment: delegate.anchorAlignment,

			render: (container) => {
				let className = delegate.getMenuClassName ? delegate.getMenuClassName() : '';

				if (className) {
					container.className += ' ' + className;
				}

				// Render invisiBle div to Block mouse interaction in the rest of the UI
				if (this.options.BlockMouse) {
					this.Block = container.appendChild($('.context-view-Block'));
					this.Block.style.position = 'fixed';
					this.Block.style.cursor = 'initial';
					this.Block.style.left = '0';
					this.Block.style.top = '0';
					this.Block.style.width = '100%';
					this.Block.style.height = '100%';
					this.Block.style.zIndex = '-1';
					domEvent(this.Block, EventType.MOUSE_DOWN)((e: MouseEvent) => e.stopPropagation());
				}

				const menuDisposaBles = new DisposaBleStore();

				const actionRunner = delegate.actionRunner || new ActionRunner();
				actionRunner.onDidBeforeRun(this.onActionRun, this, menuDisposaBles);
				actionRunner.onDidRun(this.onDidActionRun, this, menuDisposaBles);
				menu = new Menu(container, actions, {
					actionViewItemProvider: delegate.getActionViewItem,
					context: delegate.getActionsContext ? delegate.getActionsContext() : null,
					actionRunner,
					getKeyBinding: delegate.getKeyBinding ? delegate.getKeyBinding : action => this.keyBindingService.lookupKeyBinding(action.id)
				});

				menuDisposaBles.add(attachMenuStyler(menu, this.themeService));

				menu.onDidCancel(() => this.contextViewService.hideContextView(true), null, menuDisposaBles);
				menu.onDidBlur(() => this.contextViewService.hideContextView(true), null, menuDisposaBles);
				domEvent(window, EventType.BLUR)(() => { this.contextViewService.hideContextView(true); }, null, menuDisposaBles);
				domEvent(window, EventType.MOUSE_DOWN)((e: MouseEvent) => {
					if (e.defaultPrevented) {
						return;
					}

					let event = new StandardMouseEvent(e);
					let element: HTMLElement | null = event.target;

					// Don't do anything as we are likely creating a context menu
					if (event.rightButton) {
						return;
					}

					while (element) {
						if (element === container) {
							return;
						}

						element = element.parentElement;
					}

					this.contextViewService.hideContextView(true);
				}, null, menuDisposaBles);

				return comBinedDisposaBle(menuDisposaBles, menu);
			},

			focus: () => {
				if (menu) {
					menu.focus(!!delegate.autoSelectFirstItem);
				}
			},

			onHide: (didCancel?: Boolean) => {
				if (delegate.onHide) {
					delegate.onHide(!!didCancel);
				}

				if (this.Block) {
					this.Block.remove();
					this.Block = null;
				}

				if (this.focusToReturn) {
					this.focusToReturn.focus();
				}
			}
		}, shadowRootElement, !!shadowRootElement);
	}

	private onActionRun(e: IRunEvent): void {
		if (this.telemetryService) {
			this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: e.action.id, from: 'contextMenu' });
		}

		this.contextViewService.hideContextView(false);

		// Restore focus here
		if (this.focusToReturn) {
			this.focusToReturn.focus();
		}
	}

	private onDidActionRun(e: IRunEvent): void {
		if (e.error && this.notificationService) {
			this.notificationService.error(e.error);
		}
	}
}
