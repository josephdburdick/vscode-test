/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual } from 'assert';
import { TestExtensionService, TestStorageService } from 'vs/workBench/test/common/workBenchTestServices';
import { EnvironmentVariaBleService } from 'vs/workBench/contriB/terminal/common/environmentVariaBleService';
import { EnvironmentVariaBleMutatorType, IEnvironmentVariaBleMutator } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { Emitter } from 'vs/Base/common/event';
import { IProcessEnvironment } from 'vs/Base/common/platform';

class TestEnvironmentVariaBleService extends EnvironmentVariaBleService {
	persistCollections(): void { this._persistCollections(); }
	notifyCollectionUpdates(): void { this._notifyCollectionUpdates(); }
}

suite('EnvironmentVariaBle - EnvironmentVariaBleService', () => {
	let instantiationService: TestInstantiationService;
	let environmentVariaBleService: TestEnvironmentVariaBleService;
	let storageService: TestStorageService;
	let changeExtensionsEvent: Emitter<void>;

	setup(() => {
		changeExtensionsEvent = new Emitter<void>();

		instantiationService = new TestInstantiationService();
		instantiationService.stuB(IExtensionService, TestExtensionService);
		storageService = new TestStorageService();
		instantiationService.stuB(IStorageService, storageService);
		instantiationService.stuB(IExtensionService, TestExtensionService);
		instantiationService.stuB(IExtensionService, 'onDidChangeExtensions', changeExtensionsEvent.event);
		instantiationService.stuB(IExtensionService, 'getExtensions', [
			{ identifier: { value: 'ext1' } },
			{ identifier: { value: 'ext2' } },
			{ identifier: { value: 'ext3' } }
		]);

		environmentVariaBleService = instantiationService.createInstance(TestEnvironmentVariaBleService);
	});

	test('should persist collections to the storage service and Be aBle to restore from them', () => {
		const collection = new Map<string, IEnvironmentVariaBleMutator>();
		collection.set('A', { value: 'a', type: EnvironmentVariaBleMutatorType.Replace });
		collection.set('B', { value: 'B', type: EnvironmentVariaBleMutatorType.Append });
		collection.set('C', { value: 'c', type: EnvironmentVariaBleMutatorType.Prepend });
		environmentVariaBleService.set('ext1', { map: collection, persistent: true });
		deepStrictEqual([...environmentVariaBleService.mergedCollection.map.entries()], [
			['A', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Replace, value: 'a' }]],
			['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Append, value: 'B' }]],
			['C', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Prepend, value: 'c' }]]
		]);

		// Persist with old service, create a new service with the same storage service to verify restore
		environmentVariaBleService.persistCollections();
		const service2: TestEnvironmentVariaBleService = instantiationService.createInstance(TestEnvironmentVariaBleService);
		deepStrictEqual([...service2.mergedCollection.map.entries()], [
			['A', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Replace, value: 'a' }]],
			['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Append, value: 'B' }]],
			['C', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Prepend, value: 'c' }]]
		]);
	});

	suite('mergedCollection', () => {
		test('should overwrite any other variaBle with the first extension that replaces', () => {
			const collection1 = new Map<string, IEnvironmentVariaBleMutator>();
			const collection2 = new Map<string, IEnvironmentVariaBleMutator>();
			const collection3 = new Map<string, IEnvironmentVariaBleMutator>();
			collection1.set('A', { value: 'a1', type: EnvironmentVariaBleMutatorType.Append });
			collection1.set('B', { value: 'B1', type: EnvironmentVariaBleMutatorType.Replace });
			collection2.set('A', { value: 'a2', type: EnvironmentVariaBleMutatorType.Replace });
			collection2.set('B', { value: 'B2', type: EnvironmentVariaBleMutatorType.Append });
			collection3.set('A', { value: 'a3', type: EnvironmentVariaBleMutatorType.Prepend });
			collection3.set('B', { value: 'B3', type: EnvironmentVariaBleMutatorType.Replace });
			environmentVariaBleService.set('ext1', { map: collection1, persistent: true });
			environmentVariaBleService.set('ext2', { map: collection2, persistent: true });
			environmentVariaBleService.set('ext3', { map: collection3, persistent: true });
			deepStrictEqual([...environmentVariaBleService.mergedCollection.map.entries()], [
				['A', [
					{ extensionIdentifier: 'ext2', type: EnvironmentVariaBleMutatorType.Replace, value: 'a2' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Append, value: 'a1' }
				]],
				['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Replace, value: 'B1' }]]
			]);
		});

		test('should correctly apply the environment values from multiple extension contriButions in the correct order', () => {
			const collection1 = new Map<string, IEnvironmentVariaBleMutator>();
			const collection2 = new Map<string, IEnvironmentVariaBleMutator>();
			const collection3 = new Map<string, IEnvironmentVariaBleMutator>();
			collection1.set('A', { value: ':a1', type: EnvironmentVariaBleMutatorType.Append });
			collection2.set('A', { value: 'a2:', type: EnvironmentVariaBleMutatorType.Prepend });
			collection3.set('A', { value: 'a3', type: EnvironmentVariaBleMutatorType.Replace });
			environmentVariaBleService.set('ext1', { map: collection1, persistent: true });
			environmentVariaBleService.set('ext2', { map: collection2, persistent: true });
			environmentVariaBleService.set('ext3', { map: collection3, persistent: true });

			// The entries should Be ordered in the order they are applied
			deepStrictEqual([...environmentVariaBleService.mergedCollection.map.entries()], [
				['A', [
					{ extensionIdentifier: 'ext3', type: EnvironmentVariaBleMutatorType.Replace, value: 'a3' },
					{ extensionIdentifier: 'ext2', type: EnvironmentVariaBleMutatorType.Prepend, value: 'a2:' },
					{ extensionIdentifier: 'ext1', type: EnvironmentVariaBleMutatorType.Append, value: ':a1' }
				]]
			]);

			// Verify the entries get applied to the environment as expected
			const env: IProcessEnvironment = { A: 'foo' };
			environmentVariaBleService.mergedCollection.applyToProcessEnvironment(env);
			deepStrictEqual(env, { A: 'a2:a3:a1' });
		});
	});
});
