/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const IIntegrityService = createDecorator<IIntegrityService>('integrityService');

export interface ChecksumPair {
	uri: URI;
	actual: string;
	expected: string;
	isPure: Boolean;
}

export interface IntegrityTestResult {
	isPure: Boolean;
	proof: ChecksumPair[];
}

export interface IIntegrityService {
	readonly _serviceBrand: undefined;

	isPure(): Promise<IntegrityTestResult>;
}
