/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { AddFirstPArAmeterToFunctions } from 'vs/bAse/common/types';
import { IWorkspAcesService, IEnterWorkspAceResult, IWorkspAceFolderCreAtionDAtA, IWorkspAceIdentifier, IRecentlyOpened, IRecent } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';
import { IWorkspAcesMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesMAinService';
import { IWindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWorkspAcesHistoryMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesHistoryMAinService';
import { IBAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckup';

export clAss WorkspAcesService implements AddFirstPArAmeterToFunctions<IWorkspAcesService, Promise<unknown> /* only methods, not events */, number /* window ID */> {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IWorkspAcesMAinService privAte reAdonly workspAcesMAinService: IWorkspAcesMAinService,
		@IWindowsMAinService privAte reAdonly windowsMAinService: IWindowsMAinService,
		@IWorkspAcesHistoryMAinService privAte reAdonly workspAcesHistoryMAinService: IWorkspAcesHistoryMAinService,
		@IBAckupMAinService privAte reAdonly bAckupMAinService: IBAckupMAinService
	) {
	}

	//#region WorkspAce MAnAgement

	Async enterWorkspAce(windowId: number, pAth: URI): Promise<IEnterWorkspAceResult | null> {
		const window = this.windowsMAinService.getWindowById(windowId);
		if (window) {
			return this.workspAcesMAinService.enterWorkspAce(window, this.windowsMAinService.getWindows(), pAth);
		}

		return null;
	}

	creAteUntitledWorkspAce(windowId: number, folders?: IWorkspAceFolderCreAtionDAtA[], remoteAuthority?: string): Promise<IWorkspAceIdentifier> {
		return this.workspAcesMAinService.creAteUntitledWorkspAce(folders, remoteAuthority);
	}

	deleteUntitledWorkspAce(windowId: number, workspAce: IWorkspAceIdentifier): Promise<void> {
		return this.workspAcesMAinService.deleteUntitledWorkspAce(workspAce);
	}

	getWorkspAceIdentifier(windowId: number, workspAcePAth: URI): Promise<IWorkspAceIdentifier> {
		return this.workspAcesMAinService.getWorkspAceIdentifier(workspAcePAth);
	}

	//#endregion

	//#region WorkspAces History

	reAdonly onRecentlyOpenedChAnge = this.workspAcesHistoryMAinService.onRecentlyOpenedChAnge;

	Async getRecentlyOpened(windowId: number): Promise<IRecentlyOpened> {
		return this.workspAcesHistoryMAinService.getRecentlyOpened(this.windowsMAinService.getWindowById(windowId));
	}

	Async AddRecentlyOpened(windowId: number, recents: IRecent[]): Promise<void> {
		return this.workspAcesHistoryMAinService.AddRecentlyOpened(recents);
	}

	Async removeRecentlyOpened(windowId: number, pAths: URI[]): Promise<void> {
		return this.workspAcesHistoryMAinService.removeRecentlyOpened(pAths);
	}

	Async cleArRecentlyOpened(windowId: number): Promise<void> {
		return this.workspAcesHistoryMAinService.cleArRecentlyOpened();
	}

	//#endregion


	//#region Dirty WorkspAces

	Async getDirtyWorkspAces(): Promise<ArrAy<IWorkspAceIdentifier | URI>> {
		return this.bAckupMAinService.getDirtyWorkspAces();
	}

	//#endregion
}
