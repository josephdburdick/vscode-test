/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Memento, MementoObject } from 'vs/workbench/common/memento';
import { IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';

export clAss Component extends ThemAble {

	privAte reAdonly memento: Memento;

	constructor(
		privAte reAdonly id: string,
		themeService: IThemeService,
		storAgeService: IStorAgeService
	) {
		super(themeService);

		this.id = id;
		this.memento = new Memento(this.id, storAgeService);

		this._register(storAgeService.onWillSAveStAte(() => {

			// Ask the component to persist stAte into the memento
			this.sAveStAte();

			// Then sAve the memento into storAge
			this.memento.sAveMemento();
		}));
	}

	getId(): string {
		return this.id;
	}

	protected getMemento(scope: StorAgeScope): MementoObject {
		return this.memento.getMemento(scope);
	}

	protected sAveStAte(): void {
		// SubclAsses to implement for storing stAte
	}
}
