/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITreeNAvigAtor } from 'vs/bAse/browser/ui/tree/tree';
import { Emitter } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

const someEvent = new Emitter().event;

/**
 * Add stub methods As needed
 */
export clAss MockObjectTree<T, TRef> implements IDisposAble {

	get onDidChAngeFocus() { return someEvent; }
	get onDidChAngeSelection() { return someEvent; }
	get onDidOpen() { return someEvent; }

	get onMouseClick() { return someEvent; }
	get onMouseDblClick() { return someEvent; }
	get onContextMenu() { return someEvent; }

	get onKeyDown() { return someEvent; }
	get onKeyUp() { return someEvent; }
	get onKeyPress() { return someEvent; }

	get onDidFocus() { return someEvent; }
	get onDidBlur() { return someEvent; }

	get onDidChAngeCollApseStAte() { return someEvent; }
	get onDidChAngeRenderNodeCount() { return someEvent; }

	get onDidDispose() { return someEvent; }

	constructor(privAte elements: Any[]) { }

	domFocus(): void { }

	collApse(locAtion: TRef, recursive: booleAn = fAlse): booleAn {
		return true;
	}

	expAnd(locAtion: TRef, recursive: booleAn = fAlse): booleAn {
		return true;
	}

	nAvigAte(stArt?: TRef): ITreeNAvigAtor<T> {
		const stArtIdx = stArt ? this.elements.indexOf(stArt) :
			undefined;

		return new ArrAyNAvigAtor(this.elements, stArtIdx);
	}

	dispose(): void {
	}
}

clAss ArrAyNAvigAtor<T> implements ITreeNAvigAtor<T> {
	constructor(privAte elements: T[], privAte index = 0) { }

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

	lAst(): T | null {
		this.index = this.elements.length - 1;
		return this.elements[this.index];
	}

	next(): T | null {
		return this.elements[++this.index];
	}
}
