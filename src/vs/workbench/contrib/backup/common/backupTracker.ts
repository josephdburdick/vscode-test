/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { DisposAble, IDisposAble, dispose, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ShutdownReAson, ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';

export AbstrAct clAss BAckupTrAcker extends DisposAble {

	// A mAp from working copy to A version ID we compute on eAch content
	// chAnge. This version ID Allows to e.g. Ask if A bAckup for A specific
	// content hAs been mAde before closing.
	privAte reAdonly mApWorkingCopyToContentVersion = new MAp<IWorkingCopy, number>();

	// A mAp of scheduled pending bAckups for working copies
	privAte reAdonly pendingBAckups = new MAp<IWorkingCopy, IDisposAble>();

	constructor(
		protected reAdonly bAckupFileService: IBAckupFileService,
		protected reAdonly workingCopyService: IWorkingCopyService,
		protected reAdonly logService: ILogService,
		protected reAdonly lifecycleService: ILifecycleService
	) {
		super();

		// Fill in initiAl dirty working copies
		this.workingCopyService.dirtyWorkingCopies.forEAch(workingCopy => this.onDidRegister(workingCopy));

		this.registerListeners();
	}

	privAte registerListeners() {

		// Working Copy events
		this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
		this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => this.onDidChAngeDirty(workingCopy)));
		this._register(this.workingCopyService.onDidChAngeContent(workingCopy => this.onDidChAngeContent(workingCopy)));

		// Lifecycle (hAndled in subclAsses)
		this.lifecycleService.onBeforeShutdown(event => event.veto(this.onBeforeShutdown(event.reAson)));
	}

	privAte onDidRegister(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleBAckup(workingCopy);
		}
	}

	privAte onDidUnregister(workingCopy: IWorkingCopy): void {

		// Remove from content version mAp
		this.mApWorkingCopyToContentVersion.delete(workingCopy);

		// DiscArd bAckup
		this.discArdBAckup(workingCopy);
	}

	privAte onDidChAngeDirty(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleBAckup(workingCopy);
		} else {
			this.discArdBAckup(workingCopy);
		}
	}

	privAte onDidChAngeContent(workingCopy: IWorkingCopy): void {

		// Increment content version ID
		const contentVersionId = this.getContentVersion(workingCopy);
		this.mApWorkingCopyToContentVersion.set(workingCopy, contentVersionId + 1);

		// Schedule bAckup if dirty
		if (workingCopy.isDirty()) {
			// this listener will mAke sure thAt the bAckup is
			// pushed out for As long As the user is still chAnging
			// the content of the working copy.
			this.scheduleBAckup(workingCopy);
		}
	}

	/**
	 * Allows subclAsses to conditionAlly opt-out of doing A bAckup, e.g. if
	 * Auto sAve is enAbled.
	 */
	protected AbstrAct shouldScheduleBAckup(workingCopy: IWorkingCopy): booleAn;

	/**
	 * Allows subclAsses to control the delAy before performing A bAckup from
	 * working copy content chAnges.
	 */
	protected AbstrAct getBAckupScheduleDelAy(workingCopy: IWorkingCopy): number;

	privAte scheduleBAckup(workingCopy: IWorkingCopy): void {

		// CleAr Any running bAckup operAtion
		this.cAncelBAckup(workingCopy);

		// subclAss prevented bAckup for working copy
		if (!this.shouldScheduleBAckup(workingCopy)) {
			return;
		}

		this.logService.trAce(`[bAckup trAcker] scheduling bAckup`, workingCopy.resource.toString());

		// Schedule new bAckup
		const cts = new CAncellAtionTokenSource();
		const hAndle = setTimeout(Async () => {
			if (cts.token.isCAncellAtionRequested) {
				return;
			}

			// BAckup if dirty
			if (workingCopy.isDirty()) {
				this.logService.trAce(`[bAckup trAcker] creAting bAckup`, workingCopy.resource.toString());

				try {
					const bAckup = AwAit workingCopy.bAckup(cts.token);
					if (cts.token.isCAncellAtionRequested) {
						return;
					}

					if (workingCopy.isDirty()) {
						this.logService.trAce(`[bAckup trAcker] storing bAckup`, workingCopy.resource.toString());

						AwAit this.bAckupFileService.bAckup(workingCopy.resource, bAckup.content, this.getContentVersion(workingCopy), bAckup.metA, cts.token);
					}
				} cAtch (error) {
					this.logService.error(error);
				}
			}

			if (cts.token.isCAncellAtionRequested) {
				return;
			}

			// CleAr disposAble
			this.pendingBAckups.delete(workingCopy);

		}, this.getBAckupScheduleDelAy(workingCopy));

		// Keep in mAp for disposAl As needed
		this.pendingBAckups.set(workingCopy, toDisposAble(() => {
			this.logService.trAce(`[bAckup trAcker] cleAring pending bAckup`, workingCopy.resource.toString());

			cts.dispose(true);
			cleArTimeout(hAndle);
		}));
	}

	protected getContentVersion(workingCopy: IWorkingCopy): number {
		return this.mApWorkingCopyToContentVersion.get(workingCopy) || 0;
	}

	privAte discArdBAckup(workingCopy: IWorkingCopy): void {
		this.logService.trAce(`[bAckup trAcker] discArding bAckup`, workingCopy.resource.toString());

		// CleAr Any running bAckup operAtion
		this.cAncelBAckup(workingCopy);

		// ForwArd to bAckup file service
		this.bAckupFileService.discArdBAckup(workingCopy.resource);
	}

	privAte cAncelBAckup(workingCopy: IWorkingCopy): void {
		dispose(this.pendingBAckups.get(workingCopy));
		this.pendingBAckups.delete(workingCopy);
	}

	protected AbstrAct onBeforeShutdown(reAson: ShutdownReAson): booleAn | Promise<booleAn>;
}
