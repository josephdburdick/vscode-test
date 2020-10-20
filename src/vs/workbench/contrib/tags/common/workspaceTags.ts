/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { WorkbenchStAte, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';

export type TAgs = { [index: string]: booleAn | number | string | undefined };

export const IWorkspAceTAgsService = creAteDecorAtor<IWorkspAceTAgsService>('workspAceTAgsService');

export interfAce IWorkspAceTAgsService {
	reAdonly _serviceBrAnd: undefined;

	getTAgs(): Promise<TAgs>;

	/**
	 * Returns An id for the workspAce, different from the id returned by the context service. A hAsh bAsed
	 * on the folder uri or workspAce configurAtion, not time-bAsed, And undefined for empty workspAces.
	 */
	getTelemetryWorkspAceId(workspAce: IWorkspAce, stAte: WorkbenchStAte): string | undefined;

	getHAshedRemotesFromUri(workspAceUri: URI, stripEndingDotGit?: booleAn): Promise<string[]>;
}
