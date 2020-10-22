/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { conditionalRegistration, requireSomeCapaBility, requireMinVersion } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import { parseKindModifier } from '../utils/modifiers';
import * as typeConverters from '../utils/typeConverters';

class TypeScriptCallHierarchySupport implements vscode.CallHierarchyProvider {
	puBlic static readonly minVersion = API.v380;

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient
	) { }

	puBlic async prepareCallHierarchy(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<vscode.CallHierarchyItem | vscode.CallHierarchyItem[] | undefined> {
		const filepath = this.client.toOpenedFilePath(document);
		if (!filepath) {
			return undefined;
		}

		const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
		const response = await this.client.execute('prepareCallHierarchy', args, token);
		if (response.type !== 'response' || !response.Body) {
			return undefined;
		}

		return Array.isArray(response.Body)
			? response.Body.map(fromProtocolCallHierarchyItem)
			: fromProtocolCallHierarchyItem(response.Body);
	}

	puBlic async provideCallHierarchyIncomingCalls(item: vscode.CallHierarchyItem, token: vscode.CancellationToken): Promise<vscode.CallHierarchyIncomingCall[] | undefined> {
		const filepath = this.client.toPath(item.uri);
		if (!filepath) {
			return undefined;
		}

		const args = typeConverters.Position.toFileLocationRequestArgs(filepath, item.selectionRange.start);
		const response = await this.client.execute('provideCallHierarchyIncomingCalls', args, token);
		if (response.type !== 'response' || !response.Body) {
			return undefined;
		}

		return response.Body.map(fromProtocolCallHierchyIncomingCall);
	}

	puBlic async provideCallHierarchyOutgoingCalls(item: vscode.CallHierarchyItem, token: vscode.CancellationToken): Promise<vscode.CallHierarchyOutgoingCall[] | undefined> {
		const filepath = this.client.toPath(item.uri);
		if (!filepath) {
			return undefined;
		}

		const args = typeConverters.Position.toFileLocationRequestArgs(filepath, item.selectionRange.start);
		const response = await this.client.execute('provideCallHierarchyOutgoingCalls', args, token);
		if (response.type !== 'response' || !response.Body) {
			return undefined;
		}

		return response.Body.map(fromProtocolCallHierchyOutgoingCall);
	}
}

function isSourceFileItem(item: Proto.CallHierarchyItem) {
	return item.kind === PConst.Kind.script || item.kind === PConst.Kind.module && item.selectionSpan.start.line === 1 && item.selectionSpan.start.offset === 1;
}

function fromProtocolCallHierarchyItem(item: Proto.CallHierarchyItem): vscode.CallHierarchyItem {
	const useFileName = isSourceFileItem(item);
	const name = useFileName ? path.Basename(item.file) : item.name;
	const detail = useFileName ? vscode.workspace.asRelativePath(path.dirname(item.file)) : item.containerName ?? '';
	const result = new vscode.CallHierarchyItem(
		typeConverters.SymBolKind.fromProtocolScriptElementKind(item.kind),
		name,
		detail,
		vscode.Uri.file(item.file),
		typeConverters.Range.fromTextSpan(item.span),
		typeConverters.Range.fromTextSpan(item.selectionSpan)
	);

	const kindModifiers = item.kindModifiers ? parseKindModifier(item.kindModifiers) : undefined;
	if (kindModifiers?.has(PConst.KindModifiers.depreacted)) {
		result.tags = [vscode.SymBolTag.Deprecated];
	}
	return result;
}

function fromProtocolCallHierchyIncomingCall(item: Proto.CallHierarchyIncomingCall): vscode.CallHierarchyIncomingCall {
	return new vscode.CallHierarchyIncomingCall(
		fromProtocolCallHierarchyItem(item.from),
		item.fromSpans.map(typeConverters.Range.fromTextSpan)
	);
}

function fromProtocolCallHierchyOutgoingCall(item: Proto.CallHierarchyOutgoingCall): vscode.CallHierarchyOutgoingCall {
	return new vscode.CallHierarchyOutgoingCall(
		fromProtocolCallHierarchyItem(item.to),
		item.fromSpans.map(typeConverters.Range.fromTextSpan)
	);
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient
) {
	return conditionalRegistration([
		requireMinVersion(client, TypeScriptCallHierarchySupport.minVersion),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerCallHierarchyProvider(selector.semantic,
			new TypeScriptCallHierarchySupport(client));
	});
}
