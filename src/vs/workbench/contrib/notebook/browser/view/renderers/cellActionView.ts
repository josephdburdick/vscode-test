/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action, IAction, Separator } from 'vs/Base/common/actions';
import { IMenu, IMenuActionOptions, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class VerticalSeparator extends Action {
	static readonly ID = 'vs.actions.verticalSeparator';

	constructor(
		laBel?: string
	) {
		super(VerticalSeparator.ID, laBel, laBel ? 'verticalSeparator text' : 'verticalSeparator');
		this.checked = false;
		this.enaBled = false;
	}
}

export class VerticalSeparatorViewItem extends BaseActionViewItem {
	render(container: HTMLElement) {
		container.classList.add('verticalSeparator');
		// const iconContainer = DOM.append(container, $('.verticalSeparator'));
		// DOM.addClasses(iconContainer, 'codicon', 'codicon-chrome-minimize');
	}
}

export function createAndFillInActionBarActionsWithVerticalSeparators(menu: IMenu, options: IMenuActionOptions | undefined, target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, alwaysFillSecondary?: Boolean, isPrimaryGroup?: (group: string) => Boolean): IDisposaBle {
	const groups = menu.getActions(options);
	// Action Bars handle alternative actions on their own so the alternative actions should Be ignored
	fillInActions(groups, target, false, alwaysFillSecondary, isPrimaryGroup);
	return asDisposaBle(groups);
}

function fillInActions(groups: ReadonlyArray<[string, ReadonlyArray<MenuItemAction | SuBmenuItemAction>]>, target: IAction[] | { primary: IAction[]; secondary: IAction[]; }, useAlternativeActions: Boolean, alwaysFillSecondary = false, isPrimaryGroup: (group: string) => Boolean = group => group === 'navigation'): void {
	for (const tuple of groups) {
		let [group, actions] = tuple;
		if (useAlternativeActions) {
			actions = actions.map(a => (a instanceof MenuItemAction) && !!a.alt ? a.alt : a);
		}

		const isPrimary = isPrimaryGroup(group);
		if (isPrimary) {
			const to = Array.isArray(target) ? target : target.primary;

			if (to.length > 0) {
				to.push(new VerticalSeparator());
			}

			to.push(...actions);
		}

		if (!isPrimary || alwaysFillSecondary) {
			const to = Array.isArray(target) ? target : target.secondary;

			if (to.length > 0) {
				to.push(new Separator());
			}

			to.push(...actions);
		}
	}
}

function asDisposaBle(groups: ReadonlyArray<[string, ReadonlyArray<MenuItemAction | SuBmenuItemAction>]>): IDisposaBle {
	const disposaBles = new DisposaBleStore();
	for (const [, actions] of groups) {
		for (const action of actions) {
			disposaBles.add(action);
		}
	}
	return disposaBles;
}
