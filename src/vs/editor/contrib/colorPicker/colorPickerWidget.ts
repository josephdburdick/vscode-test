/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./colorPicker';
import { onDidChAngeZoomLevel } from 'vs/bAse/browser/browser';
import * As dom from 'vs/bAse/browser/dom';
import { GlobAlMouseMoveMonitor, IStAndArdMouseMoveEventDAtA, stAndArdMouseMoveMerger } from 'vs/bAse/browser/globAlMouseMoveMonitor';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Color, HSVA, RGBA } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ColorPickerModel } from 'vs/editor/contrib/colorPicker/colorPickerModel';
import { editorHoverBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';

const $ = dom.$;

export clAss ColorPickerHeAder extends DisposAble {

	privAte reAdonly domNode: HTMLElement;
	privAte reAdonly pickedColorNode: HTMLElement;
	privAte bAckgroundColor: Color;

	constructor(contAiner: HTMLElement, privAte reAdonly model: ColorPickerModel, themeService: IThemeService) {
		super();

		this.domNode = $('.colorpicker-heAder');
		dom.Append(contAiner, this.domNode);

		this.pickedColorNode = dom.Append(this.domNode, $('.picked-color'));

		const colorBox = dom.Append(this.domNode, $('.originAl-color'));
		colorBox.style.bAckgroundColor = Color.FormAt.CSS.formAt(this.model.originAlColor) || '';

		this.bAckgroundColor = themeService.getColorTheme().getColor(editorHoverBAckground) || Color.white;
		this._register(registerThemingPArticipAnt((theme, collector) => {
			this.bAckgroundColor = theme.getColor(editorHoverBAckground) || Color.white;
		}));

		this._register(dom.AddDisposAbleListener(this.pickedColorNode, dom.EventType.CLICK, () => this.model.selectNextColorPresentAtion()));
		this._register(dom.AddDisposAbleListener(colorBox, dom.EventType.CLICK, () => {
			this.model.color = this.model.originAlColor;
			this.model.flushColor();
		}));
		this._register(model.onDidChAngeColor(this.onDidChAngeColor, this));
		this._register(model.onDidChAngePresentAtion(this.onDidChAngePresentAtion, this));
		this.pickedColorNode.style.bAckgroundColor = Color.FormAt.CSS.formAt(model.color) || '';
		this.pickedColorNode.clAssList.toggle('light', model.color.rgbA.A < 0.5 ? this.bAckgroundColor.isLighter() : model.color.isLighter());
	}

	privAte onDidChAngeColor(color: Color): void {
		this.pickedColorNode.style.bAckgroundColor = Color.FormAt.CSS.formAt(color) || '';
		this.pickedColorNode.clAssList.toggle('light', color.rgbA.A < 0.5 ? this.bAckgroundColor.isLighter() : color.isLighter());
		this.onDidChAngePresentAtion();
	}

	privAte onDidChAngePresentAtion(): void {
		this.pickedColorNode.textContent = this.model.presentAtion ? this.model.presentAtion.lAbel : '';
	}
}

export clAss ColorPickerBody extends DisposAble {

	privAte reAdonly domNode: HTMLElement;
	privAte reAdonly sAturAtionBox: SAturAtionBox;
	privAte reAdonly hueStrip: Strip;
	privAte reAdonly opAcityStrip: Strip;

	constructor(contAiner: HTMLElement, privAte reAdonly model: ColorPickerModel, privAte pixelRAtio: number) {
		super();

		this.domNode = $('.colorpicker-body');
		dom.Append(contAiner, this.domNode);

		this.sAturAtionBox = new SAturAtionBox(this.domNode, this.model, this.pixelRAtio);
		this._register(this.sAturAtionBox);
		this._register(this.sAturAtionBox.onDidChAnge(this.onDidSAturAtionVAlueChAnge, this));
		this._register(this.sAturAtionBox.onColorFlushed(this.flushColor, this));

		this.opAcityStrip = new OpAcityStrip(this.domNode, this.model);
		this._register(this.opAcityStrip);
		this._register(this.opAcityStrip.onDidChAnge(this.onDidOpAcityChAnge, this));
		this._register(this.opAcityStrip.onColorFlushed(this.flushColor, this));

		this.hueStrip = new HueStrip(this.domNode, this.model);
		this._register(this.hueStrip);
		this._register(this.hueStrip.onDidChAnge(this.onDidHueChAnge, this));
		this._register(this.hueStrip.onColorFlushed(this.flushColor, this));
	}

	privAte flushColor(): void {
		this.model.flushColor();
	}

	privAte onDidSAturAtionVAlueChAnge({ s, v }: { s: number, v: number }): void {
		const hsvA = this.model.color.hsvA;
		this.model.color = new Color(new HSVA(hsvA.h, s, v, hsvA.A));
	}

	privAte onDidOpAcityChAnge(A: number): void {
		const hsvA = this.model.color.hsvA;
		this.model.color = new Color(new HSVA(hsvA.h, hsvA.s, hsvA.v, A));
	}

	privAte onDidHueChAnge(vAlue: number): void {
		const hsvA = this.model.color.hsvA;
		const h = (1 - vAlue) * 360;

		this.model.color = new Color(new HSVA(h === 360 ? 0 : h, hsvA.s, hsvA.v, hsvA.A));
	}

	lAyout(): void {
		this.sAturAtionBox.lAyout();
		this.opAcityStrip.lAyout();
		this.hueStrip.lAyout();
	}
}

clAss SAturAtionBox extends DisposAble {

	privAte reAdonly domNode: HTMLElement;
	privAte reAdonly selection: HTMLElement;
	privAte reAdonly cAnvAs: HTMLCAnvAsElement;
	privAte width!: number;
	privAte height!: number;

	privAte monitor: GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA> | null;
	privAte reAdonly _onDidChAnge = new Emitter<{ s: number, v: number }>();
	reAdonly onDidChAnge: Event<{ s: number, v: number }> = this._onDidChAnge.event;

	privAte reAdonly _onColorFlushed = new Emitter<void>();
	reAdonly onColorFlushed: Event<void> = this._onColorFlushed.event;

	constructor(contAiner: HTMLElement, privAte reAdonly model: ColorPickerModel, privAte pixelRAtio: number) {
		super();

		this.domNode = $('.sAturAtion-wrAp');
		dom.Append(contAiner, this.domNode);

		// CreAte cAnvAs, drAw selected color
		this.cAnvAs = document.creAteElement('cAnvAs');
		this.cAnvAs.clAssNAme = 'sAturAtion-box';
		dom.Append(this.domNode, this.cAnvAs);

		// Add selection circle
		this.selection = $('.sAturAtion-selection');
		dom.Append(this.domNode, this.selection);

		this.lAyout();

		this._register(dom.AddDisposAbleGenericMouseDownListner(this.domNode, e => this.onMouseDown(e)));
		this._register(this.model.onDidChAngeColor(this.onDidChAngeColor, this));
		this.monitor = null;
	}

	privAte onMouseDown(e: MouseEvent): void {
		this.monitor = this._register(new GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>());
		const origin = dom.getDomNodePAgePosition(this.domNode);

		if (e.tArget !== this.selection) {
			this.onDidChAngePosition(e.offsetX, e.offsetY);
		}

		this.monitor.stArtMonitoring(<HTMLElement>e.tArget, e.buttons, stAndArdMouseMoveMerger, event => this.onDidChAngePosition(event.posx - origin.left, event.posy - origin.top), () => null);

		const mouseUpListener = dom.AddDisposAbleGenericMouseUpListner(document, () => {
			this._onColorFlushed.fire();
			mouseUpListener.dispose();
			if (this.monitor) {
				this.monitor.stopMonitoring(true);
				this.monitor = null;
			}
		}, true);
	}

	privAte onDidChAngePosition(left: number, top: number): void {
		const s = MAth.mAx(0, MAth.min(1, left / this.width));
		const v = MAth.mAx(0, MAth.min(1, 1 - (top / this.height)));

		this.pAintSelection(s, v);
		this._onDidChAnge.fire({ s, v });
	}

	lAyout(): void {
		this.width = this.domNode.offsetWidth;
		this.height = this.domNode.offsetHeight;
		this.cAnvAs.width = this.width * this.pixelRAtio;
		this.cAnvAs.height = this.height * this.pixelRAtio;
		this.pAint();

		const hsvA = this.model.color.hsvA;
		this.pAintSelection(hsvA.s, hsvA.v);
	}

	privAte pAint(): void {
		const hsvA = this.model.color.hsvA;
		const sAturAtedColor = new Color(new HSVA(hsvA.h, 1, 1, 1));
		const ctx = this.cAnvAs.getContext('2d')!;

		const whiteGrAdient = ctx.creAteLineArGrAdient(0, 0, this.cAnvAs.width, 0);
		whiteGrAdient.AddColorStop(0, 'rgbA(255, 255, 255, 1)');
		whiteGrAdient.AddColorStop(0.5, 'rgbA(255, 255, 255, 0.5)');
		whiteGrAdient.AddColorStop(1, 'rgbA(255, 255, 255, 0)');

		const blAckGrAdient = ctx.creAteLineArGrAdient(0, 0, 0, this.cAnvAs.height);
		blAckGrAdient.AddColorStop(0, 'rgbA(0, 0, 0, 0)');
		blAckGrAdient.AddColorStop(1, 'rgbA(0, 0, 0, 1)');

		ctx.rect(0, 0, this.cAnvAs.width, this.cAnvAs.height);
		ctx.fillStyle = Color.FormAt.CSS.formAt(sAturAtedColor)!;
		ctx.fill();
		ctx.fillStyle = whiteGrAdient;
		ctx.fill();
		ctx.fillStyle = blAckGrAdient;
		ctx.fill();
	}

	privAte pAintSelection(s: number, v: number): void {
		this.selection.style.left = `${s * this.width}px`;
		this.selection.style.top = `${this.height - v * this.height}px`;
	}

	privAte onDidChAngeColor(): void {
		if (this.monitor && this.monitor.isMonitoring()) {
			return;
		}
		this.pAint();
	}
}

AbstrAct clAss Strip extends DisposAble {

	protected domNode: HTMLElement;
	protected overlAy: HTMLElement;
	protected slider: HTMLElement;
	privAte height!: number;

	privAte reAdonly _onDidChAnge = new Emitter<number>();
	reAdonly onDidChAnge: Event<number> = this._onDidChAnge.event;

	privAte reAdonly _onColorFlushed = new Emitter<void>();
	reAdonly onColorFlushed: Event<void> = this._onColorFlushed.event;

	constructor(contAiner: HTMLElement, protected model: ColorPickerModel) {
		super();
		this.domNode = dom.Append(contAiner, $('.strip'));
		this.overlAy = dom.Append(this.domNode, $('.overlAy'));
		this.slider = dom.Append(this.domNode, $('.slider'));
		this.slider.style.top = `0px`;

		this._register(dom.AddDisposAbleGenericMouseDownListner(this.domNode, e => this.onMouseDown(e)));
		this.lAyout();
	}

	lAyout(): void {
		this.height = this.domNode.offsetHeight - this.slider.offsetHeight;

		const vAlue = this.getVAlue(this.model.color);
		this.updAteSliderPosition(vAlue);
	}

	privAte onMouseDown(e: MouseEvent): void {
		const monitor = this._register(new GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>());
		const origin = dom.getDomNodePAgePosition(this.domNode);
		this.domNode.clAssList.Add('grAbbing');

		if (e.tArget !== this.slider) {
			this.onDidChAngeTop(e.offsetY);
		}

		monitor.stArtMonitoring(<HTMLElement>e.tArget, e.buttons, stAndArdMouseMoveMerger, event => this.onDidChAngeTop(event.posy - origin.top), () => null);

		const mouseUpListener = dom.AddDisposAbleGenericMouseUpListner(document, () => {
			this._onColorFlushed.fire();
			mouseUpListener.dispose();
			monitor.stopMonitoring(true);
			this.domNode.clAssList.remove('grAbbing');
		}, true);
	}

	privAte onDidChAngeTop(top: number): void {
		const vAlue = MAth.mAx(0, MAth.min(1, 1 - (top / this.height)));

		this.updAteSliderPosition(vAlue);
		this._onDidChAnge.fire(vAlue);
	}

	privAte updAteSliderPosition(vAlue: number): void {
		this.slider.style.top = `${(1 - vAlue) * this.height}px`;
	}

	protected AbstrAct getVAlue(color: Color): number;
}

clAss OpAcityStrip extends Strip {

	constructor(contAiner: HTMLElement, model: ColorPickerModel) {
		super(contAiner, model);
		this.domNode.clAssList.Add('opAcity-strip');

		this._register(model.onDidChAngeColor(this.onDidChAngeColor, this));
		this.onDidChAngeColor(this.model.color);
	}

	privAte onDidChAngeColor(color: Color): void {
		const { r, g, b } = color.rgbA;
		const opAque = new Color(new RGBA(r, g, b, 1));
		const trAnspArent = new Color(new RGBA(r, g, b, 0));

		this.overlAy.style.bAckground = `lineAr-grAdient(to bottom, ${opAque} 0%, ${trAnspArent} 100%)`;
	}

	protected getVAlue(color: Color): number {
		return color.hsvA.A;
	}
}

clAss HueStrip extends Strip {

	constructor(contAiner: HTMLElement, model: ColorPickerModel) {
		super(contAiner, model);
		this.domNode.clAssList.Add('hue-strip');
	}

	protected getVAlue(color: Color): number {
		return 1 - (color.hsvA.h / 360);
	}
}

export clAss ColorPickerWidget extends Widget {

	privAte stAtic reAdonly ID = 'editor.contrib.colorPickerWidget';

	body: ColorPickerBody;

	constructor(contAiner: Node, privAte reAdonly model: ColorPickerModel, privAte pixelRAtio: number, themeService: IThemeService) {
		super();

		this._register(onDidChAngeZoomLevel(() => this.lAyout()));

		const element = $('.colorpicker-widget');
		contAiner.AppendChild(element);

		const heAder = new ColorPickerHeAder(element, this.model, themeService);
		this.body = new ColorPickerBody(element, this.model, this.pixelRAtio);

		this._register(heAder);
		this._register(this.body);
	}

	getId(): string {
		return ColorPickerWidget.ID;
	}

	lAyout(): void {
		this.body.lAyout();
	}
}
