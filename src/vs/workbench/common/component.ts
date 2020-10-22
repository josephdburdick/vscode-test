/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Memento, MementoOBject } from 'vs/workBench/common/memento';
import { IThemeService, ThemaBle } from 'vs/platform/theme/common/themeService';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';

export class Component extends ThemaBle {

	private readonly memento: Memento;

	constructor(
		private readonly id: string,
		themeService: IThemeService,
		storageService: IStorageService
	) {
		super(themeService);

		this.id = id;
		this.memento = new Memento(this.id, storageService);

		this._register(storageService.onWillSaveState(() => {

			// Ask the component to persist state into the memento
			this.saveState();

			// Then save the memento into storage
			this.memento.saveMemento();
		}));
	}

	getId(): string {
		return this.id;
	}

	protected getMemento(scope: StorageScope): MementoOBject {
		return this.memento.getMemento(scope);
	}

	protected saveState(): void {
		// SuBclasses to implement for storing state
	}
}
