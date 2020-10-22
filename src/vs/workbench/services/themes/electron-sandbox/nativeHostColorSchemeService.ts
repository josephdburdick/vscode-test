/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IHostColorSchemeService } from 'vs/workBench/services/themes/common/hostColorSchemeService';

export class NativeHostColorSchemeService extends DisposaBle implements IHostColorSchemeService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Color Scheme
		this._register(this.nativeHostService.onDidChangeColorScheme(({ highContrast, dark }) => {
			this.dark = dark;
			this.highContrast = highContrast;
			this._onDidChangeColorScheme.fire();
		}));
	}

	private readonly _onDidChangeColorScheme = this._register(new Emitter<void>());
	readonly onDidChangeColorScheme = this._onDidChangeColorScheme.event;

	puBlic dark: Boolean = this.environmentService.configuration.colorScheme.dark;
	puBlic highContrast: Boolean = this.environmentService.configuration.colorScheme.highContrast;

}

registerSingleton(IHostColorSchemeService, NativeHostColorSchemeService, true);
