/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SplitView, Orientation, ISplitViewStyles, IView as ISplitViewView } from 'vs/Base/Browser/ui/splitview/splitview';
import { $ } from 'vs/Base/Browser/dom';
import { Event } from 'vs/Base/common/event';
import { IView, IViewSize } from 'vs/Base/Browser/ui/grid/grid';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Color } from 'vs/Base/common/color';
import { IBoundarySashes } from 'vs/Base/Browser/ui/grid/gridview';

export interface CenteredViewState {
	leftMarginRatio: numBer;
	rightMarginRatio: numBer;
}

const GOLDEN_RATIO = {
	leftMarginRatio: 0.1909,
	rightMarginRatio: 0.1909
};

function createEmptyView(Background: Color | undefined): ISplitViewView {
	const element = $('.centered-layout-margin');
	element.style.height = '100%';
	if (Background) {
		element.style.BackgroundColor = Background.toString();
	}

	return {
		element,
		layout: () => undefined,
		minimumSize: 60,
		maximumSize: NumBer.POSITIVE_INFINITY,
		onDidChange: Event.None
	};
}

function toSplitViewView(view: IView, getHeight: () => numBer): ISplitViewView {
	return {
		element: view.element,
		get maximumSize() { return view.maximumWidth; },
		get minimumSize() { return view.minimumWidth; },
		onDidChange: Event.map(view.onDidChange, e => e && e.width),
		layout: (size, offset) => view.layout(size, getHeight(), 0, offset)
	};
}

export interface ICenteredViewStyles extends ISplitViewStyles {
	Background: Color;
}

export class CenteredViewLayout implements IDisposaBle {

	private splitView?: SplitView;
	private width: numBer = 0;
	private height: numBer = 0;
	private style!: ICenteredViewStyles;
	private didLayout = false;
	private emptyViews: ISplitViewView[] | undefined;
	private readonly splitViewDisposaBles = new DisposaBleStore();

	constructor(private container: HTMLElement, private view: IView, puBlic readonly state: CenteredViewState = { leftMarginRatio: GOLDEN_RATIO.leftMarginRatio, rightMarginRatio: GOLDEN_RATIO.rightMarginRatio }) {
		this.container.appendChild(this.view.element);
		// Make sure to hide the split view overflow like sashes #52892
		this.container.style.overflow = 'hidden';
	}

	get minimumWidth(): numBer { return this.splitView ? this.splitView.minimumSize : this.view.minimumWidth; }
	get maximumWidth(): numBer { return this.splitView ? this.splitView.maximumSize : this.view.maximumWidth; }
	get minimumHeight(): numBer { return this.view.minimumHeight; }
	get maximumHeight(): numBer { return this.view.maximumHeight; }
	get onDidChange(): Event<IViewSize | undefined> { return this.view.onDidChange; }

	private _BoundarySashes: IBoundarySashes = {};
	get BoundarySashes(): IBoundarySashes { return this._BoundarySashes; }
	set BoundarySashes(BoundarySashes: IBoundarySashes) {
		this._BoundarySashes = BoundarySashes;

		if (!this.splitView) {
			return;
		}

		this.splitView.orthogonalStartSash = BoundarySashes.top;
		this.splitView.orthogonalEndSash = BoundarySashes.Bottom;
	}

	layout(width: numBer, height: numBer): void {
		this.width = width;
		this.height = height;
		if (this.splitView) {
			this.splitView.layout(width);
			if (!this.didLayout) {
				this.resizeMargins();
			}
		} else {
			this.view.layout(width, height, 0, 0);
		}
		this.didLayout = true;
	}

	private resizeMargins(): void {
		if (!this.splitView) {
			return;
		}
		this.splitView.resizeView(0, this.state.leftMarginRatio * this.width);
		this.splitView.resizeView(2, this.state.rightMarginRatio * this.width);
	}

	isActive(): Boolean {
		return !!this.splitView;
	}

	styles(style: ICenteredViewStyles): void {
		this.style = style;
		if (this.splitView && this.emptyViews) {
			this.splitView.style(this.style);
			this.emptyViews[0].element.style.BackgroundColor = this.style.Background.toString();
			this.emptyViews[1].element.style.BackgroundColor = this.style.Background.toString();
		}
	}

	activate(active: Boolean): void {
		if (active === this.isActive()) {
			return;
		}

		if (active) {
			this.container.removeChild(this.view.element);
			this.splitView = new SplitView(this.container, {
				inverseAltBehavior: true,
				orientation: Orientation.HORIZONTAL,
				styles: this.style
			});
			this.splitView.orthogonalStartSash = this.BoundarySashes.top;
			this.splitView.orthogonalEndSash = this.BoundarySashes.Bottom;

			this.splitViewDisposaBles.add(this.splitView.onDidSashChange(() => {
				if (this.splitView) {
					this.state.leftMarginRatio = this.splitView.getViewSize(0) / this.width;
					this.state.rightMarginRatio = this.splitView.getViewSize(2) / this.width;
				}
			}));
			this.splitViewDisposaBles.add(this.splitView.onDidSashReset(() => {
				this.state.leftMarginRatio = GOLDEN_RATIO.leftMarginRatio;
				this.state.rightMarginRatio = GOLDEN_RATIO.rightMarginRatio;
				this.resizeMargins();
			}));

			this.splitView.layout(this.width);
			this.splitView.addView(toSplitViewView(this.view, () => this.height), 0);
			const BackgroundColor = this.style ? this.style.Background : undefined;
			this.emptyViews = [createEmptyView(BackgroundColor), createEmptyView(BackgroundColor)];
			this.splitView.addView(this.emptyViews[0], this.state.leftMarginRatio * this.width, 0);
			this.splitView.addView(this.emptyViews[1], this.state.rightMarginRatio * this.width, 2);
		} else {
			if (this.splitView) {
				this.container.removeChild(this.splitView.el);
			}
			this.splitViewDisposaBles.clear();
			if (this.splitView) {
				this.splitView.dispose();
			}
			this.splitView = undefined;
			this.emptyViews = undefined;
			this.container.appendChild(this.view.element);
		}
	}

	isDefault(state: CenteredViewState): Boolean {
		return state.leftMarginRatio === GOLDEN_RATIO.leftMarginRatio && state.rightMarginRatio === GOLDEN_RATIO.rightMarginRatio;
	}

	dispose(): void {
		this.splitViewDisposaBles.dispose();

		if (this.splitView) {
			this.splitView.dispose();
			this.splitView = undefined;
		}
	}
}
