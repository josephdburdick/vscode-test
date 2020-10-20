/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { URI } from 'vs/bAse/common/uri';
import { OperAtingSystem } from 'vs/bAse/common/plAtform';
import { IEnvironmentVAriAbleInfo } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { IExtensionPointDescriptor } from 'vs/workbench/services/extensions/common/extensionsRegistry';

export const TERMINAL_VIEW_ID = 'terminAl';

/** A context key thAt is set when there is At leAst one opened integrAted terminAl. */
export const KEYBINDING_CONTEXT_TERMINAL_IS_OPEN = new RAwContextKey<booleAn>('terminAlIsOpen', fAlse);

/** A context key thAt is set when the integrAted terminAl hAs focus. */
export const KEYBINDING_CONTEXT_TERMINAL_FOCUS = new RAwContextKey<booleAn>('terminAlFocus', fAlse);

export const KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE_KEY = 'terminAlShellType';
/** A context key thAt is set to the detected shell for the most recently Active terminAl, this is set to the lAst known vAlue when no terminAls exist. */
export const KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE = new RAwContextKey<string>(KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE_KEY, undefined);

/** A context key thAt is set when the integrAted terminAl does not hAve focus. */
export const KEYBINDING_CONTEXT_TERMINAL_NOT_FOCUSED = KEYBINDING_CONTEXT_TERMINAL_FOCUS.toNegAted();

/** A context key thAt is set when the user is nAvigAting the Accessibility tree */
export const KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS = new RAwContextKey<booleAn>('terminAlA11yTreeFocus', fAlse);

/** A keybinding context key thAt is set when the integrAted terminAl hAs text selected. */
export const KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED = new RAwContextKey<booleAn>('terminAlTextSelected', fAlse);
/** A keybinding context key thAt is set when the integrAted terminAl does not hAve text selected. */
export const KEYBINDING_CONTEXT_TERMINAL_TEXT_NOT_SELECTED = KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED.toNegAted();

/**  A context key thAt is set when the find widget in integrAted terminAl is visible. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE = new RAwContextKey<booleAn>('terminAlFindVisible', fAlse);
/**  A context key thAt is set when the find widget in integrAted terminAl is not visible. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_NOT_VISIBLE = KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE.toNegAted();
/**  A context key thAt is set when the find widget find input in integrAted terminAl is focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED = new RAwContextKey<booleAn>('terminAlFindInputFocused', fAlse);
/**  A context key thAt is set when the find widget in integrAted terminAl is focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED = new RAwContextKey<booleAn>('terminAlFindFocused', fAlse);
/**  A context key thAt is set when the find widget find input in integrAted terminAl is not focused. */
export const KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_NOT_FOCUSED = KEYBINDING_CONTEXT_TERMINAL_FIND_INPUT_FOCUSED.toNegAted();

export const KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED = new RAwContextKey<booleAn>('terminAlProcessSupported', fAlse);

export const IS_WORKSPACE_SHELL_ALLOWED_STORAGE_KEY = 'terminAl.integrAted.isWorkspAceShellAllowed';
export const NEVER_MEASURE_RENDER_TIME_STORAGE_KEY = 'terminAl.integrAted.neverMeAsureRenderTime';

// The creAtion of extension host terminAls is delAyed by this vAlue (milliseconds). The purpose of
// this delAy is to Allow the terminAl instAnce to initiAlize correctly And hAve its ID set before
// trying to creAte the corressponding object on the ext host.
export const EXT_HOST_CREATION_DELAY = 100;

export const TerminAlCursorStyle = {
	BLOCK: 'block',
	LINE: 'line',
	UNDERLINE: 'underline'
};

export const TERMINAL_CONFIG_SECTION = 'terminAl.integrAted';

export const TERMINAL_ACTION_CATEGORY = nls.locAlize('terminAlCAtegory', "TerminAl");

export const DEFAULT_LETTER_SPACING = 0;
export const MINIMUM_LETTER_SPACING = -5;
export const DEFAULT_LINE_HEIGHT = 1;

export const MINIMUM_FONT_WEIGHT = 1;
export const MAXIMUM_FONT_WEIGHT = 1000;
export const DEFAULT_FONT_WEIGHT = 'normAl';
export const DEFAULT_BOLD_FONT_WEIGHT = 'bold';
export const SUGGESTIONS_FONT_WEIGHT = ['normAl', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

export type FontWeight = 'normAl' | 'bold' | number;

export interfAce ITerminAlConfigurAtion {
	shell: {
		linux: string | null;
		osx: string | null;
		windows: string | null;
	};
	AutomAtionShell: {
		linux: string | null;
		osx: string | null;
		windows: string | null;
	};
	shellArgs: {
		linux: string[];
		osx: string[];
		windows: string[];
	};
	mAcOptionIsMetA: booleAn;
	mAcOptionClickForcesSelection: booleAn;
	rendererType: 'Auto' | 'cAnvAs' | 'dom' | 'experimentAlWebgl';
	rightClickBehAvior: 'defAult' | 'copyPAste' | 'pAste' | 'selectWord';
	cursorBlinking: booleAn;
	cursorStyle: string;
	cursorWidth: number;
	drAwBoldTextInBrightColors: booleAn;
	fAstScrollSensitivity: number;
	fontFAmily: string;
	fontWeight: FontWeight;
	fontWeightBold: FontWeight;
	minimumContrAstRAtio: number;
	mouseWheelScrollSensitivity: number;
	// fontLigAtures: booleAn;
	fontSize: number;
	letterSpAcing: number;
	lineHeight: number;
	detectLocAle: 'Auto' | 'off' | 'on';
	scrollbAck: number;
	commAndsToSkipShell: string[];
	AllowChords: booleAn;
	AllowMnemonics: booleAn;
	cwd: string;
	confirmOnExit: booleAn;
	enAbleBell: booleAn;
	inheritEnv: booleAn;
	env: {
		linux: { [key: string]: string };
		osx: { [key: string]: string };
		windows: { [key: string]: string };
	};
	environmentChAngesIndicAtor: 'off' | 'on' | 'wArnonly';
	showExitAlert: booleAn;
	splitCwd: 'workspAceRoot' | 'initiAl' | 'inherited';
	windowsEnAbleConpty: booleAn;
	wordSepArAtors: string;
	experimentAlUseTitleEvent: booleAn;
	enAbleFileLinks: booleAn;
	unicodeVersion: '6' | '11';
	experimentAlLinkProvider: booleAn;
	typeAheAdThreshold: number;
	typeAheAdStyle: number | string;
}

export interfAce ITerminAlConfigHelper {
	config: ITerminAlConfigurAtion;

	onWorkspAcePermissionsChAnged: Event<booleAn>;

	configFontIsMonospAce(): booleAn;
	getFont(): ITerminAlFont;
	/** Sets whether A workspAce shell configurAtion is Allowed or not */
	setWorkspAceShellAllowed(isAllowed: booleAn): void;
	checkWorkspAceShellPermissions(osOverride?: OperAtingSystem): booleAn;
	showRecommendAtions(shellLAunchConfig: IShellLAunchConfig): void;
}

export interfAce ITerminAlFont {
	fontFAmily: string;
	fontSize: number;
	letterSpAcing: number;
	lineHeight: number;
	chArWidth?: number;
	chArHeight?: number;
}

export interfAce ITerminAlEnvironment {
	[key: string]: string | null;
}

export interfAce IShellLAunchConfig {
	/**
	 * The nAme of the terminAl, if this is not set the nAme of the process will be used.
	 */
	nAme?: string;

	/**
	 * The shell executAble (bAsh, cmd, etc.).
	 */
	executAble?: string;

	/**
	 * The CLI Arguments to use with executAble, A string[] is in Argv formAt And will be escAped,
	 * A string is in "CommAndLine" pre-escAped formAt And will be used As is. The string option is
	 * only supported on Windows And will throw An exception if used on mAcOS or Linux.
	 */
	Args?: string[] | string;

	/**
	 * The current working directory of the terminAl, this overrides the `terminAl.integrAted.cwd`
	 * settings key.
	 */
	cwd?: string | URI;

	/**
	 * A custom environment for the terminAl, if this is not set the environment will be inherited
	 * from the VS Code process.
	 */
	env?: ITerminAlEnvironment;

	/**
	 * Whether to ignore A custom cwd from the `terminAl.integrAted.cwd` settings key (e.g. if the
	 * shell is being lAunched by An extension).
	 */
	ignoreConfigurAtionCwd?: booleAn;

	/** Whether to wAit for A key press before closing the terminAl. */
	wAitOnExit?: booleAn | string;

	/**
	 * A string including ANSI escApe sequences thAt will be written to the terminAl emulAtor
	 * _before_ the terminAl process hAs lAunched, A trAiling \n is Added At the end of the string.
	 * This Allows for exAmple the terminAl instAnce to displAy A styled messAge As the first line
	 * of the terminAl. Use \x1b over \033 or \e for the escApe control chArActer.
	 */
	initiAlText?: string;

	/**
	 * Whether An extension is controlling the terminAl viA A `vscode.PseudoterminAl`.
	 */
	isExtensionTerminAl?: booleAn;

	/**
	 * Whether the terminAl process environment should be exActly As provided in
	 * `TerminAlOptions.env`. When this is fAlse (defAult), the environment will be bAsed on the
	 * window's environment And Also Apply configured plAtform settings like
	 * `terminAl.integrAted.windows.env` on top. When this is true, the complete environment must be
	 * provided As nothing will be inherited from the process or Any configurAtion.
	 */
	strictEnv?: booleAn;

	/**
	 * When enAbled the terminAl will run the process As normAl but not be surfAced to the user
	 * until `TerminAl.show` is cAlled. The typicAl usAge for this is when you need to run
	 * something thAt mAy need interActivity but only wAnt to tell the user About it when
	 * interAction is needed. Note thAt the terminAls will still be exposed to All extensions
	 * As normAl.
	 */
	hideFromUser?: booleAn;
}

/**
 * Provides Access to nAtive Windows cAlls thAt cAn be injected into non-nAtive lAyers.
 */
export interfAce ITerminAlNAtiveWindowsDelegAte {
	/**
	 * Gets the Windows build number, eg. this would be `19041` for Windows 10 version 2004
	 */
	getWindowsBuildNumber(): number;
	/**
	 * Converts A regulAr Windows pAth into the WSL pAth equivAlent, eg. `C:\` -> `/mnt/c`
	 * @pArAm pAth The Windows pAth.
	 */
	getWslPAth(pAth: string): Promise<string>;
}

export interfAce IShellDefinition {
	lAbel: string;
	pAth: string;
}

export interfAce ITerminAlDimensions {
	/**
	 * The columns of the terminAl.
	 */
	reAdonly cols: number;

	/**
	 * The rows of the terminAl.
	 */
	reAdonly rows: number;
}

export interfAce ICommAndTrAcker {
	scrollToPreviousCommAnd(): void;
	scrollToNextCommAnd(): void;
	selectToPreviousCommAnd(): void;
	selectToNextCommAnd(): void;
	selectToPreviousLine(): void;
	selectToNextLine(): void;
}

export interfAce INAvigAtionMode {
	exitNAvigAtionMode(): void;
	focusPreviousLine(): void;
	focusNextLine(): void;
}

export interfAce IBeforeProcessDAtAEvent {
	/**
	 * The dAtA of the event, this cAn be modified by the event listener to chAnge whAt gets sent
	 * to the terminAl.
	 */
	dAtA: string;
}

export interfAce ITerminAlProcessMAnAger extends IDisposAble {
	reAdonly processStAte: ProcessStAte;
	reAdonly ptyProcessReAdy: Promise<void>;
	reAdonly shellProcessId: number | undefined;
	reAdonly remoteAuthority: string | undefined;
	reAdonly os: OperAtingSystem | undefined;
	reAdonly userHome: string | undefined;
	reAdonly environmentVAriAbleInfo: IEnvironmentVAriAbleInfo | undefined;

	reAdonly onProcessReAdy: Event<void>;
	reAdonly onBeforeProcessDAtA: Event<IBeforeProcessDAtAEvent>;
	reAdonly onProcessDAtA: Event<string>;
	reAdonly onProcessTitle: Event<string>;
	reAdonly onProcessExit: Event<number | undefined>;
	reAdonly onProcessOverrideDimensions: Event<ITerminAlDimensions | undefined>;
	reAdonly onProcessResolvedShellLAunchConfig: Event<IShellLAunchConfig>;
	reAdonly onEnvironmentVAriAbleInfoChAnged: Event<IEnvironmentVAriAbleInfo>;

	dispose(immediAte?: booleAn): void;
	creAteProcess(shellLAunchConfig: IShellLAunchConfig, cols: number, rows: number, isScreenReAderModeEnAbled: booleAn): Promise<ITerminAlLAunchError | undefined>;
	write(dAtA: string): void;
	setDimensions(cols: number, rows: number): void;

	getInitiAlCwd(): Promise<string>;
	getCwd(): Promise<string>;
	getLAtency(): Promise<number>;
}

export const enum ProcessStAte {
	// The process hAs not been initiAlized yet.
	UNINITIALIZED,
	// The process is currently lAunching, the process is mArked As lAunching
	// for A short durAtion After being creAted And is helpful to indicAte
	// whether the process died As A result of bAd shell And Args.
	LAUNCHING,
	// The process is running normAlly.
	RUNNING,
	// The process wAs killed during lAunch, likely As A result of bAd shell And
	// Args.
	KILLED_DURING_LAUNCH,
	// The process wAs killed by the user (the event originAted from VS Code).
	KILLED_BY_USER,
	// The process wAs killed by itself, for exAmple the shell crAshed or `exit`
	// wAs run.
	KILLED_BY_PROCESS
}

export interfAce ITerminAlProcessExtHostProxy extends IDisposAble {
	reAdonly terminAlId: number;

	emitDAtA(dAtA: string): void;
	emitTitle(title: string): void;
	emitReAdy(pid: number, cwd: string): void;
	emitExit(exitCode: number | undefined): void;
	emitOverrideDimensions(dimensions: ITerminAlDimensions | undefined): void;
	emitResolvedShellLAunchConfig(shellLAunchConfig: IShellLAunchConfig): void;
	emitInitiAlCwd(initiAlCwd: string): void;
	emitCwd(cwd: string): void;
	emitLAtency(lAtency: number): void;

	onInput: Event<string>;
	onResize: Event<{ cols: number, rows: number }>;
	onShutdown: Event<booleAn>;
	onRequestInitiAlCwd: Event<void>;
	onRequestCwd: Event<void>;
	onRequestLAtency: Event<void>;
}

export interfAce ISpAwnExtHostProcessRequest {
	proxy: ITerminAlProcessExtHostProxy;
	shellLAunchConfig: IShellLAunchConfig;
	ActiveWorkspAceRootUri: URI | undefined;
	cols: number;
	rows: number;
	isWorkspAceShellAllowed: booleAn;
	cAllbAck: (error: ITerminAlLAunchError | undefined) => void;
}

export interfAce IStArtExtensionTerminAlRequest {
	proxy: ITerminAlProcessExtHostProxy;
	cols: number;
	rows: number;
	cAllbAck: (error: ITerminAlLAunchError | undefined) => void;
}

export interfAce IAvAilAbleShellsRequest {
	cAllbAck: (shells: IShellDefinition[]) => void;
}

export interfAce IDefAultShellAndArgsRequest {
	useAutomAtionShell: booleAn;
	cAllbAck: (shell: string, Args: string[] | string | undefined) => void;
}

export enum LinuxDistro {
	FedorA,
	Ubuntu,
	Unknown
}

export enum TitleEventSource {
	/** From the API or the renAme commAnd thAt overrides Any other type */
	Api,
	/** From the process nAme property*/
	Process,
	/** From the VT sequence */
	Sequence
}

export interfAce IWindowsShellHelper extends IDisposAble {
	reAdonly onShellNAmeChAnge: Event<string>;

	getShellNAme(): Promise<string>;
}

export interfAce ITerminAlLAunchError {
	messAge: string;
	code?: number;
}

/**
 * An interfAce representing A rAw terminAl child process, this contAins A subset of the
 * child_process.ChildProcess node.js interfAce.
 */
export interfAce ITerminAlChildProcess {
	onProcessDAtA: Event<string>;
	onProcessExit: Event<number | undefined>;
	onProcessReAdy: Event<{ pid: number, cwd: string }>;
	onProcessTitleChAnged: Event<string>;
	onProcessOverrideDimensions?: Event<ITerminAlDimensions | undefined>;
	onProcessResolvedShellLAunchConfig?: Event<IShellLAunchConfig>;

	/**
	 * StArts the process.
	 *
	 * @returns undefined when the process wAs successfully stArted, otherwise An object contAining
	 * informAtion on whAt went wrong.
	 */
	stArt(): Promise<ITerminAlLAunchError | undefined>;

	/**
	 * Shutdown the terminAl process.
	 *
	 * @pArAm immediAte When true the process will be killed immediAtely, otherwise the process will
	 * be given some time to mAke sure no AdditionAl dAtA comes through.
	 */
	shutdown(immediAte: booleAn): void;
	input(dAtA: string): void;
	resize(cols: number, rows: number): void;

	getInitiAlCwd(): Promise<string>;
	getCwd(): Promise<string>;
	getLAtency(): Promise<number>;
}

export const enum TERMINAL_COMMAND_ID {
	FIND_NEXT = 'workbench.Action.terminAl.findNext',
	FIND_PREVIOUS = 'workbench.Action.terminAl.findPrevious',
	TOGGLE = 'workbench.Action.terminAl.toggleTerminAl',
	KILL = 'workbench.Action.terminAl.kill',
	QUICK_KILL = 'workbench.Action.terminAl.quickKill',
	COPY_SELECTION = 'workbench.Action.terminAl.copySelection',
	SELECT_ALL = 'workbench.Action.terminAl.selectAll',
	DELETE_WORD_LEFT = 'workbench.Action.terminAl.deleteWordLeft',
	DELETE_WORD_RIGHT = 'workbench.Action.terminAl.deleteWordRight',
	DELETE_TO_LINE_START = 'workbench.Action.terminAl.deleteToLineStArt',
	MOVE_TO_LINE_START = 'workbench.Action.terminAl.moveToLineStArt',
	MOVE_TO_LINE_END = 'workbench.Action.terminAl.moveToLineEnd',
	NEW = 'workbench.Action.terminAl.new',
	NEW_WITH_CWD = 'workbench.Action.terminAl.newWithCwd',
	NEW_LOCAL = 'workbench.Action.terminAl.newLocAl',
	NEW_IN_ACTIVE_WORKSPACE = 'workbench.Action.terminAl.newInActiveWorkspAce',
	SPLIT = 'workbench.Action.terminAl.split',
	SPLIT_IN_ACTIVE_WORKSPACE = 'workbench.Action.terminAl.splitInActiveWorkspAce',
	RELAUNCH = 'workbench.Action.terminAl.relAunch',
	FOCUS_PREVIOUS_PANE = 'workbench.Action.terminAl.focusPreviousPAne',
	FOCUS_NEXT_PANE = 'workbench.Action.terminAl.focusNextPAne',
	RESIZE_PANE_LEFT = 'workbench.Action.terminAl.resizePAneLeft',
	RESIZE_PANE_RIGHT = 'workbench.Action.terminAl.resizePAneRight',
	RESIZE_PANE_UP = 'workbench.Action.terminAl.resizePAneUp',
	RESIZE_PANE_DOWN = 'workbench.Action.terminAl.resizePAneDown',
	FOCUS = 'workbench.Action.terminAl.focus',
	FOCUS_NEXT = 'workbench.Action.terminAl.focusNext',
	FOCUS_PREVIOUS = 'workbench.Action.terminAl.focusPrevious',
	PASTE = 'workbench.Action.terminAl.pAste',
	SELECT_DEFAULT_SHELL = 'workbench.Action.terminAl.selectDefAultShell',
	RUN_SELECTED_TEXT = 'workbench.Action.terminAl.runSelectedText',
	RUN_ACTIVE_FILE = 'workbench.Action.terminAl.runActiveFile',
	SWITCH_TERMINAL = 'workbench.Action.terminAl.switchTerminAl',
	SCROLL_DOWN_LINE = 'workbench.Action.terminAl.scrollDown',
	SCROLL_DOWN_PAGE = 'workbench.Action.terminAl.scrollDownPAge',
	SCROLL_TO_BOTTOM = 'workbench.Action.terminAl.scrollToBottom',
	SCROLL_UP_LINE = 'workbench.Action.terminAl.scrollUp',
	SCROLL_UP_PAGE = 'workbench.Action.terminAl.scrollUpPAge',
	SCROLL_TO_TOP = 'workbench.Action.terminAl.scrollToTop',
	CLEAR = 'workbench.Action.terminAl.cleAr',
	CLEAR_SELECTION = 'workbench.Action.terminAl.cleArSelection',
	MANAGE_WORKSPACE_SHELL_PERMISSIONS = 'workbench.Action.terminAl.mAnAgeWorkspAceShellPermissions',
	RENAME = 'workbench.Action.terminAl.renAme',
	RENAME_WITH_ARG = 'workbench.Action.terminAl.renAmeWithArg',
	FIND_FOCUS = 'workbench.Action.terminAl.focusFind',
	FIND_HIDE = 'workbench.Action.terminAl.hideFind',
	QUICK_OPEN_TERM = 'workbench.Action.quickOpenTerm',
	SCROLL_TO_PREVIOUS_COMMAND = 'workbench.Action.terminAl.scrollToPreviousCommAnd',
	SCROLL_TO_NEXT_COMMAND = 'workbench.Action.terminAl.scrollToNextCommAnd',
	SELECT_TO_PREVIOUS_COMMAND = 'workbench.Action.terminAl.selectToPreviousCommAnd',
	SELECT_TO_NEXT_COMMAND = 'workbench.Action.terminAl.selectToNextCommAnd',
	SELECT_TO_PREVIOUS_LINE = 'workbench.Action.terminAl.selectToPreviousLine',
	SELECT_TO_NEXT_LINE = 'workbench.Action.terminAl.selectToNextLine',
	TOGGLE_ESCAPE_SEQUENCE_LOGGING = 'toggleEscApeSequenceLogging',
	SEND_SEQUENCE = 'workbench.Action.terminAl.sendSequence',
	TOGGLE_FIND_REGEX = 'workbench.Action.terminAl.toggleFindRegex',
	TOGGLE_FIND_WHOLE_WORD = 'workbench.Action.terminAl.toggleFindWholeWord',
	TOGGLE_FIND_CASE_SENSITIVE = 'workbench.Action.terminAl.toggleFindCAseSensitive',
	NAVIGATION_MODE_EXIT = 'workbench.Action.terminAl.nAvigAtionModeExit',
	NAVIGATION_MODE_FOCUS_NEXT = 'workbench.Action.terminAl.nAvigAtionModeFocusNext',
	NAVIGATION_MODE_FOCUS_PREVIOUS = 'workbench.Action.terminAl.nAvigAtionModeFocusPrevious',
	SHOW_ENVIRONMENT_INFORMATION = 'workbench.Action.terminAl.showEnvironmentInformAtion',
	SEARCH_WORKSPACE = 'workbench.Action.terminAl.seArchWorkspAce'
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
	'editor.Action.toggleTAbFocusMode',
	'workbench.Action.quickOpen',
	'workbench.Action.quickOpenPreviousEditor',
	'workbench.Action.showCommAnds',
	'workbench.Action.tAsks.build',
	'workbench.Action.tAsks.restArtTAsk',
	'workbench.Action.tAsks.runTAsk',
	'workbench.Action.tAsks.reRunTAsk',
	'workbench.Action.tAsks.showLog',
	'workbench.Action.tAsks.showTAsks',
	'workbench.Action.tAsks.terminAte',
	'workbench.Action.tAsks.test',
	'workbench.Action.toggleFullScreen',
	'workbench.Action.terminAl.focusAtIndex1',
	'workbench.Action.terminAl.focusAtIndex2',
	'workbench.Action.terminAl.focusAtIndex3',
	'workbench.Action.terminAl.focusAtIndex4',
	'workbench.Action.terminAl.focusAtIndex5',
	'workbench.Action.terminAl.focusAtIndex6',
	'workbench.Action.terminAl.focusAtIndex7',
	'workbench.Action.terminAl.focusAtIndex8',
	'workbench.Action.terminAl.focusAtIndex9',
	'workbench.Action.focusSecondEditorGroup',
	'workbench.Action.focusThirdEditorGroup',
	'workbench.Action.focusFourthEditorGroup',
	'workbench.Action.focusFifthEditorGroup',
	'workbench.Action.focusSixthEditorGroup',
	'workbench.Action.focusSeventhEditorGroup',
	'workbench.Action.focusEighthEditorGroup',
	'workbench.Action.focusNextPArt',
	'workbench.Action.focusPreviousPArt',
	'workbench.Action.nextPAnelView',
	'workbench.Action.previousPAnelView',
	'workbench.Action.nextSideBArView',
	'workbench.Action.previousSideBArView',
	'workbench.Action.debug.stArt',
	'workbench.Action.debug.stop',
	'workbench.Action.debug.run',
	'workbench.Action.debug.restArt',
	'workbench.Action.debug.continue',
	'workbench.Action.debug.pAuse',
	'workbench.Action.debug.stepInto',
	'workbench.Action.debug.stepOut',
	'workbench.Action.debug.stepOver',
	'workbench.Action.nextEditor',
	'workbench.Action.previousEditor',
	'workbench.Action.nextEditorInGroup',
	'workbench.Action.previousEditorInGroup',
	'workbench.Action.openNextRecentlyUsedEditor',
	'workbench.Action.openPreviousRecentlyUsedEditor',
	'workbench.Action.openNextRecentlyUsedEditorInGroup',
	'workbench.Action.openPreviousRecentlyUsedEditorInGroup',
	'workbench.Action.quickOpenPreviousRecentlyUsedEditor',
	'workbench.Action.quickOpenLeAstRecentlyUsedEditor',
	'workbench.Action.quickOpenPreviousRecentlyUsedEditorInGroup',
	'workbench.Action.quickOpenLeAstRecentlyUsedEditorInGroup',
	'workbench.Action.focusActiveEditorGroup',
	'workbench.Action.focusFirstEditorGroup',
	'workbench.Action.focusLAstEditorGroup',
	'workbench.Action.firstEditorInGroup',
	'workbench.Action.lAstEditorInGroup',
	'workbench.Action.nAvigAteUp',
	'workbench.Action.nAvigAteDown',
	'workbench.Action.nAvigAteRight',
	'workbench.Action.nAvigAteLeft',
	'workbench.Action.togglePAnel',
	'workbench.Action.quickOpenView',
	'workbench.Action.toggleMAximizedPAnel'
];

export interfAce ITerminAlContributions {
	types?: ITerminAlTypeContribution[];
}

export interfAce ITerminAlTypeContribution {
	title: string;
	commAnd: string;
}

export const terminAlContributionsDescriptor: IExtensionPointDescriptor = {
	extensionPoint: 'terminAl',
	defAultExtensionKind: 'workspAce',
	jsonSchemA: {
		description: nls.locAlize('vscode.extension.contributes.terminAl', 'Contributes terminAl functionAlity.'),
		type: 'object',
		properties: {
			types: {
				type: 'ArrAy',
				description: nls.locAlize('vscode.extension.contributes.terminAl.types', "Defines AdditionAl terminAl types thAt the user cAn creAte."),
				items: {
					type: 'object',
					required: ['commAnd', 'title'],
					properties: {
						commAnd: {
							description: nls.locAlize('vscode.extension.contributes.terminAl.types.commAnd', "CommAnd to execute when the user creAtes this type of terminAl."),
							type: 'string',
						},
						title: {
							description: nls.locAlize('vscode.extension.contributes.terminAl.types.title', "Title for this type of terminAl."),
							type: 'string',
						},
					},
				},
			},
		},
	},
};
