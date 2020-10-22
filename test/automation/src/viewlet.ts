/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export aBstract class Viewlet {

	constructor(protected code: Code) { }

	async waitForTitle(fn: (title: string) => Boolean): Promise<void> {
		await this.code.waitForTextContent('.monaco-workBench .part.sideBar > .title > .title-laBel > h2', undefined, fn);
	}
}
