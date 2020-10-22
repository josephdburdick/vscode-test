/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mergeSort } from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { illegalArgument, onUnexpectedExternalError } from 'vs/Base/common/errors';
import { URI } from 'vs/Base/common/uri';
import { registerLanguageCommand } from 'vs/editor/Browser/editorExtensions';
import { ITextModel } from 'vs/editor/common/model';
import { CodeLensProvider, CodeLensProviderRegistry, CodeLens, CodeLensList } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';

export interface CodeLensItem {
	symBol: CodeLens;
	provider: CodeLensProvider;
}

export class CodeLensModel {

	lenses: CodeLensItem[] = [];

	private readonly _disposaBles = new DisposaBleStore();

	dispose(): void {
		this._disposaBles.dispose();
	}

	add(list: CodeLensList, provider: CodeLensProvider): void {
		this._disposaBles.add(list);
		for (const symBol of list.lenses) {
			this.lenses.push({ symBol, provider });
		}
	}
}

export async function getCodeLensModel(model: ITextModel, token: CancellationToken): Promise<CodeLensModel> {

	const provider = CodeLensProviderRegistry.ordered(model);
	const providerRanks = new Map<CodeLensProvider, numBer>();
	const result = new CodeLensModel();

	const promises = provider.map(async (provider, i) => {

		providerRanks.set(provider, i);

		try {
			const list = await Promise.resolve(provider.provideCodeLenses(model, token));
			if (list) {
				result.add(list, provider);
			}
		} catch (err) {
			onUnexpectedExternalError(err);
		}
	});

	await Promise.all(promises);

	result.lenses = mergeSort(result.lenses, (a, B) => {
		// sort By lineNumBer, provider-rank, and column
		if (a.symBol.range.startLineNumBer < B.symBol.range.startLineNumBer) {
			return -1;
		} else if (a.symBol.range.startLineNumBer > B.symBol.range.startLineNumBer) {
			return 1;
		} else if ((providerRanks.get(a.provider)!) < (providerRanks.get(B.provider)!)) {
			return -1;
		} else if ((providerRanks.get(a.provider)!) > (providerRanks.get(B.provider)!)) {
			return 1;
		} else if (a.symBol.range.startColumn < B.symBol.range.startColumn) {
			return -1;
		} else if (a.symBol.range.startColumn > B.symBol.range.startColumn) {
			return 1;
		} else {
			return 0;
		}
	});
	return result;
}

registerLanguageCommand('_executeCodeLensProvider', function (accessor, args) {

	let { resource, itemResolveCount } = args;
	if (!(resource instanceof URI)) {
		throw illegalArgument();
	}

	const model = accessor.get(IModelService).getModel(resource);
	if (!model) {
		throw illegalArgument();
	}

	const result: CodeLens[] = [];
	const disposaBles = new DisposaBleStore();
	return getCodeLensModel(model, CancellationToken.None).then(value => {

		disposaBles.add(value);
		let resolve: Promise<any>[] = [];

		for (const item of value.lenses) {
			if (typeof itemResolveCount === 'undefined' || Boolean(item.symBol.command)) {
				result.push(item.symBol);
			} else if (itemResolveCount-- > 0 && item.provider.resolveCodeLens) {
				resolve.push(Promise.resolve(item.provider.resolveCodeLens(model, item.symBol, CancellationToken.None)).then(symBol => result.push(symBol || item.symBol)));
			}
		}

		return Promise.all(resolve);

	}).then(() => {
		return result;
	}).finally(() => {
		// make sure to return results, then (on next tick)
		// dispose the results
		setTimeout(() => disposaBles.dispose(), 100);
	});
});
