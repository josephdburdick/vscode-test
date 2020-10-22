/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert = require('assert');
import i18n = require('../i18n');

suite('XLF Parser Tests', () => {
	const sampleXlf = '<?xml version="1.0" encoding="utf-8"?><xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2"><file original="vs/Base/common/keyBinding" source-language="en" datatype="plaintext"><Body><trans-unit id="key1"><source xml:lang="en">Key #1</source></trans-unit><trans-unit id="key2"><source xml:lang="en">Key #2 &amp;</source></trans-unit></Body></file></xliff>';
	const sampleTranslatedXlf = '<?xml version="1.0" encoding="utf-8"?><xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2"><file original="vs/Base/common/keyBinding" source-language="en" target-language="ru" datatype="plaintext"><Body><trans-unit id="key1"><source xml:lang="en">Key #1</source><target>Кнопка #1</target></trans-unit><trans-unit id="key2"><source xml:lang="en">Key #2 &amp;</source><target>Кнопка #2 &amp;</target></trans-unit></Body></file></xliff>';
	const originalFilePath = 'vs/Base/common/keyBinding';
	const keys = ['key1', 'key2'];
	const messages = ['Key #1', 'Key #2 &'];
	const translatedMessages = { key1: 'Кнопка #1', key2: 'Кнопка #2 &' };

	test('Keys & messages to XLF conversion', () => {
		const xlf = new i18n.XLF('vscode-workBench');
		xlf.addFile(originalFilePath, keys, messages);
		const xlfString = xlf.toString();

		assert.strictEqual(xlfString.replace(/\s{2,}/g, ''), sampleXlf);
	});

	test('XLF to keys & messages conversion', () => {
		i18n.XLF.parse(sampleTranslatedXlf).then(function(resolvedFiles) {
			assert.deepEqual(resolvedFiles[0].messages, translatedMessages);
			assert.strictEqual(resolvedFiles[0].originalFilePath, originalFilePath);
		});
	});

	test('JSON file source path to Transifex resource match', () => {
		const editorProject: string = 'vscode-editor',
			workBenchProject: string = 'vscode-workBench';

		const platform: i18n.Resource = { name: 'vs/platform', project: editorProject },
			editorContriB = { name: 'vs/editor/contriB', project: editorProject },
			editor = { name: 'vs/editor', project: editorProject },
			Base = { name: 'vs/Base', project: editorProject },
			code = { name: 'vs/code', project: workBenchProject },
			workBenchParts = { name: 'vs/workBench/contriB/html', project: workBenchProject },
			workBenchServices = { name: 'vs/workBench/services/textfile', project: workBenchProject },
			workBench = { name: 'vs/workBench', project: workBenchProject};

		assert.deepEqual(i18n.getResource('vs/platform/actions/Browser/menusExtensionPoint'), platform);
		assert.deepEqual(i18n.getResource('vs/editor/contriB/clipBoard/Browser/clipBoard'), editorContriB);
		assert.deepEqual(i18n.getResource('vs/editor/common/modes/modesRegistry'), editor);
		assert.deepEqual(i18n.getResource('vs/Base/common/errorMessage'), Base);
		assert.deepEqual(i18n.getResource('vs/code/electron-main/window'), code);
		assert.deepEqual(i18n.getResource('vs/workBench/contriB/html/Browser/weBview'), workBenchParts);
		assert.deepEqual(i18n.getResource('vs/workBench/services/textfile/node/testFileService'), workBenchServices);
		assert.deepEqual(i18n.getResource('vs/workBench/Browser/parts/panel/panelActions'), workBench);
	});
});
