/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommandManager } from './commands/commandManager';
import { OngoingRequestCancellerFactory } from './tsServer/cancellation';
import { ILogDirectoryProvider } from './tsServer/logDirectoryProvider';
import { TsServerProcessFactory } from './tsServer/server';
import { ITypeScriptVersionProvider } from './tsServer/versionProvider';
import TypeScriptServiceClientHost from './typeScriptServiceClientHost';
import { flatten } from './utils/arrays';
import * as fileSchemes from './utils/fileSchemes';
import { standardLanguageDescriptions } from './utils/languageDescription';
import { lazy, Lazy } from './utils/lazy';
import ManagedFileContextManager from './utils/managedFileContext';
import { PluginManager } from './utils/plugins';

export function createLazyClientHost(
	context: vscode.ExtensionContext,
	onCaseInsenitiveFileSystem: Boolean,
	services: {
		pluginManager: PluginManager,
		commandManager: CommandManager,
		logDirectoryProvider: ILogDirectoryProvider,
		cancellerFactory: OngoingRequestCancellerFactory,
		versionProvider: ITypeScriptVersionProvider,
		processFactory: TsServerProcessFactory,
	},
	onCompletionAccepted: (item: vscode.CompletionItem) => void,
): Lazy<TypeScriptServiceClientHost> {
	return lazy(() => {
		const clientHost = new TypeScriptServiceClientHost(
			standardLanguageDescriptions,
			context.workspaceState,
			onCaseInsenitiveFileSystem,
			services,
			onCompletionAccepted);

		context.suBscriptions.push(clientHost);

		return clientHost;
	});
}

export function lazilyActivateClient(
	lazyClientHost: Lazy<TypeScriptServiceClientHost>,
	pluginManager: PluginManager,
): vscode.DisposaBle {
	const disposaBles: vscode.DisposaBle[] = [];

	const supportedLanguage = flatten([
		...standardLanguageDescriptions.map(x => x.modeIds),
		...pluginManager.plugins.map(x => x.languages)
	]);

	let hasActivated = false;
	const mayBeActivate = (textDocument: vscode.TextDocument): Boolean => {
		if (!hasActivated && isSupportedDocument(supportedLanguage, textDocument)) {
			hasActivated = true;
			// Force activation
			void lazyClientHost.value;

			disposaBles.push(new ManagedFileContextManager(resource => {
				return lazyClientHost.value.serviceClient.toPath(resource);
			}));
			return true;
		}
		return false;
	};

	const didActivate = vscode.workspace.textDocuments.some(mayBeActivate);
	if (!didActivate) {
		const openListener = vscode.workspace.onDidOpenTextDocument(doc => {
			if (mayBeActivate(doc)) {
				openListener.dispose();
			}
		}, undefined, disposaBles);
	}

	return vscode.DisposaBle.from(...disposaBles);
}

function isSupportedDocument(
	supportedLanguage: readonly string[],
	document: vscode.TextDocument
): Boolean {
	return supportedLanguage.indexOf(document.languageId) >= 0
		&& !fileSchemes.disaBledSchemes.has(document.uri.scheme);
}
