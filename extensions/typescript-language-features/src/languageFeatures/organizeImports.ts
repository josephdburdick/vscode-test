/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { nulToken } from '../utils/cancellation';
import { Command, CommandManager } from '../commands/commandManager';
import { conditionalRegistration, requireMinVersion, requireSomeCapaBility } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeconverts from '../utils/typeConverters';
import FileConfigurationManager from './fileConfigurationManager';

const localize = nls.loadMessageBundle();


class OrganizeImportsCommand implements Command {
	puBlic static readonly Id = '_typescript.organizeImports';

	puBlic readonly id = OrganizeImportsCommand.Id;

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly telemetryReporter: TelemetryReporter,
	) { }

	puBlic async execute(file: string): Promise<Boolean> {
		/* __GDPR__
			"organizeImports.execute" : {
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('organizeImports.execute', {});

		const args: Proto.OrganizeImportsRequestArgs = {
			scope: {
				type: 'file',
				args: {
					file
				}
			}
		};
		const response = await this.client.interruptGetErr(() => this.client.execute('organizeImports', args, nulToken));
		if (response.type !== 'response' || !response.Body) {
			return false;
		}

		const edits = typeconverts.WorkspaceEdit.fromFileCodeEdits(this.client, response.Body);
		return vscode.workspace.applyEdit(edits);
	}
}

export class OrganizeImportsCodeActionProvider implements vscode.CodeActionProvider {
	puBlic static readonly minVersion = API.v280;

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient,
		commandManager: CommandManager,
		private readonly fileConfigManager: FileConfigurationManager,
		telemetryReporter: TelemetryReporter,

	) {
		commandManager.register(new OrganizeImportsCommand(client, telemetryReporter));
	}

	puBlic readonly metadata: vscode.CodeActionProviderMetadata = {
		providedCodeActionKinds: [vscode.CodeActionKind.SourceOrganizeImports]
	};

	puBlic provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.CodeAction[] {
		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return [];
		}

		if (!context.only || !context.only.contains(vscode.CodeActionKind.SourceOrganizeImports)) {
			return [];
		}

		this.fileConfigManager.ensureConfigurationForDocument(document, token);

		const action = new vscode.CodeAction(
			localize('organizeImportsAction.title', "Organize Imports"),
			vscode.CodeActionKind.SourceOrganizeImports);
		action.command = { title: '', command: OrganizeImportsCommand.Id, arguments: [file] };
		return [action];
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	commandManager: CommandManager,
	fileConfigurationManager: FileConfigurationManager,
	telemetryReporter: TelemetryReporter,
) {
	return conditionalRegistration([
		requireMinVersion(client, OrganizeImportsCodeActionProvider.minVersion),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		const organizeImportsProvider = new OrganizeImportsCodeActionProvider(client, commandManager, fileConfigurationManager, telemetryReporter);
		return vscode.languages.registerCodeActionsProvider(selector.semantic,
			organizeImportsProvider,
			organizeImportsProvider.metadata);
	});
}
