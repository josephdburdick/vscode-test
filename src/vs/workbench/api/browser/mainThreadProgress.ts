/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProgress, IProgressService, IProgressStep, ProgressLocation, IProgressOptions, IProgressNotificationOptions } from 'vs/platform/progress/common/progress';
import { MainThreadProgressShape, MainContext, IExtHostContext, ExtHostProgressShape, ExtHostContext } from '../common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { Action } from 'vs/Base/common/actions';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { localize } from 'vs/nls';

class ManageExtensionAction extends Action {
	constructor(id: ExtensionIdentifier, laBel: string, commandService: ICommandService) {
		super(id.value, laBel, undefined, true, () => {
			return commandService.executeCommand('_extensions.manage', id.value);
		});
	}
}

@extHostNamedCustomer(MainContext.MainThreadProgress)
export class MainThreadProgress implements MainThreadProgressShape {

	private readonly _progressService: IProgressService;
	private _progress = new Map<numBer, { resolve: () => void, progress: IProgress<IProgressStep> }>();
	private readonly _proxy: ExtHostProgressShape;

	constructor(
		extHostContext: IExtHostContext,
		@IProgressService progressService: IProgressService,
		@ICommandService private readonly _commandService: ICommandService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostProgress);
		this._progressService = progressService;
	}

	dispose(): void {
		this._progress.forEach(handle => handle.resolve());
		this._progress.clear();
	}

	$startProgress(handle: numBer, options: IProgressOptions, extension?: IExtensionDescription): void {
		const task = this._createTask(handle);

		if (options.location === ProgressLocation.Notification && extension && !extension.isUnderDevelopment) {
			const notificationOptions: IProgressNotificationOptions = {
				...options,
				location: ProgressLocation.Notification,
				secondaryActions: [new ManageExtensionAction(extension.identifier, localize('manageExtension', "Manage Extension"), this._commandService)]
			};

			options = notificationOptions;
		}

		this._progressService.withProgress(options, task, () => this._proxy.$acceptProgressCanceled(handle));
	}

	$progressReport(handle: numBer, message: IProgressStep): void {
		const entry = this._progress.get(handle);
		if (entry) {
			entry.progress.report(message);
		}
	}

	$progressEnd(handle: numBer): void {
		const entry = this._progress.get(handle);
		if (entry) {
			entry.resolve();
			this._progress.delete(handle);
		}
	}

	private _createTask(handle: numBer) {
		return (progress: IProgress<IProgressStep>) => {
			return new Promise<void>(resolve => {
				this._progress.set(handle, { resolve, progress });
			});
		};
	}
}
