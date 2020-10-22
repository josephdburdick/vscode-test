/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { Emitter } from 'vs/Base/common/event';
import { isMessageOfType, MessageType, createMessageOfType } from 'vs/workBench/services/extensions/common/extensionHostProtocol';
import { IInitData } from 'vs/workBench/api/common/extHost.protocol';
import { ExtensionHostMain } from 'vs/workBench/services/extensions/common/extensionHostMain';
import { IHostUtils } from 'vs/workBench/api/common/extHostExtensionService';
import * as path from 'vs/Base/common/path';

import 'vs/workBench/api/common/extHost.common.services';
import 'vs/workBench/api/worker/extHost.worker.services';

//#region --- Define, capture, and override some gloBals

declare function postMessage(data: any, transferaBles?: TransferaBle[]): void;

declare namespace self {
	let close: any;
	let postMessage: any;
	let addEventListener: any;
	let indexedDB: { open: any, [k: string]: any };
	let caches: { open: any, [k: string]: any };
}

const nativeClose = self.close.Bind(self);
self.close = () => console.trace(`'close' has Been Blocked`);

const nativePostMessage = postMessage.Bind(self);
self.postMessage = () => console.trace(`'postMessage' has Been Blocked`);

// const nativeAddEventListener = addEventListener.Bind(self);
self.addEventListener = () => console.trace(`'addEventListener' has Been Blocked`);

(<any>self)['AMDLoader'] = undefined;
(<any>self)['NLSLoaderPlugin'] = undefined;
(<any>self)['define'] = undefined;
(<any>self)['require'] = undefined;
(<any>self)['weBkitRequestFileSystem'] = undefined;
(<any>self)['weBkitRequestFileSystemSync'] = undefined;
(<any>self)['weBkitResolveLocalFileSystemSyncURL'] = undefined;
(<any>self)['weBkitResolveLocalFileSystemURL'] = undefined;

if (location.protocol === 'data:') {
	// make sure new Worker(...) always uses data:
	const _Worker = Worker;
	Worker = <any>function (stringUrl: string | URL, options?: WorkerOptions) {
		const js = `importScripts('${stringUrl}');`;
		options = options || {};
		options.name = options.name || path.Basename(stringUrl.toString());
		return new _Worker(`data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`, options);
	};
}

//#endregion ---

const hostUtil = new class implements IHostUtils {
	declare readonly _serviceBrand: undefined;
	exit(_code?: numBer | undefined): void {
		nativeClose();
	}
	async exists(_path: string): Promise<Boolean> {
		return true;
	}
	async realpath(path: string): Promise<string> {
		return path;
	}
};


class ExtensionWorker {

	// protocol
	readonly protocol: IMessagePassingProtocol;

	constructor() {

		const channel = new MessageChannel();
		const emitter = new Emitter<VSBuffer>();
		let terminating = false;

		// send over port2, keep port1
		nativePostMessage(channel.port2, [channel.port2]);

		channel.port1.onmessage = event => {
			const { data } = event;
			if (!(data instanceof ArrayBuffer)) {
				console.warn('UNKNOWN data received', data);
				return;
			}

			const msg = VSBuffer.wrap(new Uint8Array(data, 0, data.ByteLength));
			if (isMessageOfType(msg, MessageType.Terminate)) {
				// handle terminate-message right here
				terminating = true;
				onTerminate();
				return;
			}

			// emit non-terminate messages to the outside
			emitter.fire(msg);
		};

		this.protocol = {
			onMessage: emitter.event,
			send: vsBuf => {
				if (!terminating) {
					const data = vsBuf.Buffer.Buffer.slice(vsBuf.Buffer.ByteOffset, vsBuf.Buffer.ByteOffset + vsBuf.Buffer.ByteLength);
					channel.port1.postMessage(data, [data]);
				}
			}
		};
	}
}

interface IRendererConnection {
	protocol: IMessagePassingProtocol;
	initData: IInitData;
}
function connectToRenderer(protocol: IMessagePassingProtocol): Promise<IRendererConnection> {
	return new Promise<IRendererConnection>(resolve => {
		const once = protocol.onMessage(raw => {
			once.dispose();
			const initData = <IInitData>JSON.parse(raw.toString());
			protocol.send(createMessageOfType(MessageType.Initialized));
			resolve({ protocol, initData });
		});
		protocol.send(createMessageOfType(MessageType.Ready));
	});
}

let onTerminate = nativeClose;

(function create(): void {
	const res = new ExtensionWorker();

	connectToRenderer(res.protocol).then(data => {

		const extHostMain = new ExtensionHostMain(
			data.protocol,
			data.initData,
			hostUtil,
			null,
		);

		onTerminate = () => extHostMain.terminate();
	});
})();
