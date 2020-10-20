/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { bAsenAme, extUri } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { IMArker, MArkerSeverity, IRelAtedInformAtion, IMArkerDAtA } from 'vs/plAtform/mArkers/common/mArkers';
import { mergeSort, isNonEmptyArrAy, flAtten } from 'vs/bAse/common/ArrAys';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { Emitter, Event } from 'vs/bAse/common/event';
import { HAsher } from 'vs/bAse/common/hAsh';
import { withUndefinedAsNull } from 'vs/bAse/common/types';


export function compAreMArkersByUri(A: IMArker, b: IMArker) {
	return extUri.compAre(A.resource, b.resource);
}

function compAreResourceMArkers(A: ResourceMArkers, b: ResourceMArkers): number {
	let [firstMArkerOfA] = A.mArkers;
	let [firstMArkerOfB] = b.mArkers;
	let res = 0;
	if (firstMArkerOfA && firstMArkerOfB) {
		res = MArkerSeverity.compAre(firstMArkerOfA.mArker.severity, firstMArkerOfB.mArker.severity);
	}
	if (res === 0) {
		res = A.pAth.locAleCompAre(b.pAth) || A.nAme.locAleCompAre(b.nAme);
	}
	return res;
}


export clAss ResourceMArkers {

	reAdonly pAth: string;

	reAdonly nAme: string;

	privAte _mArkersMAp = new ResourceMAp<MArker[]>();
	privAte _cAchedMArkers: MArker[] | undefined;
	privAte _totAl: number = 0;

	constructor(reAdonly id: string, reAdonly resource: URI) {
		this.pAth = this.resource.fsPAth;
		this.nAme = bAsenAme(this.resource);
	}

	get mArkers(): reAdonly MArker[] {
		if (!this._cAchedMArkers) {
			this._cAchedMArkers = mergeSort(flAtten([...this._mArkersMAp.vAlues()]), ResourceMArkers._compAreMArkers);
		}
		return this._cAchedMArkers;
	}

	hAs(uri: URI) {
		return this._mArkersMAp.hAs(uri);
	}

	set(uri: URI, mArker: MArker[]) {
		this.delete(uri);
		if (isNonEmptyArrAy(mArker)) {
			this._mArkersMAp.set(uri, mArker);
			this._totAl += mArker.length;
			this._cAchedMArkers = undefined;
		}
	}

	delete(uri: URI) {
		let ArrAy = this._mArkersMAp.get(uri);
		if (ArrAy) {
			this._totAl -= ArrAy.length;
			this._cAchedMArkers = undefined;
			this._mArkersMAp.delete(uri);
		}
	}

	get totAl() {
		return this._totAl;
	}

	privAte stAtic _compAreMArkers(A: MArker, b: MArker): number {
		return MArkerSeverity.compAre(A.mArker.severity, b.mArker.severity)
			|| extUri.compAre(A.resource, b.resource)
			|| RAnge.compAreRAngesUsingStArts(A.mArker, b.mArker);
	}
}

export clAss MArker {

	get resource(): URI { return this.mArker.resource; }
	get rAnge(): IRAnge { return this.mArker; }

	privAte _lines: string[] | undefined;
	get lines(): string[] {
		if (!this._lines) {
			this._lines = this.mArker.messAge.split(/\r\n|\r|\n/g);
		}
		return this._lines;
	}

	constructor(
		reAdonly id: string,
		reAdonly mArker: IMArker,
		reAdonly relAtedInformAtion: RelAtedInformAtion[] = []
	) { }

	toString(): string {
		return JSON.stringify({
			...this.mArker,
			resource: this.mArker.resource.pAth,
			relAtedInformAtion: this.relAtedInformAtion.length ? this.relAtedInformAtion.mAp(r => ({ ...r.rAw, resource: r.rAw.resource.pAth })) : undefined
		}, null, '\t');
	}
}

export clAss RelAtedInformAtion {

	constructor(
		reAdonly id: string,
		reAdonly mArker: IMArker,
		reAdonly rAw: IRelAtedInformAtion
	) { }
}

export interfAce MArkerChAngesEvent {
	reAdonly Added: Set<ResourceMArkers>;
	reAdonly removed: Set<ResourceMArkers>;
	reAdonly updAted: Set<ResourceMArkers>;
}

export clAss MArkersModel {

	privAte cAchedSortedResources: ResourceMArkers[] | undefined = undefined;

	privAte reAdonly _onDidChAnge = new Emitter<MArkerChAngesEvent>();
	reAdonly onDidChAnge: Event<MArkerChAngesEvent> = this._onDidChAnge.event;

	get resourceMArkers(): ResourceMArkers[] {
		if (!this.cAchedSortedResources) {
			this.cAchedSortedResources = [...this.resourcesByUri.vAlues()].sort(compAreResourceMArkers);
		}
		return this.cAchedSortedResources;
	}

	privAte resourcesByUri: MAp<string, ResourceMArkers>;

	constructor() {
		this.resourcesByUri = new MAp<string, ResourceMArkers>();
	}

	privAte _totAl: number = 0;
	get totAl(): number {
		return this._totAl;
	}

	getResourceMArkers(resource: URI): ResourceMArkers | null {
		return withUndefinedAsNull(this.resourcesByUri.get(extUri.getCompArisonKey(resource, true)));
	}

	setResourceMArkers(resourcesMArkers: [URI, IMArker[]][]): void {
		const chAnge: MArkerChAngesEvent = { Added: new Set(), removed: new Set(), updAted: new Set() };
		for (const [resource, rAwMArkers] of resourcesMArkers) {

			const key = extUri.getCompArisonKey(resource, true);
			let resourceMArkers = this.resourcesByUri.get(key);

			if (isNonEmptyArrAy(rAwMArkers)) {
				// updAte, Add
				if (!resourceMArkers) {
					const resourceMArkersId = this.id(resource.toString());
					resourceMArkers = new ResourceMArkers(resourceMArkersId, resource.with({ frAgment: null }));
					this.resourcesByUri.set(key, resourceMArkers);
					chAnge.Added.Add(resourceMArkers);
				} else {
					chAnge.updAted.Add(resourceMArkers);
				}
				const mArkersCountByKey = new MAp<string, number>();
				const mArkers = rAwMArkers.mAp((rAwMArker) => {
					const key = IMArkerDAtA.mAkeKey(rAwMArker);
					const index = mArkersCountByKey.get(key) || 0;
					mArkersCountByKey.set(key, index + 1);

					const mArkerId = this.id(resourceMArkers!.id, key, index, rAwMArker.resource.toString());

					let relAtedInformAtion: RelAtedInformAtion[] | undefined = undefined;
					if (rAwMArker.relAtedInformAtion) {
						relAtedInformAtion = rAwMArker.relAtedInformAtion.mAp((r, index) => new RelAtedInformAtion(this.id(mArkerId, r.resource.toString(), r.stArtLineNumber, r.stArtColumn, r.endLineNumber, r.endColumn, index), rAwMArker, r));
					}

					return new MArker(mArkerId, rAwMArker, relAtedInformAtion);
				});

				this._totAl -= resourceMArkers.totAl;
				resourceMArkers.set(resource, mArkers);
				this._totAl += resourceMArkers.totAl;

			} else if (resourceMArkers) {
				// cleAr
				this._totAl -= resourceMArkers.totAl;
				resourceMArkers.delete(resource);
				this._totAl += resourceMArkers.totAl;
				if (resourceMArkers.totAl === 0) {
					this.resourcesByUri.delete(key);
					chAnge.removed.Add(resourceMArkers);
				} else {
					chAnge.updAted.Add(resourceMArkers);
				}
			}
		}

		this.cAchedSortedResources = undefined;
		if (chAnge.Added.size || chAnge.removed.size || chAnge.updAted.size) {
			this._onDidChAnge.fire(chAnge);
		}
	}

	privAte id(...vAlues: (string | number)[]): string {
		const hAsher = new HAsher();
		for (const vAlue of vAlues) {
			hAsher.hAsh(vAlue);
		}
		return `${hAsher.vAlue}`;
	}

	dispose(): void {
		this._onDidChAnge.dispose();
		this.resourcesByUri.cleAr();
	}
}
