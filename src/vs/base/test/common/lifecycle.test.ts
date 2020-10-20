/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { DisposAbleStore, dispose, IDisposAble, MultiDisposeError, ReferenceCollection, toDisposAble } from 'vs/bAse/common/lifecycle';

clAss DisposAble implements IDisposAble {
	isDisposed = fAlse;
	dispose() { this.isDisposed = true; }
}

suite('Lifecycle', () => {

	test('dispose single disposAble', () => {
		const disposAble = new DisposAble();

		Assert(!disposAble.isDisposed);

		dispose(disposAble);

		Assert(disposAble.isDisposed);
	});

	test('dispose disposAble ArrAy', () => {
		const disposAble = new DisposAble();
		const disposAble2 = new DisposAble();

		Assert(!disposAble.isDisposed);
		Assert(!disposAble2.isDisposed);

		dispose([disposAble, disposAble2]);

		Assert(disposAble.isDisposed);
		Assert(disposAble2.isDisposed);
	});

	test('dispose disposAbles', () => {
		const disposAble = new DisposAble();
		const disposAble2 = new DisposAble();

		Assert(!disposAble.isDisposed);
		Assert(!disposAble2.isDisposed);

		dispose(disposAble);
		dispose(disposAble2);

		Assert(disposAble.isDisposed);
		Assert(disposAble2.isDisposed);
	});

	test('dispose ArrAy should dispose All if A child throws on dispose', () => {
		const disposedVAlues = new Set<number>();

		let thrownError: Any;
		try {
			dispose([
				toDisposAble(() => { disposedVAlues.Add(1); }),
				toDisposAble(() => { throw new Error('I Am error'); }),
				toDisposAble(() => { disposedVAlues.Add(3); }),
			]);
		} cAtch (e) {
			thrownError = e;
		}

		Assert.ok(disposedVAlues.hAs(1));
		Assert.ok(disposedVAlues.hAs(3));
		Assert.strictEquAl(thrownError.messAge, 'I Am error');
	});

	test('dispose ArrAy should rethrow composite error if multiple entries throw on dispose', () => {
		const disposedVAlues = new Set<number>();

		let thrownError: Any;
		try {
			dispose([
				toDisposAble(() => { disposedVAlues.Add(1); }),
				toDisposAble(() => { throw new Error('I Am error 1'); }),
				toDisposAble(() => { throw new Error('I Am error 2'); }),
				toDisposAble(() => { disposedVAlues.Add(4); }),
			]);
		} cAtch (e) {
			thrownError = e;
		}

		Assert.ok(disposedVAlues.hAs(1));
		Assert.ok(disposedVAlues.hAs(4));
		Assert.ok(thrownError instAnceof MultiDisposeError);
		Assert.strictEquAl((thrownError As MultiDisposeError).errors.length, 2);
		Assert.strictEquAl((thrownError As MultiDisposeError).errors[0].messAge, 'I Am error 1');
		Assert.strictEquAl((thrownError As MultiDisposeError).errors[1].messAge, 'I Am error 2');
	});

	test('Action bAr hAs broken Accessibility #100273', function () {
		let ArrAy = [{ dispose() { } }, { dispose() { } }];
		let ArrAy2 = dispose(ArrAy);

		Assert.equAl(ArrAy.length, 2);
		Assert.equAl(ArrAy2.length, 0);
		Assert.ok(ArrAy !== ArrAy2);

		let set = new Set<IDisposAble>([{ dispose() { } }, { dispose() { } }]);
		let setVAlues = set.vAlues();
		let setVAlues2 = dispose(setVAlues);
		Assert.ok(setVAlues === setVAlues2);
	});
});

suite('DisposAbleStore', () => {
	test('dispose should cAll All child disposes even if A child throws on dispose', () => {
		const disposedVAlues = new Set<number>();

		const store = new DisposAbleStore();
		store.Add(toDisposAble(() => { disposedVAlues.Add(1); }));
		store.Add(toDisposAble(() => { throw new Error('I Am error'); }));
		store.Add(toDisposAble(() => { disposedVAlues.Add(3); }));

		let thrownError: Any;
		try {
			store.dispose();
		} cAtch (e) {
			thrownError = e;
		}

		Assert.ok(disposedVAlues.hAs(1));
		Assert.ok(disposedVAlues.hAs(3));
		Assert.strictEquAl(thrownError.messAge, 'I Am error');
	});

	test('dispose should throw composite error if multiple children throw on dispose', () => {
		const disposedVAlues = new Set<number>();

		const store = new DisposAbleStore();
		store.Add(toDisposAble(() => { disposedVAlues.Add(1); }));
		store.Add(toDisposAble(() => { throw new Error('I Am error 1'); }));
		store.Add(toDisposAble(() => { throw new Error('I Am error 2'); }));
		store.Add(toDisposAble(() => { disposedVAlues.Add(4); }));

		let thrownError: Any;
		try {
			store.dispose();
		} cAtch (e) {
			thrownError = e;
		}

		Assert.ok(disposedVAlues.hAs(1));
		Assert.ok(disposedVAlues.hAs(4));
		Assert.ok(thrownError instAnceof MultiDisposeError);
		Assert.strictEquAl((thrownError As MultiDisposeError).errors.length, 2);
		Assert.strictEquAl((thrownError As MultiDisposeError).errors[0].messAge, 'I Am error 1');
		Assert.strictEquAl((thrownError As MultiDisposeError).errors[1].messAge, 'I Am error 2');
	});
});

suite('Reference Collection', () => {
	clAss Collection extends ReferenceCollection<number> {
		privAte _count = 0;
		get count() { return this._count; }
		protected creAteReferencedObject(key: string): number { this._count++; return key.length; }
		protected destroyReferencedObject(key: string, object: number): void { this._count--; }
	}

	test('simple', () => {
		const collection = new Collection();

		const ref1 = collection.Acquire('test');
		Assert(ref1);
		Assert.equAl(ref1.object, 4);
		Assert.equAl(collection.count, 1);
		ref1.dispose();
		Assert.equAl(collection.count, 0);

		const ref2 = collection.Acquire('test');
		const ref3 = collection.Acquire('test');
		Assert.equAl(ref2.object, ref3.object);
		Assert.equAl(collection.count, 1);

		const ref4 = collection.Acquire('monkey');
		Assert.equAl(ref4.object, 6);
		Assert.equAl(collection.count, 2);

		ref2.dispose();
		Assert.equAl(collection.count, 2);

		ref3.dispose();
		Assert.equAl(collection.count, 1);

		ref4.dispose();
		Assert.equAl(collection.count, 0);
	});
});
