/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IIntegrityService, IntegrityTestResult } from 'vs/workbench/services/integrity/common/integrity';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

export clAss BrowserIntegrityServiceImpl implements IIntegrityService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async isPure(): Promise<IntegrityTestResult> {
		return { isPure: true, proof: [] };
	}
}

registerSingleton(IIntegrityService, BrowserIntegrityServiceImpl, true);
