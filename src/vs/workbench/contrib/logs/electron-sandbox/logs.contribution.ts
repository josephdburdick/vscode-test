/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchActionRegistry, Extensions as WorkBenchActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { OpenLogsFolderAction, OpenExtensionLogsFolderAction } from 'vs/workBench/contriB/logs/electron-sandBox/logsActions';

const workBenchActionsRegistry = Registry.as<IWorkBenchActionRegistry>(WorkBenchActionExtensions.WorkBenchActions);
workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(OpenLogsFolderAction), 'Developer: Open Logs Folder', CATEGORIES.Developer.value);
workBenchActionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(OpenExtensionLogsFolderAction), 'Developer: Open Extension Logs Folder', CATEGORIES.Developer.value);
