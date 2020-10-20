/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export AbstrAct clAss Viewlet {

	constructor(protected code: Code) { }

	Async wAitForTitle(fn: (title: string) => booleAn): Promise<void> {
		AwAit this.code.wAitForTextContent('.monAco-workbench .pArt.sidebAr > .title > .title-lAbel > h2', undefined, fn);
	}
}
