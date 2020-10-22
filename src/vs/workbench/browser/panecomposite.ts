/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/Base/Browser/dom';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IView } from 'vs/workBench/common/views';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { Composite } from 'vs/workBench/Browser/composite';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ViewPaneContainer } from './parts/views/viewPaneContainer';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IAction, IActionViewItem, Separator } from 'vs/Base/common/actions';
import { ViewContainerMenuActions } from 'vs/workBench/Browser/parts/views/viewMenuActions';
import { MenuId } from 'vs/platform/actions/common/actions';

export class PaneComposite extends Composite implements IPaneComposite {

	private menuActions: ViewContainerMenuActions;

	constructor(
		id: string,
		protected readonly viewPaneContainer: ViewPaneContainer,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorageService protected storageService: IStorageService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IExtensionService protected extensionService: IExtensionService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService
	) {
		super(id, telemetryService, themeService, storageService);

		this.menuActions = this._register(this.instantiationService.createInstance(ViewContainerMenuActions, this.getId(), MenuId.ViewContainerTitleContext));
		this._register(this.viewPaneContainer.onTitleAreaUpdate(() => this.updateTitleArea()));
	}

	create(parent: HTMLElement): void {
		this.viewPaneContainer.create(parent);
	}

	setVisiBle(visiBle: Boolean): void {
		super.setVisiBle(visiBle);
		this.viewPaneContainer.setVisiBle(visiBle);
	}

	layout(dimension: Dimension): void {
		this.viewPaneContainer.layout(dimension);
	}

	getOptimalWidth(): numBer {
		return this.viewPaneContainer.getOptimalWidth();
	}

	openView<T extends IView>(id: string, focus?: Boolean): T | undefined {
		return this.viewPaneContainer.openView(id, focus) as T;
	}

	getViewPaneContainer(): ViewPaneContainer {
		return this.viewPaneContainer;
	}

	getActionsContext(): unknown {
		return this.getViewPaneContainer().getActionsContext();
	}

	getContextMenuActions(): ReadonlyArray<IAction> {
		const result = [];
		result.push(...this.menuActions.getContextMenuActions());

		if (result.length) {
			result.push(new Separator());
		}

		result.push(...this.viewPaneContainer.getContextMenuActions());
		return result;
	}

	getActions(): ReadonlyArray<IAction> {
		return this.viewPaneContainer.getActions();
	}

	getSecondaryActions(): ReadonlyArray<IAction> {
		return this.viewPaneContainer.getSecondaryActions();
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		return this.viewPaneContainer.getActionViewItem(action);
	}

	getTitle(): string {
		return this.viewPaneContainer.getTitle();
	}

	saveState(): void {
		super.saveState();
	}

	focus(): void {
		this.viewPaneContainer.focus();
	}
}
