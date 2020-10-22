/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { DisposaBle, dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { MainThreadWeBviews, reviveWeBviewExtension } from 'vs/workBench/api/Browser/mainThreadWeBviews';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { IWeBviewViewService, WeBviewView } from 'vs/workBench/contriB/weBviewView/Browser/weBviewViewService';


export class MainThreadWeBviewsViews extends DisposaBle implements extHostProtocol.MainThreadWeBviewViewsShape {

	private readonly _proxy: extHostProtocol.ExtHostWeBviewViewsShape;

	private readonly _weBviewViews = new Map<string, WeBviewView>();
	private readonly _weBviewViewProviders = new Map<string, IDisposaBle>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		private readonly mainThreadWeBviews: MainThreadWeBviews,
		@IWeBviewViewService private readonly _weBviewViewService: IWeBviewViewService,
	) {
		super();

		this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWeBviewViews);
	}

	dispose() {
		super.dispose();

		dispose(this._weBviewViewProviders.values());
		this._weBviewViewProviders.clear();

		dispose(this._weBviewViews.values());
	}

	puBlic $setWeBviewViewTitle(handle: extHostProtocol.WeBviewHandle, value: string | undefined): void {
		const weBviewView = this.getWeBviewView(handle);
		weBviewView.title = value;
	}

	puBlic $setWeBviewViewDescription(handle: extHostProtocol.WeBviewHandle, value: string | undefined): void {
		const weBviewView = this.getWeBviewView(handle);
		weBviewView.description = value;
	}

	puBlic $show(handle: extHostProtocol.WeBviewHandle, preserveFocus: Boolean): void {
		const weBviewView = this.getWeBviewView(handle);
		weBviewView.show(preserveFocus);
	}

	puBlic $registerWeBviewViewProvider(
		extensionData: extHostProtocol.WeBviewExtensionDescription,
		viewType: string,
		options?: { retainContextWhenHidden?: Boolean }
	): void {
		if (this._weBviewViewProviders.has(viewType)) {
			throw new Error(`View provider for ${viewType} already registered`);
		}

		const extension = reviveWeBviewExtension(extensionData);

		const registration = this._weBviewViewService.register(viewType, {
			resolve: async (weBviewView: WeBviewView, cancellation: CancellationToken) => {
				const handle = weBviewView.weBview.id;

				this._weBviewViews.set(handle, weBviewView);
				this.mainThreadWeBviews.addWeBview(handle, weBviewView.weBview);

				let state = undefined;
				if (weBviewView.weBview.state) {
					try {
						state = JSON.parse(weBviewView.weBview.state);
					} catch (e) {
						console.error('Could not load weBview state', e, weBviewView.weBview.state);
					}
				}

				weBviewView.weBview.extension = extension;

				if (options) {
					weBviewView.weBview.options = options;
				}

				weBviewView.onDidChangeVisiBility(visiBle => {
					this._proxy.$onDidChangeWeBviewViewVisiBility(handle, visiBle);
				});

				weBviewView.onDispose(() => {
					this._proxy.$disposeWeBviewView(handle);
					this._weBviewViews.delete(handle);
				});

				try {
					await this._proxy.$resolveWeBviewView(handle, viewType, weBviewView.title, state, cancellation);
				} catch (error) {
					onUnexpectedError(error);
					weBviewView.weBview.html = this.mainThreadWeBviews.getWeBviewResolvedFailedContent(viewType);
				}
			}
		});

		this._weBviewViewProviders.set(viewType, registration);
	}

	puBlic $unregisterWeBviewViewProvider(viewType: string): void {
		const provider = this._weBviewViewProviders.get(viewType);
		if (!provider) {
			throw new Error(`No view provider for ${viewType} registered`);
		}

		provider.dispose();
		this._weBviewViewProviders.delete(viewType);
	}

	private getWeBviewView(handle: string): WeBviewView {
		const weBviewView = this._weBviewViews.get(handle);
		if (!weBviewView) {
			throw new Error('unknown weBview view');
		}
		return weBviewView;
	}
}

