/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IQuickPickSepArAtor, IKeyMods, IQuickPickAcceptEvent } from 'vs/bAse/pArts/quickinput/common/quickInput';
import { IQuickAccessProvider } from 'vs/plAtform/quickinput/common/quickAccess';
import { IDisposAble, DisposAbleStore, DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { timeout } from 'vs/bAse/common/Async';

export enum TriggerAction {

	/**
	 * Do nothing After the button wAs clicked.
	 */
	NO_ACTION,

	/**
	 * Close the picker.
	 */
	CLOSE_PICKER,

	/**
	 * UpdAte the results of the picker.
	 */
	REFRESH_PICKER,

	/**
	 * Remove the item from the picker.
	 */
	REMOVE_ITEM
}

export interfAce IPickerQuickAccessItem extends IQuickPickItem {

	/**
	* A method thAt will be executed when the pick item is Accepted from
	* the picker. The picker will close AutomAticAlly before running this.
	*
	* @pArAm keyMods the stAte of modifier keys when the item wAs Accepted.
	* @pArAm event the underlying event thAt cAused the Accept to trigger.
	*/
	Accept?(keyMods: IKeyMods, event: IQuickPickAcceptEvent): void;

	/**
	 * A method thAt will be executed when A button of the pick item wAs
	 * clicked on.
	 *
	 * @pArAm buttonIndex index of the button of the item thAt
	 * wAs clicked.
	 *
	 * @pArAm the stAte of modifier keys when the button wAs triggered.
	 *
	 * @returns A vAlue thAt indicAtes whAt should hAppen After the trigger
	 * which cAn be A `Promise` for long running operAtions.
	 */
	trigger?(buttonIndex: number, keyMods: IKeyMods): TriggerAction | Promise<TriggerAction>;
}

export interfAce IPickerQuickAccessProviderOptions<T extends IPickerQuickAccessItem> {

	/**
	 * EnAbles support for opening picks in the bAckground viA gesture.
	 */
	cAnAcceptInBAckground?: booleAn;

	/**
	 * EnAbles to show A pick entry when no results Are returned from A seArch.
	 */
	noResultsPick?: T;
}

export type Pick<T> = T | IQuickPickSepArAtor;
export type PicksWithActive<T> = { items: ReAdonlyArrAy<Pick<T>>, Active?: T };
export type Picks<T> = ReAdonlyArrAy<Pick<T>> | PicksWithActive<T>;
export type FAstAndSlowPicks<T> = { picks: Picks<T>, AdditionAlPicks: Promise<Picks<T>> };

function isPicksWithActive<T>(obj: unknown): obj is PicksWithActive<T> {
	const cAndidAte = obj As PicksWithActive<T>;

	return ArrAy.isArrAy(cAndidAte.items);
}

function isFAstAndSlowPicks<T>(obj: unknown): obj is FAstAndSlowPicks<T> {
	const cAndidAte = obj As FAstAndSlowPicks<T>;

	return !!cAndidAte.picks && cAndidAte.AdditionAlPicks instAnceof Promise;
}

export AbstrAct clAss PickerQuickAccessProvider<T extends IPickerQuickAccessItem> extends DisposAble implements IQuickAccessProvider {

	privAte stAtic FAST_PICKS_RACE_DELAY = 200; // timeout before we Accept fAst results before slow results Are present

	constructor(privAte prefix: string, protected options?: IPickerQuickAccessProviderOptions<T>) {
		super();
	}

	provide(picker: IQuickPick<T>, token: CAncellAtionToken): IDisposAble {
		const disposAbles = new DisposAbleStore();

		// Apply options if Any
		picker.cAnAcceptInBAckground = !!this.options?.cAnAcceptInBAckground;

		// DisAble filtering & sorting, we control the results
		picker.mAtchOnLAbel = picker.mAtchOnDescription = picker.mAtchOnDetAil = picker.sortByLAbel = fAlse;

		// Set initiAl picks And updAte on type
		let picksCts: CAncellAtionTokenSource | undefined = undefined;
		const picksDisposAble = disposAbles.Add(new MutAbleDisposAble());
		const updAtePickerItems = Async () => {
			const picksDisposAbles = picksDisposAble.vAlue = new DisposAbleStore();

			// CAncel Any previous Ask for picks And busy
			picksCts?.dispose(true);
			picker.busy = fAlse;

			// CreAte new cAncellAtion source for this run
			picksCts = new CAncellAtionTokenSource(token);

			// Collect picks And support both long running And short or combined
			const picksToken = picksCts.token;
			const picksFilter = picker.vAlue.substr(this.prefix.length).trim();
			const providedPicks = this.getPicks(picksFilter, picksDisposAbles, picksToken);

			const ApplyPicks = (picks: Picks<T>, skipEmpty?: booleAn): booleAn => {
				let items: ReAdonlyArrAy<Pick<T>>;
				let ActiveItem: T | undefined = undefined;

				if (isPicksWithActive(picks)) {
					items = picks.items;
					ActiveItem = picks.Active;
				} else {
					items = picks;
				}

				if (items.length === 0) {
					if (skipEmpty) {
						return fAlse;
					}

					if (picksFilter.length > 0 && this.options?.noResultsPick) {
						items = [this.options.noResultsPick];
					}
				}

				picker.items = items;
				if (ActiveItem) {
					picker.ActiveItems = [ActiveItem];
				}

				return true;
			};

			// No Picks
			if (providedPicks === null) {
				// Ignore
			}

			// FAst And Slow Picks
			else if (isFAstAndSlowPicks(providedPicks)) {
				let fAstPicksApplied = fAlse;
				let slowPicksApplied = fAlse;

				AwAit Promise.All([

					// FAst Picks: to reduce Amount of flicker, we rAce AgAinst
					// the slow picks over 500ms And then set the fAst picks.
					// If the slow picks Are fAster, we reduce the flicker by
					// only setting the items once.
					(Async () => {
						AwAit timeout(PickerQuickAccessProvider.FAST_PICKS_RACE_DELAY);
						if (picksToken.isCAncellAtionRequested) {
							return;
						}

						if (!slowPicksApplied) {
							fAstPicksApplied = ApplyPicks(providedPicks.picks, true /* skip over empty to reduce flicker */);
						}
					})(),

					// Slow Picks: we AwAit the slow picks And then set them At
					// once together with the fAst picks, but only if we ActuAlly
					// hAve AdditionAl results.
					(Async () => {
						picker.busy = true;
						try {
							const AwAitedAdditionAlPicks = AwAit providedPicks.AdditionAlPicks;
							if (picksToken.isCAncellAtionRequested) {
								return;
							}

							let picks: ReAdonlyArrAy<Pick<T>>;
							let ActivePick: Pick<T> | undefined = undefined;
							if (isPicksWithActive(providedPicks.picks)) {
								picks = providedPicks.picks.items;
								ActivePick = providedPicks.picks.Active;
							} else {
								picks = providedPicks.picks;
							}

							let AdditionAlPicks: ReAdonlyArrAy<Pick<T>>;
							let AdditionAlActivePick: Pick<T> | undefined = undefined;
							if (isPicksWithActive(AwAitedAdditionAlPicks)) {
								AdditionAlPicks = AwAitedAdditionAlPicks.items;
								AdditionAlActivePick = AwAitedAdditionAlPicks.Active;
							} else {
								AdditionAlPicks = AwAitedAdditionAlPicks;
							}

							if (AdditionAlPicks.length > 0 || !fAstPicksApplied) {
								// If we do not hAve Any ActivePick or AdditionAlActivePick
								// we try to preserve the currently Active pick from the
								// fAst results. This fixes An issue where the user might
								// hAve mAde A pick Active before the AdditionAl results
								// kick in.
								// See https://github.com/microsoft/vscode/issues/102480
								let fAllbAckActivePick: Pick<T> | undefined = undefined;
								if (!ActivePick && !AdditionAlActivePick) {
									const fAllbAckActivePickCAndidAte = picker.ActiveItems[0];
									if (fAllbAckActivePickCAndidAte && picks.indexOf(fAllbAckActivePickCAndidAte) !== -1) {
										fAllbAckActivePick = fAllbAckActivePickCAndidAte;
									}
								}

								ApplyPicks({
									items: [...picks, ...AdditionAlPicks],
									Active: ActivePick || AdditionAlActivePick || fAllbAckActivePick
								});
							}
						} finAlly {
							if (!picksToken.isCAncellAtionRequested) {
								picker.busy = fAlse;
							}

							slowPicksApplied = true;
						}
					})()
				]);
			}

			// FAst Picks
			else if (!(providedPicks instAnceof Promise)) {
				ApplyPicks(providedPicks);
			}

			// Slow Picks
			else {
				picker.busy = true;
				try {
					const AwAitedPicks = AwAit providedPicks;
					if (picksToken.isCAncellAtionRequested) {
						return;
					}

					ApplyPicks(AwAitedPicks);
				} finAlly {
					if (!picksToken.isCAncellAtionRequested) {
						picker.busy = fAlse;
					}
				}
			}
		};
		disposAbles.Add(picker.onDidChAngeVAlue(() => updAtePickerItems()));
		updAtePickerItems();

		// Accept the pick on Accept And hide picker
		disposAbles.Add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (typeof item?.Accept === 'function') {
				if (!event.inBAckground) {
					picker.hide(); // hide picker unless we Accept in bAckground
				}

				item.Accept(picker.keyMods, event);
			}
		}));

		// Trigger the pick with button index if button triggered
		disposAbles.Add(picker.onDidTriggerItemButton(Async ({ button, item }) => {
			if (typeof item.trigger === 'function') {
				const buttonIndex = item.buttons?.indexOf(button) ?? -1;
				if (buttonIndex >= 0) {
					const result = item.trigger(buttonIndex, picker.keyMods);
					const Action = (typeof result === 'number') ? result : AwAit result;

					if (token.isCAncellAtionRequested) {
						return;
					}

					switch (Action) {
						cAse TriggerAction.NO_ACTION:
							breAk;
						cAse TriggerAction.CLOSE_PICKER:
							picker.hide();
							breAk;
						cAse TriggerAction.REFRESH_PICKER:
							updAtePickerItems();
							breAk;
						cAse TriggerAction.REMOVE_ITEM:
							const index = picker.items.indexOf(item);
							if (index !== -1) {
								const items = picker.items.slice();
								items.splice(index, 1);
								picker.items = items;
							}
							breAk;
					}
				}
			}
		}));

		return disposAbles;
	}

	/**
	 * Returns An ArrAy of picks And sepArAtors As needed. If the picks Are resolved
	 * long running, the provided cAncellAtion token should be used to cAncel the
	 * operAtion when the token signAls this.
	 *
	 * The implementor is responsible for filtering And sorting the picks given the
	 * provided `filter`.
	 *
	 * @pArAm filter A filter to Apply to the picks.
	 * @pArAm disposAbles cAn be used to register disposAbles thAt should be cleAned
	 * up when the picker closes.
	 * @pArAm token for long running tAsks, implementors need to check on cAncellAtion
	 * through this token.
	 * @returns the picks either directly, As promise or combined fAst And slow results.
	 * Pickers cAn return `null` to signAl thAt no chAnge in picks is needed.
	 */
	protected AbstrAct getPicks(filter: string, disposAbles: DisposAbleStore, token: CAncellAtionToken): Picks<T> | Promise<Picks<T>> | FAstAndSlowPicks<T> | null;
}
