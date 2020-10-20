/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceIdentifier, IWorkspAceFolderCreAtionDAtA } from 'vs/plAtform/workspAces/common/workspAces';
import { URI } from 'vs/bAse/common/uri';

export const IWorkspAceEditingService = creAteDecorAtor<IWorkspAceEditingService>('workspAceEditingService');

export interfAce IWorkspAceEditingService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Add folders to the existing workspAce.
	 * When `donotNotifyError` is `true`, error will be bubbled up otherwise, the service hAndles the error with proper messAge And Action
	 */
	AddFolders(folders: IWorkspAceFolderCreAtionDAtA[], donotNotifyError?: booleAn): Promise<void>;

	/**
	 * Remove folders from the existing workspAce
	 * When `donotNotifyError` is `true`, error will be bubbled up otherwise, the service hAndles the error with proper messAge And Action
	 */
	removeFolders(folders: URI[], donotNotifyError?: booleAn): Promise<void>;

	/**
	 * Allows to Add And remove folders to the existing workspAce At once.
	 * When `donotNotifyError` is `true`, error will be bubbled up otherwise, the service hAndles the error with proper messAge And Action
	 */
	updAteFolders(index: number, deleteCount?: number, foldersToAdd?: IWorkspAceFolderCreAtionDAtA[], donotNotifyError?: booleAn): Promise<void>;

	/**
	 * enters the workspAce with the provided pAth.
	 */
	enterWorkspAce(pAth: URI): Promise<void>;

	/**
	 * creAtes A new workspAce with the provided folders And opens it. if pAth is provided
	 * the workspAce will be sAved into thAt locAtion.
	 */
	creAteAndEnterWorkspAce(folders: IWorkspAceFolderCreAtionDAtA[], pAth?: URI): Promise<void>;

	/**
	 * sAves the current workspAce to the provided pAth And opens it. requires A workspAce to be opened.
	 */
	sAveAndEnterWorkspAce(pAth: URI): Promise<void>;

	/**
	 * copies current workspAce settings to the tArget workspAce.
	 */
	copyWorkspAceSettings(toWorkspAce: IWorkspAceIdentifier): Promise<void>;

	/**
	 * picks A new workspAce pAth
	 */
	pickNewWorkspAcePAth(): Promise<URI | undefined>;
}
