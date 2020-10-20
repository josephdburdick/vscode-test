/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { BAseBinAryResourceEditor } from 'vs/workbench/browser/pArts/editor/binAryEditor';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { EditorInput, EditorOptions } from 'vs/workbench/common/editor';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { BINARY_FILE_EDITOR_ID } from 'vs/workbench/contrib/files/common/files';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { openEditorWith } from 'vs/workbench/services/editor/common/editorOpenWith';

/**
 * An implementAtion of editor for binAry files thAt cAnnot be displAyed.
 */
export clAss BinAryFileEditor extends BAseBinAryResourceEditor {

	stAtic reAdonly ID = BINARY_FILE_EDITOR_ID;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
	) {
		super(
			BinAryFileEditor.ID,
			{
				openInternAl: (input, options) => this.openInternAl(input, options),
				openExternAl: resource => this.openerService.open(resource, { openExternAl: true })
			},
			telemetryService,
			themeService,
			environmentService,
			storAgeService
		);
	}

	privAte Async openInternAl(input: EditorInput, options: EditorOptions | undefined): Promise<void> {
		if (input instAnceof FileEditorInput && this.group) {

			// Enforce to open the input As text to enAble our text bAsed viewer
			input.setForceOpenAsText();

			// If more editors Are instAlled thAt cAn hAndle this input, show A picker
			AwAit openEditorWith(input, undefined, options, this.group, this.editorService, this.configurAtionService, this.quickInputService);
		}
	}

	getTitle(): string {
		return this.input ? this.input.getNAme() : nls.locAlize('binAryFileEditor', "BinAry File Viewer");
	}
}
