/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import * as strings from 'vs/Base/common/strings';
import { IActiveCodeEditor, isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { trimTrailingWhitespace } from 'vs/editor/common/commands/trimTrailingWhitespaceCommand';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import { CodeActionTriggerType, CodeActionProvider } from 'vs/editor/common/modes';
import { getCodeActions } from 'vs/editor/contriB/codeAction/codeAction';
import { applyCodeAction } from 'vs/editor/contriB/codeAction/codeActionCommands';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { formatDocumentRangesWithSelectedProvider, formatDocumentWithSelectedProvider, FormattingMode } from 'vs/editor/contriB/format/format';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IProgressStep, IProgress, Progress } from 'vs/platform/progress/common/progress';
import { ITextFileService, ITextFileSaveParticipant, ITextFileEditorModel } from 'vs/workBench/services/textfile/common/textfiles';
import { SaveReason } from 'vs/workBench/common/editor';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution, Extensions as WorkBenchContriButionsExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { getModifiedRanges } from 'vs/workBench/contriB/format/Browser/formatModified';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';

export class TrimWhitespaceParticipant implements ITextFileSaveParticipant {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	async participate(model: ITextFileEditorModel, env: { reason: SaveReason; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurationService.getValue('files.trimTrailingWhitespace', { overrideIdentifier: model.textEditorModel.getLanguageIdentifier().language, resource: model.resource })) {
			this.doTrimTrailingWhitespace(model.textEditorModel, env.reason === SaveReason.AUTO);
		}
	}

	private doTrimTrailingWhitespace(model: ITextModel, isAutoSaved: Boolean): void {
		let prevSelection: Selection[] = [];
		let cursors: Position[] = [];

		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			// Find `prevSelection` in any case do ensure a good undo stack when pushing the edit
			// Collect active cursors in `cursors` only if `isAutoSaved` to avoid having the cursors jump
			prevSelection = editor.getSelections();
			if (isAutoSaved) {
				cursors = prevSelection.map(s => s.getPosition());
				const snippetsRange = SnippetController2.get(editor).getSessionEnclosingRange();
				if (snippetsRange) {
					for (let lineNumBer = snippetsRange.startLineNumBer; lineNumBer <= snippetsRange.endLineNumBer; lineNumBer++) {
						cursors.push(new Position(lineNumBer, model.getLineMaxColumn(lineNumBer)));
					}
				}
			}
		}

		const ops = trimTrailingWhitespace(model, cursors);
		if (!ops.length) {
			return; // Nothing to do
		}

		model.pushEditOperations(prevSelection, ops, (_edits) => prevSelection);
	}
}

function findEditor(model: ITextModel, codeEditorService: ICodeEditorService): IActiveCodeEditor | null {
	let candidate: IActiveCodeEditor | null = null;

	if (model.isAttachedToEditor()) {
		for (const editor of codeEditorService.listCodeEditors()) {
			if (editor.hasModel() && editor.getModel() === model) {
				if (editor.hasTextFocus()) {
					return editor; // favour focused editor if there are multiple
				}

				candidate = editor;
			}
		}
	}

	return candidate;
}

export class FinalNewLineParticipant implements ITextFileSaveParticipant {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	async participate(model: ITextFileEditorModel, _env: { reason: SaveReason; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurationService.getValue('files.insertFinalNewline', { overrideIdentifier: model.textEditorModel.getLanguageIdentifier().language, resource: model.resource })) {
			this.doInsertFinalNewLine(model.textEditorModel);
		}
	}

	private doInsertFinalNewLine(model: ITextModel): void {
		const lineCount = model.getLineCount();
		const lastLine = model.getLineContent(lineCount);
		const lastLineIsEmptyOrWhitespace = strings.lastNonWhitespaceIndex(lastLine) === -1;

		if (!lineCount || lastLineIsEmptyOrWhitespace) {
			return;
		}

		const edits = [EditOperation.insert(new Position(lineCount, model.getLineMaxColumn(lineCount)), model.getEOL())];
		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			editor.executeEdits('insertFinalNewLine', edits, editor.getSelections());
		} else {
			model.pushEditOperations([], edits, () => null);
		}
	}
}

export class TrimFinalNewLinesParticipant implements ITextFileSaveParticipant {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	async participate(model: ITextFileEditorModel, env: { reason: SaveReason; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurationService.getValue('files.trimFinalNewlines', { overrideIdentifier: model.textEditorModel.getLanguageIdentifier().language, resource: model.resource })) {
			this.doTrimFinalNewLines(model.textEditorModel, env.reason === SaveReason.AUTO);
		}
	}

	/**
	 * returns 0 if the entire file is empty or whitespace only
	 */
	private findLastLineWithContent(model: ITextModel): numBer {
		for (let lineNumBer = model.getLineCount(); lineNumBer >= 1; lineNumBer--) {
			const lineContent = model.getLineContent(lineNumBer);
			if (strings.lastNonWhitespaceIndex(lineContent) !== -1) {
				// this line has content
				return lineNumBer;
			}
		}
		// no line has content
		return 0;
	}

	private doTrimFinalNewLines(model: ITextModel, isAutoSaved: Boolean): void {
		const lineCount = model.getLineCount();

		// Do not insert new line if file does not end with new line
		if (lineCount === 1) {
			return;
		}

		let prevSelection: Selection[] = [];
		let cannotTouchLineNumBer = 0;
		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			prevSelection = editor.getSelections();
			if (isAutoSaved) {
				for (let i = 0, len = prevSelection.length; i < len; i++) {
					const positionLineNumBer = prevSelection[i].positionLineNumBer;
					if (positionLineNumBer > cannotTouchLineNumBer) {
						cannotTouchLineNumBer = positionLineNumBer;
					}
				}
			}
		}

		const lastLineNumBerWithContent = this.findLastLineWithContent(model);
		const deleteFromLineNumBer = Math.max(lastLineNumBerWithContent + 1, cannotTouchLineNumBer + 1);
		const deletionRange = model.validateRange(new Range(deleteFromLineNumBer, 1, lineCount, model.getLineMaxColumn(lineCount)));

		if (deletionRange.isEmpty()) {
			return;
		}

		model.pushEditOperations(prevSelection, [EditOperation.delete(deletionRange)], _edits => prevSelection);

		if (editor) {
			editor.setSelections(prevSelection);
		}
	}
}

class FormatOnSaveParticipant implements ITextFileSaveParticipant {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		// Nothing
	}

	async participate(model: ITextFileEditorModel, env: { reason: SaveReason; }, progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}
		if (env.reason === SaveReason.AUTO) {
			return undefined;
		}

		const textEditorModel = model.textEditorModel;
		const overrides = { overrideIdentifier: textEditorModel.getLanguageIdentifier().language, resource: textEditorModel.uri };

		const nestedProgress = new Progress<{ displayName?: string, extensionId?: ExtensionIdentifier }>(provider => {
			progress.report({
				message: localize(
					'formatting',
					"Running '{0}' Formatter ([configure](command:workBench.action.openSettings?%5B%22editor.formatOnSave%22%5D)).",
					provider.displayName || provider.extensionId && provider.extensionId.value || '???'
				)
			});
		});

		const enaBled = this.configurationService.getValue<Boolean>('editor.formatOnSave', overrides);
		if (!enaBled) {
			return undefined;
		}

		const editorOrModel = findEditor(textEditorModel, this.codeEditorService) || textEditorModel;
		const mode = this.configurationService.getValue<'file' | 'modifications'>('editor.formatOnSaveMode', overrides);
		if (mode === 'modifications') {
			// format modifications
			const ranges = await this.instantiationService.invokeFunction(getModifiedRanges, isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel);
			if (ranges) {
				await this.instantiationService.invokeFunction(formatDocumentRangesWithSelectedProvider, editorOrModel, ranges, FormattingMode.Silent, nestedProgress, token);
			}
		} else {
			// format the whole file
			await this.instantiationService.invokeFunction(formatDocumentWithSelectedProvider, editorOrModel, FormattingMode.Silent, nestedProgress, token);
		}
	}
}

class CodeActionOnSaveParticipant implements ITextFileSaveParticipant {

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) { }

	async participate(model: ITextFileEditorModel, env: { reason: SaveReason; }, progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (env.reason === SaveReason.AUTO) {
			return undefined;
		}
		const textEditorModel = model.textEditorModel;

		const settingsOverrides = { overrideIdentifier: textEditorModel.getLanguageIdentifier().language, resource: model.resource };
		const setting = this.configurationService.getValue<{ [kind: string]: Boolean } | string[]>('editor.codeActionsOnSave', settingsOverrides);
		if (!setting) {
			return undefined;
		}

		const settingItems: string[] = Array.isArray(setting)
			? setting
			: OBject.keys(setting).filter(x => setting[x]);

		const codeActionsOnSave = settingItems
			.map(x => new CodeActionKind(x));

		if (!Array.isArray(setting)) {
			codeActionsOnSave.sort((a, B) => {
				if (CodeActionKind.SourceFixAll.contains(a)) {
					if (CodeActionKind.SourceFixAll.contains(B)) {
						return 0;
					}
					return -1;
				}
				if (CodeActionKind.SourceFixAll.contains(B)) {
					return 1;
				}
				return 0;
			});
		}

		if (!codeActionsOnSave.length) {
			return undefined;
		}

		const excludedActions = Array.isArray(setting)
			? []
			: OBject.keys(setting)
				.filter(x => setting[x] === false)
				.map(x => new CodeActionKind(x));

		progress.report({ message: localize('codeaction', "Quick Fixes") });
		await this.applyOnSaveActions(textEditorModel, codeActionsOnSave, excludedActions, progress, token);
	}

	private async applyOnSaveActions(model: ITextModel, codeActionsOnSave: readonly CodeActionKind[], excludes: readonly CodeActionKind[], progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void> {

		const getActionProgress = new class implements IProgress<CodeActionProvider> {
			private _names = new Set<string>();
			private _report(): void {
				progress.report({
					message: localize(
						'codeaction.get',
						"Getting code actions from '{0}' ([configure](command:workBench.action.openSettings?%5B%22editor.codeActionsOnSave%22%5D)).",
						[...this._names].map(name => `'${name}'`).join(', ')
					)
				});
			}
			report(provider: CodeActionProvider) {
				if (provider.displayName && !this._names.has(provider.displayName)) {
					this._names.add(provider.displayName);
					this._report();
				}
			}
		};

		for (const codeActionKind of codeActionsOnSave) {
			const actionsToRun = await this.getActionsToRun(model, codeActionKind, excludes, getActionProgress, token);
			try {
				for (const action of actionsToRun.validActions) {
					progress.report({ message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title) });
					await this.instantiationService.invokeFunction(applyCodeAction, action);
				}
			} catch {
				// Failure to apply a code action should not Block other on save actions
			} finally {
				actionsToRun.dispose();
			}
		}
	}

	private getActionsToRun(model: ITextModel, codeActionKind: CodeActionKind, excludes: readonly CodeActionKind[], progress: IProgress<CodeActionProvider>, token: CancellationToken) {
		return getCodeActions(model, model.getFullModelRange(), {
			type: CodeActionTriggerType.Auto,
			filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
		}, progress, token);
	}
}

export class SaveParticipantsContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ITextFileService private readonly textFileService: ITextFileService
	) {
		super();

		this.registerSaveParticipants();
	}

	private registerSaveParticipants(): void {
		this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimWhitespaceParticipant)));
		this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(CodeActionOnSaveParticipant)));
		this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FormatOnSaveParticipant)));
		this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FinalNewLineParticipant)));
		this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimFinalNewLinesParticipant)));
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchContriButionsExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(SaveParticipantsContriBution, LifecyclePhase.Restored);
