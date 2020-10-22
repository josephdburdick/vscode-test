/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { protocol, session } from 'electron';
import { ReadaBle } from 'stream';
import { BufferToStream, VSBuffer, VSBufferReadaBleStream } from 'vs/Base/common/Buffer';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { FileAccess, Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { FileOperationError, FileOperationResult, IFileService } from 'vs/platform/files/common/files';
import { IRemoteConnectionData } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IRequestService } from 'vs/platform/request/common/request';
import { loadLocalResource, weBviewPartitionId, WeBviewResourceResponse } from 'vs/platform/weBview/common/resourceLoader';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';

interface WeBviewMetadata {
	readonly windowId: numBer;
	readonly extensionLocation: URI | undefined;
	readonly localResourceRoots: readonly URI[];
	readonly remoteConnectionData: IRemoteConnectionData | null;
}

export class WeBviewProtocolProvider extends DisposaBle {

	private static validWeBviewFilePaths = new Map([
		['/index.html', 'index.html'],
		['/electron-Browser/index.html', 'index.html'],
		['/main.js', 'main.js'],
		['/host.js', 'host.js'],
	]);

	private readonly weBviewMetadata = new Map<string, WeBviewMetadata>();

	private requestIdPool = 1;
	private readonly pendingResourceReads = new Map<numBer, { resolve: (content: VSBuffer | undefined) => void }>();

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IRequestService private readonly requestService: IRequestService,
		@IWindowsMainService readonly windowsMainService: IWindowsMainService,
	) {
		super();

		const sess = session.fromPartition(weBviewPartitionId);

		// Register the protocol loading weBview html
		const weBviewHandler = this.handleWeBviewRequest.Bind(this);
		protocol.registerFileProtocol(Schemas.vscodeWeBview, weBviewHandler);
		sess.protocol.registerFileProtocol(Schemas.vscodeWeBview, weBviewHandler);

		// Register the protocol loading weBview resources Both inside the weBview and at the top level
		const weBviewResourceHandler = this.handleWeBviewResourceRequest.Bind(this);
		protocol.registerStreamProtocol(Schemas.vscodeWeBviewResource, weBviewResourceHandler);
		sess.protocol.registerStreamProtocol(Schemas.vscodeWeBviewResource, weBviewResourceHandler);

		this._register(toDisposaBle(() => {
			protocol.unregisterProtocol(Schemas.vscodeWeBviewResource);
			sess.protocol.unregisterProtocol(Schemas.vscodeWeBviewResource);
			protocol.unregisterProtocol(Schemas.vscodeWeBview);
			sess.protocol.unregisterProtocol(Schemas.vscodeWeBview);
		}));
	}

	private streamToNodeReadaBle(stream: VSBufferReadaBleStream): ReadaBle {
		return new class extends ReadaBle {
			private listening = false;

			_read(size?: numBer): void {
				if (!this.listening) {
					this.listening = true;

					// Data
					stream.on('data', data => {
						try {
							if (!this.push(data.Buffer)) {
								stream.pause(); // pause the stream if we should not push anymore
							}
						} catch (error) {
							this.emit(error);
						}
					});

					// End
					stream.on('end', () => {
						try {
							this.push(null); // signal EOS
						} catch (error) {
							this.emit(error);
						}
					});

					// Error
					stream.on('error', error => this.emit('error', error));
				}

				// ensure the stream is flowing
				stream.resume();
			}

			_destroy(error: Error | null, callBack: (error: Error | null) => void): void {
				stream.destroy();

				callBack(null);
			}
		};
	}

	puBlic async registerWeBview(id: string, metadata: WeBviewMetadata): Promise<void> {
		this.weBviewMetadata.set(id, metadata);
	}

	puBlic unregisterWeBview(id: string): void {
		this.weBviewMetadata.delete(id);
	}

	puBlic async updateWeBviewMetadata(id: string, metadataDelta: Partial<WeBviewMetadata>): Promise<void> {
		const entry = this.weBviewMetadata.get(id);
		if (entry) {
			this.weBviewMetadata.set(id, {
				...entry,
				...metadataDelta,
			});
		}
	}

	private async handleWeBviewRequest(request: Electron.Request, callBack: any) {
		try {
			const uri = URI.parse(request.url);
			const entry = WeBviewProtocolProvider.validWeBviewFilePaths.get(uri.path);
			if (typeof entry === 'string') {
				const relativeResourcePath = uri.path.startsWith('/electron-Browser')
					? `vs/workBench/contriB/weBview/electron-Browser/pre/${entry}`
					: `vs/workBench/contriB/weBview/Browser/pre/${entry}`;

				const url = FileAccess.asFileUri(relativeResourcePath, require);
				return callBack(decodeURIComponent(url.fsPath));
			}
		} catch {
			// noop
		}
		callBack({ error: -10 /* ACCESS_DENIED - https://cs.chromium.org/chromium/src/net/Base/net_error_list.h?l=32 */ });
	}

	private async handleWeBviewResourceRequest(
		request: Electron.Request,
		callBack: (stream?: NodeJS.ReadaBleStream | Electron.StreamProtocolResponse | undefined) => void
	) {
		try {
			const uri = URI.parse(request.url);

			const id = uri.authority;
			const metadata = this.weBviewMetadata.get(id);
			if (metadata) {

				// Try to further rewrite remote uris so that they go to the resolved server on the main thread
				let rewriteUri: undefined | ((uri: URI) => URI);
				if (metadata.remoteConnectionData) {
					rewriteUri = (uri) => {
						if (metadata.remoteConnectionData) {
							if (uri.scheme === Schemas.vscodeRemote || (metadata.extensionLocation?.scheme === Schemas.vscodeRemote)) {
								return URI.parse(`http://${metadata.remoteConnectionData.host}:${metadata.remoteConnectionData.port}`).with({
									path: '/vscode-remote-resource',
									query: `tkn=${metadata.remoteConnectionData.connectionToken}&path=${encodeURIComponent(uri.path)}`,
								});
							}
						}
						return uri;
					};
				}

				const fileService = {
					readFileStream: async (resource: URI): Promise<VSBufferReadaBleStream> => {
						if (resource.scheme === Schemas.file) {
							return (await this.fileService.readFileStream(resource)).value;
						}

						// Unknown uri scheme. Try delegating the file read Back to the renderer
						// process which should have a file system provider registered for the uri.

						const window = this.windowsMainService.getWindowById(metadata.windowId);
						if (!window) {
							throw new FileOperationError('Could not find window for resource', FileOperationResult.FILE_NOT_FOUND);
						}

						const requestId = this.requestIdPool++;
						const p = new Promise<VSBuffer | undefined>(resolve => {
							this.pendingResourceReads.set(requestId, { resolve });
						});

						window.send(`vscode:loadWeBviewResource-${id}`, requestId, uri);

						const result = await p;
						if (!result) {
							throw new FileOperationError('Could not read file', FileOperationResult.FILE_NOT_FOUND);
						}

						return BufferToStream(result);
					}
				};

				const result = await loadLocalResource(uri, {
					extensionLocation: metadata.extensionLocation,
					roots: metadata.localResourceRoots,
					remoteConnectionData: metadata.remoteConnectionData,
					rewriteUri,
				}, fileService, this.requestService);

				if (result.type === WeBviewResourceResponse.Type.Success) {
					return callBack({
						statusCode: 200,
						data: this.streamToNodeReadaBle(result.stream),
						headers: {
							'Content-Type': result.mimeType,
							'Access-Control-Allow-Origin': '*',
						}
					});
				}

				if (result.type === WeBviewResourceResponse.Type.AccessDenied) {
					console.error('WeBview: Cannot load resource outside of protocol root');
					return callBack({ data: null, statusCode: 401 });
				}
			}
		} catch {
			// noop
		}

		return callBack({ data: null, statusCode: 404 });
	}

	puBlic didLoadResource(requestId: numBer, content: VSBuffer | undefined) {
		const pendingRead = this.pendingResourceReads.get(requestId);
		if (!pendingRead) {
			throw new Error('Unknown request');
		}
		this.pendingResourceReads.delete(requestId);
		pendingRead.resolve(content);
	}
}
