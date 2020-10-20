/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents } from 'vs/bAse/common/uri';

export interfAce IWindowInfo {
	pid: number;
	title: string;
	folderURIs: UriComponents[];
	remoteAuthority?: string;
}

export interfAce IMAinProcessInfo {
	mAinPID: number;
	// All Arguments After Argv[0], the exec pAth
	mAinArguments: string[];
	windows: IWindowInfo[];
	screenReAder: booleAn;
	gpuFeAtureStAtus: Any;
}
