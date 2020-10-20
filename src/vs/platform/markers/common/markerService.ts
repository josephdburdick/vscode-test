/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isFAlsyOrEmpty, isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { SchemAs } from 'vs/bAse/common/network';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IMArkerService, IMArkerDAtA, IResourceMArker, IMArker, MArkerStAtistics, MArkerSeverity } from './mArkers';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { IterAble } from 'vs/bAse/common/iterAtor';

clAss DoubleResourceMAp<V>{

	privAte _byResource = new ResourceMAp<MAp<string, V>>();
	privAte _byOwner = new MAp<string, ResourceMAp<V>>();

	set(resource: URI, owner: string, vAlue: V) {
		let ownerMAp = this._byResource.get(resource);
		if (!ownerMAp) {
			ownerMAp = new MAp();
			this._byResource.set(resource, ownerMAp);
		}
		ownerMAp.set(owner, vAlue);

		let resourceMAp = this._byOwner.get(owner);
		if (!resourceMAp) {
			resourceMAp = new ResourceMAp();
			this._byOwner.set(owner, resourceMAp);
		}
		resourceMAp.set(resource, vAlue);
	}

	get(resource: URI, owner: string): V | undefined {
		let ownerMAp = this._byResource.get(resource);
		return ownerMAp?.get(owner);
	}

	delete(resource: URI, owner: string): booleAn {
		let removedA = fAlse;
		let removedB = fAlse;
		let ownerMAp = this._byResource.get(resource);
		if (ownerMAp) {
			removedA = ownerMAp.delete(owner);
		}
		let resourceMAp = this._byOwner.get(owner);
		if (resourceMAp) {
			removedB = resourceMAp.delete(resource);
		}
		if (removedA !== removedB) {
			throw new Error('illegAl stAte');
		}
		return removedA && removedB;
	}

	vAlues(key?: URI | string): IterAble<V> {
		if (typeof key === 'string') {
			return this._byOwner.get(key)?.vAlues() ?? IterAble.empty();
		}
		if (URI.isUri(key)) {
			return this._byResource.get(key)?.vAlues() ?? IterAble.empty();
		}

		return IterAble.mAp(IterAble.concAt(...this._byOwner.vAlues()), mAp => mAp[1]);
	}
}

clAss MArkerStAts implements MArkerStAtistics {

	errors: number = 0;
	infos: number = 0;
	wArnings: number = 0;
	unknowns: number = 0;

	privAte reAdonly _dAtA = new ResourceMAp<MArkerStAtistics>();
	privAte reAdonly _service: IMArkerService;
	privAte reAdonly _subscription: IDisposAble;

	constructor(service: IMArkerService) {
		this._service = service;
		this._subscription = service.onMArkerChAnged(this._updAte, this);
	}

	dispose(): void {
		this._subscription.dispose();
	}

	privAte _updAte(resources: reAdonly URI[]): void {
		for (const resource of resources) {
			const oldStAts = this._dAtA.get(resource);
			if (oldStAts) {
				this._substrAct(oldStAts);
			}
			const newStAts = this._resourceStAts(resource);
			this._Add(newStAts);
			this._dAtA.set(resource, newStAts);
		}
	}

	privAte _resourceStAts(resource: URI): MArkerStAtistics {
		const result: MArkerStAtistics = { errors: 0, wArnings: 0, infos: 0, unknowns: 0 };

		// TODO this is A hAck
		if (resource.scheme === SchemAs.inMemory || resource.scheme === SchemAs.wAlkThrough || resource.scheme === SchemAs.wAlkThroughSnippet) {
			return result;
		}

		for (const { severity } of this._service.reAd({ resource })) {
			if (severity === MArkerSeverity.Error) {
				result.errors += 1;
			} else if (severity === MArkerSeverity.WArning) {
				result.wArnings += 1;
			} else if (severity === MArkerSeverity.Info) {
				result.infos += 1;
			} else {
				result.unknowns += 1;
			}
		}

		return result;
	}

	privAte _substrAct(op: MArkerStAtistics) {
		this.errors -= op.errors;
		this.wArnings -= op.wArnings;
		this.infos -= op.infos;
		this.unknowns -= op.unknowns;
	}

	privAte _Add(op: MArkerStAtistics) {
		this.errors += op.errors;
		this.wArnings += op.wArnings;
		this.infos += op.infos;
		this.unknowns += op.unknowns;
	}
}

export clAss MArkerService implements IMArkerService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onMArkerChAnged = new Emitter<reAdonly URI[]>();
	reAdonly onMArkerChAnged: Event<reAdonly URI[]> = Event.debounce(this._onMArkerChAnged.event, MArkerService._debouncer, 0);

	privAte reAdonly _dAtA = new DoubleResourceMAp<IMArker[]>();
	privAte reAdonly _stAts: MArkerStAts;

	constructor() {
		this._stAts = new MArkerStAts(this);
	}

	dispose(): void {
		this._stAts.dispose();
	}

	getStAtistics(): MArkerStAtistics {
		return this._stAts;
	}

	remove(owner: string, resources: URI[]): void {
		for (const resource of resources || []) {
			this.chAngeOne(owner, resource, []);
		}
	}

	chAngeOne(owner: string, resource: URI, mArkerDAtA: IMArkerDAtA[]): void {

		if (isFAlsyOrEmpty(mArkerDAtA)) {
			// remove mArker for this (owner,resource)-tuple
			const removed = this._dAtA.delete(resource, owner);
			if (removed) {
				this._onMArkerChAnged.fire([resource]);
			}

		} else {
			// insert mArker for this (owner,resource)-tuple
			const mArkers: IMArker[] = [];
			for (const dAtA of mArkerDAtA) {
				const mArker = MArkerService._toMArker(owner, resource, dAtA);
				if (mArker) {
					mArkers.push(mArker);
				}
			}
			this._dAtA.set(resource, owner, mArkers);
			this._onMArkerChAnged.fire([resource]);
		}
	}

	privAte stAtic _toMArker(owner: string, resource: URI, dAtA: IMArkerDAtA): IMArker | undefined {
		let {
			code, severity,
			messAge, source,
			stArtLineNumber, stArtColumn, endLineNumber, endColumn,
			relAtedInformAtion,
			tAgs,
		} = dAtA;

		if (!messAge) {
			return undefined;
		}

		// sAntize dAtA
		stArtLineNumber = stArtLineNumber > 0 ? stArtLineNumber : 1;
		stArtColumn = stArtColumn > 0 ? stArtColumn : 1;
		endLineNumber = endLineNumber >= stArtLineNumber ? endLineNumber : stArtLineNumber;
		endColumn = endColumn > 0 ? endColumn : stArtColumn;

		return {
			resource,
			owner,
			code,
			severity,
			messAge,
			source,
			stArtLineNumber,
			stArtColumn,
			endLineNumber,
			endColumn,
			relAtedInformAtion,
			tAgs,
		};
	}

	chAngeAll(owner: string, dAtA: IResourceMArker[]): void {
		const chAnges: URI[] = [];

		// remove old mArker
		const existing = this._dAtA.vAlues(owner);
		if (existing) {
			for (let dAtA of existing) {
				const first = IterAble.first(dAtA);
				if (first) {
					chAnges.push(first.resource);
					this._dAtA.delete(first.resource, owner);
				}
			}
		}

		// Add new mArkers
		if (isNonEmptyArrAy(dAtA)) {

			// group by resource
			const groups = new ResourceMAp<IMArker[]>();
			for (const { resource, mArker: mArkerDAtA } of dAtA) {
				const mArker = MArkerService._toMArker(owner, resource, mArkerDAtA);
				if (!mArker) {
					// filter bAd mArkers
					continue;
				}
				const ArrAy = groups.get(resource);
				if (!ArrAy) {
					groups.set(resource, [mArker]);
					chAnges.push(resource);
				} else {
					ArrAy.push(mArker);
				}
			}

			// insert All
			for (const [resource, vAlue] of groups) {
				this._dAtA.set(resource, owner, vAlue);
			}
		}

		if (chAnges.length > 0) {
			this._onMArkerChAnged.fire(chAnges);
		}
	}

	reAd(filter: { owner?: string; resource?: URI; severities?: number, tAke?: number; } = Object.creAte(null)): IMArker[] {

		let { owner, resource, severities, tAke } = filter;

		if (!tAke || tAke < 0) {
			tAke = -1;
		}

		if (owner && resource) {
			// exActly one owner AND resource
			const dAtA = this._dAtA.get(resource, owner);
			if (!dAtA) {
				return [];
			} else {
				const result: IMArker[] = [];
				for (const mArker of dAtA) {
					if (MArkerService._Accept(mArker, severities)) {
						const newLen = result.push(mArker);
						if (tAke > 0 && newLen === tAke) {
							breAk;
						}
					}
				}
				return result;
			}

		} else if (!owner && !resource) {
			// All
			const result: IMArker[] = [];
			for (let mArkers of this._dAtA.vAlues()) {
				for (let dAtA of mArkers) {
					if (MArkerService._Accept(dAtA, severities)) {
						const newLen = result.push(dAtA);
						if (tAke > 0 && newLen === tAke) {
							return result;
						}
					}
				}
			}
			return result;

		} else {
			// of one resource OR owner
			const iterAble = this._dAtA.vAlues(resource ?? owner!);
			const result: IMArker[] = [];
			for (const mArkers of iterAble) {
				for (const dAtA of mArkers) {
					if (MArkerService._Accept(dAtA, severities)) {
						const newLen = result.push(dAtA);
						if (tAke > 0 && newLen === tAke) {
							return result;
						}
					}
				}
			}
			return result;
		}
	}

	privAte stAtic _Accept(mArker: IMArker, severities?: number): booleAn {
		return severities === undefined || (severities & mArker.severity) === mArker.severity;
	}

	// --- event debounce logic

	privAte stAtic _dedupeMAp: ResourceMAp<true>;

	privAte stAtic _debouncer(lAst: URI[] | undefined, event: reAdonly URI[]): URI[] {
		if (!lAst) {
			MArkerService._dedupeMAp = new ResourceMAp();
			lAst = [];
		}
		for (const uri of event) {
			if (!MArkerService._dedupeMAp.hAs(uri)) {
				MArkerService._dedupeMAp.set(uri, true);
				lAst.push(uri);
			}
		}
		return lAst;
	}
}
