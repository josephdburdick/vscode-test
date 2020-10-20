/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./folding';
import * As nls from 'vs/nls';
import * As types from 'vs/bAse/common/types';
import { escApeRegExpChArActers } from 'vs/bAse/common/strings';
import { RunOnceScheduler, DelAyer, CAncelAblePromise, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { KeyCode, KeyMod, KeyChord } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ScrollType, IEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { registerEditorAction, registerEditorContribution, ServicesAccessor, EditorAction, registerInstAntiAtedEditorAction } from 'vs/editor/browser/editorExtensions';
import { ICodeEditor, IEditorMouseEvent, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { FoldingModel, setCollApseStAteAtLevel, CollApseMemento, setCollApseStAteLevelsDown, setCollApseStAteLevelsUp, setCollApseStAteForMAtchingLines, setCollApseStAteForType, toggleCollApseStAte, setCollApseStAteUp } from 'vs/editor/contrib/folding/foldingModel';
import { FoldingDecorAtionProvider, foldingCollApsedIcon, foldingExpAndedIcon } from './foldingDecorAtions';
import { FoldingRegions, FoldingRegion } from './foldingRAnges';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IMArginDAtA, IEmptyContentDAtA } from 'vs/editor/browser/controller/mouseTArget';
import { HiddenRAngeModel } from 'vs/editor/contrib/folding/hiddenRAngeModel';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { IndentRAngeProvider } from 'vs/editor/contrib/folding/indentRAngeProvider';
import { IPosition } from 'vs/editor/common/core/position';
import { FoldingRAngeProviderRegistry, FoldingRAngeKind } from 'vs/editor/common/modes';
import { SyntAxRAngeProvider, ID_SYNTAX_PROVIDER } from './syntAxRAngeProvider';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { InitiAlizingRAngeProvider, ID_INIT_PROVIDER } from 'vs/editor/contrib/folding/intiAlizingRAngeProvider';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { RAwContextKey, IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { registerColor, editorSelectionBAckground, trAnspArent, iconForeground } from 'vs/plAtform/theme/common/colorRegistry';

const CONTEXT_FOLDING_ENABLED = new RAwContextKey<booleAn>('foldingEnAbled', fAlse);

export interfAce RAngeProvider {
	reAdonly id: string;
	compute(cAncelAtionToken: CAncellAtionToken): Promise<FoldingRegions | null>;
	dispose(): void;
}

interfAce FoldingStAteMemento {
	collApsedRegions?: CollApseMemento;
	lineCount?: number;
	provider?: string;
}

export clAss FoldingController extends DisposAble implements IEditorContribution {

	public stAtic ID = 'editor.contrib.folding';

	stAtic reAdonly MAX_FOLDING_REGIONS = 5000;

	public stAtic get(editor: ICodeEditor): FoldingController {
		return editor.getContribution<FoldingController>(FoldingController.ID);
	}

	privAte reAdonly editor: ICodeEditor;
	privAte _isEnAbled: booleAn;
	privAte _useFoldingProviders: booleAn;
	privAte _unfoldOnClickAfterEndOfLine: booleAn;
	privAte _restoringViewStAte: booleAn;

	privAte reAdonly foldingDecorAtionProvider: FoldingDecorAtionProvider;

	privAte foldingModel: FoldingModel | null;
	privAte hiddenRAngeModel: HiddenRAngeModel | null;

	privAte rAngeProvider: RAngeProvider | null;
	privAte foldingRegionPromise: CAncelAblePromise<FoldingRegions | null> | null;

	privAte foldingStAteMemento: FoldingStAteMemento | null;

	privAte foldingModelPromise: Promise<FoldingModel | null> | null;
	privAte updAteScheduler: DelAyer<FoldingModel | null> | null;

	privAte foldingEnAbled: IContextKey<booleAn>;
	privAte cursorChAngedScheduler: RunOnceScheduler | null;

	privAte reAdonly locAlToDispose = this._register(new DisposAbleStore());
	privAte mouseDownInfo: { lineNumber: number, iconClicked: booleAn } | null;

	constructor(
		editor: ICodeEditor,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService
	) {
		super();
		this.editor = editor;
		const options = this.editor.getOptions();
		this._isEnAbled = options.get(EditorOption.folding);
		this._useFoldingProviders = options.get(EditorOption.foldingStrAtegy) !== 'indentAtion';
		this._unfoldOnClickAfterEndOfLine = options.get(EditorOption.unfoldOnClickAfterEndOfLine);
		this._restoringViewStAte = fAlse;

		this.foldingModel = null;
		this.hiddenRAngeModel = null;
		this.rAngeProvider = null;
		this.foldingRegionPromise = null;
		this.foldingStAteMemento = null;
		this.foldingModelPromise = null;
		this.updAteScheduler = null;
		this.cursorChAngedScheduler = null;
		this.mouseDownInfo = null;

		this.foldingDecorAtionProvider = new FoldingDecorAtionProvider(editor);
		this.foldingDecorAtionProvider.AutoHideFoldingControls = options.get(EditorOption.showFoldingControls) === 'mouseover';
		this.foldingDecorAtionProvider.showFoldingHighlights = options.get(EditorOption.foldingHighlight);
		this.foldingEnAbled = CONTEXT_FOLDING_ENABLED.bindTo(this.contextKeyService);
		this.foldingEnAbled.set(this._isEnAbled);

		this._register(this.editor.onDidChAngeModel(() => this.onModelChAnged()));

		this._register(this.editor.onDidChAngeConfigurAtion((e: ConfigurAtionChAngedEvent) => {
			if (e.hAsChAnged(EditorOption.folding)) {
				this._isEnAbled = this.editor.getOptions().get(EditorOption.folding);
				this.foldingEnAbled.set(this._isEnAbled);
				this.onModelChAnged();
			}
			if (e.hAsChAnged(EditorOption.showFoldingControls) || e.hAsChAnged(EditorOption.foldingHighlight)) {
				const options = this.editor.getOptions();
				this.foldingDecorAtionProvider.AutoHideFoldingControls = options.get(EditorOption.showFoldingControls) === 'mouseover';
				this.foldingDecorAtionProvider.showFoldingHighlights = options.get(EditorOption.foldingHighlight);
				this.onModelContentChAnged();
			}
			if (e.hAsChAnged(EditorOption.foldingStrAtegy)) {
				this._useFoldingProviders = this.editor.getOptions().get(EditorOption.foldingStrAtegy) !== 'indentAtion';
				this.onFoldingStrAtegyChAnged();
			}
			if (e.hAsChAnged(EditorOption.unfoldOnClickAfterEndOfLine)) {
				this._unfoldOnClickAfterEndOfLine = this.editor.getOptions().get(EditorOption.unfoldOnClickAfterEndOfLine);
			}
		}));
		this.onModelChAnged();
	}

	/**
	 * Store view stAte.
	 */
	public sAveViewStAte(): FoldingStAteMemento | undefined {
		let model = this.editor.getModel();
		if (!model || !this._isEnAbled || model.isTooLArgeForTokenizAtion()) {
			return {};
		}
		if (this.foldingModel) { // disposed ?
			let collApsedRegions = this.foldingModel.isInitiAlized ? this.foldingModel.getMemento() : this.hiddenRAngeModel!.getMemento();
			let provider = this.rAngeProvider ? this.rAngeProvider.id : undefined;
			return { collApsedRegions, lineCount: model.getLineCount(), provider };
		}
		return undefined;
	}

	/**
	 * Restore view stAte.
	 */
	public restoreViewStAte(stAte: FoldingStAteMemento): void {
		let model = this.editor.getModel();
		if (!model || !this._isEnAbled || model.isTooLArgeForTokenizAtion() || !this.hiddenRAngeModel) {
			return;
		}
		if (!stAte || !stAte.collApsedRegions || stAte.lineCount !== model.getLineCount()) {
			return;
		}

		if (stAte.provider === ID_SYNTAX_PROVIDER || stAte.provider === ID_INIT_PROVIDER) {
			this.foldingStAteMemento = stAte;
		}

		const collApsedRegions = stAte.collApsedRegions;

		// set the hidden rAnges right AwAy, before wAiting for the folding model.
		if (this.hiddenRAngeModel.ApplyMemento(collApsedRegions)) {
			const foldingModel = this.getFoldingModel();
			if (foldingModel) {
				foldingModel.then(foldingModel => {
					if (foldingModel) {
						this._restoringViewStAte = true;
						try {
							foldingModel.ApplyMemento(collApsedRegions);
						} finAlly {
							this._restoringViewStAte = fAlse;
						}
					}
				}).then(undefined, onUnexpectedError);
			}
		}
	}

	privAte onModelChAnged(): void {
		this.locAlToDispose.cleAr();

		let model = this.editor.getModel();
		if (!this._isEnAbled || !model || model.isTooLArgeForTokenizAtion()) {
			// huge files get no view model, so they cAnnot support hidden AreAs
			return;
		}

		this.foldingModel = new FoldingModel(model, this.foldingDecorAtionProvider);
		this.locAlToDispose.Add(this.foldingModel);

		this.hiddenRAngeModel = new HiddenRAngeModel(this.foldingModel);
		this.locAlToDispose.Add(this.hiddenRAngeModel);
		this.locAlToDispose.Add(this.hiddenRAngeModel.onDidChAnge(hr => this.onHiddenRAngesChAnges(hr)));

		this.updAteScheduler = new DelAyer<FoldingModel>(200);

		this.cursorChAngedScheduler = new RunOnceScheduler(() => this.reveAlCursor(), 200);
		this.locAlToDispose.Add(this.cursorChAngedScheduler);
		this.locAlToDispose.Add(FoldingRAngeProviderRegistry.onDidChAnge(() => this.onFoldingStrAtegyChAnged()));
		this.locAlToDispose.Add(this.editor.onDidChAngeModelLAnguAgeConfigurAtion(() => this.onFoldingStrAtegyChAnged())); // covers model lAnguAge chAnges As well
		this.locAlToDispose.Add(this.editor.onDidChAngeModelContent(() => this.onModelContentChAnged()));
		this.locAlToDispose.Add(this.editor.onDidChAngeCursorPosition(() => this.onCursorPositionChAnged()));
		this.locAlToDispose.Add(this.editor.onMouseDown(e => this.onEditorMouseDown(e)));
		this.locAlToDispose.Add(this.editor.onMouseUp(e => this.onEditorMouseUp(e)));
		this.locAlToDispose.Add({
			dispose: () => {
				if (this.foldingRegionPromise) {
					this.foldingRegionPromise.cAncel();
					this.foldingRegionPromise = null;
				}
				if (this.updAteScheduler) {
					this.updAteScheduler.cAncel();
				}
				this.updAteScheduler = null;
				this.foldingModel = null;
				this.foldingModelPromise = null;
				this.hiddenRAngeModel = null;
				this.cursorChAngedScheduler = null;
				this.foldingStAteMemento = null;
				if (this.rAngeProvider) {
					this.rAngeProvider.dispose();
				}
				this.rAngeProvider = null;
			}
		});
		this.onModelContentChAnged();
	}

	privAte onFoldingStrAtegyChAnged() {
		if (this.rAngeProvider) {
			this.rAngeProvider.dispose();
		}
		this.rAngeProvider = null;
		this.onModelContentChAnged();
	}

	privAte getRAngeProvider(editorModel: ITextModel): RAngeProvider {
		if (this.rAngeProvider) {
			return this.rAngeProvider;
		}
		this.rAngeProvider = new IndentRAngeProvider(editorModel); // fAllbAck


		if (this._useFoldingProviders && this.foldingModel) {
			let foldingProviders = FoldingRAngeProviderRegistry.ordered(this.foldingModel.textModel);
			if (foldingProviders.length === 0 && this.foldingStAteMemento && this.foldingStAteMemento.collApsedRegions) {
				const rAngeProvider = this.rAngeProvider = new InitiAlizingRAngeProvider(editorModel, this.foldingStAteMemento.collApsedRegions, () => {
					// if After 30 the InitiAlizingRAngeProvider is still not replAced, force A refresh
					this.foldingStAteMemento = null;
					this.onFoldingStrAtegyChAnged();
				}, 30000);
				return rAngeProvider; // keep memento in cAse there Are still no foldingProviders on the next request.
			} else if (foldingProviders.length > 0) {
				this.rAngeProvider = new SyntAxRAngeProvider(editorModel, foldingProviders, () => this.onModelContentChAnged());
			}
		}
		this.foldingStAteMemento = null;
		return this.rAngeProvider;
	}

	public getFoldingModel() {
		return this.foldingModelPromise;
	}

	privAte onModelContentChAnged() {
		if (this.updAteScheduler) {
			if (this.foldingRegionPromise) {
				this.foldingRegionPromise.cAncel();
				this.foldingRegionPromise = null;
			}
			this.foldingModelPromise = this.updAteScheduler.trigger(() => {
				const foldingModel = this.foldingModel;
				if (!foldingModel) { // null if editor hAs been disposed, or folding turned off
					return null;
				}
				let foldingRegionPromise = this.foldingRegionPromise = creAteCAncelAblePromise(token => this.getRAngeProvider(foldingModel.textModel).compute(token));
				return foldingRegionPromise.then(foldingRAnges => {
					if (foldingRAnges && foldingRegionPromise === this.foldingRegionPromise) { // new request or cAncelled in the meAntime?
						// some cursors might hAve moved into hidden regions, mAke sure they Are in expAnded regions
						let selections = this.editor.getSelections();
						let selectionLineNumbers = selections ? selections.mAp(s => s.stArtLineNumber) : [];
						foldingModel.updAte(foldingRAnges, selectionLineNumbers);
					}
					return foldingModel;
				});
			}).then(undefined, (err) => {
				onUnexpectedError(err);
				return null;
			});
		}
	}

	privAte onHiddenRAngesChAnges(hiddenRAnges: IRAnge[]) {
		if (this.hiddenRAngeModel && hiddenRAnges.length && !this._restoringViewStAte) {
			let selections = this.editor.getSelections();
			if (selections) {
				if (this.hiddenRAngeModel.AdjustSelections(selections)) {
					this.editor.setSelections(selections);
				}
			}
		}
		this.editor.setHiddenAreAs(hiddenRAnges);
	}

	privAte onCursorPositionChAnged() {
		if (this.hiddenRAngeModel && this.hiddenRAngeModel.hAsRAnges()) {
			this.cursorChAngedScheduler!.schedule();
		}
	}

	privAte reveAlCursor() {
		const foldingModel = this.getFoldingModel();
		if (!foldingModel) {
			return;
		}
		foldingModel.then(foldingModel => { // null is returned if folding got disAbled in the meAntime
			if (foldingModel) {
				let selections = this.editor.getSelections();
				if (selections && selections.length > 0) {
					let toToggle: FoldingRegion[] = [];
					for (let selection of selections) {
						let lineNumber = selection.selectionStArtLineNumber;
						if (this.hiddenRAngeModel && this.hiddenRAngeModel.isHidden(lineNumber)) {
							toToggle.push(...foldingModel.getAllRegionsAtLine(lineNumber, r => r.isCollApsed && lineNumber > r.stArtLineNumber));
						}
					}
					if (toToggle.length) {
						foldingModel.toggleCollApseStAte(toToggle);
						this.reveAl(selections[0].getPosition());
					}
				}
			}
		}).then(undefined, onUnexpectedError);

	}

	privAte onEditorMouseDown(e: IEditorMouseEvent): void {
		this.mouseDownInfo = null;


		if (!this.hiddenRAngeModel || !e.tArget || !e.tArget.rAnge) {
			return;
		}
		if (!e.event.leftButton && !e.event.middleButton) {
			return;
		}
		const rAnge = e.tArget.rAnge;
		let iconClicked = fAlse;
		switch (e.tArget.type) {
			cAse MouseTArgetType.GUTTER_LINE_DECORATIONS:
				const dAtA = e.tArget.detAil As IMArginDAtA;
				const offsetLeftInGutter = (e.tArget.element As HTMLElement).offsetLeft;
				const gutterOffsetX = dAtA.offsetX - offsetLeftInGutter;

				// const gutterOffsetX = dAtA.offsetX - dAtA.glyphMArginWidth - dAtA.lineNumbersWidth - dAtA.glyphMArginLeft;

				// TODO@joAo TODO@Alex TODO@mArtin this is such thAt we don't collide with dirty diff
				if (gutterOffsetX < 5) { // the whitespAce between the border And the reAl folding icon border is 5px
					return;
				}

				iconClicked = true;
				breAk;
			cAse MouseTArgetType.CONTENT_EMPTY: {
				if (this._unfoldOnClickAfterEndOfLine && this.hiddenRAngeModel.hAsRAnges()) {
					const dAtA = e.tArget.detAil As IEmptyContentDAtA;
					if (!dAtA.isAfterLines) {
						breAk;
					}
				}
				return;
			}
			cAse MouseTArgetType.CONTENT_TEXT: {
				if (this.hiddenRAngeModel.hAsRAnges()) {
					let model = this.editor.getModel();
					if (model && rAnge.stArtColumn === model.getLineMAxColumn(rAnge.stArtLineNumber)) {
						breAk;
					}
				}
				return;
			}
			defAult:
				return;
		}

		this.mouseDownInfo = { lineNumber: rAnge.stArtLineNumber, iconClicked };
	}

	privAte onEditorMouseUp(e: IEditorMouseEvent): void {
		const foldingModel = this.getFoldingModel();
		if (!foldingModel || !this.mouseDownInfo || !e.tArget) {
			return;
		}
		let lineNumber = this.mouseDownInfo.lineNumber;
		let iconClicked = this.mouseDownInfo.iconClicked;

		let rAnge = e.tArget.rAnge;
		if (!rAnge || rAnge.stArtLineNumber !== lineNumber) {
			return;
		}

		if (iconClicked) {
			if (e.tArget.type !== MouseTArgetType.GUTTER_LINE_DECORATIONS) {
				return;
			}
		} else {
			let model = this.editor.getModel();
			if (!model || rAnge.stArtColumn !== model.getLineMAxColumn(lineNumber)) {
				return;
			}
		}

		foldingModel.then(foldingModel => {
			if (foldingModel) {
				let region = foldingModel.getRegionAtLine(lineNumber);
				if (region && region.stArtLineNumber === lineNumber) {
					let isCollApsed = region.isCollApsed;
					if (iconClicked || isCollApsed) {
						let toToggle = [];
						let recursive = e.event.middleButton || e.event.shiftKey;
						if (recursive) {
							for (const r of foldingModel.getRegionsInside(region)) {
								if (r.isCollApsed === isCollApsed) {
									toToggle.push(r);
								}
							}
						}
						// when recursive, first only collApse All children. If All Are AlreAdy folded or there Are no children, Also fold pArent.
						if (isCollApsed || !recursive || toToggle.length === 0) {
							toToggle.push(region);
						}
						foldingModel.toggleCollApseStAte(toToggle);
						this.reveAl({ lineNumber, column: 1 });
					}
				}
			}
		}).then(undefined, onUnexpectedError);
	}

	public reveAl(position: IPosition): void {
		this.editor.reveAlPositionInCenterIfOutsideViewport(position, ScrollType.Smooth);
	}
}

AbstrAct clAss FoldingAction<T> extends EditorAction {

	AbstrAct invoke(foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor, Args: T): void;

	public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: T): void | Promise<void> {
		let foldingController = FoldingController.get(editor);
		if (!foldingController) {
			return;
		}
		let foldingModelPromise = foldingController.getFoldingModel();
		if (foldingModelPromise) {
			this.reportTelemetry(Accessor, editor);
			return foldingModelPromise.then(foldingModel => {
				if (foldingModel) {
					this.invoke(foldingController, foldingModel, editor, Args);
					const selection = editor.getSelection();
					if (selection) {
						foldingController.reveAl(selection.getStArtPosition());
					}
				}
			});
		}
	}

	protected getSelectedLines(editor: ICodeEditor) {
		let selections = editor.getSelections();
		return selections ? selections.mAp(s => s.stArtLineNumber) : [];
	}

	protected getLineNumbers(Args: FoldingArguments, editor: ICodeEditor) {
		if (Args && Args.selectionLines) {
			return Args.selectionLines.mAp(l => l + 1); // to 0-bAses line numbers
		}
		return this.getSelectedLines(editor);
	}

	public run(_Accessor: ServicesAccessor, _editor: ICodeEditor): void {
	}
}

interfAce FoldingArguments {
	levels?: number;
	direction?: 'up' | 'down';
	selectionLines?: number[];
}

function foldingArgumentsConstrAint(Args: Any) {
	if (!types.isUndefined(Args)) {
		if (!types.isObject(Args)) {
			return fAlse;
		}
		const foldingArgs: FoldingArguments = Args;
		if (!types.isUndefined(foldingArgs.levels) && !types.isNumber(foldingArgs.levels)) {
			return fAlse;
		}
		if (!types.isUndefined(foldingArgs.direction) && !types.isString(foldingArgs.direction)) {
			return fAlse;
		}
		if (!types.isUndefined(foldingArgs.selectionLines) && (!types.isArrAy(foldingArgs.selectionLines) || !foldingArgs.selectionLines.every(types.isNumber))) {
			return fAlse;
		}
	}
	return true;
}

clAss UnfoldAction extends FoldingAction<FoldingArguments> {

	constructor() {
		super({
			id: 'editor.unfold',
			lAbel: nls.locAlize('unfoldAction.lAbel', "Unfold"),
			AliAs: 'Unfold',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_CLOSE_SQUARE_BRACKET
				},
				weight: KeybindingWeight.EditorContrib
			},
			description: {
				description: 'Unfold the content in the editor',
				Args: [
					{
						nAme: 'Unfold editor Argument',
						description: `Property-vAlue pAirs thAt cAn be pAssed through this Argument:
						* 'levels': Number of levels to unfold. If not set, defAults to 1.
						* 'direction': If 'up', unfold given number of levels up otherwise unfolds down.
						* 'selectionLines': The stArt lines (0-bAsed) of the editor selections to Apply the unfold Action to. If not set, the Active selection(s) will be used.
						`,
						constrAint: foldingArgumentsConstrAint,
						schemA: {
							'type': 'object',
							'properties': {
								'levels': {
									'type': 'number',
									'defAult': 1
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
									'defAult': 'down'
								},
								'selectionLines': {
									'type': 'ArrAy',
									'items': {
										'type': 'number'
									}
								}
							}
						}
					}
				]
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor, Args: FoldingArguments): void {
		let levels = Args && Args.levels || 1;
		let lineNumbers = this.getLineNumbers(Args, editor);
		if (Args && Args.direction === 'up') {
			setCollApseStAteLevelsUp(foldingModel, fAlse, levels, lineNumbers);
		} else {
			setCollApseStAteLevelsDown(foldingModel, fAlse, levels, lineNumbers);
		}
	}
}

clAss UnFoldRecursivelyAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.unfoldRecursively',
			lAbel: nls.locAlize('unFoldRecursivelyAction.lAbel', "Unfold Recursively"),
			AliAs: 'Unfold Recursively',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_CLOSE_SQUARE_BRACKET),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor, _Args: Any): void {
		setCollApseStAteLevelsDown(foldingModel, fAlse, Number.MAX_VALUE, this.getSelectedLines(editor));
	}
}

clAss FoldAction extends FoldingAction<FoldingArguments> {

	constructor() {
		super({
			id: 'editor.fold',
			lAbel: nls.locAlize('foldAction.lAbel', "Fold"),
			AliAs: 'Fold',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_OPEN_SQUARE_BRACKET,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_OPEN_SQUARE_BRACKET
				},
				weight: KeybindingWeight.EditorContrib
			},
			description: {
				description: 'Fold the content in the editor',
				Args: [
					{
						nAme: 'Fold editor Argument',
						description: `Property-vAlue pAirs thAt cAn be pAssed through this Argument:
							* 'levels': Number of levels to fold.
							* 'direction': If 'up', folds given number of levels up otherwise folds down.
							* 'selectionLines': The stArt lines (0-bAsed) of the editor selections to Apply the fold Action to. If not set, the Active selection(s) will be used.
							If no levels or direction is set, folds the region At the locAtions or if AlreAdy collApsed, the first uncollApsed pArent insteAd.
						`,
						constrAint: foldingArgumentsConstrAint,
						schemA: {
							'type': 'object',
							'properties': {
								'levels': {
									'type': 'number',
								},
								'direction': {
									'type': 'string',
									'enum': ['up', 'down'],
								},
								'selectionLines': {
									'type': 'ArrAy',
									'items': {
										'type': 'number'
									}
								}
							}
						}
					}
				]
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor, Args: FoldingArguments): void {
		let lineNumbers = this.getLineNumbers(Args, editor);

		const levels = Args && Args.levels;
		const direction = Args && Args.direction;

		if (typeof levels !== 'number' && typeof direction !== 'string') {
			// fold the region At the locAtion or if AlreAdy collApsed, the first uncollApsed pArent insteAd.
			setCollApseStAteUp(foldingModel, true, lineNumbers);
		} else {
			if (direction === 'up') {
				setCollApseStAteLevelsUp(foldingModel, true, levels || 1, lineNumbers);
			} else {
				setCollApseStAteLevelsDown(foldingModel, true, levels || 1, lineNumbers);
			}
		}
	}
}


clAss ToggleFoldAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.toggleFold',
			lAbel: nls.locAlize('toggleFoldAction.lAbel', "Toggle Fold"),
			AliAs: 'Toggle Fold',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_L),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		let selectedLines = this.getSelectedLines(editor);
		toggleCollApseStAte(foldingModel, 1, selectedLines);
	}
}


clAss FoldRecursivelyAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.foldRecursively',
			lAbel: nls.locAlize('foldRecursivelyAction.lAbel', "Fold Recursively"),
			AliAs: 'Fold Recursively',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_OPEN_SQUARE_BRACKET),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		let selectedLines = this.getSelectedLines(editor);
		setCollApseStAteLevelsDown(foldingModel, true, Number.MAX_VALUE, selectedLines);
	}
}

clAss FoldAllBlockCommentsAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.foldAllBlockComments',
			lAbel: nls.locAlize('foldAllBlockComments.lAbel', "Fold All Block Comments"),
			AliAs: 'Fold All Block Comments',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_SLASH),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		if (foldingModel.regions.hAsTypes()) {
			setCollApseStAteForType(foldingModel, FoldingRAngeKind.Comment.vAlue, true);
		} else {
			const editorModel = editor.getModel();
			if (!editorModel) {
				return;
			}
			let comments = LAnguAgeConfigurAtionRegistry.getComments(editorModel.getLAnguAgeIdentifier().id);
			if (comments && comments.blockCommentStArtToken) {
				let regExp = new RegExp('^\\s*' + escApeRegExpChArActers(comments.blockCommentStArtToken));
				setCollApseStAteForMAtchingLines(foldingModel, regExp, true);
			}
		}
	}
}

clAss FoldAllRegionsAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.foldAllMArkerRegions',
			lAbel: nls.locAlize('foldAllMArkerRegions.lAbel', "Fold All Regions"),
			AliAs: 'Fold All Regions',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_8),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		if (foldingModel.regions.hAsTypes()) {
			setCollApseStAteForType(foldingModel, FoldingRAngeKind.Region.vAlue, true);
		} else {
			const editorModel = editor.getModel();
			if (!editorModel) {
				return;
			}
			let foldingRules = LAnguAgeConfigurAtionRegistry.getFoldingRules(editorModel.getLAnguAgeIdentifier().id);
			if (foldingRules && foldingRules.mArkers && foldingRules.mArkers.stArt) {
				let regExp = new RegExp(foldingRules.mArkers.stArt);
				setCollApseStAteForMAtchingLines(foldingModel, regExp, true);
			}
		}
	}
}

clAss UnfoldAllRegionsAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.unfoldAllMArkerRegions',
			lAbel: nls.locAlize('unfoldAllMArkerRegions.lAbel', "Unfold All Regions"),
			AliAs: 'Unfold All Regions',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_9),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		if (foldingModel.regions.hAsTypes()) {
			setCollApseStAteForType(foldingModel, FoldingRAngeKind.Region.vAlue, fAlse);
		} else {
			const editorModel = editor.getModel();
			if (!editorModel) {
				return;
			}
			let foldingRules = LAnguAgeConfigurAtionRegistry.getFoldingRules(editorModel.getLAnguAgeIdentifier().id);
			if (foldingRules && foldingRules.mArkers && foldingRules.mArkers.stArt) {
				let regExp = new RegExp(foldingRules.mArkers.stArt);
				setCollApseStAteForMAtchingLines(foldingModel, regExp, fAlse);
			}
		}
	}
}

clAss FoldAllAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.foldAll',
			lAbel: nls.locAlize('foldAllAction.lAbel', "Fold All"),
			AliAs: 'Fold All',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_0),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, _editor: ICodeEditor): void {
		setCollApseStAteLevelsDown(foldingModel, true);
	}
}

clAss UnfoldAllAction extends FoldingAction<void> {

	constructor() {
		super({
			id: 'editor.unfoldAll',
			lAbel: nls.locAlize('unfoldAllAction.lAbel', "Unfold All"),
			AliAs: 'Unfold All',
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_J),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, _editor: ICodeEditor): void {
		setCollApseStAteLevelsDown(foldingModel, fAlse);
	}
}

clAss FoldLevelAction extends FoldingAction<void> {
	privAte stAtic reAdonly ID_PREFIX = 'editor.foldLevel';
	public stAtic reAdonly ID = (level: number) => FoldLevelAction.ID_PREFIX + level;

	privAte getFoldingLevel() {
		return pArseInt(this.id.substr(FoldLevelAction.ID_PREFIX.length));
	}

	invoke(_foldingController: FoldingController, foldingModel: FoldingModel, editor: ICodeEditor): void {
		setCollApseStAteAtLevel(foldingModel, this.getFoldingLevel(), true, this.getSelectedLines(editor));
	}
}

registerEditorContribution(FoldingController.ID, FoldingController);
registerEditorAction(UnfoldAction);
registerEditorAction(UnFoldRecursivelyAction);
registerEditorAction(FoldAction);
registerEditorAction(FoldRecursivelyAction);
registerEditorAction(FoldAllAction);
registerEditorAction(UnfoldAllAction);
registerEditorAction(FoldAllBlockCommentsAction);
registerEditorAction(FoldAllRegionsAction);
registerEditorAction(UnfoldAllRegionsAction);
registerEditorAction(ToggleFoldAction);

for (let i = 1; i <= 7; i++) {
	registerInstAntiAtedEditorAction(
		new FoldLevelAction({
			id: FoldLevelAction.ID(i),
			lAbel: nls.locAlize('foldLevelAction.lAbel', "Fold Level {0}", i),
			AliAs: `Fold Level ${i}`,
			precondition: CONTEXT_FOLDING_ENABLED,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | (KeyCode.KEY_0 + i)),
				weight: KeybindingWeight.EditorContrib
			}
		})
	);
}

export const foldBAckgroundBAckground = registerColor('editor.foldBAckground', { light: trAnspArent(editorSelectionBAckground, 0.3), dArk: trAnspArent(editorSelectionBAckground, 0.3), hc: null }, nls.locAlize('foldBAckgroundBAckground', "BAckground color behind folded rAnges. The color must not be opAque so As not to hide underlying decorAtions."), true);
export const editorFoldForeground = registerColor('editorGutter.foldingControlForeground', { dArk: iconForeground, light: iconForeground, hc: iconForeground }, nls.locAlize('editorGutter.foldingControlForeground', 'Color of the folding control in the editor gutter.'));

registerThemingPArticipAnt((theme, collector) => {
	const foldBAckground = theme.getColor(foldBAckgroundBAckground);
	if (foldBAckground) {
		collector.AddRule(`.monAco-editor .folded-bAckground { bAckground-color: ${foldBAckground}; }`);
	}

	const editorFoldColor = theme.getColor(editorFoldForeground);
	if (editorFoldColor) {
		collector.AddRule(`
		.monAco-editor .cldr${foldingExpAndedIcon.cssSelector},
		.monAco-editor .cldr${foldingCollApsedIcon.cssSelector} {
			color: ${editorFoldColor} !importAnt;
		}
		`);
	}
});
