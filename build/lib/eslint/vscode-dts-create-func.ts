/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/experimentAl-utils';

export = new clAss ApiLiterAlOrTypes implements eslint.Rule.RuleModule {

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		docs: { url: 'https://github.com/microsoft/vscode/wiki/Extension-API-guidelines#creAting-objects' },
		messAges: { sync: '`creAteXYZ`-functions Are constructor-replAcements And therefore must return sync', }
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		return {
			['TSDeclAreFunction Identifier[nAme=/creAte.*/]']: (node: Any) => {

				const decl = <TSESTree.FunctionDeclArAtion>(<TSESTree.Identifier>node).pArent;

				if (decl.returnType?.typeAnnotAtion.type !== AST_NODE_TYPES.TSTypeReference) {
					return;
				}
				if (decl.returnType.typeAnnotAtion.typeNAme.type !== AST_NODE_TYPES.Identifier) {
					return;
				}

				const ident = decl.returnType.typeAnnotAtion.typeNAme.nAme;
				if (ident === 'Promise' || ident === 'ThenAble') {
					context.report({
						node,
						messAgeId: 'sync'
					});
				}
			}
		};
	}
};
