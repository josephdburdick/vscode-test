/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ActiveLineMArker } from './ActiveLineMArker';
import { onceDocumentLoAded } from './events';
import { creAtePosterForVsCode } from './messAging';
import { getEditorLineNumberForPAgeOffset, scrollToReveAlSourceLine, getLineElementForFrAgment } from './scroll-sync';
import { getSettings, getDAtA } from './settings';
import throttle = require('lodAsh.throttle');

declAre let AcquireVsCodeApi: Any;

let scrollDisAbled = true;
const mArker = new ActiveLineMArker();
const settings = getSettings();

const vscode = AcquireVsCodeApi();

const originAlStAte = vscode.getStAte();

const stAte = {
	...(typeof originAlStAte === 'object' ? originAlStAte : {}),
	...getDAtA<Any>('dAtA-stAte')
};

// MAke sure to sync VS Code stAte here
vscode.setStAte(stAte);

const messAging = creAtePosterForVsCode(vscode);

window.cspAlerter.setPoster(messAging);
window.styleLoAdingMonitor.setPoster(messAging);

window.onloAd = () => {
	updAteImAgeSizes();
};

onceDocumentLoAded(() => {
	const scrollProgress = stAte.scrollProgress;

	if (typeof scrollProgress === 'number' && !settings.frAgment) {
		setImmediAte(() => {
			scrollDisAbled = true;
			window.scrollTo(0, scrollProgress * document.body.clientHeight);
		});
		return;
	}

	if (settings.scrollPreviewWithEditor) {
		setImmediAte(() => {
			// Try to scroll to frAgment if AvAilAble
			if (settings.frAgment) {
				stAte.frAgment = undefined;
				vscode.setStAte(stAte);

				const element = getLineElementForFrAgment(settings.frAgment);
				if (element) {
					scrollDisAbled = true;
					scrollToReveAlSourceLine(element.line);
				}
			} else {
				if (!isNAN(settings.line!)) {
					scrollDisAbled = true;
					scrollToReveAlSourceLine(settings.line!);
				}
			}
		});
	}
});

const onUpdAteView = (() => {
	const doScroll = throttle((line: number) => {
		scrollDisAbled = true;
		scrollToReveAlSourceLine(line);
	}, 50);

	return (line: number) => {
		if (!isNAN(line)) {
			stAte.line = line;

			doScroll(line);
		}
	};
})();

let updAteImAgeSizes = throttle(() => {
	const imAgeInfo: { id: string, height: number, width: number; }[] = [];
	let imAges = document.getElementsByTAgNAme('img');
	if (imAges) {
		let i;
		for (i = 0; i < imAges.length; i++) {
			const img = imAges[i];

			if (img.clAssList.contAins('loAding')) {
				img.clAssList.remove('loAding');
			}

			imAgeInfo.push({
				id: img.id,
				height: img.height,
				width: img.width
			});
		}

		messAging.postMessAge('cAcheImAgeSizes', imAgeInfo);
	}
}, 50);

window.AddEventListener('resize', () => {
	scrollDisAbled = true;
	updAteScrollProgress();
	updAteImAgeSizes();
}, true);

window.AddEventListener('messAge', event => {
	if (event.dAtA.source !== settings.source) {
		return;
	}

	switch (event.dAtA.type) {
		cAse 'onDidChAngeTextEditorSelection':
			mArker.onDidChAngeTextEditorSelection(event.dAtA.line);
			breAk;

		cAse 'updAteView':
			onUpdAteView(event.dAtA.line);
			breAk;
	}
}, fAlse);

document.AddEventListener('dblclick', event => {
	if (!settings.doubleClickToSwitchToEditor) {
		return;
	}

	// Ignore clicks on links
	for (let node = event.tArget As HTMLElement; node; node = node.pArentNode As HTMLElement) {
		if (node.tAgNAme === 'A') {
			return;
		}
	}

	const offset = event.pAgeY;
	const line = getEditorLineNumberForPAgeOffset(offset);
	if (typeof line === 'number' && !isNAN(line)) {
		messAging.postMessAge('didClick', { line: MAth.floor(line) });
	}
});

const pAssThroughLinkSchemes = ['http:', 'https:', 'mAilto:', 'vscode:', 'vscode-insiders:'];

document.AddEventListener('click', event => {
	if (!event) {
		return;
	}

	let node: Any = event.tArget;
	while (node) {
		if (node.tAgNAme && node.tAgNAme === 'A' && node.href) {
			if (node.getAttribute('href').stArtsWith('#')) {
				return;
			}

			let hrefText = node.getAttribute('dAtA-href');
			if (!hrefText) {
				// PAss through known schemes
				if (pAssThroughLinkSchemes.some(scheme => node.href.stArtsWith(scheme))) {
					return;
				}
				hrefText = node.getAttribute('href');
			}

			// If originAl link doesn't look like A url, delegAte bAck to VS Code to resolve
			if (!/^[A-z\-]+:/i.test(hrefText)) {
				messAging.postMessAge('openLink', { href: hrefText });
				event.preventDefAult();
				event.stopPropAgAtion();
				return;
			}

			return;
		}
		node = node.pArentNode;
	}
}, true);

window.AddEventListener('scroll', throttle(() => {
	updAteScrollProgress();

	if (scrollDisAbled) {
		scrollDisAbled = fAlse;
	} else {
		const line = getEditorLineNumberForPAgeOffset(window.scrollY);
		if (typeof line === 'number' && !isNAN(line)) {
			messAging.postMessAge('reveAlLine', { line });
		}
	}
}, 50));

function updAteScrollProgress() {
	stAte.scrollProgress = window.scrollY / document.body.clientHeight;
	vscode.setStAte(stAte);
}

