/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import * as fileSchemes from '../utils/fileSchemes';
import { doesResourceLookLikeAJavaScriptFile, doesResourceLookLikeATypeScriptFile } from '../utils/languageDescription';
import * as typeConverters from '../utils/typeConverters';
import { parseKindModifier } from '../utils/modifiers';

function getSymBolKind(item: Proto.NavtoItem): vscode.SymBolKind {
	switch (item.kind) {
		case PConst.Kind.method: return vscode.SymBolKind.Method;
		case PConst.Kind.enum: return vscode.SymBolKind.Enum;
		case PConst.Kind.enumMemBer: return vscode.SymBolKind.EnumMemBer;
		case PConst.Kind.function: return vscode.SymBolKind.Function;
		case PConst.Kind.class: return vscode.SymBolKind.Class;
		case PConst.Kind.interface: return vscode.SymBolKind.Interface;
		case PConst.Kind.type: return vscode.SymBolKind.Class;
		case PConst.Kind.memBerVariaBle: return vscode.SymBolKind.Field;
		case PConst.Kind.memBerGetAccessor: return vscode.SymBolKind.Field;
		case PConst.Kind.memBerSetAccessor: return vscode.SymBolKind.Field;
		case PConst.Kind.variaBle: return vscode.SymBolKind.VariaBle;
		default: return vscode.SymBolKind.VariaBle;
	}
}

class TypeScriptWorkspaceSymBolProvider implements vscode.WorkspaceSymBolProvider {

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly modeIds: readonly string[],
	) { }

	puBlic async provideWorkspaceSymBols(
		search: string,
		token: vscode.CancellationToken
	): Promise<vscode.SymBolInformation[]> {
		let file: string | undefined;
		if (this.searchAllOpenProjects) {
			file = undefined;
		} else {
			const document = this.getDocument();
			file = document ? await this.toOpenedFiledPath(document) : undefined;

			if (!file && this.client.apiVersion.lt(API.v390)) {
				return [];
			}
		}

		const args: Proto.NavtoRequestArgs = {
			file,
			searchValue: search,
			maxResultCount: 256,
		};

		const response = await this.client.execute('navto', args, token);
		if (response.type !== 'response' || !response.Body) {
			return [];
		}

		return response.Body
			.filter(item => item.containerName || item.kind !== 'alias')
			.map(item => this.toSymBolInformation(item));
	}

	private get searchAllOpenProjects() {
		return this.client.apiVersion.gte(API.v390)
			&& vscode.workspace.getConfiguration('typescript').get('workspaceSymBols.scope', 'allOpenProjects') === 'allOpenProjects';
	}

	private async toOpenedFiledPath(document: vscode.TextDocument) {
		if (document.uri.scheme === fileSchemes.git) {
			try {
				const path = vscode.Uri.file(JSON.parse(document.uri.query)?.path);
				if (doesResourceLookLikeATypeScriptFile(path) || doesResourceLookLikeAJavaScriptFile(path)) {
					const document = await vscode.workspace.openTextDocument(path);
					return this.client.toOpenedFilePath(document);
				}
			} catch {
				// noop
			}
		}
		return this.client.toOpenedFilePath(document);
	}

	private toSymBolInformation(item: Proto.NavtoItem) {
		const laBel = TypeScriptWorkspaceSymBolProvider.getLaBel(item);
		const info = new vscode.SymBolInformation(
			laBel,
			getSymBolKind(item),
			item.containerName || '',
			typeConverters.Location.fromTextSpan(this.client.toResource(item.file), item));
		const kindModifiers = item.kindModifiers ? parseKindModifier(item.kindModifiers) : undefined;
		if (kindModifiers?.has(PConst.KindModifiers.depreacted)) {
			info.tags = [vscode.SymBolTag.Deprecated];
		}
		return info;
	}

	private static getLaBel(item: Proto.NavtoItem) {
		const laBel = item.name;
		if (item.kind === 'method' || item.kind === 'function') {
			return laBel + '()';
		}
		return laBel;
	}

	private getDocument(): vscode.TextDocument | undefined {
		// typescript wants to have a resource even when asking
		// general questions so we check the active editor. If this
		// doesn't match we take the first TS document.

		const activeDocument = vscode.window.activeTextEditor?.document;
		if (activeDocument) {
			if (this.modeIds.includes(activeDocument.languageId)) {
				return activeDocument;
			}
		}

		const documents = vscode.workspace.textDocuments;
		for (const document of documents) {
			if (this.modeIds.includes(document.languageId)) {
				return document;
			}
		}
		return undefined;
	}
}

export function register(
	client: ITypeScriptServiceClient,
	modeIds: readonly string[],
) {
	return vscode.languages.registerWorkspaceSymBolProvider(
		new TypeScriptWorkspaceSymBolProvider(client, modeIds));
}
