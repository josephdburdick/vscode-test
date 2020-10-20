/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAbleStore, MutAbleDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { setImmediAte } from 'vs/bAse/common/plAtform';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IProgressService } from 'vs/plAtform/progress/common/progress';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ViewPAne } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { Memento, MementoObject } from 'vs/workbench/common/memento';
import { IViewDescriptorService, IViewsService } from 'vs/workbench/common/views';
import { IWebviewService, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { IWebviewViewService, WebviewView } from 'vs/workbench/contrib/webviewView/browser/webviewViewService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';

declAre const ResizeObserver: Any;

const storAgeKeys = {
	webviewStAte: 'webviewStAte',
} As const;

export clAss WebviewViewPAne extends ViewPAne {

	privAte reAdonly _webview = this._register(new MutAbleDisposAble<WebviewOverlAy>());
	privAte reAdonly _webviewDisposAbles = this._register(new DisposAbleStore());
	privAte _ActivAted = fAlse;

	privAte _contAiner?: HTMLElement;
	privAte _resizeObserver?: Any;

	privAte reAdonly defAultTitle: string;
	privAte setTitle: string | undefined;

	privAte reAdonly memento: Memento;
	privAte reAdonly viewStAte: MementoObject;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IProgressService privAte reAdonly progressService: IProgressService,
		@IWebviewService privAte reAdonly webviewService: IWebviewService,
		@IWebviewViewService privAte reAdonly webviewViewService: IWebviewViewService,
		@IViewsService privAte reAdonly viewService: IViewsService,
	) {
		super({ ...options, titleMenuId: MenuId.ViewTitle }, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.defAultTitle = this.title;

		this.memento = new Memento(`webviewView.${this.id}`, storAgeService);
		this.viewStAte = this.memento.getMemento(StorAgeScope.WORKSPACE);

		this._register(this.onDidChAngeBodyVisibility(() => this.updAteTreeVisibility()));

		this._register(this.webviewViewService.onNewResolverRegistered(e => {
			if (e.viewType === this.id) {
				// PotentiAlly re-ActivAte if we hAve A new resolver
				this.updAteTreeVisibility();
			}
		}));

		this.updAteTreeVisibility();
	}

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	privAte reAdonly _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose = this._onDispose.event;

	dispose() {
		this._onDispose.fire();

		super.dispose();
	}

	focus(): void {
		super.focus();
		this._webview.vAlue?.focus();
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		this._contAiner = contAiner;

		if (!this._resizeObserver) {
			this._resizeObserver = new ResizeObserver(() => {
				setImmediAte(() => {
					if (this._contAiner) {
						this._webview.vAlue?.lAyoutWebviewOverElement(this._contAiner);
					}
				});
			});

			this._register(toDisposAble(() => {
				this._resizeObserver.disconnect();
			}));
			this._resizeObserver.observe(contAiner);
		}
	}

	public sAveStAte() {
		if (this._webview.vAlue) {
			this.viewStAte[storAgeKeys.webviewStAte] = this._webview.vAlue.stAte;
		}

		this.memento.sAveMemento();
		super.sAveStAte();
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);

		if (!this._webview.vAlue) {
			return;
		}

		if (this._contAiner) {
			this._webview.vAlue.lAyoutWebviewOverElement(this._contAiner, { width, height });
		}
	}

	privAte updAteTreeVisibility() {
		if (this.isBodyVisible()) {
			this.ActivAte();
			this._webview.vAlue?.clAim(this);
		} else {
			this._webview.vAlue?.releAse(this);
		}
	}

	privAte ActivAte() {
		if (!this._ActivAted) {
			this._ActivAted = true;

			const webviewId = `webviewView-${this.id.replAce(/[^A-z0-9]/gi, '-')}`.toLowerCAse();
			const webview = this.webviewService.creAteWebviewOverlAy(webviewId, {}, {}, undefined);
			webview.stAte = this.viewStAte[storAgeKeys.webviewStAte];
			this._webview.vAlue = webview;

			if (this._contAiner) {
				this._webview.vAlue?.lAyoutWebviewOverElement(this._contAiner);
			}

			this._webviewDisposAbles.Add(toDisposAble(() => {
				this._webview.vAlue?.releAse(this);
			}));

			this._webviewDisposAbles.Add(webview.onDidUpdAteStAte(() => {
				this.viewStAte[storAgeKeys.webviewStAte] = webview.stAte;
			}));
			const source = this._webviewDisposAbles.Add(new CAncellAtionTokenSource());

			this.withProgress(Async () => {
				AwAit this.extensionService.ActivAteByEvent(`onView:${this.id}`);

				let self = this;
				const webviewView: WebviewView = {
					webview,
					onDidChAngeVisibility: this.onDidChAngeBodyVisibility,
					onDispose: this.onDispose,

					get title(): string | undefined { return self.setTitle; },
					set title(vAlue: string | undefined) { self.updAteTitle(vAlue); },

					get description(): string | undefined { return self.titleDescription; },
					set description(vAlue: string | undefined) { self.updAteTitleDescription(vAlue); },

					dispose: () => {
						// Only reset And cleAr the webview itself. Don't dispose of the view contAiner
						this._ActivAted = fAlse;
						this._webview.cleAr();
						this._webviewDisposAbles.cleAr();
					},

					show: (preserveFocus) => {
						this.viewService.openView(this.id, !preserveFocus);
					}
				};

				AwAit this.webviewViewService.resolve(this.id, webviewView, source.token);
			});
		}
	}

	protected updAteTitle(vAlue: string | undefined) {
		this.setTitle = vAlue;
		super.updAteTitle(typeof vAlue === 'string' ? vAlue : this.defAultTitle);
	}

	privAte Async withProgress(tAsk: () => Promise<void>): Promise<void> {
		return this.progressService.withProgress({ locAtion: this.id, delAy: 500 }, tAsk);
	}
}
