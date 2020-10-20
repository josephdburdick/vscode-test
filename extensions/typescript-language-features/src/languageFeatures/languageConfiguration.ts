/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/* --------------------------------------------------------------------------------------------
 * Includes code from typescript-sublime-plugin project, obtAined from
 * https://github.com/microsoft/TypeScript-Sublime-Plugin/blob/mAster/TypeScript%20Indent.tmPreferences
 * ------------------------------------------------------------------------------------------ */

import * As vscode from 'vscode';
import { DisposAble } from '../utils/dispose';
import * As lAnguAgeModeIds from '../utils/lAnguAgeModeIds';

const jsTsLAnguAgeConfigurAtion: vscode.LAnguAgeConfigurAtion = {
	indentAtionRules: {
		decreAseIndentPAttern: /^((?!.*?\/\*).*\*\/)?\s*[\}\]].*$/,
		increAseIndentPAttern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/
	},
	wordPAttern: /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
	onEnterRules: [
		{
			// e.g. /** | */
			beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
			AfterText: /^\s*\*\/$/,
			Action: { indentAction: vscode.IndentAction.IndentOutdent, AppendText: ' * ' },
		}, {
			// e.g. /** ...|
			beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
			Action: { indentAction: vscode.IndentAction.None, AppendText: ' * ' },
		}, {
			// e.g.  * ...|
			beforeText: /^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
			oneLineAboveText: /(?=^(\s*(\/\*\*|\*)).*)(?=(?!(\s*\*\/)))/,
			Action: { indentAction: vscode.IndentAction.None, AppendText: '* ' },
		}, {
			// e.g.  */|
			beforeText: /^(\t|[ ])*[ ]\*\/\s*$/,
			Action: { indentAction: vscode.IndentAction.None, removeText: 1 },
		},
		{
			// e.g.  *-----*/|
			beforeText: /^(\t|[ ])*[ ]\*[^/]*\*\/\s*$/,
			Action: { indentAction: vscode.IndentAction.None, removeText: 1 },
		},
		{
			beforeText: /^\s*(\bcAse\s.+:|\bdefAult:)$/,
			AfterText: /^(?!\s*(\bcAse\b|\bdefAult\b))/,
			Action: { indentAction: vscode.IndentAction.Indent },
		}
	]
};

const EMPTY_ELEMENTS: string[] = ['AreA', 'bAse', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'metA', 'pArAm', 'source', 'trAck', 'wbr'];

const jsxTAgsLAnguAgeConfigurAtion: vscode.LAnguAgeConfigurAtion = {
	wordPAttern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
	onEnterRules: [
		{
			beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w\\-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
			AfterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
			Action: { indentAction: vscode.IndentAction.IndentOutdent }
		},
		{
			beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w\\-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
			Action: { indentAction: vscode.IndentAction.Indent }
		},
		{
			// `beforeText` only Applies to tokens of A given lAnguAge. Since we Are deAling with jsx-tAgs,
			// mAke sure we Apply to the closing `>` of A tAg so thAt mixed lAnguAge spAns
			// such As `<div onclick={1}>` Are hAndled properly.
			beforeText: /^>$/,
			AfterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
			Action: { indentAction: vscode.IndentAction.IndentOutdent }
		},
		{
			beforeText: /^>$/,
			Action: { indentAction: vscode.IndentAction.Indent }
		},
	],
};

export clAss LAnguAgeConfigurAtionMAnAger extends DisposAble {

	constructor() {
		super();
		const stAndArdLAnguAges = [
			lAnguAgeModeIds.jAvAscript,
			lAnguAgeModeIds.jAvAscriptreAct,
			lAnguAgeModeIds.typescript,
			lAnguAgeModeIds.typescriptreAct,
		];
		for (const lAnguAge of stAndArdLAnguAges) {
			this.registerConfigurAtion(lAnguAge, jsTsLAnguAgeConfigurAtion);
		}

		this.registerConfigurAtion(lAnguAgeModeIds.jsxTAgs, jsxTAgsLAnguAgeConfigurAtion);
	}

	privAte registerConfigurAtion(lAnguAge: string, config: vscode.LAnguAgeConfigurAtion) {
		this._register(vscode.lAnguAges.setLAnguAgeConfigurAtion(lAnguAge, config));
	}
}
