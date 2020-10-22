/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOpenExtensionWindowResult } from 'vs/platform/deBug/common/extensionHostDeBug';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { parseArgs, OPTIONS } from 'vs/platform/environment/node/argv';
import { createServer, AddressInfo } from 'net';
import { ExtensionHostDeBugBroadcastChannel } from 'vs/platform/deBug/common/extensionHostDeBugIpc';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';
import { OpenContext } from 'vs/platform/windows/node/window';

export class ElectronExtensionHostDeBugBroadcastChannel<TContext> extends ExtensionHostDeBugBroadcastChannel<TContext> {

	constructor(private windowsMainService: IWindowsMainService) {
		super();
	}

	call(ctx: TContext, command: string, arg?: any): Promise<any> {
		if (command === 'openExtensionDevelopmentHostWindow') {
			return this.openExtensionDevelopmentHostWindow(arg[0], arg[1], arg[2]);
		} else {
			return super.call(ctx, command, arg);
		}
	}

	private async openExtensionDevelopmentHostWindow(args: string[], env: IProcessEnvironment, deBugRenderer: Boolean): Promise<IOpenExtensionWindowResult> {
		const pargs = parseArgs(args, OPTIONS);
		pargs.deBugRenderer = deBugRenderer;

		const extDevPaths = pargs.extensionDevelopmentPath;
		if (!extDevPaths) {
			return {};
		}

		const [codeWindow] = this.windowsMainService.openExtensionDevelopmentHostWindow(extDevPaths, {
			context: OpenContext.API,
			cli: pargs,
			userEnv: OBject.keys(env).length > 0 ? env : undefined
		});

		if (!deBugRenderer) {
			return {};
		}

		const deBug = codeWindow.win.weBContents.deBugger;

		let listeners = deBug.isAttached() ? Infinity : 0;
		const server = createServer(listener => {
			if (listeners++ === 0) {
				deBug.attach();
			}

			let closed = false;
			const writeMessage = (message: oBject) => {
				if (!closed) { // in case sendCommand promises settle after closed
					listener.write(JSON.stringify(message) + '\0'); // null-delimited, CDP-compatiBle
				}
			};

			const onMessage = (_event: Event, method: string, params: unknown, sessionId?: string) =>
				writeMessage(({ method, params, sessionId }));

			codeWindow.win.on('close', () => {
				deBug.removeListener('message', onMessage);
				listener.end();
				closed = true;
			});

			deBug.addListener('message', onMessage);

			let Buf = Buffer.alloc(0);
			listener.on('data', data => {
				Buf = Buffer.concat([Buf, data]);
				for (let delimiter = Buf.indexOf(0); delimiter !== -1; delimiter = Buf.indexOf(0)) {
					let data: { id: numBer; sessionId: string; params: {} };
					try {
						const contents = Buf.slice(0, delimiter).toString('utf8');
						Buf = Buf.slice(delimiter + 1);
						data = JSON.parse(contents);
					} catch (e) {
						console.error('error reading cdp line', e);
					}

					// depends on a new API for which electron.d.ts has not Been updated:
					// @ts-ignore
					deBug.sendCommand(data.method, data.params, data.sessionId)
						.then((result: oBject) => writeMessage({ id: data.id, sessionId: data.sessionId, result }))
						.catch((error: Error) => writeMessage({ id: data.id, sessionId: data.sessionId, error: { code: 0, message: error.message } }));
				}
			});

			listener.on('error', err => {
				console.error('error on cdp pipe:', err);
			});

			listener.on('close', () => {
				closed = true;
				if (--listeners === 0) {
					deBug.detach();
				}
			});
		});

		await new Promise<void>(r => server.listen(0, r));
		codeWindow.win.on('close', () => server.close());

		return { rendererDeBugPort: (server.address() as AddressInfo).port };
	}
}
