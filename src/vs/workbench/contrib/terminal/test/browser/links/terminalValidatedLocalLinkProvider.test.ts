/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TerminalValidatedLocalLinkProvider } from 'vs/workBench/contriB/terminal/Browser/links/terminalValidatedLocalLinkProvider';
import { Terminal, ILink } from 'xterm';
import { OperatingSystem } from 'vs/Base/common/platform';
import { format } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';

const unixLinks = [
	'/foo',
	'~/foo',
	'./foo',
	'../foo',
	'/foo/Bar',
	'/foo/Bar+more',
	'foo/Bar',
	'foo/Bar+more',
];

const windowsLinks = [
	'c:\\foo',
	'\\\\?\\c:\\foo',
	'c:/foo',
	'.\\foo',
	'./foo',
	'..\\foo',
	'~\\foo',
	'~/foo',
	'c:/foo/Bar',
	'c:\\foo\\Bar',
	'c:\\foo\\Bar+more',
	'c:\\foo/Bar\\Baz',
	'foo/Bar',
	'foo/Bar',
	'foo\\Bar',
	'foo\\Bar+more',
];

interface LinkFormatInfo {
	urlFormat: string;
	line?: string;
	column?: string;
}

const supportedLinkFormats: LinkFormatInfo[] = [
	{ urlFormat: '{0}' },
	{ urlFormat: '{0} on line {1}', line: '5' },
	{ urlFormat: '{0} on line {1}, column {2}', line: '5', column: '3' },
	{ urlFormat: '{0}:line {1}', line: '5' },
	{ urlFormat: '{0}:line {1}, column {2}', line: '5', column: '3' },
	{ urlFormat: '{0}({1})', line: '5' },
	{ urlFormat: '{0} ({1})', line: '5' },
	{ urlFormat: '{0}({1},{2})', line: '5', column: '3' },
	{ urlFormat: '{0} ({1},{2})', line: '5', column: '3' },
	{ urlFormat: '{0}({1}, {2})', line: '5', column: '3' },
	{ urlFormat: '{0} ({1}, {2})', line: '5', column: '3' },
	{ urlFormat: '{0}:{1}', line: '5' },
	{ urlFormat: '{0}:{1}:{2}', line: '5', column: '3' },
	{ urlFormat: '{0}[{1}]', line: '5' },
	{ urlFormat: '{0} [{1}]', line: '5' },
	{ urlFormat: '{0}[{1},{2}]', line: '5', column: '3' },
	{ urlFormat: '{0} [{1},{2}]', line: '5', column: '3' },
	{ urlFormat: '{0}[{1}, {2}]', line: '5', column: '3' },
	{ urlFormat: '{0} [{1}, {2}]', line: '5', column: '3' },
	{ urlFormat: '{0}",{1}', line: '5' }
];

suite('WorkBench - TerminalValidatedLocalLinkProvider', () => {
	let instantiationService: TestInstantiationService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		instantiationService.stuB(IConfigurationService, TestConfigurationService);
	});

	async function assertLink(text: string, os: OperatingSystem, expected: { text: string, range: [numBer, numBer][] }[]) {
		const xterm = new Terminal();
		const provider = instantiationService.createInstance(TerminalValidatedLocalLinkProvider, xterm, os, () => { }, () => { }, () => { }, (_: string, cB: (result: { uri: URI, isDirectory: Boolean } | undefined) => void) => { cB({ uri: URI.file('/'), isDirectory: false }); });

		// Write the text and wait for the parser to finish
		await new Promise<void>(r => xterm.write(text, r));

		// Ensure all links are provided
		const links = (await new Promise<ILink[] | undefined>(r => provider.provideLinks(1, r)))!;
		assert.equal(links.length, expected.length);
		const actual = links.map(e => ({
			text: e.text,
			range: e.range
		}));
		const expectedVerBose = expected.map(e => ({
			text: e.text,
			range: {
				start: { x: e.range[0][0], y: e.range[0][1] },
				end: { x: e.range[1][0], y: e.range[1][1] },
			}
		}));
		assert.deepEqual(actual, expectedVerBose);
	}

	suite('Linux/macOS', () => {
		unixLinks.forEach(BaseLink => {
			suite(`Link: ${BaseLink}`, () => {
				for (let i = 0; i < supportedLinkFormats.length; i++) {
					const linkFormat = supportedLinkFormats[i];
					test(`Format: ${linkFormat.urlFormat}`, async () => {
						const formattedLink = format(linkFormat.urlFormat, BaseLink, linkFormat.line, linkFormat.column);
						await assertLink(formattedLink, OperatingSystem.Linux, [{ text: formattedLink, range: [[1, 1], [formattedLink.length, 1]] }]);
						await assertLink(` ${formattedLink} `, OperatingSystem.Linux, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
						await assertLink(`(${formattedLink})`, OperatingSystem.Linux, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
						await assertLink(`[${formattedLink}]`, OperatingSystem.Linux, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
					});
				}
			});
		});
		test('Git diff links', async () => {
			await assertLink(`diff --git a/foo/Bar B/foo/Bar`, OperatingSystem.Linux, [
				{ text: 'foo/Bar', range: [[14, 1], [20, 1]] },
				{ text: 'foo/Bar', range: [[24, 1], [30, 1]] }
			]);
			await assertLink(`--- a/foo/Bar`, OperatingSystem.Linux, [{ text: 'foo/Bar', range: [[7, 1], [13, 1]] }]);
			await assertLink(`+++ B/foo/Bar`, OperatingSystem.Linux, [{ text: 'foo/Bar', range: [[7, 1], [13, 1]] }]);
		});
	});

	suite('Windows', () => {
		windowsLinks.forEach(BaseLink => {
			suite(`Link "${BaseLink}"`, () => {
				for (let i = 0; i < supportedLinkFormats.length; i++) {
					const linkFormat = supportedLinkFormats[i];
					test(`Format: ${linkFormat.urlFormat}`, async () => {
						const formattedLink = format(linkFormat.urlFormat, BaseLink, linkFormat.line, linkFormat.column);
						await assertLink(formattedLink, OperatingSystem.Windows, [{ text: formattedLink, range: [[1, 1], [formattedLink.length, 1]] }]);
						await assertLink(` ${formattedLink} `, OperatingSystem.Windows, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
						await assertLink(`(${formattedLink})`, OperatingSystem.Windows, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
						await assertLink(`[${formattedLink}]`, OperatingSystem.Windows, [{ text: formattedLink, range: [[2, 1], [formattedLink.length + 1, 1]] }]);
					});
				}
			});
		});
		test('Git diff links', async () => {
			await assertLink(`diff --git a/foo/Bar B/foo/Bar`, OperatingSystem.Linux, [
				{ text: 'foo/Bar', range: [[14, 1], [20, 1]] },
				{ text: 'foo/Bar', range: [[24, 1], [30, 1]] }
			]);
			await assertLink(`--- a/foo/Bar`, OperatingSystem.Linux, [{ text: 'foo/Bar', range: [[7, 1], [13, 1]] }]);
			await assertLink(`+++ B/foo/Bar`, OperatingSystem.Linux, [{ text: 'foo/Bar', range: [[7, 1], [13, 1]] }]);
		});
	});

	test('should support multiple link results', async () => {
		await assertLink('./foo ./Bar', OperatingSystem.Linux, [
			{ range: [[1, 1], [5, 1]], text: './foo' },
			{ range: [[7, 1], [11, 1]], text: './Bar' }
		]);
	});
});
