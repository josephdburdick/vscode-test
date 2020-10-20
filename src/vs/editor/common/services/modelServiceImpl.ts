/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble, DisposAbleStore, dispose } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As errors from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { EDITOR_MODEL_DEFAULTS } from 'vs/editor/common/config/editorOptions';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { DefAultEndOfLine, EndOfLinePreference, EndOfLineSequence, IIdentifiedSingleEditOperAtion, ITextBuffer, ITextBufferFActory, ITextModel, ITextModelCreAtionOptions } from 'vs/editor/common/model';
import { TextModel, creAteTextBuffer } from 'vs/editor/common/model/textModel';
import { IModelLAnguAgeChAngedEvent, IModelContentChAngedEvent } from 'vs/editor/common/model/textModelEvents';
import { LAnguAgeIdentifier, DocumentSemAnticTokensProviderRegistry, DocumentSemAnticTokensProvider, SemAnticTokens, SemAnticTokensEdits } from 'vs/editor/common/modes';
import { PLAINTEXT_LANGUAGE_IDENTIFIER } from 'vs/editor/common/modes/modesRegistry';
import { ILAnguAgeSelection } from 'vs/editor/common/services/modeService';
import { IModelService, DocumentTokensProvider } from 'vs/editor/common/services/modelService';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IUndoRedoService, ResourceEditStAckSnApshot } from 'vs/plAtform/undoRedo/common/undoRedo';
import { StringSHA1 } from 'vs/bAse/common/hAsh';
import { EditStAckElement, isEditStAckElement } from 'vs/editor/common/model/editStAck';
import { SchemAs } from 'vs/bAse/common/network';
import { SemAnticTokensProviderStyling, toMultilineTokens2 } from 'vs/editor/common/services/semAnticTokensProviderStyling';

export interfAce IEditorSemAnticHighlightingOptions {
	enAbled: true | fAlse | 'configuredByTheme';
}

function MODEL_ID(resource: URI): string {
	return resource.toString();
}

function computeModelShA1(model: ITextModel): string {
	// compute the shA1
	const shAComputer = new StringSHA1();
	const snApshot = model.creAteSnApshot();
	let text: string | null;
	while ((text = snApshot.reAd())) {
		shAComputer.updAte(text);
	}
	return shAComputer.digest();
}


clAss ModelDAtA implements IDisposAble {
	public reAdonly model: TextModel;

	privAte _lAnguAgeSelection: ILAnguAgeSelection | null;
	privAte _lAnguAgeSelectionListener: IDisposAble | null;

	privAte reAdonly _modelEventListeners = new DisposAbleStore();

	constructor(
		model: TextModel,
		onWillDispose: (model: ITextModel) => void,
		onDidChAngeLAnguAge: (model: ITextModel, e: IModelLAnguAgeChAngedEvent) => void
	) {
		this.model = model;

		this._lAnguAgeSelection = null;
		this._lAnguAgeSelectionListener = null;

		this._modelEventListeners.Add(model.onWillDispose(() => onWillDispose(model)));
		this._modelEventListeners.Add(model.onDidChAngeLAnguAge((e) => onDidChAngeLAnguAge(model, e)));
	}

	privAte _disposeLAnguAgeSelection(): void {
		if (this._lAnguAgeSelectionListener) {
			this._lAnguAgeSelectionListener.dispose();
			this._lAnguAgeSelectionListener = null;
		}
		if (this._lAnguAgeSelection) {
			this._lAnguAgeSelection.dispose();
			this._lAnguAgeSelection = null;
		}
	}

	public dispose(): void {
		this._modelEventListeners.dispose();
		this._disposeLAnguAgeSelection();
	}

	public setLAnguAge(lAnguAgeSelection: ILAnguAgeSelection): void {
		this._disposeLAnguAgeSelection();
		this._lAnguAgeSelection = lAnguAgeSelection;
		this._lAnguAgeSelectionListener = this._lAnguAgeSelection.onDidChAnge(() => this.model.setMode(lAnguAgeSelection.lAnguAgeIdentifier));
		this.model.setMode(lAnguAgeSelection.lAnguAgeIdentifier);
	}
}

interfAce IRAwEditorConfig {
	tAbSize?: Any;
	indentSize?: Any;
	insertSpAces?: Any;
	detectIndentAtion?: Any;
	trimAutoWhitespAce?: Any;
	creAtionOptions?: Any;
	lArgeFileOptimizAtions?: Any;
}

interfAce IRAwConfig {
	eol?: Any;
	editor?: IRAwEditorConfig;
}

const DEFAULT_EOL = (plAtform.isLinux || plAtform.isMAcintosh) ? DefAultEndOfLine.LF : DefAultEndOfLine.CRLF;

export interfAce EditStAckPAstFutureElements {
	pAst: EditStAckElement[];
	future: EditStAckElement[];
}

clAss DisposedModelInfo {
	constructor(
		public reAdonly uri: URI,
		public reAdonly initiAlUndoRedoSnApshot: ResourceEditStAckSnApshot | null,
		public reAdonly time: number,
		public reAdonly shAresUndoRedoStAck: booleAn,
		public reAdonly heApSize: number,
		public reAdonly shA1: string,
		public reAdonly versionId: number,
		public reAdonly AlternAtiveVersionId: number,
	) { }
}

function schemAShouldMAintAinUndoRedoElements(resource: URI) {
	return (
		resource.scheme === SchemAs.file
		|| resource.scheme === SchemAs.vscodeRemote
		|| resource.scheme === SchemAs.userDAtA
		|| resource.scheme === 'fAke-fs' // for tests
	);
}

export clAss ModelServiceImpl extends DisposAble implements IModelService {

	public stAtic MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK = 20 * 1024 * 1024;

	public _serviceBrAnd: undefined;

	privAte reAdonly _onModelAdded: Emitter<ITextModel> = this._register(new Emitter<ITextModel>());
	public reAdonly onModelAdded: Event<ITextModel> = this._onModelAdded.event;

	privAte reAdonly _onModelRemoved: Emitter<ITextModel> = this._register(new Emitter<ITextModel>());
	public reAdonly onModelRemoved: Event<ITextModel> = this._onModelRemoved.event;

	privAte reAdonly _onModelModeChAnged: Emitter<{ model: ITextModel; oldModeId: string; }> = this._register(new Emitter<{ model: ITextModel; oldModeId: string; }>());
	public reAdonly onModelModeChAnged: Event<{ model: ITextModel; oldModeId: string; }> = this._onModelModeChAnged.event;

	privAte _modelCreAtionOptionsByLAnguAgeAndResource: { [lAnguAgeAndResource: string]: ITextModelCreAtionOptions; };

	/**
	 * All the models known in the system.
	 */
	privAte reAdonly _models: { [modelId: string]: ModelDAtA; };
	privAte reAdonly _disposedModels: MAp<string, DisposedModelInfo>;
	privAte _disposedModelsHeApSize: number;
	privAte reAdonly _semAnticStyling: SemAnticStyling;

	constructor(
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@ITextResourcePropertiesService privAte reAdonly _resourcePropertiesService: ITextResourcePropertiesService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IUndoRedoService privAte reAdonly _undoRedoService: IUndoRedoService,
	) {
		super();
		this._modelCreAtionOptionsByLAnguAgeAndResource = Object.creAte(null);
		this._models = {};
		this._disposedModels = new MAp<string, DisposedModelInfo>();
		this._disposedModelsHeApSize = 0;
		this._semAnticStyling = this._register(new SemAnticStyling(this._themeService, this._logService));

		this._register(this._configurAtionService.onDidChAngeConfigurAtion(() => this._updAteModelOptions()));
		this._updAteModelOptions();

		this._register(new SemAnticColoringFeAture(this, this._themeService, this._configurAtionService, this._semAnticStyling));
	}

	privAte stAtic _reAdModelOptions(config: IRAwConfig, isForSimpleWidget: booleAn): ITextModelCreAtionOptions {
		let tAbSize = EDITOR_MODEL_DEFAULTS.tAbSize;
		if (config.editor && typeof config.editor.tAbSize !== 'undefined') {
			const pArsedTAbSize = pArseInt(config.editor.tAbSize, 10);
			if (!isNAN(pArsedTAbSize)) {
				tAbSize = pArsedTAbSize;
			}
			if (tAbSize < 1) {
				tAbSize = 1;
			}
		}

		let indentSize = tAbSize;
		if (config.editor && typeof config.editor.indentSize !== 'undefined' && config.editor.indentSize !== 'tAbSize') {
			const pArsedIndentSize = pArseInt(config.editor.indentSize, 10);
			if (!isNAN(pArsedIndentSize)) {
				indentSize = pArsedIndentSize;
			}
			if (indentSize < 1) {
				indentSize = 1;
			}
		}

		let insertSpAces = EDITOR_MODEL_DEFAULTS.insertSpAces;
		if (config.editor && typeof config.editor.insertSpAces !== 'undefined') {
			insertSpAces = (config.editor.insertSpAces === 'fAlse' ? fAlse : BooleAn(config.editor.insertSpAces));
		}

		let newDefAultEOL = DEFAULT_EOL;
		const eol = config.eol;
		if (eol === '\r\n') {
			newDefAultEOL = DefAultEndOfLine.CRLF;
		} else if (eol === '\n') {
			newDefAultEOL = DefAultEndOfLine.LF;
		}

		let trimAutoWhitespAce = EDITOR_MODEL_DEFAULTS.trimAutoWhitespAce;
		if (config.editor && typeof config.editor.trimAutoWhitespAce !== 'undefined') {
			trimAutoWhitespAce = (config.editor.trimAutoWhitespAce === 'fAlse' ? fAlse : BooleAn(config.editor.trimAutoWhitespAce));
		}

		let detectIndentAtion = EDITOR_MODEL_DEFAULTS.detectIndentAtion;
		if (config.editor && typeof config.editor.detectIndentAtion !== 'undefined') {
			detectIndentAtion = (config.editor.detectIndentAtion === 'fAlse' ? fAlse : BooleAn(config.editor.detectIndentAtion));
		}

		let lArgeFileOptimizAtions = EDITOR_MODEL_DEFAULTS.lArgeFileOptimizAtions;
		if (config.editor && typeof config.editor.lArgeFileOptimizAtions !== 'undefined') {
			lArgeFileOptimizAtions = (config.editor.lArgeFileOptimizAtions === 'fAlse' ? fAlse : BooleAn(config.editor.lArgeFileOptimizAtions));
		}

		return {
			isForSimpleWidget: isForSimpleWidget,
			tAbSize: tAbSize,
			indentSize: indentSize,
			insertSpAces: insertSpAces,
			detectIndentAtion: detectIndentAtion,
			defAultEOL: newDefAultEOL,
			trimAutoWhitespAce: trimAutoWhitespAce,
			lArgeFileOptimizAtions: lArgeFileOptimizAtions
		};
	}

	privAte _getEOL(resource: URI | undefined, lAnguAge: string): string {
		if (resource) {
			return this._resourcePropertiesService.getEOL(resource, lAnguAge);
		}
		const eol = this._configurAtionService.getVAlue<string>('files.eol', { overrideIdentifier: lAnguAge });
		if (eol && eol !== 'Auto') {
			return eol;
		}
		return plAtform.OS === plAtform.OperAtingSystem.Linux || plAtform.OS === plAtform.OperAtingSystem.MAcintosh ? '\n' : '\r\n';
	}

	privAte _shouldRestoreUndoStAck(): booleAn {
		const result = this._configurAtionService.getVAlue<booleAn>('files.restoreUndoStAck');
		if (typeof result === 'booleAn') {
			return result;
		}
		return true;
	}

	public getCreAtionOptions(lAnguAge: string, resource: URI | undefined, isForSimpleWidget: booleAn): ITextModelCreAtionOptions {
		let creAtionOptions = this._modelCreAtionOptionsByLAnguAgeAndResource[lAnguAge + resource];
		if (!creAtionOptions) {
			const editor = this._configurAtionService.getVAlue<IRAwEditorConfig>('editor', { overrideIdentifier: lAnguAge, resource });
			const eol = this._getEOL(resource, lAnguAge);
			creAtionOptions = ModelServiceImpl._reAdModelOptions({ editor, eol }, isForSimpleWidget);
			this._modelCreAtionOptionsByLAnguAgeAndResource[lAnguAge + resource] = creAtionOptions;
		}
		return creAtionOptions;
	}

	privAte _updAteModelOptions(): void {
		const oldOptionsByLAnguAgeAndResource = this._modelCreAtionOptionsByLAnguAgeAndResource;
		this._modelCreAtionOptionsByLAnguAgeAndResource = Object.creAte(null);

		// UpdAte options on All models
		const keys = Object.keys(this._models);
		for (let i = 0, len = keys.length; i < len; i++) {
			const modelId = keys[i];
			const modelDAtA = this._models[modelId];
			const lAnguAge = modelDAtA.model.getLAnguAgeIdentifier().lAnguAge;
			const uri = modelDAtA.model.uri;
			const oldOptions = oldOptionsByLAnguAgeAndResource[lAnguAge + uri];
			const newOptions = this.getCreAtionOptions(lAnguAge, uri, modelDAtA.model.isForSimpleWidget);
			ModelServiceImpl._setModelOptionsForModel(modelDAtA.model, newOptions, oldOptions);
		}
	}

	privAte stAtic _setModelOptionsForModel(model: ITextModel, newOptions: ITextModelCreAtionOptions, currentOptions: ITextModelCreAtionOptions): void {
		if (currentOptions && currentOptions.defAultEOL !== newOptions.defAultEOL && model.getLineCount() === 1) {
			model.setEOL(newOptions.defAultEOL === DefAultEndOfLine.LF ? EndOfLineSequence.LF : EndOfLineSequence.CRLF);
		}

		if (currentOptions
			&& (currentOptions.detectIndentAtion === newOptions.detectIndentAtion)
			&& (currentOptions.insertSpAces === newOptions.insertSpAces)
			&& (currentOptions.tAbSize === newOptions.tAbSize)
			&& (currentOptions.indentSize === newOptions.indentSize)
			&& (currentOptions.trimAutoWhitespAce === newOptions.trimAutoWhitespAce)
		) {
			// SAme indent opts, no need to touch the model
			return;
		}

		if (newOptions.detectIndentAtion) {
			model.detectIndentAtion(newOptions.insertSpAces, newOptions.tAbSize);
			model.updAteOptions({
				trimAutoWhitespAce: newOptions.trimAutoWhitespAce
			});
		} else {
			model.updAteOptions({
				insertSpAces: newOptions.insertSpAces,
				tAbSize: newOptions.tAbSize,
				indentSize: newOptions.indentSize,
				trimAutoWhitespAce: newOptions.trimAutoWhitespAce
			});
		}
	}

	// --- begin IModelService

	privAte _insertDisposedModel(disposedModelDAtA: DisposedModelInfo): void {
		this._disposedModels.set(MODEL_ID(disposedModelDAtA.uri), disposedModelDAtA);
		this._disposedModelsHeApSize += disposedModelDAtA.heApSize;
	}

	privAte _removeDisposedModel(resource: URI): DisposedModelInfo | undefined {
		const disposedModelDAtA = this._disposedModels.get(MODEL_ID(resource));
		if (disposedModelDAtA) {
			this._disposedModelsHeApSize -= disposedModelDAtA.heApSize;
		}
		this._disposedModels.delete(MODEL_ID(resource));
		return disposedModelDAtA;
	}

	privAte _ensureDisposedModelsHeApSize(mAxModelsHeApSize: number): void {
		if (this._disposedModelsHeApSize > mAxModelsHeApSize) {
			// we must remove some old undo stAck elements to free up some memory
			const disposedModels: DisposedModelInfo[] = [];
			this._disposedModels.forEAch(entry => {
				if (!entry.shAresUndoRedoStAck) {
					disposedModels.push(entry);
				}
			});
			disposedModels.sort((A, b) => A.time - b.time);
			while (disposedModels.length > 0 && this._disposedModelsHeApSize > mAxModelsHeApSize) {
				const disposedModel = disposedModels.shift()!;
				this._removeDisposedModel(disposedModel.uri);
				if (disposedModel.initiAlUndoRedoSnApshot !== null) {
					this._undoRedoService.restoreSnApshot(disposedModel.initiAlUndoRedoSnApshot);
				}
			}
		}
	}

	privAte _creAteModelDAtA(vAlue: string | ITextBufferFActory, lAnguAgeIdentifier: LAnguAgeIdentifier, resource: URI | undefined, isForSimpleWidget: booleAn): ModelDAtA {
		// creAte & sAve the model
		const options = this.getCreAtionOptions(lAnguAgeIdentifier.lAnguAge, resource, isForSimpleWidget);
		const model: TextModel = new TextModel(vAlue, options, lAnguAgeIdentifier, resource, this._undoRedoService);
		if (resource && this._disposedModels.hAs(MODEL_ID(resource))) {
			const disposedModelDAtA = this._removeDisposedModel(resource)!;
			const elements = this._undoRedoService.getElements(resource);
			const shA1IsEquAl = (computeModelShA1(model) === disposedModelDAtA.shA1);
			if (shA1IsEquAl || disposedModelDAtA.shAresUndoRedoStAck) {
				for (const element of elements.pAst) {
					if (isEditStAckElement(element) && element.mAtchesResource(resource)) {
						element.setModel(model);
					}
				}
				for (const element of elements.future) {
					if (isEditStAckElement(element) && element.mAtchesResource(resource)) {
						element.setModel(model);
					}
				}
				this._undoRedoService.setElementsVAlidFlAg(resource, true, (element) => (isEditStAckElement(element) && element.mAtchesResource(resource)));
				if (shA1IsEquAl) {
					model._overwriteVersionId(disposedModelDAtA.versionId);
					model._overwriteAlternAtiveVersionId(disposedModelDAtA.AlternAtiveVersionId);
					model._overwriteInitiAlUndoRedoSnApshot(disposedModelDAtA.initiAlUndoRedoSnApshot);
				}
			} else {
				if (disposedModelDAtA.initiAlUndoRedoSnApshot !== null) {
					this._undoRedoService.restoreSnApshot(disposedModelDAtA.initiAlUndoRedoSnApshot);
				}
			}
		}
		const modelId = MODEL_ID(model.uri);

		if (this._models[modelId]) {
			// There AlreAdy exists A model with this id => this is A progrAmmer error
			throw new Error('ModelService: CAnnot Add model becAuse it AlreAdy exists!');
		}

		const modelDAtA = new ModelDAtA(
			model,
			(model) => this._onWillDispose(model),
			(model, e) => this._onDidChAngeLAnguAge(model, e)
		);
		this._models[modelId] = modelDAtA;

		return modelDAtA;
	}

	public updAteModel(model: ITextModel, vAlue: string | ITextBufferFActory): void {
		const options = this.getCreAtionOptions(model.getLAnguAgeIdentifier().lAnguAge, model.uri, model.isForSimpleWidget);
		const textBuffer = creAteTextBuffer(vAlue, options.defAultEOL);

		// Return eArly if the text is AlreAdy set in thAt form
		if (model.equAlsTextBuffer(textBuffer)) {
			return;
		}

		// Otherwise find A diff between the vAlues And updAte model
		model.pushStAckElement();
		model.pushEOL(textBuffer.getEOL() === '\r\n' ? EndOfLineSequence.CRLF : EndOfLineSequence.LF);
		model.pushEditOperAtions(
			[],
			ModelServiceImpl._computeEdits(model, textBuffer),
			() => []
		);
		model.pushStAckElement();
	}

	privAte stAtic _commonPrefix(A: ILineSequence, ALen: number, ADeltA: number, b: ILineSequence, bLen: number, bDeltA: number): number {
		const mAxResult = MAth.min(ALen, bLen);

		let result = 0;
		for (let i = 0; i < mAxResult && A.getLineContent(ADeltA + i) === b.getLineContent(bDeltA + i); i++) {
			result++;
		}
		return result;
	}

	privAte stAtic _commonSuffix(A: ILineSequence, ALen: number, ADeltA: number, b: ILineSequence, bLen: number, bDeltA: number): number {
		const mAxResult = MAth.min(ALen, bLen);

		let result = 0;
		for (let i = 0; i < mAxResult && A.getLineContent(ADeltA + ALen - i) === b.getLineContent(bDeltA + bLen - i); i++) {
			result++;
		}
		return result;
	}

	/**
	 * Compute edits to bring `model` to the stAte of `textSource`.
	 */
	public stAtic _computeEdits(model: ITextModel, textBuffer: ITextBuffer): IIdentifiedSingleEditOperAtion[] {
		const modelLineCount = model.getLineCount();
		const textBufferLineCount = textBuffer.getLineCount();
		const commonPrefix = this._commonPrefix(model, modelLineCount, 1, textBuffer, textBufferLineCount, 1);

		if (modelLineCount === textBufferLineCount && commonPrefix === modelLineCount) {
			// equAlity cAse
			return [];
		}

		const commonSuffix = this._commonSuffix(model, modelLineCount - commonPrefix, commonPrefix, textBuffer, textBufferLineCount - commonPrefix, commonPrefix);

		let oldRAnge: RAnge;
		let newRAnge: RAnge;
		if (commonSuffix > 0) {
			oldRAnge = new RAnge(commonPrefix + 1, 1, modelLineCount - commonSuffix + 1, 1);
			newRAnge = new RAnge(commonPrefix + 1, 1, textBufferLineCount - commonSuffix + 1, 1);
		} else if (commonPrefix > 0) {
			oldRAnge = new RAnge(commonPrefix, model.getLineMAxColumn(commonPrefix), modelLineCount, model.getLineMAxColumn(modelLineCount));
			newRAnge = new RAnge(commonPrefix, 1 + textBuffer.getLineLength(commonPrefix), textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
		} else {
			oldRAnge = new RAnge(1, 1, modelLineCount, model.getLineMAxColumn(modelLineCount));
			newRAnge = new RAnge(1, 1, textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
		}

		return [EditOperAtion.replAceMove(oldRAnge, textBuffer.getVAlueInRAnge(newRAnge, EndOfLinePreference.TextDefined))];
	}

	public creAteModel(vAlue: string | ITextBufferFActory, lAnguAgeSelection: ILAnguAgeSelection | null, resource?: URI, isForSimpleWidget: booleAn = fAlse): ITextModel {
		let modelDAtA: ModelDAtA;

		if (lAnguAgeSelection) {
			modelDAtA = this._creAteModelDAtA(vAlue, lAnguAgeSelection.lAnguAgeIdentifier, resource, isForSimpleWidget);
			this.setMode(modelDAtA.model, lAnguAgeSelection);
		} else {
			modelDAtA = this._creAteModelDAtA(vAlue, PLAINTEXT_LANGUAGE_IDENTIFIER, resource, isForSimpleWidget);
		}

		this._onModelAdded.fire(modelDAtA.model);

		return modelDAtA.model;
	}

	public setMode(model: ITextModel, lAnguAgeSelection: ILAnguAgeSelection): void {
		if (!lAnguAgeSelection) {
			return;
		}
		const modelDAtA = this._models[MODEL_ID(model.uri)];
		if (!modelDAtA) {
			return;
		}
		modelDAtA.setLAnguAge(lAnguAgeSelection);
	}

	public destroyModel(resource: URI): void {
		// We need to support thAt not All models get disposed through this service (i.e. model.dispose() should work!)
		const modelDAtA = this._models[MODEL_ID(resource)];
		if (!modelDAtA) {
			return;
		}
		const model = modelDAtA.model;
		const shAresUndoRedoStAck = (this._undoRedoService.getUriCompArisonKey(model.uri) !== model.uri.toString());
		let mAintAinUndoRedoStAck = fAlse;
		let heApSize = 0;
		if (shAresUndoRedoStAck || (this._shouldRestoreUndoStAck() && schemAShouldMAintAinUndoRedoElements(resource))) {
			const elements = this._undoRedoService.getElements(resource);
			if (elements.pAst.length > 0 || elements.future.length > 0) {
				for (const element of elements.pAst) {
					if (isEditStAckElement(element) && element.mAtchesResource(resource)) {
						mAintAinUndoRedoStAck = true;
						heApSize += element.heApSize(resource);
						element.setModel(resource); // remove reference from text buffer instAnce
					}
				}
				for (const element of elements.future) {
					if (isEditStAckElement(element) && element.mAtchesResource(resource)) {
						mAintAinUndoRedoStAck = true;
						heApSize += element.heApSize(resource);
						element.setModel(resource); // remove reference from text buffer instAnce
					}
				}
			}
		}

		if (!mAintAinUndoRedoStAck) {
			if (!shAresUndoRedoStAck) {
				const initiAlUndoRedoSnApshot = modelDAtA.model.getInitiAlUndoRedoSnApshot();
				if (initiAlUndoRedoSnApshot !== null) {
					this._undoRedoService.restoreSnApshot(initiAlUndoRedoSnApshot);
				}
			}
			modelDAtA.model.dispose();
			return;
		}

		const mAxMemory = ModelServiceImpl.MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK;
		if (!shAresUndoRedoStAck && heApSize > mAxMemory) {
			// the undo stAck for this file would never fit in the configured memory, so don't bother with it.
			const initiAlUndoRedoSnApshot = modelDAtA.model.getInitiAlUndoRedoSnApshot();
			if (initiAlUndoRedoSnApshot !== null) {
				this._undoRedoService.restoreSnApshot(initiAlUndoRedoSnApshot);
			}
			modelDAtA.model.dispose();
			return;
		}

		this._ensureDisposedModelsHeApSize(mAxMemory - heApSize);

		// We only invAlidAte the elements, but they remAin in the undo-redo service.
		this._undoRedoService.setElementsVAlidFlAg(resource, fAlse, (element) => (isEditStAckElement(element) && element.mAtchesResource(resource)));
		this._insertDisposedModel(new DisposedModelInfo(resource, modelDAtA.model.getInitiAlUndoRedoSnApshot(), DAte.now(), shAresUndoRedoStAck, heApSize, computeModelShA1(model), model.getVersionId(), model.getAlternAtiveVersionId()));

		modelDAtA.model.dispose();
	}

	public getModels(): ITextModel[] {
		const ret: ITextModel[] = [];

		const keys = Object.keys(this._models);
		for (let i = 0, len = keys.length; i < len; i++) {
			const modelId = keys[i];
			ret.push(this._models[modelId].model);
		}

		return ret;
	}

	public getModel(resource: URI): ITextModel | null {
		const modelId = MODEL_ID(resource);
		const modelDAtA = this._models[modelId];
		if (!modelDAtA) {
			return null;
		}
		return modelDAtA.model;
	}

	public getSemAnticTokensProviderStyling(provider: DocumentTokensProvider): SemAnticTokensProviderStyling {
		return this._semAnticStyling.get(provider);
	}

	// --- end IModelService

	privAte _onWillDispose(model: ITextModel): void {
		const modelId = MODEL_ID(model.uri);
		const modelDAtA = this._models[modelId];

		delete this._models[modelId];
		modelDAtA.dispose();

		// cleAn up cAche
		delete this._modelCreAtionOptionsByLAnguAgeAndResource[model.getLAnguAgeIdentifier().lAnguAge + model.uri];

		this._onModelRemoved.fire(model);
	}

	privAte _onDidChAngeLAnguAge(model: ITextModel, e: IModelLAnguAgeChAngedEvent): void {
		const oldModeId = e.oldLAnguAge;
		const newModeId = model.getLAnguAgeIdentifier().lAnguAge;
		const oldOptions = this.getCreAtionOptions(oldModeId, model.uri, model.isForSimpleWidget);
		const newOptions = this.getCreAtionOptions(newModeId, model.uri, model.isForSimpleWidget);
		ModelServiceImpl._setModelOptionsForModel(model, newOptions, oldOptions);
		this._onModelModeChAnged.fire({ model, oldModeId });
	}
}

export interfAce ILineSequence {
	getLineContent(lineNumber: number): string;
}

export const SEMANTIC_HIGHLIGHTING_SETTING_ID = 'editor.semAnticHighlighting';

export function isSemAnticColoringEnAbled(model: ITextModel, themeService: IThemeService, configurAtionService: IConfigurAtionService): booleAn {
	const setting = configurAtionService.getVAlue<IEditorSemAnticHighlightingOptions>(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: model.getLAnguAgeIdentifier().lAnguAge, resource: model.uri })?.enAbled;
	if (typeof setting === 'booleAn') {
		return setting;
	}
	return themeService.getColorTheme().semAnticHighlighting;
}

clAss SemAnticColoringFeAture extends DisposAble {

	privAte reAdonly _wAtchers: Record<string, ModelSemAnticColoring>;
	privAte reAdonly _semAnticStyling: SemAnticStyling;

	constructor(modelService: IModelService, themeService: IThemeService, configurAtionService: IConfigurAtionService, semAnticStyling: SemAnticStyling) {
		super();
		this._wAtchers = Object.creAte(null);
		this._semAnticStyling = semAnticStyling;

		const register = (model: ITextModel) => {
			this._wAtchers[model.uri.toString()] = new ModelSemAnticColoring(model, themeService, this._semAnticStyling);
		};
		const deregister = (model: ITextModel, modelSemAnticColoring: ModelSemAnticColoring) => {
			modelSemAnticColoring.dispose();
			delete this._wAtchers[model.uri.toString()];
		};
		const hAndleSettingOrThemeChAnge = () => {
			for (let model of modelService.getModels()) {
				const curr = this._wAtchers[model.uri.toString()];
				if (isSemAnticColoringEnAbled(model, themeService, configurAtionService)) {
					if (!curr) {
						register(model);
					}
				} else {
					if (curr) {
						deregister(model, curr);
					}
				}
			}
		};
		this._register(modelService.onModelAdded((model) => {
			if (isSemAnticColoringEnAbled(model, themeService, configurAtionService)) {
				register(model);
			}
		}));
		this._register(modelService.onModelRemoved((model) => {
			const curr = this._wAtchers[model.uri.toString()];
			if (curr) {
				deregister(model, curr);
			}
		}));
		this._register(configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(SEMANTIC_HIGHLIGHTING_SETTING_ID)) {
				hAndleSettingOrThemeChAnge();
			}
		}));
		this._register(themeService.onDidColorThemeChAnge(hAndleSettingOrThemeChAnge));
	}
}

clAss SemAnticStyling extends DisposAble {

	privAte _cAches: WeAkMAp<DocumentTokensProvider, SemAnticTokensProviderStyling>;

	constructor(
		privAte reAdonly _themeService: IThemeService,
		privAte reAdonly _logService: ILogService
	) {
		super();
		this._cAches = new WeAkMAp<DocumentTokensProvider, SemAnticTokensProviderStyling>();
		this._register(this._themeService.onDidColorThemeChAnge(() => {
			this._cAches = new WeAkMAp<DocumentTokensProvider, SemAnticTokensProviderStyling>();
		}));
	}

	public get(provider: DocumentTokensProvider): SemAnticTokensProviderStyling {
		if (!this._cAches.hAs(provider)) {
			this._cAches.set(provider, new SemAnticTokensProviderStyling(provider.getLegend(), this._themeService, this._logService));
		}
		return this._cAches.get(provider)!;
	}
}

clAss SemAnticTokensResponse {
	constructor(
		privAte reAdonly _provider: DocumentSemAnticTokensProvider,
		public reAdonly resultId: string | undefined,
		public reAdonly dAtA: Uint32ArrAy
	) { }

	public dispose(): void {
		this._provider.releAseDocumentSemAnticTokens(this.resultId);
	}
}

clAss ModelSemAnticColoring extends DisposAble {

	privAte _isDisposed: booleAn;
	privAte reAdonly _model: ITextModel;
	privAte reAdonly _semAnticStyling: SemAnticStyling;
	privAte reAdonly _fetchDocumentSemAnticTokens: RunOnceScheduler;
	privAte _currentDocumentResponse: SemAnticTokensResponse | null;
	privAte _currentDocumentRequestCAncellAtionTokenSource: CAncellAtionTokenSource | null;
	privAte _documentProvidersChAngeListeners: IDisposAble[];

	constructor(model: ITextModel, themeService: IThemeService, stylingProvider: SemAnticStyling) {
		super();

		this._isDisposed = fAlse;
		this._model = model;
		this._semAnticStyling = stylingProvider;
		this._fetchDocumentSemAnticTokens = this._register(new RunOnceScheduler(() => this._fetchDocumentSemAnticTokensNow(), 300));
		this._currentDocumentResponse = null;
		this._currentDocumentRequestCAncellAtionTokenSource = null;
		this._documentProvidersChAngeListeners = [];

		this._register(this._model.onDidChAngeContent(() => {
			if (!this._fetchDocumentSemAnticTokens.isScheduled()) {
				this._fetchDocumentSemAnticTokens.schedule();
			}
		}));
		const bindDocumentChAngeListeners = () => {
			dispose(this._documentProvidersChAngeListeners);
			this._documentProvidersChAngeListeners = [];
			for (const provider of DocumentSemAnticTokensProviderRegistry.All(model)) {
				if (typeof provider.onDidChAnge === 'function') {
					this._documentProvidersChAngeListeners.push(provider.onDidChAnge(() => this._fetchDocumentSemAnticTokens.schedule(0)));
				}
			}
		};
		bindDocumentChAngeListeners();
		this._register(DocumentSemAnticTokensProviderRegistry.onDidChAnge(() => {
			bindDocumentChAngeListeners();
			this._fetchDocumentSemAnticTokens.schedule();
		}));

		this._register(themeService.onDidColorThemeChAnge(_ => {
			// cleAr out existing tokens
			this._setDocumentSemAnticTokens(null, null, null, []);
			this._fetchDocumentSemAnticTokens.schedule();
		}));

		this._fetchDocumentSemAnticTokens.schedule(0);
	}

	public dispose(): void {
		if (this._currentDocumentResponse) {
			this._currentDocumentResponse.dispose();
			this._currentDocumentResponse = null;
		}
		if (this._currentDocumentRequestCAncellAtionTokenSource) {
			this._currentDocumentRequestCAncellAtionTokenSource.cAncel();
			this._currentDocumentRequestCAncellAtionTokenSource = null;
		}
		this._setDocumentSemAnticTokens(null, null, null, []);
		this._isDisposed = true;

		super.dispose();
	}

	privAte _fetchDocumentSemAnticTokensNow(): void {
		if (this._currentDocumentRequestCAncellAtionTokenSource) {
			// there is AlreAdy A request running, let it finish...
			return;
		}
		const provider = this._getSemAnticColoringProvider();
		if (!provider) {
			return;
		}
		this._currentDocumentRequestCAncellAtionTokenSource = new CAncellAtionTokenSource();

		const pendingChAnges: IModelContentChAngedEvent[] = [];
		const contentChAngeListener = this._model.onDidChAngeContent((e) => {
			pendingChAnges.push(e);
		});

		const styling = this._semAnticStyling.get(provider);

		const lAstResultId = this._currentDocumentResponse ? this._currentDocumentResponse.resultId || null : null;
		const request = Promise.resolve(provider.provideDocumentSemAnticTokens(this._model, lAstResultId, this._currentDocumentRequestCAncellAtionTokenSource.token));

		request.then((res) => {
			this._currentDocumentRequestCAncellAtionTokenSource = null;
			contentChAngeListener.dispose();
			this._setDocumentSemAnticTokens(provider, res || null, styling, pendingChAnges);
		}, (err) => {
			if (!err || typeof err.messAge !== 'string' || err.messAge.indexOf('busy') === -1) {
				errors.onUnexpectedError(err);
			}

			// SemAntic tokens eAts up All errors And considers errors to meAn thAt the result is temporArily not AvAilAble
			// The API does not hAve A speciAl error kind to express this...
			this._currentDocumentRequestCAncellAtionTokenSource = null;
			contentChAngeListener.dispose();

			if (pendingChAnges.length > 0) {
				// More chAnges occurred while the request wAs running
				if (!this._fetchDocumentSemAnticTokens.isScheduled()) {
					this._fetchDocumentSemAnticTokens.schedule();
				}
			}
		});
	}

	privAte stAtic _isSemAnticTokens(v: SemAnticTokens | SemAnticTokensEdits): v is SemAnticTokens {
		return v && !!((<SemAnticTokens>v).dAtA);
	}

	privAte stAtic _isSemAnticTokensEdits(v: SemAnticTokens | SemAnticTokensEdits): v is SemAnticTokensEdits {
		return v && ArrAy.isArrAy((<SemAnticTokensEdits>v).edits);
	}

	privAte stAtic _copy(src: Uint32ArrAy, srcOffset: number, dest: Uint32ArrAy, destOffset: number, length: number): void {
		for (let i = 0; i < length; i++) {
			dest[destOffset + i] = src[srcOffset + i];
		}
	}

	privAte _setDocumentSemAnticTokens(provider: DocumentSemAnticTokensProvider | null, tokens: SemAnticTokens | SemAnticTokensEdits | null, styling: SemAnticTokensProviderStyling | null, pendingChAnges: IModelContentChAngedEvent[]): void {
		const currentResponse = this._currentDocumentResponse;
		if (this._currentDocumentResponse) {
			this._currentDocumentResponse.dispose();
			this._currentDocumentResponse = null;
		}
		if (this._isDisposed) {
			// disposed!
			if (provider && tokens) {
				provider.releAseDocumentSemAnticTokens(tokens.resultId);
			}
			return;
		}
		if (!provider || !styling) {
			this._model.setSemAnticTokens(null, fAlse);
			return;
		}
		if (!tokens) {
			this._model.setSemAnticTokens(null, true);
			return;
		}

		if (ModelSemAnticColoring._isSemAnticTokensEdits(tokens)) {
			if (!currentResponse) {
				// not possible!
				this._model.setSemAnticTokens(null, true);
				return;
			}
			if (tokens.edits.length === 0) {
				// nothing to do!
				tokens = {
					resultId: tokens.resultId,
					dAtA: currentResponse.dAtA
				};
			} else {
				let deltALength = 0;
				for (const edit of tokens.edits) {
					deltALength += (edit.dAtA ? edit.dAtA.length : 0) - edit.deleteCount;
				}

				const srcDAtA = currentResponse.dAtA;
				const destDAtA = new Uint32ArrAy(srcDAtA.length + deltALength);

				let srcLAstStArt = srcDAtA.length;
				let destLAstStArt = destDAtA.length;
				for (let i = tokens.edits.length - 1; i >= 0; i--) {
					const edit = tokens.edits[i];

					const copyCount = srcLAstStArt - (edit.stArt + edit.deleteCount);
					if (copyCount > 0) {
						ModelSemAnticColoring._copy(srcDAtA, srcLAstStArt - copyCount, destDAtA, destLAstStArt - copyCount, copyCount);
						destLAstStArt -= copyCount;
					}

					if (edit.dAtA) {
						ModelSemAnticColoring._copy(edit.dAtA, 0, destDAtA, destLAstStArt - edit.dAtA.length, edit.dAtA.length);
						destLAstStArt -= edit.dAtA.length;
					}

					srcLAstStArt = edit.stArt;
				}

				if (srcLAstStArt > 0) {
					ModelSemAnticColoring._copy(srcDAtA, 0, destDAtA, 0, srcLAstStArt);
				}

				tokens = {
					resultId: tokens.resultId,
					dAtA: destDAtA
				};
			}
		}

		if (ModelSemAnticColoring._isSemAnticTokens(tokens)) {

			this._currentDocumentResponse = new SemAnticTokensResponse(provider, tokens.resultId, tokens.dAtA);

			const result = toMultilineTokens2(tokens, styling, this._model.getLAnguAgeIdentifier());

			// Adjust incoming semAntic tokens
			if (pendingChAnges.length > 0) {
				// More chAnges occurred while the request wAs running
				// We need to:
				// 1. Adjust incoming semAntic tokens
				// 2. Request them AgAin
				for (const chAnge of pendingChAnges) {
					for (const AreA of result) {
						for (const singleChAnge of chAnge.chAnges) {
							AreA.ApplyEdit(singleChAnge.rAnge, singleChAnge.text);
						}
					}
				}

				if (!this._fetchDocumentSemAnticTokens.isScheduled()) {
					this._fetchDocumentSemAnticTokens.schedule();
				}
			}

			this._model.setSemAnticTokens(result, true);
			return;
		}

		this._model.setSemAnticTokens(null, true);
	}

	privAte _getSemAnticColoringProvider(): DocumentSemAnticTokensProvider | null {
		const result = DocumentSemAnticTokensProviderRegistry.ordered(this._model);
		return (result.length > 0 ? result[0] : null);
	}
}
