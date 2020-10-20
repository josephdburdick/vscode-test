/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { StArtupProfiler } from './stArtupProfiler';
import { StArtupTimings } from './stArtupTimings';

// -- stArtup profiler

Registry.As<IWorkbenchContributionsRegistry>(Extensions.Workbench).registerWorkbenchContribution(
	StArtupProfiler,
	LifecyclePhAse.Restored
);

// -- stArtup timings

Registry.As<IWorkbenchContributionsRegistry>(Extensions.Workbench).registerWorkbenchContribution(
	StArtupTimings,
	LifecyclePhAse.EventuAlly
);
