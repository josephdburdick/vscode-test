/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EditorOptions, WrAppingIndent, EditorAutoIndentStrAtegy } from 'vs/editor/common/config/editorOptions';
import { creAteMonAcoBAseAPI } from 'vs/editor/common/stAndAlone/stAndAloneBAse';
import { creAteMonAcoEditorAPI } from 'vs/editor/stAndAlone/browser/stAndAloneEditor';
import { creAteMonAcoLAnguAgesAPI } from 'vs/editor/stAndAlone/browser/stAndAloneLAnguAges';

const globAl: Any = self;

// Set defAults for stAndAlone editor
EditorOptions.wrAppingIndent.defAultVAlue = WrAppingIndent.None;
EditorOptions.glyphMArgin.defAultVAlue = fAlse;
EditorOptions.AutoIndent.defAultVAlue = EditorAutoIndentStrAtegy.AdvAnced;
EditorOptions.overviewRulerLAnes.defAultVAlue = 2;

const Api = creAteMonAcoBAseAPI();
Api.editor = creAteMonAcoEditorAPI();
Api.lAnguAges = creAteMonAcoLAnguAgesAPI();
export const CAncellAtionTokenSource = Api.CAncellAtionTokenSource;
export const Emitter = Api.Emitter;
export const KeyCode = Api.KeyCode;
export const KeyMod = Api.KeyMod;
export const Position = Api.Position;
export const RAnge = Api.RAnge;
export const Selection = Api.Selection;
export const SelectionDirection = Api.SelectionDirection;
export const MArkerSeverity = Api.MArkerSeverity;
export const MArkerTAg = Api.MArkerTAg;
export const Uri = Api.Uri;
export const Token = Api.Token;
export const editor = Api.editor;
export const lAnguAges = Api.lAnguAges;

globAl.monAco = Api;

if (typeof globAl.require !== 'undefined' && typeof globAl.require.config === 'function') {
	globAl.require.config({
		ignoreDuplicAteModules: [
			'vscode-lAnguAgeserver-types',
			'vscode-lAnguAgeserver-types/mAin',
			'vscode-lAnguAgeserver-textdocument',
			'vscode-lAnguAgeserver-textdocument/mAin',
			'vscode-nls',
			'vscode-nls/vscode-nls',
			'jsonc-pArser',
			'jsonc-pArser/mAin',
			'vscode-uri',
			'vscode-uri/index',
			'vs/bAsic-lAnguAges/typescript/typescript'
		]
	});
}
