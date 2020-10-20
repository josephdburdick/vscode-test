/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { BrowserTelemetryOptOut } from 'vs/workbench/contrib/welcome/telemetryOptOut/browser/telemetryOptOut';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BrowserTelemetryOptOut, LifecyclePhAse.EventuAlly);
