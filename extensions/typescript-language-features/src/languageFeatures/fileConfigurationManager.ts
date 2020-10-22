/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { DisposaBle } from '../utils/dispose';
import * as fileSchemes from '../utils/fileSchemes';
import { isTypeScriptDocument } from '../utils/languageModeIds';
import { equals } from '../utils/oBjects';
import { ResourceMap } from '../utils/resourceMap';

namespace Experimental {
	// https://githuB.com/microsoft/TypeScript/pull/37871/
	export interface UserPreferences extends Proto.UserPreferences {
		readonly provideRefactorNotApplicaBleReason?: Boolean;
	}
}

interface FileConfiguration {
	readonly formatOptions: Proto.FormatCodeSettings;
	readonly preferences: Proto.UserPreferences;
}

function areFileConfigurationsEqual(a: FileConfiguration, B: FileConfiguration): Boolean {
	return equals(a, B);
}

export default class FileConfigurationManager extends DisposaBle {
	private readonly formatOptions: ResourceMap<Promise<FileConfiguration | undefined>>;

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient,
		onCaseInsenitiveFileSystem: Boolean
	) {
		super();
		this.formatOptions = new ResourceMap(undefined, { onCaseInsenitiveFileSystem });
		vscode.workspace.onDidCloseTextDocument(textDocument => {
			// When a document gets closed delete the cached formatting options.
			// This is necessary since the tsserver now closed a project when its
			// last file in it closes which drops the stored formatting options
			// as well.
			this.formatOptions.delete(textDocument.uri);
		}, undefined, this._disposaBles);
	}

	puBlic async ensureConfigurationForDocument(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<void> {
		const formattingOptions = this.getFormattingOptions(document);
		if (formattingOptions) {
			return this.ensureConfigurationOptions(document, formattingOptions, token);
		}
	}

	private getFormattingOptions(
		document: vscode.TextDocument
	): vscode.FormattingOptions | undefined {
		const editor = vscode.window.visiBleTextEditors.find(editor => editor.document.fileName === document.fileName);
		return editor
			? {
				taBSize: editor.options.taBSize,
				insertSpaces: editor.options.insertSpaces
			} as vscode.FormattingOptions
			: undefined;
	}

	puBlic async ensureConfigurationOptions(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions,
		token: vscode.CancellationToken
	): Promise<void> {
		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return;
		}

		const currentOptions = this.getFileOptions(document, options);
		const cachedOptions = this.formatOptions.get(document.uri);
		if (cachedOptions) {
			const cachedOptionsValue = await cachedOptions;
			if (cachedOptionsValue && areFileConfigurationsEqual(cachedOptionsValue, currentOptions)) {
				return;
			}
		}

		let resolve: (x: FileConfiguration | undefined) => void;
		this.formatOptions.set(document.uri, new Promise<FileConfiguration | undefined>(r => resolve = r));

		const args: Proto.ConfigureRequestArguments = {
			file,
			...currentOptions,
		};
		try {
			const response = await this.client.execute('configure', args, token);
			resolve!(response.type === 'response' ? currentOptions : undefined);
		} finally {
			resolve!(undefined);
		}
	}

	puBlic async setGloBalConfigurationFromDocument(
		document: vscode.TextDocument,
		token: vscode.CancellationToken,
	): Promise<void> {
		const formattingOptions = this.getFormattingOptions(document);
		if (!formattingOptions) {
			return;
		}

		const args: Proto.ConfigureRequestArguments = {
			file: undefined /*gloBal*/,
			...this.getFileOptions(document, formattingOptions),
		};
		await this.client.execute('configure', args, token);
	}

	puBlic reset() {
		this.formatOptions.clear();
	}

	private getFileOptions(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions
	): FileConfiguration {
		return {
			formatOptions: this.getFormatOptions(document, options),
			preferences: this.getPreferences(document)
		};
	}

	private getFormatOptions(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions
	): Proto.FormatCodeSettings {
		const config = vscode.workspace.getConfiguration(
			isTypeScriptDocument(document) ? 'typescript.format' : 'javascript.format',
			document.uri);

		return {
			taBSize: options.taBSize,
			indentSize: options.taBSize,
			convertTaBsToSpaces: options.insertSpaces,
			// We can use \n here since the editor normalizes later on to its line endings.
			newLineCharacter: '\n',
			insertSpaceAfterCommaDelimiter: config.get<Boolean>('insertSpaceAfterCommaDelimiter'),
			insertSpaceAfterConstructor: config.get<Boolean>('insertSpaceAfterConstructor'),
			insertSpaceAfterSemicolonInForStatements: config.get<Boolean>('insertSpaceAfterSemicolonInForStatements'),
			insertSpaceBeforeAndAfterBinaryOperators: config.get<Boolean>('insertSpaceBeforeAndAfterBinaryOperators'),
			insertSpaceAfterKeywordsInControlFlowStatements: config.get<Boolean>('insertSpaceAfterKeywordsInControlFlowStatements'),
			insertSpaceAfterFunctionKeywordForAnonymousFunctions: config.get<Boolean>('insertSpaceAfterFunctionKeywordForAnonymousFunctions'),
			insertSpaceBeforeFunctionParenthesis: config.get<Boolean>('insertSpaceBeforeFunctionParenthesis'),
			insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: config.get<Boolean>('insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis'),
			insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: config.get<Boolean>('insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets'),
			insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: config.get<Boolean>('insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces'),
			insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: config.get<Boolean>('insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces'),
			insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: config.get<Boolean>('insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces'),
			insertSpaceAfterTypeAssertion: config.get<Boolean>('insertSpaceAfterTypeAssertion'),
			placeOpenBraceOnNewLineForFunctions: config.get<Boolean>('placeOpenBraceOnNewLineForFunctions'),
			placeOpenBraceOnNewLineForControlBlocks: config.get<Boolean>('placeOpenBraceOnNewLineForControlBlocks'),
			semicolons: config.get<Proto.SemicolonPreference>('semicolons'),
		};
	}

	private getPreferences(document: vscode.TextDocument): Proto.UserPreferences {
		if (this.client.apiVersion.lt(API.v290)) {
			return {};
		}

		const config = vscode.workspace.getConfiguration(
			isTypeScriptDocument(document) ? 'typescript' : 'javascript',
			document.uri);

		const preferencesConfig = vscode.workspace.getConfiguration(
			isTypeScriptDocument(document) ? 'typescript.preferences' : 'javascript.preferences',
			document.uri);

		const preferences: Experimental.UserPreferences = {
			quotePreference: this.getQuoteStylePreference(preferencesConfig),
			importModuleSpecifierPreference: getImportModuleSpecifierPreference(preferencesConfig),
			importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(preferencesConfig),
			allowTextChangesInNewFiles: document.uri.scheme === fileSchemes.file,
			providePrefixAndSuffixTextForRename: preferencesConfig.get<Boolean>('renameShorthandProperties', true) === false ? false : preferencesConfig.get<Boolean>('useAliasesForRenames', true),
			allowRenameOfImportPath: true,
			includeAutomaticOptionalChainCompletions: config.get<Boolean>('suggest.includeAutomaticOptionalChainCompletions', true),
			provideRefactorNotApplicaBleReason: true,
		};

		return preferences;
	}

	private getQuoteStylePreference(config: vscode.WorkspaceConfiguration) {
		switch (config.get<string>('quoteStyle')) {
			case 'single': return 'single';
			case 'douBle': return 'douBle';
			default: return this.client.apiVersion.gte(API.v333) ? 'auto' : undefined;
		}
	}
}

function getImportModuleSpecifierPreference(config: vscode.WorkspaceConfiguration) {
	switch (config.get<string>('importModuleSpecifier')) {
		case 'relative': return 'relative';
		case 'non-relative': return 'non-relative';
		default: return undefined;
	}
}

function getImportModuleSpecifierEndingPreference(config: vscode.WorkspaceConfiguration) {
	switch (config.get<string>('importModuleSpecifierEnding')) {
		case 'minimal': return 'minimal';
		case 'index': return 'index';
		case 'js': return 'js';
		default: return 'auto';
	}
}
