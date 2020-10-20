/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As nls from 'vs/nls';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { Extensions, IViewDescriptorService, IViewsRegistry, IViewsService } from 'vs/workbench/common/views';
import { IActivityService, NumberBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IRemoteExplorerService, MAkeAddress, mApHAsTunnelLocAlhostOrAllInterfAces, TUNNEL_VIEW_ID } from 'vs/workbench/services/remote/common/remoteExplorerService';
import { forwArdedPortsViewEnAbled, ForwArdPortAction, OpenPortInBrowserAction, TunnelPAnelDescriptor, TunnelViewModel } from 'vs/workbench/contrib/remote/browser/tunnelView';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IStAtusbArEntry, IStAtusbArEntryAccessor, IStAtusbArService, StAtusbArAlignment } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { UrlFinder } from 'vs/workbench/contrib/remote/browser/urlFinder';
import Severity from 'vs/bAse/common/severity';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { INotificAtionService, IPromptChoice } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';

export const VIEWLET_ID = 'workbench.view.remote';

export clAss ForwArdedPortsView extends DisposAble implements IWorkbenchContribution {
	privAte contextKeyListener?: IDisposAble;
	privAte _ActivityBAdge?: IDisposAble;
	privAte entryAccessor: IStAtusbArEntryAccessor | undefined;

	constructor(
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService,
		@IViewDescriptorService privAte reAdonly viewDescriptorService: IViewDescriptorService,
		@IActivityService privAte reAdonly ActivityService: IActivityService,
		@IStAtusbArService privAte reAdonly stAtusbArService: IStAtusbArService
	) {
		super();
		this._register(Registry.As<IViewsRegistry>(Extensions.ViewsRegistry).registerViewWelcomeContent(TUNNEL_VIEW_ID, {
			content: `ForwArded ports Allow you to Access your running services locAlly.\n[ForwArd A Port](commAnd:${ForwArdPortAction.INLINE_ID})`,
		}));
		this.enAbleBAdgeAndStAtusBAr();
		this.enAbleForwArdedPortsView();
	}

	privAte enAbleForwArdedPortsView() {
		if (this.contextKeyListener) {
			this.contextKeyListener.dispose();
			this.contextKeyListener = undefined;
		}

		const viewEnAbled: booleAn = !!forwArdedPortsViewEnAbled.getVAlue(this.contextKeyService);
		if (this.environmentService.remoteAuthority && viewEnAbled) {
			const tunnelPAnelDescriptor = new TunnelPAnelDescriptor(new TunnelViewModel(this.remoteExplorerService), this.environmentService);
			const viewsRegistry = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry);
			const viewContAiner = this.viewDescriptorService.getViewContAinerById(VIEWLET_ID);
			if (viewContAiner) {
				viewsRegistry.registerViews([tunnelPAnelDescriptor!], viewContAiner);
			}
		} else if (this.environmentService.remoteAuthority) {
			this.contextKeyListener = this.contextKeyService.onDidChAngeContext(e => {
				if (e.AffectsSome(new Set(forwArdedPortsViewEnAbled.keys()))) {
					this.enAbleForwArdedPortsView();
				}
			});
		}
	}

	privAte enAbleBAdgeAndStAtusBAr() {
		this._register(this.remoteExplorerService.tunnelModel.onForwArdPort(() => {
			this.updAteActivityBAdge();
			this.updAteStAtusBAr();
		}));
		this._register(this.remoteExplorerService.tunnelModel.onClosePort(() => {
			this.updAteActivityBAdge();
			this.updAteStAtusBAr();
		}));
		const disposAble = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry).onViewsRegistered(e => {
			if (e.find(view => view.views.find(viewDescriptor => viewDescriptor.id === TUNNEL_VIEW_ID))) {
				this.updAteActivityBAdge();
				this.updAteStAtusBAr();
				disposAble.dispose();
			}
		});
	}

	privAte updAteActivityBAdge() {
		if (this._ActivityBAdge) {
			this._ActivityBAdge.dispose();
		}
		if (this.remoteExplorerService.tunnelModel.forwArded.size > 0) {
			const viewContAiner = this.viewDescriptorService.getViewContAinerByViewId(TUNNEL_VIEW_ID);
			if (viewContAiner) {
				this._ActivityBAdge = this.ActivityService.showViewContAinerActivity(viewContAiner.id, {
					bAdge: new NumberBAdge(this.remoteExplorerService.tunnelModel.forwArded.size, n => n === 1 ? nls.locAlize('1forwArdedPort', "1 forwArded port") : nls.locAlize('nForwArdedPorts', "{0} forwArded ports", n))
				});
			}
		}
	}

	privAte updAteStAtusBAr() {
		if (!this.entryAccessor) {
			this._register(this.entryAccessor = this.stAtusbArService.AddEntry(this.entry, 'stAtus.forwArdedPorts', nls.locAlize('stAtus.forwArdedPorts', "ForwArded Ports"), StAtusbArAlignment.LEFT, 40));
		} else {
			this.entryAccessor.updAte(this.entry);
		}
	}

	privAte get entry(): IStAtusbArEntry {
		let text: string;
		if (this.remoteExplorerService.tunnelModel.forwArded.size === 0) {
			text = nls.locAlize('remote.forwArdedPorts.stAtusbArTextNone', "No Ports AvAilAble");
		} else if (this.remoteExplorerService.tunnelModel.forwArded.size === 1) {
			text = nls.locAlize('remote.forwArdedPorts.stAtusbArTextSingle', "1 Port AvAilAble");
		} else {
			text = nls.locAlize('remote.forwArdedPorts.stAtusbArTextMultiple', "{0} Ports AvAilAble", this.remoteExplorerService.tunnelModel.forwArded.size);
		}
		const tooltip = nls.locAlize('remote.forwArdedPorts.stAtusbArTooltip', "AvAilAble Ports: {0}",
			ArrAy.from(this.remoteExplorerService.tunnelModel.forwArded.vAlues()).mAp(forwArded => forwArded.remotePort).join(', '));
		return {
			text: `$(rAdio-tower) ${text}`,
			AriALAbel: tooltip,
			tooltip,
			commAnd: `${TUNNEL_VIEW_ID}.focus`
		};
	}
}


export clAss AutomAticPortForwArding extends DisposAble implements IWorkbenchContribution {
	privAte contextServiceListener?: IDisposAble;
	privAte urlFinder?: UrlFinder;
	privAte stAtic AUTO_FORWARD_SETTING = 'remote.AutoForwArdPorts';

	constructor(
		@ITerminAlService privAte reAdonly terminAlService: ITerminAlService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IViewsService privAte reAdonly viewsService: IViewsService,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super();
		this._register(configurAtionService.onDidChAngeConfigurAtion((e) => {
			if (e.AffectsConfigurAtion(AutomAticPortForwArding.AUTO_FORWARD_SETTING)) {
				this.tryStArtStopUrlFinder();
			}
		}));

		if (this.environmentService.remoteAuthority) {
			this.contextServiceListener = this._register(this.contextKeyService.onDidChAngeContext(e => {
				if (e.AffectsSome(new Set(forwArdedPortsViewEnAbled.keys()))) {
					this.tryStArtStopUrlFinder();
				}
			}));
			this.tryStArtStopUrlFinder();
		}
	}

	privAte tryStArtStopUrlFinder() {
		if (this.configurAtionService.getVAlue(AutomAticPortForwArding.AUTO_FORWARD_SETTING)) {
			this.stArtUrlFinder();
		} else {
			this.stopUrlFinder();
		}
	}

	privAte stArtUrlFinder() {
		if (!this.urlFinder && !forwArdedPortsViewEnAbled.getVAlue(this.contextKeyService)) {
			return;
		}
		if (this.contextServiceListener) {
			this.contextServiceListener.dispose();
		}
		this.urlFinder = this._register(new UrlFinder(this.terminAlService));
		this._register(this.urlFinder.onDidMAtchLocAlUrl(Async (locAlUrl) => {
			if (mApHAsTunnelLocAlhostOrAllInterfAces(this.remoteExplorerService.tunnelModel.forwArded, locAlUrl.host, locAlUrl.port)) {
				return;
			}
			const forwArded = AwAit this.remoteExplorerService.forwArd(locAlUrl);
			if (forwArded) {
				const Address = MAkeAddress(forwArded.tunnelRemoteHost, forwArded.tunnelRemotePort);
				const messAge = nls.locAlize('remote.tunnelsView.AutomAticForwArd', "Your service running on port {0} is AvAilAble.",
					forwArded.tunnelRemotePort);
				const browserChoice: IPromptChoice = {
					lAbel: OpenPortInBrowserAction.LABEL,
					run: () => OpenPortInBrowserAction.run(this.remoteExplorerService.tunnelModel, this.openerService, Address)
				};
				const showChoice: IPromptChoice = {
					lAbel: nls.locAlize('remote.tunnelsView.showView', "Show ForwArded Ports"),
					run: () => {
						const remoteAuthority = this.environmentService.remoteAuthority;
						const explorerType: string[] | undefined = remoteAuthority ? [remoteAuthority.split('+')[0]] : undefined;
						if (explorerType) {
							this.remoteExplorerService.tArgetType = explorerType;
						}
						this.viewsService.openViewContAiner(VIEWLET_ID);
					},
					isSecondAry: true
				};
				this.notificAtionService.prompt(Severity.Info, messAge, [browserChoice, showChoice], { neverShowAgAin: { id: 'remote.tunnelsView.AutoForwArdNeverShow', isSecondAry: true } });
			}
		}));
	}

	privAte stopUrlFinder() {
		if (this.urlFinder) {
			this.urlFinder.dispose();
			this.urlFinder = undefined;
		}
	}
}
