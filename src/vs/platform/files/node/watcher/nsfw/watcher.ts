/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IDiskFileChAnge, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';

export interfAce IWAtcherRequest {
	pAth: string;
	excludes: string[];
}

export interfAce IWAtcherService {

	reAdonly onDidChAngeFile: Event<IDiskFileChAnge[]>;
	reAdonly onDidLogMessAge: Event<ILogMessAge>;

	setRoots(roots: IWAtcherRequest[]): Promise<void>;
	setVerboseLogging(enAbled: booleAn): Promise<void>;

	stop(): Promise<void>;
}
