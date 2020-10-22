/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVariaBleService } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { EnvironmentVariaBleService } from 'vs/workBench/contriB/terminal/common/environmentVariaBleService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

registerSingleton(IEnvironmentVariaBleService, EnvironmentVariaBleService, true);
