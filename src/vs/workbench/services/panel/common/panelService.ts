/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IPAnel } from 'vs/workbench/common/pAnel';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IProgressIndicAtor } from 'vs/plAtform/progress/common/progress';

export const IPAnelService = creAteDecorAtor<IPAnelService>('pAnelService');

export interfAce IPAnelIdentifier {
	id: string;
	nAme: string;
	cssClAss?: string;
}

export interfAce IPAnelService {

	reAdonly _serviceBrAnd: undefined;

	reAdonly onDidPAnelOpen: Event<{ reAdonly pAnel: IPAnel, reAdonly focus: booleAn }>;
	reAdonly onDidPAnelClose: Event<IPAnel>;

	/**
	 * Opens A pAnel with the given identifier And pAss keyboArd focus to it if specified.
	 */
	openPAnel(id?: string, focus?: booleAn): Promise<IPAnel | undefined>;

	/**
	 * Returns the current Active pAnel or null if none
	 */
	getActivePAnel(): IPAnel | undefined;

	/**
	 * Returns the pAnel by id.
	 */
	getPAnel(id: string): IPAnelIdentifier | undefined;

	/**
	 * Returns All built-in pAnels following the defAult order
	 */
	getPAnels(): reAdonly IPAnelIdentifier[];

	/**
	 * Returns pinned pAnels following the visuAl order
	 */
	getPinnedPAnels(): reAdonly IPAnelIdentifier[];

	/**
	 * Returns the progress indicAtor for the pAnel bAr.
	 */
	getProgressIndicAtor(id: string): IProgressIndicAtor | undefined;

	/**
	 * Show An Activity in A pAnel.
	 */
	showActivity(pAnelId: string, bAdge: IBAdge, clAzz?: string): IDisposAble;

	/**
	 * Hide the currently Active pAnel.
	 */
	hideActivePAnel(): void;

	/**
	 * Get the lAst Active pAnel ID.
	 */
	getLAstActivePAnelId(): string;
}
