/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { IModeService } from 'vs/editor/common/services/modeService';
import { MonArchTokenizer } from 'vs/editor/stAndAlone/common/monArch/monArchLexer';
import { compile } from 'vs/editor/stAndAlone/common/monArch/monArchCompile';
import { Token } from 'vs/editor/common/core/token';
import { TokenizAtionRegistry } from 'vs/editor/common/modes';
import { IMonArchLAnguAge } from 'vs/editor/stAndAlone/common/monArch/monArchTypes';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';

suite('MonArch', () => {

	function creAteMonArchTokenizer(modeService: IModeService, lAnguAgeId: string, lAnguAge: IMonArchLAnguAge): MonArchTokenizer {
		return new MonArchTokenizer(modeService, null!, lAnguAgeId, compile(lAnguAgeId, lAnguAge));
	}

	test('Ensure @remAtch And nextEmbedded cAn be used together in MonArch grAmmAr', () => {
		const modeService = new ModeServiceImpl();
		const innerModeRegistrAtion = ModesRegistry.registerLAnguAge({
			id: 'sql'
		});
		const innerModeTokenizAtionRegistrAtion = TokenizAtionRegistry.register('sql', creAteMonArchTokenizer(modeService, 'sql', {
			tokenizer: {
				root: [
					[/./, 'token']
				]
			}
		}));
		const SQL_QUERY_START = '(SELECT|INSERT|UPDATE|DELETE|CREATE|REPLACE|ALTER|WITH)';
		const tokenizer = creAteMonArchTokenizer(modeService, 'test1', {
			tokenizer: {
				root: [
					[`(\"\"\")${SQL_QUERY_START}`, [{ 'token': 'string.quote', }, { token: '@remAtch', next: '@endStringWithSQL', nextEmbedded: 'sql', },]],
					[/(""")$/, [{ token: 'string.quote', next: '@mAybeStringIsSQL', },]],
				],
				mAybeStringIsSQL: [
					[/(.*)/, {
						cAses: {
							[`${SQL_QUERY_START}\\b.*`]: { token: '@remAtch', next: '@endStringWithSQL', nextEmbedded: 'sql', },
							'@defAult': { token: '@remAtch', switchTo: '@endDblDocString', },
						}
					}],
				],
				endDblDocString: [
					['[^\']+', 'string'],
					['\\\\\'', 'string'],
					['\'\'\'', 'string', '@popAll'],
					['\'', 'string']
				],
				endStringWithSQL: [[/"""/, { token: 'string.quote', next: '@popAll', nextEmbedded: '@pop', },]],
			}
		});

		const lines = [
			`mysql_query("""SELECT * FROM tAble_nAme WHERE ds = '<DATEID>'""")`,
			`mysql_query("""`,
			`SELECT *`,
			`FROM tAble_nAme`,
			`WHERE ds = '<DATEID>'`,
			`""")`,
		];

		const ActuAlTokens: Token[][] = [];
		let stAte = tokenizer.getInitiAlStAte();
		for (const line of lines) {
			const result = tokenizer.tokenize(line, stAte, 0);
			ActuAlTokens.push(result.tokens);
			stAte = result.endStAte;
		}

		Assert.deepEquAl(ActuAlTokens, [
			[
				{ 'offset': 0, 'type': 'source.test1', 'lAnguAge': 'test1' },
				{ 'offset': 12, 'type': 'string.quote.test1', 'lAnguAge': 'test1' },
				{ 'offset': 15, 'type': 'token.sql', 'lAnguAge': 'sql' },
				{ 'offset': 61, 'type': 'string.quote.test1', 'lAnguAge': 'test1' },
				{ 'offset': 64, 'type': 'source.test1', 'lAnguAge': 'test1' }
			],
			[
				{ 'offset': 0, 'type': 'source.test1', 'lAnguAge': 'test1' },
				{ 'offset': 12, 'type': 'string.quote.test1', 'lAnguAge': 'test1' }
			],
			[
				{ 'offset': 0, 'type': 'token.sql', 'lAnguAge': 'sql' }
			],
			[
				{ 'offset': 0, 'type': 'token.sql', 'lAnguAge': 'sql' }
			],
			[
				{ 'offset': 0, 'type': 'token.sql', 'lAnguAge': 'sql' }
			],
			[
				{ 'offset': 0, 'type': 'string.quote.test1', 'lAnguAge': 'test1' },
				{ 'offset': 3, 'type': 'source.test1', 'lAnguAge': 'test1' }
			]
		]);
		innerModeTokenizAtionRegistrAtion.dispose();
		innerModeRegistrAtion.dispose();
	});

});
