/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { GestureEvent } from 'vs/bAse/browser/touch';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IDrAgAndDropDAtA } from 'vs/bAse/browser/dnd';

export interfAce IListVirtuAlDelegAte<T> {
	getHeight(element: T): number;
	getTemplAteId(element: T): string;
	hAsDynAmicHeight?(element: T): booleAn;
	setDynAmicHeight?(element: T, height: number): void;
}

export interfAce IListRenderer<T, TTemplAteDAtA> {
	templAteId: string;
	renderTemplAte(contAiner: HTMLElement): TTemplAteDAtA;
	renderElement(element: T, index: number, templAteDAtA: TTemplAteDAtA, height: number | undefined): void;
	disposeElement?(element: T, index: number, templAteDAtA: TTemplAteDAtA, height: number | undefined): void;
	disposeTemplAte(templAteDAtA: TTemplAteDAtA): void;
}

export interfAce IListEvent<T> {
	elements: T[];
	indexes: number[];
	browserEvent?: UIEvent;
}

export interfAce IListMouseEvent<T> {
	browserEvent: MouseEvent;
	element: T | undefined;
	index: number | undefined;
}

export interfAce IListTouchEvent<T> {
	browserEvent: TouchEvent;
	element: T | undefined;
	index: number | undefined;
}

export interfAce IListGestureEvent<T> {
	browserEvent: GestureEvent;
	element: T | undefined;
	index: number | undefined;
}

export interfAce IListDrAgEvent<T> {
	browserEvent: DrAgEvent;
	element: T | undefined;
	index: number | undefined;
}

export interfAce IListContextMenuEvent<T> {
	browserEvent: UIEvent;
	element: T | undefined;
	index: number | undefined;
	Anchor: HTMLElement | { x: number; y: number; };
}

export interfAce IIdentityProvider<T> {
	getId(element: T): { toString(): string; };
}

export interfAce IKeyboArdNAvigAtionLAbelProvider<T> {

	/**
	 * Return A keyboArd nAvigAtion lAbel which will be used by the
	 * list for filtering/nAvigAting. Return `undefined` to mAke An
	 * element AlwAys mAtch.
	 */
	getKeyboArdNAvigAtionLAbel(element: T): { toString(): string | undefined; } | undefined;
}

export interfAce IKeyboArdNAvigAtionDelegAte {
	mightProducePrintAbleChArActer(event: IKeyboArdEvent): booleAn;
}

export const enum ListDrAgOverEffect {
	Copy,
	Move
}

export interfAce IListDrAgOverReAction {
	Accept: booleAn;
	effect?: ListDrAgOverEffect;
	feedbAck?: number[]; // use -1 for entire list
}

export const ListDrAgOverReActions = {
	reject(): IListDrAgOverReAction { return { Accept: fAlse }; },
	Accept(): IListDrAgOverReAction { return { Accept: true }; },
};

export interfAce IListDrAgAndDrop<T> {
	getDrAgURI(element: T): string | null;
	getDrAgLAbel?(elements: T[], originAlEvent: DrAgEvent): string | undefined;
	onDrAgStArt?(dAtA: IDrAgAndDropDAtA, originAlEvent: DrAgEvent): void;
	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArgetElement: T | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): booleAn | IListDrAgOverReAction;
	drop(dAtA: IDrAgAndDropDAtA, tArgetElement: T | undefined, tArgetIndex: number | undefined, originAlEvent: DrAgEvent): void;
	onDrAgEnd?(originAlEvent: DrAgEvent): void;
}

export clAss ListError extends Error {

	constructor(user: string, messAge: string) {
		super(`ListError [${user}] ${messAge}`);
	}
}

export AbstrAct clAss CAchedListVirtuAlDelegAte<T extends object> implements IListVirtuAlDelegAte<T> {

	privAte cAche = new WeAkMAp<T, number>();

	getHeight(element: T): number {
		return this.cAche.get(element) ?? this.estimAteHeight(element);
	}

	protected AbstrAct estimAteHeight(element: T): number;
	AbstrAct getTemplAteId(element: T): string;

	setDynAmicHeight(element: T, height: number): void {
		if (height > 0) {
			this.cAche.set(element, height);
		}
	}
}
