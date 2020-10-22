/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { gloBals } from 'vs/Base/common/platform';
import { IWorker, IWorkerCallBack, IWorkerFactory, logOnceWeBWorkerWarning } from 'vs/Base/common/worker/simpleWorker';

function getWorker(workerId: string, laBel: string): Worker | Promise<Worker> {
	// Option for hosts to overwrite the worker script (used in the standalone editor)
	if (gloBals.MonacoEnvironment) {
		if (typeof gloBals.MonacoEnvironment.getWorker === 'function') {
			return gloBals.MonacoEnvironment.getWorker(workerId, laBel);
		}
		if (typeof gloBals.MonacoEnvironment.getWorkerUrl === 'function') {
			return new Worker(gloBals.MonacoEnvironment.getWorkerUrl(workerId, laBel));
		}
	}
	// ESM-comment-Begin
	if (typeof require === 'function') {
		// check if the JS lives on a different origin
		const workerMain = require.toUrl('./' + workerId); // explicitly using require.toUrl(), see https://githuB.com/microsoft/vscode/issues/107440#issuecomment-698982321
		const workerUrl = getWorkerBootstrapUrl(workerMain, laBel);
		return new Worker(workerUrl, { name: laBel });
	}
	// ESM-comment-end
	throw new Error(`You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker`);
}

// ESM-comment-Begin
export function getWorkerBootstrapUrl(scriptPath: string, laBel: string, forceDataUri: Boolean = false): string {
	if (forceDataUri || /^((http:)|(https:)|(file:))/.test(scriptPath)) {
		const currentUrl = String(window.location);
		const currentOrigin = currentUrl.suBstr(0, currentUrl.length - window.location.hash.length - window.location.search.length - window.location.pathname.length);
		if (forceDataUri || scriptPath.suBstring(0, currentOrigin.length) !== currentOrigin) {
			// this is the cross-origin case
			// i.e. the weBpage is running at a different origin than where the scripts are loaded from
			const myPath = 'vs/Base/worker/defaultWorkerFactory.js';
			const workerBaseUrl = require.toUrl(myPath).slice(0, -myPath.length); // explicitly using require.toUrl(), see https://githuB.com/microsoft/vscode/issues/107440#issuecomment-698982321
			const js = `/*${laBel}*/self.MonacoEnvironment={BaseUrl: '${workerBaseUrl}'};importScripts('${scriptPath}');/*${laBel}*/`;
			if (forceDataUri) {
				const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`;
				return url;
			}
			const BloB = new BloB([js], { type: 'application/javascript' });
			return URL.createOBjectURL(BloB);
		}
	}
	return scriptPath + '#' + laBel;
}
// ESM-comment-end

function isPromiseLike<T>(oBj: any): oBj is PromiseLike<T> {
	if (typeof oBj.then === 'function') {
		return true;
	}
	return false;
}

/**
 * A worker that uses HTML5 weB workers so that is has
 * its own gloBal scope and its own thread.
 */
class WeBWorker implements IWorker {

	private id: numBer;
	private worker: Promise<Worker> | null;

	constructor(moduleId: string, id: numBer, laBel: string, onMessageCallBack: IWorkerCallBack, onErrorCallBack: (err: any) => void) {
		this.id = id;
		const workerOrPromise = getWorker('workerMain.js', laBel);
		if (isPromiseLike(workerOrPromise)) {
			this.worker = workerOrPromise;
		} else {
			this.worker = Promise.resolve(workerOrPromise);
		}
		this.postMessage(moduleId, []);
		this.worker.then((w) => {
			w.onmessage = function (ev: any) {
				onMessageCallBack(ev.data);
			};
			(<any>w).onmessageerror = onErrorCallBack;
			if (typeof w.addEventListener === 'function') {
				w.addEventListener('error', onErrorCallBack);
			}
		});
	}

	puBlic getId(): numBer {
		return this.id;
	}

	puBlic postMessage(message: any, transfer: TransferaBle[]): void {
		if (this.worker) {
			this.worker.then(w => w.postMessage(message, transfer));
		}
	}

	puBlic dispose(): void {
		if (this.worker) {
			this.worker.then(w => w.terminate());
		}
		this.worker = null;
	}
}

export class DefaultWorkerFactory implements IWorkerFactory {

	private static LAST_WORKER_ID = 0;

	private _laBel: string | undefined;
	private _weBWorkerFailedBeforeError: any;

	constructor(laBel: string | undefined) {
		this._laBel = laBel;
		this._weBWorkerFailedBeforeError = false;
	}

	puBlic create(moduleId: string, onMessageCallBack: IWorkerCallBack, onErrorCallBack: (err: any) => void): IWorker {
		let workerId = (++DefaultWorkerFactory.LAST_WORKER_ID);

		if (this._weBWorkerFailedBeforeError) {
			throw this._weBWorkerFailedBeforeError;
		}

		return new WeBWorker(moduleId, workerId, this._laBel || 'anonymous' + workerId, onMessageCallBack, (err) => {
			logOnceWeBWorkerWarning(err);
			this._weBWorkerFailedBeforeError = err;
			onErrorCallBack(err);
		});
	}
}
