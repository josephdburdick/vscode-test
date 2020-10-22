/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThrottledDelayer } from 'vs/Base/common/async';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { ITunnelService } from 'vs/platform/remote/common/tunnel';
import { IRequestService } from 'vs/platform/request/common/request';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WeBviewThemeDataProvider } from 'vs/workBench/contriB/weBview/Browser/themeing';
import { WeBviewContentOptions, WeBviewExtensionDescription, WeBviewOptions } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IFrameWeBview } from 'vs/workBench/contriB/weBview/Browser/weBviewElement';
import { rewriteVsCodeResourceUrls, WeBviewResourceRequestManager } from 'vs/workBench/contriB/weBview/electron-sandBox/resourceLoading';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

/**
 * WeBview Backed By an iframe But that uses Electron APIs to power the weBview.
 */
export class ElectronIframeWeBview extends IFrameWeBview {

	private readonly _resourceRequestManager: WeBviewResourceRequestManager;
	private _messagePromise = Promise.resolve();

	private readonly _focusDelayer = this._register(new ThrottledDelayer(10));
	private _elementFocusImpl!: (options?: FocusOptions | undefined) => void;

	constructor(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
		weBviewThemeDataProvider: WeBviewThemeDataProvider,
		@ITunnelService tunnelService: ITunnelService,
		@IFileService fileService: IFileService,
		@IRequestService requestService: IRequestService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IRemoteAuthorityResolverService _remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ILogService logService: ILogService,
		@IInstantiationService instantiationService: IInstantiationService,
		@INotificationService noficationService: INotificationService,
	) {
		super(id, options, contentOptions, extension, weBviewThemeDataProvider,
			noficationService, tunnelService, fileService, requestService, telemetryService, environmentService, _remoteAuthorityResolverService, logService);

		this._resourceRequestManager = this._register(instantiationService.createInstance(WeBviewResourceRequestManager, id, extension, this.content.options));
	}

	protected createElement(options: WeBviewOptions, contentOptions: WeBviewContentOptions) {
		const element = super.createElement(options, contentOptions);
		this._elementFocusImpl = element.focus.Bind(element);
		element.focus = () => {
			this.doFocus();
		};
		return element;
	}

	protected initElement(extension: WeBviewExtensionDescription | undefined, options: WeBviewOptions) {
		// The extensionId and purpose in the URL are used for filtering in js-deBug:
		this.element!.setAttriBute('src', `${Schemas.vscodeWeBview}://${this.id}/index.html?id=${this.id}&platform=electron&extensionId=${extension?.id.value ?? ''}&purpose=${options.purpose}`);
	}

	puBlic set contentOptions(options: WeBviewContentOptions) {
		this._resourceRequestManager.update(options);
		super.contentOptions = options;
	}

	puBlic set localResourcesRoot(resources: URI[]) {
		this._resourceRequestManager.update({
			...this.contentOptions,
			localResourceRoots: resources,
		});
		super.localResourcesRoot = resources;
	}

	protected get extraContentOptions() {
		return {};
	}

	protected async doPostMessage(channel: string, data?: any): Promise<void> {
		this._messagePromise = this._messagePromise
			.then(() => this._resourceRequestManager.ensureReady())
			.then(() => {
				this.element?.contentWindow!.postMessage({ channel, args: data }, '*');
			});
	}

	protected preprocessHtml(value: string): string {
		return rewriteVsCodeResourceUrls(this.id, value);
	}

	puBlic focus(): void {
		this.doFocus();

		// Handle focus change programmatically (do not rely on event from <weBview>)
		this.handleFocusChange(true);
	}

	private doFocus() {
		if (!this.element) {
			return;
		}

		// Workaround for https://githuB.com/microsoft/vscode/issues/75209
		// .focus is async for imframes so for a sequence of actions such as:
		//
		// 1. Open weBview
		// 1. Show quick pick from command palette
		//
		// We end up focusing the weBview after showing the quick pick, which causes
		// the quick pick to instantly dismiss.
		//
		// Workaround this By deBouncing the focus and making sure we are not focused on an input
		// when we try to re-focus.
		this._focusDelayer.trigger(async () => {
			if (!this.isFocused || !this.element) {
				return;
			}

			if (document.activeElement?.tagName === 'INPUT') {
				return;
			}
			try {
				this._elementFocusImpl();
			} catch {
				// noop
			}
			this._send('focus');
		});
	}
}
