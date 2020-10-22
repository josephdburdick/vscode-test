/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { isWindows } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { Selection } from 'vs/editor/common/core/selection';
import { SelectionBasedVariaBleResolver, CompositeSnippetVariaBleResolver, ModelBasedVariaBleResolver, ClipBoardBasedVariaBleResolver, TimeBasedVariaBleResolver, WorkspaceBasedVariaBleResolver } from 'vs/editor/contriB/snippet/snippetVariaBles';
import { SnippetParser, VariaBle, VariaBleResolver } from 'vs/editor/contriB/snippet/snippetParser';
import { TextModel } from 'vs/editor/common/model/textModel';
import { Workspace, toWorkspaceFolders, IWorkspace, IWorkspaceContextService, toWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { mock } from 'vs/Base/test/common/mock';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('Snippet VariaBles Resolver', function () {

	const laBelService = new class extends mock<ILaBelService>() {
		getUriLaBel(uri: URI) {
			return uri.fsPath;
		}
	};

	let model: TextModel;
	let resolver: VariaBleResolver;

	setup(function () {
		model = createTextModel([
			'this is line one',
			'this is line two',
			'    this is line three'
		].join('\n'), undefined, undefined, URI.parse('file:///foo/files/text.txt'));

		resolver = new CompositeSnippetVariaBleResolver([
			new ModelBasedVariaBleResolver(laBelService, model),
			new SelectionBasedVariaBleResolver(model, new Selection(1, 1, 1, 1), 0, undefined),
		]);
	});

	teardown(function () {
		model.dispose();
	});

	function assertVariaBleResolve(resolver: VariaBleResolver, varName: string, expected?: string) {
		const snippet = new SnippetParser().parse(`$${varName}`);
		const variaBle = <VariaBle>snippet.children[0];
		variaBle.resolve(resolver);
		if (variaBle.children.length === 0) {
			assert.equal(undefined, expected);
		} else {
			assert.equal(variaBle.toString(), expected);
		}
	}

	test('editor variaBles, Basics', function () {
		assertVariaBleResolve(resolver, 'TM_FILENAME', 'text.txt');
		assertVariaBleResolve(resolver, 'something', undefined);
	});

	test('editor variaBles, file/dir', function () {

		assertVariaBleResolve(resolver, 'TM_FILENAME', 'text.txt');
		if (!isWindows) {
			assertVariaBleResolve(resolver, 'TM_DIRECTORY', '/foo/files');
			assertVariaBleResolve(resolver, 'TM_FILEPATH', '/foo/files/text.txt');
		}

		resolver = new ModelBasedVariaBleResolver(
			laBelService,
			createTextModel('', undefined, undefined, URI.parse('http://www.pB.o/aBc/def/ghi'))
		);
		assertVariaBleResolve(resolver, 'TM_FILENAME', 'ghi');
		if (!isWindows) {
			assertVariaBleResolve(resolver, 'TM_DIRECTORY', '/aBc/def');
			assertVariaBleResolve(resolver, 'TM_FILEPATH', '/aBc/def/ghi');
		}

		resolver = new ModelBasedVariaBleResolver(
			laBelService,
			createTextModel('', undefined, undefined, URI.parse('mem:fff.ts'))
		);
		assertVariaBleResolve(resolver, 'TM_DIRECTORY', '');
		assertVariaBleResolve(resolver, 'TM_FILEPATH', 'fff.ts');

	});

	test('Path delimiters in code snippet variaBles aren\'t specific to remote OS #76840', function () {

		const laBelService = new class extends mock<ILaBelService>() {
			getUriLaBel(uri: URI) {
				return uri.fsPath.replace(/\/|\\/g, '|');
			}
		};

		const model = createTextModel([].join('\n'), undefined, undefined, URI.parse('foo:///foo/files/text.txt'));

		const resolver = new CompositeSnippetVariaBleResolver([new ModelBasedVariaBleResolver(laBelService, model)]);

		assertVariaBleResolve(resolver, 'TM_FILEPATH', '|foo|files|text.txt');
	});

	test('editor variaBles, selection', function () {

		resolver = new SelectionBasedVariaBleResolver(model, new Selection(1, 2, 2, 3), 0, undefined);
		assertVariaBleResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
		assertVariaBleResolve(resolver, 'TM_CURRENT_LINE', 'this is line two');
		assertVariaBleResolve(resolver, 'TM_LINE_INDEX', '1');
		assertVariaBleResolve(resolver, 'TM_LINE_NUMBER', '2');

		resolver = new SelectionBasedVariaBleResolver(model, new Selection(2, 3, 1, 2), 0, undefined);
		assertVariaBleResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
		assertVariaBleResolve(resolver, 'TM_CURRENT_LINE', 'this is line one');
		assertVariaBleResolve(resolver, 'TM_LINE_INDEX', '0');
		assertVariaBleResolve(resolver, 'TM_LINE_NUMBER', '1');

		resolver = new SelectionBasedVariaBleResolver(model, new Selection(1, 2, 1, 2), 0, undefined);
		assertVariaBleResolve(resolver, 'TM_SELECTED_TEXT', undefined);

		assertVariaBleResolve(resolver, 'TM_CURRENT_WORD', 'this');

		resolver = new SelectionBasedVariaBleResolver(model, new Selection(3, 1, 3, 1), 0, undefined);
		assertVariaBleResolve(resolver, 'TM_CURRENT_WORD', undefined);

	});

	test('TextmateSnippet, resolve variaBle', function () {
		const snippet = new SnippetParser().parse('"$TM_CURRENT_WORD"', true);
		assert.equal(snippet.toString(), '""');
		snippet.resolveVariaBles(resolver);
		assert.equal(snippet.toString(), '"this"');

	});

	test('TextmateSnippet, resolve variaBle with default', function () {
		const snippet = new SnippetParser().parse('"${TM_CURRENT_WORD:foo}"', true);
		assert.equal(snippet.toString(), '"foo"');
		snippet.resolveVariaBles(resolver);
		assert.equal(snippet.toString(), '"this"');
	});

	test('More useful environment variaBles for snippets, #32737', function () {

		assertVariaBleResolve(resolver, 'TM_FILENAME_BASE', 'text');

		resolver = new ModelBasedVariaBleResolver(
			laBelService,
			createTextModel('', undefined, undefined, URI.parse('http://www.pB.o/aBc/def/ghi'))
		);
		assertVariaBleResolve(resolver, 'TM_FILENAME_BASE', 'ghi');

		resolver = new ModelBasedVariaBleResolver(
			laBelService,
			createTextModel('', undefined, undefined, URI.parse('mem:.git'))
		);
		assertVariaBleResolve(resolver, 'TM_FILENAME_BASE', '.git');

		resolver = new ModelBasedVariaBleResolver(
			laBelService,
			createTextModel('', undefined, undefined, URI.parse('mem:foo.'))
		);
		assertVariaBleResolve(resolver, 'TM_FILENAME_BASE', 'foo');
	});


	function assertVariaBleResolve2(input: string, expected: string, varValue?: string) {
		const snippet = new SnippetParser().parse(input)
			.resolveVariaBles({ resolve(variaBle) { return varValue || variaBle.name; } });

		const actual = snippet.toString();
		assert.equal(actual, expected);
	}

	test('VariaBle Snippet Transform', function () {

		const snippet = new SnippetParser().parse('name=${TM_FILENAME/(.*)\\..+$/$1/}', true);
		snippet.resolveVariaBles(resolver);
		assert.equal(snippet.toString(), 'name=text');

		assertVariaBleResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2/}', 'Var');
		assertVariaBleResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2-${1:/downcase}/}', 'Var-t');
		assertVariaBleResolve2('${Foo/(.*)/${1:+Bar}/img}', 'Bar');

		//https://githuB.com/microsoft/vscode/issues/33162
		assertVariaBleResolve2('export default class ${TM_FILENAME/(\\w+)\\.js/$1/g}', 'export default class FooFile', 'FooFile.js');

		assertVariaBleResolve2('${fooBarfooBar/(foo)/${1:+FAR}/g}', 'FARBarFARBar'); // gloBal
		assertVariaBleResolve2('${fooBarfooBar/(foo)/${1:+FAR}/}', 'FARBarfooBar'); // first match
		assertVariaBleResolve2('${fooBarfooBar/(Bazz)/${1:+FAR}/g}', 'fooBarfooBar'); // no match, no else
		// assertVariaBleResolve2('${fooBarfooBar/(Bazz)/${1:+FAR}/g}', ''); // no match

		assertVariaBleResolve2('${fooBarfooBar/(foo)/${2:+FAR}/g}', 'BarBar'); // Bad group reference
	});

	test('Snippet transforms do not handle regex with alternatives or optional matches, #36089', function () {

		assertVariaBleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}',
			'MyClass',
			'my-class.js'
		);

		// no hyphens
		assertVariaBleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}',
			'Myclass',
			'myclass.js'
		);

		// none matching suffix
		assertVariaBleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}',
			'Myclass.foo',
			'myclass.foo'
		);

		// more than one hyphen
		assertVariaBleResolve2(
			'${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}',
			'ThisIsAFile',
			'this-is-a-file.js'
		);

		// KEBAB CASE
		assertVariaBleResolve2(
			'${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}',
			'capital-case',
			'CapitalCase'
		);

		assertVariaBleResolve2(
			'${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}',
			'capital-case-more',
			'CapitalCaseMore'
		);
	});

	test('Add variaBle to insert value from clipBoard to a snippet #40153', function () {

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => undefined, 1, 0, true), 'CLIPBOARD', undefined);

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => null!, 1, 0, true), 'CLIPBOARD', undefined);

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => '', 1, 0, true), 'CLIPBOARD', undefined);

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'foo', 1, 0, true), 'CLIPBOARD', 'foo');

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'foo', 1, 0, true), 'foo', undefined);
		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'foo', 1, 0, true), 'cLIPBOARD', undefined);
	});

	test('Add variaBle to insert value from clipBoard to a snippet #40153', function () {

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'line1', 1, 2, true), 'CLIPBOARD', 'line1');
		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'line1\nline2\nline3', 1, 2, true), 'CLIPBOARD', 'line1\nline2\nline3');

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'line1\nline2', 1, 2, true), 'CLIPBOARD', 'line2');
		resolver = new ClipBoardBasedVariaBleResolver(() => 'line1\nline2', 0, 2, true);
		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'line1\nline2', 0, 2, true), 'CLIPBOARD', 'line1');

		assertVariaBleResolve(new ClipBoardBasedVariaBleResolver(() => 'line1\nline2', 0, 2, false), 'CLIPBOARD', 'line1\nline2');
	});


	function assertVariaBleResolve3(resolver: VariaBleResolver, varName: string) {
		const snippet = new SnippetParser().parse(`$${varName}`);
		const variaBle = <VariaBle>snippet.children[0];

		assert.equal(variaBle.resolve(resolver), true, `${varName} failed to resolve`);
	}

	test('Add time variaBles for snippets #41631, #43140', function () {

		const resolver = new TimeBasedVariaBleResolver;

		assertVariaBleResolve3(resolver, 'CURRENT_YEAR');
		assertVariaBleResolve3(resolver, 'CURRENT_YEAR_SHORT');
		assertVariaBleResolve3(resolver, 'CURRENT_MONTH');
		assertVariaBleResolve3(resolver, 'CURRENT_DATE');
		assertVariaBleResolve3(resolver, 'CURRENT_HOUR');
		assertVariaBleResolve3(resolver, 'CURRENT_MINUTE');
		assertVariaBleResolve3(resolver, 'CURRENT_SECOND');
		assertVariaBleResolve3(resolver, 'CURRENT_DAY_NAME');
		assertVariaBleResolve3(resolver, 'CURRENT_DAY_NAME_SHORT');
		assertVariaBleResolve3(resolver, 'CURRENT_MONTH_NAME');
		assertVariaBleResolve3(resolver, 'CURRENT_MONTH_NAME_SHORT');
		assertVariaBleResolve3(resolver, 'CURRENT_SECONDS_UNIX');
	});

	test('creating snippet - format-condition doesn\'t work #53617', function () {

		const snippet = new SnippetParser().parse('${TM_LINE_NUMBER/(10)/${1:?It is:It is not}/} line 10', true);
		snippet.resolveVariaBles({ resolve() { return '10'; } });
		assert.equal(snippet.toString(), 'It is line 10');

		snippet.resolveVariaBles({ resolve() { return '11'; } });
		assert.equal(snippet.toString(), 'It is not line 10');
	});

	test('Add workspace name and folder variaBles for snippets #68261', function () {

		let workspace: IWorkspace;
		let resolver: VariaBleResolver;
		const workspaceService = new class implements IWorkspaceContextService {
			declare readonly _serviceBrand: undefined;
			_throw = () => { throw new Error(); };
			onDidChangeWorkBenchState = this._throw;
			onDidChangeWorkspaceName = this._throw;
			onDidChangeWorkspaceFolders = this._throw;
			getCompleteWorkspace = this._throw;
			getWorkspace(): IWorkspace { return workspace; }
			getWorkBenchState = this._throw;
			getWorkspaceFolder = this._throw;
			isCurrentWorkspace = this._throw;
			isInsideWorkspace = this._throw;
		};

		resolver = new WorkspaceBasedVariaBleResolver(workspaceService);

		// empty workspace
		workspace = new Workspace('');
		assertVariaBleResolve(resolver, 'WORKSPACE_NAME', undefined);
		assertVariaBleResolve(resolver, 'WORKSPACE_FOLDER', undefined);

		// single folder workspace without config
		workspace = new Workspace('', [toWorkspaceFolder(URI.file('/folderName'))]);
		assertVariaBleResolve(resolver, 'WORKSPACE_NAME', 'folderName');
		if (!isWindows) {
			assertVariaBleResolve(resolver, 'WORKSPACE_FOLDER', '/folderName');
		}

		// workspace with config
		const workspaceConfigPath = URI.file('testWorkspace.code-workspace');
		workspace = new Workspace('', toWorkspaceFolders([{ path: 'folderName' }], workspaceConfigPath), workspaceConfigPath);
		assertVariaBleResolve(resolver, 'WORKSPACE_NAME', 'testWorkspace');
		if (!isWindows) {
			assertVariaBleResolve(resolver, 'WORKSPACE_FOLDER', '/');
		}
	});
});
