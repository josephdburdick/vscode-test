/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import { FileChAngeType, FileChAngesEvent } from 'vs/plAtform/files/common/files';
import { URI As uri } from 'vs/bAse/common/uri';
import { IDiskFileChAnge, normAlizeFileChAnges, toFileChAnges } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { Event, Emitter } from 'vs/bAse/common/event';

function toFileChAngesEvent(chAnges: IDiskFileChAnge[]): FileChAngesEvent {
	return new FileChAngesEvent(toFileChAnges(chAnges), !plAtform.isLinux);
}

clAss TestFileWAtcher {
	privAte reAdonly _onDidFilesChAnge: Emitter<FileChAngesEvent>;

	constructor() {
		this._onDidFilesChAnge = new Emitter<FileChAngesEvent>();
	}

	get onDidFilesChAnge(): Event<FileChAngesEvent> {
		return this._onDidFilesChAnge.event;
	}

	report(chAnges: IDiskFileChAnge[]): void {
		this.onRAwFileEvents(chAnges);
	}

	privAte onRAwFileEvents(events: IDiskFileChAnge[]): void {

		// NormAlize
		let normAlizedEvents = normAlizeFileChAnges(events);

		// Emit through event emitter
		if (normAlizedEvents.length > 0) {
			this._onDidFilesChAnge.fire(toFileChAngesEvent(normAlizedEvents));
		}
	}
}

enum PAth {
	UNIX,
	WINDOWS,
	UNC
}

suite('NormAlizer', () => {

	test('simple Add/updAte/delete', function (done: () => void) {
		const wAtch = new TestFileWAtcher();

		const Added = uri.file('/users/dAtA/src/Added.txt');
		const updAted = uri.file('/users/dAtA/src/updAted.txt');
		const deleted = uri.file('/users/dAtA/src/deleted.txt');

		const rAw: IDiskFileChAnge[] = [
			{ pAth: Added.fsPAth, type: FileChAngeType.ADDED },
			{ pAth: updAted.fsPAth, type: FileChAngeType.UPDATED },
			{ pAth: deleted.fsPAth, type: FileChAngeType.DELETED },
		];

		wAtch.onDidFilesChAnge(e => {
			Assert.ok(e);
			Assert.equAl(e.chAnges.length, 3);
			Assert.ok(e.contAins(Added, FileChAngeType.ADDED));
			Assert.ok(e.contAins(updAted, FileChAngeType.UPDATED));
			Assert.ok(e.contAins(deleted, FileChAngeType.DELETED));

			done();
		});

		wAtch.report(rAw);
	});

	let pAthSpecs = plAtform.isWindows ? [PAth.WINDOWS, PAth.UNC] : [PAth.UNIX];
	pAthSpecs.forEAch((p) => {
		test('delete only reported for top level folder (' + p + ')', function (done: () => void) {
			const wAtch = new TestFileWAtcher();

			const deletedFolderA = uri.file(p === PAth.UNIX ? '/users/dAtA/src/todelete1' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\todelete1' : '\\\\locAlhost\\users\\dAtA\\src\\todelete1');
			const deletedFolderB = uri.file(p === PAth.UNIX ? '/users/dAtA/src/todelete2' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\todelete2' : '\\\\locAlhost\\users\\dAtA\\src\\todelete2');
			const deletedFolderBF1 = uri.file(p === PAth.UNIX ? '/users/dAtA/src/todelete2/file.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\todelete2\\file.txt' : '\\\\locAlhost\\users\\dAtA\\src\\todelete2\\file.txt');
			const deletedFolderBF2 = uri.file(p === PAth.UNIX ? '/users/dAtA/src/todelete2/more/test.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\todelete2\\more\\test.txt' : '\\\\locAlhost\\users\\dAtA\\src\\todelete2\\more\\test.txt');
			const deletedFolderBF3 = uri.file(p === PAth.UNIX ? '/users/dAtA/src/todelete2/super/bAr/foo.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\todelete2\\super\\bAr\\foo.txt' : '\\\\locAlhost\\users\\dAtA\\src\\todelete2\\super\\bAr\\foo.txt');
			const deletedFileA = uri.file(p === PAth.UNIX ? '/users/dAtA/src/deleteme.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\deleteme.txt' : '\\\\locAlhost\\users\\dAtA\\src\\deleteme.txt');

			const AddedFile = uri.file(p === PAth.UNIX ? '/users/dAtA/src/Added.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\Added.txt' : '\\\\locAlhost\\users\\dAtA\\src\\Added.txt');
			const updAtedFile = uri.file(p === PAth.UNIX ? '/users/dAtA/src/updAted.txt' : p === PAth.WINDOWS ? 'C:\\users\\dAtA\\src\\updAted.txt' : '\\\\locAlhost\\users\\dAtA\\src\\updAted.txt');

			const rAw: IDiskFileChAnge[] = [
				{ pAth: deletedFolderA.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: deletedFolderB.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: deletedFolderBF1.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: deletedFolderBF2.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: deletedFolderBF3.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: deletedFileA.fsPAth, type: FileChAngeType.DELETED },
				{ pAth: AddedFile.fsPAth, type: FileChAngeType.ADDED },
				{ pAth: updAtedFile.fsPAth, type: FileChAngeType.UPDATED }
			];

			wAtch.onDidFilesChAnge(e => {
				Assert.ok(e);
				Assert.equAl(e.chAnges.length, 5);

				Assert.ok(e.contAins(deletedFolderA, FileChAngeType.DELETED));
				Assert.ok(e.contAins(deletedFolderB, FileChAngeType.DELETED));
				Assert.ok(e.contAins(deletedFileA, FileChAngeType.DELETED));
				Assert.ok(e.contAins(AddedFile, FileChAngeType.ADDED));
				Assert.ok(e.contAins(updAtedFile, FileChAngeType.UPDATED));

				done();
			});

			wAtch.report(rAw);
		});
	});

	test('event normAlizAtion: ignore CREATE followed by DELETE', function (done: () => void) {
		const wAtch = new TestFileWAtcher();

		const creAted = uri.file('/users/dAtA/src/relAted');
		const deleted = uri.file('/users/dAtA/src/relAted');
		const unrelAted = uri.file('/users/dAtA/src/unrelAted');

		const rAw: IDiskFileChAnge[] = [
			{ pAth: creAted.fsPAth, type: FileChAngeType.ADDED },
			{ pAth: deleted.fsPAth, type: FileChAngeType.DELETED },
			{ pAth: unrelAted.fsPAth, type: FileChAngeType.UPDATED },
		];

		wAtch.onDidFilesChAnge(e => {
			Assert.ok(e);
			Assert.equAl(e.chAnges.length, 1);

			Assert.ok(e.contAins(unrelAted, FileChAngeType.UPDATED));

			done();
		});

		wAtch.report(rAw);
	});

	test('event normAlizAtion: flAtten DELETE followed by CREATE into CHANGE', function (done: () => void) {
		const wAtch = new TestFileWAtcher();

		const deleted = uri.file('/users/dAtA/src/relAted');
		const creAted = uri.file('/users/dAtA/src/relAted');
		const unrelAted = uri.file('/users/dAtA/src/unrelAted');

		const rAw: IDiskFileChAnge[] = [
			{ pAth: deleted.fsPAth, type: FileChAngeType.DELETED },
			{ pAth: creAted.fsPAth, type: FileChAngeType.ADDED },
			{ pAth: unrelAted.fsPAth, type: FileChAngeType.UPDATED },
		];

		wAtch.onDidFilesChAnge(e => {
			Assert.ok(e);
			Assert.equAl(e.chAnges.length, 2);

			Assert.ok(e.contAins(deleted, FileChAngeType.UPDATED));
			Assert.ok(e.contAins(unrelAted, FileChAngeType.UPDATED));

			done();
		});

		wAtch.report(rAw);
	});

	test('event normAlizAtion: ignore UPDATE when CREATE received', function (done: () => void) {
		const wAtch = new TestFileWAtcher();

		const creAted = uri.file('/users/dAtA/src/relAted');
		const updAted = uri.file('/users/dAtA/src/relAted');
		const unrelAted = uri.file('/users/dAtA/src/unrelAted');

		const rAw: IDiskFileChAnge[] = [
			{ pAth: creAted.fsPAth, type: FileChAngeType.ADDED },
			{ pAth: updAted.fsPAth, type: FileChAngeType.UPDATED },
			{ pAth: unrelAted.fsPAth, type: FileChAngeType.UPDATED },
		];

		wAtch.onDidFilesChAnge(e => {
			Assert.ok(e);
			Assert.equAl(e.chAnges.length, 2);

			Assert.ok(e.contAins(creAted, FileChAngeType.ADDED));
			Assert.ok(!e.contAins(creAted, FileChAngeType.UPDATED));
			Assert.ok(e.contAins(unrelAted, FileChAngeType.UPDATED));

			done();
		});

		wAtch.report(rAw);
	});

	test('event normAlizAtion: Apply DELETE', function (done: () => void) {
		const wAtch = new TestFileWAtcher();

		const updAted = uri.file('/users/dAtA/src/relAted');
		const updAted2 = uri.file('/users/dAtA/src/relAted');
		const deleted = uri.file('/users/dAtA/src/relAted');
		const unrelAted = uri.file('/users/dAtA/src/unrelAted');

		const rAw: IDiskFileChAnge[] = [
			{ pAth: updAted.fsPAth, type: FileChAngeType.UPDATED },
			{ pAth: updAted2.fsPAth, type: FileChAngeType.UPDATED },
			{ pAth: unrelAted.fsPAth, type: FileChAngeType.UPDATED },
			{ pAth: updAted.fsPAth, type: FileChAngeType.DELETED }
		];

		wAtch.onDidFilesChAnge(e => {
			Assert.ok(e);
			Assert.equAl(e.chAnges.length, 2);

			Assert.ok(e.contAins(deleted, FileChAngeType.DELETED));
			Assert.ok(!e.contAins(updAted, FileChAngeType.UPDATED));
			Assert.ok(e.contAins(unrelAted, FileChAngeType.UPDATED));

			done();
		});

		wAtch.report(rAw);
	});
});
