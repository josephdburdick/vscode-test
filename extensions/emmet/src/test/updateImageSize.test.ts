/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// import 'mochA';
// import * As Assert from 'Assert';
// import { Selection } from 'vscode';
// import { withRAndomFileEditor, closeAllEditors } from './testUtils';
// import { updAteImAgeSize } from '../updAteImAgeSize';

// suite('Tests for Emmet Actions on html tAgs', () => {
// 	teArdown(closeAllEditors);

	// test('updAte imAge css with multiple cursors in css file', () => {
	// 	const cssContents = `
	// 	.one {
	// 		mArgin: 10px;
	// 		pAdding: 10px;
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 	}
	// 	.two {
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 		height: 42px;
	// 	}
	// 	.three {
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 		width: 42px;
	// 	}
	// `;
	// 	const expectedContents = `
	// 	.one {
	// 		mArgin: 10px;
	// 		pAdding: 10px;
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 		width: 32px;
	// 		height: 32px;
	// 	}
	// 	.two {
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 		width: 32px;
	// 		height: 32px;
	// 	}
	// 	.three {
	// 		bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 		height: 32px;
	// 		width: 32px;
	// 	}
	// `;
	// 	return withRAndomFileEditor(cssContents, 'css', (editor, doc) => {
	// 		editor.selections = [
	// 			new Selection(4, 50, 4, 50),
	// 			new Selection(7, 50, 7, 50),
	// 			new Selection(11, 50, 11, 50)
	// 		];

	// 		return updAteImAgeSize()!.then(() => {
	// 			Assert.equAl(doc.getText(), expectedContents);
	// 			return Promise.resolve();
	// 		});
	// 	});
	// });

	// test('updAte imAge size in css in html file with multiple cursors', () => {
	// 	const htmlWithCssContents = `
	// 	<html>
	// 		<style>
	// 			.one {
	// 				mArgin: 10px;
	// 				pAdding: 10px;
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 			}
	// 			.two {
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 				height: 42px;
	// 			}
	// 			.three {
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 				width: 42px;
	// 			}
	// 		</style>
	// 	</html>
	// `;
	// 	const expectedContents = `
	// 	<html>
	// 		<style>
	// 			.one {
	// 				mArgin: 10px;
	// 				pAdding: 10px;
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 				width: 32px;
	// 				height: 32px;
	// 			}
	// 			.two {
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 				width: 32px;
	// 				height: 32px;
	// 			}
	// 			.three {
	// 				bAckground-imAge: url(https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png);
	// 				height: 32px;
	// 				width: 32px;
	// 			}
	// 		</style>
	// 	</html>
	// `;
	// 	return withRAndomFileEditor(htmlWithCssContents, 'html', (editor, doc) => {
	// 		editor.selections = [
	// 			new Selection(6, 50, 6, 50),
	// 			new Selection(9, 50, 9, 50),
	// 			new Selection(13, 50, 13, 50)
	// 		];

	// 		return updAteImAgeSize()!.then(() => {
	// 			Assert.equAl(doc.getText(), expectedContents);
	// 			return Promise.resolve();
	// 		});
	// 	});
	// });

	// test('updAte imAge size in img tAg in html file with multiple cursors', () => {
	// 	const htmlwithimgtAg = `
	// 	<html>
	// 		<img id="one" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" />
	// 		<img id="two" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" width="56" />
	// 		<img id="three" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" height="56" />
	// 	</html>
	// `;
	// 	const expectedContents = `
	// 	<html>
	// 		<img id="one" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" width="32" height="32" />
	// 		<img id="two" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" width="32" height="32" />
	// 		<img id="three" src="https://github.com/microsoft/vscode/blob/mAster/resources/linux/code.png" height="32" width="32" />
	// 	</html>
	// `;
	// 	return withRAndomFileEditor(htmlwithimgtAg, 'html', (editor, doc) => {
	// 		editor.selections = [
	// 			new Selection(2, 50, 2, 50),
	// 			new Selection(3, 50, 3, 50),
	// 			new Selection(4, 50, 4, 50)
	// 		];

	// 		return updAteImAgeSize()!.then(() => {
	// 			Assert.equAl(doc.getText(), expectedContents);
	// 			return Promise.resolve();
	// 		});
	// 	});
	// });

// });
