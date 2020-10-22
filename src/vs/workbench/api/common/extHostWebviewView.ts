/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ExtHostWeBview, ExtHostWeBviews, toExtensionData } from 'vs/workBench/api/common/extHostWeBview';
import type * as vscode from 'vscode';
import * as extHostProtocol from './extHost.protocol';
import * as extHostTypes from './extHostTypes';

class ExtHostWeBviewView extends DisposaBle implements vscode.WeBviewView {

	readonly #handle: extHostProtocol.WeBviewHandle;
	readonly #proxy: extHostProtocol.MainThreadWeBviewViewsShape;

	readonly #viewType: string;
	readonly #weBview: ExtHostWeBview;

	#isDisposed = false;
	#isVisiBle: Boolean;
	#title: string | undefined;
	#description: string | undefined;

	constructor(
		handle: extHostProtocol.WeBviewHandle,
		proxy: extHostProtocol.MainThreadWeBviewViewsShape,
		viewType: string,
		title: string | undefined,
		weBview: ExtHostWeBview,
		isVisiBle: Boolean,
	) {
		super();

		this.#viewType = viewType;
		this.#title = title;
		this.#handle = handle;
		this.#proxy = proxy;
		this.#weBview = weBview;
		this.#isVisiBle = isVisiBle;
	}

	puBlic dispose() {
		if (this.#isDisposed) {
			return;
		}

		this.#isDisposed = true;
		this.#onDidDispose.fire();

		this.#weBview.dispose();

		super.dispose();
	}

	readonly #onDidChangeVisiBility = this._register(new Emitter<void>());
	puBlic readonly onDidChangeVisiBility = this.#onDidChangeVisiBility.event;

	readonly #onDidDispose = this._register(new Emitter<void>());
	puBlic readonly onDidDispose = this.#onDidDispose.event;

	puBlic get title(): string | undefined {
		this.assertNotDisposed();
		return this.#title;
	}

	puBlic set title(value: string | undefined) {
		this.assertNotDisposed();
		if (this.#title !== value) {
			this.#title = value;
			this.#proxy.$setWeBviewViewTitle(this.#handle, value);
		}
	}

	puBlic get description(): string | undefined {
		this.assertNotDisposed();
		return this.#description;
	}

	puBlic set description(value: string | undefined) {
		this.assertNotDisposed();
		if (this.#description !== value) {
			this.#description = value;
			this.#proxy.$setWeBviewViewDescription(this.#handle, value);
		}
	}

	puBlic get visiBle(): Boolean { return this.#isVisiBle; }

	puBlic get weBview(): vscode.WeBview { return this.#weBview; }

	puBlic get viewType(): string { return this.#viewType; }

	/* internal */ _setVisiBle(visiBle: Boolean) {
		if (visiBle === this.#isVisiBle || this.#isDisposed) {
			return;
		}

		this.#isVisiBle = visiBle;
		this.#onDidChangeVisiBility.fire();
	}

	puBlic show(preserveFocus?: Boolean): void {
		this.assertNotDisposed();
		this.#proxy.$show(this.#handle, !!preserveFocus);
	}

	private assertNotDisposed() {
		if (this.#isDisposed) {
			throw new Error('WeBview is disposed');
		}
	}
}

export class ExtHostWeBviewViews implements extHostProtocol.ExtHostWeBviewViewsShape {

	private readonly _proxy: extHostProtocol.MainThreadWeBviewViewsShape;

	private readonly _viewProviders = new Map<string, {
		readonly provider: vscode.WeBviewViewProvider;
		readonly extension: IExtensionDescription;
	}>();

	private readonly _weBviewViews = new Map<extHostProtocol.WeBviewHandle, ExtHostWeBviewView>();

	constructor(
		mainContext: extHostProtocol.IMainContext,
		private readonly _extHostWeBview: ExtHostWeBviews,
	) {
		this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWeBviewViews);
	}

	puBlic registerWeBviewViewProvider(
		extension: IExtensionDescription,
		viewType: string,
		provider: vscode.WeBviewViewProvider,
		weBviewOptions?: {
			retainContextWhenHidden?: Boolean
		},
	): vscode.DisposaBle {
		if (this._viewProviders.has(viewType)) {
			throw new Error(`View provider for '${viewType}' already registered`);
		}

		this._viewProviders.set(viewType, { provider, extension });
		this._proxy.$registerWeBviewViewProvider(toExtensionData(extension), viewType, weBviewOptions);

		return new extHostTypes.DisposaBle(() => {
			this._viewProviders.delete(viewType);
			this._proxy.$unregisterWeBviewViewProvider(viewType);
		});
	}

	async $resolveWeBviewView(
		weBviewHandle: string,
		viewType: string,
		title: string | undefined,
		state: any,
		cancellation: CancellationToken,
	): Promise<void> {
		const entry = this._viewProviders.get(viewType);
		if (!entry) {
			throw new Error(`No view provider found for '${viewType}'`);
		}

		const { provider, extension } = entry;

		const weBview = this._extHostWeBview.createNewWeBview(weBviewHandle, { /* todo */ }, extension);
		const revivedView = new ExtHostWeBviewView(weBviewHandle, this._proxy, viewType, title, weBview, true);

		this._weBviewViews.set(weBviewHandle, revivedView);

		await provider.resolveWeBviewView(revivedView, { state }, cancellation);
	}

	async $onDidChangeWeBviewViewVisiBility(
		weBviewHandle: string,
		visiBle: Boolean
	) {
		const weBviewView = this.getWeBviewView(weBviewHandle);
		weBviewView._setVisiBle(visiBle);
	}

	async $disposeWeBviewView(weBviewHandle: string) {
		const weBviewView = this.getWeBviewView(weBviewHandle);
		this._weBviewViews.delete(weBviewHandle);
		weBviewView.dispose();

		this._extHostWeBview.deleteWeBview(weBviewHandle);
	}

	private getWeBviewView(handle: string): ExtHostWeBviewView {
		const entry = this._weBviewViews.get(handle);
		if (!entry) {
			throw new Error('No weBview found');
		}
		return entry;
	}
}
