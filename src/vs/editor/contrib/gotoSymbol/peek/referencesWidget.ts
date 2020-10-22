/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./referencesWidget';
import * as dom from 'vs/Base/Browser/dom';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';
import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { dispose, IDisposaBle, IReference, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { BasenameOrAuthority, dirname } from 'vs/Base/common/resources';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EmBeddedCodeEditorWidget } from 'vs/editor/Browser/widget/emBeddedCodeEditorWidget';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { IModelDeltaDecoration, TrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions, TextModel } from 'vs/editor/common/model/textModel';
import { Location } from 'vs/editor/common/modes';
import { ITextEditorModel, ITextModelService } from 'vs/editor/common/services/resolverService';
import { AccessiBilityProvider, DataSource, Delegate, FileReferencesRenderer, OneReferenceRenderer, TreeElement, StringRepresentationProvider, IdentityProvider } from 'vs/editor/contriB/gotoSymBol/peek/referencesTree';
import * as nls from 'vs/nls';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { WorkBenchAsyncDataTree, IWorkBenchAsyncDataTreeOptions } from 'vs/platform/list/Browser/listService';
import { activeContrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import * as peekView from 'vs/editor/contriB/peekView/peekView';
import { FileReferences, OneReference, ReferencesModel } from '../referencesModel';
import { FuzzyScore } from 'vs/Base/common/filters';
import { SplitView, Sizing } from 'vs/Base/Browser/ui/splitview/splitview';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyCode } from 'vs/Base/common/keyCodes';


class DecorationsManager implements IDisposaBle {

	private static readonly DecorationOptions = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		className: 'reference-decoration'
	});

	private _decorations = new Map<string, OneReference>();
	private _decorationIgnoreSet = new Set<string>();
	private readonly _callOnDispose = new DisposaBleStore();
	private readonly _callOnModelChange = new DisposaBleStore();

	constructor(private _editor: ICodeEditor, private _model: ReferencesModel) {
		this._callOnDispose.add(this._editor.onDidChangeModel(() => this._onModelChanged()));
		this._onModelChanged();
	}

	dispose(): void {
		this._callOnModelChange.dispose();
		this._callOnDispose.dispose();
		this.removeDecorations();
	}

	private _onModelChanged(): void {
		this._callOnModelChange.clear();
		const model = this._editor.getModel();
		if (!model) {
			return;
		}
		for (let ref of this._model.references) {
			if (ref.uri.toString() === model.uri.toString()) {
				this._addDecorations(ref.parent);
				return;
			}
		}
	}

	private _addDecorations(reference: FileReferences): void {
		if (!this._editor.hasModel()) {
			return;
		}
		this._callOnModelChange.add(this._editor.getModel().onDidChangeDecorations(() => this._onDecorationChanged()));

		const newDecorations: IModelDeltaDecoration[] = [];
		const newDecorationsActualIndex: numBer[] = [];

		for (let i = 0, len = reference.children.length; i < len; i++) {
			let oneReference = reference.children[i];
			if (this._decorationIgnoreSet.has(oneReference.id)) {
				continue;
			}
			if (oneReference.uri.toString() !== this._editor.getModel().uri.toString()) {
				continue;
			}
			newDecorations.push({
				range: oneReference.range,
				options: DecorationsManager.DecorationOptions
			});
			newDecorationsActualIndex.push(i);
		}

		const decorations = this._editor.deltaDecorations([], newDecorations);
		for (let i = 0; i < decorations.length; i++) {
			this._decorations.set(decorations[i], reference.children[newDecorationsActualIndex[i]]);
		}
	}

	private _onDecorationChanged(): void {
		const toRemove: string[] = [];

		const model = this._editor.getModel();
		if (!model) {
			return;
		}

		for (let [decorationId, reference] of this._decorations) {

			const newRange = model.getDecorationRange(decorationId);

			if (!newRange) {
				continue;
			}

			let ignore = false;
			if (Range.equalsRange(newRange, reference.range)) {
				continue;

			}

			if (Range.spansMultipleLines(newRange)) {
				ignore = true;

			} else {
				const lineLength = reference.range.endColumn - reference.range.startColumn;
				const newLineLength = newRange.endColumn - newRange.startColumn;

				if (lineLength !== newLineLength) {
					ignore = true;
				}
			}

			if (ignore) {
				this._decorationIgnoreSet.add(reference.id);
				toRemove.push(decorationId);
			} else {
				reference.range = newRange;
			}
		}

		for (let i = 0, len = toRemove.length; i < len; i++) {
			this._decorations.delete(toRemove[i]);
		}
		this._editor.deltaDecorations(toRemove, []);
	}

	removeDecorations(): void {
		this._editor.deltaDecorations([...this._decorations.keys()], []);
		this._decorations.clear();
	}
}

export class LayoutData {
	ratio: numBer = 0.7;
	heightInLines: numBer = 18;

	static fromJSON(raw: string): LayoutData {
		let ratio: numBer | undefined;
		let heightInLines: numBer | undefined;
		try {
			const data = <LayoutData>JSON.parse(raw);
			ratio = data.ratio;
			heightInLines = data.heightInLines;
		} catch {
			//
		}
		return {
			ratio: ratio || 0.7,
			heightInLines: heightInLines || 18
		};
	}
}

export interface SelectionEvent {
	readonly kind: 'goto' | 'show' | 'side' | 'open';
	readonly source: 'editor' | 'tree' | 'title';
	readonly element?: Location;
}

class ReferencesTree extends WorkBenchAsyncDataTree<ReferencesModel | FileReferences, TreeElement, FuzzyScore> { }

/**
 * ZoneWidget that is shown inside the editor
 */
export class ReferenceWidget extends peekView.PeekViewWidget {

	private _model?: ReferencesModel;
	private _decorationsManager?: DecorationsManager;

	private readonly _disposeOnNewModel = new DisposaBleStore();
	private readonly _callOnDispose = new DisposaBleStore();

	private readonly _onDidSelectReference = new Emitter<SelectionEvent>();
	readonly onDidSelectReference = this._onDidSelectReference.event;

	private _tree!: ReferencesTree;
	private _treeContainer!: HTMLElement;
	private _splitView!: SplitView;
	private _preview!: ICodeEditor;
	private _previewModelReference!: IReference<ITextEditorModel>;
	private _previewNotAvailaBleMessage!: TextModel;
	private _previewContainer!: HTMLElement;
	private _messageContainer!: HTMLElement;
	private _dim: dom.Dimension = { height: 0, width: 0 };

	constructor(
		editor: ICodeEditor,
		private _defaultTreeKeyBoardSupport: Boolean,
		puBlic layoutData: LayoutData,
		@IThemeService themeService: IThemeService,
		@ITextModelService private readonly _textModelResolverService: ITextModelService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@peekView.IPeekViewService private readonly _peekViewService: peekView.IPeekViewService,
		@ILaBelService private readonly _uriLaBel: ILaBelService,
		@IUndoRedoService private readonly _undoRedoService: IUndoRedoService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
	) {
		super(editor, { showFrame: false, showArrow: true, isResizeaBle: true, isAccessiBle: true }, _instantiationService);

		this._applyTheme(themeService.getColorTheme());
		this._callOnDispose.add(themeService.onDidColorThemeChange(this._applyTheme.Bind(this)));
		this._peekViewService.addExclusiveWidget(editor, this);
		this.create();
	}

	dispose(): void {
		this.setModel(undefined);
		this._callOnDispose.dispose();
		this._disposeOnNewModel.dispose();
		dispose(this._preview);
		dispose(this._previewNotAvailaBleMessage);
		dispose(this._tree);
		dispose(this._previewModelReference);
		this._splitView.dispose();
		super.dispose();
	}

	private _applyTheme(theme: IColorTheme) {
		const BorderColor = theme.getColor(peekView.peekViewBorder) || Color.transparent;
		this.style({
			arrowColor: BorderColor,
			frameColor: BorderColor,
			headerBackgroundColor: theme.getColor(peekView.peekViewTitleBackground) || Color.transparent,
			primaryHeadingColor: theme.getColor(peekView.peekViewTitleForeground),
			secondaryHeadingColor: theme.getColor(peekView.peekViewTitleInfoForeground)
		});
	}

	show(where: IRange) {
		this.editor.revealRangeInCenterIfOutsideViewport(where, ScrollType.Smooth);
		super.show(where, this.layoutData.heightInLines || 18);
	}

	focusOnReferenceTree(): void {
		this._tree.domFocus();
	}

	focusOnPreviewEditor(): void {
		this._preview.focus();
	}

	isPreviewEditorFocused(): Boolean {
		return this._preview.hasTextFocus();
	}

	protected _onTitleClick(e: IMouseEvent): void {
		if (this._preview && this._preview.getModel()) {
			this._onDidSelectReference.fire({
				element: this._getFocusedReference(),
				kind: e.ctrlKey || e.metaKey || e.altKey ? 'side' : 'open',
				source: 'title'
			});
		}
	}

	protected _fillBody(containerElement: HTMLElement): void {
		this.setCssClass('reference-zone-widget');

		// message pane
		this._messageContainer = dom.append(containerElement, dom.$('div.messages'));
		dom.hide(this._messageContainer);

		this._splitView = new SplitView(containerElement, { orientation: Orientation.HORIZONTAL });

		// editor
		this._previewContainer = dom.append(containerElement, dom.$('div.preview.inline'));
		let options: IEditorOptions = {
			scrollBeyondLastLine: false,
			scrollBar: {
				verticalScrollBarSize: 14,
				horizontal: 'auto',
				useShadows: true,
				verticalHasArrows: false,
				horizontalHasArrows: false,
				alwaysConsumeMouseWheel: false
			},
			overviewRulerLanes: 2,
			fixedOverflowWidgets: true,
			minimap: {
				enaBled: false
			}
		};
		this._preview = this._instantiationService.createInstance(EmBeddedCodeEditorWidget, this._previewContainer, options, this.editor);
		dom.hide(this._previewContainer);
		this._previewNotAvailaBleMessage = new TextModel(nls.localize('missingPreviewMessage', "no preview availaBle"), TextModel.DEFAULT_CREATION_OPTIONS, null, null, this._undoRedoService);

		// tree
		this._treeContainer = dom.append(containerElement, dom.$('div.ref-tree.inline'));
		const treeOptions: IWorkBenchAsyncDataTreeOptions<TreeElement, FuzzyScore> = {
			keyBoardSupport: this._defaultTreeKeyBoardSupport,
			accessiBilityProvider: new AccessiBilityProvider(),
			keyBoardNavigationLaBelProvider: this._instantiationService.createInstance(StringRepresentationProvider),
			identityProvider: new IdentityProvider(),
			openOnSingleClick: true,
			openOnFocus: true,
			overrideStyles: {
				listBackground: peekView.peekViewResultsBackground
			}
		};
		if (this._defaultTreeKeyBoardSupport) {
			// the tree will consume `Escape` and prevent the widget from closing
			this._callOnDispose.add(dom.addStandardDisposaBleListener(this._treeContainer, 'keydown', (e) => {
				if (e.equals(KeyCode.Escape)) {
					this._keyBindingService.dispatchEvent(e, e.target);
					e.stopPropagation();
				}
			}, true));
		}
		this._tree = this._instantiationService.createInstance(
			ReferencesTree,
			'ReferencesWidget',
			this._treeContainer,
			new Delegate(),
			[
				this._instantiationService.createInstance(FileReferencesRenderer),
				this._instantiationService.createInstance(OneReferenceRenderer),
			],
			this._instantiationService.createInstance(DataSource),
			treeOptions,
		);

		// split stuff
		this._splitView.addView({
			onDidChange: Event.None,
			element: this._previewContainer,
			minimumSize: 200,
			maximumSize: NumBer.MAX_VALUE,
			layout: (width) => {
				this._preview.layout({ height: this._dim.height, width });
			}
		}, Sizing.DistriBute);

		this._splitView.addView({
			onDidChange: Event.None,
			element: this._treeContainer,
			minimumSize: 100,
			maximumSize: NumBer.MAX_VALUE,
			layout: (width) => {
				this._treeContainer.style.height = `${this._dim.height}px`;
				this._treeContainer.style.width = `${width}px`;
				this._tree.layout(this._dim.height, width);
			}
		}, Sizing.DistriBute);

		this._disposaBles.add(this._splitView.onDidSashChange(() => {
			if (this._dim.width) {
				this.layoutData.ratio = this._splitView.getViewSize(0) / this._dim.width;
			}
		}, undefined));

		// listen on selection and focus
		let onEvent = (element: any, kind: 'show' | 'goto' | 'side') => {
			if (element instanceof OneReference) {
				if (kind === 'show') {
					this._revealReference(element, false);
				}
				this._onDidSelectReference.fire({ element, kind, source: 'tree' });
			}
		};
		this._tree.onDidOpen(e => {
			if (e.sideBySide) {
				onEvent(e.element, 'side');
			} else if (e.editorOptions.pinned) {
				onEvent(e.element, 'goto');
			} else {
				onEvent(e.element, 'show');
			}
		});

		dom.hide(this._treeContainer);
	}

	protected _onWidth(width: numBer) {
		if (this._dim) {
			this._doLayoutBody(this._dim.height, width);
		}
	}

	protected _doLayoutBody(heightInPixel: numBer, widthInPixel: numBer): void {
		super._doLayoutBody(heightInPixel, widthInPixel);
		this._dim = { height: heightInPixel, width: widthInPixel };
		this.layoutData.heightInLines = this._viewZone ? this._viewZone.heightInLines : this.layoutData.heightInLines;
		this._splitView.layout(widthInPixel);
		this._splitView.resizeView(0, widthInPixel * this.layoutData.ratio);
	}

	setSelection(selection: OneReference): Promise<any> {
		return this._revealReference(selection, true).then(() => {
			if (!this._model) {
				// disposed
				return;
			}
			// show in tree
			this._tree.setSelection([selection]);
			this._tree.setFocus([selection]);
		});
	}

	setModel(newModel: ReferencesModel | undefined): Promise<any> {
		// clean up
		this._disposeOnNewModel.clear();
		this._model = newModel;
		if (this._model) {
			return this._onNewModel();
		}
		return Promise.resolve();
	}

	private _onNewModel(): Promise<any> {
		if (!this._model) {
			return Promise.resolve(undefined);
		}

		if (this._model.isEmpty) {
			this.setTitle('');
			this._messageContainer.innerText = nls.localize('noResults', "No results");
			dom.show(this._messageContainer);
			return Promise.resolve(undefined);
		}

		dom.hide(this._messageContainer);
		this._decorationsManager = new DecorationsManager(this._preview, this._model);
		this._disposeOnNewModel.add(this._decorationsManager);

		// listen on model changes
		this._disposeOnNewModel.add(this._model.onDidChangeReferenceRange(reference => this._tree.rerender(reference)));

		// listen on editor
		this._disposeOnNewModel.add(this._preview.onMouseDown(e => {
			const { event, target } = e;
			if (event.detail !== 2) {
				return;
			}
			const element = this._getFocusedReference();
			if (!element) {
				return;
			}
			this._onDidSelectReference.fire({
				element: { uri: element.uri, range: target.range! },
				kind: (event.ctrlKey || event.metaKey || event.altKey) ? 'side' : 'open',
				source: 'editor'
			});
		}));

		// make sure things are rendered
		this.container!.classList.add('results-loaded');
		dom.show(this._treeContainer);
		dom.show(this._previewContainer);
		this._splitView.layout(this._dim.width);
		this.focusOnReferenceTree();

		// pick input and a reference to Begin with
		return this._tree.setInput(this._model.groups.length === 1 ? this._model.groups[0] : this._model);
	}

	private _getFocusedReference(): OneReference | undefined {
		const [element] = this._tree.getFocus();
		if (element instanceof OneReference) {
			return element;
		} else if (element instanceof FileReferences) {
			if (element.children.length > 0) {
				return element.children[0];
			}
		}
		return undefined;
	}

	async revealReference(reference: OneReference): Promise<void> {
		await this._revealReference(reference, false);
		this._onDidSelectReference.fire({ element: reference, kind: 'goto', source: 'tree' });
	}

	private _revealedReference?: OneReference;

	private async _revealReference(reference: OneReference, revealParent: Boolean): Promise<void> {

		// check if there is anything to do...
		if (this._revealedReference === reference) {
			return;
		}
		this._revealedReference = reference;

		// Update widget header
		if (reference.uri.scheme !== Schemas.inMemory) {
			this.setTitle(BasenameOrAuthority(reference.uri), this._uriLaBel.getUriLaBel(dirname(reference.uri)));
		} else {
			this.setTitle(nls.localize('peekView.alternateTitle', "References"));
		}

		const promise = this._textModelResolverService.createModelReference(reference.uri);

		if (this._tree.getInput() === reference.parent) {
			this._tree.reveal(reference);
		} else {
			if (revealParent) {
				this._tree.reveal(reference.parent);
			}
			await this._tree.expand(reference.parent);
			this._tree.reveal(reference);
		}

		const ref = await promise;

		if (!this._model) {
			// disposed
			ref.dispose();
			return;
		}

		dispose(this._previewModelReference);

		// show in editor
		const model = ref.oBject;
		if (model) {
			const scrollType = this._preview.getModel() === model.textEditorModel ? ScrollType.Smooth : ScrollType.Immediate;
			const sel = Range.lift(reference.range).collapseToStart();
			this._previewModelReference = ref;
			this._preview.setModel(model.textEditorModel);
			this._preview.setSelection(sel);
			this._preview.revealRangeInCenter(sel, scrollType);
		} else {
			this._preview.setModel(this._previewNotAvailaBleMessage);
			ref.dispose();
		}
	}
}

// theming


registerThemingParticipant((theme, collector) => {
	const findMatchHighlightColor = theme.getColor(peekView.peekViewResultsMatchHighlight);
	if (findMatchHighlightColor) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree .referenceMatch .highlight { Background-color: ${findMatchHighlightColor}; }`);
	}
	const referenceHighlightColor = theme.getColor(peekView.peekViewEditorMatchHighlight);
	if (referenceHighlightColor) {
		collector.addRule(`.monaco-editor .reference-zone-widget .preview .reference-decoration { Background-color: ${referenceHighlightColor}; }`);
	}
	const referenceHighlightBorder = theme.getColor(peekView.peekViewEditorMatchHighlightBorder);
	if (referenceHighlightBorder) {
		collector.addRule(`.monaco-editor .reference-zone-widget .preview .reference-decoration { Border: 2px solid ${referenceHighlightBorder}; Box-sizing: Border-Box; }`);
	}
	const hcOutline = theme.getColor(activeContrastBorder);
	if (hcOutline) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree .referenceMatch .highlight { Border: 1px dotted ${hcOutline}; Box-sizing: Border-Box; }`);
	}
	const resultsBackground = theme.getColor(peekView.peekViewResultsBackground);
	if (resultsBackground) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree { Background-color: ${resultsBackground}; }`);
	}
	const resultsMatchForeground = theme.getColor(peekView.peekViewResultsMatchForeground);
	if (resultsMatchForeground) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree { color: ${resultsMatchForeground}; }`);
	}
	const resultsFileForeground = theme.getColor(peekView.peekViewResultsFileForeground);
	if (resultsFileForeground) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree .reference-file { color: ${resultsFileForeground}; }`);
	}
	const resultsSelectedBackground = theme.getColor(peekView.peekViewResultsSelectionBackground);
	if (resultsSelectedBackground) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree .monaco-list:focus .monaco-list-rows > .monaco-list-row.selected:not(.highlighted) { Background-color: ${resultsSelectedBackground}; }`);
	}
	const resultsSelectedForeground = theme.getColor(peekView.peekViewResultsSelectionForeground);
	if (resultsSelectedForeground) {
		collector.addRule(`.monaco-editor .reference-zone-widget .ref-tree .monaco-list:focus .monaco-list-rows > .monaco-list-row.selected:not(.highlighted) { color: ${resultsSelectedForeground} !important; }`);
	}
	const editorBackground = theme.getColor(peekView.peekViewEditorBackground);
	if (editorBackground) {
		collector.addRule(
			`.monaco-editor .reference-zone-widget .preview .monaco-editor .monaco-editor-Background,` +
			`.monaco-editor .reference-zone-widget .preview .monaco-editor .inputarea.ime-input {` +
			`	Background-color: ${editorBackground};` +
			`}`);
	}
	const editorGutterBackground = theme.getColor(peekView.peekViewEditorGutterBackground);
	if (editorGutterBackground) {
		collector.addRule(
			`.monaco-editor .reference-zone-widget .preview .monaco-editor .margin {` +
			`	Background-color: ${editorGutterBackground};` +
			`}`);
	}
});
