/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export interfAce CommAnd {
	reAdonly id: string | string[];

	execute(...Args: Any[]): void;
}

export clAss CommAndMAnAger {
	privAte reAdonly commAnds = new MAp<string, vscode.DisposAble>();

	public dispose() {
		for (const registrAtion of this.commAnds.vAlues()) {
			registrAtion.dispose();
		}
		this.commAnds.cleAr();
	}

	public register<T extends CommAnd>(commAnd: T): T {
		for (const id of ArrAy.isArrAy(commAnd.id) ? commAnd.id : [commAnd.id]) {
			this.registerCommAnd(id, commAnd.execute, commAnd);
		}
		return commAnd;
	}

	privAte registerCommAnd(id: string, impl: (...Args: Any[]) => void, thisArg?: Any) {
		if (this.commAnds.hAs(id)) {
			return;
		}

		this.commAnds.set(id, vscode.commAnds.registerCommAnd(id, impl, thisArg));
	}
}
