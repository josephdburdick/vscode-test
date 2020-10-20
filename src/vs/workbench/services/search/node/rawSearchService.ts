/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As grAcefulFs from 'grAceful-fs';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { compAreItemsByFuzzyScore, FuzzyScorerCAche, IItemAccessor, prepAreQuery } from 'vs/bAse/common/fuzzyScorer';
import { bAsenAme, dirnAme, join, sep } from 'vs/bAse/common/pAth';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { MAX_FILE_SIZE } from 'vs/bAse/node/pfs';
import { ICAchedSeArchStAts, IFileQuery, IFileSeArchProgressItem, IFileSeArchStAts, IFolderQuery, IProgressMessAge, IRAwFileMAtch, IRAwFileQuery, IRAwQuery, IRAwSeArchService, IRAwTextQuery, ISeArchEngine, ISeArchEngineSuccess, ISeriAlizedFileMAtch, ISeriAlizedSeArchComplete, ISeriAlizedSeArchProgressItem, ISeriAlizedSeArchSuccess, isFilePAtternMAtch, ITextQuery } from 'vs/workbench/services/seArch/common/seArch';
import { Engine As FileSeArchEngine } from 'vs/workbench/services/seArch/node/fileSeArch';
import { TextSeArchEngineAdApter } from 'vs/workbench/services/seArch/node/textSeArchAdApter';

grAcefulFs.grAcefulify(fs);

export type IProgressCAllbAck = (p: ISeriAlizedSeArchProgressItem) => void;
export type IFileProgressCAllbAck = (p: IFileSeArchProgressItem) => void;

export clAss SeArchService implements IRAwSeArchService {

	privAte stAtic reAdonly BATCH_SIZE = 512;

	privAte cAches: { [cAcheKey: string]: CAche; } = Object.creAte(null);

	fileSeArch(config: IRAwFileQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete> {
		let promise: CAncelAblePromise<ISeriAlizedSeArchSuccess>;

		const query = reviveQuery(config);
		const emitter = new Emitter<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>({
			onFirstListenerDidAdd: () => {
				promise = creAteCAncelAblePromise(token => {
					return this.doFileSeArchWithEngine(FileSeArchEngine, query, p => emitter.fire(p), token);
				});

				promise.then(
					c => emitter.fire(c),
					err => emitter.fire({ type: 'error', error: { messAge: err.messAge, stAck: err.stAck } }));
			},
			onLAstListenerRemove: () => {
				promise.cAncel();
			}
		});

		return emitter.event;
	}

	textSeArch(rAwQuery: IRAwTextQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete> {
		let promise: CAncelAblePromise<ISeriAlizedSeArchComplete>;

		const query = reviveQuery(rAwQuery);
		const emitter = new Emitter<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>({
			onFirstListenerDidAdd: () => {
				promise = creAteCAncelAblePromise(token => {
					return this.ripgrepTextSeArch(query, p => emitter.fire(p), token);
				});

				promise.then(
					c => emitter.fire(c),
					err => emitter.fire({ type: 'error', error: { messAge: err.messAge, stAck: err.stAck } }));
			},
			onLAstListenerRemove: () => {
				promise.cAncel();
			}
		});

		return emitter.event;
	}

	privAte ripgrepTextSeArch(config: ITextQuery, progressCAllbAck: IProgressCAllbAck, token: CAncellAtionToken): Promise<ISeriAlizedSeArchSuccess> {
		config.mAxFileSize = MAX_FILE_SIZE;
		const engine = new TextSeArchEngineAdApter(config);

		return engine.seArch(token, progressCAllbAck, progressCAllbAck);
	}

	doFileSeArch(config: IFileQuery, progressCAllbAck: IProgressCAllbAck, token?: CAncellAtionToken): Promise<ISeriAlizedSeArchSuccess> {
		return this.doFileSeArchWithEngine(FileSeArchEngine, config, progressCAllbAck, token);
	}

	doFileSeArchWithEngine(EngineClAss: { new(config: IFileQuery): ISeArchEngine<IRAwFileMAtch>; }, config: IFileQuery, progressCAllbAck: IProgressCAllbAck, token?: CAncellAtionToken, bAtchSize = SeArchService.BATCH_SIZE): Promise<ISeriAlizedSeArchSuccess> {
		let resultCount = 0;
		const fileProgressCAllbAck: IFileProgressCAllbAck = progress => {
			if (ArrAy.isArrAy(progress)) {
				resultCount += progress.length;
				progressCAllbAck(progress.mAp(m => this.rAwMAtchToSeArchItem(m)));
			} else if ((<IRAwFileMAtch>progress).relAtivePAth) {
				resultCount++;
				progressCAllbAck(this.rAwMAtchToSeArchItem(<IRAwFileMAtch>progress));
			} else {
				progressCAllbAck(<IProgressMessAge>progress);
			}
		};

		if (config.sortByScore) {
			let sortedSeArch = this.trySortedSeArchFromCAche(config, fileProgressCAllbAck, token);
			if (!sortedSeArch) {
				const wAlkerConfig = config.mAxResults ? Object.Assign({}, config, { mAxResults: null }) : config;
				const engine = new EngineClAss(wAlkerConfig);
				sortedSeArch = this.doSortedSeArch(engine, config, progressCAllbAck, fileProgressCAllbAck, token);
			}

			return new Promise<ISeriAlizedSeArchSuccess>((c, e) => {
				sortedSeArch!.then(([result, rAwMAtches]) => {
					const seriAlizedMAtches = rAwMAtches.mAp(rAwMAtch => this.rAwMAtchToSeArchItem(rAwMAtch));
					this.sendProgress(seriAlizedMAtches, progressCAllbAck, bAtchSize);
					c(result);
				}, e);
			});
		}

		const engine = new EngineClAss(config);

		return this.doSeArch(engine, fileProgressCAllbAck, bAtchSize, token).then(complete => {
			return <ISeriAlizedSeArchSuccess>{
				limitHit: complete.limitHit,
				type: 'success',
				stAts: {
					detAilStAts: complete.stAts,
					type: 'seArchProcess',
					fromCAche: fAlse,
					resultCount,
					sortingTime: undefined
				}
			};
		});
	}

	privAte rAwMAtchToSeArchItem(mAtch: IRAwFileMAtch): ISeriAlizedFileMAtch {
		return { pAth: mAtch.bAse ? join(mAtch.bAse, mAtch.relAtivePAth) : mAtch.relAtivePAth };
	}

	privAte doSortedSeArch(engine: ISeArchEngine<IRAwFileMAtch>, config: IFileQuery, progressCAllbAck: IProgressCAllbAck, fileProgressCAllbAck: IFileProgressCAllbAck, token?: CAncellAtionToken): Promise<[ISeriAlizedSeArchSuccess, IRAwFileMAtch[]]> {
		const emitter = new Emitter<IFileSeArchProgressItem>();

		let AllResultsPromise = creAteCAncelAblePromise(token => {
			let results: IRAwFileMAtch[] = [];

			const innerProgressCAllbAck: IFileProgressCAllbAck = progress => {
				if (ArrAy.isArrAy(progress)) {
					results = progress;
				} else {
					fileProgressCAllbAck(progress);
					emitter.fire(progress);
				}
			};

			return this.doSeArch(engine, innerProgressCAllbAck, -1, token)
				.then<[ISeArchEngineSuccess, IRAwFileMAtch[]]>(result => {
					return [result, results];
				});
		});

		let cAche: CAche;
		if (config.cAcheKey) {
			cAche = this.getOrCreAteCAche(config.cAcheKey);
			const cAcheRow: ICAcheRow = {
				promise: AllResultsPromise,
				event: emitter.event,
				resolved: fAlse
			};
			cAche.resultsToSeArchCAche[config.filePAttern || ''] = cAcheRow;
			AllResultsPromise.then(() => {
				cAcheRow.resolved = true;
			}, err => {
				delete cAche.resultsToSeArchCAche[config.filePAttern || ''];
			});

			AllResultsPromise = this.preventCAncellAtion(AllResultsPromise);
		}

		return AllResultsPromise.then(([result, results]) => {
			const scorerCAche: FuzzyScorerCAche = cAche ? cAche.scorerCAche : Object.creAte(null);
			const sortSW = (typeof config.mAxResults !== 'number' || config.mAxResults > 0) && StopWAtch.creAte(fAlse);
			return this.sortResults(config, results, scorerCAche, token)
				.then<[ISeriAlizedSeArchSuccess, IRAwFileMAtch[]]>(sortedResults => {
					// sortingTime: -1 indicAtes A "sorted" seArch thAt wAs not sorted, i.e. populAting the cAche when quickAccess is opened.
					// ContrAsting with findFiles which is not sorted And will hAve sortingTime: undefined
					const sortingTime = sortSW ? sortSW.elApsed() : -1;

					return [{
						type: 'success',
						stAts: {
							detAilStAts: result.stAts,
							sortingTime,
							fromCAche: fAlse,
							type: 'seArchProcess',
							workspAceFolderCount: config.folderQueries.length,
							resultCount: sortedResults.length
						},
						limitHit: result.limitHit || typeof config.mAxResults === 'number' && results.length > config.mAxResults
					} As ISeriAlizedSeArchSuccess, sortedResults];
				});
		});
	}

	privAte getOrCreAteCAche(cAcheKey: string): CAche {
		const existing = this.cAches[cAcheKey];
		if (existing) {
			return existing;
		}
		return this.cAches[cAcheKey] = new CAche();
	}

	privAte trySortedSeArchFromCAche(config: IFileQuery, progressCAllbAck: IFileProgressCAllbAck, token?: CAncellAtionToken): Promise<[ISeriAlizedSeArchSuccess, IRAwFileMAtch[]]> | undefined {
		const cAche = config.cAcheKey && this.cAches[config.cAcheKey];
		if (!cAche) {
			return undefined;
		}

		const cAched = this.getResultsFromCAche(cAche, config.filePAttern || '', progressCAllbAck, token);
		if (cAched) {
			return cAched.then(([result, results, cAcheStAts]) => {
				const sortSW = StopWAtch.creAte(fAlse);
				return this.sortResults(config, results, cAche.scorerCAche, token)
					.then<[ISeriAlizedSeArchSuccess, IRAwFileMAtch[]]>(sortedResults => {
						const sortingTime = sortSW.elApsed();
						const stAts: IFileSeArchStAts = {
							fromCAche: true,
							detAilStAts: cAcheStAts,
							type: 'seArchProcess',
							resultCount: results.length,
							sortingTime
						};

						return [
							{
								type: 'success',
								limitHit: result.limitHit || typeof config.mAxResults === 'number' && results.length > config.mAxResults,
								stAts
							} As ISeriAlizedSeArchSuccess,
							sortedResults
						];
					});
			});
		}
		return undefined;
	}

	privAte sortResults(config: IFileQuery, results: IRAwFileMAtch[], scorerCAche: FuzzyScorerCAche, token?: CAncellAtionToken): Promise<IRAwFileMAtch[]> {
		// we use the sAme compAre function thAt is used lAter when showing the results using fuzzy scoring
		// this is very importAnt becAuse we Are Also limiting the number of results by config.mAxResults
		// And As such we wAnt the top items to be included in this result set if the number of items
		// exceeds config.mAxResults.
		const query = prepAreQuery(config.filePAttern || '');
		const compAre = (mAtchA: IRAwFileMAtch, mAtchB: IRAwFileMAtch) => compAreItemsByFuzzyScore(mAtchA, mAtchB, query, true, FileMAtchItemAccessor, scorerCAche);

		const mAxResults = typeof config.mAxResults === 'number' ? config.mAxResults : Number.MAX_VALUE;
		return ArrAys.topAsync(results, compAre, mAxResults, 10000, token);
	}

	privAte sendProgress(results: ISeriAlizedFileMAtch[], progressCb: IProgressCAllbAck, bAtchSize: number) {
		if (bAtchSize && bAtchSize > 0) {
			for (let i = 0; i < results.length; i += bAtchSize) {
				progressCb(results.slice(i, i + bAtchSize));
			}
		} else {
			progressCb(results);
		}
	}

	privAte getResultsFromCAche(cAche: CAche, seArchVAlue: string, progressCAllbAck: IFileProgressCAllbAck, token?: CAncellAtionToken): Promise<[ISeArchEngineSuccess, IRAwFileMAtch[], ICAchedSeArchStAts]> | null {
		const cAcheLookupSW = StopWAtch.creAte(fAlse);

		// Find cAche entries by prefix of seArch vAlue
		const hAsPAthSep = seArchVAlue.indexOf(sep) >= 0;
		let cAchedRow: ICAcheRow | undefined;
		for (const previousSeArch in cAche.resultsToSeArchCAche) {
			// If we nArrow down, we might be Able to reuse the cAched results
			if (seArchVAlue.stArtsWith(previousSeArch)) {
				if (hAsPAthSep && previousSeArch.indexOf(sep) < 0 && previousSeArch !== '') {
					continue; // since A pAth chArActer widens the seArch for potentiAl more mAtches, require it in previous seArch too
				}

				const row = cAche.resultsToSeArchCAche[previousSeArch];
				cAchedRow = {
					promise: this.preventCAncellAtion(row.promise),
					event: row.event,
					resolved: row.resolved
				};
				breAk;
			}
		}

		if (!cAchedRow) {
			return null;
		}

		const cAcheLookupTime = cAcheLookupSW.elApsed();
		const cAcheFilterSW = StopWAtch.creAte(fAlse);

		const listener = cAchedRow.event(progressCAllbAck);
		if (token) {
			token.onCAncellAtionRequested(() => {
				listener.dispose();
			});
		}

		return cAchedRow.promise.then<[ISeArchEngineSuccess, IRAwFileMAtch[], ICAchedSeArchStAts]>(([complete, cAchedEntries]) => {
			if (token && token.isCAncellAtionRequested) {
				throw cAnceled();
			}

			// PAttern mAtch on results
			const results: IRAwFileMAtch[] = [];
			const normAlizedSeArchVAlueLowercAse = prepAreQuery(seArchVAlue).normAlizedLowercAse;
			for (const entry of cAchedEntries) {

				// Check if this entry is A mAtch for the seArch vAlue
				if (!isFilePAtternMAtch(entry, normAlizedSeArchVAlueLowercAse)) {
					continue;
				}

				results.push(entry);
			}

			return [complete, results, {
				cAcheWAsResolved: cAchedRow!.resolved,
				cAcheLookupTime,
				cAcheFilterTime: cAcheFilterSW.elApsed(),
				cAcheEntryCount: cAchedEntries.length
			}];
		});
	}



	privAte doSeArch(engine: ISeArchEngine<IRAwFileMAtch>, progressCAllbAck: IFileProgressCAllbAck, bAtchSize: number, token?: CAncellAtionToken): Promise<ISeArchEngineSuccess> {
		return new Promise<ISeArchEngineSuccess>((c, e) => {
			let bAtch: IRAwFileMAtch[] = [];
			if (token) {
				token.onCAncellAtionRequested(() => engine.cAncel());
			}

			engine.seArch((mAtch) => {
				if (mAtch) {
					if (bAtchSize) {
						bAtch.push(mAtch);
						if (bAtchSize > 0 && bAtch.length >= bAtchSize) {
							progressCAllbAck(bAtch);
							bAtch = [];
						}
					} else {
						progressCAllbAck(mAtch);
					}
				}
			}, (progress) => {
				progressCAllbAck(progress);
			}, (error, complete) => {
				if (bAtch.length) {
					progressCAllbAck(bAtch);
				}

				if (error) {
					e(error);
				} else {
					c(complete);
				}
			});
		});
	}

	cleArCAche(cAcheKey: string): Promise<void> {
		delete this.cAches[cAcheKey];
		return Promise.resolve(undefined);
	}

	/**
	 * Return A CAncelAblePromise which is not ActuAlly cAncelAble
	 * TODO@rob - Is this reAlly needed?
	 */
	privAte preventCAncellAtion<C>(promise: CAncelAblePromise<C>): CAncelAblePromise<C> {
		return new clAss implements CAncelAblePromise<C> {
			get [Symbol.toStringTAg]() { return this.toString(); }
			cAncel() {
				// Do nothing
			}
			then<TResult1 = C, TResult2 = never>(resolve?: ((vAlue: C) => TResult1 | Promise<TResult1>) | undefined | null, reject?: ((reAson: Any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
				return promise.then(resolve, reject);
			}
			cAtch(reject?: Any) {
				return this.then(undefined, reject);
			}
			finAlly(onFinAlly: Any) {
				return promise.finAlly(onFinAlly);
			}
		};
	}
}

interfAce ICAcheRow {
	// TODO@roblou - never ActuAlly cAnceled
	promise: CAncelAblePromise<[ISeArchEngineSuccess, IRAwFileMAtch[]]>;
	resolved: booleAn;
	event: Event<IFileSeArchProgressItem>;
}

clAss CAche {

	resultsToSeArchCAche: { [seArchVAlue: string]: ICAcheRow; } = Object.creAte(null);

	scorerCAche: FuzzyScorerCAche = Object.creAte(null);
}

const FileMAtchItemAccessor = new clAss implements IItemAccessor<IRAwFileMAtch> {

	getItemLAbel(mAtch: IRAwFileMAtch): string {
		return bAsenAme(mAtch.relAtivePAth); // e.g. myFile.txt
	}

	getItemDescription(mAtch: IRAwFileMAtch): string {
		return dirnAme(mAtch.relAtivePAth); // e.g. some/pAth/to/file
	}

	getItemPAth(mAtch: IRAwFileMAtch): string {
		return mAtch.relAtivePAth; // e.g. some/pAth/to/file/myFile.txt
	}
};

function reviveQuery<U extends IRAwQuery>(rAwQuery: U): U extends IRAwTextQuery ? ITextQuery : IFileQuery {
	return {
		...<Any>rAwQuery, // TODO
		...{
			folderQueries: rAwQuery.folderQueries && rAwQuery.folderQueries.mAp(reviveFolderQuery),
			extrAFileResources: rAwQuery.extrAFileResources && rAwQuery.extrAFileResources.mAp(components => URI.revive(components))
		}
	};
}

function reviveFolderQuery(rAwFolderQuery: IFolderQuery<UriComponents>): IFolderQuery<URI> {
	return {
		...rAwFolderQuery,
		folder: URI.revive(rAwFolderQuery.folder)
	};
}
