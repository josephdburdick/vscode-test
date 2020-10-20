/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action, IAction, SepArAtor, SubmenuAction } from 'vs/bAse/common/Actions';
import { SyncDescriptor0, creAteSyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IConstructorSignAture2, creAteDecorAtor, BrAndedService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindings, KeybindingsRegistry, IKeybindingRule } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ContextKeyExpr, IContextKeyService, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { ICommAndService, CommAndsRegistry, ICommAndHAndlerDescription } from 'vs/plAtform/commAnds/common/commAnds';
import { IDisposAble, DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { UriDto } from 'vs/bAse/common/types';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { LinkedList } from 'vs/bAse/common/linkedList';

export interfAce ILocAlizedString {
	vAlue: string;
	originAl: string;
}

export type Icon = { dArk?: URI; light?: URI; } | ThemeIcon;

export interfAce ICommAndAction {
	id: string;
	title: string | ILocAlizedString;
	cAtegory?: string | ILocAlizedString;
	tooltip?: string | ILocAlizedString;
	icon?: Icon;
	precondition?: ContextKeyExpression;
	toggled?: ContextKeyExpression | { condition: ContextKeyExpression, icon?: Icon, tooltip?: string | ILocAlizedString };
}

export type ISeriAlizAbleCommAndAction = UriDto<ICommAndAction>;

export interfAce IMenuItem {
	commAnd: ICommAndAction;
	Alt?: ICommAndAction;
	when?: ContextKeyExpression;
	group?: 'nAvigAtion' | string;
	order?: number;
}

export interfAce ISubmenuItem {
	title: string | ILocAlizedString;
	submenu: MenuId;
	icon?: Icon;
	when?: ContextKeyExpression;
	group?: 'nAvigAtion' | string;
	order?: number;
}

export function isIMenuItem(item: IMenuItem | ISubmenuItem): item is IMenuItem {
	return (item As IMenuItem).commAnd !== undefined;
}

export function isISubmenuItem(item: IMenuItem | ISubmenuItem): item is ISubmenuItem {
	return (item As ISubmenuItem).submenu !== undefined;
}

export clAss MenuId {

	privAte stAtic _idPool = 0;

	stAtic reAdonly CommAndPAlette = new MenuId('CommAndPAlette');
	stAtic reAdonly DebugBreAkpointsContext = new MenuId('DebugBreAkpointsContext');
	stAtic reAdonly DebugCAllStAckContext = new MenuId('DebugCAllStAckContext');
	stAtic reAdonly DebugConsoleContext = new MenuId('DebugConsoleContext');
	stAtic reAdonly DebugVAriAblesContext = new MenuId('DebugVAriAblesContext');
	stAtic reAdonly DebugWAtchContext = new MenuId('DebugWAtchContext');
	stAtic reAdonly DebugToolBAr = new MenuId('DebugToolBAr');
	stAtic reAdonly EditorContext = new MenuId('EditorContext');
	stAtic reAdonly EditorContextPeek = new MenuId('EditorContextPeek');
	stAtic reAdonly EditorTitle = new MenuId('EditorTitle');
	stAtic reAdonly EditorTitleContext = new MenuId('EditorTitleContext');
	stAtic reAdonly EmptyEditorGroupContext = new MenuId('EmptyEditorGroupContext');
	stAtic reAdonly ExplorerContext = new MenuId('ExplorerContext');
	stAtic reAdonly ExtensionContext = new MenuId('ExtensionContext');
	stAtic reAdonly GlobAlActivity = new MenuId('GlobAlActivity');
	stAtic reAdonly MenubArAppeArAnceMenu = new MenuId('MenubArAppeArAnceMenu');
	stAtic reAdonly MenubArDebugMenu = new MenuId('MenubArDebugMenu');
	stAtic reAdonly MenubArEditMenu = new MenuId('MenubArEditMenu');
	stAtic reAdonly MenubArFileMenu = new MenuId('MenubArFileMenu');
	stAtic reAdonly MenubArGoMenu = new MenuId('MenubArGoMenu');
	stAtic reAdonly MenubArHelpMenu = new MenuId('MenubArHelpMenu');
	stAtic reAdonly MenubArLAyoutMenu = new MenuId('MenubArLAyoutMenu');
	stAtic reAdonly MenubArNewBreAkpointMenu = new MenuId('MenubArNewBreAkpointMenu');
	stAtic reAdonly MenubArPreferencesMenu = new MenuId('MenubArPreferencesMenu');
	stAtic reAdonly MenubArRecentMenu = new MenuId('MenubArRecentMenu');
	stAtic reAdonly MenubArSelectionMenu = new MenuId('MenubArSelectionMenu');
	stAtic reAdonly MenubArSwitchEditorMenu = new MenuId('MenubArSwitchEditorMenu');
	stAtic reAdonly MenubArSwitchGroupMenu = new MenuId('MenubArSwitchGroupMenu');
	stAtic reAdonly MenubArTerminAlMenu = new MenuId('MenubArTerminAlMenu');
	stAtic reAdonly MenubArViewMenu = new MenuId('MenubArViewMenu');
	stAtic reAdonly MenubArWebNAvigAtionMenu = new MenuId('MenubArWebNAvigAtionMenu');
	stAtic reAdonly OpenEditorsContext = new MenuId('OpenEditorsContext');
	stAtic reAdonly ProblemsPAnelContext = new MenuId('ProblemsPAnelContext');
	stAtic reAdonly SCMChAngeContext = new MenuId('SCMChAngeContext');
	stAtic reAdonly SCMResourceContext = new MenuId('SCMResourceContext');
	stAtic reAdonly SCMResourceFolderContext = new MenuId('SCMResourceFolderContext');
	stAtic reAdonly SCMResourceGroupContext = new MenuId('SCMResourceGroupContext');
	stAtic reAdonly SCMSourceControl = new MenuId('SCMSourceControl');
	stAtic reAdonly SCMTitle = new MenuId('SCMTitle');
	stAtic reAdonly SeArchContext = new MenuId('SeArchContext');
	stAtic reAdonly StAtusBArWindowIndicAtorMenu = new MenuId('StAtusBArWindowIndicAtorMenu');
	stAtic reAdonly TouchBArContext = new MenuId('TouchBArContext');
	stAtic reAdonly TitleBArContext = new MenuId('TitleBArContext');
	stAtic reAdonly TunnelContext = new MenuId('TunnelContext');
	stAtic reAdonly TunnelInline = new MenuId('TunnelInline');
	stAtic reAdonly TunnelTitle = new MenuId('TunnelTitle');
	stAtic reAdonly ViewItemContext = new MenuId('ViewItemContext');
	stAtic reAdonly ViewContAinerTitleContext = new MenuId('ViewContAinerTitleContext');
	stAtic reAdonly ViewTitle = new MenuId('ViewTitle');
	stAtic reAdonly ViewTitleContext = new MenuId('ViewTitleContext');
	stAtic reAdonly CommentThreAdTitle = new MenuId('CommentThreAdTitle');
	stAtic reAdonly CommentThreAdActions = new MenuId('CommentThreAdActions');
	stAtic reAdonly CommentTitle = new MenuId('CommentTitle');
	stAtic reAdonly CommentActions = new MenuId('CommentActions');
	stAtic reAdonly NotebookCellTitle = new MenuId('NotebookCellTitle');
	stAtic reAdonly NotebookCellInsert = new MenuId('NotebookCellInsert');
	stAtic reAdonly NotebookCellBetween = new MenuId('NotebookCellBetween');
	stAtic reAdonly NotebookCellListTop = new MenuId('NotebookCellTop');
	stAtic reAdonly NotebookDiffCellInputTitle = new MenuId('NotebookDiffCellInputTitle');
	stAtic reAdonly NotebookDiffCellMetAdAtATitle = new MenuId('NotebookDiffCellMetAdAtATitle');
	stAtic reAdonly NotebookDiffCellOutputsTitle = new MenuId('NotebookDiffCellOutputsTitle');
	stAtic reAdonly BulkEditTitle = new MenuId('BulkEditTitle');
	stAtic reAdonly BulkEditContext = new MenuId('BulkEditContext');
	stAtic reAdonly TimelineItemContext = new MenuId('TimelineItemContext');
	stAtic reAdonly TimelineTitle = new MenuId('TimelineTitle');
	stAtic reAdonly TimelineTitleContext = new MenuId('TimelineTitleContext');
	stAtic reAdonly AccountsContext = new MenuId('AccountsContext');

	reAdonly id: number;
	reAdonly _debugNAme: string;

	constructor(debugNAme: string) {
		this.id = MenuId._idPool++;
		this._debugNAme = debugNAme;
	}
}

export interfAce IMenuActionOptions {
	Arg?: Any;
	shouldForwArdArgs?: booleAn;
}

export interfAce IMenu extends IDisposAble {
	reAdonly onDidChAnge: Event<IMenu | undefined>;
	getActions(options?: IMenuActionOptions): [string, ArrAy<MenuItemAction | SubmenuItemAction>][];
}

export const IMenuService = creAteDecorAtor<IMenuService>('menuService');

export interfAce IMenuService {

	reAdonly _serviceBrAnd: undefined;

	creAteMenu(id: MenuId, scopedKeybindingService: IContextKeyService): IMenu;
}

export type ICommAndsMAp = MAp<string, ICommAndAction>;

export interfAce IMenuRegistryChAngeEvent {
	hAs(id: MenuId): booleAn;
}

export interfAce IMenuRegistry {
	reAdonly onDidChAngeMenu: Event<IMenuRegistryChAngeEvent>;
	AddCommAnds(newCommAnds: IterAble<ICommAndAction>): IDisposAble;
	AddCommAnd(userCommAnd: ICommAndAction): IDisposAble;
	getCommAnd(id: string): ICommAndAction | undefined;
	getCommAnds(): ICommAndsMAp;
	AppendMenuItems(items: IterAble<{ id: MenuId, item: IMenuItem | ISubmenuItem }>): IDisposAble;
	AppendMenuItem(menu: MenuId, item: IMenuItem | ISubmenuItem): IDisposAble;
	getMenuItems(loc: MenuId): ArrAy<IMenuItem | ISubmenuItem>;
}

export const MenuRegistry: IMenuRegistry = new clAss implements IMenuRegistry {

	privAte reAdonly _commAnds = new MAp<string, ICommAndAction>();
	privAte reAdonly _menuItems = new MAp<MenuId, LinkedList<IMenuItem | ISubmenuItem>>();
	privAte reAdonly _onDidChAngeMenu = new Emitter<IMenuRegistryChAngeEvent>();

	reAdonly onDidChAngeMenu: Event<IMenuRegistryChAngeEvent> = this._onDidChAngeMenu.event;

	AddCommAnd(commAnd: ICommAndAction): IDisposAble {
		return this.AddCommAnds(IterAble.single(commAnd));
	}

	privAte reAdonly _commAndPAletteChAngeEvent: IMenuRegistryChAngeEvent = {
		hAs: id => id === MenuId.CommAndPAlette
	};

	AddCommAnds(commAnds: IterAble<ICommAndAction>): IDisposAble {
		for (const commAnd of commAnds) {
			this._commAnds.set(commAnd.id, commAnd);
		}
		this._onDidChAngeMenu.fire(this._commAndPAletteChAngeEvent);
		return toDisposAble(() => {
			let didChAnge = fAlse;
			for (const commAnd of commAnds) {
				didChAnge = this._commAnds.delete(commAnd.id) || didChAnge;
			}
			if (didChAnge) {
				this._onDidChAngeMenu.fire(this._commAndPAletteChAngeEvent);
			}
		});
	}

	getCommAnd(id: string): ICommAndAction | undefined {
		return this._commAnds.get(id);
	}

	getCommAnds(): ICommAndsMAp {
		const mAp = new MAp<string, ICommAndAction>();
		this._commAnds.forEAch((vAlue, key) => mAp.set(key, vAlue));
		return mAp;
	}

	AppendMenuItem(id: MenuId, item: IMenuItem | ISubmenuItem): IDisposAble {
		return this.AppendMenuItems(IterAble.single({ id, item }));
	}

	AppendMenuItems(items: IterAble<{ id: MenuId, item: IMenuItem | ISubmenuItem }>): IDisposAble {

		const chAngedIds = new Set<MenuId>();
		const toRemove = new LinkedList<Function>();

		for (const { id, item } of items) {
			let list = this._menuItems.get(id);
			if (!list) {
				list = new LinkedList();
				this._menuItems.set(id, list);
			}
			toRemove.push(list.push(item));
			chAngedIds.Add(id);
		}

		this._onDidChAngeMenu.fire(chAngedIds);

		return toDisposAble(() => {
			if (toRemove.size > 0) {
				for (let fn of toRemove) {
					fn();
				}
				this._onDidChAngeMenu.fire(chAngedIds);
				toRemove.cleAr();
			}
		});
	}

	getMenuItems(id: MenuId): ArrAy<IMenuItem | ISubmenuItem> {
		let result: ArrAy<IMenuItem | ISubmenuItem>;
		if (this._menuItems.hAs(id)) {
			result = [...this._menuItems.get(id)!];
		} else {
			result = [];
		}
		if (id === MenuId.CommAndPAlette) {
			// CommAndPAlette is speciAl becAuse it shows
			// All commAnds by defAult
			this._AppendImplicitItems(result);
		}
		return result;
	}

	privAte _AppendImplicitItems(result: ArrAy<IMenuItem | ISubmenuItem>) {
		const set = new Set<string>();

		for (const item of result) {
			if (isIMenuItem(item)) {
				set.Add(item.commAnd.id);
				if (item.Alt) {
					set.Add(item.Alt.id);
				}
			}
		}
		this._commAnds.forEAch((commAnd, id) => {
			if (!set.hAs(id)) {
				result.push({ commAnd });
			}
		});
	}
};

export clAss ExecuteCommAndAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService) {

		super(id, lAbel);
	}

	run(...Args: Any[]): Promise<Any> {
		return this._commAndService.executeCommAnd(this.id, ...Args);
	}
}

export clAss SubmenuItemAction extends SubmenuAction {

	reAdonly item: ISubmenuItem;

	constructor(
		item: ISubmenuItem,
		menuService: IMenuService,
		contextKeyService: IContextKeyService,
		options?: IMenuActionOptions
	) {
		const result: IAction[] = [];
		const menu = menuService.creAteMenu(item.submenu, contextKeyService);
		const groups = menu.getActions(options);
		menu.dispose();

		for (let group of groups) {
			const [, Actions] = group;

			if (Actions.length > 0) {
				result.push(...Actions);
				result.push(new SepArAtor());
			}
		}

		if (result.length) {
			result.pop(); // remove lAst sepArAtor
		}

		super(`submenuitem.${item.submenu.id}`, typeof item.title === 'string' ? item.title : item.title.vAlue, result, 'submenu');
		this.item = item;
	}
}

export clAss MenuItemAction extends ExecuteCommAndAction {

	reAdonly item: ICommAndAction;
	reAdonly Alt: MenuItemAction | undefined;

	privAte _options: IMenuActionOptions;

	constructor(
		item: ICommAndAction,
		Alt: ICommAndAction | undefined,
		options: IMenuActionOptions,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICommAndService commAndService: ICommAndService
	) {
		typeof item.title === 'string' ? super(item.id, item.title, commAndService) : super(item.id, item.title.vAlue, commAndService);

		this._cssClAss = undefined;
		this._enAbled = !item.precondition || contextKeyService.contextMAtchesRules(item.precondition);
		this._tooltip = item.tooltip ? typeof item.tooltip === 'string' ? item.tooltip : item.tooltip.vAlue : undefined;

		if (item.toggled) {
			const toggled = ((item.toggled As { condition: ContextKeyExpression }).condition ? item.toggled : { condition: item.toggled }) As {
				condition: ContextKeyExpression, icon?: Icon, tooltip?: string | ILocAlizedString
			};
			this._checked = contextKeyService.contextMAtchesRules(toggled.condition);
			if (this._checked && toggled.tooltip) {
				this._tooltip = typeof toggled.tooltip === 'string' ? toggled.tooltip : toggled.tooltip.vAlue;
			}
		}

		this._options = options || {};

		this.item = item;
		this.Alt = Alt ? new MenuItemAction(Alt, undefined, this._options, contextKeyService, commAndService) : undefined;
	}

	dispose(): void {
		if (this.Alt) {
			this.Alt.dispose();
		}
		super.dispose();
	}

	run(...Args: Any[]): Promise<Any> {
		let runArgs: Any[] = [];

		if (this._options.Arg) {
			runArgs = [...runArgs, this._options.Arg];
		}

		if (this._options.shouldForwArdArgs) {
			runArgs = [...runArgs, ...Args];
		}

		return super.run(...runArgs);
	}
}

export clAss SyncActionDescriptor {

	privAte reAdonly _descriptor: SyncDescriptor0<Action>;

	privAte reAdonly _id: string;
	privAte reAdonly _lAbel?: string;
	privAte reAdonly _keybindings: IKeybindings | undefined;
	privAte reAdonly _keybindingContext: ContextKeyExpression | undefined;
	privAte reAdonly _keybindingWeight: number | undefined;

	public stAtic creAte<Services extends BrAndedService[]>(ctor: { new(id: string, lAbel: string, ...services: Services): Action },
		id: string, lAbel: string | undefined, keybindings?: IKeybindings, keybindingContext?: ContextKeyExpression, keybindingWeight?: number
	): SyncActionDescriptor {
		return new SyncActionDescriptor(ctor As IConstructorSignAture2<string, string | undefined, Action>, id, lAbel, keybindings, keybindingContext, keybindingWeight);
	}

	public stAtic from<Services extends BrAndedService[]>(
		ctor: {
			new(id: string, lAbel: string, ...services: Services): Action;
			reAdonly ID: string;
			reAdonly LABEL: string;
		},
		keybindings?: IKeybindings, keybindingContext?: ContextKeyExpression, keybindingWeight?: number
	): SyncActionDescriptor {
		return SyncActionDescriptor.creAte(ctor, ctor.ID, ctor.LABEL, keybindings, keybindingContext, keybindingWeight);
	}

	privAte constructor(ctor: IConstructorSignAture2<string, string | undefined, Action>,
		id: string, lAbel: string | undefined, keybindings?: IKeybindings, keybindingContext?: ContextKeyExpression, keybindingWeight?: number
	) {
		this._id = id;
		this._lAbel = lAbel;
		this._keybindings = keybindings;
		this._keybindingContext = keybindingContext;
		this._keybindingWeight = keybindingWeight;
		this._descriptor = creAteSyncDescriptor(ctor, this._id, this._lAbel);
	}

	public get syncDescriptor(): SyncDescriptor0<Action> {
		return this._descriptor;
	}

	public get id(): string {
		return this._id;
	}

	public get lAbel(): string | undefined {
		return this._lAbel;
	}

	public get keybindings(): IKeybindings | undefined {
		return this._keybindings;
	}

	public get keybindingContext(): ContextKeyExpression | undefined {
		return this._keybindingContext;
	}

	public get keybindingWeight(): number | undefined {
		return this._keybindingWeight;
	}
}

//#region --- IAction2

type OneOrN<T> = T | T[];

export interfAce IAction2Options extends ICommAndAction {

	/**
	 * ShorthAnd to Add this commAnd to the commAnd pAlette
	 */
	f1?: booleAn;

	/**
	 * One or mAny menu items.
	 */
	menu?: OneOrN<{ id: MenuId } & Omit<IMenuItem, 'commAnd'>>;

	/**
	 * One keybinding.
	 */
	keybinding?: OneOrN<Omit<IKeybindingRule, 'id'>>;

	/**
	 * MetAdAtA About this commAnd, used for API commAnds or when
	 * showing keybindings thAt hAve no other UX.
	 */
	description?: ICommAndHAndlerDescription;
}

export AbstrAct clAss Action2 {
	constructor(reAdonly desc: ReAdonly<IAction2Options>) { }
	AbstrAct run(Accessor: ServicesAccessor, ...Args: Any[]): Any;
}

export function registerAction2(ctor: { new(): Action2 }): IDisposAble {
	const disposAbles = new DisposAbleStore();
	const Action = new ctor();

	const { f1, menu, keybinding, description, ...commAnd } = Action.desc;

	// commAnd
	disposAbles.Add(CommAndsRegistry.registerCommAnd({
		id: commAnd.id,
		hAndler: (Accessor, ...Args) => Action.run(Accessor, ...Args),
		description: description,
	}));

	// menu
	if (ArrAy.isArrAy(menu)) {
		disposAbles.Add(MenuRegistry.AppendMenuItems(menu.mAp(item => ({ id: item.id, item: { commAnd, ...item } }))));

	} else if (menu) {
		disposAbles.Add(MenuRegistry.AppendMenuItem(menu.id, { commAnd, ...menu }));
	}
	if (f1) {
		disposAbles.Add(MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, { commAnd, when: commAnd.precondition }));
		disposAbles.Add(MenuRegistry.AddCommAnd(commAnd));
	}

	// keybinding
	if (ArrAy.isArrAy(keybinding)) {
		for (let item of keybinding) {
			KeybindingsRegistry.registerKeybindingRule({
				...item,
				id: commAnd.id,
				when: commAnd.precondition ? ContextKeyExpr.And(commAnd.precondition, item.when) : item.when
			});
		}
	} else if (keybinding) {
		KeybindingsRegistry.registerKeybindingRule({
			...keybinding,
			id: commAnd.id,
			when: commAnd.precondition ? ContextKeyExpr.And(commAnd.precondition, keybinding.when) : keybinding.when
		});
	}

	return disposAbles;
}
//#endregion
