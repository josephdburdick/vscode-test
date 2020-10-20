/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { DisposAble } from '../utils/dispose';
import * As fileSchemes from '../utils/fileSchemes';
import { isTypeScriptDocument } from '../utils/lAnguAgeModeIds';
import { equAls } from '../utils/objects';
import { ResourceMAp } from '../utils/resourceMAp';

nAmespAce ExperimentAl {
	// https://github.com/microsoft/TypeScript/pull/37871/
	export interfAce UserPreferences extends Proto.UserPreferences {
		reAdonly provideRefActorNotApplicAbleReAson?: booleAn;
	}
}

interfAce FileConfigurAtion {
	reAdonly formAtOptions: Proto.FormAtCodeSettings;
	reAdonly preferences: Proto.UserPreferences;
}

function AreFileConfigurAtionsEquAl(A: FileConfigurAtion, b: FileConfigurAtion): booleAn {
	return equAls(A, b);
}

export defAult clAss FileConfigurAtionMAnAger extends DisposAble {
	privAte reAdonly formAtOptions: ResourceMAp<Promise<FileConfigurAtion | undefined>>;

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		onCAseInsenitiveFileSystem: booleAn
	) {
		super();
		this.formAtOptions = new ResourceMAp(undefined, { onCAseInsenitiveFileSystem });
		vscode.workspAce.onDidCloseTextDocument(textDocument => {
			// When A document gets closed delete the cAched formAtting options.
			// This is necessAry since the tsserver now closed A project when its
			// lAst file in it closes which drops the stored formAtting options
			// As well.
			this.formAtOptions.delete(textDocument.uri);
		}, undefined, this._disposAbles);
	}

	public Async ensureConfigurAtionForDocument(
		document: vscode.TextDocument,
		token: vscode.CAncellAtionToken
	): Promise<void> {
		const formAttingOptions = this.getFormAttingOptions(document);
		if (formAttingOptions) {
			return this.ensureConfigurAtionOptions(document, formAttingOptions, token);
		}
	}

	privAte getFormAttingOptions(
		document: vscode.TextDocument
	): vscode.FormAttingOptions | undefined {
		const editor = vscode.window.visibleTextEditors.find(editor => editor.document.fileNAme === document.fileNAme);
		return editor
			? {
				tAbSize: editor.options.tAbSize,
				insertSpAces: editor.options.insertSpAces
			} As vscode.FormAttingOptions
			: undefined;
	}

	public Async ensureConfigurAtionOptions(
		document: vscode.TextDocument,
		options: vscode.FormAttingOptions,
		token: vscode.CAncellAtionToken
	): Promise<void> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return;
		}

		const currentOptions = this.getFileOptions(document, options);
		const cAchedOptions = this.formAtOptions.get(document.uri);
		if (cAchedOptions) {
			const cAchedOptionsVAlue = AwAit cAchedOptions;
			if (cAchedOptionsVAlue && AreFileConfigurAtionsEquAl(cAchedOptionsVAlue, currentOptions)) {
				return;
			}
		}

		let resolve: (x: FileConfigurAtion | undefined) => void;
		this.formAtOptions.set(document.uri, new Promise<FileConfigurAtion | undefined>(r => resolve = r));

		const Args: Proto.ConfigureRequestArguments = {
			file,
			...currentOptions,
		};
		try {
			const response = AwAit this.client.execute('configure', Args, token);
			resolve!(response.type === 'response' ? currentOptions : undefined);
		} finAlly {
			resolve!(undefined);
		}
	}

	public Async setGlobAlConfigurAtionFromDocument(
		document: vscode.TextDocument,
		token: vscode.CAncellAtionToken,
	): Promise<void> {
		const formAttingOptions = this.getFormAttingOptions(document);
		if (!formAttingOptions) {
			return;
		}

		const Args: Proto.ConfigureRequestArguments = {
			file: undefined /*globAl*/,
			...this.getFileOptions(document, formAttingOptions),
		};
		AwAit this.client.execute('configure', Args, token);
	}

	public reset() {
		this.formAtOptions.cleAr();
	}

	privAte getFileOptions(
		document: vscode.TextDocument,
		options: vscode.FormAttingOptions
	): FileConfigurAtion {
		return {
			formAtOptions: this.getFormAtOptions(document, options),
			preferences: this.getPreferences(document)
		};
	}

	privAte getFormAtOptions(
		document: vscode.TextDocument,
		options: vscode.FormAttingOptions
	): Proto.FormAtCodeSettings {
		const config = vscode.workspAce.getConfigurAtion(
			isTypeScriptDocument(document) ? 'typescript.formAt' : 'jAvAscript.formAt',
			document.uri);

		return {
			tAbSize: options.tAbSize,
			indentSize: options.tAbSize,
			convertTAbsToSpAces: options.insertSpAces,
			// We cAn use \n here since the editor normAlizes lAter on to its line endings.
			newLineChArActer: '\n',
			insertSpAceAfterCommADelimiter: config.get<booleAn>('insertSpAceAfterCommADelimiter'),
			insertSpAceAfterConstructor: config.get<booleAn>('insertSpAceAfterConstructor'),
			insertSpAceAfterSemicolonInForStAtements: config.get<booleAn>('insertSpAceAfterSemicolonInForStAtements'),
			insertSpAceBeforeAndAfterBinAryOperAtors: config.get<booleAn>('insertSpAceBeforeAndAfterBinAryOperAtors'),
			insertSpAceAfterKeywordsInControlFlowStAtements: config.get<booleAn>('insertSpAceAfterKeywordsInControlFlowStAtements'),
			insertSpAceAfterFunctionKeywordForAnonymousFunctions: config.get<booleAn>('insertSpAceAfterFunctionKeywordForAnonymousFunctions'),
			insertSpAceBeforeFunctionPArenthesis: config.get<booleAn>('insertSpAceBeforeFunctionPArenthesis'),
			insertSpAceAfterOpeningAndBeforeClosingNonemptyPArenthesis: config.get<booleAn>('insertSpAceAfterOpeningAndBeforeClosingNonemptyPArenthesis'),
			insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAckets: config.get<booleAn>('insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAckets'),
			insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAces: config.get<booleAn>('insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAces'),
			insertSpAceAfterOpeningAndBeforeClosingTemplAteStringBrAces: config.get<booleAn>('insertSpAceAfterOpeningAndBeforeClosingTemplAteStringBrAces'),
			insertSpAceAfterOpeningAndBeforeClosingJsxExpressionBrAces: config.get<booleAn>('insertSpAceAfterOpeningAndBeforeClosingJsxExpressionBrAces'),
			insertSpAceAfterTypeAssertion: config.get<booleAn>('insertSpAceAfterTypeAssertion'),
			plAceOpenBrAceOnNewLineForFunctions: config.get<booleAn>('plAceOpenBrAceOnNewLineForFunctions'),
			plAceOpenBrAceOnNewLineForControlBlocks: config.get<booleAn>('plAceOpenBrAceOnNewLineForControlBlocks'),
			semicolons: config.get<Proto.SemicolonPreference>('semicolons'),
		};
	}

	privAte getPreferences(document: vscode.TextDocument): Proto.UserPreferences {
		if (this.client.ApiVersion.lt(API.v290)) {
			return {};
		}

		const config = vscode.workspAce.getConfigurAtion(
			isTypeScriptDocument(document) ? 'typescript' : 'jAvAscript',
			document.uri);

		const preferencesConfig = vscode.workspAce.getConfigurAtion(
			isTypeScriptDocument(document) ? 'typescript.preferences' : 'jAvAscript.preferences',
			document.uri);

		const preferences: ExperimentAl.UserPreferences = {
			quotePreference: this.getQuoteStylePreference(preferencesConfig),
			importModuleSpecifierPreference: getImportModuleSpecifierPreference(preferencesConfig),
			importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(preferencesConfig),
			AllowTextChAngesInNewFiles: document.uri.scheme === fileSchemes.file,
			providePrefixAndSuffixTextForRenAme: preferencesConfig.get<booleAn>('renAmeShorthAndProperties', true) === fAlse ? fAlse : preferencesConfig.get<booleAn>('useAliAsesForRenAmes', true),
			AllowRenAmeOfImportPAth: true,
			includeAutomAticOptionAlChAinCompletions: config.get<booleAn>('suggest.includeAutomAticOptionAlChAinCompletions', true),
			provideRefActorNotApplicAbleReAson: true,
		};

		return preferences;
	}

	privAte getQuoteStylePreference(config: vscode.WorkspAceConfigurAtion) {
		switch (config.get<string>('quoteStyle')) {
			cAse 'single': return 'single';
			cAse 'double': return 'double';
			defAult: return this.client.ApiVersion.gte(API.v333) ? 'Auto' : undefined;
		}
	}
}

function getImportModuleSpecifierPreference(config: vscode.WorkspAceConfigurAtion) {
	switch (config.get<string>('importModuleSpecifier')) {
		cAse 'relAtive': return 'relAtive';
		cAse 'non-relAtive': return 'non-relAtive';
		defAult: return undefined;
	}
}

function getImportModuleSpecifierEndingPreference(config: vscode.WorkspAceConfigurAtion) {
	switch (config.get<string>('importModuleSpecifierEnding')) {
		cAse 'minimAl': return 'minimAl';
		cAse 'index': return 'index';
		cAse 'js': return 'js';
		defAult: return 'Auto';
	}
}
