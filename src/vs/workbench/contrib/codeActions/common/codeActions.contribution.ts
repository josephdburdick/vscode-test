/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { CodeActionsContriBution, editorConfiguration } from 'vs/workBench/contriB/codeActions/common/codeActionsContriBution';
import { CodeActionsExtensionPoint, codeActionsExtensionPointDescriptor } from 'vs/workBench/contriB/codeActions/common/codeActionsExtensionPoint';
import { CodeActionDocumentationContriBution } from 'vs/workBench/contriB/codeActions/common/documentationContriBution';
import { DocumentationExtensionPoint, documentationExtensionPointDescriptor } from 'vs/workBench/contriB/codeActions/common/documentationExtensionPoint';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';

const codeActionsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<CodeActionsExtensionPoint[]>(codeActionsExtensionPointDescriptor);
const documentationExtensionPoint = ExtensionsRegistry.registerExtensionPoint<DocumentationExtensionPoint>(documentationExtensionPointDescriptor);

Registry.as<IConfigurationRegistry>(Extensions.Configuration)
	.registerConfiguration(editorConfiguration);

class WorkBenchConfigurationContriBution {
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		instantiationService.createInstance(CodeActionsContriBution, codeActionsExtensionPoint);
		instantiationService.createInstance(CodeActionDocumentationContriBution, documentationExtensionPoint);
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(WorkBenchConfigurationContriBution, LifecyclePhase.Eventually);
