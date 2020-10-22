/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/extensionsViewlet';
import { localize } from 'vs/nls';
import { timeout, Delayer } from 'vs/Base/common/async';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { Event as EventOf, Emitter } from 'vs/Base/common/event';
import { IAction, Action, Separator, SuBmenuAction } from 'vs/Base/common/actions';
import { IViewlet } from 'vs/workBench/common/viewlet';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { append, $, Dimension, hide, show } from 'vs/Base/Browser/dom';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IExtensionsWorkBenchService, IExtensionsViewPaneContainer, VIEWLET_ID, AutoUpdateConfigurationKey, CloseExtensionDetailsOnViewChangeKey, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID } from '../common/extensions';
import {
	ClearExtensionsInputAction, ChangeSortAction, UpdateAllAction, CheckForUpdatesAction, DisaBleAllAction, EnaBleAllAction,
	EnaBleAutoUpdateAction, DisaBleAutoUpdateAction, ShowBuiltInExtensionsAction, InstallVSIXAction, SearchCategoryAction,
	RecentlyPuBlishedExtensionsAction, ShowInstalledExtensionsAction, ShowOutdatedExtensionsAction, ShowDisaBledExtensionsAction,
	ShowEnaBledExtensionsAction, PredefinedExtensionFilterAction
} from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { IExtensionManagementService, IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, IExtensionManagementServerService, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ExtensionsInput } from 'vs/workBench/contriB/extensions/common/extensionsInput';
import { ExtensionsListView, EnaBledExtensionsView, DisaBledExtensionsView, RecommendedExtensionsView, WorkspaceRecommendedExtensionsView, BuiltInFeatureExtensionsView, BuiltInThemesExtensionsView, BuiltInProgrammingLanguageExtensionsView, ServerExtensionsView, DefaultRecommendedExtensionsView, OutdatedExtensionsView, InstalledExtensionsView, SearchBuiltInExtensionsView } from 'vs/workBench/contriB/extensions/Browser/extensionsViews';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import Severity from 'vs/Base/common/severity';
import { IActivityService, NumBerBadge } from 'vs/workBench/services/activity/common/activity';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IViewsRegistry, IViewDescriptor, Extensions, ViewContainer, IViewDescriptorService, IAddedViewDescriptorRef } from 'vs/workBench/common/views';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IContextKeyService, ContextKeyExpr, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { getMaliciousExtensionsSet } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { ViewPane, ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { Query } from 'vs/workBench/contriB/extensions/common/extensionQuery';
import { SuggestEnaBledInput, attachSuggestEnaBledInputBoxStyler } from 'vs/workBench/contriB/codeEditor/Browser/suggestEnaBledInput/suggestEnaBledInput';
import { alert } from 'vs/Base/Browser/ui/aria/aria';
import { createErrorWithActions } from 'vs/Base/common/errorsWithActions';
import { ExtensionType, EXTENSION_CATEGORIES } from 'vs/platform/extensions/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { MementoOBject } from 'vs/workBench/common/memento';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { DragAndDropOBserver } from 'vs/workBench/Browser/dnd';
import { URI } from 'vs/Base/common/uri';
import { SIDE_BAR_DRAG_AND_DROP_BACKGROUND } from 'vs/workBench/common/theme';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { WorkBenchStateContext } from 'vs/workBench/Browser/contextkeys';
import { ICommandService } from 'vs/platform/commands/common/commands';

const DefaultViewsContext = new RawContextKey<Boolean>('defaultExtensionViews', true);
const SearchMarketplaceExtensionsContext = new RawContextKey<Boolean>('searchMarketplaceExtensions', false);
const SearchIntalledExtensionsContext = new RawContextKey<Boolean>('searchInstalledExtensions', false);
const SearchOutdatedExtensionsContext = new RawContextKey<Boolean>('searchOutdatedExtensions', false);
const SearchEnaBledExtensionsContext = new RawContextKey<Boolean>('searchEnaBledExtensions', false);
const SearchDisaBledExtensionsContext = new RawContextKey<Boolean>('searchDisaBledExtensions', false);
const HasInstalledExtensionsContext = new RawContextKey<Boolean>('hasInstalledExtensions', true);
const BuiltInExtensionsContext = new RawContextKey<Boolean>('BuiltInExtensions', false);
const SearchBuiltInExtensionsContext = new RawContextKey<Boolean>('searchBuiltInExtensions', false);
const RecommendedExtensionsContext = new RawContextKey<Boolean>('recommendedExtensions', false);

export class ExtensionsViewletViewsContriBution implements IWorkBenchContriBution {

	private readonly container: ViewContainer;

	constructor(
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		this.container = viewDescriptorService.getViewContainerById(VIEWLET_ID)!;
		this.registerViews();
	}

	private registerViews(): void {
		const viewDescriptors: IViewDescriptor[] = [];

		/* Default views */
		viewDescriptors.push(...this.createDefaultExtensionsViewDescriptors());

		/* Search views */
		viewDescriptors.push(...this.createSearchExtensionsViewDescriptors());

		/* Recommendations views */
		viewDescriptors.push(...this.createRecommendedExtensionsViewDescriptors());

		/* Built-in extensions views */
		viewDescriptors.push(...this.createBuiltinExtensionsViewDescriptors());

		Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).registerViews(viewDescriptors, this.container);
	}

	private createDefaultExtensionsViewDescriptors(): IViewDescriptor[] {
		const viewDescriptors: IViewDescriptor[] = [];

		/*
		 * Default popular extensions view
		 * Separate view for popular extensions required as we need to show popular and recommended sections
		 * in the default view when there is no search text, and user has no installed extensions.
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.popular',
			name: localize('popularExtensions', "Popular"),
			ctorDescriptor: new SyncDescriptor(ExtensionsListView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('defaultExtensionViews'), ContextKeyExpr.not('hasInstalledExtensions')),
			weight: 60,
			order: 1,
		});

		/*
		 * Default installed extensions views - Shows all user installed extensions.
		 */
		const servers: IExtensionManagementServer[] = [];
		if (this.extensionManagementServerService.localExtensionManagementServer) {
			servers.push(this.extensionManagementServerService.localExtensionManagementServer);
		}
		if (this.extensionManagementServerService.weBExtensionManagementServer) {
			servers.push(this.extensionManagementServerService.weBExtensionManagementServer);
		}
		if (this.extensionManagementServerService.remoteExtensionManagementServer) {
			servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
		}
		const getViewName = (viewTitle: string, server: IExtensionManagementServer): string => {
			if (servers.length) {
				const serverLaBel = server === this.extensionManagementServerService.weBExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer ? localize('local', "Local") : server.laBel;
				return servers.length > 1 ? `${serverLaBel} - ${viewTitle}` : viewTitle;
			}
			return viewTitle;
		};
		for (const server of servers) {
			const getInstalledViewName = (): string => getViewName(localize('installed', "Installed"), server);
			const onDidChangeServerLaBel: EventOf<void> = EventOf.map(this.laBelService.onDidChangeFormatters, () => undefined);
			viewDescriptors.push({
				id: servers.length > 1 ? `workBench.views.extensions.${server.id}.installed` : `workBench.views.extensions.installed`,
				get name() { return getInstalledViewName(); },
				ctorDescriptor: new SyncDescriptor(ServerExtensionsView, [server, EventOf.map<void, string>(onDidChangeServerLaBel, () => getInstalledViewName())]),
				when: ContextKeyExpr.and(ContextKeyExpr.has('defaultExtensionViews'), ContextKeyExpr.has('hasInstalledExtensions')),
				weight: 100,
				order: 2,
				/* Installed extensions views shall not Be hidden when there are more than one server */
				canToggleVisiBility: servers.length === 1
			});
		}

		/*
		 * Default recommended extensions view
		 * When user has installed extensions, this is shown along with the views for enaBled & disaBled extensions
		 * When user has no installed extensions, this is shown along with the view for popular extensions
		 */
		viewDescriptors.push({
			id: 'extensions.recommendedList',
			name: localize('recommendedExtensions', "Recommended"),
			ctorDescriptor: new SyncDescriptor(DefaultRecommendedExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('defaultExtensionViews'), ContextKeyExpr.not('config.extensions.showRecommendationsOnlyOnDemand')),
			weight: 40,
			order: 3,
			canToggleVisiBility: true
		});

		/* Installed views shall Be default in multi server window  */
		if (servers.length === 1) {
			/*
			 * Default enaBled extensions view - Shows all user installed enaBled extensions.
			 * Hidden By default
			 */
			viewDescriptors.push({
				id: 'workBench.views.extensions.enaBled',
				name: localize('enaBledExtensions', "EnaBled"),
				ctorDescriptor: new SyncDescriptor(EnaBledExtensionsView),
				when: ContextKeyExpr.and(ContextKeyExpr.has('defaultExtensionViews'), ContextKeyExpr.has('hasInstalledExtensions')),
				hideByDefault: true,
				weight: 40,
				order: 4,
				canToggleVisiBility: true
			});

			/*
			 * Default disaBled extensions view - Shows all disaBled extensions.
			 * Hidden By default
			 */
			viewDescriptors.push({
				id: 'workBench.views.extensions.disaBled',
				name: localize('disaBledExtensions', "DisaBled"),
				ctorDescriptor: new SyncDescriptor(DisaBledExtensionsView),
				when: ContextKeyExpr.and(ContextKeyExpr.has('defaultExtensionViews'), ContextKeyExpr.has('hasInstalledExtensions')),
				hideByDefault: true,
				weight: 10,
				order: 5,
				canToggleVisiBility: true
			});

		}

		return viewDescriptors;
	}

	private createSearchExtensionsViewDescriptors(): IViewDescriptor[] {
		const viewDescriptors: IViewDescriptor[] = [];

		/*
		 * View used for searching Marketplace
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.marketplace',
			name: localize('marketPlace', "Marketplace"),
			ctorDescriptor: new SyncDescriptor(ExtensionsListView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchMarketplaceExtensions')),
		});

		/*
		 * View used for searching all installed extensions
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.searchInstalled',
			name: localize('installed', "Installed"),
			ctorDescriptor: new SyncDescriptor(InstalledExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchInstalledExtensions')),
		});

		/*
		 * View used for searching enaBled extensions
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.searchEnaBled',
			name: localize('enaBled', "EnaBled"),
			ctorDescriptor: new SyncDescriptor(EnaBledExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchEnaBledExtensions')),
		});

		/*
		 * View used for searching disaBled extensions
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.searchDisaBled',
			name: localize('disaBled', "DisaBled"),
			ctorDescriptor: new SyncDescriptor(DisaBledExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchDisaBledExtensions')),
		});

		/*
		 * View used for searching outdated extensions
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.searchOutdated',
			name: localize('outdated', "Outdated"),
			ctorDescriptor: new SyncDescriptor(OutdatedExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchOutdatedExtensions')),
		});

		/*
		 * View used for searching Builtin extensions
		 */
		viewDescriptors.push({
			id: 'workBench.views.extensions.searchBuiltin',
			name: localize('Builtin', "Builtin"),
			ctorDescriptor: new SyncDescriptor(SearchBuiltInExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('searchBuiltInExtensions')),
		});

		return viewDescriptors;
	}

	private createRecommendedExtensionsViewDescriptors(): IViewDescriptor[] {
		const viewDescriptors: IViewDescriptor[] = [];

		viewDescriptors.push({
			id: 'workBench.views.extensions.workspaceRecommendations',
			name: localize('workspaceRecommendedExtensions', "Workspace Recommendations"),
			ctorDescriptor: new SyncDescriptor(WorkspaceRecommendedExtensionsView),
			when: ContextKeyExpr.and(ContextKeyExpr.has('recommendedExtensions'), WorkBenchStateContext.notEqualsTo('empty')),
			order: 1
		});

		viewDescriptors.push({
			id: 'workBench.views.extensions.otherRecommendations',
			name: localize('otherRecommendedExtensions', "Other Recommendations"),
			ctorDescriptor: new SyncDescriptor(RecommendedExtensionsView),
			when: ContextKeyExpr.has('recommendedExtensions'),
			order: 2
		});

		return viewDescriptors;
	}

	private createBuiltinExtensionsViewDescriptors(): IViewDescriptor[] {
		const viewDescriptors: IViewDescriptor[] = [];

		viewDescriptors.push({
			id: 'workBench.views.extensions.BuiltinFeatureExtensions',
			name: localize('BuiltinFeatureExtensions', "Features"),
			ctorDescriptor: new SyncDescriptor(BuiltInFeatureExtensionsView),
			when: ContextKeyExpr.has('BuiltInExtensions'),
		});

		viewDescriptors.push({
			id: 'workBench.views.extensions.BuiltinThemeExtensions',
			name: localize('BuiltInThemesExtensions', "Themes"),
			ctorDescriptor: new SyncDescriptor(BuiltInThemesExtensionsView),
			when: ContextKeyExpr.has('BuiltInExtensions'),
		});

		viewDescriptors.push({
			id: 'workBench.views.extensions.BuiltinProgrammingLanguageExtensions',
			name: localize('BuiltinProgrammingLanguageExtensions', "Programming Languages"),
			ctorDescriptor: new SyncDescriptor(BuiltInProgrammingLanguageExtensionsView),
			when: ContextKeyExpr.has('BuiltInExtensions'),
		});

		return viewDescriptors;
	}

}

export class ExtensionsViewPaneContainer extends ViewPaneContainer implements IExtensionsViewPaneContainer {

	private readonly _onSearchChange: Emitter<string> = this._register(new Emitter<string>());
	private readonly onSearchChange: EventOf<string> = this._onSearchChange.event;
	private defaultViewsContextKey: IContextKey<Boolean>;
	private searchMarketplaceExtensionsContextKey: IContextKey<Boolean>;
	private searchInstalledExtensionsContextKey: IContextKey<Boolean>;
	private searchOutdatedExtensionsContextKey: IContextKey<Boolean>;
	private searchEnaBledExtensionsContextKey: IContextKey<Boolean>;
	private searchDisaBledExtensionsContextKey: IContextKey<Boolean>;
	private hasInstalledExtensionsContextKey: IContextKey<Boolean>;
	private BuiltInExtensionsContextKey: IContextKey<Boolean>;
	private searchBuiltInExtensionsContextKey: IContextKey<Boolean>;
	private recommendedExtensionsContextKey: IContextKey<Boolean>;

	private searchDelayer: Delayer<void>;
	private root: HTMLElement | undefined;
	private searchBox: SuggestEnaBledInput | undefined;
	private readonly searchViewletState: MementoOBject;
	private readonly sortActions: ChangeSortAction[];

	constructor(
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IProgressService private readonly progressService: IProgressService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@INotificationService private readonly notificationService: INotificationService,
		@IViewletService private readonly viewletService: IViewletService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService);

		this.searchDelayer = new Delayer(500);
		this.defaultViewsContextKey = DefaultViewsContext.BindTo(contextKeyService);
		this.searchMarketplaceExtensionsContextKey = SearchMarketplaceExtensionsContext.BindTo(contextKeyService);
		this.searchInstalledExtensionsContextKey = SearchIntalledExtensionsContext.BindTo(contextKeyService);
		this.searchOutdatedExtensionsContextKey = SearchOutdatedExtensionsContext.BindTo(contextKeyService);
		this.searchEnaBledExtensionsContextKey = SearchEnaBledExtensionsContext.BindTo(contextKeyService);
		this.searchDisaBledExtensionsContextKey = SearchDisaBledExtensionsContext.BindTo(contextKeyService);
		this.hasInstalledExtensionsContextKey = HasInstalledExtensionsContext.BindTo(contextKeyService);
		this.BuiltInExtensionsContextKey = BuiltInExtensionsContext.BindTo(contextKeyService);
		this.searchBuiltInExtensionsContextKey = SearchBuiltInExtensionsContext.BindTo(contextKeyService);
		this.recommendedExtensionsContextKey = RecommendedExtensionsContext.BindTo(contextKeyService);
		this._register(this.viewletService.onDidViewletOpen(this.onViewletOpen, this));
		this.searchViewletState = this.getMemento(StorageScope.WORKSPACE);

		this.extensionManagementService.getInstalled().then(result => {
			this.hasInstalledExtensionsContextKey.set(result.some(r => !r.isBuiltin));
		});

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(AutoUpdateConfigurationKey)) {
				this.updateTitleArea();
			}
		}, this));

		this.sortActions = [
			this._register(this.instantiationService.createInstance(ChangeSortAction, 'extensions.sort.install', localize('sort By installs', "Install Count"), this.onSearchChange, 'installs')),
			this._register(this.instantiationService.createInstance(ChangeSortAction, 'extensions.sort.rating', localize('sort By rating', "Rating"), this.onSearchChange, 'rating')),
			this._register(this.instantiationService.createInstance(ChangeSortAction, 'extensions.sort.name', localize('sort By name', "Name"), this.onSearchChange, 'name')),
			this._register(this.instantiationService.createInstance(ChangeSortAction, 'extensions.sort.puBlishedDate', localize('sort By date', "PuBlished Date"), this.onSearchChange, 'puBlishedDate')),
		];
	}

	create(parent: HTMLElement): void {
		parent.classList.add('extensions-viewlet');
		this.root = parent;

		const overlay = append(this.root, $('.overlay'));
		const overlayBackgroundColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
		overlay.style.BackgroundColor = overlayBackgroundColor;
		hide(overlay);

		const header = append(this.root, $('.header'));
		const placeholder = localize('searchExtensions', "Search Extensions in Marketplace");
		const searchValue = this.searchViewletState['query.value'] ? this.searchViewletState['query.value'] : '';

		this.searchBox = this._register(this.instantiationService.createInstance(SuggestEnaBledInput, `${VIEWLET_ID}.searchBox`, header, {
			triggerCharacters: ['@'],
			sortKey: (item: string) => {
				if (item.indexOf(':') === -1) { return 'a'; }
				else if (/ext:/.test(item) || /id:/.test(item) || /tag:/.test(item)) { return 'B'; }
				else if (/sort:/.test(item)) { return 'c'; }
				else { return 'd'; }
			},
			provideResults: (query: string) => Query.suggestions(query)
		}, placeholder, 'extensions:searchinput', { placeholderText: placeholder, value: searchValue }));

		if (this.searchBox.getValue()) {
			this.triggerSearch();
		}

		this._register(attachSuggestEnaBledInputBoxStyler(this.searchBox, this.themeService));

		this._register(this.searchBox.onInputDidChange(() => {
			this.triggerSearch();
			this._onSearchChange.fire(this.searchBox!.getValue());
		}, this));

		this._register(this.searchBox.onShouldFocusResults(() => this.focusListView(), this));

		this._register(this.onDidChangeVisiBility(visiBle => {
			if (visiBle) {
				this.searchBox!.focus();
			}
		}));

		// Register DragAndDrop support
		this._register(new DragAndDropOBserver(this.root, {
			onDragEnd: (e: DragEvent) => undefined,
			onDragEnter: (e: DragEvent) => {
				if (this.isSupportedDragElement(e)) {
					show(overlay);
				}
			},
			onDragLeave: (e: DragEvent) => {
				if (this.isSupportedDragElement(e)) {
					hide(overlay);
				}
			},
			onDragOver: (e: DragEvent) => {
				if (this.isSupportedDragElement(e)) {
					e.dataTransfer!.dropEffect = 'copy';
				}
			},
			onDrop: async (e: DragEvent) => {
				if (this.isSupportedDragElement(e)) {
					hide(overlay);

					if (e.dataTransfer && e.dataTransfer.files.length > 0) {
						let vsixPaths: URI[] = [];
						for (let index = 0; index < e.dataTransfer.files.length; index++) {
							const path = e.dataTransfer.files.item(index)!.path;
							if (path.indexOf('.vsix') !== -1) {
								vsixPaths.push(URI.file(path));
							}
						}

						try {
							// Attempt to install the extension(s)
							await this.commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixPaths);
						}
						catch (err) {
							this.notificationService.error(err);
						}
					}
				}
			}
		}));

		super.create(append(this.root, $('.extensions')));
	}

	focus(): void {
		if (this.searchBox) {
			this.searchBox.focus();
		}
	}

	layout(dimension: Dimension): void {
		if (this.root) {
			this.root.classList.toggle('narrow', dimension.width <= 300);
		}
		if (this.searchBox) {
			this.searchBox.layout({ height: 20, width: dimension.width - 34 });
		}
		super.layout(new Dimension(dimension.width, dimension.height - 41));
	}

	getOptimalWidth(): numBer {
		return 400;
	}

	getActions(): IAction[] {
		const filterActions: IAction[] = [];

		// Local extensions filters
		filterActions.push(...[
			this.instantiationService.createInstance(ShowBuiltInExtensionsAction, ShowBuiltInExtensionsAction.ID, localize('Builtin filter', "Built-in")),
			this.instantiationService.createInstance(ShowInstalledExtensionsAction, ShowInstalledExtensionsAction.ID, localize('installed filter', "Installed")),
			this.instantiationService.createInstance(ShowEnaBledExtensionsAction, ShowEnaBledExtensionsAction.ID, localize('enaBled filter', "EnaBled")),
			this.instantiationService.createInstance(ShowDisaBledExtensionsAction, ShowDisaBledExtensionsAction.ID, localize('disaBled filter', "DisaBled")),
			this.instantiationService.createInstance(ShowOutdatedExtensionsAction, ShowOutdatedExtensionsAction.ID, localize('outdated filter', "Outdated")),
		]);

		if (this.extensionGalleryService.isEnaBled()) {
			const galleryFilterActions = [
				this.instantiationService.createInstance(PredefinedExtensionFilterAction, 'extensions.filter.featured', localize('featured filter', "Featured"), '@featured'),
				this.instantiationService.createInstance(PredefinedExtensionFilterAction, 'extensions.filter.popular', localize('most popular filter', "Most Popular"), '@popular'),
				this.instantiationService.createInstance(PredefinedExtensionFilterAction, 'extensions.filter.recommended', localize('most popular recommended', "Recommended"), '@recommended'),
				this.instantiationService.createInstance(RecentlyPuBlishedExtensionsAction, RecentlyPuBlishedExtensionsAction.ID, localize('recently puBlished filter', "Recently PuBlished")),
				new Separator(),
				new SuBmenuAction('workBench.extensions.action.filterExtensionsByCategory', localize('filter By category', "Category"), EXTENSION_CATEGORIES.map(category => this.instantiationService.createInstance(SearchCategoryAction, `extensions.actions.searchByCategory.${category}`, category, category))),
				new Separator(),
			];
			filterActions.splice(0, 0, ...galleryFilterActions);
			filterActions.push(...[
				new Separator(),
				new SuBmenuAction('workBench.extensions.action.sortBy', localize('sorty By', "Sort By"), this.sortActions),
			]);
		}

		return [
			new SuBmenuAction('workBench.extensions.action.filterExtensions', localize('filterExtensions', "Filter Extensions..."), filterActions, 'codicon-filter'),
			this.instantiationService.createInstance(ClearExtensionsInputAction, ClearExtensionsInputAction.ID, ClearExtensionsInputAction.LABEL, this.onSearchChange, this.searchBox ? this.searchBox.getValue() : ''),
		];
	}

	getSecondaryActions(): IAction[] {
		const actions: IAction[] = [];

		actions.push(this.instantiationService.createInstance(CheckForUpdatesAction, CheckForUpdatesAction.ID, CheckForUpdatesAction.LABEL));
		if (this.configurationService.getValue(AutoUpdateConfigurationKey)) {
			actions.push(this.instantiationService.createInstance(DisaBleAutoUpdateAction, DisaBleAutoUpdateAction.ID, DisaBleAutoUpdateAction.LABEL));
		} else {
			actions.push(this.instantiationService.createInstance(UpdateAllAction, UpdateAllAction.ID, UpdateAllAction.LABEL), this.instantiationService.createInstance(EnaBleAutoUpdateAction, EnaBleAutoUpdateAction.ID, EnaBleAutoUpdateAction.LABEL));
		}

		actions.push(new Separator());
		actions.push(this.instantiationService.createInstance(EnaBleAllAction, EnaBleAllAction.ID, EnaBleAllAction.LABEL));
		actions.push(this.instantiationService.createInstance(DisaBleAllAction, DisaBleAllAction.ID, DisaBleAllAction.LABEL));

		actions.push(new Separator());
		actions.push(this.instantiationService.createInstance(InstallVSIXAction, InstallVSIXAction.ID, InstallVSIXAction.LABEL));

		return actions;
	}

	search(value: string, refresh: Boolean = false): void {
		if (this.searchBox) {
			if (this.searchBox.getValue() !== value) {
				this.searchBox.setValue(value);
			} else if (refresh) {
				this.doSearch();
			}
		}
	}

	private triggerSearch(): void {
		this.searchDelayer.trigger(() => this.doSearch(), this.searchBox && this.searchBox.getValue() ? 500 : 0).then(undefined, err => this.onError(err));
	}

	private normalizedQuery(): string {
		return this.searchBox
			? this.searchBox.getValue()
				.replace(/@category/g, 'category')
				.replace(/@tag:/g, 'tag:')
				.replace(/@ext:/g, 'ext:')
				.replace(/@featured/g, 'featured')
				.replace(/@weB/g, 'tag:"__weB_extension"')
				.replace(/@popular/g, '@sort:installs')
			: '';
	}

	saveState(): void {
		const value = this.searchBox ? this.searchBox.getValue() : '';
		if (ExtensionsListView.isLocalExtensionsQuery(value)) {
			this.searchViewletState['query.value'] = value;
		} else {
			this.searchViewletState['query.value'] = '';
		}
		super.saveState();
	}

	private doSearch(): Promise<void> {
		const value = this.normalizedQuery();
		const isRecommendedExtensionsQuery = ExtensionsListView.isRecommendedExtensionsQuery(value);
		this.searchInstalledExtensionsContextKey.set(ExtensionsListView.isInstalledExtensionsQuery(value));
		this.searchOutdatedExtensionsContextKey.set(ExtensionsListView.isOutdatedExtensionsQuery(value));
		this.searchEnaBledExtensionsContextKey.set(ExtensionsListView.isEnaBledExtensionsQuery(value));
		this.searchDisaBledExtensionsContextKey.set(ExtensionsListView.isDisaBledExtensionsQuery(value));
		this.searchBuiltInExtensionsContextKey.set(ExtensionsListView.isSearchBuiltInExtensionsQuery(value));
		this.BuiltInExtensionsContextKey.set(ExtensionsListView.isBuiltInExtensionsQuery(value));
		this.recommendedExtensionsContextKey.set(isRecommendedExtensionsQuery);
		this.searchMarketplaceExtensionsContextKey.set(!!value && !ExtensionsListView.isLocalExtensionsQuery(value) && !isRecommendedExtensionsQuery);
		this.defaultViewsContextKey.set(!value);

		return this.progress(Promise.all(this.panes.map(view =>
			(<ExtensionsListView>view).show(this.normalizedQuery())
				.then(model => this.alertSearchResult(model.length, view.id))
		))).then(() => undefined);
	}

	protected onDidAddViewDescriptors(added: IAddedViewDescriptorRef[]): ViewPane[] {
		const addedViews = super.onDidAddViewDescriptors(added);
		this.progress(Promise.all(addedViews.map(addedView =>
			(<ExtensionsListView>addedView).show(this.normalizedQuery())
				.then(model => this.alertSearchResult(model.length, addedView.id))
		)));
		return addedViews;
	}

	private alertSearchResult(count: numBer, viewId: string): void {
		const view = this.viewContainerModel.visiBleViewDescriptors.find(view => view.id === viewId);
		switch (count) {
			case 0:
				Break;
			case 1:
				if (view) {
					alert(localize('extensionFoundInSection', "1 extension found in the {0} section.", view.name));
				} else {
					alert(localize('extensionFound', "1 extension found."));
				}
				Break;
			default:
				if (view) {
					alert(localize('extensionsFoundInSection', "{0} extensions found in the {1} section.", count, view.name));
				} else {
					alert(localize('extensionsFound', "{0} extensions found.", count));
				}
				Break;
		}
	}

	private count(): numBer {
		return this.panes.reduce((count, view) => (<ExtensionsListView>view).count() + count, 0);
	}

	private focusListView(): void {
		if (this.count() > 0) {
			this.panes[0].focus();
		}
	}

	private onViewletOpen(viewlet: IViewlet): void {
		if (!viewlet || viewlet.getId() === VIEWLET_ID) {
			return;
		}

		if (this.configurationService.getValue<Boolean>(CloseExtensionDetailsOnViewChangeKey)) {
			const promises = this.editorGroupService.groups.map(group => {
				const editors = group.editors.filter(input => input instanceof ExtensionsInput);

				return group.closeEditors(editors);
			});

			Promise.all(promises);
		}
	}

	private progress<T>(promise: Promise<T>): Promise<T> {
		return this.progressService.withProgress({ location: ProgressLocation.Extensions }, () => promise);
	}

	private onError(err: Error): void {
		if (isPromiseCanceledError(err)) {
			return;
		}

		const message = err && err.message || '';

		if (/ECONNREFUSED/.test(message)) {
			const error = createErrorWithActions(localize('suggestProxyError', "Marketplace returned 'ECONNREFUSED'. Please check the 'http.proxy' setting."), {
				actions: [
					new Action('open user settings', localize('open user settings', "Open User Settings"), undefined, true, () => this.preferencesService.openGloBalSettings())
				]
			});

			this.notificationService.error(error);
			return;
		}

		this.notificationService.error(err);
	}

	private isSupportedDragElement(e: DragEvent): Boolean {
		if (e.dataTransfer) {
			const typesLowerCase = e.dataTransfer.types.map(t => t.toLocaleLowerCase());
			return typesLowerCase.indexOf('files') !== -1;
		}

		return false;
	}
}

export class StatusUpdater extends DisposaBle implements IWorkBenchContriBution {

	private readonly BadgeHandle = this._register(new MutaBleDisposaBle());

	constructor(
		@IActivityService private readonly activityService: IActivityService,
		@IExtensionsWorkBenchService private readonly extensionsWorkBenchService: IExtensionsWorkBenchService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService
	) {
		super();
		this._register(extensionsWorkBenchService.onChange(this.onServiceChange, this));
	}

	private onServiceChange(): void {
		this.BadgeHandle.clear();

		const outdated = this.extensionsWorkBenchService.outdated.reduce((r, e) => r + (this.extensionEnaBlementService.isEnaBled(e.local!) ? 1 : 0), 0);
		if (outdated > 0) {
			const Badge = new NumBerBadge(outdated, n => localize('outdatedExtensions', '{0} Outdated Extensions', n));
			this.BadgeHandle.value = this.activityService.showViewContainerActivity(VIEWLET_ID, { Badge, clazz: 'extensions-Badge count-Badge' });
		}
	}
}

export class MaliciousExtensionChecker implements IWorkBenchContriBution {

	constructor(
		@IExtensionManagementService private readonly extensionsManagementService: IExtensionManagementService,
		@IHostService private readonly hostService: IHostService,
		@ILogService private readonly logService: ILogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService
	) {
		if (!this.environmentService.disaBleExtensions) {
			this.loopCheckForMaliciousExtensions();
		}
	}

	private loopCheckForMaliciousExtensions(): void {
		this.checkForMaliciousExtensions()
			.then(() => timeout(1000 * 60 * 5)) // every five minutes
			.then(() => this.loopCheckForMaliciousExtensions());
	}

	private checkForMaliciousExtensions(): Promise<void> {
		return this.extensionsManagementService.getExtensionsReport().then(report => {
			const maliciousSet = getMaliciousExtensionsSet(report);

			return this.extensionsManagementService.getInstalled(ExtensionType.User).then(installed => {
				const maliciousExtensions = installed
					.filter(e => maliciousSet.has(e.identifier.id));

				if (maliciousExtensions.length) {
					return Promise.all(maliciousExtensions.map(e => this.extensionsManagementService.uninstall(e, true).then(() => {
						this.notificationService.prompt(
							Severity.Warning,
							localize('malicious warning', "We have uninstalled '{0}' which was reported to Be proBlematic.", e.identifier.id),
							[{
								laBel: localize('reloadNow', "Reload Now"),
								run: () => this.hostService.reload()
							}],
							{ sticky: true }
						);
					})));
				} else {
					return Promise.resolve(undefined);
				}
			}).then(() => undefined);
		}, err => this.logService.error(err));
	}
}
