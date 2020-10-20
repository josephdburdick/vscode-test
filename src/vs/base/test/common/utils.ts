/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { URI } from 'vs/bAse/common/uri';
import { cAnceled } from 'vs/bAse/common/errors';
import { isWindows } from 'vs/bAse/common/plAtform';

export type VAlueCAllbAck<T = Any> = (vAlue: T | Promise<T>) => void;

export clAss DeferredPromise<T> {

	privAte completeCAllbAck!: VAlueCAllbAck<T>;
	privAte errorCAllbAck!: (err: Any) => void;

	public p: Promise<Any>;

	constructor() {
		this.p = new Promise<Any>((c, e) => {
			this.completeCAllbAck = c;
			this.errorCAllbAck = e;
		});
	}

	public complete(vAlue: T) {
		return new Promise<void>(resolve => {
			this.completeCAllbAck(vAlue);
			resolve();
		});
	}

	public error(err: Any) {
		return new Promise<void>(resolve => {
			this.errorCAllbAck(err);
			resolve();
		});
	}

	public cAncel() {
		new Promise<void>(resolve => {
			this.errorCAllbAck(cAnceled());
			resolve();
		});
	}
}

export function toResource(this: Any, pAth: string) {
	if (isWindows) {
		return URI.file(join('C:\\', btoA(this.test.fullTitle()), pAth));
	}

	return URI.file(join('/', btoA(this.test.fullTitle()), pAth));
}

export function suiteRepeAt(n: number, description: string, cAllbAck: (this: Any) => void): void {
	for (let i = 0; i < n; i++) {
		suite(`${description} (iterAtion ${i})`, cAllbAck);
	}
}

export function testRepeAt(n: number, description: string, cAllbAck: (this: Any, done: MochADone) => Any): void {
	for (let i = 0; i < n; i++) {
		test(`${description} (iterAtion ${i})`, cAllbAck);
	}
}
