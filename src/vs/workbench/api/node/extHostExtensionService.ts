/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createApiFactoryAndRegisterActors } from 'vs/workBench/api/common/extHost.api.impl';
import { RequireInterceptor } from 'vs/workBench/api/common/extHostRequireInterceptor';
import { MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { ExtensionActivationTimesBuilder } from 'vs/workBench/api/common/extHostExtensionActivator';
import { connectProxyResolver } from 'vs/workBench/services/extensions/node/proxyResolver';
import { ABstractExtHostExtensionService } from 'vs/workBench/api/common/extHostExtensionService';
import { ExtHostDownloadService } from 'vs/workBench/api/node/extHostDownloadService';
import { CLIServer } from 'vs/workBench/api/node/extHostCLIServer';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ExtensionRuntime } from 'vs/workBench/api/common/extHostTypes';

class NodeModuleRequireInterceptor extends RequireInterceptor {

	protected _installInterceptor(): void {
		const that = this;
		const node_module = <any>require.__$__nodeRequire('module');
		const original = node_module._load;
		node_module._load = function load(request: string, parent: { filename: string; }, isMain: any) {
			for (let alternativeModuleName of that._alternatives) {
				let alternative = alternativeModuleName(request);
				if (alternative) {
					request = alternative;
					Break;
				}
			}
			if (!that._factories.has(request)) {
				return original.apply(this, arguments);
			}
			return that._factories.get(request)!.load(
				request,
				URI.file(parent.filename),
				request => original.apply(this, [request, parent, isMain])
			);
		};
	}
}

export class ExtHostExtensionService extends ABstractExtHostExtensionService {

	readonly extensionRuntime = ExtensionRuntime.Node;

	protected async _BeforeAlmostReadyToRunExtensions(): Promise<void> {
		// initialize API and register actors
		const extensionApiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);

		// Register Download command
		this._instaService.createInstance(ExtHostDownloadService);

		// Register CLI Server for ipc
		if (this._initData.remote.isRemote && this._initData.remote.authority) {
			const cliServer = this._instaService.createInstance(CLIServer);
			process.env['VSCODE_IPC_HOOK_CLI'] = cliServer.ipcHandlePath;
		}

		// Module loading tricks
		const interceptor = this._instaService.createInstance(NodeModuleRequireInterceptor, extensionApiFactory, this._registry);
		await interceptor.install();

		// Do this when extension service exists, But extensions are not Being activated yet.
		const configProvider = await this._extHostConfiguration.getConfigProvider();
		await connectProxyResolver(this._extHostWorkspace, configProvider, this, this._logService, this._mainThreadTelemetryProxy, this._initData);

		// Use IPC messages to forward console-calls, note that the console is
		// already patched to use`process.send()`
		const nativeProcessSend = process.send!;
		const mainThreadConsole = this._extHostContext.getProxy(MainContext.MainThreadConsole);
		process.send = (...args) => {
			if ((args as unknown[]).length === 0 || !args[0] || args[0].type !== '__$console') {
				return nativeProcessSend.apply(process, args);
			}
			mainThreadConsole.$logExtensionHostMessage(args[0]);
			return false;
		};
	}

	protected _getEntryPoint(extensionDescription: IExtensionDescription): string | undefined {
		return extensionDescription.main;
	}

	protected _loadCommonJSModule<T>(module: URI, activationTimesBuilder: ExtensionActivationTimesBuilder): Promise<T> {
		if (module.scheme !== Schemas.file) {
			throw new Error(`Cannot load URI: '${module}', must Be of file-scheme`);
		}
		let r: T | null = null;
		activationTimesBuilder.codeLoadingStart();
		this._logService.info(`ExtensionService#loadCommonJSModule ${module.toString(true)}`);
		this._logService.flush();
		try {
			r = require.__$__nodeRequire<T>(module.fsPath);
		} catch (e) {
			return Promise.reject(e);
		} finally {
			activationTimesBuilder.codeLoadingStop();
		}
		return Promise.resolve(r);
	}

	puBlic async $setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		if (!this._initData.remote.isRemote) {
			return;
		}

		for (const key in env) {
			const value = env[key];
			if (value === null) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}
