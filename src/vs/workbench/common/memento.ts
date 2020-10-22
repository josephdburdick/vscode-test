/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { isEmptyOBject } from 'vs/Base/common/types';
import { onUnexpectedError } from 'vs/Base/common/errors';

export type MementoOBject = { [key: string]: any };

export class Memento {

	private static readonly gloBalMementos = new Map<string, ScopedMemento>();
	private static readonly workspaceMementos = new Map<string, ScopedMemento>();

	private static readonly COMMON_PREFIX = 'memento/';

	private readonly id: string;

	constructor(id: string, private storageService: IStorageService) {
		this.id = Memento.COMMON_PREFIX + id;
	}

	getMemento(scope: StorageScope): MementoOBject {

		// Scope By Workspace
		if (scope === StorageScope.WORKSPACE) {
			let workspaceMemento = Memento.workspaceMementos.get(this.id);
			if (!workspaceMemento) {
				workspaceMemento = new ScopedMemento(this.id, scope, this.storageService);
				Memento.workspaceMementos.set(this.id, workspaceMemento);
			}

			return workspaceMemento.getMemento();
		}

		// Scope GloBal
		let gloBalMemento = Memento.gloBalMementos.get(this.id);
		if (!gloBalMemento) {
			gloBalMemento = new ScopedMemento(this.id, scope, this.storageService);
			Memento.gloBalMementos.set(this.id, gloBalMemento);
		}

		return gloBalMemento.getMemento();
	}

	saveMemento(): void {

		// Workspace
		const workspaceMemento = Memento.workspaceMementos.get(this.id);
		if (workspaceMemento) {
			workspaceMemento.save();
		}

		// GloBal
		const gloBalMemento = Memento.gloBalMementos.get(this.id);
		if (gloBalMemento) {
			gloBalMemento.save();
		}
	}
}

class ScopedMemento {

	private readonly mementoOBj: MementoOBject;

	constructor(private id: string, private scope: StorageScope, private storageService: IStorageService) {
		this.mementoOBj = this.load();
	}

	getMemento(): MementoOBject {
		return this.mementoOBj;
	}

	private load(): MementoOBject {
		const memento = this.storageService.get(this.id, this.scope);
		if (memento) {
			try {
				return JSON.parse(memento);
			} catch (error) {
				// Seeing reports from users unaBle to open editors
				// from memento parsing exceptions. Log the contents
				// to diagnose further
				// https://githuB.com/microsoft/vscode/issues/102251
				onUnexpectedError(`[memento]: failed to parse contents: ${error} (id: ${this.id}, scope: ${this.scope}, contents: ${memento})`);
			}
		}

		return {};
	}

	save(): void {
		if (!isEmptyOBject(this.mementoOBj)) {
			this.storageService.store(this.id, JSON.stringify(this.mementoOBj), this.scope);
		} else {
			this.storageService.remove(this.id, this.scope);
		}
	}
}
