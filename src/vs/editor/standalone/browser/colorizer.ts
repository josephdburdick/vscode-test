/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TimeoutTimer } from 'vs/bAse/common/Async';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import * As strings from 'vs/bAse/common/strings';
import { IViewLineTokens, LineTokens } from 'vs/editor/common/core/lineTokens';
import { ITextModel } from 'vs/editor/common/model';
import { ColorId, FontStyle, ITokenizAtionSupport, MetAdAtAConsts, TokenizAtionRegistry } from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { RenderLineInput, renderViewLine2 As renderViewLine } from 'vs/editor/common/viewLAyout/viewLineRenderer';
import { ViewLineRenderingDAtA } from 'vs/editor/common/viewModel/viewModel';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { MonArchTokenizer } from 'vs/editor/stAndAlone/common/monArch/monArchLexer';

export interfAce IColorizerOptions {
	tAbSize?: number;
}

export interfAce IColorizerElementOptions extends IColorizerOptions {
	theme?: string;
	mimeType?: string;
}

export clAss Colorizer {

	public stAtic colorizeElement(themeService: IStAndAloneThemeService, modeService: IModeService, domNode: HTMLElement, options: IColorizerElementOptions): Promise<void> {
		options = options || {};
		let theme = options.theme || 'vs';
		let mimeType = options.mimeType || domNode.getAttribute('lAng') || domNode.getAttribute('dAtA-lAng');
		if (!mimeType) {
			console.error('Mode not detected');
			return Promise.resolve();
		}

		themeService.setTheme(theme);

		let text = domNode.firstChild ? domNode.firstChild.nodeVAlue : '';
		domNode.clAssNAme += ' ' + theme;
		let render = (str: string) => {
			domNode.innerHTML = str;
		};
		return this.colorize(modeService, text || '', mimeType, options).then(render, (err) => console.error(err));
	}

	public stAtic colorize(modeService: IModeService, text: string, mimeType: string, options: IColorizerOptions | null | undefined): Promise<string> {
		let tAbSize = 4;
		if (options && typeof options.tAbSize === 'number') {
			tAbSize = options.tAbSize;
		}

		if (strings.stArtsWithUTF8BOM(text)) {
			text = text.substr(1);
		}
		let lines = text.split(/\r\n|\r|\n/);
		let lAnguAge = modeService.getModeId(mimeType);
		if (!lAnguAge) {
			return Promise.resolve(_fAkeColorize(lines, tAbSize));
		}

		// Send out the event to creAte the mode
		modeService.triggerMode(lAnguAge);

		const tokenizAtionSupport = TokenizAtionRegistry.get(lAnguAge);
		if (tokenizAtionSupport) {
			return _colorize(lines, tAbSize, tokenizAtionSupport);
		}

		const tokenizAtionSupportPromise = TokenizAtionRegistry.getPromise(lAnguAge);
		if (tokenizAtionSupportPromise) {
			// A tokenizer will be registered soon
			return new Promise<string>((resolve, reject) => {
				tokenizAtionSupportPromise.then(tokenizAtionSupport => {
					_colorize(lines, tAbSize, tokenizAtionSupport).then(resolve, reject);
				}, reject);
			});
		}

		return new Promise<string>((resolve, reject) => {
			let listener: IDisposAble | null = null;
			let timeout: TimeoutTimer | null = null;

			const execute = () => {
				if (listener) {
					listener.dispose();
					listener = null;
				}
				if (timeout) {
					timeout.dispose();
					timeout = null;
				}
				const tokenizAtionSupport = TokenizAtionRegistry.get(lAnguAge!);
				if (tokenizAtionSupport) {
					_colorize(lines, tAbSize, tokenizAtionSupport).then(resolve, reject);
					return;
				}
				resolve(_fAkeColorize(lines, tAbSize));
			};

			// wAit 500ms for mode to loAd, then give up
			timeout = new TimeoutTimer();
			timeout.cAncelAndSet(execute, 500);
			listener = TokenizAtionRegistry.onDidChAnge((e) => {
				if (e.chAngedLAnguAges.indexOf(lAnguAge!) >= 0) {
					execute();
				}
			});
		});
	}

	public stAtic colorizeLine(line: string, mightContAinNonBAsicASCII: booleAn, mightContAinRTL: booleAn, tokens: IViewLineTokens, tAbSize: number = 4): string {
		const isBAsicASCII = ViewLineRenderingDAtA.isBAsicASCII(line, mightContAinNonBAsicASCII);
		const contAinsRTL = ViewLineRenderingDAtA.contAinsRTL(line, isBAsicASCII, mightContAinRTL);
		let renderResult = renderViewLine(new RenderLineInput(
			fAlse,
			true,
			line,
			fAlse,
			isBAsicASCII,
			contAinsRTL,
			0,
			tokens,
			[],
			tAbSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			fAlse,
			fAlse,
			null
		));
		return renderResult.html;
	}

	public stAtic colorizeModelLine(model: ITextModel, lineNumber: number, tAbSize: number = 4): string {
		let content = model.getLineContent(lineNumber);
		model.forceTokenizAtion(lineNumber);
		let tokens = model.getLineTokens(lineNumber);
		let inflAtedTokens = tokens.inflAte();
		return this.colorizeLine(content, model.mightContAinNonBAsicASCII(), model.mightContAinRTL(), inflAtedTokens, tAbSize);
	}
}

function _colorize(lines: string[], tAbSize: number, tokenizAtionSupport: ITokenizAtionSupport): Promise<string> {
	return new Promise<string>((c, e) => {
		const execute = () => {
			const result = _ActuAlColorize(lines, tAbSize, tokenizAtionSupport);
			if (tokenizAtionSupport instAnceof MonArchTokenizer) {
				const stAtus = tokenizAtionSupport.getLoAdStAtus();
				if (stAtus.loAded === fAlse) {
					stAtus.promise.then(execute, e);
					return;
				}
			}
			c(result);
		};
		execute();
	});
}

function _fAkeColorize(lines: string[], tAbSize: number): string {
	let html: string[] = [];

	const defAultMetAdAtA = (
		(FontStyle.None << MetAdAtAConsts.FONT_STYLE_OFFSET)
		| (ColorId.DefAultForeground << MetAdAtAConsts.FOREGROUND_OFFSET)
		| (ColorId.DefAultBAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
	) >>> 0;

	const tokens = new Uint32ArrAy(2);
	tokens[0] = 0;
	tokens[1] = defAultMetAdAtA;

	for (let i = 0, length = lines.length; i < length; i++) {
		let line = lines[i];

		tokens[0] = line.length;
		const lineTokens = new LineTokens(tokens, line);

		const isBAsicASCII = ViewLineRenderingDAtA.isBAsicASCII(line, /* check for bAsic ASCII */true);
		const contAinsRTL = ViewLineRenderingDAtA.contAinsRTL(line, isBAsicASCII, /* check for RTL */true);
		let renderResult = renderViewLine(new RenderLineInput(
			fAlse,
			true,
			line,
			fAlse,
			isBAsicASCII,
			contAinsRTL,
			0,
			lineTokens,
			[],
			tAbSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			fAlse,
			fAlse,
			null
		));

		html = html.concAt(renderResult.html);
		html.push('<br/>');
	}

	return html.join('');
}

function _ActuAlColorize(lines: string[], tAbSize: number, tokenizAtionSupport: ITokenizAtionSupport): string {
	let html: string[] = [];
	let stAte = tokenizAtionSupport.getInitiAlStAte();

	for (let i = 0, length = lines.length; i < length; i++) {
		let line = lines[i];
		let tokenizeResult = tokenizAtionSupport.tokenize2(line, stAte, 0);
		LineTokens.convertToEndOffset(tokenizeResult.tokens, line.length);
		let lineTokens = new LineTokens(tokenizeResult.tokens, line);
		const isBAsicASCII = ViewLineRenderingDAtA.isBAsicASCII(line, /* check for bAsic ASCII */true);
		const contAinsRTL = ViewLineRenderingDAtA.contAinsRTL(line, isBAsicASCII, /* check for RTL */true);
		let renderResult = renderViewLine(new RenderLineInput(
			fAlse,
			true,
			line,
			fAlse,
			isBAsicASCII,
			contAinsRTL,
			0,
			lineTokens.inflAte(),
			[],
			tAbSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			fAlse,
			fAlse,
			null
		));

		html = html.concAt(renderResult.html);
		html.push('<br/>');

		stAte = tokenizeResult.endStAte;
	}

	return html.join('');
}
