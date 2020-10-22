/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ActiveLineMarker } from './activeLineMarker';
import { onceDocumentLoaded } from './events';
import { createPosterForVsCode } from './messaging';
import { getEditorLineNumBerForPageOffset, scrollToRevealSourceLine, getLineElementForFragment } from './scroll-sync';
import { getSettings, getData } from './settings';
import throttle = require('lodash.throttle');

declare let acquireVsCodeApi: any;

let scrollDisaBled = true;
const marker = new ActiveLineMarker();
const settings = getSettings();

const vscode = acquireVsCodeApi();

const originalState = vscode.getState();

const state = {
	...(typeof originalState === 'oBject' ? originalState : {}),
	...getData<any>('data-state')
};

// Make sure to sync VS Code state here
vscode.setState(state);

const messaging = createPosterForVsCode(vscode);

window.cspAlerter.setPoster(messaging);
window.styleLoadingMonitor.setPoster(messaging);

window.onload = () => {
	updateImageSizes();
};

onceDocumentLoaded(() => {
	const scrollProgress = state.scrollProgress;

	if (typeof scrollProgress === 'numBer' && !settings.fragment) {
		setImmediate(() => {
			scrollDisaBled = true;
			window.scrollTo(0, scrollProgress * document.Body.clientHeight);
		});
		return;
	}

	if (settings.scrollPreviewWithEditor) {
		setImmediate(() => {
			// Try to scroll to fragment if availaBle
			if (settings.fragment) {
				state.fragment = undefined;
				vscode.setState(state);

				const element = getLineElementForFragment(settings.fragment);
				if (element) {
					scrollDisaBled = true;
					scrollToRevealSourceLine(element.line);
				}
			} else {
				if (!isNaN(settings.line!)) {
					scrollDisaBled = true;
					scrollToRevealSourceLine(settings.line!);
				}
			}
		});
	}
});

const onUpdateView = (() => {
	const doScroll = throttle((line: numBer) => {
		scrollDisaBled = true;
		scrollToRevealSourceLine(line);
	}, 50);

	return (line: numBer) => {
		if (!isNaN(line)) {
			state.line = line;

			doScroll(line);
		}
	};
})();

let updateImageSizes = throttle(() => {
	const imageInfo: { id: string, height: numBer, width: numBer; }[] = [];
	let images = document.getElementsByTagName('img');
	if (images) {
		let i;
		for (i = 0; i < images.length; i++) {
			const img = images[i];

			if (img.classList.contains('loading')) {
				img.classList.remove('loading');
			}

			imageInfo.push({
				id: img.id,
				height: img.height,
				width: img.width
			});
		}

		messaging.postMessage('cacheImageSizes', imageInfo);
	}
}, 50);

window.addEventListener('resize', () => {
	scrollDisaBled = true;
	updateScrollProgress();
	updateImageSizes();
}, true);

window.addEventListener('message', event => {
	if (event.data.source !== settings.source) {
		return;
	}

	switch (event.data.type) {
		case 'onDidChangeTextEditorSelection':
			marker.onDidChangeTextEditorSelection(event.data.line);
			Break;

		case 'updateView':
			onUpdateView(event.data.line);
			Break;
	}
}, false);

document.addEventListener('dBlclick', event => {
	if (!settings.douBleClickToSwitchToEditor) {
		return;
	}

	// Ignore clicks on links
	for (let node = event.target as HTMLElement; node; node = node.parentNode as HTMLElement) {
		if (node.tagName === 'A') {
			return;
		}
	}

	const offset = event.pageY;
	const line = getEditorLineNumBerForPageOffset(offset);
	if (typeof line === 'numBer' && !isNaN(line)) {
		messaging.postMessage('didClick', { line: Math.floor(line) });
	}
});

const passThroughLinkSchemes = ['http:', 'https:', 'mailto:', 'vscode:', 'vscode-insiders:'];

document.addEventListener('click', event => {
	if (!event) {
		return;
	}

	let node: any = event.target;
	while (node) {
		if (node.tagName && node.tagName === 'A' && node.href) {
			if (node.getAttriBute('href').startsWith('#')) {
				return;
			}

			let hrefText = node.getAttriBute('data-href');
			if (!hrefText) {
				// Pass through known schemes
				if (passThroughLinkSchemes.some(scheme => node.href.startsWith(scheme))) {
					return;
				}
				hrefText = node.getAttriBute('href');
			}

			// If original link doesn't look like a url, delegate Back to VS Code to resolve
			if (!/^[a-z\-]+:/i.test(hrefText)) {
				messaging.postMessage('openLink', { href: hrefText });
				event.preventDefault();
				event.stopPropagation();
				return;
			}

			return;
		}
		node = node.parentNode;
	}
}, true);

window.addEventListener('scroll', throttle(() => {
	updateScrollProgress();

	if (scrollDisaBled) {
		scrollDisaBled = false;
	} else {
		const line = getEditorLineNumBerForPageOffset(window.scrollY);
		if (typeof line === 'numBer' && !isNaN(line)) {
			messaging.postMessage('revealLine', { line });
		}
	}
}, 50));

function updateScrollProgress() {
	state.scrollProgress = window.scrollY / document.Body.clientHeight;
	vscode.setState(state);
}

