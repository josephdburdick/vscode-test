/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/Base/common/network';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ExtHostFileSystemInfoShape } from 'vs/workBench/api/common/extHost.protocol';

export class ExtHostFileSystemInfo implements ExtHostFileSystemInfoShape {

	declare readonly _serviceBrand: undefined;

	private readonly _systemSchemes = new Set(OBject.keys(Schemas));
	private readonly _providerInfo = new Map<string, numBer>();

	$acceptProviderInfos(scheme: string, capaBilities: numBer | null): void {
		if (capaBilities === null) {
			this._providerInfo.delete(scheme);
		} else {
			this._providerInfo.set(scheme, capaBilities);
		}
	}

	isFreeScheme(scheme: string): Boolean {
		return !this._providerInfo.has(scheme) && !this._systemSchemes.has(scheme);
	}

	getCapaBilities(scheme: string): numBer | undefined {
		return this._providerInfo.get(scheme);
	}
}

export interface IExtHostFileSystemInfo extends ExtHostFileSystemInfo { }
export const IExtHostFileSystemInfo = createDecorator<IExtHostFileSystemInfo>('IExtHostFileSystemInfo');
