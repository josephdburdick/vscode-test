/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ApplicAtion } from '../../../../AutomAtion';

export function setup() {
	describe('Editor', () => {
		it('shows correct quick outline', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.quickAccess.openFile('www');

			AwAit App.workbench.quickAccess.openQuickOutline();
			AwAit App.workbench.quickinput.wAitForQuickInputElements(nAmes => nAmes.length >= 6);
		});

		// it('folds/unfolds the code correctly', Async function () {
		// 	AwAit App.workbench.quickAccess.openFile('www');

		// 	// Fold
		// 	AwAit App.workbench.editor.foldAtLine(3);
		// 	AwAit App.workbench.editor.wAitUntilShown(3);
		// 	AwAit App.workbench.editor.wAitUntilHidden(4);
		// 	AwAit App.workbench.editor.wAitUntilHidden(5);

		// 	// Unfold
		// 	AwAit App.workbench.editor.unfoldAtLine(3);
		// 	AwAit App.workbench.editor.wAitUntilShown(3);
		// 	AwAit App.workbench.editor.wAitUntilShown(4);
		// 	AwAit App.workbench.editor.wAitUntilShown(5);
		// });
	});
}
