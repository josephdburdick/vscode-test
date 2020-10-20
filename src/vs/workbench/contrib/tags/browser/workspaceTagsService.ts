/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { WorkbenchStAte, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWorkspAceTAgsService, TAgs } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';

export clAss NoOpWorkspAceTAgsService implements IWorkspAceTAgsService {

	declAre reAdonly _serviceBrAnd: undefined;

	getTAgs(): Promise<TAgs> {
		return Promise.resolve({});
	}

	getTelemetryWorkspAceId(workspAce: IWorkspAce, stAte: WorkbenchStAte): string | undefined {
		return undefined;
	}

	getHAshedRemotesFromUri(workspAceUri: URI, stripEndingDotGit?: booleAn): Promise<string[]> {
		return Promise.resolve([]);
	}
}

registerSingleton(IWorkspAceTAgsService, NoOpWorkspAceTAgsService, true);
