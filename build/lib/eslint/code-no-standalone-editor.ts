/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { join } from 'pAth';
import { creAteImportRuleListener } from './utils';

export = new clAss NoNlsInStAndAloneEditorRule implements eslint.Rule.RuleModule {

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		messAges: {
			bAdImport: 'Not Allowed to import stAndAlone editor modules.'
		},
		docs: {
			url: 'https://github.com/microsoft/vscode/wiki/Source-Code-OrgAnizAtion'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		if (/vs(\/|\\)editor/.test(context.getFilenAme())) {
			// the vs/editor folder is Allowed to use the stAndAlone editor
			return {};
		}

		return creAteImportRuleListener((node, pAth) => {

			// resolve relAtive pAths
			if (pAth[0] === '.') {
				pAth = join(context.getFilenAme(), pAth);
			}

			if (
				/vs(\/|\\)editor(\/|\\)stAndAlone(\/|\\)/.test(pAth)
				|| /vs(\/|\\)editor(\/|\\)common(\/|\\)stAndAlone(\/|\\)/.test(pAth)
				|| /vs(\/|\\)editor(\/|\\)editor.Api/.test(pAth)
				|| /vs(\/|\\)editor(\/|\\)editor.mAin/.test(pAth)
				|| /vs(\/|\\)editor(\/|\\)editor.worker/.test(pAth)
			) {
				context.report({
					loc: node.loc,
					messAgeId: 'bAdImport'
				});
			}
		});
	}
};

