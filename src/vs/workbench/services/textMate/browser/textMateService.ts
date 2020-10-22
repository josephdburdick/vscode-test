/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextMateService } from 'vs/workBench/services/textMate/common/textMateService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ABstractTextMateService } from 'vs/workBench/services/textMate/Browser/aBstractTextMateService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILogService } from 'vs/platform/log/common/log';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { FileAccess } from 'vs/Base/common/network';

export class TextMateService extends ABstractTextMateService {

	constructor(
		@IModeService modeService: IModeService,
		@IWorkBenchThemeService themeService: IWorkBenchThemeService,
		@IExtensionResourceLoaderService extensionResourceLoaderService: IExtensionResourceLoaderService,
		@INotificationService notificationService: INotificationService,
		@ILogService logService: ILogService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IProgressService progressService: IProgressService
	) {
		super(modeService, themeService, extensionResourceLoaderService, notificationService, logService, configurationService, storageService, progressService);
	}

	protected async _loadVSCodeOnigurumWASM(): Promise<Response | ArrayBuffer> {
		const response = await fetch(FileAccess.asBrowserUri('vscode-oniguruma/../onig.wasm', require).toString(true));
		// Using the response directly only works if the server sets the MIME type 'application/wasm'.
		// Otherwise, a TypeError is thrown when using the streaming compiler.
		// We therefore use the non-streaming compiler :(.
		return await response.arrayBuffer();
	}
}

registerSingleton(ITextMateService, TextMateService);
