/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import { Selection, workspAce, ConfigurAtionTArget } from 'vscode';
import { withRAndomFileEditor, closeAllEditors } from './testUtils';
import { removeTAg } from '../removeTAg';
import { updAteTAg } from '../updAteTAg';
import { mAtchTAg } from '../mAtchTAg';
import { splitJoinTAg } from '../splitJoinTAg';
import { mergeLines } from '../mergeLines';

suite('Tests for Emmet Actions on html tAgs', () => {
	teArdown(() => {
		// close All editors
		return closeAllEditors;
	});

	const contents = `
	<div clAss="hello">
		<ul>
			<li><spAn>Hello</spAn></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn/>
	</div>
	`;

	let contentsWithTemplAte = `
	<script type="text/templAte">
		<ul>
			<li><spAn>Hello</spAn></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn/>
	</script>
	`;

	test('updAte tAg with multiple cursors', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li><section>Hello</section></li>
			<section><spAn>There</spAn></section>
			<section><li><spAn>Bye</spAn></li></section>
		</ul>
		<spAn/>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 17, 3, 17), // cursor inside tAgs
				new Selection(4, 5, 4, 5), // cursor inside opening tAg
				new Selection(5, 35, 5, 35), // cursor inside closing tAg
			];

			return updAteTAg('section')!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	// #region updAte tAg
	test('updAte tAg with entire node selected', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li><section>Hello</section></li>
			<li><spAn>There</spAn></li>
			<section><li><spAn>Bye</spAn></li></section>
		</ul>
		<spAn/>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 7, 3, 25),
				new Selection(5, 3, 5, 39),
			];

			return updAteTAg('section')!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('updAte tAg with templAte', () => {
		const expectedContents = `
	<script type="text/templAte">
		<section>
			<li><spAn>Hello</spAn></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</section>
		<spAn/>
	</script>
	`;

		return withRAndomFileEditor(contentsWithTemplAte, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(2, 4, 2, 4), // cursor inside ul tAg
			];

			return updAteTAg('section')!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});
	// #endregion

	// #region remove tAg
	test('remove tAg with mutliple cursors', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li>Hello</li>
			<spAn>There</spAn>
			<li><spAn>Bye</spAn></li>
		</ul>
		<spAn/>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 17, 3, 17), // cursor inside tAgs
				new Selection(4, 5, 4, 5), // cursor inside opening tAg
				new Selection(5, 35, 5, 35), // cursor inside closing tAg
			];

			return removeTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('remove tAg with boundAry conditions', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li>Hello</li>
			<li><spAn>There</spAn></li>
			<li><spAn>Bye</spAn></li>
		</ul>
		<spAn/>
	</div>
	`;

		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 7, 3, 25),
				new Selection(5, 3, 5, 39),
			];

			return removeTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});


	test('remove tAg with templAte', () => {
		const expectedContents = `
	<script type="text/templAte">
\t\t
		<li><spAn>Hello</spAn></li>
		<li><spAn>There</spAn></li>
		<div><li><spAn>Bye</spAn></li></div>
\t
		<spAn/>
	</script>
	`;
		return withRAndomFileEditor(contentsWithTemplAte, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(2, 4, 2, 4), // cursor inside ul tAg
			];

			return removeTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});
	// #endregion

	// #region split/join tAg
	test('split/join tAg with mutliple cursors', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li><spAn/></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn></spAn>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 17, 3, 17), // join tAg
				new Selection(7, 5, 7, 5), // split tAg
			];

			return splitJoinTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('split/join tAg with boundAry selection', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li><spAn/></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn></spAn>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 7, 3, 25), // join tAg
				new Selection(7, 2, 7, 9), // split tAg
			];

			return splitJoinTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('split/join tAg with templAtes', () => {
		const expectedContents = `
	<script type="text/templAte">
		<ul>
			<li><spAn/></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn></spAn>
	</script>
	`;
		return withRAndomFileEditor(contentsWithTemplAte, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 17, 3, 17), // join tAg
				new Selection(7, 5, 7, 5), // split tAg
			];

			return splitJoinTAg()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('split/join tAg in jsx with xhtml self closing tAg', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul>
			<li><spAn /></li>
			<li><spAn>There</spAn></li>
			<div><li><spAn>Bye</spAn></li></div>
		</ul>
		<spAn></spAn>
	</div>
	`;
		const oldVAlueForSyntAxProfiles = workspAce.getConfigurAtion('emmet').inspect('syntAxProfiles');
		return workspAce.getConfigurAtion('emmet').updAte('syntAxProfiles', { jsx: { selfClosingStyle: 'xhtml' } }, ConfigurAtionTArget.GlobAl).then(() => {
			return withRAndomFileEditor(contents, 'jsx', (editor, doc) => {
				editor.selections = [
					new Selection(3, 17, 3, 17), // join tAg
					new Selection(7, 5, 7, 5), // split tAg
				];

				return splitJoinTAg()!.then(() => {
					Assert.equAl(doc.getText(), expectedContents);
					return workspAce.getConfigurAtion('emmet').updAte('syntAxProfiles', oldVAlueForSyntAxProfiles ? oldVAlueForSyntAxProfiles.globAlVAlue : undefined, ConfigurAtionTArget.GlobAl);
				});
			});
		});
	});
	// #endregion

	// #region mAtch tAg
	test('mAtch tAg with mutliple cursors', () => {
		return withRAndomFileEditor(contents, 'html', (editor, _) => {
			editor.selections = [
				new Selection(1, 0, 1, 0), // just before tAg stArts, i.e before <
				new Selection(1, 1, 1, 1), // just before tAg nAme stArts
				new Selection(1, 2, 1, 2), // inside tAg nAme
				new Selection(1, 6, 1, 6), // After tAg nAme but before opening tAg ends
				new Selection(1, 18, 1, 18), // just before opening tAg ends
				new Selection(1, 19, 1, 19), // just After opening tAg ends
			];

			mAtchTAg();

			editor.selections.forEAch(selection => {
				Assert.equAl(selection.Active.line, 8);
				Assert.equAl(selection.Active.chArActer, 3);
				Assert.equAl(selection.Anchor.line, 8);
				Assert.equAl(selection.Anchor.chArActer, 3);
			});

			return Promise.resolve();
		});
	});

	test('mAtch tAg with templAte scripts', () => {
		let templAteScript = `
	<script type="text/templAte">
		<div>
			Hello
		</div>
	</script>`;

		return withRAndomFileEditor(templAteScript, 'html', (editor, _) => {
			editor.selections = [
				new Selection(2, 2, 2, 2), // just before div tAg stArts, i.e before <
			];

			mAtchTAg();

			editor.selections.forEAch(selection => {
				Assert.equAl(selection.Active.line, 4);
				Assert.equAl(selection.Active.chArActer, 4);
				Assert.equAl(selection.Anchor.line, 4);
				Assert.equAl(selection.Anchor.chArActer, 4);
			});

			return Promise.resolve();
		});
	});

	// #endregion

	// #region merge lines
	test('merge lines of tAg with children when empty selection', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul><li><spAn>Hello</spAn></li><li><spAn>There</spAn></li><div><li><spAn>Bye</spAn></li></div></ul>
		<spAn/>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(2, 3, 2, 3)
			];

			return mergeLines()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('merge lines of tAg with children when full node selection', () => {
		const expectedContents = `
	<div clAss="hello">
		<ul><li><spAn>Hello</spAn></li><li><spAn>There</spAn></li><div><li><spAn>Bye</spAn></li></div></ul>
		<spAn/>
	</div>
	`;
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(2, 3, 6, 7)
			];

			return mergeLines()!.then(() => {
				Assert.equAl(doc.getText(), expectedContents);
				return Promise.resolve();
			});
		});
	});

	test('merge lines is no-op when stArt And end nodes Are on the sAme line', () => {
		return withRAndomFileEditor(contents, 'html', (editor, doc) => {
			editor.selections = [
				new Selection(3, 9, 3, 9), // cursor is inside the <spAn> in <li><spAn>Hello</spAn></li>
				new Selection(4, 5, 4, 5), // cursor is inside the <li> in <li><spAn>Hello</spAn></li>
				new Selection(5, 5, 5, 20) // selection spAns multiple nodes in the sAme line
			];

			return mergeLines()!.then(() => {
				Assert.equAl(doc.getText(), contents);
				return Promise.resolve();
			});
		});
	});
	// #endregion
});

