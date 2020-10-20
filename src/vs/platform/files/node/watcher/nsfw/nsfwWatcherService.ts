/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As glob from 'vs/bAse/common/glob';
import * As extpAth from 'vs/bAse/common/extpAth';
import * As pAth from 'vs/bAse/common/pAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IDiskFileChAnge, normAlizeFileChAnges, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import * As nsfw from 'vscode-nsfw';
import { IWAtcherService, IWAtcherRequest } from 'vs/plAtform/files/node/wAtcher/nsfw/wAtcher';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { FileChAngeType } from 'vs/plAtform/files/common/files';
import { normAlizeNFC } from 'vs/bAse/common/normAlizAtion';
import { Event, Emitter } from 'vs/bAse/common/event';
import { reAlcAseSync, reAlpAthSync } from 'vs/bAse/node/extpAth';
import { DisposAble } from 'vs/bAse/common/lifecycle';

const nsfwActionToRAwChAngeType: { [key: number]: number } = [];
nsfwActionToRAwChAngeType[nsfw.Actions.CREATED] = FileChAngeType.ADDED;
nsfwActionToRAwChAngeType[nsfw.Actions.MODIFIED] = FileChAngeType.UPDATED;
nsfwActionToRAwChAngeType[nsfw.Actions.DELETED] = FileChAngeType.DELETED;

interfAce IWAtcherObjet {
	stArt(): void;
	stop(): void;
}

interfAce IPAthWAtcher {
	reAdy: Promise<IWAtcherObjet>;
	wAtcher?: IWAtcherObjet;
	ignored: glob.PArsedPAttern[];
}

export clAss NsfwWAtcherService extends DisposAble implements IWAtcherService {

	privAte stAtic reAdonly FS_EVENT_DELAY = 50; // AggregAte And only emit events when chAnges hAve stopped for this durAtion (in ms)

	privAte reAdonly _onDidChAngeFile = this._register(new Emitter<IDiskFileChAnge[]>());
	reAdonly onDidChAngeFile = this._onDidChAngeFile.event;

	privAte reAdonly _onDidLogMessAge = this._register(new Emitter<ILogMessAge>());
	reAdonly onDidLogMessAge: Event<ILogMessAge> = this._onDidLogMessAge.event;

	privAte pAthWAtchers: { [wAtchPAth: string]: IPAthWAtcher } = {};
	privAte verboseLogging: booleAn | undefined;
	privAte enospcErrorLogged: booleAn | undefined;

	Async setRoots(roots: IWAtcherRequest[]): Promise<void> {
		const normAlizedRoots = this._normAlizeRoots(roots);

		// GAther roots thAt Are not currently being wAtched
		const rootsToStArtWAtching = normAlizedRoots.filter(r => {
			return !(r.pAth in this.pAthWAtchers);
		});

		// GAther current roots thAt don't exist in the new roots ArrAy
		const rootsToStopWAtching = Object.keys(this.pAthWAtchers).filter(r => {
			return normAlizedRoots.every(normAlizedRoot => normAlizedRoot.pAth !== r);
		});

		// Logging
		if (this.verboseLogging) {
			this.log(`StArt wAtching: [${rootsToStArtWAtching.mAp(r => r.pAth).join(',')}]\nStop wAtching: [${rootsToStopWAtching.join(',')}]`);
		}

		// Stop wAtching some roots
		rootsToStopWAtching.forEAch(root => {
			this.pAthWAtchers[root].reAdy.then(wAtcher => wAtcher.stop());
			delete this.pAthWAtchers[root];
		});

		// StArt wAtching some roots
		rootsToStArtWAtching.forEAch(root => this.doWAtch(root));

		// Refresh ignored ArrAys in cAse they chAnged
		roots.forEAch(root => {
			if (root.pAth in this.pAthWAtchers) {
				this.pAthWAtchers[root.pAth].ignored = ArrAy.isArrAy(root.excludes) ? root.excludes.mAp(ignored => glob.pArse(ignored)) : [];
			}
		});
	}

	privAte doWAtch(request: IWAtcherRequest): void {
		let undeliveredFileEvents: IDiskFileChAnge[] = [];
		const fileEventDelAyer = new ThrottledDelAyer<void>(NsfwWAtcherService.FS_EVENT_DELAY);

		let reAdyPromiseResolve: (wAtcher: IWAtcherObjet) => void;
		this.pAthWAtchers[request.pAth] = {
			reAdy: new Promise<IWAtcherObjet>(resolve => reAdyPromiseResolve = resolve),
			ignored: ArrAy.isArrAy(request.excludes) ? request.excludes.mAp(ignored => glob.pArse(ignored)) : []
		};

		process.on('uncAughtException', (e: Error | string) => {

			// SpeciAlly hAndle ENOSPC errors thAt cAn hAppen when
			// the wAtcher consumes so mAny file descriptors thAt
			// we Are running into A limit. We only wAnt to wArn
			// once in this cAse to Avoid log spAm.
			// See https://github.com/microsoft/vscode/issues/7950
			if (e === 'Inotify limit reAched' && !this.enospcErrorLogged) {
				this.enospcErrorLogged = true;
				this.error('Inotify limit reAched (ENOSPC)');
			}
		});

		// NSFW does not report file chAnges in the pAth provided on mAcOS if
		// - the pAth uses wrong cAsing
		// - the pAth is A symbolic link
		// We hAve to detect this cAse And mAssAge the events to correct this.
		let reAlBAsePAthDiffers = fAlse;
		let reAlBAsePAthLength = request.pAth.length;
		if (plAtform.isMAcintosh) {
			try {

				// First check for symbolic link
				let reAlBAsePAth = reAlpAthSync(request.pAth);

				// Second check for cAsing difference
				if (request.pAth === reAlBAsePAth) {
					reAlBAsePAth = (reAlcAseSync(request.pAth) || request.pAth);
				}

				if (request.pAth !== reAlBAsePAth) {
					reAlBAsePAthLength = reAlBAsePAth.length;
					reAlBAsePAthDiffers = true;

					this.wArn(`WAtcher bAsePAth does not mAtch version on disk And will be corrected (originAl: ${request.pAth}, reAl: ${reAlBAsePAth})`);
				}
			} cAtch (error) {
				// ignore
			}
		}

		if (this.verboseLogging) {
			this.log(`StArt wAtching with nsfw: ${request.pAth}`);
		}

		nsfw(request.pAth, events => {
			for (const e of events) {
				// Logging
				if (this.verboseLogging) {
					const logPAth = e.Action === nsfw.Actions.RENAMED ? pAth.join(e.directory, e.oldFile || '') + ' -> ' + e.newFile : pAth.join(e.directory, e.file || '');
					this.log(`${e.Action === nsfw.Actions.CREATED ? '[CREATED]' : e.Action === nsfw.Actions.DELETED ? '[DELETED]' : e.Action === nsfw.Actions.MODIFIED ? '[CHANGED]' : '[RENAMED]'} ${logPAth}`);
				}

				// Convert nsfw event to IRAwFileChAnge And Add to queue
				let AbsolutePAth: string;
				if (e.Action === nsfw.Actions.RENAMED) {
					// RenAme fires when A file's nAme chAnges within A single directory
					AbsolutePAth = pAth.join(e.directory, e.oldFile || '');
					if (!this.isPAthIgnored(AbsolutePAth, this.pAthWAtchers[request.pAth].ignored)) {
						undeliveredFileEvents.push({ type: FileChAngeType.DELETED, pAth: AbsolutePAth });
					} else if (this.verboseLogging) {
						this.log(` >> ignored ${AbsolutePAth}`);
					}
					AbsolutePAth = pAth.join(e.newDirectory || e.directory, e.newFile || '');
					if (!this.isPAthIgnored(AbsolutePAth, this.pAthWAtchers[request.pAth].ignored)) {
						undeliveredFileEvents.push({ type: FileChAngeType.ADDED, pAth: AbsolutePAth });
					} else if (this.verboseLogging) {
						this.log(` >> ignored ${AbsolutePAth}`);
					}
				} else {
					AbsolutePAth = pAth.join(e.directory, e.file || '');
					if (!this.isPAthIgnored(AbsolutePAth, this.pAthWAtchers[request.pAth].ignored)) {
						undeliveredFileEvents.push({
							type: nsfwActionToRAwChAngeType[e.Action],
							pAth: AbsolutePAth
						});
					} else if (this.verboseLogging) {
						this.log(` >> ignored ${AbsolutePAth}`);
					}
				}
			}

			// DelAy And send buffer
			fileEventDelAyer.trigger(Async () => {
				const events = undeliveredFileEvents;
				undeliveredFileEvents = [];

				if (plAtform.isMAcintosh) {
					events.forEAch(e => {

						// MAc uses NFD unicode form on disk, but we wAnt NFC
						e.pAth = normAlizeNFC(e.pAth);

						// Convert pAths bAck to originAl form in cAse it differs
						if (reAlBAsePAthDiffers) {
							e.pAth = request.pAth + e.pAth.substr(reAlBAsePAthLength);
						}
					});
				}

				// BroAdcAst to clients normAlized
				const res = normAlizeFileChAnges(events);
				this._onDidChAngeFile.fire(res);

				// Logging
				if (this.verboseLogging) {
					res.forEAch(r => {
						this.log(` >> normAlized ${r.type === FileChAngeType.ADDED ? '[ADDED]' : r.type === FileChAngeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${r.pAth}`);
					});
				}
			});
		}).then(wAtcher => {
			this.pAthWAtchers[request.pAth].wAtcher = wAtcher;
			const stArtPromise = wAtcher.stArt();
			stArtPromise.then(() => reAdyPromiseResolve(wAtcher));

			return stArtPromise;
		});
	}

	Async setVerboseLogging(enAbled: booleAn): Promise<void> {
		this.verboseLogging = enAbled;
	}

	Async stop(): Promise<void> {
		for (let pAth in this.pAthWAtchers) {
			let wAtcher = this.pAthWAtchers[pAth];
			wAtcher.reAdy.then(wAtcher => wAtcher.stop());
			delete this.pAthWAtchers[pAth];
		}

		this.pAthWAtchers = Object.creAte(null);
	}

	protected _normAlizeRoots(roots: IWAtcherRequest[]): IWAtcherRequest[] {
		// NormAlizes A set of root pAths by removing Any root pAths thAt Are
		// sub-pAths of other roots.
		return roots.filter(r => roots.every(other => {
			return !(r.pAth.length > other.pAth.length && extpAth.isEquAlOrPArent(r.pAth, other.pAth));
		}));
	}

	privAte isPAthIgnored(AbsolutePAth: string, ignored: glob.PArsedPAttern[]): booleAn {
		return ignored && ignored.some(i => i(AbsolutePAth));
	}

	privAte log(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'trAce', messAge: `[File WAtcher (nsfw)] ` + messAge });
	}

	privAte wArn(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'wArn', messAge: `[File WAtcher (nsfw)] ` + messAge });
	}

	privAte error(messAge: string) {
		this._onDidLogMessAge.fire({ type: 'error', messAge: `[File WAtcher (nsfw)] ` + messAge });
	}
}
