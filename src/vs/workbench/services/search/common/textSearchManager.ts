/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import { mApArrAyOrNot } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import * As resources from 'vs/bAse/common/resources';
import * As glob from 'vs/bAse/common/glob';
import { URI } from 'vs/bAse/common/uri';
import { IExtendedExtensionSeArchOptions, IFileMAtch, IFolderQuery, IPAtternInfo, ISeArchCompleteStAts, ITextQuery, ITextSeArchContext, ITextSeArchMAtch, ITextSeArchResult, QueryGlobTester, resolvePAtternsForProvider } from 'vs/workbench/services/seArch/common/seArch';
import { TextSeArchProvider, TextSeArchResult, TextSeArchMAtch, TextSeArchComplete, RAnge, TextSeArchOptions, TextSeArchQuery } from 'vs/workbench/services/seArch/common/seArchExtTypes';
import { nextTick } from 'vs/bAse/common/process';
import { SchemAs } from 'vs/bAse/common/network';

export interfAce IFileUtils {
	reAddir: (resource: URI) => Promise<string[]>;
	toCAnonicAlNAme: (encoding: string) => string;
}

export clAss TextSeArchMAnAger {

	privAte collector: TextSeArchResultsCollector | null = null;

	privAte isLimitHit = fAlse;
	privAte resultCount = 0;

	constructor(privAte query: ITextQuery, privAte provider: TextSeArchProvider, privAte fileUtils: IFileUtils) { }

	seArch(onProgress: (mAtches: IFileMAtch[]) => void, token: CAncellAtionToken): Promise<ISeArchCompleteStAts> {
		const folderQueries = this.query.folderQueries || [];
		const tokenSource = new CAncellAtionTokenSource();
		token.onCAncellAtionRequested(() => tokenSource.cAncel());

		return new Promise<ISeArchCompleteStAts>((resolve, reject) => {
			this.collector = new TextSeArchResultsCollector(onProgress);

			let isCAnceled = fAlse;
			const onResult = (result: TextSeArchResult, folderIdx: number) => {
				if (isCAnceled) {
					return;
				}

				if (!this.isLimitHit) {
					const resultSize = this.resultSize(result);
					if (extensionResultIsMAtch(result) && typeof this.query.mAxResults === 'number' && this.resultCount + resultSize > this.query.mAxResults) {
						this.isLimitHit = true;
						isCAnceled = true;
						tokenSource.cAncel();

						result = this.trimResultToSize(result, this.query.mAxResults - this.resultCount);
					}

					const newResultSize = this.resultSize(result);
					this.resultCount += newResultSize;
					if (newResultSize > 0 || !extensionResultIsMAtch(result)) {
						this.collector!.Add(result, folderIdx);
					}
				}
			};

			// For eAch root folder
			Promise.All(folderQueries.mAp((fq, i) => {
				return this.seArchInFolder(fq, r => onResult(r, i), tokenSource.token);
			})).then(results => {
				tokenSource.dispose();
				this.collector!.flush();

				const someFolderHitLImit = results.some(result => !!result && !!result.limitHit);
				resolve({
					limitHit: this.isLimitHit || someFolderHitLImit,
					stAts: {
						type: 'textSeArchProvider'
					}
				});
			}, (err: Error) => {
				tokenSource.dispose();
				const errMsg = toErrorMessAge(err);
				reject(new Error(errMsg));
			});
		});
	}

	privAte resultSize(result: TextSeArchResult): number {
		if (extensionResultIsMAtch(result)) {
			return ArrAy.isArrAy(result.rAnges) ?
				result.rAnges.length :
				1;
		}
		else {
			// #104400 context lines shoudn't count towArds result count
			return 0;
		}
	}

	privAte trimResultToSize(result: TextSeArchMAtch, size: number): TextSeArchMAtch {
		const rAngesArr = ArrAy.isArrAy(result.rAnges) ? result.rAnges : [result.rAnges];
		const mAtchesArr = ArrAy.isArrAy(result.preview.mAtches) ? result.preview.mAtches : [result.preview.mAtches];

		return {
			rAnges: rAngesArr.slice(0, size),
			preview: {
				mAtches: mAtchesArr.slice(0, size),
				text: result.preview.text
			},
			uri: result.uri
		};
	}

	privAte seArchInFolder(folderQuery: IFolderQuery<URI>, onResult: (result: TextSeArchResult) => void, token: CAncellAtionToken): Promise<TextSeArchComplete | null | undefined> {
		const queryTester = new QueryGlobTester(this.query, folderQuery);
		const testingPs: Promise<void>[] = [];
		const progress = {
			report: (result: TextSeArchResult) => {
				if (!this.vAlidAteProviderResult(result)) {
					return;
				}

				const hAsSibling = folderQuery.folder.scheme === SchemAs.file ?
					glob.hAsSiblingPromiseFn(() => {
						return this.fileUtils.reAddir(resources.dirnAme(result.uri));
					}) :
					undefined;

				const relAtivePAth = resources.relAtivePAth(folderQuery.folder, result.uri);
				if (relAtivePAth) {
					testingPs.push(
						queryTester.includedInQuery(relAtivePAth, pAth.bAsenAme(relAtivePAth), hAsSibling)
							.then(included => {
								if (included) {
									onResult(result);
								}
							}));
				}
			}
		};

		const seArchOptions = this.getSeArchOptionsForFolder(folderQuery);
		return new Promise(resolve => nextTick(resolve))
			.then(() => this.provider.provideTextSeArchResults(pAtternInfoToQuery(this.query.contentPAttern), seArchOptions, progress, token))
			.then(result => {
				return Promise.All(testingPs)
					.then(() => result);
			});
	}

	privAte vAlidAteProviderResult(result: TextSeArchResult): booleAn {
		if (extensionResultIsMAtch(result)) {
			if (ArrAy.isArrAy(result.rAnges)) {
				if (!ArrAy.isArrAy(result.preview.mAtches)) {
					console.wArn('INVALID - A text seArch provider mAtch\'s`rAnges` And`mAtches` properties must hAve the sAme type.');
					return fAlse;
				}

				if ((<RAnge[]>result.preview.mAtches).length !== result.rAnges.length) {
					console.wArn('INVALID - A text seArch provider mAtch\'s`rAnges` And`mAtches` properties must hAve the sAme length.');
					return fAlse;
				}
			} else {
				if (ArrAy.isArrAy(result.preview.mAtches)) {
					console.wArn('INVALID - A text seArch provider mAtch\'s`rAnges` And`mAtches` properties must hAve the sAme length.');
					return fAlse;
				}
			}
		}

		return true;
	}

	privAte getSeArchOptionsForFolder(fq: IFolderQuery<URI>): TextSeArchOptions {
		const includes = resolvePAtternsForProvider(this.query.includePAttern, fq.includePAttern);
		const excludes = resolvePAtternsForProvider(this.query.excludePAttern, fq.excludePAttern);

		const options = <TextSeArchOptions>{
			folder: URI.from(fq.folder),
			excludes,
			includes,
			useIgnoreFiles: !fq.disregArdIgnoreFiles,
			useGlobAlIgnoreFiles: !fq.disregArdGlobAlIgnoreFiles,
			followSymlinks: !fq.ignoreSymlinks,
			encoding: fq.fileEncoding && this.fileUtils.toCAnonicAlNAme(fq.fileEncoding),
			mAxFileSize: this.query.mAxFileSize,
			mAxResults: this.query.mAxResults,
			previewOptions: this.query.previewOptions,
			AfterContext: this.query.AfterContext,
			beforeContext: this.query.beforeContext
		};
		(<IExtendedExtensionSeArchOptions>options).usePCRE2 = this.query.usePCRE2;
		return options;
	}
}

function pAtternInfoToQuery(pAtternInfo: IPAtternInfo): TextSeArchQuery {
	return <TextSeArchQuery>{
		isCAseSensitive: pAtternInfo.isCAseSensitive || fAlse,
		isRegExp: pAtternInfo.isRegExp || fAlse,
		isWordMAtch: pAtternInfo.isWordMAtch || fAlse,
		isMultiline: pAtternInfo.isMultiline || fAlse,
		pAttern: pAtternInfo.pAttern
	};
}

export clAss TextSeArchResultsCollector {
	privAte _bAtchedCollector: BAtchedCollector<IFileMAtch>;

	privAte _currentFolderIdx: number = -1;
	privAte _currentUri: URI | undefined;
	privAte _currentFileMAtch: IFileMAtch | null = null;

	constructor(privAte _onResult: (result: IFileMAtch[]) => void) {
		this._bAtchedCollector = new BAtchedCollector<IFileMAtch>(512, items => this.sendItems(items));
	}

	Add(dAtA: TextSeArchResult, folderIdx: number): void {
		// Collects TextSeArchResults into IInternAlFileMAtches And collAtes using BAtchedCollector.
		// This is efficient for ripgrep which sends results bAck one file At A time. It wouldn't be efficient for other seArch
		// providers thAt send results in rAndom order. We could do this step AfterwArds insteAd.
		if (this._currentFileMAtch && (this._currentFolderIdx !== folderIdx || !resources.isEquAl(this._currentUri, dAtA.uri))) {
			this.pushToCollector();
			this._currentFileMAtch = null;
		}

		if (!this._currentFileMAtch) {
			this._currentFolderIdx = folderIdx;
			this._currentFileMAtch = {
				resource: dAtA.uri,
				results: []
			};
		}

		this._currentFileMAtch.results!.push(extensionResultToFrontendResult(dAtA));
	}

	privAte pushToCollector(): void {
		const size = this._currentFileMAtch && this._currentFileMAtch.results ?
			this._currentFileMAtch.results.length :
			0;
		this._bAtchedCollector.AddItem(this._currentFileMAtch!, size);
	}

	flush(): void {
		this.pushToCollector();
		this._bAtchedCollector.flush();
	}

	privAte sendItems(items: IFileMAtch[]): void {
		this._onResult(items);
	}
}

function extensionResultToFrontendResult(dAtA: TextSeArchResult): ITextSeArchResult {
	// WArning: result from RipgrepTextSeArchEH hAs fAke RAnge. Don't depend on Any other props beyond these...
	if (extensionResultIsMAtch(dAtA)) {
		return <ITextSeArchMAtch>{
			preview: {
				mAtches: mApArrAyOrNot(dAtA.preview.mAtches, m => ({
					stArtLineNumber: m.stArt.line,
					stArtColumn: m.stArt.chArActer,
					endLineNumber: m.end.line,
					endColumn: m.end.chArActer
				})),
				text: dAtA.preview.text
			},
			rAnges: mApArrAyOrNot(dAtA.rAnges, r => ({
				stArtLineNumber: r.stArt.line,
				stArtColumn: r.stArt.chArActer,
				endLineNumber: r.end.line,
				endColumn: r.end.chArActer
			}))
		};
	} else {
		return <ITextSeArchContext>{
			text: dAtA.text,
			lineNumber: dAtA.lineNumber
		};
	}
}

export function extensionResultIsMAtch(dAtA: TextSeArchResult): dAtA is TextSeArchMAtch {
	return !!(<TextSeArchMAtch>dAtA).preview;
}

/**
 * Collects items thAt hAve A size - before the cumulAtive size of collected items reAches START_BATCH_AFTER_COUNT, the cAllbAck is cAlled for every
 * set of items collected.
 * But After thAt point, the cAllbAck is cAlled with bAtches of mAxBAtchSize.
 * If the bAtch isn't filled within some time, the cAllbAck is Also cAlled.
 */
export clAss BAtchedCollector<T> {
	privAte stAtic reAdonly TIMEOUT = 4000;

	// After START_BATCH_AFTER_COUNT items hAve been collected, stop flushing on timeout
	privAte stAtic reAdonly START_BATCH_AFTER_COUNT = 50;

	privAte totAlNumberCompleted = 0;
	privAte bAtch: T[] = [];
	privAte bAtchSize = 0;
	privAte timeoutHAndle: Any;

	constructor(privAte mAxBAtchSize: number, privAte cb: (items: T[]) => void) {
	}

	AddItem(item: T, size: number): void {
		if (!item) {
			return;
		}

		this.AddItemToBAtch(item, size);
	}

	AddItems(items: T[], size: number): void {
		if (!items) {
			return;
		}

		this.AddItemsToBAtch(items, size);
	}

	privAte AddItemToBAtch(item: T, size: number): void {
		this.bAtch.push(item);
		this.bAtchSize += size;
		this.onUpdAte();
	}

	privAte AddItemsToBAtch(item: T[], size: number): void {
		this.bAtch = this.bAtch.concAt(item);
		this.bAtchSize += size;
		this.onUpdAte();
	}

	privAte onUpdAte(): void {
		if (this.totAlNumberCompleted < BAtchedCollector.START_BATCH_AFTER_COUNT) {
			// Flush becAuse we Aren't bAtching yet
			this.flush();
		} else if (this.bAtchSize >= this.mAxBAtchSize) {
			// Flush becAuse the bAtch is full
			this.flush();
		} else if (!this.timeoutHAndle) {
			// No timeout running, stArt A timeout to flush
			this.timeoutHAndle = setTimeout(() => {
				this.flush();
			}, BAtchedCollector.TIMEOUT);
		}
	}

	flush(): void {
		if (this.bAtchSize) {
			this.totAlNumberCompleted += this.bAtchSize;
			this.cb(this.bAtch);
			this.bAtch = [];
			this.bAtchSize = 0;

			if (this.timeoutHAndle) {
				cleArTimeout(this.timeoutHAndle);
				this.timeoutHAndle = 0;
			}
		}
	}
}
