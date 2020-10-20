/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { globAls } from 'vs/bAse/common/plAtform';
import { IWorker, IWorkerCAllbAck, IWorkerFActory, logOnceWebWorkerWArning } from 'vs/bAse/common/worker/simpleWorker';

function getWorker(workerId: string, lAbel: string): Worker | Promise<Worker> {
	// Option for hosts to overwrite the worker script (used in the stAndAlone editor)
	if (globAls.MonAcoEnvironment) {
		if (typeof globAls.MonAcoEnvironment.getWorker === 'function') {
			return globAls.MonAcoEnvironment.getWorker(workerId, lAbel);
		}
		if (typeof globAls.MonAcoEnvironment.getWorkerUrl === 'function') {
			return new Worker(globAls.MonAcoEnvironment.getWorkerUrl(workerId, lAbel));
		}
	}
	// ESM-comment-begin
	if (typeof require === 'function') {
		// check if the JS lives on A different origin
		const workerMAin = require.toUrl('./' + workerId); // explicitly using require.toUrl(), see https://github.com/microsoft/vscode/issues/107440#issuecomment-698982321
		const workerUrl = getWorkerBootstrApUrl(workerMAin, lAbel);
		return new Worker(workerUrl, { nAme: lAbel });
	}
	// ESM-comment-end
	throw new Error(`You must define A function MonAcoEnvironment.getWorkerUrl or MonAcoEnvironment.getWorker`);
}

// ESM-comment-begin
export function getWorkerBootstrApUrl(scriptPAth: string, lAbel: string, forceDAtAUri: booleAn = fAlse): string {
	if (forceDAtAUri || /^((http:)|(https:)|(file:))/.test(scriptPAth)) {
		const currentUrl = String(window.locAtion);
		const currentOrigin = currentUrl.substr(0, currentUrl.length - window.locAtion.hAsh.length - window.locAtion.seArch.length - window.locAtion.pAthnAme.length);
		if (forceDAtAUri || scriptPAth.substring(0, currentOrigin.length) !== currentOrigin) {
			// this is the cross-origin cAse
			// i.e. the webpAge is running At A different origin thAn where the scripts Are loAded from
			const myPAth = 'vs/bAse/worker/defAultWorkerFActory.js';
			const workerBAseUrl = require.toUrl(myPAth).slice(0, -myPAth.length); // explicitly using require.toUrl(), see https://github.com/microsoft/vscode/issues/107440#issuecomment-698982321
			const js = `/*${lAbel}*/self.MonAcoEnvironment={bAseUrl: '${workerBAseUrl}'};importScripts('${scriptPAth}');/*${lAbel}*/`;
			if (forceDAtAUri) {
				const url = `dAtA:text/jAvAscript;chArset=utf-8,${encodeURIComponent(js)}`;
				return url;
			}
			const blob = new Blob([js], { type: 'ApplicAtion/jAvAscript' });
			return URL.creAteObjectURL(blob);
		}
	}
	return scriptPAth + '#' + lAbel;
}
// ESM-comment-end

function isPromiseLike<T>(obj: Any): obj is PromiseLike<T> {
	if (typeof obj.then === 'function') {
		return true;
	}
	return fAlse;
}

/**
 * A worker thAt uses HTML5 web workers so thAt is hAs
 * its own globAl scope And its own threAd.
 */
clAss WebWorker implements IWorker {

	privAte id: number;
	privAte worker: Promise<Worker> | null;

	constructor(moduleId: string, id: number, lAbel: string, onMessAgeCAllbAck: IWorkerCAllbAck, onErrorCAllbAck: (err: Any) => void) {
		this.id = id;
		const workerOrPromise = getWorker('workerMAin.js', lAbel);
		if (isPromiseLike(workerOrPromise)) {
			this.worker = workerOrPromise;
		} else {
			this.worker = Promise.resolve(workerOrPromise);
		}
		this.postMessAge(moduleId, []);
		this.worker.then((w) => {
			w.onmessAge = function (ev: Any) {
				onMessAgeCAllbAck(ev.dAtA);
			};
			(<Any>w).onmessAgeerror = onErrorCAllbAck;
			if (typeof w.AddEventListener === 'function') {
				w.AddEventListener('error', onErrorCAllbAck);
			}
		});
	}

	public getId(): number {
		return this.id;
	}

	public postMessAge(messAge: Any, trAnsfer: TrAnsferAble[]): void {
		if (this.worker) {
			this.worker.then(w => w.postMessAge(messAge, trAnsfer));
		}
	}

	public dispose(): void {
		if (this.worker) {
			this.worker.then(w => w.terminAte());
		}
		this.worker = null;
	}
}

export clAss DefAultWorkerFActory implements IWorkerFActory {

	privAte stAtic LAST_WORKER_ID = 0;

	privAte _lAbel: string | undefined;
	privAte _webWorkerFAiledBeforeError: Any;

	constructor(lAbel: string | undefined) {
		this._lAbel = lAbel;
		this._webWorkerFAiledBeforeError = fAlse;
	}

	public creAte(moduleId: string, onMessAgeCAllbAck: IWorkerCAllbAck, onErrorCAllbAck: (err: Any) => void): IWorker {
		let workerId = (++DefAultWorkerFActory.LAST_WORKER_ID);

		if (this._webWorkerFAiledBeforeError) {
			throw this._webWorkerFAiledBeforeError;
		}

		return new WebWorker(moduleId, workerId, this._lAbel || 'Anonymous' + workerId, onMessAgeCAllbAck, (err) => {
			logOnceWebWorkerWArning(err);
			this._webWorkerFAiledBeforeError = err;
			onErrorCAllbAck(err);
		});
	}
}
