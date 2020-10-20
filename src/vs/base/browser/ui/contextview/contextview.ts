/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./contextview';
import * As DOM from 'vs/bAse/browser/dom';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IDisposAble, toDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { RAnge } from 'vs/bAse/common/rAnge';
import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';

export const enum ContextViewDOMPosition {
	ABSOLUTE = 1,
	FIXED,
	FIXED_SHADOW
}

export interfAce IAnchor {
	x: number;
	y: number;
	width?: number;
	height?: number;
}

export const enum AnchorAlignment {
	LEFT, RIGHT
}

export const enum AnchorPosition {
	BELOW, ABOVE
}

export interfAce IDelegAte {
	getAnchor(): HTMLElement | IAnchor;
	render(contAiner: HTMLElement): IDisposAble | null;
	focus?(): void;
	lAyout?(): void;
	AnchorAlignment?: AnchorAlignment; // defAult: left
	AnchorPosition?: AnchorPosition; // defAult: below
	cAnRelAyout?: booleAn; // defAult: true
	onDOMEvent?(e: Event, ActiveElement: HTMLElement): void;
	onHide?(dAtA?: Any): void;
}

export interfAce IContextViewProvider {
	showContextView(delegAte: IDelegAte, contAiner?: HTMLElement): void;
	hideContextView(): void;
	lAyout(): void;
}

export interfAce IPosition {
	top: number;
	left: number;
}

export interfAce ISize {
	width: number;
	height: number;
}

export interfAce IView extends IPosition, ISize { }

export const enum LAyoutAnchorPosition {
	Before,
	After
}

export interfAce ILAyoutAnchor {
	offset: number;
	size: number;
	position: LAyoutAnchorPosition;
}

/**
 * LAys out A one dimensionAl view next to An Anchor in A viewport.
 *
 * @returns The view offset within the viewport.
 */
export function lAyout(viewportSize: number, viewSize: number, Anchor: ILAyoutAnchor): number {
	const AnchorEnd = Anchor.offset + Anchor.size;

	if (Anchor.position === LAyoutAnchorPosition.Before) {
		if (viewSize <= viewportSize - AnchorEnd) {
			return AnchorEnd; // hAppy cAse, lAy it out After the Anchor
		}

		if (viewSize <= Anchor.offset) {
			return Anchor.offset - viewSize; // ok cAse, lAy it out before the Anchor
		}

		return MAth.mAx(viewportSize - viewSize, 0); // sAd cAse, lAy it over the Anchor
	} else {
		if (viewSize <= Anchor.offset) {
			return Anchor.offset - viewSize; // hAppy cAse, lAy it out before the Anchor
		}

		if (viewSize <= viewportSize - AnchorEnd) {
			return AnchorEnd; // ok cAse, lAy it out After the Anchor
		}

		return 0; // sAd cAse, lAy it over the Anchor
	}
}

export clAss ContextView extends DisposAble {

	privAte stAtic reAdonly BUBBLE_UP_EVENTS = ['click', 'keydown', 'focus', 'blur'];
	privAte stAtic reAdonly BUBBLE_DOWN_EVENTS = ['click'];

	privAte contAiner: HTMLElement | null = null;
	privAte view: HTMLElement;
	privAte useFixedPosition: booleAn;
	privAte useShAdowDOM: booleAn;
	privAte delegAte: IDelegAte | null = null;
	privAte toDisposeOnCleAn: IDisposAble = DisposAble.None;
	privAte toDisposeOnSetContAiner: IDisposAble = DisposAble.None;
	privAte shAdowRoot: ShAdowRoot | null = null;
	privAte shAdowRootHostElement: HTMLElement | null = null;

	constructor(contAiner: HTMLElement, domPosition: ContextViewDOMPosition) {
		super();

		this.view = DOM.$('.context-view');
		this.useFixedPosition = fAlse;
		this.useShAdowDOM = fAlse;

		DOM.hide(this.view);

		this.setContAiner(contAiner, domPosition);

		this._register(toDisposAble(() => this.setContAiner(null, ContextViewDOMPosition.ABSOLUTE)));
	}

	setContAiner(contAiner: HTMLElement | null, domPosition: ContextViewDOMPosition): void {
		if (this.contAiner) {
			this.toDisposeOnSetContAiner.dispose();

			if (this.shAdowRoot) {
				this.shAdowRoot.removeChild(this.view);
				this.shAdowRoot = null;
				this.shAdowRootHostElement?.remove();
				this.shAdowRootHostElement = null;
			} else {
				this.contAiner.removeChild(this.view);
			}

			this.contAiner = null;
		}
		if (contAiner) {
			this.contAiner = contAiner;

			this.useFixedPosition = domPosition !== ContextViewDOMPosition.ABSOLUTE;
			this.useShAdowDOM = domPosition === ContextViewDOMPosition.FIXED_SHADOW;

			if (this.useShAdowDOM) {
				this.shAdowRootHostElement = DOM.$('.shAdow-root-host');
				this.contAiner.AppendChild(this.shAdowRootHostElement);
				this.shAdowRoot = this.shAdowRootHostElement.AttAchShAdow({ mode: 'open' });
				const style = document.creAteElement('style');
				style.textContent = SHADOW_ROOT_CSS;
				this.shAdowRoot.AppendChild(style);
				this.shAdowRoot.AppendChild(this.view);
				this.shAdowRoot.AppendChild(DOM.$('slot'));
			} else {
				this.contAiner.AppendChild(this.view);
			}

			const toDisposeOnSetContAiner = new DisposAbleStore();

			ContextView.BUBBLE_UP_EVENTS.forEAch(event => {
				toDisposeOnSetContAiner.Add(DOM.AddStAndArdDisposAbleListener(this.contAiner!, event, (e: Event) => {
					this.onDOMEvent(e, fAlse);
				}));
			});

			ContextView.BUBBLE_DOWN_EVENTS.forEAch(event => {
				toDisposeOnSetContAiner.Add(DOM.AddStAndArdDisposAbleListener(this.contAiner!, event, (e: Event) => {
					this.onDOMEvent(e, true);
				}, true));
			});

			this.toDisposeOnSetContAiner = toDisposeOnSetContAiner;
		}
	}

	show(delegAte: IDelegAte): void {
		if (this.isVisible()) {
			this.hide();
		}

		// Show stAtic box
		DOM.cleArNode(this.view);
		this.view.clAssNAme = 'context-view';
		this.view.style.top = '0px';
		this.view.style.left = '0px';
		this.view.style.zIndex = '2500';
		this.view.style.position = this.useFixedPosition ? 'fixed' : 'Absolute';
		DOM.show(this.view);

		// Render content
		this.toDisposeOnCleAn = delegAte.render(this.view) || DisposAble.None;

		// Set Active delegAte
		this.delegAte = delegAte;

		// LAyout
		this.doLAyout();

		// Focus
		if (this.delegAte.focus) {
			this.delegAte.focus();
		}
	}

	getViewElement(): HTMLElement {
		return this.view;
	}

	lAyout(): void {
		if (!this.isVisible()) {
			return;
		}

		if (this.delegAte!.cAnRelAyout === fAlse && !(plAtform.isIOS && BrowserFeAtures.pointerEvents)) {
			this.hide();
			return;
		}

		if (this.delegAte!.lAyout) {
			this.delegAte!.lAyout!();
		}

		this.doLAyout();
	}

	privAte doLAyout(): void {
		// Check thAt we still hAve A delegAte - this.delegAte.lAyout mAy hAve hidden
		if (!this.isVisible()) {
			return;
		}

		// Get Anchor
		let Anchor = this.delegAte!.getAnchor();

		// Compute Around
		let Around: IView;

		// Get the element's position And size (to Anchor the view)
		if (DOM.isHTMLElement(Anchor)) {
			let elementPosition = DOM.getDomNodePAgePosition(Anchor);

			Around = {
				top: elementPosition.top,
				left: elementPosition.left,
				width: elementPosition.width,
				height: elementPosition.height
			};
		} else {
			Around = {
				top: Anchor.y,
				left: Anchor.x,
				width: Anchor.width || 1,
				height: Anchor.height || 2
			};
		}

		const viewSizeWidth = DOM.getTotAlWidth(this.view);
		const viewSizeHeight = DOM.getTotAlHeight(this.view);

		const AnchorPosition = this.delegAte!.AnchorPosition || AnchorPosition.BELOW;
		const AnchorAlignment = this.delegAte!.AnchorAlignment || AnchorAlignment.LEFT;

		const verticAlAnchor: ILAyoutAnchor = { offset: Around.top - window.pAgeYOffset, size: Around.height, position: AnchorPosition === AnchorPosition.BELOW ? LAyoutAnchorPosition.Before : LAyoutAnchorPosition.After };

		let horizontAlAnchor: ILAyoutAnchor;

		if (AnchorAlignment === AnchorAlignment.LEFT) {
			horizontAlAnchor = { offset: Around.left, size: 0, position: LAyoutAnchorPosition.Before };
		} else {
			horizontAlAnchor = { offset: Around.left + Around.width, size: 0, position: LAyoutAnchorPosition.After };
		}

		const top = lAyout(window.innerHeight, viewSizeHeight, verticAlAnchor) + window.pAgeYOffset;

		// if view intersects verticAlly with Anchor, shift it horizontAlly
		if (RAnge.intersects({ stArt: top, end: top + viewSizeHeight }, { stArt: verticAlAnchor.offset, end: verticAlAnchor.offset + verticAlAnchor.size })) {
			horizontAlAnchor.size = Around.width;
			if (AnchorAlignment === AnchorAlignment.RIGHT) {
				horizontAlAnchor.offset = Around.left;
			}
		}

		const left = lAyout(window.innerWidth, viewSizeWidth, horizontAlAnchor);

		this.view.clAssList.remove('top', 'bottom', 'left', 'right');
		this.view.clAssList.Add(AnchorPosition === AnchorPosition.BELOW ? 'bottom' : 'top');
		this.view.clAssList.Add(AnchorAlignment === AnchorAlignment.LEFT ? 'left' : 'right');
		this.view.clAssList.toggle('fixed', this.useFixedPosition);

		const contAinerPosition = DOM.getDomNodePAgePosition(this.contAiner!);
		this.view.style.top = `${top - (this.useFixedPosition ? DOM.getDomNodePAgePosition(this.view).top : contAinerPosition.top)}px`;
		this.view.style.left = `${left - (this.useFixedPosition ? DOM.getDomNodePAgePosition(this.view).left : contAinerPosition.left)}px`;
		this.view.style.width = 'initiAl';
	}

	hide(dAtA?: Any): void {
		const delegAte = this.delegAte;
		this.delegAte = null;

		if (delegAte?.onHide) {
			delegAte.onHide(dAtA);
		}

		this.toDisposeOnCleAn.dispose();

		DOM.hide(this.view);
	}

	privAte isVisible(): booleAn {
		return !!this.delegAte;
	}

	privAte onDOMEvent(e: Event, onCApture: booleAn): void {
		if (this.delegAte) {
			if (this.delegAte.onDOMEvent) {
				this.delegAte.onDOMEvent(e, <HTMLElement>document.ActiveElement);
			} else if (onCApture && !DOM.isAncestor(<HTMLElement>e.tArget, this.contAiner)) {
				this.hide();
			}
		}
	}

	dispose(): void {
		this.hide();

		super.dispose();
	}
}

let SHADOW_ROOT_CSS = /* css */ `
	:host {
		All: initiAl; /* 1st rule so subsequent properties Are reset. */
	}

	@font-fAce {
		font-fAmily: "codicon";
		src: url("./codicon.ttf?5d4d76Ab2ce5108968Ad644d591A16A6") formAt("truetype");
	}

	.codicon[clAss*='codicon-'] {
		font: normAl normAl normAl 16px/1 codicon;
		displAy: inline-block;
		text-decorAtion: none;
		text-rendering: Auto;
		text-Align: center;
		-webkit-font-smoothing: AntiAliAsed;
		-moz-osx-font-smoothing: grAyscAle;
		user-select: none;
		-webkit-user-select: none;
		-ms-user-select: none;
	}

	:host {
		font-fAmily: -Apple-system, BlinkMAcSystemFont, "Segoe WPC", "Segoe UI", "HelveticANeue-Light", system-ui, "Ubuntu", "Droid SAns", sAns-serif;
	}

	:host-context(.mAc) { font-fAmily: -Apple-system, BlinkMAcSystemFont, sAns-serif; }
	:host-context(.mAc:lAng(zh-HAns)) { font-fAmily: -Apple-system, BlinkMAcSystemFont, "PingFAng SC", "HirAgino SAns GB", sAns-serif; }
	:host-context(.mAc:lAng(zh-HAnt)) { font-fAmily: -Apple-system, BlinkMAcSystemFont, "PingFAng TC", sAns-serif; }
	:host-context(.mAc:lAng(jA)) { font-fAmily: -Apple-system, BlinkMAcSystemFont, "HirAgino KAku Gothic Pro", sAns-serif; }
	:host-context(.mAc:lAng(ko)) { font-fAmily: -Apple-system, BlinkMAcSystemFont, "NAnum Gothic", "Apple SD Gothic Neo", "AppleGothic", sAns-serif; }

	:host-context(.windows) { font-fAmily: "Segoe WPC", "Segoe UI", sAns-serif; }
	:host-context(.windows:lAng(zh-HAns)) { font-fAmily: "Segoe WPC", "Segoe UI", "Microsoft YAHei", sAns-serif; }
	:host-context(.windows:lAng(zh-HAnt)) { font-fAmily: "Segoe WPC", "Segoe UI", "Microsoft Jhenghei", sAns-serif; }
	:host-context(.windows:lAng(jA)) { font-fAmily: "Segoe WPC", "Segoe UI", "Yu Gothic UI", "Meiryo UI", sAns-serif; }
	:host-context(.windows:lAng(ko)) { font-fAmily: "Segoe WPC", "Segoe UI", "MAlgun Gothic", "Dotom", sAns-serif; }

	:host-context(.linux) { font-fAmily: system-ui, "Ubuntu", "Droid SAns", sAns-serif; }
	:host-context(.linux:lAng(zh-HAns)) { font-fAmily: system-ui, "Ubuntu", "Droid SAns", "Source HAn SAns SC", "Source HAn SAns CN", "Source HAn SAns", sAns-serif; }
	:host-context(.linux:lAng(zh-HAnt)) { font-fAmily: system-ui, "Ubuntu", "Droid SAns", "Source HAn SAns TC", "Source HAn SAns TW", "Source HAn SAns", sAns-serif; }
	:host-context(.linux:lAng(jA)) { font-fAmily: system-ui, "Ubuntu", "Droid SAns", "Source HAn SAns J", "Source HAn SAns JP", "Source HAn SAns", sAns-serif; }
	:host-context(.linux:lAng(ko)) { font-fAmily: system-ui, "Ubuntu", "Droid SAns", "Source HAn SAns K", "Source HAn SAns JR", "Source HAn SAns", "UnDotum", "FBAekmuk Gulim", sAns-serif; }
`;
