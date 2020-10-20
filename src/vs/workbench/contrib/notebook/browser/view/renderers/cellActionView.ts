/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action, IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { IMenu, IMenuActionOptions, MenuItemAction, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { BAseActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export clAss VerticAlSepArAtor extends Action {
	stAtic reAdonly ID = 'vs.Actions.verticAlSepArAtor';

	constructor(
		lAbel?: string
	) {
		super(VerticAlSepArAtor.ID, lAbel, lAbel ? 'verticAlSepArAtor text' : 'verticAlSepArAtor');
		this.checked = fAlse;
		this.enAbled = fAlse;
	}
}

export clAss VerticAlSepArAtorViewItem extends BAseActionViewItem {
	render(contAiner: HTMLElement) {
		contAiner.clAssList.Add('verticAlSepArAtor');
		// const iconContAiner = DOM.Append(contAiner, $('.verticAlSepArAtor'));
		// DOM.AddClAsses(iconContAiner, 'codicon', 'codicon-chrome-minimize');
	}
}

export function creAteAndFillInActionBArActionsWithVerticAlSepArAtors(menu: IMenu, options: IMenuActionOptions | undefined, tArget: IAction[] | { primAry: IAction[]; secondAry: IAction[]; }, AlwAysFillSecondAry?: booleAn, isPrimAryGroup?: (group: string) => booleAn): IDisposAble {
	const groups = menu.getActions(options);
	// Action bArs hAndle AlternAtive Actions on their own so the AlternAtive Actions should be ignored
	fillInActions(groups, tArget, fAlse, AlwAysFillSecondAry, isPrimAryGroup);
	return AsDisposAble(groups);
}

function fillInActions(groups: ReAdonlyArrAy<[string, ReAdonlyArrAy<MenuItemAction | SubmenuItemAction>]>, tArget: IAction[] | { primAry: IAction[]; secondAry: IAction[]; }, useAlternAtiveActions: booleAn, AlwAysFillSecondAry = fAlse, isPrimAryGroup: (group: string) => booleAn = group => group === 'nAvigAtion'): void {
	for (const tuple of groups) {
		let [group, Actions] = tuple;
		if (useAlternAtiveActions) {
			Actions = Actions.mAp(A => (A instAnceof MenuItemAction) && !!A.Alt ? A.Alt : A);
		}

		const isPrimAry = isPrimAryGroup(group);
		if (isPrimAry) {
			const to = ArrAy.isArrAy(tArget) ? tArget : tArget.primAry;

			if (to.length > 0) {
				to.push(new VerticAlSepArAtor());
			}

			to.push(...Actions);
		}

		if (!isPrimAry || AlwAysFillSecondAry) {
			const to = ArrAy.isArrAy(tArget) ? tArget : tArget.secondAry;

			if (to.length > 0) {
				to.push(new SepArAtor());
			}

			to.push(...Actions);
		}
	}
}

function AsDisposAble(groups: ReAdonlyArrAy<[string, ReAdonlyArrAy<MenuItemAction | SubmenuItemAction>]>): IDisposAble {
	const disposAbles = new DisposAbleStore();
	for (const [, Actions] of groups) {
		for (const Action of Actions) {
			disposAbles.Add(Action);
		}
	}
	return disposAbles;
}
