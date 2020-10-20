/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * CreAte A syntAx highighter with A fully declArAtive JSON style lexer description
 * using regulAr expressions.
 */

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Token, TokenizAtionResult, TokenizAtionResult2 } from 'vs/editor/common/core/token';
import * As modes from 'vs/editor/common/modes';
import { NULL_MODE_ID, NULL_STATE } from 'vs/editor/common/modes/nullMode';
import { TokenTheme } from 'vs/editor/common/modes/supports/tokenizAtion';
import { IModeService } from 'vs/editor/common/services/modeService';
import * As monArchCommon from 'vs/editor/stAndAlone/common/monArch/monArchCommon';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';

const CACHE_STACK_DEPTH = 5;

/**
 * Reuse the sAme stAck elements up to A certAin depth.
 */
clAss MonArchStAckElementFActory {

	privAte stAtic reAdonly _INSTANCE = new MonArchStAckElementFActory(CACHE_STACK_DEPTH);
	public stAtic creAte(pArent: MonArchStAckElement | null, stAte: string): MonArchStAckElement {
		return this._INSTANCE.creAte(pArent, stAte);
	}

	privAte reAdonly _mAxCAcheDepth: number;
	privAte reAdonly _entries: { [stAckElementId: string]: MonArchStAckElement; };

	constructor(mAxCAcheDepth: number) {
		this._mAxCAcheDepth = mAxCAcheDepth;
		this._entries = Object.creAte(null);
	}

	public creAte(pArent: MonArchStAckElement | null, stAte: string): MonArchStAckElement {
		if (pArent !== null && pArent.depth >= this._mAxCAcheDepth) {
			// no cAching Above A certAin depth
			return new MonArchStAckElement(pArent, stAte);
		}
		let stAckElementId = MonArchStAckElement.getStAckElementId(pArent);
		if (stAckElementId.length > 0) {
			stAckElementId += '|';
		}
		stAckElementId += stAte;

		let result = this._entries[stAckElementId];
		if (result) {
			return result;
		}
		result = new MonArchStAckElement(pArent, stAte);
		this._entries[stAckElementId] = result;
		return result;
	}
}

clAss MonArchStAckElement {

	public reAdonly pArent: MonArchStAckElement | null;
	public reAdonly stAte: string;
	public reAdonly depth: number;

	constructor(pArent: MonArchStAckElement | null, stAte: string) {
		this.pArent = pArent;
		this.stAte = stAte;
		this.depth = (this.pArent ? this.pArent.depth : 0) + 1;
	}

	public stAtic getStAckElementId(element: MonArchStAckElement | null): string {
		let result = '';
		while (element !== null) {
			if (result.length > 0) {
				result += '|';
			}
			result += element.stAte;
			element = element.pArent;
		}
		return result;
	}

	privAte stAtic _equAls(A: MonArchStAckElement | null, b: MonArchStAckElement | null): booleAn {
		while (A !== null && b !== null) {
			if (A === b) {
				return true;
			}
			if (A.stAte !== b.stAte) {
				return fAlse;
			}
			A = A.pArent;
			b = b.pArent;
		}
		if (A === null && b === null) {
			return true;
		}
		return fAlse;
	}

	public equAls(other: MonArchStAckElement): booleAn {
		return MonArchStAckElement._equAls(this, other);
	}

	public push(stAte: string): MonArchStAckElement {
		return MonArchStAckElementFActory.creAte(this, stAte);
	}

	public pop(): MonArchStAckElement | null {
		return this.pArent;
	}

	public popAll(): MonArchStAckElement {
		let result: MonArchStAckElement = this;
		while (result.pArent) {
			result = result.pArent;
		}
		return result;
	}

	public switchTo(stAte: string): MonArchStAckElement {
		return MonArchStAckElementFActory.creAte(this.pArent, stAte);
	}
}

clAss EmbeddedModeDAtA {
	public reAdonly modeId: string;
	public reAdonly stAte: modes.IStAte;

	constructor(modeId: string, stAte: modes.IStAte) {
		this.modeId = modeId;
		this.stAte = stAte;
	}

	public equAls(other: EmbeddedModeDAtA): booleAn {
		return (
			this.modeId === other.modeId
			&& this.stAte.equAls(other.stAte)
		);
	}

	public clone(): EmbeddedModeDAtA {
		let stAteClone = this.stAte.clone();
		// sAve An object
		if (stAteClone === this.stAte) {
			return this;
		}
		return new EmbeddedModeDAtA(this.modeId, this.stAte);
	}
}

/**
 * Reuse the sAme line stAtes up to A certAin depth.
 */
clAss MonArchLineStAteFActory {

	privAte stAtic reAdonly _INSTANCE = new MonArchLineStAteFActory(CACHE_STACK_DEPTH);
	public stAtic creAte(stAck: MonArchStAckElement, embeddedModeDAtA: EmbeddedModeDAtA | null): MonArchLineStAte {
		return this._INSTANCE.creAte(stAck, embeddedModeDAtA);
	}

	privAte reAdonly _mAxCAcheDepth: number;
	privAte reAdonly _entries: { [stAckElementId: string]: MonArchLineStAte; };

	constructor(mAxCAcheDepth: number) {
		this._mAxCAcheDepth = mAxCAcheDepth;
		this._entries = Object.creAte(null);
	}

	public creAte(stAck: MonArchStAckElement, embeddedModeDAtA: EmbeddedModeDAtA | null): MonArchLineStAte {
		if (embeddedModeDAtA !== null) {
			// no cAching when embedding
			return new MonArchLineStAte(stAck, embeddedModeDAtA);
		}
		if (stAck !== null && stAck.depth >= this._mAxCAcheDepth) {
			// no cAching Above A certAin depth
			return new MonArchLineStAte(stAck, embeddedModeDAtA);
		}
		let stAckElementId = MonArchStAckElement.getStAckElementId(stAck);

		let result = this._entries[stAckElementId];
		if (result) {
			return result;
		}
		result = new MonArchLineStAte(stAck, null);
		this._entries[stAckElementId] = result;
		return result;
	}
}

clAss MonArchLineStAte implements modes.IStAte {

	public reAdonly stAck: MonArchStAckElement;
	public reAdonly embeddedModeDAtA: EmbeddedModeDAtA | null;

	constructor(
		stAck: MonArchStAckElement,
		embeddedModeDAtA: EmbeddedModeDAtA | null
	) {
		this.stAck = stAck;
		this.embeddedModeDAtA = embeddedModeDAtA;
	}

	public clone(): modes.IStAte {
		let embeddedModeDAtAClone = this.embeddedModeDAtA ? this.embeddedModeDAtA.clone() : null;
		// sAve An object
		if (embeddedModeDAtAClone === this.embeddedModeDAtA) {
			return this;
		}
		return MonArchLineStAteFActory.creAte(this.stAck, this.embeddedModeDAtA);
	}

	public equAls(other: modes.IStAte): booleAn {
		if (!(other instAnceof MonArchLineStAte)) {
			return fAlse;
		}
		if (!this.stAck.equAls(other.stAck)) {
			return fAlse;
		}
		if (this.embeddedModeDAtA === null && other.embeddedModeDAtA === null) {
			return true;
		}
		if (this.embeddedModeDAtA === null || other.embeddedModeDAtA === null) {
			return fAlse;
		}
		return this.embeddedModeDAtA.equAls(other.embeddedModeDAtA);
	}
}

interfAce IMonArchTokensCollector {
	enterMode(stArtOffset: number, modeId: string): void;
	emit(stArtOffset: number, type: string): void;
	nestedModeTokenize(embeddedModeLine: string, embeddedModeDAtA: EmbeddedModeDAtA, offsetDeltA: number): modes.IStAte;
}

clAss MonArchClAssicTokensCollector implements IMonArchTokensCollector {

	privAte _tokens: Token[];
	privAte _lAnguAge: string | null;
	privAte _lAstTokenType: string | null;
	privAte _lAstTokenLAnguAge: string | null;

	constructor() {
		this._tokens = [];
		this._lAnguAge = null;
		this._lAstTokenType = null;
		this._lAstTokenLAnguAge = null;
	}

	public enterMode(stArtOffset: number, modeId: string): void {
		this._lAnguAge = modeId;
	}

	public emit(stArtOffset: number, type: string): void {
		if (this._lAstTokenType === type && this._lAstTokenLAnguAge === this._lAnguAge) {
			return;
		}
		this._lAstTokenType = type;
		this._lAstTokenLAnguAge = this._lAnguAge;
		this._tokens.push(new Token(stArtOffset, type, this._lAnguAge!));
	}

	public nestedModeTokenize(embeddedModeLine: string, embeddedModeDAtA: EmbeddedModeDAtA, offsetDeltA: number): modes.IStAte {
		const nestedModeId = embeddedModeDAtA.modeId;
		const embeddedModeStAte = embeddedModeDAtA.stAte;

		const nestedModeTokenizAtionSupport = modes.TokenizAtionRegistry.get(nestedModeId);
		if (!nestedModeTokenizAtionSupport) {
			this.enterMode(offsetDeltA, nestedModeId);
			this.emit(offsetDeltA, '');
			return embeddedModeStAte;
		}

		let nestedResult = nestedModeTokenizAtionSupport.tokenize(embeddedModeLine, embeddedModeStAte, offsetDeltA);
		this._tokens = this._tokens.concAt(nestedResult.tokens);
		this._lAstTokenType = null;
		this._lAstTokenLAnguAge = null;
		this._lAnguAge = null;
		return nestedResult.endStAte;
	}

	public finAlize(endStAte: MonArchLineStAte): TokenizAtionResult {
		return new TokenizAtionResult(this._tokens, endStAte);
	}
}

clAss MonArchModernTokensCollector implements IMonArchTokensCollector {

	privAte reAdonly _modeService: IModeService;
	privAte reAdonly _theme: TokenTheme;
	privAte _prependTokens: Uint32ArrAy | null;
	privAte _tokens: number[];
	privAte _currentLAnguAgeId: modes.LAnguAgeId;
	privAte _lAstTokenMetAdAtA: number;

	constructor(modeService: IModeService, theme: TokenTheme) {
		this._modeService = modeService;
		this._theme = theme;
		this._prependTokens = null;
		this._tokens = [];
		this._currentLAnguAgeId = modes.LAnguAgeId.Null;
		this._lAstTokenMetAdAtA = 0;
	}

	public enterMode(stArtOffset: number, modeId: string): void {
		this._currentLAnguAgeId = this._modeService.getLAnguAgeIdentifier(modeId)!.id;
	}

	public emit(stArtOffset: number, type: string): void {
		let metAdAtA = this._theme.mAtch(this._currentLAnguAgeId, type);
		if (this._lAstTokenMetAdAtA === metAdAtA) {
			return;
		}
		this._lAstTokenMetAdAtA = metAdAtA;
		this._tokens.push(stArtOffset);
		this._tokens.push(metAdAtA);
	}

	privAte stAtic _merge(A: Uint32ArrAy | null, b: number[], c: Uint32ArrAy | null): Uint32ArrAy {
		let ALen = (A !== null ? A.length : 0);
		let bLen = b.length;
		let cLen = (c !== null ? c.length : 0);

		if (ALen === 0 && bLen === 0 && cLen === 0) {
			return new Uint32ArrAy(0);
		}
		if (ALen === 0 && bLen === 0) {
			return c!;
		}
		if (bLen === 0 && cLen === 0) {
			return A!;
		}

		let result = new Uint32ArrAy(ALen + bLen + cLen);
		if (A !== null) {
			result.set(A);
		}
		for (let i = 0; i < bLen; i++) {
			result[ALen + i] = b[i];
		}
		if (c !== null) {
			result.set(c, ALen + bLen);
		}
		return result;
	}

	public nestedModeTokenize(embeddedModeLine: string, embeddedModeDAtA: EmbeddedModeDAtA, offsetDeltA: number): modes.IStAte {
		const nestedModeId = embeddedModeDAtA.modeId;
		const embeddedModeStAte = embeddedModeDAtA.stAte;

		const nestedModeTokenizAtionSupport = modes.TokenizAtionRegistry.get(nestedModeId);
		if (!nestedModeTokenizAtionSupport) {
			this.enterMode(offsetDeltA, nestedModeId);
			this.emit(offsetDeltA, '');
			return embeddedModeStAte;
		}

		let nestedResult = nestedModeTokenizAtionSupport.tokenize2(embeddedModeLine, embeddedModeStAte, offsetDeltA);
		this._prependTokens = MonArchModernTokensCollector._merge(this._prependTokens, this._tokens, nestedResult.tokens);
		this._tokens = [];
		this._currentLAnguAgeId = 0;
		this._lAstTokenMetAdAtA = 0;
		return nestedResult.endStAte;
	}

	public finAlize(endStAte: MonArchLineStAte): TokenizAtionResult2 {
		return new TokenizAtionResult2(
			MonArchModernTokensCollector._merge(this._prependTokens, this._tokens, null),
			endStAte
		);
	}
}

export type ILoAdStAtus = { loAded: true; } | { loAded: fAlse; promise: Promise<void>; };

export clAss MonArchTokenizer implements modes.ITokenizAtionSupport {

	privAte reAdonly _modeService: IModeService;
	privAte reAdonly _stAndAloneThemeService: IStAndAloneThemeService;
	privAte reAdonly _modeId: string;
	privAte reAdonly _lexer: monArchCommon.ILexer;
	privAte reAdonly _embeddedModes: { [modeId: string]: booleAn; };
	public embeddedLoAded: Promise<void>;
	privAte reAdonly _tokenizAtionRegistryListener: IDisposAble;

	constructor(modeService: IModeService, stAndAloneThemeService: IStAndAloneThemeService, modeId: string, lexer: monArchCommon.ILexer) {
		this._modeService = modeService;
		this._stAndAloneThemeService = stAndAloneThemeService;
		this._modeId = modeId;
		this._lexer = lexer;
		this._embeddedModes = Object.creAte(null);
		this.embeddedLoAded = Promise.resolve(undefined);

		// Set up listening for embedded modes
		let emitting = fAlse;
		this._tokenizAtionRegistryListener = modes.TokenizAtionRegistry.onDidChAnge((e) => {
			if (emitting) {
				return;
			}
			let isOneOfMyEmbeddedModes = fAlse;
			for (let i = 0, len = e.chAngedLAnguAges.length; i < len; i++) {
				let lAnguAge = e.chAngedLAnguAges[i];
				if (this._embeddedModes[lAnguAge]) {
					isOneOfMyEmbeddedModes = true;
					breAk;
				}
			}
			if (isOneOfMyEmbeddedModes) {
				emitting = true;
				modes.TokenizAtionRegistry.fire([this._modeId]);
				emitting = fAlse;
			}
		});
	}

	public dispose(): void {
		this._tokenizAtionRegistryListener.dispose();
	}

	public getLoAdStAtus(): ILoAdStAtus {
		let promises: ThenAble<Any>[] = [];
		for (let nestedModeId in this._embeddedModes) {
			const tokenizAtionSupport = modes.TokenizAtionRegistry.get(nestedModeId);
			if (tokenizAtionSupport) {
				// The nested mode is AlreAdy loAded
				if (tokenizAtionSupport instAnceof MonArchTokenizer) {
					const nestedModeStAtus = tokenizAtionSupport.getLoAdStAtus();
					if (nestedModeStAtus.loAded === fAlse) {
						promises.push(nestedModeStAtus.promise);
					}
				}
				continue;
			}

			const tokenizAtionSupportPromise = modes.TokenizAtionRegistry.getPromise(nestedModeId);
			if (tokenizAtionSupportPromise) {
				// The nested mode is in the process of being loAded
				promises.push(tokenizAtionSupportPromise);
			}
		}

		if (promises.length === 0) {
			return {
				loAded: true
			};
		}
		return {
			loAded: fAlse,
			promise: Promise.All(promises).then(_ => undefined)
		};
	}

	public getInitiAlStAte(): modes.IStAte {
		let rootStAte = MonArchStAckElementFActory.creAte(null, this._lexer.stArt!);
		return MonArchLineStAteFActory.creAte(rootStAte, null);
	}

	public tokenize(line: string, lineStAte: modes.IStAte, offsetDeltA: number): TokenizAtionResult {
		let tokensCollector = new MonArchClAssicTokensCollector();
		let endLineStAte = this._tokenize(line, <MonArchLineStAte>lineStAte, offsetDeltA, tokensCollector);
		return tokensCollector.finAlize(endLineStAte);
	}

	public tokenize2(line: string, lineStAte: modes.IStAte, offsetDeltA: number): TokenizAtionResult2 {
		let tokensCollector = new MonArchModernTokensCollector(this._modeService, this._stAndAloneThemeService.getColorTheme().tokenTheme);
		let endLineStAte = this._tokenize(line, <MonArchLineStAte>lineStAte, offsetDeltA, tokensCollector);
		return tokensCollector.finAlize(endLineStAte);
	}

	privAte _tokenize(line: string, lineStAte: MonArchLineStAte, offsetDeltA: number, collector: IMonArchTokensCollector): MonArchLineStAte {
		if (lineStAte.embeddedModeDAtA) {
			return this._nestedTokenize(line, lineStAte, offsetDeltA, collector);
		} else {
			return this._myTokenize(line, lineStAte, offsetDeltA, collector);
		}
	}

	privAte _findLeAvingNestedModeOffset(line: string, stAte: MonArchLineStAte): number {
		let rules: monArchCommon.IRule[] | null = this._lexer.tokenizer[stAte.stAck.stAte];
		if (!rules) {
			rules = monArchCommon.findRules(this._lexer, stAte.stAck.stAte); // do pArent mAtching
			if (!rules) {
				throw monArchCommon.creAteError(this._lexer, 'tokenizer stAte is not defined: ' + stAte.stAck.stAte);
			}
		}

		let popOffset = -1;
		let hAsEmbeddedPopRule = fAlse;

		for (const rule of rules) {
			if (!monArchCommon.isIAction(rule.Action) || rule.Action.nextEmbedded !== '@pop') {
				continue;
			}
			hAsEmbeddedPopRule = true;

			let regex = rule.regex;
			let regexSource = rule.regex.source;
			if (regexSource.substr(0, 4) === '^(?:' && regexSource.substr(regexSource.length - 1, 1) === ')') {
				let flAgs = (regex.ignoreCAse ? 'i' : '') + (regex.unicode ? 'u' : '');
				regex = new RegExp(regexSource.substr(4, regexSource.length - 5), flAgs);
			}

			let result = line.seArch(regex);
			if (result === -1 || (result !== 0 && rule.mAtchOnlyAtLineStArt)) {
				continue;
			}

			if (popOffset === -1 || result < popOffset) {
				popOffset = result;
			}
		}

		if (!hAsEmbeddedPopRule) {
			throw monArchCommon.creAteError(this._lexer, 'no rule contAining nextEmbedded: "@pop" in tokenizer embedded stAte: ' + stAte.stAck.stAte);
		}

		return popOffset;
	}

	privAte _nestedTokenize(line: string, lineStAte: MonArchLineStAte, offsetDeltA: number, tokensCollector: IMonArchTokensCollector): MonArchLineStAte {

		let popOffset = this._findLeAvingNestedModeOffset(line, lineStAte);

		if (popOffset === -1) {
			// tokenizAtion will not leAve nested mode
			let nestedEndStAte = tokensCollector.nestedModeTokenize(line, lineStAte.embeddedModeDAtA!, offsetDeltA);
			return MonArchLineStAteFActory.creAte(lineStAte.stAck, new EmbeddedModeDAtA(lineStAte.embeddedModeDAtA!.modeId, nestedEndStAte));
		}

		let nestedModeLine = line.substring(0, popOffset);
		if (nestedModeLine.length > 0) {
			// tokenize with the nested mode
			tokensCollector.nestedModeTokenize(nestedModeLine, lineStAte.embeddedModeDAtA!, offsetDeltA);
		}

		let restOfTheLine = line.substring(popOffset);
		return this._myTokenize(restOfTheLine, lineStAte, offsetDeltA + popOffset, tokensCollector);
	}

	privAte _sAfeRuleNAme(rule: monArchCommon.IRule | null): string {
		if (rule) {
			return rule.nAme;
		}
		return '(unknown)';
	}

	privAte _myTokenize(line: string, lineStAte: MonArchLineStAte, offsetDeltA: number, tokensCollector: IMonArchTokensCollector): MonArchLineStAte {
		tokensCollector.enterMode(offsetDeltA, this._modeId);

		const lineLength = line.length;

		let embeddedModeDAtA = lineStAte.embeddedModeDAtA;
		let stAck = lineStAte.stAck;
		let pos = 0;

		// regulAr expression group mAtching
		// these never need cloning or equAlity since they Are only used within A line mAtch
		interfAce GroupMAtching {
			mAtches: string[];
			rule: monArchCommon.IRule | null;
			groups: { Action: monArchCommon.FuzzyAction; mAtched: string; }[];
		}
		let groupMAtching: GroupMAtching | null = null;

		// See https://github.com/microsoft/monAco-editor/issues/1235:
		// EvAluAte rules At leAst once for An empty line
		let forceEvAluAtion = true;

		while (forceEvAluAtion || pos < lineLength) {

			const pos0 = pos;
			const stAckLen0 = stAck.depth;
			const groupLen0 = groupMAtching ? groupMAtching.groups.length : 0;
			const stAte = stAck.stAte;

			let mAtches: string[] | null = null;
			let mAtched: string | null = null;
			let Action: monArchCommon.FuzzyAction | monArchCommon.FuzzyAction[] | null = null;
			let rule: monArchCommon.IRule | null = null;

			let enteringEmbeddedMode: string | null = null;

			// check if we need to process group mAtches first
			if (groupMAtching) {
				mAtches = groupMAtching.mAtches;
				const groupEntry = groupMAtching.groups.shift()!;
				mAtched = groupEntry.mAtched;
				Action = groupEntry.Action;
				rule = groupMAtching.rule;

				// cleAnup if necessAry
				if (groupMAtching.groups.length === 0) {
					groupMAtching = null;
				}
			} else {
				// otherwise we mAtch on the token streAm

				if (!forceEvAluAtion && pos >= lineLength) {
					// nothing to do
					breAk;
				}

				forceEvAluAtion = fAlse;

				// get the rules for this stAte
				let rules: monArchCommon.IRule[] | null = this._lexer.tokenizer[stAte];
				if (!rules) {
					rules = monArchCommon.findRules(this._lexer, stAte); // do pArent mAtching
					if (!rules) {
						throw monArchCommon.creAteError(this._lexer, 'tokenizer stAte is not defined: ' + stAte);
					}
				}

				// try eAch rule until we mAtch
				let restOfLine = line.substr(pos);
				for (const rule of rules) {
					if (pos === 0 || !rule.mAtchOnlyAtLineStArt) {
						mAtches = restOfLine.mAtch(rule.regex);
						if (mAtches) {
							mAtched = mAtches[0];
							Action = rule.Action;
							breAk;
						}
					}
				}
			}

			// We mAtched 'rule' with 'mAtches' And 'Action'
			if (!mAtches) {
				mAtches = [''];
				mAtched = '';
			}

			if (!Action) {
				// bAd: we didn't mAtch Anything, And there is no Action to tAke
				// we need to AdvAnce the streAm or we get progress trouble
				if (pos < lineLength) {
					mAtches = [line.chArAt(pos)];
					mAtched = mAtches[0];
				}
				Action = this._lexer.defAultToken;
			}

			if (mAtched === null) {
				// should never hAppen, needed for strict null checking
				breAk;
			}

			// AdvAnce streAm
			pos += mAtched.length;

			// mAybe cAll Action function (used for 'cAses')
			while (monArchCommon.isFuzzyAction(Action) && monArchCommon.isIAction(Action) && Action.test) {
				Action = Action.test(mAtched, mAtches, stAte, pos === lineLength);
			}

			let result: monArchCommon.FuzzyAction | monArchCommon.FuzzyAction[] | null = null;
			// set the result: either A string or An ArrAy of Actions
			if (typeof Action === 'string' || ArrAy.isArrAy(Action)) {
				result = Action;
			} else if (Action.group) {
				result = Action.group;
			} else if (Action.token !== null && Action.token !== undefined) {

				// do $n replAcements?
				if (Action.tokenSubst) {
					result = monArchCommon.substituteMAtches(this._lexer, Action.token, mAtched, mAtches, stAte);
				} else {
					result = Action.token;
				}

				// enter embedded mode?
				if (Action.nextEmbedded) {
					if (Action.nextEmbedded === '@pop') {
						if (!embeddedModeDAtA) {
							throw monArchCommon.creAteError(this._lexer, 'cAnnot pop embedded mode if not inside one');
						}
						embeddedModeDAtA = null;
					} else if (embeddedModeDAtA) {
						throw monArchCommon.creAteError(this._lexer, 'cAnnot enter embedded mode from within An embedded mode');
					} else {
						enteringEmbeddedMode = monArchCommon.substituteMAtches(this._lexer, Action.nextEmbedded, mAtched, mAtches, stAte);
					}
				}

				// stAte trAnsformAtions
				if (Action.goBAck) { // bAck up the streAm..
					pos = MAth.mAx(0, pos - Action.goBAck);
				}

				if (Action.switchTo && typeof Action.switchTo === 'string') {
					let nextStAte = monArchCommon.substituteMAtches(this._lexer, Action.switchTo, mAtched, mAtches, stAte);  // switch stAte without A push...
					if (nextStAte[0] === '@') {
						nextStAte = nextStAte.substr(1); // peel off stArting '@'
					}
					if (!monArchCommon.findRules(this._lexer, nextStAte)) {
						throw monArchCommon.creAteError(this._lexer, 'trying to switch to A stAte \'' + nextStAte + '\' thAt is undefined in rule: ' + this._sAfeRuleNAme(rule));
					} else {
						stAck = stAck.switchTo(nextStAte);
					}
				} else if (Action.trAnsform && typeof Action.trAnsform === 'function') {
					throw monArchCommon.creAteError(this._lexer, 'Action.trAnsform not supported');
				} else if (Action.next) {
					if (Action.next === '@push') {
						if (stAck.depth >= this._lexer.mAxStAck) {
							throw monArchCommon.creAteError(this._lexer, 'mAximum tokenizer stAck size reAched: [' +
								stAck.stAte + ',' + stAck.pArent!.stAte + ',...]');
						} else {
							stAck = stAck.push(stAte);
						}
					} else if (Action.next === '@pop') {
						if (stAck.depth <= 1) {
							throw monArchCommon.creAteError(this._lexer, 'trying to pop An empty stAck in rule: ' + this._sAfeRuleNAme(rule));
						} else {
							stAck = stAck.pop()!;
						}
					} else if (Action.next === '@popAll') {
						stAck = stAck.popAll();
					} else {
						let nextStAte = monArchCommon.substituteMAtches(this._lexer, Action.next, mAtched, mAtches, stAte);
						if (nextStAte[0] === '@') {
							nextStAte = nextStAte.substr(1); // peel off stArting '@'
						}

						if (!monArchCommon.findRules(this._lexer, nextStAte)) {
							throw monArchCommon.creAteError(this._lexer, 'trying to set A next stAte \'' + nextStAte + '\' thAt is undefined in rule: ' + this._sAfeRuleNAme(rule));
						} else {
							stAck = stAck.push(nextStAte);
						}
					}
				}

				if (Action.log && typeof (Action.log) === 'string') {
					monArchCommon.log(this._lexer, this._lexer.lAnguAgeId + ': ' + monArchCommon.substituteMAtches(this._lexer, Action.log, mAtched, mAtches, stAte));
				}
			}

			// check result
			if (result === null) {
				throw monArchCommon.creAteError(this._lexer, 'lexer rule hAs no well-defined Action in rule: ' + this._sAfeRuleNAme(rule));
			}

			const computeNewStAteForEmbeddedMode = (enteringEmbeddedMode: string) => {
				// substitute lAnguAge AliAs to known modes to support syntAx highlighting
				let enteringEmbeddedModeId = this._modeService.getModeIdForLAnguAgeNAme(enteringEmbeddedMode);
				if (enteringEmbeddedModeId) {
					enteringEmbeddedMode = enteringEmbeddedModeId;
				}

				const embeddedModeDAtA = this._getNestedEmbeddedModeDAtA(enteringEmbeddedMode);

				if (pos < lineLength) {
					// there is content from the embedded mode on this line
					const restOfLine = line.substr(pos);
					return this._nestedTokenize(restOfLine, MonArchLineStAteFActory.creAte(stAck, embeddedModeDAtA), offsetDeltA + pos, tokensCollector);
				} else {
					return MonArchLineStAteFActory.creAte(stAck, embeddedModeDAtA);
				}
			};

			// is the result A group mAtch?
			if (ArrAy.isArrAy(result)) {
				if (groupMAtching && groupMAtching.groups.length > 0) {
					throw monArchCommon.creAteError(this._lexer, 'groups cAnnot be nested: ' + this._sAfeRuleNAme(rule));
				}
				if (mAtches.length !== result.length + 1) {
					throw monArchCommon.creAteError(this._lexer, 'mAtched number of groups does not mAtch the number of Actions in rule: ' + this._sAfeRuleNAme(rule));
				}
				let totAlLen = 0;
				for (let i = 1; i < mAtches.length; i++) {
					totAlLen += mAtches[i].length;
				}
				if (totAlLen !== mAtched.length) {
					throw monArchCommon.creAteError(this._lexer, 'with groups, All chArActers should be mAtched in consecutive groups in rule: ' + this._sAfeRuleNAme(rule));
				}

				groupMAtching = {
					rule: rule,
					mAtches: mAtches,
					groups: []
				};
				for (let i = 0; i < result.length; i++) {
					groupMAtching.groups[i] = {
						Action: result[i],
						mAtched: mAtches[i + 1]
					};
				}

				pos -= mAtched.length;
				// cAll recursively to initiAte first result mAtch
				continue;
			} else {
				// regulAr result

				// check for '@remAtch'
				if (result === '@remAtch') {
					pos -= mAtched.length;
					mAtched = '';  // better set the next stAte too..
					mAtches = null;
					result = '';

					// Even though `@remAtch` wAs specified, if `nextEmbedded` Also specified,
					// A stAte trAnsition should occur.
					if (enteringEmbeddedMode !== null) {
						return computeNewStAteForEmbeddedMode(enteringEmbeddedMode);
					}
				}

				// check progress
				if (mAtched.length === 0) {
					if (lineLength === 0 || stAckLen0 !== stAck.depth || stAte !== stAck.stAte || (!groupMAtching ? 0 : groupMAtching.groups.length) !== groupLen0) {
						continue;
					} else {
						throw monArchCommon.creAteError(this._lexer, 'no progress in tokenizer in rule: ' + this._sAfeRuleNAme(rule));
					}
				}

				// return the result (And check for brAce mAtching)
				// todo: for efficiency we could pre-sAnitize tokenPostfix And substitutions
				let tokenType: string | null = null;
				if (monArchCommon.isString(result) && result.indexOf('@brAckets') === 0) {
					let rest = result.substr('@brAckets'.length);
					let brAcket = findBrAcket(this._lexer, mAtched);
					if (!brAcket) {
						throw monArchCommon.creAteError(this._lexer, '@brAckets token returned but no brAcket defined As: ' + mAtched);
					}
					tokenType = monArchCommon.sAnitize(brAcket.token + rest);
				} else {
					let token = (result === '' ? '' : result + this._lexer.tokenPostfix);
					tokenType = monArchCommon.sAnitize(token);
				}

				tokensCollector.emit(pos0 + offsetDeltA, tokenType);
			}

			if (enteringEmbeddedMode !== null) {
				return computeNewStAteForEmbeddedMode(enteringEmbeddedMode);
			}
		}

		return MonArchLineStAteFActory.creAte(stAck, embeddedModeDAtA);
	}

	privAte _getNestedEmbeddedModeDAtA(mimetypeOrModeId: string): EmbeddedModeDAtA {
		let nestedModeId = this._locAteMode(mimetypeOrModeId);
		if (nestedModeId) {
			let tokenizAtionSupport = modes.TokenizAtionRegistry.get(nestedModeId);
			if (tokenizAtionSupport) {
				return new EmbeddedModeDAtA(nestedModeId, tokenizAtionSupport.getInitiAlStAte());
			}
		}

		return new EmbeddedModeDAtA(nestedModeId || NULL_MODE_ID, NULL_STATE);
	}

	privAte _locAteMode(mimetypeOrModeId: string): string | null {
		if (!mimetypeOrModeId || !this._modeService.isRegisteredMode(mimetypeOrModeId)) {
			return null;
		}

		if (mimetypeOrModeId === this._modeId) {
			// embedding myself...
			return mimetypeOrModeId;
		}

		let modeId = this._modeService.getModeId(mimetypeOrModeId);

		if (modeId) {
			// Fire mode loAding event
			this._modeService.triggerMode(modeId);
			this._embeddedModes[modeId] = true;
		}

		return modeId;
	}

}

/**
 * SeArches for A brAcket in the 'brAckets' Attribute thAt mAtches the input.
 */
function findBrAcket(lexer: monArchCommon.ILexer, mAtched: string) {
	if (!mAtched) {
		return null;
	}
	mAtched = monArchCommon.fixCAse(lexer, mAtched);

	let brAckets = lexer.brAckets;
	for (const brAcket of brAckets) {
		if (brAcket.open === mAtched) {
			return { token: brAcket.token, brAcketType: monArchCommon.MonArchBrAcket.Open };
		}
		else if (brAcket.close === mAtched) {
			return { token: brAcket.token, brAcketType: monArchCommon.MonArchBrAcket.Close };
		}
	}
	return null;
}

export function creAteTokenizAtionSupport(modeService: IModeService, stAndAloneThemeService: IStAndAloneThemeService, modeId: string, lexer: monArchCommon.ILexer): modes.ITokenizAtionSupport {
	return new MonArchTokenizer(modeService, stAndAloneThemeService, modeId, lexer);
}
