/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { DynamicWeBviewEditorOverlay } from 'vs/workBench/contriB/weBview/Browser/dynamicWeBviewEditorOverlay';
import { WeBviewContentOptions, WeBviewElement, WeBviewExtensionDescription, WeBviewOptions, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewService } from 'vs/workBench/contriB/weBview/Browser/weBviewService';
import { ElectronIframeWeBview } from 'vs/workBench/contriB/weBview/electron-sandBox/iframeWeBviewElement';
import { ElectronWeBviewBasedWeBview } from 'vs/workBench/contriB/weBview/electron-Browser/weBviewElement';

export class ElectronWeBviewService extends WeBviewService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService private readonly _configService: IConfigurationService,
	) {
		super(instantiationService);
	}

	createWeBviewElement(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewElement {
		const useIframes = this._configService.getValue<string>('weBview.experimental.useIframes');
		const weBview = this._instantiationService.createInstance(useIframes ? ElectronIframeWeBview : ElectronWeBviewBasedWeBview, id, options, contentOptions, extension, this._weBviewThemeDataProvider);
		this.addWeBviewListeners(weBview);
		return weBview;
	}

	createWeBviewOverlay(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewOverlay {
		const weBview = this._instantiationService.createInstance(DynamicWeBviewEditorOverlay, id, options, contentOptions, extension);
		this.addWeBviewListeners(weBview);
		return weBview;
	}
}
