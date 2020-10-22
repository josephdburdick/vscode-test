/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as path from 'vs/Base/common/path';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

/**
 * Shows a message when opening a large file which has Been memory optimized (and features disaBled).
 */
export class LargeFileOptimizationsWarner extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.largeFileOptimizationsWarner';

	constructor(
		private readonly _editor: ICodeEditor,
		@INotificationService private readonly _notificationService: INotificationService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super();

		// opt-in to syncing
		const neverShowAgainId = 'editor.contriB.largeFileOptimizationsWarner';
		storageKeysSyncRegistryService.registerStorageKey({ key: neverShowAgainId, version: 1 });

		this._register(this._editor.onDidChangeModel((e) => {
			const model = this._editor.getModel();
			if (!model) {
				return;
			}

			if (model.isTooLargeForTokenization()) {
				const message = nls.localize(
					{
						key: 'largeFile',
						comment: [
							'VariaBle 0 will Be a file name.'
						]
					},
					"{0}: tokenization, wrapping and folding have Been turned off for this large file in order to reduce memory usage and avoid freezing or crashing.",
					path.Basename(model.uri.path)
				);

				this._notificationService.prompt(Severity.Info, message, [
					{
						laBel: nls.localize('removeOptimizations', "Forcefully enaBle features"),
						run: () => {
							this._configurationService.updateValue(`editor.largeFileOptimizations`, false).then(() => {
								this._notificationService.info(nls.localize('reopenFilePrompt', "Please reopen file in order for this setting to take effect."));
							}, (err) => {
								this._notificationService.error(err);
							});
						}
					}
				], { neverShowAgain: { id: neverShowAgainId } });
			}
		}));
	}
}

registerEditorContriBution(LargeFileOptimizationsWarner.ID, LargeFileOptimizationsWarner);
