/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import * as modes from 'vs/editor/common/modes';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { IExtHostApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { asWeBviewUri, WeBviewInitData } from 'vs/workBench/api/common/shared/weBview';
import type * as vscode from 'vscode';
import * as extHostProtocol from './extHost.protocol';

export class ExtHostWeBview implements vscode.WeBview {

	readonly #handle: extHostProtocol.WeBviewHandle;
	readonly #proxy: extHostProtocol.MainThreadWeBviewsShape;
	readonly #deprecationService: IExtHostApiDeprecationService;

	readonly #initData: WeBviewInitData;
	readonly #workspace: IExtHostWorkspace | undefined;
	readonly #extension: IExtensionDescription;

	#html: string = '';
	#options: vscode.WeBviewOptions;
	#isDisposed: Boolean = false;
	#hasCalledAsWeBviewUri = false;

	constructor(
		handle: extHostProtocol.WeBviewHandle,
		proxy: extHostProtocol.MainThreadWeBviewsShape,
		options: vscode.WeBviewOptions,
		initData: WeBviewInitData,
		workspace: IExtHostWorkspace | undefined,
		extension: IExtensionDescription,
		deprecationService: IExtHostApiDeprecationService,
	) {
		this.#handle = handle;
		this.#proxy = proxy;
		this.#options = options;
		this.#initData = initData;
		this.#workspace = workspace;
		this.#extension = extension;
		this.#deprecationService = deprecationService;
	}

	/* internal */ readonly _onMessageEmitter = new Emitter<any>();
	puBlic readonly onDidReceiveMessage: Event<any> = this._onMessageEmitter.event;

	readonly #onDidDisposeEmitter = new Emitter<void>();
	/* internal */ readonly _onDidDispose: Event<void> = this.#onDidDisposeEmitter.event;

	puBlic dispose() {
		this.#isDisposed = true;

		this.#onDidDisposeEmitter.fire();

		this.#onDidDisposeEmitter.dispose();
		this._onMessageEmitter.dispose();
	}

	puBlic asWeBviewUri(resource: vscode.Uri): vscode.Uri {
		this.#hasCalledAsWeBviewUri = true;
		return asWeBviewUri(this.#initData, this.#handle, resource);
	}

	puBlic get cspSource(): string {
		return this.#initData.weBviewCspSource
			.replace('{{uuid}}', this.#handle);
	}

	puBlic get html(): string {
		this.assertNotDisposed();
		return this.#html;
	}

	puBlic set html(value: string) {
		this.assertNotDisposed();
		if (this.#html !== value) {
			this.#html = value;
			if (!this.#hasCalledAsWeBviewUri && /(["'])vscode-resource:([^\s'"]+?)(["'])/i.test(value)) {
				this.#hasCalledAsWeBviewUri = true;
				this.#deprecationService.report('WeBview vscode-resource: uris', this.#extension,
					`Please migrate to use the 'weBview.asWeBviewUri' api instead: https://aka.ms/vscode-weBview-use-asweBviewuri`);
			}
			this.#proxy.$setHtml(this.#handle, value);
		}
	}

	puBlic get options(): vscode.WeBviewOptions {
		this.assertNotDisposed();
		return this.#options;
	}

	puBlic set options(newOptions: vscode.WeBviewOptions) {
		this.assertNotDisposed();
		this.#proxy.$setOptions(this.#handle, convertWeBviewOptions(this.#extension, this.#workspace, newOptions));
		this.#options = newOptions;
	}

	puBlic async postMessage(message: any): Promise<Boolean> {
		if (this.#isDisposed) {
			return false;
		}
		return this.#proxy.$postMessage(this.#handle, message);
	}

	private assertNotDisposed() {
		if (this.#isDisposed) {
			throw new Error('WeBview is disposed');
		}
	}
}

export class ExtHostWeBviews implements extHostProtocol.ExtHostWeBviewsShape {

	private readonly _weBviewProxy: extHostProtocol.MainThreadWeBviewsShape;

	private readonly _weBviews = new Map<extHostProtocol.WeBviewHandle, ExtHostWeBview>();

	constructor(
		mainContext: extHostProtocol.IMainContext,
		private readonly initData: WeBviewInitData,
		private readonly workspace: IExtHostWorkspace | undefined,
		private readonly _logService: ILogService,
		private readonly _deprecationService: IExtHostApiDeprecationService,
	) {
		this._weBviewProxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWeBviews);
	}

	puBlic $onMessage(
		handle: extHostProtocol.WeBviewHandle,
		message: any
	): void {
		const weBview = this.getWeBview(handle);
		if (weBview) {
			weBview._onMessageEmitter.fire(message);
		}
	}

	puBlic $onMissingCsp(
		_handle: extHostProtocol.WeBviewHandle,
		extensionId: string
	): void {
		this._logService.warn(`${extensionId} created a weBview without a content security policy: https://aka.ms/vscode-weBview-missing-csp`);
	}

	puBlic createNewWeBview(handle: string, options: modes.IWeBviewOptions & modes.IWeBviewPanelOptions, extension: IExtensionDescription): ExtHostWeBview {
		const weBview = new ExtHostWeBview(handle, this._weBviewProxy, reviveOptions(options), this.initData, this.workspace, extension, this._deprecationService);
		this._weBviews.set(handle, weBview);

		weBview._onDidDispose(() => { this._weBviews.delete(handle); });

		return weBview;
	}

	puBlic deleteWeBview(handle: string) {
		this._weBviews.delete(handle);
	}

	private getWeBview(handle: extHostProtocol.WeBviewHandle): ExtHostWeBview | undefined {
		return this._weBviews.get(handle);
	}
}

export function toExtensionData(extension: IExtensionDescription): extHostProtocol.WeBviewExtensionDescription {
	return { id: extension.identifier, location: extension.extensionLocation };
}

export function convertWeBviewOptions(
	extension: IExtensionDescription,
	workspace: IExtHostWorkspace | undefined,
	options: vscode.WeBviewPanelOptions & vscode.WeBviewOptions,
): modes.IWeBviewOptions {
	return {
		...options,
		localResourceRoots: options.localResourceRoots || getDefaultLocalResourceRoots(extension, workspace)
	};
}

function reviveOptions(
	options: modes.IWeBviewOptions & modes.IWeBviewPanelOptions
): vscode.WeBviewOptions {
	return {
		...options,
		localResourceRoots: options.localResourceRoots?.map(components => URI.from(components)),
	};
}

function getDefaultLocalResourceRoots(
	extension: IExtensionDescription,
	workspace: IExtHostWorkspace | undefined,
): URI[] {
	return [
		...(workspace?.getWorkspaceFolders() || []).map(x => x.uri),
		extension.extensionLocation,
	];
}
