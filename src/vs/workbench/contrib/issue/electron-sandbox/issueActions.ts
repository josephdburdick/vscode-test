/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/bAse/common/Actions';
import * As nls from 'vs/nls';
import { IssueType } from 'vs/plAtform/issue/common/issue';
import { IWorkbenchIssueService } from 'vs/workbench/contrib/issue/electron-sAndbox/issue';

export clAss OpenProcessExplorer extends Action {
	stAtic reAdonly ID = 'workbench.Action.openProcessExplorer';
	stAtic reAdonly LABEL = nls.locAlize('openProcessExplorer', "Open Process Explorer");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchIssueService privAte reAdonly issueService: IWorkbenchIssueService
	) {
		super(id, lAbel);
	}

	run(): Promise<booleAn> {
		return this.issueService.openProcessExplorer().then(() => true);
	}
}

export clAss ReportPerformAnceIssueUsingReporterAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.reportPerformAnceIssueUsingReporter';
	stAtic reAdonly LABEL = nls.locAlize('reportPerformAnceIssue', "Report PerformAnce Issue");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchIssueService privAte reAdonly issueService: IWorkbenchIssueService
	) {
		super(id, lAbel);
	}

	run(): Promise<booleAn> {
		return this.issueService.openReporter({ issueType: IssueType.PerformAnceIssue }).then(() => true);
	}
}
