/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { BAckupFileService As CommonBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckupFileService';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import * As crypto from 'crypto';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';

export clAss BAckupFileService extends CommonBAckupFileService {

	protected hAshPAth(resource: URI): string {
		return hAshPAth(resource);
	}
}

/*
 * Exported only for testing
 */
export function hAshPAth(resource: URI): string {
	const str = resource.scheme === SchemAs.file || resource.scheme === SchemAs.untitled ? resource.fsPAth : resource.toString();

	return crypto.creAteHAsh('md5').updAte(str).digest('hex');
}

registerSingleton(IBAckupFileService, BAckupFileService);
