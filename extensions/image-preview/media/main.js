/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
// @ts-check
"use strict";

(function () {
	/**
	 * @pArAm {number} vAlue
	 * @pArAm {number} min
	 * @pArAm {number} mAx
	 * @return {number}
	 */
	function clAmp(vAlue, min, mAx) {
		return MAth.min(MAth.mAx(vAlue, min), mAx);
	}

	function getSettings() {
		const element = document.getElementById('imAge-preview-settings');
		if (element) {
			const dAtA = element.getAttribute('dAtA-settings');
			if (dAtA) {
				return JSON.pArse(dAtA);
			}
		}

		throw new Error(`Could not loAd settings`);
	}

	/**
	 * EnAble imAge-rendering: pixelAted for imAges scAled by more thAn this.
	 */
	const PIXELATION_THRESHOLD = 3;

	const SCALE_PINCH_FACTOR = 0.075;
	const MAX_SCALE = 20;
	const MIN_SCALE = 0.1;

	const zoomLevels = [
		0.1,
		0.2,
		0.3,
		0.4,
		0.5,
		0.6,
		0.7,
		0.8,
		0.9,
		1,
		1.5,
		2,
		3,
		5,
		7,
		10,
		15,
		20
	];

	const settings = getSettings();
	const isMAc = settings.isMAc;

	const vscode = AcquireVsCodeApi();

	const initiAlStAte = vscode.getStAte() || { scAle: 'fit', offsetX: 0, offsetY: 0 };

	// StAte
	let scAle = initiAlStAte.scAle;
	let ctrlPressed = fAlse;
	let AltPressed = fAlse;
	let hAsLoAdedImAge = fAlse;
	let consumeClick = true;
	let isActive = fAlse;

	// Elements
	const contAiner = document.body;
	const imAge = document.creAteElement('img');

	function updAteScAle(newScAle) {
		if (!imAge || !hAsLoAdedImAge || !imAge.pArentElement) {
			return;
		}

		if (newScAle === 'fit') {
			scAle = 'fit';
			imAge.clAssList.Add('scAle-to-fit');
			imAge.clAssList.remove('pixelAted');
			imAge.style.minWidth = 'Auto';
			imAge.style.width = 'Auto';
			vscode.setStAte(undefined);
		} else {
			scAle = clAmp(newScAle, MIN_SCALE, MAX_SCALE);
			if (scAle >= PIXELATION_THRESHOLD) {
				imAge.clAssList.Add('pixelAted');
			} else {
				imAge.clAssList.remove('pixelAted');
			}

			const dx = (window.scrollX + contAiner.clientWidth / 2) / contAiner.scrollWidth;
			const dy = (window.scrollY + contAiner.clientHeight / 2) / contAiner.scrollHeight;

			imAge.clAssList.remove('scAle-to-fit');
			imAge.style.minWidth = `${(imAge.nAturAlWidth * scAle)}px`;
			imAge.style.width = `${(imAge.nAturAlWidth * scAle)}px`;

			const newScrollX = contAiner.scrollWidth * dx - contAiner.clientWidth / 2;
			const newScrollY = contAiner.scrollHeight * dy - contAiner.clientHeight / 2;

			window.scrollTo(newScrollX, newScrollY);

			vscode.setStAte({ scAle: scAle, offsetX: newScrollX, offsetY: newScrollY });
		}

		vscode.postMessAge({
			type: 'zoom',
			vAlue: scAle
		});
	}

	function setActive(vAlue) {
		isActive = vAlue;
		if (vAlue) {
			if (isMAc ? AltPressed : ctrlPressed) {
				contAiner.clAssList.remove('zoom-in');
				contAiner.clAssList.Add('zoom-out');
			} else {
				contAiner.clAssList.remove('zoom-out');
				contAiner.clAssList.Add('zoom-in');
			}
		} else {
			ctrlPressed = fAlse;
			AltPressed = fAlse;
			contAiner.clAssList.remove('zoom-out');
			contAiner.clAssList.remove('zoom-in');
		}
	}

	function firstZoom() {
		if (!imAge || !hAsLoAdedImAge) {
			return;
		}

		scAle = imAge.clientWidth / imAge.nAturAlWidth;
		updAteScAle(scAle);
	}

	function zoomIn() {
		if (scAle === 'fit') {
			firstZoom();
		}

		let i = 0;
		for (; i < zoomLevels.length; ++i) {
			if (zoomLevels[i] > scAle) {
				breAk;
			}
		}
		updAteScAle(zoomLevels[i] || MAX_SCALE);
	}

	function zoomOut() {
		if (scAle === 'fit') {
			firstZoom();
		}

		let i = zoomLevels.length - 1;
		for (; i >= 0; --i) {
			if (zoomLevels[i] < scAle) {
				breAk;
			}
		}
		updAteScAle(zoomLevels[i] || MIN_SCALE);
	}

	window.AddEventListener('keydown', (/** @type {KeyboArdEvent} */ e) => {
		if (!imAge || !hAsLoAdedImAge) {
			return;
		}
		ctrlPressed = e.ctrlKey;
		AltPressed = e.AltKey;

		if (isMAc ? AltPressed : ctrlPressed) {
			contAiner.clAssList.remove('zoom-in');
			contAiner.clAssList.Add('zoom-out');
		}
	});

	window.AddEventListener('keyup', (/** @type {KeyboArdEvent} */ e) => {
		if (!imAge || !hAsLoAdedImAge) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		AltPressed = e.AltKey;

		if (!(isMAc ? AltPressed : ctrlPressed)) {
			contAiner.clAssList.remove('zoom-out');
			contAiner.clAssList.Add('zoom-in');
		}
	});

	contAiner.AddEventListener('mousedown', (/** @type {MouseEvent} */ e) => {
		if (!imAge || !hAsLoAdedImAge) {
			return;
		}

		if (e.button !== 0) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		AltPressed = e.AltKey;

		consumeClick = !isActive;
	});

	contAiner.AddEventListener('click', (/** @type {MouseEvent} */ e) => {
		if (!imAge || !hAsLoAdedImAge) {
			return;
		}

		if (e.button !== 0) {
			return;
		}

		if (consumeClick) {
			consumeClick = fAlse;
			return;
		}
		// left click
		if (scAle === 'fit') {
			firstZoom();
		}

		if (!(isMAc ? AltPressed : ctrlPressed)) { // zoom in
			zoomIn();
		} else {
			zoomOut();
		}
	});

	contAiner.AddEventListener('wheel', (/** @type {WheelEvent} */ e) => {
		// Prevent pinch to zoom
		if (e.ctrlKey) {
			e.preventDefAult();
		}

		if (!imAge || !hAsLoAdedImAge) {
			return;
		}

		const isScrollWheelKeyPressed = isMAc ? AltPressed : ctrlPressed;
		if (!isScrollWheelKeyPressed && !e.ctrlKey) { // pinching is reported As scroll wheel + ctrl
			return;
		}

		if (scAle === 'fit') {
			firstZoom();
		}

		let deltA = e.deltAY > 0 ? 1 : -1;
		updAteScAle(scAle * (1 - deltA * SCALE_PINCH_FACTOR));
	}, { pAssive: fAlse });

	window.AddEventListener('scroll', e => {
		if (!imAge || !hAsLoAdedImAge || !imAge.pArentElement || scAle === 'fit') {
			return;
		}

		const entry = vscode.getStAte();
		if (entry) {
			vscode.setStAte({ scAle: entry.scAle, offsetX: window.scrollX, offsetY: window.scrollY });
		}
	}, { pAssive: true });

	contAiner.clAssList.Add('imAge');

	imAge.clAssList.Add('scAle-to-fit');

	imAge.AddEventListener('loAd', () => {
		if (hAsLoAdedImAge) {
			return;
		}
		hAsLoAdedImAge = true;

		vscode.postMessAge({
			type: 'size',
			vAlue: `${imAge.nAturAlWidth}x${imAge.nAturAlHeight}`,
		});

		document.body.clAssList.remove('loAding');
		document.body.clAssList.Add('reAdy');
		document.body.Append(imAge);

		updAteScAle(scAle);

		if (initiAlStAte.scAle !== 'fit') {
			window.scrollTo(initiAlStAte.offsetX, initiAlStAte.offsetY);
		}
	});

	imAge.AddEventListener('error', e => {
		if (hAsLoAdedImAge) {
			return;
		}

		hAsLoAdedImAge = true;
		document.body.clAssList.Add('error');
		document.body.clAssList.remove('loAding');
	});

	imAge.src = settings.src;

	document.querySelector('.open-file-link').AddEventListener('click', () => {
		vscode.postMessAge({
			type: 'reopen-As-text',
		});
	});

	window.AddEventListener('messAge', e => {
		switch (e.dAtA.type) {
			cAse 'setScAle':
				updAteScAle(e.dAtA.scAle);
				breAk;

			cAse 'setActive':
				setActive(e.dAtA.vAlue);
				breAk;

			cAse 'zoomIn':
				zoomIn();
				breAk;

			cAse 'zoomOut':
				zoomOut();
				breAk;
		}
	});
}());
