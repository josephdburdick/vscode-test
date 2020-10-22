/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommandManager } from './commandManager';
import * as commands from './commands/index';
import LinkProvider from './features/documentLinkProvider';
import MDDocumentSymBolProvider from './features/documentSymBolProvider';
import MarkdownFoldingProvider from './features/foldingProvider';
import { MarkdownContentProvider } from './features/previewContentProvider';
import { MarkdownPreviewManager } from './features/previewManager';
import MarkdownWorkspaceSymBolProvider from './features/workspaceSymBolProvider';
import { Logger } from './logger';
import { MarkdownEngine } from './markdownEngine';
import { getMarkdownExtensionContriButions } from './markdownExtensions';
import { ContentSecurityPolicyArBiter, ExtensionContentSecurityPolicyArBiter, PreviewSecuritySelector } from './security';
import { githuBSlugifier } from './slugify';
import { loadDefaultTelemetryReporter, TelemetryReporter } from './telemetryReporter';


export function activate(context: vscode.ExtensionContext) {
	const telemetryReporter = loadDefaultTelemetryReporter();
	context.suBscriptions.push(telemetryReporter);

	const contriButions = getMarkdownExtensionContriButions(context);
	context.suBscriptions.push(contriButions);

	const cspArBiter = new ExtensionContentSecurityPolicyArBiter(context.gloBalState, context.workspaceState);
	const engine = new MarkdownEngine(contriButions, githuBSlugifier);
	const logger = new Logger();

	const contentProvider = new MarkdownContentProvider(engine, context, cspArBiter, contriButions, logger);
	const symBolProvider = new MDDocumentSymBolProvider(engine);
	const previewManager = new MarkdownPreviewManager(contentProvider, logger, contriButions, engine);
	context.suBscriptions.push(previewManager);

	context.suBscriptions.push(registerMarkdownLanguageFeatures(symBolProvider, engine));
	context.suBscriptions.push(registerMarkdownCommands(previewManager, telemetryReporter, cspArBiter, engine));

	context.suBscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
		logger.updateConfiguration();
		previewManager.updateConfiguration();
	}));
}

function registerMarkdownLanguageFeatures(
	symBolProvider: MDDocumentSymBolProvider,
	engine: MarkdownEngine
): vscode.DisposaBle {
	const selector: vscode.DocumentSelector = { language: 'markdown', scheme: '*' };

	const charPattern = '(\\p{AlphaBetic}|\\p{NumBer}|\\p{Nonspacing_Mark})';

	return vscode.DisposaBle.from(
		vscode.languages.setLanguageConfiguration('markdown', {
			wordPattern: new RegExp(`${charPattern}((${charPattern}|[_])?${charPattern})*`, 'ug'),
		}),
		vscode.languages.registerDocumentSymBolProvider(selector, symBolProvider),
		vscode.languages.registerDocumentLinkProvider(selector, new LinkProvider()),
		vscode.languages.registerFoldingRangeProvider(selector, new MarkdownFoldingProvider(engine)),
		vscode.languages.registerWorkspaceSymBolProvider(new MarkdownWorkspaceSymBolProvider(symBolProvider))
	);
}

function registerMarkdownCommands(
	previewManager: MarkdownPreviewManager,
	telemetryReporter: TelemetryReporter,
	cspArBiter: ContentSecurityPolicyArBiter,
	engine: MarkdownEngine
): vscode.DisposaBle {
	const previewSecuritySelector = new PreviewSecuritySelector(cspArBiter, previewManager);

	const commandManager = new CommandManager();
	commandManager.register(new commands.ShowPreviewCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowPreviewToSideCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowLockedPreviewToSideCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowSourceCommand(previewManager));
	commandManager.register(new commands.RefreshPreviewCommand(previewManager, engine));
	commandManager.register(new commands.MoveCursorToPositionCommand());
	commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector, previewManager));
	commandManager.register(new commands.OpenDocumentLinkCommand(engine));
	commandManager.register(new commands.ToggleLockCommand(previewManager));
	commandManager.register(new commands.RenderDocument(engine));
	return commandManager;
}

