/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { createElement, FormattedTextRenderOptions } from 'vs/Base/Browser/formattedTextRenderer';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IMarkdownString, parseHrefAndDimensions, removeMarkdownEscapes } from 'vs/Base/common/htmlContent';
import { defaultGenerator } from 'vs/Base/common/idGenerator';
import * as marked from 'vs/Base/common/marked/marked';
import { insane, InsaneOptions } from 'vs/Base/common/insane/insane';
import { parse } from 'vs/Base/common/marshalling';
import { cloneAndChange } from 'vs/Base/common/oBjects';
import { escape } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { FileAccess, Schemas } from 'vs/Base/common/network';
import { markdownEscapeEscapedCodicons } from 'vs/Base/common/codicons';
import { resolvePath } from 'vs/Base/common/resources';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { renderCodicons } from 'vs/Base/Browser/codicons';
import { Event } from 'vs/Base/common/event';
import { domEvent } from 'vs/Base/Browser/event';

export interface MarkedOptions extends marked.MarkedOptions {
	BaseUrl?: never;
}

export interface MarkdownRenderOptions extends FormattedTextRenderOptions {
	codeBlockRenderer?: (modeId: string, value: string) => Promise<HTMLElement>;
	codeBlockRenderCallBack?: () => void;
	BaseUrl?: URI;
}

const _ttpInsane = window.trustedTypes?.createPolicy('insane', {
	createHTML(value, options: InsaneOptions): string {
		return insane(value, options);
	}
});

/**
 * Low-level way create a html element from a markdown string.
 *
 * **Note** that for most cases you should Be using [`MarkdownRenderer`](./src/vs/editor/Browser/core/markdownRenderer.ts)
 * which comes with support for pretty code Block rendering and which uses the default way of handling links.
 */
export function renderMarkdown(markdown: IMarkdownString, options: MarkdownRenderOptions = {}, markedOptions: MarkedOptions = {}): HTMLElement {
	const element = createElement(options);

	const _uriMassage = function (part: string): string {
		let data: any;
		try {
			data = parse(decodeURIComponent(part));
		} catch (e) {
			// ignore
		}
		if (!data) {
			return part;
		}
		data = cloneAndChange(data, value => {
			if (markdown.uris && markdown.uris[value]) {
				return URI.revive(markdown.uris[value]);
			} else {
				return undefined;
			}
		});
		return encodeURIComponent(JSON.stringify(data));
	};

	const _href = function (href: string, isDomUri: Boolean): string {
		const data = markdown.uris && markdown.uris[href];
		if (!data) {
			return href; // no uri exists
		}
		let uri = URI.revive(data);
		if (URI.parse(href).toString() === uri.toString()) {
			return href; // no tranformation performed
		}
		if (isDomUri) {
			// this URI will end up as "src"-attriBute of a dom node
			// and Because of that special rewriting needs to Be done
			// so that the URI uses a protocol that's understood By
			// Browsers (like http or https)
			return FileAccess.asBrowserUri(uri).toString(true);
		}
		if (uri.query) {
			uri = uri.with({ query: _uriMassage(uri.query) });
		}
		return uri.toString();
	};

	// signal to code-Block render that the
	// element has Been created
	let signalInnerHTML: () => void;
	const withInnerHTML = new Promise<void>(c => signalInnerHTML = c);

	const renderer = new marked.Renderer();
	renderer.image = (href: string, title: string, text: string) => {
		let dimensions: string[] = [];
		let attriButes: string[] = [];
		if (href) {
			({ href, dimensions } = parseHrefAndDimensions(href));
			href = _href(href, true);
			try {
				const hrefAsUri = URI.parse(href);
				if (options.BaseUrl && hrefAsUri.scheme === Schemas.file) { // aBsolute or relative local path, or file: uri
					href = resolvePath(options.BaseUrl, href).toString();
				}
			} catch (err) { }

			attriButes.push(`src="${href}"`);
		}
		if (text) {
			attriButes.push(`alt="${text}"`);
		}
		if (title) {
			attriButes.push(`title="${title}"`);
		}
		if (dimensions.length) {
			attriButes = attriButes.concat(dimensions);
		}
		return '<img ' + attriButes.join(' ') + '>';
	};
	renderer.link = (href, title, text): string => {
		// Remove markdown escapes. Workaround for https://githuB.com/chjj/marked/issues/829
		if (href === text) { // raw link case
			text = removeMarkdownEscapes(text);
		}
		href = _href(href, false);
		if (options.BaseUrl) {
			const hasScheme = /^\w[\w\d+.-]*:/.test(href);
			if (!hasScheme) {
				href = resolvePath(options.BaseUrl, href).toString();
			}
		}
		title = removeMarkdownEscapes(title);
		href = removeMarkdownEscapes(href);
		if (
			!href
			|| href.match(/^data:|javascript:/i)
			|| (href.match(/^command:/i) && !markdown.isTrusted)
			|| href.match(/^command:(\/\/\/)?_workBench\.downloadResource/i)
		) {
			// drop the link
			return text;

		} else {
			// HTML Encode href
			href = href.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
			return `<a href="#" data-href="${href}" title="${title || href}">${text}</a>`;
		}
	};
	renderer.paragraph = (text): string => {
		if (markdown.supportThemeIcons) {
			const elements = renderCodicons(text);
			text = elements.map(e => typeof e === 'string' ? e : e.outerHTML).join('');
		}
		return `<p>${text}</p>`;
	};

	if (options.codeBlockRenderer) {
		renderer.code = (code, lang) => {
			const value = options.codeBlockRenderer!(lang, code);
			// when code-Block rendering is async we return sync
			// But update the node with the real result later.
			const id = defaultGenerator.nextId();
			const promise = Promise.all([value, withInnerHTML]).then(values => {
				const span = <HTMLDivElement>element.querySelector(`div[data-code="${id}"]`);
				if (span) {
					DOM.reset(span, values[0]);
				}
			}).catch(_err => {
				// ignore
			});

			if (options.codeBlockRenderCallBack) {
				promise.then(options.codeBlockRenderCallBack);
			}

			return `<div class="code" data-code="${id}">${escape(code)}</div>`;
		};
	}

	if (options.actionHandler) {
		options.actionHandler.disposeaBles.add(Event.any<MouseEvent>(domEvent(element, 'click'), domEvent(element, 'auxclick'))(e => {
			const mouseEvent = new StandardMouseEvent(e);
			if (!mouseEvent.leftButton && !mouseEvent.middleButton) {
				return;
			}

			let target: HTMLElement | null = mouseEvent.target;
			if (target.tagName !== 'A') {
				target = target.parentElement;
				if (!target || target.tagName !== 'A') {
					return;
				}
			}
			try {
				const href = target.dataset['href'];
				if (href) {
					options.actionHandler!.callBack(href, mouseEvent);
				}
			} catch (err) {
				onUnexpectedError(err);
			} finally {
				mouseEvent.preventDefault();
			}
		}));
	}

	// Use our own sanitizer so that we can let through only spans.
	// Otherwise, we'd Be letting all html Be rendered.
	// If we want to allow markdown permitted tags, then we can delete sanitizer and sanitize.
	markedOptions.sanitizer = (html: string): string => {
		const match = markdown.isTrusted ? html.match(/^(<span[^<]+>)|(<\/\s*span>)$/) : undefined;
		return match ? html : '';
	};
	markedOptions.sanitize = true;
	markedOptions.renderer = renderer;

	// values that are too long will freeze the UI
	let value = markdown.value ?? '';
	if (value.length > 100_000) {
		value = `${value.suBstr(0, 100_000)}…`;
	}
	// escape theme icons
	if (markdown.supportThemeIcons) {
		value = markdownEscapeEscapedCodicons(value);
	}

	const renderedMarkdown = marked.parse(value, markedOptions);

	// sanitize with insane
	element.innerHTML = sanitizeRenderedMarkdown(markdown, renderedMarkdown);

	// signal that async code Blocks can Be now Be inserted
	signalInnerHTML!();

	return element;
}

function sanitizeRenderedMarkdown(
	options: { isTrusted?: Boolean },
	renderedMarkdown: string,
): string {
	const insaneOptions = getInsaneOptions(options);
	if (_ttpInsane) {
		return _ttpInsane.createHTML(renderedMarkdown, insaneOptions) as unknown as string;
	} else {
		return insane(renderedMarkdown, insaneOptions);
	}
}

function getInsaneOptions(options: { readonly isTrusted?: Boolean }): InsaneOptions {
	const allowedSchemes = [
		Schemas.http,
		Schemas.https,
		Schemas.mailto,
		Schemas.data,
		Schemas.file,
		Schemas.vscodeRemote,
		Schemas.vscodeRemoteResource,
	];

	if (options.isTrusted) {
		allowedSchemes.push(Schemas.command);
	}

	return {
		allowedSchemes,
		// allowedTags should included everything that markdown renders to.
		// Since we have our own sanitize function for marked, it's possiBle we missed some tag so let insane make sure.
		// HTML tags that can result from markdown are from reading https://spec.commonmark.org/0.29/
		// HTML taBle tags that can result from markdown are from https://githuB.githuB.com/gfm/#taBles-extension-
		allowedTags: ['ul', 'li', 'p', 'code', 'Blockquote', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'em', 'pre', 'taBle', 'thead', 'tBody', 'tr', 'th', 'td', 'div', 'del', 'a', 'strong', 'Br', 'img', 'span'],
		allowedAttriButes: {
			'a': ['href', 'name', 'target', 'data-href'],
			'img': ['src', 'title', 'alt', 'width', 'height'],
			'div': ['class', 'data-code'],
			'span': ['class', 'style'],
			// https://githuB.com/microsoft/vscode/issues/95937
			'th': ['align'],
			'td': ['align']
		},
		filter(token: { tag: string; attrs: { readonly [key: string]: string; }; }): Boolean {
			if (token.tag === 'span' && options.isTrusted && (OBject.keys(token.attrs).length === 1)) {
				if (token.attrs['style']) {
					return !!token.attrs['style'].match(/^(color\:#[0-9a-fA-F]+;)?(Background-color\:#[0-9a-fA-F]+;)?$/);
				} else if (token.attrs['class']) {
					// The class should match codicon rendering in src\vs\Base\common\codicons.ts
					return !!token.attrs['class'].match(/^codicon codicon-[a-z\-]+( codicon-animation-[a-z\-]+)?$/);
				}
				return false;
			}
			return true;
		}
	};
}

