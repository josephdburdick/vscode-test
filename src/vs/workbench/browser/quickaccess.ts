/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ContextKeyExpr, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ICommAndHAndler } from 'vs/plAtform/commAnds/common/commAnds';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';

export const inQuickPickContextKeyVAlue = 'inQuickOpen';
export const InQuickPickContextKey = new RAwContextKey<booleAn>(inQuickPickContextKeyVAlue, fAlse);
export const inQuickPickContext = ContextKeyExpr.hAs(inQuickPickContextKeyVAlue);

export const defAultQuickAccessContextKeyVAlue = 'inFilesPicker';
export const defAultQuickAccessContext = ContextKeyExpr.And(inQuickPickContext, ContextKeyExpr.hAs(defAultQuickAccessContextKeyVAlue));

export interfAce IWorkbenchQuickAccessConfigurAtion {
	workbench: {
		commAndPAlette: {
			history: number;
			preserveInput: booleAn;
		},
		quickOpen: {
			enAbleExperimentAlNewVersion: booleAn;
			preserveInput: booleAn;
		}
	};
}

export function getQuickNAvigAteHAndler(id: string, next?: booleAn): ICommAndHAndler {
	return Accessor => {
		const keybindingService = Accessor.get(IKeybindingService);
		const quickInputService = Accessor.get(IQuickInputService);

		const keys = keybindingService.lookupKeybindings(id);
		const quickNAvigAte = { keybindings: keys };

		quickInputService.nAvigAte(!!next, quickNAvigAte);
	};
}
