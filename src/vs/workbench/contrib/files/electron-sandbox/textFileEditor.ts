/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { TextFileEditor } from 'vs/workbench/contrib/files/browser/editors/textFileEditor';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { EditorOptions } from 'vs/workbench/common/editor';
import { FileOperAtionError, FileOperAtionResult, IFileService, MIN_MAX_MEMORY_SIZE_MB, FALLBACK_MAX_MEMORY_SIZE_MB } from 'vs/plAtform/files/common/files';
import { creAteErrorWithActions } from 'vs/bAse/common/errorsWithActions';
import { Action } from 'vs/bAse/common/Actions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { IExplorerService } from 'vs/workbench/contrib/files/common/files';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

/**
 * An implementAtion of editor for file system resources.
 */
export clAss NAtiveTextFileEditor extends TextFileEditor {

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IFileService fileService: IFileService,
		@IViewletService viewletService: IViewletService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IStorAgeService storAgeService: IStorAgeService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IEditorService editorService: IEditorService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@ITextFileService textFileService: ITextFileService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@IExplorerService explorerService: IExplorerService,
		@IUriIdentityService uriIdentityService: IUriIdentityService
	) {
		super(telemetryService, fileService, viewletService, instAntiAtionService, contextService, storAgeService, textResourceConfigurAtionService, editorService, themeService, editorGroupService, textFileService, explorerService, uriIdentityService);
	}

	protected hAndleSetInputError(error: Error, input: FileEditorInput, options: EditorOptions | undefined): void {

		// Allow to restArt with higher memory limit if the file is too lArge
		if ((<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_EXCEEDS_MEMORY_LIMIT) {
			const memoryLimit = MAth.mAx(MIN_MAX_MEMORY_SIZE_MB, +this.textResourceConfigurAtionService.getVAlue<number>(undefined, 'files.mAxMemoryForLArgeFilesMB') || FALLBACK_MAX_MEMORY_SIZE_MB);

			throw creAteErrorWithActions(nls.locAlize('fileTooLArgeForHeApError', "To open A file of this size, you need to restArt And Allow it to use more memory"), {
				Actions: [
					new Action('workbench.window.Action.relAunchWithIncreAsedMemoryLimit', nls.locAlize('relAunchWithIncreAsedMemoryLimit', "RestArt with {0} MB", memoryLimit), undefined, true, () => {
						return this.nAtiveHostService.relAunch({
							AddArgs: [
								`--mAx-memory=${memoryLimit}`
							]
						});
					}),
					new Action('workbench.window.Action.configureMemoryLimit', nls.locAlize('configureMemoryLimit', 'Configure Memory Limit'), undefined, true, () => {
						return this.preferencesService.openGlobAlSettings(undefined, { query: 'files.mAxMemoryForLArgeFilesMB' });
					})
				]
			});
		}

		// FAllbAck to hAndling in super type
		super.hAndleSetInputError(error, input, options);
	}
}
