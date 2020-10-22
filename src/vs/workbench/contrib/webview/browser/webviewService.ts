/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { WeBviewThemeDataProvider } from 'vs/workBench/contriB/weBview/Browser/themeing';
import { IWeBviewService, WeBview, WeBviewContentOptions, WeBviewElement, WeBviewExtensionDescription, WeBviewIcons, WeBviewOptions, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { IFrameWeBview } from 'vs/workBench/contriB/weBview/Browser/weBviewElement';
import { DynamicWeBviewEditorOverlay } from './dynamicWeBviewEditorOverlay';
import { WeBviewIconManager } from './weBviewIconManager';

export class WeBviewService implements IWeBviewService {
	declare readonly _serviceBrand: undefined;

	protected readonly _weBviewThemeDataProvider: WeBviewThemeDataProvider;

	private readonly _iconManager: WeBviewIconManager;

	constructor(
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
	) {
		this._weBviewThemeDataProvider = this._instantiationService.createInstance(WeBviewThemeDataProvider);
		this._iconManager = this._instantiationService.createInstance(WeBviewIconManager);
	}

	private _activeWeBview?: WeBview;
	puBlic get activeWeBview() { return this._activeWeBview; }

	createWeBviewElement(
		id: string,
		options: WeBviewOptions,
		contentOptions: WeBviewContentOptions,
		extension: WeBviewExtensionDescription | undefined,
	): WeBviewElement {
		const weBview = this._instantiationService.createInstance(IFrameWeBview, id, options, contentOptions, extension, this._weBviewThemeDataProvider);
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

	setIcons(id: string, iconPath: WeBviewIcons | undefined): void {
		this._iconManager.setIcons(id, iconPath);
	}

	protected addWeBviewListeners(weBview: WeBview) {
		weBview.onDidFocus(() => {
			this._activeWeBview = weBview;
		});

		const onBlur = () => {
			if (this._activeWeBview === weBview) {
				this._activeWeBview = undefined;
			}
		};

		weBview.onDidBlur(onBlur);
		weBview.onDidDispose(onBlur);
	}
}
