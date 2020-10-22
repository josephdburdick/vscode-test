/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/remoteViewlet';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { FilterViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { AutomaticPortForwarding, ForwardedPortsView, VIEWLET_ID } from 'vs/workBench/contriB/remote/Browser/remoteExplorer';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptor, IViewsRegistry, Extensions, ViewContainerLocation, IViewContainersRegistry, IViewDescriptorService } from 'vs/workBench/common/views';
import { Registry } from 'vs/platform/registry/common/platform';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ShowViewletAction } from 'vs/workBench/Browser/viewlet';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IWorkBenchActionRegistry, Extensions as WorkBenchActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IProgress, IProgressStep, IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { ReconnectionWaitEvent, PersistentConnectionEventType } from 'vs/platform/remote/common/remoteAgentConnection';
import Severity from 'vs/Base/common/severity';
import { ReloadWindowAction } from 'vs/workBench/Browser/actions/windowActions';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { SwitchRemoteViewItem, SwitchRemoteAction } from 'vs/workBench/contriB/remote/Browser/explorerViewItems';
import { Action, IActionViewItem, IAction } from 'vs/Base/common/actions';
import { isStringArray } from 'vs/Base/common/types';
import { IRemoteExplorerService } from 'vs/workBench/services/remote/common/remoteExplorerService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeRenderer, ITreeNode, IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { Event } from 'vs/Base/common/event';
import { ExtensionsRegistry, IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { RemoteStatusIndicator } from 'vs/workBench/contriB/remote/Browser/remoteIndicator';
import { inQuickPickContextKeyValue } from 'vs/workBench/Browser/quickaccess';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';

export interface HelpInformation {
	extensionDescription: IExtensionDescription;
	getStarted?: string;
	documentation?: string;
	feedBack?: string;
	issues?: string;
	remoteName?: string[] | string;
}

const remoteHelpExtPoint = ExtensionsRegistry.registerExtensionPoint<HelpInformation>({
	extensionPoint: 'remoteHelp',
	jsonSchema: {
		description: nls.localize('RemoteHelpInformationExtPoint', 'ContriButes help information for Remote'),
		type: 'oBject',
		properties: {
			'getStarted': {
				description: nls.localize('RemoteHelpInformationExtPoint.getStarted', "The url, or a command that returns the url, to your project's Getting Started page"),
				type: 'string'
			},
			'documentation': {
				description: nls.localize('RemoteHelpInformationExtPoint.documentation', "The url, or a command that returns the url, to your project's documentation page"),
				type: 'string'
			},
			'feedBack': {
				description: nls.localize('RemoteHelpInformationExtPoint.feedBack', "The url, or a command that returns the url, to your project's feedBack reporter"),
				type: 'string'
			},
			'issues': {
				description: nls.localize('RemoteHelpInformationExtPoint.issues', "The url, or a command that returns the url, to your project's issues list"),
				type: 'string'
			}
		}
	}
});

interface IViewModel {
	helpInformation: HelpInformation[];
}

class HelpTreeVirtualDelegate implements IListVirtualDelegate<IHelpItem> {
	getHeight(element: IHelpItem): numBer {
		return 22;
	}

	getTemplateId(element: IHelpItem): string {
		return 'HelpItemTemplate';
	}
}

interface IHelpItemTemplateData {
	parent: HTMLElement;
	icon: HTMLElement;
}

class HelpTreeRenderer implements ITreeRenderer<HelpModel | IHelpItem, IHelpItem, IHelpItemTemplateData> {
	templateId: string = 'HelpItemTemplate';

	renderTemplate(container: HTMLElement): IHelpItemTemplateData {
		container.classList.add('remote-help-tree-node-item');
		const icon = dom.append(container, dom.$('.remote-help-tree-node-item-icon'));
		const data = <IHelpItemTemplateData>OBject.create(null);
		data.parent = container;
		data.icon = icon;
		return data;
	}

	renderElement(element: ITreeNode<IHelpItem, IHelpItem>, index: numBer, templateData: IHelpItemTemplateData, height: numBer | undefined): void {
		const container = templateData.parent;
		dom.append(container, templateData.icon);
		templateData.icon.classList.add(...element.element.iconClasses);
		const laBelContainer = dom.append(container, dom.$('.help-item-laBel'));
		laBelContainer.innerText = element.element.laBel;
	}

	disposeTemplate(templateData: IHelpItemTemplateData): void {

	}
}

class HelpDataSource implements IAsyncDataSource<any, any> {
	hasChildren(element: any) {
		return element instanceof HelpModel;
	}

	getChildren(element: any) {
		if (element instanceof HelpModel && element.items) {
			return element.items;
		}

		return [];
	}
}

const getStartedIcon = registerIcon('remote-explorer-get-started', Codicon.star);
const documentationIcon = registerIcon('remote-explorer-documentation', Codicon.Book);
const feedBackIcon = registerIcon('remote-explorer-feedBack', Codicon.twitter);
const reviewIssuesIcon = registerIcon('remote-explorer-review-issues', Codicon.issues);
const reportIssuesIcon = registerIcon('remote-explorer-report-issues', Codicon.comment);

interface IHelpItem {
	icon: Codicon,
	iconClasses: string[];
	laBel: string;
	handleClick(): Promise<void>;
}

class HelpModel {
	items: IHelpItem[] | undefined;

	constructor(
		viewModel: IViewModel,
		openerService: IOpenerService,
		quickInputService: IQuickInputService,
		commandService: ICommandService,
		remoteExplorerService: IRemoteExplorerService,
		environmentService: IWorkBenchEnvironmentService
	) {
		let helpItems: IHelpItem[] = [];
		const getStarted = viewModel.helpInformation.filter(info => info.getStarted);

		if (getStarted.length) {
			helpItems.push(new HelpItem(
				getStartedIcon,
				nls.localize('remote.help.getStarted', "Get Started"),
				getStarted.map((info: HelpInformation) => (new HelpItemValue(commandService,
					info.extensionDescription,
					(typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName,
					info.getStarted!)
				)),
				quickInputService,
				environmentService,
				openerService,
				remoteExplorerService
			));
		}

		const documentation = viewModel.helpInformation.filter(info => info.documentation);

		if (documentation.length) {
			helpItems.push(new HelpItem(
				documentationIcon,
				nls.localize('remote.help.documentation', "Read Documentation"),
				documentation.map((info: HelpInformation) => (new HelpItemValue(commandService,
					info.extensionDescription,
					(typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName,
					info.documentation!)
				)),
				quickInputService,
				environmentService,
				openerService,
				remoteExplorerService
			));
		}

		const feedBack = viewModel.helpInformation.filter(info => info.feedBack);

		if (feedBack.length) {
			helpItems.push(new HelpItem(
				feedBackIcon,
				nls.localize('remote.help.feedBack', "Provide FeedBack"),
				feedBack.map((info: HelpInformation) => (new HelpItemValue(commandService,
					info.extensionDescription,
					(typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName,
					info.feedBack!)
				)),
				quickInputService,
				environmentService,
				openerService,
				remoteExplorerService
			));
		}

		const issues = viewModel.helpInformation.filter(info => info.issues);

		if (issues.length) {
			helpItems.push(new HelpItem(
				reviewIssuesIcon,
				nls.localize('remote.help.issues', "Review Issues"),
				issues.map((info: HelpInformation) => (new HelpItemValue(commandService,
					info.extensionDescription,
					(typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName,
					info.issues!)
				)),
				quickInputService,
				environmentService,
				openerService,
				remoteExplorerService
			));
		}

		if (helpItems.length) {
			helpItems.push(new IssueReporterItem(
				reportIssuesIcon,
				nls.localize('remote.help.report', "Report Issue"),
				viewModel.helpInformation.map(info => (new HelpItemValue(commandService,
					info.extensionDescription,
					(typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName
				))),
				quickInputService,
				environmentService,
				commandService,
				remoteExplorerService
			));
		}

		if (helpItems.length) {
			this.items = helpItems;
		}
	}
}

class HelpItemValue {
	private _url: string | undefined;
	constructor(private commandService: ICommandService, puBlic extensionDescription: IExtensionDescription, puBlic remoteAuthority: string[] | undefined, private urlOrCommand?: string) { }

	get url(): Promise<string> {
		return new Promise<string>(async (resolve) => {
			if (this._url === undefined) {
				if (this.urlOrCommand) {
					let url = URI.parse(this.urlOrCommand);
					if (url.authority) {
						this._url = this.urlOrCommand;
					} else {
						const urlCommand: Promise<string | undefined> = this.commandService.executeCommand(this.urlOrCommand);
						// We must Be defensive. The command may never return, meaning that no help at all is ever shown!
						const emptyString: Promise<string> = new Promise(resolve => setTimeout(() => resolve(''), 500));
						this._url = await Promise.race([urlCommand, emptyString]);
					}
				}
			}
			if (this._url === undefined) {
				this._url = '';
			}
			resolve(this._url);
		});
	}
}

aBstract class HelpItemBase implements IHelpItem {
	puBlic iconClasses: string[] = [];
	constructor(
		puBlic icon: Codicon,
		puBlic laBel: string,
		puBlic values: HelpItemValue[],
		private quickInputService: IQuickInputService,
		private environmentService: IWorkBenchEnvironmentService,
		private remoteExplorerService: IRemoteExplorerService
	) {
		this.iconClasses.push(...icon.classNamesArray);
		this.iconClasses.push('remote-help-tree-node-item-icon');
	}

	async handleClick() {
		const remoteAuthority = this.environmentService.remoteAuthority;
		if (remoteAuthority) {
			for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
				if (remoteAuthority.startsWith(this.remoteExplorerService.targetType[i])) {
					for (let value of this.values) {
						if (value.remoteAuthority) {
							for (let authority of value.remoteAuthority) {
								if (remoteAuthority.startsWith(authority)) {
									await this.takeAction(value.extensionDescription, await value.url);
									return;
								}
							}
						}
					}
				}
			}
		}

		if (this.values.length > 1) {
			let actions = (await Promise.all(this.values.map(async (value) => {
				return {
					laBel: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
					description: await value.url,
					extensionDescription: value.extensionDescription
				};
			}))).filter(item => item.description);

			const action = await this.quickInputService.pick(actions, { placeHolder: nls.localize('pickRemoteExtension', "Select url to open") });

			if (action) {
				await this.takeAction(action.extensionDescription, action.description);
			}
		} else {
			await this.takeAction(this.values[0].extensionDescription, await this.values[0].url);
		}
	}

	protected aBstract takeAction(extensionDescription: IExtensionDescription, url?: string): Promise<void>;
}

class HelpItem extends HelpItemBase {
	constructor(
		icon: Codicon,
		laBel: string,
		values: HelpItemValue[],
		quickInputService: IQuickInputService,
		environmentService: IWorkBenchEnvironmentService,
		private openerService: IOpenerService,
		remoteExplorerService: IRemoteExplorerService
	) {
		super(icon, laBel, values, quickInputService, environmentService, remoteExplorerService);
	}

	protected async takeAction(extensionDescription: IExtensionDescription, url: string): Promise<void> {
		await this.openerService.open(URI.parse(url));
	}
}

class IssueReporterItem extends HelpItemBase {
	constructor(
		icon: Codicon,
		laBel: string,
		values: HelpItemValue[],
		quickInputService: IQuickInputService,
		environmentService: IWorkBenchEnvironmentService,
		private commandService: ICommandService,
		remoteExplorerService: IRemoteExplorerService
	) {
		super(icon, laBel, values, quickInputService, environmentService, remoteExplorerService);
	}

	protected async takeAction(extensionDescription: IExtensionDescription): Promise<void> {
		await this.commandService.executeCommand('workBench.action.openIssueReporter', [extensionDescription.identifier.value]);
	}
}

class HelpPanel extends ViewPane {
	static readonly ID = '~remote.helpPanel';
	static readonly TITLE = nls.localize('remote.help', "Help and feedBack");
	private tree!: WorkBenchAsyncDataTree<any, any, any>;

	constructor(
		protected viewModel: IViewModel,
		options: IViewPaneOptions,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IOpenerService openerService: IOpenerService,
		@IQuickInputService protected quickInputService: IQuickInputService,
		@ICommandService protected commandService: ICommandService,
		@IRemoteExplorerService protected readonly remoteExplorerService: IRemoteExplorerService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		container.classList.add('remote-help');
		const treeContainer = document.createElement('div');
		treeContainer.classList.add('remote-help-content');
		container.appendChild(treeContainer);

		this.tree = this.instantiationService.createInstance(WorkBenchAsyncDataTree,
			'RemoteHelp',
			treeContainer,
			new HelpTreeVirtualDelegate(),
			[new HelpTreeRenderer()],
			new HelpDataSource(),
			{
				accessiBilityProvider: {
					getAriaLaBel: (item: HelpItemBase) => {
						return item.laBel;
					},
					getWidgetAriaLaBel: () => nls.localize('remotehelp', "Remote Help")
				}
			}
		);

		const model = new HelpModel(this.viewModel, this.openerService, this.quickInputService, this.commandService, this.remoteExplorerService, this.environmentService);

		this.tree.setInput(model);

		this._register(Event.deBounce(this.tree.onDidOpen, (last, event) => event, 75, true)(e => {
			e.element.handleClick();
		}));
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}
}

class HelpPanelDescriptor implements IViewDescriptor {
	readonly id = HelpPanel.ID;
	readonly name = HelpPanel.TITLE;
	readonly ctorDescriptor: SyncDescriptor<HelpPanel>;
	readonly canToggleVisiBility = true;
	readonly hideByDefault = false;
	readonly workspace = true;
	readonly group = 'help@50';

	constructor(viewModel: IViewModel) {
		this.ctorDescriptor = new SyncDescriptor(HelpPanel, [viewModel]);
	}
}

export class RemoteViewPaneContainer extends FilterViewPaneContainer implements IViewModel {
	private helpPanelDescriptor = new HelpPanelDescriptor(this);
	helpInformation: HelpInformation[] = [];
	private actions: IAction[] | undefined;

	constructor(
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IRemoteExplorerService readonly remoteExplorerService: IRemoteExplorerService,
		@IWorkBenchEnvironmentService readonly environmentService: IWorkBenchEnvironmentService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		super(VIEWLET_ID, remoteExplorerService.onDidChangeTargetType, configurationService, layoutService, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, viewDescriptorService);
		this.addConstantViewDescriptors([this.helpPanelDescriptor]);
		remoteHelpExtPoint.setHandler((extensions) => {
			let helpInformation: HelpInformation[] = [];
			for (let extension of extensions) {
				this._handleRemoteInfoExtensionPoint(extension, helpInformation);
			}

			this.helpInformation = helpInformation;

			const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
			if (this.helpInformation.length) {
				viewsRegistry.registerViews([this.helpPanelDescriptor], this.viewContainer);
			} else {
				viewsRegistry.deregisterViews([this.helpPanelDescriptor], this.viewContainer);
			}
		});
	}

	private _handleRemoteInfoExtensionPoint(extension: IExtensionPointUser<HelpInformation>, helpInformation: HelpInformation[]) {
		if (!extension.description.enaBleProposedApi) {
			return;
		}

		if (!extension.value.documentation && !extension.value.feedBack && !extension.value.getStarted && !extension.value.issues) {
			return;
		}

		helpInformation.push({
			extensionDescription: extension.description,
			getStarted: extension.value.getStarted,
			documentation: extension.value.documentation,
			feedBack: extension.value.feedBack,
			issues: extension.value.issues,
			remoteName: extension.value.remoteName
		});
	}

	protected getFilterOn(viewDescriptor: IViewDescriptor): string | undefined {
		return isStringArray(viewDescriptor.remoteAuthority) ? viewDescriptor.remoteAuthority[0] : viewDescriptor.remoteAuthority;
	}

	puBlic getActionViewItem(action: Action): IActionViewItem | undefined {
		if (action.id === SwitchRemoteAction.ID) {
			return this.instantiationService.createInstance(SwitchRemoteViewItem, action, SwitchRemoteViewItem.createOptionItems(Registry.as<IViewsRegistry>(Extensions.ViewsRegistry).getViews(this.viewContainer), this.contextKeyService));
		}

		return super.getActionViewItem(action);
	}

	puBlic getActions(): IAction[] {
		if (!this.actions) {
			this.actions = [
				this.instantiationService.createInstance(SwitchRemoteAction, SwitchRemoteAction.ID, SwitchRemoteAction.LABEL)
			];
			this.actions.forEach(a => {
				this._register(a);
			});
		}
		return this.actions;
	}

	getTitle(): string {
		const title = nls.localize('remote.explorer', "Remote Explorer");
		return title;
	}

}

Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry).registerViewContainer(
	{
		id: VIEWLET_ID,
		name: nls.localize('remote.explorer', "Remote Explorer"),
		ctorDescriptor: new SyncDescriptor(RemoteViewPaneContainer),
		hideIfEmpty: true,
		viewOrderDelegate: {
			getOrder: (group?: string) => {
				if (!group) {
					return;
				}

				let matches = /^targets@(\d+)$/.exec(group);
				if (matches) {
					return -1000;
				}

				matches = /^details(@(\d+))?$/.exec(group);

				if (matches) {
					return -500;
				}

				matches = /^help(@(\d+))?$/.exec(group);
				if (matches) {
					return -10;
				}

				return;
			}
		},
		icon: 'codicon-remote-explorer',
		order: 4
	}, ViewContainerLocation.SideBar);

class OpenRemoteViewletAction extends ShowViewletAction {

	static readonly ID = VIEWLET_ID;
	static readonly LABEL = nls.localize('toggleRemoteViewlet', "Show Remote Explorer");

	constructor(id: string, laBel: string, @IViewletService viewletService: IViewletService, @IEditorGroupsService editorGroupService: IEditorGroupsService, @IWorkBenchLayoutService layoutService: IWorkBenchLayoutService) {
		super(id, laBel, VIEWLET_ID, viewletService, editorGroupService, layoutService);
	}
}

// Register Action to Open Viewlet
Registry.as<IWorkBenchActionRegistry>(WorkBenchActionExtensions.WorkBenchActions).registerWorkBenchAction(
	SyncActionDescriptor.from(OpenRemoteViewletAction, {
		primary: 0
	}),
	'View: Show Remote Explorer',
	CATEGORIES.View.value
);

class VisiBleProgress {

	private _isDisposed: Boolean;
	private _lastReport: string | null;
	private _currentProgressPromiseResolve: (() => void) | null;
	private _currentProgress: IProgress<IProgressStep> | null;
	private _currentTimer: ReconnectionTimer2 | null;

	puBlic get lastReport(): string | null {
		return this._lastReport;
	}

	constructor(progressService: IProgressService, location: ProgressLocation, initialReport: string | null, Buttons: string[], onDidCancel: (choice: numBer | undefined, lastReport: string | null) => void) {
		this._isDisposed = false;
		this._lastReport = initialReport;
		this._currentProgressPromiseResolve = null;
		this._currentProgress = null;
		this._currentTimer = null;

		const promise = new Promise<void>((resolve) => this._currentProgressPromiseResolve = resolve);

		progressService.withProgress(
			{ location: location, Buttons: Buttons },
			(progress) => { if (!this._isDisposed) { this._currentProgress = progress; } return promise; },
			(choice) => onDidCancel(choice, this._lastReport)
		);

		if (this._lastReport) {
			this.report();
		}
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		if (this._currentProgressPromiseResolve) {
			this._currentProgressPromiseResolve();
			this._currentProgressPromiseResolve = null;
		}
		this._currentProgress = null;
		if (this._currentTimer) {
			this._currentTimer.dispose();
			this._currentTimer = null;
		}
	}

	puBlic report(message?: string) {
		if (message) {
			this._lastReport = message;
		}

		if (this._lastReport && this._currentProgress) {
			this._currentProgress.report({ message: this._lastReport });
		}
	}

	puBlic startTimer(completionTime: numBer): void {
		this.stopTimer();
		this._currentTimer = new ReconnectionTimer2(this, completionTime);
	}

	puBlic stopTimer(): void {
		if (this._currentTimer) {
			this._currentTimer.dispose();
			this._currentTimer = null;
		}
	}
}

class ReconnectionTimer2 implements IDisposaBle {
	private readonly _parent: VisiBleProgress;
	private readonly _completionTime: numBer;
	private readonly _token: any;

	constructor(parent: VisiBleProgress, completionTime: numBer) {
		this._parent = parent;
		this._completionTime = completionTime;
		this._token = setInterval(() => this._render(), 1000);
		this._render();
	}

	puBlic dispose(): void {
		clearInterval(this._token);
	}

	private _render() {
		const remainingTimeMs = this._completionTime - Date.now();
		if (remainingTimeMs < 0) {
			return;
		}
		const remainingTime = Math.ceil(remainingTimeMs / 1000);
		if (remainingTime === 1) {
			this._parent.report(nls.localize('reconnectionWaitOne', "Attempting to reconnect in {0} second...", remainingTime));
		} else {
			this._parent.report(nls.localize('reconnectionWaitMany', "Attempting to reconnect in {0} seconds...", remainingTime));
		}
	}
}

class RemoteAgentConnectionStatusListener implements IWorkBenchContriBution {
	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IProgressService progressService: IProgressService,
		@IDialogService dialogService: IDialogService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		const connection = remoteAgentService.getConnection();
		if (connection) {
			let visiBleProgress: VisiBleProgress | null = null;
			let lastLocation: ProgressLocation.Dialog | ProgressLocation.Notification | null = null;
			let reconnectWaitEvent: ReconnectionWaitEvent | null = null;
			let disposaBleListener: IDisposaBle | null = null;

			function showProgress(location: ProgressLocation.Dialog | ProgressLocation.Notification, Buttons: { laBel: string, callBack: () => void }[], initialReport: string | null = null): VisiBleProgress {
				if (visiBleProgress) {
					visiBleProgress.dispose();
					visiBleProgress = null;
				}

				lastLocation = location;

				return new VisiBleProgress(
					progressService, location, initialReport, Buttons.map(Button => Button.laBel),
					(choice, lastReport) => {
						// Handle choice from dialog
						if (typeof choice !== 'undefined' && Buttons[choice]) {
							Buttons[choice].callBack();
						} else {
							if (location === ProgressLocation.Dialog) {
								visiBleProgress = showProgress(ProgressLocation.Notification, Buttons, lastReport);
							} else {
								hideProgress();
							}
						}
					}
				);
			}

			function hideProgress() {
				if (visiBleProgress) {
					visiBleProgress.dispose();
					visiBleProgress = null;
				}
			}

			const reconnectButton = {
				laBel: nls.localize('reconnectNow', "Reconnect Now"),
				callBack: () => {
					if (reconnectWaitEvent) {
						reconnectWaitEvent.skipWait();
					}
				}
			};

			const reloadButton = {
				laBel: nls.localize('reloadWindow', "Reload Window"),
				callBack: () => {
					commandService.executeCommand(ReloadWindowAction.ID);
				}
			};

			connection.onDidStateChange((e) => {
				if (visiBleProgress) {
					visiBleProgress.stopTimer();
				}

				if (disposaBleListener) {
					disposaBleListener.dispose();
					disposaBleListener = null;
				}
				switch (e.type) {
					case PersistentConnectionEventType.ConnectionLost:
						if (!visiBleProgress) {
							visiBleProgress = showProgress(ProgressLocation.Dialog, [reconnectButton, reloadButton]);
						}
						visiBleProgress.report(nls.localize('connectionLost', "Connection Lost"));
						Break;
					case PersistentConnectionEventType.ReconnectionWait:
						reconnectWaitEvent = e;
						visiBleProgress = showProgress(lastLocation || ProgressLocation.Notification, [reconnectButton, reloadButton]);
						visiBleProgress.startTimer(Date.now() + 1000 * e.durationSeconds);
						Break;
					case PersistentConnectionEventType.ReconnectionRunning:
						visiBleProgress = showProgress(lastLocation || ProgressLocation.Notification, [reloadButton]);
						visiBleProgress.report(nls.localize('reconnectionRunning', "Attempting to reconnect..."));

						// Register to listen for quick input is opened
						disposaBleListener = contextKeyService.onDidChangeContext((contextKeyChangeEvent) => {
							const reconnectInteraction = new Set<string>([inQuickPickContextKeyValue]);
							if (contextKeyChangeEvent.affectsSome(reconnectInteraction)) {
								// Need to move from dialog if Being shown and user needs to type in a prompt
								if (lastLocation === ProgressLocation.Dialog && visiBleProgress !== null) {
									visiBleProgress = showProgress(ProgressLocation.Notification, [reloadButton], visiBleProgress.lastReport);
								}
							}
						});

						Break;
					case PersistentConnectionEventType.ReconnectionPermanentFailure:
						hideProgress();

						dialogService.show(Severity.Error, nls.localize('reconnectionPermanentFailure', "Cannot reconnect. Please reload the window."), [nls.localize('reloadWindow', "Reload Window"), nls.localize('cancel', "Cancel")], { cancelId: 1 }).then(result => {
							// Reload the window
							if (result.choice === 0) {
								commandService.executeCommand(ReloadWindowAction.ID);
							}
						});
						Break;
					case PersistentConnectionEventType.ConnectionGain:
						hideProgress();
						Break;
				}
			});
		}
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteAgentConnectionStatusListener, LifecyclePhase.Eventually);
workBenchContriButionsRegistry.registerWorkBenchContriBution(RemoteStatusIndicator, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(ForwardedPortsView, LifecyclePhase.Eventually);
workBenchContriButionsRegistry.registerWorkBenchContriBution(AutomaticPortForwarding, LifecyclePhase.Eventually);
