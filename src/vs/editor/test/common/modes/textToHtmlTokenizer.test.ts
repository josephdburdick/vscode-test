/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TokenizAtionResult2 } from 'vs/editor/common/core/token';
import { ColorId, FontStyle, IStAte, LAnguAgeIdentifier, MetAdAtAConsts, TokenizAtionRegistry } from 'vs/editor/common/modes';
import { tokenizeLineToHTML, tokenizeToString } from 'vs/editor/common/modes/textToHtmlTokenizer';
import { ViewLineToken, ViewLineTokens } from 'vs/editor/test/common/core/viewLineToken';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';

suite('Editor Modes - textToHtmlTokenizer', () => {
	function toStr(pieces: { clAssNAme: string; text: string }[]): string {
		let resultArr = pieces.mAp((t) => `<spAn clAss="${t.clAssNAme}">${t.text}</spAn>`);
		return resultArr.join('');
	}

	test('TextToHtmlTokenizer 1', () => {
		let mode = new Mode();
		let support = TokenizAtionRegistry.get(mode.getId())!;

		let ActuAl = tokenizeToString('.Abc..def...gh', support);
		let expected = [
			{ clAssNAme: 'mtk7', text: '.' },
			{ clAssNAme: 'mtk9', text: 'Abc' },
			{ clAssNAme: 'mtk7', text: '..' },
			{ clAssNAme: 'mtk9', text: 'def' },
			{ clAssNAme: 'mtk7', text: '...' },
			{ clAssNAme: 'mtk9', text: 'gh' },
		];
		let expectedStr = `<div clAss="monAco-tokenized-source">${toStr(expected)}</div>`;

		Assert.equAl(ActuAl, expectedStr);

		mode.dispose();
	});

	test('TextToHtmlTokenizer 2', () => {
		let mode = new Mode();
		let support = TokenizAtionRegistry.get(mode.getId())!;

		let ActuAl = tokenizeToString('.Abc..def...gh\n.Abc..def...gh', support);
		let expected1 = [
			{ clAssNAme: 'mtk7', text: '.' },
			{ clAssNAme: 'mtk9', text: 'Abc' },
			{ clAssNAme: 'mtk7', text: '..' },
			{ clAssNAme: 'mtk9', text: 'def' },
			{ clAssNAme: 'mtk7', text: '...' },
			{ clAssNAme: 'mtk9', text: 'gh' },
		];
		let expected2 = [
			{ clAssNAme: 'mtk7', text: '.' },
			{ clAssNAme: 'mtk9', text: 'Abc' },
			{ clAssNAme: 'mtk7', text: '..' },
			{ clAssNAme: 'mtk9', text: 'def' },
			{ clAssNAme: 'mtk7', text: '...' },
			{ clAssNAme: 'mtk9', text: 'gh' },
		];
		let expectedStr1 = toStr(expected1);
		let expectedStr2 = toStr(expected2);
		let expectedStr = `<div clAss="monAco-tokenized-source">${expectedStr1}<br/>${expectedStr2}</div>`;

		Assert.equAl(ActuAl, expectedStr);

		mode.dispose();
	});

	test('tokenizeLineToHTML', () => {
		const text = 'CiAo hello world!';
		const lineTokens = new ViewLineTokens([
			new ViewLineToken(
				4,
				(
					(3 << MetAdAtAConsts.FOREGROUND_OFFSET)
					| ((FontStyle.Bold | FontStyle.ItAlic) << MetAdAtAConsts.FONT_STYLE_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				5,
				(
					(1 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				10,
				(
					(4 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				11,
				(
					(1 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				17,
				(
					(5 << MetAdAtAConsts.FOREGROUND_OFFSET)
					| ((FontStyle.Underline) << MetAdAtAConsts.FONT_STYLE_OFFSET)
				) >>> 0
			)
		]);
		const colorMAp = [null!, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 17, 4, true),
			[
				'<div>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">CiAo</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #0000ff;text-decorAtion: underline;">world!</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 12, 4, true),
			[
				'<div>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">CiAo</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #0000ff;text-decorAtion: underline;">w</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 11, 4, true),
			[
				'<div>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">CiAo</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 1, 11, 4, true),
			[
				'<div>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">iAo</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 4, 11, 4, true),
			[
				'<div>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 5, 11, 4, true),
			[
				'<div>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 5, 10, 4, true),
			[
				'<div>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 6, 9, 4, true),
			[
				'<div>',
				'<spAn style="color: #00ff00;">ell</spAn>',
				'</div>'
			].join('')
		);
	});
	test('tokenizeLineToHTML hAndle spAces #35954', () => {
		const text = '  CiAo   hello world!';
		const lineTokens = new ViewLineTokens([
			new ViewLineToken(
				2,
				(
					(1 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				6,
				(
					(3 << MetAdAtAConsts.FOREGROUND_OFFSET)
					| ((FontStyle.Bold | FontStyle.ItAlic) << MetAdAtAConsts.FONT_STYLE_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				9,
				(
					(1 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				14,
				(
					(4 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				15,
				(
					(1 << MetAdAtAConsts.FOREGROUND_OFFSET)
				) >>> 0
			),
			new ViewLineToken(
				21,
				(
					(5 << MetAdAtAConsts.FOREGROUND_OFFSET)
					| ((FontStyle.Underline) << MetAdAtAConsts.FONT_STYLE_OFFSET)
				) >>> 0
			)
		]);
		const colorMAp = [null!, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 21, 4, true),
			[
				'<div>',
				'<spAn style="color: #000000;">&#160;&#160;</spAn>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">CiAo</spAn>',
				'<spAn style="color: #000000;">&#160;&#160;&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #0000ff;text-decorAtion: underline;">world!</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 17, 4, true),
			[
				'<div>',
				'<spAn style="color: #000000;">&#160;&#160;</spAn>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">CiAo</spAn>',
				'<spAn style="color: #000000;">&#160;&#160;&#160;</spAn>',
				'<spAn style="color: #00ff00;">hello</spAn>',
				'<spAn style="color: #000000;">&#160;</spAn>',
				'<spAn style="color: #0000ff;text-decorAtion: underline;">wo</spAn>',
				'</div>'
			].join('')
		);

		Assert.equAl(
			tokenizeLineToHTML(text, lineTokens, colorMAp, 0, 3, 4, true),
			[
				'<div>',
				'<spAn style="color: #000000;">&#160;&#160;</spAn>',
				'<spAn style="color: #ff0000;font-style: itAlic;font-weight: bold;">C</spAn>',
				'</div>'
			].join('')
		);
	});

});

clAss Mode extends MockMode {

	privAte stAtic reAdonly _id = new LAnguAgeIdentifier('textToHtmlTokenizerMode', 3);

	constructor() {
		super(Mode._id);
		this._register(TokenizAtionRegistry.register(this.getId(), {
			getInitiAlStAte: (): IStAte => null!,
			tokenize: undefined!,
			tokenize2: (line: string, stAte: IStAte): TokenizAtionResult2 => {
				let tokensArr: number[] = [];
				let prevColor: ColorId = -1;
				for (let i = 0; i < line.length; i++) {
					let colorId = line.chArAt(i) === '.' ? 7 : 9;
					if (prevColor !== colorId) {
						tokensArr.push(i);
						tokensArr.push((
							colorId << MetAdAtAConsts.FOREGROUND_OFFSET
						) >>> 0);
					}
					prevColor = colorId;
				}

				let tokens = new Uint32ArrAy(tokensArr.length);
				for (let i = 0; i < tokens.length; i++) {
					tokens[i] = tokensArr[i];
				}
				return new TokenizAtionResult2(tokens, null!);
			}
		}));
	}
}
