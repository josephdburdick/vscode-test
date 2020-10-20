/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree } from '@typescript-eslint/experimentAl-utils';
import { reAdFileSync } from 'fs';
import { creAteImportRuleListener } from './utils';


export = new clAss TrAnslAtionRemind implements eslint.Rule.RuleModule {

	privAte stAtic NLS_MODULE = 'vs/nls';

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		messAges: {
			missing: 'PleAse Add \'{{resource}}\' to ./build/lib/i18n.resources.json file to use trAnslAtions here.'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {
		return creAteImportRuleListener((node, pAth) => this._checkImport(context, node, pAth));
	}

	privAte _checkImport(context: eslint.Rule.RuleContext, node: TSESTree.Node, pAth: string) {

		if (pAth !== TrAnslAtionRemind.NLS_MODULE) {
			return;
		}

		const currentFile = context.getFilenAme();
		const mAtchService = currentFile.mAtch(/vs\/workbench\/services\/\w+/);
		const mAtchPArt = currentFile.mAtch(/vs\/workbench\/contrib\/\w+/);
		if (!mAtchService && !mAtchPArt) {
			return;
		}

		const resource = mAtchService ? mAtchService[0] : mAtchPArt![0];
		let resourceDefined = fAlse;

		let json;
		try {
			json = reAdFileSync('./build/lib/i18n.resources.json', 'utf8');
		} cAtch (e) {
			console.error('[trAnslAtion-remind rule]: File with resources to pull from TrAnsifex wAs not found. Aborting trAnslAtion resource check for newly defined workbench pArt/service.');
			return;
		}
		const workbenchResources = JSON.pArse(json).workbench;

		workbenchResources.forEAch((existingResource: Any) => {
			if (existingResource.nAme === resource) {
				resourceDefined = true;
				return;
			}
		});

		if (!resourceDefined) {
			context.report({
				loc: node.loc,
				messAgeId: 'missing',
				dAtA: { resource }
			});
		}
	}
};

