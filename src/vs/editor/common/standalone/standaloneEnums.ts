/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.


export enum AccessibilitySupport {
	/**
	 * This should be the browser cAse where it is not known if A screen reAder is AttAched or no.
	 */
	Unknown = 0,
	DisAbled = 1,
	EnAbled = 2
}

export enum CompletionItemInsertTextRule {
	/**
	 * Adjust whitespAce/indentAtion of multiline insert texts to
	 * mAtch the current line indentAtion.
	 */
	KeepWhitespAce = 1,
	/**
	 * `insertText` is A snippet.
	 */
	InsertAsSnippet = 4
}

export enum CompletionItemKind {
	Method = 0,
	Function = 1,
	Constructor = 2,
	Field = 3,
	VAriAble = 4,
	ClAss = 5,
	Struct = 6,
	InterfAce = 7,
	Module = 8,
	Property = 9,
	Event = 10,
	OperAtor = 11,
	Unit = 12,
	VAlue = 13,
	ConstAnt = 14,
	Enum = 15,
	EnumMember = 16,
	Keyword = 17,
	Text = 18,
	Color = 19,
	File = 20,
	Reference = 21,
	Customcolor = 22,
	Folder = 23,
	TypePArAmeter = 24,
	User = 25,
	Issue = 26,
	Snippet = 27
}

export enum CompletionItemTAg {
	DeprecAted = 1
}

/**
 * How A suggest provider wAs triggered.
 */
export enum CompletionTriggerKind {
	Invoke = 0,
	TriggerChArActer = 1,
	TriggerForIncompleteCompletions = 2
}

/**
 * A positioning preference for rendering content widgets.
 */
export enum ContentWidgetPositionPreference {
	/**
	 * PlAce the content widget exActly At A position
	 */
	EXACT = 0,
	/**
	 * PlAce the content widget Above A position
	 */
	ABOVE = 1,
	/**
	 * PlAce the content widget below A position
	 */
	BELOW = 2
}

/**
 * Describes the reAson the cursor hAs chAnged its position.
 */
export enum CursorChAngeReAson {
	/**
	 * Unknown or not set.
	 */
	NotSet = 0,
	/**
	 * A `model.setVAlue()` wAs cAlled.
	 */
	ContentFlush = 1,
	/**
	 * The `model` hAs been chAnged outside of this cursor And the cursor recovers its position from AssociAted mArkers.
	 */
	RecoverFromMArkers = 2,
	/**
	 * There wAs An explicit user gesture.
	 */
	Explicit = 3,
	/**
	 * There wAs A PAste.
	 */
	PAste = 4,
	/**
	 * There wAs An Undo.
	 */
	Undo = 5,
	/**
	 * There wAs A Redo.
	 */
	Redo = 6
}

/**
 * The defAult end of line to use when instAntiAting models.
 */
export enum DefAultEndOfLine {
	/**
	 * Use line feed (\n) As the end of line chArActer.
	 */
	LF = 1,
	/**
	 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
	 */
	CRLF = 2
}

/**
 * A document highlight kind.
 */
export enum DocumentHighlightKind {
	/**
	 * A textuAl occurrence.
	 */
	Text = 0,
	/**
	 * ReAd-Access of A symbol, like reAding A vAriAble.
	 */
	ReAd = 1,
	/**
	 * Write-Access of A symbol, like writing to A vAriAble.
	 */
	Write = 2
}

/**
 * ConfigurAtion options for Auto indentAtion in the editor
 */
export enum EditorAutoIndentStrAtegy {
	None = 0,
	Keep = 1,
	BrAckets = 2,
	AdvAnced = 3,
	Full = 4
}

export enum EditorOption {
	AcceptSuggestionOnCommitChArActer = 0,
	AcceptSuggestionOnEnter = 1,
	AccessibilitySupport = 2,
	AccessibilityPAgeSize = 3,
	AriALAbel = 4,
	AutoClosingBrAckets = 5,
	AutoClosingOvertype = 6,
	AutoClosingQuotes = 7,
	AutoIndent = 8,
	AutomAticLAyout = 9,
	AutoSurround = 10,
	codeLens = 11,
	colorDecorAtors = 12,
	columnSelection = 13,
	comments = 14,
	contextmenu = 15,
	copyWithSyntAxHighlighting = 16,
	cursorBlinking = 17,
	cursorSmoothCAretAnimAtion = 18,
	cursorStyle = 19,
	cursorSurroundingLines = 20,
	cursorSurroundingLinesStyle = 21,
	cursorWidth = 22,
	disAbleLAyerHinting = 23,
	disAbleMonospAceOptimizAtions = 24,
	drAgAndDrop = 25,
	emptySelectionClipboArd = 26,
	extrAEditorClAssNAme = 27,
	fAstScrollSensitivity = 28,
	find = 29,
	fixedOverflowWidgets = 30,
	folding = 31,
	foldingStrAtegy = 32,
	foldingHighlight = 33,
	unfoldOnClickAfterEndOfLine = 34,
	fontFAmily = 35,
	fontInfo = 36,
	fontLigAtures = 37,
	fontSize = 38,
	fontWeight = 39,
	formAtOnPAste = 40,
	formAtOnType = 41,
	glyphMArgin = 42,
	gotoLocAtion = 43,
	hideCursorInOverviewRuler = 44,
	highlightActiveIndentGuide = 45,
	hover = 46,
	inDiffEditor = 47,
	letterSpAcing = 48,
	lightbulb = 49,
	lineDecorAtionsWidth = 50,
	lineHeight = 51,
	lineNumbers = 52,
	lineNumbersMinChArs = 53,
	links = 54,
	mAtchBrAckets = 55,
	minimAp = 56,
	mouseStyle = 57,
	mouseWheelScrollSensitivity = 58,
	mouseWheelZoom = 59,
	multiCursorMergeOverlApping = 60,
	multiCursorModifier = 61,
	multiCursorPAste = 62,
	occurrencesHighlight = 63,
	overviewRulerBorder = 64,
	overviewRulerLAnes = 65,
	pAdding = 66,
	pArAmeterHints = 67,
	peekWidgetDefAultFocus = 68,
	definitionLinkOpensInPeek = 69,
	quickSuggestions = 70,
	quickSuggestionsDelAy = 71,
	reAdOnly = 72,
	renAmeOnType = 73,
	renderControlChArActers = 74,
	renderIndentGuides = 75,
	renderFinAlNewline = 76,
	renderLineHighlight = 77,
	renderLineHighlightOnlyWhenFocus = 78,
	renderVAlidAtionDecorAtions = 79,
	renderWhitespAce = 80,
	reveAlHorizontAlRightPAdding = 81,
	roundedSelection = 82,
	rulers = 83,
	scrollbAr = 84,
	scrollBeyondLAstColumn = 85,
	scrollBeyondLAstLine = 86,
	scrollPredominAntAxis = 87,
	selectionClipboArd = 88,
	selectionHighlight = 89,
	selectOnLineNumbers = 90,
	showFoldingControls = 91,
	showUnused = 92,
	snippetSuggestions = 93,
	smoothScrolling = 94,
	stopRenderingLineAfter = 95,
	suggest = 96,
	suggestFontSize = 97,
	suggestLineHeight = 98,
	suggestOnTriggerChArActers = 99,
	suggestSelection = 100,
	tAbCompletion = 101,
	tAbIndex = 102,
	unusuAlLineTerminAtors = 103,
	useTAbStops = 104,
	wordSepArAtors = 105,
	wordWrAp = 106,
	wordWrApBreAkAfterChArActers = 107,
	wordWrApBreAkBeforeChArActers = 108,
	wordWrApColumn = 109,
	wordWrApMinified = 110,
	wrAppingIndent = 111,
	wrAppingStrAtegy = 112,
	showDeprecAted = 113,
	editorClAssNAme = 114,
	pixelRAtio = 115,
	tAbFocusMode = 116,
	lAyoutInfo = 117,
	wrAppingInfo = 118
}

/**
 * End of line chArActer preference.
 */
export enum EndOfLinePreference {
	/**
	 * Use the end of line chArActer identified in the text buffer.
	 */
	TextDefined = 0,
	/**
	 * Use line feed (\n) As the end of line chArActer.
	 */
	LF = 1,
	/**
	 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
	 */
	CRLF = 2
}

/**
 * End of line chArActer preference.
 */
export enum EndOfLineSequence {
	/**
	 * Use line feed (\n) As the end of line chArActer.
	 */
	LF = 0,
	/**
	 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
	 */
	CRLF = 1
}

/**
 * Describes whAt to do with the indentAtion when pressing Enter.
 */
export enum IndentAction {
	/**
	 * Insert new line And copy the previous line's indentAtion.
	 */
	None = 0,
	/**
	 * Insert new line And indent once (relAtive to the previous line's indentAtion).
	 */
	Indent = 1,
	/**
	 * Insert two new lines:
	 *  - the first one indented which will hold the cursor
	 *  - the second one At the sAme indentAtion level
	 */
	IndentOutdent = 2,
	/**
	 * Insert new line And outdent once (relAtive to the previous line's indentAtion).
	 */
	Outdent = 3
}

/**
 * VirtuAl Key Codes, the vAlue does not hold Any inherent meAning.
 * Inspired somewhAt from https://msdn.microsoft.com/en-us/librAry/windows/desktop/dd375731(v=vs.85).Aspx
 * But these Are "more generAl", As they should work Across browsers & OS`s.
 */
export enum KeyCode {
	/**
	 * PlAced first to cover the 0 vAlue of the enum.
	 */
	Unknown = 0,
	BAckspAce = 1,
	TAb = 2,
	Enter = 3,
	Shift = 4,
	Ctrl = 5,
	Alt = 6,
	PAuseBreAk = 7,
	CApsLock = 8,
	EscApe = 9,
	SpAce = 10,
	PAgeUp = 11,
	PAgeDown = 12,
	End = 13,
	Home = 14,
	LeftArrow = 15,
	UpArrow = 16,
	RightArrow = 17,
	DownArrow = 18,
	Insert = 19,
	Delete = 20,
	KEY_0 = 21,
	KEY_1 = 22,
	KEY_2 = 23,
	KEY_3 = 24,
	KEY_4 = 25,
	KEY_5 = 26,
	KEY_6 = 27,
	KEY_7 = 28,
	KEY_8 = 29,
	KEY_9 = 30,
	KEY_A = 31,
	KEY_B = 32,
	KEY_C = 33,
	KEY_D = 34,
	KEY_E = 35,
	KEY_F = 36,
	KEY_G = 37,
	KEY_H = 38,
	KEY_I = 39,
	KEY_J = 40,
	KEY_K = 41,
	KEY_L = 42,
	KEY_M = 43,
	KEY_N = 44,
	KEY_O = 45,
	KEY_P = 46,
	KEY_Q = 47,
	KEY_R = 48,
	KEY_S = 49,
	KEY_T = 50,
	KEY_U = 51,
	KEY_V = 52,
	KEY_W = 53,
	KEY_X = 54,
	KEY_Y = 55,
	KEY_Z = 56,
	MetA = 57,
	ContextMenu = 58,
	F1 = 59,
	F2 = 60,
	F3 = 61,
	F4 = 62,
	F5 = 63,
	F6 = 64,
	F7 = 65,
	F8 = 66,
	F9 = 67,
	F10 = 68,
	F11 = 69,
	F12 = 70,
	F13 = 71,
	F14 = 72,
	F15 = 73,
	F16 = 74,
	F17 = 75,
	F18 = 76,
	F19 = 77,
	NumLock = 78,
	ScrollLock = 79,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ';:' key
	 */
	US_SEMICOLON = 80,
	/**
	 * For Any country/region, the '+' key
	 * For the US stAndArd keyboArd, the '=+' key
	 */
	US_EQUAL = 81,
	/**
	 * For Any country/region, the ',' key
	 * For the US stAndArd keyboArd, the ',<' key
	 */
	US_COMMA = 82,
	/**
	 * For Any country/region, the '-' key
	 * For the US stAndArd keyboArd, the '-_' key
	 */
	US_MINUS = 83,
	/**
	 * For Any country/region, the '.' key
	 * For the US stAndArd keyboArd, the '.>' key
	 */
	US_DOT = 84,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '/?' key
	 */
	US_SLASH = 85,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '`~' key
	 */
	US_BACKTICK = 86,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '[{' key
	 */
	US_OPEN_SQUARE_BRACKET = 87,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the '\|' key
	 */
	US_BACKSLASH = 88,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ']}' key
	 */
	US_CLOSE_SQUARE_BRACKET = 89,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 * For the US stAndArd keyboArd, the ''"' key
	 */
	US_QUOTE = 90,
	/**
	 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
	 */
	OEM_8 = 91,
	/**
	 * Either the Angle brAcket key or the bAckslAsh key on the RT 102-key keyboArd.
	 */
	OEM_102 = 92,
	NUMPAD_0 = 93,
	NUMPAD_1 = 94,
	NUMPAD_2 = 95,
	NUMPAD_3 = 96,
	NUMPAD_4 = 97,
	NUMPAD_5 = 98,
	NUMPAD_6 = 99,
	NUMPAD_7 = 100,
	NUMPAD_8 = 101,
	NUMPAD_9 = 102,
	NUMPAD_MULTIPLY = 103,
	NUMPAD_ADD = 104,
	NUMPAD_SEPARATOR = 105,
	NUMPAD_SUBTRACT = 106,
	NUMPAD_DECIMAL = 107,
	NUMPAD_DIVIDE = 108,
	/**
	 * Cover All key codes when IME is processing input.
	 */
	KEY_IN_COMPOSITION = 109,
	ABNT_C1 = 110,
	ABNT_C2 = 111,
	/**
	 * PlAced lAst to cover the length of the enum.
	 * PleAse do not depend on this vAlue!
	 */
	MAX_VALUE = 112
}

export enum MArkerSeverity {
	Hint = 1,
	Info = 2,
	WArning = 4,
	Error = 8
}

export enum MArkerTAg {
	UnnecessAry = 1,
	DeprecAted = 2
}

/**
 * Position in the minimAp to render the decorAtion.
 */
export enum MinimApPosition {
	Inline = 1,
	Gutter = 2
}

/**
 * Type of hit element with the mouse in the editor.
 */
export enum MouseTArgetType {
	/**
	 * Mouse is on top of An unknown element.
	 */
	UNKNOWN = 0,
	/**
	 * Mouse is on top of the textAreA used for input.
	 */
	TEXTAREA = 1,
	/**
	 * Mouse is on top of the glyph mArgin
	 */
	GUTTER_GLYPH_MARGIN = 2,
	/**
	 * Mouse is on top of the line numbers
	 */
	GUTTER_LINE_NUMBERS = 3,
	/**
	 * Mouse is on top of the line decorAtions
	 */
	GUTTER_LINE_DECORATIONS = 4,
	/**
	 * Mouse is on top of the whitespAce left in the gutter by A view zone.
	 */
	GUTTER_VIEW_ZONE = 5,
	/**
	 * Mouse is on top of text in the content.
	 */
	CONTENT_TEXT = 6,
	/**
	 * Mouse is on top of empty spAce in the content (e.g. After line text or below lAst line)
	 */
	CONTENT_EMPTY = 7,
	/**
	 * Mouse is on top of A view zone in the content.
	 */
	CONTENT_VIEW_ZONE = 8,
	/**
	 * Mouse is on top of A content widget.
	 */
	CONTENT_WIDGET = 9,
	/**
	 * Mouse is on top of the decorAtions overview ruler.
	 */
	OVERVIEW_RULER = 10,
	/**
	 * Mouse is on top of A scrollbAr.
	 */
	SCROLLBAR = 11,
	/**
	 * Mouse is on top of An overlAy widget.
	 */
	OVERLAY_WIDGET = 12,
	/**
	 * Mouse is outside of the editor.
	 */
	OUTSIDE_EDITOR = 13
}

/**
 * A positioning preference for rendering overlAy widgets.
 */
export enum OverlAyWidgetPositionPreference {
	/**
	 * Position the overlAy widget in the top right corner
	 */
	TOP_RIGHT_CORNER = 0,
	/**
	 * Position the overlAy widget in the bottom right corner
	 */
	BOTTOM_RIGHT_CORNER = 1,
	/**
	 * Position the overlAy widget in the top center
	 */
	TOP_CENTER = 2
}

/**
 * VerticAl LAne in the overview ruler of the editor.
 */
export enum OverviewRulerLAne {
	Left = 1,
	Center = 2,
	Right = 4,
	Full = 7
}

export enum RenderLineNumbersType {
	Off = 0,
	On = 1,
	RelAtive = 2,
	IntervAl = 3,
	Custom = 4
}

export enum RenderMinimAp {
	None = 0,
	Text = 1,
	Blocks = 2
}

export enum ScrollType {
	Smooth = 0,
	ImmediAte = 1
}

export enum ScrollbArVisibility {
	Auto = 1,
	Hidden = 2,
	Visible = 3
}

/**
 * The direction of A selection.
 */
export enum SelectionDirection {
	/**
	 * The selection stArts Above where it ends.
	 */
	LTR = 0,
	/**
	 * The selection stArts below where it ends.
	 */
	RTL = 1
}

export enum SignAtureHelpTriggerKind {
	Invoke = 1,
	TriggerChArActer = 2,
	ContentChAnge = 3
}

/**
 * A symbol kind.
 */
export enum SymbolKind {
	File = 0,
	Module = 1,
	NAmespAce = 2,
	PAckAge = 3,
	ClAss = 4,
	Method = 5,
	Property = 6,
	Field = 7,
	Constructor = 8,
	Enum = 9,
	InterfAce = 10,
	Function = 11,
	VAriAble = 12,
	ConstAnt = 13,
	String = 14,
	Number = 15,
	BooleAn = 16,
	ArrAy = 17,
	Object = 18,
	Key = 19,
	Null = 20,
	EnumMember = 21,
	Struct = 22,
	Event = 23,
	OperAtor = 24,
	TypePArAmeter = 25
}

export enum SymbolTAg {
	DeprecAted = 1
}

/**
 * The kind of AnimAtion in which the editor's cursor should be rendered.
 */
export enum TextEditorCursorBlinkingStyle {
	/**
	 * Hidden
	 */
	Hidden = 0,
	/**
	 * Blinking
	 */
	Blink = 1,
	/**
	 * Blinking with smooth fAding
	 */
	Smooth = 2,
	/**
	 * Blinking with prolonged filled stAte And smooth fAding
	 */
	PhAse = 3,
	/**
	 * ExpAnd collApse AnimAtion on the y Axis
	 */
	ExpAnd = 4,
	/**
	 * No-Blinking
	 */
	Solid = 5
}

/**
 * The style in which the editor's cursor should be rendered.
 */
export enum TextEditorCursorStyle {
	/**
	 * As A verticAl line (sitting between two chArActers).
	 */
	Line = 1,
	/**
	 * As A block (sitting on top of A chArActer).
	 */
	Block = 2,
	/**
	 * As A horizontAl line (sitting under A chArActer).
	 */
	Underline = 3,
	/**
	 * As A thin verticAl line (sitting between two chArActers).
	 */
	LineThin = 4,
	/**
	 * As An outlined block (sitting on top of A chArActer).
	 */
	BlockOutline = 5,
	/**
	 * As A thin horizontAl line (sitting under A chArActer).
	 */
	UnderlineThin = 6
}

/**
 * Describes the behAvior of decorAtions when typing/editing neAr their edges.
 * Note: PleAse do not edit the vAlues, As they very cArefully mAtch `DecorAtionRAngeBehAvior`
 */
export enum TrAckedRAngeStickiness {
	AlwAysGrowsWhenTypingAtEdges = 0,
	NeverGrowsWhenTypingAtEdges = 1,
	GrowsOnlyWhenTypingBefore = 2,
	GrowsOnlyWhenTypingAfter = 3
}

/**
 * Describes how to indent wrApped lines.
 */
export enum WrAppingIndent {
	/**
	 * No indentAtion => wrApped lines begin At column 1.
	 */
	None = 0,
	/**
	 * SAme => wrApped lines get the sAme indentAtion As the pArent.
	 */
	SAme = 1,
	/**
	 * Indent => wrApped lines get +1 indentAtion towArd the pArent.
	 */
	Indent = 2,
	/**
	 * DeepIndent => wrApped lines get +2 indentAtion towArd the pArent.
	 */
	DeepIndent = 3
}
