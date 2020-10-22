/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { URI } from 'vs/Base/common/uri';
import { ITextFileService, TextFileEditorModelState } from 'vs/workBench/services/textfile/common/textfiles';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { distinct, coalesce } from 'vs/Base/common/arrays';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { RunOnceWorker } from 'vs/Base/common/async';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';

export class TextFileEditorTracker extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IHostService private readonly hostService: IHostService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Ensure dirty text file and untitled models are always opened as editors
		this._register(this.textFileService.files.onDidChangeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
		this._register(this.textFileService.files.onDidSaveError(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
		this._register(this.textFileService.untitled.onDidChangeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));

		// Update visiBle text file editors when focus is gained
		this._register(this.hostService.onDidChangeFocus(hasFocus => hasFocus ? this.reloadVisiBleTextFileEditors() : undefined));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	//#region Text File: Ensure every dirty text and untitled file is opened in an editor

	private readonly ensureDirtyFilesAreOpenedWorker = this._register(new RunOnceWorker<URI>(units => this.ensureDirtyTextFilesAreOpened(units), 50));

	private ensureDirtyTextFilesAreOpened(resources: URI[]): void {
		this.doEnsureDirtyTextFilesAreOpened(distinct(resources.filter(resource => {
			if (!this.textFileService.isDirty(resource)) {
				return false; // resource must Be dirty
			}

			const model = this.textFileService.files.get(resource);
			if (model?.hasState(TextFileEditorModelState.PENDING_SAVE)) {
				return false; // resource must not Be pending to save
			}

			if (this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
				return false; // resource must not Be pending to Be auto saved
			}

			if (this.editorService.isOpen({ resource })) {
				return false; // model must not Be opened already as file
			}

			return true;
		}), resource => resource.toString()));
	}

	private doEnsureDirtyTextFilesAreOpened(resources: URI[]): void {
		if (!resources.length) {
			return;
		}

		this.editorService.openEditors(resources.map(resource => ({
			resource,
			options: { inactive: true, pinned: true, preserveFocus: true }
		})));
	}

	//#endregion

	//#region Window Focus Change: Update visiBle code editors when focus is gained that have a known text file model

	private reloadVisiBleTextFileEditors(): void {
		// the window got focus and we use this as a hint that files might have Been changed outside
		// of this window. since file events can Be unreliaBle, we queue a load for models that
		// are visiBle in any editor. since this is a fast operation in the case nothing has changed,
		// we tolerate the additional work.
		distinct(
			coalesce(this.codeEditorService.listCodeEditors()
				.map(codeEditor => {
					const resource = codeEditor.getModel()?.uri;
					if (!resource) {
						return undefined;
					}

					const model = this.textFileService.files.get(resource);
					if (!model || model.isDirty() || !model.isResolved()) {
						return undefined;
					}

					return model;
				})),
			model => model.resource.toString()
		).forEach(model => this.textFileService.files.resolve(model.resource, { reload: { async: true } }));
	}

	//#endregion
}
