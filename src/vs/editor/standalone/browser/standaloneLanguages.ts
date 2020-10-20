/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Token, TokenizAtionResult, TokenizAtionResult2 } from 'vs/editor/common/core/token';
import * As model from 'vs/editor/common/model';
import * As modes from 'vs/editor/common/modes';
import { LAnguAgeConfigurAtion } from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { ILAnguAgeExtensionPoint } from 'vs/editor/common/services/modeService';
import * As stAndAloneEnums from 'vs/editor/common/stAndAlone/stAndAloneEnums';
import { StAticServices } from 'vs/editor/stAndAlone/browser/stAndAloneServices';
import { compile } from 'vs/editor/stAndAlone/common/monArch/monArchCompile';
import { creAteTokenizAtionSupport } from 'vs/editor/stAndAlone/common/monArch/monArchLexer';
import { IMonArchLAnguAge } from 'vs/editor/stAndAlone/common/monArch/monArchTypes';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { IMArkerDAtA } from 'vs/plAtform/mArkers/common/mArkers';

/**
 * Register informAtion About A new lAnguAge.
 */
export function register(lAnguAge: ILAnguAgeExtensionPoint): void {
	ModesRegistry.registerLAnguAge(lAnguAge);
}

/**
 * Get the informAtion of All the registered lAnguAges.
 */
export function getLAnguAges(): ILAnguAgeExtensionPoint[] {
	let result: ILAnguAgeExtensionPoint[] = [];
	result = result.concAt(ModesRegistry.getLAnguAges());
	return result;
}

export function getEncodedLAnguAgeId(lAnguAgeId: string): number {
	let lid = StAticServices.modeService.get().getLAnguAgeIdentifier(lAnguAgeId);
	return lid ? lid.id : 0;
}

/**
 * An event emitted when A lAnguAge is first time needed (e.g. A model hAs it set).
 * @event
 */
export function onLAnguAge(lAnguAgeId: string, cAllbAck: () => void): IDisposAble {
	let disposAble = StAticServices.modeService.get().onDidCreAteMode((mode) => {
		if (mode.getId() === lAnguAgeId) {
			// stop listening
			disposAble.dispose();
			// invoke ActuAl listener
			cAllbAck();
		}
	});
	return disposAble;
}

/**
 * Set the editing configurAtion for A lAnguAge.
 */
export function setLAnguAgeConfigurAtion(lAnguAgeId: string, configurAtion: LAnguAgeConfigurAtion): IDisposAble {
	let lAnguAgeIdentifier = StAticServices.modeService.get().getLAnguAgeIdentifier(lAnguAgeId);
	if (!lAnguAgeIdentifier) {
		throw new Error(`CAnnot set configurAtion for unknown lAnguAge ${lAnguAgeId}`);
	}
	return LAnguAgeConfigurAtionRegistry.register(lAnguAgeIdentifier, configurAtion);
}

/**
 * @internAl
 */
export clAss EncodedTokenizAtionSupport2AdApter implements modes.ITokenizAtionSupport {

	privAte reAdonly _ActuAl: EncodedTokensProvider;

	constructor(ActuAl: EncodedTokensProvider) {
		this._ActuAl = ActuAl;
	}

	public getInitiAlStAte(): modes.IStAte {
		return this._ActuAl.getInitiAlStAte();
	}

	public tokenize(line: string, stAte: modes.IStAte, offsetDeltA: number): TokenizAtionResult {
		throw new Error('Not supported!');
	}

	public tokenize2(line: string, stAte: modes.IStAte): TokenizAtionResult2 {
		let result = this._ActuAl.tokenizeEncoded(line, stAte);
		return new TokenizAtionResult2(result.tokens, result.endStAte);
	}
}

/**
 * @internAl
 */
export clAss TokenizAtionSupport2AdApter implements modes.ITokenizAtionSupport {

	privAte reAdonly _stAndAloneThemeService: IStAndAloneThemeService;
	privAte reAdonly _lAnguAgeIdentifier: modes.LAnguAgeIdentifier;
	privAte reAdonly _ActuAl: TokensProvider;

	constructor(stAndAloneThemeService: IStAndAloneThemeService, lAnguAgeIdentifier: modes.LAnguAgeIdentifier, ActuAl: TokensProvider) {
		this._stAndAloneThemeService = stAndAloneThemeService;
		this._lAnguAgeIdentifier = lAnguAgeIdentifier;
		this._ActuAl = ActuAl;
	}

	public getInitiAlStAte(): modes.IStAte {
		return this._ActuAl.getInitiAlStAte();
	}

	privAte _toClAssicTokens(tokens: IToken[], lAnguAge: string, offsetDeltA: number): Token[] {
		let result: Token[] = [];
		let previousStArtIndex: number = 0;
		for (let i = 0, len = tokens.length; i < len; i++) {
			const t = tokens[i];
			let stArtIndex = t.stArtIndex;

			// Prevent issues stemming from A buggy externAl tokenizer.
			if (i === 0) {
				// Force first token to stArt At first index!
				stArtIndex = 0;
			} else if (stArtIndex < previousStArtIndex) {
				// Force tokens to be After one Another!
				stArtIndex = previousStArtIndex;
			}

			result[i] = new Token(stArtIndex + offsetDeltA, t.scopes, lAnguAge);

			previousStArtIndex = stArtIndex;
		}
		return result;
	}

	public tokenize(line: string, stAte: modes.IStAte, offsetDeltA: number): TokenizAtionResult {
		let ActuAlResult = this._ActuAl.tokenize(line, stAte);
		let tokens = this._toClAssicTokens(ActuAlResult.tokens, this._lAnguAgeIdentifier.lAnguAge, offsetDeltA);

		let endStAte: modes.IStAte;
		// try to sAve An object if possible
		if (ActuAlResult.endStAte.equAls(stAte)) {
			endStAte = stAte;
		} else {
			endStAte = ActuAlResult.endStAte;
		}

		return new TokenizAtionResult(tokens, endStAte);
	}

	privAte _toBinAryTokens(tokens: IToken[], offsetDeltA: number): Uint32ArrAy {
		const lAnguAgeId = this._lAnguAgeIdentifier.id;
		const tokenTheme = this._stAndAloneThemeService.getColorTheme().tokenTheme;

		let result: number[] = [], resultLen = 0;
		let previousStArtIndex: number = 0;
		for (let i = 0, len = tokens.length; i < len; i++) {
			const t = tokens[i];
			const metAdAtA = tokenTheme.mAtch(lAnguAgeId, t.scopes);
			if (resultLen > 0 && result[resultLen - 1] === metAdAtA) {
				// sAme metAdAtA
				continue;
			}

			let stArtIndex = t.stArtIndex;

			// Prevent issues stemming from A buggy externAl tokenizer.
			if (i === 0) {
				// Force first token to stArt At first index!
				stArtIndex = 0;
			} else if (stArtIndex < previousStArtIndex) {
				// Force tokens to be After one Another!
				stArtIndex = previousStArtIndex;
			}

			result[resultLen++] = stArtIndex + offsetDeltA;
			result[resultLen++] = metAdAtA;

			previousStArtIndex = stArtIndex;
		}

		let ActuAlResult = new Uint32ArrAy(resultLen);
		for (let i = 0; i < resultLen; i++) {
			ActuAlResult[i] = result[i];
		}
		return ActuAlResult;
	}

	public tokenize2(line: string, stAte: modes.IStAte, offsetDeltA: number): TokenizAtionResult2 {
		let ActuAlResult = this._ActuAl.tokenize(line, stAte);
		let tokens = this._toBinAryTokens(ActuAlResult.tokens, offsetDeltA);

		let endStAte: modes.IStAte;
		// try to sAve An object if possible
		if (ActuAlResult.endStAte.equAls(stAte)) {
			endStAte = stAte;
		} else {
			endStAte = ActuAlResult.endStAte;
		}

		return new TokenizAtionResult2(tokens, endStAte);
	}
}

/**
 * A token.
 */
export interfAce IToken {
	stArtIndex: number;
	scopes: string;
}

/**
 * The result of A line tokenizAtion.
 */
export interfAce ILineTokens {
	/**
	 * The list of tokens on the line.
	 */
	tokens: IToken[];
	/**
	 * The tokenizAtion end stAte.
	 * A pointer will be held to this And the object should not be modified by the tokenizer After the pointer is returned.
	 */
	endStAte: modes.IStAte;
}

/**
 * The result of A line tokenizAtion.
 */
export interfAce IEncodedLineTokens {
	/**
	 * The tokens on the line in A binAry, encoded formAt. EAch token occupies two ArrAy indices. For token i:
	 *  - At offset 2*i => stArtIndex
	 *  - At offset 2*i + 1 => metAdAtA
	 * MetA dAtA is in binAry formAt:
	 * - -------------------------------------------
	 *     3322 2222 2222 1111 1111 1100 0000 0000
	 *     1098 7654 3210 9876 5432 1098 7654 3210
	 * - -------------------------------------------
	 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
	 * - -------------------------------------------
	 *  - L = EncodedLAnguAgeId (8 bits): Use `getEncodedLAnguAgeId` to get the encoded ID of A lAnguAge.
	 *  - T = StAndArdTokenType (3 bits): Other = 0, Comment = 1, String = 2, RegEx = 4.
	 *  - F = FontStyle (3 bits): None = 0, ItAlic = 1, Bold = 2, Underline = 4.
	 *  - f = foreground ColorId (9 bits)
	 *  - b = bAckground ColorId (9 bits)
	 *  - The color vAlue for eAch colorId is defined in IStAndAloneThemeDAtA.customTokenColors:
	 * e.g. colorId = 1 is stored in IStAndAloneThemeDAtA.customTokenColors[1]. Color id = 0 meAns no color,
	 * id = 1 is for the defAult foreground color, id = 2 for the defAult bAckground.
	 */
	tokens: Uint32ArrAy;
	/**
	 * The tokenizAtion end stAte.
	 * A pointer will be held to this And the object should not be modified by the tokenizer After the pointer is returned.
	 */
	endStAte: modes.IStAte;
}

/**
 * A "mAnuAl" provider of tokens.
 */
export interfAce TokensProvider {
	/**
	 * The initiAl stAte of A lAnguAge. Will be the stAte pAssed in to tokenize the first line.
	 */
	getInitiAlStAte(): modes.IStAte;
	/**
	 * Tokenize A line given the stAte At the beginning of the line.
	 */
	tokenize(line: string, stAte: modes.IStAte): ILineTokens;
}

/**
 * A "mAnuAl" provider of tokens, returning tokens in A binAry form.
 */
export interfAce EncodedTokensProvider {
	/**
	 * The initiAl stAte of A lAnguAge. Will be the stAte pAssed in to tokenize the first line.
	 */
	getInitiAlStAte(): modes.IStAte;
	/**
	 * Tokenize A line given the stAte At the beginning of the line.
	 */
	tokenizeEncoded(line: string, stAte: modes.IStAte): IEncodedLineTokens;
}

function isEncodedTokensProvider(provider: TokensProvider | EncodedTokensProvider): provider is EncodedTokensProvider {
	return 'tokenizeEncoded' in provider;
}

function isThenAble<T>(obj: Any): obj is ThenAble<T> {
	return obj && typeof obj.then === 'function';
}

/**
 * Set the tokens provider for A lAnguAge (mAnuAl implementAtion).
 */
export function setTokensProvider(lAnguAgeId: string, provider: TokensProvider | EncodedTokensProvider | ThenAble<TokensProvider | EncodedTokensProvider>): IDisposAble {
	let lAnguAgeIdentifier = StAticServices.modeService.get().getLAnguAgeIdentifier(lAnguAgeId);
	if (!lAnguAgeIdentifier) {
		throw new Error(`CAnnot set tokens provider for unknown lAnguAge ${lAnguAgeId}`);
	}
	const creAte = (provider: TokensProvider | EncodedTokensProvider) => {
		if (isEncodedTokensProvider(provider)) {
			return new EncodedTokenizAtionSupport2AdApter(provider);
		} else {
			return new TokenizAtionSupport2AdApter(StAticServices.stAndAloneThemeService.get(), lAnguAgeIdentifier!, provider);
		}
	};
	if (isThenAble<TokensProvider | EncodedTokensProvider>(provider)) {
		return modes.TokenizAtionRegistry.registerPromise(lAnguAgeId, provider.then(provider => creAte(provider)));
	}
	return modes.TokenizAtionRegistry.register(lAnguAgeId, creAte(provider));
}


/**
 * Set the tokens provider for A lAnguAge (monArch implementAtion).
 */
export function setMonArchTokensProvider(lAnguAgeId: string, lAnguAgeDef: IMonArchLAnguAge | ThenAble<IMonArchLAnguAge>): IDisposAble {
	const creAte = (lAnguAgeDef: IMonArchLAnguAge) => {
		return creAteTokenizAtionSupport(StAticServices.modeService.get(), StAticServices.stAndAloneThemeService.get(), lAnguAgeId, compile(lAnguAgeId, lAnguAgeDef));
	};
	if (isThenAble<IMonArchLAnguAge>(lAnguAgeDef)) {
		return modes.TokenizAtionRegistry.registerPromise(lAnguAgeId, lAnguAgeDef.then(lAnguAgeDef => creAte(lAnguAgeDef)));
	}
	return modes.TokenizAtionRegistry.register(lAnguAgeId, creAte(lAnguAgeDef));
}

/**
 * Register A reference provider (used by e.g. reference seArch).
 */
export function registerReferenceProvider(lAnguAgeId: string, provider: modes.ReferenceProvider): IDisposAble {
	return modes.ReferenceProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A renAme provider (used by e.g. renAme symbol).
 */
export function registerRenAmeProvider(lAnguAgeId: string, provider: modes.RenAmeProvider): IDisposAble {
	return modes.RenAmeProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A signAture help provider (used by e.g. pArAmeter hints).
 */
export function registerSignAtureHelpProvider(lAnguAgeId: string, provider: modes.SignAtureHelpProvider): IDisposAble {
	return modes.SignAtureHelpProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A hover provider (used by e.g. editor hover).
 */
export function registerHoverProvider(lAnguAgeId: string, provider: modes.HoverProvider): IDisposAble {
	return modes.HoverProviderRegistry.register(lAnguAgeId, {
		provideHover: (model: model.ITextModel, position: Position, token: CAncellAtionToken): Promise<modes.Hover | undefined> => {
			let word = model.getWordAtPosition(position);

			return Promise.resolve<modes.Hover | null | undefined>(provider.provideHover(model, position, token)).then((vAlue): modes.Hover | undefined => {
				if (!vAlue) {
					return undefined;
				}
				if (!vAlue.rAnge && word) {
					vAlue.rAnge = new RAnge(position.lineNumber, word.stArtColumn, position.lineNumber, word.endColumn);
				}
				if (!vAlue.rAnge) {
					vAlue.rAnge = new RAnge(position.lineNumber, position.column, position.lineNumber, position.column);
				}
				return vAlue;
			});
		}
	});
}

/**
 * Register A document symbol provider (used by e.g. outline).
 */
export function registerDocumentSymbolProvider(lAnguAgeId: string, provider: modes.DocumentSymbolProvider): IDisposAble {
	return modes.DocumentSymbolProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A document highlight provider (used by e.g. highlight occurrences).
 */
export function registerDocumentHighlightProvider(lAnguAgeId: string, provider: modes.DocumentHighlightProvider): IDisposAble {
	return modes.DocumentHighlightProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register An on type renAme provider.
 */
export function registerOnTypeRenAmeProvider(lAnguAgeId: string, provider: modes.OnTypeRenAmeProvider): IDisposAble {
	return modes.OnTypeRenAmeProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A definition provider (used by e.g. go to definition).
 */
export function registerDefinitionProvider(lAnguAgeId: string, provider: modes.DefinitionProvider): IDisposAble {
	return modes.DefinitionProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A implementAtion provider (used by e.g. go to implementAtion).
 */
export function registerImplementAtionProvider(lAnguAgeId: string, provider: modes.ImplementAtionProvider): IDisposAble {
	return modes.ImplementAtionProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A type definition provider (used by e.g. go to type definition).
 */
export function registerTypeDefinitionProvider(lAnguAgeId: string, provider: modes.TypeDefinitionProvider): IDisposAble {
	return modes.TypeDefinitionProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A code lens provider (used by e.g. inline code lenses).
 */
export function registerCodeLensProvider(lAnguAgeId: string, provider: modes.CodeLensProvider): IDisposAble {
	return modes.CodeLensProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A code Action provider (used by e.g. quick fix).
 */
export function registerCodeActionProvider(lAnguAgeId: string, provider: CodeActionProvider): IDisposAble {
	return modes.CodeActionProviderRegistry.register(lAnguAgeId, {
		provideCodeActions: (model: model.ITextModel, rAnge: RAnge, context: modes.CodeActionContext, token: CAncellAtionToken): modes.ProviderResult<modes.CodeActionList> => {
			let mArkers = StAticServices.mArkerService.get().reAd({ resource: model.uri }).filter(m => {
				return RAnge.AreIntersectingOrTouching(m, rAnge);
			});
			return provider.provideCodeActions(model, rAnge, { mArkers, only: context.only }, token);
		}
	});
}

/**
 * Register A formAtter thAt cAn hAndle only entire models.
 */
export function registerDocumentFormAttingEditProvider(lAnguAgeId: string, provider: modes.DocumentFormAttingEditProvider): IDisposAble {
	return modes.DocumentFormAttingEditProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A formAtter thAt cAn hAndle A rAnge inside A model.
 */
export function registerDocumentRAngeFormAttingEditProvider(lAnguAgeId: string, provider: modes.DocumentRAngeFormAttingEditProvider): IDisposAble {
	return modes.DocumentRAngeFormAttingEditProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A formAtter thAn cAn do formAtting As the user types.
 */
export function registerOnTypeFormAttingEditProvider(lAnguAgeId: string, provider: modes.OnTypeFormAttingEditProvider): IDisposAble {
	return modes.OnTypeFormAttingEditProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A link provider thAt cAn find links in text.
 */
export function registerLinkProvider(lAnguAgeId: string, provider: modes.LinkProvider): IDisposAble {
	return modes.LinkProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A completion item provider (use by e.g. suggestions).
 */
export function registerCompletionItemProvider(lAnguAgeId: string, provider: modes.CompletionItemProvider): IDisposAble {
	return modes.CompletionProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A document color provider (used by Color Picker, Color DecorAtor).
 */
export function registerColorProvider(lAnguAgeId: string, provider: modes.DocumentColorProvider): IDisposAble {
	return modes.ColorProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A folding rAnge provider
 */
export function registerFoldingRAngeProvider(lAnguAgeId: string, provider: modes.FoldingRAngeProvider): IDisposAble {
	return modes.FoldingRAngeProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A declArAtion provider
 */
export function registerDeclArAtionProvider(lAnguAgeId: string, provider: modes.DeclArAtionProvider): IDisposAble {
	return modes.DeclArAtionProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A selection rAnge provider
 */
export function registerSelectionRAngeProvider(lAnguAgeId: string, provider: modes.SelectionRAngeProvider): IDisposAble {
	return modes.SelectionRAngeRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A document semAntic tokens provider
 */
export function registerDocumentSemAnticTokensProvider(lAnguAgeId: string, provider: modes.DocumentSemAnticTokensProvider): IDisposAble {
	return modes.DocumentSemAnticTokensProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * Register A document rAnge semAntic tokens provider
 */
export function registerDocumentRAngeSemAnticTokensProvider(lAnguAgeId: string, provider: modes.DocumentRAngeSemAnticTokensProvider): IDisposAble {
	return modes.DocumentRAngeSemAnticTokensProviderRegistry.register(lAnguAgeId, provider);
}

/**
 * ContAins AdditionAl diAgnostic informAtion About the context in which
 * A [code Action](#CodeActionProvider.provideCodeActions) is run.
 */
export interfAce CodeActionContext {

	/**
	 * An ArrAy of diAgnostics.
	 */
	reAdonly mArkers: IMArkerDAtA[];

	/**
	 * Requested kind of Actions to return.
	 */
	reAdonly only?: string;
}

/**
 * The code Action interfAce defines the contrAct between extensions And
 * the [light bulb](https://code.visuAlstudio.com/docs/editor/editingevolved#_code-Action) feAture.
 */
export interfAce CodeActionProvider {
	/**
	 * Provide commAnds for the given document And rAnge.
	 */
	provideCodeActions(model: model.ITextModel, rAnge: RAnge, context: CodeActionContext, token: CAncellAtionToken): modes.ProviderResult<modes.CodeActionList>;
}

/**
 * @internAl
 */
export function creAteMonAcoLAnguAgesAPI(): typeof monAco.lAnguAges {
	return {
		register: <Any>register,
		getLAnguAges: <Any>getLAnguAges,
		onLAnguAge: <Any>onLAnguAge,
		getEncodedLAnguAgeId: <Any>getEncodedLAnguAgeId,

		// provider methods
		setLAnguAgeConfigurAtion: <Any>setLAnguAgeConfigurAtion,
		setTokensProvider: <Any>setTokensProvider,
		setMonArchTokensProvider: <Any>setMonArchTokensProvider,
		registerReferenceProvider: <Any>registerReferenceProvider,
		registerRenAmeProvider: <Any>registerRenAmeProvider,
		registerCompletionItemProvider: <Any>registerCompletionItemProvider,
		registerSignAtureHelpProvider: <Any>registerSignAtureHelpProvider,
		registerHoverProvider: <Any>registerHoverProvider,
		registerDocumentSymbolProvider: <Any>registerDocumentSymbolProvider,
		registerDocumentHighlightProvider: <Any>registerDocumentHighlightProvider,
		registerOnTypeRenAmeProvider: <Any>registerOnTypeRenAmeProvider,
		registerDefinitionProvider: <Any>registerDefinitionProvider,
		registerImplementAtionProvider: <Any>registerImplementAtionProvider,
		registerTypeDefinitionProvider: <Any>registerTypeDefinitionProvider,
		registerCodeLensProvider: <Any>registerCodeLensProvider,
		registerCodeActionProvider: <Any>registerCodeActionProvider,
		registerDocumentFormAttingEditProvider: <Any>registerDocumentFormAttingEditProvider,
		registerDocumentRAngeFormAttingEditProvider: <Any>registerDocumentRAngeFormAttingEditProvider,
		registerOnTypeFormAttingEditProvider: <Any>registerOnTypeFormAttingEditProvider,
		registerLinkProvider: <Any>registerLinkProvider,
		registerColorProvider: <Any>registerColorProvider,
		registerFoldingRAngeProvider: <Any>registerFoldingRAngeProvider,
		registerDeclArAtionProvider: <Any>registerDeclArAtionProvider,
		registerSelectionRAngeProvider: <Any>registerSelectionRAngeProvider,
		registerDocumentSemAnticTokensProvider: <Any>registerDocumentSemAnticTokensProvider,
		registerDocumentRAngeSemAnticTokensProvider: <Any>registerDocumentRAngeSemAnticTokensProvider,

		// enums
		DocumentHighlightKind: stAndAloneEnums.DocumentHighlightKind,
		CompletionItemKind: stAndAloneEnums.CompletionItemKind,
		CompletionItemTAg: stAndAloneEnums.CompletionItemTAg,
		CompletionItemInsertTextRule: stAndAloneEnums.CompletionItemInsertTextRule,
		SymbolKind: stAndAloneEnums.SymbolKind,
		SymbolTAg: stAndAloneEnums.SymbolTAg,
		IndentAction: stAndAloneEnums.IndentAction,
		CompletionTriggerKind: stAndAloneEnums.CompletionTriggerKind,
		SignAtureHelpTriggerKind: stAndAloneEnums.SignAtureHelpTriggerKind,

		// clAsses
		FoldingRAngeKind: modes.FoldingRAngeKind,
	};
}
