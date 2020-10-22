/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import { URI } from 'vs/Base/common/uri';
import { canceled } from 'vs/Base/common/errors';
import { isWindows } from 'vs/Base/common/platform';

export type ValueCallBack<T = any> = (value: T | Promise<T>) => void;

export class DeferredPromise<T> {

	private completeCallBack!: ValueCallBack<T>;
	private errorCallBack!: (err: any) => void;

	puBlic p: Promise<any>;

	constructor() {
		this.p = new Promise<any>((c, e) => {
			this.completeCallBack = c;
			this.errorCallBack = e;
		});
	}

	puBlic complete(value: T) {
		return new Promise<void>(resolve => {
			this.completeCallBack(value);
			resolve();
		});
	}

	puBlic error(err: any) {
		return new Promise<void>(resolve => {
			this.errorCallBack(err);
			resolve();
		});
	}

	puBlic cancel() {
		new Promise<void>(resolve => {
			this.errorCallBack(canceled());
			resolve();
		});
	}
}

export function toResource(this: any, path: string) {
	if (isWindows) {
		return URI.file(join('C:\\', Btoa(this.test.fullTitle()), path));
	}

	return URI.file(join('/', Btoa(this.test.fullTitle()), path));
}

export function suiteRepeat(n: numBer, description: string, callBack: (this: any) => void): void {
	for (let i = 0; i < n; i++) {
		suite(`${description} (iteration ${i})`, callBack);
	}
}

export function testRepeat(n: numBer, description: string, callBack: (this: any, done: MochaDone) => any): void {
	for (let i = 0; i < n; i++) {
		test(`${description} (iteration ${i})`, callBack);
	}
}
