/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { BrowserBAckupTrAcker } from 'vs/workbench/contrib/bAckup/browser/bAckupTrAcker';

// Register BAckup TrAcker
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BrowserBAckupTrAcker, LifecyclePhAse.StArting);
