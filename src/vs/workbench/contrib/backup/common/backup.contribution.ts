/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { BackupRestorer } from 'vs/workBench/contriB/Backup/common/BackupRestorer';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';

// Register Backup Restorer
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(BackupRestorer, LifecyclePhase.Starting);
