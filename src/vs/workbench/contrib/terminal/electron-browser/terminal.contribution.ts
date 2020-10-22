/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ITerminalInstanceService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { TerminalInstanceService } from 'vs/workBench/contriB/terminal/electron-Browser/terminalInstanceService';
import { getSystemShell } from 'vs/workBench/contriB/terminal/node/terminal';
import { TerminalNativeContriBution } from 'vs/workBench/contriB/terminal/electron-Browser/terminalNativeContriBution';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions } from 'vs/platform/configuration/common/configurationRegistry';
import { getTerminalShellConfiguration } from 'vs/workBench/contriB/terminal/common/terminalConfiguration';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';

// This file contains additional desktop-only contriButions on top of those in Browser/

// Register services
registerSingleton(ITerminalInstanceService, TerminalInstanceService, true);

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(TerminalNativeContriBution, LifecyclePhase.Ready);

// Register configurations
const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
configurationRegistry.registerConfiguration(getTerminalShellConfiguration(getSystemShell));
