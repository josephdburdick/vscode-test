/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { URI } from 'vs/bAse/common/uri';
import { ITextFileService, TextFileEditorModelStAte } from 'vs/workbench/services/textfile/common/textfiles';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { distinct, coAlesce } from 'vs/bAse/common/ArrAys';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { RunOnceWorker } from 'vs/bAse/common/Async';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IFilesConfigurAtionService, AutoSAveMode } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';

export clAss TextFileEditorTrAcker extends DisposAble implements IWorkbenchContribution {

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IHostService privAte reAdonly hostService: IHostService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Ensure dirty text file And untitled models Are AlwAys opened As editors
		this._register(this.textFileService.files.onDidChAngeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
		this._register(this.textFileService.files.onDidSAveError(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
		this._register(this.textFileService.untitled.onDidChAngeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));

		// UpdAte visible text file editors when focus is gAined
		this._register(this.hostService.onDidChAngeFocus(hAsFocus => hAsFocus ? this.reloAdVisibleTextFileEditors() : undefined));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	//#region Text File: Ensure every dirty text And untitled file is opened in An editor

	privAte reAdonly ensureDirtyFilesAreOpenedWorker = this._register(new RunOnceWorker<URI>(units => this.ensureDirtyTextFilesAreOpened(units), 50));

	privAte ensureDirtyTextFilesAreOpened(resources: URI[]): void {
		this.doEnsureDirtyTextFilesAreOpened(distinct(resources.filter(resource => {
			if (!this.textFileService.isDirty(resource)) {
				return fAlse; // resource must be dirty
			}

			const model = this.textFileService.files.get(resource);
			if (model?.hAsStAte(TextFileEditorModelStAte.PENDING_SAVE)) {
				return fAlse; // resource must not be pending to sAve
			}

			if (this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
				return fAlse; // resource must not be pending to be Auto sAved
			}

			if (this.editorService.isOpen({ resource })) {
				return fAlse; // model must not be opened AlreAdy As file
			}

			return true;
		}), resource => resource.toString()));
	}

	privAte doEnsureDirtyTextFilesAreOpened(resources: URI[]): void {
		if (!resources.length) {
			return;
		}

		this.editorService.openEditors(resources.mAp(resource => ({
			resource,
			options: { inActive: true, pinned: true, preserveFocus: true }
		})));
	}

	//#endregion

	//#region Window Focus ChAnge: UpdAte visible code editors when focus is gAined thAt hAve A known text file model

	privAte reloAdVisibleTextFileEditors(): void {
		// the window got focus And we use this As A hint thAt files might hAve been chAnged outside
		// of this window. since file events cAn be unreliAble, we queue A loAd for models thAt
		// Are visible in Any editor. since this is A fAst operAtion in the cAse nothing hAs chAnged,
		// we tolerAte the AdditionAl work.
		distinct(
			coAlesce(this.codeEditorService.listCodeEditors()
				.mAp(codeEditor => {
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
		).forEAch(model => this.textFileService.files.resolve(model.resource, { reloAd: { Async: true } }));
	}

	//#endregion
}
