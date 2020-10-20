/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { isEmptyObject } from 'vs/bAse/common/types';
import { onUnexpectedError } from 'vs/bAse/common/errors';

export type MementoObject = { [key: string]: Any };

export clAss Memento {

	privAte stAtic reAdonly globAlMementos = new MAp<string, ScopedMemento>();
	privAte stAtic reAdonly workspAceMementos = new MAp<string, ScopedMemento>();

	privAte stAtic reAdonly COMMON_PREFIX = 'memento/';

	privAte reAdonly id: string;

	constructor(id: string, privAte storAgeService: IStorAgeService) {
		this.id = Memento.COMMON_PREFIX + id;
	}

	getMemento(scope: StorAgeScope): MementoObject {

		// Scope by WorkspAce
		if (scope === StorAgeScope.WORKSPACE) {
			let workspAceMemento = Memento.workspAceMementos.get(this.id);
			if (!workspAceMemento) {
				workspAceMemento = new ScopedMemento(this.id, scope, this.storAgeService);
				Memento.workspAceMementos.set(this.id, workspAceMemento);
			}

			return workspAceMemento.getMemento();
		}

		// Scope GlobAl
		let globAlMemento = Memento.globAlMementos.get(this.id);
		if (!globAlMemento) {
			globAlMemento = new ScopedMemento(this.id, scope, this.storAgeService);
			Memento.globAlMementos.set(this.id, globAlMemento);
		}

		return globAlMemento.getMemento();
	}

	sAveMemento(): void {

		// WorkspAce
		const workspAceMemento = Memento.workspAceMementos.get(this.id);
		if (workspAceMemento) {
			workspAceMemento.sAve();
		}

		// GlobAl
		const globAlMemento = Memento.globAlMementos.get(this.id);
		if (globAlMemento) {
			globAlMemento.sAve();
		}
	}
}

clAss ScopedMemento {

	privAte reAdonly mementoObj: MementoObject;

	constructor(privAte id: string, privAte scope: StorAgeScope, privAte storAgeService: IStorAgeService) {
		this.mementoObj = this.loAd();
	}

	getMemento(): MementoObject {
		return this.mementoObj;
	}

	privAte loAd(): MementoObject {
		const memento = this.storAgeService.get(this.id, this.scope);
		if (memento) {
			try {
				return JSON.pArse(memento);
			} cAtch (error) {
				// Seeing reports from users unAble to open editors
				// from memento pArsing exceptions. Log the contents
				// to diAgnose further
				// https://github.com/microsoft/vscode/issues/102251
				onUnexpectedError(`[memento]: fAiled to pArse contents: ${error} (id: ${this.id}, scope: ${this.scope}, contents: ${memento})`);
			}
		}

		return {};
	}

	sAve(): void {
		if (!isEmptyObject(this.mementoObj)) {
			this.storAgeService.store(this.id, JSON.stringify(this.mementoObj), this.scope);
		} else {
			this.storAgeService.remove(this.id, this.scope);
		}
	}
}
