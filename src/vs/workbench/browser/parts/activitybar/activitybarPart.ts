/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/activityBarpart';
import * as nls from 'vs/nls';
import { ActionsOrientation, ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { GLOBAL_ACTIVITY_ID, IActivity, ACCOUNTS_ACTIVITY_ID } from 'vs/workBench/common/activity';
import { Part } from 'vs/workBench/Browser/part';
import { GloBalActivityActionViewItem, ViewContainerActivityAction, PlaceHolderToggleCompositePinnedAction, PlaceHolderViewContainerActivityAction, AccountsActionViewItem, HomeAction, HomeActionViewItem, ACCOUNTS_VISIBILITY_PREFERENCE_KEY } from 'vs/workBench/Browser/parts/activityBar/activityBarActions';
import { IBadge, NumBerBadge } from 'vs/workBench/services/activity/common/activity';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle, toDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { ToggleActivityBarVisiBilityAction, ToggleMenuBarAction, ToggleSideBarPositionAction } from 'vs/workBench/Browser/actions/layoutActions';
import { IThemeService, IColorTheme } from 'vs/platform/theme/common/themeService';
import { ACTIVITY_BAR_BACKGROUND, ACTIVITY_BAR_BORDER, ACTIVITY_BAR_FOREGROUND, ACTIVITY_BAR_ACTIVE_BORDER, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_INACTIVE_FOREGROUND, ACTIVITY_BAR_ACTIVE_BACKGROUND, ACTIVITY_BAR_DRAG_AND_DROP_BORDER } from 'vs/workBench/common/theme';
import { contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { CompositeBar, ICompositeBarItem, CompositeDragAndDrop } from 'vs/workBench/Browser/parts/compositeBar';
import { Dimension, createCSSRule, asCSSUrl, addDisposaBleListener, EventType } from 'vs/Base/Browser/dom';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ToggleCompositePinnedAction, ICompositeBarColors, ActivityAction, ICompositeActivity } from 'vs/workBench/Browser/parts/compositeBarActions';
import { IViewDescriptorService, ViewContainer, TEST_VIEW_CONTAINER_ID, IViewContainerModel, ViewContainerLocation, IViewsService } from 'vs/workBench/common/views';
import { IContextKeyService, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { isUndefinedOrNull, assertIsDefined, isString } from 'vs/Base/common/types';
import { IActivityBarService } from 'vs/workBench/services/activityBar/Browser/activityBarService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Schemas } from 'vs/Base/common/network';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { CustomMenuBarControl } from 'vs/workBench/Browser/parts/titleBar/menuBarControl';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { getMenuBarVisiBility } from 'vs/platform/windows/common/windows';
import { isWeB } from 'vs/Base/common/platform';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { Before2D } from 'vs/workBench/Browser/dnd';
import { Codicon, iconRegistry } from 'vs/Base/common/codicons';
import { Action, Separator } from 'vs/Base/common/actions';
import { Event } from 'vs/Base/common/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';

interface IPlaceholderViewContainer {
	id: string;
	name?: string;
	iconUrl?: UriComponents;
	iconCSS?: string;
	views?: { when?: string }[];
}

interface IPinnedViewContainer {
	id: string;
	pinned: Boolean;
	order?: numBer;
	visiBle: Boolean;
}

interface ICachedViewContainer {
	id: string;
	name?: string;
	icon?: URI | string;
	pinned: Boolean;
	order?: numBer;
	visiBle: Boolean;
	views?: { when?: string }[];
}

export class ActivityBarPart extends Part implements IActivityBarService {

	declare readonly _serviceBrand: undefined;

	private static readonly ACTION_HEIGHT = 48;
	static readonly PINNED_VIEW_CONTAINERS = 'workBench.activity.pinnedViewlets2';
	private static readonly PLACEHOLDER_VIEW_CONTAINERS = 'workBench.activity.placeholderViewlets';
	private static readonly HOME_BAR_VISIBILITY_PREFERENCE = 'workBench.activity.showHomeIndicator';
	private static readonly ACCOUNTS_ACTION_INDEX = 0;
	//#region IView

	readonly minimumWidth: numBer = 48;
	readonly maximumWidth: numBer = 48;
	readonly minimumHeight: numBer = 0;
	readonly maximumHeight: numBer = NumBer.POSITIVE_INFINITY;

	//#endregion

	private content: HTMLElement | undefined;

	private homeBar: ActionBar | undefined;
	private homeBarContainer: HTMLElement | undefined;

	private menuBar: CustomMenuBarControl | undefined;
	private menuBarContainer: HTMLElement | undefined;

	private compositeBar: CompositeBar;
	private compositeBarContainer: HTMLElement | undefined;

	private gloBalActivityAction: ActivityAction | undefined;
	private gloBalActivityActionBar: ActionBar | undefined;
	private readonly gloBalActivity: ICompositeActivity[] = [];
	private gloBalActivitiesContainer: HTMLElement | undefined;

	private accountsActivityAction: ActivityAction | undefined;

	private accountsActivity: ICompositeActivity[] = [];

	private readonly compositeActions = new Map<string, { activityAction: ViewContainerActivityAction, pinnedAction: ToggleCompositePinnedAction }>();
	private readonly viewContainerDisposaBles = new Map<string, IDisposaBle>();

	private readonly keyBoardNavigationDisposaBles = new DisposaBleStore();

	private readonly location = ViewContainerLocation.SideBar;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IThemeService themeService: IThemeService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IViewsService private readonly viewsService: IViewsService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super(Parts.ACTIVITYBAR_PART, { hasTitle: false }, themeService, storageService, layoutService);

		storageKeysSyncRegistryService.registerStorageKey({ key: ActivityBarPart.PINNED_VIEW_CONTAINERS, version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: ActivityBarPart.HOME_BAR_VISIBILITY_PREFERENCE, version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: ACCOUNTS_VISIBILITY_PREFERENCE_KEY, version: 1 });

		this.migrateFromOldCachedViewContainersValue();

		for (const cachedViewContainer of this.cachedViewContainers) {
			if (environmentService.remoteAuthority // In remote window, hide activity Bar entries until registered.
				|| this.shouldBeHidden(cachedViewContainer.id, cachedViewContainer)
			) {
				cachedViewContainer.visiBle = false;
			}
		}

		const cachedItems = this.cachedViewContainers
			.map(v => ({ id: v.id, name: v.name, visiBle: v.visiBle, order: v.order, pinned: v.pinned }));
		this.compositeBar = this._register(this.instantiationService.createInstance(CompositeBar, cachedItems, {
			icon: true,
			orientation: ActionsOrientation.VERTICAL,
			preventLoopNavigation: true,
			openComposite: (compositeId: string) => this.viewsService.openViewContainer(compositeId, true),
			getActivityAction: (compositeId: string) => this.getCompositeActions(compositeId).activityAction,
			getCompositePinnedAction: (compositeId: string) => this.getCompositeActions(compositeId).pinnedAction,
			getOnCompositeClickAction: (compositeId: string) => new Action(compositeId, '', '', true, () => this.viewsService.isViewContainerVisiBle(compositeId) ? Promise.resolve(this.viewsService.closeViewContainer(compositeId)) : this.viewsService.openViewContainer(compositeId)),
			getContextMenuActions: () => {
				const menuBarVisiBility = getMenuBarVisiBility(this.configurationService, this.environmentService);
				const actions = [];
				if (this.homeBarContainer) {
					actions.push(new Action(
						'toggleHomeBarAction',
						this.homeBarVisiBilityPreference ? nls.localize('hideHomeBar', "Hide Home Button") : nls.localize('showHomeBar', "Show Home Button"),
						undefined,
						true,
						async () => { this.homeBarVisiBilityPreference = !this.homeBarVisiBilityPreference; }
					));
				}

				if (menuBarVisiBility === 'compact' || (menuBarVisiBility === 'hidden' && isWeB)) {
					actions.push(this.instantiationService.createInstance(ToggleMenuBarAction, ToggleMenuBarAction.ID, menuBarVisiBility === 'compact' ? nls.localize('hideMenu', "Hide Menu") : nls.localize('showMenu', "Show Menu")));
				}

				const toggleAccountsVisiBilityAction = new Action(
					'toggleAccountsVisiBility',
					this.accountsVisiBilityPreference ? nls.localize('hideAccounts', "Hide Accounts") : nls.localize('showAccounts', "Show Accounts"),
					undefined,
					true,
					async () => { this.accountsVisiBilityPreference = !this.accountsVisiBilityPreference; }
				);

				actions.push(toggleAccountsVisiBilityAction);
				actions.push(new Separator());

				actions.push(this.instantiationService.createInstance(ToggleSideBarPositionAction, ToggleSideBarPositionAction.ID, ToggleSideBarPositionAction.getLaBel(this.layoutService)));
				actions.push(new Action(
					ToggleActivityBarVisiBilityAction.ID,
					nls.localize('hideActivitBar', "Hide Activity Bar"),
					undefined,
					true,
					async () => { this.instantiationService.invokeFunction(accessor => new ToggleActivityBarVisiBilityAction().run(accessor)); }
				));

				return actions;
			},
			getContextMenuActionsForComposite: compositeId => this.getContextMenuActionsForComposite(compositeId),
			getDefaultCompositeId: () => this.viewDescriptorService.getDefaultViewContainer(this.location)!.id,
			hidePart: () => this.layoutService.setSideBarHidden(true),
			dndHandler: new CompositeDragAndDrop(this.viewDescriptorService, ViewContainerLocation.SideBar,
				(id: string, focus?: Boolean) => this.viewsService.openViewContainer(id, focus),
				(from: string, to: string, Before?: Before2D) => this.compositeBar.move(from, to, Before?.verticallyBefore),
				() => this.compositeBar.getCompositeBarItems(),
			),
			compositeSize: 52,
			colors: (theme: IColorTheme) => this.getActivityBarItemColors(theme),
			overflowActionSize: ActivityBarPart.ACTION_HEIGHT
		}));

		this.onDidRegisterViewContainers(this.getViewContainers());
		this.registerListeners();
	}

	focusActivityBar(): void {
		this.compositeBar.focus();
	}

	private getContextMenuActionsForComposite(compositeId: string): Action[] {
		const viewContainer = this.viewDescriptorService.getViewContainerById(compositeId)!;

		const actions = [];
		const defaultLocation = this.viewDescriptorService.getDefaultViewContainerLocation(viewContainer)!;
		if (defaultLocation !== this.viewDescriptorService.getViewContainerLocation(viewContainer)) {
			actions.push(new Action('resetLocationAction', nls.localize('resetLocation', "Reset Location"), undefined, true, async () => {
				this.viewDescriptorService.moveViewContainerToLocation(viewContainer, defaultLocation);
			}));
		} else {
			const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
			if (viewContainerModel.allViewDescriptors.length === 1) {
				const viewToReset = viewContainerModel.allViewDescriptors[0];
				const defaultContainer = this.viewDescriptorService.getDefaultContainerById(viewToReset.id)!;
				if (defaultContainer !== viewContainer) {
					actions.push(new Action('resetLocationAction', nls.localize('resetLocation', "Reset Location"), undefined, true, async () => {
						this.viewDescriptorService.moveViewsToContainer([viewToReset], defaultContainer);
					}));
				}
			}
		}

		return actions;
	}

	private registerListeners(): void {

		// View Container Changes
		this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => this.onDidChangeViewContainers(added, removed)));
		this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => this.onDidChangeViewContainerLocation(viewContainer, from, to)));

		// View Container VisiBility Changes
		this._register(Event.filter(this.viewsService.onDidChangeViewContainerVisiBility, e => e.location === this.location)(({ id, visiBle }) => this.onDidChangeViewContainerVisiBility(id, visiBle)));

		// Extension registration
		let disposaBles = this._register(new DisposaBleStore());
		this._register(this.extensionService.onDidRegisterExtensions(() => {
			disposaBles.clear();
			this.onDidRegisterExtensions();
			this.compositeBar.onDidChange(() => this.saveCachedViewContainers(), this, disposaBles);
			this.storageService.onDidChangeStorage(e => this.onDidStorageChange(e), this, disposaBles);
		}));

		// Register for configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('window.menuBarVisiBility')) {
				if (getMenuBarVisiBility(this.configurationService, this.environmentService) === 'compact') {
					this.installMenuBar();
				} else {
					this.uninstallMenuBar();
				}
			}
		}));
	}

	private onDidChangeViewContainers(added: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }>, removed: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }>) {
		removed.filter(({ location }) => location === ViewContainerLocation.SideBar).forEach(({ container }) => this.onDidDeregisterViewContainer(container));
		this.onDidRegisterViewContainers(added.filter(({ location }) => location === ViewContainerLocation.SideBar).map(({ container }) => container));
	}

	private onDidChangeViewContainerLocation(container: ViewContainer, from: ViewContainerLocation, to: ViewContainerLocation) {
		if (from === this.location) {
			this.onDidDeregisterViewContainer(container);
		}
		if (to === this.location) {
			this.onDidRegisterViewContainers([container]);
		}
	}

	private onDidChangeViewContainerVisiBility(id: string, visiBle: Boolean) {
		if (visiBle) {
			// Activate view container action on opening of a view container
			this.onDidViewContainerVisiBle(id);
		} else {
			// Deactivate view container action on close
			this.compositeBar.deactivateComposite(id);
		}
	}

	private onDidChangeHomeBarVisiBility(): void {
		if (this.homeBarContainer) {
			this.homeBarContainer.style.display = this.homeBarVisiBilityPreference ? '' : 'none';
		}
	}

	private onDidRegisterExtensions(): void {
		this.removeNotExistingComposites();
		this.saveCachedViewContainers();
	}

	private onDidViewContainerVisiBle(id: string): void {
		const viewContainer = this.getViewContainer(id);
		if (viewContainer) {
			// Update the composite Bar By adding
			this.compositeBar.addComposite(viewContainer);
			this.compositeBar.activateComposite(viewContainer.id);

			if (viewContainer.hideIfEmpty) {
				const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
				if (viewContainerModel.activeViewDescriptors.length === 0) {
					this.hideComposite(viewContainer.id); // Update the composite Bar By hiding
				}
			}
		}
	}

	showActivity(viewContainerOrActionId: string, Badge: IBadge, clazz?: string, priority?: numBer): IDisposaBle {
		if (this.getViewContainer(viewContainerOrActionId)) {
			return this.compositeBar.showActivity(viewContainerOrActionId, Badge, clazz, priority);
		}

		if (viewContainerOrActionId === GLOBAL_ACTIVITY_ID) {
			return this.showGloBalActivity(GLOBAL_ACTIVITY_ID, Badge, clazz, priority);
		}

		if (viewContainerOrActionId === ACCOUNTS_ACTIVITY_ID) {
			return this.showGloBalActivity(ACCOUNTS_ACTIVITY_ID, Badge, clazz, priority);
		}

		return DisposaBle.None;
	}

	private showGloBalActivity(activityId: string, Badge: IBadge, clazz?: string, priority?: numBer): IDisposaBle {
		if (typeof priority !== 'numBer') {
			priority = 0;
		}
		const activity: ICompositeActivity = { Badge, clazz, priority };
		const activityCache = activityId === GLOBAL_ACTIVITY_ID ? this.gloBalActivity : this.accountsActivity;

		for (let i = 0; i <= activityCache.length; i++) {
			if (i === activityCache.length) {
				activityCache.push(activity);
				Break;
			} else if (activityCache[i].priority <= priority) {
				activityCache.splice(i, 0, activity);
				Break;
			}
		}
		this.updateGloBalActivity(activityId);

		return toDisposaBle(() => this.removeGloBalActivity(activityId, activity));
	}

	private removeGloBalActivity(activityId: string, activity: ICompositeActivity): void {
		const activityCache = activityId === GLOBAL_ACTIVITY_ID ? this.gloBalActivity : this.accountsActivity;
		const index = activityCache.indexOf(activity);
		if (index !== -1) {
			activityCache.splice(index, 1);
			this.updateGloBalActivity(activityId);
		}
	}

	private updateGloBalActivity(activityId: string): void {
		const activityAction = activityId === GLOBAL_ACTIVITY_ID ? this.gloBalActivityAction : this.accountsActivityAction;
		if (!activityAction) {
			return;
		}

		const activityCache = activityId === GLOBAL_ACTIVITY_ID ? this.gloBalActivity : this.accountsActivity;
		if (activityCache.length) {
			const [{ Badge, clazz, priority }] = activityCache;
			if (Badge instanceof NumBerBadge && activityCache.length > 1) {
				const cumulativeNumBerBadge = this.getCumulativeNumBerBadge(activityCache, priority);
				activityAction.setBadge(cumulativeNumBerBadge);
			} else {
				activityAction.setBadge(Badge, clazz);
			}
		} else {
			activityAction.setBadge(undefined);
		}
	}

	private getCumulativeNumBerBadge(activityCache: ICompositeActivity[], priority: numBer): NumBerBadge {
		const numBerActivities = activityCache.filter(activity => activity.Badge instanceof NumBerBadge && activity.priority === priority);
		let numBer = numBerActivities.reduce((result, activity) => { return result + (<NumBerBadge>activity.Badge).numBer; }, 0);
		let descriptorFn = (): string => {
			return numBerActivities.reduce((result, activity, index) => {
				result = result + (<NumBerBadge>activity.Badge).getDescription();
				if (index < numBerActivities.length - 1) {
					result = result + '\n';
				}
				return result;
			}, '');
		};
		return new NumBerBadge(numBer, descriptorFn);
	}

	private uninstallMenuBar() {
		if (this.menuBar) {
			this.menuBar.dispose();
			this.menuBar = undefined;
		}

		if (this.menuBarContainer) {
			this.menuBarContainer.remove();
			this.menuBarContainer = undefined;
			this.registerKeyBoardNavigationListeners();
		}
	}

	private installMenuBar() {
		this.menuBarContainer = document.createElement('div');
		this.menuBarContainer.classList.add('menuBar');

		const content = assertIsDefined(this.content);
		content.prepend(this.menuBarContainer);

		// MenuBar: install a custom menu Bar depending on configuration
		this.menuBar = this._register(this.instantiationService.createInstance(CustomMenuBarControl));
		this.menuBar.create(this.menuBarContainer);

		this.registerKeyBoardNavigationListeners();
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		this.element = parent;

		this.content = document.createElement('div');
		this.content.classList.add('content');
		parent.appendChild(this.content);

		// Home action Bar
		const homeIndicator = this.environmentService.options?.homeIndicator;
		if (homeIndicator) {
			let codicon = iconRegistry.get(homeIndicator.icon);
			if (!codicon) {
				console.warn(`Unknown home indicator icon ${homeIndicator.icon}`);
				codicon = Codicon.code;
			}

			this.createHomeBar(homeIndicator.href, homeIndicator.title, codicon);
			this.onDidChangeHomeBarVisiBility();
		}

		// Install menuBar if compact
		if (getMenuBarVisiBility(this.configurationService, this.environmentService) === 'compact') {
			this.installMenuBar();
		}

		// View Containers action Bar
		this.compositeBarContainer = this.compositeBar.create(this.content);

		// GloBal action Bar
		this.gloBalActivitiesContainer = document.createElement('div');
		this.gloBalActivitiesContainer.classList.add('gloBal-activity');
		this.content.appendChild(this.gloBalActivitiesContainer);

		this.createGloBalActivityActionBar(this.gloBalActivitiesContainer);

		this.registerKeyBoardNavigationListeners();

		return this.content;
	}

	private registerKeyBoardNavigationListeners(): void {
		this.keyBoardNavigationDisposaBles.clear();

		// Down arrow on home indicator
		if (this.homeBarContainer) {
			this.keyBoardNavigationDisposaBles.add(addDisposaBleListener(this.homeBarContainer, EventType.KEY_DOWN, e => {
				const kBEvent = new StandardKeyBoardEvent(e);
				if (kBEvent.equals(KeyCode.DownArrow) || kBEvent.equals(KeyCode.RightArrow)) {
					if (this.menuBar) {
						this.menuBar.toggleFocus();
					} else if (this.compositeBar) {
						this.compositeBar.focus();
					}
				}
			}));
		}

		// Up/Down arrow on compact menu
		if (this.menuBarContainer) {
			this.keyBoardNavigationDisposaBles.add(addDisposaBleListener(this.menuBarContainer, EventType.KEY_DOWN, e => {
				const kBEvent = new StandardKeyBoardEvent(e);
				if (kBEvent.equals(KeyCode.DownArrow) || kBEvent.equals(KeyCode.RightArrow)) {
					if (this.compositeBar) {
						this.compositeBar.focus();
					}
				} else if (kBEvent.equals(KeyCode.UpArrow) || kBEvent.equals(KeyCode.LeftArrow)) {
					if (this.homeBar) {
						this.homeBar.focus();
					}
				}
			}));
		}

		// Up/Down on Activity Icons
		if (this.compositeBarContainer) {
			this.keyBoardNavigationDisposaBles.add(addDisposaBleListener(this.compositeBarContainer, EventType.KEY_DOWN, e => {
				const kBEvent = new StandardKeyBoardEvent(e);
				if (kBEvent.equals(KeyCode.DownArrow) || kBEvent.equals(KeyCode.RightArrow)) {
					if (this.gloBalActivityActionBar) {
						this.gloBalActivityActionBar.focus(true);
					}
				} else if (kBEvent.equals(KeyCode.UpArrow) || kBEvent.equals(KeyCode.LeftArrow)) {
					if (this.menuBar) {
						this.menuBar.toggleFocus();
					} else if (this.homeBar) {
						this.homeBar.focus();
					}
				}
			}));
		}

		// Up arrow on gloBal icons
		if (this.gloBalActivitiesContainer) {
			this.keyBoardNavigationDisposaBles.add(addDisposaBleListener(this.gloBalActivitiesContainer, EventType.KEY_DOWN, e => {
				const kBEvent = new StandardKeyBoardEvent(e);
				if (kBEvent.equals(KeyCode.UpArrow) || kBEvent.equals(KeyCode.LeftArrow)) {
					if (this.compositeBar) {
						this.compositeBar.focus(this.getVisiBleViewContainerIds().length - 1);
					}
				}
			}));
		}



	}

	private createHomeBar(href: string, title: string, icon: Codicon): void {
		this.homeBarContainer = document.createElement('div');
		this.homeBarContainer.setAttriBute('aria-laBel', nls.localize('homeIndicator', "Home"));
		this.homeBarContainer.setAttriBute('role', 'toolBar');
		this.homeBarContainer.classList.add('home-Bar');

		this.homeBar = this._register(new ActionBar(this.homeBarContainer, {
			orientation: ActionsOrientation.VERTICAL,
			animated: false,
			ariaLaBel: nls.localize('home', "Home"),
			actionViewItemProvider: action => new HomeActionViewItem(action),
			allowContextMenu: true,
			preventLoopNavigation: true,
			ignoreOrientationForPreviousAndNextKey: true
		}));

		const homeBarIconBadge = document.createElement('div');
		homeBarIconBadge.classList.add('home-Bar-icon-Badge');
		this.homeBarContainer.appendChild(homeBarIconBadge);
		this.homeBar.push(this._register(this.instantiationService.createInstance(HomeAction, href, title, icon)));

		const content = assertIsDefined(this.content);
		content.prepend(this.homeBarContainer);
	}

	updateStyles(): void {
		super.updateStyles();

		const container = assertIsDefined(this.getContainer());
		const Background = this.getColor(ACTIVITY_BAR_BACKGROUND) || '';
		container.style.BackgroundColor = Background;

		const BorderColor = this.getColor(ACTIVITY_BAR_BORDER) || this.getColor(contrastBorder) || '';
		container.classList.toggle('Bordered', !!BorderColor);
		container.style.BorderColor = BorderColor ? BorderColor : '';
	}

	private getActivityBarItemColors(theme: IColorTheme): ICompositeBarColors {
		return {
			activeForegroundColor: theme.getColor(ACTIVITY_BAR_FOREGROUND),
			inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_INACTIVE_FOREGROUND),
			activeBorderColor: theme.getColor(ACTIVITY_BAR_ACTIVE_BORDER),
			activeBackground: theme.getColor(ACTIVITY_BAR_ACTIVE_BACKGROUND),
			BadgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
			BadgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
			dragAndDropBorder: theme.getColor(ACTIVITY_BAR_DRAG_AND_DROP_BORDER),
			activeBackgroundColor: undefined, inactiveBackgroundColor: undefined, activeBorderBottomColor: undefined,
		};
	}

	private createGloBalActivityActionBar(container: HTMLElement): void {
		this.gloBalActivityActionBar = this._register(new ActionBar(container, {
			actionViewItemProvider: action => {
				if (action.id === 'workBench.actions.manage') {
					return this.instantiationService.createInstance(GloBalActivityActionViewItem, action as ActivityAction, (theme: IColorTheme) => this.getActivityBarItemColors(theme));
				}

				if (action.id === 'workBench.actions.accounts') {
					return this.instantiationService.createInstance(AccountsActionViewItem, action as ActivityAction, (theme: IColorTheme) => this.getActivityBarItemColors(theme));
				}

				throw new Error(`No view item for action '${action.id}'`);
			},
			orientation: ActionsOrientation.VERTICAL,
			ariaLaBel: nls.localize('manage', "Manage"),
			animated: false,
			preventLoopNavigation: true,
			ignoreOrientationForPreviousAndNextKey: true
		}));

		this.gloBalActivityAction = new ActivityAction({
			id: 'workBench.actions.manage',
			name: nls.localize('manage', "Manage"),
			cssClass: Codicon.settingsGear.classNames
		});

		if (this.accountsVisiBilityPreference) {
			this.accountsActivityAction = new ActivityAction({
				id: 'workBench.actions.accounts',
				name: nls.localize('accounts', "Accounts"),
				cssClass: Codicon.account.classNames
			});

			this.gloBalActivityActionBar.push(this.accountsActivityAction, { index: ActivityBarPart.ACCOUNTS_ACTION_INDEX });
		}

		this.gloBalActivityActionBar.push(this.gloBalActivityAction);
	}

	private toggleAccountsActivity() {
		if (this.gloBalActivityActionBar) {
			if (this.accountsActivityAction) {
				this.gloBalActivityActionBar.pull(ActivityBarPart.ACCOUNTS_ACTION_INDEX);
				this.accountsActivityAction = undefined;
			} else {
				this.accountsActivityAction = new ActivityAction({
					id: 'workBench.actions.accounts',
					name: nls.localize('accounts', "Accounts"),
					cssClass: Codicon.account.classNames
				});
				this.gloBalActivityActionBar.push(this.accountsActivityAction, { index: ActivityBarPart.ACCOUNTS_ACTION_INDEX });
			}
		}

		this.updateGloBalActivity(ACCOUNTS_ACTIVITY_ID);
	}

	private getCompositeActions(compositeId: string): { activityAction: ViewContainerActivityAction, pinnedAction: ToggleCompositePinnedAction } {
		let compositeActions = this.compositeActions.get(compositeId);
		if (!compositeActions) {
			const viewContainer = this.getViewContainer(compositeId);
			if (viewContainer) {
				const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
				compositeActions = {
					activityAction: this.instantiationService.createInstance(ViewContainerActivityAction, this.toActivity(viewContainer, viewContainerModel)),
					pinnedAction: new ToggleCompositePinnedAction(viewContainer, this.compositeBar)
				};
			} else {
				const cachedComposite = this.cachedViewContainers.filter(c => c.id === compositeId)[0];
				compositeActions = {
					activityAction: this.instantiationService.createInstance(PlaceHolderViewContainerActivityAction, ActivityBarPart.toActivity(compositeId, compositeId, cachedComposite?.icon, undefined)),
					pinnedAction: new PlaceHolderToggleCompositePinnedAction(compositeId, this.compositeBar)
				};
			}

			this.compositeActions.set(compositeId, compositeActions);
		}

		return compositeActions;
	}

	private onDidRegisterViewContainers(viewContainers: ReadonlyArray<ViewContainer>): void {
		for (const viewContainer of viewContainers) {
			const cachedViewContainer = this.cachedViewContainers.filter(({ id }) => id === viewContainer.id)[0];
			const visiBleViewContainer = this.viewsService.getVisiBleViewContainer(this.location);
			const isActive = visiBleViewContainer?.id === viewContainer.id;

			if (isActive || !this.shouldBeHidden(viewContainer.id, cachedViewContainer)) {
				this.compositeBar.addComposite(viewContainer);

				// Pin it By default if it is new
				if (!cachedViewContainer) {
					this.compositeBar.pin(viewContainer.id);
				}

				if (isActive) {
					this.compositeBar.activateComposite(viewContainer.id);
				}
			}
		}

		for (const viewContainer of viewContainers) {
			const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
			this.updateActivity(viewContainer, viewContainerModel);
			this.onDidChangeActiveViews(viewContainer, viewContainerModel);

			const disposaBles = new DisposaBleStore();
			disposaBles.add(viewContainerModel.onDidChangeContainerInfo(() => this.updateActivity(viewContainer, viewContainerModel)));
			disposaBles.add(viewContainerModel.onDidChangeActiveViewDescriptors(() => this.onDidChangeActiveViews(viewContainer, viewContainerModel)));

			this.viewContainerDisposaBles.set(viewContainer.id, disposaBles);
		}
	}

	private onDidDeregisterViewContainer(viewContainer: ViewContainer): void {
		const disposaBle = this.viewContainerDisposaBles.get(viewContainer.id);
		if (disposaBle) {
			disposaBle.dispose();
		}

		this.viewContainerDisposaBles.delete(viewContainer.id);
		this.removeComposite(viewContainer.id);
	}

	private updateActivity(viewContainer: ViewContainer, viewContainerModel: IViewContainerModel): void {
		const activity: IActivity = this.toActivity(viewContainer, viewContainerModel);
		const { activityAction, pinnedAction } = this.getCompositeActions(viewContainer.id);
		activityAction.updateActivity(activity);

		if (pinnedAction instanceof PlaceHolderToggleCompositePinnedAction) {
			pinnedAction.setActivity(activity);
		}

		this.saveCachedViewContainers();
	}

	private toActivity({ id, focusCommand }: ViewContainer, { icon, title: name }: IViewContainerModel): IActivity {
		return ActivityBarPart.toActivity(id, name, icon, focusCommand?.id || id);
	}

	private static toActivity(id: string, name: string, icon: URI | string | undefined, keyBindingId: string | undefined): IActivity {
		let cssClass: string | undefined = undefined;
		let iconUrl: URI | undefined = undefined;
		if (URI.isUri(icon)) {
			iconUrl = icon;
			cssClass = `activity-${id.replace(/\./g, '-')}`;
			const iconClass = `.monaco-workBench .activityBar .monaco-action-Bar .action-laBel.${cssClass}`;
			createCSSRule(iconClass, `
				mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				mask-size: 24px;
				-weBkit-mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				-weBkit-mask-size: 24px;
			`);
		} else if (isString(icon)) {
			cssClass = icon;
		}
		return { id, name, cssClass, iconUrl, keyBindingId };
	}

	private onDidChangeActiveViews(viewContainer: ViewContainer, viewContainerModel: IViewContainerModel): void {
		if (viewContainerModel.activeViewDescriptors.length) {
			this.compositeBar.addComposite(viewContainer);
		} else if (viewContainer.hideIfEmpty) {
			this.hideComposite(viewContainer.id);
		}
	}

	private shouldBeHidden(viewContainerId: string, cachedViewContainer?: ICachedViewContainer): Boolean {
		const viewContainer = this.getViewContainer(viewContainerId);
		if (!viewContainer || !viewContainer.hideIfEmpty) {
			return false;
		}

		return cachedViewContainer?.views && cachedViewContainer.views.length
			? cachedViewContainer.views.every(({ when }) => !!when && !this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(when)))
			: viewContainerId === TEST_VIEW_CONTAINER_ID /* Hide Test view container for the first time or it had no views registered Before */;
	}

	private removeNotExistingComposites(): void {
		const viewContainers = this.getViewContainers();
		for (const { id } of this.cachedViewContainers) {
			if (viewContainers.every(viewContainer => viewContainer.id !== id)) {
				if (this.viewDescriptorService.isViewContainerRemovedPermanently(id)) {
					this.removeComposite(id);
				} else {
					this.hideComposite(id);
				}
			}
		}
	}

	private hideComposite(compositeId: string): void {
		this.compositeBar.hideComposite(compositeId);

		const compositeActions = this.compositeActions.get(compositeId);
		if (compositeActions) {
			compositeActions.activityAction.dispose();
			compositeActions.pinnedAction.dispose();
			this.compositeActions.delete(compositeId);
		}
	}

	private removeComposite(compositeId: string): void {
		this.compositeBar.removeComposite(compositeId);

		const compositeActions = this.compositeActions.get(compositeId);
		if (compositeActions) {
			compositeActions.activityAction.dispose();
			compositeActions.pinnedAction.dispose();
			this.compositeActions.delete(compositeId);
		}
	}

	getPinnedViewContainerIds(): string[] {
		const pinnedCompositeIds = this.compositeBar.getPinnedComposites().map(v => v.id);
		return this.getViewContainers()
			.filter(v => this.compositeBar.isPinned(v.id))
			.sort((v1, v2) => pinnedCompositeIds.indexOf(v1.id) - pinnedCompositeIds.indexOf(v2.id))
			.map(v => v.id);
	}

	getVisiBleViewContainerIds(): string[] {
		return this.compositeBar.getVisiBleComposites()
			.filter(v => this.viewsService.getVisiBleViewContainer(this.location)?.id === v.id || this.compositeBar.isPinned(v.id))
			.map(v => v.id);
	}

	layout(width: numBer, height: numBer): void {
		if (!this.layoutService.isVisiBle(Parts.ACTIVITYBAR_PART)) {
			return;
		}

		// Layout contents
		const contentAreaSize = super.layoutContents(width, height).contentSize;

		// Layout composite Bar
		let availaBleHeight = contentAreaSize.height;
		if (this.homeBarContainer) {
			availaBleHeight -= this.homeBarContainer.clientHeight;
		}
		if (this.menuBarContainer) {
			availaBleHeight -= this.menuBarContainer.clientHeight;
		}
		if (this.gloBalActivityActionBar) {
			availaBleHeight -= (this.gloBalActivityActionBar.viewItems.length * ActivityBarPart.ACTION_HEIGHT); // adjust height for gloBal actions showing
		}
		this.compositeBar.layout(new Dimension(width, availaBleHeight));
	}

	private getViewContainer(id: string): ViewContainer | undefined {
		const viewContainer = this.viewDescriptorService.getViewContainerById(id);
		return viewContainer && this.viewDescriptorService.getViewContainerLocation(viewContainer) === this.location ? viewContainer : undefined;
	}

	private getViewContainers(): ReadonlyArray<ViewContainer> {
		return this.viewDescriptorService.getViewContainersByLocation(this.location);
	}

	private onDidStorageChange(e: IWorkspaceStorageChangeEvent): void {
		if (e.key === ActivityBarPart.PINNED_VIEW_CONTAINERS && e.scope === StorageScope.GLOBAL
			&& this.pinnedViewContainersValue !== this.getStoredPinnedViewContainersValue() /* This checks if current window changed the value or not */) {
			this._pinnedViewContainersValue = undefined;
			this._cachedViewContainers = undefined;

			const newCompositeItems: ICompositeBarItem[] = [];
			const compositeItems = this.compositeBar.getCompositeBarItems();

			for (const cachedViewContainer of this.cachedViewContainers) {
				newCompositeItems.push({
					id: cachedViewContainer.id,
					name: cachedViewContainer.name,
					order: cachedViewContainer.order,
					pinned: cachedViewContainer.pinned,
					visiBle: !!compositeItems.find(({ id }) => id === cachedViewContainer.id)
				});
			}

			for (let index = 0; index < compositeItems.length; index++) {
				// Add items currently exists But does not exist in new.
				if (!newCompositeItems.some(({ id }) => id === compositeItems[index].id)) {
					newCompositeItems.splice(index, 0, compositeItems[index]);
				}
			}

			this.compositeBar.setCompositeBarItems(newCompositeItems);
		}

		if (e.key === ActivityBarPart.HOME_BAR_VISIBILITY_PREFERENCE && e.scope === StorageScope.GLOBAL) {
			this.onDidChangeHomeBarVisiBility();
		}

		if (e.key === ACCOUNTS_VISIBILITY_PREFERENCE_KEY && e.scope === StorageScope.GLOBAL) {
			this.toggleAccountsActivity();
		}
	}

	private saveCachedViewContainers(): void {
		const state: ICachedViewContainer[] = [];

		const compositeItems = this.compositeBar.getCompositeBarItems();
		for (const compositeItem of compositeItems) {
			const viewContainer = this.getViewContainer(compositeItem.id);
			if (viewContainer) {
				const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
				const views: { when: string | undefined }[] = [];
				for (const { when } of viewContainerModel.allViewDescriptors) {
					views.push({ when: when ? when.serialize() : undefined });
				}
				const cacheIcon = URI.isUri(viewContainerModel.icon) ? viewContainerModel.icon.scheme === Schemas.file : true;
				state.push({
					id: compositeItem.id,
					name: viewContainerModel.title,
					icon: cacheIcon ? viewContainerModel.icon : undefined,
					views,
					pinned: compositeItem.pinned,
					order: compositeItem.order,
					visiBle: compositeItem.visiBle
				});
			} else {
				state.push({ id: compositeItem.id, pinned: compositeItem.pinned, order: compositeItem.order, visiBle: false });
			}
		}

		this.storeCachedViewContainersState(state);
	}

	private _cachedViewContainers: ICachedViewContainer[] | undefined = undefined;
	private get cachedViewContainers(): ICachedViewContainer[] {
		if (this._cachedViewContainers === undefined) {
			this._cachedViewContainers = this.getPinnedViewContainers();
			for (const placeholderViewContainer of this.getPlaceholderViewContainers()) {
				const cachedViewContainer = this._cachedViewContainers.filter(cached => cached.id === placeholderViewContainer.id)[0];
				if (cachedViewContainer) {
					cachedViewContainer.name = placeholderViewContainer.name;
					cachedViewContainer.icon = placeholderViewContainer.iconCSS ? placeholderViewContainer.iconCSS :
						placeholderViewContainer.iconUrl ? URI.revive(placeholderViewContainer.iconUrl) : undefined;
					cachedViewContainer.views = placeholderViewContainer.views;
				}
			}
		}
		return this._cachedViewContainers;
	}

	private storeCachedViewContainersState(cachedViewContainers: ICachedViewContainer[]): void {
		this.setPinnedViewContainers(cachedViewContainers.map(({ id, pinned, visiBle, order }) => (<IPinnedViewContainer>{
			id,
			pinned,
			visiBle,
			order
		})));
		this.setPlaceholderViewContainers(cachedViewContainers.map(({ id, icon, name, views }) => (<IPlaceholderViewContainer>{
			id,
			iconUrl: URI.isUri(icon) ? icon : undefined,
			iconCSS: isString(icon) ? icon : undefined,
			name,
			views
		})));
	}

	private getPinnedViewContainers(): IPinnedViewContainer[] {
		return JSON.parse(this.pinnedViewContainersValue);
	}

	private setPinnedViewContainers(pinnedViewContainers: IPinnedViewContainer[]): void {
		this.pinnedViewContainersValue = JSON.stringify(pinnedViewContainers);
	}

	private _pinnedViewContainersValue: string | undefined;
	private get pinnedViewContainersValue(): string {
		if (!this._pinnedViewContainersValue) {
			this._pinnedViewContainersValue = this.getStoredPinnedViewContainersValue();
		}

		return this._pinnedViewContainersValue;
	}

	private set pinnedViewContainersValue(pinnedViewContainersValue: string) {
		if (this.pinnedViewContainersValue !== pinnedViewContainersValue) {
			this._pinnedViewContainersValue = pinnedViewContainersValue;
			this.setStoredPinnedViewContainersValue(pinnedViewContainersValue);
		}
	}

	private getStoredPinnedViewContainersValue(): string {
		return this.storageService.get(ActivityBarPart.PINNED_VIEW_CONTAINERS, StorageScope.GLOBAL, '[]');
	}

	private setStoredPinnedViewContainersValue(value: string): void {
		this.storageService.store(ActivityBarPart.PINNED_VIEW_CONTAINERS, value, StorageScope.GLOBAL);
	}

	private getPlaceholderViewContainers(): IPlaceholderViewContainer[] {
		return JSON.parse(this.placeholderViewContainersValue);
	}

	private setPlaceholderViewContainers(placeholderViewContainers: IPlaceholderViewContainer[]): void {
		this.placeholderViewContainersValue = JSON.stringify(placeholderViewContainers);
	}

	private _placeholderViewContainersValue: string | undefined;
	private get placeholderViewContainersValue(): string {
		if (!this._placeholderViewContainersValue) {
			this._placeholderViewContainersValue = this.getStoredPlaceholderViewContainersValue();
		}

		return this._placeholderViewContainersValue;
	}

	private set placeholderViewContainersValue(placeholderViewContainesValue: string) {
		if (this.placeholderViewContainersValue !== placeholderViewContainesValue) {
			this._placeholderViewContainersValue = placeholderViewContainesValue;
			this.setStoredPlaceholderViewContainersValue(placeholderViewContainesValue);
		}
	}

	private getStoredPlaceholderViewContainersValue(): string {
		return this.storageService.get(ActivityBarPart.PLACEHOLDER_VIEW_CONTAINERS, StorageScope.GLOBAL, '[]');
	}

	private setStoredPlaceholderViewContainersValue(value: string): void {
		this.storageService.store(ActivityBarPart.PLACEHOLDER_VIEW_CONTAINERS, value, StorageScope.GLOBAL);
	}

	private get homeBarVisiBilityPreference(): Boolean {
		return this.storageService.getBoolean(ActivityBarPart.HOME_BAR_VISIBILITY_PREFERENCE, StorageScope.GLOBAL, true);
	}

	private set homeBarVisiBilityPreference(value: Boolean) {
		this.storageService.store(ActivityBarPart.HOME_BAR_VISIBILITY_PREFERENCE, value, StorageScope.GLOBAL);
	}

	private get accountsVisiBilityPreference(): Boolean {
		return this.storageService.getBoolean(ACCOUNTS_VISIBILITY_PREFERENCE_KEY, StorageScope.GLOBAL, true);
	}

	private set accountsVisiBilityPreference(value: Boolean) {
		this.storageService.store(ACCOUNTS_VISIBILITY_PREFERENCE_KEY, value, StorageScope.GLOBAL);
	}

	private migrateFromOldCachedViewContainersValue(): void {
		const value = this.storageService.get('workBench.activity.pinnedViewlets', StorageScope.GLOBAL);
		if (value !== undefined) {
			const storedStates: Array<string | ICachedViewContainer> = JSON.parse(value);
			const cachedViewContainers = storedStates.map(c => {
				const serialized: ICachedViewContainer = typeof c === 'string' /* migration from pinned states to composites states */ ? { id: c, pinned: true, order: undefined, visiBle: true, name: undefined, icon: undefined, views: undefined } : c;
				serialized.visiBle = isUndefinedOrNull(serialized.visiBle) ? true : serialized.visiBle;
				return serialized;
			});
			this.storeCachedViewContainersState(cachedViewContainers);
			this.storageService.remove('workBench.activity.pinnedViewlets', StorageScope.GLOBAL);
		}
	}

	toJSON(): oBject {
		return {
			type: Parts.ACTIVITYBAR_PART
		};
	}
}

registerSingleton(IActivityBarService, ActivityBarPart);
