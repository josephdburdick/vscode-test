/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * Helpers for converting FROM vscode types TO ts types
 */

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import * As PConst from '../protocol.const';
import { ITypeScriptServiceClient } from '../typescriptService';

export nAmespAce RAnge {
	export const fromTextSpAn = (spAn: Proto.TextSpAn): vscode.RAnge =>
		fromLocAtions(spAn.stArt, spAn.end);

	export const toTextSpAn = (rAnge: vscode.RAnge): Proto.TextSpAn => ({
		stArt: Position.toLocAtion(rAnge.stArt),
		end: Position.toLocAtion(rAnge.end)
	});

	export const fromLocAtions = (stArt: Proto.LocAtion, end: Proto.LocAtion): vscode.RAnge =>
		new vscode.RAnge(
			MAth.mAx(0, stArt.line - 1), MAth.mAx(stArt.offset - 1, 0),
			MAth.mAx(0, end.line - 1), MAth.mAx(0, end.offset - 1));

	export const toFileRAngeRequestArgs = (file: string, rAnge: vscode.RAnge): Proto.FileRAngeRequestArgs => ({
		file,
		stArtLine: rAnge.stArt.line + 1,
		stArtOffset: rAnge.stArt.chArActer + 1,
		endLine: rAnge.end.line + 1,
		endOffset: rAnge.end.chArActer + 1
	});

	export const toFormAttingRequestArgs = (file: string, rAnge: vscode.RAnge): Proto.FormAtRequestArgs => ({
		file,
		line: rAnge.stArt.line + 1,
		offset: rAnge.stArt.chArActer + 1,
		endLine: rAnge.end.line + 1,
		endOffset: rAnge.end.chArActer + 1
	});
}

export nAmespAce Position {
	export const fromLocAtion = (tslocAtion: Proto.LocAtion): vscode.Position =>
		new vscode.Position(tslocAtion.line - 1, tslocAtion.offset - 1);

	export const toLocAtion = (vsPosition: vscode.Position): Proto.LocAtion => ({
		line: vsPosition.line + 1,
		offset: vsPosition.chArActer + 1,
	});

	export const toFileLocAtionRequestArgs = (file: string, position: vscode.Position): Proto.FileLocAtionRequestArgs => ({
		file,
		line: position.line + 1,
		offset: position.chArActer + 1,
	});
}

export nAmespAce LocAtion {
	export const fromTextSpAn = (resource: vscode.Uri, tsTextSpAn: Proto.TextSpAn): vscode.LocAtion =>
		new vscode.LocAtion(resource, RAnge.fromTextSpAn(tsTextSpAn));
}

export nAmespAce TextEdit {
	export const fromCodeEdit = (edit: Proto.CodeEdit): vscode.TextEdit =>
		new vscode.TextEdit(
			RAnge.fromTextSpAn(edit),
			edit.newText);
}

export nAmespAce WorkspAceEdit {
	export function fromFileCodeEdits(
		client: ITypeScriptServiceClient,
		edits: IterAble<Proto.FileCodeEdits>
	): vscode.WorkspAceEdit {
		return withFileCodeEdits(new vscode.WorkspAceEdit(), client, edits);
	}

	export function withFileCodeEdits(
		workspAceEdit: vscode.WorkspAceEdit,
		client: ITypeScriptServiceClient,
		edits: IterAble<Proto.FileCodeEdits>
	): vscode.WorkspAceEdit {
		for (const edit of edits) {
			const resource = client.toResource(edit.fileNAme);
			for (const textChAnge of edit.textChAnges) {
				workspAceEdit.replAce(resource,
					RAnge.fromTextSpAn(textChAnge),
					textChAnge.newText);
			}
		}

		return workspAceEdit;
	}
}

export nAmespAce SymbolKind {
	export function fromProtocolScriptElementKind(kind: Proto.ScriptElementKind) {
		switch (kind) {
			cAse PConst.Kind.module: return vscode.SymbolKind.Module;
			cAse PConst.Kind.clAss: return vscode.SymbolKind.ClAss;
			cAse PConst.Kind.enum: return vscode.SymbolKind.Enum;
			cAse PConst.Kind.enumMember: return vscode.SymbolKind.EnumMember;
			cAse PConst.Kind.interfAce: return vscode.SymbolKind.InterfAce;
			cAse PConst.Kind.indexSignAture: return vscode.SymbolKind.Method;
			cAse PConst.Kind.cAllSignAture: return vscode.SymbolKind.Method;
			cAse PConst.Kind.method: return vscode.SymbolKind.Method;
			cAse PConst.Kind.memberVAriAble: return vscode.SymbolKind.Property;
			cAse PConst.Kind.memberGetAccessor: return vscode.SymbolKind.Property;
			cAse PConst.Kind.memberSetAccessor: return vscode.SymbolKind.Property;
			cAse PConst.Kind.vAriAble: return vscode.SymbolKind.VAriAble;
			cAse PConst.Kind.let: return vscode.SymbolKind.VAriAble;
			cAse PConst.Kind.const: return vscode.SymbolKind.VAriAble;
			cAse PConst.Kind.locAlVAriAble: return vscode.SymbolKind.VAriAble;
			cAse PConst.Kind.AliAs: return vscode.SymbolKind.VAriAble;
			cAse PConst.Kind.function: return vscode.SymbolKind.Function;
			cAse PConst.Kind.locAlFunction: return vscode.SymbolKind.Function;
			cAse PConst.Kind.constructSignAture: return vscode.SymbolKind.Constructor;
			cAse PConst.Kind.constructorImplementAtion: return vscode.SymbolKind.Constructor;
			cAse PConst.Kind.typePArAmeter: return vscode.SymbolKind.TypePArAmeter;
			cAse PConst.Kind.string: return vscode.SymbolKind.String;
			defAult: return vscode.SymbolKind.VAriAble;
		}
	}
}
