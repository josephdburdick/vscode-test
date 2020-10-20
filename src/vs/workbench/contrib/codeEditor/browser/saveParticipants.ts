/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import * As strings from 'vs/bAse/common/strings';
import { IActiveCodeEditor, isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { trimTrAilingWhitespAce } from 'vs/editor/common/commAnds/trimTrAilingWhitespAceCommAnd';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import { CodeActionTriggerType, CodeActionProvider } from 'vs/editor/common/modes';
import { getCodeActions } from 'vs/editor/contrib/codeAction/codeAction';
import { ApplyCodeAction } from 'vs/editor/contrib/codeAction/codeActionCommAnds';
import { CodeActionKind } from 'vs/editor/contrib/codeAction/types';
import { formAtDocumentRAngesWithSelectedProvider, formAtDocumentWithSelectedProvider, FormAttingMode } from 'vs/editor/contrib/formAt/formAt';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { locAlize } from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProgressStep, IProgress, Progress } from 'vs/plAtform/progress/common/progress';
import { ITextFileService, ITextFileSAvePArticipAnt, ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { SAveReAson } from 'vs/workbench/common/editor';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContribution, Extensions As WorkbenchContributionsExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { getModifiedRAnges } from 'vs/workbench/contrib/formAt/browser/formAtModified';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';

export clAss TrimWhitespAcePArticipAnt implements ITextFileSAvePArticipAnt {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	Async pArticipAte(model: ITextFileEditorModel, env: { reAson: SAveReAson; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurAtionService.getVAlue('files.trimTrAilingWhitespAce', { overrideIdentifier: model.textEditorModel.getLAnguAgeIdentifier().lAnguAge, resource: model.resource })) {
			this.doTrimTrAilingWhitespAce(model.textEditorModel, env.reAson === SAveReAson.AUTO);
		}
	}

	privAte doTrimTrAilingWhitespAce(model: ITextModel, isAutoSAved: booleAn): void {
		let prevSelection: Selection[] = [];
		let cursors: Position[] = [];

		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			// Find `prevSelection` in Any cAse do ensure A good undo stAck when pushing the edit
			// Collect Active cursors in `cursors` only if `isAutoSAved` to Avoid hAving the cursors jump
			prevSelection = editor.getSelections();
			if (isAutoSAved) {
				cursors = prevSelection.mAp(s => s.getPosition());
				const snippetsRAnge = SnippetController2.get(editor).getSessionEnclosingRAnge();
				if (snippetsRAnge) {
					for (let lineNumber = snippetsRAnge.stArtLineNumber; lineNumber <= snippetsRAnge.endLineNumber; lineNumber++) {
						cursors.push(new Position(lineNumber, model.getLineMAxColumn(lineNumber)));
					}
				}
			}
		}

		const ops = trimTrAilingWhitespAce(model, cursors);
		if (!ops.length) {
			return; // Nothing to do
		}

		model.pushEditOperAtions(prevSelection, ops, (_edits) => prevSelection);
	}
}

function findEditor(model: ITextModel, codeEditorService: ICodeEditorService): IActiveCodeEditor | null {
	let cAndidAte: IActiveCodeEditor | null = null;

	if (model.isAttAchedToEditor()) {
		for (const editor of codeEditorService.listCodeEditors()) {
			if (editor.hAsModel() && editor.getModel() === model) {
				if (editor.hAsTextFocus()) {
					return editor; // fAvour focused editor if there Are multiple
				}

				cAndidAte = editor;
			}
		}
	}

	return cAndidAte;
}

export clAss FinAlNewLinePArticipAnt implements ITextFileSAvePArticipAnt {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	Async pArticipAte(model: ITextFileEditorModel, _env: { reAson: SAveReAson; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurAtionService.getVAlue('files.insertFinAlNewline', { overrideIdentifier: model.textEditorModel.getLAnguAgeIdentifier().lAnguAge, resource: model.resource })) {
			this.doInsertFinAlNewLine(model.textEditorModel);
		}
	}

	privAte doInsertFinAlNewLine(model: ITextModel): void {
		const lineCount = model.getLineCount();
		const lAstLine = model.getLineContent(lineCount);
		const lAstLineIsEmptyOrWhitespAce = strings.lAstNonWhitespAceIndex(lAstLine) === -1;

		if (!lineCount || lAstLineIsEmptyOrWhitespAce) {
			return;
		}

		const edits = [EditOperAtion.insert(new Position(lineCount, model.getLineMAxColumn(lineCount)), model.getEOL())];
		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			editor.executeEdits('insertFinAlNewLine', edits, editor.getSelections());
		} else {
			model.pushEditOperAtions([], edits, () => null);
		}
	}
}

export clAss TrimFinAlNewLinesPArticipAnt implements ITextFileSAvePArticipAnt {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService
	) {
		// Nothing
	}

	Async pArticipAte(model: ITextFileEditorModel, env: { reAson: SAveReAson; }): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (this.configurAtionService.getVAlue('files.trimFinAlNewlines', { overrideIdentifier: model.textEditorModel.getLAnguAgeIdentifier().lAnguAge, resource: model.resource })) {
			this.doTrimFinAlNewLines(model.textEditorModel, env.reAson === SAveReAson.AUTO);
		}
	}

	/**
	 * returns 0 if the entire file is empty or whitespAce only
	 */
	privAte findLAstLineWithContent(model: ITextModel): number {
		for (let lineNumber = model.getLineCount(); lineNumber >= 1; lineNumber--) {
			const lineContent = model.getLineContent(lineNumber);
			if (strings.lAstNonWhitespAceIndex(lineContent) !== -1) {
				// this line hAs content
				return lineNumber;
			}
		}
		// no line hAs content
		return 0;
	}

	privAte doTrimFinAlNewLines(model: ITextModel, isAutoSAved: booleAn): void {
		const lineCount = model.getLineCount();

		// Do not insert new line if file does not end with new line
		if (lineCount === 1) {
			return;
		}

		let prevSelection: Selection[] = [];
		let cAnnotTouchLineNumber = 0;
		const editor = findEditor(model, this.codeEditorService);
		if (editor) {
			prevSelection = editor.getSelections();
			if (isAutoSAved) {
				for (let i = 0, len = prevSelection.length; i < len; i++) {
					const positionLineNumber = prevSelection[i].positionLineNumber;
					if (positionLineNumber > cAnnotTouchLineNumber) {
						cAnnotTouchLineNumber = positionLineNumber;
					}
				}
			}
		}

		const lAstLineNumberWithContent = this.findLAstLineWithContent(model);
		const deleteFromLineNumber = MAth.mAx(lAstLineNumberWithContent + 1, cAnnotTouchLineNumber + 1);
		const deletionRAnge = model.vAlidAteRAnge(new RAnge(deleteFromLineNumber, 1, lineCount, model.getLineMAxColumn(lineCount)));

		if (deletionRAnge.isEmpty()) {
			return;
		}

		model.pushEditOperAtions(prevSelection, [EditOperAtion.delete(deletionRAnge)], _edits => prevSelection);

		if (editor) {
			editor.setSelections(prevSelection);
		}
	}
}

clAss FormAtOnSAvePArticipAnt implements ITextFileSAvePArticipAnt {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
	) {
		// Nothing
	}

	Async pArticipAte(model: ITextFileEditorModel, env: { reAson: SAveReAson; }, progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}
		if (env.reAson === SAveReAson.AUTO) {
			return undefined;
		}

		const textEditorModel = model.textEditorModel;
		const overrides = { overrideIdentifier: textEditorModel.getLAnguAgeIdentifier().lAnguAge, resource: textEditorModel.uri };

		const nestedProgress = new Progress<{ displAyNAme?: string, extensionId?: ExtensionIdentifier }>(provider => {
			progress.report({
				messAge: locAlize(
					'formAtting',
					"Running '{0}' FormAtter ([configure](commAnd:workbench.Action.openSettings?%5B%22editor.formAtOnSAve%22%5D)).",
					provider.displAyNAme || provider.extensionId && provider.extensionId.vAlue || '???'
				)
			});
		});

		const enAbled = this.configurAtionService.getVAlue<booleAn>('editor.formAtOnSAve', overrides);
		if (!enAbled) {
			return undefined;
		}

		const editorOrModel = findEditor(textEditorModel, this.codeEditorService) || textEditorModel;
		const mode = this.configurAtionService.getVAlue<'file' | 'modificAtions'>('editor.formAtOnSAveMode', overrides);
		if (mode === 'modificAtions') {
			// formAt modificAtions
			const rAnges = AwAit this.instAntiAtionService.invokeFunction(getModifiedRAnges, isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel);
			if (rAnges) {
				AwAit this.instAntiAtionService.invokeFunction(formAtDocumentRAngesWithSelectedProvider, editorOrModel, rAnges, FormAttingMode.Silent, nestedProgress, token);
			}
		} else {
			// formAt the whole file
			AwAit this.instAntiAtionService.invokeFunction(formAtDocumentWithSelectedProvider, editorOrModel, FormAttingMode.Silent, nestedProgress, token);
		}
	}
}

clAss CodeActionOnSAvePArticipAnt implements ITextFileSAvePArticipAnt {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
	) { }

	Async pArticipAte(model: ITextFileEditorModel, env: { reAson: SAveReAson; }, progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {
		if (!model.textEditorModel) {
			return;
		}

		if (env.reAson === SAveReAson.AUTO) {
			return undefined;
		}
		const textEditorModel = model.textEditorModel;

		const settingsOverrides = { overrideIdentifier: textEditorModel.getLAnguAgeIdentifier().lAnguAge, resource: model.resource };
		const setting = this.configurAtionService.getVAlue<{ [kind: string]: booleAn } | string[]>('editor.codeActionsOnSAve', settingsOverrides);
		if (!setting) {
			return undefined;
		}

		const settingItems: string[] = ArrAy.isArrAy(setting)
			? setting
			: Object.keys(setting).filter(x => setting[x]);

		const codeActionsOnSAve = settingItems
			.mAp(x => new CodeActionKind(x));

		if (!ArrAy.isArrAy(setting)) {
			codeActionsOnSAve.sort((A, b) => {
				if (CodeActionKind.SourceFixAll.contAins(A)) {
					if (CodeActionKind.SourceFixAll.contAins(b)) {
						return 0;
					}
					return -1;
				}
				if (CodeActionKind.SourceFixAll.contAins(b)) {
					return 1;
				}
				return 0;
			});
		}

		if (!codeActionsOnSAve.length) {
			return undefined;
		}

		const excludedActions = ArrAy.isArrAy(setting)
			? []
			: Object.keys(setting)
				.filter(x => setting[x] === fAlse)
				.mAp(x => new CodeActionKind(x));

		progress.report({ messAge: locAlize('codeAction', "Quick Fixes") });
		AwAit this.ApplyOnSAveActions(textEditorModel, codeActionsOnSAve, excludedActions, progress, token);
	}

	privAte Async ApplyOnSAveActions(model: ITextModel, codeActionsOnSAve: reAdonly CodeActionKind[], excludes: reAdonly CodeActionKind[], progress: IProgress<IProgressStep>, token: CAncellAtionToken): Promise<void> {

		const getActionProgress = new clAss implements IProgress<CodeActionProvider> {
			privAte _nAmes = new Set<string>();
			privAte _report(): void {
				progress.report({
					messAge: locAlize(
						'codeAction.get',
						"Getting code Actions from '{0}' ([configure](commAnd:workbench.Action.openSettings?%5B%22editor.codeActionsOnSAve%22%5D)).",
						[...this._nAmes].mAp(nAme => `'${nAme}'`).join(', ')
					)
				});
			}
			report(provider: CodeActionProvider) {
				if (provider.displAyNAme && !this._nAmes.hAs(provider.displAyNAme)) {
					this._nAmes.Add(provider.displAyNAme);
					this._report();
				}
			}
		};

		for (const codeActionKind of codeActionsOnSAve) {
			const ActionsToRun = AwAit this.getActionsToRun(model, codeActionKind, excludes, getActionProgress, token);
			try {
				for (const Action of ActionsToRun.vAlidActions) {
					progress.report({ messAge: locAlize('codeAction.Apply', "Applying code Action '{0}'.", Action.Action.title) });
					AwAit this.instAntiAtionService.invokeFunction(ApplyCodeAction, Action);
				}
			} cAtch {
				// FAilure to Apply A code Action should not block other on sAve Actions
			} finAlly {
				ActionsToRun.dispose();
			}
		}
	}

	privAte getActionsToRun(model: ITextModel, codeActionKind: CodeActionKind, excludes: reAdonly CodeActionKind[], progress: IProgress<CodeActionProvider>, token: CAncellAtionToken) {
		return getCodeActions(model, model.getFullModelRAnge(), {
			type: CodeActionTriggerType.Auto,
			filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
		}, progress, token);
	}
}

export clAss SAvePArticipAntsContribution extends DisposAble implements IWorkbenchContribution {

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService
	) {
		super();

		this.registerSAvePArticipAnts();
	}

	privAte registerSAvePArticipAnts(): void {
		this._register(this.textFileService.files.AddSAvePArticipAnt(this.instAntiAtionService.creAteInstAnce(TrimWhitespAcePArticipAnt)));
		this._register(this.textFileService.files.AddSAvePArticipAnt(this.instAntiAtionService.creAteInstAnce(CodeActionOnSAvePArticipAnt)));
		this._register(this.textFileService.files.AddSAvePArticipAnt(this.instAntiAtionService.creAteInstAnce(FormAtOnSAvePArticipAnt)));
		this._register(this.textFileService.files.AddSAvePArticipAnt(this.instAntiAtionService.creAteInstAnce(FinAlNewLinePArticipAnt)));
		this._register(this.textFileService.files.AddSAvePArticipAnt(this.instAntiAtionService.creAteInstAnce(TrimFinAlNewLinesPArticipAnt)));
	}
}

const workbenchContributionsRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SAvePArticipAntsContribution, LifecyclePhAse.Restored);
