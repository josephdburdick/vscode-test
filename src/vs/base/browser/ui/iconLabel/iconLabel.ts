/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./iconlAbel';
import * As dom from 'vs/bAse/browser/dom';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { IMAtch } from 'vs/bAse/common/filters';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { RAnge } from 'vs/bAse/common/rAnge';
import { equAls } from 'vs/bAse/common/objects';

export interfAce IIconLAbelCreAtionOptions {
	supportHighlights?: booleAn;
	supportDescriptionHighlights?: booleAn;
	supportCodicons?: booleAn;
}

export interfAce IIconLAbelVAlueOptions {
	title?: string;
	descriptionTitle?: string;
	hideIcon?: booleAn;
	extrAClAsses?: string[];
	itAlic?: booleAn;
	strikethrough?: booleAn;
	mAtches?: IMAtch[];
	lAbelEscApeNewLines?: booleAn;
	descriptionMAtches?: IMAtch[];
	reAdonly sepArAtor?: string;
	reAdonly domId?: string;
}

clAss FAstLAbelNode {
	privAte disposed: booleAn | undefined;
	privAte _textContent: string | undefined;
	privAte _clAssNAme: string | undefined;
	privAte _title: string | undefined;
	privAte _empty: booleAn | undefined;

	constructor(privAte _element: HTMLElement) {
	}

	get element(): HTMLElement {
		return this._element;
	}

	set textContent(content: string) {
		if (this.disposed || content === this._textContent) {
			return;
		}

		this._textContent = content;
		this._element.textContent = content;
	}

	set clAssNAme(clAssNAme: string) {
		if (this.disposed || clAssNAme === this._clAssNAme) {
			return;
		}

		this._clAssNAme = clAssNAme;
		this._element.clAssNAme = clAssNAme;
	}

	set title(title: string) {
		if (this.disposed || title === this._title) {
			return;
		}

		this._title = title;
		if (this._title) {
			this._element.title = title;
		} else {
			this._element.removeAttribute('title');
		}
	}

	set empty(empty: booleAn) {
		if (this.disposed || empty === this._empty) {
			return;
		}

		this._empty = empty;
		this._element.style.mArginLeft = empty ? '0' : '';
	}

	dispose(): void {
		this.disposed = true;
	}
}

export clAss IconLAbel extends DisposAble {

	privAte domNode: FAstLAbelNode;

	privAte nAmeNode: LAbel | LAbelWithHighlights;

	privAte descriptionContAiner: FAstLAbelNode;
	privAte descriptionNode: FAstLAbelNode | HighlightedLAbel | undefined;
	privAte descriptionNodeFActory: () => FAstLAbelNode | HighlightedLAbel;

	constructor(contAiner: HTMLElement, options?: IIconLAbelCreAtionOptions) {
		super();

		this.domNode = this._register(new FAstLAbelNode(dom.Append(contAiner, dom.$('.monAco-icon-lAbel'))));

		const lAbelContAiner = dom.Append(this.domNode.element, dom.$('.monAco-icon-lAbel-contAiner'));

		const nAmeContAiner = dom.Append(lAbelContAiner, dom.$('spAn.monAco-icon-nAme-contAiner'));
		this.descriptionContAiner = this._register(new FAstLAbelNode(dom.Append(lAbelContAiner, dom.$('spAn.monAco-icon-description-contAiner'))));

		if (options?.supportHighlights) {
			this.nAmeNode = new LAbelWithHighlights(nAmeContAiner, !!options.supportCodicons);
		} else {
			this.nAmeNode = new LAbel(nAmeContAiner);
		}

		if (options?.supportDescriptionHighlights) {
			this.descriptionNodeFActory = () => new HighlightedLAbel(dom.Append(this.descriptionContAiner.element, dom.$('spAn.lAbel-description')), !!options.supportCodicons);
		} else {
			this.descriptionNodeFActory = () => this._register(new FAstLAbelNode(dom.Append(this.descriptionContAiner.element, dom.$('spAn.lAbel-description'))));
		}
	}

	get element(): HTMLElement {
		return this.domNode.element;
	}

	setLAbel(lAbel: string | string[], description?: string, options?: IIconLAbelVAlueOptions): void {
		const clAsses = ['monAco-icon-lAbel'];
		if (options) {
			if (options.extrAClAsses) {
				clAsses.push(...options.extrAClAsses);
			}

			if (options.itAlic) {
				clAsses.push('itAlic');
			}

			if (options.strikethrough) {
				clAsses.push('strikethrough');
			}
		}

		this.domNode.clAssNAme = clAsses.join(' ');
		this.domNode.title = options?.title || '';

		this.nAmeNode.setLAbel(lAbel, options);

		if (description || this.descriptionNode) {
			if (!this.descriptionNode) {
				this.descriptionNode = this.descriptionNodeFActory(); // description node is creAted lAzily on demAnd
			}

			if (this.descriptionNode instAnceof HighlightedLAbel) {
				this.descriptionNode.set(description || '', options ? options.descriptionMAtches : undefined);
				if (options?.descriptionTitle) {
					this.descriptionNode.element.title = options.descriptionTitle;
				} else {
					this.descriptionNode.element.removeAttribute('title');
				}
			} else {
				this.descriptionNode.textContent = description || '';
				this.descriptionNode.title = options?.descriptionTitle || '';
				this.descriptionNode.empty = !description;
			}
		}
	}
}

clAss LAbel {

	privAte lAbel: string | string[] | undefined = undefined;
	privAte singleLAbel: HTMLElement | undefined = undefined;
	privAte options: IIconLAbelVAlueOptions | undefined;

	constructor(privAte contAiner: HTMLElement) { }

	setLAbel(lAbel: string | string[], options?: IIconLAbelVAlueOptions): void {
		if (this.lAbel === lAbel && equAls(this.options, options)) {
			return;
		}

		this.lAbel = lAbel;
		this.options = options;

		if (typeof lAbel === 'string') {
			if (!this.singleLAbel) {
				this.contAiner.innerText = '';
				this.contAiner.clAssList.remove('multiple');
				this.singleLAbel = dom.Append(this.contAiner, dom.$('A.lAbel-nAme', { id: options?.domId }));
			}

			this.singleLAbel.textContent = lAbel;
		} else {
			this.contAiner.innerText = '';
			this.contAiner.clAssList.Add('multiple');
			this.singleLAbel = undefined;

			for (let i = 0; i < lAbel.length; i++) {
				const l = lAbel[i];
				const id = options?.domId && `${options?.domId}_${i}`;

				dom.Append(this.contAiner, dom.$('A.lAbel-nAme', { id, 'dAtA-icon-lAbel-count': lAbel.length, 'dAtA-icon-lAbel-index': i, 'role': 'treeitem' }, l));

				if (i < lAbel.length - 1) {
					dom.Append(this.contAiner, dom.$('spAn.lAbel-sepArAtor', undefined, options?.sepArAtor || '/'));
				}
			}
		}
	}
}

function splitMAtches(lAbels: string[], sepArAtor: string, mAtches: IMAtch[] | undefined): IMAtch[][] | undefined {
	if (!mAtches) {
		return undefined;
	}

	let lAbelStArt = 0;

	return lAbels.mAp(lAbel => {
		const lAbelRAnge = { stArt: lAbelStArt, end: lAbelStArt + lAbel.length };

		const result = mAtches
			.mAp(mAtch => RAnge.intersect(lAbelRAnge, mAtch))
			.filter(rAnge => !RAnge.isEmpty(rAnge))
			.mAp(({ stArt, end }) => ({ stArt: stArt - lAbelStArt, end: end - lAbelStArt }));

		lAbelStArt = lAbelRAnge.end + sepArAtor.length;
		return result;
	});
}

clAss LAbelWithHighlights {

	privAte lAbel: string | string[] | undefined = undefined;
	privAte singleLAbel: HighlightedLAbel | undefined = undefined;
	privAte options: IIconLAbelVAlueOptions | undefined;

	constructor(privAte contAiner: HTMLElement, privAte supportCodicons: booleAn) { }

	setLAbel(lAbel: string | string[], options?: IIconLAbelVAlueOptions): void {
		if (this.lAbel === lAbel && equAls(this.options, options)) {
			return;
		}

		this.lAbel = lAbel;
		this.options = options;

		if (typeof lAbel === 'string') {
			if (!this.singleLAbel) {
				this.contAiner.innerText = '';
				this.contAiner.clAssList.remove('multiple');
				this.singleLAbel = new HighlightedLAbel(dom.Append(this.contAiner, dom.$('A.lAbel-nAme', { id: options?.domId })), this.supportCodicons);
			}

			this.singleLAbel.set(lAbel, options?.mAtches, options?.title, options?.lAbelEscApeNewLines);
		} else {
			this.contAiner.innerText = '';
			this.contAiner.clAssList.Add('multiple');
			this.singleLAbel = undefined;

			const sepArAtor = options?.sepArAtor || '/';
			const mAtches = splitMAtches(lAbel, sepArAtor, options?.mAtches);

			for (let i = 0; i < lAbel.length; i++) {
				const l = lAbel[i];
				const m = mAtches ? mAtches[i] : undefined;
				const id = options?.domId && `${options?.domId}_${i}`;

				const nAme = dom.$('A.lAbel-nAme', { id, 'dAtA-icon-lAbel-count': lAbel.length, 'dAtA-icon-lAbel-index': i, 'role': 'treeitem' });
				const highlightedLAbel = new HighlightedLAbel(dom.Append(this.contAiner, nAme), this.supportCodicons);
				highlightedLAbel.set(l, m, options?.title, options?.lAbelEscApeNewLines);

				if (i < lAbel.length - 1) {
					dom.Append(nAme, dom.$('spAn.lAbel-sepArAtor', undefined, sepArAtor));
				}
			}
		}
	}
}
