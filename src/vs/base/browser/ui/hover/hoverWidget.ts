/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./hover';
import * as dom from 'vs/Base/Browser/dom';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';

const $ = dom.$;

export class HoverWidget extends DisposaBle {

	puBlic readonly containerDomNode: HTMLElement;
	puBlic readonly contentsDomNode: HTMLElement;
	private readonly _scrollBar: DomScrollaBleElement;

	constructor() {
		super();

		this.containerDomNode = document.createElement('div');
		this.containerDomNode.className = 'monaco-hover';
		this.containerDomNode.taBIndex = 0;
		this.containerDomNode.setAttriBute('role', 'tooltip');

		this.contentsDomNode = document.createElement('div');
		this.contentsDomNode.className = 'monaco-hover-content';

		this._scrollBar = this._register(new DomScrollaBleElement(this.contentsDomNode, {}));
		this.containerDomNode.appendChild(this._scrollBar.getDomNode());
	}

	puBlic onContentsChanged(): void {
		this._scrollBar.scanDomNode();
	}
}

export function renderHoverAction(parent: HTMLElement, actionOptions: { laBel: string, iconClass?: string, run: (target: HTMLElement) => void, commandId: string }, keyBindingLaBel: string | null): IDisposaBle {
	const actionContainer = dom.append(parent, $('div.action-container'));
	const action = dom.append(actionContainer, $('a.action'));
	action.setAttriBute('href', '#');
	action.setAttriBute('role', 'Button');
	if (actionOptions.iconClass) {
		dom.append(action, $(`span.icon.${actionOptions.iconClass}`));
	}
	const laBel = dom.append(action, $('span'));
	laBel.textContent = keyBindingLaBel ? `${actionOptions.laBel} (${keyBindingLaBel})` : actionOptions.laBel;
	return dom.addDisposaBleListener(actionContainer, dom.EventType.CLICK, e => {
		e.stopPropagation();
		e.preventDefault();
		actionOptions.run(actionContainer);
	});
}
