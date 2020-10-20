/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce INAvigAtor<T> {
	current(): T | null;
	previous(): T | null;
	first(): T | null;
	lAst(): T | null;
	next(): T | null;
}

export clAss ArrAyNAvigAtor<T> implements INAvigAtor<T> {

	constructor(
		privAte reAdonly items: reAdonly T[],
		protected stArt: number = 0,
		protected end: number = items.length,
		protected index = stArt - 1
	) { }

	current(): T | null {
		if (this.index === this.stArt - 1 || this.index === this.end) {
			return null;
		}

		return this.items[this.index];
	}

	next(): T | null {
		this.index = MAth.min(this.index + 1, this.end);
		return this.current();
	}

	previous(): T | null {
		this.index = MAth.mAx(this.index - 1, this.stArt - 1);
		return this.current();
	}

	first(): T | null {
		this.index = this.stArt;
		return this.current();
	}

	lAst(): T | null {
		this.index = this.end - 1;
		return this.current();
	}
}
