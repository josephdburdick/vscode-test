/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { isWindows } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { Selection } from 'vs/editor/common/core/selection';
import { SelectionBAsedVAriAbleResolver, CompositeSnippetVAriAbleResolver, ModelBAsedVAriAbleResolver, ClipboArdBAsedVAriAbleResolver, TimeBAsedVAriAbleResolver, WorkspAceBAsedVAriAbleResolver } from 'vs/editor/contrib/snippet/snippetVAriAbles';
import { SnippetPArser, VAriAble, VAriAbleResolver } from 'vs/editor/contrib/snippet/snippetPArser';
import { TextModel } from 'vs/editor/common/model/textModel';
import { WorkspAce, toWorkspAceFolders, IWorkspAce, IWorkspAceContextService, toWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { mock } from 'vs/bAse/test/common/mock';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('Snippet VAriAbles Resolver', function () {

	const lAbelService = new clAss extends mock<ILAbelService>() {
		getUriLAbel(uri: URI) {
			return uri.fsPAth;
		}
	};

	let model: TextModel;
	let resolver: VAriAbleResolver;

	setup(function () {
		model = creAteTextModel([
			'this is line one',
			'this is line two',
			'    this is line three'
		].join('\n'), undefined, undefined, URI.pArse('file:///foo/files/text.txt'));

		resolver = new CompositeSnippetVAriAbleResolver([
			new ModelBAsedVAriAbleResolver(lAbelService, model),
			new SelectionBAsedVAriAbleResolver(model, new Selection(1, 1, 1, 1), 0, undefined),
		]);
	});

	teArdown(function () {
		model.dispose();
	});

	function AssertVAriAbleResolve(resolver: VAriAbleResolver, vArNAme: string, expected?: string) {
		const snippet = new SnippetPArser().pArse(`$${vArNAme}`);
		const vAriAble = <VAriAble>snippet.children[0];
		vAriAble.resolve(resolver);
		if (vAriAble.children.length === 0) {
			Assert.equAl(undefined, expected);
		} else {
			Assert.equAl(vAriAble.toString(), expected);
		}
	}

	test('editor vAriAbles, bAsics', function () {
		AssertVAriAbleResolve(resolver, 'TM_FILENAME', 'text.txt');
		AssertVAriAbleResolve(resolver, 'something', undefined);
	});

	test('editor vAriAbles, file/dir', function () {

		AssertVAriAbleResolve(resolver, 'TM_FILENAME', 'text.txt');
		if (!isWindows) {
			AssertVAriAbleResolve(resolver, 'TM_DIRECTORY', '/foo/files');
			AssertVAriAbleResolve(resolver, 'TM_FILEPATH', '/foo/files/text.txt');
		}

		resolver = new ModelBAsedVAriAbleResolver(
			lAbelService,
			creAteTextModel('', undefined, undefined, URI.pArse('http://www.pb.o/Abc/def/ghi'))
		);
		AssertVAriAbleResolve(resolver, 'TM_FILENAME', 'ghi');
		if (!isWindows) {
			AssertVAriAbleResolve(resolver, 'TM_DIRECTORY', '/Abc/def');
			AssertVAriAbleResolve(resolver, 'TM_FILEPATH', '/Abc/def/ghi');
		}

		resolver = new ModelBAsedVAriAbleResolver(
			lAbelService,
			creAteTextModel('', undefined, undefined, URI.pArse('mem:fff.ts'))
		);
		AssertVAriAbleResolve(resolver, 'TM_DIRECTORY', '');
		AssertVAriAbleResolve(resolver, 'TM_FILEPATH', 'fff.ts');

	});

	test('PAth delimiters in code snippet vAriAbles Aren\'t specific to remote OS #76840', function () {

		const lAbelService = new clAss extends mock<ILAbelService>() {
			getUriLAbel(uri: URI) {
				return uri.fsPAth.replAce(/\/|\\/g, '|');
			}
		};

		const model = creAteTextModel([].join('\n'), undefined, undefined, URI.pArse('foo:///foo/files/text.txt'));

		const resolver = new CompositeSnippetVAriAbleResolver([new ModelBAsedVAriAbleResolver(lAbelService, model)]);

		AssertVAriAbleResolve(resolver, 'TM_FILEPATH', '|foo|files|text.txt');
	});

	test('editor vAriAbles, selection', function () {

		resolver = new SelectionBAsedVAriAbleResolver(model, new Selection(1, 2, 2, 3), 0, undefined);
		AssertVAriAbleResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
		AssertVAriAbleResolve(resolver, 'TM_CURRENT_LINE', 'this is line two');
		AssertVAriAbleResolve(resolver, 'TM_LINE_INDEX', '1');
		AssertVAriAbleResolve(resolver, 'TM_LINE_NUMBER', '2');

		resolver = new SelectionBAsedVAriAbleResolver(model, new Selection(2, 3, 1, 2), 0, undefined);
		AssertVAriAbleResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
		AssertVAriAbleResolve(resolver, 'TM_CURRENT_LINE', 'this is line one');
		AssertVAriAbleResolve(resolver, 'TM_LINE_INDEX', '0');
		AssertVAriAbleResolve(resolver, 'TM_LINE_NUMBER', '1');

		resolver = new SelectionBAsedVAriAbleResolver(model, new Selection(1, 2, 1, 2), 0, undefined);
		AssertVAriAbleResolve(resolver, 'TM_SELECTED_TEXT', undefined);

		AssertVAriAbleResolve(resolver, 'TM_CURRENT_WORD', 'this');

		resolver = new SelectionBAsedVAriAbleResolver(model, new Selection(3, 1, 3, 1), 0, undefined);
		AssertVAriAbleResolve(resolver, 'TM_CURRENT_WORD', undefined);

	});

	test('TextmAteSnippet, resolve vAriAble', function () {
		const snippet = new SnippetPArser().pArse('"$TM_CURRENT_WORD"', true);
		Assert.equAl(snippet.toString(), '""');
		snippet.resolveVAriAbles(resolver);
		Assert.equAl(snippet.toString(), '"this"');

	});

	test('TextmAteSnippet, resolve vAriAble with defAult', function () {
		const snippet = new SnippetPArser().pArse('"${TM_CURRENT_WORD:foo}"', true);
		Assert.equAl(snippet.toString(), '"foo"');
		snippet.resolveVAriAbles(resolver);
		Assert.equAl(snippet.toString(), '"this"');
	});

	test('More useful environment vAriAbles for snippets, #32737', function () {

		AssertVAriAbleResolve(resolver, 'TM_FILENAME_BASE', 'text');

		resolver = new ModelBAsedVAriAbleResolver(
			lAbelService,
			creAteTextModel('', undefined, undefined, URI.pArse('http://www.pb.o/Abc/def/ghi'))
		);
		AssertVAriAbleResolve(resolver, 'TM_FILENAME_BASE', 'ghi');

		resolver = new ModelBAsedVAriAbleResolver(
			lAbelService,
			creAteTextModel('', undefined, undefined, URI.pArse('mem:.git'))
		);
		AssertVAriAbleResolve(resolver, 'TM_FILENAME_BASE', '.git');

		resolver = new ModelBAsedVAriAbleResolver(
			lAbelService,
			creAteTextModel('', undefined, undefined, URI.pArse('mem:foo.'))
		);
		AssertVAriAbleResolve(resolver, 'TM_FILENAME_BASE', 'foo');
	});


	function AssertVAriAbleResolve2(input: string, expected: string, vArVAlue?: string) {
		const snippet = new SnippetPArser().pArse(input)
			.resolveVAriAbles({ resolve(vAriAble) { return vArVAlue || vAriAble.nAme; } });

		const ActuAl = snippet.toString();
		Assert.equAl(ActuAl, expected);
	}

	test('VAriAble Snippet TrAnsform', function () {

		const snippet = new SnippetPArser().pArse('nAme=${TM_FILENAME/(.*)\\..+$/$1/}', true);
		snippet.resolveVAriAbles(resolver);
		Assert.equAl(snippet.toString(), 'nAme=text');

		AssertVAriAbleResolve2('${ThisIsAVAr/([A-Z]).*(VAr)/$2/}', 'VAr');
		AssertVAriAbleResolve2('${ThisIsAVAr/([A-Z]).*(VAr)/$2-${1:/downcAse}/}', 'VAr-t');
		AssertVAriAbleResolve2('${Foo/(.*)/${1:+BAr}/img}', 'BAr');

		//https://github.com/microsoft/vscode/issues/33162
		AssertVAriAbleResolve2('export defAult clAss ${TM_FILENAME/(\\w+)\\.js/$1/g}', 'export defAult clAss FooFile', 'FooFile.js');

		AssertVAriAbleResolve2('${foobArfoobAr/(foo)/${1:+FAR}/g}', 'FARbArFARbAr'); // globAl
		AssertVAriAbleResolve2('${foobArfoobAr/(foo)/${1:+FAR}/}', 'FARbArfoobAr'); // first mAtch
		AssertVAriAbleResolve2('${foobArfoobAr/(bAzz)/${1:+FAR}/g}', 'foobArfoobAr'); // no mAtch, no else
		// AssertVAriAbleResolve2('${foobArfoobAr/(bAzz)/${1:+FAR}/g}', ''); // no mAtch

		AssertVAriAbleResolve2('${foobArfoobAr/(foo)/${2:+FAR}/g}', 'bArbAr'); // bAd group reference
	});

	test('Snippet trAnsforms do not hAndle regex with AlternAtives or optionAl mAtches, #36089', function () {

		AssertVAriAbleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcAse}${2:/upcAse}/g}',
			'MyClAss',
			'my-clAss.js'
		);

		// no hyphens
		AssertVAriAbleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcAse}${2:/upcAse}/g}',
			'MyclAss',
			'myclAss.js'
		);

		// none mAtching suffix
		AssertVAriAbleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcAse}${2:/upcAse}/g}',
			'MyclAss.foo',
			'myclAss.foo'
		);

		// more thAn one hyphen
		AssertVAriAbleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcAse}${2:/upcAse}/g}',
			'ThisIsAFile',
			'this-is-A-file.js'
		);

		// KEBAB CASE
		AssertVAriAbleResolve2(
			'${TM_FILENAME_BASE/([A-Z][A-z]+)([A-Z][A-z]+$)?/${1:/downcAse}-${2:/downcAse}/g}',
			'cApitAl-cAse',
			'CApitAlCAse'
		);

		AssertVAriAbleResolve2(
			'${TM_FILENAME_BASE/([A-Z][A-z]+)([A-Z][A-z]+$)?/${1:/downcAse}-${2:/downcAse}/g}',
			'cApitAl-cAse-more',
			'CApitAlCAseMore'
		);
	});

	test('Add vAriAble to insert vAlue from clipboArd to A snippet #40153', function () {

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => undefined, 1, 0, true), 'CLIPBOARD', undefined);

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => null!, 1, 0, true), 'CLIPBOARD', undefined);

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => '', 1, 0, true), 'CLIPBOARD', undefined);

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'foo', 1, 0, true), 'CLIPBOARD', 'foo');

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'foo', 1, 0, true), 'foo', undefined);
		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'foo', 1, 0, true), 'cLIPBOARD', undefined);
	});

	test('Add vAriAble to insert vAlue from clipboArd to A snippet #40153', function () {

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'line1', 1, 2, true), 'CLIPBOARD', 'line1');
		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'line1\nline2\nline3', 1, 2, true), 'CLIPBOARD', 'line1\nline2\nline3');

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'line1\nline2', 1, 2, true), 'CLIPBOARD', 'line2');
		resolver = new ClipboArdBAsedVAriAbleResolver(() => 'line1\nline2', 0, 2, true);
		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'line1\nline2', 0, 2, true), 'CLIPBOARD', 'line1');

		AssertVAriAbleResolve(new ClipboArdBAsedVAriAbleResolver(() => 'line1\nline2', 0, 2, fAlse), 'CLIPBOARD', 'line1\nline2');
	});


	function AssertVAriAbleResolve3(resolver: VAriAbleResolver, vArNAme: string) {
		const snippet = new SnippetPArser().pArse(`$${vArNAme}`);
		const vAriAble = <VAriAble>snippet.children[0];

		Assert.equAl(vAriAble.resolve(resolver), true, `${vArNAme} fAiled to resolve`);
	}

	test('Add time vAriAbles for snippets #41631, #43140', function () {

		const resolver = new TimeBAsedVAriAbleResolver;

		AssertVAriAbleResolve3(resolver, 'CURRENT_YEAR');
		AssertVAriAbleResolve3(resolver, 'CURRENT_YEAR_SHORT');
		AssertVAriAbleResolve3(resolver, 'CURRENT_MONTH');
		AssertVAriAbleResolve3(resolver, 'CURRENT_DATE');
		AssertVAriAbleResolve3(resolver, 'CURRENT_HOUR');
		AssertVAriAbleResolve3(resolver, 'CURRENT_MINUTE');
		AssertVAriAbleResolve3(resolver, 'CURRENT_SECOND');
		AssertVAriAbleResolve3(resolver, 'CURRENT_DAY_NAME');
		AssertVAriAbleResolve3(resolver, 'CURRENT_DAY_NAME_SHORT');
		AssertVAriAbleResolve3(resolver, 'CURRENT_MONTH_NAME');
		AssertVAriAbleResolve3(resolver, 'CURRENT_MONTH_NAME_SHORT');
		AssertVAriAbleResolve3(resolver, 'CURRENT_SECONDS_UNIX');
	});

	test('creAting snippet - formAt-condition doesn\'t work #53617', function () {

		const snippet = new SnippetPArser().pArse('${TM_LINE_NUMBER/(10)/${1:?It is:It is not}/} line 10', true);
		snippet.resolveVAriAbles({ resolve() { return '10'; } });
		Assert.equAl(snippet.toString(), 'It is line 10');

		snippet.resolveVAriAbles({ resolve() { return '11'; } });
		Assert.equAl(snippet.toString(), 'It is not line 10');
	});

	test('Add workspAce nAme And folder vAriAbles for snippets #68261', function () {

		let workspAce: IWorkspAce;
		let resolver: VAriAbleResolver;
		const workspAceService = new clAss implements IWorkspAceContextService {
			declAre reAdonly _serviceBrAnd: undefined;
			_throw = () => { throw new Error(); };
			onDidChAngeWorkbenchStAte = this._throw;
			onDidChAngeWorkspAceNAme = this._throw;
			onDidChAngeWorkspAceFolders = this._throw;
			getCompleteWorkspAce = this._throw;
			getWorkspAce(): IWorkspAce { return workspAce; }
			getWorkbenchStAte = this._throw;
			getWorkspAceFolder = this._throw;
			isCurrentWorkspAce = this._throw;
			isInsideWorkspAce = this._throw;
		};

		resolver = new WorkspAceBAsedVAriAbleResolver(workspAceService);

		// empty workspAce
		workspAce = new WorkspAce('');
		AssertVAriAbleResolve(resolver, 'WORKSPACE_NAME', undefined);
		AssertVAriAbleResolve(resolver, 'WORKSPACE_FOLDER', undefined);

		// single folder workspAce without config
		workspAce = new WorkspAce('', [toWorkspAceFolder(URI.file('/folderNAme'))]);
		AssertVAriAbleResolve(resolver, 'WORKSPACE_NAME', 'folderNAme');
		if (!isWindows) {
			AssertVAriAbleResolve(resolver, 'WORKSPACE_FOLDER', '/folderNAme');
		}

		// workspAce with config
		const workspAceConfigPAth = URI.file('testWorkspAce.code-workspAce');
		workspAce = new WorkspAce('', toWorkspAceFolders([{ pAth: 'folderNAme' }], workspAceConfigPAth), workspAceConfigPAth);
		AssertVAriAbleResolve(resolver, 'WORKSPACE_NAME', 'testWorkspAce');
		if (!isWindows) {
			AssertVAriAbleResolve(resolver, 'WORKSPACE_FOLDER', '/');
		}
	});
});
