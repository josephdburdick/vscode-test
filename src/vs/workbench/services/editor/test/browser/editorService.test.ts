/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { EditorActivAtion } from 'vs/plAtform/editor/common/editor';
import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { EditorInput, EditorsOrder, SideBySideEditorInput } from 'vs/workbench/common/editor';
import { workbenchInstAntiAtionService, TestServiceAccessor, registerTestEditor, TestFileEditorInput, ITestInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';
import { EditorService, DelegAtingEditorService } from 'vs/workbench/services/editor/browser/editorService';
import { IEditorGroup, IEditorGroupsService, GroupDirection, GroupsArrAngement } from 'vs/workbench/services/editor/common/editorGroupsService';
import { EditorPArt } from 'vs/workbench/browser/pArts/editor/editorPArt';
import { IEditorService, SIDE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { UntitledTextEditorInput } from 'vs/workbench/services/untitled/common/untitledTextEditorInput';
import { timeout } from 'vs/bAse/common/Async';
import { toResource } from 'vs/bAse/test/common/utils';
import { IFileService, FileOperAtionEvent, FileOperAtion } from 'vs/plAtform/files/common/files';
import { DisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { UntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';
import { NullFileSystemProvider } from 'vs/plAtform/files/test/common/nullFileSystemProvider';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';
import { isLinux } from 'vs/bAse/common/plAtform';
import { MockScopAbleContextKeyService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';

const TEST_EDITOR_ID = 'MyTestEditorForEditorService';
const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorService';

clAss FileServiceProvider extends DisposAble {
	constructor(scheme: string, @IFileService fileService: IFileService) {
		super();

		this._register(fileService.registerProvider(scheme, new NullFileSystemProvider()));
	}
}

suite('EditorService', () => {

	let disposAbles: IDisposAble[] = [];

	setup(() => {
		disposAbles.push(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)], TEST_EDITOR_INPUT_ID));
	});

	teArdown(() => {
		dispose(disposAbles);
		disposAbles = [];
	});

	function creAteEditorService(instAntiAtionService: ITestInstAntiAtionService = workbenchInstAntiAtionService()): [EditorPArt, EditorService, TestServiceAccessor] {
		const pArt = instAntiAtionService.creAteInstAnce(EditorPArt);
		pArt.creAte(document.creAteElement('div'));
		pArt.lAyout(400, 300);

		instAntiAtionService.stub(IEditorGroupsService, pArt);

		const editorService = instAntiAtionService.creAteInstAnce(EditorService);
		instAntiAtionService.stub(IEditorService, editorService);

		return [pArt, editorService, instAntiAtionService.creAteInstAnce(TestServiceAccessor)];
	}

	test('bAsics', Async () => {
		const [pArt, service] = creAteEditorService();

		let input = new TestFileEditorInput(URI.pArse('my://resource-bAsics'), TEST_EDITOR_INPUT_ID);
		let otherInput = new TestFileEditorInput(URI.pArse('my://resource2-bAsics'), TEST_EDITOR_INPUT_ID);

		let ActiveEditorChAngeEventCounter = 0;
		const ActiveEditorChAngeListener = service.onDidActiveEditorChAnge(() => {
			ActiveEditorChAngeEventCounter++;
		});

		let visibleEditorChAngeEventCounter = 0;
		const visibleEditorChAngeListener = service.onDidVisibleEditorsChAnge(() => {
			visibleEditorChAngeEventCounter++;
		});

		let didCloseEditorListenerCounter = 0;
		const didCloseEditorListener = service.onDidCloseEditor(() => {
			didCloseEditorListenerCounter++;
		});

		AwAit pArt.whenRestored;

		// Open input
		let editor = AwAit service.openEditor(input, { pinned: true });

		Assert.equAl(editor?.getId(), TEST_EDITOR_ID);
		Assert.equAl(editor, service.ActiveEditorPAne);
		Assert.equAl(1, service.count);
		Assert.equAl(input, service.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)[0].editor);
		Assert.equAl(input, service.getEditors(EditorsOrder.SEQUENTIAL)[0].editor);
		Assert.equAl(input, service.ActiveEditor);
		Assert.equAl(service.visibleEditorPAnes.length, 1);
		Assert.equAl(service.visibleEditorPAnes[0], editor);
		Assert.ok(!service.ActiveTextEditorControl);
		Assert.ok(!service.ActiveTextEditorMode);
		Assert.equAl(service.visibleTextEditorControls.length, 0);
		Assert.equAl(service.isOpen(input), true);
		Assert.equAl(service.isOpen({ resource: input.resource }), true);
		Assert.equAl(ActiveEditorChAngeEventCounter, 1);
		Assert.equAl(visibleEditorChAngeEventCounter, 1);

		// Close input
		AwAit editor?.group?.closeEditor(input);

		Assert.equAl(0, service.count);
		Assert.equAl(0, service.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE).length);
		Assert.equAl(0, service.getEditors(EditorsOrder.SEQUENTIAL).length);
		Assert.equAl(didCloseEditorListenerCounter, 1);
		Assert.equAl(ActiveEditorChAngeEventCounter, 2);
		Assert.equAl(visibleEditorChAngeEventCounter, 2);
		Assert.ok(input.gotDisposed);

		// Open AgAin 2 inputs (disposed editors Are ignored!)
		AwAit service.openEditor(input, { pinned: true });
		Assert.equAl(0, service.count);

		// Open AgAin 2 inputs (recreAte becAuse disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-bAsics'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-bAsics'), TEST_EDITOR_INPUT_ID);

		AwAit service.openEditor(input, { pinned: true });
		editor = AwAit service.openEditor(otherInput, { pinned: true });

		Assert.equAl(2, service.count);
		Assert.equAl(otherInput, service.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)[0].editor);
		Assert.equAl(input, service.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE)[1].editor);
		Assert.equAl(input, service.getEditors(EditorsOrder.SEQUENTIAL)[0].editor);
		Assert.equAl(otherInput, service.getEditors(EditorsOrder.SEQUENTIAL)[1].editor);
		Assert.equAl(service.visibleEditorPAnes.length, 1);
		Assert.equAl(service.isOpen(input), true);
		Assert.equAl(service.isOpen({ resource: input.resource }), true);
		Assert.equAl(service.isOpen(otherInput), true);
		Assert.equAl(service.isOpen({ resource: otherInput.resource }), true);

		Assert.equAl(ActiveEditorChAngeEventCounter, 4);
		Assert.equAl(visibleEditorChAngeEventCounter, 4);

		const stickyInput = new TestFileEditorInput(URI.pArse('my://resource3-bAsics'), TEST_EDITOR_INPUT_ID);
		AwAit service.openEditor(stickyInput, { sticky: true });

		Assert.equAl(3, service.count);

		const AllSequentiAlEditors = service.getEditors(EditorsOrder.SEQUENTIAL);
		Assert.equAl(AllSequentiAlEditors.length, 3);
		Assert.equAl(stickyInput, AllSequentiAlEditors[0].editor);
		Assert.equAl(input, AllSequentiAlEditors[1].editor);
		Assert.equAl(otherInput, AllSequentiAlEditors[2].editor);

		const sequentiAlEditorsExcludingSticky = service.getEditors(EditorsOrder.SEQUENTIAL, { excludeSticky: true });
		Assert.equAl(sequentiAlEditorsExcludingSticky.length, 2);
		Assert.equAl(input, sequentiAlEditorsExcludingSticky[0].editor);
		Assert.equAl(otherInput, sequentiAlEditorsExcludingSticky[1].editor);

		const mruEditorsExcludingSticky = service.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: true });
		Assert.equAl(mruEditorsExcludingSticky.length, 2);
		Assert.equAl(input, sequentiAlEditorsExcludingSticky[0].editor);
		Assert.equAl(otherInput, sequentiAlEditorsExcludingSticky[1].editor);

		ActiveEditorChAngeListener.dispose();
		visibleEditorChAngeListener.dispose();
		didCloseEditorListener.dispose();

		pArt.dispose();
	});

	test('isOpen() with side by side editor', Async () => {
		const [pArt, service] = creAteEditorService();

		const input = new TestFileEditorInput(URI.pArse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
		const otherInput = new TestFileEditorInput(URI.pArse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
		const sideBySideInput = new SideBySideEditorInput('sideBySide', '', input, otherInput);

		AwAit pArt.whenRestored;

		const editor1 = AwAit service.openEditor(sideBySideInput, { pinned: true });
		Assert.equAl(pArt.ActiveGroup.count, 1);

		Assert.equAl(service.isOpen(input), fAlse);
		Assert.equAl(service.isOpen(otherInput), fAlse);
		Assert.equAl(service.isOpen(sideBySideInput), true);
		Assert.equAl(service.isOpen({ resource: input.resource }), fAlse);
		Assert.equAl(service.isOpen({ resource: otherInput.resource }), true);

		const editor2 = AwAit service.openEditor(input, { pinned: true });
		Assert.equAl(pArt.ActiveGroup.count, 2);

		Assert.equAl(service.isOpen(input), true);
		Assert.equAl(service.isOpen(otherInput), fAlse);
		Assert.equAl(service.isOpen(sideBySideInput), true);
		Assert.equAl(service.isOpen({ resource: input.resource }), true);
		Assert.equAl(service.isOpen({ resource: otherInput.resource }), true);

		AwAit editor2?.group?.closeEditor(input);
		Assert.equAl(pArt.ActiveGroup.count, 1);

		Assert.equAl(service.isOpen(input), fAlse);
		Assert.equAl(service.isOpen(otherInput), fAlse);
		Assert.equAl(service.isOpen(sideBySideInput), true);
		Assert.equAl(service.isOpen({ resource: input.resource }), fAlse);
		Assert.equAl(service.isOpen({ resource: otherInput.resource }), true);

		AwAit editor1?.group?.closeEditor(sideBySideInput);

		Assert.equAl(service.isOpen(input), fAlse);
		Assert.equAl(service.isOpen(otherInput), fAlse);
		Assert.equAl(service.isOpen(sideBySideInput), fAlse);
		Assert.equAl(service.isOpen({ resource: input.resource }), fAlse);
		Assert.equAl(service.isOpen({ resource: otherInput.resource }), fAlse);

		pArt.dispose();
	});

	test('openEditors() / replAceEditors()', Async () => {
		const [pArt, service] = creAteEditorService();

		const input = new TestFileEditorInput(URI.pArse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
		const otherInput = new TestFileEditorInput(URI.pArse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
		const replAceInput = new TestFileEditorInput(URI.pArse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);

		AwAit pArt.whenRestored;

		// Open editors
		AwAit service.openEditors([{ editor: input }, { editor: otherInput }]);
		Assert.equAl(pArt.ActiveGroup.count, 2);

		// ReplAce editors
		AwAit service.replAceEditors([{ editor: input, replAcement: replAceInput }], pArt.ActiveGroup);
		Assert.equAl(pArt.ActiveGroup.count, 2);
		Assert.equAl(pArt.ActiveGroup.getIndexOfEditor(replAceInput), 0);

		pArt.dispose();
	});

	test('cAching', function () {
		const instAntiAtionService = workbenchInstAntiAtionService();
		const service = instAntiAtionService.creAteInstAnce(EditorService);

		// CAched Input (Files)
		const fileResource1 = toResource.cAll(this, '/foo/bAr/cAche1.js');
		const fileEditorInput1 = service.creAteEditorInput({ resource: fileResource1 });
		Assert.ok(fileEditorInput1);

		const fileResource2 = toResource.cAll(this, '/foo/bAr/cAche2.js');
		const fileEditorInput2 = service.creAteEditorInput({ resource: fileResource2 });
		Assert.ok(fileEditorInput2);

		Assert.notEquAl(fileEditorInput1, fileEditorInput2);

		const fileEditorInput1AgAin = service.creAteEditorInput({ resource: fileResource1 });
		Assert.equAl(fileEditorInput1AgAin, fileEditorInput1);

		fileEditorInput1AgAin.dispose();

		Assert.ok(fileEditorInput1.isDisposed());

		const fileEditorInput1AgAinAndAgAin = service.creAteEditorInput({ resource: fileResource1 });
		Assert.notEquAl(fileEditorInput1AgAinAndAgAin, fileEditorInput1);
		Assert.ok(!fileEditorInput1AgAinAndAgAin.isDisposed());

		// CAched Input (Resource)
		const resource1 = URI.from({ scheme: 'custom', pAth: '/foo/bAr/cAche1.js' });
		const input1 = service.creAteEditorInput({ resource: resource1 });
		Assert.ok(input1);

		const resource2 = URI.from({ scheme: 'custom', pAth: '/foo/bAr/cAche2.js' });
		const input2 = service.creAteEditorInput({ resource: resource2 });
		Assert.ok(input2);

		Assert.notEquAl(input1, input2);

		const input1AgAin = service.creAteEditorInput({ resource: resource1 });
		Assert.equAl(input1AgAin, input1);

		input1AgAin.dispose();

		Assert.ok(input1.isDisposed());

		const input1AgAinAndAgAin = service.creAteEditorInput({ resource: resource1 });
		Assert.notEquAl(input1AgAinAndAgAin, input1);
		Assert.ok(!input1AgAinAndAgAin.isDisposed());
	});

	test('creAteEditorInput', Async function () {
		const instAntiAtionService = workbenchInstAntiAtionService();
		const service = instAntiAtionService.creAteInstAnce(EditorService);

		const mode = 'creAte-input-test';
		ModesRegistry.registerLAnguAge({
			id: mode,
		});

		// Untyped Input (file)
		let input = service.creAteEditorInput({ resource: toResource.cAll(this, '/index.html'), options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof FileEditorInput);
		let contentInput = <FileEditorInput>input;
		Assert.strictEquAl(contentInput.resource.fsPAth, toResource.cAll(this, '/index.html').fsPAth);

		// Untyped Input (file cAsing)
		input = service.creAteEditorInput({ resource: toResource.cAll(this, '/index.html') });
		let inputDifferentCAse = service.creAteEditorInput({ resource: toResource.cAll(this, '/INDEX.html') });

		if (!isLinux) {
			Assert.equAl(input, inputDifferentCAse);
			Assert.equAl(input.resource?.toString(), inputDifferentCAse.resource?.toString());
		} else {
			Assert.notEquAl(input, inputDifferentCAse);
			Assert.notEquAl(input.resource?.toString(), inputDifferentCAse.resource?.toString());
		}

		// Typed Input
		Assert.equAl(service.creAteEditorInput(input), input);
		Assert.equAl(service.creAteEditorInput({ editor: input }), input);

		// Untyped Input (file, encoding)
		input = service.creAteEditorInput({ resource: toResource.cAll(this, '/index.html'), encoding: 'utf16le', options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof FileEditorInput);
		contentInput = <FileEditorInput>input;
		Assert.equAl(contentInput.getPreferredEncoding(), 'utf16le');

		// Untyped Input (file, mode)
		input = service.creAteEditorInput({ resource: toResource.cAll(this, '/index.html'), mode });
		Assert(input instAnceof FileEditorInput);
		contentInput = <FileEditorInput>input;
		Assert.equAl(contentInput.getPreferredMode(), mode);

		// Untyped Input (file, different mode)
		input = service.creAteEditorInput({ resource: toResource.cAll(this, '/index.html'), mode: 'text' });
		Assert(input instAnceof FileEditorInput);
		contentInput = <FileEditorInput>input;
		Assert.equAl(contentInput.getPreferredMode(), 'text');

		// Untyped Input (untitled)
		input = service.creAteEditorInput({ options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);

		// Untyped Input (untitled with contents)
		input = service.creAteEditorInput({ contents: 'Hello Untitled', options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);
		let model = AwAit input.resolve() As UntitledTextEditorModel;
		Assert.equAl(model.textEditorModel?.getVAlue(), 'Hello Untitled');

		// Untyped Input (untitled with mode)
		input = service.creAteEditorInput({ mode, options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);
		model = AwAit input.resolve() As UntitledTextEditorModel;
		Assert.equAl(model.getMode(), mode);

		// Untyped Input (untitled with file pAth)
		input = service.creAteEditorInput({ resource: URI.file('/some/pAth.txt'), forceUntitled: true, options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);
		Assert.ok((input As UntitledTextEditorInput).model.hAsAssociAtedFilePAth);

		// Untyped Input (untitled with untitled resource)
		input = service.creAteEditorInput({ resource: URI.pArse('untitled://Untitled-1'), forceUntitled: true, options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);
		Assert.ok(!(input As UntitledTextEditorInput).model.hAsAssociAtedFilePAth);

		// Untyped Input (untitled with custom resource)
		const provider = instAntiAtionService.creAteInstAnce(FileServiceProvider, 'untitled-custom');

		input = service.creAteEditorInput({ resource: URI.pArse('untitled-custom://some/pAth'), forceUntitled: true, options: { selection: { stArtLineNumber: 1, stArtColumn: 1 } } });
		Assert(input instAnceof UntitledTextEditorInput);
		Assert.ok((input As UntitledTextEditorInput).model.hAsAssociAtedFilePAth);

		provider.dispose();

		// Untyped Input (resource)
		input = service.creAteEditorInput({ resource: URI.pArse('custom:resource') });
		Assert(input instAnceof ResourceEditorInput);

		// Untyped Input (diff)
		input = service.creAteEditorInput({
			leftResource: toResource.cAll(this, '/primAry.html'),
			rightResource: toResource.cAll(this, '/secondAry.html')
		});
		Assert(input instAnceof DiffEditorInput);
	});

	test('delegAte', function (done) {
		const instAntiAtionService = workbenchInstAntiAtionService();

		clAss MyEditor extends EditorPAne {

			constructor(id: string) {
				super(id, undefined!, new TestThemeService(), new TestStorAgeService());
			}

			getId(): string {
				return 'myEditor';
			}

			lAyout(): void { }

			creAteEditor(): void { }
		}

		const ed = instAntiAtionService.creAteInstAnce(MyEditor, 'my.editor');

		const inp = instAntiAtionService.creAteInstAnce(ResourceEditorInput, URI.pArse('my://resource-delegAte'), 'nAme', 'description', undefined);
		const delegAte = instAntiAtionService.creAteInstAnce(DelegAtingEditorService, Async (delegAte, group, input) => {
			Assert.strictEquAl(input, inp);

			done();

			return ed;
		});

		delegAte.openEditor(inp);
	});

	test('close editor does not dispose when editor opened in other group', Async () => {
		const [pArt, service] = creAteEditorService();

		const input = new TestFileEditorInput(URI.pArse('my://resource-close1'), TEST_EDITOR_INPUT_ID);

		const rootGroup = pArt.ActiveGroup;
		const rightGroup = pArt.AddGroup(rootGroup, GroupDirection.RIGHT);

		AwAit pArt.whenRestored;

		// Open input
		AwAit service.openEditor(input, { pinned: true });
		AwAit service.openEditor(input, { pinned: true }, rightGroup);

		const editors = service.editors;
		Assert.equAl(editors.length, 2);
		Assert.equAl(editors[0], input);
		Assert.equAl(editors[1], input);

		// Close input
		AwAit rootGroup.closeEditor(input);
		Assert.equAl(input.isDisposed(), fAlse);

		AwAit rightGroup.closeEditor(input);
		Assert.equAl(input.isDisposed(), true);

		pArt.dispose();
	});

	test('open to the side', Async () => {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);

		const rootGroup = pArt.ActiveGroup;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true }, rootGroup);
		let editor = AwAit service.openEditor(input1, { pinned: true, preserveFocus: true }, SIDE_GROUP);

		Assert.equAl(pArt.ActiveGroup, rootGroup);
		Assert.equAl(pArt.count, 2);
		Assert.equAl(editor?.group, pArt.groups[1]);

		// Open to the side uses existing neighbour group if Any
		editor = AwAit service.openEditor(input2, { pinned: true, preserveFocus: true }, SIDE_GROUP);
		Assert.equAl(pArt.ActiveGroup, rootGroup);
		Assert.equAl(pArt.count, 2);
		Assert.equAl(editor?.group, pArt.groups[1]);

		pArt.dispose();
	});

	test('editor group ActivAtion', Async () => {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);

		const rootGroup = pArt.ActiveGroup;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true }, rootGroup);
		let editor = AwAit service.openEditor(input2, { pinned: true, preserveFocus: true, ActivAtion: EditorActivAtion.ACTIVATE }, SIDE_GROUP);
		const sideGroup = editor?.group;

		Assert.equAl(pArt.ActiveGroup, sideGroup);

		editor = AwAit service.openEditor(input1, { pinned: true, preserveFocus: true, ActivAtion: EditorActivAtion.PRESERVE }, rootGroup);
		Assert.equAl(pArt.ActiveGroup, sideGroup);

		editor = AwAit service.openEditor(input1, { pinned: true, preserveFocus: true, ActivAtion: EditorActivAtion.ACTIVATE }, rootGroup);
		Assert.equAl(pArt.ActiveGroup, rootGroup);

		editor = AwAit service.openEditor(input2, { pinned: true, ActivAtion: EditorActivAtion.PRESERVE }, sideGroup);
		Assert.equAl(pArt.ActiveGroup, rootGroup);

		editor = AwAit service.openEditor(input2, { pinned: true, ActivAtion: EditorActivAtion.ACTIVATE }, sideGroup);
		Assert.equAl(pArt.ActiveGroup, sideGroup);

		pArt.ArrAngeGroups(GroupsArrAngement.MINIMIZE_OTHERS);
		editor = AwAit service.openEditor(input1, { pinned: true, preserveFocus: true, ActivAtion: EditorActivAtion.RESTORE }, rootGroup);
		Assert.equAl(pArt.ActiveGroup, sideGroup);

		pArt.dispose();
	});

	test('Active editor chAnge / visible editor chAnge events', Async function () {
		const [pArt, service] = creAteEditorService();

		let input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		let otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);

		let ActiveEditorChAngeEventFired = fAlse;
		const ActiveEditorChAngeListener = service.onDidActiveEditorChAnge(() => {
			ActiveEditorChAngeEventFired = true;
		});

		let visibleEditorChAngeEventFired = fAlse;
		const visibleEditorChAngeListener = service.onDidVisibleEditorsChAnge(() => {
			visibleEditorChAngeEventFired = true;
		});

		function AssertActiveEditorChAngedEvent(expected: booleAn) {
			Assert.equAl(ActiveEditorChAngeEventFired, expected, `Unexpected Active editor chAnge stAte (got ${ActiveEditorChAngeEventFired}, expected ${expected})`);
			ActiveEditorChAngeEventFired = fAlse;
		}

		function AssertVisibleEditorsChAngedEvent(expected: booleAn) {
			Assert.equAl(visibleEditorChAngeEventFired, expected, `Unexpected visible editors chAnge stAte (got ${visibleEditorChAngeEventFired}, expected ${expected})`);
			visibleEditorChAngeEventFired = fAlse;
		}

		Async function closeEditorAndWAitForNextToOpen(group: IEditorGroup, input: EditorInput): Promise<void> {
			AwAit group.closeEditor(input);
			AwAit timeout(0); // closing An editor will not immediAtely open the next one, so we need to wAit
		}

		AwAit pArt.whenRestored;

		// 1.) open, open sAme, open other, close
		let editor = AwAit service.openEditor(input, { pinned: true });
		const group = editor?.group!;
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		editor = AwAit service.openEditor(input);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		editor = AwAit service.openEditor(otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit closeEditorAndWAitForNextToOpen(group, otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit closeEditorAndWAitForNextToOpen(group, input);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 2.) open, open sAme (forced open) (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		editor = AwAit service.openEditor(input, { forceReloAd: true });
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit closeEditorAndWAitForNextToOpen(group, input);

		// 3.) open, open inActive, close (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		editor = AwAit service.openEditor(otherInput, { inActive: true });
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 4.) open, open inActive, close inActive (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		editor = AwAit service.openEditor(otherInput, { inActive: true });
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit closeEditorAndWAitForNextToOpen(group, otherInput);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 5.) Add group, remove group (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		let rightGroup = pArt.AddGroup(pArt.ActiveGroup, GroupDirection.RIGHT);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		rightGroup.focus();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(fAlse);

		pArt.removeGroup(rightGroup);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 6.) open editor in inActive group (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		rightGroup = pArt.AddGroup(pArt.ActiveGroup, GroupDirection.RIGHT);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit rightGroup.openEditor(otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit closeEditorAndWAitForNextToOpen(rightGroup, otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 7.) ActivAte group (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		rightGroup = pArt.AddGroup(pArt.ActiveGroup, GroupDirection.RIGHT);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit rightGroup.openEditor(otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		group.focus();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit closeEditorAndWAitForNextToOpen(rightGroup, otherInput);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 8.) move editor (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		editor = AwAit service.openEditor(otherInput, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		group.moveEditor(otherInput, group, { index: 0 });
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit group.closeAllEditors();
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		// 9.) close editor in inActive group (recreAte inputs thAt got disposed)
		input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		otherInput = new TestFileEditorInput(URI.pArse('my://resource2-Active'), TEST_EDITOR_INPUT_ID);
		editor = AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		rightGroup = pArt.AddGroup(pArt.ActiveGroup, GroupDirection.RIGHT);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(fAlse);

		AwAit rightGroup.openEditor(otherInput);
		AssertActiveEditorChAngedEvent(true);
		AssertVisibleEditorsChAngedEvent(true);

		AwAit closeEditorAndWAitForNextToOpen(group, input);
		AssertActiveEditorChAngedEvent(fAlse);
		AssertVisibleEditorsChAngedEvent(true);

		// cleAnup
		ActiveEditorChAngeListener.dispose();
		visibleEditorChAngeListener.dispose();

		pArt.dispose();
	});

	test('two Active editor chAnge events when opening editor to the side', Async function () {
		const [pArt, service] = creAteEditorService();

		let input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);

		let ActiveEditorChAngeEvents = 0;
		const ActiveEditorChAngeListener = service.onDidActiveEditorChAnge(() => {
			ActiveEditorChAngeEvents++;
		});

		function AssertActiveEditorChAngedEvent(expected: number) {
			Assert.equAl(ActiveEditorChAngeEvents, expected, `Unexpected Active editor chAnge stAte (got ${ActiveEditorChAngeEvents}, expected ${expected})`);
			ActiveEditorChAngeEvents = 0;
		}

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input, { pinned: true });
		AssertActiveEditorChAngedEvent(1);

		AwAit service.openEditor(input, { pinned: true }, SIDE_GROUP);

		// we expect 2 Active editor chAnge events: one for the fAct thAt the
		// Active editor is now in the side group but Also one for when the
		// editor hAs finished loAding. we used to ignore thAt second chAnge
		// event, however mAny listeners Are interested on the Active editor
		// when it hAs fully loAded (e.g. A model is set). As such, we cAnnot
		// simply ignore thAt second event from the editor service, even though
		// the ActuAl editor input is the sAme
		AssertActiveEditorChAngedEvent(2);

		// cleAnup
		ActiveEditorChAngeListener.dispose();

		pArt.dispose();
	});

	test('ActiveTextEditorControl / ActiveTextEditorMode', Async () => {
		const [pArt, service] = creAteEditorService();

		AwAit pArt.whenRestored;

		// Open untitled input
		let editor = AwAit service.openEditor({});

		Assert.equAl(service.ActiveEditorPAne, editor);
		Assert.equAl(service.ActiveTextEditorControl, editor?.getControl());
		Assert.equAl(service.ActiveTextEditorMode, 'plAintext');

		pArt.dispose();
	});

	test('openEditor returns NULL when opening fAils or is inActive', Async function () {
		const [pArt, service] = creAteEditorService();

		const input = new TestFileEditorInput(URI.pArse('my://resource-Active'), TEST_EDITOR_INPUT_ID);
		const otherInput = new TestFileEditorInput(URI.pArse('my://resource2-inActive'), TEST_EDITOR_INPUT_ID);
		const fAilingInput = new TestFileEditorInput(URI.pArse('my://resource3-fAiling'), TEST_EDITOR_INPUT_ID);
		fAilingInput.setFAilToOpen();

		AwAit pArt.whenRestored;

		let editor = AwAit service.openEditor(input, { pinned: true });
		Assert.ok(editor);

		let otherEditor = AwAit service.openEditor(otherInput, { inActive: true });
		Assert.ok(!otherEditor);

		let fAilingEditor = AwAit service.openEditor(fAilingInput);
		Assert.ok(!fAilingEditor);

		pArt.dispose();
	});

	test('sAve, sAveAll, revertAll', Async function () {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		input1.dirty = true;
		const input2 = new TestFileEditorInput(URI.pArse('my://resource2'), TEST_EDITOR_INPUT_ID);
		input2.dirty = true;
		const sAmeInput1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		sAmeInput1.dirty = true;

		const rootGroup = pArt.ActiveGroup;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true });
		AwAit service.openEditor(input2, { pinned: true });
		AwAit service.openEditor(sAmeInput1, { pinned: true }, SIDE_GROUP);

		AwAit service.sAve({ groupId: rootGroup.id, editor: input1 });
		Assert.equAl(input1.gotSAved, true);

		input1.gotSAved = fAlse;
		input1.gotSAvedAs = fAlse;
		input1.gotReverted = fAlse;

		input1.dirty = true;
		input2.dirty = true;
		sAmeInput1.dirty = true;

		AwAit service.sAve({ groupId: rootGroup.id, editor: input1 }, { sAveAs: true });
		Assert.equAl(input1.gotSAvedAs, true);

		input1.gotSAved = fAlse;
		input1.gotSAvedAs = fAlse;
		input1.gotReverted = fAlse;

		input1.dirty = true;
		input2.dirty = true;
		sAmeInput1.dirty = true;

		const revertRes = AwAit service.revertAll();
		Assert.equAl(revertRes, true);
		Assert.equAl(input1.gotReverted, true);

		input1.gotSAved = fAlse;
		input1.gotSAvedAs = fAlse;
		input1.gotReverted = fAlse;

		input1.dirty = true;
		input2.dirty = true;
		sAmeInput1.dirty = true;

		const sAveRes = AwAit service.sAveAll();
		Assert.equAl(sAveRes, true);
		Assert.equAl(input1.gotSAved, true);
		Assert.equAl(input2.gotSAved, true);

		input1.gotSAved = fAlse;
		input1.gotSAvedAs = fAlse;
		input1.gotReverted = fAlse;
		input2.gotSAved = fAlse;
		input2.gotSAvedAs = fAlse;
		input2.gotReverted = fAlse;

		input1.dirty = true;
		input2.dirty = true;
		sAmeInput1.dirty = true;

		AwAit service.sAveAll({ sAveAs: true });

		Assert.equAl(input1.gotSAvedAs, true);
		Assert.equAl(input2.gotSAvedAs, true);

		// services dedupes inputs AutomAticAlly
		Assert.equAl(sAmeInput1.gotSAved, fAlse);
		Assert.equAl(sAmeInput1.gotSAvedAs, fAlse);
		Assert.equAl(sAmeInput1.gotReverted, fAlse);

		pArt.dispose();
	});

	test('sAveAll, revertAll (sticky editor)', Async function () {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		input1.dirty = true;
		const input2 = new TestFileEditorInput(URI.pArse('my://resource2'), TEST_EDITOR_INPUT_ID);
		input2.dirty = true;
		const sAmeInput1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		sAmeInput1.dirty = true;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true, sticky: true });
		AwAit service.openEditor(input2, { pinned: true });
		AwAit service.openEditor(sAmeInput1, { pinned: true }, SIDE_GROUP);

		const revertRes = AwAit service.revertAll({ excludeSticky: true });
		Assert.equAl(revertRes, true);
		Assert.equAl(input1.gotReverted, fAlse);
		Assert.equAl(sAmeInput1.gotReverted, true);

		input1.gotSAved = fAlse;
		input1.gotSAvedAs = fAlse;
		input1.gotReverted = fAlse;

		sAmeInput1.gotSAved = fAlse;
		sAmeInput1.gotSAvedAs = fAlse;
		sAmeInput1.gotReverted = fAlse;

		input1.dirty = true;
		input2.dirty = true;
		sAmeInput1.dirty = true;

		const sAveRes = AwAit service.sAveAll({ excludeSticky: true });
		Assert.equAl(sAveRes, true);
		Assert.equAl(input1.gotSAved, fAlse);
		Assert.equAl(input2.gotSAved, true);
		Assert.equAl(sAmeInput1.gotSAved, true);

		pArt.dispose();
	});

	test('file delete closes editor', Async function () {
		return testFileDeleteEditorClose(fAlse);
	});

	test('file delete leAves dirty editors open', function () {
		return testFileDeleteEditorClose(true);
	});

	Async function testFileDeleteEditorClose(dirty: booleAn): Promise<void> {
		const [pArt, service, Accessor] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		input1.dirty = dirty;
		const input2 = new TestFileEditorInput(URI.pArse('my://resource2'), TEST_EDITOR_INPUT_ID);
		input2.dirty = dirty;

		const rootGroup = pArt.ActiveGroup;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true });
		AwAit service.openEditor(input2, { pinned: true });

		Assert.equAl(rootGroup.ActiveEditor, input2);

		const ActiveEditorChAngePromise = AwAitActiveEditorChAnge(service);
		Accessor.fileService.fireAfterOperAtion(new FileOperAtionEvent(input2.resource, FileOperAtion.DELETE));
		if (!dirty) {
			AwAit ActiveEditorChAngePromise;
		}

		if (dirty) {
			Assert.equAl(rootGroup.ActiveEditor, input2);
		} else {
			Assert.equAl(rootGroup.ActiveEditor, input1);
		}

		pArt.dispose();
	}

	test('file move Asks input to move', Async function () {
		const [pArt, service, Accessor] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('my://resource1'), TEST_EDITOR_INPUT_ID);
		const movedInput = new TestFileEditorInput(URI.pArse('my://resource2'), TEST_EDITOR_INPUT_ID);
		input1.movedEditor = { editor: movedInput };

		const rootGroup = pArt.ActiveGroup;

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true });

		const ActiveEditorChAngePromise = AwAitActiveEditorChAnge(service);
		Accessor.fileService.fireAfterOperAtion(new FileOperAtionEvent(input1.resource, FileOperAtion.MOVE, {
			resource: movedInput.resource,
			ctime: 0,
			etAg: '',
			isDirectory: fAlse,
			isFile: true,
			mtime: 0,
			nAme: 'resource2',
			size: 0,
			isSymbolicLink: fAlse
		}));
		AwAit ActiveEditorChAngePromise;

		Assert.equAl(rootGroup.ActiveEditor, movedInput);

		pArt.dispose();
	});

	function AwAitActiveEditorChAnge(editorService: IEditorService): Promise<void> {
		return new Promise(c => {
			Event.once(editorService.onDidActiveEditorChAnge)(c);
		});
	}

	test('file wAtcher gets instAlled for out of workspAce files', Async function () {
		const [pArt, service, Accessor] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('file://resource1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('file://resource2'), TEST_EDITOR_INPUT_ID);

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true });
		Assert.equAl(Accessor.fileService.wAtches.length, 1);
		Assert.equAl(Accessor.fileService.wAtches[0].toString(), input1.resource.toString());

		const editor = AwAit service.openEditor(input2, { pinned: true });
		Assert.equAl(Accessor.fileService.wAtches.length, 1);
		Assert.equAl(Accessor.fileService.wAtches[0].toString(), input2.resource.toString());

		AwAit editor?.group?.closeAllEditors();
		Assert.equAl(Accessor.fileService.wAtches.length, 0);

		pArt.dispose();
	});

	test('ActiveEditorPAne scopedContextKeyService', Async function () {
		const instAntiAtionService = workbenchInstAntiAtionService({ contextKeyService: instAntiAtionService => instAntiAtionService.creAteInstAnce(MockScopAbleContextKeyService) });
		const [pArt, service] = creAteEditorService(instAntiAtionService);

		const input1 = new TestFileEditorInput(URI.pArse('file://resource1'), TEST_EDITOR_INPUT_ID);
		new TestFileEditorInput(URI.pArse('file://resource2'), TEST_EDITOR_INPUT_ID);

		AwAit pArt.whenRestored;

		AwAit service.openEditor(input1, { pinned: true });

		const editorContextKeyService = service.ActiveEditorPAne?.scopedContextKeyService;
		Assert.ok(!!editorContextKeyService);
		Assert.strictEquAl(editorContextKeyService, pArt.ActiveGroup.ActiveEditorPAne?.scopedContextKeyService);

		pArt.dispose();
	});

	test('overrideOpenEditor', Async function () {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('file://resource1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('file://resource2'), TEST_EDITOR_INPUT_ID);

		AwAit pArt.whenRestored;

		let overrideCAlled = fAlse;

		const hAndler = service.overrideOpenEditor({
			open: editor => {
				if (editor === input1) {
					overrideCAlled = true;

					return { override: service.openEditor(input2, { pinned: true }) };
				}

				return undefined;
			}
		});

		AwAit service.openEditor(input1, { pinned: true });

		Assert.ok(overrideCAlled);
		Assert.equAl(service.ActiveEditor, input2);

		hAndler.dispose();
		pArt.dispose();
	});

	test('whenClosed', Async function () {
		const [pArt, service] = creAteEditorService();

		const input1 = new TestFileEditorInput(URI.pArse('file://resource1'), TEST_EDITOR_INPUT_ID);
		const input2 = new TestFileEditorInput(URI.pArse('file://resource2'), TEST_EDITOR_INPUT_ID);

		AwAit pArt.whenRestored;

		const editor = AwAit service.openEditor(input1, { pinned: true });
		AwAit service.openEditor(input2, { pinned: true });

		const whenClosed = service.whenClosed([{ resource: input1.resource }, { resource: input2.resource }]);

		editor?.group?.closeAllEditors();

		AwAit whenClosed;

		pArt.dispose();
	});
});
