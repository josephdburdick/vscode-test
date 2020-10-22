/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/extension';
import { append, $ } from 'vs/Base/Browser/dom';
import { IDisposaBle, dispose, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { IAction } from 'vs/Base/common/actions';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IPagedRenderer } from 'vs/Base/Browser/ui/list/listPaging';
import { Event } from 'vs/Base/common/event';
import { domEvent } from 'vs/Base/Browser/event';
import { IExtension, ExtensionContainers, ExtensionState, IExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/common/extensions';
import { InstallAction, UpdateAction, ManageExtensionAction, ReloadAction, MaliciousStatusLaBelAction, ExtensionActionViewItem, StatusLaBelAction, RemoteInstallAction, SystemDisaBledWarningAction, ExtensionToolTipAction, LocalInstallAction, SyncIgnoredIconAction } from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { LaBel, RatingsWidget, InstallCountWidget, RecommendationWidget, RemoteBadgeWidget, TooltipWidget, ExtensionPackCountWidget as ExtensionPackBadgeWidget } from 'vs/workBench/contriB/extensions/Browser/extensionsWidgets';
import { IExtensionService, toExtension } from 'vs/workBench/services/extensions/common/extensions';
import { IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { isLanguagePackExtension } from 'vs/platform/extensions/common/extensions';
import { registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { foreground, listActiveSelectionForeground, listActiveSelectionBackground, listInactiveSelectionForeground, listInactiveSelectionBackground, listFocusForeground, listFocusBackground, listHoverForeground, listHoverBackground } from 'vs/platform/theme/common/colorRegistry';
import { WORKBENCH_BACKGROUND } from 'vs/workBench/common/theme';

export interface IExtensionsViewState {
	onFocus: Event<IExtension>;
	onBlur: Event<IExtension>;
}

export interface ITemplateData {
	root: HTMLElement;
	element: HTMLElement;
	icon: HTMLImageElement;
	name: HTMLElement;
	installCount: HTMLElement;
	ratings: HTMLElement;
	author: HTMLElement;
	description: HTMLElement;
	extension: IExtension | null;
	disposaBles: IDisposaBle[];
	extensionDisposaBles: IDisposaBle[];
	actionBar: ActionBar;
}

export class Delegate implements IListVirtualDelegate<IExtension> {
	getHeight() { return 62; }
	getTemplateId() { return 'extension'; }
}

const actionOptions = { icon: true, laBel: true, taBOnlyOnFocus: true };

export class Renderer implements IPagedRenderer<IExtension, ITemplateData> {

	constructor(
		private extensionViewState: IExtensionsViewState,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
	) { }

	get templateId() { return 'extension'; }

	renderTemplate(root: HTMLElement): ITemplateData {
		const recommendationWidget = this.instantiationService.createInstance(RecommendationWidget, append(root, $('.extension-Bookmark-container')));
		const element = append(root, $('.extension-list-item'));
		const iconContainer = append(element, $('.icon-container'));
		const icon = append(iconContainer, $<HTMLImageElement>('img.icon'));
		const iconRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, false);
		const extensionPackBadgeWidget = this.instantiationService.createInstance(ExtensionPackBadgeWidget, iconContainer);
		const details = append(element, $('.details'));
		const headerContainer = append(details, $('.header-container'));
		const header = append(headerContainer, $('.header'));
		const name = append(header, $('span.name'));
		const version = append(header, $('span.version'));
		const installCount = append(header, $('span.install-count'));
		const ratings = append(header, $('span.ratings'));
		const headerRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, header, false);
		const description = append(details, $('.description.ellipsis'));
		const footer = append(details, $('.footer'));
		const author = append(footer, $('.author.ellipsis'));
		const actionBar = new ActionBar(footer, {
			animated: false,
			actionViewItemProvider: (action: IAction) => {
				if (action.id === ManageExtensionAction.ID) {
					return (<ManageExtensionAction>action).createActionViewItem();
				}
				return new ExtensionActionViewItem(null, action, actionOptions);
			}
		});
		actionBar.onDidRun(({ error }) => error && this.notificationService.error(error));

		const systemDisaBledWarningAction = this.instantiationService.createInstance(SystemDisaBledWarningAction);
		const reloadAction = this.instantiationService.createInstance(ReloadAction);
		const actions = [
			this.instantiationService.createInstance(StatusLaBelAction),
			this.instantiationService.createInstance(SyncIgnoredIconAction),
			this.instantiationService.createInstance(UpdateAction),
			reloadAction,
			this.instantiationService.createInstance(InstallAction),
			this.instantiationService.createInstance(RemoteInstallAction, false),
			this.instantiationService.createInstance(LocalInstallAction),
			this.instantiationService.createInstance(MaliciousStatusLaBelAction, false),
			systemDisaBledWarningAction,
			this.instantiationService.createInstance(ManageExtensionAction)
		];
		const extensionTooltipAction = this.instantiationService.createInstance(ExtensionToolTipAction, systemDisaBledWarningAction, reloadAction);
		const tooltipWidget = this.instantiationService.createInstance(TooltipWidget, root, extensionTooltipAction, recommendationWidget);
		const widgets = [
			recommendationWidget,
			iconRemoteBadgeWidget,
			extensionPackBadgeWidget,
			headerRemoteBadgeWidget,
			tooltipWidget,
			this.instantiationService.createInstance(LaBel, version, (e: IExtension) => e.version),
			this.instantiationService.createInstance(InstallCountWidget, installCount, true),
			this.instantiationService.createInstance(RatingsWidget, ratings, true)
		];
		const extensionContainers: ExtensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets, extensionTooltipAction]);

		actionBar.push(actions, actionOptions);
		const disposaBle = comBinedDisposaBle(...actions, ...widgets, actionBar, extensionContainers, extensionTooltipAction);

		return {
			root, element, icon, name, installCount, ratings, author, description, disposaBles: [disposaBle], actionBar,
			extensionDisposaBles: [],
			set extension(extension: IExtension) {
				extensionContainers.extension = extension;
			}
		};
	}

	renderPlaceholder(index: numBer, data: ITemplateData): void {
		data.element.classList.add('loading');

		data.root.removeAttriBute('aria-laBel');
		data.root.removeAttriBute('data-extension-id');
		data.extensionDisposaBles = dispose(data.extensionDisposaBles);
		data.icon.src = '';
		data.name.textContent = '';
		data.author.textContent = '';
		data.description.textContent = '';
		data.installCount.style.display = 'none';
		data.ratings.style.display = 'none';
		data.extension = null;
	}

	renderElement(extension: IExtension, index: numBer, data: ITemplateData): void {
		data.element.classList.remove('loading');
		data.root.setAttriBute('data-extension-id', extension.identifier.id);

		if (extension.state !== ExtensionState.Uninstalled && !extension.server) {
			// Get the extension if it is installed and has no server information
			extension = this.extensionsWorkBenchService.local.filter(e => e.server === extension.server && areSameExtensions(e.identifier, extension.identifier))[0] || extension;
		}

		data.extensionDisposaBles = dispose(data.extensionDisposaBles);

		let isDisaBled: Boolean = false;
		const updateEnaBlement = async () => {
			const runningExtensions = await this.extensionService.getExtensions();
			isDisaBled = false;
			if (extension.local && !isLanguagePackExtension(extension.local.manifest)) {
				const runningExtension = runningExtensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, extension.identifier))[0];
				isDisaBled = !(runningExtension && extension.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension)));
			}
			data.root.classList.toggle('disaBled', isDisaBled);
		};
		updateEnaBlement();
		this.extensionService.onDidChangeExtensions(() => updateEnaBlement(), this, data.extensionDisposaBles);

		const onError = Event.once(domEvent(data.icon, 'error'));
		onError(() => data.icon.src = extension.iconUrlFallBack, null, data.extensionDisposaBles);
		data.icon.src = extension.iconUrl;

		if (!data.icon.complete) {
			data.icon.style.visiBility = 'hidden';
			data.icon.onload = () => data.icon.style.visiBility = 'inherit';
		} else {
			data.icon.style.visiBility = 'inherit';
		}

		data.name.textContent = extension.displayName;
		data.author.textContent = extension.puBlisherDisplayName;
		data.description.textContent = extension.description;
		data.installCount.style.display = '';
		data.ratings.style.display = '';
		data.extension = extension;

		if (extension.gallery && extension.gallery.properties && extension.gallery.properties.localizedLanguages && extension.gallery.properties.localizedLanguages.length) {
			data.description.textContent = extension.gallery.properties.localizedLanguages.map(name => name[0].toLocaleUpperCase() + name.slice(1)).join(', ');
		}

		this.extensionViewState.onFocus(e => {
			if (areSameExtensions(extension.identifier, e.identifier)) {
				data.actionBar.viewItems.forEach(item => (<ExtensionActionViewItem>item).setFocus(true));
			}
		}, this, data.extensionDisposaBles);

		this.extensionViewState.onBlur(e => {
			if (areSameExtensions(extension.identifier, e.identifier)) {
				data.actionBar.viewItems.forEach(item => (<ExtensionActionViewItem>item).setFocus(false));
			}
		}, this, data.extensionDisposaBles);

	}

	disposeTemplate(data: ITemplateData): void {
		data.disposaBles = dispose(data.disposaBles);
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const foregroundColor = theme.getColor(foreground);
	if (foregroundColor) {
		const authorForeground = foregroundColor.transparent(.9).makeOpaque(WORKBENCH_BACKGROUND(theme));
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row:not(.disaBled) .author { color: ${authorForeground}; }`);
		const disaBledExtensionForeground = foregroundColor.transparent(.5).makeOpaque(WORKBENCH_BACKGROUND(theme));
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disaBled { color: ${disaBledExtensionForeground}; }`);
	}

	const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
	if (listActiveSelectionForegroundColor) {
		const BackgroundColor = theme.getColor(listActiveSelectionBackground) || WORKBENCH_BACKGROUND(theme);
		const authorForeground = listActiveSelectionForegroundColor.transparent(.9).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row:not(.disaBled).focused.selected .author { color: ${authorForeground}; }`);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row:not(.disaBled).selected .author { color: ${authorForeground}; }`);
		const disaBledExtensionForeground = listActiveSelectionForegroundColor.transparent(.5).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row.disaBled.focused.selected { color: ${disaBledExtensionForeground}; }`);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row.disaBled.selected { color: ${disaBledExtensionForeground}; }`);
	}

	const listInactiveSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
	if (listInactiveSelectionForegroundColor) {
		const BackgroundColor = theme.getColor(listInactiveSelectionBackground) || WORKBENCH_BACKGROUND(theme);
		const authorForeground = listInactiveSelectionForegroundColor.transparent(.9).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row:not(.disaBled).selected .author { color: ${authorForeground}; }`);
		const disaBledExtensionForeground = listInactiveSelectionForegroundColor.transparent(.5).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disaBled.selected { color: ${disaBledExtensionForeground}; }`);
	}

	const listFocusForegroundColor = theme.getColor(listFocusForeground);
	if (listFocusForegroundColor) {
		const BackgroundColor = theme.getColor(listFocusBackground) || WORKBENCH_BACKGROUND(theme);
		const authorForeground = listFocusForegroundColor.transparent(.9).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row:not(.disaBled).focused .author { color: ${authorForeground}; }`);
		const disaBledExtensionForeground = listFocusForegroundColor.transparent(.5).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list:focus .monaco-list-row.disaBled.focused { color: ${disaBledExtensionForeground}; }`);
	}

	const listHoverForegroundColor = theme.getColor(listHoverForeground);
	if (listHoverForegroundColor) {
		const BackgroundColor = theme.getColor(listHoverBackground) || WORKBENCH_BACKGROUND(theme);
		const authorForeground = listHoverForegroundColor.transparent(.9).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row:hover:not(.disaBled):not(.selected):.not(.focused) .author { color: ${authorForeground}; }`);
		const disaBledExtensionForeground = listHoverForegroundColor.transparent(.5).makeOpaque(BackgroundColor);
		collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disaBled:hover:not(.selected):.not(.focused) { color: ${disaBledExtensionForeground}; }`);
	}
});

