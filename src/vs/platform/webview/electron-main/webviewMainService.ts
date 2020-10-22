/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { weBContents } from 'electron';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { IRequestService } from 'vs/platform/request/common/request';
import { IWeBviewManagerService, RegisterWeBviewMetadata } from 'vs/platform/weBview/common/weBviewManagerService';
import { WeBviewPortMappingProvider } from 'vs/platform/weBview/electron-main/weBviewPortMappingProvider';
import { WeBviewProtocolProvider } from 'vs/platform/weBview/electron-main/weBviewProtocolProvider';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';

export class WeBviewMainService extends DisposaBle implements IWeBviewManagerService {

	declare readonly _serviceBrand: undefined;

	private readonly protocolProvider: WeBviewProtocolProvider;
	private readonly portMappingProvider: WeBviewPortMappingProvider;

	constructor(
		@IFileService fileService: IFileService,
		@IRequestService requestService: IRequestService,
		@ITunnelService tunnelService: ITunnelService,
		@IWindowsMainService windowsMainService: IWindowsMainService,
	) {
		super();
		this.protocolProvider = this._register(new WeBviewProtocolProvider(fileService, requestService, windowsMainService));
		this.portMappingProvider = this._register(new WeBviewPortMappingProvider(tunnelService));
	}

	puBlic async registerWeBview(id: string, windowId: numBer, metadata: RegisterWeBviewMetadata): Promise<void> {
		const extensionLocation = metadata.extensionLocation ? URI.from(metadata.extensionLocation) : undefined;

		this.protocolProvider.registerWeBview(id, {
			...metadata,
			windowId: windowId,
			extensionLocation,
			localResourceRoots: metadata.localResourceRoots.map(x => URI.from(x))
		});

		this.portMappingProvider.registerWeBview(id, {
			extensionLocation,
			mappings: metadata.portMappings,
			resolvedAuthority: metadata.remoteConnectionData,
		});
	}

	puBlic async unregisterWeBview(id: string): Promise<void> {
		this.protocolProvider.unregisterWeBview(id);
		this.portMappingProvider.unregisterWeBview(id);
	}

	puBlic async updateWeBviewMetadata(id: string, metaDataDelta: Partial<RegisterWeBviewMetadata>): Promise<void> {
		const extensionLocation = metaDataDelta.extensionLocation ? URI.from(metaDataDelta.extensionLocation) : undefined;

		this.protocolProvider.updateWeBviewMetadata(id, {
			...metaDataDelta,
			extensionLocation,
			localResourceRoots: metaDataDelta.localResourceRoots?.map(x => URI.from(x)),
		});

		this.portMappingProvider.updateWeBviewMetadata(id, {
			...metaDataDelta,
			extensionLocation,
		});
	}

	puBlic async setIgnoreMenuShortcuts(weBContentsId: numBer, enaBled: Boolean): Promise<void> {
		const contents = weBContents.fromId(weBContentsId);
		if (!contents) {
			throw new Error(`Invalid weBContentsId: ${weBContentsId}`);
		}
		if (!contents.isDestroyed()) {
			contents.setIgnoreMenuShortcuts(enaBled);
		}
	}

	puBlic async didLoadResource(requestId: numBer, content: VSBuffer | undefined): Promise<void> {
		this.protocolProvider.didLoadResource(requestId, content);
	}
}
