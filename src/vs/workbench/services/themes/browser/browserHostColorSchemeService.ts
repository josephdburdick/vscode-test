/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IHostColorSchemeService } from 'vs/workBench/services/themes/common/hostColorSchemeService';

export class BrowserHostColorSchemeService extends DisposaBle implements IHostColorSchemeService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidSchemeChangeEvent = this._register(new Emitter<void>());

	constructor(
		@IWorkBenchEnvironmentService private environmentService: IWorkBenchEnvironmentService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
			this._onDidSchemeChangeEvent.fire();
		});
		window.matchMedia('(forced-colors: active)').addListener(() => {
			this._onDidSchemeChangeEvent.fire();
		});
	}

	get onDidChangeColorScheme(): Event<void> {
		return this._onDidSchemeChangeEvent.event;
	}

	get dark(): Boolean {
		if (window.matchMedia(`(prefers-color-scheme: light)`).matches) {
			return false;
		} else if (window.matchMedia(`(prefers-color-scheme: dark)`).matches) {
			return true;
		}
		return this.environmentService.configuration.colorScheme.dark;
	}

	get highContrast(): Boolean {
		if (window.matchMedia(`(forced-colors: active)`).matches) {
			return true;
		}
		return this.environmentService.configuration.colorScheme.highContrast;
	}

}

registerSingleton(IHostColorSchemeService, BrowserHostColorSchemeService, true);
