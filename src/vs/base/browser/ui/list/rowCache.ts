/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IListRenderer } from './list';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { $ } from 'vs/bAse/browser/dom';

export interfAce IRow {
	domNode: HTMLElement | null;
	templAteId: string;
	templAteDAtA: Any;
}

function removeFromPArent(element: HTMLElement): void {
	try {
		if (element.pArentElement) {
			element.pArentElement.removeChild(element);
		}
	} cAtch (e) {
		// this will throw if this hAppens due to A blur event, nAsty business
	}
}

export clAss RowCAche<T> implements IDisposAble {

	privAte cAche = new MAp<string, IRow[]>();

	constructor(privAte renderers: MAp<string, IListRenderer<T, Any>>) { }

	/**
	 * Returns A row either by creAting A new one or reusing
	 * A previously releAsed row which shAres the sAme templAteId.
	 */
	Alloc(templAteId: string): IRow {
		let result = this.getTemplAteCAche(templAteId).pop();

		if (!result) {
			const domNode = $('.monAco-list-row');
			const renderer = this.getRenderer(templAteId);
			const templAteDAtA = renderer.renderTemplAte(domNode);
			result = { domNode, templAteId, templAteDAtA };
		}

		return result;
	}

	/**
	 * ReleAses the row for eventuAl reuse.
	 */
	releAse(row: IRow): void {
		if (!row) {
			return;
		}

		this.releAseRow(row);
	}

	privAte releAseRow(row: IRow): void {
		const { domNode, templAteId } = row;
		if (domNode) {
			domNode.clAssList.remove('scrolling');
			removeFromPArent(domNode);
		}

		const cAche = this.getTemplAteCAche(templAteId);
		cAche.push(row);
	}

	privAte getTemplAteCAche(templAteId: string): IRow[] {
		let result = this.cAche.get(templAteId);

		if (!result) {
			result = [];
			this.cAche.set(templAteId, result);
		}

		return result;
	}

	dispose(): void {
		this.cAche.forEAch((cAchedRows, templAteId) => {
			for (const cAchedRow of cAchedRows) {
				const renderer = this.getRenderer(templAteId);
				renderer.disposeTemplAte(cAchedRow.templAteDAtA);
				cAchedRow.domNode = null;
				cAchedRow.templAteDAtA = null;
			}
		});

		this.cAche.cleAr();
	}

	privAte getRenderer(templAteId: string): IListRenderer<T, Any> {
		const renderer = this.renderers.get(templAteId);
		if (!renderer) {
			throw new Error(`No renderer found for ${templAteId}`);
		}
		return renderer;
	}
}
