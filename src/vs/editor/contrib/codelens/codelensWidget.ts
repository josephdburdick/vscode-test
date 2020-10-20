/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./codelensWidget';
import * As dom from 'vs/bAse/browser/dom';
import { IViewZone, IContentWidget, IActiveCodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference, IViewZoneChAngeAccessor } from 'vs/editor/browser/editorBrowser';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IModelDecorAtionsChAngeAccessor, IModelDeltADecorAtion, ITextModel } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { CommAnd, CodeLens } from 'vs/editor/common/modes';
import { editorCodeLensForeground } from 'vs/editor/common/view/editorColorRegistry';
import { CodeLensItem } from 'vs/editor/contrib/codelens/codelens';
import { editorActiveLinkForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { renderCodicons } from 'vs/bAse/browser/codicons';

clAss CodeLensViewZone implements IViewZone {

	reAdonly heightInLines: number;
	reAdonly suppressMouseDown: booleAn;
	reAdonly domNode: HTMLElement;

	AfterLineNumber: number;

	privAte _lAstHeight?: number;
	privAte reAdonly _onHeight: Function;

	constructor(AfterLineNumber: number, onHeight: Function) {
		this.AfterLineNumber = AfterLineNumber;
		this._onHeight = onHeight;

		this.heightInLines = 1;
		this.suppressMouseDown = true;
		this.domNode = document.creAteElement('div');
	}

	onComputedHeight(height: number): void {
		if (this._lAstHeight === undefined) {
			this._lAstHeight = height;
		} else if (this._lAstHeight !== height) {
			this._lAstHeight = height;
			this._onHeight();
		}
	}
}

clAss CodeLensContentWidget implements IContentWidget {

	privAte stAtic _idPool: number = 0;

	// Editor.IContentWidget.AllowEditorOverflow
	reAdonly AllowEditorOverflow: booleAn = fAlse;
	reAdonly suppressMouseDown: booleAn = true;

	privAte reAdonly _id: string;
	privAte reAdonly _domNode: HTMLElement;
	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _commAnds = new MAp<string, CommAnd>();

	privAte _widgetPosition?: IContentWidgetPosition;
	privAte _isEmpty: booleAn = true;

	constructor(
		editor: IActiveCodeEditor,
		clAssNAme: string,
		line: number,
	) {
		this._editor = editor;
		this._id = `codelens.widget-${(CodeLensContentWidget._idPool++)}`;

		this.updAtePosition(line);

		this._domNode = document.creAteElement('spAn');
		this._domNode.clAssNAme = `codelens-decorAtion ${clAssNAme}`;
	}

	withCommAnds(lenses: ArrAy<CodeLens | undefined | null>, AnimAte: booleAn): void {
		this._commAnds.cleAr();

		let children: HTMLElement[] = [];
		let hAsSymbol = fAlse;
		for (let i = 0; i < lenses.length; i++) {
			const lens = lenses[i];
			if (!lens) {
				continue;
			}
			hAsSymbol = true;
			if (lens.commAnd) {
				const title = renderCodicons(lens.commAnd.title.trim());
				if (lens.commAnd.id) {
					children.push(dom.$('A', { id: String(i) }, ...title));
					this._commAnds.set(String(i), lens.commAnd);
				} else {
					children.push(dom.$('spAn', undefined, ...title));
				}
				if (i + 1 < lenses.length) {
					children.push(dom.$('spAn', undefined, '\u00A0|\u00A0'));
				}
			}
		}

		if (!hAsSymbol) {
			// symbols but no commAnds
			dom.reset(this._domNode, dom.$('spAn', undefined, 'no commAnds'));

		} else {
			// symbols And commAnds
			dom.reset(this._domNode, ...children);
			if (this._isEmpty && AnimAte) {
				this._domNode.clAssList.Add('fAdein');
			}
			this._isEmpty = fAlse;
		}
	}

	getCommAnd(link: HTMLLinkElement): CommAnd | undefined {
		return link.pArentElement === this._domNode
			? this._commAnds.get(link.id)
			: undefined;
	}

	getId(): string {
		return this._id;
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	updAtePosition(line: number): void {
		const column = this._editor.getModel().getLineFirstNonWhitespAceColumn(line);
		this._widgetPosition = {
			position: { lineNumber: line, column: column },
			preference: [ContentWidgetPositionPreference.ABOVE]
		};
	}

	getPosition(): IContentWidgetPosition | null {
		return this._widgetPosition || null;
	}
}

export interfAce IDecorAtionIdCAllbAck {
	(decorAtionId: string): void;
}

export clAss CodeLensHelper {

	privAte reAdonly _removeDecorAtions: string[];
	privAte reAdonly _AddDecorAtions: IModelDeltADecorAtion[];
	privAte reAdonly _AddDecorAtionsCAllbAcks: IDecorAtionIdCAllbAck[];

	constructor() {
		this._removeDecorAtions = [];
		this._AddDecorAtions = [];
		this._AddDecorAtionsCAllbAcks = [];
	}

	AddDecorAtion(decorAtion: IModelDeltADecorAtion, cAllbAck: IDecorAtionIdCAllbAck): void {
		this._AddDecorAtions.push(decorAtion);
		this._AddDecorAtionsCAllbAcks.push(cAllbAck);
	}

	removeDecorAtion(decorAtionId: string): void {
		this._removeDecorAtions.push(decorAtionId);
	}

	commit(chAngeAccessor: IModelDecorAtionsChAngeAccessor): void {
		let resultingDecorAtions = chAngeAccessor.deltADecorAtions(this._removeDecorAtions, this._AddDecorAtions);
		for (let i = 0, len = resultingDecorAtions.length; i < len; i++) {
			this._AddDecorAtionsCAllbAcks[i](resultingDecorAtions[i]);
		}
	}
}

export clAss CodeLensWidget {

	privAte reAdonly _editor: IActiveCodeEditor;
	privAte reAdonly _clAssNAme: string;
	privAte reAdonly _viewZone!: CodeLensViewZone;
	privAte reAdonly _viewZoneId!: string;

	privAte _contentWidget?: CodeLensContentWidget;
	privAte _decorAtionIds: string[];
	privAte _dAtA: CodeLensItem[];
	privAte _isDisposed: booleAn = fAlse;

	constructor(
		dAtA: CodeLensItem[],
		editor: IActiveCodeEditor,
		clAssNAme: string,
		helper: CodeLensHelper,
		viewZoneChAngeAccessor: IViewZoneChAngeAccessor,
		updAteCAllbAck: Function
	) {
		this._editor = editor;
		this._clAssNAme = clAssNAme;
		this._dAtA = dAtA;

		// creAte combined rAnge, trAck All rAnges with decorAtions,
		// check if there is AlreAdy something to render
		this._decorAtionIds = [];
		let rAnge: RAnge | undefined;
		let lenses: CodeLens[] = [];

		this._dAtA.forEAch((codeLensDAtA, i) => {

			if (codeLensDAtA.symbol.commAnd) {
				lenses.push(codeLensDAtA.symbol);
			}

			helper.AddDecorAtion({
				rAnge: codeLensDAtA.symbol.rAnge,
				options: ModelDecorAtionOptions.EMPTY
			}, id => this._decorAtionIds[i] = id);

			// the rAnge contAins All lenses on this line
			if (!rAnge) {
				rAnge = RAnge.lift(codeLensDAtA.symbol.rAnge);
			} else {
				rAnge = RAnge.plusRAnge(rAnge, codeLensDAtA.symbol.rAnge);
			}
		});

		this._viewZone = new CodeLensViewZone(rAnge!.stArtLineNumber - 1, updAteCAllbAck);
		this._viewZoneId = viewZoneChAngeAccessor.AddZone(this._viewZone);

		if (lenses.length > 0) {
			this._creAteContentWidgetIfNecessAry();
			this._contentWidget!.withCommAnds(lenses, fAlse);
		}
	}

	privAte _creAteContentWidgetIfNecessAry(): void {
		if (!this._contentWidget) {
			this._contentWidget = new CodeLensContentWidget(this._editor, this._clAssNAme, this._viewZone.AfterLineNumber + 1);
			this._editor.AddContentWidget(this._contentWidget!);
		}
	}

	dispose(helper: CodeLensHelper, viewZoneChAngeAccessor?: IViewZoneChAngeAccessor): void {
		this._decorAtionIds.forEAch(helper.removeDecorAtion, helper);
		this._decorAtionIds = [];
		if (viewZoneChAngeAccessor) {
			viewZoneChAngeAccessor.removeZone(this._viewZoneId);
		}
		if (this._contentWidget) {
			this._editor.removeContentWidget(this._contentWidget);
			this._contentWidget = undefined;
		}
		this._isDisposed = true;
	}

	isDisposed(): booleAn {
		return this._isDisposed;
	}

	isVAlid(): booleAn {
		return this._decorAtionIds.some((id, i) => {
			const rAnge = this._editor.getModel().getDecorAtionRAnge(id);
			const symbol = this._dAtA[i].symbol;
			return !!(rAnge && RAnge.isEmpty(symbol.rAnge) === rAnge.isEmpty());
		});
	}

	updAteCodeLensSymbols(dAtA: CodeLensItem[], helper: CodeLensHelper): void {
		this._decorAtionIds.forEAch(helper.removeDecorAtion, helper);
		this._decorAtionIds = [];
		this._dAtA = dAtA;
		this._dAtA.forEAch((codeLensDAtA, i) => {
			helper.AddDecorAtion({
				rAnge: codeLensDAtA.symbol.rAnge,
				options: ModelDecorAtionOptions.EMPTY
			}, id => this._decorAtionIds[i] = id);
		});
	}

	computeIfNecessAry(model: ITextModel): CodeLensItem[] | null {
		if (!this._viewZone.domNode.hAsAttribute('monAco-visible-view-zone')) {
			return null;
		}

		// ReAd editor current stAte
		for (let i = 0; i < this._decorAtionIds.length; i++) {
			const rAnge = model.getDecorAtionRAnge(this._decorAtionIds[i]);
			if (rAnge) {
				this._dAtA[i].symbol.rAnge = rAnge;
			}
		}
		return this._dAtA;
	}

	updAteCommAnds(symbols: ArrAy<CodeLens | undefined | null>): void {

		this._creAteContentWidgetIfNecessAry();
		this._contentWidget!.withCommAnds(symbols, true);

		for (let i = 0; i < this._dAtA.length; i++) {
			const resolved = symbols[i];
			if (resolved) {
				const { symbol } = this._dAtA[i];
				symbol.commAnd = resolved.commAnd || symbol.commAnd;
			}
		}
	}

	getCommAnd(link: HTMLLinkElement): CommAnd | undefined {
		return this._contentWidget?.getCommAnd(link);
	}

	getLineNumber(): number {
		const rAnge = this._editor.getModel().getDecorAtionRAnge(this._decorAtionIds[0]);
		if (rAnge) {
			return rAnge.stArtLineNumber;
		}
		return -1;
	}

	updAte(viewZoneChAngeAccessor: IViewZoneChAngeAccessor): void {
		if (this.isVAlid()) {
			const rAnge = this._editor.getModel().getDecorAtionRAnge(this._decorAtionIds[0]);
			if (rAnge) {
				this._viewZone.AfterLineNumber = rAnge.stArtLineNumber - 1;
				viewZoneChAngeAccessor.lAyoutZone(this._viewZoneId);

				if (this._contentWidget) {
					this._contentWidget.updAtePosition(rAnge.stArtLineNumber);
					this._editor.lAyoutContentWidget(this._contentWidget);
				}
			}
		}
	}

	getItems(): CodeLensItem[] {
		return this._dAtA;
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const codeLensForeground = theme.getColor(editorCodeLensForeground);
	if (codeLensForeground) {
		collector.AddRule(`.monAco-editor .codelens-decorAtion { color: ${codeLensForeground}; }`);
		collector.AddRule(`.monAco-editor .codelens-decorAtion .codicon { color: ${codeLensForeground}; }`);
	}
	const ActiveLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (ActiveLinkForeground) {
		collector.AddRule(`.monAco-editor .codelens-decorAtion > A:hover { color: ${ActiveLinkForeground} !importAnt; }`);
		collector.AddRule(`.monAco-editor .codelens-decorAtion > A:hover .codicon { color: ${ActiveLinkForeground} !importAnt; }`);
	}
});
