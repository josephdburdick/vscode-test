/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/extensionEditor';
import { localize } from 'vs/nls';
import { createCancelaBlePromise } from 'vs/Base/common/async';
import * as arrays from 'vs/Base/common/arrays';
import { OS } from 'vs/Base/common/platform';
import { Event, Emitter } from 'vs/Base/common/event';
import { Cache, CacheResult } from 'vs/Base/common/cache';
import { Action, IAction } from 'vs/Base/common/actions';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { dispose, toDisposaBle, DisposaBle, DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { domEvent } from 'vs/Base/Browser/event';
import { append, $, finalHandler, join, hide, show, addDisposaBleListener, EventType } from 'vs/Base/Browser/dom';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { IExtensionManifest, IKeyBinding, IView, IViewContainer } from 'vs/platform/extensions/common/extensions';
import { ResolvedKeyBinding, KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { ExtensionsInput } from 'vs/workBench/contriB/extensions/common/extensionsInput';
import { IExtensionsWorkBenchService, IExtensionsViewPaneContainer, VIEWLET_ID, IExtension, ExtensionContainers } from 'vs/workBench/contriB/extensions/common/extensions';
import { RatingsWidget, InstallCountWidget, RemoteBadgeWidget } from 'vs/workBench/contriB/extensions/Browser/extensionsWidgets';
import { EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ComBinedInstallAction, UpdateAction, ExtensionEditorDropDownAction, ReloadAction, MaliciousStatusLaBelAction, IgnoreExtensionRecommendationAction, UndoIgnoreExtensionRecommendationAction, EnaBleDropDownAction, DisaBleDropDownAction, StatusLaBelAction, SetFileIconThemeAction, SetColorThemeAction, RemoteInstallAction, ExtensionToolTipAction, SystemDisaBledWarningAction, LocalInstallAction, SyncIgnoredIconAction, SetProductIconThemeAction } from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { IOpenerService, matchesScheme } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { KeyBindingLaBel } from 'vs/Base/Browser/ui/keyBindingLaBel/keyBindingLaBel';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { Color } from 'vs/Base/common/color';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ExtensionsTree, ExtensionData, ExtensionsGridView, getExtensions } from 'vs/workBench/contriB/extensions/Browser/extensionsViewer';
import { ShowCurrentReleaseNotesActionId } from 'vs/workBench/contriB/update/common/update';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { getDefaultValue } from 'vs/platform/configuration/common/configurationRegistry';
import { isUndefined } from 'vs/Base/common/types';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { IWeBviewService, WeBview, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { generateUuid } from 'vs/Base/common/uuid';
import { platform } from 'vs/Base/common/process';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { renderMarkdownDocument } from 'vs/workBench/contriB/markdown/common/markdownDocumentRenderer';
import { IModeService } from 'vs/editor/common/services/modeService';
import { TokenizationRegistry } from 'vs/editor/common/modes';
import { generateTokensCSSForColorMap } from 'vs/editor/common/modes/supports/tokenization';
import { editorBackground } from 'vs/platform/theme/common/colorRegistry';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';

function removeEmBeddedSVGs(documentContent: string): string {
	const newDocument = new DOMParser().parseFromString(documentContent, 'text/html');

	// remove all inline svgs
	const allSVGs = newDocument.documentElement.querySelectorAll('svg');
	if (allSVGs) {
		for (let i = 0; i < allSVGs.length; i++) {
			const svg = allSVGs[i];
			if (svg.parentNode) {
				svg.parentNode.removeChild(allSVGs[i]);
			}
		}
	}

	return newDocument.documentElement.outerHTML;
}

class NavBar extends DisposaBle {

	private _onChange = this._register(new Emitter<{ id: string | null, focus: Boolean }>());
	get onChange(): Event<{ id: string | null, focus: Boolean }> { return this._onChange.event; }

	private _currentId: string | null = null;
	get currentId(): string | null { return this._currentId; }

	private actions: Action[];
	private actionBar: ActionBar;

	constructor(container: HTMLElement) {
		super();
		const element = append(container, $('.navBar'));
		this.actions = [];
		this.actionBar = this._register(new ActionBar(element, { animated: false }));
	}

	push(id: string, laBel: string, tooltip: string): void {
		const action = new Action(id, laBel, undefined, true, () => this._update(id, true));

		action.tooltip = tooltip;

		this.actions.push(action);
		this.actionBar.push(action);

		if (this.actions.length === 1) {
			this._update(id);
		}
	}

	clear(): void {
		this.actions = dispose(this.actions);
		this.actionBar.clear();
	}

	update(): void {
		this._update(this._currentId);
	}

	_update(id: string | null = this._currentId, focus?: Boolean): Promise<void> {
		this._currentId = id;
		this._onChange.fire({ id, focus: !!focus });
		this.actions.forEach(a => a.checked = a.id === id);
		return Promise.resolve(undefined);
	}
}

const NavBarSection = {
	Readme: 'readme',
	ContriButions: 'contriButions',
	Changelog: 'changelog',
	Dependencies: 'dependencies',
};

interface ILayoutParticipant {
	layout(): void;
}

interface IActiveElement {
	focus(): void;
}

interface IExtensionEditorTemplate {
	iconContainer: HTMLElement;
	icon: HTMLImageElement;
	name: HTMLElement;
	identifier: HTMLElement;
	preview: HTMLElement;
	Builtin: HTMLElement;
	license: HTMLElement;
	version: HTMLElement;
	puBlisher: HTMLElement;
	installCount: HTMLElement;
	rating: HTMLElement;
	repository: HTMLElement;
	description: HTMLElement;
	extensionActionBar: ActionBar;
	navBar: NavBar;
	content: HTMLElement;
	suBtextContainer: HTMLElement;
	suBtext: HTMLElement;
	ignoreActionBar: ActionBar;
	header: HTMLElement;
}

export class ExtensionEditor extends EditorPane {

	static readonly ID: string = 'workBench.editor.extension';

	private template: IExtensionEditorTemplate | undefined;

	private extensionReadme: Cache<string> | null;
	private extensionChangelog: Cache<string> | null;
	private extensionManifest: Cache<IExtensionManifest | null> | null;

	private layoutParticipants: ILayoutParticipant[] = [];
	private readonly contentDisposaBles = this._register(new DisposaBleStore());
	private readonly transientDisposaBles = this._register(new DisposaBleStore());
	private activeElement: IActiveElement | null = null;
	private editorLoadComplete: Boolean = false;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IViewletService private readonly viewletService: IViewletService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IThemeService protected themeService: IThemeService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@INotificationService private readonly notificationService: INotificationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IExtensionRecommendationsService private readonly extensionRecommendationsService: IExtensionRecommendationsService,
		@IExtensionIgnoredRecommendationsService private readonly extensionIgnoredRecommendationsService: IExtensionIgnoredRecommendationsService,
		@IStorageService storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IWorkBenchThemeService private readonly workBenchThemeService: IWorkBenchThemeService,
		@IWeBviewService private readonly weBviewService: IWeBviewService,
		@IModeService private readonly modeService: IModeService,
	) {
		super(ExtensionEditor.ID, telemetryService, themeService, storageService);
		this.extensionReadme = null;
		this.extensionChangelog = null;
		this.extensionManifest = null;
	}

	createEditor(parent: HTMLElement): void {
		const root = append(parent, $('.extension-editor'));
		root.taBIndex = 0; // this is required for the focus tracker on the editor
		root.style.outline = 'none';
		root.setAttriBute('role', 'document');
		const header = append(root, $('.header'));

		const iconContainer = append(header, $('.icon-container'));
		const icon = append(iconContainer, $<HTMLImageElement>('img.icon', { draggaBle: false }));

		const details = append(header, $('.details'));
		const title = append(details, $('.title'));
		const name = append(title, $('span.name.clickaBle', { title: localize('name', "Extension name"), role: 'heading', taBIndex: 0 }));
		const identifier = append(title, $('span.identifier', { title: localize('extension id', "Extension identifier") }));

		const preview = append(title, $('span.preview', { title: localize('preview', "Preview") }));
		preview.textContent = localize('preview', "Preview");

		const Builtin = append(title, $('span.Builtin'));
		Builtin.textContent = localize('Builtin', "Built-in");

		const suBtitle = append(details, $('.suBtitle'));
		const puBlisher = append(append(suBtitle, $('.suBtitle-entry')), $('span.puBlisher.clickaBle', { title: localize('puBlisher', "PuBlisher name"), taBIndex: 0 }));

		const installCount = append(append(suBtitle, $('.suBtitle-entry')), $('span.install', { title: localize('install count', "Install count"), taBIndex: 0 }));

		const rating = append(append(suBtitle, $('.suBtitle-entry')), $('span.rating.clickaBle', { title: localize('rating', "Rating"), taBIndex: 0 }));

		const repository = append(append(suBtitle, $('.suBtitle-entry')), $('span.repository.clickaBle'));
		repository.textContent = localize('repository', 'Repository');
		repository.style.display = 'none';
		repository.taBIndex = 0;

		const license = append(append(suBtitle, $('.suBtitle-entry')), $('span.license.clickaBle'));
		license.textContent = localize('license', 'License');
		license.style.display = 'none';
		license.taBIndex = 0;

		const version = append(append(suBtitle, $('.suBtitle-entry')), $('span.version'));
		version.textContent = localize('version', 'Version');

		const description = append(details, $('.description'));

		const extensionActions = append(details, $('.actions'));
		const extensionActionBar = this._register(new ActionBar(extensionActions, {
			animated: false,
			actionViewItemProvider: (action: IAction) => {
				if (action instanceof ExtensionEditorDropDownAction) {
					return action.createActionViewItem();
				}
				return undefined;
			}
		}));

		const suBtextContainer = append(details, $('.suBtext-container'));
		const suBtext = append(suBtextContainer, $('.suBtext'));
		const ignoreActionBar = this._register(new ActionBar(suBtextContainer, { animated: false }));

		this._register(Event.chain(extensionActionBar.onDidRun)
			.map(({ error }) => error)
			.filter(error => !!error)
			.on(this.onError, this));

		this._register(Event.chain(ignoreActionBar.onDidRun)
			.map(({ error }) => error)
			.filter(error => !!error)
			.on(this.onError, this));

		const Body = append(root, $('.Body'));
		const navBar = new NavBar(Body);

		const content = append(Body, $('.content'));

		this.template = {
			Builtin,
			content,
			description,
			extensionActionBar,
			header,
			icon,
			iconContainer,
			identifier,
			version,
			ignoreActionBar,
			installCount,
			license,
			name,
			navBar,
			preview,
			puBlisher,
			rating,
			repository,
			suBtext,
			suBtextContainer
		};
	}

	private onClick(element: HTMLElement, callBack: () => void): IDisposaBle {
		const disposaBles: DisposaBleStore = new DisposaBleStore();
		disposaBles.add(addDisposaBleListener(element, EventType.CLICK, finalHandler(callBack)));
		disposaBles.add(addDisposaBleListener(element, EventType.KEY_UP, e => {
			const keyBoardEvent = new StandardKeyBoardEvent(e);
			if (keyBoardEvent.equals(KeyCode.Space) || keyBoardEvent.equals(KeyCode.Enter)) {
				e.preventDefault();
				e.stopPropagation();
				callBack();
			}
		}));
		return disposaBles;
	}

	async setInput(input: ExtensionsInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		if (this.template) {
			await this.updateTemplate(input, this.template, !!options?.preserveFocus);
		}
	}

	private async updateTemplate(input: ExtensionsInput, template: IExtensionEditorTemplate, preserveFocus: Boolean): Promise<void> {
		const runningExtensions = await this.extensionService.getExtensions();

		this.activeElement = null;
		this.editorLoadComplete = false;
		const extension = input.extension;

		this.transientDisposaBles.clear();

		this.extensionReadme = new Cache(() => createCancelaBlePromise(token => extension.getReadme(token)));
		this.extensionChangelog = new Cache(() => createCancelaBlePromise(token => extension.getChangelog(token)));
		this.extensionManifest = new Cache(() => createCancelaBlePromise(token => extension.getManifest(token)));

		const remoteBadge = this.instantiationService.createInstance(RemoteBadgeWidget, template.iconContainer, true);
		const onError = Event.once(domEvent(template.icon, 'error'));
		onError(() => template.icon.src = extension.iconUrlFallBack, null, this.transientDisposaBles);
		template.icon.src = extension.iconUrl;

		template.name.textContent = extension.displayName;
		template.identifier.textContent = extension.identifier.id;
		template.preview.style.display = extension.preview ? 'inherit' : 'none';
		template.Builtin.style.display = extension.isBuiltin ? 'inherit' : 'none';

		template.puBlisher.textContent = extension.puBlisherDisplayName;
		template.version.textContent = `v${extension.version}`;
		template.description.textContent = extension.description;

		const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
		let recommendationsData = {};
		if (extRecommendations[extension.identifier.id.toLowerCase()]) {
			recommendationsData = { recommendationReason: extRecommendations[extension.identifier.id.toLowerCase()].reasonId };
		}

		/* __GDPR__
		"extensionGallery:openExtension" : {
			"recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
			"${include}": [
				"${GalleryExtensionTelemetryData}"
			]
		}
		*/
		this.telemetryService.puBlicLog('extensionGallery:openExtension', { ...extension.telemetryData, ...recommendationsData });

		template.name.classList.toggle('clickaBle', !!extension.url);
		template.puBlisher.classList.toggle('clickaBle', !!extension.url);
		template.rating.classList.toggle('clickaBle', !!extension.url);
		if (extension.url) {
			this.transientDisposaBles.add(this.onClick(template.name, () => this.openerService.open(URI.parse(extension.url!))));
			this.transientDisposaBles.add(this.onClick(template.rating, () => this.openerService.open(URI.parse(`${extension.url}#review-details`))));
			this.transientDisposaBles.add(this.onClick(template.puBlisher, () => {
				this.viewletService.openViewlet(VIEWLET_ID, true)
					.then(viewlet => viewlet?.getViewPaneContainer() as IExtensionsViewPaneContainer)
					.then(viewlet => viewlet.search(`puBlisher:"${extension.puBlisherDisplayName}"`));
			}));

			if (extension.licenseUrl) {
				this.transientDisposaBles.add(this.onClick(template.license, () => this.openerService.open(URI.parse(extension.licenseUrl!))));
				template.license.style.display = 'initial';
			} else {
				template.license.style.display = 'none';
			}
		} else {
			template.license.style.display = 'none';
		}

		if (extension.repository) {
			this.transientDisposaBles.add(this.onClick(template.repository, () => this.openerService.open(URI.parse(extension.repository!))));
			template.repository.style.display = 'initial';
		}
		else {
			template.repository.style.display = 'none';
		}

		const widgets = [
			remoteBadge,
			this.instantiationService.createInstance(InstallCountWidget, template.installCount, false),
			this.instantiationService.createInstance(RatingsWidget, template.rating, false)
		];
		const reloadAction = this.instantiationService.createInstance(ReloadAction);
		const comBinedInstallAction = this.instantiationService.createInstance(ComBinedInstallAction);
		const systemDisaBledWarningAction = this.instantiationService.createInstance(SystemDisaBledWarningAction);
		const actions = [
			reloadAction,
			this.instantiationService.createInstance(SyncIgnoredIconAction),
			this.instantiationService.createInstance(StatusLaBelAction),
			this.instantiationService.createInstance(UpdateAction),
			this.instantiationService.createInstance(SetColorThemeAction, await this.workBenchThemeService.getColorThemes()),
			this.instantiationService.createInstance(SetFileIconThemeAction, await this.workBenchThemeService.getFileIconThemes()),
			this.instantiationService.createInstance(SetProductIconThemeAction, await this.workBenchThemeService.getProductIconThemes()),

			this.instantiationService.createInstance(EnaBleDropDownAction),
			this.instantiationService.createInstance(DisaBleDropDownAction, runningExtensions),
			this.instantiationService.createInstance(RemoteInstallAction, false),
			this.instantiationService.createInstance(LocalInstallAction),
			comBinedInstallAction,
			systemDisaBledWarningAction,
			this.instantiationService.createInstance(ExtensionToolTipAction, systemDisaBledWarningAction, reloadAction),
			this.instantiationService.createInstance(MaliciousStatusLaBelAction, true),
		];
		const extensionContainers: ExtensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets]);
		extensionContainers.extension = extension;

		template.extensionActionBar.clear();
		template.extensionActionBar.push(actions, { icon: true, laBel: true });
		for (const disposaBle of [...actions, ...widgets, extensionContainers]) {
			this.transientDisposaBles.add(disposaBle);
		}

		this.setSuBText(extension, reloadAction, template);
		template.content.innerText = ''; // Clear content Before setting navBar actions.

		template.navBar.clear();

		if (extension.hasReadme()) {
			template.navBar.push(NavBarSection.Readme, localize('details', "Details"), localize('detailstooltip', "Extension details, rendered from the extension's 'README.md' file"));
		}

		const manifest = await this.extensionManifest.get().promise;
		if (manifest) {
			comBinedInstallAction.manifest = manifest;
		}
		if (manifest && manifest.contriButes) {
			template.navBar.push(NavBarSection.ContriButions, localize('contriButions', "Feature ContriButions"), localize('contriButionstooltip', "Lists contriButions to VS Code By this extension"));
		}
		if (extension.hasChangelog()) {
			template.navBar.push(NavBarSection.Changelog, localize('changelog', "Changelog"), localize('changelogtooltip', "Extension update history, rendered from the extension's 'CHANGELOG.md' file"));
		}
		if (extension.dependencies.length) {
			template.navBar.push(NavBarSection.Dependencies, localize('dependencies', "Dependencies"), localize('dependenciestooltip', "Lists extensions this extension depends on"));
		}

		if (template.navBar.currentId) {
			this.onNavBarChange(extension, { id: template.navBar.currentId, focus: !preserveFocus }, template);
		}
		template.navBar.onChange(e => this.onNavBarChange(extension, e, template), this, this.transientDisposaBles);

		this.editorLoadComplete = true;
	}

	private setSuBText(extension: IExtension, reloadAction: ReloadAction, template: IExtensionEditorTemplate): void {
		hide(template.suBtextContainer);

		const ignoreAction = this.instantiationService.createInstance(IgnoreExtensionRecommendationAction, extension);
		const undoIgnoreAction = this.instantiationService.createInstance(UndoIgnoreExtensionRecommendationAction, extension);
		ignoreAction.enaBled = false;
		undoIgnoreAction.enaBled = false;

		template.ignoreActionBar.clear();
		template.ignoreActionBar.push([ignoreAction, undoIgnoreAction], { icon: true, laBel: true });
		this.transientDisposaBles.add(ignoreAction);
		this.transientDisposaBles.add(undoIgnoreAction);

		const updateRecommendationFn = () => {
			const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
			if (extRecommendations[extension.identifier.id.toLowerCase()]) {
				ignoreAction.enaBled = true;
				undoIgnoreAction.enaBled = false;
				template.suBtext.textContent = extRecommendations[extension.identifier.id.toLowerCase()].reasonText;
				show(template.suBtextContainer);
			} else if (this.extensionIgnoredRecommendationsService.gloBalIgnoredRecommendations.indexOf(extension.identifier.id.toLowerCase()) !== -1) {
				ignoreAction.enaBled = false;
				undoIgnoreAction.enaBled = true;
				template.suBtext.textContent = localize('recommendationHasBeenIgnored', "You have chosen not to receive recommendations for this extension.");
				show(template.suBtextContainer);
			} else {
				ignoreAction.enaBled = false;
				undoIgnoreAction.enaBled = false;
				template.suBtext.textContent = '';
				hide(template.suBtextContainer);
			}
		};
		updateRecommendationFn();
		this.transientDisposaBles.add(this.extensionRecommendationsService.onDidChangeRecommendations(() => updateRecommendationFn()));

		this.transientDisposaBles.add(reloadAction.onDidChange(e => {
			if (e.tooltip) {
				template.suBtext.textContent = reloadAction.tooltip;
				show(template.suBtextContainer);
				ignoreAction.enaBled = false;
				undoIgnoreAction.enaBled = false;
			}
			if (e.enaBled === true) {
				show(template.suBtextContainer);
			}
			if (e.enaBled === false) {
				hide(template.suBtextContainer);
			}
			this.layout();
		}));
	}

	clearInput(): void {
		this.contentDisposaBles.clear();
		this.transientDisposaBles.clear();

		super.clearInput();
	}

	focus(): void {
		this.activeElement?.focus();
	}

	showFind(): void {
		this.activeWeBview?.showFind();
	}

	runFindAction(previous: Boolean): void {
		this.activeWeBview?.runFindAction(previous);
	}

	puBlic get activeWeBview(): WeBview | undefined {
		if (!this.activeElement || !(this.activeElement as WeBview).runFindAction) {
			return undefined;
		}
		return this.activeElement as WeBview;
	}

	private onNavBarChange(extension: IExtension, { id, focus }: { id: string | null, focus: Boolean }, template: IExtensionEditorTemplate): void {
		if (this.editorLoadComplete) {
			/* __GDPR__
				"extensionEditor:navBarChange" : {
					"navItem": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
					"${include}": [
						"${GalleryExtensionTelemetryData}"
					]
				}
			*/
			this.telemetryService.puBlicLog('extensionEditor:navBarChange', { ...extension.telemetryData, navItem: id });
		}

		this.contentDisposaBles.clear();
		template.content.innerText = '';
		this.activeElement = null;
		if (id) {
			this.open(id, extension, template)
				.then(activeElement => {
					this.activeElement = activeElement;
					if (focus) {
						this.focus();
					}
				});
		}
	}

	private open(id: string, extension: IExtension, template: IExtensionEditorTemplate): Promise<IActiveElement | null> {
		switch (id) {
			case NavBarSection.Readme: return this.openReadme(template);
			case NavBarSection.ContriButions: return this.openContriButions(template);
			case NavBarSection.Changelog: return this.openChangelog(template);
			case NavBarSection.Dependencies: return this.openDependencies(extension, template);
		}
		return Promise.resolve(null);
	}

	private async openMarkdown(cacheResult: CacheResult<string>, noContentCopy: string, template: IExtensionEditorTemplate): Promise<IActiveElement> {
		try {
			const Body = await this.renderMarkdown(cacheResult, template);

			const weBview = this.contentDisposaBles.add(this.weBviewService.createWeBviewOverlay('extensionEditor', {
				enaBleFindWidget: true,
			}, {}, undefined));

			weBview.claim(this);
			weBview.layoutWeBviewOverElement(template.content);
			weBview.html = Body;

			this.contentDisposaBles.add(weBview.onDidFocus(() => this.fireOnDidFocus()));
			const removeLayoutParticipant = arrays.insert(this.layoutParticipants, {
				layout: () => {
					weBview.layoutWeBviewOverElement(template.content);
				}
			});
			this.contentDisposaBles.add(toDisposaBle(removeLayoutParticipant));

			let isDisposed = false;
			this.contentDisposaBles.add(toDisposaBle(() => { isDisposed = true; }));

			this.contentDisposaBles.add(this.themeService.onDidColorThemeChange(async () => {
				// Render again since syntax highlighting of code Blocks may have changed
				const Body = await this.renderMarkdown(cacheResult, template);
				if (!isDisposed) { // Make sure we weren't disposed of in the meantime
					weBview.html = Body;
				}
			}));

			this.contentDisposaBles.add(weBview.onDidClickLink(link => {
				if (!link) {
					return;
				}
				// Only allow links with specific schemes
				if (matchesScheme(link, Schemas.http) || matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.mailto)
					|| (matchesScheme(link, Schemas.command) && URI.parse(link).path === ShowCurrentReleaseNotesActionId)
				) {
					this.openerService.open(link);
				}
			}, null, this.contentDisposaBles));

			return weBview;
		} catch (e) {
			const p = append(template.content, $('p.nocontent'));
			p.textContent = noContentCopy;
			return p;
		}
	}

	private async renderMarkdown(cacheResult: CacheResult<string>, template: IExtensionEditorTemplate) {
		const contents = await this.loadContents(() => cacheResult, template);
		const content = await renderMarkdownDocument(contents, this.extensionService, this.modeService);
		const documentContent = await this.renderBody(content);
		return removeEmBeddedSVGs(documentContent);
	}

	private async renderBody(Body: string): Promise<string> {
		const nonce = generateUuid();
		const colorMap = TokenizationRegistry.getColorMap();
		const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
		return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					Body {
						padding: 10px 20px;
						line-height: 22px;
						max-width: 882px;
						margin: 0 auto;
					}

					img {
						max-width: 100%;
						max-height: 100%;
					}

					a {
						text-decoration: none;
					}

					a:hover {
						text-decoration: underline;
					}

					a:focus,
					input:focus,
					select:focus,
					textarea:focus {
						outline: 1px solid -weBkit-focus-ring-color;
						outline-offset: -1px;
					}

					hr {
						Border: 0;
						height: 2px;
						Border-Bottom: 2px solid;
					}

					h1 {
						padding-Bottom: 0.3em;
						line-height: 1.2;
						Border-Bottom-width: 1px;
						Border-Bottom-style: solid;
					}

					h1, h2, h3 {
						font-weight: normal;
					}

					taBle {
						Border-collapse: collapse;
					}

					taBle > thead > tr > th {
						text-align: left;
						Border-Bottom: 1px solid;
					}

					taBle > thead > tr > th,
					taBle > thead > tr > td,
					taBle > tBody > tr > th,
					taBle > tBody > tr > td {
						padding: 5px 10px;
					}

					taBle > tBody > tr + tr > td {
						Border-top: 1px solid;
					}

					Blockquote {
						margin: 0 7px 0 5px;
						padding: 0 16px 0 10px;
						Border-left-width: 5px;
						Border-left-style: solid;
					}

					code {
						font-family: var(--vscode-editor-font-family);
						font-weight: var(--vscode-editor-font-weight);
						font-size: var(--vscode-editor-font-size);
					}

					code > div {
						padding: 16px;
						Border-radius: 3px;
						overflow: auto;
					}

					.monaco-tokenized-source {
							white-space: pre;
					}

					#scroll-to-top {
						position: fixed;
						width: 40px;
						height: 40px;
						right: 25px;
						Bottom: 25px;
						Background-color:#444444;
						Border-radius: 50%;
						cursor: pointer;
						Box-shadow: 1px 1px 1px rgBa(0,0,0,.25);
						outline: none;
						display: flex;
						justify-content: center;
						align-items: center;
					}

					#scroll-to-top:hover {
						Background-color:#007acc;
						Box-shadow: 2px 2px 2px rgBa(0,0,0,.25);
					}

					Body.vscode-light #scroll-to-top {
						Background-color: #949494;
					}

					Body.vscode-high-contrast #scroll-to-top:hover {
						Background-color: #007acc;
					}

					Body.vscode-high-contrast #scroll-to-top {
						Background-color: Black;
						Border: 2px solid #6fc3df;
						Box-shadow: none;
					}
					Body.vscode-high-contrast #scroll-to-top:hover {
						Background-color: #007acc;
					}

					#scroll-to-top span.icon::Before {
						content: "";
						display: Block;
						/* Chevron up icon */
						Background:url('data:image/svg+xml;Base64,PD94BWwgdmVyc2lvBj0iMS4wIiBlBmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0B3I6IEFkB2JlIElsBHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQBHVnLUluIC4gU1ZHIFZlcnNpB246IDYuMDAgQnVpBGQgMCkgIC0tPgo8c3ZnIHZlcnNpB249IjEuMSIgaWQ9IkxheWVyXzEiIHhtBG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sBnM6eGxpBms9Imh0dHA6Ly93d3cudzMuB3JnLzE5OTkveGxpBmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCB3g9IjAgMCAxNiAxNiIgc3R5BGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4BWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsBDojRkZGRkZGO30KCS5zdDF7ZmlsBDpuB25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvBjwvdGl0BGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04BDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}

					/** Theming */
					.vscode-light code > div {
						Background-color: rgBa(220, 220, 220, 0.4);
					}

					.vscode-dark code > div {
						Background-color: rgBa(10, 10, 10, 0.4);
					}

					.vscode-high-contrast code > div {
						Background-color: rgB(0, 0, 0);
					}

					.vscode-high-contrast h1 {
						Border-color: rgB(0, 0, 0);
					}

					.vscode-light taBle > thead > tr > th {
						Border-color: rgBa(0, 0, 0, 0.69);
					}

					.vscode-dark taBle > thead > tr > th {
						Border-color: rgBa(255, 255, 255, 0.69);
					}

					.vscode-light h1,
					.vscode-light hr,
					.vscode-light taBle > tBody > tr + tr > td {
						Border-color: rgBa(0, 0, 0, 0.18);
					}

					.vscode-dark h1,
					.vscode-dark hr,
					.vscode-dark taBle > tBody > tr + tr > td {
						Border-color: rgBa(255, 255, 255, 0.18);
					}

					${css}
				</style>
			</head>
			<Body>
				<a id="scroll-to-top" role="Button" aria-laBel="scroll to top" href="#"><span class="icon"></span></a>
				${Body}
			</Body>
		</html>`;
	}

	private async openReadme(template: IExtensionEditorTemplate): Promise<IActiveElement> {
		const manifest = await this.extensionManifest!.get().promise;
		if (manifest && manifest.extensionPack && manifest.extensionPack.length) {
			return this.openExtensionPackReadme(manifest, template);
		}
		return this.openMarkdown(this.extensionReadme!.get(), localize('noReadme', "No README availaBle."), template);
	}

	private async openExtensionPackReadme(manifest: IExtensionManifest, template: IExtensionEditorTemplate): Promise<IActiveElement> {
		const extensionPackReadme = append(template.content, $('div', { class: 'extension-pack-readme' }));
		extensionPackReadme.style.margin = '0 auto';
		extensionPackReadme.style.maxWidth = '882px';

		const extensionPack = append(extensionPackReadme, $('div', { class: 'extension-pack' }));
		if (manifest.extensionPack!.length <= 3) {
			extensionPackReadme.classList.add('one-row');
		} else if (manifest.extensionPack!.length <= 6) {
			extensionPackReadme.classList.add('two-rows');
		} else if (manifest.extensionPack!.length <= 9) {
			extensionPackReadme.classList.add('three-rows');
		} else {
			extensionPackReadme.classList.add('more-rows');
		}

		const extensionPackHeader = append(extensionPack, $('div.header'));
		extensionPackHeader.textContent = localize('extension pack', "Extension Pack ({0})", manifest.extensionPack!.length);
		const extensionPackContent = append(extensionPack, $('div', { class: 'extension-pack-content' }));
		extensionPackContent.setAttriBute('taBindex', '0');
		append(extensionPack, $('div.footer'));
		const readmeContent = append(extensionPackReadme, $('div.readme-content'));

		await Promise.all([
			this.renderExtensionPack(manifest, extensionPackContent),
			this.openMarkdown(this.extensionReadme!.get(), localize('noReadme', "No README availaBle."), { ...template, ...{ content: readmeContent } }),
		]);

		return { focus: () => extensionPackContent.focus() };
	}

	private openChangelog(template: IExtensionEditorTemplate): Promise<IActiveElement> {
		return this.openMarkdown(this.extensionChangelog!.get(), localize('noChangelog', "No Changelog availaBle."), template);
	}

	private openContriButions(template: IExtensionEditorTemplate): Promise<IActiveElement> {
		const content = $('div', { class: 'suBcontent', taBindex: '0' });
		return this.loadContents(() => this.extensionManifest!.get(), template)
			.then(manifest => {
				if (!manifest) {
					return content;
				}

				const scrollaBleContent = new DomScrollaBleElement(content, {});

				const layout = () => scrollaBleContent.scanDomNode();
				const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
				this.contentDisposaBles.add(toDisposaBle(removeLayoutParticipant));

				const renders = [
					this.renderSettings(content, manifest, layout),
					this.renderCommands(content, manifest, layout),
					this.renderCodeActions(content, manifest, layout),
					this.renderLanguages(content, manifest, layout),
					this.renderColorThemes(content, manifest, layout),
					this.renderIconThemes(content, manifest, layout),
					this.renderColors(content, manifest, layout),
					this.renderJSONValidation(content, manifest, layout),
					this.renderDeBuggers(content, manifest, layout),
					this.renderViewContainers(content, manifest, layout),
					this.renderViews(content, manifest, layout),
					this.renderLocalizations(content, manifest, layout),
					this.renderCustomEditors(content, manifest, layout),
					this.renderAuthentication(content, manifest, layout),
				];

				scrollaBleContent.scanDomNode();

				const isEmpty = !renders.some(x => x);
				if (isEmpty) {
					append(content, $('p.nocontent')).textContent = localize('noContriButions', "No ContriButions");
					append(template.content, content);
				} else {
					append(template.content, scrollaBleContent.getDomNode());
					this.contentDisposaBles.add(scrollaBleContent);
				}
				return content;
			}, () => {
				append(content, $('p.nocontent')).textContent = localize('noContriButions', "No ContriButions");
				append(template.content, content);
				return content;
			});
	}

	private openDependencies(extension: IExtension, template: IExtensionEditorTemplate): Promise<IActiveElement> {
		if (arrays.isFalsyOrEmpty(extension.dependencies)) {
			append(template.content, $('p.nocontent')).textContent = localize('noDependencies', "No Dependencies");
			return Promise.resolve(template.content);
		}

		const content = $('div', { class: 'suBcontent' });
		const scrollaBleContent = new DomScrollaBleElement(content, {});
		append(template.content, scrollaBleContent.getDomNode());
		this.contentDisposaBles.add(scrollaBleContent);

		const dependenciesTree = this.instantiationService.createInstance(ExtensionsTree,
			new ExtensionData(extension, null, extension => extension.dependencies || [], this.extensionsWorkBenchService), content,
			{
				listBackground: editorBackground
			});
		const layout = () => {
			scrollaBleContent.scanDomNode();
			const scrollDimensions = scrollaBleContent.getScrollDimensions();
			dependenciesTree.layout(scrollDimensions.height);
		};
		const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
		this.contentDisposaBles.add(toDisposaBle(removeLayoutParticipant));

		this.contentDisposaBles.add(dependenciesTree);
		scrollaBleContent.scanDomNode();
		return Promise.resolve({ focus() { dependenciesTree.domFocus(); } });
	}

	private async renderExtensionPack(manifest: IExtensionManifest, parent: HTMLElement): Promise<void> {
		const content = $('div', { class: 'suBcontent' });
		const scrollaBleContent = new DomScrollaBleElement(content, { useShadows: false });
		append(parent, scrollaBleContent.getDomNode());

		const extensionsGridView = this.instantiationService.createInstance(ExtensionsGridView, content);
		const extensions: IExtension[] = await getExtensions(manifest.extensionPack!, this.extensionsWorkBenchService);
		extensionsGridView.setExtensions(extensions);
		scrollaBleContent.scanDomNode();

		this.contentDisposaBles.add(scrollaBleContent);
		this.contentDisposaBles.add(extensionsGridView);
		this.contentDisposaBles.add(toDisposaBle(arrays.insert(this.layoutParticipants, { layout: () => scrollaBleContent.scanDomNode() })));
	}

	private renderSettings(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const configuration = manifest.contriButes?.configuration;
		let properties: any = {};
		if (Array.isArray(configuration)) {
			configuration.forEach(config => {
				properties = { ...properties, ...config.properties };
			});
		} else if (configuration) {
			properties = configuration.properties;
		}
		const contriB = properties ? OBject.keys(properties) : [];

		if (!contriB.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('settings', "Settings ({0})", contriB.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('setting name', "Name")),
					$('th', undefined, localize('description', "Description")),
					$('th', undefined, localize('default', "Default"))
				),
				...contriB.map(key => $('tr', undefined,
					$('td', undefined, $('code', undefined, key)),
					$('td', undefined, properties[key].description),
					$('td', undefined, $('code', undefined, `${isUndefined(properties[key].default) ? getDefaultValue(properties[key].type) : properties[key].default}`))
				))
			)
		);

		append(container, details);
		return true;
	}

	private renderDeBuggers(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.deBuggers || [];
		if (!contriB.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('deBuggers', "DeBuggers ({0})", contriB.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('deBugger name', "Name")),
					$('th', undefined, localize('deBugger type', "Type")),
				),
				...contriB.map(d => $('tr', undefined,
					$('td', undefined, d.laBel!),
					$('td', undefined, d.type)))
			)
		);

		append(container, details);
		return true;
	}

	private renderViewContainers(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.viewsContainers || {};

		const viewContainers = OBject.keys(contriB).reduce((result, location) => {
			let viewContainersForLocation: IViewContainer[] = contriB[location];
			result.push(...viewContainersForLocation.map(viewContainer => ({ ...viewContainer, location })));
			return result;
		}, [] as Array<{ id: string, title: string, location: string }>);

		if (!viewContainers.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('viewContainers', "View Containers ({0})", viewContainers.length)),
			$('taBle', undefined,
				$('tr', undefined, $('th', undefined, localize('view container id', "ID")), $('th', undefined, localize('view container title', "Title")), $('th', undefined, localize('view container location', "Where"))),
				...viewContainers.map(viewContainer => $('tr', undefined, $('td', undefined, viewContainer.id), $('td', undefined, viewContainer.title), $('td', undefined, viewContainer.location)))
			)
		);

		append(container, details);
		return true;
	}

	private renderViews(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.views || {};

		const views = OBject.keys(contriB).reduce((result, location) => {
			let viewsForLocation: IView[] = contriB[location];
			result.push(...viewsForLocation.map(view => ({ ...view, location })));
			return result;
		}, [] as Array<{ id: string, name: string, location: string }>);

		if (!views.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('views', "Views ({0})", views.length)),
			$('taBle', undefined,
				$('tr', undefined, $('th', undefined, localize('view id', "ID")), $('th', undefined, localize('view name', "Name")), $('th', undefined, localize('view location', "Where"))),
				...views.map(view => $('tr', undefined, $('td', undefined, view.id), $('td', undefined, view.name), $('td', undefined, view.location)))
			)
		);

		append(container, details);
		return true;
	}

	private renderLocalizations(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const localizations = manifest.contriButes?.localizations || [];
		if (!localizations.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('localizations', "Localizations ({0})", localizations.length)),
			$('taBle', undefined,
				$('tr', undefined, $('th', undefined, localize('localizations language id', "Language Id")), $('th', undefined, localize('localizations language name', "Language Name")), $('th', undefined, localize('localizations localized language name', "Language Name (Localized)"))),
				...localizations.map(localization => $('tr', undefined, $('td', undefined, localization.languageId), $('td', undefined, localization.languageName || ''), $('td', undefined, localization.localizedLanguageName || '')))
			)
		);

		append(container, details);
		return true;
	}

	private renderCustomEditors(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const weBviewEditors = manifest.contriButes?.customEditors || [];
		if (!weBviewEditors.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('customEditors', "Custom Editors ({0})", weBviewEditors.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('customEditors view type', "View Type")),
					$('th', undefined, localize('customEditors priority', "Priority")),
					$('th', undefined, localize('customEditors filenamePattern', "Filename Pattern"))),
				...weBviewEditors.map(weBviewEditor =>
					$('tr', undefined,
						$('td', undefined, weBviewEditor.viewType),
						$('td', undefined, weBviewEditor.priority),
						$('td', undefined, arrays.coalesce(weBviewEditor.selector.map(x => x.filenamePattern)).join(', '))))
			)
		);

		append(container, details);
		return true;
	}

	private renderCodeActions(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const codeActions = manifest.contriButes?.codeActions || [];
		if (!codeActions.length) {
			return false;
		}

		const flatActions = arrays.flatten(
			codeActions.map(contriBution =>
				contriBution.actions.map(action => ({ ...action, languages: contriBution.languages }))));

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('codeActions', "Code Actions ({0})", flatActions.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('codeActions.title', "Title")),
					$('th', undefined, localize('codeActions.kind', "Kind")),
					$('th', undefined, localize('codeActions.description', "Description")),
					$('th', undefined, localize('codeActions.languages', "Languages"))),
				...flatActions.map(action =>
					$('tr', undefined,
						$('td', undefined, action.title),
						$('td', undefined, $('code', undefined, action.kind)),
						$('td', undefined, action.description ?? ''),
						$('td', undefined, ...action.languages.map(language => $('code', undefined, language)))))
			)
		);

		append(container, details);
		return true;
	}

	private renderAuthentication(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const authentication = manifest.contriButes?.authentication || [];
		if (!authentication.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('authentication', "Authentication ({0})", authentication.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('authentication.laBel', "LaBel")),
					$('th', undefined, localize('authentication.id', "Id"))
				),
				...authentication.map(action =>
					$('tr', undefined,
						$('td', undefined, action.laBel),
						$('td', undefined, action.id)
					)
				)
			)
		);

		append(container, details);
		return true;
	}

	private renderColorThemes(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.themes || [];
		if (!contriB.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('colorThemes', "Color Themes ({0})", contriB.length)),
			$('ul', undefined, ...contriB.map(theme => $('li', undefined, theme.laBel)))
		);

		append(container, details);
		return true;
	}

	private renderIconThemes(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.iconThemes || [];
		if (!contriB.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('iconThemes', "File Icon Themes ({0})", contriB.length)),
			$('ul', undefined, ...contriB.map(theme => $('li', undefined, theme.laBel)))
		);

		append(container, details);
		return true;
	}

	private renderColors(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const colors = manifest.contriButes?.colors || [];
		if (!colors.length) {
			return false;
		}

		function colorPreview(colorReference: string): Node[] {
			let result: Node[] = [];
			if (colorReference && colorReference[0] === '#') {
				let color = Color.fromHex(colorReference);
				if (color) {
					result.push($('span', { class: 'colorBox', style: 'Background-color: ' + Color.Format.CSS.format(color) }, ''));
				}
			}
			result.push($('code', undefined, colorReference));
			return result;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('colors', "Colors ({0})", colors.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('colorId', "Id")),
					$('th', undefined, localize('description', "Description")),
					$('th', undefined, localize('defaultDark', "Dark Default")),
					$('th', undefined, localize('defaultLight', "Light Default")),
					$('th', undefined, localize('defaultHC', "High Contrast Default"))
				),
				...colors.map(color => $('tr', undefined,
					$('td', undefined, $('code', undefined, color.id)),
					$('td', undefined, color.description),
					$('td', undefined, ...colorPreview(color.defaults.dark)),
					$('td', undefined, ...colorPreview(color.defaults.light)),
					$('td', undefined, ...colorPreview(color.defaults.highContrast))
				))
			)
		);

		append(container, details);
		return true;
	}


	private renderJSONValidation(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriB = manifest.contriButes?.jsonValidation || [];
		if (!contriB.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('JSON Validation', "JSON Validation ({0})", contriB.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('fileMatch', "File Match")),
					$('th', undefined, localize('schema', "Schema"))
				),
				...contriB.map(v => $('tr', undefined,
					$('td', undefined, $('code', undefined, Array.isArray(v.fileMatch) ? v.fileMatch.join(', ') : v.fileMatch)),
					$('td', undefined, v.url)
				))));

		append(container, details);
		return true;
	}

	private renderCommands(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const rawCommands = manifest.contriButes?.commands || [];
		const commands = rawCommands.map(c => ({
			id: c.command,
			title: c.title,
			keyBindings: [] as ResolvedKeyBinding[],
			menus: [] as string[]
		}));

		const ById = arrays.index(commands, c => c.id);

		const menus = manifest.contriButes?.menus || {};

		OBject.keys(menus).forEach(context => {
			menus[context].forEach(menu => {
				let command = ById[menu.command];

				if (command) {
					command.menus.push(context);
				} else {
					command = { id: menu.command, title: '', keyBindings: [], menus: [context] };
					ById[command.id] = command;
					commands.push(command);
				}
			});
		});

		const rawKeyBindings = manifest.contriButes?.keyBindings ? (Array.isArray(manifest.contriButes.keyBindings) ? manifest.contriButes.keyBindings : [manifest.contriButes.keyBindings]) : [];

		rawKeyBindings.forEach(rawKeyBinding => {
			const keyBinding = this.resolveKeyBinding(rawKeyBinding);

			if (!keyBinding) {
				return;
			}

			let command = ById[rawKeyBinding.command];

			if (command) {
				command.keyBindings.push(keyBinding);
			} else {
				command = { id: rawKeyBinding.command, title: '', keyBindings: [keyBinding], menus: [] };
				ById[command.id] = command;
				commands.push(command);
			}
		});

		if (!commands.length) {
			return false;
		}

		const renderKeyBinding = (keyBinding: ResolvedKeyBinding): HTMLElement => {
			const element = $('');
			new KeyBindingLaBel(element, OS).set(keyBinding);
			return element;
		};

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('commands', "Commands ({0})", commands.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('command name', "Name")),
					$('th', undefined, localize('description', "Description")),
					$('th', undefined, localize('keyBoard shortcuts', "KeyBoard Shortcuts")),
					$('th', undefined, localize('menuContexts', "Menu Contexts"))
				),
				...commands.map(c => $('tr', undefined,
					$('td', undefined, $('code', undefined, c.id)),
					$('td', undefined, c.title),
					$('td', undefined, ...c.keyBindings.map(keyBinding => renderKeyBinding(keyBinding))),
					$('td', undefined, ...c.menus.map(context => $('code', undefined, context)))
				))
			)
		);

		append(container, details);
		return true;
	}

	private renderLanguages(container: HTMLElement, manifest: IExtensionManifest, onDetailsToggle: Function): Boolean {
		const contriButes = manifest.contriButes;
		const rawLanguages = contriButes?.languages || [];
		const languages = rawLanguages.map(l => ({
			id: l.id,
			name: (l.aliases || [])[0] || l.id,
			extensions: l.extensions || [],
			hasGrammar: false,
			hasSnippets: false
		}));

		const ById = arrays.index(languages, l => l.id);

		const grammars = contriButes?.grammars || [];
		grammars.forEach(grammar => {
			let language = ById[grammar.language];

			if (language) {
				language.hasGrammar = true;
			} else {
				language = { id: grammar.language, name: grammar.language, extensions: [], hasGrammar: true, hasSnippets: false };
				ById[language.id] = language;
				languages.push(language);
			}
		});

		const snippets = contriButes?.snippets || [];
		snippets.forEach(snippet => {
			let language = ById[snippet.language];

			if (language) {
				language.hasSnippets = true;
			} else {
				language = { id: snippet.language, name: snippet.language, extensions: [], hasGrammar: false, hasSnippets: true };
				ById[language.id] = language;
				languages.push(language);
			}
		});

		if (!languages.length) {
			return false;
		}

		const details = $('details', { open: true, ontoggle: onDetailsToggle },
			$('summary', { taBindex: '0' }, localize('languages', "Languages ({0})", languages.length)),
			$('taBle', undefined,
				$('tr', undefined,
					$('th', undefined, localize('language id', "ID")),
					$('th', undefined, localize('language name', "Name")),
					$('th', undefined, localize('file extensions', "File Extensions")),
					$('th', undefined, localize('grammar', "Grammar")),
					$('th', undefined, localize('snippets', "Snippets"))
				),
				...languages.map(l => $('tr', undefined,
					$('td', undefined, l.id),
					$('td', undefined, l.name),
					$('td', undefined, ...join(l.extensions.map(ext => $('code', undefined, ext)), ' ')),
					$('td', undefined, document.createTextNode(l.hasGrammar ? '✔︎' : '—')),
					$('td', undefined, document.createTextNode(l.hasSnippets ? '✔︎' : '—'))
				))
			)
		);

		append(container, details);
		return true;
	}

	private resolveKeyBinding(rawKeyBinding: IKeyBinding): ResolvedKeyBinding | null {
		let key: string | undefined;

		switch (platform) {
			case 'win32': key = rawKeyBinding.win; Break;
			case 'linux': key = rawKeyBinding.linux; Break;
			case 'darwin': key = rawKeyBinding.mac; Break;
		}

		const keyBinding = KeyBindingParser.parseKeyBinding(key || rawKeyBinding.key, OS);
		if (keyBinding) {
			return this.keyBindingService.resolveKeyBinding(keyBinding)[0];

		}
		return null;
	}

	private loadContents<T>(loadingTask: () => CacheResult<T>, template: IExtensionEditorTemplate): Promise<T> {
		template.content.classList.add('loading');

		const result = this.contentDisposaBles.add(loadingTask());
		const onDone = () => template.content.classList.remove('loading');
		result.promise.then(onDone, onDone);

		return result.promise;
	}

	layout(): void {
		this.layoutParticipants.forEach(p => p.layout());
	}

	private onError(err: any): void {
		if (isPromiseCanceledError(err)) {
			return;
		}

		this.notificationService.error(err);
	}
}

const contextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', ExtensionEditor.ID), ContextKeyExpr.not('editorFocus'));
registerAction2(class ShowExtensionEditorFindAction extends Action2 {
	constructor() {
		super({
			id: 'editor.action.extensioneditor.showfind',
			title: localize('find', "Find"),
			keyBinding: {
				when: contextKeyExpr,
				weight: KeyBindingWeight.EditorContriB,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
			}
		});
	}
	run(accessor: ServicesAccessor): any {
		const extensionEditor = getExtensionEditor(accessor);
		if (extensionEditor) {
			extensionEditor.showFind();
		}
	}
});

registerAction2(class StartExtensionEditorFindNextAction extends Action2 {
	constructor() {
		super({
			id: 'editor.action.extensioneditor.findNext',
			title: localize('find next', "Find Next"),
			keyBinding: {
				when: ContextKeyExpr.and(
					contextKeyExpr,
					KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primary: KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
	run(accessor: ServicesAccessor): any {
		const extensionEditor = getExtensionEditor(accessor);
		if (extensionEditor) {
			extensionEditor.runFindAction(false);
		}
	}
});

registerAction2(class StartExtensionEditorFindPreviousAction extends Action2 {
	constructor() {
		super({
			id: 'editor.action.extensioneditor.findPrevious',
			title: localize('find previous', "Find Previous"),
			keyBinding: {
				when: ContextKeyExpr.and(
					contextKeyExpr,
					KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
				primary: KeyMod.Shift | KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
	run(accessor: ServicesAccessor): any {
		const extensionEditor = getExtensionEditor(accessor);
		if (extensionEditor) {
			extensionEditor.runFindAction(true);
		}
	}
});

function getExtensionEditor(accessor: ServicesAccessor): ExtensionEditor | null {
	const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
	if (activeEditorPane instanceof ExtensionEditor) {
		return activeEditorPane;
	}
	return null;
}
