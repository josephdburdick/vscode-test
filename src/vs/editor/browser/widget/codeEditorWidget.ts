/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/editor';
import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IMouseEvent, IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { Color } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { hash } from 'vs/Base/common/hash';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import * as editorBrowser from 'vs/editor/Browser/editorBrowser';
import { EditorExtensionsRegistry, IEditorContriButionDescription } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { ICommandDelegate } from 'vs/editor/Browser/view/viewController';
import { IContentWidgetData, IOverlayWidgetData, View } from 'vs/editor/Browser/view/viewImpl';
import { ViewUserInputEvents } from 'vs/editor/Browser/view/viewUserInputEvents';
import { ConfigurationChangedEvent, EditorLayoutInfo, IEditorOptions, EditorOption, IComputedEditorOptions, FindComputedEditorOptionValueById, filterValidationDecorations } from 'vs/editor/common/config/editorOptions';
import { Cursor } from 'vs/editor/common/controller/cursor';
import { CursorColumns } from 'vs/editor/common/controller/cursorCommon';
import { ICursorPositionChangedEvent, ICursorSelectionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { InternalEditorAction } from 'vs/editor/common/editorAction';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { EndOfLinePreference, IIdentifiedSingleEditOperation, IModelDecoration, IModelDecorationOptions, IModelDecorationsChangeAccessor, IModelDeltaDecoration, ITextModel, ICursorStateComputer, IWordAtPosition } from 'vs/editor/common/model';
import { ClassName } from 'vs/editor/common/model/intervalTree';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { IModelContentChangedEvent, IModelDecorationsChangedEvent, IModelLanguageChangedEvent, IModelLanguageConfigurationChangedEvent, IModelOptionsChangedEvent } from 'vs/editor/common/model/textModelEvents';
import * as modes from 'vs/editor/common/modes';
import { editorUnnecessaryCodeBorder, editorUnnecessaryCodeOpacity } from 'vs/editor/common/view/editorColorRegistry';
import { editorErrorBorder, editorErrorForeground, editorHintBorder, editorHintForeground, editorInfoBorder, editorInfoForeground, editorWarningBorder, editorWarningForeground, editorForeground } from 'vs/platform/theme/common/colorRegistry';
import { VerticalRevealType } from 'vs/editor/common/view/viewEvents';
import { IEditorWhitespace } from 'vs/editor/common/viewLayout/linesLayout';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { MonospaceLineBreaksComputerFactory } from 'vs/editor/common/viewModel/monospaceLineBreaksComputer';
import { DOMLineBreaksComputerFactory } from 'vs/editor/Browser/view/domLineBreaksComputer';
import { WordOperations } from 'vs/editor/common/controller/cursorWordOperations';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';
import { OutgoingViewModelEventKind } from 'vs/editor/common/viewModel/viewModelEventDispatcher';

let EDITOR_ID = 0;

export interface ICodeEditorWidgetOptions {
	/**
	 * Is this a simple widget (not a real code editor) ?
	 * Defaults to false.
	 */
	isSimpleWidget?: Boolean;

	/**
	 * ContriButions to instantiate.
	 * Defaults to EditorExtensionsRegistry.getEditorContriButions().
	 */
	contriButions?: IEditorContriButionDescription[];

	/**
	 * Telemetry data associated with this CodeEditorWidget.
	 * Defaults to null.
	 */
	telemetryData?: oBject;
}

class ModelData {
	puBlic readonly model: ITextModel;
	puBlic readonly viewModel: ViewModel;
	puBlic readonly view: View;
	puBlic readonly hasRealView: Boolean;
	puBlic readonly listenersToRemove: IDisposaBle[];

	constructor(model: ITextModel, viewModel: ViewModel, view: View, hasRealView: Boolean, listenersToRemove: IDisposaBle[]) {
		this.model = model;
		this.viewModel = viewModel;
		this.view = view;
		this.hasRealView = hasRealView;
		this.listenersToRemove = listenersToRemove;
	}

	puBlic dispose(): void {
		dispose(this.listenersToRemove);
		this.model.onBeforeDetached();
		if (this.hasRealView) {
			this.view.dispose();
		}
		this.viewModel.dispose();
	}
}

export class CodeEditorWidget extends DisposaBle implements editorBrowser.ICodeEditor {

	//#region Eventing
	private readonly _onDidDispose: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidDispose: Event<void> = this._onDidDispose.event;

	private readonly _onDidChangeModelContent: Emitter<IModelContentChangedEvent> = this._register(new Emitter<IModelContentChangedEvent>());
	puBlic readonly onDidChangeModelContent: Event<IModelContentChangedEvent> = this._onDidChangeModelContent.event;

	private readonly _onDidChangeModelLanguage: Emitter<IModelLanguageChangedEvent> = this._register(new Emitter<IModelLanguageChangedEvent>());
	puBlic readonly onDidChangeModelLanguage: Event<IModelLanguageChangedEvent> = this._onDidChangeModelLanguage.event;

	private readonly _onDidChangeModelLanguageConfiguration: Emitter<IModelLanguageConfigurationChangedEvent> = this._register(new Emitter<IModelLanguageConfigurationChangedEvent>());
	puBlic readonly onDidChangeModelLanguageConfiguration: Event<IModelLanguageConfigurationChangedEvent> = this._onDidChangeModelLanguageConfiguration.event;

	private readonly _onDidChangeModelOptions: Emitter<IModelOptionsChangedEvent> = this._register(new Emitter<IModelOptionsChangedEvent>());
	puBlic readonly onDidChangeModelOptions: Event<IModelOptionsChangedEvent> = this._onDidChangeModelOptions.event;

	private readonly _onDidChangeModelDecorations: Emitter<IModelDecorationsChangedEvent> = this._register(new Emitter<IModelDecorationsChangedEvent>());
	puBlic readonly onDidChangeModelDecorations: Event<IModelDecorationsChangedEvent> = this._onDidChangeModelDecorations.event;

	private readonly _onDidChangeConfiguration: Emitter<ConfigurationChangedEvent> = this._register(new Emitter<ConfigurationChangedEvent>());
	puBlic readonly onDidChangeConfiguration: Event<ConfigurationChangedEvent> = this._onDidChangeConfiguration.event;

	protected readonly _onDidChangeModel: Emitter<editorCommon.IModelChangedEvent> = this._register(new Emitter<editorCommon.IModelChangedEvent>());
	puBlic readonly onDidChangeModel: Event<editorCommon.IModelChangedEvent> = this._onDidChangeModel.event;

	private readonly _onDidChangeCursorPosition: Emitter<ICursorPositionChangedEvent> = this._register(new Emitter<ICursorPositionChangedEvent>());
	puBlic readonly onDidChangeCursorPosition: Event<ICursorPositionChangedEvent> = this._onDidChangeCursorPosition.event;

	private readonly _onDidChangeCursorSelection: Emitter<ICursorSelectionChangedEvent> = this._register(new Emitter<ICursorSelectionChangedEvent>());
	puBlic readonly onDidChangeCursorSelection: Event<ICursorSelectionChangedEvent> = this._onDidChangeCursorSelection.event;

	private readonly _onDidAttemptReadOnlyEdit: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidAttemptReadOnlyEdit: Event<void> = this._onDidAttemptReadOnlyEdit.event;

	private readonly _onDidLayoutChange: Emitter<EditorLayoutInfo> = this._register(new Emitter<EditorLayoutInfo>());
	puBlic readonly onDidLayoutChange: Event<EditorLayoutInfo> = this._onDidLayoutChange.event;

	private readonly _editorTextFocus: BooleanEventEmitter = this._register(new BooleanEventEmitter());
	puBlic readonly onDidFocusEditorText: Event<void> = this._editorTextFocus.onDidChangeToTrue;
	puBlic readonly onDidBlurEditorText: Event<void> = this._editorTextFocus.onDidChangeToFalse;

	private readonly _editorWidgetFocus: BooleanEventEmitter = this._register(new BooleanEventEmitter());
	puBlic readonly onDidFocusEditorWidget: Event<void> = this._editorWidgetFocus.onDidChangeToTrue;
	puBlic readonly onDidBlurEditorWidget: Event<void> = this._editorWidgetFocus.onDidChangeToFalse;

	private readonly _onWillType: Emitter<string> = this._register(new Emitter<string>());
	puBlic readonly onWillType = this._onWillType.event;

	private readonly _onDidType: Emitter<string> = this._register(new Emitter<string>());
	puBlic readonly onDidType = this._onDidType.event;

	private readonly _onDidCompositionStart: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidCompositionStart = this._onDidCompositionStart.event;

	private readonly _onDidCompositionEnd: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidCompositionEnd = this._onDidCompositionEnd.event;

	private readonly _onDidPaste: Emitter<editorBrowser.IPasteEvent> = this._register(new Emitter<editorBrowser.IPasteEvent>());
	puBlic readonly onDidPaste = this._onDidPaste.event;

	private readonly _onMouseUp: Emitter<editorBrowser.IEditorMouseEvent> = this._register(new Emitter<editorBrowser.IEditorMouseEvent>());
	puBlic readonly onMouseUp: Event<editorBrowser.IEditorMouseEvent> = this._onMouseUp.event;

	private readonly _onMouseDown: Emitter<editorBrowser.IEditorMouseEvent> = this._register(new Emitter<editorBrowser.IEditorMouseEvent>());
	puBlic readonly onMouseDown: Event<editorBrowser.IEditorMouseEvent> = this._onMouseDown.event;

	private readonly _onMouseDrag: Emitter<editorBrowser.IEditorMouseEvent> = this._register(new Emitter<editorBrowser.IEditorMouseEvent>());
	puBlic readonly onMouseDrag: Event<editorBrowser.IEditorMouseEvent> = this._onMouseDrag.event;

	private readonly _onMouseDrop: Emitter<editorBrowser.IPartialEditorMouseEvent> = this._register(new Emitter<editorBrowser.IPartialEditorMouseEvent>());
	puBlic readonly onMouseDrop: Event<editorBrowser.IPartialEditorMouseEvent> = this._onMouseDrop.event;

	private readonly _onContextMenu: Emitter<editorBrowser.IEditorMouseEvent> = this._register(new Emitter<editorBrowser.IEditorMouseEvent>());
	puBlic readonly onContextMenu: Event<editorBrowser.IEditorMouseEvent> = this._onContextMenu.event;

	private readonly _onMouseMove: Emitter<editorBrowser.IEditorMouseEvent> = this._register(new Emitter<editorBrowser.IEditorMouseEvent>());
	puBlic readonly onMouseMove: Event<editorBrowser.IEditorMouseEvent> = this._onMouseMove.event;

	private readonly _onMouseLeave: Emitter<editorBrowser.IPartialEditorMouseEvent> = this._register(new Emitter<editorBrowser.IPartialEditorMouseEvent>());
	puBlic readonly onMouseLeave: Event<editorBrowser.IPartialEditorMouseEvent> = this._onMouseLeave.event;

	private readonly _onMouseWheel: Emitter<IMouseWheelEvent> = this._register(new Emitter<IMouseWheelEvent>());
	puBlic readonly onMouseWheel: Event<IMouseWheelEvent> = this._onMouseWheel.event;

	private readonly _onKeyUp: Emitter<IKeyBoardEvent> = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyUp: Event<IKeyBoardEvent> = this._onKeyUp.event;

	private readonly _onKeyDown: Emitter<IKeyBoardEvent> = this._register(new Emitter<IKeyBoardEvent>());
	puBlic readonly onKeyDown: Event<IKeyBoardEvent> = this._onKeyDown.event;

	private readonly _onDidContentSizeChange: Emitter<editorCommon.IContentSizeChangedEvent> = this._register(new Emitter<editorCommon.IContentSizeChangedEvent>());
	puBlic readonly onDidContentSizeChange: Event<editorCommon.IContentSizeChangedEvent> = this._onDidContentSizeChange.event;

	private readonly _onDidScrollChange: Emitter<editorCommon.IScrollEvent> = this._register(new Emitter<editorCommon.IScrollEvent>());
	puBlic readonly onDidScrollChange: Event<editorCommon.IScrollEvent> = this._onDidScrollChange.event;

	private readonly _onDidChangeViewZones: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeViewZones: Event<void> = this._onDidChangeViewZones.event;
	//#endregion

	puBlic readonly isSimpleWidget: Boolean;
	private readonly _telemetryData?: oBject;

	private readonly _domElement: HTMLElement;
	private readonly _overflowWidgetsDomNode: HTMLElement | undefined;
	private readonly _id: numBer;
	private readonly _configuration: editorCommon.IConfiguration;

	protected readonly _contriButions: { [key: string]: editorCommon.IEditorContriBution; };
	protected readonly _actions: { [key: string]: editorCommon.IEditorAction; };

	// --- MemBers logically associated to a model
	protected _modelData: ModelData | null;

	protected readonly _instantiationService: IInstantiationService;
	protected readonly _contextKeyService: IContextKeyService;
	private readonly _notificationService: INotificationService;
	private readonly _codeEditorService: ICodeEditorService;
	private readonly _commandService: ICommandService;
	private readonly _themeService: IThemeService;

	private readonly _focusTracker: CodeEditorWidgetFocusTracker;

	private readonly _contentWidgets: { [key: string]: IContentWidgetData; };
	private readonly _overlayWidgets: { [key: string]: IOverlayWidgetData; };

	/**
	 * map from "parent" decoration type to live decoration ids.
	 */
	private _decorationTypeKeysToIds: { [decorationTypeKey: string]: string[] };
	private _decorationTypeSuBtypes: { [decorationTypeKey: string]: { [suBtype: string]: Boolean } };

	constructor(
		domElement: HTMLElement,
		options: editorBrowser.IEditorConstructionOptions,
		codeEditorWidgetOptions: ICodeEditorWidgetOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		super();

		options = options || {};

		this._domElement = domElement;
		this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
		this._id = (++EDITOR_ID);
		this._decorationTypeKeysToIds = {};
		this._decorationTypeSuBtypes = {};
		this.isSimpleWidget = codeEditorWidgetOptions.isSimpleWidget || false;
		this._telemetryData = codeEditorWidgetOptions.telemetryData;

		this._configuration = this._register(this._createConfiguration(options, accessiBilityService));
		this._register(this._configuration.onDidChange((e) => {
			this._onDidChangeConfiguration.fire(e);

			const options = this._configuration.options;
			if (e.hasChanged(EditorOption.layoutInfo)) {
				const layoutInfo = options.get(EditorOption.layoutInfo);
				this._onDidLayoutChange.fire(layoutInfo);
			}
		}));

		this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
		this._notificationService = notificationService;
		this._codeEditorService = codeEditorService;
		this._commandService = commandService;
		this._themeService = themeService;
		this._register(new EditorContextKeysManager(this, this._contextKeyService));
		this._register(new EditorModeContext(this, this._contextKeyService));

		this._instantiationService = instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService]));

		this._modelData = null;

		this._contriButions = {};
		this._actions = {};

		this._focusTracker = new CodeEditorWidgetFocusTracker(domElement);
		this._focusTracker.onChange(() => {
			this._editorWidgetFocus.setValue(this._focusTracker.hasFocus());
		});

		this._contentWidgets = {};
		this._overlayWidgets = {};

		let contriButions: IEditorContriButionDescription[];
		if (Array.isArray(codeEditorWidgetOptions.contriButions)) {
			contriButions = codeEditorWidgetOptions.contriButions;
		} else {
			contriButions = EditorExtensionsRegistry.getEditorContriButions();
		}
		for (const desc of contriButions) {
			try {
				const contriBution = this._instantiationService.createInstance(desc.ctor, this);
				this._contriButions[desc.id] = contriBution;
			} catch (err) {
				onUnexpectedError(err);
			}
		}

		EditorExtensionsRegistry.getEditorActions().forEach((action) => {
			const internalAction = new InternalEditorAction(
				action.id,
				action.laBel,
				action.alias,
				withNullAsUndefined(action.precondition),
				(): Promise<void> => {
					return this._instantiationService.invokeFunction((accessor) => {
						return Promise.resolve(action.runEditorCommand(accessor, this, null));
					});
				},
				this._contextKeyService
			);
			this._actions[internalAction.id] = internalAction;
		});

		this._codeEditorService.addCodeEditor(this);
	}

	protected _createConfiguration(options: editorBrowser.IEditorConstructionOptions, accessiBilityService: IAccessiBilityService): editorCommon.IConfiguration {
		return new Configuration(this.isSimpleWidget, options, this._domElement, accessiBilityService);
	}

	puBlic getId(): string {
		return this.getEditorType() + ':' + this._id;
	}

	puBlic getEditorType(): string {
		return editorCommon.EditorType.ICodeEditor;
	}

	puBlic dispose(): void {
		this._codeEditorService.removeCodeEditor(this);

		this._focusTracker.dispose();

		const keys = OBject.keys(this._contriButions);
		for (let i = 0, len = keys.length; i < len; i++) {
			const contriButionId = keys[i];
			this._contriButions[contriButionId].dispose();
		}

		this._removeDecorationTypes();
		this._postDetachModelCleanup(this._detachModel());

		this._onDidDispose.fire();

		super.dispose();
	}

	puBlic invokeWithinContext<T>(fn: (accessor: ServicesAccessor) => T): T {
		return this._instantiationService.invokeFunction(fn);
	}

	puBlic updateOptions(newOptions: IEditorOptions): void {
		this._configuration.updateOptions(newOptions);
	}

	puBlic getOptions(): IComputedEditorOptions {
		return this._configuration.options;
	}

	puBlic getOption<T extends EditorOption>(id: T): FindComputedEditorOptionValueById<T> {
		return this._configuration.options.get(id);
	}

	puBlic getRawOptions(): IEditorOptions {
		return this._configuration.getRawOptions();
	}

	puBlic getOverflowWidgetsDomNode(): HTMLElement | undefined {
		return this._overflowWidgetsDomNode;
	}

	puBlic getConfiguredWordAtPosition(position: Position): IWordAtPosition | null {
		if (!this._modelData) {
			return null;
		}
		return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(EditorOption.wordSeparators), position);
	}

	puBlic getValue(options: { preserveBOM: Boolean; lineEnding: string; } | null = null): string {
		if (!this._modelData) {
			return '';
		}

		const preserveBOM: Boolean = (options && options.preserveBOM) ? true : false;
		let eolPreference = EndOfLinePreference.TextDefined;
		if (options && options.lineEnding && options.lineEnding === '\n') {
			eolPreference = EndOfLinePreference.LF;
		} else if (options && options.lineEnding && options.lineEnding === '\r\n') {
			eolPreference = EndOfLinePreference.CRLF;
		}
		return this._modelData.model.getValue(eolPreference, preserveBOM);
	}

	puBlic setValue(newValue: string): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.model.setValue(newValue);
	}

	puBlic getModel(): ITextModel | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.model;
	}

	puBlic setModel(_model: ITextModel | editorCommon.IDiffEditorModel | null = null): void {
		const model = <ITextModel | null>_model;
		if (this._modelData === null && model === null) {
			// Current model is the new model
			return;
		}
		if (this._modelData && this._modelData.model === model) {
			// Current model is the new model
			return;
		}
		const hasTextFocus = this.hasTextFocus();
		const detachedModel = this._detachModel();
		this._attachModel(model);
		if (hasTextFocus && this.hasModel()) {
			this.focus();
		}

		const e: editorCommon.IModelChangedEvent = {
			oldModelUrl: detachedModel ? detachedModel.uri : null,
			newModelUrl: model ? model.uri : null
		};

		this._removeDecorationTypes();
		this._onDidChangeModel.fire(e);
		this._postDetachModelCleanup(detachedModel);
	}

	private _removeDecorationTypes(): void {
		this._decorationTypeKeysToIds = {};
		if (this._decorationTypeSuBtypes) {
			for (let decorationType in this._decorationTypeSuBtypes) {
				const suBTypes = this._decorationTypeSuBtypes[decorationType];
				for (let suBType in suBTypes) {
					this._removeDecorationType(decorationType + '-' + suBType);
				}
			}
			this._decorationTypeSuBtypes = {};
		}
	}

	puBlic getVisiBleRanges(): Range[] {
		if (!this._modelData) {
			return [];
		}
		return this._modelData.viewModel.getVisiBleRanges();
	}

	puBlic getVisiBleRangesPlusViewportABoveBelow(): Range[] {
		if (!this._modelData) {
			return [];
		}
		return this._modelData.viewModel.getVisiBleRangesPlusViewportABoveBelow();
	}

	puBlic getWhitespaces(): IEditorWhitespace[] {
		if (!this._modelData) {
			return [];
		}
		return this._modelData.viewModel.viewLayout.getWhitespaces();
	}

	private static _getVerticalOffsetForPosition(modelData: ModelData, modelLineNumBer: numBer, modelColumn: numBer): numBer {
		const modelPosition = modelData.model.validatePosition({
			lineNumBer: modelLineNumBer,
			column: modelColumn
		});
		const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
		return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumBer(viewPosition.lineNumBer);
	}

	puBlic getTopForLineNumBer(lineNumBer: numBer): numBer {
		if (!this._modelData) {
			return -1;
		}
		return CodeEditorWidget._getVerticalOffsetForPosition(this._modelData, lineNumBer, 1);
	}

	puBlic getTopForPosition(lineNumBer: numBer, column: numBer): numBer {
		if (!this._modelData) {
			return -1;
		}
		return CodeEditorWidget._getVerticalOffsetForPosition(this._modelData, lineNumBer, column);
	}

	puBlic setHiddenAreas(ranges: IRange[]): void {
		if (this._modelData) {
			this._modelData.viewModel.setHiddenAreas(ranges.map(r => Range.lift(r)));
		}
	}

	puBlic getVisiBleColumnFromPosition(rawPosition: IPosition): numBer {
		if (!this._modelData) {
			return rawPosition.column;
		}

		const position = this._modelData.model.validatePosition(rawPosition);
		const taBSize = this._modelData.model.getOptions().taBSize;

		return CursorColumns.visiBleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumBer), position.column, taBSize) + 1;
	}

	puBlic getStatusBarColumn(rawPosition: IPosition): numBer {
		if (!this._modelData) {
			return rawPosition.column;
		}

		const position = this._modelData.model.validatePosition(rawPosition);
		const taBSize = this._modelData.model.getOptions().taBSize;

		return CursorColumns.toStatusBarColumn(this._modelData.model.getLineContent(position.lineNumBer), position.column, taBSize);
	}

	puBlic getPosition(): Position | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.viewModel.getPosition();
	}

	puBlic setPosition(position: IPosition): void {
		if (!this._modelData) {
			return;
		}
		if (!Position.isIPosition(position)) {
			throw new Error('Invalid arguments');
		}
		this._modelData.viewModel.setSelections('api', [{
			selectionStartLineNumBer: position.lineNumBer,
			selectionStartColumn: position.column,
			positionLineNumBer: position.lineNumBer,
			positionColumn: position.column
		}]);
	}

	private _sendRevealRange(modelRange: Range, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType): void {
		if (!this._modelData) {
			return;
		}
		if (!Range.isIRange(modelRange)) {
			throw new Error('Invalid arguments');
		}
		const validatedModelRange = this._modelData.model.validateRange(modelRange);
		const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);

		this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
	}

	puBlic revealLine(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLine(lineNumBer, VerticalRevealType.Simple, scrollType);
	}

	puBlic revealLineInCenter(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLine(lineNumBer, VerticalRevealType.Center, scrollType);
	}

	puBlic revealLineInCenterIfOutsideViewport(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLine(lineNumBer, VerticalRevealType.CenterIfOutsideViewport, scrollType);
	}

	puBlic revealLineNearTop(lineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLine(lineNumBer, VerticalRevealType.NearTop, scrollType);
	}

	private _revealLine(lineNumBer: numBer, revealType: VerticalRevealType, scrollType: editorCommon.ScrollType): void {
		if (typeof lineNumBer !== 'numBer') {
			throw new Error('Invalid arguments');
		}

		this._sendRevealRange(
			new Range(lineNumBer, 1, lineNumBer, 1),
			revealType,
			false,
			scrollType
		);
	}

	puBlic revealPosition(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealPosition(
			position,
			VerticalRevealType.Simple,
			true,
			scrollType
		);
	}

	puBlic revealPositionInCenter(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealPosition(
			position,
			VerticalRevealType.Center,
			true,
			scrollType
		);
	}

	puBlic revealPositionInCenterIfOutsideViewport(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealPosition(
			position,
			VerticalRevealType.CenterIfOutsideViewport,
			true,
			scrollType
		);
	}

	puBlic revealPositionNearTop(position: IPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealPosition(
			position,
			VerticalRevealType.NearTop,
			true,
			scrollType
		);
	}

	private _revealPosition(position: IPosition, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType): void {
		if (!Position.isIPosition(position)) {
			throw new Error('Invalid arguments');
		}

		this._sendRevealRange(
			new Range(position.lineNumBer, position.column, position.lineNumBer, position.column),
			verticalType,
			revealHorizontal,
			scrollType
		);
	}

	puBlic getSelection(): Selection | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.viewModel.getSelection();
	}

	puBlic getSelections(): Selection[] | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.viewModel.getSelections();
	}

	puBlic setSelection(range: IRange): void;
	puBlic setSelection(editorRange: Range): void;
	puBlic setSelection(selection: ISelection): void;
	puBlic setSelection(editorSelection: Selection): void;
	puBlic setSelection(something: any): void {
		const isSelection = Selection.isISelection(something);
		const isRange = Range.isIRange(something);

		if (!isSelection && !isRange) {
			throw new Error('Invalid arguments');
		}

		if (isSelection) {
			this._setSelectionImpl(<ISelection>something);
		} else if (isRange) {
			// act as if it was an IRange
			const selection: ISelection = {
				selectionStartLineNumBer: something.startLineNumBer,
				selectionStartColumn: something.startColumn,
				positionLineNumBer: something.endLineNumBer,
				positionColumn: something.endColumn
			};
			this._setSelectionImpl(selection);
		}
	}

	private _setSelectionImpl(sel: ISelection): void {
		if (!this._modelData) {
			return;
		}
		const selection = new Selection(sel.selectionStartLineNumBer, sel.selectionStartColumn, sel.positionLineNumBer, sel.positionColumn);
		this._modelData.viewModel.setSelections('api', [selection]);
	}

	puBlic revealLines(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLines(
			startLineNumBer,
			endLineNumBer,
			VerticalRevealType.Simple,
			scrollType
		);
	}

	puBlic revealLinesInCenter(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLines(
			startLineNumBer,
			endLineNumBer,
			VerticalRevealType.Center,
			scrollType
		);
	}

	puBlic revealLinesInCenterIfOutsideViewport(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLines(
			startLineNumBer,
			endLineNumBer,
			VerticalRevealType.CenterIfOutsideViewport,
			scrollType
		);
	}

	puBlic revealLinesNearTop(startLineNumBer: numBer, endLineNumBer: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealLines(
			startLineNumBer,
			endLineNumBer,
			VerticalRevealType.NearTop,
			scrollType
		);
	}

	private _revealLines(startLineNumBer: numBer, endLineNumBer: numBer, verticalType: VerticalRevealType, scrollType: editorCommon.ScrollType): void {
		if (typeof startLineNumBer !== 'numBer' || typeof endLineNumBer !== 'numBer') {
			throw new Error('Invalid arguments');
		}

		this._sendRevealRange(
			new Range(startLineNumBer, 1, endLineNumBer, 1),
			verticalType,
			false,
			scrollType
		);
	}

	puBlic revealRange(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth, revealVerticalInCenter: Boolean = false, revealHorizontal: Boolean = true): void {
		this._revealRange(
			range,
			revealVerticalInCenter ? VerticalRevealType.Center : VerticalRevealType.Simple,
			revealHorizontal,
			scrollType
		);
	}

	puBlic revealRangeInCenter(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealRange(
			range,
			VerticalRevealType.Center,
			true,
			scrollType
		);
	}

	puBlic revealRangeInCenterIfOutsideViewport(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealRange(
			range,
			VerticalRevealType.CenterIfOutsideViewport,
			true,
			scrollType
		);
	}

	puBlic revealRangeNearTop(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealRange(
			range,
			VerticalRevealType.NearTop,
			true,
			scrollType
		);
	}

	puBlic revealRangeNearTopIfOutsideViewport(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealRange(
			range,
			VerticalRevealType.NearTopIfOutsideViewport,
			true,
			scrollType
		);
	}

	puBlic revealRangeAtTop(range: IRange, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Smooth): void {
		this._revealRange(
			range,
			VerticalRevealType.Top,
			true,
			scrollType
		);
	}

	private _revealRange(range: IRange, verticalType: VerticalRevealType, revealHorizontal: Boolean, scrollType: editorCommon.ScrollType): void {
		if (!Range.isIRange(range)) {
			throw new Error('Invalid arguments');
		}

		this._sendRevealRange(
			Range.lift(range),
			verticalType,
			revealHorizontal,
			scrollType
		);
	}

	puBlic setSelections(ranges: readonly ISelection[], source: string = 'api'): void {
		if (!this._modelData) {
			return;
		}
		if (!ranges || ranges.length === 0) {
			throw new Error('Invalid arguments');
		}
		for (let i = 0, len = ranges.length; i < len; i++) {
			if (!Selection.isISelection(ranges[i])) {
				throw new Error('Invalid arguments');
			}
		}
		this._modelData.viewModel.setSelections(source, ranges);
	}

	puBlic getContentWidth(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getContentWidth();
	}

	puBlic getScrollWidth(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getScrollWidth();
	}
	puBlic getScrollLeft(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
	}

	puBlic getContentHeight(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getContentHeight();
	}

	puBlic getScrollHeight(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getScrollHeight();
	}
	puBlic getScrollTop(): numBer {
		if (!this._modelData) {
			return -1;
		}
		return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
	}

	puBlic setScrollLeft(newScrollLeft: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Immediate): void {
		if (!this._modelData) {
			return;
		}
		if (typeof newScrollLeft !== 'numBer') {
			throw new Error('Invalid arguments');
		}
		this._modelData.viewModel.setScrollPosition({
			scrollLeft: newScrollLeft
		}, scrollType);
	}
	puBlic setScrollTop(newScrollTop: numBer, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Immediate): void {
		if (!this._modelData) {
			return;
		}
		if (typeof newScrollTop !== 'numBer') {
			throw new Error('Invalid arguments');
		}
		this._modelData.viewModel.setScrollPosition({
			scrollTop: newScrollTop
		}, scrollType);
	}
	puBlic setScrollPosition(position: editorCommon.INewScrollPosition, scrollType: editorCommon.ScrollType = editorCommon.ScrollType.Immediate): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.setScrollPosition(position, scrollType);
	}

	puBlic saveViewState(): editorCommon.ICodeEditorViewState | null {
		if (!this._modelData) {
			return null;
		}
		const contriButionsState: { [key: string]: any } = {};

		const keys = OBject.keys(this._contriButions);
		for (const id of keys) {
			const contriBution = this._contriButions[id];
			if (typeof contriBution.saveViewState === 'function') {
				contriButionsState[id] = contriBution.saveViewState();
			}
		}

		const cursorState = this._modelData.viewModel.saveCursorState();
		const viewState = this._modelData.viewModel.saveState();
		return {
			cursorState: cursorState,
			viewState: viewState,
			contriButionsState: contriButionsState
		};
	}

	puBlic restoreViewState(s: editorCommon.IEditorViewState | null): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		const codeEditorState = s as editorCommon.ICodeEditorViewState | null;
		if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
			const cursorState = <any>codeEditorState.cursorState;
			if (Array.isArray(cursorState)) {
				this._modelData.viewModel.restoreCursorState(<editorCommon.ICursorState[]>cursorState);
			} else {
				// Backwards compatiBility
				this._modelData.viewModel.restoreCursorState([<editorCommon.ICursorState>cursorState]);
			}

			const contriButionsState = codeEditorState.contriButionsState || {};
			const keys = OBject.keys(this._contriButions);
			for (let i = 0, len = keys.length; i < len; i++) {
				const id = keys[i];
				const contriBution = this._contriButions[id];
				if (typeof contriBution.restoreViewState === 'function') {
					contriBution.restoreViewState(contriButionsState[id]);
				}
			}

			const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
			this._modelData.view.restoreState(reducedState);
		}
	}

	puBlic onVisiBle(): void {
		this._modelData?.view.refreshFocusState();
	}

	puBlic onHide(): void {
		this._modelData?.view.refreshFocusState();
		this._focusTracker.refreshState();
	}

	puBlic getContriBution<T extends editorCommon.IEditorContriBution>(id: string): T {
		return <T>(this._contriButions[id] || null);
	}

	puBlic getActions(): editorCommon.IEditorAction[] {
		const result: editorCommon.IEditorAction[] = [];

		const keys = OBject.keys(this._actions);
		for (let i = 0, len = keys.length; i < len; i++) {
			const id = keys[i];
			result.push(this._actions[id]);
		}

		return result;
	}

	puBlic getSupportedActions(): editorCommon.IEditorAction[] {
		let result = this.getActions();

		result = result.filter(action => action.isSupported());

		return result;
	}

	puBlic getAction(id: string): editorCommon.IEditorAction {
		return this._actions[id] || null;
	}

	puBlic trigger(source: string | null | undefined, handlerId: string, payload: any): void {
		payload = payload || {};

		switch (handlerId) {
			case editorCommon.Handler.CompositionStart:
				this._startComposition();
				return;
			case editorCommon.Handler.CompositionEnd:
				this._endComposition(source);
				return;
			case editorCommon.Handler.Type: {
				const args = <Partial<editorCommon.TypePayload>>payload;
				this._type(source, args.text || '');
				return;
			}
			case editorCommon.Handler.ReplacePreviousChar: {
				const args = <Partial<editorCommon.ReplacePreviousCharPayload>>payload;
				this._replacePreviousChar(source, args.text || '', args.replaceCharCnt || 0);
				return;
			}
			case editorCommon.Handler.Paste: {
				const args = <Partial<editorCommon.PastePayload>>payload;
				this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null);
				return;
			}
			case editorCommon.Handler.Cut:
				this._cut(source);
				return;
		}

		const action = this.getAction(handlerId);
		if (action) {
			Promise.resolve(action.run()).then(undefined, onUnexpectedError);
			return;
		}

		if (!this._modelData) {
			return;
		}

		if (this._triggerEditorCommand(source, handlerId, payload)) {
			return;
		}
	}

	private _startComposition(): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.startComposition();
		this._onDidCompositionStart.fire();
	}

	private _endComposition(source: string | null | undefined): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.endComposition(source);
		this._onDidCompositionEnd.fire();
	}

	private _type(source: string | null | undefined, text: string): void {
		if (!this._modelData || text.length === 0) {
			return;
		}
		if (source === 'keyBoard') {
			this._onWillType.fire(text);
		}
		this._modelData.viewModel.type(text, source);
		if (source === 'keyBoard') {
			this._onDidType.fire(text);
		}
	}

	private _replacePreviousChar(source: string | null | undefined, text: string, replaceCharCnt: numBer): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.replacePreviousChar(text, replaceCharCnt, source);
	}

	private _paste(source: string | null | undefined, text: string, pasteOnNewLine: Boolean, multicursorText: string[] | null, mode: string | null): void {
		if (!this._modelData || text.length === 0) {
			return;
		}
		const startPosition = this._modelData.viewModel.getSelection().getStartPosition();
		this._modelData.viewModel.paste(text, pasteOnNewLine, multicursorText, source);
		const endPosition = this._modelData.viewModel.getSelection().getStartPosition();
		if (source === 'keyBoard') {
			this._onDidPaste.fire({
				range: new Range(startPosition.lineNumBer, startPosition.column, endPosition.lineNumBer, endPosition.column),
				mode: mode
			});
		}
	}

	private _cut(source: string | null | undefined): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.cut(source);
	}

	private _triggerEditorCommand(source: string | null | undefined, handlerId: string, payload: any): Boolean {
		const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
		if (command) {
			payload = payload || {};
			payload.source = source;
			this._instantiationService.invokeFunction((accessor) => {
				Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
			});
			return true;
		}

		return false;
	}

	puBlic _getViewModel(): IViewModel | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.viewModel;
	}

	puBlic pushUndoStop(): Boolean {
		if (!this._modelData) {
			return false;
		}
		if (this._configuration.options.get(EditorOption.readOnly)) {
			// read only editor => sorry!
			return false;
		}
		this._modelData.model.pushStackElement();
		return true;
	}

	puBlic executeEdits(source: string | null | undefined, edits: IIdentifiedSingleEditOperation[], endCursorState?: ICursorStateComputer | Selection[]): Boolean {
		if (!this._modelData) {
			return false;
		}
		if (this._configuration.options.get(EditorOption.readOnly)) {
			// read only editor => sorry!
			return false;
		}

		let cursorStateComputer: ICursorStateComputer;
		if (!endCursorState) {
			cursorStateComputer = () => null;
		} else if (Array.isArray(endCursorState)) {
			cursorStateComputer = () => endCursorState;
		} else {
			cursorStateComputer = endCursorState;
		}

		this._modelData.viewModel.executeEdits(source, edits, cursorStateComputer);
		return true;
	}

	puBlic executeCommand(source: string | null | undefined, command: editorCommon.ICommand): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.executeCommand(command, source);
	}

	puBlic executeCommands(source: string | null | undefined, commands: editorCommon.ICommand[]): void {
		if (!this._modelData) {
			return;
		}
		this._modelData.viewModel.executeCommands(commands, source);
	}

	puBlic changeDecorations(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => any): any {
		if (!this._modelData) {
			// callBack will not Be called
			return null;
		}
		return this._modelData.model.changeDecorations(callBack, this._id);
	}

	puBlic getLineDecorations(lineNumBer: numBer): IModelDecoration[] | null {
		if (!this._modelData) {
			return null;
		}
		return this._modelData.model.getLineDecorations(lineNumBer, this._id, filterValidationDecorations(this._configuration.options));
	}

	puBlic deltaDecorations(oldDecorations: string[], newDecorations: IModelDeltaDecoration[]): string[] {
		if (!this._modelData) {
			return [];
		}

		if (oldDecorations.length === 0 && newDecorations.length === 0) {
			return oldDecorations;
		}

		return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
	}

	puBlic setDecorations(decorationTypeKey: string, decorationOptions: editorCommon.IDecorationOptions[]): void {

		const newDecorationsSuBTypes: { [key: string]: Boolean } = {};
		const oldDecorationsSuBTypes = this._decorationTypeSuBtypes[decorationTypeKey] || {};
		this._decorationTypeSuBtypes[decorationTypeKey] = newDecorationsSuBTypes;

		const newModelDecorations: IModelDeltaDecoration[] = [];

		for (let decorationOption of decorationOptions) {
			let typeKey = decorationTypeKey;
			if (decorationOption.renderOptions) {
				// identify custom reder options By a hash code over all keys and values
				// For custom render options register a decoration type if necessary
				const suBType = hash(decorationOption.renderOptions).toString(16);
				// The fact that `decorationTypeKey` appears in the typeKey has no influence
				// it is just a mechanism to get predictaBle and unique keys (repeataBle for the same options and unique across clients)
				typeKey = decorationTypeKey + '-' + suBType;
				if (!oldDecorationsSuBTypes[suBType] && !newDecorationsSuBTypes[suBType]) {
					// decoration type did not exist Before, register new one
					this._registerDecorationType(typeKey, decorationOption.renderOptions, decorationTypeKey);
				}
				newDecorationsSuBTypes[suBType] = true;
			}
			const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
			if (decorationOption.hoverMessage) {
				opts.hoverMessage = decorationOption.hoverMessage;
			}
			newModelDecorations.push({ range: decorationOption.range, options: opts });
		}

		// remove decoration suB types that are no longer used, deregister decoration type if necessary
		for (let suBType in oldDecorationsSuBTypes) {
			if (!newDecorationsSuBTypes[suBType]) {
				this._removeDecorationType(decorationTypeKey + '-' + suBType);
			}
		}

		// update all decorations
		const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
		this._decorationTypeKeysToIds[decorationTypeKey] = this.deltaDecorations(oldDecorationsIds, newModelDecorations);
	}

	puBlic setDecorationsFast(decorationTypeKey: string, ranges: IRange[]): void {

		// remove decoration suB types that are no longer used, deregister decoration type if necessary
		const oldDecorationsSuBTypes = this._decorationTypeSuBtypes[decorationTypeKey] || {};
		for (let suBType in oldDecorationsSuBTypes) {
			this._removeDecorationType(decorationTypeKey + '-' + suBType);
		}
		this._decorationTypeSuBtypes[decorationTypeKey] = {};

		const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
		const newModelDecorations: IModelDeltaDecoration[] = new Array<IModelDeltaDecoration>(ranges.length);
		for (let i = 0, len = ranges.length; i < len; i++) {
			newModelDecorations[i] = { range: ranges[i], options: opts };
		}

		// update all decorations
		const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
		this._decorationTypeKeysToIds[decorationTypeKey] = this.deltaDecorations(oldDecorationsIds, newModelDecorations);
	}

	puBlic removeDecorations(decorationTypeKey: string): void {
		// remove decorations for type and suB type
		const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
		if (oldDecorationsIds) {
			this.deltaDecorations(oldDecorationsIds, []);
		}
		if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
			delete this._decorationTypeKeysToIds[decorationTypeKey];
		}
		if (this._decorationTypeSuBtypes.hasOwnProperty(decorationTypeKey)) {
			delete this._decorationTypeSuBtypes[decorationTypeKey];
		}
	}

	puBlic getLayoutInfo(): EditorLayoutInfo {
		const options = this._configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		return layoutInfo;
	}

	puBlic createOverviewRuler(cssClassName: string): editorBrowser.IOverviewRuler | null {
		if (!this._modelData || !this._modelData.hasRealView) {
			return null;
		}
		return this._modelData.view.createOverviewRuler(cssClassName);
	}

	puBlic getContainerDomNode(): HTMLElement {
		return this._domElement;
	}

	puBlic getDomNode(): HTMLElement | null {
		if (!this._modelData || !this._modelData.hasRealView) {
			return null;
		}
		return this._modelData.view.domNode.domNode;
	}

	puBlic delegateVerticalScrollBarMouseDown(BrowserEvent: IMouseEvent): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		this._modelData.view.delegateVerticalScrollBarMouseDown(BrowserEvent);
	}

	puBlic layout(dimension?: editorCommon.IDimension): void {
		this._configuration.oBserveReferenceElement(dimension);
		this.render();
	}

	puBlic focus(): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		this._modelData.view.focus();
	}

	puBlic hasTextFocus(): Boolean {
		if (!this._modelData || !this._modelData.hasRealView) {
			return false;
		}
		return this._modelData.view.isFocused();
	}

	puBlic hasWidgetFocus(): Boolean {
		return this._focusTracker && this._focusTracker.hasFocus();
	}

	puBlic addContentWidget(widget: editorBrowser.IContentWidget): void {
		const widgetData: IContentWidgetData = {
			widget: widget,
			position: widget.getPosition()
		};

		if (this._contentWidgets.hasOwnProperty(widget.getId())) {
			console.warn('Overwriting a content widget with the same id.');
		}

		this._contentWidgets[widget.getId()] = widgetData;

		if (this._modelData && this._modelData.hasRealView) {
			this._modelData.view.addContentWidget(widgetData);
		}
	}

	puBlic layoutContentWidget(widget: editorBrowser.IContentWidget): void {
		const widgetId = widget.getId();
		if (this._contentWidgets.hasOwnProperty(widgetId)) {
			const widgetData = this._contentWidgets[widgetId];
			widgetData.position = widget.getPosition();
			if (this._modelData && this._modelData.hasRealView) {
				this._modelData.view.layoutContentWidget(widgetData);
			}
		}
	}

	puBlic removeContentWidget(widget: editorBrowser.IContentWidget): void {
		const widgetId = widget.getId();
		if (this._contentWidgets.hasOwnProperty(widgetId)) {
			const widgetData = this._contentWidgets[widgetId];
			delete this._contentWidgets[widgetId];
			if (this._modelData && this._modelData.hasRealView) {
				this._modelData.view.removeContentWidget(widgetData);
			}
		}
	}

	puBlic addOverlayWidget(widget: editorBrowser.IOverlayWidget): void {
		const widgetData: IOverlayWidgetData = {
			widget: widget,
			position: widget.getPosition()
		};

		if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
			console.warn('Overwriting an overlay widget with the same id.');
		}

		this._overlayWidgets[widget.getId()] = widgetData;

		if (this._modelData && this._modelData.hasRealView) {
			this._modelData.view.addOverlayWidget(widgetData);
		}
	}

	puBlic layoutOverlayWidget(widget: editorBrowser.IOverlayWidget): void {
		const widgetId = widget.getId();
		if (this._overlayWidgets.hasOwnProperty(widgetId)) {
			const widgetData = this._overlayWidgets[widgetId];
			widgetData.position = widget.getPosition();
			if (this._modelData && this._modelData.hasRealView) {
				this._modelData.view.layoutOverlayWidget(widgetData);
			}
		}
	}

	puBlic removeOverlayWidget(widget: editorBrowser.IOverlayWidget): void {
		const widgetId = widget.getId();
		if (this._overlayWidgets.hasOwnProperty(widgetId)) {
			const widgetData = this._overlayWidgets[widgetId];
			delete this._overlayWidgets[widgetId];
			if (this._modelData && this._modelData.hasRealView) {
				this._modelData.view.removeOverlayWidget(widgetData);
			}
		}
	}

	puBlic changeViewZones(callBack: (accessor: editorBrowser.IViewZoneChangeAccessor) => void): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		this._modelData.view.change(callBack);
	}

	puBlic getTargetAtClientPoint(clientX: numBer, clientY: numBer): editorBrowser.IMouseTarget | null {
		if (!this._modelData || !this._modelData.hasRealView) {
			return null;
		}
		return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
	}

	puBlic getScrolledVisiBlePosition(rawPosition: IPosition): { top: numBer; left: numBer; height: numBer; } | null {
		if (!this._modelData || !this._modelData.hasRealView) {
			return null;
		}

		const position = this._modelData.model.validatePosition(rawPosition);
		const options = this._configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		const top = CodeEditorWidget._getVerticalOffsetForPosition(this._modelData, position.lineNumBer, position.column) - this.getScrollTop();
		const left = this._modelData.view.getOffsetForColumn(position.lineNumBer, position.column) + layoutInfo.glyphMarginWidth + layoutInfo.lineNumBersWidth + layoutInfo.decorationsWidth - this.getScrollLeft();

		return {
			top: top,
			left: left,
			height: options.get(EditorOption.lineHeight)
		};
	}

	puBlic getOffsetForColumn(lineNumBer: numBer, column: numBer): numBer {
		if (!this._modelData || !this._modelData.hasRealView) {
			return -1;
		}
		return this._modelData.view.getOffsetForColumn(lineNumBer, column);
	}

	puBlic render(forceRedraw: Boolean = false): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		this._modelData.view.render(true, forceRedraw);
	}

	puBlic setAriaOptions(options: editorBrowser.IEditorAriaOptions): void {
		if (!this._modelData || !this._modelData.hasRealView) {
			return;
		}
		this._modelData.view.setAriaOptions(options);
	}

	puBlic applyFontInfo(target: HTMLElement): void {
		Configuration.applyFontInfoSlow(target, this._configuration.options.get(EditorOption.fontInfo));
	}

	protected _attachModel(model: ITextModel | null): void {
		if (!model) {
			this._modelData = null;
			return;
		}

		const listenersToRemove: IDisposaBle[] = [];

		this._domElement.setAttriBute('data-mode-id', model.getLanguageIdentifier().language);
		this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
		this._configuration.setMaxLineNumBer(model.getLineCount());

		model.onBeforeAttached();

		const viewModel = new ViewModel(
			this._id,
			this._configuration,
			model,
			DOMLineBreaksComputerFactory.create(),
			MonospaceLineBreaksComputerFactory.create(this._configuration.options),
			(callBack) => dom.scheduleAtNextAnimationFrame(callBack)
		);

		listenersToRemove.push(model.onDidChangeDecorations((e) => this._onDidChangeModelDecorations.fire(e)));
		listenersToRemove.push(model.onDidChangeLanguage((e) => {
			this._domElement.setAttriBute('data-mode-id', model.getLanguageIdentifier().language);
			this._onDidChangeModelLanguage.fire(e);
		}));
		listenersToRemove.push(model.onDidChangeLanguageConfiguration((e) => this._onDidChangeModelLanguageConfiguration.fire(e)));
		listenersToRemove.push(model.onDidChangeContent((e) => this._onDidChangeModelContent.fire(e)));
		listenersToRemove.push(model.onDidChangeOptions((e) => this._onDidChangeModelOptions.fire(e)));
		// Someone might destroy the model from under the editor, so prevent any exceptions By setting a null model
		listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));

		listenersToRemove.push(viewModel.onEvent((e) => {
			switch (e.kind) {
				case OutgoingViewModelEventKind.ContentSizeChanged:
					this._onDidContentSizeChange.fire(e);
					Break;
				case OutgoingViewModelEventKind.FocusChanged:
					this._editorTextFocus.setValue(e.hasFocus);
					Break;
				case OutgoingViewModelEventKind.ScrollChanged:
					this._onDidScrollChange.fire(e);
					Break;
				case OutgoingViewModelEventKind.ViewZonesChanged:
					this._onDidChangeViewZones.fire();
					Break;
				case OutgoingViewModelEventKind.ReadOnlyEditAttempt:
					this._onDidAttemptReadOnlyEdit.fire();
					Break;
				case OutgoingViewModelEventKind.CursorStateChanged: {
					if (e.reachedMaxCursorCount) {
						this._notificationService.warn(nls.localize('cursors.maximum', "The numBer of cursors has Been limited to {0}.", Cursor.MAX_CURSOR_COUNT));
					}

					const positions: Position[] = [];
					for (let i = 0, len = e.selections.length; i < len; i++) {
						positions[i] = e.selections[i].getPosition();
					}

					const e1: ICursorPositionChangedEvent = {
						position: positions[0],
						secondaryPositions: positions.slice(1),
						reason: e.reason,
						source: e.source
					};
					this._onDidChangeCursorPosition.fire(e1);

					const e2: ICursorSelectionChangedEvent = {
						selection: e.selections[0],
						secondarySelections: e.selections.slice(1),
						modelVersionId: e.modelVersionId,
						oldSelections: e.oldSelections,
						oldModelVersionId: e.oldModelVersionId,
						source: e.source,
						reason: e.reason
					};
					this._onDidChangeCursorSelection.fire(e2);

					Break;
				}

			}
		}));

		const [view, hasRealView] = this._createView(viewModel);
		if (hasRealView) {
			this._domElement.appendChild(view.domNode.domNode);

			let keys = OBject.keys(this._contentWidgets);
			for (let i = 0, len = keys.length; i < len; i++) {
				const widgetId = keys[i];
				view.addContentWidget(this._contentWidgets[widgetId]);
			}

			keys = OBject.keys(this._overlayWidgets);
			for (let i = 0, len = keys.length; i < len; i++) {
				const widgetId = keys[i];
				view.addOverlayWidget(this._overlayWidgets[widgetId]);
			}

			view.render(false, true);
			view.domNode.domNode.setAttriBute('data-uri', model.uri.toString());
		}

		this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove);
	}

	protected _createView(viewModel: ViewModel): [View, Boolean] {
		let commandDelegate: ICommandDelegate;
		if (this.isSimpleWidget) {
			commandDelegate = {
				paste: (text: string, pasteOnNewLine: Boolean, multicursorText: string[] | null, mode: string | null) => {
					this._paste('keyBoard', text, pasteOnNewLine, multicursorText, mode);
				},
				type: (text: string) => {
					this._type('keyBoard', text);
				},
				replacePreviousChar: (text: string, replaceCharCnt: numBer) => {
					this._replacePreviousChar('keyBoard', text, replaceCharCnt);
				},
				startComposition: () => {
					this._startComposition();
				},
				endComposition: () => {
					this._endComposition('keyBoard');
				},
				cut: () => {
					this._cut('keyBoard');
				}
			};
		} else {
			commandDelegate = {
				paste: (text: string, pasteOnNewLine: Boolean, multicursorText: string[] | null, mode: string | null) => {
					const payload: editorCommon.PastePayload = { text, pasteOnNewLine, multicursorText, mode };
					this._commandService.executeCommand(editorCommon.Handler.Paste, payload);
				},
				type: (text: string) => {
					const payload: editorCommon.TypePayload = { text };
					this._commandService.executeCommand(editorCommon.Handler.Type, payload);
				},
				replacePreviousChar: (text: string, replaceCharCnt: numBer) => {
					const payload: editorCommon.ReplacePreviousCharPayload = { text, replaceCharCnt };
					this._commandService.executeCommand(editorCommon.Handler.ReplacePreviousChar, payload);
				},
				startComposition: () => {
					this._commandService.executeCommand(editorCommon.Handler.CompositionStart, {});
				},
				endComposition: () => {
					this._commandService.executeCommand(editorCommon.Handler.CompositionEnd, {});
				},
				cut: () => {
					this._commandService.executeCommand(editorCommon.Handler.Cut, {});
				}
			};
		}

		const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
		viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
		viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
		viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
		viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
		viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
		viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
		viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
		viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
		viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
		viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);

		const view = new View(
			commandDelegate,
			this._configuration,
			this._themeService,
			viewModel,
			viewUserInputEvents,
			this._overflowWidgetsDomNode
		);

		return [view, true];
	}

	protected _postDetachModelCleanup(detachedModel: ITextModel | null): void {
		if (detachedModel) {
			detachedModel.removeAllDecorationsWithOwnerId(this._id);
		}
	}

	private _detachModel(): ITextModel | null {
		if (!this._modelData) {
			return null;
		}
		const model = this._modelData.model;
		const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;

		this._modelData.dispose();
		this._modelData = null;

		this._domElement.removeAttriBute('data-mode-id');
		if (removeDomNode && this._domElement.contains(removeDomNode)) {
			this._domElement.removeChild(removeDomNode);
		}

		return model;
	}

	private _registerDecorationType(key: string, options: editorCommon.IDecorationRenderOptions, parentTypeKey?: string): void {
		this._codeEditorService.registerDecorationType(key, options, parentTypeKey, this);
	}

	private _removeDecorationType(key: string): void {
		this._codeEditorService.removeDecorationType(key);
	}

	private _resolveDecorationOptions(typeKey: string, writaBle: Boolean): IModelDecorationOptions {
		return this._codeEditorService.resolveDecorationOptions(typeKey, writaBle);
	}

	puBlic getTelemetryData(): { [key: string]: any; } | undefined {
		return this._telemetryData;
	}

	puBlic hasModel(): this is editorBrowser.IActiveCodeEditor {
		return (this._modelData !== null);
	}
}

const enum BooleanEventValue {
	NotSet,
	False,
	True
}

export class BooleanEventEmitter extends DisposaBle {
	private readonly _onDidChangeToTrue: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeToTrue: Event<void> = this._onDidChangeToTrue.event;

	private readonly _onDidChangeToFalse: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeToFalse: Event<void> = this._onDidChangeToFalse.event;

	private _value: BooleanEventValue;

	constructor() {
		super();
		this._value = BooleanEventValue.NotSet;
	}

	puBlic setValue(_value: Boolean) {
		const value = (_value ? BooleanEventValue.True : BooleanEventValue.False);
		if (this._value === value) {
			return;
		}
		this._value = value;
		if (this._value === BooleanEventValue.True) {
			this._onDidChangeToTrue.fire();
		} else if (this._value === BooleanEventValue.False) {
			this._onDidChangeToFalse.fire();
		}
	}
}

class EditorContextKeysManager extends DisposaBle {

	private readonly _editor: CodeEditorWidget;
	private readonly _editorSimpleInput: IContextKey<Boolean>;
	private readonly _editorFocus: IContextKey<Boolean>;
	private readonly _textInputFocus: IContextKey<Boolean>;
	private readonly _editorTextFocus: IContextKey<Boolean>;
	private readonly _editorTaBMovesFocus: IContextKey<Boolean>;
	private readonly _editorReadonly: IContextKey<Boolean>;
	private readonly _editorColumnSelection: IContextKey<Boolean>;
	private readonly _hasMultipleSelections: IContextKey<Boolean>;
	private readonly _hasNonEmptySelection: IContextKey<Boolean>;
	private readonly _canUndo: IContextKey<Boolean>;
	private readonly _canRedo: IContextKey<Boolean>;

	constructor(
		editor: CodeEditorWidget,
		contextKeyService: IContextKeyService
	) {
		super();

		this._editor = editor;

		contextKeyService.createKey('editorId', editor.getId());

		this._editorSimpleInput = EditorContextKeys.editorSimpleInput.BindTo(contextKeyService);
		this._editorFocus = EditorContextKeys.focus.BindTo(contextKeyService);
		this._textInputFocus = EditorContextKeys.textInputFocus.BindTo(contextKeyService);
		this._editorTextFocus = EditorContextKeys.editorTextFocus.BindTo(contextKeyService);
		this._editorTaBMovesFocus = EditorContextKeys.taBMovesFocus.BindTo(contextKeyService);
		this._editorReadonly = EditorContextKeys.readOnly.BindTo(contextKeyService);
		this._editorColumnSelection = EditorContextKeys.columnSelection.BindTo(contextKeyService);
		this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.BindTo(contextKeyService);
		this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.BindTo(contextKeyService);
		this._canUndo = EditorContextKeys.canUndo.BindTo(contextKeyService);
		this._canRedo = EditorContextKeys.canRedo.BindTo(contextKeyService);

		this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
		this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
		this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
		this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
		this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
		this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
		this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
		this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));

		this._updateFromConfig();
		this._updateFromSelection();
		this._updateFromFocus();
		this._updateFromModel();

		this._editorSimpleInput.set(this._editor.isSimpleWidget);
	}

	private _updateFromConfig(): void {
		const options = this._editor.getOptions();

		this._editorTaBMovesFocus.set(options.get(EditorOption.taBFocusMode));
		this._editorReadonly.set(options.get(EditorOption.readOnly));
		this._editorColumnSelection.set(options.get(EditorOption.columnSelection));
	}

	private _updateFromSelection(): void {
		const selections = this._editor.getSelections();
		if (!selections) {
			this._hasMultipleSelections.reset();
			this._hasNonEmptySelection.reset();
		} else {
			this._hasMultipleSelections.set(selections.length > 1);
			this._hasNonEmptySelection.set(selections.some(s => !s.isEmpty()));
		}
	}

	private _updateFromFocus(): void {
		this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
		this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
		this._textInputFocus.set(this._editor.hasTextFocus());
	}

	private _updateFromModel(): void {
		const model = this._editor.getModel();
		this._canUndo.set(Boolean(model && model.canUndo()));
		this._canRedo.set(Boolean(model && model.canRedo()));
	}
}

export class EditorModeContext extends DisposaBle {

	private readonly _langId: IContextKey<string>;
	private readonly _hasCompletionItemProvider: IContextKey<Boolean>;
	private readonly _hasCodeActionsProvider: IContextKey<Boolean>;
	private readonly _hasCodeLensProvider: IContextKey<Boolean>;
	private readonly _hasDefinitionProvider: IContextKey<Boolean>;
	private readonly _hasDeclarationProvider: IContextKey<Boolean>;
	private readonly _hasImplementationProvider: IContextKey<Boolean>;
	private readonly _hasTypeDefinitionProvider: IContextKey<Boolean>;
	private readonly _hasHoverProvider: IContextKey<Boolean>;
	private readonly _hasDocumentHighlightProvider: IContextKey<Boolean>;
	private readonly _hasDocumentSymBolProvider: IContextKey<Boolean>;
	private readonly _hasReferenceProvider: IContextKey<Boolean>;
	private readonly _hasRenameProvider: IContextKey<Boolean>;
	private readonly _hasDocumentFormattingProvider: IContextKey<Boolean>;
	private readonly _hasDocumentSelectionFormattingProvider: IContextKey<Boolean>;
	private readonly _hasMultipleDocumentFormattingProvider: IContextKey<Boolean>;
	private readonly _hasMultipleDocumentSelectionFormattingProvider: IContextKey<Boolean>;
	private readonly _hasSignatureHelpProvider: IContextKey<Boolean>;
	private readonly _isInWalkThrough: IContextKey<Boolean>;

	constructor(
		private readonly _editor: CodeEditorWidget,
		private readonly _contextKeyService: IContextKeyService
	) {
		super();

		this._langId = EditorContextKeys.languageId.BindTo(_contextKeyService);
		this._hasCompletionItemProvider = EditorContextKeys.hasCompletionItemProvider.BindTo(_contextKeyService);
		this._hasCodeActionsProvider = EditorContextKeys.hasCodeActionsProvider.BindTo(_contextKeyService);
		this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.BindTo(_contextKeyService);
		this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.BindTo(_contextKeyService);
		this._hasDeclarationProvider = EditorContextKeys.hasDeclarationProvider.BindTo(_contextKeyService);
		this._hasImplementationProvider = EditorContextKeys.hasImplementationProvider.BindTo(_contextKeyService);
		this._hasTypeDefinitionProvider = EditorContextKeys.hasTypeDefinitionProvider.BindTo(_contextKeyService);
		this._hasHoverProvider = EditorContextKeys.hasHoverProvider.BindTo(_contextKeyService);
		this._hasDocumentHighlightProvider = EditorContextKeys.hasDocumentHighlightProvider.BindTo(_contextKeyService);
		this._hasDocumentSymBolProvider = EditorContextKeys.hasDocumentSymBolProvider.BindTo(_contextKeyService);
		this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.BindTo(_contextKeyService);
		this._hasRenameProvider = EditorContextKeys.hasRenameProvider.BindTo(_contextKeyService);
		this._hasSignatureHelpProvider = EditorContextKeys.hasSignatureHelpProvider.BindTo(_contextKeyService);
		this._hasDocumentFormattingProvider = EditorContextKeys.hasDocumentFormattingProvider.BindTo(_contextKeyService);
		this._hasDocumentSelectionFormattingProvider = EditorContextKeys.hasDocumentSelectionFormattingProvider.BindTo(_contextKeyService);
		this._hasMultipleDocumentFormattingProvider = EditorContextKeys.hasMultipleDocumentFormattingProvider.BindTo(_contextKeyService);
		this._hasMultipleDocumentSelectionFormattingProvider = EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.BindTo(_contextKeyService);
		this._isInWalkThrough = EditorContextKeys.isInWalkThroughSnippet.BindTo(_contextKeyService);

		const update = () => this._update();

		// update when model/mode changes
		this._register(_editor.onDidChangeModel(update));
		this._register(_editor.onDidChangeModelLanguage(update));

		// update when registries change
		this._register(modes.CompletionProviderRegistry.onDidChange(update));
		this._register(modes.CodeActionProviderRegistry.onDidChange(update));
		this._register(modes.CodeLensProviderRegistry.onDidChange(update));
		this._register(modes.DefinitionProviderRegistry.onDidChange(update));
		this._register(modes.DeclarationProviderRegistry.onDidChange(update));
		this._register(modes.ImplementationProviderRegistry.onDidChange(update));
		this._register(modes.TypeDefinitionProviderRegistry.onDidChange(update));
		this._register(modes.HoverProviderRegistry.onDidChange(update));
		this._register(modes.DocumentHighlightProviderRegistry.onDidChange(update));
		this._register(modes.DocumentSymBolProviderRegistry.onDidChange(update));
		this._register(modes.ReferenceProviderRegistry.onDidChange(update));
		this._register(modes.RenameProviderRegistry.onDidChange(update));
		this._register(modes.DocumentFormattingEditProviderRegistry.onDidChange(update));
		this._register(modes.DocumentRangeFormattingEditProviderRegistry.onDidChange(update));
		this._register(modes.SignatureHelpProviderRegistry.onDidChange(update));

		update();
	}

	dispose() {
		super.dispose();
	}

	reset() {
		this._contextKeyService.BufferChangeEvents(() => {
			this._langId.reset();
			this._hasCompletionItemProvider.reset();
			this._hasCodeActionsProvider.reset();
			this._hasCodeLensProvider.reset();
			this._hasDefinitionProvider.reset();
			this._hasDeclarationProvider.reset();
			this._hasImplementationProvider.reset();
			this._hasTypeDefinitionProvider.reset();
			this._hasHoverProvider.reset();
			this._hasDocumentHighlightProvider.reset();
			this._hasDocumentSymBolProvider.reset();
			this._hasReferenceProvider.reset();
			this._hasRenameProvider.reset();
			this._hasDocumentFormattingProvider.reset();
			this._hasDocumentSelectionFormattingProvider.reset();
			this._hasSignatureHelpProvider.reset();
			this._isInWalkThrough.reset();
		});
	}

	private _update() {
		const model = this._editor.getModel();
		if (!model) {
			this.reset();
			return;
		}
		this._contextKeyService.BufferChangeEvents(() => {
			this._langId.set(model.getLanguageIdentifier().language);
			this._hasCompletionItemProvider.set(modes.CompletionProviderRegistry.has(model));
			this._hasCodeActionsProvider.set(modes.CodeActionProviderRegistry.has(model));
			this._hasCodeLensProvider.set(modes.CodeLensProviderRegistry.has(model));
			this._hasDefinitionProvider.set(modes.DefinitionProviderRegistry.has(model));
			this._hasDeclarationProvider.set(modes.DeclarationProviderRegistry.has(model));
			this._hasImplementationProvider.set(modes.ImplementationProviderRegistry.has(model));
			this._hasTypeDefinitionProvider.set(modes.TypeDefinitionProviderRegistry.has(model));
			this._hasHoverProvider.set(modes.HoverProviderRegistry.has(model));
			this._hasDocumentHighlightProvider.set(modes.DocumentHighlightProviderRegistry.has(model));
			this._hasDocumentSymBolProvider.set(modes.DocumentSymBolProviderRegistry.has(model));
			this._hasReferenceProvider.set(modes.ReferenceProviderRegistry.has(model));
			this._hasRenameProvider.set(modes.RenameProviderRegistry.has(model));
			this._hasSignatureHelpProvider.set(modes.SignatureHelpProviderRegistry.has(model));
			this._hasDocumentFormattingProvider.set(modes.DocumentFormattingEditProviderRegistry.has(model) || modes.DocumentRangeFormattingEditProviderRegistry.has(model));
			this._hasDocumentSelectionFormattingProvider.set(modes.DocumentRangeFormattingEditProviderRegistry.has(model));
			this._hasMultipleDocumentFormattingProvider.set(modes.DocumentFormattingEditProviderRegistry.all(model).length + modes.DocumentRangeFormattingEditProviderRegistry.all(model).length > 1);
			this._hasMultipleDocumentSelectionFormattingProvider.set(modes.DocumentRangeFormattingEditProviderRegistry.all(model).length > 1);
			this._isInWalkThrough.set(model.uri.scheme === Schemas.walkThroughSnippet);
		});
	}
}

class CodeEditorWidgetFocusTracker extends DisposaBle {

	private _hasFocus: Boolean;
	private readonly _domFocusTracker: dom.IFocusTracker;

	private readonly _onChange: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onChange: Event<void> = this._onChange.event;

	constructor(domElement: HTMLElement) {
		super();

		this._hasFocus = false;
		this._domFocusTracker = this._register(dom.trackFocus(domElement));

		this._register(this._domFocusTracker.onDidFocus(() => {
			this._hasFocus = true;
			this._onChange.fire(undefined);
		}));
		this._register(this._domFocusTracker.onDidBlur(() => {
			this._hasFocus = false;
			this._onChange.fire(undefined);
		}));
	}

	puBlic hasFocus(): Boolean {
		return this._hasFocus;
	}

	puBlic refreshState(): void {
		if (this._domFocusTracker.refreshState) {
			this._domFocusTracker.refreshState();
		}
	}
}

const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enaBle-Background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);

function getSquigglySVGData(color: Color) {
	return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}

const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);

function getDotDotDotSVGData(color: Color) {
	return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}

registerThemingParticipant((theme, collector) => {
	const errorBorderColor = theme.getColor(editorErrorBorder);
	if (errorBorderColor) {
		collector.addRule(`.monaco-editor .${ClassName.EditorErrorDecoration} { Border-Bottom: 4px douBle ${errorBorderColor}; }`);
	}
	const errorForeground = theme.getColor(editorErrorForeground);
	if (errorForeground) {
		collector.addRule(`.monaco-editor .${ClassName.EditorErrorDecoration} { Background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x Bottom left; }`);
	}

	const warningBorderColor = theme.getColor(editorWarningBorder);
	if (warningBorderColor) {
		collector.addRule(`.monaco-editor .${ClassName.EditorWarningDecoration} { Border-Bottom: 4px douBle ${warningBorderColor}; }`);
	}
	const warningForeground = theme.getColor(editorWarningForeground);
	if (warningForeground) {
		collector.addRule(`.monaco-editor .${ClassName.EditorWarningDecoration} { Background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x Bottom left; }`);
	}

	const infoBorderColor = theme.getColor(editorInfoBorder);
	if (infoBorderColor) {
		collector.addRule(`.monaco-editor .${ClassName.EditorInfoDecoration} { Border-Bottom: 4px douBle ${infoBorderColor}; }`);
	}
	const infoForeground = theme.getColor(editorInfoForeground);
	if (infoForeground) {
		collector.addRule(`.monaco-editor .${ClassName.EditorInfoDecoration} { Background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x Bottom left; }`);
	}

	const hintBorderColor = theme.getColor(editorHintBorder);
	if (hintBorderColor) {
		collector.addRule(`.monaco-editor .${ClassName.EditorHintDecoration} { Border-Bottom: 2px dotted ${hintBorderColor}; }`);
	}
	const hintForeground = theme.getColor(editorHintForeground);
	if (hintForeground) {
		collector.addRule(`.monaco-editor .${ClassName.EditorHintDecoration} { Background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat Bottom left; }`);
	}

	const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
	if (unnecessaryForeground) {
		collector.addRule(`.monaco-editor.showUnused .${ClassName.EditorUnnecessaryInlineDecoration} { opacity: ${unnecessaryForeground.rgBa.a}; }`);
	}

	const unnecessaryBorder = theme.getColor(editorUnnecessaryCodeBorder);
	if (unnecessaryBorder) {
		collector.addRule(`.monaco-editor.showUnused .${ClassName.EditorUnnecessaryDecoration} { Border-Bottom: 2px dashed ${unnecessaryBorder}; }`);
	}

	const deprecatedForeground = theme.getColor(editorForeground) || 'inherit';
	collector.addRule(`.monaco-editor.showDeprecated .${ClassName.EditorDeprecatedInlineDecoration} { text-decoration: line-through; text-decoration-color: ${deprecatedForeground}}`);
});
