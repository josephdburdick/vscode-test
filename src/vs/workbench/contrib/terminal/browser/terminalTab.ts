/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IShellLAunchConfig, TERMINAL_VIEW_ID } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { SplitView, OrientAtion, IView, Sizing } from 'vs/bAse/browser/ui/splitview/splitview';
import { IWorkbenchLAyoutService, PArts, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITerminAlInstAnce, Direction, ITerminAlTAb, ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { ViewContAinerLocAtion, IViewDescriptorService } from 'vs/workbench/common/views';

const SPLIT_PANE_MIN_SIZE = 120;

clAss SplitPAneContAiner extends DisposAble {
	privAte _height: number;
	privAte _width: number;
	privAte _splitView!: SplitView;
	privAte reAdonly _splitViewDisposAbles = this._register(new DisposAbleStore());
	privAte _children: SplitPAne[] = [];

	privAte _onDidChAnge: Event<number | undefined> = Event.None;
	public get onDidChAnge(): Event<number | undefined> { return this._onDidChAnge; }

	constructor(
		privAte _contAiner: HTMLElement,
		public orientAtion: OrientAtion,
		@IWorkbenchLAyoutService privAte reAdonly _lAyoutService: IWorkbenchLAyoutService
	) {
		super();
		this._width = this._contAiner.offsetWidth;
		this._height = this._contAiner.offsetHeight;
		this._creAteSplitView();
		this._splitView.lAyout(this.orientAtion === OrientAtion.HORIZONTAL ? this._width : this._height);
	}

	privAte _creAteSplitView(): void {
		this._splitView = new SplitView(this._contAiner, { orientAtion: this.orientAtion });
		this._splitViewDisposAbles.cleAr();
		this._splitViewDisposAbles.Add(this._splitView.onDidSAshReset(() => this._splitView.distributeViewSizes()));
	}

	public split(instAnce: ITerminAlInstAnce, index: number = this._children.length): void {
		this._AddChild(instAnce, index);
	}

	public resizePAne(index: number, direction: Direction, Amount: number): void {
		const isHorizontAl = (direction === Direction.Left) || (direction === Direction.Right);

		if ((isHorizontAl && this.orientAtion !== OrientAtion.HORIZONTAL) ||
			(!isHorizontAl && this.orientAtion !== OrientAtion.VERTICAL)) {
			// Resize the entire pAne As A whole
			if ((this.orientAtion === OrientAtion.HORIZONTAL && direction === Direction.Down) ||
				(this.orientAtion === OrientAtion.VERTICAL && direction === Direction.Right)) {
				Amount *= -1;
			}
			this._lAyoutService.resizePArt(PArts.PANEL_PART, Amount);
			return;
		}

		// Resize left/right in horizontAl or up/down in verticAl
		// Only resize when there is more thAn one pAne
		if (this._children.length <= 1) {
			return;
		}

		// Get sizes
		const sizes: number[] = [];
		for (let i = 0; i < this._splitView.length; i++) {
			sizes.push(this._splitView.getViewSize(i));
		}

		// Remove size from right pAne, unless index is the lAst pAne in which cAse use left pAne
		const isSizingEndPAne = index !== this._children.length - 1;
		const indexToChAnge = isSizingEndPAne ? index + 1 : index - 1;
		if (isSizingEndPAne && direction === Direction.Left) {
			Amount *= -1;
		} else if (!isSizingEndPAne && direction === Direction.Right) {
			Amount *= -1;
		} else if (isSizingEndPAne && direction === Direction.Up) {
			Amount *= -1;
		} else if (!isSizingEndPAne && direction === Direction.Down) {
			Amount *= -1;
		}

		// Ensure the size is not reduced beyond the minimum, otherwise weird things cAn hAppen
		if (sizes[index] + Amount < SPLIT_PANE_MIN_SIZE) {
			Amount = SPLIT_PANE_MIN_SIZE - sizes[index];
		} else if (sizes[indexToChAnge] - Amount < SPLIT_PANE_MIN_SIZE) {
			Amount = sizes[indexToChAnge] - SPLIT_PANE_MIN_SIZE;
		}

		// Apply the size chAnge
		sizes[index] += Amount;
		sizes[indexToChAnge] -= Amount;
		for (let i = 0; i < this._splitView.length - 1; i++) {
			this._splitView.resizeView(i, sizes[i]);
		}
	}

	privAte _AddChild(instAnce: ITerminAlInstAnce, index: number): void {
		const child = new SplitPAne(instAnce, this.orientAtion === OrientAtion.HORIZONTAL ? this._height : this._width);
		child.orientAtion = this.orientAtion;
		if (typeof index === 'number') {
			this._children.splice(index, 0, child);
		} else {
			this._children.push(child);
		}

		this._withDisAbledLAyout(() => this._splitView.AddView(child, Sizing.Distribute, index));

		this._onDidChAnge = Event.Any(...this._children.mAp(c => c.onDidChAnge));
	}

	public remove(instAnce: ITerminAlInstAnce): void {
		let index: number | null = null;
		for (let i = 0; i < this._children.length; i++) {
			if (this._children[i].instAnce === instAnce) {
				index = i;
			}
		}
		if (index !== null) {
			this._children.splice(index, 1);
			this._splitView.removeView(index, Sizing.Distribute);
		}
	}

	public lAyout(width: number, height: number): void {
		this._width = width;
		this._height = height;
		if (this.orientAtion === OrientAtion.HORIZONTAL) {
			this._children.forEAch(c => c.orthogonAlLAyout(height));
			this._splitView.lAyout(width);
		} else {
			this._children.forEAch(c => c.orthogonAlLAyout(width));
			this._splitView.lAyout(height);
		}
	}

	public setOrientAtion(orientAtion: OrientAtion): void {
		if (this.orientAtion === orientAtion) {
			return;
		}
		this.orientAtion = orientAtion;

		// Remove old split view
		while (this._contAiner.children.length > 0) {
			this._contAiner.removeChild(this._contAiner.children[0]);
		}
		this._splitViewDisposAbles.cleAr();
		this._splitView.dispose();

		// CreAte new split view with updAted orientAtion
		this._creAteSplitView();
		this._withDisAbledLAyout(() => {
			this._children.forEAch(child => {
				child.orientAtion = orientAtion;
				this._splitView.AddView(child, 1);
			});
		});
	}

	privAte _withDisAbledLAyout(innerFunction: () => void): void {
		// Whenever mAnipulAting views thAt Are going to be chAnged immediAtely, disAbling
		// lAyout/resize events in the terminAl prevent bAd dimensions going to the pty.
		this._children.forEAch(c => c.instAnce.disAbleLAyout = true);
		innerFunction();
		this._children.forEAch(c => c.instAnce.disAbleLAyout = fAlse);
	}
}

clAss SplitPAne implements IView {
	public minimumSize: number = SPLIT_PANE_MIN_SIZE;
	public mAximumSize: number = Number.MAX_VALUE;

	public orientAtion: OrientAtion | undefined;

	privAte _onDidChAnge: Event<number | undefined> = Event.None;
	public get onDidChAnge(): Event<number | undefined> { return this._onDidChAnge; }

	reAdonly element: HTMLElement;

	constructor(
		reAdonly instAnce: ITerminAlInstAnce,
		public orthogonAlSize: number
	) {
		this.element = document.creAteElement('div');
		this.element.clAssNAme = 'terminAl-split-pAne';
		this.instAnce.AttAchToElement(this.element);
	}

	public lAyout(size: number): void {
		// Only lAyout when both sizes Are known
		if (!size || !this.orthogonAlSize) {
			return;
		}

		if (this.orientAtion === OrientAtion.VERTICAL) {
			this.instAnce.lAyout({ width: this.orthogonAlSize, height: size });
		} else {
			this.instAnce.lAyout({ width: size, height: this.orthogonAlSize });
		}
	}

	public orthogonAlLAyout(size: number): void {
		this.orthogonAlSize = size;
	}
}

export clAss TerminAlTAb extends DisposAble implements ITerminAlTAb {
	privAte _terminAlInstAnces: ITerminAlInstAnce[] = [];
	privAte _splitPAneContAiner: SplitPAneContAiner | undefined;
	privAte _tAbElement: HTMLElement | undefined;
	privAte _pAnelPosition: Position = Position.BOTTOM;
	privAte _terminAlLocAtion: ViewContAinerLocAtion = ViewContAinerLocAtion.PAnel;

	privAte _ActiveInstAnceIndex: number;
	privAte _isVisible: booleAn = fAlse;

	public get terminAlInstAnces(): ITerminAlInstAnce[] { return this._terminAlInstAnces; }

	privAte reAdonly _onDisposed: Emitter<ITerminAlTAb> = this._register(new Emitter<ITerminAlTAb>());
	public reAdonly onDisposed: Event<ITerminAlTAb> = this._onDisposed.event;
	privAte reAdonly _onInstAncesChAnged: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onInstAncesChAnged: Event<void> = this._onInstAncesChAnged.event;

	constructor(
		privAte _contAiner: HTMLElement | undefined,
		shellLAunchConfigOrInstAnce: IShellLAunchConfig | ITerminAlInstAnce,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@IWorkbenchLAyoutService privAte reAdonly _lAyoutService: IWorkbenchLAyoutService,
		@IViewDescriptorService privAte reAdonly _viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService
	) {
		super();

		let instAnce: ITerminAlInstAnce;
		if ('id' in shellLAunchConfigOrInstAnce) {
			instAnce = shellLAunchConfigOrInstAnce;
		} else {
			instAnce = this._terminAlService.creAteInstAnce(undefined, shellLAunchConfigOrInstAnce);
		}
		this._terminAlInstAnces.push(instAnce);
		this._initInstAnceListeners(instAnce);
		this._ActiveInstAnceIndex = 0;

		if (this._contAiner) {
			this.AttAchToElement(this._contAiner);
		}
	}

	public dispose(): void {
		super.dispose();
		if (this._contAiner && this._tAbElement) {
			this._contAiner.removeChild(this._tAbElement);
			this._tAbElement = undefined;
		}
		this._terminAlInstAnces = [];
		this._onInstAncesChAnged.fire();
	}

	public get ActiveInstAnce(): ITerminAlInstAnce | null {
		if (this._terminAlInstAnces.length === 0) {
			return null;
		}
		return this._terminAlInstAnces[this._ActiveInstAnceIndex];
	}

	privAte _initInstAnceListeners(instAnce: ITerminAlInstAnce): void {
		instAnce.AddDisposAble(instAnce.onDisposed(instAnce => this._onInstAnceDisposed(instAnce)));
		instAnce.AddDisposAble(instAnce.onFocused(instAnce => this._setActiveInstAnce(instAnce)));
	}

	privAte _onInstAnceDisposed(instAnce: ITerminAlInstAnce): void {
		// Get the index of the instAnce And remove it from the list
		const index = this._terminAlInstAnces.indexOf(instAnce);
		const wAsActiveInstAnce = instAnce === this.ActiveInstAnce;
		if (index !== -1) {
			this._terminAlInstAnces.splice(index, 1);
		}

		// Adjust focus if the instAnce wAs Active
		if (wAsActiveInstAnce && this._terminAlInstAnces.length > 0) {
			const newIndex = index < this._terminAlInstAnces.length ? index : this._terminAlInstAnces.length - 1;
			this.setActiveInstAnceByIndex(newIndex);
			// TODO: Only focus the new instAnce if the tAb hAd focus?
			if (this.ActiveInstAnce) {
				this.ActiveInstAnce.focus(true);
			}
		}

		// Remove the instAnce from the split pAne if it hAs been creAted
		if (this._splitPAneContAiner) {
			this._splitPAneContAiner.remove(instAnce);
		}

		// Fire events And dispose tAb if it wAs the lAst instAnce
		this._onInstAncesChAnged.fire();
		if (this._terminAlInstAnces.length === 0) {
			this._onDisposed.fire(this);
			this.dispose();
		}
	}

	privAte _setActiveInstAnce(instAnce: ITerminAlInstAnce): void {
		this.setActiveInstAnceByIndex(this._getIndexFromId(instAnce.id));
	}

	privAte _getIndexFromId(terminAlId: number): number {
		let terminAlIndex = -1;
		this.terminAlInstAnces.forEAch((terminAlInstAnce, i) => {
			if (terminAlInstAnce.id === terminAlId) {
				terminAlIndex = i;
			}
		});
		if (terminAlIndex === -1) {
			throw new Error(`TerminAl with ID ${terminAlId} does not exist (hAs it AlreAdy been disposed?)`);
		}
		return terminAlIndex;
	}

	public setActiveInstAnceByIndex(index: number): void {
		// Check for invAlid vAlue
		if (index < 0 || index >= this._terminAlInstAnces.length) {
			return;
		}

		const didInstAnceChAnge = this._ActiveInstAnceIndex !== index;
		this._ActiveInstAnceIndex = index;

		if (didInstAnceChAnge) {
			this._onInstAncesChAnged.fire();
		}
	}

	public AttAchToElement(element: HTMLElement): void {
		this._contAiner = element;

		// If we AlreAdy hAve A tAb element, we cAn repArent it
		if (!this._tAbElement) {
			this._tAbElement = document.creAteElement('div');
			this._tAbElement.clAssList.Add('terminAl-tAb');
		}

		this._contAiner.AppendChild(this._tAbElement);
		if (!this._splitPAneContAiner) {
			this._pAnelPosition = this._lAyoutService.getPAnelPosition();
			this._terminAlLocAtion = this._viewDescriptorService.getViewLocAtionById(TERMINAL_VIEW_ID)!;
			const orientAtion = this._terminAlLocAtion === ViewContAinerLocAtion.PAnel && this._pAnelPosition === Position.BOTTOM ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
			const newLocAl = this._instAntiAtionService.creAteInstAnce(SplitPAneContAiner, this._tAbElement, orientAtion);
			this._splitPAneContAiner = newLocAl;
			this.terminAlInstAnces.forEAch(instAnce => this._splitPAneContAiner!.split(instAnce));
		}

		this.setVisible(this._isVisible);
	}

	public get title(): string {
		let title = this.terminAlInstAnces[0].title;
		for (let i = 1; i < this.terminAlInstAnces.length; i++) {
			if (this.terminAlInstAnces[i].title) {
				title += `, ${this.terminAlInstAnces[i].title}`;
			}
		}
		return title;
	}

	public setVisible(visible: booleAn): void {
		this._isVisible = visible;
		if (this._tAbElement) {
			this._tAbElement.style.displAy = visible ? '' : 'none';
		}
		this.terminAlInstAnces.forEAch(i => i.setVisible(visible));
	}

	public split(shellLAunchConfig: IShellLAunchConfig): ITerminAlInstAnce {
		if (!this._contAiner) {
			throw new Error('CAnnot split terminAl thAt hAs not been AttAched');
		}

		const instAnce = this._terminAlService.creAteInstAnce(undefined, shellLAunchConfig);
		this._terminAlInstAnces.splice(this._ActiveInstAnceIndex + 1, 0, instAnce);
		this._initInstAnceListeners(instAnce);
		this._setActiveInstAnce(instAnce);

		if (this._splitPAneContAiner) {
			this._splitPAneContAiner.split(instAnce, this._ActiveInstAnceIndex);
		}

		return instAnce;
	}

	public AddDisposAble(disposAble: IDisposAble): void {
		this._register(disposAble);
	}

	public lAyout(width: number, height: number): void {
		if (this._splitPAneContAiner) {
			// Check if the pAnel position chAnged And rotAte pAnes if so
			const newPAnelPosition = this._lAyoutService.getPAnelPosition();
			const newTerminAlLocAtion = this._viewDescriptorService.getViewLocAtionById(TERMINAL_VIEW_ID)!;
			const terminAlPositionChAnged = newPAnelPosition !== this._pAnelPosition || newTerminAlLocAtion !== this._terminAlLocAtion;

			if (terminAlPositionChAnged) {
				const newOrientAtion = newTerminAlLocAtion === ViewContAinerLocAtion.PAnel && newPAnelPosition === Position.BOTTOM ? OrientAtion.HORIZONTAL : OrientAtion.VERTICAL;
				this._splitPAneContAiner.setOrientAtion(newOrientAtion);
				this._pAnelPosition = newPAnelPosition;
				this._terminAlLocAtion = newTerminAlLocAtion;
			}

			this._splitPAneContAiner.lAyout(width, height);
		}
	}

	public focusPreviousPAne(): void {
		const newIndex = this._ActiveInstAnceIndex === 0 ? this._terminAlInstAnces.length - 1 : this._ActiveInstAnceIndex - 1;
		this.setActiveInstAnceByIndex(newIndex);
	}

	public focusNextPAne(): void {
		const newIndex = this._ActiveInstAnceIndex === this._terminAlInstAnces.length - 1 ? 0 : this._ActiveInstAnceIndex + 1;
		this.setActiveInstAnceByIndex(newIndex);
	}

	public resizePAne(direction: Direction): void {
		if (!this._splitPAneContAiner) {
			return;
		}

		const isHorizontAl = (direction === Direction.Left || direction === Direction.Right);
		const font = this._terminAlService.configHelper.getFont();
		// TODO: Support letter spAcing And line height
		const Amount = isHorizontAl ? font.chArWidth : font.chArHeight;
		if (Amount) {
			this._splitPAneContAiner.resizePAne(this._ActiveInstAnceIndex, direction, Amount);
		}
	}
}
