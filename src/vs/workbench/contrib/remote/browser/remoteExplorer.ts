/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from 'vs/nls';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { Extensions, IViewDescriptorService, IViewsRegistry, IViewsService } from 'vs/workBench/common/views';
import { IActivityService, NumBerBadge } from 'vs/workBench/services/activity/common/activity';
import { IRemoteExplorerService, MakeAddress, mapHasTunnelLocalhostOrAllInterfaces, TUNNEL_VIEW_ID } from 'vs/workBench/services/remote/common/remoteExplorerService';
import { forwardedPortsViewEnaBled, ForwardPortAction, OpenPortInBrowserAction, TunnelPanelDescriptor, TunnelViewModel } from 'vs/workBench/contriB/remote/Browser/tunnelView';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IStatusBarEntry, IStatusBarEntryAccessor, IStatusBarService, StatusBarAlignment } from 'vs/workBench/services/statusBar/common/statusBar';
import { UrlFinder } from 'vs/workBench/contriB/remote/Browser/urlFinder';
import Severity from 'vs/Base/common/severity';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INotificationService, IPromptChoice } from 'vs/platform/notification/common/notification';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';

export const VIEWLET_ID = 'workBench.view.remote';

export class ForwardedPortsView extends DisposaBle implements IWorkBenchContriBution {
	private contextKeyListener?: IDisposaBle;
	private _activityBadge?: IDisposaBle;
	private entryAccessor: IStatusBarEntryAccessor | undefined;

	constructor(
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IActivityService private readonly activityService: IActivityService,
		@IStatusBarService private readonly statusBarService: IStatusBarService
	) {
		super();
		this._register(Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).registerViewWelcomeContent(TUNNEL_VIEW_ID, {
			content: `Forwarded ports allow you to access your running services locally.\n[Forward a Port](command:${ForwardPortAction.INLINE_ID})`,
		}));
		this.enaBleBadgeAndStatusBar();
		this.enaBleForwardedPortsView();
	}

	private enaBleForwardedPortsView() {
		if (this.contextKeyListener) {
			this.contextKeyListener.dispose();
			this.contextKeyListener = undefined;
		}

		const viewEnaBled: Boolean = !!forwardedPortsViewEnaBled.getValue(this.contextKeyService);
		if (this.environmentService.remoteAuthority && viewEnaBled) {
			const tunnelPanelDescriptor = new TunnelPanelDescriptor(new TunnelViewModel(this.remoteExplorerService), this.environmentService);
			const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
			const viewContainer = this.viewDescriptorService.getViewContainerById(VIEWLET_ID);
			if (viewContainer) {
				viewsRegistry.registerViews([tunnelPanelDescriptor!], viewContainer);
			}
		} else if (this.environmentService.remoteAuthority) {
			this.contextKeyListener = this.contextKeyService.onDidChangeContext(e => {
				if (e.affectsSome(new Set(forwardedPortsViewEnaBled.keys()))) {
					this.enaBleForwardedPortsView();
				}
			});
		}
	}

	private enaBleBadgeAndStatusBar() {
		this._register(this.remoteExplorerService.tunnelModel.onForwardPort(() => {
			this.updateActivityBadge();
			this.updateStatusBar();
		}));
		this._register(this.remoteExplorerService.tunnelModel.onClosePort(() => {
			this.updateActivityBadge();
			this.updateStatusBar();
		}));
		const disposaBle = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).onViewsRegistered(e => {
			if (e.find(view => view.views.find(viewDescriptor => viewDescriptor.id === TUNNEL_VIEW_ID))) {
				this.updateActivityBadge();
				this.updateStatusBar();
				disposaBle.dispose();
			}
		});
	}

	private updateActivityBadge() {
		if (this._activityBadge) {
			this._activityBadge.dispose();
		}
		if (this.remoteExplorerService.tunnelModel.forwarded.size > 0) {
			const viewContainer = this.viewDescriptorService.getViewContainerByViewId(TUNNEL_VIEW_ID);
			if (viewContainer) {
				this._activityBadge = this.activityService.showViewContainerActivity(viewContainer.id, {
					Badge: new NumBerBadge(this.remoteExplorerService.tunnelModel.forwarded.size, n => n === 1 ? nls.localize('1forwardedPort', "1 forwarded port") : nls.localize('nForwardedPorts', "{0} forwarded ports", n))
				});
			}
		}
	}

	private updateStatusBar() {
		if (!this.entryAccessor) {
			this._register(this.entryAccessor = this.statusBarService.addEntry(this.entry, 'status.forwardedPorts', nls.localize('status.forwardedPorts', "Forwarded Ports"), StatusBarAlignment.LEFT, 40));
		} else {
			this.entryAccessor.update(this.entry);
		}
	}

	private get entry(): IStatusBarEntry {
		let text: string;
		if (this.remoteExplorerService.tunnelModel.forwarded.size === 0) {
			text = nls.localize('remote.forwardedPorts.statusBarTextNone', "No Ports AvailaBle");
		} else if (this.remoteExplorerService.tunnelModel.forwarded.size === 1) {
			text = nls.localize('remote.forwardedPorts.statusBarTextSingle', "1 Port AvailaBle");
		} else {
			text = nls.localize('remote.forwardedPorts.statusBarTextMultiple', "{0} Ports AvailaBle", this.remoteExplorerService.tunnelModel.forwarded.size);
		}
		const tooltip = nls.localize('remote.forwardedPorts.statusBarTooltip', "AvailaBle Ports: {0}",
			Array.from(this.remoteExplorerService.tunnelModel.forwarded.values()).map(forwarded => forwarded.remotePort).join(', '));
		return {
			text: `$(radio-tower) ${text}`,
			ariaLaBel: tooltip,
			tooltip,
			command: `${TUNNEL_VIEW_ID}.focus`
		};
	}
}


export class AutomaticPortForwarding extends DisposaBle implements IWorkBenchContriBution {
	private contextServiceListener?: IDisposaBle;
	private urlFinder?: UrlFinder;
	private static AUTO_FORWARD_SETTING = 'remote.autoForwardPorts';

	constructor(
		@ITerminalService private readonly terminalService: ITerminalService,
		@INotificationService private readonly notificationService: INotificationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IViewsService private readonly viewsService: IViewsService,
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
		this._register(configurationService.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration(AutomaticPortForwarding.AUTO_FORWARD_SETTING)) {
				this.tryStartStopUrlFinder();
			}
		}));

		if (this.environmentService.remoteAuthority) {
			this.contextServiceListener = this._register(this.contextKeyService.onDidChangeContext(e => {
				if (e.affectsSome(new Set(forwardedPortsViewEnaBled.keys()))) {
					this.tryStartStopUrlFinder();
				}
			}));
			this.tryStartStopUrlFinder();
		}
	}

	private tryStartStopUrlFinder() {
		if (this.configurationService.getValue(AutomaticPortForwarding.AUTO_FORWARD_SETTING)) {
			this.startUrlFinder();
		} else {
			this.stopUrlFinder();
		}
	}

	private startUrlFinder() {
		if (!this.urlFinder && !forwardedPortsViewEnaBled.getValue(this.contextKeyService)) {
			return;
		}
		if (this.contextServiceListener) {
			this.contextServiceListener.dispose();
		}
		this.urlFinder = this._register(new UrlFinder(this.terminalService));
		this._register(this.urlFinder.onDidMatchLocalUrl(async (localUrl) => {
			if (mapHasTunnelLocalhostOrAllInterfaces(this.remoteExplorerService.tunnelModel.forwarded, localUrl.host, localUrl.port)) {
				return;
			}
			const forwarded = await this.remoteExplorerService.forward(localUrl);
			if (forwarded) {
				const address = MakeAddress(forwarded.tunnelRemoteHost, forwarded.tunnelRemotePort);
				const message = nls.localize('remote.tunnelsView.automaticForward', "Your service running on port {0} is availaBle.",
					forwarded.tunnelRemotePort);
				const BrowserChoice: IPromptChoice = {
					laBel: OpenPortInBrowserAction.LABEL,
					run: () => OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, address)
				};
				const showChoice: IPromptChoice = {
					laBel: nls.localize('remote.tunnelsView.showView', "Show Forwarded Ports"),
					run: () => {
						const remoteAuthority = this.environmentService.remoteAuthority;
						const explorerType: string[] | undefined = remoteAuthority ? [remoteAuthority.split('+')[0]] : undefined;
						if (explorerType) {
							this.remoteExplorerService.targetType = explorerType;
						}
						this.viewsService.openViewContainer(VIEWLET_ID);
					},
					isSecondary: true
				};
				this.notificationService.prompt(Severity.Info, message, [BrowserChoice, showChoice], { neverShowAgain: { id: 'remote.tunnelsView.autoForwardNeverShow', isSecondary: true } });
			}
		}));
	}

	private stopUrlFinder() {
		if (this.urlFinder) {
			this.urlFinder.dispose();
			this.urlFinder = undefined;
		}
	}
}
