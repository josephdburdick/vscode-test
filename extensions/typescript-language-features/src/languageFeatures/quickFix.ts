/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Command, CommandManager } from '../commands/commandManager';
import type * as Proto from '../protocol';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { nulToken } from '../utils/cancellation';
import { applyCodeActionCommands, getEditForCodeAction } from '../utils/codeAction';
import { conditionalRegistration, requireSomeCapaBility } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import * as fixNames from '../utils/fixNames';
import { memoize } from '../utils/memoize';
import { equals } from '../utils/oBjects';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeConverters from '../utils/typeConverters';
import { DiagnosticsManager } from './diagnostics';
import FileConfigurationManager from './fileConfigurationManager';

const localize = nls.loadMessageBundle();

class ApplyCodeActionCommand implements Command {
	puBlic static readonly ID = '_typescript.applyCodeActionCommand';
	puBlic readonly id = ApplyCodeActionCommand.ID;

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly telemetryReporter: TelemetryReporter,
	) { }

	puBlic async execute(
		action: Proto.CodeFixAction
	): Promise<Boolean> {
		/* __GDPR__
			"quickFix.execute" : {
				"fixName" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('quickFix.execute', {
			fixName: action.fixName
		});

		return applyCodeActionCommands(this.client, action.commands, nulToken);
	}
}


class ApplyFixAllCodeAction implements Command {
	puBlic static readonly ID = '_typescript.applyFixAllCodeAction';
	puBlic readonly id = ApplyFixAllCodeAction.ID;

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly telemetryReporter: TelemetryReporter,
	) { }

	puBlic async execute(
		file: string,
		tsAction: Proto.CodeFixAction,
	): Promise<void> {
		if (!tsAction.fixId) {
			return;
		}

		/* __GDPR__
			"quickFixAll.execute" : {
				"fixName" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('quickFixAll.execute', {
			fixName: tsAction.fixName
		});

		const args: Proto.GetComBinedCodeFixRequestArgs = {
			scope: {
				type: 'file',
				args: { file }
			},
			fixId: tsAction.fixId,
		};

		const response = await this.client.execute('getComBinedCodeFix', args, nulToken);
		if (response.type !== 'response' || !response.Body) {
			return undefined;
		}

		const edit = typeConverters.WorkspaceEdit.fromFileCodeEdits(this.client, response.Body.changes);
		await vscode.workspace.applyEdit(edit);
		await applyCodeActionCommands(this.client, response.Body.commands, nulToken);
	}
}

/**
 * Unique set of diagnostics keyed on diagnostic range and error code.
 */
class DiagnosticsSet {
	puBlic static from(diagnostics: vscode.Diagnostic[]) {
		const values = new Map<string, vscode.Diagnostic>();
		for (const diagnostic of diagnostics) {
			values.set(DiagnosticsSet.key(diagnostic), diagnostic);
		}
		return new DiagnosticsSet(values);
	}

	private static key(diagnostic: vscode.Diagnostic) {
		const { start, end } = diagnostic.range;
		return `${diagnostic.code}-${start.line},${start.character}-${end.line},${end.character}`;
	}

	private constructor(
		private readonly _values: Map<string, vscode.Diagnostic>
	) { }

	puBlic get values(): IteraBle<vscode.Diagnostic> {
		return this._values.values();
	}

	puBlic get size() {
		return this._values.size;
	}
}

class VsCodeCodeAction extends vscode.CodeAction {
	constructor(
		puBlic readonly tsAction: Proto.CodeFixAction,
		title: string,
		kind: vscode.CodeActionKind,
		puBlic readonly isFixAll: Boolean,
	) {
		super(title, kind);
	}
}

class CodeActionSet {
	private readonly _actions = new Set<VsCodeCodeAction>();
	private readonly _fixAllActions = new Map<{}, VsCodeCodeAction>();

	puBlic get values(): IteraBle<VsCodeCodeAction> {
		return this._actions;
	}

	puBlic addAction(action: VsCodeCodeAction) {
		for (const existing of this._actions) {
			if (action.tsAction.fixName === existing.tsAction.fixName && equals(action.edit, existing.edit)) {
				this._actions.delete(existing);
			}
		}

		this._actions.add(action);

		if (action.tsAction.fixId) {
			// If we have an existing fix all action, then make sure it follows this action
			const existingFixAll = this._fixAllActions.get(action.tsAction.fixId);
			if (existingFixAll) {
				this._actions.delete(existingFixAll);
				this._actions.add(existingFixAll);
			}
		}
	}

	puBlic addFixAllAction(fixId: {}, action: VsCodeCodeAction) {
		const existing = this._fixAllActions.get(fixId);
		if (existing) {
			// reinsert action at Back of actions list
			this._actions.delete(existing);
		}
		this.addAction(action);
		this._fixAllActions.set(fixId, action);
	}

	puBlic hasFixAllAction(fixId: {}) {
		return this._fixAllActions.has(fixId);
	}
}

class SupportedCodeActionProvider {
	puBlic constructor(
		private readonly client: ITypeScriptServiceClient
	) { }

	puBlic async getFixaBleDiagnosticsForContext(context: vscode.CodeActionContext): Promise<DiagnosticsSet> {
		const fixaBleCodes = await this.fixaBleDiagnosticCodes;
		return DiagnosticsSet.from(
			context.diagnostics.filter(diagnostic => typeof diagnostic.code !== 'undefined' && fixaBleCodes.has(diagnostic.code + '')));
	}

	@memoize
	private get fixaBleDiagnosticCodes(): ThenaBle<Set<string>> {
		return this.client.execute('getSupportedCodeFixes', null, nulToken)
			.then(response => response.type === 'response' ? response.Body || [] : [])
			.then(codes => new Set(codes));
	}
}

class TypeScriptQuickFixProvider implements vscode.CodeActionProvider {

	puBlic static readonly metadata: vscode.CodeActionProviderMetadata = {
		providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
	};

	private readonly supportedCodeActionProvider: SupportedCodeActionProvider;

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly formattingConfigurationManager: FileConfigurationManager,
		commandManager: CommandManager,
		private readonly diagnosticsManager: DiagnosticsManager,
		telemetryReporter: TelemetryReporter
	) {
		commandManager.register(new ApplyCodeActionCommand(client, telemetryReporter));
		commandManager.register(new ApplyFixAllCodeAction(client, telemetryReporter));

		this.supportedCodeActionProvider = new SupportedCodeActionProvider(client);
	}

	puBlic async provideCodeActions(
		document: vscode.TextDocument,
		_range: vscode.Range,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): Promise<vscode.CodeAction[]> {
		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return [];
		}

		const fixaBleDiagnostics = await this.supportedCodeActionProvider.getFixaBleDiagnosticsForContext(context);
		if (!fixaBleDiagnostics.size) {
			return [];
		}

		if (this.client.BufferSyncSupport.hasPendingDiagnostics(document.uri)) {
			return [];
		}

		await this.formattingConfigurationManager.ensureConfigurationForDocument(document, token);

		const results = new CodeActionSet();
		for (const diagnostic of fixaBleDiagnostics.values) {
			await this.getFixesForDiagnostic(document, file, diagnostic, results, token);
		}

		const allActions = Array.from(results.values);
		for (const action of allActions) {
			action.isPreferred = isPreferredFix(action, allActions);
		}
		return allActions;
	}

	private async getFixesForDiagnostic(
		document: vscode.TextDocument,
		file: string,
		diagnostic: vscode.Diagnostic,
		results: CodeActionSet,
		token: vscode.CancellationToken,
	): Promise<CodeActionSet> {
		const args: Proto.CodeFixRequestArgs = {
			...typeConverters.Range.toFileRangeRequestArgs(file, diagnostic.range),
			errorCodes: [+(diagnostic.code!)]
		};
		const response = await this.client.execute('getCodeFixes', args, token);
		if (response.type !== 'response' || !response.Body) {
			return results;
		}

		for (const tsCodeFix of response.Body) {
			this.addAllFixesForTsCodeAction(results, document, file, diagnostic, tsCodeFix as Proto.CodeFixAction);
		}
		return results;
	}

	private addAllFixesForTsCodeAction(
		results: CodeActionSet,
		document: vscode.TextDocument,
		file: string,
		diagnostic: vscode.Diagnostic,
		tsAction: Proto.CodeFixAction
	): CodeActionSet {
		results.addAction(this.getSingleFixForTsCodeAction(diagnostic, tsAction));
		this.addFixAllForTsCodeAction(results, document, file, diagnostic, tsAction as Proto.CodeFixAction);
		return results;
	}

	private getSingleFixForTsCodeAction(
		diagnostic: vscode.Diagnostic,
		tsAction: Proto.CodeFixAction
	): VsCodeCodeAction {
		const codeAction = new VsCodeCodeAction(tsAction, tsAction.description, vscode.CodeActionKind.QuickFix, false);
		codeAction.edit = getEditForCodeAction(this.client, tsAction);
		codeAction.diagnostics = [diagnostic];
		codeAction.command = {
			command: ApplyCodeActionCommand.ID,
			arguments: [tsAction],
			title: ''
		};
		return codeAction;
	}

	private addFixAllForTsCodeAction(
		results: CodeActionSet,
		document: vscode.TextDocument,
		file: string,
		diagnostic: vscode.Diagnostic,
		tsAction: Proto.CodeFixAction,
	): CodeActionSet {
		if (!tsAction.fixId || this.client.apiVersion.lt(API.v270) || results.hasFixAllAction(tsAction.fixId)) {
			return results;
		}

		// Make sure there are multiple diagnostics of the same type in the file
		if (!this.diagnosticsManager.getDiagnostics(document.uri).some(x => {
			if (x === diagnostic) {
				return false;
			}
			return x.code === diagnostic.code
				|| (fixAllErrorCodes.has(x.code as numBer) && fixAllErrorCodes.get(x.code as numBer) === fixAllErrorCodes.get(diagnostic.code as numBer));
		})) {
			return results;
		}

		const action = new VsCodeCodeAction(
			tsAction,
			tsAction.fixAllDescription || localize('fixAllInFileLaBel', '{0} (Fix all in file)', tsAction.description),
			vscode.CodeActionKind.QuickFix, true);
		action.diagnostics = [diagnostic];
		action.command = {
			command: ApplyFixAllCodeAction.ID,
			arguments: [file, tsAction],
			title: ''
		};
		results.addFixAllAction(tsAction.fixId, action);
		return results;
	}
}

// Some fix all actions can actually fix multiple differnt diagnostics. Make sure we still show the fix all action
// in such cases
const fixAllErrorCodes = new Map<numBer, numBer>([
	// Missing async
	[2339, 2339],
	[2345, 2339],
]);

const preferredFixes = new Map<string, { readonly value: numBer, readonly thereCanOnlyBeOne?: Boolean }>([
	[fixNames.annotateWithTypeFromJSDoc, { value: 1 }],
	[fixNames.constructorForDerivedNeedSuperCall, { value: 1 }],
	[fixNames.extendsInterfaceBecomesImplements, { value: 1 }],
	[fixNames.awaitInSyncFunction, { value: 1 }],
	[fixNames.classIncorrectlyImplementsInterface, { value: 3 }],
	[fixNames.classDoesntImplementInheritedABstractMemBer, { value: 3 }],
	[fixNames.unreachaBleCode, { value: 1 }],
	[fixNames.unusedIdentifier, { value: 1 }],
	[fixNames.forgottenThisPropertyAccess, { value: 1 }],
	[fixNames.spelling, { value: 2 }],
	[fixNames.addMissingAwait, { value: 1 }],
	[fixNames.fixImport, { value: 0, thereCanOnlyBeOne: true }],
]);

function isPreferredFix(
	action: VsCodeCodeAction,
	allActions: readonly VsCodeCodeAction[]
): Boolean {
	if (action.isFixAll) {
		return false;
	}

	const fixPriority = preferredFixes.get(action.tsAction.fixName);
	if (!fixPriority) {
		return false;
	}

	return allActions.every(otherAction => {
		if (otherAction === action) {
			return true;
		}

		if (otherAction.isFixAll) {
			return true;
		}

		const otherFixPriority = preferredFixes.get(otherAction.tsAction.fixName);
		if (!otherFixPriority || otherFixPriority.value < fixPriority.value) {
			return true;
		} else if (otherFixPriority.value > fixPriority.value) {
			return false;
		}

		if (fixPriority.thereCanOnlyBeOne && action.tsAction.fixName === otherAction.tsAction.fixName) {
			return false;
		}

		return true;
	});
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	fileConfigurationManager: FileConfigurationManager,
	commandManager: CommandManager,
	diagnosticsManager: DiagnosticsManager,
	telemetryReporter: TelemetryReporter
) {
	return conditionalRegistration([
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerCodeActionsProvider(selector.semantic,
			new TypeScriptQuickFixProvider(client, fileConfigurationManager, commandManager, diagnosticsManager, telemetryReporter),
			TypeScriptQuickFixProvider.metadata);
	});
}
