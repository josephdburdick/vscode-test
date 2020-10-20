/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/extension';
import { Append, $ } from 'vs/bAse/browser/dom';
import { IDisposAble, dispose, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { IAction } from 'vs/bAse/common/Actions';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { IPAgedRenderer } from 'vs/bAse/browser/ui/list/listPAging';
import { Event } from 'vs/bAse/common/event';
import { domEvent } from 'vs/bAse/browser/event';
import { IExtension, ExtensionContAiners, ExtensionStAte, IExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/common/extensions';
import { InstAllAction, UpdAteAction, MAnAgeExtensionAction, ReloAdAction, MAliciousStAtusLAbelAction, ExtensionActionViewItem, StAtusLAbelAction, RemoteInstAllAction, SystemDisAbledWArningAction, ExtensionToolTipAction, LocAlInstAllAction, SyncIgnoredIconAction } from 'vs/workbench/contrib/extensions/browser/extensionsActions';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { LAbel, RAtingsWidget, InstAllCountWidget, RecommendAtionWidget, RemoteBAdgeWidget, TooltipWidget, ExtensionPAckCountWidget As ExtensionPAckBAdgeWidget } from 'vs/workbench/contrib/extensions/browser/extensionsWidgets';
import { IExtensionService, toExtension } from 'vs/workbench/services/extensions/common/extensions';
import { IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { isLAnguAgePAckExtension } from 'vs/plAtform/extensions/common/extensions';
import { registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { foreground, listActiveSelectionForeground, listActiveSelectionBAckground, listInActiveSelectionForeground, listInActiveSelectionBAckground, listFocusForeground, listFocusBAckground, listHoverForeground, listHoverBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { WORKBENCH_BACKGROUND } from 'vs/workbench/common/theme';

export interfAce IExtensionsViewStAte {
	onFocus: Event<IExtension>;
	onBlur: Event<IExtension>;
}

export interfAce ITemplAteDAtA {
	root: HTMLElement;
	element: HTMLElement;
	icon: HTMLImAgeElement;
	nAme: HTMLElement;
	instAllCount: HTMLElement;
	rAtings: HTMLElement;
	Author: HTMLElement;
	description: HTMLElement;
	extension: IExtension | null;
	disposAbles: IDisposAble[];
	extensionDisposAbles: IDisposAble[];
	ActionbAr: ActionBAr;
}

export clAss DelegAte implements IListVirtuAlDelegAte<IExtension> {
	getHeight() { return 62; }
	getTemplAteId() { return 'extension'; }
}

const ActionOptions = { icon: true, lAbel: true, tAbOnlyOnFocus: true };

export clAss Renderer implements IPAgedRenderer<IExtension, ITemplAteDAtA> {

	constructor(
		privAte extensionViewStAte: IExtensionsViewStAte,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IExtensionMAnAgementServerService privAte reAdonly extensionMAnAgementServerService: IExtensionMAnAgementServerService,
		@IExtensionsWorkbenchService privAte reAdonly extensionsWorkbenchService: IExtensionsWorkbenchService,
	) { }

	get templAteId() { return 'extension'; }

	renderTemplAte(root: HTMLElement): ITemplAteDAtA {
		const recommendAtionWidget = this.instAntiAtionService.creAteInstAnce(RecommendAtionWidget, Append(root, $('.extension-bookmArk-contAiner')));
		const element = Append(root, $('.extension-list-item'));
		const iconContAiner = Append(element, $('.icon-contAiner'));
		const icon = Append(iconContAiner, $<HTMLImAgeElement>('img.icon'));
		const iconRemoteBAdgeWidget = this.instAntiAtionService.creAteInstAnce(RemoteBAdgeWidget, iconContAiner, fAlse);
		const extensionPAckBAdgeWidget = this.instAntiAtionService.creAteInstAnce(ExtensionPAckBAdgeWidget, iconContAiner);
		const detAils = Append(element, $('.detAils'));
		const heAderContAiner = Append(detAils, $('.heAder-contAiner'));
		const heAder = Append(heAderContAiner, $('.heAder'));
		const nAme = Append(heAder, $('spAn.nAme'));
		const version = Append(heAder, $('spAn.version'));
		const instAllCount = Append(heAder, $('spAn.instAll-count'));
		const rAtings = Append(heAder, $('spAn.rAtings'));
		const heAderRemoteBAdgeWidget = this.instAntiAtionService.creAteInstAnce(RemoteBAdgeWidget, heAder, fAlse);
		const description = Append(detAils, $('.description.ellipsis'));
		const footer = Append(detAils, $('.footer'));
		const Author = Append(footer, $('.Author.ellipsis'));
		const ActionbAr = new ActionBAr(footer, {
			AnimAted: fAlse,
			ActionViewItemProvider: (Action: IAction) => {
				if (Action.id === MAnAgeExtensionAction.ID) {
					return (<MAnAgeExtensionAction>Action).creAteActionViewItem();
				}
				return new ExtensionActionViewItem(null, Action, ActionOptions);
			}
		});
		ActionbAr.onDidRun(({ error }) => error && this.notificAtionService.error(error));

		const systemDisAbledWArningAction = this.instAntiAtionService.creAteInstAnce(SystemDisAbledWArningAction);
		const reloAdAction = this.instAntiAtionService.creAteInstAnce(ReloAdAction);
		const Actions = [
			this.instAntiAtionService.creAteInstAnce(StAtusLAbelAction),
			this.instAntiAtionService.creAteInstAnce(SyncIgnoredIconAction),
			this.instAntiAtionService.creAteInstAnce(UpdAteAction),
			reloAdAction,
			this.instAntiAtionService.creAteInstAnce(InstAllAction),
			this.instAntiAtionService.creAteInstAnce(RemoteInstAllAction, fAlse),
			this.instAntiAtionService.creAteInstAnce(LocAlInstAllAction),
			this.instAntiAtionService.creAteInstAnce(MAliciousStAtusLAbelAction, fAlse),
			systemDisAbledWArningAction,
			this.instAntiAtionService.creAteInstAnce(MAnAgeExtensionAction)
		];
		const extensionTooltipAction = this.instAntiAtionService.creAteInstAnce(ExtensionToolTipAction, systemDisAbledWArningAction, reloAdAction);
		const tooltipWidget = this.instAntiAtionService.creAteInstAnce(TooltipWidget, root, extensionTooltipAction, recommendAtionWidget);
		const widgets = [
			recommendAtionWidget,
			iconRemoteBAdgeWidget,
			extensionPAckBAdgeWidget,
			heAderRemoteBAdgeWidget,
			tooltipWidget,
			this.instAntiAtionService.creAteInstAnce(LAbel, version, (e: IExtension) => e.version),
			this.instAntiAtionService.creAteInstAnce(InstAllCountWidget, instAllCount, true),
			this.instAntiAtionService.creAteInstAnce(RAtingsWidget, rAtings, true)
		];
		const extensionContAiners: ExtensionContAiners = this.instAntiAtionService.creAteInstAnce(ExtensionContAiners, [...Actions, ...widgets, extensionTooltipAction]);

		ActionbAr.push(Actions, ActionOptions);
		const disposAble = combinedDisposAble(...Actions, ...widgets, ActionbAr, extensionContAiners, extensionTooltipAction);

		return {
			root, element, icon, nAme, instAllCount, rAtings, Author, description, disposAbles: [disposAble], ActionbAr,
			extensionDisposAbles: [],
			set extension(extension: IExtension) {
				extensionContAiners.extension = extension;
			}
		};
	}

	renderPlAceholder(index: number, dAtA: ITemplAteDAtA): void {
		dAtA.element.clAssList.Add('loAding');

		dAtA.root.removeAttribute('AriA-lAbel');
		dAtA.root.removeAttribute('dAtA-extension-id');
		dAtA.extensionDisposAbles = dispose(dAtA.extensionDisposAbles);
		dAtA.icon.src = '';
		dAtA.nAme.textContent = '';
		dAtA.Author.textContent = '';
		dAtA.description.textContent = '';
		dAtA.instAllCount.style.displAy = 'none';
		dAtA.rAtings.style.displAy = 'none';
		dAtA.extension = null;
	}

	renderElement(extension: IExtension, index: number, dAtA: ITemplAteDAtA): void {
		dAtA.element.clAssList.remove('loAding');
		dAtA.root.setAttribute('dAtA-extension-id', extension.identifier.id);

		if (extension.stAte !== ExtensionStAte.UninstAlled && !extension.server) {
			// Get the extension if it is instAlled And hAs no server informAtion
			extension = this.extensionsWorkbenchService.locAl.filter(e => e.server === extension.server && AreSAmeExtensions(e.identifier, extension.identifier))[0] || extension;
		}

		dAtA.extensionDisposAbles = dispose(dAtA.extensionDisposAbles);

		let isDisAbled: booleAn = fAlse;
		const updAteEnAblement = Async () => {
			const runningExtensions = AwAit this.extensionService.getExtensions();
			isDisAbled = fAlse;
			if (extension.locAl && !isLAnguAgePAckExtension(extension.locAl.mAnifest)) {
				const runningExtension = runningExtensions.filter(e => AreSAmeExtensions({ id: e.identifier.vAlue, uuid: e.uuid }, extension.identifier))[0];
				isDisAbled = !(runningExtension && extension.server === this.extensionMAnAgementServerService.getExtensionMAnAgementServer(toExtension(runningExtension)));
			}
			dAtA.root.clAssList.toggle('disAbled', isDisAbled);
		};
		updAteEnAblement();
		this.extensionService.onDidChAngeExtensions(() => updAteEnAblement(), this, dAtA.extensionDisposAbles);

		const onError = Event.once(domEvent(dAtA.icon, 'error'));
		onError(() => dAtA.icon.src = extension.iconUrlFAllbAck, null, dAtA.extensionDisposAbles);
		dAtA.icon.src = extension.iconUrl;

		if (!dAtA.icon.complete) {
			dAtA.icon.style.visibility = 'hidden';
			dAtA.icon.onloAd = () => dAtA.icon.style.visibility = 'inherit';
		} else {
			dAtA.icon.style.visibility = 'inherit';
		}

		dAtA.nAme.textContent = extension.displAyNAme;
		dAtA.Author.textContent = extension.publisherDisplAyNAme;
		dAtA.description.textContent = extension.description;
		dAtA.instAllCount.style.displAy = '';
		dAtA.rAtings.style.displAy = '';
		dAtA.extension = extension;

		if (extension.gAllery && extension.gAllery.properties && extension.gAllery.properties.locAlizedLAnguAges && extension.gAllery.properties.locAlizedLAnguAges.length) {
			dAtA.description.textContent = extension.gAllery.properties.locAlizedLAnguAges.mAp(nAme => nAme[0].toLocAleUpperCAse() + nAme.slice(1)).join(', ');
		}

		this.extensionViewStAte.onFocus(e => {
			if (AreSAmeExtensions(extension.identifier, e.identifier)) {
				dAtA.ActionbAr.viewItems.forEAch(item => (<ExtensionActionViewItem>item).setFocus(true));
			}
		}, this, dAtA.extensionDisposAbles);

		this.extensionViewStAte.onBlur(e => {
			if (AreSAmeExtensions(extension.identifier, e.identifier)) {
				dAtA.ActionbAr.viewItems.forEAch(item => (<ExtensionActionViewItem>item).setFocus(fAlse));
			}
		}, this, dAtA.extensionDisposAbles);

	}

	disposeTemplAte(dAtA: ITemplAteDAtA): void {
		dAtA.disposAbles = dispose(dAtA.disposAbles);
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		const AuthorForeground = foregroundColor.trAnspArent(.9).mAkeOpAque(WORKBENCH_BACKGROUND(theme));
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row:not(.disAbled) .Author { color: ${AuthorForeground}; }`);
		const disAbledExtensionForeground = foregroundColor.trAnspArent(.5).mAkeOpAque(WORKBENCH_BACKGROUND(theme));
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row.disAbled { color: ${disAbledExtensionForeground}; }`);
	}

	const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
	if (listActiveSelectionForegroundColor) {
		const bAckgroundColor = theme.getColor(listActiveSelectionBAckground) || WORKBENCH_BACKGROUND(theme);
		const AuthorForeground = listActiveSelectionForegroundColor.trAnspArent(.9).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row:not(.disAbled).focused.selected .Author { color: ${AuthorForeground}; }`);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row:not(.disAbled).selected .Author { color: ${AuthorForeground}; }`);
		const disAbledExtensionForeground = listActiveSelectionForegroundColor.trAnspArent(.5).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row.disAbled.focused.selected { color: ${disAbledExtensionForeground}; }`);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row.disAbled.selected { color: ${disAbledExtensionForeground}; }`);
	}

	const listInActiveSelectionForegroundColor = theme.getColor(listInActiveSelectionForeground);
	if (listInActiveSelectionForegroundColor) {
		const bAckgroundColor = theme.getColor(listInActiveSelectionBAckground) || WORKBENCH_BACKGROUND(theme);
		const AuthorForeground = listInActiveSelectionForegroundColor.trAnspArent(.9).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row:not(.disAbled).selected .Author { color: ${AuthorForeground}; }`);
		const disAbledExtensionForeground = listInActiveSelectionForegroundColor.trAnspArent(.5).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row.disAbled.selected { color: ${disAbledExtensionForeground}; }`);
	}

	const listFocusForegroundColor = theme.getColor(listFocusForeground);
	if (listFocusForegroundColor) {
		const bAckgroundColor = theme.getColor(listFocusBAckground) || WORKBENCH_BACKGROUND(theme);
		const AuthorForeground = listFocusForegroundColor.trAnspArent(.9).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row:not(.disAbled).focused .Author { color: ${AuthorForeground}; }`);
		const disAbledExtensionForeground = listFocusForegroundColor.trAnspArent(.5).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list:focus .monAco-list-row.disAbled.focused { color: ${disAbledExtensionForeground}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	if (listHoverForegroundColor) {
		const bAckgroundColor = theme.getColor(listHoverBAckground) || WORKBENCH_BACKGROUND(theme);
		const AuthorForeground = listHoverForegroundColor.trAnspArent(.9).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row:hover:not(.disAbled):not(.selected):.not(.focused) .Author { color: ${AuthorForeground}; }`);
		const disAbledExtensionForeground = listHoverForegroundColor.trAnspArent(.5).mAkeOpAque(bAckgroundColor);
		collector.AddRule(`.extensions-list .monAco-list .monAco-list-row.disAbled:hover:not(.selected):.not(.focused) { color: ${disAbledExtensionForeground}; }`);
	}
});

