/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextMAteService } from 'vs/workbench/services/textMAte/common/textMAteService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { AbstrActTextMAteService } from 'vs/workbench/services/textMAte/browser/AbstrActTextMAteService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';
import { IProgressService } from 'vs/plAtform/progress/common/progress';
import { FileAccess } from 'vs/bAse/common/network';

export clAss TextMAteService extends AbstrActTextMAteService {

	constructor(
		@IModeService modeService: IModeService,
		@IWorkbenchThemeService themeService: IWorkbenchThemeService,
		@IExtensionResourceLoAderService extensionResourceLoAderService: IExtensionResourceLoAderService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@ILogService logService: ILogService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IProgressService progressService: IProgressService
	) {
		super(modeService, themeService, extensionResourceLoAderService, notificAtionService, logService, configurAtionService, storAgeService, progressService);
	}

	protected Async _loAdVSCodeOnigurumWASM(): Promise<Response | ArrAyBuffer> {
		const response = AwAit fetch(FileAccess.AsBrowserUri('vscode-onigurumA/../onig.wAsm', require).toString(true));
		// Using the response directly only works if the server sets the MIME type 'ApplicAtion/wAsm'.
		// Otherwise, A TypeError is thrown when using the streAming compiler.
		// We therefore use the non-streAming compiler :(.
		return AwAit response.ArrAyBuffer();
	}
}

registerSingleton(ITextMAteService, TextMAteService);
