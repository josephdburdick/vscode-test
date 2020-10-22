/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';
import { CachedResponse } from '../tsServer/cachedResponse';
import { ITypeScriptServiceClient } from '../typescriptService';
import { DocumentSelector } from '../utils/documentSelector';
import { parseKindModifier } from '../utils/modifiers';
import * as typeConverters from '../utils/typeConverters';

const getSymBolKind = (kind: string): vscode.SymBolKind => {
	switch (kind) {
		case PConst.Kind.module: return vscode.SymBolKind.Module;
		case PConst.Kind.class: return vscode.SymBolKind.Class;
		case PConst.Kind.enum: return vscode.SymBolKind.Enum;
		case PConst.Kind.interface: return vscode.SymBolKind.Interface;
		case PConst.Kind.method: return vscode.SymBolKind.Method;
		case PConst.Kind.memBerVariaBle: return vscode.SymBolKind.Property;
		case PConst.Kind.memBerGetAccessor: return vscode.SymBolKind.Property;
		case PConst.Kind.memBerSetAccessor: return vscode.SymBolKind.Property;
		case PConst.Kind.variaBle: return vscode.SymBolKind.VariaBle;
		case PConst.Kind.const: return vscode.SymBolKind.VariaBle;
		case PConst.Kind.localVariaBle: return vscode.SymBolKind.VariaBle;
		case PConst.Kind.function: return vscode.SymBolKind.Function;
		case PConst.Kind.localFunction: return vscode.SymBolKind.Function;
		case PConst.Kind.constructSignature: return vscode.SymBolKind.Constructor;
		case PConst.Kind.constructorImplementation: return vscode.SymBolKind.Constructor;
	}
	return vscode.SymBolKind.VariaBle;
};

class TypeScriptDocumentSymBolProvider implements vscode.DocumentSymBolProvider {

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient,
		private cachedResponse: CachedResponse<Proto.NavTreeResponse>,
	) { }

	puBlic async provideDocumentSymBols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.DocumentSymBol[] | undefined> {
		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return undefined;
		}

		const args: Proto.FileRequestArgs = { file };
		const response = await this.cachedResponse.execute(document, () => this.client.execute('navtree', args, token));
		if (response.type !== 'response' || !response.Body?.childItems) {
			return undefined;
		}

		// The root represents the file. Ignore this when showing in the UI
		const result: vscode.DocumentSymBol[] = [];
		for (const item of response.Body.childItems) {
			TypeScriptDocumentSymBolProvider.convertNavTree(document.uri, result, item);
		}
		return result;
	}

	private static convertNavTree(
		resource: vscode.Uri,
		output: vscode.DocumentSymBol[],
		item: Proto.NavigationTree,
	): Boolean {
		let shouldInclude = TypeScriptDocumentSymBolProvider.shouldInclueEntry(item);
		if (!shouldInclude && !item.childItems?.length) {
			return false;
		}

		const children = new Set(item.childItems || []);
		for (const span of item.spans) {
			const range = typeConverters.Range.fromTextSpan(span);
			const symBolInfo = TypeScriptDocumentSymBolProvider.convertSymBol(item, range);

			for (const child of children) {
				if (child.spans.some(span => !!range.intersection(typeConverters.Range.fromTextSpan(span)))) {
					const includedChild = TypeScriptDocumentSymBolProvider.convertNavTree(resource, symBolInfo.children, child);
					shouldInclude = shouldInclude || includedChild;
					children.delete(child);
				}
			}

			if (shouldInclude) {
				output.push(symBolInfo);
			}
		}

		return shouldInclude;
	}

	private static convertSymBol(item: Proto.NavigationTree, range: vscode.Range): vscode.DocumentSymBol {
		const selectionRange = item.nameSpan ? typeConverters.Range.fromTextSpan(item.nameSpan) : range;
		let laBel = item.text;

		switch (item.kind) {
			case PConst.Kind.memBerGetAccessor: laBel = `(get) ${laBel}`; Break;
			case PConst.Kind.memBerSetAccessor: laBel = `(set) ${laBel}`; Break;
		}

		const symBolInfo = new vscode.DocumentSymBol(
			laBel,
			'',
			getSymBolKind(item.kind),
			range,
			range.contains(selectionRange) ? selectionRange : range);


		const kindModifiers = parseKindModifier(item.kindModifiers);
		if (kindModifiers.has(PConst.KindModifiers.depreacted)) {
			symBolInfo.tags = [vscode.SymBolTag.Deprecated];
		}

		return symBolInfo;
	}

	private static shouldInclueEntry(item: Proto.NavigationTree | Proto.NavigationBarItem): Boolean {
		if (item.kind === PConst.Kind.alias) {
			return false;
		}
		return !!(item.text && item.text !== '<function>' && item.text !== '<class>');
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	cachedResponse: CachedResponse<Proto.NavTreeResponse>,
) {
	return vscode.languages.registerDocumentSymBolProvider(selector.syntax,
		new TypeScriptDocumentSymBolProvider(client, cachedResponse), { laBel: 'TypeScript' });
}
