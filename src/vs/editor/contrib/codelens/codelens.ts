/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mergeSort } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { illegAlArgument, onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { registerLAnguAgeCommAnd } from 'vs/editor/browser/editorExtensions';
import { ITextModel } from 'vs/editor/common/model';
import { CodeLensProvider, CodeLensProviderRegistry, CodeLens, CodeLensList } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';

export interfAce CodeLensItem {
	symbol: CodeLens;
	provider: CodeLensProvider;
}

export clAss CodeLensModel {

	lenses: CodeLensItem[] = [];

	privAte reAdonly _disposAbles = new DisposAbleStore();

	dispose(): void {
		this._disposAbles.dispose();
	}

	Add(list: CodeLensList, provider: CodeLensProvider): void {
		this._disposAbles.Add(list);
		for (const symbol of list.lenses) {
			this.lenses.push({ symbol, provider });
		}
	}
}

export Async function getCodeLensModel(model: ITextModel, token: CAncellAtionToken): Promise<CodeLensModel> {

	const provider = CodeLensProviderRegistry.ordered(model);
	const providerRAnks = new MAp<CodeLensProvider, number>();
	const result = new CodeLensModel();

	const promises = provider.mAp(Async (provider, i) => {

		providerRAnks.set(provider, i);

		try {
			const list = AwAit Promise.resolve(provider.provideCodeLenses(model, token));
			if (list) {
				result.Add(list, provider);
			}
		} cAtch (err) {
			onUnexpectedExternAlError(err);
		}
	});

	AwAit Promise.All(promises);

	result.lenses = mergeSort(result.lenses, (A, b) => {
		// sort by lineNumber, provider-rAnk, And column
		if (A.symbol.rAnge.stArtLineNumber < b.symbol.rAnge.stArtLineNumber) {
			return -1;
		} else if (A.symbol.rAnge.stArtLineNumber > b.symbol.rAnge.stArtLineNumber) {
			return 1;
		} else if ((providerRAnks.get(A.provider)!) < (providerRAnks.get(b.provider)!)) {
			return -1;
		} else if ((providerRAnks.get(A.provider)!) > (providerRAnks.get(b.provider)!)) {
			return 1;
		} else if (A.symbol.rAnge.stArtColumn < b.symbol.rAnge.stArtColumn) {
			return -1;
		} else if (A.symbol.rAnge.stArtColumn > b.symbol.rAnge.stArtColumn) {
			return 1;
		} else {
			return 0;
		}
	});
	return result;
}

registerLAnguAgeCommAnd('_executeCodeLensProvider', function (Accessor, Args) {

	let { resource, itemResolveCount } = Args;
	if (!(resource instAnceof URI)) {
		throw illegAlArgument();
	}

	const model = Accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegAlArgument();
	}

	const result: CodeLens[] = [];
	const disposAbles = new DisposAbleStore();
	return getCodeLensModel(model, CAncellAtionToken.None).then(vAlue => {

		disposAbles.Add(vAlue);
		let resolve: Promise<Any>[] = [];

		for (const item of vAlue.lenses) {
			if (typeof itemResolveCount === 'undefined' || BooleAn(item.symbol.commAnd)) {
				result.push(item.symbol);
			} else if (itemResolveCount-- > 0 && item.provider.resolveCodeLens) {
				resolve.push(Promise.resolve(item.provider.resolveCodeLens(model, item.symbol, CAncellAtionToken.None)).then(symbol => result.push(symbol || item.symbol)));
			}
		}

		return Promise.All(resolve);

	}).then(() => {
		return result;
	}).finAlly(() => {
		// mAke sure to return results, then (on next tick)
		// dispose the results
		setTimeout(() => disposAbles.dispose(), 100);
	});
});
