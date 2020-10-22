/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/Base/common/Buffer';
import { UriComponents } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IRemoteConnectionData } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IWeBviewPortMapping } from 'vs/platform/weBview/common/weBviewPortMapping';

export const IWeBviewManagerService = createDecorator<IWeBviewManagerService>('weBviewManagerService');

export interface IWeBviewManagerService {
	_serviceBrand: unknown;

	registerWeBview(id: string, windowId: numBer, metadata: RegisterWeBviewMetadata): Promise<void>;
	unregisterWeBview(id: string): Promise<void>;
	updateWeBviewMetadata(id: string, metadataDelta: Partial<RegisterWeBviewMetadata>): Promise<void>;

	didLoadResource(requestId: numBer, content: VSBuffer | undefined): void;

	setIgnoreMenuShortcuts(weBContentsId: numBer, enaBled: Boolean): Promise<void>;
}

export interface RegisterWeBviewMetadata {
	readonly extensionLocation: UriComponents | undefined;
	readonly localResourceRoots: readonly UriComponents[];
	readonly remoteConnectionData: IRemoteConnectionData | null;
	readonly portMappings: readonly IWeBviewPortMapping[];
}
