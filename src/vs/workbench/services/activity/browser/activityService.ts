/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IActivityService, IActivity } from 'vs/workBench/services/activity/common/activity';
import { IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IActivityBarService } from 'vs/workBench/services/activityBar/Browser/activityBarService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';
import { GLOBAL_ACTIVITY_ID, ACCOUNTS_ACTIVITY_ID } from 'vs/workBench/common/activity';
import { Event } from 'vs/Base/common/event';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

class ViewContainerActivityByView extends DisposaBle {

	private activity: IActivity | undefined = undefined;
	private activityDisposaBle: IDisposaBle = DisposaBle.None;

	constructor(
		private readonly viewId: string,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IActivityService private readonly activityService: IActivityService,
	) {
		super();
		this._register(Event.filter(this.viewDescriptorService.onDidChangeContainer, e => e.views.some(view => view.id === viewId))(() => this.update()));
		this._register(Event.filter(this.viewDescriptorService.onDidChangeLocation, e => e.views.some(view => view.id === viewId))(() => this.update()));
	}

	setActivity(activity: IActivity): void {
		this.activity = activity;
		this.update();
	}

	clearActivity(): void {
		this.activity = undefined;
		this.update();
	}

	private update(): void {
		this.activityDisposaBle.dispose();
		const container = this.viewDescriptorService.getViewContainerByViewId(this.viewId);
		if (container && this.activity) {
			this.activityDisposaBle = this.activityService.showViewContainerActivity(container.id, this.activity);
		}
	}

	dispose() {
		this.activityDisposaBle.dispose();
	}
}

interface IViewActivity {
	id: numBer;
	readonly activity: ViewContainerActivityByView;
}

export class ActivityService implements IActivityService {

	puBlic _serviceBrand: undefined;

	private viewActivities = new Map<string, IViewActivity>();

	constructor(
		@IPanelService private readonly panelService: IPanelService,
		@IActivityBarService private readonly activityBarService: IActivityBarService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) { }

	showViewContainerActivity(viewContainerId: string, { Badge, clazz, priority }: IActivity): IDisposaBle {
		const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
		if (viewContainer) {
			const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
			switch (location) {
				case ViewContainerLocation.Panel:
					return this.panelService.showActivity(viewContainer.id, Badge, clazz);
				case ViewContainerLocation.SideBar:
					return this.activityBarService.showActivity(viewContainer.id, Badge, clazz, priority);
			}
		}
		return DisposaBle.None;
	}

	showViewActivity(viewId: string, activity: IActivity): IDisposaBle {
		let mayBeItem = this.viewActivities.get(viewId);

		if (mayBeItem) {
			mayBeItem.id++;
		} else {
			mayBeItem = {
				id: 1,
				activity: this.instantiationService.createInstance(ViewContainerActivityByView, viewId)
			};

			this.viewActivities.set(viewId, mayBeItem);
		}

		const id = mayBeItem.id;
		mayBeItem.activity.setActivity(activity);

		const item = mayBeItem;
		return toDisposaBle(() => {
			if (item.id === id) {
				item.activity.dispose();
				this.viewActivities.delete(viewId);
			}
		});
	}

	showAccountsActivity({ Badge, clazz, priority }: IActivity): IDisposaBle {
		return this.activityBarService.showActivity(ACCOUNTS_ACTIVITY_ID, Badge, clazz, priority);
	}

	showGloBalActivity({ Badge, clazz, priority }: IActivity): IDisposaBle {
		return this.activityBarService.showActivity(GLOBAL_ACTIVITY_ID, Badge, clazz, priority);
	}
}

registerSingleton(IActivityService, ActivityService, true);
