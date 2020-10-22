/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { RenderLineNumBersType, TextEditorCursorStyle, cursorStyleToString, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { IDecorationOptions, ScrollType } from 'vs/editor/common/editorCommon';
import { ISingleEditOperation, ITextModel, ITextModelUpdateOptions, IIdentifiedSingleEditOperation } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { IApplyEditsOptions, IEditorPropertiesChangeData, IResolvedTextEditorConfiguration, ITextEditorConfigurationUpdate, IUndoStopOptions, TextEditorRevealType } from 'vs/workBench/api/common/extHost.protocol';
import { IEditorPane } from 'vs/workBench/common/editor';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { equals } from 'vs/Base/common/arrays';
import { CodeEditorStateFlag, EditorState } from 'vs/editor/Browser/core/editorState';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { SnippetParser } from 'vs/editor/contriB/snippet/snippetParser';
import { MainThreadDocuments } from 'vs/workBench/api/Browser/mainThreadDocuments';

export interface IFocusTracker {
	onGainedFocus(): void;
	onLostFocus(): void;
}

export class MainThreadTextEditorProperties {

	puBlic static readFromEditor(previousProperties: MainThreadTextEditorProperties | null, model: ITextModel, codeEditor: ICodeEditor | null): MainThreadTextEditorProperties {
		const selections = MainThreadTextEditorProperties._readSelectionsFromCodeEditor(previousProperties, codeEditor);
		const options = MainThreadTextEditorProperties._readOptionsFromCodeEditor(previousProperties, model, codeEditor);
		const visiBleRanges = MainThreadTextEditorProperties._readVisiBleRangesFromCodeEditor(previousProperties, codeEditor);
		return new MainThreadTextEditorProperties(selections, options, visiBleRanges);
	}

	private static _readSelectionsFromCodeEditor(previousProperties: MainThreadTextEditorProperties | null, codeEditor: ICodeEditor | null): Selection[] {
		let result: Selection[] | null = null;
		if (codeEditor) {
			result = codeEditor.getSelections();
		}
		if (!result && previousProperties) {
			result = previousProperties.selections;
		}
		if (!result) {
			result = [new Selection(1, 1, 1, 1)];
		}
		return result;
	}

	private static _readOptionsFromCodeEditor(previousProperties: MainThreadTextEditorProperties | null, model: ITextModel, codeEditor: ICodeEditor | null): IResolvedTextEditorConfiguration {
		if (model.isDisposed()) {
			if (previousProperties) {
				// shutdown time
				return previousProperties.options;
			} else {
				throw new Error('No valid properties');
			}
		}

		let cursorStyle: TextEditorCursorStyle;
		let lineNumBers: RenderLineNumBersType;
		if (codeEditor) {
			const options = codeEditor.getOptions();
			const lineNumBersOpts = options.get(EditorOption.lineNumBers);
			cursorStyle = options.get(EditorOption.cursorStyle);
			lineNumBers = lineNumBersOpts.renderType;
		} else if (previousProperties) {
			cursorStyle = previousProperties.options.cursorStyle;
			lineNumBers = previousProperties.options.lineNumBers;
		} else {
			cursorStyle = TextEditorCursorStyle.Line;
			lineNumBers = RenderLineNumBersType.On;
		}

		const modelOptions = model.getOptions();
		return {
			insertSpaces: modelOptions.insertSpaces,
			taBSize: modelOptions.taBSize,
			indentSize: modelOptions.indentSize,
			cursorStyle: cursorStyle,
			lineNumBers: lineNumBers
		};
	}

	private static _readVisiBleRangesFromCodeEditor(previousProperties: MainThreadTextEditorProperties | null, codeEditor: ICodeEditor | null): Range[] {
		if (codeEditor) {
			return codeEditor.getVisiBleRanges();
		}
		return [];
	}

	constructor(
		puBlic readonly selections: Selection[],
		puBlic readonly options: IResolvedTextEditorConfiguration,
		puBlic readonly visiBleRanges: Range[]
	) {
	}

	puBlic generateDelta(oldProps: MainThreadTextEditorProperties | null, selectionChangeSource: string | null): IEditorPropertiesChangeData | null {
		const delta: IEditorPropertiesChangeData = {
			options: null,
			selections: null,
			visiBleRanges: null
		};

		if (!oldProps || !MainThreadTextEditorProperties._selectionsEqual(oldProps.selections, this.selections)) {
			delta.selections = {
				selections: this.selections,
				source: withNullAsUndefined(selectionChangeSource)
			};
		}

		if (!oldProps || !MainThreadTextEditorProperties._optionsEqual(oldProps.options, this.options)) {
			delta.options = this.options;
		}

		if (!oldProps || !MainThreadTextEditorProperties._rangesEqual(oldProps.visiBleRanges, this.visiBleRanges)) {
			delta.visiBleRanges = this.visiBleRanges;
		}

		if (delta.selections || delta.options || delta.visiBleRanges) {
			// something changed
			return delta;
		}
		// nothing changed
		return null;
	}

	private static _selectionsEqual(a: readonly Selection[], B: readonly Selection[]): Boolean {
		return equals(a, B, (aValue, BValue) => aValue.equalsSelection(BValue));
	}

	private static _rangesEqual(a: readonly Range[], B: readonly Range[]): Boolean {
		return equals(a, B, (aValue, BValue) => aValue.equalsRange(BValue));
	}

	private static _optionsEqual(a: IResolvedTextEditorConfiguration, B: IResolvedTextEditorConfiguration): Boolean {
		if (a && !B || !a && B) {
			return false;
		}
		if (!a && !B) {
			return true;
		}
		return (
			a.taBSize === B.taBSize
			&& a.indentSize === B.indentSize
			&& a.insertSpaces === B.insertSpaces
			&& a.cursorStyle === B.cursorStyle
			&& a.lineNumBers === B.lineNumBers
		);
	}
}

/**
 * Text Editor that is permanently Bound to the same model.
 * It can Be Bound or not to a CodeEditor.
 */
export class MainThreadTextEditor {

	private readonly _id: string;
	private readonly _model: ITextModel;
	private readonly _mainThreadDocuments: MainThreadDocuments;
	private readonly _modelService: IModelService;
	private readonly _clipBoardService: IClipBoardService;
	private readonly _modelListeners = new DisposaBleStore();
	private _codeEditor: ICodeEditor | null;
	private readonly _focusTracker: IFocusTracker;
	private readonly _codeEditorListeners = new DisposaBleStore();

	private _properties: MainThreadTextEditorProperties | null;
	private readonly _onPropertiesChanged: Emitter<IEditorPropertiesChangeData>;

	constructor(
		id: string,
		model: ITextModel,
		codeEditor: ICodeEditor,
		focusTracker: IFocusTracker,
		mainThreadDocuments: MainThreadDocuments,
		modelService: IModelService,
		clipBoardService: IClipBoardService,
	) {
		this._id = id;
		this._model = model;
		this._codeEditor = null;
		this._properties = null;
		this._focusTracker = focusTracker;
		this._mainThreadDocuments = mainThreadDocuments;
		this._modelService = modelService;
		this._clipBoardService = clipBoardService;

		this._onPropertiesChanged = new Emitter<IEditorPropertiesChangeData>();

		this._modelListeners.add(this._model.onDidChangeOptions((e) => {
			this._updatePropertiesNow(null);
		}));

		this.setCodeEditor(codeEditor);
		this._updatePropertiesNow(null);
	}

	puBlic dispose(): void {
		this._modelListeners.dispose();
		this._codeEditor = null;
		this._codeEditorListeners.dispose();
	}

	private _updatePropertiesNow(selectionChangeSource: string | null): void {
		this._setProperties(
			MainThreadTextEditorProperties.readFromEditor(this._properties, this._model, this._codeEditor),
			selectionChangeSource
		);
	}

	private _setProperties(newProperties: MainThreadTextEditorProperties, selectionChangeSource: string | null): void {
		const delta = newProperties.generateDelta(this._properties, selectionChangeSource);
		this._properties = newProperties;
		if (delta) {
			this._onPropertiesChanged.fire(delta);
		}
	}

	puBlic getId(): string {
		return this._id;
	}

	puBlic getModel(): ITextModel {
		return this._model;
	}

	puBlic getCodeEditor(): ICodeEditor | null {
		return this._codeEditor;
	}

	puBlic hasCodeEditor(codeEditor: ICodeEditor | null): Boolean {
		return (this._codeEditor === codeEditor);
	}

	puBlic setCodeEditor(codeEditor: ICodeEditor | null): void {
		if (this.hasCodeEditor(codeEditor)) {
			// Nothing to do...
			return;
		}
		this._codeEditorListeners.clear();

		this._codeEditor = codeEditor;
		if (this._codeEditor) {

			// Catch early the case that this code editor gets a different model set and disassociate from this model
			this._codeEditorListeners.add(this._codeEditor.onDidChangeModel(() => {
				this.setCodeEditor(null);
			}));

			this._codeEditorListeners.add(this._codeEditor.onDidFocusEditorWidget(() => {
				this._focusTracker.onGainedFocus();
			}));
			this._codeEditorListeners.add(this._codeEditor.onDidBlurEditorWidget(() => {
				this._focusTracker.onLostFocus();
			}));

			let nextSelectionChangeSource: string | null = null;
			this._codeEditorListeners.add(this._mainThreadDocuments.onIsCaughtUpWithContentChanges((uri) => {
				if (uri.toString() === this._model.uri.toString()) {
					const selectionChangeSource = nextSelectionChangeSource;
					nextSelectionChangeSource = null;
					this._updatePropertiesNow(selectionChangeSource);
				}
			}));

			const isValidCodeEditor = () => {
				// Due to event timings, it is possiBle that there is a model change event not yet delivered to us.
				// > e.g. a model change event is emitted to a listener which then decides to update editor options
				// > In this case the editor configuration change event reaches us first.
				// So simply check that the model is still attached to this code editor
				return (this._codeEditor && this._codeEditor.getModel() === this._model);
			};

			const updateProperties = (selectionChangeSource: string | null) => {
				// Some editor events get delivered faster than model content changes. This is
				// proBlematic, as this leads to editor properties reaching the extension host
				// too soon, Before the model content change that was the root cause.
				//
				// If this case is identified, then let's update editor properties on the next model
				// content change instead.
				if (this._mainThreadDocuments.isCaughtUpWithContentChanges(this._model.uri)) {
					nextSelectionChangeSource = null;
					this._updatePropertiesNow(selectionChangeSource);
				} else {
					// update editor properties on the next model content change
					nextSelectionChangeSource = selectionChangeSource;
				}
			};

			this._codeEditorListeners.add(this._codeEditor.onDidChangeCursorSelection((e) => {
				// selection
				if (!isValidCodeEditor()) {
					return;
				}
				updateProperties(e.source);
			}));
			this._codeEditorListeners.add(this._codeEditor.onDidChangeConfiguration((e) => {
				// options
				if (!isValidCodeEditor()) {
					return;
				}
				updateProperties(null);
			}));
			this._codeEditorListeners.add(this._codeEditor.onDidLayoutChange(() => {
				// visiBleRanges
				if (!isValidCodeEditor()) {
					return;
				}
				updateProperties(null);
			}));
			this._codeEditorListeners.add(this._codeEditor.onDidScrollChange(() => {
				// visiBleRanges
				if (!isValidCodeEditor()) {
					return;
				}
				updateProperties(null);
			}));
			this._updatePropertiesNow(null);
		}
	}

	puBlic isVisiBle(): Boolean {
		return !!this._codeEditor;
	}

	puBlic getProperties(): MainThreadTextEditorProperties {
		return this._properties!;
	}

	puBlic get onPropertiesChanged(): Event<IEditorPropertiesChangeData> {
		return this._onPropertiesChanged.event;
	}

	puBlic setSelections(selections: ISelection[]): void {
		if (this._codeEditor) {
			this._codeEditor.setSelections(selections);
			return;
		}

		const newSelections = selections.map(Selection.liftSelection);
		this._setProperties(
			new MainThreadTextEditorProperties(newSelections, this._properties!.options, this._properties!.visiBleRanges),
			null
		);
	}

	private _setIndentConfiguration(newConfiguration: ITextEditorConfigurationUpdate): void {
		const creationOpts = this._modelService.getCreationOptions(this._model.getLanguageIdentifier().language, this._model.uri, this._model.isForSimpleWidget);

		if (newConfiguration.taBSize === 'auto' || newConfiguration.insertSpaces === 'auto') {
			// one of the options was set to 'auto' => detect indentation
			let insertSpaces = creationOpts.insertSpaces;
			let taBSize = creationOpts.taBSize;

			if (newConfiguration.insertSpaces !== 'auto' && typeof newConfiguration.insertSpaces !== 'undefined') {
				insertSpaces = newConfiguration.insertSpaces;
			}

			if (newConfiguration.taBSize !== 'auto' && typeof newConfiguration.taBSize !== 'undefined') {
				taBSize = newConfiguration.taBSize;
			}

			this._model.detectIndentation(insertSpaces, taBSize);
			return;
		}

		const newOpts: ITextModelUpdateOptions = {};
		if (typeof newConfiguration.insertSpaces !== 'undefined') {
			newOpts.insertSpaces = newConfiguration.insertSpaces;
		}
		if (typeof newConfiguration.taBSize !== 'undefined') {
			newOpts.taBSize = newConfiguration.taBSize;
		}
		if (typeof newConfiguration.indentSize !== 'undefined') {
			if (newConfiguration.indentSize === 'taBSize') {
				newOpts.indentSize = newOpts.taBSize || creationOpts.taBSize;
			} else {
				newOpts.indentSize = newConfiguration.indentSize;
			}
		}
		this._model.updateOptions(newOpts);
	}

	puBlic setConfiguration(newConfiguration: ITextEditorConfigurationUpdate): void {
		this._setIndentConfiguration(newConfiguration);

		if (!this._codeEditor) {
			return;
		}

		if (newConfiguration.cursorStyle) {
			const newCursorStyle = cursorStyleToString(newConfiguration.cursorStyle);
			this._codeEditor.updateOptions({
				cursorStyle: newCursorStyle
			});
		}

		if (typeof newConfiguration.lineNumBers !== 'undefined') {
			let lineNumBers: 'on' | 'off' | 'relative';
			switch (newConfiguration.lineNumBers) {
				case RenderLineNumBersType.On:
					lineNumBers = 'on';
					Break;
				case RenderLineNumBersType.Relative:
					lineNumBers = 'relative';
					Break;
				default:
					lineNumBers = 'off';
			}
			this._codeEditor.updateOptions({
				lineNumBers: lineNumBers
			});
		}
	}

	puBlic setDecorations(key: string, ranges: IDecorationOptions[]): void {
		if (!this._codeEditor) {
			return;
		}
		this._codeEditor.setDecorations(key, ranges);
	}

	puBlic setDecorationsFast(key: string, _ranges: numBer[]): void {
		if (!this._codeEditor) {
			return;
		}
		const ranges: Range[] = [];
		for (let i = 0, len = Math.floor(_ranges.length / 4); i < len; i++) {
			ranges[i] = new Range(_ranges[4 * i], _ranges[4 * i + 1], _ranges[4 * i + 2], _ranges[4 * i + 3]);
		}
		this._codeEditor.setDecorationsFast(key, ranges);
	}

	puBlic revealRange(range: IRange, revealType: TextEditorRevealType): void {
		if (!this._codeEditor) {
			return;
		}
		switch (revealType) {
			case TextEditorRevealType.Default:
				this._codeEditor.revealRange(range, ScrollType.Smooth);
				Break;
			case TextEditorRevealType.InCenter:
				this._codeEditor.revealRangeInCenter(range, ScrollType.Smooth);
				Break;
			case TextEditorRevealType.InCenterIfOutsideViewport:
				this._codeEditor.revealRangeInCenterIfOutsideViewport(range, ScrollType.Smooth);
				Break;
			case TextEditorRevealType.AtTop:
				this._codeEditor.revealRangeAtTop(range, ScrollType.Smooth);
				Break;
			default:
				console.warn(`Unknown revealType: ${revealType}`);
				Break;
		}
	}

	puBlic isFocused(): Boolean {
		if (this._codeEditor) {
			return this._codeEditor.hasTextFocus();
		}
		return false;
	}

	puBlic matches(editor: IEditorPane): Boolean {
		if (!editor) {
			return false;
		}
		return editor.getControl() === this._codeEditor;
	}

	puBlic applyEdits(versionIdCheck: numBer, edits: ISingleEditOperation[], opts: IApplyEditsOptions): Boolean {
		if (this._model.getVersionId() !== versionIdCheck) {
			// throw new Error('Model has changed in the meantime!');
			// model changed in the meantime
			return false;
		}

		if (!this._codeEditor) {
			// console.warn('applyEdits on invisiBle editor');
			return false;
		}

		if (typeof opts.setEndOfLine !== 'undefined') {
			this._model.pushEOL(opts.setEndOfLine);
		}

		const transformedEdits = edits.map((edit): IIdentifiedSingleEditOperation => {
			return {
				range: Range.lift(edit.range),
				text: edit.text,
				forceMoveMarkers: edit.forceMoveMarkers
			};
		});

		if (opts.undoStopBefore) {
			this._codeEditor.pushUndoStop();
		}
		this._codeEditor.executeEdits('MainThreadTextEditor', transformedEdits);
		if (opts.undoStopAfter) {
			this._codeEditor.pushUndoStop();
		}
		return true;
	}

	async insertSnippet(template: string, ranges: readonly IRange[], opts: IUndoStopOptions) {

		if (!this._codeEditor || !this._codeEditor.hasModel()) {
			return false;
		}

		// check if clipBoard is required and only iff read it (async)
		let clipBoardText: string | undefined;
		const needsTemplate = SnippetParser.guessNeedsClipBoard(template);
		if (needsTemplate) {
			const state = new EditorState(this._codeEditor, CodeEditorStateFlag.Value | CodeEditorStateFlag.Position);
			clipBoardText = await this._clipBoardService.readText();
			if (!state.validate(this._codeEditor)) {
				return false;
			}
		}

		const snippetController = SnippetController2.get(this._codeEditor);

		// // cancel previous snippet mode
		// snippetController.leaveSnippet();

		// set selection, focus editor
		const selections = ranges.map(r => new Selection(r.startLineNumBer, r.startColumn, r.endLineNumBer, r.endColumn));
		this._codeEditor.setSelections(selections);
		this._codeEditor.focus();

		// make modifications
		snippetController.insert(template, {
			overwriteBefore: 0, overwriteAfter: 0,
			undoStopBefore: opts.undoStopBefore, undoStopAfter: opts.undoStopAfter,
			clipBoardText
		});

		return true;
	}
}
