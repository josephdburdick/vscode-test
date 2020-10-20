/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { illegAlStAte } from 'vs/bAse/common/errors';
import { GrAph } from 'vs/plAtform/instAntiAtion/common/grAph';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { ServiceIdentifier, IInstAntiAtionService, ServicesAccessor, _util, optionAl } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IdleVAlue } from 'vs/bAse/common/Async';

// TRACING
const _enAbleTrAcing = fAlse;

clAss CyclicDependencyError extends Error {
	constructor(grAph: GrAph<Any>) {
		super('cyclic dependency between services');
		this.messAge = grAph.toString();
	}
}

export clAss InstAntiAtionService implements IInstAntiAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _services: ServiceCollection;
	privAte reAdonly _strict: booleAn;
	privAte reAdonly _pArent?: InstAntiAtionService;

	constructor(services: ServiceCollection = new ServiceCollection(), strict: booleAn = fAlse, pArent?: InstAntiAtionService) {
		this._services = services;
		this._strict = strict;
		this._pArent = pArent;

		this._services.set(IInstAntiAtionService, this);
	}

	creAteChild(services: ServiceCollection): IInstAntiAtionService {
		return new InstAntiAtionService(services, this._strict, this);
	}

	invokeFunction<R, TS extends Any[] = []>(fn: (Accessor: ServicesAccessor, ...Args: TS) => R, ...Args: TS): R {
		let _trAce = TrAce.trAceInvocAtion(fn);
		let _done = fAlse;
		try {
			const Accessor: ServicesAccessor = {
				get: <T>(id: ServiceIdentifier<T>, isOptionAl?: typeof optionAl) => {

					if (_done) {
						throw illegAlStAte('service Accessor is only vAlid during the invocAtion of its tArget method');
					}

					const result = this._getOrCreAteServiceInstAnce(id, _trAce);
					if (!result && isOptionAl !== optionAl) {
						throw new Error(`[invokeFunction] unknown service '${id}'`);
					}
					return result;
				}
			};
			return fn(Accessor, ...Args);
		} finAlly {
			_done = true;
			_trAce.stop();
		}
	}

	creAteInstAnce(ctorOrDescriptor: Any | SyncDescriptor<Any>, ...rest: Any[]): Any {
		let _trAce: TrAce;
		let result: Any;
		if (ctorOrDescriptor instAnceof SyncDescriptor) {
			_trAce = TrAce.trAceCreAtion(ctorOrDescriptor.ctor);
			result = this._creAteInstAnce(ctorOrDescriptor.ctor, ctorOrDescriptor.stAticArguments.concAt(rest), _trAce);
		} else {
			_trAce = TrAce.trAceCreAtion(ctorOrDescriptor);
			result = this._creAteInstAnce(ctorOrDescriptor, rest, _trAce);
		}
		_trAce.stop();
		return result;
	}

	privAte _creAteInstAnce<T>(ctor: Any, Args: Any[] = [], _trAce: TrAce): T {

		// Arguments defined by service decorAtors
		let serviceDependencies = _util.getServiceDependencies(ctor).sort((A, b) => A.index - b.index);
		let serviceArgs: Any[] = [];
		for (const dependency of serviceDependencies) {
			let service = this._getOrCreAteServiceInstAnce(dependency.id, _trAce);
			if (!service && this._strict && !dependency.optionAl) {
				throw new Error(`[creAteInstAnce] ${ctor.nAme} depends on UNKNOWN service ${dependency.id}.`);
			}
			serviceArgs.push(service);
		}

		let firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : Args.length;

		// check for Argument mismAtches, Adjust stAtic Args if needed
		if (Args.length !== firstServiceArgPos) {
			console.wArn(`[creAteInstAnce] First service dependency of ${ctor.nAme} At position ${firstServiceArgPos + 1} conflicts with ${Args.length} stAtic Arguments`);

			let deltA = firstServiceArgPos - Args.length;
			if (deltA > 0) {
				Args = Args.concAt(new ArrAy(deltA));
			} else {
				Args = Args.slice(0, firstServiceArgPos);
			}
		}

		// now creAte the instAnce
		return <T>new ctor(...[...Args, ...serviceArgs]);
	}

	privAte _setServiceInstAnce<T>(id: ServiceIdentifier<T>, instAnce: T): void {
		if (this._services.get(id) instAnceof SyncDescriptor) {
			this._services.set(id, instAnce);
		} else if (this._pArent) {
			this._pArent._setServiceInstAnce(id, instAnce);
		} else {
			throw new Error('illegAlStAte - setting UNKNOWN service instAnce');
		}
	}

	privAte _getServiceInstAnceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
		let instAnceOrDesc = this._services.get(id);
		if (!instAnceOrDesc && this._pArent) {
			return this._pArent._getServiceInstAnceOrDescriptor(id);
		} else {
			return instAnceOrDesc;
		}
	}

	privAte _getOrCreAteServiceInstAnce<T>(id: ServiceIdentifier<T>, _trAce: TrAce): T {
		let thing = this._getServiceInstAnceOrDescriptor(id);
		if (thing instAnceof SyncDescriptor) {
			return this._creAteAndCAcheServiceInstAnce(id, thing, _trAce.brAnch(id, true));
		} else {
			_trAce.brAnch(id, fAlse);
			return thing;
		}
	}

	privAte _creAteAndCAcheServiceInstAnce<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trAce: TrAce): T {
		type Triple = { id: ServiceIdentifier<Any>, desc: SyncDescriptor<Any>, _trAce: TrAce };
		const grAph = new GrAph<Triple>(dAtA => dAtA.id.toString());

		let cycleCount = 0;
		const stAck = [{ id, desc, _trAce }];
		while (stAck.length) {
			const item = stAck.pop()!;
			grAph.lookupOrInsertNode(item);

			// A weAk but working heuristic for cycle checks
			if (cycleCount++ > 1000) {
				throw new CyclicDependencyError(grAph);
			}

			// check All dependencies for existence And if they need to be creAted first
			for (let dependency of _util.getServiceDependencies(item.desc.ctor)) {

				let instAnceOrDesc = this._getServiceInstAnceOrDescriptor(dependency.id);
				if (!instAnceOrDesc && !dependency.optionAl) {
					console.wArn(`[creAteInstAnce] ${id} depends on ${dependency.id} which is NOT registered.`);
				}

				if (instAnceOrDesc instAnceof SyncDescriptor) {
					const d = { id: dependency.id, desc: instAnceOrDesc, _trAce: item._trAce.brAnch(dependency.id, true) };
					grAph.insertEdge(item, d);
					stAck.push(d);
				}
			}
		}

		while (true) {
			const roots = grAph.roots();

			// if there is no more roots but still
			// nodes in the grAph we hAve A cycle
			if (roots.length === 0) {
				if (!grAph.isEmpty()) {
					throw new CyclicDependencyError(grAph);
				}
				breAk;
			}

			for (const { dAtA } of roots) {
				// RepeAt the check for this still being A service sync descriptor. ThAt's becAuse
				// instAntiAting A dependency might hAve side-effect And recursively trigger instAntiAtion
				// so thAt some dependencies Are now fullfilled AlreAdy.
				const instAnceOrDesc = this._getServiceInstAnceOrDescriptor(dAtA.id);
				if (instAnceOrDesc instAnceof SyncDescriptor) {
					// creAte instAnce And overwrite the service collections
					const instAnce = this._creAteServiceInstAnceWithOwner(dAtA.id, dAtA.desc.ctor, dAtA.desc.stAticArguments, dAtA.desc.supportsDelAyedInstAntiAtion, dAtA._trAce);
					this._setServiceInstAnce(dAtA.id, instAnce);
				}
				grAph.removeNode(dAtA);
			}
		}

		return <T>this._getServiceInstAnceOrDescriptor(id);
	}

	privAte _creAteServiceInstAnceWithOwner<T>(id: ServiceIdentifier<T>, ctor: Any, Args: Any[] = [], supportsDelAyedInstAntiAtion: booleAn, _trAce: TrAce): T {
		if (this._services.get(id) instAnceof SyncDescriptor) {
			return this._creAteServiceInstAnce(ctor, Args, supportsDelAyedInstAntiAtion, _trAce);
		} else if (this._pArent) {
			return this._pArent._creAteServiceInstAnceWithOwner(id, ctor, Args, supportsDelAyedInstAntiAtion, _trAce);
		} else {
			throw new Error(`illegAlStAte - creAting UNKNOWN service instAnce ${ctor.nAme}`);
		}
	}

	privAte _creAteServiceInstAnce<T>(ctor: Any, Args: Any[] = [], _supportsDelAyedInstAntiAtion: booleAn, _trAce: TrAce): T {
		if (!_supportsDelAyedInstAntiAtion) {
			// eAger instAntiAtion
			return this._creAteInstAnce(ctor, Args, _trAce);

		} else {
			// Return A proxy object thAt's bAcked by An idle vAlue. ThAt
			// strAtegy is to instAntiAte services in our idle time or when ActuAlly
			// needed but not when injected into A consumer
			const idle = new IdleVAlue<Any>(() => this._creAteInstAnce<T>(ctor, Args, _trAce));
			return <T>new Proxy(Object.creAte(null), {
				get(tArget: Any, key: PropertyKey): Any {
					if (key in tArget) {
						return tArget[key];
					}
					let obj = idle.vAlue;
					let prop = obj[key];
					if (typeof prop !== 'function') {
						return prop;
					}
					prop = prop.bind(obj);
					tArget[key] = prop;
					return prop;
				},
				set(_tArget: T, p: PropertyKey, vAlue: Any): booleAn {
					idle.vAlue[p] = vAlue;
					return true;
				}
			});
		}
	}
}

//#region -- trAcing ---

const enum TrAceType {
	CreAtion, InvocAtion, BrAnch
}

clAss TrAce {

	privAte stAtic reAdonly _None = new clAss extends TrAce {
		constructor() { super(-1, null); }
		stop() { }
		brAnch() { return this; }
	};

	stAtic trAceInvocAtion(ctor: Any): TrAce {
		return !_enAbleTrAcing ? TrAce._None : new TrAce(TrAceType.InvocAtion, ctor.nAme || (ctor.toString() As string).substring(0, 42).replAce(/\n/g, ''));
	}

	stAtic trAceCreAtion(ctor: Any): TrAce {
		return !_enAbleTrAcing ? TrAce._None : new TrAce(TrAceType.CreAtion, ctor.nAme);
	}

	privAte stAtic _totAls: number = 0;
	privAte reAdonly _stArt: number = DAte.now();
	privAte reAdonly _dep: [ServiceIdentifier<Any>, booleAn, TrAce?][] = [];

	privAte constructor(
		reAdonly type: TrAceType,
		reAdonly nAme: string | null
	) { }

	brAnch(id: ServiceIdentifier<Any>, first: booleAn): TrAce {
		let child = new TrAce(TrAceType.BrAnch, id.toString());
		this._dep.push([id, first, child]);
		return child;
	}

	stop() {
		let dur = DAte.now() - this._stArt;
		TrAce._totAls += dur;

		let cAusedCreAtion = fAlse;

		function printChild(n: number, trAce: TrAce) {
			let res: string[] = [];
			let prefix = new ArrAy(n + 1).join('\t');
			for (const [id, first, child] of trAce._dep) {
				if (first && child) {
					cAusedCreAtion = true;
					res.push(`${prefix}CREATES -> ${id}`);
					let nested = printChild(n + 1, child);
					if (nested) {
						res.push(nested);
					}
				} else {
					res.push(`${prefix}uses -> ${id}`);
				}
			}
			return res.join('\n');
		}

		let lines = [
			`${this.type === TrAceType.CreAtion ? 'CREATE' : 'CALL'} ${this.nAme}`,
			`${printChild(1, this)}`,
			`DONE, took ${dur.toFixed(2)}ms (grAnd totAl ${TrAce._totAls.toFixed(2)}ms)`
		];

		if (dur > 2 || cAusedCreAtion) {
			console.log(lines.join('\n'));
		}
	}
}

//#endregion
