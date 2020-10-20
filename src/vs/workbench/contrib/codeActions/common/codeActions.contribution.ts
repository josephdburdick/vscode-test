/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Extensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { CodeActionsContribution, editorConfigurAtion } from 'vs/workbench/contrib/codeActions/common/codeActionsContribution';
import { CodeActionsExtensionPoint, codeActionsExtensionPointDescriptor } from 'vs/workbench/contrib/codeActions/common/codeActionsExtensionPoint';
import { CodeActionDocumentAtionContribution } from 'vs/workbench/contrib/codeActions/common/documentAtionContribution';
import { DocumentAtionExtensionPoint, documentAtionExtensionPointDescriptor } from 'vs/workbench/contrib/codeActions/common/documentAtionExtensionPoint';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';

const codeActionsExtensionPoint = ExtensionsRegistry.registerExtensionPoint<CodeActionsExtensionPoint[]>(codeActionsExtensionPointDescriptor);
const documentAtionExtensionPoint = ExtensionsRegistry.registerExtensionPoint<DocumentAtionExtensionPoint>(documentAtionExtensionPointDescriptor);

Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion)
	.registerConfigurAtion(editorConfigurAtion);

clAss WorkbenchConfigurAtionContribution {
	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		instAntiAtionService.creAteInstAnce(CodeActionsContribution, codeActionsExtensionPoint);
		instAntiAtionService.creAteInstAnce(CodeActionDocumentAtionContribution, documentAtionExtensionPoint);
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WorkbenchConfigurAtionContribution, LifecyclePhAse.EventuAlly);
