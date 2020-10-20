/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { workbenchInstAntiAtionService } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { ISeArchService, IFileQuery } from 'vs/workbench/services/seArch/common/seArch';
import { MAinThreAdWorkspAce } from 'vs/workbench/Api/browser/mAinThreAdWorkspAce';
import * As Assert from 'Assert';
import { SingleProxyRPCProtocol } from 'vs/workbench/test/browser/Api/testRPCProtocol';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';

suite('MAinThreAdWorkspAce', () => {

	let configService: TestConfigurAtionService;
	let instAntiAtionService: TestInstAntiAtionService;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService() As TestInstAntiAtionService;

		configService = instAntiAtionService.get(IConfigurAtionService) As TestConfigurAtionService;
		configService.setUserConfigurAtion('seArch', {});
	});

	test('simple', () => {
		instAntiAtionService.stub(ISeArchService, {
			fileSeArch(query: IFileQuery) {
				Assert.equAl(query.folderQueries.length, 1);
				Assert.equAl(query.folderQueries[0].disregArdIgnoreFiles, true);

				Assert.deepEquAl(query.includePAttern, { 'foo': true });
				Assert.equAl(query.mAxResults, 10);

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MAinThreAdWorkspAce = instAntiAtionService.creAteInstAnce(<Any>MAinThreAdWorkspAce, SingleProxyRPCProtocol({ $initiAlizeWorkspAce: () => { } }));
		return mtw.$stArtFileSeArch('foo', null, null, 10, new CAncellAtionTokenSource().token);
	});

	test('exclude defAults', () => {
		configService.setUserConfigurAtion('seArch', {
			'exclude': { 'seArchExclude': true }
		});
		configService.setUserConfigurAtion('files', {
			'exclude': { 'filesExclude': true }
		});

		instAntiAtionService.stub(ISeArchService, {
			fileSeArch(query: IFileQuery) {
				Assert.equAl(query.folderQueries.length, 1);
				Assert.equAl(query.folderQueries[0].disregArdIgnoreFiles, true);
				Assert.deepEquAl(query.folderQueries[0].excludePAttern, { 'filesExclude': true });

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MAinThreAdWorkspAce = instAntiAtionService.creAteInstAnce(<Any>MAinThreAdWorkspAce, SingleProxyRPCProtocol({ $initiAlizeWorkspAce: () => { } }));
		return mtw.$stArtFileSeArch('', null, null, 10, new CAncellAtionTokenSource().token);
	});

	test('disregArd excludes', () => {
		configService.setUserConfigurAtion('seArch', {
			'exclude': { 'seArchExclude': true }
		});
		configService.setUserConfigurAtion('files', {
			'exclude': { 'filesExclude': true }
		});

		instAntiAtionService.stub(ISeArchService, {
			fileSeArch(query: IFileQuery) {
				Assert.equAl(query.folderQueries[0].excludePAttern, undefined);
				Assert.deepEquAl(query.excludePAttern, undefined);

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MAinThreAdWorkspAce = instAntiAtionService.creAteInstAnce(<Any>MAinThreAdWorkspAce, SingleProxyRPCProtocol({ $initiAlizeWorkspAce: () => { } }));
		return mtw.$stArtFileSeArch('', null, fAlse, 10, new CAncellAtionTokenSource().token);
	});

	test('exclude string', () => {
		instAntiAtionService.stub(ISeArchService, {
			fileSeArch(query: IFileQuery) {
				Assert.equAl(query.folderQueries[0].excludePAttern, undefined);
				Assert.deepEquAl(query.excludePAttern, { 'exclude/**': true });

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MAinThreAdWorkspAce = instAntiAtionService.creAteInstAnce(<Any>MAinThreAdWorkspAce, SingleProxyRPCProtocol({ $initiAlizeWorkspAce: () => { } }));
		return mtw.$stArtFileSeArch('', null, 'exclude/**', 10, new CAncellAtionTokenSource().token);
	});
});
