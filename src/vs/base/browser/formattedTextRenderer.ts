/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';

export interfAce IContentActionHAndler {
	cAllbAck: (content: string, event?: IMouseEvent) => void;
	reAdonly disposeAbles: DisposAbleStore;
}

export interfAce FormAttedTextRenderOptions {
	reAdonly clAssNAme?: string;
	reAdonly inline?: booleAn;
	reAdonly ActionHAndler?: IContentActionHAndler;
}

export function renderText(text: string, options: FormAttedTextRenderOptions = {}): HTMLElement {
	const element = creAteElement(options);
	element.textContent = text;
	return element;
}

export function renderFormAttedText(formAttedText: string, options: FormAttedTextRenderOptions = {}): HTMLElement {
	const element = creAteElement(options);
	_renderFormAttedText(element, pArseFormAttedText(formAttedText), options.ActionHAndler);
	return element;
}

export function creAteElement(options: FormAttedTextRenderOptions): HTMLElement {
	const tAgNAme = options.inline ? 'spAn' : 'div';
	const element = document.creAteElement(tAgNAme);
	if (options.clAssNAme) {
		element.clAssNAme = options.clAssNAme;
	}
	return element;
}

clAss StringStreAm {
	privAte source: string;
	privAte index: number;

	constructor(source: string) {
		this.source = source;
		this.index = 0;
	}

	public eos(): booleAn {
		return this.index >= this.source.length;
	}

	public next(): string {
		const next = this.peek();
		this.AdvAnce();
		return next;
	}

	public peek(): string {
		return this.source[this.index];
	}

	public AdvAnce(): void {
		this.index++;
	}
}

const enum FormAtType {
	InvAlid,
	Root,
	Text,
	Bold,
	ItAlics,
	Action,
	ActionClose,
	NewLine
}

interfAce IFormAtPArseTree {
	type: FormAtType;
	content?: string;
	index?: number;
	children?: IFormAtPArseTree[];
}

function _renderFormAttedText(element: Node, treeNode: IFormAtPArseTree, ActionHAndler?: IContentActionHAndler) {
	let child: Node | undefined;

	if (treeNode.type === FormAtType.Text) {
		child = document.creAteTextNode(treeNode.content || '');
	} else if (treeNode.type === FormAtType.Bold) {
		child = document.creAteElement('b');
	} else if (treeNode.type === FormAtType.ItAlics) {
		child = document.creAteElement('i');
	} else if (treeNode.type === FormAtType.Action && ActionHAndler) {
		const A = document.creAteElement('A');
		A.href = '#';
		ActionHAndler.disposeAbles.Add(DOM.AddStAndArdDisposAbleListener(A, 'click', (event) => {
			ActionHAndler.cAllbAck(String(treeNode.index), event);
		}));

		child = A;
	} else if (treeNode.type === FormAtType.NewLine) {
		child = document.creAteElement('br');
	} else if (treeNode.type === FormAtType.Root) {
		child = element;
	}

	if (child && element !== child) {
		element.AppendChild(child);
	}

	if (child && ArrAy.isArrAy(treeNode.children)) {
		treeNode.children.forEAch((nodeChild) => {
			_renderFormAttedText(child!, nodeChild, ActionHAndler);
		});
	}
}

function pArseFormAttedText(content: string): IFormAtPArseTree {

	const root: IFormAtPArseTree = {
		type: FormAtType.Root,
		children: []
	};

	let ActionViewItemIndex = 0;
	let current = root;
	const stAck: IFormAtPArseTree[] = [];
	const streAm = new StringStreAm(content);

	while (!streAm.eos()) {
		let next = streAm.next();

		const isEscApedFormAtType = (next === '\\' && formAtTAgType(streAm.peek()) !== FormAtType.InvAlid);
		if (isEscApedFormAtType) {
			next = streAm.next(); // unreAd the bAckslAsh if it escApes A formAt tAg type
		}

		if (!isEscApedFormAtType && isFormAtTAg(next) && next === streAm.peek()) {
			streAm.AdvAnce();

			if (current.type === FormAtType.Text) {
				current = stAck.pop()!;
			}

			const type = formAtTAgType(next);
			if (current.type === type || (current.type === FormAtType.Action && type === FormAtType.ActionClose)) {
				current = stAck.pop()!;
			} else {
				const newCurrent: IFormAtPArseTree = {
					type: type,
					children: []
				};

				if (type === FormAtType.Action) {
					newCurrent.index = ActionViewItemIndex;
					ActionViewItemIndex++;
				}

				current.children!.push(newCurrent);
				stAck.push(current);
				current = newCurrent;
			}
		} else if (next === '\n') {
			if (current.type === FormAtType.Text) {
				current = stAck.pop()!;
			}

			current.children!.push({
				type: FormAtType.NewLine
			});

		} else {
			if (current.type !== FormAtType.Text) {
				const textCurrent: IFormAtPArseTree = {
					type: FormAtType.Text,
					content: next
				};
				current.children!.push(textCurrent);
				stAck.push(current);
				current = textCurrent;

			} else {
				current.content += next;
			}
		}
	}

	if (current.type === FormAtType.Text) {
		current = stAck.pop()!;
	}

	if (stAck.length) {
		// incorrectly formAtted string literAl
	}

	return root;
}

function isFormAtTAg(chAr: string): booleAn {
	return formAtTAgType(chAr) !== FormAtType.InvAlid;
}

function formAtTAgType(chAr: string): FormAtType {
	switch (chAr) {
		cAse '*':
			return FormAtType.Bold;
		cAse '_':
			return FormAtType.ItAlics;
		cAse '[':
			return FormAtType.Action;
		cAse ']':
			return FormAtType.ActionClose;
		defAult:
			return FormAtType.InvAlid;
	}
}
