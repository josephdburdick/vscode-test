/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Token, TokenizationResult, TokenizationResult2 } from 'vs/editor/common/core/token';
import * as model from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import { LanguageConfiguration } from 'vs/editor/common/modes/languageConfiguration';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { ILanguageExtensionPoint } from 'vs/editor/common/services/modeService';
import * as standaloneEnums from 'vs/editor/common/standalone/standaloneEnums';
import { StaticServices } from 'vs/editor/standalone/Browser/standaloneServices';
import { compile } from 'vs/editor/standalone/common/monarch/monarchCompile';
import { createTokenizationSupport } from 'vs/editor/standalone/common/monarch/monarchLexer';
import { IMonarchLanguage } from 'vs/editor/standalone/common/monarch/monarchTypes';
import { IStandaloneThemeService } from 'vs/editor/standalone/common/standaloneThemeService';
import { IMarkerData } from 'vs/platform/markers/common/markers';

/**
 * Register information aBout a new language.
 */
export function register(language: ILanguageExtensionPoint): void {
	ModesRegistry.registerLanguage(language);
}

/**
 * Get the information of all the registered languages.
 */
export function getLanguages(): ILanguageExtensionPoint[] {
	let result: ILanguageExtensionPoint[] = [];
	result = result.concat(ModesRegistry.getLanguages());
	return result;
}

export function getEncodedLanguageId(languageId: string): numBer {
	let lid = StaticServices.modeService.get().getLanguageIdentifier(languageId);
	return lid ? lid.id : 0;
}

/**
 * An event emitted when a language is first time needed (e.g. a model has it set).
 * @event
 */
export function onLanguage(languageId: string, callBack: () => void): IDisposaBle {
	let disposaBle = StaticServices.modeService.get().onDidCreateMode((mode) => {
		if (mode.getId() === languageId) {
			// stop listening
			disposaBle.dispose();
			// invoke actual listener
			callBack();
		}
	});
	return disposaBle;
}

/**
 * Set the editing configuration for a language.
 */
export function setLanguageConfiguration(languageId: string, configuration: LanguageConfiguration): IDisposaBle {
	let languageIdentifier = StaticServices.modeService.get().getLanguageIdentifier(languageId);
	if (!languageIdentifier) {
		throw new Error(`Cannot set configuration for unknown language ${languageId}`);
	}
	return LanguageConfigurationRegistry.register(languageIdentifier, configuration);
}

/**
 * @internal
 */
export class EncodedTokenizationSupport2Adapter implements modes.ITokenizationSupport {

	private readonly _actual: EncodedTokensProvider;

	constructor(actual: EncodedTokensProvider) {
		this._actual = actual;
	}

	puBlic getInitialState(): modes.IState {
		return this._actual.getInitialState();
	}

	puBlic tokenize(line: string, state: modes.IState, offsetDelta: numBer): TokenizationResult {
		throw new Error('Not supported!');
	}

	puBlic tokenize2(line: string, state: modes.IState): TokenizationResult2 {
		let result = this._actual.tokenizeEncoded(line, state);
		return new TokenizationResult2(result.tokens, result.endState);
	}
}

/**
 * @internal
 */
export class TokenizationSupport2Adapter implements modes.ITokenizationSupport {

	private readonly _standaloneThemeService: IStandaloneThemeService;
	private readonly _languageIdentifier: modes.LanguageIdentifier;
	private readonly _actual: TokensProvider;

	constructor(standaloneThemeService: IStandaloneThemeService, languageIdentifier: modes.LanguageIdentifier, actual: TokensProvider) {
		this._standaloneThemeService = standaloneThemeService;
		this._languageIdentifier = languageIdentifier;
		this._actual = actual;
	}

	puBlic getInitialState(): modes.IState {
		return this._actual.getInitialState();
	}

	private _toClassicTokens(tokens: IToken[], language: string, offsetDelta: numBer): Token[] {
		let result: Token[] = [];
		let previousStartIndex: numBer = 0;
		for (let i = 0, len = tokens.length; i < len; i++) {
			const t = tokens[i];
			let startIndex = t.startIndex;

			// Prevent issues stemming from a Buggy external tokenizer.
			if (i === 0) {
				// Force first token to start at first index!
				startIndex = 0;
			} else if (startIndex < previousStartIndex) {
				// Force tokens to Be after one another!
				startIndex = previousStartIndex;
			}

			result[i] = new Token(startIndex + offsetDelta, t.scopes, language);

			previousStartIndex = startIndex;
		}
		return result;
	}

	puBlic tokenize(line: string, state: modes.IState, offsetDelta: numBer): TokenizationResult {
		let actualResult = this._actual.tokenize(line, state);
		let tokens = this._toClassicTokens(actualResult.tokens, this._languageIdentifier.language, offsetDelta);

		let endState: modes.IState;
		// try to save an oBject if possiBle
		if (actualResult.endState.equals(state)) {
			endState = state;
		} else {
			endState = actualResult.endState;
		}

		return new TokenizationResult(tokens, endState);
	}

	private _toBinaryTokens(tokens: IToken[], offsetDelta: numBer): Uint32Array {
		const languageId = this._languageIdentifier.id;
		const tokenTheme = this._standaloneThemeService.getColorTheme().tokenTheme;

		let result: numBer[] = [], resultLen = 0;
		let previousStartIndex: numBer = 0;
		for (let i = 0, len = tokens.length; i < len; i++) {
			const t = tokens[i];
			const metadata = tokenTheme.match(languageId, t.scopes);
			if (resultLen > 0 && result[resultLen - 1] === metadata) {
				// same metadata
				continue;
			}

			let startIndex = t.startIndex;

			// Prevent issues stemming from a Buggy external tokenizer.
			if (i === 0) {
				// Force first token to start at first index!
				startIndex = 0;
			} else if (startIndex < previousStartIndex) {
				// Force tokens to Be after one another!
				startIndex = previousStartIndex;
			}

			result[resultLen++] = startIndex + offsetDelta;
			result[resultLen++] = metadata;

			previousStartIndex = startIndex;
		}

		let actualResult = new Uint32Array(resultLen);
		for (let i = 0; i < resultLen; i++) {
			actualResult[i] = result[i];
		}
		return actualResult;
	}

	puBlic tokenize2(line: string, state: modes.IState, offsetDelta: numBer): TokenizationResult2 {
		let actualResult = this._actual.tokenize(line, state);
		let tokens = this._toBinaryTokens(actualResult.tokens, offsetDelta);

		let endState: modes.IState;
		// try to save an oBject if possiBle
		if (actualResult.endState.equals(state)) {
			endState = state;
		} else {
			endState = actualResult.endState;
		}

		return new TokenizationResult2(tokens, endState);
	}
}

/**
 * A token.
 */
export interface IToken {
	startIndex: numBer;
	scopes: string;
}

/**
 * The result of a line tokenization.
 */
export interface ILineTokens {
	/**
	 * The list of tokens on the line.
	 */
	tokens: IToken[];
	/**
	 * The tokenization end state.
	 * A pointer will Be held to this and the oBject should not Be modified By the tokenizer after the pointer is returned.
	 */
	endState: modes.IState;
}

/**
 * The result of a line tokenization.
 */
export interface IEncodedLineTokens {
	/**
	 * The tokens on the line in a Binary, encoded format. Each token occupies two array indices. For token i:
	 *  - at offset 2*i => startIndex
	 *  - at offset 2*i + 1 => metadata
	 * Meta data is in Binary format:
	 * - -------------------------------------------
	 *     3322 2222 2222 1111 1111 1100 0000 0000
	 *     1098 7654 3210 9876 5432 1098 7654 3210
	 * - -------------------------------------------
	 *     BBBB BBBB Bfff ffff ffFF FTTT LLLL LLLL
	 * - -------------------------------------------
	 *  - L = EncodedLanguageId (8 Bits): Use `getEncodedLanguageId` to get the encoded ID of a language.
	 *  - T = StandardTokenType (3 Bits): Other = 0, Comment = 1, String = 2, RegEx = 4.
	 *  - F = FontStyle (3 Bits): None = 0, Italic = 1, Bold = 2, Underline = 4.
	 *  - f = foreground ColorId (9 Bits)
	 *  - B = Background ColorId (9 Bits)
	 *  - The color value for each colorId is defined in IStandaloneThemeData.customTokenColors:
	 * e.g. colorId = 1 is stored in IStandaloneThemeData.customTokenColors[1]. Color id = 0 means no color,
	 * id = 1 is for the default foreground color, id = 2 for the default Background.
	 */
	tokens: Uint32Array;
	/**
	 * The tokenization end state.
	 * A pointer will Be held to this and the oBject should not Be modified By the tokenizer after the pointer is returned.
	 */
	endState: modes.IState;
}

/**
 * A "manual" provider of tokens.
 */
export interface TokensProvider {
	/**
	 * The initial state of a language. Will Be the state passed in to tokenize the first line.
	 */
	getInitialState(): modes.IState;
	/**
	 * Tokenize a line given the state at the Beginning of the line.
	 */
	tokenize(line: string, state: modes.IState): ILineTokens;
}

/**
 * A "manual" provider of tokens, returning tokens in a Binary form.
 */
export interface EncodedTokensProvider {
	/**
	 * The initial state of a language. Will Be the state passed in to tokenize the first line.
	 */
	getInitialState(): modes.IState;
	/**
	 * Tokenize a line given the state at the Beginning of the line.
	 */
	tokenizeEncoded(line: string, state: modes.IState): IEncodedLineTokens;
}

function isEncodedTokensProvider(provider: TokensProvider | EncodedTokensProvider): provider is EncodedTokensProvider {
	return 'tokenizeEncoded' in provider;
}

function isThenaBle<T>(oBj: any): oBj is ThenaBle<T> {
	return oBj && typeof oBj.then === 'function';
}

/**
 * Set the tokens provider for a language (manual implementation).
 */
export function setTokensProvider(languageId: string, provider: TokensProvider | EncodedTokensProvider | ThenaBle<TokensProvider | EncodedTokensProvider>): IDisposaBle {
	let languageIdentifier = StaticServices.modeService.get().getLanguageIdentifier(languageId);
	if (!languageIdentifier) {
		throw new Error(`Cannot set tokens provider for unknown language ${languageId}`);
	}
	const create = (provider: TokensProvider | EncodedTokensProvider) => {
		if (isEncodedTokensProvider(provider)) {
			return new EncodedTokenizationSupport2Adapter(provider);
		} else {
			return new TokenizationSupport2Adapter(StaticServices.standaloneThemeService.get(), languageIdentifier!, provider);
		}
	};
	if (isThenaBle<TokensProvider | EncodedTokensProvider>(provider)) {
		return modes.TokenizationRegistry.registerPromise(languageId, provider.then(provider => create(provider)));
	}
	return modes.TokenizationRegistry.register(languageId, create(provider));
}


/**
 * Set the tokens provider for a language (monarch implementation).
 */
export function setMonarchTokensProvider(languageId: string, languageDef: IMonarchLanguage | ThenaBle<IMonarchLanguage>): IDisposaBle {
	const create = (languageDef: IMonarchLanguage) => {
		return createTokenizationSupport(StaticServices.modeService.get(), StaticServices.standaloneThemeService.get(), languageId, compile(languageId, languageDef));
	};
	if (isThenaBle<IMonarchLanguage>(languageDef)) {
		return modes.TokenizationRegistry.registerPromise(languageId, languageDef.then(languageDef => create(languageDef)));
	}
	return modes.TokenizationRegistry.register(languageId, create(languageDef));
}

/**
 * Register a reference provider (used By e.g. reference search).
 */
export function registerReferenceProvider(languageId: string, provider: modes.ReferenceProvider): IDisposaBle {
	return modes.ReferenceProviderRegistry.register(languageId, provider);
}

/**
 * Register a rename provider (used By e.g. rename symBol).
 */
export function registerRenameProvider(languageId: string, provider: modes.RenameProvider): IDisposaBle {
	return modes.RenameProviderRegistry.register(languageId, provider);
}

/**
 * Register a signature help provider (used By e.g. parameter hints).
 */
export function registerSignatureHelpProvider(languageId: string, provider: modes.SignatureHelpProvider): IDisposaBle {
	return modes.SignatureHelpProviderRegistry.register(languageId, provider);
}

/**
 * Register a hover provider (used By e.g. editor hover).
 */
export function registerHoverProvider(languageId: string, provider: modes.HoverProvider): IDisposaBle {
	return modes.HoverProviderRegistry.register(languageId, {
		provideHover: (model: model.ITextModel, position: Position, token: CancellationToken): Promise<modes.Hover | undefined> => {
			let word = model.getWordAtPosition(position);

			return Promise.resolve<modes.Hover | null | undefined>(provider.provideHover(model, position, token)).then((value): modes.Hover | undefined => {
				if (!value) {
					return undefined;
				}
				if (!value.range && word) {
					value.range = new Range(position.lineNumBer, word.startColumn, position.lineNumBer, word.endColumn);
				}
				if (!value.range) {
					value.range = new Range(position.lineNumBer, position.column, position.lineNumBer, position.column);
				}
				return value;
			});
		}
	});
}

/**
 * Register a document symBol provider (used By e.g. outline).
 */
export function registerDocumentSymBolProvider(languageId: string, provider: modes.DocumentSymBolProvider): IDisposaBle {
	return modes.DocumentSymBolProviderRegistry.register(languageId, provider);
}

/**
 * Register a document highlight provider (used By e.g. highlight occurrences).
 */
export function registerDocumentHighlightProvider(languageId: string, provider: modes.DocumentHighlightProvider): IDisposaBle {
	return modes.DocumentHighlightProviderRegistry.register(languageId, provider);
}

/**
 * Register an on type rename provider.
 */
export function registerOnTypeRenameProvider(languageId: string, provider: modes.OnTypeRenameProvider): IDisposaBle {
	return modes.OnTypeRenameProviderRegistry.register(languageId, provider);
}

/**
 * Register a definition provider (used By e.g. go to definition).
 */
export function registerDefinitionProvider(languageId: string, provider: modes.DefinitionProvider): IDisposaBle {
	return modes.DefinitionProviderRegistry.register(languageId, provider);
}

/**
 * Register a implementation provider (used By e.g. go to implementation).
 */
export function registerImplementationProvider(languageId: string, provider: modes.ImplementationProvider): IDisposaBle {
	return modes.ImplementationProviderRegistry.register(languageId, provider);
}

/**
 * Register a type definition provider (used By e.g. go to type definition).
 */
export function registerTypeDefinitionProvider(languageId: string, provider: modes.TypeDefinitionProvider): IDisposaBle {
	return modes.TypeDefinitionProviderRegistry.register(languageId, provider);
}

/**
 * Register a code lens provider (used By e.g. inline code lenses).
 */
export function registerCodeLensProvider(languageId: string, provider: modes.CodeLensProvider): IDisposaBle {
	return modes.CodeLensProviderRegistry.register(languageId, provider);
}

/**
 * Register a code action provider (used By e.g. quick fix).
 */
export function registerCodeActionProvider(languageId: string, provider: CodeActionProvider): IDisposaBle {
	return modes.CodeActionProviderRegistry.register(languageId, {
		provideCodeActions: (model: model.ITextModel, range: Range, context: modes.CodeActionContext, token: CancellationToken): modes.ProviderResult<modes.CodeActionList> => {
			let markers = StaticServices.markerService.get().read({ resource: model.uri }).filter(m => {
				return Range.areIntersectingOrTouching(m, range);
			});
			return provider.provideCodeActions(model, range, { markers, only: context.only }, token);
		}
	});
}

/**
 * Register a formatter that can handle only entire models.
 */
export function registerDocumentFormattingEditProvider(languageId: string, provider: modes.DocumentFormattingEditProvider): IDisposaBle {
	return modes.DocumentFormattingEditProviderRegistry.register(languageId, provider);
}

/**
 * Register a formatter that can handle a range inside a model.
 */
export function registerDocumentRangeFormattingEditProvider(languageId: string, provider: modes.DocumentRangeFormattingEditProvider): IDisposaBle {
	return modes.DocumentRangeFormattingEditProviderRegistry.register(languageId, provider);
}

/**
 * Register a formatter than can do formatting as the user types.
 */
export function registerOnTypeFormattingEditProvider(languageId: string, provider: modes.OnTypeFormattingEditProvider): IDisposaBle {
	return modes.OnTypeFormattingEditProviderRegistry.register(languageId, provider);
}

/**
 * Register a link provider that can find links in text.
 */
export function registerLinkProvider(languageId: string, provider: modes.LinkProvider): IDisposaBle {
	return modes.LinkProviderRegistry.register(languageId, provider);
}

/**
 * Register a completion item provider (use By e.g. suggestions).
 */
export function registerCompletionItemProvider(languageId: string, provider: modes.CompletionItemProvider): IDisposaBle {
	return modes.CompletionProviderRegistry.register(languageId, provider);
}

/**
 * Register a document color provider (used By Color Picker, Color Decorator).
 */
export function registerColorProvider(languageId: string, provider: modes.DocumentColorProvider): IDisposaBle {
	return modes.ColorProviderRegistry.register(languageId, provider);
}

/**
 * Register a folding range provider
 */
export function registerFoldingRangeProvider(languageId: string, provider: modes.FoldingRangeProvider): IDisposaBle {
	return modes.FoldingRangeProviderRegistry.register(languageId, provider);
}

/**
 * Register a declaration provider
 */
export function registerDeclarationProvider(languageId: string, provider: modes.DeclarationProvider): IDisposaBle {
	return modes.DeclarationProviderRegistry.register(languageId, provider);
}

/**
 * Register a selection range provider
 */
export function registerSelectionRangeProvider(languageId: string, provider: modes.SelectionRangeProvider): IDisposaBle {
	return modes.SelectionRangeRegistry.register(languageId, provider);
}

/**
 * Register a document semantic tokens provider
 */
export function registerDocumentSemanticTokensProvider(languageId: string, provider: modes.DocumentSemanticTokensProvider): IDisposaBle {
	return modes.DocumentSemanticTokensProviderRegistry.register(languageId, provider);
}

/**
 * Register a document range semantic tokens provider
 */
export function registerDocumentRangeSemanticTokensProvider(languageId: string, provider: modes.DocumentRangeSemanticTokensProvider): IDisposaBle {
	return modes.DocumentRangeSemanticTokensProviderRegistry.register(languageId, provider);
}

/**
 * Contains additional diagnostic information aBout the context in which
 * a [code action](#CodeActionProvider.provideCodeActions) is run.
 */
export interface CodeActionContext {

	/**
	 * An array of diagnostics.
	 */
	readonly markers: IMarkerData[];

	/**
	 * Requested kind of actions to return.
	 */
	readonly only?: string;
}

/**
 * The code action interface defines the contract Between extensions and
 * the [light BulB](https://code.visualstudio.com/docs/editor/editingevolved#_code-action) feature.
 */
export interface CodeActionProvider {
	/**
	 * Provide commands for the given document and range.
	 */
	provideCodeActions(model: model.ITextModel, range: Range, context: CodeActionContext, token: CancellationToken): modes.ProviderResult<modes.CodeActionList>;
}

/**
 * @internal
 */
export function createMonacoLanguagesAPI(): typeof monaco.languages {
	return {
		register: <any>register,
		getLanguages: <any>getLanguages,
		onLanguage: <any>onLanguage,
		getEncodedLanguageId: <any>getEncodedLanguageId,

		// provider methods
		setLanguageConfiguration: <any>setLanguageConfiguration,
		setTokensProvider: <any>setTokensProvider,
		setMonarchTokensProvider: <any>setMonarchTokensProvider,
		registerReferenceProvider: <any>registerReferenceProvider,
		registerRenameProvider: <any>registerRenameProvider,
		registerCompletionItemProvider: <any>registerCompletionItemProvider,
		registerSignatureHelpProvider: <any>registerSignatureHelpProvider,
		registerHoverProvider: <any>registerHoverProvider,
		registerDocumentSymBolProvider: <any>registerDocumentSymBolProvider,
		registerDocumentHighlightProvider: <any>registerDocumentHighlightProvider,
		registerOnTypeRenameProvider: <any>registerOnTypeRenameProvider,
		registerDefinitionProvider: <any>registerDefinitionProvider,
		registerImplementationProvider: <any>registerImplementationProvider,
		registerTypeDefinitionProvider: <any>registerTypeDefinitionProvider,
		registerCodeLensProvider: <any>registerCodeLensProvider,
		registerCodeActionProvider: <any>registerCodeActionProvider,
		registerDocumentFormattingEditProvider: <any>registerDocumentFormattingEditProvider,
		registerDocumentRangeFormattingEditProvider: <any>registerDocumentRangeFormattingEditProvider,
		registerOnTypeFormattingEditProvider: <any>registerOnTypeFormattingEditProvider,
		registerLinkProvider: <any>registerLinkProvider,
		registerColorProvider: <any>registerColorProvider,
		registerFoldingRangeProvider: <any>registerFoldingRangeProvider,
		registerDeclarationProvider: <any>registerDeclarationProvider,
		registerSelectionRangeProvider: <any>registerSelectionRangeProvider,
		registerDocumentSemanticTokensProvider: <any>registerDocumentSemanticTokensProvider,
		registerDocumentRangeSemanticTokensProvider: <any>registerDocumentRangeSemanticTokensProvider,

		// enums
		DocumentHighlightKind: standaloneEnums.DocumentHighlightKind,
		CompletionItemKind: standaloneEnums.CompletionItemKind,
		CompletionItemTag: standaloneEnums.CompletionItemTag,
		CompletionItemInsertTextRule: standaloneEnums.CompletionItemInsertTextRule,
		SymBolKind: standaloneEnums.SymBolKind,
		SymBolTag: standaloneEnums.SymBolTag,
		IndentAction: standaloneEnums.IndentAction,
		CompletionTriggerKind: standaloneEnums.CompletionTriggerKind,
		SignatureHelpTriggerKind: standaloneEnums.SignatureHelpTriggerKind,

		// classes
		FoldingRangeKind: modes.FoldingRangeKind,
	};
}
