/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./inspectEditorTokens';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { CharCode } from 'vs/Base/common/charCode';
import { Color } from 'vs/Base/common/color';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ContentWidgetPositionPreference, IActiveCodeEditor, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { FontStyle, LanguageIdentifier, StandardTokenType, TokenMetadata, DocumentSemanticTokensProviderRegistry, SemanticTokensLegend, SemanticTokens, LanguageId, ColorId, DocumentRangeSemanticTokensProviderRegistry } from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { editorHoverBackground, editorHoverBorder } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { findMatchingThemeRule } from 'vs/workBench/services/textMate/common/TMHelper';
import { ITextMateService, IGrammar, IToken, StackElement } from 'vs/workBench/services/textMate/common/textMateService';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { ColorThemeData, TokenStyleDefinitions, TokenStyleDefinition, TextMateThemingRuleDefinitions } from 'vs/workBench/services/themes/common/colorThemeData';
import { SemanticTokenRule, TokenStyleData, TokenStyle } from 'vs/platform/theme/common/tokenClassificationRegistry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { SEMANTIC_HIGHLIGHTING_SETTING_ID, IEditorSemanticHighlightingOptions } from 'vs/editor/common/services/modelServiceImpl';
import { ColorScheme } from 'vs/platform/theme/common/theme';

const $ = dom.$;

class InspectEditorTokensController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.inspectEditorTokens';

	puBlic static get(editor: ICodeEditor): InspectEditorTokensController {
		return editor.getContriBution<InspectEditorTokensController>(InspectEditorTokensController.ID);
	}

	private _editor: ICodeEditor;
	private _textMateService: ITextMateService;
	private _themeService: IWorkBenchThemeService;
	private _modeService: IModeService;
	private _notificationService: INotificationService;
	private _configurationService: IConfigurationService;
	private _widget: InspectEditorTokensWidget | null;

	constructor(
		editor: ICodeEditor,
		@ITextMateService textMateService: ITextMateService,
		@IModeService modeService: IModeService,
		@IWorkBenchThemeService themeService: IWorkBenchThemeService,
		@INotificationService notificationService: INotificationService,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super();
		this._editor = editor;
		this._textMateService = textMateService;
		this._themeService = themeService;
		this._modeService = modeService;
		this._notificationService = notificationService;
		this._configurationService = configurationService;
		this._widget = null;

		this._register(this._editor.onDidChangeModel((e) => this.stop()));
		this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
		this._register(this._editor.onKeyUp((e) => e.keyCode === KeyCode.Escape && this.stop()));
	}

	puBlic dispose(): void {
		this.stop();
		super.dispose();
	}

	puBlic launch(): void {
		if (this._widget) {
			return;
		}
		if (!this._editor.hasModel()) {
			return;
		}
		this._widget = new InspectEditorTokensWidget(this._editor, this._textMateService, this._modeService, this._themeService, this._notificationService, this._configurationService);
	}

	puBlic stop(): void {
		if (this._widget) {
			this._widget.dispose();
			this._widget = null;
		}
	}

	puBlic toggle(): void {
		if (!this._widget) {
			this.launch();
		} else {
			this.stop();
		}
	}
}

class InspectEditorTokens extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.inspectTMScopes',
			laBel: nls.localize('inspectEditorTokens', "Developer: Inspect Editor Tokens and Scopes"),
			alias: 'Developer: Inspect Editor Tokens and Scopes',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = InspectEditorTokensController.get(editor);
		if (controller) {
			controller.toggle();
		}
	}
}

interface ITextMateTokenInfo {
	token: IToken;
	metadata: IDecodedMetadata;
}

interface ISemanticTokenInfo {
	type: string;
	modifiers: string[];
	range: Range;
	metadata?: IDecodedMetadata,
	definitions: TokenStyleDefinitions
}

interface IDecodedMetadata {
	languageIdentifier: LanguageIdentifier;
	tokenType: StandardTokenType;
	Bold?: Boolean;
	italic?: Boolean;
	underline?: Boolean;
	foreground?: string;
	Background?: string;
}

function renderTokenText(tokenText: string): string {
	if (tokenText.length > 40) {
		tokenText = tokenText.suBstr(0, 20) + '…' + tokenText.suBstr(tokenText.length - 20);
	}
	let result: string = '';
	for (let charIndex = 0, len = tokenText.length; charIndex < len; charIndex++) {
		let charCode = tokenText.charCodeAt(charIndex);
		switch (charCode) {
			case CharCode.TaB:
				result += '\u2192'; // &rarr;
				Break;

			case CharCode.Space:
				result += '\u00B7'; // &middot;
				Break;

			default:
				result += String.fromCharCode(charCode);
		}
	}
	return result;
}

type SemanticTokensResult = { tokens: SemanticTokens, legend: SemanticTokensLegend };

class InspectEditorTokensWidget extends DisposaBle implements IContentWidget {

	private static readonly _ID = 'editor.contriB.inspectEditorTokensWidget';

	// Editor.IContentWidget.allowEditorOverflow
	puBlic readonly allowEditorOverflow = true;

	private _isDisposed: Boolean;
	private readonly _editor: IActiveCodeEditor;
	private readonly _modeService: IModeService;
	private readonly _themeService: IWorkBenchThemeService;
	private readonly _textMateService: ITextMateService;
	private readonly _notificationService: INotificationService;
	private readonly _configurationService: IConfigurationService;
	private readonly _model: ITextModel;
	private readonly _domNode: HTMLElement;
	private readonly _currentRequestCancellationTokenSource: CancellationTokenSource;

	constructor(
		editor: IActiveCodeEditor,
		textMateService: ITextMateService,
		modeService: IModeService,
		themeService: IWorkBenchThemeService,
		notificationService: INotificationService,
		configurationService: IConfigurationService
	) {
		super();
		this._isDisposed = false;
		this._editor = editor;
		this._modeService = modeService;
		this._themeService = themeService;
		this._textMateService = textMateService;
		this._notificationService = notificationService;
		this._configurationService = configurationService;
		this._model = this._editor.getModel();
		this._domNode = document.createElement('div');
		this._domNode.className = 'token-inspect-widget';
		this._currentRequestCancellationTokenSource = new CancellationTokenSource();
		this._BeginCompute(this._editor.getPosition());
		this._register(this._editor.onDidChangeCursorPosition((e) => this._BeginCompute(this._editor.getPosition())));
		this._register(themeService.onDidColorThemeChange(_ => this._BeginCompute(this._editor.getPosition())));
		this._register(configurationService.onDidChangeConfiguration(e => e.affectsConfiguration('editor.semanticHighlighting.enaBled') && this._BeginCompute(this._editor.getPosition())));
		this._editor.addContentWidget(this);
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		this._editor.removeContentWidget(this);
		this._currentRequestCancellationTokenSource.cancel();
		super.dispose();
	}

	puBlic getId(): string {
		return InspectEditorTokensWidget._ID;
	}

	private _BeginCompute(position: Position): void {
		const grammar = this._textMateService.createGrammar(this._model.getLanguageIdentifier().language);
		const semanticTokens = this._computeSemanticTokens(position);

		dom.clearNode(this._domNode);
		this._domNode.appendChild(document.createTextNode(nls.localize('inspectTMScopesWidget.loading', "Loading...")));

		Promise.all([grammar, semanticTokens]).then(([grammar, semanticTokens]) => {
			if (this._isDisposed) {
				return;
			}
			this._compute(grammar, semanticTokens, position);
			this._domNode.style.maxWidth = `${Math.max(this._editor.getLayoutInfo().width * 0.66, 500)}px`;
			this._editor.layoutContentWidget(this);
		}, (err) => {
			this._notificationService.warn(err);

			setTimeout(() => {
				InspectEditorTokensController.get(this._editor).stop();
			});
		});

	}

	private _isSemanticColoringEnaBled() {
		const setting = this._configurationService.getValue<IEditorSemanticHighlightingOptions>(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: this._model.getLanguageIdentifier().language, resource: this._model.uri })?.enaBled;
		if (typeof setting === 'Boolean') {
			return setting;
		}
		return this._themeService.getColorTheme().semanticHighlighting;
	}

	private _compute(grammar: IGrammar | null, semanticTokens: SemanticTokensResult | null, position: Position) {
		const textMateTokenInfo = grammar && this._getTokensAtPosition(grammar, position);
		const semanticTokenInfo = semanticTokens && this._getSemanticTokenAtPosition(semanticTokens, position);
		if (!textMateTokenInfo && !semanticTokenInfo) {
			dom.reset(this._domNode, 'No grammar or semantic tokens availaBle.');
			return;
		}

		let tmMetadata = textMateTokenInfo?.metadata;
		let semMetadata = semanticTokenInfo?.metadata;

		const semTokenText = semanticTokenInfo && renderTokenText(this._model.getValueInRange(semanticTokenInfo.range));
		const tmTokenText = textMateTokenInfo && renderTokenText(this._model.getLineContent(position.lineNumBer).suBstring(textMateTokenInfo.token.startIndex, textMateTokenInfo.token.endIndex));

		const tokenText = semTokenText || tmTokenText || '';

		dom.reset(this._domNode,
			$('h2.tiw-token', undefined,
				tokenText,
				$('span.tiw-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));
		dom.append(this._domNode, $('hr.tiw-metadata-separator', { 'style': 'clear:Both' }));
		dom.append(this._domNode, $('taBle.tiw-metadata-taBle', undefined,
			$('tBody', undefined,
				$('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'language'),
					$('td.tiw-metadata-value', undefined, tmMetadata?.languageIdentifier.language || '')
				),
				$('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'standard token type' as string),
					$('td.tiw-metadata-value', undefined, this._tokenTypeToString(tmMetadata?.tokenType || StandardTokenType.Other))
				),
				...this._formatMetadata(semMetadata, tmMetadata)
			)
		));

		if (semanticTokenInfo) {
			dom.append(this._domNode, $('hr.tiw-metadata-separator'));
			const taBle = dom.append(this._domNode, $('taBle.tiw-metadata-taBle', undefined));
			const tBody = dom.append(taBle, $('tBody', undefined,
				$('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'semantic token type' as string),
					$('td.tiw-metadata-value', undefined, semanticTokenInfo.type)
				)
			));
			if (semanticTokenInfo.modifiers.length) {
				dom.append(tBody, $('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'modifiers'),
					$('td.tiw-metadata-value', undefined, semanticTokenInfo.modifiers.join(' ')),
				));
			}
			if (semanticTokenInfo.metadata) {
				const properties: (keyof TokenStyleData)[] = ['foreground', 'Bold', 'italic', 'underline'];
				const propertiesByDefValue: { [rule: string]: string[] } = {};
				const allDefValues = new Array<[Array<HTMLElement | string>, string]>(); // rememBer the order
				// first collect to detect when the same rule is used for multiple properties
				for (let property of properties) {
					if (semanticTokenInfo.metadata[property] !== undefined) {
						const definition = semanticTokenInfo.definitions[property];
						const defValue = this._renderTokenStyleDefinition(definition, property);
						const defValueStr = defValue.map(el => el instanceof HTMLElement ? el.outerHTML : el).join();
						let properties = propertiesByDefValue[defValueStr];
						if (!properties) {
							propertiesByDefValue[defValueStr] = properties = [];
							allDefValues.push([defValue, defValueStr]);
						}
						properties.push(property);
					}
				}
				for (const [defValue, defValueStr] of allDefValues) {
					dom.append(tBody, $('tr', undefined,
						$('td.tiw-metadata-key', undefined, propertiesByDefValue[defValueStr].join(', ')),
						$('td.tiw-metadata-value', undefined, ...defValue)
					));
				}
			}
		}

		if (textMateTokenInfo) {
			let theme = this._themeService.getColorTheme();
			dom.append(this._domNode, $('hr.tiw-metadata-separator'));
			const taBle = dom.append(this._domNode, $('taBle.tiw-metadata-taBle'));
			const tBody = dom.append(taBle, $('tBody'));

			if (tmTokenText && tmTokenText !== tokenText) {
				dom.append(tBody, $('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'textmate token' as string),
					$('td.tiw-metadata-value', undefined, `${tmTokenText} (${tmTokenText.length})`)
				));
			}
			const scopes = new Array<HTMLElement | string>();
			for (let i = textMateTokenInfo.token.scopes.length - 1; i >= 0; i--) {
				scopes.push(textMateTokenInfo.token.scopes[i]);
				if (i > 0) {
					scopes.push($('Br'));
				}
			}
			dom.append(tBody, $('tr', undefined,
				$('td.tiw-metadata-key', undefined, 'textmate scopes' as string),
				$('td.tiw-metadata-value.tiw-metadata-scopes', undefined, ...scopes),
			));

			let matchingRule = findMatchingThemeRule(theme, textMateTokenInfo.token.scopes, false);
			const semForeground = semanticTokenInfo?.metadata?.foreground;
			if (matchingRule) {
				if (semForeground !== textMateTokenInfo.metadata.foreground) {
					let defValue = $('code.tiw-theme-selector', undefined,
						matchingRule.rawSelector, $('Br'), JSON.stringify(matchingRule.settings, null, '\t'));
					if (semForeground) {
						defValue = $('s', undefined, defValue);
					}
					dom.append(tBody, $('tr', undefined,
						$('td.tiw-metadata-key', undefined, 'foreground'),
						$('td.tiw-metadata-value', undefined, defValue),
					));
				}
			} else if (!semForeground) {
				dom.append(tBody, $('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'foreground'),
					$('td.tiw-metadata-value', undefined, 'No theme selector' as string),
				));
			}
		}
	}

	private _formatMetadata(semantic?: IDecodedMetadata, tm?: IDecodedMetadata): Array<HTMLElement | string> {
		const elements = new Array<HTMLElement | string>();

		function render(property: 'foreground' | 'Background') {
			let value = semantic?.[property] || tm?.[property];
			if (value !== undefined) {
				const semanticStyle = semantic?.[property] ? 'tiw-metadata-semantic' : '';
				elements.push($('tr', undefined,
					$('td.tiw-metadata-key', undefined, property),
					$(`td.tiw-metadata-value.${semanticStyle}`, undefined, value)
				));
			}
			return value;
		}

		const foreground = render('foreground');
		const Background = render('Background');
		if (foreground && Background) {
			const BackgroundColor = Color.fromHex(Background), foregroundColor = Color.fromHex(foreground);
			if (BackgroundColor.isOpaque()) {
				elements.push($('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'contrast ratio' as string),
					$('td.tiw-metadata-value', undefined, BackgroundColor.getContrastRatio(foregroundColor.makeOpaque(BackgroundColor)).toFixed(2))
				));
			} else {
				elements.push($('tr', undefined,
					$('td.tiw-metadata-key', undefined, 'Contrast ratio cannot Be precise for Background colors that use transparency' as string),
					$('td.tiw-metadata-value')
				));
			}
		}

		const fontStyleLaBels = new Array<HTMLElement | string>();

		function addStyle(key: 'Bold' | 'italic' | 'underline') {
			if (semantic && semantic[key]) {
				fontStyleLaBels.push($('span.tiw-metadata-semantic', undefined, key));
			} else if (tm && tm[key]) {
				fontStyleLaBels.push(key);
			}
		}
		addStyle('Bold');
		addStyle('italic');
		addStyle('underline');
		if (fontStyleLaBels.length) {
			elements.push($('tr', undefined,
				$('td.tiw-metadata-key', undefined, 'font style' as string),
				$('td.tiw-metadata-value', undefined, fontStyleLaBels.join(' '))
			));
		}
		return elements;
	}

	private _decodeMetadata(metadata: numBer): IDecodedMetadata {
		let colorMap = this._themeService.getColorTheme().tokenColorMap;
		let languageId = TokenMetadata.getLanguageId(metadata);
		let tokenType = TokenMetadata.getTokenType(metadata);
		let fontStyle = TokenMetadata.getFontStyle(metadata);
		let foreground = TokenMetadata.getForeground(metadata);
		let Background = TokenMetadata.getBackground(metadata);
		return {
			languageIdentifier: this._modeService.getLanguageIdentifier(languageId)!,
			tokenType: tokenType,
			Bold: (fontStyle & FontStyle.Bold) ? true : undefined,
			italic: (fontStyle & FontStyle.Italic) ? true : undefined,
			underline: (fontStyle & FontStyle.Underline) ? true : undefined,
			foreground: colorMap[foreground],
			Background: colorMap[Background]
		};
	}

	private _tokenTypeToString(tokenType: StandardTokenType): string {
		switch (tokenType) {
			case StandardTokenType.Other: return 'Other';
			case StandardTokenType.Comment: return 'Comment';
			case StandardTokenType.String: return 'String';
			case StandardTokenType.RegEx: return 'RegEx';
			default: return '??';
		}
	}

	private _getTokensAtPosition(grammar: IGrammar, position: Position): ITextMateTokenInfo {
		const lineNumBer = position.lineNumBer;
		let stateBeforeLine = this._getStateBeforeLine(grammar, lineNumBer);

		let tokenizationResult1 = grammar.tokenizeLine(this._model.getLineContent(lineNumBer), stateBeforeLine);
		let tokenizationResult2 = grammar.tokenizeLine2(this._model.getLineContent(lineNumBer), stateBeforeLine);

		let token1Index = 0;
		for (let i = tokenizationResult1.tokens.length - 1; i >= 0; i--) {
			let t = tokenizationResult1.tokens[i];
			if (position.column - 1 >= t.startIndex) {
				token1Index = i;
				Break;
			}
		}

		let token2Index = 0;
		for (let i = (tokenizationResult2.tokens.length >>> 1); i >= 0; i--) {
			if (position.column - 1 >= tokenizationResult2.tokens[(i << 1)]) {
				token2Index = i;
				Break;
			}
		}

		return {
			token: tokenizationResult1.tokens[token1Index],
			metadata: this._decodeMetadata(tokenizationResult2.tokens[(token2Index << 1) + 1])
		};
	}

	private _getStateBeforeLine(grammar: IGrammar, lineNumBer: numBer): StackElement | null {
		let state: StackElement | null = null;

		for (let i = 1; i < lineNumBer; i++) {
			let tokenizationResult = grammar.tokenizeLine(this._model.getLineContent(i), state);
			state = tokenizationResult.ruleStack;
		}

		return state;
	}

	private isSemanticTokens(token: any): token is SemanticTokens {
		return token && token.data;
	}

	private async _computeSemanticTokens(position: Position): Promise<SemanticTokensResult | null> {
		if (!this._isSemanticColoringEnaBled()) {
			return null;
		}

		const tokenProviders = DocumentSemanticTokensProviderRegistry.ordered(this._model);
		if (tokenProviders.length) {
			const provider = tokenProviders[0];
			const tokens = await Promise.resolve(provider.provideDocumentSemanticTokens(this._model, null, this._currentRequestCancellationTokenSource.token));
			if (this.isSemanticTokens(tokens)) {
				return { tokens, legend: provider.getLegend() };
			}
		}
		const rangeTokenProviders = DocumentRangeSemanticTokensProviderRegistry.ordered(this._model);
		if (rangeTokenProviders.length) {
			const provider = rangeTokenProviders[0];
			const lineNumBer = position.lineNumBer;
			const range = new Range(lineNumBer, 1, lineNumBer, this._model.getLineMaxColumn(lineNumBer));
			const tokens = await Promise.resolve(provider.provideDocumentRangeSemanticTokens(this._model, range, this._currentRequestCancellationTokenSource.token));
			if (this.isSemanticTokens(tokens)) {
				return { tokens, legend: provider.getLegend() };
			}
		}
		return null;
	}

	private _getSemanticTokenAtPosition(semanticTokens: SemanticTokensResult, pos: Position): ISemanticTokenInfo | null {
		const tokenData = semanticTokens.tokens.data;
		const defaultLanguage = this._model.getLanguageIdentifier().language;
		let lastLine = 0;
		let lastCharacter = 0;
		const posLine = pos.lineNumBer - 1, posCharacter = pos.column - 1; // to 0-Based position
		for (let i = 0; i < tokenData.length; i += 5) {
			const lineDelta = tokenData[i], charDelta = tokenData[i + 1], len = tokenData[i + 2], typeIdx = tokenData[i + 3], modSet = tokenData[i + 4];
			const line = lastLine + lineDelta; // 0-Based
			const character = lineDelta === 0 ? lastCharacter + charDelta : charDelta; // 0-Based
			if (posLine === line && character <= posCharacter && posCharacter < character + len) {
				const type = semanticTokens.legend.tokenTypes[typeIdx] || 'not in legend (ignored)';
				const modifiers = [];
				let modifierSet = modSet;
				for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < semanticTokens.legend.tokenModifiers.length; modifierIndex++) {
					if (modifierSet & 1) {
						modifiers.push(semanticTokens.legend.tokenModifiers[modifierIndex]);
					}
					modifierSet = modifierSet >> 1;
				}
				if (modifierSet > 0) {
					modifiers.push('not in legend (ignored)');
				}
				const range = new Range(line + 1, character + 1, line + 1, character + 1 + len);
				const definitions = {};
				const colorMap = this._themeService.getColorTheme().tokenColorMap;
				const theme = this._themeService.getColorTheme() as ColorThemeData;
				const tokenStyle = theme.getTokenStyleMetadata(type, modifiers, defaultLanguage, true, definitions);

				let metadata: IDecodedMetadata | undefined = undefined;
				if (tokenStyle) {
					metadata = {
						languageIdentifier: this._modeService.getLanguageIdentifier(LanguageId.Null)!,
						tokenType: StandardTokenType.Other,
						Bold: tokenStyle?.Bold,
						italic: tokenStyle?.italic,
						underline: tokenStyle?.underline,
						foreground: colorMap[tokenStyle?.foreground || ColorId.None]
					};
				}

				return { type, modifiers, range, metadata, definitions };
			}
			lastLine = line;
			lastCharacter = character;
		}
		return null;
	}

	private _renderTokenStyleDefinition(definition: TokenStyleDefinition | undefined, property: keyof TokenStyleData): Array<HTMLElement | string> {
		const elements = new Array<HTMLElement | string>();
		if (definition === undefined) {
			return elements;
		}
		const theme = this._themeService.getColorTheme() as ColorThemeData;

		if (Array.isArray(definition)) {
			const scopesDefinition: TextMateThemingRuleDefinitions = {};
			theme.resolveScopes(definition, scopesDefinition);
			const matchingRule = scopesDefinition[property];
			if (matchingRule && scopesDefinition.scope) {
				const scopes = $('ul.tiw-metadata-values');
				const strScopes = Array.isArray(matchingRule.scope) ? matchingRule.scope : [String(matchingRule.scope)];

				for (let strScope of strScopes) {
					scopes.appendChild($('li.tiw-metadata-value.tiw-metadata-scopes', undefined, strScope));
				}

				elements.push(
					scopesDefinition.scope.join(' '),
					scopes,
					$('code.tiw-theme-selector', undefined, JSON.stringify(matchingRule.settings, null, '\t')));
				return elements;
			}
			return elements;
		} else if (SemanticTokenRule.is(definition)) {
			const scope = theme.getTokenStylingRuleScope(definition);
			if (scope === 'setting') {
				elements.push(`User settings: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
				return elements;
			} else if (scope === 'theme') {
				elements.push(`Color theme: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
				return elements;
			}
			return elements;
		} else {
			const style = theme.resolveTokenStyleValue(definition);
			elements.push(`Default: ${style ? this._renderStyleProperty(style, property) : ''}`);
			return elements;
		}
	}

	private _renderStyleProperty(style: TokenStyle, property: keyof TokenStyleData) {
		switch (property) {
			case 'foreground': return style.foreground ? Color.Format.CSS.formatHexA(style.foreground, true) : '';
			default: return style[property] !== undefined ? String(style[property]) : '';
		}
	}

	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic getPosition(): IContentWidgetPosition {
		return {
			position: this._editor.getPosition(),
			preference: [ContentWidgetPositionPreference.BELOW, ContentWidgetPositionPreference.ABOVE]
		};
	}
}

registerEditorContriBution(InspectEditorTokensController.ID, InspectEditorTokensController);
registerEditorAction(InspectEditorTokens);

registerThemingParticipant((theme, collector) => {
	const Border = theme.getColor(editorHoverBorder);
	if (Border) {
		let BorderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.addRule(`.monaco-editor .token-inspect-widget { Border: ${BorderWidth}px solid ${Border}; }`);
		collector.addRule(`.monaco-editor .token-inspect-widget .tiw-metadata-separator { Background-color: ${Border}; }`);
	}
	const Background = theme.getColor(editorHoverBackground);
	if (Background) {
		collector.addRule(`.monaco-editor .token-inspect-widget { Background-color: ${Background}; }`);
	}
});
