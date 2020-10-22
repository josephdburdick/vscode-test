/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export class ExternalUriResolverContriBution extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@IOpenerService _openerService: IOpenerService,
		@IWorkBenchEnvironmentService _workBenchEnvironmentService: IWorkBenchEnvironmentService,
	) {
		super();

		if (_workBenchEnvironmentService.options && _workBenchEnvironmentService.options.resolveExternalUri) {
			this._register(_openerService.registerExternalUriResolver({
				resolveExternalUri: async (resource) => {
					return {
						resolved: await _workBenchEnvironmentService.options!.resolveExternalUri!(resource),
						dispose: () => {
							// TODO
						}
					};
				}
			}));
		}
	}
}
