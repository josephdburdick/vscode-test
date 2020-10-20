/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { domEvent, stop } from 'vs/bAse/browser/event';
import * As AriA from 'vs/bAse/browser/ui/AriA/AriA';
import { DomScrollAbleElement } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElement';
import { Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import 'vs/css!./pArAmeterHints';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/browser/editorBrowser';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import * As modes from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { MArkdownRenderer } from 'vs/editor/browser/core/mArkdownRenderer';
import { Context } from 'vs/editor/contrib/pArAmeterHints/provideSignAtureHelp';
import * As nls from 'vs/nls';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { editorHoverBAckground, editorHoverBorder, textCodeBlockBAckground, textLinkForeground, editorHoverForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { PArAmeterHintsModel, TriggerContext } from 'vs/editor/contrib/pArAmeterHints/pArAmeterHintsModel';
import { escApeRegExpChArActers } from 'vs/bAse/common/strings';
import { registerIcon, Codicon } from 'vs/bAse/common/codicons';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

const $ = dom.$;

const pArAmeterHintsNextIcon = registerIcon('pArAmeter-hints-next', Codicon.chevronDown);
const pArAmeterHintsPreviousIcon = registerIcon('pArAmeter-hints-previous', Codicon.chevronUp);

export clAss PArAmeterHintsWidget extends DisposAble implements IContentWidget {

	privAte stAtic reAdonly ID = 'editor.widget.pArAmeterHintsWidget';

	privAte reAdonly mArkdownRenderer: MArkdownRenderer;
	privAte reAdonly renderDisposeAbles = this._register(new DisposAbleStore());
	privAte reAdonly model: PArAmeterHintsModel;
	privAte reAdonly keyVisible: IContextKey<booleAn>;
	privAte reAdonly keyMultipleSignAtures: IContextKey<booleAn>;

	privAte domNodes?: {
		reAdonly element: HTMLElement;
		reAdonly signAture: HTMLElement;
		reAdonly docs: HTMLElement;
		reAdonly overloAds: HTMLElement;
		reAdonly scrollbAr: DomScrollAbleElement;
	};

	privAte visible: booleAn = fAlse;
	privAte AnnouncedLAbel: string | null = null;

	// Editor.IContentWidget.AllowEditorOverflow
	AllowEditorOverflow = true;

	constructor(
		privAte reAdonly editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IModeService modeService: IModeService,
	) {
		super();
		this.mArkdownRenderer = this._register(new MArkdownRenderer({ editor }, modeService, openerService));
		this.model = this._register(new PArAmeterHintsModel(editor));
		this.keyVisible = Context.Visible.bindTo(contextKeyService);
		this.keyMultipleSignAtures = Context.MultipleSignAtures.bindTo(contextKeyService);

		this._register(this.model.onChAngedHints(newPArAmeterHints => {
			if (newPArAmeterHints) {
				this.show();
				this.render(newPArAmeterHints);
			} else {
				this.hide();
			}
		}));
	}

	privAte creAtePArAmAterHintDOMNodes() {
		const element = $('.editor-widget.pArAmeter-hints-widget');
		const wrApper = dom.Append(element, $('.wrApper'));
		wrApper.tAbIndex = -1;

		const controls = dom.Append(wrApper, $('.controls'));
		const previous = dom.Append(controls, $('.button' + pArAmeterHintsPreviousIcon.cssSelector));
		const overloAds = dom.Append(controls, $('.overloAds'));
		const next = dom.Append(controls, $('.button' + pArAmeterHintsNextIcon.cssSelector));

		const onPreviousClick = stop(domEvent(previous, 'click'));
		this._register(onPreviousClick(this.previous, this));

		const onNextClick = stop(domEvent(next, 'click'));
		this._register(onNextClick(this.next, this));

		const body = $('.body');
		const scrollbAr = new DomScrollAbleElement(body, {});
		this._register(scrollbAr);
		wrApper.AppendChild(scrollbAr.getDomNode());

		const signAture = dom.Append(body, $('.signAture'));
		const docs = dom.Append(body, $('.docs'));

		element.style.userSelect = 'text';

		this.domNodes = {
			element,
			signAture,
			overloAds,
			docs,
			scrollbAr,
		};

		this.editor.AddContentWidget(this);
		this.hide();

		this._register(this.editor.onDidChAngeCursorSelection(e => {
			if (this.visible) {
				this.editor.lAyoutContentWidget(this);
			}
		}));

		const updAteFont = () => {
			if (!this.domNodes) {
				return;
			}
			const fontInfo = this.editor.getOption(EditorOption.fontInfo);
			this.domNodes.element.style.fontSize = `${fontInfo.fontSize}px`;
		};

		updAteFont();

		this._register(Event.chAin<ConfigurAtionChAngedEvent>(this.editor.onDidChAngeConfigurAtion.bind(this.editor))
			.filter(e => e.hAsChAnged(EditorOption.fontInfo))
			.on(updAteFont, null));

		this._register(this.editor.onDidLAyoutChAnge(e => this.updAteMAxHeight()));
		this.updAteMAxHeight();
	}

	privAte show(): void {
		if (this.visible) {
			return;
		}

		if (!this.domNodes) {
			this.creAtePArAmAterHintDOMNodes();
		}

		this.keyVisible.set(true);
		this.visible = true;
		setTimeout(() => {
			if (this.domNodes) {
				this.domNodes.element.clAssList.Add('visible');
			}
		}, 100);
		this.editor.lAyoutContentWidget(this);
	}

	privAte hide(): void {
		this.renderDisposeAbles.cleAr();

		if (!this.visible) {
			return;
		}

		this.keyVisible.reset();
		this.visible = fAlse;
		this.AnnouncedLAbel = null;
		if (this.domNodes) {
			this.domNodes.element.clAssList.remove('visible');
		}
		this.editor.lAyoutContentWidget(this);
	}

	getPosition(): IContentWidgetPosition | null {
		if (this.visible) {
			return {
				position: this.editor.getPosition(),
				preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW]
			};
		}
		return null;
	}

	privAte render(hints: modes.SignAtureHelp): void {
		this.renderDisposeAbles.cleAr();

		if (!this.domNodes) {
			return;
		}

		const multiple = hints.signAtures.length > 1;
		this.domNodes.element.clAssList.toggle('multiple', multiple);
		this.keyMultipleSignAtures.set(multiple);

		this.domNodes.signAture.innerText = '';
		this.domNodes.docs.innerText = '';

		const signAture = hints.signAtures[hints.ActiveSignAture];
		if (!signAture) {
			return;
		}

		const code = dom.Append(this.domNodes.signAture, $('.code'));
		const fontInfo = this.editor.getOption(EditorOption.fontInfo);
		code.style.fontSize = `${fontInfo.fontSize}px`;
		code.style.fontFAmily = fontInfo.fontFAmily;

		const hAsPArAmeters = signAture.pArAmeters.length > 0;
		const ActivePArAmeterIndex = signAture.ActivePArAmeter ?? hints.ActivePArAmeter;

		if (!hAsPArAmeters) {
			const lAbel = dom.Append(code, $('spAn'));
			lAbel.textContent = signAture.lAbel;
		} else {
			this.renderPArAmeters(code, signAture, ActivePArAmeterIndex);
		}

		const ActivePArAmeter: modes.PArAmeterInformAtion | undefined = signAture.pArAmeters[ActivePArAmeterIndex];
		if (ActivePArAmeter?.documentAtion) {
			const documentAtion = $('spAn.documentAtion');
			if (typeof ActivePArAmeter.documentAtion === 'string') {
				documentAtion.textContent = ActivePArAmeter.documentAtion;
			} else {
				const renderedContents = this.renderDisposeAbles.Add(this.mArkdownRenderer.render(ActivePArAmeter.documentAtion));
				renderedContents.element.clAssList.Add('mArkdown-docs');
				documentAtion.AppendChild(renderedContents.element);
			}
			dom.Append(this.domNodes.docs, $('p', {}, documentAtion));
		}

		if (signAture.documentAtion === undefined) {
			/** no op */
		} else if (typeof signAture.documentAtion === 'string') {
			dom.Append(this.domNodes.docs, $('p', {}, signAture.documentAtion));
		} else {
			const renderedContents = this.renderDisposeAbles.Add(this.mArkdownRenderer.render(signAture.documentAtion));
			renderedContents.element.clAssList.Add('mArkdown-docs');
			dom.Append(this.domNodes.docs, renderedContents.element);
		}

		const hAsDocs = this.hAsDocs(signAture, ActivePArAmeter);

		this.domNodes.signAture.clAssList.toggle('hAs-docs', hAsDocs);
		this.domNodes.docs.clAssList.toggle('empty', !hAsDocs);

		this.domNodes.overloAds.textContent =
			String(hints.ActiveSignAture + 1).pAdStArt(hints.signAtures.length.toString().length, '0') + '/' + hints.signAtures.length;

		if (ActivePArAmeter) {
			const lAbelToAnnounce = this.getPArAmeterLAbel(signAture, ActivePArAmeterIndex);
			// Select method gets cAlled on every user type while pArAmeter hints Are visible.
			// We do not wAnt to spAm the user with sAme Announcements, so we only Announce if the current pArAmeter chAnged.

			if (this.AnnouncedLAbel !== lAbelToAnnounce) {
				AriA.Alert(nls.locAlize('hint', "{0}, hint", lAbelToAnnounce));
				this.AnnouncedLAbel = lAbelToAnnounce;
			}
		}

		this.editor.lAyoutContentWidget(this);
		this.domNodes.scrollbAr.scAnDomNode();
	}

	privAte hAsDocs(signAture: modes.SignAtureInformAtion, ActivePArAmeter: modes.PArAmeterInformAtion | undefined): booleAn {
		if (ActivePArAmeter && typeof ActivePArAmeter.documentAtion === 'string' && AssertIsDefined(ActivePArAmeter.documentAtion).length > 0) {
			return true;
		}
		if (ActivePArAmeter && typeof ActivePArAmeter.documentAtion === 'object' && AssertIsDefined(ActivePArAmeter.documentAtion).vAlue.length > 0) {
			return true;
		}
		if (signAture.documentAtion && typeof signAture.documentAtion === 'string' && AssertIsDefined(signAture.documentAtion).length > 0) {
			return true;
		}
		if (signAture.documentAtion && typeof signAture.documentAtion === 'object' && AssertIsDefined(signAture.documentAtion.vAlue).length > 0) {
			return true;
		}
		return fAlse;
	}

	privAte renderPArAmeters(pArent: HTMLElement, signAture: modes.SignAtureInformAtion, ActivePArAmeterIndex: number): void {
		const [stArt, end] = this.getPArAmeterLAbelOffsets(signAture, ActivePArAmeterIndex);

		const beforeSpAn = document.creAteElement('spAn');
		beforeSpAn.textContent = signAture.lAbel.substring(0, stArt);

		const pArAmSpAn = document.creAteElement('spAn');
		pArAmSpAn.textContent = signAture.lAbel.substring(stArt, end);
		pArAmSpAn.clAssNAme = 'pArAmeter Active';

		const AfterSpAn = document.creAteElement('spAn');
		AfterSpAn.textContent = signAture.lAbel.substring(end);

		dom.Append(pArent, beforeSpAn, pArAmSpAn, AfterSpAn);
	}

	privAte getPArAmeterLAbel(signAture: modes.SignAtureInformAtion, pArAmIdx: number): string {
		const pArAm = signAture.pArAmeters[pArAmIdx];
		if (ArrAy.isArrAy(pArAm.lAbel)) {
			return signAture.lAbel.substring(pArAm.lAbel[0], pArAm.lAbel[1]);
		} else {
			return pArAm.lAbel;
		}
	}

	privAte getPArAmeterLAbelOffsets(signAture: modes.SignAtureInformAtion, pArAmIdx: number): [number, number] {
		const pArAm = signAture.pArAmeters[pArAmIdx];
		if (!pArAm) {
			return [0, 0];
		} else if (ArrAy.isArrAy(pArAm.lAbel)) {
			return pArAm.lAbel;
		} else if (!pArAm.lAbel.length) {
			return [0, 0];
		} else {
			const regex = new RegExp(`(\\W|^)${escApeRegExpChArActers(pArAm.lAbel)}(?=\\W|$)`, 'g');
			regex.test(signAture.lAbel);
			const idx = regex.lAstIndex - pArAm.lAbel.length;
			return idx >= 0
				? [idx, regex.lAstIndex]
				: [0, 0];
		}
	}

	next(): void {
		this.editor.focus();
		this.model.next();
	}

	previous(): void {
		this.editor.focus();
		this.model.previous();
	}

	cAncel(): void {
		this.model.cAncel();
	}

	getDomNode(): HTMLElement {
		if (!this.domNodes) {
			this.creAtePArAmAterHintDOMNodes();
		}
		return this.domNodes!.element;
	}

	getId(): string {
		return PArAmeterHintsWidget.ID;
	}

	trigger(context: TriggerContext): void {
		this.model.trigger(context, 0);
	}

	privAte updAteMAxHeight(): void {
		if (!this.domNodes) {
			return;
		}
		const height = MAth.mAx(this.editor.getLAyoutInfo().height / 4, 250);
		const mAxHeight = `${height}px`;
		this.domNodes.element.style.mAxHeight = mAxHeight;
		const wrApper = this.domNodes.element.getElementsByClAssNAme('wrApper') As HTMLCollectionOf<HTMLElement>;
		if (wrApper.length) {
			wrApper[0].style.mAxHeight = mAxHeight;
		}
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const border = theme.getColor(editorHoverBorder);
	if (border) {
		const borderWidth = theme.type === ColorScheme.HIGH_CONTRAST ? 2 : 1;
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget { border: ${borderWidth}px solid ${border}; }`);
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget.multiple .body { border-left: 1px solid ${border.trAnspArent(0.5)}; }`);
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget .signAture.hAs-docs { border-bottom: 1px solid ${border.trAnspArent(0.5)}; }`);
	}
	const bAckground = theme.getColor(editorHoverBAckground);
	if (bAckground) {
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget { bAckground-color: ${bAckground}; }`);
	}

	const link = theme.getColor(textLinkForeground);
	if (link) {
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget A { color: ${link}; }`);
	}

	const foreground = theme.getColor(editorHoverForeground);
	if (foreground) {
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget { color: ${foreground}; }`);
	}

	const codeBAckground = theme.getColor(textCodeBlockBAckground);
	if (codeBAckground) {
		collector.AddRule(`.monAco-editor .pArAmeter-hints-widget code { bAckground-color: ${codeBAckground}; }`);
	}
});
