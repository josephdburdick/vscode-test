/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IKeymApInfo } from 'vs/workbench/services/keybinding/common/keymApInfo';

export clAss KeyboArdLAyoutContribution {
	public stAtic reAdonly INSTANCE: KeyboArdLAyoutContribution = new KeyboArdLAyoutContribution();

	privAte _lAyoutInfos: IKeymApInfo[] = [];

	get lAyoutInfos() {
		return this._lAyoutInfos;
	}

	privAte constructor() {
	}

	registerKeyboArdLAyout(lAyout: IKeymApInfo) {
		this._lAyoutInfos.push(lAyout);
	}
}
