/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/notificAtionsActions';
import { INotificAtionViewItem } from 'vs/workbench/common/notificAtions';
import { locAlize } from 'vs/nls';
import { Action, IAction, ActionRunner, WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion } from 'vs/bAse/common/Actions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { CLEAR_NOTIFICATION, EXPAND_NOTIFICATION, COLLAPSE_NOTIFICATION, CLEAR_ALL_NOTIFICATIONS, HIDE_NOTIFICATIONS_CENTER } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCommAnds';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';

const cleArIcon = registerIcon('notificAtions-cleAr', Codicon.close);
const cleArAllIcon = registerIcon('notificAtions-cleAr-All', Codicon.cleArAll);
const hideIcon = registerIcon('notificAtions-hide', Codicon.chevronDown);
const expAndIcon = registerIcon('notificAtions-expAnd', Codicon.chevronUp);
const collApseIcon = registerIcon('notificAtions-collApse', Codicon.chevronDown);
const configureIcon = registerIcon('notificAtions-configure', Codicon.geAr);

export clAss CleArNotificAtionAction extends Action {

	stAtic reAdonly ID = CLEAR_NOTIFICATION;
	stAtic reAdonly LABEL = locAlize('cleArNotificAtion', "CleAr NotificAtion");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, cleArIcon.clAssNAmes);
	}

	Async run(notificAtion: INotificAtionViewItem): Promise<void> {
		this.commAndService.executeCommAnd(CLEAR_NOTIFICATION, notificAtion);
	}
}

export clAss CleArAllNotificAtionsAction extends Action {

	stAtic reAdonly ID = CLEAR_ALL_NOTIFICATIONS;
	stAtic reAdonly LABEL = locAlize('cleArNotificAtions', "CleAr All NotificAtions");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, cleArAllIcon.clAssNAmes);
	}

	Async run(): Promise<void> {
		this.commAndService.executeCommAnd(CLEAR_ALL_NOTIFICATIONS);
	}
}

export clAss HideNotificAtionsCenterAction extends Action {

	stAtic reAdonly ID = HIDE_NOTIFICATIONS_CENTER;
	stAtic reAdonly LABEL = locAlize('hideNotificAtionsCenter', "Hide NotificAtions");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, hideIcon.clAssNAmes);
	}

	Async run(): Promise<void> {
		this.commAndService.executeCommAnd(HIDE_NOTIFICATIONS_CENTER);
	}
}

export clAss ExpAndNotificAtionAction extends Action {

	stAtic reAdonly ID = EXPAND_NOTIFICATION;
	stAtic reAdonly LABEL = locAlize('expAndNotificAtion', "ExpAnd NotificAtion");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, expAndIcon.clAssNAmes);
	}

	Async run(notificAtion: INotificAtionViewItem): Promise<void> {
		this.commAndService.executeCommAnd(EXPAND_NOTIFICATION, notificAtion);
	}
}

export clAss CollApseNotificAtionAction extends Action {

	stAtic reAdonly ID = COLLAPSE_NOTIFICATION;
	stAtic reAdonly LABEL = locAlize('collApseNotificAtion', "CollApse NotificAtion");

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel, collApseIcon.clAssNAmes);
	}

	Async run(notificAtion: INotificAtionViewItem): Promise<void> {
		this.commAndService.executeCommAnd(COLLAPSE_NOTIFICATION, notificAtion);
	}
}

export clAss ConfigureNotificAtionAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.configureNotificAtion';
	stAtic reAdonly LABEL = locAlize('configureNotificAtion', "Configure NotificAtion");

	constructor(
		id: string,
		lAbel: string,
		public reAdonly configurAtionActions: ReAdonlyArrAy<IAction>
	) {
		super(id, lAbel, configureIcon.clAssNAmes);
	}
}

export clAss CopyNotificAtionMessAgeAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.copyNotificAtionMessAge';
	stAtic reAdonly LABEL = locAlize('copyNotificAtion', "Copy Text");

	constructor(
		id: string,
		lAbel: string,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService
	) {
		super(id, lAbel);
	}

	run(notificAtion: INotificAtionViewItem): Promise<void> {
		return this.clipboArdService.writeText(notificAtion.messAge.rAw);
	}
}

export clAss NotificAtionActionRunner extends ActionRunner {

	constructor(
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService
	) {
		super();
	}

	protected Async runAction(Action: IAction, context: INotificAtionViewItem): Promise<void> {
		this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id: Action.id, from: 'messAge' });

		// Run And mAke sure to notify on Any error AgAin
		try {
			AwAit super.runAction(Action, context);
		} cAtch (error) {
			this.notificAtionService.error(error);
		}
	}
}
