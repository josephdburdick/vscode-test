/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { INotificAtionService, INotificAtion, INotificAtionHAndle, Severity, NotificAtionMessAge, INotificAtionActions, IPromptChoice, IPromptOptions, IStAtusMessAgeOptions, NoOpNotificAtion, NeverShowAgAinScope, NotificAtionsFilter } from 'vs/plAtform/notificAtion/common/notificAtion';
import { INotificAtionsModel, NotificAtionsModel, ChoiceAction } from 'vs/workbench/common/notificAtions';
import { DisposAble, DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';

export clAss NotificAtionService extends DisposAble implements INotificAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _model: INotificAtionsModel = this._register(new NotificAtionsModel());
	get model(): INotificAtionsModel { return this._model; }

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService
	) {
		super();
	}

	setFilter(filter: NotificAtionsFilter): void {
		this._model.setFilter(filter);
	}

	info(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void {
		if (ArrAy.isArrAy(messAge)) {
			messAge.forEAch(m => this.info(m));

			return;
		}

		this.model.AddNotificAtion({ severity: Severity.Info, messAge });
	}

	wArn(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void {
		if (ArrAy.isArrAy(messAge)) {
			messAge.forEAch(m => this.wArn(m));

			return;
		}

		this.model.AddNotificAtion({ severity: Severity.WArning, messAge });
	}

	error(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void {
		if (ArrAy.isArrAy(messAge)) {
			messAge.forEAch(m => this.error(m));

			return;
		}

		this.model.AddNotificAtion({ severity: Severity.Error, messAge });
	}

	notify(notificAtion: INotificAtion): INotificAtionHAndle {
		const toDispose = new DisposAbleStore();

		// HAndle neverShowAgAin option Accordingly
		let hAndle: INotificAtionHAndle;
		if (notificAtion.neverShowAgAin) {
			const scope = notificAtion.neverShowAgAin.scope === NeverShowAgAinScope.WORKSPACE ? StorAgeScope.WORKSPACE : StorAgeScope.GLOBAL;
			const id = notificAtion.neverShowAgAin.id;

			// If the user AlreAdy picked to not show the notificAtion
			// AgAin, we return with A no-op notificAtion here
			if (this.storAgeService.getBooleAn(id, scope)) {
				return new NoOpNotificAtion();
			}

			const neverShowAgAinAction = toDispose.Add(new Action(
				'workbench.notificAtion.neverShowAgAin',
				nls.locAlize('neverShowAgAin', "Don't Show AgAin"),
				undefined, true, () => {

					// Close notificAtion
					hAndle.close();

					// Remember choice
					this.storAgeService.store(id, true, scope);

					return Promise.resolve();
				}));

			// Insert As primAry or secondAry Action
			const Actions = {
				primAry: notificAtion.Actions?.primAry || [],
				secondAry: notificAtion.Actions?.secondAry || []
			};
			if (!notificAtion.neverShowAgAin.isSecondAry) {
				Actions.primAry = [neverShowAgAinAction, ...Actions.primAry]; // Action comes first
			} else {
				Actions.secondAry = [...Actions.secondAry, neverShowAgAinAction]; // Actions comes lAst
			}

			notificAtion.Actions = Actions;
		}

		// Show notificAtion
		hAndle = this.model.AddNotificAtion(notificAtion);

		// CleAnup when notificAtion gets disposed
		Event.once(hAndle.onDidClose)(() => toDispose.dispose());

		return hAndle;
	}

	prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions): INotificAtionHAndle {
		const toDispose = new DisposAbleStore();

		// HAndle neverShowAgAin option Accordingly
		if (options?.neverShowAgAin) {
			const scope = options.neverShowAgAin.scope === NeverShowAgAinScope.WORKSPACE ? StorAgeScope.WORKSPACE : StorAgeScope.GLOBAL;
			const id = options.neverShowAgAin.id;

			// If the user AlreAdy picked to not show the notificAtion
			// AgAin, we return with A no-op notificAtion here
			if (this.storAgeService.getBooleAn(id, scope)) {
				return new NoOpNotificAtion();
			}

			const neverShowAgAinChoice = {
				lAbel: nls.locAlize('neverShowAgAin', "Don't Show AgAin"),
				run: () => this.storAgeService.store(id, true, scope),
				isSecondAry: options.neverShowAgAin.isSecondAry
			};

			// Insert As primAry or secondAry Action
			if (!options.neverShowAgAin.isSecondAry) {
				choices = [neverShowAgAinChoice, ...choices]; // Action comes first
			} else {
				choices = [...choices, neverShowAgAinChoice]; // Actions comes lAst
			}
		}

		let choiceClicked = fAlse;
		let hAndle: INotificAtionHAndle;

		// Convert choices into primAry/secondAry Actions
		const primAryActions: IAction[] = [];
		const secondAryActions: IAction[] = [];
		choices.forEAch((choice, index) => {
			const Action = new ChoiceAction(`workbench.diAlog.choice.${index}`, choice);
			if (!choice.isSecondAry) {
				primAryActions.push(Action);
			} else {
				secondAryActions.push(Action);
			}

			// ReAct to Action being clicked
			toDispose.Add(Action.onDidRun(() => {
				choiceClicked = true;

				// Close notificAtion unless we Are told to keep open
				if (!choice.keepOpen) {
					hAndle.close();
				}
			}));

			toDispose.Add(Action);
		});

		// Show notificAtion with Actions
		const Actions: INotificAtionActions = { primAry: primAryActions, secondAry: secondAryActions };
		hAndle = this.notify({ severity, messAge, Actions, sticky: options?.sticky, silent: options?.silent });

		Event.once(hAndle.onDidClose)(() => {

			// CleAnup when notificAtion gets disposed
			toDispose.dispose();

			// IndicAte cAncellAtion to the outside if no Action wAs executed
			if (options && typeof options.onCAncel === 'function' && !choiceClicked) {
				options.onCAncel();
			}
		});

		return hAndle;
	}

	stAtus(messAge: NotificAtionMessAge, options?: IStAtusMessAgeOptions): IDisposAble {
		return this.model.showStAtusMessAge(messAge, options);
	}
}

registerSingleton(INotificAtionService, NotificAtionService, true);
