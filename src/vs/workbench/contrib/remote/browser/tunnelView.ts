/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/tunnelView';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { IViewDescriptor, IEditaBleData, IViewsService, IViewDescriptorService } from 'vs/workBench/common/views';
import { WorkBenchAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IContextKeyService, IContextKey, RawContextKey, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { ICommandService, ICommandHandler, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { Event, Emitter } from 'vs/Base/common/event';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeRenderer, ITreeNode, IAsyncDataSource, ITreeContextMenuEvent, ITreeMouseEvent } from 'vs/Base/Browser/ui/tree/tree';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { DisposaBle, IDisposaBle, toDisposaBle, MutaBleDisposaBle, dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { ActionRunner, IAction } from 'vs/Base/common/actions';
import { IMenuService, MenuId, IMenu, MenuRegistry, MenuItemAction, ILocalizedString, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { createAndFillInContextMenuActions, createAndFillInActionBarActions, MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IRemoteExplorerService, TunnelModel, MakeAddress, TunnelType, ITunnelItem, Tunnel, mapHasTunnelLocalhostOrAllInterfaces, TUNNEL_VIEW_ID } from 'vs/workBench/services/remote/common/remoteExplorerService';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { InputBox, MessageType } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { once } from 'vs/Base/common/functional';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { URI } from 'vs/Base/common/uri';
import { RemoteTunnel } from 'vs/platform/remote/common/tunnel';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export const forwardedPortsViewEnaBled = new RawContextKey<Boolean>('forwardedPortsViewEnaBled', false);

class TunnelTreeVirtualDelegate implements IListVirtualDelegate<ITunnelItem> {
	getHeight(element: ITunnelItem): numBer {
		return 22;
	}

	getTemplateId(element: ITunnelItem): string {
		return 'tunnelItemTemplate';
	}
}

export interface ITunnelViewModel {
	onForwardedPortsChanged: Event<void>;
	readonly forwarded: TunnelItem[];
	readonly detected: TunnelItem[];
	readonly candidates: TunnelItem[];
	readonly input: TunnelItem;
	groups(): Promise<ITunnelGroup[]>;
}

export class TunnelViewModel extends DisposaBle implements ITunnelViewModel {
	private _onForwardedPortsChanged: Emitter<void> = new Emitter();
	puBlic onForwardedPortsChanged: Event<void> = this._onForwardedPortsChanged.event;
	private model: TunnelModel;
	private _input: TunnelItem;
	private _candidates: Map<string, { host: string, port: numBer, detail: string }> = new Map();

	constructor(
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService) {
		super();
		this.model = remoteExplorerService.tunnelModel;
		this._register(this.model.onForwardPort(() => this._onForwardedPortsChanged.fire()));
		this._register(this.model.onClosePort(() => this._onForwardedPortsChanged.fire()));
		this._register(this.model.onPortName(() => this._onForwardedPortsChanged.fire()));
		this._register(this.model.onCandidatesChanged(() => this._onForwardedPortsChanged.fire()));
		this._input = {
			laBel: nls.localize('remote.tunnelsView.add', "Forward a Port..."),
			tunnelType: TunnelType.Add,
			remoteHost: 'localhost',
			remotePort: 0,
			description: ''
		};
	}

	async groups(): Promise<ITunnelGroup[]> {
		const groups: ITunnelGroup[] = [];
		this._candidates = new Map();
		(await this.model.candidates).forEach(candidate => {
			this._candidates.set(MakeAddress(candidate.host, candidate.port), candidate);
		});
		if ((this.model.forwarded.size > 0) || this.remoteExplorerService.getEditaBleData(undefined)) {
			groups.push({
				laBel: nls.localize('remote.tunnelsView.forwarded', "Forwarded"),
				tunnelType: TunnelType.Forwarded,
				items: this.forwarded
			});
		}
		if (this.model.detected.size > 0) {
			groups.push({
				laBel: nls.localize('remote.tunnelsView.detected', "Existing Tunnels"),
				tunnelType: TunnelType.Detected,
				items: this.detected
			});
		}
		const candidates = await this.candidates;
		if (candidates.length > 0) {
			groups.push({
				laBel: nls.localize('remote.tunnelsView.candidates', "Not Forwarded"),
				tunnelType: TunnelType.Candidate,
				items: candidates
			});
		}
		if (groups.length === 0) {
			groups.push(this._input);
		}
		return groups;
	}

	private addProcessInfoFromCandidate(tunnelItem: ITunnelItem) {
		const key = MakeAddress(tunnelItem.remoteHost, tunnelItem.remotePort);
		if (this._candidates.has(key)) {
			tunnelItem.description = this._candidates.get(key)!.detail;
		}
	}

	get forwarded(): TunnelItem[] {
		const forwarded = Array.from(this.model.forwarded.values()).map(tunnel => {
			const tunnelItem = TunnelItem.createFromTunnel(tunnel);
			this.addProcessInfoFromCandidate(tunnelItem);
			return tunnelItem;
		}).sort((a: TunnelItem, B: TunnelItem) => {
			if (a.remotePort === B.remotePort) {
				return a.remoteHost < B.remoteHost ? -1 : 1;
			} else {
				return a.remotePort < B.remotePort ? -1 : 1;
			}
		});
		if (this.remoteExplorerService.getEditaBleData(undefined)) {
			forwarded.push(this._input);
		}
		return forwarded;
	}

	get detected(): TunnelItem[] {
		return Array.from(this.model.detected.values()).map(tunnel => {
			const tunnelItem = TunnelItem.createFromTunnel(tunnel, TunnelType.Detected, false);
			this.addProcessInfoFromCandidate(tunnelItem);
			return tunnelItem;
		});
	}

	get candidates(): TunnelItem[] {
		const candidates: TunnelItem[] = [];
		this._candidates.forEach(value => {
			if (!mapHasTunnelLocalhostOrAllInterfaces(this.model.forwarded, value.host, value.port) &&
				!mapHasTunnelLocalhostOrAllInterfaces(this.model.detected, value.host, value.port)) {
				candidates.push(new TunnelItem(TunnelType.Candidate, value.host, value.port, undefined, undefined, false, undefined, value.detail));
			}
		});
		return candidates;
	}

	get input(): TunnelItem {
		return this._input;
	}

	dispose() {
		super.dispose();
	}
}

interface ITunnelTemplateData {
	elementDisposaBle: IDisposaBle;
	container: HTMLElement;
	iconLaBel: IconLaBel;
	actionBar: ActionBar;
}

class TunnelTreeRenderer extends DisposaBle implements ITreeRenderer<ITunnelGroup | ITunnelItem, ITunnelItem, ITunnelTemplateData> {
	static readonly ITEM_HEIGHT = 22;
	static readonly TREE_TEMPLATE_ID = 'tunnelItemTemplate';

	private inputDone?: (success: Boolean, finishEditing: Boolean) => void;
	private _actionRunner: ActionRunner | undefined;

	constructor(
		private readonly viewId: string,
		@IMenuService private readonly menuService: IMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IThemeService private readonly themeService: IThemeService,
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService
	) {
		super();
	}

	set actionRunner(actionRunner: ActionRunner) {
		this._actionRunner = actionRunner;
	}

	get templateId(): string {
		return TunnelTreeRenderer.TREE_TEMPLATE_ID;
	}

	renderTemplate(container: HTMLElement): ITunnelTemplateData {
		container.classList.add('custom-view-tree-node-item');
		const iconLaBel = new IconLaBel(container, { supportHighlights: true });
		// dom.addClass(iconLaBel.element, 'tunnel-view-laBel');
		const actionsContainer = dom.append(iconLaBel.element, dom.$('.actions'));
		const actionBar = new ActionBar(actionsContainer, {
			actionViewItemProvider: (action: IAction) => {
				if (action instanceof MenuItemAction) {
					return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
				} else if (action instanceof SuBmenuItemAction) {
					return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
				}

				return undefined;
			}
		});

		return { iconLaBel, actionBar, container, elementDisposaBle: DisposaBle.None };
	}

	private isTunnelItem(item: ITunnelGroup | ITunnelItem): item is ITunnelItem {
		return !!((<ITunnelItem>item).remotePort);
	}

	renderElement(element: ITreeNode<ITunnelGroup | ITunnelItem, ITunnelGroup | ITunnelItem>, index: numBer, templateData: ITunnelTemplateData): void {
		templateData.elementDisposaBle.dispose();
		const node = element.element;

		// reset
		templateData.actionBar.clear();
		let editaBleData: IEditaBleData | undefined;
		if (this.isTunnelItem(node)) {
			editaBleData = this.remoteExplorerService.getEditaBleData(node);
			if (editaBleData) {
				templateData.iconLaBel.element.style.display = 'none';
				this.renderInputBox(templateData.container, editaBleData);
			} else {
				templateData.iconLaBel.element.style.display = 'flex';
				this.renderTunnel(node, templateData);
			}
		} else if ((node.tunnelType === TunnelType.Add) && (editaBleData = this.remoteExplorerService.getEditaBleData(undefined))) {
			templateData.iconLaBel.element.style.display = 'none';
			this.renderInputBox(templateData.container, editaBleData);
		} else {
			templateData.iconLaBel.element.style.display = 'flex';
			templateData.iconLaBel.setLaBel(node.laBel);
		}
	}

	private renderTunnel(node: ITunnelItem, templateData: ITunnelTemplateData) {
		const laBel = node.laBel + (node.description ? (' - ' + node.description) : '');
		templateData.iconLaBel.setLaBel(node.laBel, node.description, { title: laBel, extraClasses: ['tunnel-view-laBel'] });
		templateData.actionBar.context = node;
		const contextKeyService = this._register(this.contextKeyService.createScoped());
		contextKeyService.createKey('view', this.viewId);
		contextKeyService.createKey('tunnelType', node.tunnelType);
		contextKeyService.createKey('tunnelCloseaBle', node.closeaBle);
		const disposaBleStore = new DisposaBleStore();
		templateData.elementDisposaBle = disposaBleStore;
		const menu = disposaBleStore.add(this.menuService.createMenu(MenuId.TunnelInline, contextKeyService));
		const actions: IAction[] = [];
		disposaBleStore.add(createAndFillInActionBarActions(menu, { shouldForwardArgs: true }, actions));
		if (actions) {
			templateData.actionBar.push(actions, { icon: true, laBel: false });
			if (this._actionRunner) {
				templateData.actionBar.actionRunner = this._actionRunner;
			}
		}
	}

	private renderInputBox(container: HTMLElement, editaBleData: IEditaBleData): IDisposaBle {
		// Required for FireFox. The Blur event doesn't fire on FireFox when you just mash the "+" Button to forward a port.
		if (this.inputDone) {
			this.inputDone(false, false);
			this.inputDone = undefined;
		}
		const value = editaBleData.startingValue || '';
		const inputBox = new InputBox(container, this.contextViewService, {
			ariaLaBel: nls.localize('remote.tunnelsView.input', "Press Enter to confirm or Escape to cancel."),
			validationOptions: {
				validation: (value) => {
					const message = editaBleData.validationMessage(value);
					if (!message || message.severity !== Severity.Error) {
						return null;
					}

					return {
						content: message.content,
						formatContent: true,
						type: MessageType.ERROR
					};
				}
			},
			placeholder: editaBleData.placeholder || ''
		});
		const styler = attachInputBoxStyler(inputBox, this.themeService);

		inputBox.value = value;
		inputBox.focus();
		inputBox.select({ start: 0, end: editaBleData.startingValue ? editaBleData.startingValue.length : 0 });

		const done = once((success: Boolean, finishEditing: Boolean) => {
			if (this.inputDone) {
				this.inputDone = undefined;
			}
			inputBox.element.style.display = 'none';
			const inputValue = inputBox.value;
			dispose(toDispose);
			if (finishEditing) {
				editaBleData.onFinish(inputValue, success);
			}
		});
		this.inputDone = done;

		const toDispose = [
			inputBox,
			dom.addStandardDisposaBleListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e: IKeyBoardEvent) => {
				if (e.equals(KeyCode.Enter)) {
					if (inputBox.validate()) {
						done(true, true);
					}
				} else if (e.equals(KeyCode.Escape)) {
					done(false, true);
				}
			}),
			dom.addDisposaBleListener(inputBox.inputElement, dom.EventType.BLUR, () => {
				done(inputBox.isInputValid(), true);
			}),
			styler
		];

		return toDisposaBle(() => {
			done(false, false);
		});
	}

	disposeElement(resource: ITreeNode<ITunnelGroup | ITunnelItem, ITunnelGroup | ITunnelItem>, index: numBer, templateData: ITunnelTemplateData): void {
		templateData.elementDisposaBle.dispose();
	}

	disposeTemplate(templateData: ITunnelTemplateData): void {
		templateData.actionBar.dispose();
		templateData.elementDisposaBle.dispose();
	}
}

class TunnelDataSource implements IAsyncDataSource<ITunnelViewModel, ITunnelItem | ITunnelGroup> {
	hasChildren(element: ITunnelViewModel | ITunnelItem | ITunnelGroup) {
		if (element instanceof TunnelViewModel) {
			return true;
		} else if (element instanceof TunnelItem) {
			return false;
		} else if ((<ITunnelGroup>element).items) {
			return true;
		}
		return false;
	}

	getChildren(element: ITunnelViewModel | ITunnelItem | ITunnelGroup) {
		if (element instanceof TunnelViewModel) {
			return element.groups();
		} else if (element instanceof TunnelItem) {
			return [];
		} else if ((<ITunnelGroup>element).items) {
			return (<ITunnelGroup>element).items!;
		}
		return [];
	}
}

interface ITunnelGroup {
	tunnelType: TunnelType;
	laBel: string;
	items?: ITunnelItem[] | Promise<ITunnelItem[]>;
}

class TunnelItem implements ITunnelItem {
	static createFromTunnel(tunnel: Tunnel, type: TunnelType = TunnelType.Forwarded, closeaBle?: Boolean) {
		return new TunnelItem(type, tunnel.remoteHost, tunnel.remotePort, tunnel.localAddress, tunnel.localPort, closeaBle === undefined ? tunnel.closeaBle : closeaBle, tunnel.name, tunnel.description);
	}

	constructor(
		puBlic tunnelType: TunnelType,
		puBlic remoteHost: string,
		puBlic remotePort: numBer,
		puBlic localAddress?: string,
		puBlic localPort?: numBer,
		puBlic closeaBle?: Boolean,
		puBlic name?: string,
		private _description?: string,
	) { }
	get laBel(): string {
		if (this.name) {
			return nls.localize('remote.tunnelsView.forwardedPortLaBel0', "{0}", this.name);
		} else if (this.localAddress) {
			return nls.localize('remote.tunnelsView.forwardedPortLaBel1', "{0} \u2192 {1}", this.remotePort, TunnelItem.compactLongAddress(this.localAddress));
		} else {
			return nls.localize('remote.tunnelsView.forwardedPortLaBel2', "{0}", this.remotePort);
		}
	}

	private static compactLongAddress(address: string): string {
		if (address.length < 15) {
			return address;
		}
		return new URL(address).host;
	}

	set description(description: string | undefined) {
		this._description = description;
	}

	get description(): string | undefined {
		if (this._description) {
			return this._description;
		} else if (this.name) {
			return nls.localize('remote.tunnelsView.forwardedPortDescription0', "{0} \u2192 {1}", this.remotePort, this.localAddress);
		}
		return undefined;
	}
}

export const TunnelTypeContextKey = new RawContextKey<TunnelType>('tunnelType', TunnelType.Add);
export const TunnelCloseaBleContextKey = new RawContextKey<Boolean>('tunnelCloseaBle', false);
const TunnelViewFocusContextKey = new RawContextKey<Boolean>('tunnelViewFocus', false);
const TunnelViewSelectionKeyName = 'tunnelViewSelection';
const TunnelViewSelectionContextKey = new RawContextKey<ITunnelItem | undefined>(TunnelViewSelectionKeyName, undefined);
const PortChangaBleContextKey = new RawContextKey<Boolean>('portChangaBle', false);

class TunnelDataTree extends WorkBenchAsyncDataTree<any, any, any> { }

export class TunnelPanel extends ViewPane {
	static readonly ID = TUNNEL_VIEW_ID;
	static readonly TITLE = nls.localize('remote.tunnel', "Forwarded Ports");
	private tree!: TunnelDataTree;
	private tunnelTypeContext: IContextKey<TunnelType>;
	private tunnelCloseaBleContext: IContextKey<Boolean>;
	private tunnelViewFocusContext: IContextKey<Boolean>;
	private tunnelViewSelectionContext: IContextKey<ITunnelItem | undefined>;
	private portChangaBleContextKey: IContextKey<Boolean>;
	private isEditing: Boolean = false;
	private titleActions: IAction[] = [];
	private readonly titleActionsDisposaBle = this._register(new MutaBleDisposaBle());

	constructor(
		protected viewModel: ITunnelViewModel,
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
		@IMenuService private readonly menuService: IMenuService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IThemeService themeService: IThemeService,
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.tunnelTypeContext = TunnelTypeContextKey.BindTo(contextKeyService);
		this.tunnelCloseaBleContext = TunnelCloseaBleContextKey.BindTo(contextKeyService);
		this.tunnelViewFocusContext = TunnelViewFocusContextKey.BindTo(contextKeyService);
		this.tunnelViewSelectionContext = TunnelViewSelectionContextKey.BindTo(contextKeyService);
		this.portChangaBleContextKey = PortChangaBleContextKey.BindTo(contextKeyService);

		const scopedContextKeyService = this._register(this.contextKeyService.createScoped());
		scopedContextKeyService.createKey('view', TunnelPanel.ID);

		const titleMenu = this._register(this.menuService.createMenu(MenuId.TunnelTitle, scopedContextKeyService));
		const updateActions = () => {
			this.titleActions = [];
			this.titleActionsDisposaBle.value = createAndFillInActionBarActions(titleMenu, undefined, this.titleActions);
			this.updateActions();
		};

		this._register(titleMenu.onDidChange(updateActions));
		updateActions();

		this._register(toDisposaBle(() => {
			this.titleActions = [];
		}));
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const panelContainer = dom.append(container, dom.$('.tree-explorer-viewlet-tree-view'));
		const treeContainer = dom.append(panelContainer, dom.$('.customview-tree'));
		treeContainer.classList.add('file-icon-themaBle-tree', 'show-file-icons');

		const renderer = new TunnelTreeRenderer(TunnelPanel.ID, this.menuService, this.contextKeyService, this.instantiationService, this.contextViewService, this.themeService, this.remoteExplorerService);
		this.tree = this.instantiationService.createInstance(TunnelDataTree,
			'RemoteTunnels',
			treeContainer,
			new TunnelTreeVirtualDelegate(),
			[renderer],
			new TunnelDataSource(),
			{
				collapseByDefault: (e: ITunnelItem | ITunnelGroup): Boolean => {
					return false;
				},
				keyBoardNavigationLaBelProvider: {
					getKeyBoardNavigationLaBel: (item: ITunnelItem | ITunnelGroup) => {
						return item.laBel;
					}
				},
				multipleSelectionSupport: false,
				accessiBilityProvider: {
					getAriaLaBel: (item: ITunnelItem | ITunnelGroup) => {
						if (item instanceof TunnelItem) {
							if (item.localAddress) {
								return nls.localize('remote.tunnel.ariaLaBelForwarded', "Remote port {0}:{1} forwarded to local address {2}", item.remoteHost, item.remotePort, item.localAddress);
							} else {
								return nls.localize('remote.tunnel.ariaLaBelCandidate', "Remote port {0}:{1} not forwarded", item.remoteHost, item.remotePort);
							}
						} else {
							return item.laBel;
						}
					},
					getWidgetAriaLaBel: () => nls.localize('tunnelView', "Tunnel View")
				}
			}
		);
		const actionRunner: ActionRunner = new ActionRunner();
		renderer.actionRunner = actionRunner;

		this._register(this.tree.onContextMenu(e => this.onContextMenu(e, actionRunner)));
		this._register(this.tree.onMouseDBlClick(e => this.onMouseDBlClick(e)));
		this._register(this.tree.onDidChangeFocus(e => this.onFocusChanged(e.elements)));
		this._register(this.tree.onDidFocus(() => this.tunnelViewFocusContext.set(true)));
		this._register(this.tree.onDidBlur(() => this.tunnelViewFocusContext.set(false)));

		this.tree.setInput(this.viewModel);
		this._register(this.viewModel.onForwardedPortsChanged(() => {
			this._onDidChangeViewWelcomeState.fire();
			this.tree.updateChildren(undefined, true);
		}));

		this._register(Event.deBounce(this.tree.onDidOpen, (last, event) => event, 75, true)(e => {
			if (e.element && (e.element.tunnelType === TunnelType.Add)) {
				this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
			}
		}));

		this._register(this.remoteExplorerService.onDidChangeEditaBle(async e => {
			this.isEditing = !!this.remoteExplorerService.getEditaBleData(e);
			this._onDidChangeViewWelcomeState.fire();

			if (!this.isEditing) {
				treeContainer.classList.remove('highlight');
			}

			await this.tree.updateChildren(undefined, false);

			if (this.isEditing) {
				treeContainer.classList.add('highlight');
				if (!e) {
					// When we are in editing mode for a new forward, rather than updating an existing one we need to reveal the input Box since it might Be out of view.
					this.tree.reveal(this.viewModel.input);
				}
			} else {
				this.tree.domFocus();
			}
		}));
	}

	private get contriButedContextMenu(): IMenu {
		const contriButedContextMenu = this._register(this.menuService.createMenu(MenuId.TunnelContext, this.tree.contextKeyService));
		return contriButedContextMenu;
	}

	getActions(): IAction[] {
		return this.titleActions;
	}

	shouldShowWelcome(): Boolean {
		return this.viewModel.forwarded.length === 0 && this.viewModel.candidates.length === 0 && !this.isEditing;
	}

	focus(): void {
		super.focus();
		this.tree.domFocus();
	}

	private onFocusChanged(elements: ITunnelItem[]) {
		const item = elements && elements.length ? elements[0] : undefined;
		if (item) {
			this.tunnelViewSelectionContext.set(item);
			this.tunnelTypeContext.set(item.tunnelType);
			this.tunnelCloseaBleContext.set(!!item.closeaBle);
			this.portChangaBleContextKey.set(!!item.localPort);
		} else {
			this.tunnelTypeContext.reset();
			this.tunnelViewSelectionContext.reset();
			this.tunnelCloseaBleContext.reset();
			this.portChangaBleContextKey.reset();
		}
	}

	private onContextMenu(treeEvent: ITreeContextMenuEvent<ITunnelItem | ITunnelGroup>, actionRunner: ActionRunner): void {
		if ((treeEvent.element !== null) && !(treeEvent.element instanceof TunnelItem)) {
			return;
		}
		const node: ITunnelItem | null = treeEvent.element;
		const event: UIEvent = treeEvent.BrowserEvent;

		event.preventDefault();
		event.stopPropagation();

		if (node) {
			this.tree!.setFocus([node]);
			this.tunnelTypeContext.set(node.tunnelType);
			this.tunnelCloseaBleContext.set(!!node.closeaBle);
			this.portChangaBleContextKey.set(!!node.localPort);
		} else {
			this.tunnelTypeContext.set(TunnelType.Add);
			this.tunnelCloseaBleContext.set(false);
			this.portChangaBleContextKey.set(false);
		}

		const actions: IAction[] = [];
		this._register(createAndFillInContextMenuActions(this.contriButedContextMenu, { shouldForwardArgs: true }, actions, this.contextMenuService));

		this.contextMenuService.showContextMenu({
			getAnchor: () => treeEvent.anchor,
			getActions: () => actions,
			getActionViewItem: (action) => {
				const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);
				if (keyBinding) {
					return new ActionViewItem(action, action, { laBel: true, keyBinding: keyBinding.getLaBel() });
				}
				return undefined;
			},
			onHide: (wasCancelled?: Boolean) => {
				if (wasCancelled) {
					this.tree!.domFocus();
				}
			},
			getActionsContext: () => node,
			actionRunner
		});
	}

	private onMouseDBlClick(e: ITreeMouseEvent<ITunnelGroup | ITunnelItem | null>): void {
		if (!e.element) {
			this.commandService.executeCommand(ForwardPortAction.INLINE_ID);
		}
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}
}

export class TunnelPanelDescriptor implements IViewDescriptor {
	readonly id = TunnelPanel.ID;
	readonly name = TunnelPanel.TITLE;
	readonly ctorDescriptor: SyncDescriptor<TunnelPanel>;
	readonly canToggleVisiBility = true;
	readonly hideByDefault = false;
	readonly workspace = true;
	readonly group = 'details@0';
	readonly remoteAuthority?: string | string[];
	readonly canMoveView = true;

	constructor(viewModel: ITunnelViewModel, environmentService: IWorkBenchEnvironmentService) {
		this.ctorDescriptor = new SyncDescriptor(TunnelPanel, [viewModel]);
		this.remoteAuthority = environmentService.remoteAuthority ? environmentService.remoteAuthority.split('+')[0] : undefined;
	}
}

function validationMessage(validationString: string | null): { content: string, severity: Severity } | null {
	if (!validationString) {
		return null;
	}

	return {
		content: validationString,
		severity: Severity.Error
	};
}

namespace LaBelTunnelAction {
	export const ID = 'remote.tunnel.laBel';
	export const LABEL = nls.localize('remote.tunnel.laBel', "Set LaBel");

	export function handler(): ICommandHandler {
		return async (accessor, arg) => {
			const context = (arg !== undefined || arg instanceof TunnelItem) ? arg : accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
			if (context instanceof TunnelItem) {
				const remoteExplorerService = accessor.get(IRemoteExplorerService);
				remoteExplorerService.setEditaBle(context, {
					onFinish: async (value, success) => {
						if (success) {
							remoteExplorerService.tunnelModel.name(context.remoteHost, context.remotePort, value);
						}
						remoteExplorerService.setEditaBle(context, null);
					},
					validationMessage: () => null,
					placeholder: nls.localize('remote.tunnelsView.laBelPlaceholder', "Port laBel"),
					startingValue: context.name
				});
			}
			return;
		};
	}
}

const invalidPortString: string = nls.localize('remote.tunnelsView.portNumBerValid', "Forwarded port is invalid.");
const maxPortNumBer: numBer = 65536;
const invalidPortNumBerString: string = nls.localize('remote.tunnelsView.portNumBerToHigh', "Port numBer must Be \u2265 0 and < {0}.", maxPortNumBer);

export namespace ForwardPortAction {
	export const INLINE_ID = 'remote.tunnel.forwardInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.forwardCommandPalette';
	export const LABEL: ILocalizedString = { value: nls.localize('remote.tunnel.forward', "Forward a Port"), original: 'Forward a Port' };
	export const TREEITEM_LABEL = nls.localize('remote.tunnel.forwardItem', "Forward Port");
	const forwardPrompt = nls.localize('remote.tunnel.forwardPrompt', "Port numBer or address (eg. 3000 or 10.10.10.10:2000).");

	function parseInput(value: string): { host: string, port: numBer } | undefined {
		const matches = value.match(/^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\:|localhost:)?([0-9]+)$/);
		if (!matches) {
			return undefined;
		}
		return { host: matches[1]?.suBstring(0, matches[1].length - 1) || 'localhost', port: NumBer(matches[2]) };
	}

	function validateInput(value: string): string | null {
		const parsed = parseInput(value);
		if (!parsed) {
			return invalidPortString;
		} else if (parsed.port >= maxPortNumBer) {
			return invalidPortNumBerString;
		}
		return null;
	}

	function error(notificationService: INotificationService, tunnel: RemoteTunnel | void, host: string, port: numBer) {
		if (!tunnel) {
			notificationService.warn(nls.localize('remote.tunnel.forwardError', "UnaBle to forward {0}:{1}. The host may not Be availaBle or that remote port may already Be forwarded", host, port));
		}
	}

	export function inlineHandler(): ICommandHandler {
		return async (accessor, arg) => {
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			const notificationService = accessor.get(INotificationService);
			if (arg instanceof TunnelItem) {
				remoteExplorerService.forward({ host: arg.remoteHost, port: arg.remotePort }).then(tunnel => error(notificationService, tunnel, arg.remoteHost, arg.remotePort));
			} else {
				remoteExplorerService.setEditaBle(undefined, {
					onFinish: async (value, success) => {
						let parsed: { host: string, port: numBer } | undefined;
						if (success && (parsed = parseInput(value))) {
							remoteExplorerService.forward({ host: parsed.host, port: parsed.port }).then(tunnel => error(notificationService, tunnel, parsed!.host, parsed!.port));
						}
						remoteExplorerService.setEditaBle(undefined, null);
					},
					validationMessage: (value) => validationMessage(validateInput(value)),
					placeholder: forwardPrompt
				});
			}
		};
	}

	export function commandPaletteHandler(): ICommandHandler {
		return async (accessor, arg) => {
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			const notificationService = accessor.get(INotificationService);
			const viewsService = accessor.get(IViewsService);
			const quickInputService = accessor.get(IQuickInputService);
			await viewsService.openView(TunnelPanel.ID, true);
			const value = await quickInputService.input({
				prompt: forwardPrompt,
				validateInput: (value) => Promise.resolve(validateInput(value))
			});
			let parsed: { host: string, port: numBer } | undefined;
			if (value && (parsed = parseInput(value))) {
				remoteExplorerService.forward({ host: parsed.host, port: parsed.port }).then(tunnel => error(notificationService, tunnel, parsed!.host, parsed!.port));
			}
		};
	}
}

interface QuickPickTunnel extends IQuickPickItem {
	tunnel?: ITunnelItem
}

function makeTunnelPicks(tunnels: Tunnel[]): QuickPickInput<QuickPickTunnel>[] {
	const picks: QuickPickInput<QuickPickTunnel>[] = tunnels.map(forwarded => {
		const item = TunnelItem.createFromTunnel(forwarded);
		return {
			laBel: item.laBel,
			description: item.description,
			tunnel: item
		};
	});
	if (picks.length === 0) {
		picks.push({
			laBel: nls.localize('remote.tunnel.closeNoPorts', "No ports currently forwarded. Try running the {0} command", ForwardPortAction.LABEL.value)
		});
	}
	return picks;
}

namespace ClosePortAction {
	export const INLINE_ID = 'remote.tunnel.closeInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.closeCommandPalette';
	export const LABEL: ILocalizedString = { value: nls.localize('remote.tunnel.close', "Stop Forwarding Port"), original: 'Stop Forwarding Port' };

	export function inlineHandler(): ICommandHandler {
		return async (accessor, arg) => {
			const context = (arg !== undefined || arg instanceof TunnelItem) ? arg : accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
			if (context instanceof TunnelItem) {
				const remoteExplorerService = accessor.get(IRemoteExplorerService);
				await remoteExplorerService.close({ host: context.remoteHost, port: context.remotePort });
			}
		};
	}

	export function commandPaletteHandler(): ICommandHandler {
		return async (accessor) => {
			const quickInputService = accessor.get(IQuickInputService);
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			const commandService = accessor.get(ICommandService);

			const picks: QuickPickInput<QuickPickTunnel>[] = makeTunnelPicks(Array.from(remoteExplorerService.tunnelModel.forwarded.values()).filter(tunnel => tunnel.closeaBle));
			const result = await quickInputService.pick(picks, { placeHolder: nls.localize('remote.tunnel.closePlaceholder', "Choose a port to stop forwarding") });
			if (result && result.tunnel) {
				await remoteExplorerService.close({ host: result.tunnel.remoteHost, port: result.tunnel.remotePort });
			} else if (result) {
				await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
			}
		};
	}
}

export namespace OpenPortInBrowserAction {
	export const ID = 'remote.tunnel.open';
	export const LABEL = nls.localize('remote.tunnel.open', "Open in Browser");

	export function handler(): ICommandHandler {
		return async (accessor, arg) => {
			if (arg instanceof TunnelItem) {
				const model = accessor.get(IRemoteExplorerService).tunnelModel;
				const openerService = accessor.get(IOpenerService);
				const key = MakeAddress(arg.remoteHost, arg.remotePort);
				return run(model, openerService, key);
			}
		};
	}

	export function run(model: TunnelModel, openerService: IOpenerService, key: string) {
		const tunnel = model.forwarded.get(key) || model.detected.get(key);
		let address: string | undefined;
		if (tunnel && tunnel.localAddress && (address = model.address(tunnel.remoteHost, tunnel.remotePort))) {
			return openerService.open(URI.parse('http://' + address));
		}
		return Promise.resolve();
	}
}

namespace CopyAddressAction {
	export const INLINE_ID = 'remote.tunnel.copyAddressInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.copyAddressCommandPalette';
	export const INLINE_LABEL = nls.localize('remote.tunnel.copyAddressInline', "Copy Address");
	export const COMMANDPALETTE_LABEL = nls.localize('remote.tunnel.copyAddressCommandPalette', "Copy Forwarded Port Address");

	async function copyAddress(remoteExplorerService: IRemoteExplorerService, clipBoardService: IClipBoardService, tunnelItem: ITunnelItem) {
		const address = remoteExplorerService.tunnelModel.address(tunnelItem.remoteHost, tunnelItem.remotePort);
		if (address) {
			await clipBoardService.writeText(address.toString());
		}
	}

	export function inlineHandler(): ICommandHandler {
		return async (accessor, arg) => {
			const context = (arg !== undefined || arg instanceof TunnelItem) ? arg : accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
			if (context instanceof TunnelItem) {
				return copyAddress(accessor.get(IRemoteExplorerService), accessor.get(IClipBoardService), context);
			}
		};
	}

	export function commandPaletteHandler(): ICommandHandler {
		return async (accessor, arg) => {
			const quickInputService = accessor.get(IQuickInputService);
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			const commandService = accessor.get(ICommandService);
			const clipBoardService = accessor.get(IClipBoardService);

			const tunnels = Array.from(remoteExplorerService.tunnelModel.forwarded.values()).concat(Array.from(remoteExplorerService.tunnelModel.detected.values()));
			const result = await quickInputService.pick(makeTunnelPicks(tunnels), { placeHolder: nls.localize('remote.tunnel.copyAddressPlaceholdter', "Choose a forwarded port") });
			if (result && result.tunnel) {
				await copyAddress(remoteExplorerService, clipBoardService, result.tunnel);
			} else if (result) {
				await commandService.executeCommand(ForwardPortAction.COMMANDPALETTE_ID);
			}
		};
	}
}

namespace RefreshTunnelViewAction {
	export const ID = 'remote.tunnel.refresh';
	export const LABEL = nls.localize('remote.tunnel.refreshView', "Refresh");

	export function handler(): ICommandHandler {
		return (accessor, arg) => {
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			return remoteExplorerService.refresh();
		};
	}
}

namespace ChangeLocalPortAction {
	export const ID = 'remote.tunnel.changeLocalPort';
	export const LABEL = nls.localize('remote.tunnel.changeLocalPort', "Change Local Port");

	function validateInput(value: string): string | null {
		if (!value.match(/^[0-9]+$/)) {
			return invalidPortString;
		} else if (NumBer(value) >= maxPortNumBer) {
			return invalidPortNumBerString;
		}
		return null;
	}

	export function handler(): ICommandHandler {
		return async (accessor, arg) => {
			const remoteExplorerService = accessor.get(IRemoteExplorerService);
			const notificationService = accessor.get(INotificationService);
			const context = (arg !== undefined || arg instanceof TunnelItem) ? arg : accessor.get(IContextKeyService).getContextKeyValue(TunnelViewSelectionKeyName);
			if (context instanceof TunnelItem) {
				remoteExplorerService.setEditaBle(context, {
					onFinish: async (value, success) => {
						remoteExplorerService.setEditaBle(context, null);
						if (success) {
							await remoteExplorerService.close({ host: context.remoteHost, port: context.remotePort });
							const numBerValue = NumBer(value);
							const newForward = await remoteExplorerService.forward({ host: context.remoteHost, port: context.remotePort }, numBerValue, context.name);
							if (newForward && newForward.tunnelLocalPort !== numBerValue) {
								notificationService.warn(nls.localize('remote.tunnel.changeLocalPortNumBer', "The local port {0} is not availaBle. Port numBer {1} has Been used instead", value, newForward.tunnelLocalPort));
							}
						}
					},
					validationMessage: (value) => validationMessage(validateInput(value)),
					placeholder: nls.localize('remote.tunnelsView.changePort', "New local port")
				});
			}
		};
	}
}

const tunnelViewCommandsWeightBonus = 10; // give our commands a little Bit more weight over other default list/tree commands

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: LaBelTunnelAction.ID,
	weight: KeyBindingWeight.WorkBenchContriB + tunnelViewCommandsWeightBonus,
	when: ContextKeyExpr.and(TunnelViewFocusContextKey, TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded)),
	primary: KeyCode.F2,
	mac: {
		primary: KeyCode.Enter
	},
	handler: LaBelTunnelAction.handler()
});
CommandsRegistry.registerCommand(ForwardPortAction.INLINE_ID, ForwardPortAction.inlineHandler());
CommandsRegistry.registerCommand(ForwardPortAction.COMMANDPALETTE_ID, ForwardPortAction.commandPaletteHandler());
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: ClosePortAction.INLINE_ID,
	weight: KeyBindingWeight.WorkBenchContriB + tunnelViewCommandsWeightBonus,
	when: ContextKeyExpr.and(TunnelCloseaBleContextKey, TunnelViewFocusContextKey),
	primary: KeyCode.Delete,
	mac: {
		primary: KeyMod.CtrlCmd | KeyCode.Backspace
	},
	handler: ClosePortAction.inlineHandler()
});

CommandsRegistry.registerCommand(ClosePortAction.COMMANDPALETTE_ID, ClosePortAction.commandPaletteHandler());
CommandsRegistry.registerCommand(OpenPortInBrowserAction.ID, OpenPortInBrowserAction.handler());
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: CopyAddressAction.INLINE_ID,
	weight: KeyBindingWeight.WorkBenchContriB + tunnelViewCommandsWeightBonus,
	when: ContextKeyExpr.or(ContextKeyExpr.and(TunnelViewFocusContextKey, TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded)), ContextKeyExpr.and(TunnelViewFocusContextKey, TunnelTypeContextKey.isEqualTo(TunnelType.Detected))),
	primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
	handler: CopyAddressAction.inlineHandler()
});
CommandsRegistry.registerCommand(CopyAddressAction.COMMANDPALETTE_ID, CopyAddressAction.commandPaletteHandler());
CommandsRegistry.registerCommand(RefreshTunnelViewAction.ID, RefreshTunnelViewAction.handler());
CommandsRegistry.registerCommand(ChangeLocalPortAction.ID, ChangeLocalPortAction.handler());

MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
	command: {
		id: ClosePortAction.COMMANDPALETTE_ID,
		title: ClosePortAction.LABEL
	},
	when: forwardedPortsViewEnaBled
}));
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
	command: {
		id: ForwardPortAction.COMMANDPALETTE_ID,
		title: ForwardPortAction.LABEL
	},
	when: forwardedPortsViewEnaBled
}));
MenuRegistry.appendMenuItem(MenuId.CommandPalette, ({
	command: {
		id: CopyAddressAction.COMMANDPALETTE_ID,
		title: CopyAddressAction.COMMANDPALETTE_LABEL
	},
	when: forwardedPortsViewEnaBled
}));
MenuRegistry.appendMenuItem(MenuId.TunnelTitle, ({
	group: 'navigation',
	order: 0,
	command: {
		id: ForwardPortAction.INLINE_ID,
		title: ForwardPortAction.LABEL,
		icon: { id: 'codicon/plus' }
	}
}));
MenuRegistry.appendMenuItem(MenuId.TunnelTitle, ({
	group: 'navigation',
	order: 1,
	command: {
		id: RefreshTunnelViewAction.ID,
		title: RefreshTunnelViewAction.LABEL,
		icon: { id: 'codicon/refresh' }
	}
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '0_manage',
	order: 0,
	command: {
		id: CopyAddressAction.INLINE_ID,
		title: CopyAddressAction.INLINE_LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded), TunnelTypeContextKey.isEqualTo(TunnelType.Detected))
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '0_manage',
	order: 1,
	command: {
		id: OpenPortInBrowserAction.ID,
		title: OpenPortInBrowserAction.LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded), TunnelTypeContextKey.isEqualTo(TunnelType.Detected))
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '0_manage',
	order: 2,
	command: {
		id: LaBelTunnelAction.ID,
		title: LaBelTunnelAction.LABEL,
	},
	when: TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '1_manage',
	order: 0,
	command: {
		id: ChangeLocalPortAction.ID,
		title: ChangeLocalPortAction.LABEL,
	},
	when: ContextKeyExpr.and(TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded), PortChangaBleContextKey)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '0_manage',
	order: 1,
	command: {
		id: ForwardPortAction.INLINE_ID,
		title: ForwardPortAction.TREEITEM_LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEqualTo(TunnelType.Candidate), TunnelTypeContextKey.isEqualTo(TunnelType.Add))
}));
MenuRegistry.appendMenuItem(MenuId.TunnelContext, ({
	group: '1_manage',
	order: 1,
	command: {
		id: ClosePortAction.INLINE_ID,
		title: ClosePortAction.LABEL,
	},
	when: TunnelCloseaBleContextKey
}));

MenuRegistry.appendMenuItem(MenuId.TunnelInline, ({
	order: 0,
	command: {
		id: OpenPortInBrowserAction.ID,
		title: OpenPortInBrowserAction.LABEL,
		icon: { id: 'codicon/gloBe' }
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEqualTo(TunnelType.Forwarded), TunnelTypeContextKey.isEqualTo(TunnelType.Detected))
}));
MenuRegistry.appendMenuItem(MenuId.TunnelInline, ({
	order: 0,
	command: {
		id: ForwardPortAction.INLINE_ID,
		title: ForwardPortAction.TREEITEM_LABEL,
		icon: { id: 'codicon/plus' }
	},
	when: TunnelTypeContextKey.isEqualTo(TunnelType.Candidate)
}));
MenuRegistry.appendMenuItem(MenuId.TunnelInline, ({
	order: 2,
	command: {
		id: ClosePortAction.INLINE_ID,
		title: ClosePortAction.LABEL,
		icon: { id: 'codicon/x' }
	},
	when: TunnelCloseaBleContextKey
}));
