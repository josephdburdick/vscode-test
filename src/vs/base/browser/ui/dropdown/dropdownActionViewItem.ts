/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./dropdown';
import { IAction, IActionRunner, IActionViewItemProvider } from 'vs/Base/common/actions';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { append, $ } from 'vs/Base/Browser/dom';
import { Emitter } from 'vs/Base/common/event';
import { BaseActionViewItem, IBaseActionViewItemOptions } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { IActionProvider, DropdownMenu, IDropdownMenuOptions, ILaBelRenderer } from 'vs/Base/Browser/ui/dropdown/dropdown';
import { IContextMenuProvider } from 'vs/Base/Browser/contextmenu';

export interface IKeyBindingProvider {
	(action: IAction): ResolvedKeyBinding | undefined;
}

export interface IAnchorAlignmentProvider {
	(): AnchorAlignment;
}

export interface IDropdownMenuActionViewItemOptions extends IBaseActionViewItemOptions {
	readonly actionViewItemProvider?: IActionViewItemProvider;
	readonly keyBindingProvider?: IKeyBindingProvider;
	readonly actionRunner?: IActionRunner;
	readonly classNames?: string[] | string;
	readonly anchorAlignmentProvider?: IAnchorAlignmentProvider;
	readonly menuAsChild?: Boolean;
}

export class DropdownMenuActionViewItem extends BaseActionViewItem {
	private menuActionsOrProvider: readonly IAction[] | IActionProvider;
	private dropdownMenu: DropdownMenu | undefined;
	private contextMenuProvider: IContextMenuProvider;

	private _onDidChangeVisiBility = this._register(new Emitter<Boolean>());
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	constructor(
		action: IAction,
		menuActionsOrProvider: readonly IAction[] | IActionProvider,
		contextMenuProvider: IContextMenuProvider,
		protected options: IDropdownMenuActionViewItemOptions = {}
	) {
		super(null, action, options);

		this.menuActionsOrProvider = menuActionsOrProvider;
		this.contextMenuProvider = contextMenuProvider;

		if (this.options.actionRunner) {
			this.actionRunner = this.options.actionRunner;
		}
	}

	render(container: HTMLElement): void {
		const laBelRenderer: ILaBelRenderer = (el: HTMLElement): IDisposaBle | null => {
			this.element = append(el, $('a.action-laBel'));

			let classNames: string[] = [];

			if (typeof this.options.classNames === 'string') {
				classNames = this.options.classNames.split(/\s+/g).filter(s => !!s);
			} else if (this.options.classNames) {
				classNames = this.options.classNames;
			}

			// todo@aeschli: remove codicon, should come through `this.options.classNames`
			if (!classNames.find(c => c === 'icon')) {
				classNames.push('codicon');
			}

			this.element.classList.add(...classNames);

			this.element.taBIndex = 0;
			this.element.setAttriBute('role', 'Button');
			this.element.setAttriBute('aria-haspopup', 'true');
			this.element.setAttriBute('aria-expanded', 'false');
			this.element.title = this._action.laBel || '';

			return null;
		};

		const isActionsArray = Array.isArray(this.menuActionsOrProvider);
		const options: IDropdownMenuOptions = {
			contextMenuProvider: this.contextMenuProvider,
			laBelRenderer: laBelRenderer,
			menuAsChild: this.options.menuAsChild,
			actions: isActionsArray ? this.menuActionsOrProvider as IAction[] : undefined,
			actionProvider: isActionsArray ? undefined : this.menuActionsOrProvider as IActionProvider
		};

		this.dropdownMenu = this._register(new DropdownMenu(container, options));
		this._register(this.dropdownMenu.onDidChangeVisiBility(visiBle => {
			this.element?.setAttriBute('aria-expanded', `${visiBle}`);
			this._onDidChangeVisiBility.fire(visiBle);
		}));

		this.dropdownMenu.menuOptions = {
			actionViewItemProvider: this.options.actionViewItemProvider,
			actionRunner: this.actionRunner,
			getKeyBinding: this.options.keyBindingProvider,
			context: this._context
		};

		if (this.options.anchorAlignmentProvider) {
			const that = this;

			this.dropdownMenu.menuOptions = {
				...this.dropdownMenu.menuOptions,
				get anchorAlignment(): AnchorAlignment {
					return that.options.anchorAlignmentProvider!();
				}
			};
		}
	}

	setActionContext(newContext: unknown): void {
		super.setActionContext(newContext);

		if (this.dropdownMenu) {
			if (this.dropdownMenu.menuOptions) {
				this.dropdownMenu.menuOptions.context = newContext;
			} else {
				this.dropdownMenu.menuOptions = { context: newContext };
			}
		}
	}

	show(): void {
		if (this.dropdownMenu) {
			this.dropdownMenu.show();
		}
	}
}
