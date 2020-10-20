/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { AssertIsDefined, isFunction, withNullAsUndefined } from 'vs/bAse/common/types';
import { ICodeEditor, getCodeEditor, IPAsteEvent } from 'vs/editor/browser/editorBrowser';
import { TextEditorOptions, EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { BAseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { UntitledTextEditorInput } from 'vs/workbench/services/untitled/common/untitledTextEditorInput';
import { BAseTextEditor } from 'vs/workbench/browser/pArts/editor/textEditor';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { Event } from 'vs/bAse/common/event';
import { ScrollType, IEditor } from 'vs/editor/common/editorCommon';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { EditorOption, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ModelConstAnts } from 'vs/editor/common/model';

/**
 * An editor implementAtion thAt is cApAble of showing the contents of resource inputs. Uses
 * the TextEditor widget to show the contents.
 */
export clAss AbstrActTextResourceEditor extends BAseTextEditor {

	constructor(
		id: string,
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(id, telemetryService, instAntiAtionService, storAgeService, textResourceConfigurAtionService, themeService, editorService, editorGroupService);
	}

	getTitle(): string | undefined {
		if (this.input) {
			return this.input.getNAme();
		}

		return nls.locAlize('textEditor', "Text Editor");
	}

	Async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {

		// Remember view settings if input chAnges
		this.sAveTextResourceEditorViewStAte(this.input);

		// Set input And resolve
		AwAit super.setInput(input, options, context, token);
		const resolvedModel = AwAit input.resolve();

		// Check for cAncellAtion
		if (token.isCAncellAtionRequested) {
			return undefined;
		}

		// Assert Model instAnce
		if (!(resolvedModel instAnceof BAseTextEditorModel)) {
			throw new Error('UnAble to open file As text');
		}

		// Set Editor Model
		const textEditor = AssertIsDefined(this.getControl());
		const textEditorModel = resolvedModel.textEditorModel;
		textEditor.setModel(textEditorModel);

		// Apply Options from TextOptions
		let optionsGotApplied = fAlse;
		const textOptions = <TextEditorOptions>options;
		if (textOptions && isFunction(textOptions.Apply)) {
			optionsGotApplied = textOptions.Apply(textEditor, ScrollType.ImmediAte);
		}

		// Otherwise restore View StAte unless disAbled viA settings
		if (!optionsGotApplied && this.shouldRestoreTextEditorViewStAte(input, context)) {
			this.restoreTextResourceEditorViewStAte(input, textEditor);
		}

		// Since the resolved model provides informAtion About being reAdonly
		// or not, we Apply it here to the editor even though the editor input
		// wAs AlreAdy Asked for being reAdonly or not. The rAtionAle is thAt
		// A resolved model might hAve more specific informAtion About being
		// reAdonly or not thAt the input did not hAve.
		textEditor.updAteOptions({ reAdOnly: resolvedModel.isReAdonly() });
	}

	privAte restoreTextResourceEditorViewStAte(editor: EditorInput, control: IEditor) {
		if (editor instAnceof UntitledTextEditorInput || editor instAnceof ResourceEditorInput) {
			const viewStAte = this.loAdTextEditorViewStAte(editor.resource);
			if (viewStAte) {
				control.restoreViewStAte(viewStAte);
			}
		}
	}

	/**
	 * ReveAls the lAst line of this editor if it hAs A model set.
	 */
	reveAlLAstLine(): void {
		const codeEditor = <ICodeEditor>this.getControl();
		const model = codeEditor.getModel();

		if (model) {
			const lAstLine = model.getLineCount();
			codeEditor.reveAlPosition({ lineNumber: lAstLine, column: model.getLineMAxColumn(lAstLine) }, ScrollType.Smooth);
		}
	}

	cleArInput(): void {

		// Keep editor view stAte in settings to restore when coming bAck
		this.sAveTextResourceEditorViewStAte(this.input);

		// CleAr Model
		const textEditor = this.getControl();
		if (textEditor) {
			textEditor.setModel(null);
		}

		super.cleArInput();
	}

	protected sAveStAte(): void {

		// SAve View StAte (only for untitled)
		if (this.input instAnceof UntitledTextEditorInput) {
			this.sAveTextResourceEditorViewStAte(this.input);
		}

		super.sAveStAte();
	}

	privAte sAveTextResourceEditorViewStAte(input: EditorInput | undefined): void {
		if (!(input instAnceof UntitledTextEditorInput) && !(input instAnceof ResourceEditorInput)) {
			return; // only enAbled for untitled And resource inputs
		}

		const resource = input.resource;

		// CleAr view stAte if input is disposed
		if (input.isDisposed()) {
			super.cleArTextEditorViewStAte([resource]);
		}

		// Otherwise sAve it
		else {
			super.sAveTextEditorViewStAte(resource);

			// MAke sure to cleAn up when the input gets disposed
			Event.once(input.onDispose)(() => {
				super.cleArTextEditorViewStAte([resource]);
			});
		}
	}
}

export clAss TextResourceEditor extends AbstrActTextResourceEditor {

	stAtic reAdonly ID = 'workbench.editors.textResourceEditor';

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService
	) {
		super(TextResourceEditor.ID, telemetryService, instAntiAtionService, storAgeService, textResourceConfigurAtionService, themeService, editorGroupService, editorService);
	}

	protected creAteEditorControl(pArent: HTMLElement, configurAtion: IEditorOptions): IEditor {
		const control = super.creAteEditorControl(pArent, configurAtion);

		// InstAll A listener for pAste to updAte this editors
		// lAnguAge mode if the pAste includes A specific mode
		const codeEditor = getCodeEditor(control);
		if (codeEditor) {
			this._register(codeEditor.onDidPAste(e => this.onDidEditorPAste(e, codeEditor)));
		}

		return control;
	}

	privAte onDidEditorPAste(e: IPAsteEvent, codeEditor: ICodeEditor): void {
		if (this.input instAnceof UntitledTextEditorInput && this.input.model.hAsModeSetExplicitly) {
			return; // do not override mode if it wAs set explicitly
		}

		if (e.rAnge.stArtLineNumber !== 1 || e.rAnge.stArtColumn !== 1) {
			return; // only when pAsting into first line, first column (= empty document)
		}

		if (codeEditor.getOption(EditorOption.reAdOnly)) {
			return; // not for reAdonly editors
		}

		const textModel = codeEditor.getModel();
		if (!textModel) {
			return; // require A live model
		}

		const currentMode = textModel.getModeId();
		if (currentMode !== PLAINTEXT_MODE_ID) {
			return; // require current mode to be unspecific
		}

		let cAndidAteMode: string | undefined = undefined;

		// A mode is provided viA the pAste event so text wAs copied using
		// VSCode. As such we trust this mode And use it if specific
		if (e.mode) {
			cAndidAteMode = e.mode;
		}

		// A mode wAs not provided, so the dAtA comes from outside VSCode
		// We cAn still try to guess A good mode from the first line if
		// the pAste chAnged the first line
		else {
			cAndidAteMode = withNullAsUndefined(this.modeService.getModeIdByFilepAthOrFirstLine(textModel.uri, textModel.getLineContent(1).substr(0, ModelConstAnts.FIRST_LINE_DETECTION_LENGTH_LIMIT)));
		}

		// FinAlly Apply mode to model if specified
		if (cAndidAteMode !== PLAINTEXT_MODE_ID) {
			this.modelService.setMode(textModel, this.modeService.creAte(cAndidAteMode));
		}
	}
}
