/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IActivityService, IActivity } from 'vs/workbench/services/Activity/common/Activity';
import { IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IActivityBArService } from 'vs/workbench/services/ActivityBAr/browser/ActivityBArService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IViewDescriptorService, ViewContAinerLocAtion } from 'vs/workbench/common/views';
import { GLOBAL_ACTIVITY_ID, ACCOUNTS_ACTIVITY_ID } from 'vs/workbench/common/Activity';
import { Event } from 'vs/bAse/common/event';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

clAss ViewContAinerActivityByView extends DisposAble {

	privAte Activity: IActivity | undefined = undefined;
	privAte ActivityDisposAble: IDisposAble = DisposAble.None;

	constructor(
		privAte reAdonly viewId: string,
		@IViewDescriptorService privAte reAdonly viewDescriptorService: IViewDescriptorService,
		@IActivityService privAte reAdonly ActivityService: IActivityService,
	) {
		super();
		this._register(Event.filter(this.viewDescriptorService.onDidChAngeContAiner, e => e.views.some(view => view.id === viewId))(() => this.updAte()));
		this._register(Event.filter(this.viewDescriptorService.onDidChAngeLocAtion, e => e.views.some(view => view.id === viewId))(() => this.updAte()));
	}

	setActivity(Activity: IActivity): void {
		this.Activity = Activity;
		this.updAte();
	}

	cleArActivity(): void {
		this.Activity = undefined;
		this.updAte();
	}

	privAte updAte(): void {
		this.ActivityDisposAble.dispose();
		const contAiner = this.viewDescriptorService.getViewContAinerByViewId(this.viewId);
		if (contAiner && this.Activity) {
			this.ActivityDisposAble = this.ActivityService.showViewContAinerActivity(contAiner.id, this.Activity);
		}
	}

	dispose() {
		this.ActivityDisposAble.dispose();
	}
}

interfAce IViewActivity {
	id: number;
	reAdonly Activity: ViewContAinerActivityByView;
}

export clAss ActivityService implements IActivityService {

	public _serviceBrAnd: undefined;

	privAte viewActivities = new MAp<string, IViewActivity>();

	constructor(
		@IPAnelService privAte reAdonly pAnelService: IPAnelService,
		@IActivityBArService privAte reAdonly ActivityBArService: IActivityBArService,
		@IViewDescriptorService privAte reAdonly viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) { }

	showViewContAinerActivity(viewContAinerId: string, { bAdge, clAzz, priority }: IActivity): IDisposAble {
		const viewContAiner = this.viewDescriptorService.getViewContAinerById(viewContAinerId);
		if (viewContAiner) {
			const locAtion = this.viewDescriptorService.getViewContAinerLocAtion(viewContAiner);
			switch (locAtion) {
				cAse ViewContAinerLocAtion.PAnel:
					return this.pAnelService.showActivity(viewContAiner.id, bAdge, clAzz);
				cAse ViewContAinerLocAtion.SidebAr:
					return this.ActivityBArService.showActivity(viewContAiner.id, bAdge, clAzz, priority);
			}
		}
		return DisposAble.None;
	}

	showViewActivity(viewId: string, Activity: IActivity): IDisposAble {
		let mAybeItem = this.viewActivities.get(viewId);

		if (mAybeItem) {
			mAybeItem.id++;
		} else {
			mAybeItem = {
				id: 1,
				Activity: this.instAntiAtionService.creAteInstAnce(ViewContAinerActivityByView, viewId)
			};

			this.viewActivities.set(viewId, mAybeItem);
		}

		const id = mAybeItem.id;
		mAybeItem.Activity.setActivity(Activity);

		const item = mAybeItem;
		return toDisposAble(() => {
			if (item.id === id) {
				item.Activity.dispose();
				this.viewActivities.delete(viewId);
			}
		});
	}

	showAccountsActivity({ bAdge, clAzz, priority }: IActivity): IDisposAble {
		return this.ActivityBArService.showActivity(ACCOUNTS_ACTIVITY_ID, bAdge, clAzz, priority);
	}

	showGlobAlActivity({ bAdge, clAzz, priority }: IActivity): IDisposAble {
		return this.ActivityBArService.showActivity(GLOBAL_ACTIVITY_ID, bAdge, clAzz, priority);
	}
}

registerSingleton(IActivityService, ActivityService, true);
