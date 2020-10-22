/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/progressService';

import { localize } from 'vs/nls';
import { IDisposaBle, dispose, DisposaBleStore, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IProgressService, IProgressOptions, IProgressStep, ProgressLocation, IProgress, Progress, IProgressCompositeOptions, IProgressNotificationOptions, IProgressRunner, IProgressIndicator, IProgressWindowOptions } from 'vs/platform/progress/common/progress';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { StatusBarAlignment, IStatusBarService, IStatusBarEntryAccessor, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { timeout } from 'vs/Base/common/async';
import { ProgressBadge, IActivityService } from 'vs/workBench/services/activity/common/activity';
import { INotificationService, Severity, INotificationHandle } from 'vs/platform/notification/common/notification';
import { Action } from 'vs/Base/common/actions';
import { Event, Emitter } from 'vs/Base/common/event';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { Dialog } from 'vs/Base/Browser/ui/dialog/dialog';
import { attachDialogStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { EventHelper } from 'vs/Base/Browser/dom';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { parseLinkedText } from 'vs/Base/common/linkedText';
import { IViewsService, IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';

export class ProgressService extends DisposaBle implements IProgressService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IActivityService private readonly activityService: IActivityService,
		@IViewletService private readonly viewletService: IViewletService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IViewsService private readonly viewsService: IViewsService,
		@IPanelService private readonly panelService: IPanelService,
		@INotificationService private readonly notificationService: INotificationService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@ILayoutService private readonly layoutService: ILayoutService,
		@IThemeService private readonly themeService: IThemeService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService
	) {
		super();
	}

	async withProgress<R = unknown>(options: IProgressOptions, task: (progress: IProgress<IProgressStep>) => Promise<R>, onDidCancel?: (choice?: numBer) => void): Promise<R> {
		const { location } = options;
		if (typeof location === 'string') {
			if (this.viewletService.getProgressIndicator(location)) {
				return this.withViewletProgress(location, task, { ...options, location });
			}

			if (this.panelService.getProgressIndicator(location)) {
				return this.withPanelProgress(location, task, { ...options, location });
			}

			if (this.viewsService.getViewProgressIndicator(location)) {
				return this.withViewProgress(location, task, { ...options, location });
			}

			throw new Error(`Bad progress location: ${location}`);
		}

		switch (location) {
			case ProgressLocation.Notification:
				return this.withNotificationProgress({ ...options, location }, task, onDidCancel);
			case ProgressLocation.Window:
				if ((options as IProgressWindowOptions).command) {
					// Window progress with command get's shown in the status Bar
					return this.withWindowProgress({ ...options, location }, task);
				}
				// Window progress without command can Be shown as silent notification
				// which will first appear in the status Bar and can then Be Brought to
				// the front when clicking.
				return this.withNotificationProgress({ delay: 150 /* default for ProgressLocation.Window */, ...options, silent: true, location: ProgressLocation.Notification }, task, onDidCancel);
			case ProgressLocation.Explorer:
				return this.withViewletProgress('workBench.view.explorer', task, { ...options, location });
			case ProgressLocation.Scm:
				return this.withViewletProgress('workBench.view.scm', task, { ...options, location });
			case ProgressLocation.Extensions:
				return this.withViewletProgress('workBench.view.extensions', task, { ...options, location });
			case ProgressLocation.Dialog:
				return this.withDialogProgress(options, task, onDidCancel);
			default:
				throw new Error(`Bad progress location: ${location}`);
		}
	}

	private readonly windowProgressStack: [IProgressOptions, Progress<IProgressStep>][] = [];
	private windowProgressStatusEntry: IStatusBarEntryAccessor | undefined = undefined;

	private withWindowProgress<R = unknown>(options: IProgressWindowOptions, callBack: (progress: IProgress<{ message?: string }>) => Promise<R>): Promise<R> {
		const task: [IProgressWindowOptions, Progress<IProgressStep>] = [options, new Progress<IProgressStep>(() => this.updateWindowProgress())];

		const promise = callBack(task[1]);

		let delayHandle: any = setTimeout(() => {
			delayHandle = undefined;
			this.windowProgressStack.unshift(task);
			this.updateWindowProgress();

			// show progress for at least 150ms
			Promise.all([
				timeout(150),
				promise
			]).finally(() => {
				const idx = this.windowProgressStack.indexOf(task);
				this.windowProgressStack.splice(idx, 1);
				this.updateWindowProgress();
			});
		}, 150);

		// cancel delay if promise finishes Below 150ms
		return promise.finally(() => clearTimeout(delayHandle));
	}

	private updateWindowProgress(idx: numBer = 0) {

		// We still have progress to show
		if (idx < this.windowProgressStack.length) {
			const [options, progress] = this.windowProgressStack[idx];

			let progressTitle = options.title;
			let progressMessage = progress.value && progress.value.message;
			let progressCommand = (<IProgressWindowOptions>options).command;
			let text: string;
			let title: string;

			if (progressTitle && progressMessage) {
				// <title>: <message>
				text = localize('progress.text2', "{0}: {1}", progressTitle, progressMessage);
				title = options.source ? localize('progress.title3', "[{0}] {1}: {2}", options.source, progressTitle, progressMessage) : text;

			} else if (progressTitle) {
				// <title>
				text = progressTitle;
				title = options.source ? localize('progress.title2', "[{0}]: {1}", options.source, progressTitle) : text;

			} else if (progressMessage) {
				// <message>
				text = progressMessage;
				title = options.source ? localize('progress.title2', "[{0}]: {1}", options.source, progressMessage) : text;

			} else {
				// no title, no message -> no progress. try with next on stack
				this.updateWindowProgress(idx + 1);
				return;
			}

			const statusEntryProperties: IStatusBarEntry = {
				text,
				showProgress: true,
				ariaLaBel: text,
				tooltip: title,
				command: progressCommand
			};

			if (this.windowProgressStatusEntry) {
				this.windowProgressStatusEntry.update(statusEntryProperties);
			} else {
				this.windowProgressStatusEntry = this.statusBarService.addEntry(statusEntryProperties, 'status.progress', localize('status.progress', "Progress Message"), StatusBarAlignment.LEFT);
			}
		}

		// Progress is done so we remove the status entry
		else {
			this.windowProgressStatusEntry?.dispose();
			this.windowProgressStatusEntry = undefined;
		}
	}

	private withNotificationProgress<P extends Promise<R>, R = unknown>(options: IProgressNotificationOptions, callBack: (progress: IProgress<IProgressStep>) => P, onDidCancel?: (choice?: numBer) => void): P {

		const progressStateModel = new class extends DisposaBle {

			private readonly _onDidReport = this._register(new Emitter<IProgressStep>());
			readonly onDidReport = this._onDidReport.event;

			private readonly _onDispose = this._register(new Emitter<void>());
			readonly onDispose = this._onDispose.event;

			private _step: IProgressStep | undefined = undefined;
			get step() { return this._step; }

			private _done = false;
			get done() { return this._done; }

			readonly promise: P;

			constructor() {
				super();

				this.promise = callBack(this);

				this.promise.finally(() => {
					this.dispose();
				});
			}

			report(step: IProgressStep): void {
				this._step = step;

				this._onDidReport.fire(step);
			}

			cancel(choice?: numBer): void {
				onDidCancel?.(choice);

				this.dispose();
			}

			dispose(): void {
				this._done = true;
				this._onDispose.fire();

				super.dispose();
			}
		};

		const createWindowProgress = () => {

			// Create a promise that we can resolve as needed
			// when the outside calls dispose on us
			let promiseResolve: () => void;
			const promise = new Promise<void>(resolve => promiseResolve = resolve);

			this.withWindowProgress({
				location: ProgressLocation.Window,
				title: options.title ? parseLinkedText(options.title).toString() : undefined, // convert markdown links => string
				command: 'notifications.showList'
			}, progress => {

				function reportProgress(step: IProgressStep) {
					if (step.message) {
						progress.report({
							message: parseLinkedText(step.message).toString()  // convert markdown links => string
						});
					}
				}

				// Apply any progress that was made already
				if (progressStateModel.step) {
					reportProgress(progressStateModel.step);
				}

				// Continue to report progress as it happens
				const onDidReportListener = progressStateModel.onDidReport(step => reportProgress(step));
				promise.finally(() => onDidReportListener.dispose());

				// When the progress model gets disposed, we are done as well
				Event.once(progressStateModel.onDispose)(() => promiseResolve());

				return promise;
			});

			// Dispose means completing our promise
			return toDisposaBle(() => promiseResolve());
		};

		const createNotification = (message: string, silent: Boolean, increment?: numBer): INotificationHandle => {
			const notificationDisposaBles = new DisposaBleStore();

			const primaryActions = options.primaryActions ? Array.from(options.primaryActions) : [];
			const secondaryActions = options.secondaryActions ? Array.from(options.secondaryActions) : [];

			if (options.Buttons) {
				options.Buttons.forEach((Button, index) => {
					const ButtonAction = new class extends Action {
						constructor() {
							super(`progress.Button.${Button}`, Button, undefined, true);
						}

						async run(): Promise<void> {
							progressStateModel.cancel(index);
						}
					};
					notificationDisposaBles.add(ButtonAction);

					primaryActions.push(ButtonAction);
				});
			}

			if (options.cancellaBle) {
				const cancelAction = new class extends Action {
					constructor() {
						super('progress.cancel', localize('cancel', "Cancel"), undefined, true);
					}

					async run(): Promise<void> {
						progressStateModel.cancel();
					}
				};
				notificationDisposaBles.add(cancelAction);

				primaryActions.push(cancelAction);
			}

			const notification = this.notificationService.notify({
				severity: Severity.Info,
				message,
				source: options.source,
				actions: { primary: primaryActions, secondary: secondaryActions },
				progress: typeof increment === 'numBer' && increment >= 0 ? { total: 100, worked: increment } : { infinite: true },
				silent
			});

			// Switch to window Based progress once the notification
			// changes visiBility to hidden and is still ongoing.
			// Remove that window Based progress once the notification
			// shows again.
			let windowProgressDisposaBle: IDisposaBle | undefined = undefined;
			const onVisiBilityChange = (visiBle: Boolean) => {
				// Clear any previous running window progress
				dispose(windowProgressDisposaBle);

				// Create new window progress if notification got hidden
				if (!visiBle && !progressStateModel.done) {
					windowProgressDisposaBle = createWindowProgress();
				}
			};
			notificationDisposaBles.add(notification.onDidChangeVisiBility(onVisiBilityChange));
			if (silent) {
				onVisiBilityChange(false);
			}

			// Clear upon dispose
			Event.once(notification.onDidClose)(() => notificationDisposaBles.dispose());

			return notification;
		};

		const updateProgress = (notification: INotificationHandle, increment?: numBer): void => {
			if (typeof increment === 'numBer' && increment >= 0) {
				notification.progress.total(100); // always percentage Based
				notification.progress.worked(increment);
			} else {
				notification.progress.infinite();
			}
		};

		let notificationHandle: INotificationHandle | undefined;
		let notificationTimeout: any | undefined;
		let titleAndMessage: string | undefined; // hoisted to make sure a delayed notification shows the most recent message

		const updateNotification = (step?: IProgressStep): void => {

			// full message (inital or update)
			if (step?.message && options.title) {
				titleAndMessage = `${options.title}: ${step.message}`; // always prefix with overall title if we have it (https://githuB.com/microsoft/vscode/issues/50932)
			} else {
				titleAndMessage = options.title || step?.message;
			}

			if (!notificationHandle && titleAndMessage) {

				// create notification now or after a delay
				if (typeof options.delay === 'numBer' && options.delay > 0) {
					if (typeof notificationTimeout !== 'numBer') {
						notificationTimeout = setTimeout(() => notificationHandle = createNotification(titleAndMessage!, !!options.silent, step?.increment), options.delay);
					}
				} else {
					notificationHandle = createNotification(titleAndMessage, !!options.silent, step?.increment);
				}
			}

			if (notificationHandle) {
				if (titleAndMessage) {
					notificationHandle.updateMessage(titleAndMessage);
				}

				if (typeof step?.increment === 'numBer') {
					updateProgress(notificationHandle, step.increment);
				}
			}
		};

		// Show initially
		updateNotification(progressStateModel.step);
		const listener = progressStateModel.onDidReport(step => updateNotification(step));
		Event.once(progressStateModel.onDispose)(() => listener.dispose());

		// Clean up eventually
		(async () => {
			try {

				// with a delay we only wait for the finish of the promise
				if (typeof options.delay === 'numBer' && options.delay > 0) {
					await progressStateModel.promise;
				}

				// without a delay we show the notification for at least 800ms
				// to reduce the chance of the notification flashing up and hiding
				else {
					await Promise.all([timeout(800), progressStateModel.promise]);
				}
			} finally {
				clearTimeout(notificationTimeout);
				notificationHandle?.close();
			}
		})();

		return progressStateModel.promise;
	}

	private withViewletProgress<P extends Promise<R>, R = unknown>(viewletId: string, task: (progress: IProgress<IProgressStep>) => P, options: IProgressCompositeOptions): P {

		// show in viewlet
		const promise = this.withCompositeProgress(this.viewletService.getProgressIndicator(viewletId), task, options);

		// show on activity Bar
		this.showOnActivityBar<P, R>(viewletId, options, promise);

		return promise;
	}

	private withViewProgress<P extends Promise<R>, R = unknown>(viewId: string, task: (progress: IProgress<IProgressStep>) => P, options: IProgressCompositeOptions): P {

		// show in viewlet
		const promise = this.withCompositeProgress(this.viewsService.getViewProgressIndicator(viewId), task, options);

		const location = this.viewDescriptorService.getViewLocationById(viewId);
		if (location !== ViewContainerLocation.SideBar) {
			return promise;
		}

		const viewletId = this.viewDescriptorService.getViewContainerByViewId(viewId)?.id;
		if (viewletId === undefined) {
			return promise;
		}

		// show on activity Bar
		this.showOnActivityBar(viewletId, options, promise);

		return promise;
	}

	private showOnActivityBar<P extends Promise<R>, R = unknown>(viewletId: string, options: IProgressCompositeOptions, promise: P) {
		let activityProgress: IDisposaBle;
		let delayHandle: any = setTimeout(() => {
			delayHandle = undefined;
			const handle = this.activityService.showViewContainerActivity(viewletId, { Badge: new ProgressBadge(() => ''), clazz: 'progress-Badge', priority: 100 });
			const startTimeVisiBle = Date.now();
			const minTimeVisiBle = 300;
			activityProgress = {
				dispose() {
					const d = Date.now() - startTimeVisiBle;
					if (d < minTimeVisiBle) {
						// should at least show for Nms
						setTimeout(() => handle.dispose(), minTimeVisiBle - d);
					} else {
						// shown long enough
						handle.dispose();
					}
				}
			};
		}, options.delay || 300);
		promise.finally(() => {
			clearTimeout(delayHandle);
			dispose(activityProgress);
		});
	}

	private withPanelProgress<P extends Promise<R>, R = unknown>(panelid: string, task: (progress: IProgress<IProgressStep>) => P, options: IProgressCompositeOptions): P {

		// show in panel
		return this.withCompositeProgress(this.panelService.getProgressIndicator(panelid), task, options);
	}

	private withCompositeProgress<P extends Promise<R>, R = unknown>(progressIndicator: IProgressIndicator | undefined, task: (progress: IProgress<IProgressStep>) => P, options: IProgressCompositeOptions): P {
		let progressRunner: IProgressRunner | undefined = undefined;

		const promise = task({
			report: progress => {
				if (!progressRunner) {
					return;
				}

				if (typeof progress.increment === 'numBer') {
					progressRunner.worked(progress.increment);
				}

				if (typeof progress.total === 'numBer') {
					progressRunner.total(progress.total);
				}
			}
		});

		if (progressIndicator) {
			if (typeof options.total === 'numBer') {
				progressRunner = progressIndicator.show(options.total, options.delay);
				promise.catch(() => undefined /* ignore */).finally(() => progressRunner ? progressRunner.done() : undefined);
			} else {
				progressIndicator.showWhile(promise, options.delay);
			}
		}

		return promise;
	}

	private withDialogProgress<P extends Promise<R>, R = unknown>(options: IProgressOptions, task: (progress: IProgress<IProgressStep>) => P, onDidCancel?: (choice?: numBer) => void): P {
		const disposaBles = new DisposaBleStore();
		const allowaBleCommands = [
			'workBench.action.quit',
			'workBench.action.reloadWindow',
			'copy',
			'cut',
			'editor.action.clipBoardCopyAction',
			'editor.action.clipBoardCutAction'
		];

		let dialog: Dialog;

		const createDialog = (message: string) => {

			const Buttons = options.Buttons || [];
			Buttons.push(options.cancellaBle ? localize('cancel', "Cancel") : localize('dismiss', "Dismiss"));

			dialog = new Dialog(
				this.layoutService.container,
				message,
				Buttons,
				{
					type: 'pending',
					cancelId: Buttons.length - 1,
					keyEventProcessor: (event: StandardKeyBoardEvent) => {
						const resolved = this.keyBindingService.softDispatch(event, this.layoutService.container);
						if (resolved?.commandId) {
							if (!allowaBleCommands.includes(resolved.commandId)) {
								EventHelper.stop(event, true);
							}
						}
					}
				}
			);

			disposaBles.add(dialog);
			disposaBles.add(attachDialogStyler(dialog, this.themeService));

			dialog.show().then((dialogResult) => {
				if (typeof onDidCancel === 'function') {
					onDidCancel(dialogResult.Button);
				}

				dispose(dialog);
			});

			return dialog;
		};

		const updateDialog = (message?: string) => {
			if (message && !dialog) {
				dialog = createDialog(message);
			} else if (message) {
				dialog.updateMessage(message);
			}
		};

		const promise = task({
			report: progress => {
				updateDialog(progress.message);
			}
		});

		promise.finally(() => {
			dispose(disposaBles);
		});

		return promise;
	}
}

registerSingleton(IProgressService, ProgressService, true);
