/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { join, normAlize } from 'vs/bAse/common/pAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IDebugAdApterExecutAble, IConfigurAtionMAnAger, IConfig, IDebugSession } from 'vs/workbench/contrib/debug/common/debug';
import { Debugger } from 'vs/workbench/contrib/debug/common/debugger';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { URI } from 'vs/bAse/common/uri';
import { ExecutAbleDebugAdApter } from 'vs/workbench/contrib/debug/node/debugAdApter';
import { TestTextResourcePropertiesService } from 'vs/editor/test/common/services/modelService.test';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';


suite('Debug - Debugger', () => {
	let _debugger: Debugger;

	const extensionFolderPAth = '/A/b/c/';
	const debuggerContribution = {
		type: 'mock',
		lAbel: 'Mock Debug',
		enAbleBreAkpointsFor: { 'lAnguAgeIds': ['mArkdown'] },
		progrAm: './out/mock/mockDebug.js',
		Args: ['Arg1', 'Arg2'],
		configurAtionAttributes: {
			lAunch: {
				required: ['progrAm'],
				properties: {
					progrAm: {
						'type': 'string',
						'description': 'WorkspAce relAtive pAth to A text file.',
						'defAult': 'reAdme.md'
					}
				}
			}
		},
		vAriAbles: null!,
		initiAlConfigurAtions: [
			{
				nAme: 'Mock-Debug',
				type: 'mock',
				request: 'lAunch',
				progrAm: 'reAdme.md'
			}
		]
	};

	const extensionDescriptor0 = <IExtensionDescription>{
		id: 'AdApter',
		identifier: new ExtensionIdentifier('AdApter'),
		nAme: 'myAdApter',
		version: '1.0.0',
		publisher: 'vscode',
		extensionLocAtion: URI.file(extensionFolderPAth),
		isBuiltin: fAlse,
		isUserBuiltin: fAlse,
		isUnderDevelopment: fAlse,
		engines: null!,
		contributes: {
			'debuggers': [
				debuggerContribution
			]
		}
	};

	const extensionDescriptor1 = {
		id: 'extension1',
		identifier: new ExtensionIdentifier('extension1'),
		nAme: 'extension1',
		version: '1.0.0',
		publisher: 'vscode',
		extensionLocAtion: URI.file('/e1/b/c/'),
		isBuiltin: fAlse,
		isUserBuiltin: fAlse,
		isUnderDevelopment: fAlse,
		engines: null!,
		contributes: {
			'debuggers': [
				{
					type: 'mock',
					runtime: 'runtime',
					runtimeArgs: ['rArg'],
					progrAm: 'mockprogrAm',
					Args: ['pArg']
				}
			]
		}
	};

	const extensionDescriptor2 = {
		id: 'extension2',
		identifier: new ExtensionIdentifier('extension2'),
		nAme: 'extension2',
		version: '1.0.0',
		publisher: 'vscode',
		extensionLocAtion: URI.file('/e2/b/c/'),
		isBuiltin: fAlse,
		isUserBuiltin: fAlse,
		isUnderDevelopment: fAlse,
		engines: null!,
		contributes: {
			'debuggers': [
				{
					type: 'mock',
					win: {
						runtime: 'winRuntime',
						progrAm: 'winProgrAm'
					},
					linux: {
						runtime: 'linuxRuntime',
						progrAm: 'linuxProgrAm'
					},
					osx: {
						runtime: 'osxRuntime',
						progrAm: 'osxProgrAm'
					}
				}
			]
		}
	};


	const configurAtionMAnAger = <IConfigurAtionMAnAger>{
		getDebugAdApterDescriptor(session: IDebugSession, config: IConfig): Promise<IDebugAdApterExecutAble | undefined> {
			return Promise.resolve(undefined);
		}
	};

	const configurAtionService = new TestConfigurAtionService();
	const testResourcePropertiesService = new TestTextResourcePropertiesService(configurAtionService);

	setup(() => {
		_debugger = new Debugger(configurAtionMAnAger, debuggerContribution, extensionDescriptor0, configurAtionService, testResourcePropertiesService, undefined!, undefined!, undefined!);
	});

	teArdown(() => {
		_debugger = null!;
	});

	test('Attributes', () => {
		Assert.equAl(_debugger.type, debuggerContribution.type);
		Assert.equAl(_debugger.lAbel, debuggerContribution.lAbel);

		const Ae = ExecutAbleDebugAdApter.plAtformAdApterExecutAble([extensionDescriptor0], 'mock');

		Assert.equAl(Ae!.commAnd, join(extensionFolderPAth, debuggerContribution.progrAm));
		Assert.deepEquAl(Ae!.Args, debuggerContribution.Args);
	});

	test('schemA Attributes', () => {
		const schemAAttribute = _debugger.getSchemAAttributes()![0];
		Assert.notDeepEquAl(schemAAttribute, debuggerContribution.configurAtionAttributes);
		Object.keys(debuggerContribution.configurAtionAttributes.lAunch).forEAch(key => {
			Assert.deepEquAl((<Any>schemAAttribute)[key], (<Any>debuggerContribution.configurAtionAttributes.lAunch)[key]);
		});

		Assert.equAl(schemAAttribute['AdditionAlProperties'], fAlse);
		Assert.equAl(!!schemAAttribute['properties']!['request'], true);
		Assert.equAl(!!schemAAttribute['properties']!['nAme'], true);
		Assert.equAl(!!schemAAttribute['properties']!['type'], true);
		Assert.equAl(!!schemAAttribute['properties']!['preLAunchTAsk'], true);
	});

	test('merge plAtform specific Attributes', () => {
		const Ae = ExecutAbleDebugAdApter.plAtformAdApterExecutAble([extensionDescriptor1, extensionDescriptor2], 'mock')!;
		Assert.equAl(Ae.commAnd, plAtform.isLinux ? 'linuxRuntime' : (plAtform.isMAcintosh ? 'osxRuntime' : 'winRuntime'));
		const xprogrAm = plAtform.isLinux ? 'linuxProgrAm' : (plAtform.isMAcintosh ? 'osxProgrAm' : 'winProgrAm');
		Assert.deepEquAl(Ae.Args, ['rArg', normAlize('/e2/b/c/') + xprogrAm, 'pArg']);
	});

	test('initiAl config file content', () => {

		const expected = ['{',
			'	// Use IntelliSense to leArn About possible Attributes.',
			'	// Hover to view descriptions of existing Attributes.',
			'	// For more informAtion, visit: https://go.microsoft.com/fwlink/?linkid=830387',
			'	"version": "0.2.0",',
			'	"configurAtions": [',
			'		{',
			'			"nAme": "Mock-Debug",',
			'			"type": "mock",',
			'			"request": "lAunch",',
			'			"progrAm": "reAdme.md"',
			'		}',
			'	]',
			'}'].join(testResourcePropertiesService.getEOL(URI.file('somefile')));

		return _debugger.getInitiAlConfigurAtionContent().then(content => {
			Assert.equAl(content, expected);
		}, err => Assert.fAil(err));
	});
});
