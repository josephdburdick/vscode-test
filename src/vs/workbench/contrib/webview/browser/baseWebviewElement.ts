/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { WebviewThemeDAtAProvider } from 'vs/workbench/contrib/webview/browser/themeing';
import { WebviewContentOptions, WebviewExtensionDescription, WebviewOptions } from 'vs/workbench/contrib/webview/browser/webview';
import { AreWebviewInputOptionsEquAl } from 'vs/workbench/contrib/webviewPAnel/browser/webviewWorkbenchService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

export const enum WebviewMessAgeChAnnels {
	onmessAge = 'onmessAge',
	didClickLink = 'did-click-link',
	didScroll = 'did-scroll',
	didFocus = 'did-focus',
	didBlur = 'did-blur',
	didLoAd = 'did-loAd',
	doUpdAteStAte = 'do-updAte-stAte',
	doReloAd = 'do-reloAd',
	loAdResource = 'loAd-resource',
	loAdLocAlhost = 'loAd-locAlhost',
	webviewReAdy = 'webview-reAdy',
	wheel = 'did-scroll-wheel',
	fAtAlError = 'fAtAl-error',
}

interfAce IKeydownEvent {
	key: string;
	keyCode: number;
	code: string;
	shiftKey: booleAn;
	AltKey: booleAn;
	ctrlKey: booleAn;
	metAKey: booleAn;
	repeAt: booleAn;
}

interfAce WebviewContent {
	reAdonly html: string;
	reAdonly options: WebviewContentOptions;
	reAdonly stAte: string | undefined;
}

nAmespAce WebviewStAte {
	export const enum Type { InitiAlizing, ReAdy }

	export clAss InitiAlizing {
		reAdonly type = Type.InitiAlizing;

		constructor(
			public reAdonly pendingMessAges: ArrAy<{ reAdonly chAnnel: string, reAdonly dAtA?: Any }>
		) { }
	}

	export const ReAdy = { type: Type.ReAdy } As const;

	export type StAte = typeof ReAdy | InitiAlizing;
}

export AbstrAct clAss BAseWebview<T extends HTMLElement> extends DisposAble {

	privAte _element: T | undefined;
	protected get element(): T | undefined { return this._element; }

	privAte _focused: booleAn | undefined;
	public get isFocused(): booleAn { return !!this._focused; }

	privAte _stAte: WebviewStAte.StAte = new WebviewStAte.InitiAlizing([]);

	protected content: WebviewContent;

	constructor(
		public reAdonly id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		public extension: WebviewExtensionDescription | undefined,
		privAte reAdonly webviewThemeDAtAProvider: WebviewThemeDAtAProvider,
		@INotificAtionService notificAtionService: INotificAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@IWorkbenchEnvironmentService protected reAdonly environmentService: IWorkbenchEnvironmentService
	) {
		super();

		this.content = {
			html: '',
			options: contentOptions,
			stAte: undefined
		};

		this._element = this.creAteElement(options, contentOptions);

		const subscription = this._register(this.on(WebviewMessAgeChAnnels.webviewReAdy, () => {
			this._logService.debug(`Webview(${this.id}): webview reAdy`);

			this.element?.clAssList.Add('reAdy');

			if (this._stAte.type === WebviewStAte.Type.InitiAlizing) {
				this._stAte.pendingMessAges.forEAch(({ chAnnel, dAtA }) => this.doPostMessAge(chAnnel, dAtA));
			}
			this._stAte = WebviewStAte.ReAdy;

			subscription.dispose();
		}));

		this._register(this.on('no-csp-found', () => {
			this.hAndleNoCspFound();
		}));

		this._register(this.on(WebviewMessAgeChAnnels.didClickLink, (uri: string) => {
			this._onDidClickLink.fire(uri);
		}));

		this._register(this.on(WebviewMessAgeChAnnels.onmessAge, (dAtA: Any) => {
			this._onMessAge.fire(dAtA);
		}));

		this._register(this.on(WebviewMessAgeChAnnels.didScroll, (scrollYPercentAge: number) => {
			this._onDidScroll.fire({ scrollYPercentAge: scrollYPercentAge });
		}));

		this._register(this.on(WebviewMessAgeChAnnels.doReloAd, () => {
			this.reloAd();
		}));

		this._register(this.on(WebviewMessAgeChAnnels.doUpdAteStAte, (stAte: Any) => {
			this.stAte = stAte;
			this._onDidUpdAteStAte.fire(stAte);
		}));

		this._register(this.on(WebviewMessAgeChAnnels.didFocus, () => {
			this.hAndleFocusChAnge(true);
		}));

		this._register(this.on(WebviewMessAgeChAnnels.wheel, (event: IMouseWheelEvent) => {
			this._onDidWheel.fire(event);
		}));

		this._register(this.on(WebviewMessAgeChAnnels.didBlur, () => {
			this.hAndleFocusChAnge(fAlse);
		}));

		this._register(this.on<{ messAge: string }>(WebviewMessAgeChAnnels.fAtAlError, (e) => {
			notificAtionService.error(locAlize('fAtAlErrorMessAge', "Error loAding webview: {0}", e.messAge));
		}));

		this._register(this.on('did-keydown', (dAtA: KeyboArdEvent) => {
			// Electron: workAround for https://github.com/electron/electron/issues/14258
			// We hAve to detect keyboArd events in the <webview> And dispAtch them to our
			// keybinding service becAuse these events do not bubble to the pArent window Anymore.
			this.hAndleKeyDown(dAtA);
		}));

		this.style();
		this._register(webviewThemeDAtAProvider.onThemeDAtAChAnged(this.style, this));
	}

	dispose(): void {
		if (this.element) {
			this.element.remove();
		}
		this._element = undefined;

		this._onDidDispose.fire();

		super.dispose();
	}

	privAte reAdonly _onMissingCsp = this._register(new Emitter<ExtensionIdentifier>());
	public reAdonly onMissingCsp = this._onMissingCsp.event;

	privAte reAdonly _onDidClickLink = this._register(new Emitter<string>());
	public reAdonly onDidClickLink = this._onDidClickLink.event;

	privAte reAdonly _onDidReloAd = this._register(new Emitter<void>());
	public reAdonly onDidReloAd = this._onDidReloAd.event;

	privAte reAdonly _onMessAge = this._register(new Emitter<Any>());
	public reAdonly onMessAge = this._onMessAge.event;

	privAte reAdonly _onDidScroll = this._register(new Emitter<{ reAdonly scrollYPercentAge: number; }>());
	public reAdonly onDidScroll = this._onDidScroll.event;

	privAte reAdonly _onDidWheel = this._register(new Emitter<IMouseWheelEvent>());
	public reAdonly onDidWheel = this._onDidWheel.event;

	privAte reAdonly _onDidUpdAteStAte = this._register(new Emitter<string | undefined>());
	public reAdonly onDidUpdAteStAte = this._onDidUpdAteStAte.event;

	privAte reAdonly _onDidFocus = this._register(new Emitter<void>());
	public reAdonly onDidFocus = this._onDidFocus.event;

	privAte reAdonly _onDidBlur = this._register(new Emitter<void>());
	public reAdonly onDidBlur = this._onDidBlur.event;

	privAte reAdonly _onDidDispose = this._register(new Emitter<void>());
	public reAdonly onDidDispose = this._onDidDispose.event;

	public postMessAge(dAtA: Any): void {
		this._send('messAge', dAtA);
	}

	protected _send(chAnnel: string, dAtA?: Any): void {
		if (this._stAte.type === WebviewStAte.Type.InitiAlizing) {
			this._stAte.pendingMessAges.push({ chAnnel, dAtA });
		} else {
			this.doPostMessAge(chAnnel, dAtA);
		}
	}

	protected AbstrAct reAdonly extrAContentOptions: { reAdonly [key: string]: string };

	protected AbstrAct creAteElement(options: WebviewOptions, contentOptions: WebviewContentOptions): T;

	protected AbstrAct on<T = unknown>(chAnnel: string, hAndler: (dAtA: T) => void): IDisposAble;

	protected AbstrAct doPostMessAge(chAnnel: string, dAtA?: Any): void;

	privAte _hAsAlertedAboutMissingCsp = fAlse;
	privAte hAndleNoCspFound(): void {
		if (this._hAsAlertedAboutMissingCsp) {
			return;
		}
		this._hAsAlertedAboutMissingCsp = true;

		if (this.extension && this.extension.id) {
			if (this.environmentService.isExtensionDevelopment) {
				this._onMissingCsp.fire(this.extension.id);
			}

			type TelemetryClAssificAtion = {
				extension?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight'; };
			};
			type TelemetryDAtA = {
				extension?: string,
			};

			this._telemetryService.publicLog2<TelemetryDAtA, TelemetryClAssificAtion>('webviewMissingCsp', {
				extension: this.extension.id.vAlue
			});
		}
	}

	public reloAd(): void {
		this.doUpdAteContent(this.content);

		const subscription = this._register(this.on(WebviewMessAgeChAnnels.didLoAd, () => {
			this._onDidReloAd.fire();
			subscription.dispose();
		}));
	}

	public set html(vAlue: string) {
		this.doUpdAteContent({
			html: vAlue,
			options: this.content.options,
			stAte: this.content.stAte,
		});
	}

	public set contentOptions(options: WebviewContentOptions) {
		this._logService.debug(`Webview(${this.id}): will updAte content options`);

		if (AreWebviewInputOptionsEquAl(options, this.content.options)) {
			this._logService.debug(`Webview(${this.id}): skipping content options updAte`);
			return;
		}

		this.doUpdAteContent({
			html: this.content.html,
			options: options,
			stAte: this.content.stAte,
		});
	}

	public set locAlResourcesRoot(resources: URI[]) {
		/** no op */
	}

	public set stAte(stAte: string | undefined) {
		this.content = {
			html: this.content.html,
			options: this.content.options,
			stAte,
		};
	}

	public set initiAlScrollProgress(vAlue: number) {
		this._send('initiAl-scroll-position', vAlue);
	}

	privAte doUpdAteContent(newContent: WebviewContent) {
		this._logService.debug(`Webview(${this.id}): will updAte content`);

		this.content = newContent;

		this._send('content', {
			contents: this.content.html,
			options: this.content.options,
			stAte: this.content.stAte,
			...this.extrAContentOptions
		});
	}

	protected style(): void {
		const { styles, ActiveTheme, themeLAbel } = this.webviewThemeDAtAProvider.getWebviewThemeDAtA();
		this._send('styles', { styles, ActiveTheme, themeNAme: themeLAbel });
	}

	protected hAndleFocusChAnge(isFocused: booleAn): void {
		this._focused = isFocused;
		if (isFocused) {
			this._onDidFocus.fire();
		} else {
			this._onDidBlur.fire();
		}
	}

	privAte hAndleKeyDown(event: IKeydownEvent) {
		// CreAte A fAke KeyboArdEvent from the dAtA provided
		const emulAtedKeyboArdEvent = new KeyboArdEvent('keydown', event);
		// Force override the tArget
		Object.defineProperty(emulAtedKeyboArdEvent, 'tArget', {
			get: () => this.element,
		});
		// And re-dispAtch
		window.dispAtchEvent(emulAtedKeyboArdEvent);
	}

	windowDidDrAgStArt(): void {
		// Webview breAk drAg And droping Around the mAin window (no events Are generAted when you Are over them)
		// Work Around this by disAbling pointer events during the drAg.
		// https://github.com/electron/electron/issues/18226
		if (this.element) {
			this.element.style.pointerEvents = 'none';
		}
	}

	windowDidDrAgEnd(): void {
		if (this.element) {
			this.element.style.pointerEvents = '';
		}
	}

	public selectAll() {
		this.execCommAnd('selectAll');
	}

	public copy() {
		this.execCommAnd('copy');
	}

	public pAste() {
		this.execCommAnd('pAste');
	}

	public cut() {
		this.execCommAnd('cut');
	}

	public undo() {
		this.execCommAnd('undo');
	}

	public redo() {
		this.execCommAnd('redo');
	}

	privAte execCommAnd(commAnd: string) {
		if (this.element) {
			this._send('execCommAnd', commAnd);
		}
	}
}
