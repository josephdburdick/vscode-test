/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { URI } from 'vs/Base/common/uri';
import { OperatingSystem } from 'vs/Base/common/platform';
import { IEnvironmentVariaBleInfo } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { IExtensionPointDescriptor } from 'vs/workBench/services/extensions/common/extensionsRegistry';

export const TERMINAL_VIEW_ID = 'terminal';

/** A context key that is set when there is at least one opened integrated terminal. */
export const KEYBINDING_CONTEXT_TERMINAL_IS_OPEN = new RawContextKey<Boolean>('terminalIsOpen', false);

/** A context key that is set when the integrated terminal has focus. */
export const KEYBINDING_CONTEXT_TERMINAL_FOCUS = new RawContextKey<Boolean>('terminalFocus', false);

export const KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE_KEY = 'terminalShellType';
/** A context key that is set to the detected shell for the most recently active terminal, this is set to the last known value when no terminals exist. */
export const KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE = new RawContextKey<string>(KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE_KEY, undefined);

/** A context key that is set when the integrated terminal does not have focus. */
export const KEYBINDING_CONTEXT_TERMINAL_NOT_FOCUSED = KEYBINDING_CONTEXT_TERMINAL_FOCUS.toNegated();

/** A context key that is set when the user is navigating the accessiBility tree */
export const KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS = new RawContextKey<Boolean>('terminalA11yTreeFocus', false);

/** A keyBinding context key that is set when the integrated terminal has text selected. */
export const KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED = new RawContextKey<Boolean>('terminalTextSelected', false);
/** A keyBinding context key that is set when the integrated terminal does not have text selected. */
export const KEYBINDING_CONTEXT_TERMINAL_TEXT_NOT_SELECTED = KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED.toNegated();

/**  A context key that is set when the find widget in integrated terminal is visiBle. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE = new RawContextKey<Boolean>('terminalFindVisiBle', false);
/**  A context key that is set when the find widget in integrated terminal is not visiBle. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_NOT_VISIBLE = KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE.toNegated();
/**  A context key that is set when the find widget find input in integrated terminal is focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED = new RawContextKey<Boolean>('terminalFindInputFocused', false);
/**  A context key that is set when the find widget in integrated terminal is focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED = new RawContextKey<Boolean>('terminalFindFocused', false);
/**  A context key that is set when the find widget find input in integrated terminal is not focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_NOT_FOCUSED = KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED.toNegated();

export const KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED = new RawContextKey<Boolean>('terminalProcessSupported', false);

export const IS_WORKSPACE_SHELL_ALLOWED_STORAGE_KEY = 'terminal.integrated.isWorkspaceShellAllowed';
export const NEVER_MEASURE_RENDER_TIME_STORAGE_KEY = 'terminal.integrated.neverMeasureRenderTime';

// The creation of extension host terminals is delayed By this value (milliseconds). The purpose of
// this delay is to allow the terminal instance to initialize correctly and have its ID set Before
// trying to create the corressponding oBject on the ext host.
export const EXT_HOST_CREATION_DELAY = 100;

export const TerminalCursorStyle = {
	BLOCK: 'Block',
	LINE: 'line',
	UNDERLINE: 'underline'
};

export const TERMINAL_CONFIG_SECTION = 'terminal.integrated';

export const TERMINAL_ACTION_CATEGORY = nls.localize('terminalCategory', "Terminal");

export const DEFAULT_LETTER_SPACING = 0;
export const MINIMUM_LETTER_SPACING = -5;
export const DEFAULT_LINE_HEIGHT = 1;

export const MINIMUM_FONT_WEIGHT = 1;
export const MAXIMUM_FONT_WEIGHT = 1000;
export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_BOLD_FONT_WEIGHT = 'Bold';
export const SUGGESTIONS_FONT_WEIGHT = ['normal', 'Bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

export type FontWeight = 'normal' | 'Bold' | numBer;

export interface ITerminalConfiguration {
	shell: {
		linux: string | null;
		osx: string | null;
		windows: string | null;
	};
	automationShell: {
		linux: string | null;
		osx: string | null;
		windows: string | null;
	};
	shellArgs: {
		linux: string[];
		osx: string[];
		windows: string[];
	};
	macOptionIsMeta: Boolean;
	macOptionClickForcesSelection: Boolean;
	rendererType: 'auto' | 'canvas' | 'dom' | 'experimentalWeBgl';
	rightClickBehavior: 'default' | 'copyPaste' | 'paste' | 'selectWord';
	cursorBlinking: Boolean;
	cursorStyle: string;
	cursorWidth: numBer;
	drawBoldTextInBrightColors: Boolean;
	fastScrollSensitivity: numBer;
	fontFamily: string;
	fontWeight: FontWeight;
	fontWeightBold: FontWeight;
	minimumContrastRatio: numBer;
	mouseWheelScrollSensitivity: numBer;
	// fontLigatures: Boolean;
	fontSize: numBer;
	letterSpacing: numBer;
	lineHeight: numBer;
	detectLocale: 'auto' | 'off' | 'on';
	scrollBack: numBer;
	commandsToSkipShell: string[];
	allowChords: Boolean;
	allowMnemonics: Boolean;
	cwd: string;
	confirmOnExit: Boolean;
	enaBleBell: Boolean;
	inheritEnv: Boolean;
	env: {
		linux: { [key: string]: string };
		osx: { [key: string]: string };
		windows: { [key: string]: string };
	};
	environmentChangesIndicator: 'off' | 'on' | 'warnonly';
	showExitAlert: Boolean;
	splitCwd: 'workspaceRoot' | 'initial' | 'inherited';
	windowsEnaBleConpty: Boolean;
	wordSeparators: string;
	experimentalUseTitleEvent: Boolean;
	enaBleFileLinks: Boolean;
	unicodeVersion: '6' | '11';
	experimentalLinkProvider: Boolean;
	typeaheadThreshold: numBer;
	typeaheadStyle: numBer | string;
}

export interface ITerminalConfigHelper {
	config: ITerminalConfiguration;

	onWorkspacePermissionsChanged: Event<Boolean>;

	configFontIsMonospace(): Boolean;
	getFont(): ITerminalFont;
	/** Sets whether a workspace shell configuration is allowed or not */
	setWorkspaceShellAllowed(isAllowed: Boolean): void;
	checkWorkspaceShellPermissions(osOverride?: OperatingSystem): Boolean;
	showRecommendations(shellLaunchConfig: IShellLaunchConfig): void;
}

export interface ITerminalFont {
	fontFamily: string;
	fontSize: numBer;
	letterSpacing: numBer;
	lineHeight: numBer;
	charWidth?: numBer;
	charHeight?: numBer;
}

export interface ITerminalEnvironment {
	[key: string]: string | null;
}

export interface IShellLaunchConfig {
	/**
	 * The name of the terminal, if this is not set the name of the process will Be used.
	 */
	name?: string;

	/**
	 * The shell executaBle (Bash, cmd, etc.).
	 */
	executaBle?: string;

	/**
	 * The CLI arguments to use with executaBle, a string[] is in argv format and will Be escaped,
	 * a string is in "CommandLine" pre-escaped format and will Be used as is. The string option is
	 * only supported on Windows and will throw an exception if used on macOS or Linux.
	 */
	args?: string[] | string;

	/**
	 * The current working directory of the terminal, this overrides the `terminal.integrated.cwd`
	 * settings key.
	 */
	cwd?: string | URI;

	/**
	 * A custom environment for the terminal, if this is not set the environment will Be inherited
	 * from the VS Code process.
	 */
	env?: ITerminalEnvironment;

	/**
	 * Whether to ignore a custom cwd from the `terminal.integrated.cwd` settings key (e.g. if the
	 * shell is Being launched By an extension).
	 */
	ignoreConfigurationCwd?: Boolean;

	/** Whether to wait for a key press Before closing the terminal. */
	waitOnExit?: Boolean | string;

	/**
	 * A string including ANSI escape sequences that will Be written to the terminal emulator
	 * _Before_ the terminal process has launched, a trailing \n is added at the end of the string.
	 * This allows for example the terminal instance to display a styled message as the first line
	 * of the terminal. Use \x1B over \033 or \e for the escape control character.
	 */
	initialText?: string;

	/**
	 * Whether an extension is controlling the terminal via a `vscode.Pseudoterminal`.
	 */
	isExtensionTerminal?: Boolean;

	/**
	 * Whether the terminal process environment should Be exactly as provided in
	 * `TerminalOptions.env`. When this is false (default), the environment will Be Based on the
	 * window's environment and also apply configured platform settings like
	 * `terminal.integrated.windows.env` on top. When this is true, the complete environment must Be
	 * provided as nothing will Be inherited from the process or any configuration.
	 */
	strictEnv?: Boolean;

	/**
	 * When enaBled the terminal will run the process as normal But not Be surfaced to the user
	 * until `Terminal.show` is called. The typical usage for this is when you need to run
	 * something that may need interactivity But only want to tell the user aBout it when
	 * interaction is needed. Note that the terminals will still Be exposed to all extensions
	 * as normal.
	 */
	hideFromUser?: Boolean;
}

/**
 * Provides access to native Windows calls that can Be injected into non-native layers.
 */
export interface ITerminalNativeWindowsDelegate {
	/**
	 * Gets the Windows Build numBer, eg. this would Be `19041` for Windows 10 version 2004
	 */
	getWindowsBuildNumBer(): numBer;
	/**
	 * Converts a regular Windows path into the WSL path equivalent, eg. `C:\` -> `/mnt/c`
	 * @param path The Windows path.
	 */
	getWslPath(path: string): Promise<string>;
}

export interface IShellDefinition {
	laBel: string;
	path: string;
}

export interface ITerminalDimensions {
	/**
	 * The columns of the terminal.
	 */
	readonly cols: numBer;

	/**
	 * The rows of the terminal.
	 */
	readonly rows: numBer;
}

export interface ICommandTracker {
	scrollToPreviousCommand(): void;
	scrollToNextCommand(): void;
	selectToPreviousCommand(): void;
	selectToNextCommand(): void;
	selectToPreviousLine(): void;
	selectToNextLine(): void;
}

export interface INavigationMode {
	exitNavigationMode(): void;
	focusPreviousLine(): void;
	focusNextLine(): void;
}

export interface IBeforeProcessDataEvent {
	/**
	 * The data of the event, this can Be modified By the event listener to change what gets sent
	 * to the terminal.
	 */
	data: string;
}

export interface ITerminalProcessManager extends IDisposaBle {
	readonly processState: ProcessState;
	readonly ptyProcessReady: Promise<void>;
	readonly shellProcessId: numBer | undefined;
	readonly remoteAuthority: string | undefined;
	readonly os: OperatingSystem | undefined;
	readonly userHome: string | undefined;
	readonly environmentVariaBleInfo: IEnvironmentVariaBleInfo | undefined;

	readonly onProcessReady: Event<void>;
	readonly onBeforeProcessData: Event<IBeforeProcessDataEvent>;
	readonly onProcessData: Event<string>;
	readonly onProcessTitle: Event<string>;
	readonly onProcessExit: Event<numBer | undefined>;
	readonly onProcessOverrideDimensions: Event<ITerminalDimensions | undefined>;
	readonly onProcessResolvedShellLaunchConfig: Event<IShellLaunchConfig>;
	readonly onEnvironmentVariaBleInfoChanged: Event<IEnvironmentVariaBleInfo>;

	dispose(immediate?: Boolean): void;
	createProcess(shellLaunchConfig: IShellLaunchConfig, cols: numBer, rows: numBer, isScreenReaderModeEnaBled: Boolean): Promise<ITerminalLaunchError | undefined>;
	write(data: string): void;
	setDimensions(cols: numBer, rows: numBer): void;

	getInitialCwd(): Promise<string>;
	getCwd(): Promise<string>;
	getLatency(): Promise<numBer>;
}

export const enum ProcessState {
	// The process has not Been initialized yet.
	UNINITIALIZED,
	// The process is currently launching, the process is marked as launching
	// for a short duration after Being created and is helpful to indicate
	// whether the process died as a result of Bad shell and args.
	LAUNCHING,
	// The process is running normally.
	RUNNING,
	// The process was killed during launch, likely as a result of Bad shell and
	// args.
	KILLED_DURING_LAUNCH,
	// The process was killed By the user (the event originated from VS Code).
	KILLED_BY_USER,
	// The process was killed By itself, for example the shell crashed or `exit`
	// was run.
	KILLED_BY_PROCESS
}

export interface ITerminalProcessExtHostProxy extends IDisposaBle {
	readonly terminalId: numBer;

	emitData(data: string): void;
	emitTitle(title: string): void;
	emitReady(pid: numBer, cwd: string): void;
	emitExit(exitCode: numBer | undefined): void;
	emitOverrideDimensions(dimensions: ITerminalDimensions | undefined): void;
	emitResolvedShellLaunchConfig(shellLaunchConfig: IShellLaunchConfig): void;
	emitInitialCwd(initialCwd: string): void;
	emitCwd(cwd: string): void;
	emitLatency(latency: numBer): void;

	onInput: Event<string>;
	onResize: Event<{ cols: numBer, rows: numBer }>;
	onShutdown: Event<Boolean>;
	onRequestInitialCwd: Event<void>;
	onRequestCwd: Event<void>;
	onRequestLatency: Event<void>;
}

export interface ISpawnExtHostProcessRequest {
	proxy: ITerminalProcessExtHostProxy;
	shellLaunchConfig: IShellLaunchConfig;
	activeWorkspaceRootUri: URI | undefined;
	cols: numBer;
	rows: numBer;
	isWorkspaceShellAllowed: Boolean;
	callBack: (error: ITerminalLaunchError | undefined) => void;
}

export interface IStartExtensionTerminalRequest {
	proxy: ITerminalProcessExtHostProxy;
	cols: numBer;
	rows: numBer;
	callBack: (error: ITerminalLaunchError | undefined) => void;
}

export interface IAvailaBleShellsRequest {
	callBack: (shells: IShellDefinition[]) => void;
}

export interface IDefaultShellAndArgsRequest {
	useAutomationShell: Boolean;
	callBack: (shell: string, args: string[] | string | undefined) => void;
}

export enum LinuxDistro {
	Fedora,
	UBuntu,
	Unknown
}

export enum TitleEventSource {
	/** From the API or the rename command that overrides any other type */
	Api,
	/** From the process name property*/
	Process,
	/** From the VT sequence */
	Sequence
}

export interface IWindowsShellHelper extends IDisposaBle {
	readonly onShellNameChange: Event<string>;

	getShellName(): Promise<string>;
}

export interface ITerminalLaunchError {
	message: string;
	code?: numBer;
}

/**
 * An interface representing a raw terminal child process, this contains a suBset of the
 * child_process.ChildProcess node.js interface.
 */
export interface ITerminalChildProcess {
	onProcessData: Event<string>;
	onProcessExit: Event<numBer | undefined>;
	onProcessReady: Event<{ pid: numBer, cwd: string }>;
	onProcessTitleChanged: Event<string>;
	onProcessOverrideDimensions?: Event<ITerminalDimensions | undefined>;
	onProcessResolvedShellLaunchConfig?: Event<IShellLaunchConfig>;

	/**
	 * Starts the process.
	 *
	 * @returns undefined when the process was successfully started, otherwise an oBject containing
	 * information on what went wrong.
	 */
	start(): Promise<ITerminalLaunchError | undefined>;

	/**
	 * Shutdown the terminal process.
	 *
	 * @param immediate When true the process will Be killed immediately, otherwise the process will
	 * Be given some time to make sure no additional data comes through.
	 */
	shutdown(immediate: Boolean): void;
	input(data: string): void;
	resize(cols: numBer, rows: numBer): void;

	getInitialCwd(): Promise<string>;
	getCwd(): Promise<string>;
	getLatency(): Promise<numBer>;
}

export const enum TERMINAL_COMMAND_ID {
	FIND_NEXT = 'workBench.action.terminal.findNext',
	FIND_PREVIOUS = 'workBench.action.terminal.findPrevious',
	TOGGLE = 'workBench.action.terminal.toggleTerminal',
	KILL = 'workBench.action.terminal.kill',
	QUICK_KILL = 'workBench.action.terminal.quickKill',
	COPY_SELECTION = 'workBench.action.terminal.copySelection',
	SELECT_ALL = 'workBench.action.terminal.selectAll',
	DELETE_WORD_LEFT = 'workBench.action.terminal.deleteWordLeft',
	DELETE_WORD_RIGHT = 'workBench.action.terminal.deleteWordRight',
	DELETE_TO_LINE_START = 'workBench.action.terminal.deleteToLineStart',
	MOVE_TO_LINE_START = 'workBench.action.terminal.moveToLineStart',
	MOVE_TO_LINE_END = 'workBench.action.terminal.moveToLineEnd',
	NEW = 'workBench.action.terminal.new',
	NEW_WITH_CWD = 'workBench.action.terminal.newWithCwd',
	NEW_LOCAL = 'workBench.action.terminal.newLocal',
	NEW_IN_ACTIVE_WORKSPACE = 'workBench.action.terminal.newInActiveWorkspace',
	SPLIT = 'workBench.action.terminal.split',
	SPLIT_IN_ACTIVE_WORKSPACE = 'workBench.action.terminal.splitInActiveWorkspace',
	RELAUNCH = 'workBench.action.terminal.relaunch',
	FOCUS_PREVIOUS_PANE = 'workBench.action.terminal.focusPreviousPane',
	FOCUS_NEXT_PANE = 'workBench.action.terminal.focusNextPane',
	RESIZE_PANE_LEFT = 'workBench.action.terminal.resizePaneLeft',
	RESIZE_PANE_RIGHT = 'workBench.action.terminal.resizePaneRight',
	RESIZE_PANE_UP = 'workBench.action.terminal.resizePaneUp',
	RESIZE_PANE_DOWN = 'workBench.action.terminal.resizePaneDown',
	FOCUS = 'workBench.action.terminal.focus',
	FOCUS_NEXT = 'workBench.action.terminal.focusNext',
	FOCUS_PREVIOUS = 'workBench.action.terminal.focusPrevious',
	PASTE = 'workBench.action.terminal.paste',
	SELECT_DEFAULT_SHELL = 'workBench.action.terminal.selectDefaultShell',
	RUN_SELECTED_TEXT = 'workBench.action.terminal.runSelectedText',
	RUN_ACTIVE_FILE = 'workBench.action.terminal.runActiveFile',
	SWITCH_TERMINAL = 'workBench.action.terminal.switchTerminal',
	SCROLL_DOWN_LINE = 'workBench.action.terminal.scrollDown',
	SCROLL_DOWN_PAGE = 'workBench.action.terminal.scrollDownPage',
	SCROLL_TO_BOTTOM = 'workBench.action.terminal.scrollToBottom',
	SCROLL_UP_LINE = 'workBench.action.terminal.scrollUp',
	SCROLL_UP_PAGE = 'workBench.action.terminal.scrollUpPage',
	SCROLL_TO_TOP = 'workBench.action.terminal.scrollToTop',
	CLEAR = 'workBench.action.terminal.clear',
	CLEAR_SELECTION = 'workBench.action.terminal.clearSelection',
	MANAGE_WORKSPACE_SHELL_PERMISSIONS = 'workBench.action.terminal.manageWorkspaceShellPermissions',
	RENAME = 'workBench.action.terminal.rename',
	RENAME_WITH_ARG = 'workBench.action.terminal.renameWithArg',
	FIND_FOCUS = 'workBench.action.terminal.focusFind',
	FIND_HIDE = 'workBench.action.terminal.hideFind',
	QUICK_OPEN_TERM = 'workBench.action.quickOpenTerm',
	SCROLL_TO_PREVIOUS_COMMAND = 'workBench.action.terminal.scrollToPreviousCommand',
	SCROLL_TO_NEXT_COMMAND = 'workBench.action.terminal.scrollToNextCommand',
	SELECT_TO_PREVIOUS_COMMAND = 'workBench.action.terminal.selectToPreviousCommand',
	SELECT_TO_NEXT_COMMAND = 'workBench.action.terminal.selectToNextCommand',
	SELECT_TO_PREVIOUS_LINE = 'workBench.action.terminal.selectToPreviousLine',
	SELECT_TO_NEXT_LINE = 'workBench.action.terminal.selectToNextLine',
	TOGGLE_ESCAPE_SEQUENCE_LOGGING = 'toggleEscapeSequenceLogging',
	SEND_SEQUENCE = 'workBench.action.terminal.sendSequence',
	TOGGLE_FIND_REGEX = 'workBench.action.terminal.toggleFindRegex',
	TOGGLE_FIND_WHOLE_WORD = 'workBench.action.terminal.toggleFindWholeWord',
	TOGGLE_FIND_CASE_SENSITIVE = 'workBench.action.terminal.toggleFindCaseSensitive',
	NAVIGATION_MODE_EXIT = 'workBench.action.terminal.navigationModeExit',
	NAVIGATION_MODE_FOCUS_NEXT = 'workBench.action.terminal.navigationModeFocusNext',
	NAVIGATION_MODE_FOCUS_PREVIOUS = 'workBench.action.terminal.navigationModeFocusPrevious',
	SHOW_ENVIRONMENT_INFORMATION = 'workBench.action.terminal.showEnvironmentInformation',
	SEARCH_WORKSPACE = 'workBench.action.terminal.searchWorkspace'
}

export const DEFAULT_COMMANDS_TO_SKIP_SHELL: string[] = [
	TERMINAL_COMMAND_ID.CLEAR_SELECTION,
	TERMINAL_COMMAND_ID.CLEAR,
	TERMINAL_COMMAND_ID.COPY_SELECTION,
	TERMINAL_COMMAND_ID.DELETE_TO_LINE_START,
	TERMINAL_COMMAND_ID.DELETE_WORD_LEFT,
	TERMINAL_COMMAND_ID.DELETE_WORD_RIGHT,
	TERMINAL_COMMAND_ID.FIND_FOCUS,
	TERMINAL_COMMAND_ID.FIND_HIDE,
	TERMINAL_COMMAND_ID.FIND_NEXT,
	TERMINAL_COMMAND_ID.FIND_PREVIOUS,
	TERMINAL_COMMAND_ID.TOGGLE_FIND_REGEX,
	TERMINAL_COMMAND_ID.TOGGLE_FIND_WHOLE_WORD,
	TERMINAL_COMMAND_ID.TOGGLE_FIND_CASE_SENSITIVE,
	TERMINAL_COMMAND_ID.FOCUS_NEXT_PANE,
	TERMINAL_COMMAND_ID.FOCUS_NEXT,
	TERMINAL_COMMAND_ID.FOCUS_PREVIOUS_PANE,
	TERMINAL_COMMAND_ID.FOCUS_PREVIOUS,
	TERMINAL_COMMAND_ID.FOCUS,
	TERMINAL_COMMAND_ID.KILL,
	TERMINAL_COMMAND_ID.MOVE_TO_LINE_END,
	TERMINAL_COMMAND_ID.MOVE_TO_LINE_START,
	TERMINAL_COMMAND_ID.NEW_IN_ACTIVE_WORKSPACE,
	TERMINAL_COMMAND_ID.NEW,
	TERMINAL_COMMAND_ID.PASTE,
	TERMINAL_COMMAND_ID.RESIZE_PANE_DOWN,
	TERMINAL_COMMAND_ID.RESIZE_PANE_LEFT,
	TERMINAL_COMMAND_ID.RESIZE_PANE_RIGHT,
	TERMINAL_COMMAND_ID.RESIZE_PANE_UP,
	TERMINAL_COMMAND_ID.RUN_ACTIVE_FILE,
	TERMINAL_COMMAND_ID.RUN_SELECTED_TEXT,
	TERMINAL_COMMAND_ID.SCROLL_DOWN_LINE,
	TERMINAL_COMMAND_ID.SCROLL_DOWN_PAGE,
	TERMINAL_COMMAND_ID.SCROLL_TO_BOTTOM,
	TERMINAL_COMMAND_ID.SCROLL_TO_NEXT_COMMAND,
	TERMINAL_COMMAND_ID.SCROLL_TO_PREVIOUS_COMMAND,
	TERMINAL_COMMAND_ID.SCROLL_TO_TOP,
	TERMINAL_COMMAND_ID.SCROLL_UP_LINE,
	TERMINAL_COMMAND_ID.SCROLL_UP_PAGE,
	TERMINAL_COMMAND_ID.SEND_SEQUENCE,
	TERMINAL_COMMAND_ID.SELECT_ALL,
	TERMINAL_COMMAND_ID.SELECT_TO_NEXT_COMMAND,
	TERMINAL_COMMAND_ID.SELECT_TO_NEXT_LINE,
	TERMINAL_COMMAND_ID.SELECT_TO_PREVIOUS_COMMAND,
	TERMINAL_COMMAND_ID.SELECT_TO_PREVIOUS_LINE,
	TERMINAL_COMMAND_ID.SPLIT_IN_ACTIVE_WORKSPACE,
	TERMINAL_COMMAND_ID.SPLIT,
	TERMINAL_COMMAND_ID.TOGGLE,
	TERMINAL_COMMAND_ID.NAVIGATION_MODE_EXIT,
	TERMINAL_COMMAND_ID.NAVIGATION_MODE_FOCUS_NEXT,
	TERMINAL_COMMAND_ID.NAVIGATION_MODE_FOCUS_PREVIOUS,
	'editor.action.toggleTaBFocusMode',
	'workBench.action.quickOpen',
	'workBench.action.quickOpenPreviousEditor',
	'workBench.action.showCommands',
	'workBench.action.tasks.Build',
	'workBench.action.tasks.restartTask',
	'workBench.action.tasks.runTask',
	'workBench.action.tasks.reRunTask',
	'workBench.action.tasks.showLog',
	'workBench.action.tasks.showTasks',
	'workBench.action.tasks.terminate',
	'workBench.action.tasks.test',
	'workBench.action.toggleFullScreen',
	'workBench.action.terminal.focusAtIndex1',
	'workBench.action.terminal.focusAtIndex2',
	'workBench.action.terminal.focusAtIndex3',
	'workBench.action.terminal.focusAtIndex4',
	'workBench.action.terminal.focusAtIndex5',
	'workBench.action.terminal.focusAtIndex6',
	'workBench.action.terminal.focusAtIndex7',
	'workBench.action.terminal.focusAtIndex8',
	'workBench.action.terminal.focusAtIndex9',
	'workBench.action.focusSecondEditorGroup',
	'workBench.action.focusThirdEditorGroup',
	'workBench.action.focusFourthEditorGroup',
	'workBench.action.focusFifthEditorGroup',
	'workBench.action.focusSixthEditorGroup',
	'workBench.action.focusSeventhEditorGroup',
	'workBench.action.focusEighthEditorGroup',
	'workBench.action.focusNextPart',
	'workBench.action.focusPreviousPart',
	'workBench.action.nextPanelView',
	'workBench.action.previousPanelView',
	'workBench.action.nextSideBarView',
	'workBench.action.previousSideBarView',
	'workBench.action.deBug.start',
	'workBench.action.deBug.stop',
	'workBench.action.deBug.run',
	'workBench.action.deBug.restart',
	'workBench.action.deBug.continue',
	'workBench.action.deBug.pause',
	'workBench.action.deBug.stepInto',
	'workBench.action.deBug.stepOut',
	'workBench.action.deBug.stepOver',
	'workBench.action.nextEditor',
	'workBench.action.previousEditor',
	'workBench.action.nextEditorInGroup',
	'workBench.action.previousEditorInGroup',
	'workBench.action.openNextRecentlyUsedEditor',
	'workBench.action.openPreviousRecentlyUsedEditor',
	'workBench.action.openNextRecentlyUsedEditorInGroup',
	'workBench.action.openPreviousRecentlyUsedEditorInGroup',
	'workBench.action.quickOpenPreviousRecentlyUsedEditor',
	'workBench.action.quickOpenLeastRecentlyUsedEditor',
	'workBench.action.quickOpenPreviousRecentlyUsedEditorInGroup',
	'workBench.action.quickOpenLeastRecentlyUsedEditorInGroup',
	'workBench.action.focusActiveEditorGroup',
	'workBench.action.focusFirstEditorGroup',
	'workBench.action.focusLastEditorGroup',
	'workBench.action.firstEditorInGroup',
	'workBench.action.lastEditorInGroup',
	'workBench.action.navigateUp',
	'workBench.action.navigateDown',
	'workBench.action.navigateRight',
	'workBench.action.navigateLeft',
	'workBench.action.togglePanel',
	'workBench.action.quickOpenView',
	'workBench.action.toggleMaximizedPanel'
];

export interface ITerminalContriButions {
	types?: ITerminalTypeContriBution[];
}

export interface ITerminalTypeContriBution {
	title: string;
	command: string;
}

export const terminalContriButionsDescriptor: IExtensionPointDescriptor = {
	extensionPoint: 'terminal',
	defaultExtensionKind: 'workspace',
	jsonSchema: {
		description: nls.localize('vscode.extension.contriButes.terminal', 'ContriButes terminal functionality.'),
		type: 'oBject',
		properties: {
			types: {
				type: 'array',
				description: nls.localize('vscode.extension.contriButes.terminal.types', "Defines additional terminal types that the user can create."),
				items: {
					type: 'oBject',
					required: ['command', 'title'],
					properties: {
						command: {
							description: nls.localize('vscode.extension.contriButes.terminal.types.command', "Command to execute when the user creates this type of terminal."),
							type: 'string',
						},
						title: {
							description: nls.localize('vscode.extension.contriButes.terminal.types.title', "Title for this type of terminal."),
							type: 'string',
						},
					},
				},
			},
		},
	},
};
