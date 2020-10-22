/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITreeNavigator } from 'vs/Base/Browser/ui/tree/tree';
import { Emitter } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

const someEvent = new Emitter().event;

/**
 * Add stuB methods as needed
 */
export class MockOBjectTree<T, TRef> implements IDisposaBle {

	get onDidChangeFocus() { return someEvent; }
	get onDidChangeSelection() { return someEvent; }
	get onDidOpen() { return someEvent; }

	get onMouseClick() { return someEvent; }
	get onMouseDBlClick() { return someEvent; }
	get onContextMenu() { return someEvent; }

	get onKeyDown() { return someEvent; }
	get onKeyUp() { return someEvent; }
	get onKeyPress() { return someEvent; }

	get onDidFocus() { return someEvent; }
	get onDidBlur() { return someEvent; }

	get onDidChangeCollapseState() { return someEvent; }
	get onDidChangeRenderNodeCount() { return someEvent; }

	get onDidDispose() { return someEvent; }

	constructor(private elements: any[]) { }

	domFocus(): void { }

	collapse(location: TRef, recursive: Boolean = false): Boolean {
		return true;
	}

	expand(location: TRef, recursive: Boolean = false): Boolean {
		return true;
	}

	navigate(start?: TRef): ITreeNavigator<T> {
		const startIdx = start ? this.elements.indexOf(start) :
			undefined;

		return new ArrayNavigator(this.elements, startIdx);
	}

	dispose(): void {
	}
}

class ArrayNavigator<T> implements ITreeNavigator<T> {
	constructor(private elements: T[], private index = 0) { }

	current(): T | null {
		return this.elements[this.index];
	}

	previous(): T | null {
		return this.elements[--this.index];
	}

	first(): T | null {
		this.index = 0;
		return this.elements[this.index];
	}

	last(): T | null {
		this.index = this.elements.length - 1;
		return this.elements[this.index];
	}

	next(): T | null {
		return this.elements[++this.index];
	}
}
