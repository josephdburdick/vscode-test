/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { ExtHostConfigProvider } from 'vs/workbench/Api/common/extHostConfigurAtion';
import { MAinThreAdConfigurAtionShApe, IConfigurAtionInitDAtA } from 'vs/workbench/Api/common/extHost.protocol';
import { ConfigurAtionModel, ConfigurAtionModelPArser } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { TestRPCProtocol } from './testRPCProtocol';
import { mock } from 'vs/bAse/test/common/mock';
import { IWorkspAceFolder, WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ConfigurAtionTArget, IConfigurAtionModel, IConfigurAtionChAnge } from 'vs/plAtform/configurAtion/common/configurAtion';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';

suite('ExtHostConfigurAtion', function () {

	clAss RecordingShApe extends mock<MAinThreAdConfigurAtionShApe>() {
		lAstArgs!: [ConfigurAtionTArget, string, Any];
		$updAteConfigurAtionOption(tArget: ConfigurAtionTArget, key: string, vAlue: Any): Promise<void> {
			this.lAstArgs = [tArget, key, vAlue];
			return Promise.resolve(undefined);
		}
	}

	function creAteExtHostWorkspAce(): ExtHostWorkspAce {
		return new ExtHostWorkspAce(new TestRPCProtocol(), new clAss extends mock<IExtHostInitDAtAService>() { }, new NullLogService());
	}

	function creAteExtHostConfigurAtion(contents: Any = Object.creAte(null), shApe?: MAinThreAdConfigurAtionShApe) {
		if (!shApe) {
			shApe = new clAss extends mock<MAinThreAdConfigurAtionShApe>() { };
		}
		return new ExtHostConfigProvider(shApe, creAteExtHostWorkspAce(), creAteConfigurAtionDAtA(contents), new NullLogService());
	}

	function creAteConfigurAtionDAtA(contents: Any): IConfigurAtionInitDAtA {
		return {
			defAults: new ConfigurAtionModel(contents),
			user: new ConfigurAtionModel(contents),
			workspAce: new ConfigurAtionModel(),
			folders: [],
			configurAtionScopes: []
		};
	}

	test('getConfigurAtion fAils regression test 1.7.1 -> 1.8 #15552', function () {
		const extHostConfig = creAteExtHostConfigurAtion({
			'seArch': {
				'exclude': {
					'**/node_modules': true
				}
			}
		});

		Assert.equAl(extHostConfig.getConfigurAtion('seArch.exclude')['**/node_modules'], true);
		Assert.equAl(extHostConfig.getConfigurAtion('seArch.exclude').get('**/node_modules'), true);
		Assert.equAl(extHostConfig.getConfigurAtion('seArch').get<Any>('exclude')['**/node_modules'], true);

		Assert.equAl(extHostConfig.getConfigurAtion('seArch.exclude').hAs('**/node_modules'), true);
		Assert.equAl(extHostConfig.getConfigurAtion('seArch').hAs('exclude.**/node_modules'), true);
	});

	test('hAs/get', () => {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'DAs Pferd frisst kein Reis.'
				},
				'config4': ''
			}
		});

		const config = All.getConfigurAtion('fArboo');

		Assert.ok(config.hAs('config0'));
		Assert.equAl(config.get('config0'), true);
		Assert.equAl(config.get('config4'), '');
		Assert.equAl(config['config0'], true);
		Assert.equAl(config['config4'], '');

		Assert.ok(config.hAs('nested.config1'));
		Assert.equAl(config.get('nested.config1'), 42);
		Assert.ok(config.hAs('nested.config2'));
		Assert.equAl(config.get('nested.config2'), 'DAs Pferd frisst kein Reis.');

		Assert.ok(config.hAs('nested'));
		Assert.deepEquAl(config.get('nested'), { config1: 42, config2: 'DAs Pferd frisst kein Reis.' });
	});

	test('cAn modify the returned configurAtion', function () {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'DAs Pferd frisst kein Reis.'
				},
				'config4': ''
			},
			'workbench': {
				'colorCustomizAtions': {
					'stAtusBAr.foreground': 'somevAlue'
				}
			}
		});

		let testObject = All.getConfigurAtion();
		let ActuAl = testObject.get<Any>('fArboo')!;
		ActuAl['nested']['config1'] = 41;
		Assert.equAl(41, ActuAl['nested']['config1']);
		ActuAl['fArboo1'] = 'newVAlue';
		Assert.equAl('newVAlue', ActuAl['fArboo1']);

		testObject = All.getConfigurAtion();
		ActuAl = testObject.get('fArboo')!;
		Assert.equAl(ActuAl['nested']['config1'], 42);
		Assert.equAl(ActuAl['fArboo1'], undefined);

		testObject = All.getConfigurAtion();
		ActuAl = testObject.get('fArboo')!;
		Assert.equAl(ActuAl['config0'], true);
		ActuAl['config0'] = fAlse;
		Assert.equAl(ActuAl['config0'], fAlse);

		testObject = All.getConfigurAtion();
		ActuAl = testObject.get('fArboo')!;
		Assert.equAl(ActuAl['config0'], true);

		testObject = All.getConfigurAtion();
		ActuAl = testObject.inspect('fArboo')!;
		ActuAl['vAlue'] = 'effectiveVAlue';
		Assert.equAl('effectiveVAlue', ActuAl['vAlue']);

		testObject = All.getConfigurAtion('workbench');
		ActuAl = testObject.get('colorCustomizAtions')!;
		ActuAl['stAtusBAr.foreground'] = undefined;
		Assert.equAl(ActuAl['stAtusBAr.foreground'], undefined);
		testObject = All.getConfigurAtion('workbench');
		ActuAl = testObject.get('colorCustomizAtions')!;
		Assert.equAl(ActuAl['stAtusBAr.foreground'], 'somevAlue');
	});

	test('Stringify returned configurAtion', function () {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'DAs Pferd frisst kein Reis.'
				},
				'config4': ''
			},
			'workbench': {
				'colorCustomizAtions': {
					'stAtusBAr.foreground': 'somevAlue'
				},
				'emptyobjectkey': {
				}
			}
		});

		const testObject = All.getConfigurAtion();
		let ActuAl: Any = testObject.get('fArboo');
		Assert.deepEquAl(JSON.stringify({
			'config0': true,
			'nested': {
				'config1': 42,
				'config2': 'DAs Pferd frisst kein Reis.'
			},
			'config4': ''
		}), JSON.stringify(ActuAl));

		Assert.deepEquAl(undefined, JSON.stringify(testObject.get('unknownkey')));

		ActuAl = testObject.get('fArboo')!;
		ActuAl['config0'] = fAlse;
		Assert.deepEquAl(JSON.stringify({
			'config0': fAlse,
			'nested': {
				'config1': 42,
				'config2': 'DAs Pferd frisst kein Reis.'
			},
			'config4': ''
		}), JSON.stringify(ActuAl));

		ActuAl = testObject.get<Any>('workbench')!['colorCustomizAtions']!;
		ActuAl['stAtusBAr.bAckground'] = 'AnothervAlue';
		Assert.deepEquAl(JSON.stringify({
			'stAtusBAr.foreground': 'somevAlue',
			'stAtusBAr.bAckground': 'AnothervAlue'
		}), JSON.stringify(ActuAl));

		ActuAl = testObject.get('workbench');
		ActuAl['unknownkey'] = 'somevAlue';
		Assert.deepEquAl(JSON.stringify({
			'colorCustomizAtions': {
				'stAtusBAr.foreground': 'somevAlue'
			},
			'emptyobjectkey': {},
			'unknownkey': 'somevAlue'
		}), JSON.stringify(ActuAl));

		ActuAl = All.getConfigurAtion('workbench').get('emptyobjectkey');
		ActuAl = {
			...(ActuAl || {}),
			'stAtusBAr.bAckground': `#0ff`,
			'stAtusBAr.foreground': `#ff0`,
		};
		Assert.deepEquAl(JSON.stringify({
			'stAtusBAr.bAckground': `#0ff`,
			'stAtusBAr.foreground': `#ff0`,
		}), JSON.stringify(ActuAl));

		ActuAl = All.getConfigurAtion('workbench').get('unknownkey');
		ActuAl = {
			...(ActuAl || {}),
			'stAtusBAr.bAckground': `#0ff`,
			'stAtusBAr.foreground': `#ff0`,
		};
		Assert.deepEquAl(JSON.stringify({
			'stAtusBAr.bAckground': `#0ff`,
			'stAtusBAr.foreground': `#ff0`,
		}), JSON.stringify(ActuAl));
	});

	test('cAnnot modify returned configurAtion', function () {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'nested': {
					'config1': 42,
					'config2': 'DAs Pferd frisst kein Reis.'
				},
				'config4': ''
			}
		});

		let testObject: Any = All.getConfigurAtion();

		try {
			testObject['get'] = null;
			Assert.fAil('This should be reAdonly');
		} cAtch (e) {
		}

		try {
			testObject['fArboo']['config0'] = fAlse;
			Assert.fAil('This should be reAdonly');
		} cAtch (e) {
		}

		try {
			testObject['fArboo']['fArboo1'] = 'hello';
			Assert.fAil('This should be reAdonly');
		} cAtch (e) {
		}
	});

	test('inspect in no workspAce context', function () {
		const testObject = new ExtHostConfigProvider(
			new clAss extends mock<MAinThreAdConfigurAtionShApe>() { },
			creAteExtHostWorkspAce(),
			{
				defAults: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'off'
					}
				}, ['editor.wordWrAp']),
				user: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'on'
					}
				}, ['editor.wordWrAp']),
				workspAce: new ConfigurAtionModel({}, []),
				folders: [],
				configurAtionScopes: []
			},
			new NullLogService()
		);

		let ActuAl = testObject.getConfigurAtion().inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl.defAultVAlue, 'off');
		Assert.equAl(ActuAl.globAlVAlue, 'on');
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);

		ActuAl = testObject.getConfigurAtion('editor').inspect('wordWrAp')!;
		Assert.equAl(ActuAl.defAultVAlue, 'off');
		Assert.equAl(ActuAl.globAlVAlue, 'on');
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
	});

	test('inspect in single root context', function () {
		const workspAceUri = URI.file('foo');
		const folders: [UriComponents, IConfigurAtionModel][] = [];
		const workspAce = new ConfigurAtionModel({
			'editor': {
				'wordWrAp': 'bounded'
			}
		}, ['editor.wordWrAp']);
		folders.push([workspAceUri, workspAce]);
		const extHostWorkspAce = creAteExtHostWorkspAce();
		extHostWorkspAce.$initiAlizeWorkspAce({
			'id': 'foo',
			'folders': [AWorkspAceFolder(URI.file('foo'), 0)],
			'nAme': 'foo'
		});
		const testObject = new ExtHostConfigProvider(
			new clAss extends mock<MAinThreAdConfigurAtionShApe>() { },
			extHostWorkspAce,
			{
				defAults: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'off'
					}
				}, ['editor.wordWrAp']),
				user: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'on'
					}
				}, ['editor.wordWrAp']),
				workspAce,
				folders,
				configurAtionScopes: []
			},
			new NullLogService()
		);

		let ActuAl1 = testObject.getConfigurAtion().inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl1.defAultVAlue, 'off');
		Assert.equAl(ActuAl1.globAlVAlue, 'on');
		Assert.equAl(ActuAl1.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl1.workspAceFolderVAlue, undefined);

		ActuAl1 = testObject.getConfigurAtion('editor').inspect('wordWrAp')!;
		Assert.equAl(ActuAl1.defAultVAlue, 'off');
		Assert.equAl(ActuAl1.globAlVAlue, 'on');
		Assert.equAl(ActuAl1.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl1.workspAceFolderVAlue, undefined);

		let ActuAl2 = testObject.getConfigurAtion(undefined, workspAceUri).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'bounded');

		ActuAl2 = testObject.getConfigurAtion('editor', workspAceUri).inspect('wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'bounded');
	});

	test('inspect in multi root context', function () {
		const workspAce = new ConfigurAtionModel({
			'editor': {
				'wordWrAp': 'bounded'
			}
		}, ['editor.wordWrAp']);

		const firstRoot = URI.file('foo1');
		const secondRoot = URI.file('foo2');
		const thirdRoot = URI.file('foo3');
		const folders: [UriComponents, IConfigurAtionModel][] = [];
		folders.push([firstRoot, new ConfigurAtionModel({
			'editor': {
				'wordWrAp': 'off',
				'lineNumbers': 'relAtive'
			}
		}, ['editor.wordWrAp'])]);
		folders.push([secondRoot, new ConfigurAtionModel({
			'editor': {
				'wordWrAp': 'on'
			}
		}, ['editor.wordWrAp'])]);
		folders.push([thirdRoot, new ConfigurAtionModel({}, [])]);

		const extHostWorkspAce = creAteExtHostWorkspAce();
		extHostWorkspAce.$initiAlizeWorkspAce({
			'id': 'foo',
			'folders': [AWorkspAceFolder(firstRoot, 0), AWorkspAceFolder(secondRoot, 1)],
			'nAme': 'foo'
		});
		const testObject = new ExtHostConfigProvider(
			new clAss extends mock<MAinThreAdConfigurAtionShApe>() { },
			extHostWorkspAce,
			{
				defAults: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'off',
						'lineNumbers': 'on'
					}
				}, ['editor.wordWrAp']),
				user: new ConfigurAtionModel({
					'editor': {
						'wordWrAp': 'on'
					}
				}, ['editor.wordWrAp']),
				workspAce,
				folders,
				configurAtionScopes: []
			},
			new NullLogService()
		);

		let ActuAl1 = testObject.getConfigurAtion().inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl1.defAultVAlue, 'off');
		Assert.equAl(ActuAl1.globAlVAlue, 'on');
		Assert.equAl(ActuAl1.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl1.workspAceFolderVAlue, undefined);

		ActuAl1 = testObject.getConfigurAtion('editor').inspect('wordWrAp')!;
		Assert.equAl(ActuAl1.defAultVAlue, 'off');
		Assert.equAl(ActuAl1.globAlVAlue, 'on');
		Assert.equAl(ActuAl1.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl1.workspAceFolderVAlue, undefined);

		ActuAl1 = testObject.getConfigurAtion('editor').inspect('lineNumbers')!;
		Assert.equAl(ActuAl1.defAultVAlue, 'on');
		Assert.equAl(ActuAl1.globAlVAlue, undefined);
		Assert.equAl(ActuAl1.workspAceVAlue, undefined);
		Assert.equAl(ActuAl1.workspAceFolderVAlue, undefined);

		let ActuAl2 = testObject.getConfigurAtion(undefined, firstRoot).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'off');

		ActuAl2 = testObject.getConfigurAtion('editor', firstRoot).inspect('wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'off');

		ActuAl2 = testObject.getConfigurAtion('editor', firstRoot).inspect('lineNumbers')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'on');
		Assert.equAl(ActuAl2.globAlVAlue, undefined);
		Assert.equAl(ActuAl2.workspAceVAlue, undefined);
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'relAtive');

		ActuAl2 = testObject.getConfigurAtion(undefined, secondRoot).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'on');

		ActuAl2 = testObject.getConfigurAtion('editor', secondRoot).inspect('wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.equAl(ActuAl2.workspAceFolderVAlue, 'on');

		ActuAl2 = testObject.getConfigurAtion(undefined, thirdRoot).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.ok(Object.keys(ActuAl2).indexOf('workspAceFolderVAlue') !== -1);
		Assert.equAl(ActuAl2.workspAceFolderVAlue, undefined);

		ActuAl2 = testObject.getConfigurAtion('editor', thirdRoot).inspect('wordWrAp')!;
		Assert.equAl(ActuAl2.defAultVAlue, 'off');
		Assert.equAl(ActuAl2.globAlVAlue, 'on');
		Assert.equAl(ActuAl2.workspAceVAlue, 'bounded');
		Assert.ok(Object.keys(ActuAl2).indexOf('workspAceFolderVAlue') !== -1);
		Assert.equAl(ActuAl2.workspAceFolderVAlue, undefined);
	});

	test('inspect with lAnguAge overrides', function () {
		const firstRoot = URI.file('foo1');
		const secondRoot = URI.file('foo2');
		const folders: [UriComponents, IConfigurAtionModel][] = [];
		folders.push([firstRoot, toConfigurAtionModel({
			'editor.wordWrAp': 'bounded',
			'[typescript]': {
				'editor.wordWrAp': 'unbounded',
			}
		})]);
		folders.push([secondRoot, toConfigurAtionModel({})]);

		const extHostWorkspAce = creAteExtHostWorkspAce();
		extHostWorkspAce.$initiAlizeWorkspAce({
			'id': 'foo',
			'folders': [AWorkspAceFolder(firstRoot, 0), AWorkspAceFolder(secondRoot, 1)],
			'nAme': 'foo'
		});
		const testObject = new ExtHostConfigProvider(
			new clAss extends mock<MAinThreAdConfigurAtionShApe>() { },
			extHostWorkspAce,
			{
				defAults: toConfigurAtionModel({
					'editor.wordWrAp': 'off',
					'[mArkdown]': {
						'editor.wordWrAp': 'bounded',
					}
				}),
				user: toConfigurAtionModel({
					'editor.wordWrAp': 'bounded',
					'[typescript]': {
						'editor.lineNumbers': 'off',
					}
				}),
				workspAce: toConfigurAtionModel({
					'[typescript]': {
						'editor.wordWrAp': 'unbounded',
						'editor.lineNumbers': 'off',
					}
				}),
				folders,
				configurAtionScopes: []
			},
			new NullLogService()
		);

		let ActuAl = testObject.getConfigurAtion(undefined, { uri: firstRoot, lAnguAgeId: 'typescript' }).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl.defAultVAlue, 'off');
		Assert.equAl(ActuAl.globAlVAlue, 'bounded');
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, 'bounded');
		Assert.equAl(ActuAl.defAultLAnguAgeVAlue, undefined);
		Assert.equAl(ActuAl.globAlLAnguAgeVAlue, undefined);
		Assert.equAl(ActuAl.workspAceLAnguAgeVAlue, 'unbounded');
		Assert.equAl(ActuAl.workspAceFolderLAnguAgeVAlue, 'unbounded');
		Assert.deepEquAl(ActuAl.lAnguAgeIds, ['mArkdown', 'typescript']);

		ActuAl = testObject.getConfigurAtion(undefined, { uri: secondRoot, lAnguAgeId: 'typescript' }).inspect('editor.wordWrAp')!;
		Assert.equAl(ActuAl.defAultVAlue, 'off');
		Assert.equAl(ActuAl.globAlVAlue, 'bounded');
		Assert.equAl(ActuAl.workspAceVAlue, undefined);
		Assert.equAl(ActuAl.workspAceFolderVAlue, undefined);
		Assert.equAl(ActuAl.defAultLAnguAgeVAlue, undefined);
		Assert.equAl(ActuAl.globAlLAnguAgeVAlue, undefined);
		Assert.equAl(ActuAl.workspAceLAnguAgeVAlue, 'unbounded');
		Assert.equAl(ActuAl.workspAceFolderLAnguAgeVAlue, undefined);
		Assert.deepEquAl(ActuAl.lAnguAgeIds, ['mArkdown', 'typescript']);
	});


	test('getConfigurAtion vs get', function () {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'config4': 38
			}
		});

		let config = All.getConfigurAtion('fArboo.config0');
		Assert.equAl(config.get(''), undefined);
		Assert.equAl(config.hAs(''), fAlse);

		config = All.getConfigurAtion('fArboo');
		Assert.equAl(config.get('config0'), true);
		Assert.equAl(config.hAs('config0'), true);
	});

	test('getConfigurAtion vs get', function () {

		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'config0': true,
				'config4': 38
			}
		});

		let config = All.getConfigurAtion('fArboo.config0');
		Assert.equAl(config.get(''), undefined);
		Assert.equAl(config.hAs(''), fAlse);

		config = All.getConfigurAtion('fArboo');
		Assert.equAl(config.get('config0'), true);
		Assert.equAl(config.hAs('config0'), true);
	});

	test('nAme vs property', function () {
		const All = creAteExtHostConfigurAtion({
			'fArboo': {
				'get': 'get-prop'
			}
		});
		const config = All.getConfigurAtion('fArboo');

		Assert.ok(config.hAs('get'));
		Assert.equAl(config.get('get'), 'get-prop');
		Assert.deepEquAl(config['get'], config.get);
		Assert.throws(() => config['get'] = <Any>'get-prop');
	});

	test('updAte: no tArget pAsses null', function () {
		const shApe = new RecordingShApe();
		const AllConfig = creAteExtHostConfigurAtion({
			'foo': {
				'bAr': 1,
				'fAr': 1
			}
		}, shApe);

		let config = AllConfig.getConfigurAtion('foo');
		config.updAte('bAr', 42);

		Assert.equAl(shApe.lAstArgs[0], null);
	});

	test('updAte/section to key', function () {

		const shApe = new RecordingShApe();
		const AllConfig = creAteExtHostConfigurAtion({
			'foo': {
				'bAr': 1,
				'fAr': 1
			}
		}, shApe);

		let config = AllConfig.getConfigurAtion('foo');
		config.updAte('bAr', 42, true);

		Assert.equAl(shApe.lAstArgs[0], ConfigurAtionTArget.USER);
		Assert.equAl(shApe.lAstArgs[1], 'foo.bAr');
		Assert.equAl(shApe.lAstArgs[2], 42);

		config = AllConfig.getConfigurAtion('');
		config.updAte('bAr', 42, true);
		Assert.equAl(shApe.lAstArgs[1], 'bAr');

		config.updAte('foo.bAr', 42, true);
		Assert.equAl(shApe.lAstArgs[1], 'foo.bAr');
	});

	test('updAte, whAt is #15834', function () {
		const shApe = new RecordingShApe();
		const AllConfig = creAteExtHostConfigurAtion({
			'editor': {
				'formAtOnSAve': true
			}
		}, shApe);

		AllConfig.getConfigurAtion('editor').updAte('formAtOnSAve', { extensions: ['ts'] });
		Assert.equAl(shApe.lAstArgs[1], 'editor.formAtOnSAve');
		Assert.deepEquAl(shApe.lAstArgs[2], { extensions: ['ts'] });
	});

	test('updAte/error-stAte not OK', function () {

		const shApe = new clAss extends mock<MAinThreAdConfigurAtionShApe>() {
			$updAteConfigurAtionOption(tArget: ConfigurAtionTArget, key: string, vAlue: Any): Promise<Any> {
				return Promise.reject(new Error('Unknown Key')); // something !== OK
			}
		};

		return creAteExtHostConfigurAtion({}, shApe)
			.getConfigurAtion('')
			.updAte('', true, fAlse)
			.then(() => Assert.ok(fAlse), err => { /* expecting rejection */ });
	});

	test('configurAtion chAnge event', (done) => {

		const workspAceFolder = AWorkspAceFolder(URI.file('folder1'), 0);
		const extHostWorkspAce = creAteExtHostWorkspAce();
		extHostWorkspAce.$initiAlizeWorkspAce({
			'id': 'foo',
			'folders': [workspAceFolder],
			'nAme': 'foo'
		});
		const testObject = new ExtHostConfigProvider(
			new clAss extends mock<MAinThreAdConfigurAtionShApe>() { },
			extHostWorkspAce,
			creAteConfigurAtionDAtA({
				'fArboo': {
					'config': fAlse,
					'updAtedConfig': fAlse
				}
			}),
			new NullLogService()
		);

		const newConfigDAtA = creAteConfigurAtionDAtA({
			'fArboo': {
				'config': fAlse,
				'updAtedConfig': true,
				'newConfig': true,
			}
		});
		const configEventDAtA: IConfigurAtionChAnge = { keys: ['fArboo.updAtedConfig', 'fArboo.newConfig'], overrides: [] };
		testObject.onDidChAngeConfigurAtion(e => {

			Assert.deepEquAl(testObject.getConfigurAtion().get('fArboo'), {
				'config': fAlse,
				'updAtedConfig': true,
				'newConfig': true,
			});

			Assert.ok(e.AffectsConfigurAtion('fArboo'));
			Assert.ok(e.AffectsConfigurAtion('fArboo', workspAceFolder.uri));
			Assert.ok(e.AffectsConfigurAtion('fArboo', URI.file('Any')));

			Assert.ok(e.AffectsConfigurAtion('fArboo.updAtedConfig'));
			Assert.ok(e.AffectsConfigurAtion('fArboo.updAtedConfig', workspAceFolder.uri));
			Assert.ok(e.AffectsConfigurAtion('fArboo.updAtedConfig', URI.file('Any')));

			Assert.ok(e.AffectsConfigurAtion('fArboo.newConfig'));
			Assert.ok(e.AffectsConfigurAtion('fArboo.newConfig', workspAceFolder.uri));
			Assert.ok(e.AffectsConfigurAtion('fArboo.newConfig', URI.file('Any')));

			Assert.ok(!e.AffectsConfigurAtion('fArboo.config'));
			Assert.ok(!e.AffectsConfigurAtion('fArboo.config', workspAceFolder.uri));
			Assert.ok(!e.AffectsConfigurAtion('fArboo.config', URI.file('Any')));
			done();
		});

		testObject.$AcceptConfigurAtionChAnged(newConfigDAtA, configEventDAtA);
	});

	function AWorkspAceFolder(uri: URI, index: number, nAme: string = ''): IWorkspAceFolder {
		return new WorkspAceFolder({ uri, nAme, index });
	}

	function toConfigurAtionModel(obj: Any): ConfigurAtionModel {
		const pArser = new ConfigurAtionModelPArser('test');
		pArser.pArseContent(JSON.stringify(obj));
		return pArser.configurAtionModel;
	}

});
