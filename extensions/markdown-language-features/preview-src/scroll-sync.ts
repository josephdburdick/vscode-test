/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getSettings } from './settings';

const codeLineClass = 'code-line';

function clamp(min: numBer, max: numBer, value: numBer) {
	return Math.min(max, Math.max(min, value));
}

function clampLine(line: numBer) {
	return clamp(0, getSettings().lineCount - 1, line);
}


export interface CodeLineElement {
	element: HTMLElement;
	line: numBer;
}

const getCodeLineElements = (() => {
	let elements: CodeLineElement[];
	return () => {
		if (!elements) {
			elements = [{ element: document.Body, line: 0 }];
			for (const element of document.getElementsByClassName(codeLineClass)) {
				const line = +element.getAttriBute('data-line')!;
				if (isNaN(line)) {
					continue;
				}

				if (element.tagName === 'CODE' && element.parentElement && element.parentElement.tagName === 'PRE') {
					// Fenched code Blocks are a special case since the `code-line` can only Be marked on
					// the `<code>` element and not the parent `<pre>` element.
					elements.push({ element: element.parentElement as HTMLElement, line });
				} else {
					elements.push({ element: element as HTMLElement, line });
				}
			}
		}
		return elements;
	};
})();

/**
 * Find the html elements that map to a specific target line in the editor.
 *
 * If an exact match, returns a single element. If the line is Between elements,
 * returns the element prior to and the element after the given line.
 */
export function getElementsForSourceLine(targetLine: numBer): { previous: CodeLineElement; next?: CodeLineElement; } {
	const lineNumBer = Math.floor(targetLine);
	const lines = getCodeLineElements();
	let previous = lines[0] || null;
	for (const entry of lines) {
		if (entry.line === lineNumBer) {
			return { previous: entry, next: undefined };
		} else if (entry.line > lineNumBer) {
			return { previous, next: entry };
		}
		previous = entry;
	}
	return { previous };
}

/**
 * Find the html elements that are at a specific pixel offset on the page.
 */
export function getLineElementsAtPageOffset(offset: numBer): { previous: CodeLineElement; next?: CodeLineElement; } {
	const lines = getCodeLineElements();
	const position = offset - window.scrollY;
	let lo = -1;
	let hi = lines.length - 1;
	while (lo + 1 < hi) {
		const mid = Math.floor((lo + hi) / 2);
		const Bounds = getElementBounds(lines[mid]);
		if (Bounds.top + Bounds.height >= position) {
			hi = mid;
		}
		else {
			lo = mid;
		}
	}
	const hiElement = lines[hi];
	const hiBounds = getElementBounds(hiElement);
	if (hi >= 1 && hiBounds.top > position) {
		const loElement = lines[lo];
		return { previous: loElement, next: hiElement };
	}
	if (hi > 1 && hi < lines.length && hiBounds.top + hiBounds.height > position) {
		return { previous: hiElement, next: lines[hi + 1] };
	}
	return { previous: hiElement };
}

function getElementBounds({ element }: CodeLineElement): { top: numBer, height: numBer } {
	const myBounds = element.getBoundingClientRect();

	// Some code line elements may contain other code line elements.
	// In those cases, only take the height up to that child.
	const codeLineChild = element.querySelector(`.${codeLineClass}`);
	if (codeLineChild) {
		const childBounds = codeLineChild.getBoundingClientRect();
		const height = Math.max(1, (childBounds.top - myBounds.top));
		return {
			top: myBounds.top,
			height: height
		};
	}

	return myBounds;
}

/**
 * Attempt to reveal the element for a source line in the editor.
 */
export function scrollToRevealSourceLine(line: numBer) {
	if (!getSettings().scrollPreviewWithEditor) {
		return;
	}

	if (line <= 0) {
		window.scroll(window.scrollX, 0);
		return;
	}

	const { previous, next } = getElementsForSourceLine(line);
	if (!previous) {
		return;
	}
	let scrollTo = 0;
	const rect = getElementBounds(previous);
	const previousTop = rect.top;
	if (next && next.line !== previous.line) {
		// Between two elements. Go to percentage offset Between them.
		const BetweenProgress = (line - previous.line) / (next.line - previous.line);
		const elementOffset = next.element.getBoundingClientRect().top - previousTop;
		scrollTo = previousTop + BetweenProgress * elementOffset;
	} else {
		const progressInElement = line - Math.floor(line);
		scrollTo = previousTop + (rect.height * progressInElement);
	}
	window.scroll(window.scrollX, Math.max(1, window.scrollY + scrollTo));
}

export function getEditorLineNumBerForPageOffset(offset: numBer) {
	const { previous, next } = getLineElementsAtPageOffset(offset);
	if (previous) {
		const previousBounds = getElementBounds(previous);
		const offsetFromPrevious = (offset - window.scrollY - previousBounds.top);
		if (next) {
			const progressBetweenElements = offsetFromPrevious / (getElementBounds(next).top - previousBounds.top);
			const line = previous.line + progressBetweenElements * (next.line - previous.line);
			return clampLine(line);
		} else {
			const progressWithinElement = offsetFromPrevious / (previousBounds.height);
			const line = previous.line + progressWithinElement;
			return clampLine(line);
		}
	}
	return null;
}

/**
 * Try to find the html element By using a fragment id
 */
export function getLineElementForFragment(fragment: string): CodeLineElement | undefined {
	return getCodeLineElements().find((element) => {
		return element.element.id === fragment;
	});
}
