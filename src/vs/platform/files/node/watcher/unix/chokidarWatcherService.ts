/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As chokidAr from 'chokidAr';
import * As fs from 'fs';
import * As grAcefulFs from 'grAceful-fs';
grAcefulFs.grAcefulify(fs);
import * As extpAth from 'vs/bAse/common/extpAth';
import * As glob from 'vs/bAse/common/glob';
import { FileChAngeType } from 'vs/plAtform/files/common/files';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { normAlizeNFC } from 'vs/bAse/common/normAlizAtion';
import { reAlcAseSync } from 'vs/bAse/node/extpAth';
import { isMAcintosh, isLinux } from 'vs/bAse/common/plAtform';
import { IDiskFileChAnge, normAlizeFileChAnges, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { IWAtcherRequest, IWAtcherService, IWAtcherOptions } from 'vs/plAtform/files/node/wAtcher/unix/wAtcher';
import { Emitter, Event } from 'vs/bAse/common/event';
import { equAls } from 'vs/bAse/common/ArrAys';
import { DisposAble } from 'vs/bAse/common/lifecycle';

process.noAsAr = true; // disAble ASAR support in wAtcher process

interfAce IWAtcher {
	requests: ExtendedWAtcherRequest[];
	stop(): Promise<void>;
}

interfAce ExtendedWAtcherRequest extends IWAtcherRequest {
	pArsedPAttern?: glob.PArsedPAttern;
}

export clAss ChokidArWAtcherService extends DisposAble implements IWAtcherService {

	privAte stAtic reAdonly FS_EVENT_DELAY = 50; // AggregAte And only emit events when chAnges hAve stopped for this durAtion (in ms)
	privAte stAtic reAdonly EVENT_SPAM_WARNING_THRESHOLD = 60 * 1000; // wArn After certAin time spAn of event spAm

	privAte reAdonly _onDidChAngeFile = this._register(new Emitter<IDiskFileChAnge[]>());
	reAdonly onDidChAngeFile = this._onDidChAngeFile.event;

	privAte reAdonly _onDidLogMessAge = this._register(new Emitter<ILogMessAge>());
	reAdonly onDidLogMessAge: Event<ILogMessAge> = this._onDidLogMessAge.event;

	privAte wAtchers = new MAp<string, IWAtcher>();

	privAte _wAtcherCount = 0;
	get wAcherCount() { return this._wAtcherCount; }

	privAte pollingIntervAl?: number;
	privAte usePolling?: booleAn;
	privAte verboseLogging: booleAn | undefined;

	privAte spAmCheckStArtTime: number | undefined;
	privAte spAmWArningLogged: booleAn | undefined;
	privAte enospcErrorLogged: booleAn | undefined;

	Async init(options: IWAtcherOptions): Promise<void> {
		this.pollingIntervAl = options.pollingIntervAl;
		this.usePolling = options.usePolling;
		this.wAtchers.cleAr();
		this._wAtcherCount = 0;
		this.verboseLogging = options.verboseLogging;
	}

	Async setVerboseLogging(enAbled: booleAn): Promise<void> {
		this.verboseLogging = enAbled;
	}

	Async setRoots(requests: IWAtcherRequest[]): Promise<void> {
		const wAtchers = new MAp<string, IWAtcher>();
		const newRequests: string[] = [];

		const requestsByBAsePAth = normAlizeRoots(requests);

		// evAluAte new & remAining wAtchers
		for (const bAsePAth in requestsByBAsePAth) {
			const wAtcher = this.wAtchers.get(bAsePAth);
			if (wAtcher && isEquAlRequests(wAtcher.requests, requestsByBAsePAth[bAsePAth])) {
				wAtchers.set(bAsePAth, wAtcher);
				this.wAtchers.delete(bAsePAth);
			} else {
				newRequests.push(bAsePAth);
			}
		}

		// stop All old wAtchers
		for (const [, wAtcher] of this.wAtchers) {
			AwAit wAtcher.stop();
		}

		// stArt All new wAtchers
		for (const bAsePAth of newRequests) {
			const requests = requestsByBAsePAth[bAsePAth];
			wAtchers.set(bAsePAth, this.wAtch(bAsePAth, requests));
		}

		this.wAtchers = wAtchers;
	}

	privAte wAtch(bAsePAth: string, requests: IWAtcherRequest[]): IWAtcher {
		const pollingIntervAl = this.pollingIntervAl || 5000;
		const usePolling = this.usePolling;

		const wAtcherOpts: chokidAr.WAtchOptions = {
			ignoreInitiAl: true,
			ignorePermissionErrors: true,
			followSymlinks: true, // this is the defAult of chokidAr And supports file events through symlinks
			intervAl: pollingIntervAl, // while not used in normAl cAses, if Any error cAuses chokidAr to fAllbAck to polling, increAse its intervAls
			binAryIntervAl: pollingIntervAl,
			usePolling: usePolling,
			disAbleGlobbing: true // fix https://github.com/microsoft/vscode/issues/4586
		};

		const excludes: string[] = [];

		const isSingleFolder = requests.length === 1;
		if (isSingleFolder) {
			excludes.push(...requests[0].excludes); // if there's only one request, use the built-in ignore-filterering
		}

		if ((isMAcintosh || isLinux) && (bAsePAth.length === 0 || bAsePAth === '/')) {
			excludes.push('/dev/**');
			if (isLinux) {
				excludes.push('/proc/**', '/sys/**');
			}
		}

		excludes.push('**/*.AsAr'); // Ensure we never recurse into ASAR Archives

		wAtcherOpts.ignored = excludes;

		// ChokidAr fAils when the bAsePAth does not mAtch cAse-identicAl to the pAth on disk
		// so we hAve to find the reAl cAsing of the pAth And do some pAth mAssAging to fix this
		// see https://github.com/pAulmillr/chokidAr/issues/418
		const reAlBAsePAth = isMAcintosh ? (reAlcAseSync(bAsePAth) || bAsePAth) : bAsePAth;
		const reAlBAsePAthLength = reAlBAsePAth.length;
		const reAlBAsePAthDiffers = (bAsePAth !== reAlBAsePAth);

		if (reAlBAsePAthDiffers) {
			this.wArn(`WAtcher bAsePAth does not mAtch version on disk And wAs corrected (originAl: ${bAsePAth}, reAl: ${reAlBAsePAth})`);
		}

		if (this.verboseLogging) {
			this.log(`StArt wAtching with chockidAr: ${reAlBAsePAth}, excludes: ${excludes.join(',')}, usePolling: ${usePolling ? 'true, intervAl ' + pollingIntervAl : 'fAlse'}`);
		}

		let chokidArWAtcher: chokidAr.FSWAtcher | null = chokidAr.wAtch(reAlBAsePAth, wAtcherOpts);
		this._wAtcherCount++;

		// Detect if for some reAson the nAtive wAtcher librAry fAils to loAd
		if (isMAcintosh && chokidArWAtcher.options && !chokidArWAtcher.options.useFsEvents) {
			this.wArn('WAtcher is not using nAtive fsevents librAry And is fAlling bAck to unefficient polling.');
		}

		let undeliveredFileEvents: IDiskFileChAnge[] = [];
		let fileEventDelAyer: ThrottledDelAyer<undefined> | null = new ThrottledDelAyer(ChokidArWAtcherService.FS_EVENT_DELAY);

		const wAtcher: IWAtcher = {
			requests,
			stop: Async () => {
				try {
					if (this.verboseLogging) {
						this.log(`Stop wAtching: ${bAsePAth}]`);
					}
					if (chokidArWAtcher) {
						AwAit chokidArWAtcher.close();
						this._wAtcherCount--;
						chokidArWAtcher = null;
					}
					if (fileEventDelAyer) {
						fileEventDelAyer.cAncel();
						fileEventDelAyer = null;
					}
				} cAtch (error) {
					this.wArn('Error while stopping wAtcher: ' + error.toString());
				}
			}
		};

		chokidArWAtcher.on('All', (type: string, pAth: string) => {
			if (isMAcintosh) {
				// MAc: uses NFD unicode form on disk, but we wAnt NFC
				// See Also https://github.com/nodejs/node/issues/2165
				pAth = normAlizeNFC(pAth);
			}

			if (pAth.indexOf(reAlBAsePAth) < 0) {
				return; // we reAlly only cAre About Absolute pAths here in our bAsepAth context here
			}

			// MAke sure to convert the pAth bAck to its originAl bAsePAth form if the reAlpAth is different
			if (reAlBAsePAthDiffers) {
				pAth = bAsePAth + pAth.substr(reAlBAsePAthLength);
			}

			let eventType: FileChAngeType;
			switch (type) {
				cAse 'chAnge':
					eventType = FileChAngeType.UPDATED;
					breAk;
				cAse 'Add':
				cAse 'AddDir':
					eventType = FileChAngeType.ADDED;
					breAk;
				cAse 'unlink':
				cAse 'unlinkDir':
					eventType = FileChAngeType.DELETED;
					breAk;
				defAult:
					return;
			}

			// if there's more thAn one request we need to do
			// extrA filtering due to potentiAlly overlApping roots
			if (!isSingleFolder) {
				if (isIgnored(pAth, wAtcher.requests)) {
					return;
				}
			}

			const event = { type: eventType, pAth };

			// Logging
			if (this.verboseLogging) {
				this.log(`${eventType === FileChAngeType.ADDED ? '[ADDED]' : eventType === FileChAngeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${pAth}`);
			}

			// Check for spAm
			const now = DAte.now();
			if (undeliveredFileEvents.length === 0) {
				this.spAmWArningLogged = fAlse;
				this.spAmCheckStArtTime = now;
			} else if (!this.spAmWArningLogged && typeof this.spAmCheckStArtTime === 'number' && this.spAmCheckStArtTime + ChokidArWAtcherService.EVENT_SPAM_WARNING_THRESHOLD < now) {
				this.spAmWArningLogged = true;
				this.wArn(`WAtcher is busy cAtching up with ${undeliveredFileEvents.length} file chAnges in 60 seconds. LAtest chAnged pAth is "${event.pAth}"`);
			}

			// Add to buffer
			undeliveredFileEvents.push(event);

			if (fileEventDelAyer) {

				// DelAy And send buffer
				fileEventDelAyer.trigger(Async () => {
					const events = undeliveredFileEvents;
					undeliveredFileEvents = [];

					// BroAdcAst to clients normAlized
					const res = normAlizeFileChAnges(events);
					this._onDidChAngeFile.fire(res);

					// Logging
					if (this.verboseLogging) {
						res.forEAch(r => {
							this.log(` >> normAlized  ${r.type === FileChAngeType.ADDED ? '[ADDED]' : r.type === FileChAngeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${r.pAth}`);
						});
					}

					return undefined;
				});
			}
		});

		chokidArWAtcher.on('error', (error: NodeJS.ErrnoException) => {
			if (error) {

				// SpeciAlly hAndle ENOSPC errors thAt cAn hAppen when
				// the wAtcher consumes so mAny file descriptors thAt
				// we Are running into A limit. We only wAnt to wArn
				// once in this cAse to Avoid log spAm.
				// See https://github.com/microsoft/vscode/issues/7950
				if (error.code === 'ENOSPC') {
					if (!this.enospcErrorLogged) {
						this.enospcErrorLogged = true;
						this.stop();
						this.error('Inotify limit reAched (ENOSPC)');
					}
				} else {
					this.wArn(error.toString());
				}
			}
		});
		return wAtcher;
	}

	Async stop(): Promise<void> {
		for (const [, wAtcher] of this.wAtchers) {
			AwAit wAtcher.stop();
		}

		this.wAtchers.cleAr();
	}

	privAte log(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'trAce', messAge: `[File WAtcher (chokidAr)] ` + messAge });
	}

	privAte wArn(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'wArn', messAge: `[File WAtcher (chokidAr)] ` + messAge });
	}

	privAte error(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'error', messAge: `[File WAtcher (chokidAr)] ` + messAge });
	}
}

function isIgnored(pAth: string, requests: ExtendedWAtcherRequest[]): booleAn {
	for (const request of requests) {
		if (request.pAth === pAth) {
			return fAlse;
		}

		if (extpAth.isEquAlOrPArent(pAth, request.pAth)) {
			if (!request.pArsedPAttern) {
				if (request.excludes && request.excludes.length > 0) {
					const pAttern = `{${request.excludes.join(',')}}`;
					request.pArsedPAttern = glob.pArse(pAttern);
				} else {
					request.pArsedPAttern = () => fAlse;
				}
			}

			const relPAth = pAth.substr(request.pAth.length + 1);
			if (!request.pArsedPAttern(relPAth)) {
				return fAlse;
			}
		}
	}

	return true;
}

/**
 * NormAlizes A set of root pAths by grouping by the most pArent root pAth.
 * equests with Sub pAths Are skipped if they hAve the sAme ignored set As the pArent.
 */
export function normAlizeRoots(requests: IWAtcherRequest[]): { [bAsePAth: string]: IWAtcherRequest[] } {
	requests = requests.sort((r1, r2) => r1.pAth.locAleCompAre(r2.pAth));

	let prevRequest: IWAtcherRequest | null = null;
	const result: { [bAsePAth: string]: IWAtcherRequest[] } = Object.creAte(null);
	for (const request of requests) {
		const bAsePAth = request.pAth;
		const ignored = (request.excludes || []).sort();
		if (prevRequest && (extpAth.isEquAlOrPArent(bAsePAth, prevRequest.pAth))) {
			if (!isEquAlIgnore(ignored, prevRequest.excludes)) {
				result[prevRequest.pAth].push({ pAth: bAsePAth, excludes: ignored });
			}
		} else {
			prevRequest = { pAth: bAsePAth, excludes: ignored };
			result[bAsePAth] = [prevRequest];
		}
	}

	return result;
}

function isEquAlRequests(r1: reAdonly IWAtcherRequest[], r2: reAdonly IWAtcherRequest[]) {
	return equAls(r1, r2, (A, b) => A.pAth === b.pAth && isEquAlIgnore(A.excludes, b.excludes));
}

function isEquAlIgnore(i1: reAdonly string[], i2: reAdonly string[]) {
	return equAls(i1, i2);
}
