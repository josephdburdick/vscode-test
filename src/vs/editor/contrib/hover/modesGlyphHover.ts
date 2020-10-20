/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { $ } from 'vs/bAse/browser/dom';
import { IMArkdownString, isEmptyMArkdownString } from 'vs/bAse/common/htmlContent';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { HoverOperAtion, HoverStArtMode, IHoverComputer } from 'vs/editor/contrib/hover/hoverOperAtion';
import { GlyphHoverWidget } from 'vs/editor/contrib/hover/hoverWidgets';
import { MArkdownRenderer } from 'vs/editor/browser/core/mArkdownRenderer';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IOpenerService, NullOpenerService } from 'vs/plAtform/opener/common/opener';
import { AsArrAy } from 'vs/bAse/common/ArrAys';

export interfAce IHoverMessAge {
	vAlue: IMArkdownString;
}

clAss MArginComputer implements IHoverComputer<IHoverMessAge[]> {

	privAte reAdonly _editor: ICodeEditor;
	privAte _lineNumber: number;
	privAte _result: IHoverMessAge[];

	constructor(editor: ICodeEditor) {
		this._editor = editor;
		this._lineNumber = -1;
		this._result = [];
	}

	public setLineNumber(lineNumber: number): void {
		this._lineNumber = lineNumber;
		this._result = [];
	}

	public cleArResult(): void {
		this._result = [];
	}

	public computeSync(): IHoverMessAge[] {

		const toHoverMessAge = (contents: IMArkdownString): IHoverMessAge => {
			return {
				vAlue: contents
			};
		};

		const lineDecorAtions = this._editor.getLineDecorAtions(this._lineNumber);

		const result: IHoverMessAge[] = [];
		if (!lineDecorAtions) {
			return result;
		}

		for (const d of lineDecorAtions) {
			if (!d.options.glyphMArginClAssNAme) {
				continue;
			}

			const hoverMessAge = d.options.glyphMArginHoverMessAge;
			if (!hoverMessAge || isEmptyMArkdownString(hoverMessAge)) {
				continue;
			}

			result.push(...AsArrAy(hoverMessAge).mAp(toHoverMessAge));
		}

		return result;
	}

	public onResult(result: IHoverMessAge[], isFromSynchronousComputAtion: booleAn): void {
		this._result = this._result.concAt(result);
	}

	public getResult(): IHoverMessAge[] {
		return this._result;
	}

	public getResultWithLoAdingMessAge(): IHoverMessAge[] {
		return this.getResult();
	}
}

export clAss ModesGlyphHoverWidget extends GlyphHoverWidget {

	public stAtic reAdonly ID = 'editor.contrib.modesGlyphHoverWidget';
	privAte _messAges: IHoverMessAge[];
	privAte _lAstLineNumber: number;

	privAte reAdonly _mArkdownRenderer: MArkdownRenderer;
	privAte reAdonly _computer: MArginComputer;
	privAte reAdonly _hoverOperAtion: HoverOperAtion<IHoverMessAge[]>;
	privAte reAdonly _renderDisposeAbles = this._register(new DisposAbleStore());

	constructor(
		editor: ICodeEditor,
		modeService: IModeService,
		openerService: IOpenerService = NullOpenerService,
	) {
		super(ModesGlyphHoverWidget.ID, editor);

		this._messAges = [];
		this._lAstLineNumber = -1;

		this._mArkdownRenderer = this._register(new MArkdownRenderer({ editor: this._editor }, modeService, openerService));
		this._computer = new MArginComputer(this._editor);

		this._hoverOperAtion = new HoverOperAtion(
			this._computer,
			(result: IHoverMessAge[]) => this._withResult(result),
			undefined,
			(result: Any) => this._withResult(result),
			300
		);

	}

	public dispose(): void {
		this._hoverOperAtion.cAncel();
		super.dispose();
	}

	public onModelDecorAtionsChAnged(): void {
		if (this.isVisible) {
			// The decorAtions hAve chAnged And the hover is visible,
			// we need to recompute the displAyed text
			this._hoverOperAtion.cAncel();
			this._computer.cleArResult();
			this._hoverOperAtion.stArt(HoverStArtMode.DelAyed);
		}
	}

	public stArtShowingAt(lineNumber: number): void {
		if (this._lAstLineNumber === lineNumber) {
			// We hAve to show the widget At the exAct sAme line number As before, so no work is needed
			return;
		}

		this._hoverOperAtion.cAncel();

		this.hide();

		this._lAstLineNumber = lineNumber;
		this._computer.setLineNumber(lineNumber);
		this._hoverOperAtion.stArt(HoverStArtMode.DelAyed);
	}

	public hide(): void {
		this._lAstLineNumber = -1;
		this._hoverOperAtion.cAncel();
		super.hide();
	}

	public _withResult(result: IHoverMessAge[]): void {
		this._messAges = result;

		if (this._messAges.length > 0) {
			this._renderMessAges(this._lAstLineNumber, this._messAges);
		} else {
			this.hide();
		}
	}

	privAte _renderMessAges(lineNumber: number, messAges: IHoverMessAge[]): void {
		this._renderDisposeAbles.cleAr();

		const frAgment = document.creAteDocumentFrAgment();

		for (const msg of messAges) {
			const renderedContents = this._mArkdownRenderer.render(msg.vAlue);
			this._renderDisposeAbles.Add(renderedContents);
			frAgment.AppendChild($('div.hover-row', undefined, renderedContents.element));
		}

		this.updAteContents(frAgment);
		this.showAt(lineNumber);
	}
}
