/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { ViewsWelcomeContribution } from 'vs/workbench/contrib/welcome/common/viewsWelcomeContribution';
import { ViewsWelcomeExtensionPoint, viewsWelcomeExtensionPointDescriptor } from 'vs/workbench/contrib/welcome/common/viewsWelcomeExtensionPoint';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';

const extensionPoint = ExtensionsRegistry.registerExtensionPoint<ViewsWelcomeExtensionPoint>(viewsWelcomeExtensionPointDescriptor);

clAss WorkbenchConfigurAtionContribution {
	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		instAntiAtionService.creAteInstAnce(ViewsWelcomeContribution, extensionPoint);
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WorkbenchConfigurAtionContribution, LifecyclePhAse.EventuAlly);
