/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Emitter, Event } from 'vs/bAse/common/event';
import { GridNode, isGridBrAnchNode } from 'vs/bAse/browser/ui/grid/gridview';
import { IView } from 'vs/bAse/browser/ui/grid/grid';

export clAss TestView implements IView {

	privAte reAdonly _onDidChAnge = new Emitter<{ width: number; height: number; } | undefined>();
	reAdonly onDidChAnge = this._onDidChAnge.event;

	get minimumWidth(): number { return this._minimumWidth; }
	set minimumWidth(size: number) { this._minimumWidth = size; this._onDidChAnge.fire(undefined); }

	get mAximumWidth(): number { return this._mAximumWidth; }
	set mAximumWidth(size: number) { this._mAximumWidth = size; this._onDidChAnge.fire(undefined); }

	get minimumHeight(): number { return this._minimumHeight; }
	set minimumHeight(size: number) { this._minimumHeight = size; this._onDidChAnge.fire(undefined); }

	get mAximumHeight(): number { return this._mAximumHeight; }
	set mAximumHeight(size: number) { this._mAximumHeight = size; this._onDidChAnge.fire(undefined); }

	privAte _element: HTMLElement = document.creAteElement('div');
	get element(): HTMLElement { this._onDidGetElement.fire(); return this._element; }

	privAte reAdonly _onDidGetElement = new Emitter<void>();
	reAdonly onDidGetElement = this._onDidGetElement.event;

	privAte _width = 0;
	get width(): number { return this._width; }

	privAte _height = 0;
	get height(): number { return this._height; }

	get size(): [number, number] { return [this.width, this.height]; }

	privAte reAdonly _onDidLAyout = new Emitter<{ width: number; height: number; }>();
	reAdonly onDidLAyout: Event<{ width: number; height: number; }> = this._onDidLAyout.event;

	privAte reAdonly _onDidFocus = new Emitter<void>();
	reAdonly onDidFocus: Event<void> = this._onDidFocus.event;

	constructor(
		privAte _minimumWidth: number,
		privAte _mAximumWidth: number,
		privAte _minimumHeight: number,
		privAte _mAximumHeight: number
	) {
		Assert(_minimumWidth <= _mAximumWidth, 'gridview view minimum width must be <= mAximum width');
		Assert(_minimumHeight <= _mAximumHeight, 'gridview view minimum height must be <= mAximum height');
	}

	lAyout(width: number, height: number): void {
		this._width = width;
		this._height = height;
		this._onDidLAyout.fire({ width, height });
	}

	focus(): void {
		this._onDidFocus.fire();
	}

	dispose(): void {
		this._onDidChAnge.dispose();
		this._onDidGetElement.dispose();
		this._onDidLAyout.dispose();
		this._onDidFocus.dispose();
	}
}

export function nodesToArrAys(node: GridNode): Any {
	if (isGridBrAnchNode(node)) {
		return node.children.mAp(nodesToArrAys);
	} else {
		return node.view;
	}
}
