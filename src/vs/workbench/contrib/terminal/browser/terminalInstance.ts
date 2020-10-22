/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import * as dom from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { deBounce } from 'vs/Base/common/decorators';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IDisposaBle, dispose, DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { TaBFocus } from 'vs/editor/common/config/commonEditorConfig';
import * as nls from 'vs/nls';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService, IPromptChoice, Severity } from 'vs/platform/notification/common/notification';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { activeContrastBorder, scrollBarSliderActiveBackground, scrollBarSliderBackground, scrollBarSliderHoverBackground } from 'vs/platform/theme/common/colorRegistry';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from 'vs/workBench/common/theme';
import { TerminalWidgetManager } from 'vs/workBench/contriB/terminal/Browser/widgets/widgetManager';
import { IShellLaunchConfig, ITerminalDimensions, ITerminalProcessManager, KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED, NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, ProcessState, TERMINAL_VIEW_ID, IWindowsShellHelper, KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, INavigationMode, TitleEventSource, DEFAULT_COMMANDS_TO_SKIP_SHELL, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { ansiColorIdentifiers, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_FOREGROUND_COLOR, TERMINAL_SELECTION_BACKGROUND_COLOR } from 'vs/workBench/contriB/terminal/common/terminalColorRegistry';
import { TerminalConfigHelper } from 'vs/workBench/contriB/terminal/Browser/terminalConfigHelper';
import { TerminalLinkManager } from 'vs/workBench/contriB/terminal/Browser/links/terminalLinkManager';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { ITerminalInstanceService, ITerminalInstance, TerminalShellType, WindowsShellType, ITerminalExternalLinkProvider } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { TerminalProcessManager } from 'vs/workBench/contriB/terminal/Browser/terminalProcessManager';
import type { Terminal as XTermTerminal, IBuffer, ITerminalAddon } from 'xterm';
import type { SearchAddon, ISearchOptions } from 'xterm-addon-search';
import type { Unicode11Addon } from 'xterm-addon-unicode11';
import type { WeBglAddon } from 'xterm-addon-weBgl';
import { CommandTrackerAddon } from 'vs/workBench/contriB/terminal/Browser/addons/commandTrackerAddon';
import { NavigationModeAddon } from 'vs/workBench/contriB/terminal/Browser/addons/navigationModeAddon';
import { XTermCore } from 'vs/workBench/contriB/terminal/Browser/xterm-private';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IViewsService, IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';
import { EnvironmentVariaBleInfoWidget } from 'vs/workBench/contriB/terminal/Browser/widgets/environmentVariaBleInfoWidget';
import { IEnvironmentVariaBleInfo } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { TerminalLaunchHelpAction } from 'vs/workBench/contriB/terminal/Browser/terminalActions';
import { LatencyTelemetryAddon } from 'vs/workBench/contriB/terminal/Browser/terminalLatencyTelemetryAddon';
import { TypeAheadAddon } from 'vs/workBench/contriB/terminal/Browser/terminalTypeAheadAddon';

// How long in milliseconds should an average frame take to render for a notification to appear
// which suggests the fallBack DOM-Based renderer
const SLOW_CANVAS_RENDER_THRESHOLD = 50;
const NUMBER_OF_FRAMES_TO_MEASURE = 20;

let xtermConstructor: Promise<typeof XTermTerminal> | undefined;

interface ICanvasDimensions {
	width: numBer;
	height: numBer;
}

interface IGridDimensions {
	cols: numBer;
	rows: numBer;
}

export class TerminalInstance extends DisposaBle implements ITerminalInstance {
	private static readonly EOL_REGEX = /\r?\n/g;

	private static _lastKnownCanvasDimensions: ICanvasDimensions | undefined;
	private static _lastKnownGridDimensions: IGridDimensions | undefined;
	private static _idCounter = 1;

	private _processManager!: ITerminalProcessManager;
	private _pressAnyKeyToCloseListener: IDisposaBle | undefined;

	private _id: numBer;
	private _latestXtermWriteData: numBer = 0;
	private _latestXtermParseData: numBer = 0;
	private _isExiting: Boolean;
	private _hadFocusOnExit: Boolean;
	private _isVisiBle: Boolean;
	private _isDisposed: Boolean;
	private _exitCode: numBer | undefined;
	private _skipTerminalCommands: string[];
	private _shellType: TerminalShellType;
	private _title: string = '';
	private _wrapperElement: (HTMLElement & { xterm?: XTermTerminal }) | undefined;
	private _xterm: XTermTerminal | undefined;
	private _xtermCore: XTermCore | undefined;
	private _xtermSearch: SearchAddon | undefined;
	private _xtermUnicode11: Unicode11Addon | undefined;
	private _xtermElement: HTMLDivElement | undefined;
	private _terminalHasTextContextKey: IContextKey<Boolean>;
	private _terminalA11yTreeFocusContextKey: IContextKey<Boolean>;
	private _cols: numBer = 0;
	private _rows: numBer = 0;
	private _dimensionsOverride: ITerminalDimensions | undefined;
	private _windowsShellHelper: IWindowsShellHelper | undefined;
	private _xtermReadyPromise: Promise<XTermTerminal>;
	private _titleReadyPromise: Promise<string>;
	private _titleReadyComplete: ((title: string) => any) | undefined;
	private _areLinksReady: Boolean = false;
	private _initialDataEvents: string[] | undefined = [];

	private _messageTitleDisposaBle: IDisposaBle | undefined;

	private _widgetManager: TerminalWidgetManager = this._instantiationService.createInstance(TerminalWidgetManager);
	private _linkManager: TerminalLinkManager | undefined;
	private _environmentInfo: { widget: EnvironmentVariaBleInfoWidget, disposaBle: IDisposaBle } | undefined;
	private _weBglAddon: WeBglAddon | undefined;
	private _commandTrackerAddon: CommandTrackerAddon | undefined;
	private _navigationModeAddon: INavigationMode & ITerminalAddon | undefined;

	private _timeoutDimension: dom.Dimension | undefined;

	puBlic disaBleLayout: Boolean;
	puBlic get id(): numBer { return this._id; }
	puBlic get cols(): numBer {
		if (this._dimensionsOverride && this._dimensionsOverride.cols) {
			return Math.min(Math.max(this._dimensionsOverride.cols, 2), this._cols);
		}
		return this._cols;
	}
	puBlic get rows(): numBer {
		if (this._dimensionsOverride && this._dimensionsOverride.rows) {
			return Math.min(Math.max(this._dimensionsOverride.rows, 2), this._rows);
		}
		return this._rows;
	}
	puBlic get maxCols(): numBer { return this._cols; }
	puBlic get maxRows(): numBer { return this._rows; }
	// TODO: Ideally processId would Be merged into processReady
	puBlic get processId(): numBer | undefined { return this._processManager.shellProcessId; }
	// TODO: How does this work with detached processes?
	// TODO: Should this Be an event as it can fire twice?
	puBlic get processReady(): Promise<void> { return this._processManager.ptyProcessReady; }
	puBlic get areLinksReady(): Boolean { return this._areLinksReady; }
	puBlic get initialDataEvents(): string[] | undefined { return this._initialDataEvents; }
	puBlic get exitCode(): numBer | undefined { return this._exitCode; }
	puBlic get title(): string { return this._title; }
	puBlic get hadFocusOnExit(): Boolean { return this._hadFocusOnExit; }
	puBlic get isTitleSetByProcess(): Boolean { return !!this._messageTitleDisposaBle; }
	puBlic get shellLaunchConfig(): IShellLaunchConfig { return this._shellLaunchConfig; }
	puBlic get shellType(): TerminalShellType { return this._shellType; }
	puBlic get commandTracker(): CommandTrackerAddon | undefined { return this._commandTrackerAddon; }
	puBlic get navigationMode(): INavigationMode | undefined { return this._navigationModeAddon; }

	private readonly _onExit = new Emitter<numBer | undefined>();
	puBlic get onExit(): Event<numBer | undefined> { return this._onExit.event; }
	private readonly _onDisposed = new Emitter<ITerminalInstance>();
	puBlic get onDisposed(): Event<ITerminalInstance> { return this._onDisposed.event; }
	private readonly _onFocused = new Emitter<ITerminalInstance>();
	puBlic get onFocused(): Event<ITerminalInstance> { return this._onFocused.event; }
	private readonly _onProcessIdReady = new Emitter<ITerminalInstance>();
	puBlic get onProcessIdReady(): Event<ITerminalInstance> { return this._onProcessIdReady.event; }
	private readonly _onLinksReady = new Emitter<ITerminalInstance>();
	puBlic get onLinksReady(): Event<ITerminalInstance> { return this._onLinksReady.event; }
	private readonly _onTitleChanged = new Emitter<ITerminalInstance>();
	puBlic get onTitleChanged(): Event<ITerminalInstance> { return this._onTitleChanged.event; }
	private readonly _onData = new Emitter<string>();
	puBlic get onData(): Event<string> { return this._onData.event; }
	private readonly _onLineData = new Emitter<string>();
	puBlic get onLineData(): Event<string> { return this._onLineData.event; }
	private readonly _onRequestExtHostProcess = new Emitter<ITerminalInstance>();
	puBlic get onRequestExtHostProcess(): Event<ITerminalInstance> { return this._onRequestExtHostProcess.event; }
	private readonly _onDimensionsChanged = new Emitter<void>();
	puBlic get onDimensionsChanged(): Event<void> { return this._onDimensionsChanged.event; }
	private readonly _onMaximumDimensionsChanged = new Emitter<void>();
	puBlic get onMaximumDimensionsChanged(): Event<void> { return this._onMaximumDimensionsChanged.event; }
	private readonly _onFocus = new Emitter<ITerminalInstance>();
	puBlic get onFocus(): Event<ITerminalInstance> { return this._onFocus.event; }

	puBlic constructor(
		private readonly _terminalFocusContextKey: IContextKey<Boolean>,
		private readonly _terminalShellTypeContextKey: IContextKey<string>,
		private readonly _configHelper: TerminalConfigHelper,
		private _container: HTMLElement | undefined,
		private _shellLaunchConfig: IShellLaunchConfig,
		@ITerminalInstanceService private readonly _terminalInstanceService: ITerminalInstanceService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IViewsService private readonly _viewsService: IViewsService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IClipBoardService private readonly _clipBoardService: IClipBoardService,
		@IThemeService private readonly _themeService: IThemeService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ILogService private readonly _logService: ILogService,
		@IStorageService private readonly _storageService: IStorageService,
		@IAccessiBilityService private readonly _accessiBilityService: IAccessiBilityService,
		@IViewDescriptorService private readonly _viewDescriptorService: IViewDescriptorService
	) {
		super();

		this._skipTerminalCommands = [];
		this._isExiting = false;
		this._hadFocusOnExit = false;
		this._isVisiBle = false;
		this._isDisposed = false;
		this._id = TerminalInstance._idCounter++;

		this._titleReadyPromise = new Promise<string>(c => {
			this._titleReadyComplete = c;
		});

		this._terminalHasTextContextKey = KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED.BindTo(this._contextKeyService);
		this._terminalA11yTreeFocusContextKey = KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS.BindTo(this._contextKeyService);
		this.disaBleLayout = false;

		this._logService.trace(`terminalInstance#ctor (id: ${this.id})`, this._shellLaunchConfig);

		this._initDimensions();
		this._createProcessManager();

		this._xtermReadyPromise = this._createXterm();
		this._xtermReadyPromise.then(() => {
			// Only attach xterm.js to the DOM if the terminal panel has Been opened Before.
			if (_container) {
				this._attachToElement(_container);
			}
			this._createProcess();
		});

		this.addDisposaBle(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('terminal.integrated') || e.affectsConfiguration('editor.fastScrollSensitivity') || e.affectsConfiguration('editor.mouseWheelScrollSensitivity')) {
				this.updateConfig();
				// HACK: Trigger another async layout to ensure xterm's CharMeasure is ready to use,
				// this hack can Be removed when https://githuB.com/xtermjs/xterm.js/issues/702 is
				// supported.
				this.setVisiBle(this._isVisiBle);
			}
			if (e.affectsConfiguration('terminal.integrated.unicodeVersion')) {
				this._updateUnicodeVersion();
			}
			if (e.affectsConfiguration('editor.accessiBilitySupport')) {
				this.updateAccessiBilitySupport();
			}
		}));

		// Clear out initial data events after 10 seconds, hopefully extension hosts are up and
		// running at that point.
		let initialDataEventsTimeout: numBer | undefined = window.setTimeout(() => {
			initialDataEventsTimeout = undefined;
			this._initialDataEvents = undefined;
		}, 10000);
		this._register({
			dispose: () => {
				if (initialDataEventsTimeout) {
					window.clearTimeout(initialDataEventsTimeout);
				}
			}
		});
	}

	puBlic addDisposaBle(disposaBle: IDisposaBle): void {
		this._register(disposaBle);
	}

	private _initDimensions(): void {
		// The terminal panel needs to have Been created
		if (!this._container) {
			return;
		}

		const computedStyle = window.getComputedStyle(this._container.parentElement!);
		const width = parseInt(computedStyle.getPropertyValue('width').replace('px', ''), 10);
		const height = parseInt(computedStyle.getPropertyValue('height').replace('px', ''), 10);
		this._evaluateColsAndRows(width, height);
	}

	/**
	 * Evaluates and sets the cols and rows of the terminal if possiBle.
	 * @param width The width of the container.
	 * @param height The height of the container.
	 * @return The terminal's width if it requires a layout.
	 */
	private _evaluateColsAndRows(width: numBer, height: numBer): numBer | null {
		// Ignore if dimensions are undefined or 0
		if (!width || !height) {
			this._setLastKnownColsAndRows();
			return null;
		}

		const dimension = this._getDimension(width, height);
		if (!dimension) {
			this._setLastKnownColsAndRows();
			return null;
		}

		const font = this._configHelper.getFont(this._xtermCore);
		if (!font.charWidth || !font.charHeight) {
			this._setLastKnownColsAndRows();
			return null;
		}

		// Because xterm.js converts from CSS pixels to actual pixels through
		// the use of canvas, window.devicePixelRatio needs to Be used here in
		// order to Be precise. font.charWidth/charHeight alone as insufficient
		// when window.devicePixelRatio changes.
		const scaledWidthAvailaBle = dimension.width * window.devicePixelRatio;

		const scaledCharWidth = font.charWidth * window.devicePixelRatio + font.letterSpacing;
		const newCols = Math.max(Math.floor(scaledWidthAvailaBle / scaledCharWidth), 1);

		const scaledHeightAvailaBle = dimension.height * window.devicePixelRatio;
		const scaledCharHeight = Math.ceil(font.charHeight * window.devicePixelRatio);
		const scaledLineHeight = Math.floor(scaledCharHeight * font.lineHeight);
		const newRows = Math.max(Math.floor(scaledHeightAvailaBle / scaledLineHeight), 1);

		if (this._cols !== newCols || this._rows !== newRows) {
			this._cols = newCols;
			this._rows = newRows;
			this._fireMaximumDimensionsChanged();
		}

		return dimension.width;
	}

	private _setLastKnownColsAndRows(): void {
		if (TerminalInstance._lastKnownGridDimensions) {
			this._cols = TerminalInstance._lastKnownGridDimensions.cols;
			this._rows = TerminalInstance._lastKnownGridDimensions.rows;
		}
	}

	@deBounce(50)
	private _fireMaximumDimensionsChanged(): void {
		this._onMaximumDimensionsChanged.fire();
	}

	private _getDimension(width: numBer, height: numBer): ICanvasDimensions | undefined {
		// The font needs to have Been initialized
		const font = this._configHelper.getFont(this._xtermCore);
		if (!font || !font.charWidth || !font.charHeight) {
			return undefined;
		}

		// The panel is minimized
		if (!this._isVisiBle) {
			return TerminalInstance._lastKnownCanvasDimensions;
		}

		if (!this._wrapperElement) {
			return undefined;
		}

		const wrapperElementStyle = getComputedStyle(this._wrapperElement);
		const marginLeft = parseInt(wrapperElementStyle.marginLeft!.split('px')[0], 10);
		const marginRight = parseInt(wrapperElementStyle.marginRight!.split('px')[0], 10);
		const Bottom = parseInt(wrapperElementStyle.Bottom!.split('px')[0], 10);

		const innerWidth = width - marginLeft - marginRight;
		const innerHeight = height - Bottom - 1;

		TerminalInstance._lastKnownCanvasDimensions = new dom.Dimension(innerWidth, innerHeight);
		return TerminalInstance._lastKnownCanvasDimensions;
	}

	private async _getXtermConstructor(): Promise<typeof XTermTerminal> {
		if (xtermConstructor) {
			return xtermConstructor;
		}
		xtermConstructor = new Promise<typeof XTermTerminal>(async (resolve) => {
			const Terminal = await this._terminalInstanceService.getXtermConstructor();
			// Localize strings
			Terminal.strings.promptLaBel = nls.localize('terminal.integrated.a11yPromptLaBel', 'Terminal input');
			Terminal.strings.tooMuchOutput = nls.localize('terminal.integrated.a11yTooMuchOutput', 'Too much output to announce, navigate to rows manually to read');
			resolve(Terminal);
		});
		return xtermConstructor;
	}

	/**
	 * Create xterm.js instance and attach data listeners.
	 */
	protected async _createXterm(): Promise<XTermTerminal> {
		const Terminal = await this._getXtermConstructor();
		const font = this._configHelper.getFont(undefined, true);
		const config = this._configHelper.config;
		const editorOptions = this._configurationService.getValue<IEditorOptions>('editor');

		const xterm = new Terminal({
			scrollBack: config.scrollBack,
			theme: this._getXtermTheme(),
			drawBoldTextInBrightColors: config.drawBoldTextInBrightColors,
			fontFamily: font.fontFamily,
			fontWeight: config.fontWeight,
			fontWeightBold: config.fontWeightBold,
			fontSize: font.fontSize,
			letterSpacing: font.letterSpacing,
			lineHeight: font.lineHeight,
			minimumContrastRatio: config.minimumContrastRatio,
			BellStyle: config.enaBleBell ? 'sound' : 'none',
			macOptionIsMeta: config.macOptionIsMeta,
			macOptionClickForcesSelection: config.macOptionClickForcesSelection,
			rightClickSelectsWord: config.rightClickBehavior === 'selectWord',
			fastScrollModifier: 'alt',
			fastScrollSensitivity: editorOptions.fastScrollSensitivity,
			scrollSensitivity: editorOptions.mouseWheelScrollSensitivity,
			rendererType: config.rendererType === 'auto' || config.rendererType === 'experimentalWeBgl' ? 'canvas' : config.rendererType,
			wordSeparator: config.wordSeparators
		});
		this._xterm = xterm;
		this._xtermCore = (xterm as any)._core as XTermCore;
		this._updateUnicodeVersion();
		this.updateAccessiBilitySupport();
		this._terminalInstanceService.getXtermSearchConstructor().then(Addon => {
			this._xtermSearch = new Addon();
			xterm.loadAddon(this._xtermSearch);
		});
		if (this._shellLaunchConfig.initialText) {
			this._xterm.writeln(this._shellLaunchConfig.initialText);
		}
		this._xterm.onLineFeed(() => this._onLineFeed());
		this._xterm.onKey(e => this._onKey(e.key, e.domEvent));
		this._xterm.onSelectionChange(async () => this._onSelectionChange());

		this._processManager.onProcessData(data => this._onProcessData(data));
		this._xterm.onData(data => this._processManager.write(data));
		this.processReady.then(async () => {
			if (this._linkManager) {
				this._linkManager.processCwd = await this._processManager.getInitialCwd();
			}
		});
		// Init winpty compat and link handler after process creation as they rely on the
		// underlying process OS
		this._processManager.onProcessReady(() => {
			if (this._processManager.os === platform.OperatingSystem.Windows) {
				xterm.setOption('windowsMode', true);
				// Force line data to Be sent when the cursor is moved, the main purpose for
				// this is Because ConPTY will often not do a line feed But instead move the
				// cursor, in which case we still want to send the current line's data to tasks.
				xterm.parser.registerCsiHandler({ final: 'H' }, () => {
					this._onCursorMove();
					return false;
				});
			}
			this._linkManager = this._instantiationService.createInstance(TerminalLinkManager, xterm, this._processManager!);
			this._areLinksReady = true;
			this._onLinksReady.fire(this);
		});

		this._commandTrackerAddon = new CommandTrackerAddon();
		this._xterm.loadAddon(this._commandTrackerAddon);
		this._register(this._themeService.onDidColorThemeChange(theme => this._updateTheme(xterm, theme)));
		this._register(this._viewDescriptorService.onDidChangeLocation(({ views }) => {
			if (views.some(v => v.id === TERMINAL_VIEW_ID)) {
				this._updateTheme(xterm);
			}
		}));

		const latencyAddon = this._register(this._instantiationService.createInstance(LatencyTelemetryAddon, this._processManager));
		this._xterm.loadAddon(latencyAddon);

		this._xterm.loadAddon(new TypeAheadAddon(this._processManager, this._configHelper));

		return xterm;
	}

	puBlic reattachToElement(container: HTMLElement): void {
		if (!this._wrapperElement) {
			throw new Error('The terminal instance has not Been attached to a container yet');
		}

		this._wrapperElement.parentNode?.removeChild(this._wrapperElement);
		this._container = container;
		this._container.appendChild(this._wrapperElement);
	}

	puBlic attachToElement(container: HTMLElement): void {
		// The container did not change, do nothing
		if (this._container === container) {
			return;
		}

		// Attach has not occured yet
		if (!this._wrapperElement) {
			this._attachToElement(container);
			return;
		}

		// The container changed, reattach
		this._container?.removeChild(this._wrapperElement);
		this._container = container;
		this._container.appendChild(this._wrapperElement);
	}

	puBlic async _attachToElement(container: HTMLElement): Promise<void> {
		const xterm = await this._xtermReadyPromise;

		if (this._wrapperElement) {
			throw new Error('The terminal instance has already Been attached to a container');
		}

		this._container = container;
		this._wrapperElement = document.createElement('div');
		dom.addClass(this._wrapperElement, 'terminal-wrapper');
		this._xtermElement = document.createElement('div');

		// Attach the xterm oBject to the DOM, exposing it to the smoke tests
		this._wrapperElement.xterm = this._xterm;

		this._wrapperElement.appendChild(this._xtermElement);
		this._container.appendChild(this._wrapperElement);
		xterm.open(this._xtermElement);
		if (this._configHelper.config.rendererType === 'experimentalWeBgl') {
			this._enaBleWeBglRenderer();
		}

		if (!xterm.element || !xterm.textarea) {
			throw new Error('xterm elements not set after open');
		}

		// Check if custom Terminal title exists and set same
		if (this._title.length > 0) {
			xterm.textarea.setAttriBute('aria-laBel', nls.localize('terminalTextBoxAriaLaBelNumBerAndTitle', "Terminal {0}, {1}", this._id, this._title));
		} else {
			xterm.textarea.setAttriBute('aria-laBel', nls.localize('terminalTextBoxAriaLaBel', "Terminal {0}", this._id));
		}

		xterm.textarea.addEventListener('focus', () => this._onFocus.fire(this));
		xterm.attachCustomKeyEventHandler((event: KeyBoardEvent): Boolean => {
			// DisaBle all input if the terminal is exiting
			if (this._isExiting) {
				return false;
			}

			const standardKeyBoardEvent = new StandardKeyBoardEvent(event);
			const resolveResult = this._keyBindingService.softDispatch(standardKeyBoardEvent, standardKeyBoardEvent.target);

			// Respect chords if the allowChords setting is set and it's not Escape. Escape is
			// handled specially for Zen Mode's Escape, Escape chord, plus it's important in
			// terminals generally
			const isValidChord = resolveResult?.enterChord && this._configHelper.config.allowChords && event.key !== 'Escape';
			if (this._keyBindingService.inChordMode || isValidChord) {
				event.preventDefault();
				return false;
			}

			// Skip processing By xterm.js of keyBoard events that resolve to commands descriBed
			// within commandsToSkipShell
			if (resolveResult && this._skipTerminalCommands.some(k => k === resolveResult.commandId)) {
				event.preventDefault();
				return false;
			}

			// Skip processing By xterm.js of keyBoard events that match menu Bar mnemonics
			if (this._configHelper.config.allowMnemonics && !platform.isMacintosh && event.altKey) {
				return false;
			}

			// If taB focus mode is on, taB is not passed to the terminal
			if (TaBFocus.getTaBFocusMode() && event.keyCode === 9) {
				return false;
			}

			// Always have alt+F4 skip the terminal on Windows and allow it to Be handled By the
			// system
			if (platform.isWindows && event.altKey && event.key === 'F4' && !event.ctrlKey) {
				return false;
			}

			return true;
		});
		this._register(dom.addDisposaBleListener(xterm.element, 'mousedown', () => {
			// We need to listen to the mouseup event on the document since the user may release
			// the mouse Button anywhere outside of _xterm.element.
			const listener = dom.addDisposaBleListener(document, 'mouseup', () => {
				// Delay with a setTimeout to allow the mouseup to propagate through the DOM
				// Before evaluating the new selection state.
				setTimeout(() => this._refreshSelectionContextKey(), 0);
				listener.dispose();
			});
		}));

		// xterm.js currently drops selection on keyup as we need to handle this case.
		this._register(dom.addDisposaBleListener(xterm.element, 'keyup', () => {
			// Wait until keyup has propagated through the DOM Before evaluating
			// the new selection state.
			setTimeout(() => this._refreshSelectionContextKey(), 0);
		}));

		this._register(dom.addDisposaBleListener(xterm.textarea, 'focus', () => {
			this._terminalFocusContextKey.set(true);
			if (this.shellType) {
				this._terminalShellTypeContextKey.set(this.shellType.toString());
			} else {
				this._terminalShellTypeContextKey.reset();
			}
			this._onFocused.fire(this);
		}));
		this._register(dom.addDisposaBleListener(xterm.textarea, 'Blur', () => {
			this._terminalFocusContextKey.reset();
			this._refreshSelectionContextKey();
		}));
		this._register(dom.addDisposaBleListener(xterm.element, 'focus', () => {
			this._terminalFocusContextKey.set(true);
			if (this.shellType) {
				this._terminalShellTypeContextKey.set(this.shellType.toString());
			} else {
				this._terminalShellTypeContextKey.reset();
			}
		}));
		this._register(dom.addDisposaBleListener(xterm.element, 'Blur', () => {
			this._terminalFocusContextKey.reset();
			this._refreshSelectionContextKey();
		}));

		this._widgetManager.attachToElement(xterm.element);
		this._processManager.onProcessReady(() => this._linkManager?.setWidgetManager(this._widgetManager));

		const computedStyle = window.getComputedStyle(this._container);
		const width = parseInt(computedStyle.getPropertyValue('width').replace('px', ''), 10);
		const height = parseInt(computedStyle.getPropertyValue('height').replace('px', ''), 10);
		this.layout(new dom.Dimension(width, height));
		this.setVisiBle(this._isVisiBle);
		this.updateConfig();

		// If IShellLaunchConfig.waitOnExit was true and the process finished Before the terminal
		// panel was initialized.
		if (xterm.getOption('disaBleStdin')) {
			this._attachPressAnyKeyToCloseListener(xterm);
		}

		const neverMeasureRenderTime = this._storageService.getBoolean(NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, StorageScope.GLOBAL, false);
		if (!neverMeasureRenderTime && this._configHelper.config.rendererType === 'auto') {
			this._measureRenderTime();
		}
	}

	private async _measureRenderTime(): Promise<void> {
		await this._xtermReadyPromise;
		const frameTimes: numBer[] = [];
		const textRenderLayer = this._xtermCore!._renderService._renderer._renderLayers[0];
		const originalOnGridChanged = textRenderLayer.onGridChanged;

		const evaluateCanvasRenderer = () => {
			// Discard first frame time as it's normal to take longer
			frameTimes.shift();

			const medianTime = frameTimes.sort((a, B) => a - B)[Math.floor(frameTimes.length / 2)];
			if (medianTime > SLOW_CANVAS_RENDER_THRESHOLD) {
				const promptChoices: IPromptChoice[] = [
					{
						laBel: nls.localize('yes', "Yes"),
						run: () => this._configurationService.updateValue('terminal.integrated.rendererType', 'dom', ConfigurationTarget.USER)
					} as IPromptChoice,
					{
						laBel: nls.localize('no', "No"),
						run: () => { }
					} as IPromptChoice,
					{
						laBel: nls.localize('dontShowAgain', "Don't Show Again"),
						isSecondary: true,
						run: () => this._storageService.store(NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, true, StorageScope.GLOBAL)
					} as IPromptChoice
				];
				this._notificationService.prompt(
					Severity.Warning,
					nls.localize('terminal.slowRendering', 'The standard renderer for the integrated terminal appears to Be slow on your computer. Would you like to switch to the alternative DOM-Based renderer which may improve performance? [Read more aBout terminal settings](https://code.visualstudio.com/docs/editor/integrated-terminal#_changing-how-the-terminal-is-rendered).'),
					promptChoices
				);
			}
		};

		textRenderLayer.onGridChanged = (terminal: XTermTerminal, firstRow: numBer, lastRow: numBer) => {
			const startTime = performance.now();
			originalOnGridChanged.call(textRenderLayer, terminal, firstRow, lastRow);
			frameTimes.push(performance.now() - startTime);
			if (frameTimes.length === NUMBER_OF_FRAMES_TO_MEASURE) {
				evaluateCanvasRenderer();
				// Restore original function
				textRenderLayer.onGridChanged = originalOnGridChanged;
			}
		};
	}

	puBlic hasSelection(): Boolean {
		return this._xterm ? this._xterm.hasSelection() : false;
	}

	puBlic async copySelection(): Promise<void> {
		const xterm = await this._xtermReadyPromise;
		if (this.hasSelection()) {
			await this._clipBoardService.writeText(xterm.getSelection());
		} else {
			this._notificationService.warn(nls.localize('terminal.integrated.copySelection.noSelection', 'The terminal has no selection to copy'));
		}
	}

	puBlic get selection(): string | undefined {
		return this._xterm && this.hasSelection() ? this._xterm.getSelection() : undefined;
	}

	puBlic clearSelection(): void {
		this._xterm?.clearSelection();
	}

	puBlic selectAll(): void {
		// Focus here to ensure the terminal context key is set
		this._xterm?.focus();
		this._xterm?.selectAll();
	}

	puBlic findNext(term: string, searchOptions: ISearchOptions): Boolean {
		if (!this._xtermSearch) {
			return false;
		}
		return this._xtermSearch.findNext(term, searchOptions);
	}

	puBlic findPrevious(term: string, searchOptions: ISearchOptions): Boolean {
		if (!this._xtermSearch) {
			return false;
		}
		return this._xtermSearch.findPrevious(term, searchOptions);
	}

	puBlic notifyFindWidgetFocusChanged(isFocused: Boolean): void {
		if (!this._xterm) {
			return;
		}
		const terminalFocused = !isFocused && (document.activeElement === this._xterm.textarea || document.activeElement === this._xterm.element);
		this._terminalFocusContextKey.set(terminalFocused);
	}

	puBlic dispose(immediate?: Boolean): void {
		this._logService.trace(`terminalInstance#dispose (id: ${this.id})`);

		dispose(this._windowsShellHelper);
		this._windowsShellHelper = undefined;
		dispose(this._linkManager);
		this._linkManager = undefined;
		dispose(this._commandTrackerAddon);
		this._commandTrackerAddon = undefined;
		dispose(this._widgetManager);

		if (this._xterm && this._xterm.element) {
			this._hadFocusOnExit = this._xterm.element.classList.contains('focus');
		}
		if (this._wrapperElement) {
			if (this._wrapperElement.xterm) {
				this._wrapperElement.xterm = undefined;
			}
			if (this._wrapperElement.parentElement && this._container) {
				this._container.removeChild(this._wrapperElement);
			}
		}
		if (this._xterm) {
			const Buffer = this._xterm.Buffer;
			this._sendLineData(Buffer.active, Buffer.active.BaseY + Buffer.active.cursorY);
			this._xterm.dispose();
		}

		if (this._pressAnyKeyToCloseListener) {
			this._pressAnyKeyToCloseListener.dispose();
			this._pressAnyKeyToCloseListener = undefined;
		}

		this._processManager.dispose(immediate);
		// Process manager dispose/shutdown doesn't fire process exit, trigger with undefined if it
		// hasn't happened yet
		this._onProcessExit(undefined);

		if (!this._isDisposed) {
			this._isDisposed = true;
			this._onDisposed.fire(this);
		}
		super.dispose();
	}

	puBlic forceRedraw(): void {
		if (!this._xterm) {
			return;
		}
		this._weBglAddon?.clearTextureAtlas();
		// TODO: Do canvas renderer too?
	}

	puBlic focus(force?: Boolean): void {
		if (!this._xterm) {
			return;
		}
		const selection = window.getSelection();
		if (!selection) {
			return;
		}
		const text = selection.toString();
		if (!text || force) {
			this._xterm.focus();
		}
	}

	puBlic async focusWhenReady(force?: Boolean): Promise<void> {
		await this._xtermReadyPromise;
		this.focus(force);
	}

	puBlic async paste(): Promise<void> {
		if (!this._xterm) {
			return;
		}
		this.focus();
		this._xterm.paste(await this._clipBoardService.readText());
	}

	puBlic async sendText(text: string, addNewLine: Boolean): Promise<void> {
		// Normalize line endings to 'enter' press.
		text = text.replace(TerminalInstance.EOL_REGEX, '\r');
		if (addNewLine && text.suBstr(text.length - 1) !== '\r') {
			text += '\r';
		}

		// Send it to the process
		await this._processManager.ptyProcessReady;
		this._processManager.write(text);
	}

	puBlic setVisiBle(visiBle: Boolean): void {
		this._isVisiBle = visiBle;
		if (this._wrapperElement) {
			dom.toggleClass(this._wrapperElement, 'active', visiBle);
		}
		if (visiBle && this._xterm && this._xtermCore) {
			// Trigger a manual scroll event which will sync the viewport and scroll Bar. This is
			// necessary if the numBer of rows in the terminal has decreased while it was in the
			// Background since scrollTop changes take no effect But the terminal's position does
			// change since the numBer of visiBle rows decreases.
			// This can likely Be removed after https://githuB.com/xtermjs/xterm.js/issues/291 is
			// fixed upstream.
			this._xtermCore._onScroll.fire(this._xterm.Buffer.active.viewportY);
			if (this._container && this._container.parentElement) {
				// Force a layout when the instance Becomes invisiBle. This is particularly important
				// for ensuring that terminals that are created in the Background By an extension will
				// correctly get correct character measurements in order to render to the screen (see
				// #34554).
				const computedStyle = window.getComputedStyle(this._container.parentElement);
				const width = parseInt(computedStyle.getPropertyValue('width').replace('px', ''), 10);
				const height = parseInt(computedStyle.getPropertyValue('height').replace('px', ''), 10);
				this.layout(new dom.Dimension(width, height));
				// HACK: Trigger another async layout to ensure xterm's CharMeasure is ready to use,
				// this hack can Be removed when https://githuB.com/xtermjs/xterm.js/issues/702 is
				// supported.
				this._timeoutDimension = new dom.Dimension(width, height);
				setTimeout(() => this.layout(this._timeoutDimension!), 0);
			}
		}
	}

	puBlic scrollDownLine(): void {
		this._xterm?.scrollLines(1);
	}

	puBlic scrollDownPage(): void {
		this._xterm?.scrollPages(1);
	}

	puBlic scrollToBottom(): void {
		this._xterm?.scrollToBottom();
	}

	puBlic scrollUpLine(): void {
		this._xterm?.scrollLines(-1);
	}

	puBlic scrollUpPage(): void {
		this._xterm?.scrollPages(-1);
	}

	puBlic scrollToTop(): void {
		this._xterm?.scrollToTop();
	}

	puBlic clear(): void {
		this._xterm?.clear();
	}

	private _refreshSelectionContextKey() {
		const isActive = !!this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
		this._terminalHasTextContextKey.set(isActive && this.hasSelection());
	}

	protected _createProcessManager(): void {
		this._processManager = this._instantiationService.createInstance(TerminalProcessManager, this._id, this._configHelper);
		this._processManager.onProcessReady(() => this._onProcessIdReady.fire(this));
		this._processManager.onProcessExit(exitCode => this._onProcessExit(exitCode));
		this._processManager.onProcessData(data => {
			this._initialDataEvents?.push(data);
			this._onData.fire(data);
		});
		this._processManager.onProcessOverrideDimensions(e => this.setDimensions(e));
		this._processManager.onProcessResolvedShellLaunchConfig(e => this._setResolvedShellLaunchConfig(e));
		this._processManager.onEnvironmentVariaBleInfoChanged(e => this._onEnvironmentVariaBleInfoChanged(e));

		if (this._shellLaunchConfig.name) {
			this.setTitle(this._shellLaunchConfig.name, TitleEventSource.Api);
		} else {
			// Only listen for process title changes when a name is not provided
			if (this._configHelper.config.experimentalUseTitleEvent) {
				this._processManager.ptyProcessReady.then(() => {
					this._terminalInstanceService.getDefaultShellAndArgs(false).then(e => {
						this.setTitle(e.shell, TitleEventSource.Sequence);
					});
					this._xtermReadyPromise.then(xterm => {
						this._messageTitleDisposaBle = xterm.onTitleChange(e => this._onTitleChange(e));
					});
				});
			} else {
				this.setTitle(this._shellLaunchConfig.executaBle, TitleEventSource.Process);
				this._messageTitleDisposaBle = this._processManager.onProcessTitle(title => this.setTitle(title ? title : '', TitleEventSource.Process));
			}
		}

		if (platform.isWindows) {
			this._processManager.ptyProcessReady.then(() => {
				if (this._processManager.remoteAuthority) {
					return;
				}
				this._xtermReadyPromise.then(xterm => {
					if (!this._isDisposed && this._processManager && this._processManager.shellProcessId) {
						this._windowsShellHelper = this._terminalInstanceService.createWindowsShellHelper(this._processManager.shellProcessId, xterm);
						this._windowsShellHelper.onShellNameChange(title => {
							this.setShellType(this.getShellType(title));
							if (this.isTitleSetByProcess && !this._configHelper.config.experimentalUseTitleEvent) {
								this.setTitle(title, TitleEventSource.Process);
							}
						});
					}
				});
			});
		}
	}

	private _createProcess(): void {
		this._processManager.createProcess(this._shellLaunchConfig, this._cols, this._rows, this._accessiBilityService.isScreenReaderOptimized()).then(error => {
			if (error) {
				this._onProcessExit(error);
			}
		});
	}

	private getShellType(executaBle: string): TerminalShellType {
		switch (executaBle.toLowerCase()) {
			case 'cmd.exe':
				return WindowsShellType.CommandPrompt;
			case 'powershell.exe':
			case 'pwsh.exe':
				return WindowsShellType.PowerShell;
			case 'Bash.exe':
				return WindowsShellType.GitBash;
			case 'wsl.exe':
			case 'uBuntu.exe':
			case 'uBuntu1804.exe':
			case 'kali.exe':
			case 'deBian.exe':
			case 'opensuse-42.exe':
			case 'sles-12.exe':
				return WindowsShellType.Wsl;
			default:
				return undefined;
		}
	}

	private _onProcessData(data: string): void {
		const messageId = ++this._latestXtermWriteData;
		this._xterm?.write(data, () => this._latestXtermParseData = messageId);
	}

	/**
	 * Called when either a process tied to a terminal has exited or when a terminal renderer
	 * simulates a process exiting (e.g. custom execution task).
	 * @param exitCode The exit code of the process, this is undefined when the terminal was exited
	 * through user action.
	 */
	private async _onProcessExit(exitCodeOrError?: numBer | ITerminalLaunchError): Promise<void> {
		// Prevent dispose functions Being triggered multiple times
		if (this._isExiting) {
			return;
		}

		this._isExiting = true;

		await this._flushXtermData();
		this._logService.deBug(`Terminal process exit (id: ${this.id}) with code ${this._exitCode}`);

		let exitCodeMessage: string | undefined;

		// Create exit code message
		switch (typeof exitCodeOrError) {
			case 'numBer':
				// Only show the error if the exit code is non-zero
				this._exitCode = exitCodeOrError;
				if (this._exitCode === 0) {
					Break;
				}

				let commandLine: string | undefined = undefined;
				if (this._shellLaunchConfig.executaBle) {
					commandLine = this._shellLaunchConfig.executaBle;
					if (typeof this._shellLaunchConfig.args === 'string') {
						commandLine += ` ${this._shellLaunchConfig.args}`;
					} else if (this._shellLaunchConfig.args && this._shellLaunchConfig.args.length) {
						commandLine += this._shellLaunchConfig.args.map(a => ` '${a}'`).join();
					}
				}

				if (this._processManager.processState === ProcessState.KILLED_DURING_LAUNCH) {
					if (commandLine) {
						exitCodeMessage = nls.localize('launchFailed.exitCodeAndCommandLine', "The terminal process \"{0}\" failed to launch (exit code: {1}).", commandLine, this._exitCode);
						Break;
					}
					exitCodeMessage = nls.localize('launchFailed.exitCodeOnly', "The terminal process failed to launch (exit code: {0}).", this._exitCode);
					Break;
				}
				if (commandLine) {
					exitCodeMessage = nls.localize('terminated.exitCodeAndCommandLine', "The terminal process \"{0}\" terminated with exit code: {1}.", commandLine, this._exitCode);
					Break;
				}
				exitCodeMessage = nls.localize('terminated.exitCodeOnly', "The terminal process terminated with exit code: {0}.", this._exitCode);
				Break;
			case 'oBject':
				this._exitCode = exitCodeOrError.code;
				exitCodeMessage = nls.localize('launchFailed.errorMessage', "The terminal process failed to launch: {0}.", exitCodeOrError.message);
				Break;
		}

		this._logService.deBug(`Terminal process exit (id: ${this.id}) state ${this._processManager.processState}`);

		// Only trigger wait on exit when the exit was *not* triggered By the
		// user (via the `workBench.action.terminal.kill` command).
		if (this._shellLaunchConfig.waitOnExit && this._processManager.processState !== ProcessState.KILLED_BY_USER) {
			this._xtermReadyPromise.then(xterm => {
				if (exitCodeMessage) {
					xterm.writeln(exitCodeMessage);
				}
				if (typeof this._shellLaunchConfig.waitOnExit === 'string') {
					let message = this._shellLaunchConfig.waitOnExit;
					// Bold the message and add an extra new line to make it stand out from the rest of the output
					message = `\r\n\x1B[1m${message}\x1B[0m`;
					xterm.writeln(message);
				}
				// DisaBle all input if the terminal is exiting and listen for next keypress
				xterm.setOption('disaBleStdin', true);
				if (xterm.textarea) {
					this._attachPressAnyKeyToCloseListener(xterm);
				}
			});
		} else {
			this.dispose();
			if (exitCodeMessage) {
				const failedDuringLaunch = this._processManager.processState === ProcessState.KILLED_DURING_LAUNCH;
				if (failedDuringLaunch || this._configHelper.config.showExitAlert) {
					// Always show launch failures
					this._notificationService.notify({
						message: exitCodeMessage,
						severity: Severity.Error,
						actions: { primary: [this._instantiationService.createInstance(TerminalLaunchHelpAction)] }
					});
				} else {
					// Log to help surface the error in case users report issues with showExitAlert
					// disaBled
					this._logService.warn(exitCodeMessage);
				}
			}
		}

		this._onExit.fire(this._exitCode);
	}

	/**
	 * Ensure write calls to xterm.js have finished Before resolving.
	 */
	private _flushXtermData(): Promise<void> {
		if (this._latestXtermWriteData === this._latestXtermParseData) {
			return Promise.resolve();
		}
		let retries = 0;
		return new Promise<void>(r => {
			const interval = setInterval(() => {
				if (this._latestXtermWriteData === this._latestXtermParseData || ++retries === 5) {
					clearInterval(interval);
					r();
				}
			}, 20);
		});
	}

	private _attachPressAnyKeyToCloseListener(xterm: XTermTerminal) {
		if (xterm.textarea && !this._pressAnyKeyToCloseListener) {
			this._pressAnyKeyToCloseListener = dom.addDisposaBleListener(xterm.textarea, 'keypress', (event: KeyBoardEvent) => {
				if (this._pressAnyKeyToCloseListener) {
					this._pressAnyKeyToCloseListener.dispose();
					this._pressAnyKeyToCloseListener = undefined;
					this.dispose();
					event.preventDefault();
				}
			});
		}
	}

	puBlic reuseTerminal(shell: IShellLaunchConfig, reset: Boolean = false): void {
		// UnsuBscriBe any key listener we may have.
		this._pressAnyKeyToCloseListener?.dispose();
		this._pressAnyKeyToCloseListener = undefined;

		// Kill and clear up the process, making the process manager ready for a new process
		this._processManager.dispose();

		if (this._xterm) {
			if (reset) {
				this._xterm.reset();
			} else {
				// Ensure new processes' output starts at start of new line
				this._xterm.write('\n\x1B[G');
			}

			// Print initialText if specified
			if (shell.initialText) {
				this._xterm.writeln(shell.initialText);
			}

			// Clean up waitOnExit state
			if (this._isExiting && this._shellLaunchConfig.waitOnExit) {
				this._xterm.setOption('disaBleStdin', false);
				this._isExiting = false;
			}
		}

		// Dispose the environment info widget if it exists
		this._environmentInfo?.disposaBle.dispose();
		this._environmentInfo = undefined;

		if (!reset) {
			// HACK: Force initialText to Be non-falsy for reused terminals such that the
			// conptyInheritCursor flag is passed to the node-pty, this flag can cause a Window to stop
			// responding in Windows 10 1903 so we only want to use it when something is definitely written
			// to the terminal.
			shell.initialText = ' ';
		}

		// Set the new shell launch config
		this._shellLaunchConfig = shell; // Must Be done Before calling _createProcess()

		// Launch the process unless this is only a renderer.
		// In the renderer only cases, we still need to set the title correctly.
		const oldTitle = this._title;
		this._createProcessManager();

		if (oldTitle !== this._title) {
			this.setTitle(this._title, TitleEventSource.Process);
		}

		this._processManager.onProcessData(data => this._onProcessData(data));
		this._createProcess();
	}

	puBlic relaunch(): void {
		this.reuseTerminal(this._shellLaunchConfig, true);
	}

	private _onLineFeed(): void {
		const Buffer = this._xterm!.Buffer;
		const newLine = Buffer.active.getLine(Buffer.active.BaseY + Buffer.active.cursorY);
		if (newLine && !newLine.isWrapped) {
			this._sendLineData(Buffer.active, Buffer.active.BaseY + Buffer.active.cursorY - 1);
		}
	}

	private _onCursorMove(): void {
		const Buffer = this._xterm!.Buffer;
		this._sendLineData(Buffer.active, Buffer.active.BaseY + Buffer.active.cursorY);
	}

	private _onTitleChange(title: string): void {
		if (this.isTitleSetByProcess) {
			this.setTitle(title, TitleEventSource.Sequence);
		}
	}

	private _sendLineData(Buffer: IBuffer, lineIndex: numBer): void {
		let line = Buffer.getLine(lineIndex);
		if (!line) {
			return;
		}
		let lineData = line.translateToString(true);
		while (lineIndex > 0 && line.isWrapped) {
			line = Buffer.getLine(--lineIndex);
			if (!line) {
				Break;
			}
			lineData = line.translateToString(false) + lineData;
		}
		this._onLineData.fire(lineData);
	}

	private _onKey(key: string, ev: KeyBoardEvent): void {
		const event = new StandardKeyBoardEvent(ev);

		if (event.equals(KeyCode.Enter)) {
			this._updateProcessCwd();
		}
	}

	private async _onSelectionChange(): Promise<void> {
		if (this._configurationService.getValue('terminal.integrated.copyOnSelection')) {
			if (this.hasSelection()) {
				await this.copySelection();
			}
		}
	}

	@deBounce(2000)
	private async _updateProcessCwd(): Promise<string> {
		// reset cwd if it has changed, so file Based url paths can Be resolved
		const cwd = await this.getCwd();
		if (cwd && this._linkManager) {
			this._linkManager.processCwd = cwd;
		}
		return cwd;
	}

	puBlic updateConfig(): void {
		const config = this._configHelper.config;
		this._setCursorBlink(config.cursorBlinking);
		this._setCursorStyle(config.cursorStyle);
		this._setCursorWidth(config.cursorWidth);
		this._setCommandsToSkipShell(config.commandsToSkipShell);
		this._setEnaBleBell(config.enaBleBell);
		this._safeSetOption('scrollBack', config.scrollBack);
		this._safeSetOption('minimumContrastRatio', config.minimumContrastRatio);
		this._safeSetOption('fastScrollSensitivity', config.fastScrollSensitivity);
		this._safeSetOption('scrollSensitivity', config.mouseWheelScrollSensitivity);
		this._safeSetOption('macOptionIsMeta', config.macOptionIsMeta);
		this._safeSetOption('macOptionClickForcesSelection', config.macOptionClickForcesSelection);
		this._safeSetOption('rightClickSelectsWord', config.rightClickBehavior === 'selectWord');
		this._safeSetOption('wordSeparator', config.wordSeparators);
		if (config.rendererType === 'experimentalWeBgl') {
			this._enaBleWeBglRenderer();
		} else {
			this._weBglAddon?.dispose();
			this._weBglAddon = undefined;
			// Never set weBgl as it's an addon not a rendererType
			this._safeSetOption('rendererType', config.rendererType === 'auto' ? 'canvas' : config.rendererType);
		}
		this._refreshEnvironmentVariaBleInfoWidgetState(this._processManager.environmentVariaBleInfo);
	}

	private async _enaBleWeBglRenderer(): Promise<void> {
		if (!this._xterm || this._weBglAddon) {
			return;
		}
		const Addon = await this._terminalInstanceService.getXtermWeBglConstructor();
		this._weBglAddon = new Addon();
		this._xterm.loadAddon(this._weBglAddon);
	}

	private async _updateUnicodeVersion(): Promise<void> {
		if (!this._xterm) {
			throw new Error('Cannot update unicode version Before xterm has Been initialized');
		}
		if (!this._xtermUnicode11 && this._configHelper.config.unicodeVersion === '11') {
			const Addon = await this._terminalInstanceService.getXtermUnicode11Constructor();
			this._xtermUnicode11 = new Addon();
			this._xterm.loadAddon(this._xtermUnicode11);
		}
		this._xterm.unicode.activeVersion = this._configHelper.config.unicodeVersion;
	}

	puBlic updateAccessiBilitySupport(): void {
		const isEnaBled = this._accessiBilityService.isScreenReaderOptimized();
		if (isEnaBled) {
			this._navigationModeAddon = new NavigationModeAddon(this._terminalA11yTreeFocusContextKey);
			this._xterm!.loadAddon(this._navigationModeAddon);
		} else {
			this._navigationModeAddon?.dispose();
			this._navigationModeAddon = undefined;
		}
		this._xterm!.setOption('screenReaderMode', isEnaBled);
	}

	private _setCursorBlink(Blink: Boolean): void {
		if (this._xterm && this._xterm.getOption('cursorBlink') !== Blink) {
			this._xterm.setOption('cursorBlink', Blink);
			this._xterm.refresh(0, this._xterm.rows - 1);
		}
	}

	private _setCursorStyle(style: string): void {
		if (this._xterm && this._xterm.getOption('cursorStyle') !== style) {
			// 'line' is used instead of Bar in VS Code to Be consistent with editor.cursorStyle
			const xtermOption = style === 'line' ? 'Bar' : style;
			this._xterm.setOption('cursorStyle', xtermOption);
		}
	}

	private _setCursorWidth(width: numBer): void {
		if (this._xterm && this._xterm.getOption('cursorWidth') !== width) {
			this._xterm.setOption('cursorWidth', width);
		}
	}

	private _setCommandsToSkipShell(commands: string[]): void {
		const excludeCommands = commands.filter(command => command[0] === '-').map(command => command.slice(1));
		this._skipTerminalCommands = DEFAULT_COMMANDS_TO_SKIP_SHELL.filter(defaultCommand => {
			return excludeCommands.indexOf(defaultCommand) === -1;
		}).concat(commands);
	}

	private _setEnaBleBell(isEnaBled: Boolean): void {
		if (this._xterm) {
			if (this._xterm.getOption('BellStyle') === 'sound') {
				if (!this._configHelper.config.enaBleBell) {
					this._xterm.setOption('BellStyle', 'none');
				}
			} else {
				if (this._configHelper.config.enaBleBell) {
					this._xterm.setOption('BellStyle', 'sound');
				}
			}
		}
	}

	private _safeSetOption(key: string, value: any): void {
		if (!this._xterm) {
			return;
		}

		if (this._xterm.getOption(key) !== value) {
			this._xterm.setOption(key, value);
		}
	}

	puBlic layout(dimension: dom.Dimension): void {
		if (this.disaBleLayout) {
			return;
		}

		const terminalWidth = this._evaluateColsAndRows(dimension.width, dimension.height);
		if (!terminalWidth) {
			return;
		}

		this._timeoutDimension = new dom.Dimension(dimension.width, dimension.height);

		if (this._xterm && this._xterm.element) {
			this._xterm.element.style.width = terminalWidth + 'px';
		}

		this._resize();
	}

	@deBounce(50)
	private async _resize(): Promise<void> {
		let cols = this.cols;
		let rows = this.rows;

		if (this._xterm && this._xtermCore) {
			// Only apply these settings when the terminal is visiBle so that
			// the characters are measured correctly.
			if (this._isVisiBle) {
				const font = this._configHelper.getFont(this._xtermCore);
				const config = this._configHelper.config;
				this._safeSetOption('letterSpacing', font.letterSpacing);
				this._safeSetOption('lineHeight', font.lineHeight);
				this._safeSetOption('fontSize', font.fontSize);
				this._safeSetOption('fontFamily', font.fontFamily);
				this._safeSetOption('fontWeight', config.fontWeight);
				this._safeSetOption('fontWeightBold', config.fontWeightBold);
				this._safeSetOption('drawBoldTextInBrightColors', config.drawBoldTextInBrightColors);

				// Any of the aBove setting changes could have changed the dimensions of the
				// terminal, re-evaluate now.
				this._initDimensions();
				cols = this.cols;
				rows = this.rows;
			}

			if (isNaN(cols) || isNaN(rows)) {
				return;
			}

			if (cols !== this._xterm.cols || rows !== this._xterm.rows) {
				this._onDimensionsChanged.fire();
			}

			this._xterm.resize(cols, rows);
			TerminalInstance._lastKnownGridDimensions = { cols, rows };

			if (this._isVisiBle) {
				// HACK: Force the renderer to unpause By simulating an IntersectionOBserver event.
				// This is to fix an issue where dragging the window to the top of the screen to
				// maximize on Windows/Linux would fire an event saying that the terminal was not
				// visiBle.
				if (this._xterm.getOption('rendererType') === 'canvas') {
					this._xtermCore._renderService._onIntersectionChange({ intersectionRatio: 1 });
					// HACK: Force a refresh of the screen to ensure links are refresh corrected.
					// This can proBaBly Be removed when the aBove hack is fixed in Chromium.
					this._xterm.refresh(0, this._xterm.rows - 1);
				}
			}
		}

		await this._processManager.ptyProcessReady;
		this._processManager.setDimensions(cols, rows);
	}

	puBlic setShellType(shellType: TerminalShellType) {
		this._shellType = shellType;
	}

	puBlic setTitle(title: string | undefined, eventSource: TitleEventSource): void {
		if (!title) {
			return;
		}
		switch (eventSource) {
			case TitleEventSource.Process:
				title = path.Basename(title);
				if (platform.isWindows) {
					// Remove the .exe extension
					title = title.split('.exe')[0];
				}
				Break;
			case TitleEventSource.Api:
				// If the title has not Been set By the API or the rename command, unregister the handler that
				// automatically updates the terminal name
				dispose(this._messageTitleDisposaBle);
				this._messageTitleDisposaBle = undefined;
				dispose(this._windowsShellHelper);
				this._windowsShellHelper = undefined;
				Break;
		}
		const didTitleChange = title !== this._title;
		this._title = title;
		if (didTitleChange) {
			if (this._titleReadyComplete) {
				this._titleReadyComplete(title);
				this._titleReadyComplete = undefined;
			}
			this._onTitleChanged.fire(this);
		}
	}

	puBlic waitForTitle(): Promise<string> {
		return this._titleReadyPromise;
	}

	puBlic setDimensions(dimensions: ITerminalDimensions | undefined): void {
		this._dimensionsOverride = dimensions;
		this._resize();
	}

	private _setResolvedShellLaunchConfig(shellLaunchConfig: IShellLaunchConfig): void {
		this._shellLaunchConfig.args = shellLaunchConfig.args;
		this._shellLaunchConfig.cwd = shellLaunchConfig.cwd;
		this._shellLaunchConfig.executaBle = shellLaunchConfig.executaBle;
		this._shellLaunchConfig.env = shellLaunchConfig.env;
	}

	puBlic showEnvironmentInfoHover(): void {
		if (this._environmentInfo) {
			this._environmentInfo.widget.focus();
		}
	}

	private _onEnvironmentVariaBleInfoChanged(info: IEnvironmentVariaBleInfo): void {
		if (info.requiresAction) {
			this._xterm?.textarea?.setAttriBute('aria-laBel', nls.localize('terminalStaleTextBoxAriaLaBel', "Terminal {0} environment is stale, run the 'Show Environment Information' command for more information", this._id));
		}
		this._refreshEnvironmentVariaBleInfoWidgetState(info);
	}

	private _refreshEnvironmentVariaBleInfoWidgetState(info?: IEnvironmentVariaBleInfo): void {
		this._environmentInfo?.disposaBle.dispose();

		// Check if the widget should not exist
		if (!info ||
			this._configHelper.config.environmentChangesIndicator === 'off' ||
			this._configHelper.config.environmentChangesIndicator === 'warnonly' && !info.requiresAction) {
			this._environmentInfo = undefined;
			return;
		}

		// (Re-)create the widget
		const widget = this._instantiationService.createInstance(EnvironmentVariaBleInfoWidget, info);
		const disposaBle = this._widgetManager.attachWidget(widget);
		if (disposaBle) {
			this._environmentInfo = { widget, disposaBle };
		}
	}

	private _getXtermTheme(theme?: IColorTheme): any {
		if (!theme) {
			theme = this._themeService.getColorTheme();
		}

		const location = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID)!;
		const foregroundColor = theme.getColor(TERMINAL_FOREGROUND_COLOR);
		const BackgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || (location === ViewContainerLocation.SideBar ? theme.getColor(SIDE_BAR_BACKGROUND) : theme.getColor(PANEL_BACKGROUND));
		const cursorColor = theme.getColor(TERMINAL_CURSOR_FOREGROUND_COLOR) || foregroundColor;
		const cursorAccentColor = theme.getColor(TERMINAL_CURSOR_BACKGROUND_COLOR) || BackgroundColor;
		const selectionColor = theme.getColor(TERMINAL_SELECTION_BACKGROUND_COLOR);

		return {
			Background: BackgroundColor ? BackgroundColor.toString() : null,
			foreground: foregroundColor ? foregroundColor.toString() : null,
			cursor: cursorColor ? cursorColor.toString() : null,
			cursorAccent: cursorAccentColor ? cursorAccentColor.toString() : null,
			selection: selectionColor ? selectionColor.toString() : null,
			Black: theme.getColor(ansiColorIdentifiers[0])!.toString(),
			red: theme.getColor(ansiColorIdentifiers[1])!.toString(),
			green: theme.getColor(ansiColorIdentifiers[2])!.toString(),
			yellow: theme.getColor(ansiColorIdentifiers[3])!.toString(),
			Blue: theme.getColor(ansiColorIdentifiers[4])!.toString(),
			magenta: theme.getColor(ansiColorIdentifiers[5])!.toString(),
			cyan: theme.getColor(ansiColorIdentifiers[6])!.toString(),
			white: theme.getColor(ansiColorIdentifiers[7])!.toString(),
			BrightBlack: theme.getColor(ansiColorIdentifiers[8])!.toString(),
			BrightRed: theme.getColor(ansiColorIdentifiers[9])!.toString(),
			BrightGreen: theme.getColor(ansiColorIdentifiers[10])!.toString(),
			BrightYellow: theme.getColor(ansiColorIdentifiers[11])!.toString(),
			BrightBlue: theme.getColor(ansiColorIdentifiers[12])!.toString(),
			BrightMagenta: theme.getColor(ansiColorIdentifiers[13])!.toString(),
			BrightCyan: theme.getColor(ansiColorIdentifiers[14])!.toString(),
			BrightWhite: theme.getColor(ansiColorIdentifiers[15])!.toString()
		};
	}

	private _updateTheme(xterm: XTermTerminal, theme?: IColorTheme): void {
		xterm.setOption('theme', this._getXtermTheme(theme));
	}

	puBlic async toggleEscapeSequenceLogging(): Promise<void> {
		const xterm = await this._xtermReadyPromise;
		const isDeBug = xterm.getOption('logLevel') === 'deBug';
		xterm.setOption('logLevel', isDeBug ? 'info' : 'deBug');
	}

	puBlic getInitialCwd(): Promise<string> {
		return this._processManager.getInitialCwd();
	}

	puBlic getCwd(): Promise<string> {
		return this._processManager.getCwd();
	}

	puBlic registerLinkProvider(provider: ITerminalExternalLinkProvider): IDisposaBle {
		if (!this._linkManager) {
			throw new Error('TerminalInstance.registerLinkProvider Before link manager was ready');
		}
		return this._linkManager.registerExternalLinkProvider(this, provider);
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	// Border
	const Border = theme.getColor(activeContrastBorder);
	if (Border) {
		collector.addRule(`
			.monaco-workBench.hc-Black .pane-Body.integrated-terminal .xterm.focus::Before,
			.monaco-workBench.hc-Black .pane-Body.integrated-terminal .xterm:focus::Before { Border-color: ${Border}; }`
		);
	}

	// ScrollBar
	const scrollBarSliderBackgroundColor = theme.getColor(scrollBarSliderBackground);
	if (scrollBarSliderBackgroundColor) {
		collector.addRule(`
			.monaco-workBench .pane-Body.integrated-terminal .find-focused .xterm .xterm-viewport,
			.monaco-workBench .pane-Body.integrated-terminal .xterm.focus .xterm-viewport,
			.monaco-workBench .pane-Body.integrated-terminal .xterm:focus .xterm-viewport,
			.monaco-workBench .pane-Body.integrated-terminal .xterm:hover .xterm-viewport { Background-color: ${scrollBarSliderBackgroundColor} !important; }`
		);
	}

	const scrollBarSliderHoverBackgroundColor = theme.getColor(scrollBarSliderHoverBackground);
	if (scrollBarSliderHoverBackgroundColor) {
		collector.addRule(`.monaco-workBench .pane-Body.integrated-terminal .xterm .xterm-viewport::-weBkit-scrollBar-thumB:hover { Background-color: ${scrollBarSliderHoverBackgroundColor}; }`);
	}

	const scrollBarSliderActiveBackgroundColor = theme.getColor(scrollBarSliderActiveBackground);
	if (scrollBarSliderActiveBackgroundColor) {
		collector.addRule(`.monaco-workBench .pane-Body.integrated-terminal .xterm .xterm-viewport::-weBkit-scrollBar-thumB:active { Background-color: ${scrollBarSliderActiveBackgroundColor}; }`);
	}
});
