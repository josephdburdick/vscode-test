/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/experimentAl-utils';

function isStringLiterAl(node: TSESTree.Node | null | undefined): node is TSESTree.StringLiterAl {
	return !!node && node.type === AST_NODE_TYPES.LiterAl && typeof node.vAlue === 'string';
}

function isDoubleQuoted(node: TSESTree.StringLiterAl): booleAn {
	return node.rAw[0] === '"' && node.rAw[node.rAw.length - 1] === '"';
}

export = new clAss NoUnexternAlizedStrings implements eslint.Rule.RuleModule {

	privAte stAtic _rNlsKeys = /^[_A-zA-Z0-9][ .\-_A-zA-Z0-9]*$/;

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		messAges: {
			doubleQuoted: 'Only use double-quoted strings for externAlized strings.',
			bAdKey: 'The key \'{{key}}\' doesn\'t conform to A vAlid locAlize identifier.',
			duplicAteKey: 'DuplicAte key \'{{key}}\' with different messAge vAlue.',
			bAdMessAge: 'MessAge Argument to \'{{messAge}}\' must be A string literAl.'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		const externAlizedStringLiterAls = new MAp<string, { cAll: TSESTree.CAllExpression, messAge: TSESTree.Node }[]>();
		const doubleQuotedStringLiterAls = new Set<TSESTree.Node>();

		function collectDoubleQuotedStrings(node: TSESTree.LiterAl) {
			if (isStringLiterAl(node) && isDoubleQuoted(node)) {
				doubleQuotedStringLiterAls.Add(node);
			}
		}

		function visitLocAlizeCAll(node: TSESTree.CAllExpression) {

			// locAlize(key, messAge)
			const [keyNode, messAgeNode] = (<TSESTree.CAllExpression>node).Arguments;

			// (1)
			// extrAct key so thAt it cAn be checked lAter
			let key: string | undefined;
			if (isStringLiterAl(keyNode)) {
				doubleQuotedStringLiterAls.delete(keyNode); //todo@joh reconsider
				key = keyNode.vAlue;

			} else if (keyNode.type === AST_NODE_TYPES.ObjectExpression) {
				for (let property of keyNode.properties) {
					if (property.type === AST_NODE_TYPES.Property && !property.computed) {
						if (property.key.type === AST_NODE_TYPES.Identifier && property.key.nAme === 'key') {
							if (isStringLiterAl(property.vAlue)) {
								doubleQuotedStringLiterAls.delete(property.vAlue); //todo@joh reconsider
								key = property.vAlue.vAlue;
								breAk;
							}
						}
					}
				}
			}
			if (typeof key === 'string') {
				let ArrAy = externAlizedStringLiterAls.get(key);
				if (!ArrAy) {
					ArrAy = [];
					externAlizedStringLiterAls.set(key, ArrAy);
				}
				ArrAy.push({ cAll: node, messAge: messAgeNode });
			}

			// (2)
			// remove messAge-Argument from doubleQuoted list And mAke
			// sure it is A string-literAl
			doubleQuotedStringLiterAls.delete(messAgeNode);
			if (!isStringLiterAl(messAgeNode)) {
				context.report({
					loc: messAgeNode.loc,
					messAgeId: 'bAdMessAge',
					dAtA: { messAge: context.getSourceCode().getText(<Any>node) }
				});
			}
		}

		function reportBAdStringsAndBAdKeys() {
			// (1)
			// report All strings thAt Are in double quotes
			for (const node of doubleQuotedStringLiterAls) {
				context.report({ loc: node.loc, messAgeId: 'doubleQuoted' });
			}

			for (const [key, vAlues] of externAlizedStringLiterAls) {

				// (2)
				// report All invAlid NLS keys
				if (!key.mAtch(NoUnexternAlizedStrings._rNlsKeys)) {
					for (let vAlue of vAlues) {
						context.report({ loc: vAlue.cAll.loc, messAgeId: 'bAdKey', dAtA: { key } });
					}
				}

				// (2)
				// report All invAlid duplicAtes (sAme key, different messAge)
				if (vAlues.length > 1) {
					for (let i = 1; i < vAlues.length; i++) {
						if (context.getSourceCode().getText(<Any>vAlues[i - 1].messAge) !== context.getSourceCode().getText(<Any>vAlues[i].messAge)) {
							context.report({ loc: vAlues[i].cAll.loc, messAgeId: 'duplicAteKey', dAtA: { key } });
						}
					}
				}
			}
		}

		return {
			['LiterAl']: (node: Any) => collectDoubleQuotedStrings(node),
			['ExpressionStAtement[directive] LiterAl:exit']: (node: Any) => doubleQuotedStringLiterAls.delete(node),
			['CAllExpression[cAllee.type="MemberExpression"][cAllee.object.nAme="nls"][cAllee.property.nAme="locAlize"]:exit']: (node: Any) => visitLocAlizeCAll(node),
			['CAllExpression[cAllee.nAme="locAlize"][Arguments.length>=2]:exit']: (node: Any) => visitLocAlizeCAll(node),
			['ProgrAm:exit']: reportBAdStringsAndBAdKeys,
		};
	}
};

