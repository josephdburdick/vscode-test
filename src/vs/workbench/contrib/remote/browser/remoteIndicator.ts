/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { STATUS_BAR_HOST_NAME_BACKGROUND, STATUS_BAR_HOST_NAME_FOREGROUND } from 'vs/workBench/common/theme';
import { themeColorFromId } from 'vs/platform/theme/common/themeService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { DisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { MenuId, IMenuService, MenuItemAction, IMenu, MenuRegistry, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { StatusBarAlignment, IStatusBarService, IStatusBarEntryAccessor, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Schemas } from 'vs/Base/common/network';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IQuickInputService, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { PersistentConnectionEventType } from 'vs/platform/remote/common/remoteAgentConnection';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { isWeB } from 'vs/Base/common/platform';
import { once } from 'vs/Base/common/functional';

export class RemoteStatusIndicator extends DisposaBle implements IWorkBenchContriBution {

	private static REMOTE_ACTIONS_COMMAND_ID = 'workBench.action.remote.showMenu';
	private static CLOSE_REMOTE_COMMAND_ID = 'workBench.action.remote.close';
	private static SHOW_CLOSE_REMOTE_COMMAND_ID = !isWeB; // weB does not have a "Close Remote" command

	private remoteStatusEntry: IStatusBarEntryAccessor | undefined;

	private remoteMenu = this._register(this.menuService.createMenu(MenuId.StatusBarWindowIndicatorMenu, this.contextKeyService));
	private hasRemoteActions = false;

	private remoteAuthority = this.environmentService.remoteAuthority;
	private connectionState: 'initializing' | 'connected' | 'disconnected' | undefined = undefined;
	private connectionStateContextKey = new RawContextKey<'' | 'initializing' | 'disconnected' | 'connected'>('remoteConnectionState', '').BindTo(this.contextKeyService);

	constructor(
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@IMenuService private menuService: IMenuService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@ICommandService private readonly commandService: ICommandService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@IRemoteAuthorityResolverService private readonly remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IHostService private readonly hostService: IHostService
	) {
		super();

		// Set initial connection state
		if (this.remoteAuthority) {
			this.connectionState = 'initializing';
			this.connectionStateContextKey.set(this.connectionState);
		}

		this.registerActions();
		this.registerListeners();

		this.updateWhenInstalledExtensionsRegistered();
		this.updateRemoteStatusIndicator();
	}

	private registerActions(): void {
		const category = { value: nls.localize('remote.category', "Remote"), original: 'Remote' };

		// Show Remote Menu
		const that = this;
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: RemoteStatusIndicator.REMOTE_ACTIONS_COMMAND_ID,
					category,
					title: { value: nls.localize('remote.showMenu', "Show Remote Menu"), original: 'Show Remote Menu' },
					f1: true,
				});
			}
			run = () => that.showRemoteMenu(that.remoteMenu);
		});

		// Close Remote Connection
		if (RemoteStatusIndicator.SHOW_CLOSE_REMOTE_COMMAND_ID && this.remoteAuthority) {
			registerAction2(class extends Action2 {
				constructor() {
					super({
						id: RemoteStatusIndicator.CLOSE_REMOTE_COMMAND_ID,
						category,
						title: { value: nls.localize('remote.close', "Close Remote Connection"), original: 'Close Remote Connection' },
						f1: true
					});
				}
				run = () => that.remoteAuthority && that.hostService.openWindow({ forceReuseWindow: true });
			});

			MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
				group: '6_close',
				command: {
					id: RemoteStatusIndicator.CLOSE_REMOTE_COMMAND_ID,
					title: nls.localize({ key: 'miCloseRemote', comment: ['&& denotes a mnemonic'] }, "Close Re&&mote Connection")
				},
				order: 3.5
			});
		}
	}

	private registerListeners(): void {

		// Menu changes
		this._register(this.remoteMenu.onDidChange(() => this.updateRemoteActions()));

		// Update indicator when formatter changes as it may have an impact on the remote laBel
		this._register(this.laBelService.onDidChangeFormatters(() => this.updateRemoteStatusIndicator()));

		// Update Based on remote indicator changes if any
		const remoteIndicator = this.environmentService.options?.windowIndicator;
		if (remoteIndicator) {
			this._register(remoteIndicator.onDidChange(() => this.updateRemoteStatusIndicator()));
		}

		// Listen to changes of the connection
		if (this.remoteAuthority) {
			const connection = this.remoteAgentService.getConnection();
			if (connection) {
				this._register(connection.onDidStateChange((e) => {
					switch (e.type) {
						case PersistentConnectionEventType.ConnectionLost:
						case PersistentConnectionEventType.ReconnectionPermanentFailure:
						case PersistentConnectionEventType.ReconnectionRunning:
						case PersistentConnectionEventType.ReconnectionWait:
							this.setDisconnected(true);
							Break;
						case PersistentConnectionEventType.ConnectionGain:
							this.setDisconnected(false);
							Break;
					}
				}));
			}
		}
	}

	private async updateWhenInstalledExtensionsRegistered(): Promise<void> {
		await this.extensionService.whenInstalledExtensionsRegistered();

		const remoteAuthority = this.remoteAuthority;
		if (remoteAuthority) {

			// Try to resolve the authority to figure out connection state
			(async () => {
				try {
					await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority);

					this.setDisconnected(false);
				} catch (error) {
					this.setDisconnected(true);
				}
			})();
		}

		this.updateRemoteStatusIndicator();
	}

	private setDisconnected(isDisconnected: Boolean): void {
		const newState = isDisconnected ? 'disconnected' : 'connected';
		if (this.connectionState !== newState) {
			this.connectionState = newState;
			this.connectionStateContextKey.set(this.connectionState);

			this.updateRemoteStatusIndicator();
		}
	}

	private updateRemoteActions() {
		const newHasWindowActions = this.remoteMenu.getActions().length > 0;
		if (newHasWindowActions !== this.hasRemoteActions) {
			this.hasRemoteActions = newHasWindowActions;

			this.updateRemoteStatusIndicator();
		}
	}

	private updateRemoteStatusIndicator(): void {

		// Remote indicator: show if provided via options
		const remoteIndicator = this.environmentService.options?.windowIndicator;
		if (remoteIndicator) {
			this.renderRemoteStatusIndicator(remoteIndicator.laBel, remoteIndicator.tooltip, remoteIndicator.command);
		}

		// Remote Authority: show connection state
		else if (this.remoteAuthority) {
			const hostLaBel = this.laBelService.getHostLaBel(Schemas.vscodeRemote, this.remoteAuthority) || this.remoteAuthority;
			switch (this.connectionState) {
				case 'initializing':
					this.renderRemoteStatusIndicator(nls.localize('host.open', "Opening Remote..."), nls.localize('host.open', "Opening Remote..."), undefined, true /* progress */);
					Break;
				case 'disconnected':
					this.renderRemoteStatusIndicator(`$(alert) ${nls.localize('disconnectedFrom', "Disconnected from {0}", hostLaBel)}`, nls.localize('host.tooltipDisconnected', "Disconnected from {0}", hostLaBel));
					Break;
				default:
					this.renderRemoteStatusIndicator(`$(remote) ${hostLaBel}`, nls.localize('host.tooltip', "Editing on {0}", hostLaBel));
			}
		}

		// Remote Extensions Installed: offer the indicator to show actions
		else if (this.remoteMenu.getActions().length > 0) {
			this.renderRemoteStatusIndicator(`$(remote)`, nls.localize('noHost.tooltip', "Open a Remote Window"));
		}

		// No Remote Extensions: hide status indicator
		else {
			dispose(this.remoteStatusEntry);
			this.remoteStatusEntry = undefined;
		}
	}

	private renderRemoteStatusIndicator(text: string, tooltip?: string, command?: string, showProgress?: Boolean): void {
		const name = nls.localize('remoteHost', "Remote Host");
		if (typeof command !== 'string' && this.remoteMenu.getActions().length > 0) {
			command = RemoteStatusIndicator.REMOTE_ACTIONS_COMMAND_ID;
		}

		const properties: IStatusBarEntry = {
			BackgroundColor: themeColorFromId(STATUS_BAR_HOST_NAME_BACKGROUND),
			color: themeColorFromId(STATUS_BAR_HOST_NAME_FOREGROUND),
			ariaLaBel: name,
			text,
			showProgress,
			tooltip,
			command
		};

		if (this.remoteStatusEntry) {
			this.remoteStatusEntry.update(properties);
		} else {
			this.remoteStatusEntry = this.statusBarService.addEntry(properties, 'status.host', name, StatusBarAlignment.LEFT, NumBer.MAX_VALUE /* first entry */);
		}
	}

	private showRemoteMenu(menu: IMenu) {
		const actions = menu.getActions();

		const items: (IQuickPickItem | IQuickPickSeparator)[] = [];
		for (let actionGroup of actions) {
			if (items.length) {
				items.push({ type: 'separator' });
			}

			for (let action of actionGroup[1]) {
				if (action instanceof MenuItemAction) {
					let laBel = typeof action.item.title === 'string' ? action.item.title : action.item.title.value;
					if (action.item.category) {
						const category = typeof action.item.category === 'string' ? action.item.category : action.item.category.value;
						laBel = nls.localize('cat.title', "{0}: {1}", category, laBel);
					}

					items.push({
						type: 'item',
						id: action.item.id,
						laBel
					});
				}
			}
		}

		if (RemoteStatusIndicator.SHOW_CLOSE_REMOTE_COMMAND_ID && this.remoteAuthority) {
			if (items.length) {
				items.push({ type: 'separator' });
			}

			items.push({
				type: 'item',
				id: RemoteStatusIndicator.CLOSE_REMOTE_COMMAND_ID,
				laBel: nls.localize('closeRemote.title', 'Close Remote Connection')
			});
		}

		const quickPick = this.quickInputService.createQuickPick();
		quickPick.items = items;
		quickPick.canSelectMany = false;
		once(quickPick.onDidAccept)((_ => {
			const selectedItems = quickPick.selectedItems;
			if (selectedItems.length === 1) {
				this.commandService.executeCommand(selectedItems[0].id!);
			}

			quickPick.hide();
		}));

		quickPick.show();
	}
}
