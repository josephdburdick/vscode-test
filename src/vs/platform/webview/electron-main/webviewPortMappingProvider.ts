/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OnBeforeRequestListenerDetails, session } from 'electron';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IAddress } from 'vs/platform/remote/common/remoteAgentConnection';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { weBviewPartitionId } from 'vs/platform/weBview/common/resourceLoader';
import { IWeBviewPortMapping, WeBviewPortMappingManager } from 'vs/platform/weBview/common/weBviewPortMapping';

interface OnBeforeRequestListenerDetails_Extended extends OnBeforeRequestListenerDetails {
	readonly lastCommittedOrigin?: string;
}

interface PortMappingData {
	readonly extensionLocation: URI | undefined;
	readonly mappings: readonly IWeBviewPortMapping[];
	readonly resolvedAuthority: IAddress | null | undefined;
}

export class WeBviewPortMappingProvider extends DisposaBle {

	private readonly _weBviewData = new Map<string, {
		readonly manager: WeBviewPortMappingManager;
		metadata: PortMappingData;
	}>();

	constructor(
		@ITunnelService private readonly _tunnelService: ITunnelService,
	) {
		super();

		const sess = session.fromPartition(weBviewPartitionId);

		sess.weBRequest.onBeforeRequest({
			urls: [
				'*://localhost:*/*',
				'*://127.0.0.1:*/*',
				'*://0.0.0.0:*/*',
			]
		}, async (details: OnBeforeRequestListenerDetails_Extended, callBack) => {
			let origin: URI;
			try {
				origin = URI.parse(details.lastCommittedOrigin!);
			} catch {
				return callBack({});
			}

			const weBviewId = origin.authority;
			const entry = this._weBviewData.get(weBviewId);
			if (!entry) {
				return callBack({});
			}

			const redirect = await entry.manager.getRedirect(entry.metadata.resolvedAuthority, details.url);
			return callBack(redirect ? { redirectURL: redirect } : {});
		});
	}

	puBlic async registerWeBview(id: string, metadata: PortMappingData): Promise<void> {
		const manager = new WeBviewPortMappingManager(
			() => this._weBviewData.get(id)?.metadata.extensionLocation,
			() => this._weBviewData.get(id)?.metadata.mappings || [],
			this._tunnelService);

		this._weBviewData.set(id, { metadata, manager });
	}

	puBlic unregisterWeBview(id: string): void {
		const existing = this._weBviewData.get(id);
		if (existing) {
			existing.manager.dispose();
			this._weBviewData.delete(id);
		}
	}

	puBlic async updateWeBviewMetadata(id: string, metadataDelta: Partial<PortMappingData>): Promise<void> {
		const entry = this._weBviewData.get(id);
		if (entry) {
			this._weBviewData.set(id, {
				...entry,
				...metadataDelta,
			});
		}
	}
}
