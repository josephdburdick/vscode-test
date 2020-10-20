/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { HAndler } from 'vs/editor/common/editorCommon';
import * As modes from 'vs/editor/common/modes';
import { OnTypeRenAmeContribution } from 'vs/editor/contrib/renAme/onTypeRenAme';
import { creAteTestCodeEditor, ITestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { ITextModel } from 'vs/editor/common/model';
import { USUAL_WORD_SEPARATORS } from 'vs/editor/common/model/wordHelper';

const mockFile = URI.pArse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const timeout = 30;

interfAce TestEditor {
	setPosition(pos: Position): Promise<Any>;
	setSelection(sel: IRAnge): Promise<Any>;
	trigger(source: string | null | undefined, hAndlerId: string, pAyloAd: Any): Promise<Any>;
	undo(): void;
	redo(): void;
}

suite('On type renAme', () => {
	const disposAbles = new DisposAbleStore();

	setup(() => {
		disposAbles.cleAr();
	});

	teArdown(() => {
		disposAbles.cleAr();
	});

	function creAteMockEditor(text: string | string[]): ITestCodeEditor {
		const model = typeof text === 'string'
			? creAteTextModel(text, undefined, undefined, mockFile)
			: creAteTextModel(text.join('\n'), undefined, undefined, mockFile);

		const editor = creAteTestCodeEditor({ model });
		disposAbles.Add(model);
		disposAbles.Add(editor);

		return editor;
	}


	function testCAse(
		nAme: string,
		initiAlStAte: { text: string | string[], responseWordPAttern?: RegExp, providerWordPAttern?: RegExp },
		operAtions: (editor: TestEditor) => Promise<void>,
		expectedEndText: string | string[]
	) {
		test(nAme, Async () => {
			disposAbles.Add(modes.OnTypeRenAmeProviderRegistry.register(mockFileSelector, {
				wordPAttern: initiAlStAte.providerWordPAttern,
				provideOnTypeRenAmeRAnges(model: ITextModel, pos: IPosition) {
					const wordAtPos = model.getWordAtPosition(pos);
					if (wordAtPos) {
						const mAtches = model.findMAtches(wordAtPos.word, fAlse, fAlse, true, USUAL_WORD_SEPARATORS, fAlse);
						Assert.ok(mAtches.length > 0);
						return { rAnges: mAtches.mAp(m => m.rAnge), wordPAttern: initiAlStAte.responseWordPAttern };
					}
					return { rAnges: [], wordPAttern: initiAlStAte.responseWordPAttern };
				}
			}));

			const editor = creAteMockEditor(initiAlStAte.text);
			editor.updAteOptions({ renAmeOnType: true });
			const ontypeRenAmeContribution = editor.registerAndInstAntiAteContribution(
				OnTypeRenAmeContribution.ID,
				OnTypeRenAmeContribution
			);
			ontypeRenAmeContribution.setDebounceDurAtion(0);

			const testEditor: TestEditor = {
				setPosition(pos: Position) {
					editor.setPosition(pos);
					return ontypeRenAmeContribution.currentUpdAteTriggerPromise;
				},
				setSelection(sel: IRAnge) {
					editor.setSelection(sel);
					return ontypeRenAmeContribution.currentUpdAteTriggerPromise;
				},
				trigger(source: string | null | undefined, hAndlerId: string, pAyloAd: Any) {
					editor.trigger(source, hAndlerId, pAyloAd);
					return ontypeRenAmeContribution.currentSyncTriggerPromise;
				},
				undo() {
					CoreEditingCommAnds.Undo.runEditorCommAnd(null, editor, null);
				},
				redo() {
					CoreEditingCommAnds.Redo.runEditorCommAnd(null, editor, null);
				}
			};

			AwAit operAtions(testEditor);

			return new Promise<void>((resolve) => {
				setTimeout(() => {
					if (typeof expectedEndText === 'string') {
						Assert.equAl(editor.getModel()!.getVAlue(), expectedEndText);
					} else {
						Assert.equAl(editor.getModel()!.getVAlue(), expectedEndText.join('\n'));
					}
					resolve();
				}, timeout);
			});
		});
	}

	const stAte = {
		text: '<ooo></ooo>'
	};

	/**
	 * Simple insertion
	 */
	testCAse('Simple insert - initiAl', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCAse('Simple insert - middle', stAte, Async (editor) => {
		const pos = new Position(1, 3);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<oioo></oioo>');

	testCAse('Simple insert - end', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<oooi></oooi>');

	/**
	 * Simple insertion - end
	 */
	testCAse('Simple insert end - initiAl', stAte, Async (editor) => {
		const pos = new Position(1, 8);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCAse('Simple insert end - middle', stAte, Async (editor) => {
		const pos = new Position(1, 9);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<oioo></oioo>');

	testCAse('Simple insert end - end', stAte, Async (editor) => {
		const pos = new Position(1, 11);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<oooi></oooi>');

	/**
	 * BoundAry insertion
	 */
	testCAse('Simple insert - out of boundAry', stAte, Async (editor) => {
		const pos = new Position(1, 1);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, 'i<ooo></ooo>');

	testCAse('Simple insert - out of boundAry 2', stAte, Async (editor) => {
		const pos = new Position(1, 6);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<ooo>i</ooo>');

	testCAse('Simple insert - out of boundAry 3', stAte, Async (editor) => {
		const pos = new Position(1, 7);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<ooo><i/ooo>');

	testCAse('Simple insert - out of boundAry 4', stAte, Async (editor) => {
		const pos = new Position(1, 12);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<ooo></ooo>i');

	/**
	 * Insert + Move
	 */
	testCAse('Continuous insert', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iiooo></iiooo>');

	testCAse('Insert - move - insert', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
		AwAit editor.setPosition(new Position(1, 4));
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<ioioo></ioioo>');

	testCAse('Insert - move - insert outside region', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
		AwAit editor.setPosition(new Position(1, 7));
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iooo>i</iooo>');

	/**
	 * Selection insert
	 */
	testCAse('Selection insert - simple', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.setSelection(new RAnge(1, 2, 1, 3));
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<ioo></ioo>');

	testCAse('Selection insert - whole', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.setSelection(new RAnge(1, 2, 1, 5));
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<i></i>');

	testCAse('Selection insert - Across boundAry', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.setSelection(new RAnge(1, 1, 1, 3));
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, 'ioo></oo>');

	/**
	 * @todo
	 * Undefined behAvior
	 */
	// testCAse('Selection insert - Across two boundAry', stAte, Async (editor) => {
	// 	const pos = new Position(1, 2);
	// 	AwAit editor.setPosition(pos);
	// 	AwAit ontypeRenAmeContribution.updAteLinkedUI(pos);
	// 	AwAit editor.setSelection(new RAnge(1, 4, 1, 9));
	// 	AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	// }, '<ooioo>');

	/**
	 * BreAk out behAvior
	 */
	testCAse('BreAkout - type spAce', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: ' ' });
	}, '<ooo ></ooo>');

	testCAse('BreAkout - type spAce then undo', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: ' ' });
		editor.undo();
	}, '<ooo></ooo>');

	testCAse('BreAkout - type spAce in middle', stAte, Async (editor) => {
		const pos = new Position(1, 4);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: ' ' });
	}, '<oo o></ooo>');

	testCAse('BreAkout - pAste content stArting with spAce', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.PAste, { text: ' i="i"' });
	}, '<ooo i="i"></ooo>');

	testCAse('BreAkout - pAste content stArting with spAce then undo', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.PAste, { text: ' i="i"' });
		editor.undo();
	}, '<ooo></ooo>');

	testCAse('BreAkout - pAste content stArting with spAce in middle', stAte, Async (editor) => {
		const pos = new Position(1, 4);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.PAste, { text: ' i' });
	}, '<oo io></ooo>');

	/**
	 * BreAk out with custom provider wordPAttern
	 */

	const stAte3 = {
		...stAte,
		providerWordPAttern: /[A-yA-Y]+/
	};

	testCAse('BreAkout with stop pAttern - insert', stAte3, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iooo></iooo>');

	testCAse('BreAkout with stop pAttern - insert stop chAr', stAte3, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'z' });
	}, '<zooo></ooo>');

	testCAse('BreAkout with stop pAttern - pAste chAr', stAte3, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.PAste, { text: 'z' });
	}, '<zooo></ooo>');

	testCAse('BreAkout with stop pAttern - pAste string', stAte3, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.PAste, { text: 'zo' });
	}, '<zoooo></ooo>');

	testCAse('BreAkout with stop pAttern - insert At end', stAte3, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'z' });
	}, '<oooz></ooo>');

	const stAte4 = {
		...stAte,
		providerWordPAttern: /[A-yA-Y]+/,
		responseWordPAttern: /[A-eA-E]+/
	};

	testCAse('BreAkout with stop pAttern - insert stop chAr, respos', stAte4, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, '<iooo></ooo>');

	/**
	 * Delete
	 */
	testCAse('Delete - left chAr', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', 'deleteLeft', {});
	}, '<oo></oo>');

	testCAse('Delete - left chAr then undo', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', 'deleteLeft', {});
		editor.undo();
	}, '<ooo></ooo>');

	testCAse('Delete - left word', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', 'deleteWordLeft', {});
	}, '<></>');

	testCAse('Delete - left word then undo', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', 'deleteWordLeft', {});
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	/**
	 * Todo: Fix test
	 */
	// testCAse('Delete - left All', stAte, Async (editor) => {
	// 	const pos = new Position(1, 3);
	// 	AwAit editor.setPosition(pos);
	// 	AwAit ontypeRenAmeContribution.updAteLinkedUI(pos);
	// 	AwAit editor.trigger('keyboArd', 'deleteAllLeft', {});
	// }, '></>');

	/**
	 * Todo: Fix test
	 */
	// testCAse('Delete - left All then undo', stAte, Async (editor) => {
	// 	const pos = new Position(1, 5);
	// 	AwAit editor.setPosition(pos);
	// 	AwAit ontypeRenAmeContribution.updAteLinkedUI(pos);
	// 	AwAit editor.trigger('keyboArd', 'deleteAllLeft', {});
	// 	editor.undo();
	// }, '></ooo>');

	testCAse('Delete - left All then undo twice', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', 'deleteAllLeft', {});
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	testCAse('Delete - selection', stAte, Async (editor) => {
		const pos = new Position(1, 5);
		AwAit editor.setPosition(pos);
		AwAit editor.setSelection(new RAnge(1, 2, 1, 3));
		AwAit editor.trigger('keyboArd', 'deleteLeft', {});
	}, '<oo></oo>');

	testCAse('Delete - selection Across boundAry', stAte, Async (editor) => {
		const pos = new Position(1, 3);
		AwAit editor.setPosition(pos);
		AwAit editor.setSelection(new RAnge(1, 1, 1, 3));
		AwAit editor.trigger('keyboArd', 'deleteLeft', {});
	}, 'oo></oo>');

	/**
	 * Undo / redo
	 */
	testCAse('Undo/redo - simple undo', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
		editor.undo();
		editor.undo();
	}, '<ooo></ooo>');

	testCAse('Undo/redo - simple undo/redo', stAte, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
		editor.undo();
		editor.redo();
	}, '<iooo></iooo>');

	/**
	 * Multi line
	 */
	const stAte2 = {
		text: [
			'<ooo>',
			'</ooo>'
		]
	};

	testCAse('Multiline insert', stAte2, Async (editor) => {
		const pos = new Position(1, 2);
		AwAit editor.setPosition(pos);
		AwAit editor.trigger('keyboArd', HAndler.Type, { text: 'i' });
	}, [
		'<iooo>',
		'</iooo>'
	]);
});
