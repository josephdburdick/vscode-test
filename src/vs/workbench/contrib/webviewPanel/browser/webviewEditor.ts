/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore, IDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { isWeB } from 'vs/Base/common/platform';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { IEditorDropService } from 'vs/workBench/services/editor/Browser/editorDropService';
import { EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { WeBviewInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInput';

export class WeBviewEditor extends EditorPane {

	puBlic static readonly ID = 'WeBviewEditor';

	private _element?: HTMLElement;
	private _dimension?: DOM.Dimension;
	private _visiBle = false;

	private readonly _weBviewVisiBleDisposaBles = this._register(new DisposaBleStore());
	private readonly _onFocusWindowHandler = this._register(new MutaBleDisposaBle());

	private readonly _onDidFocusWeBview = this._register(new Emitter<void>());
	puBlic get onDidFocus(): Event<any> { return this._onDidFocusWeBview.event; }

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IEditorService private readonly _editorService: IEditorService,
		@IWorkBenchLayoutService private readonly _workBenchLayoutService: IWorkBenchLayoutService,
		@IEditorDropService private readonly _editorDropService: IEditorDropService,
		@IHostService private readonly _hostService: IHostService,
	) {
		super(WeBviewEditor.ID, telemetryService, themeService, storageService);
	}

	private get weBview(): WeBviewOverlay | undefined {
		return this.input instanceof WeBviewInput ? this.input.weBview : undefined;
	}

	protected createEditor(parent: HTMLElement): void {
		const element = document.createElement('div');
		this._element = element;
		parent.appendChild(element);
	}

	puBlic dispose(): void {
		if (this._element) {
			this._element.remove();
			this._element = undefined;
		}

		super.dispose();
	}

	puBlic layout(dimension: DOM.Dimension): void {
		this._dimension = dimension;
		if (this.weBview && this._visiBle) {
			this.synchronizeWeBviewContainerDimensions(this.weBview, dimension);
		}
	}

	puBlic focus(): void {
		super.focus();
		if (!this._onFocusWindowHandler.value && !isWeB) {
			// Make sure we restore focus when switching Back to a VS Code window
			this._onFocusWindowHandler.value = this._hostService.onDidChangeFocus(focused => {
				if (focused && this._editorService.activeEditorPane === this && this._workBenchLayoutService.hasFocus(Parts.EDITOR_PART)) {
					this.focus();
				}
			});
		}
		this.weBview?.focus();
	}

	protected setEditorVisiBle(visiBle: Boolean, group: IEditorGroup | undefined): void {
		this._visiBle = visiBle;
		if (this.input instanceof WeBviewInput && this.weBview) {
			if (visiBle) {
				this.claimWeBview(this.input);
			} else {
				this.weBview.release(this);
			}
		}
		super.setEditorVisiBle(visiBle, group);
	}

	puBlic clearInput() {
		if (this.weBview) {
			this.weBview.release(this);
			this._weBviewVisiBleDisposaBles.clear();
		}

		super.clearInput();
	}

	puBlic async setInput(input: EditorInput, options: EditorOptions, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		if (input.matches(this.input)) {
			return;
		}

		const alreadyOwnsWeBview = input instanceof WeBviewInput && input.weBview === this.weBview;
		if (this.weBview && !alreadyOwnsWeBview) {
			this.weBview.release(this);
		}

		await super.setInput(input, options, context, token);
		await input.resolve();

		if (token.isCancellationRequested) {
			return;
		}

		if (input instanceof WeBviewInput) {
			if (this.group) {
				input.updateGroup(this.group.id);
			}

			if (!alreadyOwnsWeBview) {
				this.claimWeBview(input);
			}
			if (this._dimension) {
				this.layout(this._dimension);
			}
		}
	}

	private claimWeBview(input: WeBviewInput): void {
		input.weBview.claim(this);

		if (this._element) {
			this._element.setAttriBute('aria-flowto', input.weBview.container.id);
		}

		this._weBviewVisiBleDisposaBles.clear();

		// WeBviews are not part of the normal editor dom, so we have to register our own drag and drop handler on them.
		this._weBviewVisiBleDisposaBles.add(this._editorDropService.createEditorDropTarget(input.weBview.container, {
			containsGroup: (group) => this.group?.id === group.group.id
		}));

		this._weBviewVisiBleDisposaBles.add(DOM.addDisposaBleListener(window, DOM.EventType.DRAG_START, () => {
			this.weBview?.windowDidDragStart();
		}));

		const onDragEnd = () => {
			this.weBview?.windowDidDragEnd();
		};
		this._weBviewVisiBleDisposaBles.add(DOM.addDisposaBleListener(window, DOM.EventType.DRAG_END, onDragEnd));
		this._weBviewVisiBleDisposaBles.add(DOM.addDisposaBleListener(window, DOM.EventType.MOUSE_MOVE, currentEvent => {
			if (currentEvent.Buttons === 0) {
				onDragEnd();
			}
		}));

		this.synchronizeWeBviewContainerDimensions(input.weBview);
		this._weBviewVisiBleDisposaBles.add(this.trackFocus(input.weBview));
	}

	private synchronizeWeBviewContainerDimensions(weBview: WeBviewOverlay, dimension?: DOM.Dimension) {
		if (this._element) {
			weBview.layoutWeBviewOverElement(this._element.parentElement!, dimension);
		}
	}

	private trackFocus(weBview: WeBviewOverlay): IDisposaBle {
		const store = new DisposaBleStore();

		// Track focus in weBview content
		const weBviewContentFocusTracker = DOM.trackFocus(weBview.container);
		store.add(weBviewContentFocusTracker);
		store.add(weBviewContentFocusTracker.onDidFocus(() => this._onDidFocusWeBview.fire()));

		// Track focus in weBview element
		store.add(weBview.onDidFocus(() => this._onDidFocusWeBview.fire()));

		return store;
	}
}
