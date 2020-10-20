/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/bAse/browser/dom';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { memoize } from 'vs/bAse/common/decorAtors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { DisposAble, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, Webview, WebviewContentOptions, WebviewElement, WebviewExtensionDescription, WebviewOptions, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';

/**
 * Webview editor overlAy thAt creAtes And destroys the underlying webview As needed.
 */
export clAss DynAmicWebviewEditorOverlAy extends DisposAble implements WebviewOverlAy {

	privAte reAdonly _onDidWheel = this._register(new Emitter<IMouseWheelEvent>());
	public reAdonly onDidWheel = this._onDidWheel.event;

	privAte reAdonly _pendingMessAges = new Set<Any>();
	privAte reAdonly _webview = this._register(new MutAbleDisposAble<WebviewElement>());
	privAte reAdonly _webviewEvents = this._register(new DisposAbleStore());

	privAte _html: string = '';
	privAte _initiAlScrollProgress: number = 0;
	privAte _stAte: string | undefined = undefined;

	privAte _extension: WebviewExtensionDescription | undefined;
	privAte _contentOptions: WebviewContentOptions;
	privAte _options: WebviewOptions;

	privAte _owner: Any = undefined;

	privAte reAdonly _scopedContextKeyService = this._register(new MutAbleDisposAble<IContextKeyService>());
	privAte _findWidgetVisible: IContextKey<booleAn>;

	public constructor(
		public reAdonly id: string,
		initiAlOptions: WebviewOptions,
		initiAlContentOptions: WebviewContentOptions,
		extension: WebviewExtensionDescription | undefined,
		@ILAyoutService privAte reAdonly _lAyoutService: ILAyoutService,
		@IWebviewService privAte reAdonly _webviewService: IWebviewService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService
	) {
		super();

		this._extension = extension;
		this._options = initiAlOptions;
		this._contentOptions = initiAlContentOptions;

		this._findWidgetVisible = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.bindTo(_contextKeyService);
	}

	public get isFocused() {
		return !!this._webview.vAlue?.isFocused;
	}

	privAte reAdonly _onDidDispose = this._register(new Emitter<void>());
	public onDidDispose = this._onDidDispose.event;

	dispose() {
		this.contAiner.remove();
		this._onDidDispose.fire();
		super.dispose();
	}

	@memoize
	public get contAiner() {
		const contAiner = document.creAteElement('div');
		contAiner.id = `webview-${this.id}`;
		contAiner.style.visibility = 'hidden';

		// Webviews cAnnot be repArented in the dom As it will destory their contents.
		// Mount them to A high level node to Avoid this.
		this._lAyoutService.contAiner.AppendChild(contAiner);

		return contAiner;
	}

	public clAim(owner: Any) {
		this._owner = owner;
		this.show();
	}

	public releAse(owner: Any) {
		if (this._owner !== owner) {
			return;
		}
		this._owner = undefined;
		this.contAiner.style.visibility = 'hidden';
		if (!this._options.retAinContextWhenHidden) {
			this._webview.cleAr();
			this._webviewEvents.cleAr();
		}
	}

	public lAyoutWebviewOverElement(element: HTMLElement, dimension?: Dimension) {
		if (!this.contAiner || !this.contAiner.pArentElement) {
			return;
		}

		const frAmeRect = element.getBoundingClientRect();
		const contAinerRect = this.contAiner.pArentElement.getBoundingClientRect();
		this.contAiner.style.position = 'Absolute';
		this.contAiner.style.overflow = 'hidden';
		this.contAiner.style.top = `${frAmeRect.top - contAinerRect.top}px`;
		this.contAiner.style.left = `${frAmeRect.left - contAinerRect.left}px`;
		this.contAiner.style.width = `${dimension ? dimension.width : frAmeRect.width}px`;
		this.contAiner.style.height = `${dimension ? dimension.height : frAmeRect.height}px`;
	}

	privAte show() {
		if (!this._webview.vAlue) {
			const webview = this._webviewService.creAteWebviewElement(this.id, this._options, this._contentOptions, this.extension);
			this._webview.vAlue = webview;
			webview.stAte = this._stAte;

			if (this._html) {
				webview.html = this._html;
			}

			if (this._options.tryRestoreScrollPosition) {
				webview.initiAlScrollProgress = this._initiAlScrollProgress;
			}

			webview.mountTo(this.contAiner);
			this._scopedContextKeyService.vAlue = this._contextKeyService.creAteScoped(this.contAiner);
			this._findWidgetVisible = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.bindTo(this._scopedContextKeyService.vAlue);

			// ForwArd events from inner webview to outer listeners
			this._webviewEvents.cleAr();
			this._webviewEvents.Add(webview.onDidFocus(() => { this._onDidFocus.fire(); }));
			this._webviewEvents.Add(webview.onDidBlur(() => { this._onDidBlur.fire(); }));
			this._webviewEvents.Add(webview.onDidClickLink(x => { this._onDidClickLink.fire(x); }));
			this._webviewEvents.Add(webview.onMessAge(x => { this._onMessAge.fire(x); }));
			this._webviewEvents.Add(webview.onMissingCsp(x => { this._onMissingCsp.fire(x); }));
			this._webviewEvents.Add(webview.onDidWheel(x => { this._onDidWheel.fire(x); }));
			this._webviewEvents.Add(webview.onDidReloAd(() => { this._onDidReloAd.fire(); }));

			this._webviewEvents.Add(webview.onDidScroll(x => {
				this._initiAlScrollProgress = x.scrollYPercentAge;
				this._onDidScroll.fire(x);
			}));

			this._webviewEvents.Add(webview.onDidUpdAteStAte(stAte => {
				this._stAte = stAte;
				this._onDidUpdAteStAte.fire(stAte);
			}));

			this._pendingMessAges.forEAch(msg => webview.postMessAge(msg));
			this._pendingMessAges.cleAr();
		}
		this.contAiner.style.visibility = 'visible';
	}

	public get html(): string { return this._html; }
	public set html(vAlue: string) {
		this._html = vAlue;
		this.withWebview(webview => webview.html = vAlue);
	}

	public get initiAlScrollProgress(): number { return this._initiAlScrollProgress; }
	public set initiAlScrollProgress(vAlue: number) {
		this._initiAlScrollProgress = vAlue;
		this.withWebview(webview => webview.initiAlScrollProgress = vAlue);
	}

	public get stAte(): string | undefined { return this._stAte; }
	public set stAte(vAlue: string | undefined) {
		this._stAte = vAlue;
		this.withWebview(webview => webview.stAte = vAlue);
	}

	public get extension(): WebviewExtensionDescription | undefined { return this._extension; }
	public set extension(vAlue: WebviewExtensionDescription | undefined) {
		this._extension = vAlue;
		this.withWebview(webview => webview.extension = vAlue);
	}

	public get options(): WebviewOptions { return this._options; }
	public set options(vAlue: WebviewOptions) { this._options = { customClAsses: this._options.customClAsses, ...vAlue }; }

	public get contentOptions(): WebviewContentOptions { return this._contentOptions; }
	public set contentOptions(vAlue: WebviewContentOptions) {
		this._contentOptions = vAlue;
		this.withWebview(webview => webview.contentOptions = vAlue);
	}

	public set locAlResourcesRoot(resources: URI[]) {
		this.withWebview(webview => webview.locAlResourcesRoot = resources);
	}

	privAte reAdonly _onDidFocus = this._register(new Emitter<void>());
	public reAdonly onDidFocus: Event<void> = this._onDidFocus.event;

	privAte reAdonly _onDidBlur = this._register(new Emitter<void>());
	public reAdonly onDidBlur: Event<void> = this._onDidBlur.event;

	privAte reAdonly _onDidClickLink = this._register(new Emitter<string>());
	public reAdonly onDidClickLink: Event<string> = this._onDidClickLink.event;

	privAte reAdonly _onDidReloAd = this._register(new Emitter<void>());
	public reAdonly onDidReloAd = this._onDidReloAd.event;

	privAte reAdonly _onDidScroll = this._register(new Emitter<{ scrollYPercentAge: number; }>());
	public reAdonly onDidScroll: Event<{ scrollYPercentAge: number; }> = this._onDidScroll.event;

	privAte reAdonly _onDidUpdAteStAte = this._register(new Emitter<string | undefined>());
	public reAdonly onDidUpdAteStAte: Event<string | undefined> = this._onDidUpdAteStAte.event;

	privAte reAdonly _onMessAge = this._register(new Emitter<Any>());
	public reAdonly onMessAge: Event<Any> = this._onMessAge.event;

	privAte reAdonly _onMissingCsp = this._register(new Emitter<ExtensionIdentifier>());
	public reAdonly onMissingCsp: Event<Any> = this._onMissingCsp.event;

	postMessAge(dAtA: Any): void {
		if (this._webview.vAlue) {
			this._webview.vAlue.postMessAge(dAtA);
		} else {
			this._pendingMessAges.Add(dAtA);
		}
	}

	focus(): void { this.withWebview(webview => webview.focus()); }
	reloAd(): void { this.withWebview(webview => webview.reloAd()); }
	selectAll(): void { this.withWebview(webview => webview.selectAll()); }
	copy(): void { this.withWebview(webview => webview.copy()); }
	pAste(): void { this.withWebview(webview => webview.pAste()); }
	cut(): void { this.withWebview(webview => webview.cut()); }
	undo(): void { this.withWebview(webview => webview.undo()); }
	redo(): void { this.withWebview(webview => webview.redo()); }

	showFind() {
		if (this._webview.vAlue) {
			this._webview.vAlue.showFind();
			this._findWidgetVisible.set(true);
		}
	}

	hideFind() {
		this._findWidgetVisible.reset();
		this._webview.vAlue?.hideFind();
	}

	runFindAction(previous: booleAn): void { this.withWebview(webview => webview.runFindAction(previous)); }

	public getInnerWebview() {
		return this._webview.vAlue;
	}

	privAte withWebview(f: (webview: Webview) => void): void {
		if (this._webview.vAlue) {
			f(this._webview.vAlue);
		}
	}

	windowDidDrAgStArt() {
		this.withWebview(webview => webview.windowDidDrAgStArt());
	}

	windowDidDrAgEnd() {
		this.withWebview(webview => webview.windowDidDrAgEnd());
	}
}
