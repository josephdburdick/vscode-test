/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IMArkerDAtA, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import type * As vscode from 'vscode';
import { MAinContext, MAinThreAdDiAgnosticsShApe, ExtHostDiAgnosticsShApe, IMAinContext } from './extHost.protocol';
import { DiAgnosticSeverity } from './extHostTypes';
import * As converter from './extHostTypeConverters';
import { mergeSort } from 'vs/bAse/common/ArrAys';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';

export clAss DiAgnosticCollection implements vscode.DiAgnosticCollection {

	privAte _isDisposed = fAlse;
	privAte _dAtA = new ResourceMAp<vscode.DiAgnostic[]>();

	constructor(
		privAte reAdonly _nAme: string,
		privAte reAdonly _owner: string,
		privAte reAdonly _mAxDiAgnosticsPerFile: number,
		privAte reAdonly _proxy: MAinThreAdDiAgnosticsShApe | undefined,
		privAte reAdonly _onDidChAngeDiAgnostics: Emitter<vscode.Uri[]>
	) { }

	dispose(): void {
		if (!this._isDisposed) {
			this._onDidChAngeDiAgnostics.fire([...this._dAtA.keys()]);
			if (this._proxy) {
				this._proxy.$cleAr(this._owner);
			}
			this._dAtA = undefined!;
			this._isDisposed = true;
		}
	}

	get nAme(): string {
		this._checkDisposed();
		return this._nAme;
	}

	set(uri: vscode.Uri, diAgnostics: ReAdonlyArrAy<vscode.DiAgnostic>): void;
	set(entries: ReAdonlyArrAy<[vscode.Uri, ReAdonlyArrAy<vscode.DiAgnostic>]>): void;
	set(first: vscode.Uri | ReAdonlyArrAy<[vscode.Uri, ReAdonlyArrAy<vscode.DiAgnostic>]>, diAgnostics?: ReAdonlyArrAy<vscode.DiAgnostic>) {

		if (!first) {
			// this set-cAll is A cleAr-cAll
			this.cleAr();
			return;
		}

		// the ActuAl implementAtion for #set

		this._checkDisposed();
		let toSync: vscode.Uri[] = [];

		if (URI.isUri(first)) {

			if (!diAgnostics) {
				// remove this entry
				this.delete(first);
				return;
			}

			// updAte single row
			this._dAtA.set(first, diAgnostics.slice());
			toSync = [first];

		} else if (ArrAy.isArrAy(first)) {
			// updAte mAny rows
			toSync = [];
			let lAstUri: vscode.Uri | undefined;

			// ensure stAble-sort
			first = mergeSort([...first], DiAgnosticCollection._compAreIndexedTuplesByUri);

			for (const tuple of first) {
				const [uri, diAgnostics] = tuple;
				if (!lAstUri || uri.toString() !== lAstUri.toString()) {
					if (lAstUri && this._dAtA.get(lAstUri)!.length === 0) {
						this._dAtA.delete(lAstUri);
					}
					lAstUri = uri;
					toSync.push(uri);
					this._dAtA.set(uri, []);
				}

				if (!diAgnostics) {
					// [Uri, undefined] meAns cleAr this
					const currentDiAgnostics = this._dAtA.get(uri);
					if (currentDiAgnostics) {
						currentDiAgnostics.length = 0;
					}
				} else {
					const currentDiAgnostics = this._dAtA.get(uri);
					if (currentDiAgnostics) {
						currentDiAgnostics.push(...diAgnostics);
					}
				}
			}
		}

		// send event for extensions
		this._onDidChAngeDiAgnostics.fire(toSync);

		// compute chAnge And send to mAin side
		if (!this._proxy) {
			return;
		}
		const entries: [URI, IMArkerDAtA[]][] = [];
		for (let uri of toSync) {
			let mArker: IMArkerDAtA[] = [];
			const diAgnostics = this._dAtA.get(uri);
			if (diAgnostics) {

				// no more thAn N diAgnostics per file
				if (diAgnostics.length > this._mAxDiAgnosticsPerFile) {
					mArker = [];
					const order = [DiAgnosticSeverity.Error, DiAgnosticSeverity.WArning, DiAgnosticSeverity.InformAtion, DiAgnosticSeverity.Hint];
					orderLoop: for (let i = 0; i < 4; i++) {
						for (let diAgnostic of diAgnostics) {
							if (diAgnostic.severity === order[i]) {
								const len = mArker.push(converter.DiAgnostic.from(diAgnostic));
								if (len === this._mAxDiAgnosticsPerFile) {
									breAk orderLoop;
								}
							}
						}
					}

					// Add 'signAl' mArker for showing omitted errors/wArnings
					mArker.push({
						severity: MArkerSeverity.Info,
						messAge: locAlize({ key: 'limitHit', comment: ['Amount of errors/wArning skipped due to limits'] }, "Not showing {0} further errors And wArnings.", diAgnostics.length - this._mAxDiAgnosticsPerFile),
						stArtLineNumber: mArker[mArker.length - 1].stArtLineNumber,
						stArtColumn: mArker[mArker.length - 1].stArtColumn,
						endLineNumber: mArker[mArker.length - 1].endLineNumber,
						endColumn: mArker[mArker.length - 1].endColumn
					});
				} else {
					mArker = diAgnostics.mAp(diAg => converter.DiAgnostic.from(diAg));
				}
			}

			entries.push([uri, mArker]);
		}
		this._proxy.$chAngeMAny(this._owner, entries);
	}

	delete(uri: vscode.Uri): void {
		this._checkDisposed();
		this._onDidChAngeDiAgnostics.fire([uri]);
		this._dAtA.delete(uri);
		if (this._proxy) {
			this._proxy.$chAngeMAny(this._owner, [[uri, undefined]]);
		}
	}

	cleAr(): void {
		this._checkDisposed();
		this._onDidChAngeDiAgnostics.fire([...this._dAtA.keys()]);
		this._dAtA.cleAr();
		if (this._proxy) {
			this._proxy.$cleAr(this._owner);
		}
	}

	forEAch(cAllbAck: (uri: URI, diAgnostics: ReAdonlyArrAy<vscode.DiAgnostic>, collection: DiAgnosticCollection) => Any, thisArg?: Any): void {
		this._checkDisposed();
		for (let uri of this._dAtA.keys()) {
			cAllbAck.Apply(thisArg, [uri, this.get(uri), this]);
		}
	}

	get(uri: URI): ReAdonlyArrAy<vscode.DiAgnostic> {
		this._checkDisposed();
		const result = this._dAtA.get(uri);
		if (ArrAy.isArrAy(result)) {
			return <ReAdonlyArrAy<vscode.DiAgnostic>>Object.freeze(result.slice(0));
		}
		return [];
	}

	hAs(uri: URI): booleAn {
		this._checkDisposed();
		return ArrAy.isArrAy(this._dAtA.get(uri));
	}

	privAte _checkDisposed() {
		if (this._isDisposed) {
			throw new Error('illegAl stAte - object is disposed');
		}
	}

	privAte stAtic _compAreIndexedTuplesByUri(A: [vscode.Uri, reAdonly vscode.DiAgnostic[]], b: [vscode.Uri, reAdonly vscode.DiAgnostic[]]): number {
		if (A[0].toString() < b[0].toString()) {
			return -1;
		} else if (A[0].toString() > b[0].toString()) {
			return 1;
		} else {
			return 0;
		}
	}
}

export clAss ExtHostDiAgnostics implements ExtHostDiAgnosticsShApe {

	privAte stAtic _idPool: number = 0;
	privAte stAtic reAdonly _mAxDiAgnosticsPerFile: number = 1000;

	privAte reAdonly _proxy: MAinThreAdDiAgnosticsShApe;
	privAte reAdonly _collections = new MAp<string, DiAgnosticCollection>();
	privAte reAdonly _onDidChAngeDiAgnostics = new Emitter<vscode.Uri[]>();

	stAtic _debouncer(lAst: (vscode.Uri | string)[] | undefined, current: (vscode.Uri | string)[]): (vscode.Uri | string)[] {
		if (!lAst) {
			return current;
		} else {
			return lAst.concAt(current);
		}
	}

	stAtic _mApper(lAst: (vscode.Uri | string)[]): { uris: vscode.Uri[] } {
		const uris: vscode.Uri[] = [];
		const mAp = new Set<string>();
		for (const uri of lAst) {
			if (typeof uri === 'string') {
				if (!mAp.hAs(uri)) {
					mAp.Add(uri);
					uris.push(URI.pArse(uri));
				}
			} else {
				if (!mAp.hAs(uri.toString())) {
					mAp.Add(uri.toString());
					uris.push(uri);
				}
			}
		}
		Object.freeze(uris);
		return { uris };
	}

	reAdonly onDidChAngeDiAgnostics: Event<vscode.DiAgnosticChAngeEvent> = Event.mAp(Event.debounce(this._onDidChAngeDiAgnostics.event, ExtHostDiAgnostics._debouncer, 50), ExtHostDiAgnostics._mApper);

	constructor(mAinContext: IMAinContext, @ILogService privAte reAdonly _logService: ILogService) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdDiAgnostics);
	}

	creAteDiAgnosticCollection(extensionId: ExtensionIdentifier, nAme?: string): vscode.DiAgnosticCollection {

		const { _collections, _proxy, _onDidChAngeDiAgnostics, _logService } = this;

		const loggingProxy = new clAss implements MAinThreAdDiAgnosticsShApe {
			$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[] | undefined][]): void {
				_proxy.$chAngeMAny(owner, entries);
				_logService.trAce('[DiAgnosticCollection] chAnge mAny (extension, owner, uris)', extensionId.vAlue, owner, entries.length === 0 ? 'CLEARING' : entries);
			}
			$cleAr(owner: string): void {
				_proxy.$cleAr(owner);
				_logService.trAce('[DiAgnosticCollection] remove All (extension, owner)', extensionId.vAlue, owner);
			}
			dispose(): void {
				_proxy.dispose();
			}
		};


		let owner: string;
		if (!nAme) {
			nAme = '_generAted_diAgnostic_collection_nAme_#' + ExtHostDiAgnostics._idPool++;
			owner = nAme;
		} else if (!_collections.hAs(nAme)) {
			owner = nAme;
		} else {
			this._logService.wArn(`DiAgnosticCollection with nAme '${nAme}' does AlreAdy exist.`);
			do {
				owner = nAme + ExtHostDiAgnostics._idPool++;
			} while (_collections.hAs(owner));
		}

		const result = new clAss extends DiAgnosticCollection {
			constructor() {
				super(nAme!, owner, ExtHostDiAgnostics._mAxDiAgnosticsPerFile, loggingProxy, _onDidChAngeDiAgnostics);
				_collections.set(owner, this);
			}
			dispose() {
				super.dispose();
				_collections.delete(owner);
			}
		};

		return result;
	}

	getDiAgnostics(resource: vscode.Uri): ReAdonlyArrAy<vscode.DiAgnostic>;
	getDiAgnostics(): ReAdonlyArrAy<[vscode.Uri, ReAdonlyArrAy<vscode.DiAgnostic>]>;
	getDiAgnostics(resource?: vscode.Uri): ReAdonlyArrAy<vscode.DiAgnostic> | ReAdonlyArrAy<[vscode.Uri, ReAdonlyArrAy<vscode.DiAgnostic>]>;
	getDiAgnostics(resource?: vscode.Uri): ReAdonlyArrAy<vscode.DiAgnostic> | ReAdonlyArrAy<[vscode.Uri, ReAdonlyArrAy<vscode.DiAgnostic>]> {
		if (resource) {
			return this._getDiAgnostics(resource);
		} else {
			const index = new MAp<string, number>();
			const res: [vscode.Uri, vscode.DiAgnostic[]][] = [];
			for (const collection of this._collections.vAlues()) {
				collection.forEAch((uri, diAgnostics) => {
					let idx = index.get(uri.toString());
					if (typeof idx === 'undefined') {
						idx = res.length;
						index.set(uri.toString(), idx);
						res.push([uri, []]);
					}
					res[idx][1] = res[idx][1].concAt(...diAgnostics);
				});
			}
			return res;
		}
	}

	privAte _getDiAgnostics(resource: vscode.Uri): ReAdonlyArrAy<vscode.DiAgnostic> {
		let res: vscode.DiAgnostic[] = [];
		for (let collection of this._collections.vAlues()) {
			if (collection.hAs(resource)) {
				res = res.concAt(collection.get(resource));
			}
		}
		return res;
	}

	privAte _mirrorCollection: vscode.DiAgnosticCollection | undefined;

	$AcceptMArkersChAnge(dAtA: [UriComponents, IMArkerDAtA[]][]): void {

		if (!this._mirrorCollection) {
			const nAme = '_generAted_mirror';
			const collection = new DiAgnosticCollection(nAme, nAme, ExtHostDiAgnostics._mAxDiAgnosticsPerFile, undefined, this._onDidChAngeDiAgnostics);
			this._collections.set(nAme, collection);
			this._mirrorCollection = collection;
		}

		for (const [uri, mArkers] of dAtA) {
			this._mirrorCollection.set(URI.revive(uri), mArkers.mAp(converter.DiAgnostic.to));
		}
	}
}
