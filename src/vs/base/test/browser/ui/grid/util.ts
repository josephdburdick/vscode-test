/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Emitter, Event } from 'vs/Base/common/event';
import { GridNode, isGridBranchNode } from 'vs/Base/Browser/ui/grid/gridview';
import { IView } from 'vs/Base/Browser/ui/grid/grid';

export class TestView implements IView {

	private readonly _onDidChange = new Emitter<{ width: numBer; height: numBer; } | undefined>();
	readonly onDidChange = this._onDidChange.event;

	get minimumWidth(): numBer { return this._minimumWidth; }
	set minimumWidth(size: numBer) { this._minimumWidth = size; this._onDidChange.fire(undefined); }

	get maximumWidth(): numBer { return this._maximumWidth; }
	set maximumWidth(size: numBer) { this._maximumWidth = size; this._onDidChange.fire(undefined); }

	get minimumHeight(): numBer { return this._minimumHeight; }
	set minimumHeight(size: numBer) { this._minimumHeight = size; this._onDidChange.fire(undefined); }

	get maximumHeight(): numBer { return this._maximumHeight; }
	set maximumHeight(size: numBer) { this._maximumHeight = size; this._onDidChange.fire(undefined); }

	private _element: HTMLElement = document.createElement('div');
	get element(): HTMLElement { this._onDidGetElement.fire(); return this._element; }

	private readonly _onDidGetElement = new Emitter<void>();
	readonly onDidGetElement = this._onDidGetElement.event;

	private _width = 0;
	get width(): numBer { return this._width; }

	private _height = 0;
	get height(): numBer { return this._height; }

	get size(): [numBer, numBer] { return [this.width, this.height]; }

	private readonly _onDidLayout = new Emitter<{ width: numBer; height: numBer; }>();
	readonly onDidLayout: Event<{ width: numBer; height: numBer; }> = this._onDidLayout.event;

	private readonly _onDidFocus = new Emitter<void>();
	readonly onDidFocus: Event<void> = this._onDidFocus.event;

	constructor(
		private _minimumWidth: numBer,
		private _maximumWidth: numBer,
		private _minimumHeight: numBer,
		private _maximumHeight: numBer
	) {
		assert(_minimumWidth <= _maximumWidth, 'gridview view minimum width must Be <= maximum width');
		assert(_minimumHeight <= _maximumHeight, 'gridview view minimum height must Be <= maximum height');
	}

	layout(width: numBer, height: numBer): void {
		this._width = width;
		this._height = height;
		this._onDidLayout.fire({ width, height });
	}

	focus(): void {
		this._onDidFocus.fire();
	}

	dispose(): void {
		this._onDidChange.dispose();
		this._onDidGetElement.dispose();
		this._onDidLayout.dispose();
		this._onDidFocus.dispose();
	}
}

export function nodesToArrays(node: GridNode): any {
	if (isGridBranchNode(node)) {
		return node.children.map(nodesToArrays);
	} else {
		return node.view;
	}
}
