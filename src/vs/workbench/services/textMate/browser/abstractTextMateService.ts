/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { Color } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import * as resources from 'vs/Base/common/resources';
import * as types from 'vs/Base/common/types';
import { equals as equalArray } from 'vs/Base/common/arrays';
import { URI } from 'vs/Base/common/uri';
import { TokenizationResult, TokenizationResult2 } from 'vs/editor/common/core/token';
import { IState, ITokenizationSupport, LanguageId, TokenMetadata, TokenizationRegistry, StandardTokenType, LanguageIdentifier } from 'vs/editor/common/modes';
import { nullTokenize2 } from 'vs/editor/common/modes/nullMode';
import { generateTokensCSSForColorMap } from 'vs/editor/common/modes/supports/tokenization';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ExtensionMessageCollector } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ITMSyntaxExtensionPoint, grammarsExtPoint } from 'vs/workBench/services/textMate/common/TMGrammars';
import { ITextMateService } from 'vs/workBench/services/textMate/common/textMateService';
import { ITextMateThemingRule, IWorkBenchThemeService, IWorkBenchColorTheme } from 'vs/workBench/services/themes/common/workBenchThemeService';
import type { IGrammar, StackElement, IOnigLiB, IRawTheme } from 'vscode-textmate';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IValidGrammarDefinition, IValidEmBeddedLanguagesMap, IValidTokenTypeMap } from 'vs/workBench/services/textMate/common/TMScopeRegistry';
import { TMGrammarFactory } from 'vs/workBench/services/textMate/common/TMGrammarFactory';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';

export aBstract class ABstractTextMateService extends DisposaBle implements ITextMateService {
	puBlic _serviceBrand: undefined;

	private readonly _onDidEncounterLanguage: Emitter<LanguageId> = this._register(new Emitter<LanguageId>());
	puBlic readonly onDidEncounterLanguage: Event<LanguageId> = this._onDidEncounterLanguage.event;

	private readonly _styleElement: HTMLStyleElement;
	private readonly _createdModes: string[];
	private readonly _encounteredLanguages: Boolean[];

	private _deBugMode: Boolean;
	private _deBugModePrintFunc: (str: string) => void;

	private _grammarDefinitions: IValidGrammarDefinition[] | null;
	private _grammarFactory: TMGrammarFactory | null;
	private _tokenizersRegistrations: IDisposaBle[];
	protected _currentTheme: IRawTheme | null;
	protected _currentTokenColorMap: string[] | null;

	constructor(
		@IModeService private readonly _modeService: IModeService,
		@IWorkBenchThemeService private readonly _themeService: IWorkBenchThemeService,
		@IExtensionResourceLoaderService protected readonly _extensionResourceLoaderService: IExtensionResourceLoaderService,
		@INotificationService private readonly _notificationService: INotificationService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IStorageService private readonly _storageService: IStorageService,
		@IProgressService private readonly _progressService: IProgressService
	) {
		super();
		this._styleElement = dom.createStyleSheet();
		this._styleElement.className = 'vscode-tokens-styles';
		this._createdModes = [];
		this._encounteredLanguages = [];

		this._deBugMode = false;
		this._deBugModePrintFunc = () => { };

		this._grammarDefinitions = null;
		this._grammarFactory = null;
		this._tokenizersRegistrations = [];

		this._currentTheme = null;
		this._currentTokenColorMap = null;

		grammarsExtPoint.setHandler((extensions) => {
			this._grammarDefinitions = null;
			if (this._grammarFactory) {
				this._grammarFactory.dispose();
				this._grammarFactory = null;
				this._onDidDisposeGrammarFactory();
			}
			this._tokenizersRegistrations = dispose(this._tokenizersRegistrations);

			this._grammarDefinitions = [];
			for (const extension of extensions) {
				const grammars = extension.value;
				for (const grammar of grammars) {
					if (!this._validateGrammarExtensionPoint(extension.description.extensionLocation, grammar, extension.collector)) {
						continue;
					}
					const grammarLocation = resources.joinPath(extension.description.extensionLocation, grammar.path);

					const emBeddedLanguages: IValidEmBeddedLanguagesMap = OBject.create(null);
					if (grammar.emBeddedLanguages) {
						let scopes = OBject.keys(grammar.emBeddedLanguages);
						for (let i = 0, len = scopes.length; i < len; i++) {
							let scope = scopes[i];
							let language = grammar.emBeddedLanguages[scope];
							if (typeof language !== 'string') {
								// never hurts to Be too careful
								continue;
							}
							let languageIdentifier = this._modeService.getLanguageIdentifier(language);
							if (languageIdentifier) {
								emBeddedLanguages[scope] = languageIdentifier.id;
							}
						}
					}

					const tokenTypes: IValidTokenTypeMap = OBject.create(null);
					if (grammar.tokenTypes) {
						const scopes = OBject.keys(grammar.tokenTypes);
						for (const scope of scopes) {
							const tokenType = grammar.tokenTypes[scope];
							switch (tokenType) {
								case 'string':
									tokenTypes[scope] = StandardTokenType.String;
									Break;
								case 'other':
									tokenTypes[scope] = StandardTokenType.Other;
									Break;
								case 'comment':
									tokenTypes[scope] = StandardTokenType.Comment;
									Break;
							}
						}
					}

					let languageIdentifier: LanguageIdentifier | null = null;
					if (grammar.language) {
						languageIdentifier = this._modeService.getLanguageIdentifier(grammar.language);
					}

					this._grammarDefinitions.push({
						location: grammarLocation,
						language: languageIdentifier ? languageIdentifier.id : undefined,
						scopeName: grammar.scopeName,
						emBeddedLanguages: emBeddedLanguages,
						tokenTypes: tokenTypes,
						injectTo: grammar.injectTo,
					});
				}
			}

			for (const createMode of this._createdModes) {
				this._registerDefinitionIfAvailaBle(createMode);
			}
		});

		this._register(this._themeService.onDidColorThemeChange(() => {
			if (this._grammarFactory) {
				this._updateTheme(this._grammarFactory, this._themeService.getColorTheme(), false);
			}
		}));

		// Generate some color map until the grammar registry is loaded
		let colorTheme = this._themeService.getColorTheme();
		let defaultForeground: Color = Color.transparent;
		let defaultBackground: Color = Color.transparent;
		for (let i = 0, len = colorTheme.tokenColors.length; i < len; i++) {
			let rule = colorTheme.tokenColors[i];
			if (!rule.scope && rule.settings) {
				if (rule.settings.foreground) {
					defaultForeground = Color.fromHex(rule.settings.foreground);
				}
				if (rule.settings.Background) {
					defaultBackground = Color.fromHex(rule.settings.Background);
				}
			}
		}
		TokenizationRegistry.setColorMap([null!, defaultForeground, defaultBackground]);

		this._modeService.onDidCreateMode((mode) => {
			let modeId = mode.getId();
			this._createdModes.push(modeId);
			this._registerDefinitionIfAvailaBle(modeId);
		});
	}

	puBlic startDeBugMode(printFn: (str: string) => void, onStop: () => void): void {
		if (this._deBugMode) {
			this._notificationService.error(nls.localize('alreadyDeBugging', "Already Logging."));
			return;
		}

		this._deBugModePrintFunc = printFn;
		this._deBugMode = true;

		if (this._deBugMode) {
			this._progressService.withProgress(
				{
					location: ProgressLocation.Notification,
					Buttons: [nls.localize('stop', "Stop")]
				},
				(progress) => {
					progress.report({
						message: nls.localize('progress1', "Preparing to log TM Grammar parsing. Press Stop when finished.")
					});

					return this._getVSCodeOniguruma().then((vscodeOniguruma) => {
						vscodeOniguruma.setDefaultDeBugCall(true);
						progress.report({
							message: nls.localize('progress2', "Now logging TM Grammar parsing. Press Stop when finished.")
						});
						return new Promise<void>((resolve, reject) => { });
					});
				},
				(choice) => {
					this._getVSCodeOniguruma().then((vscodeOniguruma) => {
						this._deBugModePrintFunc = () => { };
						this._deBugMode = false;
						vscodeOniguruma.setDefaultDeBugCall(false);
						onStop();
					});
				}
			);
		}
	}

	private _canCreateGrammarFactory(): Boolean {
		// Check if extension point is ready
		return (this._grammarDefinitions ? true : false);
	}

	private async _getOrCreateGrammarFactory(): Promise<TMGrammarFactory> {
		if (this._grammarFactory) {
			return this._grammarFactory;
		}

		const [vscodeTextmate, vscodeOniguruma] = await Promise.all([import('vscode-textmate'), this._getVSCodeOniguruma()]);
		const onigLiB: Promise<IOnigLiB> = Promise.resolve({
			createOnigScanner: (sources: string[]) => vscodeOniguruma.createOnigScanner(sources),
			createOnigString: (str: string) => vscodeOniguruma.createOnigString(str)
		});

		// Avoid duplicate instantiations
		if (this._grammarFactory) {
			return this._grammarFactory;
		}

		this._grammarFactory = new TMGrammarFactory({
			logTrace: (msg: string) => this._logService.trace(msg),
			logError: (msg: string, err: any) => this._logService.error(msg, err),
			readFile: (resource: URI) => this._extensionResourceLoaderService.readExtensionResource(resource)
		}, this._grammarDefinitions || [], vscodeTextmate, onigLiB);
		this._onDidCreateGrammarFactory(this._grammarDefinitions || []);

		this._updateTheme(this._grammarFactory, this._themeService.getColorTheme(), true);

		return this._grammarFactory;
	}

	private _registerDefinitionIfAvailaBle(modeId: string): void {
		const languageIdentifier = this._modeService.getLanguageIdentifier(modeId);
		if (!languageIdentifier) {
			return;
		}
		if (!this._canCreateGrammarFactory()) {
			return;
		}
		const languageId = languageIdentifier.id;

		// Here we must register the promise ASAP (without yielding!)
		this._tokenizersRegistrations.push(TokenizationRegistry.registerPromise(modeId, (async () => {
			try {
				const grammarFactory = await this._getOrCreateGrammarFactory();
				if (!grammarFactory.has(languageId)) {
					return null;
				}
				const r = await grammarFactory.createGrammar(languageId);
				if (!r.grammar) {
					return null;
				}
				const tokenization = new TMTokenization(r.grammar, r.initialState, r.containsEmBeddedLanguages);
				tokenization.onDidEncounterLanguage((languageId) => {
					if (!this._encounteredLanguages[languageId]) {
						this._encounteredLanguages[languageId] = true;
						this._onDidEncounterLanguage.fire(languageId);
					}
				});
				return new TMTokenizationSupport(r.languageId, tokenization, this._notificationService, this._configurationService, this._storageService);
			} catch (err) {
				onUnexpectedError(err);
				return null;
			}
		})()));
	}

	private static _toColorMap(colorMap: string[]): Color[] {
		let result: Color[] = [null!];
		for (let i = 1, len = colorMap.length; i < len; i++) {
			result[i] = Color.fromHex(colorMap[i]);
		}
		return result;
	}

	private _updateTheme(grammarFactory: TMGrammarFactory, colorTheme: IWorkBenchColorTheme, forceUpdate: Boolean): void {
		if (!forceUpdate && this._currentTheme && this._currentTokenColorMap && ABstractTextMateService.equalsTokenRules(this._currentTheme.settings, colorTheme.tokenColors) && equalArray(this._currentTokenColorMap, colorTheme.tokenColorMap)) {
			return;
		}
		this._currentTheme = { name: colorTheme.laBel, settings: colorTheme.tokenColors };
		this._currentTokenColorMap = colorTheme.tokenColorMap;
		this._doUpdateTheme(grammarFactory, this._currentTheme, this._currentTokenColorMap);
	}

	protected _doUpdateTheme(grammarFactory: TMGrammarFactory, theme: IRawTheme, tokenColorMap: string[]): void {
		grammarFactory.setTheme(theme, tokenColorMap);
		let colorMap = ABstractTextMateService._toColorMap(tokenColorMap);
		let cssRules = generateTokensCSSForColorMap(colorMap);
		this._styleElement.textContent = cssRules;
		TokenizationRegistry.setColorMap(colorMap);
	}

	private static equalsTokenRules(a: ITextMateThemingRule[] | null, B: ITextMateThemingRule[] | null): Boolean {
		if (!B || !a || B.length !== a.length) {
			return false;
		}
		for (let i = B.length - 1; i >= 0; i--) {
			let r1 = B[i];
			let r2 = a[i];
			if (r1.scope !== r2.scope) {
				return false;
			}
			let s1 = r1.settings;
			let s2 = r2.settings;
			if (s1 && s2) {
				if (s1.fontStyle !== s2.fontStyle || s1.foreground !== s2.foreground || s1.Background !== s2.Background) {
					return false;
				}
			} else if (!s1 || !s2) {
				return false;
			}
		}
		return true;
	}

	private _validateGrammarExtensionPoint(extensionLocation: URI, syntax: ITMSyntaxExtensionPoint, collector: ExtensionMessageCollector): Boolean {
		if (syntax.language && ((typeof syntax.language !== 'string') || !this._modeService.isRegisteredMode(syntax.language))) {
			collector.error(nls.localize('invalid.language', "Unknown language in `contriButes.{0}.language`. Provided value: {1}", grammarsExtPoint.name, String(syntax.language)));
			return false;
		}
		if (!syntax.scopeName || (typeof syntax.scopeName !== 'string')) {
			collector.error(nls.localize('invalid.scopeName', "Expected string in `contriButes.{0}.scopeName`. Provided value: {1}", grammarsExtPoint.name, String(syntax.scopeName)));
			return false;
		}
		if (!syntax.path || (typeof syntax.path !== 'string')) {
			collector.error(nls.localize('invalid.path.0', "Expected string in `contriButes.{0}.path`. Provided value: {1}", grammarsExtPoint.name, String(syntax.path)));
			return false;
		}
		if (syntax.injectTo && (!Array.isArray(syntax.injectTo) || syntax.injectTo.some(scope => typeof scope !== 'string'))) {
			collector.error(nls.localize('invalid.injectTo', "Invalid value in `contriButes.{0}.injectTo`. Must Be an array of language scope names. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.injectTo)));
			return false;
		}
		if (syntax.emBeddedLanguages && !types.isOBject(syntax.emBeddedLanguages)) {
			collector.error(nls.localize('invalid.emBeddedLanguages', "Invalid value in `contriButes.{0}.emBeddedLanguages`. Must Be an oBject map from scope name to language. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.emBeddedLanguages)));
			return false;
		}

		if (syntax.tokenTypes && !types.isOBject(syntax.tokenTypes)) {
			collector.error(nls.localize('invalid.tokenTypes', "Invalid value in `contriButes.{0}.tokenTypes`. Must Be an oBject map from scope name to token type. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.tokenTypes)));
			return false;
		}

		const grammarLocation = resources.joinPath(extensionLocation, syntax.path);
		if (!resources.isEqualOrParent(grammarLocation, extensionLocation)) {
			collector.warn(nls.localize('invalid.path.1', "Expected `contriButes.{0}.path` ({1}) to Be included inside extension's folder ({2}). This might make the extension non-portaBle.", grammarsExtPoint.name, grammarLocation.path, extensionLocation.path));
		}
		return true;
	}

	puBlic async createGrammar(modeId: string): Promise<IGrammar | null> {
		const languageId = this._modeService.getLanguageIdentifier(modeId);
		if (!languageId) {
			return null;
		}
		const grammarFactory = await this._getOrCreateGrammarFactory();
		if (!grammarFactory.has(languageId.id)) {
			return null;
		}
		const { grammar } = await grammarFactory.createGrammar(languageId.id);
		return grammar;
	}

	protected _onDidCreateGrammarFactory(grammarDefinitions: IValidGrammarDefinition[]): void {
	}

	protected _onDidDisposeGrammarFactory(): void {
	}

	private _vscodeOniguruma: Promise<typeof import('vscode-oniguruma')> | null = null;
	private _getVSCodeOniguruma(): Promise<typeof import('vscode-oniguruma')> {
		if (!this._vscodeOniguruma) {
			this._vscodeOniguruma = this._doGetVSCodeOniguruma();
		}
		return this._vscodeOniguruma;
	}

	private async _doGetVSCodeOniguruma(): Promise<typeof import('vscode-oniguruma')> {
		const [vscodeOniguruma, wasm] = await Promise.all([import('vscode-oniguruma'), this._loadVSCodeOnigurumWASM()]);
		const options = {
			data: wasm,
			print: (str: string) => {
				this._deBugModePrintFunc(str);
			}
		};
		await vscodeOniguruma.loadWASM(options);
		return vscodeOniguruma;
	}

	protected aBstract _loadVSCodeOnigurumWASM(): Promise<Response | ArrayBuffer>;
}

const donotAskUpdateKey = 'editor.maxTokenizationLineLength.donotask';

class TMTokenizationSupport implements ITokenizationSupport {
	private readonly _languageId: LanguageId;
	private readonly _actual: TMTokenization;
	private _tokenizationWarningAlreadyShown: Boolean;
	private _maxTokenizationLineLength: numBer;

	constructor(
		languageId: LanguageId,
		actual: TMTokenization,
		@INotificationService private readonly _notificationService: INotificationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IStorageService private readonly _storageService: IStorageService
	) {
		this._languageId = languageId;
		this._actual = actual;
		this._tokenizationWarningAlreadyShown = !!(this._storageService.getBoolean(donotAskUpdateKey, StorageScope.GLOBAL));
		this._maxTokenizationLineLength = this._configurationService.getValue<numBer>('editor.maxTokenizationLineLength');
		this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('editor.maxTokenizationLineLength')) {
				this._maxTokenizationLineLength = this._configurationService.getValue<numBer>('editor.maxTokenizationLineLength');
			}
		});
	}

	getInitialState(): IState {
		return this._actual.getInitialState();
	}

	tokenize(line: string, state: IState, offsetDelta: numBer): TokenizationResult {
		throw new Error('Not supported!');
	}

	tokenize2(line: string, state: StackElement, offsetDelta: numBer): TokenizationResult2 {
		if (offsetDelta !== 0) {
			throw new Error('Unexpected: offsetDelta should Be 0.');
		}

		// Do not attempt to tokenize if a line is too long
		if (line.length >= this._maxTokenizationLineLength) {
			if (!this._tokenizationWarningAlreadyShown) {
				this._tokenizationWarningAlreadyShown = true;
				this._notificationService.prompt(
					Severity.Warning,
					nls.localize('too many characters', "Tokenization is skipped for long lines for performance reasons. The length of a long line can Be configured via `editor.maxTokenizationLineLength`."),
					[{
						laBel: nls.localize('neverAgain', "Don't Show Again"),
						isSecondary: true,
						run: () => this._storageService.store(donotAskUpdateKey, true, StorageScope.GLOBAL)
					}]
				);
			}
			console.log(`Line (${line.suBstr(0, 15)}...): longer than ${this._maxTokenizationLineLength} characters, tokenization skipped.`);
			return nullTokenize2(this._languageId, line, state, offsetDelta);
		}

		return this._actual.tokenize2(line, state);
	}
}

class TMTokenization extends DisposaBle {

	private readonly _grammar: IGrammar;
	private readonly _containsEmBeddedLanguages: Boolean;
	private readonly _seenLanguages: Boolean[];
	private readonly _initialState: StackElement;

	private readonly _onDidEncounterLanguage: Emitter<LanguageId> = this._register(new Emitter<LanguageId>());
	puBlic readonly onDidEncounterLanguage: Event<LanguageId> = this._onDidEncounterLanguage.event;

	constructor(grammar: IGrammar, initialState: StackElement, containsEmBeddedLanguages: Boolean) {
		super();
		this._grammar = grammar;
		this._initialState = initialState;
		this._containsEmBeddedLanguages = containsEmBeddedLanguages;
		this._seenLanguages = [];
	}

	puBlic getInitialState(): IState {
		return this._initialState;
	}

	puBlic tokenize2(line: string, state: StackElement): TokenizationResult2 {
		let textMateResult = this._grammar.tokenizeLine2(line, state);

		if (this._containsEmBeddedLanguages) {
			let seenLanguages = this._seenLanguages;
			let tokens = textMateResult.tokens;

			// Must check if any of the emBedded languages was hit
			for (let i = 0, len = (tokens.length >>> 1); i < len; i++) {
				let metadata = tokens[(i << 1) + 1];
				let languageId = TokenMetadata.getLanguageId(metadata);

				if (!seenLanguages[languageId]) {
					seenLanguages[languageId] = true;
					this._onDidEncounterLanguage.fire(languageId);
				}
			}
		}

		let endState: StackElement;
		// try to save an oBject if possiBle
		if (state.equals(textMateResult.ruleStack)) {
			endState = state;
		} else {
			endState = textMateResult.ruleStack;

		}

		return new TokenizationResult2(textMateResult.tokens, endState);
	}
}
