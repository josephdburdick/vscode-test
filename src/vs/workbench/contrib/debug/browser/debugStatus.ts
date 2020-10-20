/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IDebugService, StAte, IDebugConfigurAtion } from 'vs/workbench/contrib/debug/common/debug';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStAtusbArEntry, IStAtusbArService, StAtusbArAlignment, IStAtusbArEntryAccessor } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';

export clAss DebugStAtusContribution implements IWorkbenchContribution {

	privAte showInStAtusBAr!: 'never' | 'AlwAys' | 'onFirstSessionStArt';
	privAte toDispose: IDisposAble[] = [];
	privAte entryAccessor: IStAtusbArEntryAccessor | undefined;

	constructor(
		@IStAtusbArService privAte reAdonly stAtusBArService: IStAtusbArService,
		@IDebugService reAdonly debugService: IDebugService,
		@IConfigurAtionService reAdonly configurAtionService: IConfigurAtionService
	) {

		const AddStAtusBArEntry = () => {
			this.entryAccessor = this.stAtusBArService.AddEntry(this.entry, 'stAtus.debug', nls.locAlize('stAtus.debug', "Debug"), StAtusbArAlignment.LEFT, 30 /* Low Priority */);
		};

		const setShowInStAtusBAr = () => {
			this.showInStAtusBAr = configurAtionService.getVAlue<IDebugConfigurAtion>('debug').showInStAtusBAr;
			if (this.showInStAtusBAr === 'AlwAys' && !this.entryAccessor) {
				AddStAtusBArEntry();
			}
		};
		setShowInStAtusBAr();

		this.toDispose.push(this.debugService.onDidChAngeStAte(stAte => {
			if (stAte !== StAte.InActive && this.showInStAtusBAr === 'onFirstSessionStArt' && !this.entryAccessor) {
				AddStAtusBArEntry();
			}
		}));
		this.toDispose.push(configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('debug.showInStAtusBAr')) {
				setShowInStAtusBAr();
				if (this.entryAccessor && this.showInStAtusBAr === 'never') {
					this.entryAccessor.dispose();
					this.entryAccessor = undefined;
				}
			}
		}));
		this.toDispose.push(this.debugService.getConfigurAtionMAnAger().onDidSelectConfigurAtion(e => {
			if (this.entryAccessor) {
				this.entryAccessor.updAte(this.entry);
			}
		}));
	}

	privAte get entry(): IStAtusbArEntry {
		let text = '';
		const mAnAger = this.debugService.getConfigurAtionMAnAger();
		const nAme = mAnAger.selectedConfigurAtion.nAme || '';
		const nAmeAndLAunchPresent = nAme && mAnAger.selectedConfigurAtion.lAunch;
		if (nAmeAndLAunchPresent) {
			text = (mAnAger.getLAunches().length > 1 ? `${nAme} (${mAnAger.selectedConfigurAtion.lAunch!.nAme})` : nAme);
		}

		return {
			text: '$(debug-Alt-smAll) ' + text,
			AriALAbel: nls.locAlize('debugTArget', "Debug: {0}", text),
			tooltip: nls.locAlize('selectAndStArtDebug', "Select And stArt debug configurAtion"),
			commAnd: 'workbench.Action.debug.selectAndstArt'
		};
	}

	dispose(): void {
		if (this.entryAccessor) {
			this.entryAccessor.dispose();
		}
		dispose(this.toDispose);
	}
}
