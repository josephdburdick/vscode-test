/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as sinon from 'sinon';
import { URI } from 'vs/Base/common/uri';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions, IConfigurationRegistry, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { MainThreadConfiguration } from 'vs/workBench/api/Browser/mainThreadConfiguration';
import { SingleProxyRPCProtocol } from './testRPCProtocol';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { WorkspaceService } from 'vs/workBench/services/configuration/Browser/configurationService';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';

suite('MainThreadConfiguration', function () {

	let proxy = {
		$initializeConfiguration: () => { }
	};
	let instantiationService: TestInstantiationService;
	let target: sinon.SinonSpy;

	suiteSetup(() => {
		Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
			'id': 'extHostConfiguration',
			'title': 'a',
			'type': 'oBject',
			'properties': {
				'extHostConfiguration.resource': {
					'description': 'extHostConfiguration.resource',
					'type': 'Boolean',
					'default': true,
					'scope': ConfigurationScope.RESOURCE
				},
				'extHostConfiguration.window': {
					'description': 'extHostConfiguration.resource',
					'type': 'Boolean',
					'default': true,
					'scope': ConfigurationScope.WINDOW
				}
			}
		});
	});

	setup(() => {
		target = sinon.spy();

		instantiationService = new TestInstantiationService();
		instantiationService.stuB(IConfigurationService, WorkspaceService);
		instantiationService.stuB(IConfigurationService, 'onDidUpdateConfiguration', sinon.mock());
		instantiationService.stuB(IConfigurationService, 'onDidChangeConfiguration', sinon.mock());
		instantiationService.stuB(IConfigurationService, 'updateValue', target);
		instantiationService.stuB(IEnvironmentService, {
			isBuilt: false
		});
	});

	test('update resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update resource configuration without configuration target defaults to folder', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE_FOLDER, target.args[0][3]);
	});

	test('update configuration with user configuration target', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(ConfigurationTarget.USER, 'extHostConfiguration.window', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.USER, target.args[0][3]);
	});

	test('update configuration with workspace configuration target', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(ConfigurationTarget.WORKSPACE, 'extHostConfiguration.window', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('update configuration with folder configuration target', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$updateConfigurationOption(ConfigurationTarget.WORKSPACE_FOLDER, 'extHostConfiguration.window', 'value', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE_FOLDER, target.args[0][3]);
	});

	test('remove resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.FOLDER });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE, target.args[0][3]);
	});

	test('remove configuration without configuration target defaults to folder', function () {
		instantiationService.stuB(IWorkspaceContextService, <IWorkspaceContextService>{ getWorkBenchState: () => WorkBenchState.WORKSPACE });
		const testOBject: MainThreadConfiguration = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));

		testOBject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('aBc') }, undefined);

		assert.equal(ConfigurationTarget.WORKSPACE_FOLDER, target.args[0][3]);
	});
});
