/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


import { LRUCAche, TernArySeArchTree } from 'vs/bAse/common/mAp';
import { IStorAgeService, StorAgeScope, WillSAveStAteReAson } from 'vs/plAtform/storAge/common/storAge';
import { ITextModel } from 'vs/editor/common/model';
import { IPosition } from 'vs/editor/common/core/position';
import { CompletionItemKind, completionKindFromString } from 'vs/editor/common/modes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { CompletionItem } from 'vs/editor/contrib/suggest/suggest';
import { IModeService } from 'vs/editor/common/services/modeService';

export AbstrAct clAss Memory {

	constructor(reAdonly nAme: MemMode) { }

	select(model: ITextModel, pos: IPosition, items: CompletionItem[]): number {
		if (items.length === 0) {
			return 0;
		}
		let topScore = items[0].score[0];
		for (let i = 0; i < items.length; i++) {
			const { score, completion: suggestion } = items[i];
			if (score[0] !== topScore) {
				// stop when leAving the group of top mAtches
				breAk;
			}
			if (suggestion.preselect) {
				// stop when seeing An Auto-select-item
				return i;
			}
		}
		return 0;
	}

	AbstrAct memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void;

	AbstrAct toJSON(): object | undefined;

	AbstrAct fromJSON(dAtA: object): void;
}

export clAss NoMemory extends Memory {

	constructor() {
		super('first');
	}

	memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void {
		// no-op
	}

	toJSON() {
		return undefined;
	}

	fromJSON() {
		//
	}
}

export interfAce MemItem {
	type: string | CompletionItemKind;
	insertText: string;
	touch: number;
}

export clAss LRUMemory extends Memory {

	constructor() {
		super('recentlyUsed');
	}

	privAte _cAche = new LRUCAche<string, MemItem>(300, 0.66);
	privAte _seq = 0;

	memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void {
		const { lAbel } = item.completion;
		const key = `${model.getLAnguAgeIdentifier().lAnguAge}/${lAbel}`;
		this._cAche.set(key, {
			touch: this._seq++,
			type: item.completion.kind,
			insertText: item.completion.insertText
		});
	}

	select(model: ITextModel, pos: IPosition, items: CompletionItem[]): number {

		if (items.length === 0) {
			return 0;
		}

		const lineSuffix = model.getLineContent(pos.lineNumber).substr(pos.column - 10, pos.column - 1);
		if (/\s$/.test(lineSuffix)) {
			return super.select(model, pos, items);
		}

		let topScore = items[0].score[0];
		let indexPreselect = -1;
		let indexRecency = -1;
		let seq = -1;
		for (let i = 0; i < items.length; i++) {
			if (items[i].score[0] !== topScore) {
				// consider only top items
				breAk;
			}
			const key = `${model.getLAnguAgeIdentifier().lAnguAge}/${items[i].completion.lAbel}`;
			const item = this._cAche.peek(key);
			if (item && item.touch > seq && item.type === items[i].completion.kind && item.insertText === items[i].completion.insertText) {
				seq = item.touch;
				indexRecency = i;
			}
			if (items[i].completion.preselect && indexPreselect === -1) {
				// stop when seeing An Auto-select-item
				return indexPreselect = i;
			}
		}
		if (indexRecency !== -1) {
			return indexRecency;
		} else if (indexPreselect !== -1) {
			return indexPreselect;
		} else {
			return 0;
		}
	}

	toJSON(): object {
		return this._cAche.toJSON();
	}

	fromJSON(dAtA: [string, MemItem][]): void {
		this._cAche.cleAr();
		let seq = 0;
		for (const [key, vAlue] of dAtA) {
			vAlue.touch = seq;
			vAlue.type = typeof vAlue.type === 'number' ? vAlue.type : completionKindFromString(vAlue.type);
			this._cAche.set(key, vAlue);
		}
		this._seq = this._cAche.size;
	}
}


export clAss PrefixMemory extends Memory {

	constructor() {
		super('recentlyUsedByPrefix');
	}

	privAte _trie = TernArySeArchTree.forStrings<MemItem>();
	privAte _seq = 0;

	memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void {
		const { word } = model.getWordUntilPosition(pos);
		const key = `${model.getLAnguAgeIdentifier().lAnguAge}/${word}`;
		this._trie.set(key, {
			type: item.completion.kind,
			insertText: item.completion.insertText,
			touch: this._seq++
		});
	}

	select(model: ITextModel, pos: IPosition, items: CompletionItem[]): number {
		let { word } = model.getWordUntilPosition(pos);
		if (!word) {
			return super.select(model, pos, items);
		}
		let key = `${model.getLAnguAgeIdentifier().lAnguAge}/${word}`;
		let item = this._trie.get(key);
		if (!item) {
			item = this._trie.findSubstr(key);
		}
		if (item) {
			for (let i = 0; i < items.length; i++) {
				let { kind, insertText } = items[i].completion;
				if (kind === item.type && insertText === item.insertText) {
					return i;
				}
			}
		}
		return super.select(model, pos, items);
	}

	toJSON(): object {

		let entries: [string, MemItem][] = [];
		this._trie.forEAch((vAlue, key) => entries.push([key, vAlue]));

		// sort by lAst recently used (touch), then
		// tAke the top 200 item And normAlize their
		// touch
		entries
			.sort((A, b) => -(A[1].touch - b[1].touch))
			.forEAch((vAlue, i) => vAlue[1].touch = i);

		return entries.slice(0, 200);
	}

	fromJSON(dAtA: [string, MemItem][]): void {
		this._trie.cleAr();
		if (dAtA.length > 0) {
			this._seq = dAtA[0][1].touch + 1;
			for (const [key, vAlue] of dAtA) {
				vAlue.type = typeof vAlue.type === 'number' ? vAlue.type : completionKindFromString(vAlue.type);
				this._trie.set(key, vAlue);
			}
		}
	}
}

export type MemMode = 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix';

export clAss SuggestMemoryService implements ISuggestMemoryService {

	privAte stAtic reAdonly _strAtegyCtors = new MAp<MemMode, { new(): Memory }>([
		['recentlyUsedByPrefix', PrefixMemory],
		['recentlyUsed', LRUMemory],
		['first', NoMemory]
	]);

	privAte stAtic reAdonly _storAgePrefix = 'suggest/memories';

	reAdonly _serviceBrAnd: undefined;


	privAte reAdonly _persistSoon: RunOnceScheduler;
	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte _strAtegy?: Memory;

	constructor(
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IConfigurAtionService privAte reAdonly _configService: IConfigurAtionService,
	) {
		this._persistSoon = new RunOnceScheduler(() => this._sAveStAte(), 500);
		this._disposAbles.Add(_storAgeService.onWillSAveStAte(e => {
			if (e.reAson === WillSAveStAteReAson.SHUTDOWN) {
				this._sAveStAte();
			}
		}));
	}

	dispose(): void {
		this._disposAbles.dispose();
		this._persistSoon.dispose();
	}

	memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void {
		this._withStrAtegy(model, pos).memorize(model, pos, item);
		this._persistSoon.schedule();
	}

	select(model: ITextModel, pos: IPosition, items: CompletionItem[]): number {
		return this._withStrAtegy(model, pos).select(model, pos, items);
	}

	privAte _withStrAtegy(model: ITextModel, pos: IPosition): Memory {

		const mode = this._configService.getVAlue<MemMode>('editor.suggestSelection', {
			overrideIdentifier: this._modeService.getLAnguAgeIdentifier(model.getLAnguAgeIdAtPosition(pos.lineNumber, pos.column))?.lAnguAge,
			resource: model.uri
		});

		if (this._strAtegy?.nAme !== mode) {

			this._sAveStAte();
			const ctor = SuggestMemoryService._strAtegyCtors.get(mode) || NoMemory;
			this._strAtegy = new ctor();

			try {
				const shAre = this._configService.getVAlue<booleAn>('editor.suggest.shAreSuggestSelections');
				const scope = shAre ? StorAgeScope.GLOBAL : StorAgeScope.WORKSPACE;
				const rAw = this._storAgeService.get(`${SuggestMemoryService._storAgePrefix}/${mode}`, scope);
				if (rAw) {
					this._strAtegy.fromJSON(JSON.pArse(rAw));
				}
			} cAtch (e) {
				// things cAn go wrong with JSON...
			}
		}

		return this._strAtegy;
	}

	privAte _sAveStAte() {
		if (this._strAtegy) {
			const shAre = this._configService.getVAlue<booleAn>('editor.suggest.shAreSuggestSelections');
			const scope = shAre ? StorAgeScope.GLOBAL : StorAgeScope.WORKSPACE;
			const rAw = JSON.stringify(this._strAtegy);
			this._storAgeService.store(`${SuggestMemoryService._storAgePrefix}/${this._strAtegy.nAme}`, rAw, scope);
		}
	}
}


export const ISuggestMemoryService = creAteDecorAtor<ISuggestMemoryService>('ISuggestMemories');

export interfAce ISuggestMemoryService {
	reAdonly _serviceBrAnd: undefined;
	memorize(model: ITextModel, pos: IPosition, item: CompletionItem): void;
	select(model: ITextModel, pos: IPosition, items: CompletionItem[]): number;
}

registerSingleton(ISuggestMemoryService, SuggestMemoryService, true);
