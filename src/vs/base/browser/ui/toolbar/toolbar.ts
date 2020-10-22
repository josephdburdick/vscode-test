/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./toolBar';
import * as nls from 'vs/nls';
import { Action, IActionRunner, IAction, IActionViewItemProvider, SuBmenuAction } from 'vs/Base/common/actions';
import { ActionBar, ActionsOrientation } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';
import { EventMultiplexer } from 'vs/Base/common/event';
import { DropdownMenuActionViewItem } from 'vs/Base/Browser/ui/dropdown/dropdownActionViewItem';
import { IContextMenuProvider } from 'vs/Base/Browser/contextmenu';

const toolBarMoreIcon = registerIcon('toolBar-more', Codicon.more);

export interface IToolBarOptions {
	orientation?: ActionsOrientation;
	actionViewItemProvider?: IActionViewItemProvider;
	ariaLaBel?: string;
	getKeyBinding?: (action: IAction) => ResolvedKeyBinding | undefined;
	actionRunner?: IActionRunner;
	toggleMenuTitle?: string;
	anchorAlignmentProvider?: () => AnchorAlignment;
	renderDropdownAsChildElement?: Boolean;
}

/**
 * A widget that comBines an action Bar for primary actions and a dropdown for secondary actions.
 */
export class ToolBar extends DisposaBle {
	private options: IToolBarOptions;
	private actionBar: ActionBar;
	private toggleMenuAction: ToggleMenuAction;
	private toggleMenuActionViewItem: DropdownMenuActionViewItem | undefined;
	private suBmenuActionViewItems: DropdownMenuActionViewItem[] = [];
	private hasSecondaryActions: Boolean = false;
	private lookupKeyBindings: Boolean;
	private element: HTMLElement;

	private _onDidChangeDropdownVisiBility = this._register(new EventMultiplexer<Boolean>());
	readonly onDidChangeDropdownVisiBility = this._onDidChangeDropdownVisiBility.event;
	private disposaBles = new DisposaBleStore();

	constructor(container: HTMLElement, contextMenuProvider: IContextMenuProvider, options: IToolBarOptions = { orientation: ActionsOrientation.HORIZONTAL }) {
		super();

		this.options = options;
		this.lookupKeyBindings = typeof this.options.getKeyBinding === 'function';

		this.toggleMenuAction = this._register(new ToggleMenuAction(() => this.toggleMenuActionViewItem?.show(), options.toggleMenuTitle));

		this.element = document.createElement('div');
		this.element.className = 'monaco-toolBar';
		container.appendChild(this.element);

		this.actionBar = this._register(new ActionBar(this.element, {
			orientation: options.orientation,
			ariaLaBel: options.ariaLaBel,
			actionRunner: options.actionRunner,
			actionViewItemProvider: (action: IAction) => {
				if (action.id === ToggleMenuAction.ID) {
					this.toggleMenuActionViewItem = new DropdownMenuActionViewItem(
						action,
						(<ToggleMenuAction>action).menuActions,
						contextMenuProvider,
						{
							actionViewItemProvider: this.options.actionViewItemProvider,
							actionRunner: this.actionRunner,
							keyBindingProvider: this.options.getKeyBinding,
							classNames: toolBarMoreIcon.classNamesArray,
							anchorAlignmentProvider: this.options.anchorAlignmentProvider,
							menuAsChild: !!this.options.renderDropdownAsChildElement
						}
					);
					this.toggleMenuActionViewItem.setActionContext(this.actionBar.context);
					this.disposaBles.add(this._onDidChangeDropdownVisiBility.add(this.toggleMenuActionViewItem.onDidChangeVisiBility));

					return this.toggleMenuActionViewItem;
				}

				if (options.actionViewItemProvider) {
					const result = options.actionViewItemProvider(action);

					if (result) {
						return result;
					}
				}

				if (action instanceof SuBmenuAction) {
					const result = new DropdownMenuActionViewItem(
						action,
						action.actions,
						contextMenuProvider,
						{
							actionViewItemProvider: this.options.actionViewItemProvider,
							actionRunner: this.actionRunner,
							keyBindingProvider: this.options.getKeyBinding,
							classNames: action.class,
							anchorAlignmentProvider: this.options.anchorAlignmentProvider,
							menuAsChild: true
						}
					);
					result.setActionContext(this.actionBar.context);
					this.suBmenuActionViewItems.push(result);
					this.disposaBles.add(this._onDidChangeDropdownVisiBility.add(result.onDidChangeVisiBility));

					return result;
				}

				return undefined;
			}
		}));
	}

	set actionRunner(actionRunner: IActionRunner) {
		this.actionBar.actionRunner = actionRunner;
	}

	get actionRunner(): IActionRunner {
		return this.actionBar.actionRunner;
	}

	set context(context: unknown) {
		this.actionBar.context = context;
		if (this.toggleMenuActionViewItem) {
			this.toggleMenuActionViewItem.setActionContext(context);
		}
		for (const actionViewItem of this.suBmenuActionViewItems) {
			actionViewItem.setActionContext(context);
		}
	}

	getElement(): HTMLElement {
		return this.element;
	}

	getItemsWidth(): numBer {
		let itemsWidth = 0;
		for (let i = 0; i < this.actionBar.length(); i++) {
			itemsWidth += this.actionBar.getWidth(i);
		}
		return itemsWidth;
	}

	setAriaLaBel(laBel: string): void {
		this.actionBar.setAriaLaBel(laBel);
	}

	setActions(primaryActions: ReadonlyArray<IAction>, secondaryActions?: ReadonlyArray<IAction>): void {
		this.clear();

		let primaryActionsToSet = primaryActions ? primaryActions.slice(0) : [];

		// Inject additional action to open secondary actions if present
		this.hasSecondaryActions = !!(secondaryActions && secondaryActions.length > 0);
		if (this.hasSecondaryActions && secondaryActions) {
			this.toggleMenuAction.menuActions = secondaryActions.slice(0);
			primaryActionsToSet.push(this.toggleMenuAction);
		}

		primaryActionsToSet.forEach(action => {
			this.actionBar.push(action, { icon: true, laBel: false, keyBinding: this.getKeyBindingLaBel(action) });
		});
	}

	private getKeyBindingLaBel(action: IAction): string | undefined {
		const key = this.lookupKeyBindings ? this.options.getKeyBinding?.(action) : undefined;

		return withNullAsUndefined(key?.getLaBel());
	}

	private clear(): void {
		this.suBmenuActionViewItems = [];
		this.disposaBles.clear();
		this.actionBar.clear();
	}

	dispose(): void {
		this.clear();
		super.dispose();
	}
}

class ToggleMenuAction extends Action {

	static readonly ID = 'toolBar.toggle.more';

	private _menuActions: ReadonlyArray<IAction>;
	private toggleDropdownMenu: () => void;

	constructor(toggleDropdownMenu: () => void, title?: string) {
		title = title || nls.localize('moreActions', "More Actions...");
		super(ToggleMenuAction.ID, title, undefined, true);

		this._menuActions = [];
		this.toggleDropdownMenu = toggleDropdownMenu;
	}

	async run(): Promise<void> {
		this.toggleDropdownMenu();
	}

	get menuActions(): ReadonlyArray<IAction> {
		return this._menuActions;
	}

	set menuActions(actions: ReadonlyArray<IAction>) {
		this._menuActions = actions;
	}
}
