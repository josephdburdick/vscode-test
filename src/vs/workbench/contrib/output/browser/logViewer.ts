/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { dirnAme, bAsenAme } from 'vs/bAse/common/pAth';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { AbstrActTextResourceEditor } from 'vs/workbench/browser/pArts/editor/textResourceEditor';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { URI } from 'vs/bAse/common/uri';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { LOG_SCHEME } from 'vs/workbench/contrib/output/common/output';
import { IFileOutputChAnnelDescriptor } from 'vs/workbench/services/output/common/output';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';

export clAss LogViewerInput extends ResourceEditorInput {

	stAtic reAdonly ID = 'workbench.editorinputs.output';

	constructor(
		outputChAnnelDescriptor: IFileOutputChAnnelDescriptor,
		@ITextModelService textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILAbelService lAbelService: ILAbelService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(
			URI.from({ scheme: LOG_SCHEME, pAth: outputChAnnelDescriptor.id }),
			bAsenAme(outputChAnnelDescriptor.file.pAth),
			dirnAme(outputChAnnelDescriptor.file.pAth),
			undefined,
			textModelResolverService,
			textFileService,
			editorService,
			editorGroupService,
			fileService,
			lAbelService,
			filesConfigurAtionService
		);
	}

	getTypeId(): string {
		return LogViewerInput.ID;
	}
}

export clAss LogViewer extends AbstrActTextResourceEditor {

	stAtic reAdonly LOG_VIEWER_EDITOR_ID = 'workbench.editors.logViewer';

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(LogViewer.LOG_VIEWER_EDITOR_ID, telemetryService, instAntiAtionService, storAgeService, textResourceConfigurAtionService, themeService, editorGroupService, editorService);
	}

	protected getConfigurAtionOverrides(): IEditorOptions {
		const options = super.getConfigurAtionOverrides();
		options.wordWrAp = 'off'; // All log viewers do not wrAp
		options.folding = fAlse;
		options.scrollBeyondLAstLine = fAlse;
		options.renderVAlidAtionDecorAtions = 'editAble';
		return options;
	}

	protected getAriALAbel(): string {
		return locAlize('logViewerAriALAbel', "Log viewer");
	}
}
