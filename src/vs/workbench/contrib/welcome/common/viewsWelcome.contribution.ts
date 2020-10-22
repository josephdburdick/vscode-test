/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { ViewsWelcomeContriBution } from 'vs/workBench/contriB/welcome/common/viewsWelcomeContriBution';
import { ViewsWelcomeExtensionPoint, viewsWelcomeExtensionPointDescriptor } from 'vs/workBench/contriB/welcome/common/viewsWelcomeExtensionPoint';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';

const extensionPoint = ExtensionsRegistry.registerExtensionPoint<ViewsWelcomeExtensionPoint>(viewsWelcomeExtensionPointDescriptor);

class WorkBenchConfigurationContriBution {
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		instantiationService.createInstance(ViewsWelcomeContriBution, extensionPoint);
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(WorkBenchConfigurationContriBution, LifecyclePhase.Eventually);
