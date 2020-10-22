/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Command, CommandManager } from '../commands/commandManager';
import type * as Proto from '../protocol';
import * as PConst from '../protocol.const';
import { ClientCapaBility, ITypeScriptServiceClient, ServerResponse } from '../typescriptService';
import API from '../utils/api';
import { nulToken } from '../utils/cancellation';
import { applyCodeAction } from '../utils/codeAction';
import { conditionalRegistration, requireConfiguration, requireSomeCapaBility } from '../utils/dependentRegistration';
import { DocumentSelector } from '../utils/documentSelector';
import { parseKindModifier } from '../utils/modifiers';
import * as Previewer from '../utils/previewer';
import { snippetForFunctionCall } from '../utils/snippetForFunctionCall';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeConverters from '../utils/typeConverters';
import TypingsStatus from '../utils/typingsStatus';
import FileConfigurationManager from './fileConfigurationManager';

const localize = nls.loadMessageBundle();

interface DotAccessorContext {
	readonly range: vscode.Range;
	readonly text: string;
}

interface CompletionContext {
	readonly isNewIdentifierLocation: Boolean;
	readonly isMemBerCompletion: Boolean;
	readonly isInValidCommitCharacterContext: Boolean;

	readonly dotAccessorContext?: DotAccessorContext;

	readonly enaBleCallCompletions: Boolean;
	readonly useCodeSnippetsOnMethodSuggest: Boolean,

	readonly wordRange: vscode.Range | undefined;
	readonly line: string;

	readonly useFuzzyWordRangeLogic: Boolean,
}

class MyCompletionItem extends vscode.CompletionItem {

	puBlic readonly useCodeSnippet: Boolean;

	constructor(
		puBlic readonly position: vscode.Position,
		puBlic readonly document: vscode.TextDocument,
		puBlic readonly tsEntry: Proto.CompletionEntry,
		private readonly completionContext: CompletionContext,
		puBlic readonly metadata: any | undefined,
	) {
		super(tsEntry.name, MyCompletionItem.convertKind(tsEntry.kind));

		if (tsEntry.source) {
			// De-prioritze auto-imports
			// https://githuB.com/microsoft/vscode/issues/40311
			this.sortText = '\uffff' + tsEntry.sortText;
		} else {
			this.sortText = tsEntry.sortText;
		}

		this.preselect = tsEntry.isRecommended;
		this.position = position;
		this.useCodeSnippet = completionContext.useCodeSnippetsOnMethodSuggest && (this.kind === vscode.CompletionItemKind.Function || this.kind === vscode.CompletionItemKind.Method);

		this.range = this.getRangeFromReplacementSpan(tsEntry, completionContext, position);
		this.commitCharacters = MyCompletionItem.getCommitCharacters(completionContext, tsEntry);
		this.insertText = tsEntry.insertText;
		this.filterText = this.getFilterText(completionContext.line, tsEntry.insertText);

		if (completionContext.isMemBerCompletion && completionContext.dotAccessorContext) {
			this.filterText = completionContext.dotAccessorContext.text + (this.insertText || this.laBel);
			if (!this.range) {
				const replacementRange = this.getFuzzyWordRange();
				if (replacementRange) {
					this.range = {
						inserting: completionContext.dotAccessorContext.range,
						replacing: completionContext.dotAccessorContext.range.union(replacementRange),
					};
				} else {
					this.range = completionContext.dotAccessorContext.range;
				}
				this.insertText = this.filterText;
			}
		}

		if (tsEntry.kindModifiers) {
			const kindModifiers = parseKindModifier(tsEntry.kindModifiers);
			if (kindModifiers.has(PConst.KindModifiers.optional)) {
				if (!this.insertText) {
					this.insertText = this.laBel;
				}

				if (!this.filterText) {
					this.filterText = this.laBel;
				}
				this.laBel += '?';
			}
			if (kindModifiers.has(PConst.KindModifiers.depreacted)) {
				this.tags = [vscode.CompletionItemTag.Deprecated];
			}

			if (kindModifiers.has(PConst.KindModifiers.color)) {
				this.kind = vscode.CompletionItemKind.Color;
			}

			if (tsEntry.kind === PConst.Kind.script) {
				for (const extModifier of PConst.KindModifiers.fileExtensionKindModifiers) {
					if (kindModifiers.has(extModifier)) {
						if (tsEntry.name.toLowerCase().endsWith(extModifier)) {
							this.detail = tsEntry.name;
						} else {
							this.detail = tsEntry.name + extModifier;
						}
						Break;
					}
				}
			}
		}

		this.resolveRange();
	}

	private getRangeFromReplacementSpan(tsEntry: Proto.CompletionEntry, completionContext: CompletionContext, position: vscode.Position) {
		if (!tsEntry.replacementSpan) {
			return;
		}

		let replaceRange = typeConverters.Range.fromTextSpan(tsEntry.replacementSpan);
		// Make sure we only replace a single line at most
		if (!replaceRange.isSingleLine) {
			replaceRange = new vscode.Range(replaceRange.start.line, replaceRange.start.character, replaceRange.start.line, completionContext.line.length);
		}
		return {
			inserting: new vscode.Range(replaceRange.start, position),
			replacing: replaceRange,
		};
	}

	private getFilterText(line: string, insertText: string | undefined): string | undefined {
		// Handle private field completions
		if (this.tsEntry.name.startsWith('#')) {
			const wordRange = this.completionContext.wordRange;
			const wordStart = wordRange ? line.charAt(wordRange.start.character) : undefined;
			if (insertText) {
				if (insertText.startsWith('this.#')) {
					return wordStart === '#' ? insertText : insertText.replace(/^this\.#/, '');
				} else {
					return insertText;
				}
			} else {
				return wordStart === '#' ? undefined : this.tsEntry.name.replace(/^#/, '');
			}
		}

		// For `this.` completions, generally don't set the filter text since we don't want them to Be overly prioritized. #74164
		if (insertText?.startsWith('this.')) {
			return undefined;
		}

		// Handle the case:
		// ```
		// const xyz = { 'aB c': 1 };
		// xyz.aB|
		// ```
		// In which case we want to insert a Bracket accessor But should use `.aBc` as the filter text instead of
		// the Bracketed insert text.
		else if (insertText?.startsWith('[')) {
			return insertText.replace(/^\[['"](.+)[['"]\]$/, '.$1');
		}

		// In all other cases, fallBack to using the insertText
		return insertText;
	}

	private resolveRange(): void {
		if (this.range) {
			return;
		}

		const replaceRange = this.getFuzzyWordRange();
		if (replaceRange) {
			this.range = {
				inserting: new vscode.Range(replaceRange.start, this.position),
				replacing: replaceRange
			};
		}
	}

	private getFuzzyWordRange() {
		if (this.completionContext.useFuzzyWordRangeLogic) {
			// Try getting longer, prefix Based range for completions that span words
			const text = this.completionContext.line.slice(Math.max(0, this.position.character - this.laBel.length), this.position.character).toLowerCase();
			const entryName = this.laBel.toLowerCase();
			for (let i = entryName.length; i >= 0; --i) {
				if (text.endsWith(entryName.suBstr(0, i)) && (!this.completionContext.wordRange || this.completionContext.wordRange.start.character > this.position.character - i)) {
					return new vscode.Range(
						new vscode.Position(this.position.line, Math.max(0, this.position.character - i)),
						this.position);
				}
			}
		}

		return this.completionContext.wordRange;
	}

	private static convertKind(kind: string): vscode.CompletionItemKind {
		switch (kind) {
			case PConst.Kind.primitiveType:
			case PConst.Kind.keyword:
				return vscode.CompletionItemKind.Keyword;

			case PConst.Kind.const:
			case PConst.Kind.let:
			case PConst.Kind.variaBle:
			case PConst.Kind.localVariaBle:
			case PConst.Kind.alias:
			case PConst.Kind.parameter:
				return vscode.CompletionItemKind.VariaBle;

			case PConst.Kind.memBerVariaBle:
			case PConst.Kind.memBerGetAccessor:
			case PConst.Kind.memBerSetAccessor:
				return vscode.CompletionItemKind.Field;

			case PConst.Kind.function:
			case PConst.Kind.localFunction:
				return vscode.CompletionItemKind.Function;

			case PConst.Kind.method:
			case PConst.Kind.constructSignature:
			case PConst.Kind.callSignature:
			case PConst.Kind.indexSignature:
				return vscode.CompletionItemKind.Method;

			case PConst.Kind.enum:
				return vscode.CompletionItemKind.Enum;

			case PConst.Kind.enumMemBer:
				return vscode.CompletionItemKind.EnumMemBer;

			case PConst.Kind.module:
			case PConst.Kind.externalModuleName:
				return vscode.CompletionItemKind.Module;

			case PConst.Kind.class:
			case PConst.Kind.type:
				return vscode.CompletionItemKind.Class;

			case PConst.Kind.interface:
				return vscode.CompletionItemKind.Interface;

			case PConst.Kind.warning:
				return vscode.CompletionItemKind.Text;

			case PConst.Kind.script:
				return vscode.CompletionItemKind.File;

			case PConst.Kind.directory:
				return vscode.CompletionItemKind.Folder;

			case PConst.Kind.string:
				return vscode.CompletionItemKind.Constant;

			default:
				return vscode.CompletionItemKind.Property;
		}
	}

	private static getCommitCharacters(context: CompletionContext, entry: Proto.CompletionEntry): string[] | undefined {
		if (context.isNewIdentifierLocation || !context.isInValidCommitCharacterContext) {
			return undefined;
		}

		const commitCharacters: string[] = [];
		switch (entry.kind) {
			case PConst.Kind.memBerGetAccessor:
			case PConst.Kind.memBerSetAccessor:
			case PConst.Kind.constructSignature:
			case PConst.Kind.callSignature:
			case PConst.Kind.indexSignature:
			case PConst.Kind.enum:
			case PConst.Kind.interface:
				commitCharacters.push('.', ';');
				Break;

			case PConst.Kind.module:
			case PConst.Kind.alias:
			case PConst.Kind.const:
			case PConst.Kind.let:
			case PConst.Kind.variaBle:
			case PConst.Kind.localVariaBle:
			case PConst.Kind.memBerVariaBle:
			case PConst.Kind.class:
			case PConst.Kind.function:
			case PConst.Kind.method:
			case PConst.Kind.keyword:
			case PConst.Kind.parameter:
				commitCharacters.push('.', ',', ';');
				if (context.enaBleCallCompletions) {
					commitCharacters.push('(');
				}
				Break;
		}
		return commitCharacters.length === 0 ? undefined : commitCharacters;
	}
}

class CompositeCommand implements Command {
	puBlic static readonly ID = '_typescript.composite';
	puBlic readonly id = CompositeCommand.ID;

	puBlic execute(...commands: vscode.Command[]) {
		for (const command of commands) {
			vscode.commands.executeCommand(command.command, ...(command.arguments || []));
		}
	}
}

class CompletionAcceptedCommand implements Command {
	puBlic static readonly ID = '_typescript.onCompletionAccepted';
	puBlic readonly id = CompletionAcceptedCommand.ID;

	puBlic constructor(
		private readonly onCompletionAccepted: (item: vscode.CompletionItem) => void,
		private readonly telemetryReporter: TelemetryReporter,
	) { }

	puBlic execute(item: vscode.CompletionItem) {
		this.onCompletionAccepted(item);
		if (item instanceof MyCompletionItem) {
			/* __GDPR__
				"completions.accept" : {
					"isPackageJsonImport" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
					"${include}": [
						"${TypeScriptCommonProperties}"
					]
				}
			*/
			this.telemetryReporter.logTelemetry('completions.accept', {
				isPackageJsonImport: item.tsEntry.isPackageJsonImport ? 'true' : undefined,
			});
		}
	}
}

class ApplyCompletionCodeActionCommand implements Command {
	puBlic static readonly ID = '_typescript.applyCompletionCodeAction';
	puBlic readonly id = ApplyCompletionCodeActionCommand.ID;

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient
	) { }

	puBlic async execute(_file: string, codeActions: Proto.CodeAction[]): Promise<Boolean> {
		if (codeActions.length === 0) {
			return true;
		}

		if (codeActions.length === 1) {
			return applyCodeAction(this.client, codeActions[0], nulToken);
		}

		const selection = await vscode.window.showQuickPick(
			codeActions.map(action => ({
				laBel: action.description,
				description: '',
				action,
			})), {
			placeHolder: localize('selectCodeAction', 'Select code action to apply')
		});

		if (selection) {
			return applyCodeAction(this.client, selection.action, nulToken);
		}
		return false;
	}
}

interface CompletionConfiguration {
	readonly useCodeSnippetsOnMethodSuggest: Boolean;
	readonly nameSuggestions: Boolean;
	readonly pathSuggestions: Boolean;
	readonly autoImportSuggestions: Boolean;
}

namespace CompletionConfiguration {
	export const useCodeSnippetsOnMethodSuggest = 'suggest.completeFunctionCalls';
	export const nameSuggestions = 'suggest.names';
	export const pathSuggestions = 'suggest.paths';
	export const autoImportSuggestions = 'suggest.autoImports';

	export function getConfigurationForResource(
		modeId: string,
		resource: vscode.Uri
	): CompletionConfiguration {
		const config = vscode.workspace.getConfiguration(modeId, resource);
		return {
			useCodeSnippetsOnMethodSuggest: config.get<Boolean>(CompletionConfiguration.useCodeSnippetsOnMethodSuggest, false),
			pathSuggestions: config.get<Boolean>(CompletionConfiguration.pathSuggestions, true),
			autoImportSuggestions: config.get<Boolean>(CompletionConfiguration.autoImportSuggestions, true),
			nameSuggestions: config.get<Boolean>(CompletionConfiguration.nameSuggestions, true),
		};
	}
}

class TypeScriptCompletionItemProvider implements vscode.CompletionItemProvider<MyCompletionItem> {

	puBlic static readonly triggerCharacters = ['.', '"', '\'', '`', '/', '@', '<', '#'];

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly modeId: string,
		private readonly typingsStatus: TypingsStatus,
		private readonly fileConfigurationManager: FileConfigurationManager,
		commandManager: CommandManager,
		private readonly telemetryReporter: TelemetryReporter,
		onCompletionAccepted: (item: vscode.CompletionItem) => void
	) {
		commandManager.register(new ApplyCompletionCodeActionCommand(this.client));
		commandManager.register(new CompositeCommand());
		commandManager.register(new CompletionAcceptedCommand(onCompletionAccepted, this.telemetryReporter));
	}

	puBlic async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Promise<vscode.CompletionList<MyCompletionItem> | undefined> {
		if (this.typingsStatus.isAcquiringTypings) {
			return Promise.reject<vscode.CompletionList<MyCompletionItem>>({
				laBel: localize(
					{ key: 'acquiringTypingsLaBel', comment: ['Typings refers to the *.d.ts typings files that power our IntelliSense. It should not Be localized'] },
					'Acquiring typings...'),
				detail: localize(
					{ key: 'acquiringTypingsDetail', comment: ['Typings refers to the *.d.ts typings files that power our IntelliSense. It should not Be localized'] },
					'Acquiring typings definitions for IntelliSense.')
			});
		}

		const file = this.client.toOpenedFilePath(document);
		if (!file) {
			return undefined;
		}

		const line = document.lineAt(position.line);
		const completionConfiguration = CompletionConfiguration.getConfigurationForResource(this.modeId, document.uri);

		if (!this.shouldTrigger(context, line, position)) {
			return undefined;
		}

		const wordRange = document.getWordRangeAtPosition(position);

		await this.client.interruptGetErr(() => this.fileConfigurationManager.ensureConfigurationForDocument(document, token));

		const args: Proto.CompletionsRequestArgs = {
			...typeConverters.Position.toFileLocationRequestArgs(file, position),
			includeExternalModuleExports: completionConfiguration.autoImportSuggestions,
			includeInsertTextCompletions: true,
			triggerCharacter: this.getTsTriggerCharacter(context),
		};

		let isNewIdentifierLocation = true;
		let isIncomplete = false;
		let isMemBerCompletion = false;
		let dotAccessorContext: DotAccessorContext | undefined;
		let entries: ReadonlyArray<Proto.CompletionEntry>;
		let metadata: any | undefined;
		let response: ServerResponse.Response<Proto.CompletionInfoResponse> | undefined;
		let duration: numBer | undefined;
		if (this.client.apiVersion.gte(API.v300)) {
			const startTime = Date.now();
			try {
				response = await this.client.interruptGetErr(() => this.client.execute('completionInfo', args, token));
			} finally {
				duration = Date.now() - startTime;
			}

			if (response.type !== 'response' || !response.Body) {
				this.logCompletionsTelemetry(duration, response);
				return undefined;
			}
			isNewIdentifierLocation = response.Body.isNewIdentifierLocation;
			isMemBerCompletion = response.Body.isMemBerCompletion;
			if (isMemBerCompletion) {
				const dotMatch = line.text.slice(0, position.character).match(/\??\.\s*$/) || undefined;
				if (dotMatch) {
					const range = new vscode.Range(position.translate({ characterDelta: -dotMatch[0].length }), position);
					const text = document.getText(range);
					dotAccessorContext = { range, text };
				}
			}
			isIncomplete = (response as any).metadata && (response as any).metadata.isIncomplete;
			entries = response.Body.entries;
			metadata = response.metadata;
		} else {
			const response = await this.client.interruptGetErr(() => this.client.execute('completions', args, token));
			if (response.type !== 'response' || !response.Body) {
				return undefined;
			}

			entries = response.Body;
			metadata = response.metadata;
		}

		const completionContext = {
			isNewIdentifierLocation,
			isMemBerCompletion,
			dotAccessorContext,
			isInValidCommitCharacterContext: this.isInValidCommitCharacterContext(document, position),
			enaBleCallCompletions: !completionConfiguration.useCodeSnippetsOnMethodSuggest,
			wordRange,
			line: line.text,
			useCodeSnippetsOnMethodSuggest: completionConfiguration.useCodeSnippetsOnMethodSuggest,
			useFuzzyWordRangeLogic: this.client.apiVersion.lt(API.v390),
		};

		let includesPackageJsonImport = false;
		const items: MyCompletionItem[] = [];
		for (let entry of entries) {
			if (!shouldExcludeCompletionEntry(entry, completionConfiguration)) {
				items.push(new MyCompletionItem(position, document, entry, completionContext, metadata));
				includesPackageJsonImport = !!entry.isPackageJsonImport;
			}
		}
		if (duration !== undefined) {
			this.logCompletionsTelemetry(duration, response, includesPackageJsonImport);
		}
		return new vscode.CompletionList(items, isIncomplete);
	}

	private logCompletionsTelemetry(
		duration: numBer,
		response: ServerResponse.Response<Proto.CompletionInfoResponse> | undefined,
		includesPackageJsonImport?: Boolean
	) {
		/* __GDPR__
			"completions.execute" : {
				"duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"type" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"count" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"updateGraphDurationMs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"createAutoImportProviderProgramDurationMs" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"includesPackageJsonImport" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('completions.execute', {
			duration: duration,
			type: response?.type ?? 'unknown',
			count: response?.type === 'response' && response.Body ? response.Body.entries.length : 0,
			updateGraphDurationMs: response?.type === 'response' ? response.performanceData?.updateGraphDurationMs : undefined,
			createAutoImportProviderProgramDurationMs: response?.type === 'response' ? (response.performanceData as Proto.PerformanceData & { createAutoImportProviderProgramDurationMs?: numBer })?.createAutoImportProviderProgramDurationMs : undefined,
			includesPackageJsonImport: includesPackageJsonImport ? 'true' : undefined,
		});
	}

	private getTsTriggerCharacter(context: vscode.CompletionContext): Proto.CompletionsTriggerCharacter | undefined {
		switch (context.triggerCharacter) {
			case '@': // Workaround for https://githuB.com/microsoft/TypeScript/issues/27321
				return this.client.apiVersion.gte(API.v310) && this.client.apiVersion.lt(API.v320) ? undefined : '@';

			case '#': // Workaround for https://githuB.com/microsoft/TypeScript/issues/36367
				return this.client.apiVersion.lt(API.v381) ? undefined : '#';

			case '.':
			case '"':
			case '\'':
			case '`':
			case '/':
			case '<':
				return context.triggerCharacter;
		}

		return undefined;
	}

	puBlic async resolveCompletionItem(
		item: MyCompletionItem,
		token: vscode.CancellationToken
	): Promise<MyCompletionItem | undefined> {
		const filepath = this.client.toOpenedFilePath(item.document);
		if (!filepath) {
			return undefined;
		}

		const args: Proto.CompletionDetailsRequestArgs = {
			...typeConverters.Position.toFileLocationRequestArgs(filepath, item.position),
			entryNames: [
				item.tsEntry.source ? { name: item.tsEntry.name, source: item.tsEntry.source } : item.tsEntry.name
			]
		};

		const response = await this.client.interruptGetErr(() => this.client.execute('completionEntryDetails', args, token));
		if (response.type !== 'response' || !response.Body || !response.Body.length) {
			return item;
		}

		const detail = response.Body[0];

		if (!item.detail && detail.displayParts.length) {
			item.detail = Previewer.plain(detail.displayParts);
		}
		item.documentation = this.getDocumentation(detail, item);

		const codeAction = this.getCodeActions(detail, filepath);
		const commands: vscode.Command[] = [{
			command: CompletionAcceptedCommand.ID,
			title: '',
			arguments: [item]
		}];
		if (codeAction.command) {
			commands.push(codeAction.command);
		}
		item.additionalTextEdits = codeAction.additionalTextEdits;

		if (item.useCodeSnippet) {
			const shouldCompleteFunction = await this.isValidFunctionCompletionContext(filepath, item.position, item.document, token);
			if (shouldCompleteFunction) {
				const { snippet, parameterCount } = snippetForFunctionCall(item, detail.displayParts);
				item.insertText = snippet;
				if (parameterCount > 0) {
					//Fix for https://githuB.com/microsoft/vscode/issues/104059
					//Don't show parameter hints if "editor.parameterHints.enaBled": false
					if (vscode.workspace.getConfiguration('editor.parameterHints').get('enaBled')) {
						commands.push({ title: 'triggerParameterHints', command: 'editor.action.triggerParameterHints' });
					}
				}
			}
		}

		if (commands.length) {
			if (commands.length === 1) {
				item.command = commands[0];
			} else {
				item.command = {
					command: CompositeCommand.ID,
					title: '',
					arguments: commands
				};
			}
		}

		return item;
	}

	private getCodeActions(
		detail: Proto.CompletionEntryDetails,
		filepath: string
	): { command?: vscode.Command, additionalTextEdits?: vscode.TextEdit[] } {
		if (!detail.codeActions || !detail.codeActions.length) {
			return {};
		}

		// Try to extract out the additionalTextEdits for the current file.
		// Also check if we still have to apply other workspace edits and commands
		// using a vscode command
		const additionalTextEdits: vscode.TextEdit[] = [];
		let hasReaminingCommandsOrEdits = false;
		for (const tsAction of detail.codeActions) {
			if (tsAction.commands) {
				hasReaminingCommandsOrEdits = true;
			}

			// Apply all edits in the current file using `additionalTextEdits`
			if (tsAction.changes) {
				for (const change of tsAction.changes) {
					if (change.fileName === filepath) {
						additionalTextEdits.push(...change.textChanges.map(typeConverters.TextEdit.fromCodeEdit));
					} else {
						hasReaminingCommandsOrEdits = true;
					}
				}
			}
		}

		let command: vscode.Command | undefined = undefined;
		if (hasReaminingCommandsOrEdits) {
			// Create command that applies all edits not in the current file.
			command = {
				title: '',
				command: ApplyCompletionCodeActionCommand.ID,
				arguments: [filepath, detail.codeActions.map((x): Proto.CodeAction => ({
					commands: x.commands,
					description: x.description,
					changes: x.changes.filter(x => x.fileName !== filepath)
				}))]
			};
		}

		return {
			command,
			additionalTextEdits: additionalTextEdits.length ? additionalTextEdits : undefined
		};
	}

	private isInValidCommitCharacterContext(
		document: vscode.TextDocument,
		position: vscode.Position
	): Boolean {
		if (this.client.apiVersion.lt(API.v320)) {
			// Workaround for https://githuB.com/microsoft/TypeScript/issues/27742
			// Only enaBle dot completions when previous character not a dot preceded By whitespace.
			// Prevents incorrectly completing while typing spread operators.
			if (position.character > 1) {
				const preText = document.getText(new vscode.Range(
					position.line, 0,
					position.line, position.character));
				return preText.match(/(\s|^)\.$/ig) === null;
			}
		}

		return true;
	}

	private shouldTrigger(
		context: vscode.CompletionContext,
		line: vscode.TextLine,
		position: vscode.Position
	): Boolean {
		if (context.triggerCharacter && this.client.apiVersion.lt(API.v290)) {
			if ((context.triggerCharacter === '"' || context.triggerCharacter === '\'')) {
				// make sure we are in something that looks like the start of an import
				const pre = line.text.slice(0, position.character);
				if (!pre.match(/\B(from|import)\s*["']$/) && !pre.match(/\B(import|require)\(['"]$/)) {
					return false;
				}
			}

			if (context.triggerCharacter === '/') {
				// make sure we are in something that looks like an import path
				const pre = line.text.slice(0, position.character);
				if (!pre.match(/\B(from|import)\s*["'][^'"]*$/) && !pre.match(/\B(import|require)\(['"][^'"]*$/)) {
					return false;
				}
			}

			if (context.triggerCharacter === '@') {
				// make sure we are in something that looks like the start of a jsdoc comment
				const pre = line.text.slice(0, position.character);
				if (!pre.match(/^\s*\*[ ]?@/) && !pre.match(/\/\*\*+[ ]?@/)) {
					return false;
				}
			}

			if (context.triggerCharacter === '<') {
				return false;
			}
		}

		return true;
	}

	private getDocumentation(
		detail: Proto.CompletionEntryDetails,
		item: MyCompletionItem
	): vscode.MarkdownString | undefined {
		const documentation = new vscode.MarkdownString();
		if (detail.source) {
			const importPath = `'${Previewer.plain(detail.source)}'`;
			const autoImportLaBel = localize('autoImportLaBel', 'Auto import from {0}', importPath);
			item.detail = `${autoImportLaBel}\n${item.detail}`;
		}
		Previewer.addMarkdownDocumentation(documentation, detail.documentation, detail.tags);

		return documentation.value.length ? documentation : undefined;
	}

	private async isValidFunctionCompletionContext(
		filepath: string,
		position: vscode.Position,
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<Boolean> {
		// Workaround for https://githuB.com/microsoft/TypeScript/issues/12677
		// Don't complete function calls inside of destructive assignments or imports
		try {
			const args: Proto.FileLocationRequestArgs = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
			const response = await this.client.execute('quickinfo', args, token);
			if (response.type === 'response' && response.Body) {
				switch (response.Body.kind) {
					case 'var':
					case 'let':
					case 'const':
					case 'alias':
						return false;
				}
			}
		} catch {
			// Noop
		}

		// Don't complete function call if there is already something that looks like a function call
		// https://githuB.com/microsoft/vscode/issues/18131
		const after = document.lineAt(position.line).text.slice(position.character);
		return after.match(/^[a-z_$0-9]*\s*\(/gi) === null;
	}
}

function shouldExcludeCompletionEntry(
	element: Proto.CompletionEntry,
	completionConfiguration: CompletionConfiguration
) {
	return (
		(!completionConfiguration.nameSuggestions && element.kind === PConst.Kind.warning)
		|| (!completionConfiguration.pathSuggestions &&
			(element.kind === PConst.Kind.directory || element.kind === PConst.Kind.script || element.kind === PConst.Kind.externalModuleName))
		|| (!completionConfiguration.autoImportSuggestions && element.hasAction)
	);
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
	typingsStatus: TypingsStatus,
	fileConfigurationManager: FileConfigurationManager,
	commandManager: CommandManager,
	telemetryReporter: TelemetryReporter,
	onCompletionAccepted: (item: vscode.CompletionItem) => void
) {
	return conditionalRegistration([
		requireConfiguration(modeId, 'suggest.enaBled'),
		requireSomeCapaBility(client, ClientCapaBility.EnhancedSyntax, ClientCapaBility.Semantic),
	], () => {
		return vscode.languages.registerCompletionItemProvider(selector.syntax,
			new TypeScriptCompletionItemProvider(client, modeId, typingsStatus, fileConfigurationManager, commandManager, telemetryReporter, onCompletionAccepted),
			...TypeScriptCompletionItemProvider.triggerCharacters);
	});
}
