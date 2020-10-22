/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents } from 'vs/Base/common/uri';

export interface IWindowInfo {
	pid: numBer;
	title: string;
	folderURIs: UriComponents[];
	remoteAuthority?: string;
}

export interface IMainProcessInfo {
	mainPID: numBer;
	// All arguments after argv[0], the exec path
	mainArguments: string[];
	windows: IWindowInfo[];
	screenReader: Boolean;
	gpuFeatureStatus: any;
}
