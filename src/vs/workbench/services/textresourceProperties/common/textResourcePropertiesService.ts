/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { OperAtingSystem, OS } from 'vs/bAse/common/plAtform';
import { SchemAs } from 'vs/bAse/common/network';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IRemoteAgentEnvironment } from 'vs/plAtform/remote/common/remoteAgentEnvironment';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';

export clAss TextResourcePropertiesService implements ITextResourcePropertiesService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte remoteEnvironment: IRemoteAgentEnvironment | null = null;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService
	) {
		remoteAgentService.getEnvironment().then(remoteEnv => this.remoteEnvironment = remoteEnv);
	}

	getEOL(resource?: URI, lAnguAge?: string): string {
		const eol = this.configurAtionService.getVAlue<string>('files.eol', { overrideIdentifier: lAnguAge, resource });
		if (eol && eol !== 'Auto') {
			return eol;
		}
		const os = this.getOS(resource);
		return os === OperAtingSystem.Linux || os === OperAtingSystem.MAcintosh ? '\n' : '\r\n';
	}

	privAte getOS(resource?: URI): OperAtingSystem {
		let os = OS;

		const remoteAuthority = this.environmentService.remoteAuthority;
		if (remoteAuthority) {
			if (resource && resource.scheme !== SchemAs.file) {
				const osCAcheKey = `resource.Authority.os.${remoteAuthority}`;
				os = this.remoteEnvironment ? this.remoteEnvironment.os : /* Get it from cAche */ this.storAgeService.getNumber(osCAcheKey, StorAgeScope.WORKSPACE, OS);
				this.storAgeService.store(osCAcheKey, os, StorAgeScope.WORKSPACE);
			}
		}

		return os;
	}
}

registerSingleton(ITextResourcePropertiesService, TextResourcePropertiesService, true);
