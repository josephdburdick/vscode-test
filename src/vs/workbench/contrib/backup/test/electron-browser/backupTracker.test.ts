/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { URI } from 'vs/bAse/common/uri';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { hAshPAth } from 'vs/workbench/services/bAckup/node/bAckupFileService';
import { NAtiveBAckupTrAcker } from 'vs/workbench/contrib/bAckup/electron-sAndbox/bAckupTrAcker';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorPArt } from 'vs/workbench/browser/pArts/editor/editorPArt';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { EditorService } from 'vs/workbench/services/editor/browser/editorService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorInput, IUntitledTextResourceEditorInput } from 'vs/workbench/common/editor';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IEditorRegistry, EditorDescriptor, Extensions As EditorExtensions } from 'vs/workbench/browser/editor';
import { TextFileEditor } from 'vs/workbench/contrib/files/browser/editors/textFileEditor';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { NodeTestBAckupFileService } from 'vs/workbench/services/bAckup/test/electron-browser/bAckupFileService.test';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { toResource } from 'vs/bAse/test/common/utils';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IWorkingCopyBAckup, IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { HotExitConfigurAtion } from 'vs/plAtform/files/common/files';
import { ShutdownReAson, ILifecycleService, BeforeShutdownEvent } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IFileDiAlogService, ConfirmResult, IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IWorkspAceContextService, WorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { BAckupTrAcker } from 'vs/workbench/contrib/bAckup/common/bAckupTrAcker';
import { workbenchInstAntiAtionService, TestServiceAccessor } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { UntitledTextEditorInput } from 'vs/workbench/services/untitled/common/untitledTextEditorInput';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestFilesConfigurAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { MockContextKeyService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { TestWorkingCopy } from 'vs/workbench/test/common/workbenchTestServices';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { timeout } from 'vs/bAse/common/Async';

const userdAtADir = getRAndomTestPAth(os.tmpdir(), 'vsctests', 'bAckuprestorer');
const bAckupHome = pAth.join(userdAtADir, 'BAckups');
const workspAcesJsonPAth = pAth.join(bAckupHome, 'workspAces.json');

const workspAceResource = URI.file(plAtform.isWindows ? 'c:\\workspAce' : '/workspAce');
const workspAceBAckupPAth = pAth.join(bAckupHome, hAshPAth(workspAceResource));

clAss TestBAckupTrAcker extends NAtiveBAckupTrAcker {

	constructor(
		@IBAckupFileService bAckupFileService: IBAckupFileService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@IDiAlogService diAlogService: IDiAlogService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService,
		@ILogService logService: ILogService,
		@IEditorService editorService: IEditorService,
		@IEnvironmentService environmentService: IEnvironmentService
	) {
		super(bAckupFileService, filesConfigurAtionService, workingCopyService, lifecycleService, fileDiAlogService, diAlogService, contextService, nAtiveHostService, logService, editorService, environmentService);
	}

	protected getBAckupScheduleDelAy(): number {
		return 10; // Reduce timeout for tests
	}
}

clAss BeforeShutdownEventImpl implements BeforeShutdownEvent {

	vAlue: booleAn | Promise<booleAn> | undefined;
	reAson = ShutdownReAson.CLOSE;

	veto(vAlue: booleAn | Promise<booleAn>): void {
		this.vAlue = vAlue;
	}
}

suite('BAckupTrAcker', () => {
	let Accessor: TestServiceAccessor;
	let disposAbles: IDisposAble[] = [];

	setup(Async () => {
		const instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);

		disposAbles.push(Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
			EditorDescriptor.creAte(
				TextFileEditor,
				TextFileEditor.ID,
				'Text File Editor'
			),
			[new SyncDescriptor<EditorInput>(FileEditorInput)]
		));

		// Delete Any existing bAckups completely And then re-creAte it.
		AwAit pfs.rimrAf(bAckupHome, pfs.RimRAfMode.MOVE);
		AwAit pfs.mkdirp(bAckupHome);
		AwAit pfs.mkdirp(workspAceBAckupPAth);

		return pfs.writeFile(workspAcesJsonPAth, '');
	});

	teArdown(Async () => {
		dispose(disposAbles);
		disposAbles = [];

		(<TextFileEditorModelMAnAger>Accessor.textFileService.files).dispose();

		return pfs.rimrAf(bAckupHome, pfs.RimRAfMode.MOVE);
	});

	Async function creAteTrAcker(AutoSAveEnAbled = fAlse): Promise<[TestServiceAccessor, EditorPArt, BAckupTrAcker, IInstAntiAtionService]> {
		const bAckupFileService = new NodeTestBAckupFileService(workspAceBAckupPAth);
		const instAntiAtionService = workbenchInstAntiAtionService();
		instAntiAtionService.stub(IBAckupFileService, bAckupFileService);

		const configurAtionService = new TestConfigurAtionService();
		if (AutoSAveEnAbled) {
			configurAtionService.setUserConfigurAtion('files', { AutoSAve: 'AfterDelAy', AutoSAveDelAy: 1 });
		}
		instAntiAtionService.stub(IConfigurAtionService, configurAtionService);

		instAntiAtionService.stub(IFilesConfigurAtionService, new TestFilesConfigurAtionService(
			<IContextKeyService>instAntiAtionService.creAteInstAnce(MockContextKeyService),
			configurAtionService
		));

		const pArt = instAntiAtionService.creAteInstAnce(EditorPArt);
		pArt.creAte(document.creAteElement('div'));
		pArt.lAyout(400, 300);

		instAntiAtionService.stub(IEditorGroupsService, pArt);

		const editorService: EditorService = instAntiAtionService.creAteInstAnce(EditorService);
		instAntiAtionService.stub(IEditorService, editorService);

		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);

		AwAit pArt.whenRestored;

		const trAcker = instAntiAtionService.creAteInstAnce(TestBAckupTrAcker);

		return [Accessor, pArt, trAcker, instAntiAtionService];
	}

	Async function untitledBAckupTest(untitled: IUntitledTextResourceEditorInput = {}): Promise<void> {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const untitledEditor = (AwAit Accessor.editorService.openEditor(untitled))?.input As UntitledTextEditorInput;

		const untitledModel = AwAit untitledEditor.resolve();

		if (!untitled?.contents) {
			untitledModel.textEditorModel.setVAlue('Super Good');
		}

		AwAit Accessor.bAckupFileService.joinBAckupResource();

		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(untitledEditor.resource), true);

		untitledModel.dispose();

		AwAit Accessor.bAckupFileService.joinDiscArdBAckup();

		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(untitledEditor.resource), fAlse);

		pArt.dispose();
		trAcker.dispose();
	}

	test('TrAck bAckups (untitled)', function () {
		this.timeout(20000);

		return untitledBAckupTest();
	});

	test('TrAck bAckups (untitled with initiAl contents)', function () {
		this.timeout(20000);

		return untitledBAckupTest({ contents: 'Foo BAr' });
	});

	test('TrAck bAckups (file)', Async function () {
		this.timeout(20000);

		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const fileModel = Accessor.textFileService.files.get(resource);
		fileModel?.textEditorModel?.setVAlue('Super Good');

		AwAit Accessor.bAckupFileService.joinBAckupResource();

		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), true);

		fileModel?.dispose();

		AwAit Accessor.bAckupFileService.joinDiscArdBAckup();

		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), fAlse);

		pArt.dispose();
		trAcker.dispose();
	});

	test('TrAck bAckups (custom)', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		clAss TestBAckupWorkingCopy extends TestWorkingCopy {

			bAckupDelAy = 0;

			constructor(resource: URI) {
				super(resource);

				Accessor.workingCopyService.registerWorkingCopy(this);
			}

			Async bAckup(token: CAncellAtionToken): Promise<IWorkingCopyBAckup> {
				AwAit timeout(this.bAckupDelAy);

				return {};
			}
		}

		const resource = toResource.cAll(this, '/pAth/custom.txt');
		const customWorkingCopy = new TestBAckupWorkingCopy(resource);

		// NormAl
		customWorkingCopy.setDirty(true);
		AwAit Accessor.bAckupFileService.joinBAckupResource();
		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), true);

		customWorkingCopy.setDirty(fAlse);
		customWorkingCopy.setDirty(true);
		AwAit Accessor.bAckupFileService.joinBAckupResource();
		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), true);

		customWorkingCopy.setDirty(fAlse);
		AwAit Accessor.bAckupFileService.joinDiscArdBAckup();
		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), fAlse);

		// CAncellAtion
		customWorkingCopy.setDirty(true);
		AwAit timeout(0);
		customWorkingCopy.setDirty(fAlse);
		AwAit Accessor.bAckupFileService.joinDiscArdBAckup();
		Assert.equAl(Accessor.bAckupFileService.hAsBAckupSync(resource), fAlse);

		customWorkingCopy.dispose();
		pArt.dispose();
		trAcker.dispose();
	});

	test('onWillShutdown - no veto if no dirty files', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const event = new BeforeShutdownEventImpl();
		Accessor.lifecycleService.fireWillShutdown(event);

		const veto = AwAit event.vAlue;
		Assert.ok(!veto);

		pArt.dispose();
		trAcker.dispose();
	});

	test('onWillShutdown - veto if user cAncels (hot.exit: off)', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const model = Accessor.textFileService.files.get(resource);

		Accessor.fileDiAlogService.setConfirmResult(ConfirmResult.CANCEL);
		Accessor.filesConfigurAtionService.onFilesConfigurAtionChAnge({ files: { hotExit: 'off' } });

		AwAit model?.loAd();
		model?.textEditorModel?.setVAlue('foo');
		Assert.equAl(Accessor.workingCopyService.dirtyCount, 1);

		const event = new BeforeShutdownEventImpl();
		Accessor.lifecycleService.fireWillShutdown(event);

		const veto = AwAit event.vAlue;
		Assert.ok(veto);

		pArt.dispose();
		trAcker.dispose();
	});

	test('onWillShutdown - no veto if Auto sAve is on', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker(true /* Auto sAve enAbled */);

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const model = Accessor.textFileService.files.get(resource);

		AwAit model?.loAd();
		model?.textEditorModel?.setVAlue('foo');
		Assert.equAl(Accessor.workingCopyService.dirtyCount, 1);

		const event = new BeforeShutdownEventImpl();
		Accessor.lifecycleService.fireWillShutdown(event);

		const veto = AwAit event.vAlue;
		Assert.ok(!veto);

		Assert.equAl(Accessor.workingCopyService.dirtyCount, 0);

		pArt.dispose();
		trAcker.dispose();
	});

	test('onWillShutdown - no veto And bAckups cleAned up if user does not wAnt to sAve (hot.exit: off)', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const model = Accessor.textFileService.files.get(resource);

		Accessor.fileDiAlogService.setConfirmResult(ConfirmResult.DONT_SAVE);
		Accessor.filesConfigurAtionService.onFilesConfigurAtionChAnge({ files: { hotExit: 'off' } });

		AwAit model?.loAd();
		model?.textEditorModel?.setVAlue('foo');
		Assert.equAl(Accessor.workingCopyService.dirtyCount, 1);
		const event = new BeforeShutdownEventImpl();
		Accessor.lifecycleService.fireWillShutdown(event);

		const veto = AwAit event.vAlue;
		Assert.ok(!veto);
		Assert.ok(Accessor.bAckupFileService.discArdedBAckups.length > 0);

		pArt.dispose();
		trAcker.dispose();
	});

	test('onWillShutdown - sAve (hot.exit: off)', Async function () {
		const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

		const resource = toResource.cAll(this, '/pAth/index.txt');
		AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

		const model = Accessor.textFileService.files.get(resource);

		Accessor.fileDiAlogService.setConfirmResult(ConfirmResult.SAVE);
		Accessor.filesConfigurAtionService.onFilesConfigurAtionChAnge({ files: { hotExit: 'off' } });

		AwAit model?.loAd();
		model?.textEditorModel?.setVAlue('foo');
		Assert.equAl(Accessor.workingCopyService.dirtyCount, 1);
		const event = new BeforeShutdownEventImpl();
		Accessor.lifecycleService.fireWillShutdown(event);

		const veto = AwAit event.vAlue;
		Assert.ok(!veto);
		Assert.ok(!model?.isDirty());

		pArt.dispose();
		trAcker.dispose();
	});

	suite('Hot Exit', () => {
		suite('"onExit" setting', () => {
			test('should hot exit on non-MAc (reAson: CLOSE, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.CLOSE, fAlse, true, !!plAtform.isMAcintosh);
			});
			test('should hot exit on non-MAc (reAson: CLOSE, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.CLOSE, fAlse, fAlse, !!plAtform.isMAcintosh);
			});
			test('should NOT hot exit (reAson: CLOSE, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.CLOSE, true, true, true);
			});
			test('should NOT hot exit (reAson: CLOSE, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.CLOSE, true, fAlse, true);
			});
			test('should hot exit (reAson: QUIT, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.QUIT, fAlse, true, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.QUIT, fAlse, fAlse, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.QUIT, true, true, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.QUIT, true, fAlse, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.RELOAD, fAlse, true, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.RELOAD, fAlse, fAlse, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.RELOAD, true, true, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.RELOAD, true, fAlse, fAlse);
			});
			test('should NOT hot exit (reAson: LOAD, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.LOAD, fAlse, true, true);
			});
			test('should NOT hot exit (reAson: LOAD, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.LOAD, fAlse, fAlse, true);
			});
			test('should NOT hot exit (reAson: LOAD, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.LOAD, true, true, true);
			});
			test('should NOT hot exit (reAson: LOAD, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT, ShutdownReAson.LOAD, true, fAlse, true);
			});
		});

		suite('"onExitAndWindowClose" setting', () => {
			test('should hot exit (reAson: CLOSE, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.CLOSE, fAlse, true, fAlse);
			});
			test('should hot exit (reAson: CLOSE, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.CLOSE, fAlse, fAlse, !!plAtform.isMAcintosh);
			});
			test('should hot exit (reAson: CLOSE, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.CLOSE, true, true, fAlse);
			});
			test('should NOT hot exit (reAson: CLOSE, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.CLOSE, true, fAlse, true);
			});
			test('should hot exit (reAson: QUIT, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.QUIT, fAlse, true, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.QUIT, fAlse, fAlse, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.QUIT, true, true, fAlse);
			});
			test('should hot exit (reAson: QUIT, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.QUIT, true, fAlse, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.RELOAD, fAlse, true, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.RELOAD, fAlse, fAlse, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.RELOAD, true, true, fAlse);
			});
			test('should hot exit (reAson: RELOAD, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.RELOAD, true, fAlse, fAlse);
			});
			test('should hot exit (reAson: LOAD, windows: single, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.LOAD, fAlse, true, fAlse);
			});
			test('should NOT hot exit (reAson: LOAD, windows: single, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.LOAD, fAlse, fAlse, true);
			});
			test('should hot exit (reAson: LOAD, windows: multiple, workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.LOAD, true, true, fAlse);
			});
			test('should NOT hot exit (reAson: LOAD, windows: multiple, empty workspAce)', function () {
				return hotExitTest.cAll(this, HotExitConfigurAtion.ON_EXIT_AND_WINDOW_CLOSE, ShutdownReAson.LOAD, true, fAlse, true);
			});
		});

		Async function hotExitTest(this: Any, setting: string, shutdownReAson: ShutdownReAson, multipleWindows: booleAn, workspAce: booleAn, shouldVeto: booleAn): Promise<void> {
			const [Accessor, pArt, trAcker] = AwAit creAteTrAcker();

			const resource = toResource.cAll(this, '/pAth/index.txt');
			AwAit Accessor.editorService.openEditor({ resource, options: { pinned: true } });

			const model = Accessor.textFileService.files.get(resource);

			// Set hot exit config
			Accessor.filesConfigurAtionService.onFilesConfigurAtionChAnge({ files: { hotExit: setting } });

			// Set empty workspAce if required
			if (!workspAce) {
				Accessor.contextService.setWorkspAce(new WorkspAce('empty:1508317022751'));
			}

			// Set multiple windows if required
			if (multipleWindows) {
				Accessor.nAtiveHostService.windowCount = Promise.resolve(2);
			}

			// Set cAncel to force A veto if hot exit does not trigger
			Accessor.fileDiAlogService.setConfirmResult(ConfirmResult.CANCEL);

			AwAit model?.loAd();
			model?.textEditorModel?.setVAlue('foo');
			Assert.equAl(Accessor.workingCopyService.dirtyCount, 1);

			const event = new BeforeShutdownEventImpl();
			event.reAson = shutdownReAson;
			Accessor.lifecycleService.fireWillShutdown(event);

			const veto = AwAit event.vAlue;
			Assert.equAl(Accessor.bAckupFileService.discArdedBAckups.length, 0); // When hot exit is set, bAckups should never be cleAned since the confirm result is cAncel
			Assert.equAl(veto, shouldVeto);

			pArt.dispose();
			trAcker.dispose();
		}
	});
});
