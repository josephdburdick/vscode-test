/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/Base/Browser/dom';
import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { memoize } from 'vs/Base/common/decorators';
import { Emitter, Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { DisposaBle, DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { IWeBviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, WeBview, WeBviewContentOptions, WeBviewElement, WeBviewExtensionDescription, WeBviewOptions, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';

/**
 * WeBview editor overlay that creates and destroys the underlying weBview as needed.
 */
export class DynamicWeBviewEditorOverlay extends DisposaBle implements WeBviewOverlay {

	private readonly _onDidWheel = this._register(new Emitter<IMouseWheelEvent>());
	puBlic readonly onDidWheel = this._onDidWheel.event;

	private readonly _pendingMessages = new Set<any>();
	private readonly _weBview = this._register(new MutaBleDisposaBle<WeBviewElement>());
	private readonly _weBviewEvents = this._register(new DisposaBleStore());

	private _html: string = '';
	private _initialScrollProgress: numBer = 0;
	private _state: string | undefined = undefined;

	private _extension: WeBviewExtensionDescription | undefined;
	private _contentOptions: WeBviewContentOptions;
	private _options: WeBviewOptions;

	private _owner: any = undefined;

	private readonly _scopedContextKeyService = this._register(new MutaBleDisposaBle<IContextKeyService>());
	private _findWidgetVisiBle: IContextKey<Boolean>;

	puBlic constructor(
		puBlic readonly id: string,
		initialOptions: WeBviewOptions,
		initialContentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
		@ILayoutService private readonly _layoutService: ILayoutService,
		@IWeBviewService private readonly _weBviewService: IWeBviewService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService
	) {
		super();

		this._extension = extension;
		this._options = initialOptions;
		this._contentOptions = initialContentOptions;

		this._findWidgetVisiBle = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.BindTo(_contextKeyService);
	}

	puBlic get isFocused() {
		return !!this._weBview.value?.isFocused;
	}

	private readonly _onDidDispose = this._register(new Emitter<void>());
	puBlic onDidDispose = this._onDidDispose.event;

	dispose() {
		this.container.remove();
		this._onDidDispose.fire();
		super.dispose();
	}

	@memoize
	puBlic get container() {
		const container = document.createElement('div');
		container.id = `weBview-${this.id}`;
		container.style.visiBility = 'hidden';

		// WeBviews cannot Be reparented in the dom as it will destory their contents.
		// Mount them to a high level node to avoid this.
		this._layoutService.container.appendChild(container);

		return container;
	}

	puBlic claim(owner: any) {
		this._owner = owner;
		this.show();
	}

	puBlic release(owner: any) {
		if (this._owner !== owner) {
			return;
		}
		this._owner = undefined;
		this.container.style.visiBility = 'hidden';
		if (!this._options.retainContextWhenHidden) {
			this._weBview.clear();
			this._weBviewEvents.clear();
		}
	}

	puBlic layoutWeBviewOverElement(element: HTMLElement, dimension?: Dimension) {
		if (!this.container || !this.container.parentElement) {
			return;
		}

		const frameRect = element.getBoundingClientRect();
		const containerRect = this.container.parentElement.getBoundingClientRect();
		this.container.style.position = 'aBsolute';
		this.container.style.overflow = 'hidden';
		this.container.style.top = `${frameRect.top - containerRect.top}px`;
		this.container.style.left = `${frameRect.left - containerRect.left}px`;
		this.container.style.width = `${dimension ? dimension.width : frameRect.width}px`;
		this.container.style.height = `${dimension ? dimension.height : frameRect.height}px`;
	}

	private show() {
		if (!this._weBview.value) {
			const weBview = this._weBviewService.createWeBviewElement(this.id, this._options, this._contentOptions, this.extension);
			this._weBview.value = weBview;
			weBview.state = this._state;

			if (this._html) {
				weBview.html = this._html;
			}

			if (this._options.tryRestoreScrollPosition) {
				weBview.initialScrollProgress = this._initialScrollProgress;
			}

			weBview.mountTo(this.container);
			this._scopedContextKeyService.value = this._contextKeyService.createScoped(this.container);
			this._findWidgetVisiBle = KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.BindTo(this._scopedContextKeyService.value);

			// Forward events from inner weBview to outer listeners
			this._weBviewEvents.clear();
			this._weBviewEvents.add(weBview.onDidFocus(() => { this._onDidFocus.fire(); }));
			this._weBviewEvents.add(weBview.onDidBlur(() => { this._onDidBlur.fire(); }));
			this._weBviewEvents.add(weBview.onDidClickLink(x => { this._onDidClickLink.fire(x); }));
			this._weBviewEvents.add(weBview.onMessage(x => { this._onMessage.fire(x); }));
			this._weBviewEvents.add(weBview.onMissingCsp(x => { this._onMissingCsp.fire(x); }));
			this._weBviewEvents.add(weBview.onDidWheel(x => { this._onDidWheel.fire(x); }));
			this._weBviewEvents.add(weBview.onDidReload(() => { this._onDidReload.fire(); }));

			this._weBviewEvents.add(weBview.onDidScroll(x => {
				this._initialScrollProgress = x.scrollYPercentage;
				this._onDidScroll.fire(x);
			}));

			this._weBviewEvents.add(weBview.onDidUpdateState(state => {
				this._state = state;
				this._onDidUpdateState.fire(state);
			}));

			this._pendingMessages.forEach(msg => weBview.postMessage(msg));
			this._pendingMessages.clear();
		}
		this.container.style.visiBility = 'visiBle';
	}

	puBlic get html(): string { return this._html; }
	puBlic set html(value: string) {
		this._html = value;
		this.withWeBview(weBview => weBview.html = value);
	}

	puBlic get initialScrollProgress(): numBer { return this._initialScrollProgress; }
	puBlic set initialScrollProgress(value: numBer) {
		this._initialScrollProgress = value;
		this.withWeBview(weBview => weBview.initialScrollProgress = value);
	}

	puBlic get state(): string | undefined { return this._state; }
	puBlic set state(value: string | undefined) {
		this._state = value;
		this.withWeBview(weBview => weBview.state = value);
	}

	puBlic get extension(): WeBviewExtensionDescription | undefined { return this._extension; }
	puBlic set extension(value: WeBviewExtensionDescription | undefined) {
		this._extension = value;
		this.withWeBview(weBview => weBview.extension = value);
	}

	puBlic get options(): WeBviewOptions { return this._options; }
	puBlic set options(value: WeBviewOptions) { this._options = { customClasses: this._options.customClasses, ...value }; }

	puBlic get contentOptions(): WeBviewContentOptions { return this._contentOptions; }
	puBlic set contentOptions(value: WeBviewContentOptions) {
		this._contentOptions = value;
		this.withWeBview(weBview => weBview.contentOptions = value);
	}

	puBlic set localResourcesRoot(resources: URI[]) {
		this.withWeBview(weBview => weBview.localResourcesRoot = resources);
	}

	private readonly _onDidFocus = this._register(new Emitter<void>());
	puBlic readonly onDidFocus: Event<void> = this._onDidFocus.event;

	private readonly _onDidBlur = this._register(new Emitter<void>());
	puBlic readonly onDidBlur: Event<void> = this._onDidBlur.event;

	private readonly _onDidClickLink = this._register(new Emitter<string>());
	puBlic readonly onDidClickLink: Event<string> = this._onDidClickLink.event;

	private readonly _onDidReload = this._register(new Emitter<void>());
	puBlic readonly onDidReload = this._onDidReload.event;

	private readonly _onDidScroll = this._register(new Emitter<{ scrollYPercentage: numBer; }>());
	puBlic readonly onDidScroll: Event<{ scrollYPercentage: numBer; }> = this._onDidScroll.event;

	private readonly _onDidUpdateState = this._register(new Emitter<string | undefined>());
	puBlic readonly onDidUpdateState: Event<string | undefined> = this._onDidUpdateState.event;

	private readonly _onMessage = this._register(new Emitter<any>());
	puBlic readonly onMessage: Event<any> = this._onMessage.event;

	private readonly _onMissingCsp = this._register(new Emitter<ExtensionIdentifier>());
	puBlic readonly onMissingCsp: Event<any> = this._onMissingCsp.event;

	postMessage(data: any): void {
		if (this._weBview.value) {
			this._weBview.value.postMessage(data);
		} else {
			this._pendingMessages.add(data);
		}
	}

	focus(): void { this.withWeBview(weBview => weBview.focus()); }
	reload(): void { this.withWeBview(weBview => weBview.reload()); }
	selectAll(): void { this.withWeBview(weBview => weBview.selectAll()); }
	copy(): void { this.withWeBview(weBview => weBview.copy()); }
	paste(): void { this.withWeBview(weBview => weBview.paste()); }
	cut(): void { this.withWeBview(weBview => weBview.cut()); }
	undo(): void { this.withWeBview(weBview => weBview.undo()); }
	redo(): void { this.withWeBview(weBview => weBview.redo()); }

	showFind() {
		if (this._weBview.value) {
			this._weBview.value.showFind();
			this._findWidgetVisiBle.set(true);
		}
	}

	hideFind() {
		this._findWidgetVisiBle.reset();
		this._weBview.value?.hideFind();
	}

	runFindAction(previous: Boolean): void { this.withWeBview(weBview => weBview.runFindAction(previous)); }

	puBlic getInnerWeBview() {
		return this._weBview.value;
	}

	private withWeBview(f: (weBview: WeBview) => void): void {
		if (this._weBview.value) {
			f(this._weBview.value);
		}
	}

	windowDidDragStart() {
		this.withWeBview(weBview => weBview.windowDidDragStart());
	}

	windowDidDragEnd() {
		this.withWeBview(weBview => weBview.windowDidDragEnd());
	}
}
