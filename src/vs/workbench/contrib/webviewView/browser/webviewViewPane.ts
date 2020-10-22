/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBleStore, MutaBleDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { setImmediate } from 'vs/Base/common/platform';
import { MenuId } from 'vs/platform/actions/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { Memento, MementoOBject } from 'vs/workBench/common/memento';
import { IViewDescriptorService, IViewsService } from 'vs/workBench/common/views';
import { IWeBviewService, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IWeBviewViewService, WeBviewView } from 'vs/workBench/contriB/weBviewView/Browser/weBviewViewService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';

declare const ResizeOBserver: any;

const storageKeys = {
	weBviewState: 'weBviewState',
} as const;

export class WeBviewViewPane extends ViewPane {

	private readonly _weBview = this._register(new MutaBleDisposaBle<WeBviewOverlay>());
	private readonly _weBviewDisposaBles = this._register(new DisposaBleStore());
	private _activated = false;

	private _container?: HTMLElement;
	private _resizeOBserver?: any;

	private readonly defaultTitle: string;
	private setTitle: string | undefined;

	private readonly memento: Memento;
	private readonly viewState: MementoOBject;

	constructor(
		options: IViewletViewOptions,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorageService storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IProgressService private readonly progressService: IProgressService,
		@IWeBviewService private readonly weBviewService: IWeBviewService,
		@IWeBviewViewService private readonly weBviewViewService: IWeBviewViewService,
		@IViewsService private readonly viewService: IViewsService,
	) {
		super({ ...options, titleMenuId: MenuId.ViewTitle }, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.defaultTitle = this.title;

		this.memento = new Memento(`weBviewView.${this.id}`, storageService);
		this.viewState = this.memento.getMemento(StorageScope.WORKSPACE);

		this._register(this.onDidChangeBodyVisiBility(() => this.updateTreeVisiBility()));

		this._register(this.weBviewViewService.onNewResolverRegistered(e => {
			if (e.viewType === this.id) {
				// Potentially re-activate if we have a new resolver
				this.updateTreeVisiBility();
			}
		}));

		this.updateTreeVisiBility();
	}

	private readonly _onDidChangeVisiBility = this._register(new Emitter<Boolean>());
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	private readonly _onDispose = this._register(new Emitter<void>());
	readonly onDispose = this._onDispose.event;

	dispose() {
		this._onDispose.fire();

		super.dispose();
	}

	focus(): void {
		super.focus();
		this._weBview.value?.focus();
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this._container = container;

		if (!this._resizeOBserver) {
			this._resizeOBserver = new ResizeOBserver(() => {
				setImmediate(() => {
					if (this._container) {
						this._weBview.value?.layoutWeBviewOverElement(this._container);
					}
				});
			});

			this._register(toDisposaBle(() => {
				this._resizeOBserver.disconnect();
			}));
			this._resizeOBserver.oBserve(container);
		}
	}

	puBlic saveState() {
		if (this._weBview.value) {
			this.viewState[storageKeys.weBviewState] = this._weBview.value.state;
		}

		this.memento.saveMemento();
		super.saveState();
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);

		if (!this._weBview.value) {
			return;
		}

		if (this._container) {
			this._weBview.value.layoutWeBviewOverElement(this._container, { width, height });
		}
	}

	private updateTreeVisiBility() {
		if (this.isBodyVisiBle()) {
			this.activate();
			this._weBview.value?.claim(this);
		} else {
			this._weBview.value?.release(this);
		}
	}

	private activate() {
		if (!this._activated) {
			this._activated = true;

			const weBviewId = `weBviewView-${this.id.replace(/[^a-z0-9]/gi, '-')}`.toLowerCase();
			const weBview = this.weBviewService.createWeBviewOverlay(weBviewId, {}, {}, undefined);
			weBview.state = this.viewState[storageKeys.weBviewState];
			this._weBview.value = weBview;

			if (this._container) {
				this._weBview.value?.layoutWeBviewOverElement(this._container);
			}

			this._weBviewDisposaBles.add(toDisposaBle(() => {
				this._weBview.value?.release(this);
			}));

			this._weBviewDisposaBles.add(weBview.onDidUpdateState(() => {
				this.viewState[storageKeys.weBviewState] = weBview.state;
			}));
			const source = this._weBviewDisposaBles.add(new CancellationTokenSource());

			this.withProgress(async () => {
				await this.extensionService.activateByEvent(`onView:${this.id}`);

				let self = this;
				const weBviewView: WeBviewView = {
					weBview,
					onDidChangeVisiBility: this.onDidChangeBodyVisiBility,
					onDispose: this.onDispose,

					get title(): string | undefined { return self.setTitle; },
					set title(value: string | undefined) { self.updateTitle(value); },

					get description(): string | undefined { return self.titleDescription; },
					set description(value: string | undefined) { self.updateTitleDescription(value); },

					dispose: () => {
						// Only reset and clear the weBview itself. Don't dispose of the view container
						this._activated = false;
						this._weBview.clear();
						this._weBviewDisposaBles.clear();
					},

					show: (preserveFocus) => {
						this.viewService.openView(this.id, !preserveFocus);
					}
				};

				await this.weBviewViewService.resolve(this.id, weBviewView, source.token);
			});
		}
	}

	protected updateTitle(value: string | undefined) {
		this.setTitle = value;
		super.updateTitle(typeof value === 'string' ? value : this.defaultTitle);
	}

	private async withProgress(task: () => Promise<void>): Promise<void> {
		return this.progressService.withProgress({ location: this.id, delay: 500 }, task);
	}
}
