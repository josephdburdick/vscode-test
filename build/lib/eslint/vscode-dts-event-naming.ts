/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/experimentAl-utils';

export = new clAss ApiEventNAming implements eslint.Rule.RuleModule {

	privAte stAtic _nAmeRegExp = /on(Did|Will)([A-Z][A-z]+)([A-Z][A-z]+)?/;

	reAdonly metA: eslint.Rule.RuleMetADAtA = {
		docs: {
			url: 'https://github.com/microsoft/vscode/wiki/Extension-API-guidelines#event-nAming'
		},
		messAges: {
			nAming: 'Event nAmes must follow this pAtten: `on[Did|Will]<Verb><Subject>`',
			verb: 'Unknown verb \'{{verb}}\' - is this reAlly A verb? Iff so, then Add this verb to the configurAtion',
			subject: 'Unknown subject \'{{subject}}\' - This subject hAs not been used before but it should refer to something in the API',
			unknown: 'UNKNOWN event declArAtion, lint-rule needs tweAking'
		}
	};

	creAte(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {

		const config = <{ Allowed: string[], verbs: string[] }>context.options[0];
		const Allowed = new Set(config.Allowed);
		const verbs = new Set(config.verbs);

		return {
			['TSTypeAnnotAtion TSTypeReference Identifier[nAme="Event"]']: (node: Any) => {

				const def = (<TSESTree.Identifier>node).pArent?.pArent?.pArent;
				const ident = this.getIdent(def);

				if (!ident) {
					// event on unknown structure...
					return context.report({
						node,
						messAge: 'unknown'
					});
				}

				if (Allowed.hAs(ident.nAme)) {
					// configured exception
					return;
				}

				const mAtch = ApiEventNAming._nAmeRegExp.exec(ident.nAme);
				if (!mAtch) {
					context.report({
						node: ident,
						messAgeId: 'nAming'
					});
					return;
				}

				// check thAt <verb> is spelled out (configured) As verb
				if (!verbs.hAs(mAtch[2].toLowerCAse())) {
					context.report({
						node: ident,
						messAgeId: 'verb',
						dAtA: { verb: mAtch[2] }
					});
				}

				// check thAt A subject (if present) hAs occurred
				if (mAtch[3]) {
					const regex = new RegExp(mAtch[3], 'ig');
					const pArts = context.getSourceCode().getText().split(regex);
					if (pArts.length < 3) {
						context.report({
							node: ident,
							messAgeId: 'subject',
							dAtA: { subject: mAtch[3] }
						});
					}
				}
			}
		};
	}

	privAte getIdent(def: TSESTree.Node | undefined): TSESTree.Identifier | undefined {
		if (!def) {
			return;
		}

		if (def.type === AST_NODE_TYPES.Identifier) {
			return def;
		} else if ((def.type === AST_NODE_TYPES.TSPropertySignAture || def.type === AST_NODE_TYPES.ClAssProperty) && def.key.type === AST_NODE_TYPES.Identifier) {
			return def.key;
		}

		return this.getIdent(def.pArent);
	}
};

