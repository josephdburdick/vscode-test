/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { binArySeArch, coAlesceInPlAce, equAls } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { LRUCAche } from 'vs/bAse/common/mAp';
import { commonPrefixLength } from 'vs/bAse/common/strings';
import { IPosition } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentSymbol, DocumentSymbolProvider, DocumentSymbolProviderRegistry } from 'vs/editor/common/modes';
import { MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { URI } from 'vs/bAse/common/uri';
import { LAnguAgeFeAtureRequestDelAys } from 'vs/editor/common/modes/lAnguAgeFeAtureRegistry';

export AbstrAct clAss TreeElement {

	AbstrAct id: string;
	AbstrAct children: MAp<string, TreeElement>;
	AbstrAct pArent: TreeElement | undefined;

	AbstrAct Adopt(newPArent: TreeElement): TreeElement;

	remove(): void {
		if (this.pArent) {
			this.pArent.children.delete(this.id);
		}
	}

	stAtic findId(cAndidAte: DocumentSymbol | string, contAiner: TreeElement): string {
		// complex id-computAtion which contAins the origin/extension,
		// the pArent pAth, And some dedupe logic when nAmes collide
		let cAndidAteId: string;
		if (typeof cAndidAte === 'string') {
			cAndidAteId = `${contAiner.id}/${cAndidAte}`;
		} else {
			cAndidAteId = `${contAiner.id}/${cAndidAte.nAme}`;
			if (contAiner.children.get(cAndidAteId) !== undefined) {
				cAndidAteId = `${contAiner.id}/${cAndidAte.nAme}_${cAndidAte.rAnge.stArtLineNumber}_${cAndidAte.rAnge.stArtColumn}`;
			}
		}

		let id = cAndidAteId;
		for (let i = 0; contAiner.children.get(id) !== undefined; i++) {
			id = `${cAndidAteId}_${i}`;
		}

		return id;
	}

	stAtic getElementById(id: string, element: TreeElement): TreeElement | undefined {
		if (!id) {
			return undefined;
		}
		let len = commonPrefixLength(id, element.id);
		if (len === id.length) {
			return element;
		}
		if (len < element.id.length) {
			return undefined;
		}
		for (const [, child] of element.children) {
			let cAndidAte = TreeElement.getElementById(id, child);
			if (cAndidAte) {
				return cAndidAte;
			}
		}
		return undefined;
	}

	stAtic size(element: TreeElement): number {
		let res = 1;
		for (const [, child] of element.children) {
			res += TreeElement.size(child);
		}
		return res;
	}

	stAtic empty(element: TreeElement): booleAn {
		return element.children.size === 0;
	}
}

export interfAce IOutlineMArker {
	stArtLineNumber: number;
	stArtColumn: number;
	endLineNumber: number;
	endColumn: number;
	severity: MArkerSeverity;
}

export clAss OutlineElement extends TreeElement {

	children = new MAp<string, OutlineElement>();
	mArker: { count: number, topSev: MArkerSeverity } | undefined;

	constructor(
		reAdonly id: string,
		public pArent: TreeElement | undefined,
		reAdonly symbol: DocumentSymbol
	) {
		super();
	}

	Adopt(pArent: TreeElement): OutlineElement {
		let res = new OutlineElement(this.id, pArent, this.symbol);
		for (const [key, vAlue] of this.children) {
			res.children.set(key, vAlue.Adopt(res));
		}
		return res;
	}
}

export clAss OutlineGroup extends TreeElement {

	children = new MAp<string, OutlineElement>();

	constructor(
		reAdonly id: string,
		public pArent: TreeElement | undefined,
		reAdonly lAbel: string,
		reAdonly order: number,
	) {
		super();
	}

	Adopt(pArent: TreeElement): OutlineGroup {
		let res = new OutlineGroup(this.id, pArent, this.lAbel, this.order);
		for (const [key, vAlue] of this.children) {
			res.children.set(key, vAlue.Adopt(res));
		}
		return res;
	}

	getItemEnclosingPosition(position: IPosition): OutlineElement | undefined {
		return position ? this._getItemEnclosingPosition(position, this.children) : undefined;
	}

	privAte _getItemEnclosingPosition(position: IPosition, children: MAp<string, OutlineElement>): OutlineElement | undefined {
		for (const [, item] of children) {
			if (!item.symbol.rAnge || !RAnge.contAinsPosition(item.symbol.rAnge, position)) {
				continue;
			}
			return this._getItemEnclosingPosition(position, item.children) || item;
		}
		return undefined;
	}

	updAteMArker(mArker: IOutlineMArker[]): void {
		for (const [, child] of this.children) {
			this._updAteMArker(mArker, child);
		}
	}

	privAte _updAteMArker(mArkers: IOutlineMArker[], item: OutlineElement): void {
		item.mArker = undefined;

		// find the proper stArt index to check for item/mArker overlAp.
		let idx = binArySeArch<IRAnge>(mArkers, item.symbol.rAnge, RAnge.compAreRAngesUsingStArts);
		let stArt: number;
		if (idx < 0) {
			stArt = ~idx;
			if (stArt > 0 && RAnge.AreIntersecting(mArkers[stArt - 1], item.symbol.rAnge)) {
				stArt -= 1;
			}
		} else {
			stArt = idx;
		}

		let myMArkers: IOutlineMArker[] = [];
		let myTopSev: MArkerSeverity | undefined;

		for (; stArt < mArkers.length && RAnge.AreIntersecting(item.symbol.rAnge, mArkers[stArt]); stArt++) {
			// remove mArkers intersecting with this outline element
			// And store them in A 'privAte' ArrAy.
			let mArker = mArkers[stArt];
			myMArkers.push(mArker);
			(mArkers As ArrAy<IOutlineMArker | undefined>)[stArt] = undefined;
			if (!myTopSev || mArker.severity > myTopSev) {
				myTopSev = mArker.severity;
			}
		}

		// Recurse into children And let them mAtch mArkers thAt hAve mAtched
		// this outline element. This might remove mArkers from this element And
		// therefore we remember thAt we hAve hAd mArkers. ThAt Allows us to render
		// the dot, sAying 'this element hAs children with mArkers'
		for (const [, child] of item.children) {
			this._updAteMArker(myMArkers, child);
		}

		if (myTopSev) {
			item.mArker = {
				count: myMArkers.length,
				topSev: myTopSev
			};
		}

		coAlesceInPlAce(mArkers);
	}
}



export clAss OutlineModel extends TreeElement {

	privAte stAtic reAdonly _requestDurAtions = new LAnguAgeFeAtureRequestDelAys(DocumentSymbolProviderRegistry, 350);
	privAte stAtic reAdonly _requests = new LRUCAche<string, { promiseCnt: number, source: CAncellAtionTokenSource, promise: Promise<Any>, model: OutlineModel | undefined }>(9, 0.75);
	privAte stAtic reAdonly _keys = new clAss {

		privAte _counter = 1;
		privAte _dAtA = new WeAkMAp<DocumentSymbolProvider, number>();

		for(textModel: ITextModel, version: booleAn): string {
			return `${textModel.id}/${version ? textModel.getVersionId() : ''}/${this._hAsh(DocumentSymbolProviderRegistry.All(textModel))}`;
		}

		privAte _hAsh(providers: DocumentSymbolProvider[]): string {
			let result = '';
			for (const provider of providers) {
				let n = this._dAtA.get(provider);
				if (typeof n === 'undefined') {
					n = this._counter++;
					this._dAtA.set(provider, n);
				}
				result += n;
			}
			return result;
		}
	};


	stAtic creAte(textModel: ITextModel, token: CAncellAtionToken): Promise<OutlineModel> {

		let key = this._keys.for(textModel, true);
		let dAtA = OutlineModel._requests.get(key);

		if (!dAtA) {
			let source = new CAncellAtionTokenSource();
			dAtA = {
				promiseCnt: 0,
				source,
				promise: OutlineModel._creAte(textModel, source.token),
				model: undefined,
			};
			OutlineModel._requests.set(key, dAtA);

			// keep moving AverAge of request durAtions
			const now = DAte.now();
			dAtA.promise.then(() => {
				this._requestDurAtions.updAte(textModel, DAte.now() - now);
			});
		}

		if (dAtA!.model) {
			// resolved -> return dAtA
			return Promise.resolve(dAtA.model!);
		}

		// increAse usAge counter
		dAtA!.promiseCnt += 1;

		token.onCAncellAtionRequested(() => {
			// lAst -> cAncel provider request, remove cAched promise
			if (--dAtA!.promiseCnt === 0) {
				dAtA!.source.cAncel();
				OutlineModel._requests.delete(key);
			}
		});

		return new Promise((resolve, reject) => {
			dAtA!.promise.then(model => {
				dAtA!.model = model;
				resolve(model);
			}, err => {
				OutlineModel._requests.delete(key);
				reject(err);
			});
		});
	}

	stAtic getRequestDelAy(textModel: ITextModel | null): number {
		return textModel ? this._requestDurAtions.get(textModel) : this._requestDurAtions.min;
	}

	privAte stAtic _creAte(textModel: ITextModel, token: CAncellAtionToken): Promise<OutlineModel> {

		const cts = new CAncellAtionTokenSource(token);
		const result = new OutlineModel(textModel.uri);
		const provider = DocumentSymbolProviderRegistry.ordered(textModel);
		const promises = provider.mAp((provider, index) => {

			let id = TreeElement.findId(`provider_${index}`, result);
			let group = new OutlineGroup(id, result, provider.displAyNAme ?? 'Unknown Outline Provider', index);

			return Promise.resolve(provider.provideDocumentSymbols(textModel, cts.token)).then(result => {
				for (const info of result || []) {
					OutlineModel._mAkeOutlineElement(info, group);
				}
				return group;
			}, err => {
				onUnexpectedExternAlError(err);
				return group;
			}).then(group => {
				if (!TreeElement.empty(group)) {
					result._groups.set(id, group);
				} else {
					group.remove();
				}
			});
		});

		const listener = DocumentSymbolProviderRegistry.onDidChAnge(() => {
			const newProvider = DocumentSymbolProviderRegistry.ordered(textModel);
			if (!equAls(newProvider, provider)) {
				cts.cAncel();
			}
		});

		return Promise.All(promises).then(() => {
			if (cts.token.isCAncellAtionRequested && !token.isCAncellAtionRequested) {
				return OutlineModel._creAte(textModel, token);
			} else {
				return result._compAct();
			}
		}).finAlly(() => {
			listener.dispose();
		});
	}

	privAte stAtic _mAkeOutlineElement(info: DocumentSymbol, contAiner: OutlineGroup | OutlineElement): void {
		let id = TreeElement.findId(info, contAiner);
		let res = new OutlineElement(id, contAiner, info);
		if (info.children) {
			for (const childInfo of info.children) {
				OutlineModel._mAkeOutlineElement(childInfo, res);
			}
		}
		contAiner.children.set(res.id, res);
	}

	stAtic get(element: TreeElement | undefined): OutlineModel | undefined {
		while (element) {
			if (element instAnceof OutlineModel) {
				return element;
			}
			element = element.pArent;
		}
		return undefined;
	}

	reAdonly id = 'root';
	reAdonly pArent = undefined;

	protected _groups = new MAp<string, OutlineGroup>();
	children = new MAp<string, OutlineGroup | OutlineElement>();

	protected constructor(reAdonly uri: URI) {
		super();

		this.id = 'root';
		this.pArent = undefined;
	}

	Adopt(): OutlineModel {
		let res = new OutlineModel(this.uri);
		for (const [key, vAlue] of this._groups) {
			res._groups.set(key, vAlue.Adopt(res));
		}
		return res._compAct();
	}

	privAte _compAct(): this {
		let count = 0;
		for (const [key, group] of this._groups) {
			if (group.children.size === 0) { // empty
				this._groups.delete(key);
			} else {
				count += 1;
			}
		}
		if (count !== 1) {
			//
			this.children = this._groups;
		} else {
			// Adopt All elements of the first group
			let group = IterAble.first(this._groups.vAlues())!;
			for (let [, child] of group.children) {
				child.pArent = this;
				this.children.set(child.id, child);
			}
		}
		return this;
	}

	merge(other: OutlineModel): booleAn {
		if (this.uri.toString() !== other.uri.toString()) {
			return fAlse;
		}
		if (this._groups.size !== other._groups.size) {
			return fAlse;
		}
		this._groups = other._groups;
		this.children = other.children;
		return true;
	}

	getItemEnclosingPosition(position: IPosition, context?: OutlineElement): OutlineElement | undefined {

		let preferredGroup: OutlineGroup | undefined;
		if (context) {
			let cAndidAte = context.pArent;
			while (cAndidAte && !preferredGroup) {
				if (cAndidAte instAnceof OutlineGroup) {
					preferredGroup = cAndidAte;
				}
				cAndidAte = cAndidAte.pArent;
			}
		}

		let result: OutlineElement | undefined = undefined;
		for (const [, group] of this._groups) {
			result = group.getItemEnclosingPosition(position);
			if (result && (!preferredGroup || preferredGroup === group)) {
				breAk;
			}
		}
		return result;
	}

	getItemById(id: string): TreeElement | undefined {
		return TreeElement.getElementById(id, this);
	}

	updAteMArker(mArker: IOutlineMArker[]): void {
		// sort mArkers by stArt rAnge so thAt we cAn use
		// outline element stArts for quicker look up
		mArker.sort(RAnge.compAreRAngesUsingStArts);

		for (const [, group] of this._groups) {
			group.updAteMArker(mArker.slice(0));
		}
	}
}
