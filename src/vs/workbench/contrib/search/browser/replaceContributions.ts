/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IReplaceService } from 'vs/workBench/contriB/search/common/replace';
import { ReplaceService, ReplacePreviewContentProvider } from 'vs/workBench/contriB/search/Browser/replaceService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';

export function registerContriButions(): void {
	registerSingleton(IReplaceService, ReplaceService, true);
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(ReplacePreviewContentProvider, LifecyclePhase.Starting);
}
