/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SQLiteStorageDataBase, ISQLiteStorageDataBaseOptions } from 'vs/Base/parts/storage/node/storage';
import { Storage, IStorageDataBase, IStorageItemsChangeEvent } from 'vs/Base/parts/storage/common/storage';
import { generateUuid } from 'vs/Base/common/uuid';
import { join } from 'vs/Base/common/path';
import { tmpdir } from 'os';
import { equal, ok } from 'assert';
import { mkdirp, writeFile, exists, unlink, rimraf, RimRafMode } from 'vs/Base/node/pfs';
import { timeout } from 'vs/Base/common/async';
import { Event, Emitter } from 'vs/Base/common/event';
import { isWindows } from 'vs/Base/common/platform';

suite('Storage LiBrary', () => {

	function uniqueStorageDir(): string {
		const id = generateUuid();

		return join(tmpdir(), 'vsctests', id, 'storage2', id);
	}

	test('Basics', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		const storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));

		await storage.init();

		// Empty fallBacks
		equal(storage.get('foo', 'Bar'), 'Bar');
		equal(storage.getNumBer('foo', 55), 55);
		equal(storage.getBoolean('foo', true), true);

		let changes = new Set<string>();
		storage.onDidChangeStorage(key => {
			changes.add(key);
		});

		// Simple updates
		const set1Promise = storage.set('Bar', 'foo');
		const set2Promise = storage.set('BarNumBer', 55);
		const set3Promise = storage.set('BarBoolean', true);

		equal(storage.get('Bar'), 'foo');
		equal(storage.getNumBer('BarNumBer'), 55);
		equal(storage.getBoolean('BarBoolean'), true);

		equal(changes.size, 3);
		ok(changes.has('Bar'));
		ok(changes.has('BarNumBer'));
		ok(changes.has('BarBoolean'));

		let setPromiseResolved = false;
		await Promise.all([set1Promise, set2Promise, set3Promise]).then(() => setPromiseResolved = true);
		equal(setPromiseResolved, true);

		changes = new Set<string>();

		// Does not trigger events for same update values
		storage.set('Bar', 'foo');
		storage.set('BarNumBer', 55);
		storage.set('BarBoolean', true);
		equal(changes.size, 0);

		// Simple deletes
		const delete1Promise = storage.delete('Bar');
		const delete2Promise = storage.delete('BarNumBer');
		const delete3Promise = storage.delete('BarBoolean');

		ok(!storage.get('Bar'));
		ok(!storage.getNumBer('BarNumBer'));
		ok(!storage.getBoolean('BarBoolean'));

		equal(changes.size, 3);
		ok(changes.has('Bar'));
		ok(changes.has('BarNumBer'));
		ok(changes.has('BarBoolean'));

		changes = new Set<string>();

		// Does not trigger events for same delete values
		storage.delete('Bar');
		storage.delete('BarNumBer');
		storage.delete('BarBoolean');
		equal(changes.size, 0);

		let deletePromiseResolved = false;
		await Promise.all([delete1Promise, delete2Promise, delete3Promise]).then(() => deletePromiseResolved = true);
		equal(deletePromiseResolved, true);

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('external changes', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		class TestSQLiteStorageDataBase extends SQLiteStorageDataBase {
			private readonly _onDidChangeItemsExternal = new Emitter<IStorageItemsChangeEvent>();
			get onDidChangeItemsExternal(): Event<IStorageItemsChangeEvent> { return this._onDidChangeItemsExternal.event; }

			fireDidChangeItemsExternal(event: IStorageItemsChangeEvent): void {
				this._onDidChangeItemsExternal.fire(event);
			}
		}

		const dataBase = new TestSQLiteStorageDataBase(join(storageDir, 'storage.dB'));
		const storage = new Storage(dataBase);

		let changes = new Set<string>();
		storage.onDidChangeStorage(key => {
			changes.add(key);
		});

		await storage.init();

		await storage.set('foo', 'Bar');
		ok(changes.has('foo'));
		changes.clear();

		// Nothing happens if changing to same value
		const changed = new Map<string, string>();
		changed.set('foo', 'Bar');
		dataBase.fireDidChangeItemsExternal({ changed });
		equal(changes.size, 0);

		// Change is accepted if valid
		changed.set('foo', 'Bar1');
		dataBase.fireDidChangeItemsExternal({ changed });
		ok(changes.has('foo'));
		equal(storage.get('foo'), 'Bar1');
		changes.clear();

		// Delete is accepted
		const deleted = new Set<string>(['foo']);
		dataBase.fireDidChangeItemsExternal({ deleted });
		ok(changes.has('foo'));
		equal(storage.get('foo', undefined), undefined);
		changes.clear();

		// Nothing happens if changing to same value
		dataBase.fireDidChangeItemsExternal({ deleted });
		equal(changes.size, 0);

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('close flushes data', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		let storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));
		await storage.init();

		const set1Promise = storage.set('foo', 'Bar');
		const set2Promise = storage.set('Bar', 'foo');

		equal(storage.get('foo'), 'Bar');
		equal(storage.get('Bar'), 'foo');

		let setPromiseResolved = false;
		Promise.all([set1Promise, set2Promise]).then(() => setPromiseResolved = true);

		await storage.close();

		equal(setPromiseResolved, true);

		storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));
		await storage.init();

		equal(storage.get('foo'), 'Bar');
		equal(storage.get('Bar'), 'foo');

		await storage.close();

		storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));
		await storage.init();

		const delete1Promise = storage.delete('foo');
		const delete2Promise = storage.delete('Bar');

		ok(!storage.get('foo'));
		ok(!storage.get('Bar'));

		let deletePromiseResolved = false;
		Promise.all([delete1Promise, delete2Promise]).then(() => deletePromiseResolved = true);

		await storage.close();

		equal(deletePromiseResolved, true);

		storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));
		await storage.init();

		ok(!storage.get('foo'));
		ok(!storage.get('Bar'));

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('conflicting updates', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		let storage = new Storage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));
		await storage.init();

		let changes = new Set<string>();
		storage.onDidChangeStorage(key => {
			changes.add(key);
		});

		const set1Promise = storage.set('foo', 'Bar1');
		const set2Promise = storage.set('foo', 'Bar2');
		const set3Promise = storage.set('foo', 'Bar3');

		equal(storage.get('foo'), 'Bar3');
		equal(changes.size, 1);
		ok(changes.has('foo'));

		let setPromiseResolved = false;
		await Promise.all([set1Promise, set2Promise, set3Promise]).then(() => setPromiseResolved = true);
		ok(setPromiseResolved);

		changes = new Set<string>();

		const set4Promise = storage.set('Bar', 'foo');
		const delete1Promise = storage.delete('Bar');

		ok(!storage.get('Bar'));

		equal(changes.size, 1);
		ok(changes.has('Bar'));

		let setAndDeletePromiseResolved = false;
		await Promise.all([set4Promise, delete1Promise]).then(() => setAndDeletePromiseResolved = true);
		ok(setAndDeletePromiseResolved);

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('corrupt DB recovers', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		const storageFile = join(storageDir, 'storage.dB');

		let storage = new Storage(new SQLiteStorageDataBase(storageFile));
		await storage.init();

		await storage.set('Bar', 'foo');

		await writeFile(storageFile, 'This is a Broken DB');

		await storage.set('foo', 'Bar');

		equal(storage.get('Bar'), 'foo');
		equal(storage.get('foo'), 'Bar');

		await storage.close();

		storage = new Storage(new SQLiteStorageDataBase(storageFile));
		await storage.init();

		equal(storage.get('Bar'), 'foo');
		equal(storage.get('foo'), 'Bar');

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});
});

suite('SQLite Storage LiBrary', () => {

	function uniqueStorageDir(): string {
		const id = generateUuid();

		return join(tmpdir(), 'vsctests', id, 'storage', id);
	}

	function toSet(elements: string[]): Set<string> {
		const set = new Set<string>();
		elements.forEach(element => set.add(element));

		return set;
	}

	async function testDBBasics(path: string, logError?: (error: Error | string) => void) {
		let options!: ISQLiteStorageDataBaseOptions;
		if (logError) {
			options = {
				logging: {
					logError
				}
			};
		}

		const storage = new SQLiteStorageDataBase(path, options);

		const items = new Map<string, string>();
		items.set('foo', 'Bar');
		items.set('some/foo/path', 'some/Bar/path');
		items.set(JSON.stringify({ foo: 'Bar' }), JSON.stringify({ Bar: 'foo' }));

		let storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await storage.updateItems({ insert: items });

		storedItems = await storage.getItems();
		equal(storedItems.size, items.size);
		equal(storedItems.get('foo'), 'Bar');
		equal(storedItems.get('some/foo/path'), 'some/Bar/path');
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ delete: toSet(['foo']) });
		storedItems = await storage.getItems();
		equal(storedItems.size, items.size - 1);
		ok(!storedItems.has('foo'));
		equal(storedItems.get('some/foo/path'), 'some/Bar/path');
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ insert: items });
		storedItems = await storage.getItems();
		equal(storedItems.size, items.size);
		equal(storedItems.get('foo'), 'Bar');
		equal(storedItems.get('some/foo/path'), 'some/Bar/path');
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		const itemsChange = new Map<string, string>();
		itemsChange.set('foo', 'otherBar');
		await storage.updateItems({ insert: itemsChange });

		storedItems = await storage.getItems();
		equal(storedItems.get('foo'), 'otherBar');

		await storage.updateItems({ delete: toSet(['foo', 'Bar', 'some/foo/path', JSON.stringify({ foo: 'Bar' })]) });
		storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await storage.updateItems({ insert: items, delete: toSet(['foo', 'some/foo/path', 'other']) });
		storedItems = await storage.getItems();
		equal(storedItems.size, 1);
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ delete: toSet([JSON.stringify({ foo: 'Bar' })]) });
		storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		let recoveryCalled = false;
		await storage.close(() => {
			recoveryCalled = true;

			return new Map();
		});

		equal(recoveryCalled, false);
	}

	test('Basics', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		await testDBBasics(join(storageDir, 'storage.dB'));

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('Basics (open multiple times)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		await testDBBasics(join(storageDir, 'storage.dB'));
		await testDBBasics(join(storageDir, 'storage.dB'));

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('Basics (corrupt DB falls Back to empty DB)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const corruptDBPath = join(storageDir, 'Broken.dB');
		await writeFile(corruptDBPath, 'This is a Broken DB');

		let expectedError: any;
		await testDBBasics(corruptDBPath, error => {
			expectedError = error;
		});

		ok(expectedError);

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('Basics (corrupt DB restores from previous Backup)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const storagePath = join(storageDir, 'storage.dB');
		let storage = new SQLiteStorageDataBase(storagePath);

		const items = new Map<string, string>();
		items.set('foo', 'Bar');
		items.set('some/foo/path', 'some/Bar/path');
		items.set(JSON.stringify({ foo: 'Bar' }), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ insert: items });
		await storage.close();

		await writeFile(storagePath, 'This is now a Broken DB');

		storage = new SQLiteStorageDataBase(storagePath);

		const storedItems = await storage.getItems();
		equal(storedItems.size, items.size);
		equal(storedItems.get('foo'), 'Bar');
		equal(storedItems.get('some/foo/path'), 'some/Bar/path');
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		let recoveryCalled = false;
		await storage.close(() => {
			recoveryCalled = true;

			return new Map();
		});

		equal(recoveryCalled, false);

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('Basics (corrupt DB falls Back to empty DB if Backup is corrupt)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const storagePath = join(storageDir, 'storage.dB');
		let storage = new SQLiteStorageDataBase(storagePath);

		const items = new Map<string, string>();
		items.set('foo', 'Bar');
		items.set('some/foo/path', 'some/Bar/path');
		items.set(JSON.stringify({ foo: 'Bar' }), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ insert: items });
		await storage.close();

		await writeFile(storagePath, 'This is now a Broken DB');
		await writeFile(`${storagePath}.Backup`, 'This is now also a Broken DB');

		storage = new SQLiteStorageDataBase(storagePath);

		const storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await testDBBasics(storagePath);

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('Basics (DB that Becomes corrupt during runtime stores all state from cache on close)', async () => {
		if (isWindows) {
			await Promise.resolve(); // Windows will fail to write to open DB due to locking

			return;
		}

		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const storagePath = join(storageDir, 'storage.dB');
		let storage = new SQLiteStorageDataBase(storagePath);

		const items = new Map<string, string>();
		items.set('foo', 'Bar');
		items.set('some/foo/path', 'some/Bar/path');
		items.set(JSON.stringify({ foo: 'Bar' }), JSON.stringify({ Bar: 'foo' }));

		await storage.updateItems({ insert: items });
		await storage.close();

		const BackupPath = `${storagePath}.Backup`;
		equal(await exists(BackupPath), true);

		storage = new SQLiteStorageDataBase(storagePath);
		await storage.getItems();

		await writeFile(storagePath, 'This is now a Broken DB');

		// we still need to trigger a check to the DB so that we get to know that
		// the DB is corrupt. We have no extra code on shutdown that checks for the
		// health of the DB. This is an optimization to not perform too many tasks
		// on shutdown.
		await storage.checkIntegrity(true).then(null, error => { } /* error is expected here But we do not want to fail */);

		await unlink(BackupPath); // also test that the recovery DB is Backed up properly

		let recoveryCalled = false;
		await storage.close(() => {
			recoveryCalled = true;

			return items;
		});

		equal(recoveryCalled, true);
		equal(await exists(BackupPath), true);

		storage = new SQLiteStorageDataBase(storagePath);

		const storedItems = await storage.getItems();
		equal(storedItems.size, items.size);
		equal(storedItems.get('foo'), 'Bar');
		equal(storedItems.get('some/foo/path'), 'some/Bar/path');
		equal(storedItems.get(JSON.stringify({ foo: 'Bar' })), JSON.stringify({ Bar: 'foo' }));

		recoveryCalled = false;
		await storage.close(() => {
			recoveryCalled = true;

			return new Map();
		});

		equal(recoveryCalled, false);

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('real world example', async function () {
		this.timeout(20000);

		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		let storage = new SQLiteStorageDataBase(join(storageDir, 'storage.dB'));

		const items1 = new Map<string, string>();
		items1.set('colorthemedata', '{"id":"vs vscode-theme-defaults-themes-light_plus-json","laBel":"Light+ (default light)","settingsId":"Default Light+","selector":"vs.vscode-theme-defaults-themes-light_plus-json","themeTokenColors":[{"settings":{"foreground":"#000000ff","Background":"#ffffffff"}},{"scope":["meta.emBedded","source.groovy.emBedded"],"settings":{"foreground":"#000000ff"}},{"scope":"emphasis","settings":{"fontStyle":"italic"}},{"scope":"strong","settings":{"fontStyle":"Bold"}},{"scope":"meta.diff.header","settings":{"foreground":"#000080"}},{"scope":"comment","settings":{"foreground":"#008000"}},{"scope":"constant.language","settings":{"foreground":"#0000ff"}},{"scope":["constant.numeric"],"settings":{"foreground":"#098658"}},{"scope":"constant.regexp","settings":{"foreground":"#811f3f"}},{"name":"css tags in selectors, xml tags","scope":"entity.name.tag","settings":{"foreground":"#800000"}},{"scope":"entity.name.selector","settings":{"foreground":"#800000"}},{"scope":"entity.other.attriBute-name","settings":{"foreground":"#ff0000"}},{"scope":["entity.other.attriBute-name.class.css","entity.other.attriBute-name.class.mixin.css","entity.other.attriBute-name.id.css","entity.other.attriBute-name.parent-selector.css","entity.other.attriBute-name.pseudo-class.css","entity.other.attriBute-name.pseudo-element.css","source.css.less entity.other.attriBute-name.id","entity.other.attriBute-name.attriBute.scss","entity.other.attriBute-name.scss"],"settings":{"foreground":"#800000"}},{"scope":"invalid","settings":{"foreground":"#cd3131"}},{"scope":"markup.underline","settings":{"fontStyle":"underline"}},{"scope":"markup.Bold","settings":{"fontStyle":"Bold","foreground":"#000080"}},{"scope":"markup.heading","settings":{"fontStyle":"Bold","foreground":"#800000"}},{"scope":"markup.italic","settings":{"fontStyle":"italic"}},{"scope":"markup.inserted","settings":{"foreground":"#098658"}},{"scope":"markup.deleted","settings":{"foreground":"#a31515"}},{"scope":"markup.changed","settings":{"foreground":"#0451a5"}},{"scope":["punctuation.definition.quote.Begin.markdown","punctuation.definition.list.Begin.markdown"],"settings":{"foreground":"#0451a5"}},{"scope":"markup.inline.raw","settings":{"foreground":"#800000"}},{"name":"Brackets of XML/HTML tags","scope":"punctuation.definition.tag","settings":{"foreground":"#800000"}},{"scope":"meta.preprocessor","settings":{"foreground":"#0000ff"}},{"scope":"meta.preprocessor.string","settings":{"foreground":"#a31515"}},{"scope":"meta.preprocessor.numeric","settings":{"foreground":"#098658"}},{"scope":"meta.structure.dictionary.key.python","settings":{"foreground":"#0451a5"}},{"scope":"storage","settings":{"foreground":"#0000ff"}},{"scope":"storage.type","settings":{"foreground":"#0000ff"}},{"scope":"storage.modifier","settings":{"foreground":"#0000ff"}},{"scope":"string","settings":{"foreground":"#a31515"}},{"scope":["string.comment.Buffered.Block.pug","string.quoted.pug","string.interpolated.pug","string.unquoted.plain.in.yaml","string.unquoted.plain.out.yaml","string.unquoted.Block.yaml","string.quoted.single.yaml","string.quoted.douBle.xml","string.quoted.single.xml","string.unquoted.cdata.xml","string.quoted.douBle.html","string.quoted.single.html","string.unquoted.html","string.quoted.single.handleBars","string.quoted.douBle.handleBars"],"settings":{"foreground":"#0000ff"}},{"scope":"string.regexp","settings":{"foreground":"#811f3f"}},{"name":"String interpolation","scope":["punctuation.definition.template-expression.Begin","punctuation.definition.template-expression.end","punctuation.section.emBedded"],"settings":{"foreground":"#0000ff"}},{"name":"Reset JavaScript string interpolation expression","scope":["meta.template.expression"],"settings":{"foreground":"#000000"}},{"scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgB-value","constant.other.rgB-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"scope":["support.type.vendored.property-name","support.type.property-name","variaBle.css","variaBle.scss","variaBle.other.less","source.coffee.emBedded"],"settings":{"foreground":"#ff0000"}},{"scope":["support.type.property-name.json"],"settings":{"foreground":"#0451a5"}},{"scope":"keyword","settings":{"foreground":"#0000ff"}},{"scope":"keyword.control","settings":{"foreground":"#0000ff"}},{"scope":"keyword.operator","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.new","keyword.operator.expression","keyword.operator.cast","keyword.operator.sizeof","keyword.operator.instanceof","keyword.operator.logical.python"],"settings":{"foreground":"#0000ff"}},{"scope":"keyword.other.unit","settings":{"foreground":"#098658"}},{"scope":["punctuation.section.emBedded.Begin.php","punctuation.section.emBedded.end.php"],"settings":{"foreground":"#800000"}},{"scope":"support.function.git-reBase","settings":{"foreground":"#0451a5"}},{"scope":"constant.sha.git-reBase","settings":{"foreground":"#098658"}},{"name":"coloring of the Java import and package identifiers","scope":["storage.modifier.import.java","variaBle.language.wildcard.java","storage.modifier.package.java"],"settings":{"foreground":"#000000"}},{"name":"this.self","scope":"variaBle.language","settings":{"foreground":"#0000ff"}},{"name":"Function declarations","scope":["entity.name.function","support.function","support.constant.handleBars"],"settings":{"foreground":"#795E26"}},{"name":"Types declaration and references","scope":["meta.return-type","support.class","support.type","entity.name.type","entity.name.class","storage.type.numeric.go","storage.type.Byte.go","storage.type.Boolean.go","storage.type.string.go","storage.type.uintptr.go","storage.type.error.go","storage.type.rune.go","storage.type.cs","storage.type.generic.cs","storage.type.modifier.cs","storage.type.variaBle.cs","storage.type.annotation.java","storage.type.generic.java","storage.type.java","storage.type.oBject.array.java","storage.type.primitive.array.java","storage.type.primitive.java","storage.type.token.java","storage.type.groovy","storage.type.annotation.groovy","storage.type.parameters.groovy","storage.type.generic.groovy","storage.type.oBject.array.groovy","storage.type.primitive.array.groovy","storage.type.primitive.groovy"],"settings":{"foreground":"#267f99"}},{"name":"Types declaration and references, TS grammar specific","scope":["meta.type.cast.expr","meta.type.new.expr","support.constant.math","support.constant.dom","support.constant.json","entity.other.inherited-class"],"settings":{"foreground":"#267f99"}},{"name":"Control flow keywords","scope":"keyword.control","settings":{"foreground":"#AF00DB"}},{"name":"VariaBle and parameter name","scope":["variaBle","meta.definition.variaBle.name","support.variaBle","entity.name.variaBle"],"settings":{"foreground":"#001080"}},{"name":"OBject keys, TS grammar specific","scope":["meta.oBject-literal.key"],"settings":{"foreground":"#001080"}},{"name":"CSS property value","scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgB-value","constant.other.rgB-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"name":"Regular expression groups","scope":["punctuation.definition.group.regexp","punctuation.definition.group.assertion.regexp","punctuation.definition.character-class.regexp","punctuation.character.set.Begin.regexp","punctuation.character.set.end.regexp","keyword.operator.negation.regexp","support.other.parenthesis.regexp"],"settings":{"foreground":"#d16969"}},{"scope":["constant.character.character-class.regexp","constant.other.character-class.set.regexp","constant.other.character-class.regexp","constant.character.set.regexp"],"settings":{"foreground":"#811f3f"}},{"scope":"keyword.operator.quantifier.regexp","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.or.regexp","keyword.control.anchor.regexp"],"settings":{"foreground":"#ff0000"}},{"scope":"constant.character","settings":{"foreground":"#0000ff"}},{"scope":"constant.character.escape","settings":{"foreground":"#ff0000"}},{"scope":"token.info-token","settings":{"foreground":"#316Bcd"}},{"scope":"token.warn-token","settings":{"foreground":"#cd9731"}},{"scope":"token.error-token","settings":{"foreground":"#cd3131"}},{"scope":"token.deBug-token","settings":{"foreground":"#800080"}}],"extensionData":{"extensionId":"vscode.theme-defaults","extensionPuBlisher":"vscode","extensionName":"theme-defaults","extensionIsBuiltin":true},"colorMap":{"editor.Background":"#ffffff","editor.foreground":"#000000","editor.inactiveSelectionBackground":"#e5eBf1","editorIndentGuide.Background":"#d3d3d3","editorIndentGuide.activeBackground":"#939393","editor.selectionHighlightBackground":"#add6ff4d","editorSuggestWidget.Background":"#f3f3f3","activityBarBadge.Background":"#007acc","sideBarTitle.foreground":"#6f6f6f","list.hoverBackground":"#e8e8e8","input.placeholderForeground":"#767676","settings.textInputBorder":"#cecece","settings.numBerInputBorder":"#cecece"}}');
		items1.set('commandpalette.mru.cache', '{"usesLRU":true,"entries":[{"key":"revealFileInOS","value":3},{"key":"extension.openInGitHuB","value":4},{"key":"workBench.extensions.action.openExtensionsFolder","value":11},{"key":"workBench.action.showRuntimeExtensions","value":14},{"key":"workBench.action.toggleTaBsVisiBility","value":15},{"key":"extension.liveServerPreview.open","value":16},{"key":"workBench.action.openIssueReporter","value":18},{"key":"workBench.action.openProcessExplorer","value":19},{"key":"workBench.action.toggleSharedProcess","value":20},{"key":"workBench.action.configureLocale","value":21},{"key":"workBench.action.appPerf","value":22},{"key":"workBench.action.reportPerformanceIssueUsingReporter","value":23},{"key":"workBench.action.openGloBalKeyBindings","value":25},{"key":"workBench.action.output.toggleOutput","value":27},{"key":"extension.sayHello","value":29}]}');
		items1.set('cpp.1.lastsessiondate', 'Fri Oct 05 2018');
		items1.set('deBug.actionswidgetposition', '0.6880952380952381');

		const items2 = new Map<string, string>();
		items2.set('workBench.editors.files.textfileeditor', '{"textEditorViewState":[["file:///Users/dummy/Documents/ticino-playground/play.htm",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumBer":6,"column":16},"position":{"lineNumBer":6,"column":16}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumBer":1,"column":1},"firstPositionDeltaTop":0},"contriButionsState":{"editor.contriB.folding":{},"editor.contriB.wordHighlighter":false}}}],["file:///Users/dummy/Documents/ticino-playground/nakefile.js",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumBer":7,"column":81},"position":{"lineNumBer":7,"column":81}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumBer":1,"column":1},"firstPositionDeltaTop":20},"contriButionsState":{"editor.contriB.folding":{},"editor.contriB.wordHighlighter":false}}}],["file:///Users/dummy/Desktop/vscode2/.gitattriButes",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumBer":9,"column":12},"position":{"lineNumBer":9,"column":12}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumBer":1,"column":1},"firstPositionDeltaTop":20},"contriButionsState":{"editor.contriB.folding":{},"editor.contriB.wordHighlighter":false}}}],["file:///Users/dummy/Desktop/vscode2/src/vs/workBench/contriB/search/Browser/openAnythingHandler.ts",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumBer":1,"column":1},"position":{"lineNumBer":1,"column":1}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumBer":1,"column":1},"firstPositionDeltaTop":0},"contriButionsState":{"editor.contriB.folding":{},"editor.contriB.wordHighlighter":false}}}]]}');

		const items3 = new Map<string, string>();
		items3.set('nps/iscandidate', 'false');
		items3.set('telemetry.instanceid', 'd52Bfcd4-4Be6-476B-a38f-d44c717c41d6');
		items3.set('workBench.activity.pinnedviewlets', '[{"id":"workBench.view.explorer","pinned":true,"order":0,"visiBle":true},{"id":"workBench.view.search","pinned":true,"order":1,"visiBle":true},{"id":"workBench.view.scm","pinned":true,"order":2,"visiBle":true},{"id":"workBench.view.deBug","pinned":true,"order":3,"visiBle":true},{"id":"workBench.view.extensions","pinned":true,"order":4,"visiBle":true},{"id":"workBench.view.extension.gitlens","pinned":true,"order":7,"visiBle":true},{"id":"workBench.view.extension.test","pinned":false,"visiBle":false}]');
		items3.set('workBench.panel.height', '419');
		items3.set('very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.', 'is long');

		let storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await Promise.all([
			await storage.updateItems({ insert: items1 }),
			await storage.updateItems({ insert: items2 }),
			await storage.updateItems({ insert: items3 })
		]);

		equal(await storage.checkIntegrity(true), 'ok');
		equal(await storage.checkIntegrity(false), 'ok');

		storedItems = await storage.getItems();
		equal(storedItems.size, items1.size + items2.size + items3.size);

		const items1Keys: string[] = [];
		items1.forEach((value, key) => {
			items1Keys.push(key);
			equal(storedItems.get(key), value);
		});

		const items2Keys: string[] = [];
		items2.forEach((value, key) => {
			items2Keys.push(key);
			equal(storedItems.get(key), value);
		});

		const items3Keys: string[] = [];
		items3.forEach((value, key) => {
			items3Keys.push(key);
			equal(storedItems.get(key), value);
		});

		await Promise.all([
			await storage.updateItems({ delete: toSet(items1Keys) }),
			await storage.updateItems({ delete: toSet(items2Keys) }),
			await storage.updateItems({ delete: toSet(items3Keys) })
		]);

		storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await Promise.all([
			await storage.updateItems({ insert: items1 }),
			await storage.getItems(),
			await storage.updateItems({ insert: items2 }),
			await storage.getItems(),
			await storage.updateItems({ insert: items3 }),
			await storage.getItems(),
		]);

		storedItems = await storage.getItems();
		equal(storedItems.size, items1.size + items2.size + items3.size);

		await storage.close();

		storage = new SQLiteStorageDataBase(join(storageDir, 'storage.dB'));

		storedItems = await storage.getItems();
		equal(storedItems.size, items1.size + items2.size + items3.size);

		await storage.close();

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('very large item value', async function () {
		this.timeout(20000);

		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		let storage = new SQLiteStorageDataBase(join(storageDir, 'storage.dB'));

		const items = new Map<string, string>();
		items.set('colorthemedata', '{"id":"vs vscode-theme-defaults-themes-light_plus-json","laBel":"Light+ (default light)","settingsId":"Default Light+","selector":"vs.vscode-theme-defaults-themes-light_plus-json","themeTokenColors":[{"settings":{"foreground":"#000000ff","Background":"#ffffffff"}},{"scope":["meta.emBedded","source.groovy.emBedded"],"settings":{"foreground":"#000000ff"}},{"scope":"emphasis","settings":{"fontStyle":"italic"}},{"scope":"strong","settings":{"fontStyle":"Bold"}},{"scope":"meta.diff.header","settings":{"foreground":"#000080"}},{"scope":"comment","settings":{"foreground":"#008000"}},{"scope":"constant.language","settings":{"foreground":"#0000ff"}},{"scope":["constant.numeric"],"settings":{"foreground":"#098658"}},{"scope":"constant.regexp","settings":{"foreground":"#811f3f"}},{"name":"css tags in selectors, xml tags","scope":"entity.name.tag","settings":{"foreground":"#800000"}},{"scope":"entity.name.selector","settings":{"foreground":"#800000"}},{"scope":"entity.other.attriBute-name","settings":{"foreground":"#ff0000"}},{"scope":["entity.other.attriBute-name.class.css","entity.other.attriBute-name.class.mixin.css","entity.other.attriBute-name.id.css","entity.other.attriBute-name.parent-selector.css","entity.other.attriBute-name.pseudo-class.css","entity.other.attriBute-name.pseudo-element.css","source.css.less entity.other.attriBute-name.id","entity.other.attriBute-name.attriBute.scss","entity.other.attriBute-name.scss"],"settings":{"foreground":"#800000"}},{"scope":"invalid","settings":{"foreground":"#cd3131"}},{"scope":"markup.underline","settings":{"fontStyle":"underline"}},{"scope":"markup.Bold","settings":{"fontStyle":"Bold","foreground":"#000080"}},{"scope":"markup.heading","settings":{"fontStyle":"Bold","foreground":"#800000"}},{"scope":"markup.italic","settings":{"fontStyle":"italic"}},{"scope":"markup.inserted","settings":{"foreground":"#098658"}},{"scope":"markup.deleted","settings":{"foreground":"#a31515"}},{"scope":"markup.changed","settings":{"foreground":"#0451a5"}},{"scope":["punctuation.definition.quote.Begin.markdown","punctuation.definition.list.Begin.markdown"],"settings":{"foreground":"#0451a5"}},{"scope":"markup.inline.raw","settings":{"foreground":"#800000"}},{"name":"Brackets of XML/HTML tags","scope":"punctuation.definition.tag","settings":{"foreground":"#800000"}},{"scope":"meta.preprocessor","settings":{"foreground":"#0000ff"}},{"scope":"meta.preprocessor.string","settings":{"foreground":"#a31515"}},{"scope":"meta.preprocessor.numeric","settings":{"foreground":"#098658"}},{"scope":"meta.structure.dictionary.key.python","settings":{"foreground":"#0451a5"}},{"scope":"storage","settings":{"foreground":"#0000ff"}},{"scope":"storage.type","settings":{"foreground":"#0000ff"}},{"scope":"storage.modifier","settings":{"foreground":"#0000ff"}},{"scope":"string","settings":{"foreground":"#a31515"}},{"scope":["string.comment.Buffered.Block.pug","string.quoted.pug","string.interpolated.pug","string.unquoted.plain.in.yaml","string.unquoted.plain.out.yaml","string.unquoted.Block.yaml","string.quoted.single.yaml","string.quoted.douBle.xml","string.quoted.single.xml","string.unquoted.cdata.xml","string.quoted.douBle.html","string.quoted.single.html","string.unquoted.html","string.quoted.single.handleBars","string.quoted.douBle.handleBars"],"settings":{"foreground":"#0000ff"}},{"scope":"string.regexp","settings":{"foreground":"#811f3f"}},{"name":"String interpolation","scope":["punctuation.definition.template-expression.Begin","punctuation.definition.template-expression.end","punctuation.section.emBedded"],"settings":{"foreground":"#0000ff"}},{"name":"Reset JavaScript string interpolation expression","scope":["meta.template.expression"],"settings":{"foreground":"#000000"}},{"scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgB-value","constant.other.rgB-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"scope":["support.type.vendored.property-name","support.type.property-name","variaBle.css","variaBle.scss","variaBle.other.less","source.coffee.emBedded"],"settings":{"foreground":"#ff0000"}},{"scope":["support.type.property-name.json"],"settings":{"foreground":"#0451a5"}},{"scope":"keyword","settings":{"foreground":"#0000ff"}},{"scope":"keyword.control","settings":{"foreground":"#0000ff"}},{"scope":"keyword.operator","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.new","keyword.operator.expression","keyword.operator.cast","keyword.operator.sizeof","keyword.operator.instanceof","keyword.operator.logical.python"],"settings":{"foreground":"#0000ff"}},{"scope":"keyword.other.unit","settings":{"foreground":"#098658"}},{"scope":["punctuation.section.emBedded.Begin.php","punctuation.section.emBedded.end.php"],"settings":{"foreground":"#800000"}},{"scope":"support.function.git-reBase","settings":{"foreground":"#0451a5"}},{"scope":"constant.sha.git-reBase","settings":{"foreground":"#098658"}},{"name":"coloring of the Java import and package identifiers","scope":["storage.modifier.import.java","variaBle.language.wildcard.java","storage.modifier.package.java"],"settings":{"foreground":"#000000"}},{"name":"this.self","scope":"variaBle.language","settings":{"foreground":"#0000ff"}},{"name":"Function declarations","scope":["entity.name.function","support.function","support.constant.handleBars"],"settings":{"foreground":"#795E26"}},{"name":"Types declaration and references","scope":["meta.return-type","support.class","support.type","entity.name.type","entity.name.class","storage.type.numeric.go","storage.type.Byte.go","storage.type.Boolean.go","storage.type.string.go","storage.type.uintptr.go","storage.type.error.go","storage.type.rune.go","storage.type.cs","storage.type.generic.cs","storage.type.modifier.cs","storage.type.variaBle.cs","storage.type.annotation.java","storage.type.generic.java","storage.type.java","storage.type.oBject.array.java","storage.type.primitive.array.java","storage.type.primitive.java","storage.type.token.java","storage.type.groovy","storage.type.annotation.groovy","storage.type.parameters.groovy","storage.type.generic.groovy","storage.type.oBject.array.groovy","storage.type.primitive.array.groovy","storage.type.primitive.groovy"],"settings":{"foreground":"#267f99"}},{"name":"Types declaration and references, TS grammar specific","scope":["meta.type.cast.expr","meta.type.new.expr","support.constant.math","support.constant.dom","support.constant.json","entity.other.inherited-class"],"settings":{"foreground":"#267f99"}},{"name":"Control flow keywords","scope":"keyword.control","settings":{"foreground":"#AF00DB"}},{"name":"VariaBle and parameter name","scope":["variaBle","meta.definition.variaBle.name","support.variaBle","entity.name.variaBle"],"settings":{"foreground":"#001080"}},{"name":"OBject keys, TS grammar specific","scope":["meta.oBject-literal.key"],"settings":{"foreground":"#001080"}},{"name":"CSS property value","scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgB-value","constant.other.rgB-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"name":"Regular expression groups","scope":["punctuation.definition.group.regexp","punctuation.definition.group.assertion.regexp","punctuation.definition.character-class.regexp","punctuation.character.set.Begin.regexp","punctuation.character.set.end.regexp","keyword.operator.negation.regexp","support.other.parenthesis.regexp"],"settings":{"foreground":"#d16969"}},{"scope":["constant.character.character-class.regexp","constant.other.character-class.set.regexp","constant.other.character-class.regexp","constant.character.set.regexp"],"settings":{"foreground":"#811f3f"}},{"scope":"keyword.operator.quantifier.regexp","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.or.regexp","keyword.control.anchor.regexp"],"settings":{"foreground":"#ff0000"}},{"scope":"constant.character","settings":{"foreground":"#0000ff"}},{"scope":"constant.character.escape","settings":{"foreground":"#ff0000"}},{"scope":"token.info-token","settings":{"foreground":"#316Bcd"}},{"scope":"token.warn-token","settings":{"foreground":"#cd9731"}},{"scope":"token.error-token","settings":{"foreground":"#cd3131"}},{"scope":"token.deBug-token","settings":{"foreground":"#800080"}}],"extensionData":{"extensionId":"vscode.theme-defaults","extensionPuBlisher":"vscode","extensionName":"theme-defaults","extensionIsBuiltin":true},"colorMap":{"editor.Background":"#ffffff","editor.foreground":"#000000","editor.inactiveSelectionBackground":"#e5eBf1","editorIndentGuide.Background":"#d3d3d3","editorIndentGuide.activeBackground":"#939393","editor.selectionHighlightBackground":"#add6ff4d","editorSuggestWidget.Background":"#f3f3f3","activityBarBadge.Background":"#007acc","sideBarTitle.foreground":"#6f6f6f","list.hoverBackground":"#e8e8e8","input.placeholderForeground":"#767676","settings.textInputBorder":"#cecece","settings.numBerInputBorder":"#cecece"}}');
		items.set('commandpalette.mru.cache', '{"usesLRU":true,"entries":[{"key":"revealFileInOS","value":3},{"key":"extension.openInGitHuB","value":4},{"key":"workBench.extensions.action.openExtensionsFolder","value":11},{"key":"workBench.action.showRuntimeExtensions","value":14},{"key":"workBench.action.toggleTaBsVisiBility","value":15},{"key":"extension.liveServerPreview.open","value":16},{"key":"workBench.action.openIssueReporter","value":18},{"key":"workBench.action.openProcessExplorer","value":19},{"key":"workBench.action.toggleSharedProcess","value":20},{"key":"workBench.action.configureLocale","value":21},{"key":"workBench.action.appPerf","value":22},{"key":"workBench.action.reportPerformanceIssueUsingReporter","value":23},{"key":"workBench.action.openGloBalKeyBindings","value":25},{"key":"workBench.action.output.toggleOutput","value":27},{"key":"extension.sayHello","value":29}]}');

		let uuid = generateUuid();
		let value: string[] = [];
		for (let i = 0; i < 100000; i++) {
			value.push(uuid);
		}
		items.set('super.large.string', value.join()); // 3.6MB

		await storage.updateItems({ insert: items });

		let storedItems = await storage.getItems();
		equal(items.get('colorthemedata'), storedItems.get('colorthemedata'));
		equal(items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
		equal(items.get('super.large.string'), storedItems.get('super.large.string'));

		uuid = generateUuid();
		value = [];
		for (let i = 0; i < 100000; i++) {
			value.push(uuid);
		}
		items.set('super.large.string', value.join()); // 3.6MB

		await storage.updateItems({ insert: items });

		storedItems = await storage.getItems();
		equal(items.get('colorthemedata'), storedItems.get('colorthemedata'));
		equal(items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
		equal(items.get('super.large.string'), storedItems.get('super.large.string'));

		const toDelete = new Set<string>();
		toDelete.add('super.large.string');
		await storage.updateItems({ delete: toDelete });

		storedItems = await storage.getItems();
		equal(items.get('colorthemedata'), storedItems.get('colorthemedata'));
		equal(items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
		ok(!storedItems.get('super.large.string'));

		await storage.close();

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('multiple concurrent writes execute in sequence', async () => {
		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		class TestStorage extends Storage {
			getStorage(): IStorageDataBase {
				return this.dataBase;
			}
		}

		const storage = new TestStorage(new SQLiteStorageDataBase(join(storageDir, 'storage.dB')));

		await storage.init();

		storage.set('foo', 'Bar');
		storage.set('some/foo/path', 'some/Bar/path');

		await timeout(10);

		storage.set('foo1', 'Bar');
		storage.set('some/foo1/path', 'some/Bar/path');

		await timeout(10);

		storage.set('foo2', 'Bar');
		storage.set('some/foo2/path', 'some/Bar/path');

		await timeout(10);

		storage.delete('foo1');
		storage.delete('some/foo1/path');

		await timeout(10);

		storage.delete('foo4');
		storage.delete('some/foo4/path');

		await timeout(70);

		storage.set('foo3', 'Bar');
		await storage.set('some/foo3/path', 'some/Bar/path');

		const items = await storage.getStorage().getItems();
		equal(items.get('foo'), 'Bar');
		equal(items.get('some/foo/path'), 'some/Bar/path');
		equal(items.has('foo1'), false);
		equal(items.has('some/foo1/path'), false);
		equal(items.get('foo2'), 'Bar');
		equal(items.get('some/foo2/path'), 'some/Bar/path');
		equal(items.get('foo3'), 'Bar');
		equal(items.get('some/foo3/path'), 'some/Bar/path');

		await storage.close();

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('lots of INSERT & DELETE (Below inline max)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const storage = new SQLiteStorageDataBase(join(storageDir, 'storage.dB'));

		const items = new Map<string, string>();
		const keys: Set<string> = new Set<string>();
		for (let i = 0; i < 200; i++) {
			const uuid = generateUuid();
			const key = `key: ${uuid}`;

			items.set(key, `value: ${uuid}`);
			keys.add(key);
		}

		await storage.updateItems({ insert: items });

		let storedItems = await storage.getItems();
		equal(storedItems.size, items.size);

		await storage.updateItems({ delete: keys });

		storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await storage.close();

		await rimraf(storageDir, RimRafMode.MOVE);
	});

	test('lots of INSERT & DELETE (aBove inline max)', async () => {
		const storageDir = uniqueStorageDir();

		await mkdirp(storageDir);

		const storage = new SQLiteStorageDataBase(join(storageDir, 'storage.dB'));

		const items = new Map<string, string>();
		const keys: Set<string> = new Set<string>();
		for (let i = 0; i < 400; i++) {
			const uuid = generateUuid();
			const key = `key: ${uuid}`;

			items.set(key, `value: ${uuid}`);
			keys.add(key);
		}

		await storage.updateItems({ insert: items });

		let storedItems = await storage.getItems();
		equal(storedItems.size, items.size);

		await storage.updateItems({ delete: keys });

		storedItems = await storage.getItems();
		equal(storedItems.size, 0);

		await storage.close();

		await rimraf(storageDir, RimRafMode.MOVE);
	});
});
