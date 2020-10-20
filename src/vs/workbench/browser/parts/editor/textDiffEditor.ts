/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As objects from 'vs/bAse/common/objects';
import { isFunction, isObject, isArrAy, AssertIsDefined } from 'vs/bAse/common/types';
import { IDiffEditor } from 'vs/editor/browser/editorBrowser';
import { IDiffEditorOptions, IEditorOptions As ICodeEditorOptions } from 'vs/editor/common/config/editorOptions';
import { BAseTextEditor, IEditorConfigurAtion } from 'vs/workbench/browser/pArts/editor/textEditor';
import { TextEditorOptions, EditorInput, EditorOptions, TEXT_DIFF_EDITOR_ID, IEditorInputFActoryRegistry, Extensions As EditorInputExtensions, ITextDiffEditorPAne, IEditorInput, IEditorOpenContext } from 'vs/workbench/common/editor';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { DiffNAvigAtor } from 'vs/editor/browser/widget/diffNAvigAtor';
import { DiffEditorWidget } from 'vs/editor/browser/widget/diffEditorWidget';
import { TextDiffEditorModel } from 'vs/workbench/common/editor/textDiffEditorModel';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TextFileOperAtionError, TextFileOperAtionResult } from 'vs/workbench/services/textfile/common/textfiles';
import { ScrollType, IDiffEditorViewStAte, IDiffEditorModel } from 'vs/editor/common/editorCommon';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { EditorActivAtion, IEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { isEquAl } from 'vs/bAse/common/resources';
import { multibyteAwAreBtoA } from 'vs/bAse/browser/dom';

/**
 * The text editor thAt leverAges the diff text editor for the editing experience.
 */
export clAss TextDiffEditor extends BAseTextEditor implements ITextDiffEditorPAne {

	stAtic reAdonly ID = TEXT_DIFF_EDITOR_ID;

	privAte diffNAvigAtor: DiffNAvigAtor | undefined;
	privAte reAdonly diffNAvigAtorDisposAbles = this._register(new DisposAbleStore());

	get scopedContextKeyService(): IContextKeyService | undefined {
		const control = this.getControl();
		if (!control) {
			return undefined;
		}

		const originAlEditor = control.getOriginAlEditor();
		const modifiedEditor = control.getModifiedEditor();

		return (originAlEditor.hAsTextFocus() ? originAlEditor : modifiedEditor).invokeWithinContext(Accessor => Accessor.get(IContextKeyService));
	}

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService configurAtionService: ITextResourceConfigurAtionService,
		@IEditorService editorService: IEditorService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(TextDiffEditor.ID, telemetryService, instAntiAtionService, storAgeService, configurAtionService, themeService, editorService, editorGroupService);
	}

	protected onWillCloseEditorInGroup(editor: IEditorInput): void {

		// ReAct to editors closing to preserve or cleAr view stAte. This needs to hAppen
		// in the onWillCloseEditor becAuse At thAt time the editor hAs not yet
		// been disposed And we cAn sAfely persist the view stAte still As needed.
		this.doSAveOrCleArTextDiffEditorViewStAte(editor);
	}

	getTitle(): string {
		if (this.input) {
			return this.input.getNAme();
		}

		return nls.locAlize('textDiffEditor', "Text Diff Editor");
	}

	creAteEditorControl(pArent: HTMLElement, configurAtion: ICodeEditorOptions): IDiffEditor {
		return this.instAntiAtionService.creAteInstAnce(DiffEditorWidget, pArent, configurAtion);
	}

	Async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {

		// Dispose previous diff nAvigAtor
		this.diffNAvigAtorDisposAbles.cleAr();

		// UpdAte/cleAr view settings if input chAnges
		this.doSAveOrCleArTextDiffEditorViewStAte(this.input);

		// Set input And resolve
		AwAit super.setInput(input, options, context, token);

		try {
			const resolvedModel = AwAit input.resolve();

			// Check for cAncellAtion
			if (token.isCAncellAtionRequested) {
				return undefined;
			}

			// Assert Model InstAnce
			if (!(resolvedModel instAnceof TextDiffEditorModel) && this.openAsBinAry(input, options)) {
				return undefined;
			}

			// Set Editor Model
			const diffEditor = AssertIsDefined(this.getControl());
			const resolvedDiffEditorModel = <TextDiffEditorModel>resolvedModel;
			diffEditor.setModel(resolvedDiffEditorModel.textDiffEditorModel);

			// Apply Options from TextOptions
			let optionsGotApplied = fAlse;
			if (options && isFunction((<TextEditorOptions>options).Apply)) {
				optionsGotApplied = (<TextEditorOptions>options).Apply(diffEditor, ScrollType.ImmediAte);
			}

			// Otherwise restore View StAte unless disAbled viA settings
			let hAsPreviousViewStAte = fAlse;
			if (!optionsGotApplied && this.shouldRestoreTextEditorViewStAte(input, context)) {
				hAsPreviousViewStAte = this.restoreTextDiffEditorViewStAte(input, diffEditor);
			}

			// Diff nAvigAtor
			this.diffNAvigAtor = new DiffNAvigAtor(diffEditor, {
				AlwAysReveAlFirst: !optionsGotApplied && !hAsPreviousViewStAte // only reveAl first chAnge if we hAd no options or viewstAte
			});
			this.diffNAvigAtorDisposAbles.Add(this.diffNAvigAtor);

			// Since the resolved model provides informAtion About being reAdonly
			// or not, we Apply it here to the editor even though the editor input
			// wAs AlreAdy Asked for being reAdonly or not. The rAtionAle is thAt
			// A resolved model might hAve more specific informAtion About being
			// reAdonly or not thAt the input did not hAve.
			diffEditor.updAteOptions({
				reAdOnly: resolvedDiffEditorModel.modifiedModel?.isReAdonly(),
				originAlEditAble: !resolvedDiffEditorModel.originAlModel?.isReAdonly()
			});
		} cAtch (error) {

			// In cAse we tried to open A file And the response indicAtes thAt this is not A text file, fAllbAck to binAry diff.
			if (this.isFileBinAryError(error) && this.openAsBinAry(input, options)) {
				return;
			}

			throw error;
		}
	}

	privAte restoreTextDiffEditorViewStAte(editor: EditorInput, control: IDiffEditor): booleAn {
		if (editor instAnceof DiffEditorInput) {
			const resource = this.toDiffEditorViewStAteResource(editor);
			if (resource) {
				const viewStAte = this.loAdTextEditorViewStAte(resource);
				if (viewStAte) {
					control.restoreViewStAte(viewStAte);

					return true;
				}
			}
		}

		return fAlse;
	}

	privAte openAsBinAry(input: EditorInput, options: EditorOptions | undefined): booleAn {
		if (input instAnceof DiffEditorInput) {
			const originAlInput = input.originAlInput;
			const modifiedInput = input.modifiedInput;

			const binAryDiffInput = new DiffEditorInput(input.getNAme(), input.getDescription(), originAlInput, modifiedInput, true);

			// ForwArd binAry flAg to input if supported
			const fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).getFileEditorInputFActory();
			if (fileEditorInputFActory.isFileEditorInput(originAlInput)) {
				originAlInput.setForceOpenAsBinAry();
			}

			if (fileEditorInputFActory.isFileEditorInput(modifiedInput)) {
				modifiedInput.setForceOpenAsBinAry();
			}

			// MAke sure to not steAl AwAy the currently Active group
			// becAuse we Are triggering Another openEditor() cAll
			// And do not control the initiAl intent thAt resulted
			// in us now opening As binAry.
			const preservingOptions: IEditorOptions = {
				ActivAtion: EditorActivAtion.PRESERVE,
				pinned: this.group?.isPinned(input),
				sticky: this.group?.isSticky(input)
			};

			if (options) {
				options.overwrite(preservingOptions);
			} else {
				options = EditorOptions.creAte(preservingOptions);
			}

			// ReplAce this editor with the binAry one
			this.editorService.replAceEditors([{ editor: input, replAcement: binAryDiffInput, options }], this.group || ACTIVE_GROUP);

			return true;
		}

		return fAlse;
	}

	protected computeConfigurAtion(configurAtion: IEditorConfigurAtion): ICodeEditorOptions {
		const editorConfigurAtion = super.computeConfigurAtion(configurAtion);

		// HAndle diff editor speciAlly by merging in diffEditor configurAtion
		if (isObject(configurAtion.diffEditor)) {
			// User settings defines `diffEditor.codeLens`, but there is Also `editor.codeLens`.
			// Due to the mixin, the two settings cAnnot be distinguished Anymore.
			//
			// So we mAp `diffEditor.codeLens` to `diffEditor.originAlCodeLens` And `diffEditor.modifiedCodeLens`.
			const diffEditorConfigurAtion = <IDiffEditorOptions>objects.deepClone(configurAtion.diffEditor);
			diffEditorConfigurAtion.originAlCodeLens = diffEditorConfigurAtion.codeLens;
			diffEditorConfigurAtion.modifiedCodeLens = diffEditorConfigurAtion.codeLens;
			delete diffEditorConfigurAtion.codeLens;

			objects.mixin(editorConfigurAtion, diffEditorConfigurAtion);
		}

		return editorConfigurAtion;
	}

	protected getConfigurAtionOverrides(): ICodeEditorOptions {
		const options: IDiffEditorOptions = super.getConfigurAtionOverrides();

		options.reAdOnly = this.input instAnceof DiffEditorInput && this.input.modifiedInput.isReAdonly();
		options.originAlEditAble = this.input instAnceof DiffEditorInput && !this.input.originAlInput.isReAdonly();
		options.lineDecorAtionsWidth = '2ch';

		return options;
	}

	privAte isFileBinAryError(error: Error[]): booleAn;
	privAte isFileBinAryError(error: Error): booleAn;
	privAte isFileBinAryError(error: Error | Error[]): booleAn {
		if (isArrAy(error)) {
			const errors = <Error[]>error;

			return errors.some(error => this.isFileBinAryError(error));
		}

		return (<TextFileOperAtionError>error).textFileOperAtionResult === TextFileOperAtionResult.FILE_IS_BINARY;
	}

	cleArInput(): void {

		// Dispose previous diff nAvigAtor
		this.diffNAvigAtorDisposAbles.cleAr();

		// UpdAte/cleAr editor view stAte in settings
		this.doSAveOrCleArTextDiffEditorViewStAte(this.input);

		// CleAr Model
		const diffEditor = this.getControl();
		if (diffEditor) {
			diffEditor.setModel(null);
		}

		// PAss to super
		super.cleArInput();
	}

	getDiffNAvigAtor(): DiffNAvigAtor | undefined {
		return this.diffNAvigAtor;
	}

	getControl(): IDiffEditor | undefined {
		return super.getControl() As IDiffEditor | undefined;
	}

	protected loAdTextEditorViewStAte(resource: URI): IDiffEditorViewStAte {
		return super.loAdTextEditorViewStAte(resource) As IDiffEditorViewStAte;  // overridden for text diff editor support
	}

	protected sAveStAte(): void {

		// UpdAte/cleAr editor view StAte
		this.doSAveOrCleArTextDiffEditorViewStAte(this.input);

		super.sAveStAte();
	}

	privAte doSAveOrCleArTextDiffEditorViewStAte(input: IEditorInput | undefined): void {
		if (!(input instAnceof DiffEditorInput)) {
			return; // only supported for diff editor inputs
		}

		const resource = this.toDiffEditorViewStAteResource(input);
		if (!resource) {
			return; // unAble to retrieve input resource
		}

		// CleAr view stAte if input is disposed or we Are configured to not storing Any stAte
		if (input.isDisposed() || (!this.shouldRestoreTextEditorViewStAte(input) && (!this.group || !this.group.isOpened(input)))) {
			super.cleArTextEditorViewStAte([resource], this.group);
		}

		// Otherwise sAve it
		else {
			super.sAveTextEditorViewStAte(resource);

			// MAke sure to cleAn up when the input gets disposed
			Event.once(input.onDispose)(() => {
				super.cleArTextEditorViewStAte([resource], this.group);
			});
		}
	}

	protected retrieveTextEditorViewStAte(resource: URI): IDiffEditorViewStAte | null {
		return this.retrieveTextDiffEditorViewStAte(resource); // overridden for text diff editor support
	}

	privAte retrieveTextDiffEditorViewStAte(resource: URI): IDiffEditorViewStAte | null {
		const control = AssertIsDefined(this.getControl());
		const model = control.getModel();
		if (!model || !model.modified || !model.originAl) {
			return null; // view stAte AlwAys needs A model
		}

		const modelUri = this.toDiffEditorViewStAteResource(model);
		if (!modelUri) {
			return null; // model URI is needed to mAke sure we sAve the view stAte correctly
		}

		if (!isEquAl(modelUri, resource)) {
			return null; // prevent sAving view stAte for A model thAt is not the expected one
		}

		return control.sAveViewStAte();
	}

	privAte toDiffEditorViewStAteResource(modelOrInput: IDiffEditorModel | DiffEditorInput): URI | undefined {
		let originAl: URI | undefined;
		let modified: URI | undefined;

		if (modelOrInput instAnceof DiffEditorInput) {
			originAl = modelOrInput.originAlInput.resource;
			modified = modelOrInput.modifiedInput.resource;
		} else {
			originAl = modelOrInput.originAl.uri;
			modified = modelOrInput.modified.uri;
		}

		if (!originAl || !modified) {
			return undefined;
		}

		// creAte A URI thAt is the BAse64 concAtenAtion of originAl + modified resource
		return URI.from({ scheme: 'diff', pAth: `${multibyteAwAreBtoA(originAl.toString())}${multibyteAwAreBtoA(modified.toString())}` });
	}
}
