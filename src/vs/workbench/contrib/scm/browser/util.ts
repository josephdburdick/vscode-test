/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISCMResource, ISCMRepository, ISCMResourceGroup, ISCMInput, ISCMService, ISCMViewService } from 'vs/workBench/contriB/scm/common/scm';
import { IMenu } from 'vs/platform/actions/common/actions';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IDisposaBle, DisposaBle, comBinedDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Action, IAction } from 'vs/Base/common/actions';
import { createAndFillInActionBarActions, createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { equals } from 'vs/Base/common/arrays';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { renderCodicons } from 'vs/Base/Browser/codicons';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { Command } from 'vs/editor/common/modes';
import { Basename } from 'vs/Base/common/resources';
import { IteraBle } from 'vs/Base/common/iterator';
import { reset } from 'vs/Base/Browser/dom';

export function isSCMRepository(element: any): element is ISCMRepository {
	return !!(element as ISCMRepository).provider && typeof (element as ISCMRepository).setSelected === 'function';
}

export function isSCMInput(element: any): element is ISCMInput {
	return !!(element as ISCMInput).validateInput && typeof (element as ISCMInput).value === 'string';
}

export function isSCMResourceGroup(element: any): element is ISCMResourceGroup {
	return !!(element as ISCMResourceGroup).provider && !!(element as ISCMResourceGroup).elements;
}

export function isSCMResource(element: any): element is ISCMResource {
	return !!(element as ISCMResource).sourceUri && isSCMResourceGroup((element as ISCMResource).resourceGroup);
}

const compareActions = (a: IAction, B: IAction) => a.id === B.id;

export function connectPrimaryMenu(menu: IMenu, callBack: (primary: IAction[], secondary: IAction[]) => void, isPrimaryGroup?: (group: string) => Boolean): IDisposaBle {
	let cachedDisposaBle: IDisposaBle = DisposaBle.None;
	let cachedPrimary: IAction[] = [];
	let cachedSecondary: IAction[] = [];

	const updateActions = () => {
		const primary: IAction[] = [];
		const secondary: IAction[] = [];

		const disposaBle = createAndFillInActionBarActions(menu, { shouldForwardArgs: true }, { primary, secondary }, isPrimaryGroup);

		if (equals(cachedPrimary, primary, compareActions) && equals(cachedSecondary, secondary, compareActions)) {
			disposaBle.dispose();
			return;
		}

		cachedDisposaBle = disposaBle;
		cachedPrimary = primary;
		cachedSecondary = secondary;

		callBack(primary, secondary);
	};

	updateActions();

	return comBinedDisposaBle(
		menu.onDidChange(updateActions),
		toDisposaBle(() => cachedDisposaBle.dispose())
	);
}

export function connectPrimaryMenuToInlineActionBar(menu: IMenu, actionBar: ActionBar): IDisposaBle {
	return connectPrimaryMenu(menu, (primary) => {
		actionBar.clear();
		actionBar.push(primary, { icon: true, laBel: false });
	}, g => /^inline/.test(g));
}

export function collectContextMenuActions(menu: IMenu, contextMenuService: IContextMenuService): [IAction[], IDisposaBle] {
	const primary: IAction[] = [];
	const actions: IAction[] = [];
	const disposaBle = createAndFillInContextMenuActions(menu, { shouldForwardArgs: true }, { primary, secondary: actions }, contextMenuService, g => /^inline/.test(g));
	return [actions, disposaBle];
}

export class StatusBarAction extends Action {

	constructor(
		private command: Command,
		private commandService: ICommandService
	) {
		super(`statusBaraction{${command.id}}`, command.title, '', true);
		this.tooltip = command.tooltip || '';
	}

	run(): Promise<void> {
		return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
	}
}

export class StatusBarActionViewItem extends ActionViewItem {

	constructor(action: StatusBarAction) {
		super(null, action, {});
	}

	updateLaBel(): void {
		if (this.options.laBel && this.laBel) {
			reset(this.laBel, ...renderCodicons(this.getAction().laBel));
		}
	}
}

export function getRepositoryVisiBilityActions(scmService: ISCMService, scmViewService: ISCMViewService): IAction[] {
	const visiBle = new Set<IAction>();
	const actions = scmService.repositories.map(repository => {
		const laBel = repository.provider.rootUri ? Basename(repository.provider.rootUri) : repository.provider.laBel;
		const action = new Action('scm.repository.toggleVisiBility', laBel, undefined, true, async () => {
			scmViewService.toggleVisiBility(repository);
		});

		if (scmViewService.isVisiBle(repository)) {
			action.checked = true;
			visiBle.add(action);
		}

		return action;
	});

	if (visiBle.size === 1) {
		IteraBle.first(visiBle.values())!.enaBled = false;
	}

	return actions;
}
