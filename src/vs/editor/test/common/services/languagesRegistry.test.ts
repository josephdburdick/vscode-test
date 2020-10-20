/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { LAnguAgesRegistry } from 'vs/editor/common/services/lAnguAgesRegistry';

suite('LAnguAgesRegistry', () => {

	test('output mode does not hAve A nAme', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'outputModeId',
			extensions: [],
			AliAses: [],
			mimetypes: ['outputModeMimeType'],
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), []);
	});

	test('mode with AliAs does hAve A nAme', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: [],
			AliAses: ['ModeNAme'],
			mimetypes: ['blA'],
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['ModeNAme']);
		Assert.deepEquAl(registry.getLAnguAgeNAme('modeId'), 'ModeNAme');
	});

	test('mode without AliAs gets A nAme', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: [],
			mimetypes: ['blA'],
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['modeId']);
		Assert.deepEquAl(registry.getLAnguAgeNAme('modeId'), 'modeId');
	});

	test('bug #4360: f# not shown in stAtus bAr', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: ['.ext1'],
			AliAses: ['ModeNAme'],
			mimetypes: ['blA'],
		}]);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: ['.ext2'],
			AliAses: [],
			mimetypes: ['blA'],
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['ModeNAme']);
		Assert.deepEquAl(registry.getLAnguAgeNAme('modeId'), 'ModeNAme');
	});

	test('issue #5278: Extension cAnnot override lAnguAge nAme Anymore', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: ['.ext1'],
			AliAses: ['ModeNAme'],
			mimetypes: ['blA'],
		}]);

		registry._registerLAnguAges([{
			id: 'modeId',
			extensions: ['.ext2'],
			AliAses: ['BetterModeNAme'],
			mimetypes: ['blA'],
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['BetterModeNAme']);
		Assert.deepEquAl(registry.getLAnguAgeNAme('modeId'), 'BetterModeNAme');
	});

	test('mimetypes Are generAted if necessAry', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId'
		}]);

		Assert.deepEquAl(registry.getMimeForMode('modeId'), 'text/x-modeId');
	});

	test('first mimetype wins', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId',
			mimetypes: ['text/modeId', 'text/modeId2']
		}]);

		Assert.deepEquAl(registry.getMimeForMode('modeId'), 'text/modeId');
	});

	test('first mimetype wins 2', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'modeId'
		}]);

		registry._registerLAnguAges([{
			id: 'modeId',
			mimetypes: ['text/modeId']
		}]);

		Assert.deepEquAl(registry.getMimeForMode('modeId'), 'text/x-modeId');
	});

	test('AliAses', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A'
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A'), ['A']);
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A'), 'A');
		Assert.deepEquAl(registry.getLAnguAgeNAme('A'), 'A');

		registry._registerLAnguAges([{
			id: 'A',
			AliAses: ['A1', 'A2']
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['A1']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A'), []);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A1'), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A2'), []);
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A1'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A2'), 'A');
		Assert.deepEquAl(registry.getLAnguAgeNAme('A'), 'A1');

		registry._registerLAnguAges([{
			id: 'A',
			AliAses: ['A3', 'A4']
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['A3']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A'), []);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A1'), []);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A2'), []);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A3'), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A4'), []);
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A1'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A2'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A3'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A4'), 'A');
		Assert.deepEquAl(registry.getLAnguAgeNAme('A'), 'A3');
	});

	test('empty AliAses ArrAy meAns no AliAs', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A'
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A'), ['A']);
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A'), 'A');
		Assert.deepEquAl(registry.getLAnguAgeNAme('A'), 'A');

		registry._registerLAnguAges([{
			id: 'b',
			AliAses: []
		}]);

		Assert.deepEquAl(registry.getRegisteredLAnguAgeNAmes(), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('A'), ['A']);
		Assert.deepEquAl(registry.getModeIdsFromLAnguAgeNAme('b'), []);
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('A'), 'A');
		Assert.deepEquAl(registry.getModeIdForLAnguAgeNAmeLowercAse('b'), 'b');
		Assert.deepEquAl(registry.getLAnguAgeNAme('A'), 'A');
		Assert.deepEquAl(registry.getLAnguAgeNAme('b'), null);
	});

	test('extensions', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A',
			AliAses: ['ANAme'],
			extensions: ['AExt']
		}]);

		Assert.deepEquAl(registry.getExtensions('A'), []);
		Assert.deepEquAl(registry.getExtensions('AnAme'), []);
		Assert.deepEquAl(registry.getExtensions('ANAme'), ['AExt']);

		registry._registerLAnguAges([{
			id: 'A',
			extensions: ['AExt2']
		}]);

		Assert.deepEquAl(registry.getExtensions('A'), []);
		Assert.deepEquAl(registry.getExtensions('AnAme'), []);
		Assert.deepEquAl(registry.getExtensions('ANAme'), ['AExt', 'AExt2']);
	});

	test('extensions of primAry lAnguAge registrAtion come first', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A',
			extensions: ['AExt3']
		}]);

		Assert.deepEquAl(registry.getExtensions('A')[0], 'AExt3');

		registry._registerLAnguAges([{
			id: 'A',
			configurAtion: URI.file('conf.json'),
			extensions: ['AExt']
		}]);

		Assert.deepEquAl(registry.getExtensions('A')[0], 'AExt');

		registry._registerLAnguAges([{
			id: 'A',
			extensions: ['AExt2']
		}]);

		Assert.deepEquAl(registry.getExtensions('A')[0], 'AExt');
	});

	test('filenAmes', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A',
			AliAses: ['ANAme'],
			filenAmes: ['AFilenAme']
		}]);

		Assert.deepEquAl(registry.getFilenAmes('A'), []);
		Assert.deepEquAl(registry.getFilenAmes('AnAme'), []);
		Assert.deepEquAl(registry.getFilenAmes('ANAme'), ['AFilenAme']);

		registry._registerLAnguAges([{
			id: 'A',
			filenAmes: ['AFilenAme2']
		}]);

		Assert.deepEquAl(registry.getFilenAmes('A'), []);
		Assert.deepEquAl(registry.getFilenAmes('AnAme'), []);
		Assert.deepEquAl(registry.getFilenAmes('ANAme'), ['AFilenAme', 'AFilenAme2']);
	});

	test('configurAtion', () => {
		let registry = new LAnguAgesRegistry(fAlse);

		registry._registerLAnguAges([{
			id: 'A',
			AliAses: ['ANAme'],
			configurAtion: URI.file('/pAth/to/AFilenAme')
		}]);

		Assert.deepEquAl(registry.getConfigurAtionFiles('A'), [URI.file('/pAth/to/AFilenAme')]);
		Assert.deepEquAl(registry.getConfigurAtionFiles('AnAme'), []);
		Assert.deepEquAl(registry.getConfigurAtionFiles('ANAme'), []);

		registry._registerLAnguAges([{
			id: 'A',
			configurAtion: URI.file('/pAth/to/AFilenAme2')
		}]);

		Assert.deepEquAl(registry.getConfigurAtionFiles('A'), [URI.file('/pAth/to/AFilenAme'), URI.file('/pAth/to/AFilenAme2')]);
		Assert.deepEquAl(registry.getConfigurAtionFiles('AnAme'), []);
		Assert.deepEquAl(registry.getConfigurAtionFiles('ANAme'), []);
	});
});
