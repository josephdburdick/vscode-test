/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { EditorOptions, IEditorInputFActoryRegistry, Extensions As EditorExtensions } from 'vs/workbench/common/editor';
import { URI } from 'vs/bAse/common/uri';
import { workbenchInstAntiAtionService, TestFileEditorInput, registerTestEditor, TestEditorPArt } from 'vs/workbench/test/browser/workbenchTestServices';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorPArt } from 'vs/workbench/browser/pArts/editor/editorPArt';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { GroupDirection } from 'vs/workbench/services/editor/common/editorGroupsService';
import { EditorActivAtion } from 'vs/plAtform/editor/common/editor';
import { WillSAveStAteReAson } from 'vs/plAtform/storAge/common/storAge';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { EditorsObserver } from 'vs/workbench/browser/pArts/editor/editorsObserver';
import { timeout } from 'vs/bAse/common/Async';
import { TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';
import { isWeb } from 'vs/bAse/common/plAtform';

const TEST_EDITOR_ID = 'MyTestEditorForEditorsObserver';
const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorsObserver';
const TEST_SERIALIZABLE_EDITOR_INPUT_ID = 'testSeriAlizAbleEditorInputForEditorsObserver';

suite('EditorsObserver', function () {

	let disposAbles: IDisposAble[] = [];

	setup(() => {
		disposAbles.push(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)], TEST_SERIALIZABLE_EDITOR_INPUT_ID));
	});

	teArdown(() => {
		dispose(disposAbles);
		disposAbles = [];
	});

	Async function creAtePArt(): Promise<TestEditorPArt> {
		const instAntiAtionService = workbenchInstAntiAtionService();
		instAntiAtionService.invokeFunction(Accessor => Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).stArt(Accessor));

		const pArt = instAntiAtionService.creAteInstAnce(TestEditorPArt);
		pArt.creAte(document.creAteElement('div'));
		pArt.lAyout(400, 300);

		AwAit pArt.whenRestored;

		return pArt;
	}

	Async function creAteEditorObserver(): Promise<[EditorPArt, EditorsObserver]> {
		const pArt = AwAit creAtePArt();

		const observer = new EditorsObserver(pArt, new TestStorAgeService());

		return [pArt, observer];
	}

	test('bAsics (single group)', Async () => {
		const [pArt, observer] = AwAit creAteEditorObserver();

		let onDidMostRecentlyActiveEditorsChAngeCAlled = fAlse;
		const listener = observer.onDidMostRecentlyActiveEditorsChAnge(() => {
			onDidMostRecentlyActiveEditorsChAngeCAlled = true;
		});

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 0);
		Assert.equAl(onDidMostRecentlyActiveEditorsChAngeCAlled, fAlse);

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit pArt.ActiveGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 1);
		Assert.equAl(currentEditorsMRU[0].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(onDidMostRecentlyActiveEditorsChAngeCAlled, true);
		Assert.equAl(observer.hAsEditor(input1.resource), true);

		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit pArt.ActiveGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit pArt.ActiveGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		AwAit pArt.ActiveGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input2);
		Assert.equAl(currentEditorsMRU[1].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input3);
		Assert.equAl(currentEditorsMRU[2].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		onDidMostRecentlyActiveEditorsChAngeCAlled = fAlse;
		AwAit pArt.ActiveGroup.closeEditor(input1);

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 2);
		Assert.equAl(currentEditorsMRU[0].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input2);
		Assert.equAl(currentEditorsMRU[1].groupId, pArt.ActiveGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input3);
		Assert.equAl(onDidMostRecentlyActiveEditorsChAngeCAlled, true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		AwAit pArt.ActiveGroup.closeAllEditors();
		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 0);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input3.resource), fAlse);

		pArt.dispose();
		listener.dispose();
	});

	test('bAsics (multi group)', Async () => {
		const [pArt, observer] = AwAit creAteEditorObserver();

		const rootGroup = pArt.ActiveGroup;

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 0);

		const sideGroup = pArt.AddGroup(rootGroup, GroupDirection.RIGHT);

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true, ActivAtion: EditorActivAtion.ACTIVATE }));
		AwAit sideGroup.openEditor(input1, EditorOptions.creAte({ pinned: true, ActivAtion: EditorActivAtion.ACTIVATE }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 2);
		Assert.equAl(currentEditorsMRU[0].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true, ActivAtion: EditorActivAtion.ACTIVATE }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 2);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(currentEditorsMRU[1].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);

		// Opening An editor inActive should not chAnge
		// the most recent editor, but rAther put it behind
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ inActive: true }));

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);

		AwAit rootGroup.closeAllEditors();

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 1);
		Assert.equAl(currentEditorsMRU[0].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);

		AwAit sideGroup.closeAllEditors();

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 0);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);

		pArt.dispose();
	});

	test('copy group', Async function () {
		if (isWeb) {
			this.skip();
		}
		const [pArt, observer] = AwAit creAteEditorObserver();

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		const rootGroup = pArt.ActiveGroup;

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		const copiedGroup = pArt.copyGroup(rootGroup, rootGroup, GroupDirection.RIGHT);
		copiedGroup.setActive(true);

		currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 6);
		Assert.equAl(currentEditorsMRU[0].groupId, copiedGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input3);
		Assert.equAl(currentEditorsMRU[2].groupId, copiedGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input2);
		Assert.equAl(currentEditorsMRU[3].groupId, copiedGroup.id);
		Assert.equAl(currentEditorsMRU[3].editor, input1);
		Assert.equAl(currentEditorsMRU[4].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[4].editor, input2);
		Assert.equAl(currentEditorsMRU[5].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[5].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		AwAit rootGroup.closeAllEditors();

		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		AwAit copiedGroup.closeAllEditors();

		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input3.resource), fAlse);

		pArt.dispose();
	});

	test('initiAl editors Are pArt of observer And stAte is persisted & restored (single group)', Async () => {
		const pArt = AwAit creAtePArt();

		const rootGroup = pArt.ActiveGroup;

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		storAge._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.SHUTDOWN });

		const restoredObserver = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		currentEditorsMRU = restoredObserver.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		pArt.cleArStAte();
		pArt.dispose();
	});

	test('initiAl editors Are pArt of observer (multi group)', Async () => {
		const pArt = AwAit creAtePArt();

		const rootGroup = pArt.ActiveGroup;

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_SERIALIZABLE_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));

		const sideGroup = pArt.AddGroup(rootGroup, GroupDirection.RIGHT);
		AwAit sideGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);

		storAge._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.SHUTDOWN });

		const restoredObserver = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		currentEditorsMRU = restoredObserver.editors;
		Assert.equAl(currentEditorsMRU.length, 3);
		Assert.equAl(currentEditorsMRU[0].groupId, sideGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input3);
		Assert.equAl(currentEditorsMRU[1].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[1].editor, input2);
		Assert.equAl(currentEditorsMRU[2].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[2].editor, input1);
		Assert.equAl(restoredObserver.hAsEditor(input1.resource), true);
		Assert.equAl(restoredObserver.hAsEditor(input2.resource), true);
		Assert.equAl(restoredObserver.hAsEditor(input3.resource), true);

		pArt.cleArStAte();
		pArt.dispose();
	});

	test('observer does not restore editors thAt cAnnot be seriAlized', Async () => {
		const pArt = AwAit creAtePArt();

		const rootGroup = pArt.ActiveGroup;

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		let currentEditorsMRU = observer.editors;
		Assert.equAl(currentEditorsMRU.length, 1);
		Assert.equAl(currentEditorsMRU[0].groupId, rootGroup.id);
		Assert.equAl(currentEditorsMRU[0].editor, input1);
		Assert.equAl(observer.hAsEditor(input1.resource), true);

		storAge._onWillSAveStAte.fire({ reAson: WillSAveStAteReAson.SHUTDOWN });

		const restoredObserver = new EditorsObserver(pArt, storAge);
		AwAit pArt.whenRestored;

		currentEditorsMRU = restoredObserver.editors;
		Assert.equAl(currentEditorsMRU.length, 0);
		Assert.equAl(restoredObserver.hAsEditor(input1.resource), fAlse);

		pArt.cleArStAte();
		pArt.dispose();
	});

	test('observer closes editors when limit reAched (Across All groups)', Async () => {
		const pArt = AwAit creAtePArt();
		pArt.enforcePArtOptions({ limit: { enAbled: true, vAlue: 3 } });

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);

		const rootGroup = pArt.ActiveGroup;
		const sideGroup = pArt.AddGroup(rootGroup, GroupDirection.RIGHT);

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_EDITOR_INPUT_ID);
		const input4 = new TestFileEditorInput(URI.pArse('foo://bAr4'), TEST_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input4, EditorOptions.creAte({ pinned: true }));

		Assert.equAl(rootGroup.count, 3);
		Assert.equAl(rootGroup.isOpened(input1), fAlse);
		Assert.equAl(rootGroup.isOpened(input2), true);
		Assert.equAl(rootGroup.isOpened(input3), true);
		Assert.equAl(rootGroup.isOpened(input4), true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		input2.setDirty();
		pArt.enforcePArtOptions({ limit: { enAbled: true, vAlue: 1 } });

		AwAit timeout(0);

		Assert.equAl(rootGroup.count, 2);
		Assert.equAl(rootGroup.isOpened(input1), fAlse);
		Assert.equAl(rootGroup.isOpened(input2), true); // dirty
		Assert.equAl(rootGroup.isOpened(input3), fAlse);
		Assert.equAl(rootGroup.isOpened(input4), true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		const input5 = new TestFileEditorInput(URI.pArse('foo://bAr5'), TEST_EDITOR_INPUT_ID);
		AwAit sideGroup.openEditor(input5, EditorOptions.creAte({ pinned: true }));

		Assert.equAl(rootGroup.count, 1);
		Assert.equAl(rootGroup.isOpened(input1), fAlse);
		Assert.equAl(rootGroup.isOpened(input2), true); // dirty
		Assert.equAl(rootGroup.isOpened(input3), fAlse);
		Assert.equAl(rootGroup.isOpened(input4), fAlse);
		Assert.equAl(sideGroup.isOpened(input5), true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input4.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input5.resource), true);

		observer.dispose();
		pArt.dispose();
	});

	test('observer closes editors when limit reAched (in group)', Async () => {
		const pArt = AwAit creAtePArt();
		pArt.enforcePArtOptions({ limit: { enAbled: true, vAlue: 3, perEditorGroup: true } });

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);

		const rootGroup = pArt.ActiveGroup;
		const sideGroup = pArt.AddGroup(rootGroup, GroupDirection.RIGHT);

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_EDITOR_INPUT_ID);
		const input4 = new TestFileEditorInput(URI.pArse('foo://bAr4'), TEST_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input4, EditorOptions.creAte({ pinned: true }));

		Assert.equAl(rootGroup.count, 3); // 1 editor got closed due to our limit!
		Assert.equAl(rootGroup.isOpened(input1), fAlse);
		Assert.equAl(rootGroup.isOpened(input2), true);
		Assert.equAl(rootGroup.isOpened(input3), true);
		Assert.equAl(rootGroup.isOpened(input4), true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		AwAit sideGroup.openEditor(input1, EditorOptions.creAte({ pinned: true }));
		AwAit sideGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit sideGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));
		AwAit sideGroup.openEditor(input4, EditorOptions.creAte({ pinned: true }));

		Assert.equAl(sideGroup.count, 3);
		Assert.equAl(sideGroup.isOpened(input1), fAlse);
		Assert.equAl(sideGroup.isOpened(input2), true);
		Assert.equAl(sideGroup.isOpened(input3), true);
		Assert.equAl(sideGroup.isOpened(input4), true);
		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), true);
		Assert.equAl(observer.hAsEditor(input3.resource), true);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		pArt.enforcePArtOptions({ limit: { enAbled: true, vAlue: 1, perEditorGroup: true } });

		AwAit timeout(10);

		Assert.equAl(rootGroup.count, 1);
		Assert.equAl(rootGroup.isOpened(input1), fAlse);
		Assert.equAl(rootGroup.isOpened(input2), fAlse);
		Assert.equAl(rootGroup.isOpened(input3), fAlse);
		Assert.equAl(rootGroup.isOpened(input4), true);

		Assert.equAl(sideGroup.count, 1);
		Assert.equAl(sideGroup.isOpened(input1), fAlse);
		Assert.equAl(sideGroup.isOpened(input2), fAlse);
		Assert.equAl(sideGroup.isOpened(input3), fAlse);
		Assert.equAl(sideGroup.isOpened(input4), true);

		Assert.equAl(observer.hAsEditor(input1.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input3.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		observer.dispose();
		pArt.dispose();
	});

	test('observer does not close sticky', Async () => {
		const pArt = AwAit creAtePArt();
		pArt.enforcePArtOptions({ limit: { enAbled: true, vAlue: 3 } });

		const storAge = new TestStorAgeService();
		const observer = new EditorsObserver(pArt, storAge);

		const rootGroup = pArt.ActiveGroup;

		const input1 = new TestFileEditorInput(URI.pArse('foo://bAr1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('foo://bAr2'), TEST_EDITOR_INPUT_ID);
		const input3 = new TestFileEditorInput(URI.pArse('foo://bAr3'), TEST_EDITOR_INPUT_ID);
		const input4 = new TestFileEditorInput(URI.pArse('foo://bAr4'), TEST_EDITOR_INPUT_ID);

		AwAit rootGroup.openEditor(input1, EditorOptions.creAte({ pinned: true, sticky: true }));
		AwAit rootGroup.openEditor(input2, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input3, EditorOptions.creAte({ pinned: true }));
		AwAit rootGroup.openEditor(input4, EditorOptions.creAte({ pinned: true }));

		Assert.equAl(rootGroup.count, 3);
		Assert.equAl(rootGroup.isOpened(input1), true);
		Assert.equAl(rootGroup.isOpened(input2), fAlse);
		Assert.equAl(rootGroup.isOpened(input3), true);
		Assert.equAl(rootGroup.isOpened(input4), true);
		Assert.equAl(observer.hAsEditor(input1.resource), true);
		Assert.equAl(observer.hAsEditor(input2.resource), fAlse);
		Assert.equAl(observer.hAsEditor(input3.resource), true);
		Assert.equAl(observer.hAsEditor(input4.resource), true);

		observer.dispose();
		pArt.dispose();
	});
});
