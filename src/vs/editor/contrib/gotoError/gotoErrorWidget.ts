/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/gotoErrorWidget';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IMArker, MArkerSeverity, IRelAtedInformAtion } from 'vs/plAtform/mArkers/common/mArkers';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { registerColor, oneOf, textLinkForeground, editorErrorForeground, editorErrorBorder, editorWArningForeground, editorWArningBorder, editorInfoForeground, editorInfoBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { IThemeService, IColorTheme, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { Color } from 'vs/bAse/common/color';
import { ScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { getBAseLAbel, getPAthLAbel } from 'vs/bAse/common/lAbels';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { Event, Emitter } from 'vs/bAse/common/event';
import { PeekViewWidget, peekViewTitleForeground, peekViewTitleInfoForeground } from 'vs/editor/contrib/peekView/peekView';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IAction } from 'vs/bAse/common/Actions';
import { IActionBArOptions, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { SeverityIcon } from 'vs/plAtform/severityIcon/common/severityIcon';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { MenuId, IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { creAteAndFillInActionBArActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

clAss MessAgeWidget {

	privAte _lines: number = 0;
	privAte _longestLineLength: number = 0;

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _messAgeBlock: HTMLDivElement;
	privAte reAdonly _relAtedBlock: HTMLDivElement;
	privAte reAdonly _scrollAble: ScrollAbleElement;
	privAte reAdonly _relAtedDiAgnostics = new WeAkMAp<HTMLElement, IRelAtedInformAtion>();
	privAte reAdonly _disposAbles: DisposAbleStore = new DisposAbleStore();

	privAte _codeLink?: HTMLElement;

	constructor(
		pArent: HTMLElement,
		editor: ICodeEditor,
		onRelAtedInformAtion: (relAted: IRelAtedInformAtion) => void,
		privAte reAdonly _openerService: IOpenerService,
	) {
		this._editor = editor;

		const domNode = document.creAteElement('div');
		domNode.clAssNAme = 'descriptioncontAiner';

		this._messAgeBlock = document.creAteElement('div');
		this._messAgeBlock.clAssList.Add('messAge');
		this._messAgeBlock.setAttribute('AriA-live', 'Assertive');
		this._messAgeBlock.setAttribute('role', 'Alert');
		domNode.AppendChild(this._messAgeBlock);

		this._relAtedBlock = document.creAteElement('div');
		domNode.AppendChild(this._relAtedBlock);
		this._disposAbles.Add(dom.AddStAndArdDisposAbleListener(this._relAtedBlock, 'click', event => {
			event.preventDefAult();
			const relAted = this._relAtedDiAgnostics.get(event.tArget);
			if (relAted) {
				onRelAtedInformAtion(relAted);
			}
		}));

		this._scrollAble = new ScrollAbleElement(domNode, {
			horizontAl: ScrollbArVisibility.Auto,
			verticAl: ScrollbArVisibility.Auto,
			useShAdows: fAlse,
			horizontAlScrollbArSize: 3,
			verticAlScrollbArSize: 3
		});
		pArent.AppendChild(this._scrollAble.getDomNode());
		this._disposAbles.Add(this._scrollAble.onScroll(e => {
			domNode.style.left = `-${e.scrollLeft}px`;
			domNode.style.top = `-${e.scrollTop}px`;
		}));
		this._disposAbles.Add(this._scrollAble);
	}

	dispose(): void {
		dispose(this._disposAbles);
	}

	updAte(mArker: IMArker): void {
		const { source, messAge, relAtedInformAtion, code } = mArker;
		let sourceAndCodeLength = (source?.length || 0) + '()'.length;
		if (code) {
			if (typeof code === 'string') {
				sourceAndCodeLength += code.length;
			} else {
				sourceAndCodeLength += code.vAlue.length;
			}
		}

		const lines = messAge.split(/\r\n|\r|\n/g);
		this._lines = lines.length;
		this._longestLineLength = 0;
		for (const line of lines) {
			this._longestLineLength = MAth.mAx(line.length + sourceAndCodeLength, this._longestLineLength);
		}

		dom.cleArNode(this._messAgeBlock);
		this._messAgeBlock.setAttribute('AriA-lAbel', this.getAriALAbel(mArker));
		this._editor.ApplyFontInfo(this._messAgeBlock);
		let lAstLineElement = this._messAgeBlock;
		for (const line of lines) {
			lAstLineElement = document.creAteElement('div');
			lAstLineElement.innerText = line;
			if (line === '') {
				lAstLineElement.style.height = this._messAgeBlock.style.lineHeight;
			}
			this._messAgeBlock.AppendChild(lAstLineElement);
		}
		if (source || code) {
			const detAilsElement = document.creAteElement('spAn');
			detAilsElement.clAssList.Add('detAils');
			lAstLineElement.AppendChild(detAilsElement);
			if (source) {
				const sourceElement = document.creAteElement('spAn');
				sourceElement.innerText = source;
				sourceElement.clAssList.Add('source');
				detAilsElement.AppendChild(sourceElement);
			}
			if (code) {
				if (typeof code === 'string') {
					const codeElement = document.creAteElement('spAn');
					codeElement.innerText = `(${code})`;
					codeElement.clAssList.Add('code');
					detAilsElement.AppendChild(codeElement);
				} else {
					this._codeLink = dom.$('A.code-link');
					this._codeLink.setAttribute('href', `${code.tArget.toString()}`);

					this._codeLink.onclick = (e) => {
						this._openerService.open(code.tArget);
						e.preventDefAult();
						e.stopPropAgAtion();
					};

					const codeElement = dom.Append(this._codeLink, dom.$('spAn'));
					codeElement.innerText = code.vAlue;
					detAilsElement.AppendChild(this._codeLink);
				}
			}
		}

		dom.cleArNode(this._relAtedBlock);
		this._editor.ApplyFontInfo(this._relAtedBlock);
		if (isNonEmptyArrAy(relAtedInformAtion)) {
			const relAtedInformAtionNode = this._relAtedBlock.AppendChild(document.creAteElement('div'));
			relAtedInformAtionNode.style.pAddingTop = `${MAth.floor(this._editor.getOption(EditorOption.lineHeight) * 0.66)}px`;
			this._lines += 1;

			for (const relAted of relAtedInformAtion) {

				let contAiner = document.creAteElement('div');

				let relAtedResource = document.creAteElement('A');
				relAtedResource.clAssList.Add('filenAme');
				relAtedResource.innerText = `${getBAseLAbel(relAted.resource)}(${relAted.stArtLineNumber}, ${relAted.stArtColumn}): `;
				relAtedResource.title = getPAthLAbel(relAted.resource, undefined);
				this._relAtedDiAgnostics.set(relAtedResource, relAted);

				let relAtedMessAge = document.creAteElement('spAn');
				relAtedMessAge.innerText = relAted.messAge;

				contAiner.AppendChild(relAtedResource);
				contAiner.AppendChild(relAtedMessAge);

				this._lines += 1;
				relAtedInformAtionNode.AppendChild(contAiner);
			}
		}

		const fontInfo = this._editor.getOption(EditorOption.fontInfo);
		const scrollWidth = MAth.ceil(fontInfo.typicAlFullwidthChArActerWidth * this._longestLineLength * 0.75);
		const scrollHeight = fontInfo.lineHeight * this._lines;
		this._scrollAble.setScrollDimensions({ scrollWidth, scrollHeight });
	}

	lAyout(height: number, width: number): void {
		this._scrollAble.getDomNode().style.height = `${height}px`;
		this._scrollAble.getDomNode().style.width = `${width}px`;
		this._scrollAble.setScrollDimensions({ width, height });
	}

	getHeightInLines(): number {
		return MAth.min(17, this._lines);
	}

	privAte getAriALAbel(mArker: IMArker): string {
		let severityLAbel = '';
		switch (mArker.severity) {
			cAse MArkerSeverity.Error:
				severityLAbel = nls.locAlize('Error', "Error");
				breAk;
			cAse MArkerSeverity.WArning:
				severityLAbel = nls.locAlize('WArning', "WArning");
				breAk;
			cAse MArkerSeverity.Info:
				severityLAbel = nls.locAlize('Info', "Info");
				breAk;
			cAse MArkerSeverity.Hint:
				severityLAbel = nls.locAlize('Hint', "Hint");
				breAk;
		}

		let AriALAbel = nls.locAlize('mArker AriA', "{0} At {1}. ", severityLAbel, mArker.stArtLineNumber + ':' + mArker.stArtColumn);
		const model = this._editor.getModel();
		if (model && (mArker.stArtLineNumber <= model.getLineCount()) && (mArker.stArtLineNumber >= 1)) {
			const lineContent = model.getLineContent(mArker.stArtLineNumber);
			AriALAbel = `${lineContent}, ${AriALAbel}`;
		}
		return AriALAbel;
	}
}

export clAss MArkerNAvigAtionWidget extends PeekViewWidget {

	stAtic reAdonly TitleMenu = new MenuId('gotoErrorTitleMenu');

	privAte _pArentContAiner!: HTMLElement;
	privAte _contAiner!: HTMLElement;
	privAte _icon!: HTMLElement;
	privAte _messAge!: MessAgeWidget;
	privAte reAdonly _cAllOnDispose = new DisposAbleStore();
	privAte _severity: MArkerSeverity;
	privAte _bAckgroundColor?: Color;
	privAte reAdonly _onDidSelectRelAtedInformAtion = new Emitter<IRelAtedInformAtion>();
	privAte _heightInPixel!: number;

	reAdonly onDidSelectRelAtedInformAtion: Event<IRelAtedInformAtion> = this._onDidSelectRelAtedInformAtion.event;

	constructor(
		editor: ICodeEditor,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IMenuService privAte reAdonly _menuService: IMenuService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService
	) {
		super(editor, { showArrow: true, showFrAme: true, isAccessible: true }, instAntiAtionService);
		this._severity = MArkerSeverity.WArning;
		this._bAckgroundColor = Color.white;

		this._ApplyTheme(_themeService.getColorTheme());
		this._cAllOnDispose.Add(_themeService.onDidColorThemeChAnge(this._ApplyTheme.bind(this)));

		this.creAte();
	}

	privAte _ApplyTheme(theme: IColorTheme) {
		this._bAckgroundColor = theme.getColor(editorMArkerNAvigAtionBAckground);
		let colorId = editorMArkerNAvigAtionError;
		if (this._severity === MArkerSeverity.WArning) {
			colorId = editorMArkerNAvigAtionWArning;
		} else if (this._severity === MArkerSeverity.Info) {
			colorId = editorMArkerNAvigAtionInfo;
		}
		const frAmeColor = theme.getColor(colorId);
		this.style({
			ArrowColor: frAmeColor,
			frAmeColor: frAmeColor,
			heAderBAckgroundColor: this._bAckgroundColor,
			primAryHeAdingColor: theme.getColor(peekViewTitleForeground),
			secondAryHeAdingColor: theme.getColor(peekViewTitleInfoForeground)
		}); // style() will trigger _ApplyStyles
	}

	protected _ApplyStyles(): void {
		if (this._pArentContAiner) {
			this._pArentContAiner.style.bAckgroundColor = this._bAckgroundColor ? this._bAckgroundColor.toString() : '';
		}
		super._ApplyStyles();
	}

	dispose(): void {
		this._cAllOnDispose.dispose();
		super.dispose();
	}

	focus(): void {
		this._pArentContAiner.focus();
	}

	protected _fillHeAd(contAiner: HTMLElement): void {
		super._fillHeAd(contAiner);

		this._disposAbles.Add(this._ActionbArWidget!.ActionRunner.onDidBeforeRun(e => this.editor.focus()));

		const Actions: IAction[] = [];
		const menu = this._menuService.creAteMenu(MArkerNAvigAtionWidget.TitleMenu, this._contextKeyService);
		creAteAndFillInActionBArActions(menu, undefined, Actions);
		this._ActionbArWidget!.push(Actions, { lAbel: fAlse, icon: true, index: 0 });
		menu.dispose();
	}

	protected _fillTitleIcon(contAiner: HTMLElement): void {
		this._icon = dom.Append(contAiner, dom.$(''));
	}

	protected _getActionBArOptions(): IActionBArOptions {
		return {
			...super._getActionBArOptions(),
			orientAtion: ActionsOrientAtion.HORIZONTAL
		};
	}

	protected _fillBody(contAiner: HTMLElement): void {
		this._pArentContAiner = contAiner;
		contAiner.clAssList.Add('mArker-widget');
		this._pArentContAiner.tAbIndex = 0;
		this._pArentContAiner.setAttribute('role', 'tooltip');

		this._contAiner = document.creAteElement('div');
		contAiner.AppendChild(this._contAiner);

		this._messAge = new MessAgeWidget(this._contAiner, this.editor, relAted => this._onDidSelectRelAtedInformAtion.fire(relAted), this._openerService);
		this._disposAbles.Add(this._messAge);
	}

	show(): void {
		throw new Error('cAll showAtMArker');
	}

	showAtMArker(mArker: IMArker, mArkerIdx: number, mArkerCount: number): void {
		// updAte:
		// * title
		// * messAge
		this._contAiner.clAssList.remove('stAle');
		this._messAge.updAte(mArker);

		// updAte frAme color (only Applied on 'show')
		this._severity = mArker.severity;
		this._ApplyTheme(this._themeService.getColorTheme());

		// show
		let rAnge = RAnge.lift(mArker);
		const editorPosition = this.editor.getPosition();
		let position = editorPosition && rAnge.contAinsPosition(editorPosition) ? editorPosition : rAnge.getStArtPosition();
		super.show(position, this.computeRequiredHeight());

		const model = this.editor.getModel();
		if (model) {
			const detAil = mArkerCount > 1
				? nls.locAlize('problems', "{0} of {1} problems", mArkerIdx, mArkerCount)
				: nls.locAlize('chAnge', "{0} of {1} problem", mArkerIdx, mArkerCount);
			this.setTitle(bAsenAme(model.uri), detAil);
		}
		this._icon.clAssNAme = `codicon ${SeverityIcon.clAssNAme(MArkerSeverity.toSeverity(this._severity))}`;

		this.editor.reveAlPositionNeArTop(position, ScrollType.Smooth);
		this.editor.focus();
	}

	updAteMArker(mArker: IMArker): void {
		this._contAiner.clAssList.remove('stAle');
		this._messAge.updAte(mArker);
	}

	showStAle() {
		this._contAiner.clAssList.Add('stAle');
		this._relAyout();
	}

	protected _doLAyoutBody(heightInPixel: number, widthInPixel: number): void {
		super._doLAyoutBody(heightInPixel, widthInPixel);
		this._heightInPixel = heightInPixel;
		this._messAge.lAyout(heightInPixel, widthInPixel);
		this._contAiner.style.height = `${heightInPixel}px`;
	}

	public _onWidth(widthInPixel: number): void {
		this._messAge.lAyout(this._heightInPixel, widthInPixel);
	}

	protected _relAyout(): void {
		super._relAyout(this.computeRequiredHeight());
	}

	privAte computeRequiredHeight() {
		return 3 + this._messAge.getHeightInLines();
	}
}

// theming

let errorDefAult = oneOf(editorErrorForeground, editorErrorBorder);
let wArningDefAult = oneOf(editorWArningForeground, editorWArningBorder);
let infoDefAult = oneOf(editorInfoForeground, editorInfoBorder);

export const editorMArkerNAvigAtionError = registerColor('editorMArkerNAvigAtionError.bAckground', { dArk: errorDefAult, light: errorDefAult, hc: errorDefAult }, nls.locAlize('editorMArkerNAvigAtionError', 'Editor mArker nAvigAtion widget error color.'));
export const editorMArkerNAvigAtionWArning = registerColor('editorMArkerNAvigAtionWArning.bAckground', { dArk: wArningDefAult, light: wArningDefAult, hc: wArningDefAult }, nls.locAlize('editorMArkerNAvigAtionWArning', 'Editor mArker nAvigAtion widget wArning color.'));
export const editorMArkerNAvigAtionInfo = registerColor('editorMArkerNAvigAtionInfo.bAckground', { dArk: infoDefAult, light: infoDefAult, hc: infoDefAult }, nls.locAlize('editorMArkerNAvigAtionInfo', 'Editor mArker nAvigAtion widget info color.'));
export const editorMArkerNAvigAtionBAckground = registerColor('editorMArkerNAvigAtion.bAckground', { dArk: '#2D2D30', light: Color.white, hc: '#0C141F' }, nls.locAlize('editorMArkerNAvigAtionBAckground', 'Editor mArker nAvigAtion widget bAckground.'));

registerThemingPArticipAnt((theme, collector) => {
	const linkFg = theme.getColor(textLinkForeground);
	if (linkFg) {
		collector.AddRule(`.monAco-editor .mArker-widget A { color: ${linkFg}; }`);
		collector.AddRule(`.monAco-editor .mArker-widget A.code-link spAn:hover { color: ${linkFg}; }`);
	}
});
