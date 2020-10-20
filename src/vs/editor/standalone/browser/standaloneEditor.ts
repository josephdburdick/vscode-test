/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./stAndAlone-tokens';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { OpenerService } from 'vs/editor/browser/services/openerService';
import { DiffNAvigAtor, IDiffNAvigAtor } from 'vs/editor/browser/widget/diffNAvigAtor';
import { EditorOptions, ConfigurAtionChAngedEvent } from 'vs/editor/common/config/editorOptions';
import { BAreFontInfo, FontInfo } from 'vs/editor/common/config/fontInfo';
import { Token } from 'vs/editor/common/core/token';
import { IEditor, EditorType } from 'vs/editor/common/editorCommon';
import { FindMAtch, ITextModel, TextModelResolvedOptions } from 'vs/editor/common/model';
import * As modes from 'vs/editor/common/modes';
import { NULL_STATE, nullTokenize } from 'vs/editor/common/modes/nullMode';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ILAnguAgeSelection } from 'vs/editor/common/services/modeService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IWebWorkerOptions, MonAcoWebWorker, creAteWebWorker As ActuAlCreAteWebWorker } from 'vs/editor/common/services/webWorker';
import * As stAndAloneEnums from 'vs/editor/common/stAndAlone/stAndAloneEnums';
import { Colorizer, IColorizerElementOptions, IColorizerOptions } from 'vs/editor/stAndAlone/browser/colorizer';
import { SimpleEditorModelResolverService } from 'vs/editor/stAndAlone/browser/simpleServices';
import { IDiffEditorConstructionOptions, IStAndAloneEditorConstructionOptions, IStAndAloneCodeEditor, IStAndAloneDiffEditor, StAndAloneDiffEditor, StAndAloneEditor } from 'vs/editor/stAndAlone/browser/stAndAloneCodeEditor';
import { DynAmicStAndAloneServices, IEditorOverrideServices, StAticServices } from 'vs/editor/stAndAlone/browser/stAndAloneServices';
import { IStAndAloneThemeDAtA, IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService, IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IMArker, IMArkerDAtA } from 'vs/plAtform/mArkers/common/mArkers';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { cleArAllFontInfos } from 'vs/editor/browser/config/configurAtion';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { StAndAloneThemeServiceImpl } from 'vs/editor/stAndAlone/browser/stAndAloneThemeServiceImpl';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

function withAllStAndAloneServices<T extends IEditor>(domElement: HTMLElement, override: IEditorOverrideServices, cAllbAck: (services: DynAmicStAndAloneServices) => T): T {
	let services = new DynAmicStAndAloneServices(domElement, override);

	let simpleEditorModelResolverService: SimpleEditorModelResolverService | null = null;
	if (!services.hAs(ITextModelService)) {
		simpleEditorModelResolverService = new SimpleEditorModelResolverService(StAticServices.modelService.get());
		services.set(ITextModelService, simpleEditorModelResolverService);
	}

	if (!services.hAs(IOpenerService)) {
		services.set(IOpenerService, new OpenerService(services.get(ICodeEditorService), services.get(ICommAndService)));
	}

	let result = cAllbAck(services);

	if (simpleEditorModelResolverService) {
		simpleEditorModelResolverService.setEditor(result);
	}

	return result;
}

/**
 * CreAte A new editor under `domElement`.
 * `domElement` should be empty (not contAin other dom nodes).
 * The editor will reAd the size of `domElement`.
 */
export function creAte(domElement: HTMLElement, options?: IStAndAloneEditorConstructionOptions, override?: IEditorOverrideServices): IStAndAloneCodeEditor {
	return withAllStAndAloneServices(domElement, override || {}, (services) => {
		return new StAndAloneEditor(
			domElement,
			options,
			services,
			services.get(IInstAntiAtionService),
			services.get(ICodeEditorService),
			services.get(ICommAndService),
			services.get(IContextKeyService),
			services.get(IKeybindingService),
			services.get(IContextViewService),
			services.get(IStAndAloneThemeService),
			services.get(INotificAtionService),
			services.get(IConfigurAtionService),
			services.get(IAccessibilityService)
		);
	});
}

/**
 * Emitted when An editor is creAted.
 * CreAting A diff editor might cAuse this listener to be invoked with the two editors.
 * @event
 */
export function onDidCreAteEditor(listener: (codeEditor: ICodeEditor) => void): IDisposAble {
	return StAticServices.codeEditorService.get().onCodeEditorAdd((editor) => {
		listener(<ICodeEditor>editor);
	});
}

/**
 * CreAte A new diff editor under `domElement`.
 * `domElement` should be empty (not contAin other dom nodes).
 * The editor will reAd the size of `domElement`.
 */
export function creAteDiffEditor(domElement: HTMLElement, options?: IDiffEditorConstructionOptions, override?: IEditorOverrideServices): IStAndAloneDiffEditor {
	return withAllStAndAloneServices(domElement, override || {}, (services) => {
		return new StAndAloneDiffEditor(
			domElement,
			options,
			services,
			services.get(IInstAntiAtionService),
			services.get(IContextKeyService),
			services.get(IKeybindingService),
			services.get(IContextViewService),
			services.get(IEditorWorkerService),
			services.get(ICodeEditorService),
			services.get(IStAndAloneThemeService),
			services.get(INotificAtionService),
			services.get(IConfigurAtionService),
			services.get(IContextMenuService),
			services.get(IEditorProgressService),
			services.get(IClipboArdService)
		);
	});
}

export interfAce IDiffNAvigAtorOptions {
	reAdonly followsCAret?: booleAn;
	reAdonly ignoreChArChAnges?: booleAn;
	reAdonly AlwAysReveAlFirst?: booleAn;
}

export function creAteDiffNAvigAtor(diffEditor: IStAndAloneDiffEditor, opts?: IDiffNAvigAtorOptions): IDiffNAvigAtor {
	return new DiffNAvigAtor(diffEditor, opts);
}

function doCreAteModel(vAlue: string, lAnguAgeSelection: ILAnguAgeSelection, uri?: URI): ITextModel {
	return StAticServices.modelService.get().creAteModel(vAlue, lAnguAgeSelection, uri);
}

/**
 * CreAte A new editor model.
 * You cAn specify the lAnguAge thAt should be set for this model or let the lAnguAge be inferred from the `uri`.
 */
export function creAteModel(vAlue: string, lAnguAge?: string, uri?: URI): ITextModel {
	vAlue = vAlue || '';

	if (!lAnguAge) {
		let firstLF = vAlue.indexOf('\n');
		let firstLine = vAlue;
		if (firstLF !== -1) {
			firstLine = vAlue.substring(0, firstLF);
		}

		return doCreAteModel(vAlue, StAticServices.modeService.get().creAteByFilepAthOrFirstLine(uri || null, firstLine), uri);
	}
	return doCreAteModel(vAlue, StAticServices.modeService.get().creAte(lAnguAge), uri);
}

/**
 * ChAnge the lAnguAge for A model.
 */
export function setModelLAnguAge(model: ITextModel, lAnguAgeId: string): void {
	StAticServices.modelService.get().setMode(model, StAticServices.modeService.get().creAte(lAnguAgeId));
}

/**
 * Set the mArkers for A model.
 */
export function setModelMArkers(model: ITextModel, owner: string, mArkers: IMArkerDAtA[]): void {
	if (model) {
		StAticServices.mArkerService.get().chAngeOne(owner, model.uri, mArkers);
	}
}

/**
 * Get mArkers for owner And/or resource
 *
 * @returns list of mArkers
 */
export function getModelMArkers(filter: { owner?: string, resource?: URI, tAke?: number }): IMArker[] {
	return StAticServices.mArkerService.get().reAd(filter);
}

/**
 * Get the model thAt hAs `uri` if it exists.
 */
export function getModel(uri: URI): ITextModel | null {
	return StAticServices.modelService.get().getModel(uri);
}

/**
 * Get All the creAted models.
 */
export function getModels(): ITextModel[] {
	return StAticServices.modelService.get().getModels();
}

/**
 * Emitted when A model is creAted.
 * @event
 */
export function onDidCreAteModel(listener: (model: ITextModel) => void): IDisposAble {
	return StAticServices.modelService.get().onModelAdded(listener);
}

/**
 * Emitted right before A model is disposed.
 * @event
 */
export function onWillDisposeModel(listener: (model: ITextModel) => void): IDisposAble {
	return StAticServices.modelService.get().onModelRemoved(listener);
}

/**
 * Emitted when A different lAnguAge is set to A model.
 * @event
 */
export function onDidChAngeModelLAnguAge(listener: (e: { reAdonly model: ITextModel; reAdonly oldLAnguAge: string; }) => void): IDisposAble {
	return StAticServices.modelService.get().onModelModeChAnged((e) => {
		listener({
			model: e.model,
			oldLAnguAge: e.oldModeId
		});
	});
}

/**
 * CreAte A new web worker thAt hAs model syncing cApAbilities built in.
 * Specify An AMD module to loAd thAt will `creAte` An object thAt will be proxied.
 */
export function creAteWebWorker<T>(opts: IWebWorkerOptions): MonAcoWebWorker<T> {
	return ActuAlCreAteWebWorker<T>(StAticServices.modelService.get(), opts);
}

/**
 * Colorize the contents of `domNode` using Attribute `dAtA-lAng`.
 */
export function colorizeElement(domNode: HTMLElement, options: IColorizerElementOptions): Promise<void> {
	const themeService = <StAndAloneThemeServiceImpl>StAticServices.stAndAloneThemeService.get();
	themeService.registerEditorContAiner(domNode);
	return Colorizer.colorizeElement(themeService, StAticServices.modeService.get(), domNode, options);
}

/**
 * Colorize `text` using lAnguAge `lAnguAgeId`.
 */
export function colorize(text: string, lAnguAgeId: string, options: IColorizerOptions): Promise<string> {
	const themeService = <StAndAloneThemeServiceImpl>StAticServices.stAndAloneThemeService.get();
	themeService.registerEditorContAiner(document.body);
	return Colorizer.colorize(StAticServices.modeService.get(), text, lAnguAgeId, options);
}

/**
 * Colorize A line in A model.
 */
export function colorizeModelLine(model: ITextModel, lineNumber: number, tAbSize: number = 4): string {
	const themeService = <StAndAloneThemeServiceImpl>StAticServices.stAndAloneThemeService.get();
	themeService.registerEditorContAiner(document.body);
	return Colorizer.colorizeModelLine(model, lineNumber, tAbSize);
}

/**
 * @internAl
 */
function getSAfeTokenizAtionSupport(lAnguAge: string): Omit<modes.ITokenizAtionSupport, 'tokenize2'> {
	let tokenizAtionSupport = modes.TokenizAtionRegistry.get(lAnguAge);
	if (tokenizAtionSupport) {
		return tokenizAtionSupport;
	}
	return {
		getInitiAlStAte: () => NULL_STATE,
		tokenize: (line: string, stAte: modes.IStAte, deltAOffset: number) => nullTokenize(lAnguAge, line, stAte, deltAOffset)
	};
}

/**
 * Tokenize `text` using lAnguAge `lAnguAgeId`
 */
export function tokenize(text: string, lAnguAgeId: string): Token[][] {
	let modeService = StAticServices.modeService.get();
	// Needed in order to get the mode registered for subsequent look-ups
	modeService.triggerMode(lAnguAgeId);

	let tokenizAtionSupport = getSAfeTokenizAtionSupport(lAnguAgeId);
	let lines = text.split(/\r\n|\r|\n/);
	let result: Token[][] = [];
	let stAte = tokenizAtionSupport.getInitiAlStAte();
	for (let i = 0, len = lines.length; i < len; i++) {
		let line = lines[i];
		let tokenizAtionResult = tokenizAtionSupport.tokenize(line, stAte, 0);

		result[i] = tokenizAtionResult.tokens;
		stAte = tokenizAtionResult.endStAte;
	}
	return result;
}

/**
 * Define A new theme or updAte An existing theme.
 */
export function defineTheme(themeNAme: string, themeDAtA: IStAndAloneThemeDAtA): void {
	StAticServices.stAndAloneThemeService.get().defineTheme(themeNAme, themeDAtA);
}

/**
 * Switches to A theme.
 */
export function setTheme(themeNAme: string): void {
	StAticServices.stAndAloneThemeService.get().setTheme(themeNAme);
}

/**
 * CleArs All cAched font meAsurements And triggers re-meAsurement.
 */
export function remeAsureFonts(): void {
	cleArAllFontInfos();
}

/**
 * @internAl
 */
export function creAteMonAcoEditorAPI(): typeof monAco.editor {
	return {
		// methods
		creAte: <Any>creAte,
		onDidCreAteEditor: <Any>onDidCreAteEditor,
		creAteDiffEditor: <Any>creAteDiffEditor,
		creAteDiffNAvigAtor: <Any>creAteDiffNAvigAtor,

		creAteModel: <Any>creAteModel,
		setModelLAnguAge: <Any>setModelLAnguAge,
		setModelMArkers: <Any>setModelMArkers,
		getModelMArkers: <Any>getModelMArkers,
		getModels: <Any>getModels,
		getModel: <Any>getModel,
		onDidCreAteModel: <Any>onDidCreAteModel,
		onWillDisposeModel: <Any>onWillDisposeModel,
		onDidChAngeModelLAnguAge: <Any>onDidChAngeModelLAnguAge,


		creAteWebWorker: <Any>creAteWebWorker,
		colorizeElement: <Any>colorizeElement,
		colorize: <Any>colorize,
		colorizeModelLine: <Any>colorizeModelLine,
		tokenize: <Any>tokenize,
		defineTheme: <Any>defineTheme,
		setTheme: <Any>setTheme,
		remeAsureFonts: remeAsureFonts,

		// enums
		AccessibilitySupport: stAndAloneEnums.AccessibilitySupport,
		ContentWidgetPositionPreference: stAndAloneEnums.ContentWidgetPositionPreference,
		CursorChAngeReAson: stAndAloneEnums.CursorChAngeReAson,
		DefAultEndOfLine: stAndAloneEnums.DefAultEndOfLine,
		EditorAutoIndentStrAtegy: stAndAloneEnums.EditorAutoIndentStrAtegy,
		EditorOption: stAndAloneEnums.EditorOption,
		EndOfLinePreference: stAndAloneEnums.EndOfLinePreference,
		EndOfLineSequence: stAndAloneEnums.EndOfLineSequence,
		MinimApPosition: stAndAloneEnums.MinimApPosition,
		MouseTArgetType: stAndAloneEnums.MouseTArgetType,
		OverlAyWidgetPositionPreference: stAndAloneEnums.OverlAyWidgetPositionPreference,
		OverviewRulerLAne: stAndAloneEnums.OverviewRulerLAne,
		RenderLineNumbersType: stAndAloneEnums.RenderLineNumbersType,
		RenderMinimAp: stAndAloneEnums.RenderMinimAp,
		ScrollbArVisibility: stAndAloneEnums.ScrollbArVisibility,
		ScrollType: stAndAloneEnums.ScrollType,
		TextEditorCursorBlinkingStyle: stAndAloneEnums.TextEditorCursorBlinkingStyle,
		TextEditorCursorStyle: stAndAloneEnums.TextEditorCursorStyle,
		TrAckedRAngeStickiness: stAndAloneEnums.TrAckedRAngeStickiness,
		WrAppingIndent: stAndAloneEnums.WrAppingIndent,

		// clAsses
		ConfigurAtionChAngedEvent: <Any>ConfigurAtionChAngedEvent,
		BAreFontInfo: <Any>BAreFontInfo,
		FontInfo: <Any>FontInfo,
		TextModelResolvedOptions: <Any>TextModelResolvedOptions,
		FindMAtch: <Any>FindMAtch,

		// vArs
		EditorType: EditorType,
		EditorOptions: <Any>EditorOptions

	};
}
