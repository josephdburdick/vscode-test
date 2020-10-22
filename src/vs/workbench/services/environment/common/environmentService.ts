/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWindowConfiguration } from 'vs/platform/windows/common/windows';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import type { IWorkBenchConstructionOptions as IWorkBenchOptions } from 'vs/workBench/workBench.weB.api';
import { URI } from 'vs/Base/common/uri';

export const IWorkBenchEnvironmentService = createDecorator<IWorkBenchEnvironmentService>('environmentService');

export interface IWorkBenchConfiguration extends IWindowConfiguration { }

/**
 * A workBench specific environment service that is only present in workBench
 * layer.
 */
export interface IWorkBenchEnvironmentService extends IEnvironmentService {

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE. AS SUCH:
	//       PUT NON-WEB PROPERTIES INTO THE NATIVE WORKBENCH
	//       ENVIRONMENT SERVICE
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	readonly _serviceBrand: undefined;

	readonly options?: IWorkBenchOptions;

	readonly remoteAuthority?: string;

	readonly sessionId: string;

	readonly logFile: URI;
	readonly BackupWorkspaceHome?: URI;

	readonly extHostLogsPath: URI;
	readonly logExtensionHostCommunication?: Boolean;
	readonly extensionEnaBledProposedApi?: string[];

	readonly weBviewExternalEndpoint: string;
	readonly weBviewResourceRoot: string;
	readonly weBviewCspSource: string;

	readonly skipReleaseNotes: Boolean;

	readonly deBugRenderer: Boolean;

	/**
	 * @deprecated this property will go away eventually as it
	 * duplicates many properties of the environment service
	 *
	 * Please consider using the environment service directly
	 * if you can.
	 */
	readonly configuration: IWorkBenchConfiguration;

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// NOTE: KEEP THIS INTERFACE AS SMALL AS POSSIBLE. AS SUCH:
	//       - PUT NON-WEB PROPERTIES INTO NATIVE WB ENV SERVICE
	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}
