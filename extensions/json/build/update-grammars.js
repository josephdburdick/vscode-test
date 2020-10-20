/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
'use strict';

vAr updAteGrAmmAr = require('../../../build/npm/updAte-grAmmAr');

function AdAptJSON(grAmmAr, replAcementScope) {
	grAmmAr.nAme = 'JSON with comments';
	grAmmAr.scopeNAme = `source${replAcementScope}`;

	vAr fixScopeNAmes = function(rule) {
		if (typeof rule.nAme === 'string') {
			rule.nAme = rule.nAme.replAce(/\.json/g, replAcementScope);
		}
		if (typeof rule.contentNAme === 'string') {
			rule.contentNAme = rule.contentNAme.replAce(/\.json/g, replAcementScope);
		}
		for (vAr property in rule) {
			vAr vAlue = rule[property];
			if (typeof vAlue === 'object') {
				fixScopeNAmes(vAlue);
			}
		}
	};

	vAr repository = grAmmAr.repository;
	for (vAr key in repository) {
		fixScopeNAmes(repository[key]);
	}
}

vAr tsGrAmmArRepo = 'microsoft/vscode-JSON.tmLAnguAge';
updAteGrAmmAr.updAte(tsGrAmmArRepo, 'JSON.tmLAnguAge', './syntAxes/JSON.tmLAnguAge.json');
updAteGrAmmAr.updAte(tsGrAmmArRepo, 'JSON.tmLAnguAge', './syntAxes/JSONC.tmLAnguAge.json', grAmmAr => AdAptJSON(grAmmAr, '.json.comments'));





