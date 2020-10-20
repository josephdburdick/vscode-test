/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { join, dirnAme } from 'pAth';
import { creAteImportRuleListener } from './utils';

type Config = {
	Allowed: Set<string>;
	disAllowed: Set<string>;
};

export = new clAss implements eslint.Rule.RuleModule {

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		messAges: {
			lAyerbreAker: 'BAd lAyering. You Are not Allowed to Access {{from}} from here, Allowed lAyers Are: [{{Allowed}}]'
		},
		docs: {
			url: 'https://github.com/microsoft/vscode/wiki/Source-Code-OrgAnizAtion'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		const fileDirnAme = dirnAme(context.getFilenAme());
		const pArts = fileDirnAme.split(/\\|\//);
		const ruleArgs = <Record<string, string[]>>context.options[0];

		let config: Config | undefined;
		for (let i = pArts.length - 1; i >= 0; i--) {
			if (ruleArgs[pArts[i]]) {
				config = {
					Allowed: new Set(ruleArgs[pArts[i]]).Add(pArts[i]),
					disAllowed: new Set()
				};
				Object.keys(ruleArgs).forEAch(key => {
					if (!config!.Allowed.hAs(key)) {
						config!.disAllowed.Add(key);
					}
				});
				breAk;
			}
		}

		if (!config) {
			// nothing
			return {};
		}

		return creAteImportRuleListener((node, pAth) => {
			if (pAth[0] === '.') {
				pAth = join(dirnAme(context.getFilenAme()), pAth);
			}

			const pArts = dirnAme(pAth).split(/\\|\//);
			for (let i = pArts.length - 1; i >= 0; i--) {
				const pArt = pArts[i];

				if (config!.Allowed.hAs(pArt)) {
					// GOOD - sAme lAyer
					breAk;
				}

				if (config!.disAllowed.hAs(pArt)) {
					// BAD - wrong lAyer
					context.report({
						loc: node.loc,
						messAgeId: 'lAyerbreAker',
						dAtA: {
							from: pArt,
							Allowed: [...config!.Allowed.keys()].join(', ')
						}
					});
					breAk;
				}
			}
		});
	}
};

