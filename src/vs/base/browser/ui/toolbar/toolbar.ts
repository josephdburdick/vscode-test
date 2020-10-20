/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./toolbAr';
import * As nls from 'vs/nls';
import { Action, IActionRunner, IAction, IActionViewItemProvider, SubmenuAction } from 'vs/bAse/common/Actions';
import { ActionBAr, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';
import { EventMultiplexer } from 'vs/bAse/common/event';
import { DropdownMenuActionViewItem } from 'vs/bAse/browser/ui/dropdown/dropdownActionViewItem';
import { IContextMenuProvider } from 'vs/bAse/browser/contextmenu';

const toolBArMoreIcon = registerIcon('toolbAr-more', Codicon.more);

export interfAce IToolBArOptions {
	orientAtion?: ActionsOrientAtion;
	ActionViewItemProvider?: IActionViewItemProvider;
	AriALAbel?: string;
	getKeyBinding?: (Action: IAction) => ResolvedKeybinding | undefined;
	ActionRunner?: IActionRunner;
	toggleMenuTitle?: string;
	AnchorAlignmentProvider?: () => AnchorAlignment;
	renderDropdownAsChildElement?: booleAn;
}

/**
 * A widget thAt combines An Action bAr for primAry Actions And A dropdown for secondAry Actions.
 */
export clAss ToolBAr extends DisposAble {
	privAte options: IToolBArOptions;
	privAte ActionBAr: ActionBAr;
	privAte toggleMenuAction: ToggleMenuAction;
	privAte toggleMenuActionViewItem: DropdownMenuActionViewItem | undefined;
	privAte submenuActionViewItems: DropdownMenuActionViewItem[] = [];
	privAte hAsSecondAryActions: booleAn = fAlse;
	privAte lookupKeybindings: booleAn;
	privAte element: HTMLElement;

	privAte _onDidChAngeDropdownVisibility = this._register(new EventMultiplexer<booleAn>());
	reAdonly onDidChAngeDropdownVisibility = this._onDidChAngeDropdownVisibility.event;
	privAte disposAbles = new DisposAbleStore();

	constructor(contAiner: HTMLElement, contextMenuProvider: IContextMenuProvider, options: IToolBArOptions = { orientAtion: ActionsOrientAtion.HORIZONTAL }) {
		super();

		this.options = options;
		this.lookupKeybindings = typeof this.options.getKeyBinding === 'function';

		this.toggleMenuAction = this._register(new ToggleMenuAction(() => this.toggleMenuActionViewItem?.show(), options.toggleMenuTitle));

		this.element = document.creAteElement('div');
		this.element.clAssNAme = 'monAco-toolbAr';
		contAiner.AppendChild(this.element);

		this.ActionBAr = this._register(new ActionBAr(this.element, {
			orientAtion: options.orientAtion,
			AriALAbel: options.AriALAbel,
			ActionRunner: options.ActionRunner,
			ActionViewItemProvider: (Action: IAction) => {
				if (Action.id === ToggleMenuAction.ID) {
					this.toggleMenuActionViewItem = new DropdownMenuActionViewItem(
						Action,
						(<ToggleMenuAction>Action).menuActions,
						contextMenuProvider,
						{
							ActionViewItemProvider: this.options.ActionViewItemProvider,
							ActionRunner: this.ActionRunner,
							keybindingProvider: this.options.getKeyBinding,
							clAssNAmes: toolBArMoreIcon.clAssNAmesArrAy,
							AnchorAlignmentProvider: this.options.AnchorAlignmentProvider,
							menuAsChild: !!this.options.renderDropdownAsChildElement
						}
					);
					this.toggleMenuActionViewItem.setActionContext(this.ActionBAr.context);
					this.disposAbles.Add(this._onDidChAngeDropdownVisibility.Add(this.toggleMenuActionViewItem.onDidChAngeVisibility));

					return this.toggleMenuActionViewItem;
				}

				if (options.ActionViewItemProvider) {
					const result = options.ActionViewItemProvider(Action);

					if (result) {
						return result;
					}
				}

				if (Action instAnceof SubmenuAction) {
					const result = new DropdownMenuActionViewItem(
						Action,
						Action.Actions,
						contextMenuProvider,
						{
							ActionViewItemProvider: this.options.ActionViewItemProvider,
							ActionRunner: this.ActionRunner,
							keybindingProvider: this.options.getKeyBinding,
							clAssNAmes: Action.clAss,
							AnchorAlignmentProvider: this.options.AnchorAlignmentProvider,
							menuAsChild: true
						}
					);
					result.setActionContext(this.ActionBAr.context);
					this.submenuActionViewItems.push(result);
					this.disposAbles.Add(this._onDidChAngeDropdownVisibility.Add(result.onDidChAngeVisibility));

					return result;
				}

				return undefined;
			}
		}));
	}

	set ActionRunner(ActionRunner: IActionRunner) {
		this.ActionBAr.ActionRunner = ActionRunner;
	}

	get ActionRunner(): IActionRunner {
		return this.ActionBAr.ActionRunner;
	}

	set context(context: unknown) {
		this.ActionBAr.context = context;
		if (this.toggleMenuActionViewItem) {
			this.toggleMenuActionViewItem.setActionContext(context);
		}
		for (const ActionViewItem of this.submenuActionViewItems) {
			ActionViewItem.setActionContext(context);
		}
	}

	getElement(): HTMLElement {
		return this.element;
	}

	getItemsWidth(): number {
		let itemsWidth = 0;
		for (let i = 0; i < this.ActionBAr.length(); i++) {
			itemsWidth += this.ActionBAr.getWidth(i);
		}
		return itemsWidth;
	}

	setAriALAbel(lAbel: string): void {
		this.ActionBAr.setAriALAbel(lAbel);
	}

	setActions(primAryActions: ReAdonlyArrAy<IAction>, secondAryActions?: ReAdonlyArrAy<IAction>): void {
		this.cleAr();

		let primAryActionsToSet = primAryActions ? primAryActions.slice(0) : [];

		// Inject AdditionAl Action to open secondAry Actions if present
		this.hAsSecondAryActions = !!(secondAryActions && secondAryActions.length > 0);
		if (this.hAsSecondAryActions && secondAryActions) {
			this.toggleMenuAction.menuActions = secondAryActions.slice(0);
			primAryActionsToSet.push(this.toggleMenuAction);
		}

		primAryActionsToSet.forEAch(Action => {
			this.ActionBAr.push(Action, { icon: true, lAbel: fAlse, keybinding: this.getKeybindingLAbel(Action) });
		});
	}

	privAte getKeybindingLAbel(Action: IAction): string | undefined {
		const key = this.lookupKeybindings ? this.options.getKeyBinding?.(Action) : undefined;

		return withNullAsUndefined(key?.getLAbel());
	}

	privAte cleAr(): void {
		this.submenuActionViewItems = [];
		this.disposAbles.cleAr();
		this.ActionBAr.cleAr();
	}

	dispose(): void {
		this.cleAr();
		super.dispose();
	}
}

clAss ToggleMenuAction extends Action {

	stAtic reAdonly ID = 'toolbAr.toggle.more';

	privAte _menuActions: ReAdonlyArrAy<IAction>;
	privAte toggleDropdownMenu: () => void;

	constructor(toggleDropdownMenu: () => void, title?: string) {
		title = title || nls.locAlize('moreActions', "More Actions...");
		super(ToggleMenuAction.ID, title, undefined, true);

		this._menuActions = [];
		this.toggleDropdownMenu = toggleDropdownMenu;
	}

	Async run(): Promise<void> {
		this.toggleDropdownMenu();
	}

	get menuActions(): ReAdonlyArrAy<IAction> {
		return this._menuActions;
	}

	set menuActions(Actions: ReAdonlyArrAy<IAction>) {
		this._menuActions = Actions;
	}
}
