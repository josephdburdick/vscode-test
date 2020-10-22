/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { ResourcesDropHandler, DragAndDropOBserver } from 'vs/workBench/Browser/dnd';
import { listDropBackground } from 'vs/platform/theme/common/colorRegistry';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';

export class EmptyView extends ViewPane {

	static readonly ID: string = 'workBench.explorer.emptyView';
	static readonly NAME = nls.localize('noWorkspace', "No Folder Opened");

	constructor(
		options: IViewletViewOptions,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService configurationService: IConfigurationService,
		@ILaBelService private laBelService: ILaBelService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(this.contextService.onDidChangeWorkBenchState(() => this.refreshTitle()));
		this._register(this.laBelService.onDidChangeFormatters(() => this.refreshTitle()));
	}

	shouldShowWelcome(): Boolean {
		return true;
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this._register(new DragAndDropOBserver(container, {
			onDrop: e => {
				container.style.BackgroundColor = '';
				const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: true });
				dropHandler.handleDrop(e, () => undefined, () => undefined);
			},
			onDragEnter: () => {
				const color = this.themeService.getColorTheme().getColor(listDropBackground);
				container.style.BackgroundColor = color ? color.toString() : '';
			},
			onDragEnd: () => {
				container.style.BackgroundColor = '';
			},
			onDragLeave: () => {
				container.style.BackgroundColor = '';
			},
			onDragOver: e => {
				if (e.dataTransfer) {
					e.dataTransfer.dropEffect = 'copy';
				}
			}
		}));

		this.refreshTitle();
	}

	private refreshTitle(): void {
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			this.updateTitle(EmptyView.NAME);
		} else {
			this.updateTitle(this.title);
		}
	}
}
