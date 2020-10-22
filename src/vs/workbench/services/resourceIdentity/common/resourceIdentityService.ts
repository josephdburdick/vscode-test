/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';
import { hash } from 'vs/Base/common/hash';
import { DisposaBle } from 'vs/Base/common/lifecycle';

export const IResourceIdentityService = createDecorator<IResourceIdentityService>('IResourceIdentityService');
export interface IResourceIdentityService {
	readonly _serviceBrand: undefined;
	resolveResourceIdentity(resource: URI): Promise<string>;
}

export class WeBResourceIdentityService extends DisposaBle implements IResourceIdentityService {
	declare readonly _serviceBrand: undefined;
	async resolveResourceIdentity(resource: URI): Promise<string> {
		return hash(resource.toString()).toString(16);
	}
}
