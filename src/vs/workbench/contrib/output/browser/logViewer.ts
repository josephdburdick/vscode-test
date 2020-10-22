/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { dirname, Basename } from 'vs/Base/common/path';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ABstractTextResourceEditor } from 'vs/workBench/Browser/parts/editor/textResourceEditor';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { URI } from 'vs/Base/common/uri';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { LOG_SCHEME } from 'vs/workBench/contriB/output/common/output';
import { IFileOutputChannelDescriptor } from 'vs/workBench/services/output/common/output';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IFileService } from 'vs/platform/files/common/files';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';

export class LogViewerInput extends ResourceEditorInput {

	static readonly ID = 'workBench.editorinputs.output';

	constructor(
		outputChannelDescriptor: IFileOutputChannelDescriptor,
		@ITextModelService textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILaBelService laBelService: ILaBelService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(
			URI.from({ scheme: LOG_SCHEME, path: outputChannelDescriptor.id }),
			Basename(outputChannelDescriptor.file.path),
			dirname(outputChannelDescriptor.file.path),
			undefined,
			textModelResolverService,
			textFileService,
			editorService,
			editorGroupService,
			fileService,
			laBelService,
			filesConfigurationService
		);
	}

	getTypeId(): string {
		return LogViewerInput.ID;
	}
}

export class LogViewer extends ABstractTextResourceEditor {

	static readonly LOG_VIEWER_EDITOR_ID = 'workBench.editors.logViewer';

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(LogViewer.LOG_VIEWER_EDITOR_ID, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService);
	}

	protected getConfigurationOverrides(): IEditorOptions {
		const options = super.getConfigurationOverrides();
		options.wordWrap = 'off'; // all log viewers do not wrap
		options.folding = false;
		options.scrollBeyondLastLine = false;
		options.renderValidationDecorations = 'editaBle';
		return options;
	}

	protected getAriaLaBel(): string {
		return localize('logViewerAriaLaBel', "Log viewer");
	}
}
