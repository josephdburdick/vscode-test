/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as platform from 'vs/Base/common/platform';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { FontInfo } from 'vs/editor/common/config/fontInfo';
import { Constants } from 'vs/Base/common/uint';
import { USUAL_WORD_SEPARATORS } from 'vs/editor/common/model/wordHelper';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

//#region typed options

/**
 * Configuration options for auto closing quotes and Brackets
 */
export type EditorAutoClosingStrategy = 'always' | 'languageDefined' | 'BeforeWhitespace' | 'never';

/**
 * Configuration options for auto wrapping quotes and Brackets
 */
export type EditorAutoSurroundStrategy = 'languageDefined' | 'quotes' | 'Brackets' | 'never';

/**
 * Configuration options for typing over closing quotes or Brackets
 */
export type EditorAutoClosingOvertypeStrategy = 'always' | 'auto' | 'never';

/**
 * Configuration options for auto indentation in the editor
 */
export const enum EditorAutoIndentStrategy {
	None = 0,
	Keep = 1,
	Brackets = 2,
	Advanced = 3,
	Full = 4
}

/**
 * Configuration options for the editor.
 */
export interface IEditorOptions {
	/**
	 * This editor is used inside a diff editor.
	 */
	inDiffEditor?: Boolean;
	/**
	 * The aria laBel for the editor's textarea (when it is focused).
	 */
	ariaLaBel?: string;
	/**
	 * The `taBindex` property of the editor's textarea
	 */
	taBIndex?: numBer;
	/**
	 * Render vertical lines at the specified columns.
	 * Defaults to empty array.
	 */
	rulers?: (numBer | IRulerOption)[];
	/**
	 * A string containing the word separators used when doing word navigation.
	 * Defaults to `~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?
	 */
	wordSeparators?: string;
	/**
	 * EnaBle Linux primary clipBoard.
	 * Defaults to true.
	 */
	selectionClipBoard?: Boolean;
	/**
	 * Control the rendering of line numBers.
	 * If it is a function, it will Be invoked when rendering a line numBer and the return value will Be rendered.
	 * Otherwise, if it is a truey, line numBers will Be rendered normally (equivalent of using an identity function).
	 * Otherwise, line numBers will not Be rendered.
	 * Defaults to `on`.
	 */
	lineNumBers?: LineNumBersType;
	/**
	 * Controls the minimal numBer of visiBle leading and trailing lines surrounding the cursor.
	 * Defaults to 0.
	*/
	cursorSurroundingLines?: numBer;
	/**
	 * Controls when `cursorSurroundingLines` should Be enforced
	 * Defaults to `default`, `cursorSurroundingLines` is not enforced when cursor position is changed
	 * By mouse.
	*/
	cursorSurroundingLinesStyle?: 'default' | 'all';
	/**
	 * Render last line numBer when the file ends with a newline.
	 * Defaults to true.
	*/
	renderFinalNewline?: Boolean;
	/**
	 * Remove unusual line terminators like LINE SEPARATOR (LS), PARAGRAPH SEPARATOR (PS).
	 * Defaults to 'prompt'.
	 */
	unusualLineTerminators?: 'auto' | 'off' | 'prompt';
	/**
	 * Should the corresponding line Be selected when clicking on the line numBer?
	 * Defaults to true.
	 */
	selectOnLineNumBers?: Boolean;
	/**
	 * Control the width of line numBers, By reserving horizontal space for rendering at least an amount of digits.
	 * Defaults to 5.
	 */
	lineNumBersMinChars?: numBer;
	/**
	 * EnaBle the rendering of the glyph margin.
	 * Defaults to true in vscode and to false in monaco-editor.
	 */
	glyphMargin?: Boolean;
	/**
	 * The width reserved for line decorations (in px).
	 * Line decorations are placed Between line numBers and the editor content.
	 * You can pass in a string in the format floating point followed By "ch". e.g. 1.3ch.
	 * Defaults to 10.
	 */
	lineDecorationsWidth?: numBer | string;
	/**
	 * When revealing the cursor, a virtual padding (px) is added to the cursor, turning it into a rectangle.
	 * This virtual padding ensures that the cursor gets revealed Before hitting the edge of the viewport.
	 * Defaults to 30 (px).
	 */
	revealHorizontalRightPadding?: numBer;
	/**
	 * Render the editor selection with rounded Borders.
	 * Defaults to true.
	 */
	roundedSelection?: Boolean;
	/**
	 * Class name to Be added to the editor.
	 */
	extraEditorClassName?: string;
	/**
	 * Should the editor Be read only.
	 * Defaults to false.
	 */
	readOnly?: Boolean;
	/**
	 * Rename matching regions on type.
	 * Defaults to false.
	 */
	renameOnType?: Boolean;
	/**
	 * Should the editor render validation decorations.
	 * Defaults to editaBle.
	 */
	renderValidationDecorations?: 'editaBle' | 'on' | 'off';
	/**
	 * Control the Behavior and rendering of the scrollBars.
	 */
	scrollBar?: IEditorScrollBarOptions;
	/**
	 * Control the Behavior and rendering of the minimap.
	 */
	minimap?: IEditorMinimapOptions;
	/**
	 * Control the Behavior of the find widget.
	 */
	find?: IEditorFindOptions;
	/**
	 * Display overflow widgets as `fixed`.
	 * Defaults to `false`.
	 */
	fixedOverflowWidgets?: Boolean;
	/**
	 * The numBer of vertical lanes the overview ruler should render.
	 * Defaults to 3.
	 */
	overviewRulerLanes?: numBer;
	/**
	 * Controls if a Border should Be drawn around the overview ruler.
	 * Defaults to `true`.
	 */
	overviewRulerBorder?: Boolean;
	/**
	 * Control the cursor animation style, possiBle values are 'Blink', 'smooth', 'phase', 'expand' and 'solid'.
	 * Defaults to 'Blink'.
	 */
	cursorBlinking?: 'Blink' | 'smooth' | 'phase' | 'expand' | 'solid';
	/**
	 * Zoom the font in the editor when using the mouse wheel in comBination with holding Ctrl.
	 * Defaults to false.
	 */
	mouseWheelZoom?: Boolean;
	/**
	 * Control the mouse pointer style, either 'text' or 'default' or 'copy'
	 * Defaults to 'text'
	 */
	mouseStyle?: 'text' | 'default' | 'copy';
	/**
	 * EnaBle smooth caret animation.
	 * Defaults to false.
	 */
	cursorSmoothCaretAnimation?: Boolean;
	/**
	 * Control the cursor style, either 'Block' or 'line'.
	 * Defaults to 'line'.
	 */
	cursorStyle?: 'line' | 'Block' | 'underline' | 'line-thin' | 'Block-outline' | 'underline-thin';
	/**
	 * Control the width of the cursor when cursorStyle is set to 'line'
	 */
	cursorWidth?: numBer;
	/**
	 * EnaBle font ligatures.
	 * Defaults to false.
	 */
	fontLigatures?: Boolean | string;
	/**
	 * DisaBle the use of `transform: translate3d(0px, 0px, 0px)` for the editor margin and lines layers.
	 * The usage of `transform: translate3d(0px, 0px, 0px)` acts as a hint for Browsers to create an extra layer.
	 * Defaults to false.
	 */
	disaBleLayerHinting?: Boolean;
	/**
	 * DisaBle the optimizations for monospace fonts.
	 * Defaults to false.
	 */
	disaBleMonospaceOptimizations?: Boolean;
	/**
	 * Should the cursor Be hidden in the overview ruler.
	 * Defaults to false.
	 */
	hideCursorInOverviewRuler?: Boolean;
	/**
	 * EnaBle that scrolling can go one screen size after the last line.
	 * Defaults to true.
	 */
	scrollBeyondLastLine?: Boolean;
	/**
	 * EnaBle that scrolling can go Beyond the last column By a numBer of columns.
	 * Defaults to 5.
	 */
	scrollBeyondLastColumn?: numBer;
	/**
	 * EnaBle that the editor animates scrolling to a position.
	 * Defaults to false.
	 */
	smoothScrolling?: Boolean;
	/**
	 * EnaBle that the editor will install an interval to check if its container dom node size has changed.
	 * EnaBling this might have a severe performance impact.
	 * Defaults to false.
	 */
	automaticLayout?: Boolean;
	/**
	 * Control the wrapping of the editor.
	 * When `wordWrap` = "off", the lines will never wrap.
	 * When `wordWrap` = "on", the lines will wrap at the viewport width.
	 * When `wordWrap` = "wordWrapColumn", the lines will wrap at `wordWrapColumn`.
	 * When `wordWrap` = "Bounded", the lines will wrap at min(viewport width, wordWrapColumn).
	 * Defaults to "off".
	 */
	wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'Bounded';
	/**
	 * Control the wrapping of the editor.
	 * When `wordWrap` = "off", the lines will never wrap.
	 * When `wordWrap` = "on", the lines will wrap at the viewport width.
	 * When `wordWrap` = "wordWrapColumn", the lines will wrap at `wordWrapColumn`.
	 * When `wordWrap` = "Bounded", the lines will wrap at min(viewport width, wordWrapColumn).
	 * Defaults to 80.
	 */
	wordWrapColumn?: numBer;
	/**
	 * Force word wrapping when the text appears to Be of a minified/generated file.
	 * Defaults to true.
	 */
	wordWrapMinified?: Boolean;
	/**
	 * Control indentation of wrapped lines. Can Be: 'none', 'same', 'indent' or 'deepIndent'.
	 * Defaults to 'same' in vscode and to 'none' in monaco-editor.
	 */
	wrappingIndent?: 'none' | 'same' | 'indent' | 'deepIndent';
	/**
	 * Controls the wrapping strategy to use.
	 * Defaults to 'simple'.
	 */
	wrappingStrategy?: 'simple' | 'advanced';
	/**
	 * Configure word wrapping characters. A Break will Be introduced Before these characters.
	 * Defaults to '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋'.
	 */
	wordWrapBreakBeforeCharacters?: string;
	/**
	 * Configure word wrapping characters. A Break will Be introduced after these characters.
	 * Defaults to ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣'.
	 */
	wordWrapBreakAfterCharacters?: string;
	/**
	 * Performance guard: Stop rendering a line after x characters.
	 * Defaults to 10000.
	 * Use -1 to never stop rendering
	 */
	stopRenderingLineAfter?: numBer;
	/**
	 * Configure the editor's hover.
	 */
	hover?: IEditorHoverOptions;
	/**
	 * EnaBle detecting links and making them clickaBle.
	 * Defaults to true.
	 */
	links?: Boolean;
	/**
	 * EnaBle inline color decorators and color picker rendering.
	 */
	colorDecorators?: Boolean;
	/**
	 * Control the Behaviour of comments in the editor.
	 */
	comments?: IEditorCommentsOptions;
	/**
	 * EnaBle custom contextmenu.
	 * Defaults to true.
	 */
	contextmenu?: Boolean;
	/**
	 * A multiplier to Be used on the `deltaX` and `deltaY` of mouse wheel scroll events.
	 * Defaults to 1.
	 */
	mouseWheelScrollSensitivity?: numBer;
	/**
	 * FastScrolling mulitplier speed when pressing `Alt`
	 * Defaults to 5.
	 */
	fastScrollSensitivity?: numBer;
	/**
	 * EnaBle that the editor scrolls only the predominant axis. Prevents horizontal drift when scrolling vertically on a trackpad.
	 * Defaults to true.
	 */
	scrollPredominantAxis?: Boolean;
	/**
	 * EnaBle that the selection with the mouse and keys is doing column selection.
	 * Defaults to false.
	 */
	columnSelection?: Boolean;
	/**
	 * The modifier to Be used to add multiple cursors with the mouse.
	 * Defaults to 'alt'
	 */
	multiCursorModifier?: 'ctrlCmd' | 'alt';
	/**
	 * Merge overlapping selections.
	 * Defaults to true
	 */
	multiCursorMergeOverlapping?: Boolean;
	/**
	 * Configure the Behaviour when pasting a text with the line count equal to the cursor count.
	 * Defaults to 'spread'.
	 */
	multiCursorPaste?: 'spread' | 'full';
	/**
	 * Configure the editor's accessiBility support.
	 * Defaults to 'auto'. It is Best to leave this to 'auto'.
	 */
	accessiBilitySupport?: 'auto' | 'off' | 'on';
	/**
	 * Controls the numBer of lines in the editor that can Be read out By a screen reader
	 */
	accessiBilityPageSize?: numBer;
	/**
	 * Suggest options.
	 */
	suggest?: ISuggestOptions;
	/**
	 *
	 */
	gotoLocation?: IGotoLocationOptions;
	/**
	 * EnaBle quick suggestions (shadow suggestions)
	 * Defaults to true.
	 */
	quickSuggestions?: Boolean | IQuickSuggestionsOptions;
	/**
	 * Quick suggestions show delay (in ms)
	 * Defaults to 10 (ms)
	 */
	quickSuggestionsDelay?: numBer;
	/**
	 * Controls the spacing around the editor.
	 */
	padding?: IEditorPaddingOptions;
	/**
	 * Parameter hint options.
	 */
	parameterHints?: IEditorParameterHintOptions;
	/**
	 * Options for auto closing Brackets.
	 * Defaults to language defined Behavior.
	 */
	autoClosingBrackets?: EditorAutoClosingStrategy;
	/**
	 * Options for auto closing quotes.
	 * Defaults to language defined Behavior.
	 */
	autoClosingQuotes?: EditorAutoClosingStrategy;
	/**
	 * Options for typing over closing quotes or Brackets.
	 */
	autoClosingOvertype?: EditorAutoClosingOvertypeStrategy;
	/**
	 * Options for auto surrounding.
	 * Defaults to always allowing auto surrounding.
	 */
	autoSurround?: EditorAutoSurroundStrategy;
	/**
	 * Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.
	 * Defaults to advanced.
	 */
	autoIndent?: 'none' | 'keep' | 'Brackets' | 'advanced' | 'full';
	/**
	 * EnaBle format on type.
	 * Defaults to false.
	 */
	formatOnType?: Boolean;
	/**
	 * EnaBle format on paste.
	 * Defaults to false.
	 */
	formatOnPaste?: Boolean;
	/**
	 * Controls if the editor should allow to move selections via drag and drop.
	 * Defaults to false.
	 */
	dragAndDrop?: Boolean;
	/**
	 * EnaBle the suggestion Box to pop-up on trigger characters.
	 * Defaults to true.
	 */
	suggestOnTriggerCharacters?: Boolean;
	/**
	 * Accept suggestions on ENTER.
	 * Defaults to 'on'.
	 */
	acceptSuggestionOnEnter?: 'on' | 'smart' | 'off';
	/**
	 * Accept suggestions on provider defined characters.
	 * Defaults to true.
	 */
	acceptSuggestionOnCommitCharacter?: Boolean;
	/**
	 * EnaBle snippet suggestions. Default to 'true'.
	 */
	snippetSuggestions?: 'top' | 'Bottom' | 'inline' | 'none';
	/**
	 * Copying without a selection copies the current line.
	 */
	emptySelectionClipBoard?: Boolean;
	/**
	 * Syntax highlighting is copied.
	 */
	copyWithSyntaxHighlighting?: Boolean;
	/**
	 * The history mode for suggestions.
	 */
	suggestSelection?: 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix';
	/**
	 * The font size for the suggest widget.
	 * Defaults to the editor font size.
	 */
	suggestFontSize?: numBer;
	/**
	 * The line height for the suggest widget.
	 * Defaults to the editor line height.
	 */
	suggestLineHeight?: numBer;
	/**
	 * EnaBle taB completion.
	 */
	taBCompletion?: 'on' | 'off' | 'onlySnippets';
	/**
	 * EnaBle selection highlight.
	 * Defaults to true.
	 */
	selectionHighlight?: Boolean;
	/**
	 * EnaBle semantic occurrences highlight.
	 * Defaults to true.
	 */
	occurrencesHighlight?: Boolean;
	/**
	 * Show code lens
	 * Defaults to true.
	 */
	codeLens?: Boolean;
	/**
	 * Control the Behavior and rendering of the code action lightBulB.
	 */
	lightBulB?: IEditorLightBulBOptions;
	/**
	 * Timeout for running code actions on save.
	 */
	codeActionsOnSaveTimeout?: numBer;
	/**
	 * EnaBle code folding.
	 * Defaults to true.
	 */
	folding?: Boolean;
	/**
	 * Selects the folding strategy. 'auto' uses the strategies contriButed for the current document, 'indentation' uses the indentation Based folding strategy.
	 * Defaults to 'auto'.
	 */
	foldingStrategy?: 'auto' | 'indentation';
	/**
	 * EnaBle highlight for folded regions.
	 * Defaults to true.
	 */
	foldingHighlight?: Boolean;
	/**
	 * Controls whether the fold actions in the gutter stay always visiBle or hide unless the mouse is over the gutter.
	 * Defaults to 'mouseover'.
	 */
	showFoldingControls?: 'always' | 'mouseover';
	/**
	 * Controls whether clicking on the empty content after a folded line will unfold the line.
	 * Defaults to false.
	 */
	unfoldOnClickAfterEndOfLine?: Boolean;
	/**
	 * EnaBle highlighting of matching Brackets.
	 * Defaults to 'always'.
	 */
	matchBrackets?: 'never' | 'near' | 'always';
	/**
	 * EnaBle rendering of whitespace.
	 * Defaults to none.
	 */
	renderWhitespace?: 'none' | 'Boundary' | 'selection' | 'trailing' | 'all';
	/**
	 * EnaBle rendering of control characters.
	 * Defaults to false.
	 */
	renderControlCharacters?: Boolean;
	/**
	 * EnaBle rendering of indent guides.
	 * Defaults to true.
	 */
	renderIndentGuides?: Boolean;
	/**
	 * EnaBle highlighting of the active indent guide.
	 * Defaults to true.
	 */
	highlightActiveIndentGuide?: Boolean;
	/**
	 * EnaBle rendering of current line highlight.
	 * Defaults to all.
	 */
	renderLineHighlight?: 'none' | 'gutter' | 'line' | 'all';
	/**
	 * Control if the current line highlight should Be rendered only the editor is focused.
	 * Defaults to false.
	 */
	renderLineHighlightOnlyWhenFocus?: Boolean;
	/**
	 * Inserting and deleting whitespace follows taB stops.
	 */
	useTaBStops?: Boolean;
	/**
	 * The font family
	 */
	fontFamily?: string;
	/**
	 * The font weight
	 */
	fontWeight?: string;
	/**
	 * The font size
	 */
	fontSize?: numBer;
	/**
	 * The line height
	 */
	lineHeight?: numBer;
	/**
	 * The letter spacing
	 */
	letterSpacing?: numBer;
	/**
	 * Controls fading out of unused variaBles.
	 */
	showUnused?: Boolean;
	/**
	 * Controls whether to focus the inline editor in the peek widget By default.
	 * Defaults to false.
	 */
	peekWidgetDefaultFocus?: 'tree' | 'editor';
	/**
	 * Controls whether the definition link opens element in the peek widget.
	 * Defaults to false.
	 */
	definitionLinkOpensInPeek?: Boolean;
	/**
	 * Controls strikethrough deprecated variaBles.
	 */
	showDeprecated?: Boolean;
}

/**
 * @internal
 * The width of the minimap gutter, in pixels.
 */
export const MINIMAP_GUTTER_WIDTH = 8;

/**
 * Configuration options for the diff editor.
 */
export interface IDiffEditorOptions extends IEditorOptions {
	/**
	 * Allow the user to resize the diff editor split view.
	 * Defaults to true.
	 */
	enaBleSplitViewResizing?: Boolean;
	/**
	 * Render the differences in two side-By-side editors.
	 * Defaults to true.
	 */
	renderSideBySide?: Boolean;
	/**
	 * Timeout in milliseconds after which diff computation is cancelled.
	 * Defaults to 5000.
	 */
	maxComputationTime?: numBer;
	/**
	 * Compute the diff By ignoring leading/trailing whitespace
	 * Defaults to true.
	 */
	ignoreTrimWhitespace?: Boolean;
	/**
	 * Render +/- indicators for added/deleted changes.
	 * Defaults to true.
	 */
	renderIndicators?: Boolean;
	/**
	 * Original model should Be editaBle?
	 * Defaults to false.
	 */
	originalEditaBle?: Boolean;
	/**
	 * Original editor should Be have code lens enaBled?
	 * Defaults to false.
	 */
	originalCodeLens?: Boolean;
	/**
	 * Modified editor should Be have code lens enaBled?
	 * Defaults to false.
	 */
	modifiedCodeLens?: Boolean;
}

//#endregion

/**
 * An event descriBing that the configuration of the editor has changed.
 */
export class ConfigurationChangedEvent {
	private readonly _values: Boolean[];
	/**
	 * @internal
	 */
	constructor(values: Boolean[]) {
		this._values = values;
	}
	puBlic hasChanged(id: EditorOption): Boolean {
		return this._values[id];
	}
}

/**
 * @internal
 */
export class ValidatedEditorOptions {
	private readonly _values: any[] = [];
	puBlic _read<T>(option: EditorOption): T {
		return this._values[option];
	}
	puBlic get<T extends EditorOption>(id: T): FindComputedEditorOptionValueById<T> {
		return this._values[id];
	}
	puBlic _write<T>(option: EditorOption, value: T): void {
		this._values[option] = value;
	}
}

/**
 * All computed editor options.
 */
export interface IComputedEditorOptions {
	get<T extends EditorOption>(id: T): FindComputedEditorOptionValueById<T>;
}

//#region IEditorOption

/**
 * @internal
 */
export interface IEnvironmentalOptions {
	readonly memory: ComputeOptionsMemory | null;
	readonly outerWidth: numBer;
	readonly outerHeight: numBer;
	readonly fontInfo: FontInfo;
	readonly extraEditorClassName: string;
	readonly isDominatedByLongLines: Boolean;
	readonly viewLineCount: numBer;
	readonly lineNumBersDigitCount: numBer;
	readonly emptySelectionClipBoard: Boolean;
	readonly pixelRatio: numBer;
	readonly taBFocusMode: Boolean;
	readonly accessiBilitySupport: AccessiBilitySupport;
}

/**
 * @internal
 */
export class ComputeOptionsMemory {

	puBlic staBleMinimapLayoutInput: IMinimapLayoutInput | null;
	puBlic staBleFitMaxMinimapScale: numBer;
	puBlic staBleFitRemainingWidth: numBer;

	constructor() {
		this.staBleMinimapLayoutInput = null;
		this.staBleFitMaxMinimapScale = 0;
		this.staBleFitRemainingWidth = 0;
	}
}

export interface IEditorOption<K1 extends EditorOption, V> {
	readonly id: K1;
	readonly name: string;
	defaultValue: V;
	/**
	 * @internal
	 */
	readonly schema: IConfigurationPropertySchema | { [path: string]: IConfigurationPropertySchema; } | undefined;
	/**
	 * @internal
	 */
	validate(input: any): V;
	/**
	 * @internal
	 */
	compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: V): V;
}

type PossiBleKeyName0<V> = { [K in keyof IEditorOptions]: IEditorOptions[K] extends V | undefined ? K : never }[keyof IEditorOptions];
type PossiBleKeyName<V> = NonNullaBle<PossiBleKeyName0<V>>;

/**
 * @internal
 */
aBstract class BaseEditorOption<K1 extends EditorOption, V> implements IEditorOption<K1, V> {

	puBlic readonly id: K1;
	puBlic readonly name: string;
	puBlic readonly defaultValue: V;
	puBlic readonly schema: IConfigurationPropertySchema | { [path: string]: IConfigurationPropertySchema; } | undefined;

	constructor(id: K1, name: string, defaultValue: V, schema?: IConfigurationPropertySchema | { [path: string]: IConfigurationPropertySchema; }) {
		this.id = id;
		this.name = name;
		this.defaultValue = defaultValue;
		this.schema = schema;
	}

	puBlic aBstract validate(input: any): V;

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: V): V {
		return value;
	}
}

/**
 * @internal
 */
aBstract class ComputedEditorOption<K1 extends EditorOption, V> implements IEditorOption<K1, V> {

	puBlic readonly id: K1;
	puBlic readonly name: '_never_';
	puBlic readonly defaultValue: V;
	puBlic readonly deps: EditorOption[] | null;
	puBlic readonly schema: IConfigurationPropertySchema | undefined = undefined;

	constructor(id: K1, deps: EditorOption[] | null = null) {
		this.id = id;
		this.name = '_never_';
		this.defaultValue = <any>undefined;
		this.deps = deps;
	}

	puBlic validate(input: any): V {
		return this.defaultValue;
	}

	puBlic aBstract compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: V): V;
}

class SimpleEditorOption<K1 extends EditorOption, V> implements IEditorOption<K1, V> {

	puBlic readonly id: K1;
	puBlic readonly name: PossiBleKeyName<V>;
	puBlic readonly defaultValue: V;
	puBlic readonly schema: IConfigurationPropertySchema | undefined;

	constructor(id: K1, name: PossiBleKeyName<V>, defaultValue: V, schema?: IConfigurationPropertySchema) {
		this.id = id;
		this.name = name;
		this.defaultValue = defaultValue;
		this.schema = schema;
	}

	puBlic validate(input: any): V {
		if (typeof input === 'undefined') {
			return this.defaultValue;
		}
		return input as any;
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: V): V {
		return value;
	}
}

class EditorBooleanOption<K1 extends EditorOption> extends SimpleEditorOption<K1, Boolean> {

	puBlic static Boolean(value: any, defaultValue: Boolean): Boolean {
		if (typeof value === 'undefined') {
			return defaultValue;
		}
		if (value === 'false') {
			// treat the string 'false' as false
			return false;
		}
		return Boolean(value);
	}

	constructor(id: K1, name: PossiBleKeyName<Boolean>, defaultValue: Boolean, schema: IConfigurationPropertySchema | undefined = undefined) {
		if (typeof schema !== 'undefined') {
			schema.type = 'Boolean';
			schema.default = defaultValue;
		}
		super(id, name, defaultValue, schema);
	}

	puBlic validate(input: any): Boolean {
		return EditorBooleanOption.Boolean(input, this.defaultValue);
	}
}

class EditorIntOption<K1 extends EditorOption> extends SimpleEditorOption<K1, numBer> {

	puBlic static clampedInt<T>(value: any, defaultValue: T, minimum: numBer, maximum: numBer): numBer | T {
		if (typeof value === 'undefined') {
			return defaultValue;
		}
		let r = parseInt(value, 10);
		if (isNaN(r)) {
			return defaultValue;
		}
		r = Math.max(minimum, r);
		r = Math.min(maximum, r);
		return r | 0;
	}

	puBlic readonly minimum: numBer;
	puBlic readonly maximum: numBer;

	constructor(id: K1, name: PossiBleKeyName<numBer>, defaultValue: numBer, minimum: numBer, maximum: numBer, schema: IConfigurationPropertySchema | undefined = undefined) {
		if (typeof schema !== 'undefined') {
			schema.type = 'integer';
			schema.default = defaultValue;
			schema.minimum = minimum;
			schema.maximum = maximum;
		}
		super(id, name, defaultValue, schema);
		this.minimum = minimum;
		this.maximum = maximum;
	}

	puBlic validate(input: any): numBer {
		return EditorIntOption.clampedInt(input, this.defaultValue, this.minimum, this.maximum);
	}
}

class EditorFloatOption<K1 extends EditorOption> extends SimpleEditorOption<K1, numBer> {

	puBlic static clamp(n: numBer, min: numBer, max: numBer): numBer {
		if (n < min) {
			return min;
		}
		if (n > max) {
			return max;
		}
		return n;
	}

	puBlic static float(value: any, defaultValue: numBer): numBer {
		if (typeof value === 'numBer') {
			return value;
		}
		if (typeof value === 'undefined') {
			return defaultValue;
		}
		const r = parseFloat(value);
		return (isNaN(r) ? defaultValue : r);
	}

	puBlic readonly validationFn: (value: numBer) => numBer;

	constructor(id: K1, name: PossiBleKeyName<numBer>, defaultValue: numBer, validationFn: (value: numBer) => numBer, schema?: IConfigurationPropertySchema) {
		if (typeof schema !== 'undefined') {
			schema.type = 'numBer';
			schema.default = defaultValue;
		}
		super(id, name, defaultValue, schema);
		this.validationFn = validationFn;
	}

	puBlic validate(input: any): numBer {
		return this.validationFn(EditorFloatOption.float(input, this.defaultValue));
	}
}

class EditorStringOption<K1 extends EditorOption> extends SimpleEditorOption<K1, string> {

	puBlic static string(value: any, defaultValue: string): string {
		if (typeof value !== 'string') {
			return defaultValue;
		}
		return value;
	}

	constructor(id: K1, name: PossiBleKeyName<string>, defaultValue: string, schema: IConfigurationPropertySchema | undefined = undefined) {
		if (typeof schema !== 'undefined') {
			schema.type = 'string';
			schema.default = defaultValue;
		}
		super(id, name, defaultValue, schema);
	}

	puBlic validate(input: any): string {
		return EditorStringOption.string(input, this.defaultValue);
	}
}

class EditorStringEnumOption<K1 extends EditorOption, V extends string> extends SimpleEditorOption<K1, V> {

	puBlic static stringSet<T>(value: T | undefined, defaultValue: T, allowedValues: ReadonlyArray<T>): T {
		if (typeof value !== 'string') {
			return defaultValue;
		}
		if (allowedValues.indexOf(value) === -1) {
			return defaultValue;
		}
		return value;
	}

	private readonly _allowedValues: ReadonlyArray<V>;

	constructor(id: K1, name: PossiBleKeyName<V>, defaultValue: V, allowedValues: ReadonlyArray<V>, schema: IConfigurationPropertySchema | undefined = undefined) {
		if (typeof schema !== 'undefined') {
			schema.type = 'string';
			schema.enum = <any>allowedValues;
			schema.default = defaultValue;
		}
		super(id, name, defaultValue, schema);
		this._allowedValues = allowedValues;
	}

	puBlic validate(input: any): V {
		return EditorStringEnumOption.stringSet<V>(input, this.defaultValue, this._allowedValues);
	}
}

class EditorEnumOption<K1 extends EditorOption, T extends string, V> extends BaseEditorOption<K1, V> {

	private readonly _allowedValues: T[];
	private readonly _convert: (value: T) => V;

	constructor(id: K1, name: PossiBleKeyName<T>, defaultValue: V, defaultStringValue: string, allowedValues: T[], convert: (value: T) => V, schema: IConfigurationPropertySchema | undefined = undefined) {
		if (typeof schema !== 'undefined') {
			schema.type = 'string';
			schema.enum = allowedValues;
			schema.default = defaultStringValue;
		}
		super(id, name, defaultValue, schema);
		this._allowedValues = allowedValues;
		this._convert = convert;
	}

	puBlic validate(input: any): V {
		if (typeof input !== 'string') {
			return this.defaultValue;
		}
		if (this._allowedValues.indexOf(<T>input) === -1) {
			return this.defaultValue;
		}
		return this._convert(<any>input);
	}
}

//#endregion

//#region autoIndent

function _autoIndentFromString(autoIndent: 'none' | 'keep' | 'Brackets' | 'advanced' | 'full'): EditorAutoIndentStrategy {
	switch (autoIndent) {
		case 'none': return EditorAutoIndentStrategy.None;
		case 'keep': return EditorAutoIndentStrategy.Keep;
		case 'Brackets': return EditorAutoIndentStrategy.Brackets;
		case 'advanced': return EditorAutoIndentStrategy.Advanced;
		case 'full': return EditorAutoIndentStrategy.Full;
	}
}

//#endregion

//#region accessiBilitySupport

class EditorAccessiBilitySupport extends BaseEditorOption<EditorOption.accessiBilitySupport, AccessiBilitySupport> {

	constructor() {
		super(
			EditorOption.accessiBilitySupport, 'accessiBilitySupport', AccessiBilitySupport.Unknown,
			{
				type: 'string',
				enum: ['auto', 'on', 'off'],
				enumDescriptions: [
					nls.localize('accessiBilitySupport.auto', "The editor will use platform APIs to detect when a Screen Reader is attached."),
					nls.localize('accessiBilitySupport.on', "The editor will Be permanently optimized for usage with a Screen Reader. Word wrapping will Be disaBled."),
					nls.localize('accessiBilitySupport.off', "The editor will never Be optimized for usage with a Screen Reader."),
				],
				default: 'auto',
				description: nls.localize('accessiBilitySupport', "Controls whether the editor should run in a mode where it is optimized for screen readers. Setting to on will disaBle word wrapping.")
			}
		);
	}

	puBlic validate(input: any): AccessiBilitySupport {
		switch (input) {
			case 'auto': return AccessiBilitySupport.Unknown;
			case 'off': return AccessiBilitySupport.DisaBled;
			case 'on': return AccessiBilitySupport.EnaBled;
		}
		return this.defaultValue;
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: AccessiBilitySupport): AccessiBilitySupport {
		if (value === AccessiBilitySupport.Unknown) {
			// The editor reads the `accessiBilitySupport` from the environment
			return env.accessiBilitySupport;
		}
		return value;
	}
}

//#endregion

//#region comments

/**
 * Configuration options for editor comments
 */
export interface IEditorCommentsOptions {
	/**
	 * Insert a space after the line comment token and inside the Block comments tokens.
	 * Defaults to true.
	 */
	insertSpace?: Boolean;
	/**
	 * Ignore empty lines when inserting line comments.
	 * Defaults to true.
	 */
	ignoreEmptyLines?: Boolean;
}

export type EditorCommentsOptions = Readonly<Required<IEditorCommentsOptions>>;

class EditorComments extends BaseEditorOption<EditorOption.comments, EditorCommentsOptions> {

	constructor() {
		const defaults: EditorCommentsOptions = {
			insertSpace: true,
			ignoreEmptyLines: true,
		};
		super(
			EditorOption.comments, 'comments', defaults,
			{
				'editor.comments.insertSpace': {
					type: 'Boolean',
					default: defaults.insertSpace,
					description: nls.localize('comments.insertSpace', "Controls whether a space character is inserted when commenting.")
				},
				'editor.comments.ignoreEmptyLines': {
					type: 'Boolean',
					default: defaults.ignoreEmptyLines,
					description: nls.localize('comments.ignoreEmptyLines', 'Controls if empty lines should Be ignored with toggle, add or remove actions for line comments.')
				},
			}
		);
	}

	puBlic validate(_input: any): EditorCommentsOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorCommentsOptions;
		return {
			insertSpace: EditorBooleanOption.Boolean(input.insertSpace, this.defaultValue.insertSpace),
			ignoreEmptyLines: EditorBooleanOption.Boolean(input.ignoreEmptyLines, this.defaultValue.ignoreEmptyLines),
		};
	}
}

//#endregion

//#region cursorBlinking

/**
 * The kind of animation in which the editor's cursor should Be rendered.
 */
export const enum TextEditorCursorBlinkingStyle {
	/**
	 * Hidden
	 */
	Hidden = 0,
	/**
	 * Blinking
	 */
	Blink = 1,
	/**
	 * Blinking with smooth fading
	 */
	Smooth = 2,
	/**
	 * Blinking with prolonged filled state and smooth fading
	 */
	Phase = 3,
	/**
	 * Expand collapse animation on the y axis
	 */
	Expand = 4,
	/**
	 * No-Blinking
	 */
	Solid = 5
}

function _cursorBlinkingStyleFromString(cursorBlinkingStyle: 'Blink' | 'smooth' | 'phase' | 'expand' | 'solid'): TextEditorCursorBlinkingStyle {
	switch (cursorBlinkingStyle) {
		case 'Blink': return TextEditorCursorBlinkingStyle.Blink;
		case 'smooth': return TextEditorCursorBlinkingStyle.Smooth;
		case 'phase': return TextEditorCursorBlinkingStyle.Phase;
		case 'expand': return TextEditorCursorBlinkingStyle.Expand;
		case 'solid': return TextEditorCursorBlinkingStyle.Solid;
	}
}

//#endregion

//#region cursorStyle

/**
 * The style in which the editor's cursor should Be rendered.
 */
export enum TextEditorCursorStyle {
	/**
	 * As a vertical line (sitting Between two characters).
	 */
	Line = 1,
	/**
	 * As a Block (sitting on top of a character).
	 */
	Block = 2,
	/**
	 * As a horizontal line (sitting under a character).
	 */
	Underline = 3,
	/**
	 * As a thin vertical line (sitting Between two characters).
	 */
	LineThin = 4,
	/**
	 * As an outlined Block (sitting on top of a character).
	 */
	BlockOutline = 5,
	/**
	 * As a thin horizontal line (sitting under a character).
	 */
	UnderlineThin = 6
}

/**
 * @internal
 */
export function cursorStyleToString(cursorStyle: TextEditorCursorStyle): 'line' | 'Block' | 'underline' | 'line-thin' | 'Block-outline' | 'underline-thin' {
	switch (cursorStyle) {
		case TextEditorCursorStyle.Line: return 'line';
		case TextEditorCursorStyle.Block: return 'Block';
		case TextEditorCursorStyle.Underline: return 'underline';
		case TextEditorCursorStyle.LineThin: return 'line-thin';
		case TextEditorCursorStyle.BlockOutline: return 'Block-outline';
		case TextEditorCursorStyle.UnderlineThin: return 'underline-thin';
	}
}

function _cursorStyleFromString(cursorStyle: 'line' | 'Block' | 'underline' | 'line-thin' | 'Block-outline' | 'underline-thin'): TextEditorCursorStyle {
	switch (cursorStyle) {
		case 'line': return TextEditorCursorStyle.Line;
		case 'Block': return TextEditorCursorStyle.Block;
		case 'underline': return TextEditorCursorStyle.Underline;
		case 'line-thin': return TextEditorCursorStyle.LineThin;
		case 'Block-outline': return TextEditorCursorStyle.BlockOutline;
		case 'underline-thin': return TextEditorCursorStyle.UnderlineThin;
	}
}

//#endregion

//#region editorClassName

class EditorClassName extends ComputedEditorOption<EditorOption.editorClassName, string> {

	constructor() {
		super(EditorOption.editorClassName, [EditorOption.mouseStyle, EditorOption.extraEditorClassName]);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: string): string {
		const classNames = ['monaco-editor'];
		if (options.get(EditorOption.extraEditorClassName)) {
			classNames.push(options.get(EditorOption.extraEditorClassName));
		}
		if (env.extraEditorClassName) {
			classNames.push(env.extraEditorClassName);
		}
		if (options.get(EditorOption.mouseStyle) === 'default') {
			classNames.push('mouse-default');
		} else if (options.get(EditorOption.mouseStyle) === 'copy') {
			classNames.push('mouse-copy');
		}

		if (options.get(EditorOption.showUnused)) {
			classNames.push('showUnused');
		}

		if (options.get(EditorOption.showDeprecated)) {
			classNames.push('showDeprecated');
		}

		return classNames.join(' ');
	}
}

//#endregion

//#region emptySelectionClipBoard

class EditorEmptySelectionClipBoard extends EditorBooleanOption<EditorOption.emptySelectionClipBoard> {

	constructor() {
		super(
			EditorOption.emptySelectionClipBoard, 'emptySelectionClipBoard', true,
			{ description: nls.localize('emptySelectionClipBoard', "Controls whether copying without a selection copies the current line.") }
		);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: Boolean): Boolean {
		return value && env.emptySelectionClipBoard;
	}
}

//#endregion

//#region find

/**
 * Configuration options for editor find widget
 */
export interface IEditorFindOptions {
	/**
	* Controls whether the cursor should move to find matches while typing.
	*/
	cursorMoveOnType?: Boolean;
	/**
	 * Controls if we seed search string in the Find Widget with editor selection.
	 */
	seedSearchStringFromSelection?: Boolean;
	/**
	 * Controls if Find in Selection flag is turned on in the editor.
	 */
	autoFindInSelection?: 'never' | 'always' | 'multiline';
	/*
	 * Controls whether the Find Widget should add extra lines on top of the editor.
	 */
	addExtraSpaceOnTop?: Boolean;
	/**
	 * @internal
	 * Controls if the Find Widget should read or modify the shared find clipBoard on macOS
	 */
	gloBalFindClipBoard?: Boolean;
	/**
	 * Controls whether the search automatically restarts from the Beginning (or the end) when no further matches can Be found
	 */
	loop?: Boolean;
}

export type EditorFindOptions = Readonly<Required<IEditorFindOptions>>;

class EditorFind extends BaseEditorOption<EditorOption.find, EditorFindOptions> {

	constructor() {
		const defaults: EditorFindOptions = {
			cursorMoveOnType: true,
			seedSearchStringFromSelection: true,
			autoFindInSelection: 'never',
			gloBalFindClipBoard: false,
			addExtraSpaceOnTop: true,
			loop: true
		};
		super(
			EditorOption.find, 'find', defaults,
			{
				'editor.find.cursorMoveOnType': {
					type: 'Boolean',
					default: defaults.cursorMoveOnType,
					description: nls.localize('find.cursorMoveOnType', "Controls whether the cursor should jump to find matches while typing.")
				},
				'editor.find.seedSearchStringFromSelection': {
					type: 'Boolean',
					default: defaults.seedSearchStringFromSelection,
					description: nls.localize('find.seedSearchStringFromSelection', "Controls whether the search string in the Find Widget is seeded from the editor selection.")
				},
				'editor.find.autoFindInSelection': {
					type: 'string',
					enum: ['never', 'always', 'multiline'],
					default: defaults.autoFindInSelection,
					enumDescriptions: [
						nls.localize('editor.find.autoFindInSelection.never', 'Never turn on Find in selection automatically (default)'),
						nls.localize('editor.find.autoFindInSelection.always', 'Always turn on Find in selection automatically'),
						nls.localize('editor.find.autoFindInSelection.multiline', 'Turn on Find in selection automatically when multiple lines of content are selected.')
					],
					description: nls.localize('find.autoFindInSelection', "Controls the condition for turning on find in selection automatically.")
				},
				'editor.find.gloBalFindClipBoard': {
					type: 'Boolean',
					default: defaults.gloBalFindClipBoard,
					description: nls.localize('find.gloBalFindClipBoard', "Controls whether the Find Widget should read or modify the shared find clipBoard on macOS."),
					included: platform.isMacintosh
				},
				'editor.find.addExtraSpaceOnTop': {
					type: 'Boolean',
					default: defaults.addExtraSpaceOnTop,
					description: nls.localize('find.addExtraSpaceOnTop', "Controls whether the Find Widget should add extra lines on top of the editor. When true, you can scroll Beyond the first line when the Find Widget is visiBle.")
				},
				'editor.find.loop': {
					type: 'Boolean',
					default: defaults.loop,
					description: nls.localize('find.loop', "Controls whether the search automatically restarts from the Beginning (or the end) when no further matches can Be found.")
				},

			}
		);
	}

	puBlic validate(_input: any): EditorFindOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorFindOptions;
		return {
			cursorMoveOnType: EditorBooleanOption.Boolean(input.cursorMoveOnType, this.defaultValue.cursorMoveOnType),
			seedSearchStringFromSelection: EditorBooleanOption.Boolean(input.seedSearchStringFromSelection, this.defaultValue.seedSearchStringFromSelection),
			autoFindInSelection: typeof _input.autoFindInSelection === 'Boolean'
				? (_input.autoFindInSelection ? 'always' : 'never')
				: EditorStringEnumOption.stringSet<'never' | 'always' | 'multiline'>(input.autoFindInSelection, this.defaultValue.autoFindInSelection, ['never', 'always', 'multiline']),
			gloBalFindClipBoard: EditorBooleanOption.Boolean(input.gloBalFindClipBoard, this.defaultValue.gloBalFindClipBoard),
			addExtraSpaceOnTop: EditorBooleanOption.Boolean(input.addExtraSpaceOnTop, this.defaultValue.addExtraSpaceOnTop),
			loop: EditorBooleanOption.Boolean(input.loop, this.defaultValue.loop),
		};
	}
}

//#endregion

//#region fontLigatures

/**
 * @internal
 */
export class EditorFontLigatures extends BaseEditorOption<EditorOption.fontLigatures, string> {

	puBlic static OFF = '"liga" off, "calt" off';
	puBlic static ON = '"liga" on, "calt" on';

	constructor() {
		super(
			EditorOption.fontLigatures, 'fontLigatures', EditorFontLigatures.OFF,
			{
				anyOf: [
					{
						type: 'Boolean',
						description: nls.localize('fontLigatures', "EnaBles/DisaBles font ligatures."),
					},
					{
						type: 'string',
						description: nls.localize('fontFeatureSettings', "Explicit font-feature-settings.")
					}
				],
				description: nls.localize('fontLigaturesGeneral', "Configures font ligatures or font features."),
				default: false
			}
		);
	}

	puBlic validate(input: any): string {
		if (typeof input === 'undefined') {
			return this.defaultValue;
		}
		if (typeof input === 'string') {
			if (input === 'false') {
				return EditorFontLigatures.OFF;
			}
			if (input === 'true') {
				return EditorFontLigatures.ON;
			}
			return input;
		}
		if (Boolean(input)) {
			return EditorFontLigatures.ON;
		}
		return EditorFontLigatures.OFF;
	}
}

//#endregion

//#region fontInfo

class EditorFontInfo extends ComputedEditorOption<EditorOption.fontInfo, FontInfo> {

	constructor() {
		super(EditorOption.fontInfo);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: FontInfo): FontInfo {
		return env.fontInfo;
	}
}

//#endregion

//#region fontSize

class EditorFontSize extends SimpleEditorOption<EditorOption.fontSize, numBer> {

	constructor() {
		super(
			EditorOption.fontSize, 'fontSize', EDITOR_FONT_DEFAULTS.fontSize,
			{
				type: 'numBer',
				minimum: 6,
				maximum: 100,
				default: EDITOR_FONT_DEFAULTS.fontSize,
				description: nls.localize('fontSize', "Controls the font size in pixels.")
			}
		);
	}

	puBlic validate(input: any): numBer {
		let r = EditorFloatOption.float(input, this.defaultValue);
		if (r === 0) {
			return EDITOR_FONT_DEFAULTS.fontSize;
		}
		return EditorFloatOption.clamp(r, 6, 100);
	}
	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: numBer): numBer {
		// The final fontSize respects the editor zoom level.
		// So take the result from env.fontInfo
		return env.fontInfo.fontSize;
	}
}

//#endregion

//#region fontWeight

class EditorFontWeight extends BaseEditorOption<EditorOption.fontWeight, string> {
	private static SUGGESTION_VALUES = ['normal', 'Bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
	private static MINIMUM_VALUE = 1;
	private static MAXIMUM_VALUE = 1000;

	constructor() {
		super(
			EditorOption.fontWeight, 'fontWeight', EDITOR_FONT_DEFAULTS.fontWeight,
			{
				anyOf: [
					{
						type: 'numBer',
						minimum: EditorFontWeight.MINIMUM_VALUE,
						maximum: EditorFontWeight.MAXIMUM_VALUE,
						errorMessage: nls.localize('fontWeightErrorMessage', "Only \"normal\" and \"Bold\" keywords or numBers Between 1 and 1000 are allowed.")
					},
					{
						type: 'string',
						pattern: '^(normal|Bold|1000|[1-9][0-9]{0,2})$'
					},
					{
						enum: EditorFontWeight.SUGGESTION_VALUES
					}
				],
				default: EDITOR_FONT_DEFAULTS.fontWeight,
				description: nls.localize('fontWeight', "Controls the font weight. Accepts \"normal\" and \"Bold\" keywords or numBers Between 1 and 1000.")
			}
		);
	}

	puBlic validate(input: any): string {
		if (input === 'normal' || input === 'Bold') {
			return input;
		}
		return String(EditorIntOption.clampedInt(input, EDITOR_FONT_DEFAULTS.fontWeight, EditorFontWeight.MINIMUM_VALUE, EditorFontWeight.MAXIMUM_VALUE));
	}
}

//#endregion

//#region gotoLocation

export type GoToLocationValues = 'peek' | 'gotoAndPeek' | 'goto';

/**
 * Configuration options for go to location
 */
export interface IGotoLocationOptions {

	multiple?: GoToLocationValues;

	multipleDefinitions?: GoToLocationValues;
	multipleTypeDefinitions?: GoToLocationValues;
	multipleDeclarations?: GoToLocationValues;
	multipleImplementations?: GoToLocationValues;
	multipleReferences?: GoToLocationValues;

	alternativeDefinitionCommand?: string;
	alternativeTypeDefinitionCommand?: string;
	alternativeDeclarationCommand?: string;
	alternativeImplementationCommand?: string;
	alternativeReferenceCommand?: string;
}

export type GoToLocationOptions = Readonly<Required<IGotoLocationOptions>>;

class EditorGoToLocation extends BaseEditorOption<EditorOption.gotoLocation, GoToLocationOptions> {

	constructor() {
		const defaults: GoToLocationOptions = {
			multiple: 'peek',
			multipleDefinitions: 'peek',
			multipleTypeDefinitions: 'peek',
			multipleDeclarations: 'peek',
			multipleImplementations: 'peek',
			multipleReferences: 'peek',
			alternativeDefinitionCommand: 'editor.action.goToReferences',
			alternativeTypeDefinitionCommand: 'editor.action.goToReferences',
			alternativeDeclarationCommand: 'editor.action.goToReferences',
			alternativeImplementationCommand: '',
			alternativeReferenceCommand: '',
		};
		const jsonSuBset: IJSONSchema = {
			type: 'string',
			enum: ['peek', 'gotoAndPeek', 'goto'],
			default: defaults.multiple,
			enumDescriptions: [
				nls.localize('editor.gotoLocation.multiple.peek', 'Show peek view of the results (default)'),
				nls.localize('editor.gotoLocation.multiple.gotoAndPeek', 'Go to the primary result and show a peek view'),
				nls.localize('editor.gotoLocation.multiple.goto', 'Go to the primary result and enaBle peek-less navigation to others')
			]
		};
		super(
			EditorOption.gotoLocation, 'gotoLocation', defaults,
			{
				'editor.gotoLocation.multiple': {
					deprecationMessage: nls.localize('editor.gotoLocation.multiple.deprecated', "This setting is deprecated, please use separate settings like 'editor.editor.gotoLocation.multipleDefinitions' or 'editor.editor.gotoLocation.multipleImplementations' instead."),
				},
				'editor.gotoLocation.multipleDefinitions': {
					description: nls.localize('editor.editor.gotoLocation.multipleDefinitions', "Controls the Behavior the 'Go to Definition'-command when multiple target locations exist."),
					...jsonSuBset,
				},
				'editor.gotoLocation.multipleTypeDefinitions': {
					description: nls.localize('editor.editor.gotoLocation.multipleTypeDefinitions', "Controls the Behavior the 'Go to Type Definition'-command when multiple target locations exist."),
					...jsonSuBset,
				},
				'editor.gotoLocation.multipleDeclarations': {
					description: nls.localize('editor.editor.gotoLocation.multipleDeclarations', "Controls the Behavior the 'Go to Declaration'-command when multiple target locations exist."),
					...jsonSuBset,
				},
				'editor.gotoLocation.multipleImplementations': {
					description: nls.localize('editor.editor.gotoLocation.multipleImplemenattions', "Controls the Behavior the 'Go to Implementations'-command when multiple target locations exist."),
					...jsonSuBset,
				},
				'editor.gotoLocation.multipleReferences': {
					description: nls.localize('editor.editor.gotoLocation.multipleReferences', "Controls the Behavior the 'Go to References'-command when multiple target locations exist."),
					...jsonSuBset,
				},
				'editor.gotoLocation.alternativeDefinitionCommand': {
					type: 'string',
					default: defaults.alternativeDefinitionCommand,
					description: nls.localize('alternativeDefinitionCommand', "Alternative command id that is Being executed when the result of 'Go to Definition' is the current location.")
				},
				'editor.gotoLocation.alternativeTypeDefinitionCommand': {
					type: 'string',
					default: defaults.alternativeTypeDefinitionCommand,
					description: nls.localize('alternativeTypeDefinitionCommand', "Alternative command id that is Being executed when the result of 'Go to Type Definition' is the current location.")
				},
				'editor.gotoLocation.alternativeDeclarationCommand': {
					type: 'string',
					default: defaults.alternativeDeclarationCommand,
					description: nls.localize('alternativeDeclarationCommand', "Alternative command id that is Being executed when the result of 'Go to Declaration' is the current location.")
				},
				'editor.gotoLocation.alternativeImplementationCommand': {
					type: 'string',
					default: defaults.alternativeImplementationCommand,
					description: nls.localize('alternativeImplementationCommand', "Alternative command id that is Being executed when the result of 'Go to Implementation' is the current location.")
				},
				'editor.gotoLocation.alternativeReferenceCommand': {
					type: 'string',
					default: defaults.alternativeReferenceCommand,
					description: nls.localize('alternativeReferenceCommand', "Alternative command id that is Being executed when the result of 'Go to Reference' is the current location.")
				},
			}
		);
	}

	puBlic validate(_input: any): GoToLocationOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IGotoLocationOptions;
		return {
			multiple: EditorStringEnumOption.stringSet<GoToLocationValues>(input.multiple, this.defaultValue.multiple!, ['peek', 'gotoAndPeek', 'goto']),
			multipleDefinitions: input.multipleDefinitions ?? EditorStringEnumOption.stringSet<GoToLocationValues>(input.multipleDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
			multipleTypeDefinitions: input.multipleTypeDefinitions ?? EditorStringEnumOption.stringSet<GoToLocationValues>(input.multipleTypeDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
			multipleDeclarations: input.multipleDeclarations ?? EditorStringEnumOption.stringSet<GoToLocationValues>(input.multipleDeclarations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
			multipleImplementations: input.multipleImplementations ?? EditorStringEnumOption.stringSet<GoToLocationValues>(input.multipleImplementations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
			multipleReferences: input.multipleReferences ?? EditorStringEnumOption.stringSet<GoToLocationValues>(input.multipleReferences, 'peek', ['peek', 'gotoAndPeek', 'goto']),
			alternativeDefinitionCommand: EditorStringOption.string(input.alternativeDefinitionCommand, this.defaultValue.alternativeDefinitionCommand),
			alternativeTypeDefinitionCommand: EditorStringOption.string(input.alternativeTypeDefinitionCommand, this.defaultValue.alternativeTypeDefinitionCommand),
			alternativeDeclarationCommand: EditorStringOption.string(input.alternativeDeclarationCommand, this.defaultValue.alternativeDeclarationCommand),
			alternativeImplementationCommand: EditorStringOption.string(input.alternativeImplementationCommand, this.defaultValue.alternativeImplementationCommand),
			alternativeReferenceCommand: EditorStringOption.string(input.alternativeReferenceCommand, this.defaultValue.alternativeReferenceCommand),
		};
	}
}

//#endregion

//#region hover

/**
 * Configuration options for editor hover
 */
export interface IEditorHoverOptions {
	/**
	 * EnaBle the hover.
	 * Defaults to true.
	 */
	enaBled?: Boolean;
	/**
	 * Delay for showing the hover.
	 * Defaults to 300.
	 */
	delay?: numBer;
	/**
	 * Is the hover sticky such that it can Be clicked and its contents selected?
	 * Defaults to true.
	 */
	sticky?: Boolean;
}

export type EditorHoverOptions = Readonly<Required<IEditorHoverOptions>>;

class EditorHover extends BaseEditorOption<EditorOption.hover, EditorHoverOptions> {

	constructor() {
		const defaults: EditorHoverOptions = {
			enaBled: true,
			delay: 300,
			sticky: true
		};
		super(
			EditorOption.hover, 'hover', defaults,
			{
				'editor.hover.enaBled': {
					type: 'Boolean',
					default: defaults.enaBled,
					description: nls.localize('hover.enaBled', "Controls whether the hover is shown.")
				},
				'editor.hover.delay': {
					type: 'numBer',
					default: defaults.delay,
					description: nls.localize('hover.delay', "Controls the delay in milliseconds after which the hover is shown.")
				},
				'editor.hover.sticky': {
					type: 'Boolean',
					default: defaults.sticky,
					description: nls.localize('hover.sticky', "Controls whether the hover should remain visiBle when mouse is moved over it.")
				},
			}
		);
	}

	puBlic validate(_input: any): EditorHoverOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorHoverOptions;
		return {
			enaBled: EditorBooleanOption.Boolean(input.enaBled, this.defaultValue.enaBled),
			delay: EditorIntOption.clampedInt(input.delay, this.defaultValue.delay, 0, 10000),
			sticky: EditorBooleanOption.Boolean(input.sticky, this.defaultValue.sticky)
		};
	}
}

//#endregion

//#region layoutInfo

/**
 * A description for the overview ruler position.
 */
export interface OverviewRulerPosition {
	/**
	 * Width of the overview ruler
	 */
	readonly width: numBer;
	/**
	 * Height of the overview ruler
	 */
	readonly height: numBer;
	/**
	 * Top position for the overview ruler
	 */
	readonly top: numBer;
	/**
	 * Right position for the overview ruler
	 */
	readonly right: numBer;
}

export const enum RenderMinimap {
	None = 0,
	Text = 1,
	Blocks = 2,
}

/**
 * The internal layout details of the editor.
 */
export interface EditorLayoutInfo {

	/**
	 * Full editor width.
	 */
	readonly width: numBer;
	/**
	 * Full editor height.
	 */
	readonly height: numBer;

	/**
	 * Left position for the glyph margin.
	 */
	readonly glyphMarginLeft: numBer;
	/**
	 * The width of the glyph margin.
	 */
	readonly glyphMarginWidth: numBer;

	/**
	 * Left position for the line numBers.
	 */
	readonly lineNumBersLeft: numBer;
	/**
	 * The width of the line numBers.
	 */
	readonly lineNumBersWidth: numBer;

	/**
	 * Left position for the line decorations.
	 */
	readonly decorationsLeft: numBer;
	/**
	 * The width of the line decorations.
	 */
	readonly decorationsWidth: numBer;

	/**
	 * Left position for the content (actual text)
	 */
	readonly contentLeft: numBer;
	/**
	 * The width of the content (actual text)
	 */
	readonly contentWidth: numBer;

	/**
	 * Layout information for the minimap
	 */
	readonly minimap: EditorMinimapLayoutInfo;

	/**
	 * The numBer of columns (of typical characters) fitting on a viewport line.
	 */
	readonly viewportColumn: numBer;

	readonly isWordWrapMinified: Boolean;
	readonly isViewportWrapping: Boolean;
	readonly wrappingColumn: numBer;

	/**
	 * The width of the vertical scrollBar.
	 */
	readonly verticalScrollBarWidth: numBer;
	/**
	 * The height of the horizontal scrollBar.
	 */
	readonly horizontalScrollBarHeight: numBer;

	/**
	 * The position of the overview ruler.
	 */
	readonly overviewRuler: OverviewRulerPosition;
}

/**
 * The internal layout details of the editor.
 */
export interface EditorMinimapLayoutInfo {
	readonly renderMinimap: RenderMinimap;
	readonly minimapLeft: numBer;
	readonly minimapWidth: numBer;
	readonly minimapHeightIsEditorHeight: Boolean;
	readonly minimapIsSampling: Boolean;
	readonly minimapScale: numBer;
	readonly minimapLineHeight: numBer;
	readonly minimapCanvasInnerWidth: numBer;
	readonly minimapCanvasInnerHeight: numBer;
	readonly minimapCanvasOuterWidth: numBer;
	readonly minimapCanvasOuterHeight: numBer;
}

/**
 * @internal
 */
export interface EditorLayoutInfoComputerEnv {
	readonly memory: ComputeOptionsMemory | null;
	readonly outerWidth: numBer;
	readonly outerHeight: numBer;
	readonly isDominatedByLongLines: Boolean;
	readonly lineHeight: numBer;
	readonly viewLineCount: numBer;
	readonly lineNumBersDigitCount: numBer;
	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly maxDigitWidth: numBer;
	readonly pixelRatio: numBer;
}

/**
 * @internal
 */
export interface IEditorLayoutComputerInput {
	readonly outerWidth: numBer;
	readonly outerHeight: numBer;
	readonly isDominatedByLongLines: Boolean;
	readonly lineHeight: numBer;
	readonly lineNumBersDigitCount: numBer;
	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly maxDigitWidth: numBer;
	readonly pixelRatio: numBer;
	readonly glyphMargin: Boolean;
	readonly lineDecorationsWidth: string | numBer;
	readonly folding: Boolean;
	readonly minimap: Readonly<Required<IEditorMinimapOptions>>;
	readonly scrollBar: InternalEditorScrollBarOptions;
	readonly lineNumBers: InternalEditorRenderLineNumBersOptions;
	readonly lineNumBersMinChars: numBer;
	readonly scrollBeyondLastLine: Boolean;
	readonly wordWrap: 'wordWrapColumn' | 'on' | 'off' | 'Bounded';
	readonly wordWrapColumn: numBer;
	readonly wordWrapMinified: Boolean;
	readonly accessiBilitySupport: AccessiBilitySupport;
}

/**
 * @internal
 */
export interface IMinimapLayoutInput {
	readonly outerWidth: numBer;
	readonly outerHeight: numBer;
	readonly lineHeight: numBer;
	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly pixelRatio: numBer;
	readonly scrollBeyondLastLine: Boolean;
	readonly minimap: Readonly<Required<IEditorMinimapOptions>>;
	readonly verticalScrollBarWidth: numBer;
	readonly viewLineCount: numBer;
	readonly remainingWidth: numBer;
	readonly isViewportWrapping: Boolean;
}

/**
 * @internal
 */
export class EditorLayoutInfoComputer extends ComputedEditorOption<EditorOption.layoutInfo, EditorLayoutInfo> {

	constructor() {
		super(
			EditorOption.layoutInfo,
			[
				EditorOption.glyphMargin, EditorOption.lineDecorationsWidth, EditorOption.folding,
				EditorOption.minimap, EditorOption.scrollBar, EditorOption.lineNumBers,
				EditorOption.lineNumBersMinChars, EditorOption.scrollBeyondLastLine,
				EditorOption.wordWrap, EditorOption.wordWrapColumn, EditorOption.wordWrapMinified,
				EditorOption.accessiBilitySupport
			]
		);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: EditorLayoutInfo): EditorLayoutInfo {
		return EditorLayoutInfoComputer.computeLayout(options, {
			memory: env.memory,
			outerWidth: env.outerWidth,
			outerHeight: env.outerHeight,
			isDominatedByLongLines: env.isDominatedByLongLines,
			lineHeight: env.fontInfo.lineHeight,
			viewLineCount: env.viewLineCount,
			lineNumBersDigitCount: env.lineNumBersDigitCount,
			typicalHalfwidthCharacterWidth: env.fontInfo.typicalHalfwidthCharacterWidth,
			maxDigitWidth: env.fontInfo.maxDigitWidth,
			pixelRatio: env.pixelRatio
		});
	}

	puBlic static computeContainedMinimapLineCount(input: {
		viewLineCount: numBer;
		scrollBeyondLastLine: Boolean;
		height: numBer;
		lineHeight: numBer;
		pixelRatio: numBer;
	}): { typicalViewportLineCount: numBer; extraLinesBeyondLastLine: numBer; desiredRatio: numBer; minimapLineCount: numBer; } {
		const typicalViewportLineCount = input.height / input.lineHeight;
		const extraLinesBeyondLastLine = input.scrollBeyondLastLine ? (typicalViewportLineCount - 1) : 0;
		const desiredRatio = (input.viewLineCount + extraLinesBeyondLastLine) / (input.pixelRatio * input.height);
		const minimapLineCount = Math.floor(input.viewLineCount / desiredRatio);
		return { typicalViewportLineCount, extraLinesBeyondLastLine, desiredRatio, minimapLineCount };
	}

	private static _computeMinimapLayout(input: IMinimapLayoutInput, memory: ComputeOptionsMemory): EditorMinimapLayoutInfo {
		const outerWidth = input.outerWidth;
		const outerHeight = input.outerHeight;
		const pixelRatio = input.pixelRatio;

		if (!input.minimap.enaBled) {
			return {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: Math.floor(pixelRatio * outerHeight),
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: outerHeight,
			};
		}

		// Can use memory if only the `viewLineCount` and `remainingWidth` have changed
		const staBleMinimapLayoutInput = memory.staBleMinimapLayoutInput;
		const couldUseMemory = (
			staBleMinimapLayoutInput
			// && input.outerWidth === lastMinimapLayoutInput.outerWidth !!! INTENTIONAL OMITTED
			&& input.outerHeight === staBleMinimapLayoutInput.outerHeight
			&& input.lineHeight === staBleMinimapLayoutInput.lineHeight
			&& input.typicalHalfwidthCharacterWidth === staBleMinimapLayoutInput.typicalHalfwidthCharacterWidth
			&& input.pixelRatio === staBleMinimapLayoutInput.pixelRatio
			&& input.scrollBeyondLastLine === staBleMinimapLayoutInput.scrollBeyondLastLine
			&& input.minimap.enaBled === staBleMinimapLayoutInput.minimap.enaBled
			&& input.minimap.side === staBleMinimapLayoutInput.minimap.side
			&& input.minimap.size === staBleMinimapLayoutInput.minimap.size
			&& input.minimap.showSlider === staBleMinimapLayoutInput.minimap.showSlider
			&& input.minimap.renderCharacters === staBleMinimapLayoutInput.minimap.renderCharacters
			&& input.minimap.maxColumn === staBleMinimapLayoutInput.minimap.maxColumn
			&& input.minimap.scale === staBleMinimapLayoutInput.minimap.scale
			&& input.verticalScrollBarWidth === staBleMinimapLayoutInput.verticalScrollBarWidth
			// && input.viewLineCount === lastMinimapLayoutInput.viewLineCount !!! INTENTIONAL OMITTED
			// && input.remainingWidth === lastMinimapLayoutInput.remainingWidth !!! INTENTIONAL OMITTED
			&& input.isViewportWrapping === staBleMinimapLayoutInput.isViewportWrapping
		);

		const lineHeight = input.lineHeight;
		const typicalHalfwidthCharacterWidth = input.typicalHalfwidthCharacterWidth;
		const scrollBeyondLastLine = input.scrollBeyondLastLine;
		const minimapRenderCharacters = input.minimap.renderCharacters;
		let minimapScale = (pixelRatio >= 2 ? Math.round(input.minimap.scale * 2) : input.minimap.scale);
		const minimapMaxColumn = input.minimap.maxColumn;
		const minimapSize = input.minimap.size;
		const minimapSide = input.minimap.side;
		const verticalScrollBarWidth = input.verticalScrollBarWidth;
		const viewLineCount = input.viewLineCount;
		const remainingWidth = input.remainingWidth;
		const isViewportWrapping = input.isViewportWrapping;

		const BaseCharHeight = minimapRenderCharacters ? 2 : 3;
		let minimapCanvasInnerHeight = Math.floor(pixelRatio * outerHeight);
		const minimapCanvasOuterHeight = minimapCanvasInnerHeight / pixelRatio;
		let minimapHeightIsEditorHeight = false;
		let minimapIsSampling = false;
		let minimapLineHeight = BaseCharHeight * minimapScale;
		let minimapCharWidth = minimapScale / pixelRatio;
		let minimapWidthMultiplier: numBer = 1;

		if (minimapSize === 'fill' || minimapSize === 'fit') {
			const { typicalViewportLineCount, extraLinesBeyondLastLine, desiredRatio, minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
				viewLineCount: viewLineCount,
				scrollBeyondLastLine: scrollBeyondLastLine,
				height: outerHeight,
				lineHeight: lineHeight,
				pixelRatio: pixelRatio
			});
			// ratio is intentionally not part of the layout to avoid the layout changing all the time
			// when doing sampling
			const ratio = viewLineCount / minimapLineCount;

			if (ratio > 1) {
				minimapHeightIsEditorHeight = true;
				minimapIsSampling = true;
				minimapScale = 1;
				minimapLineHeight = 1;
				minimapCharWidth = minimapScale / pixelRatio;
			} else {
				let fitBecomesFill = false;
				let maxMinimapScale = minimapScale + 1;

				if (minimapSize === 'fit') {
					const effectiveMinimapHeight = Math.ceil((viewLineCount + extraLinesBeyondLastLine) * minimapLineHeight);
					if (isViewportWrapping && couldUseMemory && remainingWidth <= memory.staBleFitRemainingWidth) {
						// There is a loop when using `fit` and viewport wrapping:
						// - view line count impacts minimap layout
						// - minimap layout impacts viewport width
						// - viewport width impacts view line count
						// To Break the loop, once we go to a smaller minimap scale, we try to stick with it.
						fitBecomesFill = true;
						maxMinimapScale = memory.staBleFitMaxMinimapScale;
					} else {
						fitBecomesFill = (effectiveMinimapHeight > minimapCanvasInnerHeight);
						if (isViewportWrapping && fitBecomesFill) {
							// rememBer for next time
							memory.staBleMinimapLayoutInput = input;
							memory.staBleFitRemainingWidth = remainingWidth;
						} else {
							memory.staBleMinimapLayoutInput = null;
							memory.staBleFitRemainingWidth = 0;
						}
					}
				}

				if (minimapSize === 'fill' || fitBecomesFill) {
					minimapHeightIsEditorHeight = true;
					const configuredMinimapScale = minimapScale;
					minimapLineHeight = Math.min(lineHeight * pixelRatio, Math.max(1, Math.floor(1 / desiredRatio)));
					minimapScale = Math.min(maxMinimapScale, Math.max(1, Math.floor(minimapLineHeight / BaseCharHeight)));
					if (minimapScale > configuredMinimapScale) {
						minimapWidthMultiplier = Math.min(2, minimapScale / configuredMinimapScale);
					}
					minimapCharWidth = minimapScale / pixelRatio / minimapWidthMultiplier;
					minimapCanvasInnerHeight = Math.ceil((Math.max(typicalViewportLineCount, viewLineCount + extraLinesBeyondLastLine)) * minimapLineHeight);
					if (isViewportWrapping && fitBecomesFill) {
						memory.staBleFitMaxMinimapScale = minimapScale;
					}
				}
			}
		}

		// Given:
		// (leaving 2px for the cursor to have space after the last character)
		// viewportColumn = (contentWidth - verticalScrollBarWidth - 2) / typicalHalfwidthCharacterWidth
		// minimapWidth = viewportColumn * minimapCharWidth
		// contentWidth = remainingWidth - minimapWidth
		// What are good values for contentWidth and minimapWidth ?

		// minimapWidth = ((contentWidth - verticalScrollBarWidth - 2) / typicalHalfwidthCharacterWidth) * minimapCharWidth
		// typicalHalfwidthCharacterWidth * minimapWidth = (contentWidth - verticalScrollBarWidth - 2) * minimapCharWidth
		// typicalHalfwidthCharacterWidth * minimapWidth = (remainingWidth - minimapWidth - verticalScrollBarWidth - 2) * minimapCharWidth
		// (typicalHalfwidthCharacterWidth + minimapCharWidth) * minimapWidth = (remainingWidth - verticalScrollBarWidth - 2) * minimapCharWidth
		// minimapWidth = ((remainingWidth - verticalScrollBarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth)

		const minimapMaxWidth = Math.floor(minimapMaxColumn * minimapCharWidth);
		const minimapWidth = Math.min(minimapMaxWidth, Math.max(0, Math.floor(((remainingWidth - verticalScrollBarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth))) + MINIMAP_GUTTER_WIDTH);

		let minimapCanvasInnerWidth = Math.floor(pixelRatio * minimapWidth);
		const minimapCanvasOuterWidth = minimapCanvasInnerWidth / pixelRatio;
		minimapCanvasInnerWidth = Math.floor(minimapCanvasInnerWidth * minimapWidthMultiplier);

		const renderMinimap = (minimapRenderCharacters ? RenderMinimap.Text : RenderMinimap.Blocks);
		const minimapLeft = (minimapSide === 'left' ? 0 : (outerWidth - minimapWidth - verticalScrollBarWidth));

		return {
			renderMinimap,
			minimapLeft,
			minimapWidth,
			minimapHeightIsEditorHeight,
			minimapIsSampling,
			minimapScale,
			minimapLineHeight,
			minimapCanvasInnerWidth,
			minimapCanvasInnerHeight,
			minimapCanvasOuterWidth,
			minimapCanvasOuterHeight,
		};
	}

	puBlic static computeLayout(options: IComputedEditorOptions, env: EditorLayoutInfoComputerEnv): EditorLayoutInfo {
		const outerWidth = env.outerWidth | 0;
		const outerHeight = env.outerHeight | 0;
		const lineHeight = env.lineHeight | 0;
		const lineNumBersDigitCount = env.lineNumBersDigitCount | 0;
		const typicalHalfwidthCharacterWidth = env.typicalHalfwidthCharacterWidth;
		const maxDigitWidth = env.maxDigitWidth;
		const pixelRatio = env.pixelRatio;
		const viewLineCount = env.viewLineCount;

		const wordWrap = options.get(EditorOption.wordWrap);
		const wordWrapColumn = options.get(EditorOption.wordWrapColumn);
		const wordWrapMinified = options.get(EditorOption.wordWrapMinified);
		const accessiBilitySupport = options.get(EditorOption.accessiBilitySupport);
		const isDominatedByLongLines = env.isDominatedByLongLines;

		const showGlyphMargin = options.get(EditorOption.glyphMargin);
		const showLineNumBers = (options.get(EditorOption.lineNumBers).renderType !== RenderLineNumBersType.Off);
		const lineNumBersMinChars = options.get(EditorOption.lineNumBersMinChars);
		const scrollBeyondLastLine = options.get(EditorOption.scrollBeyondLastLine);
		const minimap = options.get(EditorOption.minimap);

		const scrollBar = options.get(EditorOption.scrollBar);
		const verticalScrollBarWidth = scrollBar.verticalScrollBarSize;
		const verticalScrollBarHasArrows = scrollBar.verticalHasArrows;
		const scrollBarArrowSize = scrollBar.arrowSize;
		const horizontalScrollBarHeight = scrollBar.horizontalScrollBarSize;

		const rawLineDecorationsWidth = options.get(EditorOption.lineDecorationsWidth);
		const folding = options.get(EditorOption.folding);

		let lineDecorationsWidth: numBer;
		if (typeof rawLineDecorationsWidth === 'string' && /^\d+(\.\d+)?ch$/.test(rawLineDecorationsWidth)) {
			const multiple = parseFloat(rawLineDecorationsWidth.suBstr(0, rawLineDecorationsWidth.length - 2));
			lineDecorationsWidth = EditorIntOption.clampedInt(multiple * typicalHalfwidthCharacterWidth, 0, 0, 1000);
		} else {
			lineDecorationsWidth = EditorIntOption.clampedInt(rawLineDecorationsWidth, 0, 0, 1000);
		}
		if (folding) {
			lineDecorationsWidth += 16;
		}

		let lineNumBersWidth = 0;
		if (showLineNumBers) {
			const digitCount = Math.max(lineNumBersDigitCount, lineNumBersMinChars);
			lineNumBersWidth = Math.round(digitCount * maxDigitWidth);
		}

		let glyphMarginWidth = 0;
		if (showGlyphMargin) {
			glyphMarginWidth = lineHeight;
		}

		let glyphMarginLeft = 0;
		let lineNumBersLeft = glyphMarginLeft + glyphMarginWidth;
		let decorationsLeft = lineNumBersLeft + lineNumBersWidth;
		let contentLeft = decorationsLeft + lineDecorationsWidth;

		const remainingWidth = outerWidth - glyphMarginWidth - lineNumBersWidth - lineDecorationsWidth;

		let isWordWrapMinified = false;
		let isViewportWrapping = false;
		let wrappingColumn = -1;

		if (accessiBilitySupport !== AccessiBilitySupport.EnaBled) {
			// See https://githuB.com/microsoft/vscode/issues/27766
			// Never enaBle wrapping when a screen reader is attached
			// Because arrow down etc. will not move the cursor in the way
			// a screen reader expects.
			if (wordWrapMinified && isDominatedByLongLines) {
				// Force viewport width wrapping if model is dominated By long lines
				isWordWrapMinified = true;
				isViewportWrapping = true;
			} else if (wordWrap === 'on' || wordWrap === 'Bounded') {
				isViewportWrapping = true;
			} else if (wordWrap === 'wordWrapColumn') {
				wrappingColumn = wordWrapColumn;
			}
		}

		const minimapLayout = EditorLayoutInfoComputer._computeMinimapLayout({
			outerWidth: outerWidth,
			outerHeight: outerHeight,
			lineHeight: lineHeight,
			typicalHalfwidthCharacterWidth: typicalHalfwidthCharacterWidth,
			pixelRatio: pixelRatio,
			scrollBeyondLastLine: scrollBeyondLastLine,
			minimap: minimap,
			verticalScrollBarWidth: verticalScrollBarWidth,
			viewLineCount: viewLineCount,
			remainingWidth: remainingWidth,
			isViewportWrapping: isViewportWrapping,
		}, env.memory || new ComputeOptionsMemory());

		if (minimapLayout.renderMinimap !== RenderMinimap.None && minimapLayout.minimapLeft === 0) {
			// the minimap is rendered to the left, so move everything to the right
			glyphMarginLeft += minimapLayout.minimapWidth;
			lineNumBersLeft += minimapLayout.minimapWidth;
			decorationsLeft += minimapLayout.minimapWidth;
			contentLeft += minimapLayout.minimapWidth;
		}
		const contentWidth = remainingWidth - minimapLayout.minimapWidth;

		// (leaving 2px for the cursor to have space after the last character)
		const viewportColumn = Math.max(1, Math.floor((contentWidth - verticalScrollBarWidth - 2) / typicalHalfwidthCharacterWidth));

		const verticalArrowSize = (verticalScrollBarHasArrows ? scrollBarArrowSize : 0);

		if (isViewportWrapping) {
			// compute the actual wrappingColumn
			wrappingColumn = Math.max(1, viewportColumn);
			if (wordWrap === 'Bounded') {
				wrappingColumn = Math.min(wrappingColumn, wordWrapColumn);
			}
		}

		return {
			width: outerWidth,
			height: outerHeight,

			glyphMarginLeft: glyphMarginLeft,
			glyphMarginWidth: glyphMarginWidth,

			lineNumBersLeft: lineNumBersLeft,
			lineNumBersWidth: lineNumBersWidth,

			decorationsLeft: decorationsLeft,
			decorationsWidth: lineDecorationsWidth,

			contentLeft: contentLeft,
			contentWidth: contentWidth,

			minimap: minimapLayout,

			viewportColumn: viewportColumn,

			isWordWrapMinified: isWordWrapMinified,
			isViewportWrapping: isViewportWrapping,
			wrappingColumn: wrappingColumn,

			verticalScrollBarWidth: verticalScrollBarWidth,
			horizontalScrollBarHeight: horizontalScrollBarHeight,

			overviewRuler: {
				top: verticalArrowSize,
				width: verticalScrollBarWidth,
				height: (outerHeight - 2 * verticalArrowSize),
				right: 0
			}
		};
	}
}

//#endregion

//#region lightBulB

/**
 * Configuration options for editor lightBulB
 */
export interface IEditorLightBulBOptions {
	/**
	 * EnaBle the lightBulB code action.
	 * Defaults to true.
	 */
	enaBled?: Boolean;
}

export type EditorLightBulBOptions = Readonly<Required<IEditorLightBulBOptions>>;

class EditorLightBulB extends BaseEditorOption<EditorOption.lightBulB, EditorLightBulBOptions> {

	constructor() {
		const defaults: EditorLightBulBOptions = { enaBled: true };
		super(
			EditorOption.lightBulB, 'lightBulB', defaults,
			{
				'editor.lightBulB.enaBled': {
					type: 'Boolean',
					default: defaults.enaBled,
					description: nls.localize('codeActions', "EnaBles the code action lightBulB in the editor.")
				},
			}
		);
	}

	puBlic validate(_input: any): EditorLightBulBOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorLightBulBOptions;
		return {
			enaBled: EditorBooleanOption.Boolean(input.enaBled, this.defaultValue.enaBled)
		};
	}
}

//#endregion

//#region lineHeight

class EditorLineHeight extends EditorIntOption<EditorOption.lineHeight> {

	constructor() {
		super(
			EditorOption.lineHeight, 'lineHeight',
			EDITOR_FONT_DEFAULTS.lineHeight, 0, 150,
			{ description: nls.localize('lineHeight', "Controls the line height. Use 0 to compute the line height from the font size.") }
		);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, value: numBer): numBer {
		// The lineHeight is computed from the fontSize if it is 0.
		// Moreover, the final lineHeight respects the editor zoom level.
		// So take the result from env.fontInfo
		return env.fontInfo.lineHeight;
	}
}

//#endregion

//#region minimap

/**
 * Configuration options for editor minimap
 */
export interface IEditorMinimapOptions {
	/**
	 * EnaBle the rendering of the minimap.
	 * Defaults to true.
	 */
	enaBled?: Boolean;
	/**
	 * Control the side of the minimap in editor.
	 * Defaults to 'right'.
	 */
	side?: 'right' | 'left';
	/**
	 * Control the minimap rendering mode.
	 * Defaults to 'actual'.
	 */
	size?: 'proportional' | 'fill' | 'fit';
	/**
	 * Control the rendering of the minimap slider.
	 * Defaults to 'mouseover'.
	 */
	showSlider?: 'always' | 'mouseover';
	/**
	 * Render the actual text on a line (as opposed to color Blocks).
	 * Defaults to true.
	 */
	renderCharacters?: Boolean;
	/**
	 * Limit the width of the minimap to render at most a certain numBer of columns.
	 * Defaults to 120.
	 */
	maxColumn?: numBer;
	/**
	 * Relative size of the font in the minimap. Defaults to 1.
	 */
	scale?: numBer;
}

export type EditorMinimapOptions = Readonly<Required<IEditorMinimapOptions>>;

class EditorMinimap extends BaseEditorOption<EditorOption.minimap, EditorMinimapOptions> {

	constructor() {
		const defaults: EditorMinimapOptions = {
			enaBled: true,
			size: 'proportional',
			side: 'right',
			showSlider: 'mouseover',
			renderCharacters: true,
			maxColumn: 120,
			scale: 1,
		};
		super(
			EditorOption.minimap, 'minimap', defaults,
			{
				'editor.minimap.enaBled': {
					type: 'Boolean',
					default: defaults.enaBled,
					description: nls.localize('minimap.enaBled', "Controls whether the minimap is shown.")
				},
				'editor.minimap.size': {
					type: 'string',
					enum: ['proportional', 'fill', 'fit'],
					enumDescriptions: [
						nls.localize('minimap.size.proportional', "The minimap has the same size as the editor contents (and might scroll)."),
						nls.localize('minimap.size.fill', "The minimap will stretch or shrink as necessary to fill the height of the editor (no scrolling)."),
						nls.localize('minimap.size.fit', "The minimap will shrink as necessary to never Be larger than the editor (no scrolling)."),
					],
					default: defaults.size,
					description: nls.localize('minimap.size', "Controls the size of the minimap.")
				},
				'editor.minimap.side': {
					type: 'string',
					enum: ['left', 'right'],
					default: defaults.side,
					description: nls.localize('minimap.side', "Controls the side where to render the minimap.")
				},
				'editor.minimap.showSlider': {
					type: 'string',
					enum: ['always', 'mouseover'],
					default: defaults.showSlider,
					description: nls.localize('minimap.showSlider', "Controls when the minimap slider is shown.")
				},
				'editor.minimap.scale': {
					type: 'numBer',
					default: defaults.scale,
					minimum: 1,
					maximum: 3,
					enum: [1, 2, 3],
					description: nls.localize('minimap.scale', "Scale of content drawn in the minimap: 1, 2 or 3.")
				},
				'editor.minimap.renderCharacters': {
					type: 'Boolean',
					default: defaults.renderCharacters,
					description: nls.localize('minimap.renderCharacters', "Render the actual characters on a line as opposed to color Blocks.")
				},
				'editor.minimap.maxColumn': {
					type: 'numBer',
					default: defaults.maxColumn,
					description: nls.localize('minimap.maxColumn', "Limit the width of the minimap to render at most a certain numBer of columns.")
				}
			}
		);
	}

	puBlic validate(_input: any): EditorMinimapOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorMinimapOptions;
		return {
			enaBled: EditorBooleanOption.Boolean(input.enaBled, this.defaultValue.enaBled),
			size: EditorStringEnumOption.stringSet<'proportional' | 'fill' | 'fit'>(input.size, this.defaultValue.size, ['proportional', 'fill', 'fit']),
			side: EditorStringEnumOption.stringSet<'right' | 'left'>(input.side, this.defaultValue.side, ['right', 'left']),
			showSlider: EditorStringEnumOption.stringSet<'always' | 'mouseover'>(input.showSlider, this.defaultValue.showSlider, ['always', 'mouseover']),
			renderCharacters: EditorBooleanOption.Boolean(input.renderCharacters, this.defaultValue.renderCharacters),
			scale: EditorIntOption.clampedInt(input.scale, 1, 1, 3),
			maxColumn: EditorIntOption.clampedInt(input.maxColumn, this.defaultValue.maxColumn, 1, 10000),
		};
	}
}

//#endregion

//#region multiCursorModifier

function _multiCursorModifierFromString(multiCursorModifier: 'ctrlCmd' | 'alt'): 'altKey' | 'metaKey' | 'ctrlKey' {
	if (multiCursorModifier === 'ctrlCmd') {
		return (platform.isMacintosh ? 'metaKey' : 'ctrlKey');
	}
	return 'altKey';
}

//#endregion

//#region padding

/**
 * Configuration options for editor padding
 */
export interface IEditorPaddingOptions {
	/**
	 * Spacing Between top edge of editor and first line.
	 */
	top?: numBer;
	/**
	 * Spacing Between Bottom edge of editor and last line.
	 */
	Bottom?: numBer;
}

export interface InternalEditorPaddingOptions {
	readonly top: numBer;
	readonly Bottom: numBer;
}

class EditorPadding extends BaseEditorOption<EditorOption.padding, InternalEditorPaddingOptions> {

	constructor() {
		super(
			EditorOption.padding, 'padding', { top: 0, Bottom: 0 },
			{
				'editor.padding.top': {
					type: 'numBer',
					default: 0,
					minimum: 0,
					maximum: 1000,
					description: nls.localize('padding.top', "Controls the amount of space Between the top edge of the editor and the first line.")
				},
				'editor.padding.Bottom': {
					type: 'numBer',
					default: 0,
					minimum: 0,
					maximum: 1000,
					description: nls.localize('padding.Bottom', "Controls the amount of space Between the Bottom edge of the editor and the last line.")
				}
			}
		);
	}

	puBlic validate(_input: any): InternalEditorPaddingOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorPaddingOptions;

		return {
			top: EditorIntOption.clampedInt(input.top, 0, 0, 1000),
			Bottom: EditorIntOption.clampedInt(input.Bottom, 0, 0, 1000)
		};
	}
}
//#endregion

//#region parameterHints

/**
 * Configuration options for parameter hints
 */
export interface IEditorParameterHintOptions {
	/**
	 * EnaBle parameter hints.
	 * Defaults to true.
	 */
	enaBled?: Boolean;
	/**
	 * EnaBle cycling of parameter hints.
	 * Defaults to false.
	 */
	cycle?: Boolean;
}

export type InternalParameterHintOptions = Readonly<Required<IEditorParameterHintOptions>>;

class EditorParameterHints extends BaseEditorOption<EditorOption.parameterHints, InternalParameterHintOptions> {

	constructor() {
		const defaults: InternalParameterHintOptions = {
			enaBled: true,
			cycle: false
		};
		super(
			EditorOption.parameterHints, 'parameterHints', defaults,
			{
				'editor.parameterHints.enaBled': {
					type: 'Boolean',
					default: defaults.enaBled,
					description: nls.localize('parameterHints.enaBled', "EnaBles a pop-up that shows parameter documentation and type information as you type.")
				},
				'editor.parameterHints.cycle': {
					type: 'Boolean',
					default: defaults.cycle,
					description: nls.localize('parameterHints.cycle', "Controls whether the parameter hints menu cycles or closes when reaching the end of the list.")
				},
			}
		);
	}

	puBlic validate(_input: any): InternalParameterHintOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorParameterHintOptions;
		return {
			enaBled: EditorBooleanOption.Boolean(input.enaBled, this.defaultValue.enaBled),
			cycle: EditorBooleanOption.Boolean(input.cycle, this.defaultValue.cycle)
		};
	}
}

//#endregion

//#region pixelRatio

class EditorPixelRatio extends ComputedEditorOption<EditorOption.pixelRatio, numBer> {

	constructor() {
		super(EditorOption.pixelRatio);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: numBer): numBer {
		return env.pixelRatio;
	}
}

//#endregion

//#region quickSuggestions

/**
 * Configuration options for quick suggestions
 */
export interface IQuickSuggestionsOptions {
	other?: Boolean;
	comments?: Boolean;
	strings?: Boolean;
}

export type ValidQuickSuggestionsOptions = Boolean | Readonly<Required<IQuickSuggestionsOptions>>;

class EditorQuickSuggestions extends BaseEditorOption<EditorOption.quickSuggestions, ValidQuickSuggestionsOptions> {

	puBlic readonly defaultValue: Readonly<Required<IQuickSuggestionsOptions>>;

	constructor() {
		const defaults: ValidQuickSuggestionsOptions = {
			other: true,
			comments: false,
			strings: false
		};
		super(
			EditorOption.quickSuggestions, 'quickSuggestions', defaults,
			{
				anyOf: [
					{
						type: 'Boolean',
					},
					{
						type: 'oBject',
						properties: {
							strings: {
								type: 'Boolean',
								default: defaults.strings,
								description: nls.localize('quickSuggestions.strings', "EnaBle quick suggestions inside strings.")
							},
							comments: {
								type: 'Boolean',
								default: defaults.comments,
								description: nls.localize('quickSuggestions.comments', "EnaBle quick suggestions inside comments.")
							},
							other: {
								type: 'Boolean',
								default: defaults.other,
								description: nls.localize('quickSuggestions.other', "EnaBle quick suggestions outside of strings and comments.")
							},
						}
					}
				],
				default: defaults,
				description: nls.localize('quickSuggestions', "Controls whether suggestions should automatically show up while typing.")
			}
		);
		this.defaultValue = defaults;
	}

	puBlic validate(_input: any): ValidQuickSuggestionsOptions {
		if (typeof _input === 'Boolean') {
			return _input;
		}
		if (_input && typeof _input === 'oBject') {
			const input = _input as IQuickSuggestionsOptions;
			const opts = {
				other: EditorBooleanOption.Boolean(input.other, this.defaultValue.other),
				comments: EditorBooleanOption.Boolean(input.comments, this.defaultValue.comments),
				strings: EditorBooleanOption.Boolean(input.strings, this.defaultValue.strings),
			};
			if (opts.other && opts.comments && opts.strings) {
				return true; // all on
			} else if (!opts.other && !opts.comments && !opts.strings) {
				return false; // all off
			} else {
				return opts;
			}
		}
		return this.defaultValue;
	}
}

//#endregion

//#region renderLineNumBers

export type LineNumBersType = 'on' | 'off' | 'relative' | 'interval' | ((lineNumBer: numBer) => string);

export const enum RenderLineNumBersType {
	Off = 0,
	On = 1,
	Relative = 2,
	Interval = 3,
	Custom = 4
}

export interface InternalEditorRenderLineNumBersOptions {
	readonly renderType: RenderLineNumBersType;
	readonly renderFn: ((lineNumBer: numBer) => string) | null;
}

class EditorRenderLineNumBersOption extends BaseEditorOption<EditorOption.lineNumBers, InternalEditorRenderLineNumBersOptions> {

	constructor() {
		super(
			EditorOption.lineNumBers, 'lineNumBers', { renderType: RenderLineNumBersType.On, renderFn: null },
			{
				type: 'string',
				enum: ['off', 'on', 'relative', 'interval'],
				enumDescriptions: [
					nls.localize('lineNumBers.off', "Line numBers are not rendered."),
					nls.localize('lineNumBers.on', "Line numBers are rendered as aBsolute numBer."),
					nls.localize('lineNumBers.relative', "Line numBers are rendered as distance in lines to cursor position."),
					nls.localize('lineNumBers.interval', "Line numBers are rendered every 10 lines.")
				],
				default: 'on',
				description: nls.localize('lineNumBers', "Controls the display of line numBers.")
			}
		);
	}

	puBlic validate(lineNumBers: any): InternalEditorRenderLineNumBersOptions {
		let renderType: RenderLineNumBersType = this.defaultValue.renderType;
		let renderFn: ((lineNumBer: numBer) => string) | null = this.defaultValue.renderFn;

		if (typeof lineNumBers !== 'undefined') {
			if (typeof lineNumBers === 'function') {
				renderType = RenderLineNumBersType.Custom;
				renderFn = lineNumBers;
			} else if (lineNumBers === 'interval') {
				renderType = RenderLineNumBersType.Interval;
			} else if (lineNumBers === 'relative') {
				renderType = RenderLineNumBersType.Relative;
			} else if (lineNumBers === 'on') {
				renderType = RenderLineNumBersType.On;
			} else {
				renderType = RenderLineNumBersType.Off;
			}
		}

		return {
			renderType,
			renderFn
		};
	}
}

//#endregion

//#region renderValidationDecorations

/**
 * @internal
 */
export function filterValidationDecorations(options: IComputedEditorOptions): Boolean {
	const renderValidationDecorations = options.get(EditorOption.renderValidationDecorations);
	if (renderValidationDecorations === 'editaBle') {
		return options.get(EditorOption.readOnly);
	}
	return renderValidationDecorations === 'on' ? false : true;
}

//#endregion

//#region rulers

export interface IRulerOption {
	readonly column: numBer;
	readonly color: string | null;
}

class EditorRulers extends BaseEditorOption<EditorOption.rulers, IRulerOption[]> {

	constructor() {
		const defaults: IRulerOption[] = [];
		const columnSchema: IJSONSchema = { type: 'numBer', description: nls.localize('rulers.size', "NumBer of monospace characters at which this editor ruler will render.") };
		super(
			EditorOption.rulers, 'rulers', defaults,
			{
				type: 'array',
				items: {
					anyOf: [
						columnSchema,
						{
							type: [
								'oBject'
							],
							properties: {
								column: columnSchema,
								color: {
									type: 'string',
									description: nls.localize('rulers.color', "Color of this editor ruler."),
									format: 'color-hex'
								}
							}
						}
					]
				},
				default: defaults,
				description: nls.localize('rulers', "Render vertical rulers after a certain numBer of monospace characters. Use multiple values for multiple rulers. No rulers are drawn if array is empty.")
			}
		);
	}

	puBlic validate(input: any): IRulerOption[] {
		if (Array.isArray(input)) {
			let rulers: IRulerOption[] = [];
			for (let _element of input) {
				if (typeof _element === 'numBer') {
					rulers.push({
						column: EditorIntOption.clampedInt(_element, 0, 0, 10000),
						color: null
					});
				} else if (_element && typeof _element === 'oBject') {
					const element = _element as IRulerOption;
					rulers.push({
						column: EditorIntOption.clampedInt(element.column, 0, 0, 10000),
						color: element.color
					});
				}
			}
			rulers.sort((a, B) => a.column - B.column);
			return rulers;
		}
		return this.defaultValue;
	}
}

//#endregion

//#region scrollBar

/**
 * Configuration options for editor scrollBars
 */
export interface IEditorScrollBarOptions {
	/**
	 * The size of arrows (if displayed).
	 * Defaults to 11.
	 */
	arrowSize?: numBer;
	/**
	 * Render vertical scrollBar.
	 * Defaults to 'auto'.
	 */
	vertical?: 'auto' | 'visiBle' | 'hidden';
	/**
	 * Render horizontal scrollBar.
	 * Defaults to 'auto'.
	 */
	horizontal?: 'auto' | 'visiBle' | 'hidden';
	/**
	 * Cast horizontal and vertical shadows when the content is scrolled.
	 * Defaults to true.
	 */
	useShadows?: Boolean;
	/**
	 * Render arrows at the top and Bottom of the vertical scrollBar.
	 * Defaults to false.
	 */
	verticalHasArrows?: Boolean;
	/**
	 * Render arrows at the left and right of the horizontal scrollBar.
	 * Defaults to false.
	 */
	horizontalHasArrows?: Boolean;
	/**
	 * Listen to mouse wheel events and react to them By scrolling.
	 * Defaults to true.
	 */
	handleMouseWheel?: Boolean;
	/**
	 * Always consume mouse wheel events (always call preventDefault() and stopPropagation() on the Browser events).
	 * Defaults to true.
	 */
	alwaysConsumeMouseWheel?: Boolean;
	/**
	 * Height in pixels for the horizontal scrollBar.
	 * Defaults to 10 (px).
	 */
	horizontalScrollBarSize?: numBer;
	/**
	 * Width in pixels for the vertical scrollBar.
	 * Defaults to 10 (px).
	 */
	verticalScrollBarSize?: numBer;
	/**
	 * Width in pixels for the vertical slider.
	 * Defaults to `verticalScrollBarSize`.
	 */
	verticalSliderSize?: numBer;
	/**
	 * Height in pixels for the horizontal slider.
	 * Defaults to `horizontalScrollBarSize`.
	 */
	horizontalSliderSize?: numBer;
}

export interface InternalEditorScrollBarOptions {
	readonly arrowSize: numBer;
	readonly vertical: ScrollBarVisiBility;
	readonly horizontal: ScrollBarVisiBility;
	readonly useShadows: Boolean;
	readonly verticalHasArrows: Boolean;
	readonly horizontalHasArrows: Boolean;
	readonly handleMouseWheel: Boolean;
	readonly alwaysConsumeMouseWheel: Boolean;
	readonly horizontalScrollBarSize: numBer;
	readonly horizontalSliderSize: numBer;
	readonly verticalScrollBarSize: numBer;
	readonly verticalSliderSize: numBer;
}

function _scrollBarVisiBilityFromString(visiBility: string | undefined, defaultValue: ScrollBarVisiBility): ScrollBarVisiBility {
	if (typeof visiBility !== 'string') {
		return defaultValue;
	}
	switch (visiBility) {
		case 'hidden': return ScrollBarVisiBility.Hidden;
		case 'visiBle': return ScrollBarVisiBility.VisiBle;
		default: return ScrollBarVisiBility.Auto;
	}
}

class EditorScrollBar extends BaseEditorOption<EditorOption.scrollBar, InternalEditorScrollBarOptions> {

	constructor() {
		super(
			EditorOption.scrollBar, 'scrollBar',
			{
				vertical: ScrollBarVisiBility.Auto,
				horizontal: ScrollBarVisiBility.Auto,
				arrowSize: 11,
				useShadows: true,
				verticalHasArrows: false,
				horizontalHasArrows: false,
				horizontalScrollBarSize: 12,
				horizontalSliderSize: 12,
				verticalScrollBarSize: 14,
				verticalSliderSize: 14,
				handleMouseWheel: true,
				alwaysConsumeMouseWheel: true
			}
		);
	}

	puBlic validate(_input: any): InternalEditorScrollBarOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as IEditorScrollBarOptions;
		const horizontalScrollBarSize = EditorIntOption.clampedInt(input.horizontalScrollBarSize, this.defaultValue.horizontalScrollBarSize, 0, 1000);
		const verticalScrollBarSize = EditorIntOption.clampedInt(input.verticalScrollBarSize, this.defaultValue.verticalScrollBarSize, 0, 1000);
		return {
			arrowSize: EditorIntOption.clampedInt(input.arrowSize, this.defaultValue.arrowSize, 0, 1000),
			vertical: _scrollBarVisiBilityFromString(input.vertical, this.defaultValue.vertical),
			horizontal: _scrollBarVisiBilityFromString(input.horizontal, this.defaultValue.horizontal),
			useShadows: EditorBooleanOption.Boolean(input.useShadows, this.defaultValue.useShadows),
			verticalHasArrows: EditorBooleanOption.Boolean(input.verticalHasArrows, this.defaultValue.verticalHasArrows),
			horizontalHasArrows: EditorBooleanOption.Boolean(input.horizontalHasArrows, this.defaultValue.horizontalHasArrows),
			handleMouseWheel: EditorBooleanOption.Boolean(input.handleMouseWheel, this.defaultValue.handleMouseWheel),
			alwaysConsumeMouseWheel: EditorBooleanOption.Boolean(input.alwaysConsumeMouseWheel, this.defaultValue.alwaysConsumeMouseWheel),
			horizontalScrollBarSize: horizontalScrollBarSize,
			horizontalSliderSize: EditorIntOption.clampedInt(input.horizontalSliderSize, horizontalScrollBarSize, 0, 1000),
			verticalScrollBarSize: verticalScrollBarSize,
			verticalSliderSize: EditorIntOption.clampedInt(input.verticalSliderSize, verticalScrollBarSize, 0, 1000),
		};
	}
}

//#endregion

//#region suggest

/**
 * Configuration options for editor suggest widget
 */
export interface ISuggestOptions {
	/**
	 * Overwrite word ends on accept. Default to false.
	 */
	insertMode?: 'insert' | 'replace';
	/**
	 * EnaBle graceful matching. Defaults to true.
	 */
	filterGraceful?: Boolean;
	/**
	 * Prevent quick suggestions when a snippet is active. Defaults to true.
	 */
	snippetsPreventQuickSuggestions?: Boolean;
	/**
	 * Favours words that appear close to the cursor.
	 */
	localityBonus?: Boolean;
	/**
	 * EnaBle using gloBal storage for rememBering suggestions.
	 */
	shareSuggestSelections?: Boolean;
	/**
	 * EnaBle or disaBle icons in suggestions. Defaults to true.
	 */
	showIcons?: Boolean;
	/**
	 * Max suggestions to show in suggestions. Defaults to 12.
	 */
	maxVisiBleSuggestions?: numBer;
	/**
	 * Show method-suggestions.
	 */
	showMethods?: Boolean;
	/**
	 * Show function-suggestions.
	 */
	showFunctions?: Boolean;
	/**
	 * Show constructor-suggestions.
	 */
	showConstructors?: Boolean;
	/**
	 * Show field-suggestions.
	 */
	showFields?: Boolean;
	/**
	 * Show variaBle-suggestions.
	 */
	showVariaBles?: Boolean;
	/**
	 * Show class-suggestions.
	 */
	showClasses?: Boolean;
	/**
	 * Show struct-suggestions.
	 */
	showStructs?: Boolean;
	/**
	 * Show interface-suggestions.
	 */
	showInterfaces?: Boolean;
	/**
	 * Show module-suggestions.
	 */
	showModules?: Boolean;
	/**
	 * Show property-suggestions.
	 */
	showProperties?: Boolean;
	/**
	 * Show event-suggestions.
	 */
	showEvents?: Boolean;
	/**
	 * Show operator-suggestions.
	 */
	showOperators?: Boolean;
	/**
	 * Show unit-suggestions.
	 */
	showUnits?: Boolean;
	/**
	 * Show value-suggestions.
	 */
	showValues?: Boolean;
	/**
	 * Show constant-suggestions.
	 */
	showConstants?: Boolean;
	/**
	 * Show enum-suggestions.
	 */
	showEnums?: Boolean;
	/**
	 * Show enumMemBer-suggestions.
	 */
	showEnumMemBers?: Boolean;
	/**
	 * Show keyword-suggestions.
	 */
	showKeywords?: Boolean;
	/**
	 * Show text-suggestions.
	 */
	showWords?: Boolean;
	/**
	 * Show color-suggestions.
	 */
	showColors?: Boolean;
	/**
	 * Show file-suggestions.
	 */
	showFiles?: Boolean;
	/**
	 * Show reference-suggestions.
	 */
	showReferences?: Boolean;
	/**
	 * Show folder-suggestions.
	 */
	showFolders?: Boolean;
	/**
	 * Show typeParameter-suggestions.
	 */
	showTypeParameters?: Boolean;
	/**
	 * Show issue-suggestions.
	 */
	showIssues?: Boolean;
	/**
	 * Show user-suggestions.
	 */
	showUsers?: Boolean;
	/**
	 * Show snippet-suggestions.
	 */
	showSnippets?: Boolean;
	/**
	 * Status Bar related settings.
	 */
	statusBar?: {
		/**
		 * Controls the visiBility of the status Bar at the Bottom of the suggest widget.
		 */
		visiBle?: Boolean;
	};
}

export type InternalSuggestOptions = Readonly<Required<ISuggestOptions>>;

class EditorSuggest extends BaseEditorOption<EditorOption.suggest, InternalSuggestOptions> {

	constructor() {
		const defaults: InternalSuggestOptions = {
			insertMode: 'insert',
			filterGraceful: true,
			snippetsPreventQuickSuggestions: true,
			localityBonus: false,
			shareSuggestSelections: false,
			showIcons: true,
			maxVisiBleSuggestions: 12,
			showMethods: true,
			showFunctions: true,
			showConstructors: true,
			showFields: true,
			showVariaBles: true,
			showClasses: true,
			showStructs: true,
			showInterfaces: true,
			showModules: true,
			showProperties: true,
			showEvents: true,
			showOperators: true,
			showUnits: true,
			showValues: true,
			showConstants: true,
			showEnums: true,
			showEnumMemBers: true,
			showKeywords: true,
			showWords: true,
			showColors: true,
			showFiles: true,
			showReferences: true,
			showFolders: true,
			showTypeParameters: true,
			showSnippets: true,
			showUsers: true,
			showIssues: true,
			statusBar: {
				visiBle: false
			}
		};
		super(
			EditorOption.suggest, 'suggest', defaults,
			{
				'editor.suggest.insertMode': {
					type: 'string',
					enum: ['insert', 'replace'],
					enumDescriptions: [
						nls.localize('suggest.insertMode.insert', "Insert suggestion without overwriting text right of the cursor."),
						nls.localize('suggest.insertMode.replace', "Insert suggestion and overwrite text right of the cursor."),
					],
					default: defaults.insertMode,
					description: nls.localize('suggest.insertMode', "Controls whether words are overwritten when accepting completions. Note that this depends on extensions opting into this feature.")
				},
				'editor.suggest.filterGraceful': {
					type: 'Boolean',
					default: defaults.filterGraceful,
					description: nls.localize('suggest.filterGraceful', "Controls whether filtering and sorting suggestions accounts for small typos.")
				},
				'editor.suggest.localityBonus': {
					type: 'Boolean',
					default: defaults.localityBonus,
					description: nls.localize('suggest.localityBonus', "Controls whether sorting favours words that appear close to the cursor.")
				},
				'editor.suggest.shareSuggestSelections': {
					type: 'Boolean',
					default: defaults.shareSuggestSelections,
					markdownDescription: nls.localize('suggest.shareSuggestSelections', "Controls whether rememBered suggestion selections are shared Between multiple workspaces and windows (needs `#editor.suggestSelection#`).")
				},
				'editor.suggest.snippetsPreventQuickSuggestions': {
					type: 'Boolean',
					default: defaults.snippetsPreventQuickSuggestions,
					description: nls.localize('suggest.snippetsPreventQuickSuggestions', "Controls whether an active snippet prevents quick suggestions.")
				},
				'editor.suggest.showIcons': {
					type: 'Boolean',
					default: defaults.showIcons,
					description: nls.localize('suggest.showIcons', "Controls whether to show or hide icons in suggestions.")
				},
				'editor.suggest.maxVisiBleSuggestions': {
					type: 'numBer',
					default: defaults.maxVisiBleSuggestions,
					minimum: 1,
					maximum: 15,
					description: nls.localize('suggest.maxVisiBleSuggestions', "Controls how many suggestions IntelliSense will show Before showing a scrollBar (maximum 15).")
				},
				'editor.suggest.filteredTypes': {
					type: 'oBject',
					deprecationMessage: nls.localize('deprecated', "This setting is deprecated, please use separate settings like 'editor.suggest.showKeywords' or 'editor.suggest.showSnippets' instead.")
				},
				'editor.suggest.showMethods': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showMethods', "When enaBled IntelliSense shows `method`-suggestions.")
				},
				'editor.suggest.showFunctions': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showFunctions', "When enaBled IntelliSense shows `function`-suggestions.")
				},
				'editor.suggest.showConstructors': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showConstructors', "When enaBled IntelliSense shows `constructor`-suggestions.")
				},
				'editor.suggest.showFields': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showFields', "When enaBled IntelliSense shows `field`-suggestions.")
				},
				'editor.suggest.showVariaBles': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showVariaBles', "When enaBled IntelliSense shows `variaBle`-suggestions.")
				},
				'editor.suggest.showClasses': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showClasss', "When enaBled IntelliSense shows `class`-suggestions.")
				},
				'editor.suggest.showStructs': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showStructs', "When enaBled IntelliSense shows `struct`-suggestions.")
				},
				'editor.suggest.showInterfaces': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showInterfaces', "When enaBled IntelliSense shows `interface`-suggestions.")
				},
				'editor.suggest.showModules': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showModules', "When enaBled IntelliSense shows `module`-suggestions.")
				},
				'editor.suggest.showProperties': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showPropertys', "When enaBled IntelliSense shows `property`-suggestions.")
				},
				'editor.suggest.showEvents': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showEvents', "When enaBled IntelliSense shows `event`-suggestions.")
				},
				'editor.suggest.showOperators': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showOperators', "When enaBled IntelliSense shows `operator`-suggestions.")
				},
				'editor.suggest.showUnits': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showUnits', "When enaBled IntelliSense shows `unit`-suggestions.")
				},
				'editor.suggest.showValues': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showValues', "When enaBled IntelliSense shows `value`-suggestions.")
				},
				'editor.suggest.showConstants': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showConstants', "When enaBled IntelliSense shows `constant`-suggestions.")
				},
				'editor.suggest.showEnums': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showEnums', "When enaBled IntelliSense shows `enum`-suggestions.")
				},
				'editor.suggest.showEnumMemBers': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showEnumMemBers', "When enaBled IntelliSense shows `enumMemBer`-suggestions.")
				},
				'editor.suggest.showKeywords': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showKeywords', "When enaBled IntelliSense shows `keyword`-suggestions.")
				},
				'editor.suggest.showWords': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showTexts', "When enaBled IntelliSense shows `text`-suggestions.")
				},
				'editor.suggest.showColors': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showColors', "When enaBled IntelliSense shows `color`-suggestions.")
				},
				'editor.suggest.showFiles': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showFiles', "When enaBled IntelliSense shows `file`-suggestions.")
				},
				'editor.suggest.showReferences': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showReferences', "When enaBled IntelliSense shows `reference`-suggestions.")
				},
				'editor.suggest.showCustomcolors': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showCustomcolors', "When enaBled IntelliSense shows `customcolor`-suggestions.")
				},
				'editor.suggest.showFolders': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showFolders', "When enaBled IntelliSense shows `folder`-suggestions.")
				},
				'editor.suggest.showTypeParameters': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showTypeParameters', "When enaBled IntelliSense shows `typeParameter`-suggestions.")
				},
				'editor.suggest.showSnippets': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showSnippets', "When enaBled IntelliSense shows `snippet`-suggestions.")
				},
				'editor.suggest.showUsers': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showUsers', "When enaBled IntelliSense shows `user`-suggestions.")
				},
				'editor.suggest.showIssues': {
					type: 'Boolean',
					default: true,
					markdownDescription: nls.localize('editor.suggest.showIssues', "When enaBled IntelliSense shows `issues`-suggestions.")
				},
				'editor.suggest.statusBar.visiBle': {
					type: 'Boolean',
					default: false,
					markdownDescription: nls.localize('editor.suggest.statusBar.visiBle', "Controls the visiBility of the status Bar at the Bottom of the suggest widget.")
				}
			}
		);
	}

	puBlic validate(_input: any): InternalSuggestOptions {
		if (!_input || typeof _input !== 'oBject') {
			return this.defaultValue;
		}
		const input = _input as ISuggestOptions;
		return {
			insertMode: EditorStringEnumOption.stringSet(input.insertMode, this.defaultValue.insertMode, ['insert', 'replace']),
			filterGraceful: EditorBooleanOption.Boolean(input.filterGraceful, this.defaultValue.filterGraceful),
			snippetsPreventQuickSuggestions: EditorBooleanOption.Boolean(input.snippetsPreventQuickSuggestions, this.defaultValue.filterGraceful),
			localityBonus: EditorBooleanOption.Boolean(input.localityBonus, this.defaultValue.localityBonus),
			shareSuggestSelections: EditorBooleanOption.Boolean(input.shareSuggestSelections, this.defaultValue.shareSuggestSelections),
			showIcons: EditorBooleanOption.Boolean(input.showIcons, this.defaultValue.showIcons),
			maxVisiBleSuggestions: EditorIntOption.clampedInt(input.maxVisiBleSuggestions, this.defaultValue.maxVisiBleSuggestions, 1, 15),
			showMethods: EditorBooleanOption.Boolean(input.showMethods, this.defaultValue.showMethods),
			showFunctions: EditorBooleanOption.Boolean(input.showFunctions, this.defaultValue.showFunctions),
			showConstructors: EditorBooleanOption.Boolean(input.showConstructors, this.defaultValue.showConstructors),
			showFields: EditorBooleanOption.Boolean(input.showFields, this.defaultValue.showFields),
			showVariaBles: EditorBooleanOption.Boolean(input.showVariaBles, this.defaultValue.showVariaBles),
			showClasses: EditorBooleanOption.Boolean(input.showClasses, this.defaultValue.showClasses),
			showStructs: EditorBooleanOption.Boolean(input.showStructs, this.defaultValue.showStructs),
			showInterfaces: EditorBooleanOption.Boolean(input.showInterfaces, this.defaultValue.showInterfaces),
			showModules: EditorBooleanOption.Boolean(input.showModules, this.defaultValue.showModules),
			showProperties: EditorBooleanOption.Boolean(input.showProperties, this.defaultValue.showProperties),
			showEvents: EditorBooleanOption.Boolean(input.showEvents, this.defaultValue.showEvents),
			showOperators: EditorBooleanOption.Boolean(input.showOperators, this.defaultValue.showOperators),
			showUnits: EditorBooleanOption.Boolean(input.showUnits, this.defaultValue.showUnits),
			showValues: EditorBooleanOption.Boolean(input.showValues, this.defaultValue.showValues),
			showConstants: EditorBooleanOption.Boolean(input.showConstants, this.defaultValue.showConstants),
			showEnums: EditorBooleanOption.Boolean(input.showEnums, this.defaultValue.showEnums),
			showEnumMemBers: EditorBooleanOption.Boolean(input.showEnumMemBers, this.defaultValue.showEnumMemBers),
			showKeywords: EditorBooleanOption.Boolean(input.showKeywords, this.defaultValue.showKeywords),
			showWords: EditorBooleanOption.Boolean(input.showWords, this.defaultValue.showWords),
			showColors: EditorBooleanOption.Boolean(input.showColors, this.defaultValue.showColors),
			showFiles: EditorBooleanOption.Boolean(input.showFiles, this.defaultValue.showFiles),
			showReferences: EditorBooleanOption.Boolean(input.showReferences, this.defaultValue.showReferences),
			showFolders: EditorBooleanOption.Boolean(input.showFolders, this.defaultValue.showFolders),
			showTypeParameters: EditorBooleanOption.Boolean(input.showTypeParameters, this.defaultValue.showTypeParameters),
			showSnippets: EditorBooleanOption.Boolean(input.showSnippets, this.defaultValue.showSnippets),
			showUsers: EditorBooleanOption.Boolean(input.showUsers, this.defaultValue.showUsers),
			showIssues: EditorBooleanOption.Boolean(input.showIssues, this.defaultValue.showIssues),
			statusBar: {
				visiBle: EditorBooleanOption.Boolean(input.statusBar?.visiBle, !!this.defaultValue.statusBar.visiBle)
			}
		};
	}
}

//#endregion

//#region taBFocusMode

class EditorTaBFocusMode extends ComputedEditorOption<EditorOption.taBFocusMode, Boolean> {

	constructor() {
		super(EditorOption.taBFocusMode, [EditorOption.readOnly]);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: Boolean): Boolean {
		const readOnly = options.get(EditorOption.readOnly);
		return (readOnly ? true : env.taBFocusMode);
	}
}

//#endregion

//#region wrappingIndent

/**
 * DescriBes how to indent wrapped lines.
 */
export const enum WrappingIndent {
	/**
	 * No indentation => wrapped lines Begin at column 1.
	 */
	None = 0,
	/**
	 * Same => wrapped lines get the same indentation as the parent.
	 */
	Same = 1,
	/**
	 * Indent => wrapped lines get +1 indentation toward the parent.
	 */
	Indent = 2,
	/**
	 * DeepIndent => wrapped lines get +2 indentation toward the parent.
	 */
	DeepIndent = 3
}

function _wrappingIndentFromString(wrappingIndent: 'none' | 'same' | 'indent' | 'deepIndent'): WrappingIndent {
	switch (wrappingIndent) {
		case 'none': return WrappingIndent.None;
		case 'same': return WrappingIndent.Same;
		case 'indent': return WrappingIndent.Indent;
		case 'deepIndent': return WrappingIndent.DeepIndent;
	}
}

//#endregion

//#region wrappingInfo

export interface EditorWrappingInfo {
	readonly isDominatedByLongLines: Boolean;
	readonly isWordWrapMinified: Boolean;
	readonly isViewportWrapping: Boolean;
	readonly wrappingColumn: numBer;
}

class EditorWrappingInfoComputer extends ComputedEditorOption<EditorOption.wrappingInfo, EditorWrappingInfo> {

	constructor() {
		super(EditorOption.wrappingInfo, [EditorOption.layoutInfo]);
	}

	puBlic compute(env: IEnvironmentalOptions, options: IComputedEditorOptions, _: EditorWrappingInfo): EditorWrappingInfo {
		const layoutInfo = options.get(EditorOption.layoutInfo);

		return {
			isDominatedByLongLines: env.isDominatedByLongLines,
			isWordWrapMinified: layoutInfo.isWordWrapMinified,
			isViewportWrapping: layoutInfo.isViewportWrapping,
			wrappingColumn: layoutInfo.wrappingColumn,
		};
	}
}

//#endregion

const DEFAULT_WINDOWS_FONT_FAMILY = 'Consolas, \'Courier New\', monospace';
const DEFAULT_MAC_FONT_FAMILY = 'Menlo, Monaco, \'Courier New\', monospace';
const DEFAULT_LINUX_FONT_FAMILY = '\'Droid Sans Mono\', \'monospace\', monospace, \'Droid Sans FallBack\'';

/**
 * @internal
 */
export const EDITOR_FONT_DEFAULTS = {
	fontFamily: (
		platform.isMacintosh ? DEFAULT_MAC_FONT_FAMILY : (platform.isLinux ? DEFAULT_LINUX_FONT_FAMILY : DEFAULT_WINDOWS_FONT_FAMILY)
	),
	fontWeight: 'normal',
	fontSize: (
		platform.isMacintosh ? 12 : 14
	),
	lineHeight: 0,
	letterSpacing: 0,
};

/**
 * @internal
 */
export const EDITOR_MODEL_DEFAULTS = {
	taBSize: 4,
	indentSize: 4,
	insertSpaces: true,
	detectIndentation: true,
	trimAutoWhitespace: true,
	largeFileOptimizations: true
};

/**
 * @internal
 */
export const editorOptionsRegistry: IEditorOption<EditorOption, any>[] = [];

function register<K1 extends EditorOption, V>(option: IEditorOption<K1, V>): IEditorOption<K1, V> {
	editorOptionsRegistry[option.id] = option;
	return option;
}

export const enum EditorOption {
	acceptSuggestionOnCommitCharacter,
	acceptSuggestionOnEnter,
	accessiBilitySupport,
	accessiBilityPageSize,
	ariaLaBel,
	autoClosingBrackets,
	autoClosingOvertype,
	autoClosingQuotes,
	autoIndent,
	automaticLayout,
	autoSurround,
	codeLens,
	colorDecorators,
	columnSelection,
	comments,
	contextmenu,
	copyWithSyntaxHighlighting,
	cursorBlinking,
	cursorSmoothCaretAnimation,
	cursorStyle,
	cursorSurroundingLines,
	cursorSurroundingLinesStyle,
	cursorWidth,
	disaBleLayerHinting,
	disaBleMonospaceOptimizations,
	dragAndDrop,
	emptySelectionClipBoard,
	extraEditorClassName,
	fastScrollSensitivity,
	find,
	fixedOverflowWidgets,
	folding,
	foldingStrategy,
	foldingHighlight,
	unfoldOnClickAfterEndOfLine,
	fontFamily,
	fontInfo,
	fontLigatures,
	fontSize,
	fontWeight,
	formatOnPaste,
	formatOnType,
	glyphMargin,
	gotoLocation,
	hideCursorInOverviewRuler,
	highlightActiveIndentGuide,
	hover,
	inDiffEditor,
	letterSpacing,
	lightBulB,
	lineDecorationsWidth,
	lineHeight,
	lineNumBers,
	lineNumBersMinChars,
	links,
	matchBrackets,
	minimap,
	mouseStyle,
	mouseWheelScrollSensitivity,
	mouseWheelZoom,
	multiCursorMergeOverlapping,
	multiCursorModifier,
	multiCursorPaste,
	occurrencesHighlight,
	overviewRulerBorder,
	overviewRulerLanes,
	padding,
	parameterHints,
	peekWidgetDefaultFocus,
	definitionLinkOpensInPeek,
	quickSuggestions,
	quickSuggestionsDelay,
	readOnly,
	renameOnType,
	renderControlCharacters,
	renderIndentGuides,
	renderFinalNewline,
	renderLineHighlight,
	renderLineHighlightOnlyWhenFocus,
	renderValidationDecorations,
	renderWhitespace,
	revealHorizontalRightPadding,
	roundedSelection,
	rulers,
	scrollBar,
	scrollBeyondLastColumn,
	scrollBeyondLastLine,
	scrollPredominantAxis,
	selectionClipBoard,
	selectionHighlight,
	selectOnLineNumBers,
	showFoldingControls,
	showUnused,
	snippetSuggestions,
	smoothScrolling,
	stopRenderingLineAfter,
	suggest,
	suggestFontSize,
	suggestLineHeight,
	suggestOnTriggerCharacters,
	suggestSelection,
	taBCompletion,
	taBIndex,
	unusualLineTerminators,
	useTaBStops,
	wordSeparators,
	wordWrap,
	wordWrapBreakAfterCharacters,
	wordWrapBreakBeforeCharacters,
	wordWrapColumn,
	wordWrapMinified,
	wrappingIndent,
	wrappingStrategy,
	showDeprecated,

	// Leave these at the end (Because they have dependencies!)
	editorClassName,
	pixelRatio,
	taBFocusMode,
	layoutInfo,
	wrappingInfo,
}

/**
 * WORKAROUND: TS emits "any" for complex editor options values (anything except string, Bool, enum, etc. ends up Being "any")
 * @monacodtsreplace
 * /accessiBilitySupport, any/accessiBilitySupport, AccessiBilitySupport/
 * /comments, any/comments, EditorCommentsOptions/
 * /find, any/find, EditorFindOptions/
 * /fontInfo, any/fontInfo, FontInfo/
 * /gotoLocation, any/gotoLocation, GoToLocationOptions/
 * /hover, any/hover, EditorHoverOptions/
 * /lightBulB, any/lightBulB, EditorLightBulBOptions/
 * /minimap, any/minimap, EditorMinimapOptions/
 * /parameterHints, any/parameterHints, InternalParameterHintOptions/
 * /quickSuggestions, any/quickSuggestions, ValidQuickSuggestionsOptions/
 * /suggest, any/suggest, InternalSuggestOptions/
 */
export const EditorOptions = {
	acceptSuggestionOnCommitCharacter: register(new EditorBooleanOption(
		EditorOption.acceptSuggestionOnCommitCharacter, 'acceptSuggestionOnCommitCharacter', true,
		{ markdownDescription: nls.localize('acceptSuggestionOnCommitCharacter', "Controls whether suggestions should Be accepted on commit characters. For example, in JavaScript, the semi-colon (`;`) can Be a commit character that accepts a suggestion and types that character.") }
	)),
	acceptSuggestionOnEnter: register(new EditorStringEnumOption(
		EditorOption.acceptSuggestionOnEnter, 'acceptSuggestionOnEnter',
		'on' as 'on' | 'smart' | 'off',
		['on', 'smart', 'off'] as const,
		{
			markdownEnumDescriptions: [
				'',
				nls.localize('acceptSuggestionOnEnterSmart', "Only accept a suggestion with `Enter` when it makes a textual change."),
				''
			],
			markdownDescription: nls.localize('acceptSuggestionOnEnter', "Controls whether suggestions should Be accepted on `Enter`, in addition to `TaB`. Helps to avoid amBiguity Between inserting new lines or accepting suggestions.")
		}
	)),
	accessiBilitySupport: register(new EditorAccessiBilitySupport()),
	accessiBilityPageSize: register(new EditorIntOption(EditorOption.accessiBilityPageSize, 'accessiBilityPageSize', 10, 1, Constants.MAX_SAFE_SMALL_INTEGER,
		{ description: nls.localize('accessiBilityPageSize', "Controls the numBer of lines in the editor that can Be read out By a screen reader. Warning: this has a performance implication for numBers larger than the default.") })),
	ariaLaBel: register(new EditorStringOption(
		EditorOption.ariaLaBel, 'ariaLaBel', nls.localize('editorViewAccessiBleLaBel', "Editor content")
	)),
	autoClosingBrackets: register(new EditorStringEnumOption(
		EditorOption.autoClosingBrackets, 'autoClosingBrackets',
		'languageDefined' as 'always' | 'languageDefined' | 'BeforeWhitespace' | 'never',
		['always', 'languageDefined', 'BeforeWhitespace', 'never'] as const,
		{
			enumDescriptions: [
				'',
				nls.localize('editor.autoClosingBrackets.languageDefined', "Use language configurations to determine when to autoclose Brackets."),
				nls.localize('editor.autoClosingBrackets.BeforeWhitespace', "Autoclose Brackets only when the cursor is to the left of whitespace."),
				'',
			],
			description: nls.localize('autoClosingBrackets', "Controls whether the editor should automatically close Brackets after the user adds an opening Bracket.")
		}
	)),
	autoClosingOvertype: register(new EditorStringEnumOption(
		EditorOption.autoClosingOvertype, 'autoClosingOvertype',
		'auto' as 'always' | 'auto' | 'never',
		['always', 'auto', 'never'] as const,
		{
			enumDescriptions: [
				'',
				nls.localize('editor.autoClosingOvertype.auto', "Type over closing quotes or Brackets only if they were automatically inserted."),
				'',
			],
			description: nls.localize('autoClosingOvertype', "Controls whether the editor should type over closing quotes or Brackets.")
		}
	)),
	autoClosingQuotes: register(new EditorStringEnumOption(
		EditorOption.autoClosingQuotes, 'autoClosingQuotes',
		'languageDefined' as 'always' | 'languageDefined' | 'BeforeWhitespace' | 'never',
		['always', 'languageDefined', 'BeforeWhitespace', 'never'] as const,
		{
			enumDescriptions: [
				'',
				nls.localize('editor.autoClosingQuotes.languageDefined', "Use language configurations to determine when to autoclose quotes."),
				nls.localize('editor.autoClosingQuotes.BeforeWhitespace', "Autoclose quotes only when the cursor is to the left of whitespace."),
				'',
			],
			description: nls.localize('autoClosingQuotes', "Controls whether the editor should automatically close quotes after the user adds an opening quote.")
		}
	)),
	autoIndent: register(new EditorEnumOption(
		EditorOption.autoIndent, 'autoIndent',
		EditorAutoIndentStrategy.Full, 'full',
		['none', 'keep', 'Brackets', 'advanced', 'full'],
		_autoIndentFromString,
		{
			enumDescriptions: [
				nls.localize('editor.autoIndent.none', "The editor will not insert indentation automatically."),
				nls.localize('editor.autoIndent.keep', "The editor will keep the current line's indentation."),
				nls.localize('editor.autoIndent.Brackets', "The editor will keep the current line's indentation and honor language defined Brackets."),
				nls.localize('editor.autoIndent.advanced', "The editor will keep the current line's indentation, honor language defined Brackets and invoke special onEnterRules defined By languages."),
				nls.localize('editor.autoIndent.full', "The editor will keep the current line's indentation, honor language defined Brackets, invoke special onEnterRules defined By languages, and honor indentationRules defined By languages."),
			],
			description: nls.localize('autoIndent', "Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.")
		}
	)),
	automaticLayout: register(new EditorBooleanOption(
		EditorOption.automaticLayout, 'automaticLayout', false,
	)),
	autoSurround: register(new EditorStringEnumOption(
		EditorOption.autoSurround, 'autoSurround',
		'languageDefined' as 'languageDefined' | 'quotes' | 'Brackets' | 'never',
		['languageDefined', 'quotes', 'Brackets', 'never'] as const,
		{
			enumDescriptions: [
				nls.localize('editor.autoSurround.languageDefined', "Use language configurations to determine when to automatically surround selections."),
				nls.localize('editor.autoSurround.quotes', "Surround with quotes But not Brackets."),
				nls.localize('editor.autoSurround.Brackets', "Surround with Brackets But not quotes."),
				''
			],
			description: nls.localize('autoSurround', "Controls whether the editor should automatically surround selections when typing quotes or Brackets.")
		}
	)),
	codeLens: register(new EditorBooleanOption(
		EditorOption.codeLens, 'codeLens', true,
		{ description: nls.localize('codeLens', "Controls whether the editor shows CodeLens.") }
	)),
	colorDecorators: register(new EditorBooleanOption(
		EditorOption.colorDecorators, 'colorDecorators', true,
		{ description: nls.localize('colorDecorators', "Controls whether the editor should render the inline color decorators and color picker.") }
	)),
	columnSelection: register(new EditorBooleanOption(
		EditorOption.columnSelection, 'columnSelection', false,
		{ description: nls.localize('columnSelection', "EnaBle that the selection with the mouse and keys is doing column selection.") }
	)),
	comments: register(new EditorComments()),
	contextmenu: register(new EditorBooleanOption(
		EditorOption.contextmenu, 'contextmenu', true,
	)),
	copyWithSyntaxHighlighting: register(new EditorBooleanOption(
		EditorOption.copyWithSyntaxHighlighting, 'copyWithSyntaxHighlighting', true,
		{ description: nls.localize('copyWithSyntaxHighlighting', "Controls whether syntax highlighting should Be copied into the clipBoard.") }
	)),
	cursorBlinking: register(new EditorEnumOption(
		EditorOption.cursorBlinking, 'cursorBlinking',
		TextEditorCursorBlinkingStyle.Blink, 'Blink',
		['Blink', 'smooth', 'phase', 'expand', 'solid'],
		_cursorBlinkingStyleFromString,
		{ description: nls.localize('cursorBlinking', "Control the cursor animation style.") }
	)),
	cursorSmoothCaretAnimation: register(new EditorBooleanOption(
		EditorOption.cursorSmoothCaretAnimation, 'cursorSmoothCaretAnimation', false,
		{ description: nls.localize('cursorSmoothCaretAnimation', "Controls whether the smooth caret animation should Be enaBled.") }
	)),
	cursorStyle: register(new EditorEnumOption(
		EditorOption.cursorStyle, 'cursorStyle',
		TextEditorCursorStyle.Line, 'line',
		['line', 'Block', 'underline', 'line-thin', 'Block-outline', 'underline-thin'],
		_cursorStyleFromString,
		{ description: nls.localize('cursorStyle', "Controls the cursor style.") }
	)),
	cursorSurroundingLines: register(new EditorIntOption(
		EditorOption.cursorSurroundingLines, 'cursorSurroundingLines',
		0, 0, Constants.MAX_SAFE_SMALL_INTEGER,
		{ description: nls.localize('cursorSurroundingLines', "Controls the minimal numBer of visiBle leading and trailing lines surrounding the cursor. Known as 'scrollOff' or 'scrollOffset' in some other editors.") }
	)),
	cursorSurroundingLinesStyle: register(new EditorStringEnumOption(
		EditorOption.cursorSurroundingLinesStyle, 'cursorSurroundingLinesStyle',
		'default' as 'default' | 'all',
		['default', 'all'] as const,
		{
			enumDescriptions: [
				nls.localize('cursorSurroundingLinesStyle.default', "`cursorSurroundingLines` is enforced only when triggered via the keyBoard or API."),
				nls.localize('cursorSurroundingLinesStyle.all', "`cursorSurroundingLines` is enforced always.")
			],
			description: nls.localize('cursorSurroundingLinesStyle', "Controls when `cursorSurroundingLines` should Be enforced.")
		}
	)),
	cursorWidth: register(new EditorIntOption(
		EditorOption.cursorWidth, 'cursorWidth',
		0, 0, Constants.MAX_SAFE_SMALL_INTEGER,
		{ markdownDescription: nls.localize('cursorWidth', "Controls the width of the cursor when `#editor.cursorStyle#` is set to `line`.") }
	)),
	disaBleLayerHinting: register(new EditorBooleanOption(
		EditorOption.disaBleLayerHinting, 'disaBleLayerHinting', false,
	)),
	disaBleMonospaceOptimizations: register(new EditorBooleanOption(
		EditorOption.disaBleMonospaceOptimizations, 'disaBleMonospaceOptimizations', false
	)),
	dragAndDrop: register(new EditorBooleanOption(
		EditorOption.dragAndDrop, 'dragAndDrop', true,
		{ description: nls.localize('dragAndDrop', "Controls whether the editor should allow moving selections via drag and drop.") }
	)),
	emptySelectionClipBoard: register(new EditorEmptySelectionClipBoard()),
	extraEditorClassName: register(new EditorStringOption(
		EditorOption.extraEditorClassName, 'extraEditorClassName', '',
	)),
	fastScrollSensitivity: register(new EditorFloatOption(
		EditorOption.fastScrollSensitivity, 'fastScrollSensitivity',
		5, x => (x <= 0 ? 5 : x),
		{ markdownDescription: nls.localize('fastScrollSensitivity', "Scrolling speed multiplier when pressing `Alt`.") }
	)),
	find: register(new EditorFind()),
	fixedOverflowWidgets: register(new EditorBooleanOption(
		EditorOption.fixedOverflowWidgets, 'fixedOverflowWidgets', false,
	)),
	folding: register(new EditorBooleanOption(
		EditorOption.folding, 'folding', true,
		{ description: nls.localize('folding', "Controls whether the editor has code folding enaBled.") }
	)),
	foldingStrategy: register(new EditorStringEnumOption(
		EditorOption.foldingStrategy, 'foldingStrategy',
		'auto' as 'auto' | 'indentation',
		['auto', 'indentation'] as const,
		{
			enumDescriptions: [
				nls.localize('foldingStrategy.auto', "Use a language-specific folding strategy if availaBle, else the indentation-Based one."),
				nls.localize('foldingStrategy.indentation', "Use the indentation-Based folding strategy."),
			],
			description: nls.localize('foldingStrategy', "Controls the strategy for computing folding ranges.")
		}
	)),
	foldingHighlight: register(new EditorBooleanOption(
		EditorOption.foldingHighlight, 'foldingHighlight', true,
		{ description: nls.localize('foldingHighlight', "Controls whether the editor should highlight folded ranges.") }
	)),
	unfoldOnClickAfterEndOfLine: register(new EditorBooleanOption(
		EditorOption.unfoldOnClickAfterEndOfLine, 'unfoldOnClickAfterEndOfLine', false,
		{ description: nls.localize('unfoldOnClickAfterEndOfLine', "Controls whether clicking on the empty content after a folded line will unfold the line.") }
	)),
	fontFamily: register(new EditorStringOption(
		EditorOption.fontFamily, 'fontFamily', EDITOR_FONT_DEFAULTS.fontFamily,
		{ description: nls.localize('fontFamily', "Controls the font family.") }
	)),
	fontInfo: register(new EditorFontInfo()),
	fontLigatures2: register(new EditorFontLigatures()),
	fontSize: register(new EditorFontSize()),
	fontWeight: register(new EditorFontWeight()),
	formatOnPaste: register(new EditorBooleanOption(
		EditorOption.formatOnPaste, 'formatOnPaste', false,
		{ description: nls.localize('formatOnPaste', "Controls whether the editor should automatically format the pasted content. A formatter must Be availaBle and the formatter should Be aBle to format a range in a document.") }
	)),
	formatOnType: register(new EditorBooleanOption(
		EditorOption.formatOnType, 'formatOnType', false,
		{ description: nls.localize('formatOnType', "Controls whether the editor should automatically format the line after typing.") }
	)),
	glyphMargin: register(new EditorBooleanOption(
		EditorOption.glyphMargin, 'glyphMargin', true,
		{ description: nls.localize('glyphMargin', "Controls whether the editor should render the vertical glyph margin. Glyph margin is mostly used for deBugging.") }
	)),
	gotoLocation: register(new EditorGoToLocation()),
	hideCursorInOverviewRuler: register(new EditorBooleanOption(
		EditorOption.hideCursorInOverviewRuler, 'hideCursorInOverviewRuler', false,
		{ description: nls.localize('hideCursorInOverviewRuler', "Controls whether the cursor should Be hidden in the overview ruler.") }
	)),
	highlightActiveIndentGuide: register(new EditorBooleanOption(
		EditorOption.highlightActiveIndentGuide, 'highlightActiveIndentGuide', true,
		{ description: nls.localize('highlightActiveIndentGuide', "Controls whether the editor should highlight the active indent guide.") }
	)),
	hover: register(new EditorHover()),
	inDiffEditor: register(new EditorBooleanOption(
		EditorOption.inDiffEditor, 'inDiffEditor', false,
	)),
	letterSpacing: register(new EditorFloatOption(
		EditorOption.letterSpacing, 'letterSpacing',
		EDITOR_FONT_DEFAULTS.letterSpacing, x => EditorFloatOption.clamp(x, -5, 20),
		{ description: nls.localize('letterSpacing', "Controls the letter spacing in pixels.") }
	)),
	lightBulB: register(new EditorLightBulB()),
	lineDecorationsWidth: register(new SimpleEditorOption(EditorOption.lineDecorationsWidth, 'lineDecorationsWidth', 10 as numBer | string)),
	lineHeight: register(new EditorLineHeight()),
	lineNumBers: register(new EditorRenderLineNumBersOption()),
	lineNumBersMinChars: register(new EditorIntOption(
		EditorOption.lineNumBersMinChars, 'lineNumBersMinChars',
		5, 1, 300
	)),
	links: register(new EditorBooleanOption(
		EditorOption.links, 'links', true,
		{ description: nls.localize('links', "Controls whether the editor should detect links and make them clickaBle.") }
	)),
	matchBrackets: register(new EditorStringEnumOption(
		EditorOption.matchBrackets, 'matchBrackets',
		'always' as 'never' | 'near' | 'always',
		['always', 'near', 'never'] as const,
		{ description: nls.localize('matchBrackets', "Highlight matching Brackets.") }
	)),
	minimap: register(new EditorMinimap()),
	mouseStyle: register(new EditorStringEnumOption(
		EditorOption.mouseStyle, 'mouseStyle',
		'text' as 'text' | 'default' | 'copy',
		['text', 'default', 'copy'] as const,
	)),
	mouseWheelScrollSensitivity: register(new EditorFloatOption(
		EditorOption.mouseWheelScrollSensitivity, 'mouseWheelScrollSensitivity',
		1, x => (x === 0 ? 1 : x),
		{ markdownDescription: nls.localize('mouseWheelScrollSensitivity', "A multiplier to Be used on the `deltaX` and `deltaY` of mouse wheel scroll events.") }
	)),
	mouseWheelZoom: register(new EditorBooleanOption(
		EditorOption.mouseWheelZoom, 'mouseWheelZoom', false,
		{ markdownDescription: nls.localize('mouseWheelZoom', "Zoom the font of the editor when using mouse wheel and holding `Ctrl`.") }
	)),
	multiCursorMergeOverlapping: register(new EditorBooleanOption(
		EditorOption.multiCursorMergeOverlapping, 'multiCursorMergeOverlapping', true,
		{ description: nls.localize('multiCursorMergeOverlapping', "Merge multiple cursors when they are overlapping.") }
	)),
	multiCursorModifier: register(new EditorEnumOption(
		EditorOption.multiCursorModifier, 'multiCursorModifier',
		'altKey', 'alt',
		['ctrlCmd', 'alt'],
		_multiCursorModifierFromString,
		{
			markdownEnumDescriptions: [
				nls.localize('multiCursorModifier.ctrlCmd', "Maps to `Control` on Windows and Linux and to `Command` on macOS."),
				nls.localize('multiCursorModifier.alt', "Maps to `Alt` on Windows and Linux and to `Option` on macOS.")
			],
			markdownDescription: nls.localize({
				key: 'multiCursorModifier',
				comment: [
					'- `ctrlCmd` refers to a value the setting can take and should not Be localized.',
					'- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyBoard and can Be localized.'
				]
			}, "The modifier to Be used to add multiple cursors with the mouse. The Go To Definition and Open Link mouse gestures will adapt such that they do not conflict with the multicursor modifier. [Read more](https://code.visualstudio.com/docs/editor/codeBasics#_multicursor-modifier).")
		}
	)),
	multiCursorPaste: register(new EditorStringEnumOption(
		EditorOption.multiCursorPaste, 'multiCursorPaste',
		'spread' as 'spread' | 'full',
		['spread', 'full'] as const,
		{
			markdownEnumDescriptions: [
				nls.localize('multiCursorPaste.spread', "Each cursor pastes a single line of the text."),
				nls.localize('multiCursorPaste.full', "Each cursor pastes the full text.")
			],
			markdownDescription: nls.localize('multiCursorPaste', "Controls pasting when the line count of the pasted text matches the cursor count.")
		}
	)),
	occurrencesHighlight: register(new EditorBooleanOption(
		EditorOption.occurrencesHighlight, 'occurrencesHighlight', true,
		{ description: nls.localize('occurrencesHighlight', "Controls whether the editor should highlight semantic symBol occurrences.") }
	)),
	overviewRulerBorder: register(new EditorBooleanOption(
		EditorOption.overviewRulerBorder, 'overviewRulerBorder', true,
		{ description: nls.localize('overviewRulerBorder', "Controls whether a Border should Be drawn around the overview ruler.") }
	)),
	overviewRulerLanes: register(new EditorIntOption(
		EditorOption.overviewRulerLanes, 'overviewRulerLanes',
		3, 0, 3
	)),
	padding: register(new EditorPadding()),
	parameterHints: register(new EditorParameterHints()),
	peekWidgetDefaultFocus: register(new EditorStringEnumOption(
		EditorOption.peekWidgetDefaultFocus, 'peekWidgetDefaultFocus',
		'tree' as 'tree' | 'editor',
		['tree', 'editor'] as const,
		{
			enumDescriptions: [
				nls.localize('peekWidgetDefaultFocus.tree', "Focus the tree when opening peek"),
				nls.localize('peekWidgetDefaultFocus.editor', "Focus the editor when opening peek")
			],
			description: nls.localize('peekWidgetDefaultFocus', "Controls whether to focus the inline editor or the tree in the peek widget.")
		}
	)),
	definitionLinkOpensInPeek: register(new EditorBooleanOption(
		EditorOption.definitionLinkOpensInPeek, 'definitionLinkOpensInPeek', false,
		{ description: nls.localize('definitionLinkOpensInPeek', "Controls whether the Go to Definition mouse gesture always opens the peek widget.") }
	)),
	quickSuggestions: register(new EditorQuickSuggestions()),
	quickSuggestionsDelay: register(new EditorIntOption(
		EditorOption.quickSuggestionsDelay, 'quickSuggestionsDelay',
		10, 0, Constants.MAX_SAFE_SMALL_INTEGER,
		{ description: nls.localize('quickSuggestionsDelay', "Controls the delay in milliseconds after which quick suggestions will show up.") }
	)),
	readOnly: register(new EditorBooleanOption(
		EditorOption.readOnly, 'readOnly', false,
	)),
	renameOnType: register(new EditorBooleanOption(
		EditorOption.renameOnType, 'renameOnType', false,
		{ description: nls.localize('renameOnType', "Controls whether the editor auto renames on type.") }
	)),
	renderControlCharacters: register(new EditorBooleanOption(
		EditorOption.renderControlCharacters, 'renderControlCharacters', false,
		{ description: nls.localize('renderControlCharacters', "Controls whether the editor should render control characters.") }
	)),
	renderIndentGuides: register(new EditorBooleanOption(
		EditorOption.renderIndentGuides, 'renderIndentGuides', true,
		{ description: nls.localize('renderIndentGuides', "Controls whether the editor should render indent guides.") }
	)),
	renderFinalNewline: register(new EditorBooleanOption(
		EditorOption.renderFinalNewline, 'renderFinalNewline', true,
		{ description: nls.localize('renderFinalNewline', "Render last line numBer when the file ends with a newline.") }
	)),
	renderLineHighlight: register(new EditorStringEnumOption(
		EditorOption.renderLineHighlight, 'renderLineHighlight',
		'line' as 'none' | 'gutter' | 'line' | 'all',
		['none', 'gutter', 'line', 'all'] as const,
		{
			enumDescriptions: [
				'',
				'',
				'',
				nls.localize('renderLineHighlight.all', "Highlights Both the gutter and the current line."),
			],
			description: nls.localize('renderLineHighlight', "Controls how the editor should render the current line highlight.")
		}
	)),
	renderLineHighlightOnlyWhenFocus: register(new EditorBooleanOption(
		EditorOption.renderLineHighlightOnlyWhenFocus, 'renderLineHighlightOnlyWhenFocus', false,
		{ description: nls.localize('renderLineHighlightOnlyWhenFocus', "Controls if the editor should render the current line highlight only when the editor is focused") }
	)),
	renderValidationDecorations: register(new EditorStringEnumOption(
		EditorOption.renderValidationDecorations, 'renderValidationDecorations',
		'editaBle' as 'editaBle' | 'on' | 'off',
		['editaBle', 'on', 'off'] as const
	)),
	renderWhitespace: register(new EditorStringEnumOption(
		EditorOption.renderWhitespace, 'renderWhitespace',
		'selection' as 'selection' | 'none' | 'Boundary' | 'trailing' | 'all',
		['none', 'Boundary', 'selection', 'trailing', 'all'] as const,
		{
			enumDescriptions: [
				'',
				nls.localize('renderWhitespace.Boundary', "Render whitespace characters except for single spaces Between words."),
				nls.localize('renderWhitespace.selection', "Render whitespace characters only on selected text."),
				nls.localize('renderWhitespace.trailing', "Render only trailing whitespace characters"),
				''
			],
			description: nls.localize('renderWhitespace', "Controls how the editor should render whitespace characters.")
		}
	)),
	revealHorizontalRightPadding: register(new EditorIntOption(
		EditorOption.revealHorizontalRightPadding, 'revealHorizontalRightPadding',
		30, 0, 1000,
	)),
	roundedSelection: register(new EditorBooleanOption(
		EditorOption.roundedSelection, 'roundedSelection', true,
		{ description: nls.localize('roundedSelection', "Controls whether selections should have rounded corners.") }
	)),
	rulers: register(new EditorRulers()),
	scrollBar: register(new EditorScrollBar()),
	scrollBeyondLastColumn: register(new EditorIntOption(
		EditorOption.scrollBeyondLastColumn, 'scrollBeyondLastColumn',
		5, 0, Constants.MAX_SAFE_SMALL_INTEGER,
		{ description: nls.localize('scrollBeyondLastColumn', "Controls the numBer of extra characters Beyond which the editor will scroll horizontally.") }
	)),
	scrollBeyondLastLine: register(new EditorBooleanOption(
		EditorOption.scrollBeyondLastLine, 'scrollBeyondLastLine', true,
		{ description: nls.localize('scrollBeyondLastLine', "Controls whether the editor will scroll Beyond the last line.") }
	)),
	scrollPredominantAxis: register(new EditorBooleanOption(
		EditorOption.scrollPredominantAxis, 'scrollPredominantAxis', true,
		{ description: nls.localize('scrollPredominantAxis', "Scroll only along the predominant axis when scrolling Both vertically and horizontally at the same time. Prevents horizontal drift when scrolling vertically on a trackpad.") }
	)),
	selectionClipBoard: register(new EditorBooleanOption(
		EditorOption.selectionClipBoard, 'selectionClipBoard', true,
		{
			description: nls.localize('selectionClipBoard', "Controls whether the Linux primary clipBoard should Be supported."),
			included: platform.isLinux
		}
	)),
	selectionHighlight: register(new EditorBooleanOption(
		EditorOption.selectionHighlight, 'selectionHighlight', true,
		{ description: nls.localize('selectionHighlight', "Controls whether the editor should highlight matches similar to the selection.") }
	)),
	selectOnLineNumBers: register(new EditorBooleanOption(
		EditorOption.selectOnLineNumBers, 'selectOnLineNumBers', true,
	)),
	showFoldingControls: register(new EditorStringEnumOption(
		EditorOption.showFoldingControls, 'showFoldingControls',
		'mouseover' as 'always' | 'mouseover',
		['always', 'mouseover'] as const,
		{
			enumDescriptions: [
				nls.localize('showFoldingControls.always', "Always show the folding controls."),
				nls.localize('showFoldingControls.mouseover', "Only show the folding controls when the mouse is over the gutter."),
			],
			description: nls.localize('showFoldingControls', "Controls when the folding controls on the gutter are shown.")
		}
	)),
	showUnused: register(new EditorBooleanOption(
		EditorOption.showUnused, 'showUnused', true,
		{ description: nls.localize('showUnused', "Controls fading out of unused code.") }
	)),
	showDeprecated: register(new EditorBooleanOption(
		EditorOption.showDeprecated, 'showDeprecated', true,
		{ description: nls.localize('showDeprecated', "Controls strikethrough deprecated variaBles.") }
	)),
	snippetSuggestions: register(new EditorStringEnumOption(
		EditorOption.snippetSuggestions, 'snippetSuggestions',
		'inline' as 'top' | 'Bottom' | 'inline' | 'none',
		['top', 'Bottom', 'inline', 'none'] as const,
		{
			enumDescriptions: [
				nls.localize('snippetSuggestions.top', "Show snippet suggestions on top of other suggestions."),
				nls.localize('snippetSuggestions.Bottom', "Show snippet suggestions Below other suggestions."),
				nls.localize('snippetSuggestions.inline', "Show snippets suggestions with other suggestions."),
				nls.localize('snippetSuggestions.none', "Do not show snippet suggestions."),
			],
			description: nls.localize('snippetSuggestions', "Controls whether snippets are shown with other suggestions and how they are sorted.")
		}
	)),
	smoothScrolling: register(new EditorBooleanOption(
		EditorOption.smoothScrolling, 'smoothScrolling', false,
		{ description: nls.localize('smoothScrolling', "Controls whether the editor will scroll using an animation.") }
	)),
	stopRenderingLineAfter: register(new EditorIntOption(
		EditorOption.stopRenderingLineAfter, 'stopRenderingLineAfter',
		10000, -1, Constants.MAX_SAFE_SMALL_INTEGER,
	)),
	suggest: register(new EditorSuggest()),
	suggestFontSize: register(new EditorIntOption(
		EditorOption.suggestFontSize, 'suggestFontSize',
		0, 0, 1000,
		{ markdownDescription: nls.localize('suggestFontSize', "Font size for the suggest widget. When set to `0`, the value of `#editor.fontSize#` is used.") }
	)),
	suggestLineHeight: register(new EditorIntOption(
		EditorOption.suggestLineHeight, 'suggestLineHeight',
		0, 0, 1000,
		{ markdownDescription: nls.localize('suggestLineHeight', "Line height for the suggest widget. When set to `0`, the value of `#editor.lineHeight#` is used.") }
	)),
	suggestOnTriggerCharacters: register(new EditorBooleanOption(
		EditorOption.suggestOnTriggerCharacters, 'suggestOnTriggerCharacters', true,
		{ description: nls.localize('suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters.") }
	)),
	suggestSelection: register(new EditorStringEnumOption(
		EditorOption.suggestSelection, 'suggestSelection',
		'recentlyUsed' as 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix',
		['first', 'recentlyUsed', 'recentlyUsedByPrefix'] as const,
		{
			markdownEnumDescriptions: [
				nls.localize('suggestSelection.first', "Always select the first suggestion."),
				nls.localize('suggestSelection.recentlyUsed', "Select recent suggestions unless further typing selects one, e.g. `console.| -> console.log` Because `log` has Been completed recently."),
				nls.localize('suggestSelection.recentlyUsedByPrefix', "Select suggestions Based on previous prefixes that have completed those suggestions, e.g. `co -> console` and `con -> const`."),
			],
			description: nls.localize('suggestSelection', "Controls how suggestions are pre-selected when showing the suggest list.")
		}
	)),
	taBCompletion: register(new EditorStringEnumOption(
		EditorOption.taBCompletion, 'taBCompletion',
		'off' as 'on' | 'off' | 'onlySnippets',
		['on', 'off', 'onlySnippets'] as const,
		{
			enumDescriptions: [
				nls.localize('taBCompletion.on', "TaB complete will insert the Best matching suggestion when pressing taB."),
				nls.localize('taBCompletion.off', "DisaBle taB completions."),
				nls.localize('taBCompletion.onlySnippets', "TaB complete snippets when their prefix match. Works Best when 'quickSuggestions' aren't enaBled."),
			],
			description: nls.localize('taBCompletion', "EnaBles taB completions.")
		}
	)),
	taBIndex: register(new EditorIntOption(
		EditorOption.taBIndex, 'taBIndex',
		0, -1, Constants.MAX_SAFE_SMALL_INTEGER
	)),
	unusualLineTerminators: register(new EditorStringEnumOption(
		EditorOption.unusualLineTerminators, 'unusualLineTerminators',
		'prompt' as 'auto' | 'off' | 'prompt',
		['auto', 'off', 'prompt'] as const,
		{
			enumDescriptions: [
				nls.localize('unusualLineTerminators.off', "Unusual line terminators are ignored."),
				nls.localize('unusualLineTerminators.prompt', "Unusual line terminators prompt to Be removed."),
				nls.localize('unusualLineTerminators.auto', "Unusual line terminators are automatically removed."),
			],
			description: nls.localize('unusualLineTerminators', "Remove unusual line terminators that might cause proBlems.")
		}
	)),
	useTaBStops: register(new EditorBooleanOption(
		EditorOption.useTaBStops, 'useTaBStops', true,
		{ description: nls.localize('useTaBStops', "Inserting and deleting whitespace follows taB stops.") }
	)),
	wordSeparators: register(new EditorStringOption(
		EditorOption.wordSeparators, 'wordSeparators', USUAL_WORD_SEPARATORS,
		{ description: nls.localize('wordSeparators', "Characters that will Be used as word separators when doing word related navigations or operations.") }
	)),
	wordWrap: register(new EditorStringEnumOption(
		EditorOption.wordWrap, 'wordWrap',
		'off' as 'off' | 'on' | 'wordWrapColumn' | 'Bounded',
		['off', 'on', 'wordWrapColumn', 'Bounded'] as const,
		{
			markdownEnumDescriptions: [
				nls.localize('wordWrap.off', "Lines will never wrap."),
				nls.localize('wordWrap.on', "Lines will wrap at the viewport width."),
				nls.localize({
					key: 'wordWrap.wordWrapColumn',
					comment: [
						'- `editor.wordWrapColumn` refers to a different setting and should not Be localized.'
					]
				}, "Lines will wrap at `#editor.wordWrapColumn#`."),
				nls.localize({
					key: 'wordWrap.Bounded',
					comment: [
						'- viewport means the edge of the visiBle window size.',
						'- `editor.wordWrapColumn` refers to a different setting and should not Be localized.'
					]
				}, "Lines will wrap at the minimum of viewport and `#editor.wordWrapColumn#`."),
			],
			description: nls.localize({
				key: 'wordWrap',
				comment: [
					'- \'off\', \'on\', \'wordWrapColumn\' and \'Bounded\' refer to values the setting can take and should not Be localized.',
					'- `editor.wordWrapColumn` refers to a different setting and should not Be localized.'
				]
			}, "Controls how lines should wrap.")
		}
	)),
	wordWrapBreakAfterCharacters: register(new EditorStringOption(
		EditorOption.wordWrapBreakAfterCharacters, 'wordWrapBreakAfterCharacters',
		' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
	)),
	wordWrapBreakBeforeCharacters: register(new EditorStringOption(
		EditorOption.wordWrapBreakBeforeCharacters, 'wordWrapBreakBeforeCharacters',
		'([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋'
	)),
	wordWrapColumn: register(new EditorIntOption(
		EditorOption.wordWrapColumn, 'wordWrapColumn',
		80, 1, Constants.MAX_SAFE_SMALL_INTEGER,
		{
			markdownDescription: nls.localize({
				key: 'wordWrapColumn',
				comment: [
					'- `editor.wordWrap` refers to a different setting and should not Be localized.',
					'- \'wordWrapColumn\' and \'Bounded\' refer to values the different setting can take and should not Be localized.'
				]
			}, "Controls the wrapping column of the editor when `#editor.wordWrap#` is `wordWrapColumn` or `Bounded`.")
		}
	)),
	wordWrapMinified: register(new EditorBooleanOption(
		EditorOption.wordWrapMinified, 'wordWrapMinified', true,
	)),
	wrappingIndent: register(new EditorEnumOption(
		EditorOption.wrappingIndent, 'wrappingIndent',
		WrappingIndent.Same, 'same',
		['none', 'same', 'indent', 'deepIndent'],
		_wrappingIndentFromString,
		{
			enumDescriptions: [
				nls.localize('wrappingIndent.none', "No indentation. Wrapped lines Begin at column 1."),
				nls.localize('wrappingIndent.same', "Wrapped lines get the same indentation as the parent."),
				nls.localize('wrappingIndent.indent', "Wrapped lines get +1 indentation toward the parent."),
				nls.localize('wrappingIndent.deepIndent', "Wrapped lines get +2 indentation toward the parent."),
			],
			description: nls.localize('wrappingIndent', "Controls the indentation of wrapped lines."),
		}
	)),
	wrappingStrategy: register(new EditorStringEnumOption(
		EditorOption.wrappingStrategy, 'wrappingStrategy',
		'simple' as 'simple' | 'advanced',
		['simple', 'advanced'] as const,
		{
			enumDescriptions: [
				nls.localize('wrappingStrategy.simple', "Assumes that all characters are of the same width. This is a fast algorithm that works correctly for monospace fonts and certain scripts (like Latin characters) where glyphs are of equal width."),
				nls.localize('wrappingStrategy.advanced', "Delegates wrapping points computation to the Browser. This is a slow algorithm, that might cause freezes for large files, But it works correctly in all cases.")
			],
			description: nls.localize('wrappingStrategy', "Controls the algorithm that computes wrapping points.")
		}
	)),

	// Leave these at the end (Because they have dependencies!)
	editorClassName: register(new EditorClassName()),
	pixelRatio: register(new EditorPixelRatio()),
	taBFocusMode: register(new EditorTaBFocusMode()),
	layoutInfo: register(new EditorLayoutInfoComputer()),
	wrappingInfo: register(new EditorWrappingInfoComputer())
};

type EditorOptionsType = typeof EditorOptions;
type FindEditorOptionsKeyById<T extends EditorOption> = { [K in keyof EditorOptionsType]: EditorOptionsType[K]['id'] extends T ? K : never }[keyof EditorOptionsType];
type ComputedEditorOptionValue<T extends IEditorOption<any, any>> = T extends IEditorOption<any, infer R> ? R : never;
export type FindComputedEditorOptionValueById<T extends EditorOption> = NonNullaBle<ComputedEditorOptionValue<EditorOptionsType[FindEditorOptionsKeyById<T>]>>;
