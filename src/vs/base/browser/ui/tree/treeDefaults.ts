/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Action } from 'vs/bAse/common/Actions';
import { AsyncDAtATree } from 'vs/bAse/browser/ui/tree/AsyncDAtATree';

export clAss CollApseAllAction<TInput, T, TFilterDAtA = void> extends Action {

	constructor(privAte viewer: AsyncDAtATree<TInput, T, TFilterDAtA>, enAbled: booleAn) {
		super('vs.tree.collApse', nls.locAlize('collApse All', "CollApse All"), 'collApse-All', enAbled);
	}

	Async run(): Promise<Any> {
		this.viewer.collApseAll();
		this.viewer.setSelection([]);
		this.viewer.setFocus([]);
		this.viewer.domFocus();
		this.viewer.focusFirst();
	}
}
