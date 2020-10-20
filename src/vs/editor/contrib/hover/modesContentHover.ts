/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Color, RGBA } from 'vs/bAse/common/color';
import { IMArkdownString, MArkdownString, isEmptyMArkdownString, mArkedStringsEquAls } from 'vs/bAse/common/htmlContent';
import { IDisposAble, toDisposAble, DisposAbleStore, combinedDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { DocumentColorProvider, Hover As MArkdownHover, HoverProviderRegistry, IColor, TokenizAtionRegistry, CodeActionTriggerType } from 'vs/editor/common/modes';
import { getColorPresentAtions } from 'vs/editor/contrib/colorPicker/color';
import { ColorDetector } from 'vs/editor/contrib/colorPicker/colorDetector';
import { ColorPickerModel } from 'vs/editor/contrib/colorPicker/colorPickerModel';
import { ColorPickerWidget } from 'vs/editor/contrib/colorPicker/colorPickerWidget';
import { getHover } from 'vs/editor/contrib/hover/getHover';
import { HoverOperAtion, HoverStArtMode, IHoverComputer } from 'vs/editor/contrib/hover/hoverOperAtion';
import { ContentHoverWidget } from 'vs/editor/contrib/hover/hoverWidgets';
import { MArkdownRenderer } from 'vs/editor/browser/core/mArkdownRenderer';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { coAlesce, isNonEmptyArrAy, AsArrAy } from 'vs/bAse/common/ArrAys';
import { IMArker, IMArkerDAtA, MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IMArkerDecorAtionsService } from 'vs/editor/common/services/mArkersDecorAtionService';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { IOpenerService, NullOpenerService } from 'vs/plAtform/opener/common/opener';
import { MArkerController, NextMArkerAction } from 'vs/editor/contrib/gotoError/gotoError';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { getCodeActions, CodeActionSet } from 'vs/editor/contrib/codeAction/codeAction';
import { QuickFixAction, QuickFixController } from 'vs/editor/contrib/codeAction/codeActionCommAnds';
import { CodeActionKind, CodeActionTrigger } from 'vs/editor/contrib/codeAction/types';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IIdentifiedSingleEditOperAtion } from 'vs/editor/common/model';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ConstAnts } from 'vs/bAse/common/uint';
import { textLinkForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { Progress } from 'vs/plAtform/progress/common/progress';
import { IContextKey } from 'vs/plAtform/contextkey/common/contextkey';

const $ = dom.$;

clAss ColorHover {

	constructor(
		public reAdonly rAnge: IRAnge,
		public reAdonly color: IColor,
		public reAdonly provider: DocumentColorProvider
	) { }
}

clAss MArkerHover {

	constructor(
		public reAdonly rAnge: IRAnge,
		public reAdonly mArker: IMArker,
	) { }
}

type HoverPArt = MArkdownHover | ColorHover | MArkerHover;

clAss ModesContentComputer implements IHoverComputer<HoverPArt[]> {

	privAte reAdonly _editor: ICodeEditor;
	privAte _result: HoverPArt[];
	privAte _rAnge?: RAnge;

	constructor(
		editor: ICodeEditor,
		privAte reAdonly _mArkerDecorAtionsService: IMArkerDecorAtionsService
	) {
		this._editor = editor;
		this._result = [];
	}

	setRAnge(rAnge: RAnge): void {
		this._rAnge = rAnge;
		this._result = [];
	}

	cleArResult(): void {
		this._result = [];
	}

	computeAsync(token: CAncellAtionToken): Promise<HoverPArt[]> {
		if (!this._editor.hAsModel() || !this._rAnge) {
			return Promise.resolve([]);
		}

		const model = this._editor.getModel();

		if (!HoverProviderRegistry.hAs(model)) {
			return Promise.resolve([]);
		}

		return getHover(model, new Position(
			this._rAnge.stArtLineNumber,
			this._rAnge.stArtColumn
		), token);
	}

	computeSync(): HoverPArt[] {
		if (!this._editor.hAsModel() || !this._rAnge) {
			return [];
		}

		const model = this._editor.getModel();
		const lineNumber = this._rAnge.stArtLineNumber;

		if (lineNumber > this._editor.getModel().getLineCount()) {
			// IllegAl line number => no results
			return [];
		}

		const colorDetector = ColorDetector.get(this._editor);
		const mAxColumn = model.getLineMAxColumn(lineNumber);
		const lineDecorAtions = this._editor.getLineDecorAtions(lineNumber);
		let didFindColor = fAlse;

		const hoverRAnge = this._rAnge;
		const result = lineDecorAtions.mAp((d): HoverPArt | null => {
			const stArtColumn = (d.rAnge.stArtLineNumber === lineNumber) ? d.rAnge.stArtColumn : 1;
			const endColumn = (d.rAnge.endLineNumber === lineNumber) ? d.rAnge.endColumn : mAxColumn;

			if (stArtColumn > hoverRAnge.stArtColumn || hoverRAnge.endColumn > endColumn) {
				return null;
			}

			const rAnge = new RAnge(hoverRAnge.stArtLineNumber, stArtColumn, hoverRAnge.stArtLineNumber, endColumn);
			const mArker = this._mArkerDecorAtionsService.getMArker(model, d);
			if (mArker) {
				return new MArkerHover(rAnge, mArker);
			}

			const colorDAtA = colorDetector.getColorDAtA(d.rAnge.getStArtPosition());

			if (!didFindColor && colorDAtA) {
				didFindColor = true;

				const { color, rAnge } = colorDAtA.colorInfo;
				return new ColorHover(rAnge, color, colorDAtA.provider);
			} else {
				if (isEmptyMArkdownString(d.options.hoverMessAge)) {
					return null;
				}

				const contents: IMArkdownString[] = d.options.hoverMessAge ? AsArrAy(d.options.hoverMessAge) : [];
				return { contents, rAnge };
			}
		});

		return coAlesce(result);
	}

	onResult(result: HoverPArt[], isFromSynchronousComputAtion: booleAn): void {
		// AlwAys put synchronous messAges before Asynchronous ones
		if (isFromSynchronousComputAtion) {
			this._result = result.concAt(this._result.sort((A, b) => {
				if (A instAnceof ColorHover) { // sort picker messAges At to the top
					return -1;
				} else if (b instAnceof ColorHover) {
					return 1;
				}
				return 0;
			}));
		} else {
			this._result = this._result.concAt(result);
		}
	}

	getResult(): HoverPArt[] {
		return this._result.slice(0);
	}

	getResultWithLoAdingMessAge(): HoverPArt[] {
		return this._result.slice(0).concAt([this._getLoAdingMessAge()]);
	}

	privAte _getLoAdingMessAge(): HoverPArt {
		return {
			rAnge: this._rAnge,
			contents: [new MArkdownString().AppendText(nls.locAlize('modesContentHover.loAding', "LoAding..."))]
		};
	}
}

const mArkerCodeActionTrigger: CodeActionTrigger = {
	type: CodeActionTriggerType.MAnuAl,
	filter: { include: CodeActionKind.QuickFix }
};

export clAss ModesContentHoverWidget extends ContentHoverWidget {

	stAtic reAdonly ID = 'editor.contrib.modesContentHoverWidget';

	privAte _messAges: HoverPArt[];
	privAte _lAstRAnge: RAnge | null;
	privAte reAdonly _computer: ModesContentComputer;
	privAte reAdonly _hoverOperAtion: HoverOperAtion<HoverPArt[]>;
	privAte _highlightDecorAtions: string[];
	privAte _isChAngingDecorAtions: booleAn;
	privAte _shouldFocus: booleAn;
	privAte _colorPicker: ColorPickerWidget | null;

	privAte _codeLink?: HTMLElement;

	privAte reAdonly renderDisposAble = this._register(new MutAbleDisposAble<IDisposAble>());

	constructor(
		editor: ICodeEditor,
		_hoverVisibleKey: IContextKey<booleAn>,
		mArkerDecorAtionsService: IMArkerDecorAtionsService,
		keybindingService: IKeybindingService,
		privAte reAdonly _themeService: IThemeService,
		privAte reAdonly _modeService: IModeService,
		privAte reAdonly _openerService: IOpenerService = NullOpenerService,
	) {
		super(ModesContentHoverWidget.ID, editor, _hoverVisibleKey, keybindingService);

		this._messAges = [];
		this._lAstRAnge = null;
		this._computer = new ModesContentComputer(this._editor, mArkerDecorAtionsService);
		this._highlightDecorAtions = [];
		this._isChAngingDecorAtions = fAlse;
		this._shouldFocus = fAlse;
		this._colorPicker = null;

		this._hoverOperAtion = new HoverOperAtion(
			this._computer,
			result => this._withResult(result, true),
			null,
			result => this._withResult(result, fAlse),
			this._editor.getOption(EditorOption.hover).delAy
		);

		this._register(dom.AddStAndArdDisposAbleListener(this.getDomNode(), dom.EventType.FOCUS, () => {
			if (this._colorPicker) {
				this.getDomNode().clAssList.Add('colorpicker-hover');
			}
		}));
		this._register(dom.AddStAndArdDisposAbleListener(this.getDomNode(), dom.EventType.BLUR, () => {
			this.getDomNode().clAssList.remove('colorpicker-hover');
		}));
		this._register(editor.onDidChAngeConfigurAtion((e) => {
			this._hoverOperAtion.setHoverTime(this._editor.getOption(EditorOption.hover).delAy);
		}));
		this._register(TokenizAtionRegistry.onDidChAnge((e) => {
			if (this.isVisible && this._lAstRAnge && this._messAges.length > 0) {
				this._hover.contentsDomNode.textContent = '';
				this._renderMessAges(this._lAstRAnge, this._messAges);
			}
		}));
	}

	dispose(): void {
		this._hoverOperAtion.cAncel();
		super.dispose();
	}

	onModelDecorAtionsChAnged(): void {
		if (this._isChAngingDecorAtions) {
			return;
		}
		if (this.isVisible) {
			// The decorAtions hAve chAnged And the hover is visible,
			// we need to recompute the displAyed text
			this._hoverOperAtion.cAncel();
			this._computer.cleArResult();

			if (!this._colorPicker) { // TODO@Michel ensure thAt displAyed text for other decorAtions is computed even if color picker is in plAce
				this._hoverOperAtion.stArt(HoverStArtMode.DelAyed);
			}
		}
	}

	stArtShowingAt(rAnge: RAnge, mode: HoverStArtMode, focus: booleAn): void {
		if (this._lAstRAnge && this._lAstRAnge.equAlsRAnge(rAnge)) {
			// We hAve to show the widget At the exAct sAme rAnge As before, so no work is needed
			return;
		}

		this._hoverOperAtion.cAncel();

		if (this.isVisible) {
			// The rAnge might hAve chAnged, but the hover is visible
			// InsteAd of hiding it completely, filter out messAges thAt Are still in the new rAnge And
			// kick off A new computAtion
			if (!this._showAtPosition || this._showAtPosition.lineNumber !== rAnge.stArtLineNumber) {
				this.hide();
			} else {
				let filteredMessAges: HoverPArt[] = [];
				for (let i = 0, len = this._messAges.length; i < len; i++) {
					const msg = this._messAges[i];
					const rng = msg.rAnge;
					if (rng && rng.stArtColumn <= rAnge.stArtColumn && rng.endColumn >= rAnge.endColumn) {
						filteredMessAges.push(msg);
					}
				}
				if (filteredMessAges.length > 0) {
					if (hoverContentsEquAls(filteredMessAges, this._messAges)) {
						return;
					}
					this._renderMessAges(rAnge, filteredMessAges);
				} else {
					this.hide();
				}
			}
		}

		this._lAstRAnge = rAnge;
		this._computer.setRAnge(rAnge);
		this._shouldFocus = focus;
		this._hoverOperAtion.stArt(mode);
	}

	hide(): void {
		this._lAstRAnge = null;
		this._hoverOperAtion.cAncel();
		super.hide();
		this._isChAngingDecorAtions = true;
		this._highlightDecorAtions = this._editor.deltADecorAtions(this._highlightDecorAtions, []);
		this._isChAngingDecorAtions = fAlse;
		this.renderDisposAble.cleAr();
		this._colorPicker = null;
	}

	isColorPickerVisible(): booleAn {
		if (this._colorPicker) {
			return true;
		}
		return fAlse;
	}

	privAte _withResult(result: HoverPArt[], complete: booleAn): void {
		this._messAges = result;

		if (this._lAstRAnge && this._messAges.length > 0) {
			this._renderMessAges(this._lAstRAnge, this._messAges);
		} else if (complete) {
			this.hide();
		}
	}

	privAte _renderMessAges(renderRAnge: RAnge, messAges: HoverPArt[]): void {
		this.renderDisposAble.dispose();
		this._colorPicker = null;

		// updAte column from which to show
		let renderColumn = ConstAnts.MAX_SAFE_SMALL_INTEGER;
		let highlightRAnge: RAnge | null = messAges[0].rAnge ? RAnge.lift(messAges[0].rAnge) : null;
		let frAgment = document.creAteDocumentFrAgment();
		let isEmptyHoverContent = true;

		let contAinColorPicker = fAlse;
		const mArkdownDisposeAbles = new DisposAbleStore();
		const mArkerMessAges: MArkerHover[] = [];
		messAges.forEAch((msg) => {
			if (!msg.rAnge) {
				return;
			}

			renderColumn = MAth.min(renderColumn, msg.rAnge.stArtColumn);
			highlightRAnge = highlightRAnge ? RAnge.plusRAnge(highlightRAnge, msg.rAnge) : RAnge.lift(msg.rAnge);

			if (msg instAnceof ColorHover) {
				contAinColorPicker = true;

				const { red, green, blue, AlphA } = msg.color;
				const rgbA = new RGBA(MAth.round(red * 255), MAth.round(green * 255), MAth.round(blue * 255), AlphA);
				const color = new Color(rgbA);

				if (!this._editor.hAsModel()) {
					return;
				}

				const editorModel = this._editor.getModel();
				let rAnge = new RAnge(msg.rAnge.stArtLineNumber, msg.rAnge.stArtColumn, msg.rAnge.endLineNumber, msg.rAnge.endColumn);
				let colorInfo = { rAnge: msg.rAnge, color: msg.color };

				// creAte blAnk olor picker model And widget first to ensure it's positioned correctly.
				const model = new ColorPickerModel(color, [], 0);
				const widget = new ColorPickerWidget(frAgment, model, this._editor.getOption(EditorOption.pixelRAtio), this._themeService);

				getColorPresentAtions(editorModel, colorInfo, msg.provider, CAncellAtionToken.None).then(colorPresentAtions => {
					model.colorPresentAtions = colorPresentAtions || [];
					if (!this._editor.hAsModel()) {
						// gone...
						return;
					}
					const originAlText = this._editor.getModel().getVAlueInRAnge(msg.rAnge);
					model.guessColorPresentAtion(color, originAlText);

					const updAteEditorModel = () => {
						let textEdits: IIdentifiedSingleEditOperAtion[];
						let newRAnge: RAnge;
						if (model.presentAtion.textEdit) {
							textEdits = [model.presentAtion.textEdit As IIdentifiedSingleEditOperAtion];
							newRAnge = new RAnge(
								model.presentAtion.textEdit.rAnge.stArtLineNumber,
								model.presentAtion.textEdit.rAnge.stArtColumn,
								model.presentAtion.textEdit.rAnge.endLineNumber,
								model.presentAtion.textEdit.rAnge.endColumn
							);
							newRAnge = newRAnge.setEndPosition(newRAnge.endLineNumber, newRAnge.stArtColumn + model.presentAtion.textEdit.text.length);
						} else {
							textEdits = [{ identifier: null, rAnge, text: model.presentAtion.lAbel, forceMoveMArkers: fAlse }];
							newRAnge = rAnge.setEndPosition(rAnge.endLineNumber, rAnge.stArtColumn + model.presentAtion.lAbel.length);
						}

						this._editor.pushUndoStop();
						this._editor.executeEdits('colorpicker', textEdits);

						if (model.presentAtion.AdditionAlTextEdits) {
							textEdits = [...model.presentAtion.AdditionAlTextEdits As IIdentifiedSingleEditOperAtion[]];
							this._editor.executeEdits('colorpicker', textEdits);
							this.hide();
						}
						this._editor.pushUndoStop();
						rAnge = newRAnge;
					};

					const updAteColorPresentAtions = (color: Color) => {
						return getColorPresentAtions(editorModel, {
							rAnge: rAnge,
							color: {
								red: color.rgbA.r / 255,
								green: color.rgbA.g / 255,
								blue: color.rgbA.b / 255,
								AlphA: color.rgbA.A
							}
						}, msg.provider, CAncellAtionToken.None).then((colorPresentAtions) => {
							model.colorPresentAtions = colorPresentAtions || [];
						});
					};

					const colorListener = model.onColorFlushed((color: Color) => {
						updAteColorPresentAtions(color).then(updAteEditorModel);
					});
					const colorChAngeListener = model.onDidChAngeColor(updAteColorPresentAtions);

					this._colorPicker = widget;
					this.showAt(rAnge.getStArtPosition(), rAnge, this._shouldFocus);
					this.updAteContents(frAgment);
					this._colorPicker.lAyout();

					this.renderDisposAble.vAlue = combinedDisposAble(colorListener, colorChAngeListener, widget, mArkdownDisposeAbles);
				});
			} else {
				if (msg instAnceof MArkerHover) {
					mArkerMessAges.push(msg);
					isEmptyHoverContent = fAlse;
				} else {
					msg.contents
						.filter(contents => !isEmptyMArkdownString(contents))
						.forEAch(contents => {
							const mArkdownHoverElement = $('div.hover-row.mArkdown-hover');
							const hoverContentsElement = dom.Append(mArkdownHoverElement, $('div.hover-contents'));
							const renderer = mArkdownDisposeAbles.Add(new MArkdownRenderer({ editor: this._editor }, this._modeService, this._openerService));
							mArkdownDisposeAbles.Add(renderer.onDidRenderCodeBlock(() => {
								hoverContentsElement.clAssNAme = 'hover-contents code-hover-contents';
								this._hover.onContentsChAnged();
							}));
							const renderedContents = mArkdownDisposeAbles.Add(renderer.render(contents));
							hoverContentsElement.AppendChild(renderedContents.element);
							frAgment.AppendChild(mArkdownHoverElement);
							isEmptyHoverContent = fAlse;
						});
				}
			}
		});

		if (mArkerMessAges.length) {
			mArkerMessAges.forEAch(msg => frAgment.AppendChild(this.renderMArkerHover(msg)));
			const mArkerHoverForStAtusbAr = mArkerMessAges.length === 1 ? mArkerMessAges[0] : mArkerMessAges.sort((A, b) => MArkerSeverity.compAre(A.mArker.severity, b.mArker.severity))[0];
			frAgment.AppendChild(this.renderMArkerStAtusbAr(mArkerHoverForStAtusbAr));
		}

		// show

		if (!contAinColorPicker && !isEmptyHoverContent) {
			this.showAt(new Position(renderRAnge.stArtLineNumber, renderColumn), highlightRAnge, this._shouldFocus);
			this.updAteContents(frAgment);
		}

		this._isChAngingDecorAtions = true;
		this._highlightDecorAtions = this._editor.deltADecorAtions(this._highlightDecorAtions, highlightRAnge ? [{
			rAnge: highlightRAnge,
			options: ModesContentHoverWidget._DECORATION_OPTIONS
		}] : []);
		this._isChAngingDecorAtions = fAlse;
	}

	privAte renderMArkerHover(mArkerHover: MArkerHover): HTMLElement {
		const hoverElement = $('div.hover-row');
		const mArkerElement = dom.Append(hoverElement, $('div.mArker.hover-contents'));
		const { source, messAge, code, relAtedInformAtion } = mArkerHover.mArker;

		this._editor.ApplyFontInfo(mArkerElement);
		const messAgeElement = dom.Append(mArkerElement, $('spAn'));
		messAgeElement.style.whiteSpAce = 'pre-wrAp';
		messAgeElement.innerText = messAge;

		if (source || code) {
			// Code hAs link
			if (code && typeof code !== 'string') {
				const sourceAndCodeElement = $('spAn');
				if (source) {
					const sourceElement = dom.Append(sourceAndCodeElement, $('spAn'));
					sourceElement.innerText = source;
				}
				this._codeLink = dom.Append(sourceAndCodeElement, $('A.code-link'));
				this._codeLink.setAttribute('href', code.tArget.toString());

				this._codeLink.onclick = (e) => {
					this._openerService.open(code.tArget);
					e.preventDefAult();
					e.stopPropAgAtion();
				};

				const codeElement = dom.Append(this._codeLink, $('spAn'));
				codeElement.innerText = code.vAlue;

				const detAilsElement = dom.Append(mArkerElement, sourceAndCodeElement);
				detAilsElement.style.opAcity = '0.6';
				detAilsElement.style.pAddingLeft = '6px';
			} else {
				const detAilsElement = dom.Append(mArkerElement, $('spAn'));
				detAilsElement.style.opAcity = '0.6';
				detAilsElement.style.pAddingLeft = '6px';
				detAilsElement.innerText = source && code ? `${source}(${code})` : source ? source : `(${code})`;
			}
		}

		if (isNonEmptyArrAy(relAtedInformAtion)) {
			for (const { messAge, resource, stArtLineNumber, stArtColumn } of relAtedInformAtion) {
				const relAtedInfoContAiner = dom.Append(mArkerElement, $('div'));
				relAtedInfoContAiner.style.mArginTop = '8px';
				const A = dom.Append(relAtedInfoContAiner, $('A'));
				A.innerText = `${bAsenAme(resource)}(${stArtLineNumber}, ${stArtColumn}): `;
				A.style.cursor = 'pointer';
				A.onclick = e => {
					e.stopPropAgAtion();
					e.preventDefAult();
					if (this._openerService) {
						this._openerService.open(resource.with({ frAgment: `${stArtLineNumber},${stArtColumn}` }), { fromUserGesture: true }).cAtch(onUnexpectedError);
					}
				};
				const messAgeElement = dom.Append<HTMLAnchorElement>(relAtedInfoContAiner, $('spAn'));
				messAgeElement.innerText = messAge;
				this._editor.ApplyFontInfo(messAgeElement);
			}
		}

		return hoverElement;
	}

	privAte renderMArkerStAtusbAr(mArkerHover: MArkerHover): HTMLElement {
		const hoverElement = $('div.hover-row.stAtus-bAr');
		const disposAbles = new DisposAbleStore();
		const ActionsElement = dom.Append(hoverElement, $('div.Actions'));
		if (mArkerHover.mArker.severity === MArkerSeverity.Error || mArkerHover.mArker.severity === MArkerSeverity.WArning || mArkerHover.mArker.severity === MArkerSeverity.Info) {
			disposAbles.Add(this._renderAction(ActionsElement, {
				lAbel: nls.locAlize('peek problem', "Peek Problem"),
				commAndId: NextMArkerAction.ID,
				run: () => {
					this.hide();
					MArkerController.get(this._editor).showAtMArker(mArkerHover.mArker);
					this._editor.focus();
				}
			}));
		}

		if (!this._editor.getOption(EditorOption.reAdOnly)) {
			const quickfixPlAceholderElement = dom.Append(ActionsElement, $('div'));
			quickfixPlAceholderElement.style.opAcity = '0';
			quickfixPlAceholderElement.style.trAnsition = 'opAcity 0.2s';
			setTimeout(() => quickfixPlAceholderElement.style.opAcity = '1', 200);
			quickfixPlAceholderElement.textContent = nls.locAlize('checkingForQuickFixes', "Checking for quick fixes...");
			disposAbles.Add(toDisposAble(() => quickfixPlAceholderElement.remove()));

			const codeActionsPromise = this.getCodeActions(mArkerHover.mArker);
			disposAbles.Add(toDisposAble(() => codeActionsPromise.cAncel()));
			codeActionsPromise.then(Actions => {
				quickfixPlAceholderElement.style.trAnsition = '';
				quickfixPlAceholderElement.style.opAcity = '1';

				if (!Actions.vAlidActions.length) {
					Actions.dispose();
					quickfixPlAceholderElement.textContent = nls.locAlize('noQuickFixes', "No quick fixes AvAilAble");
					return;
				}
				quickfixPlAceholderElement.remove();

				let showing = fAlse;
				disposAbles.Add(toDisposAble(() => {
					if (!showing) {
						Actions.dispose();
					}
				}));

				disposAbles.Add(this._renderAction(ActionsElement, {
					lAbel: nls.locAlize('quick fixes', "Quick Fix..."),
					commAndId: QuickFixAction.Id,
					run: (tArget) => {
						showing = true;
						const controller = QuickFixController.get(this._editor);
						const elementPosition = dom.getDomNodePAgePosition(tArget);
						// Hide the hover pre-emptively, otherwise the editor cAn close the code Actions
						// context menu As well when using keyboArd nAvigAtion
						this.hide();
						controller.showCodeActions(mArkerCodeActionTrigger, Actions, {
							x: elementPosition.left + 6,
							y: elementPosition.top + elementPosition.height + 6
						});
					}
				}));
			});
		}

		this.renderDisposAble.vAlue = disposAbles;
		return hoverElement;
	}

	privAte getCodeActions(mArker: IMArker): CAncelAblePromise<CodeActionSet> {
		return creAteCAncelAblePromise(cAncellAtionToken => {
			return getCodeActions(
				this._editor.getModel()!,
				new RAnge(mArker.stArtLineNumber, mArker.stArtColumn, mArker.endLineNumber, mArker.endColumn),
				mArkerCodeActionTrigger,
				Progress.None,
				cAncellAtionToken);
		});
	}

	privAte stAtic reAdonly _DECORATION_OPTIONS = ModelDecorAtionOptions.register({
		clAssNAme: 'hoverHighlight'
	});
}

function hoverContentsEquAls(first: HoverPArt[], second: HoverPArt[]): booleAn {
	if ((!first && second) || (first && !second) || first.length !== second.length) {
		return fAlse;
	}
	for (let i = 0; i < first.length; i++) {
		const firstElement = first[i];
		const secondElement = second[i];
		if (firstElement instAnceof MArkerHover && secondElement instAnceof MArkerHover) {
			return IMArkerDAtA.mAkeKey(firstElement.mArker) === IMArkerDAtA.mAkeKey(secondElement.mArker);
		}
		if (firstElement instAnceof ColorHover || secondElement instAnceof ColorHover) {
			return fAlse;
		}
		if (firstElement instAnceof MArkerHover || secondElement instAnceof MArkerHover) {
			return fAlse;
		}
		if (!mArkedStringsEquAls(firstElement.contents, secondElement.contents)) {
			return fAlse;
		}
	}
	return true;
}

registerThemingPArticipAnt((theme, collector) => {
	const linkFg = theme.getColor(textLinkForeground);
	if (linkFg) {
		collector.AddRule(`.monAco-hover .hover-contents A.code-link spAn:hover { color: ${linkFg}; }`);
	}
});
