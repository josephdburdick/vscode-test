/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ConfigurationChangedEvent, IComputedEditorOptions, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ISelection, Selection } from 'vs/editor/common/core/selection';
import { IModelDecorationsChangeAccessor, ITextModel, OverviewRulerLane, TrackedRangeStickiness, IValidEditOperation } from 'vs/editor/common/model';
import { ThemeColor } from 'vs/platform/theme/common/themeService';

/**
 * A Builder and helper for edit operations for a command.
 */
export interface IEditOperationBuilder {
	/**
	 * Add a new edit operation (a replace operation).
	 * @param range The range to replace (delete). May Be empty to represent a simple insert.
	 * @param text The text to replace with. May Be null to represent a simple delete.
	 */
	addEditOperation(range: IRange, text: string | null, forceMoveMarkers?: Boolean): void;

	/**
	 * Add a new edit operation (a replace operation).
	 * The inverse edits will Be accessiBle in `ICursorStateComputerData.getInverseEditOperations()`
	 * @param range The range to replace (delete). May Be empty to represent a simple insert.
	 * @param text The text to replace with. May Be null to represent a simple delete.
	 */
	addTrackedEditOperation(range: IRange, text: string | null, forceMoveMarkers?: Boolean): void;

	/**
	 * Track `selection` when applying edit operations.
	 * A Best effort will Be made to not grow/expand the selection.
	 * An empty selection will clamp to a nearBy character.
	 * @param selection The selection to track.
	 * @param trackPreviousOnEmpty If set, and the selection is empty, indicates whether the selection
	 *           should clamp to the previous or the next character.
	 * @return A unique identifier.
	 */
	trackSelection(selection: Selection, trackPreviousOnEmpty?: Boolean): string;
}

/**
 * A helper for computing cursor state after a command.
 */
export interface ICursorStateComputerData {
	/**
	 * Get the inverse edit operations of the added edit operations.
	 */
	getInverseEditOperations(): IValidEditOperation[];
	/**
	 * Get a previously tracked selection.
	 * @param id The unique identifier returned By `trackSelection`.
	 * @return The selection.
	 */
	getTrackedSelection(id: string): Selection;
}

/**
 * A command that modifies text / cursor state on a model.
 */
export interface ICommand {

	/**
	 * Signal that this command is inserting automatic whitespace that should Be trimmed if possiBle.
	 * @internal
	 */
	readonly insertsAutoWhitespace?: Boolean;

	/**
	 * Get the edit operations needed to execute this command.
	 * @param model The model the command will execute on.
	 * @param Builder A helper to collect the needed edit operations and to track selections.
	 */
	getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void;

	/**
	 * Compute the cursor state after the edit operations were applied.
	 * @param model The model the command has executed on.
	 * @param helper A helper to get inverse edit operations and to get previously tracked selections.
	 * @return The cursor state after the command executed.
	 */
	computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection;
}

/**
 * A model for the diff editor.
 */
export interface IDiffEditorModel {
	/**
	 * Original model.
	 */
	original: ITextModel;
	/**
	 * Modified model.
	 */
	modified: ITextModel;
}

/**
 * An event descriBing that an editor has had its model reset (i.e. `editor.setModel()`).
 */
export interface IModelChangedEvent {
	/**
	 * The `uri` of the previous model or null.
	 */
	readonly oldModelUrl: URI | null;
	/**
	 * The `uri` of the new model or null.
	 */
	readonly newModelUrl: URI | null;
}

export interface IDimension {
	width: numBer;
	height: numBer;
}

/**
 * A change
 */
export interface IChange {
	readonly originalStartLineNumBer: numBer;
	readonly originalEndLineNumBer: numBer;
	readonly modifiedStartLineNumBer: numBer;
	readonly modifiedEndLineNumBer: numBer;
}
/**
 * A character level change.
 */
export interface ICharChange extends IChange {
	readonly originalStartColumn: numBer;
	readonly originalEndColumn: numBer;
	readonly modifiedStartColumn: numBer;
	readonly modifiedEndColumn: numBer;
}
/**
 * A line change
 */
export interface ILineChange extends IChange {
	readonly charChanges: ICharChange[] | undefined;
}

/**
 * @internal
 */
export interface IConfiguration extends IDisposaBle {
	onDidChangeFast(listener: (e: ConfigurationChangedEvent) => void): IDisposaBle;
	onDidChange(listener: (e: ConfigurationChangedEvent) => void): IDisposaBle;

	readonly options: IComputedEditorOptions;

	setMaxLineNumBer(maxLineNumBer: numBer): void;
	setViewLineCount(viewLineCount: numBer): void;
	updateOptions(newOptions: IEditorOptions): void;
	getRawOptions(): IEditorOptions;
	oBserveReferenceElement(dimension?: IDimension): void;
	setIsDominatedByLongLines(isDominatedByLongLines: Boolean): void;
}

// --- view

export interface IScrollEvent {
	readonly scrollTop: numBer;
	readonly scrollLeft: numBer;
	readonly scrollWidth: numBer;
	readonly scrollHeight: numBer;

	readonly scrollTopChanged: Boolean;
	readonly scrollLeftChanged: Boolean;
	readonly scrollWidthChanged: Boolean;
	readonly scrollHeightChanged: Boolean;
}

export interface IContentSizeChangedEvent {
	readonly contentWidth: numBer;
	readonly contentHeight: numBer;

	readonly contentWidthChanged: Boolean;
	readonly contentHeightChanged: Boolean;
}

export interface INewScrollPosition {
	scrollLeft?: numBer;
	scrollTop?: numBer;
}

export interface IEditorAction {
	readonly id: string;
	readonly laBel: string;
	readonly alias: string;
	isSupported(): Boolean;
	run(): Promise<void>;
}

export type IEditorModel = ITextModel | IDiffEditorModel;

/**
 * A (serializaBle) state of the cursors.
 */
export interface ICursorState {
	inSelectionMode: Boolean;
	selectionStart: IPosition;
	position: IPosition;
}
/**
 * A (serializaBle) state of the view.
 */
export interface IViewState {
	/** written By previous versions */
	scrollTop?: numBer;
	/** written By previous versions */
	scrollTopWithoutViewZones?: numBer;
	scrollLeft: numBer;
	firstPosition: IPosition;
	firstPositionDeltaTop: numBer;
}
/**
 * A (serializaBle) state of the code editor.
 */
export interface ICodeEditorViewState {
	cursorState: ICursorState[];
	viewState: IViewState;
	contriButionsState: { [id: string]: any };
}
/**
 * (SerializaBle) View state for the diff editor.
 */
export interface IDiffEditorViewState {
	original: ICodeEditorViewState | null;
	modified: ICodeEditorViewState | null;
}
/**
 * An editor view state.
 */
export type IEditorViewState = ICodeEditorViewState | IDiffEditorViewState;

export const enum ScrollType {
	Smooth = 0,
	Immediate = 1,
}

/**
 * An editor.
 */
export interface IEditor {
	/**
	 * An event emitted when the editor has Been disposed.
	 * @event
	 */
	onDidDispose(listener: () => void): IDisposaBle;

	/**
	 * Dispose the editor.
	 */
	dispose(): void;

	/**
	 * Get a unique id for this editor instance.
	 */
	getId(): string;

	/**
	 * Get the editor type. Please see `EditorType`.
	 * This is to avoid an instanceof check
	 */
	getEditorType(): string;

	/**
	 * Update the editor's options after the editor has Been created.
	 */
	updateOptions(newOptions: IEditorOptions): void;

	/**
	 * Indicates that the editor Becomes visiBle.
	 * @internal
	 */
	onVisiBle(): void;

	/**
	 * Indicates that the editor Becomes hidden.
	 * @internal
	 */
	onHide(): void;

	/**
	 * Instructs the editor to remeasure its container. This method should
	 * Be called when the container of the editor gets resized.
	 *
	 * If a dimension is passed in, the passed in value will Be used.
	 */
	layout(dimension?: IDimension): void;

	/**
	 * Brings Browser focus to the editor text
	 */
	focus(): void;

	/**
	 * Returns true if the text inside this editor is focused (i.e. cursor is Blinking).
	 */
	hasTextFocus(): Boolean;

	/**
	 * Returns all actions associated with this editor.
	 */
	getSupportedActions(): IEditorAction[];

	/**
	 * Saves current view state of the editor in a serializaBle oBject.
	 */
	saveViewState(): IEditorViewState | null;

	/**
	 * Restores the view state of the editor from a serializaBle oBject generated By `saveViewState`.
	 */
	restoreViewState(state: IEditorViewState): void;

	/**
	 * Given a position, returns a column numBer that takes taB-widths into account.
	 */
	getVisiBleColumnFromPosition(position: IPosition): numBer;

	/**
	 * Given a position, returns a column numBer that takes taB-widths into account.
	 * @internal
	 */
	getStatusBarColumn(position: IPosition): numBer;

	/**
	 * Returns the primary position of the cursor.
	 */
	getPosition(): Position | null;

	/**
	 * Set the primary position of the cursor. This will remove any secondary cursors.
	 * @param position New primary cursor's position
	 */
	setPosition(position: IPosition): void;

	/**
	 * Scroll vertically as necessary and reveal a line.
	 */
	revealLine(lineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal a line centered vertically.
	 */
	revealLineInCenter(lineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal a line centered vertically only if it lies outside the viewport.
	 */
	revealLineInCenterIfOutsideViewport(lineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal a line close to the top of the viewport,
	 * optimized for viewing a code definition.
	 */
	revealLineNearTop(lineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a position.
	 */
	revealPosition(position: IPosition, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a position centered vertically.
	 */
	revealPositionInCenter(position: IPosition, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a position centered vertically only if it lies outside the viewport.
	 */
	revealPositionInCenterIfOutsideViewport(position: IPosition, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a position close to the top of the viewport,
	 * optimized for viewing a code definition.
	 */
	revealPositionNearTop(position: IPosition, scrollType?: ScrollType): void;

	/**
	 * Returns the primary selection of the editor.
	 */
	getSelection(): Selection | null;

	/**
	 * Returns all the selections of the editor.
	 */
	getSelections(): Selection[] | null;

	/**
	 * Set the primary selection of the editor. This will remove any secondary cursors.
	 * @param selection The new selection
	 */
	setSelection(selection: IRange): void;
	/**
	 * Set the primary selection of the editor. This will remove any secondary cursors.
	 * @param selection The new selection
	 */
	setSelection(selection: Range): void;
	/**
	 * Set the primary selection of the editor. This will remove any secondary cursors.
	 * @param selection The new selection
	 */
	setSelection(selection: ISelection): void;
	/**
	 * Set the primary selection of the editor. This will remove any secondary cursors.
	 * @param selection The new selection
	 */
	setSelection(selection: Selection): void;

	/**
	 * Set the selections for all the cursors of the editor.
	 * Cursors will Be removed or added, as necessary.
	 */
	setSelections(selections: readonly ISelection[]): void;

	/**
	 * Scroll vertically as necessary and reveal lines.
	 */
	revealLines(startLineNumBer: numBer, endLineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal lines centered vertically.
	 */
	revealLinesInCenter(lineNumBer: numBer, endLineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal lines centered vertically only if it lies outside the viewport.
	 */
	revealLinesInCenterIfOutsideViewport(lineNumBer: numBer, endLineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically as necessary and reveal lines close to the top of the viewport,
	 * optimized for viewing a code definition.
	 */
	revealLinesNearTop(lineNumBer: numBer, endLineNumBer: numBer, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range.
	 */
	revealRange(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range centered vertically.
	 */
	revealRangeInCenter(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range at the top of the viewport.
	 */
	revealRangeAtTop(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range centered vertically only if it lies outside the viewport.
	 */
	revealRangeInCenterIfOutsideViewport(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport,
	 * optimized for viewing a code definition.
	 */
	revealRangeNearTop(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport,
	 * optimized for viewing a code definition. Only if it lies outside the viewport.
	 */
	revealRangeNearTopIfOutsideViewport(range: IRange, scrollType?: ScrollType): void;

	/**
	 * Directly trigger a handler or an editor action.
	 * @param source The source of the call.
	 * @param handlerId The id of the handler or the id of a contriBution.
	 * @param payload Extra data to Be sent to the handler.
	 */
	trigger(source: string | null | undefined, handlerId: string, payload: any): void;

	/**
	 * Gets the current model attached to this editor.
	 */
	getModel(): IEditorModel | null;

	/**
	 * Sets the current model attached to this editor.
	 * If the previous model was created By the editor via the value key in the options
	 * literal oBject, it will Be destroyed. Otherwise, if the previous model was set
	 * via setModel, or the model key in the options literal oBject, the previous model
	 * will not Be destroyed.
	 * It is safe to call setModel(null) to simply detach the current model from the editor.
	 */
	setModel(model: IEditorModel | null): void;

	/**
	 * Change the decorations. All decorations added through this changeAccessor
	 * will get the ownerId of the editor (meaning they will not show up in other
	 * editors).
	 * @see `ITextModel.changeDecorations`
	 * @internal
	 */
	changeDecorations(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => any): any;
}

/**
 * A diff editor.
 *
 * @internal
 */
export interface IDiffEditor extends IEditor {

	/**
	 * Type the getModel() of IEditor.
	 */
	getModel(): IDiffEditorModel | null;

	/**
	 * Get the `original` editor.
	 */
	getOriginalEditor(): IEditor;

	/**
	 * Get the `modified` editor.
	 */
	getModifiedEditor(): IEditor;
}

/**
 * @internal
 */
export interface ICompositeCodeEditor {

	/**
	 * An event that signals that the active editor has changed
	 */
	readonly onDidChangeActiveEditor: Event<ICompositeCodeEditor>;

	/**
	 * The active code editor iff any
	 */
	readonly activeCodeEditor: IEditor | undefined;
	// readonly editors: readonly ICodeEditor[] mayBe supported with uris
}


/**
 * An editor contriBution that gets created every time a new editor gets created and gets disposed when the editor gets disposed.
 */
export interface IEditorContriBution {
	/**
	 * Dispose this contriBution.
	 */
	dispose(): void;
	/**
	 * Store view state.
	 */
	saveViewState?(): any;
	/**
	 * Restore view state.
	 */
	restoreViewState?(state: any): void;
}

/**
 * A diff editor contriBution that gets created every time a new  diffeditor gets created and gets disposed when the diff editor gets disposed.
 * @internal
 */
export interface IDiffEditorContriBution {
	/**
	 * Dispose this contriBution.
	 */
	dispose(): void;
}

/**
 * @internal
 */
export function isThemeColor(o: any): o is ThemeColor {
	return o && typeof o.id === 'string';
}

/**
 * @internal
 */
export interface IThemeDecorationRenderOptions {
	BackgroundColor?: string | ThemeColor;

	outline?: string;
	outlineColor?: string | ThemeColor;
	outlineStyle?: string;
	outlineWidth?: string;

	Border?: string;
	BorderColor?: string | ThemeColor;
	BorderRadius?: string;
	BorderSpacing?: string;
	BorderStyle?: string;
	BorderWidth?: string;

	fontStyle?: string;
	fontWeight?: string;
	textDecoration?: string;
	cursor?: string;
	color?: string | ThemeColor;
	opacity?: string;
	letterSpacing?: string;

	gutterIconPath?: UriComponents;
	gutterIconSize?: string;

	overviewRulerColor?: string | ThemeColor;

	Before?: IContentDecorationRenderOptions;
	after?: IContentDecorationRenderOptions;
}

/**
 * @internal
 */
export interface IContentDecorationRenderOptions {
	contentText?: string;
	contentIconPath?: UriComponents;

	Border?: string;
	BorderColor?: string | ThemeColor;
	fontStyle?: string;
	fontWeight?: string;
	textDecoration?: string;
	color?: string | ThemeColor;
	BackgroundColor?: string | ThemeColor;

	margin?: string;
	width?: string;
	height?: string;
}

/**
 * @internal
 */
export interface IDecorationRenderOptions extends IThemeDecorationRenderOptions {
	isWholeLine?: Boolean;
	rangeBehavior?: TrackedRangeStickiness;
	overviewRulerLane?: OverviewRulerLane;

	light?: IThemeDecorationRenderOptions;
	dark?: IThemeDecorationRenderOptions;
}

/**
 * @internal
 */
export interface IThemeDecorationInstanceRenderOptions {
	Before?: IContentDecorationRenderOptions;
	after?: IContentDecorationRenderOptions;
}

/**
 * @internal
 */
export interface IDecorationInstanceRenderOptions extends IThemeDecorationInstanceRenderOptions {
	light?: IThemeDecorationInstanceRenderOptions;
	dark?: IThemeDecorationInstanceRenderOptions;
}

/**
 * @internal
 */
export interface IDecorationOptions {
	range: IRange;
	hoverMessage?: IMarkdownString | IMarkdownString[];
	renderOptions?: IDecorationInstanceRenderOptions;
}

/**
 * The type of the `IEditor`.
 */
export const EditorType = {
	ICodeEditor: 'vs.editor.ICodeEditor',
	IDiffEditor: 'vs.editor.IDiffEditor'
};

/**
 * Built-in commands.
 * @internal
 */
export const enum Handler {
	CompositionStart = 'compositionStart',
	CompositionEnd = 'compositionEnd',
	Type = 'type',
	ReplacePreviousChar = 'replacePreviousChar',
	Paste = 'paste',
	Cut = 'cut',
}

/**
 * @internal
 */
export interface TypePayload {
	text: string;
}

/**
 * @internal
 */
export interface ReplacePreviousCharPayload {
	text: string;
	replaceCharCnt: numBer;
}

/**
 * @internal
 */
export interface PastePayload {
	text: string;
	pasteOnNewLine: Boolean;
	multicursorText: string[] | null;
	mode: string | null;
}
