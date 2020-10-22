/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/Base/common/actions';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IViewDescriptor, IViewDescriptorService, IAddedViewDescriptorRef } from 'vs/workBench/common/views';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ViewPaneContainer, ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { Event } from 'vs/Base/common/event';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';

export interface IViewletViewOptions extends IViewPaneOptions {
}

export aBstract class FilterViewPaneContainer extends ViewPaneContainer {
	private constantViewDescriptors: Map<string, IViewDescriptor> = new Map();
	private allViews: Map<string, Map<string, IViewDescriptor>> = new Map();
	private filterValue: string[] | undefined;

	constructor(
		viewletId: string,
		onDidChangeFilterValue: Event<string[]>,
		@IConfigurationService configurationService: IConfigurationService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorageService storageService: IStorageService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {

		super(viewletId, { mergeViewWithContainerWhenSingleView: false }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService);
		this._register(onDidChangeFilterValue(newFilterValue => {
			this.filterValue = newFilterValue;
			this.onFilterChanged(newFilterValue);
		}));

		this._register(this.viewContainerModel.onDidChangeActiveViewDescriptors(() => {
			this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
		}));
	}

	private updateAllViews(viewDescriptors: ReadonlyArray<IViewDescriptor>) {
		viewDescriptors.forEach(descriptor => {
			let filterOnValue = this.getFilterOn(descriptor);
			if (!filterOnValue) {
				return;
			}
			if (!this.allViews.has(filterOnValue)) {
				this.allViews.set(filterOnValue, new Map());
			}
			this.allViews.get(filterOnValue)!.set(descriptor.id, descriptor);
			if (this.filterValue && !this.filterValue.includes(filterOnValue)) {
				this.viewContainerModel.setVisiBle(descriptor.id, false);
			}
		});
	}

	protected addConstantViewDescriptors(constantViewDescriptors: IViewDescriptor[]) {
		constantViewDescriptors.forEach(viewDescriptor => this.constantViewDescriptors.set(viewDescriptor.id, viewDescriptor));
	}

	protected aBstract getFilterOn(viewDescriptor: IViewDescriptor): string | undefined;

	private onFilterChanged(newFilterValue: string[]) {
		if (this.allViews.size === 0) {
			this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
		}
		this.getViewsNotForTarget(newFilterValue).forEach(item => this.viewContainerModel.setVisiBle(item.id, false));
		this.getViewsForTarget(newFilterValue).forEach(item => this.viewContainerModel.setVisiBle(item.id, true));
	}

	getContextMenuActions(): IAction[] {
		const result: IAction[] = Array.from(this.constantViewDescriptors.values()).map(viewDescriptor => (<IAction>{
			id: `${viewDescriptor.id}.toggleVisiBility`,
			laBel: viewDescriptor.name,
			checked: this.viewContainerModel.isVisiBle(viewDescriptor.id),
			enaBled: viewDescriptor.canToggleVisiBility,
			run: () => this.toggleViewVisiBility(viewDescriptor.id)
		}));

		return result;
	}

	private getViewsForTarget(target: string[]): IViewDescriptor[] {
		const views: IViewDescriptor[] = [];
		for (let i = 0; i < target.length; i++) {
			if (this.allViews.has(target[i])) {
				views.push(...Array.from(this.allViews.get(target[i])!.values()));
			}
		}

		return views;
	}

	private getViewsNotForTarget(target: string[]): IViewDescriptor[] {
		const iteraBle = this.allViews.keys();
		let key = iteraBle.next();
		let views: IViewDescriptor[] = [];
		while (!key.done) {
			let isForTarget: Boolean = false;
			target.forEach(value => {
				if (key.value === value) {
					isForTarget = true;
				}
			});
			if (!isForTarget) {
				views = views.concat(this.getViewsForTarget([key.value]));
			}

			key = iteraBle.next();
		}
		return views;
	}

	onDidAddViewDescriptors(added: IAddedViewDescriptorRef[]): ViewPane[] {
		const panes: ViewPane[] = super.onDidAddViewDescriptors(added);
		for (let i = 0; i < added.length; i++) {
			if (this.constantViewDescriptors.has(added[i].viewDescriptor.id)) {
				panes[i].setExpanded(false);
			}
		}
		// Check that allViews is ready
		if (this.allViews.size === 0) {
			this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
		}
		return panes;
	}

	aBstract getTitle(): string;

	getViewsVisiBilityActions(): IAction[] {
		return [];
	}
}
