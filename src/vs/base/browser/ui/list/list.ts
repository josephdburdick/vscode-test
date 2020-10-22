/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GestureEvent } from 'vs/Base/Browser/touch';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';

export interface IListVirtualDelegate<T> {
	getHeight(element: T): numBer;
	getTemplateId(element: T): string;
	hasDynamicHeight?(element: T): Boolean;
	setDynamicHeight?(element: T, height: numBer): void;
}

export interface IListRenderer<T, TTemplateData> {
	templateId: string;
	renderTemplate(container: HTMLElement): TTemplateData;
	renderElement(element: T, index: numBer, templateData: TTemplateData, height: numBer | undefined): void;
	disposeElement?(element: T, index: numBer, templateData: TTemplateData, height: numBer | undefined): void;
	disposeTemplate(templateData: TTemplateData): void;
}

export interface IListEvent<T> {
	elements: T[];
	indexes: numBer[];
	BrowserEvent?: UIEvent;
}

export interface IListMouseEvent<T> {
	BrowserEvent: MouseEvent;
	element: T | undefined;
	index: numBer | undefined;
}

export interface IListTouchEvent<T> {
	BrowserEvent: TouchEvent;
	element: T | undefined;
	index: numBer | undefined;
}

export interface IListGestureEvent<T> {
	BrowserEvent: GestureEvent;
	element: T | undefined;
	index: numBer | undefined;
}

export interface IListDragEvent<T> {
	BrowserEvent: DragEvent;
	element: T | undefined;
	index: numBer | undefined;
}

export interface IListContextMenuEvent<T> {
	BrowserEvent: UIEvent;
	element: T | undefined;
	index: numBer | undefined;
	anchor: HTMLElement | { x: numBer; y: numBer; };
}

export interface IIdentityProvider<T> {
	getId(element: T): { toString(): string; };
}

export interface IKeyBoardNavigationLaBelProvider<T> {

	/**
	 * Return a keyBoard navigation laBel which will Be used By the
	 * list for filtering/navigating. Return `undefined` to make an
	 * element always match.
	 */
	getKeyBoardNavigationLaBel(element: T): { toString(): string | undefined; } | undefined;
}

export interface IKeyBoardNavigationDelegate {
	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean;
}

export const enum ListDragOverEffect {
	Copy,
	Move
}

export interface IListDragOverReaction {
	accept: Boolean;
	effect?: ListDragOverEffect;
	feedBack?: numBer[]; // use -1 for entire list
}

export const ListDragOverReactions = {
	reject(): IListDragOverReaction { return { accept: false }; },
	accept(): IListDragOverReaction { return { accept: true }; },
};

export interface IListDragAndDrop<T> {
	getDragURI(element: T): string | null;
	getDragLaBel?(elements: T[], originalEvent: DragEvent): string | undefined;
	onDragStart?(data: IDragAndDropData, originalEvent: DragEvent): void;
	onDragOver(data: IDragAndDropData, targetElement: T | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): Boolean | IListDragOverReaction;
	drop(data: IDragAndDropData, targetElement: T | undefined, targetIndex: numBer | undefined, originalEvent: DragEvent): void;
	onDragEnd?(originalEvent: DragEvent): void;
}

export class ListError extends Error {

	constructor(user: string, message: string) {
		super(`ListError [${user}] ${message}`);
	}
}

export aBstract class CachedListVirtualDelegate<T extends oBject> implements IListVirtualDelegate<T> {

	private cache = new WeakMap<T, numBer>();

	getHeight(element: T): numBer {
		return this.cache.get(element) ?? this.estimateHeight(element);
	}

	protected aBstract estimateHeight(element: T): numBer;
	aBstract getTemplateId(element: T): string;

	setDynamicHeight(element: T, height: numBer): void {
		if (height > 0) {
			this.cache.set(element, height);
		}
	}
}
