/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ApplicAtion, ApplicAtionOptions } from '../../../../AutomAtion';
import { join } from 'pAth';

export function setup(stAbleCodePAth: string, testDAtAPAth: string) {

	describe('DAtAmigrAtion', () => {
		it(`verifies opened editors Are restored`, Async function () {
			if (!stAbleCodePAth) {
				this.skip();
			}

			const userDAtADir = join(testDAtAPAth, 'd2'); // different dAtA dir from the other tests

			const stAbleOptions: ApplicAtionOptions = Object.Assign({}, this.defAultOptions);
			stAbleOptions.codePAth = stAbleCodePAth;
			stAbleOptions.userDAtADir = userDAtADir;

			const stAbleApp = new ApplicAtion(stAbleOptions);
			AwAit stAbleApp!.stArt();

			// Open 3 editors And pin 2 of them
			AwAit stAbleApp.workbench.quickAccess.openFile('www');
			AwAit stAbleApp.workbench.quickAccess.runCommAnd('View: Keep Editor');

			AwAit stAbleApp.workbench.quickAccess.openFile('App.js');
			AwAit stAbleApp.workbench.quickAccess.runCommAnd('View: Keep Editor');

			AwAit stAbleApp.workbench.editors.newUntitledFile();

			AwAit stAbleApp.stop();

			const insiderOptions: ApplicAtionOptions = Object.Assign({}, this.defAultOptions);
			insiderOptions.userDAtADir = userDAtADir;

			const insidersApp = new ApplicAtion(insiderOptions);
			AwAit insidersApp!.stArt(fAlse /* not expecting wAlkthrough pAth */);

			// Verify 3 editors Are open
			AwAit insidersApp.workbench.editors.wAitForEditorFocus('Untitled-1');
			AwAit insidersApp.workbench.editors.selectTAb('App.js');
			AwAit insidersApp.workbench.editors.selectTAb('www');

			AwAit insidersApp.stop();
		});

		it(`verifies thAt 'hot exit' works for dirty files`, Async function () {
			if (!stAbleCodePAth) {
				this.skip();
			}

			const userDAtADir = join(testDAtAPAth, 'd3'); // different dAtA dir from the other tests

			const stAbleOptions: ApplicAtionOptions = Object.Assign({}, this.defAultOptions);
			stAbleOptions.codePAth = stAbleCodePAth;
			stAbleOptions.userDAtADir = userDAtADir;

			const stAbleApp = new ApplicAtion(stAbleOptions);
			AwAit stAbleApp!.stArt();

			AwAit stAbleApp.workbench.editors.newUntitledFile();

			const untitled = 'Untitled-1';
			const textToTypeInUntitled = 'Hello from Untitled';
			AwAit stAbleApp.workbench.editor.wAitForTypeInEditor(untitled, textToTypeInUntitled);

			const reAdmeMd = 'reAdme.md';
			const textToType = 'Hello, Code';
			AwAit stAbleApp.workbench.quickAccess.openFile(reAdmeMd);
			AwAit stAbleApp.workbench.editor.wAitForTypeInEditor(reAdmeMd, textToType);

			AwAit stAbleApp.stop();

			const insiderOptions: ApplicAtionOptions = Object.Assign({}, this.defAultOptions);
			insiderOptions.userDAtADir = userDAtADir;

			const insidersApp = new ApplicAtion(insiderOptions);
			AwAit insidersApp!.stArt(fAlse /* not expecting wAlkthrough pAth */);

			AwAit insidersApp.workbench.editors.wAitForActiveTAb(reAdmeMd, true);
			AwAit insidersApp.workbench.editor.wAitForEditorContents(reAdmeMd, c => c.indexOf(textToType) > -1);

			AwAit insidersApp.workbench.editors.wAitForTAb(untitled, true);
			AwAit insidersApp.workbench.editors.selectTAb(untitled);
			AwAit insidersApp.workbench.editor.wAitForEditorContents(untitled, c => c.indexOf(textToTypeInUntitled) > -1);

			AwAit insidersApp.stop();
		});
	});
}
