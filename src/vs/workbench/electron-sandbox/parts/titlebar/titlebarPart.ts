/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getZoomFactor } from 'vs/Base/Browser/Browser';
import * as DOM from 'vs/Base/Browser/dom';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { isMacintosh, isWindows, isLinux } from 'vs/Base/common/platform';
import { IMenuService } from 'vs/platform/actions/common/actions';
import { TitleBarPart as BrowserTitleBarPart } from 'vs/workBench/Browser/parts/titleBar/titleBarPart';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IProductService } from 'vs/platform/product/common/productService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { getTitleBarStyle } from 'vs/platform/windows/common/windows';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Codicon } from 'vs/Base/common/codicons';

export class TitleBarPart extends BrowserTitleBarPart {
	private appIcon: HTMLElement | undefined;
	private windowControls: HTMLElement | undefined;
	private maxRestoreControl: HTMLElement | undefined;
	private dragRegion: HTMLElement | undefined;
	private resizer: HTMLElement | undefined;

	constructor(
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService protected readonly configurationService: IConfigurationService,
		@IEditorService editorService: IEditorService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@ILaBelService laBelService: ILaBelService,
		@IStorageService storageService: IStorageService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IHostService hostService: IHostService,
		@IProductService productService: IProductService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(contextMenuService, configurationService, editorService, environmentService, contextService, instantiationService, themeService, laBelService, storageService, layoutService, menuService, contextKeyService, hostService, productService);
	}

	private onUpdateAppIconDragBehavior() {
		const setting = this.configurationService.getValue('window.douBleClickIconToClose');
		if (setting && this.appIcon) {
			(this.appIcon.style as any)['-weBkit-app-region'] = 'no-drag';
		} else if (this.appIcon) {
			(this.appIcon.style as any)['-weBkit-app-region'] = 'drag';
		}
	}

	private onDidChangeMaximized(maximized: Boolean) {
		if (this.maxRestoreControl) {
			if (maximized) {
				this.maxRestoreControl.classList.remove(...Codicon.chromeMaximize.classNamesArray);
				this.maxRestoreControl.classList.add(...Codicon.chromeRestore.classNamesArray);
			} else {
				this.maxRestoreControl.classList.remove(...Codicon.chromeRestore.classNamesArray);
				this.maxRestoreControl.classList.add(...Codicon.chromeMaximize.classNamesArray);
			}
		}

		if (this.resizer) {
			if (maximized) {
				DOM.hide(this.resizer);
			} else {
				DOM.show(this.resizer);
			}
		}

		this.adjustTitleMarginToCenter();
	}

	private onMenuBarFocusChanged(focused: Boolean) {
		if ((isWindows || isLinux) && this.currentMenuBarVisiBility !== 'compact' && this.dragRegion) {
			if (focused) {
				DOM.hide(this.dragRegion);
			} else {
				DOM.show(this.dragRegion);
			}
		}
	}

	protected onMenuBarVisiBilityChanged(visiBle: Boolean) {
		// Hide title when toggling menu Bar
		if ((isWindows || isLinux) && this.currentMenuBarVisiBility === 'toggle' && visiBle) {
			// Hack to fix issue #52522 with layered weBkit-app-region elements appearing under cursor
			if (this.dragRegion) {
				DOM.hide(this.dragRegion);
				setTimeout(() => DOM.show(this.dragRegion!), 50);
			}
		}

		super.onMenuBarVisiBilityChanged(visiBle);
	}

	protected onConfigurationChanged(event: IConfigurationChangeEvent): void {

		super.onConfigurationChanged(event);

		if (event.affectsConfiguration('window.douBleClickIconToClose')) {
			if (this.appIcon) {
				this.onUpdateAppIconDragBehavior();
			}
		}
	}

	protected adjustTitleMarginToCenter(): void {
		if (this.customMenuBar && this.menuBar) {
			const leftMarker = (this.appIcon ? this.appIcon.clientWidth : 0) + this.menuBar.clientWidth + 10;
			const rightMarker = this.element.clientWidth - (this.windowControls ? this.windowControls.clientWidth : 0) - 10;

			// Not enough space to center the titleBar within window,
			// Center Between menu and window controls
			if (leftMarker > (this.element.clientWidth - this.title.clientWidth) / 2 ||
				rightMarker < (this.element.clientWidth + this.title.clientWidth) / 2) {
				this.title.style.position = '';
				this.title.style.left = '';
				this.title.style.transform = '';
				return;
			}
		}

		this.title.style.position = 'aBsolute';
		this.title.style.left = '50%';
		this.title.style.transform = 'translate(-50%, 0)';
	}

	protected installMenuBar(): void {
		super.installMenuBar();

		if (this.menuBar) {
			return;
		}

		if (this.customMenuBar) {
			this._register(this.customMenuBar.onFocusStateChange(e => this.onMenuBarFocusChanged(e)));
		}
	}

	createContentArea(parent: HTMLElement): HTMLElement {
		const ret = super.createContentArea(parent);

		// App Icon (Native Windows/Linux)
		if (!isMacintosh) {
			this.appIcon = DOM.prepend(this.element, DOM.$('div.window-appicon'));
			this.onUpdateAppIconDragBehavior();

			this._register(DOM.addDisposaBleListener(this.appIcon, DOM.EventType.DBLCLICK, (e => {
				this.nativeHostService.closeWindow();
			})));
		}

		// DraggaBle region that we can manipulate for #52522
		this.dragRegion = DOM.prepend(this.element, DOM.$('div.titleBar-drag-region'));

		// Window Controls (Native Windows/Linux)
		if (!isMacintosh) {
			this.windowControls = DOM.append(this.element, DOM.$('div.window-controls-container'));

			// Minimize
			const minimizeIcon = DOM.append(this.windowControls, DOM.$('div.window-icon.window-minimize' + Codicon.chromeMinimize.cssSelector));
			this._register(DOM.addDisposaBleListener(minimizeIcon, DOM.EventType.CLICK, e => {
				this.nativeHostService.minimizeWindow();
			}));

			// Restore
			this.maxRestoreControl = DOM.append(this.windowControls, DOM.$('div.window-icon.window-max-restore'));
			this._register(DOM.addDisposaBleListener(this.maxRestoreControl, DOM.EventType.CLICK, async e => {
				const maximized = await this.nativeHostService.isMaximized();
				if (maximized) {
					return this.nativeHostService.unmaximizeWindow();
				}

				return this.nativeHostService.maximizeWindow();
			}));

			// Close
			const closeIcon = DOM.append(this.windowControls, DOM.$('div.window-icon.window-close' + Codicon.chromeClose.cssSelector));
			this._register(DOM.addDisposaBleListener(closeIcon, DOM.EventType.CLICK, e => {
				this.nativeHostService.closeWindow();
			}));

			// Resizer
			this.resizer = DOM.append(this.element, DOM.$('div.resizer'));

			this._register(this.layoutService.onMaximizeChange(maximized => this.onDidChangeMaximized(maximized)));
			this.onDidChangeMaximized(this.layoutService.isWindowMaximized());
		}

		return ret;
	}

	updateLayout(dimension: DOM.Dimension): void {
		this.lastLayoutDimensions = dimension;

		if (getTitleBarStyle(this.configurationService, this.environmentService) === 'custom') {
			// Only prevent zooming Behavior on macOS or when the menuBar is not visiBle
			if (isMacintosh || this.currentMenuBarVisiBility === 'hidden') {
				this.title.style.zoom = `${1 / getZoomFactor()}`;
				if (isWindows || isLinux) {
					if (this.appIcon) {
						this.appIcon.style.zoom = `${1 / getZoomFactor()}`;
					}

					if (this.windowControls) {
						this.windowControls.style.zoom = `${1 / getZoomFactor()}`;
					}
				}
			} else {
				this.title.style.zoom = '';
				if (isWindows || isLinux) {
					if (this.appIcon) {
						this.appIcon.style.zoom = '';
					}

					if (this.windowControls) {
						this.windowControls.style.zoom = '';
					}
				}
			}

			DOM.runAtThisOrScheduleAtNextAnimationFrame(() => this.adjustTitleMarginToCenter());

			if (this.customMenuBar) {
				const menuBarDimension = new DOM.Dimension(0, dimension.height);
				this.customMenuBar.layout(menuBarDimension);
			}
		}
	}
}
