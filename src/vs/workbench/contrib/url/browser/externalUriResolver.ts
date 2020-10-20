/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

export clAss ExternAlUriResolverContribution extends DisposAble implements IWorkbenchContribution {
	constructor(
		@IOpenerService _openerService: IOpenerService,
		@IWorkbenchEnvironmentService _workbenchEnvironmentService: IWorkbenchEnvironmentService,
	) {
		super();

		if (_workbenchEnvironmentService.options && _workbenchEnvironmentService.options.resolveExternAlUri) {
			this._register(_openerService.registerExternAlUriResolver({
				resolveExternAlUri: Async (resource) => {
					return {
						resolved: AwAit _workbenchEnvironmentService.options!.resolveExternAlUri!(resource),
						dispose: () => {
							// TODO
						}
					};
				}
			}));
		}
	}
}
