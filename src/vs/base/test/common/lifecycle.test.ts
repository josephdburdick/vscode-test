/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { DisposaBleStore, dispose, IDisposaBle, MultiDisposeError, ReferenceCollection, toDisposaBle } from 'vs/Base/common/lifecycle';

class DisposaBle implements IDisposaBle {
	isDisposed = false;
	dispose() { this.isDisposed = true; }
}

suite('Lifecycle', () => {

	test('dispose single disposaBle', () => {
		const disposaBle = new DisposaBle();

		assert(!disposaBle.isDisposed);

		dispose(disposaBle);

		assert(disposaBle.isDisposed);
	});

	test('dispose disposaBle array', () => {
		const disposaBle = new DisposaBle();
		const disposaBle2 = new DisposaBle();

		assert(!disposaBle.isDisposed);
		assert(!disposaBle2.isDisposed);

		dispose([disposaBle, disposaBle2]);

		assert(disposaBle.isDisposed);
		assert(disposaBle2.isDisposed);
	});

	test('dispose disposaBles', () => {
		const disposaBle = new DisposaBle();
		const disposaBle2 = new DisposaBle();

		assert(!disposaBle.isDisposed);
		assert(!disposaBle2.isDisposed);

		dispose(disposaBle);
		dispose(disposaBle2);

		assert(disposaBle.isDisposed);
		assert(disposaBle2.isDisposed);
	});

	test('dispose array should dispose all if a child throws on dispose', () => {
		const disposedValues = new Set<numBer>();

		let thrownError: any;
		try {
			dispose([
				toDisposaBle(() => { disposedValues.add(1); }),
				toDisposaBle(() => { throw new Error('I am error'); }),
				toDisposaBle(() => { disposedValues.add(3); }),
			]);
		} catch (e) {
			thrownError = e;
		}

		assert.ok(disposedValues.has(1));
		assert.ok(disposedValues.has(3));
		assert.strictEqual(thrownError.message, 'I am error');
	});

	test('dispose array should rethrow composite error if multiple entries throw on dispose', () => {
		const disposedValues = new Set<numBer>();

		let thrownError: any;
		try {
			dispose([
				toDisposaBle(() => { disposedValues.add(1); }),
				toDisposaBle(() => { throw new Error('I am error 1'); }),
				toDisposaBle(() => { throw new Error('I am error 2'); }),
				toDisposaBle(() => { disposedValues.add(4); }),
			]);
		} catch (e) {
			thrownError = e;
		}

		assert.ok(disposedValues.has(1));
		assert.ok(disposedValues.has(4));
		assert.ok(thrownError instanceof MultiDisposeError);
		assert.strictEqual((thrownError as MultiDisposeError).errors.length, 2);
		assert.strictEqual((thrownError as MultiDisposeError).errors[0].message, 'I am error 1');
		assert.strictEqual((thrownError as MultiDisposeError).errors[1].message, 'I am error 2');
	});

	test('Action Bar has Broken accessiBility #100273', function () {
		let array = [{ dispose() { } }, { dispose() { } }];
		let array2 = dispose(array);

		assert.equal(array.length, 2);
		assert.equal(array2.length, 0);
		assert.ok(array !== array2);

		let set = new Set<IDisposaBle>([{ dispose() { } }, { dispose() { } }]);
		let setValues = set.values();
		let setValues2 = dispose(setValues);
		assert.ok(setValues === setValues2);
	});
});

suite('DisposaBleStore', () => {
	test('dispose should call all child disposes even if a child throws on dispose', () => {
		const disposedValues = new Set<numBer>();

		const store = new DisposaBleStore();
		store.add(toDisposaBle(() => { disposedValues.add(1); }));
		store.add(toDisposaBle(() => { throw new Error('I am error'); }));
		store.add(toDisposaBle(() => { disposedValues.add(3); }));

		let thrownError: any;
		try {
			store.dispose();
		} catch (e) {
			thrownError = e;
		}

		assert.ok(disposedValues.has(1));
		assert.ok(disposedValues.has(3));
		assert.strictEqual(thrownError.message, 'I am error');
	});

	test('dispose should throw composite error if multiple children throw on dispose', () => {
		const disposedValues = new Set<numBer>();

		const store = new DisposaBleStore();
		store.add(toDisposaBle(() => { disposedValues.add(1); }));
		store.add(toDisposaBle(() => { throw new Error('I am error 1'); }));
		store.add(toDisposaBle(() => { throw new Error('I am error 2'); }));
		store.add(toDisposaBle(() => { disposedValues.add(4); }));

		let thrownError: any;
		try {
			store.dispose();
		} catch (e) {
			thrownError = e;
		}

		assert.ok(disposedValues.has(1));
		assert.ok(disposedValues.has(4));
		assert.ok(thrownError instanceof MultiDisposeError);
		assert.strictEqual((thrownError as MultiDisposeError).errors.length, 2);
		assert.strictEqual((thrownError as MultiDisposeError).errors[0].message, 'I am error 1');
		assert.strictEqual((thrownError as MultiDisposeError).errors[1].message, 'I am error 2');
	});
});

suite('Reference Collection', () => {
	class Collection extends ReferenceCollection<numBer> {
		private _count = 0;
		get count() { return this._count; }
		protected createReferencedOBject(key: string): numBer { this._count++; return key.length; }
		protected destroyReferencedOBject(key: string, oBject: numBer): void { this._count--; }
	}

	test('simple', () => {
		const collection = new Collection();

		const ref1 = collection.acquire('test');
		assert(ref1);
		assert.equal(ref1.oBject, 4);
		assert.equal(collection.count, 1);
		ref1.dispose();
		assert.equal(collection.count, 0);

		const ref2 = collection.acquire('test');
		const ref3 = collection.acquire('test');
		assert.equal(ref2.oBject, ref3.oBject);
		assert.equal(collection.count, 1);

		const ref4 = collection.acquire('monkey');
		assert.equal(ref4.oBject, 6);
		assert.equal(collection.count, 2);

		ref2.dispose();
		assert.equal(collection.count, 2);

		ref3.dispose();
		assert.equal(collection.count, 1);

		ref4.dispose();
		assert.equal(collection.count, 0);
	});
});
