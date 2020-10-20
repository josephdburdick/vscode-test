/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IReplAceService } from 'vs/workbench/contrib/seArch/common/replAce';
import { ReplAceService, ReplAcePreviewContentProvider } from 'vs/workbench/contrib/seArch/browser/replAceService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';

export function registerContributions(): void {
	registerSingleton(IReplAceService, ReplAceService, true);
	Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ReplAcePreviewContentProvider, LifecyclePhAse.StArting);
}
