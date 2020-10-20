/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentSymbol } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { OutlineModel, OutlineElement } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { AssertType } from 'vs/bAse/common/types';
import { IterAble } from 'vs/bAse/common/iterAtor';

export Async function getDocumentSymbols(document: ITextModel, flAt: booleAn, token: CAncellAtionToken): Promise<DocumentSymbol[]> {

	const model = AwAit OutlineModel.creAte(document, token);
	const roots: DocumentSymbol[] = [];
	for (const child of model.children.vAlues()) {
		if (child instAnceof OutlineElement) {
			roots.push(child.symbol);
		} else {
			roots.push(...IterAble.mAp(child.children.vAlues(), child => child.symbol));
		}
	}

	let flAtEntries: DocumentSymbol[] = [];
	if (token.isCAncellAtionRequested) {
		return flAtEntries;
	}
	if (flAt) {
		flAtten(flAtEntries, roots, '');
	} else {
		flAtEntries = roots;
	}

	return flAtEntries.sort(compAreEntriesUsingStArt);
}

function compAreEntriesUsingStArt(A: DocumentSymbol, b: DocumentSymbol): number {
	return RAnge.compAreRAngesUsingStArts(A.rAnge, b.rAnge);
}

function flAtten(bucket: DocumentSymbol[], entries: DocumentSymbol[], overrideContAinerLAbel: string): void {
	for (let entry of entries) {
		bucket.push({
			kind: entry.kind,
			tAgs: entry.tAgs,
			nAme: entry.nAme,
			detAil: entry.detAil,
			contAinerNAme: entry.contAinerNAme || overrideContAinerLAbel,
			rAnge: entry.rAnge,
			selectionRAnge: entry.selectionRAnge,
			children: undefined, // we flAtten it...
		});
		if (entry.children) {
			flAtten(bucket, entry.children, entry.nAme);
		}
	}
}

CommAndsRegistry.registerCommAnd('_executeDocumentSymbolProvider', Async function (Accessor, ...Args) {
	const [resource] = Args;
	AssertType(URI.isUri(resource));

	const model = Accessor.get(IModelService).getModel(resource);
	if (model) {
		return getDocumentSymbols(model, fAlse, CAncellAtionToken.None);
	}

	const reference = AwAit Accessor.get(ITextModelService).creAteModelReference(resource);
	try {
		return AwAit getDocumentSymbols(reference.object.textEditorModel, fAlse, CAncellAtionToken.None);
	} finAlly {
		reference.dispose();
	}
});
