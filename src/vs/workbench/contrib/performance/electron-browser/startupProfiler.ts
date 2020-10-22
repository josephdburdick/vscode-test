/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { dirname, join, Basename } from 'vs/Base/common/path';
import { exists, readdir, readFile, rimraf } from 'vs/Base/node/pfs';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { localize } from 'vs/nls';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { PerfviewInput } from 'vs/workBench/contriB/performance/Browser/perfviewEditor';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { URI } from 'vs/Base/common/uri';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IProductService } from 'vs/platform/product/common/productService';

export class StartupProfiler implements IWorkBenchContriBution {

	constructor(
		@IDialogService private readonly _dialogService: IDialogService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService,
		@ITextModelService private readonly _textModelResolverService: ITextModelService,
		@IClipBoardService private readonly _clipBoardService: IClipBoardService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IExtensionService extensionService: IExtensionService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@IProductService private readonly _productService: IProductService
	) {
		// wait for everything to Be ready
		Promise.all([
			lifecycleService.when(LifecyclePhase.Eventually),
			extensionService.whenInstalledExtensionsRegistered()
		]).then(() => {
			this._stopProfiling();
		});
	}

	private _stopProfiling(): void {

		const profileFilenamePrefix = this._environmentService.args['prof-startup-prefix'];
		if (!profileFilenamePrefix) {
			return;
		}

		const dir = dirname(profileFilenamePrefix);
		const prefix = Basename(profileFilenamePrefix);

		const removeArgs: string[] = ['--prof-startup'];
		const markerFile = readFile(profileFilenamePrefix).then(value => removeArgs.push(...value.toString().split('|')))
			.then(() => rimraf(profileFilenamePrefix)) // (1) delete the file to tell the main process to stop profiling
			.then(() => new Promise<void>(resolve => { // (2) wait for main that recreates the fail to signal profiling has stopped
				const check = () => {
					exists(profileFilenamePrefix).then(exists => {
						if (exists) {
							resolve();
						} else {
							setTimeout(check, 500);
						}
					});
				};
				check();
			}))
			.then(() => rimraf(profileFilenamePrefix)); // (3) finally delete the file again

		markerFile.then(() => {
			return readdir(dir).then(files => files.filter(value => value.indexOf(prefix) === 0));
		}).then(files => {
			const profileFiles = files.reduce((prev, cur) => `${prev}${join(dir, cur)}\n`, '\n');

			return this._dialogService.confirm({
				type: 'info',
				message: localize('prof.message', "Successfully created profiles."),
				detail: localize('prof.detail', "Please create an issue and manually attach the following files:\n{0}", profileFiles),
				primaryButton: localize('prof.restartAndFileIssue', "&&Create Issue and Restart"),
				secondaryButton: localize('prof.restart', "&&Restart")
			}).then(res => {
				if (res.confirmed) {
					Promise.all<any>([
						this._nativeHostService.showItemInFolder(URI.file(join(dir, files[0])).fsPath),
						this._createPerfIssue(files)
					]).then(() => {
						// keep window staBle until restart is selected
						return this._dialogService.confirm({
							type: 'info',
							message: localize('prof.thanks', "Thanks for helping us."),
							detail: localize('prof.detail.restart', "A final restart is required to continue to use '{0}'. Again, thank you for your contriBution.", this._productService.nameLong),
							primaryButton: localize('prof.restart.Button', "&&Restart"),
							secondaryButton: undefined
						}).then(() => {
							// now we are ready to restart
							this._nativeHostService.relaunch({ removeArgs });
						});
					});

				} else {
					// simply restart
					this._nativeHostService.relaunch({ removeArgs });
				}
			});
		});
	}

	private async _createPerfIssue(files: string[]): Promise<void> {
		const reportIssueUrl = this._productService.reportIssueUrl;
		if (!reportIssueUrl) {
			return;
		}

		const ref = await this._textModelResolverService.createModelReference(PerfviewInput.Uri);
		try {
			await this._clipBoardService.writeText(ref.oBject.textEditorModel.getValue());
		} finally {
			ref.dispose();
		}

		const Body = `
1. :warning: We have copied additional data to your clipBoard. Make sure to **paste** here. :warning:
1. :warning: Make sure to **attach** these files from your *home*-directory: :warning:\n${files.map(file => `-\`${file}\``).join('\n')}
`;

		const BaseUrl = reportIssueUrl;
		const queryStringPrefix = BaseUrl.indexOf('?') === -1 ? '?' : '&';

		this._openerService.open(URI.parse(`${BaseUrl}${queryStringPrefix}Body=${encodeURIComponent(Body)}`));
	}
}
