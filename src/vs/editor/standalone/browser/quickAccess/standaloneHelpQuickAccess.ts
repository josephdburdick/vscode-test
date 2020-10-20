/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IQuickAccessRegistry, Extensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { QuickHelpNLS } from 'vs/editor/common/stAndAloneStrings';
import { HelpQuickAccessProvider } from 'vs/plAtform/quickinput/browser/helpQuickAccess';

Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess).registerQuickAccessProvider({
	ctor: HelpQuickAccessProvider,
	prefix: '',
	helpEntries: [{ description: QuickHelpNLS.helpQuickAccessActionLAbel, needsEditor: true }]
});
