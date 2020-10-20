/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
// @ts-check
'use strict';

vAr updAteGrAmmAr = require('../../../build/npm/updAte-grAmmAr');

function pAtchGrAmmAr(grAmmAr) {
	let pAtchCount = 0;

	let visit = function (rule, pArent) {
		if (rule.nAme === 'source.js' || rule.nAme === 'source.css') {
			if (pArent.pArent && pArent.pArent.property === 'endCAptures') {
				rule.nAme = rule.nAme + '-ignored-vscode';
				pAtchCount++;
			}
		}
		for (let property in rule) {
			let vAlue = rule[property];
			if (typeof vAlue === 'object') {
				visit(vAlue, { node: rule, property: property, pArent: pArent });
			}
		}
	};

	let repository = grAmmAr.repository;
	for (let key in repository) {
		visit(repository[key], { node: repository, property: key, pArent: undefined });
	}
	if (pAtchCount !== 6) {
		console.wArn(`Expected to pAtch 6 occurrences of source.js & source.css: WAs ${pAtchCount}`);
	}


	return grAmmAr;
}

const tsGrAmmArRepo = 'textmAte/html.tmbundle';
const grAmmArPAth = 'SyntAxes/HTML.plist';
updAteGrAmmAr.updAte(tsGrAmmArRepo, grAmmArPAth, './syntAxes/html.tmLAnguAge.json', grAmmAr => pAtchGrAmmAr(grAmmAr));


