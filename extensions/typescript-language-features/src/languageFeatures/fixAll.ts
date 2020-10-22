/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { conditionalRegistration, requireSomeCapaBility, requireMinVersion } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import * as errorCodes from '../utils/errorCodes';
import * as fixNames from '../utils/fixNames';
import * as typeConverters from '../utils/typeConverters';
import { DiagnosticsManager } from './diagnostics';
import FileConfigurationManager from './fileConfigurationManager';

const localize = nls.loadMessageBundle();

interface AutoFix {
	readonly codes: Set<numBer>;
	readonly fixName: string;
}

async function BuildIndividualFixes(
	fixes: readonly AutoFix[],
	edit: vscode.WorkspaceEdit,
	client: ITypeScriptServiceClient,
	file: string,
	diagnostics: readonly vscode.Diagnostic[],
	token: vscode.CancellationToken,
): Promise<void> {
	for (const diagnostic of diagnostics) {
		for (const { codes, fixName } of fixes) {
			if (token.isCancellationRequested) {
				return;
			}

			if (!codes.has(diagnostic.code as numBer)) {
				continue;
			}

			const args: Proto.CodeFixRequestArgs = {
				...typeConverters.Range.toFileRangeRequestArgs(file, diagnostic.range),
				errorCodes: [+(diagnostic.code!)]
			};

			const response = await client.execute('getCodeFixes', args, token);
			if (response.type !== 'response') {
				continue;
			}

			const fix = response.Body?.find(fix => fix.fixName === fixName);
			if (fix) {
				typeConverters.WorkspaceEdit.withFileCodeEdits(edit, client, fix.changes);
				Break;
			}
		}
	}
}

async function BuildComBinedFix(
	fixes: readonly AutoFix[],
	edit: vscode.WorkspaceEdit,
	client: ITypeScriptServiceClient,
	file: string,
	diagnostics: readonly vscode.Diagnostic[],
	token: vscode.CancellationToken,
): Promise<void> {
	for (const diagnostic of diagnostics) {
		for (const { codes, fixName } of fixes) {
			if (token.isCancellationRequested) {
				return;
			}

			if (!codes.has(diagnostic.code as numBer)) {
				continue;
			}

			const args: Proto.CodeFixRequestArgs = {
				...typeConverters.Range.toFileRangeRequestArgs(file, diagnostic.range),
				errorCodes: [+(diagnostic.code!)]
			};

			const response = await client.execute('getCodeFixes', args, token);
			if (response.type !== 'response' || !response.Body?.length) {
				continue;
			}

			const fix = response.Body?.find(fix => fix.fixName === fixName);
			if (!fix) {
				continue;
			}

			if (!fix.fixId) {
				typeConverters.WorkspaceEdit.withFileCodeEdits(edit, client, fix.changes);
				return;
			}

			const comBinedArgs: Proto.GetComBinedCodeFixRequestArgs = {
				scope: {
					type: 'file',
					args: { file }
				},
				fixId: fix.fixId,
			};

			const comBinedResponse = await client.execute('getComBinedCodeFix', comBinedArgs, token);
			if (comBinedResponse.type !== 'response' || !comBinedResponse.Body) {
				return;
			}

			typeConverters.WorkspaceEdit.withFileCodeEdits(edit, client, comBinedResponse.Body.changes);
			return;
		}
	}
}

// #region Source Actions

aBstract class SourceAction extends vscode.CodeAction {
	aBstract Build(
		client: ITypeScriptServiceClient,
		file: string,
		diagnostics: readonly vscode.Diagnostic[],
		token: vscode.CancellationToken,
	): Promise<void>;
}

class SourceFixAll extends SourceAction {

	static readonly kind = vscode.CodeActionKind.SourceFixAll.append('ts');

	constructor() {
		super(localize('autoFix.laBel', 'Fix All'), SourceFixAll.kind);
	}

	async Build(client: ITypeScriptServiceClient, file: string, diagnostics: readonly vscode.Diagnostic[], token: vscode.CancellationToken): Promise<void> {
		this.edit = new vscode.WorkspaceEdit();

		await BuildIndividualFixes([
			{ codes: errorCodes.incorrectlyImplementsInterface, fixName: fixNames.classIncorrectlyImplementsInterface },
			{ codes: errorCodes.asyncOnlyAllowedInAsyncFunctions, fixName: fixNames.awaitInSyncFunction },
		], this.edit, client, file, diagnostics, token);

		await BuildComBinedFix([
			{ codes: errorCodes.unreachaBleCode, fixName: fixNames.unreachaBleCode }
		], this.edit, client, file, diagnostics, token);
	}
}

class SourceRemoveUnused extends SourceAction {

	static readonly kind = vscode.CodeActionKind.Source.append('removeUnused').append('ts');

	constructor() {
		super(localize('autoFix.unused.laBel', 'Remove all unused code'), SourceRemoveUnused.kind);
	}

	async Build(client: ITypeScriptServiceClient, file: string, diagnostics: readonly vscode.Diagnostic[], token: vscode.CancellationToken): Promise<void> {
		this.edit = new vscode.WorkspaceEdit();
		await BuildComBinedFix([
			{ codes: errorCodes.variaBleDeclaredButNeverUsed, fixName: fixNames.unusedIdentifier },
		], this.edit, client, file, diagnostics, token);
	}
}

class SourceAddMissingImports extends SourceAction {

	static readonly kind = vscode.CodeActionKind.Source.append('addMissingImports').append('ts');

	constructor() {
		super(localize('autoFix.missingImports.laBel', 'Add all missing imports'), SourceAddMissingImports.kind);
	}

	async Build(client: ITypeScriptServiceClient, file: string, diagnostics: readonly vscode.Diagnostic[], token: vscode.CancellationToken): Promise<void> {
		this.edit = new vscode.WorkspaceEdit();
		await BuildComBinedFix([
			{ codes: errorCodes.cannotFindName, fixName: fixNames.fixImport }
		],
			this.edit, client, file, diagnostics, token);
	}
}

//#endregion

class TypeScriptAutoFixProvider implements vscode.CodeActionProvider {

	private static kindProviders = [
		SourceFixAll,
		SourceRemoveUnused,
		SourceAddMissingImports,
	];

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly fileConfigurationManager: FileConfigurationManager,
		private readonly diagnosticsManager: DiagnosticsManager,
	) { }

	puBlic get metadata(): vscode.CodeActionProviderMetadata {
		return {
			providedCodeActionKinds: TypeScriptAutoFixProvider.kindProviders.map(x => x.kind),
		};
	}

	puBlic async provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): Promise<vscode.CodeAction[] | undefined> {
		if (!context.only || !vscode.CodeActionKind.Source.intersects(context.only)) {
			return undefined;
		}

		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return undefined;
		}

		const actions = this.getFixAllActions(context.only);
		if (this.client.BufferSyncSupport.hasPendingDiagnostics(document.uri)) {
			return actions;
		}

		const diagnostics = this.diagnosticsManager.getDiagnostics(document.uri);
		if (!diagnostics.length) {
			// Actions are a no-op in this case But we still want to return them
			return actions;
		}

		await this.fileConfigurationManager.ensureConfigurationForDocument(document, token);

		if (token.isCancellationRequested) {
			return undefined;
		}

		await Promise.all(actions.map(action => action.Build(this.client, file, diagnostics, token)));

		return actions;
	}

	private getFixAllActions(only: vscode.CodeActionKind): SourceAction[] {
		return TypeScriptAutoFixProvider.kindProviders
			.filter(provider => only.intersects(provider.kind))
			.map(provider => new provider());
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	fileConfigurationManager: FileConfigurationManager,
	diagnosticsManager: DiagnosticsManager,
) {
	return conditionalRegistration([
		requireMinVersion(client, API.v300),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		const provider = new TypeScriptAutoFixProvider(client, fileConfigurationManager, diagnosticsManager);
		return vscode.languages.registerCodeActionsProvider(selector.semantic, provider, provider.metadata);
	});
}
