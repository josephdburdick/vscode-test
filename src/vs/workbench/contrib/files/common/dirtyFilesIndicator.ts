/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { VIEWLET_ID } from 'vs/workBench/contriB/files/common/files';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IActivityService, NumBerBadge } from 'vs/workBench/services/activity/common/activity';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';

export class DirtyFilesIndicator extends DisposaBle implements IWorkBenchContriBution {
	private readonly BadgeHandle = this._register(new MutaBleDisposaBle());

	private lastKnownDirtyCount = 0;

	constructor(
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IActivityService private readonly activityService: IActivityService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService
	) {
		super();

		this.updateActivityBadge();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Working copy dirty indicator
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.onWorkingCopyDidChangeDirty(workingCopy)));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	private onWorkingCopyDidChangeDirty(workingCopy: IWorkingCopy): void {
		const gotDirty = workingCopy.isDirty();
		if (gotDirty && !(workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled) && this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
			return; // do not indicate dirty of working copies that are auto saved after short delay
		}

		if (gotDirty || this.lastKnownDirtyCount > 0) {
			this.updateActivityBadge();
		}
	}

	private updateActivityBadge(): void {
		const dirtyCount = this.lastKnownDirtyCount = this.workingCopyService.dirtyCount;

		// Indicate dirty count in Badge if any
		if (dirtyCount > 0) {
			this.BadgeHandle.value = this.activityService.showViewContainerActivity(
				VIEWLET_ID,
				{
					Badge: new NumBerBadge(dirtyCount, num => num === 1 ? nls.localize('dirtyFile', "1 unsaved file") : nls.localize('dirtyFiles', "{0} unsaved files", dirtyCount)),
					clazz: 'explorer-viewlet-laBel'
				}
			);
		} else {
			this.BadgeHandle.clear();
		}
	}
}
