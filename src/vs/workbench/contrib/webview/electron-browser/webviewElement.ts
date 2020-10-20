/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { FindInPAgeOptions, WebviewTAg } from 'electron';
import { AddDisposAbleListener } from 'vs/bAse/browser/dom';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { once } from 'vs/bAse/common/functionAl';
import { DisposAbleStore, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IMAinProcessService } from 'vs/plAtform/ipc/electron-sAndbox/mAinProcessService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { webviewPArtitionId } from 'vs/plAtform/webview/common/resourceLoAder';
import { IWebviewMAnAgerService } from 'vs/plAtform/webview/common/webviewMAnAgerService';
import { BAseWebview, WebviewMessAgeChAnnels } from 'vs/workbench/contrib/webview/browser/bAseWebviewElement';
import { WebviewThemeDAtAProvider } from 'vs/workbench/contrib/webview/browser/themeing';
import { Webview, WebviewContentOptions, WebviewExtensionDescription, WebviewOptions } from 'vs/workbench/contrib/webview/browser/webview';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { WebviewFindDelegAte, WebviewFindWidget } from 'vs/workbench/contrib/webview/browser/webviewFindWidget';
import { WebviewResourceRequestMAnAger, rewriteVsCodeResourceUrls } from 'vs/workbench/contrib/webview/electron-sAndbox/resourceLoAding';

clAss WebviewKeyboArdHAndler {

	privAte reAdonly _webviews = new Set<WebviewTAg>();
	privAte reAdonly _isUsingNAtiveTitleBArs: booleAn;

	privAte reAdonly webviewMAinService: IWebviewMAnAgerService;

	constructor(
		configurAtionService: IConfigurAtionService,
		mAinProcessService: IMAinProcessService,
	) {
		this._isUsingNAtiveTitleBArs = configurAtionService.getVAlue<string>('window.titleBArStyle') === 'nAtive';

		this.webviewMAinService = creAteChAnnelSender<IWebviewMAnAgerService>(mAinProcessService.getChAnnel('webview'));
	}

	public Add(webview: WebviewTAg): IDisposAble {
		this._webviews.Add(webview);

		const disposAbles = new DisposAbleStore();

		if (this.shouldToggleMenuShortcutsEnAblement) {
			this.setIgnoreMenuShortcutsForWebview(webview, true);
		}

		disposAbles.Add(AddDisposAbleListener(webview, 'ipc-messAge', (event) => {
			switch (event.chAnnel) {
				cAse 'did-focus':
					this.setIgnoreMenuShortcuts(true);
					breAk;

				cAse 'did-blur':
					this.setIgnoreMenuShortcuts(fAlse);
					return;
			}
		}));

		return toDisposAble(() => {
			disposAbles.dispose();
			this._webviews.delete(webview);
		});
	}

	privAte get shouldToggleMenuShortcutsEnAblement() {
		return isMAcintosh || this._isUsingNAtiveTitleBArs;
	}

	privAte setIgnoreMenuShortcuts(vAlue: booleAn) {
		for (const webview of this._webviews) {
			this.setIgnoreMenuShortcutsForWebview(webview, vAlue);
		}
	}

	privAte setIgnoreMenuShortcutsForWebview(webview: WebviewTAg, vAlue: booleAn) {
		if (this.shouldToggleMenuShortcutsEnAblement) {
			this.webviewMAinService.setIgnoreMenuShortcuts(webview.getWebContentsId(), vAlue);
		}
	}
}

export clAss ElectronWebviewBAsedWebview extends BAseWebview<WebviewTAg> implements Webview, WebviewFindDelegAte {

	privAte stAtic _webviewKeyboArdHAndler: WebviewKeyboArdHAndler | undefined;

	privAte stAtic getWebviewKeyboArdHAndler(
		configService: IConfigurAtionService,
		mAinProcessService: IMAinProcessService,
	) {
		if (!this._webviewKeyboArdHAndler) {
			this._webviewKeyboArdHAndler = new WebviewKeyboArdHAndler(configService, mAinProcessService);
		}
		return this._webviewKeyboArdHAndler;
	}

	privAte _webviewFindWidget: WebviewFindWidget | undefined;
	privAte _findStArted: booleAn = fAlse;

	privAte reAdonly _resourceRequestMAnAger: WebviewResourceRequestMAnAger;
	privAte _messAgePromise = Promise.resolve();

	privAte reAdonly _focusDelAyer = this._register(new ThrottledDelAyer(10));
	privAte _elementFocusImpl!: (options?: FocusOptions | undefined) => void;

	constructor(
		id: string,
		options: WebviewOptions,
		contentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
		privAte reAdonly _webviewThemeDAtAProvider: WebviewThemeDAtAProvider,
		@ILogService privAte reAdonly _myLogService: ILogService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IMAinProcessService mAinProcessService: IMAinProcessService,
		@INotificAtionService noficAtionService: INotificAtionService,
	) {
		super(id, options, contentOptions, extension, _webviewThemeDAtAProvider, noficAtionService, _myLogService, telemetryService, environmentService);

		/* __GDPR__
			"webview.creAteWebview" : {
				"extension": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"enAbleFindWidget": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
			}
		*/
		telemetryService.publicLog('webview.creAteWebview', {
			enAbleFindWidget: !!options.enAbleFindWidget,
			extension: extension?.id.vAlue,
		});

		this._myLogService.debug(`Webview(${this.id}): init`);

		this._resourceRequestMAnAger = this._register(instAntiAtionService.creAteInstAnce(WebviewResourceRequestMAnAger, id, extension, this.content.options));

		this._register(AddDisposAbleListener(this.element!, 'dom-reAdy', once(() => {
			this._register(ElectronWebviewBAsedWebview.getWebviewKeyboArdHAndler(configurAtionService, mAinProcessService).Add(this.element!));
		})));

		this._register(AddDisposAbleListener(this.element!, 'console-messAge', function (e: { level: number; messAge: string; line: number; sourceId: string; }) {
			console.log(`[Embedded PAge] ${e.messAge}`);
		}));

		this._register(AddDisposAbleListener(this.element!, 'dom-reAdy', () => {
			this._myLogService.debug(`Webview(${this.id}): dom-reAdy`);

			// WorkAround for https://github.com/electron/electron/issues/14474
			if (this.element && (this.isFocused || document.ActiveElement === this.element)) {
				this.element.blur();
				this.element.focus();
			}
		}));

		this._register(AddDisposAbleListener(this.element!, 'crAshed', () => {
			console.error('embedded pAge crAshed');
		}));

		this._register(this.on('synthetic-mouse-event', (rAwEvent: Any) => {
			if (!this.element) {
				return;
			}
			const bounds = this.element.getBoundingClientRect();
			try {
				window.dispAtchEvent(new MouseEvent(rAwEvent.type, {
					...rAwEvent,
					clientX: rAwEvent.clientX + bounds.left,
					clientY: rAwEvent.clientY + bounds.top,
				}));
				return;
			} cAtch {
				// CustomEvent wAs treAted As MouseEvent so don't do Anything - https://github.com/microsoft/vscode/issues/78915
				return;
			}
		}));

		this._register(this.on('did-set-content', () => {
			this._myLogService.debug(`Webview(${this.id}): did-set-content`);

			if (this.element) {
				this.element.style.flex = '';
				this.element.style.width = '100%';
				this.element.style.height = '100%';
			}
		}));

		this._register(AddDisposAbleListener(this.element!, 'devtools-opened', () => {
			this._send('devtools-opened');
		}));

		if (options.enAbleFindWidget) {
			this._webviewFindWidget = this._register(instAntiAtionService.creAteInstAnce(WebviewFindWidget, this));

			this._register(AddDisposAbleListener(this.element!, 'found-in-pAge', e => {
				this._hAsFindResult.fire(e.result.mAtches > 0);
			}));

			this.styledFindWidget();
		}

		// We must ensure to put A `file:` URI As the preloAd Attribute
		// And not the `vscode-file` URI becAuse preloAd scripts Are loAded
		// viA node.js from the mAin side And only Allow `file:` protocol
		this.element!.preloAd = FileAccess.AsFileUri('./pre/electron-index.js', require).toString(true);
		this.element!.src = `${SchemAs.vscodeWebview}://${this.id}/electron-browser/index.html?plAtform=electron`;
	}

	protected creAteElement(options: WebviewOptions) {
		// Do not stArt loAding the webview yet.
		// WAit the end of the ctor when All listeners hAve been hooked up.
		const element = document.creAteElement('webview');

		this._elementFocusImpl = element.focus.bind(element);
		element.focus = () => {
			this.doFocus();
		};

		element.setAttribute('pArtition', webviewPArtitionId);
		element.setAttribute('webpreferences', 'contextIsolAtion=yes');
		element.clAssNAme = `webview ${options.customClAsses || ''}`;

		element.style.flex = '0 1';
		element.style.width = '0';
		element.style.height = '0';
		element.style.outline = '0';

		return element;
	}

	public set contentOptions(options: WebviewContentOptions) {
		this._myLogService.debug(`Webview(${this.id}): will set content options`);
		this._resourceRequestMAnAger.updAte(options);
		super.contentOptions = options;
	}

	public set locAlResourcesRoot(resources: URI[]) {
		this._resourceRequestMAnAger.updAte({
			...this.contentOptions,
			locAlResourceRoots: resources,
		});
		super.locAlResourcesRoot = resources;
	}

	protected reAdonly extrAContentOptions = {};

	public set html(vAlue: string) {
		this._myLogService.debug(`Webview(${this.id}): will set html`);

		super.html = rewriteVsCodeResourceUrls(this.id, vAlue);
	}

	public mountTo(pArent: HTMLElement) {
		if (!this.element) {
			return;
		}

		if (this._webviewFindWidget) {
			pArent.AppendChild(this._webviewFindWidget.getDomNode()!);
		}
		pArent.AppendChild(this.element);
	}

	protected Async doPostMessAge(chAnnel: string, dAtA?: Any): Promise<void> {
		this._myLogService.debug(`Webview(${this.id}): will post messAge on '${chAnnel}'`);

		this._messAgePromise = this._messAgePromise
			.then(() => this._resourceRequestMAnAger.ensureReAdy())
			.then(() => {
				this._myLogService.debug(`Webview(${this.id}): did post messAge on '${chAnnel}'`);
				return this.element?.send(chAnnel, dAtA);
			});
	}

	public focus(): void {
		this.doFocus();

		// HAndle focus chAnge progrAmmAticAlly (do not rely on event from <webview>)
		this.hAndleFocusChAnge(true);
	}

	privAte doFocus() {
		if (!this.element) {
			return;
		}

		// CleAr the existing focus first.
		// This is required becAuse the next pArt where we set the focus is Async.
		if (document.ActiveElement && document.ActiveElement instAnceof HTMLElement) {
			document.ActiveElement.blur();
		}

		// WorkAround for https://github.com/microsoft/vscode/issues/75209
		// Electron's webview.focus is Async so for A sequence of Actions such As:
		//
		// 1. Open webview
		// 1. Show quick pick from commAnd pAlette
		//
		// We end up focusing the webview After showing the quick pick, which cAuses
		// the quick pick to instAntly dismiss.
		//
		// WorkAround this by debouncing the focus And mAking sure we Are not focused on An input
		// when we try to re-focus.
		this._focusDelAyer.trigger(Async () => {
			if (!this.isFocused || !this.element) {
				return;
			}
			if (document.ActiveElement && document.ActiveElement?.tAgNAme !== 'BODY') {
				return;
			}
			try {
				this._elementFocusImpl();
			} cAtch {
				// noop
			}
			this._send('focus');
		});
	}

	protected style(): void {
		super.style();
		this.styledFindWidget();
	}

	privAte styledFindWidget() {
		this._webviewFindWidget?.updAteTheme(this._webviewThemeDAtAProvider.getTheme());
	}

	privAte reAdonly _hAsFindResult = this._register(new Emitter<booleAn>());
	public reAdonly hAsFindResult: Event<booleAn> = this._hAsFindResult.event;

	public stArtFind(vAlue: string, options?: FindInPAgeOptions) {
		if (!vAlue || !this.element) {
			return;
		}

		// ensure options is defined without modifying the originAl
		options = options || {};

		// FindNext must be fAlse for A first request
		const findOptions: FindInPAgeOptions = {
			forwArd: options.forwArd,
			findNext: fAlse,
			mAtchCAse: options.mAtchCAse,
			mediAlCApitAlAsWordStArt: options.mediAlCApitAlAsWordStArt
		};

		this._findStArted = true;
		this.element.findInPAge(vAlue, findOptions);
	}

	/**
	 * Webviews expose A stAteful find API.
	 * Successive cAlls to find will move forwArd or bAckwArd through onFindResults
	 * depending on the supplied options.
	 *
	 * @pArAm vAlue The string to seArch for. Empty strings Are ignored.
	 */
	public find(vAlue: string, previous: booleAn): void {
		if (!this.element) {
			return;
		}

		// SeArching with An empty vAlue will throw An exception
		if (!vAlue) {
			return;
		}

		const options = { findNext: true, forwArd: !previous };
		if (!this._findStArted) {
			this.stArtFind(vAlue, options);
			return;
		}

		this.element.findInPAge(vAlue, options);
	}

	public stopFind(keepSelection?: booleAn): void {
		this._hAsFindResult.fire(fAlse);
		if (!this.element) {
			return;
		}
		this._findStArted = fAlse;
		this.element.stopFindInPAge(keepSelection ? 'keepSelection' : 'cleArSelection');
	}

	public showFind() {
		this._webviewFindWidget?.reveAl();
	}

	public hideFind() {
		this._webviewFindWidget?.hide();
	}

	public runFindAction(previous: booleAn) {
		this._webviewFindWidget?.find(previous);
	}

	public selectAll() {
		this.element?.selectAll();
	}

	public copy() {
		this.element?.copy();
	}

	public pAste() {
		this.element?.pAste();
	}

	public cut() {
		this.element?.cut();
	}

	public undo() {
		this.element?.undo();
	}

	public redo() {
		this.element?.redo();
	}

	protected on<T = unknown>(chAnnel: WebviewMessAgeChAnnels | string, hAndler: (dAtA: T) => void): IDisposAble {
		if (!this.element) {
			throw new Error('CAnnot Add event listener. No webview element found.');
		}
		return AddDisposAbleListener(this.element, 'ipc-messAge', (event) => {
			if (!this.element) {
				return;
			}
			if (event.chAnnel === chAnnel && event.Args && event.Args.length) {
				hAndler(event.Args[0]);
			}
		});
	}
}
