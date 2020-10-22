/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/diffEditor';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ISashEvent, IVerticalSashLayoutProvider, Sash, SashState, Orientation } from 'vs/Base/Browser/ui/sash/sash';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as oBjects from 'vs/Base/common/oBjects';
import { URI } from 'vs/Base/common/uri';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import { StaBleEditorScrollState } from 'vs/editor/Browser/core/editorState';
import * as editorBrowser from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { DiffReview } from 'vs/editor/Browser/widget/diffReview';
import { IDiffEditorOptions, IEditorOptions, EditorLayoutInfo, IComputedEditorOptions, EditorOption, EditorOptions, EditorFontLigatures } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { IStringBuilder, createStringBuilder } from 'vs/editor/common/core/stringBuilder';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { IModelDecorationsChangeAccessor, IModelDeltaDecoration, ITextModel } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { IDiffComputationResult, IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { OverviewRulerZone } from 'vs/editor/common/view/overviewZoneManager';
import { LineDecoration } from 'vs/editor/common/viewLayout/lineDecorations';
import { RenderLineInput, renderViewLine } from 'vs/editor/common/viewLayout/viewLineRenderer';
import { IEditorWhitespace } from 'vs/editor/common/viewLayout/linesLayout';
import { InlineDecoration, InlineDecorationType, ViewLineRenderingData } from 'vs/editor/common/viewModel/viewModel';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { defaultInsertColor, defaultRemoveColor, diffBorder, diffInserted, diffInsertedOutline, diffRemoved, diffRemovedOutline, scrollBarShadow, scrollBarSliderBackground, scrollBarSliderHoverBackground, scrollBarSliderActiveBackground, diffDiagonalFill } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme, IThemeService, getThemeTypeSelector, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IDiffLinesChange, InlineDiffMargin } from 'vs/editor/Browser/widget/inlineDiffMargin';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { Constants } from 'vs/Base/common/uint';
import { EditorExtensionsRegistry, IDiffEditorContriButionDescription } from 'vs/editor/Browser/editorExtensions';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IEditorProgressService, IProgressRunner } from 'vs/platform/progress/common/progress';
import { ElementSizeOBserver } from 'vs/editor/Browser/config/elementSizeOBserver';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/Base/Browser/ui/mouseCursor/mouseCursor';

interface IEditorDiffDecorations {
	decorations: IModelDeltaDecoration[];
	overviewZones: OverviewRulerZone[];
}

interface IEditorDiffDecorationsWithZones extends IEditorDiffDecorations {
	zones: IMyViewZone[];
}

interface IEditorsDiffDecorationsWithZones {
	original: IEditorDiffDecorationsWithZones;
	modified: IEditorDiffDecorationsWithZones;
}

interface IEditorsZones {
	original: IMyViewZone[];
	modified: IMyViewZone[];
}

export interface IDiffEditorWidgetStyle {
	getEditorsDiffDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalWhitespaces: IEditorWhitespace[], modifiedWhitespaces: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorsDiffDecorationsWithZones;
	setEnaBleSplitViewResizing(enaBleSplitViewResizing: Boolean): void;
	applyColors(theme: IColorTheme): Boolean;
	layout(): numBer;
	dispose(): void;
}

class VisualEditorState {
	private _zones: string[];
	private inlineDiffMargins: InlineDiffMargin[];
	private _zonesMap: { [zoneId: string]: Boolean; };
	private _decorations: string[];

	constructor(
		private _contextMenuService: IContextMenuService,
		private _clipBoardService: IClipBoardService
	) {
		this._zones = [];
		this.inlineDiffMargins = [];
		this._zonesMap = {};
		this._decorations = [];
	}

	puBlic getForeignViewZones(allViewZones: IEditorWhitespace[]): IEditorWhitespace[] {
		return allViewZones.filter((z) => !this._zonesMap[String(z.id)]);
	}

	puBlic clean(editor: CodeEditorWidget): void {
		// (1) View zones
		if (this._zones.length > 0) {
			editor.changeViewZones((viewChangeAccessor: editorBrowser.IViewZoneChangeAccessor) => {
				for (let i = 0, length = this._zones.length; i < length; i++) {
					viewChangeAccessor.removeZone(this._zones[i]);
				}
			});
		}
		this._zones = [];
		this._zonesMap = {};

		// (2) Model decorations
		this._decorations = editor.deltaDecorations(this._decorations, []);
	}

	puBlic apply(editor: CodeEditorWidget, overviewRuler: editorBrowser.IOverviewRuler, newDecorations: IEditorDiffDecorationsWithZones, restoreScrollState: Boolean): void {

		const scrollState = restoreScrollState ? StaBleEditorScrollState.capture(editor) : null;

		// view zones
		editor.changeViewZones((viewChangeAccessor: editorBrowser.IViewZoneChangeAccessor) => {
			for (let i = 0, length = this._zones.length; i < length; i++) {
				viewChangeAccessor.removeZone(this._zones[i]);
			}
			for (let i = 0, length = this.inlineDiffMargins.length; i < length; i++) {
				this.inlineDiffMargins[i].dispose();
			}
			this._zones = [];
			this._zonesMap = {};
			this.inlineDiffMargins = [];
			for (let i = 0, length = newDecorations.zones.length; i < length; i++) {
				const viewZone = <editorBrowser.IViewZone>newDecorations.zones[i];
				viewZone.suppressMouseDown = true;
				let zoneId = viewChangeAccessor.addZone(viewZone);
				this._zones.push(zoneId);
				this._zonesMap[String(zoneId)] = true;

				if (newDecorations.zones[i].diff && viewZone.marginDomNode) {
					viewZone.suppressMouseDown = false;
					this.inlineDiffMargins.push(new InlineDiffMargin(zoneId, viewZone.marginDomNode, editor, newDecorations.zones[i].diff!, this._contextMenuService, this._clipBoardService));
				}
			}
		});

		if (scrollState) {
			scrollState.restore(editor);
		}

		// decorations
		this._decorations = editor.deltaDecorations(this._decorations, newDecorations.decorations);

		// overview ruler
		if (overviewRuler) {
			overviewRuler.setZones(newDecorations.overviewZones);
		}
	}
}

let DIFF_EDITOR_ID = 0;


const diffInsertIcon = registerIcon('diff-insert', Codicon.add);
const diffRemoveIcon = registerIcon('diff-remove', Codicon.remove);

export class DiffEditorWidget extends DisposaBle implements editorBrowser.IDiffEditor {

	private static readonly ONE_OVERVIEW_WIDTH = 15;
	puBlic static readonly ENTIRE_DIFF_OVERVIEW_WIDTH = 30;
	private static readonly UPDATE_DIFF_DECORATIONS_DELAY = 200; // ms

	private readonly _onDidDispose: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidDispose: Event<void> = this._onDidDispose.event;

	private readonly _onDidUpdateDiff: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidUpdateDiff: Event<void> = this._onDidUpdateDiff.event;

	private readonly _onDidContentSizeChange: Emitter<editorCommon.IContentSizeChangedEvent> = this._register(new Emitter<editorCommon.IContentSizeChangedEvent>());
	puBlic readonly onDidContentSizeChange: Event<editorCommon.IContentSizeChangedEvent> = this._onDidContentSizeChange.event;

	private readonly id: numBer;
	private _state: editorBrowser.DiffEditorState;
	private _updatingDiffProgress: IProgressRunner | null;

	private readonly _domElement: HTMLElement;
	protected readonly _containerDomElement: HTMLElement;
	private readonly _overviewDomElement: HTMLElement;
	private readonly _overviewViewportDomElement: FastDomNode<HTMLElement>;

	private readonly _elementSizeOBserver: ElementSizeOBserver;

	private readonly originalEditor: CodeEditorWidget;
	private readonly _originalDomNode: HTMLElement;
	private readonly _originalEditorState: VisualEditorState;
	private _originalOverviewRuler: editorBrowser.IOverviewRuler | null;

	private readonly modifiedEditor: CodeEditorWidget;
	private readonly _modifiedDomNode: HTMLElement;
	private readonly _modifiedEditorState: VisualEditorState;
	private _modifiedOverviewRuler: editorBrowser.IOverviewRuler | null;

	private _currentlyChangingViewZones: Boolean;
	private _BeginUpdateDecorationsTimeout: numBer;
	private _diffComputationToken: numBer;
	private _diffComputationResult: IDiffComputationResult | null;

	private _isVisiBle: Boolean;
	private _isHandlingScrollEvent: Boolean;

	private _ignoreTrimWhitespace: Boolean;
	private _originalIsEditaBle: Boolean;
	private _originalCodeLens: Boolean;
	private _modifiedCodeLens: Boolean;

	private _renderSideBySide: Boolean;
	private _maxComputationTime: numBer;
	private _renderIndicators: Boolean;
	private _enaBleSplitViewResizing: Boolean;
	private _strategy!: IDiffEditorWidgetStyle;

	private readonly _updateDecorationsRunner: RunOnceScheduler;

	private readonly _editorWorkerService: IEditorWorkerService;
	protected _contextKeyService: IContextKeyService;
	private readonly _codeEditorService: ICodeEditorService;
	private readonly _themeService: IThemeService;
	private readonly _notificationService: INotificationService;

	private readonly _reviewPane: DiffReview;

	constructor(
		domElement: HTMLElement,
		options: editorBrowser.IDiffEditorConstructionOptions,
		@IClipBoardService clipBoardService: IClipBoardService,
		@IEditorWorkerService editorWorkerService: IEditorWorkerService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IEditorProgressService private readonly _editorProgressService: IEditorProgressService
	) {
		super();

		this._editorWorkerService = editorWorkerService;
		this._codeEditorService = codeEditorService;
		this._contextKeyService = this._register(contextKeyService.createScoped(domElement));
		this._contextKeyService.createKey('isInDiffEditor', true);
		this._themeService = themeService;
		this._notificationService = notificationService;

		this.id = (++DIFF_EDITOR_ID);
		this._state = editorBrowser.DiffEditorState.Idle;
		this._updatingDiffProgress = null;

		this._domElement = domElement;
		options = options || {};

		// renderSideBySide
		this._renderSideBySide = true;
		if (typeof options.renderSideBySide !== 'undefined') {
			this._renderSideBySide = options.renderSideBySide;
		}

		// maxComputationTime
		this._maxComputationTime = 5000;
		if (typeof options.maxComputationTime !== 'undefined') {
			this._maxComputationTime = options.maxComputationTime;
		}

		// ignoreTrimWhitespace
		this._ignoreTrimWhitespace = true;
		if (typeof options.ignoreTrimWhitespace !== 'undefined') {
			this._ignoreTrimWhitespace = options.ignoreTrimWhitespace;
		}

		// renderIndicators
		this._renderIndicators = true;
		if (typeof options.renderIndicators !== 'undefined') {
			this._renderIndicators = options.renderIndicators;
		}

		this._originalIsEditaBle = false;
		if (typeof options.originalEditaBle !== 'undefined') {
			this._originalIsEditaBle = Boolean(options.originalEditaBle);
		}

		this._originalCodeLens = false;
		if (typeof options.originalCodeLens !== 'undefined') {
			this._originalCodeLens = Boolean(options.originalCodeLens);
		}

		this._modifiedCodeLens = false;
		if (typeof options.modifiedCodeLens !== 'undefined') {
			this._modifiedCodeLens = Boolean(options.modifiedCodeLens);
		}

		this._updateDecorationsRunner = this._register(new RunOnceScheduler(() => this._updateDecorations(), 0));

		this._containerDomElement = document.createElement('div');
		this._containerDomElement.className = DiffEditorWidget._getClassName(this._themeService.getColorTheme(), this._renderSideBySide);
		this._containerDomElement.style.position = 'relative';
		this._containerDomElement.style.height = '100%';
		this._domElement.appendChild(this._containerDomElement);

		this._overviewViewportDomElement = createFastDomNode(document.createElement('div'));
		this._overviewViewportDomElement.setClassName('diffViewport');
		this._overviewViewportDomElement.setPosition('aBsolute');

		this._overviewDomElement = document.createElement('div');
		this._overviewDomElement.className = 'diffOverview';
		this._overviewDomElement.style.position = 'aBsolute';

		this._overviewDomElement.appendChild(this._overviewViewportDomElement.domNode);

		this._register(dom.addStandardDisposaBleListener(this._overviewDomElement, 'mousedown', (e) => {
			this.modifiedEditor.delegateVerticalScrollBarMouseDown(e);
		}));
		this._containerDomElement.appendChild(this._overviewDomElement);

		// Create left side
		this._originalDomNode = document.createElement('div');
		this._originalDomNode.className = 'editor original';
		this._originalDomNode.style.position = 'aBsolute';
		this._originalDomNode.style.height = '100%';
		this._containerDomElement.appendChild(this._originalDomNode);

		// Create right side
		this._modifiedDomNode = document.createElement('div');
		this._modifiedDomNode.className = 'editor modified';
		this._modifiedDomNode.style.position = 'aBsolute';
		this._modifiedDomNode.style.height = '100%';
		this._containerDomElement.appendChild(this._modifiedDomNode);

		this._BeginUpdateDecorationsTimeout = -1;
		this._currentlyChangingViewZones = false;
		this._diffComputationToken = 0;

		this._originalEditorState = new VisualEditorState(contextMenuService, clipBoardService);
		this._modifiedEditorState = new VisualEditorState(contextMenuService, clipBoardService);

		this._isVisiBle = true;
		this._isHandlingScrollEvent = false;

		this._elementSizeOBserver = this._register(new ElementSizeOBserver(this._containerDomElement, undefined, () => this._onDidContainerSizeChanged()));
		if (options.automaticLayout) {
			this._elementSizeOBserver.startOBserving();
		}

		this._diffComputationResult = null;

		const leftContextKeyService = this._contextKeyService.createScoped();

		const leftServices = new ServiceCollection();
		leftServices.set(IContextKeyService, leftContextKeyService);
		const leftScopedInstantiationService = instantiationService.createChild(leftServices);

		const rightContextKeyService = this._contextKeyService.createScoped();

		const rightServices = new ServiceCollection();
		rightServices.set(IContextKeyService, rightContextKeyService);
		const rightScopedInstantiationService = instantiationService.createChild(rightServices);

		this.originalEditor = this._createLeftHandSideEditor(options, leftScopedInstantiationService, leftContextKeyService);
		this.modifiedEditor = this._createRightHandSideEditor(options, rightScopedInstantiationService, rightContextKeyService);

		this._originalOverviewRuler = null;
		this._modifiedOverviewRuler = null;

		this._reviewPane = new DiffReview(this);
		this._containerDomElement.appendChild(this._reviewPane.domNode.domNode);
		this._containerDomElement.appendChild(this._reviewPane.shadow.domNode);
		this._containerDomElement.appendChild(this._reviewPane.actionBarContainer.domNode);

		// enaBleSplitViewResizing
		this._enaBleSplitViewResizing = true;
		if (typeof options.enaBleSplitViewResizing !== 'undefined') {
			this._enaBleSplitViewResizing = options.enaBleSplitViewResizing;
		}

		if (this._renderSideBySide) {
			this._setStrategy(new DiffEditorWidgetSideBySide(this._createDataSource(), this._enaBleSplitViewResizing));
		} else {
			this._setStrategy(new DiffEditorWidgetInline(this._createDataSource(), this._enaBleSplitViewResizing));
		}

		this._register(themeService.onDidColorThemeChange(t => {
			if (this._strategy && this._strategy.applyColors(t)) {
				this._updateDecorationsRunner.schedule();
			}
			this._containerDomElement.className = DiffEditorWidget._getClassName(this._themeService.getColorTheme(), this._renderSideBySide);
		}));

		const contriButions: IDiffEditorContriButionDescription[] = EditorExtensionsRegistry.getDiffEditorContriButions();
		for (const desc of contriButions) {
			try {
				this._register(instantiationService.createInstance(desc.ctor, this));
			} catch (err) {
				onUnexpectedError(err);
			}
		}

		this._codeEditorService.addDiffEditor(this);
	}

	puBlic get ignoreTrimWhitespace(): Boolean {
		return this._ignoreTrimWhitespace;
	}

	puBlic get renderSideBySide(): Boolean {
		return this._renderSideBySide;
	}

	puBlic get maxComputationTime(): numBer {
		return this._maxComputationTime;
	}

	puBlic get renderIndicators(): Boolean {
		return this._renderIndicators;
	}

	puBlic getContentHeight(): numBer {
		return this.modifiedEditor.getContentHeight();
	}

	private _setState(newState: editorBrowser.DiffEditorState): void {
		if (this._state === newState) {
			return;
		}
		this._state = newState;

		if (this._updatingDiffProgress) {
			this._updatingDiffProgress.done();
			this._updatingDiffProgress = null;
		}

		if (this._state === editorBrowser.DiffEditorState.ComputingDiff) {
			this._updatingDiffProgress = this._editorProgressService.show(true, 1000);
		}
	}

	puBlic hasWidgetFocus(): Boolean {
		return dom.isAncestor(document.activeElement, this._domElement);
	}

	puBlic diffReviewNext(): void {
		this._reviewPane.next();
	}

	puBlic diffReviewPrev(): void {
		this._reviewPane.prev();
	}

	private static _getClassName(theme: IColorTheme, renderSideBySide: Boolean): string {
		let result = 'monaco-diff-editor monaco-editor-Background ';
		if (renderSideBySide) {
			result += 'side-By-side ';
		}
		result += getThemeTypeSelector(theme.type);
		return result;
	}

	private _recreateOverviewRulers(): void {
		if (this._originalOverviewRuler) {
			this._overviewDomElement.removeChild(this._originalOverviewRuler.getDomNode());
			this._originalOverviewRuler.dispose();
		}
		if (this.originalEditor.hasModel()) {
			this._originalOverviewRuler = this.originalEditor.createOverviewRuler('original diffOverviewRuler')!;
			this._overviewDomElement.appendChild(this._originalOverviewRuler.getDomNode());
		}

		if (this._modifiedOverviewRuler) {
			this._overviewDomElement.removeChild(this._modifiedOverviewRuler.getDomNode());
			this._modifiedOverviewRuler.dispose();
		}
		if (this.modifiedEditor.hasModel()) {
			this._modifiedOverviewRuler = this.modifiedEditor.createOverviewRuler('modified diffOverviewRuler')!;
			this._overviewDomElement.appendChild(this._modifiedOverviewRuler.getDomNode());
		}

		this._layoutOverviewRulers();
	}

	private _createLeftHandSideEditor(options: editorBrowser.IDiffEditorConstructionOptions, instantiationService: IInstantiationService, contextKeyService: IContextKeyService): CodeEditorWidget {
		const editor = this._createInnerEditor(instantiationService, this._originalDomNode, this._adjustOptionsForLeftHandSide(options, this._originalIsEditaBle, this._originalCodeLens));

		this._register(editor.onDidScrollChange((e) => {
			if (this._isHandlingScrollEvent) {
				return;
			}
			if (!e.scrollTopChanged && !e.scrollLeftChanged && !e.scrollHeightChanged) {
				return;
			}
			this._isHandlingScrollEvent = true;
			this.modifiedEditor.setScrollPosition({
				scrollLeft: e.scrollLeft,
				scrollTop: e.scrollTop
			});
			this._isHandlingScrollEvent = false;

			this._layoutOverviewViewport();
		}));

		this._register(editor.onDidChangeViewZones(() => {
			this._onViewZonesChanged();
		}));

		this._register(editor.onDidChangeModelContent(() => {
			if (this._isVisiBle) {
				this._BeginUpdateDecorationsSoon();
			}
		}));

		const isInDiffLeftEditorKey = contextKeyService.createKey<Boolean>('isInDiffLeftEditor', undefined);
		this._register(editor.onDidFocusEditorWidget(() => isInDiffLeftEditorKey.set(true)));
		this._register(editor.onDidBlurEditorWidget(() => isInDiffLeftEditorKey.set(false)));

		this._register(editor.onDidContentSizeChange(e => {
			const width = this.originalEditor.getContentWidth() + this.modifiedEditor.getContentWidth() + DiffEditorWidget.ONE_OVERVIEW_WIDTH;
			const height = Math.max(this.modifiedEditor.getContentHeight(), this.originalEditor.getContentHeight());

			this._onDidContentSizeChange.fire({
				contentHeight: height,
				contentWidth: width,
				contentHeightChanged: e.contentHeightChanged,
				contentWidthChanged: e.contentWidthChanged
			});
		}));

		return editor;
	}

	private _createRightHandSideEditor(options: editorBrowser.IDiffEditorConstructionOptions, instantiationService: IInstantiationService, contextKeyService: IContextKeyService): CodeEditorWidget {
		const editor = this._createInnerEditor(instantiationService, this._modifiedDomNode, this._adjustOptionsForRightHandSide(options, this._modifiedCodeLens));

		this._register(editor.onDidScrollChange((e) => {
			if (this._isHandlingScrollEvent) {
				return;
			}
			if (!e.scrollTopChanged && !e.scrollLeftChanged && !e.scrollHeightChanged) {
				return;
			}
			this._isHandlingScrollEvent = true;
			this.originalEditor.setScrollPosition({
				scrollLeft: e.scrollLeft,
				scrollTop: e.scrollTop
			});
			this._isHandlingScrollEvent = false;

			this._layoutOverviewViewport();
		}));

		this._register(editor.onDidChangeViewZones(() => {
			this._onViewZonesChanged();
		}));

		this._register(editor.onDidChangeConfiguration((e) => {
			if (e.hasChanged(EditorOption.fontInfo) && editor.getModel()) {
				this._onViewZonesChanged();
			}
		}));

		this._register(editor.onDidChangeModelContent(() => {
			if (this._isVisiBle) {
				this._BeginUpdateDecorationsSoon();
			}
		}));

		this._register(editor.onDidChangeModelOptions((e) => {
			if (e.taBSize) {
				this._updateDecorationsRunner.schedule();
			}
		}));

		const isInDiffRightEditorKey = contextKeyService.createKey<Boolean>('isInDiffRightEditor', undefined);
		this._register(editor.onDidFocusEditorWidget(() => isInDiffRightEditorKey.set(true)));
		this._register(editor.onDidBlurEditorWidget(() => isInDiffRightEditorKey.set(false)));

		this._register(editor.onDidContentSizeChange(e => {
			const width = this.originalEditor.getContentWidth() + this.modifiedEditor.getContentWidth() + DiffEditorWidget.ONE_OVERVIEW_WIDTH;
			const height = Math.max(this.modifiedEditor.getContentHeight(), this.originalEditor.getContentHeight());

			this._onDidContentSizeChange.fire({
				contentHeight: height,
				contentWidth: width,
				contentHeightChanged: e.contentHeightChanged,
				contentWidthChanged: e.contentWidthChanged
			});
		}));

		return editor;
	}

	protected _createInnerEditor(instantiationService: IInstantiationService, container: HTMLElement, options: IEditorOptions): CodeEditorWidget {
		return instantiationService.createInstance(CodeEditorWidget, container, options, {});
	}

	puBlic dispose(): void {
		this._codeEditorService.removeDiffEditor(this);

		if (this._BeginUpdateDecorationsTimeout !== -1) {
			window.clearTimeout(this._BeginUpdateDecorationsTimeout);
			this._BeginUpdateDecorationsTimeout = -1;
		}

		this._cleanViewZonesAndDecorations();

		if (this._originalOverviewRuler) {
			this._overviewDomElement.removeChild(this._originalOverviewRuler.getDomNode());
			this._originalOverviewRuler.dispose();
		}
		if (this._modifiedOverviewRuler) {
			this._overviewDomElement.removeChild(this._modifiedOverviewRuler.getDomNode());
			this._modifiedOverviewRuler.dispose();
		}
		this._overviewDomElement.removeChild(this._overviewViewportDomElement.domNode);
		this._containerDomElement.removeChild(this._overviewDomElement);

		this._containerDomElement.removeChild(this._originalDomNode);
		this.originalEditor.dispose();

		this._containerDomElement.removeChild(this._modifiedDomNode);
		this.modifiedEditor.dispose();

		this._strategy.dispose();

		this._containerDomElement.removeChild(this._reviewPane.domNode.domNode);
		this._containerDomElement.removeChild(this._reviewPane.shadow.domNode);
		this._containerDomElement.removeChild(this._reviewPane.actionBarContainer.domNode);
		this._reviewPane.dispose();

		this._domElement.removeChild(this._containerDomElement);

		this._onDidDispose.fire();

		super.dispose();
	}

	//------------ Begin IDiffEditor methods

	puBlic getId(): string {
		return this.getEditorType() + ':' + this.id;
	}

	puBlic getEditorType(): string {
		return editorCommon.EditorType.IDiffEditor;
	}

	puBlic getLineChanges(): editorCommon.ILineChange[] | null {
		if (!this._diffComputationResult) {
			return null;
		}
		return this._diffComputationResult.changes;
	}

	puBlic getDiffComputationResult(): IDiffComputationResult | null {
		return this._diffComputationResult;
	}

	puBlic getOriginalEditor(): editorBrowser.ICodeEditor {
		return this.originalEditor;
	}

	puBlic getModifiedEditor(): editorBrowser.ICodeEditor {
		return this.modifiedEditor;
	}

	puBlic updateOptions(newOptions: IDiffEditorOptions): void {

		// Handle side By side
		let renderSideBySideChanged = false;
		if (typeof newOptions.renderSideBySide !== 'undefined') {
			if (this._renderSideBySide !== newOptions.renderSideBySide) {
				this._renderSideBySide = newOptions.renderSideBySide;
				renderSideBySideChanged = true;
			}
		}

		if (typeof newOptions.maxComputationTime !== 'undefined') {
			this._maxComputationTime = newOptions.maxComputationTime;
			if (this._isVisiBle) {
				this._BeginUpdateDecorationsSoon();
			}
		}

		let BeginUpdateDecorations = false;

		if (typeof newOptions.ignoreTrimWhitespace !== 'undefined') {
			if (this._ignoreTrimWhitespace !== newOptions.ignoreTrimWhitespace) {
				this._ignoreTrimWhitespace = newOptions.ignoreTrimWhitespace;
				// Begin comparing
				BeginUpdateDecorations = true;
			}
		}

		if (typeof newOptions.renderIndicators !== 'undefined') {
			if (this._renderIndicators !== newOptions.renderIndicators) {
				this._renderIndicators = newOptions.renderIndicators;
				BeginUpdateDecorations = true;
			}
		}

		if (BeginUpdateDecorations) {
			this._BeginUpdateDecorations();
		}

		if (typeof newOptions.originalEditaBle !== 'undefined') {
			this._originalIsEditaBle = Boolean(newOptions.originalEditaBle);
		}
		if (typeof newOptions.originalCodeLens !== 'undefined') {
			this._originalCodeLens = Boolean(newOptions.originalCodeLens);
		}
		if (typeof newOptions.modifiedCodeLens !== 'undefined') {
			this._modifiedCodeLens = Boolean(newOptions.modifiedCodeLens);
		}

		this.modifiedEditor.updateOptions(this._adjustOptionsForRightHandSide(newOptions, this._modifiedCodeLens));
		this.originalEditor.updateOptions(this._adjustOptionsForLeftHandSide(newOptions, this._originalIsEditaBle, this._originalCodeLens));

		// enaBleSplitViewResizing
		if (typeof newOptions.enaBleSplitViewResizing !== 'undefined') {
			this._enaBleSplitViewResizing = newOptions.enaBleSplitViewResizing;
		}
		this._strategy.setEnaBleSplitViewResizing(this._enaBleSplitViewResizing);

		// renderSideBySide
		if (renderSideBySideChanged) {
			if (this._renderSideBySide) {
				this._setStrategy(new DiffEditorWidgetSideBySide(this._createDataSource(), this._enaBleSplitViewResizing));
			} else {
				this._setStrategy(new DiffEditorWidgetInline(this._createDataSource(), this._enaBleSplitViewResizing));
			}
			// Update class name
			this._containerDomElement.className = DiffEditorWidget._getClassName(this._themeService.getColorTheme(), this._renderSideBySide);
		}
	}

	puBlic getModel(): editorCommon.IDiffEditorModel {
		return {
			original: this.originalEditor.getModel()!,
			modified: this.modifiedEditor.getModel()!
		};
	}

	puBlic setModel(model: editorCommon.IDiffEditorModel): void {
		// Guard us against partial null model
		if (model && (!model.original || !model.modified)) {
			throw new Error(!model.original ? 'DiffEditorWidget.setModel: Original model is null' : 'DiffEditorWidget.setModel: Modified model is null');
		}

		// Remove all view zones & decorations
		this._cleanViewZonesAndDecorations();

		// Update code editor models
		this.originalEditor.setModel(model ? model.original : null);
		this.modifiedEditor.setModel(model ? model.modified : null);
		this._updateDecorationsRunner.cancel();

		// this.originalEditor.onDidChangeModelOptions

		if (model) {
			this.originalEditor.setScrollTop(0);
			this.modifiedEditor.setScrollTop(0);
		}

		// DisaBle any diff computations that will come in
		this._diffComputationResult = null;
		this._diffComputationToken++;
		this._setState(editorBrowser.DiffEditorState.Idle);

		if (model) {
			this._recreateOverviewRulers();

			// Begin comparing
			this._BeginUpdateDecorations();
		}

		this._layoutOverviewViewport();
	}

	puBlic getDomNode(): HTMLElement {
		return this._domElement;
	}

	puBlic getVisiBleColumnFromPosition(position: IPosition): numBer {
		return this.modifiedEditor.getVisiBleColumnFromPosition(position);
	}

	puBlic getStatusBarColumn(position: IPosition): numBer {
		return this.modifiedEditor.getStatusBarColumn(position);
	}

	puBlic getPosition(): Position | null {
		return this.modifiedEditor.getPosition();
	}

	puBlic setPosition(position: IPosition): void {
		this.modifiedEditor.setPosition(position);
	}

	puBlic revealLine(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLine(lineNumBer, scrollType);
	}

	puBlic revealLineInCenter(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLineInCenter(lineNumBer, scrollType);
	}

	puBlic revealLineInCenterIfOutsideViewport(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLineInCenterIfOutsideViewport(lineNumBer, scrollType);
	}

	puBlic revealLineNearTop(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLineNearTop(lineNumBer, scrollType);
	}

	puBlic revealPosition(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealPosition(position, scrollType);
	}

	puBlic revealPositionInCenter(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealPositionInCenter(position, scrollType);
	}

	puBlic revealPositionInCenterIfOutsideViewport(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealPositionInCenterIfOutsideViewport(position, scrollType);
	}

	puBlic revealPositionNearTop(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealPositionNearTop(position, scrollType);
	}

	puBlic getSelection(): Selection | null {
		return this.modifiedEditor.getSelection();
	}

	puBlic getSelections(): Selection[] | null {
		return this.modifiedEditor.getSelections();
	}

	puBlic setSelection(range: IRange): void;
	puBlic setSelection(editorRange: Range): void;
	puBlic setSelection(selection: ISelection): void;
	puBlic setSelection(editorSelection: Selection): void;
	puBlic setSelection(something: any): void {
		this.modifiedEditor.setSelection(something);
	}

	puBlic setSelections(ranges: readonly ISelection[]): void {
		this.modifiedEditor.setSelections(ranges);
	}

	puBlic revealLines(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLines(startLineNumBer, endLineNumBer, scrollType);
	}

	puBlic revealLinesInCenter(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLinesInCenter(startLineNumBer, endLineNumBer, scrollType);
	}

	puBlic revealLinesInCenterIfOutsideViewport(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLinesInCenterIfOutsideViewport(startLineNumBer, endLineNumBer, scrollType);
	}

	puBlic revealLinesNearTop(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealLinesNearTop(startLineNumBer, endLineNumBer, scrollType);
	}

	puBlic revealRange(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth, revealVerticalInCenter: Boolean = false, revealHorizontal: Boolean = true): void {
		this.modifiedEditor.revealRange(range, scrollType, revealVerticalInCenter, revealHorizontal);
	}

	puBlic revealRangeInCenter(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealRangeInCenter(range, scrollType);
	}

	puBlic revealRangeInCenterIfOutsideViewport(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealRangeInCenterIfOutsideViewport(range, scrollType);
	}

	puBlic revealRangeNearTop(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealRangeNearTop(range, scrollType);
	}

	puBlic revealRangeNearTopIfOutsideViewport(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealRangeNearTopIfOutsideViewport(range, scrollType);
	}

	puBlic revealRangeAtTop(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this.modifiedEditor.revealRangeAtTop(range, scrollType);
	}

	puBlic getSupportedActions(): editorCommon.IEditorAction[] {
		return this.modifiedEditor.getSupportedActions();
	}

	puBlic saveViewState(): editorCommon.IDiffEditorViewState {
		let originalViewState = this.originalEditor.saveViewState();
		let modifiedViewState = this.modifiedEditor.saveViewState();
		return {
			original: originalViewState,
			modified: modifiedViewState
		};
	}

	puBlic restoreViewState(s: editorCommon.IDiffEditorViewState): void {
		if (s.original && s.modified) {
			let diffEditorState = <editorCommon.IDiffEditorViewState>s;
			this.originalEditor.restoreViewState(diffEditorState.original);
			this.modifiedEditor.restoreViewState(diffEditorState.modified);
		}
	}

	puBlic layout(dimension?: editorCommon.IDimension): void {
		this._elementSizeOBserver.oBserve(dimension);
	}

	puBlic focus(): void {
		this.modifiedEditor.focus();
	}

	puBlic hasTextFocus(): Boolean {
		return this.originalEditor.hasTextFocus() || this.modifiedEditor.hasTextFocus();
	}

	puBlic onVisiBle(): void {
		this._isVisiBle = true;
		this.originalEditor.onVisiBle();
		this.modifiedEditor.onVisiBle();
		// Begin comparing
		this._BeginUpdateDecorations();
	}

	puBlic onHide(): void {
		this._isVisiBle = false;
		this.originalEditor.onHide();
		this.modifiedEditor.onHide();
		// Remove all view zones & decorations
		this._cleanViewZonesAndDecorations();
	}

	puBlic trigger(source: string | null | undefined, handlerId: string, payload: any): void {
		this.modifiedEditor.trigger(source, handlerId, payload);
	}

	puBlic changeDecorations(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => any): any {
		return this.modifiedEditor.changeDecorations(callBack);
	}

	//------------ end IDiffEditor methods



	//------------ Begin layouting methods

	private _onDidContainerSizeChanged(): void {
		this._doLayout();
	}

	private _getReviewHeight(): numBer {
		return this._reviewPane.isVisiBle() ? this._elementSizeOBserver.getHeight() : 0;
	}

	private _layoutOverviewRulers(): void {
		if (!this._originalOverviewRuler || !this._modifiedOverviewRuler) {
			return;
		}
		const height = this._elementSizeOBserver.getHeight();
		const reviewHeight = this._getReviewHeight();

		let freeSpace = DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH - 2 * DiffEditorWidget.ONE_OVERVIEW_WIDTH;
		let layoutInfo = this.modifiedEditor.getLayoutInfo();
		if (layoutInfo) {
			this._originalOverviewRuler.setLayout({
				top: 0,
				width: DiffEditorWidget.ONE_OVERVIEW_WIDTH,
				right: freeSpace + DiffEditorWidget.ONE_OVERVIEW_WIDTH,
				height: (height - reviewHeight)
			});
			this._modifiedOverviewRuler.setLayout({
				top: 0,
				right: 0,
				width: DiffEditorWidget.ONE_OVERVIEW_WIDTH,
				height: (height - reviewHeight)
			});
		}
	}

	//------------ end layouting methods

	private _onViewZonesChanged(): void {
		if (this._currentlyChangingViewZones) {
			return;
		}
		this._updateDecorationsRunner.schedule();
	}

	private _BeginUpdateDecorationsSoon(): void {
		// Clear previous timeout if necessary
		if (this._BeginUpdateDecorationsTimeout !== -1) {
			window.clearTimeout(this._BeginUpdateDecorationsTimeout);
			this._BeginUpdateDecorationsTimeout = -1;
		}
		this._BeginUpdateDecorationsTimeout = window.setTimeout(() => this._BeginUpdateDecorations(), DiffEditorWidget.UPDATE_DIFF_DECORATIONS_DELAY);
	}

	private _lastOriginalWarning: URI | null = null;
	private _lastModifiedWarning: URI | null = null;

	private static _equals(a: URI | null, B: URI | null): Boolean {
		if (!a && !B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		return (a.toString() === B.toString());
	}

	private _BeginUpdateDecorations(): void {
		this._BeginUpdateDecorationsTimeout = -1;
		const currentOriginalModel = this.originalEditor.getModel();
		const currentModifiedModel = this.modifiedEditor.getModel();
		if (!currentOriginalModel || !currentModifiedModel) {
			return;
		}

		// Prevent old diff requests to come if a new request has Been initiated
		// The Best method would Be to call cancel on the Promise, But this is not
		// yet supported, so using tokens for now.
		this._diffComputationToken++;
		let currentToken = this._diffComputationToken;
		this._setState(editorBrowser.DiffEditorState.ComputingDiff);

		if (!this._editorWorkerService.canComputeDiff(currentOriginalModel.uri, currentModifiedModel.uri)) {
			if (
				!DiffEditorWidget._equals(currentOriginalModel.uri, this._lastOriginalWarning)
				|| !DiffEditorWidget._equals(currentModifiedModel.uri, this._lastModifiedWarning)
			) {
				this._lastOriginalWarning = currentOriginalModel.uri;
				this._lastModifiedWarning = currentModifiedModel.uri;
				this._notificationService.warn(nls.localize("diff.tooLarge", "Cannot compare files Because one file is too large."));
			}
			return;
		}

		this._editorWorkerService.computeDiff(currentOriginalModel.uri, currentModifiedModel.uri, this._ignoreTrimWhitespace, this._maxComputationTime).then((result) => {
			if (currentToken === this._diffComputationToken
				&& currentOriginalModel === this.originalEditor.getModel()
				&& currentModifiedModel === this.modifiedEditor.getModel()
			) {
				this._setState(editorBrowser.DiffEditorState.DiffComputed);
				this._diffComputationResult = result;
				this._updateDecorationsRunner.schedule();
				this._onDidUpdateDiff.fire();
			}
		}, (error) => {
			if (currentToken === this._diffComputationToken
				&& currentOriginalModel === this.originalEditor.getModel()
				&& currentModifiedModel === this.modifiedEditor.getModel()
			) {
				this._setState(editorBrowser.DiffEditorState.DiffComputed);
				this._diffComputationResult = null;
				this._updateDecorationsRunner.schedule();
			}
		});
	}

	private _cleanViewZonesAndDecorations(): void {
		this._originalEditorState.clean(this.originalEditor);
		this._modifiedEditorState.clean(this.modifiedEditor);
	}

	private _updateDecorations(): void {
		if (!this.originalEditor.getModel() || !this.modifiedEditor.getModel() || !this._originalOverviewRuler || !this._modifiedOverviewRuler) {
			return;
		}
		const lineChanges = (this._diffComputationResult ? this._diffComputationResult.changes : []);

		let foreignOriginal = this._originalEditorState.getForeignViewZones(this.originalEditor.getWhitespaces());
		let foreignModified = this._modifiedEditorState.getForeignViewZones(this.modifiedEditor.getWhitespaces());

		let diffDecorations = this._strategy.getEditorsDiffDecorations(lineChanges, this._ignoreTrimWhitespace, this._renderIndicators, foreignOriginal, foreignModified, this.originalEditor, this.modifiedEditor);

		try {
			this._currentlyChangingViewZones = true;
			this._originalEditorState.apply(this.originalEditor, this._originalOverviewRuler, diffDecorations.original, false);
			this._modifiedEditorState.apply(this.modifiedEditor, this._modifiedOverviewRuler, diffDecorations.modified, true);
		} finally {
			this._currentlyChangingViewZones = false;
		}
	}

	private _adjustOptionsForSuBEditor(options: editorBrowser.IDiffEditorConstructionOptions): editorBrowser.IDiffEditorConstructionOptions {
		let clonedOptions: editorBrowser.IDiffEditorConstructionOptions = oBjects.deepClone(options || {});
		clonedOptions.inDiffEditor = true;
		clonedOptions.wordWrap = 'off';
		clonedOptions.wordWrapMinified = false;
		clonedOptions.automaticLayout = false;
		clonedOptions.scrollBar = clonedOptions.scrollBar || {};
		clonedOptions.scrollBar.vertical = 'visiBle';
		clonedOptions.folding = false;
		clonedOptions.codeLens = false;
		clonedOptions.fixedOverflowWidgets = true;
		clonedOptions.overflowWidgetsDomNode = options.overflowWidgetsDomNode;
		// clonedOptions.lineDecorationsWidth = '2ch';
		if (!clonedOptions.minimap) {
			clonedOptions.minimap = {};
		}
		clonedOptions.minimap.enaBled = false;
		return clonedOptions;
	}

	private _adjustOptionsForLeftHandSide(options: editorBrowser.IDiffEditorConstructionOptions, isEditaBle: Boolean, isCodeLensEnaBled: Boolean): editorBrowser.IEditorConstructionOptions {
		let result = this._adjustOptionsForSuBEditor(options);
		if (isCodeLensEnaBled) {
			result.codeLens = true;
		}
		result.readOnly = !isEditaBle;
		result.extraEditorClassName = 'original-in-monaco-diff-editor';
		return result;
	}

	private _adjustOptionsForRightHandSide(options: editorBrowser.IDiffEditorConstructionOptions, isCodeLensEnaBled: Boolean): editorBrowser.IEditorConstructionOptions {
		let result = this._adjustOptionsForSuBEditor(options);
		if (isCodeLensEnaBled) {
			result.codeLens = true;
		}
		result.revealHorizontalRightPadding = EditorOptions.revealHorizontalRightPadding.defaultValue + DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH;
		result.scrollBar!.verticalHasArrows = false;
		result.extraEditorClassName = 'modified-in-monaco-diff-editor';
		return result;
	}

	puBlic doLayout(): void {
		this._elementSizeOBserver.oBserve();
		this._doLayout();
	}

	private _doLayout(): void {
		const width = this._elementSizeOBserver.getWidth();
		const height = this._elementSizeOBserver.getHeight();
		const reviewHeight = this._getReviewHeight();

		let splitPoint = this._strategy.layout();

		this._originalDomNode.style.width = splitPoint + 'px';
		this._originalDomNode.style.left = '0px';

		this._modifiedDomNode.style.width = (width - splitPoint) + 'px';
		this._modifiedDomNode.style.left = splitPoint + 'px';

		this._overviewDomElement.style.top = '0px';
		this._overviewDomElement.style.height = (height - reviewHeight) + 'px';
		this._overviewDomElement.style.width = DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH + 'px';
		this._overviewDomElement.style.left = (width - DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH) + 'px';
		this._overviewViewportDomElement.setWidth(DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH);
		this._overviewViewportDomElement.setHeight(30);

		this.originalEditor.layout({ width: splitPoint, height: (height - reviewHeight) });
		this.modifiedEditor.layout({ width: width - splitPoint - DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH, height: (height - reviewHeight) });

		if (this._originalOverviewRuler || this._modifiedOverviewRuler) {
			this._layoutOverviewRulers();
		}

		this._reviewPane.layout(height - reviewHeight, width, reviewHeight);

		this._layoutOverviewViewport();
	}

	private _layoutOverviewViewport(): void {
		let layout = this._computeOverviewViewport();
		if (!layout) {
			this._overviewViewportDomElement.setTop(0);
			this._overviewViewportDomElement.setHeight(0);
		} else {
			this._overviewViewportDomElement.setTop(layout.top);
			this._overviewViewportDomElement.setHeight(layout.height);
		}
	}

	private _computeOverviewViewport(): { height: numBer; top: numBer; } | null {
		let layoutInfo = this.modifiedEditor.getLayoutInfo();
		if (!layoutInfo) {
			return null;
		}

		let scrollTop = this.modifiedEditor.getScrollTop();
		let scrollHeight = this.modifiedEditor.getScrollHeight();

		let computedAvailaBleSize = Math.max(0, layoutInfo.height);
		let computedRepresentaBleSize = Math.max(0, computedAvailaBleSize - 2 * 0);
		let computedRatio = scrollHeight > 0 ? (computedRepresentaBleSize / scrollHeight) : 0;

		let computedSliderSize = Math.max(0, Math.floor(layoutInfo.height * computedRatio));
		let computedSliderPosition = Math.floor(scrollTop * computedRatio);

		return {
			height: computedSliderSize,
			top: computedSliderPosition
		};
	}

	private _createDataSource(): IDataSource {
		return {
			getWidth: () => {
				return this._elementSizeOBserver.getWidth();
			},

			getHeight: () => {
				return (this._elementSizeOBserver.getHeight() - this._getReviewHeight());
			},

			getContainerDomNode: () => {
				return this._containerDomElement;
			},

			relayoutEditors: () => {
				this._doLayout();
			},

			getOriginalEditor: () => {
				return this.originalEditor;
			},

			getModifiedEditor: () => {
				return this.modifiedEditor;
			}
		};
	}

	private _setStrategy(newStrategy: IDiffEditorWidgetStyle): void {
		if (this._strategy) {
			this._strategy.dispose();
		}

		this._strategy = newStrategy;
		newStrategy.applyColors(this._themeService.getColorTheme());

		if (this._diffComputationResult) {
			this._updateDecorations();
		}

		// Just do a layout, the strategy might need it
		this._doLayout();
	}

	private _getLineChangeAtOrBeforeLineNumBer(lineNumBer: numBer, startLineNumBerExtractor: (lineChange: editorCommon.ILineChange) => numBer): editorCommon.ILineChange | null {
		const lineChanges = (this._diffComputationResult ? this._diffComputationResult.changes : []);
		if (lineChanges.length === 0 || lineNumBer < startLineNumBerExtractor(lineChanges[0])) {
			// There are no changes or `lineNumBer` is Before the first change
			return null;
		}

		let min = 0, max = lineChanges.length - 1;
		while (min < max) {
			let mid = Math.floor((min + max) / 2);
			let midStart = startLineNumBerExtractor(lineChanges[mid]);
			let midEnd = (mid + 1 <= max ? startLineNumBerExtractor(lineChanges[mid + 1]) : Constants.MAX_SAFE_SMALL_INTEGER);

			if (lineNumBer < midStart) {
				max = mid - 1;
			} else if (lineNumBer >= midEnd) {
				min = mid + 1;
			} else {
				// HIT!
				min = mid;
				max = mid;
			}
		}
		return lineChanges[min];
	}

	private _getEquivalentLineForOriginalLineNumBer(lineNumBer: numBer): numBer {
		let lineChange = this._getLineChangeAtOrBeforeLineNumBer(lineNumBer, (lineChange) => lineChange.originalStartLineNumBer);

		if (!lineChange) {
			return lineNumBer;
		}

		let originalEquivalentLineNumBer = lineChange.originalStartLineNumBer + (lineChange.originalEndLineNumBer > 0 ? -1 : 0);
		let modifiedEquivalentLineNumBer = lineChange.modifiedStartLineNumBer + (lineChange.modifiedEndLineNumBer > 0 ? -1 : 0);
		let lineChangeOriginalLength = (lineChange.originalEndLineNumBer > 0 ? (lineChange.originalEndLineNumBer - lineChange.originalStartLineNumBer + 1) : 0);
		let lineChangeModifiedLength = (lineChange.modifiedEndLineNumBer > 0 ? (lineChange.modifiedEndLineNumBer - lineChange.modifiedStartLineNumBer + 1) : 0);


		let delta = lineNumBer - originalEquivalentLineNumBer;

		if (delta <= lineChangeOriginalLength) {
			return modifiedEquivalentLineNumBer + Math.min(delta, lineChangeModifiedLength);
		}

		return modifiedEquivalentLineNumBer + lineChangeModifiedLength - lineChangeOriginalLength + delta;
	}

	private _getEquivalentLineForModifiedLineNumBer(lineNumBer: numBer): numBer {
		let lineChange = this._getLineChangeAtOrBeforeLineNumBer(lineNumBer, (lineChange) => lineChange.modifiedStartLineNumBer);

		if (!lineChange) {
			return lineNumBer;
		}

		let originalEquivalentLineNumBer = lineChange.originalStartLineNumBer + (lineChange.originalEndLineNumBer > 0 ? -1 : 0);
		let modifiedEquivalentLineNumBer = lineChange.modifiedStartLineNumBer + (lineChange.modifiedEndLineNumBer > 0 ? -1 : 0);
		let lineChangeOriginalLength = (lineChange.originalEndLineNumBer > 0 ? (lineChange.originalEndLineNumBer - lineChange.originalStartLineNumBer + 1) : 0);
		let lineChangeModifiedLength = (lineChange.modifiedEndLineNumBer > 0 ? (lineChange.modifiedEndLineNumBer - lineChange.modifiedStartLineNumBer + 1) : 0);


		let delta = lineNumBer - modifiedEquivalentLineNumBer;

		if (delta <= lineChangeModifiedLength) {
			return originalEquivalentLineNumBer + Math.min(delta, lineChangeOriginalLength);
		}

		return originalEquivalentLineNumBer + lineChangeOriginalLength - lineChangeModifiedLength + delta;
	}

	puBlic getDiffLineInformationForOriginal(lineNumBer: numBer): editorBrowser.IDiffLineInformation | null {
		if (!this._diffComputationResult) {
			// Cannot answer that which I don't know
			return null;
		}
		return {
			equivalentLineNumBer: this._getEquivalentLineForOriginalLineNumBer(lineNumBer)
		};
	}

	puBlic getDiffLineInformationForModified(lineNumBer: numBer): editorBrowser.IDiffLineInformation | null {
		if (!this._diffComputationResult) {
			// Cannot answer that which I don't know
			return null;
		}
		return {
			equivalentLineNumBer: this._getEquivalentLineForModifiedLineNumBer(lineNumBer)
		};
	}
}

interface IDataSource {
	getWidth(): numBer;
	getHeight(): numBer;
	getContainerDomNode(): HTMLElement;
	relayoutEditors(): void;

	getOriginalEditor(): editorBrowser.ICodeEditor;
	getModifiedEditor(): editorBrowser.ICodeEditor;
}

aBstract class DiffEditorWidgetStyle extends DisposaBle implements IDiffEditorWidgetStyle {

	_dataSource: IDataSource;
	_insertColor: Color | null;
	_removeColor: Color | null;

	constructor(dataSource: IDataSource) {
		super();
		this._dataSource = dataSource;
		this._insertColor = null;
		this._removeColor = null;
	}

	puBlic applyColors(theme: IColorTheme): Boolean {
		let newInsertColor = (theme.getColor(diffInserted) || defaultInsertColor).transparent(2);
		let newRemoveColor = (theme.getColor(diffRemoved) || defaultRemoveColor).transparent(2);
		let hasChanges = !newInsertColor.equals(this._insertColor) || !newRemoveColor.equals(this._removeColor);
		this._insertColor = newInsertColor;
		this._removeColor = newRemoveColor;
		return hasChanges;
	}

	puBlic getEditorsDiffDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalWhitespaces: IEditorWhitespace[], modifiedWhitespaces: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorsDiffDecorationsWithZones {
		// Get view zones
		modifiedWhitespaces = modifiedWhitespaces.sort((a, B) => {
			return a.afterLineNumBer - B.afterLineNumBer;
		});
		originalWhitespaces = originalWhitespaces.sort((a, B) => {
			return a.afterLineNumBer - B.afterLineNumBer;
		});
		let zones = this._getViewZones(lineChanges, originalWhitespaces, modifiedWhitespaces, originalEditor, modifiedEditor, renderIndicators);

		// Get decorations & overview ruler zones
		let originalDecorations = this._getOriginalEditorDecorations(lineChanges, ignoreTrimWhitespace, renderIndicators, originalEditor, modifiedEditor);
		let modifiedDecorations = this._getModifiedEditorDecorations(lineChanges, ignoreTrimWhitespace, renderIndicators, originalEditor, modifiedEditor);

		return {
			original: {
				decorations: originalDecorations.decorations,
				overviewZones: originalDecorations.overviewZones,
				zones: zones.original
			},
			modified: {
				decorations: modifiedDecorations.decorations,
				overviewZones: modifiedDecorations.overviewZones,
				zones: zones.modified
			}
		};
	}

	protected aBstract _getViewZones(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], modifiedForeignVZ: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor, renderIndicators: Boolean): IEditorsZones;
	protected aBstract _getOriginalEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations;
	protected aBstract _getModifiedEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations;

	puBlic aBstract setEnaBleSplitViewResizing(enaBleSplitViewResizing: Boolean): void;
	puBlic aBstract layout(): numBer;
}

interface IMyViewZone {
	shouldNotShrink?: Boolean;
	afterLineNumBer: numBer;
	heightInLines: numBer;
	minWidthInPx?: numBer;
	domNode: HTMLElement | null;
	marginDomNode?: HTMLElement | null;
	diff?: IDiffLinesChange;
}

class ForeignViewZonesIterator {

	private _index: numBer;
	private readonly _source: IEditorWhitespace[];
	puBlic current: IEditorWhitespace | null;

	constructor(source: IEditorWhitespace[]) {
		this._source = source;
		this._index = -1;
		this.current = null;
		this.advance();
	}

	puBlic advance(): void {
		this._index++;
		if (this._index < this._source.length) {
			this.current = this._source[this._index];
		} else {
			this.current = null;
		}
	}
}

aBstract class ViewZonesComputer {

	private readonly lineChanges: editorCommon.ILineChange[];
	private readonly originalForeignVZ: IEditorWhitespace[];
	private readonly originalLineHeight: numBer;
	private readonly modifiedForeignVZ: IEditorWhitespace[];
	private readonly modifiedLineHeight: numBer;

	constructor(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], originalLineHeight: numBer, modifiedForeignVZ: IEditorWhitespace[], modifiedLineHeight: numBer) {
		this.lineChanges = lineChanges;
		this.originalForeignVZ = originalForeignVZ;
		this.originalLineHeight = originalLineHeight;
		this.modifiedForeignVZ = modifiedForeignVZ;
		this.modifiedLineHeight = modifiedLineHeight;
	}

	puBlic getViewZones(): IEditorsZones {
		let result: { original: IMyViewZone[]; modified: IMyViewZone[]; } = {
			original: [],
			modified: []
		};

		let lineChangeModifiedLength: numBer = 0;
		let lineChangeOriginalLength: numBer = 0;
		let originalEquivalentLineNumBer: numBer = 0;
		let modifiedEquivalentLineNumBer: numBer = 0;
		let originalEndEquivalentLineNumBer: numBer = 0;
		let modifiedEndEquivalentLineNumBer: numBer = 0;

		let sortMyViewZones = (a: IMyViewZone, B: IMyViewZone) => {
			return a.afterLineNumBer - B.afterLineNumBer;
		};

		let addAndComBineIfPossiBle = (destination: IMyViewZone[], item: IMyViewZone) => {
			if (item.domNode === null && destination.length > 0) {
				let lastItem = destination[destination.length - 1];
				if (lastItem.afterLineNumBer === item.afterLineNumBer && lastItem.domNode === null) {
					lastItem.heightInLines += item.heightInLines;
					return;
				}
			}
			destination.push(item);
		};

		let modifiedForeignVZ = new ForeignViewZonesIterator(this.modifiedForeignVZ);
		let originalForeignVZ = new ForeignViewZonesIterator(this.originalForeignVZ);

		// In order to include foreign view zones after the last line change, the for loop will iterate once more after the end of the `lineChanges` array
		for (let i = 0, length = this.lineChanges.length; i <= length; i++) {
			let lineChange = (i < length ? this.lineChanges[i] : null);

			if (lineChange !== null) {
				originalEquivalentLineNumBer = lineChange.originalStartLineNumBer + (lineChange.originalEndLineNumBer > 0 ? -1 : 0);
				modifiedEquivalentLineNumBer = lineChange.modifiedStartLineNumBer + (lineChange.modifiedEndLineNumBer > 0 ? -1 : 0);
				lineChangeOriginalLength = (lineChange.originalEndLineNumBer > 0 ? (lineChange.originalEndLineNumBer - lineChange.originalStartLineNumBer + 1) : 0);
				lineChangeModifiedLength = (lineChange.modifiedEndLineNumBer > 0 ? (lineChange.modifiedEndLineNumBer - lineChange.modifiedStartLineNumBer + 1) : 0);
				originalEndEquivalentLineNumBer = Math.max(lineChange.originalStartLineNumBer, lineChange.originalEndLineNumBer);
				modifiedEndEquivalentLineNumBer = Math.max(lineChange.modifiedStartLineNumBer, lineChange.modifiedEndLineNumBer);
			} else {
				// Increase to very large value to get the producing tests of foreign view zones running
				originalEquivalentLineNumBer += 10000000 + lineChangeOriginalLength;
				modifiedEquivalentLineNumBer += 10000000 + lineChangeModifiedLength;
				originalEndEquivalentLineNumBer = originalEquivalentLineNumBer;
				modifiedEndEquivalentLineNumBer = modifiedEquivalentLineNumBer;
			}

			// Each step produces view zones, and after producing them, we try to cancel them out, to avoid empty-empty view zone cases
			let stepOriginal: IMyViewZone[] = [];
			let stepModified: IMyViewZone[] = [];

			// ---------------------------- PRODUCE VIEW ZONES

			// [PRODUCE] View zone(s) in original-side due to foreign view zone(s) in modified-side
			while (modifiedForeignVZ.current && modifiedForeignVZ.current.afterLineNumBer <= modifiedEndEquivalentLineNumBer) {
				let viewZoneLineNumBer: numBer;
				if (modifiedForeignVZ.current.afterLineNumBer <= modifiedEquivalentLineNumBer) {
					viewZoneLineNumBer = originalEquivalentLineNumBer - modifiedEquivalentLineNumBer + modifiedForeignVZ.current.afterLineNumBer;
				} else {
					viewZoneLineNumBer = originalEndEquivalentLineNumBer;
				}

				let marginDomNode: HTMLDivElement | null = null;
				if (lineChange && lineChange.modifiedStartLineNumBer <= modifiedForeignVZ.current.afterLineNumBer && modifiedForeignVZ.current.afterLineNumBer <= lineChange.modifiedEndLineNumBer) {
					marginDomNode = this._createOriginalMarginDomNodeForModifiedForeignViewZoneInAddedRegion();
				}

				stepOriginal.push({
					afterLineNumBer: viewZoneLineNumBer,
					heightInLines: modifiedForeignVZ.current.height / this.modifiedLineHeight,
					domNode: null,
					marginDomNode: marginDomNode
				});
				modifiedForeignVZ.advance();
			}

			// [PRODUCE] View zone(s) in modified-side due to foreign view zone(s) in original-side
			while (originalForeignVZ.current && originalForeignVZ.current.afterLineNumBer <= originalEndEquivalentLineNumBer) {
				let viewZoneLineNumBer: numBer;
				if (originalForeignVZ.current.afterLineNumBer <= originalEquivalentLineNumBer) {
					viewZoneLineNumBer = modifiedEquivalentLineNumBer - originalEquivalentLineNumBer + originalForeignVZ.current.afterLineNumBer;
				} else {
					viewZoneLineNumBer = modifiedEndEquivalentLineNumBer;
				}
				stepModified.push({
					afterLineNumBer: viewZoneLineNumBer,
					heightInLines: originalForeignVZ.current.height / this.originalLineHeight,
					domNode: null
				});
				originalForeignVZ.advance();
			}

			if (lineChange !== null && isChangeOrInsert(lineChange)) {
				let r = this._produceOriginalFromDiff(lineChange, lineChangeOriginalLength, lineChangeModifiedLength);
				if (r) {
					stepOriginal.push(r);
				}
			}

			if (lineChange !== null && isChangeOrDelete(lineChange)) {
				let r = this._produceModifiedFromDiff(lineChange, lineChangeOriginalLength, lineChangeModifiedLength);
				if (r) {
					stepModified.push(r);
				}
			}

			// ---------------------------- END PRODUCE VIEW ZONES


			// ---------------------------- EMIT MINIMAL VIEW ZONES

			// [CANCEL & EMIT] Try to cancel view zones out
			let stepOriginalIndex = 0;
			let stepModifiedIndex = 0;

			stepOriginal = stepOriginal.sort(sortMyViewZones);
			stepModified = stepModified.sort(sortMyViewZones);

			while (stepOriginalIndex < stepOriginal.length && stepModifiedIndex < stepModified.length) {
				let original = stepOriginal[stepOriginalIndex];
				let modified = stepModified[stepModifiedIndex];

				let originalDelta = original.afterLineNumBer - originalEquivalentLineNumBer;
				let modifiedDelta = modified.afterLineNumBer - modifiedEquivalentLineNumBer;

				if (originalDelta < modifiedDelta) {
					addAndComBineIfPossiBle(result.original, original);
					stepOriginalIndex++;
				} else if (modifiedDelta < originalDelta) {
					addAndComBineIfPossiBle(result.modified, modified);
					stepModifiedIndex++;
				} else if (original.shouldNotShrink) {
					addAndComBineIfPossiBle(result.original, original);
					stepOriginalIndex++;
				} else if (modified.shouldNotShrink) {
					addAndComBineIfPossiBle(result.modified, modified);
					stepModifiedIndex++;
				} else {
					if (original.heightInLines >= modified.heightInLines) {
						// modified view zone gets removed
						original.heightInLines -= modified.heightInLines;
						stepModifiedIndex++;
					} else {
						// original view zone gets removed
						modified.heightInLines -= original.heightInLines;
						stepOriginalIndex++;
					}
				}
			}

			// [EMIT] Remaining original view zones
			while (stepOriginalIndex < stepOriginal.length) {
				addAndComBineIfPossiBle(result.original, stepOriginal[stepOriginalIndex]);
				stepOriginalIndex++;
			}

			// [EMIT] Remaining modified view zones
			while (stepModifiedIndex < stepModified.length) {
				addAndComBineIfPossiBle(result.modified, stepModified[stepModifiedIndex]);
				stepModifiedIndex++;
			}

			// ---------------------------- END EMIT MINIMAL VIEW ZONES
		}

		return {
			original: ViewZonesComputer._ensureDomNodes(result.original),
			modified: ViewZonesComputer._ensureDomNodes(result.modified),
		};
	}

	private static _ensureDomNodes(zones: IMyViewZone[]): IMyViewZone[] {
		return zones.map((z) => {
			if (!z.domNode) {
				z.domNode = createFakeLinesDiv();
			}
			return z;
		});
	}

	protected aBstract _createOriginalMarginDomNodeForModifiedForeignViewZoneInAddedRegion(): HTMLDivElement | null;

	protected aBstract _produceOriginalFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null;

	protected aBstract _produceModifiedFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null;
}

export function createDecoration(startLineNumBer: numBer, startColumn: numBer, endLineNumBer: numBer, endColumn: numBer, options: ModelDecorationOptions) {
	return {
		range: new Range(startLineNumBer, startColumn, endLineNumBer, endColumn),
		options: options
	};
}

export const DECORATIONS = {

	charDelete: ModelDecorationOptions.register({
		className: 'char-delete'
	}),
	charDeleteWholeLine: ModelDecorationOptions.register({
		className: 'char-delete',
		isWholeLine: true
	}),

	charInsert: ModelDecorationOptions.register({
		className: 'char-insert'
	}),
	charInsertWholeLine: ModelDecorationOptions.register({
		className: 'char-insert',
		isWholeLine: true
	}),

	lineInsert: ModelDecorationOptions.register({
		className: 'line-insert',
		marginClassName: 'line-insert',
		isWholeLine: true
	}),
	lineInsertWithSign: ModelDecorationOptions.register({
		className: 'line-insert',
		linesDecorationsClassName: 'insert-sign ' + diffInsertIcon.classNames,
		marginClassName: 'line-insert',
		isWholeLine: true
	}),

	lineDelete: ModelDecorationOptions.register({
		className: 'line-delete',
		marginClassName: 'line-delete',
		isWholeLine: true
	}),
	lineDeleteWithSign: ModelDecorationOptions.register({
		className: 'line-delete',
		linesDecorationsClassName: 'delete-sign ' + diffRemoveIcon.classNames,
		marginClassName: 'line-delete',
		isWholeLine: true

	}),
	lineDeleteMargin: ModelDecorationOptions.register({
		marginClassName: 'line-delete',
	})

};

export class DiffEditorWidgetSideBySide extends DiffEditorWidgetStyle implements IDiffEditorWidgetStyle, IVerticalSashLayoutProvider {

	static readonly MINIMUM_EDITOR_WIDTH = 100;

	private _disaBleSash: Boolean;
	private readonly _sash: Sash;
	private _sashRatio: numBer | null;
	private _sashPosition: numBer | null;
	private _startSashPosition: numBer | null;

	constructor(dataSource: IDataSource, enaBleSplitViewResizing: Boolean) {
		super(dataSource);

		this._disaBleSash = (enaBleSplitViewResizing === false);
		this._sashRatio = null;
		this._sashPosition = null;
		this._startSashPosition = null;
		this._sash = this._register(new Sash(this._dataSource.getContainerDomNode(), this, { orientation: Orientation.VERTICAL }));

		if (this._disaBleSash) {
			this._sash.state = SashState.DisaBled;
		}

		this._sash.onDidStart(() => this.onSashDragStart());
		this._sash.onDidChange((e: ISashEvent) => this.onSashDrag(e));
		this._sash.onDidEnd(() => this.onSashDragEnd());
		this._sash.onDidReset(() => this.onSashReset());
	}

	puBlic setEnaBleSplitViewResizing(enaBleSplitViewResizing: Boolean): void {
		let newDisaBleSash = (enaBleSplitViewResizing === false);
		if (this._disaBleSash !== newDisaBleSash) {
			this._disaBleSash = newDisaBleSash;
			this._sash.state = this._disaBleSash ? SashState.DisaBled : SashState.EnaBled;
		}
	}

	puBlic layout(sashRatio: numBer | null = this._sashRatio): numBer {
		let w = this._dataSource.getWidth();
		let contentWidth = w - DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH;

		let sashPosition = Math.floor((sashRatio || 0.5) * contentWidth);
		let midPoint = Math.floor(0.5 * contentWidth);

		sashPosition = this._disaBleSash ? midPoint : sashPosition || midPoint;

		if (contentWidth > DiffEditorWidgetSideBySide.MINIMUM_EDITOR_WIDTH * 2) {
			if (sashPosition < DiffEditorWidgetSideBySide.MINIMUM_EDITOR_WIDTH) {
				sashPosition = DiffEditorWidgetSideBySide.MINIMUM_EDITOR_WIDTH;
			}

			if (sashPosition > contentWidth - DiffEditorWidgetSideBySide.MINIMUM_EDITOR_WIDTH) {
				sashPosition = contentWidth - DiffEditorWidgetSideBySide.MINIMUM_EDITOR_WIDTH;
			}
		} else {
			sashPosition = midPoint;
		}

		if (this._sashPosition !== sashPosition) {
			this._sashPosition = sashPosition;
			this._sash.layout();
		}

		return this._sashPosition;
	}

	private onSashDragStart(): void {
		this._startSashPosition = this._sashPosition!;
	}

	private onSashDrag(e: ISashEvent): void {
		let w = this._dataSource.getWidth();
		let contentWidth = w - DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH;
		let sashPosition = this.layout((this._startSashPosition! + (e.currentX - e.startX)) / contentWidth);

		this._sashRatio = sashPosition / contentWidth;

		this._dataSource.relayoutEditors();
	}

	private onSashDragEnd(): void {
		this._sash.layout();
	}

	private onSashReset(): void {
		this._sashRatio = 0.5;
		this._dataSource.relayoutEditors();
		this._sash.layout();
	}

	puBlic getVerticalSashTop(sash: Sash): numBer {
		return 0;
	}

	puBlic getVerticalSashLeft(sash: Sash): numBer {
		return this._sashPosition!;
	}

	puBlic getVerticalSashHeight(sash: Sash): numBer {
		return this._dataSource.getHeight();
	}

	protected _getViewZones(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], modifiedForeignVZ: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorsZones {
		let c = new SideBySideViewZonesComputer(lineChanges, originalForeignVZ, originalEditor.getOption(EditorOption.lineHeight), modifiedForeignVZ, modifiedEditor.getOption(EditorOption.lineHeight));
		return c.getViewZones();
	}

	protected _getOriginalEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations {
		const overviewZoneColor = String(this._removeColor);

		let result: IEditorDiffDecorations = {
			decorations: [],
			overviewZones: []
		};

		let originalModel = originalEditor.getModel()!;

		for (let i = 0, length = lineChanges.length; i < length; i++) {
			let lineChange = lineChanges[i];

			if (isChangeOrDelete(lineChange)) {
				result.decorations.push({
					range: new Range(lineChange.originalStartLineNumBer, 1, lineChange.originalEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER),
					options: (renderIndicators ? DECORATIONS.lineDeleteWithSign : DECORATIONS.lineDelete)
				});
				if (!isChangeOrInsert(lineChange) || !lineChange.charChanges) {
					result.decorations.push(createDecoration(lineChange.originalStartLineNumBer, 1, lineChange.originalEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER, DECORATIONS.charDeleteWholeLine));
				}

				result.overviewZones.push(new OverviewRulerZone(
					lineChange.originalStartLineNumBer,
					lineChange.originalEndLineNumBer,
					overviewZoneColor
				));

				if (lineChange.charChanges) {
					for (let j = 0, lengthJ = lineChange.charChanges.length; j < lengthJ; j++) {
						let charChange = lineChange.charChanges[j];
						if (isChangeOrDelete(charChange)) {
							if (ignoreTrimWhitespace) {
								for (let lineNumBer = charChange.originalStartLineNumBer; lineNumBer <= charChange.originalEndLineNumBer; lineNumBer++) {
									let startColumn: numBer;
									let endColumn: numBer;
									if (lineNumBer === charChange.originalStartLineNumBer) {
										startColumn = charChange.originalStartColumn;
									} else {
										startColumn = originalModel.getLineFirstNonWhitespaceColumn(lineNumBer);
									}
									if (lineNumBer === charChange.originalEndLineNumBer) {
										endColumn = charChange.originalEndColumn;
									} else {
										endColumn = originalModel.getLineLastNonWhitespaceColumn(lineNumBer);
									}
									result.decorations.push(createDecoration(lineNumBer, startColumn, lineNumBer, endColumn, DECORATIONS.charDelete));
								}
							} else {
								result.decorations.push(createDecoration(charChange.originalStartLineNumBer, charChange.originalStartColumn, charChange.originalEndLineNumBer, charChange.originalEndColumn, DECORATIONS.charDelete));
							}
						}
					}
				}
			}
		}

		return result;
	}

	protected _getModifiedEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations {
		const overviewZoneColor = String(this._insertColor);

		let result: IEditorDiffDecorations = {
			decorations: [],
			overviewZones: []
		};

		let modifiedModel = modifiedEditor.getModel()!;

		for (let i = 0, length = lineChanges.length; i < length; i++) {
			let lineChange = lineChanges[i];

			if (isChangeOrInsert(lineChange)) {

				result.decorations.push({
					range: new Range(lineChange.modifiedStartLineNumBer, 1, lineChange.modifiedEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER),
					options: (renderIndicators ? DECORATIONS.lineInsertWithSign : DECORATIONS.lineInsert)
				});
				if (!isChangeOrDelete(lineChange) || !lineChange.charChanges) {
					result.decorations.push(createDecoration(lineChange.modifiedStartLineNumBer, 1, lineChange.modifiedEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER, DECORATIONS.charInsertWholeLine));
				}
				result.overviewZones.push(new OverviewRulerZone(
					lineChange.modifiedStartLineNumBer,
					lineChange.modifiedEndLineNumBer,
					overviewZoneColor
				));

				if (lineChange.charChanges) {
					for (let j = 0, lengthJ = lineChange.charChanges.length; j < lengthJ; j++) {
						let charChange = lineChange.charChanges[j];
						if (isChangeOrInsert(charChange)) {
							if (ignoreTrimWhitespace) {
								for (let lineNumBer = charChange.modifiedStartLineNumBer; lineNumBer <= charChange.modifiedEndLineNumBer; lineNumBer++) {
									let startColumn: numBer;
									let endColumn: numBer;
									if (lineNumBer === charChange.modifiedStartLineNumBer) {
										startColumn = charChange.modifiedStartColumn;
									} else {
										startColumn = modifiedModel.getLineFirstNonWhitespaceColumn(lineNumBer);
									}
									if (lineNumBer === charChange.modifiedEndLineNumBer) {
										endColumn = charChange.modifiedEndColumn;
									} else {
										endColumn = modifiedModel.getLineLastNonWhitespaceColumn(lineNumBer);
									}
									result.decorations.push(createDecoration(lineNumBer, startColumn, lineNumBer, endColumn, DECORATIONS.charInsert));
								}
							} else {
								result.decorations.push(createDecoration(charChange.modifiedStartLineNumBer, charChange.modifiedStartColumn, charChange.modifiedEndLineNumBer, charChange.modifiedEndColumn, DECORATIONS.charInsert));
							}
						}
					}
				}

			}
		}
		return result;
	}
}

class SideBySideViewZonesComputer extends ViewZonesComputer {

	constructor(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], originalLineHeight: numBer, modifiedForeignVZ: IEditorWhitespace[], modifiedLineHeight: numBer) {
		super(lineChanges, originalForeignVZ, originalLineHeight, modifiedForeignVZ, modifiedLineHeight);
	}

	protected _createOriginalMarginDomNodeForModifiedForeignViewZoneInAddedRegion(): HTMLDivElement | null {
		return null;
	}

	protected _produceOriginalFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null {
		if (lineChangeModifiedLength > lineChangeOriginalLength) {
			return {
				afterLineNumBer: Math.max(lineChange.originalStartLineNumBer, lineChange.originalEndLineNumBer),
				heightInLines: (lineChangeModifiedLength - lineChangeOriginalLength),
				domNode: null
			};
		}
		return null;
	}

	protected _produceModifiedFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null {
		if (lineChangeOriginalLength > lineChangeModifiedLength) {
			return {
				afterLineNumBer: Math.max(lineChange.modifiedStartLineNumBer, lineChange.modifiedEndLineNumBer),
				heightInLines: (lineChangeOriginalLength - lineChangeModifiedLength),
				domNode: null
			};
		}
		return null;
	}
}

class DiffEditorWidgetInline extends DiffEditorWidgetStyle implements IDiffEditorWidgetStyle {

	private decorationsLeft: numBer;

	constructor(dataSource: IDataSource, enaBleSplitViewResizing: Boolean) {
		super(dataSource);

		this.decorationsLeft = dataSource.getOriginalEditor().getLayoutInfo().decorationsLeft;

		this._register(dataSource.getOriginalEditor().onDidLayoutChange((layoutInfo: EditorLayoutInfo) => {
			if (this.decorationsLeft !== layoutInfo.decorationsLeft) {
				this.decorationsLeft = layoutInfo.decorationsLeft;
				dataSource.relayoutEditors();
			}
		}));
	}

	puBlic setEnaBleSplitViewResizing(enaBleSplitViewResizing: Boolean): void {
		// Nothing to do..
	}

	protected _getViewZones(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], modifiedForeignVZ: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor, renderIndicators: Boolean): IEditorsZones {
		let computer = new InlineViewZonesComputer(lineChanges, originalForeignVZ, modifiedForeignVZ, originalEditor, modifiedEditor, renderIndicators);
		return computer.getViewZones();
	}

	protected _getOriginalEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations {
		const overviewZoneColor = String(this._removeColor);

		let result: IEditorDiffDecorations = {
			decorations: [],
			overviewZones: []
		};

		for (let i = 0, length = lineChanges.length; i < length; i++) {
			let lineChange = lineChanges[i];

			// Add overview zones in the overview ruler
			if (isChangeOrDelete(lineChange)) {
				result.decorations.push({
					range: new Range(lineChange.originalStartLineNumBer, 1, lineChange.originalEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER),
					options: DECORATIONS.lineDeleteMargin
				});

				result.overviewZones.push(new OverviewRulerZone(
					lineChange.originalStartLineNumBer,
					lineChange.originalEndLineNumBer,
					overviewZoneColor
				));
			}
		}

		return result;
	}

	protected _getModifiedEditorDecorations(lineChanges: editorCommon.ILineChange[], ignoreTrimWhitespace: Boolean, renderIndicators: Boolean, originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor): IEditorDiffDecorations {
		const overviewZoneColor = String(this._insertColor);

		let result: IEditorDiffDecorations = {
			decorations: [],
			overviewZones: []
		};

		let modifiedModel = modifiedEditor.getModel()!;

		for (let i = 0, length = lineChanges.length; i < length; i++) {
			let lineChange = lineChanges[i];

			// Add decorations & overview zones
			if (isChangeOrInsert(lineChange)) {
				result.decorations.push({
					range: new Range(lineChange.modifiedStartLineNumBer, 1, lineChange.modifiedEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER),
					options: (renderIndicators ? DECORATIONS.lineInsertWithSign : DECORATIONS.lineInsert)
				});

				result.overviewZones.push(new OverviewRulerZone(
					lineChange.modifiedStartLineNumBer,
					lineChange.modifiedEndLineNumBer,
					overviewZoneColor
				));

				if (lineChange.charChanges) {
					for (let j = 0, lengthJ = lineChange.charChanges.length; j < lengthJ; j++) {
						let charChange = lineChange.charChanges[j];
						if (isChangeOrInsert(charChange)) {
							if (ignoreTrimWhitespace) {
								for (let lineNumBer = charChange.modifiedStartLineNumBer; lineNumBer <= charChange.modifiedEndLineNumBer; lineNumBer++) {
									let startColumn: numBer;
									let endColumn: numBer;
									if (lineNumBer === charChange.modifiedStartLineNumBer) {
										startColumn = charChange.modifiedStartColumn;
									} else {
										startColumn = modifiedModel.getLineFirstNonWhitespaceColumn(lineNumBer);
									}
									if (lineNumBer === charChange.modifiedEndLineNumBer) {
										endColumn = charChange.modifiedEndColumn;
									} else {
										endColumn = modifiedModel.getLineLastNonWhitespaceColumn(lineNumBer);
									}
									result.decorations.push(createDecoration(lineNumBer, startColumn, lineNumBer, endColumn, DECORATIONS.charInsert));
								}
							} else {
								result.decorations.push(createDecoration(charChange.modifiedStartLineNumBer, charChange.modifiedStartColumn, charChange.modifiedEndLineNumBer, charChange.modifiedEndColumn, DECORATIONS.charInsert));
							}
						}
					}
				} else {
					result.decorations.push(createDecoration(lineChange.modifiedStartLineNumBer, 1, lineChange.modifiedEndLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER, DECORATIONS.charInsertWholeLine));
				}
			}
		}

		return result;
	}

	puBlic layout(): numBer {
		// An editor should not Be smaller than 5px
		return Math.max(5, this.decorationsLeft);
	}

}

class InlineViewZonesComputer extends ViewZonesComputer {

	private readonly originalModel: ITextModel;
	private readonly modifiedEditorOptions: IComputedEditorOptions;
	private readonly modifiedEditorTaBSize: numBer;
	private readonly renderIndicators: Boolean;

	constructor(lineChanges: editorCommon.ILineChange[], originalForeignVZ: IEditorWhitespace[], modifiedForeignVZ: IEditorWhitespace[], originalEditor: editorBrowser.ICodeEditor, modifiedEditor: editorBrowser.ICodeEditor, renderIndicators: Boolean) {
		super(lineChanges, originalForeignVZ, originalEditor.getOption(EditorOption.lineHeight), modifiedForeignVZ, modifiedEditor.getOption(EditorOption.lineHeight));
		this.originalModel = originalEditor.getModel()!;
		this.modifiedEditorOptions = modifiedEditor.getOptions();
		this.modifiedEditorTaBSize = modifiedEditor.getModel()!.getOptions().taBSize;
		this.renderIndicators = renderIndicators;
	}

	protected _createOriginalMarginDomNodeForModifiedForeignViewZoneInAddedRegion(): HTMLDivElement | null {
		let result = document.createElement('div');
		result.className = 'inline-added-margin-view-zone';
		return result;
	}

	protected _produceOriginalFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null {
		let marginDomNode = document.createElement('div');
		marginDomNode.className = 'inline-added-margin-view-zone';

		return {
			afterLineNumBer: Math.max(lineChange.originalStartLineNumBer, lineChange.originalEndLineNumBer),
			heightInLines: lineChangeModifiedLength,
			domNode: document.createElement('div'),
			marginDomNode: marginDomNode
		};
	}

	protected _produceModifiedFromDiff(lineChange: editorCommon.ILineChange, lineChangeOriginalLength: numBer, lineChangeModifiedLength: numBer): IMyViewZone | null {
		let decorations: InlineDecoration[] = [];
		if (lineChange.charChanges) {
			for (let j = 0, lengthJ = lineChange.charChanges.length; j < lengthJ; j++) {
				let charChange = lineChange.charChanges[j];
				if (isChangeOrDelete(charChange)) {
					decorations.push(new InlineDecoration(
						new Range(charChange.originalStartLineNumBer, charChange.originalStartColumn, charChange.originalEndLineNumBer, charChange.originalEndColumn),
						'char-delete',
						InlineDecorationType.Regular
					));
				}
			}
		}

		let sB = createStringBuilder(10000);
		let marginDomNode = document.createElement('div');
		const layoutInfo = this.modifiedEditorOptions.get(EditorOption.layoutInfo);
		const fontInfo = this.modifiedEditorOptions.get(EditorOption.fontInfo);
		const lineDecorationsWidth = layoutInfo.decorationsWidth;

		let lineHeight = this.modifiedEditorOptions.get(EditorOption.lineHeight);
		const typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
		let maxCharsPerLine = 0;
		const originalContent: string[] = [];
		for (let lineNumBer = lineChange.originalStartLineNumBer; lineNumBer <= lineChange.originalEndLineNumBer; lineNumBer++) {
			maxCharsPerLine = Math.max(maxCharsPerLine, this._renderOriginalLine(lineNumBer - lineChange.originalStartLineNumBer, this.originalModel, this.modifiedEditorOptions, this.modifiedEditorTaBSize, lineNumBer, decorations, sB));
			originalContent.push(this.originalModel.getLineContent(lineNumBer));

			if (this.renderIndicators) {
				let index = lineNumBer - lineChange.originalStartLineNumBer;
				const marginElement = document.createElement('div');
				marginElement.className = `delete-sign ${diffRemoveIcon.classNames}`;
				marginElement.setAttriBute('style', `position:aBsolute;top:${index * lineHeight}px;width:${lineDecorationsWidth}px;height:${lineHeight}px;right:0;`);
				marginDomNode.appendChild(marginElement);
			}
		}
		maxCharsPerLine += this.modifiedEditorOptions.get(EditorOption.scrollBeyondLastColumn);

		let domNode = document.createElement('div');
		domNode.className = `view-lines line-delete ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`;
		domNode.innerHTML = sB.Build();
		Configuration.applyFontInfoSlow(domNode, fontInfo);

		marginDomNode.className = 'inline-deleted-margin-view-zone';
		Configuration.applyFontInfoSlow(marginDomNode, fontInfo);

		return {
			shouldNotShrink: true,
			afterLineNumBer: (lineChange.modifiedEndLineNumBer === 0 ? lineChange.modifiedStartLineNumBer : lineChange.modifiedStartLineNumBer - 1),
			heightInLines: lineChangeOriginalLength,
			minWidthInPx: (maxCharsPerLine * typicalHalfwidthCharacterWidth),
			domNode: domNode,
			marginDomNode: marginDomNode,
			diff: {
				originalStartLineNumBer: lineChange.originalStartLineNumBer,
				originalEndLineNumBer: lineChange.originalEndLineNumBer,
				modifiedStartLineNumBer: lineChange.modifiedStartLineNumBer,
				modifiedEndLineNumBer: lineChange.modifiedEndLineNumBer,
				originalContent: originalContent
			}
		};
	}

	private _renderOriginalLine(count: numBer, originalModel: ITextModel, options: IComputedEditorOptions, taBSize: numBer, lineNumBer: numBer, decorations: InlineDecoration[], sB: IStringBuilder): numBer {
		const lineTokens = originalModel.getLineTokens(lineNumBer);
		const lineContent = lineTokens.getLineContent();
		const fontInfo = options.get(EditorOption.fontInfo);

		const actualDecorations = LineDecoration.filter(decorations, lineNumBer, 1, lineContent.length + 1);

		sB.appendASCIIString('<div class="view-line');
		if (decorations.length === 0) {
			// No char changes
			sB.appendASCIIString(' char-delete');
		}
		sB.appendASCIIString('" style="top:');
		sB.appendASCIIString(String(count * options.get(EditorOption.lineHeight)));
		sB.appendASCIIString('px;width:1000000px;">');

		const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, originalModel.mightContainNonBasicASCII());
		const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, originalModel.mightContainRTL());
		const output = renderViewLine(new RenderLineInput(
			(fontInfo.isMonospace && !options.get(EditorOption.disaBleMonospaceOptimizations)),
			fontInfo.canUseHalfwidthRightwardsArrow,
			lineContent,
			false,
			isBasicASCII,
			containsRTL,
			0,
			lineTokens,
			actualDecorations,
			taBSize,
			0,
			fontInfo.spaceWidth,
			fontInfo.middotWidth,
			fontInfo.wsmiddotWidth,
			options.get(EditorOption.stopRenderingLineAfter),
			options.get(EditorOption.renderWhitespace),
			options.get(EditorOption.renderControlCharacters),
			options.get(EditorOption.fontLigatures) !== EditorFontLigatures.OFF,
			null // Send no selections, original line cannot Be selected
		), sB);

		sB.appendASCIIString('</div>');

		const aBsoluteOffsets = output.characterMapping.getABsoluteOffsets();
		return aBsoluteOffsets.length > 0 ? aBsoluteOffsets[aBsoluteOffsets.length - 1] : 0;
	}
}

export function isChangeOrInsert(lineChange: editorCommon.IChange): Boolean {
	return lineChange.modifiedEndLineNumBer > 0;
}

export function isChangeOrDelete(lineChange: editorCommon.IChange): Boolean {
	return lineChange.originalEndLineNumBer > 0;
}

function createFakeLinesDiv(): HTMLElement {
	let r = document.createElement('div');
	r.className = 'diagonal-fill';
	return r;
}

registerThemingParticipant((theme, collector) => {
	const added = theme.getColor(diffInserted);
	if (added) {
		collector.addRule(`.monaco-editor .line-insert, .monaco-editor .char-insert { Background-color: ${added}; }`);
		collector.addRule(`.monaco-diff-editor .line-insert, .monaco-diff-editor .char-insert { Background-color: ${added}; }`);
		collector.addRule(`.monaco-editor .inline-added-margin-view-zone { Background-color: ${added}; }`);
	}

	const removed = theme.getColor(diffRemoved);
	if (removed) {
		collector.addRule(`.monaco-editor .line-delete, .monaco-editor .char-delete { Background-color: ${removed}; }`);
		collector.addRule(`.monaco-diff-editor .line-delete, .monaco-diff-editor .char-delete { Background-color: ${removed}; }`);
		collector.addRule(`.monaco-editor .inline-deleted-margin-view-zone { Background-color: ${removed}; }`);
	}

	const addedOutline = theme.getColor(diffInsertedOutline);
	if (addedOutline) {
		collector.addRule(`.monaco-editor .line-insert, .monaco-editor .char-insert { Border: 1px ${theme.type === 'hc' ? 'dashed' : 'solid'} ${addedOutline}; }`);
	}

	const removedOutline = theme.getColor(diffRemovedOutline);
	if (removedOutline) {
		collector.addRule(`.monaco-editor .line-delete, .monaco-editor .char-delete { Border: 1px ${theme.type === 'hc' ? 'dashed' : 'solid'} ${removedOutline}; }`);
	}

	const shadow = theme.getColor(scrollBarShadow);
	if (shadow) {
		collector.addRule(`.monaco-diff-editor.side-By-side .editor.modified { Box-shadow: -6px 0 5px -5px ${shadow}; }`);
	}

	const Border = theme.getColor(diffBorder);
	if (Border) {
		collector.addRule(`.monaco-diff-editor.side-By-side .editor.modified { Border-left: 1px solid ${Border}; }`);
	}

	const scrollBarSliderBackgroundColor = theme.getColor(scrollBarSliderBackground);
	if (scrollBarSliderBackgroundColor) {
		collector.addRule(`
			.monaco-diff-editor .diffViewport {
				Background: ${scrollBarSliderBackgroundColor};
			}
		`);
	}

	const scrollBarSliderHoverBackgroundColor = theme.getColor(scrollBarSliderHoverBackground);
	if (scrollBarSliderHoverBackgroundColor) {
		collector.addRule(`
			.monaco-diff-editor .diffViewport:hover {
				Background: ${scrollBarSliderHoverBackgroundColor};
			}
		`);
	}

	const scrollBarSliderActiveBackgroundColor = theme.getColor(scrollBarSliderActiveBackground);
	if (scrollBarSliderActiveBackgroundColor) {
		collector.addRule(`
			.monaco-diff-editor .diffViewport:active {
				Background: ${scrollBarSliderActiveBackgroundColor};
			}
		`);
	}

	const diffDiagonalFillColor = theme.getColor(diffDiagonalFill);
	collector.addRule(`
	.monaco-editor .diagonal-fill {
		Background-image: linear-gradient(
			-45deg,
			${diffDiagonalFillColor} 12.5%,
			#0000 12.5%, #0000 50%,
			${diffDiagonalFillColor} 50%, ${diffDiagonalFillColor} 62.5%,
			#0000 62.5%, #0000 100%
		);
		Background-size: 8px 8px;
	}
	`);
});
