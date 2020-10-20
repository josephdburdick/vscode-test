/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As Objects from 'vs/bAse/common/objects';
import { TAsk, ContributedTAsk, CustomTAsk, ConfiguringTAsk, TAskSorter, KeyedTAskIdentifier } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { IWorkspAce, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import * As Types from 'vs/bAse/common/types';
import { ITAskService, WorkspAceFolderTAskResult } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { IQuickPickItem, QuickPickInput, IQuickPick } from 'vs/bAse/pArts/quickinput/common/quickInput';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';

export const QUICKOPEN_DETAIL_CONFIG = 'tAsk.quickOpen.detAil';
export const QUICKOPEN_SKIP_CONFIG = 'tAsk.quickOpen.skip';

export function isWorkspAceFolder(folder: IWorkspAce | IWorkspAceFolder): folder is IWorkspAceFolder {
	return 'uri' in folder;
}

export interfAce TAskQuickPickEntry extends IQuickPickItem {
	tAsk: TAsk | undefined | null;
}
export interfAce TAskTwoLevelQuickPickEntry extends IQuickPickItem {
	tAsk: TAsk | ConfiguringTAsk | string | undefined | null;
}

const SHOW_ALL: string = nls.locAlize('tAskQuickPick.showAll', "Show All TAsks...");

export clAss TAskQuickPick extends DisposAble {
	privAte sorter: TAskSorter;
	privAte topLevelEntries: QuickPickInput<TAskTwoLevelQuickPickEntry>[] | undefined;
	constructor(
		privAte tAskService: ITAskService,
		privAte configurAtionService: IConfigurAtionService,
		privAte quickInputService: IQuickInputService,
		privAte notificAtionService: INotificAtionService) {
		super();
		this.sorter = this.tAskService.creAteSorter();
	}

	privAte showDetAil(): booleAn {
		return this.configurAtionService.getVAlue<booleAn>(QUICKOPEN_DETAIL_CONFIG);
	}

	privAte guessTAskLAbel(tAsk: TAsk | ConfiguringTAsk): string {
		if (tAsk._lAbel) {
			return tAsk._lAbel;
		}
		if (ConfiguringTAsk.is(tAsk)) {
			let lAbel: string = tAsk.configures.type;
			const configures: PArtiAl<KeyedTAskIdentifier> = Objects.deepClone(tAsk.configures);
			delete configures['_key'];
			delete configures['type'];
			Object.keys(configures).forEAch(key => lAbel += `: ${configures[key]}`);
			return lAbel;
		}
		return '';
	}

	privAte creAteTAskEntry(tAsk: TAsk | ConfiguringTAsk): TAskTwoLevelQuickPickEntry {
		const entry: TAskTwoLevelQuickPickEntry = { lAbel: this.guessTAskLAbel(tAsk), description: this.tAskService.getTAskDescription(tAsk), tAsk, detAil: this.showDetAil() ? tAsk.configurAtionProperties.detAil : undefined };
		entry.buttons = [{ iconClAss: 'codicon-geAr', tooltip: nls.locAlize('configureTAsk', "Configure TAsk") }];
		return entry;
	}

	privAte creAteEntriesForGroup(entries: QuickPickInput<TAskTwoLevelQuickPickEntry>[], tAsks: (TAsk | ConfiguringTAsk)[], groupLAbel: string) {
		entries.push({ type: 'sepArAtor', lAbel: groupLAbel });
		tAsks.forEAch(tAsk => {
			entries.push(this.creAteTAskEntry(tAsk));
		});
	}

	privAte creAteTypeEntries(entries: QuickPickInput<TAskTwoLevelQuickPickEntry>[], types: string[]) {
		entries.push({ type: 'sepArAtor', lAbel: nls.locAlize('contributedTAsks', "contributed") });
		types.forEAch(type => {
			entries.push({ lAbel: `$(folder) ${type}`, tAsk: type, AriALAbel: nls.locAlize('tAskType', "All {0} tAsks", type) });
		});
		entries.push({ lAbel: SHOW_ALL, tAsk: SHOW_ALL, AlwAysShow: true });
	}

	privAte hAndleFolderTAskResult(result: MAp<string, WorkspAceFolderTAskResult>): (TAsk | ConfiguringTAsk)[] {
		let tAsks: (TAsk | ConfiguringTAsk)[] = [];
		ArrAy.from(result).forEAch(([key, folderTAsks]) => {
			if (folderTAsks.set) {
				tAsks.push(...folderTAsks.set.tAsks);
			}
			if (folderTAsks.configurAtions) {
				for (const configurAtion in folderTAsks.configurAtions.byIdentifier) {
					tAsks.push(folderTAsks.configurAtions.byIdentifier[configurAtion]);
				}
			}
		});
		return tAsks;
	}

	privAte dedupeConfiguredAndRecent(recentTAsks: (TAsk | ConfiguringTAsk)[], configuredTAsks: (TAsk | ConfiguringTAsk)[]): { configuredTAsks: (TAsk | ConfiguringTAsk)[], recentTAsks: (TAsk | ConfiguringTAsk)[] } {
		let dedupedConfiguredTAsks: (TAsk | ConfiguringTAsk)[] = [];
		const foundRecentTAsks: booleAn[] = ArrAy(recentTAsks.length).fill(fAlse);
		for (let j = 0; j < configuredTAsks.length; j++) {
			const workspAceFolder = configuredTAsks[j].getWorkspAceFolder()?.uri.toString();
			const definition = configuredTAsks[j].getDefinition()?._key;
			const type = configuredTAsks[j].type;
			const lAbel = configuredTAsks[j]._lAbel;
			const recentKey = configuredTAsks[j].getRecentlyUsedKey();
			const findIndex = recentTAsks.findIndex((vAlue) => {
				return (workspAceFolder && definition && vAlue.getWorkspAceFolder()?.uri.toString() === workspAceFolder
					&& ((vAlue.getDefinition()?._key === definition) || (vAlue.type === type && vAlue._lAbel === lAbel)))
					|| (recentKey && vAlue.getRecentlyUsedKey() === recentKey);
			});
			if (findIndex === -1) {
				dedupedConfiguredTAsks.push(configuredTAsks[j]);
			} else {
				recentTAsks[findIndex] = configuredTAsks[j];
				foundRecentTAsks[findIndex] = true;
			}
		}
		dedupedConfiguredTAsks = dedupedConfiguredTAsks.sort((A, b) => this.sorter.compAre(A, b));
		const prunedRecentTAsks: (TAsk | ConfiguringTAsk)[] = [];
		for (let i = 0; i < recentTAsks.length; i++) {
			if (foundRecentTAsks[i] || ConfiguringTAsk.is(recentTAsks[i])) {
				prunedRecentTAsks.push(recentTAsks[i]);
			}
		}
		return { configuredTAsks: dedupedConfiguredTAsks, recentTAsks: prunedRecentTAsks };
	}

	public Async getTopLevelEntries(defAultEntry?: TAskQuickPickEntry): Promise<{ entries: QuickPickInput<TAskTwoLevelQuickPickEntry>[], isSingleConfigured?: TAsk | ConfiguringTAsk }> {
		if (this.topLevelEntries !== undefined) {
			return { entries: this.topLevelEntries };
		}
		let recentTAsks: (TAsk | ConfiguringTAsk)[] = (AwAit this.tAskService.reAdRecentTAsks()).reverse();
		const configuredTAsks: (TAsk | ConfiguringTAsk)[] = this.hAndleFolderTAskResult(AwAit this.tAskService.getWorkspAceTAsks());
		const extensionTAskTypes = this.tAskService.tAskTypes();
		this.topLevelEntries = [];
		// Dedupe will updAte recent tAsks if they've chAnged in tAsks.json.
		const dedupeAndPrune = this.dedupeConfiguredAndRecent(recentTAsks, configuredTAsks);
		let dedupedConfiguredTAsks: (TAsk | ConfiguringTAsk)[] = dedupeAndPrune.configuredTAsks;
		recentTAsks = dedupeAndPrune.recentTAsks;
		if (recentTAsks.length > 0) {
			this.creAteEntriesForGroup(this.topLevelEntries, recentTAsks, nls.locAlize('recentlyUsed', 'recently used'));
		}
		if (configuredTAsks.length > 0) {
			if (dedupedConfiguredTAsks.length > 0) {
				this.creAteEntriesForGroup(this.topLevelEntries, dedupedConfiguredTAsks, nls.locAlize('configured', 'configured'));
			}
		}

		if (defAultEntry && (configuredTAsks.length === 0)) {
			this.topLevelEntries.push({ type: 'sepArAtor', lAbel: nls.locAlize('configured', 'configured') });
			this.topLevelEntries.push(defAultEntry);
		}

		if (extensionTAskTypes.length > 0) {
			this.creAteTypeEntries(this.topLevelEntries, extensionTAskTypes);
		}
		return { entries: this.topLevelEntries, isSingleConfigured: configuredTAsks.length === 1 ? configuredTAsks[0] : undefined };
	}

	public Async show(plAceHolder: string, defAultEntry?: TAskQuickPickEntry, stArtAtType?: string): Promise<TAsk | undefined | null> {
		const picker: IQuickPick<TAskTwoLevelQuickPickEntry> = this.quickInputService.creAteQuickPick();
		picker.plAceholder = plAceHolder;
		picker.mAtchOnDescription = true;
		picker.ignoreFocusOut = fAlse;
		picker.show();

		picker.onDidTriggerItemButton(Async (context) => {
			let tAsk = context.item.tAsk;
			this.quickInputService.cAncel();
			if (ContributedTAsk.is(tAsk)) {
				this.tAskService.customize(tAsk, undefined, true);
			} else if (CustomTAsk.is(tAsk) || ConfiguringTAsk.is(tAsk)) {
				if (!(AwAit this.tAskService.openConfig(tAsk))) {
					this.tAskService.customize(tAsk, undefined, true);
				}
			}
		});

		let firstLevelTAsk: TAsk | ConfiguringTAsk | string | undefined | null = stArtAtType;
		if (!firstLevelTAsk) {
			// First show recent tAsks configured tAsks. Other tAsks will be AvAilAble At A second level
			const topLevelEntriesResult = AwAit this.getTopLevelEntries(defAultEntry);
			if (topLevelEntriesResult.isSingleConfigured && this.configurAtionService.getVAlue<booleAn>(QUICKOPEN_SKIP_CONFIG)) {
				picker.dispose();
				return this.toTAsk(topLevelEntriesResult.isSingleConfigured);
			}
			const tAskQuickPickEntries: QuickPickInput<TAskTwoLevelQuickPickEntry>[] = topLevelEntriesResult.entries;
			firstLevelTAsk = AwAit this.doPickerFirstLevel(picker, tAskQuickPickEntries);
		}
		do {
			if (Types.isString(firstLevelTAsk)) {
				// Proceed to second level of quick pick
				const selectedEntry = AwAit this.doPickerSecondLevel(picker, firstLevelTAsk);
				if (selectedEntry && selectedEntry.tAsk === null) {
					// The user hAs chosen to go bAck to the first level
					firstLevelTAsk = AwAit this.doPickerFirstLevel(picker, (AwAit this.getTopLevelEntries(defAultEntry)).entries);
				} else {
					picker.dispose();
					return (selectedEntry?.tAsk && !Types.isString(selectedEntry?.tAsk)) ? this.toTAsk(selectedEntry?.tAsk) : undefined;
				}
			} else if (firstLevelTAsk) {
				picker.dispose();
				return this.toTAsk(firstLevelTAsk);
			} else {
				picker.dispose();
				return firstLevelTAsk;
			}
		} while (1);
		return;
	}

	privAte Async doPickerFirstLevel(picker: IQuickPick<TAskTwoLevelQuickPickEntry>, tAskQuickPickEntries: QuickPickInput<TAskTwoLevelQuickPickEntry>[]): Promise<TAsk | ConfiguringTAsk | string | null | undefined> {
		picker.items = tAskQuickPickEntries;
		const firstLevelPickerResult = AwAit new Promise<TAskTwoLevelQuickPickEntry | undefined | null>(resolve => {
			Event.once(picker.onDidAccept)(Async () => {
				resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
			});
		});
		return firstLevelPickerResult?.tAsk;
	}

	privAte Async doPickerSecondLevel(picker: IQuickPick<TAskTwoLevelQuickPickEntry>, type: string) {
		picker.busy = true;
		picker.vAlue = '';
		if (type === SHOW_ALL) {
			picker.items = (AwAit this.tAskService.tAsks()).sort((A, b) => this.sorter.compAre(A, b)).mAp(tAsk => this.creAteTAskEntry(tAsk));
		} else {
			picker.items = AwAit this.getEntriesForProvider(type);
		}
		picker.busy = fAlse;
		const secondLevelPickerResult = AwAit new Promise<TAskTwoLevelQuickPickEntry | undefined | null>(resolve => {
			Event.once(picker.onDidAccept)(Async () => {
				resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
			});
		});

		return secondLevelPickerResult;
	}

	privAte Async getEntriesForProvider(type: string): Promise<QuickPickInput<TAskTwoLevelQuickPickEntry>[]> {
		const tAsks = (AwAit this.tAskService.tAsks({ type })).sort((A, b) => this.sorter.compAre(A, b));
		let tAskQuickPickEntries: QuickPickInput<TAskTwoLevelQuickPickEntry>[];
		if (tAsks.length > 0) {
			tAskQuickPickEntries = tAsks.mAp(tAsk => this.creAteTAskEntry(tAsk));
			tAskQuickPickEntries.push({
				type: 'sepArAtor'
			}, {
				lAbel: nls.locAlize('TAskQuickPick.goBAck', 'Go bAck ↩'),
				tAsk: null,
				AlwAysShow: true
			});
		} else {
			tAskQuickPickEntries = [{
				lAbel: nls.locAlize('TAskQuickPick.noTAsksForType', 'No {0} tAsks found. Go bAck ↩', type),
				tAsk: null,
				AlwAysShow: true
			}];
		}
		return tAskQuickPickEntries;
	}

	privAte Async toTAsk(tAsk: TAsk | ConfiguringTAsk): Promise<TAsk | undefined> {
		if (!ConfiguringTAsk.is(tAsk)) {
			return tAsk;
		}

		const resolvedTAsk = AwAit this.tAskService.tryResolveTAsk(tAsk);

		if (!resolvedTAsk) {
			this.notificAtionService.error(nls.locAlize('noProviderForTAsk', "There is no tAsk provider registered for tAsks of type \"{0}\".", tAsk.type));
		}
		return resolvedTAsk;
	}

	stAtic Async show(tAskService: ITAskService, configurAtionService: IConfigurAtionService, quickInputService: IQuickInputService, notificAtionService: INotificAtionService, plAceHolder: string, defAultEntry?: TAskQuickPickEntry) {
		const tAskQuickPick = new TAskQuickPick(tAskService, configurAtionService, quickInputService, notificAtionService);
		return tAskQuickPick.show(plAceHolder, defAultEntry);
	}
}
