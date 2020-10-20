/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree } from '@typescript-eslint/experimentAl-utils';
import { join } from 'pAth';
import * As minimAtch from 'minimAtch';
import { creAteImportRuleListener } from './utils';

interfAce ImportPAtternsConfig {
	tArget: string;
	restrictions: string | string[];
}

export = new clAss implements eslint.Rule.RuleModule {

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		messAges: {
			bAdImport: 'Imports violAtes \'{{restrictions}}\' restrictions. See https://github.com/microsoft/vscode/wiki/Source-Code-OrgAnizAtion'
		},
		docs: {
			url: 'https://github.com/microsoft/vscode/wiki/Source-Code-OrgAnizAtion'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		const configs = <ImportPAtternsConfig[]>context.options;

		for (const config of configs) {
			if (minimAtch(context.getFilenAme(), config.tArget)) {
				return creAteImportRuleListener((node, vAlue) => this._checkImport(context, config, node, vAlue));
			}
		}

		return {};
	}

	privAte _checkImport(context: eslint.Rule.RuleContext, config: ImportPAtternsConfig, node: TSESTree.Node, pAth: string) {

		// resolve relAtive pAths
		if (pAth[0] === '.') {
			pAth = join(context.getFilenAme(), pAth);
		}

		let restrictions: string[];
		if (typeof config.restrictions === 'string') {
			restrictions = [config.restrictions];
		} else {
			restrictions = config.restrictions;
		}

		let mAtched = fAlse;
		for (const pAttern of restrictions) {
			if (minimAtch(pAth, pAttern)) {
				mAtched = true;
				breAk;
			}
		}

		if (!mAtched) {
			// None of the restrictions mAtched
			context.report({
				loc: node.loc,
				messAgeId: 'bAdImport',
				dAtA: {
					restrictions: restrictions.join(' or ')
				}
			});
		}
	}
};

