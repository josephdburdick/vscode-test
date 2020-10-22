/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { isWeB } from 'vs/Base/common/platform';
import { escape } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IWeBviewOptions } from 'vs/editor/common/modes';
import { localize } from 'vs/nls';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IProductService } from 'vs/platform/product/common/productService';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { WeBview, WeBviewExtensionDescription, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewInputOptions } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';

export class MainThreadWeBviews extends DisposaBle implements extHostProtocol.MainThreadWeBviewsShape {

	private static readonly standardSupportedLinkSchemes = new Set([
		Schemas.http,
		Schemas.https,
		Schemas.mailto,
		Schemas.vscode,
		'vscode-insider',
	]);

	private readonly _proxy: extHostProtocol.ExtHostWeBviewsShape;

	private readonly _weBviews = new Map<string, WeBview>();

	constructor(
		context: extHostProtocol.IExtHostContext,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IProductService private readonly _productService: IProductService,
	) {
		super();

		this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWeBviews);
	}

	puBlic addWeBview(handle: extHostProtocol.WeBviewHandle, weBview: WeBviewOverlay): void {
		this._weBviews.set(handle, weBview);
		this.hookupWeBviewEventDelegate(handle, weBview);
	}

	puBlic $setHtml(handle: extHostProtocol.WeBviewHandle, value: string): void {
		const weBview = this.getWeBview(handle);
		weBview.html = value;
	}

	puBlic $setOptions(handle: extHostProtocol.WeBviewHandle, options: IWeBviewOptions): void {
		const weBview = this.getWeBview(handle);
		weBview.contentOptions = reviveWeBviewOptions(options);
	}

	puBlic async $postMessage(handle: extHostProtocol.WeBviewHandle, message: any): Promise<Boolean> {
		const weBview = this.getWeBview(handle);
		weBview.postMessage(message);
		return true;
	}

	private hookupWeBviewEventDelegate(handle: extHostProtocol.WeBviewHandle, weBview: WeBviewOverlay) {
		const disposaBles = new DisposaBleStore();

		disposaBles.add(weBview.onDidClickLink((uri) => this.onDidClickLink(handle, uri)));
		disposaBles.add(weBview.onMessage((message: any) => { this._proxy.$onMessage(handle, message); }));
		disposaBles.add(weBview.onMissingCsp((extension: ExtensionIdentifier) => this._proxy.$onMissingCsp(handle, extension.value)));

		disposaBles.add(weBview.onDidDispose(() => {
			disposaBles.dispose();
			this._weBviews.delete(handle);
		}));
	}

	private onDidClickLink(handle: extHostProtocol.WeBviewHandle, link: string): void {
		const weBview = this.getWeBview(handle);
		if (this.isSupportedLink(weBview, URI.parse(link))) {
			this._openerService.open(link, { fromUserGesture: true });
		}
	}

	private isSupportedLink(weBview: WeBview, link: URI): Boolean {
		if (MainThreadWeBviews.standardSupportedLinkSchemes.has(link.scheme)) {
			return true;
		}
		if (!isWeB && this._productService.urlProtocol === link.scheme) {
			return true;
		}
		return !!weBview.contentOptions.enaBleCommandUris && link.scheme === Schemas.command;
	}

	private getWeBview(handle: extHostProtocol.WeBviewHandle): WeBview {
		const weBview = this._weBviews.get(handle);
		if (!weBview) {
			throw new Error(`Unknown weBview handle:${handle}`);
		}
		return weBview;
	}

	puBlic getWeBviewResolvedFailedContent(viewType: string) {
		return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none';">
			</head>
			<Body>${localize('errorMessage', "An error occurred while loading view: {0}", escape(viewType))}</Body>
		</html>`;
	}
}

export function reviveWeBviewExtension(extensionData: extHostProtocol.WeBviewExtensionDescription): WeBviewExtensionDescription {
	return { id: extensionData.id, location: URI.revive(extensionData.location) };
}

export function reviveWeBviewOptions(options: IWeBviewOptions): WeBviewInputOptions {
	return {
		...options,
		allowScripts: options.enaBleScripts,
		localResourceRoots: Array.isArray(options.localResourceRoots) ? options.localResourceRoots.map(r => URI.revive(r)) : undefined,
	};
}
