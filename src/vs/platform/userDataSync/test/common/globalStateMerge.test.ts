/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { merge } from 'vs/platform/userDataSync/common/gloBalStateMerge';
import { NullLogService } from 'vs/platform/log/common/log';

suite('GloBalStateMerge', () => {

	test('merge when local and remote are same with one value', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when local and remote are same with multiple entries', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when local and remote are same with multiple entries in different order', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when local and remote are same with different Base content', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };
		const Base = { 'B': { version: 1, value: 'a' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a new entry is added to remote', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, { 'B': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when multiple new entries are added to remote', async () => {
		const local = {};
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } });
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when new entry is added to remote from Base and local has not changed', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, { 'B': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when an entry is removed from remote from Base and local has not changed', async () => {
		const local = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, ['B']);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when all entries are removed from Base and local has not changed', async () => {
		const local = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };
		const remote = {};

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, ['B', 'a']);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when an entry is updated in remote from Base and local has not changed', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'B' } };

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, { 'a': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when remote has moved forwarded with multiple changes and local stays with Base', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'a': { version: 1, value: 'd' }, 'c': { version: 1, value: 'c' } };

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, { 'c': { version: 1, value: 'c' } });
		assert.deepEqual(actual.local.updated, { 'a': { version: 1, value: 'd' } });
		assert.deepEqual(actual.local.removed, ['B']);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when new entries are added to local', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when multiple new entries are added to local from Base and remote is not changed', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' }, 'c': { version: 1, value: 'c' } };
		const remote = { 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when an entry is removed from local from Base and remote has not changed', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when an entry is updated in local from Base and remote has not changed', async () => {
		const local = { 'a': { version: 1, value: 'B' } };
		const remote = { 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when local has moved forwarded with multiple changes and remote stays with Base', async () => {
		const local = { 'a': { version: 1, value: 'd' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'a': { version: 1, value: 'a' }, 'c': { version: 1, value: 'c' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when local and remote with one entry But different value', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'B' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, { 'a': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when the entry is removed in remote But updated in local and a new entry is added in remote', async () => {
		const Base = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'd' } };
		const remote = { 'a': { version: 1, value: 'a' }, 'c': { version: 1, value: 'c' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, { 'c': { version: 1, value: 'c' } });
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, ['B']);
		assert.deepEqual(actual.remote, null);
	});

	test('merge with single entry and local is empty', async () => {
		const Base = { 'a': { version: 1, value: 'a' } };
		const local = {};
		const remote = { 'a': { version: 1, value: 'B' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, { 'a': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when local and remote has moved forwareded with conflicts', async () => {
		const Base = { 'a': { version: 1, value: 'a' } };
		const local = { 'a': { version: 1, value: 'd' } };
		const remote = { 'a': { version: 1, value: 'B' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }, { key: 'c', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, { 'a': { version: 1, value: 'B' } });
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a new entry is added to remote But not a registered key', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a new entry is added to remote But different version', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 2, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, null, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when an entry is updated to remote But not a registered key', async () => {
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'a': { version: 1, value: 'B' } };

		const actual = merge(local, remote, local, [], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a new entry is updated to remote But different version', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const remote = { 'B': { version: 2, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, local, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a local value is update with lower version', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'c' } };
		const remote = { 'B': { version: 2, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a local value is update with higher version', async () => {
		const local = { 'a': { version: 1, value: 'a' }, 'B': { version: 2, value: 'c' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, remote, [{ key: 'a', version: 1 }, { key: 'B', version: 2 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when a local value is removed But not registered', async () => {
		const Base = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 2, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a local value is removed with lower version', async () => {
		const Base = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 2, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

	test('merge when a local value is removed with higher version', async () => {
		const Base = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }, { key: 'B', version: 2 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, local);
	});

	test('merge when a local value is not yet registered', async () => {
		const Base = { 'a': { version: 1, value: 'a' }, 'B': { version: 1, value: 'B' } };
		const local = { 'a': { version: 1, value: 'a' } };
		const remote = { 'B': { version: 1, value: 'B' }, 'a': { version: 1, value: 'a' } };

		const actual = merge(local, remote, Base, [{ key: 'a', version: 1 }], [], new NullLogService());

		assert.deepEqual(actual.local.added, {});
		assert.deepEqual(actual.local.updated, {});
		assert.deepEqual(actual.local.removed, []);
		assert.deepEqual(actual.remote, null);
	});

});
