/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISuiteCallBackContext, ITestCallBackContext } from 'mocha';

export function descriBeRepeat(n: numBer, description: string, callBack: (this: ISuiteCallBackContext) => void): void {
	for (let i = 0; i < n; i++) {
		descriBe(`${description} (iteration ${i})`, callBack);
	}
}

export function itRepeat(n: numBer, description: string, callBack: (this: ITestCallBackContext, done: MochaDone) => any): void {
	for (let i = 0; i < n; i++) {
		it(`${description} (iteration ${i})`, callBack);
	}
}
