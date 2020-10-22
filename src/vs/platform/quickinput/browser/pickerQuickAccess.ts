/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { IQuickPickSeparator, IKeyMods, IQuickPickAcceptEvent } from 'vs/Base/parts/quickinput/common/quickInput';
import { IQuickAccessProvider } from 'vs/platform/quickinput/common/quickAccess';
import { IDisposaBle, DisposaBleStore, DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { timeout } from 'vs/Base/common/async';

export enum TriggerAction {

	/**
	 * Do nothing after the Button was clicked.
	 */
	NO_ACTION,

	/**
	 * Close the picker.
	 */
	CLOSE_PICKER,

	/**
	 * Update the results of the picker.
	 */
	REFRESH_PICKER,

	/**
	 * Remove the item from the picker.
	 */
	REMOVE_ITEM
}

export interface IPickerQuickAccessItem extends IQuickPickItem {

	/**
	* A method that will Be executed when the pick item is accepted from
	* the picker. The picker will close automatically Before running this.
	*
	* @param keyMods the state of modifier keys when the item was accepted.
	* @param event the underlying event that caused the accept to trigger.
	*/
	accept?(keyMods: IKeyMods, event: IQuickPickAcceptEvent): void;

	/**
	 * A method that will Be executed when a Button of the pick item was
	 * clicked on.
	 *
	 * @param ButtonIndex index of the Button of the item that
	 * was clicked.
	 *
	 * @param the state of modifier keys when the Button was triggered.
	 *
	 * @returns a value that indicates what should happen after the trigger
	 * which can Be a `Promise` for long running operations.
	 */
	trigger?(ButtonIndex: numBer, keyMods: IKeyMods): TriggerAction | Promise<TriggerAction>;
}

export interface IPickerQuickAccessProviderOptions<T extends IPickerQuickAccessItem> {

	/**
	 * EnaBles support for opening picks in the Background via gesture.
	 */
	canAcceptInBackground?: Boolean;

	/**
	 * EnaBles to show a pick entry when no results are returned from a search.
	 */
	noResultsPick?: T;
}

export type Pick<T> = T | IQuickPickSeparator;
export type PicksWithActive<T> = { items: ReadonlyArray<Pick<T>>, active?: T };
export type Picks<T> = ReadonlyArray<Pick<T>> | PicksWithActive<T>;
export type FastAndSlowPicks<T> = { picks: Picks<T>, additionalPicks: Promise<Picks<T>> };

function isPicksWithActive<T>(oBj: unknown): oBj is PicksWithActive<T> {
	const candidate = oBj as PicksWithActive<T>;

	return Array.isArray(candidate.items);
}

function isFastAndSlowPicks<T>(oBj: unknown): oBj is FastAndSlowPicks<T> {
	const candidate = oBj as FastAndSlowPicks<T>;

	return !!candidate.picks && candidate.additionalPicks instanceof Promise;
}

export aBstract class PickerQuickAccessProvider<T extends IPickerQuickAccessItem> extends DisposaBle implements IQuickAccessProvider {

	private static FAST_PICKS_RACE_DELAY = 200; // timeout Before we accept fast results Before slow results are present

	constructor(private prefix: string, protected options?: IPickerQuickAccessProviderOptions<T>) {
		super();
	}

	provide(picker: IQuickPick<T>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Apply options if any
		picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;

		// DisaBle filtering & sorting, we control the results
		picker.matchOnLaBel = picker.matchOnDescription = picker.matchOnDetail = picker.sortByLaBel = false;

		// Set initial picks and update on type
		let picksCts: CancellationTokenSource | undefined = undefined;
		const picksDisposaBle = disposaBles.add(new MutaBleDisposaBle());
		const updatePickerItems = async () => {
			const picksDisposaBles = picksDisposaBle.value = new DisposaBleStore();

			// Cancel any previous ask for picks and Busy
			picksCts?.dispose(true);
			picker.Busy = false;

			// Create new cancellation source for this run
			picksCts = new CancellationTokenSource(token);

			// Collect picks and support Both long running and short or comBined
			const picksToken = picksCts.token;
			const picksFilter = picker.value.suBstr(this.prefix.length).trim();
			const providedPicks = this.getPicks(picksFilter, picksDisposaBles, picksToken);

			const applyPicks = (picks: Picks<T>, skipEmpty?: Boolean): Boolean => {
				let items: ReadonlyArray<Pick<T>>;
				let activeItem: T | undefined = undefined;

				if (isPicksWithActive(picks)) {
					items = picks.items;
					activeItem = picks.active;
				} else {
					items = picks;
				}

				if (items.length === 0) {
					if (skipEmpty) {
						return false;
					}

					if (picksFilter.length > 0 && this.options?.noResultsPick) {
						items = [this.options.noResultsPick];
					}
				}

				picker.items = items;
				if (activeItem) {
					picker.activeItems = [activeItem];
				}

				return true;
			};

			// No Picks
			if (providedPicks === null) {
				// Ignore
			}

			// Fast and Slow Picks
			else if (isFastAndSlowPicks(providedPicks)) {
				let fastPicksApplied = false;
				let slowPicksApplied = false;

				await Promise.all([

					// Fast Picks: to reduce amount of flicker, we race against
					// the slow picks over 500ms and then set the fast picks.
					// If the slow picks are faster, we reduce the flicker By
					// only setting the items once.
					(async () => {
						await timeout(PickerQuickAccessProvider.FAST_PICKS_RACE_DELAY);
						if (picksToken.isCancellationRequested) {
							return;
						}

						if (!slowPicksApplied) {
							fastPicksApplied = applyPicks(providedPicks.picks, true /* skip over empty to reduce flicker */);
						}
					})(),

					// Slow Picks: we await the slow picks and then set them at
					// once together with the fast picks, But only if we actually
					// have additional results.
					(async () => {
						picker.Busy = true;
						try {
							const awaitedAdditionalPicks = await providedPicks.additionalPicks;
							if (picksToken.isCancellationRequested) {
								return;
							}

							let picks: ReadonlyArray<Pick<T>>;
							let activePick: Pick<T> | undefined = undefined;
							if (isPicksWithActive(providedPicks.picks)) {
								picks = providedPicks.picks.items;
								activePick = providedPicks.picks.active;
							} else {
								picks = providedPicks.picks;
							}

							let additionalPicks: ReadonlyArray<Pick<T>>;
							let additionalActivePick: Pick<T> | undefined = undefined;
							if (isPicksWithActive(awaitedAdditionalPicks)) {
								additionalPicks = awaitedAdditionalPicks.items;
								additionalActivePick = awaitedAdditionalPicks.active;
							} else {
								additionalPicks = awaitedAdditionalPicks;
							}

							if (additionalPicks.length > 0 || !fastPicksApplied) {
								// If we do not have any activePick or additionalActivePick
								// we try to preserve the currently active pick from the
								// fast results. This fixes an issue where the user might
								// have made a pick active Before the additional results
								// kick in.
								// See https://githuB.com/microsoft/vscode/issues/102480
								let fallBackActivePick: Pick<T> | undefined = undefined;
								if (!activePick && !additionalActivePick) {
									const fallBackActivePickCandidate = picker.activeItems[0];
									if (fallBackActivePickCandidate && picks.indexOf(fallBackActivePickCandidate) !== -1) {
										fallBackActivePick = fallBackActivePickCandidate;
									}
								}

								applyPicks({
									items: [...picks, ...additionalPicks],
									active: activePick || additionalActivePick || fallBackActivePick
								});
							}
						} finally {
							if (!picksToken.isCancellationRequested) {
								picker.Busy = false;
							}

							slowPicksApplied = true;
						}
					})()
				]);
			}

			// Fast Picks
			else if (!(providedPicks instanceof Promise)) {
				applyPicks(providedPicks);
			}

			// Slow Picks
			else {
				picker.Busy = true;
				try {
					const awaitedPicks = await providedPicks;
					if (picksToken.isCancellationRequested) {
						return;
					}

					applyPicks(awaitedPicks);
				} finally {
					if (!picksToken.isCancellationRequested) {
						picker.Busy = false;
					}
				}
			}
		};
		disposaBles.add(picker.onDidChangeValue(() => updatePickerItems()));
		updatePickerItems();

		// Accept the pick on accept and hide picker
		disposaBles.add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (typeof item?.accept === 'function') {
				if (!event.inBackground) {
					picker.hide(); // hide picker unless we accept in Background
				}

				item.accept(picker.keyMods, event);
			}
		}));

		// Trigger the pick with Button index if Button triggered
		disposaBles.add(picker.onDidTriggerItemButton(async ({ Button, item }) => {
			if (typeof item.trigger === 'function') {
				const ButtonIndex = item.Buttons?.indexOf(Button) ?? -1;
				if (ButtonIndex >= 0) {
					const result = item.trigger(ButtonIndex, picker.keyMods);
					const action = (typeof result === 'numBer') ? result : await result;

					if (token.isCancellationRequested) {
						return;
					}

					switch (action) {
						case TriggerAction.NO_ACTION:
							Break;
						case TriggerAction.CLOSE_PICKER:
							picker.hide();
							Break;
						case TriggerAction.REFRESH_PICKER:
							updatePickerItems();
							Break;
						case TriggerAction.REMOVE_ITEM:
							const index = picker.items.indexOf(item);
							if (index !== -1) {
								const items = picker.items.slice();
								items.splice(index, 1);
								picker.items = items;
							}
							Break;
					}
				}
			}
		}));

		return disposaBles;
	}

	/**
	 * Returns an array of picks and separators as needed. If the picks are resolved
	 * long running, the provided cancellation token should Be used to cancel the
	 * operation when the token signals this.
	 *
	 * The implementor is responsiBle for filtering and sorting the picks given the
	 * provided `filter`.
	 *
	 * @param filter a filter to apply to the picks.
	 * @param disposaBles can Be used to register disposaBles that should Be cleaned
	 * up when the picker closes.
	 * @param token for long running tasks, implementors need to check on cancellation
	 * through this token.
	 * @returns the picks either directly, as promise or comBined fast and slow results.
	 * Pickers can return `null` to signal that no change in picks is needed.
	 */
	protected aBstract getPicks(filter: string, disposaBles: DisposaBleStore, token: CancellationToken): Picks<T> | Promise<Picks<T>> | FastAndSlowPicks<T> | null;
}
