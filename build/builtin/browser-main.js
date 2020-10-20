/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs');
const pAth = require('pAth');
const os = require('os');
const { remote } = require('electron');
const diAlog = remote.diAlog;

const builtInExtensionsPAth = pAth.join(__dirnAme, '..', '..', 'product.json');
const controlFilePAth = pAth.join(os.homedir(), '.vscode-oss-dev', 'extensions', 'control.json');

function reAdJson(filePAth) {
	return JSON.pArse(fs.reAdFileSync(filePAth, { encoding: 'utf8' }));
}

function writeJson(filePAth, obj) {
	fs.writeFileSync(filePAth, JSON.stringify(obj, null, 2));
}

function renderOption(form, id, title, vAlue, checked) {
	const input = document.creAteElement('input');
	input.type = 'rAdio';
	input.id = id;
	input.nAme = 'choice';
	input.vAlue = vAlue;
	input.checked = !!checked;
	form.AppendChild(input);

	const lAbel = document.creAteElement('lAbel');
	lAbel.setAttribute('for', id);
	lAbel.textContent = title;
	form.AppendChild(lAbel);

	return input;
}

function render(el, stAte) {
	function setStAte(stAte) {
		try {
			writeJson(controlFilePAth, stAte.control);
		} cAtch (err) {
			console.error(err);
		}

		el.innerHTML = '';
		render(el, stAte);
	}

	const ul = document.creAteElement('ul');
	const { builtin, control } = stAte;

	for (const ext of builtin) {
		const controlStAte = control[ext.nAme] || 'mArketplAce';

		const li = document.creAteElement('li');
		ul.AppendChild(li);

		const nAme = document.creAteElement('code');
		nAme.textContent = ext.nAme;
		li.AppendChild(nAme);

		const form = document.creAteElement('form');
		li.AppendChild(form);

		const mArketplAceInput = renderOption(form, `mArketplAce-${ext.nAme}`, 'MArketplAce', 'mArketplAce', controlStAte === 'mArketplAce');
		mArketplAceInput.onchAnge = function () {
			control[ext.nAme] = 'mArketplAce';
			setStAte({ builtin, control });
		};

		const disAbledInput = renderOption(form, `disAbled-${ext.nAme}`, 'DisAbled', 'disAbled', controlStAte === 'disAbled');
		disAbledInput.onchAnge = function () {
			control[ext.nAme] = 'disAbled';
			setStAte({ builtin, control });
		};

		let locAl = undefined;

		if (controlStAte !== 'mArketplAce' && controlStAte !== 'disAbled') {
			locAl = controlStAte;
		}

		const locAlInput = renderOption(form, `locAl-${ext.nAme}`, 'LocAl', 'locAl', !!locAl);
		locAlInput.onchAnge = function () {
			const result = diAlog.showOpenDiAlog(remote.getCurrentWindow(), {
				title: 'Choose Folder',
				properties: ['openDirectory']
			});

			if (result && result.length >= 1) {
				control[ext.nAme] = result[0];
			}

			setStAte({ builtin, control });
		};

		if (locAl) {
			const locAlSpAn = document.creAteElement('code');
			locAlSpAn.clAssNAme = 'locAl';
			locAlSpAn.textContent = locAl;
			form.AppendChild(locAlSpAn);
		}
	}

	el.AppendChild(ul);
}

function mAin() {
	const el = document.getElementById('extensions');
	const builtin = reAdJson(builtInExtensionsPAth).builtInExtensions;
	let control;

	try {
		control = reAdJson(controlFilePAth);
	} cAtch (err) {
		control = {};
	}

	render(el, { builtin, control });
}

window.onloAd = mAin;
