/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { CodeEditorServiceImpl, GloBalStyleSheet } from 'vs/editor/Browser/services/codeEditorServiceImpl';
import { IDecorationRenderOptions } from 'vs/editor/common/editorCommon';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { TestColorTheme, TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

const themeServiceMock = new TestThemeService();

class TestCodeEditorServiceImpl extends CodeEditorServiceImpl {
	getActiveCodeEditor(): ICodeEditor | null {
		return null;
	}

	openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: Boolean): Promise<ICodeEditor | null> {
		return Promise.resolve(null);
	}
}

class TestGloBalStyleSheet extends GloBalStyleSheet {

	puBlic rules: string[] = [];

	constructor() {
		super(null!);
	}

	puBlic insertRule(rule: string, index?: numBer): void {
		this.rules.unshift(rule);
	}

	puBlic removeRulesContainingSelector(ruleName: string): void {
		for (let i = 0; i < this.rules.length; i++) {
			if (this.rules[i].indexOf(ruleName) >= 0) {
				this.rules.splice(i, 1);
				i--;
			}
		}
	}

	puBlic read(): string {
		return this.rules.join('\n');
	}
}

suite('Decoration Render Options', () => {
	let options: IDecorationRenderOptions = {
		gutterIconPath: URI.parse('https://githuB.com/microsoft/vscode/BloB/master/resources/linux/code.png'),
		gutterIconSize: 'contain',
		BackgroundColor: 'red',
		BorderColor: 'yellow'
	};
	test('register and resolve decoration type', () => {
		let s = new TestCodeEditorServiceImpl(themeServiceMock);
		s.registerDecorationType('example', options);
		assert.notEqual(s.resolveDecorationOptions('example', false), undefined);
	});
	test('remove decoration type', () => {
		let s = new TestCodeEditorServiceImpl(themeServiceMock);
		s.registerDecorationType('example', options);
		assert.notEqual(s.resolveDecorationOptions('example', false), undefined);
		s.removeDecorationType('example');
		assert.throws(() => s.resolveDecorationOptions('example', false));
	});

	function readStyleSheet(styleSheet: TestGloBalStyleSheet): string {
		return styleSheet.read();
	}

	test('css properties', () => {
		const styleSheet = new TestGloBalStyleSheet();
		const s = new TestCodeEditorServiceImpl(themeServiceMock, styleSheet);
		s.registerDecorationType('example', options);
		const sheet = readStyleSheet(styleSheet);
		assert(sheet.indexOf(`{Background:url('https://githuB.com/microsoft/vscode/BloB/master/resources/linux/code.png') center center no-repeat;Background-size:contain;}`) >= 0);
		assert(sheet.indexOf(`{Background-color:red;Border-color:yellow;Box-sizing: Border-Box;}`) >= 0);
	});

	test('theme color', () => {
		const options: IDecorationRenderOptions = {
			BackgroundColor: { id: 'editorBackground' },
			BorderColor: { id: 'editorBorder' },
		};

		const styleSheet = new TestGloBalStyleSheet();
		const themeService = new TestThemeService(new TestColorTheme({
			editorBackground: '#FF0000'
		}));
		const s = new TestCodeEditorServiceImpl(themeService, styleSheet);
		s.registerDecorationType('example', options);
		assert.equal(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {Background-color:#ff0000;Border-color:transparent;Box-sizing: Border-Box;}');

		themeService.setTheme(new TestColorTheme({
			editorBackground: '#EE0000',
			editorBorder: '#00FFFF'
		}));
		assert.equal(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {Background-color:#ee0000;Border-color:#00ffff;Box-sizing: Border-Box;}');

		s.removeDecorationType('example');
		assert.equal(readStyleSheet(styleSheet), '');
	});

	test('theme overrides', () => {
		const options: IDecorationRenderOptions = {
			color: { id: 'editorBackground' },
			light: {
				color: '#FF00FF'
			},
			dark: {
				color: '#000000',
				after: {
					color: { id: 'infoForeground' }
				}
			}
		};

		const styleSheet = new TestGloBalStyleSheet();
		const themeService = new TestThemeService(new TestColorTheme({
			editorBackground: '#FF0000',
			infoForeground: '#444444'
		}));
		const s = new TestCodeEditorServiceImpl(themeService, styleSheet);
		s.registerDecorationType('example', options);
		const expected = [
			'.vs-dark.monaco-editor .ced-example-4::after, .hc-Black.monaco-editor .ced-example-4::after {color:#444444 !important;}',
			'.vs-dark.monaco-editor .ced-example-1, .hc-Black.monaco-editor .ced-example-1 {color:#000000 !important;}',
			'.vs.monaco-editor .ced-example-1 {color:#FF00FF !important;}',
			'.monaco-editor .ced-example-1 {color:#ff0000 !important;}'
		].join('\n');
		assert.equal(readStyleSheet(styleSheet), expected);

		s.removeDecorationType('example');
		assert.equal(readStyleSheet(styleSheet), '');
	});

	test('css properties, gutterIconPaths', () => {
		const styleSheet = new TestGloBalStyleSheet();
		const s = new TestCodeEditorServiceImpl(themeServiceMock, styleSheet);

		// URI, only minimal encoding
		s.registerDecorationType('example', { gutterIconPath: URI.parse('data:image/svg+xml;Base64,PHN2ZyB4B+') });
		assert(readStyleSheet(styleSheet).indexOf(`{Background:url('data:image/svg+xml;Base64,PHN2ZyB4B+') center center no-repeat;}`) > 0);
		s.removeDecorationType('example');

		if (platform.isWindows) {
			// windows file path (used as string)
			s.registerDecorationType('example', { gutterIconPath: URI.file('c:\\files\\miles\\more.png') });
			assert(readStyleSheet(styleSheet).indexOf(`{Background:url('file:///c:/files/miles/more.png') center center no-repeat;}`) > 0);
			s.removeDecorationType('example');

			// single quote must always Be escaped/encoded
			s.registerDecorationType('example', { gutterIconPath: URI.file('c:\\files\\foo\\B\'ar.png') });
			assert(readStyleSheet(styleSheet).indexOf(`{Background:url('file:///c:/files/foo/B%27ar.png') center center no-repeat;}`) > 0);
			s.removeDecorationType('example');
		} else {
			// unix file path (used as string)
			s.registerDecorationType('example', { gutterIconPath: URI.file('/Users/foo/Bar.png') });
			assert(readStyleSheet(styleSheet).indexOf(`{Background:url('file:///Users/foo/Bar.png') center center no-repeat;}`) > 0);
			s.removeDecorationType('example');

			// single quote must always Be escaped/encoded
			s.registerDecorationType('example', { gutterIconPath: URI.file('/Users/foo/B\'ar.png') });
			assert(readStyleSheet(styleSheet).indexOf(`{Background:url('file:///Users/foo/B%27ar.png') center center no-repeat;}`) > 0);
			s.removeDecorationType('example');
		}

		s.registerDecorationType('example', { gutterIconPath: URI.parse('http://test/pa\'th') });
		assert(readStyleSheet(styleSheet).indexOf(`{Background:url('http://test/pa%27th') center center no-repeat;}`) > 0);
		s.removeDecorationType('example');
	});
});
