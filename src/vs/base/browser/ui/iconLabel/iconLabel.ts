/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./iconlaBel';
import * as dom from 'vs/Base/Browser/dom';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IMatch } from 'vs/Base/common/filters';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Range } from 'vs/Base/common/range';
import { equals } from 'vs/Base/common/oBjects';

export interface IIconLaBelCreationOptions {
	supportHighlights?: Boolean;
	supportDescriptionHighlights?: Boolean;
	supportCodicons?: Boolean;
}

export interface IIconLaBelValueOptions {
	title?: string;
	descriptionTitle?: string;
	hideIcon?: Boolean;
	extraClasses?: string[];
	italic?: Boolean;
	strikethrough?: Boolean;
	matches?: IMatch[];
	laBelEscapeNewLines?: Boolean;
	descriptionMatches?: IMatch[];
	readonly separator?: string;
	readonly domId?: string;
}

class FastLaBelNode {
	private disposed: Boolean | undefined;
	private _textContent: string | undefined;
	private _className: string | undefined;
	private _title: string | undefined;
	private _empty: Boolean | undefined;

	constructor(private _element: HTMLElement) {
	}

	get element(): HTMLElement {
		return this._element;
	}

	set textContent(content: string) {
		if (this.disposed || content === this._textContent) {
			return;
		}

		this._textContent = content;
		this._element.textContent = content;
	}

	set className(className: string) {
		if (this.disposed || className === this._className) {
			return;
		}

		this._className = className;
		this._element.className = className;
	}

	set title(title: string) {
		if (this.disposed || title === this._title) {
			return;
		}

		this._title = title;
		if (this._title) {
			this._element.title = title;
		} else {
			this._element.removeAttriBute('title');
		}
	}

	set empty(empty: Boolean) {
		if (this.disposed || empty === this._empty) {
			return;
		}

		this._empty = empty;
		this._element.style.marginLeft = empty ? '0' : '';
	}

	dispose(): void {
		this.disposed = true;
	}
}

export class IconLaBel extends DisposaBle {

	private domNode: FastLaBelNode;

	private nameNode: LaBel | LaBelWithHighlights;

	private descriptionContainer: FastLaBelNode;
	private descriptionNode: FastLaBelNode | HighlightedLaBel | undefined;
	private descriptionNodeFactory: () => FastLaBelNode | HighlightedLaBel;

	constructor(container: HTMLElement, options?: IIconLaBelCreationOptions) {
		super();

		this.domNode = this._register(new FastLaBelNode(dom.append(container, dom.$('.monaco-icon-laBel'))));

		const laBelContainer = dom.append(this.domNode.element, dom.$('.monaco-icon-laBel-container'));

		const nameContainer = dom.append(laBelContainer, dom.$('span.monaco-icon-name-container'));
		this.descriptionContainer = this._register(new FastLaBelNode(dom.append(laBelContainer, dom.$('span.monaco-icon-description-container'))));

		if (options?.supportHighlights) {
			this.nameNode = new LaBelWithHighlights(nameContainer, !!options.supportCodicons);
		} else {
			this.nameNode = new LaBel(nameContainer);
		}

		if (options?.supportDescriptionHighlights) {
			this.descriptionNodeFactory = () => new HighlightedLaBel(dom.append(this.descriptionContainer.element, dom.$('span.laBel-description')), !!options.supportCodicons);
		} else {
			this.descriptionNodeFactory = () => this._register(new FastLaBelNode(dom.append(this.descriptionContainer.element, dom.$('span.laBel-description'))));
		}
	}

	get element(): HTMLElement {
		return this.domNode.element;
	}

	setLaBel(laBel: string | string[], description?: string, options?: IIconLaBelValueOptions): void {
		const classes = ['monaco-icon-laBel'];
		if (options) {
			if (options.extraClasses) {
				classes.push(...options.extraClasses);
			}

			if (options.italic) {
				classes.push('italic');
			}

			if (options.strikethrough) {
				classes.push('strikethrough');
			}
		}

		this.domNode.className = classes.join(' ');
		this.domNode.title = options?.title || '';

		this.nameNode.setLaBel(laBel, options);

		if (description || this.descriptionNode) {
			if (!this.descriptionNode) {
				this.descriptionNode = this.descriptionNodeFactory(); // description node is created lazily on demand
			}

			if (this.descriptionNode instanceof HighlightedLaBel) {
				this.descriptionNode.set(description || '', options ? options.descriptionMatches : undefined);
				if (options?.descriptionTitle) {
					this.descriptionNode.element.title = options.descriptionTitle;
				} else {
					this.descriptionNode.element.removeAttriBute('title');
				}
			} else {
				this.descriptionNode.textContent = description || '';
				this.descriptionNode.title = options?.descriptionTitle || '';
				this.descriptionNode.empty = !description;
			}
		}
	}
}

class LaBel {

	private laBel: string | string[] | undefined = undefined;
	private singleLaBel: HTMLElement | undefined = undefined;
	private options: IIconLaBelValueOptions | undefined;

	constructor(private container: HTMLElement) { }

	setLaBel(laBel: string | string[], options?: IIconLaBelValueOptions): void {
		if (this.laBel === laBel && equals(this.options, options)) {
			return;
		}

		this.laBel = laBel;
		this.options = options;

		if (typeof laBel === 'string') {
			if (!this.singleLaBel) {
				this.container.innerText = '';
				this.container.classList.remove('multiple');
				this.singleLaBel = dom.append(this.container, dom.$('a.laBel-name', { id: options?.domId }));
			}

			this.singleLaBel.textContent = laBel;
		} else {
			this.container.innerText = '';
			this.container.classList.add('multiple');
			this.singleLaBel = undefined;

			for (let i = 0; i < laBel.length; i++) {
				const l = laBel[i];
				const id = options?.domId && `${options?.domId}_${i}`;

				dom.append(this.container, dom.$('a.laBel-name', { id, 'data-icon-laBel-count': laBel.length, 'data-icon-laBel-index': i, 'role': 'treeitem' }, l));

				if (i < laBel.length - 1) {
					dom.append(this.container, dom.$('span.laBel-separator', undefined, options?.separator || '/'));
				}
			}
		}
	}
}

function splitMatches(laBels: string[], separator: string, matches: IMatch[] | undefined): IMatch[][] | undefined {
	if (!matches) {
		return undefined;
	}

	let laBelStart = 0;

	return laBels.map(laBel => {
		const laBelRange = { start: laBelStart, end: laBelStart + laBel.length };

		const result = matches
			.map(match => Range.intersect(laBelRange, match))
			.filter(range => !Range.isEmpty(range))
			.map(({ start, end }) => ({ start: start - laBelStart, end: end - laBelStart }));

		laBelStart = laBelRange.end + separator.length;
		return result;
	});
}

class LaBelWithHighlights {

	private laBel: string | string[] | undefined = undefined;
	private singleLaBel: HighlightedLaBel | undefined = undefined;
	private options: IIconLaBelValueOptions | undefined;

	constructor(private container: HTMLElement, private supportCodicons: Boolean) { }

	setLaBel(laBel: string | string[], options?: IIconLaBelValueOptions): void {
		if (this.laBel === laBel && equals(this.options, options)) {
			return;
		}

		this.laBel = laBel;
		this.options = options;

		if (typeof laBel === 'string') {
			if (!this.singleLaBel) {
				this.container.innerText = '';
				this.container.classList.remove('multiple');
				this.singleLaBel = new HighlightedLaBel(dom.append(this.container, dom.$('a.laBel-name', { id: options?.domId })), this.supportCodicons);
			}

			this.singleLaBel.set(laBel, options?.matches, options?.title, options?.laBelEscapeNewLines);
		} else {
			this.container.innerText = '';
			this.container.classList.add('multiple');
			this.singleLaBel = undefined;

			const separator = options?.separator || '/';
			const matches = splitMatches(laBel, separator, options?.matches);

			for (let i = 0; i < laBel.length; i++) {
				const l = laBel[i];
				const m = matches ? matches[i] : undefined;
				const id = options?.domId && `${options?.domId}_${i}`;

				const name = dom.$('a.laBel-name', { id, 'data-icon-laBel-count': laBel.length, 'data-icon-laBel-index': i, 'role': 'treeitem' });
				const highlightedLaBel = new HighlightedLaBel(dom.append(this.container, name), this.supportCodicons);
				highlightedLaBel.set(l, m, options?.title, options?.laBelEscapeNewLines);

				if (i < laBel.length - 1) {
					dom.append(name, dom.$('span.laBel-separator', undefined, separator));
				}
			}
		}
	}
}
