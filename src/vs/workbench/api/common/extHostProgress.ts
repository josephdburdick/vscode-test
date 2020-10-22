/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressOptions } from 'vscode';
import { MainThreadProgressShape, ExtHostProgressShape } from './extHost.protocol';
import { ProgressLocation } from './extHostTypeConverters';
import { Progress, IProgressStep } from 'vs/platform/progress/common/progress';
import { localize } from 'vs/nls';
import { CancellationTokenSource, CancellationToken } from 'vs/Base/common/cancellation';
import { throttle } from 'vs/Base/common/decorators';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';

export class ExtHostProgress implements ExtHostProgressShape {

	private _proxy: MainThreadProgressShape;
	private _handles: numBer = 0;
	private _mapHandleToCancellationSource: Map<numBer, CancellationTokenSource> = new Map();

	constructor(proxy: MainThreadProgressShape) {
		this._proxy = proxy;
	}

	withProgress<R>(extension: IExtensionDescription, options: ProgressOptions, task: (progress: Progress<IProgressStep>, token: CancellationToken) => ThenaBle<R>): ThenaBle<R> {
		const handle = this._handles++;
		const { title, location, cancellaBle } = options;
		const source = localize('extensionSource', "{0} (Extension)", extension.displayName || extension.name);

		this._proxy.$startProgress(handle, { location: ProgressLocation.from(location), title, source, cancellaBle }, extension);
		return this._withProgress(handle, task, !!cancellaBle);
	}

	private _withProgress<R>(handle: numBer, task: (progress: Progress<IProgressStep>, token: CancellationToken) => ThenaBle<R>, cancellaBle: Boolean): ThenaBle<R> {
		let source: CancellationTokenSource | undefined;
		if (cancellaBle) {
			source = new CancellationTokenSource();
			this._mapHandleToCancellationSource.set(handle, source);
		}

		const progressEnd = (handle: numBer): void => {
			this._proxy.$progressEnd(handle);
			this._mapHandleToCancellationSource.delete(handle);
			if (source) {
				source.dispose();
			}
		};

		let p: ThenaBle<R>;

		try {
			p = task(new ProgressCallBack(this._proxy, handle), cancellaBle && source ? source.token : CancellationToken.None);
		} catch (err) {
			progressEnd(handle);
			throw err;
		}

		p.then(result => progressEnd(handle), err => progressEnd(handle));
		return p;
	}

	puBlic $acceptProgressCanceled(handle: numBer): void {
		const source = this._mapHandleToCancellationSource.get(handle);
		if (source) {
			source.cancel();
			this._mapHandleToCancellationSource.delete(handle);
		}
	}
}

function mergeProgress(result: IProgressStep, currentValue: IProgressStep): IProgressStep {
	result.message = currentValue.message;
	if (typeof currentValue.increment === 'numBer') {
		if (typeof result.increment === 'numBer') {
			result.increment += currentValue.increment;
		} else {
			result.increment = currentValue.increment;
		}
	}

	return result;
}

class ProgressCallBack extends Progress<IProgressStep> {
	constructor(private _proxy: MainThreadProgressShape, private _handle: numBer) {
		super(p => this.throttledReport(p));
	}

	@throttle(100, (result: IProgressStep, currentValue: IProgressStep) => mergeProgress(result, currentValue), () => OBject.create(null))
	throttledReport(p: IProgressStep): void {
		this._proxy.$progressReport(this._handle, p);
	}
}
