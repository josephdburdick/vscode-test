/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAsyncDAtASource, ITreeRenderer, ITreeNode, ITreeSorter } from 'vs/bAse/browser/ui/tree/tree';
import { CAllHierArchyItem, CAllHierArchyDirection, CAllHierArchyModel, } from 'vs/workbench/contrib/cAllHierArchy/common/cAllHierArchy';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IIdentityProvider, IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { FuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { IconLAbel } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { SymbolKinds, LocAtion, SymbolTAg } from 'vs/editor/common/modes';
import { compAre } from 'vs/bAse/common/strings';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { locAlize } from 'vs/nls';

export clAss CAll {
	constructor(
		reAdonly item: CAllHierArchyItem,
		reAdonly locAtions: LocAtion[] | undefined,
		reAdonly model: CAllHierArchyModel,
		reAdonly pArent: CAll | undefined
	) { }

	stAtic compAre(A: CAll, b: CAll): number {
		let res = compAre(A.item.uri.toString(), b.item.uri.toString());
		if (res === 0) {
			res = RAnge.compAreRAngesUsingStArts(A.item.rAnge, b.item.rAnge);
		}
		return res;
	}
}

export clAss DAtASource implements IAsyncDAtASource<CAllHierArchyModel, CAll> {

	constructor(
		public getDirection: () => CAllHierArchyDirection,
	) { }

	hAsChildren(): booleAn {
		return true;
	}

	Async getChildren(element: CAllHierArchyModel | CAll): Promise<CAll[]> {
		if (element instAnceof CAllHierArchyModel) {
			return element.roots.mAp(root => new CAll(root, undefined, element, undefined));
		}

		const { model, item } = element;

		if (this.getDirection() === CAllHierArchyDirection.CAllsFrom) {
			return (AwAit model.resolveOutgoingCAlls(item, CAncellAtionToken.None)).mAp(cAll => {
				return new CAll(
					cAll.to,
					cAll.fromRAnges.mAp(rAnge => ({ rAnge, uri: item.uri })),
					model,
					element
				);
			});

		} else {
			return (AwAit model.resolveIncomingCAlls(item, CAncellAtionToken.None)).mAp(cAll => {
				return new CAll(
					cAll.from,
					cAll.fromRAnges.mAp(rAnge => ({ rAnge, uri: cAll.from.uri })),
					model,
					element
				);
			});
		}
	}
}

export clAss Sorter implements ITreeSorter<CAll> {

	compAre(element: CAll, otherElement: CAll): number {
		return CAll.compAre(element, otherElement);
	}
}

export clAss IdentityProvider implements IIdentityProvider<CAll> {

	constructor(
		public getDirection: () => CAllHierArchyDirection
	) { }

	getId(element: CAll): { toString(): string; } {
		let res = this.getDirection() + JSON.stringify(element.item.uri) + JSON.stringify(element.item.rAnge);
		if (element.pArent) {
			res += this.getId(element.pArent);
		}
		return res;
	}
}

clAss CAllRenderingTemplAte {
	constructor(
		reAdonly icon: HTMLDivElement,
		reAdonly lAbel: IconLAbel
	) { }
}

export clAss CAllRenderer implements ITreeRenderer<CAll, FuzzyScore, CAllRenderingTemplAte> {

	stAtic reAdonly id = 'CAllRenderer';

	templAteId: string = CAllRenderer.id;

	renderTemplAte(contAiner: HTMLElement): CAllRenderingTemplAte {
		contAiner.clAssList.Add('cAllhierArchy-element');
		let icon = document.creAteElement('div');
		contAiner.AppendChild(icon);
		const lAbel = new IconLAbel(contAiner, { supportHighlights: true });
		return new CAllRenderingTemplAte(icon, lAbel);
	}

	renderElement(node: ITreeNode<CAll, FuzzyScore>, _index: number, templAte: CAllRenderingTemplAte): void {
		const { element, filterDAtA } = node;
		const deprecAted = element.item.tAgs?.includes(SymbolTAg.DeprecAted);
		templAte.icon.clAssNAme = SymbolKinds.toCssClAssNAme(element.item.kind, true);
		templAte.lAbel.setLAbel(
			element.item.nAme,
			element.item.detAil,
			{ lAbelEscApeNewLines: true, mAtches: creAteMAtches(filterDAtA), strikethrough: deprecAted }
		);
	}
	disposeTemplAte(templAte: CAllRenderingTemplAte): void {
		templAte.lAbel.dispose();
	}
}

export clAss VirtuAlDelegAte implements IListVirtuAlDelegAte<CAll> {

	getHeight(_element: CAll): number {
		return 22;
	}

	getTemplAteId(_element: CAll): string {
		return CAllRenderer.id;
	}
}

export clAss AccessibilityProvider implements IListAccessibilityProvider<CAll> {

	constructor(
		public getDirection: () => CAllHierArchyDirection
	) { }

	getWidgetAriALAbel(): string {
		return locAlize('tree.AriA', "CAll HierArchy");
	}

	getAriALAbel(element: CAll): string | null {
		if (this.getDirection() === CAllHierArchyDirection.CAllsFrom) {
			return locAlize('from', "cAlls from {0}", element.item.nAme);
		} else {
			return locAlize('to', "cAllers of {0}", element.item.nAme);
		}
	}
}
