/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ISCMResource, ISCMRepository, ISCMResourceGroup, ISCMInput, ISCMService, ISCMViewService } from 'vs/workbench/contrib/scm/common/scm';
import { IMenu } from 'vs/plAtform/Actions/common/Actions';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IDisposAble, DisposAble, combinedDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Action, IAction } from 'vs/bAse/common/Actions';
import { creAteAndFillInActionBArActions, creAteAndFillInContextMenuActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { equAls } from 'vs/bAse/common/ArrAys';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { renderCodicons } from 'vs/bAse/browser/codicons';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { CommAnd } from 'vs/editor/common/modes';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { reset } from 'vs/bAse/browser/dom';

export function isSCMRepository(element: Any): element is ISCMRepository {
	return !!(element As ISCMRepository).provider && typeof (element As ISCMRepository).setSelected === 'function';
}

export function isSCMInput(element: Any): element is ISCMInput {
	return !!(element As ISCMInput).vAlidAteInput && typeof (element As ISCMInput).vAlue === 'string';
}

export function isSCMResourceGroup(element: Any): element is ISCMResourceGroup {
	return !!(element As ISCMResourceGroup).provider && !!(element As ISCMResourceGroup).elements;
}

export function isSCMResource(element: Any): element is ISCMResource {
	return !!(element As ISCMResource).sourceUri && isSCMResourceGroup((element As ISCMResource).resourceGroup);
}

const compAreActions = (A: IAction, b: IAction) => A.id === b.id;

export function connectPrimAryMenu(menu: IMenu, cAllbAck: (primAry: IAction[], secondAry: IAction[]) => void, isPrimAryGroup?: (group: string) => booleAn): IDisposAble {
	let cAchedDisposAble: IDisposAble = DisposAble.None;
	let cAchedPrimAry: IAction[] = [];
	let cAchedSecondAry: IAction[] = [];

	const updAteActions = () => {
		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];

		const disposAble = creAteAndFillInActionBArActions(menu, { shouldForwArdArgs: true }, { primAry, secondAry }, isPrimAryGroup);

		if (equAls(cAchedPrimAry, primAry, compAreActions) && equAls(cAchedSecondAry, secondAry, compAreActions)) {
			disposAble.dispose();
			return;
		}

		cAchedDisposAble = disposAble;
		cAchedPrimAry = primAry;
		cAchedSecondAry = secondAry;

		cAllbAck(primAry, secondAry);
	};

	updAteActions();

	return combinedDisposAble(
		menu.onDidChAnge(updAteActions),
		toDisposAble(() => cAchedDisposAble.dispose())
	);
}

export function connectPrimAryMenuToInlineActionBAr(menu: IMenu, ActionBAr: ActionBAr): IDisposAble {
	return connectPrimAryMenu(menu, (primAry) => {
		ActionBAr.cleAr();
		ActionBAr.push(primAry, { icon: true, lAbel: fAlse });
	}, g => /^inline/.test(g));
}

export function collectContextMenuActions(menu: IMenu, contextMenuService: IContextMenuService): [IAction[], IDisposAble] {
	const primAry: IAction[] = [];
	const Actions: IAction[] = [];
	const disposAble = creAteAndFillInContextMenuActions(menu, { shouldForwArdArgs: true }, { primAry, secondAry: Actions }, contextMenuService, g => /^inline/.test(g));
	return [Actions, disposAble];
}

export clAss StAtusBArAction extends Action {

	constructor(
		privAte commAnd: CommAnd,
		privAte commAndService: ICommAndService
	) {
		super(`stAtusbArAction{${commAnd.id}}`, commAnd.title, '', true);
		this.tooltip = commAnd.tooltip || '';
	}

	run(): Promise<void> {
		return this.commAndService.executeCommAnd(this.commAnd.id, ...(this.commAnd.Arguments || []));
	}
}

export clAss StAtusBArActionViewItem extends ActionViewItem {

	constructor(Action: StAtusBArAction) {
		super(null, Action, {});
	}

	updAteLAbel(): void {
		if (this.options.lAbel && this.lAbel) {
			reset(this.lAbel, ...renderCodicons(this.getAction().lAbel));
		}
	}
}

export function getRepositoryVisibilityActions(scmService: ISCMService, scmViewService: ISCMViewService): IAction[] {
	const visible = new Set<IAction>();
	const Actions = scmService.repositories.mAp(repository => {
		const lAbel = repository.provider.rootUri ? bAsenAme(repository.provider.rootUri) : repository.provider.lAbel;
		const Action = new Action('scm.repository.toggleVisibility', lAbel, undefined, true, Async () => {
			scmViewService.toggleVisibility(repository);
		});

		if (scmViewService.isVisible(repository)) {
			Action.checked = true;
			visible.Add(Action);
		}

		return Action;
	});

	if (visible.size === 1) {
		IterAble.first(visible.vAlues())!.enAbled = fAlse;
	}

	return Actions;
}
