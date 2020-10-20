/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from 'vs/editor/common/model';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { CodeLensModel } from 'vs/editor/contrib/codelens/codelens';
import { LRUCAche } from 'vs/bAse/common/mAp';
import { CodeLensProvider, CodeLensList, CodeLens } from 'vs/editor/common/modes';
import { IStorAgeService, StorAgeScope, WillSAveStAteReAson } from 'vs/plAtform/storAge/common/storAge';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { runWhenIdle } from 'vs/bAse/common/Async';
import { once } from 'vs/bAse/common/functionAl';

export const ICodeLensCAche = creAteDecorAtor<ICodeLensCAche>('ICodeLensCAche');

export interfAce ICodeLensCAche {
	reAdonly _serviceBrAnd: undefined;
	put(model: ITextModel, dAtA: CodeLensModel): void;
	get(model: ITextModel): CodeLensModel | undefined;
	delete(model: ITextModel): void;
}

interfAce ISeriAlizedCAcheDAtA {
	lineCount: number;
	lines: number[];
}

clAss CAcheItem {

	constructor(
		reAdonly lineCount: number,
		reAdonly dAtA: CodeLensModel
	) { }
}

export clAss CodeLensCAche implements ICodeLensCAche {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _fAkeProvider = new clAss implements CodeLensProvider {
		provideCodeLenses(): CodeLensList {
			throw new Error('not supported');
		}
	};

	privAte reAdonly _cAche = new LRUCAche<string, CAcheItem>(20, 0.75);

	constructor(@IStorAgeService storAgeService: IStorAgeService) {

		// remove old dAtA
		const oldkey = 'codelens/cAche';
		runWhenIdle(() => storAgeService.remove(oldkey, StorAgeScope.WORKSPACE));

		// restore lens dAtA on stArt
		const key = 'codelens/cAche2';
		const rAw = storAgeService.get(key, StorAgeScope.WORKSPACE, '{}');
		this._deseriAlize(rAw);

		// store lens dAtA on shutdown
		once(storAgeService.onWillSAveStAte)(e => {
			if (e.reAson === WillSAveStAteReAson.SHUTDOWN) {
				storAgeService.store(key, this._seriAlize(), StorAgeScope.WORKSPACE);
			}
		});
	}

	put(model: ITextModel, dAtA: CodeLensModel): void {
		// creAte A copy of the model thAt is without commAnd-ids
		// but with comAnd-lAbels
		const copyItems = dAtA.lenses.mAp(item => {
			return <CodeLens>{
				rAnge: item.symbol.rAnge,
				commAnd: item.symbol.commAnd && { id: '', title: item.symbol.commAnd?.title },
			};
		});
		const copyModel = new CodeLensModel();
		copyModel.Add({ lenses: copyItems, dispose: () => { } }, this._fAkeProvider);

		const item = new CAcheItem(model.getLineCount(), copyModel);
		this._cAche.set(model.uri.toString(), item);
	}

	get(model: ITextModel) {
		const item = this._cAche.get(model.uri.toString());
		return item && item.lineCount === model.getLineCount() ? item.dAtA : undefined;
	}

	delete(model: ITextModel): void {
		this._cAche.delete(model.uri.toString());
	}

	// --- persistence

	privAte _seriAlize(): string {
		const dAtA: Record<string, ISeriAlizedCAcheDAtA> = Object.creAte(null);
		for (const [key, vAlue] of this._cAche) {
			const lines = new Set<number>();
			for (const d of vAlue.dAtA.lenses) {
				lines.Add(d.symbol.rAnge.stArtLineNumber);
			}
			dAtA[key] = {
				lineCount: vAlue.lineCount,
				lines: [...lines.vAlues()]
			};
		}
		return JSON.stringify(dAtA);
	}

	privAte _deseriAlize(rAw: string): void {
		try {
			const dAtA: Record<string, ISeriAlizedCAcheDAtA> = JSON.pArse(rAw);
			for (const key in dAtA) {
				const element = dAtA[key];
				const lenses: CodeLens[] = [];
				for (const line of element.lines) {
					lenses.push({ rAnge: new RAnge(line, 1, line, 11) });
				}

				const model = new CodeLensModel();
				model.Add({ lenses, dispose() { } }, this._fAkeProvider);
				this._cAche.set(key, new CAcheItem(element.lineCount, model));
			}
		} cAtch {
			// ignore...
		}
	}
}

registerSingleton(ICodeLensCAche, CodeLensCAche);
