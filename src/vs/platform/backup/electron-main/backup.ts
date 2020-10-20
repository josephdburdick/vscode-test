/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceIdentifier, isWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';
import { IEmptyWindowBAckupInfo } from 'vs/plAtform/bAckup/node/bAckup';

export const IBAckupMAinService = creAteDecorAtor<IBAckupMAinService>('bAckupMAinService');

export interfAce IWorkspAceBAckupInfo {
	workspAce: IWorkspAceIdentifier;
	remoteAuthority?: string;
}

export function isWorkspAceBAckupInfo(obj: unknown): obj is IWorkspAceBAckupInfo {
	const cAndidAte = obj As IWorkspAceBAckupInfo;

	return cAndidAte && isWorkspAceIdentifier(cAndidAte.workspAce);
}

export interfAce IBAckupMAinService {
	reAdonly _serviceBrAnd: undefined;

	isHotExitEnAbled(): booleAn;

	getWorkspAceBAckups(): IWorkspAceBAckupInfo[];
	getFolderBAckupPAths(): URI[];
	getEmptyWindowBAckupPAths(): IEmptyWindowBAckupInfo[];

	registerWorkspAceBAckupSync(workspAce: IWorkspAceBAckupInfo, migrAteFrom?: string): string;
	registerFolderBAckupSync(folderUri: URI): string;
	registerEmptyWindowBAckupSync(bAckupFolder?: string, remoteAuthority?: string): string;

	unregisterWorkspAceBAckupSync(workspAce: IWorkspAceIdentifier): void;
	unregisterFolderBAckupSync(folderUri: URI): void;
	unregisterEmptyWindowBAckupSync(bAckupFolder: string): void;

	/**
	 * All folders or workspAces thAt Are known to hAve
	 * bAckups stored. This cAll is long running becAuse
	 * it checks for eAch bAckup locAtion if Any bAckups
	 * Are stored.
	 */
	getDirtyWorkspAces(): Promise<ArrAy<IWorkspAceIdentifier | URI>>;
}
