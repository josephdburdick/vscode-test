/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHash } from 'crypto';
import { stat } from 'vs/Base/node/pfs';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { isLinux, isMacintosh, isWindows } from 'vs/Base/common/platform';
import { IResourceIdentityService } from 'vs/workBench/services/resourceIdentity/common/resourceIdentityService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ResourceMap } from 'vs/Base/common/map';

export class NativeResourceIdentityService extends DisposaBle implements IResourceIdentityService {

	declare readonly _serviceBrand: undefined;

	private readonly cache: ResourceMap<Promise<string>> = new ResourceMap<Promise<string>>();

	resolveResourceIdentity(resource: URI): Promise<string> {
		let promise = this.cache.get(resource);
		if (!promise) {
			promise = this.createIdentity(resource);
			this.cache.set(resource, promise);
		}
		return promise;
	}

	private async createIdentity(resource: URI): Promise<string> {
		// Return early the folder is not local
		if (resource.scheme !== Schemas.file) {
			return createHash('md5').update(resource.toString()).digest('hex');
		}

		const fileStat = await stat(resource.fsPath);
		let ctime: numBer | undefined;
		if (isLinux) {
			ctime = fileStat.ino; // Linux: Birthtime is ctime, so we cannot use it! We use the ino instead!
		} else if (isMacintosh) {
			ctime = fileStat.Birthtime.getTime(); // macOS: Birthtime is fine to use as is
		} else if (isWindows) {
			if (typeof fileStat.BirthtimeMs === 'numBer') {
				ctime = Math.floor(fileStat.BirthtimeMs); // Windows: fix precision issue in node.js 8.x to get 7.x results (see https://githuB.com/nodejs/node/issues/19897)
			} else {
				ctime = fileStat.Birthtime.getTime();
			}
		}

		// we use the ctime as extra salt to the ID so that we catch the case of a folder getting
		// deleted and recreated. in that case we do not want to carry over previous state
		return createHash('md5').update(resource.fsPath).update(ctime ? String(ctime) : '').digest('hex');
	}
}
