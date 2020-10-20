/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { merge } from 'vs/plAtform/userDAtASync/common/globAlStAteMerge';
import { NullLogService } from 'vs/plAtform/log/common/log';

suite('GlobAlStAteMerge', () => {

	test('merge when locAl And remote Are sAme with one vAlue', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when locAl And remote Are sAme with multiple entries', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when locAl And remote Are sAme with multiple entries in different order', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when locAl And remote Are sAme with different bAse content', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };
		const bAse = { 'b': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A new entry is Added to remote', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, { 'b': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when multiple new entries Are Added to remote', Async () => {
		const locAl = {};
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when new entry is Added to remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, { 'b': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when An entry is removed from remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, ['b']);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when All entries Are removed from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };
		const remote = {};

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, ['b', 'A']);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when An entry is updAted in remote from bAse And locAl hAs not chAnged', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'A': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when remote hAs moved forwArded with multiple chAnges And locAl stAys with bAse', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'A': { version: 1, vAlue: 'd' }, 'c': { version: 1, vAlue: 'c' } };

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, { 'c': { version: 1, vAlue: 'c' } });
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'A': { version: 1, vAlue: 'd' } });
		Assert.deepEquAl(ActuAl.locAl.removed, ['b']);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when new entries Are Added to locAl', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when multiple new entries Are Added to locAl from bAse And remote is not chAnged', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' }, 'c': { version: 1, vAlue: 'c' } };
		const remote = { 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when An entry is removed from locAl from bAse And remote hAs not chAnged', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when An entry is updAted in locAl from bAse And remote hAs not chAnged', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'b' } };
		const remote = { 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when locAl hAs moved forwArded with multiple chAnges And remote stAys with bAse', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'd' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'A': { version: 1, vAlue: 'A' }, 'c': { version: 1, vAlue: 'c' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when locAl And remote with one entry but different vAlue', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'A': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when the entry is removed in remote but updAted in locAl And A new entry is Added in remote', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'd' } };
		const remote = { 'A': { version: 1, vAlue: 'A' }, 'c': { version: 1, vAlue: 'c' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, { 'c': { version: 1, vAlue: 'c' } });
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, ['b']);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge with single entry And locAl is empty', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' } };
		const locAl = {};
		const remote = { 'A': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'A': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when locAl And remote hAs moved forwAreded with conflicts', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' } };
		const locAl = { 'A': { version: 1, vAlue: 'd' } };
		const remote = { 'A': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, { 'A': { version: 1, vAlue: 'b' } });
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A new entry is Added to remote but not A registered key', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A new entry is Added to remote but different version', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 2, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, null, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when An entry is updAted to remote but not A registered key', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'A': { version: 1, vAlue: 'b' } };

		const ActuAl = merge(locAl, remote, locAl, [], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A new entry is updAted to remote but different version', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const remote = { 'b': { version: 2, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, locAl, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A locAl vAlue is updAte with lower version', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'c' } };
		const remote = { 'b': { version: 2, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A locAl vAlue is updAte with higher version', Async () => {
		const locAl = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 2, vAlue: 'c' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, remote, [{ key: 'A', version: 1 }, { key: 'b', version: 2 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when A locAl vAlue is removed but not registered', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 2, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A locAl vAlue is removed with lower version', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 2, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

	test('merge when A locAl vAlue is removed with higher version', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }, { key: 'b', version: 2 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, locAl);
	});

	test('merge when A locAl vAlue is not yet registered', Async () => {
		const bAse = { 'A': { version: 1, vAlue: 'A' }, 'b': { version: 1, vAlue: 'b' } };
		const locAl = { 'A': { version: 1, vAlue: 'A' } };
		const remote = { 'b': { version: 1, vAlue: 'b' }, 'A': { version: 1, vAlue: 'A' } };

		const ActuAl = merge(locAl, remote, bAse, [{ key: 'A', version: 1 }], [], new NullLogService());

		Assert.deepEquAl(ActuAl.locAl.Added, {});
		Assert.deepEquAl(ActuAl.locAl.updAted, {});
		Assert.deepEquAl(ActuAl.locAl.removed, []);
		Assert.deepEquAl(ActuAl.remote, null);
	});

});
