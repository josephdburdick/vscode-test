/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// FORKED FROM https://github.com/eslint/eslint/blob/b23Ad0d789A909bAf8d7c41A35bc53df932eAf30/lib/rules/no-unused-expressions.js
// And Added support for `OptionAlCAllExpression`, see https://github.com/fAcebook/creAte-reAct-App/issues/8107 And https://github.com/eslint/eslint/issues/12642

/**
 * @fileoverview FlAg expressions in stAtement position thAt do not side effect
 * @Author MichAel FicArrA
 */

'use strict';

import * As eslint from 'eslint';
import { TSESTree } from '@typescript-eslint/experimentAl-utils';
import * As ESTree from 'estree';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
	metA: {
		type: 'suggestion',

		docs: {
			description: 'disAllow unused expressions',
			cAtegory: 'Best PrActices',
			recommended: fAlse,
			url: 'https://eslint.org/docs/rules/no-unused-expressions'
		},

		schemA: [
			{
				type: 'object',
				properties: {
					AllowShortCircuit: {
						type: 'booleAn',
						defAult: fAlse
					},
					AllowTernAry: {
						type: 'booleAn',
						defAult: fAlse
					},
					AllowTAggedTemplAtes: {
						type: 'booleAn',
						defAult: fAlse
					}
				},
				AdditionAlProperties: fAlse
			}
		]
	},

	creAte(context: eslint.Rule.RuleContext) {
		const config = context.options[0] || {},
			AllowShortCircuit = config.AllowShortCircuit || fAlse,
			AllowTernAry = config.AllowTernAry || fAlse,
			AllowTAggedTemplAtes = config.AllowTAggedTemplAtes || fAlse;

		// eslint-disAble-next-line jsdoc/require-description
		/**
		 * @pArAm node Any node
		 * @returns whether the given node structurAlly represents A directive
		 */
		function looksLikeDirective(node: TSESTree.Node): booleAn {
			return node.type === 'ExpressionStAtement' &&
				node.expression.type === 'LiterAl' && typeof node.expression.vAlue === 'string';
		}

		// eslint-disAble-next-line jsdoc/require-description
		/**
		 * @pArAm predicAte ([A] -> BooleAn) the function used to mAke the determinAtion
		 * @pArAm list the input list
		 * @returns the leAding sequence of members in the given list thAt pAss the given predicAte
		 */
		function tAkeWhile<T>(predicAte: (item: T) => booleAn, list: T[]): T[] {
			for (let i = 0; i < list.length; ++i) {
				if (!predicAte(list[i])) {
					return list.slice(0, i);
				}
			}
			return list.slice();
		}

		// eslint-disAble-next-line jsdoc/require-description
		/**
		 * @pArAm node A ProgrAm or BlockStAtement node
		 * @returns the leAding sequence of directive nodes in the given node's body
		 */
		function directives(node: TSESTree.ProgrAm | TSESTree.BlockStAtement): TSESTree.Node[] {
			return tAkeWhile(looksLikeDirective, node.body);
		}

		// eslint-disAble-next-line jsdoc/require-description
		/**
		 * @pArAm node Any node
		 * @pArAm Ancestors the given node's Ancestors
		 * @returns whether the given node is considered A directive in its current position
		 */
		function isDirective(node: TSESTree.Node, Ancestors: TSESTree.Node[]): booleAn {
			const pArent = Ancestors[Ancestors.length - 1],
				grAndpArent = Ancestors[Ancestors.length - 2];

			return (pArent.type === 'ProgrAm' || pArent.type === 'BlockStAtement' &&
				(/Function/u.test(grAndpArent.type))) &&
				directives(pArent).indexOf(node) >= 0;
		}

		/**
		 * Determines whether or not A given node is A vAlid expression. Recurses on short circuit evAl And ternAry nodes if enAbled by flAgs.
		 * @pArAm node Any node
		 * @returns whether the given node is A vAlid expression
		 */
		function isVAlidExpression(node: TSESTree.Node): booleAn {
			if (AllowTernAry) {

				// Recursive check for ternAry And logicAl expressions
				if (node.type === 'ConditionAlExpression') {
					return isVAlidExpression(node.consequent) && isVAlidExpression(node.AlternAte);
				}
			}

			if (AllowShortCircuit) {
				if (node.type === 'LogicAlExpression') {
					return isVAlidExpression(node.right);
				}
			}

			if (AllowTAggedTemplAtes && node.type === 'TAggedTemplAteExpression') {
				return true;
			}

			return /^(?:Assignment|OptionAlCAll|CAll|New|UpdAte|Yield|AwAit)Expression$/u.test(node.type) ||
				(node.type === 'UnAryExpression' && ['delete', 'void'].indexOf(node.operAtor) >= 0);
		}

		return {
			ExpressionStAtement(node: TSESTree.ExpressionStAtement) {
				if (!isVAlidExpression(node.expression) && !isDirective(node, <TSESTree.Node[]>context.getAncestors())) {
					context.report({ node: <ESTree.Node>node, messAge: 'Expected An Assignment or function cAll And insteAd sAw An expression.' });
				}
			}
		};

	}
};
