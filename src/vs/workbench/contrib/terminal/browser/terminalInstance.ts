/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import * As dom from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { debounce } from 'vs/bAse/common/decorAtors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IDisposAble, dispose, DisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { TAbFocus } from 'vs/editor/common/config/commonEditorConfig';
import * As nls from 'vs/nls';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INotificAtionService, IPromptChoice, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ActiveContrAstBorder, scrollbArSliderActiveBAckground, scrollbArSliderBAckground, scrollbArSliderHoverBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { TerminAlWidgetMAnAger } from 'vs/workbench/contrib/terminAl/browser/widgets/widgetMAnAger';
import { IShellLAunchConfig, ITerminAlDimensions, ITerminAlProcessMAnAger, KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED, NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, ProcessStAte, TERMINAL_VIEW_ID, IWindowsShellHelper, KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, INAvigAtionMode, TitleEventSource, DEFAULT_COMMANDS_TO_SKIP_SHELL, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { AnsiColorIdentifiers, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_FOREGROUND_COLOR, TERMINAL_SELECTION_BACKGROUND_COLOR } from 'vs/workbench/contrib/terminAl/common/terminAlColorRegistry';
import { TerminAlConfigHelper } from 'vs/workbench/contrib/terminAl/browser/terminAlConfigHelper';
import { TerminAlLinkMAnAger } from 'vs/workbench/contrib/terminAl/browser/links/terminAlLinkMAnAger';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { ITerminAlInstAnceService, ITerminAlInstAnce, TerminAlShellType, WindowsShellType, ITerminAlExternAlLinkProvider } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { TerminAlProcessMAnAger } from 'vs/workbench/contrib/terminAl/browser/terminAlProcessMAnAger';
import type { TerminAl As XTermTerminAl, IBuffer, ITerminAlAddon } from 'xterm';
import type { SeArchAddon, ISeArchOptions } from 'xterm-Addon-seArch';
import type { Unicode11Addon } from 'xterm-Addon-unicode11';
import type { WebglAddon } from 'xterm-Addon-webgl';
import { CommAndTrAckerAddon } from 'vs/workbench/contrib/terminAl/browser/Addons/commAndTrAckerAddon';
import { NAvigAtionModeAddon } from 'vs/workbench/contrib/terminAl/browser/Addons/nAvigAtionModeAddon';
import { XTermCore } from 'vs/workbench/contrib/terminAl/browser/xterm-privAte';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IViewsService, IViewDescriptorService, ViewContAinerLocAtion } from 'vs/workbench/common/views';
import { EnvironmentVAriAbleInfoWidget } from 'vs/workbench/contrib/terminAl/browser/widgets/environmentVAriAbleInfoWidget';
import { IEnvironmentVAriAbleInfo } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { TerminAlLAunchHelpAction } from 'vs/workbench/contrib/terminAl/browser/terminAlActions';
import { LAtencyTelemetryAddon } from 'vs/workbench/contrib/terminAl/browser/terminAlLAtencyTelemetryAddon';
import { TypeAheAdAddon } from 'vs/workbench/contrib/terminAl/browser/terminAlTypeAheAdAddon';

// How long in milliseconds should An AverAge frAme tAke to render for A notificAtion to AppeAr
// which suggests the fAllbAck DOM-bAsed renderer
const SLOW_CANVAS_RENDER_THRESHOLD = 50;
const NUMBER_OF_FRAMES_TO_MEASURE = 20;

let xtermConstructor: Promise<typeof XTermTerminAl> | undefined;

interfAce ICAnvAsDimensions {
	width: number;
	height: number;
}

interfAce IGridDimensions {
	cols: number;
	rows: number;
}

export clAss TerminAlInstAnce extends DisposAble implements ITerminAlInstAnce {
	privAte stAtic reAdonly EOL_REGEX = /\r?\n/g;

	privAte stAtic _lAstKnownCAnvAsDimensions: ICAnvAsDimensions | undefined;
	privAte stAtic _lAstKnownGridDimensions: IGridDimensions | undefined;
	privAte stAtic _idCounter = 1;

	privAte _processMAnAger!: ITerminAlProcessMAnAger;
	privAte _pressAnyKeyToCloseListener: IDisposAble | undefined;

	privAte _id: number;
	privAte _lAtestXtermWriteDAtA: number = 0;
	privAte _lAtestXtermPArseDAtA: number = 0;
	privAte _isExiting: booleAn;
	privAte _hAdFocusOnExit: booleAn;
	privAte _isVisible: booleAn;
	privAte _isDisposed: booleAn;
	privAte _exitCode: number | undefined;
	privAte _skipTerminAlCommAnds: string[];
	privAte _shellType: TerminAlShellType;
	privAte _title: string = '';
	privAte _wrApperElement: (HTMLElement & { xterm?: XTermTerminAl }) | undefined;
	privAte _xterm: XTermTerminAl | undefined;
	privAte _xtermCore: XTermCore | undefined;
	privAte _xtermSeArch: SeArchAddon | undefined;
	privAte _xtermUnicode11: Unicode11Addon | undefined;
	privAte _xtermElement: HTMLDivElement | undefined;
	privAte _terminAlHAsTextContextKey: IContextKey<booleAn>;
	privAte _terminAlA11yTreeFocusContextKey: IContextKey<booleAn>;
	privAte _cols: number = 0;
	privAte _rows: number = 0;
	privAte _dimensionsOverride: ITerminAlDimensions | undefined;
	privAte _windowsShellHelper: IWindowsShellHelper | undefined;
	privAte _xtermReAdyPromise: Promise<XTermTerminAl>;
	privAte _titleReAdyPromise: Promise<string>;
	privAte _titleReAdyComplete: ((title: string) => Any) | undefined;
	privAte _AreLinksReAdy: booleAn = fAlse;
	privAte _initiAlDAtAEvents: string[] | undefined = [];

	privAte _messAgeTitleDisposAble: IDisposAble | undefined;

	privAte _widgetMAnAger: TerminAlWidgetMAnAger = this._instAntiAtionService.creAteInstAnce(TerminAlWidgetMAnAger);
	privAte _linkMAnAger: TerminAlLinkMAnAger | undefined;
	privAte _environmentInfo: { widget: EnvironmentVAriAbleInfoWidget, disposAble: IDisposAble } | undefined;
	privAte _webglAddon: WebglAddon | undefined;
	privAte _commAndTrAckerAddon: CommAndTrAckerAddon | undefined;
	privAte _nAvigAtionModeAddon: INAvigAtionMode & ITerminAlAddon | undefined;

	privAte _timeoutDimension: dom.Dimension | undefined;

	public disAbleLAyout: booleAn;
	public get id(): number { return this._id; }
	public get cols(): number {
		if (this._dimensionsOverride && this._dimensionsOverride.cols) {
			return MAth.min(MAth.mAx(this._dimensionsOverride.cols, 2), this._cols);
		}
		return this._cols;
	}
	public get rows(): number {
		if (this._dimensionsOverride && this._dimensionsOverride.rows) {
			return MAth.min(MAth.mAx(this._dimensionsOverride.rows, 2), this._rows);
		}
		return this._rows;
	}
	public get mAxCols(): number { return this._cols; }
	public get mAxRows(): number { return this._rows; }
	// TODO: IdeAlly processId would be merged into processReAdy
	public get processId(): number | undefined { return this._processMAnAger.shellProcessId; }
	// TODO: How does this work with detAched processes?
	// TODO: Should this be An event As it cAn fire twice?
	public get processReAdy(): Promise<void> { return this._processMAnAger.ptyProcessReAdy; }
	public get AreLinksReAdy(): booleAn { return this._AreLinksReAdy; }
	public get initiAlDAtAEvents(): string[] | undefined { return this._initiAlDAtAEvents; }
	public get exitCode(): number | undefined { return this._exitCode; }
	public get title(): string { return this._title; }
	public get hAdFocusOnExit(): booleAn { return this._hAdFocusOnExit; }
	public get isTitleSetByProcess(): booleAn { return !!this._messAgeTitleDisposAble; }
	public get shellLAunchConfig(): IShellLAunchConfig { return this._shellLAunchConfig; }
	public get shellType(): TerminAlShellType { return this._shellType; }
	public get commAndTrAcker(): CommAndTrAckerAddon | undefined { return this._commAndTrAckerAddon; }
	public get nAvigAtionMode(): INAvigAtionMode | undefined { return this._nAvigAtionModeAddon; }

	privAte reAdonly _onExit = new Emitter<number | undefined>();
	public get onExit(): Event<number | undefined> { return this._onExit.event; }
	privAte reAdonly _onDisposed = new Emitter<ITerminAlInstAnce>();
	public get onDisposed(): Event<ITerminAlInstAnce> { return this._onDisposed.event; }
	privAte reAdonly _onFocused = new Emitter<ITerminAlInstAnce>();
	public get onFocused(): Event<ITerminAlInstAnce> { return this._onFocused.event; }
	privAte reAdonly _onProcessIdReAdy = new Emitter<ITerminAlInstAnce>();
	public get onProcessIdReAdy(): Event<ITerminAlInstAnce> { return this._onProcessIdReAdy.event; }
	privAte reAdonly _onLinksReAdy = new Emitter<ITerminAlInstAnce>();
	public get onLinksReAdy(): Event<ITerminAlInstAnce> { return this._onLinksReAdy.event; }
	privAte reAdonly _onTitleChAnged = new Emitter<ITerminAlInstAnce>();
	public get onTitleChAnged(): Event<ITerminAlInstAnce> { return this._onTitleChAnged.event; }
	privAte reAdonly _onDAtA = new Emitter<string>();
	public get onDAtA(): Event<string> { return this._onDAtA.event; }
	privAte reAdonly _onLineDAtA = new Emitter<string>();
	public get onLineDAtA(): Event<string> { return this._onLineDAtA.event; }
	privAte reAdonly _onRequestExtHostProcess = new Emitter<ITerminAlInstAnce>();
	public get onRequestExtHostProcess(): Event<ITerminAlInstAnce> { return this._onRequestExtHostProcess.event; }
	privAte reAdonly _onDimensionsChAnged = new Emitter<void>();
	public get onDimensionsChAnged(): Event<void> { return this._onDimensionsChAnged.event; }
	privAte reAdonly _onMAximumDimensionsChAnged = new Emitter<void>();
	public get onMAximumDimensionsChAnged(): Event<void> { return this._onMAximumDimensionsChAnged.event; }
	privAte reAdonly _onFocus = new Emitter<ITerminAlInstAnce>();
	public get onFocus(): Event<ITerminAlInstAnce> { return this._onFocus.event; }

	public constructor(
		privAte reAdonly _terminAlFocusContextKey: IContextKey<booleAn>,
		privAte reAdonly _terminAlShellTypeContextKey: IContextKey<string>,
		privAte reAdonly _configHelper: TerminAlConfigHelper,
		privAte _contAiner: HTMLElement | undefined,
		privAte _shellLAunchConfig: IShellLAunchConfig,
		@ITerminAlInstAnceService privAte reAdonly _terminAlInstAnceService: ITerminAlInstAnceService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IViewsService privAte reAdonly _viewsService: IViewsService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IClipboArdService privAte reAdonly _clipboArdService: IClipboArdService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IAccessibilityService privAte reAdonly _AccessibilityService: IAccessibilityService,
		@IViewDescriptorService privAte reAdonly _viewDescriptorService: IViewDescriptorService
	) {
		super();

		this._skipTerminAlCommAnds = [];
		this._isExiting = fAlse;
		this._hAdFocusOnExit = fAlse;
		this._isVisible = fAlse;
		this._isDisposed = fAlse;
		this._id = TerminAlInstAnce._idCounter++;

		this._titleReAdyPromise = new Promise<string>(c => {
			this._titleReAdyComplete = c;
		});

		this._terminAlHAsTextContextKey = KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED.bindTo(this._contextKeyService);
		this._terminAlA11yTreeFocusContextKey = KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS.bindTo(this._contextKeyService);
		this.disAbleLAyout = fAlse;

		this._logService.trAce(`terminAlInstAnce#ctor (id: ${this.id})`, this._shellLAunchConfig);

		this._initDimensions();
		this._creAteProcessMAnAger();

		this._xtermReAdyPromise = this._creAteXterm();
		this._xtermReAdyPromise.then(() => {
			// Only AttAch xterm.js to the DOM if the terminAl pAnel hAs been opened before.
			if (_contAiner) {
				this._AttAchToElement(_contAiner);
			}
			this._creAteProcess();
		});

		this.AddDisposAble(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('terminAl.integrAted') || e.AffectsConfigurAtion('editor.fAstScrollSensitivity') || e.AffectsConfigurAtion('editor.mouseWheelScrollSensitivity')) {
				this.updAteConfig();
				// HACK: Trigger Another Async lAyout to ensure xterm's ChArMeAsure is reAdy to use,
				// this hAck cAn be removed when https://github.com/xtermjs/xterm.js/issues/702 is
				// supported.
				this.setVisible(this._isVisible);
			}
			if (e.AffectsConfigurAtion('terminAl.integrAted.unicodeVersion')) {
				this._updAteUnicodeVersion();
			}
			if (e.AffectsConfigurAtion('editor.AccessibilitySupport')) {
				this.updAteAccessibilitySupport();
			}
		}));

		// CleAr out initiAl dAtA events After 10 seconds, hopefully extension hosts Are up And
		// running At thAt point.
		let initiAlDAtAEventsTimeout: number | undefined = window.setTimeout(() => {
			initiAlDAtAEventsTimeout = undefined;
			this._initiAlDAtAEvents = undefined;
		}, 10000);
		this._register({
			dispose: () => {
				if (initiAlDAtAEventsTimeout) {
					window.cleArTimeout(initiAlDAtAEventsTimeout);
				}
			}
		});
	}

	public AddDisposAble(disposAble: IDisposAble): void {
		this._register(disposAble);
	}

	privAte _initDimensions(): void {
		// The terminAl pAnel needs to hAve been creAted
		if (!this._contAiner) {
			return;
		}

		const computedStyle = window.getComputedStyle(this._contAiner.pArentElement!);
		const width = pArseInt(computedStyle.getPropertyVAlue('width').replAce('px', ''), 10);
		const height = pArseInt(computedStyle.getPropertyVAlue('height').replAce('px', ''), 10);
		this._evAluAteColsAndRows(width, height);
	}

	/**
	 * EvAluAtes And sets the cols And rows of the terminAl if possible.
	 * @pArAm width The width of the contAiner.
	 * @pArAm height The height of the contAiner.
	 * @return The terminAl's width if it requires A lAyout.
	 */
	privAte _evAluAteColsAndRows(width: number, height: number): number | null {
		// Ignore if dimensions Are undefined or 0
		if (!width || !height) {
			this._setLAstKnownColsAndRows();
			return null;
		}

		const dimension = this._getDimension(width, height);
		if (!dimension) {
			this._setLAstKnownColsAndRows();
			return null;
		}

		const font = this._configHelper.getFont(this._xtermCore);
		if (!font.chArWidth || !font.chArHeight) {
			this._setLAstKnownColsAndRows();
			return null;
		}

		// BecAuse xterm.js converts from CSS pixels to ActuAl pixels through
		// the use of cAnvAs, window.devicePixelRAtio needs to be used here in
		// order to be precise. font.chArWidth/chArHeight Alone As insufficient
		// when window.devicePixelRAtio chAnges.
		const scAledWidthAvAilAble = dimension.width * window.devicePixelRAtio;

		const scAledChArWidth = font.chArWidth * window.devicePixelRAtio + font.letterSpAcing;
		const newCols = MAth.mAx(MAth.floor(scAledWidthAvAilAble / scAledChArWidth), 1);

		const scAledHeightAvAilAble = dimension.height * window.devicePixelRAtio;
		const scAledChArHeight = MAth.ceil(font.chArHeight * window.devicePixelRAtio);
		const scAledLineHeight = MAth.floor(scAledChArHeight * font.lineHeight);
		const newRows = MAth.mAx(MAth.floor(scAledHeightAvAilAble / scAledLineHeight), 1);

		if (this._cols !== newCols || this._rows !== newRows) {
			this._cols = newCols;
			this._rows = newRows;
			this._fireMAximumDimensionsChAnged();
		}

		return dimension.width;
	}

	privAte _setLAstKnownColsAndRows(): void {
		if (TerminAlInstAnce._lAstKnownGridDimensions) {
			this._cols = TerminAlInstAnce._lAstKnownGridDimensions.cols;
			this._rows = TerminAlInstAnce._lAstKnownGridDimensions.rows;
		}
	}

	@debounce(50)
	privAte _fireMAximumDimensionsChAnged(): void {
		this._onMAximumDimensionsChAnged.fire();
	}

	privAte _getDimension(width: number, height: number): ICAnvAsDimensions | undefined {
		// The font needs to hAve been initiAlized
		const font = this._configHelper.getFont(this._xtermCore);
		if (!font || !font.chArWidth || !font.chArHeight) {
			return undefined;
		}

		// The pAnel is minimized
		if (!this._isVisible) {
			return TerminAlInstAnce._lAstKnownCAnvAsDimensions;
		}

		if (!this._wrApperElement) {
			return undefined;
		}

		const wrApperElementStyle = getComputedStyle(this._wrApperElement);
		const mArginLeft = pArseInt(wrApperElementStyle.mArginLeft!.split('px')[0], 10);
		const mArginRight = pArseInt(wrApperElementStyle.mArginRight!.split('px')[0], 10);
		const bottom = pArseInt(wrApperElementStyle.bottom!.split('px')[0], 10);

		const innerWidth = width - mArginLeft - mArginRight;
		const innerHeight = height - bottom - 1;

		TerminAlInstAnce._lAstKnownCAnvAsDimensions = new dom.Dimension(innerWidth, innerHeight);
		return TerminAlInstAnce._lAstKnownCAnvAsDimensions;
	}

	privAte Async _getXtermConstructor(): Promise<typeof XTermTerminAl> {
		if (xtermConstructor) {
			return xtermConstructor;
		}
		xtermConstructor = new Promise<typeof XTermTerminAl>(Async (resolve) => {
			const TerminAl = AwAit this._terminAlInstAnceService.getXtermConstructor();
			// LocAlize strings
			TerminAl.strings.promptLAbel = nls.locAlize('terminAl.integrAted.A11yPromptLAbel', 'TerminAl input');
			TerminAl.strings.tooMuchOutput = nls.locAlize('terminAl.integrAted.A11yTooMuchOutput', 'Too much output to Announce, nAvigAte to rows mAnuAlly to reAd');
			resolve(TerminAl);
		});
		return xtermConstructor;
	}

	/**
	 * CreAte xterm.js instAnce And AttAch dAtA listeners.
	 */
	protected Async _creAteXterm(): Promise<XTermTerminAl> {
		const TerminAl = AwAit this._getXtermConstructor();
		const font = this._configHelper.getFont(undefined, true);
		const config = this._configHelper.config;
		const editorOptions = this._configurAtionService.getVAlue<IEditorOptions>('editor');

		const xterm = new TerminAl({
			scrollbAck: config.scrollbAck,
			theme: this._getXtermTheme(),
			drAwBoldTextInBrightColors: config.drAwBoldTextInBrightColors,
			fontFAmily: font.fontFAmily,
			fontWeight: config.fontWeight,
			fontWeightBold: config.fontWeightBold,
			fontSize: font.fontSize,
			letterSpAcing: font.letterSpAcing,
			lineHeight: font.lineHeight,
			minimumContrAstRAtio: config.minimumContrAstRAtio,
			bellStyle: config.enAbleBell ? 'sound' : 'none',
			mAcOptionIsMetA: config.mAcOptionIsMetA,
			mAcOptionClickForcesSelection: config.mAcOptionClickForcesSelection,
			rightClickSelectsWord: config.rightClickBehAvior === 'selectWord',
			fAstScrollModifier: 'Alt',
			fAstScrollSensitivity: editorOptions.fAstScrollSensitivity,
			scrollSensitivity: editorOptions.mouseWheelScrollSensitivity,
			rendererType: config.rendererType === 'Auto' || config.rendererType === 'experimentAlWebgl' ? 'cAnvAs' : config.rendererType,
			wordSepArAtor: config.wordSepArAtors
		});
		this._xterm = xterm;
		this._xtermCore = (xterm As Any)._core As XTermCore;
		this._updAteUnicodeVersion();
		this.updAteAccessibilitySupport();
		this._terminAlInstAnceService.getXtermSeArchConstructor().then(Addon => {
			this._xtermSeArch = new Addon();
			xterm.loAdAddon(this._xtermSeArch);
		});
		if (this._shellLAunchConfig.initiAlText) {
			this._xterm.writeln(this._shellLAunchConfig.initiAlText);
		}
		this._xterm.onLineFeed(() => this._onLineFeed());
		this._xterm.onKey(e => this._onKey(e.key, e.domEvent));
		this._xterm.onSelectionChAnge(Async () => this._onSelectionChAnge());

		this._processMAnAger.onProcessDAtA(dAtA => this._onProcessDAtA(dAtA));
		this._xterm.onDAtA(dAtA => this._processMAnAger.write(dAtA));
		this.processReAdy.then(Async () => {
			if (this._linkMAnAger) {
				this._linkMAnAger.processCwd = AwAit this._processMAnAger.getInitiAlCwd();
			}
		});
		// Init winpty compAt And link hAndler After process creAtion As they rely on the
		// underlying process OS
		this._processMAnAger.onProcessReAdy(() => {
			if (this._processMAnAger.os === plAtform.OperAtingSystem.Windows) {
				xterm.setOption('windowsMode', true);
				// Force line dAtA to be sent when the cursor is moved, the mAin purpose for
				// this is becAuse ConPTY will often not do A line feed but insteAd move the
				// cursor, in which cAse we still wAnt to send the current line's dAtA to tAsks.
				xterm.pArser.registerCsiHAndler({ finAl: 'H' }, () => {
					this._onCursorMove();
					return fAlse;
				});
			}
			this._linkMAnAger = this._instAntiAtionService.creAteInstAnce(TerminAlLinkMAnAger, xterm, this._processMAnAger!);
			this._AreLinksReAdy = true;
			this._onLinksReAdy.fire(this);
		});

		this._commAndTrAckerAddon = new CommAndTrAckerAddon();
		this._xterm.loAdAddon(this._commAndTrAckerAddon);
		this._register(this._themeService.onDidColorThemeChAnge(theme => this._updAteTheme(xterm, theme)));
		this._register(this._viewDescriptorService.onDidChAngeLocAtion(({ views }) => {
			if (views.some(v => v.id === TERMINAL_VIEW_ID)) {
				this._updAteTheme(xterm);
			}
		}));

		const lAtencyAddon = this._register(this._instAntiAtionService.creAteInstAnce(LAtencyTelemetryAddon, this._processMAnAger));
		this._xterm.loAdAddon(lAtencyAddon);

		this._xterm.loAdAddon(new TypeAheAdAddon(this._processMAnAger, this._configHelper));

		return xterm;
	}

	public reAttAchToElement(contAiner: HTMLElement): void {
		if (!this._wrApperElement) {
			throw new Error('The terminAl instAnce hAs not been AttAched to A contAiner yet');
		}

		this._wrApperElement.pArentNode?.removeChild(this._wrApperElement);
		this._contAiner = contAiner;
		this._contAiner.AppendChild(this._wrApperElement);
	}

	public AttAchToElement(contAiner: HTMLElement): void {
		// The contAiner did not chAnge, do nothing
		if (this._contAiner === contAiner) {
			return;
		}

		// AttAch hAs not occured yet
		if (!this._wrApperElement) {
			this._AttAchToElement(contAiner);
			return;
		}

		// The contAiner chAnged, reAttAch
		this._contAiner?.removeChild(this._wrApperElement);
		this._contAiner = contAiner;
		this._contAiner.AppendChild(this._wrApperElement);
	}

	public Async _AttAchToElement(contAiner: HTMLElement): Promise<void> {
		const xterm = AwAit this._xtermReAdyPromise;

		if (this._wrApperElement) {
			throw new Error('The terminAl instAnce hAs AlreAdy been AttAched to A contAiner');
		}

		this._contAiner = contAiner;
		this._wrApperElement = document.creAteElement('div');
		dom.AddClAss(this._wrApperElement, 'terminAl-wrApper');
		this._xtermElement = document.creAteElement('div');

		// AttAch the xterm object to the DOM, exposing it to the smoke tests
		this._wrApperElement.xterm = this._xterm;

		this._wrApperElement.AppendChild(this._xtermElement);
		this._contAiner.AppendChild(this._wrApperElement);
		xterm.open(this._xtermElement);
		if (this._configHelper.config.rendererType === 'experimentAlWebgl') {
			this._enAbleWebglRenderer();
		}

		if (!xterm.element || !xterm.textAreA) {
			throw new Error('xterm elements not set After open');
		}

		// Check if custom TerminAl title exists And set sAme
		if (this._title.length > 0) {
			xterm.textAreA.setAttribute('AriA-lAbel', nls.locAlize('terminAlTextBoxAriALAbelNumberAndTitle', "TerminAl {0}, {1}", this._id, this._title));
		} else {
			xterm.textAreA.setAttribute('AriA-lAbel', nls.locAlize('terminAlTextBoxAriALAbel', "TerminAl {0}", this._id));
		}

		xterm.textAreA.AddEventListener('focus', () => this._onFocus.fire(this));
		xterm.AttAchCustomKeyEventHAndler((event: KeyboArdEvent): booleAn => {
			// DisAble All input if the terminAl is exiting
			if (this._isExiting) {
				return fAlse;
			}

			const stAndArdKeyboArdEvent = new StAndArdKeyboArdEvent(event);
			const resolveResult = this._keybindingService.softDispAtch(stAndArdKeyboArdEvent, stAndArdKeyboArdEvent.tArget);

			// Respect chords if the AllowChords setting is set And it's not EscApe. EscApe is
			// hAndled speciAlly for Zen Mode's EscApe, EscApe chord, plus it's importAnt in
			// terminAls generAlly
			const isVAlidChord = resolveResult?.enterChord && this._configHelper.config.AllowChords && event.key !== 'EscApe';
			if (this._keybindingService.inChordMode || isVAlidChord) {
				event.preventDefAult();
				return fAlse;
			}

			// Skip processing by xterm.js of keyboArd events thAt resolve to commAnds described
			// within commAndsToSkipShell
			if (resolveResult && this._skipTerminAlCommAnds.some(k => k === resolveResult.commAndId)) {
				event.preventDefAult();
				return fAlse;
			}

			// Skip processing by xterm.js of keyboArd events thAt mAtch menu bAr mnemonics
			if (this._configHelper.config.AllowMnemonics && !plAtform.isMAcintosh && event.AltKey) {
				return fAlse;
			}

			// If tAb focus mode is on, tAb is not pAssed to the terminAl
			if (TAbFocus.getTAbFocusMode() && event.keyCode === 9) {
				return fAlse;
			}

			// AlwAys hAve Alt+F4 skip the terminAl on Windows And Allow it to be hAndled by the
			// system
			if (plAtform.isWindows && event.AltKey && event.key === 'F4' && !event.ctrlKey) {
				return fAlse;
			}

			return true;
		});
		this._register(dom.AddDisposAbleListener(xterm.element, 'mousedown', () => {
			// We need to listen to the mouseup event on the document since the user mAy releAse
			// the mouse button Anywhere outside of _xterm.element.
			const listener = dom.AddDisposAbleListener(document, 'mouseup', () => {
				// DelAy with A setTimeout to Allow the mouseup to propAgAte through the DOM
				// before evAluAting the new selection stAte.
				setTimeout(() => this._refreshSelectionContextKey(), 0);
				listener.dispose();
			});
		}));

		// xterm.js currently drops selection on keyup As we need to hAndle this cAse.
		this._register(dom.AddDisposAbleListener(xterm.element, 'keyup', () => {
			// WAit until keyup hAs propAgAted through the DOM before evAluAting
			// the new selection stAte.
			setTimeout(() => this._refreshSelectionContextKey(), 0);
		}));

		this._register(dom.AddDisposAbleListener(xterm.textAreA, 'focus', () => {
			this._terminAlFocusContextKey.set(true);
			if (this.shellType) {
				this._terminAlShellTypeContextKey.set(this.shellType.toString());
			} else {
				this._terminAlShellTypeContextKey.reset();
			}
			this._onFocused.fire(this);
		}));
		this._register(dom.AddDisposAbleListener(xterm.textAreA, 'blur', () => {
			this._terminAlFocusContextKey.reset();
			this._refreshSelectionContextKey();
		}));
		this._register(dom.AddDisposAbleListener(xterm.element, 'focus', () => {
			this._terminAlFocusContextKey.set(true);
			if (this.shellType) {
				this._terminAlShellTypeContextKey.set(this.shellType.toString());
			} else {
				this._terminAlShellTypeContextKey.reset();
			}
		}));
		this._register(dom.AddDisposAbleListener(xterm.element, 'blur', () => {
			this._terminAlFocusContextKey.reset();
			this._refreshSelectionContextKey();
		}));

		this._widgetMAnAger.AttAchToElement(xterm.element);
		this._processMAnAger.onProcessReAdy(() => this._linkMAnAger?.setWidgetMAnAger(this._widgetMAnAger));

		const computedStyle = window.getComputedStyle(this._contAiner);
		const width = pArseInt(computedStyle.getPropertyVAlue('width').replAce('px', ''), 10);
		const height = pArseInt(computedStyle.getPropertyVAlue('height').replAce('px', ''), 10);
		this.lAyout(new dom.Dimension(width, height));
		this.setVisible(this._isVisible);
		this.updAteConfig();

		// If IShellLAunchConfig.wAitOnExit wAs true And the process finished before the terminAl
		// pAnel wAs initiAlized.
		if (xterm.getOption('disAbleStdin')) {
			this._AttAchPressAnyKeyToCloseListener(xterm);
		}

		const neverMeAsureRenderTime = this._storAgeService.getBooleAn(NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, StorAgeScope.GLOBAL, fAlse);
		if (!neverMeAsureRenderTime && this._configHelper.config.rendererType === 'Auto') {
			this._meAsureRenderTime();
		}
	}

	privAte Async _meAsureRenderTime(): Promise<void> {
		AwAit this._xtermReAdyPromise;
		const frAmeTimes: number[] = [];
		const textRenderLAyer = this._xtermCore!._renderService._renderer._renderLAyers[0];
		const originAlOnGridChAnged = textRenderLAyer.onGridChAnged;

		const evAluAteCAnvAsRenderer = () => {
			// DiscArd first frAme time As it's normAl to tAke longer
			frAmeTimes.shift();

			const mediAnTime = frAmeTimes.sort((A, b) => A - b)[MAth.floor(frAmeTimes.length / 2)];
			if (mediAnTime > SLOW_CANVAS_RENDER_THRESHOLD) {
				const promptChoices: IPromptChoice[] = [
					{
						lAbel: nls.locAlize('yes', "Yes"),
						run: () => this._configurAtionService.updAteVAlue('terminAl.integrAted.rendererType', 'dom', ConfigurAtionTArget.USER)
					} As IPromptChoice,
					{
						lAbel: nls.locAlize('no', "No"),
						run: () => { }
					} As IPromptChoice,
					{
						lAbel: nls.locAlize('dontShowAgAin', "Don't Show AgAin"),
						isSecondAry: true,
						run: () => this._storAgeService.store(NEVER_MEASURE_RENDER_TIME_STORAGE_KEY, true, StorAgeScope.GLOBAL)
					} As IPromptChoice
				];
				this._notificAtionService.prompt(
					Severity.WArning,
					nls.locAlize('terminAl.slowRendering', 'The stAndArd renderer for the integrAted terminAl AppeArs to be slow on your computer. Would you like to switch to the AlternAtive DOM-bAsed renderer which mAy improve performAnce? [ReAd more About terminAl settings](https://code.visuAlstudio.com/docs/editor/integrAted-terminAl#_chAnging-how-the-terminAl-is-rendered).'),
					promptChoices
				);
			}
		};

		textRenderLAyer.onGridChAnged = (terminAl: XTermTerminAl, firstRow: number, lAstRow: number) => {
			const stArtTime = performAnce.now();
			originAlOnGridChAnged.cAll(textRenderLAyer, terminAl, firstRow, lAstRow);
			frAmeTimes.push(performAnce.now() - stArtTime);
			if (frAmeTimes.length === NUMBER_OF_FRAMES_TO_MEASURE) {
				evAluAteCAnvAsRenderer();
				// Restore originAl function
				textRenderLAyer.onGridChAnged = originAlOnGridChAnged;
			}
		};
	}

	public hAsSelection(): booleAn {
		return this._xterm ? this._xterm.hAsSelection() : fAlse;
	}

	public Async copySelection(): Promise<void> {
		const xterm = AwAit this._xtermReAdyPromise;
		if (this.hAsSelection()) {
			AwAit this._clipboArdService.writeText(xterm.getSelection());
		} else {
			this._notificAtionService.wArn(nls.locAlize('terminAl.integrAted.copySelection.noSelection', 'The terminAl hAs no selection to copy'));
		}
	}

	public get selection(): string | undefined {
		return this._xterm && this.hAsSelection() ? this._xterm.getSelection() : undefined;
	}

	public cleArSelection(): void {
		this._xterm?.cleArSelection();
	}

	public selectAll(): void {
		// Focus here to ensure the terminAl context key is set
		this._xterm?.focus();
		this._xterm?.selectAll();
	}

	public findNext(term: string, seArchOptions: ISeArchOptions): booleAn {
		if (!this._xtermSeArch) {
			return fAlse;
		}
		return this._xtermSeArch.findNext(term, seArchOptions);
	}

	public findPrevious(term: string, seArchOptions: ISeArchOptions): booleAn {
		if (!this._xtermSeArch) {
			return fAlse;
		}
		return this._xtermSeArch.findPrevious(term, seArchOptions);
	}

	public notifyFindWidgetFocusChAnged(isFocused: booleAn): void {
		if (!this._xterm) {
			return;
		}
		const terminAlFocused = !isFocused && (document.ActiveElement === this._xterm.textAreA || document.ActiveElement === this._xterm.element);
		this._terminAlFocusContextKey.set(terminAlFocused);
	}

	public dispose(immediAte?: booleAn): void {
		this._logService.trAce(`terminAlInstAnce#dispose (id: ${this.id})`);

		dispose(this._windowsShellHelper);
		this._windowsShellHelper = undefined;
		dispose(this._linkMAnAger);
		this._linkMAnAger = undefined;
		dispose(this._commAndTrAckerAddon);
		this._commAndTrAckerAddon = undefined;
		dispose(this._widgetMAnAger);

		if (this._xterm && this._xterm.element) {
			this._hAdFocusOnExit = this._xterm.element.clAssList.contAins('focus');
		}
		if (this._wrApperElement) {
			if (this._wrApperElement.xterm) {
				this._wrApperElement.xterm = undefined;
			}
			if (this._wrApperElement.pArentElement && this._contAiner) {
				this._contAiner.removeChild(this._wrApperElement);
			}
		}
		if (this._xterm) {
			const buffer = this._xterm.buffer;
			this._sendLineDAtA(buffer.Active, buffer.Active.bAseY + buffer.Active.cursorY);
			this._xterm.dispose();
		}

		if (this._pressAnyKeyToCloseListener) {
			this._pressAnyKeyToCloseListener.dispose();
			this._pressAnyKeyToCloseListener = undefined;
		}

		this._processMAnAger.dispose(immediAte);
		// Process mAnAger dispose/shutdown doesn't fire process exit, trigger with undefined if it
		// hAsn't hAppened yet
		this._onProcessExit(undefined);

		if (!this._isDisposed) {
			this._isDisposed = true;
			this._onDisposed.fire(this);
		}
		super.dispose();
	}

	public forceRedrAw(): void {
		if (!this._xterm) {
			return;
		}
		this._webglAddon?.cleArTextureAtlAs();
		// TODO: Do cAnvAs renderer too?
	}

	public focus(force?: booleAn): void {
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

	public Async focusWhenReAdy(force?: booleAn): Promise<void> {
		AwAit this._xtermReAdyPromise;
		this.focus(force);
	}

	public Async pAste(): Promise<void> {
		if (!this._xterm) {
			return;
		}
		this.focus();
		this._xterm.pAste(AwAit this._clipboArdService.reAdText());
	}

	public Async sendText(text: string, AddNewLine: booleAn): Promise<void> {
		// NormAlize line endings to 'enter' press.
		text = text.replAce(TerminAlInstAnce.EOL_REGEX, '\r');
		if (AddNewLine && text.substr(text.length - 1) !== '\r') {
			text += '\r';
		}

		// Send it to the process
		AwAit this._processMAnAger.ptyProcessReAdy;
		this._processMAnAger.write(text);
	}

	public setVisible(visible: booleAn): void {
		this._isVisible = visible;
		if (this._wrApperElement) {
			dom.toggleClAss(this._wrApperElement, 'Active', visible);
		}
		if (visible && this._xterm && this._xtermCore) {
			// Trigger A mAnuAl scroll event which will sync the viewport And scroll bAr. This is
			// necessAry if the number of rows in the terminAl hAs decreAsed while it wAs in the
			// bAckground since scrollTop chAnges tAke no effect but the terminAl's position does
			// chAnge since the number of visible rows decreAses.
			// This cAn likely be removed After https://github.com/xtermjs/xterm.js/issues/291 is
			// fixed upstreAm.
			this._xtermCore._onScroll.fire(this._xterm.buffer.Active.viewportY);
			if (this._contAiner && this._contAiner.pArentElement) {
				// Force A lAyout when the instAnce becomes invisible. This is pArticulArly importAnt
				// for ensuring thAt terminAls thAt Are creAted in the bAckground by An extension will
				// correctly get correct chArActer meAsurements in order to render to the screen (see
				// #34554).
				const computedStyle = window.getComputedStyle(this._contAiner.pArentElement);
				const width = pArseInt(computedStyle.getPropertyVAlue('width').replAce('px', ''), 10);
				const height = pArseInt(computedStyle.getPropertyVAlue('height').replAce('px', ''), 10);
				this.lAyout(new dom.Dimension(width, height));
				// HACK: Trigger Another Async lAyout to ensure xterm's ChArMeAsure is reAdy to use,
				// this hAck cAn be removed when https://github.com/xtermjs/xterm.js/issues/702 is
				// supported.
				this._timeoutDimension = new dom.Dimension(width, height);
				setTimeout(() => this.lAyout(this._timeoutDimension!), 0);
			}
		}
	}

	public scrollDownLine(): void {
		this._xterm?.scrollLines(1);
	}

	public scrollDownPAge(): void {
		this._xterm?.scrollPAges(1);
	}

	public scrollToBottom(): void {
		this._xterm?.scrollToBottom();
	}

	public scrollUpLine(): void {
		this._xterm?.scrollLines(-1);
	}

	public scrollUpPAge(): void {
		this._xterm?.scrollPAges(-1);
	}

	public scrollToTop(): void {
		this._xterm?.scrollToTop();
	}

	public cleAr(): void {
		this._xterm?.cleAr();
	}

	privAte _refreshSelectionContextKey() {
		const isActive = !!this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
		this._terminAlHAsTextContextKey.set(isActive && this.hAsSelection());
	}

	protected _creAteProcessMAnAger(): void {
		this._processMAnAger = this._instAntiAtionService.creAteInstAnce(TerminAlProcessMAnAger, this._id, this._configHelper);
		this._processMAnAger.onProcessReAdy(() => this._onProcessIdReAdy.fire(this));
		this._processMAnAger.onProcessExit(exitCode => this._onProcessExit(exitCode));
		this._processMAnAger.onProcessDAtA(dAtA => {
			this._initiAlDAtAEvents?.push(dAtA);
			this._onDAtA.fire(dAtA);
		});
		this._processMAnAger.onProcessOverrideDimensions(e => this.setDimensions(e));
		this._processMAnAger.onProcessResolvedShellLAunchConfig(e => this._setResolvedShellLAunchConfig(e));
		this._processMAnAger.onEnvironmentVAriAbleInfoChAnged(e => this._onEnvironmentVAriAbleInfoChAnged(e));

		if (this._shellLAunchConfig.nAme) {
			this.setTitle(this._shellLAunchConfig.nAme, TitleEventSource.Api);
		} else {
			// Only listen for process title chAnges when A nAme is not provided
			if (this._configHelper.config.experimentAlUseTitleEvent) {
				this._processMAnAger.ptyProcessReAdy.then(() => {
					this._terminAlInstAnceService.getDefAultShellAndArgs(fAlse).then(e => {
						this.setTitle(e.shell, TitleEventSource.Sequence);
					});
					this._xtermReAdyPromise.then(xterm => {
						this._messAgeTitleDisposAble = xterm.onTitleChAnge(e => this._onTitleChAnge(e));
					});
				});
			} else {
				this.setTitle(this._shellLAunchConfig.executAble, TitleEventSource.Process);
				this._messAgeTitleDisposAble = this._processMAnAger.onProcessTitle(title => this.setTitle(title ? title : '', TitleEventSource.Process));
			}
		}

		if (plAtform.isWindows) {
			this._processMAnAger.ptyProcessReAdy.then(() => {
				if (this._processMAnAger.remoteAuthority) {
					return;
				}
				this._xtermReAdyPromise.then(xterm => {
					if (!this._isDisposed && this._processMAnAger && this._processMAnAger.shellProcessId) {
						this._windowsShellHelper = this._terminAlInstAnceService.creAteWindowsShellHelper(this._processMAnAger.shellProcessId, xterm);
						this._windowsShellHelper.onShellNAmeChAnge(title => {
							this.setShellType(this.getShellType(title));
							if (this.isTitleSetByProcess && !this._configHelper.config.experimentAlUseTitleEvent) {
								this.setTitle(title, TitleEventSource.Process);
							}
						});
					}
				});
			});
		}
	}

	privAte _creAteProcess(): void {
		this._processMAnAger.creAteProcess(this._shellLAunchConfig, this._cols, this._rows, this._AccessibilityService.isScreenReAderOptimized()).then(error => {
			if (error) {
				this._onProcessExit(error);
			}
		});
	}

	privAte getShellType(executAble: string): TerminAlShellType {
		switch (executAble.toLowerCAse()) {
			cAse 'cmd.exe':
				return WindowsShellType.CommAndPrompt;
			cAse 'powershell.exe':
			cAse 'pwsh.exe':
				return WindowsShellType.PowerShell;
			cAse 'bAsh.exe':
				return WindowsShellType.GitBAsh;
			cAse 'wsl.exe':
			cAse 'ubuntu.exe':
			cAse 'ubuntu1804.exe':
			cAse 'kAli.exe':
			cAse 'debiAn.exe':
			cAse 'opensuse-42.exe':
			cAse 'sles-12.exe':
				return WindowsShellType.Wsl;
			defAult:
				return undefined;
		}
	}

	privAte _onProcessDAtA(dAtA: string): void {
		const messAgeId = ++this._lAtestXtermWriteDAtA;
		this._xterm?.write(dAtA, () => this._lAtestXtermPArseDAtA = messAgeId);
	}

	/**
	 * CAlled when either A process tied to A terminAl hAs exited or when A terminAl renderer
	 * simulAtes A process exiting (e.g. custom execution tAsk).
	 * @pArAm exitCode The exit code of the process, this is undefined when the terminAl wAs exited
	 * through user Action.
	 */
	privAte Async _onProcessExit(exitCodeOrError?: number | ITerminAlLAunchError): Promise<void> {
		// Prevent dispose functions being triggered multiple times
		if (this._isExiting) {
			return;
		}

		this._isExiting = true;

		AwAit this._flushXtermDAtA();
		this._logService.debug(`TerminAl process exit (id: ${this.id}) with code ${this._exitCode}`);

		let exitCodeMessAge: string | undefined;

		// CreAte exit code messAge
		switch (typeof exitCodeOrError) {
			cAse 'number':
				// Only show the error if the exit code is non-zero
				this._exitCode = exitCodeOrError;
				if (this._exitCode === 0) {
					breAk;
				}

				let commAndLine: string | undefined = undefined;
				if (this._shellLAunchConfig.executAble) {
					commAndLine = this._shellLAunchConfig.executAble;
					if (typeof this._shellLAunchConfig.Args === 'string') {
						commAndLine += ` ${this._shellLAunchConfig.Args}`;
					} else if (this._shellLAunchConfig.Args && this._shellLAunchConfig.Args.length) {
						commAndLine += this._shellLAunchConfig.Args.mAp(A => ` '${A}'`).join();
					}
				}

				if (this._processMAnAger.processStAte === ProcessStAte.KILLED_DURING_LAUNCH) {
					if (commAndLine) {
						exitCodeMessAge = nls.locAlize('lAunchFAiled.exitCodeAndCommAndLine', "The terminAl process \"{0}\" fAiled to lAunch (exit code: {1}).", commAndLine, this._exitCode);
						breAk;
					}
					exitCodeMessAge = nls.locAlize('lAunchFAiled.exitCodeOnly', "The terminAl process fAiled to lAunch (exit code: {0}).", this._exitCode);
					breAk;
				}
				if (commAndLine) {
					exitCodeMessAge = nls.locAlize('terminAted.exitCodeAndCommAndLine', "The terminAl process \"{0}\" terminAted with exit code: {1}.", commAndLine, this._exitCode);
					breAk;
				}
				exitCodeMessAge = nls.locAlize('terminAted.exitCodeOnly', "The terminAl process terminAted with exit code: {0}.", this._exitCode);
				breAk;
			cAse 'object':
				this._exitCode = exitCodeOrError.code;
				exitCodeMessAge = nls.locAlize('lAunchFAiled.errorMessAge', "The terminAl process fAiled to lAunch: {0}.", exitCodeOrError.messAge);
				breAk;
		}

		this._logService.debug(`TerminAl process exit (id: ${this.id}) stAte ${this._processMAnAger.processStAte}`);

		// Only trigger wAit on exit when the exit wAs *not* triggered by the
		// user (viA the `workbench.Action.terminAl.kill` commAnd).
		if (this._shellLAunchConfig.wAitOnExit && this._processMAnAger.processStAte !== ProcessStAte.KILLED_BY_USER) {
			this._xtermReAdyPromise.then(xterm => {
				if (exitCodeMessAge) {
					xterm.writeln(exitCodeMessAge);
				}
				if (typeof this._shellLAunchConfig.wAitOnExit === 'string') {
					let messAge = this._shellLAunchConfig.wAitOnExit;
					// Bold the messAge And Add An extrA new line to mAke it stAnd out from the rest of the output
					messAge = `\r\n\x1b[1m${messAge}\x1b[0m`;
					xterm.writeln(messAge);
				}
				// DisAble All input if the terminAl is exiting And listen for next keypress
				xterm.setOption('disAbleStdin', true);
				if (xterm.textAreA) {
					this._AttAchPressAnyKeyToCloseListener(xterm);
				}
			});
		} else {
			this.dispose();
			if (exitCodeMessAge) {
				const fAiledDuringLAunch = this._processMAnAger.processStAte === ProcessStAte.KILLED_DURING_LAUNCH;
				if (fAiledDuringLAunch || this._configHelper.config.showExitAlert) {
					// AlwAys show lAunch fAilures
					this._notificAtionService.notify({
						messAge: exitCodeMessAge,
						severity: Severity.Error,
						Actions: { primAry: [this._instAntiAtionService.creAteInstAnce(TerminAlLAunchHelpAction)] }
					});
				} else {
					// Log to help surfAce the error in cAse users report issues with showExitAlert
					// disAbled
					this._logService.wArn(exitCodeMessAge);
				}
			}
		}

		this._onExit.fire(this._exitCode);
	}

	/**
	 * Ensure write cAlls to xterm.js hAve finished before resolving.
	 */
	privAte _flushXtermDAtA(): Promise<void> {
		if (this._lAtestXtermWriteDAtA === this._lAtestXtermPArseDAtA) {
			return Promise.resolve();
		}
		let retries = 0;
		return new Promise<void>(r => {
			const intervAl = setIntervAl(() => {
				if (this._lAtestXtermWriteDAtA === this._lAtestXtermPArseDAtA || ++retries === 5) {
					cleArIntervAl(intervAl);
					r();
				}
			}, 20);
		});
	}

	privAte _AttAchPressAnyKeyToCloseListener(xterm: XTermTerminAl) {
		if (xterm.textAreA && !this._pressAnyKeyToCloseListener) {
			this._pressAnyKeyToCloseListener = dom.AddDisposAbleListener(xterm.textAreA, 'keypress', (event: KeyboArdEvent) => {
				if (this._pressAnyKeyToCloseListener) {
					this._pressAnyKeyToCloseListener.dispose();
					this._pressAnyKeyToCloseListener = undefined;
					this.dispose();
					event.preventDefAult();
				}
			});
		}
	}

	public reuseTerminAl(shell: IShellLAunchConfig, reset: booleAn = fAlse): void {
		// Unsubscribe Any key listener we mAy hAve.
		this._pressAnyKeyToCloseListener?.dispose();
		this._pressAnyKeyToCloseListener = undefined;

		// Kill And cleAr up the process, mAking the process mAnAger reAdy for A new process
		this._processMAnAger.dispose();

		if (this._xterm) {
			if (reset) {
				this._xterm.reset();
			} else {
				// Ensure new processes' output stArts At stArt of new line
				this._xterm.write('\n\x1b[G');
			}

			// Print initiAlText if specified
			if (shell.initiAlText) {
				this._xterm.writeln(shell.initiAlText);
			}

			// CleAn up wAitOnExit stAte
			if (this._isExiting && this._shellLAunchConfig.wAitOnExit) {
				this._xterm.setOption('disAbleStdin', fAlse);
				this._isExiting = fAlse;
			}
		}

		// Dispose the environment info widget if it exists
		this._environmentInfo?.disposAble.dispose();
		this._environmentInfo = undefined;

		if (!reset) {
			// HACK: Force initiAlText to be non-fAlsy for reused terminAls such thAt the
			// conptyInheritCursor flAg is pAssed to the node-pty, this flAg cAn cAuse A Window to stop
			// responding in Windows 10 1903 so we only wAnt to use it when something is definitely written
			// to the terminAl.
			shell.initiAlText = ' ';
		}

		// Set the new shell lAunch config
		this._shellLAunchConfig = shell; // Must be done before cAlling _creAteProcess()

		// LAunch the process unless this is only A renderer.
		// In the renderer only cAses, we still need to set the title correctly.
		const oldTitle = this._title;
		this._creAteProcessMAnAger();

		if (oldTitle !== this._title) {
			this.setTitle(this._title, TitleEventSource.Process);
		}

		this._processMAnAger.onProcessDAtA(dAtA => this._onProcessDAtA(dAtA));
		this._creAteProcess();
	}

	public relAunch(): void {
		this.reuseTerminAl(this._shellLAunchConfig, true);
	}

	privAte _onLineFeed(): void {
		const buffer = this._xterm!.buffer;
		const newLine = buffer.Active.getLine(buffer.Active.bAseY + buffer.Active.cursorY);
		if (newLine && !newLine.isWrApped) {
			this._sendLineDAtA(buffer.Active, buffer.Active.bAseY + buffer.Active.cursorY - 1);
		}
	}

	privAte _onCursorMove(): void {
		const buffer = this._xterm!.buffer;
		this._sendLineDAtA(buffer.Active, buffer.Active.bAseY + buffer.Active.cursorY);
	}

	privAte _onTitleChAnge(title: string): void {
		if (this.isTitleSetByProcess) {
			this.setTitle(title, TitleEventSource.Sequence);
		}
	}

	privAte _sendLineDAtA(buffer: IBuffer, lineIndex: number): void {
		let line = buffer.getLine(lineIndex);
		if (!line) {
			return;
		}
		let lineDAtA = line.trAnslAteToString(true);
		while (lineIndex > 0 && line.isWrApped) {
			line = buffer.getLine(--lineIndex);
			if (!line) {
				breAk;
			}
			lineDAtA = line.trAnslAteToString(fAlse) + lineDAtA;
		}
		this._onLineDAtA.fire(lineDAtA);
	}

	privAte _onKey(key: string, ev: KeyboArdEvent): void {
		const event = new StAndArdKeyboArdEvent(ev);

		if (event.equAls(KeyCode.Enter)) {
			this._updAteProcessCwd();
		}
	}

	privAte Async _onSelectionChAnge(): Promise<void> {
		if (this._configurAtionService.getVAlue('terminAl.integrAted.copyOnSelection')) {
			if (this.hAsSelection()) {
				AwAit this.copySelection();
			}
		}
	}

	@debounce(2000)
	privAte Async _updAteProcessCwd(): Promise<string> {
		// reset cwd if it hAs chAnged, so file bAsed url pAths cAn be resolved
		const cwd = AwAit this.getCwd();
		if (cwd && this._linkMAnAger) {
			this._linkMAnAger.processCwd = cwd;
		}
		return cwd;
	}

	public updAteConfig(): void {
		const config = this._configHelper.config;
		this._setCursorBlink(config.cursorBlinking);
		this._setCursorStyle(config.cursorStyle);
		this._setCursorWidth(config.cursorWidth);
		this._setCommAndsToSkipShell(config.commAndsToSkipShell);
		this._setEnAbleBell(config.enAbleBell);
		this._sAfeSetOption('scrollbAck', config.scrollbAck);
		this._sAfeSetOption('minimumContrAstRAtio', config.minimumContrAstRAtio);
		this._sAfeSetOption('fAstScrollSensitivity', config.fAstScrollSensitivity);
		this._sAfeSetOption('scrollSensitivity', config.mouseWheelScrollSensitivity);
		this._sAfeSetOption('mAcOptionIsMetA', config.mAcOptionIsMetA);
		this._sAfeSetOption('mAcOptionClickForcesSelection', config.mAcOptionClickForcesSelection);
		this._sAfeSetOption('rightClickSelectsWord', config.rightClickBehAvior === 'selectWord');
		this._sAfeSetOption('wordSepArAtor', config.wordSepArAtors);
		if (config.rendererType === 'experimentAlWebgl') {
			this._enAbleWebglRenderer();
		} else {
			this._webglAddon?.dispose();
			this._webglAddon = undefined;
			// Never set webgl As it's An Addon not A rendererType
			this._sAfeSetOption('rendererType', config.rendererType === 'Auto' ? 'cAnvAs' : config.rendererType);
		}
		this._refreshEnvironmentVAriAbleInfoWidgetStAte(this._processMAnAger.environmentVAriAbleInfo);
	}

	privAte Async _enAbleWebglRenderer(): Promise<void> {
		if (!this._xterm || this._webglAddon) {
			return;
		}
		const Addon = AwAit this._terminAlInstAnceService.getXtermWebglConstructor();
		this._webglAddon = new Addon();
		this._xterm.loAdAddon(this._webglAddon);
	}

	privAte Async _updAteUnicodeVersion(): Promise<void> {
		if (!this._xterm) {
			throw new Error('CAnnot updAte unicode version before xterm hAs been initiAlized');
		}
		if (!this._xtermUnicode11 && this._configHelper.config.unicodeVersion === '11') {
			const Addon = AwAit this._terminAlInstAnceService.getXtermUnicode11Constructor();
			this._xtermUnicode11 = new Addon();
			this._xterm.loAdAddon(this._xtermUnicode11);
		}
		this._xterm.unicode.ActiveVersion = this._configHelper.config.unicodeVersion;
	}

	public updAteAccessibilitySupport(): void {
		const isEnAbled = this._AccessibilityService.isScreenReAderOptimized();
		if (isEnAbled) {
			this._nAvigAtionModeAddon = new NAvigAtionModeAddon(this._terminAlA11yTreeFocusContextKey);
			this._xterm!.loAdAddon(this._nAvigAtionModeAddon);
		} else {
			this._nAvigAtionModeAddon?.dispose();
			this._nAvigAtionModeAddon = undefined;
		}
		this._xterm!.setOption('screenReAderMode', isEnAbled);
	}

	privAte _setCursorBlink(blink: booleAn): void {
		if (this._xterm && this._xterm.getOption('cursorBlink') !== blink) {
			this._xterm.setOption('cursorBlink', blink);
			this._xterm.refresh(0, this._xterm.rows - 1);
		}
	}

	privAte _setCursorStyle(style: string): void {
		if (this._xterm && this._xterm.getOption('cursorStyle') !== style) {
			// 'line' is used insteAd of bAr in VS Code to be consistent with editor.cursorStyle
			const xtermOption = style === 'line' ? 'bAr' : style;
			this._xterm.setOption('cursorStyle', xtermOption);
		}
	}

	privAte _setCursorWidth(width: number): void {
		if (this._xterm && this._xterm.getOption('cursorWidth') !== width) {
			this._xterm.setOption('cursorWidth', width);
		}
	}

	privAte _setCommAndsToSkipShell(commAnds: string[]): void {
		const excludeCommAnds = commAnds.filter(commAnd => commAnd[0] === '-').mAp(commAnd => commAnd.slice(1));
		this._skipTerminAlCommAnds = DEFAULT_COMMANDS_TO_SKIP_SHELL.filter(defAultCommAnd => {
			return excludeCommAnds.indexOf(defAultCommAnd) === -1;
		}).concAt(commAnds);
	}

	privAte _setEnAbleBell(isEnAbled: booleAn): void {
		if (this._xterm) {
			if (this._xterm.getOption('bellStyle') === 'sound') {
				if (!this._configHelper.config.enAbleBell) {
					this._xterm.setOption('bellStyle', 'none');
				}
			} else {
				if (this._configHelper.config.enAbleBell) {
					this._xterm.setOption('bellStyle', 'sound');
				}
			}
		}
	}

	privAte _sAfeSetOption(key: string, vAlue: Any): void {
		if (!this._xterm) {
			return;
		}

		if (this._xterm.getOption(key) !== vAlue) {
			this._xterm.setOption(key, vAlue);
		}
	}

	public lAyout(dimension: dom.Dimension): void {
		if (this.disAbleLAyout) {
			return;
		}

		const terminAlWidth = this._evAluAteColsAndRows(dimension.width, dimension.height);
		if (!terminAlWidth) {
			return;
		}

		this._timeoutDimension = new dom.Dimension(dimension.width, dimension.height);

		if (this._xterm && this._xterm.element) {
			this._xterm.element.style.width = terminAlWidth + 'px';
		}

		this._resize();
	}

	@debounce(50)
	privAte Async _resize(): Promise<void> {
		let cols = this.cols;
		let rows = this.rows;

		if (this._xterm && this._xtermCore) {
			// Only Apply these settings when the terminAl is visible so thAt
			// the chArActers Are meAsured correctly.
			if (this._isVisible) {
				const font = this._configHelper.getFont(this._xtermCore);
				const config = this._configHelper.config;
				this._sAfeSetOption('letterSpAcing', font.letterSpAcing);
				this._sAfeSetOption('lineHeight', font.lineHeight);
				this._sAfeSetOption('fontSize', font.fontSize);
				this._sAfeSetOption('fontFAmily', font.fontFAmily);
				this._sAfeSetOption('fontWeight', config.fontWeight);
				this._sAfeSetOption('fontWeightBold', config.fontWeightBold);
				this._sAfeSetOption('drAwBoldTextInBrightColors', config.drAwBoldTextInBrightColors);

				// Any of the Above setting chAnges could hAve chAnged the dimensions of the
				// terminAl, re-evAluAte now.
				this._initDimensions();
				cols = this.cols;
				rows = this.rows;
			}

			if (isNAN(cols) || isNAN(rows)) {
				return;
			}

			if (cols !== this._xterm.cols || rows !== this._xterm.rows) {
				this._onDimensionsChAnged.fire();
			}

			this._xterm.resize(cols, rows);
			TerminAlInstAnce._lAstKnownGridDimensions = { cols, rows };

			if (this._isVisible) {
				// HACK: Force the renderer to unpAuse by simulAting An IntersectionObserver event.
				// This is to fix An issue where drAgging the window to the top of the screen to
				// mAximize on Windows/Linux would fire An event sAying thAt the terminAl wAs not
				// visible.
				if (this._xterm.getOption('rendererType') === 'cAnvAs') {
					this._xtermCore._renderService._onIntersectionChAnge({ intersectionRAtio: 1 });
					// HACK: Force A refresh of the screen to ensure links Are refresh corrected.
					// This cAn probAbly be removed when the Above hAck is fixed in Chromium.
					this._xterm.refresh(0, this._xterm.rows - 1);
				}
			}
		}

		AwAit this._processMAnAger.ptyProcessReAdy;
		this._processMAnAger.setDimensions(cols, rows);
	}

	public setShellType(shellType: TerminAlShellType) {
		this._shellType = shellType;
	}

	public setTitle(title: string | undefined, eventSource: TitleEventSource): void {
		if (!title) {
			return;
		}
		switch (eventSource) {
			cAse TitleEventSource.Process:
				title = pAth.bAsenAme(title);
				if (plAtform.isWindows) {
					// Remove the .exe extension
					title = title.split('.exe')[0];
				}
				breAk;
			cAse TitleEventSource.Api:
				// If the title hAs not been set by the API or the renAme commAnd, unregister the hAndler thAt
				// AutomAticAlly updAtes the terminAl nAme
				dispose(this._messAgeTitleDisposAble);
				this._messAgeTitleDisposAble = undefined;
				dispose(this._windowsShellHelper);
				this._windowsShellHelper = undefined;
				breAk;
		}
		const didTitleChAnge = title !== this._title;
		this._title = title;
		if (didTitleChAnge) {
			if (this._titleReAdyComplete) {
				this._titleReAdyComplete(title);
				this._titleReAdyComplete = undefined;
			}
			this._onTitleChAnged.fire(this);
		}
	}

	public wAitForTitle(): Promise<string> {
		return this._titleReAdyPromise;
	}

	public setDimensions(dimensions: ITerminAlDimensions | undefined): void {
		this._dimensionsOverride = dimensions;
		this._resize();
	}

	privAte _setResolvedShellLAunchConfig(shellLAunchConfig: IShellLAunchConfig): void {
		this._shellLAunchConfig.Args = shellLAunchConfig.Args;
		this._shellLAunchConfig.cwd = shellLAunchConfig.cwd;
		this._shellLAunchConfig.executAble = shellLAunchConfig.executAble;
		this._shellLAunchConfig.env = shellLAunchConfig.env;
	}

	public showEnvironmentInfoHover(): void {
		if (this._environmentInfo) {
			this._environmentInfo.widget.focus();
		}
	}

	privAte _onEnvironmentVAriAbleInfoChAnged(info: IEnvironmentVAriAbleInfo): void {
		if (info.requiresAction) {
			this._xterm?.textAreA?.setAttribute('AriA-lAbel', nls.locAlize('terminAlStAleTextBoxAriALAbel', "TerminAl {0} environment is stAle, run the 'Show Environment InformAtion' commAnd for more informAtion", this._id));
		}
		this._refreshEnvironmentVAriAbleInfoWidgetStAte(info);
	}

	privAte _refreshEnvironmentVAriAbleInfoWidgetStAte(info?: IEnvironmentVAriAbleInfo): void {
		this._environmentInfo?.disposAble.dispose();

		// Check if the widget should not exist
		if (!info ||
			this._configHelper.config.environmentChAngesIndicAtor === 'off' ||
			this._configHelper.config.environmentChAngesIndicAtor === 'wArnonly' && !info.requiresAction) {
			this._environmentInfo = undefined;
			return;
		}

		// (Re-)creAte the widget
		const widget = this._instAntiAtionService.creAteInstAnce(EnvironmentVAriAbleInfoWidget, info);
		const disposAble = this._widgetMAnAger.AttAchWidget(widget);
		if (disposAble) {
			this._environmentInfo = { widget, disposAble };
		}
	}

	privAte _getXtermTheme(theme?: IColorTheme): Any {
		if (!theme) {
			theme = this._themeService.getColorTheme();
		}

		const locAtion = this._viewDescriptorService.getViewLocAtionById(TERMINAL_VIEW_ID)!;
		const foregroundColor = theme.getColor(TERMINAL_FOREGROUND_COLOR);
		const bAckgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || (locAtion === ViewContAinerLocAtion.SidebAr ? theme.getColor(SIDE_BAR_BACKGROUND) : theme.getColor(PANEL_BACKGROUND));
		const cursorColor = theme.getColor(TERMINAL_CURSOR_FOREGROUND_COLOR) || foregroundColor;
		const cursorAccentColor = theme.getColor(TERMINAL_CURSOR_BACKGROUND_COLOR) || bAckgroundColor;
		const selectionColor = theme.getColor(TERMINAL_SELECTION_BACKGROUND_COLOR);

		return {
			bAckground: bAckgroundColor ? bAckgroundColor.toString() : null,
			foreground: foregroundColor ? foregroundColor.toString() : null,
			cursor: cursorColor ? cursorColor.toString() : null,
			cursorAccent: cursorAccentColor ? cursorAccentColor.toString() : null,
			selection: selectionColor ? selectionColor.toString() : null,
			blAck: theme.getColor(AnsiColorIdentifiers[0])!.toString(),
			red: theme.getColor(AnsiColorIdentifiers[1])!.toString(),
			green: theme.getColor(AnsiColorIdentifiers[2])!.toString(),
			yellow: theme.getColor(AnsiColorIdentifiers[3])!.toString(),
			blue: theme.getColor(AnsiColorIdentifiers[4])!.toString(),
			mAgentA: theme.getColor(AnsiColorIdentifiers[5])!.toString(),
			cyAn: theme.getColor(AnsiColorIdentifiers[6])!.toString(),
			white: theme.getColor(AnsiColorIdentifiers[7])!.toString(),
			brightBlAck: theme.getColor(AnsiColorIdentifiers[8])!.toString(),
			brightRed: theme.getColor(AnsiColorIdentifiers[9])!.toString(),
			brightGreen: theme.getColor(AnsiColorIdentifiers[10])!.toString(),
			brightYellow: theme.getColor(AnsiColorIdentifiers[11])!.toString(),
			brightBlue: theme.getColor(AnsiColorIdentifiers[12])!.toString(),
			brightMAgentA: theme.getColor(AnsiColorIdentifiers[13])!.toString(),
			brightCyAn: theme.getColor(AnsiColorIdentifiers[14])!.toString(),
			brightWhite: theme.getColor(AnsiColorIdentifiers[15])!.toString()
		};
	}

	privAte _updAteTheme(xterm: XTermTerminAl, theme?: IColorTheme): void {
		xterm.setOption('theme', this._getXtermTheme(theme));
	}

	public Async toggleEscApeSequenceLogging(): Promise<void> {
		const xterm = AwAit this._xtermReAdyPromise;
		const isDebug = xterm.getOption('logLevel') === 'debug';
		xterm.setOption('logLevel', isDebug ? 'info' : 'debug');
	}

	public getInitiAlCwd(): Promise<string> {
		return this._processMAnAger.getInitiAlCwd();
	}

	public getCwd(): Promise<string> {
		return this._processMAnAger.getCwd();
	}

	public registerLinkProvider(provider: ITerminAlExternAlLinkProvider): IDisposAble {
		if (!this._linkMAnAger) {
			throw new Error('TerminAlInstAnce.registerLinkProvider before link mAnAger wAs reAdy');
		}
		return this._linkMAnAger.registerExternAlLinkProvider(this, provider);
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	// Border
	const border = theme.getColor(ActiveContrAstBorder);
	if (border) {
		collector.AddRule(`
			.monAco-workbench.hc-blAck .pAne-body.integrAted-terminAl .xterm.focus::before,
			.monAco-workbench.hc-blAck .pAne-body.integrAted-terminAl .xterm:focus::before { border-color: ${border}; }`
		);
	}

	// ScrollbAr
	const scrollbArSliderBAckgroundColor = theme.getColor(scrollbArSliderBAckground);
	if (scrollbArSliderBAckgroundColor) {
		collector.AddRule(`
			.monAco-workbench .pAne-body.integrAted-terminAl .find-focused .xterm .xterm-viewport,
			.monAco-workbench .pAne-body.integrAted-terminAl .xterm.focus .xterm-viewport,
			.monAco-workbench .pAne-body.integrAted-terminAl .xterm:focus .xterm-viewport,
			.monAco-workbench .pAne-body.integrAted-terminAl .xterm:hover .xterm-viewport { bAckground-color: ${scrollbArSliderBAckgroundColor} !importAnt; }`
		);
	}

	const scrollbArSliderHoverBAckgroundColor = theme.getColor(scrollbArSliderHoverBAckground);
	if (scrollbArSliderHoverBAckgroundColor) {
		collector.AddRule(`.monAco-workbench .pAne-body.integrAted-terminAl .xterm .xterm-viewport::-webkit-scrollbAr-thumb:hover { bAckground-color: ${scrollbArSliderHoverBAckgroundColor}; }`);
	}

	const scrollbArSliderActiveBAckgroundColor = theme.getColor(scrollbArSliderActiveBAckground);
	if (scrollbArSliderActiveBAckgroundColor) {
		collector.AddRule(`.monAco-workbench .pAne-body.integrAted-terminAl .xterm .xterm-viewport::-webkit-scrollbAr-thumb:Active { bAckground-color: ${scrollbArSliderActiveBAckgroundColor}; }`);
	}
});
