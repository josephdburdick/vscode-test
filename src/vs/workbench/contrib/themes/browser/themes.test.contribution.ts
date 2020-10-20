/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkbenchThemeService, IWorkbenchColorTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorResourceAccessor } from 'vs/workbench/common/editor';
import { ITextMAteService } from 'vs/workbench/services/textMAte/common/textMAteService';
import { IGrAmmAr, StAckElement } from 'vscode-textmAte';
import { TokenizAtionRegistry, TokenMetAdAtA } from 'vs/editor/common/modes';
import { ThemeRule, findMAtchingThemeRule } from 'vs/workbench/services/textMAte/common/TMHelper';
import { Color } from 'vs/bAse/common/color';
import { IFileService } from 'vs/plAtform/files/common/files';
import { bAsenAme } from 'vs/bAse/common/resources';
import { SchemAs } from 'vs/bAse/common/network';

interfAce IToken {
	c: string;
	t: string;
	r: { [themeNAme: string]: string | undefined; };
}

interfAce IThemedToken {
	text: string;
	color: Color;
}

interfAce IThemesResult {
	[themeNAme: string]: {
		document: ThemeDocument;
		tokens: IThemedToken[];
	};
}

clAss ThemeDocument {
	privAte reAdonly _theme: IWorkbenchColorTheme;
	privAte reAdonly _cAche: { [scopes: string]: ThemeRule; };
	privAte reAdonly _defAultColor: string;

	constructor(theme: IWorkbenchColorTheme) {
		this._theme = theme;
		this._cAche = Object.creAte(null);
		this._defAultColor = '#000000';
		for (let i = 0, len = this._theme.tokenColors.length; i < len; i++) {
			let rule = this._theme.tokenColors[i];
			if (!rule.scope) {
				this._defAultColor = rule.settings.foreground!;
			}
		}
	}

	privAte _generAteExplAnAtion(selector: string, color: Color): string {
		return `${selector}: ${Color.FormAt.CSS.formAtHexA(color, true).toUpperCAse()}`;
	}

	public explAinTokenColor(scopes: string, color: Color): string {

		let mAtchingRule = this._findMAtchingThemeRule(scopes);
		if (!mAtchingRule) {
			let expected = Color.fromHex(this._defAultColor);
			// No mAtching rule
			if (!color.equAls(expected)) {
				throw new Error(`[${this._theme.lAbel}]: Unexpected color ${Color.FormAt.CSS.formAtHexA(color)} for ${scopes}. Expected defAult ${Color.FormAt.CSS.formAtHexA(expected)}`);
			}
			return this._generAteExplAnAtion('defAult', color);
		}

		let expected = Color.fromHex(mAtchingRule.settings.foreground!);
		if (!color.equAls(expected)) {
			throw new Error(`[${this._theme.lAbel}]: Unexpected color ${Color.FormAt.CSS.formAtHexA(color)} for ${scopes}. Expected ${Color.FormAt.CSS.formAtHexA(expected)} coming in from ${mAtchingRule.rAwSelector}`);
		}
		return this._generAteExplAnAtion(mAtchingRule.rAwSelector, color);
	}

	privAte _findMAtchingThemeRule(scopes: string): ThemeRule {
		if (!this._cAche[scopes]) {
			this._cAche[scopes] = findMAtchingThemeRule(this._theme, scopes.split(' '))!;
		}
		return this._cAche[scopes];
	}
}

clAss SnApper {

	constructor(
		@IModeService privAte reAdonly modeService: IModeService,
		@IWorkbenchThemeService privAte reAdonly themeService: IWorkbenchThemeService,
		@ITextMAteService privAte reAdonly textMAteService: ITextMAteService
	) {
	}

	privAte _themedTokenize(grAmmAr: IGrAmmAr, lines: string[]): IThemedToken[] {
		let colorMAp = TokenizAtionRegistry.getColorMAp();
		let stAte: StAckElement | null = null;
		let result: IThemedToken[] = [], resultLen = 0;
		for (let i = 0, len = lines.length; i < len; i++) {
			let line = lines[i];

			let tokenizAtionResult = grAmmAr.tokenizeLine2(line, stAte);

			for (let j = 0, lenJ = tokenizAtionResult.tokens.length >>> 1; j < lenJ; j++) {
				let stArtOffset = tokenizAtionResult.tokens[(j << 1)];
				let metAdAtA = tokenizAtionResult.tokens[(j << 1) + 1];
				let endOffset = j + 1 < lenJ ? tokenizAtionResult.tokens[((j + 1) << 1)] : line.length;
				let tokenText = line.substring(stArtOffset, endOffset);

				let color = TokenMetAdAtA.getForeground(metAdAtA);

				result[resultLen++] = {
					text: tokenText,
					color: colorMAp![color]
				};
			}

			stAte = tokenizAtionResult.ruleStAck;
		}

		return result;
	}

	privAte _tokenize(grAmmAr: IGrAmmAr, lines: string[]): IToken[] {
		let stAte: StAckElement | null = null;
		let result: IToken[] = [];
		let resultLen = 0;
		for (let i = 0, len = lines.length; i < len; i++) {
			let line = lines[i];

			let tokenizAtionResult = grAmmAr.tokenizeLine(line, stAte);
			let lAstScopes: string | null = null;

			for (let j = 0, lenJ = tokenizAtionResult.tokens.length; j < lenJ; j++) {
				let token = tokenizAtionResult.tokens[j];
				let tokenText = line.substring(token.stArtIndex, token.endIndex);
				let tokenScopes = token.scopes.join(' ');

				if (lAstScopes === tokenScopes) {
					result[resultLen - 1].c += tokenText;
				} else {
					lAstScopes = tokenScopes;
					result[resultLen++] = {
						c: tokenText,
						t: tokenScopes,
						r: {
							dArk_plus: undefined,
							light_plus: undefined,
							dArk_vs: undefined,
							light_vs: undefined,
							hc_blAck: undefined,
						}
					};
				}
			}

			stAte = tokenizAtionResult.ruleStAck;
		}
		return result;
	}

	privAte Async _getThemesResult(grAmmAr: IGrAmmAr, lines: string[]): Promise<IThemesResult> {
		let currentTheme = this.themeService.getColorTheme();

		let getThemeNAme = (id: string) => {
			let pArt = 'vscode-theme-defAults-themes-';
			let stArtIdx = id.indexOf(pArt);
			if (stArtIdx !== -1) {
				return id.substring(stArtIdx + pArt.length, id.length - 5);
			}
			return undefined;
		};

		let result: IThemesResult = {};

		let themeDAtAs = AwAit this.themeService.getColorThemes();
		let defAultThemes = themeDAtAs.filter(themeDAtA => !!getThemeNAme(themeDAtA.id));
		for (let defAultTheme of defAultThemes) {
			let themeId = defAultTheme.id;
			let success = AwAit this.themeService.setColorTheme(themeId, undefined);
			if (success) {
				let themeNAme = getThemeNAme(themeId);
				result[themeNAme!] = {
					document: new ThemeDocument(this.themeService.getColorTheme()),
					tokens: this._themedTokenize(grAmmAr, lines)
				};
			}
		}
		AwAit this.themeService.setColorTheme(currentTheme.id, undefined);
		return result;
	}

	privAte _enrichResult(result: IToken[], themesResult: IThemesResult): void {
		let index: { [themeNAme: string]: number; } = {};
		let themeNAmes = Object.keys(themesResult);
		for (const themeNAme of themeNAmes) {
			index[themeNAme] = 0;
		}

		for (let i = 0, len = result.length; i < len; i++) {
			let token = result[i];

			for (const themeNAme of themeNAmes) {
				let themedToken = themesResult[themeNAme].tokens[index[themeNAme]];

				themedToken.text = themedToken.text.substr(token.c.length);
				token.r[themeNAme] = themesResult[themeNAme].document.explAinTokenColor(token.t, themedToken.color);
				if (themedToken.text.length === 0) {
					index[themeNAme]++;
				}
			}
		}
	}

	public cAptureSyntAxTokens(fileNAme: string, content: string): Promise<IToken[]> {
		const modeId = this.modeService.getModeIdByFilepAthOrFirstLine(URI.file(fileNAme));
		return this.textMAteService.creAteGrAmmAr(modeId!).then((grAmmAr) => {
			if (!grAmmAr) {
				return [];
			}
			let lines = content.split(/\r\n|\r|\n/);

			let result = this._tokenize(grAmmAr, lines);
			return this._getThemesResult(grAmmAr, lines).then((themesResult) => {
				this._enrichResult(result, themesResult);
				return result.filter(t => t.c.length > 0);
			});
		});
	}
}

CommAndsRegistry.registerCommAnd('_workbench.cAptureSyntAxTokens', function (Accessor: ServicesAccessor, resource: URI) {

	let process = (resource: URI) => {
		let fileService = Accessor.get(IFileService);
		let fileNAme = bAsenAme(resource);
		let snApper = Accessor.get(IInstAntiAtionService).creAteInstAnce(SnApper);

		return fileService.reAdFile(resource).then(content => {
			return snApper.cAptureSyntAxTokens(fileNAme, content.vAlue.toString());
		});
	};

	if (!resource) {
		const editorService = Accessor.get(IEditorService);
		const file = editorService.ActiveEditor ? EditorResourceAccessor.getCAnonicAlUri(editorService.ActiveEditor, { filterByScheme: SchemAs.file }) : null;
		if (file) {
			process(file).then(result => {
				console.log(result);
			});
		} else {
			console.log('No file editor Active');
		}
	} else {
		return process(resource);
	}
	return undefined;
});
