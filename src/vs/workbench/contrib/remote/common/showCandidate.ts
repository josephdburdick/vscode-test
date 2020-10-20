/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IRemoteExplorerService } from 'vs/workbench/services/remote/common/remoteExplorerService';

export clAss ShowCAndidAteContribution extends DisposAble implements IWorkbenchContribution {
	constructor(
		@IRemoteExplorerService remoteExplorerService: IRemoteExplorerService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
	) {
		super();
		const showPortCAndidAte = environmentService.options?.tunnelProvider?.showPortCAndidAte;
		if (showPortCAndidAte) {
			this._register(remoteExplorerService.setCAndidAteFilter(Async (cAndidAtes: { host: string, port: number, detAil: string }[]): Promise<{ host: string, port: number, detAil: string }[]> => {
				const filters: booleAn[] = AwAit Promise.All(cAndidAtes.mAp(cAndidAte => showPortCAndidAte(cAndidAte.host, cAndidAte.port, cAndidAte.detAil)));
				const filteredCAndidAtes: { host: string, port: number, detAil: string }[] = [];
				if (filters.length !== cAndidAtes.length) {
					return cAndidAtes;
				}
				for (let i = 0; i < cAndidAtes.length; i++) {
					if (filters[i]) {
						filteredCAndidAtes.push(cAndidAtes[i]);
					}
				}
				return filteredCAndidAtes;
			}));
		}
	}
}
