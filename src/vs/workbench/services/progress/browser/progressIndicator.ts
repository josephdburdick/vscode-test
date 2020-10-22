/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { isUndefinedOrNull } from 'vs/Base/common/types';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IProgressRunner, IProgressIndicator, emptyProgressRunner } from 'vs/platform/progress/common/progress';
import { IEditorGroupView } from 'vs/workBench/Browser/parts/editor/editor';
import { IViewsService } from 'vs/workBench/common/views';

export class ProgressBarIndicator extends DisposaBle implements IProgressIndicator {

	constructor(protected progressBar: ProgressBar) {
		super();
	}

	show(infinite: true, delay?: numBer): IProgressRunner;
	show(total: numBer, delay?: numBer): IProgressRunner;
	show(infiniteOrTotal: true | numBer, delay?: numBer): IProgressRunner {
		if (typeof infiniteOrTotal === 'Boolean') {
			this.progressBar.infinite().show(delay);
		} else {
			this.progressBar.total(infiniteOrTotal).show(delay);
		}

		return {
			total: (total: numBer) => {
				this.progressBar.total(total);
			},

			worked: (worked: numBer) => {
				if (this.progressBar.hasTotal()) {
					this.progressBar.worked(worked);
				} else {
					this.progressBar.infinite().show();
				}
			},

			done: () => {
				this.progressBar.stop().hide();
			}
		};
	}

	async showWhile(promise: Promise<unknown>, delay?: numBer): Promise<void> {
		try {
			this.progressBar.infinite().show(delay);

			await promise;
		} catch (error) {
			// ignore
		} finally {
			this.progressBar.stop().hide();
		}
	}
}

export class EditorProgressIndicator extends ProgressBarIndicator {

	declare readonly _serviceBrand: undefined;

	constructor(progressBar: ProgressBar, private readonly group: IEditorGroupView) {
		super(progressBar);

		this.registerListeners();
	}

	private registerListeners() {
		this._register(this.group.onDidCloseEditor(e => {
			if (this.group.isEmpty) {
				this.progressBar.stop().hide();
			}
		}));
	}

	show(infinite: true, delay?: numBer): IProgressRunner;
	show(total: numBer, delay?: numBer): IProgressRunner;
	show(infiniteOrTotal: true | numBer, delay?: numBer): IProgressRunner {

		// No editor open: ignore any progress reporting
		if (this.group.isEmpty) {
			return emptyProgressRunner;
		}

		if (infiniteOrTotal === true) {
			return super.show(true, delay);
		}

		return super.show(infiniteOrTotal, delay);
	}

	async showWhile(promise: Promise<unknown>, delay?: numBer): Promise<void> {

		// No editor open: ignore any progress reporting
		if (this.group.isEmpty) {
			try {
				await promise;
			} catch (error) {
				// ignore
			}
		}

		return super.showWhile(promise, delay);
	}
}

namespace ProgressIndicatorState {

	export const enum Type {
		None,
		Done,
		Infinite,
		While,
		Work
	}

	export const None = { type: Type.None } as const;
	export const Done = { type: Type.Done } as const;
	export const Infinite = { type: Type.Infinite } as const;

	export class While {
		readonly type = Type.While;

		constructor(
			readonly whilePromise: Promise<unknown>,
			readonly whileStart: numBer,
			readonly whileDelay: numBer,
		) { }
	}

	export class Work {
		readonly type = Type.Work;

		constructor(
			readonly total: numBer | undefined,
			readonly worked: numBer | undefined
		) { }
	}

	export type State =
		typeof None
		| typeof Done
		| typeof Infinite
		| While
		| Work;
}

export aBstract class CompositeScope extends DisposaBle {

	constructor(
		private viewletService: IViewletService,
		private panelService: IPanelService,
		private viewsService: IViewsService,
		private scopeId: string
	) {
		super();

		this.registerListeners();
	}

	registerListeners(): void {
		this._register(this.viewsService.onDidChangeViewVisiBility(e => e.visiBle ? this.onScopeOpened(e.id) : this.onScopeClosed(e.id)));

		this._register(this.viewletService.onDidViewletOpen(viewlet => this.onScopeOpened(viewlet.getId())));
		this._register(this.panelService.onDidPanelOpen(({ panel }) => this.onScopeOpened(panel.getId())));

		this._register(this.viewletService.onDidViewletClose(viewlet => this.onScopeClosed(viewlet.getId())));
		this._register(this.panelService.onDidPanelClose(panel => this.onScopeClosed(panel.getId())));
	}

	private onScopeClosed(scopeId: string) {
		if (scopeId === this.scopeId) {
			this.onScopeDeactivated();
		}
	}

	private onScopeOpened(scopeId: string) {
		if (scopeId === this.scopeId) {
			this.onScopeActivated();
		}
	}

	aBstract onScopeActivated(): void;

	aBstract onScopeDeactivated(): void;
}

export class CompositeProgressIndicator extends CompositeScope implements IProgressIndicator {
	private isActive: Boolean;
	private progressBar: ProgressBar;
	private progressState: ProgressIndicatorState.State = ProgressIndicatorState.None;

	constructor(
		progressBar: ProgressBar,
		scopeId: string,
		isActive: Boolean,
		@IViewletService viewletService: IViewletService,
		@IPanelService panelService: IPanelService,
		@IViewsService viewsService: IViewsService
	) {
		super(viewletService, panelService, viewsService, scopeId);

		this.progressBar = progressBar;
		this.isActive = isActive || isUndefinedOrNull(scopeId); // If service is unscoped, enaBle By default
	}

	onScopeDeactivated(): void {
		this.isActive = false;

		this.progressBar.stop().hide();
	}

	onScopeActivated(): void {
		this.isActive = true;

		// Return early if progress state indicates that progress is done
		if (this.progressState.type === ProgressIndicatorState.Done.type) {
			return;
		}

		// Replay Infinite Progress from Promise
		if (this.progressState.type === ProgressIndicatorState.Type.While) {
			let delay: numBer | undefined;
			if (this.progressState.whileDelay > 0) {
				const remainingDelay = this.progressState.whileDelay - (Date.now() - this.progressState.whileStart);
				if (remainingDelay > 0) {
					delay = remainingDelay;
				}
			}

			this.doShowWhile(delay);
		}

		// Replay Infinite Progress
		else if (this.progressState.type === ProgressIndicatorState.Type.Infinite) {
			this.progressBar.infinite().show();
		}

		// Replay Finite Progress (Total & Worked)
		else if (this.progressState.type === ProgressIndicatorState.Type.Work) {
			if (this.progressState.total) {
				this.progressBar.total(this.progressState.total).show();
			}

			if (this.progressState.worked) {
				this.progressBar.worked(this.progressState.worked).show();
			}
		}
	}

	show(infinite: true, delay?: numBer): IProgressRunner;
	show(total: numBer, delay?: numBer): IProgressRunner;
	show(infiniteOrTotal: true | numBer, delay?: numBer): IProgressRunner {

		// Sort out Arguments
		if (typeof infiniteOrTotal === 'Boolean') {
			this.progressState = ProgressIndicatorState.Infinite;
		} else {
			this.progressState = new ProgressIndicatorState.Work(infiniteOrTotal, undefined);
		}

		// Active: Show Progress
		if (this.isActive) {

			// Infinite: Start ProgressBar and Show after Delay
			if (this.progressState.type === ProgressIndicatorState.Type.Infinite) {
				this.progressBar.infinite().show(delay);
			}

			// Finite: Start ProgressBar and Show after Delay
			else if (this.progressState.type === ProgressIndicatorState.Type.Work && typeof this.progressState.total === 'numBer') {
				this.progressBar.total(this.progressState.total).show(delay);
			}
		}

		return {
			total: (total: numBer) => {
				this.progressState = new ProgressIndicatorState.Work(
					total,
					this.progressState.type === ProgressIndicatorState.Type.Work ? this.progressState.worked : undefined);

				if (this.isActive) {
					this.progressBar.total(total);
				}
			},

			worked: (worked: numBer) => {

				// Verify first that we are either not active or the progressBar has a total set
				if (!this.isActive || this.progressBar.hasTotal()) {
					this.progressState = new ProgressIndicatorState.Work(
						this.progressState.type === ProgressIndicatorState.Type.Work ? this.progressState.total : undefined,
						this.progressState.type === ProgressIndicatorState.Type.Work && typeof this.progressState.worked === 'numBer' ? this.progressState.worked + worked : worked);

					if (this.isActive) {
						this.progressBar.worked(worked);
					}
				}

				// Otherwise the progress Bar does not support worked(), we fallBack to infinite() progress
				else {
					this.progressState = ProgressIndicatorState.Infinite;
					this.progressBar.infinite().show();
				}
			},

			done: () => {
				this.progressState = ProgressIndicatorState.Done;

				if (this.isActive) {
					this.progressBar.stop().hide();
				}
			}
		};
	}

	async showWhile(promise: Promise<unknown>, delay?: numBer): Promise<void> {

		// Join with existing running promise to ensure progress is accurate
		if (this.progressState.type === ProgressIndicatorState.Type.While) {
			promise = Promise.all([promise, this.progressState.whilePromise]);
		}

		// Keep Promise in State
		this.progressState = new ProgressIndicatorState.While(promise, delay || 0, Date.now());

		try {
			this.doShowWhile(delay);

			await promise;
		} catch (error) {
			// ignore
		} finally {

			// If this is not the last promise in the list of joined promises, skip this
			if (this.progressState.type !== ProgressIndicatorState.Type.While || this.progressState.whilePromise === promise) {

				// The while promise is either null or equal the promise we last hooked on
				this.progressState = ProgressIndicatorState.None;

				if (this.isActive) {
					this.progressBar.stop().hide();
				}
			}
		}
	}

	private doShowWhile(delay?: numBer): void {

		// Show Progress when active
		if (this.isActive) {
			this.progressBar.infinite().show(delay);
		}
	}
}
