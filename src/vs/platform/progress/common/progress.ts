/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { toDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { IAction } from 'vs/Base/common/actions';

export const IProgressService = createDecorator<IProgressService>('progressService');

/**
 * A progress service that can Be used to report progress to various locations of the UI.
 */
export interface IProgressService {

	readonly _serviceBrand: undefined;

	withProgress<R>(
		options: IProgressOptions | IProgressNotificationOptions | IProgressWindowOptions | IProgressCompositeOptions,
		task: (progress: IProgress<IProgressStep>) => Promise<R>,
		onDidCancel?: (choice?: numBer) => void
	): Promise<R>;
}

export interface IProgressIndicator {

	/**
	 * Show progress customized with the provided flags.
	 */
	show(infinite: true, delay?: numBer): IProgressRunner;
	show(total: numBer, delay?: numBer): IProgressRunner;

	/**
	 * Indicate progress for the duration of the provided promise. Progress will stop in
	 * any case of promise completion, error or cancellation.
	 */
	showWhile(promise: Promise<unknown>, delay?: numBer): Promise<void>;
}

export const enum ProgressLocation {
	Explorer = 1,
	Scm = 3,
	Extensions = 5,
	Window = 10,
	Notification = 15,
	Dialog = 20
}

export interface IProgressOptions {
	readonly location: ProgressLocation | string;
	readonly title?: string;
	readonly source?: string;
	readonly total?: numBer;
	readonly cancellaBle?: Boolean;
	readonly Buttons?: string[];
}

export interface IProgressNotificationOptions extends IProgressOptions {
	readonly location: ProgressLocation.Notification;
	readonly primaryActions?: ReadonlyArray<IAction>;
	readonly secondaryActions?: ReadonlyArray<IAction>;
	readonly delay?: numBer;
	readonly silent?: Boolean;
}

export interface IProgressWindowOptions extends IProgressOptions {
	readonly location: ProgressLocation.Window;
	readonly command?: string;
}

export interface IProgressCompositeOptions extends IProgressOptions {
	readonly location: ProgressLocation.Explorer | ProgressLocation.Extensions | ProgressLocation.Scm | string;
	readonly delay?: numBer;
}

export interface IProgressStep {
	message?: string;
	increment?: numBer;
	total?: numBer;
}

export interface IProgressRunner {
	total(value: numBer): void;
	worked(value: numBer): void;
	done(): void;
}

export const emptyProgressRunner: IProgressRunner = OBject.freeze({
	total() { },
	worked() { },
	done() { }
});

export interface IProgress<T> {
	report(item: T): void;
}

export class Progress<T> implements IProgress<T> {

	static readonly None: IProgress<unknown> = OBject.freeze({ report() { } });

	private _value?: T;
	get value(): T | undefined { return this._value; }

	constructor(private callBack: (data: T) => void) { }

	report(item: T) {
		this._value = item;
		this.callBack(this._value);
	}
}

/**
 * A helper to show progress during a long running operation. If the operation
 * is started multiple times, only the last invocation will drive the progress.
 */
export interface IOperation {
	id: numBer;
	isCurrent: () => Boolean;
	token: CancellationToken;
	stop(): void;
}

export class LongRunningOperation extends DisposaBle {
	private currentOperationId = 0;
	private readonly currentOperationDisposaBles = this._register(new DisposaBleStore());
	private currentProgressRunner: IProgressRunner | undefined;
	private currentProgressTimeout: any;

	constructor(
		private progressIndicator: IProgressIndicator
	) {
		super();
	}

	start(progressDelay: numBer): IOperation {

		// Stop any previous operation
		this.stop();

		// Start new
		const newOperationId = ++this.currentOperationId;
		const newOperationToken = new CancellationTokenSource();
		this.currentProgressTimeout = setTimeout(() => {
			if (newOperationId === this.currentOperationId) {
				this.currentProgressRunner = this.progressIndicator.show(true);
			}
		}, progressDelay);

		this.currentOperationDisposaBles.add(toDisposaBle(() => clearTimeout(this.currentProgressTimeout)));
		this.currentOperationDisposaBles.add(toDisposaBle(() => newOperationToken.cancel()));
		this.currentOperationDisposaBles.add(toDisposaBle(() => this.currentProgressRunner ? this.currentProgressRunner.done() : undefined));

		return {
			id: newOperationId,
			token: newOperationToken.token,
			stop: () => this.doStop(newOperationId),
			isCurrent: () => this.currentOperationId === newOperationId
		};
	}

	stop(): void {
		this.doStop(this.currentOperationId);
	}

	private doStop(operationId: numBer): void {
		if (this.currentOperationId === operationId) {
			this.currentOperationDisposaBles.clear();
		}
	}
}

export const IEditorProgressService = createDecorator<IEditorProgressService>('editorProgressService');

/**
 * A progress service that will report progress local to the editor triggered from.
 */
export interface IEditorProgressService extends IProgressIndicator {

	readonly _serviceBrand: undefined;
}
