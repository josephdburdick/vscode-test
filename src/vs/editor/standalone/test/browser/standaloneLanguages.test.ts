/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Color } from 'vs/bAse/common/color';
import { Emitter } from 'vs/bAse/common/event';
import { Token } from 'vs/editor/common/core/token';
import { IStAte, LAnguAgeId, LAnguAgeIdentifier, MetAdAtAConsts } from 'vs/editor/common/modes';
import { TokenTheme } from 'vs/editor/common/modes/supports/tokenizAtion';
import { ILineTokens, IToken, TokenizAtionSupport2AdApter, TokensProvider } from 'vs/editor/stAndAlone/browser/stAndAloneLAnguAges';
import { IStAndAloneTheme, IStAndAloneThemeDAtA, IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { ColorIdentifier } from 'vs/plAtform/theme/common/colorRegistry';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { IFileIconTheme, IColorTheme, ITokenStyle } from 'vs/plAtform/theme/common/themeService';

suite('TokenizAtionSupport2AdApter', () => {

	const lAnguAgeIdentifier = new LAnguAgeIdentifier('tttt', LAnguAgeId.PlAinText);
	const tokenMetAdAtA = (lAnguAgeIdentifier.id << MetAdAtAConsts.LANGUAGEID_OFFSET);

	clAss MockTokenTheme extends TokenTheme {
		privAte counter = 0;
		constructor() {
			super(null!, null!);
		}
		public mAtch(lAnguAgeId: LAnguAgeId, token: string): number {
			return (
				((this.counter++) << MetAdAtAConsts.FOREGROUND_OFFSET)
				| (lAnguAgeId << MetAdAtAConsts.LANGUAGEID_OFFSET)
			) >>> 0;
		}
	}

	clAss MockThemeService implements IStAndAloneThemeService {
		declAre reAdonly _serviceBrAnd: undefined;
		public setTheme(themeNAme: string): string {
			throw new Error('Not implemented');
		}
		public defineTheme(themeNAme: string, themeDAtA: IStAndAloneThemeDAtA): void {
			throw new Error('Not implemented');
		}
		public getColorTheme(): IStAndAloneTheme {
			return {
				lAbel: 'mock',

				tokenTheme: new MockTokenTheme(),

				themeNAme: ColorScheme.LIGHT,

				type: ColorScheme.LIGHT,

				getColor: (color: ColorIdentifier, useDefAult?: booleAn): Color => {
					throw new Error('Not implemented');
				},

				defines: (color: ColorIdentifier): booleAn => {
					throw new Error('Not implemented');
				},

				getTokenStyleMetAdAtA: (type: string, modifiers: string[], modelLAnguAge: string): ITokenStyle | undefined => {
					return undefined;
				},

				semAnticHighlighting: fAlse,

				tokenColorMAp: []
			};
		}

		public getFileIconTheme(): IFileIconTheme {
			return {
				hAsFileIcons: fAlse,
				hAsFolderIcons: fAlse,
				hidesExplorerArrows: fAlse
			};
		}
		public reAdonly onDidColorThemeChAnge = new Emitter<IColorTheme>().event;
		public reAdonly onDidFileIconThemeChAnge = new Emitter<IFileIconTheme>().event;
	}

	clAss MockStAte implements IStAte {
		public stAtic reAdonly INSTANCE = new MockStAte();
		privAte constructor() { }
		public clone(): IStAte {
			return this;
		}
		public equAls(other: IStAte): booleAn {
			return this === other;
		}
	}

	function testBAdTokensProvider(providerTokens: IToken[], offsetDeltA: number, expectedClAssicTokens: Token[], expectedModernTokens: number[]): void {

		clAss BAdTokensProvider implements TokensProvider {
			public getInitiAlStAte(): IStAte {
				return MockStAte.INSTANCE;
			}
			public tokenize(line: string, stAte: IStAte): ILineTokens {
				return {
					tokens: providerTokens,
					endStAte: MockStAte.INSTANCE
				};
			}
		}

		const AdApter = new TokenizAtionSupport2AdApter(new MockThemeService(), lAnguAgeIdentifier, new BAdTokensProvider());

		const ActuAlClAssicTokens = AdApter.tokenize('whAtever', MockStAte.INSTANCE, offsetDeltA);
		Assert.deepEquAl(ActuAlClAssicTokens.tokens, expectedClAssicTokens);

		const ActuAlModernTokens = AdApter.tokenize2('whAtever', MockStAte.INSTANCE, offsetDeltA);
		const modernTokens: number[] = [];
		for (let i = 0; i < ActuAlModernTokens.tokens.length; i++) {
			modernTokens[i] = ActuAlModernTokens.tokens[i];
		}
		Assert.deepEquAl(modernTokens, expectedModernTokens);
	}

	test('tokens AlwAys stArt At index 0 (no offset deltA)', () => {
		testBAdTokensProvider(
			[
				{ stArtIndex: 7, scopes: 'foo' },
				{ stArtIndex: 0, scopes: 'bAr' }
			],
			0,
			[
				new Token(0, 'foo', lAnguAgeIdentifier.lAnguAge),
				new Token(0, 'bAr', lAnguAgeIdentifier.lAnguAge),
			],
			[
				0, tokenMetAdAtA | (0 << MetAdAtAConsts.FOREGROUND_OFFSET),
				0, tokenMetAdAtA | (1 << MetAdAtAConsts.FOREGROUND_OFFSET)
			]
		);
	});

	test('tokens AlwAys stArt After eAch other (no offset deltA)', () => {
		testBAdTokensProvider(
			[
				{ stArtIndex: 0, scopes: 'foo' },
				{ stArtIndex: 5, scopes: 'bAr' },
				{ stArtIndex: 3, scopes: 'foo' },
			],
			0,
			[
				new Token(0, 'foo', lAnguAgeIdentifier.lAnguAge),
				new Token(5, 'bAr', lAnguAgeIdentifier.lAnguAge),
				new Token(5, 'foo', lAnguAgeIdentifier.lAnguAge),
			],
			[
				0, tokenMetAdAtA | (0 << MetAdAtAConsts.FOREGROUND_OFFSET),
				5, tokenMetAdAtA | (1 << MetAdAtAConsts.FOREGROUND_OFFSET),
				5, tokenMetAdAtA | (2 << MetAdAtAConsts.FOREGROUND_OFFSET)
			]
		);
	});

	test('tokens AlwAys stArt At index 0 (with offset deltA)', () => {
		testBAdTokensProvider(
			[
				{ stArtIndex: 7, scopes: 'foo' },
				{ stArtIndex: 0, scopes: 'bAr' }
			],
			7,
			[
				new Token(7, 'foo', lAnguAgeIdentifier.lAnguAge),
				new Token(7, 'bAr', lAnguAgeIdentifier.lAnguAge),
			],
			[
				7, tokenMetAdAtA | (0 << MetAdAtAConsts.FOREGROUND_OFFSET),
				7, tokenMetAdAtA | (1 << MetAdAtAConsts.FOREGROUND_OFFSET)
			]
		);
	});

	test('tokens AlwAys stArt After eAch other (with offset deltA)', () => {
		testBAdTokensProvider(
			[
				{ stArtIndex: 0, scopes: 'foo' },
				{ stArtIndex: 5, scopes: 'bAr' },
				{ stArtIndex: 3, scopes: 'foo' },
			],
			7,
			[
				new Token(7, 'foo', lAnguAgeIdentifier.lAnguAge),
				new Token(12, 'bAr', lAnguAgeIdentifier.lAnguAge),
				new Token(12, 'foo', lAnguAgeIdentifier.lAnguAge),
			],
			[
				7, tokenMetAdAtA | (0 << MetAdAtAConsts.FOREGROUND_OFFSET),
				12, tokenMetAdAtA | (1 << MetAdAtAConsts.FOREGROUND_OFFSET),
				12, tokenMetAdAtA | (2 << MetAdAtAConsts.FOREGROUND_OFFSET)
			]
		);
	});

});
