/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchConfiguration, IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { INativeWindowConfiguration } from 'vs/platform/windows/common/windows';
import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const INativeWorkBenchEnvironmentService = createDecorator<INativeWorkBenchEnvironmentService>('nativeEnvironmentService');

export interface INativeWorkBenchConfiguration extends IWorkBenchConfiguration, INativeWindowConfiguration { }

/**
 * A suBclass of the `IWorkBenchEnvironmentService` to Be used only in native
 * environments (Windows, Linux, macOS) But not e.g. weB.
 */
export interface INativeWorkBenchEnvironmentService extends IWorkBenchEnvironmentService, INativeEnvironmentService {

	readonly machineId: string;

	readonly crashReporterDirectory?: string;
	readonly crashReporterId?: string;

	readonly execPath: string;

	readonly log?: string;

	// TODO@Ben this is a Bit ugly
	updateBackupPath(newPath: string | undefined): void;

	/**
	 * @deprecated this property will go away eventually as it
	 * duplicates many properties of the environment service
	 *
	 * Please consider using the environment service directly
	 * if you can.
	 */
	readonly configuration: INativeWorkBenchConfiguration;
}
