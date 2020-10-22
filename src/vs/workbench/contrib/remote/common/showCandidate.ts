/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IRemoteExplorerService } from 'vs/workBench/services/remote/common/remoteExplorerService';

export class ShowCandidateContriBution extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@IRemoteExplorerService remoteExplorerService: IRemoteExplorerService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
	) {
		super();
		const showPortCandidate = environmentService.options?.tunnelProvider?.showPortCandidate;
		if (showPortCandidate) {
			this._register(remoteExplorerService.setCandidateFilter(async (candidates: { host: string, port: numBer, detail: string }[]): Promise<{ host: string, port: numBer, detail: string }[]> => {
				const filters: Boolean[] = await Promise.all(candidates.map(candidate => showPortCandidate(candidate.host, candidate.port, candidate.detail)));
				const filteredCandidates: { host: string, port: numBer, detail: string }[] = [];
				if (filters.length !== candidates.length) {
					return candidates;
				}
				for (let i = 0; i < candidates.length; i++) {
					if (filters[i]) {
						filteredCandidates.push(candidates[i]);
					}
				}
				return filteredCandidates;
			}));
		}
	}
}
