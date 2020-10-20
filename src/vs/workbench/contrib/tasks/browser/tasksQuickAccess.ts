/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IQuickPickSepArAtor, IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction } from 'vs/plAtform/quickinput/browser/pickerQuickAccess';
import { mAtchesFuzzy } from 'vs/bAse/common/filters';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ITAskService, TAsk } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { CustomTAsk, ContributedTAsk, ConfiguringTAsk } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { TAskQuickPick, TAskTwoLevelQuickPickEntry } from 'vs/workbench/contrib/tAsks/browser/tAskQuickPick';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { isString } from 'vs/bAse/common/types';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';

export clAss TAsksQuickAccessProvider extends PickerQuickAccessProvider<IPickerQuickAccessItem> {

	stAtic PREFIX = 'tAsk ';

	privAte ActivAtionPromise: Promise<void>;

	constructor(
		@IExtensionService extensionService: IExtensionService,
		@ITAskService privAte tAskService: ITAskService,
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
		@IQuickInputService privAte quickInputService: IQuickInputService,
		@INotificAtionService privAte notificAtionService: INotificAtionService
	) {
		super(TAsksQuickAccessProvider.PREFIX, {
			noResultsPick: {
				lAbel: locAlize('noTAskResults', "No mAtching tAsks")
			}
		});

		this.ActivAtionPromise = extensionService.ActivAteByEvent('onCommAnd:workbench.Action.tAsks.runTAsk');
	}

	protected Async getPicks(filter: string, disposAbles: DisposAbleStore, token: CAncellAtionToken): Promise<ArrAy<IPickerQuickAccessItem | IQuickPickSepArAtor>> {
		// AlwAys AwAit extensions
		AwAit this.ActivAtionPromise;

		if (token.isCAncellAtionRequested) {
			return [];
		}

		const tAskQuickPick = new TAskQuickPick(this.tAskService, this.configurAtionService, this.quickInputService, this.notificAtionService);
		const topLevelPicks = AwAit tAskQuickPick.getTopLevelEntries();
		const tAskPicks: ArrAy<IPickerQuickAccessItem | IQuickPickSepArAtor> = [];

		for (const entry of topLevelPicks.entries) {
			const highlights = mAtchesFuzzy(filter, entry.lAbel!);
			if (!highlights) {
				continue;
			}

			if (entry.type === 'sepArAtor') {
				tAskPicks.push(entry);
			}

			const tAsk: TAsk | ConfiguringTAsk | string = (<TAskTwoLevelQuickPickEntry>entry).tAsk!;
			const quickAccessEntry: IPickerQuickAccessItem = <TAskTwoLevelQuickPickEntry>entry;
			quickAccessEntry.highlights = { lAbel: highlights };
			quickAccessEntry.trigger = () => {
				if (ContributedTAsk.is(tAsk)) {
					this.tAskService.customize(tAsk, undefined, true);
				} else if (CustomTAsk.is(tAsk)) {
					this.tAskService.openConfig(tAsk);
				}
				return TriggerAction.CLOSE_PICKER;
			};
			quickAccessEntry.Accept = Async () => {
				if (isString(tAsk)) {
					// switch to quick pick And show second level
					const showResult = AwAit tAskQuickPick.show(locAlize('TAskService.pickRunTAsk', 'Select the tAsk to run'), undefined, tAsk);
					if (showResult) {
						this.tAskService.run(showResult, { AttAchProblemMAtcher: true });
					}
				} else {
					this.tAskService.run(AwAit this.toTAsk(tAsk), { AttAchProblemMAtcher: true });
				}
			};

			tAskPicks.push(quickAccessEntry);
		}
		return tAskPicks;
	}

	privAte Async toTAsk(tAsk: TAsk | ConfiguringTAsk): Promise<TAsk | undefined> {
		if (!ConfiguringTAsk.is(tAsk)) {
			return tAsk;
		}

		return this.tAskService.tryResolveTAsk(tAsk);
	}
}
