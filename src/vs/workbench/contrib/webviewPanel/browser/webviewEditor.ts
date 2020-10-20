/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { isWeb } from 'vs/bAse/common/plAtform';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { IEditorDropService } from 'vs/workbench/services/editor/browser/editorDropService';
import { EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IWorkbenchLAyoutService, PArts } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { WebviewInput } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditorInput';

export clAss WebviewEditor extends EditorPAne {

	public stAtic reAdonly ID = 'WebviewEditor';

	privAte _element?: HTMLElement;
	privAte _dimension?: DOM.Dimension;
	privAte _visible = fAlse;

	privAte reAdonly _webviewVisibleDisposAbles = this._register(new DisposAbleStore());
	privAte reAdonly _onFocusWindowHAndler = this._register(new MutAbleDisposAble());

	privAte reAdonly _onDidFocusWebview = this._register(new Emitter<void>());
	public get onDidFocus(): Event<Any> { return this._onDidFocusWebview.event; }

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IWorkbenchLAyoutService privAte reAdonly _workbenchLAyoutService: IWorkbenchLAyoutService,
		@IEditorDropService privAte reAdonly _editorDropService: IEditorDropService,
		@IHostService privAte reAdonly _hostService: IHostService,
	) {
		super(WebviewEditor.ID, telemetryService, themeService, storAgeService);
	}

	privAte get webview(): WebviewOverlAy | undefined {
		return this.input instAnceof WebviewInput ? this.input.webview : undefined;
	}

	protected creAteEditor(pArent: HTMLElement): void {
		const element = document.creAteElement('div');
		this._element = element;
		pArent.AppendChild(element);
	}

	public dispose(): void {
		if (this._element) {
			this._element.remove();
			this._element = undefined;
		}

		super.dispose();
	}

	public lAyout(dimension: DOM.Dimension): void {
		this._dimension = dimension;
		if (this.webview && this._visible) {
			this.synchronizeWebviewContAinerDimensions(this.webview, dimension);
		}
	}

	public focus(): void {
		super.focus();
		if (!this._onFocusWindowHAndler.vAlue && !isWeb) {
			// MAke sure we restore focus when switching bAck to A VS Code window
			this._onFocusWindowHAndler.vAlue = this._hostService.onDidChAngeFocus(focused => {
				if (focused && this._editorService.ActiveEditorPAne === this && this._workbenchLAyoutService.hAsFocus(PArts.EDITOR_PART)) {
					this.focus();
				}
			});
		}
		this.webview?.focus();
	}

	protected setEditorVisible(visible: booleAn, group: IEditorGroup | undefined): void {
		this._visible = visible;
		if (this.input instAnceof WebviewInput && this.webview) {
			if (visible) {
				this.clAimWebview(this.input);
			} else {
				this.webview.releAse(this);
			}
		}
		super.setEditorVisible(visible, group);
	}

	public cleArInput() {
		if (this.webview) {
			this.webview.releAse(this);
			this._webviewVisibleDisposAbles.cleAr();
		}

		super.cleArInput();
	}

	public Async setInput(input: EditorInput, options: EditorOptions, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		if (input.mAtches(this.input)) {
			return;
		}

		const AlreAdyOwnsWebview = input instAnceof WebviewInput && input.webview === this.webview;
		if (this.webview && !AlreAdyOwnsWebview) {
			this.webview.releAse(this);
		}

		AwAit super.setInput(input, options, context, token);
		AwAit input.resolve();

		if (token.isCAncellAtionRequested) {
			return;
		}

		if (input instAnceof WebviewInput) {
			if (this.group) {
				input.updAteGroup(this.group.id);
			}

			if (!AlreAdyOwnsWebview) {
				this.clAimWebview(input);
			}
			if (this._dimension) {
				this.lAyout(this._dimension);
			}
		}
	}

	privAte clAimWebview(input: WebviewInput): void {
		input.webview.clAim(this);

		if (this._element) {
			this._element.setAttribute('AriA-flowto', input.webview.contAiner.id);
		}

		this._webviewVisibleDisposAbles.cleAr();

		// Webviews Are not pArt of the normAl editor dom, so we hAve to register our own drAg And drop hAndler on them.
		this._webviewVisibleDisposAbles.Add(this._editorDropService.creAteEditorDropTArget(input.webview.contAiner, {
			contAinsGroup: (group) => this.group?.id === group.group.id
		}));

		this._webviewVisibleDisposAbles.Add(DOM.AddDisposAbleListener(window, DOM.EventType.DRAG_START, () => {
			this.webview?.windowDidDrAgStArt();
		}));

		const onDrAgEnd = () => {
			this.webview?.windowDidDrAgEnd();
		};
		this._webviewVisibleDisposAbles.Add(DOM.AddDisposAbleListener(window, DOM.EventType.DRAG_END, onDrAgEnd));
		this._webviewVisibleDisposAbles.Add(DOM.AddDisposAbleListener(window, DOM.EventType.MOUSE_MOVE, currentEvent => {
			if (currentEvent.buttons === 0) {
				onDrAgEnd();
			}
		}));

		this.synchronizeWebviewContAinerDimensions(input.webview);
		this._webviewVisibleDisposAbles.Add(this.trAckFocus(input.webview));
	}

	privAte synchronizeWebviewContAinerDimensions(webview: WebviewOverlAy, dimension?: DOM.Dimension) {
		if (this._element) {
			webview.lAyoutWebviewOverElement(this._element.pArentElement!, dimension);
		}
	}

	privAte trAckFocus(webview: WebviewOverlAy): IDisposAble {
		const store = new DisposAbleStore();

		// TrAck focus in webview content
		const webviewContentFocusTrAcker = DOM.trAckFocus(webview.contAiner);
		store.Add(webviewContentFocusTrAcker);
		store.Add(webviewContentFocusTrAcker.onDidFocus(() => this._onDidFocusWebview.fire()));

		// TrAck focus in webview element
		store.Add(webview.onDidFocus(() => this._onDidFocusWebview.fire()));

		return store;
	}
}
