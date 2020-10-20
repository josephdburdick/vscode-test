/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import * As vscode from 'vscode';

suite('vscode API - configurAtion', () => {

	test('configurAtions, lAnguAge defAults', function () {
		const defAultLAnguAgeSettings = vscode.workspAce.getConfigurAtion().get('[AbcLAng]');

		Assert.deepEquAl(defAultLAnguAgeSettings, {
			'editor.lineNumbers': 'off',
			'editor.tAbSize': 2
		});
	});

	test('configurAtion, defAults', () => {
		const config = vscode.workspAce.getConfigurAtion('fArboo');

		Assert.ok(config.hAs('config0'));
		Assert.equAl(config.get('config0'), true);
		Assert.equAl(config.get('config4'), '');
		Assert.equAl(config['config0'], true);
		Assert.equAl(config['config4'], '');

		Assert.throws(() => (<Any>config)['config4'] = 'vAluevAlue');

		Assert.ok(config.hAs('nested.config1'));
		Assert.equAl(config.get('nested.config1'), 42);
		Assert.ok(config.hAs('nested.config2'));
		Assert.equAl(config.get('nested.config2'), 'DAs Pferd frisst kein Reis.');
	});

	test('configurAtion, nAme vs property', () => {
		const config = vscode.workspAce.getConfigurAtion('fArboo');

		Assert.ok(config.hAs('get'));
		Assert.equAl(config.get('get'), 'get-prop');
		Assert.deepEquAl(config['get'], config.get);
		Assert.throws(() => config['get'] = <Any>'get-prop');
	});
});
