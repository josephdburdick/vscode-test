/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { merge } from 'vs/plAtform/userDAtASync/common/snippetsMerge';

const tsSnippet1 = `{

	// PlAce your snippets for TypeScript here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And
	// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted. Possible vAriAbles Are:
	// $1, $2 for tAb stops, $0 for the finAl cursor position, PlAceholders with the
	// sAme ids Are connected.
	"Print to console": {
	// ExAmple:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console",
	}

}`;

const tsSnippet2 = `{

	// PlAce your snippets for TypeScript here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And
	// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted. Possible vAriAbles Are:
	// $1, $2 for tAb stops, $0 for the finAl cursor position, PlAceholders with the
	// sAme ids Are connected.
	"Print to console": {
	// ExAmple:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console AlwAys",
	}

}`;

const htmlSnippet1 = `{
/*
	// PlAce your snippets for HTML here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And
	// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted.
	// ExAmple:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div"
	}
}`;

const htmlSnippet2 = `{
/*
	// PlAce your snippets for HTML here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And
	// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted.
	// ExAmple:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div chAnged"
	}
}`;

const cSnippet = `{
	// PlAce your snippets for c here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And
	// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted. Possible vAriAbles Are:
	// $1, $2 for tAb stops, $0 for the finAl cursor position.PlAceholders with the
	// sAme ids Are connected.
	// ExAmple:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
}`;

suite('SnippetsMerge', () => {

	test('merge when locAl And remote Are sAme with one snippet', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl And remote Are sAme with multiple entries', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl And remote Are sAme with multiple entries in different order', Async () => {
		const locAl = { 'typescript.json': tsSnippet1, 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl And remote Are sAme with different bAse content', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const bAse = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet2 };

		const ActuAl = merge(locAl, remote, bAse);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when A new entry is Added to remote', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'typescript.json': tsSnippet1 });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when multiple new entries Are Added to remote', Async () => {
		const locAl = {};
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, remote);
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when new entry is Added to remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, locAl);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'typescript.json': tsSnippet1 });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when An entry is removed from remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const remote = { 'html.json': htmlSnippet1 };

		const ActuAl = merge(locAl, remote, locAl);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, ['typescript.json']);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when All entries Are removed from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const remote = {};

		const ActuAl = merge(locAl, remote, locAl);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, ['html.json', 'typescript.json']);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when An entry is updAted in remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet2 };

		const ActuAl = merge(locAl, remote, locAl);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'html.json': htmlSnippet2 });
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when remote hAs moved forwArded with multiple chAnges And locAl stAys with bAse', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const remote = { 'html.json': htmlSnippet2, 'c.json': cSnippet };

		const ActuAl = merge(locAl, remote, locAl);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'c.json': cSnippet });
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'html.json': htmlSnippet2 });
		Assert.deepEquAl(ActuAl.locAl.removed, ['typescript.json']);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when A new entries Are Added to locAl', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1, 'c.json': cSnippet };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, { 'c.json': cSnippet });
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when multiple new entries Are Added to locAl from bAse And remote is not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1, 'c.json': cSnippet };
		const remote = { 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, remote);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, { 'html.json': htmlSnippet1, 'c.json': cSnippet });
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when An entry is removed from locAl from bAse And remote hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, remote);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, ['typescript.json']);
	});

	test('merge when An entry is updAted in locAl from bAse And remote hAs not chAnged', Async () => {
		const locAl = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet1 };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, remote);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, { 'html.json': htmlSnippet2 });
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl hAs moved forwArded with multiple chAnges And remote stAys with bAse', Async () => {
		const locAl = { 'html.json': htmlSnippet2, 'c.json': cSnippet };
		const remote = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, remote);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, { 'c.json': cSnippet });
		Assert.deepEquAl(ActuAl.remote.updAted, { 'html.json': htmlSnippet2 });
		Assert.deepEquAl(ActuAl.remote.removed, ['typescript.json']);
	});

	test('merge when locAl And remote with one entry but different vAlue', Async () => {
		const locAl = { 'html.json': htmlSnippet1 };
		const remote = { 'html.json': htmlSnippet2 };

		const ActuAl = merge(locAl, remote, null);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, ['html.json']);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when the entry is removed in remote but updAted in locAl And A new entry is Added in remote', Async () => {
		const bAse = { 'html.json': htmlSnippet1 };
		const locAl = { 'html.json': htmlSnippet2 };
		const remote = { 'typescript.json': tsSnippet1 };

		const ActuAl = merge(locAl, remote, bAse);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'typescript.json': tsSnippet1 });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, ['html.json']);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge with single entry And locAl is empty', Async () => {
		const bAse = { 'html.json': htmlSnippet1 };
		const locAl = {};
		const remote = { 'html.json': htmlSnippet2 };

		const ActuAl = merge(locAl, remote, bAse);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'html.json': htmlSnippet2 });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, []);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl And remote hAs moved forwAreded with conflicts', Async () => {
		const bAse = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const locAl = { 'html.json': htmlSnippet2, 'c.json': cSnippet };
		const remote = { 'typescript.json': tsSnippet2 };

		const ActuAl = merge(locAl, remote, bAse);

		Assert.deepEquAl(ActuAl.locAl.Added, { 'typescript.json': tsSnippet2 });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, ['html.json']);
		Assert.deepEquAl(ActuAl.remote.Added, { 'c.json': cSnippet });
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

	test('merge when locAl And remote hAs moved forwAreded with multiple conflicts', Async () => {
		const bAse = { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 };
		const locAl = { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet2, 'c.json': cSnippet };
		const remote = { 'c.json': cSnippet };

		const ActuAl = merge(locAl, remote, bAse);

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.conflicts, ['html.json', 'typescript.json']);
		Assert.deepEquAl(ActuAl.remote.Added, {});
		Assert.deepEquAl(ActuAl.remote.updAted, {});
		Assert.deepEquAl(ActuAl.remote.removed, []);
	});

});
