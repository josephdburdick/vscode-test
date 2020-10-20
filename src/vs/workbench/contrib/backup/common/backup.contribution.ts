/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { BAckupRestorer } from 'vs/workbench/contrib/bAckup/common/bAckupRestorer';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';

// Register BAckup Restorer
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BAckupRestorer, LifecyclePhAse.StArting);
