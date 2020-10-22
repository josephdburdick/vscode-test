/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { BaseBinaryResourceEditor } from 'vs/workBench/Browser/parts/editor/BinaryEditor';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { EditorInput, EditorOptions } from 'vs/workBench/common/editor';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { BINARY_FILE_EDITOR_ID } from 'vs/workBench/contriB/files/common/files';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { openEditorWith } from 'vs/workBench/services/editor/common/editorOpenWith';

/**
 * An implementation of editor for Binary files that cannot Be displayed.
 */
export class BinaryFileEditor extends BaseBinaryResourceEditor {

	static readonly ID = BINARY_FILE_EDITOR_ID;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IStorageService storageService: IStorageService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
	) {
		super(
			BinaryFileEditor.ID,
			{
				openInternal: (input, options) => this.openInternal(input, options),
				openExternal: resource => this.openerService.open(resource, { openExternal: true })
			},
			telemetryService,
			themeService,
			environmentService,
			storageService
		);
	}

	private async openInternal(input: EditorInput, options: EditorOptions | undefined): Promise<void> {
		if (input instanceof FileEditorInput && this.group) {

			// Enforce to open the input as text to enaBle our text Based viewer
			input.setForceOpenAsText();

			// If more editors are installed that can handle this input, show a picker
			await openEditorWith(input, undefined, options, this.group, this.editorService, this.configurationService, this.quickInputService);
		}
	}

	getTitle(): string {
		return this.input ? this.input.getName() : nls.localize('BinaryFileEditor', "Binary File Viewer");
	}
}
