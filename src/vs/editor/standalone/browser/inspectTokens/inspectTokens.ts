/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./inspectTokens';
import { $, Append, reset } from 'vs/bAse/browser/dom';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { Color } from 'vs/bAse/common/color';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ContentWidgetPositionPreference, IActiveCodeEditor, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Token } from 'vs/editor/common/core/token';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { FontStyle, IStAte, ITokenizAtionSupport, LAnguAgeIdentifier, StAndArdTokenType, TokenMetAdAtA, TokenizAtionRegistry } from 'vs/editor/common/modes';
import { NULL_STATE, nullTokenize, nullTokenize2 } from 'vs/editor/common/modes/nullMode';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { editorHoverBAckground, editorHoverBorder, editorHoverForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { InspectTokensNLS } from 'vs/editor/common/stAndAloneStrings';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';


clAss InspectTokensController extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.inspectTokens';

	public stAtic get(editor: ICodeEditor): InspectTokensController {
		return editor.getContribution<InspectTokensController>(InspectTokensController.ID);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _modeService: IModeService;
	privAte _widget: InspectTokensWidget | null;

	constructor(
		editor: ICodeEditor,
		@IStAndAloneThemeService stAndAloneColorService: IStAndAloneThemeService,
		@IModeService modeService: IModeService
	) {
		super();
		this._editor = editor;
		this._modeService = modeService;
		this._widget = null;

		this._register(this._editor.onDidChAngeModel((e) => this.stop()));
		this._register(this._editor.onDidChAngeModelLAnguAge((e) => this.stop()));
		this._register(TokenizAtionRegistry.onDidChAnge((e) => this.stop()));
		this._register(this._editor.onKeyUp((e) => e.keyCode === KeyCode.EscApe && this.stop()));
	}

	public dispose(): void {
		this.stop();
		super.dispose();
	}

	public lAunch(): void {
		if (this._widget) {
			return;
		}
		if (!this._editor.hAsModel()) {
			return;
		}
		this._widget = new InspectTokensWidget(this._editor, this._modeService);
	}

	public stop(): void {
		if (this._widget) {
			this._widget.dispose();
			this._widget = null;
		}
	}
}

clAss InspectTokens extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.inspectTokens',
			lAbel: InspectTokensNLS.inspectTokensAction,
			AliAs: 'Developer: Inspect Tokens',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = InspectTokensController.get(editor);
		if (controller) {
			controller.lAunch();
		}
	}
}

interfAce ICompleteLineTokenizAtion {
	stArtStAte: IStAte;
	tokens1: Token[];
	tokens2: Uint32ArrAy;
	endStAte: IStAte;
}

interfAce IDecodedMetAdAtA {
	lAnguAgeIdentifier: LAnguAgeIdentifier;
	tokenType: StAndArdTokenType;
	fontStyle: FontStyle;
	foreground: Color;
	bAckground: Color;
}

function renderTokenText(tokenText: string): string {
	let result: string = '';
	for (let chArIndex = 0, len = tokenText.length; chArIndex < len; chArIndex++) {
		let chArCode = tokenText.chArCodeAt(chArIndex);
		switch (chArCode) {
			cAse ChArCode.TAb:
				result += '\u2192'; // &rArr;
				breAk;

			cAse ChArCode.SpAce:
				result += '\u00B7'; // &middot;
				breAk;

			defAult:
				result += String.fromChArCode(chArCode);
		}
	}
	return result;
}

function getSAfeTokenizAtionSupport(lAnguAgeIdentifier: LAnguAgeIdentifier): ITokenizAtionSupport {
	let tokenizAtionSupport = TokenizAtionRegistry.get(lAnguAgeIdentifier.lAnguAge);
	if (tokenizAtionSupport) {
		return tokenizAtionSupport;
	}
	return {
		getInitiAlStAte: () => NULL_STATE,
		tokenize: (line: string, stAte: IStAte, deltAOffset: number) => nullTokenize(lAnguAgeIdentifier.lAnguAge, line, stAte, deltAOffset),
		tokenize2: (line: string, stAte: IStAte, deltAOffset: number) => nullTokenize2(lAnguAgeIdentifier.id, line, stAte, deltAOffset)
	};
}

clAss InspectTokensWidget extends DisposAble implements IContentWidget {

	privAte stAtic reAdonly _ID = 'editor.contrib.inspectTokensWidget';

	// Editor.IContentWidget.AllowEditorOverflow
	public AllowEditorOverflow = true;

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _modeService: IModeService;
	privAte reAdonly _tokenizAtionSupport: ITokenizAtionSupport;
	privAte reAdonly _model: ITextModel;
	privAte reAdonly _domNode: HTMLElement;

	constructor(
		editor: IActiveCodeEditor,
		modeService: IModeService
	) {
		super();
		this._editor = editor;
		this._modeService = modeService;
		this._model = this._editor.getModel();
		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'tokens-inspect-widget';
		this._tokenizAtionSupport = getSAfeTokenizAtionSupport(this._model.getLAnguAgeIdentifier());
		this._compute(this._editor.getPosition());
		this._register(this._editor.onDidChAngeCursorPosition((e) => this._compute(this._editor.getPosition())));
		this._editor.AddContentWidget(this);
	}

	public dispose(): void {
		this._editor.removeContentWidget(this);
		super.dispose();
	}

	public getId(): string {
		return InspectTokensWidget._ID;
	}

	privAte _compute(position: Position): void {
		let dAtA = this._getTokensAtLine(position.lineNumber);

		let token1Index = 0;
		for (let i = dAtA.tokens1.length - 1; i >= 0; i--) {
			let t = dAtA.tokens1[i];
			if (position.column - 1 >= t.offset) {
				token1Index = i;
				breAk;
			}
		}

		let token2Index = 0;
		for (let i = (dAtA.tokens2.length >>> 1); i >= 0; i--) {
			if (position.column - 1 >= dAtA.tokens2[(i << 1)]) {
				token2Index = i;
				breAk;
			}
		}

		let lineContent = this._model.getLineContent(position.lineNumber);
		let tokenText = '';
		if (token1Index < dAtA.tokens1.length) {
			let tokenStArtIndex = dAtA.tokens1[token1Index].offset;
			let tokenEndIndex = token1Index + 1 < dAtA.tokens1.length ? dAtA.tokens1[token1Index + 1].offset : lineContent.length;
			tokenText = lineContent.substring(tokenStArtIndex, tokenEndIndex);
		}
		reset(this._domNode,
			$('h2.tm-token', undefined, renderTokenText(tokenText),
				$('spAn.tm-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'chAr' : 'chArs'}`)));

		Append(this._domNode, $('hr.tokens-inspect-sepArAtor', { 'style': 'cleAr:both' }));

		const metAdAtA = (token2Index << 1) + 1 < dAtA.tokens2.length ? this._decodeMetAdAtA(dAtA.tokens2[(token2Index << 1) + 1]) : null;
		Append(this._domNode, $('tAble.tm-metAdAtA-tAble', undefined,
			$('tbody', undefined,
				$('tr', undefined,
					$('td.tm-metAdAtA-key', undefined, 'lAnguAge'),
					$('td.tm-metAdAtA-vAlue', undefined, `${metAdAtA ? metAdAtA.lAnguAgeIdentifier.lAnguAge : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metAdAtA-key', undefined, 'token type' As string),
					$('td.tm-metAdAtA-vAlue', undefined, `${metAdAtA ? this._tokenTypeToString(metAdAtA.tokenType) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metAdAtA-key', undefined, 'font style' As string),
					$('td.tm-metAdAtA-vAlue', undefined, `${metAdAtA ? this._fontStyleToString(metAdAtA.fontStyle) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metAdAtA-key', undefined, 'foreground'),
					$('td.tm-metAdAtA-vAlue', undefined, `${metAdAtA ? Color.FormAt.CSS.formAtHex(metAdAtA.foreground) : '-?-'}`)
				),
				$('tr', undefined,
					$('td.tm-metAdAtA-key', undefined, 'bAckground'),
					$('td.tm-metAdAtA-vAlue', undefined, `${metAdAtA ? Color.FormAt.CSS.formAtHex(metAdAtA.bAckground) : '-?-'}`)
				)
			)
		));
		Append(this._domNode, $('hr.tokens-inspect-sepArAtor'));

		if (token1Index < dAtA.tokens1.length) {
			Append(this._domNode, $('spAn.tm-token-type', undefined, dAtA.tokens1[token1Index].type));
		}

		this._editor.lAyoutContentWidget(this);
	}

	privAte _decodeMetAdAtA(metAdAtA: number): IDecodedMetAdAtA {
		let colorMAp = TokenizAtionRegistry.getColorMAp()!;
		let lAnguAgeId = TokenMetAdAtA.getLAnguAgeId(metAdAtA);
		let tokenType = TokenMetAdAtA.getTokenType(metAdAtA);
		let fontStyle = TokenMetAdAtA.getFontStyle(metAdAtA);
		let foreground = TokenMetAdAtA.getForeground(metAdAtA);
		let bAckground = TokenMetAdAtA.getBAckground(metAdAtA);
		return {
			lAnguAgeIdentifier: this._modeService.getLAnguAgeIdentifier(lAnguAgeId)!,
			tokenType: tokenType,
			fontStyle: fontStyle,
			foreground: colorMAp[foreground],
			bAckground: colorMAp[bAckground]
		};
	}

	privAte _tokenTypeToString(tokenType: StAndArdTokenType): string {
		switch (tokenType) {
			cAse StAndArdTokenType.Other: return 'Other';
			cAse StAndArdTokenType.Comment: return 'Comment';
			cAse StAndArdTokenType.String: return 'String';
			cAse StAndArdTokenType.RegEx: return 'RegEx';
			defAult: return '??';
		}
	}

	privAte _fontStyleToString(fontStyle: FontStyle): string {
		let r = '';
		if (fontStyle & FontStyle.ItAlic) {
			r += 'itAlic ';
		}
		if (fontStyle & FontStyle.Bold) {
			r += 'bold ';
		}
		if (fontStyle & FontStyle.Underline) {
			r += 'underline ';
		}
		if (r.length === 0) {
			r = '---';
		}
		return r;
	}

	privAte _getTokensAtLine(lineNumber: number): ICompleteLineTokenizAtion {
		let stAteBeforeLine = this._getStAteBeforeLine(lineNumber);

		let tokenizAtionResult1 = this._tokenizAtionSupport.tokenize(this._model.getLineContent(lineNumber), stAteBeforeLine, 0);
		let tokenizAtionResult2 = this._tokenizAtionSupport.tokenize2(this._model.getLineContent(lineNumber), stAteBeforeLine, 0);

		return {
			stArtStAte: stAteBeforeLine,
			tokens1: tokenizAtionResult1.tokens,
			tokens2: tokenizAtionResult2.tokens,
			endStAte: tokenizAtionResult1.endStAte
		};
	}

	privAte _getStAteBeforeLine(lineNumber: number): IStAte {
		let stAte: IStAte = this._tokenizAtionSupport.getInitiAlStAte();

		for (let i = 1; i < lineNumber; i++) {
			let tokenizAtionResult = this._tokenizAtionSupport.tokenize(this._model.getLineContent(i), stAte, 0);
			stAte = tokenizAtionResult.endStAte;
		}

		return stAte;
	}

	public getDomNode(): HTMLElement {
		return this._domNode;
	}

	public getPosition(): IContentWidgetPosition {
		return {
			position: this._editor.getPosition(),
			preference: [ContentWidgetPositionPreference.BELOW, ContentWidgetPositionPreference.ABOVE]
		};
	}
}

registerEditorContribution(InspectTokensController.ID, InspectTokensController);
registerEditorAction(InspectTokens);

registerThemingPArticipAnt((theme, collector) => {
	const border = theme.getColor(editorHoverBorder);
	if (border) {
		let borderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.AddRule(`.monAco-editor .tokens-inspect-widget { border: ${borderWidth}px solid ${border}; }`);
		collector.AddRule(`.monAco-editor .tokens-inspect-widget .tokens-inspect-sepArAtor { bAckground-color: ${border}; }`);
	}
	const bAckground = theme.getColor(editorHoverBAckground);
	if (bAckground) {
		collector.AddRule(`.monAco-editor .tokens-inspect-widget { bAckground-color: ${bAckground}; }`);
	}
	const foreground = theme.getColor(editorHoverForeground);
	if (foreground) {
		collector.AddRule(`.monAco-editor .tokens-inspect-widget { color: ${foreground}; }`);
	}
});
