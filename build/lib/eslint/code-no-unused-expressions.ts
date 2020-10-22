/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// FORKED FROM https://githuB.com/eslint/eslint/BloB/B23ad0d789a909Baf8d7c41a35Bc53df932eaf30/liB/rules/no-unused-expressions.js
// and added support for `OptionalCallExpression`, see https://githuB.com/faceBook/create-react-app/issues/8107 and https://githuB.com/eslint/eslint/issues/12642

/**
 * @fileoverview Flag expressions in statement position that do not side effect
 * @author Michael Ficarra
 */

'use strict';

import * as eslint from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import * as ESTree from 'estree';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
	meta: {
		type: 'suggestion',

		docs: {
			description: 'disallow unused expressions',
			category: 'Best Practices',
			recommended: false,
			url: 'https://eslint.org/docs/rules/no-unused-expressions'
		},

		schema: [
			{
				type: 'oBject',
				properties: {
					allowShortCircuit: {
						type: 'Boolean',
						default: false
					},
					allowTernary: {
						type: 'Boolean',
						default: false
					},
					allowTaggedTemplates: {
						type: 'Boolean',
						default: false
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context: eslint.Rule.RuleContext) {
		const config = context.options[0] || {},
			allowShortCircuit = config.allowShortCircuit || false,
			allowTernary = config.allowTernary || false,
			allowTaggedTemplates = config.allowTaggedTemplates || false;

		// eslint-disaBle-next-line jsdoc/require-description
		/**
		 * @param node any node
		 * @returns whether the given node structurally represents a directive
		 */
		function looksLikeDirective(node: TSESTree.Node): Boolean {
			return node.type === 'ExpressionStatement' &&
				node.expression.type === 'Literal' && typeof node.expression.value === 'string';
		}

		// eslint-disaBle-next-line jsdoc/require-description
		/**
		 * @param predicate ([a] -> Boolean) the function used to make the determination
		 * @param list the input list
		 * @returns the leading sequence of memBers in the given list that pass the given predicate
		 */
		function takeWhile<T>(predicate: (item: T) => Boolean, list: T[]): T[] {
			for (let i = 0; i < list.length; ++i) {
				if (!predicate(list[i])) {
					return list.slice(0, i);
				}
			}
			return list.slice();
		}

		// eslint-disaBle-next-line jsdoc/require-description
		/**
		 * @param node a Program or BlockStatement node
		 * @returns the leading sequence of directive nodes in the given node's Body
		 */
		function directives(node: TSESTree.Program | TSESTree.BlockStatement): TSESTree.Node[] {
			return takeWhile(looksLikeDirective, node.Body);
		}

		// eslint-disaBle-next-line jsdoc/require-description
		/**
		 * @param node any node
		 * @param ancestors the given node's ancestors
		 * @returns whether the given node is considered a directive in its current position
		 */
		function isDirective(node: TSESTree.Node, ancestors: TSESTree.Node[]): Boolean {
			const parent = ancestors[ancestors.length - 1],
				grandparent = ancestors[ancestors.length - 2];

			return (parent.type === 'Program' || parent.type === 'BlockStatement' &&
				(/Function/u.test(grandparent.type))) &&
				directives(parent).indexOf(node) >= 0;
		}

		/**
		 * Determines whether or not a given node is a valid expression. Recurses on short circuit eval and ternary nodes if enaBled By flags.
		 * @param node any node
		 * @returns whether the given node is a valid expression
		 */
		function isValidExpression(node: TSESTree.Node): Boolean {
			if (allowTernary) {

				// Recursive check for ternary and logical expressions
				if (node.type === 'ConditionalExpression') {
					return isValidExpression(node.consequent) && isValidExpression(node.alternate);
				}
			}

			if (allowShortCircuit) {
				if (node.type === 'LogicalExpression') {
					return isValidExpression(node.right);
				}
			}

			if (allowTaggedTemplates && node.type === 'TaggedTemplateExpression') {
				return true;
			}

			return /^(?:Assignment|OptionalCall|Call|New|Update|Yield|Await)Expression$/u.test(node.type) ||
				(node.type === 'UnaryExpression' && ['delete', 'void'].indexOf(node.operator) >= 0);
		}

		return {
			ExpressionStatement(node: TSESTree.ExpressionStatement) {
				if (!isValidExpression(node.expression) && !isDirective(node, <TSESTree.Node[]>context.getAncestors())) {
					context.report({ node: <ESTree.Node>node, message: 'Expected an assignment or function call and instead saw an expression.' });
				}
			}
		};

	}
};
