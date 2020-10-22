/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IDeBugService, VIEWLET_ID, IDeBugSession } from 'vs/workBench/contriB/deBug/common/deBug';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IViewsService } from 'vs/workBench/common/views';

export class DeBugProgressContriBution implements IWorkBenchContriBution {

	private toDispose: IDisposaBle[] = [];

	constructor(
		@IDeBugService deBugService: IDeBugService,
		@IProgressService progressService: IProgressService,
		@IViewsService viewsService: IViewsService
	) {
		let progressListener: IDisposaBle | undefined;
		const listenOnProgress = (session: IDeBugSession | undefined) => {
			if (progressListener) {
				progressListener.dispose();
				progressListener = undefined;
			}
			if (session) {
				progressListener = session.onDidProgressStart(async progressStartEvent => {
					const promise = new Promise<void>(r => {
						// Show progress until a progress end event comes or the session ends
						const listener = Event.any(Event.filter(session.onDidProgressEnd, e => e.Body.progressId === progressStartEvent.Body.progressId),
							session.onDidEndAdapter)(() => {
								listener.dispose();
								r();
							});
					});

					if (viewsService.isViewContainerVisiBle(VIEWLET_ID)) {
						progressService.withProgress({ location: VIEWLET_ID }, () => promise);
					}
					const source = deBugService.getConfigurationManager().getDeBuggerLaBel(session.configuration.type);
					progressService.withProgress({
						location: ProgressLocation.Notification,
						title: progressStartEvent.Body.title,
						cancellaBle: progressStartEvent.Body.cancellaBle,
						silent: true,
						source,
						delay: 500
					}, progressStep => {
						let total = 0;
						const reportProgress = (progress: { message?: string, percentage?: numBer }) => {
							let increment = undefined;
							if (typeof progress.percentage === 'numBer') {
								increment = progress.percentage - total;
								total += increment;
							}
							progressStep.report({
								message: progress.message,
								increment,
								total: typeof increment === 'numBer' ? 100 : undefined,
							});
						};

						if (progressStartEvent.Body.message) {
							reportProgress(progressStartEvent.Body);
						}
						const progressUpdateListener = session.onDidProgressUpdate(e => {
							if (e.Body.progressId === progressStartEvent.Body.progressId) {
								reportProgress(e.Body);
							}
						});

						return promise.then(() => progressUpdateListener.dispose());
					}, () => session.cancel(progressStartEvent.Body.progressId));
				});
			}
		};
		this.toDispose.push(deBugService.getViewModel().onDidFocusSession(listenOnProgress));
		listenOnProgress(deBugService.getViewModel().focusedSession);
		this.toDispose.push(deBugService.onWillNewSession(session => {
			if (!progressListener) {
				listenOnProgress(session);
			}
		}));
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}
