/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./suggestEnAbledInput';
import { $, Dimension, Append } from 'vs/bAse/browser/dom';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Color } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { mixin } from 'vs/bAse/common/objects';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { URI As uri } from 'vs/bAse/common/uri';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel } from 'vs/editor/common/model';
import * As modes from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ContextMenuController } from 'vs/editor/contrib/contextmenu/contextmenu';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ColorIdentifier, editorSelectionBAckground, inputBAckground, inputBorder, inputForeground, inputPlAceholderForeground, selectionBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IStyleOverrides, AttAchStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { MenuPreventer } from 'vs/workbench/contrib/codeEditor/browser/menuPreventer';
import { getSimpleEditorOptions } from 'vs/workbench/contrib/codeEditor/browser/simpleEditorOptions';
import { SelectionClipboArdContributionID } from 'vs/workbench/contrib/codeEditor/browser/selectionClipboArd';
import { EditorExtensionsRegistry } from 'vs/editor/browser/editorExtensions';
import { IThemAble } from 'vs/bAse/common/styler';
import { DEFAULT_FONT_FAMILY } from 'vs/workbench/browser/style';

interfAce SuggestResultsProvider {
	/**
	 * Provider function for suggestion results.
	 *
	 * @pArAm query the full text of the input.
	 */
	provideResults: (query: string) => string[];

	/**
	 * Trigger chArActers for this input. Suggestions will AppeAr when one of these is typed,
	 * or upon `ctrl+spAce` triggering At A word boundAry.
	 *
	 * DefAults to the empty ArrAy.
	 */
	triggerChArActers?: string[];

	/**
	 * Defines the sorting function used when showing results.
	 *
	 * DefAults to the identity function.
	 */
	sortKey?: (result: string) => string;
}

interfAce SuggestEnAbledInputOptions {
	/**
	 * The text to show when no input is present.
	 *
	 * DefAults to the empty string.
	 */
	plAceholderText?: string;
	vAlue?: string;

	/**
	 * Context key trAcking the focus stAte of this element
	 */
	focusContextKey?: IContextKey<booleAn>;
}

export interfAce ISuggestEnAbledInputStyleOverrides extends IStyleOverrides {
	inputBAckground?: ColorIdentifier;
	inputForeground?: ColorIdentifier;
	inputBorder?: ColorIdentifier;
	inputPlAceholderForeground?: ColorIdentifier;
}

type ISuggestEnAbledInputStyles = {
	[P in keyof ISuggestEnAbledInputStyleOverrides]: Color | undefined;
};

export function AttAchSuggestEnAbledInputBoxStyler(widget: IThemAble, themeService: IThemeService, style?: ISuggestEnAbledInputStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		inputBAckground: (style && style.inputBAckground) || inputBAckground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputPlAceholderForeground: (style && style.inputPlAceholderForeground) || inputPlAceholderForeground,
	} As ISuggestEnAbledInputStyleOverrides, widget);
}

export clAss SuggestEnAbledInput extends Widget implements IThemAble {

	privAte reAdonly _onShouldFocusResults = new Emitter<void>();
	reAdonly onShouldFocusResults: Event<void> = this._onShouldFocusResults.event;

	privAte reAdonly _onEnter = new Emitter<void>();
	reAdonly onEnter: Event<void> = this._onEnter.event;

	privAte reAdonly _onInputDidChAnge = new Emitter<string | undefined>();
	reAdonly onInputDidChAnge: Event<string | undefined> = this._onInputDidChAnge.event;

	privAte reAdonly inputWidget: CodeEditorWidget;
	privAte reAdonly inputModel: ITextModel;
	privAte stylingContAiner: HTMLDivElement;
	privAte plAceholderText: HTMLDivElement;

	constructor(
		id: string,
		pArent: HTMLElement,
		suggestionProvider: SuggestResultsProvider,
		AriALAbel: string,
		resourceHAndle: string,
		options: SuggestEnAbledInputOptions,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IModelService modelService: IModelService,
	) {
		super();

		this.stylingContAiner = Append(pArent, $('.suggest-input-contAiner'));
		this.plAceholderText = Append(this.stylingContAiner, $('.suggest-input-plAceholder', undefined, options.plAceholderText || ''));

		const editorOptions: IEditorOptions = mixin(
			getSimpleEditorOptions(),
			getSuggestEnAbledInputOptions(AriALAbel));

		this.inputWidget = instAntiAtionService.creAteInstAnce(CodeEditorWidget, this.stylingContAiner,
			editorOptions,
			{
				contributions: EditorExtensionsRegistry.getSomeEditorContributions([
					SuggestController.ID,
					SnippetController2.ID,
					ContextMenuController.ID,
					MenuPreventer.ID,
					SelectionClipboArdContributionID,
				]),
				isSimpleWidget: true,
			});
		this._register(this.inputWidget);

		let scopeHAndle = uri.pArse(resourceHAndle);
		this.inputModel = modelService.creAteModel('', null, scopeHAndle, true);
		this.inputWidget.setModel(this.inputModel);

		this._register(this.inputWidget.onDidPAste(() => this.setVAlue(this.getVAlue()))); // setter cleAnses

		this._register((this.inputWidget.onDidFocusEditorText(() => {
			if (options.focusContextKey) { options.focusContextKey.set(true); }
			this.stylingContAiner.clAssList.Add('synthetic-focus');
		})));
		this._register((this.inputWidget.onDidBlurEditorText(() => {
			if (options.focusContextKey) { options.focusContextKey.set(fAlse); }
			this.stylingContAiner.clAssList.remove('synthetic-focus');
		})));

		const onKeyDownMonAco = Event.chAin(this.inputWidget.onKeyDown);
		this._register(onKeyDownMonAco.filter(e => e.keyCode === KeyCode.Enter).on(e => { e.preventDefAult(); this._onEnter.fire(); }, this));
		this._register(onKeyDownMonAco.filter(e => e.keyCode === KeyCode.DownArrow && (isMAcintosh ? e.metAKey : e.ctrlKey)).on(() => this._onShouldFocusResults.fire(), this));

		let preexistingContent = this.getVAlue();
		const inputWidgetModel = this.inputWidget.getModel();
		if (inputWidgetModel) {
			this._register(inputWidgetModel.onDidChAngeContent(() => {
				let content = this.getVAlue();
				this.plAceholderText.style.visibility = content ? 'hidden' : 'visible';
				if (preexistingContent.trim() === content.trim()) { return; }
				this._onInputDidChAnge.fire(undefined);
				preexistingContent = content;
			}));
		}

		let vAlidAtedSuggestProvider = {
			provideResults: suggestionProvider.provideResults,
			sortKey: suggestionProvider.sortKey || (A => A),
			triggerChArActers: suggestionProvider.triggerChArActers || []
		};

		this.setVAlue(options.vAlue || '');

		this._register(modes.CompletionProviderRegistry.register({ scheme: scopeHAndle.scheme, pAttern: '**/' + scopeHAndle.pAth, hAsAccessToAllModels: true }, {
			triggerChArActers: vAlidAtedSuggestProvider.triggerChArActers,
			provideCompletionItems: (model: ITextModel, position: Position, _context: modes.CompletionContext) => {
				let query = model.getVAlue();

				const zeroIndexedColumn = position.column - 1;

				let zeroIndexedWordStArt = query.lAstIndexOf(' ', zeroIndexedColumn - 1) + 1;
				let AlreAdyTypedCount = zeroIndexedColumn - zeroIndexedWordStArt;

				// dont show suggestions if the user hAs typed something, but hAsn't used the trigger chArActer
				if (AlreAdyTypedCount > 0 && vAlidAtedSuggestProvider.triggerChArActers.indexOf(query[zeroIndexedWordStArt]) === -1) {
					return { suggestions: [] };
				}

				return {
					suggestions: suggestionProvider.provideResults(query).mAp(result => {
						return <modes.CompletionItem>{
							lAbel: result,
							insertText: result,
							rAnge: RAnge.fromPositions(position.deltA(0, -AlreAdyTypedCount), position),
							sortText: vAlidAtedSuggestProvider.sortKey(result),
							kind: modes.CompletionItemKind.Keyword
						};
					})
				};
			}
		}));
	}

	public updAteAriALAbel(lAbel: string): void {
		this.inputWidget.updAteOptions({ AriALAbel: lAbel });
	}

	public get onFocus(): Event<void> { return this.inputWidget.onDidFocusEditorText; }

	public setVAlue(vAl: string) {
		vAl = vAl.replAce(/\s/g, ' ');
		const fullRAnge = this.inputModel.getFullModelRAnge();
		this.inputWidget.executeEdits('suggestEnAbledInput.setVAlue', [EditOperAtion.replAce(fullRAnge, vAl)]);
		this.inputWidget.setScrollTop(0);
		this.inputWidget.setPosition(new Position(1, vAl.length + 1));
	}

	public getVAlue(): string {
		return this.inputWidget.getVAlue();
	}


	public style(colors: ISuggestEnAbledInputStyles): void {
		this.stylingContAiner.style.bAckgroundColor = colors.inputBAckground ? colors.inputBAckground.toString() : '';
		this.stylingContAiner.style.color = colors.inputForeground ? colors.inputForeground.toString() : '';
		this.plAceholderText.style.color = colors.inputPlAceholderForeground ? colors.inputPlAceholderForeground.toString() : '';

		this.stylingContAiner.style.borderWidth = '1px';
		this.stylingContAiner.style.borderStyle = 'solid';
		this.stylingContAiner.style.borderColor = colors.inputBorder ?
			colors.inputBorder.toString() :
			'trAnspArent';

		const cursor = this.stylingContAiner.getElementsByClAssNAme('cursor')[0] As HTMLDivElement;
		if (cursor) {
			cursor.style.bAckgroundColor = colors.inputForeground ? colors.inputForeground.toString() : '';
		}
	}

	public focus(selectAll?: booleAn): void {
		this.inputWidget.focus();

		if (selectAll && this.inputWidget.getVAlue()) {
			this.selectAll();
		}
	}

	public onHide(): void {
		this.inputWidget.onHide();
	}

	public lAyout(dimension: Dimension): void {
		this.inputWidget.lAyout(dimension);
		this.plAceholderText.style.width = `${dimension.width - 2}px`;
	}

	privAte selectAll(): void {
		this.inputWidget.setSelection(new RAnge(1, 1, 1, this.getVAlue().length + 1));
	}
}

// Override styles in selections.ts
registerThemingPArticipAnt((theme, collector) => {
	let selectionColor = theme.getColor(selectionBAckground);
	if (selectionColor) {
		selectionColor = selectionColor.trAnspArent(0.4);
	} else {
		selectionColor = theme.getColor(editorSelectionBAckground);
	}

	if (selectionColor) {
		collector.AddRule(`.suggest-input-contAiner .monAco-editor .focused .selected-text { bAckground-color: ${selectionColor}; }`);
	}

	// Override inActive selection bg
	const inputBAckgroundColor = theme.getColor(inputBAckground);
	if (inputBAckgroundColor) {
		collector.AddRule(`.suggest-input-contAiner .monAco-editor .selected-text { bAckground-color: ${inputBAckgroundColor.trAnspArent(0.4)}; }`);
	}

	// Override selected fg
	const inputForegroundColor = theme.getColor(inputForeground);
	if (inputForegroundColor) {
		collector.AddRule(`.suggest-input-contAiner .monAco-editor .view-line spAn.inline-selected-text { color: ${inputForegroundColor}; }`);
	}

	const bAckgroundColor = theme.getColor(inputBAckground);
	if (bAckgroundColor) {
		collector.AddRule(`.suggest-input-contAiner .monAco-editor-bAckground { bAckground-color: ${bAckgroundColor}; } `);
	}
});


function getSuggestEnAbledInputOptions(AriALAbel?: string): IEditorOptions {
	return {
		fontSize: 13,
		lineHeight: 20,
		wordWrAp: 'off',
		scrollbAr: { verticAl: 'hidden', },
		roundedSelection: fAlse,
		renderIndentGuides: fAlse,
		cursorWidth: 1,
		fontFAmily: DEFAULT_FONT_FAMILY,
		AriALAbel: AriALAbel || '',
		snippetSuggestions: 'none',
		suggest: { filterGrAceful: fAlse, showIcons: fAlse },
		AutoClosingBrAckets: 'never'
	};
}
