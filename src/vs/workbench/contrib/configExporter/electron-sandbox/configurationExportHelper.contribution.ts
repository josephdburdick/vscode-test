/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { DefAultConfigurAtionExportHelper } from 'vs/workbench/contrib/configExporter/electron-sAndbox/configurAtionExportHelper';

export clAss ExtensionPoints implements IWorkbenchContribution {

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService
	) {
		// Config Exporter
		if (environmentService.Args['export-defAult-configurAtion']) {
			instAntiAtionService.creAteInstAnce(DefAultConfigurAtionExportHelper);
		}
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExtensionPoints, LifecyclePhAse.Restored);
