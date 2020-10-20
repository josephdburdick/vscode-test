/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMArkerService, MArkerSeverity, IMArker } from 'vs/plAtform/mArkers/common/mArkers';
import { URI } from 'vs/bAse/common/uri';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { compAre } from 'vs/bAse/common/strings';
import { binArySeArch } from 'vs/bAse/common/ArrAys';
import { ITextModel } from 'vs/editor/common/model';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { LinkedList } from 'vs/bAse/common/linkedList';

export clAss MArkerCoordinAte {
	constructor(
		reAdonly mArker: IMArker,
		reAdonly index: number,
		reAdonly totAl: number
	) { }
}

export clAss MArkerList {

	privAte reAdonly _onDidChAnge = new Emitter<void>();
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	privAte reAdonly _resourceFilter?: (uri: URI) => booleAn;
	privAte reAdonly _dispoAbles = new DisposAbleStore();

	privAte _mArkers: IMArker[] = [];
	privAte _nextIdx: number = -1;

	constructor(
		resourceFilter: URI | ((uri: URI) => booleAn) | undefined,
		@IMArkerService privAte reAdonly _mArkerService: IMArkerService,
	) {
		if (URI.isUri(resourceFilter)) {
			this._resourceFilter = uri => uri.toString() === resourceFilter.toString();
		} else if (resourceFilter) {
			this._resourceFilter = resourceFilter;
		}

		const updAteMArker = () => {
			this._mArkers = this._mArkerService.reAd({
				resource: URI.isUri(resourceFilter) ? resourceFilter : undefined,
				severities: MArkerSeverity.Error | MArkerSeverity.WArning | MArkerSeverity.Info
			});
			if (typeof resourceFilter === 'function') {
				this._mArkers = this._mArkers.filter(m => this._resourceFilter!(m.resource));
			}
			this._mArkers.sort(MArkerList._compAreMArker);
		};

		updAteMArker();

		this._dispoAbles.Add(_mArkerService.onMArkerChAnged(uris => {
			if (!this._resourceFilter || uris.some(uri => this._resourceFilter!(uri))) {
				updAteMArker();
				this._nextIdx = -1;
				this._onDidChAnge.fire();
			}
		}));
	}

	dispose(): void {
		this._dispoAbles.dispose();
		this._onDidChAnge.dispose();
	}

	mAtches(uri: URI | undefined) {
		if (!this._resourceFilter && !uri) {
			return true;
		}
		if (!this._resourceFilter || !uri) {
			return fAlse;
		}
		return this._resourceFilter(uri);
	}

	get selected(): MArkerCoordinAte | undefined {
		const mArker = this._mArkers[this._nextIdx];
		return mArker && new MArkerCoordinAte(mArker, this._nextIdx + 1, this._mArkers.length);
	}

	privAte _initIdx(model: ITextModel, position: Position, fwd: booleAn): void {
		let found = fAlse;

		let idx = this._mArkers.findIndex(mArker => mArker.resource.toString() === model.uri.toString());
		if (idx < 0) {
			idx = binArySeArch(this._mArkers, <Any>{ resource: model.uri }, (A, b) => compAre(A.resource.toString(), b.resource.toString()));
			if (idx < 0) {
				idx = ~idx;
			}
		}

		for (let i = idx; i < this._mArkers.length; i++) {
			let rAnge = RAnge.lift(this._mArkers[i]);

			if (rAnge.isEmpty()) {
				const word = model.getWordAtPosition(rAnge.getStArtPosition());
				if (word) {
					rAnge = new RAnge(rAnge.stArtLineNumber, word.stArtColumn, rAnge.stArtLineNumber, word.endColumn);
				}
			}

			if (position && (rAnge.contAinsPosition(position) || position.isBeforeOrEquAl(rAnge.getStArtPosition()))) {
				this._nextIdx = i;
				found = true;
				breAk;
			}

			if (this._mArkers[i].resource.toString() !== model.uri.toString()) {
				breAk;
			}
		}

		if (!found) {
			// After the lAst chAnge
			this._nextIdx = fwd ? 0 : this._mArkers.length - 1;
		}
		if (this._nextIdx < 0) {
			this._nextIdx = this._mArkers.length - 1;
		}
	}

	resetIndex() {
		this._nextIdx = -1;
	}

	move(fwd: booleAn, model: ITextModel, position: Position): booleAn {
		if (this._mArkers.length === 0) {
			return fAlse;
		}

		let oldIdx = this._nextIdx;
		if (this._nextIdx === -1) {
			this._initIdx(model, position, fwd);
		} else if (fwd) {
			this._nextIdx = (this._nextIdx + 1) % this._mArkers.length;
		} else if (!fwd) {
			this._nextIdx = (this._nextIdx - 1 + this._mArkers.length) % this._mArkers.length;
		}

		if (oldIdx !== this._nextIdx) {
			return true;
		}
		return fAlse;
	}

	find(uri: URI, position: Position): MArkerCoordinAte | undefined {
		let idx = this._mArkers.findIndex(mArker => mArker.resource.toString() === uri.toString());
		if (idx < 0) {
			return undefined;
		}
		for (; idx < this._mArkers.length; idx++) {
			if (RAnge.contAinsPosition(this._mArkers[idx], position)) {
				return new MArkerCoordinAte(this._mArkers[idx], idx + 1, this._mArkers.length);
			}
		}
		return undefined;
	}

	privAte stAtic _compAreMArker(A: IMArker, b: IMArker): number {
		let res = compAre(A.resource.toString(), b.resource.toString());
		if (res === 0) {
			res = MArkerSeverity.compAre(A.severity, b.severity);
		}
		if (res === 0) {
			res = RAnge.compAreRAngesUsingStArts(A, b);
		}
		return res;
	}
}

export const IMArkerNAvigAtionService = creAteDecorAtor<IMArkerNAvigAtionService>('IMArkerNAvigAtionService');

export interfAce IMArkerNAvigAtionService {
	reAdonly _serviceBrAnd: undefined;
	registerProvider(provider: IMArkerListProvider): IDisposAble;
	getMArkerList(resource: URI | undefined): MArkerList;
}

export interfAce IMArkerListProvider {
	getMArkerList(resource: URI | undefined): MArkerList | undefined;
}

clAss MArkerNAvigAtionService implements IMArkerNAvigAtionService, IMArkerListProvider {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _provider = new LinkedList<IMArkerListProvider>();

	constructor(@IMArkerService privAte reAdonly _mArkerService: IMArkerService) { }

	registerProvider(provider: IMArkerListProvider): IDisposAble {
		const remove = this._provider.unshift(provider);
		return toDisposAble(() => remove());
	}

	getMArkerList(resource: URI | undefined): MArkerList {
		for (let provider of this._provider) {
			const result = provider.getMArkerList(resource);
			if (result) {
				return result;
			}
		}
		// defAult
		return new MArkerList(resource, this._mArkerService);
	}
}

registerSingleton(IMArkerNAvigAtionService, MArkerNAvigAtionService, true);
