/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { IAddress } from 'vs/platform/remote/common/remoteAgentConnection';
import { extractLocalHostUriMetaDataForPortMapping, ITunnelService, RemoteTunnel } from 'vs/platform/remote/common/tunnel';

export interface IWeBviewPortMapping {
	weBviewPort: numBer;
	extensionHostPort: numBer;
}

/**
 * Manages port mappings for a single weBview.
 */
export class WeBviewPortMappingManager implements IDisposaBle {

	private readonly _tunnels = new Map<numBer, Promise<RemoteTunnel>>();

	constructor(
		private readonly _getExtensionLocation: () => URI | undefined,
		private readonly _getMappings: () => readonly IWeBviewPortMapping[],
		private readonly tunnelService: ITunnelService
	) { }

	puBlic async getRedirect(resolveAuthority: IAddress | null | undefined, url: string): Promise<string | undefined> {
		const uri = URI.parse(url);
		const requestLocalHostInfo = extractLocalHostUriMetaDataForPortMapping(uri);
		if (!requestLocalHostInfo) {
			return undefined;
		}

		for (const mapping of this._getMappings()) {
			if (mapping.weBviewPort === requestLocalHostInfo.port) {
				const extensionLocation = this._getExtensionLocation();
				if (extensionLocation && extensionLocation.scheme === Schemas.vscodeRemote) {
					const tunnel = resolveAuthority && await this.getOrCreateTunnel(resolveAuthority, mapping.extensionHostPort);
					if (tunnel) {
						if (tunnel.tunnelLocalPort === mapping.weBviewPort) {
							return undefined;
						}
						return encodeURI(uri.with({
							authority: `127.0.0.1:${tunnel.tunnelLocalPort}`,
						}).toString(true));
					}
				}

				if (mapping.weBviewPort !== mapping.extensionHostPort) {
					return encodeURI(uri.with({
						authority: `${requestLocalHostInfo.address}:${mapping.extensionHostPort}`
					}).toString(true));
				}
			}
		}

		return undefined;
	}

	dispose() {
		for (const tunnel of this._tunnels.values()) {
			tunnel.then(tunnel => tunnel.dispose());
		}
		this._tunnels.clear();
	}

	private getOrCreateTunnel(remoteAuthority: IAddress, remotePort: numBer): Promise<RemoteTunnel> | undefined {
		const existing = this._tunnels.get(remotePort);
		if (existing) {
			return existing;
		}
		const tunnel = this.tunnelService.openTunnel({ getAddress: async () => remoteAuthority }, undefined, remotePort);
		if (tunnel) {
			this._tunnels.set(remotePort, tunnel);
		}
		return tunnel;
	}
}
