/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/tunnelView';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { IViewDescriptor, IEditAbleDAtA, IViewsService, IViewDescriptorService } from 'vs/workbench/common/views';
import { WorkbenchAsyncDAtATree } from 'vs/plAtform/list/browser/listService';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IContextKeyService, IContextKey, RAwContextKey, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { ICommAndService, ICommAndHAndler, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { ITreeRenderer, ITreeNode, IAsyncDAtASource, ITreeContextMenuEvent, ITreeMouseEvent } from 'vs/bAse/browser/ui/tree/tree';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { DisposAble, IDisposAble, toDisposAble, MutAbleDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IconLAbel } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { ActionRunner, IAction } from 'vs/bAse/common/Actions';
import { IMenuService, MenuId, IMenu, MenuRegistry, MenuItemAction, ILocAlizedString, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { creAteAndFillInContextMenuActions, creAteAndFillInActionBArActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IRemoteExplorerService, TunnelModel, MAkeAddress, TunnelType, ITunnelItem, Tunnel, mApHAsTunnelLocAlhostOrAllInterfAces, TUNNEL_VIEW_ID } from 'vs/workbench/services/remote/common/remoteExplorerService';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { InputBox, MessAgeType } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { once } from 'vs/bAse/common/functionAl';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { URI } from 'vs/bAse/common/uri';
import { RemoteTunnel } from 'vs/plAtform/remote/common/tunnel';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export const forwArdedPortsViewEnAbled = new RAwContextKey<booleAn>('forwArdedPortsViewEnAbled', fAlse);

clAss TunnelTreeVirtuAlDelegAte implements IListVirtuAlDelegAte<ITunnelItem> {
	getHeight(element: ITunnelItem): number {
		return 22;
	}

	getTemplAteId(element: ITunnelItem): string {
		return 'tunnelItemTemplAte';
	}
}

export interfAce ITunnelViewModel {
	onForwArdedPortsChAnged: Event<void>;
	reAdonly forwArded: TunnelItem[];
	reAdonly detected: TunnelItem[];
	reAdonly cAndidAtes: TunnelItem[];
	reAdonly input: TunnelItem;
	groups(): Promise<ITunnelGroup[]>;
}

export clAss TunnelViewModel extends DisposAble implements ITunnelViewModel {
	privAte _onForwArdedPortsChAnged: Emitter<void> = new Emitter();
	public onForwArdedPortsChAnged: Event<void> = this._onForwArdedPortsChAnged.event;
	privAte model: TunnelModel;
	privAte _input: TunnelItem;
	privAte _cAndidAtes: MAp<string, { host: string, port: number, detAil: string }> = new MAp();

	constructor(
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService) {
		super();
		this.model = remoteExplorerService.tunnelModel;
		this._register(this.model.onForwArdPort(() => this._onForwArdedPortsChAnged.fire()));
		this._register(this.model.onClosePort(() => this._onForwArdedPortsChAnged.fire()));
		this._register(this.model.onPortNAme(() => this._onForwArdedPortsChAnged.fire()));
		this._register(this.model.onCAndidAtesChAnged(() => this._onForwArdedPortsChAnged.fire()));
		this._input = {
			lAbel: nls.locAlize('remote.tunnelsView.Add', "ForwArd A Port..."),
			tunnelType: TunnelType.Add,
			remoteHost: 'locAlhost',
			remotePort: 0,
			description: ''
		};
	}

	Async groups(): Promise<ITunnelGroup[]> {
		const groups: ITunnelGroup[] = [];
		this._cAndidAtes = new MAp();
		(AwAit this.model.cAndidAtes).forEAch(cAndidAte => {
			this._cAndidAtes.set(MAkeAddress(cAndidAte.host, cAndidAte.port), cAndidAte);
		});
		if ((this.model.forwArded.size > 0) || this.remoteExplorerService.getEditAbleDAtA(undefined)) {
			groups.push({
				lAbel: nls.locAlize('remote.tunnelsView.forwArded', "ForwArded"),
				tunnelType: TunnelType.ForwArded,
				items: this.forwArded
			});
		}
		if (this.model.detected.size > 0) {
			groups.push({
				lAbel: nls.locAlize('remote.tunnelsView.detected', "Existing Tunnels"),
				tunnelType: TunnelType.Detected,
				items: this.detected
			});
		}
		const cAndidAtes = AwAit this.cAndidAtes;
		if (cAndidAtes.length > 0) {
			groups.push({
				lAbel: nls.locAlize('remote.tunnelsView.cAndidAtes', "Not ForwArded"),
				tunnelType: TunnelType.CAndidAte,
				items: cAndidAtes
			});
		}
		if (groups.length === 0) {
			groups.push(this._input);
		}
		return groups;
	}

	privAte AddProcessInfoFromCAndidAte(tunnelItem: ITunnelItem) {
		const key = MAkeAddress(tunnelItem.remoteHost, tunnelItem.remotePort);
		if (this._cAndidAtes.hAs(key)) {
			tunnelItem.description = this._cAndidAtes.get(key)!.detAil;
		}
	}

	get forwArded(): TunnelItem[] {
		const forwArded = ArrAy.from(this.model.forwArded.vAlues()).mAp(tunnel => {
			const tunnelItem = TunnelItem.creAteFromTunnel(tunnel);
			this.AddProcessInfoFromCAndidAte(tunnelItem);
			return tunnelItem;
		}).sort((A: TunnelItem, b: TunnelItem) => {
			if (A.remotePort === b.remotePort) {
				return A.remoteHost < b.remoteHost ? -1 : 1;
			} else {
				return A.remotePort < b.remotePort ? -1 : 1;
			}
		});
		if (this.remoteExplorerService.getEditAbleDAtA(undefined)) {
			forwArded.push(this._input);
		}
		return forwArded;
	}

	get detected(): TunnelItem[] {
		return ArrAy.from(this.model.detected.vAlues()).mAp(tunnel => {
			const tunnelItem = TunnelItem.creAteFromTunnel(tunnel, TunnelType.Detected, fAlse);
			this.AddProcessInfoFromCAndidAte(tunnelItem);
			return tunnelItem;
		});
	}

	get cAndidAtes(): TunnelItem[] {
		const cAndidAtes: TunnelItem[] = [];
		this._cAndidAtes.forEAch(vAlue => {
			if (!mApHAsTunnelLocAlhostOrAllInterfAces(this.model.forwArded, vAlue.host, vAlue.port) &&
				!mApHAsTunnelLocAlhostOrAllInterfAces(this.model.detected, vAlue.host, vAlue.port)) {
				cAndidAtes.push(new TunnelItem(TunnelType.CAndidAte, vAlue.host, vAlue.port, undefined, undefined, fAlse, undefined, vAlue.detAil));
			}
		});
		return cAndidAtes;
	}

	get input(): TunnelItem {
		return this._input;
	}

	dispose() {
		super.dispose();
	}
}

interfAce ITunnelTemplAteDAtA {
	elementDisposAble: IDisposAble;
	contAiner: HTMLElement;
	iconLAbel: IconLAbel;
	ActionBAr: ActionBAr;
}

clAss TunnelTreeRenderer extends DisposAble implements ITreeRenderer<ITunnelGroup | ITunnelItem, ITunnelItem, ITunnelTemplAteDAtA> {
	stAtic reAdonly ITEM_HEIGHT = 22;
	stAtic reAdonly TREE_TEMPLATE_ID = 'tunnelItemTemplAte';

	privAte inputDone?: (success: booleAn, finishEditing: booleAn) => void;
	privAte _ActionRunner: ActionRunner | undefined;

	constructor(
		privAte reAdonly viewId: string,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService
	) {
		super();
	}

	set ActionRunner(ActionRunner: ActionRunner) {
		this._ActionRunner = ActionRunner;
	}

	get templAteId(): string {
		return TunnelTreeRenderer.TREE_TEMPLATE_ID;
	}

	renderTemplAte(contAiner: HTMLElement): ITunnelTemplAteDAtA {
		contAiner.clAssList.Add('custom-view-tree-node-item');
		const iconLAbel = new IconLAbel(contAiner, { supportHighlights: true });
		// dom.AddClAss(iconLAbel.element, 'tunnel-view-lAbel');
		const ActionsContAiner = dom.Append(iconLAbel.element, dom.$('.Actions'));
		const ActionBAr = new ActionBAr(ActionsContAiner, {
			ActionViewItemProvider: (Action: IAction) => {
				if (Action instAnceof MenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
				} else if (Action instAnceof SubmenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
				}

				return undefined;
			}
		});

		return { iconLAbel, ActionBAr, contAiner, elementDisposAble: DisposAble.None };
	}

	privAte isTunnelItem(item: ITunnelGroup | ITunnelItem): item is ITunnelItem {
		return !!((<ITunnelItem>item).remotePort);
	}

	renderElement(element: ITreeNode<ITunnelGroup | ITunnelItem, ITunnelGroup | ITunnelItem>, index: number, templAteDAtA: ITunnelTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
		const node = element.element;

		// reset
		templAteDAtA.ActionBAr.cleAr();
		let editAbleDAtA: IEditAbleDAtA | undefined;
		if (this.isTunnelItem(node)) {
			editAbleDAtA = this.remoteExplorerService.getEditAbleDAtA(node);
			if (editAbleDAtA) {
				templAteDAtA.iconLAbel.element.style.displAy = 'none';
				this.renderInputBox(templAteDAtA.contAiner, editAbleDAtA);
			} else {
				templAteDAtA.iconLAbel.element.style.displAy = 'flex';
				this.renderTunnel(node, templAteDAtA);
			}
		} else if ((node.tunnelType === TunnelType.Add) && (editAbleDAtA = this.remoteExplorerService.getEditAbleDAtA(undefined))) {
			templAteDAtA.iconLAbel.element.style.displAy = 'none';
			this.renderInputBox(templAteDAtA.contAiner, editAbleDAtA);
		} else {
			templAteDAtA.iconLAbel.element.style.displAy = 'flex';
			templAteDAtA.iconLAbel.setLAbel(node.lAbel);
		}
	}

	privAte renderTunnel(node: ITunnelItem, templAteDAtA: ITunnelTemplAteDAtA) {
		const lAbel = node.lAbel + (node.description ? (' - ' + node.description) : '');
		templAteDAtA.iconLAbel.setLAbel(node.lAbel, node.description, { title: lAbel, extrAClAsses: ['tunnel-view-lAbel'] });
		templAteDAtA.ActionBAr.context = node;
		const contextKeyService = this._register(this.contextKeyService.creAteScoped());
		contextKeyService.creAteKey('view', this.viewId);
		contextKeyService.creAteKey('tunnelType', node.tunnelType);
		contextKeyService.creAteKey('tunnelCloseAble', node.closeAble);
		const disposAbleStore = new DisposAbleStore();
		templAteDAtA.elementDisposAble = disposAbleStore;
		const menu = disposAbleStore.Add(this.menuService.creAteMenu(MenuId.TunnelInline, contextKeyService));
		const Actions: IAction[] = [];
		disposAbleStore.Add(creAteAndFillInActionBArActions(menu, { shouldForwArdArgs: true }, Actions));
		if (Actions) {
			templAteDAtA.ActionBAr.push(Actions, { icon: true, lAbel: fAlse });
			if (this._ActionRunner) {
				templAteDAtA.ActionBAr.ActionRunner = this._ActionRunner;
			}
		}
	}

	privAte renderInputBox(contAiner: HTMLElement, editAbleDAtA: IEditAbleDAtA): IDisposAble {
		// Required for FireFox. The blur event doesn't fire on FireFox when you just mAsh the "+" button to forwArd A port.
		if (this.inputDone) {
			this.inputDone(fAlse, fAlse);
			this.inputDone = undefined;
		}
		const vAlue = editAbleDAtA.stArtingVAlue || '';
		const inputBox = new InputBox(contAiner, this.contextViewService, {
			AriALAbel: nls.locAlize('remote.tunnelsView.input', "Press Enter to confirm or EscApe to cAncel."),
			vAlidAtionOptions: {
				vAlidAtion: (vAlue) => {
					const messAge = editAbleDAtA.vAlidAtionMessAge(vAlue);
					if (!messAge || messAge.severity !== Severity.Error) {
						return null;
					}

					return {
						content: messAge.content,
						formAtContent: true,
						type: MessAgeType.ERROR
					};
				}
			},
			plAceholder: editAbleDAtA.plAceholder || ''
		});
		const styler = AttAchInputBoxStyler(inputBox, this.themeService);

		inputBox.vAlue = vAlue;
		inputBox.focus();
		inputBox.select({ stArt: 0, end: editAbleDAtA.stArtingVAlue ? editAbleDAtA.stArtingVAlue.length : 0 });

		const done = once((success: booleAn, finishEditing: booleAn) => {
			if (this.inputDone) {
				this.inputDone = undefined;
			}
			inputBox.element.style.displAy = 'none';
			const inputVAlue = inputBox.vAlue;
			dispose(toDispose);
			if (finishEditing) {
				editAbleDAtA.onFinish(inputVAlue, success);
			}
		});
		this.inputDone = done;

		const toDispose = [
			inputBox,
			dom.AddStAndArdDisposAbleListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e: IKeyboArdEvent) => {
				if (e.equAls(KeyCode.Enter)) {
					if (inputBox.vAlidAte()) {
						done(true, true);
					}
				} else if (e.equAls(KeyCode.EscApe)) {
					done(fAlse, true);
				}
			}),
			dom.AddDisposAbleListener(inputBox.inputElement, dom.EventType.BLUR, () => {
				done(inputBox.isInputVAlid(), true);
			}),
			styler
		];

		return toDisposAble(() => {
			done(fAlse, fAlse);
		});
	}

	disposeElement(resource: ITreeNode<ITunnelGroup | ITunnelItem, ITunnelGroup | ITunnelItem>, index: number, templAteDAtA: ITunnelTemplAteDAtA): void {
		templAteDAtA.elementDisposAble.dispose();
	}

	disposeTemplAte(templAteDAtA: ITunnelTemplAteDAtA): void {
		templAteDAtA.ActionBAr.dispose();
		templAteDAtA.elementDisposAble.dispose();
	}
}

clAss TunnelDAtASource implements IAsyncDAtASource<ITunnelViewModel, ITunnelItem | ITunnelGroup> {
	hAsChildren(element: ITunnelViewModel | ITunnelItem | ITunnelGroup) {
		if (element instAnceof TunnelViewModel) {
			return true;
		} else if (element instAnceof TunnelItem) {
			return fAlse;
		} else if ((<ITunnelGroup>element).items) {
			return true;
		}
		return fAlse;
	}

	getChildren(element: ITunnelViewModel | ITunnelItem | ITunnelGroup) {
		if (element instAnceof TunnelViewModel) {
			return element.groups();
		} else if (element instAnceof TunnelItem) {
			return [];
		} else if ((<ITunnelGroup>element).items) {
			return (<ITunnelGroup>element).items!;
		}
		return [];
	}
}

interfAce ITunnelGroup {
	tunnelType: TunnelType;
	lAbel: string;
	items?: ITunnelItem[] | Promise<ITunnelItem[]>;
}

clAss TunnelItem implements ITunnelItem {
	stAtic creAteFromTunnel(tunnel: Tunnel, type: TunnelType = TunnelType.ForwArded, closeAble?: booleAn) {
		return new TunnelItem(type, tunnel.remoteHost, tunnel.remotePort, tunnel.locAlAddress, tunnel.locAlPort, closeAble === undefined ? tunnel.closeAble : closeAble, tunnel.nAme, tunnel.description);
	}

	constructor(
		public tunnelType: TunnelType,
		public remoteHost: string,
		public remotePort: number,
		public locAlAddress?: string,
		public locAlPort?: number,
		public closeAble?: booleAn,
		public nAme?: string,
		privAte _description?: string,
	) { }
	get lAbel(): string {
		if (this.nAme) {
			return nls.locAlize('remote.tunnelsView.forwArdedPortLAbel0', "{0}", this.nAme);
		} else if (this.locAlAddress) {
			return nls.locAlize('remote.tunnelsView.forwArdedPortLAbel1', "{0} \u2192 {1}", this.remotePort, TunnelItem.compActLongAddress(this.locAlAddress));
		} else {
			return nls.locAlize('remote.tunnelsView.forwArdedPortLAbel2', "{0}", this.remotePort);
		}
	}

	privAte stAtic compActLongAddress(Address: string): string {
		if (Address.length < 15) {
			return Address;
		}
		return new URL(Address).host;
	}

	set description(description: string | undefined) {
		this._description = description;
	}

	get description(): string | undefined {
		if (this._description) {
			return this._description;
		} else if (this.nAme) {
			return nls.locAlize('remote.tunnelsView.forwArdedPortDescription0', "{0} \u2192 {1}", this.remotePort, this.locAlAddress);
		}
		return undefined;
	}
}

export const TunnelTypeContextKey = new RAwContextKey<TunnelType>('tunnelType', TunnelType.Add);
export const TunnelCloseAbleContextKey = new RAwContextKey<booleAn>('tunnelCloseAble', fAlse);
const TunnelViewFocusContextKey = new RAwContextKey<booleAn>('tunnelViewFocus', fAlse);
const TunnelViewSelectionKeyNAme = 'tunnelViewSelection';
const TunnelViewSelectionContextKey = new RAwContextKey<ITunnelItem | undefined>(TunnelViewSelectionKeyNAme, undefined);
const PortChAngAbleContextKey = new RAwContextKey<booleAn>('portChAngAble', fAlse);

clAss TunnelDAtATree extends WorkbenchAsyncDAtATree<Any, Any, Any> { }

export clAss TunnelPAnel extends ViewPAne {
	stAtic reAdonly ID = TUNNEL_VIEW_ID;
	stAtic reAdonly TITLE = nls.locAlize('remote.tunnel', "ForwArded Ports");
	privAte tree!: TunnelDAtATree;
	privAte tunnelTypeContext: IContextKey<TunnelType>;
	privAte tunnelCloseAbleContext: IContextKey<booleAn>;
	privAte tunnelViewFocusContext: IContextKey<booleAn>;
	privAte tunnelViewSelectionContext: IContextKey<ITunnelItem | undefined>;
	privAte portChAngAbleContextKey: IContextKey<booleAn>;
	privAte isEditing: booleAn = fAlse;
	privAte titleActions: IAction[] = [];
	privAte reAdonly titleActionsDisposAble = this._register(new MutAbleDisposAble());

	constructor(
		protected viewModel: ITunnelViewModel,
		options: IViewPAneOptions,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IOpenerService openerService: IOpenerService,
		@IQuickInputService protected quickInputService: IQuickInputService,
		@ICommAndService protected commAndService: ICommAndService,
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService themeService: IThemeService,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.tunnelTypeContext = TunnelTypeContextKey.bindTo(contextKeyService);
		this.tunnelCloseAbleContext = TunnelCloseAbleContextKey.bindTo(contextKeyService);
		this.tunnelViewFocusContext = TunnelViewFocusContextKey.bindTo(contextKeyService);
		this.tunnelViewSelectionContext = TunnelViewSelectionContextKey.bindTo(contextKeyService);
		this.portChAngAbleContextKey = PortChAngAbleContextKey.bindTo(contextKeyService);

		const scopedContextKeyService = this._register(this.contextKeyService.creAteScoped());
		scopedContextKeyService.creAteKey('view', TunnelPAnel.ID);

		const titleMenu = this._register(this.menuService.creAteMenu(MenuId.TunnelTitle, scopedContextKeyService));
		const updAteActions = () => {
			this.titleActions = [];
			this.titleActionsDisposAble.vAlue = creAteAndFillInActionBArActions(titleMenu, undefined, this.titleActions);
			this.updAteActions();
		};

		this._register(titleMenu.onDidChAnge(updAteActions));
		updAteActions();

		this._register(toDisposAble(() => {
			this.titleActions = [];
		}));
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		const pAnelContAiner = dom.Append(contAiner, dom.$('.tree-explorer-viewlet-tree-view'));
		const treeContAiner = dom.Append(pAnelContAiner, dom.$('.customview-tree'));
		treeContAiner.clAssList.Add('file-icon-themAble-tree', 'show-file-icons');

		const renderer = new TunnelTreeRenderer(TunnelPAnel.ID, this.menuService, this.contextKeyService, this.instAntiAtionService, this.contextViewService, this.themeService, this.remoteExplorerService);
		this.tree = this.instAntiAtionService.creAteInstAnce(TunnelDAtATree,
			'RemoteTunnels',
			treeContAiner,
			new TunnelTreeVirtuAlDelegAte(),
			[renderer],
			new TunnelDAtASource(),
			{
				collApseByDefAult: (e: ITunnelItem | ITunnelGroup): booleAn => {
					return fAlse;
				},
				keyboArdNAvigAtionLAbelProvider: {
					getKeyboArdNAvigAtionLAbel: (item: ITunnelItem | ITunnelGroup) => {
						return item.lAbel;
					}
				},
				multipleSelectionSupport: fAlse,
				AccessibilityProvider: {
					getAriALAbel: (item: ITunnelItem | ITunnelGroup) => {
						if (item instAnceof TunnelItem) {
							if (item.locAlAddress) {
								return nls.locAlize('remote.tunnel.AriALAbelForwArded', "Remote port {0}:{1} forwArded to locAl Address {2}", item.remoteHost, item.remotePort, item.locAlAddress);
							} else {
								return nls.locAlize('remote.tunnel.AriALAbelCAndidAte', "Remote port {0}:{1} not forwArded", item.remoteHost, item.remotePort);
							}
						} else {
							return item.lAbel;
						}
					},
					getWidgetAriALAbel: () => nls.locAlize('tunnelView', "Tunnel View")
				}
			}
		);
		const ActionRunner: ActionRunner = new ActionRunner();
		renderer.ActionRunner = ActionRunner;

		this._register(this.tree.onContextMenu(e => this.onContextMenu(e, ActionRunner)));
		this._register(this.tree.onMouseDblClick(e => this.onMouseDblClick(e)));
		this._register(this.tree.onDidChAngeFocus(e => this.onFocusChAnged(e.elements)));
		this._register(this.tree.onDidFocus(() => this.tunnelViewFocusContext.set(true)));
		this._register(this.tree.onDidBlur(() => this.tunnelViewFocusContext.set(fAlse)));

		this.tree.setInput(this.viewModel);
		this._register(this.viewModel.onForwArdedPortsChAnged(() => {
			this._onDidChAngeViewWelcomeStAte.fire();
			this.tree.updAteChildren(undefined, true);
		}));

		this._register(Event.debounce(this.tree.onDidOpen, (lAst, event) => event, 75, true)(e => {
			if (e.element && (e.element.tunnelType === TunnelType.Add)) {
				this.commAndService.executeCommAnd(ForwArdPortAction.INLINE_ID);
			}
		}));

		this._register(this.remoteExplorerService.onDidChAngeEditAble(Async e => {
			this.isEditing = !!this.remoteExplorerService.getEditAbleDAtA(e);
			this._onDidChAngeViewWelcomeStAte.fire();

			if (!this.isEditing) {
				treeContAiner.clAssList.remove('highlight');
			}

			AwAit this.tree.updAteChildren(undefined, fAlse);

			if (this.isEditing) {
				treeContAiner.clAssList.Add('highlight');
				if (!e) {
					// When we Are in editing mode for A new forwArd, rAther thAn updAting An existing one we need to reveAl the input box since it might be out of view.
					this.tree.reveAl(this.viewModel.input);
				}
			} else {
				this.tree.domFocus();
			}
		}));
	}

	privAte get contributedContextMenu(): IMenu {
		const contributedContextMenu = this._register(this.menuService.creAteMenu(MenuId.TunnelContext, this.tree.contextKeyService));
		return contributedContextMenu;
	}

	getActions(): IAction[] {
		return this.titleActions;
	}

	shouldShowWelcome(): booleAn {
		return this.viewModel.forwArded.length === 0 && this.viewModel.cAndidAtes.length === 0 && !this.isEditing;
	}

	focus(): void {
		super.focus();
		this.tree.domFocus();
	}

	privAte onFocusChAnged(elements: ITunnelItem[]) {
		const item = elements && elements.length ? elements[0] : undefined;
		if (item) {
			this.tunnelViewSelectionContext.set(item);
			this.tunnelTypeContext.set(item.tunnelType);
			this.tunnelCloseAbleContext.set(!!item.closeAble);
			this.portChAngAbleContextKey.set(!!item.locAlPort);
		} else {
			this.tunnelTypeContext.reset();
			this.tunnelViewSelectionContext.reset();
			this.tunnelCloseAbleContext.reset();
			this.portChAngAbleContextKey.reset();
		}
	}

	privAte onContextMenu(treeEvent: ITreeContextMenuEvent<ITunnelItem | ITunnelGroup>, ActionRunner: ActionRunner): void {
		if ((treeEvent.element !== null) && !(treeEvent.element instAnceof TunnelItem)) {
			return;
		}
		const node: ITunnelItem | null = treeEvent.element;
		const event: UIEvent = treeEvent.browserEvent;

		event.preventDefAult();
		event.stopPropAgAtion();

		if (node) {
			this.tree!.setFocus([node]);
			this.tunnelTypeContext.set(node.tunnelType);
			this.tunnelCloseAbleContext.set(!!node.closeAble);
			this.portChAngAbleContextKey.set(!!node.locAlPort);
		} else {
			this.tunnelTypeContext.set(TunnelType.Add);
			this.tunnelCloseAbleContext.set(fAlse);
			this.portChAngAbleContextKey.set(fAlse);
		}

		const Actions: IAction[] = [];
		this._register(creAteAndFillInContextMenuActions(this.contributedContextMenu, { shouldForwArdArgs: true }, Actions, this.contextMenuService));

		this.contextMenuService.showContextMenu({
			getAnchor: () => treeEvent.Anchor,
			getActions: () => Actions,
			getActionViewItem: (Action) => {
				const keybinding = this.keybindingService.lookupKeybinding(Action.id);
				if (keybinding) {
					return new ActionViewItem(Action, Action, { lAbel: true, keybinding: keybinding.getLAbel() });
				}
				return undefined;
			},
			onHide: (wAsCAncelled?: booleAn) => {
				if (wAsCAncelled) {
					this.tree!.domFocus();
				}
			},
			getActionsContext: () => node,
			ActionRunner
		});
	}

	privAte onMouseDblClick(e: ITreeMouseEvent<ITunnelGroup | ITunnelItem | null>): void {
		if (!e.element) {
			this.commAndService.executeCommAnd(ForwArdPortAction.INLINE_ID);
		}
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.tree.lAyout(height, width);
	}
}

export clAss TunnelPAnelDescriptor implements IViewDescriptor {
	reAdonly id = TunnelPAnel.ID;
	reAdonly nAme = TunnelPAnel.TITLE;
	reAdonly ctorDescriptor: SyncDescriptor<TunnelPAnel>;
	reAdonly cAnToggleVisibility = true;
	reAdonly hideByDefAult = fAlse;
	reAdonly workspAce = true;
	reAdonly group = 'detAils@0';
	reAdonly remoteAuthority?: string | string[];
	reAdonly cAnMoveView = true;

	constructor(viewModel: ITunnelViewModel, environmentService: IWorkbenchEnvironmentService) {
		this.ctorDescriptor = new SyncDescriptor(TunnelPAnel, [viewModel]);
		this.remoteAuthority = environmentService.remoteAuthority ? environmentService.remoteAuthority.split('+')[0] : undefined;
	}
}

function vAlidAtionMessAge(vAlidAtionString: string | null): { content: string, severity: Severity } | null {
	if (!vAlidAtionString) {
		return null;
	}

	return {
		content: vAlidAtionString,
		severity: Severity.Error
	};
}

nAmespAce LAbelTunnelAction {
	export const ID = 'remote.tunnel.lAbel';
	export const LABEL = nls.locAlize('remote.tunnel.lAbel', "Set LAbel");

	export function hAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const context = (Arg !== undefined || Arg instAnceof TunnelItem) ? Arg : Accessor.get(IContextKeyService).getContextKeyVAlue(TunnelViewSelectionKeyNAme);
			if (context instAnceof TunnelItem) {
				const remoteExplorerService = Accessor.get(IRemoteExplorerService);
				remoteExplorerService.setEditAble(context, {
					onFinish: Async (vAlue, success) => {
						if (success) {
							remoteExplorerService.tunnelModel.nAme(context.remoteHost, context.remotePort, vAlue);
						}
						remoteExplorerService.setEditAble(context, null);
					},
					vAlidAtionMessAge: () => null,
					plAceholder: nls.locAlize('remote.tunnelsView.lAbelPlAceholder', "Port lAbel"),
					stArtingVAlue: context.nAme
				});
			}
			return;
		};
	}
}

const invAlidPortString: string = nls.locAlize('remote.tunnelsView.portNumberVAlid', "ForwArded port is invAlid.");
const mAxPortNumber: number = 65536;
const invAlidPortNumberString: string = nls.locAlize('remote.tunnelsView.portNumberToHigh', "Port number must be \u2265 0 And < {0}.", mAxPortNumber);

export nAmespAce ForwArdPortAction {
	export const INLINE_ID = 'remote.tunnel.forwArdInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.forwArdCommAndPAlette';
	export const LABEL: ILocAlizedString = { vAlue: nls.locAlize('remote.tunnel.forwArd', "ForwArd A Port"), originAl: 'ForwArd A Port' };
	export const TREEITEM_LABEL = nls.locAlize('remote.tunnel.forwArdItem', "ForwArd Port");
	const forwArdPrompt = nls.locAlize('remote.tunnel.forwArdPrompt', "Port number or Address (eg. 3000 or 10.10.10.10:2000).");

	function pArseInput(vAlue: string): { host: string, port: number } | undefined {
		const mAtches = vAlue.mAtch(/^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\:|locAlhost:)?([0-9]+)$/);
		if (!mAtches) {
			return undefined;
		}
		return { host: mAtches[1]?.substring(0, mAtches[1].length - 1) || 'locAlhost', port: Number(mAtches[2]) };
	}

	function vAlidAteInput(vAlue: string): string | null {
		const pArsed = pArseInput(vAlue);
		if (!pArsed) {
			return invAlidPortString;
		} else if (pArsed.port >= mAxPortNumber) {
			return invAlidPortNumberString;
		}
		return null;
	}

	function error(notificAtionService: INotificAtionService, tunnel: RemoteTunnel | void, host: string, port: number) {
		if (!tunnel) {
			notificAtionService.wArn(nls.locAlize('remote.tunnel.forwArdError', "UnAble to forwArd {0}:{1}. The host mAy not be AvAilAble or thAt remote port mAy AlreAdy be forwArded", host, port));
		}
	}

	export function inlineHAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			const notificAtionService = Accessor.get(INotificAtionService);
			if (Arg instAnceof TunnelItem) {
				remoteExplorerService.forwArd({ host: Arg.remoteHost, port: Arg.remotePort }).then(tunnel => error(notificAtionService, tunnel, Arg.remoteHost, Arg.remotePort));
			} else {
				remoteExplorerService.setEditAble(undefined, {
					onFinish: Async (vAlue, success) => {
						let pArsed: { host: string, port: number } | undefined;
						if (success && (pArsed = pArseInput(vAlue))) {
							remoteExplorerService.forwArd({ host: pArsed.host, port: pArsed.port }).then(tunnel => error(notificAtionService, tunnel, pArsed!.host, pArsed!.port));
						}
						remoteExplorerService.setEditAble(undefined, null);
					},
					vAlidAtionMessAge: (vAlue) => vAlidAtionMessAge(vAlidAteInput(vAlue)),
					plAceholder: forwArdPrompt
				});
			}
		};
	}

	export function commAndPAletteHAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			const notificAtionService = Accessor.get(INotificAtionService);
			const viewsService = Accessor.get(IViewsService);
			const quickInputService = Accessor.get(IQuickInputService);
			AwAit viewsService.openView(TunnelPAnel.ID, true);
			const vAlue = AwAit quickInputService.input({
				prompt: forwArdPrompt,
				vAlidAteInput: (vAlue) => Promise.resolve(vAlidAteInput(vAlue))
			});
			let pArsed: { host: string, port: number } | undefined;
			if (vAlue && (pArsed = pArseInput(vAlue))) {
				remoteExplorerService.forwArd({ host: pArsed.host, port: pArsed.port }).then(tunnel => error(notificAtionService, tunnel, pArsed!.host, pArsed!.port));
			}
		};
	}
}

interfAce QuickPickTunnel extends IQuickPickItem {
	tunnel?: ITunnelItem
}

function mAkeTunnelPicks(tunnels: Tunnel[]): QuickPickInput<QuickPickTunnel>[] {
	const picks: QuickPickInput<QuickPickTunnel>[] = tunnels.mAp(forwArded => {
		const item = TunnelItem.creAteFromTunnel(forwArded);
		return {
			lAbel: item.lAbel,
			description: item.description,
			tunnel: item
		};
	});
	if (picks.length === 0) {
		picks.push({
			lAbel: nls.locAlize('remote.tunnel.closeNoPorts', "No ports currently forwArded. Try running the {0} commAnd", ForwArdPortAction.LABEL.vAlue)
		});
	}
	return picks;
}

nAmespAce ClosePortAction {
	export const INLINE_ID = 'remote.tunnel.closeInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.closeCommAndPAlette';
	export const LABEL: ILocAlizedString = { vAlue: nls.locAlize('remote.tunnel.close', "Stop ForwArding Port"), originAl: 'Stop ForwArding Port' };

	export function inlineHAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const context = (Arg !== undefined || Arg instAnceof TunnelItem) ? Arg : Accessor.get(IContextKeyService).getContextKeyVAlue(TunnelViewSelectionKeyNAme);
			if (context instAnceof TunnelItem) {
				const remoteExplorerService = Accessor.get(IRemoteExplorerService);
				AwAit remoteExplorerService.close({ host: context.remoteHost, port: context.remotePort });
			}
		};
	}

	export function commAndPAletteHAndler(): ICommAndHAndler {
		return Async (Accessor) => {
			const quickInputService = Accessor.get(IQuickInputService);
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			const commAndService = Accessor.get(ICommAndService);

			const picks: QuickPickInput<QuickPickTunnel>[] = mAkeTunnelPicks(ArrAy.from(remoteExplorerService.tunnelModel.forwArded.vAlues()).filter(tunnel => tunnel.closeAble));
			const result = AwAit quickInputService.pick(picks, { plAceHolder: nls.locAlize('remote.tunnel.closePlAceholder', "Choose A port to stop forwArding") });
			if (result && result.tunnel) {
				AwAit remoteExplorerService.close({ host: result.tunnel.remoteHost, port: result.tunnel.remotePort });
			} else if (result) {
				AwAit commAndService.executeCommAnd(ForwArdPortAction.COMMANDPALETTE_ID);
			}
		};
	}
}

export nAmespAce OpenPortInBrowserAction {
	export const ID = 'remote.tunnel.open';
	export const LABEL = nls.locAlize('remote.tunnel.open', "Open in Browser");

	export function hAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			if (Arg instAnceof TunnelItem) {
				const model = Accessor.get(IRemoteExplorerService).tunnelModel;
				const openerService = Accessor.get(IOpenerService);
				const key = MAkeAddress(Arg.remoteHost, Arg.remotePort);
				return run(model, openerService, key);
			}
		};
	}

	export function run(model: TunnelModel, openerService: IOpenerService, key: string) {
		const tunnel = model.forwArded.get(key) || model.detected.get(key);
		let Address: string | undefined;
		if (tunnel && tunnel.locAlAddress && (Address = model.Address(tunnel.remoteHost, tunnel.remotePort))) {
			return openerService.open(URI.pArse('http://' + Address));
		}
		return Promise.resolve();
	}
}

nAmespAce CopyAddressAction {
	export const INLINE_ID = 'remote.tunnel.copyAddressInline';
	export const COMMANDPALETTE_ID = 'remote.tunnel.copyAddressCommAndPAlette';
	export const INLINE_LABEL = nls.locAlize('remote.tunnel.copyAddressInline', "Copy Address");
	export const COMMANDPALETTE_LABEL = nls.locAlize('remote.tunnel.copyAddressCommAndPAlette', "Copy ForwArded Port Address");

	Async function copyAddress(remoteExplorerService: IRemoteExplorerService, clipboArdService: IClipboArdService, tunnelItem: ITunnelItem) {
		const Address = remoteExplorerService.tunnelModel.Address(tunnelItem.remoteHost, tunnelItem.remotePort);
		if (Address) {
			AwAit clipboArdService.writeText(Address.toString());
		}
	}

	export function inlineHAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const context = (Arg !== undefined || Arg instAnceof TunnelItem) ? Arg : Accessor.get(IContextKeyService).getContextKeyVAlue(TunnelViewSelectionKeyNAme);
			if (context instAnceof TunnelItem) {
				return copyAddress(Accessor.get(IRemoteExplorerService), Accessor.get(IClipboArdService), context);
			}
		};
	}

	export function commAndPAletteHAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const quickInputService = Accessor.get(IQuickInputService);
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			const commAndService = Accessor.get(ICommAndService);
			const clipboArdService = Accessor.get(IClipboArdService);

			const tunnels = ArrAy.from(remoteExplorerService.tunnelModel.forwArded.vAlues()).concAt(ArrAy.from(remoteExplorerService.tunnelModel.detected.vAlues()));
			const result = AwAit quickInputService.pick(mAkeTunnelPicks(tunnels), { plAceHolder: nls.locAlize('remote.tunnel.copyAddressPlAceholdter', "Choose A forwArded port") });
			if (result && result.tunnel) {
				AwAit copyAddress(remoteExplorerService, clipboArdService, result.tunnel);
			} else if (result) {
				AwAit commAndService.executeCommAnd(ForwArdPortAction.COMMANDPALETTE_ID);
			}
		};
	}
}

nAmespAce RefreshTunnelViewAction {
	export const ID = 'remote.tunnel.refresh';
	export const LABEL = nls.locAlize('remote.tunnel.refreshView', "Refresh");

	export function hAndler(): ICommAndHAndler {
		return (Accessor, Arg) => {
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			return remoteExplorerService.refresh();
		};
	}
}

nAmespAce ChAngeLocAlPortAction {
	export const ID = 'remote.tunnel.chAngeLocAlPort';
	export const LABEL = nls.locAlize('remote.tunnel.chAngeLocAlPort', "ChAnge LocAl Port");

	function vAlidAteInput(vAlue: string): string | null {
		if (!vAlue.mAtch(/^[0-9]+$/)) {
			return invAlidPortString;
		} else if (Number(vAlue) >= mAxPortNumber) {
			return invAlidPortNumberString;
		}
		return null;
	}

	export function hAndler(): ICommAndHAndler {
		return Async (Accessor, Arg) => {
			const remoteExplorerService = Accessor.get(IRemoteExplorerService);
			const notificAtionService = Accessor.get(INotificAtionService);
			const context = (Arg !== undefined || Arg instAnceof TunnelItem) ? Arg : Accessor.get(IContextKeyService).getContextKeyVAlue(TunnelViewSelectionKeyNAme);
			if (context instAnceof TunnelItem) {
				remoteExplorerService.setEditAble(context, {
					onFinish: Async (vAlue, success) => {
						remoteExplorerService.setEditAble(context, null);
						if (success) {
							AwAit remoteExplorerService.close({ host: context.remoteHost, port: context.remotePort });
							const numberVAlue = Number(vAlue);
							const newForwArd = AwAit remoteExplorerService.forwArd({ host: context.remoteHost, port: context.remotePort }, numberVAlue, context.nAme);
							if (newForwArd && newForwArd.tunnelLocAlPort !== numberVAlue) {
								notificAtionService.wArn(nls.locAlize('remote.tunnel.chAngeLocAlPortNumber', "The locAl port {0} is not AvAilAble. Port number {1} hAs been used insteAd", vAlue, newForwArd.tunnelLocAlPort));
							}
						}
					},
					vAlidAtionMessAge: (vAlue) => vAlidAtionMessAge(vAlidAteInput(vAlue)),
					plAceholder: nls.locAlize('remote.tunnelsView.chAngePort', "New locAl port")
				});
			}
		};
	}
}

const tunnelViewCommAndsWeightBonus = 10; // give our commAnds A little bit more weight over other defAult list/tree commAnds

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: LAbelTunnelAction.ID,
	weight: KeybindingWeight.WorkbenchContrib + tunnelViewCommAndsWeightBonus,
	when: ContextKeyExpr.And(TunnelViewFocusContextKey, TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded)),
	primAry: KeyCode.F2,
	mAc: {
		primAry: KeyCode.Enter
	},
	hAndler: LAbelTunnelAction.hAndler()
});
CommAndsRegistry.registerCommAnd(ForwArdPortAction.INLINE_ID, ForwArdPortAction.inlineHAndler());
CommAndsRegistry.registerCommAnd(ForwArdPortAction.COMMANDPALETTE_ID, ForwArdPortAction.commAndPAletteHAndler());
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ClosePortAction.INLINE_ID,
	weight: KeybindingWeight.WorkbenchContrib + tunnelViewCommAndsWeightBonus,
	when: ContextKeyExpr.And(TunnelCloseAbleContextKey, TunnelViewFocusContextKey),
	primAry: KeyCode.Delete,
	mAc: {
		primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce
	},
	hAndler: ClosePortAction.inlineHAndler()
});

CommAndsRegistry.registerCommAnd(ClosePortAction.COMMANDPALETTE_ID, ClosePortAction.commAndPAletteHAndler());
CommAndsRegistry.registerCommAnd(OpenPortInBrowserAction.ID, OpenPortInBrowserAction.hAndler());
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: CopyAddressAction.INLINE_ID,
	weight: KeybindingWeight.WorkbenchContrib + tunnelViewCommAndsWeightBonus,
	when: ContextKeyExpr.or(ContextKeyExpr.And(TunnelViewFocusContextKey, TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded)), ContextKeyExpr.And(TunnelViewFocusContextKey, TunnelTypeContextKey.isEquAlTo(TunnelType.Detected))),
	primAry: KeyMod.CtrlCmd | KeyCode.KEY_C,
	hAndler: CopyAddressAction.inlineHAndler()
});
CommAndsRegistry.registerCommAnd(CopyAddressAction.COMMANDPALETTE_ID, CopyAddressAction.commAndPAletteHAndler());
CommAndsRegistry.registerCommAnd(RefreshTunnelViewAction.ID, RefreshTunnelViewAction.hAndler());
CommAndsRegistry.registerCommAnd(ChAngeLocAlPortAction.ID, ChAngeLocAlPortAction.hAndler());

MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, ({
	commAnd: {
		id: ClosePortAction.COMMANDPALETTE_ID,
		title: ClosePortAction.LABEL
	},
	when: forwArdedPortsViewEnAbled
}));
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, ({
	commAnd: {
		id: ForwArdPortAction.COMMANDPALETTE_ID,
		title: ForwArdPortAction.LABEL
	},
	when: forwArdedPortsViewEnAbled
}));
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, ({
	commAnd: {
		id: CopyAddressAction.COMMANDPALETTE_ID,
		title: CopyAddressAction.COMMANDPALETTE_LABEL
	},
	when: forwArdedPortsViewEnAbled
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelTitle, ({
	group: 'nAvigAtion',
	order: 0,
	commAnd: {
		id: ForwArdPortAction.INLINE_ID,
		title: ForwArdPortAction.LABEL,
		icon: { id: 'codicon/plus' }
	}
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelTitle, ({
	group: 'nAvigAtion',
	order: 1,
	commAnd: {
		id: RefreshTunnelViewAction.ID,
		title: RefreshTunnelViewAction.LABEL,
		icon: { id: 'codicon/refresh' }
	}
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '0_mAnAge',
	order: 0,
	commAnd: {
		id: CopyAddressAction.INLINE_ID,
		title: CopyAddressAction.INLINE_LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded), TunnelTypeContextKey.isEquAlTo(TunnelType.Detected))
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '0_mAnAge',
	order: 1,
	commAnd: {
		id: OpenPortInBrowserAction.ID,
		title: OpenPortInBrowserAction.LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded), TunnelTypeContextKey.isEquAlTo(TunnelType.Detected))
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '0_mAnAge',
	order: 2,
	commAnd: {
		id: LAbelTunnelAction.ID,
		title: LAbelTunnelAction.LABEL,
	},
	when: TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded)
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '1_mAnAge',
	order: 0,
	commAnd: {
		id: ChAngeLocAlPortAction.ID,
		title: ChAngeLocAlPortAction.LABEL,
	},
	when: ContextKeyExpr.And(TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded), PortChAngAbleContextKey)
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '0_mAnAge',
	order: 1,
	commAnd: {
		id: ForwArdPortAction.INLINE_ID,
		title: ForwArdPortAction.TREEITEM_LABEL,
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEquAlTo(TunnelType.CAndidAte), TunnelTypeContextKey.isEquAlTo(TunnelType.Add))
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelContext, ({
	group: '1_mAnAge',
	order: 1,
	commAnd: {
		id: ClosePortAction.INLINE_ID,
		title: ClosePortAction.LABEL,
	},
	when: TunnelCloseAbleContextKey
}));

MenuRegistry.AppendMenuItem(MenuId.TunnelInline, ({
	order: 0,
	commAnd: {
		id: OpenPortInBrowserAction.ID,
		title: OpenPortInBrowserAction.LABEL,
		icon: { id: 'codicon/globe' }
	},
	when: ContextKeyExpr.or(TunnelTypeContextKey.isEquAlTo(TunnelType.ForwArded), TunnelTypeContextKey.isEquAlTo(TunnelType.Detected))
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelInline, ({
	order: 0,
	commAnd: {
		id: ForwArdPortAction.INLINE_ID,
		title: ForwArdPortAction.TREEITEM_LABEL,
		icon: { id: 'codicon/plus' }
	},
	when: TunnelTypeContextKey.isEquAlTo(TunnelType.CAndidAte)
}));
MenuRegistry.AppendMenuItem(MenuId.TunnelInline, ({
	order: 2,
	commAnd: {
		id: ClosePortAction.INLINE_ID,
		title: ClosePortAction.LABEL,
		icon: { id: 'codicon/x' }
	},
	when: TunnelCloseAbleContextKey
}));
