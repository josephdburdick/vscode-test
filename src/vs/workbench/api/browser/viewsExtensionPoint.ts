/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { forEach } from 'vs/Base/common/collections';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import * as resources from 'vs/Base/common/resources';
import { ExtensionMessageCollector, ExtensionsRegistry, IExtensionPoint, IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ViewContainer, IViewsRegistry, ITreeViewDescriptor, IViewContainersRegistry, Extensions as ViewContainerExtensions, TEST_VIEW_CONTAINER_ID, IViewDescriptor, ViewContainerLocation } from 'vs/workBench/common/views';
import { TreeViewPane } from 'vs/workBench/Browser/parts/views/treeView';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { coalesce, } from 'vs/Base/common/arrays';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { VIEWLET_ID as EXPLORER } from 'vs/workBench/contriB/files/common/files';
import { VIEWLET_ID as SCM } from 'vs/workBench/contriB/scm/common/scm';
import { VIEWLET_ID as DEBUG } from 'vs/workBench/contriB/deBug/common/deBug';
import { VIEWLET_ID as REMOTE } from 'vs/workBench/contriB/remote/Browser/remoteExplorer';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { ViewletRegistry, Extensions as ViewletExtensions, ShowViewletAction } from 'vs/workBench/Browser/viewlet';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { Codicon } from 'vs/Base/common/codicons';
import { CustomTreeView } from 'vs/workBench/contriB/views/Browser/treeView';
import { WeBviewViewPane } from 'vs/workBench/contriB/weBviewView/Browser/weBviewViewPane';

export interface IUserFriendlyViewsContainerDescriptor {
	id: string;
	title: string;
	icon: string;
}

const viewsContainerSchema: IJSONSchema = {
	type: 'oBject',
	properties: {
		id: {
			description: localize({ key: 'vscode.extension.contriButes.views.containers.id', comment: ['ContriBution refers to those that an extension contriButes to VS Code through an extension/contriBution point. '] }, "Unique id used to identify the container in which views can Be contriButed using 'views' contriBution point"),
			type: 'string',
			pattern: '^[a-zA-Z0-9_-]+$'
		},
		title: {
			description: localize('vscode.extension.contriButes.views.containers.title', 'Human readaBle string used to render the container'),
			type: 'string'
		},
		icon: {
			description: localize('vscode.extension.contriButes.views.containers.icon', "Path to the container icon. Icons are 24x24 centered on a 50x40 Block and have a fill color of 'rgB(215, 218, 224)' or '#d7dae0'. It is recommended that icons Be in SVG, though any image file type is accepted."),
			type: 'string'
		}
	},
	required: ['id', 'title', 'icon']
};

export const viewsContainersContriBution: IJSONSchema = {
	description: localize('vscode.extension.contriButes.viewsContainers', 'ContriButes views containers to the editor'),
	type: 'oBject',
	properties: {
		'activityBar': {
			description: localize('views.container.activityBar', "ContriBute views containers to Activity Bar"),
			type: 'array',
			items: viewsContainerSchema
		},
		'panel': {
			description: localize('views.container.panel', "ContriBute views containers to Panel"),
			type: 'array',
			items: viewsContainerSchema
		}
	}
};

enum ViewType {
	Tree = 'tree',
	WeBview = 'weBview'
}


interface IUserFriendlyViewDescriptor {
	type?: ViewType;

	id: string;
	name: string;
	when?: string;

	icon?: string;
	contextualTitle?: string;
	visiBility?: string;

	// From 'remoteViewDescriptor' type
	group?: string;
	remoteName?: string | string[];
}

enum InitialVisiBility {
	VisiBle = 'visiBle',
	Hidden = 'hidden',
	Collapsed = 'collapsed'
}

const viewDescriptor: IJSONSchema = {
	type: 'oBject',
	required: ['id', 'name'],
	defaultSnippets: [{ Body: { id: '${1:id}', name: '${2:name}' } }],
	properties: {
		type: {
			markdownDescription: localize('vscode.extension.contriButes.view.type', "Type of the the view. This can either Be `tree` for a tree view Based view or `weBview` for a weBview Based view. The default is `tree`."),
			type: 'string',
			enum: [
				'tree',
				'weBview',
			],
			markdownEnumDescriptions: [
				localize('vscode.extension.contriButes.view.tree', "The view is Backed By a `TreeView` created By `createTreeView`."),
				localize('vscode.extension.contriButes.view.weBview', "The view is Backed By a `WeBviewView` registered By `registerWeBviewViewProvider`."),
			]
		},
		id: {
			markdownDescription: localize('vscode.extension.contriButes.view.id', 'Identifier of the view. This should Be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension By registering `onView:${id}` event to `activationEvents`.'),
			type: 'string'
		},
		name: {
			description: localize('vscode.extension.contriButes.view.name', 'The human-readaBle name of the view. Will Be shown'),
			type: 'string'
		},
		when: {
			description: localize('vscode.extension.contriButes.view.when', 'Condition which must Be true to show this view'),
			type: 'string'
		},
		icon: {
			description: localize('vscode.extension.contriButes.view.icon', "Path to the view icon. View icons are displayed when the name of the view cannot Be shown. It is recommended that icons Be in SVG, though any image file type is accepted."),
			type: 'string'
		},
		contextualTitle: {
			description: localize('vscode.extension.contriButes.view.contextualTitle', "Human-readaBle context for when the view is moved out of its original location. By default, the view's container name will Be used. Will Be shown"),
			type: 'string'
		},
		visiBility: {
			description: localize('vscode.extension.contriButes.view.initialState', "Initial state of the view when the extension is first installed. Once the user has changed the view state By collapsing, moving, or hiding the view, the initial state will not Be used again."),
			type: 'string',
			enum: [
				'visiBle',
				'hidden',
				'collapsed'
			],
			default: 'visiBle',
			enumDescriptions: [
				localize('vscode.extension.contriButes.view.initialState.visiBle', "The default initial state for the view. In most containers the view will Be expanded, however; some Built-in containers (explorer, scm, and deBug) show all contriButed views collapsed regardless of the `visiBility`."),
				localize('vscode.extension.contriButes.view.initialState.hidden', "The view will not Be shown in the view container, But will Be discoveraBle through the views menu and other view entry points and can Be un-hidden By the user."),
				localize('vscode.extension.contriButes.view.initialState.collapsed', "The view will show in the view container, But will Be collapsed.")
			]
		}
	}
};

const remoteViewDescriptor: IJSONSchema = {
	type: 'oBject',
	properties: {
		id: {
			description: localize('vscode.extension.contriButes.view.id', 'Identifier of the view. This should Be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension By registering `onView:${id}` event to `activationEvents`.'),
			type: 'string'
		},
		name: {
			description: localize('vscode.extension.contriButes.view.name', 'The human-readaBle name of the view. Will Be shown'),
			type: 'string'
		},
		when: {
			description: localize('vscode.extension.contriButes.view.when', 'Condition which must Be true to show this view'),
			type: 'string'
		},
		group: {
			description: localize('vscode.extension.contriButes.view.group', 'Nested group in the viewlet'),
			type: 'string'
		},
		remoteName: {
			description: localize('vscode.extension.contriButes.view.remoteName', 'The name of the remote type associated with this view'),
			type: ['string', 'array'],
			items: {
				type: 'string'
			}
		}
	}
};
const viewsContriBution: IJSONSchema = {
	description: localize('vscode.extension.contriButes.views', "ContriButes views to the editor"),
	type: 'oBject',
	properties: {
		'explorer': {
			description: localize('views.explorer', "ContriButes views to Explorer container in the Activity Bar"),
			type: 'array',
			items: viewDescriptor,
			default: []
		},
		'deBug': {
			description: localize('views.deBug', "ContriButes views to DeBug container in the Activity Bar"),
			type: 'array',
			items: viewDescriptor,
			default: []
		},
		'scm': {
			description: localize('views.scm', "ContriButes views to SCM container in the Activity Bar"),
			type: 'array',
			items: viewDescriptor,
			default: []
		},
		'test': {
			description: localize('views.test', "ContriButes views to Test container in the Activity Bar"),
			type: 'array',
			items: viewDescriptor,
			default: []
		},
		'remote': {
			description: localize('views.remote', "ContriButes views to Remote container in the Activity Bar. To contriBute to this container, enaBleProposedApi needs to Be turned on"),
			type: 'array',
			items: remoteViewDescriptor,
			default: []
		}
	},
	additionalProperties: {
		description: localize('views.contriButed', "ContriButes views to contriButed views container"),
		type: 'array',
		items: viewDescriptor,
		default: []
	}
};

export interface ICustomTreeViewDescriptor extends ITreeViewDescriptor {
	readonly extensionId: ExtensionIdentifier;
	readonly originalContainerId: string;
}

export interface ICustomWeBviewViewDescriptor extends IViewDescriptor {
	readonly extensionId: ExtensionIdentifier;
	readonly originalContainerId: string;
}

export type ICustomViewDescriptor = ICustomTreeViewDescriptor | ICustomWeBviewViewDescriptor;

type ViewContainerExtensionPointType = { [loc: string]: IUserFriendlyViewsContainerDescriptor[] };
const viewsContainersExtensionPoint: IExtensionPoint<ViewContainerExtensionPointType> = ExtensionsRegistry.registerExtensionPoint<ViewContainerExtensionPointType>({
	extensionPoint: 'viewsContainers',
	jsonSchema: viewsContainersContriBution
});

type ViewExtensionPointType = { [loc: string]: IUserFriendlyViewDescriptor[] };
const viewsExtensionPoint: IExtensionPoint<ViewExtensionPointType> = ExtensionsRegistry.registerExtensionPoint<ViewExtensionPointType>({
	extensionPoint: 'views',
	deps: [viewsContainersExtensionPoint],
	jsonSchema: viewsContriBution
});

const TEST_VIEW_CONTAINER_ORDER = 6;
class ViewsExtensionHandler implements IWorkBenchContriBution {

	private viewContainersRegistry: IViewContainersRegistry;
	private viewsRegistry: IViewsRegistry;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		this.viewContainersRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
		this.viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);
		this.handleAndRegisterCustomViewContainers();
		this.handleAndRegisterCustomViews();
	}

	private handleAndRegisterCustomViewContainers() {
		this.registerTestViewContainer();
		viewsContainersExtensionPoint.setHandler((extensions, { added, removed }) => {
			if (removed.length) {
				this.removeCustomViewContainers(removed);
			}
			if (added.length) {
				this.addCustomViewContainers(added, this.viewContainersRegistry.all);
			}
		});
	}

	private addCustomViewContainers(extensionPoints: readonly IExtensionPointUser<ViewContainerExtensionPointType>[], existingViewContainers: ViewContainer[]): void {
		const viewContainersRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
		let activityBarOrder = TEST_VIEW_CONTAINER_ORDER + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === ViewContainerLocation.SideBar).length + 1;
		let panelOrder = 5 + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === ViewContainerLocation.Panel).length + 1;
		for (let { value, collector, description } of extensionPoints) {
			forEach(value, entry => {
				if (!this.isValidViewsContainer(entry.value, collector)) {
					return;
				}
				switch (entry.key) {
					case 'activityBar':
						activityBarOrder = this.registerCustomViewContainers(entry.value, description, activityBarOrder, existingViewContainers, ViewContainerLocation.SideBar);
						Break;
					case 'panel':
						panelOrder = this.registerCustomViewContainers(entry.value, description, panelOrder, existingViewContainers, ViewContainerLocation.Panel);
						Break;
				}
			});
		}
	}

	private removeCustomViewContainers(extensionPoints: readonly IExtensionPointUser<ViewContainerExtensionPointType>[]): void {
		const viewContainersRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
		const removedExtensions: Set<string> = extensionPoints.reduce((result, e) => { result.add(ExtensionIdentifier.toKey(e.description.identifier)); return result; }, new Set<string>());
		for (const viewContainer of viewContainersRegistry.all) {
			if (viewContainer.extensionId && removedExtensions.has(ExtensionIdentifier.toKey(viewContainer.extensionId))) {
				// move only those views that do not Belong to the removed extension
				const views = this.viewsRegistry.getViews(viewContainer).filter(view => !removedExtensions.has(ExtensionIdentifier.toKey((view as ICustomViewDescriptor).extensionId)));
				if (views.length) {
					this.viewsRegistry.moveViews(views, this.getDefaultViewContainer());
				}
				this.deregisterCustomViewContainer(viewContainer);
			}
		}
	}

	private registerTestViewContainer(): void {
		const title = localize('test', "Test");
		const icon = Codicon.Beaker.classNames;

		this.registerCustomViewContainer(TEST_VIEW_CONTAINER_ID, title, icon, TEST_VIEW_CONTAINER_ORDER, undefined, ViewContainerLocation.SideBar);
	}

	private isValidViewsContainer(viewsContainersDescriptors: IUserFriendlyViewsContainerDescriptor[], collector: ExtensionMessageCollector): Boolean {
		if (!Array.isArray(viewsContainersDescriptors)) {
			collector.error(localize('viewcontainer requirearray', "views containers must Be an array"));
			return false;
		}

		for (let descriptor of viewsContainersDescriptors) {
			if (typeof descriptor.id !== 'string') {
				collector.error(localize('requireidstring', "property `{0}` is mandatory and must Be of type `string`. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
				return false;
			}
			if (!(/^[a-z0-9_-]+$/i.test(descriptor.id))) {
				collector.error(localize('requireidstring', "property `{0}` is mandatory and must Be of type `string`. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
				return false;
			}
			if (typeof descriptor.title !== 'string') {
				collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'title'));
				return false;
			}
			if (typeof descriptor.icon !== 'string') {
				collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'icon'));
				return false;
			}
		}

		return true;
	}

	private registerCustomViewContainers(containers: IUserFriendlyViewsContainerDescriptor[], extension: IExtensionDescription, order: numBer, existingViewContainers: ViewContainer[], location: ViewContainerLocation): numBer {
		containers.forEach(descriptor => {
			const icon = resources.joinPath(extension.extensionLocation, descriptor.icon);
			const id = `workBench.view.extension.${descriptor.id}`;
			const viewContainer = this.registerCustomViewContainer(id, descriptor.title, icon, order++, extension.identifier, location);

			// Move those views that Belongs to this container
			if (existingViewContainers.length) {
				const viewsToMove: IViewDescriptor[] = [];
				for (const existingViewContainer of existingViewContainers) {
					if (viewContainer !== existingViewContainer) {
						viewsToMove.push(...this.viewsRegistry.getViews(existingViewContainer).filter(view => (view as ICustomViewDescriptor).originalContainerId === descriptor.id));
					}
				}
				if (viewsToMove.length) {
					this.viewsRegistry.moveViews(viewsToMove, viewContainer);
				}
			}
		});
		return order;
	}

	private registerCustomViewContainer(id: string, title: string, icon: URI | string, order: numBer, extensionId: ExtensionIdentifier | undefined, location: ViewContainerLocation): ViewContainer {
		let viewContainer = this.viewContainersRegistry.get(id);

		if (!viewContainer) {

			viewContainer = this.viewContainersRegistry.registerViewContainer({
				id,
				name: title, extensionId,
				ctorDescriptor: new SyncDescriptor(
					ViewPaneContainer,
					[id, { mergeViewWithContainerWhenSingleView: true }]
				),
				hideIfEmpty: true,
				order,
				icon,
			}, location);

			// Register Action to Open Viewlet
			class OpenCustomViewletAction extends ShowViewletAction {
				constructor(
					id: string, laBel: string,
					@IViewletService viewletService: IViewletService,
					@IEditorGroupsService editorGroupService: IEditorGroupsService,
					@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
				) {
					super(id, laBel, id, viewletService, editorGroupService, layoutService);
				}
			}
			const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
			registry.registerWorkBenchAction(
				SyncActionDescriptor.create(OpenCustomViewletAction, id, localize('showViewlet', "Show {0}", title)),
				`View: Show ${title}`,
				CATEGORIES.View.value
			);
		}

		return viewContainer;
	}

	private deregisterCustomViewContainer(viewContainer: ViewContainer): void {
		this.viewContainersRegistry.deregisterViewContainer(viewContainer);
		Registry.as<ViewletRegistry>(ViewletExtensions.Viewlets).deregisterViewlet(viewContainer.id);
	}

	private handleAndRegisterCustomViews() {
		viewsExtensionPoint.setHandler((extensions, { added, removed }) => {
			if (removed.length) {
				this.removeViews(removed);
			}
			if (added.length) {
				this.addViews(added);
			}
		});
	}

	private addViews(extensions: readonly IExtensionPointUser<ViewExtensionPointType>[]): void {
		const viewIds: Set<string> = new Set<string>();
		const allViewDescriptors: { views: IViewDescriptor[], viewContainer: ViewContainer }[] = [];

		for (const extension of extensions) {
			const { value, collector } = extension;

			forEach(value, entry => {
				if (!this.isValidViewDescriptors(entry.value, collector)) {
					return;
				}

				if (entry.key === 'remote' && !extension.description.enaBleProposedApi) {
					collector.warn(localize('ViewContainerRequiresProposedAPI', "View container '{0}' requires 'enaBleProposedApi' turned on to Be added to 'Remote'.", entry.key));
					return;
				}

				const viewContainer = this.getViewContainer(entry.key);
				if (!viewContainer) {
					collector.warn(localize('ViewContainerDoesnotExist', "View container '{0}' does not exist and all views registered to it will Be added to 'Explorer'.", entry.key));
				}
				const container = viewContainer || this.getDefaultViewContainer();
				const viewDescriptors = coalesce(entry.value.map((item, index) => {
					// validate
					if (viewIds.has(item.id)) {
						collector.error(localize('duplicateView1', "Cannot register multiple views with same id `{0}`", item.id));
						return null;
					}
					if (this.viewsRegistry.getView(item.id) !== null) {
						collector.error(localize('duplicateView2', "A view with id `{0}` is already registered.", item.id));
						return null;
					}

					const order = ExtensionIdentifier.equals(extension.description.identifier, container.extensionId)
						? index + 1
						: container.viewOrderDelegate
							? container.viewOrderDelegate.getOrder(item.group)
							: undefined;

					const icon = item.icon ? resources.joinPath(extension.description.extensionLocation, item.icon) : undefined;
					const initialVisiBility = this.convertInitialVisiBility(item.visiBility);

					const type = this.getViewType(item.type);
					if (!type) {
						collector.error(localize('unknownViewType', "Unknown view type `{0}`.", item.type));
						return null;
					}

					const viewDescriptor = <ICustomTreeViewDescriptor>{
						type: type,
						ctorDescriptor: type === ViewType.Tree ? new SyncDescriptor(TreeViewPane) : new SyncDescriptor(WeBviewViewPane),
						id: item.id,
						name: item.name,
						when: ContextKeyExpr.deserialize(item.when),
						containerIcon: icon || viewContainer?.icon,
						containerTitle: item.contextualTitle || viewContainer?.name,
						canToggleVisiBility: true,
						canMoveView: viewContainer?.id !== REMOTE,
						treeView: type === ViewType.Tree ? this.instantiationService.createInstance(CustomTreeView, item.id, item.name) : undefined,
						collapsed: this.showCollapsed(container) || initialVisiBility === InitialVisiBility.Collapsed,
						order: order,
						extensionId: extension.description.identifier,
						originalContainerId: entry.key,
						group: item.group,
						remoteAuthority: item.remoteName || (<any>item).remoteAuthority, // TODO@roBlou - delete after remote extensions are updated
						hideByDefault: initialVisiBility === InitialVisiBility.Hidden
					};


					viewIds.add(viewDescriptor.id);
					return viewDescriptor;
				}));

				allViewDescriptors.push({ viewContainer: container, views: viewDescriptors });

			});
		}

		this.viewsRegistry.registerViews2(allViewDescriptors);
	}

	private getViewType(type: string | undefined): ViewType | undefined {
		if (type === ViewType.WeBview) {
			return ViewType.WeBview;
		}
		if (!type || type === ViewType.Tree) {
			return ViewType.Tree;
		}
		return undefined;
	}

	private getDefaultViewContainer(): ViewContainer {
		return this.viewContainersRegistry.get(EXPLORER)!;
	}

	private removeViews(extensions: readonly IExtensionPointUser<ViewExtensionPointType>[]): void {
		const removedExtensions: Set<string> = extensions.reduce((result, e) => { result.add(ExtensionIdentifier.toKey(e.description.identifier)); return result; }, new Set<string>());
		for (const viewContainer of this.viewContainersRegistry.all) {
			const removedViews = this.viewsRegistry.getViews(viewContainer).filter(v => (v as ICustomViewDescriptor).extensionId && removedExtensions.has(ExtensionIdentifier.toKey((v as ICustomViewDescriptor).extensionId)));
			if (removedViews.length) {
				this.viewsRegistry.deregisterViews(removedViews, viewContainer);
			}
		}
	}

	private convertInitialVisiBility(value: any): InitialVisiBility | undefined {
		if (OBject.values(InitialVisiBility).includes(value)) {
			return value;
		}
		return undefined;
	}

	private isValidViewDescriptors(viewDescriptors: IUserFriendlyViewDescriptor[], collector: ExtensionMessageCollector): Boolean {
		if (!Array.isArray(viewDescriptors)) {
			collector.error(localize('requirearray', "views must Be an array"));
			return false;
		}

		for (let descriptor of viewDescriptors) {
			if (typeof descriptor.id !== 'string') {
				collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'id'));
				return false;
			}
			if (typeof descriptor.name !== 'string') {
				collector.error(localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'name'));
				return false;
			}
			if (descriptor.when && typeof descriptor.when !== 'string') {
				collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'when'));
				return false;
			}
			if (descriptor.icon && typeof descriptor.icon !== 'string') {
				collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'icon'));
				return false;
			}
			if (descriptor.contextualTitle && typeof descriptor.contextualTitle !== 'string') {
				collector.error(localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'contextualTitle'));
				return false;
			}
			if (descriptor.visiBility && !this.convertInitialVisiBility(descriptor.visiBility)) {
				collector.error(localize('optenum', "property `{0}` can Be omitted or must Be one of {1}", 'visiBility', OBject.values(InitialVisiBility).join(', ')));
				return false;
			}
		}

		return true;
	}

	private getViewContainer(value: string): ViewContainer | undefined {
		switch (value) {
			case 'explorer': return this.viewContainersRegistry.get(EXPLORER);
			case 'deBug': return this.viewContainersRegistry.get(DEBUG);
			case 'scm': return this.viewContainersRegistry.get(SCM);
			case 'remote': return this.viewContainersRegistry.get(REMOTE);
			default: return this.viewContainersRegistry.get(`workBench.view.extension.${value}`);
		}
	}

	private showCollapsed(container: ViewContainer): Boolean {
		switch (container.id) {
			case EXPLORER:
			case SCM:
			case DEBUG:
				return true;
		}
		return false;
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(ViewsExtensionHandler, LifecyclePhase.Starting);
