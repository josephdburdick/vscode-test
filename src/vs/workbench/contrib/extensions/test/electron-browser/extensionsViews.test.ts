/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { generateUuid } from 'vs/Base/common/uuid';
import { ExtensionsListView } from 'vs/workBench/contriB/extensions/Browser/extensionsViews';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/common/extensions';
import { ExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/Browser/extensionsWorkBenchService';
import {
	IExtensionManagementService, IExtensionGalleryService, ILocalExtension, IGalleryExtension, IQueryOptions,
	DidInstallExtensionEvent, DidUninstallExtensionEvent, InstallExtensionEvent, IExtensionIdentifier, SortBy
} from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IExtensionManagementServerService, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationsService, ExtensionRecommendationReason } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { TestExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/test/Browser/extensionEnaBlementService.test';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { IURLService } from 'vs/platform/url/common/url';
import { Emitter } from 'vs/Base/common/event';
import { IPager } from 'vs/Base/common/paging';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IExtensionService, toExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { TestMenuService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { TestSharedProcessService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { NativeURLService } from 'vs/platform/url/common/urlService';
import { URI } from 'vs/Base/common/uri';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { SinonStuB } from 'sinon';
import { IExperimentService, ExperimentState, ExperimentActionType, ExperimentService } from 'vs/workBench/contriB/experiments/common/experimentService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { RemoteAgentService } from 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import { ExtensionType, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { ExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/electron-Browser/extensionManagementServerService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { IMenuService } from 'vs/platform/actions/common/actions';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';

suite('ExtensionsListView Tests', () => {

	let instantiationService: TestInstantiationService;
	let testaBleView: ExtensionsListView;
	let installEvent: Emitter<InstallExtensionEvent>,
		didInstallEvent: Emitter<DidInstallExtensionEvent>,
		uninstallEvent: Emitter<IExtensionIdentifier>,
		didUninstallEvent: Emitter<DidUninstallExtensionEvent>;

	const localEnaBledTheme = aLocalExtension('first-enaBled-extension', { categories: ['Themes', 'random'] });
	const localEnaBledLanguage = aLocalExtension('second-enaBled-extension', { categories: ['Programming languages'] });
	const localDisaBledTheme = aLocalExtension('first-disaBled-extension', { categories: ['themes'] });
	const localDisaBledLanguage = aLocalExtension('second-disaBled-extension', { categories: ['programming languages'] });
	const localRandom = aLocalExtension('random-enaBled-extension', { categories: ['random'] });
	const BuiltInTheme = aLocalExtension('my-theme', { contriButes: { themes: ['my-theme'] } }, { type: ExtensionType.System });
	const BuiltInBasic = aLocalExtension('my-lang', { contriButes: { grammars: [{ language: 'my-language' }] } }, { type: ExtensionType.System });

	const workspaceRecommendationA = aGalleryExtension('workspace-recommendation-A');
	const workspaceRecommendationB = aGalleryExtension('workspace-recommendation-B');
	const configBasedRecommendationA = aGalleryExtension('configBased-recommendation-A');
	const configBasedRecommendationB = aGalleryExtension('configBased-recommendation-B');
	const fileBasedRecommendationA = aGalleryExtension('fileBased-recommendation-A');
	const fileBasedRecommendationB = aGalleryExtension('fileBased-recommendation-B');
	const otherRecommendationA = aGalleryExtension('other-recommendation-A');

	suiteSetup(() => {
		installEvent = new Emitter<InstallExtensionEvent>();
		didInstallEvent = new Emitter<DidInstallExtensionEvent>();
		uninstallEvent = new Emitter<IExtensionIdentifier>();
		didUninstallEvent = new Emitter<DidUninstallExtensionEvent>();

		instantiationService = new TestInstantiationService();
		instantiationService.stuB(ITelemetryService, NullTelemetryService);
		instantiationService.stuB(ILogService, NullLogService);

		instantiationService.stuB(IWorkspaceContextService, new TestContextService());
		instantiationService.stuB(IConfigurationService, new TestConfigurationService());

		instantiationService.stuB(IExtensionGalleryService, ExtensionGalleryService);
		instantiationService.stuB(ISharedProcessService, TestSharedProcessService);
		instantiationService.stuB(IExperimentService, ExperimentService);

		instantiationService.stuB(IExtensionManagementService, <Partial<IExtensionManagementService>>{
			onInstallExtension: installEvent.event,
			onDidInstallExtension: didInstallEvent.event,
			onUninstallExtension: uninstallEvent.event,
			onDidUninstallExtension: didUninstallEvent.event,
			async getInstalled() { return []; },
			async canInstall() { return true; },
			async getExtensionsReport() { return []; },
		});
		instantiationService.stuB(IRemoteAgentService, RemoteAgentService);
		instantiationService.stuB(IContextKeyService, new MockContextKeyService());
		instantiationService.stuB(IMenuService, new TestMenuService());

		instantiationService.stuB(IExtensionManagementServerService, new class extends ExtensionManagementServerService {
			#localExtensionManagementServer: IExtensionManagementServer = { extensionManagementService: instantiationService.get(IExtensionManagementService), laBel: 'local', id: 'vscode-local' };
			constructor() {
				super(instantiationService.get(ISharedProcessService), instantiationService.get(IRemoteAgentService), instantiationService.get(ILaBelService), instantiationService);
			}
			get localExtensionManagementServer(): IExtensionManagementServer { return this.#localExtensionManagementServer; }
			set localExtensionManagementServer(server: IExtensionManagementServer) { }
		}());

		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));

		const reasons: { [key: string]: any } = {};
		reasons[workspaceRecommendationA.identifier.id] = { reasonId: ExtensionRecommendationReason.Workspace };
		reasons[workspaceRecommendationB.identifier.id] = { reasonId: ExtensionRecommendationReason.Workspace };
		reasons[fileBasedRecommendationA.identifier.id] = { reasonId: ExtensionRecommendationReason.File };
		reasons[fileBasedRecommendationB.identifier.id] = { reasonId: ExtensionRecommendationReason.File };
		reasons[otherRecommendationA.identifier.id] = { reasonId: ExtensionRecommendationReason.ExecutaBle };
		reasons[configBasedRecommendationA.identifier.id] = { reasonId: ExtensionRecommendationReason.WorkspaceConfig };
		instantiationService.stuB(IExtensionRecommendationsService, <Partial<IExtensionRecommendationsService>>{
			getWorkspaceRecommendations() {
				return Promise.resolve([
					workspaceRecommendationA.identifier.id,
					workspaceRecommendationB.identifier.id]);
			},
			getConfigBasedRecommendations() {
				return Promise.resolve({
					important: [configBasedRecommendationA.identifier.id],
					others: [configBasedRecommendationB.identifier.id],
				});
			},
			getImportantRecommendations(): Promise<string[]> {
				return Promise.resolve([]);
			},
			getFileBasedRecommendations() {
				return [
					fileBasedRecommendationA.identifier.id,
					fileBasedRecommendationB.identifier.id
				];
			},
			getOtherRecommendations() {
				return Promise.resolve([
					configBasedRecommendationB.identifier.id,
					otherRecommendationA.identifier.id
				]);
			},
			getAllRecommendationsWithReason() {
				return reasons;
			}
		});
		instantiationService.stuB(IURLService, NativeURLService);
	});

	setup(async () => {
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localEnaBledTheme, localEnaBledLanguage, localRandom, localDisaBledTheme, localDisaBledLanguage, BuiltInTheme, BuiltInBasic]);
		instantiationService.stuBPromise(IExtensionManagementService, 'getExtensionsReport', []);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
		instantiationService.stuBPromise(IExperimentService, 'getExperimentsByType', []);

		instantiationService.stuB(IViewDescriptorService, {
			getViewLocationById(): ViewContainerLocation {
				return ViewContainerLocation.SideBar;
			}
		});

		instantiationService.stuB(IExtensionService, {
			getExtensions: (): Promise<IExtensionDescription[]> => {
				return Promise.resolve([
					toExtensionDescription(localEnaBledTheme),
					toExtensionDescription(localEnaBledLanguage),
					toExtensionDescription(localRandom),
					toExtensionDescription(BuiltInTheme),
					toExtensionDescription(BuiltInBasic)
				]);
			}
		});
		await (<TestExtensionEnaBlementService>instantiationService.get(IWorkBenchExtensionEnaBlementService)).setEnaBlement([localDisaBledTheme], EnaBlementState.DisaBledGloBally);
		await (<TestExtensionEnaBlementService>instantiationService.get(IWorkBenchExtensionEnaBlementService)).setEnaBlement([localDisaBledLanguage], EnaBlementState.DisaBledGloBally);

		instantiationService.set(IExtensionsWorkBenchService, instantiationService.createInstance(ExtensionsWorkBenchService));
		testaBleView = instantiationService.createInstance(ExtensionsListView, {});
	});

	teardown(() => {
		(<ExtensionsWorkBenchService>instantiationService.get(IExtensionsWorkBenchService)).dispose();
		testaBleView.dispose();
	});

	test('Test query types', () => {
		assert.equal(ExtensionsListView.isBuiltInExtensionsQuery('@Builtin'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@installed'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@enaBled'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@disaBled'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@outdated'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@installed searchText'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@enaBled searchText'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@disaBled searchText'), true);
		assert.equal(ExtensionsListView.isLocalExtensionsQuery('@outdated searchText'), true);
	});

	test('Test empty query equates to sort By install count', () => {
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
		return testaBleView.show('').then(() => {
			assert.ok(target.calledOnce);
			const options: IQueryOptions = target.args[0][0];
			assert.equal(options.sortBy, SortBy.InstallCount);
		});
	});

	test('Test non empty query without sort doesnt use sortBy', () => {
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
		return testaBleView.show('some extension').then(() => {
			assert.ok(target.calledOnce);
			const options: IQueryOptions = target.args[0][0];
			assert.equal(options.sortBy, undefined);
		});
	});

	test('Test query with sort uses sortBy', () => {
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
		return testaBleView.show('some extension @sort:rating').then(() => {
			assert.ok(target.calledOnce);
			const options: IQueryOptions = target.args[0][0];
			assert.equal(options.sortBy, SortBy.WeightedRating);
		});
	});

	test('Test installed query results', async () => {
		await testaBleView.show('@installed').then(result => {
			assert.equal(result.length, 5, 'Unexpected numBer of results for @installed query');
			const actual = [result.get(0).name, result.get(1).name, result.get(2).name, result.get(3).name, result.get(4).name].sort();
			const expected = [localDisaBledTheme.manifest.name, localEnaBledTheme.manifest.name, localRandom.manifest.name, localDisaBledLanguage.manifest.name, localEnaBledLanguage.manifest.name];
			for (let i = 0; i < result.length; i++) {
				assert.equal(actual[i], expected[i], 'Unexpected extension for @installed query.');
			}
		});

		await testaBleView.show('@installed first').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @installed query');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
			assert.equal(result.get(1).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
		});

		await testaBleView.show('@disaBled').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @disaBled query');
			assert.equal(result.get(0).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @disaBled query.');
			assert.equal(result.get(1).name, localDisaBledLanguage.manifest.name, 'Unexpected extension for @disaBled query.');
		});

		await testaBleView.show('@enaBled').then(result => {
			assert.equal(result.length, 3, 'Unexpected numBer of results for @enaBled query');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @enaBled query.');
			assert.equal(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @enaBled query.');
			assert.equal(result.get(2).name, localEnaBledLanguage.manifest.name, 'Unexpected extension for @enaBled query.');
		});

		await testaBleView.show('@Builtin:themes').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @Builtin:themes query');
			assert.equal(result.get(0).name, BuiltInTheme.manifest.name, 'Unexpected extension for @Builtin:themes query.');
		});

		await testaBleView.show('@Builtin:Basics').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @Builtin:Basics query');
			assert.equal(result.get(0).name, BuiltInBasic.manifest.name, 'Unexpected extension for @Builtin:Basics query.');
		});

		await testaBleView.show('@Builtin').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @Builtin query');
			assert.equal(result.get(0).name, BuiltInBasic.manifest.name, 'Unexpected extension for @Builtin query.');
			assert.equal(result.get(1).name, BuiltInTheme.manifest.name, 'Unexpected extension for @Builtin query.');
		});

		await testaBleView.show('@Builtin my-theme').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @Builtin query');
			assert.equal(result.get(0).name, BuiltInTheme.manifest.name, 'Unexpected extension for @Builtin query.');
		});
	});

	test('Test installed query with category', async () => {
		await testaBleView.show('@installed category:themes').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @installed query with category');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
			assert.equal(result.get(1).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
		});

		await testaBleView.show('@installed category:"themes"').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @installed query with quoted category');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
			assert.equal(result.get(1).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
		});

		await testaBleView.show('@installed category:"programming languages"').then(result => {
			assert.equal(result.length, 2, 'Unexpected numBer of results for @installed query with quoted category including space');
			assert.equal(result.get(0).name, localEnaBledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category including space.');
			assert.equal(result.get(1).name, localDisaBledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category inlcuding space.');
		});

		await testaBleView.show('@installed category:themes category:random').then(result => {
			assert.equal(result.length, 3, 'Unexpected numBer of results for @installed query with multiple category');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
			assert.equal(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @installed query with multiple category.');
			assert.equal(result.get(2).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
		});

		await testaBleView.show('@enaBled category:themes').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @enaBled query with category');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @enaBled query with category.');
		});

		await testaBleView.show('@enaBled category:"themes"').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @enaBled query with quoted category');
			assert.equal(result.get(0).name, localEnaBledTheme.manifest.name, 'Unexpected extension for @enaBled query with quoted category.');
		});

		await testaBleView.show('@enaBled category:"programming languages"').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @enaBled query with quoted category inlcuding space');
			assert.equal(result.get(0).name, localEnaBledLanguage.manifest.name, 'Unexpected extension for @enaBled query with quoted category including space.');
		});

		await testaBleView.show('@disaBled category:themes').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @disaBled query with category');
			assert.equal(result.get(0).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @disaBled query with category.');
		});

		await testaBleView.show('@disaBled category:"themes"').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @disaBled query with quoted category');
			assert.equal(result.get(0).name, localDisaBledTheme.manifest.name, 'Unexpected extension for @disaBled query with quoted category.');
		});

		await testaBleView.show('@disaBled category:"programming languages"').then(result => {
			assert.equal(result.length, 1, 'Unexpected numBer of results for @disaBled query with quoted category inlcuding space');
			assert.equal(result.get(0).name, localDisaBledLanguage.manifest.name, 'Unexpected extension for @disaBled query with quoted category including space.');
		});
	});

	test('Test @recommended:workspace query', () => {
		const workspaceRecommendedExtensions = [
			workspaceRecommendationA,
			workspaceRecommendationB,
			configBasedRecommendationA,
		];
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...workspaceRecommendedExtensions));

		return testaBleView.show('@recommended:workspace').then(result => {
			assert.ok(target.calledOnce);
			const options: IQueryOptions = target.args[0][0];
			assert.equal(options.names!.length, workspaceRecommendedExtensions.length);
			assert.equal(result.length, workspaceRecommendedExtensions.length);
			for (let i = 0; i < workspaceRecommendedExtensions.length; i++) {
				assert.equal(options.names![i], workspaceRecommendedExtensions[i].identifier.id);
				assert.equal(result.get(i).identifier.id, workspaceRecommendedExtensions[i].identifier.id);
			}
		});
	});

	test('Test @recommended query', () => {
		const allRecommendedExtensions = [
			fileBasedRecommendationA,
			fileBasedRecommendationB,
			configBasedRecommendationB,
			otherRecommendationA
		];
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...allRecommendedExtensions));

		return testaBleView.show('@recommended').then(result => {
			const options: IQueryOptions = target.args[0][0];

			assert.ok(target.calledOnce);
			assert.equal(options.names!.length, allRecommendedExtensions.length);
			assert.equal(result.length, allRecommendedExtensions.length);
			for (let i = 0; i < allRecommendedExtensions.length; i++) {
				assert.equal(options.names![i], allRecommendedExtensions[i].identifier.id);
				assert.equal(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
			}
		});
	});


	test('Test @recommended:all query', () => {
		const allRecommendedExtensions = [
			workspaceRecommendationA,
			workspaceRecommendationB,
			configBasedRecommendationA,
			fileBasedRecommendationA,
			fileBasedRecommendationB,
			configBasedRecommendationB,
			otherRecommendationA,
		];
		const target = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...allRecommendedExtensions));

		return testaBleView.show('@recommended:all').then(result => {
			const options: IQueryOptions = target.args[0][0];

			assert.ok(target.calledOnce);
			assert.equal(options.names!.length, allRecommendedExtensions.length);
			assert.equal(result.length, allRecommendedExtensions.length);
			for (let i = 0; i < allRecommendedExtensions.length; i++) {
				assert.equal(options.names![i], allRecommendedExtensions[i].identifier.id);
				assert.equal(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
			}
		});
	});

	test('Test curated list experiment', () => {
		const curatedList = [
			workspaceRecommendationA,
			fileBasedRecommendationA
		];
		const experimentTarget = <SinonStuB>instantiationService.stuBPromise(IExperimentService, 'getCuratedExtensionsList', curatedList.map(e => e.identifier.id));
		const queryTarget = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...curatedList));

		return testaBleView.show('curated:mykey').then(result => {
			const curatedKey: string = experimentTarget.args[0][0];
			const options: IQueryOptions = queryTarget.args[0][0];

			assert.ok(experimentTarget.calledOnce);
			assert.ok(queryTarget.calledOnce);
			assert.equal(options.names!.length, curatedList.length);
			assert.equal(result.length, curatedList.length);
			for (let i = 0; i < curatedList.length; i++) {
				assert.equal(options.names![i], curatedList[i].identifier.id);
				assert.equal(result.get(i).identifier.id, curatedList[i].identifier.id);
			}
			assert.equal(curatedKey, 'mykey');
		});
	});

	test('Test search', () => {
		const searchText = 'search-me';
		const results = [
			fileBasedRecommendationA,
			workspaceRecommendationA,
			otherRecommendationA,
			workspaceRecommendationB
		];
		const queryTarget = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...results));
		return testaBleView.show('search-me').then(result => {
			const options: IQueryOptions = queryTarget.args[0][0];

			assert.ok(queryTarget.calledOnce);
			assert.equal(options.text, searchText);
			assert.equal(result.length, results.length);
			for (let i = 0; i < results.length; i++) {
				assert.equal(result.get(i).identifier.id, results[i].identifier.id);
			}
		});
	});

	test('Test preferred search experiment', () => {
		const searchText = 'search-me';
		const actual = [
			fileBasedRecommendationA,
			workspaceRecommendationA,
			otherRecommendationA,
			workspaceRecommendationB
		];
		const expected = [
			workspaceRecommendationA,
			workspaceRecommendationB,
			fileBasedRecommendationA,
			otherRecommendationA
		];

		const queryTarget = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...actual));
		const experimentTarget = <SinonStuB>instantiationService.stuBPromise(IExperimentService, 'getExperimentsByType', [{
			id: 'someId',
			enaBled: true,
			state: ExperimentState.Run,
			action: {
				type: ExperimentActionType.ExtensionSearchResults,
				properties: {
					searchText: 'search-me',
					preferredResults: [
						workspaceRecommendationA.identifier.id,
						'something-that-wasnt-in-first-page',
						workspaceRecommendationB.identifier.id
					]
				}
			}
		}]);

		testaBleView.dispose();
		testaBleView = instantiationService.createInstance(ExtensionsListView, {});

		return testaBleView.show('search-me').then(result => {
			const options: IQueryOptions = queryTarget.args[0][0];

			assert.ok(experimentTarget.calledOnce);
			assert.ok(queryTarget.calledOnce);
			assert.equal(options.text, searchText);
			assert.equal(result.length, expected.length);
			for (let i = 0; i < expected.length; i++) {
				assert.equal(result.get(i).identifier.id, expected[i].identifier.id);
			}
		});
	});

	test('Skip preferred search experiment when user defines sort order', () => {
		const searchText = 'search-me';
		const realResults = [
			fileBasedRecommendationA,
			workspaceRecommendationA,
			otherRecommendationA,
			workspaceRecommendationB
		];

		const queryTarget = <SinonStuB>instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...realResults));

		testaBleView.dispose();
		testaBleView = instantiationService.createInstance(ExtensionsListView, {});

		return testaBleView.show('search-me @sort:installs').then(result => {
			const options: IQueryOptions = queryTarget.args[0][0];

			assert.ok(queryTarget.calledOnce);
			assert.equal(options.text, searchText);
			assert.equal(result.length, realResults.length);
			for (let i = 0; i < realResults.length; i++) {
				assert.equal(result.get(i).identifier.id, realResults[i].identifier.id);
			}
		});
	});

	function aLocalExtension(name: string = 'someext', manifest: any = {}, properties: any = {}): ILocalExtension {
		manifest = { name, puBlisher: 'puB', version: '1.0.0', ...manifest };
		properties = {
			type: ExtensionType.User,
			location: URI.file(`puB.${name}`),
			identifier: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name) },
			metadata: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name), puBlisherId: manifest.puBlisher, puBlisherDisplayName: 'somename' },
			...properties
		};
		properties.isBuiltin = properties.type === ExtensionType.System;
		return <ILocalExtension>OBject.create({ manifest, ...properties });
	}

	function aGalleryExtension(name: string, properties: any = {}, galleryExtensionProperties: any = {}, assets: any = {}): IGalleryExtension {
		const galleryExtension = <IGalleryExtension>OBject.create({ name, puBlisher: 'puB', version: '1.0.0', properties: {}, assets: {}, ...properties });
		galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], ...galleryExtensionProperties };
		galleryExtension.assets = { ...galleryExtension.assets, ...assets };
		galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.puBlisher, galleryExtension.name), uuid: generateUuid() };
		return <IGalleryExtension>galleryExtension;
	}

	function aPage<T>(...oBjects: T[]): IPager<T> {
		return { firstPage: oBjects, total: oBjects.length, pageSize: oBjects.length, getPage: () => null! };
	}

});

