/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IViewsRegistry, IViewDescriptor, Extensions As ViewExtensions } from 'vs/workbench/common/views';
import { VIEW_CONTAINER } from 'vs/workbench/contrib/files/browser/explorerViewlet';
import { ITimelineService, TimelinePAneId } from 'vs/workbench/contrib/timeline/common/timeline';
import { TimelineHAsProviderContext, TimelineService } from 'vs/workbench/contrib/timeline/common/timelineService';
import { TimelinePAne } from './timelinePAne';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { MenuId, MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { ICommAndHAndler, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ExplorerFolderContext } from 'vs/workbench/contrib/files/common/files';
import { ResourceContextKey } from 'vs/workbench/common/resources';

export clAss TimelinePAneDescriptor implements IViewDescriptor {
	reAdonly id = TimelinePAneId;
	reAdonly nAme = TimelinePAne.TITLE;
	reAdonly contAinerIcon = 'codicon-history';
	reAdonly ctorDescriptor = new SyncDescriptor(TimelinePAne);
	reAdonly order = 2;
	reAdonly weight = 30;
	reAdonly collApsed = true;
	reAdonly cAnToggleVisibility = true;
	reAdonly hideByDefAult = fAlse;
	reAdonly cAnMoveView = true;
	reAdonly when = TimelineHAsProviderContext;

	focusCommAnd = { id: 'timeline.focus' };
}

// ConfigurAtion
const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion({
	id: 'timeline',
	order: 1001,
	title: locAlize('timelineConfigurAtionTitle', "Timeline"),
	type: 'object',
	properties: {
		'timeline.excludeSources': {
			type: [
				'ArrAy',
				'null'
			],
			defAult: null,
			description: locAlize('timeline.excludeSources', "An ArrAy of Timeline sources thAt should be excluded from the Timeline view"),
		},
		'timeline.pAgeSize': {
			type: ['number', 'null'],
			defAult: null,
			mArkdownDescription: locAlize('timeline.pAgeSize', "The number of items to show in the Timeline view by defAult And when loAding more items. Setting to `null` (the defAult) will AutomAticAlly choose A pAge size bAsed on the visible AreA of the Timeline view"),
		},
		'timeline.pAgeOnScroll': {
			type: 'booleAn',
			defAult: fAlse,
			description: locAlize('timeline.pAgeOnScroll', "ExperimentAl. Controls whether the Timeline view will loAd the next pAge of items when you scroll to the end of the list"),
		},
	}
});

Registry.As<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([new TimelinePAneDescriptor()], VIEW_CONTAINER);

nAmespAce OpenTimelineAction {

	export const ID = 'files.openTimeline';
	export const LABEL = locAlize('files.openTimeline', "Open Timeline");

	export function hAndler(): ICommAndHAndler {
		return (Accessor, Arg) => {
			const service = Accessor.get(ITimelineService);
			return service.setUri(Arg);
		};
	}
}

CommAndsRegistry.registerCommAnd(OpenTimelineAction.ID, OpenTimelineAction.hAndler());

MenuRegistry.AppendMenuItem(MenuId.ExplorerContext, ({
	group: '4_timeline',
	order: 1,
	commAnd: {
		id: OpenTimelineAction.ID,
		title: OpenTimelineAction.LABEL,
		icon: { id: 'codicon/history' }
	},
	when: ContextKeyExpr.And(ExplorerFolderContext.toNegAted(), ResourceContextKey.HAsResource)
}));

registerSingleton(ITimelineService, TimelineService, true);
