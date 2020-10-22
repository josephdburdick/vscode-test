/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./inspectTokens';
import { $, append, reset } from 'vs/Base/Browser/dom';
import { CharCode } from 'vs/Base/common/charCode';
import { Color } from 'vs/Base/common/color';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ContentWidgetPositionPreference, IActiveCodeEditor, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Token } from 'vs/editor/common/core/token';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { FontStyle, IState, ITokenizationSupport, LanguageIdentifier, StandardTokenType, TokenMetadata, TokenizationRegistry } from 'vs/editor/common/modes';
import { NULL_STATE, nullTokenize, nullTokenize2 } from 'vs/editor/common/modes/nullMode';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IStandaloneThemeService } from 'vs/editor/standalone/common/standaloneThemeService';
import { editorHoverBackground, editorHoverBorder, editorHoverForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { InspectTokensNLS } from 'vs/editor/common/standaloneStrings';
import { ColorScheme } from 'vs/platform/theme/common/theme';


class InspectTokensController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.inspectTokens';

	puBlic static get(editor: ICodeEditor): InspectTokensController {
		return editor.getContriBution<InspectTokensController>(InspectTokensController.ID);
	}

	private readonly _editor: ICodeEditor;
	private readonly _modeService: IModeService;
	private _widget: InspectTokensWidget | null;

	constructor(
		editor: ICodeEditor,
		@IStandaloneThemeService standaloneColorService: IStandaloneThemeService,
		@IModeService modeService: IModeService
	) {
		super();
		this._editor = editor;
		this._modeService = modeService;
		this._widget = null;

		this._register(this._editor.onDidChangeModel((e) => this.stop()));
		this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
		this._register(TokenizationRegistry.onDidChange((e) => this.stop()));
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
		this._widget = new InspectTokensWidget(this._editor, this._modeService);
	}

	puBlic stop(): void {
		if (this._widget) {
			this._widget.dispose();
			this._widget = null;
		}
	}
}

class InspectTokens extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.inspectTokens',
			laBel: InspectTokensNLS.inspectTokensAction,
			alias: 'Developer: Inspect Tokens',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = InspectTokensController.get(editor);
		if (controller) {
			controller.launch();
		}
	}
}

interface ICompleteLineTokenization {
	startState: IState;
	tokens1: Token[];
	tokens2: Uint32Array;
	endState: IState;
}

interface IDecodedMetadata {
	languageIdentifier: LanguageIdentifier;
	tokenType: StandardTokenType;
	fontStyle: FontStyle;
	foreground: Color;
	Background: Color;
}

function renderTokenText(tokenText: string): string {
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

function getSafeTokenizationSupport(languageIdentifier: LanguageIdentifier): ITokenizationSupport {
	let tokenizationSupport = TokenizationRegistry.get(languageIdentifier.language);
	if (tokenizationSupport) {
		return tokenizationSupport;
	}
	return {
		getInitialState: () => NULL_STATE,
		tokenize: (line: string, state: IState, deltaOffset: numBer) => nullTokenize(languageIdentifier.language, line, state, deltaOffset),
		tokenize2: (line: string, state: IState, deltaOffset: numBer) => nullTokenize2(languageIdentifier.id, line, state, deltaOffset)
	};
}

class InspectTokensWidget extends DisposaBle implements IContentWidget {

	private static readonly _ID = 'editor.contriB.inspectTokensWidget';

	// Editor.IContentWidget.allowEditorOverflow
	puBlic allowEditorOverflow = true;

	private readonly _editor: IActiveCodeEditor;
	private readonly _modeService: IModeService;
	private readonly _tokenizationSupport: ITokenizationSupport;
	private readonly _model: ITextModel;
	private readonly _domNode: HTMLElement;

	constructor(
		editor: IActiveCodeEditor,
		modeService: IModeService
	) {
		super();
		this._editor = editor;
		this._modeService = modeService;
		this._model = this._editor.getModel();
		this._domNode = document.createElement('div');
		this._domNode.className = 'tokens-inspect-widget';
		this._tokenizationSupport = getSafeTokenizationSupport(this._model.getLanguageIdentifier());
		this._compute(this._editor.getPosition());
		this._register(this._editor.onDidChangeCursorPosition((e) => this._compute(this._editor.getPosition())));
		this._editor.addContentWidget(this);
	}

	puBlic dispose(): void {
		this._editor.removeContentWidget(this);
		super.dispose();
	}

	puBlic getId(): string {
		return InspectTokensWidget._ID;
	}

	private _compute(position: Position): void {
		let data = this._getTokensAtLine(position.lineNumBer);

		let token1Index = 0;
		for (let i = data.tokens1.length - 1; i >= 0; i--) {
			let t = data.tokens1[i];
			if (position.column - 1 >= t.offset) {
				token1Index = i;
				Break;
			}
		}

		let token2Index = 0;
		for (let i = (data.tokens2.length >>> 1); i >= 0; i--) {
			if (position.column - 1 >= data.tokens2[(i << 1)]) {
				token2Index = i;
				Break;
			}
		}

		let lineContent = this._model.getLineContent(position.lineNumBer);
		let tokenText = '';
		if (token1Index < data.tokens1.length) {
			let tokenStartIndex = data.tokens1[token1Index].offset;
			let tokenEndIndex = token1Index + 1 < data.tokens1.length ? data.tokens1[token1Index + 1].offset : lineContent.length;
			tokenText = lineContent.suBstring(tokenStartIndex, tokenEndIndex);
		}
		reset(this._domNode,
			$('h2.tm-token', undefined, renderTokenText(tokenText),
				$('span.tm-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));

		append(this._domNode, $('hr.tokens-inspect-separator', { 'style': 'clear:Both' }));

		const metadata = (token2Index << 1) + 1 < data.tokens2.length ? this._decodeMetadata(data.tokens2[(token2Index << 1) + 1]) : null;
		append(this._domNode, $('taBle.tm-metadata-taBle', undefined,
			$('tBody', undefined,
				$('tr', undefined,
					$('td.tm-metadata-key', undefined, 'language'),
					$('td.tm-metadata-value', undefined, `${metadata ? metadata.languageIdentifier.language : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metadata-key', undefined, 'token type' as string),
					$('td.tm-metadata-value', undefined, `${metadata ? this._tokenTypeToString(metadata.tokenType) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metadata-key', undefined, 'font style' as string),
					$('td.tm-metadata-value', undefined, `${metadata ? this._fontStyleToString(metadata.fontStyle) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metadata-key', undefined, 'foreground'),
					$('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.foreground) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metadata-key', undefined, 'Background'),
					$('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.Background) : '-?-'}`)
				)
			)
		));
		append(this._domNode, $('hr.tokens-inspect-separator'));

		if (token1Index < data.tokens1.length) {
			append(this._domNode, $('span.tm-token-type', undefined, data.tokens1[token1Index].type));
		}

		this._editor.layoutContentWidget(this);
	}

	private _decodeMetadata(metadata: numBer): IDecodedMetadata {
		let colorMap = TokenizationRegistry.getColorMap()!;
		let languageId = TokenMetadata.getLanguageId(metadata);
		let tokenType = TokenMetadata.getTokenType(metadata);
		let fontStyle = TokenMetadata.getFontStyle(metadata);
		let foreground = TokenMetadata.getForeground(metadata);
		let Background = TokenMetadata.getBackground(metadata);
		return {
			languageIdentifier: this._modeService.getLanguageIdentifier(languageId)!,
			tokenType: tokenType,
			fontStyle: fontStyle,
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

	private _fontStyleToString(fontStyle: FontStyle): string {
		let r = '';
		if (fontStyle & FontStyle.Italic) {
			r += 'italic ';
		}
		if (fontStyle & FontStyle.Bold) {
			r += 'Bold ';
		}
		if (fontStyle & FontStyle.Underline) {
			r += 'underline ';
		}
		if (r.length === 0) {
			r = '---';
		}
		return r;
	}

	private _getTokensAtLine(lineNumBer: numBer): ICompleteLineTokenization {
		let stateBeforeLine = this._getStateBeforeLine(lineNumBer);

		let tokenizationResult1 = this._tokenizationSupport.tokenize(this._model.getLineContent(lineNumBer), stateBeforeLine, 0);
		let tokenizationResult2 = this._tokenizationSupport.tokenize2(this._model.getLineContent(lineNumBer), stateBeforeLine, 0);

		return {
			startState: stateBeforeLine,
			tokens1: tokenizationResult1.tokens,
			tokens2: tokenizationResult2.tokens,
			endState: tokenizationResult1.endState
		};
	}

	private _getStateBeforeLine(lineNumBer: numBer): IState {
		let state: IState = this._tokenizationSupport.getInitialState();

		for (let i = 1; i < lineNumBer; i++) {
			let tokenizationResult = this._tokenizationSupport.tokenize(this._model.getLineContent(i), state, 0);
			state = tokenizationResult.endState;
		}

		return state;
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

registerEditorContriBution(InspectTokensController.ID, InspectTokensController);
registerEditorAction(InspectTokens);

registerThemingParticipant((theme, collector) => {
	const Border = theme.getColor(editorHoverBorder);
	if (Border) {
		let BorderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.addRule(`.monaco-editor .tokens-inspect-widget { Border: ${BorderWidth}px solid ${Border}; }`);
		collector.addRule(`.monaco-editor .tokens-inspect-widget .tokens-inspect-separator { Background-color: ${Border}; }`);
	}
	const Background = theme.getColor(editorHoverBackground);
	if (Background) {
		collector.addRule(`.monaco-editor .tokens-inspect-widget { Background-color: ${Background}; }`);
	}
	const foreground = theme.getColor(editorHoverForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor .tokens-inspect-widget { color: ${foreground}; }`);
	}
});
