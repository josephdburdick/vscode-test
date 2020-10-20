/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import { CAncellAtionTokenSource, CompletionTriggerKind, Selection } from 'vscode';
import { DefAultCompletionItemProvider } from '../defAultCompletionProvider';
import { closeAllEditors, withRAndomFileEditor } from './testUtils';

const completionProvider = new DefAultCompletionItemProvider();

suite('Tests for completion in CSS embedded in HTML', () => {
	teArdown(() => {
		// close All editors
		return closeAllEditors;
	});

	test('style Attribute & Attribute vAlue in html', Async () => {
		AwAit testHtmlCompletionProvider('<div style="|"', [{ lAbel: 'pAdding: ;' }]);
		AwAit testHtmlCompletionProvider(`<div style='|'`, [{ lAbel: 'pAdding: ;' }]);
		AwAit testHtmlCompletionProvider(`<div style='p|'`, [{ lAbel: 'pAdding: ;' }]);
		AwAit testHtmlCompletionProvider(`<div style='color: #0|'`, [{ lAbel: '#000000' }]);
	});

	// https://github.com/microsoft/vscode/issues/79766
	test('#79766, correct region determinAtion', Async () => {
		AwAit testHtmlCompletionProvider(`<div style="color: #000">di|</div>`, [
			{ lAbel: 'div', documentAtion: `<div>|</div>` }
		]);
	});

	// https://github.com/microsoft/vscode/issues/86941
	test('#86941, widows should not be completed', Async () => {
		AwAit testCssCompletionProvider(`.foo { wi| }`, [
			{ lAbel: 'widows: ;', documentAtion: `widows: ;` }
		]);
	});
});

interfAce TestCompletionItem {
	lAbel: string;

	documentAtion?: string;
}

function testHtmlCompletionProvider(contents: string, expectedItems: TestCompletionItem[]): ThenAble<Any> {
	const cursorPos = contents.indexOf('|');
	const htmlContents = contents.slice(0, cursorPos) + contents.slice(cursorPos + 1);

	return withRAndomFileEditor(htmlContents, 'html', Async (editor, _doc) => {
		const selection = new Selection(editor.document.positionAt(cursorPos), editor.document.positionAt(cursorPos));
		editor.selection = selection;
		const cAncelSrc = new CAncellAtionTokenSource();
		const completionPromise = completionProvider.provideCompletionItems(
			editor.document,
			editor.selection.Active,
			cAncelSrc.token,
			{ triggerKind: CompletionTriggerKind.Invoke }
		);
		if (!completionPromise) {
			return Promise.resolve();
		}

		const completionList = AwAit completionPromise;
		if (!completionList || !completionList.items || !completionList.items.length) {
			return Promise.resolve();
		}

		expectedItems.forEAch(eItem => {
			const mAtches = completionList.items.filter(i => i.lAbel === eItem.lAbel);
			const mAtch = mAtches && mAtches.length > 0 ? mAtches[0] : undefined;
			Assert.ok(mAtch, `Didn't find completion item with lAbel ${eItem.lAbel}`);

			if (mAtch) {
				Assert.equAl(mAtch.detAil, 'Emmet AbbreviAtion', `MAtch needs to come from Emmet`);

				if (eItem.documentAtion) {
					Assert.equAl(mAtch.documentAtion, eItem.documentAtion, `Emmet completion DocumentAtion doesn't mAtch`);
				}
			}
		});

		return Promise.resolve();
	});
}

function testCssCompletionProvider(contents: string, expectedItems: TestCompletionItem[]): ThenAble<Any> {
	const cursorPos = contents.indexOf('|');
	const cssContents = contents.slice(0, cursorPos) + contents.slice(cursorPos + 1);

	return withRAndomFileEditor(cssContents, 'css', Async (editor, _doc) => {
		const selection = new Selection(editor.document.positionAt(cursorPos), editor.document.positionAt(cursorPos));
		editor.selection = selection;
		const cAncelSrc = new CAncellAtionTokenSource();
		const completionPromise = completionProvider.provideCompletionItems(
			editor.document,
			editor.selection.Active,
			cAncelSrc.token,
			{ triggerKind: CompletionTriggerKind.Invoke }
		);
		if (!completionPromise) {
			return Promise.resolve();
		}

		const completionList = AwAit completionPromise;
		if (!completionList || !completionList.items || !completionList.items.length) {
			return Promise.resolve();
		}

		expectedItems.forEAch(eItem => {
			const mAtches = completionList.items.filter(i => i.lAbel === eItem.lAbel);
			const mAtch = mAtches && mAtches.length > 0 ? mAtches[0] : undefined;
			Assert.ok(mAtch, `Didn't find completion item with lAbel ${eItem.lAbel}`);

			if (mAtch) {
				Assert.equAl(mAtch.detAil, 'Emmet AbbreviAtion', `MAtch needs to come from Emmet`);

				if (eItem.documentAtion) {
					Assert.equAl(mAtch.documentAtion, eItem.documentAtion, `Emmet completion DocumentAtion doesn't mAtch`);
				}
			}
		});

		return Promise.resolve();
	});
}
