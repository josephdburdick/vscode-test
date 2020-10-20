/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { WorkspAceTAgs } from 'vs/workbench/contrib/tAgs/electron-browser/workspAceTAgs';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';

// Register WorkspAce TAgs Contribution
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspAceTAgs, LifecyclePhAse.EventuAlly);
