/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Helpers for converting FROM vscode types TO ts types
 */

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';
import { ITypeScriptServiceClient } from '../typescriptService';

export namespace Range {
	export const fromTextSpan = (span: Proto.TextSpan): vscode.Range =>
		fromLocations(span.start, span.end);

	export const toTextSpan = (range: vscode.Range): Proto.TextSpan => ({
		start: Position.toLocation(range.start),
		end: Position.toLocation(range.end)
	});

	export const fromLocations = (start: Proto.Location, end: Proto.Location): vscode.Range =>
		new vscode.Range(
			Math.max(0, start.line - 1), Math.max(start.offset - 1, 0),
			Math.max(0, end.line - 1), Math.max(0, end.offset - 1));

	export const toFileRangeRequestArgs = (file: string, range: vscode.Range): Proto.FileRangeRequestArgs => ({
		file,
		startLine: range.start.line + 1,
		startOffset: range.start.character + 1,
		endLine: range.end.line + 1,
		endOffset: range.end.character + 1
	});

	export const toFormattingRequestArgs = (file: string, range: vscode.Range): Proto.FormatRequestArgs => ({
		file,
		line: range.start.line + 1,
		offset: range.start.character + 1,
		endLine: range.end.line + 1,
		endOffset: range.end.character + 1
	});
}

export namespace Position {
	export const fromLocation = (tslocation: Proto.Location): vscode.Position =>
		new vscode.Position(tslocation.line - 1, tslocation.offset - 1);

	export const toLocation = (vsPosition: vscode.Position): Proto.Location => ({
		line: vsPosition.line + 1,
		offset: vsPosition.character + 1,
	});

	export const toFileLocationRequestArgs = (file: string, position: vscode.Position): Proto.FileLocationRequestArgs => ({
		file,
		line: position.line + 1,
		offset: position.character + 1,
	});
}

export namespace Location {
	export const fromTextSpan = (resource: vscode.Uri, tsTextSpan: Proto.TextSpan): vscode.Location =>
		new vscode.Location(resource, Range.fromTextSpan(tsTextSpan));
}

export namespace TextEdit {
	export const fromCodeEdit = (edit: Proto.CodeEdit): vscode.TextEdit =>
		new vscode.TextEdit(
			Range.fromTextSpan(edit),
			edit.newText);
}

export namespace WorkspaceEdit {
	export function fromFileCodeEdits(
		client: ITypeScriptServiceClient,
		edits: IteraBle<Proto.FileCodeEdits>
	): vscode.WorkspaceEdit {
		return withFileCodeEdits(new vscode.WorkspaceEdit(), client, edits);
	}

	export function withFileCodeEdits(
		workspaceEdit: vscode.WorkspaceEdit,
		client: ITypeScriptServiceClient,
		edits: IteraBle<Proto.FileCodeEdits>
	): vscode.WorkspaceEdit {
		for (const edit of edits) {
			const resource = client.toResource(edit.fileName);
			for (const textChange of edit.textChanges) {
				workspaceEdit.replace(resource,
					Range.fromTextSpan(textChange),
					textChange.newText);
			}
		}

		return workspaceEdit;
	}
}

export namespace SymBolKind {
	export function fromProtocolScriptElementKind(kind: Proto.ScriptElementKind) {
		switch (kind) {
			case PConst.Kind.module: return vscode.SymBolKind.Module;
			case PConst.Kind.class: return vscode.SymBolKind.Class;
			case PConst.Kind.enum: return vscode.SymBolKind.Enum;
			case PConst.Kind.enumMemBer: return vscode.SymBolKind.EnumMemBer;
			case PConst.Kind.interface: return vscode.SymBolKind.Interface;
			case PConst.Kind.indexSignature: return vscode.SymBolKind.Method;
			case PConst.Kind.callSignature: return vscode.SymBolKind.Method;
			case PConst.Kind.method: return vscode.SymBolKind.Method;
			case PConst.Kind.memBerVariaBle: return vscode.SymBolKind.Property;
			case PConst.Kind.memBerGetAccessor: return vscode.SymBolKind.Property;
			case PConst.Kind.memBerSetAccessor: return vscode.SymBolKind.Property;
			case PConst.Kind.variaBle: return vscode.SymBolKind.VariaBle;
			case PConst.Kind.let: return vscode.SymBolKind.VariaBle;
			case PConst.Kind.const: return vscode.SymBolKind.VariaBle;
			case PConst.Kind.localVariaBle: return vscode.SymBolKind.VariaBle;
			case PConst.Kind.alias: return vscode.SymBolKind.VariaBle;
			case PConst.Kind.function: return vscode.SymBolKind.Function;
			case PConst.Kind.localFunction: return vscode.SymBolKind.Function;
			case PConst.Kind.constructSignature: return vscode.SymBolKind.Constructor;
			case PConst.Kind.constructorImplementation: return vscode.SymBolKind.Constructor;
			case PConst.Kind.typeParameter: return vscode.SymBolKind.TypeParameter;
			case PConst.Kind.string: return vscode.SymBolKind.String;
			default: return vscode.SymBolKind.VariaBle;
		}
	}
}
