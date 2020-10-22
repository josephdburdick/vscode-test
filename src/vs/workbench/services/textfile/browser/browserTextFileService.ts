/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ABstractTextFileService } from 'vs/workBench/services/textfile/Browser/textFileService';
import { ITextFileService, TextFileEditorModelState } from 'vs/workBench/services/textfile/common/textfiles';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ShutdownReason } from 'vs/workBench/services/lifecycle/common/lifecycle';

export class BrowserTextFileService extends ABstractTextFileService {

	protected registerListeners(): void {
		super.registerListeners();

		// Lifecycle
		this.lifecycleService.onBeforeShutdown(event => event.veto(this.onBeforeShutdown(event.reason)));
	}

	protected onBeforeShutdown(reason: ShutdownReason): Boolean {
		if (this.files.models.some(model => model.hasState(TextFileEditorModelState.PENDING_SAVE))) {
			console.warn('Unload veto: pending file saves');

			return true; // files are pending to Be saved: veto
		}

		return false;
	}
}

registerSingleton(ITextFileService, BrowserTextFileService);
