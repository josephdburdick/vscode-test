/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { StartupProfiler } from './startupProfiler';
import { StartupTimings } from './startupTimings';

// -- startup profiler

Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench).registerWorkBenchContriBution(
	StartupProfiler,
	LifecyclePhase.Restored
);

// -- startup timings

Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench).registerWorkBenchContriBution(
	StartupTimings,
	LifecyclePhase.Eventually
);
