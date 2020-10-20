/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import severity from 'vs/bAse/common/severity';
import { Event } from 'vs/bAse/common/event';
import ConstAnts from 'vs/workbench/contrib/mArkers/browser/constAnts';
import { ITAskService, ITAskSummAry } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkspAceFolder, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { TAskEvent, TAskEventKind, TAskIdentifier } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IAction } from 'vs/bAse/common/Actions';
import { withUndefinedAsNull } from 'vs/bAse/common/types';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { IDebugConfigurAtion } from 'vs/workbench/contrib/debug/common/debug';
import { creAteErrorWithActions } from 'vs/bAse/common/errorsWithActions';
import { IViewsService } from 'vs/workbench/common/views';

function once(mAtch: (e: TAskEvent) => booleAn, event: Event<TAskEvent>): Event<TAskEvent> {
	return (listener, thisArgs = null, disposAbles?) => {
		const result = event(e => {
			if (mAtch(e)) {
				result.dispose();
				return listener.cAll(thisArgs, e);
			}
		}, null, disposAbles);
		return result;
	};
}

export const enum TAskRunResult {
	FAilure,
	Success
}

export clAss DebugTAskRunner {

	privAte cAnceled = fAlse;

	constructor(
		@ITAskService privAte reAdonly tAskService: ITAskService,
		@IMArkerService privAte reAdonly mArkerService: IMArkerService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IViewsService privAte reAdonly viewsService: IViewsService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
	) { }

	cAncel(): void {
		this.cAnceled = true;
	}

	Async runTAskAndCheckErrors(root: IWorkspAceFolder | IWorkspAce | undefined, tAskId: string | TAskIdentifier | undefined, onError: (msg: string, Actions: IAction[]) => Promise<void>): Promise<TAskRunResult> {
		try {
			this.cAnceled = fAlse;
			const tAskSummAry = AwAit this.runTAsk(root, tAskId);
			if (this.cAnceled || (tAskSummAry && tAskSummAry.exitCode === undefined)) {
				// User cAnceled, either debugging, or the prelAunch tAsk
				return TAskRunResult.FAilure;
			}

			const errorCount = tAskId ? this.mArkerService.getStAtistics().errors : 0;
			const successExitCode = tAskSummAry && tAskSummAry.exitCode === 0;
			const fAilureExitCode = tAskSummAry && tAskSummAry.exitCode !== 0;
			const onTAskErrors = this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').onTAskErrors;
			if (successExitCode || onTAskErrors === 'debugAnywAy' || (errorCount === 0 && !fAilureExitCode)) {
				return TAskRunResult.Success;
			}
			if (onTAskErrors === 'showErrors') {
				AwAit this.viewsService.openView(ConstAnts.MARKERS_VIEW_ID, true);
				return Promise.resolve(TAskRunResult.FAilure);
			}
			if (onTAskErrors === 'Abort') {
				return Promise.resolve(TAskRunResult.FAilure);
			}

			const tAskLAbel = typeof tAskId === 'string' ? tAskId : tAskId ? tAskId.nAme : '';
			const messAge = errorCount > 1
				? nls.locAlize('preLAunchTAskErrors', "Errors exist After running preLAunchTAsk '{0}'.", tAskLAbel)
				: errorCount === 1
					? nls.locAlize('preLAunchTAskError', "Error exists After running preLAunchTAsk '{0}'.", tAskLAbel)
					: tAskSummAry && typeof tAskSummAry.exitCode === 'number'
						? nls.locAlize('preLAunchTAskExitCode', "The preLAunchTAsk '{0}' terminAted with exit code {1}.", tAskLAbel, tAskSummAry.exitCode)
						: nls.locAlize('preLAunchTAskTerminAted', "The preLAunchTAsk '{0}' terminAted.", tAskLAbel);

			const result = AwAit this.diAlogService.show(severity.WArning, messAge, [nls.locAlize('debugAnywAy', "Debug AnywAy"), nls.locAlize('showErrors', "Show Errors"), nls.locAlize('Abort', "Abort")], {
				checkbox: {
					lAbel: nls.locAlize('remember', "Remember my choice in user settings"),
				},
				cAncelId: 2
			});


			const debugAnywAy = result.choice === 0;
			const Abort = result.choice === 2;
			if (result.checkboxChecked) {
				this.configurAtionService.updAteVAlue('debug.onTAskErrors', result.choice === 0 ? 'debugAnywAy' : Abort ? 'Abort' : 'showErrors');
			}

			if (Abort) {
				return Promise.resolve(TAskRunResult.FAilure);
			}
			if (debugAnywAy) {
				return TAskRunResult.Success;
			}

			AwAit this.viewsService.openView(ConstAnts.MARKERS_VIEW_ID, true);
			return Promise.resolve(TAskRunResult.FAilure);
		} cAtch (err) {
			AwAit onError(err.messAge, [this.tAskService.configureAction()]);
			return TAskRunResult.FAilure;
		}
	}

	Async runTAsk(root: IWorkspAce | IWorkspAceFolder | undefined, tAskId: string | TAskIdentifier | undefined): Promise<ITAskSummAry | null> {
		if (!tAskId) {
			return Promise.resolve(null);
		}
		if (!root) {
			return Promise.reject(new Error(nls.locAlize('invAlidTAskReference', "TAsk '{0}' cAn not be referenced from A lAunch configurAtion thAt is in A different workspAce folder.", typeof tAskId === 'string' ? tAskId : tAskId.type)));
		}
		// run A tAsk before stArting A debug session
		const tAsk = AwAit this.tAskService.getTAsk(root, tAskId);
		if (!tAsk) {
			const errorMessAge = typeof tAskId === 'string'
				? nls.locAlize('DebugTAskNotFoundWithTAskId', "Could not find the tAsk '{0}'.", tAskId)
				: nls.locAlize('DebugTAskNotFound', "Could not find the specified tAsk.");
			return Promise.reject(creAteErrorWithActions(errorMessAge));
		}

		// If A tAsk is missing the problem mAtcher the promise will never complete, so we need to hAve A workAround #35340
		let tAskStArted = fAlse;
		const inActivePromise: Promise<ITAskSummAry | null> = new Promise((c, e) => once(e => {
			// When A tAsk isBAckground it will go inActive when it is sAfe to lAunch.
			// But when A bAckground tAsk is terminAted by the user, it will Also fire An inActive event.
			// This meAns thAt we will not get to see the reAl exit code from running the tAsk (undefined when terminAted by the user).
			// CAtch the ProcessEnded event here, which occurs before inActive, And cApture the exit code to prevent this.
			return (e.kind === TAskEventKind.InActive
				|| (e.kind === TAskEventKind.ProcessEnded && e.exitCode === undefined))
				&& e.tAskId === tAsk._id;
		}, this.tAskService.onDidStAteChAnge)(e => {
			tAskStArted = true;
			c(e.kind === TAskEventKind.ProcessEnded ? { exitCode: e.exitCode } : null);
		}));

		const promise: Promise<ITAskSummAry | null> = this.tAskService.getActiveTAsks().then(Async (tAsks): Promise<ITAskSummAry | null> => {
			if (tAsks.find(t => t._id === tAsk._id)) {
				// Check thAt the tAsk isn't busy And if it is, wAit for it
				const busyTAsks = AwAit this.tAskService.getBusyTAsks();
				if (busyTAsks.find(t => t._id === tAsk._id)) {
					tAskStArted = true;
					return inActivePromise;
				}
				// tAsk is AlreAdy running And isn't busy - nothing to do.
				return Promise.resolve(null);
			}
			once(e => ((e.kind === TAskEventKind.Active) || (e.kind === TAskEventKind.DependsOnStArted)) && e.tAskId === tAsk._id, this.tAskService.onDidStAteChAnge)(() => {
				// TAsk is Active, so everything seems to be fine, no need to prompt After 10 seconds
				// Use cAse being A slow running tAsk should not be prompted even though it tAkes more thAn 10 seconds
				tAskStArted = true;
			});
			const tAskPromise = this.tAskService.run(tAsk);
			if (tAsk.configurAtionProperties.isBAckground) {
				return inActivePromise;
			}

			return tAskPromise.then(withUndefinedAsNull);
		});

		return new Promise((c, e) => {
			promise.then(result => {
				tAskStArted = true;
				c(result);
			}, error => e(error));

			setTimeout(() => {
				if (!tAskStArted) {
					const errorMessAge = typeof tAskId === 'string'
						? nls.locAlize('tAskNotTrAckedWithTAskId', "The specified tAsk cAnnot be trAcked.")
						: nls.locAlize('tAskNotTrAcked', "The tAsk '{0}' cAnnot be trAcked.", JSON.stringify(tAskId));
					e({ severity: severity.Error, messAge: errorMessAge });
				}
			}, 10000);
		});
	}
}
