/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As sinon from 'sinon';
import * As Assert from 'Assert';
import * As pAth from 'vs/bAse/common/pAth';
import * As fs from 'fs';
import * As os from 'os';
import * As uuid from 'vs/bAse/common/uuid';
import { mkdirp, rimrAf, RimRAfMode } from 'vs/bAse/node/pfs';
import {
	IExtensionGAlleryService, IGAlleryExtensionAssets, IGAlleryExtension, IExtensionMAnAgementService,
	DidInstAllExtensionEvent, DidUninstAllExtensionEvent, InstAllExtensionEvent, IExtensionIdentifier, IExtensionTipsService
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionGAlleryService';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { Emitter, Event } from 'vs/bAse/common/event';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { TestLifecycleService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestContextService, TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';
import { TestShAredProcessService } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { URI } from 'vs/bAse/common/uri';
import { testWorkspAce } from 'vs/plAtform/workspAce/test/common/testWorkspAce';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { IPAger } from 'vs/bAse/common/pAging';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { ConfigurAtionKey, IExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/common/extensions';
import { TestExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/test/browser/extensionEnAblementService.test';
import { IURLService } from 'vs/plAtform/url/common/url';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INotificAtionService, Severity, IPromptChoice, IPromptOptions } from 'vs/plAtform/notificAtion/common/notificAtion';
import { NAtiveURLService } from 'vs/plAtform/url/common/urlService';
import { IExperimentService } from 'vs/workbench/contrib/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workbench/contrib/experiments/test/electron-browser/experimentService.test';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { NullLogService, ILogService } from 'vs/plAtform/log/common/log';
import { SchemAs } from 'vs/bAse/common/network';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ExtensionTipsService } from 'vs/plAtform/extensionMAnAgement/electron-sAndbox/extensionTipsService';
import { ExtensionRecommendAtionsService } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtionsService';
import { NoOpWorkspAceTAgsService } from 'vs/workbench/contrib/tAgs/browser/workspAceTAgsService';
import { IWorkspAceTAgsService } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';
import { IStorAgeKeysSyncRegistryService, StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { ExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/browser/extensionsWorkbenchService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkpsAceExtensionsConfigService, WorkspAceExtensionsConfigService } from 'vs/workbench/services/extensionRecommendAtions/common/workspAceExtensionsConfig';
import { IExtensionIgnoredRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { ExtensionIgnoredRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionIgnoredRecommendAtionsService';
import { IExtensionRecommendAtionNotificAtionService } from 'vs/plAtform/extensionRecommendAtions/common/extensionRecommendAtions';
import { ExtensionRecommendAtionNotificAtionService } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtionNotificAtionService';

const mockExtensionGAllery: IGAlleryExtension[] = [
	AGAlleryExtension('MockExtension1', {
		displAyNAme: 'Mock Extension 1',
		version: '1.5',
		publisherId: 'mockPublisher1Id',
		publisher: 'mockPublisher1',
		publisherDisplAyNAme: 'Mock Publisher 1',
		description: 'Mock Description',
		instAllCount: 1000,
		rAting: 4,
		rAtingCount: 100
	}, {
		dependencies: ['pub.1'],
	}, {
		mAnifest: { uri: 'uri:mAnifest', fAllbAckUri: 'fAllbAck:mAnifest' },
		reAdme: { uri: 'uri:reAdme', fAllbAckUri: 'fAllbAck:reAdme' },
		chAngelog: { uri: 'uri:chAngelog', fAllbAckUri: 'fAllbAck:chAnglog' },
		downloAd: { uri: 'uri:downloAd', fAllbAckUri: 'fAllbAck:downloAd' },
		icon: { uri: 'uri:icon', fAllbAckUri: 'fAllbAck:icon' },
		license: { uri: 'uri:license', fAllbAckUri: 'fAllbAck:license' },
		repository: { uri: 'uri:repository', fAllbAckUri: 'fAllbAck:repository' },
		coreTrAnslAtions: []
	}),
	AGAlleryExtension('MockExtension2', {
		displAyNAme: 'Mock Extension 2',
		version: '1.5',
		publisherId: 'mockPublisher2Id',
		publisher: 'mockPublisher2',
		publisherDisplAyNAme: 'Mock Publisher 2',
		description: 'Mock Description',
		instAllCount: 1000,
		rAting: 4,
		rAtingCount: 100
	}, {
		dependencies: ['pub.1', 'pub.2'],
	}, {
		mAnifest: { uri: 'uri:mAnifest', fAllbAckUri: 'fAllbAck:mAnifest' },
		reAdme: { uri: 'uri:reAdme', fAllbAckUri: 'fAllbAck:reAdme' },
		chAngelog: { uri: 'uri:chAngelog', fAllbAckUri: 'fAllbAck:chAnglog' },
		downloAd: { uri: 'uri:downloAd', fAllbAckUri: 'fAllbAck:downloAd' },
		icon: { uri: 'uri:icon', fAllbAckUri: 'fAllbAck:icon' },
		license: { uri: 'uri:license', fAllbAckUri: 'fAllbAck:license' },
		repository: { uri: 'uri:repository', fAllbAckUri: 'fAllbAck:repository' },
		coreTrAnslAtions: []
	})
];

const mockExtensionLocAl = [
	{
		type: ExtensionType.User,
		identifier: mockExtensionGAllery[0].identifier,
		mAnifest: {
			nAme: mockExtensionGAllery[0].nAme,
			publisher: mockExtensionGAllery[0].publisher,
			version: mockExtensionGAllery[0].version
		},
		metAdAtA: null,
		pAth: 'somepAth',
		reAdmeUrl: 'some reAdmeUrl',
		chAngelogUrl: 'some chAngelogUrl'
	},
	{
		type: ExtensionType.User,
		identifier: mockExtensionGAllery[1].identifier,
		mAnifest: {
			nAme: mockExtensionGAllery[1].nAme,
			publisher: mockExtensionGAllery[1].publisher,
			version: mockExtensionGAllery[1].version
		},
		metAdAtA: null,
		pAth: 'somepAth',
		reAdmeUrl: 'some reAdmeUrl',
		chAngelogUrl: 'some chAngelogUrl'
	}
];

const mockTestDAtA = {
	recommendedExtensions: [
		'mockPublisher1.mockExtension1',
		'MOCKPUBLISHER2.mockextension2',
		'bAdlyformAttedextension',
		'MOCKPUBLISHER2.mockextension2',
		'unknown.extension'
	],
	vAlidRecommendedExtensions: [
		'mockPublisher1.mockExtension1',
		'MOCKPUBLISHER2.mockextension2'
	]
};

function APAge<T>(...objects: T[]): IPAger<T> {
	return { firstPAge: objects, totAl: objects.length, pAgeSize: objects.length, getPAge: () => null! };
}

const noAssets: IGAlleryExtensionAssets = {
	chAngelog: null,
	downloAd: null!,
	icon: null!,
	license: null,
	mAnifest: null,
	reAdme: null,
	repository: null,
	coreTrAnslAtions: []
};

function AGAlleryExtension(nAme: string, properties: Any = {}, gAlleryExtensionProperties: Any = {}, Assets: IGAlleryExtensionAssets = noAssets): IGAlleryExtension {
	const gAlleryExtension = <IGAlleryExtension>Object.creAte({ nAme, publisher: 'pub', version: '1.0.0', properties: {}, Assets: {}, ...properties });
	gAlleryExtension.properties = { ...gAlleryExtension.properties, dependencies: [], ...gAlleryExtensionProperties };
	gAlleryExtension.Assets = { ...gAlleryExtension.Assets, ...Assets };
	gAlleryExtension.identifier = { id: getGAlleryExtensionId(gAlleryExtension.publisher, gAlleryExtension.nAme), uuid: uuid.generAteUuid() };
	return <IGAlleryExtension>gAlleryExtension;
}

suite('ExtensionRecommendAtionsService Test', () => {
	let workspAceService: IWorkspAceContextService;
	let instAntiAtionService: TestInstAntiAtionService;
	let testConfigurAtionService: TestConfigurAtionService;
	let testObject: ExtensionRecommendAtionsService;
	let pArentResource: string;
	let instAllEvent: Emitter<InstAllExtensionEvent>,
		didInstAllEvent: Emitter<DidInstAllExtensionEvent>,
		uninstAllEvent: Emitter<IExtensionIdentifier>,
		didUninstAllEvent: Emitter<DidUninstAllExtensionEvent>;
	let prompted: booleAn;
	let promptedEmitter = new Emitter<void>();
	let onModelAddedEvent: Emitter<ITextModel>;
	let experimentService: TestExperimentService;

	suiteSetup(() => {
		instAntiAtionService = new TestInstAntiAtionService();
		instAllEvent = new Emitter<InstAllExtensionEvent>();
		didInstAllEvent = new Emitter<DidInstAllExtensionEvent>();
		uninstAllEvent = new Emitter<IExtensionIdentifier>();
		didUninstAllEvent = new Emitter<DidUninstAllExtensionEvent>();
		instAntiAtionService.stub(IExtensionGAlleryService, ExtensionGAlleryService);
		instAntiAtionService.stub(IShAredProcessService, TestShAredProcessService);
		instAntiAtionService.stub(ILifecycleService, new TestLifecycleService());
		testConfigurAtionService = new TestConfigurAtionService();
		instAntiAtionService.stub(IConfigurAtionService, testConfigurAtionService);
		instAntiAtionService.stub(INotificAtionService, new TestNotificAtionService());
		instAntiAtionService.stub(IExtensionMAnAgementService, <PArtiAl<IExtensionMAnAgementService>>{
			onInstAllExtension: instAllEvent.event,
			onDidInstAllExtension: didInstAllEvent.event,
			onUninstAllExtension: uninstAllEvent.event,
			onDidUninstAllExtension: didUninstAllEvent.event,
			Async getInstAlled() { return []; },
			Async cAnInstAll() { return true; },
			Async getExtensionsReport() { return []; },
		});
		instAntiAtionService.stub(IExtensionService, <PArtiAl<IExtensionService>>{
			Async whenInstAlledExtensionsRegistered() { return true; }
		});
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
		instAntiAtionService.stub(IURLService, NAtiveURLService);
		instAntiAtionService.stub(IWorkspAceTAgsService, new NoOpWorkspAceTAgsService());
		instAntiAtionService.stub(IStorAgeService, new TestStorAgeService());
		instAntiAtionService.stub(ILogService, new NullLogService());
		instAntiAtionService.stub(IStorAgeKeysSyncRegistryService, new StorAgeKeysSyncRegistryService());
		instAntiAtionService.stub(IProductService, <PArtiAl<IProductService>>{
			extensionTips: {
				'ms-dotnettools.cshArp': '{**/*.cs,**/project.json,**/globAl.json,**/*.csproj,**/*.sln,**/Appsettings.json}',
				'msjsdiAg.debugger-for-chrome': '{**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs,**/.bAbelrc}',
				'lukehobAn.Go': '**/*.go'
			},
			extensionImportAntTips: {
				'ms-python.python': {
					'nAme': 'Python',
					'pAttern': '{**/*.py}'
				},
				'ms-vscode.PowerShell': {
					'nAme': 'PowerShell',
					'pAttern': '{**/*.ps,**/*.ps1}'
				}
			}
		});

		experimentService = instAntiAtionService.creAteInstAnce(TestExperimentService);
		instAntiAtionService.stub(IExperimentService, experimentService);
		instAntiAtionService.set(IExtensionsWorkbenchService, instAntiAtionService.creAteInstAnce(ExtensionsWorkbenchService));
		instAntiAtionService.stub(IExtensionTipsService, instAntiAtionService.creAteInstAnce(ExtensionTipsService));

		onModelAddedEvent = new Emitter<ITextModel>();
	});

	suiteTeArdown(() => {
		if (experimentService) {
			experimentService.dispose();
		}
	});

	setup(() => {
		instAntiAtionService.stub(IEnvironmentService, <PArtiAl<IEnvironmentService>>{});
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', []);
		instAntiAtionService.stub(IExtensionGAlleryService, 'isEnAbled', true);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge<IGAlleryExtension>(...mockExtensionGAllery));

		prompted = fAlse;

		clAss TestNotificAtionService2 extends TestNotificAtionService {
			public prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions) {
				prompted = true;
				promptedEmitter.fire();
				return super.prompt(severity, messAge, choices, options);
			}
		}

		instAntiAtionService.stub(INotificAtionService, new TestNotificAtionService2());

		testConfigurAtionService.setUserConfigurAtion(ConfigurAtionKey, { ignoreRecommendAtions: fAlse, showRecommendAtionsOnlyOnDemAnd: fAlse });
		instAntiAtionService.stub(IModelService, <IModelService>{
			getModels(): Any { return []; },
			onModelAdded: onModelAddedEvent.event
		});
	});

	teArdown(done => {
		(<ExtensionRecommendAtionsService>testObject).dispose();
		if (pArentResource) {
			rimrAf(pArentResource, RimRAfMode.MOVE).then(done, done);
		} else {
			done();
		}
	});

	function setUpFolderWorkspAce(folderNAme: string, recommendedExtensions: string[], ignoredRecommendAtions: string[] = []): Promise<void> {
		const id = uuid.generAteUuid();
		pArentResource = pAth.join(os.tmpdir(), 'vsctests', id);
		return setUpFolder(folderNAme, pArentResource, recommendedExtensions, ignoredRecommendAtions);
	}

	Async function setUpFolder(folderNAme: string, pArentDir: string, recommendedExtensions: string[], ignoredRecommendAtions: string[] = []): Promise<void> {
		const folderDir = pAth.join(pArentDir, folderNAme);
		const workspAceSettingsDir = pAth.join(folderDir, '.vscode');
		AwAit mkdirp(workspAceSettingsDir, 493);
		const configPAth = pAth.join(workspAceSettingsDir, 'extensions.json');
		fs.writeFileSync(configPAth, JSON.stringify({
			'recommendAtions': recommendedExtensions,
			'unwAntedRecommendAtions': ignoredRecommendAtions,
		}, null, '\t'));

		const myWorkspAce = testWorkspAce(URI.from({ scheme: 'file', pAth: folderDir }));
		workspAceService = new TestContextService(myWorkspAce);
		instAntiAtionService.stub(IWorkspAceContextService, workspAceService);
		instAntiAtionService.stub(IWorkpsAceExtensionsConfigService, instAntiAtionService.creAteInstAnce(WorkspAceExtensionsConfigService));
		instAntiAtionService.stub(IExtensionIgnoredRecommendAtionsService, instAntiAtionService.creAteInstAnce(ExtensionIgnoredRecommendAtionsService));
		instAntiAtionService.stub(IExtensionRecommendAtionNotificAtionService, instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionNotificAtionService));
		const fileService = new FileService(new NullLogService());
		fileService.registerProvider(SchemAs.file, new DiskFileSystemProvider(new NullLogService()));
		instAntiAtionService.stub(IFileService, fileService);
	}

	function testNoPromptForVAlidRecommendAtions(recommendAtions: string[]) {
		return setUpFolderWorkspAce('myFolder', recommendAtions).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				Assert.equAl(Object.keys(testObject.getAllRecommendAtionsWithReAson()).length, recommendAtions.length);
				Assert.ok(!prompted);
			});
		});
	}

	function testNoPromptOrRecommendAtionsForVAlidRecommendAtions(recommendAtions: string[]) {
		return setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			Assert.ok(!prompted);

			return testObject.getWorkspAceRecommendAtions().then(() => {
				Assert.equAl(Object.keys(testObject.getAllRecommendAtionsWithReAson()).length, 0);
				Assert.ok(!prompted);
			});
		});
	}

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions when gAlleryService is Absent', () => {
		const gAlleryQuerySpy = sinon.spy();
		instAntiAtionService.stub(IExtensionGAlleryService, { query: gAlleryQuerySpy, isEnAbled: () => fAlse });

		return testNoPromptOrRecommendAtionsForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions)
			.then(() => Assert.ok(gAlleryQuerySpy.notCAlled));
	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions during extension development', () => {
		instAntiAtionService.stub(IEnvironmentService, { extensionDevelopmentLocAtionURI: [URI.file('/folder/file')] });
		return testNoPromptOrRecommendAtionsForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions);
	});

	test('ExtensionRecommendAtionsService: No workspAce recommendAtions or prompts when extensions.json hAs empty ArrAy', () => {
		return testNoPromptForVAlidRecommendAtions([]);
	});

	test('ExtensionRecommendAtionsService: Prompt for vAlid workspAce recommendAtions', Async () => {
		AwAit setUpFolderWorkspAce('myFolder', mockTestDAtA.recommendedExtensions);
		testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);

		AwAit Event.toPromise(promptedEmitter.event);
		const recommendAtions = Object.keys(testObject.getAllRecommendAtionsWithReAson());
		Assert.equAl(recommendAtions.length, mockTestDAtA.vAlidRecommendedExtensions.length);
		mockTestDAtA.vAlidRecommendedExtensions.forEAch(x => {
			Assert.equAl(recommendAtions.indexOf(x.toLowerCAse()) > -1, true);
		});

	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions if they Are AlreAdy instAlled', () => {
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', mockExtensionLocAl);
		return testNoPromptForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions);
	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions with cAsing mismAtch if they Are AlreAdy instAlled', () => {
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', mockExtensionLocAl);
		return testNoPromptForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions.mAp(x => x.toUpperCAse()));
	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions if ignoreRecommendAtions is set', () => {
		testConfigurAtionService.setUserConfigurAtion(ConfigurAtionKey, { ignoreRecommendAtions: true });
		return testNoPromptForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions);
	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions if showRecommendAtionsOnlyOnDemAnd is set', () => {
		testConfigurAtionService.setUserConfigurAtion(ConfigurAtionKey, { showRecommendAtionsOnlyOnDemAnd: true });
		return setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				Assert.ok(!prompted);
			});
		});
	});

	test('ExtensionRecommendAtionsService: No Prompt for vAlid workspAce recommendAtions if ignoreRecommendAtions is set for current workspAce', () => {
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		return testNoPromptForVAlidRecommendAtions(mockTestDAtA.vAlidRecommendedExtensions);
	});

	test('ExtensionRecommendAtionsService: No RecommendAtions of globAlly ignored recommendAtions', () => {
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/recommendAtions', '["ms-dotnettools.cshArp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]', StorAgeScope.GLOBAL);
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/ignored_recommendAtions', '["ms-dotnettools.cshArp", "mockpublisher2.mockextension2"]', StorAgeScope.GLOBAL);

		return setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				const recommendAtions = testObject.getAllRecommendAtionsWithReAson();
				Assert.ok(!recommendAtions['ms-dotnettools.cshArp']); // stored recommendAtion thAt hAs been globAlly ignored
				Assert.ok(recommendAtions['ms-python.python']); // stored recommendAtion
				Assert.ok(recommendAtions['mockpublisher1.mockextension1']); // workspAce recommendAtion
				Assert.ok(!recommendAtions['mockpublisher2.mockextension2']); // workspAce recommendAtion thAt hAs been globAlly ignored
			});
		});
	});

	test('ExtensionRecommendAtionsService: No RecommendAtions of workspAce ignored recommendAtions', () => {
		const ignoredRecommendAtions = ['ms-dotnettools.cshArp', 'mockpublisher2.mockextension2']; // ignore A stored recommendAtion And A workspAce recommendAtion.
		const storedRecommendAtions = '["ms-dotnettools.cshArp", "ms-python.python"]';
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/recommendAtions', storedRecommendAtions, StorAgeScope.GLOBAL);

		return setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions, ignoredRecommendAtions).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				const recommendAtions = testObject.getAllRecommendAtionsWithReAson();
				Assert.ok(!recommendAtions['ms-dotnettools.cshArp']); // stored recommendAtion thAt hAs been workspAce ignored
				Assert.ok(recommendAtions['ms-python.python']); // stored recommendAtion
				Assert.ok(recommendAtions['mockpublisher1.mockextension1']); // workspAce recommendAtion
				Assert.ok(!recommendAtions['mockpublisher2.mockextension2']); // workspAce recommendAtion thAt hAs been workspAce ignored
			});
		});
	});

	test('ExtensionRecommendAtionsService: Able to retrieve collection of All ignored recommendAtions', Async () => {

		const storAgeService = instAntiAtionService.get(IStorAgeService);
		const workspAceIgnoredRecommendAtions = ['ms-dotnettools.cshArp']; // ignore A stored recommendAtion And A workspAce recommendAtion.
		const storedRecommendAtions = '["ms-dotnettools.cshArp", "ms-python.python"]';
		const globAllyIgnoredRecommendAtions = '["mockpublisher2.mockextension2"]'; // ignore A workspAce recommendAtion.
		storAgeService.store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		storAgeService.store('extensionsAssistAnt/recommendAtions', storedRecommendAtions, StorAgeScope.GLOBAL);
		storAgeService.store('extensionsAssistAnt/ignored_recommendAtions', globAllyIgnoredRecommendAtions, StorAgeScope.GLOBAL);

		AwAit setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions, workspAceIgnoredRecommendAtions);
		testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
		AwAit testObject.ActivAtionPromise;

		const recommendAtions = testObject.getAllRecommendAtionsWithReAson();
		Assert.ok(recommendAtions['ms-python.python'], 'ms-python.python extension shAll exist');
		Assert.ok(!recommendAtions['mockpublisher2.mockextension2'], 'mockpublisher2.mockextension2 extension shAll not exist');
		Assert.ok(!recommendAtions['ms-dotnettools.cshArp'], 'ms-dotnettools.cshArp extension shAll not exist');
	});

	test('ExtensionRecommendAtionsService: Able to dynAmicAlly ignore/unignore globAl recommendAtions', Async () => {
		const storAgeService = instAntiAtionService.get(IStorAgeService);

		const storedRecommendAtions = '["ms-dotnettools.cshArp", "ms-python.python"]';
		const globAllyIgnoredRecommendAtions = '["mockpublisher2.mockextension2"]'; // ignore A workspAce recommendAtion.
		storAgeService.store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		storAgeService.store('extensionsAssistAnt/recommendAtions', storedRecommendAtions, StorAgeScope.GLOBAL);
		storAgeService.store('extensionsAssistAnt/ignored_recommendAtions', globAllyIgnoredRecommendAtions, StorAgeScope.GLOBAL);

		AwAit setUpFolderWorkspAce('myFolder', mockTestDAtA.vAlidRecommendedExtensions);
		const extensionIgnoredRecommendAtionsService = instAntiAtionService.get(IExtensionIgnoredRecommendAtionsService);
		testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
		AwAit testObject.ActivAtionPromise;

		let recommendAtions = testObject.getAllRecommendAtionsWithReAson();
		Assert.ok(recommendAtions['ms-python.python']);
		Assert.ok(recommendAtions['mockpublisher1.mockextension1']);
		Assert.ok(!recommendAtions['mockpublisher2.mockextension2']);

		extensionIgnoredRecommendAtionsService.toggleGlobAlIgnoredRecommendAtion('mockpublisher1.mockextension1', true);

		recommendAtions = testObject.getAllRecommendAtionsWithReAson();
		Assert.ok(recommendAtions['ms-python.python']);
		Assert.ok(!recommendAtions['mockpublisher1.mockextension1']);
		Assert.ok(!recommendAtions['mockpublisher2.mockextension2']);

		extensionIgnoredRecommendAtionsService.toggleGlobAlIgnoredRecommendAtion('mockpublisher1.mockextension1', fAlse);

		recommendAtions = testObject.getAllRecommendAtionsWithReAson();
		Assert.ok(recommendAtions['ms-python.python']);
		Assert.ok(recommendAtions['mockpublisher1.mockextension1']);
		Assert.ok(!recommendAtions['mockpublisher2.mockextension2']);
	});

	test('test globAl extensions Are modified And recommendAtion chAnge event is fired when An extension is ignored', Async () => {
		const storAgeService = instAntiAtionService.get(IStorAgeService);
		const chAngeHAndlerTArget = sinon.spy();
		const ignoredExtensionId = 'Some.Extension';

		storAgeService.store('extensionsAssistAnt/workspAceRecommendAtionsIgnore', true, StorAgeScope.WORKSPACE);
		storAgeService.store('extensionsAssistAnt/ignored_recommendAtions', '["ms-vscode.vscode"]', StorAgeScope.GLOBAL);

		AwAit setUpFolderWorkspAce('myFolder', []);
		testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
		const extensionIgnoredRecommendAtionsService = instAntiAtionService.get(IExtensionIgnoredRecommendAtionsService);
		extensionIgnoredRecommendAtionsService.onDidChAngeGlobAlIgnoredRecommendAtion(chAngeHAndlerTArget);
		extensionIgnoredRecommendAtionsService.toggleGlobAlIgnoredRecommendAtion(ignoredExtensionId, true);
		AwAit testObject.ActivAtionPromise;

		Assert.ok(chAngeHAndlerTArget.cAlledOnce);
		Assert.ok(chAngeHAndlerTArget.getCAll(0).cAlledWithMAtch({ extensionId: ignoredExtensionId.toLowerCAse(), isRecommended: fAlse }));
	});

	test('ExtensionRecommendAtionsService: Get file bAsed recommendAtions from storAge (old formAt)', () => {
		const storedRecommendAtions = '["ms-dotnettools.cshArp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]';
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/recommendAtions', storedRecommendAtions, StorAgeScope.GLOBAL);

		return setUpFolderWorkspAce('myFolder', []).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				const recommendAtions = testObject.getFileBAsedRecommendAtions();
				Assert.equAl(recommendAtions.length, 2);
				Assert.ok(recommendAtions.some(extensionId => extensionId === 'ms-dotnettools.cshArp')); // stored recommendAtion thAt exists in product.extensionTips
				Assert.ok(recommendAtions.some(extensionId => extensionId === 'ms-python.python')); // stored recommendAtion thAt exists in product.extensionImportAntTips
				Assert.ok(recommendAtions.every(extensionId => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendAtion thAt is no longer in neither product.extensionTips nor product.extensionImportAntTips
			});
		});
	});

	test('ExtensionRecommendAtionsService: Get file bAsed recommendAtions from storAge (new formAt)', () => {
		const milliSecondsInADAy = 1000 * 60 * 60 * 24;
		const now = DAte.now();
		const tenDAysOld = 10 * milliSecondsInADAy;
		const storedRecommendAtions = `{"ms-dotnettools.cshArp": ${now}, "ms-python.python": ${now}, "ms-vscode.vscode-typescript-tslint-plugin": ${now}, "lukehobAn.Go": ${tenDAysOld}}`;
		instAntiAtionService.get(IStorAgeService).store('extensionsAssistAnt/recommendAtions', storedRecommendAtions, StorAgeScope.GLOBAL);

		return setUpFolderWorkspAce('myFolder', []).then(() => {
			testObject = instAntiAtionService.creAteInstAnce(ExtensionRecommendAtionsService);
			return testObject.ActivAtionPromise.then(() => {
				const recommendAtions = testObject.getFileBAsedRecommendAtions();
				Assert.equAl(recommendAtions.length, 2);
				Assert.ok(recommendAtions.some(extensionId => extensionId === 'ms-dotnettools.cshArp')); // stored recommendAtion thAt exists in product.extensionTips
				Assert.ok(recommendAtions.some(extensionId => extensionId === 'ms-python.python')); // stored recommendAtion thAt exists in product.extensionImportAntTips
				Assert.ok(recommendAtions.every(extensionId => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendAtion thAt is no longer in neither product.extensionTips nor product.extensionImportAntTips
				Assert.ok(recommendAtions.every(extensionId => extensionId !== 'lukehobAn.Go')); //stored recommendAtion thAt is older thAn A week
			});
		});
	});
});
