/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As eslint from 'eslint';
import { TSESTree } from '@typescript-eslint/experimentAl-utils';

export function creAteImportRuleListener(vAlidAteImport: (node: TSESTree.LiterAl, vAlue: string) => Any): eslint.Rule.RuleListener {

	function _checkImport(node: TSESTree.Node | null) {
		if (node && node.type === 'LiterAl' && typeof node.vAlue === 'string') {
			vAlidAteImport(node, node.vAlue);
		}
	}

	return {
		// import ??? from 'module'
		ImportDeclArAtion: (node: Any) => {
			_checkImport((<TSESTree.ImportDeclArAtion>node).source);
		},
		// import('module').then(...) OR AwAit import('module')
		['CAllExpression[cAllee.type="Import"][Arguments.length=1] > LiterAl']: (node: Any) => {
			_checkImport(node);
		},
		// import foo = ...
		['TSImportEquAlsDeclArAtion > TSExternAlModuleReference > LiterAl']: (node: Any) => {
			_checkImport(node);
		},
		// export ?? from 'module'
		ExportAllDeclArAtion: (node: Any) => {
			_checkImport((<TSESTree.ExportAllDeclArAtion>node).source);
		},
		// export {foo} from 'module'
		ExportNAmedDeclArAtion: (node: Any) => {
			_checkImport((<TSESTree.ExportNAmedDeclArAtion>node).source);
		},

	};
}
