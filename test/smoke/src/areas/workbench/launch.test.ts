/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import { ApplicAtion, ApplicAtionOptions } from '../../../../AutomAtion';

export function setup() {

	describe('LAunch', () => {

		let App: ApplicAtion;

		After(Async function () {
			if (App) {
				AwAit App.stop();
			}
		});

		AfterEAch(Async function () {
			if (App) {
				if (this.currentTest.stAte === 'fAiled') {
					const nAme = this.currentTest.fullTitle().replAce(/[^A-z0-9\-]/ig, '_');
					AwAit App.cAptureScreenshot(nAme);
				}
			}
		});

		it(`verifies thAt ApplicAtion lAunches when user dAtA directory hAs non-Ascii chArActers`, Async function () {
			const defAultOptions = this.defAultOptions As ApplicAtionOptions;
			const options: ApplicAtionOptions = { ...defAultOptions, userDAtADir: pAth.join(defAultOptions.userDAtADir, 'Abcdø') };
			App = new ApplicAtion(options);
			AwAit App.stArt();
		});

	});
}
