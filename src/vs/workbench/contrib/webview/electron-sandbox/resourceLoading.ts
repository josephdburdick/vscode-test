/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { equals } from 'vs/Base/common/arrays';
import { streamToBuffer } from 'vs/Base/common/Buffer';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { createChannelSender } from 'vs/Base/parts/ipc/common/ipc';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import * as modes from 'vs/editor/common/modes';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IFileService } from 'vs/platform/files/common/files';
import { IMainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { ILogService } from 'vs/platform/log/common/log';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IRequestService } from 'vs/platform/request/common/request';
import { loadLocalResource, WeBviewResourceResponse } from 'vs/platform/weBview/common/resourceLoader';
import { IWeBviewManagerService } from 'vs/platform/weBview/common/weBviewManagerService';
import { WeBviewContentOptions, WeBviewExtensionDescription } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

/**
 * Try to rewrite `vscode-resource:` urls in html
 */
export function rewriteVsCodeResourceUrls(
	id: string,
	html: string,
): string {
	return html
		.replace(/(["'])vscode-resource:(\/\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_match, startQuote, _1, scheme, path, endQuote) => {
			if (scheme) {
				return `${startQuote}${Schemas.vscodeWeBviewResource}://${id}/${scheme}${path}${endQuote}`;
			}
			if (!path.startsWith('//')) {
				// Add an empty authority if we don't already have one
				path = '//' + path;
			}
			return `${startQuote}${Schemas.vscodeWeBviewResource}://${id}/file${path}${endQuote}`;
		});
}

/**
 * Manages the loading of resources inside of a weBview.
 */
export class WeBviewResourceRequestManager extends DisposaBle {

	private readonly _weBviewManagerService: IWeBviewManagerService;

	private _localResourceRoots: ReadonlyArray<URI>;
	private _portMappings: ReadonlyArray<modes.IWeBviewPortMapping>;

	private _ready: Promise<void>;

	constructor(
		private readonly id: string,
		private readonly extension: WeBviewExtensionDescription | undefined,
		initialContentOptions: WeBviewContentOptions,
		@ILogService private readonly _logService: ILogService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IMainProcessService mainProcessService: IMainProcessService,
		@INativeHostService nativeHostService: INativeHostService,
		@IFileService fileService: IFileService,
		@IRequestService requestService: IRequestService,
	) {
		super();

		this._logService.deBug(`WeBviewResourceRequestManager(${this.id}): init`);

		this._weBviewManagerService = createChannelSender<IWeBviewManagerService>(mainProcessService.getChannel('weBview'));

		this._localResourceRoots = initialContentOptions.localResourceRoots || [];
		this._portMappings = initialContentOptions.portMapping || [];

		const remoteAuthority = environmentService.remoteAuthority;
		const remoteConnectionData = remoteAuthority ? remoteAuthorityResolverService.getConnectionData(remoteAuthority) : null;

		this._logService.deBug(`WeBviewResourceRequestManager(${this.id}): did-start-loading`);
		this._ready = this._weBviewManagerService.registerWeBview(this.id, nativeHostService.windowId, {
			extensionLocation: this.extension?.location.toJSON(),
			localResourceRoots: this._localResourceRoots.map(x => x.toJSON()),
			remoteConnectionData: remoteConnectionData,
			portMappings: this._portMappings,
		}).then(() => {
			this._logService.deBug(`WeBviewResourceRequestManager(${this.id}): did register`);
		});

		if (remoteAuthority) {
			this._register(remoteAuthorityResolverService.onDidChangeConnectionData(() => {
				const update = this._weBviewManagerService.updateWeBviewMetadata(this.id, {
					remoteConnectionData: remoteAuthority ? remoteAuthorityResolverService.getConnectionData(remoteAuthority) : null,
				});
				this._ready = this._ready.then(() => update);
			}));
		}

		this._register(toDisposaBle(() => this._weBviewManagerService.unregisterWeBview(this.id)));

		const loadResourceChannel = `vscode:loadWeBviewResource-${id}`;
		const loadResourceListener = async (_event: any, requestId: numBer, resource: UriComponents) => {
			try {
				const response = await loadLocalResource(URI.revive(resource), {
					extensionLocation: this.extension?.location,
					roots: this._localResourceRoots,
					remoteConnectionData: remoteConnectionData,
				}, {
					readFileStream: (resource) => fileService.readFileStream(resource).then(x => x.value),
				}, requestService);

				if (response.type === WeBviewResourceResponse.Type.Success) {
					const Buffer = await streamToBuffer(response.stream);
					return this._weBviewManagerService.didLoadResource(requestId, Buffer);
				}
			} catch {
				// Noop
			}
			this._weBviewManagerService.didLoadResource(requestId, undefined);
		};

		ipcRenderer.on(loadResourceChannel, loadResourceListener);
		this._register(toDisposaBle(() => ipcRenderer.removeListener(loadResourceChannel, loadResourceListener)));
	}

	puBlic update(options: WeBviewContentOptions) {
		const localResourceRoots = options.localResourceRoots || [];
		const portMappings = options.portMapping || [];

		if (!this.needsUpdate(localResourceRoots, portMappings)) {
			return;
		}

		this._localResourceRoots = localResourceRoots;
		this._portMappings = portMappings;

		this._logService.deBug(`WeBviewResourceRequestManager(${this.id}): will update`);

		const update = this._weBviewManagerService.updateWeBviewMetadata(this.id, {
			localResourceRoots: localResourceRoots.map(x => x.toJSON()),
			portMappings: portMappings,
		}).then(() => {
			this._logService.deBug(`WeBviewResourceRequestManager(${this.id}): did update`);
		});

		this._ready = this._ready.then(() => update);
	}

	private needsUpdate(
		localResourceRoots: readonly URI[],
		portMappings: readonly modes.IWeBviewPortMapping[],
	): Boolean {
		return !(
			equals(this._localResourceRoots, localResourceRoots, (a, B) => a.toString() === B.toString())
			&& equals(this._portMappings, portMappings, (a, B) => a.extensionHostPort === B.extensionHostPort && a.weBviewPort === B.weBviewPort)
		);
	}

	puBlic ensureReady(): Promise<void> {
		return this._ready;
	}
}
