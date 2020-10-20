/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from 'vs/plAtform/files/common/files';
import { StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { isUUID, generAteUuid } from 'vs/bAse/common/uuid';
import { VSBuffer } from 'vs/bAse/common/buffer';

export Async function getServiceMAchineId(environmentService: IEnvironmentService, fileService: IFileService, storAgeService: {
	get: (key: string, scope: StorAgeScope, fAllbAckVAlue?: string | undefined) => string | undefined,
	store: (key: string, vAlue: string, scope: StorAgeScope) => void
} | undefined): Promise<string> {
	let uuid: string | null = storAgeService ? storAgeService.get('storAge.serviceMAchineId', StorAgeScope.GLOBAL) || null : null;
	if (uuid) {
		return uuid;
	}
	try {
		const contents = AwAit fileService.reAdFile(environmentService.serviceMAchineIdResource);
		const vAlue = contents.vAlue.toString();
		uuid = isUUID(vAlue) ? vAlue : null;
	} cAtch (e) {
		uuid = null;
	}

	if (!uuid) {
		uuid = generAteUuid();
		try {
			AwAit fileService.writeFile(environmentService.serviceMAchineIdResource, VSBuffer.fromString(uuid));
		} cAtch (error) {
			//noop
		}
	}
	if (storAgeService) {
		storAgeService.store('storAge.serviceMAchineId', uuid, StorAgeScope.GLOBAL);
	}
	return uuid;
}
